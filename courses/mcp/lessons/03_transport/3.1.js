/* ============================================================================
   LESSON 3.1 — Three Transports, and What Each Assumes
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**The transport decision is not about speed — it is about who can reach your server and what state it may keep.** Over stdio each connection was its own process; over HTTP two clients shared one process with pid 7116 between them and were separated only by a session id. That single measured difference reaches back into the server's design, forward into its security, and sideways into whether it can run on more than one replica.",

  objectives: [
    "Choose a transport from the deployment you actually have",
    "Explain what stdio gives you for free and what it cannot do",
    "Say what a streamable-HTTP session id is and when there is none",
    "Decide between stateful and stateless HTTP, and what each costs",
    "Recognise SSE as the older two-endpoint transport and when you will meet it"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "Three transports, one protocol", id: "three" },

    {"kind": "trace", "title": "The same protocol, three pipes - and the defaults that matter", "caption": "**The messages are identical in all three cases** — same JSON-RPC, same methods, same handshake — so the transport is one argument to `mcp.run` and nothing about a tool changes. **Note `host` defaulting to `127.0.0.1`:** a server started with no arguments is reachable only from the same machine, which is the right default and the first thing people change without weighing it. Two paths for SSE against one for streamable HTTP is the architectural difference, visible in the defaults.", "left": "transport", "codeW": 170, "vars": ["endpoints", "default path", "choose it for"], "steps": [{"code": "stdio", "state": ["none - a subprocess", "-", "local tools, desktop hosts"], "tone": "good"}, {"code": "streamable HTTP", "state": ["one", "/mcp", "anything new or shared"], "changed": [0, 1, 2], "tone": "violet"}, {"code": "SSE (older)", "state": ["TWO: GET and POST", "/sse and /messages/", "existing deployments"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "and the host default", "state": ["127.0.0.1, not 0.0.0.0", "-", "same machine only"], "changed": [0, 1, 2], "tone": "accent"}], "t": "diagram", "id": "dg-3_1-01-0"},


    { t: "p", text: "The messages are identical in every case — the same JSON-RPC, the same methods, the same handshake. **Only the pipe changes.**" },

    { t: "dl", items: [
      ["stdio", "The server is a subprocess. It reads JSON-RPC frames from standard input and writes them to standard output, and the host launches it. No network, no port, no authentication."],
      ["Streamable HTTP", "One endpoint, `/mcp` by default. The client POSTs requests and the server may answer with JSON or with an SSE stream on the same connection. **This is the one to choose for anything new.**"],
      ["SSE", "The older HTTP transport, with two endpoints: a long-lived `GET /sse` the client holds open to receive, and `POST /messages/` to send. Superseded by streamable HTTP, and you will still meet it in existing servers."]
    ] },

    { t: "code", lang: "python", title: "the defaults, from the constructor",
      code: `import inspect
from mcp.server.fastmcp import FastMCP

sig = inspect.signature(FastMCP.__init__)
for k in ("host", "port", "streamable_http_path", "sse_path", "message_path",
          "stateless_http", "json_response"):
    print("  %-22s %r" % (k, sig.parameters[k].default))`,
      out: `  host                   '127.0.0.1'
  port                   8000
  streamable_http_path   '/mcp'
  sse_path               '/sse'
  message_path           '/messages/'
  stateless_http         False
  json_response          False`,
      caption: "**`host` defaults to `127.0.0.1`, not `0.0.0.0`** — a server started with no arguments is reachable only from the same machine, which is the right default and the first thing people change without thinking about it. The two paths for SSE against one for streamable HTTP is the architectural difference between them, visible in the defaults." },

    { t: "h2", n: "02", text: "What stdio gives you for free", id: "stdio" },

    {"kind": "trace", "title": "Four things stdio gives you, and the one it cannot", "caption": "**The strongest access control in the course, and it costs nothing:** the server is a child process, nothing else on the machine is talking to it, and there is no port to find. The flip side is the trust it demands — configuring a stdio server means telling your host to run a command, which is the same decision as installing a dependency, so pin it and never build the command from user input. **And the last row is the hard limit:** it cannot cross a machine.", "left": "property", "codeW": 190, "vars": ["why", "measured in 1.1"], "steps": [{"code": "access control, by construction", "state": ["a child process, no port", "-"], "tone": "good"}, {"code": "isolation between callers", "state": ["separate processes, separate memory", "pids 10152 and 22540"], "changed": [0, 1], "tone": "good"}, {"code": "a lifespan that means one thing", "state": ["one caller, so one connection is right", "counters independent"], "changed": [0, 1], "tone": "good"}, {"code": "no identity problem", "state": ["there is one caller - the launcher", "-"], "changed": [0, 1], "tone": "accent"}, {"code": "but it cannot cross a machine", "state": ["no shared service, no load balancer", "-"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-3_1-02-1"},


    { t: "p", text: "Lesson 1.1 measured the shape of a stdio connection, and it is worth restating as a property rather than an observation: **host pid 24108, server pid 10152, and a second connection to the same server definition pid 22540 with its call counter back at 1.**" },

    { t: "dl", items: [
      ["Access control, by construction", "The server is a child process. Nothing else on the machine is talking to it, and there is no port to find. This is the strongest access control in the whole course and it costs nothing."],
      ["Isolation between callers", "Each connection is a separate process with separate memory, so one caller cannot see another's state even by accident."],
      ["A lifespan that means one thing", "Setup runs once for one caller, which is why a single database connection in a stdio lifespan is correct rather than a bug."],
      ["No identity problem — because there is one caller", "The server runs as whoever launched it, with that person's file access and credentials. That is not identity propagation; it is the absence of a need for it."]
    ] },

    { t: "p", text: "And the cost of all that: **it cannot cross a machine.** A stdio server is unavailable to anyone who cannot spawn a process on your host, which rules out a shared service, a team server, or anything behind a load balancer." },

    { t: "callout", kind: "trap", title: "Spawning a subprocess is executing code",
      body: [
        { t: "p", text: "The flip side of stdio's access control is the trust it demands. **Configuring a stdio server means telling your host to run a command**, which is the same decision as installing a dependency — pin the version, read what it does, and never build the command from anything a user supplied." },
        { t: "p", text: "The failure to picture is a server command assembled from a configuration field someone else can edit. At that point the MCP server is an arbitrary-command-execution feature with a protocol attached, and nothing in the protocol will warn you." }
      ] },

    { t: "h2", n: "03", text: "What changes over HTTP", id: "http" },

    {"kind": "trace", "title": "Different session ids, the same pid", "caption": "**Compare with stdio's 10152 and 22540: the isolation has moved from the operating system to a string in a header.** Everything that was free is now your responsibility — and the lifespan row is the one that breaks previously-correct code. A single database connection or a mutable cache that was per-caller under stdio now serves everyone, producing concurrency bugs that are load-dependent and absent from every test that connects one client.", "left": "concern", "codeW": 170, "vars": ["stdio", "streamable HTTP"], "steps": [{"code": "who can reach it", "state": ["only the spawner", "anyone who reaches the port"], "tone": "crit"}, {"code": "isolation", "state": ["separate processes", "a session id, in ONE process"], "changed": [0, 1], "tone": "crit"}, {"code": "measured", "state": ["pid 10152 and 22540", "pid 7116 for BOTH clients"], "changed": [0, 1], "tone": "crit"}, {"code": "authentication", "state": ["not applicable", "yours to add"], "changed": [0, 1], "tone": "warn"}, {"code": "a lifespan's scope", "state": ["one caller", "ALL callers - a pool, not a connection"], "changed": [0, 1], "tone": "crit"}, {"code": "shared in-memory state", "state": ["per caller, safely", "shared by everyone - usually a bug"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-3_1-03-2"},


    { t: "p", text: "The same server, the same tools, `transport=\"streamable-http\"` instead. Two clients connecting concurrently:" },

    { t: "code", lang: "python", title: "two clients, one server",
      code: `async def one(label):
    async with streamablehttp_client("http://127.0.0.1:8947/mcp") as (r, w, get_session_id):
        async with ClientSession(r, w) as s:
            await s.initialize()
            res = await s.call_tool("convert", {"amount": 1, "frm": "GBP", "to": "EUR"})
            print("  %s: session=%s pid=%s" % (label, get_session_id()[:8], pid_from(res)))

await asyncio.gather(one("client A"), one("client B"))`,
      out: `  client A: session=5cf67729 pid in result=7116
  client B: session=82678e38 pid in result=7116`,
      caption: "**Different session ids, the same pid.** Compare that with stdio's 10152 and 22540: the isolation has moved from the operating system to a string in a header. Everything that was free under stdio is now your responsibility." },

    { t: "table",
      head: ["", "stdio", "Streamable HTTP"],
      rows: [
        ["Who can reach it", "Only the process that spawned it", "Anyone who can reach the port"],
        ["Isolation between callers", "Separate processes", "A session id, in one process"],
        ["Authentication", "Not applicable", "**Yours to add** — see lesson 3.2"],
        ["Identity of the caller", "Whoever launched it", "Unknown unless you carry it"],
        ["A lifespan's scope", "One caller", "**All callers** — so a pool, not a connection"],
        ["Horizontal scaling", "Not applicable", "Needs stateless mode or sticky routing"],
        ["Shared in-memory state", "Per caller, safely", "Shared by everyone — usually a bug"]
      ] },

    { t: "callout", kind: "warn", title: "The lifespan row is the one that breaks working code",
      body: [
        { t: "p", text: "A server written and tested over stdio can hold a single database connection, a mutable cache or a per-user context in its lifespan and be entirely correct. **Switch the transport and that same code is serving every caller from one object**, and the bugs it produces are concurrency bugs: intermittent, load-dependent, and absent from every test that connects one client." },
        { t: "p", text: "The fix is mechanical once you are looking for it — a connection pool instead of a connection, nothing mutable keyed by anything but the session, and per-request state taken from the request rather than from `self`. The hard part is remembering that changing one argument changed the concurrency model." }
      ] },

    { t: "h2", n: "04", text: "Stateful or stateless", id: "stateless" },

    {"kind": "compare", "title": "A session id, or none at all", "caption": "**Most MCP servers are request-response and need no session**: a tool takes arguments and returns a result, with nothing to remember. For those, stateless plus `json_response` makes the server behave like every other service you run — any replica, any load balancer, no affinity to get wrong. **Keep the session only when you need server-initiated messages**, and then accept the usual consequences: sticky routing or shared session storage, and a decision about a replica restarting mid-conversation.", "columns": [{"title": "Stateful (the default)", "tone": "accent", "items": ["session id: af00fa6666654d14...", "The server remembers the connection", "Progress notifications work", "tools_changed works", "Resource subscriptions work", "State lives in ONE process"]}, {"title": "stateless_http=True", "tone": "violet", "items": ["session id: None", "Each request is self-contained", "No server-initiated messages", "No tools_changed", "No subscriptions", "ANY replica serves ANY request"]}], "t": "diagram", "id": "dg-3_1-04-3"},


    { t: "p", text: "Streamable HTTP has two modes, and the difference is visible in one field." },

    { t: "code", lang: "python", title: "the same client against both",
      code: `# Default: stateless_http=False
#   session id : af00fa6666654d14...

# With stateless_http=True
mcp = FastMCP("http-finance", stateless_http=True)
#   session id : None
#   server log : Terminating session: None`,
      out: `stateful  -> session id : af00fa6666654d14...
stateless -> session id : None`,
      caption: "In stateful mode the server issues a session id and keeps state associated with it between requests. In stateless mode there is no session: **each request is self-contained, and the server keeps nothing.**" },

    { t: "dl", items: [
      ["Stateful (the default)", "The server remembers the connection, which is what makes server-to-client notifications and long-lived SSE streams work. The cost is that a given session's state lives in one process, so a second replica knows nothing about it."],
      ["Stateless", "No session id, no per-connection memory, so any replica can serve any request. **This is what makes horizontal scaling straightforward** — and it rules out anything that depends on remembering the caller, including the `tools_changed` notification from lesson 2.4."],
      ["`json_response=True`", "A separate switch: answer with a plain JSON body instead of an SSE stream. Combined with stateless mode it makes the server an ordinary HTTP API, which is the easiest thing to put behind a standard load balancer and the least capable."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Choose stateless unless you need the session",
      body: [
        { t: "p", text: "**Most MCP servers are request-response and do not need a session at all** — a tool takes arguments and returns a result, with nothing to remember. For those, stateless plus `json_response` is the deployment that behaves like every other service you run: any replica, any load balancer, no sticky routing, no session affinity to get wrong." },
        { t: "p", text: "Keep the session when you genuinely need server-initiated messages: progress notifications on a long call, a changing tool list, or resource subscriptions. Then you have a stateful service and the usual consequences follow — sticky routing, or shared session storage, and a decision about what happens when a replica restarts mid-conversation." }
      ] },

    { t: "h2", n: "05", text: "Choosing", id: "choosing" },

    {"kind": "tree", "title": "Choosing, and why starting with stdio costs you nothing", "caption": "**Nothing about a tool's implementation changes between transports** — the decorators, the schemas and the error handling are identical, and the transport is one argument. So writing a server over stdio and moving it later is a small change, **provided you revisit the lifespan**: that is the one place where the transport reaches back into the server's design.", "root": {"label": "Where does this server run?", "sub": "the transport follows from the deployment", "tone": "accent", "children": [{"label": "On the machine that uses it", "sub": "a desktop host, a local tool", "tone": "good", "children": [{"label": "stdio", "sub": "free access control and isolation", "tone": "good"}]}, {"label": "As a service for several agents", "sub": "request-response tools", "tone": "violet", "children": [{"label": "Streamable HTTP, stateless", "sub": "plus json_response", "tone": "violet"}]}, {"label": "As a service with long jobs", "sub": "progress, a changing tool list", "tone": "teal", "children": [{"label": "Streamable HTTP, stateful", "sub": "sticky routing comes with it", "tone": "teal"}]}, {"label": "Unsure", "sub": "-", "tone": "accent", "children": [{"label": "stdio first", "sub": "cheapest to write, easiest to move", "tone": "accent"}]}]}, "t": "diagram", "id": "dg-3_1-05-4"},


    { t: "table",
      head: ["Your situation", "Transport", "Why"],
      rows: [
        ["A desktop host, a local tool, your own laptop", "**stdio**", "Free access control, free isolation, no deployment"],
        ["A server your team runs for several agents", "**Streamable HTTP**, stateless", "Reachable, scalable, behaves like any service"],
        ["A server that reports progress on long jobs", "**Streamable HTTP**, stateful", "Server-initiated messages need a session"],
        ["Maintaining an existing deployment", "**SSE**, probably", "It predates streamable HTTP; migrate when convenient"],
        ["A server published to the internet", "**Streamable HTTP** plus everything in 3.2", "The transport is the easy part"],
        ["Unsure", "**stdio first**", "It is the cheapest thing to write and the easiest to move later"]
      ] },

    { t: "p", text: "The last row is worth taking literally. **Nothing about a tool's implementation changes between transports** — the decorators, the schemas, the error handling are identical, and the transport is one argument to `mcp.run`. Writing a server over stdio and moving it to HTTP later is a small change, provided you remember the lifespan row in section 03." },

    { t: "exercise", kind: "practice", title: "Move one server across all three", difficulty: "core", minutes: 28,
      prompt: "Take a two-tool server with a lifespan that holds a counter. Run it over stdio and confirm two connections give two independent counters. Run the same code over streamable HTTP and confirm two clients share one counter and one pid, with different session ids. Then set stateless_http=True and confirm the session id is None. Finally, start it with host='0.0.0.0', find your machine's address, and connect from a second device or a container — then put it back to 127.0.0.1 and explain in one sentence what you just exposed.",
      hints: [
        "The counter is the whole experiment: independent under stdio, shared under HTTP.",
        "get_session_id() is the third value yielded by streamablehttp_client.",
        "The last step is the point of the lesson — describe who could reach the server and with whose credentials."
      ],
      solution: {
        notes: [
          { t: "p", text: "The shared counter is the finding, and it is the bug class in miniature. Under stdio the counter is per caller and correct; under HTTP it is global and almost certainly wrong, and nothing in the code changed. Any mutable thing in a lifespan deserves the same examination." },
          { t: "p", text: "The `0.0.0.0` step is deliberately uncomfortable. What you exposed is every tool on the server, to everyone who can route to that port, acting with whatever credentials the server process holds — with no authentication, because the protocol has none. That is the sentence lesson 3.2 is written to answer." }
        ]
      } }

  ],

  takeaways: [
    "**The messages are identical across all three transports** — same JSON-RPC, same methods, same handshake. Only the pipe changes, and it is one argument to `mcp.run`.",
    "**Streamable HTTP is the one to choose for anything new**; SSE is the older two-endpoint transport you will still meet in existing servers.",
    "**`host` defaults to `127.0.0.1`**, so a server started with no arguments is reachable only from the same machine.",
    "**stdio gives access control and caller isolation for free**: separate processes, measured as pids 10152 and 22540 with independent call counters.",
    "**Its cost is that it cannot cross a machine**, which rules out a shared service or anything behind a load balancer.",
    "**Configuring a stdio server is telling your host to run a command** — the same trust decision as a dependency, and never built from user-supplied input.",
    "**Over HTTP, two clients shared pid 7116 and were separated only by session ids.** The isolation moved from the operating system to a string in a header.",
    "**The lifespan row is what breaks working code:** a single connection or mutable cache that was correct under stdio now serves every caller, producing load-dependent bugs absent from any single-client test.",
    "**Stateful mode issues a session id; stateless mode returns None** and keeps nothing, which is what makes horizontal scaling straightforward.",
    "**Stateless rules out server-initiated messages** — progress notifications, `tools_changed`, resource subscriptions all need the session.",
    "**Choose stateless plus `json_response` unless you need the session**, because most servers are request-response and that deployment behaves like every other service you run.",
    "**Start with stdio when unsure.** It is the cheapest to write and the easiest to move, as long as you revisit the lifespan."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Two clients connect concurrently to one streamable-HTTP server. The tool reports pid 7116 for both, with different session ids. What follows for the server's design?",
        options: [
          "Nothing — session ids provide full isolation",
          "They share one process and therefore one memory space, so anything mutable in the lifespan is shared by every caller — a single connection or cache that was correct under stdio is now a concurrency bug",
          "The server must be restarted between clients",
          "Each session gets its own event loop"
        ],
        answer: 1,
        why: "Under stdio the same code was correct, because each connection was its own process — measured as pids 10152 and 22540. Changing one argument to mcp.run changed the concurrency model, and the resulting bugs are load-dependent and absent from any test that connects one client."
      },
      {
        stem: "What does `stateless_http=True` change?",
        options: [
          "It disables authentication",
          "No session id is issued and the server keeps nothing between requests, so any replica can serve any request — at the cost of all server-initiated messages",
          "It switches the transport to SSE",
          "It makes tools synchronous"
        ],
        answer: 1,
        why: "The measured difference is one field: a session id in stateful mode, None in stateless. What it rules out is progress notifications, tools_changed and resource subscriptions, all of which need the server to remember the connection."
      },
      {
        stem: "Why is stdio's access control described as free and strongest?",
        options: [
          "Because stdio is encrypted",
          "The server is a child process with no port — nothing else on the machine is talking to it, and there is nothing to authenticate because there is one caller",
          "Because the SDK adds a token automatically",
          "Because stdio servers run as root"
        ],
        answer: 1,
        why: "It is a property of the deployment rather than a feature. The flip side is the trust it demands: configuring a stdio server tells your host to execute a command, so it is the same decision as installing a dependency."
      },
      {
        stem: "A team needs one MCP server serving several agents, with no long-running progress reporting. What is the right configuration?",
        options: [
          "stdio, launched per agent",
          "Streamable HTTP in stateless mode, ideally with json_response — any replica serves any request, with no sticky routing to get wrong",
          "SSE, for compatibility",
          "Streamable HTTP in stateful mode, for safety"
        ],
        answer: 1,
        why: "Most servers are request-response and need no session at all, and stateless makes the deployment behave like every other service. Stateful is the right answer only when you genuinely need server-initiated messages, and it brings sticky routing or shared session storage with it."
      },
      {
        stem: "What does the default `host` value tell you?",
        options: [
          "That the server is production-ready",
          "`127.0.0.1` means a server started with no arguments is reachable only from the same machine — changing it to 0.0.0.0 exposes every tool to anyone who can route to the port, with no authentication",
          "That only SSE is enabled",
          "That the port is randomised"
        ],
        answer: 1,
        why: "It is the right default and the first thing people change without weighing it. Since the protocol has no authentication of its own, that one change moves the server from unreachable to open, acting with whatever credentials the process holds."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What are the MCP transports and when would you use each?",
        strong: "stdio, streamable HTTP and the older SSE. stdio makes the server a subprocess of the host, which gives access control and caller isolation for free and cannot cross a machine — right for desktop hosts and local tools. Streamable HTTP is one endpoint and is the choice for anything new or shared. SSE is the two-endpoint predecessor you meet in existing deployments. The messages are identical in all three; only the pipe changes.",
        answer: [
          { t: "p", text: "Framing stdio's isolation as a property of the deployment rather than a feature is the part that shows understanding." },
          { t: "p", text: "A strong answer adds that the transport is one argument to mcp.run and nothing about the tools changes, so the real migration cost is in the server's assumptions rather than its interface." }
        ]
      },
      {
        level: "advanced",
        q: "A server works perfectly over stdio and misbehaves intermittently over HTTP. Where do you look?",
        strong: "Anything mutable shared across callers, starting with the lifespan. Under stdio each connection is its own process, so one database connection or one cache is per caller and correct; over HTTP two clients share one process — I measured the same pid for both — so that same object serves everyone. The symptoms are load-dependent and invisible to any test with one client. The fix is a pool rather than a connection, and per-request state taken from the request.",
        answer: [
          { t: "p", text: "Going straight to the lifespan is right, and having the pid measurement makes the reasoning concrete rather than a guess about threading." },
          { t: "p", text: "Noting that a single-client test cannot reproduce it is the detail that explains why this ships: everything passes until there is traffic." },
          { t: "p", text: "The best answers mention that the session id is now the only isolation boundary, which raises the question of what is keyed by it — and that nothing in MCP carries the caller's identity, so the session id is not a user." }
        ]
      },
      {
        level: "advanced",
        q: "When would you choose stateful streamable HTTP over stateless?",
        strong: "Only when I need server-initiated messages: progress notifications on a long-running tool, a tools_changed notification because the tool list varies, or resource subscriptions. Those require the server to remember the connection. Otherwise stateless, because most servers are request-response and statelessness means any replica serves any request — no sticky routing, no session affinity, no decision about a replica restarting mid-conversation.",
        answer: [
          { t: "p", text: "Starting from what statelessness rules out, rather than from a preference, is the structure of a good answer here." },
          { t: "p", text: "Mentioning the operational consequences of stateful mode — sticky routing or shared session storage, and replica restarts — shows the choice has been made in production rather than read about." }
        ]
      }
    ]
  }
});
