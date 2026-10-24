/* ============================================================================
   LESSON 2.4 — The Low-Level Server API
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "**The decorators are a convenience layer over an API that was always there, and three things live only underneath.** You can declare your own version and capabilities, serve more than one transport, and send notifications — and you pay for it by writing every schema and every dispatch by hand. Written out side by side, that cost also buys something measured earlier in this module: the low-level server's parameters carried three descriptions of three, where the decorator version carried zero.",

  objectives: [
    "Write the same server against mcp.server.lowlevel.Server",
    "Say what FastMCP fills in for you during initialize",
    "Declare capabilities deliberately, including tools_changed",
    "Send a list-changed notification and know why it matters to consumers",
    "Decide which of the two APIs a given server should use"
  ],

  prerequisites: ["2.3"],

  blocks: [

    { t: "h2", n: "01", text: "The same server, one layer down", id: "lowlevel" },

    {"kind": "trace", "title": "Three things the decorators never made you write", "caption": "**Two handlers replace a decorator per tool:** one returning the tool list, one dispatching a call by name. The cost is visible in every row — the `inputSchema` as a literal dictionary, the `if name != ...` branch, and the whole of `InitializationOptions`, which is the object FastMCP had been assembling silently all along. **Writing it once is what makes the handshake in lesson 1.2 stop being something that happens and start being something you chose.**", "left": "what you now write by hand", "codeW": 200, "vars": ["in FastMCP this was"], "steps": [{"code": "@server.list_tools() -> list[types.Tool]", "state": ["one @mcp.tool() per function"], "tone": "accent"}, {"code": "the inputSchema dict, per tool", "state": ["generated from annotations"], "changed": [0], "tone": "crit"}, {"code": "@server.call_tool(), dispatching on name", "state": ["the decorator bound the function"], "changed": [0], "tone": "crit"}, {"code": "the unknown-name branch", "state": ["handled for you"], "changed": [0], "tone": "warn"}, {"code": "InitializationOptions(...)", "state": ["assembled silently"], "changed": [0], "tone": "violet"}, {"code": "Server(name, version=, instructions=)", "state": ["version not expressible at all"], "changed": [0], "tone": "good"}], "t": "diagram", "id": "dg-2_4-01-4"},

    { t: "p", text: "There are two handlers instead of a decorator per tool: one that returns the tool list, and one that dispatches a call by name." },

    { t: "code", lang: "python", title: "a low-level server, complete",
      code: `import asyncio
import mcp.types as types
from mcp.server.lowlevel import NotificationOptions, Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server

server = Server("finance-lowlevel", version="2.0.0",
                instructions="The same server, without the decorator layer.")

RATES = {("GBP", "EUR"): 1.17}

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    """You build the Tool list yourself -- including every schema."""
    return [
        types.Tool(
            name="convert",
            description="Converts an amount between two currencies.",
            inputSchema={
                "type": "object",
                "properties": {
                    "amount": {"type": "number", "description": "The amount to convert"},
                    "frm": {"type": "string", "description": "ISO 4217 code, uppercase"},
                    "to": {"type": "string", "description": "ISO 4217 code, uppercase"},
                },
                "required": ["amount", "frm", "to"],
            },
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.ContentBlock]:
    """And you dispatch by name yourself."""
    if name != "convert":
        raise ValueError("unknown tool: %s" % name)
    rate = RATES.get((arguments["frm"].upper(), arguments["to"].upper()))
    if rate is None:
        return [types.TextContent(type="text", text="no rate available")]
    return [types.TextContent(type="text", text=str(round(arguments["amount"] * rate, 2)))]

async def main():
    opts = InitializationOptions(
        server_name="finance-lowlevel",
        server_version="2.0.0",
        instructions="The same server, without the decorator layer.",
        capabilities=server.get_capabilities(
            notification_options=NotificationOptions(tools_changed=True),
            experimental_capabilities={},
        ),
    )
    async with stdio_server() as (read, write):
        await server.run(read, write, opts)

asyncio.run(main())`,
      caption: "Three things the decorator version never made you write: the `inputSchema` dictionary, the dispatch on `name`, and the whole of `InitializationOptions` — which is what FastMCP had been assembling silently." },

    { t: "h2", n: "02", text: "The two servers, compared on one connection", id: "compared" },

    {"kind": "trace", "title": "Four differences, and all four are the same fact", "caption": "**The low-level API does not decide anything for you.** Your version rather than the SDK's; `listChanged=True` because you asked for it; no resources capability because you registered no resource handler; three parameter descriptions of three because you wrote the schema by hand. **The last row is not an argument for going lower**, though — `Annotated` with `Field` on the decorator version also reaches 3 of 3, for less code and no dispatch to maintain. The real reasons are the first three.", "left": "measured", "codeW": 170, "vars": ["FastMCP", "low-level Server"], "steps": [{"code": "serverInfo", "state": ["finance 1.28.1 - the SDK's", "finance-lowlevel 2.0.0 - yours"], "tone": "violet"}, {"code": "tools capability", "state": ["listChanged=False", "listChanged=True - declared"], "changed": [0, 1], "tone": "violet"}, {"code": "resources capability", "state": ["subscribe=False listChanged=False", "None - no handler registered"], "changed": [0, 1], "tone": "accent"}, {"code": "params with a description", "state": ["0 of 3 (docstring style)", "3 of 3 - hand-written"], "changed": [0, 1], "tone": "warn"}, {"code": "but Annotated + Field", "state": ["3 of 3, for less code", "-"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-2_4-02-0"},


    { t: "p", text: "A client connecting to each in turn, printing the handshake and the first tool's schema." },

    { t: "code", lang: "python", title: "the measurement",
      code: `for script in ("finance_server.py", "low_server.py"):
    async with stdio_client(params_for(script)) as (r, w):
        async with ClientSession(r, w) as s:
            i = await s.initialize()
            print("=== %s" % script)
            print("  name/version :", i.serverInfo.name, i.serverInfo.version)
            print("  tools cap    :", i.capabilities.tools)
            print("  resources cap:", i.capabilities.resources)
            t = (await s.list_tools()).tools[0]
            described = sum(1 for v in t.inputSchema["properties"].values() if "description" in v)
            print("  params with description:", described, "of", len(t.inputSchema["properties"]))`,
      out: `=== finance_server.py
  name/version : finance 1.28.1
  tools cap    : listChanged=False
  resources cap: subscribe=False listChanged=False
  params with description: 0 of 3

=== low_server.py
  name/version : finance-lowlevel 2.0.0
  tools cap    : listChanged=True
  resources cap: None
  params with description: 3 of 3`,
      caption: "**Four differences, and all four are the same fact: the low-level API does not decide anything for you.** Your version rather than the SDK's. `listChanged=True` because you asked for it. No resources capability, because you registered none. And three parameter descriptions of three, because you wrote the schema — where the decorator version's Google-style docstring produced none (lesson 2.2)." },

    { t: "callout", kind: "insight", title: "The 0-of-3 is not an argument for the low-level API",
      body: [
        { t: "p", text: "It is tempting to read that row as *“write schemas by hand and they are better”*, and that is the wrong conclusion. **`Annotated` with `Field` on the decorator version also produces 3 of 3**, with less code and no dispatch to maintain — lesson 2.2 measured exactly that." },
        { t: "p", text: "The honest comparison is: hand-written schemas are *always* complete because there is nothing to generate, and generated schemas are complete *if you use the right annotations*. The second is less work and easier to keep right, so it remains the default. The reasons to go down a layer are the other three rows." }
      ] },

    { t: "h2", n: "03", text: "InitializationOptions, and what you are declaring", id: "init" },

    {"kind": "trace", "title": "What you are declaring, and what nothing checks", "caption": "**`get_capabilities` derives the set from which handlers you registered, not from what they do** — so an empty `list_resources` handler still advertises the resources capability, and one that raises still advertises it. A client that read your flags has now built an interface for resources you do not have. **The rule is to register only what you implement**, and the broader realisation is the one that carries into module 4: everything in the handshake is a claim the server chose to make.", "left": "field", "codeW": 190, "vars": ["what it declares", "what verifies it"], "steps": [{"code": "server_name, server_version", "state": ["who you say you are", "nothing"], "tone": "warn"}, {"code": "instructions", "state": ["a hint about the whole server", "nothing - the host may ignore it"], "changed": [0, 1], "tone": "warn"}, {"code": "capabilities", "state": ["derived from REGISTERED handlers", "registration, not behaviour"], "changed": [0, 1], "tone": "crit"}, {"code": "an empty list_resources handler", "state": ["still advertises resources", "nothing"], "changed": [0, 1], "tone": "crit"}, {"code": "NotificationOptions(tools_changed=True)", "state": ["listChanged=True in the handshake", "you, by actually sending them"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-2_4-03-1"},


    { t: "p", text: "This is the object lesson 1.2 read from the client's side. Writing it yourself is the first time it becomes obvious that these are **claims**, and that nothing checks them." },

    { t: "dl", items: [
      ["`server_name` and `server_version`", "What the client reports and logs. The version is the field FastMCP cannot express at all (lesson 1.2), so a server whose release number consumers should see has a reason to be here."],
      ["`instructions`", "The same free-text server description, with the same two properties: a hint the host may ignore, and untrusted text from the consumer's point of view."],
      ["`capabilities`", "Built by `server.get_capabilities(...)`, which inspects which handlers you registered and combines that with the notification options you pass. Register no resource handler and the resources capability is `None` — which is why the comparison above shows `None` rather than a set of false flags."],
      ["`notification_options`", "`NotificationOptions(tools_changed=True)` is the promise discussed in lesson 1.2. `get_capabilities` turns it into `listChanged=True` in the handshake, and then it is on you to actually send the notifications."]
    ] },

    { t: "callout", kind: "trap", title: "get_capabilities reports what you registered, not what works",
      body: [
        { t: "p", text: "It derives the capability set from the presence of handlers. A `@server.list_resources()` handler that returns an empty list still advertises the resources capability, and a handler that raises still advertises it — **the declaration is about registration, not about behaviour.**" },
        { t: "p", text: "So the honest flags come from registering only what you implement. If you have a stub handler you intend to fill in later, delete it until then: advertising a capability you cannot serve is the same category of mistake as `listChanged=True` with no notifications." }
      ] },

    { t: "h2", n: "04", text: "Sending a notification", id: "notifications" },

    {"kind": "flow", "title": "Notifications are per session, and that cuts both ways", "caption": "**There is no broadcast in the protocol**, so a server holding six sessions must iterate them — and notifying only the session you happen to be handling leaves five clients with a stale list and nothing reporting the inconsistency. **For a consumer the same mechanism is a security fact:** a server may legitimately add a tool mid-connection, which is exactly why a tool filter has to be an allow-list. A deny-list only protects you against the tools that existed when you wrote it.", "cols": 3, "nodes": [{"id": "d", "label": "Declare tools_changed", "sub": "NotificationOptions", "tone": "accent"}, {"id": "s", "label": "send_notification on a session", "sub": "one client, not all of them", "tone": "violet"}, {"id": "i", "label": "Six sessions? Iterate them", "sub": "or the fleet is inconsistent", "tone": "crit"}, {"id": "c", "label": "A consumer's tool list is not constant", "sub": "tools can arrive mid-connection", "tone": "crit"}, {"id": "a", "label": "So filter with an ALLOW-list", "sub": "a deny-list ages badly", "tone": "good"}], "edges": [["d", "s"], ["s", "i"], ["s", "c"], ["c", "a"]], "t": "diagram", "id": "dg-2_4-04-2"},


    { t: "p", text: "Having declared `tools_changed`, the server can tell connected clients that the tool list moved — which is the only way a client learns without reconnecting." },

    { t: "code", lang: "python", title: "telling clients the list changed",
      code: `from mcp.types import ServerNotification, ToolListChangedNotification

# From inside a handler, where there is a request context and therefore a session:
await server.request_context.session.send_notification(
    ServerNotification(
        ToolListChangedNotification(method="notifications/tools/list_changed")
    )
)`,
      caption: "A client that receives this re-fetches `tools/list`. **This is a per-session call**, so a server with several connected clients notifies each session it holds — there is no broadcast in the protocol, and a server that only notifies the session it happens to be handling has told one client out of six." },

    { t: "p", text: "Two reasons to care about this even if you never send one." },

    { t: "dl", items: [
      ["As a server author, it is the only honest route to a dynamic tool list", "A server whose tools depend on configuration, a feature flag or the caller's entitlements will change its list at some point. Without the notification, every connected client holds the old list until it reconnects."],
      ["As a consumer, it means the tool list is not a constant", "A server may legitimately add a tool mid-connection. **That is exactly why a tool filter has to be an allow-list rather than a deny-list** — a deny-list protects you against the tools that existed when you wrote it. Lesson 4.1 treats this as the security property it is."]
    ] },

    { t: "h2", n: "05", text: "Which API to use", id: "choosing" },

    {"kind": "tree", "title": "Which API, and the one case the decorators cannot cover", "caption": "**`@mcp.tool()` registers at import time, so the tool set is fixed before any client connects** — which is why an entitlement-dependent tool list is the common genuine reason to drop a layer. A `list_tools` function is called per request and can consult configuration, a flag or the connection's context. **And the last branch is worth doing once even if you never ship it:** the shapes you see in a protocol trace are these, whichever API produced them.", "root": {"label": "What do you need from the server?", "sub": "start with FastMCP and Annotated", "tone": "accent", "children": [{"label": "Tools, resources, prompts with good schemas", "sub": "the ordinary case", "tone": "good", "children": [{"label": "FastMCP", "sub": "decorators plus Annotated - 3 of 3", "tone": "good"}]}, {"label": "A tool list that differs per connection", "sub": "entitlements, feature flags", "tone": "violet", "children": [{"label": "Low-level - list_tools runs per request", "sub": "the decorators register at import", "tone": "violet"}]}, {"label": "Notifications, or two transports at once", "sub": "or your own version in the handshake", "tone": "teal", "children": [{"label": "Low-level - you own run() and the options", "sub": "FastMCP needs _mcp_server.version", "tone": "teal"}]}, {"label": "To read a trace and understand it", "sub": "-", "tone": "accent", "children": [{"label": "Write one low-level server, once", "sub": "then the wire stops being mysterious", "tone": "accent"}]}]}, "t": "diagram", "id": "dg-2_4-05-3"},


    { t: "table",
      head: ["You need", "API", "Why"],
      rows: [
        ["A server with tools, resources and prompts", "**FastMCP**", "Decorators, generated schemas, less to maintain"],
        ["Rich schemas with constraints and enums", "**FastMCP** with `Annotated`", "Measured as 3 of 3 in lesson 2.2 — no reason to go lower"],
        ["Your own version in the handshake", "Either", "Low-level takes it as an argument; FastMCP needs `_mcp_server.version`"],
        ["To declare `tools_changed` and send notifications", "**Low-level**", "`NotificationOptions`, and a session to send on"],
        ["A dynamic tool list computed per connection", "**Low-level**", "`list_tools` is a function you write, so it can return anything"],
        ["Two transports from one process", "**Low-level**", "You own the `run` call, so you can mount more than one"],
        ["To read a protocol trace and understand it", "**Low-level, once**", "The shapes you see on the wire are these, whichever API wrote them"]
      ] },

    { t: "callout", kind: "good", title: "The pragmatic path",
      body: [
        { t: "p", text: "**Start with FastMCP and `Annotated`, and reach for the low-level API when one of the middle rows applies** — most often the dynamic tool list, because entitlement-dependent tools are a common requirement and the decorators register at import time." },
        { t: "p", text: "The last row is worth taking seriously as a one-off exercise even if you never ship a low-level server. Writing `InitializationOptions` by hand once makes the handshake in lesson 1.2 stop being a thing that happens and start being a thing you chose, and that pays off when you are reading somebody else's server to decide whether to trust it." }
      ] },

    { t: "exercise", kind: "practice", title: "Write it twice", difficulty: "advanced", minutes: 30,
      prompt: "Take a two-tool server you have written with FastMCP and rewrite it against the low-level Server. Set a version of your own and confirm it appears in the handshake. Declare tools_changed=True. Then make the tool list dynamic: have list_tools return the second tool only when an environment variable is set, and confirm from a client that the list differs between two connections started with different values. Finally register a list_resources handler that returns an empty list, print the capabilities, and explain what you have just advertised.",
      hints: [
        "types.Tool needs name, description and inputSchema — write the schema as a dict.",
        "call_tool dispatches on name, so the unknown-name branch is yours to write.",
        "The last part is the point: an empty handler still advertises the capability."
      ],
      solution: {
        notes: [
          { t: "p", text: "The dynamic list is the real reason this API exists, and it is the case the decorators cannot cover: `@mcp.tool()` runs at import time, so the tool set is fixed before any client connects. A `list_tools` function is called per request, which means it can consult configuration, a feature flag or the connection's own context." },
          { t: "p", text: "The empty-resource-handler step is the one worth writing down: you have advertised the resources capability to every client, each of which may now call `resources/list` and get nothing. That is a worse outcome than not advertising it, because a client that read your flags built a UI for resources you do not have — the same mistake as `listChanged=True` with no notifications, in a different field." }
        ]
      } }

  ],

  takeaways: [
    "**Two handlers replace the decorators:** `list_tools` returns the tool list and `call_tool` dispatches by name, so you write every schema and every dispatch yourself.",
    "**The measured differences are all the same fact — nothing is decided for you:** your version rather than the SDK's, `listChanged=True` because you asked, no resources capability because you registered none, and 3 of 3 parameter descriptions because you wrote the schema.",
    "**The 0-of-3 against 3-of-3 is not an argument for going lower.** `Annotated` with `Field` on FastMCP also gives 3 of 3, with less code — the real reasons are versions, notifications, dynamic lists and multiple transports.",
    "**`InitializationOptions` is what FastMCP was assembling silently**, and writing it once makes clear that capabilities are claims nothing verifies.",
    "**`get_capabilities` reports what you registered, not what works.** An empty or raising `list_resources` handler still advertises the resources capability.",
    "**`NotificationOptions(tools_changed=True)` becomes `listChanged=True` in the handshake**, and then sending the notifications is on you.",
    "**Notifications are per session.** There is no broadcast, so a server with six clients notifies six sessions — notifying only the one you are handling tells one client in six.",
    "**A dynamic tool list is the common reason to drop down**, because `@mcp.tool()` registers at import time while `list_tools` is called per request.",
    "**For consumers, notifications mean the tool list is not a constant** — which is why a tool filter must be an allow-list rather than a deny-list.",
    "**Start with FastMCP and `Annotated`;** go lower for versions, notifications, dynamic lists or two transports from one process.",
    "**Write a low-level server once anyway**, because the shapes on the wire are these whichever API produced them."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "The low-level server reported 3 of 3 parameter descriptions and the FastMCP one reported 0 of 3. What is the right conclusion?",
        options: [
          "Hand-written schemas are better, so prefer the low-level API",
          "The FastMCP server used a Google-style docstring, which contributes nothing to the schema — with `Annotated` and `Field` it also reaches 3 of 3, for less code",
          "FastMCP cannot produce parameter descriptions",
          "The low-level API validates arguments better"
        ],
        answer: 1,
        why: "Hand-written schemas are always complete because nothing is generated; generated ones are complete if you use the right annotations. The genuine reasons to drop a layer are your own version, notifications, a dynamic tool list, and serving two transports."
      },
      {
        stem: "A low-level server registers a `list_resources` handler that returns an empty list. What has it advertised?",
        options: [
          "Nothing — an empty list means no capability",
          "The resources capability, to every client, because `get_capabilities` derives the set from which handlers are registered rather than from what they do",
          "Only the listChanged flag",
          "A capability that is automatically disabled when the list is empty"
        ],
        answer: 1,
        why: "Registration is the signal, not behaviour — a handler that raises still advertises it too. A client that read the flags may now build an interface for resources you do not have, which is the same error as declaring listChanged with no notifications."
      },
      {
        stem: "A server with six connected clients adds a tool and sends a list-changed notification from the handler it is currently in. What happens?",
        options: [
          "All six clients re-fetch the list",
          "One client is told — notifications are sent on a session, and there is no broadcast in the protocol",
          "The notification is queued for all sessions automatically",
          "Nothing, unless listChanged was declared as False"
        ],
        answer: 1,
        why: "`send_notification` is a method on a session, so a server holding several must iterate them. Telling one client in six is arguably worse than telling none, because the fleet is now inconsistent in a way nothing reports."
      },
      {
        stem: "Why can the decorator API not produce a tool list that depends on the caller's entitlements?",
        options: [
          "Because decorators cannot be async",
          "`@mcp.tool()` registers at import time, so the set is fixed before any client connects — whereas a low-level `list_tools` is a function called per request",
          "Because FastMCP caches the tool list",
          "It can, using a decorator argument"
        ],
        answer: 1,
        why: "This is the most common genuine reason to drop a layer. A `list_tools` function can consult configuration, a feature flag or the connection's context, and return a different list each time it is asked."
      },
      {
        stem: "Why should a consumer's tool filter be an allow-list rather than a deny-list?",
        options: [
          "Allow-lists are faster to evaluate",
          "Because a server may legitimately add tools mid-connection and notify, so a deny-list only protects against the tools that existed when it was written",
          "Because deny-lists are not supported by the protocol",
          "Because allow-lists survive a reconnect"
        ],
        answer: 1,
        why: "The notification mechanism is exactly what makes the tool list non-constant. Seeing it from the server side makes the consumer-side rule concrete rather than merely cautious, which is where lesson 4.1 picks it up."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "When would you use the low-level Server API instead of the decorators?",
        strong: "Four cases. A dynamic tool list, since @mcp.tool() registers at import time while list_tools is a function called per request — that is the common one, for entitlement-dependent tools. Declaring tools_changed and sending notifications. Setting my own version in the handshake, which FastMCP has no parameter for. And serving two transports from one process, since I own the run call. For everything else the decorators plus Annotated are less code and just as expressive.",
        answer: [
          { t: "p", text: "Naming the import-time registration is the mechanism behind the main case, and it is what makes the answer concrete rather than a list." },
          { t: "p", text: "Explicitly declining to use it for schema quality is a good sign, because the obvious-looking argument — hand-written schemas are richer — is answered by using the right annotations." }
        ]
      },
      {
        level: "advanced",
        q: "What does get_capabilities actually report?",
        strong: "Which handlers you registered, combined with the notification options you pass — not what those handlers do. So an empty list_resources handler still advertises the resources capability, and so does one that raises. The practical rule is to register only what you implement, because advertising a capability you cannot serve is the same mistake as declaring listChanged and never notifying.",
        answer: [
          { t: "p", text: "The registration-not-behaviour distinction is the whole question, and it is the kind of thing only someone who has written the options object by hand tends to know." },
          { t: "p", text: "Connecting it back to the listChanged problem shows the general principle: every capability flag is a promise to a client that will build on it, and an unkept promise is worse than an absent one because nothing errors." }
        ]
      },
      {
        level: "mid",
        q: "What does writing InitializationOptions by hand teach you?",
        strong: "That the handshake is a set of claims and nothing verifies them. You assert your name, your version, your instructions and your capabilities, and the client believes all of it. Which is the same realisation from the consumer's side: when you connect to someone else's server, everything you learn about it in the handshake is something it chose to tell you.",
        answer: [
          { t: "p", text: "The pivot to the consumer's perspective is what makes this more than an API-trivia answer, and it is the bridge to the security module." },
          { t: "p", text: "A good addition is that this is why the useful change signals are the negotiated revision, the flags and a hash of the tool list rather than the version string — the first three are harder to get wrong by accident." }
        ]
      }
    ]
  }
});
