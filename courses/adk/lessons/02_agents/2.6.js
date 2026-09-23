/* ============================================================================
   LESSON 2.6 — Multi-Agent Architectures
   Each pattern is an ADK wiring built from the mechanisms executed in
   lessons 2.3, 2.4 and 2.5.
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "**There are five multi-agent patterns worth knowing, and each one is a specific arrangement of three mechanisms you already have: workflow agents, transfer and AgentTool.** Coordinator, supervisor, planner-executor, specialists behind a tool boundary, and the hierarchy that combines them. This lesson builds each one as ADK code, says what it is good at, and names the failure mode it brings — because the interesting question in multi-agent design is never \"can this be expressed\" but \"what breaks when it is under load\".",

  objectives: [
    "Build the coordinator, supervisor, planner-executor, specialist-as-tool and hierarchical patterns in ADK",
    "Name the failure mode each pattern introduces and the mitigation for it",
    "Decide how many agents a system needs, and when one agent is the right answer",
    "Keep each agent's tool list and context small enough for the model to be accurate",
    "Recognise the two patterns that should be code rather than agents"
  ],

  prerequisites: ["2.3", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "Why more than one agent", id: "why" },

    { t: "p", text: "Splitting an agent is not about tidiness. It is about the two things that degrade a model's accuracy as a system grows: **too many tools in one declaration list**, so the model picks the wrong one, and **too much irrelevant context**, so it answers the wrong question. Every pattern below exists to keep one model's decision small." },

    { t: "diagram", kind: "compare", title: "The three mechanisms, and what each buys",
      caption: "Everything in this lesson is one of these three, or a nesting of them. Nothing else is needed.",
      columns: [
        { title: "Workflow agents", tone: "accent", items: ["deterministic order", "no model call", "Sequential · Parallel · Loop", "lesson 2.3"] },
        { title: "transfer_to_agent", tone: "good", items: ["the target owns the conversation", "one model call to decide", "content-dependent routing", "lesson 2.5"] },
        { title: "AgentTool", tone: "warn", items: ["the caller stays in charge", "encapsulates a whole toolbox as one tool", "capability, not conversation", "lesson 2.5"] }
      ] },

    { t: "h2", n: "02", text: "Coordinator", id: "coordinator" },

    { t: "code", lang: "python", title: "A toolless router over specialists",
      code: `billing = LlmAgent(name="billing", model=M, description="Invoices, payments, refunds.",
                   instruction="…", tools=[lookup_invoice, issue_refund])
tech    = LlmAgent(name="tech", model=M, description="Connectivity, devices, outages.",
                   instruction="…", tools=[check_line, run_diagnostic])
sales   = LlmAgent(name="sales", model=M, description="Plans, upgrades, new connections.",
                   instruction="…", tools=[list_plans])

coordinator = LlmAgent(
    name="support", model=M,
    description="Front door for customer support.",
    instruction="Identify what the customer needs and transfer to the right specialist. "
                "Do not attempt to answer specialist questions yourself.",
    sub_agents=[billing, tech, sales],          # no tools of its own
)`,
      caption: "Each specialist carries two or three tools instead of one agent carrying eight. The coordinator's only action is a transfer, which is what keeps it from answering." },

    { t: "dl", items: [
      ["Good at", "Domains a user can be in only one of at a time, with clearly different vocabularies."],
      ["Failure mode", "Mis-routing on overlapping descriptions, and specialists that cannot answer a question straddling two domains — a refund for an outage."],
      ["Mitigation", "Disjoint descriptions written in the user's words; allow transfer back to the parent so a specialist can return the conversation; evaluate routing with a trajectory evalset (lesson 11.2)."]
    ] },

    { t: "h2", n: "03", text: "Supervisor, and planner-executor", id: "supervisor" },

    { t: "p", text: "A coordinator routes once and lets go. A **supervisor** keeps control: it calls specialists as tools, inspects what comes back, and decides what to do next. The difference in ADK is `AgentTool` instead of `sub_agents`." },

    { t: "code", lang: "python", title: "Supervisor: specialists as tools",
      code: `supervisor = LlmAgent(
    name="supervisor", model=M,
    instruction="Answer the user's question. Use the research agent for facts and the "
                "analyst agent for calculations. Check their output before replying.",
    tools=[AgentTool(agent=researcher), AgentTool(agent=analyst)],
)`,
      caption: "The supervisor stays the author of the final answer, so it can reject a specialist's output and ask again — a validation step a coordinator cannot perform, because after a transfer it is no longer running." },

    { t: "p", text: "**Planner-executor** splits the same idea in two: one agent decides the plan, another carries it out. The plan is data in state, which makes it inspectable, loggable and — importantly — checkable before anything executes." },

    { t: "code", lang: "python", title: "Planner-executor as a sequential pipeline",
      code: `planner = LlmAgent(name="planner", model=M, output_key="plan",
                   instruction="Break the request into at most five numbered steps. "
                               "Do not execute anything.",
                   output_schema=Plan)                       # a Pydantic model: steps[]

executor = LlmAgent(name="executor", model=M, output_key="result",
                    instruction="Execute this plan using the tools: {plan}",
                    tools=[search, fetch, write_file])

pipeline = SequentialAgent(name="plan_and_do", sub_agents=[planner, executor])`,
      caption: "The planner has no tools at all, so it cannot act; the executor has no planning instruction, so it follows. Between them sits a state key you can log, validate, or put in front of a human (lesson 9.3)." },

    { t: "diagram", kind: "compare", title: "Coordinator, supervisor, planner-executor",
      caption: "Three answers to 'who is in charge after the specialist runs'. The cost column matters: a supervisor pays for its own model call on every specialist result.",
      columns: [
        { title: "Coordinator", tone: "accent", items: ["transfer, then steps aside", "cheapest: one routing call", "specialist owns the answer", "no post-check possible"] },
        { title: "Supervisor", tone: "good", items: ["AgentTool, stays in charge", "a model call per result", "can reject and retry", "risk: it re-writes good answers"] },
        { title: "Planner-executor", tone: "warn", items: ["plan as state, then execute", "two agents, fixed order", "plan is inspectable and approvable", "risk: plans that ignore reality"] }
      ] },

    { t: "h2", n: "04", text: "Specialists behind a tool boundary", id: "encapsulation" },

    { t: "p", text: "The most under-used pattern, and the one that scales furthest. A capability with many tools becomes **one** tool from the outside:" },

    { t: "code", lang: "python", title: "Eight tools, one declaration",
      code: `research = LlmAgent(
    name="research", model=M,
    description="Answers factual questions using the document corpus and the web.",
    instruction="Search, read and cite. Return a short answer with sources.",
    tools=[vector_search, fetch_url, google_search, read_pdf,
           extract_tables, summarise, cite, dedupe],           # eight tools, one agent
)

assistant = LlmAgent(
    name="assistant", model=M,
    instruction="Help the user. Use research for anything factual.",
    tools=[AgentTool(agent=research), calendar_tool, email_tool],   # three declarations
)`,
      caption: "The assistant's model chooses between three things, not ten. The research agent's model chooses among its eight with an instruction written only for research. Both decisions are easier than the one they replace." },

    { t: "callout", kind: "insight", title: "The tool-count heuristic",
      body: [{ t: "p", text: "Accuracy falls as the declaration list grows, and the fall is steep somewhere past roughly ten tools — the exact number depends on the model and on how distinct the tools are. Treat a tool list that has grown past ten as a signal to group related tools behind an `AgentTool`, not as a prompt-tuning problem. It also cuts tokens: the sub-agent's eight declarations are sent only when the sub-agent runs." }] },

    { t: "h2", n: "05", text: "Hierarchies, and their limit", id: "hierarchy" },

    { t: "diagram", kind: "tree", title: "A realistic production tree",
      caption: "Two levels of routing, specialists holding small tool lists, and one shared capability reached as a tool rather than by transfer — so any agent can research without the conversation moving.",
      root: { label: "root · router", sub: "toolless coordinator", tone: "accent", children: [
        { label: "support", sub: "transfers down", tone: "good", children: [
          { label: "billing", sub: "3 tools", tone: "warn" },
          { label: "tech", sub: "3 tools", tone: "warn" }
        ] },
        { label: "sales", sub: "2 tools", tone: "good" },
        { label: "research", sub: "AgentTool · 8 tools", tone: "violet" }
      ] } },

    { t: "p", text: "Depth costs latency and clarity: every level of transfer is a model call, and a conversation three transfers deep is hard to reason about and harder to evaluate. **Two levels of routing is enough for almost everything**; if you need a third, ask whether the middle level is really a level or just a category name that could be a description." },

    { t: "h2", n: "06", text: "Two patterns that should be code", id: "notagents" },

    { t: "dl", items: [
      ["The fixed pipeline dressed as delegation", "A coordinator that always routes A then B then C is a `SequentialAgent` with three extra model calls and a routing error rate. If the order never depends on the request, the model should not be choosing it (lesson 2.3)."],
      ["Routing on a known field", "Choosing a specialist by plan tier, region or language is a dict lookup. Put it in a custom agent or a graph edge and keep the model for free-text ambiguity (lesson 2.4)."]
    ] },

    { t: "diagram", kind: "steps", title: "How many agents does this system need",
      caption: "Start at one. Split only when one of these fires — and note that the first two are measurable, not matters of taste.",
      items: [
        { label: "Does one agent's tool list exceed about ten?", desc: "group related tools behind an AgentTool", tone: "accent" },
        { label: "Do two parts of the job need contradictory instructions?", desc: "'be concise and factual' against 'be warm and reassuring' — split them", tone: "good" },
        { label: "Does one part need a different model?", desc: "a cheap model for classification, a strong one for drafting", tone: "warn" },
        { label: "Does one part need different permissions?", desc: "the agent that can issue refunds should not be the agent that talks to anonymous users", tone: "crit" },
        { label: "Otherwise: keep one agent", desc: "every split adds a model call, a failure mode and an evaluation surface", tone: "violet" }
      ] },

    { t: "exercise", kind: "design", title: "Design a system, then defend the count", difficulty: "advanced", minutes: 25,
      body: [{ t: "p", text: "Design the agent architecture for an internal engineering assistant that can: search the wiki and the code, open and update tickets, check CI status, summarise an incident, and draft a postmortem. Some of those need write permissions; two of them are slow. Give the wiring — which agents exist, which mechanism connects each pair, which tools each holds — and then defend the number of agents against someone who says one agent with eleven tools would do." }],
      requirements: [
        "A tree or graph with the mechanism on each edge",
        "Tool lists per agent",
        "The defence, in terms of tool count, instructions, model choice and permissions"
      ],
      hint: "Read-only and write capabilities are the natural seam here.",
      solution: { lang: "python", title: "One reasonable answer",
        code: `knowledge = LlmAgent(name="knowledge", model=M_FAST,
    description="Searches the wiki, the code and past incidents.",
    instruction="Search and cite. Never guess.",
    tools=[wiki_search, code_search, incident_search])          # read-only, 3 tools

tickets = LlmAgent(name="tickets", model=M,
    description="Creates and updates Jira tickets.",
    instruction="Confirm the summary with the user before creating anything.",
    tools=[create_ticket, update_ticket])                       # WRITE — separate agent

ci = LlmAgent(name="ci", model=M_FAST,
    description="Reports build and pipeline status.",
    instruction="Report status factually.", tools=[ci_status])

writer = LlmAgent(name="writer", model=M_STRONG,
    description="Drafts incident summaries and postmortems.",
    instruction="Write clearly and blamelessly, using {findings}.",
    tools=[])                                                   # no tools: it writes

assistant = LlmAgent(name="assistant", model=M,
    instruction="Help the engineer. Research with the knowledge tool. "
                "Transfer ticket work to the tickets agent.",
    tools=[AgentTool(agent=knowledge), AgentTool(agent=ci)],     # capabilities
    sub_agents=[tickets, writer])                                # conversations`,
        notes: [{ t: "p", text: "The defence: eleven tools in one list is past the accuracy cliff and mixes read with write, so a single mis-selected tool creates a ticket nobody asked for. The knowledge and CI agents are capabilities the assistant uses without handing over the conversation, so they are AgentTools; ticket work and postmortem drafting are conversations with their own rules, so they are sub-agents. The writer gets the strong model and no tools; the two lookup agents get the fast one. And the write-capable agent is the only place that needs elevated credentials, which is a security boundary as much as an architectural one (lesson 9.1)." }] } }
  ],

  takeaways: [
    "Split agents to keep each model's decision small: fewer tools in the declaration list, less irrelevant context.",
    "Coordinator = toolless router with sub_agents; the specialist owns the conversation after the transfer.",
    "Supervisor = specialists as AgentTools; the supervisor stays in charge and can reject a result, at the cost of a model call per result.",
    "Planner-executor puts the plan in state between two agents, which makes it loggable, checkable and approvable before anything runs.",
    "AgentTool encapsulates a whole toolbox as one declaration — the pattern that scales furthest and is used least.",
    "Two levels of routing is enough for almost every system; each extra level is a model call and an evaluation surface.",
    "A fixed pipeline and a route decided by a known field should both be code, not a coordinator's model call."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is the practical reason for splitting one agent into several?",
      options: ["Code tidiness", "Each model's decision gets smaller: a shorter tool list and less irrelevant context, which raises accuracy", "Agents run in parallel automatically", "It reduces the number of model calls"],
      answer: 1,
      why: "Splitting adds model calls, so it is not a cost optimisation. It is an accuracy one: a model choosing among three well-separated tools with an instruction written for one job is more reliable than the same model choosing among eleven with a general instruction — and the sub-agent's declarations are only sent when it runs." },
    { stem: "Which pattern lets the top-level agent check a specialist's output before replying?",
      options: ["Coordinator with sub_agents", "Supervisor with AgentTool", "SequentialAgent", "LoopAgent"],
      answer: 1,
      why: "After a transfer the coordinator is no longer running, so it cannot inspect anything. With AgentTool the specialist's output comes back as a tool result and the supervisor's model writes the final answer, so it can reject the result and call again — at the cost of one model call per specialist result." },
    { stem: "Your agent's tool list has grown to fourteen tools and it now picks the wrong one regularly. What is the fix?",
      options: ["A longer instruction explaining each tool", "A lower temperature", "Group related tools behind an AgentTool so the caller sees three or four declarations", "Rename the tools"],
      answer: 2,
      why: "Accuracy degrades as the declaration list grows, and prose in the instruction does not undo it — the model still has fourteen similar-looking options. Grouping them into a sub-agent that appears as one tool restores a small decision at both levels, and cuts tokens because the inner declarations are only sent when the sub-agent runs." },
    { stem: "A coordinator always routes to research, then to drafting, then to review, in that order. What should it be?",
      options: ["A supervisor", "A SequentialAgent — the order never depends on the request", "A LoopAgent", "Three coordinators"],
      answer: 1,
      why: "If the order is fixed, asking a model to choose it three times costs three round trips and adds a routing error rate for a decision with a known answer. A SequentialAgent runs the three agents in order with no model call of its own, and the pipeline becomes deterministic and testable." }
  ] },

  interview: { title: "Interview", sub: "Architecture questions", questions: [
    { level: "Core", q: "When does a system need more than one agent?",
      strong: "When one tool list is too long, when two jobs need contradictory instructions, when parts need different models, or when parts need different permissions.",
      answer: [{ t: "p", text: "Not for tidiness — every split costs a model call and adds a failure mode. Four triggers justify it. The tool list: past roughly ten declarations a model starts choosing badly, so related tools get grouped behind an AgentTool. Contradictory instructions: 'be terse and factual' and 'be warm and reassuring' cannot both govern one agent well. Different models: classification can run on a cheap model while drafting needs a strong one, and that is only possible if they are separate agents. Different permissions: the agent that can issue refunds should not be the one exposed to anonymous users, which makes the split a security boundary. Absent one of those, one agent with a good instruction is the better system." }] },
    { level: "Core", q: "Describe the coordinator pattern and its main risk.",
      strong: "A toolless router with sub_agents; the risk is mis-routing on overlapping descriptions, and specialists that cannot handle cross-domain questions.",
      answer: [{ t: "p", text: "A front-door agent with no tools of its own and several specialists as sub_agents. Its model reads the specialists' description fields and calls transfer_to_agent; the specialist then owns the conversation and answers. It is the cheapest multi-agent pattern — one routing call — and it keeps each specialist's tool list short. The risks are all at the boundaries: descriptions that overlap produce silent mis-routing, and a question spanning two domains, like a refund for an outage, strands the user in one specialist. The mitigations are disjoint descriptions written in the user's vocabulary, allowing transfer back to the parent so a specialist can return the conversation, and a trajectory evalset that measures which agent handled which case rather than only whether the final answer looked reasonable." }] },
    { level: "Senior", q: "How would you design a multi-agent system so that it stays debuggable at ten agents?",
      strong: "Shallow hierarchy, capabilities as AgentTools, deterministic orchestration wherever the order is known, one trace per invocation and an evalset per routing decision.",
      answer: [{ t: "p", text: "Keep the tree shallow — two levels of routing at most, because the third level is usually a category name pretending to be an agent. Express every fixed sequence as a workflow agent so it cannot mis-route and costs nothing, and reserve transfer for branches that genuinely depend on free text. Make shared capabilities AgentTools rather than transfer targets, so using research does not move the conversation. Give every agent a disjoint description and a tool list under about ten. Then the operational half: one trace per invocation with a span per agent and tool so a bad answer can be attributed to a step; the invocation id in every log line; and an evalset per routing decision, with every mis-route captured as a case before it is fixed. The thing that actually keeps it debuggable is that the deterministic parts are deterministic — if every edge in the system is a model's judgement, no amount of tracing will tell you why today differed from yesterday." }] }
  ] }
});
