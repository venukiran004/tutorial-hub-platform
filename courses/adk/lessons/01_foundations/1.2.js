/* ============================================================================
   LESSON 1.2 — ADK Against LangChain, LangGraph and Agent Engine
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "**Three of these four are libraries and one is a hosting product, which is the first thing to get straight.** LangChain is a general toolkit for LLM applications with an agent layer on top; LangGraph is a graph runtime for stateful, long-running workflows; ADK is an agent runtime with an opinionated object model; Agent Engine is Vertex AI's managed place to *run* any of them. Comparisons that put all four in one column produce nonsense — \"ADK or Agent Engine\" is like asking \"Django or Heroku\". This lesson puts each on the axis it actually competes on, shows the same agent expressed in ADK and in a graph framework's shape, and gives the four questions that decide the choice.",

  objectives: [
    "Place ADK, LangChain, LangGraph and Agent Engine at the right layer, and say which pairs are genuine alternatives",
    "Compare ADK and LangGraph on orchestration model, state, persistence and streaming",
    "Say what LangChain offers that ADK does not, and the reverse",
    "Explain why an ADK agent can be deployed to Agent Engine, Cloud Run, GKE or your own container",
    "Answer the four questions that decide a framework choice for a given project"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "The layer mistake", id: "layers" },

    { t: "diagram", kind: "layers", title: "Where each one sits",
      caption: "Only the middle layer holds alternatives to each other. A hosted runtime can run an agent from any framework; a framework can be deployed to any runtime.",
      items: [
        { label: "Hosted runtimes: Agent Engine, Cloud Run, GKE, your container", sub: "where the process runs, who scales it, who stores sessions", tone: "warn" },
        { label: "Agent frameworks: ADK, LangGraph, LangChain agents, CrewAI, plain code", sub: "how you express the agent — the layer where the choice is real", tone: "accent" },
        { label: "Model APIs: Gemini, Claude, GPT, open weights", sub: "function calling, streaming, structured output", tone: "good" }
      ] },

    { t: "p", text: "**Agent Engine is not a competitor to ADK.** It is a managed runtime on Vertex AI: you hand it an agent and it provides the server, scaling, session storage, a memory bank and tracing. It can host an ADK agent, and it can host a LangGraph or LangChain one. The pairing people mean when they say \"ADK vs Agent Engine\" is usually *ADK deployed to Cloud Run* against *ADK deployed to Agent Engine*, which is lesson 12.1's question, not a framework question at all." },

    { t: "h2", n: "02", text: "ADK and LangGraph", id: "langgraph" },

    { t: "p", text: "This is the comparison with real content, because both are runtimes for multi-step, stateful agent work. The difference is what the primitive is." },

    { t: "diagram", kind: "compare", title: "The primitive each one gives you",
      caption: "ADK's default composition is an agent tree with three workflow agents; LangGraph's is an explicit graph of nodes and edges. ADK 2.x also ships a graph API (Workflow, Node, Edge — lesson 2.4), which narrows this gap considerably.",
      columns: [
        { title: "ADK", tone: "accent", items: ["primitive: the agent", "compose with sub-agents + Sequential/Parallel/Loop", "control flow: LLM-driven transfer, or a workflow agent", "state: session state with app/user/temp scopes", "record: an event list, replayable", "services injected: session, memory, artifact, credential"] },
        { title: "LangGraph", tone: "good", items: ["primitive: the node in a graph", "compose by adding nodes and conditional edges", "control flow: explicit edges you draw", "state: a typed state object with reducers", "record: checkpoints per super-step", "persistence via a checkpointer you choose"] }
      ] },

    { t: "table", head: ["Concern", "ADK", "LangGraph"],
      rows: [
        ["Deterministic orchestration", "`SequentialAgent`, `ParallelAgent`, `LoopAgent`, or `Workflow` nodes and edges", "The graph itself — this is its centre of gravity"],
        ["Model-decided routing", "`sub_agents` plus the automatic `transfer_to_agent` tool", "A router node that returns the next edge"],
        ["Conversation memory", "Session service; events replayed into the prompt", "Checkpointer plus whatever you put in state"],
        ["Cross-session memory", "Memory service (`load_memory`, Vertex AI Memory Bank)", "Bring your own store"],
        ["Human in the loop", "`require_confirmation`, long-running tools, resumability", "Interrupt before/after a node, resume from a checkpoint"],
        ["Files the agent produces", "Artifact service with versioning, first class", "Bring your own"],
        ["Interception hooks", "Six callbacks per agent plus app-wide plugins", "Node wrappers and callbacks"],
        ["Evaluation", "`AgentEvaluator`, evalsets, `adk eval` in CI", "LangSmith (a hosted product)"],
        ["Dev surface", "`adk web` — a local UI with traces, sessions and eval", "LangGraph Studio (a hosted/desktop product)"],
        ["Ecosystem breadth", "Growing; wraps LangChain and CrewAI tools", "Larger integration library today"]
      ] },

    { t: "callout", kind: "tradeoff", title: "The honest summary",
      body: [{ t: "p", text: "If your agent is mostly *a conversation with tools and some delegation*, ADK's object model is less code and the services are already there. If your agent is mostly *a state machine with branches, retries and interrupts*, a graph framework expresses it more directly — and ADK's own graph API is newer and less battle-tested than LangGraph's. Both can do both; the question is which one you fight." }] },

    { t: "h2", n: "03", text: "ADK and LangChain", id: "langchain" },

    { t: "p", text: "LangChain is a much broader library: loaders, splitters, embeddings, vector-store adapters, retrievers, output parsers, prompt templates, a model abstraction across dozens of providers, and an agent layer. ADK deliberately does not ship most of that. It expects you to bring retrieval as a tool (lesson 7.1) and does not abstract document loading at all." },

    { t: "diagram", kind: "matrix", title: "What each one brings",
      caption: "The two are not symmetric: LangChain is wide at the data and integration layer, ADK is deep at the runtime layer. Wrapping LangChain tools inside an ADK agent is supported and common.",
      rows: ["Document loaders, splitters, retrievers", "Provider-agnostic model wrappers", "Prompt templates and output parsers", "Session, state and event runtime", "Artifacts and credential services", "Callbacks at every step", "Built-in evaluation and dev UI", "Agent-to-agent protocol"],
      cols: ["LangChain", "ADK"],
      cells: [
        [{ text: "extensive", tone: "good" }, { text: "none — bring your own", tone: "warn" }],
        [{ text: "extensive", tone: "good" }, { text: "via LiteLLM and adapters", tone: "accent" }],
        [{ text: "extensive", tone: "good" }, { text: "instruction strings only", tone: "warn" }],
        [{ text: "partial", tone: "warn" }, { text: "core", tone: "good" }],
        [{ text: "none", tone: "crit" }, { text: "core", tone: "good" }],
        [{ text: "callbacks exist", tone: "accent" }, { text: "six hooks + plugins", tone: "good" }],
        [{ text: "LangSmith, hosted", tone: "accent" }, { text: "in the package", tone: "good" }],
        [{ text: "no", tone: "crit" }, { text: "A2A built in", tone: "good" }]
      ] },

    { t: "code", lang: "python", title: "Using a LangChain tool from an ADK agent",
      code: `from google.adk.agents import LlmAgent
from google.adk.tools.langchain_tool import LangchainTool     # ships with ADK
from langchain_community.tools import WikipediaQueryRun       # any LangChain tool

agent = LlmAgent(
    name="researcher",
    model="gemini-2.5-flash",
    tools=[LangchainTool(tool=WikipediaQueryRun(...))],       # wrapped, not rewritten
)`,
      caption: "`google.adk.tools.langchain_tool` and `crewai_tool` exist precisely so that the integration breadth of other ecosystems is not a reason to avoid ADK's runtime. The wrapper adapts the other library's tool interface to `BaseTool` (lesson 4.6)." },

    { t: "h2", n: "04", text: "ADK and Agent Engine", id: "agentengine" },

    { t: "diagram", kind: "flow", title: "The same agent, four places to run it",
      caption: "The agent code does not change between these; what changes is which services back it and who operates the process. Lesson 12.1 compares them properly.",
      cols: 4,
      nodes: [
        { id: "a", label: "your ADK agent", sub: "agent.py", tone: "accent" },
        { id: "b", label: "local", sub: "adk web / adk run", tone: "good" },
        { id: "c", label: "Cloud Run / GKE", sub: "your container, your services", tone: "warn" },
        { id: "d", label: "Agent Engine", sub: "managed sessions, memory, tracing", tone: "violet" }
      ],
      edges: [["a", "b"], ["a", "c"], ["a", "d"]] },

    { t: "dl", items: [
      ["What Agent Engine adds", "A managed HTTP endpoint, autoscaling, `VertexAiSessionService` for persistence, the Memory Bank for cross-session recall, built-in tracing, and an identity to grant IAM roles to."],
      ["What it costs", "Vendor coupling, a Google Cloud project, and less control over the process than a container gives you."],
      ["When Cloud Run wins", "You already run containers, you want one deployment story for every service, or you need a runtime behaviour Agent Engine does not expose."],
      ["When Agent Engine wins", "You do not want to own session storage, memory and tracing, and the agent is the product rather than one endpoint inside a larger service."]
    ] },

    { t: "h2", n: "05", text: "Four questions that decide it", id: "choose" },

    { t: "diagram", kind: "steps", title: "The decision, in order",
      caption: "Answer these before comparing feature lists. In most projects the first two settle it.",
      items: [
        { label: "Is the agent a conversation, or a pipeline?", desc: "conversation with tools and delegation → ADK's agent tree; a branching state machine → a graph framework (or ADK's Workflow)", tone: "accent" },
        { label: "Who owns sessions, memory and files?", desc: "if you want them provided rather than designed, ADK ships all three as services", tone: "good" },
        { label: "Where will it run, and under whose identity?", desc: "Google Cloud with IAM and Vertex AI → ADK plus Agent Engine is the least glue; elsewhere → any framework in a container", tone: "warn" },
        { label: "What does the team already run?", desc: "an existing LangChain retrieval stack is a real cost to port — though its tools can be wrapped rather than rewritten", tone: "violet" }
      ] },

    { t: "callout", kind: "note", title: "A word on version drift",
      body: [{ t: "p", text: "This lesson describes google-adk **2.9.2**, the version the whole course was written against. All four projects move quickly, and comparisons age badly — the *layer* argument in section 01 is stable, but any specific feature gap should be re-checked against current releases before you quote it in a design document." }] },

    { t: "exercise", kind: "design", title: "Place four requirements", difficulty: "foundation", minutes: 12,
      body: [{ t: "p", text: "For each requirement, say whether it is a framework question or a runtime question, and which option you would reach for: (a) the agent must resume an approval that was requested yesterday; (b) it must autoscale to zero overnight; (c) it must remember a user's preferences across separate conversations; (d) it must ingest 40,000 PDFs into a vector store." }],
      requirements: ["Framework or runtime, for each", "The concrete option", "One sentence of justification each"],
      hint: "(d) is not really an agent requirement at all.",
      solution: { lang: "text", title: "Solution",
        code: `(a) framework — ADK resumability + a persistent session service (or LangGraph checkpoints)
(b) runtime   — Cloud Run scales to zero; Agent Engine's scaling model is managed for you
(c) framework + runtime — a memory service (ADK) backed by Vertex AI Memory Bank, or your own store
(d) neither   — that is an ingestion pipeline; it runs on a schedule and the agent only queries the result`,
        notes: [{ t: "p", text: "Sorting requirements this way before comparing frameworks prevents the common failure: choosing a framework for a property that belongs to the runtime, or building an ingestion pipeline inside an agent because the framework has a document loader." }] } }
  ],

  takeaways: [
    "Agent Engine is a managed runtime, not a framework: it hosts ADK, LangGraph or LangChain agents, so 'ADK or Agent Engine' is a category error.",
    "The genuine comparison is ADK against LangGraph: an agent tree with three workflow agents against an explicit graph of nodes and edges — and ADK 2.x now ships a graph API too.",
    "ADK brings the runtime — sessions, state scopes, events, artifacts, credentials, callbacks, evaluation, a dev UI and A2A; LangChain brings breadth at the data and integration layer.",
    "LangChain and CrewAI tools can be wrapped as ADK tools, so ecosystem breadth is not by itself a reason to choose a framework.",
    "The same ADK agent runs locally, in your container on Cloud Run or GKE, or on Agent Engine; only the services behind it change.",
    "Decide with four questions: conversation or pipeline, who owns the services, where it runs and under whose identity, and what the team already operates."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A colleague asks whether the team should use 'ADK or Agent Engine'. What is wrong with the question?",
      options: ["Nothing — they are direct competitors", "They sit at different layers: ADK is the framework you write the agent in, Agent Engine is a managed runtime that can host it", "Agent Engine only runs LangGraph", "ADK cannot be deployed to Agent Engine"],
      answer: 1,
      why: "The choice is not between them. You write the agent in a framework and then choose where to run it: locally, in a container on Cloud Run or GKE, or on Agent Engine, which additionally provides managed sessions, a memory bank and tracing. The real question is usually Cloud Run versus Agent Engine as the deployment target." },
    { stem: "Which is the most accurate statement of ADK's difference from LangGraph?",
      options: ["ADK is graph-based and LangGraph is not", "ADK's default primitive is the agent, composed with sub-agents and three workflow agents; LangGraph's is the node in an explicit graph", "LangGraph cannot do human-in-the-loop", "ADK has no persistence"],
      answer: 1,
      why: "Both handle stateful multi-step work. ADK composes agents — a tree plus SequentialAgent, ParallelAgent and LoopAgent — and adds LLM-driven transfer between them; LangGraph asks you to draw nodes and conditional edges explicitly. ADK 2.x also ships a Workflow/Node/Edge API, which narrows the difference." },
    { stem: "Your team has an extensive LangChain retrieval stack and wants ADK's runtime. What is the migration cost?",
      options: ["Total — LangChain and ADK cannot coexist", "Low for tools: LangChain tools can be wrapped with LangchainTool; the retrieval pipeline itself is unaffected because ADK treats retrieval as a tool", "You must rewrite the vector store", "You must deploy to Agent Engine"],
      answer: 1,
      why: "ADK does not abstract document loading or retrieval, so an existing pipeline keeps working and is exposed to the agent as a tool. google.adk.tools.langchain_tool wraps LangChain tools directly, and a crewai_tool wrapper exists too, so the integration work is adapting interfaces rather than rewriting the stack." },
    { stem: "Which requirement is a runtime question rather than a framework question?",
      options: ["The agent must pause for human approval and resume later", "The agent must scale to zero when nobody is using it", "The agent must delegate to a specialist agent", "Tools must be callable by the model"],
      answer: 1,
      why: "Scaling behaviour is a property of where the process runs — Cloud Run scales to zero, Agent Engine manages scaling for you, a VM does neither. Approval-and-resume, delegation and tool calling are all expressed in the framework, though they need a persistent session service to survive a restart." }
  ] },

  interview: { title: "Interview", sub: "The framework-choice conversation", questions: [
    { level: "Core", q: "How would you choose between ADK and LangGraph for a new project?",
      strong: "By whether the work is conversational with delegation or an explicit state machine, and by how much of the runtime you want provided rather than designed.",
      answer: [{ t: "p", text: "I would start with the shape of the work. If it is a conversation where a model picks tools and occasionally hands off to a specialist, ADK's agent tree plus its three workflow agents expresses that in less code, and I get sessions, state scopes, artifacts, callbacks and evaluation without designing them. If it is a branching process with retries, interrupts and a state object several steps mutate — a claims workflow, say — a graph is the honest representation, and LangGraph's is more mature than ADK's newer Workflow API. Then I would weigh the operational side: on Google Cloud with Vertex AI and IAM, ADK plus Agent Engine is the least glue; on another cloud, both are just Python in a container. Finally the team's existing code, remembering that LangChain tools can be wrapped rather than ported." }] },
    { level: "Core", q: "What does Agent Engine actually give you?",
      strong: "A managed runtime: endpoint, scaling, session persistence, memory bank, tracing and an identity — the operational half you would otherwise build.",
      answer: [{ t: "p", text: "It hosts the agent as a managed service on Vertex AI. You get an HTTP endpoint and autoscaling without writing a server, session persistence through VertexAiSessionService so conversations survive restarts and instances, the Memory Bank for cross-session recall, built-in tracing into Cloud Trace, and a service identity you can grant IAM roles to. What you give up is control of the process and portability: it is a Google Cloud product, and moving off it means reinstating those services yourself. The alternative is Cloud Run with your own container, where you choose the session backend and the tracing stack — more work, more control, and the same agent code either way." }] },
    { level: "Senior", q: "Your company already has agents in three frameworks. How do you keep that from becoming a mess?",
      strong: "Standardise the protocols between agents and tools — MCP and A2A — rather than the framework, and standardise observability and evaluation.",
      answer: [{ t: "p", text: "Forcing one framework across teams rarely survives contact with existing code, and the cost of porting is real. What does need to be uniform is the boundaries. Tools should be exposed over MCP so any framework can consume them, rather than reimplemented per stack. Agents that call each other should do it over A2A, which is the protocol ADK ships support for and which is deliberately framework-neutral, so a LangGraph agent can call an ADK one through a published agent card. Traces should go to one OpenTelemetry backend so an incident spans frameworks. Evaluation should use a shared dataset format even if the runners differ. Then the framework choice becomes a team-level decision with a bounded blast radius, which is the realistic goal." }] }
  ] }
});
