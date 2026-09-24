/* ============================================================================
   LESSON 5.5 — The Context Objects
   The identity check, the surfaces and the call order were executed on
   google-adk 2.9.2 (scratchpad/adk/s5.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.5",

  lede: "**Every extension point in ADK — instructions, callbacks, tools, custom agents — is handed a context object, and in 2.x most of them are handed the same one.** The names survive from earlier versions and are still what you type, but `ToolContext`, `CallbackContext` and the new unified `Context` are literally the same class. What actually varies is how much you are allowed to do with it, and that distinction has exactly one real boundary: read-only or not. This lesson runs an agent whose instruction, callback and tool all report on the context they received, and prints the surfaces side by side.",

  objectives: [
    "Name which context object arrives at each extension point",
    "Explain what `ReadonlyContext` deliberately withholds and why",
    "Read and write state, artifacts, memory and credentials through a context",
    "Use an instruction provider to build a prompt from state",
    "Distinguish the per-invocation `InvocationContext` from the per-call contexts"
  ],

  prerequisites: ["4.2", "5.2"],

  blocks: [

    { t: "h2", n: "01", text: "One class, several names", id: "identity" },

    { t: "code", lang: "python", title: "The check that makes 2.x make sense",
      code: `from google.adk.agents.callback_context import CallbackContext
from google.adk.tools import ToolContext
from google.adk.agents.context import Context
print(ToolContext is CallbackContext is Context)` },

    { t: "out", text: "True" },

    { t: "callout", kind: "insight", title: "If you learned ADK 1.x, unlearn the hierarchy",
      body: [{ t: "p", text: "`ToolContext` and `CallbackContext` used to be distinct classes with distinct capabilities, and a lot of writing about ADK still describes them that way. In 2.x they are aliases of one `Context`. Type hints written against either name still work and still read well — a tool taking `tool_context: ToolContext` documents itself — but do not reason about what a callback can do by assuming it has less than a tool. It has exactly the same object." }] },

    { t: "h2", n: "02", text: "The one real boundary", id: "readonly" },

    { t: "code", lang: "python", title: "What each surface exposes",
      code: `print(sorted(n for n in dir(ReadonlyContext) if not n.startswith("_")))
extra = set(dir(Context)) - set(dir(ReadonlyContext))` },

    { t: "out", text: `ReadonlyContext surface: ['agent_name', 'custom_metadata', 'get_credential', 'invocation_id',
                         'run_config', 'session', 'state', 'user_content', 'user_id']

Context adds 34 more: ['actions', 'add_memory', 'add_session_to_memory', 'attempt_count', 'branch',
 'error', 'event_author', 'function_call_id', 'get_artifact_version', 'get_auth_response',
 'get_invocation_context', 'interrupt_ids', 'list_artifacts', 'load_artifact', 'load_credential',
 'node', 'node_path', 'output', 'parent_ctx', 'render_ui_widget', 'request_confirmation',
 'request_credential', 'resume_inputs', 'route', 'run_id', 'run_node', 'save_artifact',
 'save_credential', 'search_memory', 'telemetry_context', 'tool_confirmation', ...]` },

    { t: "p", text: "`ReadonlyContext` is nine members: identity, the session, the state as it currently reads, the user's message and the run configuration. It is what an **instruction provider** receives, and the restriction is not bureaucratic. An instruction is built once per model request, possibly several times per turn; if it could write state or emit actions, a prompt-building function would have side effects that fire an unpredictable number of times. Making it read-only turns instruction building into a pure function of the current state." },

    { t: "diagram", kind: "compare", title: "Which object arrives where",
      caption: "Three of these four are the same Python object. InvocationContext is genuinely different: it is the framework's own per-turn record, handed to custom agents.",
      columns: [
        { title: "ReadonlyContext", tone: "accent", items: ["Instruction providers", "9 members", "Read state, cannot write", "Pure prompt construction"] },
        { title: "CallbackContext", tone: "good", items: ["The 8 callback hooks (6.1)", "= Context", "Write state, set actions, artifacts", "Intercept and adjust"] },
        { title: "ToolContext", tone: "warn", items: ["Tools that ask for it (4.2)", "= Context", "Same powers, plus function_call_id", "Do work with side effects"] },
        { title: "InvocationContext", tone: "violet", items: ["Custom agents' _run_async_impl", "The services themselves", "session_service, artifact_service, memory_service, run_config", "Drive the invocation"] }
      ] },

    { t: "h2", n: "03", text: "All three, in one run", id: "run" },

    {"kind": "steps", "title": "The order the executed run printed", "caption": "Nine lines of output for one tool-using turn. The instruction provider appears twice because the turn made two model requests — which is exactly why it must not have side effects.", "items": [{"label": "before_agent", "sub": "writes state; runs once", "tone": "violet"}, {"label": "instruction(ctx)", "sub": "ReadonlyContext — sees the state just written", "tone": "accent"}, {"label": "tool(tool_context)", "sub": "sees greeted=True from the callback", "tone": "good"}, {"label": "instruction(ctx)", "sub": "again — second model request", "tone": "accent"}], "t": "diagram", "id": "dg-5_5-03-0"},



    { t: "code", lang: "python", title: "s5.py — an agent that narrates its own contexts",
      code: `def instruction(ctx: ReadonlyContext) -> str:
    print(f"  [instruction provider] agent={ctx.agent_name} invocation={ctx.invocation_id[:8]} "
          f"tier={ctx.state.get('tier')} user_said={ctx.user_content.parts[0].text!r}")
    return f"You serve a {ctx.state.get('tier')} customer. Be brief."

def before_agent(ctx: CallbackContext):
    ctx.state["greeted"] = True
    return None

def lookup(item: str, tool_context: ToolContext) -> dict:
    """Looks up an item."""
    print(f"  [tool] function_call_id={tool_context.function_call_id} "
          f"tier={tool_context.state.get('tier')} greeted={tool_context.state.get('greeted')}")
    return {"item": item, "price": 12}

agent = LlmAgent(name="shop", model=llm, instruction=instruction,
                 before_agent_callback=before_agent, tools=[lookup])` },

    { t: "out", text: `  [before_agent]  writes state, has actions=EventActions
  [instruction provider] agent=shop invocation=e-54c6b2 tier=gold user_said='how much is the lamp?'
  [tool] function_call_id=adk-cfe56d52-150b-44a5-9d9f-b2cdb58c84ba tier=gold greeted=True
  [instruction provider] agent=shop invocation=e-54c6b2 tier=gold user_said='how much is the lamp?'

system instruction the model received:
   You serve a gold customer. Be brief.

   You are an agent. Your internal name is "shop".` },

    { t: "p", text: "The ordering is the lesson. `before_agent` ran **first** and wrote state; the instruction provider then ran and saw the world after that write; the tool saw `greeted=True` because state written by a callback is visible for the rest of the invocation. And the instruction provider ran **twice** — once per model request, since this turn made two — which is exactly why it must not have side effects. All of them shared one `invocation_id`, the thread that ties a turn together in logs." },

    { t: "callout", kind: "trap", title: "An instruction provider runs once per model call, not once per turn",
      body: [{ t: "p", text: "A turn with three tool round trips builds the instruction four times. If your provider queries a database, you have made four queries; if it increments a counter, you have counted four times. Read state, format a string, return. Anything expensive should be computed in a `before_agent_callback`, written to state, and read from there." }] },

    { t: "h2", n: "04", text: "What you actually do with a context", id: "uses" },

    { t: "table", head: ["Need", "Call", "Notes"],
      rows: [
        ["Read or write state", "`ctx.state[\"k\"]`", "Writes become a delta on the emitted event (5.2)"],
        ["Save or load a file", "`ctx.save_artifact(name, part)` / `ctx.load_artifact(name)`", "Needs an artifact service on the runner (6.3)"],
        ["Search long-term memory", "`await ctx.search_memory(query)`", "Needs a memory service; this is what `load_memory` wraps"],
        ["Get a credential", "`ctx.get_credential(...)` / `ctx.request_credential(...)`", "`get_credential` is on the read-only surface too (4.8)"],
        ["Change what happens next", "`ctx.actions.skip_summarization = True`, `.escalate`, `.transfer_to_agent`", "Only on the writable contexts"],
        ["Ask a human", "`await ctx.request_confirmation(...)`", "Suspends the call until a person answers (9.3)"],
        ["Identify this call", "`ctx.function_call_id`, `ctx.invocation_id`", "Log both; they are how you correlate a complaint to a trace"]
      ] },

    { t: "h2", n: "05", text: "Instruction providers", id: "providers" },

    { t: "p", text: "`instruction` accepts a string or a callable. The string form supports `{key}` templating from state and is right for most agents. The callable form earns its keep when the prompt's **shape** depends on state, not just its values." },

    { t: "code", lang: "python", title: "When a function beats a template",
      code: `def instruction(ctx: ReadonlyContext) -> str:
    base = "You are a booking assistant. Be concise."
    if ctx.state.get("user:tier") == "gold":
        base += " This customer has priority support; offer the concierge line."
    if pending := ctx.state.get("pending_booking"):
        base += f"\\nThere is an unfinished booking: {pending}. Offer to resume it."
    return base`,
      caption: "A `{pending_booking}` template would raise when the key is absent; the function simply omits the sentence. Optional context is the main reason to reach for a provider." },

    { t: "callout", kind: "good", title: "State in the instruction beats state in the history",
      body: [{ t: "p", text: "A fact stated in the system instruction is restated on every request, at the front, where the model attends to it. The same fact mentioned forty messages ago is one line in a long transcript competing with everything else. When an agent keeps 'forgetting' something, the fix is usually not a bigger context window — it is writing the fact to state and interpolating it into the instruction." }] },

    { t: "h2", n: "06", text: "InvocationContext, the one that is different", id: "invocation" },

    {"kind": "flow", "title": "Getting from one context to the other", "caption": "A writable context can reach the InvocationContext, which carries the services themselves. Needing that from inside a tool is usually a sign the work belongs in a custom agent.", "cols": 3, "nodes": [{"id": "t", "label": "ToolContext", "sub": "= CallbackContext = Context", "tone": "good"}, {"id": "i", "label": "InvocationContext", "sub": "get_invocation_context()", "tone": "violet"}, {"id": "s", "label": "The services", "sub": "session, artifact, memory, credential", "tone": "accent"}, {"id": "e", "label": "end_invocation", "sub": "stop the whole turn", "tone": "crit"}], "edges": [["t", "i"], ["i", "s"], ["i", "e"]], "t": "diagram", "id": "dg-5_5-06-1"},



    { t: "p", text: "A custom agent's `_run_async_impl` receives an `InvocationContext`. This is the framework's own record of the turn, and it carries things the per-call contexts deliberately do not: the **services themselves** (`session_service`, `artifact_service`, `memory_service`, `credential_service`), the `run_config`, the resumability and compaction configuration, and `end_invocation` — the flag a custom agent sets to stop the whole turn." },

    { t: "code", lang: "python", title: "What a custom agent gets to touch",
      code: `class Gate(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext):
        if ctx.session.state.get("blocked"):
            ctx.end_invocation = True                 # stop the turn entirely
            yield Event(author=self.name,
                        content=types.Content(role="model",
                            parts=[types.Part(text="This account is on hold.")]))
            return
        async for event in self.sub_agents[0].run_async(ctx):
            yield event`,
      caption: "Lesson 2.4 built custom agents properly; the point here is which context they receive and why it is a different object." },

    { t: "callout", kind: "note", title: "Getting from one to the other",
      body: [{ t: "p", text: "`ctx.get_invocation_context()` on a writable context returns the `InvocationContext`. It is occasionally the right escape hatch — reaching the artifact service directly, say — and usually a sign you want a custom agent instead. If a tool needs to drive the invocation, it is doing an agent's job." }] },

    { t: "exercise", kind: "practice", title: "Watch the contexts in order", difficulty: "core", minutes: 18,
      prompt: "Build an agent with an instruction provider, a before_agent_callback, a before_model_callback and one tool. Have each print its context's class name, the invocation id, and the current value of a state key that the callback increments. Run one turn that uses the tool, and explain the order and the repetition in the output.",
      hints: [
        "Print `type(ctx).__name__` as well as the parameter's type hint — they will not agree, and that is the lesson.",
        "The before_model callback runs once per model request, like the instruction provider.",
        "Increment a counter in before_model and watch how many times it fires in one turn."
      ],
      solution: {
        notes: [
          { t: "p", text: "The order is before_agent, then for each model request: the instruction provider and before_model, then either a tool call or the final answer. A turn with one tool call therefore shows the agent-level hook once and the per-request hooks twice, which is the shape of every ADK turn and worth being able to draw from memory." },
          { t: "p", text: "`type(ctx).__name__` prints `Context` in all three places, whatever you annotated the parameter as. Keep the descriptive hints — `tool_context: ToolContext` still communicates where the function is used — but never write logic that branches on the class, because it cannot distinguish them." }
        ]
      } }

  ],

  takeaways: [
    "`ToolContext`, `CallbackContext` and `Context` are the same class in 2.x; only `ReadonlyContext` is genuinely different.",
    "`ReadonlyContext` has nine members and reaches instruction providers, which must stay side-effect free.",
    "An instruction provider runs once per model request — several times in a tool-using turn.",
    "A writable context is how you touch state, artifacts, memory, credentials, actions and confirmation.",
    "`InvocationContext` is the per-turn record handed to custom agents, and carries the services and `end_invocation`.",
    "A fact in the instruction is restated every request; a fact buried in history competes with everything else."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Your instruction provider queries a pricing API. One turn makes two tool calls. How many API calls does it make?",
      options: ["One", "Two", "Three", "Four"],
      answer: 2,
      why: "The provider runs once per model request. Two tool calls means three requests — one that chose the first tool, one that chose the second, one that produced the answer — so three API calls. Fetch once in a `before_agent_callback`, write to state, and have the provider read state." },
    { stem: "Why is an instruction provider given a ReadonlyContext rather than the full one?",
      options: ["Instructions are cached and must be deterministic", "Because it may run several times per turn, so side effects would be unpredictable", "Because it runs before the session is loaded", "To stop it reading user data"],
      answer: 1,
      why: "It reads state freely — it is only writing and emitting actions that are withheld. The reason is the repetition: a function that runs an unknown number of times per turn must not have side effects, so the type makes prompt construction a pure function of state." },
    { stem: "A colleague writes `if isinstance(ctx, ToolContext): ...` in a helper shared by tools and callbacks. What happens?",
      options: ["It works — the classes are distinct", "It is always True, because the classes are identical", "It raises, because ToolContext cannot be used with isinstance", "It is True only inside tools"],
      answer: 1,
      why: "`ToolContext is CallbackContext is Context` evaluates to True on 2.9.2, so the check passes everywhere and the branch is meaningless. If a helper needs to know where it was called from, pass that in explicitly — `function_call_id` being set is a hint, but an argument is honest." },
    { stem: "Which context gives you the session service itself?",
      options: ["ToolContext", "ReadonlyContext", "InvocationContext", "All of them, via .session"],
      answer: 2,
      why: "`InvocationContext` carries `session_service`, `artifact_service`, `memory_service` and `credential_service` as fields — it is the framework's own record of the turn, handed to custom agents. The per-call contexts expose `session` (the data) and convenience methods, not the services." }
  ] },

  interview: { title: "Interview", sub: "Context questions", questions: [
    { level: "Core", q: "What is the difference between ToolContext and CallbackContext?",
      strong: "In ADK 2.x, none — they are the same class. The real boundary is ReadonlyContext versus the writable one.",
      answer: [{ t: "p", text: "I would say plainly that they used to be different and are not any more: on 2.9 an identity check shows `ToolContext is CallbackContext is Context`. The distinction that still matters is read-only versus writable. Instruction providers get a `ReadonlyContext` with nine members — identity, session, state, the user's message, run config — precisely because they may run several times per turn and must not have side effects. Everything else gets the full object and can write state, save artifacts, search memory, set actions, request confirmation. I still type-hint the descriptive names because they document where a function belongs, but I would never branch on the class." }] },
    { level: "Core", q: "How would you make an agent's prompt depend on who the user is?",
      strong: "Put the facts in state and either template them into the instruction or build it with an instruction provider.",
      answer: [{ t: "p", text: "The simple version is `{user:tier}` in the instruction string, substituted from state before the request is built. I move to a provider function when the prompt's shape changes rather than just its values — an extra paragraph for priority customers, a sentence about an unfinished booking that is only there when one exists. A template with a missing key raises rather than rendering a hole, so optional context is the usual reason to write the function. Either way the fact lives in state, which means it is restated at the front of every single request instead of sitting forty messages back in the transcript, and that placement is most of why it works." }] },
    { level: "Senior", q: "A tool needs to stop the whole turn immediately. What are the options and which would you pick?",
      strong: "Set escalate for a loop, return a refusal for the normal case, or write a custom agent if you truly need to end the invocation.",
      answer: [{ t: "p", text: "It depends on what 'stop' means. Inside a `LoopAgent`, `ctx.actions.escalate = True` ends the loop, which is the designed mechanism and the one I reach for first. For a refusal — the user asked for something the tool will not do — the honest answer is to return a structured error and let the model relay it, because the user deserves an explanation and the event log deserves the record. Genuinely ending the invocation, with nothing further generated, is `end_invocation` on the `InvocationContext`, and that is reachable from a tool only via `get_invocation_context()`. If I found myself doing that I would treat it as a design smell and move the decision into a custom agent or a `before_agent_callback`, where stopping the turn is a first-class thing to do rather than a tool reaching up through the framework." }] }
  ] }
});
