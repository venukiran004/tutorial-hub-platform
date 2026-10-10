EC.receiveLesson({
  id: "11.15",

  lede: "Putting the checks in order, in parallel where possible, within a latency budget \u2014 and the measured budget has one check dominating everything. The free local checks cost **2.4 ms total, 0.1% of a 3,134 ms request.** With a fast faithfulness gate the whole pipeline is **73 to 138 ms, 2.3\u20134.4%**. With the gate 11.4 actually measured, it is **+95%** \u2014 one check 68x larger than every other combined, which makes the parallelisation question moot until you fix it.",

  objectives: [
    "Order the checks so cheap ones gate expensive ones",
    "Compute the latency budget sequential and parallel",
    "Recognise when one check dominates and parallelism is irrelevant",
    "Design the pipeline fail-closed without blocking on an outage",
    "Keep guardrail events logged and queryable"
  ],

  prerequisites: ["11.14", "9.15"],

  blocks: [

    { t: "h2", n: "01", id: "pipeline", text: "The pipeline",
      sub: "Input, model, output" },

    { t: "code", lang: "python", title: "The guarded chat", code: `def guarded_chat(user_input, context, llm, classify, canary):
    # ---- INPUT ----
    scan = scan_input(user_input)
    if scan["flagged"]:
        return refuse("That request can't be processed.")     # block, log, maybe step-up auth
    safe_input = redact(user_input)

    # ---- MODEL ----
    raw = llm(system=SYSTEM + f"\\n[canary:{canary}]", context=context, user=safe_input)

    # ---- OUTPUT ----  (fail-closed: any check failing => don't serve raw)
    mod = moderate(raw, classify)
    leak = output_safe(raw, canary)
    if not mod["safe"] or not leak["safe"]:
        log_guardrail_event(mod, leak)
        return refuse("I can't help with that.")              # safe fallback, not the raw text

    return raw`,
      hl: [9, 13, 14],
      caption: "Note what is missing: the context is passed through unscanned, which is 11.12's indirect-injection gap." },

    { t: "callout", kind: "trap", title: "The pipeline does not scan the retrieved context",
      body: [
        { t: "p", text: "`scan_input` runs on `user_input` and `redact` runs on `user_input`. The `context` parameter goes straight into the model untouched. So the pipeline that is presented as the complete picture has exactly the **indirect injection** hole that 11.12 identifies as the risk RAG introduces." },
        { t: "p", text: "That is not an inconsistency in the reference so much as a demonstration of how easy the gap is to leave: the function reads as complete, every check is present, and the untrusted input that bypasses all of them is the parameter nobody thought of as input." },
        { t: "p", text: "The fix is two lines \u2014 scan the context too, and wrap both the user input and the retrieved chunks in delimiters declared as data. But it has to be deliberate, because nothing about the code\u2019s shape suggests anything is missing." }
      ] },

    { t: "callout", kind: "good", title: "And the output checks here are sequential when they could fail fast",
      body: [
        { t: "p", text: "`moderate` then `output_safe`, both evaluated before the `if`. So a response whose canary leaked still pays for the moderation call \u2014 and 11.14 measured that as 42 ms spent on a verdict already determined by a 0.1 ms string compare." },
        { t: "p", text: "Reordering to put the local checks first and short-circuit saves 421x on blocked responses: 0.1 ms against 42.1. That is a two-line change with no behavioural difference except latency and cost on exactly the requests you least want to spend money on." },
        { t: "p", text: "The general rule is the one 10.11 arrived at for evals: **cheap checks gate expensive ones.** The usual treatment applies it to the input stage, where the scan precedes the model, and not within the output stage." }
      ] },

    { t: "h2", n: "02", id: "budget", text: "The latency budget",
      sub: "Measured, and dominated by one check" },

    { t: "code", lang: "text", title: "Measured on a 3,134 ms request", code: `INPUT guardrails:
    jailbreak regex scan         0.2 ms  free
    PII redaction regex          0.3 ms  free
    scope classifier            28.0 ms  model
    injection classifier        31.0 ms  model
    TOTAL                       59.5 ms  sequential
                                31.0 ms  fully parallel

OUTPUT guardrails, fast gate (35 ms, GPU or a small model):
    TOTAL                       78.7 ms  sequential
                                42.0 ms  fully parallel

  sequential  + 138.4 ms =  +4.4% of the request
  parallel    +  73.0 ms =  +2.3%
  free only   +   2.4 ms =  +0.1%`,
      hl: [12, 13, 15],
      caption: "This is the pipeline the usual description is, and it only exists if the faithfulness gate is fast." },

    { t: "callout", kind: "insight", title: "The free checks are 0.1% of the request, which settles the usual objection",
      body: [
        { t: "p", text: "The jailbreak scan, PII redaction, canary check, secrets scan and schema validation together cost **2.4 ms on a 3,134 ms request.** Any argument against adding them on latency grounds is arithmetically wrong, and the real objection \u2014 which 11.13 measured \u2014 is over-refusal rather than speed." },
        { t: "p", text: "So the budget discussion is entirely about the model-based checks: two classifiers on input, moderation and a faithfulness gate on output. Those are 136 ms of the 138.4 ms sequential total." },
        { t: "p", text: "And parallelising within a stage takes the total from 138.4 ms to 73.0 ms, which is a real 47% saving on guardrail latency and 2.1% of the request. Worth doing, and not where the interesting decision is." }
      ] },

    { t: "callout", kind: "warn", title: "With the gate 11.4 actually measured, none of this matters",
      body: [
        { t: "p", text: "Substituting the real figure \u2014 **2,957 ms for a four-claim faithfulness check on CPU** \u2014 makes the output stage 3,000 ms and the whole pipeline **+95% of the request.** One check is roughly 68x the size of every other check combined." },
        { t: "p", text: "At that point the parallelisation question is moot: parallelising a stage whose slowest member is 2,957 ms saves 72.4 ms, or 2%. The entire latency-budget discussion presupposes a fast gate, and if you do not have one, the only decisions that matter are whether to run the gate at all and where." },
        { t: "p", text: "Which is a general lesson about latency budgets rather than one about guardrails: **check whether one term dominates before optimising the others.** 10.5 made the same point from the other direction \u2014 the model was 75.7% of a request, so everything else was decoration until the interface started streaming." }
      ] },

    { t: "h2", n: "03", id: "design", text: "Five design principles",
      sub: "And the tension inside the second one" },

    { t: "dl", items: [
      { k: "Defence in depth", v: "Multiple imperfect layers; assume each can be bypassed alone. 11.13 measured the regex layer at recall 0.381, which is exactly why it cannot be the only one." },
      { k: "Fail-closed", v: "If a guardrail errors or is unsure, block. Traded off against over-refusal \u2014 and 11.12 argued this is a per-check decision, free on local checks and a real choice on remote ones." },
      { k: "Guardrails are independent of the model", v: "They still work if the model is swapped or jailbroken, which is what makes them the right place for policy." },
      { k: "Log every guardrail event", v: "What triggered, with references to the input and output, for tuning and incident response \u2014 and references rather than content, which is 10.10\u2019s allowlist argument." },
      { k: "Least privilege downstream", v: "Even a \u201csafe\u201d output should not be able to execute arbitrary actions. A guardrail protects the output; least privilege protects the world." }
    ] },

    { t: "callout", kind: "tradeoff", title: "The fail-closed principle is the one that needs a number attached",
      body: [
        { t: "p", text: "\u201cBlock if unsure\u201d is correct as a default and incomplete as a policy, because 11.16 measures what it costs: at a 0.5 moderation threshold, 10.3% of harmful content passes and **6.0% of legitimate requests are wrongly refused.** Moving to 0.8 cuts over-refusal to 0.1% and lets 67.7% of harmful content through." },
        { t: "p", text: "So fail-closed is not a safety setting with a free upside \u2014 it is a position on a curve, and the curve is steep. A team that adopts fail-closed everywhere without measuring the benign set has chosen a point on that curve without knowing which one." },
        { t: "p", text: "The practical resolution from 11.12: fail-closed unconditionally on the local checks, because they cannot fail and their false-positive behaviour is measurable and fixable; a deliberate decision per remote check, because there the failure mode is an outage and blanket blocking converts it into a total outage." }
      ] },

    { t: "viz", title: "The latency budget, with and without a fast gate", caption: "Measured. One check 68x the others makes parallelism irrelevant.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Guardrail latency budget with a fast gate versus the measured CPU gate">
  <text x="16" y="20" class="s-label">ON A 3,134 ms REQUEST</text>

  <text x="20" y="44" class="s-mono" style="font-size:9px">free checks only</text>
  <rect x="180" y="34" width="3" height="14" rx="1" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="192" y="45" class="s-mono" style="font-size:8px;fill:var(--good)">2.4 ms = +0.1% &#8212; the latency objection is arithmetically wrong</text>

  <text x="20" y="68" class="s-mono" style="font-size:9px">parallel, fast gate</text>
  <rect x="180" y="58" width="13" height="14" rx="1" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="200" y="69" class="s-mono" style="font-size:8px">73.0 ms = +2.3%</text>

  <text x="20" y="92" class="s-mono" style="font-size:9px">sequential, fast gate</text>
  <rect x="180" y="82" width="25" height="14" rx="1" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="212" y="93" class="s-mono" style="font-size:8px">138.4 ms = +4.4% &#8212; parallelising saves 47% of guardrail latency</text>

  <text x="20" y="116" class="s-mono" style="font-size:9px">the MEASURED gate</text>
  <rect x="180" y="106" width="540" height="14" rx="1" class="s-fill" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="400" y="117" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--crit)">3,060 ms = +98% &#8212; one check 68x every other combined</text>

  <rect x="16" y="134" width="728" height="34" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="152" class="s-mono" style="font-size:9px;fill:var(--crit)">CHECK WHETHER ONE TERM DOMINATES BEFORE OPTIMISING THE OTHERS</text>
  <text x="28" y="164" class="s-sub">parallelising a stage whose slowest member is 2,957 ms saves 72 ms &#8212; 2% of the stage</text>

  <line x1="16" y1="180" x2="744" y2="180" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="200" class="s-label">AND TWO GAPS IN THE REFERENCE&#8217;S OWN PIPELINE</text>

  <rect x="16" y="210" width="356" height="52" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="228" class="s-mono" style="font-size:9px;fill:var(--crit)">THE CONTEXT IS NEVER SCANNED</text>
  <text x="28" y="244" class="s-mono" style="font-size:8px">scan_input(user_input) &#183; redact(user_input)</text>
  <text x="28" y="256" class="s-sub">context goes straight to the model &#8212; indirect injection</text>

  <rect x="388" y="210" width="356" height="52" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="400" y="228" class="s-mono" style="font-size:9px;fill:var(--warn)">THE OUTPUT CHECKS DO NOT FAIL FAST</text>
  <text x="400" y="244" class="s-mono" style="font-size:8px">moderate() AND output_safe() both run, then the if</text>
  <text x="400" y="256" class="s-sub">a canary hit still pays 42 ms &#8212; 421x waste</text>

  <rect x="16" y="272" width="728" height="40" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="290" class="s-mono" style="font-size:9px;fill:var(--good)">CHEAP CHECKS GATE EXPENSIVE ONES &#8212; THE SAME RULE AS THE EVAL TIERS IN 10.11</text>
  <text x="28" y="304" class="s-sub">the usual treatment applies it to the input stage (scan before the model) and not within the output stage</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Budget the pipeline, then find what dominates", difficulty: "advanced", minutes: 35,
      body: "Build the latency budget for both stages, sequential and parallel, with the measured faithfulness gate and with a hypothetical fast one. Then reorder the output stage to fail fast and measure what that saves on blocked responses. Finally, close the two gaps in the pipeline.",
      requirements: [
        "Per-check latencies with free and model-based checks separated",
        "Sequential and fully-parallel totals per stage",
        "The budget with the measured gate and with a fast gate, as a share of the request",
        "The fail-fast saving on a blocked response",
        "The context scanned, and both inputs wrapped as data"
      ],
      hint: "Compute the dominant term's share before optimising anything else. If one check is 68x the rest, parallelising the rest is a rounding error.",
      solution: { lang: "python", title: "the pipeline, budgeted and reordered", code: `MEASURED_GATE_MS = 2957.0     # 11.4: roberta-large-mnli, 4 claims, CPU
FAST_GATE_MS = 35.0           # a small NLI model or a GPU
BASE_REQ = 3134.0             # the RAG request from 10.5

CHECKS_IN = [
    ("jailbreak regex scan",  0.2,  False),
    ("PII redaction regex",   0.3,  False),
    ("context scan (ADDED)",  0.2,  False),   # the gap in the pipeline
    ("scope classifier",     28.0,  True),
    ("injection classifier", 31.0,  True),
]

def checks_out(gate_ms):
    return [("canary check",          0.1,     False),
            ("PII/secret regex scan", 0.4,     False),
            ("schema validation",     1.2,     False),
            ("content moderation",   42.0,     True),
            ("faithfulness gate",    gate_ms,  True)]

def budget(name, checks):
    seq = sum(c[1] for c in checks)
    par = max(c[1] for c in checks)
    free = sum(c[1] for c in checks if not c[2])
    print("%s:" % name)
    for n, ms, needs in checks:
        print("    %-24s %8.1f ms  %s" % (n, ms, "model" if needs else "free"))
    print("    %-24s %8.1f ms  sequential" % ("TOTAL", seq))
    print("    %-24s %8.1f ms  fully parallel" % ("", par))
    print("    %-24s %8.1f ms  free checks alone" % ("", free))
    return seq, par, free

si, pi, fi = budget("INPUT guardrails", CHECKS_IN)
print()
so_f, po_f, fo_f = budget("OUTPUT guardrails, FAST gate (%.0f ms)" % FAST_GATE_MS,
                          checks_out(FAST_GATE_MS))
print()
so_m, po_m, fo_m = budget("OUTPUT guardrails, MEASURED gate (%.0f ms)" % MEASURED_GATE_MS,
                          checks_out(MEASURED_GATE_MS))

print()
print("=" * 74)
print("AS A SHARE OF A %.0f ms REQUEST" % BASE_REQ)
print("=" * 74)
print("%-34s %12s %10s" % ("configuration", "added ms", "% of req"))
for label, ms in (("free checks only", fi + fo_f),
                  ("parallel, fast gate", pi + po_f),
                  ("sequential, fast gate", si + so_f),
                  ("parallel, MEASURED gate", pi + po_m),
                  ("sequential, MEASURED gate", si + so_m)):
    print("%-34s %12.1f %9.1f%%" % (label, ms, 100.0 * ms / BASE_REQ))

print()
print("parallelising with a FAST gate saves %.1f ms (%.0f%% of guardrail latency)"
      % (si + so_f - pi - po_f, 100.0 * (si + so_f - pi - po_f) / (si + so_f)))
print("parallelising with the MEASURED gate saves %.1f ms (%.0f%%)"
      % (si + so_m - pi - po_m, 100.0 * (si + so_m - pi - po_m) / (si + so_m)))
print()
print("so the parallelisation question is only interesting if the gate is fast.")
print("with the measured gate, one check is %.0fx every other check combined."
      % (MEASURED_GATE_MS / (so_m - MEASURED_GATE_MS)))
print("CHECK WHETHER ONE TERM DOMINATES BEFORE OPTIMISING THE OTHERS.")

print()
print("=" * 74)
print("FAIL FAST: THE OUTPUT STAGE REORDERED")
print("=" * 74)
print("the usual evaluation is moderate() AND output_safe() before the if,")
print("so a leaked canary still pays for the moderation call.")
print()
for label, order in (("reference order (both, then if)", ["moderation", "canary"]),
                     ("cheapest first, short-circuit",   ["canary", "moderation"])):
    if order[0] == "canary":
        cost = 0.1
    else:
        cost = 42.0 + 0.1
    print("  %-34s blocked response costs %7.1f ms" % (label, cost))
print("  %-34s saving on a blocked response: %.0fx"
      % ("", (42.0 + 0.1) / 0.1))
print()
print("the clean path pays the same either way (%.1f ms), so fail-fast helps"
      % so_f)
print("only on blocked responses -- which should be the minority, and are")
print("exactly the requests you least want to spend a network call on.")

print()
print("=" * 74)
print("AND THE TWO GAPS CLOSED")
print("=" * 74)
print("1. scan and wrap the CONTEXT, not just the user input:")
print("     scan_input(user_input)  ->  scan_input(user_input + context)")
print("     cost: %.1f ms. the pipeline omits this entirely," % 0.2)
print("     which leaves the indirect-injection hole it warns about elsewhere.")
print()
print("2. wrap BOTH as data, not instructions:")
print("     <user_question>...</user_question>  <retrieved_data>...</retrieved_data>")
print("     cost: 0 ms. the only check whose effectiveness does not degrade")
print("     as the attacker rephrases.")`,
        out: `INPUT guardrails:
    jailbreak regex scan          0.2 ms  free
    PII redaction regex           0.3 ms  free
    context scan (ADDED)          0.2 ms  free
    scope classifier             28.0 ms  model
    injection classifier         31.0 ms  model
    TOTAL                        59.7 ms  sequential
                                 31.0 ms  fully parallel
                                  0.7 ms  free checks alone

OUTPUT guardrails, FAST gate (35 ms):
    canary check                  0.1 ms  free
    PII/secret regex scan         0.4 ms  free
    schema validation             1.2 ms  free
    content moderation           42.0 ms  model
    faithfulness gate            35.0 ms  model
    TOTAL                        78.7 ms  sequential
                                 42.0 ms  fully parallel
                                  1.7 ms  free checks alone

OUTPUT guardrails, MEASURED gate (2957 ms):
    canary check                  0.1 ms  free
    PII/secret regex scan         0.4 ms  free
    schema validation             1.2 ms  free
    content moderation           42.0 ms  model
    faithfulness gate          2957.0 ms  model
    TOTAL                      3000.7 ms  sequential
                               2957.0 ms  fully parallel
                                  1.7 ms  free checks alone

==========================================================================
AS A SHARE OF A 3134 ms REQUEST
==========================================================================
configuration                          added ms   % of req
free checks only                            2.4       0.1%
parallel, fast gate                        73.0       2.3%
sequential, fast gate                     138.4       4.4%
parallel, MEASURED gate                  2988.0      95.3%
sequential, MEASURED gate                3060.4      97.7%

parallelising with a FAST gate saves 65.4 ms (47% of guardrail latency)
parallelising with the MEASURED gate saves 72.4 ms (2%)

so the parallelisation question is only interesting if the gate is fast.
with the measured gate, one check is 68x every other check combined.
CHECK WHETHER ONE TERM DOMINATES BEFORE OPTIMISING THE OTHERS.

==========================================================================
FAIL FAST: THE OUTPUT STAGE REORDERED
==========================================================================
the usual evaluation is moderate() AND output_safe() before the if,
so a leaked canary still pays for the moderation call.

  reference order (both, then if)    blocked response costs    42.1 ms
  cheapest first, short-circuit      blocked response costs     0.1 ms
                                     saving on a blocked response: 421x

the clean path pays the same either way (78.7 ms), so fail-fast helps
only on blocked responses -- which should be the minority, and are
exactly the requests you least want to spend a network call on.

==========================================================================
AND THE TWO GAPS CLOSED
==========================================================================
1. scan and wrap the CONTEXT, not just the user input:
     scan_input(user_input)  ->  scan_input(user_input + context)
     cost: 0.2 ms. the pipeline omits this entirely,
     which leaves the indirect-injection hole it warns about elsewhere.

2. wrap BOTH as data, not instructions:
     <user_question>...</user_question>  <retrieved_data>...</retrieved_data>
     cost: 0 ms. the only check whose effectiveness does not degrade
     as the attacker rephrases.`,
        notes: [
          { t: "p", text: "**The free checks are 0.1% of the request**, which settles the usual objection arithmetically. Everything interesting in this budget is the four model-based checks, and with a fast gate they are 136 of the 138.4 ms sequential total." },
          { t: "p", text: "**Parallelising saves 47% of guardrail latency with a fast gate and 2% with the measured one.** That is the finding: the same optimisation is worth having in one configuration and pointless in the other, and which configuration you are in depends entirely on one check." },
          { t: "p", text: "**With the measured gate one check is 68x every other combined**, so the stage reduces to that check whether you parallelise it or not. Establishing the dominant term before optimising the rest is the general lesson, and it is the same mistake as tuning a vector search at 8.7% of a request." },
          { t: "p", text: "**Fail-fast saves 421x on a blocked response** — 0.1 ms against 42.1 — and nothing at all on the clean path, which pays for every check either way. So it is a pure win on exactly the requests you least want to spend a network call on, and it is two lines." },
          { t: "p", text: "**The context scan costs 0.2 ms**, which is the entire price of closing the indirect-injection hole in the input stage. That it is omitted from the standard pipeline is not a cost decision — it is an oversight the code’s shape conceals." },
          { t: "p", text: "The 35 ms fast-gate figure is a stand-in for a small NLI model or a GPU rather than something I measured, so the fast-gate rows are illustrative. The measured rows and the dominance conclusion do not depend on it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "The free local checks cost 2.4 ms on a 3,134 ms request \u2014 0.1% \u2014 so the latency objection to adding them is arithmetically wrong, and the real objection is over-refusal. With a fast faithfulness gate the whole pipeline is 73\u2013138 ms, or 2.3\u20134.4%, and parallelising within a stage saves 47% of guardrail latency." },
        { t: "p", text: "But with the gate as actually measured it is +95%, one check 68x every other combined \u2014 so check whether one term dominates before optimising the others. And close the two gaps in the standard pipeline: it never scans the retrieved context, and its output checks do not fail fast." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWon\u2019t all these guardrails make the product slow?\u201d**" },
        { t: "p", text: "The free ones cannot. The jailbreak scan, PII redaction, canary check, secrets scan and schema validation together cost 2.4 milliseconds on a three-second request \u2014 a tenth of a per cent. So the latency objection to those is arithmetically wrong, and the real cost of that layer is over-refusal: I measured the regex scan wrongly blocking six of ten benign-but-tricky inputs." },
        { t: "p", text: "The model-based checks are where the budget lives \u2014 two classifiers on input, moderation and a faithfulness gate on output. With a fast gate the whole pipeline is 73 milliseconds parallel and 138.4 sequential, so 2.3 to 4.4 per cent of the request. Parallelising within a stage saves about 47 per cent of the guardrail latency, which is worth doing." },
        { t: "p", text: "But I would check what dominates before optimising any of it, because in my measurements it did. A large NLI faithfulness gate on CPU took 2,957 milliseconds for a four-claim answer, which makes the whole pipeline a 95 per cent latency increase and one check roughly sixty-eight times every other check combined. At that point parallelising the rest saves 72 milliseconds, about two per cent, and the only decisions that matter are whether to run the gate at all and where." },
        { t: "p", text: "That generalises beyond guardrails: check whether one term dominates before optimising the others. It is the same mistake as optimising a vector search that is 8.7 per cent of a request while the model is 76 per cent." },
        { t: "p", text: "There are two things I would fix in the standard pipeline as it is usually written. First, it scans and redacts the user input and passes the retrieved context straight through to the model \u2014 which is exactly the indirect-injection hole, and the function reads as complete, which is what makes it easy to leave. Two lines: scan the context too, and wrap both the question and the chunks in delimiters declared as data." },
        { t: "p", text: "Second, the output checks are usually written to evaluate moderation and the leak scan both before the conditional, so a response whose canary leaked still pays for the moderation call. Reordering to put the local checks first and short-circuit saves about 421 times on blocked responses \u2014 0.1 milliseconds against 43.7. The clean path pays the same either way, so it only helps on blocked responses, which are exactly the requests you least want to spend a network call on." }
      ] }
  ],

  takeaways: [
    "**The free local checks cost 2.4 ms on a 3,134 ms request** \u2014 0.1%, so the latency objection to them is arithmetically wrong.",
    "**The real cost of the regex layer is over-refusal, not latency** \u2014 6 of 10 benign inputs blocked, measured.",
    "**With a fast faithfulness gate the pipeline is 73\u2013138 ms**, or 2.3\u20134.4% of the request.",
    "**Parallelising within a stage saves 47% of guardrail latency** with a fast gate.",
    "**With the measured CPU gate it is +95%**, one check roughly 68x every other combined.",
    "**At which point parallelising the rest saves only 2%** \u2014 so check whether one term dominates before optimising the others.",
    "**The standard pipeline never scans the retrieved context** \u2014 `scan_input(user_input)` and the context passes straight through.",
    "**That is the indirect-injection hole**, and the function reads as complete, which is what makes it easy to leave.",
    "**The standard output stage does not fail fast**: moderation and the leak scan both run before the conditional.",
    "**Reordering saves 421x on a blocked response** \u2014 0.1 ms against 42.1 \u2014 and nothing on the clean path.",
    "**Cheap checks gate expensive ones**, which is the same rule as the eval tiers.",
    "**Fail-closed is a position on a curve, not a free safety setting** \u2014 at threshold 0.5, 6.0% of legitimate requests are refused."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What do the free local guardrails cost on a 3,134 ms request?",
        options: [
          "About 60 ms, which is 2% and usually acceptable",
          "2.4 ms \u2014 0.1% \u2014 so the latency objection to adding them is arithmetically wrong",
          "Roughly 138 ms once all checks are included",
          "It depends entirely on input length"
        ],
        answer: 1,
        why: "The jailbreak scan, PII redaction, canary check, secrets scan and schema validation are all local string operations totalling 2.4 ms, so no latency argument against them survives contact with the arithmetic. The genuine cost of that layer is over-refusal \u2014 measured at 6 of 10 benign-but-tricky inputs wrongly blocked \u2014 which is a correctness problem rather than a speed one." },

      { stem: "With the measured CPU faithfulness gate, what does parallelising the output stage save?",
        options: [
          "About 47% of guardrail latency, as with a fast gate",
          "Roughly 1.5% \u2014 one check is about 68x every other combined, so parallelism is a rounding error",
          "Nothing, because the checks are inherently sequential",
          "It doubles the saving, since the gate runs alongside moderation"
        ],
        answer: 1,
        why: "Parallelising a stage reduces it to its slowest member, and when that member is 2,957 ms the other 42.1 ms of checks disappear into it. The general lesson is to establish whether one term dominates before optimising the others \u2014 the same error as tuning a vector search at 8.7% of a request while the model accounts for 76%. With a fast gate the same parallelisation genuinely saves about 47%." },

      { stem: "What is missing from the standard `guarded_chat` pipeline?",
        options: [
          "A rate limiter before the model call",
          "The retrieved context is never scanned or redacted \u2014 only `user_input` is, so indirect injection passes every check",
          "The canary token is not added to the system prompt",
          "The guardrail events are not logged"
        ],
        answer: 1,
        why: "`scan_input` and `redact` both take `user_input`, while the `context` parameter is passed directly into the model call, so a poisoned retrieved chunk bypasses the entire input stage. What makes this instructive rather than merely a bug is that the function reads as complete \u2014 every check is present and the untrusted input that evades them is the parameter nobody classified as input. The canary is added and events are logged." },

      { stem: "Why reorder the output checks to put local ones first?",
        options: [
          "Because local checks are more reliable than remote ones",
          "To fail fast \u2014 a canary hit at 0.1 ms makes a 42 ms moderation call pointless, saving about 421x on a blocked response",
          "Because moderation requires the schema check to have passed",
          "To reduce the clean-path latency of the output stage"
        ],
        answer: 1,
        why: "The standard implementation evaluates both moderation and the leak scan before the conditional, so a response already known to be unservable still pays for the network call. Short-circuiting changes nothing on the clean path \u2014 which pays for everything either way \u2014 and saves the expensive call on exactly the requests you least want to spend money on. It is also true that local checks cannot fail, which is a separate argument for fail-closing on them." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The guardrail pipeline",
    questions: [
      { level: "core",
        q: "How much latency do guardrails add?",
        strong: "A strong answer separates free from model-based.",
        answer: [
          { t: "p", text: "The free ones add essentially nothing \u2014 2.4 milliseconds on a three-second request, a tenth of a per cent. That is the jailbreak scan, PII redaction, canary check, secrets scan and schema validation, all local string work." },
          { t: "p", text: "The model-based checks are the budget: two classifiers on input, moderation and a faithfulness gate on output. With a fast gate that is 73 milliseconds parallel and 138.4 sequential \u2014 2.3 to 4.4 per cent." },
          { t: "p", text: "But I would check the dominant term first, because when I measured a large NLI gate on CPU it was 2,957 milliseconds for four claims, which makes the pipeline a 95 per cent increase and one check sixty-eight times every other combined." },
          { t: "p", text: "So the honest answer is: nearly free, unless you have a blocking faithfulness gate, in which case the gate is the only thing worth discussing." }
        ] },

      { level: "advanced",
        q: "What is wrong with the usual guarded-chat implementation?",
        strong: "A strong answer names the context gap.",
        answer: [
          { t: "p", text: "Two things. It scans and redacts the user input and passes the retrieved context straight into the model, which is exactly the indirect-injection hole \u2014 a poisoned chunk bypasses the whole input stage." },
          { t: "p", text: "What makes that worth dwelling on is that the function reads as complete. Every check is present and correctly ordered, and the untrusted input that evades all of them is the parameter nobody classified as input." },
          { t: "p", text: "The second is smaller: the output checks evaluate moderation and the leak scan both before the conditional, so a response whose canary leaked still pays 42 milliseconds for a verdict a 0.1 millisecond string compare already settled. Short-circuiting saves about 421x on blocked responses." },
          { t: "p", text: "Both fixes are two lines. The first one matters much more, and neither is visible from the shape of the code." }
        ] },

      { level: "core",
        q: "Should the whole pipeline fail closed?",
        strong: "A strong answer attaches a number to the trade.",
        answer: [
          { t: "p", text: "Unconditionally on the local checks, because they cannot meaningfully fail \u2014 a string compare has no outage mode, so fail-closed costs nothing there." },
          { t: "p", text: "On the remote checks it is a real decision, and I would want the number attached. At a 0.5 moderation threshold, about 10 per cent of harmful content passes and 6 per cent of legitimate requests are wrongly refused. Moving to 0.8 cuts over-refusal to 0.1 per cent and lets 68 per cent of harmful content through." },
          { t: "p", text: "So fail-closed is a position on a steep curve rather than a free safety setting, and a team that adopts it everywhere without measuring a benign set has picked a point on that curve without knowing which one." },
          { t: "p", text: "There is also an availability argument: blanket fail-closed on a flaky remote dependency turns a provider outage into a total outage, and users cannot distinguish \u2018we blocked you safely\u2019 from \u2018it is broken\u2019." }
        ] }
    ]
  }
});
