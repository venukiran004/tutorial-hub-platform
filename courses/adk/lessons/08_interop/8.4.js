/* ============================================================================
   LESSON 8.4 — A2A in ADK: Serving and Consuming Remote Agents
   Everything below was executed across two processes: a2a_server.py serving an
   agent with to_a2a under uvicorn, and a2a_client.py driving a RemoteA2aAgent
   against it (google-adk 2.9.2, a2a-sdk 1.1.5).
   ========================================================================= */
EC.receiveLesson({
  id: "8.4",

  lede: "**Serving an ADK agent over A2A is one function call, and consuming one is one constructor.** `to_a2a(agent)` returns an ASGI application that speaks the protocol and publishes a card built from the agent itself; `RemoteA2aAgent(name, agent_card=url)` gives you a `BaseAgent` that happens to run in someone else's process. That second fact is the one that matters architecturally: a remote agent composes exactly like a local one, so it can be a sub-agent, a member of a pipeline, or the root of your system — and everything you know about events, sessions and transfer still applies.",

  objectives: [
    "Serve any ADK agent over A2A with `to_a2a` and run it",
    "Consume a remote agent with `RemoteA2aAgent` and compose it like any other",
    "Read what arrives locally when a remote agent does work",
    "Configure the card, the timeout and the origin correctly",
    "Recognise what crosses the boundary and what does not"
  ],

  prerequisites: ["8.3", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "Serving", id: "serving" },

    {"kind": "layers", "title": "What to_a2a wraps around your agent", "caption": "The agent is unchanged. Everything above it is generated — which is why serving an agent over A2A is one function call and why the settings that matter are the ones describing where it is reachable.", "items": [{"label": "Starlette ASGI app", "sub": "what you hand to uvicorn", "tone": "violet"}, {"label": "Agent card at /.well-known/", "sub": "generated from the agent — name, skills, interfaces", "tone": "warn"}, {"label": "A2A executor + task store", "sub": "the task lifecycle; in-process by default", "tone": "crit"}, {"label": "Runner", "sub": "your session, artifact and memory services", "tone": "accent"}, {"label": "Your LlmAgent", "sub": "unchanged", "tone": "good"}], "t": "diagram", "id": "dg-8_4-01-0"},



    { t: "code", lang: "python", title: "a2a_server.py — an ordinary agent, exposed",
      code: `from google.adk.agents import LlmAgent
from google.adk.a2a.utils.agent_to_a2a import to_a2a

def check_stock(sku: str) -> dict:
    """Checks warehouse stock for a SKU.

    Args:
        sku: the product code.
    """
    return {"sku": sku, "in_stock": 42, "warehouse": "Leeds"}

inventory = LlmAgent(
    name="inventory",
    model=MODEL,
    description="Answers questions about warehouse stock levels for a SKU.",
    instruction="Use check_stock to answer stock questions.",
    tools=[check_stock],
)

# One call turns the agent into a Starlette ASGI app speaking A2A.
app = to_a2a(inventory, port=8801)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8801)`,
      caption: "Nothing about the agent changed. `to_a2a` wraps it in an executor, a task store and the HTTP routes, and serves the card at `/.well-known/agent-card.json`." },

    { t: "callout", kind: "insight", title: "description is no longer documentation",
      body: [{ t: "p", text: "For a local agent, `description` is what a parent's model reads when deciding whether to transfer (lesson 2.5). For a served agent it becomes the card's description — what *other organisations'* models read when deciding whether to delegate to you. Same field, much wider audience. Write it as a capability statement: what it can answer, for what, and what it cannot." }] },

    { t: "table", head: ["`to_a2a` parameter", "Why you would set it"],
      rows: [
        ["`host`, `port`, `protocol`", "What goes into the card's advertised URL — these must match where it is actually reachable"],
        ["`rpc_path`", "Mount the RPC endpoint under a path, for deployments behind a shared router"],
        ["`agent_card`", "Supply your own card instead of the generated one — the lever for controlling disclosure"],
        ["`task_store`", "Where tasks live. The default is in-process, so a restart loses in-flight work and two replicas do not share"],
        ["`runner`", "Bring your own runner, with your session, artifact and memory services wired in"],
        ["`push_config_store`", "Push notifications, for long tasks where the caller should not hold a connection"]
      ] },

    { t: "callout", kind: "trap", title: "The default task store is in-process",
      body: [{ t: "p", text: "The same lesson as `InMemorySessionService` in 5.3, one layer up: two replicas behind a load balancer do not share tasks, so a caller polling for a task that was created on the other pod finds nothing. For an agent serving real traffic, supply a `task_store` backed by something shared before you scale past one instance — not after." }] },

    { t: "h2", n: "02", text: "The card it generates", id: "card" },

    { t: "out", text: `{
  "name": "inventory",
  "description": "Answers questions about warehouse stock levels for a SKU.",
  "supportedInterfaces": [{ "url": "http://localhost:8801", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }],
  "capabilities": { "streaming": true },
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain"],
  "skills": [
    { "id": "inventory", "name": "model", "description": "Answers questions about warehouse stock levels for a SKU.", "tags": ["llm"] },
    { "id": "inventory-check_stock", "name": "check_stock",
      "description": "Checks warehouse stock for a SKU.\\n\\nArgs:\\n    sku: the product code.", "tags": ["llm", "tools"] }
  ]
}` },

    { t: "p", text: "One skill for the agent, one per tool, with the tool's full docstring including its argument documentation. That is useful to a caller and more than you may want published — use `AgentCardBuilder` to build the card deliberately when the agent is reachable by anyone you have not met." },

    { t: "h2", n: "03", text: "Consuming", id: "consuming" },

    {"kind": "flow", "title": "One question, across two processes", "caption": "Executed. The remote agent's own tool call and its result arrive as events in YOUR session — which is what makes a delegation debuggable. What does not cross is its state, your state, or your user's identity.", "cols": 3, "nodes": [{"id": "u", "label": "Your runner", "sub": "RemoteA2aAgent as root", "tone": "accent"}, {"id": "c", "label": "Card fetch", "sub": "origin must match", "tone": "crit"}, {"id": "r", "label": "Remote agent", "sub": "another process entirely", "tone": "violet"}, {"id": "t", "label": "Its tool runs", "sub": "check_stock(sku='X1')", "tone": "good"}, {"id": "e", "label": "Events, locally", "sub": "call + result + answer, in your session", "tone": "warn"}], "edges": [["u", "c"], ["c", "r", "JSON-RPC"], ["r", "t"], ["t", "e"]], "t": "diagram", "id": "dg-8_4-03-1"},



    { t: "code", lang: "python", title: "a2a_client.py — a remote agent is a BaseAgent",
      code: `from google.adk.agents.remote_a2a_agent import RemoteA2aAgent

remote = RemoteA2aAgent(
    name="inventory",
    agent_card="http://localhost:8801/.well-known/agent-card.json",
    description="The warehouse team's agent. Knows stock levels.",
)

runner = Runner(app_name="ops", agent=remote, session_service=svc)`,
      caption: "`agent_card` takes a URL or an `AgentCard` object. The `description` here is local: it is what *your* parent agent's model reads when deciding to transfer." },

    { t: "out", text: `RemoteA2aAgent is a BaseAgent: True

asking the remote agent over A2A:
  inventory: call check_stock({'sku': 'X1'})
  inventory: result {'sku': 'X1', 'warehouse': 'Leeds', 'in_stock': 42.0}
  inventory: 'There are 42 units of X1 in the Leeds warehouse.'
  inventory: 'There are 42 units of X1 in the Leeds warehouse.'

events recorded locally: 6
  author: user
  author: inventory  (×5)` },

    { t: "p", text: "Four things in that output are worth stopping on." },

    { t: "dl", items: [
      ["The remote agent's tool call is a local event", "`check_stock` ran in another process, and the call and its result are in *your* session. The boundary is visible in the trace, which is exactly what you want when debugging a delegation."],
      ["`in_stock` came back as 42.0", "The server returned the integer 42. It crossed JSON and arrived as a float, the same coercion as the MCP result in lesson 8.1. Anything crossing a protocol boundary is JSON-shaped."],
      ["The answer appears twice", "A streaming interim result and the final one. A client rendering every text part shows the answer twice — filter on finality (lesson 1.5) rather than printing everything."],
      ["Six events for one question", "The remote work is fully represented locally, so your session grows with the remote agent's activity, and your context window pays for it."]
    ] },

    { t: "callout", kind: "good", title: "Compose it like anything else",
      body: [{ t: "p", text: "Because `RemoteA2aAgent` is a `BaseAgent`, it can be a sub-agent of a coordinator, a step in a sequential pipeline, or wrapped in an `AgentTool` so a parent calls it without transferring control. The architecture patterns from lesson 2.6 apply unchanged — a coordinator with three local specialists and one remote one is an ordinary design, and only the failure modes differ." }] },

    { t: "h2", n: "04", text: "Getting the origin right", id: "origin" },

    { t: "out", text: `Failed to resolve remote A2A agent inventory: Agent card RPC URL must have the
same origin as the location the card was fetched from
(http://127.0.0.1:8801/.well-known/agent-card.json): http://localhost:8801` },

    { t: "p", text: "This is what happens when the card is fetched from one origin and advertises another — here, `127.0.0.1` versus `localhost`, which are the same machine and different origins. The check is a redirection defence (lesson 8.3), and the fix is always on the serving side: make `to_a2a`'s `host`, `port` and `protocol` describe where the agent is genuinely reachable." },

    { t: "callout", kind: "warn", title: "This will bite you behind a proxy",
      body: [{ t: "p", text: "In production the agent listens on `0.0.0.0:8080` in a container and is reached at `https://agents.example.com/inventory`. If the card is generated from the listening address it advertises something no caller can use, or something at the wrong origin, and every client refuses. Set the public host, port and protocol explicitly — and include the `rpc_path` if the agent is mounted under one — rather than letting the runtime guess." }] },

    { t: "h2", n: "05", text: "What crosses and what does not", id: "crossing" },

    { t: "diagram", kind: "compare", title: "Two systems, one conversation",
      caption: "The remote agent keeps its own session. Your state is not its state, and it will not remember your conversation unless the message carries what it needs.",
      columns: [
        { title: "Crosses the boundary", tone: "good", items: ["The message you send", "Its reply and any artifacts", "Task status updates", "Whatever you put in request metadata"] },
        { title: "Does not cross", tone: "crit", items: ["Your session state", "Your event history", "Your user's identity, unless you send it", "Your tools and callbacks"] }
      ] },

    { t: "callout", kind: "trap", title: "The remote agent does not know who is asking",
      body: [{ t: "p", text: "It receives a message from your service. Not your `user_id`, not your session, not your authenticated principal — nothing but what you put in the message or in request metadata. For an inventory lookup that is fine. For anything where the answer depends on who is asking, you have to carry identity deliberately and the remote side has to verify it, which means an agreement between two teams rather than a constructor argument. `RemoteA2aAgent` accepts `auth_scheme` and `auth_credential` for the service-to-service half of that." }] },

    { t: "h2", n: "06", text: "Operational settings", id: "operational" },

    {"kind": "matrix", "title": "The settings whose defaults will hurt you", "caption": "Two of these are the same lesson as InMemorySessionService one layer up: a default that works perfectly on one machine and fails quietly the moment there are two.", "cols": ["Default", "What it costs", "Set it to"], "rows": ["timeout", "task_store", "auth_credential", "card host/port"], "cells": [[{"text": "600s", "tone": "crit"}, "10 min of a spinner", {"text": "what the UI tolerates", "tone": "good"}], [{"text": "in-process", "tone": "crit"}, "replicas do not share", {"text": "a shared store", "tone": "good"}], [{"text": "none", "tone": "crit"}, "unauthenticated calls", {"text": "service credentials", "tone": "good"}], [{"text": "localhost", "tone": "warn"}, "clients refuse the card", {"text": "the public origin", "tone": "good"}]], "t": "diagram", "id": "dg-8_4-06-2"},



    { t: "table", head: ["Setting", "Default", "What to do"],
      rows: [
        ["`timeout`", "600 seconds", "Ten minutes of a user waiting. Set it to what your interface can actually tolerate"],
        ["`httpx_client`", "One is created for you", "Pass your own to control pooling, retries and TLS"],
        ["`auth_scheme` / `auth_credential`", "None", "How your service authenticates to theirs — required for anything that is not a public demo"],
        ["`retry_config`", "None", "Remember the remote side may be non-idempotent; retrying a task that books something is not free"],
        ["`before_agent_callback`", "None", "It is still a `BaseAgent` — log the delegation, and treat what returns as untrusted"]
      ] },

    { t: "exercise", kind: "practice", title: "Two processes, one conversation", difficulty: "advanced", minutes: 34,
      prompt: "Serve an agent with a tool using to_a2a on one port and run it. Fetch its card and read the skills. Write a client with a coordinator agent that has one local specialist and the remote agent as a second sub-agent, and ask it a question only the remote one can answer. Confirm the remote tool call appears in your local session. Then kill the server mid-conversation and observe what the caller experiences; finally, set a five-second timeout and compare.",
      hints: [
        "Use localhost consistently on both sides or the origin check will stop you.",
        "The coordinator routes on the remote agent's local `description`, so write it as a capability.",
        "The default 600-second timeout is what makes the kill test feel so bad."
      ],
      solution: {
        notes: [
          { t: "p", text: "The delegation appearing in your own event log is the thing to take away: the remote agent's tool call and result are local events, so a trace of the whole turn crosses the boundary and you can debug a delegation the way you debug a transfer. What is not local is the other agent's state — it kept its own session, and nothing you stored is visible to it." },
          { t: "p", text: "The kill test is the reason this exercise exists. With the default timeout the caller hangs for ten minutes, which no interface should ever do; with five seconds it fails quickly and you can decide what the coordinator says next. A remote agent is an availability dependency, and the right time to choose a timeout and a fallback is while writing it, not during the first outage." }
        ]
      } }

  ],

  takeaways: [
    "`to_a2a(agent, host=…, port=…)` turns any ADK agent into an ASGI app serving A2A and a generated card.",
    "The card includes a skill per tool built from its docstring — build it deliberately when disclosure matters.",
    "`RemoteA2aAgent` is a `BaseAgent`, so it composes as a sub-agent, a pipeline step or an `AgentTool`.",
    "A remote agent's tool calls and results arrive as events in your own session — the delegation is traceable.",
    "The card's advertised origin must match where it is served, which needs explicit host and protocol behind a proxy.",
    "Nothing crosses but the message: not your state, not your history, not your user's identity unless you send it."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does to_a2a return?",
      options: ["A RemoteA2aAgent", "A Starlette ASGI application", "An agent card", "A Runner"],
      answer: 1,
      why: "It wraps the agent in an executor, a task store and HTTP routes and hands back an ASGI app you serve with uvicorn or any ASGI server. The card is generated and served by that app at the well-known path rather than being the return value." },
    { stem: "A remote agent calls its own tool. What do you see locally?",
      options: ["Only the final text answer", "The tool call and its result as events in your session", "Nothing until the task completes", "A single opaque event"],
      answer: 1,
      why: "The executed run shows `check_stock` and its result as local events authored by the remote agent, even though the function ran in another process. That is what makes a delegation debuggable — and it also means your session grows with the remote agent's activity." },
    { stem: "Your served agent listens on 0.0.0.0:8080 and is reached at https://agents.example.com. What must you set?",
      options: ["Nothing — the card adapts", "host, port and protocol on to_a2a, to the public values", "The task store", "defaultInputModes"],
      answer: 1,
      why: "The card advertises where to send RPC requests, and clients enforce that this origin matches where the card was fetched from. A card generated from the listening address advertises an unreachable or mismatched origin, and every client refuses — which is the error you would otherwise spend an afternoon on." },
    { stem: "Which of these does NOT cross to the remote agent?",
      options: ["The message text", "Request metadata you set", "Your session state", "Artifacts it returns"],
      answer: 2,
      why: "The remote agent has its own session and sees only what you send. Your state, your history and your user's identity stay on your side, so anything the remote agent needs — including who is asking, where that matters — has to be carried deliberately in the message or the metadata and verified on their side." }
  ] },

  interview: { title: "Interview", sub: "A2A in ADK questions", questions: [
    { level: "Core", q: "How do you expose an ADK agent over A2A?",
      strong: "`to_a2a(agent, host=…, port=…)` returns an ASGI app; serve it and the card is published automatically.",
      answer: [{ t: "p", text: "One call. `to_a2a` wraps the agent in an A2A executor with a task store and HTTP routes and returns a Starlette app, which you run under uvicorn like any other service. It also generates the agent card from the agent — name, description, capabilities and a skill per tool built from the docstrings — and serves it at the well-known path. The two things I would not leave at their defaults are the advertised host and protocol, because the card has to describe where the agent is genuinely reachable rather than what it binds to, and the task store, which is in-process by default and therefore not shared between replicas." }] },
    { level: "Core", q: "What is RemoteA2aAgent?",
      strong: "A BaseAgent that runs somewhere else — so it composes like any local agent.",
      answer: [{ t: "p", text: "You construct it with a name and the URL of an agent card, and you get an object that is a `BaseAgent` as far as the rest of ADK is concerned. That means it can be a sub-agent of a coordinator, a step in a pipeline, wrapped in an `AgentTool`, or the root agent of a runner — all the patterns from the multi-agent module apply unchanged. What differs is the failure surface: it has a timeout, defaulting to ten minutes, an availability you do not control, and everything it returns is text from someone else's model entering your context. I have run it across two processes and the remote agent's own tool calls arrive as events in my local session, which makes the delegation traceable." }] },
    { level: "Senior", q: "You are putting a remote A2A agent into a production coordinator. What do you set up around it?",
      strong: "A real timeout, service auth, a fallback path, identity carried deliberately, and the response treated as untrusted.",
      answer: [{ t: "p", text: "The timeout first, because the default is 600 seconds and no interface should hang for ten minutes — I set it to what the product can tolerate and decide what the coordinator says when it expires. Then authentication between the services, with `auth_scheme` and `auth_credential`, and a clear agreement about end-user identity, because the remote agent sees a call from my service and nothing else; if its answers should differ per user, that identity has to travel in the message or metadata and be verified on their side. Then a fallback: a coordinator whose specialist is unavailable should degrade to something honest rather than failing the turn, and I would test that by killing the server mid-conversation rather than assuming. On the way back, whatever the remote agent returns is untrusted text entering my model's context, so it is delimited as data and never placed where it could be read as instructions. And I would keep my own evaluations, because their agent is a prompt somebody can change on a Tuesday — a looser contract than an API, and the only thing that will tell me it moved is a test of my own." }] }
  ] }
});
