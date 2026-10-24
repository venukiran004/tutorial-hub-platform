/* ============================================================================
   IV 1.1 — Experience 1: Senior GenAI and Agentic Systems
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "Two rounds for a senior agentic-systems role: a long technical round and a production round, plus one coding question. **The interviewer said explicitly that every answer was checked for whether it was theoretical or lived** — and the question shapes show it. The retrieval questions came as a chain, each one removing a tool and asking what remained. Project-specific questions are left out here; everything below transfers.",

  objectives: [
    "Answer the retrieval chain, including reranking with no cross-encoder",
    "Give a structured debugging answer when an agentic system drops to 60%",
    "Explain the KV cache and sampling parameters with the arithmetic",
    "Answer the production questions with signals and a rollback story",
    "Solve trapping rain water in O(n) time and O(1) space, out loud"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "RAG against agentic RAG", id: "agentic" },

    {"kind": "trace", "title": "Who decides, and how many times", "caption": "**The whole difference is control flow.** Baseline RAG runs the same way whatever the question and retrieves exactly once; agentic RAG makes retrieval a decision the model takes, repeatedly. **The capability worth naming first is not retrieving at all** — “hallo” and “what did I just ask” need no corpus, and a fixed pipeline retrieves for both, wasting a call and putting irrelevant chunks where they can mislead. And the clause interviewers react to is the cap: a corpus that cannot answer will not start being able to on the fourth attempt.", "left": "", "codeW": 170, "vars": ["baseline RAG", "agentic RAG"], "steps": [{"code": "who decides to retrieve", "state": ["the pipeline, always", "the model, per question"], "tone": "accent"}, {"code": "how many retrievals", "state": ["exactly one", "zero to several"], "changed": [0, 1], "tone": "accent"}, {"code": "rewrite the query first", "state": ["no", "yes - cheapest big win"], "changed": [0, 1], "tone": "good"}, {"code": "judge what came back", "state": ["no", "yes, and retry"], "changed": [0, 1], "tone": "good"}, {"code": "cost per answer", "state": ["2 model calls", "4 to 8"], "changed": [0, 1], "tone": "warn"}, {"code": "failure mode", "state": ["answers from a bad retrieval", "loops, or overspends"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-1_1-01-0"},

    { t: "p", text: "**The difference is who decides, and how many times.** Baseline RAG is a fixed pipeline — embed, retrieve k, stuff the prompt, generate — and it retrieves exactly once whatever the question. Agentic RAG makes retrieval a decision the model takes, repeatedly, with the ability to act on what came back." },

    { t: "table",
      head: ["", "Baseline RAG", "Agentic RAG"],
      rows: [
        ["Who decides to retrieve", "The pipeline, always", "The model, per question"],
        ["How many retrievals", "Exactly one", "Zero to several"],
        ["Rewrite the query first", "No", "Yes — usually the first thing it does"],
        ["Judge what came back", "No", "Yes, and retry or fall back"],
        ["Multi-part questions", "Answers from half the picture", "Decomposes into separate retrievals"],
        ["Cost per answer", "2 model calls", "4 to 8, sometimes more"],
        ["Failure mode", "Silently answers from a bad retrieval", "Loops, or spends a lot to reach the same answer"]
      ] },

    { t: "callout", kind: "good", title: "The answer that lands",
      body: [
        { t: "p", text: "*“Baseline RAG retrieves once on a fixed path. Agentic RAG lets the model decide whether to retrieve at all, rewrite the query first, judge what came back and retry — so it handles the multi-part question and the question that needs no retrieval, at two to four times the cost. **I would add the rewrite first**, because it is the cheapest piece and usually the biggest win, and **I would cap the retries**, because a corpus that cannot answer will not start being able to on the fourth attempt.”*" },
        { t: "p", text: "The cap clause is what interviewers react to — it is the part people who have only read about the pattern leave out. The most valuable capability, incidentally, is **not retrieving at all**: “hello” and “what did I just ask” need no corpus, and a baseline pipeline retrieves for both." }
      ] },

    { t: "h2", n: "02", text: "Reranking, and reranking without a cross-encoder", id: "rerank" },

    {"kind": "trace", "title": "The one fact the whole reranking answer rests on", "caption": "**A cross-encoder cannot be precomputed, because the query–document pair does not exist until the query arrives.** Everything else follows: why it is accurate (full attention across the pair), why it cannot run over millions, and why the two-stage design exists at all. **And when the interviewer takes it away, lead with rank fusion** — it needs no model, it is immune to cosine and BM25 scores being incomparable, and it is what most production systems actually use.", "left": "", "codeW": 180, "vars": ["bi-encoder", "cross-encoder"], "steps": [{"code": "when query and doc meet", "state": ["never - encoded separately", "together, as one sequence"], "tone": "violet"}, {"code": "can you precompute", "state": ["YES - embed the corpus once", "NO - the pair is new each time"], "changed": [0, 1], "tone": "violet"}, {"code": "cost at query time", "state": ["one embedding + index lookup", "a forward pass PER candidate"], "changed": [0, 1], "tone": "crit"}, {"code": "where it belongs", "state": ["stage one, over millions", "stage two, over tens"], "changed": [0, 1], "tone": "good"}, {"code": "without a cross-encoder", "state": ["rank fusion (no model at all)", "then MMR, then listwise LLM"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-1_1-02-1"},

    { t: "p", text: "**Retrieval optimises for recall; reranking optimises for precision.** Stage one casts a wide cheap net — 50 candidates — and stage two scores those expensively and keeps 5. The two-stage shape exists because the accurate scorer cannot run over millions, and the reason it cannot is the whole cross-encoder answer." },

    { t: "table",
      head: ["", "Bi-encoder", "Cross-encoder"],
      rows: [
        ["Input", "Query and document encoded **separately**", "The pair encoded **together**, as one sequence"],
        ["Output", "Two vectors, compared by cosine", "One relevance score"],
        ["Can you precompute", "**Yes** — embed the corpus once", "**No** — the pair does not exist until the query arrives"],
        ["Cost at query time", "One embedding, then an index lookup", "One forward pass **per candidate**"],
        ["Query–document attention", "None — they never see each other", "Full cross-attention"],
        ["Where it belongs", "Stage one, over millions", "Stage two, over tens"]
      ] },

    { t: "callout", kind: "insight", title: "The one-line version",
      body: [
        { t: "p", text: "*“A bi-encoder embeds query and document independently, so the corpus can be embedded once and indexed — which is what makes search over millions possible, and also what makes it blind to the interaction between the two. A cross-encoder puts the pair through the model together, so it attends across them, which is far more accurate and **cannot be precomputed**.”*" },
        { t: "p", text: "That last clause is the heart of it. The cost, the staging, and why you cannot simply use the better model everywhere all follow from that one fact." }
      ] },

    { t: "p", text: "**Then the follow-up: rerank without a cross-encoder.** This is the question that separates people — the interviewer removes the obvious tool and asks what remains. Name several and say when each applies." },

    { t: "dl", items: [
      ["Reciprocal rank fusion — lead with this", "Run dense and BM25, then combine by **rank** rather than score: each document scores the sum of `1/(k + rank)` across lists, k around 60. **No model at all**, immune to cosine and BM25 scores being incomparable, and it reliably beats either list alone. It is what most production systems actually use."],
      ["Maximal marginal relevance", "Rerank for **diversity**: repeatedly pick the candidate most relevant to the query and least similar to what you already have. Fixes the case where the top five chunks are five near-copies of one paragraph — which is a *different failure* from the wrong chunks, and saying so shows you have read real retrieval output."],
      ["LLM-as-reranker, listwise", "Give the model the query and all candidates in one prompt and ask for an ordering. Accurate, one call rather than one per candidate, and the expensive option — so for small k and high-value queries."],
      ["Metadata and feature scoring", "Boost on recency, source authority, exact title match; blend linearly with the retrieval score and tune on a labelled set. Unglamorous and often the biggest single improvement."]
    ] },

    { t: "h2", n: "03", text: "Advanced RAG, query optimisation and large-corpus latency", id: "advanced" },

    {"kind": "trace", "title": "The latency budget, and why the index is not the answer", "caption": "**The question invites a list of index tricks and the honest reply is that generation dominates.** Retrieval is 50–150 ms of a multi-second answer, so tuning the index optimises a few per cent — saying that, then giving the retrieval answers anyway, is what shows you would measure before tuning. **And the follow-up to pre-empt:** how do you know the ANN recall is good enough? You measure recall@k against exact search on a sample and tune `ef_search` until it is acceptable. An index tuned by feel has an unknown recall.", "left": "stage", "codeW": 170, "vars": ["typical", "the lever"], "steps": [{"code": "embed the query", "state": ["5-15 ms", "rarely the problem"], "tone": "good"}, {"code": "vector search", "state": ["10-50 ms with ANN", "HNSW/IVF; exact is linear"], "changed": [0, 1], "tone": "good"}, {"code": "metadata filtering", "state": ["1-10 ms", "PRE-filter, never post"], "changed": [0, 1], "tone": "violet"}, {"code": "rerank 50 candidates", "state": ["30-80 ms", "rerank 20 if tight"], "changed": [0, 1], "tone": "accent"}, {"code": "retrieval total", "state": ["~50-150 ms", "-"], "changed": [0, 1], "tone": "accent"}, {"code": "generation", "state": ["1,000-5,000 ms", "ALMOST ALL OF IT"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-1_1-03-2"},

    { t: "p", text: "Three questions, one answer: **group the techniques by pipeline stage, and diagnose before prescribing.**" },

    { t: "table",
      head: ["Stage", "Technique", "What it fixes"],
      rows: [
        ["Before retrieval", "Query rewriting, decomposition, HyDE, routing", "The user's words are not the corpus's words; multi-part questions; short queries embedding badly"],
        ["Indexing", "Semantic chunking, parent-document, contextual retrieval, metadata extraction", "Fixed windows cutting tables in half; orphaned chunks; filtering beats ranking for structured fields"],
        ["Retrieval", "Hybrid dense + sparse, MMR", "Dense misses exact identifiers; BM25 misses paraphrase; five copies of one paragraph"],
        ["After retrieval", "Reranking, contextual compression", "Precision in the top 5; a relevant chunk that is 90% irrelevant"],
        ["After generation", "Groundedness check", "A fluent answer the retrieval does not support"]
      ] },

    { t: "callout", kind: "tradeoff", title: "The sentence that makes this a senior answer",
      body: [
        { t: "p", text: "*“First I would find out whether the failures are retrieval failures or generation failures — pull fifty bad answers and check whether the right chunk was in the context. If it was not, the work is before generation. **If it was there and the answer was still wrong, adding retrieval techniques does nothing**, and the work is reranking, compression or the prompt.”*" },
        { t: "p", text: "Almost every technique in that table helps only one of the two, so the diagnosis decides which half of the list is relevant." }
      ] },

    { t: "code", lang: "text", title: "and the latency question, answered as a budget",
      code: `A 2,000 ms budget for a RAG answer, roughly:

  embed the query            5-15 ms    rarely the problem
  vector search             10-50 ms    with ANN; 10s of seconds without
  metadata filtering         1-10 ms    if the filter is indexed
  rerank 50 candidates      30-80 ms    cross-encoder, batched
  ---------------------------------
  retrieval total           ~50-150 ms

  generation            1,000-5,000 ms  <- almost all of it`,
      caption: "**The question invites a list of index tricks and the honest reply is that generation usually dominates.** Saying so and *then* giving the retrieval answers — ANN rather than exact, **pre-filter rather than post-filter**, shard on whatever queries filter by, quantise so the index stays in RAM, cache the query and its embedding, and stream so time-to-first-token improves — shows you would measure before tuning." },

    { t: "callout", kind: "insight", title: "The follow-up to be ready for",
      body: [
        { t: "p", text: "*“How do you know the ANN recall is good enough?”* — you measure it against exact search on a sample. Run both over a few thousand queries offline, compute recall@k of approximate against exact, and tune `ef_search` or `nprobe` until it is acceptable. **An ANN index tuned by feel is an index nobody knows the recall of**, which is what they are checking." }
      ] },

    { t: "h2", n: "04", text: "Images and tables", id: "images" },

    {"kind": "flow", "title": "Index a text representation, return the original", "caption": "**One idea covers both tables and images**, and stating it as one idea rather than two shows the design rather than the recipe. **The strongest move on this question is the last node:** an aggregation like “total revenue in Q3” is a query rather than a lookup, and models do arithmetic over retrieved tables badly — so load it and give the agent a query tool instead of retrieving it at all.", "cols": 3, "nodes": [{"id": "p", "label": "Layout-aware parse at ingestion", "sub": "a table is only a table while layout exists", "tone": "accent"}, {"id": "t", "label": "Tables: keep whole, never split", "sub": "half a table reads as plausible data", "tone": "crit"}, {"id": "s", "label": "Index a summary + headers", "sub": "return the table as markdown", "tone": "good"}, {"id": "i", "label": "Images: caption once, index the caption", "sub": "pass the image if the model is multimodal", "tone": "good"}, {"id": "q", "label": "Aggregations? Do not retrieve at all", "sub": "load it and give a query tool", "tone": "violet"}], "edges": [["p", "t"], ["t", "s"], ["p", "i"], ["s", "q"]], "t": "diagram", "id": "dg-1_1-04-3"},

    { t: "p", text: "A pipeline that treats a PDF as a stream of text destroys exactly the content people ask about. **The key idea for both: index a text representation, return the original.**" },

    { t: "dl", items: [
      ["Never let the chunker cut a table", "Half a table is worse than no table, because each half still reads as plausible data. Extract tables as units during parsing and keep them whole."],
      ["Index a summary, return the table as markdown", "Embed a generated one-line description plus the column headers — that is what a question will resemble — and return the table itself, which models read reliably."],
      ["If the questions are aggregations, do not retrieve at all", "*“Total revenue in Q3”* is a query, not a lookup, and models do arithmetic over retrieved tables badly. Load it into a dataframe or SQL and give the agent a query tool. **This is usually the strongest part of the answer**, because it reframes the question."],
      ["Images: caption once at ingestion, index the caption", "Retrieval is then ordinary text retrieval and the image comes back with it. Pass the image itself if the generation model is multimodal, because a caption loses a chart's detail."],
      ["Parse with a layout-aware parser", "A table only looks like a table while the PDF's layout information still exists, so this has to happen at ingestion."]
    ] },

    { t: "h2", n: "05", text: "Evaluating an agentic system, and testing RAG", id: "metrics" },

    {"kind": "trace", "title": "Metrics per layer, not a flat list", "caption": "**A system that retrieves, decides and answers fails in three different ways**, so naming them by layer is the structure that lands. **Lead with groundedness:** it catches the failure that matters most and is invisible to every other metric — a fluent answer the context does not support. And tool-trajectory accuracy is the agentic metric *and* the model-upgrade regression test, because it moves more than anything else when the model changes.", "left": "layer", "codeW": 150, "vars": ["metric", "catches"], "steps": [{"code": "retrieval", "state": ["recall@k, MRR, nDCG", "the right chunk never arrived"], "tone": "good"}, {"code": "retrieval", "state": ["context precision", "it arrived buried under nine others"], "changed": [0, 1], "tone": "good"}, {"code": "generation", "state": ["GROUNDEDNESS", "a claim the context does not support"], "changed": [0, 1], "tone": "violet"}, {"code": "agent", "state": ["tool-trajectory accuracy", "wrong tool, or wrong order"], "changed": [0, 1], "tone": "violet"}, {"code": "agent", "state": ["task success, steps, cost", "the only one a user would recognise"], "changed": [0, 1], "tone": "accent"}, {"code": "operational", "state": ["p95, error rate, refusals", "what a dashboard shows at 3am"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-1_1-05-4"},

    { t: "p", text: "**Name metrics per layer, not a flat list.** A system that retrieves, decides and answers fails in three different ways and needs three different measurements." },

    { t: "table",
      head: ["Layer", "Metric", "What it catches"],
      rows: [
        ["Retrieval", "recall@k, MRR, nDCG", "The right chunk never arrived"],
        ["Retrieval", "**Context precision**", "It arrived buried under nine irrelevant ones"],
        ["Generation", "**Groundedness / faithfulness**", "A claim the retrieved text does not support"],
        ["Generation", "Answer relevance", "Correct and not an answer to the question asked"],
        ["Agent", "**Tool-trajectory accuracy**", "It called the wrong tool, or in the wrong order"],
        ["Agent", "Task success", "The only metric a user would recognise"],
        ["Agent", "Steps and cost per task", "It got there by spending four times as much"],
        ["Operational", "p50/p95 latency, error rate, refusal rate", "What a dashboard shows at 3am"]
      ] },

    { t: "dl", items: [
      ["Groundedness is the one to lead with", "It catches the failure that matters most and is invisible to every other metric: a fluent answer the context does not support. Measure it with an LLM judge over a labelled set, and validate the judge against human labels before trusting its number."],
      ["Tool trajectory is the agentic metric", "Exact-match on the sequence of tool calls, scored against a reference. It is also the metric that moves most when you change model, which makes it the regression test for a model upgrade."],
      ["Testing a RAG system means a golden set", "Fifty to two hundred question-and-answer pairs with the expected source document. Run it on every change. **Every bug you fix becomes a case** — those are the highest-value entries by a distance, because a user found it once and now it cannot come back silently."],
      ["And say what the score is not", "85% on your set means it handles your cases as well as last week. It says nothing about questions you did not think of, and it is not “the system is 85% accurate”."]
    ] },

    { t: "h2", n: "06", text: "Accuracy dropped to 60% — debug it", id: "debug" },

    {"kind": "steps", "title": "Six steps, and step two is the one that impresses", "caption": "**Ask when it started before asking what caused it**, because a cliff and a slope have disjoint cause lists — that single question halves the search space. Most people begin at step four, which is why beginning earlier reads as experience. **And the most-forgotten cause is a silently updated model version:** the provider moved a pointer alias, your prompt was tuned for the old behaviour, and nothing in your repository changed.", "items": [{"label": "Is the measurement real?", "code": "first", "desc": "Did the eval set, the judge prompt or the scoring code change? A regression with no system change is a metric bug.", "tone": "accent"}, {"label": "Cliff or slope?", "code": "halves it", "desc": "A cliff points at a deploy, a config change or a model version. A slope points at drift or corpus growth.", "tone": "violet"}, {"label": "What changed then?", "code": "correlate", "desc": "Deploys, prompt edits, model version, index rebuild, a new document source, a dependency bump.", "tone": "good"}, {"label": "Which layer?", "code": "localise", "desc": "Replay failures and read the trace: chunk missing is retrieval, chunk ignored is generation, wrong tool is trajectory.", "tone": "good"}, {"label": "Bisect", "code": "one at a time", "desc": "Pin the model, roll back the prompt, swap the index back - against the same eval set.", "tone": "accent"}, {"label": "Fix, encode, alert", "code": "close it", "desc": "Add the case to the golden set so it cannot come back silently.", "tone": "violet"}], "t": "diagram", "id": "dg-1_1-06-5"},

    { t: "p", text: "**Answer this with a procedure, not a guess.** The interviewer is checking whether you have debugged a live system, and the tell is whether you ask what changed before proposing a fix." },

    { t: "code", lang: "text", title: "the order to say it in",
      code: `1. Is the measurement real?
     Did the eval set change? The judge prompt? The scoring code?
     A metric regression with no system change is a metric bug.

2. When did it start?
     A cliff points at a deploy, a config change or a model version.
     A slope points at data drift, a growing corpus or context creep.
     This single question halves the search space.

3. What changed at that moment?
     Deploys, prompt edits, model version (silently updated?),
     index rebuild, a new document source, a dependency bump.

4. Which layer?
     Replay failing cases and look at the trace:
       - was the right chunk retrieved?        -> retrieval
       - was it retrieved and ignored?         -> generation or prompt
       - wrong tool, or right tool wrong args? -> trajectory
       - correct steps, wrong final answer?    -> synthesis
     This is the step that actually localises it.

5. Bisect.
     Pin the model version. Roll back the prompt. Swap the index
     back. Change one thing at a time against the same eval set.

6. Fix, add the case to the golden set, and alert on it.`,
      caption: "**Step 2 is the one that impresses**, because a cliff and a slope have disjoint cause lists and asking that question first halves the work. Step 4 is where most people start, which is why starting earlier reads as experience." },

    { t: "callout", kind: "warn", title: "The cause people forget",
      body: [
        { t: "p", text: "**A silently updated model version.** The provider moved a pointer alias, your prompt was tuned for the old behaviour, and nothing in your repository changed. This is why lessons on observability insist on logging the model version with every call — without it, *“it got worse last Tuesday”* has no evidence behind it." },
        { t: "p", text: "The second-most-forgotten is **corpus growth**: more documents means more near-duplicates competing for the same top-5 slots, so retrieval quality decays with no code change at all." }
      ] },

    { t: "h2", n: "07", text: "Requirements before designing a multi-agent system", id: "requirements" },

    {"kind": "tree", "title": "Three questions before any multi-agent design", "caption": "**The first bounds the whole system**, and it is the question the ADK and MCP material keeps returning to: assume the model does exactly the wrong thing, and see what happens. **The second is the one that earns credit for restraint** — the question invites you to design something elaborate, and multi-agent adds routing failures, context loss between agents and a much harder debugging story. If one agent with six tools works, that is the system.", "root": {"label": "Before designing anything", "sub": "three questions, in this order", "tone": "accent", "children": [{"label": "What is the worst it could do?", "sub": "assuming the model does the wrong thing", "tone": "crit", "children": [{"label": "Decides tools, credentials, approval", "sub": "and bounds the whole design", "tone": "crit"}]}, {"label": "Does it need multiple agents?", "sub": "or one agent with six tools", "tone": "violet", "children": [{"label": "Multi-agent costs routing and context loss", "sub": "saying so is a strong signal", "tone": "violet"}]}, {"label": "How will I know it works in production?", "sub": "-", "tone": "good", "children": [{"label": "A specific metric on a specific dashboard", "sub": "or the design is not finished", "tone": "good"}]}]}, "t": "diagram", "id": "dg-1_1-07-6"},

    { t: "p", text: "Asked as *“functional and non-functional requirements”*, and the strong answer is specific rather than a textbook split." },

    { t: "table",
      head: ["Functional", "Non-functional"],
      rows: [
        ["What tasks, end to end — and which are out of scope", "p95 latency budget, and what the user sees while waiting"],
        ["Which systems it may read; which it may **write**", "Cost per task, and the ceiling per user per day"],
        ["What must never happen without a human", "Availability, and what degraded mode looks like"],
        ["Who the users are and what they may each see", "Accuracy target, measured how, on which set"],
        ["Inputs and outputs, with formats", "Auditability: what is logged and retained how long"],
        ["Escalation path when the agent cannot proceed", "Data residency, PII handling, compliance"]
      ] },

    { t: "callout", kind: "good", title: "The three questions to ask before designing anything",
      body: [
        { t: "p", text: "**What is the worst thing this system could do if the model does exactly the wrong thing?** That decides the tool list, the credentials and whether a human approval step is mandatory — and it is the question that bounds the whole design." },
        { t: "p", text: "**Does it actually need multiple agents?** Multi-agent adds routing failures, context loss between agents and a much harder debugging story. If one agent with six tools works, that is the system to build — saying this is a strong signal, because the question invites you to design something elaborate." },
        { t: "p", text: "**How will I know it is working in production?** If the answer is not a specific metric on a specific dashboard, the design is not finished." }
      ] },

    { t: "h2", n: "08", text: "KV cache, and optimising its memory", id: "kv" },

    {"kind": "trace", "title": "250 GiB of cache for 14 GiB of weights", "caption": "**That is the number that makes the point.** The cache scales linearly in context length *and* batch size, which is why long context and high concurrency are the same problem — and why a 7B model's cache dwarfs its weights at any realistic concurrency. **GQA is the default answer** (4×, little quality loss, which is why recent models ship with it); MQA is 32× at a real quality cost; quantisation multiplies with either. And the non-memory answer is to send less context, since sequence length is the term everything is multiplied by.", "left": "configuration", "codeW": 190, "vars": ["KV cache", "versus baseline"], "steps": [{"code": "1k tokens, one sequence", "state": ["0.49 GiB", "-"], "tone": "good"}, {"code": "32k tokens, one sequence", "state": ["15.62 GiB", "linear in context"], "changed": [0, 1], "tone": "warn"}, {"code": "32k, batch 16, fp16", "state": ["250.00 GiB", "the baseline"], "changed": [0, 1], "tone": "crit"}, {"code": "+ GQA, 8 KV heads", "state": ["62.50 GiB", "4.0x less"], "changed": [0, 1], "tone": "good"}, {"code": "+ MQA, 1 KV head", "state": ["7.81 GiB", "32.0x less, costs quality"], "changed": [0, 1], "tone": "violet"}, {"code": "+ GQA and fp8 cache", "state": ["31.25 GiB", "8.0x - they multiply"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-1_1-08-7"},

    { t: "p", text: "**What it is:** during generation, every new token attends over every previous token, so the key and value projections of the earlier tokens are cached rather than recomputed. **Why it matters:** it turns quadratic recomputation into linear reads — and becomes the memory bottleneck." },

    { t: "code", lang: "python", title: "the arithmetic, computed",
      code: `GIB = 1024 ** 3

def kv_bytes(layers, kv_heads, head_dim, seq, batch, dtype_bytes):
    """2 (K and V) x layers x kv_heads x head_dim x seq x batch x width."""
    return 2 * layers * kv_heads * head_dim * seq * batch * dtype_bytes

# A 7B-class model: 32 layers, 32 heads, head_dim 128.
L, H, D = 32, 32, 128
for seq in (1_000, 4_000, 32_000, 128_000):
    print("  %7d tokens   %6.2f GiB" % (seq, kv_bytes(L, H, D, seq, 1, 2) / GIB))`,
      out: `     1000 tokens     0.49 GiB
     4000 tokens     1.95 GiB
    32000 tokens    15.62 GiB
   128000 tokens    62.50 GiB

the three levers, at 32k context and batch 16:
  baseline: 32 KV heads, fp16                 250.00 GiB
  grouped-query attention, 8 KV heads          62.50 GiB  (4.0x less)
  multi-query attention, 1 KV head              7.81 GiB  (32.0x less)
  GQA 8 heads + fp8 cache                      31.25 GiB  (8.0x less)`,
      caption: "**250 GiB for sixteen concurrent 32k conversations on a 7B model** is the number that makes the point: the weights are 14 GiB and the cache dwarfs them. It scales linearly in both context length and batch size, which is why long context and high concurrency are the same problem." },

    { t: "dl", items: [
      ["Grouped-query attention", "Several query heads share one KV head. 32 → 8 is a measured 4× saving with little quality loss, and it is why most recent models ship with it."],
      ["Multi-query attention", "One KV head for all queries — 32× — at a larger quality cost. GQA is the usual compromise."],
      ["Quantise the cache", "fp16 → fp8 halves it; int4 quarters it. Combines multiplicatively with GQA, as the 8× row shows."],
      ["PagedAttention", "The vLLM idea: allocate the cache in fixed blocks like virtual memory pages instead of one contiguous reservation per sequence. Removes the fragmentation and over-reservation that wastes most of a naive allocator's memory, and enables prefix sharing between sequences."],
      ["Prefix caching", "A shared system prompt is identical across requests, so cache it once. Large effect when every request carries the same long preamble."],
      ["And the non-memory answer", "Send less context. Compaction, summarising old turns, and `include_contents` style controls reduce the sequence length, which is the term everything else is multiplied by."]
    ] },

    { t: "h2", n: "09", text: "Temperature and top_p", id: "sampling" },

    {"kind": "trace", "title": "Watch the banana column", "caption": "**0.0003 at T=1.0 and 0.0110 at T=2.0 — a 37-fold rise in the chance of nonsense.** That is what “raising temperature increases creativity” actually means: it raises the probability of every unlikely token, and the model cannot distinguish the creative ones from the wrong ones. **And the interaction people miss:** the same top_p=0.9 kept 2 tokens at T=1.0 and 4 at T=2.0, because temperature reshapes the distribution that top_p then measures. Tune one and leave the other.", "left": "temperature", "codeW": 140, "vars": ["P(Paris)", "P(banana)", "top_p=0.9 keeps"], "steps": [{"code": "0.1", "state": ["1.0000", "0.0000", "1 token"], "tone": "good"}, {"code": "0.5", "state": ["0.9926", "0.0000", "1 token"], "changed": [0], "tone": "good"}, {"code": "1.0", "state": ["0.8874", "0.0003", "2 tokens"], "changed": [0, 1, 2], "tone": "accent"}, {"code": "1.5", "state": ["0.7279", "0.0035", "3 tokens"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "2.0", "state": ["0.5995", "0.0110", "4 tokens"], "changed": [0, 1, 2], "tone": "crit"}, {"code": "for tool calling", "state": ["T near 0", "top_p 1", "determinism wins"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-1_1-09-8"},

    { t: "p", text: "**Temperature divides the logits before the softmax; top_p truncates the distribution after it.** They act at different points, which is why they interact." },

    { t: "code", lang: "python", title: "one real distribution, both knobs",
      code: `TOKENS = ["Paris", "London", "Lyon", "Rome", "Berlin", "banana"]
LOGITS = np.array([6.0, 3.5, 2.0, 1.8, 1.5, -2.0])

for T in (0.1, 0.5, 1.0, 1.5, 2.0):
    print("  T=%-4.1f" % T, softmax(LOGITS / T))`,
      out: `  T      Paris    London      Lyon      Rome    Berlin    banana
  0.1   1.0000    0.0000    0.0000    0.0000    0.0000    0.0000
  0.5   0.9926    0.0067    0.0003    0.0002    0.0001    0.0000
  1.0   0.8874    0.0728    0.0163    0.0133    0.0099    0.0003
  1.5   0.7279    0.1375    0.0506    0.0443    0.0362    0.0035
  2.0   0.5995    0.1718    0.0811    0.0734    0.0632    0.0110

top_p over the T=1.0 distribution (cumulative 0.887, 0.960, 0.977, 0.990, ...):
  top_p=0.50 keeps 1 token:  Paris
  top_p=0.90 keeps 2 tokens: Paris, London
  top_p=1.00 keeps 6 tokens: everything, including banana`,
      caption: "**Watch the banana column**: 0.0003 at T=1.0 and 0.0110 at T=2.0, a 37-fold rise in the chance of nonsense. That is what “raising temperature increases creativity” actually means — it raises the probability of every unlikely token, and the model has no way to distinguish the creative ones from the wrong ones." },

    { t: "callout", kind: "trap", title: "The interaction people get wrong",
      body: [
        { t: "p", text: "Measured on the same distribution: **at T=1.0, top_p=0.9 keeps 2 tokens; at T=2.0, top_p=0.9 keeps 4.** Temperature reshapes the distribution that top_p then measures, so raising temperature widens the nucleus as well — the two are not independent dials." },
        { t: "p", text: "Which is why the usual advice is to **tune one and leave the other**. For anything calling tools or extracting fields, temperature at or near 0 and top_p at 1; tool-choice accuracy and instruction-following both degrade as temperature rises, and determinism is worth more than variety there." }
      ] },

    { t: "h2", n: "10", text: "Catastrophic forgetting, and prompt compression", id: "forgetting" },

    {"kind": "trace", "title": "Five mitigations, and the one that is usually the real answer", "caption": "**Catastrophic forgetting is over-training on a narrow task** — gradient updates overwrite the weights that encoded the old capabilities, and the loss is invisible unless you measure the general capability during the run. **LoRA is the first answer because the base weights are literally unchanged**, which also lets you swap or disable the adapter. But the last row is the one that most often applies: most cases reaching for fine-tuning are retrieval or prompting problems, and fine-tuning teaches form while RAG supplies facts.", "left": "mitigation", "codeW": 190, "vars": ["what it does"], "steps": [{"code": "LoRA / adapters", "state": ["base weights frozen - nothing to forget"], "tone": "good"}, {"code": "rehearsal / data mixing", "state": ["5-30% general data so gradients do not all point one way"], "changed": [0], "tone": "good"}, {"code": "lower LR, fewer epochs, early stop", "state": ["most forgetting is over-training"], "changed": [0], "tone": "accent"}, {"code": "regularise towards the base", "state": ["EWC - principled, rarely used, worth naming"], "changed": [0], "tone": "warn"}, {"code": "do not fine-tune at all", "state": ["fine-tuning teaches FORM; RAG supplies FACTS"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-1_1-10-9"},

    { t: "p", text: "**Catastrophic forgetting** is a fine-tuned model losing capabilities it previously had, because gradient updates on a narrow new task overwrite weights that encoded the old ones. A model fine-tuned hard on your support tickets gets better at support tickets and worse at reasoning, arithmetic and instruction-following — and the loss is invisible unless you measure the general capability." },

    { t: "dl", items: [
      ["Parameter-efficient fine-tuning", "LoRA and adapters freeze the base weights and train a small low-rank addition. **The base model is literally unchanged**, which makes this the first and best mitigation — and it lets you swap or disable the adapter."],
      ["Rehearsal / data mixing", "Mix a slice of general instruction data into the fine-tuning set, typically 5–30%, so the gradients do not all point one way."],
      ["Lower learning rate, fewer epochs, early stopping", "Most catastrophic forgetting is over-training. Evaluate on a general benchmark *during* the run and stop when it starts falling."],
      ["Regularisation towards the base", "Elastic weight consolidation and similar methods penalise moving weights the old task depended on. Principled, rarely used in practice, worth naming."],
      ["Do not fine-tune at all", "Most cases that reach for fine-tuning are retrieval or prompting problems. **Fine-tuning teaches form and behaviour; RAG supplies facts** — and getting that distinction right is usually the real answer."]
    ] },

    { t: "p", text: "**Prompt compression** was the other question here (*“have you used prompt conversion technique”*). The family: summarise older conversation turns rather than resending them verbatim; drop retrieved chunks' irrelevant sentences with contextual compression; move stable content into a cacheable static prefix so it is cheap rather than absent; and use token-level pruning such as LLMLingua where the prompt is long and repetitive. **The ordering principle is that removing the irrelevant beats compressing the relevant.**" },

    { t: "h2", n: "11", text: "Production: recovery, root cause and observability", id: "production" },

    {"kind": "trace", "title": "The signal that separates operators from readers", "caption": "**A user id is invaluable on a span and fatal as a Prometheus label**, because every distinct label value creates a new time series and a million users is a million series. That one distinction is the strongest thing to say on the observability question. **And the principle underneath the whole answer:** alert on symptoms, diagnose with causes — which is what keeps an alert set from growing into hundreds of rules nobody trusts.", "left": "what you emit", "codeW": 170, "vars": ["where it belongs", "why"], "steps": [{"code": "trace id", "state": ["propagated through every hop", "a metric spike leads to a trace"], "tone": "violet"}, {"code": "model name AND version", "state": ["a span attribute", "the 'worse last Tuesday' signal"], "changed": [0, 1], "tone": "violet"}, {"code": "prompt / completion tokens", "state": ["span attribute + counter metric", "cost, per request"], "changed": [0, 1], "tone": "good"}, {"code": "retrieved doc ids and scores", "state": ["span attribute", "replay a bad answer later"], "changed": [0, 1], "tone": "good"}, {"code": "user or tenant id", "state": ["ATTRIBUTE ONLY", "a label would be a million series"], "changed": [0, 1], "tone": "crit"}, {"code": "request duration, tool outcomes", "state": ["low-cardinality metrics", "SLOs and alerting"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-1_1-11-10"},

    { t: "p", text: "The second round was almost entirely this, and the questions build: recover automatically, build a remedy agent, track errors across millions of users, find the cause, deploy safely." },

    { t: "dl", items: [
      ["Automatic recovery — bound it by blast radius", "**Retry with backoff and jitter** for transient faults, idempotency keys so a retry cannot double-charge, **circuit breakers** so a failing dependency fails fast instead of consuming every worker, bulkheads so one tenant cannot exhaust the pool, graceful degradation (cached answer, smaller model, “try later”) and a dead-letter queue for what cannot be processed now."],
      ["What should never self-heal", "Anything irreversible, anything touching money, and **anything whose failure you have not diagnosed**. Automatic recovery that masks a real bug is how a corruption spreads quietly for a week — say this, because it is the judgement the question is testing."],
      ["The remedy agent, honestly", "An agent that detects a failure, diagnoses it and applies a fix is a lovely idea and a dangerous one. The safe version is **detect and diagnose automatically, act from a fixed playbook, and require approval for anything that writes**. A remedy agent with production credentials and a generative action space is an outage generator."],
      ["Errors across millions of users", "Structured JSON logs with a **trace id propagated through every hop**, aggregation by error class rather than by instance, tail-based sampling so you keep all the errors and 1% of the successes, and a cardinality budget on labels — user id as a Prometheus label will take the metrics backend down."],
      ["Finding the cause", "Alert on **symptoms** (SLO burn), diagnose with **causes**. The sequence: which SLO broke, when, correlate against the deploy timeline, then the trace for a failing request end to end, then the span that got slow or errored. Exemplars that link a metric spike to a specific trace are what make the last step a click rather than a search."]
    ] },

    { t: "code", lang: "text", title: "the signals worth emitting from an LLM system",
      code: `TRACES (OpenTelemetry) -- one span per hop, trace id through everything
  request -> retrieve -> rerank -> model call -> tool call -> response
  attributes per span:
    model name AND version      <- the "it got worse last Tuesday" signal
    prompt + completion tokens  <- cost, per request
    tool name, outcome          <- which tools fail
    retrieved doc ids, scores   <- replay a bad answer later
    cache hit / miss
    user or tenant id           <- as an ATTRIBUTE, never a metric label

METRICS (Prometheus) -- low cardinality, aggregate
  request_duration_seconds      histogram, by route and status
  llm_tokens_total              counter, by model and direction
  llm_cost_usd_total            counter, by model and tenant-tier
  tool_calls_total              counter, by tool and outcome
  retrieval_recall              gauge, from the offline eval job
  guardrail_blocks_total        counter, by rule

LOGS -- structured, with the trace id, so a metric spike leads to a trace`,
      caption: "**The attribute-against-label distinction is the one that separates operators from readers.** A user id is invaluable on a span and fatal as a Prometheus label: every distinct value creates a new time series, and a million users is a million series. The OpenTelemetry SDK gives you the traces and can export metrics to Prometheus, so it is one instrumentation layer rather than two." },

    { t: "dl", items: [
      ["Deployment and failure handling", "Blue-green or canary with automatic rollback on an SLO breach, health checks that actually exercise a dependency rather than returning 200, graceful shutdown that drains in-flight requests, **migrations that are backward compatible for one release** so a rollback does not meet a schema it cannot read, and feature flags so a prompt change can be reverted without a deploy."],
      ["The LLM-specific part", "**Pin the model version** and treat a provider's pointer alias as a dependency that can change under you. Shadow a new model against live traffic before switching. Keep the previous prompt behind a flag. And have a cheaper fallback model wired for the quota incident, while logging which model actually answered — otherwise a silent fallback looks like a mysterious week of degraded quality."]
    ] },

    { t: "h2", n: "12", text: "Fifty thousand documents, and the GIL", id: "scale" },

    {"kind": "trace", "title": "Threads for waiting, processes for computing", "caption": "**Threads were slower than doing it sequentially** — 0.68× — because only one thread executes Python bytecode at a time, so nothing overlaps and the GIL contention is pure added overhead. On IO the same pool gave 3.97× on four workers, because `sleep`, a socket read and a disk read all release the GIL. **For the 50k-document pipeline that maps directly:** processes for parsing (CPU-bound), async for the embedding calls (IO-bound at high concurrency), and threads mainly for wrapping a blocking library.", "left": "workload", "codeW": 160, "vars": ["sequential", "4 threads", "4 processes"], "steps": [{"code": "CPU-bound Python", "state": ["1936 ms", "2856 ms (0.68x)", "796 ms (2.43x)"], "tone": "crit"}, {"code": "IO-bound (sleep)", "state": ["2002 ms", "504 ms (3.97x)", "-"], "changed": [0, 1, 2], "tone": "good"}, {"code": "so: parsing PDFs", "state": ["-", "no", "YES - processes"], "changed": [0, 1, 2], "tone": "violet"}, {"code": "embedding API calls", "state": ["-", "ok, but async is better", "no"], "changed": [0, 1, 2], "tone": "violet"}, {"code": "thousands of concurrent IO", "state": ["-", "~1 MB stack each", "asyncio instead"], "changed": [0, 1, 2], "tone": "accent"}], "t": "diagram", "id": "dg-1_1-12-11"},

    { t: "p", text: "*“How would you process 50k documents, and how would you make it faster?”* **Answer with the pipeline and where the time actually goes**, not with “I'd parallelise it”." },

    { t: "dl", items: [
      ["Queue it, do not do it in the request", "Upload lands the file in object storage and enqueues a job. The API returns a job id immediately. **A synchronous 50k-document upload is a timeout with extra steps.**"],
      ["Make every stage idempotent and resumable", "Content hash as the document key, so a re-run skips what is done and a crash at document 38,000 does not restart from zero. This is the single most important property of a bulk pipeline."],
      ["Know the real costs per document", "Parsing a PDF is CPU-bound and often the largest share. Embedding is a network call you should **batch** — hundreds of chunks per request rather than one — and that batching is usually the biggest single speed-up. The vector upsert should be batched too."],
      ["Parallelise by stage, correctly", "Parsing across **processes** because it is CPU-bound; embedding across **async concurrency** because it is IO-bound; upserts batched and concurrent. Mixing those up is the common mistake."],
      ["Respect the limits", "Embedding APIs have rate limits, so backpressure and a token-bucket limiter, with retry on 429. Without backpressure a fast parser simply builds an unbounded queue in front of a slow embedder."],
      ["Track progress and failures per document", "A dead-letter table with the document id and the error. On 50k documents something will fail, and “it failed” without a list is not a recoverable state."]
    ] },

    { t: "p", text: "**Then: what are multiprocessing and multithreading?** The honest answer is about the GIL, and it is worth having measured it." },

    { t: "code", lang: "python", title: "four workers, measured",
      code: `# CPU-bound: 4 x 6,000,000 iterations of Python arithmetic
#   sequential              1936 ms   1.00x
#   ThreadPoolExecutor      2856 ms   0.68x   <- SLOWER than sequential
#   ProcessPoolExecutor      796 ms   2.43x
#
# IO-bound: 4 x sleep(0.5)
#   sequential              2002 ms   1.00x
#   ThreadPoolExecutor       504 ms   3.97x`,
      out: `python 3.11.3 | 4 workers

CPU-bound    sequential 1936 ms | threads 2856 ms (0.68x) | processes 796 ms (2.43x)
IO-bound     sequential 2002 ms | threads  504 ms (3.97x)`,
      caption: "**Threads were slower than doing it sequentially** on CPU work — 0.68× — because only one thread executes Python bytecode at a time and the switching is pure overhead. On IO they gave 3.97× on four workers, because `sleep`, a socket read and a disk read all release the GIL. That is the whole rule: **threads for waiting, processes for computing.**" },

    { t: "callout", kind: "insight", title: "The follow-up worth pre-empting",
      body: [
        { t: "p", text: "*“So when would you use asyncio instead of threads?”* — for high-concurrency IO. Threads cost about a megabyte of stack each and context-switch in the kernel, so thousands of them is expensive; async coroutines are cheap and thousands are ordinary. For a document pipeline: **processes for parsing, async for the embedding calls, and threads mainly for wrapping a blocking library that has no async version** via `asyncio.to_thread`." }
      ] },

    { t: "h2", n: "13", text: "Guardrails, RBAC and OAuth", id: "security" },

    {"kind": "layers", "title": "Five places a guardrail sits, and four layers of RBAC", "caption": "**A guardrail is a control that does not depend on the model cooperating** — which is why a system-prompt rule is never a security property, since the whole premise of prompt injection is that the model can be talked out of it. **And for RBAC the same logic gives four layers**, of which only the last cannot be talked past: identity from the session rather than a tool parameter, the tool list filtered by role so there is no declaration to call, the retrieval query scoped, and row-level security in the database.", "items": [{"label": "Input: PII redaction, injection classifier", "sub": "before the model sees it", "tone": "accent", "side": "guardrail"}, {"label": "Retrieval: filter chunks by permission", "sub": "access control, not ranking", "tone": "accent", "side": "guardrail"}, {"label": "Tool call: refuse, check args, require approval", "sub": "return a structured refusal, never raise", "tone": "violet", "side": "guardrail"}, {"label": "Output: secrets, PII, groundedness, schema", "sub": "before the user sees it", "tone": "violet", "side": "guardrail"}, {"label": "Runtime: max steps, max cost, timeouts", "sub": "bounds on the loop", "tone": "good", "side": "guardrail"}, {"label": "Identity from the session, never a parameter", "sub": "a user_id argument is model-supplied", "tone": "crit", "side": "RBAC"}, {"label": "Row-level security in the database", "sub": "the only layer an attacker cannot talk past", "tone": "crit", "side": "RBAC"}], "t": "diagram", "id": "dg-1_1-13-12"},

    { t: "p", text: "Guardrails came up three separate times in this interview, which is a strong hint about what they cared about. **A guardrail is a control that does not depend on the model cooperating** — and that definition is most of the answer." },

    { t: "table",
      head: ["Where", "What it does", "Example"],
      rows: [
        ["**Input**", "Before the model sees it", "PII redaction, injection classifier, topic and length limits"],
        ["**Retrieval**", "Before context is assembled", "Filter chunks by the caller's permissions — this is access control, not ranking"],
        ["**Tool call**", "Before a side effect", "Refuse the call, check the argument against the caller, require approval over a threshold"],
        ["**Output**", "Before the user sees it", "Secret scanning, PII, groundedness check, schema validation"],
        ["**Runtime**", "Bounds on the loop", "Max steps, max cost per task, timeouts"]
      ] },

    { t: "callout", kind: "good", title: "The sentence to say about guardrails",
      body: [
        { t: "p", text: "*“An instruction in the prompt is a request; a check in code is a control. Anything that must hold goes in a `before_tool` callback or in the query itself — **I would never rely on the system prompt for a security property**, because the whole premise of prompt injection is that the model can be talked out of it.”*" },
        { t: "p", text: "Then the implementation detail that shows it has been built: **the tool-call guardrail returns a structured refusal rather than raising**, so the model relays a sentence the user can act on and does not retry — and the block is logged, because “how often does this fire” is a question you want answerable on day one." }
      ] },

    { t: "dl", items: [
      ["RBAC, implemented so the model cannot bypass it", "Identity comes from the authenticated session, **never from a tool parameter** — a `user_id` argument is something the model fills in from a conversation an attacker may be in. Resolve roles server-side, filter the tool list by role so a user without permission has no declaration to call, scope the retrieval query to permitted documents, and enforce in the database with row-level security. **Four layers, and the last one is the only one an attacker cannot talk past.**"],
      ["ABAC where RBAC is too coarse", "Roles multiply badly once rules involve the resource (“owns it”, “same region”, “not yet signed”). Attribute-based policy evaluated per request handles that without a role explosion."],
      ["OAuth 2.0 / 2.1, in one breath", "**Delegated authorisation, not authentication**: it lets an application act on a user's behalf without the user handing over a password. The user is redirected to the authorisation server, authenticates there, approves a scope, and the application receives a short-lived **authorisation code** which it exchanges server-side for an access token. The code-plus-exchange exists so the token never travels through the browser."],
      ["The details that show you have implemented it", "**Authorisation Code with PKCE** is the flow to use for everything now, including server-side apps; the implicit and password grants are gone in 2.1. Access tokens short-lived, refresh tokens rotated. Validate the signature, the expiry **and the audience** — the audience check is the one people skip, and it is what stops a token minted for another service being replayed at yours. And OpenID Connect is the identity layer on top; OAuth alone does not tell you who the user is."]
    ] },

    { t: "h2", n: "14", text: "The coding round: trapping rain water", id: "coding" },

    {"kind": "trace", "title": "Three solutions, in the order to present them", "caption": "**Do not open with the two-pointer version** — jumping to the trick reads as memorised, and the progression is what an easy-to-medium question is actually assessing. Say the brute force, notice the repeated scans, precompute the maxima, then notice you only need the *smaller* of the two maxima and the space collapses. **The invariant to say out loud:** water above a bar is `min(tallest left, tallest right) - height`, and when `h[lo] < h[hi]` you already know something at least as tall sits on the right, so the left maximum alone decides it.", "left": "solution", "codeW": 170, "vars": ["time", "space", "n = 20,000"], "steps": [{"code": "brute force: scan both ways", "state": ["O(n^2)", "O(1)", "8305.6 ms"], "tone": "crit"}, {"code": "prefix and suffix maxima", "state": ["O(n)", "O(n)", "82.9 ms"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "two pointers", "state": ["O(n)", "O(1)", "14.5 ms"], "changed": [1, 2], "tone": "good"}, {"code": "and the edge cases", "state": ["[], [5], [3,3,3]", "monotonic up or down", "all return 0"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-1_1-14-13"},

    { t: "p", text: "Easy-to-medium, and the interviewer is watching how you get there. **Present three solutions in increasing quality**, say the complexity of each, and only then write the best one." },

    { t: "code", lang: "python", title: "the one to write, after describing the other two",
      code: `def trap(h: list[int]) -> int:
    """Water trapped above each bar. O(n) time, O(1) space."""
    lo, hi = 0, len(h) - 1
    left_max = right_max = total = 0
    while lo < hi:
        if h[lo] < h[hi]:
            # h[hi] is at least as tall, so SOMETHING on the right is
            # >= h[lo]: the left wall alone decides the water here.
            left_max = max(left_max, h[lo])
            total += left_max - h[lo]
            lo += 1
        else:
            right_max = max(right_max, h[hi])
            total += right_max - h[hi]
            hi -= 1
    return total`,
      out: `correctness, all three agree:
  [0,1,0,2,1,0,1,3,2,1,2,1] -> 6
  [4,2,0,3,2,5]             -> 9
  [], [5], [3,3,3], [5,4,3,2,1], [1,2,3,4,5] -> 0

timing, n = 20,000:
  brute        O(n^2)      8305.6 ms
  prefix       O(n)/O(n)     82.9 ms
  two-pointer  O(n)/O(1)     14.5 ms`,
      caption: "**The insight to say out loud is the invariant**: water above a bar is `min(tallest left, tallest right) - height`. The two-pointer version works because when `h[lo] < h[hi]`, you already know a bar at least as tall exists on the right, so the left maximum alone determines the answer at `lo` — you never need the exact right maximum." },

    { t: "dl", items: [
      ["Say the brute force first, then improve it", "*“For each bar, scan both ways for the tallest — O(n²). The scans repeat work, so precompute prefix and suffix maxima: O(n) time, O(n) space. Then notice you only need the smaller of the two, which gives O(1) space with two pointers.”* That narration is the thing being assessed."],
      ["Name the edge cases before you are asked", "Empty list, one or two bars, all equal, strictly increasing, strictly decreasing — all return 0. Saying them unprompted is worth more than the optimal solution arrived at silently."],
      ["Do not start with the two-pointer version", "Jumping straight to the trick reads as memorised. The progression demonstrates how you think, which is what an easy-to-medium question is for."]
    ] },

    { t: "callout", kind: "insight", title: "What this interviewer was checking throughout",
      body: [
        { t: "p", text: "Their own note was that every answer was checked for whether it was theoretical or lived. **The tells are small and consistent:** a number attached to a claim, a trade-off you accepted rather than a technique you listed, a failure you have actually seen, and “I have not measured that myself” where it is true." },
        { t: "p", text: "The honest version of an answer you half-know beats the confident version, because the next question goes one level deeper and a bluff collapses there in front of the person deciding." }
      ] },

    { t: "exercise", kind: "practice", title: "Run the chain out loud, with a timer", difficulty: "core", minutes: 30,
      prompt: "Answer these aloud in order, ninety seconds each: RAG against agentic RAG; reranking; cross-encoder against bi-encoder; rerank without a cross-encoder; accuracy dropped to 60%; KV cache memory; temperature and top_p; errors across millions of users; 50k documents; guardrails; RBAC; OAuth. Then go back and attach one number to each — a cost multiple, a latency band, a memory figure, a measured speed-up — and mark the answers where you could not. Finally, write out trapping rain water in one pass without running it, then run it against the five edge cases.",
      hints: [
        "Ninety seconds is the real constraint: a four-minute answer gets interrupted.",
        "The 'cannot be precomputed' clause is the whole cross-encoder answer.",
        "For the debug question, 'when did it start' comes before any hypothesis."
      ],
      solution: {
        notes: [
          { t: "p", text: "The answers you cannot attach a number to are the ones you have read rather than built — which is exactly the distinction this interviewer said they were checking. The fix is not to invent a number; it is to say the order of magnitude and that you have not measured it, which is both true and much harder to catch out." },
          { t: "p", text: "Writing the rain-water solution without running it, then testing the five edge cases, reproduces the actual pressure: in a live round you cannot iterate against a test runner. The empty list and the single bar are the two that catch people who typed it from memory." }
        ]
      } }

  ],

  takeaways: [
    "**RAG against agentic RAG is a control-flow difference**: one fixed retrieval against the model deciding whether, how and how often — at two to four times the cost. Cap the retries.",
    "**A cross-encoder cannot be precomputed**, because the query–document pair does not exist until the query arrives. Everything about the two-stage design follows from that.",
    "**To rerank without one:** reciprocal rank fusion first (no model), MMR for redundancy, a listwise LLM reranker for accuracy, metadata boosts underneath.",
    "**Diagnose before prescribing in RAG:** was the right chunk retrieved, and was it used? Almost every technique helps only one of the two.",
    "**Answer the latency question as a budget** — retrieval is 50–150 ms of a multi-second answer, so generation usually dominates.",
    "**Name evaluation metrics per layer**, lead with groundedness, and use tool-trajectory accuracy as the agentic metric and the model-upgrade regression test.",
    "**Debug a quality drop by asking when it started before what caused it** — a cliff and a slope have disjoint cause lists. A silently updated model version is the most-forgotten cause.",
    "**The KV cache is the memory bottleneck:** 250 GiB for sixteen concurrent 32k conversations on a 7B model whose weights are 14 GiB. GQA 4×, MQA 32×, fp8 another 2×, PagedAttention for the fragmentation.",
    "**Temperature divides logits before the softmax; top_p truncates after** — and they interact: the same top_p=0.9 kept 2 tokens at T=1.0 and 4 at T=2.0.",
    "**Catastrophic forgetting is over-training on a narrow task.** LoRA is the first mitigation because the base weights are untouched; often the real answer is that the problem was retrieval, not fine-tuning.",
    "**User id is an attribute, never a metric label** — a million users is a million time series, and that is how a metrics backend dies.",
    "**Alert on symptoms, diagnose with causes**, and propagate one trace id through every hop so a metric spike leads to a trace.",
    "**Threads for waiting, processes for computing** — measured at 0.68× for threads on CPU work and 3.97× on IO.",
    "**A guardrail is a control that does not depend on the model cooperating**, which is why a system-prompt rule is never a security property.",
    "**Identity comes from the session, never from a tool parameter**, and the database enforces it — the only layer an attacker cannot talk past.",
    "**OAuth is delegated authorisation, not authentication:** Authorisation Code with PKCE, short-lived tokens, and verify signature, expiry and audience."
  ],

  quiz: {
    title: "Check your answers",
    questions: [
      {
        stem: "Why can a cross-encoder not be the first-stage retriever?",
        options: [
          "It is less accurate than a bi-encoder",
          "It scores the query and document together, so nothing can be precomputed — a million candidates means a million forward passes at query time",
          "It cannot handle long documents",
          "It needs a GPU"
        ],
        answer: 1,
        why: "The bi-encoder's whole advantage is that the corpus is embedded once and indexed. The cross-encoder's advantage — full attention across the pair — is exactly what makes precomputation impossible, which is why the two-stage design exists."
      },
      {
        stem: "You have no cross-encoder and no budget for an LLM reranker. What do you reach for first?",
        options: [
          "Increase k and hope",
          "Reciprocal rank fusion over dense and BM25 — no model, and it sidesteps the two score scales being incomparable",
          "Maximal marginal relevance",
          "Re-embed the corpus with a larger model"
        ],
        answer: 1,
        why: "RRF combines by rank rather than score, which is why it is robust without calibration. MMR is the next move but it fixes redundancy, which is a different failure from poor relevance."
      },
      {
        stem: "An agentic system's accuracy drops to 60%. What do you establish before forming any hypothesis?",
        options: [
          "Which model is being used",
          "Whether the measurement itself changed, and whether the drop was a cliff or a slope — a cliff points at a deploy or config change, a slope at drift or corpus growth",
          "The retrieval recall",
          "The prompt version"
        ],
        answer: 1,
        why: "The two shapes have disjoint cause lists, so that single question halves the search space before you look at anything. Starting at 'which layer' is where most people begin, which is why starting earlier reads as experience."
      },
      {
        stem: "A 7B model, 32k context, batch 16, fp16. The KV cache is 250 GiB. Which change gives 32× rather than 4×?",
        options: [
          "Quantising the cache to fp8",
          "Multi-query attention — one KV head for all query heads, against grouped-query attention's eight",
          "PagedAttention",
          "Prefix caching"
        ],
        answer: 1,
        why: "The cache scales with KV head count, so 32 → 1 is 32× and 32 → 8 is 4×. MQA costs more quality, which is why GQA is the usual compromise; fp8 is another 2× and multiplies with either."
      },
      {
        stem: "Measured on one distribution, top_p=0.9 kept 2 tokens at T=1.0 and 4 tokens at T=2.0. Why?",
        options: [
          "top_p is applied before temperature",
          "Temperature reshapes the distribution that top_p then measures — flattening it spreads probability mass, so more tokens are needed to reach 0.9",
          "The tokenizer changed",
          "Because top_p is a token count, not a probability mass"
        ],
        answer: 1,
        why: "Temperature divides the logits before the softmax and top_p truncates after it, so they are not independent dials. The usual advice follows: tune one and leave the other, and for tool-calling keep temperature near 0."
      },
      {
        stem: "Threads were measured at 0.68× against sequential on CPU-bound Python. Why slower, not just not-faster?",
        options: [
          "Thread creation cost dominates",
          "Only one thread executes Python bytecode at a time, so no work overlaps and the GIL contention and context switching are pure added overhead",
          "The work was too small",
          "ThreadPoolExecutor is inefficient"
        ],
        answer: 1,
        why: "On IO the same pool gave 3.97×, because sleeping and socket reads release the GIL. Hence the rule: threads for waiting, processes for computing — and asyncio when the waiting is at high concurrency."
      },
      {
        stem: "Why must a user id never be a Prometheus label?",
        options: [
          "It is personal data",
          "Every distinct label value creates a new time series, so a million users is a million series — it belongs as a span attribute instead",
          "Labels must be numeric",
          "It would break the histogram buckets"
        ],
        answer: 1,
        why: "Cardinality is what kills a metrics backend. The same identifier is invaluable on a trace span, where it costs nothing structural and lets you find one user's failing request."
      },
      {
        stem: "What makes a tool-call check a guardrail rather than an instruction?",
        options: [
          "It is written in the system prompt more forcefully",
          "It runs in code before the side effect and refuses regardless of what the model decided — an instruction is a request, a check is a control",
          "It is validated by the model",
          "It is documented in the tool description"
        ],
        answer: 1,
        why: "The premise of prompt injection is that the model can be talked out of an instruction, so no security property can rest on one. The implementation detail that shows experience is returning a structured refusal rather than raising, so the model relays it and does not retry."
      },
      {
        stem: "In the two-pointer rain-water solution, why is `left_max` alone sufficient when `h[lo] < h[hi]`?",
        options: [
          "Because the array is sorted",
          "Because h[hi] is at least as tall, so some bar on the right is ≥ h[lo] — the minimum of the two maxima is therefore the left one, and the exact right maximum is never needed",
          "Because water only flows left",
          "Because the pointers meet in the middle"
        ],
        answer: 1,
        why: "The invariant is that water above a bar is min(tallest left, tallest right) − height. Knowing which side is the minimum is enough; the other side's exact value is irrelevant, which is what removes the O(n) space."
      }
    ]
  },

  interview: {
    title: "The follow-ups they asked",
    sub: "Each one removed a tool and asked what remained",
    questions: [
      {
        level: "advanced",
        q: "How do you rerank your chunks without a cross encoder?",
        strong: "Reciprocal rank fusion first — run dense and BM25 and combine by rank with 1/(k+rank), which needs no model and sidesteps the scores being incomparable. Then MMR if the problem is redundancy rather than relevance. A listwise LLM reranker if accuracy justifies one call. And metadata boosts on recency and source underneath, tuned on a labelled set.",
        answer: [
          { t: "p", text: "Leading with the no-model option is what the question is for: it checks whether you reach for a technique or for a dependency." },
          { t: "p", text: "Distinguishing redundancy from relevance shows you have looked at real retrieval output, because five near-identical chunks are obvious in the results and invisible in the metrics." },
          { t: "p", text: "Saying 'listwise' rather than just 'use an LLM' signals you have costed it: one call for the batch rather than one per candidate." }
        ]
      },
      {
        level: "advanced",
        q: "Your agentic system's accuracy drops to 60%. Walk me through fixing it.",
        strong: "First, is the measurement real — did the eval set, the judge prompt or the scoring code change? Then when it started, because a cliff points at a deploy, a config change or a model version and a slope points at drift or corpus growth. Then what changed at that moment. Then replay failing cases and look at the trace to localise the layer: right chunk missing is retrieval, right chunk ignored is generation, wrong tool is trajectory. Then bisect one change at a time against the same eval set, fix it, and add the case to the golden set so it cannot come back silently.",
        answer: [
          { t: "p", text: "Checking the measurement before the system is the step that marks someone who has chased a phantom regression caused by a changed judge prompt." },
          { t: "p", text: "The cliff-or-slope question is the highest-value sentence in the answer, because the two shapes have disjoint cause lists." },
          { t: "p", text: "Finishing with the golden-set entry closes the loop: a fix nobody encoded as a test is a fix that regresses, and that is the difference between debugging and engineering." }
        ]
      },
      {
        level: "advanced",
        q: "How will you keep track of errors in production with millions of users, and find what caused an issue?",
        strong: "Structured logs with a trace id propagated through every hop, aggregated by error class rather than instance. Tail-based sampling so I keep every error and about one per cent of successes. A strict cardinality budget on metric labels — user id is a span attribute, never a Prometheus label. Then alert on symptoms via SLO burn rate and diagnose with causes: which SLO broke, when, correlate against the deploy timeline, open the trace for a failing request, find the span that errored or got slow. Exemplars linking a metric spike to a specific trace make that last step a click.",
        answer: [
          { t: "p", text: "The attribute-versus-label distinction is the detail that separates someone who has operated a metrics backend from someone who has configured one." },
          { t: "p", text: "Alert on symptoms, diagnose with causes is the principle that stops an alert set growing to hundreds of rules nobody trusts." },
          { t: "p", text: "For an LLM system specifically, the model version as a span attribute is what makes 'it got worse last Tuesday' answerable at all — a provider can move a pointer alias with nothing in your repository changing." }
        ]
      }
    ]
  }
});
