/* ============================================================================
   LESSON 9.3 — Human in the Loop
   The confirmation request, the synthetic adk_request_confirmation call, the
   long_running_tool_ids and the resumed approval are executed output from
   scratchpad/adk/h1.py on google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "9.3",

  lede: "**Some actions should not happen because a language model decided they should.** Not because the model is unreliable in general, but because a refund, a deletion or an email to a regulator has a cost that no confidence level justifies paying automatically. ADK's answer is a tool that pauses: the call is intercepted before the function body runs, a confirmation request is emitted as an event, the turn ends, and the work resumes only when a person answers. This lesson runs both halves — the pause and the approval — and prints what each one puts in the session.",

  objectives: [
    "Mark a tool as requiring confirmation and read the events that produces",
    "Resume a paused tool call with an approval and watch it complete",
    "Distinguish `require_confirmation` from a manual `request_confirmation`",
    "Design the approval workflow around the pause — queue, notification, expiry",
    "Decide which actions need a human and which need only a good guardrail"
  ],

  prerequisites: ["4.5", "9.2"],

  blocks: [

    { t: "h2", n: "01", text: "Declaring that a tool needs approval", id: "declaring" },

    { t: "code", lang: "python", title: "h1.py — one flag",
      code: `from google.adk.tools import FunctionTool

async def refund(order_id: str, amount: float, tool_context) -> dict:
    """Refunds an order.

    Args:
        order_id: the order.
        amount: the amount to refund.
    """
    return {"status": "refunded", "order_id": order_id, "amount": amount}

agent = LlmAgent(name="support", model=MODEL,
                 tools=[FunctionTool(refund, require_confirmation=True)])`,
      caption: "`require_confirmation` also accepts a callable, so approval can depend on the arguments — over a threshold, outside business hours, for a particular customer tier." },

    { t: "h2", n: "02", text: "What the pause looks like", id: "pause" },

    { t: "out", text: `--- turn 1: the agent asks for approval ---
  call refund({'order_id': 'A-77', 'amount': 250.0})
  call adk_request_confirmation({'originalFunctionCall': {'id': 'adk-ed7d2c65-…', 'args': {'order_id': 'A-77', 'amount': 250.0}, 'name': 'refund'},
                                 'toolConfirmation': {'hint': 'Please approve or reject the tool call refund() …', 'confirmed': False}})
  long_running_tool_ids: {'adk-56616809-…'}
  response refund -> {'error': 'This tool call requires confirmation, please approve or reject.'}
  actions.requested_tool_confirmations = {'adk-ed7d2c65-…': ToolConfirmation(hint='…', confirmed=False, payload=None)}

events after turn 1: 4
  user      final=True  confirmations=False
  support   final=False confirmations=False
  support   final=True  confirmations=False
  support   final=True  confirmations=True` },

    { t: "p", text: "Five things happened, and the first is the one that matters: **the function body never ran**. ADK intercepted the call, then:" },

    { t: "dl", items: [
      ["Emitted a synthetic call", "`adk_request_confirmation`, carrying the original function call — its id, name and arguments — so whoever reviews it can see exactly what was proposed."],
      ["Marked it long-running", "`long_running_tool_ids` on the event tells the caller this turn is waiting on something external rather than finished (lesson 4.5)."],
      ["Returned an error for the real tool", "`{'error': 'This tool call requires confirmation…'}` — so the model knows the action did not happen and says so rather than claiming success."],
      ["Recorded the request in actions", "`requested_tool_confirmations` maps the call id to a `ToolConfirmation` with `hint`, `confirmed` and `payload`. This is what your approval interface reads."],
      ["Ended the turn", "Four events, the last carrying the pending confirmation. Nothing is blocked, no connection is held open, and the process could restart without losing the request."]
    ] },

    { t: "callout", kind: "insight", title: "The pause is durable because it is an event",
      body: [{ t: "p", text: "The pending approval is not a coroutine waiting in memory — it is a record in the session, which means it survives a deploy, a crash and a load balancer sending the next request to a different replica. That is the difference between an approval mechanism you can run in production and one that works on a laptop." }] },

    { t: "h2", n: "03", text: "The approval", id: "approval" },

    {"kind": "cycle", "title": "The pause and the resume", "caption": "Executed both halves. The pending request is an event in the session rather than a coroutine in memory, which is what lets an approval arrive after a deploy and still work.", "centre": "durable", "nodes": [{"label": "Model calls the tool", "sub": "ordinary function call", "tone": "accent"}, {"label": "ADK intercepts", "sub": "the body does not run", "tone": "crit"}, {"label": "Turn ends", "sub": "pending confirmation recorded", "tone": "warn"}, {"label": "A human decides", "sub": "your queue, your authorisation", "tone": "violet"}, {"label": "Function response", "sub": "confirmed: true | false"}, {"label": "Tool runs", "sub": "the reviewed arguments", "tone": "good"}], "t": "diagram", "id": "dg-9_3-03-0"},


    { t: "code", lang: "python", title: "Resuming with a decision",
      code: `approval = types.Content(role="user", parts=[types.Part(
    function_response=types.FunctionResponse(
        id=confirm_call_id,                 # the adk_request_confirmation call id
        name="adk_request_confirmation",
        response={"confirmed": True},
    ))])

async for event in runner.run_async(user_id="u1", session_id=sid, new_message=approval):
    ...` },

    { t: "out", text: `--- turn 2: the reviewer approves ---
  confirmation call id: adk-b55f3b6a-8b10-46ee-9dab-282591d96c52
  response refund -> {'status': 'refunded', 'order_id': 'A-77', 'amount': 250.0}
  events total: 7` },

    { t: "p", text: "The approval is delivered as an ordinary function response addressed to the confirmation call's id, and the tool body finally runs with the original arguments — `A-77`, `250.0`, exactly as proposed and reviewed. `{\"confirmed\": False}` instead would let the tool return a declined result the model relays to the user." },

    { t: "diagram", kind: "steps", title: "The full round trip",
      caption: "Steps 4 and 5 are your application, not ADK. The framework gives you a durable pending request and a way to resume; the workflow around it is yours to build.",
      items: [
        { label: "Model calls the tool", sub: "ordinary function call" },
        { label: "ADK intercepts", sub: "body does not run; confirmation requested" },
        { label: "Turn ends", sub: "pending request recorded in the session" },
        { label: "You notify a human", sub: "queue, email, Slack, an approvals screen" },
        { label: "They decide", sub: "your interface, your authorisation" },
        { label: "Resume", sub: "function response with confirmed true or false" },
        { label: "Tool runs", sub: "original arguments, conversation continues" }
      ] },

    { t: "h2", n: "04", text: "The workflow you still have to build", id: "workflow" },

    { t: "table", head: ["Concern", "What to decide"],
      rows: [
        ["Who may approve", "ADK does not check. Your interface authorises the reviewer — and the reviewer must not be the person who asked"],
        ["How they find out", "A pending request sitting in a session helps nobody; something has to notify a queue, a channel or a rota"],
        ["What they see", "The confirmation carries the original call and arguments. Show those, plus the conversation that led to them"],
        ["Expiry", "A request nobody answers is a conversation stuck forever. Decide a timeout and what happens at it"],
        ["Audit", "Who approved what, when, and on what evidence — the events give you the request; you supply the decision record"],
        ["The waiting user", "The turn ended with an explanation. Make sure the agent's reply says approval was requested, not that the refund happened"]
      ] },

    { t: "callout", kind: "trap", title: "The reviewer is reviewing a model's proposal",
      body: [{ t: "p", text: "Approval fatigue is real: a person clicking through forty near-identical requests is not a control, they are a rubber stamp with a name attached. If approvals are frequent, the threshold is wrong — tighten the tool so that routine cases do not need a human, and reserve the interruption for cases that genuinely warrant one. An approval step that is always approved is worse than none, because it creates the appearance of oversight." }] },

    { t: "h2", n: "05", text: "The manual form", id: "manual" },

    { t: "code", lang: "python", title: "When the tool decides for itself",
      code: `async def refund(order_id: str, amount: float, tool_context) -> dict:
    """Refunds an order. Amounts over 100 need approval."""
    if amount > 100:
        confirmation = tool_context.tool_confirmation
        if confirmation is None:
            await tool_context.request_confirmation(
                hint=f"Approve a refund of {amount} on order {order_id}?",
                payload={"order_id": order_id, "amount": amount},
            )
            return {"status": "awaiting approval"}
        if not confirmation.confirmed:
            return {"status": "declined by reviewer", "retryable": False}
    return do_refund(order_id, amount)`,
      caption: "`request_confirmation(hint=…, payload=…)` lets you write the hint a human will read and attach a payload your interface can render — which the generic message from `require_confirmation` does not." },

    { t: "callout", kind: "good", title: "Use the flag for the rule, the call for the message",
      body: [{ t: "p", text: "`require_confirmation=True` (or a callable on the arguments) is declarative, visible at the agent definition, and cannot be forgotten inside a branch — which is what you want for the rule itself. The manual `request_confirmation` earns its place when the human needs context the arguments do not carry: the customer's history, the three previous refunds this month, why the agent thinks this one is justified. Many production tools use the flag for enforcement and a rich payload for presentation." }] },

    { t: "h2", n: "06", text: "When to ask a human at all", id: "when" },

    { t: "diagram", kind: "compare", title: "Three responses to a risky action",
      caption: "Approval is the middle option and it is often reached for when one of the others is right. It costs a person's attention every time.",
      columns: [
        { title: "Block it", tone: "crit", items: ["The action is never acceptable here", "A before_tool rule (9.2)", "No human involved", "Refunds to a foreign account"] },
        { title: "Ask a human", tone: "warn", items: ["Legitimate but consequential", "require_confirmation", "Costs attention every time", "A large refund, a production restart"] },
        { title: "Let it run", tone: "good", items: ["Reversible, bounded, logged", "Narrow tool plus audit", "No friction", "A small credit, a draft email"] }
      ] },

    { t: "callout", kind: "tradeoff", title: "Reversibility is the real criterion",
      body: [{ t: "p", text: "Ask whether the action can be undone, and how expensive the undo is. A draft that a person sends later needs no approval, because the human is already in the loop at the point that matters. A sent email cannot be recalled. A deleted record can be restored from backup at some cost; a refund is money that has moved. Design actions to be reversible where you can — draft rather than send, stage rather than apply — and reserve approval for the ones that genuinely cannot be." }] },

    { t: "exercise", kind: "practice", title: "Build the approval loop", difficulty: "advanced", minutes: 30,
      prompt: "Write a tool that deletes a record, marked require_confirmation with a callable so only deletions of more than ten records need approval. Run a small deletion and confirm it proceeds. Run a large one, capture the adk_request_confirmation call id and the requested_tool_confirmations entry, and print what an approval screen would show. Resume with confirmed False and check the user-facing reply, then with True in a fresh session. Finally, restart your process between the request and the approval and confirm it still works.",
      hints: [
        "The callable receives the arguments, so the threshold lives there rather than inside the tool body.",
        "The confirmation call id is what you address the approval to.",
        "Use a database session service for the restart test — an in-memory one cannot survive it."
      ],
      solution: {
        notes: [
          { t: "p", text: "The declined path is the one people skip and the one users notice. With `confirmed: False` the tool can return a declined result and the model explains that the deletion was not approved — which is a much better experience than a turn that simply stops, and it is only available because the refusal comes back as data rather than as an error." },
          { t: "p", text: "The restart test is the point of the whole exercise. Because the pending request is an event in a persisted session rather than a coroutine in memory, an approval that arrives after a deploy still works. That is what makes this a production mechanism, and it is also a reminder that an in-memory session service quietly removes the property." }
        ]
      } }

  ],

  takeaways: [
    "`require_confirmation` intercepts the call before the function body runs — nothing happens until a human answers.",
    "ADK emits a synthetic `adk_request_confirmation` call carrying the original call, marks it long-running, and returns an error for the real tool.",
    "`requested_tool_confirmations` on the event actions is what an approval interface reads.",
    "Approval is delivered as a function response to the confirmation call id with `{\"confirmed\": true|false}`.",
    "The pause is a durable event, so it survives restarts and replica changes.",
    "ADK gives you the pause; the queue, the notification, the authorisation, the expiry and the audit are yours."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A tool marked require_confirmation is called. What runs?",
      options: ["The tool body, then the confirmation", "Nothing — the body is intercepted and a confirmation is requested", "The body runs in a sandbox", "The body runs and is rolled back if declined"],
      answer: 1,
      why: "The interception happens before the function is invoked, which is the only ordering that is safe — a body that had already run could not be undone by a refusal. The executed trace shows the real tool returning an error saying confirmation is required while the function itself never executed." },
    { stem: "How is an approval delivered back to the agent?",
      options: ["By calling approve() on the runner", "As a function response addressed to the adk_request_confirmation call id", "By setting state['approved'] = True", "By re-sending the original message"],
      answer: 1,
      why: "The approval is an ordinary function response with `{\"confirmed\": true}` addressed to the confirmation call's id, sent as the next message. The tool then runs with the original arguments — the ones that were reviewed, not new ones the model might produce on a second attempt." },
    { stem: "Why does the pending confirmation survive a process restart?",
      options: ["It is held in a background task", "It is recorded as an event in the session", "The runner keeps a queue", "It does not survive"],
      answer: 1,
      why: "The request is written into the session as an event carrying `requested_tool_confirmations`, so a different replica or a restarted process can read it and accept the approval later. Nothing is blocked in memory — which is what makes this usable when approval takes an afternoon." },
    { stem: "Approvals for your agent are approved 98% of the time within seconds. What does that indicate?",
      options: ["The guardrail is working well", "The threshold is wrong and the approval is a rubber stamp", "Reviewers are well trained", "You should add more approval steps"],
      answer: 1,
      why: "A reviewer clicking through near-identical requests is not exercising judgement, and the step creates the appearance of oversight without the substance. Routine cases should be handled by a tighter tool or a guardrail, so that an interruption means something and gets real attention." }
  ] },

  interview: { title: "Interview", sub: "Human-in-the-loop questions", questions: [
    { level: "Core", q: "How do you make an agent ask a person before doing something?",
      strong: "`require_confirmation` on the tool — ADK intercepts the call, records a pending confirmation as an event, and ends the turn.",
      answer: [{ t: "p", text: "You mark the tool, with a flag or a callable on the arguments so only consequential cases trigger it. The framework then intercepts before the body runs: it emits a synthetic confirmation call carrying the original call and its arguments, marks the turn as waiting on something long-running, and returns an error for the real tool so the model tells the user approval was requested rather than claiming it was done. The approval comes back later as a function response addressed to that confirmation call, and the tool runs with the original arguments. The part worth emphasising is that the pending request is an event in the session, not something held in memory, so it survives a restart and works when approval takes hours." }] },
    { level: "Core", q: "What does ADK not give you?",
      strong: "The workflow — who is notified, who may approve, what they see, when it expires, and the audit record.",
      answer: [{ t: "p", text: "It gives you a durable pause and a way to resume. Everything around it is the application: something has to notice the pending request and notify a queue or a rota, because a confirmation sitting in a session helps nobody; an interface has to show the proposed call and the conversation that led to it; that interface has to authorise the reviewer, since ADK does not check who is answering and the requester should not be able to approve their own request; and there has to be an expiry, or an unanswered request leaves a conversation stuck indefinitely. The audit trail is half given — the events record what was proposed — and half yours, which is who decided and on what basis." }] },
    { level: "Senior", q: "Which actions in an agent system should require human approval?",
      strong: "Irreversible and consequential ones — and far fewer than teams initially propose, because approval fatigue destroys the control.",
      answer: [{ t: "p", text: "My criterion is reversibility and cost of the undo. Something a person can review later anyway — a drafted email, a staged change — needs no approval, because the human is already in the loop at the point that matters, and designing actions that way is usually better than adding an approval step. Money moving, data deleted, messages sent externally and anything with a regulatory consequence are where I would interrupt. What I push back on is a long list of approvals, for two reasons. A reviewer clicking through forty similar requests is a rubber stamp, and the appearance of oversight is worse than none because it stops people asking whether the tool should be that powerful. And approvals that fire constantly mean the threshold is in the wrong place — the fix is a narrower tool so routine cases never reach a human. I also separate approval from prohibition: if an action is never acceptable, it should be blocked in a callback, not offered to somebody at three in the morning." }] }
  ] }
});
