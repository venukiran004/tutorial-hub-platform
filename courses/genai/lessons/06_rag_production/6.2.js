EC.receiveLesson({
  id: "6.2",

  lede: "The common form gives a production checklist and a scalability ladder \u2014 FAISS under 100K documents, a single-node database to 10M, distributed beyond that. The ladder is sound and the thresholds are about the wrong quantity. Measured in 5.5, exact search over 100,000 vectors took **8.4 ms** and over a million an extrapolated **75 ms**, which is nothing against generation. What actually forces each step is **memory and operations**: a million 384-dimension vectors is **1.5 GB resident**, and an HNSW index over ten million takes an **hour to build**, which turns re-indexing from a deploy step into a scheduled job.",

  objectives: [
    "Identify what actually forces each step up the scalability ladder",
    "Budget the latency of a retrieval call against the generation it precedes",
    "Choose an update strategy from how often documents change",
    "Apply the production checklist and say which items are load-bearing",
    "Plan a re-index that does not take the system down"
  ],

  prerequisites: ["5.5", "6.1"],

  blocks: [

    { t: "h2", n: "01", id: "ladder", text: "The ladder, and what each rung is really about",
      sub: "Not search speed" },

    { t: "p", text: "The thresholds \u2014 under 100K, 100K to 10M, 10M to 1B, beyond \u2014 are the standard advice and they correlate with something real. 5.5 measured what that something is, and it is not latency." },

    { t: "code", lang: "python", title: "5.5 \u2014 exact search against corpus size", code: `for n in (1_000, 10_000, 100_000, 1_000_000, 10_000_000):
    idx = faiss.IndexFlatIP(D)
    idx.add(BIGE[:n])
    idx.search(QV[:1], 10)`,
      out: `  vectors        flat search ms   MB at 384 dims
  1,000                   0.100              1.5
  10,000                  1.404             15.4
  100,000                 8.442            153.6
  1,000,000              74.548           1536.0   (extrapolated linearly)
  10,000,000            854.505          15360.0   (extrapolated linearly)`,
      hl: [4],
      caption: "Brute force stays usable to a million vectors. The memory column is the one that moves first." },

    { t: "callout", kind: "insight", title: "Memory binds before latency does",
      body: [
        { t: "p", text: "At a hundred thousand vectors, exact search is 8.4 ms and the index is 154 MB \u2014 both comfortable. At a million it is 75 ms and **1.5 GB**, and the latency is still small against a generation taking hundreds of milliseconds (3.1) while the memory is now a real constraint on the process." },
        { t: "p", text: "So the first rung of the ladder is crossed because the index stopped fitting next to the application, not because search got slow. That matters because it changes what you do about it: dimension reduction and quantization attack memory directly, and 5.3 measured truncating 384 dimensions to 128 saving two thirds of the storage for five points of recall@5." },
        { t: "p", text: "Only at ten million does latency become the binding constraint on its own \u2014 855 ms of brute-force search is no longer acceptable in a request path, and that is the point where an approximate index stops being optional." }
      ] },

    { t: "callout", kind: "note", title: "And operations bind before either",
      body: [
        { t: "p", text: "In practice most teams move to a dedicated vector store well below any of these thresholds, and for reasons the ladder does not mention: persistence across restarts, incremental updates, backups, access control, and sharing one index between several processes." },
        { t: "p", text: "5.5\u2019s conclusion stands \u2014 if you already run PostgreSQL, pgvector gives all of that for one extension rather than a second datastore with its own backup story and its own on-call page. The ladder is a guide to *index structure*; the store is chosen on operations." }
      ] },

    { t: "h2", n: "02", id: "budget", text: "The latency budget",
      sub: "Retrieval is the cheap part of the request" },

    { t: "p", text: "A RAG request is retrieval plus generation, and the two are not close in cost. Putting the module\u2019s measured figures side by side makes the budget obvious." },

    { t: "table",
      head: ["Stage", "Measured", "Share of a ~1 s request"],
      rows: [
        ["Embed the query", "part of the 11 ms below", "~1%"],
        ["Vector search, 1,187 chunks", "**11 ms** (5.1)", "~1%"],
        ["Vector search, 200k, HNSW", "**9.2 ms** (5.5)", "~1%"],
        ["BM25 over 1,187 chunks", "sub-millisecond, 0.18 s to index (5.9)", "negligible"],
        ["RRF fusion", "nine lines of arithmetic", "negligible"],
        ["Cross-encoder over 20 candidates", "**2,405 ms on CPU** (5.9)", "**dominant**"],
        ["HyDE \u2014 a generation before the search", "hundreds of ms (5.8)", "**dominant**"],
        ["Generation of the answer", "hundreds of ms (3.1)", "the rest"]
      ] },

    { t: "callout", kind: "insight", title: "Only two stages matter, and both are model calls",
      body: [
        { t: "p", text: "Everything that is actually *retrieval* \u2014 embedding, searching, fusing \u2014 is single-digit milliseconds. The two expensive stages are the cross-encoder and the HyDE generation, and both are models rather than indexes." },
        { t: "p", text: "That reframes latency work. Tuning `ef_search` or `nprobe` to shave milliseconds off an index that costs 9 ms is optimising 1% of the request. Deciding whether the re-ranker is on, and at what shortlist depth, is optimising the other 99% \u2014 and 5.9 measured the depth as a direct linear dial, 524 ms at depth 5 against 3,961 ms at depth 50." },
        { t: "p", text: "The latency list puts ANN tuning at number two and query caching at number four. On these measurements the order is nearly reversed: cache first, decide about the re-ranker second, and tune the index only once it is actually the bottleneck." }
      ] },

    { t: "viz", title: "Where a RAG request's time goes", caption: "Retrieval is single-digit milliseconds. The expensive stages are the optional model calls.",
      svg: `<svg viewBox="0 0 760 276" width="100%" role="img" aria-label="Latency budget of a RAG request">
  <text x="16" y="22" class="s-label">ONE REQUEST, MEASURED STAGES</text>

  <text x="16" y="52" class="s-sub">vector search</text>
  <rect x="150" y="40" width="5" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="165" y="54" class="s-mono" style="fill:var(--good)">11 ms</text>

  <text x="16" y="82" class="s-sub">BM25 + RRF</text>
  <rect x="150" y="70" width="3" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="165" y="84" class="s-mono" style="fill:var(--good)">under 1 ms</text>

  <text x="16" y="112" class="s-sub">generation</text>
  <rect x="150" y="100" width="180" height="18" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="340" y="114" class="s-mono" style="fill:var(--accent)">hundreds of ms \u2014 unavoidable</text>

  <text x="16" y="142" class="s-sub">HyDE</text>
  <rect x="150" y="130" width="180" height="18" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="340" y="144" class="s-mono" style="fill:var(--warn)">a whole generation BEFORE the search</text>

  <text x="16" y="172" class="s-sub">cross-encoder</text>
  <rect x="150" y="160" width="500" height="18" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="166" y="174" class="s-mono" style="fill:var(--crit)">2,405 ms on CPU for 20 candidates \u2014 219\u00d7 the search</text>

  <line x1="16" y1="200" x2="744" y2="200" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="226" class="s-mono" style="fill:var(--accent)">tuning the index optimises ~1% of the request</text>
  <text x="16" y="248" class="s-mono" style="fill:var(--crit)">deciding whether the re-ranker runs, and at what depth, optimises the rest</text>
  <text x="16" y="270" class="s-sub">so the latency list is nearly in reverse order for this shape of system</text>
</svg>` },

    { t: "h2", n: "03", id: "updates", text: "Keeping the index current",
      sub: "The strategy follows how often documents change" },

    { t: "p", text: "5.1 established that index time and query time run on different clocks. The update strategy is a decision about how fast the slow clock ticks, and there are three answers." },

    { t: "dl", items: [
      { k: "Full rebuild", v: "Re-embed everything on a schedule. Simple, idempotent, and the only option when the embedding model changes \u2014 which 6.8 shows is a special case that *requires* it. Cost scales with the whole corpus: 13.2 s for 360,000 characters here, so an hour for a corpus a few hundred times larger." },
      { k: "Incremental by change detection", v: "Hash each document, re-embed only what changed. The recommendation, and the right default: a content hash over a few hundred documents is milliseconds, and it turns a full rebuild into a handful of chunks." },
      { k: "Event-driven", v: "Re-embed on a document-change event rather than on a schedule. Lowest staleness, and it needs the source system to emit events reliably \u2014 which is usually the hard part rather than the embedding." }
    ] },

    { t: "callout", kind: "good", title: "Hashing is the cheapest thing in this lesson",
      body: [
        { t: "p", text: "A SHA-256 over a document is microseconds; embedding its chunks is seconds. So the check that decides *whether* to re-embed costs a tiny fraction of the work it avoids, and it is correct rather than heuristic \u2014 a changed byte changes the hash." },
        { t: "p", text: "Store the hash alongside the vectors and use it as the record id, as the usual suggestion is. Re-ingesting identical content then overwrites the same row instead of creating a duplicate, which also removes the deduplication problem 6.8 runs into." },
        { t: "p", text: "Store an `updated_at` with it too. It costs nothing, it makes freshness auditable, and it gives you a tiebreak for preferring recent chunks when two are equally relevant." }
      ] },

    { t: "h2", n: "04", id: "cutover", text: "Re-indexing without an outage",
      sub: "Blue-green, because the alternative is answering from a half-built index" },

    { t: "p", text: "A full rebuild has a failure mode that incremental updates do not: while it runs, the index is partially populated. Queries against it return whatever has been written so far, which is worse than stale \u2014 it is arbitrary." },

    { t: "ol", items: [
      "**Build the new index alongside the old one.** It costs the memory of both for the duration, which is the price of not serving from a half-built index.",
      "**Validate it on the evaluation set before any traffic reaches it.** 6.1\u2019s metrics are deterministic and cheap, so this is a gate rather than a judgement call \u2014 and it is exactly what catches a bad ingest before users do.",
      "**Cut over atomically**, by swapping a pointer rather than by migrating records.",
      "**Keep the old index** until the new one has served real traffic for a while. Rolling back is then a pointer swap rather than a rebuild."
    ] },

    { t: "callout", kind: "warn", title: "An embedding model change is not an update, it is a migration",
      body: [
        { t: "p", text: "6.8 measures what happens when query and index embeddings come from different models: recall fell from 95% to 50% with **nothing raising an error**, because the dimensionality happened to match." },
        { t: "p", text: "So changing the embedding model requires re-embedding the entire corpus into a new index and cutting over atomically. There is no incremental path \u2014 a half-migrated index is one where some vectors are comparable to the query and some are noise, and no amount of recall tuning fixes it." },
        { t: "p", text: "Pin the embedding model as a versioned dependency and treat a version bump as a corpus migration with a blue-green cutover. That is the whole of the advice on this and it is correct." }
      ] },

    { t: "h2", n: "05", id: "checklist", text: "The checklist, weighted",
      sub: "Ten items, and they are not equal" },

    { t: "table",
      head: ["Checklist item", "What this module measured", "Weight"],
      rows: [
        ["Hybrid search (BM25 + vector)", "100% recall@5 against 95% and 90% alone (5.9)", "**High** \u2014 nine lines, no model, no latency"],
        ["Re-ranking (cross-encoder)", "Helped a weak first stage, hurt a strong one (5.9, 6.1)", "**Conditional** \u2014 measure before and after"],
        ["Evaluation pipeline", "Deterministic IR metrics, free, CI-able (6.1)", "**Highest** \u2014 nothing else is decidable without it"],
        ["Caching", "Semantic caching is a latency feature, not a cost one (5.13)", "Medium \u2014 and the threshold is a risk decision"],
        ["Metadata filtering", "Pre-filter beats post-filter and beats routing (5.11, 6.8)", "**High** where the predicate is exact"],
        ["Source citations", "Resolution is four lines; support is a different problem (5.13)", "**High** \u2014 cheap and load-bearing for trust"],
        ["Fallback for no context", "Governs the 5% of queries retrieval misses (5.7)", "**High** \u2014 this is where hallucination lives"],
        ["Monitoring", "Log retrieval scores, not just ids (5.13)", "High \u2014 and scores are the part usually dropped"],
        ["Incremental indexing", "A hash check costs milliseconds (6.8)", "**High** \u2014 cheapest item on the list"],
        ["PII filtering on retrieval", "Pre-filter or leak; post-filtering still reads the data (6.8)", "**Mandatory** where tenancy exists"]
      ] },

    { t: "exercise", kind: "analysis", title: "Build the latency and capacity budget for your system", difficulty: "core", minutes: 30,
      body: "Measure or estimate each stage of your retrieval pipeline separately \u2014 query embedding, vector search, sparse search, fusion, re-ranking, generation \u2014 and express each as a share of total request time. Then compute the index memory at your current corpus size and at ten times it, and state which constraint binds first as you scale.",
      requirements: [
        "Measure each stage independently rather than timing the whole request",
        "Include any optional model call (re-ranking, query rewriting) as its own line",
        "Compute index memory as vectors \u00d7 dimensions \u00d7 4 bytes, plus any graph overhead",
        "Project to 10\u00d7 and 100\u00d7 the corpus and say what breaks first",
        "State which single change would most reduce p99 latency"
      ],
      hint: "Time the stages separately before optimising any of them. The stage people tune is usually the one measured here at about 1% of the request.",
      solution: { lang: "python", title: "the budget, from this module's measurements", code: `STAGES = [                       # measured across M5 and M6
    ("embed query + vector search", 11),          # 5.1, 1,187 chunks
    ("BM25 + RRF fusion",            1),          # 5.9
    ("cross-encoder, 20 candidates", 2405),       # 5.9, CPU
    ("generation",                   800),        # 3.1, order of magnitude
]
total = sum(ms for _, ms in STAGES)
for name, ms in STAGES:
    print("%-30s %8d ms %7.1f%%" % (name, ms, 100 * ms / total))

# memory, at three corpus sizes
D = 384
for n in (1_187, 100_000, 1_000_000, 10_000_000):
    print("%12s vectors  %8.1f MB  (+17%% if HNSW M=32)"
          % ("{:,}".format(n), n * D * 4 / 1e6))`,
        out: `  embed query + vector search          11 ms     0.3%
  BM25 + RRF fusion                     1 ms     0.0%
  cross-encoder, 20 candidates       2405 ms    74.8%
  generation                          800 ms    24.9%

       1,187 vectors       1.8 MB  (+17% if HNSW M=32)
     100,000 vectors     153.6 MB  (+17% if HNSW M=32)
   1,000,000 vectors    1536.0 MB  (+17% if HNSW M=32)
  10,000,000 vectors   15360.0 MB  (+17% if HNSW M=32)`,
        notes: [
          { t: "p", text: "**Retrieval is 0.3% of this request and the re-ranker is 75%.** Any latency work that starts with the index is optimising the wrong stage by two orders of magnitude \u2014 and the cross-encoder figure is CPU-bound, so the first question is whether it is being served on the right hardware at all." },
          { t: "p", text: "**The ordering reverses the latency list.** It puts ANN tuning second and query caching fourth; on these measurements caching and the re-ranker decision come first, and index tuning matters only once it is actually the bottleneck \u2014 which on a sub-million corpus it is not." },
          { t: "p", text: "**Memory is the scaling constraint, not search time.** A million vectors is 1.5 GB and searches in an extrapolated 75 ms; ten million is 15 GB and 855 ms. The memory becomes awkward a full order of magnitude before the latency does." },
          { t: "p", text: "**So the levers are in a different order than the ladder suggests**: reduce dimensions (5.3 measured 384 \u2192 128 saving two thirds for five recall points), then quantize, then shard. Index structure is the last of these, not the first." },
          { t: "p", text: "One caveat on the arithmetic: the generation figure is an order-of-magnitude placeholder rather than a measurement of any particular model, and the cross-encoder number is CPU. On a GPU-served stack the re-ranker falls to tens of milliseconds and generation dominates instead \u2014 which changes the percentages but not the conclusion that the index is not the problem." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Retrieval is fast and small until it is neither, and the thing that changes first is memory. Latency becomes a problem an order of magnitude later, and only if you have not already made the index smaller." },
        { t: "p", text: "And within a request, the expensive parts are the model calls you chose to add. The index is almost never where the time goes." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur RAG p99 is 4 seconds and we are told to fix it. Where do you start?\u201d**" },
        { t: "p", text: "By timing the stages separately, because the stage people reach for is usually about 1% of the request. On my own pipeline the vector search was 11 ms and the cross-encoder over twenty candidates was 2,405 ms \u2014 219 times as much, and nearly three quarters of the whole request." },
        { t: "p", text: "So the first questions are whether the re-ranker is on, how deep its shortlist is, and whether it is running on CPU. Shortlist depth is a direct linear dial \u2014 I measured 524 ms at depth 5 against 3,961 ms at depth 50 \u2014 and recall was flat from 20 to 50, so there is often a large cut available for nothing." },
        { t: "p", text: "The second is whether any query rewriting is on the critical path. HyDE needs a full generation *before* the search starts, so it adds a complete model call in series \u2014 and the hypothetical only needs the right shape, so a much smaller model can produce it." },
        { t: "p", text: "What I would not start with is ANN tuning. On a corpus under a million vectors the index is single-digit milliseconds, and `ef_search` or `nprobe` changes are moving a number that rounds to zero in this budget." },
        { t: "p", text: "And I would check the cache hit rate before any of it, since the cheapest request is one that does not run. With the caution from 5.13 that a semantic cache's threshold is a correctness decision rather than a performance one \u2014 so I would want to see how its negative test set was built before trusting the hit rate it reports." }
      ] }
  ],

  takeaways: [
    "**The scalability ladder correlates with something real, and it is not search speed.** Exact search is 8.4 ms at 100k vectors and an extrapolated 75 ms at a million.",
    "**Memory binds first**: a million 384-dimension vectors is 1.5 GB resident, which constrains the process long before 75 ms constrains the request.",
    "**Latency binds only around ten million vectors**, where brute force reaches 855 ms and an approximate index stops being optional.",
    "**Operations bind before either** \u2014 persistence, backups, incremental updates and sharing an index between processes move most teams to a store well below any threshold.",
    "**Retrieval is ~1% of a request.** Search is 11 ms, BM25 and fusion are sub-millisecond; the cross-encoder was 2,405 ms on CPU and generation hundreds more.",
    "**So the expensive stages are the optional model calls**, which nearly reverses the latency-optimisation order \u2014 cache and re-ranker decisions first, index tuning last.",
    "**Hash documents to decide what to re-embed.** The check is microseconds against seconds of embedding, and it is exact rather than heuristic.",
    "**Use the hash as the record id** so re-ingesting identical content overwrites instead of duplicating, and store `updated_at` for auditable freshness.",
    "**Rebuild blue-green and validate on the evaluation set before cutover**, because a half-built index returns arbitrary results rather than stale ones.",
    "**An embedding model change is a migration, not an update** \u2014 6.8 measures recall falling 95% to 50% with no error raised when the dimensions happen to match."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Exact search over a million 384-dimension vectors takes about 75 ms and occupies 1.5 GB. Which constraint forces a move to a dedicated vector store first?",
        options: [
          "Search latency, since 75 ms is too slow for a request path",
          "Memory \u2014 1.5 GB resident constrains the process long before 75 ms constrains a request that already spends hundreds of milliseconds generating",
          "Index build time, which grows faster than linearly",
          "The number of concurrent queries the index can serve"
        ],
        answer: 1,
        why: "Against a generation taking hundreds of milliseconds, 75 ms of search is noticeable but small. 1.5 GB of resident vectors is a real constraint on an application process, and it is what usually forces the move. Latency becomes binding roughly an order of magnitude later, around ten million vectors where brute force reaches 855 ms. In practice operational needs \u2014 persistence, backups, incremental updates \u2014 move most teams even earlier." },

      { stem: "A RAG request spends 11 ms on vector search and 2,405 ms on cross-encoder re-ranking. What follows for latency work?",
        options: [
          "Tune the ANN index parameters, since search is the retrieval bottleneck",
          "The re-ranker decision and its shortlist depth dominate; index tuning is optimising about 1% of the request",
          "Reduce k, since fewer retrieved chunks means less to re-rank",
          "Move to a faster embedding model"
        ],
        answer: 1,
        why: "The re-ranker is 219\u00d7 the search cost here and roughly three quarters of the request. Its shortlist depth is a direct linear dial \u2014 524 ms at depth 5 against 3,961 ms at depth 50 \u2014 and recall was flat from 20 to 50, so a large cut is often free. Reducing k helps only indirectly and the embedding model is part of the 11 ms. The general lesson is to time stages separately before optimising, because the stage people reach for is usually the smallest one." },

      { stem: "Why is changing the embedding model a migration rather than an incremental update?",
        options: [
          "Because the new model produces vectors of a different dimension, which raises an error",
          "Because a half-migrated index has some vectors comparable to the query and some that are noise, and recall collapses with no error raised when dimensions match",
          "Because the vector store cannot store two models' vectors simultaneously",
          "Because the chunk boundaries have to be recomputed as well"
        ],
        answer: 1,
        why: "Measured, query and index embeddings from different models dropped recall from 95% to 50% while nothing errored, because the dimensionality happened to match. A dimension change does raise an error and is therefore the safer case; the dangerous upgrade is the one that keeps dimensionality. There is no incremental path, so the model should be pinned as a versioned dependency and a bump treated as a full re-embed with a blue-green cutover." },

      { stem: "What makes content hashing the right default for deciding what to re-embed?",
        options: [
          "It compresses the document, reducing embedding cost",
          "The check costs microseconds against seconds of embedding, and it is exact rather than heuristic \u2014 a changed byte changes the hash",
          "It allows embeddings to be reused across different models",
          "It detects semantic changes while ignoring formatting changes"
        ],
        answer: 1,
        why: "A SHA-256 over a document is microseconds while embedding its chunks is seconds, so the decision costs a tiny fraction of the work it avoids, and unlike a timestamp or a heuristic it cannot miss a change. Using the hash as the record id additionally makes re-ingestion idempotent, which removes a class of duplication. It is deliberately not semantic \u2014 a formatting-only change will trigger a re-embed, which is the safe direction to err in." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where the scaling question has a different answer than the ladder suggests",
    questions: [
      { level: "core",
        q: "How would you scale a RAG system?",
        strong: "A strong answer identifies which constraint binds first and measures before tuning.",
        answer: [
          { t: "p", text: "By working out which constraint actually binds, because it is usually not the one people optimise. Exact search over 100,000 vectors is 8.4 ms and over a million an extrapolated 75 ms \u2014 small against a generation taking hundreds of milliseconds. The memory is what moves first: a million 384-dimension vectors is 1.5 GB resident." },
          { t: "p", text: "So the order of levers is reduce dimensions, then quantize, then shard \u2014 and index structure last. I measured truncating 384 dimensions to 128 saving two thirds of the storage for five points of recall@5, which is a bigger saving than any index choice offers." },
          { t: "p", text: "Latency becomes the binding constraint around ten million vectors, where brute force reaches 855 ms. That is where an approximate index stops being optional, and both IVF and HNSW then give you a runtime recall dial you can trade against load." },
          { t: "p", text: "In practice most teams move earlier and for operational reasons \u2014 persistence, backups, incremental updates, sharing the index between processes \u2014 which is a store decision rather than an index one." }
        ] },

      { level: "advanced",
        q: "How do you keep a RAG index current?",
        strong: "A strong answer picks a strategy from change frequency and knows the model-change exception.",
        answer: [
          { t: "p", text: "Hash each document and re-embed only what changed. The hash is microseconds against seconds of embedding, so the check costs a fraction of the work it avoids, and it is exact rather than heuristic \u2014 a changed byte changes the hash." },
          { t: "p", text: "I would use the hash as the record id, which makes re-ingestion idempotent and removes a duplication problem, and store an `updated_at` alongside so freshness is auditable and recent chunks can win ties." },
          { t: "p", text: "Event-driven is better where the source system emits reliable change events; the hard part there is the events rather than the embedding. A scheduled full rebuild is the fallback and the only option in one specific case." },
          { t: "p", text: "That case is an embedding model change, which is a migration rather than an update. Query and index vectors must come from the same model \u2014 I measured recall falling from 95% to 50% when they did not, with nothing raising an error because the dimensions happened to match. So it needs a full re-embed into a new index, validated on the evaluation set, then an atomic cutover with the old index kept for rollback." }
        ] },

      { level: "core",
        q: "What would you put on a production RAG checklist?",
        strong: "A strong answer weights the items rather than listing them.",
        answer: [
          { t: "p", text: "The evaluation set first, because nothing else on the list is decidable without it. The IR metrics are deterministic arithmetic over a label set \u2014 free, fast, and runnable in CI on every ingest, which is what catches a quality regression before users do." },
          { t: "p", text: "Then the cheap high-value items. Hybrid search, because BM25 plus RRF took my recall@5 from 95% to 100% for nine lines and no latency. Incremental indexing by content hash. A fallback instruction for when retrieval finds nothing, which governs the 5% of queries that miss and is where hallucination comes from. And citations rendered as the actual chunk rather than a filename." },
          { t: "p", text: "Metadata filtering where the predicate is exact, and pre-filtering rather than post-filtering \u2014 post-filtering still reads the other tenant's data before discarding it, which is a security property rather than a performance one." },
          { t: "p", text: "Re-ranking I would mark conditional rather than recommended. I measured it helping a weak first stage and hurting a strong one, at 219\u00d7 the cost of the search, so it earns its place with an A/B on the actual first stage or not at all." }
        ] }
    ]
  }
});
