EC.receiveLesson({
  id: "12.7",

  lede: "Ninety days, worked. The objective is the last line: *\u201cDay 90: retirement date passes. Nothing happens.\u201d* Two lessons generalise. The **quality gate passed on day 10 and the contract gate failed** \u2014 accuracy rose 0.86 to 0.88 while valid JSON fell to 94.2%, so an accuracy-only suite would have shipped a broken parser. And the fix for a 44% verbosity rise was **deleting** prompt instructions, not adding them. Though the stated cost impact of that verbosity needs checking: **+44% output is +19.9% cost at a realistic prompt size, not the +38% quoted.**",

  objectives: [
    "Sequence a 90-day migration across model, embeddings and a fine-tune",
    "Explain why the contract gate matters more than the quality gate",
    "Recognise that migration fixes are often deletions",
    "Check a verbosity-to-cost claim against the input size",
    "Say what \u201cnothing happens\u201d on day 90 requires"
  ],

  prerequisites: ["12.6", "11.7"],

  blocks: [

    { t: "h2", n: "01", id: "timeline", text: "The timeline",
      sub: "Ninety days, and the first twenty are measurement" },

    { t: "code", lang: "text", title: "Days 0 to 20", code: `Day 0    Deprecation notice: your pinned snapshot retires in 90 days.
Day 1    Inventory: 14 hardcoded model IDs across 6 services, 3 prompt families,
         1 fine-tuned classifier, 1 embedding index (5M chunks).
Day 3    Quota increase requested for the successor model.
Day 5    Golden set assembled: 400 cases (240 production / 80 hard / 40 adversarial / 40 contract).
Day 7    Baseline the OLD model on it -- you need the incumbent's numbers to compare against.
Day 10   Shadow run on the new model. Results:
             task accuracy      0.86 -> 0.88   OK
             valid-JSON rate    99.7% -> 94.2% FAIL  <- new model wraps JSON in fences
             mean out tokens      310 ->   445  !    +44% verbosity -> cost +38%
             p95 latency        1.9s -> 1.4s   OK
Day 12   Fix: enable strict schema mode + drop the now-redundant "respond only in JSON"
         instruction; trim the CoT scaffolding the new model does natively.
Day 18   Re-run: JSON 99.9% OK, out tokens 295 OK, accuracy 0.89 OK. All gates green.
Day 20   Canary 1%.`,
      hl: [3, 8, 11],
      caption: "Day 3 is the quota request, because approval takes days. Day 7 baselines the incumbent \u2014 without it there is nothing to compare." },

    { t: "callout", kind: "insight", title: "Twenty of ninety days pass before any traffic moves, and that is correct",
      body: [
        { t: "p", text: "Inventory, quota, golden set, baseline, shadow, fix, re-run \u2014 all before a single user request touches the new model. The shadow run at day 10 has **zero user risk** and catches the hard failure, which is the best return on any day in the timeline." },
        { t: "p", text: "Day 7 is the step easiest to skip and impossible to recover: **baseline the old model on the golden set.** Every gate in 12.6 is expressed relative to the incumbent, so without the incumbent\u2019s numbers you have thresholds and nothing to compare them against. And once the old model is retired you cannot go back and measure it." },
        { t: "p", text: "Day 3 looks like administrative noise and is not. 12.4\u2019s eighth failure mode is a migration that clears every quality gate and fails on day one on tokens per minute, because new models launch at lower tiers. Approval takes days, so the request goes in at the start." }
      ] },

    { t: "h2", n: "02", id: "contract", text: "The quality gate passed and the contract gate failed",
      sub: "The first lesson that generalises" },

    { t: "callout", kind: "trap", title: "Accuracy 0.86 \u2192 0.88, valid JSON 99.7% \u2192 94.2%",
      body: [
        { t: "p", text: "Every signal a quality-focused suite watches improved. Accuracy up two points, p95 latency down from 1.9s to 1.4s. And one request in eighteen now produces unparseable output, because the new model wraps JSON in code fences \u2014 which is a **total failure** for the consumer of that output, not a degraded one." },
        { t: "p", text: "12.1 made this the argument for the deterministic rung and 12.6 made it the argument for the golden set\u2019s 10% contract slice. This is where both pay off: 40 contract cases out of 400 caught a failure that 240 production cases scored as an improvement." },
        { t: "p", text: "The absolute floor in 12.6\u2019s gate table matters here too. A relative gate would have compared 94.2% against the old 99.7% and failed it correctly \u2014 but a relative gate alone would pass a later move from 94% to 95%, which is still one failure in twenty. Contracts need a floor." }
      ] },

    { t: "h2", n: "03", id: "deletion", text: "The fix was deleting instructions",
      sub: "The second lesson that generalises" },

    { t: "callout", kind: "good", title: "Prompts accumulate scaffolding for weaknesses the new model does not have",
      body: [
        { t: "p", text: "Day 12\u2019s fix is three deletions and one setting: enable strict schema mode, **drop** the now-redundant \u201crespond only in JSON\u201d instruction, and **trim** the chain-of-thought scaffolding the new model does natively. The result at day 18 is better than the old model on every axis \u2014 JSON 99.9%, output tokens 295 against the old 310, accuracy 0.89." },
        { t: "p", text: "That is counterintuitive enough to be worth stating as a rule. 12.4 listed CoT scaffolding and format instructions as two of the six prompt-portability failures, and in both cases the instruction was compensating for something the new model does not need \u2014 so the instruction is now actively harmful, inflating cost and verbosity." },
        { t: "p", text: "And it is why 12.2\u2019s changelog is load-bearing rather than documentation hygiene. You can only confidently delete a line whose purpose was recorded. \u2018v3: added abstention rule (cut hallucinations on edge cases)\u2019 tells you what you lose; an unexplained line tells you nothing and gets kept out of caution." }
      ] },

    { t: "h2", n: "04", id: "verbosity", text: "Checking the verbosity-to-cost claim",
      sub: "Where the arithmetic needs an assumption stated" },

    { t: "code", lang: "text", title: "Measured: what +44% output costs, by input size", code: `input tokens       cost old     cost new   increase
226                0.005328     0.007353      38.0%
500                0.006150     0.008175      32.9%
1000               0.007650     0.009675      26.5%
1842               0.010176     0.012201      19.9%
3200               0.014250     0.016275      14.2%
8000               0.028650     0.030675       7.1%`,
      hl: [2, 5],
      caption: "445/310 is +43.5% output. The cost impact depends entirely on the input size, which the example never states." },

    { t: "callout", kind: "trap", title: "+38% cost implies a 226-token input, which is implausible for this task",
      body: [
        { t: "p", text: "The output rise checks out exactly: 445/310 is **+43.5%**, so \u201c+44% verbosity\u201d is right. But cost is `input\u00d7price_in + output\u00d7price_out`, so the percentage rise depends on the input size \u2014 and solving for the input that makes +43.5% output produce +38% cost gives **226 tokens** at $3/$15 per million, or 136 at $5/$15." },
        { t: "p", text: "A 226-token prompt is implausible for a task that summarises documents and returns structured JSON. At the 1,842-token prompt measured in 10.5 the same verbosity rise is **+19.9%** \u2014 roughly half the quoted figure \u2014 and at 8,000 tokens it is +7.1%." },
        { t: "p", text: "So either the example assumes an unusually short prompt or the 38% was not derived from the 44%. The **lesson survives intact** and the number needs its assumption stated \u2014 which is exactly 11.7\u2019s finding about the same reference\u2019s cost table, and the general reason to rebuild a figure from its inputs." }
      ] },

    { t: "callout", kind: "insight", title: "And the direction of the error is instructive",
      body: [
        { t: "p", text: "Verbosity creep matters **most** when output is a large share of the bill \u2014 and 11.7 measured that output goes from 13.0% of cost at baseline to 27.3% after the three input levers. So the teams most exposed to a verbosity regression are precisely the ones who have already done their input optimisation." },
        { t: "p", text: "Which means the +38% figure is not wrong so much as describing a different system: one whose prompt is tiny relative to its output. That is a real configuration \u2014 a classifier returning a long explanation, say \u2014 and stating it would make the number usable." },
        { t: "p", text: "The practical form of the lesson: **the 20% mean-output-tokens alert from 12.5 is the right detector regardless**, because it measures the thing that changed rather than its downstream cost. Token counts are model properties; cost impact is a property of your prompt." }
      ] },

    { t: "h2", n: "05", id: "rest", text: "Days 20 to 90",
      sub: "Canary, embeddings, the fine-tune, and nothing happening" },

    { t: "code", lang: "text", title: "The rest of the window", code: `Day 20   Canary 1%. Day 24: 5%. Day 31: 25%. Day 40: 100%. Kill switch tested at 5%.
Day 45   Embedding index: dual-write starts, backfill runs off-peak over 6 nights.
Day 55   Thresholds re-tuned on index_v2 (score_threshold 0.78 -> 0.71 for equal abstain rate).
Day 62   Reads shifted to index_v2. Old index retained.
Day 75   Fine-tuned classifier re-trained on the new base from the preserved recipe; eval-gated.
Day 85   Old index dropped, old code paths removed.
Day 90   Retirement date passes. Nothing happens. <- the objective`,
      hl: [3, 5, 7],
      caption: "Day 55 is the recalibration 12.6 measured; day 75 is only possible because the recipe was preserved." },

    { t: "callout", kind: "good", title: "Day 75 is the payoff for a discipline followed months earlier",
      body: [
        { t: "p", text: "\u201cRe-trained on the new base **from the preserved recipe**\u201d is one line of timeline and it is the whole of 12.3\u2019s versioning rule cashing out. With the training-data snapshot, hyperparameters, base model ID and eval results in version control, a forced base migration is a re-run that fits in a day." },
        { t: "p", text: "Without them it is a rebuild from nothing, inside a window already committed to a model migration and an embedding re-index. 12.4\u2019s seventh failure mode \u2014 your fine-tune dies with its base \u2014 is only fatal if the recipe was not kept." },
        { t: "p", text: "The one-day test from 12.3 is what makes this checkable in advance: *if you cannot re-create the fine-tune in a day, you do not own it.* Day 75 is that test being passed." }
      ] },

    { t: "callout", kind: "warn", title: "Day 55\u2019s threshold shift is the figure 12.6 found most questionable",
      body: [
        { t: "p", text: "The timeline records `score_threshold 0.78 \u2192 0.71 for equal abstain rate`. 12.6 measured two real embedding models and found the equal-abstain shift going the **other way** \u2014 0.78 to 0.795 \u2014 and, more importantly, that 0.78 was already wrongly abstaining on **58%** of answerable queries, so matching its abstain rate preserves the fault." },
        { t: "p", text: "The structural finding was that the two models\u2019 safe threshold bands overlapped in a window just **0.066** wide, so a transferred threshold is luck \u2014 and carrying the old band\u2019s centre over made the new model answer **70%** of questions its corpus could not answer." },
        { t: "p", text: "So day 55 is the right step on the right day, with the wrong target. Re-tune against the (wrong-answer, wrong-abstain) pair rather than the abstain rate, and expect the shift to be larger than 7 points and in either direction." }
      ] },

    { t: "callout", kind: "mental", title: "What \u201cnothing happens\u201d on day 90 requires",
      body: [
        { t: "p", text: "Nothing happening is the hardest outcome to achieve and the only acceptable one. It requires the old path removed at day 85 rather than day 90, so the retirement lands on code that has not depended on it for a week \u2014 and the canary complete at day 40, leaving fifty days of margin for the embedding and fine-tune work." },
        { t: "p", text: "The margin is the design. A 90-day notice with the canary at day 85 is a plan with no slack, and 12.4\u2019s point is that you should arrive at the notice **already 80% done** \u2014 by running the nightly golden-set eval against the floating alias in staging, so you meet the next model on your schedule." },
        { t: "p", text: "Which reframes the whole timeline: the best version of this is not a 90-day project but a continuous one, where the deprecation notice confirms something you had already measured rather than starting the work." }
      ] },

    { t: "viz", title: "Ninety days, and the two lessons", caption: "Twenty days before traffic moves. The contract gate caught what accuracy missed.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="A ninety-day model migration timeline with its gates and findings">
  <line x1="40" y1="56" x2="720" y2="56" stroke="var(--line)" stroke-width="1.4"/>
  <text x="40" y="38" class="s-mono" style="font-size:8px">day 0</text>
  <text x="720" y="38" text-anchor="end" class="s-mono" style="font-size:8px">day 90</text>

  <circle cx="40" cy="56" r="4" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="40" y="76" text-anchor="middle" class="s-sub">notice</text>
  <circle cx="63" cy="56" r="3.5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="63" y="88" text-anchor="middle" class="s-sub">quota</text>
  <circle cx="93" cy="56" r="3.5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="93" y="76" text-anchor="middle" class="s-sub">golden set</text>
  <circle cx="116" cy="56" r="4" class="s-fill" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="116" y="100" text-anchor="middle" class="s-sub">BASELINE the old model</text>
  <circle cx="139" cy="56" r="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="2"/>
  <text x="155" y="76" class="s-mono" style="font-size:8px;fill:var(--crit)">day 10 SHADOW &#8212; zero user risk, catches the hard failure</text>
  <circle cx="192" cy="56" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="192" y="112" text-anchor="middle" class="s-sub">fix = DELETE</text>
  <circle cx="192" cy="56" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <circle cx="192" cy="56" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <circle cx="192" cy="56" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <circle cx="192" cy="56" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>

  <rect x="192" y="48" width="151" height="16" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="267" y="60" text-anchor="middle" class="s-mono" style="font-size="8px" font-size="8">canary 1-100%</text>
  <rect x="380" y="48" width="129" height="16" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="444" y="60" text-anchor="middle" class="s-mono" font-size="8">embeddings</text>
  <rect x="607" y="48" width="38" height="16" rx="2" class="s-fill" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="626" y="60" text-anchor="middle" class="s-mono" font-size="8">FT</text>
  <circle cx="720" cy="56" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="2"/>
  <text x="712" y="100" text-anchor="end" class="s-mono" style="font-size:9px;fill:var(--good)">nothing happens</text>

  <line x1="16" y1="130" x2="744" y2="130" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="150" class="s-label">THE DAY-10 SHADOW RESULT &#8212; THE FIRST LESSON</text>
  <rect x="16" y="160" width="356" height="52" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="28" y="178" class="s-mono" style="font-size:9px;fill:var(--good)">QUALITY GATE PASSED</text>
  <text x="28" y="194" class="s-mono" style="font-size:8px">task accuracy 0.86 -&gt; 0.88</text>
  <text x="28" y="206" class="s-mono" style="font-size:8px">p95 latency 1.9s -&gt; 1.4s</text>
  <rect x="388" y="160" width="356" height="52" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="400" y="178" class="s-mono" style="font-size:9px;fill:var(--crit)">CONTRACT GATE FAILED</text>
  <text x="400" y="194" class="s-mono" style="font-size:8px">valid JSON 99.7% -&gt; 94.2% &#8212; fenced output</text>
  <text x="400" y="206" class="s-sub">40 contract cases caught what 240 production cases scored as a win</text>

  <rect x="16" y="222" width="356" height="40" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="240" class="s-mono" style="font-size:9px;fill:var(--good)">THE SECOND LESSON: THE FIX WAS DELETION</text>
  <text x="28" y="254" class="s-sub">drop &#8220;respond only in JSON&#8221; &#183; trim the CoT scaffolding</text>

  <rect x="388" y="222" width="356" height="40" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="400" y="240" class="s-mono" style="font-size:9px;fill:var(--warn)">AND A FIGURE TO CHECK</text>
  <text x="400" y="254" class="s-sub">+44% output = +19.9% cost at a 1,842-token prompt, not +38%</text>

  <rect x="16" y="272" width="728" height="40" rx="4" class="s-fill" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="28" y="290" class="s-mono" style="font-size:9px;fill:var(--violet)">THE BEST VERSION IS NOT A 90-DAY PROJECT &#8212; IT IS CONTINUOUS</text>
  <text x="28" y="304" class="s-sub">run the nightly eval against the floating alias in staging, and the notice CONFIRMS what you already measured</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Check the verbosity-to-cost claim", difficulty: "core", minutes: 25,
      body: "Verify the +44% output figure, then work out what input size the stated +38% cost rise implies. Compute the actual cost rise across a range of realistic prompt sizes and state what assumption would make the original figure correct.",
      requirements: [
        "The output ratio verified from 310 and 445",
        "The input size that makes +43.5% output produce +38% cost, solved for",
        "The cost rise computed across several realistic input sizes",
        "A statement of whether the lesson survives the correction",
        "The connection to where output sits as a share of the bill"
      ],
      hint: "Cost is input\u00d7price_in + output\u00d7price_out, so a percentage rise driven by output alone depends on how large the input is. Solve for the input that produces the quoted figure.",
      solution: { lang: "python", title: "the verbosity claim, checked", code: `print("the reference reports:  mean output tokens 310 -> 445  (+44% verbosity)")
print("                        and concludes          cost +38%")
print()
print("445 / 310 = %.4f, so +%.1f%% output -- that part checks out."
      % (445.0 / 310, 100.0 * (445.0 / 310 - 1)))
print()
print("but cost depends on the INPUT size too, which the example never states.")
print("solving for the input that makes a +43.5% output rise a +38% cost rise:")
print()
for pi, po in ((3.0, 15.0), (5.0, 15.0), (0.25, 1.25)):
    # I*pi + 445*po = 1.38 * (I*pi + 310*po)
    inp = (1.38 * 310 * po - 445 * po) / (pi * (1 - 1.38))
    print("  at $%.2f in / $%.2f out per 1M:  implied input = %.0f tokens" % (pi, po, inp))
print()
print("226 input tokens is implausible for a task summarising documents.")
print("so either the example assumes a very short prompt, or the 38% is not")
print("derived from the 44%. here is the cost rise at realistic input sizes:")
print()
print("%-14s %12s %12s %10s" % ("input tokens", "cost old", "cost new", "increase"))
for inp in (226, 500, 1000, 1842, 3200, 8000):
    old = inp / 1e6 * 3.0 + 310 / 1e6 * 15.0
    new = inp / 1e6 * 3.0 + 445 / 1e6 * 15.0
    print("%-14d %12.6f %12.6f %9.1f%%" % (inp, old, new, 100.0 * (new / old - 1)))
print()
print("at the 1,842-token prompt measured in module 10, a +44% verbosity rise is")
print("a +%.1f%% cost rise -- half the reference's figure."
      % (100.0 * ((1842 / 1e6 * 3 + 445 / 1e6 * 15) /
                  (1842 / 1e6 * 3 + 310 / 1e6 * 15) - 1)))
print()
print("the LESSON survives and the number is input-dependent: verbosity creep")
print("matters most when the output is a large share of the bill, which 11.7")
print("showed is exactly the state you reach AFTER trimming input.")`,
        out: `============================================================================
B -- THE VERBOSITY-TO-COST CLAIM FROM THE 90-DAY EXAMPLE
============================================================================
the reference reports:  mean output tokens 310 -> 445  (+44% verbosity)
                        and concludes          cost +38%

445 / 310 = 1.4355, so +43.5% output -- that part checks out.

but cost depends on the INPUT size too, which the example never states.
solving for the input that makes a +43.5% output rise a +38% cost rise:

  at $3.00 in / $15.00 out per 1M:  implied input = 226 tokens
  at $5.00 in / $15.00 out per 1M:  implied input = 136 tokens
  at $0.25 in / $1.25 out per 1M:  implied input = 226 tokens

226 input tokens is implausible for a task summarising documents.
so either the example assumes a very short prompt, or the 38% is not
derived from the 44%. here is the cost rise at realistic input sizes:

input tokens       cost old     cost new   increase
226                0.005328     0.007353      38.0%
500                0.006150     0.008175      32.9%
1000               0.007650     0.009675      26.5%
1842               0.010176     0.012201      19.9%
3200               0.014250     0.016275      14.2%
8000               0.028650     0.030675       7.1%

at the 1,842-token prompt measured in module 10, a +44% verbosity rise is
a +19.9% cost rise -- half the reference's figure.

the LESSON survives and the number is input-dependent: verbosity creep
matters most when the output is a large share of the bill, which 11.7
showed is exactly the state you reach AFTER trimming input.`,
        notes: [
          { t: "p", text: "**The output figure is exactly right** \u2014 445/310 is +43.5%, which rounds to the stated +44%. It is the step from there to a cost figure that needs an assumption nobody wrote down." },
          { t: "p", text: "**+38% cost requires a 226-token input** at $3/$15 per million, or 136 tokens at $5/$15. For a task that summarises documents and returns structured JSON, neither is a plausible prompt size \u2014 the system prompt alone is usually larger than that." },
          { t: "p", text: "**At realistic prompt sizes the figure is roughly half**: +19.9% at 1,842 tokens, which is the prompt size measured in the worked trace in 10.5. At 8,000 tokens it falls to +7.1%." },
          { t: "p", text: "**The lesson survives the correction entirely**, which is worth saying: verbosity creep is real, it was the right thing to catch at day 10, and deleting the redundant instructions was the right fix. Only the magnitude is prompt-dependent." },
          { t: "p", text: "**And the direction of the dependence is useful.** Verbosity hurts most when output is a large share of the bill \u2014 11.7 measured output going from 13.0% of cost to 27.3% after the input levers \u2014 so the teams most exposed to this regression are the ones who have already optimised their input." },
          { t: "p", text: "Which is also why 12.5\u2019s detector is the right one regardless: alert on **mean output tokens**, \u0394 > 20%. That measures the thing that actually changed. Cost impact is a property of your prompt, so a cost alert for this failure mode is calibrated against the wrong quantity." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Twenty of ninety days pass before traffic moves, and that is correct: inventory, quota at day 3 because approval is slow, golden set, **baseline the incumbent**, shadow at day 10 with zero user risk, fix, re-run. The quality gate passed and the contract gate failed \u2014 40 contract cases caught what 240 production cases scored as an improvement." },
        { t: "p", text: "The fix was **deleting** prompt instructions the new model no longer needs, which is why the changelog is load-bearing. And check derived figures: +44% output is +19.9% cost at a realistic prompt, not +38%. Best of all, make it continuous \u2014 run the nightly eval against the alias in staging so the notice confirms what you already measured." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cYou have 90 days before your model is retired. Walk me through it.\u201d**" },
        { t: "p", text: "The first twenty days are measurement and no traffic moves, which is the part that feels slow and is right. Inventory on day one \u2014 and expect more hardcoded model IDs than anyone guesses. Quota increase requested on day three, because new models often launch at lower rate-limit tiers and approval takes days; a migration that clears every quality gate can still fail on day one on tokens per minute." },
        { t: "p", text: "Golden set by day five, around 400 cases: 60% sampled production traffic, 20% known-hard cases from past incidents, 10% adversarial, 10% contract. Then day seven, baseline the **old** model on it. That is the step easiest to skip and impossible to recover, because every gate is relative to the incumbent and once it is retired you cannot measure it." },
        { t: "p", text: "Day ten is the shadow run \u2014 replay production traffic offline, zero user risk \u2014 and in the case I know well it produced the lesson that generalises. Task accuracy improved from 0.86 to 0.88 and p95 latency dropped from 1.9 to 1.4 seconds, so every quality signal passed. And the valid-JSON rate fell from 99.7% to 94.2%, because the new model wrapped its JSON in code fences. Forty contract cases caught a failure that two hundred and forty production cases scored as an improvement \u2014 one request in eighteen unparseable, which is a total failure for the consumer rather than a degraded one." },
        { t: "p", text: "The second lesson is the fix: it was **deletion**. Enable strict schema mode, drop the now-redundant \u2018respond only in JSON\u2019 instruction, and trim the chain-of-thought scaffolding the new model does natively. That took output tokens below the old model\u2019s and accuracy above it. Prompts accumulate scaffolding for weaknesses the new model does not have \u2014 which is exactly why each prompt version needs a changelog, because you can only confidently delete a line whose purpose somebody recorded." },
        { t: "p", text: "Then canary 1, 5, 25, 50, 100 per cent by day 40, with the kill switch tested at 5%. Embeddings from day 45 as a dual-index with an off-peak backfill, thresholds re-tuned around day 55, reads shifted by day 62. The fine-tune re-trained on the new base at day 75 from the preserved recipe \u2014 which is only a one-day job because the training data, hyperparameters, base model ID and eval results were in version control. Old paths removed at day 85, so the retirement date lands on code that has not depended on the old model for a week. Day 90: nothing happens. That is the objective." },
        { t: "p", text: "Two things I would correct from the usual write-up. The threshold re-tuning is described as matching an equal abstain rate, and when I measured two real embedding models that target preserved a threshold that was already wrongly abstaining on 58% of answerable queries \u2014 match the error pair instead. And the \u2018+44% verbosity, +38% cost\u2019 figure only works if the prompt is about 226 tokens; at a realistic 1,842-token prompt the same verbosity rise is +19.9%. The lesson is right and the magnitude is prompt-dependent, which is why the detector should be mean output tokens rather than cost." }
      ] }
  ],

  takeaways: [
    "**Twenty of ninety days pass before traffic moves**, and that is the correct allocation.",
    "**Request the quota increase on day 3**, because new models launch at lower tiers and approval takes days.",
    "**Baseline the incumbent on day 7** \u2014 every gate is relative to it, and once it is retired you cannot measure it.",
    "**The shadow run has zero user risk** and catches the hard failures, making it the best-value day in the timeline.",
    "**The quality gate passed and the contract gate failed**: accuracy 0.86 \u2192 0.88 while valid JSON fell 99.7% \u2192 94.2%.",
    "**40 contract cases caught what 240 production cases scored as an improvement.**",
    "**The fix was deleting instructions** \u2014 strict schema mode plus dropping \u201crespond only in JSON\u201d and the CoT scaffolding.",
    "**Prompts accumulate scaffolding for weaknesses the new model does not have**, which is why the changelog is load-bearing.",
    "**Verified: 445/310 is +43.5% output**, so the \u201c+44% verbosity\u201d figure is right.",
    "**But +38% cost implies a 226-token input** \u2014 at a realistic 1,842-token prompt it is +19.9%, and at 8,000 it is +7.1%.",
    "**So alert on mean output tokens rather than cost**, because token counts are a model property and cost impact is a property of your prompt.",
    "**The best version is continuous, not a 90-day project** \u2014 run the nightly eval against the alias in staging and arrive already 80% done."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "At day 10 the shadow run shows accuracy 0.86 \u2192 0.88 and valid JSON 99.7% \u2192 94.2%. What is the lesson?",
        options: [
          "The new model is better overall and the JSON rate will recover with prompt tuning",
          "The quality gate passed while the contract gate failed \u2014 an accuracy-only suite would have shipped a broken parser",
          "The golden set is too small to resolve a 2-point accuracy change",
          "Shadow runs overstate format problems because they replay stale traffic"
        ],
        answer: 1,
        why: "Every signal a quality-focused suite watches improved, including latency, while one request in eighteen became unparseable \u2014 which for the consumer of that output is a total failure rather than a degraded answer. The 40 contract cases in a 400-case golden set caught what the 240 production cases scored as a win, which is the entire argument for having a contract slice and for giving its gate an absolute floor." },

      { stem: "What was the fix for the 44% verbosity increase?",
        options: [
          "Adding a \u201cbe concise\u201d instruction and lowering max_tokens",
          "Deleting instructions \u2014 enabling strict schema mode, dropping \u201crespond only in JSON\u201d and trimming the CoT scaffolding",
          "Switching to a smaller model variant",
          "Reducing the number of few-shot examples"
        ],
        answer: 1,
        why: "Both deleted instructions were compensating for weaknesses the new model does not have \u2014 it supports strict schema mode natively and reasons without being told to \u2014 so each one had become actively harmful, inflating output and cost. The result beat the old model on every axis: JSON at 99.9%, output tokens at 295 against the old 310, accuracy 0.89. It also explains why each prompt version needs a changelog, since a line with no recorded purpose gets kept out of caution." },

      { stem: "The example states +44% output produces +38% cost. What does checking it show?",
        options: [
          "Both figures are correct for any prompt size",
          "The output figure is right, but +38% cost implies a 226-token input \u2014 at 1,842 tokens the rise is +19.9%",
          "The output figure is wrong; 445/310 is +31%",
          "Cost would rise more than 44%, since output tokens are priced higher"
        ],
        answer: 1,
        why: "445 divided by 310 is 1.4355, so the verbosity figure checks out exactly; the cost figure then depends on input size, which the example never states, and solving for it gives 226 tokens at $3/$15 per million. At realistic prompt sizes the rise is roughly half the quoted number. The lesson survives \u2014 verbosity creep was the right thing to catch \u2014 which is why the detector should be mean output tokens rather than a cost threshold." },

      { stem: "Why is removing the old code paths at day 85 rather than day 90 significant?",
        options: [
          "Because the provider may retire the model early",
          "So the retirement date lands on code that has not depended on the old model for a week \u2014 which is what makes \u201cnothing happens\u201d achievable",
          "Because old paths must be removed before the fine-tune is re-trained",
          "To free quota for the new model before the cutover"
        ],
        answer: 1,
        why: "The objective on day 90 is that the retirement is a non-event, and that requires the dependency to have been gone long enough to be confident nothing still reaches it \u2014 a removal on the day itself provides no evidence either way. The same logic shapes the rest of the schedule: the canary completes at day 40, leaving fifty days of margin for the embedding and fine-tune work rather than finishing against the deadline." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A 90-day migration",
    questions: [
      { level: "advanced",
        q: "What did the day-10 shadow run teach you?",
        strong: "A strong answer separates the quality and contract gates.",
        answer: [
          { t: "p", text: "That measuring quality is not enough. Task accuracy improved from 0.86 to 0.88 and p95 latency fell from 1.9 to 1.4 seconds \u2014 every quality signal green \u2014 while the valid-JSON rate dropped from 99.7% to 94.2% because the new model wrapped its output in code fences." },
          { t: "p", text: "One request in eighteen unparseable is a total failure for whatever consumes that output, not a degraded answer. And it was caught by the 40 contract cases in a 400-case golden set \u2014 the 240 production cases scored the same migration as an improvement." },
          { t: "p", text: "So the contract slice earns its 10% of the golden set many times over, and its gate needs an absolute floor rather than only \u2018better than before\u2019 \u2014 because 94 to 95 per cent is an improvement and still breaks one request in twenty." },
          { t: "p", text: "The shadow stage itself is the other lesson: zero user risk, and it caught the hard failure before any traffic moved. It is the best-value day in the timeline." }
        ] },

      { level: "core",
        q: "What surprised you about fixing the prompts?",
        strong: "A strong answer says the fix was deletion.",
        answer: [
          { t: "p", text: "That the fix was deleting instructions rather than adding them. Enable strict schema mode, drop the now-redundant \u2018respond only in JSON\u2019 line, and trim the chain-of-thought scaffolding the new model does natively." },
          { t: "p", text: "Both deletions were removing compensation for weaknesses the new model does not have \u2014 so the instructions had gone from helpful to actively harmful, inflating verbosity and cost. After the trim, output tokens came in below the old model\u2019s and accuracy above it." },
          { t: "p", text: "That generalises: prompts accumulate scaffolding over time, and a migration is partly an archaeology exercise to find which of it is now obsolete." },
          { t: "p", text: "Which is why the changelog on each prompt version is load-bearing rather than hygiene. You can confidently delete a line whose purpose was recorded; an unexplained line gets kept out of caution, and the cruft compounds." }
        ] },

      { level: "advanced",
        q: "Is 90 days enough?",
        strong: "A strong answer reframes it as continuous.",
        answer: [
          { t: "p", text: "It is, if the schedule has margin built in \u2014 canary complete by day 40, leaving fifty days for the embedding re-index and the fine-tune, and old paths removed at day 85 so the retirement lands on code that has not depended on the old model for a week." },
          { t: "p", text: "It is not, if the notice is where the work starts. A plan with the canary at day 85 has no slack, and the embedding migration alone is dual-write, backfill, threshold re-tuning and a gradual read shift." },
          { t: "p", text: "So I would reframe it: the best version is not a 90-day project but a continuous one. Run the nightly golden-set eval against the *floating alias* in staging, and you meet each new model on your own schedule \u2014 arriving at the deprecation notice with the migration already most of the way done." },
          { t: "p", text: "The other thing that made 90 days workable in the case I know was that the fine-tune could be re-trained in a day, because the data, hyperparameters, base model and eval results had been versioned together. Without that it is a rebuild from nothing inside an already-committed window." }
        ] }
    ]
  }
});
