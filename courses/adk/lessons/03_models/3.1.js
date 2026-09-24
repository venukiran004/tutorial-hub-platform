/* ============================================================================
   LESSON 3.1 — Gemini, Generation Config and Model Choice
   Field lists and registry behaviour introspected from google-adk 2.9.2 and
   google-genai 2.25.0.
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**`model=\"gemini-2.5-flash\"` is a string that ADK resolves to a class, and `generate_content_config` is where every knob the model has actually lives.** The registry maps a model id to an implementation by regular expression, so `gemini-*` becomes `Gemini`, `claude-*` becomes `Claude` and `gemma-*` becomes `Gemma` without you importing anything. The config is the Gen AI SDK's own `GenerateContentConfig` — thirty-five fields, of which about eight matter for agents. This lesson covers which model to pick for which job, what each config field does to an agent's behaviour, and the two settings that quietly change cost more than anything else.",

  objectives: [
    "Explain how a model string is resolved to an implementation, and register your own",
    "Set temperature, max_output_tokens, safety settings and thinking config where ADK reads them",
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
print(LLMRegistry.resolve("gemini-2.5-flash").__name__)
print(LLMRegistry.resolve("claude-3-5-sonnet@20240620").__name__)
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
        { id: "s", label: "model=\"gemini-2.5-flash\"", sub: "resolved by the registry", tone: "accent" },
        { id: "i", label: "model=Gemini(model=…, retry_options=…)", sub: "an instance: full control", tone: "good" },
        { id: "l", label: "model=LiteLlm(model=\"openai/gpt-4o\")", sub: "another provider entirely", tone: "warn" }
      ],
      edges: [] },

    { t: "h2", n: "02", text: "Which model for which agent", id: "choice" },

    {"kind": "matrix", "title": "Different agents want different models", "caption": "In a multi-agent system these are separate LlmAgent objects, so they can be separate models. Moving the deterministic-shaped agents to a cheaper one is usually the largest available saving (lesson 12.4).", "cols": ["Wants", "Tolerates"], "rows": ["Classifier", "Coordinator", "Tool user", "Drafting agent"], "cells": [[{"text": "cheap and fast", "tone": "good"}, {"text": "a small model", "tone": "good"}], [{"text": "good routing", "tone": "warn"}, {"text": "no shortcuts", "tone": "crit"}], [{"text": "function calling", "tone": "crit"}, {"text": "no shortcuts", "tone": "crit"}], [{"text": "strong writing", "tone": "accent"}, {"text": "higher latency", "tone": "good"}]], "t": "diagram", "id": "dg-3_1-02-0"},



    { t: "table", head: ["Job", "Wants", "Typical choice"],
      rows: [
        ["Routing / classification", "Speed and cost; the decision is easy", "The smallest current Flash-class model; often the cheapest tier available"],
        ["Tool-using conversation", "Reliable function calling, decent reasoning", "The mainstream Flash model — the default for most agents"],
        ["Drafting, analysis, planning", "Reasoning quality", "The Pro-class model, with thinking enabled"],
        ["Extraction from documents", "Long context and multimodal input", "A model with a large context window (lesson 3.2)"],
        ["Anything with strict latency", "Fewest tokens and no thinking", "Flash with `thinking_config` off and a short instruction"]
      ] },

    { t: "p", text: "Model names move quickly and any specific id in a course ages badly; what does not change is the shape of the decision. **Use the cheap model wherever the decision is easy and the strong model only where reasoning is the product** — which, as lesson 2.6 noted, is only possible if those are separate agents. A single agent doing routing and drafting pays the strong model's price for both." },

    { t: "h2", n: "03", text: "generate_content_config", id: "config" },

    { t: "code", lang: "python", title: "Where the knobs go",
      code: `from google.genai import types
from google.adk.agents import LlmAgent

agent = LlmAgent(
    name="analyst",
    model="gemini-2.5-pro",
    instruction="Analyse the data and answer precisely.",
    generate_content_config=types.GenerateContentConfig(
        temperature=0.2,                 # low: consistent tool choice and wording
        max_output_tokens=800,           # a cap on the answer, not on the conversation
        top_p=0.95,
        stop_sequences=["END"],
        safety_settings=[...],           # per-category thresholds
        thinking_config=types.ThinkingConfig(thinking_budget=2048),
        seed=42,                         # reproducibility, where the provider honours it
    ),
)`,
      caption: "`GenerateContentConfig` has 35 fields in google-genai 2.25.0; ADK merges its own — the system instruction and the tool declarations — into the same object when it builds the request, which is why you should not set `system_instruction` or `tools` here yourself." },

    { t: "dl", items: [
      ["`temperature`", "Below about 0.3 for agents. Tool-calling accuracy and instruction-following both degrade as it rises, and an agent's creativity is rarely the point. Raise it only for an agent whose job is drafting prose."],
      ["`max_output_tokens`", "Caps one reply. It does **not** cap the conversation or the cost of the input, which is usually the larger half. A reply cut off mid-JSON by this limit is a common structured-output bug."],
      ["`safety_settings`", "Per-category thresholds. Agents that handle legitimate but sensitive material — medical, legal, security — are the usual reason to loosen a category, and doing so is a decision to document (lesson 9.2)."],
      ["`thinking_config`", "Lets a reasoning-capable model spend tokens thinking before answering. It improves multi-step decisions and costs both latency and thinking tokens; turn it off for routers and classifiers."],
      ["`seed`", "Reproducibility where the provider supports it — useful for evaluation runs, not a guarantee."],
      ["`labels`", "Arbitrary key-values attached to the request, which show up in billing and monitoring. The cheapest way to attribute model spend per agent or per feature."]
    ] },

    { t: "callout", kind: "trap", title: "The two settings that move cost most are not in this config",
      body: [{ t: "p", text: "`max_output_tokens` caps the reply; the bill is dominated by input. The two things that actually control it are **how much conversation you send** (`include_contents`, compaction and caching — lessons 2.1 and 5.6) and **how many tool declarations ride along on every call** (lesson 2.6). Tuning temperature and output caps while sending fifty turns and fourteen tools is optimising the wrong half." }] },

    { t: "h2", n: "04", text: "Thinking, and when to pay for it", id: "thinking" },

    { t: "diagram", kind: "compare", title: "Thinking on and off",
      caption: "Thinking tokens are billed and add latency before the first output token. The gain is on decisions with several steps; the loss is on everything that was already easy.",
      columns: [
        { title: "Worth it", tone: "good", items: ["planning a multi-step task", "choosing among many similar tools", "analysis with arithmetic", "a supervisor checking a specialist's work"] },
        { title: "Not worth it", tone: "warn", items: ["routing between three specialists", "classification into known labels", "extraction against a schema", "anything with a latency budget"] }
      ] },

    { t: "p", text: "ADK exposes this twice: `thinking_config` in the generation config, and `BuiltInPlanner`, which is the planner wrapper around the same setting (lesson 2.1). For models without native thinking, `PlanReActPlanner` prompts the plan-then-act loop instead, at the cost of ordinary output tokens." },

    { t: "h2", n: "05", text: "Fallbacks and retries", id: "fallback" },

    { t: "code", lang: "python", title: "FallbackModel: a second model when the first fails",
      code: `from google.adk.models import FallbackModel, Gemini

print(list(FallbackModel.model_fields))
# ['model', 'models', 'retriable_status_codes']

resilient = FallbackModel(
    models=[Gemini(model="gemini-2.5-pro"), Gemini(model="gemini-2.5-flash")],
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
      body: [{ t: "p", text: "You have a three-agent system: a router, a drafter and a fact-checker. Assign each a model class (cheap / mainstream / strong), a temperature, a thinking setting and a `max_output_tokens`, and justify each in one line. Then state which single change to the system would reduce cost more than all of these settings combined." }],
      requirements: ["Three configurations", "One line of justification per setting", "The one bigger change, named"],
      hint: "The router's whole output is one agent name.",
      solution: { lang: "python", title: "Solution",
        code: `router   = LlmAgent(name="router", model=FLASH_LITE, sub_agents=[...],
    generate_content_config=types.GenerateContentConfig(
        temperature=0.0,            # the correct target is deterministic
        max_output_tokens=64,       # its entire output is a transfer call
        thinking_config=types.ThinkingConfig(thinking_budget=0)))   # nothing to think about

drafter  = LlmAgent(name="drafter", model=PRO,
    generate_content_config=types.GenerateContentConfig(
        temperature=0.7,            # prose: some variation is the point
        max_output_tokens=1200,
        thinking_config=types.ThinkingConfig(thinking_budget=2048)))  # multi-step reasoning

checker  = LlmAgent(name="checker", model=FLASH, include_contents="none",
    generate_content_config=types.GenerateContentConfig(
        temperature=0.0, max_output_tokens=256))   # verdict + reason, against the draft only

# the bigger change: include_contents="none" on the router and the checker, plus
# splitting the tool list so each agent's declarations are short. Input tokens
# dominate the bill; the conversation and the declarations are the input.`,
        notes: [{ t: "p", text: "The point of the exercise is the last comment. Temperature and output caps are worth setting, but on a long conversation with a large toolbox they are rounding errors next to what is being re-sent on every call." }] } }
  ],

  takeaways: [
    "A model string is resolved by LLMRegistry against each BaseLlm subclass's supported_models patterns; passing an instance bypasses it.",
    "generate_content_config is the Gen AI SDK's GenerateContentConfig; ADK merges the system instruction and tool declarations into it, so do not set those yourself.",
    "Keep temperature low for agents — tool choice and instruction-following degrade as it rises; raise it only for prose.",
    "max_output_tokens caps one reply, not the conversation; a truncated JSON answer is usually this limit.",
    "Thinking config buys multi-step reasoning and costs latency and tokens; turn it off for routers, classifiers and extractors.",
    "FallbackModel(models=[…], retriable_status_codes=[…]) degrades to another model on quota or transient errors — and silently lowers quality unless you record which model answered.",
    "Input tokens dominate cost: how much conversation and how many tool declarations you send matter more than any generation setting."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How does ADK turn model='claude-3-5-sonnet@20240620' into an implementation?",
      options: ["It always uses Gemini", "LLMRegistry matches the string against each BaseLlm subclass's supported_models patterns and returns the matching class", "It reads an environment variable", "It fails — only Gemini strings are supported"],
      answer: 1,
      why: "Each model class declares regular expressions it handles, and the registry resolves the string against them: gemini-* to Gemini, claude-* to Claude, gemma-* to Gemma. You can register your own class, and passing a BaseLlm instance as model= skips resolution entirely." },
    { stem: "Which of these should you not put in generate_content_config?",
      options: ["temperature", "max_output_tokens", "system_instruction and tools", "safety_settings"],
      answer: 2,
      why: "ADK builds those two itself: the system instruction is assembled from the agent's instructions and the framework's framing, and the tool declarations are generated from the agent's tools. Setting them in the config fights the framework and, for response_schema specifically, ADK raises and tells you to use output_schema instead." },
    { stem: "An agent's structured JSON answers are occasionally cut off mid-object. What is the most likely cause?",
      options: ["Temperature too high", "max_output_tokens too low for the schema being produced", "The model does not support JSON", "The session service truncated it"],
      answer: 1,
      why: "max_output_tokens caps the reply, and a truncated reply is invalid JSON — which then fails schema validation with a confusing error. Size the cap against the largest legitimate output, and remember it does nothing about input cost, which is usually the larger half of the bill." },
    { stem: "For which agent is thinking config least worth enabling?",
      options: ["A planner that decomposes a task", "A supervisor checking a specialist's work", "A router choosing between three specialists", "An analyst doing multi-step arithmetic"],
      answer: 2,
      why: "Routing between a few well-described specialists is a one-step decision: thinking tokens add latency and cost without improving it. Thinking pays where several steps must be composed before answering — planning, checking, analysis." }
  ] },

  interview: { title: "Interview", sub: "Model-selection questions", questions: [
    { level: "Core", q: "How do you decide which model an agent should use?",
      strong: "By the difficulty of the decision it makes, not by the importance of the feature: cheap for routing and classification, strong for reasoning and drafting.",
      answer: [{ t: "p", text: "I would split the system so that different jobs can have different models, then match each one. Routing between a handful of well-described specialists is easy and high-volume, so it gets the cheapest fast model with temperature zero, thinking off and a tiny output cap. Tool-using conversation gets the mainstream Flash-class model, where function-calling reliability matters more than raw reasoning. Drafting, planning and analysis get the Pro-class model with thinking enabled, because that is where quality is the product. The mistake to avoid is a single agent doing all three: it pays the strong model's price on every routing turn, and there is no way to tune the settings separately." }] },
    { level: "Core", q: "What does ADK put into generate_content_config that you did not?",
      strong: "The assembled system instruction and the generated tool declarations.",
      answer: [{ t: "p", text: "When ADK builds an LlmRequest it fills the config's system_instruction with the assembled instruction — global instruction, your instruction with state interpolated, its own agent framing and any transfer guidance — and fills tools with a declaration generated from every tool the agent has, including transfer_to_agent when it has sub-agents. That is why those two fields are not yours to set, and why reading a recorded request is the only reliable way to see what the model was really given. Everything else in the config — temperature, token limits, safety, thinking, seed, labels — is passed through as you wrote it." }] },
    { level: "Senior", q: "Your agent platform's model bill has tripled while traffic is flat. Where do you look?",
      strong: "Input tokens: conversation length, tool declarations, retries and thinking — not the generation settings.",
      answer: [{ t: "p", text: "Output caps and temperature cannot cause that, so it is input or call count. First, conversation growth: an agent with include_contents='default' re-sends the whole history every call, so a product change that makes sessions longer multiplies cost quadratically across a tool chain — compaction and context caching are the fixes. Second, tool declarations: someone adding four tools to a shared agent adds those schemas to every call of every turn. Third, call count: a new loop or a retry policy that fires often, visible as calls per invocation in the traces; max_llm_calls bounds the pathological case. Fourth, thinking: enabling it globally rather than per agent is an easy accidental tripling. I would attribute spend with request labels per agent, then compare tokens-in per invocation before and after the change rather than guessing." }] }
  ] }
});
