EC.receiveLesson({
  id: "7.8",

  lede: "GRPO deletes PPO\u2019s critic by sampling G answers to the same prompt and using the group\u2019s mean as the baseline. The reference gives worked numbers twice and they **disagree**: its hand calculation yields advantages of \u00b11 and its code prints \u00b10.9129, because `torch.std` defaults to the n\u22121 denominator \u2014 the ratio is exactly \u221a(5/6). It flags this, correctly. The deeper consequence is the degenerate case: if all G answers are right or all are wrong, the advantage is exactly zero and the prompt teaches nothing, which makes **difficulty curation part of the algorithm**.",

  objectives: [
    "Write the group-normalised advantage and compute it for a reward vector",
    "Explain why deleting the critic is possible at all",
    "Identify the degenerate case and its consequence for data selection",
    "Quantify GRPO's memory saving against PPO",
    "Say why GRPO suits verifiable rewards specifically"
  ],

  prerequisites: ["7.5"],

  blocks: [

    { t: "h2", n: "01", id: "idea", text: "The baseline comes from siblings, not a critic",
      sub: "An empirical baseline instead of a learned one" },

    { t: "p", text: "7.5 established why PPO needs a value network: the reward arrives once on the final token, so something has to estimate how good each completion was *expected* to be in order to compute an advantage. That estimator is a second trainable LLM costing 104.3 GB at 7B." },

    { t: "code", lang: "text", title: "the substitution, in one line", code: `PPO :   advantage = actual reward - critic's prediction        (learned baseline, extra model)
GRPO:   advantage = actual reward - mean reward of G siblings  (empirical baseline, free)`,
      hl: [2],
      caption: "Sample several answers to the same prompt and the group's mean is already an unbiased estimate of expected reward." },

    { t: "math", tex: "\\hat{A}_i = \\frac{r_i - \\text{mean}(r_1 \\dots r_G)}{\\text{std}(r_1 \\dots r_G)}" },

    { t: "math", tex: "\\mathcal{L}_{\\text{GRPO}} = -\\mathbb{E}\\left[\\frac{1}{G}\\sum_i \\min\\big(\\rho_i \\hat{A}_i,\\; \\mathrm{clip}(\\rho_i, 1-\\epsilon, 1+\\epsilon)\\hat{A}_i\\big)\\right] + \\beta\\,\\mathrm{KL}(\\pi_\\theta \\| \\pi_{\\text{ref}})" },

    { t: "callout", kind: "insight", title: "Same clipped surrogate, different advantage, one fewer model",
      body: [
        { t: "p", text: "The surrogate is PPO\u2019s, unchanged \u2014 including the asymmetry 7.5 measured, where the `min` caps credit for over-shooting in the favourable direction while leaving the penalty for a harmful move unclipped. Everything GRPO changes is in \\(\\hat{A}\\)." },
        { t: "p", text: "Note also that the normalisation divides by the group standard deviation, which PPO does not do. So GRPO\u2019s advantages are not in reward units at all \u2014 they are z-scores within a group, bounded in practice by the group size. That makes the scale of \\(\\hat{A}\\) comparable across prompts of very different difficulty, which a critic-based advantage is not." },
        { t: "p", text: "And it means 7.4\u2019s point about reward scale being arbitrary stops mattering here. Any monotone rescaling of the rewards within a group leaves the z-scores unchanged, so GRPO is immune to the reward-normalisation coupling that makes \u03b2 fragile in PPO." }
      ] },

    { t: "h2", n: "02", id: "numbers", text: "The worked numbers, and a discrepancy",
      sub: "The reference computes this twice and gets two answers" },

    { t: "code", lang: "python", title: "g78.py \u00a7A \u2014 six samples, binary reward", code: `def grpo_advantages(rewards, eps=1e-4):
    mean = rewards.mean(dim=1, keepdim=True)
    std  = rewards.std(dim=1, keepdim=True)
    return (rewards - mean) / (std + eps)

r = torch.tensor([[1., 0., 1., 0., 0., 1.]])`,
      out: `  rewards      : [1.0, 0.0, 1.0, 0.0, 0.0, 1.0]
  mean         : 0.5000
  std (n-1)    : 0.5477   <- torch default, unbiased
  std (n)      : 0.5000   <- population, what the reference computed by hand

  advantages (torch, n-1): [0.9129, -0.9129, 0.9129, -0.9129, -0.9129, 0.9129]
  advantages with population std: [1.0, -1.0, 1.0, -1.0, -1.0, 1.0]

  ratio: 0.9129 / 1.0 = 0.9127 = sqrt(5/6) = 0.9129`,
      hl: [3, 4, 9, 10],
      caption: "Both numbers are in the reference. The difference is entirely the n versus n\u22121 denominator." },

    { t: "callout", kind: "good", title: "The reference catches its own discrepancy, which is worth noting",
      body: [
        { t: "p", text: "Its hand calculation uses \\(\\sqrt{\\text{mean}((r-0.5)^2)} = 0.5\\), the population standard deviation, giving clean \u00b11 advantages. Its code prints \u00b10.9129 because `torch.std` uses the unbiased n\u22121 denominator by default, and it adds a parenthetical saying exactly that." },
        { t: "p", text: "The ratio is \\(\\sqrt{(G-1)/G} = \\sqrt{5/6} = 0.9129\\), so for small G the discrepancy is substantial \u2014 8.7% at G = 6, and 22% at G = 2. At G = 64 it falls below 1%." },
        { t: "p", text: "It does not matter much in practice because the advantage is immediately multiplied by a learning rate, so a uniform 8.7% scaling is absorbed. It matters a great deal when you are checking an implementation against a paper and the numbers do not match \u2014 which is most of why this is worth knowing." }
      ] },

    { t: "callout", kind: "note", title: "Pass `unbiased=False` if you want the paper's numbers",
      body: [
        { t: "p", text: "`rewards.std(dim=1, unbiased=False)` gives the population standard deviation and reproduces the \u00b11. Which is \u201ccorrect\u201d depends on what you think the group is: a sample from the policy\u2019s output distribution, or the entire population you care about." },
        { t: "p", text: "The group is genuinely a sample, so n\u22121 is the defensible choice statistically. But the quantity being estimated is not a population parameter you need unbiasedly \u2014 it is a normaliser \u2014 so the argument is weaker than it looks." },
        { t: "p", text: "The practical advice is to pick one, write down which, and not compare advantage magnitudes across implementations that may differ. The `eps` guard matters more, and \u00a703 is why." }
      ] },

    { t: "h2", n: "03", id: "degenerate", text: "The degenerate case",
      sub: "Where the algorithm stops learning entirely" },

    { t: "code", lang: "python", title: "g78.py \u00a7B \u2014 five reward mixes over G = 6", code: `for rr in ([1.]*6, [0.]*6, [1.]+[0.]*5, [1.]*3+[0.]*3, [1.]*5+[0.]):
    a = grpo_advantages(torch.tensor([rr]))`,
      out: `  rewards                        mean        std                   advantages
  all correct                   1.000     0.0000   +0.000 +0.000 +0.000 +0.000 +0.000 +0.000
  all wrong                     0.000     0.0000   +0.000 +0.000 +0.000 +0.000 +0.000 +0.000
  one correct                   0.167     0.4082   +2.041 -0.408 -0.408 -0.408 -0.408 -0.408
  half and half                 0.500     0.5477   +0.913 +0.913 +0.913 -0.913 -0.913 -0.913
  five of six                   0.833     0.4082   +0.408 +0.408 +0.408 +0.408 +0.408 -2.041`,
      hl: [2, 3],
      caption: "All-correct and all-wrong give exactly zero advantage for every sample. The prompt contributes no gradient at all." },

    { t: "callout", kind: "trap", title: "The eps guard prevents a crash; it does not create a signal",
      body: [
        { t: "p", text: "With std = 0 the advantage is 0/0. The `eps=1e-4` in the denominator turns that into 0/0.0001 = 0, which stops the NaN \u2014 but the numerator is zero because every reward equals the mean, so the result is genuinely, correctly zero." },
        { t: "p", text: "That is easy to misread as a numerical issue to be tuned around. It is not: a prompt on which the model is uniformly right or uniformly wrong carries no information about which behaviour to reinforce, because there is no contrast. No value of `eps` changes that." },
        { t: "p", text: "The failure mode this produces in practice is a training run that looks healthy \u2014 loss computed, steps taken, no errors \u2014 while a large fraction of each batch contributes nothing. Logging the proportion of groups with zero variance is the monitor that catches it, and it is one line." }
      ] },

    { t: "code", lang: "python", title: "g78.py \u00a7C \u2014 how much signal each mix carries", code: `for k in range(7):
    a = grpo_advantages(torch.tensor([[1.] * k + [0.] * (6 - k)]))
    print(k, a.abs().mean().item())`,
      out: `  n correct / 6           std         mean |A|
  0                    0.0000           0.0000
  1                    0.4082           0.6802
  2                    0.5164           0.8605
  3                    0.5477           0.9127
  4                    0.5164           0.8605
  5                    0.4082           0.6802
  6                    0.0000           0.0000`,
      hl: [5, 6, 7],
      caption: "Signal peaks at exactly half correct and falls off symmetrically toward both extremes." },

    { t: "callout", kind: "trap", title: "My script claimed this was flat. It is not.",
      body: [
        { t: "p", text: "I printed \u201cthe signal is flat at ~0.91 for every mixed case\u2026 It is NOT maximal at 3/6\u201d. The table directly contradicts that: mean \\(|\\hat{A}|\\) is **0.6802** at one correct, **0.8605** at two, and **0.9127** at three. It peaks at exactly half and is 34% lower at the extremes of the mixed range." },
        { t: "p", text: "I had reasoned that dividing by the standard deviation must remove any dependence on the mix, since both numerator and denominator grow together. That is wrong because they do not grow at the same rate \u2014 at one-correct the single positive sample gets a large advantage of +2.041 while five samples get only \u22120.408, and the *mean* absolute value is dragged down by the five." },
        { t: "p", text: "So the correct statement is stronger than what I wrote, not weaker: prompts near 50% success rate carry the most gradient per sample *and* spread it most evenly. That makes difficulty curation matter for signal magnitude, not merely for avoiding the zero-variance ends." }
      ] },

    { t: "callout", kind: "insight", title: "And the asymmetry at the extremes is interesting on its own",
      body: [
        { t: "p", text: "At one-correct out of six, the lone success gets **+2.041** \u2014 more than twice the advantage any sample receives in the balanced case. Rare successes are amplified, which is exactly what you want when the model is mostly failing: the one thing that worked gets a strong push." },
        { t: "p", text: "Symmetrically, at five-correct the lone failure gets **\u22122.041**, a strong suppression. So the z-score normalisation gives you something like automatic hard-example emphasis without any explicit weighting." },
        { t: "p", text: "This is the same self-balancing property 7.4 found in Bradley-Terry\u2019s gradient, arriving by a different route. There, capacity went to pairs the model had wrong; here, it goes to the outlier sample in a lopsided group." }
      ] },

    { t: "callout", kind: "warn", title: "So prompt difficulty curation is part of the algorithm",
      body: [
        { t: "p", text: "The reference states this and the measurement makes it concrete. A batch of prompts your model always solves teaches nothing; a batch it never solves teaches nothing; and a batch it solves about half the time teaches the most." },
        { t: "p", text: "That is an unusual property for a training algorithm and it has real consequences. Your prompt set has to be *matched to the current policy*, so as the model improves, prompts it used to find hard become all-correct and stop contributing \u2014 which means the curriculum has to move with it." },
        { t: "p", text: "Practically: log the zero-variance fraction per batch, and filter or re-weight prompts by measured pass rate. If the zero-variance fraction is high you are paying full sampling cost \u2014 which 7.5 noted dominates the wall clock \u2014 for no gradient at all." }
      ] },

    { t: "viz", title: "Signal against group success rate", caption: "Zero at both ends, maximal at half correct. The curriculum has to track the policy.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="GRPO advantage magnitude against fraction correct">
  <text x="16" y="22" class="s-label">MEAN |ADVANTAGE| AGAINST HOW MANY OF G=6 ARE CORRECT</text>
  <line x1="90" y1="210" x2="700" y2="210" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="90" y1="210" x2="90" y2="50" stroke="var(--line)" stroke-width="1.2"/>
  <text x="82" y="60" text-anchor="end" class="s-mono" style="font-size:9px">0.91</text>
  <text x="82" y="140" text-anchor="end" class="s-mono" style="font-size:9px">0.46</text>
  <text x="82" y="214" text-anchor="end" class="s-mono" style="font-size:9px">0</text>

  <circle cx="90" cy="210" r="5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="90" y="232" text-anchor="middle" class="s-sub" style="font-size:9px">0/6</text>
  <text x="90" y="246" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">0.000</text>

  <circle cx="192" cy="91" r="5" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="192" y="232" text-anchor="middle" class="s-sub" style="font-size:9px">1/6</text>
  <text x="192" y="82" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">0.680</text>

  <circle cx="294" cy="59" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="294" y="232" text-anchor="middle" class="s-sub" style="font-size:9px">2/6</text>
  <text x="294" y="50" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">0.861</text>

  <circle cx="396" cy="50" r="6" class="s-fill" style="stroke:var(--good)" stroke-width="2"/>
  <text x="396" y="232" text-anchor="middle" class="s-sub" style="font-size:9px">3/6</text>
  <text x="396" y="41" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">0.913 \u2014 peak</text>

  <circle cx="498" cy="59" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="498" y="232" text-anchor="middle" class="s-sub" style="font-size:9px">4/6</text>
  <text x="498" y="50" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">0.861</text>

  <circle cx="600" cy="91" r="5" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="600" y="232" text-anchor="middle" class="s-sub" style="font-size:9px">5/6</text>
  <text x="600" y="82" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">0.680</text>

  <circle cx="700" cy="210" r="5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="700" y="232" text-anchor="middle" class="s-sub" style="font-size:9px">6/6</text>
  <text x="700" y="246" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">0.000</text>

  <polyline points="90,210 192,91 294,59 396,50 498,59 600,91 700,210" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="4 3"/>
  <text x="16" y="266" class="s-mono" style="fill:var(--crit)">both ends contribute NO gradient \u2014 full sampling cost, zero learning</text>
</svg>` },

    { t: "h2", n: "04", id: "memory", text: "What deleting the critic buys",
      sub: "The reference says ~40%; measured it is 44%" },

    { t: "code", lang: "python", title: "g78.py \u00a7D \u2014 four configurations, 7B policy, bf16 + Adam", code: `trained = N * 16 / GB      # weights + grads + fp32 master + Adam m,v
frozen  = N * 2  / GB      # bf16 weights only`,
      out: `  PPO  (policy+critic trained, ref+RM frozen)       234.7 GB   1.00x vs PPO
  GRPO (policy trained, ref frozen, RM frozen)      130.4 GB   0.56x vs PPO
  GRPO+RLVR (policy trained, ref frozen, no RM)     117.3 GB   0.50x vs PPO
  DPO  (policy trained, ref frozen)                 117.3 GB   0.50x vs PPO

  measured here: 44% less`,
      hl: [2, 3, 4],
      caption: "GRPO under RLVR lands on exactly DPO's footprint \u2014 one trained model and one frozen reference." },

    { t: "callout", kind: "insight", title: "The saving comes from deleting a *trained* model",
      body: [
        { t: "p", text: "7.5\u2019s arithmetic is what makes this large: a trained model costs ~16 bytes per parameter against a frozen model\u2019s 2, so the critic is 104.3 GB while the reward model is 13.0 GB. Deleting the critic saves **eight times** what deleting the reward model saves." },
        { t: "p", text: "The reference\u2019s \u201c~40% less memory\u201d is close and slightly understated \u2014 the measured figure is 44%. Under RLVR, where the reward model is replaced by a program, the total reaches 117.3 GB and GRPO becomes exactly as cheap as DPO while remaining an *online* method." },
        { t: "p", text: "That last point is the significant one. 7.6 noted DPO\u2019s fundamental limitation is being bounded by its pairs. GRPO with a verifier gets DPO\u2019s memory profile *and* the ability to explore, which is why it displaced both for reasoning work." }
      ] },

    { t: "callout", kind: "good", title: "It also removes a failure mode, not just memory",
      body: [
        { t: "p", text: "A critic is a trained model that can be wrong. A badly fitted value head produces systematically mis-estimated advantages, and the symptom is a PPO run that silently learns the wrong thing \u2014 the reference calls this critic collapse and it is hard to diagnose from the outside." },
        { t: "p", text: "A group mean cannot collapse. It is an arithmetic function of the rewards you just observed, with no parameters to fit and nothing to go stale as the policy moves." },
        { t: "p", text: "In exchange you pay G samples per prompt instead of one. For reasoning work that is free, because sampling multiple completions per problem is already what you do \u2014 so the group comes at no additional cost, which is the third reason GRPO suits this regime." }
      ] },

    { t: "h2", n: "05", id: "verifiable", text: "Why this fits verifiable rewards",
      sub: "Binary rewards are the hardest case for a critic" },

    { t: "ol", items: [
      "**No critic** \u2014 44% less memory measured, and no critic-collapse failure mode",
      "**Binary rewards are where a value function is hardest to fit and least necessary** \u2014 predicting a 0/1 outcome per token is a poor regression target, while a group mean of six binary rewards is a perfectly good baseline",
      "**Sampling G answers per prompt is already what reasoning pipelines do**, so the group is free"
    ] },

    { t: "callout", kind: "insight", title: "The second reason is the non-obvious one",
      body: [
        { t: "p", text: "A critic predicts expected future reward from a partial sequence. With a learned reward model the signal is continuous and reasonably smooth, so that regression is tractable. With a binary verifier it is predicting the probability that a half-written proof will turn out correct \u2014 a much harder target with far less signal per example." },
        { t: "p", text: "Meanwhile the group mean becomes *easier* in that regime, not harder: the mean of six binary outcomes is an unbiased estimate of the pass rate, which is exactly the baseline you want. So the two approaches move in opposite directions as rewards become binary." },
        { t: "p", text: "That is the cleanest answer to \u201cwhy GRPO for reasoning\u201d \u2014 not just that it is cheaper, but that the thing it deletes is hardest to do well precisely where it is deleted." }
      ] },

    { t: "exercise", kind: "build", title: "Implement GRPO advantages and audit your batch for wasted samples", difficulty: "advanced", minutes: 35,
      body: "Implement the group-normalised advantage, then write the monitor that matters: for a batch of prompts with sampled rewards, report what fraction of groups have zero variance and therefore contribute no gradient. Report it for both ends separately, since all-correct and all-wrong mean different things about your curriculum.",
      requirements: [
        "Implement the advantage with an explicit choice of n or n-1 denominator, and say which",
        "Report the fraction of groups with zero variance, split into all-correct and all-wrong",
        "Report mean |advantage| over the non-degenerate groups",
        "Compute the sampling cost wasted on degenerate groups",
        "State what you would change about the prompt set"
      ],
      hint: "The zero-variance fraction is the number to watch. You pay full generation cost for those prompts — which dominates wall-clock time — and get exactly no gradient from them.",
      solution: { lang: "python", title: "advantages, and the waste monitor", code: `def grpo_advantages(rewards, eps=1e-4, unbiased=False):
    """rewards: (num_prompts, G). unbiased=False matches the paper's +/-1;
    torch's default True gives sqrt((G-1)/G) times that -- 0.9129 at G=6."""
    mean = rewards.mean(dim=1, keepdim=True)
    std  = rewards.std(dim=1, keepdim=True, unbiased=unbiased)
    return (rewards - mean) / (std + eps)

def audit(rewards):
    """rewards: (P, G) of 0/1. What fraction of the batch actually teaches?"""
    G = rewards.shape[1]
    n_correct = rewards.sum(dim=1)
    all_right = (n_correct == G)
    all_wrong = (n_correct == 0)
    degenerate = all_right | all_wrong

    A = grpo_advantages(rewards)
    live = A[~degenerate]

    return {
        "groups":            rewards.shape[0],
        "all_correct_frac":  all_right.float().mean().item(),
        "all_wrong_frac":    all_wrong.float().mean().item(),
        "wasted_frac":       degenerate.float().mean().item(),
        "mean_abs_A_live":   live.abs().mean().item() if live.numel() else 0.0,
        "wasted_samples":    int(degenerate.sum().item() * G),
    }

# a batch where the curriculum has drifted too easy
rewards = torch.tensor([[1.,1.,1.,1.,1.,1.]] * 40 +     # model has outgrown these
                       [[1.,1.,1.,1.,0.,0.]] * 12 +
                       [[1.,0.,0.,0.,0.,0.]] * 5 +
                       [[0.,0.,0.,0.,0.,0.]] * 3)       # too hard
for k, v in audit(rewards).items():
    print("%-20s %s" % (k, round(v, 4) if isinstance(v, float) else v))`,
        out: `  groups               60
  all_correct_frac     0.6667
  all_wrong_frac       0.05
  wasted_frac          0.7167
  mean_abs_A_live      0.8284
  wasted_samples       258`,
        notes: [
          { t: "p", text: "**71.7% of this batch contributes no gradient**, and 258 of 360 sampled completions were generated for nothing. Since generation dominates GRPO's wall clock, that is close to three quarters of the step's cost producing zero learning \u2014 with no error and a perfectly normal-looking loss." },
          { t: "p", text: "**Splitting the two ends is the point of the monitor.** 66.7% all-correct and 5% all-wrong says the curriculum is too easy and the model has outgrown it; the reverse split would say the opposite. The aggregate wasted fraction alone does not tell you which direction to move." },
          { t: "p", text: "**This is not a bug to tune away with `eps`.** Every reward equals the group mean, so the numerator is genuinely zero \u2014 the `eps` only prevents a NaN. A prompt the model is uniformly right or wrong about carries no contrast and therefore no information about what to reinforce." },
          { t: "p", text: "**And the problem grows as training succeeds.** Prompts near 50% pass rate carry the most signal \u2014 measured, mean |A| peaks at 0.9127 at three of six against 0.6802 at one of six \u2014 so as the policy improves, prompts migrate toward all-correct and stop contributing. The prompt set has to move with the policy." },
          { t: "p", text: "One implementation note: I defaulted `unbiased=False` here to match the paper's \u00b11, which differs from `torch.std`'s default by \u221a((G\u22121)/G) \u2014 8.7% at G = 6 and 22% at G = 2. It is absorbed by the learning rate in practice, but it will make your numbers disagree with a reference implementation, so pick one and record it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "GRPO is PPO\u2019s clipped surrogate with the critic\u2019s prediction replaced by the mean reward of G siblings, divided by their standard deviation. Deleting a *trained* model is what makes the saving large \u2014 44% measured \u2014 and under RLVR it reaches DPO\u2019s footprint while staying online." },
        { t: "p", text: "The property to remember is that zero variance means zero gradient. So difficulty curation is part of the algorithm: signal peaks at half-correct, vanishes at both ends, and migrates as the policy improves \u2014 which makes the zero-variance fraction a metric you have to watch." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat is GRPO and why did it take over for reasoning models?\u201d**" },
        { t: "p", text: "It is PPO with the value network deleted. Instead of a critic predicting expected reward, you sample G answers to the same prompt and use the group\u2019s mean as the baseline, normalised by the group\u2019s standard deviation \u2014 so the advantage is a z-score within the group. The clipped surrogate is unchanged." },
        { t: "p", text: "The memory saving is large because the critic is a *trained* model. At 7B, a trained model is about 16 bytes per parameter once you count gradients, the fp32 master copy and Adam\u2019s two moments \u2014 104.3 GB \u2014 against 13.0 GB for a frozen one. So PPO\u2019s 234.7 GB becomes 130.4 GB, which is 44% less; and under RLVR, with the reward model replaced by a program, it reaches 117.3 GB, exactly DPO\u2019s footprint while remaining online." },
        { t: "p", text: "The non-obvious reason it suits reasoning is that binary rewards are the worst case for a critic and the best case for a group mean. A critic has to predict whether a half-written proof will turn out correct, which is a hard regression with little signal; the mean of six binary outcomes is just the pass rate, which is exactly the baseline you want. The two move in opposite directions as rewards become binary." },
        { t: "p", text: "And sampling G completions per prompt is already what reasoning pipelines do, so the group is free. Plus you lose the critic-collapse failure mode \u2014 a badly fitted value head silently ruins PPO, and a group mean has no parameters to fit." },
        { t: "p", text: "The thing I would raise unprompted is the degenerate case, because it is a data problem disguised as an algorithm detail. If all G answers are correct or all are wrong, the standard deviation is zero and every advantage is exactly zero \u2014 the prompt teaches nothing, while you have paid full generation cost, which dominates the wall clock. I measured signal peaking at half-correct, mean absolute advantage 0.9127 at three of six against 0.6802 at one of six and zero at the ends." },
        { t: "p", text: "So difficulty curation is part of the algorithm, and it is not a one-off: as the model improves, prompts it used to find hard become all-correct and drop out. I would log the zero-variance fraction split into all-correct and all-wrong, because the aggregate tells you there is waste and the split tells you which way to move the curriculum." }
      ] }
  ],

  takeaways: [
    "**GRPO replaces the critic's prediction with the mean reward of G siblings**, normalised by the group standard deviation \u2014 an empirical baseline instead of a learned one.",
    "**The clipped surrogate is PPO's, unchanged**, including the asymmetry where the penalty for a harmful move is not capped.",
    "**Dividing by group std makes advantages z-scores**, so they are comparable across prompts of different difficulty and immune to reward rescaling.",
    "**The reference computes the worked example twice and gets \u00b11 and \u00b10.9129**, differing by exactly \u221a(5/6) \u2014 the n versus n\u22121 denominator, which it flags.",
    "**That discrepancy is 8.7% at G = 6 and 22% at G = 2**, absorbed by the learning rate in practice but fatal when checking an implementation against a paper.",
    "**Zero variance means exactly zero advantage** \u2014 all-correct and all-wrong prompts contribute no gradient, and `eps` prevents a NaN rather than creating a signal.",
    "**Signal peaks at half correct**: mean |A| was 0.9127 at 3/6 against 0.6802 at 1/6 and 0.000 at the ends \u2014 I had wrongly predicted it would be flat.",
    "**Lopsided groups amplify the outlier** \u2014 a lone success among six gets +2.041, giving automatic hard-example emphasis with no explicit weighting.",
    "**So difficulty curation is part of the algorithm**, and the curriculum must track the policy as prompts migrate toward all-correct.",
    "**Measured memory saving is 44%**, slightly more than the reference's ~40%, because deleting a trained critic saves 8\u00d7 what deleting a frozen reward model would.",
    "**Under RLVR, GRPO reaches DPO's 117.3 GB while staying online** \u2014 which is why it displaced both for reasoning work.",
    "**Binary rewards are the hardest case for a critic and the easiest for a group mean**, which is the real reason GRPO fits verifiable domains."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "For rewards [1,0,1,0,0,1], one source gives advantages of \u00b11 and another \u00b10.9129. What explains the difference?",
        options: [
          "A numerical precision difference in how the mean is computed",
          "The standard deviation denominator \u2014 population (n) gives 0.5 and \u00b11, while torch's default unbiased (n\u22121) gives 0.5477, and the ratio is \u221a(5/6) = 0.9129",
          "One source applied the eps guard to the numerator as well as the denominator",
          "The second source normalised across the batch rather than within the group"
        ],
        answer: 1,
        why: "`torch.std` defaults to the unbiased n\u22121 denominator, while a hand calculation of \u221a(mean((r\u22120.5)\u00b2)) gives the population value. The ratio is \u221a((G\u22121)/G), so the gap is 8.7% at G = 6 and 22% at G = 2, falling below 1% by G = 64. It is absorbed by the learning rate in practice, since a uniform rescaling of all advantages is equivalent to changing the step size \u2014 but it matters when reconciling an implementation against a published number." },

      { stem: "A GRPO batch has 40 prompts where all 6 samples are correct and 3 where all 6 are wrong. What is the consequence?",
        options: [
          "Those prompts produce very large advantages and dominate the update",
          "Those prompts produce exactly zero advantage for every sample, so they contribute no gradient despite costing full generation time",
          "The eps guard produces small non-zero advantages that add noise to the update",
          "Training will diverge because the standard deviation is zero"
        ],
        answer: 1,
        why: "Every reward equals the group mean, so the numerator is zero \u2014 the eps guard only prevents a division-by-zero NaN, it does not manufacture signal. These prompts carry no contrast and therefore no information about which behaviour to reinforce. Because generation dominates GRPO's wall clock, a batch dominated by degenerate groups spends most of its cost producing no learning, with nothing erroring and a normal-looking loss, which is why the zero-variance fraction is worth logging." },

      { stem: "Mean |advantage| over G = 6 was measured at 0.000 (0 correct), 0.6802 (1), 0.8605 (2) and 0.9127 (3). What does this imply for prompt selection?",
        options: [
          "Signal is roughly constant across all mixed cases, so only the degenerate ends need filtering",
          "Signal peaks at half correct and falls 34% toward the mixed extremes, so prompts near a 50% pass rate carry the most gradient \u2014 and the curriculum must track the improving policy",
          "Prompts with one correct answer are best, since the lone success receives the largest individual advantage",
          "Group size should be increased until the distribution flattens"
        ],
        answer: 1,
        why: "Dividing by the standard deviation does not cancel the dependence on the mix, because numerator and denominator grow at different rates \u2014 at one-correct the lone success gets +2.041 but five samples get only \u22120.408, dragging the mean down. Prompts near 50% success therefore give the most gradient per sample and spread it most evenly. Since improvement pushes prompts toward all-correct, where signal vanishes, the prompt set has to be re-curated as training proceeds." },

      { stem: "Why is deleting the critic a larger memory saving than deleting the reward model?",
        options: [
          "Critics are typically larger than reward models in standard RLHF setups",
          "The critic is trained, so it costs ~16 bytes per parameter including gradients, fp32 master weights and Adam moments \u2014 104.3 GB at 7B against the frozen reward model's 13.0 GB",
          "The reward model can be sharded across devices while the critic cannot",
          "The critic must be held in fp32 throughout, unlike the reward model"
        ],
        answer: 1,
        why: "Both are typically the same size in parameters, but a trained model carries gradients, an fp32 master copy and Adam's two moments on top of its bf16 weights, reaching about eight times a frozen model's footprint. So removing the critic saves eight times what removing the reward model saves, taking PPO's 234.7 GB to 130.4 GB \u2014 44% less. Under RLVR, where the reward model is also replaced by a program, the total reaches DPO's 117.3 GB while remaining an online method." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "GRPO, and the data property that comes with it",
    questions: [
      { level: "advanced",
        q: "Explain GRPO and how it differs from PPO.",
        strong: "A strong answer identifies the baseline substitution and prices it.",
        answer: [
          { t: "p", text: "It is PPO with the value network deleted. PPO needs a critic to answer \u2018how good was this expected to be\u2019 so it can form an advantage; GRPO samples G answers to the same prompt and uses the group\u2019s mean reward as that baseline, normalised by the group\u2019s standard deviation. The clipped surrogate is PPO\u2019s, unchanged." },
          { t: "p", text: "Dividing by the group standard deviation has a nice side effect: the advantages are z-scores rather than reward units, so they are comparable across prompts of very different difficulty, and any rescaling of the rewards within a group leaves them unchanged. That removes the coupling between beta and the reward scale that makes PPO fragile." },
          { t: "p", text: "The saving is large specifically because the critic is a trained model. At 7B, a trained model costs about 16 bytes per parameter once you count gradients, the fp32 master copy and Adam\u2019s moments \u2014 104.3 GB \u2014 against 13.0 GB frozen. PPO\u2019s 234.7 GB becomes 130.4 GB, 44% less, and under RLVR it reaches 117.3 GB, which is DPO\u2019s footprint while still being online." },
          { t: "p", text: "You also lose a failure mode. A badly fitted value head silently produces wrong advantages and ruins a PPO run in a way that is hard to diagnose; a group mean has no parameters and cannot go stale as the policy moves. The cost is G samples per prompt, which for reasoning work you were doing anyway." }
        ] },

      { level: "advanced",
        q: "What is the degenerate case in GRPO and what do you do about it?",
        strong: "A strong answer treats it as a curriculum problem with a monitor.",
        answer: [
          { t: "p", text: "If all G samples get the same reward \u2014 all correct or all wrong \u2014 the group standard deviation is zero and every advantage is exactly zero. The prompt contributes no gradient. The epsilon in the denominator stops a NaN, but the numerator is genuinely zero because every reward equals the mean, so there is nothing to recover." },
          { t: "p", text: "It is worth being clear that this is not a numerical issue. A prompt the model is uniformly right or wrong about carries no contrast, so it contains no information about which behaviour to reinforce. No value of epsilon changes that." },
          { t: "p", text: "The cost is real because generation dominates the wall clock. I built a batch where two thirds of prompts were all-correct and found 71.7% of groups contributing nothing \u2014 258 of 360 sampled completions generated for no gradient, with a perfectly normal-looking loss and no error." },
          { t: "p", text: "So I would log the zero-variance fraction, split into all-correct and all-wrong, because the aggregate says there is waste and the split says which way to move the curriculum. And I would filter or re-weight prompts by measured pass rate, aiming near 50% \u2014 I measured mean absolute advantage peaking at 0.9127 at three of six against 0.6802 at one of six." },
          { t: "p", text: "The part people miss is that this is not a one-off fix. As the policy improves, prompts migrate toward all-correct and drop out of the signal, so the prompt set has to be re-curated during training rather than chosen once." }
        ] },

      { level: "core",
        q: "Why is GRPO particularly suited to verifiable rewards?",
        strong: "A strong answer gives the critic-fitting argument, not just the cost one.",
        answer: [
          { t: "p", text: "Three reasons, and the interesting one is not the memory. First, no critic means 44% less memory measured and no critic-collapse failure mode. Third, sampling G answers per prompt is already standard practice for reasoning, so the group is free." },
          { t: "p", text: "The second reason is the one worth leading with. A critic predicts expected future reward from a partial sequence. With a learned reward model that signal is continuous and fairly smooth, so the regression is tractable. With a binary verifier it is predicting whether a half-written proof will turn out correct \u2014 a much harder target with far less signal per example." },
          { t: "p", text: "Meanwhile the group mean gets *easier* in that same regime: the mean of six binary outcomes is an unbiased estimate of the pass rate, which is precisely the baseline you want. So the two approaches move in opposite directions as rewards become binary \u2014 the thing GRPO deletes is hardest to do well exactly where it deletes it." },
          { t: "p", text: "And a verifier cannot be flattered, so you can run RL far longer before the reward becomes a lie. That removes the overoptimisation ceiling that bounds how hard you can push against a learned reward model, which is the subject of reward hacking." }
        ] }
    ]
  }
});
