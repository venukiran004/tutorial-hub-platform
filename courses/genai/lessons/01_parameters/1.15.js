EC.receiveLesson({
  id: "1.15",

  lede: "Every parameter in this module exists on some providers and not others, which turns \"switch to a cheaper model\" from a configuration change into a code change. This lesson lays out the reference's support matrix, works out which gaps actually matter, and builds the abstraction that survives a migration — which is not the one most teams reach for first, because the hard part is not translating parameters but knowing when a translation has silently changed the behaviour.",

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
      sub: "The gaps are small in number and awkward in placement" },

    { t: "table",
      head: ["Parameter", "OpenAI", "Anthropic", "Google", "HuggingFace"],
      rows: [
        ["`temperature`", "yes", "yes", "yes", "yes"],
        ["`top_p`", "yes", "yes", "yes", "yes"],
        ["`top_k`", "**no**", "yes", "yes", "yes"],
        ["`frequency_penalty`", "yes", "**no**", "yes", "as `repetition_penalty`"],
        ["`presence_penalty`", "yes", "**no**", "yes", "**no**"],
        ["`max_tokens`", "yes", "yes", "yes", "yes"],
        ["stop sequences", "yes", "yes", "yes", "yes"],
        ["`seed`", "yes", "**no**", "yes", "yes"],
        ["JSON mode", "yes", "**no** — forced tool use", "yes", "guided decoding"],
        ["streaming", "yes", "yes", "yes", "yes"],
        ["tool / function calling", "yes", "yes", "yes", "varies"],
        ["vision", "yes", "yes", "yes", "varies"],
        ["batch API", "yes", "yes", "**no**", "TGI"],
        ["prompt caching", "automatic", "manual `cache_control`", "yes", "**no**"]
      ],
      caption: "From 01_LLM_Parameters.md §15. Five rows have a gap that a naive migration will hit, and three of them change behaviour rather than merely failing." },

    { t: "p", text: "The rows worth internalising are the ones where a parameter is missing on a provider people migrate *to*:" },

    { t: "dl", items: [
      ["`top_k` missing on OpenAI", "Harmless in practice — top-p is the better rule anyway (1.3), and there is no equivalent value to translate. Code written against OpenAI and ported outward gains an option it does not need."],
      ["Penalties missing on Anthropic", "This one bites. A feature tuned with `frequency_penalty=0.5` to break loops has no direct equivalent; the repetition has to be handled in the prompt instead. Anything relying on penalty settings will behave differently after the move."],
      ["`seed` missing on Anthropic", "A reproducibility strategy built on seeds does not port. The mitigation is the one 1.7 already argued for: pin a version, use temperature 0, and cache the output if it genuinely must be identical."],
      ["JSON mode missing on Anthropic", "Not a real gap — forced tool use is equivalent and arguably cleaner (1.8). But the code shape is different enough that it is not a config change."],
      ["No batch API on Google", "A cost strategy built on batching does not transfer, and on an output-heavy workload that is the larger of the two discounts (1.13)."]
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

    { t: "callout", kind: "trap", title: "An abstraction that drops unknown parameters is worse than none",
      body: [
        { t: "p", text: "Many provider-agnostic wrappers accept a superset of parameters and forward what each backend understands. That is the reasonable-looking design that produces the silent case: your `frequency_penalty=0.5` is accepted by the wrapper, dropped before the Anthropic call, and the response comes back successfully with none of the behaviour you configured." },
        { t: "p", text: "The failure surfaces as a quality regression after a routing change, with no error anywhere and nothing in the diff — because nothing in your code changed. It is among the hardest LLM bugs to attribute." },
        { t: "p", text: "The rule: an abstraction must **raise** on a parameter the target cannot honour, or return an explicit list of what it dropped. \"Best effort\" is not an acceptable contract for something that changes model behaviour." }
      ] },

    { t: "code", lang: "python", title: "provider.py — the shape that fails loudly", code: `SUPPORTED = {
    "openai":    {"temperature", "top_p", "frequency_penalty", "presence_penalty",
                  "max_tokens", "stop", "seed", "response_format", "tools"},
    "anthropic": {"temperature", "top_p", "top_k", "max_tokens", "stop", "tools"},
    "google":    {"temperature", "top_p", "top_k", "frequency_penalty",
                  "presence_penalty", "max_tokens", "stop", "seed", "tools"},
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
      hl: [13, 14, 15],
      caption: "`strict=True` by default, so a migration fails in CI rather than in production. The non-strict path logs at warning level and names the parameters, which is the minimum acceptable alternative." },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "choosing", text: "Choosing a model",
      sub: "The constraint that binds is rarely quality" },

    { t: "table",
      head: ["Task type", "Reference's recommendation", "What is actually driving it"],
      rows: [
        ["Simple classification", "GPT-4o-mini / Claude Haiku", "Cheap and fast; the quality ceiling is not the constraint"],
        ["Complex reasoning", "Claude Opus / GPT-4o / o3", "Quality is the constraint and you pay for it"],
        ["Code generation", "Claude Sonnet / GPT-4o", "A capability difference that shows up in evals"],
        ["Ultra-fast (< 500 ms)", "Gemini Flash / GPT-4o-mini", "Latency is the constraint; model size is the lever"],
        ["Long context (100K+)", "Claude (200K) / Gemini (1M+)", "A hard architectural limit, not a preference"],
        ["On-prem / privacy", "Llama 3 / Mistral, self-hosted", "A requirement no hosted model satisfies at any price"],
        ["Cost-sensitive batches", "Batch API on OpenAI or Anthropic", "Scheduling flexibility, not model choice (1.13)"]
      ],
      caption: "From 01_LLM_Parameters.md §16.1. The third column is the useful reading: in five of the seven rows the binding constraint is not answer quality at all." },

    { t: "p", text: "Prices as the reference quotes them, per million input tokens: GPT-4o-mini $0.15, Claude Haiku $0.25, Gemini Flash $0.075, GPT-4o $2.50, Claude Sonnet $3.00, Gemini Pro $1.25, o3 $10.00, Claude Opus $15.00. That is a 200× spread between the cheapest and the most expensive — which is why routing (11.9) is usually worth more than any other cost work." },

    { t: "callout", kind: "insight", title: "Price per token is not price per task",
      body: [
        { t: "p", text: "Four things break the comparison. **Tokenisation** — 1.14 measured the same French text at 73 tokens in one encoding and 57 in another, so a 22% difference in cost per document at identical per-token prices." },
        { t: "p", text: "**Verbosity.** A model that answers in 400 tokens where another uses 200 costs twice as much at the same rate, and output is the expensive side." },
        { t: "p", text: "**Retries.** A cheaper model that fails a schema or needs a second attempt 10% of the time is 10% more expensive than its rate suggests, plus the latency." },
        { t: "p", text: "**Reasoning tokens.** On a reasoning model the visible answer is a small fraction of what you pay for (1.10), so its headline rate understates the real cost by 10–100×." },
        { t: "p", text: "The only comparison that means anything is cost per *successfully completed task*, measured on your own traffic. Everything else is a proxy that can be off by an order of magnitude." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "the-abstraction", text: "How much abstraction is worth building",
      sub: "Less than people build, and in a different place" },

    { t: "p", text: "The instinct on meeting the support matrix is to build a layer that hides it. That is usually the wrong shape, because the differences that matter are not parameter names — they are behaviours, and a layer that normalises the names while the behaviours differ is actively misleading." },

    { t: "ol", items: [
      "**Normalise the request shape**, because that part is genuinely mechanical: messages, roles, tool definitions, streaming. This is where an SDK earns its place.",
      "**Do not normalise the sampling parameters.** Keep them per-provider and explicit. A `temperature` of 0.7 means something different on two models anyway — 1.2 showed that temperature scales whatever logit gaps the model produces — so a shared value is a shared illusion.",
      "**Keep prompts per-provider** if you have tuned them. Models are trained on different chat templates and respond differently to structure; a prompt tuned on one is not tuned on another (2.14).",
      "**Evaluate per-provider, always.** This is the part that cannot be abstracted and the part teams skip. A migration is not done when the code runs; it is done when the eval says the quality held (8.10)."
    ] },

    { t: "p", text: "The honest summary is that switching providers is a project, not a configuration change — and building an abstraction that makes it *look* like a configuration change increases the risk rather than reducing it, because the eval step gets skipped on the strength of the abstraction's promise." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Audit a codebase for portability",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Before a migration is planned, it is worth knowing which parameters a codebase actually depends on — including the ones set once in a default and forgotten." },
        { t: "p", text: "Build the audit: given a set of call sites, report what would break on each provider." }
      ],
      requirements: [
        "Define the support matrix from §01 as data",
        "Model at least five call sites with different parameter sets, including one using penalties and one using seed",
        "For each call site and each provider, report which parameters would be lost",
        "Report which provider requires the fewest changes overall, and which call site is the least portable",
        "State one parameter whose loss changes behaviour rather than merely failing"
      ],
      hint: "Set difference per call site per provider. The interesting output is the aggregate: which single call site blocks the most migrations.",
      solution: { lang: "python", title: "g115_ex.py",
        code: `SUPPORTED = {
    "openai":    {"temperature", "top_p", "frequency_penalty", "presence_penalty",
                  "max_tokens", "stop", "seed", "response_format", "tools"},
    "anthropic": {"temperature", "top_p", "top_k", "max_tokens", "stop", "tools"},
    "google":    {"temperature", "top_p", "top_k", "frequency_penalty",
                  "presence_penalty", "max_tokens", "stop", "seed", "tools"},
}

CALL_SITES = {
    "classify":   {"temperature", "max_tokens", "response_format"},
    "summarise":  {"temperature", "top_p", "frequency_penalty", "presence_penalty",
                   "max_tokens"},
    "extract":    {"temperature", "seed", "response_format", "max_tokens"},
    "chat":       {"temperature", "top_p", "max_tokens", "stop", "tools"},
    "brainstorm": {"temperature", "top_p", "frequency_penalty", "max_tokens"},
}

print("%-12s %-28s %-28s" % ("call site", "lost on anthropic", "lost on google"))
blocked = {}
for name, params in CALL_SITES.items():
    row = []
    for prov in ("anthropic", "google"):
        lost = sorted(params - SUPPORTED[prov])
        row.append(", ".join(lost) if lost else "-")
        blocked[name] = blocked.get(name, 0) + len(lost)
    print("%-12s %-28s %-28s" % (name, row[0], row[1]))

print()
for prov in ("anthropic", "google"):
    total = sum(len(p - SUPPORTED[prov]) for p in CALL_SITES.values())
    sites = sum(1 for p in CALL_SITES.values() if p - SUPPORTED[prov])
    print("%-10s: %d parameters lost across %d of %d call sites"
          % (prov, total, sites, len(CALL_SITES)))

worst = max(blocked, key=blocked.get)
print()
print("least portable call site: %r (%d parameters lost in total)"
      % (worst, blocked[worst]))`,
        out: `call site    lost on anthropic            lost on google
classify     response_format              response_format
summarise    frequency_penalty, presence_penalty -
extract      response_format, seed        response_format
chat         -                            -
brainstorm   frequency_penalty            -

anthropic : 6 parameters lost across 4 of 5 call sites
google    : 2 parameters lost across 2 of 5 call sites

least portable call site: 'extract' (3 parameters lost in total)`,
        notes: [
          { t: "p", text: "Google is the cheaper migration by this measure — 2 parameters lost across 2 call sites against Anthropic's 6 across 4 — and the only thing it loses is `response_format`, which has a direct equivalent. Anthropic loses penalties and `seed` as well, and those are the ones with no translation." },
          { t: "p", text: "The `chat` call site is fully portable, which is worth noting because it is the one people worry about. By raw count the least portable is `extract`, losing three parameters across the two targets — but the count is the wrong ranking, because `response_format` and `seed` both have documented substitutes. The genuinely blocking site is `summarise`, whose penalties have no Anthropic equivalent at all: a summariser tuned to break loops with `frequency_penalty=0.5` has to solve that problem in the prompt after the move." },
          { t: "p", text: "The parameter whose loss **changes behaviour** rather than failing is `frequency_penalty`. `response_format` and `seed` fail visibly or have a documented substitute; a dropped penalty produces a successful response that repeats itself, and nothing anywhere says why. That is the silent case from §02, and it is why a portability audit should rank by whether a substitute exists rather than by how many names are lost — the raw count puts `extract` first and the real risk is `summarise`." }
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
    "**`top_k` is not available on OpenAI**; penalties and `seed` are not available on Anthropic; there is **no batch API on Google**; and HuggingFace has no prompt caching.",
    "Anthropic has **no JSON mode** — forced tool use is the equivalent (1.8), and it is arguably cleaner, but it is a code change rather than a config change.",
    "A provider can **reject**, **silently ignore**, or **reinterpret** an unsupported parameter. The middle case is the dangerous one: a successful response with behaviour you did not configure.",
    "**An abstraction that drops unknown parameters is worse than no abstraction.** It must raise, or return an explicit list of what it dropped — \"best effort\" is not an acceptable contract for something that changes model behaviour.",
    "The reference's price spread is **200×** from Gemini Flash at $0.075 per million input tokens to Claude Opus at $15.00 — which is why routing beats almost every other cost optimisation.",
    "**Price per token is not price per task.** Tokenisation differences (22% measured on French), verbosity, retry rates and hidden reasoning tokens all break the comparison.",
    "In five of the reference's seven task rows, the binding constraint is **not answer quality** — it is latency, context length, privacy or cost.",
    "Normalise the request *shape*; do not normalise the sampling parameters. A `temperature` of 0.7 means something different on two models, because temperature scales whatever logit gaps that model produces.",
    "A portability audit is a set difference and takes an afternoon: on the modelled codebase, **Anthropic lost 6 parameters across 4 of 5 call sites; Google lost 2 across 2** — and the raw count ranks the wrong site as least portable, because only the penalties have no substitute.",
    "**Switching providers is a project, not a configuration change** — and an abstraction that makes it look like one increases the risk, because the evaluation step gets skipped on the strength of its promise."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You migrate a summariser using `frequency_penalty=0.5` from OpenAI to Anthropic. What happens?",
        options: ["The parameter is translated to an equivalent", "Anthropic does not support it; depending on your client it errors or is silently dropped, and the output starts repeating", "The request fails with a clear error, always", "Nothing — penalties are applied client-side"],
        answer: 1,
        why: "Anthropic supports neither `frequency_penalty` nor `presence_penalty`, and whether you find out depends entirely on your client: a strict SDK errors, a permissive wrapper drops it and returns a successful response with the loop-breaking behaviour gone. There is no equivalent to translate to — the repetition has to move into the prompt. The third option is too optimistic about tooling, and it is precisely the assumption behind the quarter-long quality regression in §04. Penalties are applied server-side during sampling, not by any client." },

      { stem: "Which provider behaviour for an unsupported parameter is most dangerous?",
        options: ["Rejecting the request with a 400", "Silently ignoring it and returning a normal response", "Reinterpreting it as a similar parameter", "They are equally risky"],
        answer: 1,
        why: "A rejection tells you immediately and costs one failed request; a reinterpretation at least produces a related behaviour and is usually documented. Silent ignoring returns HTTP 200 with behaviour that does not match your configuration, so the failure surfaces later as an unexplained quality regression with no error, no alert and nothing in any diff. That asymmetry is why an abstraction layer must raise rather than drop." },

      { stem: "Model A costs $1 per million tokens and model B costs $2. Which is cheaper per task?",
        options: ["A, by definition", "Not determinable — verbosity, tokenisation, retry rate and hidden reasoning tokens all break the comparison", "B, since it is presumably better", "A, unless it is more than twice as slow"],
        answer: 1,
        why: "Four things separate rate from cost per task: a model that answers in twice as many tokens costs twice as much at the same rate; tokenisation differs by language, measured at 22% on French; a cheaper model that fails a schema 10% of the time costs 10% more than its rate implies; and a reasoning model's hidden tokens can be 10–100× the visible answer. The only meaningful comparison is cost per successfully completed task on your own traffic. Latency, in the fourth option, is a real constraint but not a cost per task." },

      { stem: "What should a provider-agnostic wrapper do with a parameter the target cannot honour?",
        options: ["Drop it silently — best effort is the point of an abstraction", "Raise by default, or return an explicit list of what was dropped", "Map it to the closest equivalent automatically", "Log it at debug level"],
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
        strong: "A strong answer names the specific gaps rather than gesturing at differences, and says which ones actually matter.",
        answer: [
          { t: "p", text: "The specific gaps: OpenAI does not accept `top_k`. Anthropic has no frequency or presence penalty, no `seed`, and no JSON mode — forced tool use is the substitute. Google has no batch API. HuggingFace has no prompt caching." },
          { t: "p", text: "Which of those matter depends on what you rely on. The `top_k` gap is harmless because top-p is the better rule anyway. The JSON mode gap is a code change but not a capability loss. The ones with no substitute are the penalties and `seed` — a feature tuned with `frequency_penalty` to stop repetition has to solve that in the prompt after moving to Anthropic." },
          { t: "p", text: "The thing I would flag beyond the matrix is that even the shared parameters are not identical. A `temperature` of 0.7 scales whatever logit gaps the model produces, and those differ between models — so the same value is not the same behaviour, and that is not something a compatibility table can capture." }
        ] },

      { level: "advanced",
        q: "How would you build a provider-agnostic layer?",
        strong: "A strong answer draws the line between what is safely abstractable and what is not, and insists on failing loudly.",
        answer: [
          { t: "p", text: "I would abstract the request shape — messages, roles, tool definitions, streaming — because that part is genuinely mechanical and an SDK earns its place there." },
          { t: "p", text: "I would not abstract the sampling parameters. Keep them per-provider and explicit, because normalising the names while the behaviours differ is actively misleading: it makes two things look interchangeable that are not." },
          { t: "p", text: "And whatever the layer does, it must raise on a parameter the target cannot honour — or at minimum return an explicit list of what it dropped. A wrapper that accepts the union and silently forwards what each backend understands is the design that produces the worst bug in this area: a valid response with behaviour nobody configured, surfacing weeks later as an unexplained quality drift." },
          { t: "p", text: "I have seen exactly that cost a quarter. A well-built wrapper dropped two penalty parameters on a fallback path, output started repeating on 8% of traffic, and because the abstraction promised interchangeability nobody evaluated that path separately. The abstraction being good is what made it dangerous." }
        ] },

      { level: "advanced",
        q: "How do you choose a model for a new feature?",
        strong: "A strong answer starts from constraints rather than benchmarks and ends at a measurement on real inputs.",
        answer: [
          { t: "p", text: "Constraints first, because in most cases quality is not the binding one. Is there a latency budget? A context length that rules models out architecturally? A privacy requirement that rules out hosted models at any price? Those eliminate more candidates than any benchmark." },
          { t: "p", text: "Then the cheapest model that clears the quality bar, tested on my own inputs. Public benchmarks tell you about public benchmarks, and the spread is wide enough to matter — the reference's own table runs from $0.075 to $15.00 per million input tokens, a factor of 200." },
          { t: "p", text: "And I would compare cost per completed task, not per token. A cheaper model that is more verbose, or that fails a schema 10% of the time and needs a retry, is not cheaper. Nor is a reasoning model whose headline rate excludes 10–100× in hidden tokens." },
          { t: "p", text: "The structural answer, if traffic is mixed, is routing rather than choosing: a cheap model for the easy majority and an expensive one for the rest, with a measured escalation rule. With a 200× price spread that is usually worth more than every other cost optimisation combined, which is 11.9." }
        ] }
    ]
  }
});
