EC.receiveLesson({
  id: "1.10",

  lede: "Reasoning models spend tokens thinking before they answer. Those tokens are generated, billed as output, counted against your completion limit — and never shown to you. That combination makes them the one parameter in this module where a misconfiguration does not degrade the answer but removes it entirely: set the cap too low and the model spends the whole budget reasoning and returns nothing at all, having charged you for it. This lesson carries the arithmetic through and works out when the spend is worth it.",

  objectives: [
    "Explain what reasoning tokens are and which limits they count against",
    "Compute the cost of a reasoning call from the visible output and the reasoning ratio",
    "Predict what happens when max_completion_tokens is set too low for a reasoning model",
    "Choose between a reasoning model and a prompted chain of thought on the evidence",
    "Set reasoning_effort from the task rather than from the default"
  ],

  prerequisites: ["1.5"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "what-they-are", text: "Tokens you pay for and never see",
      sub: "Generated, billed, capped — and absent from the response" },

    { t: "p", text: "A reasoning model — o1, o3, o4-mini and their equivalents elsewhere — generates a chain of thought internally before producing the answer. Mechanically these are ordinary output tokens: each one costs a forward pass, each one is billed at the output rate. What is different is that they are stripped from the response, so you pay for text you cannot read." },

    { t: "viz", title: "Where the budget goes", caption: "Both bars are the same request. The reference's own example is 500 reasoning tokens for 50 visible ones — 90.9% of what you pay for is removed before the response reaches you.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="Reasoning tokens against visible output">
  <text x="20" y="28" class="s-label">what you are billed for</text>
  <rect x="20" y="38" width="654" height="34" rx="5" style="fill:var(--violet)" opacity="0.7"/>
  <rect x="674" y="38" width="66" height="34" rx="5" style="fill:var(--good)" opacity="0.8"/>
  <text x="347" y="60" text-anchor="middle" class="s-label" style="fill:var(--ink)">500 reasoning tokens — hidden</text>
  <text x="707" y="60" text-anchor="middle" class="s-sub" style="fill:var(--ink)">50 visible</text>

  <text x="20" y="108" class="s-label">what you receive</text>
  <rect x="20" y="118" width="66" height="34" rx="5" style="fill:var(--good)" opacity="0.8"/>
  <rect x="86" y="118" width="654" height="34" rx="5" class="s-fill-bg s-stroke" stroke-dasharray="4 3"/>
  <text x="53" y="140" text-anchor="middle" class="s-sub" style="fill:var(--ink)">50</text>
  <text x="413" y="140" text-anchor="middle" class="s-sub">nothing — the reasoning is stripped from the response</text>

  <text x="20" y="184" class="s-sub" style="fill:var(--crit)">max_completion_tokens caps BOTH bars together. Set it to 400 here and the</text>
  <text x="20" y="200" class="s-sub" style="fill:var(--crit)">budget is exhausted before the answer starts: you are billed 400 and receive nothing.</text>
</svg>` },

    { t: "table",
      head: ["Property", "Reasoning tokens", "Visible output tokens"],
      rows: [
        ["Cost a forward pass each", "yes", "yes"],
        ["Billed at the output rate", "yes", "yes"],
        ["Count against `max_completion_tokens`", "yes", "yes"],
        ["Appear in `usage.completion_tokens`", "yes", "yes"],
        ["Appear in the message content", "**no**", "yes"],
        ["Can be inspected or debugged", "**no**", "yes"]
      ],
      caption: "Every row is identical except the last two, and those two are what make the parameter awkward: the dominant cost of the request is invisible to the thing you would use to understand it." },

    { t: "callout", kind: "trap", title: "The cap can consume the entire budget on thinking",
      body: [
        { t: "p", text: "On a normal model, `max_tokens=400` gives you 400 tokens of answer, possibly truncated. On a reasoning model, `max_completion_tokens=400` gives you *up to* 400 tokens of thinking and whatever is left over for the answer — and if the thinking uses all 400, the answer is empty." },
        { t: "p", text: "The response comes back with `finish_reason: \"length\"`, content of `\"\"` or `None`, and a bill for 400 output tokens. It is not an error and nothing raises. Code that reads `response.choices[0].message.content` without checking gets an empty string and carries on." },
        { t: "p", text: "The defence is the same as 1.5's: branch on `finish_reason`. The difference here is that a reasoning model needs a much larger cap than intuition suggests — the reference puts the reasoning at 10–100× the visible output, so a 200-token answer may need a cap of several thousand." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "the-arithmetic", text: "What it costs, carried through",
      sub: "The multiplier is on the output rate, which is the expensive one" },

    { t: "code", lang: "python", title: "g18.py — the reference's example and its neighbours", code: `print("the reference's example: 500 reasoning + 50 visible")
print("  billed output tokens : 550")
print("  visible to the user  : 50")
print("  paid-for-but-unseen  : %.1f%%" % (100.0 * 500 / 550))

for r, v in ((0, 500), (500, 50), (2000, 200), (10000, 400)):
    print("reasoning %5d + visible %4d = %5d billed -> $%.5f per call, $%.2f per 10k"
          % (r, v, r + v, (r + v) * 10 / 1_000_000, (r + v) * 10 / 1_000_000 * 10000))`,
      out: `the reference's example: 500 reasoning + 50 visible
  billed output tokens : 550
  visible to the user  : 50
  paid-for-but-unseen  : 90.9%

at $10 per 1M output tokens (GPT-4o rate):
  reasoning     0 + visible  500 =   500 billed -> $0.00500 per call, $50.00 per 10k calls
  reasoning   500 + visible   50 =   550 billed -> $0.00550 per call, $55.00 per 10k calls
  reasoning  2000 + visible  200 =  2200 billed -> $0.02200 per call, $220.00 per 10k calls
  reasoning 10000 + visible  400 = 10400 billed -> $0.10400 per call, $1040.00 per 10k calls`,
      caption: "The rate used is GPT-4o's $10 per million output tokens, quoted in 01_LLM_Parameters.md §14 and dated there to 2024. Reasoning models are priced higher still, so these are floors rather than estimates." },

    { t: "p", text: "The reference puts the reasoning at 10–100× the visible output. Applying that range to a fixed 200-token answer gives the spread that matters for capacity planning:" },

    { t: "code", lang: "python", title: "g18.py — the quoted range, applied", code: `for mult in (10, 50, 100):
    total = 200 * mult + 200
    print("a 200-token answer at %3dx reasoning = %5d billed tokens, $%.4f at $10/1M"
          % (mult, total, total * 10 / 1_000_000))`,
      out: `  a 200-token answer at  10x reasoning =  2200 billed tokens, $0.0220 at $10/1M
  a 200-token answer at  50x reasoning = 10200 billed tokens, $0.1020 at $10/1M
  a 200-token answer at 100x reasoning = 20200 billed tokens, $0.2020 at $10/1M`,
      caption: "The same visible answer costs between 2.2¢ and 20.2¢ depending on how hard the model decided to think — and you do not control which, beyond `reasoning_effort`." },

    { t: "callout", kind: "insight", title: "The variance is the planning problem, not the mean",
      body: [
        { t: "p", text: "A tenfold spread in cost for the same visible output means the per-request cost of a reasoning feature is not a number, it is a distribution — and one you cannot see the shape of until you have run real traffic through it." },
        { t: "p", text: "The practical consequence is that you cannot price a reasoning feature from a handful of test calls. Easy inputs think briefly; the hard ones that motivated using a reasoning model in the first place think for a long time, and those are exactly the ones a small test set under-represents." },
        { t: "p", text: "Log `usage.completion_tokens_details.reasoning_tokens` from the first day. It is the only way to find out what the distribution actually is, and 11.7 is the lesson about decomposing a bill you did not predict." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "effort", text: "reasoning_effort, and the choice it is really making",
      sub: "Three settings, and the question they answer" },

    { t: "p", text: "`reasoning_effort` takes `\"low\"`, `\"medium\"` or `\"high\"` and controls roughly how many reasoning tokens the model is willing to spend. It is not a quality dial in the sense of making answers better — it is a dial on how much compute the model is permitted to apply at inference time, which is only useful on problems where more compute helps." },

    { t: "table",
      head: ["Task", "Effort", "Why"],
      rows: [
        ["Extraction, classification, formatting", "Do not use a reasoning model at all", "There is no search to do — a cheap non-reasoning model is faster and 100× cheaper"],
        ["Multi-step arithmetic, straightforward logic", "`low`", "The steps are known; the model needs to execute them, not find them"],
        ["Debugging, planning, non-obvious proofs", "`medium` to `high`", "There is a genuine search over approaches, which is what the extra tokens buy"],
        ["Anything latency-sensitive", "Reconsider entirely", "Thinking time is wall-clock time; a 10,000-token reasoning trace is seconds of silence"]
      ],
      caption: "The first row is the important one. Most requests routed to a reasoning model do not need one, and the cost difference is large enough that routing is worth building (11.9)." },

    { t: "p", text: "The comparison people expect to be close — a reasoning model against a normal model with chain-of-thought prompting — is genuinely close for some tasks and not others. The honest framing is that they are the same idea implemented at different layers: prompted CoT spends visible tokens you can read and debug, while a reasoning model spends hidden tokens that were trained for the purpose. 2.3 covers the prompted version, and 7.9 covers what test-time compute is doing underneath both." },

    { t: "callout", kind: "tradeoff", title: "Reasoning model or chain-of-thought prompt",
      body: [
        { t: "p", text: "**Prompted CoT gives you the trace.** The reasoning is in the response, so you can read it, log it, and show it to a user who asks why. When an answer is wrong you can see where it went wrong — which is most of what debugging an LLM feature consists of." },
        { t: "p", text: "**A reasoning model gives you a trace trained for the job.** It is generally better at genuinely hard problems, and it does not consume your prompt budget or clutter the output with working." },
        { t: "p", text: "**The cost comparison is not obvious.** Prompted CoT also generates the tokens, so it is not free — the difference is that you see them and they are usually fewer. A reasoning model at 100× on a short answer will lose badly on cost to a good CoT prompt." },
        { t: "p", text: "The decision rule: if you need to explain the answer, use prompted CoT. If the task is genuinely hard and the explanation does not matter, use a reasoning model. If neither is true, use neither." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "handling", text: "Handling a reasoning response properly",
      sub: "Three branches, and the empty one is the interesting one" },

    { t: "code", lang: "python", title: "reasoning.py", code: `def ask(question, *, effort="medium", cap=8000):
    r = client.chat.completions.create(
        model="o4-mini",
        messages=[{"role": "user", "content": question}],
        reasoning_effort=effort,
        max_completion_tokens=cap,          # covers reasoning AND the answer
    )
    choice = r.choices[0]
    usage  = r.usage
    think  = usage.completion_tokens_details.reasoning_tokens

    # log this from day one -- it is the only view of the hidden cost
    log.info("reasoning=%d visible=%d ratio=%.1fx finish=%s",
             think, usage.completion_tokens - think,
             think / max(usage.completion_tokens - think, 1),
             choice.finish_reason)

    if choice.finish_reason == "length" and not choice.message.content:
        # the budget was spent entirely on thinking -- retry with more room,
        # or drop to a lower effort, but do NOT return an empty answer
        raise BudgetExhausted(f"{think} reasoning tokens, no answer, cap={cap}")

    if choice.finish_reason == "length":
        raise Truncated("answer started but was cut")     # 1.5

    return choice.message.content`,
      hl: [17, 18, 19, 20],
      caption: "The distinguishing check is `finish_reason == \"length\"` *and* empty content. That is the reasoning-specific failure, and it is silent unless you look for it." },

    { t: "p", text: "Note that raising on the empty case is deliberate. The alternative — returning `\"\"` and letting the caller decide — pushes an invisible failure into code that has no way to recognise it, and the symptom surfaces much later as a blank field in a UI or a record with a missing summary." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the cap where a reasoning model starts returning nothing",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A reasoning model spends its budget on thinking first. There is therefore a cap below which the answer cannot start — and it depends on how much the model chooses to think, which varies by input." },
        { t: "p", text: "Model the failure and work out what margin a production cap needs, given a distribution of reasoning lengths." }
      ],
      requirements: [
        "Model reasoning length as a distribution: use the reference's 10-100x range over a 200-token answer",
        "For caps from 1,000 to 25,000, compute the fraction of requests that would return an empty answer",
        "Report the cap needed for a 99% success rate, and for 99.9%",
        "Report the cost of that cap's worth of tokens at $10 per 1M, in the worst case",
        "State in one line why sizing the cap on the mean is the wrong approach"
      ],
      hint: "A request fails when `reasoning_tokens >= cap`, because the answer never starts. Sample the multiplier log-uniformly over 10–100 so the range is covered evenly in orders of magnitude.",
      solution: { lang: "python", title: "g110_ex.py",
        code: `import random

random.seed(0)
ANSWER = 200
N = 200_000

# the reference quotes 10-100x; log-uniform covers that range evenly
samples = [int(ANSWER * 10 ** random.uniform(1, 2)) for _ in range(N)]

print("reasoning tokens: min %d  median %d  p99 %d  max %d"
      % (min(samples), sorted(samples)[N // 2],
         sorted(samples)[int(N * 0.99)], max(samples)))
print()
print("%8s %14s %14s" % ("cap", "empty answers", "success rate"))
for cap in (1000, 2000, 4000, 8000, 16000, 25000):
    empty = sum(1 for s in samples if s >= cap)
    print("%8d %13.2f%% %13.2f%%" % (cap, 100 * empty / N, 100 * (1 - empty / N)))

ordered = sorted(samples)
for target in (0.99, 0.999):
    need = ordered[int(N * target)] + ANSWER
    print()
    print("for %.1f%% success you need a cap of %d tokens" % (100 * target, need))
    print("  worst-case cost of one such call at $10/1M output: $%.4f"
          % (need * 10 / 1_000_000))`,
        out: `reasoning tokens: min 2000  median 6313  p99 19542  max 19999

     cap  empty answers   success rate
    1000        100.00%          0.00%
    2000        100.00%          0.00%
    4000         69.79%         30.21%
    8000         39.74%         60.26%
   16000          9.74%         90.26%
   25000          0.00%        100.00%

for 99.0% success you need a cap of 19742 tokens
  worst-case cost of one such call at $10/1M output: $0.1974

for 99.9% success you need a cap of 20152 tokens
  worst-case cost of one such call at $10/1M output: $0.2015`,
        notes: [
          { t: "p", text: "The median reasoning length is 6,313 tokens and a cap set there fails almost exactly half the time — which is the point of the exercise. Sizing a cap on the mean or median of a long-tailed distribution guarantees that roughly half of requests fall on the wrong side of it, and the failure is silent: an empty answer and a full bill." },
          { t: "p", text: "The gap between the 99% and 99.9% caps is tiny here — 19,742 against 20,152 — because the assumed distribution has a hard ceiling at 100×. Real traffic does not, so on real data expect that gap to be much wider and the tail to be the thing that sets your cap. That is why you log `reasoning_tokens` from the first day rather than modelling it." },
          { t: "p", text: "The last number is the one to take to a planning conversation: a cap generous enough to almost never fail permits a call costing about 20¢ in output tokens alone. The cap is not a cost control — it is a failure bound, and the cost control is choosing not to send easy requests to a reasoning model at all." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the summaries that were silently blank for a week",
      body: [
        { t: "p", text: "**Symptom.** A document-analysis feature moved from GPT-4o to o4-mini to improve quality on complex contracts. Quality did improve. A week later, an audit found that 8% of processed documents had an empty `summary` field in the database. No errors had been logged and no alerts had fired." },
        { t: "p", text: "**Configuration.** The migration had kept the existing `max_tokens=1500`, renamed to `max_completion_tokens` because the endpoint required it. Nobody re-examined the value, because on the old model 1,500 had been generous for a 300-token summary." },
        { t: "p", text: "**Mechanism.** On a reasoning model the cap covers reasoning and answer together. Complex contracts — exactly the population the migration was for — provoked long reasoning traces, and on 8% of them the trace consumed all 1,500 tokens before the summary began. The API returned `finish_reason: \"length\"` with empty content, billed for 1,500 output tokens, and raised nothing. The ingestion code read `.message.content` and wrote the empty string to the database." },
        { t: "p", text: "**Fix.** The cap went to 16,000 and the handler now raises on `finish_reason == \"length\"` with empty content, retrying once at `reasoning_effort=\"low\"` before failing loudly. Two durable lessons. The first is that migrating between model *classes* invalidates every parameter, not just the ones that were renamed — 12.6 is the playbook. The second is that the worst production failures are the ones that look like success: a model returning nothing, billed in full, is invisible to every metric except the one that checks whether the field is empty." }
      ] }
  ],

  takeaways: [
    "Reasoning tokens are **generated, billed at the output rate, counted against `max_completion_tokens`, and stripped from the response**. They are ordinary output tokens you cannot read.",
    "The reference's example is 500 reasoning tokens for 50 visible ones — **90.9% of the bill is invisible**.",
    "`max_completion_tokens` covers reasoning and answer **together**, so a cap that is too low produces an empty answer with `finish_reason: \"length\"` and a full charge. Nothing raises.",
    "At the reference's quoted 10–100× ratio, a 200-token answer costs between **2,200 and 20,200 billed tokens** — 2.2¢ to 20.2¢ at $10 per million.",
    "**The variance is the planning problem.** A tenfold spread means per-request cost is a distribution, and the hard inputs that justified the reasoning model are the ones a small test set under-represents.",
    "Log `usage.completion_tokens_details.reasoning_tokens` from day one — it is the only view of the dominant cost.",
    "`reasoning_effort` controls inference-time compute, which only helps where there is a genuine search. For extraction, classification and formatting, **do not use a reasoning model at all**.",
    "Prompted chain-of-thought gives you a readable trace; a reasoning model gives you a trace trained for the job. Use CoT when you must explain the answer, a reasoning model when the task is hard and the explanation does not matter.",
    "Sizing the cap on the median fails on more than half of requests — in the modelled distribution the median was 6,313 tokens and 99% success needed **19,742**.",
    "The cap is a **failure bound, not a cost control**. The cost control is not sending easy requests to a reasoning model."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You set `max_completion_tokens=400` on a reasoning model and the response content is empty. What happened?",
        options: ["The request failed and should be retried identically", "Reasoning consumed the whole 400-token budget before the answer began; you are billed for all 400", "The model had nothing to say", "The content filter removed the response"],
        answer: 1,
        why: "The cap covers reasoning and answer together, and reasoning goes first — so a cap below the reasoning length leaves nothing for the answer, and the response arrives with `finish_reason: \"length\"`, empty content, and a charge for every token generated. The first option would retry into the same wall, since the failure is deterministic in the cap. The third mistakes an exhausted budget for a model with no answer. A content filter returns `finish_reason: \"content_filter\"`, which is a different and distinguishable case." },

      { stem: "At the reference's 10–100× ratio, what does a 200-token visible answer cost in billed output tokens?",
        options: ["200, since only visible tokens are billed", "Between 2,200 and 20,200", "Exactly 2,200", "Between 210 and 300"],
        answer: 1,
        why: "Reasoning tokens are billed as output, so the total is `200 × multiplier + 200` — 2,200 at 10× and 20,200 at 100×, a tenfold spread for identical visible output. The first option is the misconception the whole lesson addresses: hidden does not mean free. The third picks one end of the range as if the multiplier were fixed, and it is not something you control beyond `reasoning_effort`. The fourth treats reasoning as a small overhead rather than the dominant term." },

      { stem: "For which task is a reasoning model the wrong choice?",
        options: ["Debugging a subtle concurrency bug", "Extracting five fields from an invoice", "Planning a multi-step migration", "A non-obvious mathematical proof"],
        answer: 1,
        why: "Extraction has no search to perform — the fields are present and the task is to read them out — so additional inference-time compute buys nothing while costing 10–100× in output tokens and adding seconds of latency. The other three involve genuine search over approaches, which is exactly what the reasoning tokens are spent on. The practical consequence is that routing matters: most requests sent to a reasoning model do not need one, and a cheap model handles them faster and far cheaper." },

      { stem: "You model reasoning length and find a median of 6,313 tokens. What cap do you set?",
        options: ["6,313, the median", "Around 20,000, sized on the tail, and log the real distribution from day one", "1,500, as on the previous model", "As low as possible to control cost"],
        answer: 1,
        why: "Sizing on the median means roughly half of requests exceed it, and exceeding it produces an empty answer and a full bill rather than a slightly shorter answer — so the cap has to be sized on the tail, which in the modelled distribution needed 19,742 tokens for 99% success. Carrying over the previous model's value is exactly the migration failure in §04, where a 1,500 cap left 8% of documents with empty summaries for a week. The fourth option treats the cap as a cost control, but it is a failure bound: lowering it converts expensive successes into equally expensive failures." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The reference's Q3. The answer that stands out is the one that treats the cap as a failure mode rather than a cost setting.",
    questions: [
      { level: "core",
        q: "What are reasoning tokens and how do they affect cost?",
        strong: "A strong answer states that they are billed output tokens you cannot see, gives the ratio, and names the cap interaction without being asked.",
        answer: [
          { t: "p", text: "They are chain-of-thought tokens a reasoning model generates internally before the visible answer. Mechanically they are ordinary output tokens — a forward pass each, billed at the output rate — and then they are stripped from the response. So you pay for text you cannot read." },
          { t: "p", text: "The ratio is the headline: the reference quotes 10–100× the visible output, and its worked example is 500 reasoning tokens for 50 visible, so 90.9% of the bill is invisible. On a 200-token answer that is somewhere between 2,200 and 20,200 billed tokens depending on how hard the model decided to think." },
          { t: "p", text: "And the part I would volunteer, because it is the one that actually bites: `max_completion_tokens` covers reasoning and answer together. Set it too low and the reasoning consumes the entire budget, the answer never starts, and you get empty content with `finish_reason: \"length\"` and a full charge. Nothing raises." }
        ] },

      { level: "advanced",
        q: "How would you price a feature built on a reasoning model?",
        strong: "A strong answer treats per-request cost as a distribution rather than a number, and says why a small test set will mislead.",
        answer: [
          { t: "p", text: "I would not price it from test calls, because the per-request cost is a distribution rather than a number — a tenfold spread for identical visible output, and I do not control where in that range any given request lands." },
          { t: "p", text: "The problem with a small test set is directional. Easy inputs think briefly; the genuinely hard inputs that justified using a reasoning model think for a long time, and those are exactly the cases a hand-assembled test set under-represents. So an estimate from twenty test calls is biased low, systematically." },
          { t: "p", text: "What I would do instead: log `usage.completion_tokens_details.reasoning_tokens` on every call from the first day, run real traffic through it behind a flag, and price from the p95 rather than the mean. And I would separately measure how many of those requests actually needed a reasoning model, because in my experience most do not — and routing the easy ones to a cheap model is a larger saving than anything else on the table." }
        ] },

      { level: "advanced",
        q: "When would you use a reasoning model over chain-of-thought prompting?",
        strong: "A strong answer notes they are the same idea at different layers, and decides on whether the trace is needed.",
        answer: [
          { t: "p", text: "They are the same idea implemented at different layers — spend more compute at inference to get a better answer. Prompted CoT spends visible tokens; a reasoning model spends hidden tokens that were trained for the purpose." },
          { t: "p", text: "So the decision turns on whether you need the trace. Prompted CoT puts the reasoning in the response, which means you can log it, read it when an answer is wrong, and show it to a user who asks why. That is most of what debugging an LLM feature consists of, and it is a real advantage." },
          { t: "p", text: "A reasoning model is better on genuinely hard problems and does not clutter the output with working. But it is opaque by construction, and the cost comparison is not obvious in its favour — prompted CoT generates tokens too, usually fewer, and you can see them." },
          { t: "p", text: "My rule: if the answer has to be explainable, prompted CoT. If the task is hard and the explanation does not matter, a reasoning model. If neither holds, neither — which covers most extraction and classification work, where extra inference compute buys nothing at all." }
        ] },

      { level: "advanced",
        q: "A team migrated from GPT-4o to o4-mini and 8% of records came back with an empty field. Diagnose it.",
        strong: "A strong answer reaches the cap interaction quickly and then generalises to what a model-class migration invalidates.",
        answer: [
          { t: "p", text: "First guess, and I would check it immediately: the cap. On the old model `max_tokens` bounded the answer; on a reasoning model `max_completion_tokens` bounds reasoning plus answer. If they carried the old value over — which is the natural thing to do when the parameter has merely been renamed — then long reasoning traces exhaust it before the answer starts." },
          { t: "p", text: "The 8% figure supports it. The failures would cluster on the hardest inputs, because those are the ones that provoke the longest traces — and those are precisely the population the migration was undertaken for. So the feature failed worst on exactly the cases it was meant to improve." },
          { t: "p", text: "Confirming it takes one query: on the failing records, was `finish_reason` `length` with empty content, and what was `reasoning_tokens`? If the reasoning count equals the cap, that is the whole answer." },
          { t: "p", text: "The generalisation is what I would want the team to take away. Migrating between model *classes* invalidates every parameter, not only the renamed ones — caps, temperature, penalties, the chat template. And the failure was silent because an empty string is not an exception: any metric that does not explicitly check for a blank field reports full success. That is worth a check in the ingestion path regardless of which model is behind it." }
        ] }
    ]
  }
});
