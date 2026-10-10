EC.receiveLesson({
  id: "6.4",

  lede: "It is commonly said vector RAG \u201cfails for multi-hop questions\u201d. That is usually asserted and it is actually **checkable** \u2014 and the check is stronger than a recall number. Over a six-sentence corpus where every chunk is a single clean sentence, **zero chunks contain both endpoints** of the question. So there is no `k` at which a top-k of chunks contains the answer, however good the retriever. The answer is not in a chunk; it is in the path between four of them.",

  objectives: [
    "State the three query shapes a vector index structurally cannot answer",
    "Build a knowledge graph by entity and relation extraction",
    "Traverse a graph to answer a multi-hop question, and see where traversal answers the wrong question",
    "Explain what community detection and summarisation buy, and why Leiden rather than label propagation",
    "Decide between standard RAG, GraphRAG and both"
  ],

  prerequisites: ["5.9", "6.3"],

  blocks: [

    { t: "h2", n: "01", id: "structural", text: "A failure that is structural, not a tuning problem",
      sub: "The strongest claim in this module, and the easiest to check" },

    { t: "p", text: "Every retrieval improvement so far has been a matter of degree. Better chunking moved recall@5 a few points, hybrid search took it from 95% to 100%, HyDE moved one stubborn query from rank 15 to rank 1. All of those are dials. The multi-hop case is not a dial, and it is worth proving rather than asserting." },

    { t: "code", lang: "python", title: "g64.py \u00a7A \u2014 the corpus, one sentence per chunk", code: `CORPUS = {
    "instagram.md": [
        "Instagram was founded by Kevin Systrom and Mike Krieger in 2010.",
        "Instagram was acquired by Facebook in 2012 for one billion dollars.",
    ],
    "meta.md": [
        "Facebook renamed itself Meta Platforms in 2021.",
        "Meta Platforms is led by Mark Zuckerberg, who is its chief executive.",
    ],
    "zuckerberg.md": [
        "Mark Zuckerberg co-founded Facebook in 2004 while at Harvard.",
        "Before Facebook, Mark Zuckerberg built Synapse Media Player and Facemash.",
    ],
}
Q = "What companies did the CEO of the acquirer of Instagram work for?"`,
      caption: "Deliberately the friendliest possible chunking \u2014 one clean sentence each, no boundary to get wrong. Any failure here is structural." },

    { t: "code", lang: "python", title: "g64.py \u00a7A \u2014 does any single chunk hold both endpoints?", code: `need = ("Instagram", "Synapse")
for doc, s in CHUNKS:
    both = all(n.lower() in s.lower() for n in need)`,
      out: `  the hops the question requires:
    1. Instagram        --acquired by --> Facebook
    2. Facebook         --renamed to  --> Meta Platforms
    3. Meta Platforms   --CEO         --> Mark Zuckerberg
    4. Mark Zuckerberg  --worked for  --> Synapse Media Player / Facemash

  chunk          contains both 'Instagram' and 'Synapse'?
  instagram.md   Instagram was founded by Kevin Systrom and M   no
  instagram.md   Instagram was acquired by Facebook in 2012 f   no
  meta.md        Facebook renamed itself Meta Platforms in 20   no
  meta.md        Meta Platforms is led by Mark Zuckerberg, wh   no
  zuckerberg.md  Mark Zuckerberg co-founded Facebook in 2004    no
  zuckerberg.md  Before Facebook, Mark Zuckerberg built Synap   no

  chunks containing both endpoints: 0 of 6`,
      hl: [16],
      caption: "Zero. Not a low number \u2014 zero, as a property of the corpus rather than of the retriever." },

    { t: "callout", kind: "insight", title: "This is why recall@k is the wrong question here",
      body: [
        { t: "p", text: "Every metric in 6.1 asks where the relevant chunk was ranked. That question presupposes a relevant chunk exists. Here none does: the four facts live in four sentences across three documents, and the answer is a composition of them." },
        { t: "p", text: "So a retriever with perfect recall returns all six chunks, and the model must still perform the composition itself. Sometimes it can \u2014 with all six in context, a capable model may well chain them. But that is the *model* doing multi-hop reasoning over a context window, not retrieval solving it, and it degrades fast as the corpus grows and the six relevant sentences stop fitting in any top-k." },
        { t: "p", text: "That is the honest version of the claim. Vector RAG does not fail multi-hop because similarity is weak; it fails because the unit it retrieves is the wrong unit. You cannot fix a representation problem with a ranking improvement." }
      ] },

    { t: "p", text: "The common name is three shapes with this property, and they share it for the same reason." },

    { t: "dl", items: [
      { k: "Multi-hop questions", v: "\u201cWhat companies did the CEO of the acquirer of Instagram work for?\u201d The answer is a path. No chunk contains a path." },
      { k: "Aggregation queries", v: "\u201cWhat are all the side effects reported across these 50 clinical trial documents?\u201d The answer is a union over fifty documents, and top-k is 5." },
      { k: "Relationship queries", v: "\u201cHow are Entity A and Entity B connected?\u201d The answer is an edge sequence, which is only written down if someone happened to write that sentence." }
    ] },

    { t: "callout", kind: "trap", title: "Aggregation fails for a different reason than multi-hop",
      body: [
        { t: "p", text: "Worth separating, because the fixes differ. Multi-hop fails because the answer spans chunks. Aggregation fails because the answer spans *more chunks than k*, and raising k does not rescue it \u2014 6.1 measured precision@k falling from 0.75 to 0.26 as k went 1 to 20, and a fifty-document union needs a k that drowns the context." },
        { t: "p", text: "So aggregation is sometimes better served without a graph at all. If the side effects are a column in a table, 5.12\u2019s answer applies: that is a `SELECT DISTINCT`, and text-to-SQL answers it exactly while any retrieval approach approximates it." },
        { t: "p", text: "GraphRAG earns aggregation queries when the facts are genuinely unstructured \u2014 scattered through prose with no table to query. Then community summarisation gives you a precomputed union to retrieve instead of fifty chunks to fit." }
      ] },

    { t: "h2", n: "02", id: "build", text: "Building the graph",
      sub: "Extraction is a model call, and it is where the quality is decided" },

    { t: "code", lang: "python", title: "extraction, then storage", code: `from langchain_experimental.graph_transformers import LLMGraphTransformer

llm = ChatOpenAI(model="gpt-4o", temperature=0)
transformer = LLMGraphTransformer(llm=llm)

documents = [Document(page_content="Apple was founded by Steve Jobs in 1976. "
                      "Tim Cook became CEO in 2011.")]
graph_docs = transformer.convert_to_graph_documents(documents)
# nodes: Apple (Company), Steve Jobs (Person), Tim Cook (Person)
# edges: Steve Jobs -[FOUNDED]-> Apple, Tim Cook -[CEO_OF]-> Apple

graph = Neo4jGraph(url="bolt://localhost:7687", username="neo4j", password="...")
graph.add_graph_documents(graph_docs)`,
      hl: [3, 7],
      caption: "temperature=0 is not decoration. Extraction run twice at temperature 1 gives two different graphs." },

    { t: "callout", kind: "warn", title: "Entity resolution is the part that decides whether this works",
      body: [
        { t: "p", text: "The example is clean because the text names each entity once, consistently. Real corpora do not: \u201cFacebook\u201d, \u201cFacebook, Inc.\u201d, \u201cMeta\u201d, \u201cMeta Platforms\u201d and \u201cFB\u201d may be five nodes for one company, and then no traversal connects anything." },
        { t: "p", text: "That is the same problem as 6.3\u2019s deduplication, one level up \u2014 and the same ladder applies. Normalise names, then collapse near-identical ones, then accept that some need a human alias table. A graph with unresolved entities is strictly worse than no graph, because it looks authoritative while being disconnected." },
        { t: "p", text: "The corpus below has this problem deliberately: Facebook and Meta Platforms are two nodes joined by a `RENAMED_TO` edge rather than one node. That is the *honest* modelling \u2014 they are different names with a dated relationship \u2014 and \u00a703 shows it producing an answer by a route the question did not ask for." }
      ] },

    { t: "callout", kind: "tradeoff", title: "What extraction costs",
      body: [
        { t: "p", text: "One model call per document, at ingestion. 6.2 put that on the right side of the ledger \u2014 ingestion runs on the slow clock, so per-document model calls cost nothing per query. For a corpus of a few thousand documents this is an afternoon and a modest bill." },
        { t: "p", text: "The cost that bites is maintenance. A changed document needs its entities re-extracted and its old edges removed, which is 6.3\u2019s orphan problem with a harder deletion: a stale *edge* is invisible in a way a stale chunk is not, because nothing displays it directly \u2014 it just quietly makes a traversal find a path that no longer exists." },
        { t: "p", text: "So budget for it as a second index with its own ingestion pipeline, freshness story and failure modes, maintained alongside the vector index rather than instead of it. That is the real reason the reference marks GraphRAG \u201coverkill\u201d for small corpora \u2014 not the compute, the operational surface." }
      ] },

    { t: "h2", n: "03", id: "traverse", text: "Traversal answers the question exactly \u2014 and sometimes a different question",
      sub: "The most interesting thing my own script did" },

    { t: "code", lang: "python", title: "g64.py \u00a7B \u2014 breadth-first search over the edges", code: `EDGES = [
    ("Instagram",       "ACQUIRED_BY", "Facebook"),
    ("Facebook",        "RENAMED_TO",  "Meta Platforms"),
    ("Mark Zuckerberg", "CEO_OF",      "Meta Platforms"),
    ("Mark Zuckerberg", "FOUNDED",     "Facebook"),
    ("Mark Zuckerberg", "WORKED_ON",   "Synapse Media Player"),
    ("Mark Zuckerberg", "WORKED_ON",   "Facemash"),
    # ... founders and Harvard
]
goal, path = bfs("Instagram",
                 lambda n: n in ("Synapse Media Player", "Facemash"))`,
      out: `  start: Instagram   goal: something Zuckerberg worked on
  found: Synapse Media Player in 3 hops
    Instagram              -[ACQUIRED_BY]>- Facebook
    Facebook               -[FOUNDED]<- Mark Zuckerberg
    Mark Zuckerberg        -[WORKED_ON]>- Synapse Media Player

  nodes visited: 4 of 9 in the graph
  the traversal is exact and cheap. No embedding was involved.`,
      hl: [2, 3, 4],
      caption: "Three hops, not the four the question implies. Look at which relation it used." },

    { t: "callout", kind: "trap", title: "It got the right answer by the wrong reasoning",
      body: [
        { t: "p", text: "The question asks about **the CEO of the acquirer**. The path BFS found never traverses `CEO_OF` at all \u2014 it goes Instagram \u2192 Facebook \u2192 *founder of* Facebook \u2192 what he worked on. It skipped the rename hop and substituted \u201cfounded\u201d for \u201cis chief executive of\u201d." },
        { t: "p", text: "Here that is harmless, because Zuckerberg happens to be both the founder and the CEO. Change one fact \u2014 suppose the CEO were someone who had not founded the company \u2014 and this path returns a confident, well-evidenced, **wrong** answer, with a citable chain of real edges behind it." },
        { t: "p", text: "The cause is that BFS optimises path length, and path length is not the question\u2019s semantics. Shortest-path traversal asks \u201care these connected?\u201d. The question asked \u201cconnected *how*?\u201d \u2014 and those come apart precisely when a graph is dense enough to be useful." }
      ] },

    { t: "callout", kind: "good", title: "Which is why production GraphRAG generates Cypher instead",
      body: [
        { t: "p", text: "A typed query names the relations it wants, so it cannot substitute one for another. That is the real argument for `GraphCypherQAChain` over hand-rolled traversal, and it is a correctness argument rather than a convenience one." },
        { t: "p", text: "Written out, the intended question is unambiguous: `MATCH (i {name:'Instagram'})-[:ACQUIRED_BY]->(c)-[:RENAMED_TO*0..1]->(c2)<-[:CEO_OF]-(p)-[:WORKED_ON]->(x) RETURN x.name`. There is no path through `FOUNDED` because none was asked for." },
        { t: "p", text: "The cost is that the model now has to write correct Cypher against your actual schema, which is a harder generation than a rewrite \u2014 and 5.12\u2019s text-to-SQL caveats transfer wholesale: it needs the schema in context, it fails on ambiguous naming, and it must be read before it is trusted." }
      ] },

    { t: "code", lang: "python", title: "the chain, and the flag worth reading twice", code: `chain = GraphCypherQAChain.from_llm(
    llm=llm, graph=graph, verbose=True,
    allow_dangerous_requests=True,
)
result = chain.invoke({"query": "Who founded Apple?"})
# generates: MATCH (p)-[:FOUNDED]->(c {name: 'Apple'}) RETURN p.name`,
      hl: [3],
      caption: "The flag is named accurately: a model is writing queries against your database." },

    { t: "callout", kind: "warn", title: "allow_dangerous_requests is not a formality",
      body: [
        { t: "p", text: "Generated Cypher can delete. `MATCH (n) DETACH DELETE n` is a valid query, and nothing in the chain is obliged to avoid it \u2014 the same exposure 5.12 flagged for text-to-SQL, with the same mitigation." },
        { t: "p", text: "Connect with a read-only account. Not a prompt instructing the model to only read \u2014 a database role that cannot write, so that a prompt injection in a retrieved document has nothing to escalate to." },
        { t: "p", text: "And cap the traversal. An unbounded variable-length match on a well-connected graph can walk most of it; `LIMIT` and a bounded hop count are what stop one query becoming an outage, which is 20.3\u2019s coordination problem in miniature." }
      ] },

    { t: "viz", title: "Two retrieval units, two kinds of question", caption: "A chunk holds a statement. An edge holds a relation. Questions about paths need the second.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Chunks versus graph edges as retrieval units">
  <text x="16" y="22" class="s-label">VECTOR INDEX \u2014 the unit is a chunk</text>
  <rect x="16" y="34" width="160" height="34" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="24" y="55" class="s-mono" style="font-size:10px">Instagram acquired...</text>
  <rect x="190" y="34" width="160" height="34" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="198" y="55" class="s-mono" style="font-size:10px">Facebook renamed...</text>
  <rect x="364" y="34" width="160" height="34" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="372" y="55" class="s-mono" style="font-size:10px">Meta led by Mark...</text>
  <rect x="538" y="34" width="160" height="34" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="546" y="55" class="s-mono" style="font-size:10px">Mark built Synapse...</text>
  <text x="16" y="90" class="s-mono" style="fill:var(--crit)">no chunk contains both endpoints \u2014 measured, 0 of 6</text>
  <text x="16" y="108" class="s-sub">so no top-k of chunks holds the answer, at any k</text>

  <line x1="16" y1="126" x2="744" y2="126" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="150" class="s-label">GRAPH \u2014 the unit is an edge</text>
  <circle cx="70" cy="196" r="24" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="70" y="200" text-anchor="middle" class="s-mono" style="font-size:9px">IG</text>
  <circle cx="230" cy="196" r="24" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="230" y="200" text-anchor="middle" class="s-mono" style="font-size:9px">FB</text>
  <circle cx="400" cy="196" r="24" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="400" y="200" text-anchor="middle" class="s-mono" style="font-size:9px">Mark</text>
  <circle cx="580" cy="196" r="28" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="580" y="200" text-anchor="middle" class="s-mono" style="font-size:9px">Synapse</text>
  <line x1="94" y1="196" x2="206" y2="196" stroke="var(--accent)" stroke-width="1.6"/>
  <text x="150" y="188" text-anchor="middle" class="s-sub" style="font-size:9px">ACQUIRED_BY</text>
  <line x1="254" y1="196" x2="376" y2="196" stroke="var(--crit)" stroke-width="2"/>
  <text x="315" y="188" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">FOUNDED</text>
  <line x1="424" y1="196" x2="552" y2="196" stroke="var(--good)" stroke-width="1.6"/>
  <text x="488" y="188" text-anchor="middle" class="s-sub" style="font-size:9px">WORKED_ON</text>
  <text x="16" y="248" class="s-mono" style="fill:var(--good)">BFS found it in 3 hops \u2014 exact, cheap, no embedding</text>
  <text x="16" y="268" class="s-mono" style="fill:var(--crit)">but via FOUNDED, not CEO_OF \u2014 it answered a question nobody asked</text>
  <text x="16" y="288" class="s-sub">shortest path optimises length, not the question's semantics \u2014 hence typed Cypher</text>
</svg>` },

    { t: "h2", n: "04", id: "communities", text: "Communities, and why Leiden rather than the obvious algorithm",
      sub: "Where my own demonstration misbehaved usefully" },

    { t: "p", text: "Microsoft\u2019s GraphRAG adds a step that answers the aggregation case: detect communities of related entities with the Leiden algorithm, summarise each with a model, and route broad questions to the summaries rather than to chunks. \u201cWhat are the main themes in this corpus?\u201d then has something to retrieve, which standard RAG never does because no chunk states a theme." },

    { t: "p", text: "I implemented the cheap version \u2014 label propagation, where every node repeatedly adopts its neighbours\u2019 most common label \u2014 over a graph with an obvious two-company structure." },

    { t: "code", lang: "python", title: "g64.py \u00a7C \u2014 label propagation over a nine-plus-five-node graph", code: `label = {n: i for i, n in enumerate(sorted(A2))}
for it in range(20):
    changed = 0
    for n in sorted(A2):
        c = collections.Counter(label[m] for m in A2[n])
        best = min((l for l, k in c.items() if k == max(c.values())))
        if best != label[n]:
            label[n] = best; changed += 1
    if not changed:
        break`,
      out: `  converged after 2 passes

  community 10 (6 nodes): Apple, NeXT, Steve Jobs, Steve Wozniak, Tim Cook, iPhone
  community 4 (5 nodes): Facebook, Instagram, Kevin Systrom, Meta Platforms, Mike Krieger
  community 6 (4 nodes): Facemash, Harvard, Mark Zuckerberg, Synapse Media Player`,
      hl: [9],
      caption: "Three communities. The script's own printed conclusion said two." },

    { t: "callout", kind: "trap", title: "My script asserted two communities and produced three",
      body: [
        { t: "p", text: "I wrote the summary line \u2014 \u201ctwo components fall out with no supervision\u201d \u2014 while writing the script, from the structure I intended the graph to have. It printed three, and the third is wrong in an instructive way: **Mark Zuckerberg was split away from Facebook and Meta** into a community with Harvard, Facemash and Synapse." },
        { t: "p", text: "That is the worst possible split for this corpus. Zuckerberg is the most connected node in the Facebook side; putting him in his own group means a community summary of \u201cFacebook, Instagram, Meta, and its two Instagram founders\u201d would not mention him, and a global search for themes would describe Meta without its chief executive." },
        { t: "p", text: "I am leaving it as it ran, because the failure is the lesson. It is not a bug in my loop \u2014 it is the documented weakness of label propagation, and it is exactly what Leiden was designed to fix." }
      ] },

    { t: "callout", kind: "insight", title: "What Leiden fixes, concretely",
      body: [
        { t: "p", text: "Label propagation has no objective function. It is a local update rule that stops when nothing changes, so it reaches *a* fixed point with no guarantee the fixed point is good \u2014 and which one depends on the iteration order. Mine converged in two passes to a partition that severs a hub from its cluster." },
        { t: "p", text: "Leiden optimises modularity \u2014 a global score for how much denser the within-community edges are than chance \u2014 and adds a refinement phase that explicitly guarantees every community is internally connected, which is the property mine violated. It also returns a *hierarchy*, so you get communities at several resolutions." },
        { t: "p", text: "The hierarchy is not a bonus, it is what makes global search work. Microsoft\u2019s routing picks a level: a narrow question uses fine communities, \u201cwhat are the main themes\u201d uses coarse ones. With a single flat partition there is no level to pick, so the summaries are either too granular to be themes or too broad to be informative." }
      ] },

    { t: "callout", kind: "note", title: "Local and global search are two different retrievers",
      body: [
        { t: "p", text: "**Local search** answers specific questions by finding the query\u2019s entities, pulling their neighbourhoods, and combining that with ordinary vector retrieval. It is the hybrid of 5.9 with a graph as the second retriever instead of BM25, and RRF fuses the two rankings the same way." },
        { t: "p", text: "**Global search** answers thematic questions by searching community summaries instead of chunks. Nothing in a vector index can do this, because the summaries are *generated artefacts* \u2014 they did not exist in the corpus until the pipeline wrote them." },
        { t: "p", text: "Which means global search inherits every hallucination risk of generation, at ingestion time, baked into a retrievable artefact. A wrong community summary is worse than a wrong answer: it is a wrong answer that will be retrieved and cited repeatedly, and 5.13\u2019s citation chain points at a summary rather than at a source." }
      ] },

    { t: "h2", n: "05", id: "decide", text: "When it is worth it",
      sub: "Usually: both, or neither" },

    { t: "table",
      head: ["Scenario", "Standard RAG", "GraphRAG", "Why"],
      rows: [
        ["Simple factual Q&A", "**Yes**", "Overkill", "The answer is in one chunk; 6.1 measured 95% recall@5 finding it"],
        ["Multi-hop reasoning", "**No**", "**Yes**", "Measured: 0 of 6 chunks hold both endpoints \u2014 structural, not tunable"],
        ["Relationship queries", "**No**", "**Yes**", "The answer is an edge sequence, written down only by accident"],
        ["Corpus-level summarisation", "**No**", "**Yes**", "No chunk states a theme; community summaries are generated to"],
        ["Aggregation over 50 docs", "**No**", "Sometimes", "If it is a table, 5.12's text-to-SQL is exact and cheaper"],
        ["Fewer than ~50 documents", "**Yes**", "Overkill", "Put all of it in context; retrieval is the wrong tool too"],
        ["Large interconnected corpus", "Struggles", "**Yes**", "This is the case the whole approach was built for"]
      ] },

    { t: "callout", kind: "tradeoff", title: "The table has an implicit row",
      body: [
        { t: "p", text: "Read down the columns and GraphRAG wins four rows outright. Read the *traffic* instead and the picture inverts: in most products the overwhelming majority of questions are the first row, simple factual Q&A, where the table says GraphRAG is overkill." },
        { t: "p", text: "So this is rarely a replacement decision. It is 5.9\u2019s hybrid pattern again \u2014 run both retrievers, fuse the rankings \u2014 or 5.11\u2019s routing, where a classifier sends multi-hop and thematic questions to the graph and everything else to the vector index." },
        { t: "p", text: "And the honest default for a new system is neither. Build the vector pipeline, measure it with 6.1\u2019s metrics, and look at the queries it fails. If they are multi-hop and relational, you have a graph-shaped problem and now you can prove it. If they are chunking and ranking failures, a graph would have been an expensive second index that fixed nothing." }
      ] },

    { t: "exercise", kind: "build", title: "Prove whether your failures are graph-shaped", difficulty: "advanced", minutes: 40,
      body: "Take the queries your vector pipeline currently fails. For each, check whether any single chunk in the corpus contains enough to answer it \u2014 the §A test, mechanically. Classify each failure as structural (no chunk suffices) or ranking (a chunk suffices but was not retrieved). Only the structural ones are evidence for a graph.",
      requirements: [
        "Use the failing queries from your own evaluation set, not invented ones",
        "For each, identify the entities the answer requires and test for co-occurrence in a single chunk",
        "Classify each failure as structural or ranking, with the evidence",
        "Report the proportion that are structural",
        "State what you would build, and what the measurement says about it"
      ],
      hint: "The co-occurrence test is a substring check, not a model call. If a chunk contains every entity the answer needs, the failure is ranking and a graph will not help.",
      solution: { lang: "python", title: "the classifier", code: `def structural_failure(query_entities, chunks):
    """Is there ANY chunk containing every entity the answer requires?"""
    for c in chunks:
        low = c.lower()
        if all(e.lower() in low for e in query_entities):
            return False, c          # ranking failure -- the chunk exists
    return True, None                # structural -- no chunk suffices

FAILING = [
    # (query, the entities an answer must bring together)
    ("What companies did the CEO of the acquirer of Instagram work for?",
     ["Instagram", "Synapse"]),
    ("Why divide alpha by r in LoRA?",
     ["alpha", "scaling"]),
    ("What are the main themes across the corpus?",
     []),                            # no entity set -- aggregation, not multi-hop
]

structural = 0
for q, ents in FAILING:
    if not ents:
        print("AGGREGATION  %s" % q[:52]); structural += 1; continue
    is_struct, witness = structural_failure(ents, chunks)
    print("%-12s %s" % ("STRUCTURAL" if is_struct else "RANKING", q[:52]))
    if not is_struct:
        print("             witness: %s" % witness[:60].replace("\n", " "))
    structural += is_struct
print("\nstructural: %d of %d" % (structural, len(FAILING)))`,
        out: `  [shape -- the classification depends on your corpus]

  STRUCTURAL   What companies did the CEO of the acquirer of Insta
  RANKING      Why divide alpha by r in LoRA?
               witness: The scaling factor alpha/r keeps the update magnitu
  AGGREGATION  What are the main themes across the corpus?

  structural: 2 of 3`,
        notes: [
          { t: "p", text: "**The middle row is the one that saves money.** \u201cWhy divide alpha by r?\u201d was the query that stuck at rank 15 through all of M5 and reached rank 1 only under HyDE \u2014 a genuinely hard retrieval problem, and entirely a *ranking* failure. A chunk answering it exists. A knowledge graph would have done nothing for it." },
          { t: "p", text: "**That is the common case and the reason for this exercise.** A pipeline failing 5% of queries usually fails them on chunking and ranking, and those are fixed by the cheap interventions M5 measured \u2014 hybrid search took recall@5 from 95% to 100% for nine lines of arithmetic." },
          { t: "p", text: "**The test is a substring check, deliberately.** It is a lower bound on what a model could extract from a chunk, so it over-reports structural failures rather than under-reporting them \u2014 erring toward recommending a graph you may not need, which is the safe direction for a decision you then scrutinise." },
          { t: "p", text: "**Aggregation needs its own bucket**, because there is no entity set to test for: the answer is a union over documents and the failure is that it does not fit in any k. Those are graph-shaped only if the facts are unstructured; if they are a column, 5.12's text-to-SQL is exact." },
          { t: "p", text: "One honest limit: an entity list per failing query is hand-written, so this classifies your *understanding* of each failure as much as the failure. It is still worth doing \u2014 writing down what an answer requires is most of the diagnosis, and it is what stops \u201cRAG is not working\u201d from becoming an architecture decision." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A chunk holds a statement; an edge holds a relation. Questions whose answers are paths, unions or connections are not retrieval failures you can tune away \u2014 the retrieved unit is simply the wrong unit, and 0 of 6 is not a number any ranking improves." },
        { t: "p", text: "But traversal buys exactness and spends it on semantics: shortest path asks whether things are connected, not how. That is why production GraphRAG writes typed queries, and why the graph is almost always a second retriever beside the vector index rather than a replacement for it." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur RAG cannot answer questions that span documents. Should we build a knowledge graph?\u201d**" },
        { t: "p", text: "Possibly, and I would want to prove it first with a test that takes an afternoon. For each failing query, list the entities an answer must bring together and check whether any single chunk contains all of them. If one does, the failure is ranking and a graph fixes nothing; if none does, it is structural." },
        { t: "p", text: "That distinction is worth a lot of money. On my own corpus the hardest query \u2014 one that sat at rank 15 through every chunking strategy and only reached rank 1 under HyDE \u2014 was purely a ranking failure. A chunk answering it existed the whole time. Meanwhile the multi-hop question had **0 of 6** chunks containing both endpoints, which no value of k fixes." },
        { t: "p", text: "If the failures are structural, I would still not replace the vector index. Most traffic is simple factual Q&A where a graph is overkill, so this is 5.9\u2019s hybrid pattern with a graph as the second retriever, or a router sending multi-hop and thematic questions to it." },
        { t: "p", text: "And I would budget for the parts that are harder than the demo. Entity resolution first \u2014 if Facebook, Meta and FB are three nodes, nothing traverses, and an authoritative-looking disconnected graph is worse than none. Then stale edges on update, which are invisible in a way stale chunks are not." },
        { t: "p", text: "One caution from my own traversal: BFS answered the question through `FOUNDED` rather than `CEO_OF`, getting the right answer by reasoning the question did not ask for. It was right only because the founder and the CEO happen to be the same person. That is the argument for generating typed Cypher rather than hand-rolling shortest-path \u2014 and for connecting with a read-only role, since a model is writing queries against the database." }
      ] }
  ],

  takeaways: [
    "**Multi-hop failure is structural, not a tuning problem** \u2014 measured over one-sentence chunks, 0 of 6 contained both endpoints, so no top-k at any k holds the answer.",
    "**So recall@k is the wrong question** for these queries: every metric in 6.1 presupposes a relevant chunk exists, and here none does.",
    "**Three shapes share the property** \u2014 multi-hop (answer is a path), aggregation (answer spans more chunks than k), relationship (answer is an edge sequence).",
    "**Aggregation fails for a different reason** and sometimes needs SQL rather than a graph; if the facts are a column, 5.12 answers it exactly.",
    "**Entity resolution decides whether a graph works.** Facebook, Meta and FB as three nodes means nothing traverses, and a disconnected graph looks authoritative while being useless.",
    "**Shortest-path traversal optimises length, not semantics** \u2014 my BFS answered via `FOUNDED` instead of `CEO_OF`, right only because the founder and CEO coincide.",
    "**Hence typed Cypher**, which names the relations it wants and cannot substitute one for another \u2014 a correctness argument, not a convenience one.",
    "**`allow_dangerous_requests` is named accurately**: use a read-only database role and a bounded hop count, not a prompt asking the model to behave.",
    "**Label propagation has no objective function** \u2014 mine converged in two passes to a partition that severed Zuckerberg from Facebook, which is exactly what Leiden's refinement phase guarantees against.",
    "**Leiden's hierarchy is what makes global search work**, because routing needs a resolution level to pick; a flat partition gives summaries that are too granular or too broad.",
    "**Community summaries are generated artefacts**, so a wrong one is a hallucination baked into a retrievable, repeatedly-cited object.",
    "**The honest default for a new system is neither** \u2014 build the vector pipeline, measure it, and look at what it fails before buying a second index."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Over a corpus chunked one clean sentence per chunk, 0 of 6 chunks contained both endpoints of a multi-hop question. What does this establish?",
        options: [
          "The chunk size was too small; larger chunks would contain both endpoints",
          "The failure is structural \u2014 no top-k of chunks contains the answer at any k, because the answer is a composition across four chunks rather than a statement in one",
          "The retriever's recall@5 was too low and hybrid search would fix it",
          "The embedding model was too weak to represent the relationship"
        ],
        answer: 1,
        why: "Recall metrics ask where a relevant chunk ranked, which presupposes one exists; here none does. A perfect retriever returns all six chunks and the model must still compose them itself, which is the model doing multi-hop reasoning over a context window rather than retrieval solving it \u2014 and that degrades as the corpus grows and the relevant sentences stop fitting any top-k. Larger chunks only help if the facts happen to be adjacent in one document, which across three documents they are not." },

      { stem: "A BFS from Instagram to \"something Zuckerberg worked on\" found the answer in 3 hops via the FOUNDED relation, though the question asked about the CEO of the acquirer. Why does this matter?",
        options: [
          "It does not \u2014 the answer returned was correct",
          "Shortest-path traversal optimises path length rather than the question's semantics, so it was right only because the founder and CEO coincide; with a non-founder CEO it returns a confident wrong answer backed by real edges",
          "BFS should have been depth-first search, which follows relation types in order",
          "The graph was missing the RENAMED_TO edge, so the path had to route around it"
        ],
        answer: 1,
        why: "The path skipped CEO_OF entirely and substituted FOUNDED. It happened to be right because Zuckerberg is both, but the reasoning does not match the question, so the same traversal on a company whose CEO was not its founder gives a wrong answer with a citable chain of genuine edges behind it. This is the correctness argument for generating typed Cypher, which names the relations it wants and so cannot substitute one for another." },

      { stem: "Label propagation over a two-company graph converged in two passes to three communities, one of which separated Mark Zuckerberg from Facebook and Meta. What is the general lesson?",
        options: [
          "The implementation had a bug in its tie-breaking rule",
          "Label propagation has no objective function \u2014 it reaches some fixed point with no guarantee of quality or internal connectivity, which is precisely what Leiden's modularity optimisation and refinement phase address",
          "The graph needed more edges before community detection becomes meaningful",
          "Communities should be assigned by the extraction model rather than detected"
        ],
        answer: 1,
        why: "Label propagation is a local update rule that halts when nothing changes, so the result depends on iteration order and can sever a hub from its cluster \u2014 which is what happened to the most connected node on the Facebook side. Leiden optimises modularity globally and its refinement phase explicitly guarantees each community is internally connected. It also returns a hierarchy, which global search needs because routing must pick a resolution level." },

      { stem: "You are deciding whether to add GraphRAG to a working vector pipeline. What is the most informative cheap test?",
        options: [
          "Measure recall@k on the failing queries to see how far off the retriever is",
          "For each failing query, check whether any single chunk contains every entity an answer requires \u2014 separating structural failures from ranking failures",
          "Build the graph for a sample of documents and compare answer quality",
          "Count how many queries mention more than one named entity"
        ],
        answer: 1,
        why: "Only structural failures \u2014 where no chunk suffices \u2014 are evidence for a graph; ranking failures are fixed far more cheaply, and M5 measured hybrid search taking recall@5 from 95% to 100% for nine lines. The test is a substring check rather than a model call, and because substring matching is a lower bound on what a model could extract from a chunk, it over-reports structural failures, erring toward recommending a graph you then scrutinise rather than missing a real need." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where the architecture question has a measurable answer",
    questions: [
      { level: "advanced",
        q: "What is GraphRAG and when would you use it?",
        strong: "A strong answer explains why the failure is structural rather than asserting that graphs are better.",
        answer: [
          { t: "p", text: "It retrieves over entities and relations instead of over text chunks, which matters for a specific class of question: ones whose answer is a path, a union or a connection rather than a statement." },
          { t: "p", text: "The reason is structural and worth demonstrating rather than asserting. I took a six-sentence corpus, chunked it one clean sentence per chunk \u2014 the friendliest possible case \u2014 and asked which chunk contained both endpoints of a four-hop question. Zero of six. So there is no k at which a top-k of chunks contains the answer, and recall is not the right metric because it presupposes a relevant chunk exists." },
          { t: "p", text: "Over a graph the same question is a traversal: exact, cheap, no embedding involved. And community detection plus summarisation adds the aggregation case \u2014 \u201cwhat are the main themes\u201d has something to retrieve, because the summaries were generated at ingestion. Standard RAG can never answer that, since no chunk states a theme." },
          { t: "p", text: "When to use it, though: almost always as a second retriever rather than a replacement. Most traffic in most products is simple factual Q&A where a graph is overkill, so it is hybrid retrieval or a router. And for a new system I would build the vector pipeline first, measure it, and classify the failures \u2014 if they are chunking and ranking problems, a graph is an expensive second index that fixes nothing." }
        ] },

      { level: "advanced",
        q: "What are the hard parts of building a knowledge graph from documents?",
        strong: "A strong answer names entity resolution and stale edges, not extraction.",
        answer: [
          { t: "p", text: "Extraction itself is the easy part \u2014 a model call per document at ingestion, which runs on the slow clock and so costs nothing per query. The hard parts come after." },
          { t: "p", text: "Entity resolution first, and it decides whether the whole thing works. Facebook, Facebook Inc., Meta, Meta Platforms and FB can become five nodes for one company, and then no traversal connects anything. It is deduplication one level up and the same ladder applies \u2014 normalise, collapse near-identical, then accept that some need a human alias table. A graph with unresolved entities is worse than no graph, because it looks authoritative while being disconnected." },
          { t: "p", text: "Then maintenance. A changed document needs re-extraction and its old edges removed, which is the orphan problem with a harder deletion: a stale edge is invisible in a way a stale chunk is not, because nothing displays it \u2014 it just makes a traversal find a path that no longer exists." },
          { t: "p", text: "And I would be careful about community summaries if using global search. They are generated artefacts, so a wrong summary is a hallucination baked into something that will be retrieved and cited repeatedly, with the citation chain pointing at a summary rather than a source." },
          { t: "p", text: "Operationally it is a second index with its own pipeline, freshness story and failure modes. That surface, rather than the compute, is the real reason it is overkill for small corpora." }
        ] },

      { level: "core",
        q: "How would you combine graph and vector retrieval in one system?",
        strong: "A strong answer reuses the hybrid machinery rather than inventing new merging.",
        answer: [
          { t: "p", text: "The same way I would combine BM25 and vectors, because it is the same problem: two retrievers producing two rankings with incomparable scores. Reciprocal rank fusion handles it in nine lines and never compares the raw scores \u2014 it only uses ranks, which is exactly why it works across retrievers of different kinds." },
          { t: "p", text: "Concretely that is Microsoft\u2019s local search: extract the query\u2019s entities, pull their graph neighbourhoods, run ordinary vector retrieval alongside, and fuse. Global search is the other path, routing thematic questions to community summaries instead." },
          { t: "p", text: "The alternative is routing rather than fusing \u2014 a classifier sends multi-hop and relationship questions to the graph and everything else to the vector index. That is cheaper per query since only one retriever runs, and it fails differently: a misrouted query gets the wrong retriever entirely, where fusion degrades gracefully." },
          { t: "p", text: "I would default to fusion for correctness and move to routing if the latency or cost demanded it, with 6.1\u2019s metrics measuring what the change cost. And I would watch the graph side\u2019s traversal depth \u2014 an unbounded variable-length match on a well-connected graph can walk most of it, so a hop cap and a LIMIT are what stop one query becoming an outage." }
        ] }
    ]
  }
});
