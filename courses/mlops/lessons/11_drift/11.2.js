/* ============================================================================
   LESSON 11.2 — Detecting It: PSI, KS and Chi-Square
   ========================================================================= */
EC.receiveLesson({
  id: "11.2",

  lede: "Three statistics dominate drift detection: the population stability index (PSI), the Kolmogorov–Smirnov test and the chi-square test. They answer different questions, and treating their outputs as interchangeable produces alerting that is either always firing or never firing. A p-value measures how sure you are that anything changed, so with enough data it flags changes too small to matter. PSI measures how much changed, but its value depends on the binning and inflates on small samples, and its famous 0.1 and 0.25 thresholds are conventions. This lesson computes all three on the same shifts and then sets a threshold the defensible way.",

  objectives: [
    "Compute PSI, the KS statistic and test, and the chi-square test on the same data",
    "Explain why a p-value's verdict depends on sample size, and PSI's does much less",
    "Show how binning changes PSI on a skewed feature",
    "Translate PSI's conventional thresholds into the size of a shift",
    "Calibrate an alert threshold from the no-change distribution at your batch size"
  ],

  prerequisites: ["11.1"],

  blocks: [
    { t: "h2", n: "01", id: "three", text: "Three statistics, one shift", sub: "Effect size against evidence" },
    { t: "p",
      text: "PSI bins the reference distribution, usually into deciles, and sums (q − p) × ln(q / p) over the bins: a symmetric divergence, a measure of how much the distribution moved. The two-sample KS statistic is the largest gap between the two cumulative distributions, and its p-value says how unlikely that gap is if nothing changed. Chi-square does the same job as KS for categories. The script computes them on mean shifts from zero to 0.3 standard deviations at three sample sizes." },
    { t: "code",
      lang: "python",
      title: "detect.py — PSI, KS and chi-square on the same shifts",
      code: `import numpy as np
from scipy import stats
rng = np.random.default_rng(1)

def psi(ref, cur, bins=10, edges=None):
    if edges is None:
        edges = np.quantile(ref, np.linspace(0, 1, bins + 1)); edges[0], edges[-1] = -np.inf, np.inf
    p = np.histogram(ref, edges)[0] / len(ref); q = np.histogram(cur, edges)[0] / len(cur)
    p, q = np.clip(p, 1e-4, None), np.clip(q, 1e-4, None)
    return float(np.sum((q - p) * np.log(q / p)))

ref = rng.normal(0, 1, 50_000)
print("== the same shifts, three sample sizes: PSI against the KS test ==")
print(f"{'mean shift':>10} {'n':>7} {'PSI':>7} {'KS stat':>8} {'KS p-value':>11}")
for shift in (0.0, 0.05, 0.1, 0.3):
    for n in (500, 5_000, 50_000):
        cur = rng.normal(shift, 1, n)
        ks = stats.ks_2samp(ref, cur)
        print(f"{shift:>9.2f}σ {n:>7,} {psi(ref, cur):>7.3f} {ks.statistic:>8.3f} {ks.pvalue:>11.1e}")

print("\\n== PSI's conventional thresholds, in units of a mean shift (n = 50,000) ==")
for shift in (0.1, 0.2, 0.32, 0.5, 0.7):
    print(f"  shift {shift:.2f}σ -> PSI {psi(ref, rng.normal(shift, 1, 50_000)):.3f}")

print("\\n== binning changes the number: a skewed feature (transaction amount), 20% more large amounts ==")
amt_ref = rng.lognormal(3, 1.2, 50_000)
amt_cur = np.concatenate([rng.lognormal(3, 1.2, 40_000), rng.lognormal(4.5, 1.0, 10_000)])
for label, kw in (("10 quantile bins", dict(bins=10)), ("20 quantile bins", dict(bins=20)), ("50 quantile bins", dict(bins=50)),
                  ("10 equal-width bins", dict(edges=np.r_[-np.inf, np.linspace(amt_ref.min(), amt_ref.max(), 9), np.inf]))):
    print(f"  {label:<20} PSI {psi(amt_ref, amt_cur, **kw):.3f}")

print("\\n== a categorical feature: device type, chi-square ==")
cats = ["ios", "android", "web", "tablet"]
p_ref, p_cur = [0.40, 0.35, 0.20, 0.05], [0.37, 0.36, 0.21, 0.06]
for n in (2_000, 20_000):
    a = rng.multinomial(n, p_ref); b = rng.multinomial(n, p_cur)
    chi2, pval, _, _ = stats.chi2_contingency([a, b])
    pa, pb = a / n, b / n
    print(f"  n={n:>6,}: chi-square {chi2:6.1f}, p = {pval:.1e}; PSI {np.sum((pb - pa) * np.log(pb / pa)):.4f}")`,
      out: `== the same shifts, three sample sizes: PSI against the KS test ==
mean shift       n     PSI  KS stat  KS p-value
     0.00σ     500   0.028    0.039     4.3e-01
     0.00σ   5,000   0.001    0.011     6.7e-01
     0.00σ  50,000   0.000    0.007     1.4e-01
     0.05σ     500   0.022    0.040     4.0e-01
     0.05σ   5,000   0.005    0.033     1.2e-04
     0.05σ  50,000   0.004    0.025     2.2e-14
     0.10σ     500   0.021    0.063     3.8e-02
     0.10σ   5,000   0.017    0.052     4.1e-11
     0.10σ  50,000   0.012    0.046     4.3e-47
     0.30σ     500   0.077    0.119     1.5e-06
     0.30σ   5,000   0.080    0.118     5.0e-56
     0.30σ  50,000   0.091    0.122     0.0e+00

== PSI's conventional thresholds, in units of a mean shift (n = 50,000) ==
  shift 0.10σ -> PSI 0.011
  shift 0.20σ -> PSI 0.042
  shift 0.32σ -> PSI 0.106
  shift 0.50σ -> PSI 0.251
  shift 0.70σ -> PSI 0.474

== binning changes the number: a skewed feature (transaction amount), 20% more large amounts ==
  10 quantile bins     PSI 0.067
  20 quantile bins     PSI 0.072
  50 quantile bins     PSI 0.075
  10 equal-width bins  PSI 0.028

== a categorical feature: device type, chi-square ==
  n= 2,000: chi-square    0.8, p = 8.6e-01; PSI 0.0008
  n=20,000: chi-square   59.9, p = 6.2e-13; PSI 0.0060` },
    { t: "dl",
      items: [
        { term: "The p-value screams, PSI shrugs",
          def: "A 0.05σ shift with 5,000 samples gave a KS p-value of 0.0001 and a PSI of 0.005. At 50,000 samples the p-value was 10⁻¹⁴ for the same tiny shift. A test with enough data will always find a difference; whether it matters is a different question." },
        { term: "PSI inflates on small samples",
          def: "With no shift at all, PSI was 0.028 at 500 samples and 0.000 at 50,000. Sampling noise in each bin adds to the sum, so small batches look drifted." },
        { term: "The conventions, translated",
          def: "For a normal feature, PSI 0.1 corresponds to a mean shift of about 0.32 standard deviations and PSI 0.25 to about 0.5. Whether a third of a standard deviation matters depends entirely on the feature and the model." },
        { term: "Bins change the answer",
          def: "20% more large transaction amounts scored 0.067 to 0.075 with quantile bins and 0.028 with equal-width bins, because on a skewed feature equal-width bins put almost all the data in the first bin." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Alerting on p < 0.05",
      body: [
        { t: "p",
          text: "With thousands of rows a day, a KS or chi-square test rejects 'no change' for almost every feature on almost every day: in the script, a 1-point shift in device mix gave p = 10⁻¹³ at 20,000 rows. Teams that alert on p-values learn to ignore the alerts. Use an effect size such as PSI, or the KS statistic itself, with a threshold chosen for what matters." }
      ] },
    { t: "h2",
      n: "02",
      id: "threshold",
      text: "Choosing the threshold",
      sub: "From the no-change distribution, at your batch size" },
    { t: "p",
      text: "The defensible threshold is not 0.1 or 0.25 but the value that PSI exceeds by chance only rarely at your batch size, measured by simulating, or by bootstrapping your own reference data, with no change. Its 99th percentile gives about one false alarm in a hundred days. The exercise computes it and the detection rate it buys." },
    { t: "viz",
      title: "Detection rate at 1,000 rows a day",
      caption: "A threshold calibrated from the no-change PSI caught a 0.2σ shift 99% of the time with about four false alarms a year. The conventional 0.1 missed every shift smaller than 0.3σ.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0%</text>
<line x1="64" y1="172.5" x2="610" y2="172.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="176.5" text-anchor="end" class="s-sub">25%</text>
<line x1="64" y1="121.0" x2="610" y2="121.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="125.0" text-anchor="end" class="s-sub">50%</text>
<line x1="64" y1="69.5" x2="610" y2="69.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="73.5" text-anchor="end" class="s-sub">75%</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">100%</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">0.1σ</text>
<text x="246.0" y="242" text-anchor="middle" class="s-sub">0.2σ</text>
<text x="428.0" y="242" text-anchor="middle" class="s-sub">0.3σ</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">0.5σ</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">size of the mean shift</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">share of shifted days detected</text>
<polyline points="64.0,172.5 246.0,20.1 428.0,18.0 610.0,18.0" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="172.5" r="2" style="fill:var(--good)"/>
<circle cx="246.0" cy="20.1" r="2" style="fill:var(--good)"/>
<circle cx="428.0" cy="18.0" r="2" style="fill:var(--good)"/>
<circle cx="610.0" cy="18.0" r="2" style="fill:var(--good)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">calibrated, 0.0215</text>
<polyline points="64.0,224.0 246.0,224.0 428.0,143.7 610.0,18.0" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="224.0" r="2" style="fill:var(--crit)"/>
<circle cx="246.0" cy="224.0" r="2" style="fill:var(--crit)"/>
<circle cx="428.0" cy="143.7" r="2" style="fill:var(--crit)"/>
<circle cx="610.0" cy="18.0" r="2" style="fill:var(--crit)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">fixed PSI &gt; 0.1</text>
</svg>` },
    { t: "table",
      head: ["Statistic", "Measures", "Use it for", "Watch out for"],
      rows: [
        [
          "PSI",
          "Size of the change",
          "Numeric and categorical features, dashboards",
          "Binning; inflation on small batches"
        ],
        [
          "KS statistic",
          "Largest CDF gap (0 to 1)",
          "Numeric features; an effect size too",
          "Insensitive to tail-only changes"
        ],
        [
          "KS / chi-square p-value",
          "Evidence of any change",
          "Small samples, or deciding whether to look",
          "Always significant at scale"
        ]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Calibrate a drift threshold",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "For daily batches of 200, 1,000 and 5,000 rows, simulate 2,000 days with no change and record PSI against a fixed reference. Report how often the conventional 0.1 threshold fires by chance per year. Then set the threshold at the 99th percentile of the no-change PSI and measure, over 500 simulated days each, the share of days detected for mean shifts of 0.1, 0.2, 0.3 and 0.5 standard deviations. Compare with the conventional threshold at 1,000 rows." }
      ],
      requirements: [
        "Fixed decile edges from the reference sample",
        "The no-change PSI distribution at each batch size",
        "A calibrated threshold and its detection rates",
        "The same rates for PSI > 0.1"
      ],
      hint: "Compute the bin edges once from the reference; recomputing them per batch changes the statistic you are calibrating.",
      solution: { lang: "python",
        title: "calibrate_threshold.py",
        code: `import numpy as np
rng = np.random.default_rng(2)

def psi(ref, cur, edges):
    p = np.histogram(ref, edges)[0] / len(ref); q = np.histogram(cur, edges)[0] / len(cur)
    p, q = np.clip(p, 1e-4, None), np.clip(q, 1e-4, None)
    return float(np.sum((q - p) * np.log(q / p)))

ref = rng.normal(0, 1, 50_000)
edges = np.quantile(ref, np.linspace(0, 1, 11)); edges[0], edges[-1] = -np.inf, np.inf

print("1. PSI when nothing has changed, by daily batch size (2,000 simulated days each)")
null = {}
for n in (200, 1_000, 5_000):
    null[n] = np.array([psi(ref, rng.normal(0, 1, n), edges) for _ in range(2_000)])
    print(f"  n={n:>5,}: median {np.median(null[n]):.4f}, 99th percentile {np.percentile(null[n], 99):.4f}, "
          f"days over 0.1 per year: {np.mean(null[n] > 0.1) * 365:.0f}")

print("\\n2. Calibrated threshold: the 99th percentile of the no-change PSI (about 4 false alarms a year)")
print(f"{'n':>6} {'threshold':>10} | detection rate for a mean shift of:  {'0.1σ':>6} {'0.2σ':>6} {'0.3σ':>6} {'0.5σ':>6}")
for n in (200, 1_000, 5_000):
    th = np.percentile(null[n], 99)
    rates = [np.mean([psi(ref, rng.normal(s, 1, n), edges) > th for _ in range(500)]) for s in (0.1, 0.2, 0.3, 0.5)]
    print(f"{n:>6,} {th:>10.4f} | {'':>37}" + "".join(f"{r:>7.0%}" for r in rates))

print("\\n3. The conventional 0.1 threshold at n=1,000:")
rates = [np.mean([psi(ref, rng.normal(s, 1, 1_000), edges) > 0.1 for _ in range(500)]) for s in (0.1, 0.2, 0.3, 0.5)]
print("  detection rate: " + ", ".join(f"{s}σ {r:.0%}" for s, r in zip((0.1, 0.2, 0.3, 0.5), rates)))`,
        out: `1. PSI when nothing has changed, by daily batch size (2,000 simulated days each)
  n=  200: median 0.0434, 99th percentile 0.1162, days over 0.1 per year: 10
  n=1,000: median 0.0084, 99th percentile 0.0215, days over 0.1 per year: 0
  n=5,000: median 0.0017, 99th percentile 0.0046, days over 0.1 per year: 0

2. Calibrated threshold: the 99th percentile of the no-change PSI (about 4 false alarms a year)
     n  threshold | detection rate for a mean shift of:    0.1σ   0.2σ   0.3σ   0.5σ
   200     0.1162 |                                           4%    18%    59%   100%
 1,000     0.0215 |                                          25%    99%   100%   100%
 5,000     0.0046 |                                         100%   100%   100%   100%

3. The conventional 0.1 threshold at n=1,000:
  detection rate: 0.1σ 0%, 0.2σ 0%, 0.3σ 39%, 0.5σ 100%`,
        notes: [
          { t: "p",
            text: "The right threshold depends on batch size by a factor of 25: 0.116 at 200 rows, 0.022 at 1,000, 0.005 at 5,000. At 200 rows the conventional 0.1 fired about ten times a year with nothing wrong; at 1,000 rows it never fired by chance but missed every shift below 0.3σ, which the calibrated threshold caught almost always from 0.2σ." },
          { t: "p",
            text: "Small batches cannot see small shifts at all: at 200 rows even the calibrated threshold caught a 0.2σ shift only 18% of the time. If small shifts matter, aggregate over a longer window before computing the statistic rather than lowering the threshold and drowning in false alarms." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: 140 drift alerts a day, and the one that mattered",
      body: [
        { t: "p",
          text: "**Symptom.** A fraud team's monitoring raised over a hundred drift alerts every day across 300 features, and on-call engineers acknowledged them in bulk. A broken currency conversion that made one feature 100 times too large was among them for four days before anyone noticed." },
        { t: "p",
          text: "**Mechanism.** Alerts fired on KS p < 0.01 with 2 million rows a day, so nearly every feature 'drifted' every day. The real fault looked the same in the alert list as harmless weekday-to-weekend changes." },
        { t: "p",
          text: "**Fix.** Alerts moved to PSI with per-feature thresholds calibrated from three months of no-incident history, plus hard validation rules (ranges, units, null rates) that page immediately. Daily alerts fell to about two, and range violations stopped being drift alerts at all." }
      ] }
  ],

  takeaways: [
    "PSI measures **how much** a distribution moved; a KS or chi-square p-value measures **how sure** you are that anything moved.",
    "A **0.05σ** shift at 5,000 rows: KS p = **0.0001**, PSI **0.005**. P-values flag trivial changes at scale.",
    "PSI inflates on small batches: **0.028** with no shift at 500 rows.",
    "PSI 0.1 ≈ a **0.32σ** mean shift; 0.25 ≈ **0.5σ**. The thresholds are conventions.",
    "Equal-width bins on a skewed feature hid a real shift (**0.028** against **0.067–0.075**). Use quantile bins.",
    "Calibrate thresholds from the **no-change** distribution at your batch size: **0.116** at 200 rows, **0.022** at 1,000.",
    "At 1,000 rows, the calibrated threshold caught a 0.2σ shift **99%** of the time; PSI > 0.1 caught **0%**.",
    "Hard validation rules for ranges, units and nulls should page; drift statistics should not."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "With 50,000 rows a day, nearly every feature fails a KS test at p < 0.01. Why?",
        options: [
          "The KS test is biased against normally distributed data",
          "Large samples make even tiny differences significant",
          "The reference sample is far too small to compare",
          "KS needs equal sample sizes on both sides"
        ],
        answer: 1,
        why: "A p-value measures evidence of any difference; with enough data, trivial differences become certain. A 0.05σ shift gave p = 10⁻¹⁴ at 50,000 rows. KS works for any continuous distribution and unequal sizes." },
      { stem: "PSI is 0.03 on a day with 300 rows and nothing has changed. What explains it?",
        options: [
          "A small shift that the KS test would confirm",
          "Sampling noise in each bin inflates PSI on small batches",
          "PSI is undefined below 1,000 rows of data",
          "Quantile bins are always the wrong choice for small samples"
        ],
        answer: 1,
        why: "Each bin's share is noisy with few rows, and the noise adds to the sum: no-change PSI had a median of 0.043 at 200 rows. PSI is defined at any size; the remedy is a size-aware threshold, not other bins." },
      { stem: "Roughly what mean shift does the conventional PSI threshold of 0.25 correspond to?",
        options: [
          "About a 0.05 standard-deviation shift",
          "About a 0.5 standard-deviation shift",
          "About a 2 standard-deviation shift",
          "It does not correspond to any mean shift"
        ],
        answer: 1,
        why: "The script measured PSI 0.251 at 0.5σ and 0.106 at 0.32σ for a normal feature. 0.05σ gave about 0.004, and 2σ would give a PSI far above 1." },
      { stem: "What is the defensible way to set a PSI alert threshold?",
        options: [
          "Use 0.1 for warning and 0.25 for action, as is the norm",
          "A high percentile of no-change PSI at your batch size",
          "Alert whenever the KS p-value falls below 0.05",
          "Set it so that the dashboard turns red once a week"
        ],
        answer: 1,
        why: "The no-change distribution gives a known false-alarm rate for your batch size; the 99th percentile ranged from 0.116 to 0.005. Fixed conventions ignore batch size, and p-value alerts fire constantly at scale." }
    ] },

  interview: { title: "In an interview",
    sub: "Detection questions are about false alarms as much as detection.",
    questions: [
      { level: "core",
        q: "How would you monitor feature drift for a model with 200 features?",
        strong: "A strong answer separates hard validation from drift statistics and calibrates thresholds.",
        answer: [
          { t: "p",
            text: "Two layers. Hard validation (types, ranges, units, null rates, category sets) that blocks or pages immediately, because those are pipeline faults. Then drift statistics: PSI with quantile bins from the training reference, computed over a window large enough to be stable, with per-feature thresholds from the no-change distribution and features weighted by importance, so a shift in a feature the model barely uses does not page anyone." },
          { t: "p",
            text: "Drift alerts go to a daily review, not a pager, and outcome metrics carry more weight than input statistics." }
        ] },
      { level: "advanced",
        q: "Why not just use a statistical test with p < 0.05 for drift?",
        strong: "A strong answer explains significance against effect size and multiple testing.",
        answer: [
          { t: "p",
            text: "With production volumes every difference is significant, so the test answers 'did anything change?' with yes every day. Across 200 features at p < 0.05 you also expect 10 false alarms a day from chance alone. Use an effect size such as PSI or the KS statistic with a threshold that reflects what matters, calibrated against history; tests are useful for small samples, where the question really is whether you have evidence yet." }
        ] },
      { level: "core",
        q: "How do binning choices affect PSI?",
        strong: "A strong answer prefers quantile bins from the reference, fixed over time, and handles empty bins.",
        answer: [
          { t: "p",
            text: "Equal-width bins on skewed data put most rows in one bin and hide changes in the tail; the script measured 0.028 against 0.067 for quantile bins on the same shift. Use quantile bins computed once from the reference and kept fixed, add an epsilon or clip for empty bins, and keep the bin count moderate (10 to 20), since more bins add sampling noise on small batches." }
        ] }
    ] }
});
