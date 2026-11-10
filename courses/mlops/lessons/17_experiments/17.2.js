/* ============================================================================
   LESSON 17.2 — Reading the Result
   ========================================================================= */
EC.receiveLesson({
  id: "17.2",

  lede: "An experiment's result is a range of plausible effects, not a verdict. Read as a confidence interval, two 'significant' results can mean opposite things for the decision. Read carelessly, the same data produces false winners: checking every day and stopping at the first p below 0.05, slicing into twenty segments until one lights up, or comparing totals when the arms received a different mix of users. This lesson computes each of these on simulated tests, including a Simpson's paradox where the treatment wins in every segment and loses overall, and calibrates a threshold that makes daily looks safe.",

  objectives: [
    "Read a result as a confidence interval against the minimum effect worth shipping",
    "Measure the false-positive rate of peeking, and make daily looks safe",
    "Account for multiple comparisons across segments and metrics",
    "Recognise Simpson's paradox and the mix shift that causes it"
  ],

  prerequisites: ["17.1"],

  blocks: [
    { t: "h2", n: "01", id: "read", text: "Four ways to read a result wrongly", sub: "All computed" },
    { t: "code",
      lang: "python",
      title: "results.py — intervals, peeking, segments and Simpson's paradox",
      code: `import numpy as np
from scipy import stats
rng = np.random.default_rng(24)

def diff_ci(ca, na, cb, nb):
    pa, pb = ca / na, cb / nb; d = (pb - pa) / pa
    se = np.sqrt(pa * (1 - pa) / na + pb * (1 - pb) / nb) / pa
    return d, d - 1.96 * se, d + 1.96 * se, 2 * stats.norm.sf(abs(d / se))

print("== 1. three 'significant' results, read as intervals (minimum worth shipping: +2%) ==")
for name, (ca, na, cb, nb) in {"A": (6_000, 200_000, 6_420, 200_000), "B": (30_000, 1_000_000, 30_480, 1_000_000),
                              "C": (900, 30_000, 1_010, 30_000)}.items():
    d, lo, hi, p = diff_ci(ca, na, cb, nb)
    print(f"  test {name}: lift {d:+.1%}, 95% CI [{lo:+.1%}, {hi:+.1%}], p = {p:.3f}" if p >= 0.001 else f"  test {name}: lift {d:+.1%}, 95% CI [{lo:+.1%}, {hi:+.1%}], p < 0.001")

print("\\n== 2. peeking: an A/A test checked every day for 28 days, stopped at the first p < 0.05 ==")
def peeking(trials=2_000, days=28, per_day=2_000, p=0.03):
    hits = 0
    for _ in range(trials):
        a = np.cumsum(rng.binomial(per_day, p, days)); b = np.cumsum(rng.binomial(per_day, p, days)); n = per_day * np.arange(1, days + 1)
        pa, pb = a / n, b / n; pool = (a + b) / (2 * n)
        z = (pb - pa) / np.sqrt(pool * (1 - pool) * 2 / n)
        hits += np.any(np.abs(z) > 1.96)
    return hits / trials
print(f"  'significant' at some point in {peeking():.1%} of A/A tests (nominal 5%)")

print("\\n== 3. twenty segments, no real effect anywhere ==")
runs = [(np.abs(rng.normal(size=20)) > 1.96).any() for _ in range(5_000)]
print(f"  at least one segment 'significant' in {np.mean(runs):.0%} of tests; theory 1 - 0.95^20 = {1 - 0.95 ** 20:.0%}")

print("\\n== 4. Simpson's paradox: the treatment wins in each segment and loses overall ==")
seg = {"desktop": {"control": (900, 15_000), "treatment": (310, 5_000)},
       "mobile": {"control": (100, 5_000), "treatment": (330, 15_000)}}
for s, arms in seg.items():
    print(f"  {s:<8} control {arms['control'][0] / arms['control'][1]:.2%}  treatment {arms['treatment'][0] / arms['treatment'][1]:.2%}")
tot = {a: tuple(sum(seg[s][a][i] for s in seg) for i in (0, 1)) for a in ("control", "treatment")}
print(f"  overall  control {tot['control'][0] / tot['control'][1]:.2%}  treatment {tot['treatment'][0] / tot['treatment'][1]:.2%}"
      f"   (treatment got 75% mobile traffic, control 25%)")`,
      out: `== 1. three 'significant' results, read as intervals (minimum worth shipping: +2%) ==
  test A: lift +7.0%, 95% CI [+3.4%, +10.6%], p < 0.001
  test B: lift +1.6%, 95% CI [+0.0%, +3.2%], p = 0.047
  test C: lift +12.2%, 95% CI [+2.9%, +21.6%], p = 0.011

== 2. peeking: an A/A test checked every day for 28 days, stopped at the first p < 0.05 ==
  'significant' at some point in 28.5% of A/A tests (nominal 5%)

== 3. twenty segments, no real effect anywhere ==
  at least one segment 'significant' in 63% of tests; theory 1 - 0.95^20 = 64%

== 4. Simpson's paradox: the treatment wins in each segment and loses overall ==
  desktop  control 6.00%  treatment 6.20%
  mobile   control 2.00%  treatment 2.20%
  overall  control 5.00%  treatment 3.20%   (treatment got 75% mobile traffic, control 25%)` },
    { t: "viz",
      title: "Share of tests with no real effect declared significant",
      caption: "Looking once at the planned end, or with a calibrated threshold, keeps false positives near 5%. Daily peeking and segment hunting do not.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="250" y="31.0" text-anchor="end" class="s-label">one look at the planned end</text>
<rect x="260" y="14" width="24.5" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="292.5" y="31.0" class="s-sub">4.9%</text>
<text x="250" y="69.0" text-anchor="end" class="s-label">daily looks, calibrated |z| &gt; 2.74</text>
<rect x="260" y="52" width="24.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="292.0" y="69.0" class="s-sub">4.8%</text>
<text x="250" y="107.0" text-anchor="end" class="s-label">daily looks, stop at first p &lt; 0.05</text>
<rect x="260" y="90" width="142.5" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="410.5" y="107.0" class="s-sub">28.5%</text>
<text x="250" y="145.0" text-anchor="end" class="s-label">20 segments, any p &lt; 0.05</text>
<rect x="260" y="128" width="315.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="583.0" y="145.0" class="s-sub">63%</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Intervals, not verdicts",
          def: "All three tests had p < 0.05. Test A (+7%, interval +3.4% to +10.6%) clears the +2% minimum. Test B (+1.6%, interval 0.0% to +3.2%) is probably real and probably too small to matter. Test C (+12.2%, interval +2.9% to +21.6%) is promising but so uncertain that the true effect could be a seventh of the estimate." },
        { term: "Peeking: 28.5% false positives",
          def: "Checking an A/A test daily for 28 days and stopping at the first p < 0.05 declared a winner 28.5% of the time. Each look is another chance for noise to cross the line." },
        { term: "Twenty segments: 63%",
          def: "With no effect anywhere, at least one of twenty segments was 'significant' in 63% of tests, matching 1 − 0.95²⁰. Segment findings are hypotheses for the next test, unless corrected for the number of comparisons." },
        { term: "Simpson's paradox",
          def: "The treatment converted better on desktop (6.20% against 6.00%) and on mobile (2.20% against 2.00%), and worse overall (3.20% against 5.00%), because 75% of its traffic was mobile against 25% of control's. An unequal mix means the assignment is broken (lesson 17.1's sample ratio check, by segment)." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Reading the dashboard every morning",
      body: [
        { t: "p",
          text: "Experiment dashboards update continuously, and teams look. Without a sequential method the result of a test that was watched and stopped early is not a 5%-error result. Either commit to one look at the planned end, or use a method designed for continuous monitoring: the exercise calibrates the simplest one." }
      ] },
    { t: "h2", n: "02", id: "sequential", text: "Making daily looks safe", sub: "One stricter threshold" },
    { t: "p",
      text: "If the team will look every day, the threshold for each look must be stricter so that the chance of crossing it at any of the looks is 5%. A constant threshold across all looks (a Pocock-style boundary) can be found by simulating null experiments and taking the 95th percentile of the largest |z| reached. More refined methods (O'Brien–Fleming boundaries, always-valid p-values) spend less of the error early; the principle is the same." },
    { t: "exercise",
      kind: "Challenge",
      title: "Calibrate a threshold for daily looks",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Simulate 10,000 A/A experiments of 28 days at 2,000 users per arm per day and a 3% rate, find the constant |z| threshold that keeps the chance of ever crossing it at 5%, and check it on fresh simulations. Then compare, for true lifts of 0%, 10% and 15%: stopping at the first p < 0.05, daily looks with the calibrated threshold, and a single look on day 28. Report the median stopping day for the calibrated method." }
      ],
      requirements: [
        "Vectorised cumulative z-statistics per day",
        "The 95th percentile of the maximum |z| under no effect",
        "A check on new simulations",
        "Detection rates and stopping days for all three methods"
      ],
      hint: "np.abs(z).max(axis=1) gives each experiment's largest |z| across the 28 looks; its 95th percentile is the threshold.",
      solution: { lang: "python",
        title: "sequential_threshold.py",
        code: `import numpy as np
rng = np.random.default_rng(25)
DAYS, PER_DAY, P, RUNS = 28, 2_000, 0.03, 10_000

def z_paths(lift, runs=RUNS):
    """Cumulative z-statistics for \`runs\` experiments, one column per day."""
    a = np.cumsum(rng.binomial(PER_DAY, P, (runs, DAYS)), 1)
    b = np.cumsum(rng.binomial(PER_DAY, P * (1 + lift), (runs, DAYS)), 1)
    n = PER_DAY * np.arange(1, DAYS + 1); pool = (a + b) / (2 * n)
    return (b / n - a / n) / np.sqrt(pool * (1 - pool) * 2 / n)

# One constant threshold for 28 daily looks that keeps the overall false-positive rate at 5% (a Pocock-style boundary),
# calibrated on one set of null runs and checked on a fresh set.
threshold = np.quantile(np.abs(z_paths(0.0)).max(1), 0.95)
print(f"daily looks, overall 5% false positives: threshold |z| > {threshold:.2f} instead of 1.96")

for lift in (0.0, 0.10, 0.15):
    z = np.abs(z_paths(lift))
    naive = np.mean((z > 1.96).any(1)); seq = (z > threshold).any(1); fixed = np.mean(z[:, -1] > 1.96)
    stop = np.argmax(z > threshold, 1)[seq] + 1
    print(f"true lift {lift:>4.0%}: stop at first p<0.05 {naive:6.1%} | calibrated daily looks {seq.mean():6.1%} "
          f"(median stop day {np.median(stop) if len(stop) else float('nan'):4.0f}) | one look at day 28 {fixed:6.1%}")`,
        out: `daily looks, overall 5% false positives: threshold |z| > 2.74 instead of 1.96
true lift   0%: stop at first p<0.05  26.7% | calibrated daily looks   4.8% (median stop day    7) | one look at day 28   4.9%
true lift  10%: stop at first p<0.05  90.1% | calibrated daily looks  66.7% (median stop day   14) | one look at day 28  82.6%
true lift  15%: stop at first p<0.05  99.6% | calibrated daily looks  96.4% (median stop day   10) | one look at day 28  99.2%`,
        notes: [
          { t: "p",
            text: "The calibrated threshold was 2.74 instead of 1.96, and on fresh A/A runs it declared a winner 4.8% of the time, against 26.7% for naive peeking in the same runs. A single look on day 28 gave 4.9%." },
          { t: "p",
            text: "Safety costs some power: for a 10% lift the calibrated daily method detected 66.7% against 82.6% for one look at the end, but it stopped at a median of day 14, half the duration. That is the real trade: daily looks buy early stopping for large effects and pay for it in sensitivity to small ones." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the segment that won",
      body: [
        { t: "p",
          text: "**Symptom.** A new model lost its A/B test overall, but the analysis found a significant 9% lift for 'Android users in Germany', and the model was launched there. The lift never appeared." },
        { t: "p",
          text: "**Mechanism.** The analysis had looked at 48 country-platform segments. With no real effect, two or three would be expected to cross p < 0.05 by chance, and the reported one was the largest of them." },
        { t: "p",
          text: "**Fix.** Segment results are now reported with a multiple-comparison correction and labelled as hypotheses; launching on a segment requires a new test designed for that segment, with its own sample size." }
      ] }
  ],

  takeaways: [
    "Read results as **confidence intervals** against the minimum effect worth shipping, not as p-value verdicts.",
    "Three 'significant' tests meant three different decisions: ship, too small to matter, and too uncertain.",
    "Daily peeking with p < 0.05 declared a winner in **28.5%** of A/A tests (26.7% in the exercise's larger run).",
    "A calibrated constant threshold (**|z| > 2.74** for 28 looks) restored **4.8%**, stopping large effects at a median of **day 14**.",
    "With twenty segments, **63%** of no-effect tests found a 'significant' one: correct for multiple comparisons.",
    "**Simpson's paradox**: winning in every segment and losing overall comes from an unequal mix between arms."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A test shows +1.6% with a 95% interval of 0.0% to +3.2%; the minimum worth shipping is +2%. What do you conclude?",
        options: [
          "Ship it: the result is significant at p below 0.05",
          "Probably real, and probably too small to matter",
          "The test failed and should be discarded",
          "The effect is exactly 1.6%, below the bar"
        ],
        answer: 1,
        why: "The interval excludes harm but mostly lies below +2%. Significance alone does not answer the business question, the test did not fail, and 1.6% is an estimate, not an exact value." },
      { stem: "Why did daily peeking produce about 28% false positives instead of 5%?",
        options: [
          "The daily samples were too small to test",
          "Each look gives noise another chance to cross 1.96",
          "The z-test is badly biased for proportions as low as 3%",
          "The A/A arms received different traffic"
        ],
        answer: 1,
        why: "Repeated testing of a random walk crosses a fixed line far more often than a single test does. Sample size, the test's bias and traffic were all fine; a single day-28 look gave 4.9%." },
      { stem: "The treatment wins in both desktop and mobile but loses overall. What is the most likely explanation?",
        options: [
          "A data error in one of the two segments",
          "The arms received a different mix of segments",
          "The treatment helps everybody by exactly the same amount",
          "The overall number is computed incorrectly"
        ],
        answer: 1,
        why: "When one arm has more of a low-converting segment, totals can reverse the per-segment comparison: Simpson's paradox. The segment and overall numbers can all be correct." },
      { stem: "What is the cost of a calibrated threshold for daily looks?",
        options: [
          "More false positives than one single look at the end",
          "Less power for small effects than one look",
          "It cannot stop before the planned end",
          "It requires twice as many users"
        ],
        answer: 1,
        why: "For a 10% lift it detected 66.7% against 82.6% for one look at the end, in exchange for stopping early on large effects. False positives stayed at 5% and the sample is unchanged." }
    ] },

  interview: { title: "In an interview",
    sub: "Result questions reward intervals and humility about segments.",
    questions: [
      { level: "core",
        q: "How do you decide whether to ship based on an A/B test result?",
        strong: "A strong answer uses intervals, checks validity first, and considers guardrails.",
        answer: [
          { t: "p",
            text: "First validity: sample ratio check, the planned duration reached, no peeking-based stop. Then the primary metric's confidence interval against the minimum effect worth shipping: ship if it lies above, do not if it includes harm, and treat 'probably positive, probably small' as a product judgement. Guardrails must hold. Segment results are hypotheses unless corrected for multiple comparisons." }
        ] },
      { level: "advanced",
        q: "Stakeholders want to watch results daily. How do you allow that safely?",
        strong: "A strong answer names sequential methods and their trade-off.",
        answer: [
          { t: "p",
            text: "Use a sequential design: a stricter boundary per look calibrated so the overall false-positive rate stays at the target, such as a Pocock or O'Brien–Fleming boundary, or always-valid p-values. In the simulation a constant 2.74 kept false positives at 4.8% with 28 daily looks. It costs some power for small effects and allows early stopping for large ones; the dashboard should show the boundary, not the naive p-value." }
        ] },
      { level: "core",
        q: "Explain Simpson's paradox in an experiment.",
        strong: "A strong answer explains the mechanism and the check that catches it.",
        answer: [
          { t: "p",
            text: "If one arm receives proportionally more of a segment with a low baseline, its total can be lower even when it wins in every segment. In a randomised test the mix should be equal, so a paradox usually signals broken assignment (a bug routing one platform differently), caught by checking sample ratios per segment. With a valid assignment, compare within segments or stratify the analysis." }
        ] }
    ] }
});
