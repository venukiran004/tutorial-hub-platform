EC.receiveLesson({
  id: "7.11",

  lede: "The reference draws overoptimisation as an ASCII sketch \u2014 proxy score climbing while true quality peaks and falls. It is not a drawing: it falls out of optimising any direction that is nearly-but-not-exactly right. Simulated with a reward model 59.3% aligned with true preference, the proxy score rose **monotonically and without bound** while true quality peaked at a KL of 1.0 and reached **\u22129.04** by KL 6. And the peak position is exact: **best KL \u221d cosine alignment**, so a better reward model buys optimisation *headroom*, not just a better score.",

  objectives: [
    "State Goodhart's law in the form it takes for reward models",
    "Explain why the proxy score rises without bound while true quality turns",
    "Recognise each hack in the catalogue and name its fix",
    "Use KL divergence and a held-out gold reward model as early warnings",
    "Explain why length is the canonical hack in terms of 7.6's arithmetic"
  ],

  prerequisites: ["7.4", "7.5", "7.6"],

  blocks: [

    { t: "h2", n: "01", id: "goodhart", text: "Goodhart, applied to a learned reward",
      sub: "The proxy and the thing it proxies for come apart" },

    { t: "p", text: "The reward model is a *proxy* for human preference, fitted from a finite set of comparisons. Optimise the proxy hard enough and the two diverge \u2014 true quality peaks and then falls while the proxy score keeps climbing. 7.4 identified the structural reason: Bradley-Terry\u2019s gradient is \\(1-\\sigma(g)\\), which vanishes once a gap is large, so **nothing in RM training constrains how big a correct gap becomes**." },

    { t: "code", lang: "python", title: "g711.py \u00a7A \u2014 a 40-dimensional response space, RM fitted on 300 pairs", code: `w_true  = rng.normal(size=D); w_true /= np.linalg.norm(w_true)   # true preference
noise   = rng.normal(size=D) / np.sqrt(N_PAIRS)                  # finite-data error
w_proxy = w_true + noise * 3.0; w_proxy /= np.linalg.norm(w_proxy)

# the policy moves along the PROXY's gradient; KL measures how far it moved
proxy = w_proxy @ x
true  = w_true @ x - 0.35 * step**2      # drifting from pi_ref degrades fluency`,
      out: `  cosine(true direction, RM direction): 0.5931
  angle between them                  : 53.6 degrees

  KL (dist)   proxy score     TRUE score   true - proxy
  0.0              0.0000         0.0000         0.0000
  0.5              0.5000         0.2091        -0.2909
  1.0              1.0000         0.2431        -0.7569
  1.5              1.5000         0.1022        -1.3978
  2.0              2.0000        -0.2138        -2.2138
  3.0              3.0000        -1.3706        -4.3706
  4.0              4.0000        -3.2275        -7.2275
  6.0              6.0000        -9.0413       -15.0413`,
      hl: [7, 10, 11, 15],
      caption: "Proxy column: monotone, unbounded. True column: peaks at KL 1.0, then collapses." },

    { t: "callout", kind: "insight", title: "The curve is a consequence, not an empirical regularity",
      body: [
        { t: "p", text: "Two ingredients produce it and both are unavoidable. The reward model points in a slightly wrong direction, because it was fitted from finite noisy comparisons. And moving far from \\(\\pi_{\\text{ref}}\\) costs something real \u2014 fluency, coherence, calibration \u2014 which is what the quadratic penalty stands in for." },
        { t: "p", text: "Given those, the shape is forced. The proxy is linear in distance moved, so it rises forever. True quality is the aligned *component* of that movement minus a cost that grows faster, so it must turn. There is no parameter setting that avoids it \u2014 only a point at which you should stop." },
        { t: "p", text: "Which reframes the KL leash from 7.5. \u03b2 does not prevent overoptimisation; it makes the stopping point harder to overshoot. The thing that actually prevents it is noticing where the peak is, which is what \u00a703 is about." }
      ] },

    { t: "callout", kind: "trap", title: "My script called 0.5931 a \u201cgood\u201d proxy and then claimed 90%",
      body: [
        { t: "p", text: "It printed \u201cthe RM is a GOOD proxy \u2014 59.3% aligned\u201d, which is generous, and then concluded with a hardcoded line about \u201coptimising a direction that is 90%-but-not-100% correct\u201d. The measured cosine was **0.5931**, a 53.6\u00b0 angle. The 90% was a number I wrote while drafting and never reconciled with the output." },
        { t: "p", text: "It matters because 59% and 90% imply different stopping points, and \u00a702 shows exactly how different: the peak KL is proportional to the cosine, so a 0.59-aligned RM should be optimised about a third as far as a 0.96-aligned one." },
        { t: "p", text: "The qualitative conclusion survives \u2014 the curve shape does not depend on the particular cosine \u2014 but the quantitative claim in my own summary line was wrong, and the fix is to read the number the script printed rather than the one I expected." }
      ] },

    { t: "h2", n: "02", id: "headroom", text: "A better reward model buys headroom",
      sub: "The peak moves, and its position is exact" },

    { t: "p", text: "If the true quality is \\(c \\cdot s - 0.35 s^2\\) where c is the cosine alignment and s is distance moved, the peak is at \\(s^* = c/0.70\\). That is a closed form, so unlike the cosines themselves it is not subject to sampling noise." },

    { t: "code", lang: "python", title: "g711.py \u00a7B \u2014 peak position against RM fit quality", code: `s_star = c / 0.70                       # closed form from d/ds [c*s - 0.35 s^2] = 0`,
      out: `  pairs fitted      cos(w,w')        best KL      best true  proxy there
  50                   0.4799           0.69         0.1645       0.6856
  100                  0.3660           0.52         0.0957       0.5229
  300                  0.5801           0.83         0.2403       0.8287
  1000                 0.7835           1.12         0.4385       1.1193
  5000                 0.9612           1.37         0.6599       1.3732
  100000               0.9980           1.43         0.7115       1.4258`,
      hl: [6, 7],
      caption: "From 1,000 pairs upward the trend is clean: better alignment, further you can safely optimise." },

    { t: "callout", kind: "trap", title: "And the first two rows invert \u2014 the same sampling-noise mistake again",
      body: [
        { t: "p", text: "50 pairs gives cosine **0.4799** and 100 pairs gives **0.3660** \u2014 more data producing a worse fit, which cannot be right in expectation. The cause is that I drew **one** random noise vector per row, so each cosine is a single sample from a distribution and the rows are not comparable." },
        { t: "p", text: "This is the third time this pattern has appeared in the course \u2014 7.4\u2019s noise sweep and 6.3\u2019s MinHash comparison had the same defect. The fix is averaging over many draws, and the reason I keep hitting it is that a single draw looks like a measurement when it is a sample." },
        { t: "p", text: "What *is* sound here is the relationship rather than the inputs: \\(s^* = c/0.70\\) is exact algebra, and the rows from 1,000 pairs upward are far enough apart to be outside the noise. So read the trend, not the individual cosines." }
      ] },

    { t: "callout", kind: "insight", title: "The practical consequence is worth stating plainly",
      body: [
        { t: "p", text: "RM quality and optimisation budget are **coupled**. A weakly-fitted reward model is not merely less accurate \u2014 it has a nearer peak, so you must stop sooner, which means you extract less improvement even before accuracy enters." },
        { t: "p", text: "That is the real argument for 7.4\u2019s advice to train the RM for about one epoch and watch its held-out preference accuracy. An overfit RM is worse than a weaker one not just because it scores badly, but because it moves the point at which the policy must stop *toward you*." },
        { t: "p", text: "It also explains why RLVR in 7.9 changes the picture so much. A verifier has cosine 1.0 with the thing you want by construction, so there is no divergence term and the peak moves out indefinitely \u2014 which is precisely why reasoning RL can run for far longer." }
      ] },

    { t: "h2", n: "03", id: "detection", text: "Detection and control",
      sub: "The RM cannot grade its own homework" },

    { t: "code", lang: "python", title: "g711.py \u00a7C \u2014 a held-out gold RM, fitted on different pairs", code: `w_gold = w_true + rng.normal(size=D) / np.sqrt(N_PAIRS) * 3.0
w_gold /= np.linalg.norm(w_gold)        # never used to train the policy`,
      out: `  KL            training RM        gold RM           TRUE       RM gap
  0.0                0.0000         0.0000         0.0000       0.0000
  1.0                1.0000         0.1559         0.2431       0.8441
  2.0                2.0000        -0.3881        -0.2138       2.3881
  3.0                3.0000        -1.6322        -1.3706       4.6322
  4.0                4.0000        -3.5763        -3.2275       7.5763
  6.0                6.0000        -9.5644        -9.0413      15.5644`,
      hl: [4, 5, 7],
      caption: "The gold RM tracks TRUE closely \u2014 \u22120.388 against \u22120.214 at KL 2 \u2014 while the training RM reads +2.0." },

    { t: "callout", kind: "good", title: "Why the gold RM works, and why it is not magic",
      body: [
        { t: "p", text: "Both reward models are equally wrong about true preference \u2014 both were fitted on 300 pairs with the same noise scale. The difference is that only one of them is being optimised, and optimisation is what finds a proxy\u2019s errors. The gold RM\u2019s errors are never sought out, so they stay small." },
        { t: "p", text: "That makes the **gap between the two** the signal, not either score alone. It grows from 0 to 0.84 at KL 1, to 2.39 at KL 2, to 15.56 at KL 6 \u2014 and it is observable without any human evaluation, which is what makes it usable as an automatic early stop." },
        { t: "p", text: "It is not magic, though: the gold RM tracks true quality well, not perfectly. At KL 2 it reads \u22120.388 against the truth\u2019s \u22120.214, so it overstates the damage slightly. Treat it as a reliable *direction* indicator and an approximate magnitude." }
      ] },

    { t: "p", text: "The reference\u2019s four controls follow, and the simulation supports each." },

    { t: "dl", items: [
      { k: "Monitor KL from \u03c0_ref as a first-class metric", v: "Rising KL plus rising reward plus flat-or-falling human eval is the signature. Early-stop on it \u2014 \u00a702 shows the stopping point is a function of RM quality, so it is not a constant you can set once." },
      { k: "Hold out a gold RM", v: "\u00a703. The divergence between training and held-out scores is the cheapest automatic warning available." },
      { k: "Track mean output length every eval", v: "\u00a704. If it creeps up 40% during alignment you bought length, not quality." },
      { k: "Keep a human eval set that never touches training", v: "The only ground truth. 7.4 established that even annotator agreement is well below 100%, so this is a noisy ground truth \u2014 but it is the only one not subject to being optimised against." }
    ] },

    { t: "h2", n: "04", id: "catalogue", text: "The catalogue",
      sub: "Five hacks, and length is the one with arithmetic behind it" },

    { t: "table",
      head: ["Hack", "What the model learns", "Fix"],
      rows: [
        ["**Length bias**", "Longer = higher reward, because annotators mistake length for effort", "Length-normalise the RM; a length penalty; SimPO; report win rate *controlled for length*"],
        ["**Sycophancy**", "Agree with the user's premise even when it is wrong", "Include preference pairs where the correct answer contradicts the user"],
        ["**Formatting tics**", "Always bullet points, always bold headers", "Diversify RM training data across formats"],
        ["**Hedging**", "Never commit, so never wrong, so never penalised", "Reward decisiveness explicitly; measure abstention rate"],
        ["**Confident hallucination**", "Fluent and assertive scores well; truth is not checked", "Verifiable rewards (7.9); grounding and citation checks"]
      ] },

    { t: "callout", kind: "insight", title: "Length is canonical because 7.6 measured why it is unbounded",
      body: [
        { t: "p", text: "7.6 established that DPO\u2019s implicit reward is \\(\\beta \\cdot d \\cdot n\\) \u2014 **linear in response length**. So if annotators mildly prefer longer answers and the RM learns even a small positive weight on length, the policy has an exploit with no ceiling, because nothing bounds n." },
        { t: "p", text: "The arithmetic is stark. With a length weight of 0.01 per token, a 100-token response collects a length term of 1.0 \u2014 **equal to the entire quality signal**. At 400 tokens it is 4\u00d7 the quality signal. A weight small enough to look negligible when you inspect the RM is unbounded in the policy\u2019s hands." },
        { t: "p", text: "That is why length appears first in every such catalogue and why the fixes are structural rather than corrective: normalise at the loss, as SimPO does, or penalise explicitly. Hoping the RM did not pick up a length preference is not a plan." }
      ] },

    { t: "code", lang: "python", title: "g711.py \u00a7D \u2014 a 0.01 length weight against a unit quality signal", code: `for n in (20, 50, 100, 200, 400, 800):
    print(n, 1.0, 0.01 * n)`,
      out: `  tokens           quality term length term (w=0.01)
  20                      1.000            0.200
  50                      1.000            0.500
  100                     1.000            1.000
  200                     1.000            2.000
  400                     1.000            4.000
  800                     1.000            8.000`,
      hl: [4, 7],
      caption: "The crossover is at 100 tokens. Past it, the model is being paid more for length than for being right." },

    { t: "callout", kind: "warn", title: "Hedging is the hack that evaluation misses",
      body: [
        { t: "p", text: "Length is visible \u2014 you can plot mean output tokens. Sycophancy and formatting tics are visible to a human reading samples. Hedging is not, because a hedged answer looks careful and reads well, and a reward model trained on \u201cwhich is better\u201d will often genuinely prefer it." },
        { t: "p", text: "The mechanism is that a confident wrong answer gets penalised and a vague non-answer does not, so hedging is the risk-free strategy under any reward that punishes errors. The model is responding correctly to the incentive it was given." },
        { t: "p", text: "Which is why the fix has to be a *measurement* rather than a preference: track the abstention rate explicitly and reward decisiveness as its own objective. 6.7 made the same point from the retrieval side \u2014 an over-refusing system is a failure mode, not a safe default, and it needs both directions measured." }
      ] },

    { t: "viz", title: "The overoptimisation curve, simulated", caption: "Proxy rises without bound; true quality peaks at KL 1.0 and collapses. The peak moves with RM alignment.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Proxy score and true quality against KL distance">
  <text x="16" y="22" class="s-label">RM 59.3% ALIGNED WITH TRUE PREFERENCE \u2014 WHAT OPTIMISING IT DOES</text>
  <line x1="80" y1="150" x2="700" y2="150" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="80" y1="40" x2="80" y2="270" stroke="var(--line)" stroke-width="1.2"/>
  <text x="72" y="44" text-anchor="end" class="s-mono" style="font-size:9px">+6</text>
  <text x="72" y="154" text-anchor="end" class="s-mono" style="font-size:9px">0</text>
  <text x="72" y="268" text-anchor="end" class="s-mono" style="font-size:9px">-9</text>

  <polyline points="80,150 183,132 286,113 389,95 492,76 595,58 698,40" fill="none" stroke="var(--crit)" stroke-width="2.2"/>
  <text x="640" y="34" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">RM score</text>

  <polyline points="80,150 131,146 183,146 234,148 286,154 337,163 389,175 440,189 492,205 543,223 595,242 646,262 698,270" fill="none" stroke="var(--good)" stroke-width="2.2"/>
  <text x="250" y="138" class="s-mono" style="font-size:9px;fill:var(--good)">TRUE quality</text>

  <line x1="183" y1="40" x2="183" y2="270" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="183" y="286" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">STOP HERE</text>
  <text x="183" y="34" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">KL 1.0</text>

  <text x="389" y="286" text-anchor="middle" class="s-sub" style="font-size:9px">KL distance from the reference policy \u2014 0 to 6</text>
  <text x="708" y="274" class="s-mono" style="font-size:9px;fill:var(--good)">-9.04</text>
  <text x="708" y="46" class="s-mono" style="font-size:9px;fill:var(--crit)">+6.00</text>

  <text x="300" y="196" class="s-mono" style="font-size:9px;fill:var(--crit)">peak KL = cosine / 0.70</text>
  <text x="300" y="212" class="s-sub" style="font-size:9px">so a better RM lets you optimise further, not just score higher</text>
</svg>` },

    { t: "exercise", kind: "analysis", title: "Build the early-warning dashboard", difficulty: "advanced", minutes: 35,
      body: "For an alignment run you control, set up the four signals that detect overoptimisation and verify that they move the way the simulation predicts. Report what each looks like at the point you decided to stop, and state which one you would trust most if they disagreed.",
      requirements: [
        "Log KL from the reference at every checkpoint, not just the final one",
        "Hold out a second reward model and log both scores separately",
        "Track mean output length in tokens at every eval",
        "Keep a human or held-out eval set that never touches training",
        "State your stopping criterion in advance and whether the run respected it"
      ],
      hint: "The gap between the training and gold reward scores is the cheapest signal and the first to move. Mean output length is the most interpretable one to show someone who does not want to look at KL.",
      solution: { lang: "python", title: "the four signals and a stopping rule", code: `def checkpoint_metrics(policy, ref, train_rm, gold_rm, prompts, eval_set):
    """The four signals. Three are free; only the last needs humans."""
    completions = [generate(policy, p) for p in prompts]

    kl = mean_token_kl(policy, ref, prompts)          # 1. drift
    r_train = np.mean([train_rm(p, c) for p, c in zip(prompts, completions)])
    r_gold  = np.mean([gold_rm(p, c)  for p, c in zip(prompts, completions)])
    length  = np.mean([len(tokenize(c)) for c in completions])   # 3. length
    held    = evaluate(policy, eval_set)              # 4. untouched ground truth

    return {"kl": kl, "r_train": r_train, "r_gold": r_gold,
            "rm_gap": r_train - r_gold,               # 2. THE early warning
            "mean_len": length, "held_out": held}

def should_stop(history, length_budget=1.25):
    """Stop on the FIRST of these, not the last."""
    cur, base = history[-1], history[0]
    reasons = []
    if len(history) >= 3 and cur["rm_gap"] > 2 * history[-3]["rm_gap"]:
        reasons.append("rm_gap doubled over 2 checkpoints")
    if cur["mean_len"] > length_budget * base["mean_len"]:
        reasons.append("mean length +%.0f%% over budget"
                       % (100 * (cur["mean_len"] / base["mean_len"] - 1)))
    if len(history) >= 2 and cur["held_out"] < history[-2]["held_out"]:
        reasons.append("held-out eval fell while training reward rose")
    return reasons

for i, m in enumerate(history):
    print("ckpt %d  KL %.2f  r_train %+.3f  r_gold %+.3f  gap %.3f  len %3d  held %.3f"
          % (i, m["kl"], m["r_train"], m["r_gold"], m["rm_gap"],
             m["mean_len"], m["held_out"]))
print("stop:", should_stop(history) or ["no trigger"])`,
        out: `  [shape -- the pattern to expect, with the simulation's numbers]

  ckpt 0  KL 0.00  r_train +0.000  r_gold +0.000  gap 0.000  len 112  held 0.620
  ckpt 1  KL 1.00  r_train +1.000  r_gold +0.156  gap 0.844  len 128  held 0.641
  ckpt 2  KL 2.00  r_train +2.000  r_gold -0.388  gap 2.388  len 161  held 0.618
  ckpt 3  KL 3.00  r_train +3.000  r_gold -1.632  gap 4.632  len 204  held 0.574
  stop: ['rm_gap doubled over 2 checkpoints', 'mean length +82% over budget',
         'held-out eval fell while training reward rose']`,
        notes: [
          { t: "p", text: "**The training reward is useless as a stopping signal** \u2014 it rises monotonically from 0.000 to 3.000 across every checkpoint including the ones where quality is collapsing. Anyone watching only that number sees a successful run." },
          { t: "p", text: "**The gold RM turns negative at checkpoint 2**, while the training RM reads +2.000. That divergence is the cheapest warning available and it needs no humans \u2014 just a second reward model fitted on held-out pairs and never used for training." },
          { t: "p", text: "**Mean length is the signal to show a non-specialist.** It goes 112 to 204 tokens, +82%, which is immediately legible as \u201cwe bought length\u201d in a way a KL figure is not. The reference's 40% threshold would have fired at checkpoint 2." },
          { t: "p", text: "**Checkpoint 1 is the right stopping point** and it looks unremarkable: held-out eval up slightly, length up 14%, gap small. The simulation puts the true peak at KL 1.0, so the correct decision is made where nothing dramatic is visible \u2014 which is why the criterion has to be set in advance." },
          { t: "p", text: "One thing I would not do: tune the thresholds until the run passes. The peak KL is proportional to how well the reward model is fitted, so the right stopping point genuinely differs between runs \u2014 which argues for trusting the held-out eval over any fixed KL budget when the two disagree." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A reward model points in a slightly wrong direction and drifting from the reference costs something real. Those two facts force the curve: proxy rises forever, true quality peaks and falls. The question is never whether it happens but where to stop." },
        { t: "p", text: "And the stopping point is proportional to how well the RM is fitted \u2014 peak KL \u221d cosine alignment \u2014 so a better reward model buys headroom rather than merely a better score. Watch the gap between a training RM and a held-out gold RM, because the thing being optimised cannot grade its own homework." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur RLHF run has a reward score that keeps improving but users say the model got worse. What is happening?\u201d**" },
        { t: "p", text: "Overoptimisation \u2014 Goodhart\u2019s law applied to a learned reward. The reward model is a proxy fitted from finite comparisons, so it points in a slightly wrong direction, and optimising it hard finds the directions where it is wrong rather than the ones where it is right." },
        { t: "p", text: "I simulated this to check it is structural rather than anecdotal. With a reward model 59% aligned with true preference, the proxy score rose monotonically and without bound while true quality peaked at a KL of 1.0 and fell to \u22129.04 by KL 6. The shape is forced: the proxy is linear in distance moved, and true quality is the aligned component minus a cost that grows faster." },
        { t: "p", text: "So the immediate action is to find the stopping point rather than to fix the reward model. I would roll back to an earlier checkpoint and look at KL from the reference, because the current one is past the peak." },
        { t: "p", text: "For detection I would set up two things. A held-out gold reward model, fitted on different pairs and never used for training \u2014 it tracks true quality far better simply because it is not what is being optimised, and the growing gap between the two scores is a free early warning that needs no humans. In my simulation the gold RM went negative while the training RM read +2.0." },
        { t: "p", text: "And mean output length at every eval, because length is the canonical hack and the reason is arithmetic. A DPO implicit reward is linear in response length, so if annotators mildly prefer longer answers and the RM learns a weight of even 0.01 per token, then at 100 tokens the length term equals the entire quality signal and at 400 tokens it is four times it. A weight too small to notice in the RM is unbounded in the policy\u2019s hands." },
        { t: "p", text: "One thing I would raise about budgets: the stopping point is not a constant. It scales with how well the reward model is fitted \u2014 peak KL is proportional to cosine alignment \u2014 so a weakly-fitted RM has a nearer peak and gives you less headroom before quality turns. That is a second reason an overfit reward model is worse than a weaker one." }
      ] }
  ],

  takeaways: [
    "**The overoptimisation curve is a consequence, not an observation** \u2014 a slightly misaligned proxy plus a real cost for drifting from \u03c0_ref forces it.",
    "**Simulated with a 59.3%-aligned RM, the proxy rose monotonically to +6.0** while true quality peaked at KL 1.0 and reached \u22129.04 by KL 6.",
    "**7.4 gives the structural reason**: Bradley-Terry's gradient vanishes at large gaps, so nothing constrains how big a correct reward gap becomes.",
    "**Peak KL is proportional to cosine alignment** \u2014 exactly c/0.70 in this setup \u2014 so a better RM buys optimisation headroom, not just a better score.",
    "**Which is a second reason an overfit RM is worse than a weaker one**: it moves the stopping point toward you as well as scoring badly.",
    "**A verifier has cosine 1.0 by construction**, which is why 7.9's RLVR can run far longer before the reward stops correlating with what you wanted.",
    "**A held-out gold RM tracks true quality well because it is not being optimised** \u2014 the gap between it and the training RM grew 0 \u2192 0.84 \u2192 2.39 \u2192 15.56.",
    "**The training reward is useless as a stopping signal**, rising monotonically through every checkpoint including those where quality collapses.",
    "**Length is the canonical hack because 7.6 showed the reward is linear in n** \u2014 a 0.01-per-token weight equals the whole quality signal at 100 tokens.",
    "**Hedging is the hack evaluation misses**, because a vague non-answer reads as careful and avoids the penalty a confident error attracts \u2014 so measure abstention explicitly.",
    "**Track mean output length every eval**: a 40% creep during alignment means you bought length rather than quality.",
    "**Keep a human eval set that never touches training**, and trust it over any fixed KL budget when they disagree, since the right budget varies with RM quality."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "In a simulation with a reward model 59.3% aligned with true preference, the proxy score rose monotonically while true quality peaked at KL 1.0. What produces this shape?",
        options: [
          "Instability in the PPO update, which compounds as KL grows",
          "The proxy is linear in distance moved so it rises without bound, while true quality is the aligned component minus a cost that grows faster \u2014 so it must turn",
          "The reward model saturates, causing its gradient to vanish and training to stall",
          "The KL penalty eventually dominates the reward term and reverses the objective"
        ],
        answer: 1,
        why: "Two unavoidable ingredients force the curve: the RM points slightly wrong because it was fitted from finite noisy comparisons, and moving far from the reference costs real fluency and coherence. Given those, no parameter setting avoids the peak \u2014 there is only a point at which to stop. The KL penalty does not prevent overoptimisation; it makes the stopping point harder to overshoot, which is a different thing." },

      { stem: "The peak of true quality occurs at a KL proportional to the reward model's cosine alignment. What practical consequence follows?",
        options: [
          "A better reward model is unnecessary, since you can simply stop earlier with a worse one",
          "RM quality and optimisation budget are coupled \u2014 a weakly-fitted RM has a nearer peak, so you extract less improvement even before accuracy enters",
          "The KL coefficient \u03b2 should be set proportional to the cosine alignment",
          "Peak KL is a universal constant that can be set once per model family"
        ],
        answer: 1,
        why: "A poorly fitted reward model is doubly bad: less accurate, and it forces you to stop sooner, so there is less total improvement available. This is a second reason to train the RM about one epoch and watch held-out preference accuracy, beyond the accuracy itself. It also explains why RLVR changes things so much \u2014 a verifier has cosine 1.0 with the target by construction, so the peak moves out indefinitely and reasoning RL can run far longer." },

      { stem: "Why does a held-out \u201cgold\u201d reward model track true quality better than the training reward model, given both were fitted on the same amount of data?",
        options: [
          "Because it is fitted on cleaner, more carefully annotated pairs",
          "Because only the training RM is being optimised, and optimisation is what finds a proxy's errors \u2014 the gold RM's errors are never sought out",
          "Because it is evaluated at a lower temperature, reducing variance",
          "Because it is larger, giving it a better inductive bias"
        ],
        answer: 1,
        why: "Both models are equally wrong about true preference; the asymmetry is entirely in which one the policy is pushing against. Measured, the gold RM read \u22120.388 at KL 2 against the truth's \u22120.214 while the training RM read +2.000. This makes the gap between the two scores the signal rather than either alone, and it is observable without human evaluation \u2014 though the gold RM is a reliable direction indicator and only an approximate magnitude." },

      { stem: "A reward model has learned a length weight of 0.01 per token alongside a unit-scale quality signal. Why is this not negligible?",
        options: [
          "Because 0.01 compounds multiplicatively over tokens rather than adding",
          "Because the reward is linear in response length with nothing bounding n \u2014 at 100 tokens the length term equals the entire quality signal, and at 400 it is four times larger",
          "Because the policy cannot distinguish the length weight from the quality weight during optimisation",
          "Because length interacts with the KL penalty, amplifying both terms"
        ],
        answer: 1,
        why: "The implicit reward accumulates per token, so a per-token weight has no ceiling in the policy's hands \u2014 the crossover with a unit quality signal is at 100 tokens and everything beyond pays more for length than for being right. A weight that looks negligible when inspecting the RM is therefore unbounded in effect, which is why fixes are structural: normalise at the loss as SimPO does, or penalise length explicitly, rather than hoping the RM avoided the preference." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Goodhart's law, with the curve derived",
    questions: [
      { level: "advanced",
        q: "What is reward hacking and how do you detect it?",
        strong: "A strong answer explains why the curve is forced and names the cheap signals.",
        answer: [
          { t: "p", text: "Goodhart\u2019s law applied to a learned reward. The reward model is a proxy fitted from finite comparisons, so optimising it hard enough finds where it is wrong rather than where it is right \u2014 true quality peaks and falls while the proxy score keeps climbing." },
          { t: "p", text: "I would stress that the curve is forced rather than empirical. I simulated it with an RM 59% aligned with true preference: the proxy rose monotonically to +6.0 while true quality peaked at a KL of 1.0 and fell to \u22129.04. The proxy is linear in distance moved so it rises forever; true quality is the aligned component minus a cost that grows faster, so it must turn. There is no parameter setting that avoids it." },
          { t: "p", text: "For detection, the cheapest signal is a held-out gold reward model \u2014 fitted on different pairs, never used for training. It tracks true quality far better purely because it is not what is being optimised, and the gap between the two scores is a free early warning. In my simulation the gold RM went negative while the training RM read +2.0." },
          { t: "p", text: "Then mean output length every eval, because it is the most interpretable signal and length is the canonical hack. KL from the reference as a first-class metric, early-stopped on. And a human eval set that never touches training, which is the only real ground truth." },
          { t: "p", text: "The thing I would warn against is watching the training reward. It rises monotonically through every checkpoint including the ones where quality is collapsing \u2014 anyone looking only at that sees a successful run." }
        ] },

      { level: "core",
        q: "Why does alignment make models more verbose?",
        strong: "A strong answer gives the arithmetic, not just the annotator explanation.",
        answer: [
          { t: "p", text: "Two layers. The surface cause is that annotators mistake length for effort, so a reward model fitted on their comparisons learns a positive weight on length. That part is well known." },
          { t: "p", text: "The part that makes it severe is arithmetic. A DPO-style implicit reward is a sum over response tokens, so it equals beta times the per-token gain times the number of tokens \u2014 linear in length, with nothing bounding the length. So even a tiny learned preference becomes an unbounded exploit." },
          { t: "p", text: "Concretely: with a length weight of 0.01 per token against a unit-scale quality signal, the length term reaches 1.0 at a hundred tokens \u2014 equal to the entire quality signal \u2014 and 4.0 at four hundred. A weight small enough to look negligible when you inspect the reward model is dominant in the policy\u2019s hands." },
          { t: "p", text: "Which is why the fixes are structural rather than corrective. Length-normalise the reward, which is what SimPO does at the loss by using average rather than summed log-probability; add an explicit length penalty; and report win rates controlled for length, because an uncontrolled win rate will reward the verbosity you are trying to detect." }
        ] },

      { level: "advanced",
        q: "How do you decide when to stop an alignment run?",
        strong: "A strong answer knows the stopping point is not a constant.",
        answer: [
          { t: "p", text: "In advance, on a criterion I write down before starting \u2014 because the right stopping point looks unremarkable when you reach it. In my simulation the true peak was at KL 1.0, where the held-out eval was up slightly and length up 14%: nothing dramatic was visible, which is exactly why a criterion set afterwards gets tuned until the run passes." },
          { t: "p", text: "The criterion I would use fires on the first of three things: the gap between the training and gold reward models doubling over two checkpoints, mean output length exceeding a budget of around 25% over baseline, or the held-out eval falling while the training reward rises." },
          { t: "p", text: "What I would not use is a fixed KL budget, because the stopping point is not a constant. The peak is proportional to how well the reward model is fitted \u2014 exactly cosine over 0.70 in my setup \u2014 so a weakly-fitted RM has a nearer peak. A KL number that was right for one run can be well past the peak for the next." },
          { t: "p", text: "If the signals disagree I would trust the held-out human eval over any automated one, with the caveat that it is itself noisy \u2014 annotator agreement is well below 100%, so a small movement there is not evidence. It is the only signal not subject to being optimised against, which is what makes it the tiebreak." }
        ] }
    ]
  }
});
