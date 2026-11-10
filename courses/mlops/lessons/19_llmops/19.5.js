/* ============================================================================
   LESSON 19.5 — Traces, Guardrails and the Feedback Loop
   ========================================================================= */
EC.receiveLesson({
  id: "19.5",

  lede: "The last piece of LLMOps closes the loop from production back to evaluation. Every request becomes a trace: a tree of spans for retrieval, the model call, and the guardrails, each with its latency, tokens and cost, tagged with the prompt, index and model versions. Guardrails sit in the request path with a latency budget of their own. And the traces users mark as bad become, after redaction and de-duplication, the next cases in the golden set, so the evaluation suite grows from real failures rather than from what the team imagined. This lesson builds a small tracer, measures guardrail cost on real models, and turns a thousand traces of feedback into eval cases.",

  objectives: [
    "Trace each request as spans with latency, tokens, cost and version tags",
    "Place guardrails in the request path and measure their latency cost",
    "Turn negative feedback into redacted, de-duplicated eval cases",
    "Close the loop: traces to cases to the gate to the next release"
  ],

  prerequisites: ["19.3", "19.4", "16.2"],

  blocks: [
    { t: "h2", n: "01", id: "trace", text: "A span per step", sub: "Built small, run on real models" },
    { t: "p",
      text: "The tracer records each unit of work as a span with a parent, a duration and attributes, using a context variable so nested work finds its parent automatically. A request runs input redaction, retrieval, a real GPT-2 generation and an output check. The output check uses a small sentiment classifier as a stand-in for a content-safety classifier, because it has the same cost shape: one small model call per response." },
    { t: "code",
      lang: "python",
      title: "tracing.py — spans for retrieval, the model call and two guardrails",
      code: `import contextvars, re, time, uuid
from contextlib import contextmanager
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

# A minimal tracer: every unit of work is a span with a parent, a duration and attributes (tokens, cost, decisions).
SPANS, current = [], contextvars.ContextVar("span", default=None)
@contextmanager
def span(name, **attrs):
    s = {"id": uuid.uuid4().hex[:6], "parent": current.get(), "name": name, "attrs": attrs, "t0": time.perf_counter()}
    token = current.set(s["id"])
    try: yield s
    finally: s["ms"] = (time.perf_counter() - s["t0"]) * 1000; current.reset(token); SPANS.append(s)

tok = AutoTokenizer.from_pretrained("gpt2"); llm = AutoModelForCausalLM.from_pretrained("gpt2").eval()
# A sentiment classifier stands in for a content-safety classifier: same shape of cost (one small model call).
safety = pipeline("text-classification", model="distilbert-base-uncased-finetuned-sst-2-english")
EMAIL, CARD = re.compile(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+"), re.compile(r"\\b(?:\\d[ -]?){13,16}\\b")
DOCS = {"returns": "Items can be returned within 14 days of delivery.", "shipping": "Standard delivery takes 3 to 5 working days."}

def handle(question):
    with span("request", prompt_version="bd946e198e", model="gpt2-local") as root:
        with span("guard.input.redact") as s:
            clean = CARD.sub("[CARD]", EMAIL.sub("[EMAIL]", question)); s["attrs"]["redactions"] = (clean != question)
        with span("retrieve", index_version="idx-0612") as s:
            doc = DOCS["returns" if "return" in clean.lower() else "shipping"]; s["attrs"]["doc"] = doc[:30]
        prompt = f"Context: {doc}\\nQuestion: {clean}\\nAnswer:"
        with span("llm.generate") as s:
            ids = tok(prompt, return_tensors="pt").input_ids
            with torch.inference_mode():
                out = llm.generate(ids, max_new_tokens=20, do_sample=False, pad_token_id=tok.eos_token_id)
            answer = tok.decode(out[0, ids.shape[1]:]).strip()
            n_in, n_out = ids.shape[1], out.shape[1] - ids.shape[1]
            s["attrs"].update(tokens_in=n_in, tokens_out=n_out, cost_usd=round(n_in * 3e-6 + n_out * 15e-6, 6))
        with span("guard.output.classify") as s:
            verdict = safety(answer[:512])[0]; s["attrs"]["label"] = verdict["label"]
        root["attrs"]["trace_id"] = root["id"]
    return answer

for q in ["Can I return a jacket I bought last week? My email is sam.lee@example.com",
          "How long does shipping take to Leeds?", "My card 4111 1111 1111 1111 was charged twice, can I return it?"]:
    handle(q)
handle("How long does shipping take to Leeds?")                    # one more, to show steady-state timings
roots = [s for s in SPANS if s["parent"] is None]
last = roots[-1]
print(f"trace {last['id']}  {last['ms']:.0f} ms  {last['attrs']}")
for s in [x for x in SPANS if x["parent"] == last["id"]]:
    print(f"  {s['name']:<22} {s['ms']:7.1f} ms  {s['attrs']}")
print("\\nguardrail cost across 4 requests (median ms):")
for name in ("guard.input.redact", "guard.output.classify", "llm.generate"):
    ms = sorted(s["ms"] for s in SPANS if s["name"] == name); print(f"  {name:<22} {ms[len(ms) // 2]:8.2f}")
print(f"redacted inputs: {sum(s['attrs'].get('redactions', False) for s in SPANS)} of {len(roots)}")`,
      out: `trace 1bf15b  516 ms  {'prompt_version': 'bd946e198e', 'model': 'gpt2-local', 'trace_id': '1bf15b'}
  guard.input.redact         0.0 ms  {'redactions': False}
  retrieve                   0.0 ms  {'index_version': 'idx-0612', 'doc': 'Standard delivery takes 3 to 5'}
  llm.generate             490.5 ms  {'tokens_in': 25, 'tokens_out': 20, 'cost_usd': 0.000375}
  guard.output.classify     25.6 ms  {'label': 'NEGATIVE'}

guardrail cost across 4 requests (median ms):
  guard.input.redact         0.02
  guard.output.classify     29.78
  llm.generate             527.90
redacted inputs: 2 of 4` },
    { t: "dl",
      items: [
        { term: "One trace answers most questions",
          def: "Per request: total 516 ms, of which generation 490 ms; 25 input and 20 output tokens; cost $0.000375; the prompt and index versions. Which version, how slow, how expensive and what was retrieved are all in one record." },
        { term: "Regex guardrails are free",
          def: "Redacting email addresses and card numbers took 0.02 ms and caught personal data in 2 of 4 requests before it reached the model or the logs." },
        { term: "Model guardrails are not",
          def: "The classifier added 26–30 ms per response, about 6% of this request. With a larger safety model or several checks in series, guardrails need their own latency budget and can run in parallel with streaming." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Tracing the prompt but not the versions",
      body: [
        { t: "p",
          text: "A trace that stores the prompt text and the answer cannot say which prompt version, index build or model snapshot produced them. Tag every trace with all three (19.2), or an incident cannot be attributed to a release." }
      ] },
    { t: "h2",
      n: "02",
      id: "loop",
      text: "From feedback to the golden set",
      sub: "The suite grows from real failures" },
    { t: "viz",
      title: "The feedback loop",
      caption: "Traces carry feedback; failures become eval cases after redaction and de-duplication; the gate uses them for the next release.",
      svg: `<svg viewBox="0 0 760 265" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="160.0" y1="121.0" x2="220.0" y2="121.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="367.8" y1="95.0" x2="432.2" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="505.0" y1="72.0" x2="505.0" y2="170.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="430.0" y1="205.8" x2="350.0" y2="216.2" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="228.0" y1="200.0" x2="132.0" y2="147.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="95" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="85.0" y="117" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Production</text>
<text x="85.0" y="135" text-anchor="middle" class="s-sub">requests</text>
<rect x="220" y="95" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="295.0" y="117" text-anchor="middle" class="s-label" style="fill:var(--accent)">Traces</text>
<text x="295.0" y="135" text-anchor="middle" class="s-sub">spans, tokens, cost</text>
<rect x="430" y="20" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="505.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--warn)">Feedback</text>
<text x="505.0" y="60" text-anchor="middle" class="s-sub">thumbs, edits, escalations</text>
<rect x="430" y="170" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="505.0" y="192" text-anchor="middle" class="s-label" style="fill:var(--good)">New eval cases</text>
<text x="505.0" y="210" text-anchor="middle" class="s-sub">redacted, de-duplicated</text>
<rect x="200" y="200" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="275.0" y="222" text-anchor="middle" class="s-label" style="fill:var(--crit)">Eval gate</text>
<text x="275.0" y="240" text-anchor="middle" class="s-sub">19.3</text>
</svg>` },
    { t: "table",
      head: ["Step", "Why"],
      rows: [
        [
          "Select failing traces (thumbs down, edits, escalations)",
          "Real failures, weighted by how often they occur"
        ],
        ["Redact personal data", "Eval sets are shared, versioned and kept for years"],
        ["De-duplicate near-identical questions", "One case per behaviour, with its frequency as priority"],
        ["Write the expected behaviour and checks", "A case without a check is just an example"],
        ["Add to the golden set, marking critical cases", "The gate (19.3) blocks regressions on them from then on"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Turn feedback into eval cases",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "From 1,000 traces with thumbs-up or thumbs-down feedback, in which users sometimes paste their email address, select the failures, remove personal data, collapse exact duplicates, de-duplicate near-identical questions with sentence embeddings (keeping a question only if its cosine similarity to every kept one is below 0.80), and list the resulting cases with the number of failing traces behind each." }
      ],
      requirements: [
        "Failures selected from feedback",
        "Redaction that removes the pasted sentence, then masks any remaining address",
        "Exact and semantic de-duplication",
        "Cases ranked by the traces behind them, and a check that no email remains"
      ],
      hint: "Redact before de-duplicating, or the same question with different emails looks like different cases.",
      solution: { lang: "python",
        title: "feedback_to_evals.py",
        code: `import re
import numpy as np
from sentence_transformers import SentenceTransformer

rng = np.random.default_rng(39)
# 1,000 production traces with user feedback. Failures cluster around a few topics, with many rephrasings of each.
templates = {
    "return a gift": ["Can I return a gift without a receipt?", "how do i return something i got as a gift", "Returning a present, no receipt?",
                      "gift return without receipt possible?"],
    "change address": ["Can I change my delivery address after ordering?", "need to update shipping address on my order",
                       "change the address for an order already placed"],
    "double charge": ["I was charged twice for one order", "my card got billed two times", "duplicate charge on my account, help"],
    "track order": ["Where is my order?", "how can I track my parcel", "tracking number for my order please"],
}
fail_rate = {"return a gift": 0.6, "change address": 0.5, "double charge": 0.7, "track order": 0.05}
traces = []
for i in range(1_000):
    topic = rng.choice(list(templates)); q = rng.choice(templates[topic])
    if rng.random() < 0.3: q += f" My email is user{i}@example.com"                              # users paste personal data
    traces.append({"trace_id": f"t{i:04d}", "question": q, "topic": topic, "thumbs_down": rng.random() < fail_rate[topic]})

# 1. Select failures. 2. Redact personal data. 3. Deduplicate near-identical questions with embeddings.
failed = [t for t in traces if t["thumbs_down"]]
def redact(s):                                    # drop the pasted sentence first, then mask any address that remains
    s = re.sub(r"\\s*My email is [\\w.+-]+@[\\w-]+\\.[\\w.]+", "", s)
    return re.sub(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", "[EMAIL]", s).strip()
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
qs = [redact(t["question"]) for t in failed]
uniq_q = sorted(set(qs))
emb = model.encode(uniq_q, normalize_embeddings=True)
keep = []
for i in range(len(uniq_q)):                                                                      # greedy: keep if not too close to a kept one
    if all(float(emb[i] @ emb[j]) < 0.80 for j in keep): keep.append(i)
cases = [{"question": uniq_q[i], "source_traces": sum(q == uniq_q[i] for q in qs)} for i in keep]

print(f"{len(traces):,} traces, {len(failed)} with thumbs-down")
print(f"after redaction: {len(uniq_q)} distinct questions; after semantic de-duplication (cosine >= 0.80): {len(cases)} new eval cases")
for c in sorted(cases, key=lambda c: -c["source_traces"]): print(f"  {c['source_traces']:>4} traces  '{c['question']}'")
print(f"emails left in the new cases: {sum('@' in c['question'] for c in cases)}")`,
        out: `1,000 traces, 474 with thumbs-down
after redaction: 13 distinct questions; after semantic de-duplication (cosine >= 0.80): 11 new eval cases
    67 traces  'I was charged twice for one order'
    60 traces  'duplicate charge on my account, help'
    58 traces  'my card got billed two times'
    45 traces  'change the address for an order already placed'
    43 traces  'Can I change my delivery address after ordering?'
    41 traces  'need to update shipping address on my order'
    38 traces  'Can I return a gift without a receipt?'
    31 traces  'how do i return something i got as a gift'
    10 traces  'Where is my order?'
     4 traces  'how can I track my parcel'
     4 traces  'tracking number for my order please'
emails left in the new cases: 0`,
        notes: [
          { t: "p",
            text: "474 thumbs-down traces became 13 distinct questions after redaction and 11 eval cases after semantic de-duplication, with no email left. A first version masked the address before removing the sentence it sat in, which left 'My email is [EMAIL]' variants as separate cases: redaction order matters." },
          { t: "p",
            text: "The 0.80 threshold merged only near-identical wording; genuine paraphrases ('charged twice' and 'billed two times') stayed as separate cases, which is useful, since a fix should work for both. Ranking by trace count gives the priority: the double-charge questions alone accounted for 185 failing traces." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the failure nobody could reproduce",
      body: [
        { t: "p",
          text: "**Symptom.** Support escalations about wrong refund answers rose for two weeks; engineers could not reproduce them with the current prompt." },
        { t: "p",
          text: "**Mechanism.** Logging recorded the final answer only. The failing requests had used a prompt version briefly in a canary and an index build that was later replaced, and without spans or version tags there was no way to know which, or what had been retrieved." },
        { t: "p",
          text: "**Fix.** Every request now produces a trace with spans for retrieval, generation and guardrails, tagged with prompt, index and model versions, and retained for 30 days; escalated traces are redacted and added to the golden set weekly, with refund cases marked critical." }
      ] }
  ],

  takeaways: [
    "Trace every request as **spans**: retrieval, model call, guardrails, each with latency, tokens and cost.",
    "Tag traces with **prompt, index and model versions**, or incidents cannot be attributed.",
    "Measured: regex redaction cost **0.02 ms** and caught personal data in **2 of 4** requests.",
    "A classifier guardrail cost **26–30 ms**: guardrails need their own latency budget.",
    "Turn negative feedback into eval cases: **select, redact, de-duplicate, specify, gate**.",
    "474 failing traces became **11** cases; ranking by trace count sets the priority.",
    "Redact **before** de-duplicating, and in the right order."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "What must a trace record so an incident can be tied to a release?",
        options: [
          "The full prompt text for every single request",
          "The prompt, index and model versions used",
          "The user's name and email address",
          "The number of guardrails that ran"
        ],
        answer: 1,
        why: "Versions identify what produced the answer; prompt text alone cannot say which version or index build it came from. Personal data should not be in traces, and guardrail counts do not identify a release." },
      { stem: "Why did one guardrail cost 0.02 ms and the other about 26 ms?",
        options: [
          "The first ran on a GPU and the second on the slower CPU",
          "A regex scan is cheap; a classifier is a model call",
          "The second guardrail scanned a much longer input",
          "Guardrails always cost about a millisecond each"
        ],
        answer: 1,
        why: "Pattern matching takes microseconds; even a small classifier is a forward pass of a neural network. Both ran on the CPU on short texts." },
      { stem: "Why redact traces before de-duplicating them into eval cases?",
        options: [
          "Redaction makes the embeddings compute faster",
          "Emails make one question look like many",
          "De-duplication cannot run on raw text",
          "Redaction removes all paraphrases at once"
        ],
        answer: 1,
        why: "Personal details make identical questions differ, inflating the case count and leaking data into the eval set. Speed, raw text and paraphrases are not the reason." },
      { stem: "Two paraphrases of one failure survive de-duplication. Is that a problem?",
        options: [
          "Yes: every topic must have exactly one case",
          "No: a fix should work for both wordings",
          "Yes: paraphrases break McNemar's test",
          "No: the judge will merge them automatically"
        ],
        answer: 1,
        why: "Paraphrases test robustness to wording, so keeping both is useful. There is no one-per-topic rule, McNemar's test works per case, and judges do not merge cases." }
    ] },

  interview: { title: "In an interview",
    sub: "Observability for LLMs ends in a loop, not a dashboard.",
    questions: [
      { level: "core",
        q: "What would you trace in an LLM application?",
        strong: "A strong answer names spans, attributes and version tags, and privacy.",
        answer: [
          { t: "p",
            text: "One trace per request with spans for retrieval (query, documents, scores), each model call (model snapshot, tokens in and out, cost, TTFT), tool calls and guardrails (decision and latency), tagged with prompt, index and model versions and the user's feedback when it arrives. Personal data is redacted before storage, and traces are sampled and retained per policy. That supports debugging, cost attribution and the eval feedback loop." }
        ] },
      { level: "advanced",
        q: "Where do guardrails go, and how do you keep them from hurting latency?",
        strong: "A strong answer separates cheap and expensive checks and uses parallelism and budgets.",
        answer: [
          { t: "p",
            text: "Cheap deterministic checks (PII patterns, length, allowed tools) inline on input and output. Model-based checks (safety, groundedness) budgeted explicitly: run input checks in parallel with retrieval, and output checks on streamed chunks or in parallel with the start of streaming, blocking delivery only for high-risk categories. Measure each guardrail's latency and hit rate in the trace, and remove ones that never fire." }
        ] },
      { level: "core",
        q: "How does production feedback improve an LLM feature?",
        strong: "A strong answer describes the loop into the evaluation suite and the gate.",
        answer: [
          { t: "p",
            text: "Negative signals (thumbs down, edits, escalations) select traces; they are redacted, de-duplicated and turned into eval cases with expected behaviour and checks, ranked by frequency, with critical ones marked. The next prompt, index or model change must pass them at the gate (19.3). Over time the golden set reflects real failures, and regressions on them cannot ship silently." }
        ] }
    ] }
});
