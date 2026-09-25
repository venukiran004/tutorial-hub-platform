EC.receiveLesson({
  id: "1.13",

  lede: "Two discounts are available on almost every LLM API and both are large enough to change what a product can afford. The **Batch API** halves the price of work that can wait a day. **Prompt caching** discounts the part of your prompt that does not change between requests — 50% on OpenAI, 90% on Anthropic — and it is free, automatic on one provider, and silently forfeited by putting the wrong thing first. This lesson carries both through on one workload and works out what the ordering mistake costs.",

  objectives: [
    "Decide whether a workload is eligible for the Batch API",
    "Build and submit a batch file, and handle the failure modes that only batches have",
    "Explain what a prompt cache matches on, and why ordering decides whether it hits",
    "Compute the saving from caching and batching on a real workload, separately and together",
    "Recognise the cases where a cache write costs more than it saves"
  ],

  prerequisites: ["1.5", "1.14"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "batch", text: "Half price for work that can wait",
      sub: "A JSONL file, a 24-hour window, and a completely different failure model" },

    { t: "p", text: "The Batch API takes a file of requests, processes them asynchronously within a stated window — 24 hours on OpenAI — and charges 50% of the real-time rate. There is no quality difference; it is the same models, run when the provider has spare capacity." },

    { t: "code", lang: "python", title: "batch.py — the whole flow", code: `import json

# 1. one JSON object per line, each with a custom_id you will match on later
with open("batch_input.jsonl", "w") as f:
    for i, prompt in enumerate(prompts):
        f.write(json.dumps({
            "custom_id": f"request-{i}",              # YOUR key, not theirs
            "method": "POST",
            "url": "/v1/chat/completions",
            "body": {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 100,
            },
        }) + "\\n")

# 2. upload and create
batch_file = client.files.create(file=open("batch_input.jsonl", "rb"), purpose="batch")
batch = client.batches.create(input_file_id=batch_file.id,
                              endpoint="/v1/chat/completions",
                              completion_window="24h")

# 3. poll -- validating -> in_progress -> completed (or failed / expired)
batch = client.batches.retrieve(batch.id)`,
      hl: [6],
      caption: "From 01_LLM_Parameters.md §13. The `custom_id` is the important field: results come back unordered and you match on it, so it has to carry enough information to find the row it belongs to." },

    { t: "callout", kind: "trap", title: "Results come back unordered, and some may be missing",
      body: [
        { t: "p", text: "A batch is not a loop with a discount. Results arrive in a file with no guaranteed order, and individual requests can fail while the batch as a whole succeeds — each line has its own `error` field. Code that zips results against the input list by position will silently misalign the moment one request fails." },
        { t: "p", text: "Match on `custom_id`, always. And make it meaningful: `\"request-7\"` tells you nothing when you are reconciling a failure three days later, where `\"doc-84213-summary-v2\"` tells you everything." },
        { t: "p", text: "The other batch-only state is `expired`. If the window elapses with work outstanding, you get partial results and the rest is not processed — which means a batch pipeline needs a path for \"some of this came back\" that a synchronous one never does." }
      ] },

    { t: "table",
      head: ["Workload", "Batch?", "Why"],
      rows: [
        ["Nightly summarisation of the day's documents", "**Yes**", "Nobody is waiting; 50% off for changing nothing"],
        ["Backfilling embeddings or labels over a corpus", "**Yes**", "The canonical case — large, offline, deadline-free"],
        ["Evaluation runs over a golden set", "**Yes**", "Runs on a schedule; halves the cost of measuring"],
        ["Anything a user is waiting for", "No", "24 hours is not a latency budget"],
        ["An agent's tool calls", "No", "Each step depends on the previous result"],
        ["Anything you might need to cancel", "Careful", "A submitted batch is committed work"]
      ],
      caption: "The first three are where most teams have a batch-shaped workload they are paying full price for. Evaluation in particular is easy to overlook and runs constantly." },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "caching", text: "Prompt caching pays you for putting the static part first",
      sub: "The cache matches a prefix, which makes ordering a cost decision" },

    { t: "p", text: "A prompt cache stores the processed state of tokens the server has already seen, so a request whose beginning matches a recent one skips the work of reprocessing it. The discount is on input tokens: **50% on OpenAI, automatic, above a 1,024-token minimum; 90% on Anthropic, with explicit `cache_control` markers**." },

    { t: "p", text: "The critical property is in the word *prefix*. The cache matches from the start of the request and stops at the first difference — so a single variable token at the front invalidates everything behind it." },

    { t: "viz", title: "Why order is the whole game", caption: "The same tokens in two orders. The cache matches from the left and stops at the first difference, so the top arrangement caches 1,000 tokens and the bottom caches none.",
      svg: `<svg viewBox="0 0 760 228" width="100%" role="img" aria-label="Prompt ordering and cache hits">
  <text x="20" y="26" class="s-label" style="fill:var(--good)">cacheable</text>
  <rect x="20" y="36" width="230" height="32" rx="5" style="fill:var(--good)" opacity="0.55"/>
  <rect x="250" y="36" width="270" height="32" rx="0" style="fill:var(--good)" opacity="0.55"/>
  <rect x="520" y="36" width="220" height="32" rx="5" style="fill:var(--warn)" opacity="0.6"/>
  <text x="135" y="57" text-anchor="middle" class="s-sub" style="fill:var(--ink)">system prompt (static)</text>
  <text x="385" y="57" text-anchor="middle" class="s-sub" style="fill:var(--ink)">tools + documents (static)</text>
  <text x="630" y="57" text-anchor="middle" class="s-sub" style="fill:var(--ink)">user query (varies)</text>
  <line x1="20" y1="76" x2="520" y2="76" style="stroke:var(--good)" stroke-width="2"/>
  <text x="270" y="92" text-anchor="middle" class="s-sub" style="fill:var(--good)">1,000 tokens hit the cache</text>

  <text x="20" y="132" class="s-label" style="fill:var(--crit)">not cacheable</text>
  <rect x="20" y="142" width="220" height="32" rx="5" style="fill:var(--warn)" opacity="0.6"/>
  <rect x="240" y="142" width="230" height="32" rx="0" style="fill:var(--good)" opacity="0.55"/>
  <rect x="470" y="142" width="270" height="32" rx="5" style="fill:var(--good)" opacity="0.55"/>
  <text x="130" y="163" text-anchor="middle" class="s-sub" style="fill:var(--ink)">user query (varies)</text>
  <text x="355" y="163" text-anchor="middle" class="s-sub" style="fill:var(--ink)">system prompt (static)</text>
  <text x="605" y="163" text-anchor="middle" class="s-sub" style="fill:var(--ink)">tools + documents (static)</text>
  <line x1="20" y1="182" x2="26" y2="182" style="stroke:var(--crit)" stroke-width="2"/>
  <text x="130" y="198" text-anchor="middle" class="s-sub" style="fill:var(--crit)">0 tokens hit — the first token already differs</text>

  <text x="20" y="220" class="s-sub">Measured below: the difference is $125 per 100,000 requests on a 1,200-token prompt.</text>
</svg>` },

    { t: "code", lang: "python", title: "g18.py — what each discount is worth", code: `REQS, IN_TOK, OUT_TOK = 100_000, 1_200, 300
IN_RATE, OUT_RATE = 2.50, 10.00      # $ per 1M, from 01_LLM_Parameters.md §14
STATIC = 1000                        # tokens of the prompt that never change

base_in  = REQS * IN_TOK  * IN_RATE  / 1e6
base_out = REQS * OUT_TOK * OUT_RATE / 1e6

for label, disc in (("OpenAI auto-cache (50% off input)",   0.5),
                    ("Anthropic cache hit (90% off input)", 0.9)):
    cached_in = REQS * (STATIC * (1 - disc) + (IN_TOK - STATIC)) * IN_RATE / 1e6
    print("%-35s: $%.2f  (saves $%.2f)" % (label, cached_in + base_out, base_in - cached_in))`,
      out: `workload: 100,000 requests, 1200 input + 300 output tokens each
  baseline: $300.00 input + $300.00 output = $600.00

  batch API (50% off both)          : $300.00  (saves $300.00)
  OpenAI auto-cache (50% off input)  : $475.00  (saves $125.00)
  Anthropic cache hit (90% off input): $375.00  (saves $225.00)

  both batch and cache, Anthropic-style : $187.50`,
      hl: [4, 5, 6],
      caption: "One workload, four columns. Batching halves everything; caching only touches input, so its ceiling is the input half of the bill. Together they take $600 to $187.50 — a 69% reduction with no change to the model or the prompt." },

    { t: "callout", kind: "insight", title: "Caching is bounded by the input share of your bill",
      body: [
        { t: "p", text: "In the workload above, input is $300 of a $600 bill, so even a perfect 100% cache discount could not save more than half. The batch discount applies to output too, which is why it beats caching here despite the smaller headline percentage." },
        { t: "p", text: "Which one wins depends on the shape of your traffic. A RAG endpoint with a 20,000-token context and a 200-token answer is almost all input, and caching dominates. A creative-writing feature with a 200-token prompt and a 2,000-token answer is almost all output, and caching is nearly worthless." },
        { t: "p", text: "Work out your own input/output split before choosing where to spend effort. It takes one query against your usage logs and it determines which of these two lessons matters to you." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "ordering", text: "The ordering mistake, priced",
      sub: "What it costs to put the user's question at the top" },

    { t: "code", lang: "python", title: "g18.py — the cost of the wrong order", code: `good = "SYSTEM(1000 static tokens) + DOCS(static) + USER QUERY(variable)"
bad  = "USER QUERY(variable) + SYSTEM(1000 static tokens) + DOCS(static)"`,
      out: `  cacheable  : SYSTEM(1000 static tokens) + DOCS(static) + USER QUERY(variable)
  not        : USER QUERY(variable) + SYSTEM(1000 static tokens) + DOCS(static)
  the cache matches a PREFIX, so one variable token at the front
  invalidates every token behind it. Measured cost of that mistake on the
  workload above: $125.00 per 100,000 requests.`,
      caption: "$125 per hundred thousand requests, on OpenAI's 50% discount. On Anthropic's 90% it is $225. The fix is moving a string." },

    { t: "p", text: "Four things break a cache, and three of them are avoidable:" },

    { t: "ol", items: [
      "**A variable prefix.** The user's query, a timestamp, a request id, a personalised greeting — anything at the front costs you the whole prefix behind it.",
      "**A timestamp in the system prompt.** \"Today is 25 September 2026, 11:24\" is the classic: it changes every minute, it is near the top, and it is almost always unnecessary at that precision. Put the date at the *end* of the static block, or round it to the day.",
      "**Reordered tool definitions.** If your tools come from a dict or a set, their serialisation order can vary between processes. Sort them.",
      "**Non-determinism in serialisation.** A JSON schema dumped with `sort_keys=False` from a dict whose insertion order differs across workers produces a different prefix on every machine."
    ] },

    { t: "code", lang: "python", title: "cacheable.py — a request built for the cache", code: `def build(user_query, docs, *, today):
    return [
        # --- everything below is byte-identical across requests -------------
        {"role": "system", "content": SYSTEM_PROMPT},          # never changes
        {"role": "system", "content": render(sorted(docs, key=lambda d: d.id))},
        {"role": "system", "content": f"Today's date is {today:%Y-%m-%d}."},
        #                              ^ date, not datetime: changes once a day
        # --- and everything below varies ------------------------------------
        {"role": "user", "content": user_query},
    ]`,
      hl: [5, 6],
      caption: "The date is still available to the model, it is just at the bottom of the static block and rounded to a day — so the cache survives until midnight instead of until the next minute." },

    { t: "callout", kind: "tradeoff", title: "When a cache write is not worth it",
      body: [
        { t: "p", text: "Writing to the cache costs about 25% extra on the first request, so the arrangement pays for itself on the **second** hit and is a loss if there is never one." },
        { t: "p", text: "That makes caching a bad fit for genuinely one-off prompts — a long document summarised once and never revisited pays the write premium for nothing. It is an excellent fit for anything with a shared prefix across many requests: a system prompt, a tool catalogue, a schema (1.8), a few-shot block." },
        { t: "p", text: "There is also a lifetime to consider. Caches expire — typically minutes of inactivity — so a low-traffic endpoint may never get a second hit before the entry is evicted. High volume is what makes caching pay, and it is another reason to measure your own traffic before optimising." }
      ] },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find which discount your workload should use",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Batching discounts everything but costs a day of latency. Caching discounts only input and only the static part, but is free and immediate. Which wins is entirely a property of your traffic shape." },
        { t: "p", text: "Build the comparison across a range of workloads and find where the answer changes." }
      ],
      requirements: [
        "Model a workload as (input tokens, static share of the input, output tokens)",
        "Compute the baseline cost, the batch-only cost, and the cache-only cost at both 50% and 90%",
        "Sweep the output/input ratio from 0.05 to 5 and find where caching stops beating batching",
        "Do the same sweep for the static share, at a fixed output/input ratio",
        "State one non-cost reason to choose caching over batching"
      ],
      hint: "Batch saves 50% of (input + output). A 90% cache saves 0.9 × static × input_rate. Set them equal and the crossover falls out, but sweeping makes the shape visible.",
      solution: { lang: "python", title: "g113_ex.py",
        code: `IN_RATE, OUT_RATE = 2.50, 10.00

def costs(in_tok, static_share, out_tok, cache_disc):
    static = in_tok * static_share
    base   = (in_tok * IN_RATE + out_tok * OUT_RATE) / 1e6
    batch  = base * 0.5
    cached = ((static * (1 - cache_disc) + (in_tok - static)) * IN_RATE
              + out_tok * OUT_RATE) / 1e6
    return base, batch, cached

print("static share 0.8, sweeping the output/input ratio:")
print("  %8s %10s %10s %10s %10s" % ("out/in", "base", "batch", "cache50", "cache90"))
for ratio in (0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0):
    in_tok = 2000; out_tok = in_tok * ratio
    b, ba, c5 = costs(in_tok, 0.8, out_tok, 0.5)
    _, _,  c9 = costs(in_tok, 0.8, out_tok, 0.9)
    winner = "cache90" if c9 < ba else "batch"
    print("  %8.2f %10.6f %10.6f %10.6f %10.6f   %s"
          % (ratio, b, ba, c5, c9, winner))

print()
print("output/input 0.15, sweeping the static share:")
print("  %8s %10s %10s %10s" % ("static", "batch", "cache90", "winner"))
for share in (0.2, 0.4, 0.6, 0.8, 0.95):
    b, ba, c9 = costs(2000, share, 300, 0.9)
    print("  %8.2f %10.6f %10.6f   %s"
          % (share, ba, c9, "cache90" if c9 < ba else "batch"))`,
        out: `static share 0.8, sweeping the output/input ratio:
    out/in       base      batch    cache50    cache90
      0.05   0.006000   0.003000   0.004000   0.002400   cache90
      0.10   0.007000   0.003500   0.005000   0.003400   cache90
      0.25   0.010000   0.005000   0.008000   0.006400   batch
      0.50   0.015000   0.007500   0.013000   0.011400   batch
      1.00   0.025000   0.012500   0.023000   0.021400   batch
      2.00   0.045000   0.022500   0.043000   0.041400   batch
      5.00   0.105000   0.052500   0.103000   0.101400   batch

output/input 0.15, sweeping the static share:
    static      batch    cache90     winner
      0.20   0.004000   0.007100   batch
      0.40   0.004000   0.006200   batch
      0.60   0.004000   0.005300   batch
      0.80   0.004000   0.004400   batch
      0.95   0.004000   0.003725   cache90`,
        notes: [
          { t: "p", text: "Caching only wins in a narrow region: a high static share **and** very little output. At 80% static it takes an output/input ratio below about 0.15 before a 90% cache beats batching, and at an output/input ratio of 0.15 it takes a static share above about 0.9. Outside that corner, batching's advantage — that it discounts output too — dominates." },
          { t: "p", text: "That corner is not a rare shape, though: it is exactly a RAG endpoint. A large static system prompt and document block, a short question, a short answer. Which is why caching feels essential to teams building retrieval and irrelevant to teams building writing tools, and both are right about their own traffic." },
          { t: "p", text: "The non-cost reason to prefer caching is latency, and it is often the stronger argument. A cache hit skips prefill for the cached prefix, so it cuts time-to-first-token — which 1.12 measured at 936.5 ms for a 513-token prompt and rising linearly. Batching cannot help with latency at all; it makes it a day. So the honest framing is that these are not competing options: batching is for offline work and caching is for interactive work, and the cost comparison only matters when a workload could genuinely be either." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the cache hit rate that was zero and nobody noticed",
      body: [
        { t: "p", text: "**Symptom.** A support-assistant endpoint had been built carefully for prompt caching: a 3,000-token system prompt with product documentation, deliberately placed first, the user's question last. The expected 50% discount on 3,000 of every 3,400 input tokens never appeared on the bill." },
        { t: "p", text: "**What was in the system prompt.** Line two read: `Current time: 2026-09-25T11:24:16Z`. It had been added months earlier so the assistant could answer \"is support open right now\"." },
        { t: "p", text: "**Mechanism.** The cache matches a prefix. A timestamp with second precision meant the prefix differed on essentially every request, so the match failed at token 12 and the remaining 2,988 tokens of carefully-ordered static content were reprocessed at full price every time. Worse, each request also paid the roughly 25% cache-write premium for an entry nothing would ever match — so the careful arrangement was costing more than no caching at all." },
        { t: "p", text: "**Fix.** The timestamp moved to the end of the static block and was rounded to the day, with the current time supplied through a tool call when it was genuinely needed. Hit rate went from zero to above 90%. The real finding was that nobody had been looking: OpenAI reports `usage.prompt_tokens_details.cached_tokens` on every response and it had been zero since the feature shipped. One line in the logging would have caught it on day one, which is 10.6's argument — a metric you do not record cannot tell you anything, however carefully you designed the thing it measures." }
      ] }
  ],

  takeaways: [
    "The **Batch API** is 50% off both input and output for work that can wait 24 hours. Same models, same quality — the discount is for flexible scheduling.",
    "Batch results come back **unordered, and individual requests can fail** while the batch succeeds. Match on `custom_id`, make it meaningful, and handle the `expired` state.",
    "**Prompt caching discounts a prefix**: 50% on OpenAI (automatic, 1,024-token minimum), 90% on Anthropic (explicit `cache_control`).",
    "Because it is a *prefix* match, **one variable token at the front invalidates everything behind it**. Measured cost of that mistake: $125 per 100,000 requests at 50%, $225 at 90%.",
    "On a 100,000-request workload at 1,200 in / 300 out: baseline **$600**, batch **$300**, OpenAI cache **$475**, Anthropic cache **$375**, both together **$187.50**.",
    "**Caching is bounded by the input share of your bill.** Batch discounts output too, which is why it wins on output-heavy traffic despite the smaller headline number.",
    "Caching beats batching only in a narrow corner — high static share and very little output — which happens to be exactly the shape of a RAG endpoint.",
    "A cache write costs about **25% extra**, so it pays for itself on the second hit and is a loss on a genuinely one-off prompt. Caches also expire, so low traffic may never get a second hit.",
    "The commonest cache-killer is a **timestamp near the top of the system prompt**. Round it to the day and put it at the end of the static block.",
    "**The non-cost argument for caching is latency**: a hit skips prefill, which 1.12 measured at 936.5 ms for a 513-token prompt. Batching makes latency a day, so the two are not really competing."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Your prompt is `[user question][3,000-token system prompt]`. What is your cache hit rate?",
        options: ["Around 88%, since most of the prompt is static", "Effectively zero — the cache matches a prefix and the first token already varies", "50%, the OpenAI discount", "It depends on the question's length"],
        answer: 1,
        why: "A prompt cache matches from the start and stops at the first difference, so a variable user question in front means the match fails immediately and all 3,000 static tokens are reprocessed at full price — and you also pay the roughly 25% write premium for an entry nothing will match. The first option assumes the cache can find static content anywhere in the prompt, which is precisely what a prefix cache cannot do. 50% is the discount on tokens that do hit, not a hit rate. Question length is irrelevant when the mismatch is at token one." },

      { stem: "A workload is 200 input tokens and 2,000 output tokens per request. Which optimisation helps more?",
        options: ["Prompt caching, at 90%", "The Batch API, if the work can wait", "Both equally", "Neither applies to output-heavy work"],
        answer: 1,
        why: "Caching discounts input only, and input is a small fraction of this bill — even a perfect 100% input discount could not touch the 2,000 output tokens that dominate it. Batching takes 50% off both, so on output-heavy traffic it is the only lever of the two that reaches the expensive part. The sweep in the exercise shows caching losing to batching everywhere above an output/input ratio of about 0.15 at an 80% static share. The fourth option is wrong: batching very much applies, provided a day of latency is acceptable." },

      { stem: "Why does a `Current time: 2026-09-25T11:24:16Z` line near the top of a system prompt matter?",
        options: ["It wastes about 12 tokens", "It changes every second, so the cache prefix fails and every later token is reprocessed at full price", "It confuses the model about the date", "It is not cached because timestamps are excluded"],
        answer: 1,
        why: "The cache matches a prefix and stops at the first difference, so a second-precision timestamp at token 12 means the remaining thousands of static tokens miss on every request — plus the roughly 25% write premium for a cache entry nothing will ever match. The token cost of the line itself is trivial by comparison. Nothing about timestamps is excluded from caching; the problem is entirely that the value varies. The model is not confused by the date — it is the cache that is." },

      { stem: "Which of these is NOT a good Batch API candidate?",
        options: ["Nightly summarisation of the day's documents", "Backfilling embeddings across a corpus", "A chat assistant's replies", "A scheduled evaluation run over a golden set"],
        answer: 2,
        why: "The batch window is up to 24 hours, which is not a latency budget for anything a person is waiting on — a chat reply has to arrive in seconds. The other three are offline, deadline-free and run on a schedule, which is exactly the shape the discount exists for. Evaluation runs in particular are easy to overlook: they execute constantly, nobody is waiting on them, and halving their cost halves the cost of measuring everything else." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The reference's Q8 asks about prompt caching. The stronger version of the answer covers why ordering is the whole decision.",
    questions: [
      { level: "core",
        q: "What is prompt caching and how does it work?",
        strong: "A strong answer says prefix, gives both providers' numbers, and draws the ordering conclusion without being prompted.",
        answer: [
          { t: "p", text: "The server stores the processed state of tokens it has already seen, so a request whose beginning matches a recent one skips reprocessing that part. The discount is on input tokens: 50% on OpenAI, automatic above a 1,024-token minimum, and 90% on Anthropic with explicit `cache_control` markers." },
          { t: "p", text: "The word that matters is *prefix*. It matches from the start and stops at the first difference — so ordering is a cost decision. Static content first: system prompt, tool definitions, documents, few-shot examples. Variable content last: the user's query. Put the query at the top and your hit rate is zero, however much static content follows it." },
          { t: "p", text: "I would also mention the write premium: about 25% extra on the first request, so it pays for itself on the second hit and is a loss on a genuinely one-off prompt. And caches expire after minutes of inactivity, so low-traffic endpoints may never get that second hit." }
        ] },

      { level: "core",
        q: "When would you use the Batch API?",
        strong: "A strong answer gives the trade in one line and then names the failure modes that are specific to batches.",
        answer: [
          { t: "p", text: "50% off for accepting a 24-hour window. Same models, same quality — you are being paid to be flexible about when the work runs. So anything offline: nightly summarisation, backfilling embeddings or labels, evaluation runs. Evaluation is the one people forget, and it runs constantly." },
          { t: "p", text: "Not for anything a user is waiting on, obviously, and not for agent loops, where each step depends on the previous result." },
          { t: "p", text: "The part worth adding is that a batch is not a loop with a discount — it has its own failure model. Results come back unordered, individual requests can fail while the batch succeeds, and a batch can expire with work outstanding. So you match on `custom_id` rather than position, you make that id meaningful enough to reconcile against later, and you need a path for partial results that a synchronous pipeline never does." }
        ] },

      { level: "advanced",
        q: "How do you decide between batching and caching for a given workload?",
        strong: "A strong answer notes they discount different things, gives the traffic shape that decides it, and points out they are not really competitors.",
        answer: [
          { t: "p", text: "They discount different parts of the bill, so the answer falls out of your input/output split. Caching touches input only, and only the static share of it. Batching takes 50% off both. So on output-heavy traffic — a writing tool, a long-form generator — batching is the only one of the two that reaches the expensive part." },
          { t: "p", text: "I worked the crossover: at an 80% static share, a 90% cache beats batching only below an output/input ratio of about 0.15. That is a narrow corner — but it is exactly the shape of a RAG endpoint, a big static context and a short question and answer. Which is why caching feels essential to retrieval teams and irrelevant to everyone else, and both are right about their own traffic." },
          { t: "p", text: "The framing I would actually offer is that they are not competing. Batching costs a day of latency; caching *improves* latency, because a hit skips prefill for the cached prefix. So batching is for offline work, caching is for interactive work, and the cost comparison only matters for the rare workload that could genuinely be either — where you can also do both, which on the workload I measured took $600 to $187.50." }
        ] },

      { level: "advanced",
        q: "You designed a prompt for caching and the discount never appeared. How do you debug it?",
        strong: "A strong answer starts with the metric rather than the design, and knows where the metric is.",
        answer: [
          { t: "p", text: "First question: what is the hit rate? OpenAI reports `usage.prompt_tokens_details.cached_tokens` on every response. If nobody is logging it, that is the finding — a carefully designed cache strategy with no instrumentation is indistinguishable from none at all, and I have seen one sit at zero for months." },
          { t: "p", text: "If it is zero, diff two consecutive requests byte for byte and find where they first differ. The usual culprits, in order: a timestamp in the system prompt — a second-precision one kills the cache instantly and is almost always unnecessary at that precision; tool definitions serialised from a dict or set with unstable ordering; a request id or session id that crept into the prefix; and a schema dumped without `sort_keys`." },
          { t: "p", text: "If the prefix is genuinely identical, then it is either below the minimum — 1,024 tokens on OpenAI — or the entries are expiring, which means the endpoint's traffic is too sparse to keep one warm." },
          { t: "p", text: "The thing worth stressing is that a failed cache is worse than no cache: you still pay the roughly 25% write premium on every request, for an entry nothing will ever match. So a broken caching strategy is actively costing money, not merely failing to save it." }
        ] }
    ]
  }
});
