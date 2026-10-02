EC.receiveLesson({
  id: "10.6",

  lede: "The schema below is what turns traces from a curiosity into a debugging tool, and anything missing from it is a question you will not be able to answer at 2 a.m. Three attributes earn their place above all others: **the exact model version**, **the prompt template hash**, and **the index version** \u2014 because without all three, \u201cnothing changed\u201d is unprovable. And one rule carries the rest: **log the inputs and outputs of every stage**, because if you keep only the question and the answer, a retrieval failure and a generation failure look identical.",

  objectives: [
    "List the attributes each span type must carry",
    "Name the three version pins that make \u201cnothing changed\u201d a checkable claim",
    "Explain why stage inputs and outputs must be logged, not just the final answer",
    "Audit an existing instrumentation against the schema",
    "Say which questions a trace cannot answer and which attribute each one needs"
  ],

  prerequisites: ["10.5"],

  blocks: [

    { t: "h2", n: "01", id: "schema", text: "The schema",
      sub: "Per span type" },

    { t: "table",
      head: ["Span", "Must carry", "Nice to have"],
      rows: [
        ["**root / request**", "`trace_id`, `session_id`, `user_id` (hashed), route, app version, prompt-template version", "tenant, region, client type"],
        ["**retrieve**", "query text, `top_k`, index name **and version**, number returned, number above threshold, chunk IDs, scores", "filters applied, embedding model, rewritten query"],
        ["**embed_query**", "model name and version, dimensions, input length", "cache hit or miss"],
        ["**rerank**", "model, candidates in, kept out, top score, score of the dropped best", "latency budget consumed"],
        ["**llm.generate**", "model **with the exact version pin**, temperature, max tokens, prompt tokens, completion tokens, finish reason, prompt template ID", "seed, `top_p`, cache hit, cost"],
        ["**tool / function call**", "tool name, arguments, result size, status, retry count", "schema version"],
        ["**guardrail**", "which checks ran, which fired, action taken (allow, redact, block)", "rule version"],
        ["**eval / judge**", "judge model, rubric version, score, the reasoning string", "human override"]
      ] },

    { t: "callout", kind: "insight", title: "\u201cScore of the dropped best\u201d is the subtle one on that list",
      body: [
        { t: "p", text: "On the rerank span, logging the top score of what you **kept** is obvious. Logging the score of the best candidate you **dropped** is not, and it is what distinguishes two situations that otherwise look identical: a reranker correctly discarding weak candidates, and a reranker throwing away the right answer." },
        { t: "p", text: "If the dropped best scored 0.81 while the kept top scored 0.79, your reranker inverted the order on that request. You cannot see that from the kept scores alone, and it is exactly the failure that 9.7\u2019s MRR analysis predicts \u2014 good recall with poor ranking." },
        { t: "p", text: "The same logic applies to `candidates_in` against `kept`: 20 in and 5 out is the configuration, and 20 in and 5 out where the gold chunk was number 6 is the bug. Which is why the chunk IDs matter as much as the counts." }
      ] },

    { t: "h2", n: "02", id: "three", text: "Three attributes earn their place above all others",
      sub: "Because they make \u201cnothing changed\u201d provable" },

    { t: "dl", items: [
      { k: "The exact model version", v: "`chat-large` is not a version. `chat-large-2026-03-11` is. When a provider rolls an alias forward, the only way to prove it is a version string in your traces from before and after \u2014 and 10.8 shows the cheaper detector: log the requested model and the responding model separately and alert when they differ." },
      { k: "The prompt template ID or hash", v: "Prompts change more often than code, and frequently outside version control \u2014 edited in a dashboard by someone who is not on the deploy rota. Hash the template and log the hash, and a prompt edit becomes a diff instead of a mystery." },
      { k: "The index version", v: "Every re-index is a deploy. Naming the index `support-docs-v4` rather than `support-docs` turns \u201cdid the index change?\u201d from a conversation into a query." }
    ] },

    { t: "callout", kind: "trap", title: "There are five unpinned things, not three",
      body: [
        { t: "p", text: "The three above are the ones that earn a place on every span. The full set that has to be pinned before \u2018nothing changed\u2019 means anything is five: the **model**, the **embedding model**, the **prompt template**, the **index**, and the **chunking config**." },
        { t: "p", text: "The embedding model is the one most often forgotten and the most destructive when it moves, because queries and stored vectors must live in the same space. Its signature is unmistakable once you know it \u2014 *every* similarity score falls at once, across all cohorts, on a specific date \u2014 and the only fix is re-embedding the whole corpus, never half." },
        { t: "p", text: "Chunking config is the quietest. A change to chunk size or overlap alters recall where answers span boundaries, and it leaves no trace at all unless the config version is stamped on the index. 6.3 covers what the change itself does; the point here is that it must be visible in a trace." }
      ] },

    { t: "h2", n: "03", id: "stages", text: "Log the inputs and outputs of every stage",
      sub: "The rule that saves incidents" },

    { t: "callout", kind: "good", title: "Keep only the question and the answer, and two different bugs become one symptom",
      body: [
        { t: "p", text: "A retrieval failure gives a wrong answer. A generation failure gives a wrong answer. With only the question and the answer stored, those are the same record \u2014 and the whole retrieval-versus-generation split that 10.13 depends on becomes unavailable." },
        { t: "p", text: "What makes them distinguishable is the intermediate state: which chunks came back, what they scored, what the assembled prompt actually contained. In the trace in 10.5 the answer was wrong because the context was wrong, and the only evidence was two integers on the retriever span." },
        { t: "p", text: "This is also why non-determinism matters here specifically. You cannot re-run the request to recover the chunks \u2014 the retrieval may well return something different now, and the index may have changed since. The intermediate state has to be captured at the time or it is gone." }
      ] },

    { t: "callout", kind: "warn", title: "And the chunk IDs are worth more than the chunk text",
      body: [
        { t: "p", text: "Chunk text is large, often contains the PII you are trying not to export, and you rarely need chunk five in full. Chunk **IDs** are tiny, carry no personal data, and answer the question that actually matters: *which* documents did the model see?" },
        { t: "p", text: "In the 10.13 incident the finding was \u2018every retrieved chunk ID comes from the old manual, and not one from the new product documentation appears at any rank\u2019. That is an ID-level observation. The text would have confirmed it and cost a hundred times more to store." },
        { t: "p", text: "So the sensible default from 10.10 follows directly: truncate chunk text to the first couple of kilobytes, keep the IDs and scores in full, and always keep the prompt template ID rather than the rendered prompt." }
      ] },

    { t: "viz", title: "What each span must carry, and the three pins", caption: "Anything missing here is a question you cannot answer later.",
      svg: `<svg viewBox="0 0 760 330" width="100%" role="img" aria-label="Required span attributes with the three version pins highlighted">
  <text x="16" y="20" class="s-label">THE SPAN SCHEMA</text>

  <rect x="16" y="30" width="728" height="34" rx="3" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="28" y="44" class="s-mono" style="font-size:9px;fill:var(--violet)">root</text>
  <text x="120" y="44" class="s-mono" style="font-size:8px">trace_id &#183; session_id &#183; user_id(hashed) &#183; route &#183; app_version</text>
  <text x="120" y="58" class="s-mono" style="font-size:8px;fill:var(--crit)">prompt_template_version   &#8592; PIN 2</text>

  <rect x="16" y="70" width="728" height="46" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="28" y="84" class="s-mono" style="font-size:9px;fill:var(--warn)">retrieve</text>
  <text x="120" y="84" class="s-mono" style="font-size:8px">query &#183; top_k &#183; returned &#183; above_threshold &#183; chunk_ids &#183; scores</text>
  <text x="120" y="98" class="s-mono" style="font-size:8px;fill:var(--crit)">index_name + index_version   &#8592; PIN 3</text>
  <text x="120" y="111" class="s-sub">chunk IDs matter more than chunk text &#8212; tiny, no PII, and they name the bug</text>

  <rect x="16" y="122" width="356" height="46" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="28" y="136" class="s-mono" style="font-size:9px;fill:var(--accent)">embed_query</text>
  <text x="28" y="150" class="s-mono" style="font-size:8px">model + version &#183; dims &#183; input_length</text>
  <text x="28" y="163" class="s-sub">a version move drops EVERY score at once</text>

  <rect x="388" y="122" width="356" height="46" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="400" y="136" class="s-mono" style="font-size:9px;fill:var(--accent)">rerank</text>
  <text x="400" y="150" class="s-mono" style="font-size:8px">candidates_in &#183; kept &#183; top_score</text>
  <text x="400" y="163" class="s-sub">+ score of the DROPPED best &#8212; the subtle one</text>

  <rect x="16" y="174" width="728" height="46" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="188" class="s-mono" style="font-size:9px;fill:var(--crit)">llm.generate</text>
  <text x="120" y="188" class="s-mono" style="font-size:8px">temperature &#183; max_tokens &#183; prompt_tokens &#183; completion_tokens &#183; finish_reason</text>
  <text x="120" y="202" class="s-mono" style="font-size:8px;fill:var(--crit)">model WITH THE EXACT VERSION PIN   &#8592; PIN 1</text>
  <text x="120" y="215" class="s-sub">chat-large is not a version &#183; chat-large-2026-03-11 is</text>

  <rect x="16" y="226" width="236" height="40" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="28" y="240" class="s-mono" style="font-size:9px;fill:var(--accent)">tool</text>
  <text x="28" y="254" class="s-mono" style="font-size:8px">name &#183; args &#183; size &#183; status &#183; retries</text>

  <rect x="262" y="226" width="236" height="40" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="274" y="240" class="s-mono" style="font-size:9px;fill:var(--accent)">guardrail</text>
  <text x="274" y="254" class="s-mono" style="font-size:8px">ran &#183; fired &#183; action</text>

  <rect x="508" y="226" width="236" height="40" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="520" y="240" class="s-mono" style="font-size:9px;fill:var(--accent)">judge</text>
  <text x="520" y="254" class="s-mono" style="font-size:8px">model &#183; rubric_version &#183; score</text>

  <rect x="16" y="278" width="728" height="46" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="296" class="s-mono" style="font-size:10px;fill:var(--good)">AND FIVE THINGS MUST BE PINNED, NOT THREE</text>
  <text x="28" y="314" class="s-mono" style="font-size:9px">model &#183; embedding model &#183; prompt template &#183; index &#183; chunking config</text>
  <text x="470" y="314" class="s-sub">without all five, &#8220;nothing changed&#8221; is unprovable</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Lint your spans against the schema", difficulty: "core", minutes: 30,
      body: "Write a linter that compares your actual span attributes against the required schema, reports coverage, checks the three pins specifically, and \u2014 most usefully \u2014 lists the questions your current traces cannot answer and names the attribute each one needs.",
      requirements: [
        "Required attributes declared per span type",
        "Coverage reported as a fraction, not a pass/fail",
        "The three version pins checked separately from general coverage",
        "Span types that are not instrumented at all reported distinctly from incomplete ones",
        "A list of unanswerable questions, each mapped to the missing attribute"
      ],
      hint: "The unanswerable-questions list is the output worth showing a team. \u201c38% attribute coverage\u201d invites a shrug; \u201cyou cannot tell whether the provider rolled the model\u201d does not.",
      solution: { lang: "python", title: "a span-schema linter", code: `REQUIRED = {
    "root":        ["trace_id", "session_id", "user_id_hashed", "route",
                    "app_version", "prompt_template_version"],
    "retrieve":    ["query", "top_k", "index_name", "index_version", "returned",
                    "above_threshold", "chunk_ids", "scores"],
    "embed_query": ["model", "model_version", "dims", "input_length"],
    "rerank":      ["model", "candidates_in", "kept", "top_score", "dropped_best_score"],
    "llm.generate":["model_version_pinned", "temperature", "max_tokens",
                    "prompt_tokens", "completion_tokens", "finish_reason",
                    "prompt_template_id"],
    "tool":        ["tool_name", "arguments", "result_size", "status", "retry_count"],
    "guardrail":   ["checks_ran", "checks_fired", "action"],
    "judge":       ["judge_model", "rubric_version", "score", "reasoning"],
}

# the three that earn their place above all others
CRITICAL = {"llm.generate": "model_version_pinned",
            "root": "prompt_template_version",
            "retrieve": "index_version"}

ACTUAL = {                       # what a typical auto-instrumented service has
    "root":         ["trace_id", "session_id", "route"],
    "retrieve":     ["query", "top_k", "index_name", "returned"],
    "embed_query":  ["model", "dims", "input_length"],
    "rerank":       ["model", "kept"],
    "llm.generate": ["model", "temperature", "prompt_tokens", "completion_tokens"],
    "guardrail":    ["checks_ran"],
}

def lint(required, actual):
    total_req = total_have = 0
    findings = []
    for span, keys in required.items():
        have = set(actual.get(span, []))
        total_req += len(keys)
        total_have += len(have & set(keys))
        missing = [k for k in keys if k not in have]
        if span not in actual:
            findings.append((span, "SPAN NOT INSTRUMENTED", keys))
        elif missing:
            findings.append((span, "missing", missing))
    return findings, total_have, total_req

findings, have, req = lint(REQUIRED, ACTUAL)
print("span-attribute audit")
print("=" * 64)
for span, kind, keys in findings:
    if kind == "SPAN NOT INSTRUMENTED":
        print("  %-14s %s" % (span, kind))
    else:
        print("  %-14s missing %d: %s" % (span, len(keys), ", ".join(keys)))

print()
print("coverage: %d of %d required attributes (%.0f%%)" % (have, req, 100.0 * have / req))

print()
print("the three that matter most:")
for span, key in CRITICAL.items():
    print("  %-14s %-24s %s"
          % (span, key, "present" if key in ACTUAL.get(span, []) else "MISSING"))
n_missing = sum(1 for s, k in CRITICAL.items() if k not in ACTUAL.get(s, []))
print()
print("%d of 3 present -- so 'nothing changed' is not a provable claim" % (3 - n_missing))

print()
print("questions this trace CANNOT answer:")
UNANSWERABLE = [
    ("did the provider roll the model?",   "llm.generate.model_version_pinned"),
    ("did the index change?",              "retrieve.index_version"),
    ("did someone edit the prompt?",       "root.prompt_template_version"),
    ("was retrieval empty?",               "retrieve.above_threshold"),
    ("which chunks did the model see?",    "retrieve.chunk_ids"),
    ("was the response truncated?",        "llm.generate.finish_reason"),
    ("which guardrail fired?",             "guardrail.checks_fired"),
]
for q, attr in UNANSWERABLE:
    span, _, key = attr.rpartition(".")
    if key not in ACTUAL.get(span, []):
        print("  %-36s needs %s" % (q, attr))`,
        out: `span-attribute audit
================================================================
  root           missing 3: user_id_hashed, app_version, prompt_template_version
  retrieve       missing 4: index_version, above_threshold, chunk_ids, scores
  embed_query    missing 1: model_version
  rerank         missing 3: candidates_in, top_score, dropped_best_score
  llm.generate   missing 4: model_version_pinned, max_tokens, finish_reason, prompt_template_id
  tool           SPAN NOT INSTRUMENTED
  guardrail      missing 2: checks_fired, action
  judge          SPAN NOT INSTRUMENTED

coverage: 16 of 42 required attributes (38%)

the three that matter most:
  llm.generate   model_version_pinned     MISSING
  root           prompt_template_version  MISSING
  retrieve       index_version            MISSING

0 of 3 present -- so 'nothing changed' is not a provable claim

questions this trace CANNOT answer:
  did the provider roll the model?     needs llm.generate.model_version_pinned
  did the index change?                needs retrieve.index_version
  did someone edit the prompt?         needs root.prompt_template_version
  was retrieval empty?                 needs retrieve.above_threshold
  which chunks did the model see?      needs retrieve.chunk_ids
  was the response truncated?          needs llm.generate.finish_reason
  which guardrail fired?               needs guardrail.checks_fired`,
        notes: [
          { t: "p", text: "**Zero of the three pins are present**, which is the finding and the typical result. This service has traces, a tree, and 38% attribute coverage \u2014 and it cannot prove that the model, the prompt or the index is the same as last week. \u2018Nothing changed\u2019 is not a claim it can make." },
          { t: "p", text: "**Note which spans are missing entirely.** `tool` and `judge` are not instrumented at all, which is a different and quieter problem than an incomplete span: a missing attribute shows up as a blank field, and a missing span shows up as nothing, so nobody notices the tool call is invisible until they need it." },
          { t: "p", text: "**The unanswerable-questions list is the output to show a team.** \u2018Coverage is 38%\u2019 invites a shrug. \u2018You cannot tell whether the provider rolled the model, whether the index changed, whether someone edited the prompt, which chunks the model saw, or whether the response was truncated\u2019 is the same fact and it gets fixed." },
          { t: "p", text: "**`above_threshold` is on that list**, and 10.3 and 10.5 both argued it is the single cheapest quality signal in a RAG system. This service is computing it on every request and discarding it, which is precisely the state the 10.13 incident was in for three weeks." },
          { t: "p", text: "What the audit cannot tell you is whether the attributes present are *correct* \u2014 `model` is recorded on `llm.generate`, but as an alias rather than a pinned version, so it looks like coverage and provides none of the value. A linter checks presence; only reading the values checks meaning." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Each span type has attributes without which a trace cannot answer a question later, and three earn their place everywhere: the exact model version, the prompt template hash, and the index version. The full pin list is five \u2014 add the embedding model and the chunking config \u2014 and without all five, \u201cnothing changed\u201d is unprovable." },
        { t: "p", text: "And log the inputs and outputs of every stage, not just the final answer, because a retrieval failure and a generation failure are the same record if you only kept the question and the response. Chunk IDs are worth more than chunk text: tiny, no PII, and they are what named the bug." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat do you put on a retriever span?\u201d**" },
        { t: "p", text: "The query, `top_k`, the index name *and version*, how many results came back, how many cleared the similarity threshold, the chunk IDs, and the scores. Plus any metadata filter applied, because a filter that silently matches nothing gives zero recall for one tenant while every aggregate looks normal." },
        { t: "p", text: "Of those, the two that actually resolve incidents are the number above threshold and the chunk IDs. The count tells you whether retrieval found anything usable \u2014 it is the cheapest quality signal in the system and it aggregates straight into empty-retrieval rate. The IDs tell you *which* documents the model saw, which is how you discover that every chunk came from the old manual and not one from the new product documentation appears at any rank." },
        { t: "p", text: "I would stress IDs over text deliberately. Chunk text is large, it usually contains exactly the personal data you are trying not to export to a vendor, and you rarely need chunk five in full. IDs are tiny, carry no PII, and answer the question that matters. So truncate text and keep IDs and scores complete." },
        { t: "p", text: "One attribute people miss on the reranker: the score of the best candidate you *dropped*, not just the top score you kept. Those two together distinguish a reranker correctly discarding weak candidates from one that threw away the right answer \u2014 if the dropped best scored 0.81 and the kept top scored 0.79, the ranking inverted on that request, and you cannot see it from the kept scores alone." },
        { t: "p", text: "Then the version pins, which is the part that makes a trace useful across time rather than just within one request. The index version specifically, because every re-index is a deploy \u2014 calling the index `support-docs-v4` instead of `support-docs` turns \u2018did the index change?\u2019 from a meeting into a query. And the embedding model version, because queries and stored vectors have to live in the same space, and when that moves every similarity score drops at once across all cohorts on one date." },
        { t: "p", text: "The test I would apply to any of this is the 2 a.m. test: for each question I might need to answer under pressure, is the attribute there? When I ran that audit on a typical auto-instrumented service it had 38% coverage, zero of the three critical pins, and could not answer seven basic questions \u2014 including whether retrieval had returned anything usable, which it was computing on every request and throwing away." }
      ] }
  ],

  takeaways: [
    "**Anything missing from the span schema is a question you cannot answer at 2 a.m.**",
    "**Three attributes earn their place everywhere**: the exact model version, the prompt template hash, and the index version.",
    "**`chat-large` is not a version; `chat-large-2026-03-11` is** \u2014 an alias cannot prove a provider did not roll it.",
    "**Five things must be pinned, not three** \u2014 add the embedding model and the chunking config.",
    "**The embedding model is the most destructive unpinned thing**: its signature is every similarity score falling at once, on one date, across all cohorts.",
    "**Log the inputs and outputs of every stage**, or a retrieval failure and a generation failure become the same record.",
    "**You cannot re-run a request to recover the chunks** \u2014 retrieval is non-deterministic and the index has moved, so capture the intermediate state at the time.",
    "**Chunk IDs are worth more than chunk text**: tiny, no PII, and they answer which documents the model actually saw.",
    "**Log the score of the dropped best candidate**, not just the kept top \u2014 that is what reveals a reranker discarding the right answer.",
    "**A typical auto-instrumented service has 38% coverage and zero of the three pins**, so it cannot claim nothing changed.",
    "**A missing span is quieter than a missing attribute** \u2014 a blank field gets noticed, an absent tool span does not.",
    "**Report unanswerable questions, not coverage percentages**, because \u201cyou cannot tell whether the model changed\u201d gets fixed and \u201c38%\u201d does not."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why log the score of the best candidate the reranker dropped?",
        options: [
          "To compute the reranker's precision against a labelled set",
          "Because it distinguishes a reranker correctly discarding weak candidates from one that threw away the right answer",
          "Because dropped candidates still incur a cost that must be attributed",
          "To detect when the candidate pool was smaller than top_k"
        ],
        answer: 1,
        why: "The kept top score alone cannot reveal an inverted ranking: if the dropped best scored 0.81 while the kept top scored 0.79, the reranker demoted a stronger candidate and the trace looks perfectly healthy. Together with `candidates_in`, `kept` and the chunk IDs, this is what turns a ranking suspicion into an observation \u2014 and it is the trace-level counterpart of the good-recall-poor-MRR signature." },

      { stem: "Which unpinned component has the signature \u201cevery similarity score drops at once, across all cohorts, on one date\u201d?",
        options: [
          "The index, after a rebuild dropped documents",
          "The embedding model, because queries and stored vectors must live in the same space",
          "The chunking config, after chunk size changed",
          "The reranker, after a model upgrade"
        ],
        answer: 1,
        why: "When the embedding model version moves, query vectors are produced in a different space from the stored document vectors, so similarity collapses uniformly rather than for one cohort \u2014 which is exactly what makes it distinguishable from an ingestion gap, where the drop is concentrated. The only correct fix is re-embedding the entire corpus, since a half-migrated index is worse than either version alone." },

      { stem: "Why are chunk IDs preferred over chunk text in a trace?",
        options: [
          "Because IDs are indexed and text is not",
          "Because IDs are tiny, carry no personal data, and answer which documents the model saw \u2014 which is the question that matters",
          "Because chunk text changes between requests and IDs do not",
          "Because vendors reject payloads over a size limit"
        ],
        answer: 1,
        why: "The incident-resolving observation is \u201cevery retrieved chunk came from the old manual and not one from the new documentation appears at any rank,\u201d which is entirely an ID-level fact. Text would confirm it at roughly a hundred times the storage cost, and it is also where the PII you are trying not to export to a vendor lives. The sensible default is truncated text with complete IDs and scores." },

      { stem: "An audit reports 38% attribute coverage. Why is that the wrong number to present?",
        options: [
          "Because coverage should be weighted by span frequency",
          "Because it invites a shrug \u2014 the actionable framing is the list of questions the traces cannot answer",
          "Because percentages are misleading when span counts differ",
          "Because the required schema is a recommendation rather than a standard"
        ],
        answer: 1,
        why: "A percentage sounds like a backlog item, while \u201cyou cannot tell whether the provider rolled the model, whether the index changed, whether someone edited the prompt, or which chunks the model saw\u201d is the same fact stated as consequences and tends to get fixed. The audit also cannot judge correctness: a `model` attribute recording an alias rather than a pinned version counts as coverage and delivers none of the value." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "What every span must carry",
    questions: [
      { level: "core",
        q: "What goes on a retriever span?",
        strong: "A strong answer names the two that resolve incidents.",
        answer: [
          { t: "p", text: "Query, `top_k`, index name and version, number returned, number above the similarity threshold, chunk IDs, scores, and any metadata filter applied." },
          { t: "p", text: "The two that actually resolve incidents are the number above threshold and the chunk IDs. The count is the cheapest quality signal in the system and aggregates into empty-retrieval rate; the IDs are what let you say \u2018every chunk came from the old manual\u2019." },
          { t: "p", text: "I would log the filter because a metadata filter that silently matches nothing produces zero recall for one tenant or date range while every aggregate looks normal \u2014 and you cannot find that without the filter in the trace." },
          { t: "p", text: "And IDs rather than full text. Text is large, it is where the PII lives, and you rarely need chunk five verbatim." }
        ] },

      { level: "core",
        q: "What has to be pinned before \u201cnothing changed\u201d means anything?",
        strong: "A strong answer gets to five, not three.",
        answer: [
          { t: "p", text: "Five things: the model, the embedding model, the prompt template, the index, and the chunking config. Without all five, \u2018nothing changed\u2019 is a belief rather than a claim you can check." },
          { t: "p", text: "The model has to be an exact dated version, not an alias \u2014 `chat-large` is not a version. The cheapest detector for a provider rolling an alias is logging the requested model and the responding model separately and alerting when they differ." },
          { t: "p", text: "The prompt template because prompts change more often than code and frequently outside version control, edited in a dashboard by someone who is not on the deploy rota. Hash it and log the hash." },
          { t: "p", text: "And the index, because every re-index is a deploy of your knowledge base. Versioning the index name turns a conversation into a query." }
        ] },

      { level: "advanced",
        q: "Why is logging only the question and the answer insufficient?",
        strong: "A strong answer names the two bugs that collapse into one.",
        answer: [
          { t: "p", text: "Because a retrieval failure and a generation failure produce the same record. Both give a wrong answer to a reasonable question, so with only those two fields they are indistinguishable \u2014 and the retrieval-versus-generation split is the first fork in any RAG investigation." },
          { t: "p", text: "What separates them is the intermediate state: which chunks came back, what they scored, and what the assembled prompt actually contained." },
          { t: "p", text: "And you cannot recover that later by re-running. Retrieval is non-deterministic, the index may have changed since, and the model will not produce the same output anyway. The intermediate state is captured at the time or it is gone." },
          { t: "p", text: "In the trace I keep returning to, the answer was wrong because the context was wrong, and the only evidence was two integers on the retriever span. Neither appeared in the waterfall, the status, the latency or the cost." }
        ] }
    ]
  }
});
