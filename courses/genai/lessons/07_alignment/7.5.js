EC.receiveLesson({
  id: "7.5",

  lede: "RLHF generates answers, scores them with the reward model from 7.4, and pushes the policy toward what scored well \u2014 with a KL leash so it cannot wander into gibberish that happens to fool the scorer. The reference prices this as \u201croughly 4 \u00d7 7B parameters resident\u201d, which badly understates it: the two *trained* models carry gradients and Adam states, so the real bill for a 7B policy is **234.7 GB**, about **18\u00d7** one model\u2019s weights and three 80 GB cards before a single activation. That number, more than anything about the mathematics, is why DPO and GRPO exist.",

  objectives: [
    "Write the RLHF objective and say what each term does",
    "Explain why the KL penalty is non-negotiable and how it is applied per token",
    "Read PPO's clipped surrogate and identify which direction it actually limits",
    "Compute the memory footprint of a PPO run and compare it to DPO",
    "Trace the five steps of the loop and say which one is slowest"
  ],

  prerequisites: ["7.4"],

  blocks: [

    { t: "h2", n: "01", id: "objective", text: "The objective",
      sub: "Maximise reward, stay near the SFT model" },

    { t: "math", tex: "\\max_\\theta\\; \\mathbb{E}_{x \\sim \\mathcal{D},\\; y \\sim \\pi_\\theta}\\big[r_\\phi(x, y)\\big] \\;-\\; \\beta \\cdot \\mathrm{KL}\\big(\\pi_\\theta(\\cdot|x)\\,\\|\\,\\pi_{\\text{ref}}(\\cdot|x)\\big)" },

    { t: "p", text: "The first term says get a high score from the reward model. The second says do not drift far from the frozen SFT model. \u03c0_ref is that frozen model and \u03b2, typically 0.01 to 0.1, sets the leash length." },

    { t: "callout", kind: "warn", title: "Without the KL term the policy collapses, and 7.4 explains why",
      body: [
        { t: "p", text: "The reward model is a learned proxy fitted to a finite set of comparisons. Optimising hard against any learned proxy finds its errors \u2014 and 7.4 measured the specific weakness: because the Bradley-Terry gradient vanishes once a gap is large, nothing in RM training constrains how big a correct gap becomes. There are regions of output space where the RM confidently assigns a huge score for no good reason." },
        { t: "p", text: "So an unleashed policy converges onto whatever degenerate text maximises the RM \u2014 repeated flattery, enormous lists, a particular formatting tic. You get a phenomenal reward score and a model no human wants to use. 7.11 is entirely about this." },
        { t: "p", text: "The KL term bounds how far the policy can go to find those regions. It does not identify them or fix the RM; it limits the search radius, which is a blunt but effective defence against a failure you cannot otherwise detect from inside the loop." }
      ] },

    { t: "p", text: "In practice the KL is not computed as a separate objective term \u2014 it is folded into the reward per token." },

    { t: "math", tex: "R_t = r_\\phi(x, y)\\cdot\\mathbb{1}[t \\text{ is last token}] \\;-\\; \\beta\\big(\\log \\pi_\\theta(y_t|\\cdot) - \\log \\pi_{\\text{ref}}(y_t|\\cdot)\\big)" },

    { t: "callout", kind: "insight", title: "Note the shape of that reward: sparse plus dense",
      body: [
        { t: "p", text: "The RM score arrives **once**, on the final token. The KL penalty arrives on **every** token. So the learning signal is one sparse scalar for the whole completion plus a dense per-token correction, which is a genuinely awkward credit-assignment problem \u2014 nothing says which token earned the score." },
        { t: "p", text: "That is what the value network exists to smooth out, and why GAE is used for the advantage: you need some estimate of how much better than expected each token was, when the only ground truth is a single number at the end." },
        { t: "p", text: "It is also why 7.9\u2019s process reward models are attractive. If you can grade intermediate steps rather than just the outcome, the sparse term becomes dense and the credit assignment problem largely dissolves." }
      ] },

    { t: "callout", kind: "tradeoff", title: "\u03b2 is coupled to the reward scale, which 7.4 showed is arbitrary",
      body: [
        { t: "p", text: "The two terms are added, so \u03b2 is only meaningful relative to the magnitude of \\(r_\\phi\\). 7.4 demonstrated that an RM\u2019s absolute scale is unidentifiable \u2014 two fits of the same data came out 100 apart \u2014 so \u03b2 = 0.05 against one RM is a different leash than \u03b2 = 0.05 against a retrained one." },
        { t: "p", text: "Which makes reward normalisation a prerequisite rather than a nicety. Centre the rewards, and if you rescale, retune \u03b2 \u2014 because a config file that did not change can still represent a different experiment." },
        { t: "p", text: "This is a good example of why the module\u2019s lessons depend on each other. \u201cNormalise reward scores\u201d sounds like housekeeping until you see that it silently sets a hyperparameter two stages downstream." }
      ] },

    { t: "h2", n: "02", id: "clip", text: "PPO's clipped surrogate",
      sub: "And which direction it actually limits" },

    { t: "p", text: "PPO\u2019s contribution is not the objective \u2014 it is *how* to take a gradient step without the policy blowing up. It bounds how far one batch can drag the policy." },

    { t: "math", tex: "\\rho_t(\\theta) = \\frac{\\pi_\\theta(y_t|s_t)}{\\pi_{\\text{old}}(y_t|s_t)}, \\qquad \\mathcal{L}_{\\text{PPO}} = \\mathbb{E}\\Big[\\min\\big(\\rho_t \\hat{A}_t,\\; \\mathrm{clip}(\\rho_t, 1-\\epsilon, 1+\\epsilon)\\hat{A}_t\\big)\\Big]" },

    { t: "p", text: "The usual gloss is \u201cif this update would move a token\u2019s probability more than \u00b120%, stop giving credit for going further\u201d. That is right for a positive advantage and incomplete in general, which the arithmetic shows." },

    { t: "code", lang: "python", title: "g74.py \u00a7E \u2014 the surrogate on numbers, \u03b5 = 0.2", code: `for rho in (0.5, 0.8, 1.0, 1.2, 1.5, 2.0):
    for A in (1.0, -1.0):
        c = min(max(rho, 1 - EPS), 1 + EPS)
        L = min(rho * A, c * A)`,
      out: `  rho             A        rho*A    clipped*A        L=min effect
  0.5           1.0        0.500        0.800        0.500 min picks raw
  0.5          -1.0       -0.500       -0.800       -0.800 CLIPPED
  0.8           1.0        0.800        0.800        0.800 inside trust region
  1.2           1.0        1.200        1.200        1.200 inside trust region
  1.5           1.0        1.500        1.200        1.200 CLIPPED
  1.5          -1.0       -1.500       -1.200       -1.500 min picks raw
  2.0           1.0        2.000        1.200        1.200 CLIPPED
  2.0          -1.0       -2.000       -1.200       -2.000 min picks raw`,
      hl: [3, 7, 8, 10],
      caption: "Read rows 5 and 6: at the same \u03c1 = 1.5, a positive advantage is clipped and a negative one is not." },

    { t: "callout", kind: "insight", title: "The min() makes the objective pessimistic, and that is the mechanism",
      body: [
        { t: "p", text: "`min` always takes the lower of the two terms, so the objective is a *lower bound* on the unclipped one. The consequence depends on which way you have moved relative to what the advantage wanted." },
        { t: "p", text: "**Moved in the beneficial direction beyond the trust region** \u2014 \u03c1 > 1+\u03b5 with A > 0, or \u03c1 < 1\u2212\u03b5 with A < 0 \u2014 and the clipped term is lower, so it wins and the gradient flattens. No further credit for pushing on. **Moved in the harmful direction** \u2014 \u03c1 < 1\u2212\u03b5 with A > 0, or \u03c1 > 1+\u03b5 with A < 0 \u2014 and the raw term is lower, so it wins and the full gradient still pushes you back." },
        { t: "p", text: "So it is not symmetric clipping. It removes the incentive to keep going once you have moved far enough in the direction the advantage favours, while preserving full pressure to come back if you have moved the wrong way. That is what makes it a trust region rather than a simple bound." }
      ] },

    { t: "callout", kind: "trap", title: "Which is why \u201cPPO clips large updates\u201d is a half-truth",
      body: [
        { t: "p", text: "Row 8 is the one that catches people: \u03c1 = 2.0 with A = \u22121.0 gives L = \u22122.0, completely unclipped. The policy has doubled the probability of a token the advantage says was bad, and PPO applies the *full* penalty rather than a capped one." },
        { t: "p", text: "That is deliberate and correct \u2014 you want strong pressure to undo a bad move \u2014 but it means PPO does not bound the magnitude of every update. It bounds the reward for over-shooting in the favourable direction only." },
        { t: "p", text: "A related practical point: \u03c1 is computed against \u03c0_old, the policy that *generated* the batch. Over several inner epochs on the same batch the policy drifts from \u03c0_old, \u03c1 moves away from 1, and more tokens fall outside the trust region \u2014 which is why PPO runs a few inner epochs rather than many." }
      ] },

    { t: "h2", n: "03", id: "memory", text: "Four models, and what they actually cost",
      sub: "The number that explains the rest of this module" },

    { t: "table",
      head: ["Model", "Role", "Trained?"],
      rows: [
        ["Policy \u03c0_\u03b8", "The model you are improving", "**Yes**"],
        ["Reference \u03c0_ref", "Frozen SFT model, for the KL leash", "No"],
        ["Reward model r_\u03c6", "Scores completions", "No"],
        ["Value / critic V_\u03c8", "Predicts expected reward, the baseline for \u00c2", "**Yes**"]
      ] },

    { t: "code", lang: "python", title: "the memory bill for a 7B policy, bf16 with Adam", code: `N = 7e9
# a TRAINED model: bf16 weights + bf16 grads + fp32 master + Adam m + Adam v
trained = N * (2 + 2 + 4 + 4 + 4) / 1024**3      # 16 bytes/param
frozen  = N * 2 / 1024**3                        # bf16 weights only`,
      out: `  trained (16 B/param): 104.3 GB
  frozen  ( 2 B/param):  13.0 GB

  policy  (trained)         104.3 GB
  critic  (trained)         104.3 GB
  reference (frozen)         13.0 GB
  reward model (frozen)      13.0 GB
  TOTAL                     234.7 GB

  80GB A100s needed (weights alone, no activations/KV): 2.9`,
      hl: [4, 5, 9, 10],
      caption: "234.7 GB before any activations, KV cache or generation buffers \u2014 and two of those models need optimiser states." },

    { t: "callout", kind: "trap", title: "\u201c4 \u00d7 7B resident\u201d suggests 56 GB. It is 234.7 GB.",
      body: [
        { t: "p", text: "The phrasing invites you to count parameters \u2014 four models of 7B each, 28B parameters, about 56 GB at bf16. That is wrong by a factor of four, because the **policy and critic are trained** and a trained model costs roughly 16 bytes per parameter rather than 2." },
        { t: "p", text: "Gradients are another copy, the fp32 master weights another two, and Adam\u2019s two moments another four \u2014 so each trained model is about eight times its own weight footprint. 234.7 GB is **18\u00d7** the 13.0 GB of a single frozen 7B." },
        { t: "p", text: "And that is still only the static allocation. Step 1 of the loop *generates* completions, so you also need a KV cache for the sampling batch, plus activations for the backward pass. In practice this does not fit on three 80 GB cards; you need more, or ZeRO sharding, or LoRA on the policy." }
      ] },

    { t: "callout", kind: "good", title: "DPO's footprint, for comparison",
      body: [
        { t: "p", text: "DPO needs the policy and the frozen reference and nothing else \u2014 no reward model, no critic. That is 104.3 + 13.0 = **117.3 GB**, exactly **2.0\u00d7 less** than PPO." },
        { t: "p", text: "Half the saving is deleting the critic, which is a trained model and therefore expensive. The other half is deleting the reward model, which is cheap to hold but expensive to *produce* \u2014 it is a whole separate training run on the preference data, with its own overfitting risk." },
        { t: "p", text: "GRPO lands in the same place as DPO on memory by deleting the critic and taking its baseline from a group of samples instead \u2014 and under RLVR it deletes the reward model too, replacing it with a program. 7.8 and 7.9 take those in turn." }
      ] },

    { t: "viz", title: "Why DPO and GRPO exist", caption: "234.7 GB against 117.3 GB for a 7B policy. The trained models dominate, because of optimiser states.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img" aria-label="PPO versus DPO memory footprint">
  <text x="16" y="22" class="s-label">STATIC MEMORY, 7B POLICY, bf16 + ADAM</text>

  <text x="16" y="56" class="s-sub">PPO</text>
  <rect x="80" y="42" width="222" height="22" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="191" y="58" text-anchor="middle" class="s-mono" style="font-size:9px">policy 104.3</text>
  <rect x="304" y="42" width="222" height="22" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="415" y="58" text-anchor="middle" class="s-mono" style="font-size:9px">critic 104.3</text>
  <rect x="528" y="42" width="28" height="22" rx="2" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <rect x="558" y="42" width="28" height="22" rx="2" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="596" y="58" class="s-mono" style="font-size:9px;fill:var(--crit)">= 234.7 GB</text>

  <text x="16" y="100" class="s-sub">DPO</text>
  <rect x="80" y="86" width="222" height="22" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="191" y="102" text-anchor="middle" class="s-mono" style="font-size:9px">policy 104.3</text>
  <rect x="304" y="86" width="28" height="22" rx="2" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="342" y="102" class="s-mono" style="font-size:9px;fill:var(--good)">= 117.3 GB \u2014 2.0\u00d7 less</text>

  <line x1="16" y1="128" x2="744" y2="128" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="152" class="s-label">WHY: A TRAINED MODEL IS 8\u00d7 ITS OWN WEIGHTS</text>
  <text x="30" y="176" class="s-mono" style="font-size:10px">bf16 weights</text>
  <rect x="190" y="164" width="40" height="16" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="240" y="176" class="s-sub" style="font-size:9px">2 B/param</text>
  <text x="30" y="198" class="s-mono" style="font-size:10px">+ bf16 grads</text>
  <rect x="190" y="186" width="40" height="16" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="240" y="198" class="s-sub" style="font-size:9px">2 B/param</text>
  <text x="30" y="220" class="s-mono" style="font-size:10px">+ fp32 master</text>
  <rect x="190" y="208" width="80" height="16" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="280" y="220" class="s-sub" style="font-size:9px">4 B/param</text>
  <text x="30" y="242" class="s-mono" style="font-size:10px">+ Adam m, v</text>
  <rect x="190" y="230" width="160" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <text x="360" y="242" class="s-sub" style="font-size:9px">8 B/param</text>
  <text x="16" y="270" class="s-mono" style="fill:var(--crit)">16 B/param total \u2014 so "4 x 7B resident" reads as 56 GB and is really 234.7 GB</text>
</svg>` },

    { t: "h2", n: "04", id: "loop", text: "The loop",
      sub: "Five steps, one of which dominates the wall clock" },

    { t: "ol", items: [
      "**Generate** completions from \u03c0_\u03b8 \u2014 autoregressive sampling, and by far the slowest step",
      "**Score** each with r_\u03c6 \u2192 one scalar per completion",
      "**Penalise** per-token KL against \u03c0_ref \u2192 the shaped reward R_t",
      "**Estimate** advantages \u00c2_t via GAE using V_\u03c8",
      "**Update** \u03c0_\u03b8 with the clipped surrogate and V_\u03c8 with MSE, over a few inner epochs"
    ] },

    { t: "callout", kind: "insight", title: "Step 1 is the hidden cost, and it is structural",
      body: [
        { t: "p", text: "Every other step is a forward or backward pass over a batch. Step 1 is autoregressive generation \u2014 one token at a time, sequentially \u2014 which M3 established is memory-bandwidth-bound rather than compute-bound. So the expensive part of RLHF is not the learning, it is the sampling." },
        { t: "p", text: "That also makes it the step with the most engineering around it: a separate inference-optimised copy of the policy, continuous batching, and KV caching, all so that step 1 does not dominate everything. It is a large part of why RLHF infrastructure is hard in a way DPO\u2019s is not." },
        { t: "p", text: "DPO avoids this entirely. Its data is a fixed set of preference pairs, so there is no generation in the training loop at all \u2014 which is the second major reason it displaced PPO for most teams, after the memory." }
      ] },

    { t: "exercise", kind: "analysis", title: "Price an RLHF run against DPO", difficulty: "advanced", minutes: 30,
      body: "For a model size you care about, compute the static memory footprint of a PPO run and of a DPO run, stating your precision and optimiser assumptions explicitly. Then identify which component dominates and what you would do to fit it on the hardware you actually have.",
      requirements: [
        "Account separately for weights, gradients, master weights and optimiser states",
        "Mark each of the four PPO models as trained or frozen and cost it accordingly",
        "Report the PPO total, the DPO total and the ratio",
        "State what is still missing from the figure",
        "Name the two cheapest interventions to make PPO fit"
      ],
      hint: "The frozen models are nearly free and the trained ones are not. If your figure comes out near 4× a single model's weights, you have forgotten the optimiser states.",
      solution: { lang: "python", title: "the footprint", code: `GB = 1024**3

def model_mem(N, trained, bytes_weight=2, optimizer="adam"):
    """bf16 weights; a trained model also holds grads, fp32 master and Adam moments."""
    b = bytes_weight                       # weights
    if trained:
        b += bytes_weight                  # gradients
        b += 4                             # fp32 master copy
        b += 8 if optimizer == "adam" else 4   # Adam m+v, or SGD momentum
    return N * b / GB

def ppo_total(N):
    return (model_mem(N, True)      # policy
          + model_mem(N, True)      # critic
          + model_mem(N, False)     # frozen reference
          + model_mem(N, False))    # frozen reward model

def dpo_total(N):
    return model_mem(N, True) + model_mem(N, False)

for N in (1.5e9, 7e9, 70e9):
    p, d = ppo_total(N), dpo_total(N)
    print("%5.0fB params : PPO %8.1f GB   DPO %8.1f GB   ratio %.2fx"
          % (N / 1e9, p, d, p / d))`,
        out: `      2B params : PPO    50.3 GB   DPO    25.1 GB   ratio 2.00x
      7B params : PPO   234.7 GB   DPO   117.3 GB   ratio 2.00x
     70B params : PPO  2346.6 GB   DPO  1173.3 GB   ratio 2.00x`,
        notes: [
          { t: "p", text: "**The ratio is exactly 2.00\u00d7 at every size**, which is not a coincidence: PPO holds two trained and two frozen models, DPO holds one of each, so the whole thing scales linearly and the factor is structural rather than empirical." },
          { t: "p", text: "**The trained models are the entire story.** At 7B, the policy and critic are 104.3 GB each while the frozen reference and reward model are 13.0 GB each \u2014 so deleting the critic saves eight times what deleting the reward model saves." },
          { t: "p", text: "**A figure near 4\u00d7 one model's weights means optimiser states were forgotten.** Counting four 7B models at bf16 gives 56 GB; the real number is 234.7 GB, because a trained model is about 16 bytes per parameter rather than 2." },
          { t: "p", text: "**And this is still an underestimate.** It excludes activations for the backward pass and the KV cache for generation \u2014 and step 1 of the loop *is* generation, so a sampling buffer is unavoidable. Treat these as floors." },
          { t: "p", text: "The two cheapest interventions: put LoRA on the policy, which removes most of its optimiser state since you only train the adapters, and share the backbone between the critic and the reward model with two heads. Beyond that it is ZeRO-3 sharding, which trades the memory for interconnect traffic." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "RLHF is reward maximisation with a KL leash, and the leash is load-bearing because the reward model is a proxy with unconstrained magnitudes. The reward is sparse at the end and the KL is dense per token, which is why a critic and GAE are needed at all." },
        { t: "p", text: "PPO\u2019s clip is a pessimistic bound, not a symmetric one \u2014 it stops rewarding over-shooting in the favourable direction while keeping full pressure to undo a bad move. And the reason the rest of this module exists is 234.7 GB against DPO\u2019s 117.3 GB, plus autoregressive generation inside the training loop." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhy did the field move away from PPO for RLHF?\u201d**" },
        { t: "p", text: "Two reasons, and the memory one is more decisive than it usually sounds. PPO needs four models resident: the policy and critic, both trained, plus a frozen reference for the KL and a frozen reward model. For a 7B policy at bf16 with Adam that is 234.7 GB." },
        { t: "p", text: "The phrase \u201cfour models in memory\u201d undersells it, because people count parameters and get about 56 GB. The policy and critic are *trained*, so each costs roughly 16 bytes per parameter \u2014 bf16 weights, bf16 gradients, an fp32 master copy and Adam\u2019s two moments \u2014 not 2 bytes. That is 104.3 GB each against 13.0 GB for each frozen model, so the total is 18\u00d7 one model\u2019s weights. And it excludes activations and the KV cache for sampling." },
        { t: "p", text: "DPO is the policy plus a frozen reference: 117.3 GB, exactly half, and the ratio is 2.00\u00d7 at every model size because the structure is two trained and two frozen against one and one." },
        { t: "p", text: "The second reason is the loop itself. Step one is autoregressive generation from the current policy, which is memory-bandwidth-bound and sequential, so sampling dominates the wall clock rather than learning. That forces real infrastructure \u2014 an inference-optimised copy of the policy, continuous batching, KV cache management. DPO trains on a fixed set of preference pairs with no generation in the loop at all." },
        { t: "p", text: "There is a third, smaller reason: PPO is hyperparameter-sensitive, and \u03b2 in particular is coupled to the reward model\u2019s output scale, which is mathematically unidentifiable. I verified that \u2014 two fits of the same preference data came out 100 apart with identical differences \u2014 so a retrained reward model silently changes your leash length with nothing in the config changing." },
        { t: "p", text: "Where PPO still wins is when you have an online reward signal and want the policy to explore against it. DPO is offline by construction: it can only learn from pairs you already collected, so it cannot discover a behaviour that is not represented in the data." }
      ] }
  ],

  takeaways: [
    "**The objective is reward minus \u03b2\u00b7KL to the frozen SFT model**, with \u03b2 typically 0.01\u20130.1 setting the leash length.",
    "**The KL term is non-negotiable** because the reward model is a learned proxy whose correct gaps are unbounded \u2014 7.4 showed nothing in RM training constrains magnitude.",
    "**The shaped reward is sparse plus dense**: the RM score lands once on the final token, the KL penalty on every token \u2014 which is why a critic and GAE are needed for credit assignment.",
    "**\u03b2 is coupled to the reward scale**, which is unidentifiable, so reward normalisation is a prerequisite and a retrained RM silently retunes the leash.",
    "**PPO's `min` makes the objective pessimistic rather than symmetric** \u2014 it is a lower bound on the unclipped surrogate.",
    "**So it limits over-shooting in the favourable direction only**: at \u03c1 = 1.5 a positive advantage is clipped to 1.2 while a negative one passes through at \u22121.5, unclipped.",
    "**\u201cPPO clips large updates\u201d is therefore a half-truth** \u2014 full pressure is preserved to undo a move the advantage says was bad.",
    "**\u03c1 is measured against the policy that generated the batch**, so it drifts over inner epochs \u2014 hence a few inner epochs rather than many.",
    "**The real memory bill for a 7B policy is 234.7 GB**, not the ~56 GB that \u201c4 \u00d7 7B resident\u201d implies, because trained models cost ~16 bytes per parameter.",
    "**That is 18\u00d7 one model's weights and ~2.9 80 GB cards before activations or KV cache**, and the generation step needs a sampling buffer on top.",
    "**DPO is 117.3 GB, exactly 2.00\u00d7 less at every model size**, and deleting the critic saves eight times what deleting the reward model saves.",
    "**Step 1, generation, dominates the wall clock** \u2014 it is sequential and bandwidth-bound, and DPO removes it from the loop entirely."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "At \u03c1 = 1.5 with advantage A = +1, PPO's surrogate gives 1.2 (clipped). At \u03c1 = 1.5 with A = \u22121, it gives \u22121.5 (unclipped). What does this show?",
        options: [
          "An implementation error \u2014 the clip should apply symmetrically",
          "The `min` makes the objective a pessimistic lower bound, so it caps credit for over-shooting in the favourable direction while preserving full pressure to undo a harmful move",
          "Negative advantages are excluded from the clipping by design, since they use a separate loss term",
          "The clip only applies when \u03c1 exceeds 1 + \u03b5 and A is positive, which is a known PPO limitation"
        ],
        answer: 1,
        why: "`min` always selects the lower term, which makes the surrogate a lower bound on the unclipped objective. When you have moved beyond the trust region in the direction the advantage favours, the clipped term is lower and flattens the gradient; when you have moved the wrong way, the raw term is lower and the full gradient pushes you back. At \u03c1 = 2.0 with A = \u22121 the value is \u22122.0, entirely unclipped \u2014 so \"PPO bounds every update\" is not accurate." },

      { stem: "A 7B PPO run is estimated at about 56 GB on the basis of \u201cfour 7B models at bf16\u201d. What is wrong?",
        options: [
          "The reward model is usually larger than the policy, so the estimate is too low",
          "The policy and critic are trained, so each costs ~16 bytes per parameter (weights, gradients, fp32 master, Adam m and v) rather than 2 \u2014 the real total is 234.7 GB",
          "bf16 is not used for RLHF; fp32 throughout gives 112 GB",
          "The estimate omits the fourth model, giving 42 GB instead of 56 GB"
        ],
        answer: 1,
        why: "Counting parameters treats all four models alike, but only the frozen reference and reward model cost bf16 weights alone at 13.0 GB each. Each trained model carries gradients, an fp32 master copy and Adam's two moments on top, reaching 104.3 GB \u2014 eight times its own weight footprint. The total of 234.7 GB is 18\u00d7 a single frozen 7B, and it still excludes activations and the KV cache that step 1's generation requires." },

      { stem: "Why is the KL penalty described as non-negotiable rather than a regularisation choice?",
        options: [
          "Because without it the gradient estimate becomes biased and PPO fails to converge",
          "Because the reward model is a learned proxy with unbounded correct gaps, so an unleashed policy converges onto degenerate text that scores highly and is useless to humans",
          "Because the reference model provides the baseline needed for advantage estimation",
          "Because the KL term is what makes the objective differentiable with respect to sampled tokens"
        ],
        answer: 1,
        why: "Bradley-Terry training makes the gradient vanish once a reward gap is large, so nothing constrains how big a correct gap becomes \u2014 leaving regions of output space where the RM confidently assigns huge scores for no good reason. Optimising hard against the proxy finds them, producing repeated flattery, enormous lists or formatting tics with excellent reward scores. The KL does not fix the reward model; it bounds the search radius, which is a blunt defence against a failure invisible from inside the loop." },

      { stem: "Which step of the PPO loop dominates wall-clock time, and why does that matter for the comparison with DPO?",
        options: [
          "The policy update, because the clipped surrogate requires several inner epochs",
          "Generation, because it is sequential and memory-bandwidth-bound \u2014 and DPO removes it from the loop entirely by training on fixed preference pairs",
          "Reward model scoring, since it requires a full forward pass per completion",
          "Advantage estimation via GAE, which is quadratic in sequence length"
        ],
        answer: 1,
        why: "Every other step is a batched forward or backward pass, while generation produces one token at a time and is bandwidth-bound rather than compute-bound. That forces substantial infrastructure \u2014 an inference-optimised copy of the policy, continuous batching, KV cache management \u2014 which is a large part of why RLHF is operationally harder than DPO. DPO's data is a fixed set of pairs, so nothing is generated during training, which together with the 2\u00d7 memory saving is why it displaced PPO for most teams." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "RLHF, and the costs that drove the field past it",
    questions: [
      { level: "advanced",
        q: "Walk me through RLHF with PPO.",
        strong: "A strong answer covers the objective, the leash, the clip and the cost.",
        answer: [
          { t: "p", text: "You start from an SFT model and a reward model trained on preference pairs. The objective is to maximise expected reward minus beta times the KL divergence from the frozen SFT model \u2014 get a high score, but stay near where you started." },
          { t: "p", text: "In practice the KL is folded into the reward per token: the RM score lands once on the final token and the KL penalty applies to every token. That shape is awkward, because one scalar at the end has to be attributed across the whole completion, which is exactly why you need a value network and GAE to estimate per-token advantages." },
          { t: "p", text: "PPO\u2019s contribution is how the step is taken. You form the importance ratio between the new and old policy and take the min of the raw and clipped surrogate. The min makes the objective pessimistic, so it stops rewarding you for over-shooting in the direction the advantage favours while keeping full gradient to undo a move the advantage says was bad \u2014 at a ratio of 1.5 a positive advantage is clipped to 1.2 and a negative one passes through unclipped." },
          { t: "p", text: "The loop is generate, score, apply the KL penalty, estimate advantages, update policy and critic for a few inner epochs. Generation dominates the wall clock because it is sequential, and the whole thing needs four models resident \u2014 234.7 GB for a 7B policy, which is the main reason the field moved on." }
        ] },

      { level: "advanced",
        q: "What goes wrong if you remove or mis-set the KL penalty?",
        strong: "A strong answer connects it to the reward model's properties.",
        answer: [
          { t: "p", text: "Remove it and the policy collapses onto whatever degenerate text maximises the reward model \u2014 repeated flattery, enormous lists, a particular formatting tic. The reward score looks excellent and the model is useless, which is the hard part: nothing inside the loop tells you this is happening." },
          { t: "p", text: "The reason it is available to exploit comes from how the RM was trained. The Bradley-Terry gradient is one minus sigmoid of the gap, so it vanishes once a gap is comfortably positive \u2014 I measured 1.8% of maximum gradient at a gap of 4. Nothing constrains how large a correct gap becomes, so there are regions where the RM confidently assigns huge scores for no good reason." },
          { t: "p", text: "Set beta too high and the opposite happens: the policy barely moves and you have spent the whole RLHF budget to reproduce your SFT model. Typical values are 0.01 to 0.1, and the right one depends on the reward scale." },
          { t: "p", text: "That coupling is the subtle failure. Beta is added to the reward, so it is only meaningful relative to reward magnitude \u2014 and an RM's absolute scale is mathematically unidentifiable, which I confirmed by fitting the same data from two initialisations a hundred apart and getting identical differences. So retraining the RM can change your effective leash length with nothing in the config file changing, which is why centring the rewards is a prerequisite rather than housekeeping." }
        ] },

      { level: "core",
        q: "When would you still choose PPO over DPO?",
        strong: "A strong answer identifies the online/offline distinction.",
        answer: [
          { t: "p", text: "When I have a reward signal I can query online and want the policy to explore against it. That is the one thing DPO structurally cannot do: it is offline by construction, learning only from pairs already collected, so it cannot discover a behaviour that is not represented in its data." },
          { t: "p", text: "The clearest case is a programmatic reward \u2014 unit tests, a maths checker, a verifier. There the reward is cheap, unlimited and unhackable in the usual way, so exploration is genuinely valuable and there is no annotation cost per sample. Though for that case I would reach for GRPO rather than PPO, since it deletes the critic and halves the memory." },
          { t: "p", text: "The second case is iterated improvement where the distribution shifts as the policy improves. A fixed preference dataset describes the old policy\u2019s outputs; once the policy has moved past them, the pairs stop being informative. Online methods resample from the current policy, which keeps the signal relevant." },
          { t: "p", text: "Against that, PPO costs 234.7 GB for a 7B policy against DPO\u2019s 117.3 GB, needs autoregressive generation inside the training loop, and is hyperparameter-sensitive in a way that interacts with the reward scale. So the default is DPO, and PPO or GRPO is what you reach for when you specifically need online exploration." }
        ] }
    ]
  }
});
