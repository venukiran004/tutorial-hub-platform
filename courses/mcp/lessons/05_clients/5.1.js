/* ============================================================================
   LESSON 5.1 — Writing a Client
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "**Most people never write an MCP client, and the ones who need to are usually building a service rather than a desktop app.** The protocol part is twenty lines; the part that goes wrong is ownership. A client owns a subprocess, and a web handler that opens one per request leaks a process per request — which presents as memory exhaustion hours later with nothing in the logs. This lesson is the lifecycle, and the session group that holds several servers at once.",

  objectives: [
    "Open a client session and explain what each context manager owns",
    "Say why initialize must precede everything and happens once",
    "Hold several servers in one process with a session group",
    "Resolve a tool-name collision deliberately",
    "Avoid the leak that a per-request client produces"
  ],

  prerequisites: ["3.1", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "Two context managers, and what each owns", id: "lifecycle" },

    {"kind": "trace", "title": "Two managers, and the argument that replaces rather than merges", "caption": "**The nesting is not stylistic: a session cannot outlive the transport carrying it.** `ClientSession` is transport-agnostic, so everything written against it works over streamable HTTP unchanged. **And the `env` row is a real afternoon lost:** a dictionary replaces the environment entirely, so the child loses `PATH`, `HOME` and on Windows `SYSTEMROOT` — and the symptom is a server that works when you run it by hand and fails under your client, which sends people looking in the server.", "left": "piece", "codeW": 190, "vars": ["owns / does", "note"], "steps": [{"code": "stdio_client(params)", "state": ["spawns and reaps the SUBPROCESS", "~1s of interpreter start"], "tone": "accent"}, {"code": "ClientSession(read, write)", "state": ["the protocol state machine", "transport-agnostic"], "changed": [0, 1], "tone": "good"}, {"code": "await session.initialize()", "state": ["the handshake, once", "the only place capabilities arrive"], "changed": [0, 1], "tone": "violet"}, {"code": "env=None", "state": ["inherits the parent environment", "what you want"], "changed": [0, 1], "tone": "good"}, {"code": "env={'API_KEY': ...}", "state": ["REPLACES it entirely", "no PATH, no HOME, no SYSTEMROOT"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-5_1-01-0"},

    { t: "code", lang: "python", title: "the whole client",
      code: `import asyncio, sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    params = StdioServerParameters(
        command=sys.executable,
        args=["finance_server.py"],
        env=None,                      # None inherits; a dict replaces entirely
    )

    async with stdio_client(params) as (read, write):      # owns the SUBPROCESS
        async with ClientSession(read, write) as session:  # owns the SESSION
            await session.initialize()                     # once, before anything
            tools = await session.list_tools()
            result = await session.call_tool("convert",
                                             {"amount": 100, "frm": "GBP", "to": "EUR"})

asyncio.run(main())`,
      caption: "**The outer manager spawns and reaps the process; the inner one runs the protocol over its pipes.** Leaving either block tears down what it owns, which is why the nesting is not stylistic — a session cannot outlive the transport carrying it." },

    { t: "dl", items: [
      ["`stdio_client(params)`", "Spawns the command, yields a read and a write stream, and on exit terminates the child. This is the object that makes a client expensive: a process start, measured at roughly a second in lesson 4.3."],
      ["`ClientSession(read, write)`", "The protocol state machine. It is transport-agnostic — the same class sits on top of `streamablehttp_client` — so everything you write against a session works over any transport."],
      ["`await session.initialize()`", "The handshake from lesson 1.2. **Once per session, before any other call**, and its return value is the only place the server's capabilities arrive. Discarding it is the mistake lesson 1.2 warned about."],
      ["`env`", "`None` inherits the parent environment; a dictionary replaces it entirely rather than merging. A server that works when you run it by hand and fails under your client has usually lost a variable this way."]
    ] },

    { t: "callout", kind: "trap", title: "The env argument replaces, it does not merge",
      body: [
        { t: "p", text: "Passing `env={\"API_KEY\": \"...\"}` gives the child *only* that variable. On Windows a missing `SYSTEMROOT` breaks Python startup outright; on any platform a missing `PATH` breaks a server that shells out, and a missing `HOME` breaks one that reads a config file." },
        { t: "p", text: "If you need to add a variable, build the dictionary from `os.environ` and then set yours. The failure is confusing because it looks like a bug in the server rather than in the way you launched it." }
      ] },

    { t: "h2", n: "02", text: "Several servers in one process", id: "group" },

    {"kind": "flow", "title": "The session group is the host-side fan-out, written once", "caption": "**Lesson 1.1 assigned this job to the host: one client per server, and somebody has to merge the lists.** `ClientSessionGroup` is that, with `group.tools` as the merged dictionary and `group.call_tool` routing by name — measured as three tools across two servers and two sessions held. **The reason it is the default for a service is the exit stack:** every subprocess is owned in one place, so there is no path that leaves a child running.", "cols": 3, "nodes": [{"id": "a", "label": "connect_to_server(finance)", "sub": "one session", "tone": "accent"}, {"id": "b", "label": "connect_to_server(pid_server)", "sub": "a second session", "tone": "accent"}, {"id": "t", "label": "group.tools: convert, vat, whoami", "sub": "merged - 2 sessions held", "tone": "good"}, {"id": "c", "label": "group.call_tool routes by name", "sub": "'pid 16796, call 1'", "tone": "good"}, {"id": "e", "label": "One exit stack owns every subprocess", "sub": "one place where teardown happens", "tone": "violet"}], "edges": [["a", "t"], ["b", "t"], ["t", "c"], ["t", "e"]], "t": "diagram", "id": "dg-5_1-02-1"},

    { t: "p", text: "Lesson 1.1 measured that one client talks to one server and the host does the fan-out. `ClientSessionGroup` is that fan-out, written once." },

    { t: "code", lang: "python", title: "two servers, one merged tool list",
      code: `from mcp import ClientSessionGroup, StdioServerParameters

async with ClientSessionGroup() as group:
    for script in ("finance_server.py", "pid_server.py"):
        await group.connect_to_server(params_for(script))

    print("  tools across both:", sorted(group.tools))
    print("  sessions held    :", len(group.sessions))
    r = await group.call_tool("whoami", {})
    print("  call via group   :", r.content[0].text)`,
      out: `  tools across both: ['convert', 'vat', 'whoami']
  sessions held    : 2
  call via group   : pid 16796, call 1`,
      caption: "**`group.tools` is the merged dictionary and `group.call_tool` routes by name**, so the group has done exactly the job lesson 1.1 assigned to the host. It also exposes `prompts` and `resources` the same way, and one `async with` owns every subprocess." },

    { t: "p", text: "The group is the right default for a service connecting to more than one server, for one reason beyond convenience: **it owns all the subprocesses under a single exit stack**, so there is one place where teardown happens and no path that leaves a child running." },

    { t: "h2", n: "03", text: "What happens when two servers offer the same name", id: "collision" },

    {"kind": "trace", "title": "It raises rather than shadowing - and the hook is the fix", "caption": "**Failing loudly is the right choice**, because the alternative is one server silently shadowing another's tool and nobody finding out. **Set the hook from the start rather than when a collision forces it**, because prefixing earns its place three times: collisions, legible traces that say where a call went, and the cross-server shadowing defence from lesson 4.1 — a description claiming to be about `transfer` is visibly not about `payments_transfer`. Keep the prefix short, since the model reads it.", "left": "configuration", "codeW": 190, "vars": ["result"], "steps": [{"code": "two servers, both offering 'convert'", "state": ["McpError: {'convert'} already exist in group tools"], "tone": "crit"}, {"code": "component_name_hook=hook", "state": ["finance_convert, finance_vat, other_convert"], "changed": [0], "tone": "good"}, {"code": "benefit 1", "state": ["collisions resolved deliberately"], "changed": [0], "tone": "good"}, {"code": "benefit 2", "state": ["traces say which server was called"], "changed": [0], "tone": "accent"}, {"code": "benefit 3", "state": ["shadowing is visible - lesson 4.1"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-5_1-03-2"},

    { t: "p", text: "Two servers, each with a tool called `convert`. The protocol has nothing to say about this — lesson 1.1 noted a server cannot see its neighbours — so the question is what the group does." },

    { t: "code", lang: "python", title: "the collision, and the fix",
      code: `# No hook: two servers both offering 'convert'
async with ClientSessionGroup() as g:
    await g.connect_to_server(params("finance_server.py"))
    await g.connect_to_server(params("dup_server.py"))     # <- raises here

# With a component_name_hook:
def hook(name, server_info):
    return "%s_%s" % (server_info.name, name)

async with ClientSessionGroup(component_name_hook=hook) as g:
    await g.connect_to_server(params("finance_server.py"))
    await g.connect_to_server(params("dup_server.py"))
    print("    tools:", sorted(g.tools))`,
      out: `--- no hook
    RAISED McpError: {'convert'} already exist in group tools.
--- with a component_name_hook
    tools: ['finance_convert', 'finance_vat', 'other_convert']`,
      caption: "**It raises rather than silently overwriting, which is the right choice** — the alternative is one server shadowing another's tool and nobody finding out. The hook receives the tool name and the server's own `Implementation`, so the prefix can be the server's declared name or anything else you prefer." },

    { t: "callout", kind: "good", title: "Use the hook from the start, not when it raises",
      body: [
        { t: "p", text: "Prefixing has three benefits and only one of them is collisions. **It makes traces and logs legible**, because `finance_convert` says where the call went. **It helps the model choose**, since lesson 2.2's point about disambiguating names applies across servers as much as within one. And **it is a defence against the shadowing in lesson 4.1**, because a description claiming to be about `transfer` is visibly not about `payments_transfer`." },
        { t: "p", text: "The one caution is that the prefix is part of what the model sees, so keep it short and meaningful: the server's own name is usually right, and a UUID is not." }
      ] },

    { t: "h2", n: "04", text: "The leak", id: "leak" },

    {"kind": "flow", "title": "A client in a handler leaks a process per request", "caption": "**The latency is the visible half — about 1.1 seconds of interpreter start before any work happens — and the leak is the half that pages someone.** A client owns a subprocess, so a handler that opens one leaks whenever teardown is skipped: a cancelled request, a timeout, an exception on an unusual path. **The symptom is memory exhaustion hours later with nothing in the agent logs**, which is why it survives testing. The fix is the same shape as a database pool.", "cols": 3, "nodes": [{"id": "h", "label": "stdio_client inside a handler", "sub": "a process per request", "tone": "crit"}, {"id": "l", "label": "~1.1s before any work", "sub": "measured in lesson 4.3", "tone": "crit"}, {"id": "k", "label": "A skipped teardown leaks the child", "sub": "cancellation, timeout, odd exception", "tone": "crit"}, {"id": "s", "label": "Memory exhaustion hours later", "sub": "nothing in the logs explains it", "tone": "crit"}, {"id": "f", "label": "Connect once in the app's lifespan", "sub": "hold the group, close at shutdown", "tone": "good"}, {"id": "n", "label": "And health is now yours", "sub": "a wedged server is still alive", "tone": "violet"}], "edges": [["h", "l"], ["h", "k"], ["k", "s"], ["s", "f"], ["f", "n"]], "t": "diagram", "id": "dg-5_1-04-3"},

    { t: "p", text: "This is the one failure worth the whole lesson, because it is easy to write, works in testing, and fails in a way that does not point at the cause." },

    { t: "code", lang: "python", title: "a process per request",
      code: `# WRONG: a FastAPI handler that constructs a client per request.
@app.post("/ask")
async def ask(q: Query):
    async with stdio_client(params) as (r, w):          # spawns a process
        async with ClientSession(r, w) as session:      # handshake, ~1s
            await session.initialize()
            return await session.call_tool("convert", q.args)`,
      caption: "Every request spawns a Python interpreter, performs a handshake and tears it down — **lesson 4.3 measured that at about 1.1 seconds** before any work happens. And if a request is cancelled between the spawn and the exit, the child may survive the handler." },

    { t: "dl", items: [
      ["The latency is the visible half", "Roughly a second of interpreter start on every request, which is usually the largest single number in the trace and is entirely avoidable."],
      ["The leak is the half that pages someone", "A client holds a subprocess. A handler that opens one per request leaks a process whenever teardown is skipped — a cancelled request, a timeout, an exception on an unusual path — and the symptom is memory exhaustion hours later with nothing in the agent logs."],
      ["The fix is lifespan scope", "Connect once at application startup, hold the group, close it at shutdown. The same shape as a database pool, for the same reason."],
      ["And health is now your problem", "A long-lived connection can die. If the subprocess exits, every later call fails until something reconnects, so the group needs a reconnect path and a health check that actually calls the server."]
    ] },

    { t: "code", lang: "python", title: "connected once, for the life of the app",
      code: `from contextlib import asynccontextmanager, AsyncExitStack

@asynccontextmanager
async def lifespan(app):
    async with AsyncExitStack() as stack:
        group = await stack.enter_async_context(ClientSessionGroup(component_name_hook=hook))
        for p in SERVER_PARAMS:
            await group.connect_to_server(p)
        app.state.mcp = group
        yield                                   # the app serves requests here
    # every subprocess reaped on the way out

@app.post("/ask")
async def ask(q: Query):
    return await app.state.mcp.call_tool("finance_convert", q.args)`,
      caption: "**One connection for the life of the process, torn down once.** This is the same pattern as lesson 2.1's server-side lifespan, in the other direction — and it is the reason an MCP client belongs in your application's startup rather than in a handler." },

    { t: "h2", n: "05", text: "What a client must still decide", id: "decide" },

    {"kind": "trace", "title": "Eight decisions, and three of them are the security module", "caption": "**Rows one, two and four are the controls from lesson 4.1, and all three live in client code.** That is the asymmetry worth ending on: a server author can write careful descriptions and hold a narrow credential, and none of it protects the consumer — because the consumer decides what to connect and what to expose. **Which is encouraging rather than alarming**, since the list is short and it is all code you own.", "left": "decision", "codeW": 190, "vars": ["why it is yours"], "steps": [{"code": "which servers to connect at all", "state": ["the only complete control - lesson 4.1"], "tone": "violet"}, {"code": "which tools to expose", "state": ["an allow-list; the protocol offers no filtering"], "changed": [0], "tone": "violet"}, {"code": "how to namespace them", "state": ["component_name_hook, before a collision forces it"], "changed": [0], "tone": "good"}, {"code": "what to do with instructions", "state": ["untrusted text - does it reach the model?"], "changed": [0], "tone": "violet"}, {"code": "reading resources speculatively", "state": ["cheap for the model; you trust the content"], "changed": [0], "tone": "accent"}, {"code": "reconnection and health", "state": ["a long-lived session can die"], "changed": [0], "tone": "crit"}, {"code": "what to log per call", "state": ["which server, which tool, duration"], "changed": [0], "tone": "accent"}], "t": "diagram", "id": "dg-5_1-05-4"},

    { t: "table",
      head: ["Decision", "Why it is yours"],
      rows: [
        ["Which servers to connect at all", "Lesson 4.1: the only complete control, and the honest first question"],
        ["Which tools to expose to the model", "An allow-list — the protocol offers no filtering"],
        ["How to namespace them", "`component_name_hook`, before a collision forces it"],
        ["What to do with `instructions`", "It is untrusted text; decide whether it reaches the model at all"],
        ["Whether to read resources speculatively", "Lesson 1.3: cheap for the model, and you are choosing to trust the content"],
        ["What the capability flags mean for your UI", "Lesson 1.2: read them once rather than probing"],
        ["Reconnection and health", "A long-lived session can die, and nothing reconnects for you"],
        ["What to log per call", "Which server, which tool, duration — the consumer's side of lesson 4.4"]
      ] },

    { t: "callout", kind: "insight", title: "A client is where the security decisions actually land",
      body: [
        { t: "p", text: "Rows one, two and four are the controls from lesson 4.1, and all three live in client code. **That is the asymmetry worth ending the module on:** a server author can write careful descriptions and narrow credentials, and none of it protects the consumer, because the consumer is the one deciding what to connect and what to expose." },
        { t: "p", text: "So if you are writing the client, you hold the controls — which is good news, since they are a short list and they are all code you own." }
      ] },

    { t: "exercise", kind: "practice", title: "Build a client that does not leak", difficulty: "advanced", minutes: 30,
      prompt: "Write a client that connects to two servers via a session group with a name-prefix hook, lists the merged tools, and calls one from each. Deliberately create a name collision without the hook and record the error. Then build a small FastAPI app two ways: first with the client inside the handler, and measure the per-request latency; then with the group in the application lifespan, and measure again. Finally, kill one server subprocess while the app is running and record what the next call does — then add whatever is needed to survive it.",
      hints: [
        "Time ten sequential requests in each version; the difference is interpreter startup.",
        "Kill the child process by pid, from another terminal.",
        "The survival step is the one nobody writes until it happens in production."
      ],
      solution: {
        notes: [
          { t: "p", text: "The latency comparison makes the case on its own — about a second per request against effectively zero — but the leak is the more serious half and it is harder to demonstrate: cancel a request mid-flight a few times and watch the process count climb. Nothing in the application's logs mentions it." },
          { t: "p", text: "Killing the subprocess is the step worth doing, because the default behaviour is unpleasant: every subsequent call fails, the group does not notice, and the application keeps serving errors until someone restarts it. A reconnect path plus a health check that actually calls a tool is the minimum, and 'is the process alive' is not a sufficient check — a wedged server is alive." }
        ]
      } }

  ],

  takeaways: [
    "**Two nested context managers: `stdio_client` owns the subprocess, `ClientSession` owns the protocol.** A session cannot outlive the transport carrying it.",
    "**`ClientSession` is transport-agnostic**, so everything written against a session works over stdio or streamable HTTP unchanged.",
    "**`initialize()` runs once, before anything else**, and its return value is the only place the server's capabilities arrive — discarding it is lesson 1.2's mistake.",
    "**`env` replaces the environment rather than merging it.** A missing `PATH`, `HOME` or `SYSTEMROOT` breaks the child in ways that look like a server bug.",
    "**`ClientSessionGroup` is the host-side fan-out from lesson 1.1**: a merged `tools` dictionary, `call_tool` routing by name, and every subprocess under one exit stack.",
    "**A tool-name collision raises** — `McpError: {'convert'} already exist in group tools` — rather than letting one server shadow another's tool silently.",
    "**`component_name_hook` prefixes the names**, measured producing `finance_convert`, `finance_vat` and `other_convert`.",
    "**Use the hook from the start:** it fixes collisions, makes traces legible, helps the model choose, and defends against the cross-server shadowing in lesson 4.1.",
    "**A client in a request handler spawns a process per request** — about 1.1 seconds of interpreter start — and leaks one whenever teardown is skipped.",
    "**The leak presents as memory exhaustion hours later** with nothing in the agent logs to explain it.",
    "**Connect once in the application's lifespan and hold the group**, the same shape as a database pool.",
    "**A long-lived session can die**, so a reconnect path and a health check that actually calls the server are now your responsibility — a wedged server is still alive.",
    "**The security controls from lesson 4.1 all live in client code:** which servers to connect, which tools to expose, and what to do with untrusted `instructions`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A FastAPI handler opens a `stdio_client` per request. What are the two problems?",
        options: [
          "Only latency — it is otherwise correct",
          "About a second of interpreter startup per request, and a leaked subprocess whenever teardown is skipped — a cancelled request, a timeout, an exception on an unusual path",
          "Only the leak; stdio startup is fast",
          "Neither; the context manager guarantees cleanup"
        ],
        answer: 1,
        why: "Lesson 4.3 measured the startup at about 1.1 seconds. The leak is the more serious half because it surfaces as memory exhaustion hours later with nothing in the application logs, and the fix for both is to connect once in the application's lifespan."
      },
      {
        stem: "Two connected servers both offer a tool called `convert`. What does `ClientSessionGroup` do?",
        options: [
          "Silently keeps the first one",
          "Raises `McpError: {'convert'} already exist in group tools` — which is the right choice, since the alternative is one server shadowing another's tool unnoticed",
          "Renames the second automatically",
          "Refuses the first connection"
        ],
        answer: 1,
        why: "Failing loudly is correct here. The deliberate fix is `component_name_hook`, which produced `finance_convert`, `finance_vat` and `other_convert` — and it is worth setting from the start rather than when a collision forces it."
      },
      {
        stem: "Why pass `env=None` rather than `env={\"API_KEY\": \"...\"}`?",
        options: [
          "Because env must be None for stdio",
          "Because the dictionary replaces the environment entirely rather than merging — so the child loses PATH, HOME and on Windows SYSTEMROOT, breaking it in ways that look like a server bug",
          "Because secrets cannot be passed this way",
          "Because None is faster"
        ],
        answer: 1,
        why: "To add a variable, build the dictionary from os.environ and then set yours. The symptom is a server that works when you run it by hand and fails under your client, which sends people looking in the wrong place."
      },
      {
        stem: "Besides avoiding collisions, why prefix tool names per server?",
        options: [
          "It reduces token usage",
          "Legible traces, better model tool-choice as in lesson 2.2, and a defence against cross-server shadowing — a description claiming to be about `transfer` is visibly not about `payments_transfer`",
          "It is required by the protocol",
          "It enables resource templates"
        ],
        answer: 1,
        why: "Three benefits for one hook. The caution is that the prefix is part of what the model reads, so the server's own short name is usually right and a UUID is not."
      },
      {
        stem: "A long-lived session group is held in the application lifespan and one server's subprocess is killed. What happens by default?",
        options: [
          "The group reconnects automatically",
          "Every subsequent call to that server fails, the group does not notice, and the app keeps serving errors until someone restarts it",
          "The application shuts down",
          "The group falls back to another server"
        ],
        answer: 1,
        why: "Holding the connection moves health into your responsibility, which is the trade for not leaking processes. A health check that actually calls a tool is the minimum, since checking whether the process is alive does not detect a wedged server."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Walk me through writing an MCP client.",
        strong: "Two nested context managers: stdio_client spawns the server and yields read and write streams, and ClientSession runs the protocol over them. Then initialize once, before anything else, and keep the result because that is where the server's capabilities arrive. ClientSession is transport-agnostic, so the same code works over streamable HTTP. For more than one server, ClientSessionGroup does the fan-out and holds every subprocess under one exit stack.",
        answer: [
          { t: "p", text: "Naming what each manager owns is the part that matters, because it explains why the nesting is not stylistic." },
          { t: "p", text: "Keeping the initialize result rather than discarding it is a small signal of having read the handshake properly rather than copying a quickstart." }
        ]
      },
      {
        level: "advanced",
        q: "Your service uses an MCP server and runs out of memory after a few hours. Where do you look?",
        strong: "Whether a client is being constructed per request. A client owns a subprocess, so a handler that opens one leaks a process whenever teardown is skipped — a cancelled request, a timeout, an unusual exception path — and nothing in the application logs mentions it. The fix is to connect once in the application's lifespan and hold a session group, like a database pool. That also removes about a second of interpreter startup from every request.",
        answer: [
          { t: "p", text: "Going straight to process ownership is the answer, and it is a diagnosis most people reach only after seeing it once." },
          { t: "p", text: "Mentioning that the latency improves as a side effect shows the fix is the right shape rather than a workaround." },
          { t: "p", text: "The strongest answers name what the fix costs: holding the connection makes health your problem, so a reconnect path and a check that actually calls a tool — not just 'is the process alive' — come with it." }
        ]
      },
      {
        level: "advanced",
        q: "Where do the security controls for MCP actually live?",
        strong: "In the client. Which servers to connect at all, which tools to expose to the model as an allow-list, how to namespace them, and whether a server's instructions reach the model — all of that is client code. A server author can write careful descriptions and hold a narrow credential, and none of it protects the consumer, because the consumer makes those four decisions.",
        answer: [
          { t: "p", text: "The asymmetry is the insight, and it reframes the whole security module: the party with the controls is the one connecting, not the one publishing." },
          { t: "p", text: "A good close is that this is encouraging rather than alarming — the list is short and it is all code you own, which is unusual for a supply-chain risk." }
        ]
      }
    ]
  }
});
