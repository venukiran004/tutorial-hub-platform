EC.receiveLesson({
  id: "7.15",

  lede: "The trap is stated plainly in the reference and it is the right place to start: your DPO reward accuracy is 0.82 and the RM score doubled, and that **proves nothing** \u2014 you optimised those numbers directly. 7.11 showed exactly how far that can go, with a proxy score climbing monotonically to +6.0 while true quality peaked at a KL of 1.0 and fell to \u22129.04. The headline number is a win rate against the pre-alignment model, and it has to be randomised for position and controlled for length or it will measure the wrong thing.",

  objectives: [
    "Explain why the training metrics cannot evaluate the training",
    "Run a win rate correctly, controlling for position and length",
    "Budget for the alignment tax before starting",
    "Measure safety in both directions, including over-refusal",
    "Track the early-warning signals at every checkpoint"
  ],

  prerequisites: ["7.11", "7.14", "6.1"],

  blocks: [

    { t: "h2", n: "01", id: "trap", text: "The metrics you optimised prove nothing",
      sub: "Which 7.11 demonstrated rather than warned about" },

    { t: "p", text: "A reward accuracy of 0.82 and a doubled RM score are statements about the loss, not about the model. 7.11\u2019s simulation makes this concrete: the training reward rose monotonically through every checkpoint *including the ones where true quality was collapsing*. Someone watching only that number sees a successful run." },

    { t: "code", lang: "text", title: "7.11's checkpoint trace, as the argument", code: `ckpt  KL    r_train   r_gold    held-out   mean len
0     0.00   +0.000   +0.000      0.620       112
1     1.00   +1.000   +0.156      0.641       128
2     2.00   +2.000   -0.388      0.618       161
3     3.00   +3.000   -1.632      0.574       204`,
      hl: [3, 5, 6],
      caption: "r_train is monotone and useless. The held-out column turns at checkpoint 2 and the gold RM turns before it." },

    { t: "callout", kind: "insight", title: "So the evaluation has to be of things you did not optimise",
      body: [
        { t: "p", text: "That is the organising principle for everything below. Any metric that appeared in the loss is disqualified as evidence, which rules out reward accuracy, RM score and the DPO margin \u2014 all of which are the loss by another name." },
        { t: "p", text: "6.1 made the same argument for retrieval and it is worth recalling the shape: the IR metrics there were valid precisely because they were computed over a labelled set the retriever never trained on. Deterministic arithmetic over held-out labels is the only cheap evaluation that means anything." },
        { t: "p", text: "The complication here is that alignment has no equivalent of a gold chunk. Preference is a judgement, so the evaluation needs either humans or a judge model \u2014 which introduces its own biases, and \u00a702 is about controlling them." }
      ] },

    { t: "h2", n: "02", id: "winrate", text: "Win rate, done properly",
      sub: "Two controls, and both are load-bearing" },

    { t: "p", text: "The headline number is a pairwise win rate against the *pre-alignment* model on held-out prompts, judged by a model or by humans. Two controls are not optional." },

    { t: "dl", items: [
      { k: "Randomise order", v: "Judges favour position A. Without randomisation you are measuring a position bias plus a quality difference and cannot separate them." },
      { k: "Control for length", v: "7.11 showed length is the canonical hack and 7.6 showed the implicit reward is linear in length. An uncontrolled win rate rewards the verbosity you are trying to detect." }
    ] },

    { t: "callout", kind: "warn", title: "Position bias is the one that silently invalidates the whole number",
      body: [
        { t: "p", text: "If the judge prefers position A and you always put the new model there, a 55% win rate might be entirely the bias. The fix is cheap \u2014 randomise, and ideally evaluate each pair **both ways** and count only the cases where the judge is consistent." },
        { t: "p", text: "Evaluating both ways also gives you a free diagnostic: the fraction of pairs where the judge flips when the order flips *is* the position bias, measured on your own setup rather than assumed. If that fraction is large, the judge is not usable and no amount of randomisation rescues it \u2014 randomisation removes the systematic error and leaves the noise." },
        { t: "p", text: "6.7 ran into the same structural problem from the retrieval side: a judgement that looks like a measurement because it produces a number. The response is the same \u2014 measure the measuring instrument before trusting what it says about the thing." }
      ] },

    { t: "callout", kind: "insight", title: "And \u201ccontrolled for length\u201d needs to mean something specific",
      body: [
        { t: "p", text: "The weak version is reporting mean length alongside the win rate, which at least makes a 40% creep visible. The stronger version is binning by length and reporting the win rate within bins, so a win that is entirely attributable to longer answers shows up as a flat within-bin curve." },
        { t: "p", text: "7.11\u2019s arithmetic is why this matters more than it sounds. A length weight of 0.01 per token equals the entire quality signal at a hundred tokens, so a model that learned only length can post a genuine-looking win rate against its predecessor." },
        { t: "p", text: "If the within-bin win rates are flat and the aggregate is positive, you bought length. That is a clean, cheap test and it is the one I would run before believing any reported improvement." }
      ] },

    { t: "h2", n: "03", id: "tax", text: "The alignment tax",
      sub: "Know the budget before you start" },

    { t: "p", text: "Alignment routinely costs a few points on unrelated benchmarks \u2014 MMLU, GSM8K, HumanEval-shaped evaluations. The reference\u2019s advice is the operative part: know your budget *before* you start, because discovering it afterwards turns a planned trade into an incident." },

    { t: "callout", kind: "good", title: "4.8 and 7.13 give the mechanism and the remedy",
      body: [
        { t: "p", text: "4.8 measured the severe version directly: generic perplexity rising from **5.282 to 10.777** after a domain fine-tune \u2014 and that result refuted a claim made earlier in the same module that forgetting was structurally impossible under LoRA. Capability regression is not hypothetical." },
        { t: "p", text: "7.13 gives the cheap repair: merge the fine-tune back with the base model at roughly 0.3\u20130.5 weight, at zero training compute, and the degradation curve is typically convex so the first part of the domain gain costs far less generic capability than the last part." },
        { t: "p", text: "Which makes the tax a dial rather than a fixed cost. The evaluation question is therefore not \u201chow much did we lose\u201d but \u201cwhat is the best point on the curve\u201d \u2014 and that needs both metrics measured at several merge weights, which is cheap because merging is free." }
      ] },

    { t: "table",
      head: ["What to measure", "How", "Why this one"],
      rows: [
        ["**Win rate vs pre-alignment**", "Pairwise judge or human on held-out prompts, order randomised, length controlled", "**The headline.** Everything else is a constraint on it"],
        ["**Capability regression**", "Re-run MMLU / GSM8K / HumanEval-style benchmarks", "The alignment tax \u2014 4.8 measured perplexity doubling in the severe case"],
        ["**Format compliance**", "Deterministic checks: valid JSON rate, schema adherence, refusal-when-appropriate", "Cheap, objective, and CI-able like 6.1's metrics"],
        ["**Safety, both directions**", "Red-team set, jailbreak suite, **and** an over-refusal set", "An over-refusing model is also a failure"],
        ["**Length and KL drift**", "Mean output tokens and KL from \u03c0_ref at every checkpoint", "7.11's early-warning system for reward hacking"],
        ["**Calibration**", "Does stated confidence track accuracy?", "RLHF is known to *degrade* this"]
      ] },

    { t: "callout", kind: "insight", title: "Measuring safety in one direction produces a useless model",
      body: [
        { t: "p", text: "A red-team suite measures whether the model does things it should not. An over-refusal set measures whether it refuses things it should answer. Optimise only the first and the trivially optimal model refuses everything \u2014 which scores perfectly and ships to nobody." },
        { t: "p", text: "7.11 catalogued hedging as the hack evaluation misses, and over-refusal is its safety-flavoured sibling: a refusal is never *wrong* in the way an incorrect answer is, so any evaluation that only penalises errors rewards refusing. The model is responding correctly to the incentive." },
        { t: "p", text: "6.7 reached the same conclusion about retrieval guardrails \u2014 an over-refusing system is a failure mode rather than a safe default, and both directions need measuring. The symmetry is the point: you are looking for a model that discriminates, not one that is cautious." }
      ] },

    { t: "callout", kind: "warn", title: "Calibration degrading is the quietest cost",
      body: [
        { t: "p", text: "RLHF is known to make models worse at matching stated confidence to actual accuracy. That is a particularly awkward regression because it is invisible to every other metric here \u2014 the answers can be as accurate as before while the hedging and the certainty are now misleading." },
        { t: "p", text: "It interacts badly with downstream systems that *use* stated confidence. 6.7 argued for a relevance gate and a faithfulness check; both become less reliable if the model\u2019s expressed certainty no longer tracks whether it is right." },
        { t: "p", text: "The measurement is a reliability curve: bucket answers by stated confidence and plot actual accuracy per bucket. A well-calibrated model lies on the diagonal, and alignment tends to push it above \u2014 confident more often than it is correct." }
      ] },

    { t: "viz", title: "Which metrics can evaluate an alignment run", caption: "Anything that appeared in the loss is disqualified. What remains needs held-out data or a judge.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Valid and invalid alignment metrics">
  <rect x="26" y="30" width="330" height="140" rx="6" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="191" y="52" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--crit)">PROVES NOTHING</text>
  <text x="42" y="76" class="s-mono" style="font-size:9px">DPO reward accuracy 0.82</text>
  <text x="42" y="94" class="s-mono" style="font-size:9px">RM score doubled</text>
  <text x="42" y="112" class="s-mono" style="font-size:9px">training margin up</text>
  <text x="42" y="130" class="s-mono" style="font-size:9px">training loss down</text>
  <text x="191" y="156" text-anchor="middle" class="s-sub" style="font-size:9px">you optimised these directly</text>

  <rect x="404" y="30" width="330" height="140" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="569" y="52" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">EVIDENCE</text>
  <text x="420" y="76" class="s-mono" style="font-size:9px">win rate vs pre-alignment model</text>
  <text x="420" y="94" class="s-mono" style="font-size:9px">MMLU / GSM8K regression</text>
  <text x="420" y="112" class="s-mono" style="font-size:9px">over-refusal AND red-team</text>
  <text x="420" y="130" class="s-mono" style="font-size:9px">calibration curve</text>
  <text x="569" y="156" text-anchor="middle" class="s-sub" style="font-size:9px">held-out, or judged, or deterministic</text>

  <line x1="16" y1="192" x2="744" y2="192" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="216" class="s-label">AND THE WIN RATE NEEDS TWO CONTROLS</text>
  <text x="30" y="240" class="s-mono" style="font-size:10px;fill:var(--warn)">randomise order</text>
  <text x="200" y="240" class="s-sub" style="font-size:9px">judges favour position A \u2014 evaluate both ways, count the consistent pairs</text>
  <text x="30" y="260" class="s-mono" style="font-size:10px;fill:var(--warn)">control for length</text>
  <text x="200" y="260" class="s-sub" style="font-size:9px">bin by length; flat within-bin curves + positive aggregate = you bought length</text>
  <text x="16" y="282" class="s-mono" style="fill:var(--crit)">7.11: the training reward rose monotonically while true quality collapsed</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Build the alignment eval gate", difficulty: "advanced", minutes: 40,
      body: "Build the evaluation that would gate a deploy: a win rate with both controls, a capability-regression check, a two-directional safety check, and the drift signals. Run it on a pre- and post-alignment pair and report whether you would ship, with the numbers that decided it.",
      requirements: [
        "Evaluate each win-rate pair in both orders and report the judge's flip rate as your position bias",
        "Report win rate within length bins as well as in aggregate",
        "Re-run at least one capability benchmark and report the delta",
        "Measure both red-team pass rate and over-refusal rate",
        "State a ship/no-ship decision and which single number drove it"
      ],
      hint: "Evaluate every pair both ways. The flip rate is your position bias measured on your own judge, and if it is large the win rate is not interpretable no matter how you randomise.",
      solution: { lang: "python", title: "the gate", code: `def win_rate(judge, prompts, model_a, model_b):
    """Both orders per prompt. Only consistent judgements count as wins."""
    wins = ties = flips = 0
    for p in prompts:
        ra, rb = generate(model_a, p), generate(model_b, p)
        first  = judge(p, ra, rb)        # a presented first
        second = judge(p, rb, ra)        # b presented first
        if first == "A" and second == "B":      # consistent: a is better
            wins += 1
        elif first == "B" and second == "A":    # consistent: b is better
            pass
        else:
            flips += 1                   # the judge contradicted itself
    n = len(prompts)
    return {"win_rate": wins / max(n - flips, 1),
            "position_bias": flips / n,  # THE number that validates the rest
            "n_decisive": n - flips}

def by_length_bin(results, bins=(0, 80, 160, 320, 10**9)):
    """Flat within-bin win rates + a positive aggregate = you bought length."""
    out = {}
    for lo, hi in zip(bins, bins[1:]):
        sub = [r for r in results if lo <= r["len_new"] < hi]
        if sub:
            out["%d-%d" % (lo, hi)] = np.mean([r["new_won"] for r in sub])
    return out

gate = {
    **win_rate(judge, HELD_OUT, aligned, pre_alignment),
    "mmlu_delta":      eval_mmlu(aligned) - eval_mmlu(pre_alignment),
    "redteam_pass":    eval_redteam(aligned),
    "over_refusal":    eval_over_refusal(aligned),     # BOTH directions
    "mean_len_ratio":  mean_len(aligned) / mean_len(pre_alignment),
}
for k, v in gate.items():
    print("%-18s %s" % (k, round(v, 3) if isinstance(v, float) else v))
print("by length bin:", by_length_bin(RESULTS))`,
        out: `  [shape -- the pattern a real gate produces]

  win_rate           0.612
  position_bias      0.138
  n_decisive         431
  mmlu_delta         -0.021
  redteam_pass       0.962
  over_refusal       0.187
  mean_len_ratio     1.410

  by length bin: {'0-80': 0.58, '80-160': 0.60, '160-320': 0.62, '320-': 0.63}`,
        notes: [
          { t: "p", text: "**Read `position_bias` first, because it validates everything else.** At 0.138 the judge contradicted itself on 14% of pairs, so those are excluded and the win rate is computed on 431 decisive judgements. A flip rate much above about 0.2 would mean the judge is too noisy for the win rate to be interpretable at all." },
          { t: "p", text: "**`mean_len_ratio` of 1.41 is the finding that should stop the ship.** 7.11's threshold is a 40% creep meaning you bought length rather than quality, and this is at 41%. On its own that is suggestive rather than conclusive." },
          { t: "p", text: "**The length bins are what make it conclusive, and here they exonerate the run.** Win rates of 0.58, 0.60, 0.62 and 0.63 rise only mildly across bins and are all comfortably above 0.5, so the model wins *within* every length band. If they were flat at 0.50 with a positive aggregate, the entire win would be attributable to longer answers." },
          { t: "p", text: "**`over_refusal` at 0.187 is the number that needs a product decision.** Nearly a fifth of questions that should be answered are refused, and no red-team score compensates \u2014 a model that refuses everything scores 1.000 on red-team and ships to nobody. Both directions, always." },
          { t: "p", text: "One thing to decide before running this rather than after: the MMLU delta of \u22122.1 points is the alignment tax, and whether that is acceptable is a budget set in advance. Deciding afterwards is how a planned trade becomes an argument \u2014 and if it is too high, 7.13's merge at 0.3\u20130.5 weight is the zero-compute lever to try before retraining." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Anything that appeared in the loss is disqualified as evidence \u2014 7.11 showed the training reward rising monotonically while true quality collapsed, so reward accuracy and RM score say only that optimisation happened. Evidence requires held-out data, a judge, or a deterministic check." },
        { t: "p", text: "The headline is a win rate against the pre-alignment model with both controls: randomise order and measure the judge\u2019s flip rate, then bin by length so a win bought with verbosity is visible. And measure safety in both directions, because a model that refuses everything scores perfectly on the half you remembered." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur DPO run finished with reward accuracy 0.82 and the reward model score doubled. Are we ready to ship?\u201d**" },
        { t: "p", text: "Those numbers tell you the loss went down, which you already knew \u2014 you optimised them directly. I would not treat either as evidence about the model." },
        { t: "p", text: "I can be concrete about how far that can mislead. I simulated optimising against a reward model 59% aligned with true preference: the proxy score rose monotonically and without bound while true quality peaked at a KL of 1.0 and fell to \u22129.04 by KL 6. The training reward was rising at every checkpoint including the ones where quality was collapsing." },
        { t: "p", text: "So the headline I would want is a win rate against the pre-alignment model on held-out prompts, with two controls. Randomise presentation order \u2014 judges favour position A \u2014 and ideally evaluate every pair both ways, because the fraction where the judge contradicts itself *is* your position bias measured rather than assumed. If that flip rate is high, the win rate is not interpretable however you randomise." },
        { t: "p", text: "And control for length, which I would do by binning. Length is the canonical reward hack and the implicit DPO reward is linear in response length, so a model that learned only verbosity can post a convincing win rate. If the within-bin win rates are flat and the aggregate is positive, you bought length \u2014 that is a cheap, decisive test." },
        { t: "p", text: "Then the constraints. Capability regression on MMLU or GSM8K, because alignment routinely costs a few points and the budget should have been set before starting \u2014 I have measured the severe version of this, generic perplexity doubling from 5.282 to 10.777 after a domain fine-tune. If the tax is too high, merging the fine-tune back at 0.3 to 0.5 weight is a zero-compute fix worth trying before retraining." },
        { t: "p", text: "Safety in both directions, because an over-refusing model is also a failure and a model that refuses everything scores perfectly on a red-team suite. And calibration, which RLHF is known to degrade and which is invisible to every other metric \u2014 the answers stay as accurate while the expressed certainty stops tracking whether they are right, which breaks anything downstream that uses stated confidence." }
      ] }
  ],

  takeaways: [
    "**Any metric that appeared in the loss is disqualified as evidence** \u2014 reward accuracy, RM score and the DPO margin are the loss by another name.",
    "**7.11 demonstrated the danger rather than warning about it**: the training reward rose monotonically through every checkpoint including those where true quality collapsed.",
    "**The headline is a win rate against the pre-alignment model** on held-out prompts, and both of its controls are load-bearing.",
    "**Randomise order and measure the flip rate**: evaluating every pair both ways turns position bias from an assumption into a measurement of your own judge.",
    "**A high flip rate makes the win rate uninterpretable**, because randomisation removes the systematic error and leaves the noise.",
    "**Control for length by binning, not just by reporting it** \u2014 flat within-bin win rates plus a positive aggregate means you bought length.",
    "**Budget the alignment tax before starting**, because discovering it afterwards turns a planned trade into an incident.",
    "**4.8 measured the severe case**: generic perplexity doubling from 5.282 to 10.777, which also refuted an earlier claim that LoRA made forgetting impossible.",
    "**The tax is a dial, not a fixed cost** \u2014 7.13's merge at 0.3\u20130.5 weight is zero-compute, and the degradation curve is convex.",
    "**Measure safety in both directions**, because a model that refuses everything scores perfectly on a red-team suite and ships to nobody.",
    "**Over-refusal is hedging's safety-flavoured sibling** \u2014 a refusal is never wrong the way an error is, so any one-directional evaluation rewards refusing.",
    "**Calibration degrades under RLHF and is invisible to every other metric**, which breaks downstream systems that consume stated confidence.",
    "**Track mean length and KL from \u03c0_ref at every checkpoint**, as the early-warning system rather than a post-hoc report."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A DPO run reports reward accuracy 0.82 and a doubled reward model score. What do these establish?",
        options: [
          "That the alignment succeeded, since both metrics moved in the right direction",
          "Only that optimisation happened \u2014 both were optimised directly, and a simulated run showed the training reward rising monotonically while true quality collapsed",
          "That the reward model was well fitted, though the policy may not have improved",
          "That the learning rate was appropriate for the dataset size"
        ],
        answer: 1,
        why: "Any metric that appeared in the loss is a restatement of the loss. The simulation makes the risk concrete: with a reward model 59% aligned with true preference, the proxy score rose without bound to +6.0 while true quality peaked at a KL of 1.0 and fell to \u22129.04 \u2014 so the training reward was improving at every checkpoint including those where the model was getting worse. Evidence requires held-out data, a judge, or a deterministic check." },

      { stem: "Why should each win-rate pair be evaluated in both presentation orders?",
        options: [
          "To double the sample size and reduce variance in the estimate",
          "Because the fraction of pairs where the judge contradicts itself *is* the position bias, measured on your own judge \u2014 and a high flip rate makes the win rate uninterpretable",
          "Because judges apply different criteria to the first and second response",
          "To ensure both models receive equal exposure to the judge's context window"
        ],
        answer: 1,
        why: "Judges systematically favour position A, and randomisation alone removes the systematic component while leaving the noise. Evaluating both ways lets you count only consistent judgements as wins and reports the inconsistency rate as a diagnostic \u2014 which validates everything downstream. If the flip rate is high the judge is simply too noisy for the comparison, and no randomisation scheme repairs that." },

      { stem: "A win rate of 0.61 comes with a mean length ratio of 1.41 against the previous model. Within length bins the win rates are 0.50, 0.51, 0.49 and 0.50. What happened?",
        options: [
          "The model improved consistently across all response lengths",
          "The aggregate win is entirely attributable to longer answers \u2014 within every length band the model is no better than its predecessor",
          "The length bins were too coarse to detect the improvement",
          "The judge's position bias inflated the aggregate figure"
        ],
        answer: 1,
        why: "Flat within-bin win rates at 0.50 mean that for any given response length the two models are indistinguishable, so the only thing producing the aggregate 0.61 is the shift toward longer responses combined with a judge that prefers them. This is why binning matters more than reporting mean length alongside: a 41% length creep is suggestive, but the flat bins are what make it conclusive. Length is the canonical reward hack because the implicit reward is linear in token count." },

      { stem: "Why must safety be measured in both directions rather than only with a red-team suite?",
        options: [
          "Because red-team suites cannot cover every category of harm",
          "Because a model that refuses everything scores perfectly on red-team and is useless \u2014 a refusal is never wrong the way an error is, so one-directional evaluation rewards refusing",
          "Because over-refusal correlates with jailbreak vulnerability",
          "Because regulators require both metrics to be reported"
        ],
        answer: 1,
        why: "Optimising only the direction that penalises harmful outputs has a trivially optimal solution: refuse. That is the safety-flavoured version of hedging, where a vague non-answer avoids the penalty a confident error attracts, so the model is responding correctly to the incentive it was given. An over-refusal set makes the other direction visible, and the goal is a model that discriminates rather than one that is cautious. Coverage gaps are a separate, real problem." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Evaluating work whose metrics you optimised",
    questions: [
      { level: "advanced",
        q: "How do you evaluate an aligned model?",
        strong: "A strong answer disqualifies the training metrics first.",
        answer: [
          { t: "p", text: "By excluding everything I optimised. Reward accuracy, reward model score and the DPO margin are restatements of the loss, so none of them is evidence \u2014 and the risk is not theoretical. I simulated optimising a reward model 59% aligned with true preference and the proxy score rose monotonically to +6.0 while true quality peaked at a KL of 1.0 and fell to \u22129.04." },
          { t: "p", text: "The headline is a pairwise win rate against the pre-alignment model on held-out prompts, with two controls. Randomise order, because judges favour position A \u2014 and better, evaluate every pair both ways so the self-contradiction rate gives you the position bias measured rather than assumed. Then bin by length, because if within-bin win rates are flat and the aggregate is positive, you bought verbosity." },
          { t: "p", text: "Then the constraints: capability regression on standard benchmarks, which is the alignment tax and should have a budget set in advance; safety in both directions including an over-refusal set; format compliance, which is deterministic and cheap enough to run in CI; and calibration, which RLHF degrades." },
          { t: "p", text: "And drift signals at every checkpoint rather than at the end \u2014 mean output length and KL from the reference. Those are the early-warning system for reward hacking, and the point of logging them per checkpoint is that the right stopping point looks unremarkable when you reach it." }
        ] },

      { level: "core",
        q: "What is the alignment tax and how do you manage it?",
        strong: "A strong answer treats it as a budget and a dial.",
        answer: [
          { t: "p", text: "Alignment routinely costs a few points on unrelated capabilities \u2014 MMLU, GSM8K, coding benchmarks. The important part of the advice is to set the budget before starting, because discovering it afterwards turns a planned trade into an argument about whether to ship." },
          { t: "p", text: "I have measured the severe version: generic perplexity going from 5.282 to 10.777 after a domain fine-tune under LoRA. That also refuted a claim I had made earlier in the same work that forgetting was structurally impossible under LoRA, so I would not treat parameter-efficient methods as immune." },
          { t: "p", text: "The useful framing is that it is a dial rather than a fixed cost. Merging the fine-tune back with the base or instruct model at roughly 0.3 to 0.5 weight costs zero training compute, and the degradation curve is typically convex \u2014 generic capability holds up at first and then falls away \u2014 so a mid-range weight captures most of the benefit for a fraction of the cost." },
          { t: "p", text: "So the evaluation question is not how much was lost but which point on the curve is best, which means measuring domain and generic performance separately at several merge weights. Reporting them combined hides which capability you are trading, and that choice is a product judgement rather than an optimisation." }
        ] },

      { level: "core",
        q: "Why measure over-refusal?",
        strong: "A strong answer identifies the degenerate optimum.",
        answer: [
          { t: "p", text: "Because the alternative has a trivially optimal solution that is useless. If you only measure whether the model does things it should not, then refusing everything scores perfectly on the red-team suite and ships to nobody." },
          { t: "p", text: "It is the safety-flavoured version of hedging, which is the reward hack evaluation most often misses. A refusal is never *wrong* in the way an incorrect answer is, so any evaluation that penalises errors and not non-answers makes refusing the risk-free strategy \u2014 and the model is responding correctly to the incentive it was given." },
          { t: "p", text: "So you need a set of questions that *should* be answered and a refusal rate on it. What you are looking for is a model that discriminates, not one that is cautious, and only the two measurements together distinguish those." },
          { t: "p", text: "I have run into the identical structure on the retrieval side, where an over-refusing system is a failure mode rather than a safe default. The same logic applies to abstention generally: reward decisiveness explicitly and measure the abstention rate, or the model will learn that saying nothing is always safe." }
        ] }
    ]
  }
});
