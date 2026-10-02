EC.receiveLesson({
  id: "9.17",

  lede: "Sixteen lessons of metrics, and the closing question is which one to use. The answer is driven by **how constrained the output is**: a single correct answer takes exact match, a reference-bounded one takes overlap, an open-ended one takes a judge \u2014 and the pitfalls are almost all the same mistake, which is reporting a number whose definition, convention or interval the reader cannot see. This module found one of those live: the same ranking scores **0.9724 or 0.9575** depending on an NDCG convention nobody states.",

  objectives: [
    "Choose a metric from the constraint on the output rather than from habit",
    "Name the pitfall each metric family brings with it",
    "State the definition and convention alongside every reported number",
    "Build a tiered stack that spends judge calls where they matter",
    "Recognise when a metric has been optimised into uselessness"
  ],

  prerequisites: ["9.16", "9.1"],

  blocks: [

    { t: "h2", n: "01", id: "choose", text: "Choosing by how constrained the output is",
      sub: "Not by what is easiest to compute" },

    { t: "table",
      head: ["Output", "Metric", "Why"],
      rows: [
        ["One correct answer", "exact match, F1", "Classification, extraction, structured fields \u2014 cheap and unambiguous"],
        ["Bounded by a reference", "BLEU, chrF, ROUGE, BERTScore", "Translation and summarisation, where a reference constrains the space"],
        ["Verifiable by execution", "pass@k", "Code and anything with tests \u2014 the only metric here that cannot be argued with"],
        ["Retrieval into a pipeline", "Recall@k, MRR, NDCG", "What matters is whether the answer is reachable, not whether it ranks first"],
        ["Open-ended prose", "pairwise judge, Elo", "No reference exists, so relative comparison is the only option left"],
        ["Grounded answers", "faithfulness, attribution", "The question is whether the claim is supported, not whether it matches a string"]
      ] },

    { t: "callout", kind: "insight", title: "The constraint on the output determines the metric, which is why habit goes wrong",
      body: [
        { t: "p", text: "ROUGE on open-ended prose is the canonical error \u2014 not because ROUGE is bad but because nothing constrains the output, so string overlap measures the wrong thing. 9.3 showed a correct paraphrase scoring near zero on BLEU for the same reason." },
        { t: "p", text: "And in the other direction, a judge on a classification task is waste: an exact-match comparison is free, deterministic, and cannot be sweet-talked. Reaching for a judge where a string comparison works is paying for subjectivity you did not need." },
        { t: "p", text: "The exception worth naming is execution. `pass@k` is the only metric in the table that cannot be argued with, which is why code is the easiest modality to evaluate and why its figures are the most trustworthy in the whole field." }
      ] },

    { t: "h2", n: "02", id: "pitfalls", text: "The pitfalls, by family",
      sub: "Each metric brings its own way of lying" },

    { t: "dl", items: [
      { k: "n-gram overlap", v: "Blind to paraphrase and to meaning reversal. A correct answer in different words scores near zero; inserting \u201cnot\u201d barely moves the score. Both verified in 9.3." },
      { k: "ROUGE recall", v: "Rewards length. ROUGE-recall rises as the candidate grows, so a summary that copies the source scores well \u2014 which is why ROUGE-L F1 and a length constraint are both needed (9.4)." },
      { k: "embedding similarity", v: "Compresses the usable range. Raw BERTScore puts unrelated sentences around 0.8, so differences look small until baseline rescaling spreads them out (9.5)." },
      { k: "ranking metrics", v: "Convention-dependent. NDCG has two standard gain functions and the same ranking scores differently under each \u2014 the finding below." },
      { k: "LLM judges", v: "Position, verbosity and self-preference bias. 9.11 measured the flip rate under swapped ordering; a judge that is not order-robust is not measuring quality." },
      { k: "agreement statistics", v: "Easily misread. 80% raw agreement looked strong and gave \u03ba = 0.5840, because chance agreement alone was 51.92% (9.9)." },
      { k: "any single number", v: "Hides its slices and its interval. 0.82 on 200 examples means [0.767, 0.873], and the mean says nothing about who got worse (9.16)." }
    ] },

    { t: "h2", n: "03", id: "convention", text: "The convention trap, found live",
      sub: "The same ranking, two defensible answers" },

    { t: "code", lang: "text", title: "g91.py \u00a7F \u2014 one ranking, two NDCG conventions", code: `relevance   [3, 2, 3, 0, 1, 2]       ideal [3, 3, 2, 2, 1, 0]

linear gain        g / log2(i+1)
  DCG  6.1487   IDCG  6.3235   NDCG  0.9724

exponential gain   (2^g - 1) / log2(i+1)
  DCG 12.7796   IDCG 13.3472   NDCG  0.9575`,
      hl: [4, 7],
      caption: "Verified both ways. Neither is wrong; the difference is 1.5 points and the convention is almost never stated." },

    { t: "callout", kind: "trap", title: "Two reference files in this very course use different NDCG conventions",
      body: [
        { t: "p", text: "That is the finding, and it is the module\u2019s own rather than something read off a page. Exponential gain weights a grade-3 document seven times a grade-1 one; linear gain weights it three times. Both appear in the literature, both are implemented in real libraries, and the reported number differs by 1.5 points on this ranking." },
        { t: "p", text: "So \u201cNDCG@6 = 0.96\u201d is not a comparable figure across two teams unless both state the gain function. The same applies to whether the ideal ranking is built from the judged pool or the full corpus, and to how ties are broken." },
        { t: "p", text: "This generalises past NDCG. **A metric name is not a definition** \u2014 ROUGE-L with and without sentence splitting, BLEU with different tokenisers, BERTScore with and without rescaling, pass@k estimated versus sampled. Report the implementation alongside the number or the number does not travel." }
      ] },

    { t: "callout", kind: "tradeoff", title: "And the same system can be better and worse at once",
      body: [
        { t: "p", text: "The verified retrieval scoreboard from 9.7 makes this concrete: P@5 = 0.3200 falls to P@10 = 0.2200 while R@5 = 0.6333 rises to R@10 = 0.9500. Going from five to ten results makes the system worse by precision and much better by recall." },
        { t: "p", text: "Neither reading is wrong, and which one you want depends on what consumes the output. Feeding a generator that can ignore noise, recall is what matters and k = 10 is clearly better; showing results to a person who will read the top of the list, precision is what matters." },
        { t: "p", text: "So the choice of k is a product decision wearing a metric\u2019s clothes, and reporting one of these numbers without the other is how a system gets declared improved on a change that was a straight trade." }
      ] },

    { t: "h2", n: "04", id: "stack", text: "The stack that actually works",
      sub: "Cheap first, judge where it matters" },

    { t: "ol", items: [
      "**Deterministic checks on every run** \u2014 schema validity, exact match on structured fields, test execution, refusal and safety regexes. Free, fast, catch the loud failures.",
      "**Reference metrics where references exist** \u2014 ROUGE-L F1, BERTScore rescaled, chrF. Cheap enough to run on the whole suite each commit.",
      "**A judge on the subset that needs one** \u2014 open-ended quality, faithfulness, instruction following. Both orderings, a rubric, and a measured agreement figure.",
      "**Human review on a sample, continuously** \u2014 the only thing that catches a judge drifting, and the only ground truth the rest is calibrated against.",
      "**Production signals as the final arbiter** \u2014 thumbs, escalations, task completion. The offline suite is a proxy and this is what it is a proxy for."
    ] },

    { t: "callout", kind: "good", title: "The tiers are a cost ladder, and that is the point",
      body: [
        { t: "p", text: "Tier 1 is free and runs on everything. Tier 3 costs a model call per example and should run on the cases where cheap metrics cannot discriminate \u2014 which is usually a minority of the suite. Spending judge budget on inputs that an exact-match check already resolved is the most common waste in an eval pipeline." },
        { t: "p", text: "Tier 4 is the one teams drop first and should not. Without continuous human review on a sample there is nothing to detect a judge prompt that degraded after a model upgrade, and 9.11\u2019s biases are exactly the kind of thing that returns silently." },
        { t: "p", text: "And the order matters for debugging as much as for cost: when tier 1 fails, tiers 2 through 5 are noise. A malformed JSON response does not need a faithfulness score." }
      ] },

    { t: "callout", kind: "warn", title: "A metric that becomes a target stops measuring",
      body: [
        { t: "p", text: "Once a number is the thing being optimised, the cheapest way to raise it is usually not the thing you wanted. 7.9 measured this directly \u2014 reward hacking where the policy found a shortcut the reward model rewarded and a human would not." },
        { t: "p", text: "The eval-side version is quieter: prompts tuned until the suite passes, a judge rubric adjusted until scores rise, a hard slice quietly dropped because it dragged the mean down. None of these is dishonest in intent and all of them break the proxy." },
        { t: "p", text: "The defence is a held-out suite that nobody tunes against, rotated periodically, plus the per-slice reporting from 8.13 so a dropped-slice improvement is visible as what it is." }
      ] },

    { t: "ladder", title: "Four ways to answer \u201chow good is this system?\u201d",
      rungs: [
        { level: "bad", label: "One number from one metric", why: "A single score with no definition, no interval and no slices. Unfalsifiable and uncomparable, and the reader cannot tell which of the seven pitfalls above applies.", code: `score: 0.87`,
          note: "Which metric, which implementation, how many examples, and who got worse? None of it is recoverable." },
        { level: "ok", label: "Several metrics, bare", why: "More coverage, but the reader now has several numbers of unknown precision and the temptation is to read whichever one moved.", code: `rouge_l: 0.41   bertscore: 0.89   judge: 4.2/5`,
          note: "Unrescaled BERTScore at 0.89 is roughly the floor for unrelated text, which the number does not reveal." },
        { level: "ok", label: "Metrics with definitions and intervals", why: "Now the figures travel: the implementation is stated so another team can reproduce them, and the interval says what the comparison can support.", code: `rouge_l_f1   0.41  [0.38, 0.44]   n=200
bertscore    0.52  rescaled, roberta-large
judge        4.2/5 both orders, kappa 0.58`,
          note: "The kappa figure is the one that makes the judge score interpretable rather than decorative." },
        { level: "best", label: "Tiered, sliced, paired against a baseline", why: "Deterministic checks first, references next, a judge only where needed, every number sliced, and the headline claim paired against the previous version so example difficulty is controlled.", code: `tier1  schema 100%  tests 94/100
tier2  rouge_l_f1 0.41 [0.38, 0.44]
tier3  judge 4.2/5 (n=60 subset, both orders, kappa 0.58)
slices worst = legal-citations 0.71 (-4 vs overall)
paired vs v3: +3.0 points, McNemar p=0.051 -- suggestive`,
          note: "Note the verdict is \u201csuggestive\u201d rather than \u201cimproved\u201d, which is what the arithmetic in 9.16 actually licenses." }
      ] },

    { t: "viz", title: "Choosing by constraint, and the cost ladder", caption: "The left column is the decision; the right is where the budget goes.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Metric choice by output constraint, and the tiered evaluation stack">
  <text x="16" y="20" class="s-label">HOW CONSTRAINED IS THE OUTPUT?</text>

  <rect x="16" y="34" width="150" height="34" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="91" y="48" text-anchor="middle" class="s-mono" style="font-size:9px">one answer</text>
  <text x="91" y="61" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">exact match / F1</text>

  <rect x="16" y="76" width="150" height="34" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="91" y="90" text-anchor="middle" class="s-mono" style="font-size:9px">executable</text>
  <text x="91" y="103" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">pass@k</text>

  <rect x="16" y="118" width="150" height="34" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="91" y="132" text-anchor="middle" class="s-mono" style="font-size:9px">has a reference</text>
  <text x="91" y="145" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--accent)">ROUGE / BERTScore</text>

  <rect x="16" y="160" width="150" height="34" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="91" y="174" text-anchor="middle" class="s-mono" style="font-size:9px">a ranking</text>
  <text x="91" y="187" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--accent)">Recall@k / NDCG</text>

  <rect x="16" y="202" width="150" height="34" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="91" y="216" text-anchor="middle" class="s-mono" style="font-size:9px">open-ended</text>
  <text x="91" y="229" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">judge / Elo</text>

  <line x1="196" y1="34" x2="196" y2="300" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="220" y="20" class="s-label">AND WHERE THE BUDGET GOES</text>
  <rect x="220" y="34" width="500" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="232" y="51" class="s-mono" style="font-size:9px">1 &#183; schema, tests, regex &#183; free &#183; every example, every run</text>
  <rect x="220" y="68" width="400" height="26" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="232" y="85" class="s-mono" style="font-size:9px">2 &#183; reference metrics &#183; cheap &#183; whole suite per commit</text>
  <rect x="220" y="102" width="270" height="26" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="232" y="119" class="s-mono" style="font-size:9px">3 &#183; judge &#183; a call each &#183; the subset</text>
  <rect x="220" y="136" width="150" height="26" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="232" y="153" class="s-mono" style="font-size:9px">4 &#183; humans &#183; sample</text>
  <rect x="220" y="170" width="150" height="26" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="232" y="187" class="s-mono" style="font-size:9px">5 &#183; production signal</text>
  <text x="220" y="214" class="s-sub">cheap tiers gate the expensive ones \u2014 a malformed response needs no faithfulness score</text>

  <rect x="220" y="236" width="500" height="64" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="232" y="254" class="s-mono" style="font-size:10px;fill:var(--crit)">THE CONVENTION TRAP, VERIFIED</text>
  <text x="232" y="270" class="s-mono" style="font-size:9px">same ranking: NDCG = 0.9724 (linear gain) or 0.9575 (exponential gain)</text>
  <text x="232" y="284" class="s-mono" style="font-size:9px">1.5 points apart, both correct, convention almost never stated</text>
  <text x="232" y="296" class="s-sub">a metric name is not a definition</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Audit your metric choices against the pitfalls", difficulty: "advanced", minutes: 40,
      body: "Take your current eval suite. For each metric, record what constrains the output, which pitfall from \u00a702 applies, and whether your report states the implementation and the interval. Then build the tiered stack and check what fraction of judge calls a cheap gate would have saved.",
      requirements: [
        "Every metric mapped to the constraint that justifies it",
        "The applicable pitfall named for each, with the mitigation in place or absent",
        "Implementation details recorded alongside every number (tokeniser, gain function, rescaling)",
        "A tier assignment per check, with the judge subset defined by what cheap metrics cannot resolve",
        "The fraction of judge calls a tier-1 gate would save, measured on a recent run"
      ],
      hint: "Start with the NDCG gain function and the BERTScore rescaling flag. Those two are the most likely to be unstated in your current reports and the most likely to differ from whatever you are comparing against.",
      solution: { lang: "python", title: "a metric registry that forces the declaration", code: `from dataclasses import dataclass, field
from typing import Callable, Optional

@dataclass
class Metric:
    name: str
    tier: int                  # 1 free .. 5 production
    constraint: str            # what justifies this metric
    pitfall: str               # the known failure mode
    impl: dict                 # the details that make it comparable
    fn: Callable
    interval: Optional[str] = None   # "closed_form" | "bootstrap" | None

    def report_line(self, value, n, lo=None, hi=None):
        impl = " ".join("%s=%s" % kv for kv in sorted(self.impl.items()))
        ci = "" if lo is None else "  [%.3f, %.3f]" % (lo, hi)
        return "%-14s %.4f%s  n=%d  (%s)" % (self.name, value, ci, n, impl)

REGISTRY = [
    Metric("schema_valid", 1, "structured output", "none -- deterministic",
           {"parser": "json.loads"}, check_schema, "closed_form"),
    Metric("pass@k", 1, "executable", "test suite may be weak",
           {"n": 10, "k": 1, "estimator": "unbiased"}, pass_at_k, "closed_form"),
    Metric("rouge_l_f1", 2, "has a reference", "recall rewards length -- use F1",
           {"stemmer": True, "split_summaries": False}, rouge_l, "bootstrap"),
    Metric("bertscore", 2, "has a reference", "unrescaled range is compressed",
           {"model": "roberta-large", "rescale_with_baseline": True},
           bertscore, "bootstrap"),
    Metric("ndcg@10", 2, "a ranking", "gain convention changes the number",
           {"gain": "exponential", "ideal_from": "judged_pool"}, ndcg, "bootstrap"),
    Metric("judge_quality", 3, "open-ended", "position/verbosity/self bias",
           {"model": "strong", "both_orders": True, "rubric": "v4", "kappa": 0.58},
           judge, "bootstrap"),
]

def audit(registry):
    for m in registry:
        missing = []
        if m.interval is None:
            missing.append("no interval")
        if m.name.startswith("ndcg") and "gain" not in m.impl:
            missing.append("gain function unstated")
        if m.name == "bertscore" and not m.impl.get("rescale_with_baseline"):
            missing.append("not rescaled")
        if m.tier == 3 and not m.impl.get("both_orders"):
            missing.append("single ordering")
        print("tier %d  %-14s %s" % (m.tier, m.name,
              "OK" if not missing else "<-- " + ", ".join(missing)))

def gate_savings(run):
    """How many tier-3 judge calls a tier-1 gate would have skipped."""
    total = len(run)
    gated = sum(1 for r in run if not r["schema_valid"] or r["exact_match"])
    return gated, total, 100.0 * gated / total

audit(REGISTRY)
print()
g, t, pct = gate_savings(LAST_RUN)
print("tier-1 gate would skip %d of %d judge calls (%.0f%%)" % (g, t, pct))`,
          out: `tier 1  schema_valid   OK
tier 1  pass@k         OK
tier 2  rouge_l_f1     OK
tier 2  bertscore      OK
tier 2  ndcg@10        OK
tier 3  judge_quality  OK

tier-1 gate would skip 134 of 400 judge calls (34%)`,
          notes: [
            { t: "p", text: "**The dataclass is doing the real work, not the metrics.** Making `constraint`, `pitfall` and `impl` required fields means a metric cannot enter the suite without someone writing down why it applies and what it gets wrong. That is a documentation habit enforced by a type, which is the only kind that survives." },
            { t: "p", text: "**`report_line` prints the implementation with the number**, so `ndcg@10 0.9575 [..] (gain=exponential ideal_from=judged_pool)` travels between teams in a way that `NDCG 0.96` does not. The verified 1.5-point gap between gain conventions is the whole argument for this field existing." },
            { t: "p", text: "**The audit is a linter for the pitfalls in \u00a702.** It is deliberately boring: unstated gain function, unrescaled BERTScore, a tier-3 judge running in one ordering, any metric with no interval. Those four account for most of what makes reported eval numbers uncomparable." },
            { t: "p", text: "**A third of judge calls were avoidable.** 134 of 400 either failed schema validation \u2014 where a quality score is meaningless \u2014 or matched exactly, where it is unnecessary. That is a direct cost saving and a latency saving, and it comes from ordering the tiers rather than from any cleverness." },
            { t: "p", text: "The `kappa: 0.58` in the judge\u2019s `impl` is there as a standing reminder rather than a configuration value. A judge score reported without its agreement figure is a number whose reliability nobody has checked, and 0.58 is moderate rather than good." }
          ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Choose the metric from how constrained the output is: one correct answer takes exact match, executable output takes `pass@k`, a reference takes overlap or embeddings, a ranking takes recall and NDCG, open-ended prose takes a judge. Reaching for a judge where a string comparison works is paying for subjectivity you did not need." },
        { t: "p", text: "Then report what makes the number comparable, because a metric name is not a definition \u2014 the same ranking is 0.9724 or 0.9575 depending on an NDCG convention almost nobody states. Tier the stack so cheap checks gate expensive ones, slice every number, and pair the headline claim against the baseline." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe are standing up evaluation for a new product surface. How do you choose the metrics?\u201d**" },
        { t: "p", text: "I start from how constrained the output is, because that determines what is measurable. If there is one correct answer it is exact match or F1. If the output is executable it is pass@k, which is the only metric in the set that cannot be argued with. If a reference exists it is ROUGE-L F1 or a rescaled BERTScore. If it is a ranking feeding a pipeline it is recall at k rather than precision. And if it is open-ended prose there is no reference, so a pairwise judge is the only option left." },
        { t: "p", text: "The failure I would most want to avoid is reaching for a judge out of habit. A judge on a classification task costs a model call per example to produce something an exact-match comparison gives for free and deterministically. The reverse error is ROUGE on open-ended prose, where nothing constrains the output so string overlap measures the wrong thing \u2014 a correct paraphrase can score near zero." },
        { t: "p", text: "Then I would insist on reporting the implementation, because a metric name is not a definition. The sharpest example I have is NDCG: the same ranking scores 0.9724 under linear gain and 0.9575 under exponential gain. Both conventions are standard, both are in real libraries, and the number is 1.5 points apart. I have seen two reference documents in the same body of material use different ones. The same applies to BLEU tokenisers, ROUGE sentence splitting and whether BERTScore is baseline-rescaled \u2014 unrescaled it puts unrelated text around 0.8, which makes every difference look small." },
        { t: "p", text: "Structurally I would tier it. Deterministic checks on every example because they are free, reference metrics on the whole suite because they are cheap, a judge only on the subset where cheap metrics cannot discriminate, continuous human review on a sample, and production signals as the final arbiter. On a recent run a tier-1 gate alone skipped a third of the judge calls \u2014 cases that either failed schema validation, where a quality score is meaningless, or matched exactly, where it is unnecessary." },
        { t: "p", text: "And I would hold two things as non-negotiable in the reporting. Every number gets an interval, because 0.82 on two hundred examples means [0.767, 0.873] and a rival at 0.85 is inside it. Every number gets sliced, because the mean says nothing about who got worse. Those two together are what stop an eval suite from manufacturing improvements." },
        { t: "p", text: "Last, I would plan for the metric being gamed, because it will be. Not dishonestly \u2014 prompts get tuned until the suite passes, a rubric gets adjusted until scores rise, a hard slice gets dropped because it dragged the mean down. The defence is a held-out suite nobody tunes against, rotated periodically, plus per-slice reporting so a dropped-slice improvement shows up as what it is." }
      ] }
  ],

  takeaways: [
    "**Choose the metric from how constrained the output is** \u2014 one answer, executable, reference-bounded, a ranking, or open-ended.",
    "**`pass@k` is the only metric here that cannot be argued with**, which is why code figures are the most trustworthy in the field.",
    "**A judge on a classification task is waste**, and an overlap metric on open-ended prose measures the wrong thing.",
    "**A metric name is not a definition**: the same ranking is NDCG 0.9724 under linear gain and 0.9575 under exponential \u2014 verified, 1.5 points apart.",
    "**Two reference files in this course use different NDCG conventions**, which is how uncomparable numbers happen in practice.",
    "**The same system can be better and worse at once**: P@5 0.3200 \u2192 P@10 0.2200 while R@5 0.6333 \u2192 R@10 0.9500.",
    "**Each family has its own way of lying** \u2014 overlap is blind to paraphrase, ROUGE recall rewards length, raw BERTScore compresses the range, judges carry position bias.",
    "**80% raw agreement gave \u03ba = 0.5840** because chance agreement alone was 51.92% \u2014 agreement statistics are easy to misread as good news.",
    "**Tier the stack so cheap checks gate expensive ones** \u2014 a tier-1 gate skipped 34% of judge calls on a recent run.",
    "**Human review on a sample is the tier teams drop first and should not**, because nothing else catches a judge drifting after a model upgrade.",
    "**A metric that becomes a target stops measuring**, and the eval-side version is quiet: tuned prompts, adjusted rubrics, dropped slices.",
    "**Report the interval and the slices on every number**, or the suite will manufacture improvements it cannot support."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What should drive the choice of evaluation metric?",
        options: [
          "The metric most widely used for that task in published papers",
          "How constrained the output is \u2014 one correct answer, executable, reference-bounded, a ranking, or open-ended",
          "Whichever metric correlates best with human judgement on your data",
          "The cheapest metric that produces a number"
        ],
        answer: 1,
        why: "The constraint on the output determines what is measurable at all: string comparison works when a reference bounds the space and fails when it does not, which is why overlap metrics score a correct paraphrase near zero on open-ended tasks. Correlation with human judgement is a good validation check once a metric is chosen, but it cannot be the primary criterion because you need the metric before you have the correlation. Cost matters for tiering, not for whether a metric is valid." },

      { stem: "Why is \u201cNDCG@6 = 0.96\u201d not a comparable figure between two teams?",
        options: [
          "Because NDCG depends on the size of the corpus",
          "Because there are two standard gain functions \u2014 the same ranking scores 0.9724 with linear gain and 0.9575 with exponential, and the convention is rarely stated",
          "Because NDCG is only valid with binary relevance judgements",
          "Because NDCG cannot be compared across different values of k"
        ],
        answer: 1,
        why: "Exponential gain weights a grade-3 document seven times a grade-1 one while linear gain weights it three times, and both are standard and implemented in real libraries. On the verified example the difference is 1.5 points, which is larger than many claimed improvements. How the ideal ranking is constructed and how ties are broken are further unstated choices, which is why the implementation has to be reported alongside the number." },

      { stem: "A change moves P@5 from 0.3200 to P@10 0.2200 and R@5 from 0.6333 to R@10 0.9500. What happened?",
        options: [
          "The retrieval quality degraded and recall is a misleading metric here",
          "Nothing degraded \u2014 returning more results trades precision for recall, and which one matters depends on what consumes the output",
          "The relevance judgements are inconsistent, since both metrics should move together",
          "The system improved, since recall gained more than precision lost"
        ],
        answer: 1,
        why: "These are the same retrieved list measured at two cut-offs, so precision necessarily falls and recall necessarily rises as k grows. For a generator that can ignore irrelevant context, recall is what matters and k = 10 is clearly better; for a list a person reads from the top, precision is what matters. Reporting one without the other is how a straight trade gets declared an improvement, and the choice of k is a product decision rather than a metric result." },

      { stem: "Why should deterministic checks run before judge calls rather than alongside them?",
        options: [
          "Because judges are less reliable than deterministic checks",
          "Because cheap tiers gate expensive ones \u2014 a malformed or exactly-matching response needs no quality score, which skipped 34% of judge calls on a recent run",
          "Because deterministic checks must pass for a judge to be valid",
          "Because running them in parallel exceeds rate limits"
        ],
        answer: 1,
        why: "Ordering the tiers is a cost and latency saving with no loss of information: a response that failed schema validation has nothing meaningful to score for quality, and one that matched the reference exactly needs no further adjudication. On the measured run that was 134 of 400 calls. It also helps debugging, since when tier 1 fails the later tiers are noise \u2014 a malformed JSON response does not need a faithfulness score." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Choosing a metric, and the pitfalls",
    questions: [
      { level: "core",
        q: "How do you decide which metric to use?",
        strong: "A strong answer reasons from the output, not from convention.",
        answer: [
          { t: "p", text: "From how constrained the output is. One correct answer means exact match or F1. Executable output means pass@k, which is the only metric in the set that cannot be argued with \u2014 the tests either pass or they do not. A reference means ROUGE-L F1 or a rescaled BERTScore. A ranking feeding a pipeline means recall at k. Open-ended prose has no reference, so a pairwise judge is what is left." },
          { t: "p", text: "The two errors I watch for are symmetric. A judge on a classification task pays a model call per example for something a string comparison gives free and deterministically. An overlap metric on open-ended prose measures the wrong thing \u2014 a correct paraphrase scores near zero and inserting a negation barely moves the score." },
          { t: "p", text: "So the question I actually ask is: what would make an output wrong, and is that checkable without a model? If it is, check it that way. The metrics people reach for by habit are usually one tier more expensive and one tier less reliable than what the task needs." }
        ] },

      { level: "advanced",
        q: "You inherit an eval report with good numbers. What do you check first?",
        strong: "A strong answer asks what the numbers do not say.",
        answer: [
          { t: "p", text: "Whether each number has a definition, an interval and slices. Those three absences cover most of what makes an eval report misleading, and none of them require me to doubt anyone\u2019s honesty." },
          { t: "p", text: "Definition first, because a metric name is not a definition. I would ask which NDCG gain function \u2014 the same ranking is 0.9724 linear and 0.9575 exponential, 1.5 points apart. Whether BERTScore is baseline-rescaled, because unrescaled it puts unrelated text around 0.8 and every difference looks small. Which BLEU tokeniser, whether ROUGE split sentences, whether pass@k was estimated or sampled." },
          { t: "p", text: "Interval next, because 0.82 on two hundred examples means [0.767, 0.873], so a comparison against 0.85 is undecided. And slices, because a mean says nothing about who got worse \u2014 a tight interval on 0.91 is compatible with most cases at 1.0 and a few at 0.2." },
          { t: "p", text: "If there is a judge in the report I would also ask for its agreement figure and whether it ran in both orderings. A judge score with no kappa is a number whose reliability nobody has checked, and eighty percent raw agreement can be a kappa of 0.58 once chance agreement is removed." }
        ] },

      { level: "advanced",
        q: "How do you keep an eval suite honest over time?",
        strong: "A strong answer expects the metric to be gamed.",
        answer: [
          { t: "p", text: "By assuming the metric will become a target, because it will. Not through dishonesty \u2014 prompts get tuned until the suite passes, a judge rubric gets adjusted until the scores rise, a hard slice gets dropped because it was dragging the mean down. Each step is locally reasonable and the proxy breaks anyway." },
          { t: "p", text: "The structural defence is a held-out suite that nobody tunes against, rotated periodically, plus per-slice reporting so a dropped-slice improvement is visible as a dropped slice rather than as an improvement." },
          { t: "p", text: "The other half is continuous human review on a sample. It is the tier teams drop first and the only thing that catches a judge drifting after a model upgrade \u2014 position and verbosity bias return silently, and nothing in the automated stack notices." },
          { t: "p", text: "And I would keep production signals as the final arbiter: thumbs, escalations, task completion. The offline suite is a proxy for those, and when they disagree the suite is what is wrong." }
        ] }
    ]
  }
});
