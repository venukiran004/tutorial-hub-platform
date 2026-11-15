/* ============================================================================
   LESSON 3.1 — Gemini, Generation Config and Model Choice
   Field lists and registry behaviour introspected from google-adk 2.9.2 and
   google-genai 2.25.0.
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**`model=\"gemini-3.8-flash\"` is a string that ADK resolves to a class, and `generate_content_config` is where every knob the model has actually lives.** The registry maps a model id to an implementation by regular expression, so `gemini-*` becomes `Gemini`, `claude-*` becomes `Claude` and `gemma-*` becomes `Gemma` without you importing anything. The config is the Gen AI SDK's own `GenerateContentConfig` — thirty-five fields, of which about eight matter for agents. This lesson covers which model to pick for which job, what each config field does to an agent's behaviour, and the two settings that quietly change cost more than anything else.",

  objectives: [
    "Explain how a model string is resolved to an implementation, and register your own",
    "Set max_output_tokens, safety settings and the thinking level where ADK reads them, and say which sampling fields current Gemini models ignore",
    "Choose a model for a router, a drafter and a classifier, with reasons",
    "Describe what thinking config costs and buys",
    "Configure a fallback model and say when it helps"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "From a string to an implementation", id: "registry" },

    { t: "code", lang: "python", title: "The registry, asked directly",
      code: `from google.adk.models import LLMRegistry, Gemini

print(Gemini.supported_models())
print(LLMRegistry.resolve("gemini-3.8-flash").__name__)
print(LLMRegistry.resolve("claude-sonnet-5-5").__name__)
print(LLMRegistry.resolve("gemma-3-27b-it").__name__)` },

    { t: "out", text: `['gemini-.*', 'gemma-4.*', 'model-optimizer-.*',
 'projects/.+/locations/.+/endpoints/.+',
 'projects/.+/locations/.+/publishers/google/models/gemini.+']
Gemini
Claude
Gemma` },

    { t: "p", text: "Each `BaseLlm` subclass declares the patterns it handles and the registry matches the string against them — which is why a Vertex AI endpoint path resolves to `Gemini` too. `LLMRegistry.register(MyLlm)` adds your own, and passing a `BaseLlm` **instance** as `model=` bypasses the registry entirely, which is how the scripted model in this course works." },

    { t: "diagram", kind: "flow", title: "Three ways to set a model",
      caption: "A string is the common case. An instance is what you need for LiteLLM, for a fallback wrapper, for client options like a custom base_url, and for tests.",
      cols: 3,
      nodes: [
        { id: "s", label: "model=\"gemini-3.8-flash\"", sub: "resolved by the registry", tone: "accent" },
        { id: "i", label: "model=Gemini(model=…, retry_options=…)", sub: "an instance: full control", tone: "good" },
        { id: "l", label: "model=LiteLlm(model=\"openai/gpt-6.1-sol\")", sub: "another provider entirely", tone: "warn" }
      ],
      edges: [] },

    { t: "h2", n: "02", text: "Which model for which agent", id: "choice" },

    {"kind": "matrix", "title": "Different agents want different models", "caption": "In a multi-agent system these are separate LlmAgent objects, so they can be separate models. Moving the deterministic-shaped agents to a cheaper one is usually the largest available saving (lesson 12.4).", "cols": ["Wants", "Tolerates"], "rows": ["Classifier", "Coordinator", "Tool user", "Drafting agent"], "cells": [[{"text": "cheap and fast", "tone": "good"}, {"text": "a small model", "tone": "good"}], [{"text": "good routing", "tone": "warn"}, {"text": "no shortcuts", "tone": "crit"}], [{"text": "function calling", "tone": "crit"}, {"text": "no shortcuts", "tone": "crit"}], [{"text": "strong writing", "tone": "accent"}, {"text": "higher latency", "tone": "good"}]], "t": "diagram", "id": "dg-3_1-02-0"},





    { t: "table", head: ["Job", "Wants", "Typical choice"],
      rows: [
        ["Routing / classification", "Speed and cost; the decision is easy", "The smallest current Flash-class model; often the cheapest tier available"],
        ["Tool-using conversation", "Reliable function calling, decent reasoning", "The mainstream Flash model — the default for most agents"],
        ["Drafting, analysis, planning", "Reasoning quality", "The top-tier model, at a high thinking level"],
        ["Extraction from documents", "Long context and multimodal input", "A model with a large context window (lesson 3.2)"],
        ["Anything with strict latency", "Fewest tokens and the least thinking", "A Flash-class model at its lowest thinking level, with a short instruction"]
      ] },

    { t: "p", text: "Model names move quickly and any specific id in a course ages badly; what does not change is the shape of the decision. **Use the cheap model wherever the decision is easy and the strong model only where reasoning is the product** — which, as lesson 2.6 noted, is only possible if those are separate agents. A single agent doing routing and drafting pays the strong model's price for both." },

    { t: "p", text: "For the record, in November 2026 the three tiers are `gemini-3.5-flash-lite`, `gemini-3.8-flash` and `gemini-4-carbon`. The Gemini 2.5 ids that older ADK examples use are switched off on 1 December 2026, which is the ageing this paragraph warns about, on schedule." },

    { t: "h2", n: "03", text: "generate_content_config", id: "config" },

    {"kind": "trace", "title": "Six settings, and the two that move cost most are not in the config", "caption": "**`max_output_tokens` caps one reply, and the bill is dominated by input** — so tuning output caps while sending fifty turns of history and fourteen tool declarations is optimising the smaller half. The two settings that control spend most live elsewhere: how much conversation you send (`include_contents`, compaction and caching) and how many declarations ride along on every call. **The sampling row is the one that changed:** Gemini 3.6 and later ignore `temperature`, `top_p` and `top_k`, so an agent's consistency now comes from its instruction and its thinking level, not from a low temperature.", "left": "setting", "codeW": 190, "vars": ["what it controls", "effect on cost"], "steps": [{"code": "thinking_level", "state": ["how long it reasons before it acts", "real"], "tone": "good"}, {"code": "max_output_tokens", "state": ["one reply, thinking included", "small"], "changed": [0, 1], "tone": "warn"}, {"code": "temperature, top_p, top_k", "state": ["ignored by Gemini 3.6+ and 4", "none"], "changed": [0, 1], "tone": "accent"}, {"code": "safety_settings", "state": ["per-category thresholds", "none"], "changed": [0, 1], "tone": "accent"}, {"code": "how much history you send", "state": ["include_contents, compaction, caching", "LARGE"], "changed": [0, 1], "tone": "crit"}, {"code": "how many tool declarations", "state": ["every call carries all of them", "LARGE"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-3_1-03-1"},

    { t: "code", lang: "python", title: "Where the knobs go",
      code: `from google.genai import types
from google.adk.agents import LlmAgent

agent = LlmAgent(
    name="analyst",
    model="gemini-4-carbon",
    instruction="Analyse the data and answer precisely.",
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=4000,          # one reply — and thinking tokens count against it
        stop_sequences=["END"],
        safety_settings=[...],           # per-category thresholds
        thinking_config=types.ThinkingConfig(thinking_level="high"),
        seed=42,                         # reproducibility, where the provider honours it
        # no temperature, top_p or top_k: Gemini 3.6+ and 4 ignore them
    ),
)`,
      caption: "`GenerateContentConfig` has 35 fields in google-genai 2.25.0; ADK merges its own — the system instruction and the tool declarations — into the same object when it builds the request, which is why you should not set `system_instruction` or `tools` here yourself." },

    { t: "dl", items: [
      ["`temperature`, `top_p`, `top_k`", "Still fields on the object, and no longer read by the models you are most likely to use: Gemini 3.6 and later, and Gemini 4, ignore them and return a deprecation warning header, and Google's guidance is to remove them and state the rules you want followed in the instruction. Where a model still honours temperature — Gemma, or an open-weight model behind LiteLLM — keep it below about 0.3 for anything that calls tools. On a current Claude model the same field is rejected outright."],
      ["`max_output_tokens`", "Caps one reply, and on a thinking model the thinking tokens count against it — so a cap sized for the visible answer alone can return a truncated reply, or an empty one. It does **not** cap the conversation or the cost of the input, which is usually the larger half. A reply cut off mid-JSON by this limit is a common structured-output bug."],
      ["`safety_settings`", "Per-category thresholds. Agents that handle legitimate but sensitive material — medical, legal, security — are the usual reason to loosen a category, and doing so is a decision to document (lesson 9.2)."],
      ["`thinking_config`", "`thinking_level` sets how much the model reasons before it answers: `minimal`, `low`, `medium` or `high`, with the available range depending on the model — the top-tier model has no off switch. It replaced the token-count `thinking_budget` of the Gemini 2.5 models. Higher levels improve multi-step decisions and cost both latency and thinking tokens, which are billed as output; give a router or a classifier the lowest level its model offers."],
      ["`seed`", "Reproducibility where the provider supports it — useful for evaluation runs, not a guarantee."],
      ["`labels`", "Arbitrary key-values attached to the request, which show up in billing and monitoring. The cheapest way to attribute model spend per agent or per feature."]
    ] },

    { t: "callout", kind: "trap", title: "The two settings that move cost most are not in this config",
      body: [{ t: "p", text: "`max_output_tokens` caps the reply; the bill is dominated by input. The two things that actually control it are **how much conversation you send** (`include_contents`, compaction and caching — lessons 2.1 and 5.6) and **how many tool declarations ride along on every call** (lesson 2.6). Tuning output caps and thinking levels while sending fifty turns and fourteen tools is optimising the wrong half." }] },

    { t: "h2", n: "04", text: "Thinking, and when to pay for it", id: "thinking" },

    { t: "diagram", kind: "compare", title: "A high thinking level, and a low one",
      caption: "Thinking tokens are billed and add latency before the first output token. The gain is on decisions with several steps; the loss is on everything that was already easy.",
      columns: [
        { title: "Worth it", tone: "good", items: ["planning a multi-step task", "choosing among many similar tools", "analysis with arithmetic", "a supervisor checking a specialist's work"] },
        { title: "Not worth it", tone: "warn", items: ["routing between three specialists", "classification into known labels", "extraction against a schema", "anything with a latency budget"] }
      ] },

    { t: "p", text: "ADK exposes this twice: `thinking_config` in the generation config, and `BuiltInPlanner`, which is the planner wrapper around the same setting (lesson 2.1). For models without native thinking, `PlanReActPlanner` prompts the plan-then-act loop instead, at the cost of ordinary output tokens. The level is set per agent, which is the point: a router at the lowest level and a planner at the highest can sit in the same system." },

    { t: "h2", n: "05", text: "Fallbacks and retries", id: "fallback" },

    {"kind": "flow", "title": "Two layers of resilience, and the quality drop neither of them reports", "caption": "**Retry first, fall back second** — per-request retry options handle the transient error inside one model, and `FallbackModel` handles the case where that model is simply unavailable. Both protect availability. **Neither protects the answer:** a fallback to a weaker model succeeds, returns something worse, and nothing in the invocation says so. That makes recording which model actually answered a requirement rather than a nicety, because otherwise a quota incident presents as a mysterious week of degraded quality.", "cols": 3, "nodes": [{"id": "e", "label": "A 429 or a 503", "sub": "quota, or a transient fault", "tone": "crit"}, {"id": "r", "label": "First: retry within the model", "sub": "Gemini(retry_options=...)", "tone": "good"}, {"id": "f", "label": "Then: FallbackModel to the next", "sub": "on retriable_status_codes", "tone": "good"}, {"id": "s", "label": "The invocation succeeds", "sub": "availability preserved", "tone": "good"}, {"id": "q", "label": "On a weaker model, silently", "sub": "a worse answer, no error", "tone": "crit"}, {"id": "l", "label": "So record which model answered", "sub": "or the drop is invisible", "tone": "violet"}], "edges": [["e", "r"], ["r", "f"], ["f", "s"], ["s", "q"], ["q", "l"]], "t": "diagram", "id": "dg-3_1-05-2"},

    { t: "code", lang: "python", title: "FallbackModel: a second model when the first fails",
      code: `from google.adk.models import FallbackModel, Gemini

print(list(FallbackModel.model_fields))
# ['model', 'models', 'retriable_status_codes']

resilient = FallbackModel(
    models=[Gemini(model="gemini-4-carbon"), Gemini(model="gemini-3.8-flash")],
    retriable_status_codes=[429, 503],
)
agent = LlmAgent(name="resilient", model=resilient, instruction="…")`,
      caption: "A `BaseLlm` that wraps several: on a retriable status it moves to the next. Introspected from 2.9.2 — the field is `models`, plural, and `retriable_status_codes` decides what counts as worth falling back on." },

    { t: "dl", items: [
      ["What it protects against", "Quota exhaustion and transient provider errors on one model, by degrading to another rather than failing the invocation."],
      ["What it does not fix", "A bad answer. A fallback to a weaker model succeeds and returns something worse, which is a silent quality drop unless you record which model answered (lesson 11.1)."],
      ["Per-request retries", "`Gemini(retry_options=…)` handles the transient-error case within one model, which is the first line; a fallback is the second."],
      ["The run-level cap", "`RunConfig(max_llm_calls=…)` bounds how many model calls one invocation may make at all — the backstop against a loop that will not terminate (lesson 10.3)."]
    ] },

    { t: "exercise", kind: "practice", title: "Configure three agents for cost", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "You have a three-agent system: a router, a drafter and a fact-checker. Assign each a model class (cheap / mainstream / strong), a thinking level and a `max_output_tokens`, and justify each in one line. Then state which single change to the system would reduce cost more than all of these settings combined." }],
      requirements: ["Three configurations", "One line of justification per setting", "The one bigger change, named"],
      hint: "The router's whole output is one agent name.",
      solution: { lang: "python", title: "Solution",
        code: `router   = LlmAgent(name="router", model=FLASH_LITE, sub_agents=[...],
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=256,      # one transfer call, plus room for minimal thinking
        thinking_config=types.ThinkingConfig(thinking_level="minimal")))   # nothing to think about

drafter  = LlmAgent(name="drafter", model=TOP,
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=6000,     # the draft AND the reasoning that precedes it
        thinking_config=types.ThinkingConfig(thinking_level="high")))      # multi-step reasoning

checker  = LlmAgent(name="checker", model=FLASH, include_contents="none",
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=1024,     # verdict + reason, against the draft only
        thinking_config=types.ThinkingConfig(thinking_level="low")))

# no temperature anywhere: current Gemini models ignore it. The router's consistency
# comes from its instruction and from sub-agent descriptions that do not overlap.

# the bigger change: include_contents="none" on the router and the checker, plus
# splitting the tool list so each agent's declarations are short. Input tokens
# dominate the bill; the conversation and the declarations are the input.`,
        notes: [{ t: "p", text: "The point of the exercise is the last comment. Thinking levels and output caps are worth setting — and the caps have to leave room for the thinking — but on a long conversation with a large toolbox they are rounding errors next to what is being re-sent on every call." }] } }
  ],

  takeaways: [
    "A model string is resolved by LLMRegistry against each BaseLlm subclass's supported_models patterns; passing an instance bypasses it.",
    "generate_content_config is the Gen AI SDK's GenerateContentConfig; ADK merges the system instruction and tool declarations into it, so do not set those yourself.",
    "Gemini 3.6 and later ignore temperature, top_p and top_k; an agent's consistency comes from its instruction and thinking level. Where a model still honours temperature, keep it low for anything that calls tools.",
    "max_output_tokens caps one reply, thinking tokens included, and not the conversation; a truncated JSON answer is usually this limit.",
    "thinking_level (minimal, low, medium, high) buys multi-step reasoning and costs latency and tokens; give routers, classifiers and extractors the lowest level their model offers.",
    "FallbackModel(models=[…], retriable_status_codes=[…]) degrades to another model on quota or transient errors — and silently lowers quality unless you record which model answered.",
    "Input tokens dominate cost: how much conversation and how many tool declarations you send matter more than any generation setting."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How does ADK turn model='claude-sonnet-5-5' into an implementation?",
      options: ["It always uses Gemini, whatever the string", "LLMRegistry matches supported_models patterns", "It reads the class from an environment variable", "It fails, since only Gemini strings are supported"],
      answer: 1,
      why: "Each model class declares regular expressions it handles, and the registry resolves the string against them: gemini-* to Gemini, claude-* to Claude, gemma-* to Gemma. You can register your own class, and passing a BaseLlm instance as model= skips resolution entirely." },
    { stem: "Which of these should you not put in generate_content_config?",
      options: ["thinking_config and seed", "max_output_tokens", "system_instruction, tools", "safety_settings and labels"],
      answer: 2,
      why: "ADK builds those two itself: the system instruction is assembled from the agent's instructions and the framework's framing, and the tool declarations are generated from the agent's tools. Setting them in the config fights the framework and, for response_schema specifically, ADK raises and tells you to use output_schema instead." },
    { stem: "An agent's structured JSON answers are occasionally cut off mid-object. What is the most likely cause?",
      options: ["The thinking level is set too low", "max_output_tokens is too low for the reply", "The model does not support JSON output", "The session service truncated the answer"],
      answer: 1,
      why: "max_output_tokens caps the reply, and a truncated reply is invalid JSON — which then fails schema validation with a confusing error. Size the cap against the largest legitimate output plus the thinking that precedes it, since thinking tokens count against the same cap, and remember it does nothing about input cost, which is usually the larger half of the bill." },
    { stem: "For which agent is a high thinking level least worth paying for?",
      options: ["A planner that decomposes a task", "A supervisor checking a specialist's work", "A router choosing between three specialists", "An analyst doing multi-step arithmetic"],
      answer: 2,
      why: "Routing between a few well-described specialists is a one-step decision: thinking tokens add latency and cost without improving it. Thinking pays where several steps must be composed before answering — planning, checking, analysis." }
  ] },

  interview: { title: "Interview", sub: "Model-selection questions", questions: [
    { level: "Core", q: "How do you decide which model an agent should use?",
      strong: "By the difficulty of the decision it makes, not by the importance of the feature: cheap for routing and classification, strong for reasoning and drafting.",
      answer: [{ t: "p", text: "I would split the system so that different jobs can have different models, then match each one. Routing between a handful of well-described specialists is easy and high-volume, so it gets the cheapest fast model at its lowest thinking level, with a small output cap. Tool-using conversation gets the mainstream Flash-class model, where function-calling reliability matters more than raw reasoning. Drafting, planning and analysis get the top-tier model at a high thinking level, because that is where quality is the product. The mistake to avoid is a single agent doing all three: it pays the strong model's price on every routing turn, and there is no way to tune the settings separately." }] },
    { level: "Core", q: "What does ADK put into generate_content_config that you did not?",
      strong: "The assembled system instruction and the generated tool declarations.",
      answer: [{ t: "p", text: "When ADK builds an LlmRequest it fills the config's system_instruction with the assembled instruction — global instruction, your instruction with state interpolated, its own agent framing and any transfer guidance — and fills tools with a declaration generated from every tool the agent has, including transfer_to_agent when it has sub-agents. That is why those two fields are not yours to set, and why reading a recorded request is the only reliable way to see what the model was really given. Everything else in the config — token limits, safety, thinking, seed, labels — is passed through as you wrote it, though passing something through is not the same as the model reading it: current Gemini models ignore the sampling fields." }] },
    { level: "Senior", q: "Your agent platform's model bill has tripled while traffic is flat. Where do you look?",
      strong: "Input tokens: conversation length, tool declarations, retries and thinking — not the generation settings.",
      answer: [{ t: "p", text: "Output caps cannot cause that, so it is input, call count or thinking. First, conversation growth: an agent with include_contents='default' re-sends the whole history every call, so a product change that makes sessions longer multiplies cost quadratically across a tool chain — compaction and context caching are the fixes. Second, tool declarations: someone adding four tools to a shared agent adds those schemas to every call of every turn. Third, call count: a new loop or a retry policy that fires often, visible as calls per invocation in the traces; max_llm_calls bounds the pathological case. Fourth, thinking: raising the level globally rather than per agent is an easy accidental tripling, because thinking tokens are billed as output. I would attribute spend with request labels per agent, then compare tokens-in per invocation before and after the change rather than guessing." }] }
  ] }
});
