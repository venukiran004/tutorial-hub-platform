/* ============================================================================
   LESSON 19.3 — The Eval Gate
   ========================================================================= */
EC.receiveLesson({
  id: "19.3",

  lede: "For a classifier, the release check is accuracy on held-out labels. For an LLM feature there is no single label: answers are open-ended, and 'correct' means following instructions, citing the right source, refusing what should be refused. The replacement is an evaluation suite: a golden set of cases with checks, a judge (often another model) for what rules cannot check, pass rates reported with uncertainty, and a gate that can actually block a release. This lesson simulates the classic failure, a prompt change that fixed the complaint it was written for and broke nine other cases, measures a judge's position bias, and builds the gate.",

  objectives: [
    "Build a golden set with critical cases and per-case checks",
    "Report pass rates with confidence intervals, and size the golden set for the precision needed",
    "Measure an LLM judge's position bias and neutralise it by swapping",
    "Compare versions case by case, not only in aggregate",
    "Write a release gate that blocks on critical regressions and significant net harm"
  ],

  prerequisites: ["19.2", "17.2"],

  blocks: [
    { t: "h2", n: "01", id: "golden", text: "Pass rates, and what they hide", sub: "One fix, nine breaks" },
    { t: "p",
      text: "A golden set of 200 support questions, 40 of them critical (refunds, safety, account changes). The model outputs here are simulated, so the effect of the change is known exactly: a prompt edit fixed the one case it was written for and broke nine critical ones. The script reports each version's pass rate with a Wilson 95% interval, the critical-case pass rate, and the case-by-case difference." },
    { t: "code",
      lang: "python",
      title: "evalgate.py — pass rates, case-by-case changes and a biased judge",
      code: `import numpy as np
rng = np.random.default_rng(35)

def wilson(k, n, z=1.96):
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (c - h) / d, (c + h) / d

# A golden set of 200 support questions. Outputs are simulated: each case passes or fails its checks for each prompt version.
N = 200
critical = np.zeros(N, bool); critical[:40] = True                     # refund, safety and account cases
v1 = rng.random(N) < 0.86
v2 = v1.copy()
fixed = rng.choice(np.flatnonzero(~v1 & ~critical), 1, replace=False); v2[fixed] = True       # the complaint it was written for
broken = rng.choice(np.flatnonzero(v1 & critical), 9, replace=False); v2[broken] = False      # what it broke
print("== pass rates with 95% intervals ==")
for name, r in (("v1 (production)", v1), ("v2 (candidate)", v2)):
    lo, hi = wilson(r.sum(), N)
    print(f"  {name:<16} {r.mean():.1%}  [{lo:.1%}, {hi:.1%}]   critical cases {r[critical].mean():.1%}")
print(f"  case by case: v2 fixed {np.sum(v2 & ~v1)}, broke {np.sum(v1 & ~v2)} (all {np.sum(v1 & ~v2 & critical)} broken ones critical)")

print("\\n== an LLM judge with a position bias (simulated) ==")
# Pairwise judge: when two answers are equally good it picks the first shown 65% of the time.
quality_a, quality_b = rng.normal(0, 1, 2_000), rng.normal(0, 1, 2_000)
def judge(first, second):
    margin = first - second + rng.normal(0, 0.5, len(first)) + np.where(np.abs(first - second) < 0.3, 0.6, 0.15)  # tilt to first
    return margin > 0
a_first = judge(quality_a, quality_b); b_first = ~judge(quality_b, quality_a)
print(f"  A shown first: A wins {a_first.mean():.1%};  B shown first: A wins {b_first.mean():.1%}")
print(f"  the judge contradicts itself on {np.mean(a_first != b_first):.1%} of pairs; truth: A better in {np.mean(quality_a > quality_b):.1%}")
both = np.where(a_first == b_first, a_first, np.nan)
print(f"  counting only consistent verdicts: A wins {np.nanmean(both):.1%} of {np.sum(~np.isnan(both)):,} pairs")`,
      out: `== pass rates with 95% intervals ==
  v1 (production)  87.0%  [81.6%, 91.0%]   critical cases 82.5%
  v2 (candidate)   83.0%  [77.2%, 87.6%]   critical cases 60.0%
  case by case: v2 fixed 1, broke 9 (all 9 broken ones critical)

== an LLM judge with a position bias (simulated) ==
  A shown first: A wins 59.3%;  B shown first: A wins 43.2%
  the judge contradicts itself on 20.4% of pairs; truth: A better in 51.3%
  counting only consistent verdicts: A wins 51.6% of 1,592 pairs` },
    { t: "viz",
      title: "Pass rates of the two prompt versions",
      caption: "The overall rates' intervals overlap, so the aggregate alone cannot reject v2. The critical cases fell from 82.5% to 60%.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="160" y="31.0" text-anchor="end" class="s-label">v1 pass rate</text>
<rect x="170" y="14" width="361.1" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="539.0" y="31.0" class="s-sub">87.0%  [81.6, 91.0]</text>
<text x="160" y="69.0" text-anchor="end" class="s-label">v2 pass rate</text>
<rect x="170" y="52" width="344.4" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="522.5" y="69.0" class="s-sub">83.0%  [77.2, 87.6]</text>
<text x="160" y="107.0" text-anchor="end" class="s-label">v1 critical cases</text>
<rect x="170" y="90" width="342.4" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="520.4" y="107.0" class="s-sub">82.5%</text>
<text x="160" y="145.0" text-anchor="end" class="s-label">v2 critical cases</text>
<rect x="170" y="128" width="249.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="427.0" y="145.0" class="s-sub">60.0%</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "The aggregate barely moved",
          def: "87.0% to 83.0%, with intervals [81.6, 91.0] and [77.2, 87.6] that overlap. A team watching the headline number would call it noise, and the author would point to the complaint it fixed." },
        { term: "The case-by-case view did not",
          def: "One case fixed, nine broken, all nine critical: the critical-case pass rate fell from 82.5% to 60%. Regressions are individual cases, and a suite must report them individually." },
        { term: "200 cases is not very precise",
          def: "A ±5% interval at an 85% pass rate needs about 196 cases; ±2% needs about 1,225. Small golden sets can catch specific regressions but cannot resolve small average changes." }
      ] },
    { t: "h2", n: "02", id: "judge", text: "A judge with known biases", sub: "Measured by swapping" },
    { t: "p",
      text: "Where rules cannot check an answer, an LLM judge compares two answers or grades one. Judges have documented biases: position (favouring the first or second answer), length (favouring longer answers) and self-preference. The simulated judge here prefers whichever answer it sees first when the two are close. Asking it twice with the order swapped measures the bias and gives a cleaner verdict." },
    { t: "dl",
      items: [
        { term: "Order changed the verdict",
          def: "Answer A won 59.3% of comparisons when shown first and 43.2% when shown second, for the same pairs. The judge contradicted itself on 20.4% of pairs." },
        { term: "Swapping recovers the truth",
          def: "Counting only verdicts that agreed in both orders, A won 51.6%, against a true 51.3%. Ties from contradictions are reported as ties, not resolved by the bias." },
        { term: "Calibrate the judge",
          def: "Before trusting a judge, measure its agreement with human labels on a sample, its position and length bias, and its variance across repeated calls." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "A judge that grades its own model",
      body: [
        { t: "p",
          text: "Using the same model family to generate and to judge invites self-preference: judges tend to rate text like their own more highly. Use a different judge model where possible, check it against human ratings, and never let the judge be the only check on critical cases, which should have deterministic assertions where they can." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A gate that can block",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Write a release gate comparing a candidate with production on the same 200 golden cases. Block if any critical case regresses, if significantly more cases broke than were fixed (an exact binomial test on the discordant pairs, McNemar's test), or if the candidate's pass-rate lower bound falls below 80%. Run it on a candidate that fixes one case and breaks nine critical ones, and on one that fixes twelve and breaks three minor ones. Then compute the golden-set size for ±5% and ±2% intervals." }
      ],
      requirements: [
        "Paired, case-by-case comparison on the same cases",
        "A zero-tolerance rule for critical regressions",
        "McNemar's test on fixed versus broken",
        "A Wilson lower bound on the pass rate"
      ],
      hint: "Only discordant cases (fixed or broken) carry information about which version is better; scipy.stats.binomtest tests whether 'broken' outnumbers 'fixed'.",
      solution: { lang: "python",
        title: "eval_gate.py",
        code: `import numpy as np
from scipy import stats
rng = np.random.default_rng(36)

def wilson_low(k, n, z=1.96):
    p = k / n; return (p + z * z / (2 * n) - z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / (1 + z * z / n)

def gate(prod, cand, critical, min_pass=0.80):
    """Block unless: no critical case regresses; the paired comparison does not favour production; the candidate's
    pass-rate lower bound clears the floor."""
    reasons = []
    crit_broken = int(np.sum(prod & ~cand & critical))
    if crit_broken: reasons.append(f"{crit_broken} critical case(s) regressed")
    fixed, broken = int(np.sum(cand & ~prod)), int(np.sum(prod & ~cand))       # discordant pairs (McNemar)
    if fixed + broken:
        p = stats.binomtest(broken, fixed + broken, 0.5, alternative="greater").pvalue
        if p < 0.05: reasons.append(f"significantly more cases broken ({broken}) than fixed ({fixed}), p = {p:.3f}")
    lo = wilson_low(cand.sum(), len(cand))
    if lo < min_pass: reasons.append(f"pass-rate lower bound {lo:.1%} below {min_pass:.0%}")
    return ("SHIP" if not reasons else "BLOCK"), reasons

N = 200; critical = np.zeros(N, bool); critical[:40] = True
prod = rng.random(N) < 0.86
cands = {}
c = prod.copy(); c[rng.choice(np.flatnonzero(~prod & ~critical), 1, replace=False)] = True
c[rng.choice(np.flatnonzero(prod & critical), 9, replace=False)] = False; cands["v2: fixes 1, breaks 9 critical"] = c
c = prod.copy(); c[rng.choice(np.flatnonzero(~prod), 12, replace=False)] = True
c[rng.choice(np.flatnonzero(prod & ~critical), 3, replace=False)] = False; cands["v3: fixes 12, breaks 3 minor"] = c
for name, cand in cands.items():
    verdict, reasons = gate(prod, cand, critical)
    print(f"{name:<34} {cand.mean():.1%} pass -> {verdict}" + "".join(f"\\n   - {r}" for r in reasons))

for target in (0.05, 0.02):
    n = int(np.ceil(1.96 ** 2 * 0.85 * 0.15 / target ** 2))
    print(f"golden-set size for a +/-{target:.0%} interval at an 85% pass rate: about {n:,} cases")`,
        out: `v2: fixes 1, breaks 9 critical     81.0% pass -> BLOCK
   - 9 critical case(s) regressed
   - significantly more cases broken (9) than fixed (1), p = 0.011
   - pass-rate lower bound 75.0% below 80%
v3: fixes 12, breaks 3 minor       89.5% pass -> SHIP
golden-set size for a +/-5% interval at an 85% pass rate: about 196 cases
golden-set size for a +/-2% interval at an 85% pass rate: about 1,225 cases`,
        notes: [
          { t: "p",
            text: "The fix-one-break-nine candidate was blocked on all three rules: nine critical regressions, more cases broken than fixed (p = 0.011), and a lower bound of 75.0%. The candidate that fixed twelve and broke three minor cases shipped. A gate that reports every reason gives the author a precise list of cases to fix." },
          { t: "p",
            text: "The paired test is the important part for small sets: comparing two pass rates with independent intervals wastes the fact that both versions ran on the same cases. Sizing matters too: about 1,225 cases are needed to see ±2% changes in the average, which is why critical behaviours get explicit cases and zero-tolerance rules rather than relying on the average." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the prompt that fixed the complaint",
      body: [
        { t: "p",
          text: "**Symptom.** After a prompt change to stop the assistant over-apologising, refund requests started getting cheerful answers that skipped the identity check before discussing the account." },
        { t: "p",
          text: "**Mechanism.** The new instructions to be concise and upbeat displaced the old instruction to verify identity first. The team checked the change on the complaint that prompted it and a handful of examples, and the overall evaluation score moved by two points, inside its noise." },
        { t: "p",
          text: "**Fix.** Identity-check cases were marked critical with deterministic assertions, the release gate compares versions case by case and blocks on any critical regression, and the judge's verdicts on open-ended cases are taken in both answer orders." }
      ] }
  ],

  takeaways: [
    "An LLM feature's release check is an **evaluation suite**: golden cases with checks, a judge, and a gate.",
    "Report pass rates with **intervals**: 87.0% [81.6, 91.0] and 83.0% [77.2, 87.6] could not be separated in aggregate.",
    "Compare **case by case**: the change fixed 1 case and broke **9 critical** ones (82.5% → **60%** on critical cases).",
    "A ±5% interval needs about **196** cases; ±2% about **1,225**.",
    "The simulated judge contradicted itself on **20.4%** of pairs; swapping order and keeping consistent verdicts recovered the truth.",
    "Calibrate judges against human labels; use deterministic assertions for critical behaviour.",
    "Gate: block on **any critical regression**, on **significant net harm** (McNemar), and on a **pass-rate lower bound**."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "v1 passes 87% and v2 83% of 200 cases, with overlapping intervals. What should you look at next?",
        options: [
          "Nothing: overlapping intervals mean no difference",
          "The cases each version fixed and broke",
          "A larger judge model to rescore everything",
          "The average length of the two versions' answers"
        ],
        answer: 1,
        why: "Case-by-case comparison showed 9 critical regressions the aggregate hid. Overlap does not prove equality, and rescoring or length does not reveal which cases broke." },
      { stem: "A judge picks answer A 59% of the time when A is shown first and 43% when it is second. What is this?",
        options: [
          "Evidence that A is slightly better overall",
          "Position bias: the order changes the verdict",
          "Random noise that more samples will remove",
          "Evidence that B is the better answer overall"
        ],
        answer: 1,
        why: "The same pairs got different verdicts by order. Swapping and keeping consistent verdicts gave 51.6% against a true 51.3%; more samples would only measure the bias more precisely." },
      { stem: "Why use McNemar's test rather than comparing two pass rates' intervals?",
        options: [
          "It needs fewer cases in the golden set",
          "It uses the pairing of cases",
          "It is the only test that works with any LLM",
          "Intervals cannot be computed for pass rates"
        ],
        answer: 1,
        why: "Only discordant cases carry information, and pairing removes case difficulty from the comparison. Intervals can be computed, and the test is not LLM-specific." },
      { stem: "Roughly how many golden cases does a ±2% interval need at an 85% pass rate?",
        options: ["About 200 cases", "About 1,200 cases", "About 50 cases", "About 20,000 cases"],
        answer: 1,
        why: "1.96² × 0.85 × 0.15 / 0.02² ≈ 1,225. 200 cases give about ±5%, 50 about ±10%, and 20,000 would give ±0.5%." }
    ] },

  interview: { title: "In an interview",
    sub: "Evaluation answers are judged on how they handle uncertainty and bias.",
    questions: [
      { level: "core",
        q: "How do you decide whether a prompt change is safe to ship?",
        strong: "A strong answer combines a golden set, case-level comparison, critical cases and a gate.",
        answer: [
          { t: "p",
            text: "Run both versions on the same golden set: deterministic checks where possible, a calibrated judge elsewhere. Compare case by case, block on any regression in cases marked critical, test whether more cases broke than were fixed (McNemar), and require the pass rate's lower bound to clear a floor. Then canary with online guardrails. Report every reason a gate blocks, so the author knows exactly which cases to fix." }
        ] },
      { level: "advanced",
        q: "How do you make an LLM-as-judge trustworthy?",
        strong: "A strong answer measures agreement and biases and designs around them.",
        answer: [
          { t: "p",
            text: "Measure agreement with human labels on a sample before use; measure position bias by swapping answer order, length bias by controlled length variation, and variance by repeated calls. Use pairwise judgements in both orders and treat disagreements as ties; use a different model family from the one being judged; give the judge a rubric and examples; and keep critical behaviours on deterministic assertions." }
        ] },
      { level: "core",
        q: "How big should a golden set be?",
        strong: "A strong answer ties size to the precision needed and to coverage of critical behaviours.",
        answer: [
          { t: "p",
            text: "Big enough for the decision: about 200 cases resolve ±5% around 85%, about 1,200 resolve ±2%. But size is not only precision: the set must cover critical behaviours, known failure modes and recent incidents with explicit cases, and it should grow from production traces (19.5), so the regressions it can catch are the ones that matter." }
        ] }
    ] }
});
