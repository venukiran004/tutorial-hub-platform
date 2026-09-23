/* ============================================================================
   LESSON 4.5 — Agents as Tools, Long-Running Tools and Confirmation
   The AgentTool trace, the long-running tool's event ids and the
   confirmation API were all taken from runs on google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "**Three tool wrappers cover the cases an ordinary function cannot: an agent used as a tool, work that outlives the turn, and an action that must not happen without a human.** `AgentTool` turns a whole agent — with its own model, instruction and toolbox — into one declaration. `LongRunningFunctionTool` lets a tool return *pending* and have the real result arrive later. `require_confirmation` makes the framework pause before the tool's effect is accepted. This lesson runs all three and shows what each does to the event stream.",

  objectives: [
    "Wrap an agent as a tool and explain what it hides from the caller's model",
    "Use skip_summarization on an AgentTool and say what it saves",
    "Return from a long-running tool and identify the event fields that mark it",
    "Require confirmation for a tool, conditionally on its arguments",
    "Decide which of the three wrappers a given requirement needs"
  ],

  prerequisites: ["4.2", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "AgentTool", id: "agenttool" },

    { t: "code", lang: "python", title: "An agent behind a function declaration",
      code: `from google.adk.tools import AgentTool

translator = LlmAgent(name="translator", model=M,
                      description="Translates text to Hindi.", instruction="Translate.")

main_agent = LlmAgent(name="main", model=M,
                      instruction="Use the translator tool when asked.",
                      tools=[AgentTool(agent=translator)])`,
      caption: "`AgentTool(agent, skip_summarization=False, include_plugins=True, propagate_grounding_metadata=False)` — introspected from 2.9.2. The tool's name is the agent's name and its description is the agent's description, which is one more reason to write those two fields carefully." },

    { t: "out", text: `   main   call translator{'request': 'hello'}      final=False
   main   result translator                        final=False
   main   "It is 'Namaste'."                       final=True` },

    { t: "p", text: "The sub-agent received a `request` argument, ran its own model call, and returned a value. The caller stayed in charge and wrote the final answer — the opposite of `transfer_to_agent`, where the target answers and the caller is finished (lesson 2.5)." },

    { t: "diagram", kind: "flow", title: "What AgentTool hides",
      caption: "The caller's model sees one declaration. Behind it, the sub-agent has its own instruction, its own model — possibly a cheaper or stronger one — and its own tool list, whose declarations are only sent when the sub-agent runs.",
      cols: 3,
      nodes: [
        { id: "c", label: "caller's model", sub: "sees: translator(request)", tone: "accent" },
        { id: "a", label: "AgentTool", sub: "name and description from the agent", tone: "good" },
        { id: "s", label: "sub-agent", sub: "own model, instruction, 8 tools", tone: "warn" }
      ],
      edges: [["c", "a"], ["a", "s"]] },

    { t: "dl", items: [
      ["`skip_summarization=True`", "The sub-agent's output is returned to the user directly rather than being paraphrased by the caller's model — one round trip saved when the specialist's answer is already the answer."],
      ["`input_schema` on the sub-agent", "Turns the single `request` string into structured arguments the caller's model must fill in (lesson 6.4)."],
      ["`output_schema` on the sub-agent", "Makes the tool's result structured data rather than prose, which the caller can then use programmatically."],
      ["`include_plugins`", "Whether app-wide plugins run for the inner agent as well (lesson 6.2). Usually yes — a logging or guardrail plugin should not have a hole in it."]
    ] },

    { t: "h2", n: "02", text: "Long-running tools", id: "longrunning" },

    { t: "p", text: "Some work does not fit in a request: a report that takes four minutes, an approval that a manager will get to tomorrow, a batch job. A `LongRunningFunctionTool` returns immediately with a pending marker; the invocation completes, and the real result is delivered later." },

    { t: "code", lang: "python", title: "Start the work, return a ticket",
      code: `from google.adk.tools import LongRunningFunctionTool

def start_export(dataset: str) -> dict:
    """Starts a long export and returns a ticket.

    Args:
        dataset: what to export.
    """
    enqueue_job(dataset)                       # a durable queue, not a thread
    return {"status": "pending", "ticket": "EXP-9"}

agent = LlmAgent(name="exporter", model=M, instruction="Export on request.",
                 tools=[LongRunningFunctionTool(func=start_export)])` },

    { t: "out", text: `   lr   call start_export                                      final=True
   lr   resp start_export {'status': 'pending', 'ticket': 'EXP-9'}  final=False
   lr   'started'                                              final=True

   long_running_tool_ids on events: [['adk-a69a60d0-0900-4ed4-bb46-76d69682b217']]` },

    { t: "p", text: "Two things to notice. The event carries **`long_running_tool_ids`**, which is how a caller knows the invocation is waiting on something rather than finished. And `is_final_response()` is true on the *call* event — the framework treats a pending long-running call as a legitimate stopping point, because there is nothing more to do until the outside world reports back." },

    { t: "diagram", kind: "steps", title: "The long-running lifecycle",
      caption: "The agent does not wait. The completion arrives as a new interaction carrying the function response for the original call id, and the model resumes from there.",
      items: [
        { label: "Tool enqueues real work and returns pending", desc: "with a ticket the outside world can refer to", tone: "accent" },
        { label: "The invocation ends", desc: "the event carries long_running_tool_ids; the user is told it started", tone: "good" },
        { label: "A worker finishes the job", desc: "your infrastructure, not the agent — a durable queue, not a background task", tone: "warn" },
        { label: "The result is delivered back", desc: "as a function response for that call, which resumes the conversation", tone: "violet" }
      ] },

    { t: "callout", kind: "trap", title: "The work must be durable, not a background task",
      body: "Returning pending and then doing the work in an `asyncio.create_task` inside the same process reproduces the FastAPI BackgroundTasks failure exactly: a deploy or a crash loses it, and nothing recorded that it existed. The tool should enqueue to something that survives a restart — a queue, a jobs table, a workflow service — and the worker should be able to deliver the result back by ticket." },

    { t: "h2", n: "03", text: "Confirmation", id: "confirmation" },

    { t: "code", lang: "python", title: "Two ways to require a human",
      code: `from google.adk.tools import FunctionTool

# 1. always
FunctionTool(refund_order, require_confirmation=True)

# 2. conditionally, on the arguments — signature verified on 2.9.2:
#    check_require_confirmation(args: dict[str, Any], tool_context: ToolContext) -> bool
FunctionTool(refund_order, require_confirmation=lambda args, ctx: args["amount_paise"] > 1_000_000)

# 3. from inside the tool, when only the tool knows
def delete_records(query: str, tool_context: ToolContext) -> dict:
    """Deletes records matching a query.

    Args:
        query: which records to delete.
    """
    count = count_matching(query)
    if count > 100:
        tool_context.request_confirmation(
            hint=f"This will delete {count} records. Proceed?",
            payload={"query": query, "count": count})
        return {"status": "awaiting_approval", "count": count}
    return do_delete(query)`,
      caption: "`ToolConfirmation` has three fields — `hint`, `confirmed`, `payload` — so the approving client sees why it is being asked and gets back the context it needs to decide. The request appears in `EventActions.requested_tool_confirmations`." },

    { t: "p", text: "The framework's part is to pause and surface the request; **your client's part is to ask a human and resume the invocation with the answer**, which is the full human-in-the-loop flow of lesson 9.3. What matters here is that this is a tool-level decision: the same agent can have three safe tools and one that always stops for approval." },

    { t: "h2", n: "04", text: "Choosing a wrapper", id: "choosing" },

    { t: "diagram", kind: "matrix", title: "Which wrapper solves which problem",
      caption: "They compose: a long-running tool can also require confirmation, and an AgentTool can wrap an agent whose own tools require confirmation.",
      rows: ["A capability with many tools of its own", "Work that takes minutes or days", "An action that needs approval", "A specialist that should talk to the user"],
      cols: ["wrapper"],
      cells: [
        [{ text: "AgentTool", tone: "accent" }],
        [{ text: "LongRunningFunctionTool", tone: "warn" }],
        [{ text: "require_confirmation / request_confirmation", tone: "crit" }],
        [{ text: "none — use sub_agents and transfer", tone: "good" }]
      ] },

    { t: "exercise", kind: "practice", title: "Three requirements, three wrappers", difficulty: "core", minutes: 18,
      body: [{ t: "p", text: "Implement the tool layer for an operations agent that can: (a) answer infrastructure questions using a research capability that has six tools of its own; (b) trigger a database restore that takes twenty minutes; (c) scale a production service down, which must never happen without a named human approving. Write the three tool declarations — not the bodies — and say what the event stream looks like for each." }],
      requirements: ["Three wrappers, correctly chosen", "The event-stream consequence of each", "One sentence on what (b) needs from your infrastructure"],
      hint: "(c) should carry enough in the payload for the approver to decide without asking.",
      solution: { lang: "python", title: "Solution",
        code: `tools = [
    # (a) six tools hidden behind one declaration; the caller's model sees "research"
    AgentTool(agent=research_agent),

    # (b) returns a ticket immediately; the event carries long_running_tool_ids and the
    #     invocation ends. A worker delivers the result later by ticket.
    LongRunningFunctionTool(func=start_restore),

    # (c) always pauses: EventActions.requested_tool_confirmations is set and the
    #     invocation waits for the client to resume with a decision.
    FunctionTool(scale_service, require_confirmation=True),
]

def scale_service(service: str, replicas: int, tool_context: ToolContext) -> dict:
    """Scales a production service to a replica count.

    Args:
        service: the service name.
        replicas: the target replica count.
    """
    tool_context.request_confirmation(
        hint=f"Scale {service} to {replicas} replicas in production?",
        payload={"service": service, "replicas": replicas,
                 "current": current_replicas(service), "requested_by": tool_context.user_id})
    ...`,
        notes: [{ t: "p", text: "(b) needs a durable queue and a worker that can deliver a result back against the ticket — not a background task in the agent process, which a deploy would lose. The payload in (c) matters as much as the pause: an approver who has to go and look up the current replica count will approve blindly instead." }] } }
  ],

  takeaways: [
    "AgentTool turns an agent into one tool declaration, hiding its model, instruction and whole toolbox from the caller's model.",
    "The AgentTool's name and description come from the agent, and skip_summarization returns its output without a paraphrasing round trip.",
    "LongRunningFunctionTool returns pending immediately; the event carries long_running_tool_ids and the call event is treated as a final response.",
    "Long-running work must be enqueued durably — a background task in the agent process is lost on deploy.",
    "require_confirmation takes True or a predicate over (args, tool_context); a tool can also call request_confirmation when only it knows the stakes.",
    "ToolConfirmation carries hint, confirmed and payload, and the request appears in EventActions.requested_tool_confirmations.",
    "Use transfer instead of a wrapper when the specialist should own the conversation rather than return a value."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does the caller's model see when a sub-agent is wrapped in an AgentTool?",
      options: ["All of the sub-agent's tools", "One tool declaration, named and described by the sub-agent's name and description", "The sub-agent's instruction", "Nothing until it is called"],
      answer: 1,
      why: "The wrapper presents a single function declaration. Everything inside — the sub-agent's model, instruction and tool list — is invisible to the caller's model, and those inner declarations are only sent when the sub-agent actually runs. That is what keeps a large capability from bloating the caller's context." },
    { stem: "A LongRunningFunctionTool returns {'status': 'pending'}. What is true of the resulting events?",
      options: ["The invocation blocks until the work finishes", "The event carries long_running_tool_ids and the invocation completes", "The tool is retried automatically", "Nothing is recorded until completion"],
      answer: 1,
      why: "The executed trace showed long_running_tool_ids on the event and is_final_response() true on the call event: the agent has done all it can, so the invocation ends and the user is told the work started. The real result arrives later as a function response against that call." },
    { stem: "You want approval only for refunds above ₹10,000. What is the cleanest way?",
      options: ["A branch inside the tool body", "require_confirmation as a predicate over (args, tool_context)", "Two separate tools", "An instruction telling the model to ask"],
      answer: 1,
      why: "require_confirmation accepts a callable with the signature (args, tool_context) -> bool, so the condition lives in the tool's declaration rather than inside its body. An instruction telling the model to ask is not a control at all — the model can skip it." },
    { stem: "A specialist should answer the user directly and keep the conversation. Which mechanism?",
      options: ["AgentTool", "LongRunningFunctionTool", "sub_agents and transfer_to_agent", "require_confirmation"],
      answer: 2,
      why: "AgentTool returns a value to the caller, which then writes the answer. When the specialist should own the conversation — the user is now in the billing flow — it belongs in sub_agents so the model can transfer to it, and the specialist produces the final response itself." }
  ] },

  interview: { title: "Interview", sub: "Wrapper questions", questions: [
    { level: "Core", q: "How do you keep a large toolbox from degrading an agent's accuracy?",
      strong: "Group related tools into sub-agents and expose each as an AgentTool, so every model sees a short list.",
      answer: [{ t: "p", text: "Tool-selection accuracy falls as the declaration list grows, and prose in the instruction does not recover it. The structural fix is AgentTool: a research capability with six tools becomes one declaration on the caller, and the six inner declarations are only sent when that sub-agent runs. Both models then face a small decision — three or four options each — with an instruction written for one job. It also saves tokens on every call that does not use the capability, and it lets the sub-agent use a different model. The alternative, sub_agents with transfer, is the wrong tool here because it hands over the conversation rather than returning a value." }] },
    { level: "Core", q: "When would you use a long-running tool instead of simply waiting for the result?",
      strong: "When the work outlives the request: minutes of processing, or an approval a person will get to later.",
      answer: [{ t: "p", text: "Holding a request open for a four-minute export wastes a worker, breaks through any proxy timeout, and loses everything if the process restarts. A long-running tool returns immediately with a ticket, the invocation ends, and the user is told the work has started. The event carries long_running_tool_ids so the caller knows the turn is waiting on something external rather than finished. The actual work has to go to durable infrastructure - a queue and a worker - because a background task living inside the agent process disappears on the next deploy. When the worker finishes, the result is delivered back as the function response for that call and the conversation continues from there. Human approval is the same shape with a person in place of the worker." }] },
    { level: "Senior", q: "Design the tool layer for an agent that can restart production services.",
      strong: "A confirmed tool with a rich payload, a long-running pattern for anything slow, narrow parameters, and the audit trail from the events.",
      answer: [{ t: "p", text: "The dangerous action gets require_confirmation, so the framework pauses and the client must resume with an explicit decision from a named human — an instruction asking the model to confirm is not a control. The confirmation payload carries everything the approver needs to decide without going to look it up: the service, the current and target state, who asked, and the blast radius. The tool's parameters are as narrow as possible — a service name from an allow-list rather than free text — because the confirmation protects against a wrong decision, not a wrong parameter. If the restart takes minutes, it becomes a long-running tool that enqueues durably and returns a ticket, so a deploy does not lose it. And the audit trail is already there: the events record who was asked, what payload they saw and what they decided, which is what an incident review will want." }] }
  ] }
});
