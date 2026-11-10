/* ============================================================================
   LESSON 19.2 — Prompts and Indexes Are Deployables
   ========================================================================= */
EC.receiveLesson({
  id: "19.2",

  lede: "In an LLM application, two things that look like configuration decide most of the behaviour. The prompt, often a string in the source code edited by whoever is fixing the latest complaint. And the retrieval index, rebuilt by a job someone set up once and nobody monitors. Both deserve what models get: a version, an owner, tests that must pass before release, and a way back. This lesson builds a small prompt registry whose tests block a well-meant but harmful edit, shows an index serving a policy that has changed, measures its staleness, and rebuilds it incrementally.",

  objectives: [
    "Treat a prompt as a versioned artefact with an owner, tests and a rollback pointer",
    "Write prompt tests: required variables, token budget, required instructions, no embedded personal data",
    "Detect index staleness by comparing source document hashes with the index's",
    "Rebuild an index incrementally and prove it matches a full rebuild",
    "Release prompt, index and model snapshot as one tested combination"
  ],

  prerequisites: ["19.1", "15.1"],

  blocks: [
    { t: "h2", n: "01", id: "prompt", text: "A prompt is a deployable", sub: "Version, owner, tests, pointer" },
    { t: "p",
      text: "The registry identifies each prompt version by the hash of its text and records its owner. A version may become production only if its tests pass. The tests render the template with a realistic, full-length context and check what the application depends on: the variables it fills, the token budget measured with a real tokenizer, the instruction to admit not knowing, and the absence of personal data in the template itself." },
    { t: "code",
      lang: "python",
      title: "promptidx.py — a prompt registry and a stale index",
      code: `import hashlib, re, string
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer

print("== 1. a prompt is a versioned artefact with tests ==")
tok = AutoTokenizer.from_pretrained("gpt2")                       # stands in for the serving model's tokenizer
registry, pointer = {}, {}
def register(name, template, owner):
    vid = hashlib.sha256(template.encode()).hexdigest()[:10]; registry[vid] = {"name": name, "template": template, "owner": owner}; return vid
def tests(template):
    fields = {f for _, f, _, _ in string.Formatter().parse(template) if f}
    full_context = " ".join(["refund delivery account"] * 70)                 # about 210 tokens of retrieved text
    rendered = template.format(**{f: full_context if f == "context" else "sample" for f in fields})
    return {"declares {question} and {context}": {"question", "context"} <= fields,
            "fits a 300-token budget with a full context": len(tok(rendered).input_ids) <= 300,
            "keeps the 'say you don't know' instruction": "don't know" in template,
            "contains no raw email address": not re.search(r"[\\w.]+@[\\w.]+", template)}
v1 = register("support-answer", "Answer the customer's question using only the context. If the context does not contain the answer, "
              "say you don't know.\\nContext: {context}\\nQuestion: {question}\\nAnswer:", "support-ml")
v2 = register("support-answer", "You are a friendly, upbeat assistant for ACME. Always be helpful and give a complete answer. "
              "Escalations go to help@acme.example.\\n" + "Examples of great answers: ... " * 25 + "\\nContext: {context}\\nQuestion: {question}\\nAnswer:", "support-ml")
for vid in (v1, v2):
    r = tests(registry[vid]["template"]); ok = all(r.values())
    print(f"  prompt {vid}: {'PASS' if ok else 'FAIL'}" + "".join(f"\\n     {'ok  ' if v else 'FAIL'} {k}" for k, v in r.items()))
pointer["support-answer"] = v1 if not all(tests(registry[v2]["template"]).values()) else v2
print(f"  production pointer stays at {pointer['support-answer']}: rollback is moving a pointer, not editing a string in code")

print("\\n== 2. the index is a deployable too: staleness ==")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
docs = {f"policy-{i:03d}": f"Policy note {i}: general information about accounts, delivery and support hours, item {i}." for i in range(200)}
docs["policy-042"] = "Returns: you can return any item within 30 days of delivery for a full refund."
def build(docs):
    ids = sorted(docs); emb = model.encode([docs[i] for i in ids], normalize_embeddings=True)
    return {"ids": ids, "emb": emb, "text": [docs[i] for i in ids], "hash": {i: hashlib.sha256(docs[i].encode()).hexdigest() for i in ids}}
index = build(docs)
docs["policy-042"] = "Returns: from 1 June you can return items within 14 days of delivery for a full refund."     # policy changed
for i in range(100, 130): docs[f"policy-{i:03d}"] += " Updated."                                                     # routine edits
q = model.encode(["How many days do I have to return something?"], normalize_embeddings=True)
best = index["ids"][int(np.argmax(index["emb"] @ q[0]))]
print(f"  retrieved from the old index: {best}: '{index['text'][index['ids'].index(best)]}'")
stale = [i for i in docs if index["hash"].get(i) != hashlib.sha256(docs[i].encode()).hexdigest()]
print(f"  staleness monitor: {len(stale)} of {len(docs)} documents changed since the index was built ({len(stale) / len(docs):.1%})")
index = build(docs); best = index["ids"][int(np.argmax(index["emb"] @ q[0]))]
print(f"  after rebuild: {best}: '{index['text'][index['ids'].index(best)]}'")`,
      out: `== 1. a prompt is a versioned artefact with tests ==
  prompt bd946e198e: PASS
     ok   declares {question} and {context}
     ok   fits a 300-token budget with a full context
     ok   keeps the 'say you don't know' instruction
     ok   contains no raw email address
  prompt c26ec246d3: FAIL
     ok   declares {question} and {context}
     FAIL fits a 300-token budget with a full context
     FAIL keeps the 'say you don't know' instruction
     FAIL contains no raw email address
  production pointer stays at bd946e198e: rollback is moving a pointer, not editing a string in code

== 2. the index is a deployable too: staleness ==
  retrieved from the old index: policy-042: 'Returns: you can return any item within 30 days of delivery for a full refund.'
  staleness monitor: 31 of 200 documents changed since the index was built (15.5%)
  after rebuild: policy-042: 'Returns: from 1 June you can return items within 14 days of delivery for a full refund.'` },
    { t: "dl",
      items: [
        { term: "The friendly rewrite failed three tests",
          def: "Version c26ec246d3 added a persona, 25 example lines and an escalation address. It exceeded the 300-token budget once a full context was inserted, dropped the instruction to say 'I don't know' (the main defence against invented answers), and embedded an email address." },
        { term: "Rollback is a pointer",
          def: "Production stayed on bd946e198e. Moving back after a bad release is changing which version the pointer names, not finding and editing a string in the code." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Testing a prompt only with short inputs",
      body: [
        { t: "p",
          text: "A template that fits the budget with a one-line context can overflow it with a real retrieved context, truncating the question or the instructions at the end. Render prompts with the largest context the retriever can return, and count tokens with the serving model's tokenizer." }
      ] },
    { t: "h2", n: "02", id: "index", text: "The index is a deployable too", sub: "And it goes stale silently" },
    { t: "p",
      text: "The second part builds an embedding index over 200 policy documents, then changes the returns policy from 30 days to 14 and edits 30 other documents. The question 'how many days do I have to return something?' is answered from the old index; a monitor compares each source document's hash with the hash recorded when the index was built." },
    { t: "dl",
      items: [
        { term: "The stale index answered confidently and wrongly",
          def: "It retrieved the 30-day policy, which no longer existed. An LLM given that context would state it as fact." },
        { term: "Staleness is measurable",
          def: "31 of 200 documents (15.5%) had changed since the build. Export that share and the age of the oldest unindexed change as metrics, with an alert when either crosses a threshold." },
        { term: "Rebuilding fixed it",
          def: "After the rebuild the 14-day policy was retrieved. The fix is a pipeline, not a person remembering." }
      ] },
    { t: "viz",
      title: "A release is a combination",
      caption: "Prompt version, index version and model snapshot each change behaviour, so they are evaluated and released together and recorded together in every trace.",
      svg: `<svg viewBox="0 0 760 245" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="210.0" y1="55.8" x2="430.0" y2="99.3" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="210.0" y1="121.0" x2="430.0" y2="121.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="210.0" y1="186.2" x2="430.0" y2="142.7" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="10" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="110.0" y="32" text-anchor="middle" class="s-label" style="fill:var(--accent)">Prompt version</text>
<text x="110.0" y="50" text-anchor="middle" class="s-sub">hash, owner, tests</text>
<rect x="10" y="95" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="110.0" y="117" text-anchor="middle" class="s-label" style="fill:var(--violet)">Model snapshot</text>
<text x="110.0" y="135" text-anchor="middle" class="s-sub">pinned (19.1)</text>
<rect x="10" y="180" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="110.0" y="202" text-anchor="middle" class="s-label" style="fill:var(--good)">Index version</text>
<text x="110.0" y="220" text-anchor="middle" class="s-sub">doc hashes, build time</text>
<rect x="430" y="95" width="220" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="540.0" y="117" text-anchor="middle" class="s-label" style="fill:var(--warn)">Release</text>
<text x="540.0" y="135" text-anchor="middle" class="s-sub">one tested combination</text>
</svg>` },
    { t: "exercise",
      kind: "Challenge",
      title: "Incremental reindexing, proved equal",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Build an embedding index over 2,000 documents, recording each document's content hash. Then edit 80 documents, add one and delete one, and write an incremental update that re-embeds only documents whose hash changed. Time it against a full build and prove the result is identical to a full rebuild." }
      ],
      requirements: [
        "Content hashes stored with the index",
        "Re-embedding only changed and new documents; dropping deleted ones",
        "Timing of full and incremental builds",
        "An equality check against a full rebuild"
      ],
      hint: "Keep the old embeddings in a dict keyed by document ID, overwrite the changed ones, then rebuild the arrays in sorted ID order.",
      solution: { lang: "python",
        title: "incremental_index.py",
        code: `import hashlib, time
import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
h = lambda text: hashlib.sha256(text.encode()).hexdigest()
docs = {f"doc-{i:04d}": f"Knowledge base article {i}: how to manage orders, refunds and accounts, section {i % 37}." for i in range(2_000)}

def full_build(docs):
    ids = sorted(docs); return {"ids": ids, "emb": model.encode([docs[i] for i in ids], normalize_embeddings=True, batch_size=64),
                                "hash": {i: h(docs[i]) for i in ids}}

def incremental(index, docs):
    """Re-embed only documents whose content hash changed, add new ones, drop deleted ones."""
    old = dict(zip(index["ids"], index["emb"]))
    changed = [i for i in docs if index["hash"].get(i) != h(docs[i])]
    if changed:
        for i, e in zip(changed, model.encode([docs[i] for i in changed], normalize_embeddings=True, batch_size=64)): old[i] = e
    ids = sorted(docs)
    return {"ids": ids, "emb": np.array([old[i] for i in ids]), "hash": {i: h(docs[i]) for i in ids}}, len(changed)

t = time.perf_counter(); index = full_build(docs); t_full = time.perf_counter() - t
for i in range(0, 2_000, 25): docs[f"doc-{i:04d}"] += " Updated for the new returns policy."     # 80 edits
docs["doc-2000"] = "Knowledge base article 2000: returns are accepted within 14 days."              # 1 new
del docs["doc-0007"]                                                                                 # 1 deleted
t = time.perf_counter(); inc, n_changed = incremental(index, docs); t_inc = time.perf_counter() - t
ref = full_build(docs)
print(f"full build: {len(docs):,} embeddings in {t_full:.1f} s")
print(f"incremental: {n_changed} embeddings in {t_inc:.1f} s ({n_changed / len(docs):.1%} of the corpus)")
print(f"identical to a full rebuild: ids {inc['ids'] == ref['ids']}, max embedding difference {np.abs(inc['emb'] - ref['emb']).max():.1e}")`,
        out: `full build: 2,000 embeddings in 5.5 s
incremental: 81 embeddings in 0.3 s (4.0% of the corpus)
identical to a full rebuild: ids True, max embedding difference 0.0e+00`,
        notes: [
          { t: "p",
            text: "The incremental update embedded 81 documents (4.0% of the corpus) in 0.3 s against 5.5 s for a full build, and the result was identical to a full rebuild, IDs and embeddings to the last bit." },
          { t: "p",
            text: "Cheap updates make frequent ones possible, which is what keeps staleness low. Two cautions: a change of embedding model invalidates every vector, so the model version belongs in the index's identity and forces a full rebuild; and the equality check should run periodically, since incremental code is where subtle bugs hide." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the assistant that quoted last year's policy",
      body: [
        { t: "p",
          text: "**Symptom.** A support assistant told customers they could return items within 30 days, three weeks after the policy changed to 14. Agents had to honour the wrong policy for hundreds of customers." },
        { t: "p",
          text: "**Mechanism.** The index was rebuilt by a nightly job that had been failing silently since a credentials rotation. Nothing monitored the index's age or the share of documents changed since it was built, and the prompt told the model to answer confidently." },
        { t: "p",
          text: "**Fix.** Index builds became part of the release pipeline with alerts on failure, staleness (share of changed documents and age of the oldest unindexed change) became a dashboard metric, policy documents trigger a reindex on change, and the prompt test suite requires the 'say you don't know' instruction." }
      ] }
  ],

  takeaways: [
    "Prompts and indexes change behaviour as much as models do: **version, own, test and roll them back**.",
    "Prompt tests: required variables, **token budget with a full context**, required instructions, no embedded personal data.",
    "A well-meant rewrite failed **three** tests, including dropping the 'say you don't know' instruction.",
    "Rollback is moving a **pointer** to a known-good version.",
    "A stale index answered with a policy that no longer existed; **15.5%** of documents had changed since the build.",
    "Monitor staleness as the share of changed documents and the age of the oldest unindexed change.",
    "Incremental reindexing embedded **4%** of the corpus in **0.3 s** and matched a full rebuild exactly.",
    "Release **prompt, index and model snapshot** together, and record all three in every trace."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why render a prompt with a full-length context in its tests?",
        options: [
          "To make the tests run more slowly and thoroughly",
          "Long contexts can push it over the token budget",
          "Short contexts break the template's formatting",
          "The tokenizer refuses short inputs entirely"
        ],
        answer: 1,
        why: "A template that fits with a short context can overflow with a real one, truncating instructions or the question. Formatting and tokenizers are unaffected by length." },
      { stem: "How do you detect that a retrieval index is stale?",
        options: [
          "Ask the model whether all of its answers are current",
          "Compare source document hashes with those indexed",
          "Rebuild it whenever latency increases",
          "Check how large the index file is on disk"
        ],
        answer: 1,
        why: "Hashes recorded at build time against current sources give the share changed (15.5% here). The model cannot know, and latency or file size do not reveal content changes." },
      { stem: "What forces a full rebuild rather than an incremental update?",
        options: [
          "Any single edit to any one document",
          "A change of embedding model",
          "Adding more than one new document",
          "Running the update on a weekday"
        ],
        answer: 1,
        why: "Vectors from different embedding models are not comparable, so every document must be re-embedded. Edits, additions and deletions are exactly what incremental updates handle." },
      { stem: "What makes up a release of an LLM feature?",
        options: [
          "The application code alone, as for any service",
          "Prompt, index and model snapshot together",
          "Only the model snapshot that has been pinned",
          "Only the prompt and its structural test results"
        ],
        answer: 1,
        why: "All three change behaviour, so they are evaluated and released as a combination and recorded in traces. Any one alone leaves the others unaccounted for." }
    ] },

  interview: { title: "In an interview",
    sub: "Treat prompts and indexes with the discipline you give models.",
    questions: [
      { level: "core",
        q: "How do you manage prompts in production?",
        strong: "A strong answer covers versioning, ownership, tests, evaluation and rollback.",
        answer: [
          { t: "p",
            text: "Prompts live in a registry or versioned files, identified by content hash, with an owner and change history. Each change runs structural tests (variables, token budget with a full context, required instructions, no embedded personal data) and then the evaluation suite (19.3) before a pointer moves to it in production. Traces record the version used, and rollback moves the pointer back." }
        ] },
      { level: "advanced",
        q: "How do you keep a RAG index fresh and know when it is not?",
        strong: "A strong answer combines event-driven updates, incremental builds and staleness metrics.",
        answer: [
          { t: "p",
            text: "Reindex on change events from the source systems, incrementally by content hash, with periodic full rebuilds and an equality check. Record per-document hashes and the embedding model version with the index. Monitor the share of source documents changed since indexing and the age of the oldest unindexed change, and alert on build failures. Treat a change of embedding model as a new index version that goes through evaluation." }
        ] },
      { level: "core",
        q: "What would you test in a prompt before shipping it?",
        strong: "A strong answer separates cheap structural tests from behavioural evaluation.",
        answer: [
          { t: "p",
            text: "Structural tests first, because they are fast and deterministic: required variables are present, the rendered prompt fits the budget with the largest context, required instructions such as refusing when the context lacks the answer are kept, and no personal data is embedded. Then behavioural evaluation on a golden set, comparing against the current version case by case to catch regressions (19.3)." }
        ] }
    ] }
});
