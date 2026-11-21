/* ============================================================================
   LESSON 3.3 — Planners: Thinking, Plan-Act and Reasoning Control
   The injected instruction, its five tags, the empty BuiltInPlanner
   instruction, the thought part and the 3,137-character system instruction are
   executed output from p1.py on google-adk 2.9.2.
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

    { t: "code", lang: "python", title: "what each one injects",
      code: `from google.adk.planners import BasePlanner, BuiltInPlanner, PlanReActPlanner

pr = PlanReActPlanner()
print("PlanReActPlanner injects", len(pr.build_planning_instruction(ctx, req)), "chars")

bp = BuiltInPlanner(thinking_config=types.ThinkingConfig(
        include_thoughts=True, thinking_level="medium"))
print("BuiltInPlanner injects:", bp.build_planning_instruction(ctx, req))
print("it carries thinking_config instead:", bp.thinking_config)` },

    { t: "out", text: `PlanReActPlanner injects an instruction of 3069 chars
BuiltInPlanner injects an instruction: None
  it carries thinking_config instead: include_thoughts=True thinking_budget=None thinking_level=<ThinkingLevel.MEDIUM: 'MEDIUM'>` },

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

    {"kind": "flow", "title": "part.thought is the filter, and forgetting it shows the user the working-out", "caption": "**A client that renders every text part shows the agent talking to itself** — including, sometimes, the parts where it considered and rejected something, which is a worse disclosure than it first sounds. The flag is right there on the part, and filtering on it is the same discipline as filtering on `event.partial` when streaming. **Showing reasoning can be a deliberate product decision; showing it by accident is not one**, and the two are indistinguishable from the outside.", "cols": 3, "nodes": [{"id": "p", "label": "A planner is active", "sub": "BuiltInPlanner or PlanReActPlanner", "tone": "accent"}, {"id": "t", "label": "Reasoning returns as thought parts", "sub": "part.thought is True", "tone": "good"}, {"id": "a", "label": "The answer is a normal part", "sub": "in the same event", "tone": "good"}, {"id": "r", "label": "Render every text part", "sub": "and the user sees both", "tone": "crit"}, {"id": "f", "label": "Filter on part.thought", "sub": "as you filter event.partial", "tone": "violet"}], "edges": [["p", "t"], ["p", "a"], ["t", "r"], ["r", "f"]], "t": "diagram", "id": "dg-3_3-03-1"},

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

    {"kind": "trace", "title": "Two methods, and what a planner actually is", "caption": "**Strip the name away and `PlanReActPlanner` is a long instruction plus a function that splits the response on tags.** Seeing that clearly answers both halves of the decision: reach for a planner when you want the reasoning in a form your code can inspect and audit, and do not when you simply want better answers — a thinking-capable model with `BuiltInPlanner` gets you there without a parser to maintain. **A custom planner earns its place when your domain has a fixed procedure**: a triage sequence, a compliance checklist, an order of checks that must precede an action.", "left": "the BasePlanner contract", "codeW": 220, "vars": ["what it does", "what that makes a planner"], "steps": [{"code": "build_planning_instruction(...)", "state": ["text added to the system instruction", "structured prompting"], "tone": "accent"}, {"code": "process_planning_response(...)", "state": ["rewrites the model's parts", "plus a parser"], "changed": [0, 1], "tone": "accent"}, {"code": "so PlanReActPlanner is", "state": ["an instruction and a tag splitter", "nothing more"], "changed": [0, 1], "tone": "violet"}, {"code": "write one when", "state": ["the domain has a fixed procedure", "you want to parse and audit it"], "changed": [0, 1], "tone": "good"}, {"code": "do not when", "state": ["you only want better answers", "BuiltInPlanner, no parser"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-3_3-05-2"},

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
      requirements: [
        "Record the system instruction length with no planner, BuiltInPlanner and PlanReActPlanner",
        "Run a turn with each and count model requests and total characters sent",
        "Write a single-lookup, a compound and a poorly-described-tool question",
        "Note which planner, if any, changes the tool choice"
      ],
      hints: [
        "`llm.seen[0].config.system_instruction` is the assembled instruction.",
        "Multiply by the number of requests in the turn — that is the real cost.",
        "The poorly-described tool is where a planner most often helps."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import asyncio, json, logging, os, warnings
warnings.filterwarnings("ignore"); logging.disable(logging.WARNING)
from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner, PlanReActPlanner
from google.adk.runners import InMemoryRunner
from google.genai import types
from local_llm import LocalLlm      # reference run: local Qwen2.5-3B; with a key, put "gemini-3.8-flash" in RecordingLlm's place

class RecordingLlm(LocalLlm):
    """Records what ADK sends each model request, so the planner's cost is measured rather than guessed."""
    requests: list = []
    async def generate_content_async(self, llm_request, stream=False):
        si = llm_request.config.system_instruction or ""
        sent = len(str(si)) + sum(len(json.dumps(c.model_dump(exclude_none=True), default=str)) for c in llm_request.contents)
        self.requests.append({"system_chars": len(str(si)), "chars_sent": sent})
        async for r in super().generate_content_async(llm_request, stream): yield r

def get_order(order_id: str) -> dict:
    """Look up one order by its id, e.g. A-77."""
    return {"order_id": order_id, "status": "shipped", "carrier": "DPD"}
def get_customer(email: str) -> dict:
    """Find a customer by email address."""
    return {"email": email, "orders": ["A-77", "B-12"]}
def misc(x: str) -> str:
    """Does stuff."""                                     # a deliberately poor description
    return "refund window: 14 days"

QUESTIONS = ["What is the status of order A-77?",                                               # single lookup
             "What's the status of each order for jo@example.com?",                             # compound
             "How long is the refund window?"]                                                  # only the badly described tool can answer

PLANNERS = {"no planner": None,
            "BuiltInPlanner": BuiltInPlanner(thinking_config=types.ThinkingConfig(include_thoughts=True)),
            "PlanReActPlanner": PlanReActPlanner()}

async def main():
    print(f"{'planner':<17} {'question':<52} {'system chars':>12} {'requests':>9} {'chars sent':>11}  tools called")
    for pname, planner in PLANNERS.items():
        for q in QUESTIONS:
            llm = RecordingLlm(model="local-qwen-3b", requests=[])
            runner = InMemoryRunner(agent=LlmAgent(name="desk", model=llm, planner=planner, tools=[get_order, get_customer, misc],
                                                   instruction="Answer customer-service questions using the tools."), app_name="d")
            sid = (await runner.session_service.create_session(app_name="d", user_id="u")).id
            calls = []
            async for e in runner.run_async(user_id="u", session_id=sid, new_message=types.Content(role="user", parts=[types.Part(text=q)])):
                calls += [p.function_call.name for p in (e.content.parts if e.content else []) if p.function_call]
            r = llm.requests
            print(f"{pname:<17} {q[:52]:<52} {r[0]['system_chars']:>12} {len(r):>9} {sum(x['chars_sent'] for x in r):>11}  {calls}")
    print("\\nBuiltInPlanner only sets thinking_config, which a model without native thinking ignores (the local model here);"
          "\\non Gemini it changes cost through thinking tokens rather than through the prompt.")

asyncio.run(main())`,
        out: `planner           question                                             system chars  requests  chars sent  tools called
no planner        What is the status of order A-77?                              99         2         592  ['get_order']
no planner        What's the status of each order for jo@example.com?            99         2        1216  ['get_customer', 'get_order', 'get_order', 'get_order']
no planner        How long is the refund window?                                 99         1         170  []
BuiltInPlanner    What is the status of order A-77?                              99         2         592  ['get_order']
BuiltInPlanner    What's the status of each order for jo@example.com?            99         2        1216  ['get_customer', 'get_order', 'get_order', 'get_order']
BuiltInPlanner    How long is the refund window?                                 99         1         170  []
PlanReActPlanner  What is the status of order A-77?                            3170         2        6734  ['get_order']
PlanReActPlanner  What's the status of each order for jo@example.com?          3170         1        3262  []
PlanReActPlanner  How long is the refund window?                               3170         2        6888  ['misc', 'get_order']

BuiltInPlanner only sets thinking_config, which a model without native thinking ignores (the local model here);
on Gemini it changes cost through thinking tokens rather than through the prompt.`,
       
        notes: [
          { t: "p", text: "The numbers are stark: about sixty characters becomes about 3,137 with PlanReAct, and that goes out on every request rather than once. In a turn with two tool calls that is three requests carrying the planner text, and in a fifty-turn conversation it is a substantial share of the bill for reasoning the user never reads." },
          { t: "p", text: "The third question is the useful one. A planner most often improves tool choice where the descriptions are ambiguous — which is a signal to fix the descriptions rather than to pay for reasoning that works around them. When a planner helps, ask first whether better tool descriptions would have helped more, for free." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: thought text in front of customers",
      body: [
        { t: "p", text: "**Symptom.** Customers of a support agent began seeing paragraphs of the model's internal reasoning above its answers, including speculation about their account." },
        { t: "p", text: "**Mechanism.** The agent used `BuiltInPlanner` with `include_thoughts=True` for debugging, and the client rendered every text part of the response. Thought parts are marked as thoughts and are not meant for the user; the client did not check the flag." },
        { t: "p", text: "**Fix.** The client skips parts marked as thoughts, and thoughts are included only in non-production environments. A rendering test asserts that a response with thought parts shows only the answer." }
      ] }
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
      options: ["About 3,000 characters", "Nothing — it returns None", "A few hundred characters", "It depends on the thinking level"],
      answer: 1,
      why: "The executed run prints `None` for its planning instruction. It works by setting `thinking_config` on the request so the provider's own reasoning mode does the work, which is why it costs thinking tokens rather than prompt tokens and why it needs a model that supports thinking." },
    { stem: "Why does PlanReActPlanner define a /*REPLANNING*/ section?",
      options: ["To retry failed tool calls automatically", "So the model can revise a plan after surprises", "To split long plans across several requests", "For compatibility with older model versions"],
      answer: 1,
      why: "A plan that cannot be revised is worse than no plan, because the agent keeps following it past the point where it stopped making sense. Making replanning an explicit, named section is what stops the model treating its first guess as binding." },
    { stem: "A client renders every text part of every event. With a planner active, what does the user see?",
      options: ["Only the final answer", "Its reasoning as well as its answer", "Nothing until the plan completes", "The plan tags as literal text only"],
      answer: 1,
      why: "Reasoning comes back as parts flagged `thought=True`, alongside the answer. A client that does not filter on `part.thought` shows the user the model talking to itself — including anything it considered and rejected." },
    { stem: "You add a planner and your evaluation's trajectory score does not change. What does that tell you?",
      options: ["The planner is working exactly as intended", "You pay extra prompt tokens for no benefit", "The evaluation set must be wrong", "You need a much higher thinking level"],
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
