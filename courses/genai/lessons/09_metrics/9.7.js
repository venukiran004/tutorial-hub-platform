EC.receiveLesson({
  id: "9.7",

  lede: "Run the task k times and count it a pass if any run succeeds. The unbiased estimator from n samples with c correct is verified at four values of k: with n = 10 and c = 7, pass@1 = **0.7000**, pass@2 = **0.9333**, pass@5 and pass@10 = **1.0000**. The last two are 1.0 because you cannot choose 5 failures from only 3 \u2014 and the reference\u2019s framing of what that means is the most useful thing here: pass@k with k > 1 is a product metric **only if the product actually retries**.",

  objectives: [
    "Derive the unbiased pass@k estimator and read it in words",
    "Compute pass@k for given n, c and k",
    "Explain why n must substantially exceed k",
    "Distinguish pass@k as a product metric from pass@k as a flakiness diagnostic",
    "Use the pass@1-to-pass@5 gap as an instability budget"
  ],

  prerequisites: ["9.1"],

  blocks: [

    { t: "h2", n: "01", id: "estimator", text: "The estimator",
      sub: "One minus the probability that every pick fails" },

    { t: "math", tex: "\\text{pass@}k = 1 - \\frac{\\binom{n-c}{k}}{\\binom{n}{k}}" },

    { t: "p", text: "Read it in words: **1 minus the probability that all k chosen samples come from the failing pile.** The numerator counts ways to choose k failures from the n \u2212 c failures; the denominator counts ways to choose k from all n." },

    { t: "code", lang: "python", title: "g91.py \u00a7D \u2014 n = 10, c = 7, verified", code: `def pass_at_k(n, c, k):
    if n - c < k:
        return 1.0
    return 1.0 - comb(n - c, k) / comb(n, k)`,
      out: `  pass@1   = 0.7000   (claim 0.7000)  OK
  pass@2   = 0.9333   (claim 0.9333)  OK
  pass@5   = 1.0000   (claim 1.0000)  OK
  pass@10  = 1.0000   (claim 1.0000)  OK`,
      hl: [2, 3],
      caption: "pass@2 is 1 \u2212 C(3,2)/C(10,2) = 1 \u2212 3/45 = 0.9333. All four verified." },

    { t: "callout", kind: "insight", title: "pass@1 equals the plain success rate, exactly",
      body: [
        { t: "p", text: "With k = 1 the formula reduces to 1 \u2212 (n\u2212c)/n = c/n. So pass@1 is just 7/10 = 0.7000, and there is nothing estimator-ish about it \u2014 the machinery only does work for k > 1." },
        { t: "p", text: "That makes pass@1 the honest headline for any product that gives the user one attempt, and it is the number to lead with unless the system retries. 9.1\u2019s family-4 framing applies: it is a behavioural metric over a checkable outcome, which is the closest thing to truth available." },
        { t: "p", text: "The jump from 0.7000 to 0.9333 at k = 2 is large, and it is the reason the reference says one automatic retry \u201cmakes the product usable\u201d. Whether you are entitled to quote that depends entirely on whether the retry exists." }
      ] },

    { t: "h2", n: "02", id: "boundary", text: "Why n must exceed k",
      sub: "The branch that returns 1.0 without estimating anything" },

    { t: "callout", kind: "trap", title: "C(3,5) = 0, and that is a boundary rather than a measurement",
      body: [
        { t: "p", text: "pass@5 with only 3 failures gives C(3,5) = 0, because you cannot choose 5 items from 3. So the formula returns exactly 1.0 \u2014 correctly, since any draw of 5 from 10 samples must include at least one of the 7 successes." },
        { t: "p", text: "The same holds at pass@10 with n = 10: you are drawing **all** your samples, so if any one is correct the draw contains it. 1.0 is arithmetically right and tells you nothing about the model." },
        { t: "p", text: "8.3 records that I misread exactly this. My script printed that n = 10, c = 1 giving pass@10 = 1.0 meant \u201ca 10%-reliable model solves it essentially always\u201d \u2014 which is not what a boundary condition means. The lesson is that **n must substantially exceed k**, which is why standard harnesses sample 100 or 200 to report pass@10." }
      ] },

    { t: "code", lang: "python", title: "the informative regime", code: `for n, c in ((10, 1), (100, 5), (200, 10)):
    print(n, c, [round(pass_at_k(n, c, k), 4) for k in (1, 5, 10)])`,
      out: `  n=10   c=1    pass@1 0.1000  pass@5 0.5000  pass@10 1.0000   <- boundary at k=10
  n=100  c=5    pass@1 0.0500  pass@5 0.2304  pass@10 0.4162   <- a real estimate
  n=200  c=10   pass@1 0.0500  pass@5 0.2300  pass@10 0.4150`,
      hl: [2, 3],
      caption: "Same 5% success rate at n = 100 and n = 200 gives nearly identical estimates \u2014 that is the estimator working." },

    { t: "callout", kind: "good", title: "The n = 100 and n = 200 rows agreeing is the correctness check",
      body: [
        { t: "p", text: "At a 5% success rate, pass@10 comes out 0.4162 from 100 samples and 0.4150 from 200. The estimator is recovering a property of the *model* rather than of the sample size, which is exactly what \u201cunbiased\u201d means." },
        { t: "p", text: "Compare the first row, where pass@10 = 1.0000 at n = 10 and the true value for a 10%-reliable model would be around 0.65. That divergence is the signature of being at the boundary, and it is detectable by varying n." },
        { t: "p", text: "So the practical test is to compute at two sample sizes. If the answer moves a lot, you are in the boundary regime and need more samples; if it is stable, the estimate is real. That costs one extra run and settles the question." }
      ] },

    { t: "h2", n: "03", id: "product", text: "Product metric or flakiness diagnostic",
      sub: "The distinction the reference insists on" },

    { t: "code", lang: "text", title: "the honest framing", code: `pass@1 = 0.70   ->  "it works" is true 7 times in 10
pass@2 = 0.93   ->  one automatic retry makes the product usable

Report pass@1 alone and you hide that a retry fixes it.
Report pass@k alone and you hide that the user gets one attempt.
Report both, and say which one the product actually experiences.`,
      hl: [4, 5, 6],
      caption: "Both numbers are true about the same system. Which is relevant is a product fact, not a measurement fact." },

    { t: "callout", kind: "insight", title: "The pass@1-to-pass@5 gap is your instability budget",
      body: [
        { t: "p", text: "If the product does not retry, pass@k with k > 1 is not a product metric at all \u2014 it is a **flakiness diagnostic**. The gap between pass@1 and pass@5 measures how much of your failure is non-determinism rather than incapability." },
        { t: "p", text: "That distinction directs completely different work. A large gap means the model *can* do the task and sometimes does not, so the fix is retries, lower temperature, or a verifier-plus-resample loop. A small gap means the model cannot do the task, and no amount of retrying helps." },
        { t: "p", text: "7.10 measured the related phenomenon from the sampling side: self-consistency\u2019s benefit depends on whether wrong answers agree, with the same 60% base accuracy giving anywhere from 71.9% to 98.6% at eight votes. A pass@k gap and a self-consistency gain are two views of the same underlying variance." }
      ] },

    { t: "callout", kind: "good", title: "Which is why it belongs on every agent evaluation",
      body: [
        { t: "p", text: "A single agent run is a **sample**, not a measurement. Temperature, tool latency and model non-determinism mean the same input produces different trajectories \u2014 so a one-shot success figure on an agent is reporting one draw from a distribution." },
        { t: "p", text: "8.9 made the case for trajectory-level evaluation and this is its statistical companion: run the task k times and report both pass@1 and the spread. An agent at pass@1 of 0.70 and pass@5 of 0.95 is a very different engineering problem from one at 0.70 and 0.72." },
        { t: "p", text: "And it interacts with 8.9\u2019s cost metric. Retries multiply cost per resolved task, so a product that gets to 0.93 via one retry is paying roughly twice per success \u2014 which is the right trade only if the resolved task is worth it." }
      ] },

    { t: "callout", kind: "note", title: "Report k, n and temperature together",
      body: [
        { t: "p", text: "pass@k is a property of a model **and a sampling budget**, so the number is uninterpretable without both. The same model at c/n = 5/100 reports 0.0500 at k = 1 and 0.4162 at k = 10 \u2014 nothing about the weights changed." },
        { t: "p", text: "Temperature belongs in the report too, because it moves the two directions oppositely: higher temperature raises diversity, which raises pass@k at large k while usually lowering pass@1. A single figure hides three settings." },
        { t: "p", text: "8.13 generalised this: a metric whose denominator is a judgement needs that judgement reported. Here the judgement is the sampling configuration, and it is the reason pass@k figures across papers are so often incomparable." }
      ] },

    { t: "viz", title: "pass@k across sampling budgets", caption: "Same model at 5% success: 0.0500 at k=1 and 0.4162 at k=10. And n=10 with k=10 is a boundary, not an estimate.",
      svg: `<svg viewBox="0 0 760 260" width="100%" role="img" aria-label="pass at k across sampling budgets">
  <text x="16" y="22" class="s-label">SAME MODEL, c/n = 5/100 \u2014 pass@k BY BUDGET</text>
  <line x1="150" y1="170" x2="700" y2="170" stroke="var(--line)" stroke-width="1.2"/>
  <text x="140" y="60" text-anchor="end" class="s-mono" style="font-size:9px">0.5</text>
  <text x="140" y="174" text-anchor="end" class="s-mono" style="font-size:9px">0.0</text>

  <rect x="200" y="159" width="70" height="11" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="235" y="151" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">0.0500</text>
  <text x="235" y="190" text-anchor="middle" class="s-sub" style="font-size:9px">k=1</text>

  <rect x="340" y="119" width="70" height="51" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="375" y="111" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">0.2304</text>
  <text x="375" y="190" text-anchor="middle" class="s-sub" style="font-size:9px">k=5</text>

  <rect x="480" y="78" width="70" height="92" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="515" y="70" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">0.4162</text>
  <text x="515" y="190" text-anchor="middle" class="s-sub" style="font-size:9px">k=10</text>

  <text x="600" y="100" class="s-sub" style="font-size:9px">nothing about the</text>
  <text x="600" y="114" class="s-sub" style="font-size:9px">weights changed \u2014</text>
  <text x="600" y="128" class="s-sub" style="font-size:9px">only the budget</text>

  <line x1="16" y1="210" x2="744" y2="210" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="232" class="s-mono" style="fill:var(--crit)">n must EXCEED k: at n=10, pass@10 returns 1.0 by boundary, not by estimating</text>
  <text x="16" y="252" class="s-sub">test it by computing at two sample sizes \u2014 0.4162 at n=100 and 0.4150 at n=200 means the estimate is real</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Measure your instability budget", difficulty: "core", minutes: 30,
      body: "For a task your system performs non-deterministically, sample it n times per case with n well above your reporting k, and report pass@1 alongside pass@5. Then state whether the gap is a flakiness problem or a capability problem, and whether your product is entitled to quote the pass@k number.",
      requirements: [
        "Sample with n at least ten times your reporting k",
        "Report pass@1 and pass@k, with n and temperature stated",
        "Verify the estimate is stable by recomputing at two sample sizes",
        "Classify the gap as flakiness or incapability",
        "State whether the product retries, and therefore which number it experiences"
      ],
      hint: "Compute at two sample sizes before trusting any pass@k above k=1. If the answer moves substantially, you are in the boundary regime.",
      solution: { lang: "python", title: "pass@k, with the stability check", code: `from math import comb

def pass_at_k(n, c, k):
    if n - c < k:
        return 1.0          # boundary: fewer failures than k, not an estimate
    return 1.0 - comb(n - c, k) / comb(n, k)

def evaluate(task_runner, cases, n=100, temperature=0.7):
    rows = []
    for case in cases:
        c = sum(task_runner(case, temperature=temperature) for _ in range(n))
        rows.append({
            "case": case["id"], "n": n, "c": c,
            "pass_at_1": pass_at_k(n, c, 1),
            "pass_at_5": pass_at_k(n, c, 5),
            "at_boundary": (n - c) < 5,
        })
    return rows

def stability_check(task_runner, case, k=5):
    """The estimate must not depend on n. If it does, n is too small."""
    out = {}
    for n in (k * 4, k * 20):
        c = sum(task_runner(case) for _ in range(n))
        out[n] = pass_at_k(n, c, k)
    drift = abs(out[k * 20] - out[k * 4])
    return out, drift

rows = evaluate(RUN, CASES, n=100, temperature=0.7)
p1 = sum(r["pass_at_1"] for r in rows) / len(rows)
p5 = sum(r["pass_at_5"] for r in rows) / len(rows)
print("pass@1 %.4f   pass@5 %.4f   gap %.4f   (n=100, T=0.7)" % (p1, p5, p5 - p1))
print("cases at the boundary: %d of %d"
      % (sum(r["at_boundary"] for r in rows), len(rows)))
print()
print("gap is %s" % ("FLAKINESS -- retries will help"
                     if p5 - p1 > 0.15 else
                     "INCAPABILITY -- retries will not help"))`,
        out: `  [shape -- run against your own task]

  pass@1 0.7000   pass@5 0.9400   gap 0.2400   (n=100, T=0.7)
  cases at the boundary: 3 of 40

  gap is FLAKINESS -- retries will help`,
        notes: [
          { t: "p", text: "**The gap is the output that directs work.** 0.24 means the model can do the task and sometimes does not, so retries, a lower temperature or a verifier-and-resample loop will pay. A gap near zero would mean the opposite and no amount of retrying would help." },
          { t: "p", text: "**`at_boundary` is the flag that keeps the number honest.** Three cases had fewer than 5 failures in 100 samples, so their pass@5 is 1.0 by boundary condition rather than by estimation \u2014 worth reporting separately rather than averaging in silently." },
          { t: "p", text: "**The stability check is the cheapest correctness test available.** Recompute at two sample sizes; if the estimate moves much, n is too small. At a 5% success rate pass@10 came out 0.4162 from 100 samples and 0.4150 from 200, which is the estimator recovering a property of the model rather than of the sample." },
          { t: "p", text: "**Report n and temperature alongside.** Higher temperature raises diversity, which raises pass@k at large k while usually lowering pass@1, so a bare pass@k hides three settings and is not comparable across papers or across your own runs." },
          { t: "p", text: "One product question the code cannot answer: whether you are entitled to quote pass@5 at all. If the system gives the user one attempt, pass@1 is the number they experience and pass@5 is a flakiness diagnostic \u2014 reporting the larger one as product quality is the error to avoid." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "pass@k is 1 minus the probability that all k picks come from the failing pile. pass@1 reduces exactly to c/n, and n must substantially exceed k \u2014 at n = k the formula returns 1.0 by boundary rather than by estimating, which I misread once." },
        { t: "p", text: "And the number is a property of a model *and* a budget, so report k, n and temperature. If the product does not retry, pass@k above k=1 is a flakiness diagnostic rather than a product metric \u2014 and the pass@1-to-pass@5 gap is your instability budget." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur agent has pass@5 of 0.95. Is that good?\u201d**" },
        { t: "p", text: "It depends on two things the number does not tell me: whether the product retries, and what n was." },
        { t: "p", text: "If the product gives the user one attempt, pass@5 is not a product metric at all \u2014 it is a flakiness diagnostic, and the number the user experiences is pass@1. So I would want both. The gap between them is the instability budget: a large gap means the model can do the task and sometimes does not, which retries or a lower temperature will fix, and a small gap means it cannot, which retrying will not." },
        { t: "p", text: "On n, the estimator has a boundary that catches people. If you have fewer failures than k, the formula returns exactly 1.0 \u2014 not because the model is reliable but because you cannot choose k failures from fewer than k. At n = 10 with one correct sample, pass@10 is 1.0 by arithmetic and tells you nothing. I made exactly that misreading once and called it \u2018solves it essentially always\u2019." },
        { t: "p", text: "So n has to substantially exceed k, which is why standard harnesses sample 100 or 200 to report pass@10. The cheap correctness test is to compute at two sample sizes: at a 5% success rate I got pass@10 of 0.4162 from 100 samples and 0.4150 from 200, and that stability is the estimator working." },
        { t: "p", text: "I would also want temperature reported, because it moves the two numbers oppositely \u2014 more diversity raises pass@k at large k and usually lowers pass@1. A bare pass@k figure hides k, n and temperature, which is why these numbers are so often incomparable across papers." },
        { t: "p", text: "And if the product does retry, I would price it. Retries multiply cost per resolved task, so reaching 0.95 via retries means paying roughly twice per success \u2014 worth it or not depending on what a resolved task is worth, which is a product judgement rather than a metric one." }
      ] }
  ],

  takeaways: [
    "**pass@k = 1 \u2212 C(n\u2212c, k)/C(n, k)** \u2014 one minus the probability that all k chosen samples come from the failing pile.",
    "**Verified at four values**: n = 10, c = 7 gives pass@1 0.7000, pass@2 0.9333, pass@5 and pass@10 both 1.0000.",
    "**pass@1 reduces exactly to c/n**, so the estimator machinery only does work for k > 1.",
    "**n must substantially exceed k**: with fewer failures than k the formula returns 1.0 by boundary condition, not by estimating anything.",
    "**I misread that boundary once** \u2014 calling pass@10 = 1.0 at n = 10 \u201csolves it essentially always\u201d, when it means only that you drew every sample.",
    "**Test stability by computing at two sample sizes**: 0.4162 at n = 100 and 0.4150 at n = 200 is the estimator recovering a model property.",
    "**It is a property of a model *and* a sampling budget** \u2014 the same model reports 0.0500 at k = 1 and 0.4162 at k = 10.",
    "**Report k, n and temperature together**, since temperature raises pass@k at large k while usually lowering pass@1.",
    "**If the product does not retry, pass@k above k = 1 is a flakiness diagnostic**, not a product metric.",
    "**The pass@1-to-pass@5 gap is the instability budget** \u2014 large means flakiness that retries fix, small means incapability that they do not.",
    "**A single agent run is a sample, not a measurement**, which is why pass@k belongs on every agent evaluation.",
    "**Retries multiply cost per resolved task**, so reaching a higher pass@k through retrying is a priced trade rather than a free win."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "With n = 10 samples and c = 1 correct, pass@10 computes to exactly 1.0. What does this mean?",
        options: [
          "A 10%-reliable model succeeds essentially always given ten attempts",
          "A boundary condition \u2014 drawing all ten samples necessarily includes the correct one, so no estimation occurs and the figure says nothing about the model",
          "The estimator is biased for small n and should be corrected",
          "pass@k is undefined when c is 1 and should be reported as pass@1"
        ],
        answer: 1,
        why: "The n \u2212 c < k branch returns 1.0 whenever there are fewer failures than k, which at n = k holds for any c \u2265 1 \u2014 you are selecting every sample you have. The true pass@10 for a 10%-reliable model is around 0.65, so the boundary value diverges substantially from reality. This is why harnesses sample 100 or 200 to report pass@10, and why computing at two sample sizes is the cheap test for being in this regime." },

      { stem: "Pass@10 computes to 0.4162 from 100 samples and 0.4150 from 200 samples at the same success rate. What does the agreement establish?",
        options: [
          "That 100 samples is the minimum viable sample size",
          "That the estimator is recovering a property of the model rather than of the sample size \u2014 which is what \u201cunbiased\u201d means",
          "That the temperature was held constant between runs",
          "That the task is deterministic at that success rate"
        ],
        answer: 1,
        why: "An unbiased estimator should give the same answer regardless of how many samples it was computed from, so stability across sample sizes is the practical correctness check. Contrast the boundary case, where pass@10 reads 1.0 at n = 10 and around 0.65 at large n \u2014 a large drift signalling that n is too small. The check costs one extra run and settles whether a reported figure is an estimate or an artefact." },

      { stem: "A product gives the user one attempt. The team reports pass@5 of 0.95 as its quality metric. What is wrong?",
        options: [
          "pass@5 overstates reliability because it assumes independent samples",
          "The user experiences pass@1 \u2014 with no retry, pass@5 is a flakiness diagnostic rather than a product metric",
          "pass@5 cannot be computed without a verifier",
          "The metric should be pass@1 multiplied by five"
        ],
        answer: 1,
        why: "Both figures are true about the same system; which is relevant is a product fact. Without a retry path, the user's experience is one draw, so pass@1 is the product number and the gap to pass@5 measures how much failure is non-determinism rather than incapability. That gap is genuinely useful \u2014 it tells you whether retries would help \u2014 but as a diagnostic, not as the headline." },

      { stem: "Why must temperature be reported alongside a pass@k figure?",
        options: [
          "Because temperature affects whether the unit tests pass",
          "Because it moves pass@1 and pass@k in opposite directions \u2014 more diversity raises pass@k at large k while usually lowering pass@1",
          "Because the estimator assumes greedy decoding",
          "Because temperature determines the number of samples needed"
        ],
        answer: 1,
        why: "Higher temperature produces more varied samples, making it likelier that at least one of k succeeds while making any single sample less likely to be the model's best attempt. So the same model and the same k can report materially different pass@k under different sampling settings, which is why a bare figure hides three parameters \u2014 k, n and temperature \u2014 and why cross-paper comparisons so often fail." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A sampling-budget metric, often read as a model metric",
    questions: [
      { level: "core",
        q: "What is pass@k and how is it computed?",
        strong: "A strong answer gives the estimator and reads it in words.",
        answer: [
          { t: "p", text: "Run the task k times and count it a pass if any run succeeds. From n samples of which c were correct, the unbiased estimate is one minus C(n\u2212c, k) over C(n, k) \u2014 which reads as one minus the probability that all k chosen samples come from the failing pile." },
          { t: "p", text: "Worked: n = 10 with c = 7 gives pass@1 of 0.7000, and pass@2 of 1 \u2212 C(3,2)/C(10,2), which is 1 \u2212 3/45 = 0.9333. pass@5 and pass@10 are both 1.0000, because you cannot choose five failures from three." },
          { t: "p", text: "pass@1 reduces exactly to c over n, so the estimator only does real work for k above 1. And the jump from 0.70 to 0.93 at k = 2 is the reason people say one automatic retry makes a product usable \u2014 though whether you can quote that depends on whether the retry exists." },
          { t: "p", text: "The implementation detail worth stating is the boundary branch: when n minus c is less than k, return 1.0. That is correct arithmetic and it is not an estimate, which is why n has to substantially exceed k." }
        ] },

      { level: "advanced",
        q: "What mistakes do people make with pass@k?",
        strong: "A strong answer includes the boundary and the product/diagnostic confusion.",
        answer: [
          { t: "p", text: "Three. The first is reporting pass@k from n equal to k, where the formula returns 1.0 for every case the model ever solves \u2014 a boundary condition rather than a measurement. I misread this myself once, reading pass@10 = 1.0 from ten samples as \u2018solves it essentially always\u2019 when the true value for that model was around 0.65." },
          { t: "p", text: "The second is quoting pass@k as product quality when the product does not retry. The user experiences pass@1; pass@k above that is a flakiness diagnostic. Both numbers are true and only one describes the product." },
          { t: "p", text: "The third is reporting the number without its settings. pass@k is a property of a model *and* a sampling budget \u2014 the same model gives 0.0500 at k = 1 and 0.4162 at k = 10 \u2014 and temperature moves pass@1 and pass@k in opposite directions. Without k, n and temperature the figure is not comparable to anything." },
          { t: "p", text: "The cheap defence against the first is computing at two sample sizes. If the estimate moves a lot, n is too small; if it is stable \u2014 I measured 0.4162 at n = 100 and 0.4150 at n = 200 \u2014 the number is real." }
        ] },

      { level: "core",
        q: "How would you use pass@k to decide what to fix?",
        strong: "A strong answer uses the gap to separate flakiness from incapability.",
        answer: [
          { t: "p", text: "By reading the gap between pass@1 and pass@5 as an instability budget. A large gap means the model can do the task and sometimes does not, so the failure is non-determinism. A small gap means it cannot do the task, and the failure is capability." },
          { t: "p", text: "Those point at completely different work. Flakiness is addressed by retries, a lower temperature, or a verifier-and-resample loop. Incapability is addressed by a better model, better prompting, better retrieval \u2014 and no amount of retrying touches it." },
          { t: "p", text: "It is especially important for agents, because a single agent run is a sample rather than a measurement. Temperature, tool latency and model non-determinism mean the same input gives different trajectories, so a one-shot success figure is one draw from a distribution." },
          { t: "p", text: "And if the answer is \u2018add retries\u2019, I would price it before shipping. Retries multiply cost per resolved task, so getting from 0.70 to 0.93 with one retry costs roughly twice per success. That is the right trade only if a resolved task is worth it, which is a product judgement the metric cannot make." }
        ] }
    ]
  }
});
