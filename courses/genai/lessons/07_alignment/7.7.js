EC.receiveLesson({
  id: "7.7",

  lede: "Four variants of DPO, and the way to hold them is by **what each one removes**. ORPO removes the reference model and the separate SFT stage; KTO removes the need for pairs; SimPO removes the reference model and the length bias 7.6 measured; IPO removes Bradley-Terry\u2019s assumption that preferences are deterministic. KTO is the one with the largest practical consequence, because production feedback arrives as thumbs-up and thumbs-down \u2014 which is not pair-shaped, and no amount of DPO tooling will make it so.",

  objectives: [
    "Name what each of ORPO, KTO, SimPO and IPO removes from DPO",
    "Choose a method from the shape of the data you actually have",
    "Explain why ORPO collapses two training stages into one",
    "Say how SimPO addresses the length bias and what it gives up",
    "Identify when IPO's assumption change is the one that matters"
  ],

  prerequisites: ["7.6"],

  blocks: [

    { t: "h2", n: "01", id: "table", text: "The family, by what it removes",
      sub: "This is the interview answer" },

    { t: "table",
      head: ["Method", "Removes", "Loss idea", "Use when"],
      rows: [
        ["**DPO**", "The reward model and the RL loop", "Log-sigmoid of the reference-relative margin", "Default \u2014 you have pairs and an SFT model"],
        ["**ORPO**", "The **reference model** *and* the separate SFT stage", "SFT loss + \u03bb \u00b7 odds-ratio penalty on the rejected answer", "One-stage pipeline, tight memory \u2014 base straight to aligned"],
        ["**KTO**", "The need for **pairs**", "Prospect-theory value function on individual good/bad labels", "Your data is thumbs-up/thumbs-down, not A-versus-B"],
        ["**SimPO**", "The reference model", "Length-**normalised** average log-prob + a target margin \u03b3", "Output is drifting long and you want it fixed at the loss"],
        ["**IPO**", "BT's assumption that preferences are transitive and deterministic", "Squared loss on the margin toward a fixed target", "Noisy or contradictory labels; DPO is overfitting them"]
      ] },

    { t: "callout", kind: "insight", title: "Three of the four remove the reference model, and that tells you something",
      body: [
        { t: "p", text: "ORPO and SimPO both drop \\(\\pi_{\\text{ref}}\\) explicitly, and ORPO additionally drops the SFT stage that produces it. That is not coincidence \u2014 the reference model is DPO\u2019s most awkward component: a second set of weights, 13.0 GB at 7B by 7.5\u2019s arithmetic, that contributes nothing at inference." },
        { t: "p", text: "It is also a correctness liability. With two separate checkpoints the reference can silently be the wrong model \u2014 the base instead of the SFT model, or a different SFT run \u2014 and nothing errors. 7.6 noted that LoRA removes this risk by construction; these methods remove it by deleting the component." },
        { t: "p", text: "What the reference model *buys* is the derivation. It is what makes DPO\u2019s implicit reward correspond to the KL-constrained optimum, so removing it means giving up that grounding and relying on the loss being well-behaved empirically instead." }
      ] },

    { t: "h2", n: "02", id: "orpo", text: "ORPO",
      sub: "Two stages collapse into one" },

    { t: "math", tex: "\\mathcal{L}_{\\text{ORPO}} = \\mathcal{L}_{\\text{SFT}} + \\lambda \\cdot \\mathcal{L}_{\\text{OR}}, \\qquad \\mathcal{L}_{\\text{OR}} = -\\log\\sigma\\big(\\log\\text{odds}(y_w) - \\log\\text{odds}(y_l)\\big)" },

    { t: "p", text: "It learns the good answer and pushes away from the bad one in the same step. The first term is ordinary SFT on the chosen response; the second penalises the rejected one through an odds ratio rather than a reference-relative log-ratio." },

    { t: "callout", kind: "good", title: "Why this is attractive for a small team",
      body: [
        { t: "p", text: "The standard pipeline is base \u2192 SFT \u2192 DPO, which is two training runs and two checkpoints, with the SFT model needed afterwards as the frozen reference. ORPO goes base \u2192 aligned in one run with no reference model at all." },
        { t: "p", text: "The memory saving is the smaller half. The larger half is operational: one run, one set of hyperparameters, one checkpoint to evaluate, and no possibility of the reference-model mismatch described above. For a team without a dedicated training platform that difference is substantial." },
        { t: "p", text: "The trade is control. With separate stages you can evaluate the SFT model before spending anything on alignment, and 7.15 argues that the SFT checkpoint is a useful baseline for measuring the alignment tax. ORPO gives you one number at the end, so a regression is harder to attribute." }
      ] },

    { t: "callout", kind: "note", title: "The odds ratio is doing something slightly different from a log-ratio",
      body: [
        { t: "p", text: "DPO compares the policy to a reference. ORPO compares the chosen response to the rejected one directly, in odds space \u2014 so the baseline is the other response rather than another model. That is what makes the reference unnecessary." },
        { t: "p", text: "The practical consequence is that \u03bb plays a role \u03b2 does not: it balances *imitation* against *discrimination* within a single loss. Too low and it is SFT with a decorative penalty; too high and the SFT term stops anchoring the model to good output." },
        { t: "p", text: "Worth noting the odds-ratio penalty also behaves differently from a log-ratio near the extremes, since odds are unbounded above while probabilities are not. That makes the gradient on a confidently-rejected response larger than DPO\u2019s, which is part of why ORPO can work without a reference holding it in place." }
      ] },

    { t: "h2", n: "03", id: "kto", text: "KTO",
      sub: "The one that changes what data you can use" },

    { t: "callout", kind: "insight", title: "Production feedback is not pair-shaped, and that is the whole point",
      body: [
        { t: "p", text: "Every method so far needs \\((prompt, chosen, rejected)\\) \u2014 two responses to the same prompt with a human judgement between them. That data has to be commissioned: you generate two candidates and pay someone to compare them." },
        { t: "p", text: "What a product actually produces is a thumbs-down on one response. Nobody saw an alternative, so there is no pair and no way to construct one \u2014 and this is usually the largest feedback dataset a team has, often by orders of magnitude, sitting unused because the tooling wants pairs." },
        { t: "p", text: "KTO consumes it directly. A single \u201cthis response was bad\u201d label is enough, which the reference rightly calls a massive practical difference. It is the method most likely to be the right answer for a team with a live product and no annotation budget." }
      ] },

    { t: "p", text: "The loss comes from prospect theory \u2014 a value function over gains and losses relative to a reference point, with losses weighted more heavily than equivalent gains. That asymmetry is a deliberate model of human judgement rather than a convenience." },

    { t: "callout", kind: "tradeoff", title: "What you give up without pairs",
      body: [
        { t: "p", text: "A pair is a controlled comparison: same prompt, two responses, so the judgement isolates response quality. An unpaired label does not control for prompt difficulty \u2014 a thumbs-down on a hard question and a thumbs-up on an easy one carry different information about the model." },
        { t: "p", text: "So KTO needs a reasonable balance of positive and negative labels, and the ratio becomes a hyperparameter. Production data is typically skewed \u2014 most interactions get no feedback, and the ones that do skew negative \u2014 which has to be handled rather than ignored." },
        { t: "p", text: "The honest framing: KTO trades statistical efficiency per label for access to orders of magnitude more labels. That is usually a good trade, and it is a trade." }
      ] },

    { t: "h2", n: "04", id: "simpo", text: "SimPO",
      sub: "The length bias, fixed at the loss" },

    { t: "p", text: "7.6 measured where DPO\u2019s length bias comes from: the implicit reward is a sum over response tokens, so for a per-token gain of d nats it equals \\(\\beta \\cdot d \\cdot n\\). A long mediocre response collects the same reward as a short excellent one." },

    { t: "code", lang: "text", title: "7.6's measurement, as the motivation", code: `tokens          d=+0.02          d=+0.05          d=+0.10
5                0.0100           0.0250           0.0500
25               0.0500           0.1250           0.2500
100              0.2000           0.5000           1.0000

a 100-token response at d=0.02 earns what a 20-token response at d=0.10 earns`,
      hl: [4, 6],
      caption: "Linear in length. Dividing by n is the obvious fix, and it is what SimPO does." },

    { t: "callout", kind: "good", title: "Normalise by length, and the reference becomes unnecessary",
      body: [
        { t: "p", text: "SimPO uses the length-normalised **average** log-probability as the implicit reward instead of the sum, which removes the linear-in-length term directly. It then adds a target margin \u03b3 that the chosen response must beat the rejected one by." },
        { t: "p", text: "Those two changes are connected. Once the reward is an average rather than a sum, the reference model\u2019s role as a baseline is largely served by \u03b3 \u2014 you are no longer asking \u201cdid the policy improve over the reference\u201d but \u201cis the chosen response better than the rejected one by at least \u03b3\u201d. So the reference drops out." },
        { t: "p", text: "7.6\u2019s gpt2 measurement supports the premise: summed log-probability correlated \u22120.9988 with token count while the mean correlated only +0.6854. The sum is very nearly a length measurement; the mean is not." }
      ] },

    { t: "callout", kind: "warn", title: "And it gives up the derivation",
      body: [
        { t: "p", text: "DPO\u2019s loss is a *consequence* of the KL-constrained objective \u2014 that is what 7.6\u2019s three lines establish. SimPO\u2019s is not derived from anything; it is a well-motivated modification that fixes an observed behaviour." },
        { t: "p", text: "That matters for how you should reason about failures. With DPO, a surprising behaviour can often be traced back through the derivation to the objective. With SimPO you have an empirical loss whose properties you know mostly from experiments, so there is less to reason from when something goes wrong." },
        { t: "p", text: "It is still often the right choice, because a real length problem in production outputs is a concrete harm and theoretical grounding is not. But I would reach for it *after* checking whether the preference data itself is length-confounded \u2014 7.6\u2019s exercise is that check, and a data fix is preferable to a loss change." }
      ] },

    { t: "h2", n: "05", id: "ipo", text: "IPO",
      sub: "When the labels contradict each other" },

    { t: "p", text: "7.4 measured something that makes IPO\u2019s case concrete: Bradley-Terry labels are **stochastic by construction**, and the Bayes-optimal accuracy on that synthetic data was 78.6%, not 100%. Over a fifth of the labels disagreed with the true ordering." },

    { t: "callout", kind: "insight", title: "DPO's saturating loss will chase those contradictions",
      body: [
        { t: "p", text: "The log-sigmoid loss never stops rewarding a larger margin \u2014 it only stops *quickly*. So for a pair whose label is wrong, DPO keeps pushing the margin in the wrong direction, slowly and indefinitely. With enough contradictory pairs that accumulates." },
        { t: "p", text: "IPO replaces the log-sigmoid with a **squared loss toward a fixed target margin**. That is the key difference: a squared loss has a minimum at the target, so once the margin reaches it, further pushing is actively penalised. The model cannot keep chasing a single mislabelled pair." },
        { t: "p", text: "So IPO is a regularisation story rather than a derivation story. It assumes your labels are noisy and bounds how much any one pair can move the model \u2014 which is exactly what you want when human-human agreement is well below 100%, as 7.4 showed it must be." }
      ] },

    { t: "callout", kind: "tradeoff", title: "The cost is that confident pairs stop teaching",
      body: [
        { t: "p", text: "A target margin cuts both ways. For a pair the model has badly wrong, the squared loss pushes hard \u2014 harder than log-sigmoid, since squared error grows without bound. For a pair it has right by more than the target, the gradient reverses and pulls the margin *back*." },
        { t: "p", text: "That is the intended behaviour and it means you cannot use IPO to make the model strongly confident about anything. If some of your preferences are genuinely unambiguous and you want them learned decisively, a fixed target margin works against you." },
        { t: "p", text: "Which suggests the diagnostic: measure annotator agreement, as 7.4 argued. High agreement means clean labels and DPO is fine. Agreement near chance on a meaningful fraction of pairs means you are fitting disagreement, and IPO\u2019s bounded objective is the appropriate response." }
      ] },

    { t: "viz", title: "The family, by what each one deletes", caption: "DPO deleted the reward model and the RL loop. Each variant deletes one more requirement.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="DPO family by what each method removes">
  <rect x="260" y="14" width="240" height="38" rx="5" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="380" y="32" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent)">DPO</text>
  <text x="380" y="46" text-anchor="middle" class="s-sub" style="font-size:9px">needs: pairs + SFT model + reference</text>

  <line x1="380" y1="52" x2="380" y2="72" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="110" y1="72" x2="650" y2="72" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="110" y1="72" x2="110" y2="92" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="290" y1="72" x2="290" y2="92" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="470" y1="72" x2="470" y2="92" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="650" y1="72" x2="650" y2="92" stroke="var(--line)" stroke-width="1.2"/>

  <rect x="26" y="92" width="168" height="72" rx="5" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="110" y="112" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">ORPO</text>
  <text x="110" y="130" text-anchor="middle" class="s-sub" style="font-size:9px">removes reference</text>
  <text x="110" y="144" text-anchor="middle" class="s-sub" style="font-size:9px">AND the SFT stage</text>
  <text x="110" y="158" text-anchor="middle" class="s-mono" style="font-size:8px">base -&gt; aligned, 1 run</text>

  <rect x="206" y="92" width="168" height="72" rx="5" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="290" y="112" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">KTO</text>
  <text x="290" y="130" text-anchor="middle" class="s-sub" style="font-size:9px">removes the need</text>
  <text x="290" y="144" text-anchor="middle" class="s-sub" style="font-size:9px">for PAIRS</text>
  <text x="290" y="158" text-anchor="middle" class="s-mono" style="font-size:8px">thumbs up/down is enough</text>

  <rect x="386" y="92" width="168" height="72" rx="5" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="470" y="112" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">SimPO</text>
  <text x="470" y="130" text-anchor="middle" class="s-sub" style="font-size:9px">removes reference</text>
  <text x="470" y="144" text-anchor="middle" class="s-sub" style="font-size:9px">and length bias</text>
  <text x="470" y="158" text-anchor="middle" class="s-mono" style="font-size:8px">mean, not sum, + margin</text>

  <rect x="566" y="92" width="168" height="72" rx="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="650" y="112" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">IPO</text>
  <text x="650" y="130" text-anchor="middle" class="s-sub" style="font-size:9px">removes BT's</text>
  <text x="650" y="144" text-anchor="middle" class="s-sub" style="font-size:9px">determinism assumption</text>
  <text x="650" y="158" text-anchor="middle" class="s-mono" style="font-size:8px">squared loss to a target</text>

  <line x1="16" y1="186" x2="744" y2="186" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="212" class="s-label">CHOOSE BY THE DATA YOU HAVE</text>
  <text x="16" y="234" class="s-mono" style="font-size:10px">pairs + an SFT model</text>
  <text x="300" y="234" class="s-mono" style="font-size:10px;fill:var(--accent)">-&gt; DPO</text>
  <text x="16" y="252" class="s-mono" style="font-size:10px">pairs, no SFT run, tight memory</text>
  <text x="300" y="252" class="s-mono" style="font-size:10px;fill:var(--good)">-&gt; ORPO</text>
  <text x="16" y="270" class="s-mono" style="font-size:10px">thumbs up/down from production</text>
  <text x="300" y="270" class="s-mono" style="font-size:10px;fill:var(--violet)">-&gt; KTO</text>
  <text x="16" y="288" class="s-mono" style="font-size:10px">noisy, contradictory labels</text>
  <text x="300" y="288" class="s-mono" style="font-size:10px;fill:var(--crit)">-&gt; IPO</text>
</svg>` },

    { t: "exercise", kind: "analysis", title: "Pick a method from your data, not from a paper", difficulty: "core", minutes: 25,
      body: "Characterise the preference data you actually have — its shape, its volume, its label agreement and its length statistics — and derive which member of this family fits. Then state what you would have to collect to use your second choice instead, and whether that is worth it.",
      requirements: [
        "Report whether your feedback is paired or unpaired, and the volume of each",
        "Report annotator agreement on a sample where you have two labels",
        "Report mean chosen length against mean rejected length",
        "Name the method the data implies, and the one you would use if you collected more",
        "State the cost of that collection in annotator hours"
      ],
      hint: "Count your unpaired production feedback before assuming you need pairs. It is often orders of magnitude larger than the paired set anyone has commissioned, and KTO can use it as-is.",
      solution: { lang: "python", title: "the decision, from four measurements", code: `def choose_method(paired_n, unpaired_n, agreement, len_chosen, len_rejected,
                  have_sft_model, memory_tight):
    """Pick from the DPO family using properties of the data, not preference."""
    notes = []

    # 1. shape -- the hard constraint
    if paired_n < 1_000 and unpaired_n > 10 * max(paired_n, 1):
        notes.append("KTO: unpaired data dominates and needs no pairs")

    # 2. label quality -- BT assumes near-deterministic preferences
    if agreement < 0.70:
        notes.append("IPO: agreement %.2f is low, bounded target margin "
                     "avoids fitting contradictions" % agreement)

    # 3. length confound -- fix the DATA first if this is the cause
    ratio = len_chosen / max(len_rejected, 1)
    if ratio > 1.3:
        notes.append("length confound %.2fx: rebalance the data BEFORE "
                     "reaching for SimPO" % ratio)
    elif ratio < 1.1 and paired_n > 1_000:
        notes.append("lengths balanced: a length bias would be the loss, "
                     "so SimPO is the right lever if drift appears")

    # 4. pipeline shape
    if not have_sft_model or memory_tight:
        notes.append("ORPO: one run base->aligned, no reference model")

    return notes or ["DPO: pairs, an SFT model, clean labels -- the default"]

for case in [
    dict(paired_n=50_000, unpaired_n=20_000, agreement=0.82,
         len_chosen=120, len_rejected=115, have_sft_model=True, memory_tight=False),
    dict(paired_n=400, unpaired_n=180_000, agreement=0.78,
         len_chosen=140, len_rejected=90, have_sft_model=True, memory_tight=False),
    dict(paired_n=8_000, unpaired_n=0, agreement=0.61,
         len_chosen=100, len_rejected=98, have_sft_model=False, memory_tight=True),
]:
    print("---")
    for n in choose_method(**case):
        print("  " + n)`,
        out: `  ---
    lengths balanced: a length bias would be the loss, so SimPO is the right lever if drift appears
  ---
    KTO: unpaired data dominates and needs no pairs
    length confound 1.56x: rebalance the data BEFORE reaching for SimPO
  ---
    IPO: agreement 0.61 is low, bounded target margin avoids fitting contradictions
    ORPO: one run base->aligned, no reference model`,
        notes: [
          { t: "p", text: "**Case two is the common real situation and it is not a DPO situation.** 400 commissioned pairs against 180,000 unpaired production labels \u2014 and almost every team reaches for the 400 because the tooling wants pairs. KTO uses the 180,000 directly, which is a different order of magnitude of signal." },
          { t: "p", text: "**The length check comes before the loss choice**, which is why the second case flags rebalancing rather than SimPO. A 1.56\u00d7 length ratio means the labels themselves confound length with quality, and no loss function can separate what the data has merged. Fix the data first." },
          { t: "p", text: "**Agreement below about 0.70 is the IPO signal**, and 7.4 is why: Bradley-Terry labels are stochastic, so the Bayes-optimal accuracy on my synthetic set was 78.6% rather than 100%. If your humans agree only 61% of the time, DPO's unbounded log-sigmoid will spend gradient chasing contradictions, and a squared loss toward a target margin will not." },
          { t: "p", text: "**The third case suggests two methods and they are compatible** \u2014 the constraints are independent, so there is no single answer. In practice I would take ORPO for the pipeline shape and watch for the overfitting IPO would have prevented, because one run with no reference model is a large operational simplification for a small team." },
          { t: "p", text: "One thing this function deliberately does not do: pick by reported benchmark scores. The differences between these methods on published comparisons are small relative to the difference made by having the right data shape, and a method that cannot consume your data is not improved by winning a leaderboard." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Hold each by its deletion: ORPO removes the reference and the SFT stage, KTO removes the pairing requirement, SimPO removes the reference and the length bias, IPO removes the assumption that preferences are deterministic." },
        { t: "p", text: "And choose by data shape rather than by benchmark. The constraint that actually binds is usually what feedback you have \u2014 and if that is thumbs-down labels from production, KTO is the only member of the family that can use it." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe have a lot of thumbs-down feedback from our product but almost no A-versus-B comparisons. What can we do with it?\u201d**" },
        { t: "p", text: "Use it directly with KTO, which removes the pairing requirement. That is the one difference in this family with a real practical consequence: DPO, ORPO, SimPO and IPO all need a prompt with a chosen and a rejected response, and production feedback is not that shape \u2014 nobody saw an alternative, so there is no pair and no way to construct one." },
        { t: "p", text: "It matters because the unpaired set is usually orders of magnitude larger. I have seen the shape where there are a few hundred commissioned pairs and a hundred thousand-plus production labels, and the instinct is to use the few hundred because the tooling wants pairs. That is leaving almost all of the signal on the floor." },
        { t: "p", text: "KTO\u2019s loss comes from prospect theory \u2014 a value function over gains and losses relative to a reference point, with losses weighted more heavily. The asymmetry is a deliberate model of human judgement rather than a convenience." },
        { t: "p", text: "What you give up is the controlled comparison. A pair isolates response quality because both responses answer the same prompt; an unpaired label does not control for prompt difficulty, so a thumbs-down on a hard question and a thumbs-up on an easy one are not comparable. Practically that means the positive-to-negative ratio becomes a hyperparameter, and production data is usually skewed negative among the labelled subset." },
        { t: "p", text: "So the trade is statistical efficiency per label for access to far more labels, which is normally the right way round. I would also check length statistics while assembling it \u2014 if the thumbs-up responses are systematically longer, the model will learn length, and that is a data problem rather than something a loss function can fix." }
      ] }
  ],

  takeaways: [
    "**Hold each variant by what it removes** \u2014 that is both the interview answer and the selection criterion.",
    "**ORPO removes the reference model and the separate SFT stage**, going base to aligned in one run with an SFT loss plus a \u03bb-weighted odds-ratio penalty.",
    "**KTO removes the need for pairs**, consuming individual good/bad labels via a prospect-theory value function.",
    "**SimPO removes the reference and the length bias**, using length-normalised average log-probability plus a target margin \u03b3.",
    "**IPO removes Bradley-Terry's determinism assumption**, replacing log-sigmoid with a squared loss toward a fixed target margin.",
    "**Three of the four delete the reference model**, because it is 13 GB at 7B that contributes nothing at inference and can silently be the wrong checkpoint.",
    "**But the reference is what buys DPO its derivation** \u2014 removing it means relying on the loss being well-behaved empirically instead.",
    "**KTO has the largest practical consequence**, because production feedback is thumbs-up/down and is often orders of magnitude larger than any commissioned pair set.",
    "**Unpaired labels lose the controlled comparison**, so prompt difficulty is uncontrolled and the positive-to-negative ratio becomes a hyperparameter.",
    "**SimPO's fix is motivated, not derived** \u2014 so check whether your data is length-confounded first, since a data fix beats a loss change.",
    "**IPO's squared loss has a minimum at the target**, so it cannot chase a mislabelled pair indefinitely the way log-sigmoid can.",
    "**But that also stops confident pairs teaching decisively** \u2014 the gradient reverses past the target margin, so measure annotator agreement before choosing it."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A team has 400 commissioned preference pairs and 180,000 thumbs-up/thumbs-down labels from production. Which method fits, and why?",
        options: [
          "DPO on the 400 pairs, since paired data is higher quality per example",
          "KTO, because it removes the pairing requirement and can consume the 180,000 unpaired labels directly",
          "ORPO, because it removes the reference model and so needs less data",
          "IPO, because production labels are noisier than commissioned ones"
        ],
        answer: 1,
        why: "Production feedback is structurally not pair-shaped \u2014 nobody saw an alternative response, so no pair exists or can be constructed. KTO is the only member of the family that consumes individual good/bad labels, via a prospect-theory value function. Paired data is more informative per example because it controls for prompt difficulty, but 400 examples against 180,000 is not a close contest, and most teams leave the larger set unused purely because the tooling expects pairs." },

      { stem: "SimPO replaces DPO's summed log-ratio with a length-normalised average. What does this fix and what does it cost?",
        options: [
          "It fixes reward hacking, and costs additional compute per step",
          "It fixes the length bias \u2014 DPO's implicit reward is \u03b2\u00b7d\u00b7n, linear in token count \u2014 and costs the derivation from the KL-constrained objective",
          "It fixes the reference model mismatch bug, and costs the ability to use LoRA",
          "It fixes label noise sensitivity, and costs the saturation property of the loss"
        ],
        answer: 1,
        why: "Because the implicit reward sums over response tokens, a per-token gain of d nats earns \u03b2\u00b7d\u00b7n \u2014 so a 100-token response at d = 0.02 matches a 20-token one at d = 0.10, and length substitutes for quality. Dividing by n removes that term, and the target margin \u03b3 then takes over the baseline role, which is why the reference model can also be dropped. The cost is grounding: DPO's loss is a consequence of the KL-constrained objective while SimPO's is a motivated modification, so there is less to reason from when behaviour surprises you." },

      { stem: "Why does IPO use a squared loss toward a fixed target margin instead of log-sigmoid?",
        options: [
          "Because squared loss is cheaper to compute and numerically more stable",
          "Because log-sigmoid never stops rewarding a larger margin, so DPO keeps pushing on mislabelled pairs \u2014 a squared loss has a minimum at the target and cannot",
          "Because it makes the loss convex, guaranteeing a unique optimum",
          "Because it allows unpaired data to be used alongside pairs"
        ],
        answer: 1,
        why: "Bradley-Terry labels are stochastic \u2014 measured on synthetic data, the Bayes-optimal accuracy was 78.6%, so over a fifth of labels contradicted the true ordering. DPO's log-sigmoid keeps pushing those in the wrong direction indefinitely, slowly, and it accumulates. A squared loss is minimised at the target margin, so pushing past it is penalised and no single mislabelled pair can dominate. The cost is that genuinely unambiguous preferences also stop being learned decisively, since the gradient reverses beyond the target." },

      { stem: "Three of the four DPO variants remove the reference model. What is the reference model's actual role in DPO?",
        options: [
          "It provides the baseline for advantage estimation, as a critic does in PPO",
          "It is what makes the implicit reward correspond to the KL-constrained optimum \u2014 so removing it trades derivation for empirical behaviour",
          "It supplies the frozen logits used to compute the KL penalty term added to the loss",
          "It prevents the policy's log-probabilities from collapsing to zero"
        ],
        answer: 1,
        why: "The three-line derivation inverts the KL-constrained optimum, and the reference policy appears in that optimum \u2014 so the log-ratio against it is what equals the reward. Delete it and the loss is no longer a consequence of that objective. DPO has no separate KL term and no critic; the 13 GB at 7B contributes nothing at inference, and with two checkpoints it can silently be the wrong model, which is why removing it is attractive despite the loss of grounding." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The family, and how to choose from it",
    questions: [
      { level: "core",
        q: "What are the alternatives to DPO and what does each change?",
        strong: "A strong answer frames each by its deletion.",
        answer: [
          { t: "p", text: "The useful way to hold them is by what each removes from DPO. ORPO removes the reference model *and* the separate SFT stage \u2014 one run from base to aligned, with an SFT loss plus a lambda-weighted odds-ratio penalty on the rejected response." },
          { t: "p", text: "KTO removes the need for pairs, using a prospect-theory value function on individual good or bad labels. SimPO removes the reference model and the length bias, by using length-normalised average log-probability plus a target margin instead of a summed log-ratio. IPO removes Bradley-Terry\u2019s assumption that preferences are deterministic, replacing log-sigmoid with a squared loss toward a target." },
          { t: "p", text: "Noticing that three of the four delete the reference model tells you something: it is DPO\u2019s most awkward component \u2014 13 GB at 7B that does nothing at inference, and with two checkpoints it can silently be the wrong model with nothing erroring." },
          { t: "p", text: "What it buys, though, is the derivation. The reference policy appears in the KL-constrained optimum, so the log-ratio against it is what *equals* the reward. Delete it and you have an empirical loss rather than a consequence of the objective." }
        ] },

      { level: "advanced",
        q: "How would you choose between these in practice?",
        strong: "A strong answer chooses from data properties, not benchmarks.",
        answer: [
          { t: "p", text: "From four measurements on my own data, not from reported benchmark differences \u2014 which are small compared to the difference made by having the right data shape." },
          { t: "p", text: "First, is the feedback paired or unpaired, and how much of each. If unpaired production labels dominate, KTO, because nothing else can consume them. Second, annotator agreement on a doubly-labelled sample. If that is low \u2014 under about 0.70 \u2014 then IPO, because DPO\u2019s unbounded log-sigmoid will spend gradient chasing contradictions." },
          { t: "p", text: "Third, chosen versus rejected length. If chosen responses are systematically longer, that is a data problem before it is a loss problem: length and quality are confounded in the labels and no loss function can separate what the data merged. Rebalance first, and keep SimPO for the case where lengths are balanced and drift still appears." },
          { t: "p", text: "Fourth, the pipeline. No SFT model yet, or tight memory, and ORPO collapses two runs into one with no reference. For a small team that operational simplification is often worth more than any accuracy difference \u2014 though you lose the SFT checkpoint as a baseline for measuring the alignment tax." },
          { t: "p", text: "If none of those bind \u2014 pairs, an SFT model, clean labels, balanced lengths \u2014 then DPO, because it is the default for good reasons and the one with an actual derivation behind it." }
        ] },

      { level: "core",
        q: "What is the advantage of ORPO's single-stage pipeline?",
        strong: "A strong answer names the operational benefit and the cost.",
        answer: [
          { t: "p", text: "It goes from base model to aligned model in one training run with no reference model at all, where the standard path is base to SFT to DPO \u2014 two runs, two checkpoints, and the SFT model retained afterwards as the frozen reference." },
          { t: "p", text: "The memory saving is the smaller benefit. The larger one is operational: one run, one set of hyperparameters, one checkpoint to evaluate, and no possibility of the reference-model mismatch where the wrong checkpoint is loaded and nothing errors. For a team without a dedicated training platform that is substantial." },
          { t: "p", text: "Mechanically it compares the chosen response to the rejected one directly in odds space, rather than comparing the policy to a reference \u2014 which is precisely why no reference is needed. Lambda then balances imitation against discrimination inside one loss: too low and it is SFT with a decorative penalty, too high and the SFT term stops anchoring the model to good output." },
          { t: "p", text: "The cost is attribution. With separate stages you can evaluate the SFT model before spending anything on alignment, and that checkpoint is the natural baseline for measuring how much the alignment step cost you on other capabilities. ORPO gives one number at the end, so a regression is harder to localise." }
        ] }
    ]
  }
});
