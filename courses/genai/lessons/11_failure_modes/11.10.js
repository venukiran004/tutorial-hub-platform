EC.receiveLesson({
  id: "11.10",

  lede: "Batching and streaming are **throughput and UX levers, not token-price levers** \u2014 a batch API discount is a real price cut and streaming saves nothing at all. Then agents, which are the easiest way to get a surprise bill. It is commonly said a 12-step agent can be 20\u201330 calls, and the step count is not the multiplier: measured, 12 steps cost **24.4x** a single call, where naively repeating the same call 12 times gives 10.0x. **The context grows**, and the last step costs 4.1x the first.",

  objectives: [
    "Separate price levers from throughput and UX levers",
    "Say what streaming changes and what it does not",
    "Compute an agent's cost with a growing context rather than a flat one",
    "Identify the single most effective agent cost lever",
    "Explain why per-run budgets are needed rather than per-call limits"
  ],

  prerequisites: ["11.9"],

  blocks: [

    { t: "h2", n: "01", id: "batch", text: "Batching and streaming",
      sub: "One is a price cut; the other is not" },

    { t: "dl", items: [
      { k: "Batch / async API", v: "Many providers offer roughly a **50% discount** for non-real-time work \u2014 overnight classification, backfills, re-indexing evaluations. This is a genuine price cut and it is the largest single discount available, for the price of giving up latency." },
      { k: "Streaming", v: "Does **not** reduce tokens and does not reduce cost. It slashes *perceived* latency \u2014 first token in about a second \u2014 which often lets you avoid escalating to a bigger model purely for speed. That is an indirect saving and a better experience." }
    ] },

    { t: "callout", kind: "insight", title: "Streaming\u2019s saving is real but it is a second-order effect",
      body: [
        { t: "p", text: "9.15 made the primary point: with streaming the user sees text at 400 ms and reads along, and without it they stare at a spinner for 5.4 seconds \u2014 same metrics, completely different product. The cost connection is that the pressure to buy a faster model for perceived speed disappears." },
        { t: "p", text: "And 10.5 measured something sharper: once you stream, the *ranking* of every latency optimisation changes. Against total latency the model dominated at 75.7% and the vector search was 8.7%; against time-to-first-token the search became 25.3% and the model 11.2%. So streaming does not just change the number, it changes which fix is worth buying." },
        { t: "p", text: "The honest accounting is therefore: streaming is a UX change with a cost side-effect, and it belongs in a cost discussion only as \u2018this is why we do not need the expensive model\u2019. It should never appear as a line item in a token saving." }
      ] },

    { t: "callout", kind: "good", title: "The batch discount is the most under-used lever on this page",
      body: [
        { t: "p", text: "A 50% discount is larger than any single token lever in 11.8, and it costs nothing in quality \u2014 the same model, the same prompt, the same output, just not now. The constraint is purely that the work must tolerate a delay." },
        { t: "p", text: "What qualifies is broader than it first appears: nightly evaluation runs, the judge calls in 10.11\u2019s online-eval tier, re-scoring a corpus after a re-index, backfilling classifications, generating summaries for documents nobody has asked for yet. None of that is user-facing." },
        { t: "p", text: "That last one is worth noting specifically, because 10.11 priced a stratified judge at about 5% of the inference bill and judges are asynchronous by design \u2014 so the eval tier is a natural batch workload and halving it is free." }
      ] },

    { t: "h2", n: "02", id: "agents", text: "The agentic multiplier",
      sub: "One task equals many calls \u2014 and the context grows" },

    { t: "code", lang: "text", title: "Measured: 12 steps, with the context growing", code: `step        input     output  $ this step   $ cumulative
1            3200        150      0.01825        0.01825
2            4150        150      0.02300        0.04125
3            5100        150      0.02775        0.06900
4            6050        150      0.03250        0.10150
...           ...        ...          ...            ...
10          11750        150      0.06100        0.39625
11          12700        150      0.06575        0.46200
12          13650        400      0.07425        0.53625

12 steps: $0.53625 against $0.02200 for one call = 24.4x`,
      hl: [2, 9, 11],
      caption: "The prompt goes 3,200 \u2192 13,650 tokens, because every thought and tool result re-enters the context." },

    { t: "callout", kind: "trap", title: "The step count is not the multiplier",
      body: [
        { t: "p", text: "Repeating the same 3,200-token call twelve times gives **10.0x**. The real cost is **24.4x**, because each step\u2019s prompt contains every previous thought and every previous tool result. The naive estimate understates the bill by **2.4x**." },
        { t: "p", text: "The growth is the whole story: the prompt goes from 3,200 to 13,650 tokens, so **the last step alone costs 4.1x the first.** An agent\u2019s cost is roughly quadratic in step count rather than linear, because step n pays for the outputs of steps 1 to n\u22121." },
        { t: "p", text: "Which means \u2018a 12-step agent is 12 calls\u2019 is the wrong mental model for budgeting, and it is the model most people carry. It is commonly said 20\u201330 calls for a 12-step agent with reflection, which is a different and also true observation \u2014 but even at exactly 12 calls the cost is 24x, not 12x." }
      ] },

    { t: "callout", kind: "good", title: "So trimming tool output is the highest-leverage agent lever there is",
      body: [
        { t: "p", text: "Measured, cutting tool output from 800 tokens to 100 takes the run from $0.53625 to **$0.30525 \u2014 a 43% saving** on the whole agent, from one change applied at one point in the loop." },
        { t: "p", text: "It beats any per-call optimisation because **each step\u2019s bloat is paid again by every later step.** A pasted web page costs its tokens once at step 3 and then eleven more times as part of the prompt for steps 4 through 12. Trimming it is the only lever with that compounding property." },
        { t: "p", text: "The same logic makes capping reflection passes a cost lever rather than a quality one. A critic pass adds its own output to the context *and* triggers another generation over the larger context, so the marginal cost of reflection rises with every pass while its marginal value falls." }
      ] },

    { t: "callout", kind: "warn", title: "And budgets have to be per-run, not per-call",
      body: [
        { t: "p", text: "A per-call token limit cannot stop a runaway loop, because every individual call is within limits \u2014 the failure is the *number* of calls, not the size of any one. The enforcement point has to be inside the loop, tracking cumulative tokens and dollars for the run." },
        { t: "p", text: "10.3 noted that a runaway agent loop shows up as a cost spike before it shows up anywhere else, which makes cost-per-task the natural detector. A hard per-run cap turns the detector into a control." },
        { t: "p", text: "The three enforcement points worth having: a cumulative token budget, a maximum step count, and a cap on reflection passes. Any one of them alone is escapable; the step cap is the one that bounds the quadratic." }
      ] },

    { t: "viz", title: "Why an agent costs 24x and not 12x", caption: "Measured: the prompt grows 3,200 \u2192 13,650 tokens over 12 steps.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Agent cost growth across twelve steps with growing context">
  <text x="16" y="20" class="s-label">PROMPT SIZE PER STEP &#8212; EVERY THOUGHT AND TOOL RESULT RE-ENTERS</text>
  <line x1="60" y1="150" x2="60" y2="36" stroke="var(--line)" stroke-width="1"/>
  <line x1="60" y1="150" x2="700" y2="150" stroke="var(--line)" stroke-width="1"/>
  <text x="52" y="42" text-anchor="end" class="s-mono" style="font-size:8px">13,650</text>
  <text x="52" y="150" text-anchor="end" class="s-mono" style="font-size:8px">3,200</text>

  <rect x="72" y="142" width="38" height="8" class="s-fill" style="stroke:var(--good)" stroke-width="1"/>
  <rect x="124" y="132" width="38" height="18" class="s-fill" style="stroke:var(--good)" stroke-width="1"/>
  <rect x="176" y="122" width="38" height="28" class="s-fill" style="stroke:var(--accent)" stroke-width="1"/>
  <rect x="228" y="112" width="38" height="38" class="s-fill" style="stroke:var(--accent)" stroke-width="1"/>
  <rect x="280" y="102" width="38" height="48" class="s-fill" style="stroke:var(--accent)" stroke-width="1"/>
  <rect x="332" y="92" width="38" height="58" class="s-fill" style="stroke:var(--warn)" stroke-width="1"/>
  <rect x="384" y="82" width="38" height="68" class="s-fill" style="stroke:var(--warn)" stroke-width="1"/>
  <rect x="436" y="72" width="38" height="78" class="s-fill" style="stroke:var(--warn)" stroke-width="1"/>
  <rect x="488" y="62" width="38" height="88" class="s-fill" style="stroke:var(--crit)" stroke-width="1"/>
  <rect x="540" y="52" width="38" height="98" class="s-fill" style="stroke:var(--crit)" stroke-width="1"/>
  <rect x="592" y="44" width="38" height="106" class="s-fill" style="stroke:var(--crit)" stroke-width="1"/>
  <rect x="644" y="36" width="38" height="114" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="91" y="164" text-anchor="middle" class="s-mono" style="font-size:8px">1</text>
  <text x="663" y="164" text-anchor="middle" class="s-mono" style="font-size:8px">12</text>
  <text x="663" y="30" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--crit)">$0.074</text>
  <text x="91" y="132" text-anchor="middle" class="s-mono" style="font-size:8px">$0.018</text>
  <text x="400" y="182" text-anchor="middle" class="s-sub">the last step alone costs 4.1x the first</text>

  <line x1="16" y1="198" x2="744" y2="198" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="218" class="s-label">SO THE STEP COUNT IS NOT THE MULTIPLIER</text>
  <text x="20" y="240" class="s-mono" style="font-size:9px">12 x the same call</text>
  <rect x="180" y="230" width="180" height="14" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="368" y="241" class="s-mono" style="font-size:8px">10.0x &#8212; the naive estimate</text>
  <text x="20" y="262" class="s-mono" style="font-size:9px">12 steps, real</text>
  <rect x="180" y="252" width="439" height="14" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="627" y="263" class="s-mono" style="font-size:8px;fill:var(--crit)">24.4x &#8212; understated 2.4x</text>

  <rect x="16" y="276" width="356" height="38" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="292" class="s-mono" style="font-size:9px;fill:var(--good)">TRIM TOOL OUTPUT 800 -&gt; 100 TOKENS</text>
  <text x="28" y="306" class="s-mono" style="font-size:8px;fill:var(--good)">$0.536 -&gt; $0.305 = 43% off the whole run</text>

  <rect x="388" y="276" width="356" height="38" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="400" y="292" class="s-mono" style="font-size:9px;fill:var(--warn)">BECAUSE BLOAT COMPOUNDS</text>
  <text x="400" y="306" class="s-sub">a page pasted at step 3 is paid again at steps 4-12</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Model an agent's cost with a growing context", difficulty: "advanced", minutes: 30,
      body: "Compute an agent run's cost with the context growing by each step's thought and tool result, compare it against the naive flat estimate, and find the tool-output trim that recovers the most. Then decide where the budget enforcement points go.",
      requirements: [
        "Per-step input, output and cumulative cost with a growing context",
        "The naive flat estimate, and the ratio between the two",
        "The cost of the last step relative to the first",
        "A tool-output trim sweep, with the saving on the whole run",
        "Enforcement points named, and why per-call limits cannot work"
      ],
      hint: "Each step's input is the previous input plus the previous output plus the tool result. That recurrence is what makes cost roughly quadratic in step count rather than linear.",
      solution: { lang: "python", title: "the agentic multiplier, measured", code: `PRICE_IN, PRICE_OUT = 5.0, 15.0
def cost(tin, tout):
    return tin / 1e6 * PRICE_IN + tout / 1e6 * PRICE_OUT

SINGLE_IN, SINGLE_OUT = 3200, 400     # the trimmed prompt from 11.7
single = cost(SINGLE_IN, SINGLE_OUT)
print("one trimmed single-shot call: %d in / %d out = $%.5f"
      % (SINGLE_IN, SINGLE_OUT, single))
print()
print("an agent does not repeat that cost -- its context GROWS each step,")
print("because every tool result and every thought re-enters the prompt.")
print()
TOOL_RESULT = 800        # a pasted page of tool output
THOUGHT = 150
print("%-6s %10s %10s %12s %14s" % ("step", "input", "output", "$ this step", "$ cumulative"))
tin, total = SINGLE_IN, 0.0
for step in range(1, 13):
    tout = THOUGHT if step < 12 else SINGLE_OUT
    c = cost(tin, tout)
    total += c
    if step <= 4 or step >= 10:
        print("%-6d %10d %10d %12.5f %14.5f" % (step, tin, tout, c, total))
    elif step == 5:
        print("%-6s %10s %10s %12s %14s" % ("...", "...", "...", "...", "..."))
    tin += tout + TOOL_RESULT      # thought + tool output re-enter the context
print()
print("12 steps: $%.5f against $%.5f for one call = %.1fx"
      % (total, single, total / single))
print()
flat = 12 * cost(SINGLE_IN, THOUGHT)
print("and with the context NOT growing (a naive estimate):")
print("  12 x the same call = $%.5f, which is %.1fx -- so the naive estimate"
      % (flat, flat / single))
print("  understates the real cost by %.1fx. the multiplier is not the step count."
      % (total / flat))
print()
last_in = tin - SINGLE_OUT - TOOL_RESULT
print("where the growth comes from: the prompt went %d -> %d tokens over 12 steps,"
      % (SINGLE_IN, last_in))
print("  so the LAST step alone costs $%.5f = %.1fx the first."
      % (cost(last_in, SINGLE_OUT), cost(last_in, SINGLE_OUT) / cost(SINGLE_IN, THOUGHT)))

print()
print("-- and the single most effective agent lever --")
for trim in (800, 400, 200, 100):
    t2, tot2 = SINGLE_IN, 0.0
    for step in range(1, 13):
        tout = THOUGHT if step < 12 else SINGLE_OUT
        tot2 += cost(t2, tout)
        t2 += tout + trim
    print("  trim tool output to %4d tokens: $%.5f (%.1fx one call, %.0f%% of untrimmed)"
          % (trim, tot2, tot2 / single, 100.0 * tot2 / total))
print("  -> trimming tool output is worth more than any per-call optimisation,")
print("     because each step's bloat is paid again by every later step.")

print()
print("=" * 70)
print("WHY PER-CALL LIMITS CANNOT STOP A RUNAWAY LOOP")
print("=" * 70)
MAX_CALL_TOKENS = 16000
t, n, spend = SINGLE_IN, 0, 0.0
while t + THOUGHT + TOOL_RESULT < MAX_CALL_TOKENS and n < 40:
    spend += cost(t, THOUGHT)
    t += THOUGHT + TOOL_RESULT
    n += 1
print("with only a %d-token per-CALL limit:" % MAX_CALL_TOKENS)
print("  the loop ran %d steps before any single call hit the limit" % n)
print("  cumulative spend: $%.4f = %.0fx a single call" % (spend, spend / single))
print("  every individual call was within limits. the failure is the NUMBER")
print("  of calls, so the limit never fires.")
print()
print("the three enforcement points that do work, inside the loop:")
for name, why in (("cumulative token budget", "bounds the total directly"),
                  ("max step count",          "bounds the QUADRATIC -- the important one"),
                  ("max reflection passes",   "each pass adds context AND a generation")):
    print("  %-26s %s" % (name, why))`,
        out: `one trimmed single-shot call: 3200 in / 400 out = $0.02200

an agent does not repeat that cost -- its context GROWS each step,
because every tool result and every thought re-enters the prompt.

step        input     output  $ this step   $ cumulative
1            3200        150      0.01825        0.01825
2            4150        150      0.02300        0.04125
3            5100        150      0.02775        0.06900
4            6050        150      0.03250        0.10150
...           ...        ...          ...            ...
10          11750        150      0.06100        0.39625
11          12700        150      0.06575        0.46200
12          13650        400      0.07425        0.53625

12 steps: $0.53625 against $0.02200 for one call = 24.4x

and with the context NOT growing (a naive estimate):
  12 x the same call = $0.21900, which is 10.0x -- so the naive estimate
  understates the real cost by 2.4x. the multiplier is not the step count.

where the growth comes from: the prompt went 3200 -> 13650 tokens over 12 steps,
  so the LAST step alone costs $0.07425 = 4.1x the first.

-- and the single most effective agent lever --
  trim tool output to  800 tokens: $0.53625 (24.4x one call, 100% of untrimmed)
  trim tool output to  400 tokens: $0.40425 (18.4x one call, 75% of untrimmed)
  trim tool output to  200 tokens: $0.33825 (15.4x one call, 63% of untrimmed)
  trim tool output to  100 tokens: $0.30525 (13.9x one call, 57% of untrimmed)
  -> trimming tool output is worth more than any per-call optimisation,
     because each step's bloat is paid again by every later step.

======================================================================
WHY PER-CALL LIMITS CANNOT STOP A RUNAWAY LOOP
======================================================================
with only a 16000-token per-CALL limit:
  the loop ran 13 steps before any single call hit the limit
  cumulative spend: $0.6078 = 28x a single call
  every individual call was within limits. the failure is the NUMBER
  of calls, so the limit never fires.

the three enforcement points that do work, inside the loop:
  cumulative token budget    bounds the total directly
  max step count             bounds the QUADRATIC -- the important one
  max reflection passes      each pass adds context AND a generation`,
        notes: [
          { t: "p", text: "**24.4x against a naive 10.0x** is the headline, and the gap is the point: the step count is not the multiplier, because step n pays for the outputs of steps 1 through n\u22121. An agent\u2019s cost is roughly quadratic in steps, so a budget built on \u2018twelve steps means twelve calls\u2019 is wrong by a factor of two and a half." },
          { t: "p", text: "**The last step costs 4.1x the first**, which is the same fact seen from the other end. If you are sampling agent traces to estimate cost, sampling early steps understates it badly." },
          { t: "p", text: "**Trimming tool output 800 \u2192 100 saves 43% of the whole run.** No per-call optimisation comes close, because this is the only lever with a compounding property \u2014 a page pasted at step 3 is paid again at every step from 4 to 12." },
          { t: "p", text: "**The per-call limit demonstration is the part worth keeping.** A 16,000-token per-call cap let the loop run 13 steps and spend 28x a single call before any single request hit the limit. Every individual call was within bounds, because the failure mode is the *number* of calls rather than the size of one." },
          { t: "p", text: "**So the budget has to be enforced inside the loop**, and of the three enforcement points the step cap is the one that bounds the quadratic. A cumulative token budget bounds the total but only after most of it is spent; a step cap bounds it in advance." },
          { t: "p", text: "The 800-token tool result is my parameter rather than a measurement \u2014 it stands for a pasted page or a verbose API response. The shape of the result does not depend on it, but the 43% figure does, so measure your own tool outputs before quoting it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A batch API discount is a genuine price cut and the largest single one available; streaming saves no tokens at all and belongs in a cost discussion only as the reason you do not need a faster model. And once you stream, the ranking of every latency fix changes." },
        { t: "p", text: "For agents, the step count is not the multiplier. Measured, 12 steps cost 24.4x a single call against a naive 10.0x, because every thought and tool result re-enters the prompt \u2014 so the last step costs 4.1x the first and cost is roughly quadratic in steps. Trim tool output (43% of the run) and enforce budgets per run, because a per-call limit cannot see a runaway loop." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur agent costs far more than we budgeted. We estimated twelve steps at twelve times a single call.\u201d**" },
        { t: "p", text: "That estimate is the bug. The step count is not the multiplier, because an agent\u2019s context grows \u2014 every thought and every tool result re-enters the prompt for every subsequent step. When I modelled a twelve-step run with a trimmed 3,200-token starting prompt and 800-token tool results, it cost 24.4 times a single call. Repeating the same call twelve times gives 10.0, so the naive estimate understates it by about two and a half times." },
        { t: "p", text: "The shape is roughly quadratic rather than linear, because step n pays for the outputs of steps one through n minus one. The prompt went from 3,200 to 13,650 tokens, so the last step alone cost 4.1 times the first. That also means sampling early steps to estimate cost understates it badly." },
        { t: "p", text: "The highest-leverage fix is trimming tool output before it re-enters the context. Going from 800 tokens to 100 took the run from 54 cents to 31 \u2014 a 43% saving from one change at one point in the loop. It beats any per-call optimisation because it is the only lever that compounds: a pasted page costs its tokens once at step three and then eleven more times as part of later prompts." },
        { t: "p", text: "The same logic makes capping reflection passes a cost control rather than a quality one. A critic pass adds its own output to the context and triggers another generation over the enlarged context, so the marginal cost of reflection rises with every pass while its marginal value falls." },
        { t: "p", text: "And I would move the budget enforcement. A per-call token limit cannot stop this — I modelled a 16,000-token per-call cap and the loop ran 13 steps, spending 28 times a single call, before any single request hit it. Every call was within bounds; the failure is the number of calls. So enforcement goes inside the loop: a cumulative token and dollar budget, a maximum step count, and a cap on reflection passes. The step cap is the one that bounds the quadratic in advance rather than after the fact." },
        { t: "p", text: "One easy win alongside that: if any of this work is not user-facing \u2014 nightly evaluation, backfills, the judge calls in an online-eval tier \u2014 a batch API is roughly a 50% discount for the same model and the same prompt. That is larger than any token lever and costs nothing but latency." }
      ] }
  ],

  takeaways: [
    "**A batch API discount is a genuine price cut** \u2014 roughly 50%, for the same model and prompt, at the cost of latency.",
    "**Streaming saves no tokens at all**; it changes perceived latency, which removes the pressure to buy a faster model.",
    "**And once you stream, the ranking of latency fixes changes** \u2014 the search went from 8.7% of total to 25.3% of TTFT.",
    "**The eval tier is a natural batch workload**, since judges are asynchronous by design.",
    "**Measured: 12 agent steps cost 24.4x a single call**, against a naive flat estimate of 10.0x.",
    "**So the step count is not the multiplier** \u2014 the naive estimate understates the bill by 2.4x.",
    "**Agent cost is roughly quadratic in steps**, because step n pays for the outputs of steps 1 to n\u22121.",
    "**Measured: the prompt grows 3,200 \u2192 13,650 tokens, so the last step costs 4.1x the first.**",
    "**Which means sampling early steps understates agent cost badly.**",
    "**Measured: trimming tool output 800 \u2192 100 tokens saves 43% of the whole run.**",
    "**It beats every per-call optimisation because bloat compounds** \u2014 a page pasted at step 3 is paid again at steps 4\u201312.",
    "**A per-call token limit cannot stop a runaway loop**, because the failure is the number of calls, not the size of one."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A 12-step agent is estimated at 12x a single call. What does measurement give?",
        options: [
          "About 12x, confirming the estimate",
          "24.4x \u2014 because every thought and tool result re-enters the prompt, so step n pays for the outputs of steps 1 to n\u22121",
          "Around 30x, matching the 20\u201330 call figure",
          "Less than 12x, because later steps have shorter outputs"
        ],
        answer: 1,
        why: "Repeating an identical call twelve times gives 10.0x, while a run with a growing context costs 24.4x \u2014 the naive estimate understates it by about 2.4x. The growth makes cost roughly quadratic in step count rather than linear: the prompt went from 3,200 to 13,650 tokens, so the final step alone cost 4.1x the first. The 20\u201330 call figure is about reflection adding calls, which is a separate multiplier on top of this one." },

      { stem: "Why does trimming tool output beat any per-call optimisation in an agent?",
        options: [
          "Because tool outputs are usually larger than model outputs",
          "Because the bloat compounds \u2014 a page pasted at step 3 is paid again as prompt at every step from 4 to 12",
          "Because tool calls are billed at a higher rate than generations",
          "Because trimming reduces the number of steps required"
        ],
        answer: 1,
        why: "Every other lever improves one call, while trimming what re-enters the context improves that call and every subsequent one, which is why cutting tool output from 800 tokens to 100 saved 43% of a whole run. The same compounding logic makes capping reflection passes a cost control: each pass adds its own output to the context and then triggers a generation over the enlarged context." },

      { stem: "Why can a per-call token limit not stop a runaway agent loop?",
        options: [
          "Because providers enforce per-call limits inconsistently",
          "Because every individual call is within limits \u2014 the failure is the number of calls, not the size of any one",
          "Because the limit applies only to output tokens",
          "Because tool results are not counted against the per-call limit"
        ],
        answer: 1,
        why: "A 16,000-token cap allowed 13 steps and 28x a single call's cost before any single request hit it, since none was individually oversized. Enforcement therefore has to live inside the loop as a cumulative token and dollar budget, a maximum step count, and a cap on reflection passes \u2014 and the step cap is the one that bounds the quadratic growth in advance rather than after most of the money is spent." },

      { stem: "How should streaming appear in a cost analysis?",
        options: [
          "As a token saving, since partial responses can be truncated early",
          "Not as a saving at all \u2014 only as the reason a faster, more expensive model is unnecessary",
          "As a 50% discount, equivalent to the batch API",
          "As a latency cost, since streaming adds protocol overhead"
        ],
        answer: 1,
        why: "Streaming transmits the same tokens and is billed identically; what it changes is what the user experiences, and therefore whether anyone argues for a pricier model purely for perceived speed. That makes it a UX change with a cost side-effect rather than a line item. It also reorders which latency fixes are worth buying, since against time-to-first-token the pipeline before the model matters far more than the model itself." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Batching, streaming and agents",
    questions: [
      { level: "core",
        q: "Does streaming save money?",
        strong: "A strong answer says no, then gives the indirect effect.",
        answer: [
          { t: "p", text: "No. It transmits the same tokens and is billed identically. What it changes is perceived latency \u2014 the user sees text in about a second and reads along rather than watching a spinner." },
          { t: "p", text: "The cost connection is indirect: it removes the pressure to buy a faster, more expensive model purely for speed. So it belongs in a cost discussion as \u2018this is why we do not need the premium model\u2019, never as a token saving." },
          { t: "p", text: "It also changes which latency fixes are worth buying, which surprised me when I measured it. Against total latency the model dominated at about 76% and the vector search was 9%; against time-to-first-token the search was 25% and the model 11%. Same trace, inverted ranking." },
          { t: "p", text: "The real price cut in this area is the batch API \u2014 roughly 50% off for non-real-time work, same model, same prompt. Larger than any token lever, and the eval tier qualifies for it since judges are asynchronous anyway." }
        ] },

      { level: "advanced",
        q: "How would you budget an agent?",
        strong: "A strong answer rejects the step-count model.",
        answer: [
          { t: "p", text: "Not from the step count, because that is the mistake. An agent\u2019s context grows \u2014 every thought and tool result re-enters the prompt \u2014 so when I modelled twelve steps it cost 24.4 times a single call where repeating the same call twelve times gives 10.0." },
          { t: "p", text: "The growth makes it roughly quadratic: step n pays for the outputs of all previous steps, the prompt went 3,200 to 13,650 tokens, and the last step cost 4.1 times the first. So sampling early steps to estimate cost understates it badly." },
          { t: "p", text: "Budget enforcement goes inside the loop, not per call. A per-call limit cannot see a runaway loop because no individual call is oversized \u2014 I modelled a 16,000-token cap and the loop ran for many steps without it firing. So: a cumulative token and dollar budget, a max step count, and a cap on reflection passes." },
          { t: "p", text: "Of those, the step cap is the one that bounds the quadratic in advance. A cumulative token budget also works but only stops you after most of the money is spent." }
        ] },

      { level: "core",
        q: "What is the single most effective agent cost lever?",
        strong: "A strong answer picks tool-output trimming and says why.",
        answer: [
          { t: "p", text: "Trimming tool output before it re-enters the context. Measured, going from 800 tokens to 100 took a twelve-step run from 54 cents to 31 \u2014 43% off the whole run from one change at one point in the loop." },
          { t: "p", text: "It wins because it is the only lever that compounds. A pasted web page costs its tokens once when the tool returns it, and then again as part of the prompt for every subsequent step. At step three of twelve that is eleven extra payments." },
          { t: "p", text: "Everything else \u2014 a shorter system prompt, fewer few-shot examples, a cheaper model for routine steps \u2014 improves one call at a time. Those are worth doing and they do not have this property." },
          { t: "p", text: "The same reasoning makes capping reflection a cost lever: each critic pass adds its own output to the context and then triggers a generation over the enlarged context, so its marginal cost rises as its marginal value falls." }
        ] }
    ]
  }
});
