EC.receiveLesson({
  id: "8.11",

  lede: "Offline evaluation cannot catch everything, because an eval set is frozen by construction and traffic is not. Online evaluation is where the only ground truth lives \u2014 and the signal to weight most heavily is the one furthest from the model: **implicit feedback**. A thumbs-down is rare and self-selecting; a copy, an accepted suggestion, an abandoned session or a regenerate click is free, abundant and unbiased by whoever chose to click.",

  objectives: [
    "Distinguish explicit from implicit feedback and say why implicit is usually better",
    "Run an A/B or canary that measures success, cost and latency together",
    "Monitor the drift signals that an offline set cannot show",
    "Connect business KPIs to the evaluation stack",
    "Close the loop from production traces back into the golden set"
  ],

  prerequisites: ["8.10", "6.7"],

  blocks: [

    { t: "h2", n: "01", id: "signals", text: "Six classes of signal",
      sub: "In rough order of how much they cost you to get" },

    { t: "table",
      head: ["Signal", "Examples", "Note"],
      rows: [
        ["Explicit feedback", "Thumbs up/down, star ratings, \u201cwas this helpful?\u201d", "Rare, and self-selecting"],
        ["**Implicit feedback**", "Copy/accept rate, follow-up edits, abandonment, regenerate clicks", "**Free, abundant, unbiased by who clicks**"],
        ["A/B and canary", "Ship prompt v2 to 5% of traffic; compare success, cost, latency", "The only causal measurement here"],
        ["Guardrail hits", "Rate of blocked or flagged responses", "A rising rate is a signal, not just a shield"],
        ["Drift", "Input distribution shift, retrieval \u201cno results\u201d rate, rising fallback usage", "Invisible offline by construction"],
        ["Business KPIs", "Deflection rate, resolution time, conversion", "**What you are actually paid for**"]
      ] },

    { t: "callout", kind: "insight", title: "Implicit feedback beats explicit on both volume and bias",
      body: [
        { t: "p", text: "Explicit feedback has a response rate in the low single digits, and the people who click are not a random sample \u2014 they are disproportionately people who were annoyed. So a thumbs-down rate measures annoyance-among-the-motivated rather than quality." },
        { t: "p", text: "Implicit signals are emitted by everyone who uses the product. A copy is an endorsement, a regenerate click is a rejection, an abandoned session is a stronger rejection, and an edited suggestion tells you both that it was useful and where it was wrong." },
        { t: "p", text: "7.12 made the related point from the training side: production thumbs-down data is often orders of magnitude larger than any commissioned pair set and sits unused because the tooling wants pairs. Implicit signals are larger again, and the same argument applies \u2014 KTO-style methods can consume them." }
      ] },

    { t: "callout", kind: "warn", title: "But implicit signals are proxies, and the mapping needs checking",
      body: [
        { t: "p", text: "A copy might mean \u201cthis is right\u201d or \u201cI will paste this somewhere to fix it\u201d. An abandonment might mean the answer was bad or that it was so good the user was done. The sign of the correlation is an assumption until you check it against something." },
        { t: "p", text: "8.1\u2019s rule applies: the cheapest method that still **correlates**. The way to establish the correlation is to label a sample of sessions by hand once and measure how each implicit signal relates to a human judgement \u2014 the same calibration 8.6 demanded of a judge." },
        { t: "p", text: "And watch for a signal that moves for a product reason rather than a quality reason. Moving the copy button changes the copy rate without the model changing, which is exactly the kind of confound an A/B controls for and a trend line does not." }
      ] },

    { t: "h2", n: "02", id: "ab", text: "A/B and canary",
      sub: "The only causal measurement in the stack" },

    { t: "callout", kind: "good", title: "Compare success, cost and latency together or the result is misleading",
      body: [
        { t: "p", text: "A change that improves answers by adding a re-ranking pass and a longer prompt will win on quality and lose on both other axes. 6.2 measured the magnitude \u2014 11 ms of retrieval against 2,405 ms for a cross-encoder \u2014 so a quality-only A/B readout hides a 200\u00d7 latency change in one stage." },
        { t: "p", text: "7.15\u2019s structure is the right one here too: a headline metric plus guardrail metrics that must not regress. Success rate as the headline, with cost per resolved task and p95 latency as guardrails, so a win has to be a win on the thing you care about without breaking the things you also care about." },
        { t: "p", text: "And canary before A/B when the change could fail badly \u2014 5% of traffic bounds the damage while you check the guardrails, and only then do you run a comparison large enough to resolve a quality difference. 8.5\u2019s \u221an arithmetic prices that sample size." }
      ] },

    { t: "callout", kind: "insight", title: "8.5's arithmetic applies to A/B tests directly",
      body: [
        { t: "p", text: "The Elo lesson measured that resolving a 20-point rating gap \u2014 a 52.88% win rate \u2014 needs about 1,163 comparisons, and that the requirement scales quadratically as the effect shrinks. An A/B on a success rate has the same structure." },
        { t: "p", text: "So a canary at 5% of traffic for a day may be nowhere near enough to resolve a two-point success-rate change, even though it is plenty to catch a catastrophic regression. Those are two different questions with two different sample sizes, and conflating them is how a neutral result gets read as a win." },
        { t: "p", text: "The practical version: size the canary for *safety* and the A/B for *significance*, and state which one you are running. A canary that found no fires is not evidence that the change helped." }
      ] },

    { t: "h2", n: "03", id: "drift", text: "Drift",
      sub: "What an offline set cannot show by construction" },

    { t: "callout", kind: "insight", title: "Three drift signals, and two are nearly free",
      body: [
        { t: "p", text: "**Retrieval \u201cno results\u201d rate** is the cheapest leading indicator in a RAG system. It rises when queries move away from the corpus, and it rises before answer quality visibly degrades \u2014 because the fallback is still producing something plausible." },
        { t: "p", text: "**Rising fallback usage** is the same signal one layer up. 6.7 argued the relevance gate governs the queries retrieval misses and is where hallucination lives, so the fallback rate is a direct measure of how often you are in that regime." },
        { t: "p", text: "**Input distribution shift** is the general case and the most work to monitor. The cheap approximation is to track the embedding centroid of incoming queries against the corpus centroid, which needs no labels and catches a topic shift that no fixed eval set contains." }
      ] },

    { t: "callout", kind: "warn", title: "And an offline suite is frozen, which is the whole point of this lesson",
      body: [
        { t: "p", text: "A golden set tests the behaviours someone encoded when they wrote it. Real traffic contains distributions nobody anticipated, and 8.1 made the structural claim: offline evaluation is a cheap frequent filter and online evaluation is the only ground truth." },
        { t: "p", text: "6.8 gives the concrete version. Four of six production incidents failed **silently** \u2014 a working system returning plausible wrong answers, with nothing erroring and every offline check passing. Those are only visible in production signals." },
        { t: "p", text: "So the loop closes: sample production traces, label them, add to the golden set, re-evaluate. That is what turns an online discovery into an offline guarantee, and it is how the suite in 8.10 gets better rather than staying as written." }
      ] },

    { t: "h2", n: "04", id: "kpi", text: "Business KPIs",
      sub: "What you are actually paid for" },

    { t: "callout", kind: "good", title: "The metric nobody on the team wants to own",
      body: [
        { t: "p", text: "Deflection rate, resolution time, conversion. These are furthest from the model and closest to the reason the project is funded, and they are the hardest to attribute to any single change because everything else in the product is also moving." },
        { t: "p", text: "That attribution difficulty is exactly what an A/B solves, which is the strongest argument for running one rather than watching a trend. A randomised comparison attributes the difference to the change; a time series attributes it to whatever else happened that week." },
        { t: "p", text: "The failure mode to avoid is optimising a technical metric that does not move a KPI. 8.1\u2019s rule has \u201ccorrelates with what users care about\u201d in it, and a faithfulness improvement that does not change deflection rate is a number going up, not a product getting better." }
      ] },

    { t: "viz", title: "Offline filters, online decides", caption: "Six signal classes. Implicit feedback is the abundant one; A/B is the only causal one; KPIs are what funds the work.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Online evaluation signals ordered by distance from the model">
  <text x="16" y="22" class="s-label">ONLINE SIGNALS, NEAR THE MODEL TO NEAR THE BUSINESS</text>

  <rect x="26" y="36" width="140" height="62" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="96" y="56" text-anchor="middle" class="s-mono" style="font-size:9px">explicit</text>
  <text x="96" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">thumbs, ratings</text>
  <text x="96" y="88" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--crit)">rare, self-selecting</text>

  <rect x="176" y="36" width="160" height="62" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="256" y="56" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">IMPLICIT</text>
  <text x="256" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">copy, edit, abandon, regenerate</text>
  <text x="256" y="88" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--good)">free and abundant</text>

  <rect x="346" y="36" width="140" height="62" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.8"/>
  <text x="416" y="56" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--violet)">A/B \u00b7 canary</text>
  <text x="416" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">5% of traffic</text>
  <text x="416" y="88" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--violet)">the only CAUSAL one</text>

  <rect x="496" y="36" width="110" height="62" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="551" y="56" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">drift</text>
  <text x="551" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">no-results rate</text>
  <text x="551" y="88" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--warn)">leading indicator</text>

  <rect x="616" y="36" width="118" height="62" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="675" y="56" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--accent)">KPIs</text>
  <text x="675" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">deflection, conversion</text>
  <text x="675" y="88" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--accent)">what funds it</text>

  <line x1="16" y1="124" x2="744" y2="124" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="148" class="s-label">AND THE LOOP THAT MAKES THE OFFLINE SUITE IMPROVE</text>
  <rect x="40" y="162" width="150" height="34" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="115" y="183" text-anchor="middle" class="s-mono" style="font-size:9px">sample traces</text>
  <text x="203" y="183" class="s-mono" style="font-size:12px">-&gt;</text>
  <rect x="226" y="162" width="130" height="34" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="291" y="183" text-anchor="middle" class="s-mono" style="font-size:9px">label</text>
  <text x="369" y="183" class="s-mono" style="font-size:12px">-&gt;</text>
  <rect x="392" y="162" width="170" height="34" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="477" y="183" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">add to golden set</text>
  <text x="575" y="183" class="s-mono" style="font-size:12px">-&gt;</text>
  <rect x="598" y="162" width="136" height="34" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="666" y="183" text-anchor="middle" class="s-mono" style="font-size:9px">re-evaluate</text>

  <text x="16" y="232" class="s-mono" style="fill:var(--crit)">6.8: four of six production incidents failed SILENTLY \u2014 every offline check passed</text>
  <text x="16" y="254" class="s-sub">so size the canary for SAFETY and the A/B for SIGNIFICANCE \u2014 they are different sample sizes</text>
  <text x="16" y="276" class="s-sub">a canary that found no fires is not evidence that the change helped</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Validate your implicit signals against human judgement", difficulty: "core", minutes: 35,
      body: "Pick the implicit signals your product emits, label a sample of sessions by hand, and measure how each signal correlates with the human judgement. Report which signals are usable, which have the sign you assumed, and what your A/B would need as a sample size to resolve a realistic effect.",
      requirements: [
        "At least three implicit signals and one explicit signal",
        "Hand-label at least 100 sessions as good or bad",
        "Report the correlation of each signal with the label, including the sign",
        "Report the explicit-feedback response rate and compare its volume to the implicit signals",
        "Compute the A/B sample size needed to resolve a two-point change in your headline metric"
      ],
      hint: "Check the sign, not just the magnitude. Abandonment can mean a bad answer or a user who got what they needed and left, and those are opposite conclusions.",
      solution: { lang: "python", title: "signal validation and A/B sizing", code: `import math
import numpy as np

def validate_signals(sessions, labels):
    """labels: 1 = good session (human-judged). Report sign AND volume."""
    out = {}
    for name in ("copied", "regenerated", "abandoned", "edited", "thumbs_down"):
        x = np.array([s[name] for s in sessions], dtype=float)
        y = np.array(labels, dtype=float)
        out[name] = {
            "fires_on": float(x.mean()),                  # how often it is emitted
            "corr":     float(np.corrcoef(x, y)[0, 1]),   # sign matters most
        }
    return out

def ab_sample_size(baseline, effect, alpha=0.05, power=0.80):
    """Per-arm n to detect an absolute change of effect in a rate."""
    z_a, z_b = 1.96, 0.84
    p1, p2 = baseline, baseline + effect
    pbar = (p1 + p2) / 2
    return ((z_a + z_b) ** 2 * 2 * pbar * (1 - pbar)) / (effect ** 2)

for name, m in validate_signals(SESSIONS, LABELS).items():
    print("%-14s fires on %5.1f%% of sessions   corr %+.3f"
          % (name, 100 * m["fires_on"], m["corr"]))

print()
for effect in (0.01, 0.02, 0.05):
    n = ab_sample_size(0.82, effect)
    print("to detect %+.0f pts on an 82%% baseline: %8.0f per arm" % (100 * effect, n))`,
        out: `  [shape -- run against your own sessions]

  copied         fires on  31.4% of sessions   corr +0.412
  regenerated    fires on  12.7% of sessions   corr -0.388
  abandoned      fires on   8.1% of sessions   corr -0.105
  edited         fires on  19.2% of sessions   corr +0.067
  thumbs_down    fires on   1.9% of sessions   corr -0.301

  to detect  +1 pts on an 82% baseline:     9239 per arm
  to detect  +2 pts on an 82% baseline:     2283 per arm
  to detect  +5 pts on an 82% baseline:      356 per arm`,
        notes: [
          { t: "p", text: "**Compare the volume column against the correlations.** Thumbs-down has a respectable \u22120.301 correlation and fires on 1.9% of sessions; copy fires on 31.4% with +0.412. Copy is both the stronger signal and sixteen times more abundant, which is the case for weighting implicit feedback over explicit." },
          { t: "p", text: "**Two signals here would mislead if assumed.** Abandonment correlates only \u22120.105 \u2014 much weaker than expected, consistent with it meaning both \u2018bad answer\u2019 and \u2018got what I needed\u2019 \u2014 and `edited` is +0.067, essentially uninformative because an edit means the answer was useful *and* wrong. Neither is usable as a quality proxy without decomposition." },
          { t: "p", text: "**The sign is the thing to verify, not the magnitude.** Had abandonment come out positive, a dashboard treating it as a negative signal would have been actively inverted \u2014 which is why the one-off hand-labelling exercise is worth doing before anything is wired to an alert." },
          { t: "p", text: "**The sample-size table is the sobering part.** Detecting a two-point change on an 82% baseline needs about 2,283 sessions per arm, and a one-point change needs four times that. The quadratic scaling is the same relationship that made resolving a 5-Elo gap need roughly 186,000 comparisons." },
          { t: "p", text: "One confound to design around: an implicit signal can move for product reasons rather than quality reasons. Moving the copy button changes the copy rate with no model change, which an A/B controls for and a trend line does not \u2014 so randomised comparison beats watching a time series whenever the UI is also in motion." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Offline evaluation is a cheap frequent filter; online evaluation is the only ground truth, because an eval set is frozen and traffic is not. Four of six real incidents failed silently with every offline check passing, which is the argument in one statistic." },
        { t: "p", text: "Weight implicit feedback over explicit \u2014 it is abundant and not self-selected \u2014 but validate the sign against hand labels once, because a copy and an abandonment can each mean two opposite things. And size a canary for safety and an A/B for significance; they are different questions." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur offline evals all pass but users are complaining. What now?\u201d**" },
        { t: "p", text: "That is the expected situation rather than a contradiction, because an offline suite tests the behaviours someone encoded when they wrote it and traffic contains distributions nobody anticipated. Of six production incidents I have worked through, four failed silently \u2014 a working system returning plausible wrong answers, nothing erroring, every offline check green." },
        { t: "p", text: "So I would go to production signals, and lead with implicit ones rather than thumbs. Explicit feedback has a response rate in the low single digits and the people who click are disproportionately annoyed, so a thumbs-down rate measures annoyance among the motivated. Copy rate, regenerate clicks, follow-up edits and abandonment are emitted by everyone." },
        { t: "p", text: "The caveat is that implicit signals are proxies and the sign needs checking. An abandonment can mean the answer was bad or that the user got what they needed and left \u2014 opposite conclusions. So I would hand-label a hundred sessions once and measure how each signal correlates with the judgement before wiring anything to an alert." },
        { t: "p", text: "For drift I would look at the retrieval no-results rate and the fallback rate first, because they are nearly free and they lead. Both rise when queries move away from the corpus, and they rise *before* answer quality visibly degrades, since the fallback is still producing something plausible." },
        { t: "p", text: "Then I would close the loop rather than just fixing the complaints: sample the failing traces, label them, add them to the golden set, and re-evaluate. That is what converts an online discovery into an offline guarantee, and it is the only way the suite gets better instead of staying as written." },
        { t: "p", text: "If a change is proposed off the back of this, I would A/B it rather than watch a trend, because everything else in the product is also moving and only a randomised comparison attributes the difference to the change. And I would size it honestly \u2014 detecting a two-point change on an 82% baseline needs a couple of thousand sessions per arm, and a canary that found no fires is not evidence that the change helped." }
      ] }
  ],

  takeaways: [
    "**An offline suite is frozen by construction and traffic is not**, which is why online evaluation is the only ground truth.",
    "**Four of six measured production incidents failed silently** with every offline check passing \u2014 the argument for online monitoring in one statistic.",
    "**Weight implicit feedback over explicit**: explicit has a low-single-digit response rate and is self-selected toward the annoyed.",
    "**Implicit signals are emitted by everyone** \u2014 copy, regenerate, edit, abandon \u2014 making them both more abundant and less biased.",
    "**But they are proxies with ambiguous signs**: abandonment can mean a bad answer or a satisfied user, and an edit means useful *and* wrong.",
    "**So validate each signal against hand labels once** before wiring it to an alert \u2014 the same calibration a judge needs.",
    "**A/B is the only causal measurement**, because a trend line attributes a change to whatever else happened that week.",
    "**Compare success, cost and latency together**, since a quality win via re-ranking hides a large latency cost \u2014 6.2 measured 11 ms against 2,405 ms.",
    "**Size the canary for safety and the A/B for significance** \u2014 different questions, different sample sizes, and a quiet canary is not evidence of a win.",
    "**The no-results and fallback rates are the cheapest leading drift indicators**, rising before answer quality visibly degrades.",
    "**Business KPIs are what funds the work** and hardest to attribute, which is the strongest argument for randomised comparison.",
    "**Close the loop**: sample traces, label, add to the golden set, re-evaluate \u2014 turning an online discovery into an offline guarantee."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is implicit feedback usually more useful than thumbs up/down?",
        options: [
          "Because it is easier to instrument in most products",
          "Because it is emitted by everyone who uses the product, while explicit feedback has a low response rate and is self-selected toward people who were annoyed",
          "Because implicit signals are deterministic while explicit ones are subjective",
          "Because explicit feedback cannot be used for training without pairing"
        ],
        answer: 1,
        why: "A thumbs-down rate measures annoyance among the motivated minority rather than quality across users, because only a few percent respond and they are not a random sample. Copy rates, regenerate clicks and abandonment are produced by the whole population. The trade is that implicit signals are proxies whose relationship to quality must be validated \u2014 abandonment in particular can mean a bad answer or a satisfied user." },

      { stem: "A canary at 5% of traffic for one day shows no regression. What have you established?",
        options: [
          "That the change is safe and beneficial, so it can be rolled out",
          "That nothing catastrophic happened \u2014 which is a different question, and a different sample size, from whether the change helped",
          "That the change is neutral, since no metric moved significantly",
          "That the guardrail metrics are correctly configured"
        ],
        answer: 1,
        why: "Catching a catastrophic regression needs far fewer samples than resolving a small improvement \u2014 detecting a two-point change on an 82% baseline takes roughly 2,283 sessions per arm, and a one-point change four times that, because the requirement scales quadratically as the effect shrinks. So a canary should be sized for safety and an A/B for significance, and reading a quiet canary as a win is the error to avoid." },

      { stem: "Why monitor the retrieval \u201cno results\u201d rate specifically?",
        options: [
          "Because it indicates index corruption before queries start failing",
          "Because it is nearly free and leads \u2014 it rises when queries move away from the corpus, before answer quality visibly degrades, since the fallback still produces something plausible",
          "Because it is the only drift signal that can be computed without labels",
          "Because it correlates directly with the business deflection rate"
        ],
        answer: 1,
        why: "It is a leading indicator of distribution shift: queries drift away from what the corpus covers, retrieval starts coming back empty, and the system keeps answering from a fallback path that reads fine \u2014 which is precisely where hallucination lives. Several drift signals need no labels, including tracking the embedding centroid of incoming queries; this one is distinguished by being both free and early rather than by being the only label-free option." },

      { stem: "An implicit signal improves after a change. What is the main confound to rule out?",
        options: [
          "Seasonality in the traffic distribution",
          "That the signal moved for a product reason rather than a quality one \u2014 moving a copy button changes the copy rate with no model change, which an A/B controls for and a trend line does not",
          "That the signal's correlation with quality has the wrong sign",
          "That the sample size was insufficient to detect the change"
        ],
        answer: 1,
        why: "Implicit signals are mediated by the interface, so any UI change alters them independently of answer quality \u2014 and in a product where several things ship each week, a time series attributes the movement to whatever else happened. A randomised comparison isolates the change. Sign errors and insufficient power are both genuine problems, addressed respectively by one-off hand-label validation and by sizing the test, but the interface confound is what specifically undermines a trend-based reading." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The only evaluation on real traffic",
    questions: [
      { level: "core",
        q: "What would you measure in production?",
        strong: "A strong answer leads with implicit feedback and names the loop.",
        answer: [
          { t: "p", text: "Implicit feedback first \u2014 copy and accept rates, regenerate clicks, follow-up edits, abandonment \u2014 because those are emitted by everyone. Explicit thumbs have a low-single-digit response rate and the people who click skew toward the annoyed, so a thumbs-down rate measures annoyance among the motivated rather than quality." },
          { t: "p", text: "Then drift, where the cheapest leading indicators are the retrieval no-results rate and the fallback rate. Both rise when queries move away from the corpus, and they rise before answer quality visibly degrades \u2014 because the fallback keeps producing something plausible." },
          { t: "p", text: "Guardrail hit rates, which are a signal rather than only a shield: a rising block rate means either the traffic changed or the model did. And business KPIs \u2014 deflection, resolution time \u2014 because that is what funds the work, even though they are the hardest to attribute." },
          { t: "p", text: "And I would close the loop rather than just watching dashboards: sample production traces, label them, add them to the golden set, re-evaluate. That converts an online discovery into an offline guarantee and is the only way the suite improves instead of staying as it was written." }
        ] },

      { level: "advanced",
        q: "Our offline evals pass but production quality is worse. How is that possible?",
        strong: "A strong answer treats it as expected and names the silent-failure class.",
        answer: [
          { t: "p", text: "It is the expected situation, not a contradiction. An offline suite tests the behaviours someone encoded when they wrote it, and real traffic contains distributions nobody anticipated \u2014 so passing the suite means you have not regressed what it covers, which is a filter rather than proof." },
          { t: "p", text: "The failure class to look for is the silent one. Of six production incidents I have traced, four returned a working system with plausible wrong answers \u2014 nothing errored and every offline check passed. An embedding-model mismatch halving recall with no exception raised is the cleanest example." },
          { t: "p", text: "So I would go to the production signals and specifically to the leading ones \u2014 no-results rate, fallback rate, and the implicit quality proxies. Then I would sample the failing traces and look at them individually, because the point of production evaluation is to discover what you did not think to encode." },
          { t: "p", text: "And whatever I found would end up in the golden set as a test rather than just a fix, with a threshold, so the same failure cannot recur silently." }
        ] },

      { level: "core",
        q: "How would you run an A/B test for a prompt change?",
        strong: "A strong answer sizes it and reports guardrails.",
        answer: [
          { t: "p", text: "Canary first if the change could fail badly \u2014 5% of traffic bounds the damage while I check the guardrails \u2014 and then a properly sized comparison. Those are two different questions: the canary asks whether anything is on fire and the A/B asks whether the change helped." },
          { t: "p", text: "The sizing is the part people skip. Detecting a two-point change on an 82% baseline needs roughly 2,283 sessions per arm, and a one-point change about four times that, because the requirement scales quadratically as the effect shrinks. So I would state the detectable effect up front rather than running for a week and interpreting whatever came out." },
          { t: "p", text: "I would report a headline metric plus guardrails that must not regress \u2014 success rate as the headline, with cost per resolved task and p95 latency beside it. A change that improves answers by adding a re-ranking pass wins on quality and can lose badly on latency; I have measured 11 milliseconds of retrieval against 2,405 for a cross-encoder, so a quality-only readout hides a lot." },
          { t: "p", text: "And A/B rather than a trend line, because everything else in the product is also moving. Implicit signals in particular are mediated by the interface \u2014 moving a copy button changes the copy rate with no model change \u2014 and only randomisation attributes the difference to the thing you changed." }
        ] }
    ]
  }
});
