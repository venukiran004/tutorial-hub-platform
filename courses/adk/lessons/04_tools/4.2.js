/* ============================================================================
   LESSON 4.2 — ToolContext: State, Artifacts, Actions and Auth
   The context's surface was introspected on 2.9.2 and its behaviour — state
   scopes, temp: not persisting, skip_summarization — was executed.
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "**A tool that only returns a value is a function; a tool that takes a `ToolContext` is part of the agent.** The context is what lets a tool read and write session state, save and load files, search long-term memory, ask for a credential, request human confirmation, and change what the framework does next with its own result. This lesson runs a tool that inspects its context, shows which state scopes persist and which do not, and covers the actions a tool can set — including the one that returns its output straight to the user without a second model call.",

  objectives: [
    "Take a ToolContext parameter and use state, artifacts, memory and credentials from inside a tool",
    "Choose the right state scope, and say which one is discarded",
    "Set actions — skip_summarization, escalate, transfer — and describe the effect of each",
    "Identify a tool call by its function_call_id for logging and correlation",
    "Decide what belongs in state, in the return value, or in an artifact"
  ],

  prerequisites: ["4.1", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "What the context carries", id: "surface" },

    { t: "code", lang: "python", title: "A tool that reports on its own context",
      code: `def inspect_ctx(topic: str, tool_context: ToolContext) -> dict:
    """Looks something up and records it.

    Args:
        topic: what to look up.
    """
    tool_context.state["last_topic"] = topic                      # session scope
    tool_context.state["user:seen"] = tool_context.state.get("user:seen", 0) + 1
    tool_context.state["temp:scratch"] = "not persisted"
    return {
        "agent_name": tool_context.agent_name,
        "invocation_id": tool_context.invocation_id[-8:],
        "function_call_id": (tool_context.function_call_id or "")[:12],
        "user_id": tool_context.user_id,
        "state_keys_visible": sorted(tool_context.state.to_dict()),
    }` },

    { t: "out", text: `session state after: {'existing': 1, 'last_topic': 'pricing', 'app:region': 'in', 'user:seen': 1}` },

    { t: "p", text: "Two things to read there. The tool saw the state that already existed — including the `app:`-scoped key seeded on the session — and its writes landed. And `temp:scratch` is **not** in the persisted state: the `temp:` prefix marks a value that lives for the invocation and is then discarded (lesson 5.2)." },

    { t: "diagram", kind: "compare", title: "The four things a ToolContext gives a tool",
      caption: "Introspected from 2.9.2. The same object is what callbacks receive, which is why the two lesson groups — tools and callbacks — read so similarly.",
      columns: [
        { title: "Identity", tone: "accent", items: ["agent_name", "invocation_id", "function_call_id", "user_id", "branch"] },
        { title: "Data", tone: "good", items: ["state (read and write)", "save_artifact / load_artifact", "list_artifacts", "search_memory / add_memory"] },
        { title: "Control", tone: "warn", items: ["actions.skip_summarization", "actions.escalate", "actions.transfer_to_agent", "request_confirmation()"] },
        { title: "Credentials", tone: "violet", items: ["request_credential()", "get_auth_response()", "save_credential / load_credential"] }
      ] },

    { t: "h2", n: "02", text: "State from a tool", id: "state" },

    { t: "table", head: ["Write", "Scope", "Survives"],
      rows: [
        ["`state[\"draft\"] = …`", "This session", "The whole conversation; persisted by the session service"],
        ["`state[\"user:tier\"] = …`", "This user, across sessions", "Every future conversation with the same user_id"],
        ["`state[\"app:banner\"] = …`", "Every user of the app", "Application-wide configuration"],
        ["`state[\"temp:x\"] = …`", "This invocation", "**Discarded** — not written to the session"]
      ] },

    { t: "p", text: "The mechanism is the same as everywhere else: the assignment is collected into the event's `state_delta` and applied when the event is appended (lesson 1.4). A tool therefore cannot lose a state write by raising *after* the assignment — but it also cannot read another agent's write that has not yet been appended." },

    { t: "callout", kind: "insight", title: "State or return value?",
      body: [{ t: "p", text: "Return what the model needs to compose its answer; write to state what *later turns or other agents* need. A retrieved document's three relevant sentences go in the return value; the fact that this user has now asked about refunds twice goes in `user:` state. Putting everything in the return value re-sends it on every later call; putting everything in state hides it from the model that needs it now." }] },

    { t: "h2", n: "03", text: "Actions: changing what happens next", id: "actions" },

    {"kind": "flow", "title": "actions change what the framework does next", "caption": "A tool that only returns a value is a function. Setting an action is how a tool participates in the control flow — and skip_summarization was measured at one model call instead of two.", "cols": 4, "nodes": [{"id": "t", "label": "Tool returns", "sub": "plus actions set on the context", "tone": "accent"}, {"id": "s", "label": "skip_summarization", "sub": "the result IS the answer", "tone": "good"}, {"id": "e", "label": "escalate", "sub": "ends the enclosing loop", "tone": "warn"}, {"id": "x", "label": "transfer_to_agent", "sub": "hands the turn to another agent", "tone": "violet"}], "edges": [["t", "s"], ["t", "e"], ["t", "x"]], "t": "diagram", "id": "dg-4_2-03-0"},



    { t: "code", lang: "python", title: "skip_summarization — the tool's result is the answer",
      code: `def raw(q: str, tool_context: ToolContext) -> dict:
    """Returns data the user should see verbatim.

    Args:
        q: the query.
    """
    tool_context.actions.skip_summarization = True
    return {"rows": [1, 2, 3]}` },

    { t: "out", text: `   raw   call raw                                                        final=False
   raw   resp raw {'rows': [1, 2, 3]}  skip_summarization              final=True
   model calls made: 1` },

    { t: "p", text: "Normally a tool result goes back to the model, which writes the answer — two model calls for one tool. With `skip_summarization` the function-response event *is* the final response and the second call never happens. Use it when the tool's output is already what the user asked for — a table, a chart, a file reference — and you do not want a model paraphrasing it. It halves the latency of that turn." },

    { t: "dl", items: [
      ["`actions.skip_summarization = True`", "Return the tool result directly; no follow-up model call."],
      ["`actions.escalate = True`", "Break out of an enclosing `LoopAgent` — what the built-in `exit_loop` tool does (lesson 2.3)."],
      ["`actions.transfer_to_agent = \"name\"`", "Hand the conversation to another agent from inside a tool — programmatic routing without asking the model (lesson 2.5)."],
      ["`tool_context.request_confirmation(hint=…, payload=…)`", "Pause and ask a human before this tool's effect is accepted (lessons 4.5 and 9.3)."],
      ["`tool_context.request_credential(…)`", "Pause and ask the user to authenticate, then resume with the credential (lesson 4.8)."]
    ] },

    { t: "h2", n: "04", text: "Artifacts and memory from a tool", id: "artifacts" },

    { t: "code", lang: "python", title: "Producing a file and recalling a fact",
      code: `async def build_report(month: str, tool_context: ToolContext) -> dict:
    """Builds the monthly report and saves it.

    Args:
        month: the month, e.g. '2026-09'.
    """
    pdf_bytes = render_pdf(month)
    version = await tool_context.save_artifact(
        filename=f"report-{month}.pdf",
        artifact=types.Part(inline_data=types.Blob(mime_type="application/pdf", data=pdf_bytes)),
    )
    return {"status": "ok", "filename": f"report-{month}.pdf", "version": version}


async def recall(query: str, tool_context: ToolContext) -> dict:
    """Searches everything this user has said before.

    Args:
        query: what to look for.
    """
    result = await tool_context.search_memory(query)
    return {"matches": [m.text for m in result.memories[:3]]}`,
      caption: "The artifact tool returns the *filename and version*, not the bytes — sending a PDF back through the model would be absurd. The memory tool returns three snippets, not the whole match set (lessons 6.3 and 5.4)." },

    { t: "h2", n: "05", text: "Identity, for logging", id: "identity" },

    { t: "p", text: "Three ids reach a tool, and each answers a different question in a log line or a trace span:" },

    { t: "diagram", kind: "layers", title: "The three ids, from widest to narrowest",
      caption: "Log all three from every tool. When a user reports 'it did the wrong thing this morning', the session id finds the conversation, the invocation id finds the turn, and the function_call_id finds the exact call.",
      items: [
        { label: "session_id", sub: "the conversation — via tool_context.session", tone: "warn" },
        { label: "invocation_id", sub: "this one user turn, shared by every event and agent in it", tone: "accent" },
        { label: "function_call_id", sub: "this specific tool call, unique even among parallel calls", tone: "good" }
      ] },

    { t: "code", lang: "python", title: "A logging line worth copying",
      code: `log.info("tool=%s call=%s invocation=%s user=%s args=%s",
         "book_table", tool_context.function_call_id, tool_context.invocation_id,
         tool_context.user_id, {"restaurant_id": restaurant_id, "people": people})`,
      caption: "Arguments are logged explicitly rather than with `**kwargs`, so a tool that later takes a password does not log it by accident (lesson 9.1)." },

    { t: "exercise", kind: "practice", title: "One tool, four side effects", difficulty: "core", minutes: 18,
      body: [{ t: "p", text: "Write a `place_order` tool that: records the order id in session state, increments a per-user order count, saves the receipt as an artifact, and returns a small confirmation to the model. Then add a fifth behaviour — if the total is above ₹10,000 it must not complete without a human. Say which context facility you used for each of the five." }],
      requirements: ["The tool with all five behaviours", "The state scopes named and justified", "The mechanism for the human check"],
      hint: "The fifth is not something the tool decides by returning a value.",
      solution: { lang: "python", title: "Solution",
        code: `async def place_order(cart_id: str, total_paise: int, tool_context: ToolContext) -> dict:
    """Places an order for the current cart.

    Args:
        cart_id: the cart to convert to an order.
        total_paise: the order total in paise.
    """
    if total_paise > 1_000_000:                      # 5. above 10,000 rupees
        tool_context.request_confirmation(
            hint=f"Approve an order of {total_paise/100:.2f} rupees?",
            payload={"cart_id": cart_id, "total_paise": total_paise})
        return {"status": "awaiting_approval"}

    order = api.place(cart_id)
    tool_context.state["last_order_id"] = order.id                        # 1. session scope
    tool_context.state["user:order_count"] = tool_context.state.get("user:order_count", 0) + 1   # 2. user scope
    await tool_context.save_artifact(                                      # 3. artifact service
        filename=f"receipt-{order.id}.pdf",
        artifact=types.Part(inline_data=types.Blob(mime_type="application/pdf", data=order.receipt)))
    return {"status": "ok", "order_id": order.id, "eta_days": order.eta}   # 4. small return value`,
        notes: [{ t: "p", text: "Note what is not in the return value: the receipt bytes, the full order object, the user's running count. The model needs the order id and the ETA to write a sentence; everything else is either a file or state for later turns. And the approval is a context call, not a return value, because the framework has to pause the invocation — a tool cannot achieve that by returning something (lesson 9.3)." }] } }
  ],

  takeaways: [
    "A tool_context parameter is injected by the framework and stripped from the model's declaration, so a tool gets services the model never sees.",
    "State writes from a tool ride on the event's state_delta; app:, user: and session scopes persist and temp: is discarded.",
    "Return what the model needs now; write to state what later turns or other agents need.",
    "actions.skip_summarization makes the tool result the final response and saves a model call; escalate breaks a loop; transfer_to_agent routes programmatically.",
    "request_confirmation and request_credential pause the invocation — effects a tool cannot achieve by returning a value.",
    "save_artifact returns a version number; return the filename and version to the model, never the bytes.",
    "Log session_id, invocation_id and function_call_id from every tool: the conversation, the turn and the exact call."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A tool writes state['temp:scratch'] = 'x'. What is in the session afterwards?",
      options: ["temp:scratch = 'x'", "scratch = 'x'", "Nothing — temp: values are discarded after the invocation", "It raises"],
      answer: 2,
      why: "The executed run confirmed it: after a tool wrote last_topic, user:seen and temp:scratch, the persisted session state contained the first two and not the third. temp: is for values that matter only within the current invocation, such as a partial result passed between two tools of the same turn." },
    { stem: "What does actions.skip_summarization do?",
      options: ["Shortens the model's answer", "Makes the function-response event the final response, so no second model call happens", "Skips the tool", "Hides the tool result from the session"],
      answer: 1,
      why: "The trace showed one model call instead of two, with the function-response event marked final. It is the right setting when the tool's output is already the answer — a table, a file reference, a chart — and paraphrasing it would only add latency and a chance of distortion." },
    { stem: "Your tool needs a human to approve before its effect is accepted. What do you do?",
      options: ["Return {'needs_approval': True} and hope the model asks", "Call tool_context.request_confirmation(...)", "Raise an exception", "Write to state and return"],
      answer: 1,
      why: "Approval requires the framework to pause the invocation and surface a request to the caller, which a return value cannot do — the model would simply read the dict and carry on, possibly inventing an approval. request_confirmation sets the action that the runtime and the client act on (lesson 9.3)." },
    { stem: "Which id identifies one specific tool call, even when two tools were called in the same model turn?",
      options: ["session_id", "invocation_id", "function_call_id", "user_id"],
      answer: 2,
      why: "invocation_id covers the whole turn including both parallel calls; session_id covers the conversation. function_call_id is unique per call, which is what lets a log line or a trace span be attributed to exactly one of two concurrent executions." }
  ] },

  interview: { title: "Interview", sub: "Tool-context questions", questions: [
    { level: "Core", q: "What can a tool do that a plain function cannot?",
      strong: "Read and write scoped state, save and load artifacts, search memory, request credentials or human approval, and change what the framework does with its result.",
      answer: [{ t: "p", text: "By declaring a tool_context parameter — which the framework injects and hides from the model — a tool gains the whole agent runtime. It can read and write session state in four scopes, so it can remember something for later turns or for this user across conversations. It can save a file through the artifact service and get back a version number. It can search long-term memory. It can ask for an OAuth credential, which pauses the invocation until the user authenticates. It can request human confirmation before its effect is accepted. And through actions it can change the flow: return its result directly without a summarising model call, break out of a loop, or transfer the conversation to another agent." }] },
    { level: "Core", q: "When would you set skip_summarization?",
      strong: "When the tool's output is already the user-facing answer and a model paraphrase would add latency and distortion.",
      answer: [{ t: "p", text: "The default flow sends a tool result back to the model so it can write a sentence, which costs a round trip. If the tool already produced the deliverable — a rendered table, a chart, a generated file's link, a structured record the UI will render — then the paraphrase adds a second of latency and a chance that the model restates a number incorrectly. Setting skip_summarization on the tool context makes the function-response event the final response, and the caller renders it. The trade-off is that nothing conversational wraps the output, so it is wrong for a result the user would expect to be explained." }] },
    { level: "Senior", q: "How do you decide between state, the return value, and an artifact?",
      strong: "Return value for what the model needs now, state for what later turns need, artifact for bytes.",
      answer: [{ t: "p", text: "Three different lifetimes. The return value is evidence for the model's next sentence and stays in the conversation history, re-sent on every later call — so it should be the smallest set of fields that supports an answer. State is for facts later turns or other agents need: the current draft, the selected account, a per-user preference in the user: scope. It is not sent to the model unless an instruction interpolates it, so it is cheap to keep. Artifacts are for binary or large content — a generated PDF, an uploaded image — which belongs in neither of the other two; the tool returns the filename and version and something else loads it when needed. The common mistake is returning everything, which makes every subsequent model call more expensive and gives the model more ways to quote the wrong number." }] }
  ] }
});
