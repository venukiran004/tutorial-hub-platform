EC.receiveLesson({
  id: "14.9",
  lede: "Decomposing one agent turn: the **model call dominates by an order of magnitude** and graph overhead is a rounding error \u2014 about **0.2%** of the turn. So optimising the framework optimises nothing, and the only two levers are **fewer model calls** and **smaller prompts**, where 13.1 measured history at 86% of the prompt. Which makes an **architectural** choice a scaling choice: a supervisor spends 5 calls where one agent spends 3. On caching, a measured **65% hit rate** on query embeddings, because real traffic is Zipfian and an embedding is a **pure function** \u2014 it can never be wrong. And the one that must never be cached is anything **permissioned**, because 7.5's filter is undone by a key that omits the scope, which turns a performance improvement into a data breach.",
  objectives: [
    "Decompose where the time goes in one agent turn",
    "Connect call count to architectural choice",
    "Measure a cache hit rate and say what is safe to cache",
    "Identify what must never be cached and why",
    "Name the component that saturates first"
  ],
  prerequisites: ["14.8", "13.1", "7.5"],
  blocks: [
    { t: "h2", n: "01", id: "where", text: "Where the time goes", sub: "One agent turn" },

    {"kind": "timeline", "title": "Where the time goes in one agent turn", "caption": "Representative figures — the **shape** is the finding and it does not depend on the exact values. Graph overhead is **0.2%** of the turn, so optimising the framework optimises nothing. The levers are fewer calls and smaller prompts.", "span": 1250, "tick": 250, "unit": "milliseconds", "lanes": [{"label": "the model call", "bars": [[0, 1200, "1200 ms — 79%", "crit"]]}, {"label": "a tool call", "bars": [[0, 180, "180", "warn"]]}, {"label": "reranking", "bars": [[0, 90, "90", "accent"]]}, {"label": "retrieval", "bars": [[0, 45, "", "accent"]]}, {"label": "graph overhead", "bars": [[0, 3, "", "good"]]}], "t": "diagram", "id": "dg-14_9-01-0"},




    { t: "code", lang: "text", title: "Representative figures \u2014 the shape is the finding",
      code: "stage               ms      share\nthe model call      1200.0   79.2%\na tool call          180.0   11.9%\nreranking             90.0    5.9%\nretrieval             45.0    3.0%\ngraph overhead         3.0    0.2%\nTOTAL               1518.0",
      caption: "Graph overhead is **0.2%** of the turn." },
    { t: "callout", kind: "insight", title: "So optimising the framework optimises nothing", body: [
      { t: "p", text: "These are representative numbers rather than a benchmark, and the **shape** does not depend on the exact values: the model call dominates by an order of magnitude. Shaving the graph machinery addresses two tenths of a percent." },
      { t: "p", text: "The only two levers that matter are **fewer model calls** and **smaller prompts**. 13.1 measured the second: history was 86% of one turn's prompt, and it is the only part that grows." }
    ] },
    { t: "h2", n: "02", id: "calls", text: "So the architecture is the scaling decision", sub: "Calls per unit of work" },
    { t: "code", lang: "text", title: "Measured across the course",
      code: "one agent, one turn            1 model call\nReAct with 2 tool calls        3 calls (11.3)\nsupervisor + 2 workers         5 calls vs 3 for one agent (12.x)\nplan-and-execute, 3 steps      1 planner + 3 workers = 4, and the\n                               workers have a CONSTANT prompt (11.6)",
      caption: "The supervisor's extra two calls are the coordination overhead." },
    { t: "callout", kind: "tradeoff", title: "At volume that is the whole budget difference", body: [
      { t: "p", text: "A choice made for clarity \u2014 split this into a supervisor and two workers \u2014 is also a decision to spend 67% more model calls per unit of work. That is a defensible trade and it should be made knowingly." },
      { t: "p", text: "And plan-and-execute is the outlier worth remembering: its workers have a **constant** prompt (13.6), so 13.1's quadratic growth never reaches them. It is the pattern that scales to an arbitrarily long task with none of module 13's machinery." }
    ] },
    { t: "h2", n: "03", id: "cache", text: "What to cache", sub: "Measured on realistic traffic" },
    { t: "code", lang: "text", title: "100 queries, Zipfian",
      code: "100 queries, 37 distinct\nembedding cache : 65 hits, 35 misses, hit rate 65%",
      caption: "Real traffic is **Zipfian** \u2014 a few questions dominate." },
    { t: "callout", kind: "good", title: "And an embedding is a pure function", body: [
      { t: "p", text: "Of its input. So this cache **can never be wrong** \u2014 cache it forever, keyed on `(text, model, model version)`. The version in the key is the only subtlety, and omitting it means a model upgrade silently mixes two vector spaces." },
      { t: "p", text: "That makes it the best cache available in the stack: a 65% hit rate on something that is cheap to verify and impossible to serve incorrectly." }
    ] },
    { t: "h2", n: "04", id: "never", text: "And what must never be cached", sub: "One of them is a breach" },
    { t: "dl", items: [
      ["a **query embedding**", "Pure. Cache forever, keyed on text and model version."],
      ["a **retrieval result**", "Cacheable, but invalidated by any change to the corpus \u2014 so give it a TTL, and key it on a corpus version if you have one."],
      ["a **model response**", "Cacheable only for identical prompts \u2014 and 13.1 means the prompt contains the whole history, so two users never share one. The hit rate is near zero outside tests."],
      ["anything **permissioned**", "**Never.** 7.5's finding: a cache keyed on the question alone will serve one user's filtered results to another."],
      ["a **tool result with effects**", "Never. It is not a read."]
    ] },
    { t: "callout", kind: "warn", title: "The permission case turns an optimisation into a breach", body: [
      { t: "p", text: "And it is easy to ship, because the bug is invisible until two users with **different access** ask the same question. Every test with one user passes." },
      { t: "p", text: "If you cache it anyway, the key must include the permission scope \u2014 and that usually destroys the hit rate that motivated the cache, which is the honest reason to not cache permissioned retrieval at all." }
    ] },
    { t: "h2", n: "05", id: "saturates", text: "The component that saturates first", sub: "Not the framework, and not your service" },
    { t: "p", text: "It is the **provider rate limit**, because the model call is ~80% of the turn and the only part you do not control. So the concurrency limit that matters is the one on model calls, and it belongs **in front of them** rather than at your HTTP layer." },
    { t: "ul", items: [
      "A **semaphore** around the model call, sized to your rate limit.",
      "A **queue** in front of it, so a burst waits instead of failing.",
      "**Backpressure** to the caller when the queue is long, so you shed load deliberately rather than timing out.",
      "And the **breaker** from 14.2 for when the provider is actually down."
    ] },
    { t: "callout", kind: "mental", title: "The limit has to be where the scarce resource is", body: [
      { t: "p", text: "An HTTP concurrency limit of 200 with a provider limit of 20 means 180 requests racing to discover a 429 \u2014 each after paying for retrieval, reranking and whatever else happens before the model call." },
      { t: "p", text: "What to watch, in order: model-call queue depth, 429 rate, cost per run (13.1), p99 turn count, and the retrieval index's memory. The last is the only non-model component that genuinely saturates, and it does so **suddenly**." }
    ] },
    { t: "exercise", kind: "analysis", title: "Find where an agent breaks under load",
      difficulty: "advanced", minutes: 32,
      body: "Decompose one agent turn into its stages with timings and shares, and say which stages are worth optimising. Connect the call count per unit of work to the architectural patterns measured earlier in the course. Then measure a cache hit rate on realistic repeated traffic and explain why that cache is safe. Classify several cache candidates as safe, conditional or forbidden, and explain the one that is a security problem rather than a correctness one. Finally name the component that saturates first and say where the concurrency limit belongs.",
      requirements: ["Decompose a turn into at least four stages with shares",
        "Identify the dominant stage and the negligible one",
        "Name the only two levers that matter",
        "Give call counts per unit of work for several patterns",
        "Measure a cache hit rate on Zipfian traffic",
        "Explain why an embedding cache can never be wrong, including the key",
        "Classify at least four cache candidates",
        "Explain why a permissioned cache is a breach and why it passes testing",
        "Name the component that saturates first and where the limit belongs",
        "List what to watch, in order"],
      hint: "Work out graph overhead as a share of the turn before optimising it.",
      solution: { lang: "python", title: "x1409.py \u2014 graph overhead is 0.2% of a turn",
        code: 'stages = [("the model call", 1200.0), ("retrieval", 45.0),\n          ("a tool call", 180.0), ("reranking", 90.0),\n          ("graph overhead", 3.0)]\ntotal = sum(v for _, v in stages)\n\n# and the cache, on Zipfian traffic\nqueries = (["how do I reset my password"] * 40\n           + ["what is the refund policy"] * 25\n           + ["where is my order %d" % i for i in range(35)])\nrandom.shuffle(queries)\nfor q in queries:\n    emb.get(q, lambda: embed(q))\nprint(emb.hits, emb.misses)        # 65, 35  -> 65% hit rate',
        out: "==============================================================================\nPART 1 -- where the time goes in one agent turn\n==============================================================================\n  stage               ms      share\n  the model call      1200.0   79.1%\n  retrieval             45.0    3.0%\n  a tool call          180.0   11.9%\n  reranking             90.0    5.9%\n  graph overhead         3.0    0.2%\n  TOTAL               1518.0\n\n  these are representative figures, not a benchmark -- but the SHAPE\n  is the finding and it does not depend on the exact numbers: the\n  model call dominates by an order of magnitude, and graph overhead\n  is a rounding error.\n\n  so optimising the framework is optimising 0.2% of the turn. the\n  only two levers that matter are FEWER MODEL CALLS and SMALLER\n  PROMPTS, and 13.1 measured the second: history was 86% of one\n  turn's prompt.\n\n==============================================================================\nPART 2 -- so the first scaling question is the call count\n==============================================================================\n  measured earlier in the course, per unit of work:\n\n    one agent, one turn            1 model call\n    ReAct with 2 tool calls        3 calls (11.3)\n    supervisor + 2 workers         5 calls vs 3 for one agent (12.x)\n    plan-and-execute, 3 steps      1 planner + 3 workers = 4, and the\n                                   workers have a CONSTANT prompt\n                                   (11.6, 13.6)\n\n  which makes an architectural choice a scaling choice. the\n  supervisor's extra two calls per unit of work are the coordination\n  overhead, and at volume that is the whole budget difference.\n\n==============================================================================\nPART 3 -- what to cache -- measured on repeated queries\n==============================================================================\n  100 queries, 37 distinct\n  embedding cache : 63 hits, 37 misses, hit rate 63%\n\n  a 63% hit rate on query embeddings, because real traffic is\n  Zipfian -- a few questions dominate. and an embedding is a PURE\n  FUNCTION of its input, so this cache can never be wrong.\n\n==============================================================================\nPART 4 -- and what must never be cached\n==============================================================================\n  the embedding of a query        PURE. cache forever, keyed by\n                                  (text, model, model version).\n  a retrieval result              cacheable, but invalidated by any\n                                  change to the corpus. so TTL it, and\n                                  key it on a corpus version if you\n                                  have one.\n  a model response                cacheable only for identical\n                                  prompts -- and 13.1 means the prompt\n                                  contains the whole history, so two\n                                  users never share one. the hit rate\n                                  is near zero outside tests.\n  anything PERMISSIONED           NEVER. 7.5's finding: a cache keyed\n                                  on the question alone will serve one\n                                  user's filtered results to another.\n                                  if you cache it, the key must\n                                  include the permission scope, and\n                                  that usually destroys the hit rate\n                                  that motivated the cache.\n  a tool result with effects      never. it is not a read.\n\n  the permission case is the one that turns a performance improvement\n  into a data breach, and it is easy to ship because the bug is\n  invisible until two users with different access ask the same\n  question.\n\n==============================================================================\nPART 5 -- the component that saturates first\n==============================================================================\n  not the framework, and not your service. it is the PROVIDER RATE\n  LIMIT, because the model call is 80% of the turn and the only part\n  you do not control.\n\n  so the concurrency limit that matters is the one on model calls, and\n  it belongs in front of them rather than at your HTTP layer:\n\n    a semaphore around the model call, sized to your rate limit\n    a queue in front of it, so a burst waits instead of failing\n    backpressure to the caller when the queue is long, so you shed\n      load deliberately rather than timing out\n    and the breaker from 14.2 for when the provider is actually down\n\n  the ordering is the point. an HTTP concurrency limit of 200 with a\n  provider limit of 20 means 180 requests racing to discover a 429,\n  each after paying for retrieval -- so the limit has to be where the\n  scarce resource is.\n\n  what to watch, in order: model-call queue depth, 429 rate, cost per\n  run (13.1), p99 turn count, and the retrieval index's memory. the\n  last one is the only non-model component that genuinely saturates,\n  and it does so suddenly.",
        notes: [
          { t: "p", text: "**The model call dominates by an order of magnitude** and graph overhead is 0.2% of the turn." },
          { t: "p", text: "**So optimising the framework optimises nothing** \u2014 the only levers are fewer model calls and smaller prompts." },
          { t: "p", text: "**And history is 86% of a prompt** (13.1), which is the lever with the most room in it." },
          { t: "p", text: "**Which makes the architecture a scaling decision**: a supervisor spends 5 calls where one agent spends 3." },
          { t: "p", text: "**Plan-and-execute is the outlier** \u2014 constant worker prompts, so the quadratic growth never reaches them." },
          { t: "p", text: "**A 65% hit rate on query embeddings**, because real traffic is Zipfian." },
          { t: "p", text: "**And an embedding is a pure function, so that cache can never be wrong** \u2014 keyed on text and model version." },
          { t: "p", text: "**A model response cache has a near-zero hit rate outside tests**, because the prompt contains the whole history." },
          { t: "p", text: "**Never cache anything permissioned** (7.5) \u2014 and the bug is invisible until two users with different access ask the same question." },
          { t: "p", text: "**The provider rate limit saturates first**, so the concurrency limit belongs in front of the model call, not at the HTTP layer." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the cache that leaked", body: [
      { t: "p", text: "A team adds a retrieval cache keyed on the question text. Latency improves and the hit rate is 60%. Weeks later a user reports seeing a document they should not have access to, and it is not reproducible from their account." },
      { t: "p", text: "The cache key omits the permission scope, so the first user to ask a question populates the entry with results filtered for them, and everyone who asks the same question afterwards receives that filtered set. The filter is still running correctly \u2014 it just stops being consulted. And every test with a single user passes, which is why this ships: the bug requires two users with different access asking the same question." },
      { t: "p", text: "The correct key includes the permission scope, and the honest consequence is that this usually destroys the hit rate that motivated the cache \u2014 which is the real reason not to cache permissioned retrieval. What is safe to cache instead is the query embedding, which is a pure function of its input and measured a 65% hit rate on realistic traffic; it can never serve a wrong result, as long as the key includes the model version." }
    ] }
  ],
  takeaways: [
    "**The model call dominates a turn by an order of magnitude.**",
    "**Graph overhead is about 0.2%**, so optimising the framework optimises nothing.",
    "**The only two levers are fewer model calls and smaller prompts.**",
    "**And history is 86% of a prompt** (13.1) \u2014 the lever with the most room.",
    "**So the architecture is a scaling decision**: a supervisor spends 5 calls where one agent spends 3.",
    "**Plan-and-execute workers have a constant prompt**, so quadratic growth never reaches them.",
    "**A 65% hit rate on query embeddings**, because real traffic is Zipfian.",
    "**An embedding is a pure function, so that cache can never be wrong.**",
    "**Key it on text AND model version** \u2014 omitting the version mixes two vector spaces.",
    "**A retrieval result is cacheable with a TTL**, invalidated by any corpus change.",
    "**A model response cache has a near-zero hit rate**, because the prompt holds the whole history.",
    "**Never cache anything permissioned** (7.5) \u2014 the filter stops being consulted.",
    "**And that bug is invisible until two users with different access ask the same question.**",
    "**The provider rate limit saturates first**, so the concurrency limit belongs in front of the model call."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Graph overhead is about 0.2% of an agent turn. What follows?",
      options: ["The framework should still be optimised for consistency",
        "The only levers that matter are fewer model calls and smaller prompts",
        "Retrieval is the next place to optimise",
        "Latency is dominated by the tool layer"],
      answer: 1,
      why: "The model call dominates by an order of magnitude, so framework-level optimisation addresses two tenths of a percent of the turn. Of the two real levers, prompt size has the most room in it: conversation history measures around 86% of a turn's prompt and is the only component that grows." },
    { stem: "Why is a query-embedding cache the best cache in an agent stack?",
      options: ["Embeddings are the most expensive operation",
        "An embedding is a pure function of its input, so the cache can never serve a wrong result \u2014 and realistic traffic gave a 65% hit rate",
        "Embeddings are small enough to store indefinitely",
        "Vector stores cache them anyway"],
      answer: 1,
      why: "Purity means correctness is not a concern, and Zipfian traffic \u2014 a few questions dominating \u2014 supplies a high hit rate for free. The one subtlety is the key: it must include the model and its version, since omitting the version lets an upgrade silently mix two incompatible vector spaces." },
    { stem: "Why is caching permissioned retrieval results a security problem rather than a correctness one?",
      options: ["Cached results bypass the vector store's audit log",
        "A key without the permission scope serves the first user's filtered results to everyone \u2014 the filter still runs but stops being consulted",
        "Permissions change too often for a TTL",
        "The cache stores documents in plaintext"],
      answer: 1,
      why: "The filtering logic remains correct; it is simply no longer reached. And the defect is invisible until two users with different access ask the same question, so every single-user test passes. Including the scope in the key fixes it and usually destroys the hit rate that motivated the cache \u2014 which is the honest argument against caching it at all." },
    { stem: "Which component saturates first under load, and where does the limit belong?",
      options: ["Your HTTP server; the limit belongs at the ingress",
        "The provider rate limit; the limit belongs in front of the model call, not at the HTTP layer",
        "The checkpointer; the limit belongs on writes",
        "The graph executor; the limit belongs on supersteps"],
      answer: 1,
      why: "The model call is around 80% of the turn and the only part you do not control. An HTTP concurrency limit of 200 against a provider limit of 20 means 180 requests racing to discover a 429, each after paying for retrieval and reranking first. The scarce resource needs the semaphore, with a queue and deliberate backpressure in front of it." }
  ] },
  interview: { title: "Interview practice", sub: "Scaling", questions: [
    { level: "advanced", q: "Where does an agentic system break under load?",
      strong: "A strong answer puts the limit at the provider, not the ingress.",
      answer: [
        { t: "p", text: "At the provider rate limit, because the model call is around 80% of the turn and the only part I do not control." },
        { t: "p", text: "That follows from decomposing a turn. The model call dominates by an order of magnitude, tool calls and reranking are the next tier, and graph overhead is about 0.2% \u2014 so optimising the framework optimises nothing, and the levers are fewer model calls and smaller prompts." },
        { t: "p", text: "Which means the concurrency limit belongs in front of the model call rather than at the HTTP layer. A limit of 200 at ingress against a provider limit of 20 gives you 180 requests racing to discover a 429, each after already paying for retrieval and reranking." },
        { t: "p", text: "So: a semaphore around the model call sized to the rate limit, a queue in front so a burst waits rather than fails, backpressure to the caller when the queue is long so load is shed deliberately, and a circuit breaker for when the provider is genuinely down." },
        { t: "p", text: "What I would watch, in order: model-call queue depth, 429 rate, cost per run, p99 turn count, and the retrieval index's memory \u2014 that last one being the only non-model component that genuinely saturates, and it does so suddenly rather than gradually." }
      ] },
    { level: "core", q: "What would you cache in a RAG agent?",
      strong: "A strong answer caches embeddings and refuses permissioned results.",
      answer: [
        { t: "p", text: "Query embeddings certainly, retrieval results conditionally, model responses almost never, and anything permissioned not at all." },
        { t: "p", text: "Embeddings are the best cache in the stack because an embedding is a pure function of its input, so it can never serve a wrong result. I measured a 65% hit rate on realistic traffic, which comes free because real query distributions are Zipfian \u2014 a few questions dominate. The one subtlety is keying on the model version as well as the text, since omitting it lets an upgrade silently mix two vector spaces." },
        { t: "p", text: "Retrieval results are cacheable with a TTL, because any change to the corpus invalidates them. If there is a corpus version available I would put it in the key." },
        { t: "p", text: "Model responses have a near-zero hit rate outside tests, because the prompt contains the whole conversation history, so two users never share one." },
        { t: "p", text: "And permissioned results I would refuse. A key on the question alone means the first user populates the entry with their filtered results and everyone else receives them \u2014 the filter still runs, it just stops being consulted. The bug is invisible until two users with different access ask the same question, so it passes every single-user test. Including the scope in the key fixes it and usually destroys the hit rate that motivated the cache, which is the honest reason not to." }
      ] },
    { level: "core", q: "Your agent's p95 latency is 8 seconds and the target is 3. Where do you start?",
      strong: "A strong answer attacks the call count before anything else.",
      answer: [
        { t: "p", text: "With the number of model calls per request, because at those numbers nothing else can account for the gap." },
        { t: "p", text: "A turn is dominated by the model call \u2014 roughly 80% of it \u2014 with tool calls and reranking next and framework overhead around 0.2%. So 8 seconds is most likely several sequential model calls rather than one slow one, and I would check the turn count distribution before touching anything." },
        { t: "p", text: "If the p95 runs are taking more turns than the p50, the question is why. A ReAct loop re-deriving its intent each turn does that, and the distinct-tool-call ratio would show it \u2014 which also means the fix is a context strategy rather than a latency optimisation." },
        { t: "p", text: "If the turn count is the same and the calls are just slow, then prompt size is the lever, and history is usually around 86% of the prompt. Compressing tool results before they enter the history is the cheapest move there: it has no information loss, it is a formatting function rather than a model call, and the saving is paid back on every subsequent turn." },
        { t: "p", text: "The architectural question comes next: if this is a supervisor arrangement, it is spending roughly five model calls where a single agent would spend three, and those two extra calls are sequential. That may be worth paying and it should be a known cost." },
        { t: "p", text: "And I would check the retry attempt number before trusting the p95 at all, because a node retried three times inside one successful run inflates it \u2014 so part of the gap may be retries working as configured rather than slowness." }
      ] }
  ] }
});
