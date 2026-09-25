EC.receiveLesson({
  id: "1.5",

  lede: "Two limits get confused constantly, and confusing them is how a feature ships that works on short inputs and silently truncates on long ones. The **context window** is the total number of tokens a model can attend to — prompt and output together, sharing one budget. **`max_tokens`** caps the output alone. This lesson measures the arithmetic that connects them, shows what truncation looks like from inside the loop, and makes the case that the character-to-token rules of thumb are only true for the one kind of text they were measured on.",

  objectives: [
    "Distinguish the context window from max_tokens and compute how much room a prompt leaves",
    "Count tokens exactly with tiktoken instead of estimating, and say when an estimate is acceptable",
    "Predict how much the 4-characters-per-token rule is wrong by, for code, JSON and identifiers",
    "Read finish_reason and say what the model was doing when generation stopped",
    "Budget a request so that neither the prompt nor the response can overflow"
  ],

  prerequisites: ["1.1"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "one-budget", text: "One budget, two claims on it",
      sub: "context_window = input_tokens + output_tokens" },

    { t: "p", text: "The context window is the number of positions the model can attend over. It is a property of the architecture and the training, and it covers everything: the system prompt, the conversation history, the retrieved documents, the tool definitions, and every token the model generates in reply. `max_tokens` — renamed `max_completion_tokens` on newer OpenAI endpoints — caps only the last of those." },

    { t: "viz", title: "The window, and what claims it", caption: "Everything above the line shares one budget. max_tokens is a cap on the right-hand portion, and it cannot buy space the prompt has already spent.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="Context window split between prompt and output">
  <text x="20" y="28" class="s-label">context window — 128,000 tokens</text>

  <rect x="20" y="42" width="720" height="46" rx="6" class="s-fill-2 s-stroke"/>
  <rect x="22" y="44" width="96" height="42" rx="5" style="fill:var(--violet)" opacity="0.75"/>
  <rect x="118" y="44" width="176" height="42" rx="0" style="fill:var(--accent)" opacity="0.7"/>
  <rect x="294" y="44" width="72" height="42" rx="0" style="fill:var(--warn)" opacity="0.7"/>
  <rect x="366" y="44" width="150" height="42" rx="0" style="fill:var(--good)" opacity="0.55"/>
  <rect x="516" y="44" width="222" height="42" rx="5" class="s-fill-bg"/>

  <text x="70" y="70" text-anchor="middle" class="s-sub" style="fill:var(--ink)">system</text>
  <text x="206" y="70" text-anchor="middle" class="s-sub" style="fill:var(--ink)">retrieved documents</text>
  <text x="330" y="70" text-anchor="middle" class="s-sub" style="fill:var(--ink)">tools</text>
  <text x="441" y="70" text-anchor="middle" class="s-sub" style="fill:var(--ink)">history + query</text>
  <text x="627" y="70" text-anchor="middle" class="s-sub">room left for output</text>

  <line x1="20" y1="100" x2="516" y2="100" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="268" y="118" text-anchor="middle" class="s-mono">input tokens — billed at the input rate, processed in one pass</text>

  <line x1="516" y1="100" x2="740" y2="100" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="628" y="118" text-anchor="middle" class="s-mono">output — one forward pass each</text>

  <rect x="516" y="138" width="110" height="26" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="571" y="155" text-anchor="middle" class="s-sub">max_tokens caps this</text>
  <text x="640" y="155" class="s-sub">— and cannot exceed what is left</text>

  <text x="20" y="192" class="s-sub">Ask for more output than the window has room for and the request is rejected, or the prompt is silently truncated. Which one depends on the provider.</text>
</svg>` },

    { t: "p", text: "The rule that follows is arithmetic: `max_tokens ≤ context_window − input_tokens`. Violate it and one of two things happens, and providers differ on which. Some reject the request. Others truncate the prompt — usually from the middle or the start — and answer anyway, which is worse, because you get a plausible response computed from a document that lost its second half." },

    { t: "code", lang: "python", title: "g13.py — what a real document costs", code: `import tiktoken
enc = tiktoken.get_encoding("cl100k_base")

for name, ctx in (("GPT-4o", 128000), ("GPT-4o-mini", 128000),
                  ("Claude 3.5 Sonnet", 200000), ("Gemini 1.5 Pro", 2000000),
                  ("Llama 3.1", 128000)):
    used = 8000
    print("%-22s %10d %12d %14d" % (name, ctx, used, ctx - used))

doc = "The quick brown fox jumps over the lazy dog. " * 2000
n = len(enc.encode(doc))

print("a %d-character document is %d tokens -- %.1f%% of a 128K window"
      % (len(doc), n, 100.0 * n / 128000))
print("asking for max_tokens=4096 alongside it needs %d of 128000" % (n + 4096))`,
      out: `  model (provider figure)    context  prompt used left for output
  GPT-4o                     128000         8000         120000
  GPT-4o-mini                128000         8000         120000
  Claude 3.5 Sonnet          200000         8000         192000
  Gemini 1.5 Pro            2000000         8000        1992000
  Llama 3.1                  128000         8000         120000

  a 90000-character document is 20001 tokens -- 15.6% of a 128K window
  asking for max_tokens=4096 alongside it needs 24097 of 128000`,
      caption: "Context figures as quoted in 01_LLM_Parameters.md §5, which dates them to 2024–2025 — check them against the provider before relying on them. The document arithmetic is measured here with tiktoken." },

    { t: "callout", kind: "trap", title: "A large window is not an invitation to fill it",
      body: [
        { t: "p", text: "A 2M-token window does not mean a 2M-token prompt is a good idea. Three separate costs rise with prompt length and none of them is capped by the window: you pay per input token; time-to-first-token grows with the prompt because prefill is compute-bound in the prompt length (3.1); and retrieval quality degrades as the number of documents rises, because the model attends less reliably to material in the middle of a long context." },
        { t: "p", text: "The practical rule is that the window is a hard limit, not a target. 11.8 is the lesson about cutting input tokens, and it is the largest cost lever in the course." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "counting", text: "Count, do not estimate",
      sub: "The rules of thumb hold for English prose and nothing else" },

    { t: "p", text: "The reference gives the usual heuristics — 1 token ≈ 4 characters ≈ 0.75 words — and they are reasonable for the text they were measured on. Here is what they do on six other kinds of text." },

    { t: "code", lang: "python", title: "g13.py — tiktoken across six samples", code: `enc  = tiktoken.get_encoding("cl100k_base")      # GPT-4, GPT-3.5
o200 = tiktoken.get_encoding("o200k_base")       # GPT-4o and later

for name, s in samples:
    a, b = len(enc.encode(s)), len(o200.encode(s))
    print("%-14s %6d %8d %8d %9.2f %9.2f"
          % (name, len(s), a, b, len(s) / a, len(s.split()) / a))`,
      out: `  sample          chars   cl100k    o200k chars/tok words/tok
  english prose     270       61       61      4.43      0.89
  hello world        13        4        4      3.25      0.50
  python code       100       32       32      3.12      0.50
  json               72       26       27      2.77      0.31
  uuids             148       76       76      1.95      0.05
  french            236       73       57      3.23      0.49

the reference's claim: 1 token ~ 4 characters (English) ~ 0.75 words
  measured on english prose: 4.43 chars/token, 0.89 words/token
  'Hello, world!' encodes to 4 cl100k tokens: ['Hello', ',', ' world', '!']`,
      hl: [5, 6, 7],
      caption: "English prose measured 4.43 characters per token — close to the rule. JSON measured 2.77 and UUIDs measured 1.95, which is to say the estimate is wrong by a factor of 2.3 on the kind of payload a production system actually sends." },

    { t: "p", text: "Three readings worth taking from that table." },

    { t: "ol", items: [
      "**The rule is right for the case it was measured on and wrong elsewhere.** 4.43 against a claimed 4 is fine. 1.95 for UUIDs is not — a log line full of identifiers costs more than twice what the estimate says, and a retrieval corpus of such lines will overflow a budget you thought had headroom.",
      "**Words per token is the weaker rule.** The reference says 0.75; English prose measured **0.89**, and JSON measured 0.31. The word count of a document tells you very little about what it will cost.",
      "**The tokenizer matters as much as the text.** French took 73 tokens under `cl100k_base` and **57** under `o200k_base` — a 22% reduction for the same text, because the newer vocabulary has more non-English subwords. Estimating with the wrong encoding is a different error from estimating with the wrong rule."
    ] },

    { t: "callout", kind: "good", title: "When an estimate is fine, and when it is not",
      body: [
        { t: "p", text: "**Fine:** sizing a budget in a design document, deciding roughly how many documents fit, capacity planning a month ahead. Being wrong by 30% does not change the decision." },
        { t: "p", text: "**Not fine:** anything that decides whether a request is sent. Truncating a prompt to fit, choosing how many retrieved chunks to include, enforcing a per-user token quota — all of these need the exact count, because the failure mode of a 30% underestimate is a rejected request or a silently truncated document." },
        { t: "p", text: "`tiktoken` runs locally, costs nothing, and takes microseconds. There is no good reason to estimate on the hot path. For non-OpenAI models the equivalent is the model's own tokenizer from HuggingFace, and the counts will differ — 1.14 covers the cross-provider case." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "truncation", text: "What truncation looks like",
      sub: "finish_reason is the only thing that tells you" },

    { t: "p", text: "When output hits `max_tokens` the response stops mid-sentence, and there is nothing in the text that says so — a truncated answer and a short answer look identical. The only signal is `finish_reason`, which is the field most production bugs in this area come from not reading." },

    { t: "table",
      head: ["`finish_reason`", "What happened", "What to do"],
      rows: [
        ["`stop`", "The model emitted an end-of-sequence token, or hit a stop sequence", "Nothing — this is the normal case"],
        ["`length`", "Output hit `max_tokens`, or the window filled", "Retry with a higher cap, or continue from where it stopped"],
        ["`tool_calls`", "The model wants to call a tool and is waiting", "Execute and send the result back (1.9)"],
        ["`content_filter`", "A safety system blocked the response", "Surface it; do not retry blindly (11.13)"]
      ],
      caption: "From 01_LLM_Parameters.md §16.2. The first two are the ones every client must handle; the second is the one that gets skipped." },

    { t: "code", lang: "python", title: "g13.py — the cap, from inside the loop", code: `ids = tok("Write a short poem about the sea.", return_tensors="pt").input_ids

for cap in (5, 15, 40):
    gen = model.generate(ids, max_new_tokens=cap, do_sample=False,
                         pad_token_id=tok.eos_token_id)
    new   = gen[0][ids.shape[1]:]
    ended = int(new[-1].item()) == tok.eos_token_id
    print("max_new_tokens=%-3d produced %2d  finish=%s  %s"
          % (cap, len(new), "stop" if ended else "length", repr(tok.decode(new)[:70])))`,
      out: `  max_new_tokens=5   produced  5  finish=length  '\\n\\nThe poem is'
  max_new_tokens=15  produced 15  finish=length  '\\n\\nThe poem is a short poem about the sea.\\n\\nThe'
  max_new_tokens=40  produced 40  finish=length  '\\n\\nThe poem is a short poem about the sea.\\n\\nThe poem is a short poem ab'`,
      caption: "Three caps, three truncations. At 5 tokens the output is a fragment; at 40 it is a fragment of a loop. In every case `finish_reason` would be `length`, and in no case does the text say so." },

    { t: "p", text: "Note that the model did not \"want\" to stop at any of these points. It was mid-token-sequence and the loop was cut. Which means the right response to `finish_reason == \"length\"` is rarely to show the user what came back: either raise the cap and retry, or continue generation from the truncated point, or tell the user the answer was cut short. Displaying a truncated answer as if it were complete is the bug." },

    { t: "callout", kind: "warn", title: "max_tokens is a cost control, not a length control",
      body: [
        { t: "p", text: "Setting `max_tokens=200` because you want a short answer produces a long answer with the last 80% missing. The model has no knowledge of the cap while generating — it is applied by the server, from outside, and nothing in the prompt tells the model to aim for a length." },
        { t: "p", text: "If you want short output, ask for it in the prompt — and then set `max_tokens` somewhat above what you asked for, as a safety net against a runaway generation. The cap is there to bound the bill and the latency, not to shape the response." },
        { t: "p", text: "For reasoning models the cap is more dangerous still, because `max_completion_tokens` covers the hidden reasoning tokens *and* the visible output. A cap that is too low can consume the entire budget on thinking and return nothing at all. 1.10 measures that." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "budgeting", text: "Budgeting a request so it cannot overflow",
      sub: "Reserve the output first, then fill what is left" },

    { t: "p", text: "The pattern that works is to treat output space as a reservation rather than a remainder. Decide how much output the feature needs, subtract it from the window with a margin, and let the prompt-building code fill whatever is left — dropping the lowest-priority material when it runs out." },

    { t: "code", lang: "python", title: "budget.py", code: `import tiktoken
enc = tiktoken.get_encoding("o200k_base")

def n(text):
    return len(enc.encode(text))

def build_prompt(system, query, chunks, *, window=128_000,
                 reserve_output=2_000, margin=500):
    """Fill the window in priority order, reserving room for the answer first."""
    budget = window - reserve_output - margin - n(system) - n(query)
    if budget < 0:
        raise ValueError(f"system + query alone exceed the budget by {-budget} tokens")

    kept, used = [], 0
    for c in chunks:                       # chunks arrive ranked by relevance
        cost = n(c) + 2                    # the separator costs tokens too
        if used + cost > budget:
            break                          # stop at the first that does not fit
        kept.append(c)
        used += cost

    return system, query, kept, {
        "prompt_tokens": n(system) + n(query) + used,
        "chunks_kept": len(kept),
        "chunks_dropped": len(chunks) - len(kept),
        "output_reserved": reserve_output,
    }`,
      caption: "Three details do the work: the output is reserved before anything else is added; the separator between chunks is counted; and the loop breaks rather than continuing, so a short chunk after a long one cannot jump the queue and reorder your ranking." },

    { t: "p", text: "The `chunks_dropped` figure is the one to log. A retrieval system that silently drops half its context is a retrieval system whose recall measurements no longer describe what the model saw — and that disconnect is behind a large share of \"the retrieval is good but the answers are bad\" investigations. 6.2 and 10.6 both come back to it." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Measure how wrong the rule of thumb is on your own data",
      difficulty: "foundation", minutes: 20,
      body: [
        { t: "p", text: "The 4-characters-per-token rule measured 4.43 on English prose and 1.95 on UUIDs. The interesting question for any real system is where its own traffic sits on that range, and what a budget built on the rule would get wrong." },
        { t: "p", text: "Build the measurement, and express the error as the thing that matters: how many documents you would have fit versus how many actually fit." }
      ],
      requirements: [
        "Assemble at least five text samples of different kinds — prose, code, JSON, a log line, a table",
        "For each, report exact tokens, the 4-chars-per-token estimate, and the error as a percentage",
        "For each, compute how many copies the estimate says fit in a 128,000-token window, and how many actually fit",
        "Report the sample where the estimate is most optimistic",
        "State in one line why an optimistic estimate is worse than a pessimistic one"
      ],
      hint: "An estimate that is too low is the dangerous direction: it tells you a document fits when it does not. Compute `exact / estimate` and look for values above 1.",
      solution: { lang: "python", title: "g15_ex.py",
        code: `import tiktoken
enc = tiktoken.get_encoding("o200k_base")
WINDOW = 128_000

SAMPLES = {
    "prose":  "The quick brown fox jumps over the lazy dog. " * 6,
    "code":   "def apply_tax(amount: float, rate: float = 0.08) -> float:\\n"
              "    return round(amount * (1 + rate), 2)\\n",
    "json":   '{"user_id": 12345, "name": "Ada Lovelace", "roles": ["admin", "editor"]}',
    "logline":"2026-09-25T11:24:16Z ERROR req=550e8400-e29b-41d4-a716-446655440000 "
              "svc=checkout latency_ms=1841 status=503",
    "table":  "| id | name | price |\\n|----|------|-------|\\n| 1 | widget | 9.99 |\\n",
}

print("%-9s %6s %8s %10s %9s %9s %9s"
      % ("sample", "chars", "exact", "estimate", "error", "fit(est)", "fit(real)"))
worst = None
for name, s in SAMPLES.items():
    exact = len(enc.encode(s))
    est   = round(len(s) / 4)
    err   = 100.0 * (exact - est) / est
    fe, fr = WINDOW // est, WINDOW // exact
    print("%-9s %6d %8d %10d %8.1f%% %9d %9d"
          % (name, len(s), exact, est, err, fe, fr))
    if worst is None or err > worst[1]:
        worst = (name, err, fe, fr)

print()
print("most optimistic estimate: %s, off by %.1f%%" % (worst[0], worst[1]))
print("  the estimate promises %d copies fit; %d actually do" % (worst[2], worst[3]))`,
        out: `sample     chars    exact   estimate     error  fit(est) fit(real)
prose        270       61         68    -10.3%      1882      2098
code         100       32         25     28.0%      5120      4000
json          72       27         18     50.0%      7111      4740
logline      107       45         27     66.7%      4740      2844
table         66       25         16     56.2%      8000      5120

most optimistic estimate: logline, off by 66.7%
  the estimate promises 4740 copies fit; 2844 actually do`,
        notes: [
          { t: "p", text: "Prose is the only sample where the estimate is pessimistic — it over-counts by 10%, which is harmless. Every other sample goes the other way, and the log line is off by 66.7%: the estimate promises 4,740 of them fit in the window and only 2,844 do. A UUID, a timestamp and an ISO-8601 string are all dense in tokens and sparse in characters, so a log line is close to the worst case for the rule — and it is exactly the content a retrieval corpus over infrastructure data is made of." },
          { t: "p", text: "The direction is what makes this dangerous rather than merely inaccurate. A pessimistic estimate wastes some window; an optimistic one builds a prompt that does not fit, and the failure surfaces as a rejected request or — worse, depending on the provider — a silently truncated one. You find out in production, on the long inputs, which are the ones you tested least." },
          { t: "p", text: "Note also that the exact counts here come from `o200k_base`. A system talking to two providers has two tokenizers and two answers, and neither is authoritative for the other. If you enforce a budget, enforce it with the tokenizer of the model you are about to call — which means the budget code has to know which model it is building for." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the report generator that lost its conclusions",
      body: [
        { t: "p", text: "**Symptom.** A tool generated quarterly summaries from a set of retrieved documents. Users reported that reports for the largest accounts — and only those — ended abruptly, often mid-sentence, and never contained the recommendations section that the prompt explicitly asked for last." },
        { t: "p", text: "**Configuration.** `max_tokens=4000`, a 128K window, and a retrieval step that pulled \"as many relevant chunks as we find\" with no cap. Nobody was reading `finish_reason`." },
        { t: "p", text: "**Mechanism.** Two failures compounding. Large accounts had more documents, so the prompt grew; on the largest it exceeded the window and the provider truncated it from the middle — removing documents but not the instruction to produce recommendations. Then, because the surviving prompt was still enormous, the response ran to the 4,000-token cap and stopped, with `finish_reason` set to `length` and nobody looking. The recommendations were last in the requested structure, so they were always the part that fell off the end." },
        { t: "p", text: "**Fix.** The budgeting pattern from §04 — reserve the output first, fill the rest in ranked order, log `chunks_dropped` — plus a hard branch on `finish_reason`: if it is `length`, retry once with double the cap, and if it is still `length`, return an explicit error rather than a partial report. The measurement that had been missing all along: `chunks_dropped` was non-zero on 11% of requests and nobody had ever seen the number, because it was not computed." }
      ] }
  ],

  takeaways: [
    "The **context window** covers prompt and output together. `max_tokens` caps the output only, and cannot buy space the prompt has already spent: `max_tokens ≤ window − input_tokens`.",
    "Providers differ on what happens when you overflow — some reject the request, some silently truncate the prompt and answer anyway. The second is worse, because the answer looks fine.",
    "**Count with a tokenizer; do not estimate on the hot path.** `tiktoken` runs locally in microseconds.",
    "The 4-characters-per-token rule measured **4.43** on English prose — and **2.77** on JSON and **1.95** on UUIDs, which is wrong by a factor of 2.3 on the payloads production systems actually send.",
    "The words-per-token rule is weaker still: the reference says 0.75, English prose measured **0.89**, and JSON measured 0.31.",
    "**The tokenizer matters as much as the text.** The same French sentence took 73 tokens under `cl100k_base` and **57** under `o200k_base` — 22% fewer, for the same characters.",
    "A truncated response and a short response are textually identical. **`finish_reason` is the only signal**, and `length` means the answer was cut, not finished.",
    "`max_tokens` is a cost and latency control, not a length control — the model does not know the cap exists. Ask for brevity in the prompt and set the cap above it as a safety net.",
    "Reserve output space before building the prompt, and log how many chunks got dropped. A retrieval system that silently drops context invalidates its own recall measurements."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A model has a 128,000-token window. Your prompt is 100,000 tokens. What is the largest `max_tokens` you can set?",
        options: ["128,000 — max_tokens is independent of the prompt", "28,000, minus a margin", "100,000", "4,096, the usual default cap"],
        answer: 1,
        why: "The window is shared, so the room left for output is `window − input_tokens` = 28,000, and you want a margin below that because token counts can shift with templating and tool definitions. The first option is the confusion the lesson is about: `max_tokens` cannot claim space the prompt has already spent. The third has no basis. The fourth mistakes a provider's default value for a limit — defaults are conventions, not constraints, and several models will happily return far more." },

      { stem: "You estimate a document's cost at 4 characters per token. For which content is that estimate most dangerously wrong?",
        options: ["English prose, where it over-counts slightly", "A log line full of UUIDs, where the real count is about twice the estimate", "A short sentence, where the absolute error is small", "Any content — the rule is equally wrong everywhere"],
        answer: 1,
        why: "UUIDs measured 1.95 characters per token against the assumed 4, so the estimate is roughly half the real cost — and it errs in the optimistic direction, telling you a payload fits when it does not. English prose measured 4.43, which over-counts by about 10% and merely wastes a little window. The third option is true but irrelevant: short inputs are not where budgets fail. The fourth is contradicted by the measured spread of 1.95 to 4.43 across content types." },

      { stem: "A response comes back with `finish_reason: \"length\"`. What does that tell you?",
        options: ["The model finished its answer and stopped naturally", "The output was cut off at max_tokens or the window limit, mid-answer", "The prompt was too long and was truncated", "The response was blocked by a content filter"],
        answer: 1,
        why: "`length` means the generation loop was stopped from outside — the model had not emitted an end-of-sequence token and was mid-answer, as the measured truncations at 5, 15 and 40 tokens all show. `stop` is the natural-completion case, so the first option names the wrong value. Prompt truncation is a separate thing that happens before generation and is not reported through `finish_reason` at all. A blocked response returns `content_filter`." },

      { stem: "You want responses of about two sentences. What is the right way to get them?",
        options: ["Set max_tokens=60", "Ask for two sentences in the prompt, and set max_tokens well above that as a safety net", "Set max_tokens=60 and lower the temperature", "Use a stop sequence at the second full stop"],
        answer: 1,
        why: "The model has no knowledge of `max_tokens` while generating — the cap is applied by the server from outside — so using it to shape length produces a longer answer with the end missing, not a shorter answer. Only the prompt can tell the model to aim for a length. The third option adds an irrelevant parameter; temperature affects which tokens are chosen, not how many. The fourth is closer to workable but fragile: full stops appear in abbreviations and decimals, and 1.6 shows that a stop sequence truncates server-side after the tokens are already generated and billed." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "This is the area where a candidate's production experience shows most quickly, because the failures are quiet.",
    questions: [
      { level: "core",
        q: "What is the difference between the context window and max_tokens?",
        strong: "A strong answer states the shared budget, gives the inequality, and names what happens on overflow — including that providers differ.",
        answer: [
          { t: "p", text: "The context window is the total number of tokens the model can attend over, and it covers everything: system prompt, history, retrieved documents, tool definitions, and the generated output. `max_tokens` caps only the output. So they are not two independent limits — `max_tokens` has to fit in `window − input_tokens`." },
          { t: "p", text: "The part worth adding is what happens when you violate that. Some providers reject the request, which is the good case because you find out. Others truncate the prompt and answer anyway, usually from the middle, and you get a confident response computed from a document that lost its second half. That failure does not look like a failure anywhere in your logs." },
          { t: "p", text: "Which is why I would build prompts by reserving the output space first and then filling what is left in priority order, logging how much got dropped." }
        ] },

      { level: "core",
        q: "How do you estimate token counts?",
        strong: "The right answer is that you do not estimate where it matters. A strong answer says when an estimate is acceptable and has a number for how wrong the rule of thumb gets.",
        answer: [
          { t: "p", text: "For anything on the request path, I count exactly with the model's tokenizer — `tiktoken` for OpenAI, the HuggingFace tokenizer otherwise. It runs locally and costs microseconds, so there is no reason to guess where the answer decides whether a request is sent." },
          { t: "p", text: "The rules of thumb are fine for capacity planning and for a design document. But they are calibrated on English prose: I measured 4.43 characters per token on prose, 2.77 on JSON and 1.95 on a string of UUIDs. That last one is wrong by more than a factor of two, and it errs optimistically — it tells you a payload fits when it does not." },
          { t: "p", text: "The other thing I would mention is that the tokenizer is part of the answer, not just the text. The same French sentence took 73 tokens under `cl100k_base` and 57 under `o200k_base`. If a system talks to two providers, it has two budgets, and the code enforcing them has to know which model it is building for." }
        ] },

      { level: "advanced",
        q: "Reports for your largest customers are coming back truncated. Walk me through the diagnosis.",
        strong: "A strong answer separates the two independent truncations — prompt and output — checks the cheap signal first, and ends with an instrumentation change rather than only a config change.",
        answer: [
          { t: "p", text: "First question: what is `finish_reason` on the failing requests? If it is `length`, the output hit the cap and the fix is immediate — raise it, or continue from where it stopped. That takes a minute and rules in or out half the problem space." },
          { t: "p", text: "Second, independently: is the *prompt* fitting? Largest customers means most documents, which means the longest prompts, which is exactly the population where the window runs out. If the provider truncates rather than rejecting, nothing in the response says so — so I would compute the prompt's token count client-side and compare it against the window before sending, on the failing cases." },
          { t: "p", text: "The two compound in a way worth naming: a prompt truncated from the middle loses documents but keeps the instruction at the end, so the model still tries to produce a section it no longer has evidence for. Then the answer runs long and hits the output cap, and the section that falls off is whichever one the prompt asked for last." },
          { t: "p", text: "The fix I would push for is not only the config. It is that `prompt_tokens`, `finish_reason` and a `chunks_dropped` counter all get logged on every request, so this is a dashboard question next time instead of an investigation. In the case I have in mind, chunks were being dropped on 11% of requests and nobody had ever seen the number because it was never computed." }
        ] },

      { level: "advanced",
        q: "A product manager asks why you cannot just use the 2M-token window and stop building retrieval.",
        strong: "A strong answer gives three independent costs rather than one, and does not pretend the idea is stupid — it is a reasonable question with a quantitative answer.",
        answer: [
          { t: "p", text: "It is a fair question and the answer is that the window is a limit, not a target, and three separate costs rise with prompt length. You pay per input token, so a 2M-token prompt at typical rates is a few dollars per request before the model has said anything." },
          { t: "p", text: "Second, latency. Prefill is compute-bound in the prompt length, so time-to-first-token grows with it — the user waits, and on a 2M prompt they wait a long time. That is 3.1, and it is the cost people forget because it does not appear on the bill." },
          { t: "p", text: "Third, quality. Attention over a very long context is not uniform; material in the middle is attended to less reliably than material at either end. So the naive version of the idea — put everything in and let the model find it — degrades precisely as the context grows, which is the opposite of what the proposal assumes." },
          { t: "p", text: "The honest version of the answer is that large windows change *where* retrieval sits rather than removing it: fewer, larger chunks, less aggressive filtering, and prompt caching (1.13) to amortise the cost of a long static prefix. It is a real simplification, just not the total one." }
        ] }
    ]
  }
});
