EC.receiveLesson({
  id: "11.6",

  lede: "Six metrics, a decision flow and a golden set \u2014 and one structural trap that undoes the lot. **An abstention makes no claims, so it is trivially faithful and scores 1.0.** Which means every abstention pulls mean faithfulness *up*, and a retrieval collapse therefore *improves* the metric. Measured: as context recall falls from 0.93 to 0.20, overall faithfulness moves only within 0.883\u20130.924 and **non-monotonically**. Computed over answered requests only it falls 0.920 to 0.750. The denominator is the whole decision.",

  objectives: [
    "Compute faithfulness over the right denominator",
    "Read abstention rate against context recall rather than alone",
    "Define hallucination rate so an abstention is not counted as one",
    "Build a golden set and say what it can resolve",
    "Walk the production decision flow from question to logged answer"
  ],

  prerequisites: ["11.5", "9.16"],

  blocks: [

    { t: "h2", n: "01", id: "metrics", text: "The six metrics",
      sub: "And where each comes from" },

    { t: "table",
      head: ["Metric", "What it measures", "How"],
      rows: [
        ["**Faithfulness / groundedness**", "Answer supported by context", "NLI, an LLM judge, or RAGAS \u2014 sampled"],
        ["**Answer relevance**", "Answer addresses the question", "LLM judge or embedding similarity"],
        ["**Context precision / recall**", "Did retrieval surface the right chunks?", "A labelled set and Recall@k"],
        ["**Hallucination rate**", "Share of answers with \u22651 unsupported claim", "Faithfulness below threshold"],
        ["**Abstention rate**", "Share of \u201cI do not know\u201d responses", "Count \u2014 too low means overconfident, too high means retrieval is weak"],
        ["**Citation accuracy**", "Cited chunks actually support the claim", "Validate cited ids **and** entailment"]
      ] },

    { t: "callout", kind: "insight", title: "Two of the six are defined as pairs, and that is deliberate",
      body: [
        { t: "p", text: "**Abstention rate** is explicitly two-sided in the reference \u2014 too low *and* too high are both faults. That is unusual for a dashboard metric and it is correct, because abstention is the system choosing not to answer, which is good when the context is insufficient and bad when it is not." },
        { t: "p", text: "**Citation accuracy** is defined as two checks: the cited id must be in the retrieved set, *and* the chunk must entail the claim. 11.3 measured why both are needed \u2014 a real id attached to a contradicting claim passes the id check cleanly." },
        { t: "p", text: "The general pattern is that a single number here is almost always ambiguous, which is why the decision flow in \u00a704 reads **pairs**: recall against faithfulness, abstention against recall. 10.13\u2019s whole investigation turned on one such pair." }
      ] },

    { t: "h2", n: "02", id: "denominator", text: "The trap: an abstention is trivially faithful",
      sub: "So the metric moves the wrong way" },

    { t: "callout", kind: "trap", title: "A retrieval collapse improves mean faithfulness",
      body: [
        { t: "p", text: "An abstention makes no claims. Faithfulness is the fraction of claims the context supports, and the fraction of an empty set is 1.0 by construction \u2014 so **every abstention scores a perfect faithfulness.** On the worked golden set, answered requests mean 0.654 and abstentions mean 1.000, giving an overall 0.758 that is **+0.104 above the real figure**." },
        { t: "p", text: "The consequence is worse than a bias. Measured across a degrading system, as context recall falls 0.93 \u2192 0.20 the overall faithfulness moves only within **0.883 to 0.924** \u2014 and **non-monotonically**: it is *higher* at recall 0.20 than at recall 0.48, because 60% abstention drags it back up. So it cannot be read as a trend at all." },
        { t: "p", text: "Computed over **answered requests only**, the same system falls 0.920 \u2192 0.750 monotonically. Same data, same metric name, opposite conclusion \u2014 and the only difference is the denominator." }
      ] },

    { t: "callout", kind: "good", title: "Which sharpens 10.13\u2019s finding rather than contradicting it",
      body: [
        { t: "p", text: "That incident had faithfulness flat at 0.95 while context recall halved from 0.93 to 0.48, and read the flatness as proof the generator was healthy. It was \u2014 but the flatness was partly an artefact: the abstentions the system produced were scoring 1.0 and holding the average up." },
        { t: "p", text: "So the diagnostic conclusion was right and the metric was flattering it. Had the system abstained *more*, faithfulness would have risen during the incident, and a dashboard would have shown quality improving while the product was broken." },
        { t: "p", text: "The fix is to report faithfulness over answered requests and abstention rate beside it. Two numbers, and together they cannot be gamed by abstaining: one measures the answers given, the other counts the answers withheld." }
      ] },

    { t: "callout", kind: "warn", title: "And define hallucination rate so an abstention is not one",
      body: [
        { t: "p", text: "The reference\u2019s `eval_suite` gets this right and it is worth noticing: a hallucination is counted when faithfulness is below threshold **and** the answer did not abstain. Without the second clause every abstention would count as a hallucination, which inverts the metric entirely." },
        { t: "p", text: "That clause is also what makes the abstention string from 11.5 load-bearing. The check is a substring match on the exact abstention wording, so a model that abstains in freely varying prose is both uncountable and miscounted \u2014 its abstentions become hallucinations on the dashboard." },
        { t: "p", text: "On the worked set the rate comes out at **0.40** \u2014 four of ten \u2014 while three abstentions are correctly excluded. Had they been counted, the reported rate would have been 0.70." }
      ] },

    { t: "h2", n: "03", id: "golden", text: "The golden set",
      sub: "Regression-test prompts like code" },

    { t: "callout", kind: "insight", title: "Keep (question, context, acceptable answer *or* abstention) triples",
      body: [
        { t: "p", text: "The third element matters. A golden case whose correct answer is an abstention is the only way to test the abstention path, and without such cases a suite rewards a model that always answers \u2014 which is the overconfident failure the abstention-rate metric exists to catch." },
        { t: "p", text: "Run it on every prompt change and every model change, because both can silently regress grounding. 12.4 is about the version that changes without you doing anything, and the golden set is what detects it." },
        { t: "p", text: "And size it honestly. 9.16\u2019s arithmetic applies unchanged: a ten-case golden set measuring a 0.20 hallucination rate carries **\u00b124.8 points**, which makes it a smoke test rather than a measurement. 200 cases gets you to \u00b15.5." }
      ] },

    { t: "h2", n: "04", id: "flow", text: "The decision flow",
      sub: "Question to logged answer" },

    { t: "code", lang: "text", title: "The production path", code: `User question
   |
   +- Closed-book (no retrieval)?  -> high hallucination risk
   |     +- prefer RAG; if impossible, self-consistency + low temp + abstain on disagreement
   |
   +- RAG path
        +- Retrieve -> did we get relevant chunks? (log chunk ids + scores)
        |     +- No  -> fix retrieval (hybrid + rerank); abstain rather than guess
        +- Generate with grounded+abstention prompt, cite chunk ids, low temp, capped length
        +- Faithfulness gate: score >= threshold?
        |     +- No  -> regenerate / drop unsupported claims / abstain / escalate
        |     +- Yes -> validate citations map to retrieved ids
        +- Serve + log (faithfulness, abstained, citations) for monitoring`,
      hl: [7, 8],
      caption: "The branch at \u201cdid we get relevant chunks\u201d is the one that decides everything after it." },

    { t: "callout", kind: "mental", title: "The flow\u2019s first branch is the cheapest and most skipped",
      body: [
        { t: "p", text: "\u201cDid we get relevant chunks\u201d is answerable from `above_threshold` on the retriever span \u2014 free, instant, and 10.3 argued it is the cheapest quality signal in a RAG system. Branching on it before generating saves the generation cost entirely on the cases that cannot succeed." },
        { t: "p", text: "Note what the \u2018No\u2019 branch does: **abstain rather than guess**, and fix retrieval. It does not try a better prompt, because the context is missing the answer and no prompt recovers that \u2014 which is 11.5\u2019s remedy-by-cause argument appearing in the flow." },
        { t: "p", text: "And the last line is the one that makes everything else measurable: log faithfulness, whether it abstained, and the citations. Without the `abstained` flag the denominator problem in \u00a702 is not even detectable." }
      ] },

    { t: "viz", title: "The denominator decides the conclusion", caption: "Measured. Same system, same metric name, opposite reading.",
      svg: `<svg viewBox="0 0 760 310" width="100%" role="img" aria-label="Faithfulness computed over all requests versus answered requests only as retrieval degrades">
  <text x="16" y="20" class="s-label">AS CONTEXT RECALL COLLAPSES 0.93 -&gt; 0.20</text>

  <line x1="80" y1="150" x2="80" y2="40" stroke="var(--line)" stroke-width="1"/>
  <line x1="80" y1="150" x2="700" y2="150" stroke="var(--line)" stroke-width="1"/>
  <text x="70" y="44" text-anchor="end" class="s-mono" style="font-size:8px">1.00</text>
  <text x="70" y="150" text-anchor="end" class="s-mono" style="font-size:8px">0.70</text>

  <polyline points="140,54 320,62 500,69 660,56" fill="none" stroke="var(--crit)" stroke-width="2"/>
  <circle cx="140" cy="54" r="3.5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <circle cx="320" cy="62" r="3.5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <circle cx="500" cy="69" r="3.5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <circle cx="660" cy="56" r="3.5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="672" y="48" class="s-mono" style="font-size:8px;fill:var(--crit)">0.900</text>
  <text x="140" y="44" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--crit)">0.924</text>
  <text x="300" y="36" class="s-mono" style="font-size:9px;fill:var(--crit)">OVER ALL REQUESTS &#8212; moves 0.883..0.924, NON-MONOTONIC</text>

  <polyline points="140,61 320,75 500,96 660,140" fill="none" stroke="var(--good)" stroke-width="2"/>
  <circle cx="140" cy="61" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <circle cx="320" cy="75" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <circle cx="500" cy="96" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <circle cx="660" cy="140" r="3.5" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="672" y="144" class="s-mono" style="font-size:8px;fill:var(--good)">0.750</text>
  <text x="400" y="122" class="s-mono" style="font-size:9px;fill:var(--good)">OVER ANSWERED ONLY &#8212; falls 0.920 -&gt; 0.750, monotonic</text>

  <text x="140" y="166" text-anchor="middle" class="s-mono" style="font-size:8px">recall 0.93</text>
  <text x="320" y="166" text-anchor="middle" class="s-mono" style="font-size:8px">0.75</text>
  <text x="500" y="166" text-anchor="middle" class="s-mono" style="font-size:8px">0.48</text>
  <text x="660" y="166" text-anchor="middle" class="s-mono" style="font-size:8px">0.20</text>
  <text x="140" y="178" text-anchor="middle" class="s-sub">abstain 5%</text>
  <text x="320" y="178" text-anchor="middle" class="s-sub">15%</text>
  <text x="500" y="178" text-anchor="middle" class="s-sub">35%</text>
  <text x="660" y="178" text-anchor="middle" class="s-sub">60%</text>

  <rect x="16" y="196" width="728" height="44" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="214" class="s-mono" style="font-size:10px;fill:var(--crit)">AN ABSTENTION MAKES NO CLAIMS, SO IT SCORES FAITHFULNESS 1.0 BY CONSTRUCTION</text>
  <text x="28" y="232" class="s-sub">every abstention pulls the mean UP &#183; measured gap on the golden set: +0.104 &#183; so abstaining more LOOKS like improving</text>

  <rect x="16" y="250" width="356" height="52" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="268" class="s-mono" style="font-size:9px;fill:var(--good)">REPORT TWO NUMBERS</text>
  <text x="28" y="284" class="s-mono" style="font-size:8px">faithfulness over ANSWERED requests</text>
  <text x="28" y="296" class="s-mono" style="font-size:8px">+ abstention rate beside it</text>

  <rect x="388" y="250" width="356" height="52" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="400" y="268" class="s-mono" style="font-size:9px;fill:var(--warn)">AND READ ABSTENTION AGAINST RECALL</text>
  <text x="400" y="284" class="s-mono" style="font-size:8px">0.30 + recall 0.48 = retrieval is weak</text>
  <text x="400" y="296" class="s-mono" style="font-size:8px">0.40 + recall 0.95 = the prompt is too strict</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Build the dashboard and find the denominator bug", difficulty: "advanced", minutes: 35,
      body: "Run the `eval_suite` over a golden set, build the full six-metric dashboard from the same rows, then compute faithfulness over all requests and over answered requests only and compare. Simulate a degrading system and check which version detects it.",
      requirements: [
        "The hallucination rate, with the abstention clause",
        "All six metrics computed from the same rows",
        "Faithfulness over all requests against answered only, with the gap",
        "A degradation simulation showing which version tracks recall",
        "The abstention rate interpreted against context recall, not alone"
      ],
      hint: "Abstentions have no claims, so the faithfulness of an abstention is the fraction of an empty set \u2014 which the formula returns as 1.0. That is correct arithmetic and the wrong denominator.",
      solution: { lang: "python", title: "the dashboard, and the denominator", code: `import math

GOLDEN = [
    # question, faithfulness, abstained, citations_ok, context_recall
    ("refund window unopened",   1.00, False, True,  1.0),
    ("refund window opened",     0.50, False, True,  1.0),
    ("termination notice",       1.00, False, True,  1.0),
    ("termination fee",          0.75, False, True,  1.0),
    ("support hours",            1.00, False, True,  1.0),
    ("new product spec",         1.00, True,  False, 0.0),
    ("new product pricing",      1.00, True,  False, 0.0),
    ("competitor comparison",    0.33, False, True,  0.5),
    ("CEO name",                 0.00, False, False, 0.0),
    ("API rate limits",          1.00, True,  False, 0.0),
]
THRESHOLD = 0.9

def eval_suite(rows, threshold=THRESHOLD):
    """The version: a hallucination is low faithfulness WITHOUT abstention."""
    halluc = sum(1 for q, f, ab, c, r in rows if f < threshold and not ab)
    return halluc / float(len(rows))

print("THE REFERENCE'S eval_suite, RUN")
print("=" * 72)
print("%-26s %6s %10s %8s %8s" % ("question", "faith", "abstained", "cites", "recall"))
for q, f, ab, c, r in GOLDEN:
    flag = "  <-- counted as a hallucination" if (f < THRESHOLD and not ab) else ""
    print("%-26s %6.2f %10s %8s %8.1f%s" % (q, f, ab, c, r, flag))

rate = eval_suite(GOLDEN)
print()
print("hallucination_rate = %d / %d = %.2f" % (rate * len(GOLDEN), len(GOLDEN), rate))

print()
print("-- the full dashboard, from the same rows --")
n = len(GOLDEN)
abstained = sum(1 for q, f, ab, c, r in GOLDEN if ab)
mean_faith = sum(f for q, f, ab, c, r in GOLDEN) / n
cite_ok = sum(1 for q, f, ab, c, r in GOLDEN if c)
mean_recall = sum(r for q, f, ab, c, r in GOLDEN) / n
print("  faithfulness (mean)   %.3f" % mean_faith)
print("  hallucination rate    %.3f   (faith < %.1f AND not abstained)" % (rate, THRESHOLD))
print("  abstention rate       %.3f   (%d of %d)" % (abstained / float(n), abstained, n))
print("  citation accuracy     %.3f   (%d of %d)" % (cite_ok / float(n), cite_ok, n))
print("  context recall (mean) %.3f" % mean_recall)

print()
print("=" * 72)
print("WHAT THE MEAN FAITHFULNESS HIDES")
print("=" * 72)
answered = [f for q, f, ab, c, r in GOLDEN if not ab]
abstentions = [f for q, f, ab, c, r in GOLDEN if ab]
print("mean faithfulness is %.3f, which looks tolerable." % mean_faith)
print("but it averages two populations that should never be averaged:")
print("  answered   n=%d  mean %.3f" % (len(answered), sum(answered) / len(answered)))
print("  abstained  n=%d  mean %.3f  <-- scores 1.0 BY CONSTRUCTION"
      % (len(abstentions), sum(abstentions) / len(abstentions)))
print()
print("an abstention makes no claims, so it is trivially faithful.")
print("every abstention therefore PULLS MEAN FAITHFULNESS UP:")
print("  mean over answered only : %.3f" % (sum(answered) / len(answered)))
print("  mean over everything    : %.3f" % mean_faith)
print("  the gap                 : %+.3f" % (mean_faith - sum(answered) / len(answered)))
print()
print("so a RETRIEVAL COLLAPSE IMPROVES mean faithfulness: the model abstains")
print("more, and abstentions score 1.0. the metric moves the WRONG WAY on the")
print("most common failure mode in RAG.")
print()
print("-- the same system as retrieval degrades --")
print("%-10s %10s %12s %14s %14s" % ("recall", "abstain", "answered f", "overall f", "reads as"))
for recall, ab_rate, answered_f in ((0.93, 0.05, 0.92), (0.75, 0.15, 0.88),
                                    (0.48, 0.35, 0.82), (0.20, 0.60, 0.75)):
    overall = ab_rate * 1.0 + (1 - ab_rate) * answered_f
    reads = "IMPROVING" if overall > 0.92 else ("flat" if overall > 0.90 else "declining")
    print("%-10.2f %10.2f %12.3f %14.3f %14s" % (recall, ab_rate, answered_f, overall, reads))
print()
print("recall falls 0.93 -> 0.20, a collapse, and overall faithfulness moves only")
print("within 0.883..0.924 -- and NON-MONOTONICALLY: it is HIGHER at recall 0.20")
print("(0.900) than at recall 0.48 (0.883), because 60% abstention drags it back up.")
print("so it cannot be read as a trend at all.")
print()
print("computed over ANSWERED only it falls 0.920 -> 0.750, monotonically, which is")
print("the signal you wanted. the denominator is the whole decision.")

print()
print("=" * 72)
print("THE ABSTENTION RATE IS TWO-SIDED")
print("=" * 72)
for label, ab_rate, recall, verdict in (
        ("healthy",        0.05, 0.93, "fine"),
        ("overconfident",  0.00, 0.93, "abstention path missing or ignored -> it is guessing"),
        ("retrieval weak", 0.30, 0.48, "abstention is masking a recall problem"),
        ("over-cautious",  0.40, 0.95, "recall is fine; the prompt or threshold is too strict")):
    print("  %-16s abstention %.2f  recall %.2f  -> %s" % (label, ab_rate, recall, verdict))
print()
print("the PAIR (abstention rate, context recall) disambiguates all four.")
print("abstention rate alone cannot: 0.30 and 0.40 look similar and mean")
print("opposite things with opposite fixes.")

print()
print("=" * 72)
print("SAMPLE SIZE: WHAT A GOLDEN SET CAN RESOLVE")
print("=" * 72)
for N in (10, 50, 200, 1000):
    se = math.sqrt(0.2 * 0.8 / N)
    print("  N=%-5d hallucination rate 0.20 +/- %.1f pts (95%%)" % (N, 1.96 * se * 100))
print("  -> a 10-case golden set carries +/-24.8 points. it is a smoke test,")
print("     not a measurement. 9.16's arithmetic applies unchanged.")`,
        out: `THE REFERENCE'S eval_suite, RUN
========================================================================
question                    faith  abstained    cites   recall
refund window unopened       1.00      False     True      1.0
refund window opened         0.50      False     True      1.0  <-- counted as a hallucination
termination notice           1.00      False     True      1.0
termination fee              0.75      False     True      1.0  <-- counted as a hallucination
support hours                1.00      False     True      1.0
new product spec             1.00       True    False      0.0
new product pricing          1.00       True    False      0.0
competitor comparison        0.33      False     True      0.5  <-- counted as a hallucination
CEO name                     0.00      False    False      0.0  <-- counted as a hallucination
API rate limits              1.00       True    False      0.0

hallucination_rate = 4 / 10 = 0.40

-- the full dashboard, from the same rows --
  faithfulness (mean)   0.758
  hallucination rate    0.400   (faith < 0.9 AND not abstained)
  abstention rate       0.300   (3 of 10)
  citation accuracy     0.600   (6 of 10)
  context recall (mean) 0.550

========================================================================
WHAT THE MEAN FAITHFULNESS HIDES
========================================================================
mean faithfulness is 0.758, which looks tolerable.
but it averages two populations that should never be averaged:
  answered   n=7  mean 0.654
  abstained  n=3  mean 1.000  <-- scores 1.0 BY CONSTRUCTION

an abstention makes no claims, so it is trivially faithful.
every abstention therefore PULLS MEAN FAITHFULNESS UP:
  mean over answered only : 0.654
  mean over everything    : 0.758
  the gap                 : +0.104

so a RETRIEVAL COLLAPSE IMPROVES mean faithfulness: the model abstains
more, and abstentions score 1.0. the metric moves the WRONG WAY on the
most common failure mode in RAG.

-- the same system as retrieval degrades --
recall        abstain   answered f      overall f       reads as
0.93             0.05        0.920          0.924      IMPROVING
0.75             0.15        0.880          0.898      declining
0.48             0.35        0.820          0.883      declining
0.20             0.60        0.750          0.900      declining

recall falls 0.93 -> 0.20, a collapse, and overall faithfulness moves only
within 0.883..0.924 -- and NON-MONOTONICALLY: it is HIGHER at recall 0.20
(0.900) than at recall 0.48 (0.883), because 60% abstention drags it back up.
so it cannot be read as a trend at all.

computed over ANSWERED only it falls 0.920 -> 0.750, monotonically, which is
the signal you wanted. the denominator is the whole decision.

========================================================================
THE ABSTENTION RATE IS TWO-SIDED
========================================================================
  healthy          abstention 0.05  recall 0.93  -> fine
  overconfident    abstention 0.00  recall 0.93  -> abstention path missing or ignored -> it is guessing
  retrieval weak   abstention 0.30  recall 0.48  -> abstention is masking a recall problem
  over-cautious    abstention 0.40  recall 0.95  -> recall is fine; the prompt or threshold is too strict

the PAIR (abstention rate, context recall) disambiguates all four.
abstention rate alone cannot: 0.30 and 0.40 look similar and mean
opposite things with opposite fixes.

========================================================================
SAMPLE SIZE: WHAT A GOLDEN SET CAN RESOLVE
========================================================================
  N=10    hallucination rate 0.20 +/- 24.8 pts (95%)
  N=50    hallucination rate 0.20 +/- 11.1 pts (95%)
  N=200   hallucination rate 0.20 +/- 5.5 pts (95%)
  N=1000  hallucination rate 0.20 +/- 2.5 pts (95%)
  -> a 10-case golden set carries +/-24.8 points. it is a smoke test,
     not a measurement. 9.16's arithmetic applies unchanged.`,
        notes: [
          { t: "p", text: "**The denominator gap is +0.104 on this set** \u2014 0.758 reported against 0.654 real \u2014 and that is with only three abstentions in ten. At a 30% abstention rate the metric is overstating quality by ten points, and the overstatement grows exactly as the system gets worse." },
          { t: "p", text: "**The degradation table is the finding.** Overall faithfulness moves within 0.883\u20130.924 across a full retrieval collapse, and non-monotonically: it reads *higher* at recall 0.20 than at 0.48 because 60% abstention drags it back up. A metric that is non-monotonic in the thing it is supposed to track cannot be alerted on at all." },
          { t: "p", text: "**Over answered requests only it falls 0.920 \u2192 0.750 monotonically**, which is the signal you wanted the whole time. Same data, same metric name, one change of denominator." },
          { t: "p", text: "**The reference\u2019s `eval_suite` gets the hallucination-rate clause right** \u2014 low faithfulness *and* not abstained. Without that second clause the rate here would be 0.70 instead of 0.40, counting every correct abstention as a hallucination. It is an easy clause to drop when reimplementing." },
          { t: "p", text: "**The abstention/recall pair is what disambiguates**: 0.30 with recall 0.48 means retrieval is weak and abstention is masking it; 0.40 with recall 0.95 means retrieval is fine and the prompt or threshold is too strict. Those are opposite fixes and the abstention rate alone cannot tell them apart." },
          { t: "p", text: "And the sample size is sobering. Ten golden cases measuring a 0.20 rate carry \u00b124.8 points, so this suite is a smoke test. It is still worth having \u2014 it catches a grounding regression that breaks everything \u2014 but it cannot support a claim that the rate moved from 0.20 to 0.15." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "An abstention makes no claims, so it scores faithfulness 1.0 by construction and every abstention pulls the mean up. Measured, that makes overall faithfulness non-monotonic in retrieval quality \u2014 higher at recall 0.20 than at 0.48 \u2014 while the answered-only figure falls 0.920 to 0.750 cleanly." },
        { t: "p", text: "So report faithfulness over answered requests with abstention rate beside it, and define hallucination rate as low faithfulness *and* not abstained. Read abstention against context recall, because 0.30 with weak recall and 0.40 with good recall mean opposite things. And size the golden set honestly: ten cases carry \u00b125 points." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat would you put on a faithfulness dashboard?\u201d**" },
        { t: "p", text: "Faithfulness over answered requests, abstention rate, hallucination rate, citation accuracy, context recall and answer relevance. But I would lead with the denominator, because it is the thing that catches people out." },
        { t: "p", text: "An abstention makes no claims, and faithfulness is the fraction of claims the context supports \u2014 so the fraction of an empty set comes back as 1.0. Every abstention scores perfectly. When I measured this on a golden set the reported mean was 0.758 against a real 0.654 over answered requests, a ten-point overstatement from three abstentions in ten cases." },
        { t: "p", text: "And the consequence is worse than a bias. Simulating a system whose context recall falls from 0.93 to 0.20, overall faithfulness moved only within 0.883 to 0.924 \u2014 and non-monotonically, reading *higher* at recall 0.20 than at 0.48, because a 60% abstention rate pulls it back up. A metric that is non-monotonic in the thing it should track cannot be alerted on. Over answered requests only, the same system falls 0.920 to 0.750 monotonically." },
        { t: "p", text: "This also sharpens a conclusion I have drawn elsewhere. In an incident where faithfulness stayed flat at 0.95 while context recall halved, the flatness was read as proof the generator was healthy \u2014 which it was, but the metric was flattering it, because the abstentions were scoring 1.0 and holding the average up. Had the system abstained more, the dashboard would have shown quality improving while the product was broken." },
        { t: "p", text: "The second thing I would insist on is reading abstention rate against context recall rather than alone. A 30% abstention rate with recall at 0.48 means retrieval is weak and abstention is masking it. A 40% rate with recall at 0.95 means retrieval is fine and the prompt or gate threshold is too strict. Those are opposite fixes, and the single number cannot distinguish them." },
        { t: "p", text: "And I would define hallucination rate as faithfulness below threshold *and* not abstained. Without that second clause every correct abstention counts as a hallucination \u2014 on my set that would have turned a rate of 0.40 into 0.70. Which makes the exact abstention wording load-bearing, because the check is a substring match: a model that abstains in varying prose has its abstentions recorded as hallucinations." }
      ] }
  ],

  takeaways: [
    "**An abstention makes no claims, so it scores faithfulness 1.0 by construction.**",
    "**Every abstention pulls mean faithfulness up** \u2014 measured gap +0.104 with three abstentions in ten cases.",
    "**So a retrieval collapse improves the metric**, which is the wrong direction on the most common RAG failure.",
    "**Measured: overall faithfulness is non-monotonic in recall** \u2014 higher at recall 0.20 than at 0.48.",
    "**A metric non-monotonic in what it tracks cannot be alerted on at all.**",
    "**Over answered requests only it falls 0.920 \u2192 0.750 monotonically** \u2014 same data, one change of denominator.",
    "**This sharpens 10.13**: the flat 0.95 was partly abstentions holding the average up.",
    "**Report faithfulness over answered requests with abstention rate beside it** \u2014 together they cannot be gamed by abstaining.",
    "**Define hallucination rate as low faithfulness AND not abstained**, or correct abstentions count as hallucinations.",
    "**Without that clause the worked rate would be 0.70 instead of 0.40.**",
    "**Read abstention rate against context recall**: 0.30 with weak recall and 0.40 with good recall need opposite fixes.",
    "**A ten-case golden set carries \u00b124.8 points** \u2014 a smoke test, not a measurement."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does mean faithfulness rise when retrieval degrades?",
        options: [
          "Because weaker context produces shorter answers with fewer claims to check",
          "Because an abstention makes no claims and therefore scores 1.0, so a higher abstention rate pulls the mean up",
          "Because the judge becomes more lenient when context is sparse",
          "Because faithfulness is normalised by context length"
        ],
        answer: 1,
        why: "Faithfulness is the fraction of claims the context supports, and the fraction of an empty set is 1.0 \u2014 correct arithmetic over the wrong population. Measured on a degrading system, overall faithfulness moved only within 0.883 to 0.924 and non-monotonically, reading higher at recall 0.20 than at 0.48 because 60% abstention dragged it back up. Over answered requests only, the same data falls 0.920 to 0.750 monotonically." },

      { stem: "Why must hallucination rate include an \u201cand not abstained\u201d clause?",
        options: [
          "To avoid double-counting answers that are both unfaithful and uncited",
          "Because without it every correct abstention counts as a hallucination \u2014 turning a rate of 0.40 into 0.70 on the worked set",
          "Because abstentions have no faithfulness score to compare against the threshold",
          "Because abstention rate is already reported separately"
        ],
        answer: 1,
        why: "An abstention is the desired behaviour when context is insufficient, so counting it as a hallucination inverts the metric and penalises the fix. Abstentions do have a faithfulness score \u2014 1.0 \u2014 which is precisely the denominator problem, so the clause is needed for a different reason: to keep the hallucination count about answers actually given. It also makes the exact abstention wording load-bearing, since the check is a substring match." },

      { stem: "Abstention rate is 0.35. Is that good or bad?",
        options: [
          "Bad \u2014 any rate above about 10% indicates an over-strict guardrail",
          "Unanswerable alone \u2014 read against context recall: with recall 0.48 retrieval is weak, with recall 0.95 the prompt or threshold is too strict",
          "Good \u2014 a high abstention rate means the model is well calibrated",
          "Bad \u2014 it means the faithfulness gate is firing too often"
        ],
        answer: 1,
        why: "Abstention is the system declining to answer, which is correct when the context is insufficient and wrong when it is not, so the number is meaningless without knowing which situation obtains. The pair resolves it: weak recall means abstention is masking a retrieval problem, while good recall means retrieval is fine and something downstream is too conservative \u2014 and those have opposite fixes." },

      { stem: "A golden set of ten cases reports a hallucination rate of 0.20. What can you conclude?",
        options: [
          "That the rate is approximately 20% and can be tracked for improvement",
          "Very little about the level \u2014 ten cases carry roughly \u00b125 points, so it is a smoke test rather than a measurement",
          "That the set is too small to detect a grounding regression at all",
          "That the rate should be recomputed over answered requests only"
        ],
        answer: 1,
        why: "The binomial margin at N=10 and p=0.2 is about \u00b124.8 points, so the interval spans essentially the whole plausible range and no claim about movement from 0.20 to 0.15 is supportable. The suite remains worth having, because a grounding regression that breaks everything is a large effect a small set can see \u2014 the limitation is resolution on small changes, which is the same arithmetic that applies to any small eval set." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Faithfulness in production",
    questions: [
      { level: "advanced",
        q: "Your faithfulness metric is stable while users complain. What would you check?",
        strong: "A strong answer goes to the denominator.",
        answer: [
          { t: "p", text: "The denominator, first. An abstention makes no claims, so faithfulness returns 1.0 for it \u2014 the fraction of an empty set \u2014 and every abstention pulls the mean up. If abstention rate has risen, the metric is being held up by answers the system declined to give." },
          { t: "p", text: "When I simulated a system whose context recall fell from 0.93 to 0.20, overall faithfulness stayed inside a four-point band and moved non-monotonically: higher at recall 0.20 than at 0.48, because 60% abstention dragged it back up." },
          { t: "p", text: "Recomputed over answered requests only, the same data fell 0.920 to 0.750 monotonically. So I would change the denominator and report abstention rate beside it \u2014 two numbers that together cannot be gamed by abstaining." },
          { t: "p", text: "Then I would look at context recall, because a stable faithfulness with falling recall is the signature of the generator working correctly over context that no longer contains the answer." }
        ] },

      { level: "core",
        q: "What does a rising abstention rate tell you?",
        strong: "A strong answer refuses to read it alone.",
        answer: [
          { t: "p", text: "On its own, nothing conclusive \u2014 it is a two-sided metric. Too low means the model is overconfident or the abstention path is missing; too high means either retrieval is weak or the prompt is too strict." },
          { t: "p", text: "So I would pair it with context recall. Thirty per cent abstention with recall at 0.48 means retrieval is weak and abstention is masking it. Forty per cent with recall at 0.95 means retrieval is fine and the prompt or the gate threshold is too conservative." },
          { t: "p", text: "Those are opposite fixes \u2014 one is a recall problem and one is an over-refusal problem \u2014 and the two readings look almost identical on the abstention number alone." },
          { t: "p", text: "It is also a useful alarm precisely because it moves early. Abstention is downstream of retrieval, so a spike arrives before the user complaints do." }
        ] },

      { level: "core",
        q: "How would you regression-test grounding?",
        strong: "A strong answer includes abstention cases.",
        answer: [
          { t: "p", text: "A golden set of question, context and acceptable-answer-or-abstention triples, run on every prompt change and every model change \u2014 because both can silently regress grounding." },
          { t: "p", text: "The part people omit is the abstention cases. Without cases whose correct answer is \u2018not in the documents\u2019, the suite rewards a model that always answers, which is exactly the overconfident failure you are trying to prevent." },
          { t: "p", text: "I would size it honestly. Ten cases measuring a 20% hallucination rate carry about \u00b125 points, so a small suite is a smoke test \u2014 fine for catching a change that breaks grounding entirely, useless for claiming the rate improved." },
          { t: "p", text: "And I would run it as a deploy gate rather than a report, since the point is to stop a regression reaching users rather than to notice it afterwards." }
        ] }
    ]
  }
});
