EC.receiveLesson({
  id: "11.7",

  lede: "A worked bill makes the levers obvious. 8,000 input tokens and 400 output at $5/$15 per million is **$0.046 a call**, or **$46,000 a month** at a million calls \u2014 and 87% of that is input. The reference then walks four changes down to $13,800, a 70% saving with **no model change and no quality loss**. Rebuilding the table from its own line items reproduces every figure but one: the rerank step gives **4,250 tokens, not 4,450**, and the 200-token slip is inherited by everything after it.",

  objectives: [
    "Decompose a monthly bill into the line items that caused it",
    "Compute the saving from each lever rather than estimating it",
    "State what share of the bill is input against output, and how that changes",
    "Recognise that the input levers erode their own premise",
    "Identify which line items are waste and which are load-bearing"
  ],

  prerequisites: ["11.6", "1.16"],

  blocks: [

    { t: "h2", n: "01", id: "bill", text: "Where the bill actually comes from",
      sub: "Per request" },

    { t: "code", lang: "text", title: "A support assistant, decomposed", code: `A support assistant. Per request:
  System prompt + instructions ........  600 tokens
  10 few-shot examples ................ 2,500 tokens   <- do you need all 10?
  Retrieved RAG context (8 chunks) ... 3,200 tokens   <- do you need all 8?
  Conversation history (full) ........ 1,500 tokens   <- growing every turn
  User message .......................   200 tokens
  ----------------------------------------------------
  INPUT  total ....................... 8,000 tokens
  OUTPUT (answer) ....................   400 tokens

At $5 / 1M input and $15 / 1M output:
  per call = 8,000x$5/1e6 + 400x$15/1e6 = $0.040 + $0.006 = $0.046
  at 1,000,000 calls/month  ->  $46,000 / month`,
      hl: [3, 4, 5],
      caption: "Verified. The three annotated lines are 7,200 of the 8,000 input tokens." },

    { t: "callout", kind: "insight", title: "The decomposition is the whole method",
      body: [
        { t: "p", text: "A bill of $46,000 is not actionable. \u2018Few-shot examples are 2,500 tokens a call, which is $12,500 a month\u2019 is. Every lever in 11.8 to 11.10 is a line in this table, and you cannot choose between them without the table." },
        { t: "p", text: "The per-unit figures fall straight out and they are what makes the levers computable: 2,500 tokens over 10 examples is **250 tokens per example**, and 3,200 over 8 chunks is **400 tokens per chunk**. Those two numbers let you price \u2018trim to 3 examples\u2019 and \u2018rerank to 3 chunks\u2019 exactly rather than guessing." },
        { t: "p", text: "And 10.6 already argued for logging the pieces: `prompt_tokens` on the span is the aggregate, and without the breakdown a cost spike tells you the prompt grew without telling you which part grew. The table is only reconstructible if you instrument it." }
      ] },

    { t: "h2", n: "02", id: "levers", text: "The levers, with the arithmetic",
      sub: "No model change, no quality loss" },

    { t: "table",
      head: ["Change", "New input", "Cost/call", "Monthly", "Saving"],
      rows: [
        ["Baseline", "8,000", "$0.046", "$46,000", "\u2014"],
        ["Trim few-shot 10\u21923", "6,250", "$0.037", "$37,250", "19%"],
        ["Rerank chunks 8\u21923", "**4,250**", "$0.027", "$27,250", "41%"],
        ["Summarise history", "**3,200**", "$0.022", "$22,000", "52%"],
        ["+ Cache 40% of calls", "\u2014", "\u2014", "**$13,200**", "**71%**"]
      ] },

    { t: "callout", kind: "trap", title: "The reference\u2019s rerank step is 200 tokens high, and it propagates",
      body: [
        { t: "p", text: "Its own line items give 400 tokens per chunk, so keeping 3 of 8 removes 5 \u00d7 400 = 2,000 tokens: **6,250 \u2212 2,000 = 4,250**. The reference states 4,450, then computes the cost from 4,450, so the summarise-history row inherits it too \u2014 3,400 where the derivation gives 3,200." },
        { t: "p", text: "The bottom line survives. With the corrected figures the chain is $46,000 \u2192 $37,250 \u2192 $27,250 \u2192 $22,000 \u2192 **$13,200 with a 40% cache hit rate, a 71.3% total saving** against the reference\u2019s stated 70%. So the headline claim is right and slightly understated." },
        { t: "p", text: "Worth noting what kind of error this is: not a conceptual mistake but an arithmetic slip in a derived figure, of the sort 9.1 warned about \u2014 and the reason to rebuild a table from its line items rather than copying the totals." }
      ] },

    { t: "h2", n: "03", id: "share", text: "Input is the bigger half \u2014 until you fix it",
      sub: "The levers erode their own premise" },

    { t: "code", lang: "text", title: "Measured: the input share through the chain", code: `  Baseline                 input  87.0% of cost, output  13.0%
  Trim few-shot 10->3      input  83.9% of cost, output  16.1%
  Rerank chunks 8->3       input  78.0% of cost, output  22.0%
  Summarize history        input  72.7% of cost, output  27.3%`,
      hl: [1, 4],
      caption: "Output goes from an eighth of the bill to over a quarter \u2014 without changing by a single token." },

    { t: "callout", kind: "insight", title: "So \u201cattack input first\u201d is true and self-limiting",
      body: [
        { t: "p", text: "The reference is right that input is normally the larger and most wasteful half \u2014 87% here, and most of it boilerplate. But applying the three input levers takes input from 87% to 72.7% of the bill, so the **next** lever is no longer an input lever." },
        { t: "p", text: "Output is priced higher per token, and after the input work it is 27% of a bill a quarter the original size. At that point capping `max_tokens` and asking for structure \u2014 11.8\u2019s second half \u2014 is where the remaining proportional saving is." },
        { t: "p", text: "That is a useful thing to know before you start, because it tells you when to stop. Each input lever has a smaller share to work on than the last, and the sequence has a natural end point rather than continuing indefinitely." }
      ] },

    { t: "callout", kind: "good", title: "And note which line items are waste and which are not",
      body: [
        { t: "p", text: "Few-shot examples at 2,500 tokens and history at 1,500 are mostly **waste** \u2014 2 or 3 examples usually match 10, and a running summary replaces a full transcript. 2.6 measured the first directly: gpt2-medium went 0/6 to 6/6 on an opposites task at **two** shots, so the tenth example buys nothing." },
        { t: "p", text: "RAG context at 3,200 tokens is **not** waste in the same sense \u2014 it is load-bearing, and cutting it trades cost against recall. 11.2\u2019s retrieval miss is the failure you buy by cutting too far, which is why the lever is *rerank* to top-k rather than simply retrieve fewer." },
        { t: "p", text: "And the system prompt at 600 tokens is small, load-bearing and the one place a prompt cache applies cleanly \u2014 it is a fixed prefix on every call, which is exactly what provider prompt caching is for." }
      ] },

    { t: "viz", title: "The bill, and what each lever removes", caption: "Verified from the reference's own line items, with the 200-token correction.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Monthly LLM bill decomposed by line item with each cost lever applied">
  <text x="16" y="20" class="s-label">BASELINE &#183; 8,000 INPUT + 400 OUTPUT &#183; $46,000/MONTH</text>
  <rect x="16" y="30" width="46" height="24" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="39" y="46" text-anchor="middle" class="s-mono" style="font-size="8px" font-size="8">600</text>
  <rect x="64" y="30" width="190" height="24" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="159" y="46" text-anchor="middle" class="s-mono" style="font-size:9px">few-shot 2,500</text>
  <rect x="256" y="30" width="243" height="24" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="377" y="46" text-anchor="middle" class="s-mono" style="font-size:9px">RAG context 3,200</text>
  <rect x="501" y="30" width="114" height="24" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="558" y="46" text-anchor="middle" class="s-mono" style="font-size:9px">history 1,500</text>
  <rect x="617" y="30" width="16" height="24" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="635" y="30" width="31" height="24" rx="2" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="651" y="46" text-anchor="middle" class="s-mono" style="font-size:8px">out</text>
  <text x="674" y="46" class="s-sub">400</text>
  <text x="16" y="68" class="s-sub">red = mostly waste &#183; amber = load-bearing, trade against recall &#183; green = fixed prefix, cache it</text>

  <text x="16" y="96" class="s-label">AND EACH LEVER APPLIED</text>
  <text x="20" y="118" class="s-mono" style="font-size:9px">trim few-shot 10-&gt;3</text>
  <rect x="170" y="108" width="400" height="14" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="578" y="119" class="s-mono" style="font-size:8px">6,250 in &#183; $37,250/mo &#183; 19%</text>
  <text x="20" y="140" class="s-mono" style="font-size:9px">rerank chunks 8-&gt;3</text>
  <rect x="170" y="130" width="272" height="14" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="450" y="141" class="s-mono" style="font-size:8px">4,250 in &#183; $27,250/mo &#183; 41%</text>
  <text x="20" y="162" class="s-mono" style="font-size:9px">summarise history</text>
  <rect x="170" y="152" width="205" height="14" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="383" y="163" class="s-mono" style="font-size:8px">3,200 in &#183; $22,000/mo &#183; 52%</text>
  <text x="20" y="184" class="s-mono" style="font-size:9px">+ 40% cache hits</text>
  <rect x="170" y="174" width="123" height="14" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="301" y="185" class="s-mono" style="font-size:8px;fill:var(--good)">$13,200/mo &#183; 71% &#8212; no model change</text>

  <rect x="16" y="202" width="728" height="34" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="28" y="220" class="s-mono" style="font-size:9px;fill:var(--warn)">THE REFERENCE STATES 4,450 FOR THE RERANK STEP. ITS OWN LINE ITEMS GIVE 4,250.</text>
  <text x="28" y="232" class="s-sub">400 tokens/chunk x 5 chunks removed = 2,000 &#183; 6,250 - 2,000 = 4,250 &#183; the 200 propagates to 3,400 vs 3,200</text>

  <line x1="16" y1="248" x2="744" y2="248" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="268" class="s-label">AND THE INPUT SHARE ERODES AS YOU FIX IT</text>
  <text x="20" y="288" class="s-mono" style="font-size:9px">input share of cost</text>
  <rect x="170" y="278" width="400" height="14" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.3"/>
  <text x="578" y="289" class="s-mono" style="font-size:8px;fill:var(--crit)">87.0% at baseline</text>
  <rect x="170" y="296" width="334" height="14" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="512" y="307" class="s-mono" style="font-size:8px">72.7% after the three input levers &#8212; so the NEXT lever is max_tokens</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Rebuild the cost table from line items", difficulty: "core", minutes: 30,
      body: "Decompose your own per-request bill into line items, derive the per-unit figures, then compute each lever's saving from those rather than estimating. Check whether your table's totals follow from its own parts \u2014 that is how the 200-token slip surfaces.",
      requirements: [
        "A per-request line-item breakdown summing to the input total",
        "Per-unit figures derived (tokens per example, per chunk)",
        "Each lever's new total computed from the line items, not asserted",
        "The input/output cost share at baseline and after the input levers",
        "Any total that does not follow from its own parts, flagged"
      ],
      hint: "Derive the per-chunk and per-example costs first, then apply the levers as arithmetic on the line items. A total you cannot reproduce from the parts is a slip, and it propagates to every row below it.",
      solution: { lang: "python", title: "the bill, rebuilt and checked", code: `PRICE_IN, PRICE_OUT = 5.0, 15.0        # per 1M, illustrative
CALLS = 1_000_000
OUT = 400

BASE = {
    "system prompt + instructions": 600,
    "10 few-shot examples":       2_500,
    "retrieved RAG context (8)":  3_200,
    "conversation history":       1_500,
    "user message":                 200,
}
base_in = sum(BASE.values())
print("baseline input breakdown:")
for k, v in BASE.items():
    print("  %-30s %6d" % (k, v))
print("  %-30s %6d" % ("INPUT total", base_in))
print("  %-30s %6d" % ("OUTPUT", OUT))

def cost(tin, tout=OUT):
    return tin / 1e6 * PRICE_IN + tout / 1e6 * PRICE_OUT

print()
print("per call = %d x $%.0f/1e6 + %d x $%.0f/1e6 = $%.3f + $%.3f = $%.3f"
      % (base_in, PRICE_IN, OUT, PRICE_OUT,
         base_in / 1e6 * PRICE_IN, OUT / 1e6 * PRICE_OUT, cost(base_in)))
print("at %s calls/month -> $%s/month"
      % (format(CALLS, ","), format(int(cost(base_in) * CALLS), ",")))

# derive the per-unit figures -- this is what makes the levers computable
per_shot = BASE["10 few-shot examples"] / 10.0
per_chunk = BASE["retrieved RAG context (8)"] / 8.0
print()
print("derived: %.0f tokens per few-shot example, %.0f tokens per RAG chunk"
      % (per_shot, per_chunk))

SUMMARY_TOKENS = 450

steps, cur = [], dict(BASE)
steps.append(("Baseline", sum(cur.values())))
cur["10 few-shot examples"] = int(3 * per_shot)
steps.append(("Trim few-shot 10->3", sum(cur.values())))
cur["retrieved RAG context (8)"] = int(3 * per_chunk)
steps.append(("Rerank chunks 8->3", sum(cur.values())))
cur["conversation history"] = SUMMARY_TOKENS
steps.append(("Summarize history", sum(cur.values())))

REF = {"Baseline": 8000, "Trim few-shot 10->3": 6250,
       "Rerank chunks 8->3": 4450, "Summarize history": 3400}

print()
print("%-24s %10s %10s %10s %12s %10s"
      % ("change", "derived", "reference", "delta", "cost/call", "monthly"))
for label, tin in steps:
    d = tin - REF[label]
    flag = "" if d == 0 else "  <-- MISMATCH"
    print("%-24s %10d %10d %+10d %12.5f %10s%s"
          % (label, tin, REF[label], d, cost(tin),
             format(int(cost(tin) * CALLS), ","), flag))

print()
print("the 8->3 rerank step does not follow from the reference's own numbers:")
print("  8 chunks = 3,200 tokens, so 400 each; keeping 3 removes 5 x 400 = 2,000")
print("  6,250 - 2,000 = 4,250, not 4,450. the reference is 200 tokens high.")
print("  it then computes cost from 4,450, so everything downstream inherits it.")

print()
print("corrected chain:")
base_month = cost(8000) * CALLS
for label, tin in steps:
    m = cost(tin) * CALLS
    print("  %-24s $%-9s saving %5.1f%%"
          % (label, format(int(m), ","), 100.0 * (base_month - m) / base_month))
for hit in (0.40,):
    m = cost(steps[-1][1]) * CALLS * (1 - hit)
    print("  + cache %.0f%% of calls      $%-9s saving %5.1f%%"
          % (hit * 100, format(int(m), ","), 100.0 * (base_month - m) / base_month))

print()
print("-- is input really 'the bigger half'? --")
for label, tin in steps:
    ci, co = tin / 1e6 * PRICE_IN, OUT / 1e6 * PRICE_OUT
    print("  %-24s input %5.1f%% of cost, output %5.1f%%"
          % (label, 100 * ci / (ci + co), 100 * co / (ci + co)))
print("  -> input dominates at the start and the LEVERS ERODE THEIR OWN PREMISE:")
print("     by the end output is a third of the bill, so the next lever is max_tokens.")`,
        out: `==========================================================================
A -- THE COST TABLE, REBUILT FROM THE REFERENCE'S OWN LINE ITEMS
==========================================================================
baseline input breakdown:
  system prompt + instructions      600
  10 few-shot examples             2500
  retrieved RAG context (8)        3200
  conversation history             1500
  user message                      200
  INPUT total                      8000
  OUTPUT                            400

per call = 8000 x $5/1e6 + 400 x $15/1e6 = $0.040 + $0.006 = $0.046
at 1,000,000 calls/month -> $46,000/month

derived: 250 tokens per few-shot example, 400 tokens per RAG chunk

change                      derived  reference      delta    cost/call    monthly
Baseline                       8000       8000         +0      0.04600     46,000
Trim few-shot 10->3            6250       6250         +0      0.03725     37,250
Rerank chunks 8->3             4250       4450       -200      0.02725     27,250  <-- MISMATCH
Summarize history              3200       3400       -200      0.02200     22,000  <-- MISMATCH

the 8->3 rerank step does not follow from the reference's own numbers:
  8 chunks = 3,200 tokens, so 400 each; keeping 3 removes 5 x 400 = 2,000
  6,250 - 2,000 = 4,250, not 4,450. the reference is 200 tokens high.
  it then computes cost from 4,450, so everything downstream inherits it.

corrected chain:
  Baseline                 $46,000    saving   0.0%
  Trim few-shot 10->3      $37,250    saving  19.0%
  Rerank chunks 8->3       $27,250    saving  40.8%
  Summarize history        $22,000    saving  52.2%

  + cache 40% of calls      $13,200    saving  71.3%

the reference's headline 70%% total saving survives: with the corrected
3,200-token prompt the figure is 71.3%, slightly better than its 70%.

-- is input really 'the bigger half'? --
  Baseline                 input  87.0% of cost, output  13.0%
  Trim few-shot 10->3      input  83.9% of cost, output  16.1%
  Rerank chunks 8->3       input  78.0% of cost, output  22.0%
  Summarize history        input  72.7% of cost, output  27.3%
  -> input dominates at the start and the LEVERS ERODE THEIR OWN PREMISE:
     by the end output is a third of the bill, so the next lever is max_tokens.`,
        notes: [
          { t: "p", text: "**Two rows do not follow from the reference\u2019s own line items**, both off by the same 200 tokens, because the second inherits the first. 400 tokens per chunk \u00d7 5 chunks removed is 2,000, so 6,250 \u2212 2,000 = 4,250 and not 4,450." },
          { t: "p", text: "**The headline survives and improves slightly**: the corrected chain reaches $13,200 and a 71.3% total saving against the stated 70%. So this is an arithmetic slip in a derived figure rather than a conceptual error \u2014 and the reason to rebuild a table from its parts rather than copying totals." },
          { t: "p", text: "**The saving on the first row is 19.0%, not the stated 20%.** That one is defensible: using the reference\u2019s rounded $37,000 against $46,000 gives 19.6%, which rounds to 20%. Computing from unrounded figures gives 19.0%. Both are \u2018right\u2019 and the difference is whether you round before or after dividing." },
          { t: "p", text: "**The input-share table is the finding worth carrying forward.** Input is 87.0% of the bill at baseline and 72.7% after the three input levers, so the advice to attack input first is correct *and* self-limiting \u2014 each lever has a smaller share to work on than the last, and the sequence has a natural end." },
          { t: "p", text: "**Output never changed by a single token** and went from 13.0% to 27.3% of the bill. That is the clearest argument for `max_tokens` being the next lever rather than a further input trim." },
          { t: "p", text: "The 450-token summary figure is my inference rather than the reference\u2019s: it is the value its own 3,400 total implies. I kept it so the chain is reproducible, but it is a parameter you would measure rather than assume." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Decompose the bill into line items before choosing a lever, because $46,000 is not actionable and \u2018few-shot examples are $12,500 of it\u2019 is. Derive the per-unit figures \u2014 250 tokens per example, 400 per chunk \u2014 and every lever becomes arithmetic rather than an estimate." },
        { t: "p", text: "Input is 87% of the baseline bill and mostly waste, so attack it first \u2014 but the three input levers take it to 72.7%, so the advice is self-limiting and output becomes the next lever. And rebuild the table from its parts: the reference\u2019s rerank row is 200 tokens high and propagates, though its 70% headline survives at 71.3%." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur LLM bill is $46,000 a month and the CFO wants it halved. Where do you start?\u201d**" },
        { t: "p", text: "By decomposing it, because a total is not actionable. For a typical support assistant the per-request input breaks down as roughly 600 tokens of system prompt, 2,500 of few-shot examples, 3,200 of retrieved context, 1,500 of conversation history and 200 of user message \u2014 8,000 in, 400 out, which at $5 and $15 per million is 4.6 cents a call." },
        { t: "p", text: "The first thing that falls out is that input is 87% of the cost, and most of it is not the user\u2019s question. The second is the per-unit figures: 250 tokens per few-shot example and 400 per retrieved chunk. Those two numbers turn every lever into arithmetic rather than a guess." },
        { t: "p", text: "Then three changes, none of which touches the model. Trim the few-shot examples from ten to three, which is usually quality-neutral \u2014 that takes you to $37,250. Rerank the retrieved context to the top three instead of dumping eight, which also fixes lost-in-the-middle \u2014 $27,250. Replace the full transcript with a running summary \u2014 $22,000. A 40% cache hit rate on top gets to $13,200, a 71% saving with no model change." },
        { t: "p", text: "I would flag one thing about that chain. When I rebuilt it from the line items, the rerank step came out at 4,250 tokens rather than the 4,450 usually quoted \u2014 400 per chunk times five chunks removed is 2,000, from 6,250. The 200-token difference propagates to the next row. The bottom line survives and is actually slightly better, but it is the reason to rebuild a cost table from its parts rather than copy the totals." },
        { t: "p", text: "And I would set an expectation about where this ends. The input levers erode their own premise: input goes from 87% of the bill to 72.7% after those three changes, while output has not changed by a single token and has gone from 13% to 27% of a much smaller bill. So after the input work, the next proportional saving is capping `max_tokens` and asking for structured output rather than another input trim." },
        { t: "p", text: "The one caution on the retrieval line: few-shot examples and history are mostly waste, but retrieved context is load-bearing. Cutting it trades cost against recall, and a retrieval miss is the most common cause of hallucination \u2014 which is why the lever is *rerank to top-k* rather than simply retrieve less." }
      ] }
  ],

  takeaways: [
    "**Decompose before choosing a lever** \u2014 $46,000 is not actionable; \u201cfew-shot is $12,500 of it\u201d is.",
    "**Verified: 8,000 in and 400 out at $5/$15 per million is $0.046 a call, $46,000 a month.**",
    "**Input is 87.0% of the baseline bill**, and most of it is not the user's question.",
    "**Derive the per-unit figures**: 250 tokens per few-shot example, 400 per RAG chunk \u2014 then levers are arithmetic.",
    "**The reference's rerank row is 200 tokens high**: its own line items give 4,250, not 4,450, and the slip propagates.",
    "**Its 70% headline survives at 71.3%** on the corrected chain, reaching $13,200.",
    "**The input levers erode their own premise**: input falls from 87.0% to 72.7% of the bill.",
    "**Output never changed by a token and went from 13.0% to 27.3% of cost** \u2014 so `max_tokens` is the next lever.",
    "**Few-shot examples and history are mostly waste** \u2014 two shots often match ten, and a summary replaces a transcript.",
    "**Retrieved context is load-bearing, not waste** \u2014 cutting it trades cost against recall.",
    "**Which is why the lever is \u201crerank to top-k\u201d, not \u201cretrieve less\u201d** \u2014 it buys the saving without the recall loss.",
    "**The system prompt is the clean prompt-cache target**: small, load-bearing and a fixed prefix on every call."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why decompose the bill into line items rather than working from the total?",
        options: [
          "Because providers bill per line item and the invoice is itemised",
          "Because the per-unit figures \u2014 250 tokens per example, 400 per chunk \u2014 make each lever computable instead of estimated",
          "Because the total includes retries that must be excluded",
          "Because input and output are billed on different invoices"
        ],
        answer: 1,
        why: "Once you know an example costs 250 tokens and a chunk 400, \u201ctrim to 3 examples\u201d and \u201crerank to 3 chunks\u201d become exact arithmetic rather than guesses, and the levers can be ranked against each other before any of them is built. It is also what makes an error visible: rebuilding the chain from the parts is how the 200-token discrepancy in the rerank row surfaces at all." },

      { stem: "What happens to the input share of cost as the input levers are applied?",
        options: [
          "It stays roughly constant, since all line items shrink proportionally",
          "It falls from 87.0% to 72.7%, so the advice to attack input first is correct and self-limiting",
          "It rises, because output tokens are reduced faster than input",
          "It falls below 50%, making output the dominant cost"
        ],
        answer: 1,
        why: "Output never changes by a single token through the three input levers, so as input shrinks its share of a smaller bill declines \u2014 and output rises from 13.0% to 27.3% of cost without being touched. That is the signal to switch levers: capping `max_tokens` and requesting structured output become the next proportional saving, rather than a fourth input trim with a smaller base to work on." },

      { stem: "Which line item should not be treated as waste?",
        options: [
          "The conversation history, since prior turns carry necessary context",
          "The retrieved RAG context \u2014 it is load-bearing, and cutting it trades cost against recall",
          "The few-shot examples, since removing them degrades format adherence",
          "The system prompt, since it is the largest fixed cost"
        ],
        answer: 1,
        why: "Few-shot examples and full transcripts are genuinely wasteful \u2014 two or three examples usually match ten, and a running summary replaces resending everything \u2014 whereas retrieved chunks are the substance the answer is grounded in. That is why the lever is phrased as reranking to top-k rather than retrieving fewer: it removes the low-value chunks while keeping recall, since a retrieval miss is the most common cause of hallucination." },

      { stem: "The reference states 4,450 input tokens after reranking 8 chunks to 3. What does its own data give?",
        options: [
          "4,450 \u2014 the figure is consistent once the system prompt is excluded",
          "4,250 \u2014 400 tokens per chunk times five removed is 2,000, from 6,250",
          "4,050 \u2014 the reranked chunks are shorter than the originals",
          "3,200 \u2014 the summarised-history figure applies at this step"
        ],
        answer: 1,
        why: "The line items give 3,200 tokens for 8 chunks, so 400 each, and keeping 3 removes 2,000 from the 6,250 subtotal. The stated figure is 200 tokens high and the cost is then computed from it, so the next row inherits the error as 3,400 rather than 3,200. The conclusion is unaffected \u2014 the corrected chain gives a 71.3% total saving against the stated 70% \u2014 which is what makes it a slip rather than a flaw." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where the bill comes from",
    questions: [
      { level: "foundation",
        q: "Where does an LLM bill actually come from?",
        strong: "A strong answer decomposes rather than generalises.",
        answer: [
          { t: "p", text: "Per request, from the line items. For a typical support assistant: about 600 tokens of system prompt, 2,500 of few-shot examples, 3,200 of retrieved context, 1,500 of conversation history, 200 of user message \u2014 so 8,000 in and 400 out, which is 4.6 cents a call and $46,000 a month at a million calls." },
          { t: "p", text: "The first thing that falls out is that input is 87% of the cost and most of it is not the user\u2019s question. The user message is 200 of 8,000 tokens." },
          { t: "p", text: "The second is the per-unit figures \u2014 250 tokens per few-shot example, 400 per chunk \u2014 which is what turns \u2018trim the examples\u2019 from an instinct into a priced change." },
          { t: "p", text: "And the three largest items are also the three most compressible, which is why the typical LLM cost win is not a cheaper model but simply not sending tokens you did not need." }
        ] },

      { level: "core",
        q: "How far can you get without changing the model?",
        strong: "A strong answer has the chain and a caveat.",
        answer: [
          { t: "p", text: "About 70%. Trimming few-shot from ten examples to three takes $46,000 to $37,250. Reranking retrieved context from eight chunks to three takes it to $27,250. Replacing the full transcript with a running summary gets $22,000. A 40% cache hit rate on top reaches $13,200 \u2014 a 71% saving with no model change and no quality loss." },
          { t: "p", text: "I would present that as a floor rather than a target, because none of those changes is risky. Two or three few-shot examples usually match ten, and reranking also fixes lost-in-the-middle, so it improves quality while cutting cost." },
          { t: "p", text: "The caveat is the retrieval line. That is load-bearing rather than waste, so the lever is reranking to top-k rather than retrieving less \u2014 cut too far and you buy a retrieval miss, which is the most common cause of hallucination." },
          { t: "p", text: "And I would tell them where it ends: after the input work, output is 27% of a much smaller bill, so the next lever is capping `max_tokens` rather than another input trim." }
        ] },

      { level: "core",
        q: "Someone hands you a cost-saving table. What do you check?",
        strong: "A strong answer rebuilds it from the parts.",
        answer: [
          { t: "p", text: "Whether each total follows from the line items above it. A table like this is a chain, so an error in one row propagates to every row below, and the bottom line can look fine while two of the steps do not reconcile." },
          { t: "p", text: "That is not hypothetical \u2014 when I rebuilt this one, the rerank step came out at 4,250 tokens rather than the stated 4,450. The line items give 400 tokens per chunk, five chunks removed is 2,000, from 6,250. The next row inherited the 200." },
          { t: "p", text: "The headline survived and was actually slightly better than claimed, 71.3% against 70%, so it was an arithmetic slip rather than a conceptual error. But I would not have known that without deriving it." },
          { t: "p", text: "I would also check whether the saving percentages were computed before or after rounding. The first row reads as 20% from rounded figures and 19.0% from unrounded ones, which is a small thing that compounds across a long table." }
        ] }
    ]
  }
});
