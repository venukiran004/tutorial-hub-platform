EC.receiveLesson({
  id: "2.4",

  lede: "Two techniques buy accuracy with compute rather than with better prompting. **Self-consistency** runs the same chain-of-thought several times and takes the majority answer. **Tree-of-thought** generates several approaches, scores them, and follows the best. The first has an exact formula behind it, which this lesson computes — including the regime where majority voting makes things measurably *worse*, which is not a caveat people usually mention.",

  objectives: [
    "Compute the accuracy of a majority vote from the per-sample accuracy and the sample count",
    "Identify the regime where self-consistency degrades rather than improves accuracy",
    "Quantify the diminishing return per additional sample",
    "Describe tree-of-thought and say what it requires that self-consistency does not",
    "Choose between them, and against both, for a given task"
  ],

  prerequisites: ["1.2", "2.3"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "self-consistency", text: "Self-consistency is a majority vote",
      sub: "Same prompt, temperature above zero, N samples, most common answer wins" },

    { t: "p", text: "The procedure is three lines. Run the same chain-of-thought prompt N times at a temperature above zero so the samples differ (1.2). Extract the final answer from each. Return whichever answer appeared most often." },

    { t: "code", lang: "python", title: "self_consistency.py", code: `from collections import Counter

def self_consistent(prompt, n=5, temperature=0.7):
    answers = [extract_answer(call(prompt, temperature=temperature))
               for _ in range(n)]
    counts = Counter(answers)
    answer, votes = counts.most_common(1)[0]
    return answer, votes / n          # the agreement fraction is a usable signal`,
      hl: [8],
      caption: "The second return value is what most implementations throw away and should not: an answer that won 5 of 5 is a different object from one that won 2 of 5, and the difference is actionable." },

    { t: "p", text: "The reference's example has five runs producing 42, 42, 38, 42, 42 — a 4/5 majority — and notes that this is \"more expensive but significantly more accurate\". Both halves of that are quantifiable exactly, because a majority vote over independent samples is a binomial." },

    { t: "math", tex: "P(\\text{majority correct}) = \\sum_{k=\\lceil n/2 \\rceil}^{n} \\binom{n}{k} p^k (1-p)^{n-k}" },

    { t: "code", lang: "python", title: "g21.py — the exact lift", code: `def majority_correct(p, n):
    """P(majority of n independent samples is correct), p = per-sample accuracy."""
    need = n // 2 + 1
    return sum(math.comb(n, k) * p ** k * (1 - p) ** (n - k)
               for k in range(need, n + 1))

for p in (0.4, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9):
    print("%-8.2f %s" % (p, "  ".join("%-8.4f" % majority_correct(p, n)
                                      for n in (1, 3, 5, 9, 21))))`,
      out: `  p        n=1       n=3       n=5       n=9       n=21
  0.40     0.4000    0.3520    0.3174    0.2666    0.1744
  0.50     0.5000    0.5000    0.5000    0.5000    0.5000
  0.55     0.5500    0.5748    0.5931    0.6214    0.6790
  0.60     0.6000    0.6480    0.6826    0.7334    0.8256
  0.70     0.7000    0.7840    0.8369    0.9012    0.9736
  0.90     0.9000    0.9720    0.9914    0.9991    1.0000`,
      hl: [9, 10],
      caption: "Read the table across for the lift and down for the condition. A model at 0.70 per sample reaches **0.9736** with 21 samples. A model at 0.40 falls to **0.1744**." },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "the-condition", text: "The condition nobody states",
      sub: "Below 50% per-sample accuracy, voting makes it worse" },

    { t: "code", lang: "python", title: "g21.py — the inversion", code: `for p in (0.3, 0.4, 0.49):
    print("p=%.2f  n=1 %.4f -> n=21 %.4f  (%s)"
          % (p, p, majority_correct(p, 21),
             "worse" if majority_correct(p, 21) < p else "better"))`,
      out: `  p=0.30  n=1 0.3000 -> n=21 0.0264  (worse)
  p=0.40  n=1 0.4000 -> n=21 0.1744  (worse)
  p=0.49  n=1 0.4900 -> n=21 0.4630  (worse)

  below 0.5 the majority converges on the WRONG answer. Voting amplifies
  whatever the model does most often, which is only helpful above chance.`,
      caption: "A model that is right 30% of the time, sampled 21 times and voted, is right **2.6%** of the time — eleven times worse than a single sample, for twenty-one times the cost." },

    { t: "callout", kind: "trap", title: "Voting amplifies the mode, not the truth",
      body: [
        { t: "p", text: "Majority voting has no access to correctness. It finds the answer the model produces most often, and improves accuracy only because — above chance — that happens to be the right one more often than not. Below chance, the same mechanism runs in reverse with the same force." },
        { t: "p", text: "The dangerous case is not a model at 30%, which you would notice. It is a model at 45% on a *subset* of your traffic — a category it systematically misreads — where self-consistency is quietly making that subset worse while the aggregate looks improved." },
        { t: "p", text: "So the check before adopting it is per-segment: measure single-sample accuracy on each slice of traffic you can identify, and confirm every slice is above 0.5. An aggregate above chance can contain a slice below it." }
      ] },

    { t: "viz", title: "Majority voting is a lever, and it turns both ways", caption: "Exact binomial values. The crossing point is p = 0.5, where voting does nothing at any N; on either side the effect compounds with the number of samples.",
      svg: `<svg viewBox="0 0 760 240" width="100%" role="img" aria-label="Majority vote accuracy against per-sample accuracy">
  <line x1="70" y1="196" x2="700" y2="196" style="stroke:var(--line)" stroke-width="1.2"/>
  <line x1="70" y1="30" x2="70" y2="196" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="58" y="36" text-anchor="end" class="s-sub">1.00</text>
  <text x="58" y="200" text-anchor="end" class="s-sub">0.00</text>

  <line x1="70" y1="196" x2="700" y2="30" style="stroke:var(--line)" stroke-width="1.2" stroke-dasharray="4 4"/>
  <text x="640" y="52" class="s-sub">n = 1 (no voting)</text>

  <path d="M70 196 L175 191 L280 169 L332 113 L385 58 L490 42 L595 36 L700 31"
        fill="none" style="stroke:var(--accent)" stroke-width="2.2"/>
  <text x="470" y="80" class="s-sub" style="fill:var(--accent)">n = 21</text>

  <line x1="385" y1="30" x2="385" y2="204" style="stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="3 3"/>
  <text x="385" y="220" text-anchor="middle" class="s-label" style="fill:var(--crit)">p = 0.50</text>

  <text x="200" y="120" text-anchor="middle" class="s-sub" style="fill:var(--crit)">voting makes it WORSE</text>
  <text x="200" y="136" text-anchor="middle" class="s-mono" style="fill:var(--crit)">0.40 → 0.1744</text>

  <text x="560" y="140" text-anchor="middle" class="s-sub" style="fill:var(--good)">voting makes it better</text>
  <text x="560" y="156" text-anchor="middle" class="s-mono" style="fill:var(--good)">0.70 → 0.9736</text>

  <text x="385" y="238" text-anchor="middle" class="s-sub">per-sample accuracy</text>
</svg>` },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "how-many", text: "How many samples",
      sub: "Cost is linear in N; accuracy is emphatically not" },

    { t: "code", lang: "python", title: "g21.py — marginal return per extra call", code: `for p in (0.6, 0.8):
    for n in (3, 5, 9, 21):
        lift = majority_correct(p, n) - p
        print("p=%.1f n=%-3d accuracy %+.4f for %dx the cost -> %+.4f per extra call"
              % (p, n, lift, n, lift / (n - 1)))`,
      out: `    p=0.6 n=3   accuracy +0.0480 for 3x the cost -> +0.0240 per extra call
    p=0.6 n=5   accuracy +0.0826 for 5x the cost -> +0.0206 per extra call
    p=0.6 n=9   accuracy +0.1334 for 9x the cost -> +0.0167 per extra call
    p=0.6 n=21  accuracy +0.2256 for 21x the cost -> +0.0113 per extra call
    p=0.8 n=3   accuracy +0.0960 for 3x the cost -> +0.0480 per extra call
    p=0.8 n=5   accuracy +0.1421 for 5x the cost -> +0.0355 per extra call
    p=0.8 n=9   accuracy +0.1804 for 9x the cost -> +0.0226 per extra call
    p=0.8 n=21  accuracy +0.1990 for 21x the cost -> +0.0100 per extra call`,
      caption: "Per extra call, the return falls by roughly half between n=3 and n=21 in both rows. The n=3 row is where most of the value is: at p=0.8 it captures 0.096 of the eventual 0.199." },

    { t: "p", text: "Two readings worth taking. First, **n=3 is the efficient point** and n=5 is defensible; beyond that you are paying linearly for a sub-linear return. Second, the *shape* differs by starting accuracy — at p=0.8 the curve is nearly exhausted by n=9 (0.1804 of a possible 0.1990), while at p=0.6 it is still climbing at n=21. Weak models benefit from more samples; strong models saturate." },

    { t: "callout", kind: "good", title: "Use the agreement fraction, not just the winner",
      body: [
        { t: "p", text: "An answer that won 5 of 5 and one that won 2 of 5 are both \"the majority answer\", and treating them the same throws away the most useful thing self-consistency produces." },
        { t: "p", text: "Unanimous agreement is a reasonable proxy for the model being confident in a way that a single call's logprob is not (1.1) — it is a spread over independent samples rather than a number conditional on your sampling settings. A bare plurality is a signal that the task is at the edge of the model's ability on this input." },
        { t: "p", text: "The practical use is routing: accept unanimous answers, escalate low-agreement ones to a stronger model or a human. That converts a technique that improves average accuracy into one that also tells you which cases to distrust, and it is the same idea as the escalation rule in 11.9." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "tot", text: "Tree-of-thought explores instead of repeating",
      sub: "Several approaches, scored, and the best one followed" },

    { t: "p", text: "Self-consistency samples the same approach repeatedly and votes. Tree-of-thought generates *different* approaches, evaluates each, and continues from the best — a search rather than a poll." },

    { t: "code", lang: "text", title: "The reference's ToT pattern", code: `Problem → Branch 1 → Evaluate → Score: 7/10
        → Branch 2 → Evaluate → Score: 9/10 ← Pick this
        → Branch 3 → Evaluate → Score: 5/10

Prompt pattern:
"Consider 3 different approaches to solve this problem.
 For each approach, explain the reasoning and evaluate its merit.
 Then select the best approach and provide the final answer."`,
      caption: "From 04_Prompt_Engineering.md §4. The single-prompt version above is the cheap form; the full technique runs each branch as its own call and evaluates them with a separate scoring step." },

    { t: "table",
      head: ["", "Self-consistency", "Tree-of-thought"],
      rows: [
        ["Mechanism", "Sample the same approach N times, vote", "Generate distinct approaches, score, select"],
        ["Requires", "An extractable final answer to compare", "**A way to evaluate a partial solution**"],
        ["Works when", "Answers are discrete and comparable", "Approaches genuinely differ and can be judged"],
        ["Cost", "N × the base call, all parallelisable", "N × generation + N × evaluation, partly sequential"],
        ["Fails when", "Per-sample accuracy is below 0.5", "The evaluator is no better than the generator"]
      ],
      caption: "The second row is the practical dividing line. Self-consistency needs only equality between answers; tree-of-thought needs a judge." },

    { t: "callout", kind: "tradeoff", title: "Tree-of-thought's weak point is the evaluator",
      body: [
        { t: "p", text: "If the same model generates the branches and scores them, the scoring is subject to the same errors as the generation. A branch the model got wrong is a branch it is inclined to score well, because the same misunderstanding produced both." },
        { t: "p", text: "That is why the technique works best where the evaluation is **cheaper or more reliable than the generation** — a unit test that runs, a constraint checker, a calculator, a retrieval step that verifies a claim. Where the evaluator is just another prompt to the same model, the gains are much smaller than the compute suggests." },
        { t: "p", text: "It is also why self-consistency is the one to reach for first: it needs no evaluator, it parallelises completely, and the formula above tells you exactly what it will buy." }
      ] },

    { t: "p", text: "Both techniques are the prompt-level version of what 7.10 calls test-time compute — spending more at inference rather than more in training. A reasoning model (1.10) does something similar internally, which is why layering self-consistency on top of one is often redundant and always expensive." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the N that pays for a given error cost",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Self-consistency costs N times as much and buys a computable amount of accuracy. Whether it is worth it depends on one number nobody puts in the prompt: what an error costs." },
        { t: "p", text: "Build the decision properly, including the check that the technique is even applicable." }
      ],
      requirements: [
        "Implement the binomial majority formula",
        "For a base accuracy of 0.75, a call cost of $0.004 and error costs of $0.01, $0.50 and $5.00, find the N that minimises total expected cost",
        "Report the optimal N and the total cost at each error cost",
        "Repeat for a base accuracy of 0.45 and explain what happens",
        "State the check you would run before deploying this on real traffic"
      ],
      hint: "Total expected cost per request is `N × call_cost + (1 − majority_accuracy(p, N)) × error_cost`. Sweep odd N and take the minimum.",
      solution: { lang: "python", title: "g24_ex.py",
        code: `import math

def majority(p, n):
    return sum(math.comb(n, k) * p ** k * (1 - p) ** (n - k)
               for k in range(n // 2 + 1, n + 1))

CALL = 0.004

def best_n(p, err, ns=range(1, 42, 2)):
    table = [(n, n * CALL + (1 - majority(p, n)) * err) for n in ns]
    return min(table, key=lambda t: t[1]), table

for p in (0.75, 0.45):
    print("base accuracy %.2f" % p)
    for err in (0.01, 0.50, 5.00):
        (n, total), table = best_n(p, err)
        single = 1 * CALL + (1 - p) * err
        print("  error cost $%5.2f -> best N=%-3d total $%.4f   (N=1 would be $%.4f)"
              % (err, n, total, single))
    print()`,
        out: `base accuracy 0.75
  error cost $ 0.01 -> best N=1   total $0.0065   (N=1 would be $0.0065)
  error cost $ 0.50 -> best N=9   total $0.0605   (N=1 would be $0.1290)
  error cost $ 5.00 -> best N=23  total $0.1152   (N=1 would be $1.2540)

base accuracy 0.45
  error cost $ 0.01 -> best N=1   total $0.0095   (N=1 would be $0.0095)
  error cost $ 0.50 -> best N=1   total $0.2790   (N=1 would be $0.2790)
  error cost $ 5.00 -> best N=1   total $2.7540   (N=1 would be $2.7540)`,
        notes: [
          { t: "p", text: "At 0.75 base accuracy the optimal N tracks the error cost exactly as you would hope: N=1 when an error costs a penny, N=9 at fifty pence, N=23 at five pounds — where it takes the expected cost from $1.2540 to $0.1152, a **91% reduction**. The technique is worth a great deal when errors are expensive and nothing at all when they are cheap." },
          { t: "p", text: "At 0.45 base accuracy the optimiser chooses N=1 at every error cost, which is the formula telling you the technique is inapplicable. Below chance, every additional sample moves the expected cost in the wrong direction, so the best available N is the smallest one. No amount of error cost changes that, because voting is not buying accuracy — it is amplifying whichever answer the model favours." },
          { t: "p", text: "The check before deploying: **measure single-sample accuracy per segment, not in aggregate.** An overall 0.75 can contain a category sitting at 0.45, and on that category self-consistency will be making things worse while the headline number improves. That is the failure this whole lesson exists to prevent, and it is invisible unless you slice the measurement." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: self-consistency that improved the average and ruined one category",
      body: [
        { t: "p", text: "**Symptom.** A document classifier adopted 5-sample self-consistency. Overall accuracy rose from 0.78 to 0.85 and the change shipped. Six weeks later a customer escalated that their document type — a small category, about 3% of volume — was being misclassified almost every time, worse than before the change." },
        { t: "p", text: "**What the per-segment numbers showed.** Single-sample accuracy on that category had been 0.44 — the model systematically confused it with an adjacent type. Under 5-sample voting it fell to 0.39, exactly as the binomial predicts for a sub-chance input. Every other category was above 0.5 and improved, which is why the aggregate rose." },
        { t: "p", text: "**Mechanism.** Majority voting amplifies the mode. Above chance the mode is usually correct and voting helps; below chance the mode is the systematic error and voting entrenches it. The aggregate improvement was real and concealed a category where the technique was doing precise, predictable harm — and because the category was 3% of volume, it moved the headline number by nothing." },
        { t: "p", text: "**Fix.** Per-segment evaluation before and after any change of this kind, which is the check the exercise ends on. Then the agreement fraction was put to use: that category's votes were rarely unanimous, so routing low-agreement results to a stronger model caught most of them — turning the same technique into a detector for the cases it could not handle. 8.10's argument is this one: an aggregate metric can improve while a slice you care about gets worse, and only a sliced evaluation will say so." }
      ] }
  ],

  takeaways: [
    "**Self-consistency is a majority vote** over N samples of the same chain-of-thought prompt at temperature above zero.",
    "The lift is exactly binomial: at p=0.70 per sample, 21 samples give **0.9736**; at p=0.90 they give 1.0000 to four decimal places.",
    "**Below p=0.5 voting makes it worse**, with the same force. At p=0.30, 21 samples give **0.0264** — eleven times worse than a single sample, for 21× the cost.",
    "Voting amplifies the **mode**, not the truth. It has no access to correctness; it helps only because above chance the most common answer is usually right.",
    "**The dangerous case is a sub-chance slice inside an above-chance aggregate** — a category the model systematically misreads, quietly degraded while the headline improves.",
    "Cost is linear in N; accuracy is not. Per extra call the return roughly halves between n=3 and n=21: at p=0.8, **+0.0480 per call at n=3 and +0.0100 at n=21**.",
    "**n=3 is the efficient point**, n=5 is defensible. Weak models keep improving to n=21; strong models are nearly saturated by n=9.",
    "**The agreement fraction is the most useful output** and is usually discarded. Unanimity is a better confidence proxy than a single call's logprob, and low agreement is a routing signal.",
    "**Tree-of-thought needs an evaluator**; self-consistency needs only equality between answers. Where the evaluator is the same model, it inherits the same errors.",
    "ToT works best where evaluation is cheaper or more reliable than generation — a test that runs, a constraint checker, a calculator.",
    "Optimal N tracks the cost of an error: at p=0.75 and $0.004 a call, the best N is 1 at a penny per error, 9 at fifty pence, and **23 at five pounds — a 91% reduction in expected cost**."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Your model is right 40% of the time on a task. You apply 21-sample self-consistency. What happens?",
        options: ["Accuracy rises toward 40% with less variance", "Accuracy falls to about 17% — voting amplifies the wrong answer", "Accuracy stays at 40%", "Accuracy rises above 50%"],
        answer: 1,
        why: "Majority voting finds the answer the model produces most often, and below chance that is a wrong one — the binomial gives 0.1744 at p=0.40 with n=21, and 0.0264 at p=0.30. The mechanism that helps above 0.5 runs in reverse with the same force below it. Accuracy is unchanged only at exactly p=0.5, where voting does nothing at any N. Nothing about sampling can lift a sub-chance model above chance, because there is no signal being averaged in — only a mode being amplified." },

      { stem: "At p=0.8, self-consistency gives +0.096 accuracy at n=3 and +0.199 at n=21. What does that tell you about N?",
        options: ["Always use 21 — more samples are always better", "n=3 captures nearly half the total gain for a seventh of the extra cost; returns fall steeply", "The relationship is linear", "n=21 is twice as good as n=3"],
        answer: 1,
        why: "Per extra call the return falls from +0.0480 at n=3 to +0.0100 at n=21 — a factor of nearly five — while cost rises linearly, so most of the value is captured early. n=21 gives about twice the absolute lift for ten times the extra calls, which is the opposite of the fourth option's framing. Whether the extra calls are worth it depends entirely on what an error costs; at a penny per error the optimiser chose n=1 even at p=0.75, and at five pounds it chose n=23." },

      { stem: "You adopt self-consistency and aggregate accuracy rises from 0.78 to 0.85. What should you check before shipping?",
        options: ["Nothing — the improvement is clear", "Per-segment accuracy, in case a slice below 0.5 is being made worse", "That temperature is high enough", "That N is odd"],
        answer: 1,
        why: "An aggregate above chance can contain a category below it, and on that category voting degrades accuracy exactly as the binomial predicts — measured in the incident, a 3% category went from 0.44 to 0.39 while the headline rose. A small slice moves the aggregate by nothing, so the harm is invisible without slicing. Temperature above zero is necessary for the samples to differ but is not the risk here; an odd N avoids ties and is worth doing, but it is a detail rather than the check that matters." },

      { stem: "What does tree-of-thought require that self-consistency does not?",
        options: ["A higher temperature", "A way to evaluate a partial solution", "More samples", "Structured output"],
        answer: 1,
        why: "Self-consistency only needs to compare final answers for equality, so it works wherever answers are discrete. Tree-of-thought has to score competing branches, which means an evaluator — and where that evaluator is the same model that generated the branches, it inherits the same misunderstandings and the gains are much smaller than the compute suggests. The technique earns its cost where evaluation is cheaper or more reliable than generation: a unit test, a constraint checker, a calculator. Temperature, sample count and output format are common to both." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "A good question here because the naive answer — \"sample more and vote\" — is correct and incomplete in a way that is easy to probe.",
    questions: [
      { level: "core",
        q: "What is self-consistency and what does it buy you?",
        strong: "A strong answer gives the mechanism, a number from the binomial, and the condition.",
        answer: [
          { t: "p", text: "Run the same chain-of-thought prompt N times at a temperature above zero, extract the final answer from each, return the most common one. The lift is exactly binomial — from a per-sample accuracy of 0.70, twenty-one samples give 0.9736." },
          { t: "p", text: "The condition is the part worth leading with, because it is usually omitted: it only works above 50% per-sample accuracy. Voting amplifies whichever answer the model produces most often, so below chance it amplifies the systematic error. At p=0.30 with 21 samples you get 0.0264 — eleven times worse than a single call, for twenty-one times the cost." },
          { t: "p", text: "And I would mention the thing most implementations discard: the agreement fraction. Five of five and three of five are both \"the majority answer\", and the difference is a better confidence signal than a logprob, because it is a spread over independent samples rather than a number conditional on your sampling settings." }
        ] },

      { level: "advanced",
        q: "How many samples would you use?",
        strong: "A strong answer treats it as an economic decision and knows the shape of the return curve.",
        answer: [
          { t: "p", text: "It depends on what an error costs, and that is computable rather than a judgement call. Expected cost per request is N times the call cost plus the failure probability times the error cost, and you sweep odd N and take the minimum." },
          { t: "p", text: "I ran it at 0.75 base accuracy and $0.004 a call: the optimum is N=1 when an error costs a penny, N=9 at fifty pence, and N=23 at five pounds — where it takes expected cost from $1.2540 to $0.1152." },
          { t: "p", text: "Absent that number, n=3 is the efficient default. Per extra call the return falls from about +0.048 at n=3 to +0.010 at n=21 at p=0.8, so most of the value is in the first couple of extra samples. And the shape depends on where you start: a weak model keeps improving to n=21, a strong one is nearly saturated by n=9." }
        ] },

      { level: "advanced",
        q: "Self-consistency improved your aggregate accuracy. What would you check before shipping it?",
        strong: "A strong answer goes straight to per-segment measurement and can explain the mechanism that makes an aggregate misleading here.",
        answer: [
          { t: "p", text: "Per-segment accuracy, because an aggregate above chance can contain a slice below it — and on a sub-chance slice this technique makes things worse in a precise, predictable way rather than merely failing to help." },
          { t: "p", text: "I have seen exactly that: overall accuracy went 0.78 to 0.85, and a category that was 3% of volume went from 0.44 to 0.39, which is what the binomial predicts. It moved the headline by nothing and was found six weeks later by a customer escalation." },
          { t: "p", text: "So the check is: single-sample accuracy on every slice you can name, and every slice above 0.5 before adopting. And then I would use the agreement fraction as a mitigation — the categories where the model is weakest are the ones where votes are rarely unanimous, so routing low-agreement results to a stronger model turns the same technique into a detector for the cases it cannot handle." }
        ] }
    ]
  }
});
