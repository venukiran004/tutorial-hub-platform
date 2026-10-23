/* ============================================================================
   LESSON 1.1 — What MCP Is, and the Three Roles
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "**MCP exists to turn a multiplication into an addition.** Before it, wiring M tools into N agent frameworks meant M times N integrations — each one somebody's afternoon, each one maintained by nobody. A protocol makes it M plus N: a tool server is written once and every host can consume it. Everything else in this course follows from that one arithmetic change, including the parts that go wrong.",

  objectives: [
    "State the integration problem MCP solves, and the one it does not",
    "Distinguish host, client and server precisely, with processes to point at",
    "Explain the one-client-per-connection rule and what it implies for state",
    "Say what a server is trusted with the moment you connect to one",
    "Decide whether MCP is the right answer for a given integration"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "The arithmetic", id: "arithmetic" },

    {"kind": "compare", "title": "Eight capabilities, three stacks: twenty-four against eleven", "caption": "**The count is the easy argument and the ownership is the real one.** In the left column the agent team writes a binding to a system it does not understand, and the binding rots when that system changes without telling anyone. In the right column the team that owns pricing publishes pricing — which they were going to document anyway — and the agent team consumes an interface instead of reverse-engineering an API.", "columns": [{"title": "Without a protocol: M x N", "tone": "crit", "items": ["8 capabilities x 3 stacks = 24 integrations", "Each in its own framework's tool format", "Each with its own retry and error shape", "Owned by the agent teams", "A pricing change breaks three bindings", "Nobody holds the list of callers"]}, {"title": "With a protocol: M + N", "tone": "good", "items": ["8 servers + 3 clients = 11", "One interface, three primitives", "One error shape, defined", "Owned by the capability teams", "A pricing change ships once", "Consumers are discoverable"]}], "t": "diagram", "id": "dg-1_1-01-0"},

    { t: "p", text: "Suppose your organisation has eight internal capabilities worth exposing to a language model — a customer lookup, a pricing calculation, a fraud check, a deployment trigger. And suppose three teams are building agents, on three different stacks." },

    { t: "p", text: "**Without a protocol that is twenty-four integrations.** Each team writes its own binding to each capability, in its own framework's tool format, with its own retry behaviour and its own idea of what an error looks like. When the pricing API changes, three bindings need updating and nobody owns the list of who is calling." },

    { t: "p", text: "**With a protocol it is eleven.** Eight servers, written once by the teams that own the capabilities, and three clients — one per framework, and in practice one you did not write. The pricing team changes its server; every consumer sees the change through one interface." },

    { t: "callout", kind: "insight", title: "The real win is ownership, not line count",
      body: [
        { t: "p", text: "Twenty-four against eleven is a nice number and it is not the important one. **The important change is that the integration moves to the team that owns the capability.** In the M times N world, the agent team writes a binding to a system they do not understand, and it rots when that system changes without telling them. In the M plus N world, the pricing team publishes pricing, which they were going to document anyway, and the agent team consumes an interface instead of reverse-engineering an API." }
      ] },

    { t: "h2", n: "02", text: "Three roles, and three processes", id: "roles" },

    {"kind": "trace", "title": "Three roles, three process ids, and two independent servers", "caption": "**The pids settle two things people assume otherwise.** Host and server are different processes — over stdio the server is a subprocess the host launched, which makes connecting the same trust decision as installing a dependency. And the second session's call counter starts at 1 again, so each connection is its own server instance: **anything a server holds in memory is per-connection**, including a cache, a counter or an open database handle.", "left": "role", "codeW": 160, "vars": ["what it is", "measured"], "steps": [{"code": "host", "state": ["has the user and the model", "pid 24108"], "tone": "good"}, {"code": "client", "state": ["one connection to one server", "a session object, not a process"], "changed": [0, 1], "tone": "accent"}, {"code": "server", "state": ["answers; knows nothing of the chat", "pid 10152, call 1"], "changed": [0, 1], "tone": "violet"}, {"code": "a second connection", "state": ["its own subprocess", "pid 22540, call 1 AGAIN"], "changed": [0, 1], "tone": "crit"}, {"code": "so server memory is", "state": ["per connection, not per server", "-"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-1_1-02-1"},

    { t: "p", text: "The three words are used loosely everywhere, including in documentation, and the looseness causes real confusion later — particularly about where credentials live and who is responsible for a bad tool description. They are three distinct things." },

    { t: "dl", items: [
      ["Host", "The application the user is actually using: a desktop assistant, your agent service, an IDE. It owns the conversation, decides which servers to connect to, and is where the model lives. **The host is the only one of the three with a user.**"],
      ["Client", "The protocol connection. It speaks MCP to exactly one server, and the host creates one per server it wants to use. A client is not a process or a product — it is a session object inside the host, and you will mostly not write one by hand."],
      ["Server", "The thing offering capabilities: tools, resources and prompts. It knows nothing about the conversation, the user, or the model. It receives a request and answers it. **A server is not an agent** — it does not reason and it never initiates anything."]
    ] },

    { t: "code", lang: "python", title: "the three roles, as process ids",
      code: `import asyncio, os, sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    print("host process (this script) pid:", os.getpid())

    params = StdioServerParameters(command=sys.executable, args=["pid_server.py"])

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            init = await session.initialize()
            print("one ClientSession   ->", init.serverInfo.name)
            r = await session.call_tool("whoami", {})
            print("server reports      :", r.content[0].text)

            # A second connection to the same server definition.
            async with stdio_client(params) as (r2, w2):
                async with ClientSession(r2, w2) as s2:
                    await s2.initialize()
                    r2b = await s2.call_tool("whoami", {})
                    print("a second session    :", r2b.content[0].text)

asyncio.run(main())`,
      out: `host process (this script) pid: 24108
one ClientSession   -> pidserver
server reports      : pid 10152, call 1
a second session    : pid 22540, call 1`,
      caption: "The server's `whoami` returns its own pid and a counter that increments per call. **Three different pids, and the second session's counter starts at 1 again** — so these are two independent processes with independent state, not two views of one server." },

    { t: "p", text: "That output is worth reading twice, because it settles two things people assume otherwise. **The host and the server are different processes** — over stdio the server is a subprocess the host launched, which is why connecting to a stdio server is the same trust decision as installing a dependency. And **each connection is its own server instance**, so anything a server keeps in memory is per-connection: a cache, a counter, an open database handle." },

    { t: "callout", kind: "trap", title: "One client per server, and the host does the fan-out",
      body: [
        { t: "p", text: "There is no multiplexing in the protocol: a client talks to one server. A host using six servers holds six clients, and **it is the host's job to merge their tool lists into something the model sees as one set** — including resolving the case where two servers both offer a tool called `search`." },
        { t: "p", text: "That is why name collisions are a host-side problem with host-side solutions (prefixes, filters) rather than something the protocol prevents. Lesson 5.2 does this properly; the thing to carry now is that a server has no idea what other servers the host is talking to, and cannot be designed around them." }
      ] },

    { t: "h2", n: "03", text: "What is actually standardised", id: "standardised" },

    {"kind": "trace", "title": "What the specification defines, and what it hands you", "caption": "**The right-hand column is longer than people expect on first contact**, and two of its rows cause most production trouble. Nothing in the protocol authorises anything, so a server offering `delete_customer` will run it for any client that connects. And nothing in the protocol makes your descriptions good — a model choosing between eleven tools is reading prose you wrote, and that prose is the whole of its routing information.", "left": "MCP defines", "codeW": 190, "vars": ["MCP leaves to you"], "steps": [{"code": "the message format and method names", "state": ["what your tools actually do"], "tone": "good"}, {"code": "the handshake and capability flags", "state": ["whether a caller is ALLOWED to"], "changed": [0], "tone": "crit"}, {"code": "tools, resources and prompts as shapes", "state": ["which one a capability should be"], "changed": [0], "tone": "accent"}, {"code": "how errors are reported", "state": ["what counts as an error"], "changed": [0], "tone": "accent"}, {"code": "three transports", "state": ["deployment, scaling, uptime"], "changed": [0], "tone": "accent"}, {"code": "that descriptions exist", "state": ["whether yours are good enough to route on"], "changed": [0], "tone": "crit"}], "t": "diagram", "id": "dg-1_1-03-2"},

    { t: "p", text: "MCP is a **JSON-RPC 2.0** protocol with a defined set of methods, a capability negotiation at the start, and three kinds of thing a server can offer. That is close to the whole specification, and its modesty is deliberate." },

    { t: "table",
      head: ["MCP defines", "MCP leaves to you"],
      rows: [
        ["The message format and method names", "What your tools actually do"],
        ["The handshake and capability flags", "Whether a caller is allowed to do it"],
        ["Tools, resources and prompts as shapes", "Which of them a given capability should be"],
        ["How errors are reported", "What counts as an error"],
        ["Three transports", "Deployment, scaling and uptime"],
        ["That descriptions exist", "Whether yours are good enough for a model to route on"]
      ] },

    { t: "p", text: "The right-hand column is longer than people expect on first contact, and the two rows that cause the most trouble in production are the second and the last. **Nothing in the protocol authorises anything** — a server that offers a `delete_customer` tool will run it for any client that connects. And **nothing in the protocol makes your descriptions good** — a model choosing between eleven tools is reading prose you wrote, and that is the whole of its routing information." },

    { t: "h2", n: "04", text: "What MCP does not solve", id: "limits" },

    {"kind": "trace", "title": "Five things MCP does not do for you", "caption": "**Each of these is routinely assumed and none of it is true.** The first is the most common surprise: a server acts with its own credentials, so two different people asking your agent a question arrive at the server as the same caller — per-user answers need identity passed deliberately on top of the protocol. **And the third is the one that makes agents worse rather than merely unsafe:** connecting servers because they are available adds declarations, and tool-choice accuracy falls as the list grows.", "left": "assumption", "codeW": 190, "vars": ["the reality"], "steps": [{"code": "it carries the user", "state": ["no - one credential serves every caller"], "tone": "crit"}, {"code": "it makes tools safe", "state": ["no permission model at all"], "changed": [0], "tone": "crit"}, {"code": "more servers is better", "state": ["accuracy falls as declarations grow"], "changed": [0], "tone": "crit"}, {"code": "a server is trustworthy", "state": ["its descriptions enter YOUR prompt"], "changed": [0], "tone": "crit"}, {"code": "it is an agent protocol", "state": ["a server never reasons or initiates"], "changed": [0], "tone": "warn"}], "t": "diagram", "id": "dg-1_1-04-3"},

    { t: "p", text: "Worth being blunt about, because each of these is routinely assumed and none of it is true." },

    { t: "dl", items: [
      ["It does not carry a user", "A server acts with its own credentials. Two different people asking your agent a question reach the server as the same caller, so a server cannot return different answers per user unless identity is passed deliberately on top of the protocol (lesson 4.2). This is the single most common surprise."],
      ["It does not make tools safe", "The protocol has no permission model. Access control is yours to build, on the host side as a filter and on the server side as an actual check."],
      ["It does not fix tool-choice accuracy", "Adding a server adds declarations, and model accuracy degrades as the declaration list grows. Connecting six servers because they are available is how an agent gets worse."],
      ["It does not make a server trustworthy", "Tool names and descriptions arrive from someone else's process and go into your model's context. That is an injection surface, and it has named attacks (lesson 4.1)."],
      ["It is not an agent protocol", "A server answers; it does not reason, refuse or come back with a question. Agent-to-agent communication is a different problem with a different protocol."]
    ] },

    { t: "callout", kind: "tradeoff", title: "When MCP is the wrong answer",
      body: [
        { t: "p", text: "**If the capability has one consumer and you own both ends, a shared library is less machinery.** No process boundary, no serialisation, no protocol version to track, and you can change both sides in one commit. MCP earns its place when the consumers are on different stacks, in different teams, or are hosts you do not control — which is exactly when a Python package would not have worked." },
        { t: "p", text: "And if the consumer is not a language model at all, you want an API rather than an MCP server. The protocol's whole shape — natural-language descriptions, a model choosing between tools — is overhead for a caller that knows what it wants." }
      ] },

    { t: "h2", n: "05", text: "The shape of the rest", id: "shape" },

    {"kind": "steps", "title": "The five questions, and the module that answers each", "caption": "**Each module is one concrete question rather than a topic.** The order is the order the questions arrive in practice: you connect before you build, you build before you deploy, and you deploy before anyone else's security becomes your problem. Everything was executed against **mcp 1.28.1**, protocol revision **2025-11-25**.", "items": [{"label": "The protocol", "code": "module 1", "desc": "What gets negotiated when a client connects, and which of the three primitives a capability should be.", "tone": "good"}, {"label": "Building a server", "code": "module 2", "desc": "How much of a tool's contract reaches the schema, and the five ways a call can fail.", "tone": "accent"}, {"label": "Transports", "code": "module 3", "desc": "How the bytes travel, and what changes when the server stops being a subprocess.", "tone": "accent"}, {"label": "Security and operation", "code": "module 4", "desc": "What you are trusted with when you publish, and what you are trusting when you consume.", "tone": "violet"}, {"label": "Consuming", "code": "module 5", "desc": "A client of your own, several servers at once, and servers written by other people.", "tone": "violet"}], "t": "diagram", "id": "dg-1_1-05-4"},

    { t: "p", text: "Having the arithmetic and the roles, the remaining questions are concrete, and each is a module: **what exactly gets negotiated when a client connects** (module 1), **how to write a server whose tools a model can actually use** (module 2), **how the bytes travel and what changes when the server stops being a subprocess** (module 3), **what you are trusted with when you publish and what you are trusting when you consume** (module 4), and **how to consume servers you did not write** (module 5)." },

    { t: "callout", kind: "good", title: "Everything here was executed",
      body: [
        { t: "p", text: "Every trace in this course came from running a real client against a real server over stdio against **mcp 1.28.1**, protocol revision **2025-11-25**. No transcription from documentation, and where something could not be run — a hosted OAuth flow, a desktop host's configuration file — the lesson says so rather than presenting it as output. The pids above are from one such run, and yours will differ." }
      ] },

    { t: "exercise", kind: "practice", title: "Count your own integrations", difficulty: "intro", minutes: 18,
      prompt: "For a system you actually work on, list the capabilities a language model would need to reach and the frameworks or hosts that would need to reach them. Compute M times N and M plus N. Then, for each capability, answer three questions: who owns it today, would they be willing to publish it, and what does it act as when it runs — a service account, a shared key, or something per user? Finally, pick the one capability where MCP would be the wrong answer and say why.",
      hints: [
        "Count hosts honestly: a desktop assistant somebody already uses is an N you do not control.",
        "The ownership question matters more than the arithmetic.",
        "The wrong-answer case is usually a single-consumer capability you own both ends of."
      ],
      solution: {
        notes: [
          { t: "p", text: "The third question is the one that changes plans. A capability that runs as a shared service account can be published as a server today; one that must behave differently per user needs the identity work in lesson 4.2 first, and discovering that at the design stage is much cheaper than discovering it after a pilot." },
          { t: "p", text: "The ownership answer is usually where the real obstacle is, and it is organisational rather than technical. A server is a published interface with a support burden, so the team that owns the capability has to agree to own that too — which is why the arithmetic argument alone has never been enough to get one built." }
        ]
      } }

  ],

  takeaways: [
    "**MCP turns M tools times N frameworks into M plus N**: eight capabilities and three stacks go from twenty-four integrations to eleven.",
    "**The bigger change is ownership** — the integration moves to the team that owns the capability, instead of the agent team reverse-engineering someone else's API.",
    "**Host, client and server are three distinct things.** The host has the user and the model; the client is one connection; the server answers and knows nothing about the conversation.",
    "**They are separate processes:** host pid 24108, server pid 10152, and a second connection pid 22540 — measured, not assumed.",
    "**Each connection is its own server instance**, so the second session's call counter started at 1. Anything a server holds in memory is per-connection.",
    "**One client per server, and the host does the fan-out** — merging tool lists and resolving name collisions is host-side work the protocol does not do.",
    "**MCP is JSON-RPC 2.0 plus a handshake plus three primitives**, and the list of what it leaves to you is longer than the list of what it defines.",
    "**Nothing in the protocol authorises anything.** A server offering a destructive tool will run it for any client that connects.",
    "**MCP does not carry a user.** A server acts with its own credentials, so per-user answers need identity passed on top of the protocol.",
    "**A server is not an agent** — it does not reason, refuse or initiate, which is what distinguishes this from agent-to-agent communication.",
    "**A shared library beats a server when there is one consumer and you own both ends.** MCP earns its place across stacks, teams and hosts you do not control."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A host connects to six MCP servers, two of which offer a tool named `search`. What resolves the collision?",
        options: [
          "The protocol assigns unique ids, so there is no collision",
          "The host — it merges the tool lists and must prefix or filter, because a server cannot know what other servers are connected",
          "The servers negotiate between themselves during initialize",
          "The model picks whichever appeared first"
        ],
        answer: 1,
        why: "There is no multiplexing in MCP: each client talks to one server, and the host holds one client per server. That makes namespacing a host-side concern with host-side tools, and it is also why a server cannot be designed around its neighbours."
      },
      {
        stem: "Two sessions are opened to the same stdio server definition. The server's call counter reads 1 in both. Why?",
        options: [
          "The counter resets on every call",
          "Each stdio connection spawns its own subprocess, so the two sessions are independent processes with independent memory",
          "The client caches the first response",
          "Counters are not supported over stdio"
        ],
        answer: 1,
        why: "The measured pids were different — 10152 and 22540 — which is the proof. Anything a server keeps in memory is therefore per-connection: a cache, a counter, an open handle. It is also why a stdio server cannot share state between two hosts without an external store."
      },
      {
        stem: "A team wants to expose one internal function to one agent service they also own. Is MCP the right tool?",
        options: [
          "Yes — MCP is the standard way to expose any capability",
          "Probably not: with one consumer and both ends under your control, a shared library has no process boundary, no serialisation and no protocol version, and both sides change in one commit",
          "Yes, because it future-proofs the integration",
          "Only if the function is read-only"
        ],
        answer: 1,
        why: "The protocol's value is proportional to the number of consumers you do not control. The honest version of the future-proofing argument is that converting a library into a server later is a small job, and doing it before there is a second consumer is machinery with no payer."
      },
      {
        stem: "Which of these does the MCP specification provide?",
        options: [
          "A permission model for who may call which tool",
          "The message format, the handshake and capability flags, three primitives, an error shape and three transports — and no authorisation at all",
          "Per-user identity propagation",
          "A guarantee that tool descriptions are unambiguous"
        ],
        answer: 1,
        why: "The protocol is deliberately modest. Authorisation, identity and description quality are all left to the implementer, and all three are where production problems concentrate — which is why module 4 exists."
      },
      {
        stem: "Why is connecting to a stdio server a comparable trust decision to adding a dependency?",
        options: [
          "Because stdio is an unencrypted transport",
          "Because the host launches the server as a subprocess, so it is code executing on your machine with your file access",
          "Because stdio servers cannot be authenticated",
          "Because JSON-RPC has no integrity checking"
        ],
        answer: 1,
        why: "The measured pids make it concrete: the server process is a child of the host. Pin it, read it, and never let user input influence the command — which is the same discipline you apply to any package you install."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What problem does MCP solve?",
        strong: "The M times N integration problem. Without it, every agent framework needs its own binding to every tool, so eight capabilities across three stacks is twenty-four integrations maintained by the agent teams. With it, each capability is published once as a server and each framework has one client, so it is eleven — and the integration is owned by the team that owns the capability.",
        answer: [
          { t: "p", text: "Having the arithmetic ready is good; the ownership point is what makes the answer sound like experience rather than a summary of a launch post." },
          { t: "p", text: "A strong answer names what it does not solve in the same breath, because that is the part that bites: no authorisation, no per-user identity, and no help with tool-choice accuracy when the declaration list grows." }
        ]
      },
      {
        level: "mid",
        q: "Walk me through host, client and server.",
        strong: "The host is the application with the user and the model — a desktop assistant or your agent service. A client is one protocol connection to one server, created by the host; a host using six servers holds six clients. The server offers tools, resources and prompts and knows nothing about the conversation or the user. Over stdio the server is a subprocess the host launched.",
        answer: [
          { t: "p", text: "The one-client-per-server rule is the detail that shows the model is understood, because it is what makes namespacing and filtering host-side concerns." },
          { t: "p", text: "Adding that each stdio connection is its own process, with its own memory, answers the follow-up about caching and shared state before it is asked." },
          { t: "p", text: "The strongest version notes what the roles imply for credentials: the server holds its own, which is why identity does not reach it for free and why a shared service account is the default situation rather than an oversight." }
        ]
      },
      {
        level: "advanced",
        q: "When would you not use MCP?",
        strong: "When there is one consumer and I own both ends — a shared library avoids a process boundary, serialisation and a protocol version, and both sides change in one commit. Also when the consumer is not a language model, since the natural-language descriptions and model-driven tool choice are overhead for a caller that already knows what it wants.",
        answer: [
          { t: "p", text: "Being willing to say no to the protocol is the point of the question, and the single-consumer case is the common one in practice." },
          { t: "p", text: "The non-model consumer case is the sharper answer and fewer people reach it: MCP's shape is designed around a model choosing, so for a deterministic caller an ordinary API is both simpler and better specified." },
          { t: "p", text: "A good finish is the cost of connecting servers you do not need — every one adds declarations, accuracy falls as the list grows, and each is an injection surface. 'It is available' is not a reason." }
        ]
      }
    ]
  }
});
