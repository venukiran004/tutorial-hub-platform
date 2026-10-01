EC.receiveLesson({
  id: "5.5",

  lede: "A vector store is an index plus a product. The index part is three algorithms \u2014 exact, IVF and HNSW \u2014 and the measurements below are what separates them: exact search over 200,000 vectors took **240 ms**, IVF did it in **10.6 ms at 99% recall**, and HNSW in **1.3 ms at 62% recall**. The product part is everything else, and it matters more than the algorithm for most teams. The first number worth knowing, though, is this: on the module\u2019s actual 1,187-chunk corpus, exact search took **1.7 ms for twenty queries**, which means the entire index-structure question was irrelevant at that scale.",

  objectives: [
    "Say when approximate search is needed and when exact search is simply fine",
    "Explain what IVF and HNSW trade and which parameter controls the trade",
    "Read a recall-against-latency curve and choose an operating point",
    "Account for the memory an index adds on top of the vectors",
    "Choose a vector store from operational properties rather than from benchmarks"
  ],

  prerequisites: ["5.3", "5.6"],

  blocks: [

    { t: "h2", n: "01", id: "scale", text: "First, whether you need one",
      sub: "The honest answer at small scale is no" },

    { t: "code", lang: "python", title: "g55.py \u2014 exact search on the real corpus", code: `flat = faiss.IndexFlatIP(D)
flat.add(E)                              # 1,187 chunks x 384 dims
flat.search(QV, 10)                      # all 20 queries at once`,
      out: `  1187 chunks x 384 dims = 1.82 MB
  exact (IndexFlatIP) search over 1187 vectors: 1.743 ms for 20 queries`,
      hl: [3],
      caption: "Under two milliseconds for the whole question set. Nothing here needs an approximate index." },

    { t: "callout", kind: "insight", title: "Exact search is a matrix multiply, and matrix multiplies are fast",
      body: [
        { t: "p", text: "Brute-force search over `n` vectors of dimension `d` is an `n \u00d7 d` by `d \u00d7 1` multiply \u2014 the operation hardware is most optimised for. At 1,187 vectors that is under a millisecond per query; at 100,000 it is still tens of milliseconds." },
        { t: "p", text: "So the first question about a vector store is not which index to use but **whether you need an index at all**. A corpus of a few hundred thousand chunks fits in memory as a NumPy array, searches exactly, and has no recall loss, no tuning parameters and no build step." },
        { t: "p", text: "The scaling measurement below puts numbers on where that stops being true. Until then, reaching for an approximate index means accepting recall loss to solve a problem you do not have." }
      ] },

    { t: "code", lang: "python", title: "g55.py \u2014 where exact search stops being free", code: `for n in (1_000, 10_000, 100_000, 1_000_000, 10_000_000):
    idx = faiss.IndexFlatIP(D)
    idx.add(BIGE[:n])
    idx.search(QV[:1], 10)`,
      out: `  vectors        flat search ms   MB at 384 dims
  1,000                   0.100              1.5
  10,000                  1.404             15.4
  100,000                 8.442            153.6
  1,000,000              74.548           1536.0   (extrapolated linearly)
  10,000,000            854.505          15360.0   (extrapolated linearly)`,
      caption: "A million vectors is 75 ms and 1.5 GB; ten million is 855 ms, which is no longer acceptable in a request." },

    { t: "callout", kind: "note", title: "The memory wall arrives before the latency wall",
      body: [
        { t: "p", text: "At a million 384-dimension vectors, exact search is **75 ms** \u2014 noticeable but still small against generation taking hundreds of milliseconds (3.1). The vectors are **1.5 GB**, and that has to be resident. At ten million it is **855 ms**, which is no longer acceptable in a request path, and 15 GB." },
        { t: "p", text: "So for most teams the trigger for a real vector database is not search speed, it is that the index no longer fits comfortably in the application\u2019s memory, or that it needs to be shared between processes, persisted, updated incrementally and backed up. Those are product requirements rather than algorithmic ones." },
        { t: "p", text: "The last two rows are extrapolated linearly from the measured ones rather than run, because this machine does not have 15 GB to spare for the experiment. Exact search is genuinely linear, so the extrapolation is sound \u2014 but it is arithmetic rather than measurement and is labelled as such." }
      ] },

    { t: "h2", n: "02", id: "ivf", text: "IVF: search a few neighbourhoods",
      sub: "Cluster first, then look in the nearest clusters only" },

    { t: "p", text: "An inverted file index runs k-means over the vectors at build time, assigning each to one of `nlist` clusters. At query time it compares the query against the `nlist` centroids, picks the nearest `nprobe` of them, and searches only the vectors in those. If the answer is in a cluster you did not probe, you miss it \u2014 that is where the recall loss comes from." },

    { t: "code", lang: "python", title: "g55.py \u2014 IVF against exact search on 200,000 vectors", code: `q = faiss.IndexFlatIP(D)
idx = faiss.IndexIVFFlat(q, D, nlist, faiss.METRIC_INNER_PRODUCT)
idx.nprobe = nprobe
idx.train(BIGE)
idx.add(BIGE)`,
      out: `  index                           build s    search ms    recall@10
  Flat (exact)                        0.3      240.174          100%
  IVF nlist=256 nprobe=1              4.0        1.936           73%
  IVF nlist=256 nprobe=8              3.8       10.620           99%
  IVF nlist=256 nprobe=32             3.9       35.164          100%
  IVF nlist=1024 nprobe=8            24.7        4.696           88%
  IVF nlist=1024 nprobe=32           25.3        9.983           97%`,
      hl: [4],
      caption: "nprobe=8 of 256 clusters: 99% recall at 23\u00d7 the speed of exact search." },

    { t: "callout", kind: "insight", title: "nprobe is a runtime dial, which is the useful property",
      body: [
        { t: "p", text: "Everything about IVF\u2019s accuracy is controlled by `nprobe`, and `nprobe` can be changed **per query without rebuilding the index**. At nlist=256: probing 1 cluster gives 73% recall in 1.9 ms, probing 8 gives 99% in 10.6 ms, probing 32 gives 100% in 35 ms." },
        { t: "p", text: "That is an unusually clean operational knob. You can raise it under light load and lower it under heavy load, or raise it for queries that matter and lower it for autocomplete \u2014 all at runtime, with no rebuild." },
        { t: "p", text: "Note also that more clusters is not simply better: nlist=1024 at nprobe=8 gave **88%** against nlist=256\u2019s 99% at the same nprobe, because each cluster is smaller so eight of them cover less of the space. The two parameters interact, and the thing to hold roughly constant is the *fraction* of the corpus searched." },
        { t: "p", text: "The build cost scales with nlist too \u2014 24.7 s at 1024 against 3.8 s at 256 \u2014 because k-means has more centroids to fit." }
      ] },

    { t: "h2", n: "03", id: "hnsw", text: "HNSW: walk a graph",
      sub: "Fastest, largest, and the slowest to build" },

    { t: "p", text: "A hierarchical navigable small world index builds a layered proximity graph: each vector is linked to roughly `M` neighbours, with sparse upper layers for long jumps and dense lower layers for local refinement. A search enters at the top, greedily walks towards the query, and descends \u2014 touching a few hundred vectors out of millions." },

    { t: "code", lang: "python", title: "g55.py \u2014 HNSW at two graph sizes", code: `idx = faiss.IndexHNSWFlat(D, M, faiss.METRIC_INNER_PRODUCT)
idx.hnsw.efSearch = ef
idx.add(BIGE)                            # no separate training step`,
      out: `  index                           build s    search ms    recall@10
  HNSW M=16 efSearch=16              37.9        1.343           62%
  HNSW M=16 efSearch=64              37.0        3.121           84%
  HNSW M=32 efSearch=64              77.1        9.185          100%`,
      hl: [3],
      caption: "M=32 reaches exact-search recall at 26\u00d7 the speed \u2014 for a 77-second build and the largest memory footprint of the three." },

    { t: "callout", kind: "tradeoff", title: "HNSW: fastest search, worst build, biggest index",
      body: [
        { t: "p", text: "The three costs move together. **Build**: 77 s at M=32 against 3.8 s for IVF and 0.3 s for exact. **Memory**: the graph stores roughly `M \u00d7 2` neighbour ids per vector on top of the vector itself \u2014 at M=32 that is 256 extra bytes against 1,536 for the vector, about 17% overhead. **Search**: 9.2 ms at full recall, the best of the three." },
        { t: "p", text: "`efSearch` is HNSW\u2019s runtime dial, equivalent to IVF\u2019s `nprobe`: 16 gives 62% recall in 1.3 ms, 64 gives 84% in 3.1 ms. `M` is a build-time choice and changing it means rebuilding." },
        { t: "p", text: "The build cost is the one that catches people. An index that takes 77 seconds for 200,000 vectors takes over an hour for ten million, which turns \u201cre-index after a document change\u201d into a scheduled job rather than a deploy step \u2014 and that is an architectural consequence, not a tuning detail." }
      ] },

    { t: "viz", title: "Recall against latency on 200,000 vectors", caption: "Each point is an operating point. nprobe and efSearch move along the curves at runtime; nlist and M require a rebuild.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Recall against search latency for IVF and HNSW">
  <text x="16" y="22" class="s-label">SEARCH LATENCY, 200,000 VECTORS \u2014 bar length is time</text>

  <text x="16" y="52" class="s-sub">HNSW ef=16</text>
  <rect x="150" y="40" width="8" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <text x="170" y="52" class="s-mono">1.3 ms</text>
  <text x="250" y="52" class="s-mono" style="fill:var(--crit)">62% recall</text>

  <text x="16" y="80" class="s-sub">IVF nprobe=1</text>
  <rect x="150" y="68" width="12" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <text x="170" y="80" class="s-mono">1.9 ms</text>
  <text x="250" y="80" class="s-mono" style="fill:var(--crit)">73%</text>

  <text x="16" y="108" class="s-sub">HNSW ef=64</text>
  <rect x="150" y="96" width="19" height="16" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="176" y="108" class="s-mono">3.1 ms</text>
  <text x="250" y="108" class="s-mono" style="fill:var(--warn)">84%</text>

  <text x="16" y="136" class="s-sub">IVF 1024/8</text>
  <rect x="150" y="124" width="29" height="16" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="186" y="136" class="s-mono">4.7 ms</text>
  <text x="250" y="136" class="s-mono" style="fill:var(--warn)">88%</text>

  <text x="16" y="164" class="s-sub">HNSW M=32</text>
  <rect x="150" y="152" width="57" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="214" y="164" class="s-mono">9.2 ms</text>
  <text x="250" y="164" class="s-mono" style="fill:var(--good)">100%</text>

  <text x="16" y="192" class="s-sub">IVF 256/8</text>
  <rect x="150" y="180" width="66" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="223" y="192" class="s-mono">10.6 ms</text>
  <text x="250" y="192" class="s-mono" style="fill:var(--good)">99%</text>

  <text x="16" y="220" class="s-sub">Flat (exact)</text>
  <rect x="150" y="208" width="560" height="16" rx="2" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="300" y="221" class="s-mono">240.2 ms \u2014 100% by definition</text>

  <line x1="16" y1="244" x2="744" y2="244" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="268" class="s-mono" style="fill:var(--accent)">build: exact 0.3 s \u00b7 IVF 3.8 s \u00b7 HNSW 77 s \u2014 the dimension nobody benchmarks</text>
  <text x="16" y="288" class="s-sub">and on the module's real 1,187-chunk corpus, exact search was 1.7 ms for twenty queries</text>
</svg>` },

    { t: "h2", n: "04", id: "memory", text: "What the index adds",
      sub: "On top of the vectors, which dominate" },

    { t: "code", lang: "python", title: "g55.py \u2014 bytes per vector", code: `print(D * 4)                     # raw float32 vector
print(D * 4 + 8)                 # IVF: + list assignment
print(D * 4 + M * 2 * 4)         # HNSW: + neighbour graph`,
      out: `  index                          bytes/vector   total MB at 200k
  raw float32 vectors                    1536              307.2
  Flat                             D*4 = 1536              307.2
  IVF (+ list ids)                  D*4 + 8                308.8
  HNSW M=16 (+ graph)            D*4 + ~128                332.8
  HNSW M=32 (+ graph)            D*4 + ~256                358.4`,
      caption: "The vectors are 307 MB; the index structures add between 0.5% and 17%." },

    { t: "callout", kind: "insight", title: "The vectors dominate, so dimension reduction beats index choice",
      body: [
        { t: "p", text: "HNSW at M=32 adds 17% on top of the vectors. 5.3 measured that **truncating from 384 to 128 dimensions cost five points of recall@5 and saved two thirds of the storage** \u2014 which is four times the saving, available before any index is chosen." },
        { t: "p", text: "So if memory is the constraint, the order to attack it in is: reduce dimensions, quantize the vectors (product quantization, which FAISS offers and which trades recall for a large memory reduction), and only then worry about the index\u2019s own overhead." },
        { t: "p", text: "The exception is HNSW at large M on high-dimensional vectors, where the graph genuinely becomes significant \u2014 but that is a reason to lower M, not to avoid the index." }
      ] },

    { t: "h2", n: "05", id: "stores", text: "Choosing a store",
      sub: "The index is the part that differs least" },

    { t: "table",
      head: ["Store", "What it actually is", "Choose when"],
      rows: [
        ["**FAISS**", "A library, not a service \u2014 in-process, no persistence or filtering of its own", "You want maximum control, the index fits in one process, and you will handle persistence yourself"],
        ["**Chroma**", "An embedded store with a simple API and metadata filtering", "Prototyping and small production; it gets you to a working pipeline fastest"],
        ["**pgvector**", "An extension to PostgreSQL", "**You already run Postgres.** Transactions, backups, joins to your real data, one system to operate"],
        ["**Qdrant**", "A dedicated vector database, open source, strong filtering", "You need rich metadata filtering alongside vector search at scale"],
        ["**Pinecone**", "A managed service", "You would rather pay than operate, and the cost at your scale is acceptable"]
      ] },

    { t: "callout", kind: "good", title: "pgvector is underrated for the same reason it is unexciting",
      body: [
        { t: "p", text: "Most RAG corpora are small enough that the index algorithm does not matter \u2014 as the 1.7 ms measurement shows. What does matter is operations: backups, migrations, access control, transactions, and keeping chunk metadata consistent with the documents it came from." },
        { t: "p", text: "If an organisation already runs PostgreSQL, pgvector gives all of that for free and adds one extension. The alternative is a second datastore with its own backup story, its own failure modes and its own on-call page \u2014 bought to solve a latency problem that a 1.5 GB NumPy array would also have solved." },
        { t: "p", text: "The honest counter-case: at tens of millions of vectors with heavy filtered search, a dedicated vector database earns its operational cost. The mistake is assuming you are there before measuring." }
      ] },

    { t: "exercise", kind: "lab", title: "Measure the recall-latency trade on your own index", difficulty: "advanced", minutes: 35,
      body: "Build exact, IVF and HNSW indexes over the same vectors and measure build time, search latency and recall against exact search as ground truth. Sweep the runtime parameters \u2014 nprobe and efSearch \u2014 and find the operating point that meets your latency budget at acceptable recall. Report the memory each index adds on top of the vectors.",
      requirements: [
        "Use exact search as the ground truth for recall rather than labelled relevance",
        "Use enough vectors that the comparison is meaningful \u2014 a few thousand will show nothing",
        "Sweep nprobe and efSearch, which are runtime parameters, separately from nlist and M, which are build-time",
        "Report build time alongside search time",
        "Compute the bytes per vector each index adds on top of the raw vectors"
      ],
      hint: "If your real corpus is small, pad it with random vectors to the scale you expect to reach. The latency comparison is meaningless at a few thousand vectors \u2014 exact search wins trivially.",
      solution: { lang: "python", title: "g55.py \u2014 three indexes, one ground truth", code: `gt_index = faiss.IndexFlatIP(D)
gt_index.add(BIGE)
_, GT = gt_index.search(QV, 10)              # ground truth = exact search

def bench(index, label, train=None):
    t0 = time.perf_counter()
    if train is not None:
        index.train(train)
    index.add(BIGE)
    build = time.perf_counter() - t0
    ts = [timed(lambda: index.search(QV, 10)) for _ in range(20)]
    _, I = index.search(QV, 10)
    rec = np.mean([len(set(I[i]) & set(GT[i])) / 10 for i in range(len(QV))])
    return build, np.median(ts), rec

for nlist, nprobe in ((256, 1), (256, 8), (256, 32), (1024, 8), (1024, 32)):
    q = faiss.IndexFlatIP(D)
    idx = faiss.IndexIVFFlat(q, D, nlist, faiss.METRIC_INNER_PRODUCT)
    idx.nprobe = nprobe
    bench(idx, "IVF %d/%d" % (nlist, nprobe), train=BIGE)

for M, ef in ((16, 16), (16, 64), (32, 64)):
    idx = faiss.IndexHNSWFlat(D, M, faiss.METRIC_INNER_PRODUCT)
    idx.hnsw.efSearch = ef
    bench(idx, "HNSW M=%d ef=%d" % (M, ef))`,
        out: `  on the real 1,187-chunk corpus:
  exact search: 1.743 ms for 20 queries  -- no index needed at all

  on 200,000 vectors:
  index                           build s    search ms    recall@10
  Flat (exact)                        0.3      240.174          100%
  IVF nlist=256 nprobe=1              4.0        1.936           73%
  IVF nlist=256 nprobe=8              3.8       10.620           99%
  IVF nlist=256 nprobe=32             3.9       35.164          100%
  IVF nlist=1024 nprobe=8            24.7        4.696           88%
  IVF nlist=1024 nprobe=32           25.3        9.983           97%
  HNSW M=16 efSearch=16              37.9        1.343           62%
  HNSW M=16 efSearch=64              37.0        3.121           84%
  HNSW M=32 efSearch=64              77.1        9.185          100%

  memory on top of the vectors (307 MB at 200k x 384 float32):
  IVF        + 8 bytes/vector      308.8 MB
  HNSW M=16  + ~128 bytes/vector   332.8 MB
  HNSW M=32  + ~256 bytes/vector   358.4 MB`,
        notes: [
          { t: "p", text: "**The first result is that the question was premature.** On the module's actual corpus, exact search took 1.7 ms for twenty queries \u2014 the index structure is irrelevant below a few hundred thousand vectors, and choosing an approximate one there means accepting recall loss to solve a problem you do not have." },
          { t: "p", text: "**At 200,000 vectors the trade is real and both algorithms offer a runtime dial.** IVF at nprobe=8 gives 99% recall at 23\u00d7 the speed of exact; HNSW at M=32 gives 100% at 26\u00d7. Both `nprobe` and `efSearch` change per query with no rebuild, which makes them unusually good operational controls \u2014 raise under light load, lower under heavy." },
          { t: "p", text: "**More clusters is not better.** nlist=1024 at nprobe=8 gave 88% against nlist=256's 99% at the same nprobe, because each cluster holds fewer vectors so eight cover less of the space. The quantity to hold roughly constant is the fraction of the corpus searched, not nprobe itself." },
          { t: "p", text: "**Build time is the dimension nobody benchmarks**: 0.3 s exact, 3.8 s IVF, 77 s HNSW at M=32. Extrapolated to ten million vectors that is an hour, which turns re-indexing from a deploy step into a scheduled job \u2014 an architectural consequence rather than a tuning detail." },
          { t: "p", text: "**The vectors dominate memory, so dimension reduction beats index choice.** HNSW's graph adds 17%; 5.3 measured truncating 384 to 128 dimensions saving two thirds for five points of recall@5. Attack dimensions first, then quantization, then the index's own overhead." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Exact search is a matrix multiply and hardware is very good at those. Approximate indexes exist to avoid touching every vector, which is only worth doing once there are a great many vectors \u2014 and they all work the same way: look at a fraction of the data and hope the answer was in it." },
        { t: "p", text: "The dial that controls that fraction is the one worth knowing, because it moves at runtime. Everything else about an index is decided at build time and costs a rebuild to change." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe are choosing a vector database for a RAG system over about 50,000 document chunks. Which one?\u201d**" },
        { t: "p", text: "At 50,000 chunks the index algorithm is irrelevant, so the question is really about operations rather than about search. Exact search over 50,000 384-dimension vectors is a few milliseconds and about 77 MB \u2014 it fits in a NumPy array, searches with one matrix multiply, and has no recall loss and nothing to tune." },
        { t: "p", text: "So I would choose on everything else: persistence, backups, incremental updates, metadata filtering, access control, and how many systems the team has to operate. If they already run PostgreSQL, pgvector gives all of that for one extension and no new on-call surface. If they want to move fast and the corpus is small, Chroma gets to a working pipeline quickest." },
        { t: "p", text: "What I would push back on is choosing a dedicated vector database for latency reasons at this scale. I measured exact search at 1.7 ms for twenty queries over 1,187 vectors, and at 100,000 vectors it is 8.4 ms per query \u2014 against generation that takes hundreds of milliseconds. The search is not the bottleneck and will not be for some time." },
        { t: "p", text: "The trigger to revisit is memory rather than speed: a million vectors at 384 dimensions is 1.5 GB resident, and that is usually what forces a dedicated store \u2014 or filtered search at scale, where a good filtering implementation genuinely differentiates." },
        { t: "p", text: "If and when they do need an approximate index, the thing I would make sure they know is that both IVF and HNSW have a runtime recall dial \u2014 `nprobe` and `efSearch` \u2014 that changes per query without a rebuild. That is worth designing around, because it lets you trade recall for latency under load rather than choosing once at build time." }
      ] }
  ],

  takeaways: [
    "**Ask whether you need an index at all.** Exact search over the module's 1,187-chunk corpus took 1.7 ms for twenty queries.",
    "**Exact search is linear**: 8.4 ms at 100,000 vectors and about 75 ms extrapolated at a million \u2014 still small against generation, but 855 ms at ten million is not.",
    "**The memory wall arrives before the latency wall.** A million 384-dimension vectors is 1.5 GB resident, which is usually what forces a dedicated store.",
    "**IVF clusters at build time and probes a few clusters per query.** At nlist=256: 73% recall at nprobe=1, **99% at nprobe=8**, 100% at nprobe=32.",
    "**More clusters is not better**: nlist=1024 at nprobe=8 gave 88% against nlist=256's 99%, because each cluster covers less of the space.",
    "**HNSW walks a proximity graph** and was fastest at full recall \u2014 100% in 9.2 ms against exact search's 240 ms on 200,000 vectors.",
    "**`nprobe` and `efSearch` are runtime dials** that change per query with no rebuild, which makes them good load-shedding controls; `nlist` and `M` need a rebuild.",
    "**Build time is the dimension nobody benchmarks**: 0.3 s exact, 3.8 s IVF, 77 s HNSW at M=32 on 200,000 vectors \u2014 an hour at ten million.",
    "**The vectors dominate memory**, so dimension reduction (two thirds saved for five recall points, 5.3) beats worrying about the index's 0.5\u201317% overhead.",
    "**Choose a store on operations, not on the index.** If you already run PostgreSQL, pgvector adds one extension instead of a second datastore to back up and page on."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A RAG system has 50,000 chunks. Which index structure should it use?",
        options: [
          "HNSW, for the lowest search latency",
          "None \u2014 exact search at that scale is well under a millisecond and loses no recall",
          "IVF with nprobe tuned to the latency budget",
          "Product quantization, to minimise memory"
        ],
        answer: 1,
        why: "Brute-force search is a matrix multiply, which hardware is heavily optimised for \u2014 measured at 8.4 ms for 100,000 vectors and 1.7 ms for twenty queries over 1,187. Against generation taking hundreds of milliseconds, the search is not the bottleneck. Choosing an approximate index at this scale accepts recall loss and tuning parameters to solve a problem that does not exist; the real trigger for a dedicated store is memory, filtering or operations." },

      { stem: "IVF with nlist=256 and nprobe=8 gives 99% recall, while nlist=1024 and nprobe=8 gives 88%. Why is the larger nlist worse?",
        options: [
          "Larger nlist values require more training data to converge",
          "Each cluster holds fewer vectors, so probing eight of them searches a smaller fraction of the corpus",
          "The centroids become less accurate as nlist grows",
          "The index was not retrained after changing nlist"
        ],
        answer: 1,
        why: "With 200,000 vectors, nlist=256 means roughly 780 vectors per cluster and probing 8 covers about 3% of the corpus; nlist=1024 means roughly 195 per cluster and probing 8 covers under 1%. The quantity that determines recall is the fraction of vectors searched, so nprobe must rise with nlist to hold accuracy constant. Build time also rises with nlist \u2014 24.7 s against 3.8 s \u2014 because k-means fits more centroids." },

      { stem: "What is the practical significance of `nprobe` and `efSearch` being runtime parameters?",
        options: [
          "They can be set per index but not per query",
          "Recall can be traded for latency per query without rebuilding, making them usable as load-shedding controls",
          "They determine the memory footprint of the index",
          "They allow the index to be updated incrementally"
        ],
        answer: 1,
        why: "Both control how much of the index a search touches and take effect immediately, so you can lower them under heavy load, raise them for high-value queries, or tune them after deployment without re-indexing. The build-time parameters \u2014 nlist and M \u2014 require a full rebuild to change, which at 77 seconds per 200,000 vectors for HNSW is a real operation. Memory is determined by the build-time parameters, and incremental updates are a separate capability." },

      { stem: "HNSW at M=32 adds about 17% to the memory of the raw vectors. What should you do first if memory is the constraint?",
        options: [
          "Switch to IVF, which adds only 8 bytes per vector",
          "Reduce the embedding dimension \u2014 384 to 128 saved two thirds of the storage for five recall points",
          "Lower efSearch to reduce the working set",
          "Store the vectors on disk and memory-map them"
        ],
        answer: 1,
        why: "The vectors dominate: 307 MB of vectors against 51 MB of graph at 200,000 \u00d7 384. Dimension reduction attacks the dominant term and was measured at two thirds saved for five points of recall@5, which is four times the saving available from changing index structure. Product quantization is the next lever for the same reason. efSearch affects search time rather than storage, and memory-mapping trades latency for residency rather than reducing size." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where the right first answer is often \u201cyou do not need one yet\u201d",
    questions: [
      { level: "core",
        q: "How would you choose a vector database?",
        strong: "A strong answer establishes the scale first and then chooses on operations.",
        answer: [
          { t: "p", text: "First by establishing whether the index matters at all, because below a few hundred thousand vectors it does not. Exact search is a matrix multiply \u2014 I measured 1.7 ms for twenty queries over 1,187 vectors and 8.4 ms per query at 100,000 \u2014 against generation taking hundreds of milliseconds." },
          { t: "p", text: "So at typical RAG scale the decision is operational: persistence, backups, incremental updates, metadata filtering, access control, and how many systems the team has to run. If they already operate PostgreSQL, pgvector adds one extension and inherits all of that; a dedicated vector database adds a second datastore with its own backup story and its own on-call page." },
          { t: "p", text: "The trigger to revisit is usually memory rather than latency. A million 384-dimension vectors is 1.5 GB resident, and that is what tends to force a dedicated store \u2014 or heavy filtered search, where implementations genuinely differ." },
          { t: "p", text: "And if an approximate index is needed, the property I would design around is that both IVF and HNSW expose a runtime recall dial \u2014 nprobe and efSearch \u2014 that changes per query with no rebuild. That is useful for shedding load, and it is worth knowing before you pick an operating point." }
        ] },

      { level: "advanced",
        q: "Explain the trade-off between IVF and HNSW.",
        strong: "A strong answer covers all three costs, including build time.",
        answer: [
          { t: "p", text: "IVF clusters the vectors at build time and searches only the nearest few clusters; HNSW builds a layered proximity graph and walks it. Both approximate by touching a fraction of the data, and both have a runtime dial for how large that fraction is." },
          { t: "p", text: "On 200,000 vectors I measured IVF at nprobe=8 giving 99% recall in 10.6 ms, and HNSW at M=32 giving 100% in 9.2 ms \u2014 against 240 ms for exact search. So HNSW is slightly faster at full recall, and at low recall settings it is faster still: 62% in 1.3 ms." },
          { t: "p", text: "The costs that differ are build and memory. HNSW took 77 seconds to build against IVF's 3.8, and stores a neighbour graph of roughly M\u00d72 ids per vector \u2014 about 17% on top of the vectors at M=32, where IVF adds 8 bytes. Extrapolated to ten million vectors, an HNSW build is an hour, which turns re-indexing into a scheduled job rather than a deploy step." },
          { t: "p", text: "One subtlety worth mentioning: the two IVF parameters interact. nlist=1024 at nprobe=8 gave 88% where nlist=256 at the same nprobe gave 99%, because smaller clusters mean eight of them cover less ground. The thing to hold constant is the fraction searched, not nprobe." }
        ] },

      { level: "core",
        q: "Your index no longer fits in memory. What do you do?",
        strong: "A strong answer attacks the dominant term first.",
        answer: [
          { t: "p", text: "Attack the vectors, because they dominate. At 200,000 \u00d7 384 float32 the vectors are 307 MB and even HNSW's graph adds only 51 MB on top \u2014 so changing index structure addresses the smaller term." },
          { t: "p", text: "First, dimensions. I measured truncating from 384 to 128 costing five points of recall@5 and saving two thirds of the storage, and that was naive truncation of a model not trained for it \u2014 a Matryoshka-trained model would do better. That is a bigger saving than any index choice offers." },
          { t: "p", text: "Then quantization of the vectors themselves \u2014 product quantization, which FAISS supports \u2014 which trades recall for a large reduction by storing codes instead of floats. That is the standard answer at serious scale and it has the same shape as 4.5's quantization argument: measure the quality cost rather than assuming it is small." },
          { t: "p", text: "Only then would I look at the index overhead, and the main lever there is lowering HNSW's M, which shrinks the graph at some cost in search quality. And if the corpus is genuinely large, this is also the point where a store that keeps vectors on disk with a memory-resident index becomes the right architecture rather than a workaround." }
        ] }
    ]
  }
});
