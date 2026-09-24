/* ============================================================================
   LESSON 8.2 — ADK as MCP Client; ADK as MCP Server
   The discovered tools, the executed call and the filtered toolset are output
   from scratchpad/adk/m1.py talking to a real FastMCP server over stdio
   (google-adk 2.9.2 + mcp).
   ========================================================================= */
EC.receiveLesson({
  id: "8.2",

  lede: "**Consuming an MCP server in ADK is one object.** `McpToolset` is a toolset like any other (lesson 4.6), so a server's tools become your agent's tools — discovered at runtime, declared to the model, called, filtered and closed through machinery you already know. The direction people forget is the other one: your own agent's tools can be published as an MCP server, so the fraud-check function three teams keep asking you for becomes something they consume rather than reimplement. This lesson runs both directions against a real server.",

  objectives: [
    "Connect an agent to an MCP server over stdio and over HTTP",
    "Filter and prefix a server's tools, and say why the allow-list matters",
    "Read the result an MCP tool returns and handle its shape",
    "Manage a toolset's connection lifecycle correctly",
    "Publish your own tools as an MCP server, and decide when that is the right move"
  ],

  prerequisites: ["8.1", "4.6"],

  blocks: [

    { t: "h2", n: "01", text: "Connecting", id: "connecting" },

    {"kind": "steps", "title": "What one McpToolset entry actually does", "caption": "Executed against a FastMCP server over stdio. Steps 2 and 5 are the protocol; everything else is the agent behaving exactly as it would with a local function.", "items": [{"label": "Connect", "sub": "spawn the process, or open the HTTP session", "tone": "violet"}, {"label": "ListTools", "sub": "names, descriptions and JSON Schemas", "tone": "accent"}, {"label": "Filter", "sub": "tool_filter allow-list, resolved per request", "tone": "crit"}, {"label": "Declare", "sub": "each becomes a function declaration for the model"}, {"label": "CallTool", "sub": "name and arguments cross the wire", "tone": "accent"}, {"label": "Envelope back", "sub": "content list + isError", "tone": "good"}], "t": "diagram", "id": "dg-8_2-01-0"},



    { t: "code", lang: "python", title: "m1.py — a stdio server, discovered and used",
      code: `from google.adk.tools.mcp_tool import McpToolset, StdioConnectionParams
from mcp import StdioServerParameters

toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command=sys.executable, args=["mcp_server.py"]),
        timeout=30,
    )
)

agent = LlmAgent(name="finance", model=MODEL, tools=[toolset],
                 instruction="Use the finance tools.")`,
      caption: "`tools=[toolset]` — one entry for a whole server. The agent never names an individual MCP tool." },

    { t: "out", text: `tools discovered from the MCP server:
  convert: Converts an amount between two currencies.
     params: {'properties': {'amount': {'type': 'number'}, 'frm': {'type': 'string'}, 'to': {'type': 'string'}}, 'required': [...]}
  vat: Returns VAT for an amount in a country.
     params: {'properties': {'amount': {'type': 'number'}, 'country': {'type': 'string'}}, 'required': ['amount', 'country']}

running a turn that calls an MCP tool:
  call: convert {'amount': 100, 'frm': 'GBP', 'to': 'USD'}
  result: {'content': [{'type': 'text', 'text': '{\\n  "amount": 127.0, "currency": "USD", "rate": 1.27\\n}'}], 'isError': False}
  answer: 100 pounds is 127 US dollars.` },

    { t: "p", text: "The model's function call is indistinguishable from a local one — same name, same arguments, same event in the log. The only thing that betrays the boundary is the result envelope, and the `127.0` where the server computed a number. Everything else you learned in module 4 applies without modification, which is the point of implementing MCP as a toolset rather than as a special case." },

    { t: "table", head: ["Transport", "Connection params", "When"],
      rows: [
        ["stdio", "`StdioConnectionParams(server_params=StdioServerParameters(command=…, args=[…]))`", "Local servers you spawn — filesystem, git, a CLI wrapper"],
        ["SSE", "`SseConnectionParams(url=…)`", "An HTTP server using server-sent events"],
        ["Streamable HTTP", "`StreamableHTTPConnectionParams(url=…)`", "The newer HTTP transport; prefer it for a hosted server"]
      ] },

    { t: "h2", n: "02", text: "Filtering", id: "filtering" },

    { t: "code", lang: "python", title: "An allow-list, executed",
      code: `filtered = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(command=sys.executable, args=["mcp_server.py"]),
        timeout=30),
    tool_filter=["vat"])
print([t.name for t in await filtered.get_tools()])` },

    { t: "out", text: "   ['vat']" },

    { t: "p", text: "The server still offers both tools; the agent sees one. `tool_filter` takes a list of names or a predicate, and the predicate form is what you want when the allowed set depends on the user — an operator gets the write tools, everybody else does not, decided per request because `get_tools` is called per request." },

    { t: "callout", kind: "good", title: "Allow-list, never deny-list",
      body: [{ t: "p", text: "A deny-list says which of today's tools you refuse. The server can add a tool tomorrow, and a deny-list silently admits it — into your agent, described by someone else, callable by a model. An allow-list of names admits nothing you have not read. This is the single most valuable line of configuration in an MCP integration, and it costs you a list." }] },

    { t: "code", lang: "python", title: "Prefixing, when two servers collide",
      code: `jira = McpToolset(connection_params=jira_params, tool_name_prefix="jira")
github = McpToolset(connection_params=gh_params, tool_name_prefix="gh")
# search -> jira_search and gh_search`,
      caption: "Two servers both offering `search` is common, and the model cannot choose between two identical names. Prefixing also makes traces readable — `jira_search` in a log tells you where the call went." },

    { t: "h2", n: "03", text: "Lifecycle", id: "lifecycle" },

    {"kind": "timeline", "title": "Where the toolset should live", "caption": "Construct once for the process and close on shutdown. A service that builds a toolset per request without closing it leaks a child process per request — which presents as memory exhaustion hours later with nothing in the agent logs.", "span": 10, "tick": 2, "lanes": [{"label": "Connection", "bars": [[0, 10, "one spawned process for the process lifetime", "violet"]]}, {"label": "get_tools", "bars": [[1, 1.6, "req 1", "accent"], [3.4, 4, "req 2", "accent"], [6, 6.6, "req 3", "accent"], [8.4, 9, "req 4", "accent"]]}, {"label": "close()", "bars": [[9.6, 10, "shutdown", "good"]]}], "t": "diagram", "id": "dg-8_2-03-1"},



    { t: "p", text: "A toolset holds a connection: a spawned process for stdio, an HTTP session otherwise. `BaseToolset` therefore has a `close`, and it is not decorative — a long-running service that constructs toolsets per request and never closes them accumulates child processes until something gives out." },

    { t: "code", lang: "python", title: "Where the toolset should live",
      code: `# Module scope: one connection for the process lifetime.
FINANCE = McpToolset(connection_params=finance_params, tool_filter=["convert", "vat"])

agent = LlmAgent(name="finance", model=MODEL, tools=[FINANCE])

# On shutdown — a plugin's close hook is a good home (lesson 6.2).
await FINANCE.close()`,
      caption: "Constructing the toolset once and closing it on shutdown is right for almost every deployment. Per-request construction is for the rare case where the connection itself must carry the user's credentials." },

    { t: "callout", kind: "trap", title: "The server is a dependency with an uptime",
      body: [{ t: "p", text: "Your agent now fails when someone else's process fails, and the failure surfaces during `get_tools` — while the model request is being assembled, before the model has said anything. Decide what should happen: a missing toolset means the agent quietly loses a capability, which is often better than a failed turn, but only if the instruction does not promise that capability. Test it by killing the server mid-conversation, because you will find out eventually and it is cheaper to find out now." }] },

    { t: "h2", n: "04", text: "The other direction: publishing a server", id: "publishing" },

    {"kind": "flow", "title": "Both directions, one implementation", "caption": "Nothing stops the same function being an ADK function tool in your agent and an MCP tool in your server — one implementation, one set of tests, two consumers.", "cols": 3, "nodes": [{"id": "f", "label": "Your function", "sub": "check_fraud(order_id)", "tone": "good"}, {"id": "a", "label": "Function tool", "sub": "in your own agent", "tone": "accent"}, {"id": "m", "label": "MCP server", "sub": "@mcp.tool()", "tone": "violet"}, {"id": "o", "label": "Other teams", "sub": "any framework, any language", "tone": "warn"}], "edges": [["f", "a"], ["f", "m"], ["m", "o"]], "t": "diagram", "id": "dg-8_2-04-2"},



    { t: "p", text: "Everything so far treats MCP as a way to get tools in. It is equally a way to send tools out. If your team owns a capability that other teams keep asking for — a fraud check, a pricing calculation, a customer lookup with the right joins — wrapping it in an MCP server means they consume it instead of reimplementing it, whatever framework they use." },

    { t: "code", lang: "python", title: "A server in a dozen lines",
      code: `from mcp.server.fastmcp import FastMCP

mcp = FastMCP("finance")

@mcp.tool()
def convert(amount: float, frm: str, to: str) -> dict:
    """Converts an amount between two currencies."""
    ...

@mcp.tool()
def vat(amount: float, country: str) -> dict:
    """Returns VAT for an amount in a country."""
    ...

if __name__ == "__main__":
    mcp.run(transport="stdio")`,
      caption: "This is the exact server the traces above talk to. The docstring becomes the tool description and the type hints become the JSON Schema — the same contract ADK generates for a function tool in lesson 4.1." },

    { t: "callout", kind: "insight", title: "Write the function once, expose it twice",
      body: [{ t: "p", text: "Nothing stops the same function being an ADK function tool in your agent and an MCP tool in your server — one implementation, one set of tests, two consumers. That is the version of this idea worth adopting: not \"should we do MCP\" but \"this logic has more than one caller, so it should not live inside one agent\"." }] },

    { t: "diagram", kind: "compare", title: "Which direction do you need?",
      caption: "Most teams do the first for a long time before they need the second. Do the second when the third team asks for the same capability.",
      columns: [
        { title: "Consume — McpToolset", tone: "accent", items: ["Someone else has the integration", "Vendor or community servers", "One object, filtered", "You inherit their tool quality"] },
        { title: "Publish — an MCP server", tone: "violet", items: ["You own a capability others want", "Cross-framework, cross-team", "Your tests, your versioning", "You inherit their support burden"] }
      ] },

    { t: "callout", kind: "tradeoff", title: "When not to publish",
      body: [{ t: "p", text: "A server is a product: it needs versioning, a deprecation policy, documentation, and someone to answer when a consumer's agent starts calling it oddly. If the capability has one consumer, a shared Python package is less work and easier to change. Publish when the consumers are on different stacks or in different teams, and when the interface has settled enough that you would not be embarrassed to freeze it." }] },

    { t: "h2", n: "05", text: "Security, briefly", id: "security" },

    { t: "dl", items: [
      ["The server acts with its own credentials", "Whatever token it holds is what every call uses, regardless of which user is talking to your agent. If answers should differ per user, the server needs the user's identity — and most do not accept one."],
      ["Descriptions are untrusted text", "Tool names and descriptions from someone else's process are placed in your prompt. A compromised server can put instructions there. Lesson 9.2 covers the defence."],
      ["A stdio server is executed code", "Same trust decision as a dependency. Pin it, read it, and never let user input influence the command."],
      ["Filter first, review after", "An allow-list you can justify in a pull request is the control that actually holds when the server changes."]
    ] },

    { t: "exercise", kind: "practice", title: "Both directions, in one afternoon", difficulty: "advanced", minutes: 32,
      prompt: "Write a FastMCP server with three tools, one of which is destructive-sounding (delete_record). Connect an ADK agent to it over stdio, list the discovered tools, and run a turn that calls a safe one. Then add a tool_filter that excludes the destructive tool and confirm the model can no longer call it even when the user asks directly. Finally, add a second toolset pointing at the same server with a prefix, and confirm the names do not collide.",
      hints: [
        "Docstrings become descriptions — write them as the model will read them.",
        "Ask the agent directly to delete something and confirm it cannot, rather than assuming.",
        "Close both toolsets at the end and watch the child processes exit."
      ],
      solution: {
        notes: [
          { t: "p", text: "Asking the agent to delete something after filtering is the part worth doing properly. The model has no declaration for the tool, so it cannot emit a call for it — it will say it lacks that capability. That is a categorically stronger guarantee than an instruction saying not to, and it is the same argument as lesson 4.7: not giving the agent a tool beats telling it not to use one." },
          { t: "p", text: "Watching the processes exit on `close` makes the lifecycle concrete. A service that constructs toolsets per request without closing them leaks a process per request, which presents as memory exhaustion hours later with nothing in the agent logs to explain it." }
        ]
      } }

  ],

  takeaways: [
    "`McpToolset` is an ordinary toolset: `tools=[toolset]` brings a whole server's tools to the agent.",
    "Three transports — stdio for local servers you spawn, SSE and streamable HTTP for hosted ones.",
    "`tool_filter` should be an allow-list, because the server can add tools without telling you.",
    "`tool_name_prefix` prevents collisions between servers and makes traces legible.",
    "Toolsets hold connections: construct once, close on shutdown, and expect failures during `get_tools`.",
    "Publishing your own MCP server turns a capability other teams keep rebuilding into one they consume."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How many entries does a five-tool MCP server add to an agent's tools list?",
      options: ["Five", "One — the toolset", "One per transport", "None; they are injected at runtime"],
      answer: 1,
      why: "A toolset is a single entry that expands into many tools when `get_tools` is called during request assembly. That is what lets the set vary per user and lets a remote server change what it offers without a redeploy of your agent." },
    { stem: "Why is a tool_filter allow-list better than a deny-list?",
      options: ["It is faster", "A server can add tools later, which a deny-list silently admits", "Deny-lists are not supported", "It reduces token usage"],
      answer: 1,
      why: "A deny-list enumerates what you refuse today. Tomorrow's new tool is not on it, so it arrives in your agent — described by someone else and callable by the model — without anyone deciding to allow it. An allow-list admits only what you have read." },
    { stem: "Your agent's MCP server process dies mid-conversation. Where does the failure appear?",
      options: ["When the model calls a tool", "During get_tools, while the model request is being assembled", "At agent construction", "It does not — the toolset reconnects silently"],
      answer: 1,
      why: "Tools are resolved per request, so the connection is exercised before the model is called at all. Deciding what should happen there is a design choice: losing a capability quietly is often better than failing the turn, provided the instruction does not promise the capability." },
    { stem: "When is publishing your own MCP server the right move?",
      options: ["Whenever you have tools", "When several teams on different stacks want the same capability", "Instead of writing function tools", "To improve latency"],
      answer: 1,
      why: "A server is a product with versioning, documentation and a support burden. With one consumer on your own stack, a shared package is less work and easier to change. Publish when the consumers are on different stacks or teams and the interface has settled enough to be worth freezing." }
  ] },

  interview: { title: "Interview", sub: "MCP in ADK questions", questions: [
    { level: "Core", q: "How do you use an MCP server from an ADK agent?",
      strong: "Construct an McpToolset with the right connection params and pass it in `tools` — it is one entry for the whole server.",
      answer: [{ t: "p", text: "Pick the transport — `StdioConnectionParams` for a server you spawn, SSE or streamable HTTP for a hosted one — and pass the toolset in the agent's tools list. ADK lists the server's tools when it assembles each model request and turns each one into a function declaration, so from the model's point of view they are ordinary tools with ordinary names and arguments. In practice I always add a `tool_filter` allow-list and, where more than one server is involved, a `tool_name_prefix`, because two servers offering `search` is common and a prefixed name is also what makes a trace readable." }] },
    { level: "Core", q: "What has to be managed that a local function tool does not?",
      strong: "A connection with a lifecycle, and a dependency whose uptime is not yours.",
      answer: [{ t: "p", text: "The toolset holds a spawned process or an HTTP session, so it should be constructed once for the process and closed on shutdown; constructing one per request without closing leaks a process per request, which shows up as memory exhaustion with nothing in the agent logs. The other half is availability — the server can be down, and the failure surfaces during tool resolution, before the model has said anything. I decide deliberately whether that means the agent loses a capability quietly or the turn fails, and I test it by killing the server mid-conversation rather than waiting to discover it." }] },
    { level: "Senior", q: "When would you build an MCP server rather than a function tool?",
      strong: "When the capability has consumers beyond this agent — other teams, other stacks — and the interface has settled.",
      answer: [{ t: "p", text: "A function tool lives inside one agent. The moment the same logic is wanted by a second agent in another team, or by something that is not ADK at all, the choice is between a shared library and a server. A library is cheaper and easier to change, so I would reach for it first and only move to a server when the consumers are on different stacks or when I want a network boundary — different credentials, different deployment cadence, an audit point. What I would not underestimate is that publishing makes it a product: versioning, deprecation, documentation, and somebody answering when a consumer's agent starts calling it in an odd way. The nice part is that the function does not have to choose — the same implementation can be a function tool here and an MCP tool in the server, with one set of tests." }] }
  ] }
});
