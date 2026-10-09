EC.receiveLesson({
  id: "7.5",
  lede: "Delete a document from the source system and the index does not notice: `ntotal` is unchanged, the deleted document is still the top result, and it will be retrieved, placed in the context and cited \u2014 pointing at something that no longer exists. Then the fix has its own trap, and it is the source of most *\u201cthe citations are off by one\u201d* bugs: `remove_ids` **renumbers** the remaining vectors, so any list you were using to map positions to document ids is now wrong for everything after the deletion. And even when incremental updates work, they drift: BM25's `df`, `avgdl` and `N` are corpus-wide, so adding documents incrementally leaves every IDF computed from stale counts.",
  objectives: [
    "Show that a source delete leaves the index unchanged",
    "Explain why a vector delete renumbers positions, and what breaks",
    "Compute the staleness window a periodic rebuild gives you",
    "Name what incremental updates drift on and why it is silent",
    "Use metadata to make staleness visible rather than invisible"
  ],
  prerequisites: ["5.5", "5.2"],
  blocks: [
    { t: "h2", n: "01", id: "ghost", text: "The document that was deleted", sub: "And is still the top result" },

    {"kind": "steps", "title": "Delete a document and the index does not notice", "caption": "`ntotal` is unchanged, the deleted document is still the top result, and it will be retrieved, placed in the context and **cited** — pointing at something that no longer exists. Which is the same mechanism as the permission bug: the index is a stale copy.", "items": [{"label": "delete it from the source system", "desc": "the row is gone; the vector is not", "tone": "accent", "code": "source"}, {"label": "ntotal is unchanged", "desc": "nothing in the store reports a discrepancy", "tone": "warn", "code": "silent"}, {"label": "it is still the top result", "desc": "and still the most similar vector, because similarity knows nothing about existence", "tone": "crit", "code": "retrieved"}, {"label": "and the answer CITES it", "desc": "a verifiable-looking citation pointing at a deleted document", "tone": "crit", "code": "the damage"}], "t": "diagram", "id": "dg-7_5-01-0"},




    { t: "code", lang: "text", title: "A delete the index never heard about",
      code: "built an index over 10 documents, ntotal=10\nquery top 3: ['api-limits', 'bill-overage', 'bill-cancel-sub']\n\ndeleted from source : api-limits\n  index ntotal      : 10  (unchanged)\n  query top 3       : ['api-limits', 'bill-overage', 'bill-cancel-sub']",
      caption: "The deleted document is still first." },
    { t: "p", text: "Nothing malfunctioned. The index holds vectors, and removing a row from a database does not touch them. The document will be retrieved, placed in the context, and cited \u2014 and 7.4's free check will pass, because the id *was* retrieved. Only a check against the source system would catch it." },
    { t: "h2", n: "02", id: "renumber", text: "The delete that breaks your ids", sub: "Where the off-by-one bugs come from" },
    { t: "table", head: ["index", "delete", "consequence"], rows: [
      ["`IndexFlatIP`", "`remove_ids`, shifts the array", "**ids after it renumber**"],
      ["IVF", "removes from one inverted list", "cheap, the list stays"],
      ["HNSW", "no true delete in faiss", "tombstone and filter at query time"]
    ] },
    { t: "callout", kind: "warn", title: "Positional alignment is a bug waiting for a delete", body: [
      { t: "p", text: "After `remove_ids` on position *i*, faiss shifts everything down: position *j > i* now holds what used to be at *j+1*. Any parallel list mapping positions to document ids \u2014 the `IDS[i]` pattern used throughout modules 5 and 6 \u2014 is now wrong for every position after the deletion." },
      { t: "p", text: "The symptom is citations that point at the wrong document, consistently and only after a delete. The fix is to never rely on positional alignment: wrap the index in `IndexIDMap` so each vector carries an explicit id, and deletes cannot shift the mapping." }
    ] },
    { t: "p", text: "That the course's own exercises use positional alignment is the point \u2014 it is correct for a fixed corpus and becomes a defect the moment the corpus can change. Which is a reasonable summary of this whole lesson." },
    { t: "h2", n: "03", id: "window", text: "The staleness window", sub: "Compute the worst case, not the mean" },
    { t: "code", lang: "text", title: "A nightly rebuild at 02:00",
      code: "edit time   served stale until   window\n02:05       next 02:00           23 h 55 m\n09:00       next 02:00           17 h 00 m\n14:30       next 02:00           11 h 30 m\n23:45       next 02:00            2 h 15 m",
      caption: "Mean about 12 hours; worst case nearly 24." },
    { t: "callout", kind: "insight", title: "The worst case is what a customer hits", body: [
      { t: "p", text: "The mean window is comfortable and irrelevant. The case that matters is the one where you correct a document **because** a customer hit the error, tell them it is fixed, and the system keeps serving the old answer for most of a day." },
      { t: "p", text: "Which is why freshness is usually a two-track design: incremental upsert on the write path for correctness, plus a periodic full rebuild to repair the drift incremental updates accumulate. The rebuild is not the freshness mechanism; it is the repair mechanism." }
    ] },
    { t: "h2", n: "04", id: "drift", text: "What incremental updates drift on", sub: "Silently, in all three cases" },
    { t: "dl", items: [
      ["BM25", "`df`, `avgdl` and `N` are corpus-wide. Add a thousand documents incrementally and every IDF is computed from stale counts \u2014 and 6.3 showed IDF is where BM25's behaviour lives."],
      ["IVF", "The cluster centroids were fit on the original data, so new documents are assigned to the nearest **old** centroid. As the corpus shifts, the partitioning gets worse."],
      ["HNSW", "The graph is built by insertion order, so heavy churn leaves it with worse connectivity than a rebuild would produce."]
    ] },
    { t: "p", text: "All three degrade gradually with no error and slightly worse recall \u2014 the same silent-failure shape as 5.4's un-normalised vectors and 5.2's scrambled PDF columns. That is the argument for the periodic rebuild even when incremental updates are working exactly as designed." },
    { t: "h2", n: "05", id: "visible", text: "The cheapest freshness signal", sub: "5.2 collecting again" },
    { t: "code", lang: "text", title: "Make the age visible",
      code: "'Retention defaults to 90 days. [data-retention, updated 2024-03-11]'",
      caption: "A metadata field and a template change." },
    { t: "callout", kind: "mental", title: "It does not fix freshness; it stops it being silent", body: [
      { t: "p", text: "5.2 insisted on capturing an `updated` date at load time on the grounds that it could not be reconstructed later. This is what it buys: the answer can state the age of its sources, so a user can see that a confident answer rests on a two-year-old document." },
      { t: "p", text: "The same field enables the mechanical version \u2014 flagging or suppressing documents older than a threshold for topics that change \u2014 and it enables 7.7's cache invalidation. One metadata field, three uses, and all of them unavailable if the loader did not capture it." }
    ] },
    { t: "exercise", kind: "build", title: "Delete a document and watch what breaks",
      difficulty: "core", minutes: 30,
      body: "Build an index, query it, then delete a document from the source without touching the index and query again. Then delete it properly and examine what happened to the position-to-id mapping. Tabulate what a delete costs on three index types. Compute the staleness window of a periodic rebuild, reporting the worst case. Finally name what incremental updates drift on for both a sparse and a dense index.",
      requirements: ["Show that a source delete leaves the index and the results unchanged",
        "Explain why 7.4's citation check does not catch it",
        "Delete properly and show what happened to positional id alignment",
        "Tabulate delete behaviour for at least three index types",
        "Compute the staleness window of a periodic rebuild including the worst case",
        "Name what BM25, IVF and HNSW each drift on under incremental updates",
        "Give the metadata field that makes staleness visible"],
      hint: "After calling remove_ids, check whether your position-to-id list still lines up. That mismatch is a whole class of production bug.",
      solution: { lang: "python", title: "x0705.py \u2014 remove_ids renumbers everything after it",
        code: 'import faiss\nidx = faiss.IndexFlatIP(emb.shape[1])\nidx.add(emb)\n\n_, I = idx.search(v, 3)\nprint("top 3:", [sids[i] for i in I[0]])\n\n# a source delete the index never hears about\nprint("ntotal unchanged:", idx.ntotal)\n_, I2 = idx.search(v, 3)\nprint("still returns:", [sids[i] for i in I2[0]])\n\n# and a real delete, which shifts positions\nidx.remove_ids(np.array([int(I[0][0])]))\nprint("ntotal now:", idx.ntotal)\n# sids is now WRONG for every position after the deleted one',
        out: "==============================================================================\nPART 1 -- what an index knows about a deleted document\n==============================================================================\n  built an index over 10 documents, ntotal=10\n  query top 3: ['bill-cancel-sub', 'auth-session', 'bill-cancel-trial']\n\n  now 'delete' a document the way application code usually does --\n  remove it from the source system and forget to touch the index:\n    deleted from source : bill-cancel-sub\n    index ntotal        : 10  (unchanged)\n    query top 3         : ['bill-cancel-sub', 'auth-session', 'bill-cancel-trial']\n\n  the deleted document is still the top result. it will be retrieved,\n  placed in the context, and cited -- and the citation will point at a\n  document that no longer exists.\n==============================================================================\nPART 2 -- a vector delete is not a free operation\n==============================================================================\n  IndexFlatIP supports remove_ids. what it costs depends on the index:\n\n  index          delete                        consequence\n  IndexFlatIP    remove_ids, shifts the array  ids after it RENUMBER\n  IVF            removes from one list         cheap, list stays\n  HNSW           no true delete in faiss       tombstone and filter\n\n  after remove_ids on position 0:\n    ntotal: 10 -> 9\n\n  and the trap: faiss renumbered the remaining vectors. my sids list\n  is now WRONG for every position after the deleted one -- position i\n  in the index no longer means sids[i].\n\n  that is the real source of 'the citations are off by one' bugs. the\n  fix is to never rely on positional alignment: keep an explicit id\n  per vector (IndexIDMap) so deletes cannot shift the mapping.\n==============================================================================\nPART 3 -- the staleness window a nightly rebuild gives you\n==============================================================================\n  a nightly rebuild at 02:00 means a document edited at 02:05 is\n  served stale for 23 hours 55 minutes.\n\n  edit time   served stale until   window\n  02:05       next 02:00           23 h 55 m\n  09:00       next 02:00           17 h 00 m\n  14:30       next 02:00           11 h 30 m\n  23:45       next 02:00           2 h 15 m\n\n  the mean is about 12 hours and the WORST case is what matters,\n  because the worst case is what a customer hits after you tell them\n  the documentation has been corrected.\n\n  which is why freshness is usually a two-track design: incremental\n  upsert on the write path for correctness, plus a periodic full\n  rebuild to repair the drift that incremental updates accumulate.\n==============================================================================\nPART 4 -- what incremental updates drift on\n==============================================================================\n  the statistics an index holds are global, so a local update does not\n  refresh them:\n\n  BM25  : df, avgdl and N are corpus-wide. add 1000 documents\n          incrementally and every IDF is now computed from stale\n          counts -- 6.3 showed IDF is where the behaviour lives.\n  IVF   : the cluster centroids were fit on the original data. new\n          documents are assigned to the nearest OLD centroid.\n  HNSW  : the graph was built by insertion order; heavy churn leaves\n          it with worse connectivity than a rebuild would give.\n\n  all three degrade gradually and silently -- no error, slightly worse\n  recall. that is the argument for the periodic rebuild even when\n  incremental updates are working correctly.\n==============================================================================\nPART 5 -- the cheapest freshness signal\n==============================================================================\n  5.2 insisted on capturing an updated date at load time. this is what\n  it buys: the answer can state the age of its sources.\n\n  'Retention defaults to 90 days. [data-retention, updated 2024-03-11]'\n\n  that costs a metadata field and a template change, and it converts\n  an invisible staleness problem into a visible one -- the user can\n  see that an answer rests on a two-year-old document. it does not fix\n  freshness; it stops it being silent.",
        notes: [
          { t: "p", text: "**A source delete leaves the index untouched** \u2014 `ntotal` is unchanged and the deleted document is still the top result. Removing a database row does not touch a vector." },
          { t: "p", text: "**And 7.4's citation check passes**, because the cited id genuinely was retrieved. Only a check against the source system catches it." },
          { t: "p", text: "**`remove_ids` renumbers the remaining vectors**, so a parallel position-to-id list is wrong for every position after the deletion \u2014 the `IDS[i]` pattern used throughout modules 5 and 6." },
          { t: "p", text: "**That is where \u2018the citations are off by one\u2019 bugs come from**, and the fix is `IndexIDMap` so each vector carries an explicit id that a delete cannot shift." },
          { t: "p", text: "**A nightly rebuild's worst-case window is nearly 24 hours**, and the worst case is what a customer hits after you tell them a document has been corrected." },
          { t: "p", text: "**So freshness is two-track**: incremental upsert for correctness, periodic rebuild to repair drift. The rebuild is the repair mechanism, not the freshness mechanism." },
          { t: "p", text: "**Incremental updates drift silently**: BM25's df, avgdl and N are corpus-wide so every IDF goes stale; IVF assigns new documents to old centroids; HNSW's graph degrades with churn." },
          { t: "p", text: "**An `updated` field makes staleness visible** \u2014 5.2 captured it at load time, and it also enables age-based filtering and 7.7's cache invalidation." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the answer that cited a deleted document", body: [
      { t: "p", text: "A customer is told a policy page was wrong and has been removed. They ask again the next day and the assistant quotes the removed page, with a citation to it." },
      { t: "p", text: "The page was deleted from the CMS and the vector index was never updated, so it remains the best match for that question. Every check in the pipeline passes: retrieval returned a relevant document, the answer is grounded in text that genuinely was in the context, and the cited id genuinely was retrieved. 7.4's free check cannot see this, because the id's existence is checked against the **retrieved set**, not against the source." },
      { t: "p", text: "Two changes close it. Make deletion a write-path operation on both stores, so the index delete is in the same unit of work as the source delete rather than deferred to a nightly job. And resolve citations against the source system at render time, so an answer citing a document that no longer exists fails visibly instead of quoting it. The second is the one that holds when the first is missed, which it eventually will be." }
    ] }
  ],
  takeaways: [
    "**A source delete leaves the index unchanged** \u2014 the deleted document is still the top result.",
    "**And 7.4's citation check passes**, because the id genuinely was in the retrieved set.",
    "**`remove_ids` renumbers the remaining vectors**, breaking any position-to-id list.",
    "**That is the source of \u2018citations are off by one\u2019 bugs**, appearing only after a delete.",
    "**Use `IndexIDMap`** so each vector carries an explicit id a delete cannot shift.",
    "**Positional alignment is correct for a fixed corpus** and a defect the moment it can change.",
    "**A nightly rebuild's worst-case staleness is nearly 24 hours**, and the worst case is what a customer hits.",
    "**Freshness is two-track**: incremental upsert for correctness, periodic rebuild to repair drift.",
    "**BM25 drifts because `df`, `avgdl` and `N` are corpus-wide** \u2014 every IDF goes stale.",
    "**IVF assigns new documents to old centroids; HNSW's graph degrades with churn.**",
    "**All three degrade with no error and slightly worse recall** \u2014 the same silent shape as 5.4 and 5.2.",
    "**An `updated` field makes staleness visible**, and also enables age filtering and cache invalidation.",
    "**Resolve citations against the source at render time**, so a deleted document fails visibly."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A document is deleted from the source system but not the index. Why does the citation check from 7.4 not catch it?",
      options: ["The check only runs on sampled traffic",
        "That check verifies the cited id was in the retrieved set, which it was \u2014 it says nothing about whether the document still exists",
        "Deleted documents lose their id",
        "The check runs before retrieval"],
      answer: 1,
      why: "The free check compares cited ids against the context the model was given, catching fabrication. A deleted-but-indexed document is genuinely retrieved and genuinely in the context, so every check passes while the answer quotes something that no longer exists. Catching it requires resolving citations against the source system at render time, which is a different check." },
    { stem: "After calling remove_ids on a flat faiss index, citations start pointing at the wrong documents. Why?",
      options: ["The embeddings were corrupted by the deletion",
        "faiss shifts the remaining vectors down, so a parallel position-to-id list is wrong for every position after the deleted one",
        "remove_ids invalidates the index and requires a rebuild",
        "The query vector needs re-normalising"],
      answer: 1,
      why: "A flat index stores vectors in an array and deletion compacts it, so position j now holds what used to be at j+1. Any code mapping index positions to document ids through a parallel list \u2014 a common and perfectly correct pattern on a fixed corpus \u2014 silently misaligns. Wrapping in IndexIDMap attaches explicit ids so a delete cannot shift the mapping." },
    { stem: "Why does a nightly rebuild's mean staleness window matter less than its worst case?",
      options: ["The mean is harder to compute",
        "The case that matters is correcting a document because a customer hit the error, then serving the old answer for most of a day",
        "Edits cluster at the start of the window",
        "The worst case is what the SLA specifies"],
      answer: 1,
      why: "Document corrections are not uniformly distributed in cause \u2014 they often happen because someone reported the error. The user most likely to re-ask is the one who reported it, and with a 02:00 rebuild an edit at 02:05 is served stale for 23 hours 55 minutes. That is why incremental upsert exists on the write path, with the rebuild repairing drift rather than providing freshness." },
    { stem: "What does BM25 drift on under incremental document additions?",
      options: ["The tokeniser's vocabulary",
        "df, avgdl and N are corpus-wide, so every IDF is computed from stale counts",
        "The k1 and b parameters",
        "Nothing \u2014 BM25 is computed at query time"],
      answer: 1,
      why: "Document frequency, average document length and corpus size are global statistics, so adding documents without recomputing them leaves every term's IDF wrong. 6.3 showed IDF is where BM25's behaviour lives \u2014 it is the term that decides whether a rare word dominates \u2014 so stale statistics degrade ranking gradually with no error raised anywhere." }
  ] },
  interview: { title: "Interview practice", sub: "Index freshness", questions: [
    { level: "core", q: "How would you keep a retrieval index fresh?",
      strong: "A strong answer is two-track and knows what each track is for.",
      answer: [
        { t: "p", text: "Two tracks. Incremental upsert on the write path for correctness, and a periodic full rebuild to repair the drift that incremental updates accumulate." },
        { t: "p", text: "The incremental path has to be in the same unit of work as the source change, not deferred, because otherwise the staleness window is the whole rebuild interval. With a nightly rebuild at 2 a.m., a document edited at 2:05 is served stale for nearly 24 hours \u2014 and the worst case is what matters, since corrections often happen because a customer reported the error and that customer is the one most likely to ask again." },
        { t: "p", text: "The rebuild is not the freshness mechanism, it is the repair mechanism. Incremental updates drift on global statistics: BM25's document frequencies, average length and corpus size are corpus-wide, so adding a thousand documents leaves every IDF computed from stale counts. IVF assigns new documents to centroids fit on the original data. HNSW's graph degrades under churn." },
        { t: "p", text: "All of those fail silently \u2014 no error, slightly worse recall \u2014 which is why I would schedule the rebuild even when the incremental path is working correctly." }
      ] },
    { level: "advanced", q: "What goes wrong with deletes specifically?",
      strong: "A strong answer has both the missed delete and the renumbering.",
      answer: [
        { t: "p", text: "Two different problems, and the second is the one that surprises people." },
        { t: "p", text: "The first is the missed delete. Removing a row from the source does not touch the vectors, so the document stays in the index and remains the best match for its question. I measured that: ntotal unchanged, deleted document still rank 1. And every downstream check passes \u2014 retrieval returned a relevant document, the answer is grounded in text that was genuinely in the context, and the citation check confirms the id was retrieved. The only way to catch it is to resolve citations against the source system at render time, so an answer citing something that no longer exists fails visibly." },
        { t: "p", text: "The second is that a real delete shifts positions. In a flat faiss index, remove_ids compacts the array, so everything after the deleted vector renumbers. Any parallel list mapping positions to document ids is now wrong for all of them." },
        { t: "p", text: "That is where 'the citations are off by one' bugs come from, and it is nasty because positional alignment is perfectly correct code right up until the first delete. The fix is IndexIDMap, so each vector carries an explicit id and deletion cannot shift the mapping. I would treat positional alignment as a smell in any index that is not provably immutable." }
      ] },
    { level: "core", q: "What would you monitor on a retrieval index?",
      strong: "A strong answer monitors drift and divergence, not just errors.",
      answer: [
        { t: "p", text: "Divergence from the source, and the global statistics that drift \u2014 because the failures here do not raise errors, they just make recall slightly worse." },
        { t: "p", text: "The first check is a reconciliation: document count in the index against document count in the source, and ideally a checksum over ids. A document deleted from the source but left in the index stays retrievable and gets cited, and every downstream check passes because the id genuinely was retrieved. Only a comparison against the source catches it." },
        { t: "p", text: "The second is the drift. BM25's document frequencies, average length and corpus size are corpus-wide, so incremental additions leave every IDF computed from stale counts \u2014 and IDF is where BM25's behaviour lives. IVF centroids were fit on the original data, so new documents get assigned to old clusters. I would track how much the corpus has changed since the last full rebuild, and rebuild on that rather than purely on a schedule." },
        { t: "p", text: "The third is retrieval quality itself, measured continuously against a small labelled set, per query class. That is the only monitor that catches all of the above plus everything I have not thought of, because every one of these failures shows up as slightly worse recall and nothing else." },
        { t: "p", text: "And I would alert on the staleness window rather than the mean \u2014 the worst case is what a customer hits after being told a document was corrected." }
      ] }
  ] }
});
