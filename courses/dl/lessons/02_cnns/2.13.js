/* ============================================================================
   LESSON 2.13 — GANs: Generative Adversarial Networks
   Mirrors 02_CNNs.md · §17. The reference's DCGAN Generator is built and
   trained for real on MNIST (scratchpad/dl/d213.py). The run does NOT reach
   the theoretical equilibrium — reported as measured.
   ========================================================================= */
EC.receiveLesson({
  id: "2.13",

  lede: "**Every network in this module has been trained against a fixed target. A GAN trains against an opponent that is also learning.** A generator turns noise into images; a discriminator tries to tell them from real ones; each improves by defeating the other. The theory says they converge to an elegant equilibrium where the discriminator outputs 0.5 for everything. This lesson trains one for real and shows it does nothing of the sort — which is the most useful thing to know about GANs.",

  objectives: [
    "State the minimax objective and what equilibrium it predicts",
    "Build a DCGAN generator and trace its shapes from noise to image",
    "Run the alternating training step, including the non-saturating generator loss",
    "Diagnose mode collapse with a diversity measurement",
    "Explain why GAN losses are not a progress metric"
  ],

  prerequisites: ["2.12", "2.8"],

  blocks: [

    { t: "h2", n: "01", text: "The adversarial game", id: "objective" },

    { t: "math", tex: "\\min_G \\max_D \\; \\mathbb{E}_{x}[\\log D(x)] + \\mathbb{E}_{z}[\\log(1 - D(G(z)))]" },

    { t: "p", text: "`D` maximises: assign high probability to real images and low to generated ones. `G` minimises: make `D` assign high probability to its output. At the theoretical optimum the generator's distribution matches the data exactly, the discriminator cannot do better than chance, and `D(x) = 0.5` everywhere." },

    { t: "diagram", kind: "cycle", title: "The training loop",
      caption: "Two optimisers, two objectives, alternating. Each network's loss depends on the other's current weights — the target moves.",
      centre: "Adversarial training",
      nodes: [
        { label: "Sample noise z", sub: "latent vector" },
        { label: "G(z) → fake image", sub: "generator forward" },
        { label: "D scores real and fake", sub: "discriminator forward" },
        { label: "Update D", sub: "real → 0.9, fake → 0.0" },
        { label: "Update G", sub: "make D call fakes real" }
      ] },

    { t: "h2", n: "02", text: "The generator", id: "generator" },

    { t: "code", lang: "python", title: "DCGAN generator",
      code: `class Generator(nn.Module):
    def __init__(self, latent_dim=100):
        super().__init__()
        self.net = nn.Sequential(
            nn.ConvTranspose2d(latent_dim, 256, 4, 1, 0),  # 1 -> 4
            nn.BatchNorm2d(256), nn.ReLU(),
            nn.ConvTranspose2d(256, 128, 4, 2, 1),         # 4 -> 8
            nn.BatchNorm2d(128), nn.ReLU(),
            nn.ConvTranspose2d(128, 1, 4, 2, 1),           # 8 -> 16
            nn.Tanh()                                       # output [-1, 1]
        )
    def forward(self, z):
        return self.net(z.view(-1, 100, 1, 1))`,
      caption: "A CNN classifier in reverse: transposed convolutions grow the spatial size while shrinking the channel count, the exact mirror of lesson 2.2's anatomy." },

    { t: "out", text: `  latent z                     (100, 1, 1)
  after ConvTranspose2d        (256, 4, 4)
  after ConvTranspose2d        (128, 8, 8)
  after ConvTranspose2d        (1, 16, 16)
  after Tanh                   (1, 16, 16)
  output range [-1.000, 1.000]

  G 937,089 params   D 531,329 params` },

    { t: "callout", kind: "trap", title: "Tanh output means the data must be scaled to match",
      body: [{ t: "p", text: "The generator's final `Tanh` emits values in `[−1, 1]`, so the real images must be normalised to that same range — `T.Normalize([0.5], [0.5])` after `ToTensor()`. Leave the real data in `[0, 1]` and the discriminator gets a free win: it can separate real from fake on value range alone, without learning anything about image content. The generator then receives gradients pushing it towards a range it structurally cannot reach, and training collapses immediately. Note also `k=4, s=2` throughout, which satisfies lesson 2.8's divisibility rule and avoids checkerboard artefacts." }] },

    { t: "h2", n: "03", text: "Training it", id: "training" },

    { t: "code", lang: "python", title: "One step of the alternating update",
      code: `REAL, FAKE = 0.9, 0.0                       # label smoothing

# --- discriminator ---
optD.zero_grad()
pr = D(x)
fake = G(torch.randn(b, 100))
pf = D(fake.detach())                       # detach: no gradient into G here
lossD = bce(pr, torch.full((b,), REAL)) + bce(pf, torch.full((b,), FAKE))
lossD.backward(); optD.step()

# --- generator (non-saturating: maximise log D(G(z))) ---
optG.zero_grad()
lossG = bce(D(fake), torch.ones(b))         # target 1, not 0
lossG.backward(); optG.step()`,
      caption: "`fake.detach()` in the discriminator step is essential — without it, updating D would also push gradients into G, which is not what the objective says." },

    { t: "callout", kind: "insight", title: "The non-saturating trick",
      body: [{ t: "p", text: "The objective says G should minimise `log(1 − D(G(z)))`. Early in training D easily spots fakes, so `D(G(z)) ≈ 0`, and that loss is at its flattest exactly there — the generator gets almost no gradient when it most needs one. So in practice G *maximises* `log D(G(z))` instead, which is implemented by computing binary cross-entropy against a target of 1. Same fixed point, much stronger gradient when the generator is losing. Every working implementation does this, and the original paper proposed it in a footnote." }] },

    { t: "out", text: `  epoch   D(real)   D(fake)   lossD   lossG   G-output-std
    0     0.883     0.041   0.385   4.776   0.898
    1     0.898     0.004   0.333   6.010   0.830
    2     0.890     0.015   0.372   6.186   0.702
    3     0.896     0.004   0.335   6.066   0.744
    4     0.806     0.100   0.586   5.026   0.522
    5     0.861     0.037   0.397   4.130   0.480` },

    { t: "h2", n: "04", text: "The equilibrium that does not arrive", id: "equilibrium" },

    { t: "out", text: `  at a perfect Nash equilibrium D(x) = 0.5 for everything
  measured: D(real) = 0.861, D(fake) = 0.037` },

    { t: "callout", kind: "warn", title: "The loss curve tells you almost nothing",
      body: [{ t: "p", text: "Theory predicts D converges to 0.5 on everything. The measured run has the discriminator confidently correct — 0.86 on real, 0.04 on fake — after six epochs, and it is not drifting towards 0.5. This is the normal state of affairs, not a failed run. Because each network's loss is computed against the *other's current weights*, a falling generator loss can mean the generator improved or merely that the discriminator got worse. `lossG` here rose from 4.78 to 6.19 and then fell back to 4.13 while the samples were steadily improving. You cannot read progress off these curves, which is why GAN work relies on looking at samples and on metrics like FID computed against real data." }] },

    { t: "h2", n: "05", text: "Mode collapse", id: "collapse" },

    { t: "p", text: "The characteristic GAN failure: the generator finds one output that reliably fools the discriminator and produces variations of only that, ignoring most of the data distribution. It is detectable by measuring diversity directly." },

    { t: "out", text: `  mean pairwise distance between 64 samples : 7.7354
  min  pairwise distance                    : 3.4616
  same statistic on 64 REAL images          : 8.9560` },

    { t: "p", text: "Generated samples are 86 % as spread out as real ones — **diverse, but measurably less so**. The warning sign is in the training log too: the generator's output standard deviation fell steadily from 0.898 to 0.480 across six epochs. The samples are getting less varied as training proceeds, which is mode collapse beginning rather than mode collapse arrived." },

    { t: "dl", items: [
      ["Label smoothing", "Train D against 0.9 rather than 1.0, as used above. A discriminator that is never fully confident gives the generator usable gradients for longer."],
      ["Separate Adam optimisers, β₁ = 0.5", "The usual 0.9 momentum is too much for a moving target; 0.5 with lr = 2e-4 is the DCGAN standard."],
      ["Wasserstein loss (WGAN-GP)", "Replaces the classification objective with an Earth-Mover distance, giving a loss that *does* correlate with sample quality."],
      ["Spectral normalisation", "Constrains the discriminator's Lipschitz constant, preventing it from overpowering the generator."],
      ["Progressive growing", "Train at 4×4, then 8×8, and so on — each stage stabilises the next."]
    ] },

    { t: "exercise", kind: "practice", title: "Train a GAN and diagnose it", difficulty: "advanced", minutes: 50,
      prompt: "Train the DCGAN above on MNIST and log four things every epoch: D(real), D(fake), both losses, and the mean pairwise distance between 64 generated samples. Plot all four. Then deliberately break it three ways — leave the real data in [0,1] while the generator outputs tanh; remove the label smoothing; and give the discriminator a learning rate ten times the generator's. Record how each failure looks in the logs and in the samples.",
      hints: [
        "Log the diversity metric against the same statistic computed on real images, so it has a reference point.",
        "For the broken-normalisation run, watch D(fake) in the first few dozen steps.",
        "The over-powered discriminator produces a very specific signature in lossG."
      ],
      solution: {
        notes: [
          { t: "p", text: "The diversity trace is the most informative plot, because it detects mode collapse before it is obvious in the samples. In my run the generator's output standard deviation fell from 0.898 to 0.480 over six epochs while sample quality was still improving — diversity shrinking steadily is the early warning. Compare against the real-data statistic: I measured 7.74 for generated against 8.96 for real, so about 86 % of the spread. A ratio that keeps falling means collapse; a number close to 1 with good samples means it is working." },
          { t: "p", text: "The broken normalisation fails fastest and most completely. With real data in [0,1] and the generator emitting [−1,1], the discriminator separates them on value range within a handful of steps, D(fake) goes to zero and stays there, and the generator never receives a useful gradient. The samples are noise forever. It is worth seeing once because the bug is a single missing `Normalize` and produces no error of any kind." },
          { t: "p", text: "The over-powered discriminator shows up as lossG climbing steadily while lossD goes to near zero — D wins so completely that G's gradients become tiny. This is exactly what label smoothing and the non-saturating loss exist to delay. It is also the single most common way a GAN fails to train in practice, and the reason balancing the two networks' capacity and learning rates gets as much attention as the architecture does." }
        ]
      } }

  ],

  takeaways: [
    "G maps noise to images, D classifies real against fake; they train alternately against each other.",
    "The DCGAN generator mirrors a classifier: transposed convolutions grow space while shrinking channels.",
    "Tanh output requires real data normalised to [−1, 1], or D wins on value range alone.",
    "Use the non-saturating generator loss — BCE against a target of 1 — for a usable gradient early on.",
    "Measured after 6 epochs: D(real) = 0.861, D(fake) = 0.037 — nowhere near the theoretical 0.5.",
    "GAN losses are not a progress metric, because each is computed against the other network's current weights.",
    "Detect mode collapse by measuring sample diversity: 7.74 generated against 8.96 for real images."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why is the generator trained to maximise log D(G(z)) rather than minimise log(1 − D(G(z)))?",
      options: ["It is mathematically equivalent and simpler", "The original form has almost no gradient when the generator is losing", "It converges to a different, better optimum", "It avoids numerical overflow"],
      answer: 1,
      why: "Early in training D(G(z)) is near zero, which is exactly where `log(1 − D(G(z)))` is flattest — so the generator gets the weakest gradient precisely when it most needs to improve. The non-saturating form has the same fixed point but a strong gradient in that region, and is implemented simply as BCE against a target of 1." },
    { stem: "Your GAN's generator loss is falling steadily. Is it improving?",
      options: ["Yes, falling loss means better samples", "Not necessarily — the loss depends on the discriminator's current weights", "No, falling generator loss always means collapse", "Only if the discriminator loss is also falling"],
      answer: 1,
      why: "A lower generator loss can mean G improved or that D got worse — the objective is computed against a moving opponent. In the measured run lossG rose from 4.78 to 6.19 and fell back to 4.13 while samples improved throughout. Progress is judged from samples and from metrics like FID computed against real data." },
    { stem: "The generator ends with Tanh. What must you do to the training images?",
      options: ["Nothing", "Normalise them to [−1, 1] to match the generator's output range", "Convert them to grayscale", "Scale them to [0, 1]"],
      answer: 1,
      why: "If real images are in [0,1] and fakes in [−1,1], the discriminator separates them on value range alone without learning anything about content, D(fake) drops to zero immediately, and the generator gets no useful gradient. It is a one-line bug — a missing `Normalize([0.5],[0.5])` — that produces no error and never recovers." },
    { stem: "How do you detect mode collapse?",
      options: ["Watch the discriminator loss", "Measure diversity among generated samples, compared against real data", "Check the generator's parameter norms", "Monitor the learning rate"],
      answer: 1,
      why: "Mode collapse means the generator produces few distinct outputs, so pairwise distances between samples shrink. Comparing against the same statistic on real images gives a reference: I measured 7.74 against 8.96, about 86 %. A ratio that falls steadily over training is the early warning — in my run the generator's output standard deviation dropped from 0.898 to 0.480." }
  ] },

  interview: { title: "Interview", sub: "GAN questions", questions: [
    { level: "Core", q: "Explain how a GAN works.",
      strong: "Two networks in competition: G maps noise to images, D classifies real against fake, trained alternately.",
      answer: [{ t: "p", text: "A generator maps random noise to images and a discriminator tries to distinguish generated images from real ones. They train alternately: D is updated to score real images high and generated ones low, then G is updated to make D score its outputs high. The minimax objective has a theoretical equilibrium where G's distribution matches the data and D outputs 0.5 everywhere. In practice you never get there — I trained one on MNIST for six epochs and the discriminator sat at 0.86 on real and 0.04 on fake, confidently correct and not converging towards 0.5, while the samples improved steadily. Two implementation details matter: the generator uses the non-saturating loss, maximising log D(G(z)), because the theoretical form has no gradient when G is losing; and you must detach the fake batch in the discriminator step so its update does not flow into G." }] },
    { level: "Senior", q: "What is mode collapse and how do you address it?",
      strong: "G produces few distinct outputs; detect with a diversity metric, mitigate with WGAN-GP, spectral norm or minibatch discrimination.",
      answer: [{ t: "p", text: "The generator finds a small set of outputs that reliably fool the discriminator and stops covering the rest of the distribution — perfect samples, no variety. It happens because nothing in the objective rewards diversity: fooling D on one mode scores exactly as well as covering all of them. I detect it by measuring mean pairwise distance among a batch of samples against the same statistic on real images; in my run generated samples were at 86 % of real diversity and the generator's output standard deviation was falling steadily, which is collapse starting. For fixes, Wasserstein loss with gradient penalty is the main one because it provides a meaningful gradient everywhere and a loss that actually correlates with quality. Spectral normalisation stops the discriminator overpowering the generator, minibatch discrimination lets D see the variety within a batch so identical outputs are penalised, and unrolled GANs let G anticipate D's response. I would also check the basics first — label smoothing, β₁ = 0.5, and balanced learning rates." }] },
    { level: "Senior", q: "How do you evaluate a GAN if the loss is uninformative?",
      strong: "FID against real data, plus diversity metrics and human inspection — never the training loss.",
      answer: [{ t: "p", text: "The training losses cannot be used because each is measured against the other network's current weights, so they move for reasons unrelated to sample quality. The standard metric is Fréchet Inception Distance, which compares the mean and covariance of Inception features for generated and real samples — it captures both quality and diversity and correlates reasonably with human judgement. Inception Score is the older alternative but only looks at generated samples, so it cannot detect a model that has memorised the training set. Alongside that I would track a direct diversity statistic, like mean pairwise distance among samples relative to real data, because it catches mode collapse early and costs nothing to compute. And I would look at samples regularly, including from fixed noise vectors across epochs so the same latent points can be compared over time. For anything going into production I would also check for training-set memorisation by finding each sample's nearest neighbour in the training data." }] }
  ] }
});
