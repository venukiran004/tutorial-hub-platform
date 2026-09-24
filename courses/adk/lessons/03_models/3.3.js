/* ============================================================================
   LESSON 3.3 — Planners: Thinking, Plan-Act and Reasoning Control
   The injected instruction, its five tags, the empty BuiltInPlanner
   instruction, the thought part and the 3,137-character system instruction are
   executed output from scratchpad/adk/p1.py on google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "**A planner is the difference between an agent that answers and an agent that works out how to answer first.** ADK exposes it as one field, and the two implementations it ships take opposite approaches: one hands the job to the model's own reasoning mode and adds nothing to your prompt, while the other adds three thousand characters of instruction telling the model to write a plan in a specific format. Knowing which does which — and what each costs on every single request — is the whole of this lesson.",

  objectives: [
    "Say what the `planner` field does and where its output goes",
    "Distinguish `BuiltInPlanner` from `PlanReActPlanner` by what each injects",
    "Recognise a thought part and keep it out of your user interface",
    "Measure what a planner adds to the request",
    "Decide when explicit reasoning is worth its cost"
  ],

  prerequisites: ["3.1", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Two planners, two mechanisms", id: "two" },

    { t: "code", lang: "python", title: "p1.py — what each one injects",
      code: `from google.adk.planners import BasePlanner, BuiltInPlanner, PlanReActPlanner

pr = PlanReActPlanner()
print("PlanReActPlanner injects", len(pr.build_planning_instruction(ctx, req)), "chars")

bp = BuiltInPlanner(thinking_config=types.ThinkingConfig(
        include_thoughts=True, thinking_budget=1024))
print("BuiltInPlanner injects:", bp.build_planning_instruction(ctx, req))
print("it carries thinking_config instead:", bp.thinking_config)` },

    { t: "out", text: `PlanReActPlanner injects an instruction of 3069 chars
BuiltInPlanner injects an instruction: None
  it carries thinking_config instead: include_thoughts=True thinking_budget=1024 thinking_level=None` },

    { t: "p", text: "That contrast is the lesson in two lines. **`BuiltInPlanner` adds nothing to the prompt** — it configures the model's own thinking mode, so the reasoning happens inside the provider and you pay for it in thinking tokens. **`PlanReActPlanner` adds three thousand characters of instruction** to every request, teaching a model with no native reasoning mode to produce a plan in a format ADK can parse." },

    { t: "diagram", kind: "compare", title: "Where the reasoning happens",
      caption: "Neither is better in general. The first needs a model that supports thinking; the second works anywhere and costs prompt tokens on every call.",
      columns: [
        { title: "BuiltInPlanner", tone: "good", items: ["Sets thinking_config on the request", "Injects no instruction at all", "The provider does the reasoning", "Costs thinking tokens", "Needs a thinking-capable model"] },
        { title: "PlanReActPlanner", tone: "accent", items: ["Injects ~3,000 characters", "Works on any model", "The reasoning is ordinary output", "Costs prompt tokens every request", "Parsed back out by tag"] }
      ] },

    { t: "h2", n: "02", text: "The format PlanReAct asks for", id: "tags" },

    {"kind": "steps", "title": "One planned turn, as PlanReAct asks for it", "caption": "All five section names were found in the injected instruction. The last one is what people forget when they build this by hand — a plan that cannot be revised is worse than no plan.", "items": [{"label": "/*PLANNING*/", "sub": "the plan, in natural language", "tone": "accent"}, {"label": "/*ACTION*/", "sub": "a tool call", "tone": "good"}, {"label": "/*REASONING*/", "sub": "what the result means", "tone": "good"}, {"label": "/*REPLANNING*/", "sub": "revise when a tool surprises it", "tone": "crit"}, {"label": "/*FINAL_ANSWER*/", "sub": "the only part the user should see", "tone": "violet"}], "t": "diagram", "id": "dg-3_3-02-0"},

    { t: "code", lang: "python", title: "Tags found in the injected instruction",
      code: `for tag in ["/*PLANNING*/", "/*REASONING*/", "/*ACTION*/", "/*FINAL_ANSWER*/", "/*REPLANNING*/"]:
    print(tag, tag in instruction)` },

    { t: "out", text: `    /*PLANNING*/     yes
    /*REASONING*/    yes
    /*ACTION*/       yes
    /*FINAL_ANSWER*/ yes
    /*REPLANNING*/   yes` },

    { t: "p", text: "Five sections, and the interesting one is `/*REPLANNING*/` — the instruction explicitly tells the model it may revise its plan when a tool returns something unexpected. That is the behaviour people try to get with prompt engineering and usually forget to include: a plan that cannot be revised is worse than no plan, because the agent follows it past the point where it stopped making sense." },

    { t: "out", text: `first lines of the injected instruction:
  When answering the question, try to leverage the available tools to gather the informati…
  Follow this process when answering the question: (1) first come up with a plan in natura…
  Follow this format when answering the question: (1) The planning part should be under /*…` },

    { t: "h2", n: "03", text: "Thought parts", id: "thoughts" },

    { t: "p", text: "When a planner is active, the model's reasoning comes back in parts flagged as thoughts, separate from the answer. The executed run confirms it." },

    { t: "out", text: `parts the user-facing event carried:
  thought=True  text='\\n1. look it up\\n\\nDone.\\nThe answer is 14.'` },

    { t: "callout", kind: "trap", title: "Do not render thought parts",
      body: [{ t: "p", text: "`part.thought` is how you tell the model's working-out from its answer, and a client that renders every text part shows the user the agent talking to itself — including, sometimes, the parts where it considered and rejected something. Filter on `part.thought` in your client the same way you filter on `event.partial` when streaming (lesson 10.2). Showing reasoning can be a deliberate product choice; showing it by accident is not." }] },

    { t: "h2", n: "04", text: "What it costs", id: "cost" },

    { t: "out", text: `planner text present in the system instruction: True
system instruction length: 3137 chars` },

    { t: "p", text: "Three thousand one hundred and thirty-seven characters, where the agent's own instruction was about sixty. That is sent on **every model request**, in every turn, for the whole conversation — and a tool-using turn makes several requests (lesson 10.1). A planner is not a one-off cost; it is a tax on every call the agent makes." },

    { t: "diagram", kind: "matrix", title: "When a planner earns it",
      caption: "The pattern: planners help most where the task has genuine multi-step structure and a wrong first move is expensive. They help least where the agent has one obvious tool to call.",
      cols: ["Worth a planner?", "Because"],
      rows: ["A single lookup", "A compound question", "An unfamiliar toolbox", "A high-stakes action", "A classifier"],
      cells: [
        [{ text: "no", tone: "crit" }, { text: "one obvious call", tone: "warn" }],
        [{ text: "yes", tone: "good" }, { text: "order matters", tone: "good" }],
        [{ text: "yes", tone: "good" }, { text: "reduces wrong tools", tone: "good" }],
        [{ text: "maybe", tone: "warn" }, { text: "prefer approval (9.3)", tone: "accent" }],
        [{ text: "no", tone: "crit" }, { text: "pure overhead", tone: "crit" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "Measure it, do not assume it",
      body: [{ t: "p", text: "A planner is exactly the kind of change that feels like an improvement and needs an evaluation set to confirm it (lesson 11.2). Run your trajectory metrics with and without: if `tool_trajectory_avg_score` rises, the planner is buying better tool choice and is probably worth the tokens. If it does not move, you have added three thousand characters to every request and latency to every turn for nothing." }] },

    { t: "h2", n: "05", text: "Writing your own", id: "custom" },

    { t: "code", lang: "python", title: "The whole BasePlanner contract",
      code: `class BasePlanner:
    def build_planning_instruction(self, readonly_context, llm_request) -> str | None:
        """Text to add to the system instruction, or None."""

    def process_planning_response(self, callback_context, response_parts) -> list[Part] | None:
        """Rewrite the model's parts — e.g. mark reasoning as thought."""`,
      caption: "Introspected: two methods. `PlanReActPlanner` implements both — one to teach the format, one to split the tagged sections back apart. `BuiltInPlanner` implements neither meaningfully, because the provider does the work." },

    { t: "p", text: "A custom planner is worth writing when your domain has a fixed procedure the model should follow — a triage sequence, a compliance checklist, an order of checks that must happen before an action. You are not inventing reasoning; you are giving it a shape you can then parse and audit." },

    { t: "callout", kind: "insight", title: "A planner is structured prompting with a parser",
      body: [{ t: "p", text: "Strip away the name and `PlanReActPlanner` is a long instruction plus a function that splits the response on tags. That is worth seeing clearly, because it tells you both when to reach for one — you want the reasoning in a form your code can inspect — and when not to: if you only want better answers and do not care about the structure, a thinking-capable model with `BuiltInPlanner` gets you there without the prompt tax." }] },

    { t: "exercise", kind: "practice", title: "Price the planner", difficulty: "advanced", minutes: 24,
      prompt: "Take a tool-using agent and record the system instruction length with no planner, with BuiltInPlanner and with PlanReActPlanner. Then run a turn with each and count model requests and the total characters sent. Finally, write three questions — one single-lookup, one compound, one needing a tool you have described poorly — and note which planner, if any, changes the tool choice.",
      hints: [
        "`llm.seen[0].config.system_instruction` is the assembled instruction.",
        "Multiply by the number of requests in the turn — that is the real cost.",
        "The poorly-described tool is where a planner most often helps."
      ],
      solution: {
        notes: [
          { t: "p", text: "The numbers are stark: about sixty characters becomes about 3,137 with PlanReAct, and that goes out on every request rather than once. In a turn with two tool calls that is three requests carrying the planner text, and in a fifty-turn conversation it is a substantial share of the bill for reasoning the user never reads." },
          { t: "p", text: "The third question is the useful one. A planner most often improves tool choice where the descriptions are ambiguous — which is a signal to fix the descriptions rather than to pay for reasoning that works around them. When a planner helps, ask first whether better tool descriptions would have helped more, for free." }
        ]
      } }

  ],

  takeaways: [
    "`planner` is one field on `LlmAgent` with two shipped implementations that work in opposite ways.",
    "`BuiltInPlanner` injects no instruction — it sets `thinking_config` and the provider reasons.",
    "`PlanReActPlanner` injects about 3,000 characters defining five tags, including `/*REPLANNING*/`.",
    "Reasoning returns as parts with `thought=True`; filter them out of your interface.",
    "The planner text is sent on every model request, so a tool-using turn pays for it several times.",
    "`BasePlanner` is two methods: build the instruction, and rewrite the response parts."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How much does BuiltInPlanner add to the system instruction?",
      options: ["About 3,000 characters", "Nothing — it returns None", "A few hundred characters", "It depends on the thinking budget"],
      answer: 1,
      why: "The executed run prints `None` for its planning instruction. It works by setting `thinking_config` on the request so the provider's own reasoning mode does the work, which is why it costs thinking tokens rather than prompt tokens and why it needs a model that supports thinking." },
    { stem: "Why does PlanReActPlanner define a /*REPLANNING*/ section?",
      options: ["To retry failed tool calls", "So the model can revise its plan when a tool returns something unexpected", "To split long plans across requests", "For compatibility with older models"],
      answer: 1,
      why: "A plan that cannot be revised is worse than no plan, because the agent keeps following it past the point where it stopped making sense. Making replanning an explicit, named section is what stops the model treating its first guess as binding." },
    { stem: "A client renders every text part of every event. With a planner active, what does the user see?",
      options: ["Only the answer", "The agent's reasoning as well as its answer", "Nothing until the plan completes", "The plan tags as literal text"],
      answer: 1,
      why: "Reasoning comes back as parts flagged `thought=True`, alongside the answer. A client that does not filter on `part.thought` shows the user the model talking to itself — including anything it considered and rejected." },
    { stem: "You add a planner and your evaluation's trajectory score does not change. What does that tell you?",
      options: ["The planner is working correctly", "You are paying prompt tokens on every request for no benefit", "The evaluation set is wrong", "You need a bigger thinking budget"],
      answer: 1,
      why: "The planner's main claim is better tool choice, which is exactly what `tool_trajectory_avg_score` measures. If it does not move, you have added thousands of characters to every request and latency to every turn without improving the behaviour you added it for." }
  ] },

  interview: { title: "Interview", sub: "Planner questions", questions: [
    { level: "Core", q: "What does a planner do in ADK?",
      strong: "Makes the model's reasoning explicit before it acts — either through the provider's thinking mode or through an injected format.",
      answer: [{ t: "p", text: "It is one field on `LlmAgent` with two shipped implementations that work in opposite ways, which is the thing worth knowing. `BuiltInPlanner` adds nothing to the prompt: it sets `thinking_config` so the provider's own reasoning mode runs, and you pay in thinking tokens. `PlanReActPlanner` injects about three thousand characters teaching the model to write a plan under `/*PLANNING*/`, reason under `/*REASONING*/`, and revise under `/*REPLANNING*/`, then parses those sections back apart. So one requires a thinking-capable model and the other works anywhere at the cost of prompt tokens on every single request." }] },
    { level: "Senior", q: "When would you not use a planner?",
      strong: "When the task has one obvious step, or when the evaluation shows no trajectory improvement for the tokens.",
      answer: [{ t: "p", text: "For a classifier or a single-lookup agent it is pure overhead — there is nothing to plan, and the instruction text goes out on every request regardless. More generally I would not add one on intuition, because it is exactly the kind of change that feels like an improvement: I run the trajectory metric with and without, and if it does not move, the planner is costing thousands of characters per request and latency per turn for nothing. The other check I would make is diagnostic. If a planner does help, it is often working around ambiguous tool descriptions — and fixing the descriptions is free, improves the agent without a planner, and usually helps more." }] },
    { level: "Senior", q: "How would you surface an agent's reasoning to users?",
      strong: "Deliberately, filtering on `part.thought`, and only where showing working-out helps rather than alarms.",
      answer: [{ t: "p", text: "The mechanism is straightforward: reasoning arrives as parts with `thought=True`, so a client filters on that flag the same way it filters on `partial` when streaming. The judgement is the harder part. Showing working-out builds trust in a research or analysis tool where the user wants to check the steps. It does the opposite in a support agent, where the user sees the model considering and discarding possibilities and reads it as indecision — and occasionally sees it consider something you would rather it had not said out loud. So I would treat it as a product decision per surface, default to hiding it, and if I do show it, render it visibly as reasoning rather than letting it blend into the answer." }] }
  ] }
});
