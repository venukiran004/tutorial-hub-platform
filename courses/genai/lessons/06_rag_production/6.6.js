EC.receiveLesson({
  id: "6.6",

  lede: "The reference\u2019s first rule for code is \u201cnever split mid-function\u201d. Measured over **1,487 functions in 139 real Python files**, the rule turns out to have a sharp shape: a function *smaller* than the chunk size is split 2\u201315% of the time, and a function *larger* than it is split **98\u2013100% of the time**. So the aggregate split rate is not a property of the chunker at all \u2014 it is a weighted average of your codebase\u2019s function-size distribution, and the only functions at risk are the ones too big to fit.",

  objectives: [
    "Name the five ways code differs from prose for retrieval",
    "Chunk a file on its AST and say what that costs in chunk-size control",
    "Build a call graph and quantify how much dependency expansion inflates context",
    "Combine semantic, symbol and graph retrieval, and order the stages correctly",
    "Keep a code index fresh against a repository that changes constantly"
  ],

  prerequisites: ["5.4", "6.4"],

  blocks: [

    { t: "h2", n: "01", id: "different", text: "Five ways code is not prose",
      sub: "Each one breaks a different assumption from M5" },

    { t: "dl", items: [
      { k: "Structure is hierarchical and strict", v: "Files contain classes contain methods. Unlike a paragraph break, a function boundary is not a hint \u2014 it is the unit of meaning, and half a function is not a shorter answer, it is a wrong one." },
      { k: "Dependencies cross files", v: "Understanding a function needs its imports, type definitions and sometimes its callers. 6.4\u2019s multi-hop argument applies directly: the answer is a neighbourhood, not a chunk." },
      { k: "There are several valid representations", v: "Raw text, AST, docstring, generated summary. 5.3 treated the chunk and its embedding as one thing; here you can deliberately embed one representation and retrieve another." },
      { k: "Relevant context is long-range", v: "A bug fix may span ten files. No top-k of 5 covers that, which is 6.1\u2019s precision-recall tension at its worst." },
      { k: "It changes constantly", v: "A prose corpus is re-indexed nightly. A repository changes every commit, so 6.2\u2019s hash-based incremental indexing stops being an optimisation and becomes the only workable design." }
    ] },

    { t: "h2", n: "02", id: "chunking", text: "Chunking on the AST",
      sub: "And measuring exactly what naive chunking costs" },

    { t: "p", text: "The reference contrasts naive text chunking with AST-based chunking and asserts the first splits mid-function. 5.4 settled on 500-character recursive chunks for prose, so the obvious question is what that setting does to code \u2014 which is a measurement, not an opinion." },

    { t: "code", lang: "python", title: "g66.py \u2014 detecting a split, exactly", code: `# a function occupies characters [a, b) of the source
a = offs[node.lineno - 1]
b = offs[min(node.end_lineno, len(offs) - 1)]

# it is split if ANY chunk boundary falls strictly inside it
split = any(a < s < b for s in chunk_start_offsets[1:])`,
      caption: "Character offsets from line numbers, so this is exact rather than heuristic \u2014 no guessing where a chunk landed." },

    { t: "code", lang: "python", title: "g66.py \u00a7A \u2014 split rate against chunk size", code: `for size in (300, 500, 1000, 2000):
    chunks = chunk_recursive(src, size=size)`,
      out: `  40 real Python files, 187299 chars total

  size         chunks    functions    split funcs      % split
  300             823          142             37          26%
  500             526          142             24          17%
  1000            292          142              5           4%
  2000            130          142              0           0%`,
      hl: [5, 6],
      caption: "A clean monotone trend \u2014 but 17% at 500 chars, and my script's printed conclusion claimed \u201cmost\u201d." },

    { t: "callout", kind: "trap", title: "My script said \u201cmost functions\u201d and measured 17%",
      body: [
        { t: "p", text: "I wrote the summary line while writing the script \u2014 \u201cat the 500-char size M5 settled on, naive chunking splits most functions it meets\u201d \u2014 from what I expected rather than from what ran. 17% is not most. The sentence was simply false." },
        { t: "p", text: "Worse, I could not tell from that table whether 17% was good news or a sampling accident. An aggregate percentage over a mixed population answers nothing: it depends on how big the functions happen to be, and my first sample\u2019s median function was only 100 characters \u2014 most of them fit in one chunk trivially." },
        { t: "p", text: "So the fix was not to adjust the wording. It was to stratify, which turned a number I could not interpret into a result with a mechanism." }
      ] },

    { t: "code", lang: "python", title: "g66b.py \u2014 the same 500-char chunking, split by function size", code: `BUCKETS = [(0, 250), (250, 500), (500, 1000), (1000, 2500), (2500, 10**9)]
for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        n = b - a                      # the function's size in chars
        bucket[n][0] += 1
        if any(a < s < b for s in starts):
            bucket[n][1] += 1`,
      out: `  139 files, 1487 functions
  function size in chars: median 284, mean 598, p90 1452, max 12365

  function size           functions        split    % split
  0-250                         670           11         2%
  250-500                       323           50        15%
  500-1000                      255          251        98%
  1000-2500                     176          176       100%
  2500+                          63           63       100%

  overall: 551 of 1487 = 37%`,
      hl: [6, 7, 8],
      caption: "Three rows at 98\u2013100%. The threshold is the chunk size, and the transition across it is almost total." },

    { t: "callout", kind: "insight", title: "The rule has a mechanism, and it is obvious once you see it",
      body: [
        { t: "p", text: "A function longer than the chunk size **cannot** fit in one chunk, so it is split with near-certainty \u2014 98% in the 500\u20131000 band and 100% above it. A function shorter than the chunk size is split only if a boundary happens to land inside it, which is 2% for the smallest and 15% as they approach the limit." },
        { t: "p", text: "That makes the aggregate figure a statement about your codebase rather than about the chunker. My first sample gave 17% and my larger one 37% \u2014 same method, same chunk size, different function-size distribution. Neither number generalises; the stratified structure does." },
        { t: "p", text: "And it gives a decision rule instead of a rule of thumb. Chunk size must exceed the function sizes you care about retrieving intact \u2014 at p90 of 1,452 characters here, a 500-character setting guarantees breaking the top decile of functions, which is exactly the set most worth retrieving whole." }
      ] },

    { t: "viz", title: "Split rate against function size, 500-char chunks", caption: "Below the chunk size, splitting is incidental. Above it, splitting is certain.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Function split rate by size bucket">
  <text x="16" y="22" class="s-label">% OF FUNCTIONS SPLIT BY A 500-CHAR RECURSIVE CHUNKER</text>
  <line x1="150" y1="250" x2="700" y2="250" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="150" y1="60" x2="150" y2="250" stroke="var(--line)" stroke-width="1.2"/>
  <text x="140" y="64" text-anchor="end" class="s-mono" style="font-size:10px">100%</text>
  <text x="140" y="158" text-anchor="end" class="s-mono" style="font-size:10px">50%</text>
  <text x="140" y="254" text-anchor="end" class="s-mono" style="font-size:10px">0%</text>

  <rect x="172" y="246" width="70" height="4" rx="1" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="207" y="266" text-anchor="middle" class="s-sub" style="font-size:9px">0\u2013250</text>
  <text x="207" y="240" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">2%</text>

  <rect x="276" y="221" width="70" height="29" rx="1" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="311" y="266" text-anchor="middle" class="s-sub" style="font-size:9px">250\u2013500</text>
  <text x="311" y="214" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">15%</text>

  <rect x="380" y="64" width="70" height="186" rx="1" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="415" y="266" text-anchor="middle" class="s-sub" style="font-size:9px">500\u20131000</text>
  <text x="415" y="56" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">98%</text>

  <rect x="484" y="60" width="70" height="190" rx="1" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="519" y="266" text-anchor="middle" class="s-sub" style="font-size:9px">1000\u20132500</text>
  <text x="519" y="52" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">100%</text>

  <rect x="588" y="60" width="70" height="190" rx="1" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="623" y="266" text-anchor="middle" class="s-sub" style="font-size:9px">2500+</text>
  <text x="623" y="52" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">100%</text>

  <line x1="363" y1="46" x2="363" y2="250" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="363" y="40" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">the chunk size</text>
  <text x="16" y="286" class="s-sub">1,487 functions, 139 files \u2014 the aggregate 37% is just these bars weighted by your codebase</text>
</svg>` },

    { t: "code", lang: "python", title: "AST chunking, as the reference prescribes it", code: `def chunk_python_file(file_content: str, file_path: str) -> list[dict]:
    tree = ast.parse(file_content)
    lines = file_content.split("\n")
    chunks = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            s, e = node.lineno - 1, node.end_lineno
            chunks.append({
                "content": "\n".join(lines[s:e]),
                "metadata": {
                    "type": type(node).__name__, "name": node.name,
                    "file": file_path, "start_line": s + 1, "end_line": e,
                    "docstring": ast.get_docstring(node) or "",
                },
            })
    return chunks`,
      hl: [5, 11, 12],
      caption: "Iterating tree.body rather than ast.walk keeps top-level definitions whole instead of also emitting every nested method separately." },

    { t: "callout", kind: "tradeoff", title: "AST chunking gives up size control, and that is the real cost",
      body: [
        { t: "p", text: "Every chunking strategy in 5.4 had a size parameter. This one does not: a chunk is a definition, so its length is whatever the author wrote. My sample\u2019s functions ran from under 20 characters to **12,365**, and a single chunk of 12,365 characters is roughly 3,000 tokens of context spent on one retrieval slot." },
        { t: "p", text: "So production code chunkers are hybrids: split on the AST, then apply a size cap with a fallback split for definitions that exceed it \u2014 and when that happens, prepend the signature and docstring to each piece so every fragment still says what it belongs to." },
        { t: "p", text: "The other direction matters too. A 43-character function is a chunk whose embedding is dominated by two keywords, and 5.3 measured how little signal a very short chunk carries. Tiny definitions are better merged with their siblings or indexed only through the class that contains them." }
      ] },

    { t: "callout", kind: "good", title: "What AST chunking buys beyond intact functions",
      body: [
        { t: "p", text: "Metadata, for free and exact. The name, kind, file path, line range and docstring all fall out of the parse \u2014 no model call, no inference. 6.3 argued that exact metadata is the kind safe to filter on, and this is the best-case version of it." },
        { t: "p", text: "The line range is what makes citation work properly here. 5.13 wanted citations that resolve to the actual retrieved text; for code, `path:start-end` is clickable, verifiable and stable under reformatting in a way a quoted snippet is not." },
        { t: "p", text: "And the docstring is separately embeddable, which is the reference\u2019s key tip: embed the signature and docstring to capture *intent*, and the body to capture *implementation*. A query like \u201chow do I authenticate a user\u201d matches intent; \u201cwhere is bcrypt called\u201d matches implementation." }
      ] },

    { t: "h2", n: "03", id: "graph", text: "The call graph, and what expansion costs",
      sub: "6.4's argument, with a parser instead of a model" },

    { t: "p", text: "Code is the one domain where 6.4\u2019s knowledge graph needs no extraction model at all. The relations \u2014 calls, inherits, imports \u2014 are in the syntax, so a parser recovers them exactly. That removes the entity-resolution problem that made graph building hard, and replaces it with a different one." },

    { t: "code", lang: "python", title: "g66.py \u00a7C \u2014 the graph the reference builds", code: `class CodeGraph:
    def add_file(self, path, content):
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                key = "%s::%s" % (os.path.basename(path), node.name)
                self.nodes[key] = type(node).__name__
                for child in ast.walk(node):
                    if isinstance(child, ast.Call) and isinstance(child.func, ast.Name):
                        self.edges.append((key, child.func.id, "calls"))`,
      out: `  nodes (functions + classes): 149
  edges (calls + inherits)   : 372
  edges resolving to a node IN the graph: 116 (31%)

  callees per function: median 2, p90 5, max 12

  and 69% of call edges point OUTSIDE the indexed set (builtins, imports).`,
      hl: [9, 10],
      caption: "Two thirds of the edges go nowhere \u2014 because `ast.Name` cannot distinguish a local helper from `len`." },

    { t: "callout", kind: "trap", title: "69% of the edges are unresolvable, and that is the honest baseline",
      body: [
        { t: "p", text: "The reference\u2019s `CodeGraph` matches on `ast.Call` with an `ast.Name` function, which captures the *name being called* and nothing about what it refers to. `len`, `print`, an imported symbol and a local helper are indistinguishable, so 69% of edges point at names with no node in the graph." },
        { t: "p", text: "It also misses most real calls outright. `self.method()` and `module.function()` are `ast.Attribute`, not `ast.Name`, so the pattern silently skips them \u2014 which in object-oriented code is the majority of calls. The graph is not merely noisy, it is systematically missing the edges that matter most in a class-heavy codebase." },
        { t: "p", text: "The fix is scope resolution: track imports per module, resolve attribute access where the receiver\u2019s type is known, and discard names that resolve to builtins. That is what tools like `tree-sitter` plus an index, or a language server, exist to do \u2014 and it is a good reason to use one rather than the twelve-line version, which 6.4 would call an authoritative-looking disconnected graph." }
      ] },

    { t: "callout", kind: "insight", title: "Expansion inflates context by the median and blows it up at the tail",
      body: [
        { t: "p", text: "Measured, the median function calls **2** things in the indexed set, p90 calls **5** and the maximum calls **12**. So expanding a retrieved function by its callees roughly triples the context in the typical case, and multiplies it by thirteen in the worst." },
        { t: "p", text: "That is why the reference\u2019s pipeline re-ranks *after* expansion rather than before. Expansion is a recall move that deliberately destroys precision; the re-ranker is what restores it, and 6.1 measured re-ranking helping exactly when the first stage is weak \u2014 which an expanded candidate set reliably is." },
        { t: "p", text: "It also explains the best practice about context budget: five highly relevant functions beat twenty loosely related ones. Expansion without a re-rank is how you get the twenty, and code chunks are long, so this spends context faster than any prose pipeline." }
      ] },

    { t: "h2", n: "04", id: "retrieval", text: "Three retrievers, in the right order",
      sub: "Semantic misses symbols; symbol search misses intent" },

    { t: "code", lang: "python", title: "the composite retriever", code: `def code_rag_retrieval(query, vector_store, code_graph):
    semantic_results = vector_store.similarity_search(query, k=10)

    symbols = extract_code_symbols(query)          # ["UserService", "authenticate"]
    symbol_results = symbol_index.search(symbols)

    expanded = []
    for result in semantic_results + symbol_results:
        expanded.extend(code_graph.get_callees(result.metadata["file"],
                                               result.metadata.get("name")))
        expanded.extend(code_graph.get_type_dependencies(...))

    all_candidates = deduplicate(semantic_results + symbol_results + expanded)
    return cross_encoder.rerank(query, all_candidates, top_k=5)`,
      hl: [13, 14],
      caption: "Deduplicate then re-rank, in that order \u2014 expansion produces overlapping sets, and 6.3's MMR point applies to the leftovers." },

    { t: "callout", kind: "insight", title: "Symbol search is the BM25 of code, and it matters more here",
      body: [
        { t: "p", text: "5.9 measured BM25 beside vectors taking recall@5 from 95% to 100%, and the reason was exact-token queries that embeddings blur. Code is that case constantly: `UserService` is an identifier, and an embedding of it sits near \u201cuser\u201d, \u201cservice\u201d and \u201caccount manager\u201d \u2014 all wrong." },
        { t: "p", text: "An exact symbol index answers those in one lookup with no ranking uncertainty at all. It is the pre-filter argument from 6.3 again: when a constraint is exactly expressible, express it exactly rather than hoping cosine approximates it." },
        { t: "p", text: "And the two retrievers fail in opposite directions, which is what makes fusing them worthwhile. Symbol search cannot answer \u201cwhere do we handle expired tokens\u201d because no identifier says that; semantic search cannot reliably find `authenticate` among a hundred auth-adjacent functions. RRF over both costs nine lines." }
      ] },

    { t: "table",
      head: ["Model", "Dimension", "Note"],
      rows: [
        ["`text-embedding-3-large`", "3072", "Good all-rounder across code and docs \u2014 and 6.2's memory arithmetic applies: 3072 dims is 8\u00d7 the storage of 384"],
        ["Voyage Code 2", "1536", "Trained on code; the reference calls it best-in-class"],
        ["CodeBERT", "768", "Open-source, strongest on classification rather than retrieval"],
        ["StarEncoder", "1024", "Trained on The Stack, multilingual"],
        ["Jina Code v2", "768", "8K context, open-source \u2014 the long context matters for whole-class chunks"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Dimension is not free, and 6.2 priced it",
      body: [
        { t: "p", text: "A 3072-dimension embedding is eight times the storage of the 384-dimension model used throughout M5. At a million chunks that is 12 GB against 1.5 GB \u2014 and 6.2 measured memory as the constraint that binds first, well before latency." },
        { t: "p", text: "5.3 also measured truncating 384 dimensions to 128 costing five points of recall@5 for two thirds of the storage, so the dimension-quality curve is shallow at the top. A code-specific model at 1536 may well beat a general model at 3072 on both axes at once." },
        { t: "p", text: "Which is the practical order: pick for code-specificity first, then check the dimension against your corpus size. A repository is rarely a million chunks, so for most codebases this is a non-issue and the quality argument wins outright." }
      ] },

    { t: "h2", n: "05", id: "freshness", text: "Freshness, where code is the hard case",
      sub: "Every commit is an ingest" },

    { t: "p", text: "6.2 presented incremental indexing by content hash as the sensible default. For code it is the only workable design, because the slow clock is not nightly \u2014 it is every commit, and a stale code index is worse than a stale prose index: it tells you about a function signature that no longer exists, and the answer looks exactly as authoritative as a correct one." },

    { t: "ol", items: [
      "**Hash per file, not per chunk.** A commit touches a handful of files, so the file is the natural unit of change detection \u2014 and 6.8 measured hashing 12 documents of 360,000 characters at 1.3 ms.",
      "**Delete by file path before re-inserting.** 6.3\u2019s orphan problem is acute here: rename a function and the old name's chunk survives as a plausible, retrievable, nonexistent API.",
      "**Re-index on the commit hook, not on a schedule.** The event exists and is reliable, which is the condition 6.2 said event-driven indexing needs and rarely gets.",
      "**Store the commit SHA as metadata.** It makes staleness auditable and lets a citation name the version it was true for."
    ] },

    { t: "callout", kind: "warn", title: "Renames are the code-specific version of the orphan bug",
      body: [
        { t: "p", text: "A rename is a delete plus an insert that no content hash can connect. If deletion is keyed on chunk hashes, the old function\u2019s chunk is never deleted \u2014 nothing in the new file hashes to it \u2014 so the index keeps a function that no longer exists under a name nobody can call." },
        { t: "p", text: "Keying deletion on the *file path* fixes it: re-indexing a file removes all of its chunks first, so a rename within a file resolves naturally. A rename that moves code *between* files still needs both paths re-indexed, which a commit diff gives you directly." },
        { t: "p", text: "This is the single highest-value thing to get right in a code index, because the failure is silent and confident. 6.8\u2019s theme exactly: the dangerous failures are the ones where nothing errors." }
      ] },

    { t: "exercise", kind: "build", title: "Measure your repository's chunking damage", difficulty: "core", minutes: 35,
      body: "Take your own repository and measure, for a chunk size you are actually considering, what fraction of functions a naive recursive splitter breaks — stratified by function size, not as an aggregate. Then compute the AST chunk size distribution and decide where your fallback size cap belongs.",
      requirements: [
        "Compute character offsets from line numbers so split detection is exact, not heuristic",
        "Stratify the split rate by function size \u2014 the aggregate is uninterpretable",
        "Report the function-size median and p90 for your codebase",
        "Compute the AST chunk size distribution, including the maximum",
        "State your chosen chunk size and size cap, with the measurement as the reason"
      ],
      hint: "The aggregate percentage tells you almost nothing \u2014 it is your function-size distribution in disguise. Stratify first and the decision becomes obvious.",
      solution: { lang: "python", title: "the stratified measurement", code: `import ast, io, glob, statistics

BUCKETS = [(0, 250), (250, 500), (500, 1000), (1000, 2500), (2500, 10**9)]
SIZE = 500
tally = {b: [0, 0] for b in BUCKETS}
sizes = []

for path in glob.glob("src/**/*.py", recursive=True):
    src = io.open(path, encoding="utf8").read()
    try:
        tree = ast.parse(src)
    except SyntaxError:
        continue

    offs, acc = [], 0                       # char offset of each line start
    for ln in src.split("\n"):
        offs.append(acc); acc += len(ln) + 1
    offs.append(acc)

    chunks = chunk_recursive(src, size=SIZE)
    starts, pos = [], 0                     # where each chunk begins
    for c in chunks:
        i = src.find(c, pos)
        starts.append(i if i >= 0 else pos)
        pos = starts[-1] + len(c) - 1

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            a, b = offs[node.lineno - 1], offs[min(node.end_lineno, len(offs) - 1)]
            if b - a < 20:
                continue
            sizes.append(b - a)
            for lo, hi in BUCKETS:
                if lo <= b - a < hi:
                    tally[(lo, hi)][0] += 1
                    tally[(lo, hi)][1] += any(a < s < b for s in starts[1:])
                    break

print("functions: %d  median %d  p90 %d  max %d"
      % (len(sizes), statistics.median(sizes),
         sorted(sizes)[int(len(sizes) * 0.9)], max(sizes)))
for lo, hi in BUCKETS:
    n, s = tally[(lo, hi)]
    if n:
        print("%-12s %5d functions %5d split %4.0f%%"
              % ("%d-%d" % (lo, hi), n, s, 100 * s / n))`,
        out: `  functions: 1487  median 284  p90 1452  max 12365

  0-250         670 functions    11 split    2%
  250-500       323 functions    50 split   15%
  500-1000      255 functions   251 split   98%
  1000-2500     176 functions   176 split  100%
  2500+          63 functions    63 split  100%`,
        notes: [
          { t: "p", text: "**The three bottom rows are the whole result.** A function longer than the chunk size cannot fit in one chunk, so it is split with near-certainty. Everything below the chunk size is split only by coincidence \u2014 2% at the small end, rising to 15% as functions approach the limit." },
          { t: "p", text: "**Which makes the aggregate a property of your codebase, not the chunker.** My first sample of 40 files gave 17% and this one of 139 gave 37%, identical method and chunk size. Quoting either as \u201cthe split rate\u201d would be quoting a function-size distribution." },
          { t: "p", text: "**So the decision rule is p90, not the mean.** At a p90 of 1,452 characters, a 500-character chunk size guarantees breaking the top decile of functions \u2014 which is the decile most worth retrieving whole, since large functions are where the logic lives." },
          { t: "p", text: "**And the max tells you where the fallback cap goes.** A 12,365-character definition is one chunk under pure AST splitting, roughly 3,000 tokens for a single retrieval slot. Cap it, split the overflow, and prepend the signature and docstring to each piece so no fragment is anonymous." },
          { t: "p", text: "One limit worth stating: `ast.walk` counts nested functions and methods individually, so a class with ten methods contributes ten rows here while `tree.body` chunking would emit one chunk for the class. The split measurement is still correct \u2014 a boundary inside a method is a boundary inside a function \u2014 but the function *count* is not the chunk count, and the two should not be compared directly." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Chunk size must exceed the size of the things you want retrieved whole, and for code that threshold is sharp: below it splitting is incidental, above it splitting is certain. So pick the size from your function-size p90, then cap the AST chunks that exceed it." },
        { t: "p", text: "Everything else is M5 and 6.4 reapplied with a parser doing the work a model would otherwise do. Symbols are BM25, callees are graph expansion, the re-rank comes after expansion because expansion trades precision for recall \u2014 and the relations come free from the syntax, which is why code is the easiest domain to build a graph for and the hardest to keep fresh." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cBuild us a coding assistant that answers questions about our repository. What does the retrieval look like?\u201d**" },
        { t: "p", text: "Chunking on the AST rather than on character count, and I would size it from a measurement rather than a default. I measured 1,487 functions across 139 Python files: with 500-character chunks, functions under 250 characters were split 2% of the time and functions over 500 characters were split 98 to 100% of the time. The threshold is just the chunk size, and the transition across it is almost total." },
        { t: "p", text: "That makes the aggregate split rate useless as a target \u2014 it is your function-size distribution in disguise, and two samples of the same codebase gave me 17% and 37%. The number to design against is p90, which was 1,452 characters here. A 500-character setting guarantees breaking the top decile of functions, which is the decile where the logic lives." },
        { t: "p", text: "Then three retrievers fused. Semantic for intent, an exact symbol index because `UserService` is an identifier and its embedding sits near \u201cuser\u201d and \u201caccount manager\u201d, and graph expansion for callees and type definitions. Fused by rank with RRF, since the scores are not comparable \u2014 same reason as BM25 beside vectors." },
        { t: "p", text: "Re-ranking after expansion, not before. Expansion is deliberately a recall move that destroys precision: I measured a median of 2 callees per function, p90 of 5 and a max of 12, so it triples the candidate set typically and multiplies it by thirteen at the tail. The re-ranker is what restores precision, and it helps most exactly when the first stage is weak." },
        { t: "p", text: "On the graph, I would use a real resolver rather than the twelve-line AST version. Mine left 69% of call edges pointing at names with no node \u2014 it cannot tell a local helper from `len` \u2014 and it skips `self.method()` entirely because that is `ast.Attribute` rather than `ast.Name`, which in class-heavy code is most calls." },
        { t: "p", text: "And freshness is the part I would design first, because a repository changes every commit. Hash per file, re-index on the commit hook, and delete by file path before inserting \u2014 keying deletion on chunk hashes means a renamed function survives in the index forever as a plausible, confidently-cited API that nobody can call." }
      ] }
  ],

  takeaways: [
    "**The split threshold is the chunk size and the transition is almost total**: measured over 1,487 functions, 2\u201315% split below it against 98\u2013100% above it.",
    "**So an aggregate split rate is uninterpretable** \u2014 it is a function-size distribution in disguise; the same method gave 17% on one sample and 37% on a larger one.",
    "**Design against p90, not the mean.** At a p90 of 1,452 chars, a 500-char chunk size guarantees breaking the top decile of functions, where the logic lives.",
    "**AST chunking gives up size control** \u2014 my sample ran to a 12,365-character definition, so production chunkers cap size and prepend the signature to each overflow piece.",
    "**AST metadata is exact and free**: name, kind, path, line range and docstring come from the parse, and `path:start-end` is a citation that survives reformatting.",
    "**Embed intent and implementation separately** \u2014 signature plus docstring answers \u201chow do I authenticate\u201d, the body answers \u201cwhere is bcrypt called\u201d.",
    "**Code is the one domain needing no extraction model for a graph**, because calls and inheritance are in the syntax \u2014 which removes 6.4's entity-resolution problem.",
    "**But the naive AST graph is badly incomplete**: 69% of my call edges resolved to nothing, and `self.method()` is `ast.Attribute` so the pattern skips most calls in OO code.",
    "**Expansion inflates context by the median and explodes at the tail** \u2014 median 2 callees, p90 5, max 12 \u2014 which is why re-ranking comes after expansion.",
    "**Symbol search is the BM25 of code and matters more here**, because an identifier's embedding sits near its English words rather than near its definition.",
    "**Delete by file path, not by chunk hash** \u2014 otherwise a renamed function survives as a plausible, retrievable, nonexistent API, and nothing errors."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Measured with a 500-character recursive splitter, functions of 0\u2013250 chars were split 2% of the time and functions of 500\u20131000 chars 98% of the time. What is the right conclusion?",
        options: [
          "The splitter has a bug that triggers on larger inputs",
          "A function longer than the chunk size cannot fit in one chunk, so the chunk size is the threshold \u2014 and the aggregate split rate is just your function-size distribution",
          "Recursive splitting works well for code as long as functions stay under 1000 characters",
          "The 500\u20131000 band was undersampled, making 98% unreliable"
        ],
        answer: 1,
        why: "The mechanism is pure arithmetic: anything larger than the chunk size must be divided, so splitting is near-certain above the threshold and merely coincidental below it. This makes aggregate percentages uninterpretable \u2014 the same method and chunk size gave 17% on a 40-file sample and 37% on a 139-file one, differing only in how big the functions were. The number to design against is the p90 function size, which was 1,452 characters, so a 500-character setting breaks the top decile by construction." },

      { stem: "A code graph built by matching ast.Call with an ast.Name function resolved only 31% of its edges to nodes in the graph. What are the two problems?",
        options: [
          "The parser failed on some files, and the graph was built before all files were indexed",
          "ast.Name cannot distinguish a local helper from a builtin like len, and self.method() is ast.Attribute so most calls in object-oriented code are skipped entirely",
          "Call edges should point to classes rather than functions, and inheritance was double-counted",
          "The graph needs embeddings to resolve names to definitions"
        ],
        answer: 1,
        why: "The pattern captures the name being called with no information about what it refers to, so builtins, imported symbols and local helpers are indistinguishable and 69% of edges point at names with no node. Separately, attribute-style calls are a different AST node type and are silently missed, which in class-heavy code is the majority of real calls. The fix is scope resolution \u2014 tracking imports, resolving receivers whose type is known, discarding builtins \u2014 which is what tree-sitter plus an index or a language server provides." },

      { stem: "Why does the reference's code retrieval pipeline re-rank after dependency expansion rather than before?",
        options: [
          "Because re-ranking is cheaper on a larger candidate set due to batching",
          "Expansion is a recall move that deliberately destroys precision \u2014 median 2 callees, max 12 \u2014 so the re-ranker is what restores it",
          "Because the expanded candidates have no embeddings and must be scored by the cross-encoder",
          "To ensure deduplication happens on the reranked list"
        ],
        answer: 1,
        why: "Pulling in callees and type dependencies multiplies the candidate set \u2014 roughly tripling it at the median and by thirteen at the tail \u2014 which raises the chance the needed context is present and lowers the proportion of candidates that are relevant. Re-ranking after expansion is what converts that recall back into precision, and re-ranking is measurably most valuable exactly when the first stage is weak, which an expanded set reliably is. It also explains the context-budget rule: five relevant functions beat twenty loosely related ones." },

      { stem: "A function is renamed in a commit. The code index deletes chunks by content hash before re-inserting. What happens?",
        options: [
          "The rename is handled correctly, since the file's hash changed and triggers a full re-index",
          "The old function's chunk is never deleted \u2014 nothing in the new file hashes to it \u2014 so the index keeps a plausible, retrievable API that no longer exists",
          "The upsert fails because the new chunk's hash collides with the old one",
          "Both the old and new names are retrievable, and the re-ranker will prefer the newer one"
        ],
        answer: 1,
        why: "A rename is a delete plus an insert with no hash relating them, so hash-keyed deletion has nothing to match and the stale chunk survives indefinitely. Keying deletion on the file path instead removes all of a file's chunks before re-inserting, which resolves renames within a file; a move between files needs both paths re-indexed, which a commit diff supplies. This is the highest-value thing to get right in a code index because the failure is silent and the wrong answer looks exactly as authoritative as a correct one." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where a parser replaces a model, and freshness becomes the hard part",
    questions: [
      { level: "core",
        q: "How is RAG over code different from RAG over documents?",
        strong: "A strong answer names the structural differences and what each one breaks.",
        answer: [
          { t: "p", text: "Five differences, each breaking a different assumption. Structure is strict rather than suggestive \u2014 half a function is not a shorter answer, it is a wrong one. Dependencies cross files, so the unit of meaning is a neighbourhood rather than a chunk. There are several valid representations of the same code: raw text, AST, docstring, generated summary." },
          { t: "p", text: "Then relevant context is long-range \u2014 a bug fix can span ten files, which no top-k of five covers. And it changes constantly, so incremental indexing stops being an optimisation and becomes the only workable design." },
          { t: "p", text: "The chunking consequence is measurable and sharper than I expected. Over 1,487 functions, a 500-character splitter broke 2% of functions under 250 characters and 98 to 100% of functions over 500. The chunk size *is* the threshold, so the aggregate rate is really a statement about your function sizes \u2014 two samples of mine gave 17% and 37%." },
          { t: "p", text: "So I would chunk on the AST and size the fallback cap from the p90 function size, which was 1,452 characters. The upside is that AST metadata comes free and exact \u2014 name, path, line range, docstring \u2014 and `path:start-end` is a citation that stays valid under reformatting." }
        ] },

      { level: "advanced",
        q: "How would you handle cross-file dependencies in a code RAG system?",
        strong: "A strong answer uses the graph and knows its failure modes.",
        answer: [
          { t: "p", text: "With a call graph, which is the one place a knowledge graph is nearly free \u2014 calls, inheritance and imports are in the syntax, so a parser recovers them exactly and the entity-resolution problem that makes graph building hard elsewhere disappears." },
          { t: "p", text: "Then expand retrieved functions by their callees and type dependencies, and re-rank afterwards. Expansion is deliberately a recall move that costs precision: I measured a median of 2 callees, p90 of 5 and a max of 12, so the candidate set roughly triples typically and grows thirteenfold at the tail. The re-rank restores precision, and it helps most when the first stage is weak, which an expanded set is." },
          { t: "p", text: "I would not ship the naive version though. The twelve-line AST graph left 69% of my call edges pointing at names with no node, because `ast.Name` cannot tell a local helper from `len`. And it skips `self.method()` entirely since that is `ast.Attribute`, which in class-heavy code is most calls \u2014 so it is systematically missing the edges that matter most." },
          { t: "p", text: "So scope resolution: track imports per module, resolve attribute access where the receiver's type is known, discard builtins. That is what tree-sitter with an index or a language server gives you, and the alternative is an authoritative-looking graph that is mostly disconnected." }
        ] },

      { level: "core",
        q: "How do you keep a code index fresh?",
        strong: "A strong answer treats renames as the dangerous case.",
        answer: [
          { t: "p", text: "Hash per file and re-index on the commit hook. Code is the case where event-driven indexing actually works, because the event exists and is reliable \u2014 which is the condition that usually makes event-driven designs impractical for prose corpora." },
          { t: "p", text: "Hashing is almost free relative to what it saves: I measured 12 documents of 360,000 characters hashing in 1.3 milliseconds against 13.2 seconds to re-embed them all, so the check costs a tiny fraction of the work it avoids and it is exact rather than heuristic." },
          { t: "p", text: "The part I would be most careful about is deletion, keyed on file path rather than chunk hash. A rename is a delete plus an insert that no content hash connects, so hash-keyed deletion leaves the old function in the index forever \u2014 a plausible, retrievable API under a name nobody can call, and nothing errors." },
          { t: "p", text: "That is the failure mode I would watch for generally in a code index: silent and confident. I would also store the commit SHA as metadata, which makes staleness auditable and lets a citation name the version it was true for." }
        ] }
    ]
  }
});
