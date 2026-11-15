EC.receiveLesson({
  id: "1.15",

  lede: "Every parameter in this module exists on some APIs and not others, which turns \"switch to a cheaper model\" from a configuration change into a code change — and since 2026 the frontier hosted models have been taking the sampling parameters away altogether, each provider in a different way. Send the same `temperature` to three current flagships and **one accepts it, one rejects it with a 400, and one returns a normal 200 having ignored it**. This lesson lays out the support matrix as the documentation stood in November 2026, works out which gaps actually matter, and builds the abstraction that survives a migration — which is not the one most teams reach for first, because the hard part is not translating parameters but knowing when a translation has silently changed the behaviour.",

  objectives: [
    "State which common parameters are unsupported on which providers",
    "Predict what a provider does with a parameter it does not accept",
    "Choose a model from the task's constraints rather than from a benchmark",
    "Design a provider abstraction that fails loudly rather than silently degrading",
    "Say what a price-per-token comparison leaves out"
  ],

  prerequisites: ["1.3", "1.8", "1.14"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "the-matrix", text: "What each provider accepts",
      sub: "Read from the documentation in November 2026 — the shape outlasts the cells" },

    {"kind": "matrix", "title": "One parameter, three answers", "caption": "The three hosted APIs no longer disagree only about names. **Claude's current models reject `temperature` with a 400; Gemini 3.6 and later accept it, ignore it and add a deprecation warning header; OpenAI's Responses API still takes it** but has no `seed`, no `stop` and no penalties. The middle behaviour is the one to fear, and it is now a documented production behaviour rather than a hypothetical.", "cols": ["OpenAI Responses", "Claude, current", "Gemini 3.6+ and 4"], "rows": ["temperature, top_p", "seed", "penalties"], "cells": [[{"text": "accepted", "tone": "good"}, {"text": "rejected: 400", "tone": "warn"}, {"text": "ignored, 200", "tone": "crit"}], [{"text": "no such field", "tone": "warn"}, {"text": "no such field", "tone": "warn"}, {"text": "documented", "tone": "good"}], [{"text": "no such field", "tone": "warn"}, {"text": "no such field", "tone": "warn"}, {"text": "documented", "tone": "good"}]], "t": "diagram", "id": "dg-1_15-01-0"},

    { t: "p", text: "Lessons 1.2 to 1.7 taught the sampler on GPT-2's own logits because the mechanism is the durable part. Which hosted API lets you reach it is not durable at all, and 2026 was the year it changed: the frontier models are reasoning models, and their providers have been replacing the sampling parameters with a single depth control." },

    { t: "table",
      head: ["Control", "OpenAI · Responses API", "Anthropic · current Claude models", "Google · Gemini 3.6+ and 4", "Open-weight · vLLM"],
      rows: [
        ["`temperature`, `top_p`", "accepted", "**rejected** — 400", "**ignored**, with a deprecation warning header", "yes"],
        ["`top_k`", "**no**", "**rejected** — 400", "**ignored**", "yes"],
        ["frequency and presence penalty", "**not in this API**", "**no**", "documented", "yes, plus `repetition_penalty`"],
        ["`seed`", "**not in this API**", "**no**", "documented", "yes"],
        ["stop sequences", "**not in this API**", "`stop_sequences`", "up to 5", "yes"],
        ["`logit_bias`", "**not in this API**", "**no**", "not documented", "yes"],
        ["log-probabilities", "`top_logprobs`, requested through `include`", "**no**", "`responseLogprobs`", "yes"],
        ["output cap", "`max_output_tokens`, reasoning included", "`max_tokens`, thinking included", "`max_output_tokens`, thinking included", "`max_tokens`"],
        ["reasoning depth", "`reasoning.effort`", "`output_config.effort`", "`thinking_level`", "model-specific"],
        ["schema-constrained output", "`text.format` with a JSON schema", "`output_config.format`", "`response_format`, or `response_schema`", "guided decoding (3.13)"],
        ["tool calling, streaming, vision", "yes", "yes", "yes", "model-dependent"],
        ["batch API", "50% off, 24-hour window", "50% off", "50% off, 24-hour target", "your own queue"],
        ["prompt caching", "automatic, breakpoints optional", "one top-level field, or explicit breakpoints", "automatic", "prefix caching in the server (3.2)"]
      ],
      caption: "Read on 10 November 2026 from OpenAI's Responses API reference, Anthropic's guidance for its current models, and Google's Gemini 3.6 and Gemini 4 migration guides. Older models on the same APIs behave differently, and OpenAI's Chat Completions API is a different surface from the one in this column. Every cell here will move; treat the table as a snapshot of a pattern and read the provider's own page before relying on a row." },

    { t: "p", text: "The rows worth internalising are the ones where a control is missing on an API people migrate *to*:" },

    { t: "dl", items: [
      ["Sampling parameters on Claude", "Gone, and loudly. A request carrying `temperature`, `top_p` or `top_k` to a current Claude model comes back as a 400 naming the parameter. There is no `seed` and there never were penalties. Depth is set with `output_config.effort`, and determinism is a job for the prompt, a pinned model id and a cache (1.7)."],
      ["Sampling parameters on Gemini 3.6 and later", "Gone, and quietly. The request succeeds, the value is ignored, and the only evidence is a deprecation warning in the response headers, which almost no client surfaces. Google's migration guide says a later generation will return a 400 instead, and that determinism should come from explicit rules in the system instruction."],
      ["`seed`, `stop`, `logit_bias` and the penalties on OpenAI", "Absent from the Responses API, which is the interface OpenAI recommends for its reasoning models. A reproducibility strategy built on `seed`, a loop-breaker built on `frequency_penalty=0.5` or the single-token classifier from 1.6 does not port to it."],
      ["Depth has three names and three scales", "`reasoning.effort`, `output_config.effort` and `thinking_level` do the same job with different values, different defaults and different floors — some models cannot turn reasoning off at all. A value copied between providers is a new setting, not the same one."],
      ["Schema-constrained output", "Not a capability gap: all three constrain a response to a JSON schema. The code shape differs on each, so it is a code change rather than a config change — and on the newest Claude models forcing a specific tool is rejected, so a schema obtained through forced tool use moves to `output_config.format` or to a tool marked `strict` (1.8)."],
      ["Prefilled assistant turns", "A request whose last turn is a partial assistant message is a 400 on current Claude models and on Gemini 3.6 and later. Any prompt that steered the format by starting the answer for the model — an opening brace, a first XML tag — needs a schema instead (1.8)."]
    ] },

    { t: "callout", kind: "mental", title: "Where the knobs went",
      body: [
        { t: "p", text: "The sampler has not gone anywhere. Every model still produces logits, and something still divides them by a temperature and truncates the tail before drawing a token — the provider has simply stopped letting you choose the numbers, because a model that reasons before it answers is tuned with its sampler as part of the product." },
        { t: "p", text: "So the knowledge splits in two. On an open-weight model served with vLLM, TGI or llama.cpp, every parameter in this module is yours and behaves exactly as measured. On a frontier hosted model, the same knowledge is what lets you read the behaviour — why an answer varies between runs, why a long output starts repeating — while the control you actually hold is depth, the prompt and the schema." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "silently-ignored", text: "What happens to a parameter that is not supported",
      sub: "Rejected, ignored, or quietly reinterpreted" },

    { t: "p", text: "Three behaviours, and they are not equally good:" },

    { t: "viz", title: "Three ways a parameter can go missing", caption: "The middle column is the dangerous one, because the request succeeds and the behaviour is not what the code asked for.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="How providers handle unsupported parameters">
  <rect x="16" y="34" width="232" height="120" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="132" y="58" text-anchor="middle" class="s-label" style="fill:var(--good)">rejected</text>
  <text x="132" y="80" text-anchor="middle" class="s-sub">400, with a message</text>
  <text x="132" y="100" text-anchor="middle" class="s-sub">naming the parameter</text>
  <text x="132" y="126" text-anchor="middle" class="s-mono" style="fill:var(--good)">the good case</text>
  <text x="132" y="144" text-anchor="middle" class="s-sub">you find out immediately</text>

  <rect x="264" y="34" width="232" height="120" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="380" y="58" text-anchor="middle" class="s-label" style="fill:var(--crit)">silently ignored</text>
  <text x="380" y="80" text-anchor="middle" class="s-sub">200, response returned,</text>
  <text x="380" y="100" text-anchor="middle" class="s-sub">parameter had no effect</text>
  <text x="380" y="126" text-anchor="middle" class="s-mono" style="fill:var(--crit)">the dangerous case</text>
  <text x="380" y="144" text-anchor="middle" class="s-sub">the eval shifts and nobody knows why</text>

  <rect x="512" y="34" width="232" height="120" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="628" y="58" text-anchor="middle" class="s-label" style="fill:var(--warn)">reinterpreted</text>
  <text x="628" y="80" text-anchor="middle" class="s-sub">mapped to something</text>
  <text x="628" y="100" text-anchor="middle" class="s-sub">similar but not identical</text>
  <text x="628" y="126" text-anchor="middle" class="s-mono" style="fill:var(--warn)">the subtle case</text>
  <text x="628" y="144" text-anchor="middle" class="s-sub">frequency_penalty to repetition_penalty</text>

  <text x="16" y="186" class="s-sub">A gateway or SDK sitting between you and the provider can convert the left case into the middle one.</text>
  <text x="16" y="202" class="s-sub">That is the single most important thing to check before trusting an abstraction layer.</text>
</svg>` },

    { t: "p", text: "You do not need a hypothetical for the first two. A service that sets `temperature=0` for determinism and is pointed, unchanged, at a current Claude model fails on its first request with a 400 that names the parameter: one failed call, found in CI. Pointed at Gemini 3.6 or later it returns a normal 200 on every request, with the setting ignored and a warning in a header nobody reads. Same code, same intent, and only one of the two providers told you." },

    { t: "callout", kind: "trap", title: "An abstraction that drops unknown parameters is worse than none",
      body: [
        { t: "p", text: "Many provider-agnostic wrappers accept a superset of parameters and forward what each backend understands. That is the reasonable-looking design that produces the silent case: your `frequency_penalty=0.5` is accepted by the wrapper, dropped before the Anthropic call, and the response comes back successfully with none of the behaviour you configured." },
        { t: "p", text: "It also undoes the one thing a strict provider gives you. Claude's 400 on `temperature` is the good case — and a wrapper that strips the parameter to make the call succeed has converted it into the dangerous one on your behalf." },
        { t: "p", text: "The failure surfaces as a quality regression after a routing change, with no error anywhere and nothing in the diff — because nothing in your code changed. It is among the hardest LLM bugs to attribute." },
        { t: "p", text: "The rule: an abstraction must **raise** on a parameter the target cannot honour, or return an explicit list of what it dropped. \"Best effort\" is not an acceptable contract for something that changes model behaviour." }
      ] },

    { t: "code", lang: "python", title: "provider.py — the shape that fails loudly", code: `# What each API will honour, read from the providers' documentation in November 2026.
# "google" is Gemini 3.6 and later, which ACCEPTS temperature, top_p and top_k and
# ignores them -- so here they are unsupported, whatever the status code says.
SUPPORTED = {
    "openai":    {"temperature", "top_p", "max_tokens", "json_schema", "tools", "effort"},
    "anthropic": {"max_tokens", "stop", "json_schema", "tools", "effort"},
    "google":    {"frequency_penalty", "presence_penalty", "seed", "stop",
                  "max_tokens", "json_schema", "tools", "effort"},
}

class Unsupported(Exception):
    pass

def call(provider, *, strict=True, **params):
    unknown = set(params) - SUPPORTED[provider] - {"model", "messages"}
    if unknown:
        if strict:
            raise Unsupported(f"{provider} cannot honour {sorted(unknown)}")
        log.warning("%s: dropping %s -- behaviour WILL differ", provider, sorted(unknown))
    return BACKENDS[provider](**{k: v for k, v in params.items() if k not in unknown})`,
      hl: [17, 18, 19],
      caption: "`strict=True` by default, so a migration fails in CI rather than in production. The table is written in the wrapper's own vocabulary — `max_tokens`, `json_schema`, `effort` — and each backend translates those to its provider's names; the set says what will be *honoured*, which is not the same as what will be accepted. Keep it dated and regenerate it from the documentation, because it is the part of this file that goes stale." },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "choosing", text: "Choosing a model",
      sub: "The constraint that binds is rarely quality" },

    {"kind": "layers", "title": "What is actually driving each model recommendation", "caption": "Recommendation lists go stale within months; the **constraint** behind each one does not. Read the right-hand column and the list becomes reusable: two of these rows are hard limits that no amount of model progress removes — a context window is architectural, and an on-prem requirement is satisfied by no hosted model at any price.", "items": [{"label": "Simple classification", "sub": "cost and speed - the quality ceiling is not binding", "tone": "good"}, {"label": "Complex reasoning", "sub": "quality is binding, and you pay for it", "tone": "accent"}, {"label": "Code generation", "sub": "a capability difference that shows up in evals", "tone": "accent"}, {"label": "Under 500 ms", "sub": "latency is binding; model size and effort are the levers", "tone": "accent"}, {"label": "Very long context", "sub": "a hard architectural limit, not a preference", "tone": "crit"}, {"label": "On-prem or private", "sub": "a requirement no hosted model satisfies at any price", "tone": "crit"}, {"label": "Cost-sensitive batches", "sub": "scheduling flexibility, not model choice (1.13)", "tone": "violet"}], "t": "diagram", "id": "dg-1_15-03-1"},

    { t: "table",
      head: ["Task type", "A November 2026 shortlist", "What is actually driving it"],
      rows: [
        ["Simple classification", "GPT-6 Luna / Claude Haiku 5.5 / Gemini 3.5 Flash-Lite", "Cheap and fast; the quality ceiling is not the constraint"],
        ["Complex reasoning", "Claude Fable 5.1 / GPT-6 Astra / Gemini 4 Carbon", "Quality is the constraint and you pay for it"],
        ["Code generation", "Claude Opus 5.5 / GPT-6.1 Sol", "A capability difference that shows up in evals"],
        ["Ultra-fast (< 500 ms)", "A small model at its lowest effort setting", "Latency is the constraint; model size and reasoning depth are the levers"],
        ["Very long context", "Any current flagship takes about a million tokens", "A hard architectural limit — and long prompts are billed at a higher tier"],
        ["On-prem / privacy", "An open-weight model you serve yourself (3.7)", "A requirement no hosted model satisfies at any price"],
        ["Cost-sensitive batches", "The batch API on OpenAI, Anthropic or Google", "Scheduling flexibility, not model choice (1.13)"]
      ],
      caption: "The names in the middle column will be wrong within months. The third column is the useful reading: in five of the seven rows the binding constraint is not answer quality at all." },

    { t: "p", text: "Prices as the providers listed them in November 2026, per million input tokens: GPT-6 Luna $0.10, Claude Haiku 5.5 $0.10, Gemini 3.5 Flash-Lite $0.30, Gemini 3.8 Flash $0.75, GPT-6.1 Terra $1.00, GPT-6.1 Sol $2.00, Claude Sonnet 5.5 $2.00, Gemini 4 Carbon $2.00, Claude Opus 5.5 $4.00, GPT-6 Astra $10.00 and Claude Fable 5.1 $10.00. That is a 100× spread between the cheapest and the most expensive — which is why routing (11.9) is usually worth more than any other cost work. Output is priced at five times input on ten of those eleven models." },

    { t: "callout", kind: "warn", title: "A price list is a snapshot with small print",
      body: [
        { t: "p", text: "Three of those figures carry conditions the headline hides. Gemini 4 Carbon's $2.00 is a launch price that doubles on 1 December 2026, and Gemini 3.8 Flash's $0.75 doubles a month later. OpenAI lists a higher long-context rate for a request with more than 272,000 input tokens — $20.00 rather than $10.00 on Astra. Claude Haiku 5.5's $0.10 applies to prompts up to 100,000 tokens and is $0.50 beyond that." },
        { t: "p", text: "So a cost model needs the date it was read, the prompt-length tier it assumes, and an owner who re-reads the page. A spreadsheet that says \"$2 per million\" with none of those is how a budget is missed by a factor of two with no change in traffic." }
      ] },

    { t: "callout", kind: "insight", title: "Price per token is not price per task",
      body: [
        { t: "p", text: "Four things break the comparison. **Tokenisation** — 1.14 measured the same French text at 73 tokens in one encoding and 57 in another, so a 22% difference in cost per document at identical per-token prices." },
        { t: "p", text: "**Verbosity.** A model that answers in 400 tokens where another uses 200 costs twice as much at the same rate, and output is the expensive side." },
        { t: "p", text: "**Retries.** A cheaper model that fails a schema or needs a second attempt 10% of the time is 10% more expensive than its rate suggests, plus the latency." },
        { t: "p", text: "**Reasoning tokens.** On a reasoning model the visible answer can be a small fraction of what you pay for (1.10): reasoning is billed as output on all three providers, so the bill follows the depth setting rather than the length of the answer." },
        { t: "p", text: "The only comparison that means anything is cost per *successfully completed task*, measured on your own traffic. Everything else is a proxy that can be off by an order of magnitude." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "the-abstraction", text: "How much abstraction is worth building",
      sub: "Less than people build, and in a different place" },

    {"kind": "flow", "title": "Normalising the names while the behaviours differ is worse than not abstracting", "caption": "The instinct on meeting the support matrix is to build a layer that hides it, and that is usually the wrong shape — **the differences that matter are behaviours, not parameter names**. An abstraction that smooths the names is actively misleading, because it makes switching providers *look* like a configuration change, and the eval step then gets skipped on the strength of the abstraction's promise. Switching providers is a project.", "cols": 3, "nodes": [{"id": "m", "label": "The support matrix looks like config", "sub": "names and flags", "tone": "accent"}, {"id": "l", "label": "So you build a layer", "sub": "one interface, many providers", "tone": "warn"}, {"id": "b", "label": "But the behaviours still differ", "sub": "not just the names", "tone": "crit"}, {"id": "s", "label": "Switching now looks free", "sub": "a config change", "tone": "crit"}, {"id": "e", "label": "So the eval gets skipped", "sub": "on the layer's promise", "tone": "crit"}, {"id": "p", "label": "Treat it as a project instead", "sub": "and keep the eval step", "tone": "good"}], "edges": [["m", "l"], ["l", "b"], ["b", "s"], ["s", "e"], ["e", "p"]], "t": "diagram", "id": "dg-1_15-04-2"},

    { t: "p", text: "The instinct on meeting the support matrix is to build a layer that hides it. That is usually the wrong shape, because the differences that matter are not parameter names — they are behaviours, and a layer that normalises the names while the behaviours differ is actively misleading." },

    { t: "ol", items: [
      "**Normalise the request shape**, because that part is genuinely mechanical: messages, roles, tool definitions, streaming. This is where an SDK earns its place.",
      "**Do not normalise the sampling or depth parameters.** Keep them per-provider and explicit. A `temperature` of 0.7 means something different on two models anyway — 1.2 showed that temperature scales whatever logit gaps the model produces — and on two of the three hosted APIs it now means nothing at all. An `effort` of `medium` is no more portable: it is a different amount of reasoning on each model.",
      "**Keep prompts per-provider** if you have tuned them. Models are trained on different chat templates and respond differently to structure; a prompt tuned on one is not tuned on another (2.14).",
      "**Evaluate per-provider, always.** This is the part that cannot be abstracted and the part teams skip. A migration is not done when the code runs; it is done when the eval says the quality held (8.10)."
    ] },

    { t: "p", text: "The honest summary is that switching providers is a project, not a configuration change — and building an abstraction that makes it *look* like a configuration change increases the risk rather than reducing it, because the eval step gets skipped on the strength of the abstraction's promise." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Audit a codebase for portability",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Before a migration is planned, it is worth knowing which parameters a codebase actually depends on — including the ones set once in a default and forgotten." },
        { t: "p", text: "Build the audit: given a set of call sites written in 2024 against a chat-completions API, report what would be lost on each of the three current APIs." }
      ],
      requirements: [
        "Define the support matrix from §01 as data, counting a parameter that is accepted and ignored as unsupported",
        "Model at least five call sites with different parameter sets, including one using penalties and one using seed",
        "For each call site and each provider, report which parameters would be lost",
        "Report the totals per provider, and how many of the losses are silent",
        "State which provider is the hardest migration by count, and which is the most dangerous"
      ],
      hint: "Set difference per call site per provider. The interesting output is not the count but how each loss announces itself: a 400 on the first request, or a 200 with the setting ignored.",
      solution: { lang: "python", title: "g115_ex.py",
        code: `# What each API will honour, read from the providers' documentation in November 2026.
# "google" is Gemini 3.6 and later, which ACCEPTS temperature, top_p and top_k and ignores
# them -- so for an audit they are unsupported, whatever the status code says.
SUPPORTED = {
    "openai":    {"temperature", "top_p", "max_tokens", "json_schema", "tools", "effort"},
    "anthropic": {"max_tokens", "stop", "json_schema", "tools", "effort"},
    "google":    {"frequency_penalty", "presence_penalty", "seed", "stop",
                  "max_tokens", "json_schema", "tools", "effort"},
}

# Five call sites written in 2024 against a chat-completions API.
CALL_SITES = {
    "classify":   {"temperature", "max_tokens", "json_schema"},
    "summarise":  {"temperature", "top_p", "frequency_penalty", "presence_penalty",
                   "max_tokens"},
    "extract":    {"temperature", "seed", "json_schema", "max_tokens"},
    "chat":       {"temperature", "top_p", "max_tokens", "stop", "tools"},
    "brainstorm": {"temperature", "top_p", "frequency_penalty", "max_tokens"},
}

for prov in SUPPORTED:
    print("lost on %s:" % prov)
    for name, params in CALL_SITES.items():
        lost = sorted(params - SUPPORTED[prov])
        print("  %-11s %s" % (name, ", ".join(lost) if lost else "-"))
    print()

for prov in SUPPORTED:
    total = sum(len(p - SUPPORTED[prov]) for p in CALL_SITES.values())
    sites = sum(1 for p in CALL_SITES.values() if p - SUPPORTED[prov])
    silent = sum(len((p - SUPPORTED[prov]) & {"temperature", "top_p", "top_k"})
                 for p in CALL_SITES.values()) if prov == "google" else 0
    print("%-10s %2d parameters lost across %d of %d call sites, %d of them silently"
          % (prov, total, sites, len(CALL_SITES), silent))`,
        out: `lost on openai:
  classify    -
  summarise   frequency_penalty, presence_penalty
  extract     seed
  chat        stop
  brainstorm  frequency_penalty

lost on anthropic:
  classify    temperature
  summarise   frequency_penalty, presence_penalty, temperature, top_p
  extract     seed, temperature
  chat        temperature, top_p
  brainstorm  frequency_penalty, temperature, top_p

lost on google:
  classify    temperature
  summarise   temperature, top_p
  extract     temperature
  chat        temperature, top_p
  brainstorm  temperature, top_p

openai      5 parameters lost across 4 of 5 call sites, 0 of them silently
anthropic  12 parameters lost across 5 of 5 call sites, 0 of them silently
google      8 parameters lost across 5 of 5 call sites, 8 of them silently`,
        notes: [
          { t: "p", text: "By count Anthropic is the hardest migration — 12 parameters across all five call sites, against 8 for Google and 5 for OpenAI — and the count ranks them backwards. Every one of Anthropic's twelve is a 400 on the first request, so the whole list is found by the test suite in an afternoon. All eight of Google's are accepted and ignored: nothing fails, no test goes red, and the behaviour change has to be found by evaluation or by users." },
          { t: "p", text: "The losses with no substitute are the same on every target: the penalties and `seed`. A summariser tuned to break loops with `frequency_penalty=0.5` has to solve that in the prompt on Claude and on OpenAI's Responses API, and `extract` loses its seed-based reproducibility on both — the fallback is the one 1.7 argued for all along, which is to pin the model id and cache the output." },
          { t: "p", text: "The parameter whose loss **changes behaviour** rather than failing is `temperature` on Gemini. `classify` and `extract` were written with `temperature=0` because their authors wanted the same answer every time; after the move they get whatever the model's own sampler does, with a 200 and no message. That is the silent case from §02, and it is why a portability audit ranks by how a loss announces itself rather than by how many names are lost." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the fallback provider that quietly halved answer quality",
      body: [
        { t: "p", text: "**Symptom.** A content tool added a secondary provider for resilience, routing to it when the primary was slow or erroring. Over the following quarter, user ratings drifted down about 15% with no correlated deploy. The team had been looking at prompt changes for weeks." },
        { t: "p", text: "**The architecture.** A provider-agnostic wrapper accepting the union of both providers' parameters, forwarding to each backend whatever it understood and dropping the rest. It had been reviewed and everyone was happy with it — it was clean, well-tested against both backends, and never threw." },
        { t: "p", text: "**Mechanism.** The generation prompt used `frequency_penalty=0.6` and `presence_penalty=0.4`, both tuned over a week of work to stop long-form output repeating itself. The fallback provider supports neither. The wrapper dropped both, silently, and returned a perfectly valid response — which repeated itself in exactly the way the penalties had been tuned to prevent. Roughly 8% of traffic was falling back, and the quality drop on that 8% was large enough to move the aggregate." },
        { t: "p", text: "**Fix.** The wrapper now raises unless the caller passes `strict=False`, and every call site was audited against the matrix — which took an afternoon and found two more places relying on `seed`. The durable lesson is about the abstraction itself: it was well built, and being well built is what made it dangerous. It promised that providers were interchangeable, so nobody evaluated the fallback path separately, and a 15% quality difference sat in production for a quarter with no error, no alert and nothing in any diff." }
      ] }
  ],

  takeaways: [
    "**The same `temperature` gets three answers in November 2026**: OpenAI's Responses API accepts it, Claude's current models reject it with a 400, and Gemini 3.6 and later ignore it and return a deprecation warning header.",
    "`seed`, `stop`, `logit_bias` and the penalties are absent from OpenAI's Responses API, and Anthropic has no `seed` or penalties — the full set survives on open-weight servers such as vLLM, which is where Lessons 1.2 to 1.7 apply unchanged.",
    "The control the hosted models expose instead is **depth** — `reasoning.effort`, `output_config.effort`, `thinking_level` — and a value copied between providers is a different amount of reasoning, not the same setting.",
    "A provider can **reject**, **silently ignore**, or **reinterpret** an unsupported parameter. The middle case is the dangerous one: a successful response with behaviour you did not configure.",
    "**An abstraction that drops unknown parameters is worse than no abstraction.** It must raise, or return an explicit list of what it dropped — \"best effort\" is not an acceptable contract for something that changes model behaviour.",
    "The price spread is **100×**, from $0.10 per million input tokens for GPT-6 Luna or Claude Haiku 5.5 to $10.00 for GPT-6 Astra or Claude Fable 5.1 — which is why routing beats almost every other cost optimisation.",
    "**A price is a snapshot with conditions**: launch prices that double on a stated date, a higher rate above 272,000 input tokens, a different tier above 100,000. Record the date and the tier with the number.",
    "**Price per token is not price per task.** Tokenisation differences (22% measured on French), verbosity, retry rates and reasoning tokens billed as output all break the comparison.",
    "In five of the seven task rows, the binding constraint is **not answer quality** — it is latency, context length, privacy or cost.",
    "A portability audit is a set difference and takes an afternoon: on the modelled codebase **Anthropic lost 12 parameters, Google 8 and OpenAI 5** — and the count ranks them backwards, because Anthropic's twelve fail on the first request and all eight of Google's fail silently.",
    "**Switching providers is a project, not a configuration change** — and an abstraction that makes it look like one increases the risk, because the evaluation step gets skipped on the strength of its promise."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service sets `temperature=0` for determinism and is moved, unchanged, to Gemini 4. What happens on the first request?",
        options: ["It returns a 400 naming the parameter", "It returns a 200 and ignores the setting", "It maps the value onto `thinking_level`", "It applies it, as temperature is universal"],
        answer: 1,
        why: "Gemini 3.6 and later accept `temperature`, `top_p` and `top_k`, ignore them and add a deprecation warning header, so the request succeeds and the determinism the code asked for is gone without a message. The 400 in the first option is what a current Claude model does with the same request, and is the better outcome because it is found on the first call. Nothing maps a sampling value onto a depth setting, and the last option was true of every hosted API two years earlier, which is exactly why the code was never revisited." },

      { stem: "Which provider behaviour for an unsupported parameter is most dangerous?",
        options: ["Rejecting the request with a 400", "Silently ignoring it", "Reinterpreting it as something similar", "They are all equally risky"],
        answer: 1,
        why: "A rejection tells you immediately and costs one failed request; a reinterpretation at least produces a related behaviour and is usually documented. Silent ignoring returns HTTP 200 with behaviour that does not match your configuration, so the failure surfaces later as an unexplained quality regression with no error, no alert and nothing in any diff. That asymmetry is why an abstraction layer must raise rather than drop." },

      { stem: "Model A costs $1 per million tokens and model B costs $2. Which is cheaper per task?",
        options: ["A, by definition", "Not determinable from price alone", "B, since it is presumably better", "A, unless it is twice as slow"],
        answer: 1,
        why: "Four things separate rate from cost per task: a model that answers in twice as many tokens costs twice as much at the same rate; tokenisation differs by language, measured at 22% on French; a cheaper model that fails a schema 10% of the time costs 10% more than its rate implies; and a reasoning model bills its reasoning as output, so its cost follows the depth setting rather than the visible answer. The only meaningful comparison is cost per successfully completed task on your own traffic. Latency, in the fourth option, is a real constraint but not a cost per task." },

      { stem: "What should a provider-agnostic wrapper do with a parameter the target cannot honour?",
        options: ["Drop it silently, as best effort", "Raise, or report what was dropped", "Map it to the closest equivalent", "Log it at debug level"],
        answer: 1,
        why: "A parameter that changes model behaviour cannot be dropped on a best-effort basis without the caller knowing, because the result is a valid response that does not do what the code configured — the hardest class of LLM bug to attribute. Automatic mapping is worse still: `frequency_penalty` and `repetition_penalty` are different arithmetic (1.4), so a silent translation produces a different strength of effect than the caller asked for. Debug-level logging is not visible when it matters, which is during an incident three weeks later." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Provider questions are usually really questions about how you handle change — which is why the answer should end at evaluation.",
    questions: [
      { level: "core",
        q: "What differs between providers at the API level?",
        strong: "A strong answer names the specific gaps rather than gesturing at differences, says which ones actually matter, and dates what it knows.",
        answer: [
          { t: "p", text: "The biggest difference today is what each one does with the sampling parameters, and I would date this because it moves. As of late 2026, a current Claude model rejects `temperature`, `top_p` and `top_k` with a 400; Gemini 3.6 and later accept them and ignore them; OpenAI's Responses API still accepts `temperature` and `top_p` but has no `seed`, no stop sequences and no penalties. What all three expose instead is a depth control, under three different names with three different scales." },
          { t: "p", text: "Which of those matter depends on what you rely on. The ones with no substitute are the penalties and `seed` — a feature tuned with `frequency_penalty` to stop repetition has to solve that in the prompt, and reproducibility moves to a pinned model id and a cache. Structured output is a code change on each provider but not a capability loss." },
          { t: "p", text: "The thing I would flag beyond the matrix is the manner of failure. A rejected parameter is found by the first test. An ignored one is found by an evaluation or by a user, so the provider that looks most compatible on paper can be the most dangerous to migrate to." }
        ] },

      { level: "advanced",
        q: "How would you build a provider-agnostic layer?",
        strong: "A strong answer draws the line between what is safely abstractable and what is not, and insists on failing loudly.",
        answer: [
          { t: "p", text: "I would abstract the request shape — messages, roles, tool definitions, streaming — because that part is genuinely mechanical and an SDK earns its place there." },
          { t: "p", text: "I would not abstract the sampling or depth parameters. Keep them per-provider and explicit, because normalising the names while the behaviours differ is actively misleading: it makes two things look interchangeable that are not." },
          { t: "p", text: "And whatever the layer does, it must raise on a parameter the target cannot honour — or at minimum return an explicit list of what it dropped. A wrapper that accepts the union and silently forwards what each backend understands is the design that produces the worst bug in this area: a valid response with behaviour nobody configured, surfacing weeks later as an unexplained quality drift." },
          { t: "p", text: "I have seen exactly that cost a quarter. A well-built wrapper dropped two penalty parameters on a fallback path, output started repeating on 8% of traffic, and because the abstraction promised interchangeability nobody evaluated that path separately. The abstraction being good is what made it dangerous." }
        ] },

      { level: "advanced",
        q: "How do you choose a model for a new feature?",
        strong: "A strong answer starts from constraints rather than benchmarks and ends at a measurement on real inputs.",
        answer: [
          { t: "p", text: "Constraints first, because in most cases quality is not the binding one. Is there a latency budget? A context length that rules models out architecturally? A privacy requirement that rules out hosted models at any price? Those eliminate more candidates than any benchmark." },
          { t: "p", text: "Then the cheapest model that clears the quality bar, tested on my own inputs. Public benchmarks tell you about public benchmarks, and the spread is wide enough to matter — list prices in late 2026 run from $0.10 to $10.00 per million input tokens, a factor of 100." },
          { t: "p", text: "And I would compare cost per completed task, not per token. A cheaper model that is more verbose, or that fails a schema 10% of the time and needs a retry, is not cheaper. Nor is a reasoning model run at a depth the task does not need, since every reasoning token is billed as output." },
          { t: "p", text: "The structural answer, if traffic is mixed, is routing rather than choosing: a cheap model for the easy majority and an expensive one for the rest, with a measured escalation rule. With a 100× price spread that is usually worth more than every other cost optimisation combined, which is 11.9." }
        ] }
    ]
  }
});
