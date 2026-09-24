/* ============================================================================
   LESSON 8.1 — MCP: The Protocol and Its Architecture
   The discovery trace, the request types and the result envelope are executed
   output from scratchpad/adk/m1.py against a real FastMCP server over stdio,
   on google-adk 2.9.2 + mcp.
   ========================================================================= */
EC.receiveLesson({
  id: "8.1",

  lede: "**MCP exists because every team was writing the same integration twice.** Your company has a Jira wrapper for one agent framework and another for the next; the vendor whose API you want has none. The Model Context Protocol makes the integration a *server* instead — a process that advertises tools, resources and prompts over a standard wire format, which any client can consume without knowing what framework it was written for. This lesson is the protocol itself: what a server offers, how discovery works, what a call and its result look like, and which of the two transports you should pick.",

  objectives: [
    "Describe the client–server architecture and who plays each role",
    "Name the three things a server can offer and say which one you will actually use",
    "Trace a discovery and a call through the protocol's request types",
    "Read an MCP result envelope and explain `isError`",
    "Choose between stdio and HTTP transports for a given server"
  ],

  prerequisites: ["4.6", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "Client, server, host", id: "architecture" },

    { t: "diagram", kind: "flow", title: "Who is who",
      caption: "Your agent is never the MCP server in this picture — it is the client. Being a server is a separate thing you can also do, and it is the second half of the next lesson.",
      cols: 3,
      nodes: [
        { id: "h", label: "Host", sub: "the application — your ADK process", tone: "accent" },
        { id: "c", label: "Client", sub: "one connection per server", tone: "good" },
        { id: "s", label: "Server", sub: "a process exposing tools", tone: "violet" },
        { id: "b", label: "The actual system", sub: "Jira, Postgres, the filesystem", tone: "warn" }
      ],
      edges: [["h", "c"], ["c", "s", "JSON-RPC"], ["s", "b"]] },

    { t: "p", text: "The server is a separate process doing the integration work. It might be maintained by the vendor, by another team, or by you; what matters is that it is not part of your agent, and that swapping your agent framework does not touch it. That separation is the entire value proposition, and it is why MCP spread quickly — a server written once is consumable by every client that speaks the protocol." },

    { t: "h2", n: "02", text: "Three things a server offers", id: "offers" },

    { t: "dl", items: [
      ["Tools", "Functions the model can call, with JSON-Schema parameters. This is what you will use ninety per cent of the time, and it maps exactly onto ADK's tool concept."],
      ["Resources", "Readable content the client can fetch by URI — a file, a record, a document. Closer to a GET than to a function call, and typically attached to context rather than invoked by the model."],
      ["Prompts", "Reusable prompt templates the server suggests, parameterised. The least-used of the three, and the one most servers omit entirely."]
    ] },

    { t: "callout", kind: "note", title: "In practice, MCP means tools",
      body: [{ t: "p", text: "Most servers expose tools and nothing else, and ADK's `McpToolset` is named for that reality — it is a toolset (lesson 4.6), so a server's tools become tools on your agent and everything you know about declarations, filtering and error handling applies unchanged. Resources and prompts exist in the specification and are worth knowing about when you read a server's documentation, but they are not what you will be wiring up on Monday." }] },

    { t: "h2", n: "03", text: "Discovery, traced", id: "discovery" },

    { t: "p", text: "A client does not know what a server offers until it asks. The trace below is from a real FastMCP server connected over stdio — the log lines are the *server* reporting the requests it received." },

    { t: "out", text: `INFO  Processing request of type ListToolsRequest
tools discovered from the MCP server:
  convert: Converts an amount between two currencies.
     params: {'properties': {'amount': {'title': 'Amount', 'type': 'number'},
                             'frm': {'title': 'Frm', 'type': 'string'},
                             'to': {'title': 'To', 'type': 'string'}}, 'required': [...]}
  vat: Returns VAT for an amount in a country.
     params: {'properties': {'amount': {'title': 'Amount', 'type': 'number'},
                             'country': {'title': 'Country', 'type': 'string'}}, 'required': ['amount', 'country']}

INFO  Processing request of type ListToolsRequest
INFO  Processing request of type CallToolRequest` },

    { t: "p", text: "Two request types do all the work: **`ListToolsRequest`** returns the catalogue with a JSON Schema per tool, and **`CallToolRequest`** invokes one. Notice `ListToolsRequest` appearing more than once — the client re-lists when it assembles a request, which is how a server that gains a tool at lunchtime is usable by an agent that started at nine. Discovery is a runtime activity, not a build-time one." },

    { t: "diagram", kind: "steps", title: "The life of one MCP tool call",
      caption: "Steps 2 and 5 are the protocol. Everything else is your agent behaving exactly as it would with a local function.",
      items: [
        { label: "Connect", sub: "spawn the process or open the HTTP session" },
        { label: "ListTools", sub: "server returns names, descriptions and JSON Schemas" },
        { label: "Declare", sub: "the client turns each into a function declaration for the model" },
        { label: "Model chooses", sub: "an ordinary function call, indistinguishable from a local tool" },
        { label: "CallTool", sub: "name and arguments cross the wire" },
        { label: "Result", sub: "a content list plus isError, back to the model" }
      ] },

    { t: "h2", n: "04", text: "The result envelope", id: "envelope" },

    { t: "out", text: `result: {'content': [{'type': 'text', 'text': '{\\n  "amount": 127.0,\\n  "currency": "USD",\\n  "rate": 1.27\\n}'}], 'isError': False}` },

    { t: "p", text: "This is what a tool result looks like after it has crossed MCP, and it is not the dictionary the server function returned. The payload is wrapped in a **content list** — the same shape as a message, so a tool can return text, images or several parts — and the server's dictionary has been serialised to a JSON string inside a text part. Your agent sees the envelope, not the original object." },

    { t: "callout", kind: "trap", title: "Two layers of JSON, and a float where you had an int",
      body: [{ t: "p", text: "A model reading that result has to look inside a string inside a list to find `amount`, which it does well enough but not for free. More subtly, the currency example returned `127.0` — the server's Python numbers went through JSON and came back as floats, exactly as the A2A example in lesson 8.4 turns `42` into `42.0`. If your downstream code does an integer comparison or formats a count, that is a bug that only appears once the tool moves behind a protocol. Assume everything crossing a boundary is JSON-shaped, and coerce deliberately." }] },

    { t: "p", text: "`isError` is the other half. A failing MCP tool does not raise an exception into your process — it returns a result with `isError: true` and an explanatory content list. That is the same design as the retrieval tools in lesson 7.1 and for the same reason: the model should be able to read the failure and respond to it, not have the turn end in a stack trace." },

    { t: "h2", n: "05", text: "Two transports", id: "transports" },

    { t: "diagram", kind: "compare", title: "stdio or HTTP",
      caption: "The protocol is identical; only the pipe differs. ADK expresses the choice as which connection-params class you construct.",
      columns: [
        { title: "stdio", tone: "accent", items: ["Your process spawns the server", "Pipes over stdin/stdout", "One server process per client", "No network, no auth to configure", "Local tools: filesystem, git, a database on the same box"] },
        { title: "HTTP (SSE / streamable)", tone: "violet", items: ["The server runs somewhere already", "One server serves many clients", "You configure the URL and credentials", "Network policy and TLS apply", "Shared, hosted or vendor-run servers"] }
      ] },

    { t: "callout", kind: "warn", title: "A stdio server is a process you are executing",
      body: [{ t: "p", text: "`StdioConnectionParams` takes a command and arguments, and ADK runs them. That is arbitrary code execution on your machine or in your container, with your permissions, defined by a config file. It is fine for a server you wrote or one from a source you trust as much as a dependency — and it is the same trust decision as adding a package, which people make far more carefully. Pin the version, read what it does, and never take the command from anything a user can influence." }] },

    { t: "h2", n: "06", text: "What MCP does not solve", id: "limits" },

    { t: "dl", items: [
      ["Authorisation", "The protocol carries your call; it does not decide whether you should be allowed to make it. A server with your Jira token can do whatever that token can do, on behalf of whoever is talking to the agent (lesson 9.1)."],
      ["Tool quality", "A server's tool descriptions become your model's routing information. A badly described tool is as bad over MCP as it is locally, and you cannot fix it without forking the server — which is why `tool_filter` matters."],
      ["Trust", "Tool descriptions are text from someone else's process, injected into your prompt. A malicious or compromised server can put instructions there. Lesson 9.2 treats this properly; for now, note that adding an MCP server is a trust decision, not a configuration change."],
      ["Latency", "Every call is a process boundary at minimum and a network hop at worst. A tool the model calls in a tight loop is a tool you might want locally."]
    ] },

    { t: "exercise", kind: "practice", title: "Read a server before you trust it", difficulty: "core", minutes: 20,
      prompt: "Pick an MCP server you would plausibly use — a filesystem, git or database one. Without connecting it to an agent, answer: which tools does it expose, what are their exact parameters, what can each one modify, what credentials does it need, and what would the worst outcome be if a user could choose the arguments freely? Then decide which subset you would allow through a tool_filter and write the one-sentence justification you would put in the pull request.",
      hints: [
        "The tool list is the security surface — a read-only subset is usually most of the value.",
        "Look specifically for tools that write, delete or execute.",
        "If you can run it, list its tools directly rather than trusting the README."
      ],
      solution: {
        notes: [
          { t: "p", text: "The recurring finding is that a server offers far more than you need: a filesystem server with read, write, move and delete when you wanted to read one directory, or a database server with an arbitrary-SQL tool when you wanted three queries. The tool list is your security surface, and `tool_filter` is how you shrink it — an allow-list of names, not a deny-list, because the server can add tools whenever it likes." },
          { t: "p", text: "The pull-request sentence is the real exercise. 'We are adding an MCP server that can delete files as the application user, filtered to read_file and list_directory' is a sentence a reviewer can act on. 'Adding MCP support for filesystem access' is how a delete tool reaches production without anyone deciding to allow it." }
        ]
      } }

  ],

  takeaways: [
    "MCP separates the integration from the agent: a server is a process any client can consume.",
    "Servers offer tools, resources and prompts — in practice, almost always tools.",
    "`ListToolsRequest` and `CallToolRequest` do the work, and listing happens at runtime, repeatedly.",
    "Results come back as a content list with `isError`, not as the server's own return value.",
    "Values crossing the protocol are JSON-shaped — integers can arrive as floats.",
    "stdio means your process executes the server; HTTP means a shared server with real auth. Both are trust decisions."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In an ADK application consuming a Jira MCP server, what is your agent?",
      options: ["The server", "The client", "Both", "Neither — the model is the client"],
      answer: 1,
      why: "The host application holds a client connection per server, and the server is the separate process doing the Jira integration. Exposing your own agent's tools as a server is a different exercise, covered in the next lesson, and it is not what consuming a server makes you." },
    { stem: "Why does the client send ListToolsRequest more than once?",
      options: ["The first request always fails", "Tool lists are resolved per request, so a server can change what it offers", "To check the connection is alive", "Once per tool"],
      answer: 1,
      why: "Toolsets resolve their tools when a model request is assembled rather than at construction, which is what lets a remote server gain or lose a tool without restarting your agent. The executed trace shows the server logging the same request type repeatedly for one turn." },
    { stem: "An MCP tool fails. What does your agent receive?",
      options: ["A Python exception", "A result with isError true and explanatory content", "None", "The turn ends"],
      answer: 1,
      why: "Failures come back inside the result envelope rather than as exceptions, so the model can read what went wrong and respond — apologise, try different arguments, or tell the user. This is the same design principle as retrieval misses returning a message instead of raising." },
    { stem: "What is the main risk specific to a stdio MCP server?",
      options: ["Higher latency than HTTP", "Your process executes a command from configuration, with your permissions", "It cannot be filtered", "It only supports one tool"],
      answer: 1,
      why: "`StdioConnectionParams` takes a command that ADK runs, so adding a server is running someone else's code in your container as your user. That is the same trust decision as adding a dependency, and it deserves the same scrutiny — pinned versions, a read of what it does, and never a command influenced by user input." }
  ] },

  interview: { title: "Interview", sub: "MCP questions", questions: [
    { level: "Core", q: "What problem does MCP solve?",
      strong: "Integrations written once as a server, consumable by any client, instead of once per framework.",
      answer: [{ t: "p", text: "Before it, every tool integration was written against a specific framework, so the same Jira or Postgres wrapper got rebuilt for each one and vendors had to pick which ecosystems to support. MCP makes the integration a separate process that advertises its tools over a standard wire format, so one server serves every client that speaks the protocol and swapping frameworks does not touch it. In ADK it arrives as a toolset, which is the neat part — a server's tools become ordinary tools on the agent, and everything about declarations, filtering and errors works the way it already did." }] },
    { level: "Core", q: "What does an MCP tool result look like?",
      strong: "A content list plus an isError flag — not the server function's return value.",
      answer: [{ t: "p", text: "The payload is wrapped: `{'content': [{'type': 'text', 'text': '…'}], 'isError': False}`, where the server's own dictionary has usually been serialised into a JSON string inside a text part. So the model is reading JSON inside a content list, which works but is two layers deep. Two practical consequences I watch for. Failures arrive as `isError: true` with explanatory content rather than as exceptions, which is deliberate — the model can respond to it. And everything has been through JSON, so integers come back as floats; I saw `127.0` where the server returned a computed number, and that is the sort of thing that breaks a format string long after the integration looked fine." }] },
    { level: "Senior", q: "Your team wants to add three MCP servers to a production agent. What do you ask for in review?",
      strong: "The tool list, an allow-list filter, the credentials each server holds, the transport, and who maintains it.",
      answer: [{ t: "p", text: "I would start from the tool list rather than the README, because that is the security surface and it is routinely larger than the use case — a filesystem server that can delete when we wanted to read, a database server with an arbitrary-SQL tool. So: an explicit `tool_filter` allow-list, named in the pull request, with a sentence saying what the agent can now do that it could not do yesterday. Then credentials: what token does each server hold, whose authority is it, and does the agent's user get to influence the arguments that reach it. Then transport — a stdio server means we execute a command in our container, which is a dependency decision and should be pinned and reviewed as one; an HTTP server means network policy, TLS and auth. Finally maintenance: a vendor server and a server written by a team that has since been reorganised are different risks. The thing I would push back on hardest is treating this as configuration. Tool descriptions from someone else's process end up in our prompt, so adding a server is closer to adding a dependency that can also talk to the model." }] }
  ] }
});
