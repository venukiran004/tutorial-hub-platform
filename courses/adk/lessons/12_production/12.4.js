/* ============================================================================
   LESSON 12.4 — Gemini + ADK: The Capabilities That Matter
   Cross-references executed material from earlier modules: the generated
   declarations (4.1), grounding (4.4), output_schema on the wire (6.4),
   context caching config (5.6) and streaming modes (10.2), all on
   google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "12.4",

  lede: "**An agent framework can only expose what the model can do.** Every mechanism in this course — tool calling, structured output, grounding, long context, code execution — is a model capability that ADK gives you a handle on, which is why the same agent behaves differently on different models and why \"just swap the model\" is rarely just. This lesson goes through the capabilities that change what you can build, from the agent's point of view: what each one is, which ADK feature sits on top of it, and what to do when the model you want does not have it.",

  objectives: [
    "Name the model capabilities ADK's features depend on",
    "Predict what breaks when a model lacks one",
    "Choose a model for an agent on the properties that matter",
    "Use long context and caching deliberately rather than by default",
    "Plan for a model change without rewriting the agent"
  ],

  prerequisites: ["3.1", "6.4"],

  blocks: [

    { t: "h2", n: "01", text: "The capability underneath each feature", id: "map" },

    {"kind": "matrix", "title": "Remove the capability, lose the feature", "caption": "Function calling is the load-bearing one: without it there are no tools, no transfer, no retrieval and no human approval, because all four are function calls.", "cols": ["Without it you lose", "Workaround"], "rows": ["Function calling", "Constrained decoding", "Server-side grounding", "Prefix caching", "Live API"], "cells": [[{"text": "tools, transfer, RAG, approval", "tone": "crit"}, {"text": "none", "tone": "crit"}], [{"text": "output_schema guarantees", "tone": "warn"}, {"text": "parse and validate", "tone": "warn"}], [{"text": "citations for free", "tone": "warn"}, {"text": "your own retriever", "tone": "good"}], [{"text": "cheap stable prefixes", "tone": "warn"}, {"text": "compaction", "tone": "good"}], [{"text": "BIDI audio", "tone": "warn"}, {"text": "SSE text", "tone": "good"}]], "t": "diagram", "id": "dg-12_4-01-0"},






    { t: "table", head: ["ADK feature", "Model capability", "Where it was executed"],
      rows: [
        ["Tools", "Function calling with JSON-Schema declarations", "4.1 — the generated declaration printed"],
        ["`output_schema`", "Constrained decoding against a response schema", "6.4 — `response_schema` seen on the request"],
        ["Multi-agent transfer", "Function calling (transfer is a tool)", "2.5"],
        ["`google_search`, `url_context`", "Server-side grounding with metadata", "4.4"],
        ["Built-in code execution", "A provider-side execution environment", "4.4"],
        ["Long conversations", "A large context window", "5.6 — the growth measured"],
        ["Context caching", "Provider-side prefix caching", "5.6 — the config introspected"],
        ["SSE streaming", "Token streaming", "10.2 — partial events traced"],
        ["`run_live` / BIDI", "A live bidirectional API", "10.2"],
        ["Multimodal input", "Image, audio, PDF and video understanding", "3.2"]
      ] },

    { t: "callout", kind: "insight", title: "Function calling is the load-bearing one",
      body: [{ t: "p", text: "Remove it and almost nothing in this course works: no tools, no transfer between agents, no retrieval, no human approval — because all of those are function calls. Everything else on that list is an enhancement. When you evaluate a model for an agent, the quality of its function calling is the first thing to measure and the last thing to compromise on." }] },

    { t: "h2", n: "02", text: "What good function calling means", id: "function-calling" },

    {"kind": "trace", "title": "Five skills behind 'good at function calling'", "caption": "**The first one degrades faster than people expect as the toolbox grows** — choosing from ten similarly-described options is a different task from choosing between two obviously different ones. **And `tool_trajectory_avg_score` is a direct measurement of the first two**, which is why it is the metric to start with and the one that moves when you change model. If you take nothing else from this lesson: run your own evaluation set against the new model before believing a benchmark about it.", "left": "the skill", "codeW": 190, "vars": ["what it actually requires"], "steps": [{"code": "choosing the right tool", "state": ["from TEN similar options, not two different ones"], "tone": "crit"}, {"code": "filling arguments correctly", "state": ["enums, types, required - or you write a coercion layer"], "changed": [0], "tone": "crit"}, {"code": "knowing when NOT to call", "state": ["answering directly instead of reaching for a tool"], "changed": [0], "tone": "accent"}, {"code": "calling several at once", "state": ["what makes concurrency possible: 0.41s vs 0.83s"], "changed": [0], "tone": "good"}, {"code": "reading a result and acting", "state": ["including relaying a refusal instead of hammering"], "changed": [0], "tone": "good"}, {"code": "and your trajectory metric", "state": ["measures the first two directly"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-12_4-02-1"},

    { t: "dl", items: [
      ["Choosing the right tool", "From ten similarly-described options, not two obviously different ones. This degrades faster than people expect as the toolbox grows (lesson 4.5)."],
      ["Filling arguments correctly", "Respecting enums, types and required fields — a model that returns `\"25\"` where the schema says number costs you a coercion layer."],
      ["Knowing when not to call", "Answering directly rather than reaching for a tool that cannot help."],
      ["Calling several at once", "Which is what makes concurrent execution possible at all — measured at 0.41s against 0.83s in lesson 10.1."],
      ["Reading a result and acting on it", "Including an error result: retrying sensibly, or relaying a refusal rather than hammering the same call."]
    ] },

    { t: "callout", kind: "trap", title: "This is what your evaluation set measures",
      body: [{ t: "p", text: "`tool_trajectory_avg_score` (lesson 11.2) is a direct measurement of the first two, which is why it is the metric to start with and why it is the one that moves when you change model. If you take nothing else from this lesson: run your evaluation set against the new model before believing a benchmark about it." }] },

    { t: "h2", n: "03", text: "Long context is a budget, not a solution", id: "long-context" },

    { t: "p", text: "A million-token window sounds like the end of context management. It is not, for three separate reasons, and lesson 5.6 measured the first of them: contents grow by two per chat turn and four per tool-using turn, and you resend all of it every time. A window that never fills still costs money linearly and latency gently." },

    { t: "diagram", kind: "compare", title: "Three limits, only one of which the window raises",
      caption: "A bigger window moves the first wall and leaves the other two exactly where they were.",
      columns: [
        { title: "Capacity", tone: "good", items: ["\"Does it fit?\"", "A bigger window solves this", "Was the binding limit in 2023", "Rarely the binding limit now"] },
        { title: "Cost", tone: "warn", items: ["Every turn resends everything", "Grows linearly with length", "Quadratic per conversation", "Caching and compaction help"] },
        { title: "Attention", tone: "crit", items: ["Can it find the fact?", "Degrades with dilution", "Bigger windows do not fix it", "State in the instruction does"] }
      ] },

    { t: "callout", kind: "good", title: "The practical consequence",
      body: [{ t: "p", text: "Put the facts that must hold on every turn into state and interpolate them into the instruction, where they are restated at the front of every request (lesson 5.5). That is a better use of a large window than trusting the model to find something forty messages back — and it works identically on a model with a small window, which is the other reason to do it." }] },

    { t: "h2", n: "04", text: "Grounding and code execution", id: "server-side" },

    {"kind": "flow", "title": "Server-side capability means outside your control", "caption": "**Grounded search returns grounding metadata naming the sources behind each span**, which is what citations and groundedness evaluation are built on, and built-in code execution runs in the provider's sandbox rather than yours. **What you give up is the part to weigh:** no `before_tool_callback` fires, the query is not an argument you can audit in your trace, and the capability does not exist on another provider. A fair trade for provenance and zero integration work; a poor one if you need the queries logged or the agent portable.", "cols": 3, "nodes": [{"id": "g", "label": "The provider does the work", "sub": "grounded search, code execution", "tone": "accent"}, {"id": "p", "label": "You get grounding metadata", "sub": "sources per span - real provenance", "tone": "good"}, {"id": "z", "label": "And zero integration work", "sub": "no client, no sandbox to run", "tone": "good"}, {"id": "c", "label": "But no before_tool_callback fires", "sub": "and the query is not auditable", "tone": "crit"}, {"id": "o", "label": "And it does not exist elsewhere", "sub": "portability gone", "tone": "crit"}, {"id": "a", "label": "Wrap it as an AgentTool", "sub": "the restriction stays inside", "tone": "violet"}], "edges": [["g", "p"], ["g", "z"], ["g", "c"], ["c", "o"], ["o", "a"]], "t": "diagram", "id": "dg-12_4-04-2"},

    { t: "p", text: "These are the capabilities where the provider does the work, and they are genuinely different from a tool you write. Grounded search returns **grounding metadata** naming the sources behind each span of the answer, which is what citations and groundedness evaluation are built on. Built-in code execution runs generated code in the provider's sandbox rather than yours." },

    { t: "callout", kind: "tradeoff", title: "Server-side means outside your control",
      body: [{ t: "p", text: "No `before_tool_callback` fires, the query does not appear in your trace as an argument you can audit, and the capability does not exist on another provider. That is a fair trade for provenance and zero integration work, and a poor one if you need the queries logged, the results filtered, or the agent to run somewhere else. Lesson 4.4 covers the encapsulation trick — wrap the grounded agent as an `AgentTool` so the restriction stays inside it." }] },

    { t: "h2", n: "05", text: "Choosing a model for an agent", id: "choosing" },

    {"kind": "trace", "title": "Seven properties, and why each multiplies for an agent", "caption": "**Latency and cost both multiply in ways a single-call benchmark does not show:** a tool-using turn is three round trips, and a conversation resends its history every turn. **And the conclusion is that different agents want different models.** A classifier with `include_contents=\"none\"` and a three-field schema wants the fastest model that gets the enum right; a coordinator deciding between six specialists wants the best routing. They are separate `LlmAgent` objects, so they can be separate models — usually the largest cost saving available.", "left": "property", "codeW": 180, "vars": ["why it multiplies for an agent"], "steps": [{"code": "function-calling quality", "state": ["everything depends on it - measure, do not read"], "tone": "crit"}, {"code": "latency per call", "state": ["a tool-using turn is three round trips"], "changed": [0], "tone": "crit"}, {"code": "cost per token", "state": ["times a history resent every single turn"], "changed": [0], "tone": "crit"}, {"code": "structured output", "state": ["enforced, or merely requested?"], "changed": [0], "tone": "accent"}, {"code": "context window", "state": ["how long before compaction is necessary"], "changed": [0], "tone": "accent"}, {"code": "caching support", "state": ["whether the stable prefix is cheap to resend"], "changed": [0], "tone": "good"}, {"code": "instruction following", "state": ["how a long instruction holds over many turns"], "changed": [0], "tone": "good"}], "t": "diagram", "id": "dg-12_4-05-3"},

    { t: "table", head: ["Property", "Why it matters for an agent specifically"],
      rows: [
        ["Function-calling quality", "Everything depends on it; measure with your own trajectory set"],
        ["Latency per call", "A turn makes several calls, so it multiplies — a tool-using turn is three round trips"],
        ["Cost per token", "Multiplied by a conversation that resends its history every turn"],
        ["Structured output support", "Whether `output_schema` is enforced or merely requested"],
        ["Context window", "How long a conversation runs before compaction becomes necessary"],
        ["Caching support", "Whether the stable prefix of a request is cheap to resend"],
        ["Instruction following", "How well a long, specific system instruction holds up over many turns"]
      ] },

    { t: "callout", kind: "mental", title: "Different agents want different models",
      body: [{ t: "p", text: "A classifier with `include_contents=\"none\"` and a three-field schema wants the fastest, cheapest model that gets the enum right. A coordinator deciding between six specialists wants the best routing. A drafting agent wants the strongest writing. In a multi-agent system these are separate `LlmAgent` objects, so they can be separate models — and mixing them deliberately is usually the largest cost saving available, because the expensive model stops doing the cheap work." }] },

    { t: "h2", n: "06", text: "Changing model without rewriting", id: "portability" },

    {"kind": "trace", "title": "Five habits that make a model change a configuration change", "caption": "**Tool descriptions are the part most sensitive to a model change**, because they are prompt — expect to re-tune them, and have the evaluation set that tells you when you are done. **And `FallbackModel` is not a portability plan:** falling back to another provider on failure is a good availability mechanism, but an agent whose tools are tuned for one model may route badly on another, and discovering that during an outage is the worst possible time. Evaluate the fallback path as its own configuration.", "left": "habit", "codeW": 190, "vars": ["what it saves you"], "steps": [{"code": "the model id in configuration", "state": ["one constant per role - not a codebase-wide migration"], "tone": "good"}, {"code": "own your tool descriptions", "state": ["they are prompt, and the most model-sensitive part"], "changed": [0], "tone": "violet"}, {"code": "prefer portable mechanisms", "state": ["your retrieval tool travels; grounded search does not"], "changed": [0], "tone": "good"}, {"code": "re-run evaluation, always", "state": ["trajectory moves more here than on any other edit"], "changed": [0], "tone": "crit"}, {"code": "watch model_version in events", "state": ["'it got worse last Tuesday' is often a silent update"], "changed": [0], "tone": "accent"}, {"code": "and evaluate the fallback too", "state": ["it is availability, not portability"], "changed": [0], "tone": "crit"}], "t": "diagram", "id": "dg-12_4-06-4"},

    { t: "dl", items: [
      ["Keep the model in configuration", "One constant, or one per agent role. A model id scattered through a codebase is a migration nobody wants to start."],
      ["Own your tool descriptions", "They are prompt, and they are the part most sensitive to a model change. Expect to re-tune them, and have the evaluation set that tells you when you are done."],
      ["Prefer portable mechanisms", "A retrieval tool you wrote works everywhere; a server-side grounded search does not. Choose the built-in knowingly, not by default."],
      ["Re-run evaluation, always", "Trajectory scores move on a model change more than any other edit. A benchmark someone published is not evidence about your tools."],
      ["Watch `model_version` in events", "A silently-updated model is a real cause of \"it got worse last Tuesday\", and the event log records which version answered (lesson 11.1)."]
    ] },

    { t: "callout", kind: "warn", title: "`FallbackModel` is not a portability plan",
      body: [{ t: "p", text: "Falling back to another provider when the primary fails (lesson 3.2) is an availability mechanism, and a good one. It is not a substitute for testing the fallback: an agent whose tools are tuned for one model may route badly on another, and discovering that during an outage is the worst possible time. Evaluate the fallback path as its own configuration." }] },

    { t: "exercise", kind: "practice", title: "Measure a model change", difficulty: "advanced", minutes: 28,
      prompt: "Take an agent with four or five tools and an evaluation set including routing cases. Run the set against two models — ideally a large and a small one from the same family. Record trajectory and response scores, model calls per turn, latency and token usage for each. Then look specifically at the cases the smaller model got wrong and decide whether better tool descriptions would fix them. Finally, pick which agents in a multi-agent version of this system could use the smaller model.",
      hints: [
        "Trajectory scores are the ones that move; response scores often barely change.",
        "Wrong-tool errors usually cluster on the two most similarly-described tools.",
        "A classifier or an extractor is almost always safe to downgrade."
      ],
      solution: {
        notes: [
          { t: "p", text: "The usual finding is that the smaller model's failures are concentrated rather than spread: it handles most routing fine and then confuses the two tools whose descriptions overlap. That is a description problem the large model was papering over, and fixing it often improves both — which is the argument for evaluating on a small model even when you intend to ship the large one." },
          { t: "p", text: "The multi-agent question is where the money is. A system where a coordinator and four specialists all use the strongest model is paying premium rates for classification and formatting. Moving the deterministic-shaped agents — the classifier with a `Literal` schema, the extractor, the formatter — to a smaller model typically changes the bill substantially and the evaluation scores not at all." }
        ]
      } }

  ],

  takeaways: [
    "Every ADK feature sits on a model capability; function calling is the one everything depends on.",
    "Good function calling means right tool, right arguments, knowing when not to call, and several at once.",
    "A large context window raises the capacity limit and leaves cost and attention exactly where they were.",
    "Grounding and code execution are server-side: provenance and zero integration, in exchange for control and portability.",
    "Different agents in one system want different models — that is usually the biggest available cost saving.",
    "Re-run the evaluation set on any model change; trajectory scores move more than on any other edit."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Which model capability does multi-agent transfer depend on?",
      options: ["Long context", "Function calling", "Structured output", "Streaming"],
      answer: 1,
      why: "Transfer is implemented as a tool call, so a model with weak function calling routes badly between agents for exactly the same reason it picks the wrong tool. That is why function-calling quality is the first thing to measure when choosing a model for an agent system." },
    { stem: "Your model's context window increases tenfold. What does not change?",
      options: ["How long a conversation can run", "The cost of a long conversation, and how reliably the model finds a fact in it", "Whether compaction is available", "The number of tools you can declare"],
      answer: 1,
      why: "You still resend the whole transcript every turn, so cost still grows linearly with length and quadratically per conversation. Attention is the subtler one: a fact diluted among forty thousand tokens is not found more reliably because the window got bigger, which is why important facts belong in state and in the instruction." },
    { stem: "What do you give up by using a server-side grounded search rather than your own retrieval tool?",
      options: ["Citations", "Interception, auditability of the query, and portability", "Speed", "Result quality"],
      answer: 1,
      why: "No `before_tool_callback` fires, the query is not in your trace as an argument you can inspect, and the capability does not exist on another provider. You gain provenance and zero integration work, which is often the right trade — but it should be a decision rather than a default." },
    { stem: "You switch your agent from a large model to a smaller one. What should you do first?",
      options: ["Shorten the system instruction", "Re-run the evaluation set, watching trajectory scores", "Reduce the number of tools", "Increase max_llm_calls"],
      answer: 1,
      why: "Trajectory scores move more on a model change than on any other edit, because tool selection is the capability most sensitive to model quality. A published benchmark says nothing about how a model handles your particular tool descriptions, which is the thing that actually determines whether the agent works." }
  ] },

  interview: { title: "Interview", sub: "Model capability questions", questions: [
    { level: "Core", q: "Which model capability matters most for an agent?",
      strong: "Function calling — tools, transfer, retrieval and approval are all function calls.",
      answer: [{ t: "p", text: "Everything structural in ADK is built on it. Tools are function calls, transfer between agents is a function call, retrieval is a tool, human approval arrives as a synthetic function call. A model that picks the wrong tool from ten similar ones, or fills an enum with a value that is not in it, breaks the system in ways no prompting recovers. So when I assess a model for agent work, function-calling quality is the first measurement and the one I will not trade away — and I measure it with my own trajectory evaluation rather than a published benchmark, because what matters is how it handles my tool descriptions." }] },
    { level: "Core", q: "Does a large context window remove the need for context management?",
      strong: "No — it raises the capacity limit and leaves cost and attention untouched.",
      answer: [{ t: "p", text: "Three separate limits get confused. Capacity is whether the conversation fits, and a bigger window does solve that. Cost does not improve at all, because every turn resends the whole transcript — I measured contents growing by two per chat turn, so a conversation's total cost grows quadratically with its length regardless of the window. And attention is the one that catches people out: a fact buried in forty thousand tokens is not retrieved more reliably because the window could have held eighty. The practical answer is the same on every model — put what must hold every turn into state and interpolate it into the instruction, where it is restated at the front of each request." }] },
    { level: "Senior", q: "How would you approach changing the model behind a production agent?",
      strong: "Evaluate first with trajectory metrics, expect to re-tune tool descriptions, roll out gradually, and watch model_version in the logs.",
      answer: [{ t: "p", text: "I would start with the evaluation suite, because a model change moves trajectory scores more than any other edit and a benchmark tells me nothing about my tool descriptions. If scores drop, I look at where: the failures usually cluster on the two tools whose descriptions overlap, which means the previous model was compensating for an ambiguity I should fix anyway. Tool descriptions are prompt, and prompt is the part that does not port cleanly between models. Then a gradual rollout rather than a switch, with cost, latency and model calls per turn compared side by side, since a cheaper per-token model that makes an extra round trip per turn is not cheaper. Two things I would set up regardless. `model_version` is on every event, so I can answer 'did the model change under us' when someone says it got worse last Tuesday. And in a multi-agent system I would treat this as an opportunity rather than a migration: the classifier and the formatter almost certainly do not need the strongest model, and moving those alone usually saves more than the model change itself." }] }
  ] }
});
