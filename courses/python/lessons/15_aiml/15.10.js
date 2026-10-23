/* ============================================================================
   LESSON 15.10 — Disaster Recovery for ML, Agentic and RAG Systems
   ========================================================================= */
EC.receiveLesson({
  id: "15.10",

  lede: "Disaster recovery for a web application is a solved shape: restore the database, point traffic at the standby, done. **An ML or agentic system has state a web application does not have — a model artifact, a vector index, a prompt version, a half-finished agent run — and most of it is *derived*, which makes \"how long to rebuild it\" the number that actually sets your recovery time.** This lesson is about the assets, the rebuild-or-restore decision, the dependency you cannot fail over, and the restore test that catches the failure nobody else catches.",

  objectives: [
    "State an RTO and an RPO per asset rather than one pair for the whole system",
    "Decide rebuild-or-restore from measured rebuild time, not from whether the asset is derived",
    "Plan for a model-provider outage, including what a fallback model does to output quality",
    "Recover an agent run without repeating the side effects it already performed",
    "Test a restore with an evaluation suite, because a silently degraded index raises no error"
  ],

  prerequisites: ["14.8", "15.6"],

  blocks: [

    { t: "h2", n: "01", text: "Two numbers, and why one pair is not enough", id: "rto-rpo" },

    {"kind": "trace", "title": "One pair of numbers, applied to six assets that disagree", "caption": "**A single system-wide RTO is an average of things that have nothing in common** — and the moment it is written down, the plan is wrong for every asset at once. Here a stated four-hour RTO is comfortable for four rows and arithmetically impossible for one: **the index cannot be rebuilt in four hours, so the plan commits to something nobody has checked.** Per-asset numbers make that visible on the page rather than during the incident, which is the entire argument for writing the table.", "left": "asset", "codeW": 170, "vars": ["realistic RTO", "against a stated 4h"], "steps": [{"code": "application code", "state": ["10 minutes", "comfortable"], "tone": "good"}, {"code": "model artifact", "state": ["15 minutes, from object storage", "comfortable"], "changed": [0, 1], "tone": "good"}, {"code": "prompts", "state": ["10 minutes, they are in git", "comfortable"], "changed": [0, 1], "tone": "good"}, {"code": "checkpointer database", "state": ["30 minutes, point-in-time", "comfortable"], "changed": [0, 1], "tone": "accent"}, {"code": "vector index, rebuilt", "state": ["6.1 hours, measured", "IMPOSSIBLE"], "changed": [0, 1], "tone": "crit"}, {"code": "source documents", "state": ["not recoverable at all", "the real risk"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-15_10-01-0"},

    { t: "p", text: "Disaster recovery is specified with two numbers, and they are about different things. **RTO is time: how long until the system serves requests again. RPO is data: how much recent work you accept losing.** A four-hour RTO and a five-minute RPO is a normal pair for an ordinary application." },

    { t: "dl", items: [
      ["RTO — recovery time objective", "The maximum acceptable time from the incident to serving traffic again. It is a budget you spend on detection, decision, restore and verification — and teams usually forget the first and last."],
      ["RPO — recovery point objective", "The maximum acceptable amount of recent data lost, expressed as time. A five-minute RPO means snapshots or replication no coarser than five minutes."],
      ["Derived asset", "Something you can recompute from a source you still have. A vector index is derived from documents; a trained model is derived from data plus code plus a seed."],
      ["Rebuild time", "How long recomputing a derived asset actually takes, measured rather than assumed. **For a derived asset this is the real RTO**, unless you also keep a snapshot."],
      ["Degraded mode", "A deliberately reduced service that stays up: cached answers, extractive answers, a smaller model, or a queue with an honest wait. The alternative is an error page."]
    ]},

    { t: "p", text: "**The single most common mistake in this area is stating one RTO and one RPO for \"the system\".** An ML application is five or six assets with genuinely different needs: the code can be restored in a minute, the model artifact in a few minutes, the vector index possibly not for nine hours. One pair of numbers hides that, and the plan it produces is wrong for every asset at once." },

    { t: "h2", n: "02", text: "The asset inventory", id: "inventory" },

    {"kind": "tree", "title": "What is derived, what is source, and the one that only looks derived", "caption": "**Read it as two piles.** Everything on the right can be recomputed, so its recovery is a question of time and money. Everything on the left cannot, so it needs real backups and a named owner. **The trap is the middle: a vector index is derived from the documents, which makes it recoverable only while the documents exist somewhere else** — and in a RAG system that somewhere is frequently another team's system with its own retention policy. If the corpus lived only in the index, the index was never derived from anything you still have.", "root": {"label": "Everything to recover", "sub": "two piles, and one of them is dangerous", "tone": "accent", "children": [{"label": "SOURCE - must be backed up", "sub": "nothing recomputes these", "tone": "crit", "children": [{"label": "source documents", "sub": "the only true single point of failure", "tone": "crit"}, {"label": "agent and approval state", "sub": "the conversation IS the request", "tone": "crit"}, {"label": "code, prompts, eval goldens", "sub": "in git, so already solved", "tone": "good"}]}, {"label": "DERIVED - recomputable", "sub": "the question is how long", "tone": "violet", "children": [{"label": "vector index", "sub": "from documents plus an embedding model", "tone": "warn"}, {"label": "model artifact", "sub": "from data plus code plus a seed", "tone": "warn"}, {"label": "online feature store", "sub": "from the offline store", "tone": "good"}, {"label": "response and semantic cache", "sub": "cold start, not a disaster", "tone": "good"}]}]}, "t": "diagram", "id": "dg-15_10-02-1"},

    { t: "p", text: "Every recovery plan starts as a table of what there is to recover. For an ML or agentic application it is longer than people expect, and the interesting column is the last one." },

    { t: "table",
      head: ["Asset", "Lives in", "Derived from", "If you lose it"],
      rows: [
        ["Application code", "Git, plus a container registry", "Nothing — it is the source", "Restore from git; minutes, and the rehearsed part"],
        ["**Model artifact**", "Object storage, versioned", "Training data + code + seed", "Retrain, or restore the artifact. **Retraining is hours to days** (15.6)"],
        ["**Vector index**", "A vector store", "Documents + an embedding model", "**Re-embed and re-index — the number nobody has measured**"],
        ["Source documents", "Object storage or a CMS", "Nothing — the source of truth for RAG", "The index cannot be rebuilt at all. This is the one real single point of failure"],
        ["Prompts and prompt versions", "Code, or a prompt registry", "Nothing", "Behaviour changes silently. Treat them as code (14.2)"],
        ["**Agent / graph state**", "A checkpointer database", "Nothing — it is the conversation", "In-flight runs are lost, and some had already acted"],
        ["Feature store, online half", "A low-latency store", "The offline store", "Rebuildable, and the skew while it rebuilds is a correctness problem (15.5)"],
        ["Evaluation sets and goldens", "Git or object storage", "Nothing", "You can restore the system and cannot prove it is correct"],
        ["Semantic / response cache", "Redis or similar", "Nothing — it is an optimisation", "Cold start, higher cost and latency. Not a disaster"]
      ],
      caption: "**The bolded rows are the ones an ordinary DR plan does not have.** And the row most often missing entirely is the last-but-one: a team restores the service, has no way to check it, and declares the incident over based on the fact that it returns 200." },

    { t: "callout", kind: "insight", title: "Source documents are the real single point of failure", body: [
      { t: "p", text: "A vector index is derived, so the plan says \"we can rebuild it\". That is true only while the documents exist. If the corpus itself lived only in the system you just lost — scraped pages nobody kept, uploads written straight to the index, a Confluence export that was never re-run — then the index is not derived from anything you still have, and it cannot be rebuilt at any price." },
      { t: "p", text: "**The check is one question per source: where is the copy that is not in the index?** For RAG over internal documents, the answer is usually a system owned by another team, which makes their retention policy part of your recovery plan whether or not anyone has told them." }
    ]},

    { t: "h2", n: "03", text: "Rebuild or restore, decided by measurement", id: "rebuild-or-restore" },

    {"kind": "trace", "title": "Six hours against eleven minutes, for the same asset", "caption": "**The plan called the index “derived, so we can rebuild it”, and that sentence is a six-hour commitment.** Measuring it takes one batch of embeddings and some arithmetic, and it reverses the decision: snapshot the derived asset, because otherwise rebuild time *is* your recovery time. **Keep the rebuild path working anyway** — it is the only answer to a corrupt snapshot, to a bad write that the snapshot also contains, and to documents that have changed since the snapshot was taken.", "left": "step", "codeW": 190, "vars": ["measured", "running total"], "steps": [{"code": "embed one chunk", "state": ["12.4 ms", "-"], "tone": "accent"}, {"code": "at 8 concurrent workers", "state": ["645 chunks/s", "-"], "changed": [0], "tone": "accent"}, {"code": "re-embed 10,000,000 chunks", "state": ["4.3 h", "4.3 h"], "changed": [0, 1], "tone": "warn"}, {"code": "build the HNSW index", "state": ["1.8 h", "6.1 h - the rebuild RTO"], "changed": [0, 1], "tone": "crit"}, {"code": "restore a snapshot instead", "state": ["11 minutes", "33x faster"], "changed": [0, 1], "tone": "good"}, {"code": "so keep both paths", "state": ["snapshot is primary", "rebuild answers a corrupt snapshot"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-15_10-03-2"},

    { t: "p", text: "Because a vector index is derived, the instinct is to plan on rebuilding it. **That is a decision about hours, and almost nobody has the number.** Measure it once on real data, and the decision usually reverses." },

    { t: "code", lang: "python", title: "Measuring the rebuild, so the RTO is a number rather than a hope",
      code: `import time

CHUNKS = 10_000_000          # a mid-sized internal corpus
BATCH = 256

t0 = time.perf_counter()
vectors = embed_batch(sample_chunks[:BATCH])      # the provider call
embed_s = time.perf_counter() - t0

per_chunk = embed_s / BATCH
print(f"embedding: {per_chunk * 1000:.1f} ms/chunk")

# AT 8 CONCURRENT WORKERS, which is what the rate limit allowed (15.9):
throughput = 8 / per_chunk
hours = CHUNKS / throughput / 3600
print(f"re-embedding {CHUNKS:,} chunks: {hours:.1f} h")
print(f"provider cost: ~\${CHUNKS / 1000 * 0.00002 * 1000:,.0f}")

# MEASURED HERE:
#   embedding       12.4 ms/chunk
#   throughput      645 chunks/s
#   re-embed 10M    4.3 h   -- and that is the embedding alone
#   index build     + 1.8 h for HNSW construction at this size
#   total           6.1 h
#
# AGAINST RESTORING A SNAPSHOT OF THE SAME INDEX: 11 minutes.`,
      caption: "**Six hours against eleven minutes, for an asset the plan called \"derived, so we can rebuild it\".** The rebuild path is not wrong — it is a six-hour RTO, and the only way to know that is to have run the measurement." },

    { t: "p", text: "So the answer is both, for different reasons. **Snapshot the derived asset because rebuild time is your RTO; keep the rebuild working because a snapshot is not a guarantee.**" },

    { t: "table",
      head: ["Failure", "Snapshot restores it?", "Rebuild restores it?"],
      rows: [
        ["Region or cluster lost", "**Yes** — minutes", "Yes, slowly"],
        ["Index corrupted by a bad write", "Yes, if the snapshot predates it", "**Yes** — and this is why rebuild must stay working"],
        ["Snapshot itself corrupt or unrestorable", "No", "**Yes** — the reason not to rely on one path"],
        ["Embedding model deprecated by the provider", "Yes, but the index is now frozen", "**No** — vectors from a new model are not comparable to old ones"],
        ["Documents changed and the index is stale", "No — it restores the staleness", "**Yes** — the only path"]
      ],
      caption: "**The fourth row is the one that surprises people.** A provider retiring an embedding model does not corrupt your index; it means you can no longer embed a *query* into the same space, so every new search is comparing vectors from two different models. The index still answers, and the answers are quietly wrong — see section 06." },

    { t: "h2", n: "04", text: "The dependency you cannot fail over", id: "provider" },

    {"kind": "flow", "title": "Degrade first, then fail over - and never ship a fallback that takes no traffic", "caption": "**There is no standby to promote, so the first question is not “which second provider” but “what does this system do with no model at all”.** For RAG the answer is unusually good: return the retrieved passages without a generated summary, and say so — a RAG system degrades to search, which is still useful and needs no provider. **A second provider is worth having and is not a hot standby:** the prompts were tuned against the primary, so the secondary returns different answers and may reject your output schema outright. One per cent of traffic, continuously, is what turns it from a plan into something already working.", "cols": 3, "nodes": [{"id": "o", "label": "The provider is down", "sub": "no replica, no failover, their status page", "tone": "crit"}, {"id": "d", "label": "Degrade: passages, no generated answer", "sub": "RAG falls back to search", "tone": "good"}, {"id": "q", "label": "Queue the asynchronous work", "sub": "an outage is a delay, not an incident", "tone": "good"}, {"id": "s", "label": "Or fail over to a second provider", "sub": "the code is the easy part", "tone": "accent"}, {"id": "e", "label": "But the answers differ", "sub": "prompts and formats are model-specific", "tone": "warn"}, {"id": "t", "label": "So run the evals against it first", "sub": "and send it 1% of traffic always", "tone": "violet"}], "edges": [["o", "d"], ["o", "q"], ["o", "s"], ["s", "e"], ["e", "t"]], "t": "diagram", "id": "dg-15_10-04-3"},

    { t: "p", text: "Everything above is your infrastructure. **The model provider is not, and you cannot fail it over** — there is no standby you control, no replica to promote, and their status page is your only telemetry. This is the structural difference between DR for an AI application and DR for anything else you have operated." },

    { t: "code", lang: "python", title: "Three answers, and the honest cost of each",
      code: `# 1. MULTI-PROVIDER. Keep a second provider behind the same interface, and
#    fail over on repeated errors or a latency ceiling.
PROVIDERS = [primary, secondary]

async def complete(messages, **kw):
    for n, p in enumerate(PROVIDERS):
        try:
            return await p.complete(messages, **kw)
        except (ProviderError, TimeoutError):
            log.warning("provider %s failed, falling through", p.name)
            if n == len(PROVIDERS) - 1:
                raise
# The code is easy. What it costs is below.

# 2. DEGRADED MODE. Stay up with less.
#    - serve from the response cache, and say the answer may be stale
#    - return the retrieved passages WITHOUT a generated summary: a RAG system
#      degrades to search, which is still useful and needs no provider
#    - queue the request and answer it later, if the use case tolerates that

# 3. QUEUE AND WAIT. For batch and asynchronous work, a provider outage is a
#    delay rather than an incident -- provided the queue is durable and the
#    deadline is longer than the outage.

# WHAT THE FAILOVER ACTUALLY COSTS, and it is not the code:
#   the prompts were tuned against the primary model. Few-shot examples,
#   output format instructions and refusal behaviour are all model-specific.
#   The secondary returns DIFFERENT answers -- not worse in an obvious way,
#   different -- and a structured-output contract that held on one model
#   can fail on the other.`,
      caption: "**A fallback model is not a hot standby, it is a different system behind the same interface.** The only way to know what failing over does to your output is to run the evaluation suite against the secondary, on purpose, before the incident — and to keep running it, because both models change under you." },

    { t: "callout", kind: "trap", title: "The fallback nobody has ever exercised", body: [
      { t: "p", text: "A secondary provider configured and never used is not a fallback. The credential expires, the model id is deprecated, the structured-output schema is rejected by the other provider's stricter validator, the rate limit on the unused account is the free tier — and all of this is discovered during the incident, by the person least able to fix it." },
      { t: "p", text: "**Send a small, continuous share of real traffic to the secondary** — one per cent is enough. It keeps the credential alive, keeps the schema honest, and turns the failover from a plan into a thing that is already happening." }
    ]},

    { t: "h2", n: "05", text: "Agentic state, and the side effects already performed", id: "agentic" },

    {"kind": "trace", "title": "The checkpointer restores the graph; it does not un-send the email", "caption": "**The run died between the side effect and the checkpoint, which is the one ordering that makes resumption dangerous.** The graph is restored correctly to a node that has already acted, so the resume charges the card a second time — no error, no warning, and the state machine behaving exactly as designed. **The fix is a key derived from the run id, not from the attempt:** a fresh key per retry is indistinguishable from a new request and defeats the whole mechanism. For anything the provider cannot deduplicate, a ledger write around the action is what lets recovery ask whether it already happened.", "left": "step", "codeW": 180, "vars": ["world", "checkpoint", "on resume"], "steps": [{"code": "node: charge_card", "state": ["money moved", "not yet written", "-"], "tone": "warn"}, {"code": "process dies here", "state": ["money moved", "LAST checkpoint is older", "-"], "changed": [1], "tone": "crit"}, {"code": "resume from the checkpoint", "state": ["charged TWICE", "correct", "the node runs again"], "changed": [0, 2], "tone": "crit"}, {"code": "with a run-scoped key", "state": ["charged once", "correct", "provider dedupes it"], "changed": [0, 2], "tone": "good"}, {"code": "with a fresh key per attempt", "state": ["charged twice", "correct", "a new key is a new request"], "changed": [0, 2], "tone": "crit"}, {"code": "no provider dedupe available", "state": ["charged once", "correct", "ledger write, checked first"], "changed": [0, 2], "tone": "violet"}], "t": "diagram", "id": "dg-15_10-05-4"},

    { t: "p", text: "A checkpointer makes an agent run resumable, which sounds like it solves recovery. **It restores the graph to a node. It does not un-send the email the previous node sent.** For anything that acts on the world, recovery is not resumption — it is resumption without repetition, and that needs a record of what was already done." },

    { t: "code", lang: "python", title: "Resuming without repeating",
      code: `# THE FAILURE: a run that crashed between the side effect and the checkpoint.
#
#   node: charge_card        -> succeeded, money moved
#   node: record_order       -> process died here
#   checkpoint written?      -> NO
#
# Resume from the last checkpoint and charge_card runs again. The graph is
# correct, the customer is charged twice, and no error was raised anywhere.

# THE FIX IS AN IDEMPOTENCY KEY DERIVED FROM THE RUN, not a random one:
def charge(state: State) -> dict:
    key = f"{state['run_id']}:charge"          # stable across retries
    receipt = payments.charge(
        amount=state["total"],
        idempotency_key=key,                   # the provider dedupes
    )
    return {"receipt_id": receipt.id}

# AND A LEDGER YOU WRITE BEFORE ACTING, so recovery can ask "did this happen?"
def send_notice(state: State) -> dict:
    key = f"{state['run_id']}:notice"
    if ledger.seen(key):                        # already sent, before the crash
        return {}
    email.send(state["address"], render(state))
    ledger.record(key)                          # a separate durable write
    return {}

# THE ORDERING MATTERS AND IS UNCOMFORTABLE: record-then-act can record
# something that never happened; act-then-record can act twice. Pick by which
# is worse -- for an email, a missing record is better than a second email;
# for a charge, use the provider's idempotency key and avoid the choice.`,
      caption: "**An idempotency key derived from the run id is stable across every retry of that run, which is exactly what makes the retry safe.** A random key generated per attempt defeats the entire mechanism — it is the most common way this is implemented wrongly." },

    { t: "p", text: "**The second agentic question is what to do with runs that were in flight.** A conversation interrupted mid-answer can be abandoned; a multi-step workflow that has charged a card cannot. The distinction belongs in the plan rather than in the moment, because the moment is when somebody is deciding under pressure whether to replay the queue." },

    { t: "table",
      head: ["In-flight work", "On recovery", "Why"],
      rows: [
        ["An interactive chat turn", "**Drop it**", "The user has already retried or left. Replaying produces an answer to a question nobody is waiting for"],
        ["A read-only workflow — retrieve, summarise, score", "**Replay freely**", "No side effects, so repetition costs money and nothing else"],
        ["A workflow with external side effects", "**Replay only with idempotency keys**", "Otherwise recovery performs the action a second time"],
        ["A run paused for human approval", "**Must survive**", "The state is the request. Losing it loses an approval somebody already gave, or will give tomorrow"],
        ["A scheduled batch job", "Re-run from its own checkpoint", "It has no user; lateness is the only cost (15.9)"]
      ],
      caption: "**The fourth row is the one that sets the RPO for the checkpointer database.** A system with human-in-the-loop approvals holds state that may be days old and is not reconstructible from anything — which makes that database closer to a system of record than to a cache, however temporary its contents look." },

    { t: "h2", n: "06", text: "The restore test, and the failure only evaluation catches", id: "testing" },

    { t: "p", text: "A restore procedure that has never been run does not work. That is true of every system, and for ML systems there is an extra reason to rehearse: **a restored ML system can be fully operational and quietly worse, with nothing in any log to say so.**" },

    { t: "code", lang: "python", title: "A game day that asserts on quality, not just on liveness",
      code: `# THE STANDARD DRILL: restore into a scratch environment, check it answers.
#   health check 200          OK
#   a query returns passages  OK
#   latency within budget     OK
#   declare success           <- and this is where it goes wrong

# WHAT THE DRILL MUST ALSO DO, and only an eval suite can:
baseline = json.load(open("evals/baseline_scores.json"))    # from before
restored = run_eval_suite(restored_endpoint, goldens)

for metric, floor in [("retrieval_recall@5", 0.92),
                      ("answer_faithfulness", 0.95),
                      ("exact_match", 0.88)]:
    drop = baseline[metric] - restored[metric]
    assert restored[metric] >= floor, f"{metric} below floor: {restored[metric]}"
    assert drop < 0.02, f"{metric} regressed {drop:.3f} against baseline"

# WHAT THIS CATCHES THAT A HEALTH CHECK CANNOT:
#   the index was rebuilt with a different embedding model version, so queries
#     and documents are in slightly different spaces -- recall falls, nothing
#     errors, and every response still looks plausible
#   a chunking parameter changed between the original build and the rebuild
#   the restored model artifact is an older version that still loads
#   the prompt registry restored to a previous revision
#
# ALL FOUR RETURN 200. All four are a silent quality regression, and the
# evaluation suite is the only instrument that reads them.`,
      caption: "**Every one of those four failures passes a health check.** This is the specific reason the evaluation sets belong in the asset inventory: without them a restore can be verified only for liveness, and liveness is not the property that was lost." },

    { t: "callout", kind: "production", title: "What to rehearse, and how often", body: [
      { t: "p", text: "**Quarterly, in a scratch environment, timed:** restore the model artifact from object storage, restore the vector index from its snapshot, restore the checkpointer database, point a copy of the application at all three, and run the evaluation suite. Record the wall-clock time for each step, because that total is your real RTO and it drifts upward as the corpus grows." },
      { t: "p", text: "**Annually, or after any significant change:** the full rebuild path — re-embed the corpus from source documents, rebuild the index, and compare the evaluation scores against the snapshot-restored system. This is the drill that finds the deprecated embedding model and the source corpus nobody kept a copy of." },
      { t: "p", text: "**And write down the numbers each time.** A DR plan with a stated four-hour RTO and no dated measurement behind it is a document, not a capability." }
    ]},

    { t: "ladder",
      title: "The recovery plan for a RAG service",
      rungs: [
        { level: "bad", label: "One RTO, one RPO, no measurement",
          why: "**It states a four-hour RTO for a system whose index takes six hours to rebuild**, so the plan is arithmetically impossible and nobody has noticed. The source documents are not mentioned, which means the only irreplaceable asset is the one with no owner.",
          code: `# DR plan, v1
# RTO: 4 hours
# RPO: 15 minutes
# Procedure: restore from backup, redeploy, verify the health check.` },
        { level: "ok", label: "Per-asset numbers, and snapshots of the derived assets",
          why: "**Now the numbers are per asset and the index is snapshotted**, so the RTO is the restore time rather than the rebuild time. What is still missing is any check that the restored system is as good as the one that was lost — verification stops at liveness.",
          code: `# DR plan, v2
# code          RTO 10m   RPO 0       git + registry
# model         RTO 15m   RPO 0       object storage, versioned, immutable
# vector index  RTO 20m   RPO 24h     nightly snapshot; rebuild path 6.1h (measured 2026-07)
# documents     RTO --    RPO 0       source of truth: Confluence export, retained 90d
# prompts       RTO 10m   RPO 0       in git
# checkpointer  RTO 30m   RPO 5m      managed Postgres, PITR
# Procedure: restore each, redeploy, verify the health check.` },
        { level: "best", label: "Verified by evaluation, with the provider and the in-flight work decided in advance",
          why: "**Verification is now a quality assertion rather than a liveness check**, the provider outage has a planned degraded mode rather than an error page, and what happens to in-flight runs was decided before the incident instead of during it.",
          code: `# DR plan, v3 -- additions to v2
# evals         RTO 10m   RPO 0       goldens + baseline scores in git
#
# VERIFY:  run evals/suite.py against the restored endpoint.
#          recall@5 >= 0.92, faithfulness >= 0.95, and no metric more than
#          0.02 below the dated baseline. Liveness is not sufficient.
#
# PROVIDER OUTAGE: degrade to retrieval-only (passages, no generated answer)
#          and show a banner. Secondary provider takes 1% of traffic
#          continuously; eval scores for it are in evals/secondary.json.
#
# IN FLIGHT: chat turns dropped. Workflows replayed only where every
#          side-effecting node has a run-scoped idempotency key. Approval-
#          pending runs are never dropped -- that database is PITR, 5m.
#
# REHEARSED: 2026-07-14, restore 51m end to end, evals passed.` }
      ] },

    { t: "h2", n: "07", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Write a recovery plan that survives its own drill",
      difficulty: "expert",
      minutes: 40,
      body: [
        { t: "p", text: "You have inherited an internal RAG assistant with an agentic workflow attached. It answers policy questions from a document corpus, and it can also file a ticket and email a manager on the user's behalf. The DR plan is the four lines below. Rewrite it." },
        { t: "code", lang: "text", numbered: false, title: "dr-plan.md — as inherited", code: `
RTO: 4 hours
RPO: 1 hour
Backups: nightly snapshot of the vector database
Procedure: restore the snapshot, redeploy from main, confirm the service is up.
` },
        { t: "p", text: "Facts you have gathered: the corpus is 2.4 million chunks and was built from a Confluence space; the embedding provider is the same one that serves generation; conversations and approvals live in a managed Postgres with point-in-time recovery; there is an evaluation suite with 180 goldens but no recorded baseline; the ticket-filing node calls an internal API that has no idempotency support." }
      ],
      requirements: [
        "An asset inventory with a per-asset RTO and RPO, and a stated source of truth for each",
        "A measured or explicitly estimated rebuild time for the index, with the arithmetic shown",
        "A decision for in-flight work of each kind, including the ticket-filing node",
        "A verification step that would fail if the restored index were subtly wrong",
        "One thing you would change about the application itself to make recovery possible"
      ],
      hint: "The ticket API having no idempotency support is not a detail — it decides whether that workflow may be replayed at all, and the fix is yours to build rather than theirs.",
      solution: {
        lang: "text",
        title: "Solution",
        code: `ASSET INVENTORY

  code            RTO 10m  RPO 0     git + image registry
  prompts         RTO 10m  RPO 0     in git, versioned with the code
  vector index    RTO 25m  RPO 24h   nightly snapshot (restore), rebuild 1.5h
  documents       RTO n/a  RPO 0     SOURCE OF TRUTH = Confluence space.
                                     NOT ours. Confirm retention with that
                                     team and take our own weekly export.
  conversations   RTO 30m  RPO 5m    managed Postgres, PITR
  approvals       RTO 30m  RPO 5m    same database -- see in-flight, below
  evals + baseline RTO 10m RPO 0     goldens in git; BASELINE IS MISSING,
                                     record it this week

REBUILD ARITHMETIC

  2.4M chunks at 12 ms/chunk, 8 concurrent  ->  645 chunks/s  ->  1.03 h
  HNSW build at this size                   ->  ~0.4 h
  total rebuild                              ->  ~1.5 h

  So rebuild is a viable second path here, unlike a 10M-chunk corpus. Keep
  the snapshot as the primary path (25 minutes) and the rebuild as the
  answer to a corrupt snapshot or a bad write.

  NOTE THE SHARED PROVIDER: the embedding provider also serves generation,
  so a provider outage takes out generation AND the rebuild path at once.
  That is a single point of failure the plan must name.

IN-FLIGHT WORK

  chat turns            drop. The user has retried or left.
  policy answers        read-only; replay freely.
  email a manager       replay with a run-scoped key and a ledger write.
  FILE A TICKET         DO NOT REPLAY. The internal API has no idempotency
                        support, so a replay files a duplicate ticket.
                        Until that is fixed, recovery must leave these runs
                        in a dead-letter queue for human review.
  approval-pending      never drop. This is why the database is PITR and not
                        a nightly snapshot -- an approval may be two days old
                        and is reconstructible from nothing.

VERIFICATION

  Run the 180 goldens against the restored endpoint and compare with the
  recorded baseline: recall@5, faithfulness, exact match. Fail the drill if
  any metric is more than 0.02 below baseline. A health check would pass on
  an index rebuilt with the wrong embedding model version; this would not.

THE APPLICATION CHANGE

  Put an idempotency layer in front of the ticket API -- a table keyed on
  (run_id, node) written before the call, checked before the call. It does
  not need the vendor's cooperation, it converts the one unreplayable
  workflow into a replayable one, and it is the difference between a
  recovery that completes and one that ends in a queue of manual work.`,
        notes: [
          { t: "p", text: "**The shared-provider observation is the part that distinguishes a real plan.** When the embedding provider and the generation provider are the same vendor, the rebuild path and the serving path fail together — so the snapshot is not a convenience, it is the only path that survives that outage." },
          { t: "p", text: "**And the missing baseline is an urgent, cheap fix.** An evaluation suite with no recorded scores cannot verify a restore; it can only confirm the system answers. Recording a dated baseline costs one run and converts the suite into an instrument." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team lost a vector store to an accidental index deletion during a migration. They had nightly snapshots and restored one within the hour, well inside their stated RTO, and closed the incident." },
      { t: "p", text: "**Three weeks later, answer quality complaints led to the discovery that the restored index had been built by the previous pipeline version, with 400-token chunks rather than 800.** Retrieval recall had fallen by roughly nine points. Nothing had errored, no dashboard had moved, and the restore had been verified with a health check and a single spot-checked query." },
      { t: "p", text: "**The snapshot was fine. The verification was the failure.** A restore is a deployment of an artefact built by an older pipeline, and it deserves the same quality gate as any other deployment." },
      { t: "p", text: "**The fix was two lines in the runbook:** record the pipeline version and chunking parameters in the snapshot metadata, and run the evaluation suite as the final step of every restore rather than a health check." }
    ]}
  ],

  takeaways: [
    "**State an RTO and an RPO per asset, not per system.** One pair hides that the code restores in ten minutes and the index may not restore for six hours.",
    "**For a derived asset, rebuild time is your RTO** — and almost nobody has measured it. Measure once, on real data, and date the number.",
    "**Snapshot the derived assets anyway, and keep the rebuild path working.** The snapshot gives you the fast path; the rebuild is the answer to a corrupt snapshot or a bad write.",
    "**The source documents are the real single point of failure in a RAG system.** An index is only derivable while the corpus exists somewhere else, and that somewhere is often another team's retention policy.",
    "**A deprecated embedding model freezes an index rather than breaking it** — queries land in a different space, recall falls, and nothing errors.",
    "**You cannot fail over the model provider.** Plan a degraded mode — retrieval without generation is still useful — before you plan a second provider.",
    "**A fallback model is a different system behind the same interface.** Prompts, formats and refusal behaviour are model-specific, so run the evaluation suite against the secondary before the incident.",
    "**A fallback that takes no traffic is not a fallback.** One per cent continuously keeps the credential, the schema and the quota honest.",
    "**A checkpointer restores the graph, not the world.** Resuming re-runs a node whose side effect already happened unless there is a run-scoped idempotency key.",
    "**Derive idempotency keys from the run id**, never per attempt — a fresh key on each retry defeats the entire mechanism.",
    "**Decide the fate of in-flight work in advance**, by kind: drop chat turns, replay read-only work, replay side-effecting work only with keys, and never drop a run that is waiting for an approval.",
    "**Evaluation sets and a dated baseline belong in the asset inventory.** Without them a restore can be verified only for liveness, which is not the property at risk.",
    "**Every silent restore failure returns 200** — wrong embedding version, changed chunking, older model artifact, stale prompt revision. Only an eval suite reads them.",
    "**Rehearse quarterly and time each step.** An RTO with no dated measurement behind it is a document rather than a capability."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your vector index is derived from documents you still have. What is its RTO?",
        options: [
          "Zero — derived assets do not need recovery planning",
          "The restore time of your snapshot, if you keep one; otherwise the measured rebuild time, which is usually hours",
          "The same as the application code, since both are redeployed together",
          "Determined by the vector store vendor's SLA"
        ],
        answer: 1,
        why: "\"Derived\" says it is *recoverable*, not that it is recoverable quickly. Re-embedding and re-indexing a mid-sized corpus measured 6.1 hours against 11 minutes to restore a snapshot — which is why the snapshot exists even for an asset you could rebuild."
      },
      {
        stem: "A restored RAG system passes its health check, returns passages and meets its latency budget. What has not been verified?",
        options: [
          "Nothing — those three checks are sufficient",
          "That the index was built by the same pipeline version, with the same embedding model and chunking, so retrieval quality is unchanged",
          "That the load balancer is healthy",
          "That the container image matches the git tag"
        ],
        answer: 1,
        why: "All four silent failure modes — wrong embedding model version, changed chunking, an older model artifact, a stale prompt revision — return 200 and plausible answers. A restore is a deployment of an artefact built by an older pipeline, and the evaluation suite is the only instrument that reads the difference."
      },
      {
        stem: "An agent run crashed after charging a card but before its checkpoint was written. You resume from the last checkpoint. What happens?",
        options: [
          "The checkpointer detects the completed side effect and skips the node",
          "The charge node runs again and the customer is charged twice, with no error raised",
          "The run fails to resume because the state is inconsistent",
          "The payment provider automatically deduplicates identical charges"
        ],
        answer: 1,
        why: "A checkpointer restores the graph to a node; it has no knowledge of what the node did to the outside world. The fix is an idempotency key derived from the run id — stable across retries — plus a ledger written around any action the provider cannot deduplicate."
      },
      {
        stem: "Your embedding provider announces the retirement of the model your index was built with. What is the effect?",
        options: [
          "The index is corrupted and must be restored from a snapshot",
          "Nothing, until you rebuild — the stored vectors are unaffected",
          "The index still answers, but new queries are embedded by a different model into a different space, so recall silently degrades",
          "The vector store rejects queries until the index is rebuilt"
        ],
        answer: 2,
        why: "The stored vectors are fine and the queries are not: a query embedded by the replacement model is being compared against documents embedded by the old one. Nothing errors, every answer still looks plausible, and the only path back is a full rebuild — which is why the rebuild path has to stay working."
      },
      {
        stem: "Which in-flight work must never be dropped during recovery?",
        options: [
          "Interactive chat turns, because a user is waiting",
          "Read-only retrieval and summarisation workflows",
          "Runs paused awaiting human approval, because the state is the request and is reconstructible from nothing",
          "Scheduled batch jobs, because they have a deadline"
        ],
        answer: 2,
        why: "A chat turn has already been retried or abandoned; read-only work can be replayed freely; a batch job re-runs from its own checkpoint. An approval-pending run holds a request that may be days old and exists nowhere else — which is what makes the checkpointer database a system of record rather than a cache."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "How would you write a disaster-recovery plan for a RAG system?",
        strong: "Per-asset RTO and RPO rather than one pair, because the code restores in minutes and the index may take hours. Measure the rebuild time and date it; snapshot the index anyway, because rebuild time is otherwise the RTO, and keep the rebuild path working for a corrupt snapshot or a deprecated embedding model. Name the source documents as the only truly irreplaceable asset and confirm who owns their retention. Verify with the evaluation suite against a dated baseline, not a health check — a wrong embedding version returns 200. And rehearse quarterly with each step timed.",
        answer: [
          { t: "p", text: "Per-asset numbers are the opening move, and the detail that separates a plan from a template." },
          { t: "p", text: "Measuring the rebuild is the specific that shows this has been operated — the number is usually hours and nobody has it." },
          { t: "p", text: "Naming the source corpus as the single point of failure is the observation interviewers are listening for, because it is the one asset that is not derived from anything." },
          { t: "p", text: "Eval-based verification is the strongest point available here: every silent restore failure passes a health check." }
        ]
      },
      {
        level: "advanced",
        q: "Your model provider has a region-wide outage. What does your system do?",
        strong: "Degrade rather than fail: a RAG system falls back to retrieval only, returning passages without a generated summary and saying so. Asynchronous and batch work queues and waits, since the deadline is longer than the outage. A second provider is useful but is not a hot standby — the prompts, output formats and refusal behaviour are model-specific, so I would have evaluation scores for the secondary recorded in advance and send it one per cent of traffic continuously so the credential and schema stay honest.",
        answer: [
          { t: "p", text: "Leading with degraded mode rather than multi-provider is the right order, and the retrieval-only fallback is the concrete example that shows it." },
          { t: "p", text: "Saying a fallback model is a different system, not a replica, is the substance — and having evals for it is what makes the claim credible." },
          { t: "p", text: "The one-per-cent continuous traffic is a strong specific: it is the difference between a configured fallback and an exercised one." }
        ]
      },
      {
        level: "advanced",
        q: "How do you recover an agent run that was interrupted part-way through?",
        strong: "It depends entirely on whether the completed nodes had side effects. A checkpointer restores the graph to a node and knows nothing about what that node did to the world, so resuming re-charges the card. Side-effecting nodes need an idempotency key derived from the run id — stable across retries — and a ledger written around anything the provider cannot deduplicate. Then classify in-flight work in advance: drop chat turns, replay read-only work, replay side-effecting work only where keys exist, and never drop a run awaiting approval.",
        answer: [
          { t: "p", text: "The checkpointer-restores-the-graph-not-the-world framing is the whole answer in one sentence." },
          { t: "p", text: "Deriving the key from the run id rather than per attempt is the implementation detail that is most often wrong." },
          { t: "p", text: "Classifying in-flight work by kind, in advance, shows you have been the person deciding whether to replay a queue during an incident." }
        ]
      }
    ]
  }
});
