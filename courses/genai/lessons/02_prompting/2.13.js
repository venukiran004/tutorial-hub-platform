EC.receiveLesson({
  id: "2.13",

  lede: "1.13 measured what prompt caching is worth and what ordering mistake forfeits it. This lesson is the prompting side: how to *write* a prompt so the cache can hold it, which is a constraint on structure rather than on wording, and which conflicts with several habits that are otherwise good. A cacheable prompt is one whose first thousand tokens are byte-identical across requests — and personalisation, timestamps and dynamic examples all break that.",

  objectives: [
    "Structure a prompt so a cache prefix survives across requests",
    "Identify the four common constructions that silently break a cache",
    "Resolve the conflict between caching and dynamic few-shot selection",
    "Apply the other token-reduction levers the reference lists, in order of effect",
    "Verify a cache is hitting rather than assuming it"
  ],

  prerequisites: ["1.13", "2.2"],

  blocks: [

    { t: "h2", n: "01", id: "structure", text: "Structure is the constraint, not wording",
      sub: "Static first, variable last, and nothing in between" },

    { t: "p", text: "A prompt cache matches a prefix. That turns prompt *layout* into a cost decision, and it is the only place in this module where the order of your sections matters more than their content." },

    { t: "code", lang: "python", title: "layout.py — the cacheable shape", code: `messages = [
    # ---- static, byte-identical on every request ------------------------
    {"role": "system", "content": SYSTEM_PROMPT},          # never changes
    {"role": "system", "content": FEW_SHOT_BLOCK},         # fixed examples (2.2)
    {"role": "system", "content": render(TOOLS)},          # sorted, stable (1.9)
    {"role": "system", "content": SCHEMA_DESCRIPTION},     # fixed (1.8)
    {"role": "system", "content": f"Today is {today:%Y-%m-%d}."},

    # ---- everything below varies ----------------------------------------
    *conversation_history,
    {"role": "user", "content": user_query},
]`,
      hl: [7, 10],
      caption: "The date is at the bottom of the static block and rounded to a day, so the prefix survives until midnight rather than until the next minute. Everything above that line is identical across every request the endpoint serves." },

    { t: "callout", kind: "trap", title: "Four constructions that silently break the prefix",
      body: [
        { t: "p", text: "**A timestamp with more precision than you need.** A current time with seconds in a system prompt changes every second. This is the commonest cache-killer and it is usually there to answer a question a tool could answer instead." },
        { t: "p", text: "**Personalisation near the top.** Naming the user and their plan reads like context and is variable, so it invalidates everything behind it. Move it below the static block — the model reads it just as well from there." },
        { t: "p", text: "**Unstable serialisation.** Tool definitions or a schema dumped from a dict whose insertion order varies between worker processes produce a different prefix on different machines. Sort, and pass `sort_keys=True`." },
        { t: "p", text: "**Dynamic few-shot examples.** Retrieved per query (2.2), they are variable by design — and if they sit above the system prompt, nothing caches at all. Section 03 is about resolving this one, because unlike the others it is a genuine trade rather than a mistake." }
      ] },

    { t: "h2", n: "02", id: "verify", text: "Verify the cache is hitting",
      sub: "A designed cache and a working cache are different things" },

    { t: "p", text: "1.13's incident was a carefully-ordered 3,000-token prompt with a hit rate of zero for months, because of one timestamp. The reason it lasted months is that nobody logged the one field that would have said so." },

    { t: "code", lang: "python", title: "verify.py", code: `r = client.chat.completions.create(model=MODEL, messages=messages)

cached = r.usage.prompt_tokens_details.cached_tokens      # OpenAI
total  = r.usage.prompt_tokens

log.info("cache", extra={
    "cached_tokens": cached,
    "prompt_tokens": total,
    "hit_rate": cached / total if total else 0.0,
})

# And an assertion in the test suite, which is what stops it regressing:
def test_prefix_is_stable():
    a = build_messages(user_query="first question",  user=USER_A)
    b = build_messages(user_query="second question", user=USER_B)
    assert prefix_bytes(a)[:4000] == prefix_bytes(b)[:4000]`,
      hl: [12, 13, 14, 15],
      caption: "The test is the durable half. A hit-rate metric tells you when it broke; an assertion on prefix stability stops it breaking, and it runs without calling a model at all." },

    { t: "callout", kind: "warn", title: "A broken cache costs more than no cache",
      body: [
        { t: "p", text: "Writing to the cache costs roughly 25% extra on the tokens being cached. If the prefix never matches, you pay that premium on every request for an entry nothing will ever read." },
        { t: "p", text: "So a caching strategy that does not work is not neutral — it is actively more expensive than not having tried. Which makes the hit-rate metric the first thing to add, not the last." }
      ] },

    { t: "h2", n: "03", id: "conflict", text: "Caching against dynamic examples",
      sub: "A real trade, and it has a middle" },

    { t: "p", text: "2.2 argued for retrieving examples per query where a task has many sub-cases. 1.13 argued for a byte-identical prefix. These conflict directly, and the resolution is not to pick one." },

    { t: "table",
      head: ["Layout", "What caches", "When to use it"],
      rows: [
        ["Dynamic examples first", "Nothing", "Never — this is the accident, not a choice"],
        ["Static system, then dynamic examples, then query", "The system prompt only", "The default. Keeps the large static block cached and pays full price for the examples"],
        ["Static system, static examples, then query", "Everything but the query", "When a fixed example set is nearly as good — measure before assuming it is not"],
        ["Two-tier: cached core examples plus a few retrieved", "The core set", "The middle. Most of the example budget caches; the tail adapts"]
      ],
      caption: "The fourth row is the one people miss. A fixed core of five examples covering the common cases, plus two retrieved for the specific query, keeps the majority of the example tokens in the cached prefix." },

    { t: "h2", n: "04", id: "other-levers", text: "The other levers, in order of effect",
      sub: "The reference lists eight; they are not equal" },

    { t: "table",
      head: ["Lever", "Typical effect", "Where it is covered"],
      rows: [
        ["Use a smaller model for simple tasks", "**Up to 16.7×** (1.14's measured ratio)", "11.9 — routing"],
        ["Batch non-urgent work", "**50%**, both input and output", "1.13"],
        ["Prompt caching", "50–90% **of the cached input portion**", "1.13, this lesson"],
        ["Compress context before including it", "Varies; large on RAG workloads", "11.8"],
        ["Semantic caching of whole responses", "Large where queries repeat", "5.13"],
        ["Shorter prompts", "Proportional, and usually small", "This lesson"],
        ["Reduce `max_tokens` to expected length", "Bounds the worst case only", "1.5"],
        ["Streaming", "**Zero** — same cost, better perceived latency", "1.12"]
      ],
      caption: "From the reference notes section 13. The last row is listed there as a cost strategy and is not one — 1.12 measured that streaming costs exactly the same, and only aborting saves anything." },

    { t: "p", text: "The ordering matters because effort spent on row six — trimming words from a prompt — is effort not spent on rows one and two, which are an order of magnitude larger. A 20% shorter system prompt on a workload that should have been batched is a rounding error on a bill that could have been halved." },

    { t: "callout", kind: "good", title: "Where shortening the prompt is genuinely worth it",
      body: [
        { t: "p", text: "**When it is re-sent constantly.** A system prompt on a ten-turn conversation is sent ten times; in an agent loop it is sent once per step (2.5's quadratic). Tokens there are multiplied by a number that is not one." },
        { t: "p", text: "**When it is not cacheable.** If the prefix genuinely varies, every token is paid at full price every time, and trimming is the only lever left." },
        { t: "p", text: "**When it improves the prompt.** The exercise in 1.8 found 28.6% of a schema was redundant `title` keys. Removing material that carries no information makes the prompt better *and* cheaper, and that is a different thing from compressing a prompt that was doing work." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Find the layout that minimises cost",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "The caching-versus-dynamic-examples trade has four layouts and the right one depends on the relative sizes of the blocks. It is arithmetic rather than judgement." },
        { t: "p", text: "Model all four and find where each wins." }
      ],
      requirements: [
        "Model a request as a static system block, an examples block, and a variable query",
        "Implement the four layouts from section 03, computing cached and uncached tokens for each",
        "Sweep the ratio of static to example tokens from 10:1 down to 1:10",
        "Report which layout is cheapest at each ratio, at a 90% cache discount",
        "State what the model ignores that would matter in practice"
      ],
      hint: "Only the contiguous prefix before the first variable byte caches. In the two-tier layout, the core examples are part of that prefix and the retrieved ones are not.",
      solution: { lang: "python", title: "g213_ex.py",
        code: `RATE, DISCOUNT = 2.50, 0.90        # $/1M input, Anthropic-style cache
QUERY, TOTAL = 200, 3300           # variable query; static + examples budget

def cost(cached, uncached):
    return (cached * (1 - DISCOUNT) + uncached) * RATE / 1e6

for static in (3000, 2400, 1650, 900, 300):
    ex = TOTAL - static

    a = cost(0, static + ex + QUERY)                       # dynamic examples first
    b = cost(static, ex + QUERY)                           # static, dynamic ex, query
    c = cost(static + ex, QUERY)                           # all examples static
    core = int(ex * 0.7)                                   # two-tier: 70% cached core
    d = cost(static + core, (ex - core) + QUERY)

    names = ["dyn-first", "static-1st", "all-static", "two-tier"]
    vals  = [a, b, c, d]
    print("%8d %8d %12.6f %12.6f %12.6f %12.6f   %s"
          % (static, ex, a, b, c, d, names[vals.index(min(vals))]))`,
        out: `  static examples    dyn-first   static-1st   all-static     two-tier   winner
    3000      300     0.008750     0.002000     0.001325     0.001527   all-static
    2400      900     0.008750     0.003350     0.001325     0.001932   all-static
    1650     1650     0.008750     0.005038     0.001325     0.002439   all-static
     900     2400     0.008750     0.006725     0.001325     0.002945   all-static
     300     3000     0.008750     0.008075     0.001325     0.003350   all-static`,
        notes: [
          { t: "p", text: "All-static wins at every ratio and it is not close. The reason is structural rather than about the numbers: it is the only layout where the variable content is a 200-token query rather than a 3,000-token example block, so it is the only one where almost everything caches. **Anything you can put in the prefix, you should** — the only question is whether fixed examples are good enough for the task." },
          { t: "p", text: "The bottom row is where layout matters most. When examples dominate 10:1, putting them first costs 0.008750 and putting them in the prefix costs 0.001325 — a **6.6× difference from layout alone**, with byte-identical content. Note also that the static-first layout at that ratio is 0.008075, barely better than caching nothing: when the static block is small, protecting it buys almost nothing." },
          { t: "p", text: "What the model ignores is the thing that actually decides it: **whether dynamic examples are more accurate**. This says all-static is 2.5× cheaper than two-tier; it says nothing about whether retrieved examples lift accuracy enough to justify that. 2.2's measurement is the other half, and the honest order is to establish the accuracy difference first — if dynamic selection is worth five points, a 2.5× difference on the input portion may well be worth paying." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the personalisation line that cost $40,000 a year",
      body: [
        { t: "p", text: "**Symptom.** A support assistant's costs rose about 35% over a quarter with no change in traffic, no model change and no prompt-length change that anyone could find. The prompt was 4,200 tokens and had been built deliberately for caching." },
        { t: "p", text: "**The change.** A product ticket had added one line to improve tone, naming the customer and their plan and signup year. It was placed at the top of the system prompt, which is where context about the user obviously belongs." },
        { t: "p", text: "**Mechanism.** The line is variable per user, and it was the *first* thing in the prompt — so the cache prefix failed at token 8 and all 4,200 tokens were reprocessed at full price on every request, plus the roughly 25% write premium for an entry nothing would match. The hit rate went from 94% to 0 and nobody was alerted because the dashboard tracked spend, not hit rate, and a 35% rise over a quarter looked like growth." },
        { t: "p", text: "**Fix.** The line moved below the static block — three positions down in a list, no wording change — and the hit rate returned to 94%. Annualised, the one line had been costing about $40,000. Two durable changes came out of it: `cached_tokens` is now logged and alerted on, and there is a unit test asserting that two requests from different users share their first 4,000 bytes. That test costs nothing to run, needs no model, and would have failed in the pull request that introduced the line." }
      ] }
  ],

  takeaways: [
    "**Prompt layout is a cost decision.** A cache matches a prefix, so static content goes first and variable content last, with nothing in between.",
    "Four constructions break the prefix silently: an over-precise **timestamp**, **personalisation near the top**, **unstable serialisation** of tools or schemas, and **dynamic few-shot examples**.",
    "The first three are mistakes. The fourth is a genuine trade, and it has a middle — a **cached core of examples plus a few retrieved** keeps most of the example tokens in the prefix.",
    "**A broken cache costs more than no cache**, because you still pay the ~25% write premium on every request for an entry nothing reads.",
    "Log `prompt_tokens_details.cached_tokens` from day one, and **assert prefix stability in a test** — it runs without calling a model and catches the regression in the pull request.",
    "Measured across four layouts, **all-static wins at every ratio** — it is the only one whose variable portion is a short query rather than a large example block.",
    "When examples dominate 10:1, layout alone is a **6.6× difference** on the input portion with byte-identical content.",
    "That arithmetic says nothing about **accuracy**, which is what decides it. Establish the accuracy difference first, then consult the cost table.",
    "The eight cost levers are not equal: **a smaller model is up to 16.7×, batching is 50%, shortening prompts is proportional and usually small** — and streaming is listed as a cost lever and is not one (1.12).",
    "Shortening a prompt is genuinely worth it when it is re-sent constantly, when the prefix cannot cache, or when the material carried no information in the first place."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You add a line naming the user and their plan to the top of a 4,200-token system prompt. What happens?",
        options: ["About 8 tokens are added to each request", "The cache prefix fails immediately and all 4,200 tokens are reprocessed at full price, plus the write premium", "Nothing — the cache matches on content, not position", "Only the personalised line is uncached"],
        answer: 1,
        why: "A prefix cache matches from the start and stops at the first difference, so a variable line at position one invalidates everything behind it — and you continue paying the roughly 25% write premium for cache entries nothing will ever match. The third option describes a cache that can find static content anywhere, which is precisely what a prefix cache cannot do. Moving the same line below the static block costs nothing and restores the hit rate." },

      { stem: "Your examples block is 3,000 tokens and your system prompt is 300. What does layout buy you?",
        options: ["Very little — the static block is too small to protect", "A 6.6× difference on input cost, if the examples can go in the cached prefix", "Nothing, since examples must be dynamic", "It only matters above 10,000 tokens"],
        answer: 1,
        why: "Measured at that ratio: examples-first costs 0.008750 and all-static costs 0.001325, a 6.6× difference from layout alone with identical content. The first option is true of the static-first layout specifically — at 0.008075 it is barely better than caching nothing, because protecting a 300-token block is not worth much — but all-static protects the examples too. Whether the examples *can* be static is an accuracy question (2.2), not a layout one." },

      { stem: "Which of the cost levers is not a cost lever?",
        options: ["Prompt caching", "Batching", "Streaming", "Using a smaller model"],
        answer: 2,
        why: "Streaming costs exactly the same tokens at the same rates — 1.12 measured that it changes when the first token arrives, not what the response costs — and the only case where it saves money is aborting, which is a separate decision. The other three are real and large: a smaller model is up to 16.7× on the price table, batching is 50% on both input and output, and caching is 50–90% of the cached input portion." },

      { stem: "Your cache hit rate has been zero for three months. What is the cheapest way to have caught it?",
        options: ["Reviewing the prompt more carefully", "A unit test asserting that two requests from different users share their first N bytes", "Monitoring total spend", "Asking the provider"],
        answer: 1,
        why: "The assertion runs without calling a model, costs nothing, and would fail in the pull request that introduced the variable line — where a prompt review demonstrably did not catch it, since the line looked like context in the obvious place for context. Total spend is the metric that failed in the incident: a 35% rise over a quarter reads as growth. `cached_tokens` should also be logged, but that detects the problem after shipping rather than before." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The Q6 on cost optimisation. A strong answer orders the levers by size rather than listing them.",
    questions: [
      { level: "core",
        q: "How do you optimise LLM costs?",
        strong: "A strong answer orders the levers by effect and does not spend time on the small ones.",
        answer: [
          { t: "p", text: "In order of size. Route to a smaller model where the task allows it — on the price table that is up to 16.7× and it dwarfs everything else. Batch anything that can wait a day, which is 50% on both input and output. Then prompt caching, which is 50 to 90% of whatever portion of the input is cacheable." },
          { t: "p", text: "After that the returns fall off quickly: compressing retrieved context, semantic caching of whole responses, and finally shortening prompts, which is proportional and usually small." },
          { t: "p", text: "One thing I would correct if it came up: streaming is often listed as a cost optimisation and it is not. Same tokens, same rates — it changes when the first token arrives, and the only saving is if you abort, which is a separate decision." }
        ] },

      { level: "advanced",
        q: "How do you write a prompt so caching actually works?",
        strong: "A strong answer treats it as a structural constraint and knows the specific things that break it.",
        answer: [
          { t: "p", text: "Static content first, variable content last, nothing in between — because the cache matches a prefix and stops at the first difference. That makes layout a cost decision rather than a tidiness one. I measured one workload where layout alone was a 6.6× difference on the input portion, with byte-identical content." },
          { t: "p", text: "The things that break it are specific and all look reasonable when you write them. An over-precise timestamp in the system prompt, which changes every second. Personalisation at the top, because that is where context about the user obviously goes. Tool definitions serialised from an unsorted dict, which differ between worker processes. And dynamic few-shot examples, which are variable by design." },
          { t: "p", text: "I have seen one personalisation line at the top of a 4,200-token prompt cost about $40,000 a year — the prefix failed at token 8, the hit rate went from 94% to zero, and nobody noticed because the dashboard tracked spend rather than hit rate, and a 35% rise over a quarter read as growth." },
          { t: "p", text: "So two things beyond the layout: log `cached_tokens` and alert on it, and write a unit test asserting that two requests from different users share their first few thousand bytes. That test needs no model, costs nothing, and fails in the pull request rather than on the invoice." }
        ] },

      { level: "core",
        q: "When is shortening a prompt worth the effort?",
        strong: "A strong answer distinguishes multiplied tokens from one-off ones, and removing waste from compressing work.",
        answer: [
          { t: "p", text: "When the tokens are multiplied by something. A system prompt on a ten-turn conversation is sent ten times; in an agent loop it is sent once per step, and 2.5 measured that as quadratic in the step count. Tokens there are worth far more than tokens in a single-shot call." },
          { t: "p", text: "Also when the prefix genuinely cannot cache — then every token is full price every time and trimming is the only lever left." },
          { t: "p", text: "The distinction I would draw is between removing waste and compressing work. Stripping redundant schema `title` keys was 28.6% of a schema for zero information loss, and that makes the prompt better and cheaper. Compressing instructions that were doing something is a quality trade, and it should be measured like one rather than assumed free." }
        ] }
    ]
  }
});
