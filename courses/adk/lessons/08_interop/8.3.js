/* ============================================================================
   LESSON 8.3 — A2A: The Agent-to-Agent Protocol
   The agent card is the real one served by scratchpad/adk/a2a_server.py, and
   the origin error is the actual message RemoteA2aAgent raised when the card's
   RPC origin did not match where it was fetched from (google-adk 2.9.2,
   a2a-sdk 1.1.5).
   ========================================================================= */
EC.receiveLesson({
  id: "8.3",

  lede: "**MCP gives an agent tools. A2A gives an agent colleagues.** The distinction is not marketing: a tool is a function you call and get a value back from, while an agent is something you give a task to, that may ask you a question, work for four minutes, stream partial results and return an artifact. Those need different protocols, and A2A is the one built for the second. This lesson is the protocol itself — the agent card that advertises what an agent can do, the task lifecycle that models work taking time, and the boundary questions you have to answer before you let another team's agent into your system.",

  objectives: [
    "Say what A2A is for and how it differs from MCP",
    "Read an agent card and explain each part",
    "Describe the task lifecycle and why a task is not a function call",
    "Identify the trust and identity questions an agent boundary raises",
    "Decide whether an integration should be a tool or an agent"
  ],

  prerequisites: ["8.1", "2.6"],

  blocks: [

    { t: "h2", n: "01", text: "Two protocols, two shapes of work", id: "two" },

    { t: "diagram", kind: "compare", title: "A tool call and a task are not the same thing",
      caption: "You will use both, often in the same system. The question is what shape the work has, not which protocol is newer.",
      columns: [
        { title: "MCP — a tool", tone: "accent", items: ["Call a function, get a value", "Arguments you specify exactly", "Fast, deterministic, stateless", "You own the reasoning", "\"convert 100 GBP to USD\""] },
        { title: "A2A — an agent", tone: "violet", items: ["Give a task, get a result", "A message in natural language", "May take minutes; may ask a question", "They own the reasoning", "\"find out why this order is late\""] }
      ] },

    { t: "callout", kind: "mental", title: "The test: who does the thinking?",
      body: [{ t: "p", text: "If you know exactly what you want done and just need it executed, that is a tool — you have already done the reasoning and you are calling a function. If you want to hand over a goal and let someone else work out the steps, that is an agent. A currency conversion is a tool forever. \"Work out whether this customer is entitled to a refund under our policy\" is a task, and wrapping it as a tool means pretending a judgement is a lookup." }] },

    { t: "h2", n: "02", text: "The agent card", id: "card" },

    {"kind": "tree", "title": "The agent card, as served", "caption": "Fetched from a running ADK agent. Note that ADK generated a skill per tool from its docstring — including the argument documentation — and serves all of it at a well-known path with no authentication.", "root": {"label": "agent-card.json", "sub": "/.well-known/", "tone": "violet", "children": [{"label": "identity", "sub": "name, description, version", "tone": "accent"}, {"label": "transport", "sub": "interfaces, capabilities, modes", "tone": "good"}, {"label": "skills", "sub": "what it can be asked for", "tone": "warn", "children": [{"label": "inventory", "sub": "the agent itself"}, {"label": "check_stock", "sub": "from the docstring", "tone": "crit"}]}]}, "t": "diagram", "id": "dg-8_3-02-0"},



    { t: "p", text: "An A2A agent publishes a card at a well-known URL describing what it is and how to talk to it. This one is served by a real ADK agent — the `to_a2a` call in the next lesson generated it from the agent object." },

    { t: "code", lang: "bash", title: "Fetching it",
      code: `curl -s http://localhost:8801/.well-known/agent-card.json | python -m json.tool` },

    { t: "out", text: `{
    "name": "inventory",
    "description": "Answers questions about warehouse stock levels for a SKU.",
    "supportedInterfaces": [
        { "url": "http://localhost:8801", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }
    ],
    "version": "0.0.1",
    "capabilities": { "streaming": true },
    "defaultInputModes": ["text/plain"],
    "defaultOutputModes": ["text/plain"],
    "skills": [
        {
            "id": "inventory",
            "name": "model",
            "description": "Answers questions about warehouse stock levels for a SKU.",
            "tags": ["llm"]
        },
        {
            "id": "inventory-check_stock",
            "name": "check_stock",
            "description": "Checks warehouse stock for a SKU.\\n\\nArgs:\\n    sku: the product code.",
            "tags": ["llm", "tools"]
        }
    ]
}` },

    { t: "dl", items: [
      ["name / description", "What the agent is. The description is what a calling agent's model reads when deciding whether to delegate here, so it is routing information exactly as a tool description is."],
      ["supportedInterfaces", "Where and how to talk to it — the URL, the binding (JSON-RPC here) and the protocol version. More than one entry means more than one way in."],
      ["capabilities", "What the transport supports. `streaming: true` means partial results arrive as they are produced rather than in one lump at the end."],
      ["defaultInputModes / defaultOutputModes", "The media types it accepts and returns. Text here; an agent that takes images or returns PDFs says so, which is how a caller knows before trying."],
      ["skills", "The advertised capabilities. ADK generated one for the agent itself and one per tool — note `check_stock` appearing with its full docstring, including the argument documentation."]
    ] },

    { t: "callout", kind: "trap", title: "The card tells the world what your agent can do",
      body: [{ t: "p", text: "That skills list was generated from tool docstrings, and it is served publicly at a well-known path. Everything in it — internal tool names, parameter documentation, the shape of your system — is now readable by anyone who can reach the endpoint. That is fine for an agent inside a private network and a disclosure decision for one on the internet. Build the card deliberately with `AgentCardBuilder` when the default one says more than you meant it to." }] },

    { t: "h2", n: "03", text: "Tasks, not calls", id: "tasks" },

    {"kind": "flow", "title": "The task state machine", "caption": "A function call has two states: pending and returned. The branch that makes A2A different is 'input required' — a remote agent can stop and ask you a question, then carry on.", "cols": 3, "nodes": [{"id": "s", "label": "Submitted", "sub": "the caller holds a task id", "tone": "accent"}, {"id": "w", "label": "Working", "sub": "progress, streamed if supported", "tone": "good"}, {"id": "i", "label": "Input required", "sub": "it asks; you answer", "tone": "warn"}, {"id": "c", "label": "Completed", "sub": "result + artifacts", "tone": "violet"}, {"id": "f", "label": "Failed / cancelled", "sub": "an outcome you must handle", "tone": "crit"}], "edges": [["s", "w"], ["w", "i", "needs more"], ["i", "w", "answered"], ["w", "c"], ["w", "f"]], "t": "diagram", "id": "dg-8_3-03-1"},



    { t: "p", text: "A2A models work as a **task** with a lifecycle rather than a request with a response. That is what makes it suitable for work that takes real time: the task is created, it progresses, it may need input, and eventually it completes or fails. A caller can subscribe to updates rather than blocking." },

    { t: "diagram", kind: "steps", title: "The states a task moves through",
      caption: "Compare with a function call, which has exactly two states: pending and returned. The interesting one is 'input required' — a tool cannot ask you a question, and an agent can.",
      items: [
        { label: "Submitted", sub: "the task exists; the caller has an id" },
        { label: "Working", sub: "progress updates, streamed if the card says streaming" },
        { label: "Input required", sub: "the remote agent needs something before it can continue" },
        { label: "Completed", sub: "with a result, and possibly artifacts" },
        { label: "Failed / cancelled", sub: "an outcome the caller has to handle" }
      ] },

    { t: "callout", kind: "insight", title: "The artifact is why this is not just HTTP",
      body: [{ t: "p", text: "A task can return files as well as text — a rendered report, a chart, a spreadsheet — the same idea as artifacts in lesson 6.3, crossing an organisational boundary. That is what makes \"have the analytics team's agent produce the quarterly breakdown\" a sensible thing to say to a protocol, rather than something you would build as a REST endpoint returning a signed URL." }] },

    { t: "h2", n: "04", text: "The origin check, and why it exists", id: "origin" },

    { t: "p", text: "The first time I pointed a client at that card I got this, and it is worth reading rather than working around." },

    { t: "out", text: `Failed to resolve remote A2A agent inventory: Agent card RPC URL must have the
same origin as the location the card was fetched from
(http://127.0.0.1:8801/.well-known/agent-card.json): http://localhost:8801` },

    { t: "p", text: "The card had been fetched from `127.0.0.1` and advertised its RPC endpoint as `localhost` — different origins by the rule, even though they are the same machine. The client refused. That is not fussiness: **a card is a document telling you where to send your requests**, so without an origin check, anyone who can serve you a card can redirect your agent's traffic — and its credentials — somewhere else entirely. The fix is to make the card's advertised URL match where it is actually served, which is a deployment concern worth getting right before it bites you behind a load balancer." },

    { t: "h2", n: "05", text: "The questions a boundary raises", id: "boundary" },

    { t: "dl", items: [
      ["Who is the caller?", "The remote agent sees a request from your service, not from your user. If its answers should differ per person — and for anything touching customer data they must — the identity has to be carried deliberately and the remote side has to enforce it."],
      ["What is it allowed to do?", "You are delegating a goal, not a function call, so the remote agent decides what steps to take. \"Find out why this order is late\" may mean it reads records you did not intend to expose. The boundary is theirs to enforce and yours to verify."],
      ["What comes back?", "Text produced by someone else's model, entering your agent's context. Treat it as untrusted input — it can contain instructions, and your model will read them (lesson 9.2)."],
      ["What if it is slow or down?", "A remote agent is a dependency with a latency distribution and an uptime, both outside your control. Timeouts and a defined fallback are not optional; `RemoteA2aAgent` defaults to a 600-second timeout, which is ten minutes of a user waiting unless you change it."]
    ] },

    { t: "callout", kind: "warn", title: "Delegation is a trust relationship, not an integration",
      body: [{ t: "p", text: "Adding an MCP server means running someone's code with your permissions. Adding an A2A agent means letting someone else's judgement into your workflow, and letting their model's words into your model's context. Neither is a configuration change. The question to answer in review is not \"does it work\" but \"what is the worst thing that happens if this agent is wrong, or compromised, or simply changes next month\"." }] },

    { t: "h2", n: "06", text: "Tool, sub-agent, or remote agent?", id: "choosing" },

    { t: "table", head: ["Situation", "Use", "Why"],
      rows: [
        ["You know exactly what to execute", "A function tool", "No reasoning needed; a call is the honest shape"],
        ["Someone else's integration, same process", "An MCP toolset", "Their code, your process, tool-shaped work"],
        ["A specialist you own, same deployment", "A sub-agent", "Transfer is cheaper than a network hop, and you control both sides"],
        ["A specialist another team owns and deploys", "A remote A2A agent", "Separate release cadence, separate credentials, a real boundary"],
        ["A capability you want others to use", "Serve A2A, or publish an MCP server", "Agent-shaped work is A2A; function-shaped work is MCP"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Do not reach for A2A inside one codebase",
      body: [{ t: "p", text: "If both agents are yours and deploy together, a sub-agent is simpler, faster and easier to debug — one process, one trace, no card, no origin rules, no serialisation. A2A earns its complexity at an organisational boundary: different teams, different release schedules, different clouds, or an agent you did not write. Using it between two agents in the same repository buys you a network hop and a whole class of new failure modes for nothing." }] },

    { t: "exercise", kind: "practice", title: "Read a card as a reviewer", difficulty: "core", minutes: 20,
      prompt: "Take the agent card above and write the review you would give if a team proposed exposing it on the public internet. Cover: what it discloses, what an anonymous caller could do with it, what you would change in the card itself, and what you would require before approving. Then write the three questions you would ask the team whose agent you were about to call.",
      hints: [
        "The skills list was generated from docstrings — read it as an attacker would.",
        "There is no authentication anywhere in that card.",
        "Ask what identity reaches the remote agent, and what it can do with it."
      ],
      solution: {
        notes: [
          { t: "p", text: "The disclosure is the first finding: internal tool names and their parameter documentation, served at a well-known path with no authentication. For an internal agent that is unremarkable; on the internet it is a map of your system. The card should be built deliberately rather than generated, with skills described in terms of what a caller can ask for rather than what the implementation has." },
          { t: "p", text: "The three questions to ask the other team are the ones that decide whether this is safe: what identity do you expect from us and what do you do with it; what does your agent have access to when it acts on our behalf; and what is your latency and availability, because a ten-minute default timeout means our user waits ten minutes when you are down. None of those are answered by the protocol, and all of them are answered by a conversation people skip because the integration was easy." }
        ]
      } }

  ],

  takeaways: [
    "A2A is for delegating tasks to agents; MCP is for calling tools. The test is who does the reasoning.",
    "An agent card at a well-known URL advertises name, description, interfaces, capabilities, modes and skills.",
    "ADK generates a skill per tool from its docstring — the card discloses more than people expect.",
    "A task has a lifecycle including 'input required', so a remote agent can ask a question; a function cannot.",
    "The card's RPC origin must match where the card was fetched from, or the client refuses — it is a redirection defence.",
    "Between agents you own and deploy together, use a sub-agent; A2A is for organisational boundaries."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What best distinguishes A2A from MCP?",
      options: ["A2A is newer", "A2A delegates tasks to agents that do their own reasoning; MCP calls tools", "A2A uses HTTP and MCP does not", "A2A supports streaming"],
      answer: 1,
      why: "The shape of the work differs. A tool call is something you have already reasoned about and now want executed. A task is a goal handed to someone whose job is to work out the steps — which is why the lifecycle includes an 'input required' state that a function call has no way to express." },
    { stem: "A client refuses a card whose RPC URL is at a different origin from where the card was served. Why?",
      options: ["A bug in the a2a SDK", "Because a card is a document telling you where to send requests, so a mismatched origin could redirect your traffic", "To enforce TLS", "Because localhost is never allowed"],
      answer: 1,
      why: "Without the check, anyone who can serve you a card can point your agent's requests — and whatever credentials they carry — somewhere else. The executed error message states the rule directly, and the fix is to make the advertised URL match where the card is actually served." },
    { stem: "Two agents in the same repository, deployed together. Should they talk over A2A?",
      options: ["Yes, for consistency", "No — a sub-agent is simpler, faster and easier to trace", "Yes, if either uses tools", "Only if they use different models"],
      answer: 1,
      why: "A2A buys you a network hop, serialisation, a card, origin rules and a new set of failure modes. Those are worth paying for across an organisational boundary — separate teams, separate releases, an agent you did not write — and are pure cost between two agents you control in one process." },
    { stem: "Text returned by a remote A2A agent enters your agent's context. How should you treat it?",
      options: ["As trusted, since the team is internal", "As untrusted input that may contain instructions", "As a tool result, which models ignore", "As system instruction"],
      answer: 1,
      why: "It is text produced by a model you do not control, arriving in a prompt your model reads. Whether the other team is friendly is beside the point — their agent could be relaying content from its own users. Any text crossing a boundary is data, never instructions." }
  ] },

  interview: { title: "Interview", sub: "A2A protocol questions", questions: [
    { level: "Core", q: "What is A2A and when would you use it instead of MCP?",
      strong: "A protocol for delegating tasks to other agents — use it when the other side does the reasoning and the work may take time.",
      answer: [{ t: "p", text: "MCP is for tools: you call a function with exact arguments and get a value. A2A is for agents: you hand over a goal in natural language and the other side decides how to accomplish it. The protocol reflects that — work is a task with a lifecycle rather than a request with a response, so it can report progress, return artifacts, and move into an 'input required' state where it asks you a question. A function call has no way to express any of that. The test I use is who has already done the thinking: if I know the steps, it is a tool; if I am delegating the steps, it is an agent." }] },
    { level: "Core", q: "What is in an agent card?",
      strong: "Name, description, where and how to reach it, capabilities, input and output media types, and a list of skills.",
      answer: [{ t: "p", text: "It is a JSON document at a well-known URL that tells a caller what the agent is and how to talk to it: the supported interfaces with their URL and binding, whether streaming is available, which media types it accepts and returns, and a skills list describing what it can do. The description and skills are routing information — they are what a calling agent's model reads when deciding whether to delegate. One thing worth flagging in review is how much the generated card discloses: ADK builds a skill per tool from the docstring, so internal tool names and their parameter documentation end up served publicly unless you build the card deliberately." }] },
    { level: "Senior", q: "Another team offers you their agent over A2A. What do you need to agree before wiring it up?",
      strong: "Identity, authority, latency and availability, what comes back, and what happens when it changes.",
      answer: [{ t: "p", text: "Identity first: their agent sees a call from my service, not from my user, so we have to agree how the end user's identity travels and what they do with it — because for anything touching customer data, their answers must differ per person and the protocol will not arrange that for me. Then authority: I am delegating a goal, not a call, so their agent decides what steps to take, and I need to know what it can reach when acting on my behalf. Then the operational contract — latency distribution, availability, and a timeout I set deliberately, because the default is ten minutes and that is ten minutes of a user watching a spinner. Then what comes back: their model's text lands in my model's context, so it is untrusted input regardless of how friendly the team is, and it never goes anywhere it could be read as instructions. And finally change: their agent is a model behind a prompt they can edit on a Tuesday, which is a looser contract than an API, so I want to know how I will find out and I want evaluations of my own that would catch it." }] }
  ] }
});
