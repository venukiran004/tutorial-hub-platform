EC.receiveLesson({
  id: "6.8",

  lede: "Six incident write-ups, each reproduced rather than retold. The most useful result contradicts half of one: the reference says a large ingest hurts retrieval because new documents \u201cadd noise/near-duplicates that crowd out the good chunks\u201d. Adding **20,000 off-topic chunks** \u2014 eighteen times the corpus \u2014 changed recall@5 by **nothing at all**, 95% before and after. Near-duplicates collapsed recall@1 from 75% to **20%**. Volume is harmless; duplication is the whole effect.",

  objectives: [
    "Answer an incident question in the on-call shape: symptom, cause, mitigation, permanent fix",
    "Recognise each of the six failures from its measured signature",
    "Distinguish the failures that error loudly from the ones that stay silent",
    "Diagnose a hallucination as a retrieval failure or a generation failure",
    "Name the one check that would have caught each incident before users did"
  ],

  prerequisites: ["6.1", "6.7"],

  blocks: [

    { t: "h2", n: "01", id: "shape", text: "The on-call shape",
      sub: "Symptom, causes, immediate, permanent" },

    { t: "p", text: "The reference frames these as interview questions to answer like on-call, and the four-part shape is the point. An answer that jumps to the permanent fix skips the part the interviewer is testing: whether you can stop the bleeding before you understand the cause." },

    { t: "p", text: "What follows reproduces each incident on the corpus used throughout M5 and M6 \u2014 1,187 chunks, 20 golden queries, 95% recall@5 at baseline \u2014 so each failure comes with a measured signature rather than a description." },

    { t: "h2", n: "02", id: "stale", text: "21.1 Stale answers after the source changed",
      sub: "The cheapest incident to prevent in this lesson" },

    { t: "dl", items: [
      { k: "Symptom", v: "A policy or price changed yesterday; the system still answers with the old value." },
      { k: "Cause", v: "The index is behind the source of truth \u2014 re-indexing is batch or manual, or the document was edited and never re-embedded." },
      { k: "Immediate", v: "Re-index the changed documents; if one is known stale, invalidate its vectors." },
      { k: "Permanent", v: "Event-driven incremental indexing, change detection by content hash, and an `updated_at` in metadata so freshness is auditable and recent chunks can win ties." }
    ] },

    { t: "code", lang: "python", title: "g68.py \u2014 what the hash check actually costs", code: `def doc_hash(t):
    return hashlib.sha256(t.encode("utf8")).hexdigest()

stored = {name: doc_hash(text) for name, text in corpus}
changed = [name for name, text in corpus if doc_hash(text) != stored[name]]`,
      out: `  hashing 12 documents (359549 chars): 1.3 ms
  documents reported changed: 0

  after editing one document: 1 changed -> 04_Prompt_Engineering.md

  re-embedding cost if you rebuild everything : 13.2 s
  re-embedding cost for the one changed doc   : 1.3 s (116 chunks)
  so the hash check costs 1.3 ms and saves 90% of the rebuild`,
      hl: [1, 6, 7],
      caption: "1.3 milliseconds of hashing to avoid 11.9 seconds of embedding. The ratio is roughly ten thousand to one." },

    { t: "callout", kind: "good", title: "The economics are not close",
      body: [
        { t: "p", text: "Hashing 360,000 characters took **1.3 ms**. Re-embedding the same corpus took **13.2 s** \u2014 four orders of magnitude more. So the check that decides whether to re-embed costs essentially nothing relative to the work it skips, and unlike a timestamp or a heuristic it cannot miss a change." },
        { t: "p", text: "The 90% saving here is specific to one document out of twelve. On a realistic corpus where a daily change touches a handful of documents out of thousands, the saving approaches 100% and the hash check is the only thing standing between you and a nightly full rebuild." },
        { t: "p", text: "Which makes this the incident with the best prevention-to-effort ratio in the lesson. 6.3 added the refinement that matters: normalise before hashing, because three of four trivial edits defeat a raw hash \u2014 and use the hash as the record id so re-ingestion is idempotent." }
      ] },

    { t: "h2", n: "03", id: "ingest", text: "21.2 Quality dropped after a large ingest",
      sub: "Where the measurement disagrees with the stated cause" },

    { t: "dl", items: [
      { k: "Symptom", v: "Answers got worse immediately after loading a big new corpus." },
      { k: "Stated causes", v: "New documents added noise or near-duplicates that crowd out good chunks; chunking was wrong for the new format; a different domain diluted relevance; the ANN parameters now need retuning." },
      { k: "Immediate", v: "Deduplicate near-identical chunks; verify chunking on the new format; consider a separate namespace routed by query type." },
      { k: "Permanent", v: "A retrieval eval set run before and after every ingest, so a quality drop is caught in CI rather than by users." }
    ] },

    { t: "p", text: "Two of those causes are testable directly: does unrelated volume degrade retrieval, and do near-duplicates? They turn out to behave completely differently." },

    { t: "code", lang: "python", title: "g68.py \u00a721.2 \u2014 adding off-topic chunks to the index", code: `WORDS = ("invoice shipment carrier warehouse pallet freight customs tariff "
         "consignment logistics dispatch inventory restock supplier vendor "
         "procurement requisition purchase order fulfilment").split()
for n_extra in (1000, 5000, 20000):
    extra = [" ".join(rng.choice(WORDS, size=60)) for _ in range(n_extra)]`,
      out: `  index                          chunks     recall@5     recall@1
  original                         1187          95%          75%
  +1000 off-topic chunks           2187          95%          75%
  +5000 off-topic chunks           6187          95%          75%
  +20000 off-topic chunks         21187          95%          75%`,
      hl: [7, 8, 9],
      caption: "Eighteen times the corpus in unrelated content. Not one point of movement on either metric." },

    { t: "callout", kind: "insight", title: "Unrelated volume does not crowd out anything",
      body: [
        { t: "p", text: "This is the clearest negative result in the module. Twenty thousand off-topic chunks \u2014 turning a 1,187-chunk index into a 21,187-chunk one \u2014 left recall@5 at 95% and recall@1 at 75%, identical to baseline." },
        { t: "p", text: "The reason is obvious once stated and worth stating anyway: a chunk only displaces a good chunk if it scores *higher* than it for that query. Logistics vocabulary is not similar to questions about LoRA scaling factors, so none of those 20,000 chunks ever entered any top-5. They are not competing; they are simply present." },
        { t: "p", text: "So \u201cthe index got bigger and quality dropped\u201d is not a mechanism, and chasing index size after an ingest regression is chasing the wrong variable. What costs you from volume is memory and latency, which 6.2 measured \u2014 not recall." }
      ] },

    { t: "code", lang: "python", title: "g68.py \u00a721.2 \u2014 the other half: near-duplicates of the real content", code: `for n_dup in (1, 3, 5):
    dups = [c + (" " * d) for c in chunks for d in range(n_dup)]`,
      out: `  index                              chunks     recall@5     recall@1
  +1x near-duplicates                  2374          90%          20%
  +3x near-duplicates                  4748          80%          15%
  +5x near-duplicates                  7122          55%          15%`,
      hl: [2, 3, 4],
      caption: "At 5\u00d7 duplication the index is a third the size of the harmless 20,000-chunk one \u2014 and recall@5 has fallen 40 points." },

    { t: "callout", kind: "trap", title: "What the recall@1 collapse does and does not mean",
      body: [
        { t: "p", text: "Recall@1 falling from 75% to **20%** looks catastrophic and needs qualifying, because my ground truth requires the retrieved chunk to come from the right *document*. A near-duplicate carries identical text under a different document id, so when it wins rank 1 my scorer counts a miss." },
        { t: "p", text: "In production the answer might still be correct \u2014 the text is the same. What breaks for certain is **attribution**: 5.13\u2019s citation resolves to the duplicate rather than to the canonical source, so the user is pointed at the wrong document for a right answer. That is a real and serious failure, just not the one the number literally measures." },
        { t: "p", text: "The recall@5 column is the unambiguous one. At 5\u00d7 duplication it falls to **55%**, which means copies consumed enough of the top 5 that genuinely canonical chunks were pushed out entirely \u2014 and that *is* crowding out, at a third the index size that unrelated noise left untouched." }
      ] },

    { t: "viz", title: "Volume is harmless; duplication is not", caption: "21,187 chunks of noise: no change. 7,122 chunks with duplicates: recall@5 down 40 points.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img" aria-label="Off-topic volume versus near-duplicate effect on recall">
  <text x="16" y="22" class="s-label">RECALL@5 AGAINST WHAT WAS ADDED TO A 1,187-CHUNK INDEX</text>

  <text x="16" y="56" class="s-sub">baseline 1,187</text>
  <rect x="160" y="44" width="380" height="18" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="550" y="58" class="s-mono" style="font-size:10px;fill:var(--good)">95%</text>

  <text x="16" y="86" class="s-sub">+20,000 noise</text>
  <rect x="160" y="74" width="380" height="18" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="550" y="88" class="s-mono" style="font-size:10px;fill:var(--good)">95% \u2014 unchanged at 21,187 chunks</text>

  <line x1="16" y1="108" x2="744" y2="108" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="138" class="s-sub">+1\u00d7 duplicates</text>
  <rect x="160" y="126" width="360" height="18" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="530" y="140" class="s-mono" style="font-size:10px;fill:var(--warn)">90%</text>

  <text x="16" y="168" class="s-sub">+3\u00d7 duplicates</text>
  <rect x="160" y="156" width="320" height="18" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="490" y="170" class="s-mono" style="font-size:10px;fill:var(--warn)">80%</text>

  <text x="16" y="198" class="s-sub">+5\u00d7 duplicates</text>
  <rect x="160" y="186" width="220" height="18" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="390" y="200" class="s-mono" style="font-size:10px;fill:var(--crit)">55% \u2014 at only 7,122 chunks</text>

  <text x="16" y="238" class="s-mono" style="fill:var(--crit)">a chunk displaces a good one only if it SCORES HIGHER for that query</text>
  <text x="16" y="258" class="s-sub">logistics vocabulary never outranks a question about LoRA \u2014 a copy of the right chunk always does</text>
  <text x="16" y="276" class="s-sub">so after an ingest regression, check for duplication, not index size</text>
</svg>` },

    { t: "callout", kind: "good", title: "Which narrows the diagnosis considerably",
      body: [
        { t: "p", text: "After an ingest regression, the four stated causes are not equally likely. Volume is ruled out by measurement. Duplication is confirmed and is the first thing to check \u2014 6.3\u2019s normalised hash count answers it in seconds." },
        { t: "p", text: "The chunking cause remains plausible and is the second check: a new format split badly produces chunks that are genuinely bad rather than merely numerous, and 6.6 measured how sharply that depends on the format. Domain dilution is really a routing question and 6.3\u2019s pre-filter argument applies." },
        { t: "p", text: "ANN retuning I would put last. It changes recall at the margin, and a regression large enough for users to notice is not a margin effect \u2014 6.1\u2019s metrics will show which stage moved before any parameter sweep does." }
      ] },

    { t: "h2", n: "04", id: "oom", text: "21.3 Latency spikes or OOM under load",
      sub: "The incident 6.2 predicted" },

    { t: "dl", items: [
      { k: "Causes", v: "The index grew past memory \u2014 HNSW graphs are RAM-hungry; `ef_search` or `nprobe` tuned up for accuracy at the cost of latency; no replicas, so all QPS lands on one node; metadata filtering scanning too much." },
      { k: "Immediate", v: "Lower `ef_search` or `nprobe` to trade recall for latency; add read replicas; cap `top_k`." },
      { k: "Permanent", v: "Quantization to fit memory, sharding, replicas for read scaling, and capacity tests at projected QPS \u2014 tuning the recall-latency knob against the eval set rather than by guesswork." }
    ] },

    { t: "callout", kind: "insight", title: "6.2 measured exactly why memory arrives first",
      body: [
        { t: "p", text: "A million 384-dimension vectors is **1.5 GB** of raw vectors and searches in an extrapolated 75 ms \u2014 so memory is an application-level constraint while the latency is still invisible beside a generation. Add HNSW\u2019s graph overhead and the memory figure rises further while the latency *falls*." },
        { t: "p", text: "That is why this incident presents as an OOM rather than as a slowdown. The system is fine, fine, fine, and then the process dies \u2014 whereas latency degradation would have given you weeks of warning on a dashboard." },
        { t: "p", text: "So the capacity test the reference asks for should project *memory* at the corpus size you expect, not just QPS. 5.3 measured truncating 384 dimensions to 128 saving two thirds of the storage for five points of recall@5, which is the cheapest lever and the one available before any sharding." }
      ] },

    { t: "callout", kind: "warn", title: "And the recall dial must be set against the eval set",
      body: [
        { t: "p", text: "Lowering `ef_search` under pressure is the correct immediate action and it silently changes answer quality. Nothing errors, no log line appears, and recall drops by an amount nobody measured \u2014 which is the same silent-failure shape as 21.5 below." },
        { t: "p", text: "6.1 is what makes it safe: the IR metrics are deterministic and cheap, so the recall cost of each parameter setting can be measured once and recorded. Then the on-call decision is \u201cdrop to the setting that costs 3 points of recall\u201d rather than \u201cdrop it and hope\u201d." },
        { t: "p", text: "Put that table in the runbook. An incident is the worst possible time to discover that your latency mitigation costs twelve points of recall." }
      ] },

    { t: "h2", n: "05", id: "hallucinate", text: "21.4 It still hallucinates, and the answer is in the corpus",
      sub: "A diagnosis with two branches and a different fix on each" },

    { t: "p", text: "The reference\u2019s key insight is the one worth memorising: this is almost always a recall failure rather than a generation failure. If the relevant chunk never enters the context, the model fills the gap by inventing \u2014 and 5.7 measured that the gap is where hallucination lives." },

    { t: "ladder", title: "The diagnosis, in order", rungs: [
      { level: "bad", label: "Conclude the model hallucinates and change the prompt",
        why: "The most common response and usually the wrong one. If the chunk is absent from the context, no instruction can make the model ground an answer in it.",
        code: `# "Answer ONLY from the context. Do not invent."
# -- already in the prompt, and the context does not contain the answer.`,
        note: "Prompt changes here treat a retrieval bug as a compliance problem." },
      { level: "ok", label: "Check whether the gold chunk is in the top-k at all",
        why: "This is the branch point and it takes minutes. Absent means retrieval; present but ignored means generation.",
        code: `rank = next((i for i, c in enumerate(retrieved) if c.id in gold_ids), None)
print("gold chunk rank:", rank)   # None -> retrieval failure`,
        note: "6.1's golden set makes this mechanical rather than anecdotal." },
      { level: "best", label: "Fix the branch you landed on",
        why: "Retrieval failures want hybrid search, query rewriting, better chunking or a re-ranker. Generation failures want a groundedness gate and chunk reordering.",
        code: `# retrieval branch:  BM25 + RRF took my recall@5 from 95% -> 100%
# generation branch: move the most relevant chunk LAST, beating lost-in-the-middle`,
        note: "The two branches share no fixes, which is why guessing is expensive." }
    ] },

    { t: "callout", kind: "insight", title: "M5 measured both branches on the same query",
      body: [
        { t: "p", text: "The query \u201cWhy divide alpha by r in LoRA?\u201d sat at rank 15 under dense retrieval through every chunking strategy 5.4 tried \u2014 a textbook retrieval failure, where the chunk existed and never entered a top-5. BM25 moved it to rank 10, and HyDE moved it to rank 1." },
        { t: "p", text: "That is the retrieval branch resolved by retrieval fixes, and it took three different interventions to find the one that worked. No prompt change would have touched it, because the context never contained the chunk." },
        { t: "p", text: "The generation branch is rarer and has its own signature: the chunk is demonstrably in the context and the answer ignores it. Then reordering helps \u2014 put the most relevant chunk last, since attention to the middle of a long context is weakest \u2014 and a faithfulness gate catches what remains." }
      ] },

    { t: "h2", n: "06", id: "model", text: "21.5 You changed the embedding model",
      sub: "The most dangerous failure here, because nothing errors" },

    { t: "code", lang: "python", title: "g68.py \u00a721.5 \u2014 query and index embedded by different models", code: `other = SentenceTransformer("sentence-transformers/paraphrase-MiniLM-L3-v2")
QV_other = other.encode([q for q, _, _ in QS], normalize_embeddings=True)
MIS = np.argsort(-(QV_other @ E.T), axis=1)     # against the OLD index`,
      out: `  index model : all-MiniLM-L6-v2            (384 dims)
  query model : paraphrase-MiniLM-L3-v2     (384 dims)
  dimensions match, so NOTHING ERRORS -- the call succeeds and returns results

  configuration                              recall@5
  matched (both all-MiniLM-L6-v2)                 95%
  mismatched (different query model)              50%

  mean top-1 similarity, matched    : 0.5698
  mean top-1 similarity, mismatched : 0.2356`,
      hl: [3, 7, 10, 11],
      caption: "95% to 50%, with no exception, no warning and a plausible-looking set of results." },

    { t: "callout", kind: "trap", title: "The dangerous upgrade is the one that keeps the dimensionality",
      body: [
        { t: "p", text: "Both models output 384 dimensions, so every matrix multiply succeeds and every query returns five chunks with ordinary-looking scores. Recall halves. The system is not down; it is wrong." },
        { t: "p", text: "The case that *does* fail loudly is a dimension change: embedding the same query with a 768-dimension model raised `matmul: Input operand 1 has a mismatch in its core dimension` immediately. That is the safe failure \u2014 it stops the deploy." },
        { t: "p", text: "So the intuition is inverted from what people expect. A model swap that changes dimensionality is caught by the first request; a swap that preserves it can run in production indefinitely while every answer degrades. Pin the embedding model as a versioned dependency precisely because the bad case is the quiet one." }
      ] },

    { t: "callout", kind: "good", title: "And there is a monitor that catches it",
      body: [
        { t: "p", text: "Mean top-1 similarity fell from **0.5698** to **0.2356** \u2014 less than half. Individual scores stay in a plausible range, which is why a human eyeballing one query sees nothing wrong, but the *distribution* moved enormously." },
        { t: "p", text: "That is exactly what 5.13 argued for logging: retrieval scores, not just retrieved ids. A top-1 similarity distribution with a mean and a p10 tracked over time turns this silent failure into an obvious step change on a dashboard, and it costs one float per query." },
        { t: "p", text: "6.7 adds the corroborating detail: my 20 answerable queries had a mean top-1 of 0.5698 and the unanswerable ones 0.3388. A mismatched index at 0.2356 scores *below the unanswerable baseline* \u2014 so a relevance gate set anywhere sensible would start refusing almost everything, which is itself a loud signal." }
      ] },

    { t: "h2", n: "07", id: "leak", text: "21.6 A user saw a document they were not entitled to",
      sub: "A security incident, and the ordering is the whole fix" },

    { t: "dl", items: [
      { k: "Immediate", v: "Disable the affected retrieval path or force the ACL gate on; assess blast radius from logs \u2014 which users, which documents." },
      { k: "Root cause", v: "Retrieval was not filtered by the user\u2019s permissions; vectors from all tenants live in one index and the query matched across the boundary." },
      { k: "Permanent", v: "Enforce access control at retrieval time \u2014 partition by tenant or apply row-level filters inside the ANN query \u2014 plus PII redaction on output and citation enforcement so every served fact is traceable to an authorised source." }
    ] },

    { t: "code", lang: "python", title: "g68.py \u00a721.6 \u2014 post-filter against pre-filter, on a two-tenant split", code: `# post-filter: search everything, then drop the other tenant
top5 = BASE[i][:5]
leaked += sum(1 for j in top5 if cten[j] != want)

# pre-filter: restrict the candidate set, THEN search
idxs = [j for j in range(len(chunks)) if cten[j] == want]
order = np.argsort(-(QV[i] @ E[idxs].T))`,
      out: `  approach                               recall@5  leaked rows
  post-filter (search all, drop after)          95%           19
  pre-filter (restrict, then search)            95%            0`,
      hl: [6, 7],
      caption: "Identical recall. Nineteen other-tenant chunks read, scored and discarded by the first approach." },

    { t: "callout", kind: "warn", title: "Equal recall is what makes this unarguable",
      body: [
        { t: "p", text: "If post-filtering were faster or more accurate there would be a trade-off to discuss. It is neither \u2014 both reached **95% recall@5** \u2014 so the only thing post-filtering produces is 19 rows of another tenant\u2019s content passing through the application." },
        { t: "p", text: "Those rows were read from the index, scored against the query, ranked into the top 5, and very likely written to a log before being dropped. 5.13 recommends logging retrieved ids and scores, which in this architecture means logging the leak." },
        { t: "p", text: "So the filter belongs inside the search call, as a parameter rather than as a subsequent list comprehension. `retriever.search(query, top_k=5, user=current_user)` is the guardrail; anything applied to its output is a cleanup." }
      ] },

    { t: "table",
      head: ["Incident", "Measured signature", "Errors?", "The check that catches it"],
      rows: [
        ["21.1 Stale answers", "Index hash differs from source hash", "No", "`updated_at` freshness monitor \u2014 and hashing costs 1.3 ms"],
        ["21.2 Bad ingest", "**Duplication** drops recall@5 95%\u219255%; volume does nothing", "No", "Golden set before and after every ingest"],
        ["21.3 OOM under load", "1.5 GB per million vectors; latency still fine", "**Yes** \u2014 the process dies", "Memory projection at target corpus size"],
        ["21.4 Hallucination", "Gold chunk absent from top-k", "No", "Gold-chunk rank check on failing queries"],
        ["21.5 Model mismatch", "Recall 95%\u219250%; top-1 similarity 0.5698\u21920.2356", "**Only if dims differ**", "Score distribution monitor"],
        ["21.6 Cross-tenant leak", "19 foreign rows in top 5 at identical recall", "No", "Pre-filter by construction; audit the search signature"]
      ] },

    { t: "callout", kind: "insight", title: "Four of six fail silently, and that is the pattern",
      body: [
        { t: "p", text: "Only the OOM announces itself, and the dimension-mismatch half of 21.5. Everything else produces a working system returning plausible answers that are wrong \u2014 which is why every permanent fix in this lesson is a *measurement* rather than a code change." },
        { t: "p", text: "The golden set covers 21.2 and 21.4 directly and is the single highest-value artefact: deterministic, cheap, CI-able, and 6.1 showed it costs nothing to run. A score-distribution monitor covers 21.5 and the quiet half of 21.3. A freshness field covers 21.1." },
        { t: "p", text: "21.6 is the exception that cannot be monitored into safety, because by the time it is detectable the disclosure has happened. That one has to be correct by construction, which is why the pre-filter is non-negotiable where the others are strongly recommended." }
      ] },

    { t: "exercise", kind: "analysis", title: "Run the incident drills against your own system", difficulty: "advanced", minutes: 45,
      body: "Reproduce three of these six on your own index and record the signature each produces. Pick the ones you believe you are exposed to. Then write the runbook entry for each: symptom, the one metric that reveals it, the immediate mitigation and its measured cost, and the permanent fix.",
      requirements: [
        "Reproduce at least the duplication case and the embedding-mismatch case",
        "Record the metric change each produces on your own golden set",
        "Measure the cost of each immediate mitigation, not just its effect",
        "State for each whether it errors or fails silently",
        "Identify which of your current monitors would have caught it, honestly"
      ],
      hint: "The mismatch drill is the one to do first and it takes ten minutes: embed your queries with a different model of the same dimensionality and run them against your existing index.",
      solution: { lang: "python", title: "the two drills that matter most", code: `# DRILL 1 -- embedding model mismatch. Same dimensionality, so nothing errors.
other = SentenceTransformer("some-other-384-dim-model")
QV_bad = other.encode(queries, normalize_embeddings=True)
MIS = np.argsort(-(QV_bad @ E.T), axis=1)
print("recall@5 matched    : %.0f%%" % (100 * recall(BASE)))
print("recall@5 mismatched : %.0f%%" % (100 * recall(MIS)))
print("mean top-1 sim      : %.4f -> %.4f"
      % (np.mean([QV[i] @ E[BASE[i][0]] for i in range(len(queries))]),
         np.mean([QV_bad[i] @ E[MIS[i][0]] for i in range(len(queries))])))

# DRILL 2 -- duplication. Note what it does to recall@1 vs recall@5.
for n_dup in (1, 3, 5):
    dups = [c + (" " * d) for c in chunks for d in range(n_dup)]
    AE = np.vstack([E, encode(dups)])
    R = np.argsort(-(QV @ AE.T), axis=1)
    print("+%dx dups: recall@5 %.0f%%  recall@1 %.0f%%"
          % (n_dup, 100 * recall(R, k=5), 100 * recall(R, k=1)))`,
        out: `  recall@5 matched    : 95%
  recall@5 mismatched : 50%
  mean top-1 sim      : 0.5698 -> 0.2356

  +1x dups: recall@5 90%  recall@1 20%
  +3x dups: recall@5 80%  recall@1 15%
  +5x dups: recall@5 55%  recall@1 15%`,
        notes: [
          { t: "p", text: "**The mismatch drill is ten minutes and tells you whether you are exposed.** If your embedding model is not pinned to an exact version, you are one dependency bump away from a 45-point recall drop with no error raised. The drill is worth running once purely to see how ordinary the broken output looks." },
          { t: "p", text: "**The similarity line is the monitor you should be building.** 0.5698 to 0.2356 is not subtle in aggregate even though individual scores look plausible. One float logged per query gives you a distribution that turns this into a step change on a chart." },
          { t: "p", text: "**Read recall@1 and recall@5 separately in the duplication drill**, because they say different things. The recall@1 collapse is partly scoring artefact \u2014 a duplicate carries the same text under another document id, so attribution breaks rather than correctness. The recall@5 fall to 55% is unambiguous crowding out." },
          { t: "p", text: "**Compare against the volume case before concluding anything about size.** I added 20,000 unrelated chunks and recall did not move at all, so if your regression followed a large ingest, measure duplication before you touch index parameters or chunk sizes." },
          { t: "p", text: "One honest limitation of my duplication drill: I generated duplicates by appending spaces, which is the most trivial possible near-duplicate and defeats a raw content hash while a normalised hash catches it. Real near-duplicates \u2014 boilerplate, re-exported documents, templated pages \u2014 differ more and need the cosine or MinHash pass from 6.3, so treat these figures as the optimistic end." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Four of these six failures return a working system with wrong answers, so the permanent fix is almost never a code change \u2014 it is a measurement that would have made the failure visible. A golden set run on every ingest, a score distribution logged per query, and a freshness field cover five of the six." },
        { t: "p", text: "And the diagnostic habit generalises: ask what would have to score higher for this to happen. Unrelated volume cannot outrank a good chunk, so volume is never the cause; a copy of the right chunk always can, so duplication always is. That question is faster than any parameter sweep." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cRetrieval quality dropped right after we ingested a large new corpus. Walk me through it.\u201d**" },
        { t: "p", text: "First the immediate: I would check whether a rollback is available \u2014 if the new documents went into their own namespace, routing around them restores service in minutes while I diagnose." },
        { t: "p", text: "Then I would go straight to duplication rather than to index size, because I have measured that volume is not the mechanism. Adding 20,000 off-topic chunks to a 1,187-chunk index \u2014 eighteen times the corpus \u2014 left recall@5 at 95% and recall@1 at 75%, completely unchanged. Near-duplicates at a third that index size dropped recall@5 to 55%." },
        { t: "p", text: "The reason is a one-line test you can apply to any ingest regression: a new chunk only displaces a good one if it scores higher for that query. Logistics vocabulary never outranks a question about LoRA scaling. A copy of the right chunk always does." },
        { t: "p", text: "So: count chunks by normalised content hash, which takes seconds and tells you immediately. Then check chunking on the new format, which is the second plausible cause and the one 6.6-style measurement settles \u2014 a new format split badly produces chunks that are genuinely bad rather than merely numerous. ANN retuning I would put last, because a user-visible regression is not a margin effect." },
        { t: "p", text: "The permanent fix is the golden set run before and after every ingest, in CI. The metrics are deterministic arithmetic over a label set, so this is a gate rather than a judgement call, and it is what turns this from an incident into a failed build." },
        { t: "p", text: "One caveat I would volunteer on the numbers: my duplicates were generated by appending whitespace, which is the most trivial near-duplicate there is. Real ones \u2014 boilerplate, re-exports, templated pages \u2014 differ more and need a cosine or MinHash pass to catch, so those figures are the optimistic end of the range." }
      ] }
  ],

  takeaways: [
    "**Answer incidents in four parts** \u2014 symptom, causes, immediate mitigation, permanent fix \u2014 because jumping to the permanent fix skips stopping the bleeding.",
    "**Hashing costs 1.3 ms against 13.2 s of re-embedding**, four orders of magnitude, so change detection is the best prevention-to-effort ratio in the lesson.",
    "**Unrelated volume does not degrade recall at all**: 20,000 off-topic chunks left recall@5 at 95% and recall@1 at 75%, unchanged from a 1,187-chunk baseline.",
    "**Duplication does, badly** \u2014 recall@5 fell 95%\u219290%\u219280%\u219255% at 1\u00d7, 3\u00d7 and 5\u00d7, at a third the index size that noise left untouched.",
    "**A chunk displaces a good one only if it scores higher**, which is why volume is never the cause of an ingest regression and duplication always is.",
    "**The recall@1 collapse is partly attribution**, not correctness \u2014 a duplicate carries identical text under another document id, so the citation points at the wrong source.",
    "**OOM arrives before slowdown**: memory is an application constraint at 1.5 GB per million vectors while 75 ms of search is still invisible, so the process dies without warning.",
    "**Hallucination is almost always a recall failure** \u2014 check whether the gold chunk is in the top-k at all, because the two branches share no fixes.",
    "**A model swap that preserves dimensionality is the dangerous one**: recall 95%\u219250% with nothing erroring, while a dimension change fails on the first request.",
    "**Log retrieval scores, not just ids** \u2014 mean top-1 similarity fell 0.5698\u21920.2356 under mismatch, below even the unanswerable-query baseline of 0.3388.",
    "**Pre-filtering and post-filtering reached identical 95% recall**, and post-filtering put 19 other-tenant chunks through the top 5 \u2014 so there is no trade-off to weigh.",
    "**Four of the six fail silently**, so every permanent fix is a measurement; 21.6 is the exception that must be correct by construction, because detection comes after disclosure."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Adding 20,000 off-topic chunks to a 1,187-chunk index left recall@5 at 95% and recall@1 at 75%, while adding 5\u00d7 near-duplicates dropped recall@5 to 55%. What follows for diagnosing an ingest regression?",
        options: [
          "Index size is the problem above roughly 20,000 chunks, so the new corpus should be sharded",
          "Volume is ruled out as a mechanism \u2014 a chunk displaces a good one only by scoring higher \u2014 so check duplication first",
          "The off-topic chunks were too dissimilar to be a realistic test of noise",
          "Recall@1 is the only metric sensitive enough to detect ingest problems"
        ],
        answer: 1,
        why: "Unrelated vocabulary never enters a top-5 for an unrelated query, so those 20,000 chunks are present without competing \u2014 they cost memory and latency, which 6.2 measured, but not recall. A copy of a relevant chunk always competes, which is why duplication crowds out canonical chunks at a third the index size. The practical consequence is an ordering: count chunks by normalised hash before touching index parameters or chunk sizes." },

      { stem: "Query and index embeddings came from two different models that both output 384 dimensions. Recall@5 fell from 95% to 50% and mean top-1 similarity from 0.5698 to 0.2356. Why is this considered more dangerous than a dimension mismatch?",
        options: [
          "Because the recall drop is larger than a dimension mismatch would cause",
          "Because matching dimensionality means every operation succeeds \u2014 nothing errors, results look plausible, and the system can run wrong indefinitely",
          "Because 384-dimension models are more widely used and so more often confused",
          "Because the similarity scores remain above the relevance gate threshold"
        ],
        answer: 1,
        why: "A dimension change raises an error on the first request \u2014 measured, `matmul: Input operand 1 has a mismatch in its core dimension` \u2014 which stops the deploy. Equal dimensionality means the matrix multiply succeeds and five ordinary-looking chunks come back while recall has halved. The monitor that catches it is the score distribution rather than any individual score: the mean moved from 0.5698 to 0.2356, which is below even the 0.3388 baseline measured for unanswerable queries." },

      { stem: "Pre-filtering and post-filtering by tenant both achieved 95% recall@5, and post-filtering placed 19 other-tenant chunks in the top 5 before discarding them. What is the correct conclusion?",
        options: [
          "Either is acceptable since the recall is identical and the foreign rows are discarded",
          "There is no trade-off to weigh \u2014 the only thing post-filtering produces is 19 rows of foreign content read, scored and probably logged, so the filter belongs inside the search call",
          "Post-filtering is preferable because it allows a single unpartitioned index",
          "The leak count shows the tenant split was implemented incorrectly"
        ],
        answer: 1,
        why: "Equal recall removes any performance argument, so the comparison is purely about exposure. Those rows were read from the index, ranked into the top 5, and 5.13's recommendation to log retrieved ids and scores means they were likely written to a log as well. Passing the user into the search call makes the constraint part of the query rather than a cleanup applied to its results \u2014 and unlike the other five incidents this one cannot be monitored into safety, because detection comes after disclosure." },

      { stem: "A RAG system hallucinates on a query whose answer demonstrably exists in the corpus. What is the first diagnostic step?",
        options: [
          "Strengthen the prompt instruction to answer only from provided context",
          "Check whether the gold chunk appears in the top-k at all \u2014 absent means a retrieval failure, present but ignored means a generation failure",
          "Lower the relevance threshold so more chunks reach the context",
          "Add a faithfulness check to block the ungrounded answer"
        ],
        answer: 1,
        why: "The two branches share no fixes, so guessing is expensive. Retrieval failures want hybrid search, query rewriting, better chunking or a re-ranker \u2014 M5's hardest query sat at rank 15 through every chunking strategy, moved to rank 10 under BM25 and rank 1 under HyDE. Generation failures want chunk reordering and a groundedness gate. Strengthening the prompt is the common first response and cannot help when the context does not contain the answer." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Six incidents, answered on-call",
    questions: [
      { level: "advanced",
        q: "Users are getting stale answers after we updated the source documents. Walk me through it.",
        strong: "A strong answer separates the immediate action from the design fix and prices the fix.",
        answer: [
          { t: "p", text: "Immediately: trigger a re-index of the documents known to have changed, and if a specific one is known stale, invalidate its vectors so it cannot be retrieved with old content. That restores correctness for the reported case within minutes." },
          { t: "p", text: "The cause is that the index is behind the source of truth \u2014 either re-indexing is batch or manual, or the document was edited and never re-embedded at all. I would check which, because they have different fixes: a scheduling gap versus a missing trigger." },
          { t: "p", text: "The permanent fix is event-driven incremental indexing with change detection by content hash, and the economics make it an easy sell. I measured hashing 12 documents of 360,000 characters at 1.3 milliseconds against 13.2 seconds to re-embed them \u2014 four orders of magnitude \u2014 and re-embedding only the one changed document saved 90% of the rebuild." },
          { t: "p", text: "Two details that matter. Normalise before hashing, because I measured that a trailing space, collapsed whitespace and a case change all defeat a raw hash while a real content change still differs. And store an `updated_at` so freshness is auditable and recent chunks can win ties \u2014 it costs nothing and it is what lets you answer \u201chow stale is this\u201d without re-reading the source." }
        ] },

      { level: "advanced",
        q: "The embedding model was upgraded and retrieval returned garbage. What happened and how do you prevent it?",
        strong: "A strong answer identifies that the silent case is the dangerous one.",
        answer: [
          { t: "p", text: "Query and index embeddings have to come from the same model, because a different model produces a different vector space and cosine against the old index is meaningless. Immediately I would roll the query-side model back to match the index, which is a config change rather than a rebuild." },
          { t: "p", text: "What makes this worth measuring is how quiet it is. I ran it: two models both at 384 dimensions, so every matrix multiply succeeded and every query returned five plausible-looking chunks, while recall@5 fell from 95% to 50%. Nothing errored." },
          { t: "p", text: "And the intuition is inverted from what people expect. A model with different dimensionality fails on the very first request \u2014 I got `matmul: Input operand 1 has a mismatch in its core dimension` \u2014 which stops the deploy. The dangerous upgrade is the one that preserves dimensionality, because it can run in production indefinitely." },
          { t: "p", text: "So: pin the embedding model as a versioned dependency and treat a bump as a full corpus re-embed into a new index, validated on the eval set, then an atomic blue-green cutover with the old index kept for rollback. There is no incremental path \u2014 a half-migrated index has some vectors comparable to the query and some that are noise." },
          { t: "p", text: "The monitor I would add is a score distribution rather than a score threshold. Mean top-1 similarity went from 0.5698 to 0.2356, which is below even the 0.3388 I measured for deliberately unanswerable queries. One float logged per query turns this into an obvious step change." }
        ] },

      { level: "core",
        q: "A user received content from a document they were not authorised to see. How do you handle it?",
        strong: "A strong answer treats it as a security incident and knows the ordering is the fix.",
        answer: [
          { t: "p", text: "As a security incident, which changes the order of operations. Immediately: disable the affected retrieval path or force the ACL gate on, then assess blast radius from the logs \u2014 which users, which documents, over what window. Containment before diagnosis." },
          { t: "p", text: "The root cause is almost always that retrieval was not filtered by the user's permissions: vectors from all tenants live in one index and the query matched across the boundary. Often there *is* a filter, applied to the results rather than to the search." },
          { t: "p", text: "That distinction is the whole fix and I have measured that it costs nothing. On a two-tenant split, pre-filtering and post-filtering both reached 95% recall@5 \u2014 and post-filtering put 19 other-tenant chunks into the top 5 before discarding them. Equal recall means there is no trade-off to weigh; the only thing post-filtering buys is exposure." }
          ,{ t: "p", text: "Those 19 rows were read, scored, ranked and very plausibly logged, since logging retrieved ids and scores is standard practice. So in that architecture the observability layer is also a copy of the leak." },
          { t: "p", text: "Permanently: partition by tenant into separate namespaces, or apply row-level filters inside the ANN query so the user's identity is a parameter of the search rather than a post-condition. Plus PII redaction on output and citation enforcement so every served fact traces to an authorised source. And this is the one incident that cannot be monitored into safety \u2014 by the time it is detectable the disclosure has happened, so it has to be correct by construction." }
        ] }
    ]
  }
});
