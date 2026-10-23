/* ============================================================================
   LESSON 16.3 — Recovery for RAG Systems, Stage by Stage
   ========================================================================= */
EC.receiveLesson({
  id: "16.3",

  lede: "A RAG pipeline has seven stages and exactly one of them holds anything irreplaceable. **Everything after the source documents is derived, which sounds reassuring and means the opposite: derived assets have no backups unless somebody decided to make one, and \"we can rebuild it\" is a sentence about hours.** This lesson walks source to answer, and at each stage names what breaks, how you would know, and what you do about it.",

  objectives: [
    "Separate the one irreplaceable stage from the six derived ones, and plan accordingly",
    "Detect a silent retrieval regression, which no health check and no error rate will show",
    "Degrade a RAG system usefully when the model provider is unavailable",
    "Recover an index without rebuilding it, and keep the rebuild path working anyway",
    "Verify a restored pipeline with retrieval metrics rather than with liveness"
  ],

  prerequisites: ["16.1", "15.8"],

  blocks: [

    { t: "h2", n: "01", text: "Seven stages, one of which cannot be rebuilt", id: "stages" },

    {"kind": "flow", "title": "Seven stages, each computed from the one before it", "caption": "**The dependency runs left to right, which is what makes stage 1 the only true single point of failure** — everything after it is recomputable, and recomputable only while the documents exist somewhere you control. So the first recovery question for a RAG system is not “what is the backup” but **“where is the copy of the corpus that is not in the index”**, and the answer frequently names a system owned by another team. The last two stages are stateless: nothing to lose, and all of the detection burden.", "cols": 4, "nodes": [{"id": "s", "label": "1 Source documents", "sub": "the only irreplaceable stage", "tone": "crit"}, {"id": "p", "label": "2 Load and parse", "sub": "keep the extracted text", "tone": "accent"}, {"id": "c", "label": "3 Chunk", "sub": "fast, if stage 2 was kept", "tone": "accent"}, {"id": "e", "label": "4 Embed", "sub": "hours, and the model can be retired", "tone": "warn"}, {"id": "i", "label": "5 Index", "sub": "snapshot it; rebuild is the RTO otherwise", "tone": "warn"}, {"id": "r", "label": "6 Retrieve", "sub": "stateless - recall falls silently", "tone": "violet"}, {"id": "g", "label": "7 Generate", "sub": "stateless - needs a provider", "tone": "violet"}], "edges": [["s", "p"], ["p", "c"], ["c", "e"], ["e", "i"], ["i", "r"], ["r", "g"]], "t": "diagram", "id": "dg-16_3-01-0"},

    { t: "p", text: "The pipeline runs left to right, and the dependency runs the same way: every stage is computed from the one before it. **That makes stage 1 the only true single point of failure, and stages 2 to 5 a question of rebuild time rather than of data loss.**" },

    { t: "table",
      head: ["Stage", "Input", "Output", "Rebuildable from", "Characteristic failure"],
      rows: [
        ["**1 Source**", "The world", "Documents", "**Nothing — this is the source of truth**", "Nobody owns retention, and it was never ours"],
        ["**2 Load / parse**", "Documents", "Text plus metadata", "Stage 1", "A parser upgrade changes the text silently"],
        ["**3 Chunk**", "Text", "Chunks", "Stage 2", "A changed chunk size, which looks like nothing"],
        ["**4 Embed**", "Chunks", "Vectors", "Stage 3 + an embedding model", "**The model is deprecated, so the space moves**"],
        ["**5 Index**", "Vectors", "A searchable index", "Stage 4", "Corruption, or a partial build declared complete"],
        ["**6 Retrieve**", "A query", "Chunks", "Stateless", "Recall falls; nothing errors"],
        ["**7 Generate**", "Query + chunks", "An answer", "Stateless, needs a provider", "The provider is down, which you cannot fail over"]
      ],
      caption: "**Stages 6 and 7 are stateless, which means they have no recovery problem and all of the detection problem.** They cannot lose data, and they are where a degradation becomes visible to a user — several hours after the stage that caused it." },

    { t: "callout", kind: "insight", title: "The question that decides whether this system is recoverable at all", body: [
      { t: "p", text: "**Where is the copy of the corpus that is not in the index?** Everything in the table after stage 1 can be recomputed, and all of it can be recomputed only while the documents exist somewhere else." },
      { t: "p", text: "The answer is frequently uncomfortable: the corpus is a Confluence space owned by another team, a shared drive, a scrape nobody kept, or uploads that were written straight into the vector store and never retained. **In the last case the index is not derived from anything you still have, and no amount of snapshotting the index will fix that** — it means a corrupted index is permanent data loss dressed as a derived asset." },
      { t: "p", text: "**So the first recovery action for a RAG system is not a backup job, it is an inventory question** — and if the answer names a system you do not control, that team's retention policy is now part of your recovery plan whether or not they have been told." }
    ]},

    { t: "h2", n: "02", text: "Stages 1 to 3: source, parse, chunk", id: "source-chunk" },

    {"kind": "trace", "title": "Two indexes, both valid, not interchangeable", "caption": "**Nothing inside an index records the configuration that produced it**, so a restored index built with 400-token chunks instead of 800 answers every query, returns plausible passages, and retrieves measurably worse — which is exactly the incident at the end of lesson 16.1. The fingerprint is a hash of the parser version, chunk size, overlap, splitter and embedding model, written into the index metadata and the snapshot's name. **Then a restore can assert that what came back matches the code that is running**, which is the difference between a verifiable restore and a hopeful one.", "left": "what the fingerprint covers", "codeW": 200, "vars": ["change it and", "detectable without it?"], "steps": [{"code": "parser version", "state": ["tables and headings extract differently", "no"], "tone": "crit"}, {"code": "chunk size and overlap", "state": ["every boundary moves", "no"], "changed": [0, 1], "tone": "crit"}, {"code": "splitter choice", "state": ["different boundaries again", "no"], "changed": [0, 1], "tone": "crit"}, {"code": "embedding model", "state": ["the vector space moves", "no"], "changed": [0, 1], "tone": "crit"}, {"code": "with a fingerprint", "state": ["an assertion on restore", "YES - it fails loudly"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-16_3-02-1"},

    { t: "p", text: "These three stages share one failure shape: **a change that is invisible downstream.** A parser upgrade extracts tables differently, a chunk-size change shifts every boundary, and both produce a complete, plausible index that answers slightly worse than the one before it." },

    { t: "code", lang: "python", title: "Pinning what produced the chunks, and asserting the corpus has not moved under you",
      code: `import hashlib, json

# PREVENT: the pipeline's own configuration is part of the artifact. Two
# indexes built with different chunk sizes are not interchangeable, and
# nothing in either index records which one it was.
BUILD = {
    "parser": "unstructured==0.14.8",       # pinned: a minor bump re-parses
    "chunk_size": 800,
    "chunk_overlap": 80,
    "splitter": "RecursiveCharacterTextSplitter",
    "embed_model": "text-embedding-3-small",
    "embed_dim": 1536,
}
BUILD["fingerprint"] = hashlib.sha256(
    json.dumps(BUILD, sort_keys=True).encode()).hexdigest()[:12]

# Written into the index metadata AND into the snapshot's name, so a restore
# can be checked against the code that is running:
#   snapshots/policies/2026-07-14T02-00/fp-7c1ea93b4d12.tar.zst
assert index.metadata["fingerprint"] == BUILD["fingerprint"], (
    "index was built by a different pipeline configuration")

# DETECT at stage 1: the corpus itself is a dependency with a freshness and a
# volume profile, exactly like a data pipeline (16.2).
manifest = {d.id: d.content_hash for d in source.list_documents()}
prev = json.load(open("state/corpus_manifest.json"))

added   = manifest.keys() - prev.keys()
removed = prev.keys() - manifest.keys()
changed = {k for k in manifest.keys() & prev.keys() if manifest[k] != prev[k]}

# A MASS DELETION UPSTREAM IS THE INCIDENT TO CATCH HERE. An export that
# returns 200 documents instead of 20,000 will happily reindex into an index
# that answers almost nothing -- and the pipeline will report success.
assert len(removed) < 0.05 * len(prev), f"{len(removed)} documents vanished"`,
      caption: "**The fingerprint is what makes a restore checkable.** Two indexes built with different chunk sizes are both valid and not interchangeable, and without the configuration recorded in the index metadata there is no way to tell which one you have restored — which is exactly the failure in the scenario at the end of lesson 16.1." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**1 Source**", "**Take your own copy on a schedule**; confirm the owning team's retention in writing", "A corpus manifest diff per run: added, removed, changed", "Refuse to reindex when mass deletion is detected; keep serving the old index", "From your own copy. **If there is no copy, there is no recovery**", "Document count and total bytes against the manifest"],
        ["**2 Parse**", "Pin the parser version; keep extracted text, not just chunks", "Sample N documents per run and diff the extracted text against the last run", "Fall back to the previous extraction for documents that now parse differently", "Re-parse from the source copy — minutes to hours", "Character counts per document within tolerance"],
        ["**3 Chunk**", "Record chunk size, overlap and splitter in the fingerprint", "The fingerprint check on every build and every restore", "Nothing to contain — this stage is fast", "Re-chunk from extracted text — **fast, if stage 2's output was kept**", "Chunk count and length distribution against the previous build"]
      ],
      caption: "**Keeping stage 2's output is the cheap decision that makes stages 3 to 5 fast to rebuild.** Extracted text is small compared with the source documents and tiny compared with the vectors, and keeping it means a chunking change costs minutes rather than a full re-parse of every PDF." },

    { t: "h2", n: "03", text: "Stage 4: embedding, and the dependency that moves under you", id: "embed" },

    {"kind": "flow", "title": "A retired embedding model freezes an index rather than breaking it", "caption": "**The stored vectors are perfectly fine and stop meaning the same thing.** Queries go through the replacement model into a different space, cosine similarity still returns a number, and the number is meaningless — so there is no error, normal latency, plausible passages, and recall off a cliff. A corrupted index would at least have failed loudly. **Two cheap things catch or prevent it:** a dozen canary query-document pairs on a schedule, and the model identity recorded in the index with a refusal to query on a mismatch.", "cols": 3, "nodes": [{"id": "r", "label": "The provider retires the model", "sub": "or silently updates it", "tone": "crit"}, {"id": "d", "label": "Documents: vectors from model A", "sub": "unchanged, and still fine", "tone": "accent"}, {"id": "q", "label": "Queries: vectors from model B", "sub": "a different space", "tone": "crit"}, {"id": "n", "label": "Similarity returns a number", "sub": "and it means nothing", "tone": "crit"}, {"id": "c", "label": "Canary recall collapses", "sub": "12 pairs, every 5 minutes", "tone": "good"}, {"id": "p", "label": "Or refuse to query on a mismatch", "sub": "a loud startup failure instead", "tone": "violet"}], "edges": [["r", "d"], ["r", "q"], ["q", "n"], ["n", "c"], ["c", "p"]], "t": "diagram", "id": "dg-16_3-03-2"},

    { t: "p", text: "Embedding is the expensive stage and the one with a failure mode that exists nowhere else in software: **the vectors in your index stay exactly as they were, and stop meaning the same thing.**" },

    { t: "code", lang: "python", title: "Why a deprecated embedding model is worse than a corrupted index",
      code: `# THE SETUP: the index holds vectors produced by text-embedding-3-small.
# The provider retires it. You switch queries to its replacement.
#
#   documents  ->  model A  ->  vectors in the index      (unchanged)
#   query      ->  model B  ->  query vector              (different space)
#
# The search runs. Cosine similarity returns a number. The number is
# meaningless, because the two vectors were produced by different models.
#
# WHAT YOU OBSERVE: no error, normal latency, plausible-looking passages,
# and recall that has fallen off a cliff. A corrupted index would at least
# have failed loudly.

# DETECT: a canary query set, run on a schedule against the live index.
CANARIES = [            # query -> a doc id that MUST be in the top 5
    ("how do I claim expenses", "policy-expenses-v3"),
    ("parental leave entitlement", "policy-leave-v7"),
    ("what is the notice period", "policy-contract-v2"),
]
def canary_recall(index) -> float:
    hits = sum(expected in [d.id for d in index.search(q, k=5)]
               for q, expected in CANARIES)
    return hits / len(CANARIES)

assert canary_recall(index) >= 0.9, "canary recall collapsed"
# Cheap enough to run every five minutes, and it is the only check that
# catches a space mismatch, a half-built index and a wrong restore alike.

# PREVENT: record the embedding model AND its dimension in the index
# metadata, and refuse to query with a mismatch rather than silently
# comparing across spaces.
if index.metadata["embed_model"] != ACTIVE_EMBED_MODEL:
    raise RuntimeError(
        f"index built with {index.metadata['embed_model']}, "
        f"querying with {ACTIVE_EMBED_MODEL} -- rebuild required")

# RECOVER: there is one path, and it is a full re-embed of the corpus.
# Budget it: 2.4M chunks at 645 chunks/s is about an hour; 10M is six (16.1).
# Run it as a BLUE-GREEN index build, not in place:
#   build the new index alongside, canary it, then switch the alias.`,
      caption: "**Refusing to query on a model mismatch converts a silent quality collapse into a loud startup failure**, which is the trade you want — and it is three lines of metadata plus an equality check. The canary set is the general version of the same idea: a handful of query-document pairs you know the answer to, cheap enough to run continuously." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**4 Embed**", "Record the model and dimension in index metadata; refuse to query on a mismatch; prefer a model with a deprecation policy you have read", "Canary recall on a schedule; embedding-cost and throughput alarms during a build", "**Blue-green index builds** — never embed in place, so a failed build cannot replace a working index", "Re-embed the corpus. **Hours, and it is the one stage with no shortcut**", "Canary recall, then the full retrieval eval against a dated baseline"]
      ],
      caption: "**Blue-green index builds are the containment that matters most in a RAG pipeline.** An in-place rebuild that fails halfway leaves an index that is partly old and partly new, answers every query, and is wrong in a way no metric distinguishes from a successful build." },

    { t: "h2", n: "04", text: "Stage 5: the index, where rebuild time is the RTO", id: "index" },

    {"kind": "trace", "title": "Which path recovers which failure", "caption": "**Neither path covers everything, which is the argument for keeping both rather than choosing one.** The snapshot is the fast path and the rebuild is the only answer to a corrupt snapshot or a configuration change. **Rows four and five are where the snapshot wins and the rebuild cannot help at all** — both are cases where the corpus or the model moved rather than the index breaking, and a rebuild faithfully reproduces the problem.", "left": "failure", "codeW": 210, "vars": ["snapshot", "rebuild"], "steps": [{"code": "cluster or region lost", "state": ["YES - minutes", "yes, in hours"], "tone": "good"}, {"code": "index corrupted by a bad write", "state": ["if it predates the write", "YES - keep this path working"], "changed": [0, 1], "tone": "good"}, {"code": "the snapshot itself is corrupt", "state": ["no", "YES - the reason for two paths"], "changed": [0, 1], "tone": "violet"}, {"code": "a mass deletion was reindexed", "state": ["YES", "NO - it reproduces the deletion"], "changed": [0, 1], "tone": "crit"}, {"code": "embedding model retired", "state": ["yes, but frozen", "NO - new vectors are incomparable"], "changed": [0, 1], "tone": "crit"}, {"code": "chunking config changed", "state": ["restores the old config", "YES - the only path to the new"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-16_3-04-3"},

    { t: "p", text: "The index is derived, expensive, and the asset whose recovery plan is most often a sentence rather than a number. **Snapshot it anyway — the snapshot restores in minutes and the rebuild takes hours — and keep the rebuild working, because a snapshot has failure modes a rebuild does not.**" },

    { t: "table",
      head: ["Failure", "Snapshot restores it?", "Rebuild restores it?"],
      rows: [
        ["Cluster or region lost", "**Yes — minutes**", "Yes, in hours"],
        ["Index corrupted by a bad write", "Yes, if the snapshot predates the write", "**Yes, and this is why the rebuild must stay working**"],
        ["Snapshot itself corrupt or unrestorable", "No", "**Yes — the reason not to rely on one path**"],
        ["A mass deletion upstream was reindexed", "Yes — and the manifest check should have prevented it", "**No — a rebuild reproduces the deletion**"],
        ["Embedding model deprecated", "Yes, but the index is now frozen", "**No — new vectors are not comparable to old ones**"],
        ["Chunking or parser configuration changed", "Restores the old config, which may be what you want", "**Yes — the only path to the new one**"]
      ],
      caption: "**Rows four and five are the two where the snapshot wins and the rebuild cannot help**, and they are both cases where the corpus or the model moved rather than the index breaking. That asymmetry is the argument for keeping both paths rather than choosing one." },

    { t: "code", lang: "python", title: "A snapshot worth restoring from",
      code: `# A snapshot is only useful if you can tell what it contains and prove it
# restores. Three things in the name and the metadata:
#   snapshots/policies/2026-07-14T02-00/fp-7c1ea93b4d12/
#     ├── index.tar.zst
#     └── manifest.json      <- the part that makes it verifiable

manifest = {
    "taken_at": "2026-07-14T02:00:00Z",
    "fingerprint": BUILD["fingerprint"],     # parser, chunking, embed model
    "embed_model": "text-embedding-3-small",
    "embed_dim": 1536,
    "doc_count": 24_118,
    "chunk_count": 2_406_553,
    "corpus_manifest_hash": "a39f...",       # which corpus version this is
    "canary_recall_at_snapshot": 1.0,        # it was good when taken
}

# AND THE RESTORE TEST IS THE ONLY THING THAT MAKES ANY OF IT TRUE.
# Monthly, into a scratch namespace, timed:
#   1. restore the snapshot
#   2. assert manifest fingerprint == the running pipeline's fingerprint
#   3. assert doc_count and chunk_count match the manifest
#   4. run the canary set            -- recall >= 0.9
#   5. run the full retrieval eval   -- recall@5 within 0.02 of baseline
#   6. record the wall-clock time; that number IS your RTO
#
# A snapshot nobody has restored is a file, not a backup -- and the
# wall-clock time drifts upward as the corpus grows, so last year's
# measurement is not this year's RTO.`,
      caption: "**`canary_recall_at_snapshot` is the field that stops you restoring a bad index.** Snapshots are taken on a schedule, including on the night the index was already broken — so recording the quality at snapshot time is what lets a restore choose the last known-good one rather than the most recent one." },

    { t: "h2", n: "05", text: "Stages 6 and 7: retrieval and generation", id: "retrieve-generate" },

    { t: "p", text: "These two stages are stateless, so they have nothing to back up. **What they have instead is the entire detection burden: this is where a failure from any earlier stage becomes visible, and where the provider outage you cannot fail over lands.**" },

    { t: "code", lang: "python", title: "Degrading a RAG system usefully, which it is unusually able to do",
      code: `# A RAG system has a genuinely good degraded mode, and it is the reason to
# plan containment before failover: retrieval needs no model provider.

async def answer(question: str) -> Answer:
    passages = await retrieve(question)          # no provider involved

    try:
        text = await generate(question, passages, timeout=8)
        return Answer(text=text, passages=passages, mode="full")

    except ProviderUnavailable:
        # DEGRADED: return the passages WITHOUT a generated summary, and say
        # so. The user gets search over the corpus, which is most of the value
        # and all of the citations.
        return Answer(text=None, passages=passages, mode="retrieval_only",
                      notice="Summaries are unavailable; showing the source "
                             "passages that match your question.")

# THE ORDER OF PREFERENCE, and it is usually the reverse of what gets built:
#   1. degrade to retrieval-only          -- no provider, full citations
#   2. serve from the response cache      -- stale, and say it is stale
#   3. fail over to a second provider     -- different answers (16.1)
#   4. queue and answer later             -- only if nobody is waiting
#
# WHY NOT FAILOVER FIRST: the prompts were tuned against the primary. The
# secondary returns different answers, may reject the structured-output
# schema, and its quality is unknown unless you have eval scores for it.
# Retrieval-only has no such uncertainty -- it is the same retrieval.`,
      caption: "**A RAG system degrades better than almost anything else, because the half that needs no provider is the half with the citations.** Returning the matched passages and saying summaries are unavailable keeps the system useful, keeps it honest, and needs no second vendor relationship." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**6 Retrieve**", "Refuse to query on an embedding-model mismatch; alias-based index switching", "**Canary recall continuously; recall@k on a golden set nightly**; alarm on a drop in mean top-1 similarity", "Serve from the previous index via the alias; cache popular queries", "Stateless — nothing to recover beyond the index behind it", "Retrieval eval against a dated baseline, not a 200"],
        ["**7 Generate**", "A token and cost budget per request; a timeout that frees the worker", "Faithfulness sampling; refusal-rate and empty-answer-rate alarms", "**Degrade to retrieval-only**, then cache, then a second provider", "Stateless — replay from a durable queue if the work was asynchronous", "Faithfulness and answer-quality evals on a golden set"]
      ],
      caption: "**Mean top-1 similarity is an underused alarm.** It needs no labels and no goldens, and it falls immediately when the query and document spaces diverge — which makes it the cheapest continuous signal that something upstream has changed." },

    { t: "ladder",
      title: "The recovery plan for a policy assistant",
      rungs: [
        { level: "bad", label: "Nightly snapshot of the vector database",
          why: "**It protects the one asset that was already derived, and nothing else.** The corpus belongs to another team and is not copied; a parser or chunking change is unrecorded, so a restore cannot be checked; and verification is a health check, which passes on an index in the wrong embedding space.",
          code: `# dr-plan.md
# Backups: nightly snapshot of the vector DB
# Restore: restore the snapshot, redeploy, confirm the service is up` },
        { level: "ok", label: "Own copy of the corpus, fingerprinted snapshots, per-stage numbers",
          why: "**Now the irreplaceable stage is actually backed up and a restore can be identified.** What is still missing is any continuous signal: a degradation is discovered by a user, and the provider outage has no planned behaviour.",
          code: `# dr-plan.md v2
# corpus       weekly export to our own bucket, 90d retention  RPO 7d
# extracted    kept, so re-chunking is minutes not hours       RPO 7d
# index        nightly snapshot, name carries the fingerprint   RPO 24h
#              rebuild path measured 2026-06: 1.5h for 2.4M chunks
# Restore: restore snapshot, assert fingerprint matches, redeploy` },
        { level: "best", label: "Continuous canaries, blue-green builds, a planned degraded mode",
          why: "**Detection is now continuous rather than incidental, the build cannot damage a working index, and the provider outage has a defined behaviour the user can understand.** Verification asserts quality against a dated baseline instead of liveness.",
          code: `# dr-plan.md v3 -- additions to v2
# DETECT   canary set (12 query/doc pairs) every 5 min; alarm below 0.9
#          mean top-1 similarity, alarmed on a 10% drop
#          corpus manifest diff per run; refuse reindex if >5% removed
# CONTAIN  blue-green index builds behind an alias -- never embed in place
#          provider down -> retrieval-only with a notice; then cache;
#          second provider only after, and its evals are recorded
# RECOVER  snapshot (11 min) is primary; rebuild (1.5h) answers a corrupt
#          snapshot or a config change. Restore the last snapshot whose
#          canary_recall_at_snapshot was 1.0, not the most recent one.
# VERIFY   canary recall >= 0.9, then recall@5 within 0.02 of the dated
#          baseline (0.93, 2026-06-02). Liveness is not sufficient.
# REHEARSED 2026-07-14: restore 14 min, evals passed` }
      ] },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Find the stage from the symptom",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Six symptoms from a production RAG assistant. For each, name the stage that produced it, the signal that would have caught it, and the mitigation stage you would invest in. Several symptoms look identical from the outside and come from different stages — that is the exercise." },
        { t: "code", lang: "text", numbered: false, title: "symptoms.md", code: `
A. Answers became vaguer over two days. Latency, error rate and token usage
   are unchanged. No deploy went out.

B. The assistant answers "I could not find anything about that" for roughly
   a third of questions it used to answer. It started at 02:40.

C. Every answer cites the same four documents regardless of the question.

D. An answer quoted a policy that was withdrawn eight months ago.

E. Answers are correct but have no citations, and a banner says summaries
   are unavailable.

F. Retrieval returns eight fragments of one section rather than the section,
   and the answers read as though assembled from pieces.
` }
      ],
      requirements: [
        "A stage for each symptom, from the seven in section 01",
        "The signal that would have detected it, named specifically",
        "A mitigation stage — prevent, detect, contain, recover or verify",
        "For B, say what you would do in the first five minutes"
      ],
      hint: "Two of the six are not failures at all — one is a system working exactly as designed, and one is a configuration difference rather than a fault.",
      solution: {
        lang: "text",
        title: "Solution",
        code: `A. STAGE 4 or 6 -- the embedding space. Vaguer answers with unchanged
   latency and no deploy is the signature of retrieval quality falling
   while everything operational stays normal. Most likely cause: the
   embedding model was silently updated by the provider, so queries and
   documents are no longer in the same space.
   SIGNAL: canary recall, every five minutes. It collapses immediately.
   ALSO: mean top-1 similarity, which needs no goldens at all.
   MITIGATION STAGE: prevent -- record the embedding model in the index
   metadata and refuse to query on a mismatch. A loud startup failure beats
   a silent quality collapse.

B. STAGE 1 -> 5. An abrupt start at 02:40 is the nightly reindex, and a
   third of questions unanswerable means a third of the corpus is gone --
   a partial upstream export, reindexed faithfully.
   SIGNAL: the corpus manifest diff. 5% removed should have refused the run.
   MITIGATION STAGE: contain -- refuse to reindex on mass deletion, and keep
   serving the previous index.
   FIRST FIVE MINUTES: switch the alias back to the previous index. It is
   stale by one day and complete, which is strictly better than fresh and
   two-thirds empty. Then diagnose the export.

C. STAGE 5 -- a partially built index. Four documents answering everything
   means only four documents are in it, or only their vectors are. An
   in-place rebuild that failed after writing a fraction of the corpus
   produces exactly this, and reports success.
   SIGNAL: chunk_count against the manifest after every build.
   MITIGATION STAGE: contain -- blue-green builds. A failed build never
   becomes the live index, so this symptom cannot reach a user.

D. STAGE 1 -- source. The index is faithful; the corpus contains a withdrawn
   document. This is not a retrieval failure, it is a deletion that never
   propagated.
   SIGNAL: the manifest diff shows removals; the pipeline must apply them as
   deletes rather than only indexing additions.
   MITIGATION STAGE: prevent -- make the index a function of the current
   manifest, so a document absent from the source is absent from the index.
   Incremental indexing that only ever adds is the cause here.

E. NOT A FAILURE. This is the degraded mode of stage 7 working exactly as
   designed: the provider is unavailable, retrieval still works, and the
   user is told. The correct response is to check the provider status and
   let it recover.
   WHAT TO VERIFY: that the notice is accurate and that the cache is not
   serving stale answers without saying so.

F. NOT A FAULT -- a configuration difference at stage 3. Eight fragments of
   one section is small chunks with no parent-merging, which is a chunking
   decision rather than a break. If it changed without a deploy, the index
   was restored from a snapshot built with a different fingerprint.
   SIGNAL: the fingerprint assertion on restore.
   MITIGATION STAGE: verify -- assert the snapshot's fingerprint matches the
   running pipeline before the index goes live.

THE PATTERN: A, B and C all present as "worse answers" and come from three
different stages with three different first responses. Only the per-stage
signals separate them, and all three signals are cheaper than the incident.`,
        notes: [
          { t: "p", text: "**B's first five minutes are the whole answer.** Switching the alias back to yesterday's complete index is a one-command containment that restores the service while the diagnosis happens — and it is only available because the build was blue-green and the previous index still exists." },
          { t: "p", text: "**D is the one that is reliably missed**, because incremental indexing is usually written as \"index anything new\" and deletion is a separate code path nobody asked for. An index that is a function of the current manifest handles withdrawal for free; one that only appends keeps withdrawn policies answerable for ever." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's RAG assistant began returning noticeably worse answers. There had been no deploy, the error rate was zero, latency was normal, and the vector store's own dashboards were green. It took nine days to diagnose." },
      { t: "p", text: "**The provider had rolled a minor update to the embedding model.** Document vectors in the index were produced by the previous revision; query vectors by the new one. The spaces were close enough that results still looked superficially relevant, which is why nobody suspected retrieval — and far enough apart that recall at five had fallen from 0.93 to 0.61." },
      { t: "p", text: "**No operational signal could have caught this, because nothing operational was wrong.** The system was healthy, fast and answering; it was simply retrieving the wrong passages, and the generation stage dutifully wrote fluent answers from them." },
      { t: "p", text: "**Two cheap things would have caught it within minutes:** twelve canary query-document pairs run on a schedule, and the embedding model recorded in the index metadata with a refusal on mismatch. The first detects it; the second makes it impossible." }
    ]}
  ],

  takeaways: [
    "**Stage 1 is the only irreplaceable stage.** Ask where the copy of the corpus is that is not in the index, and if the answer names another team, their retention policy is part of your plan.",
    "**Keep the extracted text, not just the chunks.** It is small, and it turns a chunking change from a full re-parse into minutes.",
    "**Fingerprint the build** — parser version, chunk size, overlap, splitter, embedding model — and write it into the index metadata and the snapshot name. Two indexes with different chunk sizes are both valid and not interchangeable.",
    "**A deprecated embedding model freezes an index rather than breaking it.** Stored vectors are fine; new query vectors are in a different space, recall collapses, and nothing errors.",
    "**Record the embedding model in the index and refuse to query on a mismatch.** Three lines that convert a silent quality collapse into a loud startup failure.",
    "**A canary set of a dozen query-document pairs is the highest-value signal in a RAG system.** It is cheap enough to run every five minutes and it catches a space mismatch, a half-built index and a wrong restore alike.",
    "**Mean top-1 similarity needs no labels at all** and falls immediately when the spaces diverge.",
    "**Build indexes blue-green, behind an alias, never in place.** A failed in-place build leaves an index that is partly old and partly new, answers everything, and is wrong invisibly.",
    "**Record quality at snapshot time.** Snapshots are taken on schedule, including on the night the index was already broken, so a restore should choose the last known-good one rather than the most recent.",
    "**A mass deletion upstream is the one failure a rebuild reproduces faithfully.** The manifest diff must be able to refuse the run.",
    "**Make the index a function of the current manifest.** Incremental indexing that only appends keeps withdrawn documents answerable for ever.",
    "**RAG degrades unusually well: retrieval needs no provider.** Return the passages without a summary and say so — that is most of the value and all of the citations.",
    "**Prefer degradation to failover.** A second provider returns different answers and may reject your output schema; retrieval-only has no such uncertainty.",
    "**Verify a restore with recall against a dated baseline.** A 200 and a plausible answer are exactly what a wrong index produces."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which stage of a RAG pipeline cannot be rebuilt from anything else?",
        options: [
          "The index, because it encodes the embedding model",
          "The vectors, because re-embedding costs money",
          "The source documents — everything after them is derived, and derivable only while they exist somewhere you control",
          "The chunks, because the splitter configuration may be lost"
        ],
        answer: 2,
        why: "Parse, chunk, embed and index are all recomputable from the documents; the documents are recomputable from nothing. That makes the first recovery action an inventory question rather than a backup job — and if the corpus lives only in the vector store, a corrupted index is permanent data loss dressed as a derived asset."
      },
      {
        stem: "Your provider silently updates the embedding model. What do you observe?",
        options: [
          "Query errors, until the index is rebuilt",
          "No errors, normal latency, plausible passages, and recall that has collapsed",
          "The vector store rejects the query for having the wrong dimension",
          "Nothing — stored vectors are unaffected, so retrieval is unaffected"
        ],
        answer: 1,
        why: "The stored vectors are fine and the query vector is now in a different space, so cosine similarity still returns a number and the number means nothing. Dimension checks do not help when the replacement model has the same dimension — which is the common case, and the reason to record the model identity rather than only its shape."
      },
      {
        stem: "An in-place index rebuild fails after writing 15% of the corpus. What is the state of the system?",
        options: [
          "The index is unavailable until the rebuild is retried",
          "The index answers every query from 15% of the corpus, reports success, and is wrong in a way no operational metric distinguishes",
          "The vector store rolls back the partial write automatically",
          "Queries fail with a partial-index error"
        ],
        answer: 1,
        why: "This is the argument for blue-green builds: construct the new index alongside the old one, canary it, then switch the alias. A failed build then never becomes the live index, and the symptom — every answer citing the same few documents — cannot reach a user."
      },
      {
        stem: "The model provider is down. What should a RAG system do first?",
        options: [
          "Fail over to a second provider immediately",
          "Return 503 so clients retry",
          "Degrade to retrieval-only: return the matched passages without a generated summary, and say summaries are unavailable",
          "Serve cached answers without indicating they are cached"
        ],
        answer: 2,
        why: "Retrieval needs no provider, so the half of the system with the citations still works — that is most of the value and it is honest. A second provider is worth having and is not equivalent: it returns different answers, may reject your output schema, and its quality is unknown without recorded evals."
      },
      {
        stem: "Which snapshot should a restore choose?",
        options: [
          "The most recent one, to minimise data loss",
          "The last one whose recorded canary recall was good, because snapshots are taken on schedule including on nights the index was already broken",
          "The oldest one still in retention, as it is most likely intact",
          "Whichever one matches the current corpus manifest"
        ],
        answer: 1,
        why: "A snapshot schedule does not know whether the index was healthy when it ran, so the most recent snapshot may be a faithful copy of a broken index. Recording the canary recall in the snapshot manifest is what makes \"last known good\" a decidable question rather than a guess."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "How would you make a RAG system recoverable?",
        strong: "Start by asking where the corpus lives outside the index, because that is the only irreplaceable stage and it is frequently another team's system — so step one is our own scheduled copy. Keep the extracted text so re-chunking is minutes. Fingerprint the build and write it into both the index metadata and the snapshot name, so a restore can be identified. Snapshot the index because rebuild is hours and restore is minutes, and keep the rebuild working for a corrupt snapshot or a config change. Build blue-green behind an alias. Detect with a canary set every few minutes and mean top-1 similarity. And verify a restore with recall against a dated baseline, never a health check.",
        answer: [
          { t: "p", text: "Opening with the corpus-ownership question rather than with backups is what separates this from a generic answer." },
          { t: "p", text: "The fingerprint is the specific that shows real experience: it is the only thing that makes a restored index identifiable." },
          { t: "p", text: "Canary recall as a continuous signal is the strongest point available — most candidates have no detection story for retrieval quality at all." }
        ]
      },
      {
        level: "advanced",
        q: "Answer quality degraded with no deploy, no errors and normal latency. How do you diagnose it?",
        strong: "That pattern points at retrieval rather than generation, because nothing operational changed. First check the canary set and mean top-1 similarity — if both fell, the query and document spaces have diverged, which usually means the embedding model changed under us. Then check the index metadata against the running configuration, and the chunk count against the last build in case a rebuild partially succeeded. If retrieval is healthy, it is a generation or prompt change, and the faithfulness sample is the next place to look.",
        answer: [
          { t: "p", text: "Separating retrieval from generation as the first branch is the right diagnostic instinct, and saying why — nothing operational changed — is what makes it reasoning rather than a guess." },
          { t: "p", text: "Naming the embedding-model change as the likely cause shows familiarity with the failure that is unique to this architecture." },
          { t: "p", text: "Checking chunk count against the previous build is a good second hypothesis: a partially successful rebuild produces the same symptom from a different stage." }
        ]
      },
      {
        level: "advanced",
        q: "A nightly reindex has made a third of the corpus unanswerable. What do you do?",
        strong: "Containment first: switch the alias back to the previous index. Stale by a day and complete beats fresh and two-thirds empty, and that is a one-command change if the build was blue-green. Then diagnose upstream — this is almost always a partial export rather than an indexing bug. The prevention is a corpus manifest diff that refuses to reindex when more than a few per cent of documents have disappeared, because a faithful index of a truncated corpus is the failure mode here.",
        answer: [
          { t: "p", text: "Leading with the alias switch rather than with the diagnosis is the operational answer, and it only exists because of a design decision made earlier." },
          { t: "p", text: "Recognising it as an upstream data incident rather than an indexing bug is the diagnostic point." },
          { t: "p", text: "The manifest-diff refusal is the prevention, and framing it as \"a faithful index of a truncated corpus\" is the sentence that shows the failure is understood." }
        ]
      }
    ]
  }
});
