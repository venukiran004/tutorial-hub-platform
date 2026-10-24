/* ============================================================================
   LESSON 5.2 — Consuming From Any Host
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "**The same server, three ways in: a JSON file a desktop host reads, a toolset object an agent framework hands to a model, and the client from the last lesson.** All three reduce to the same four decisions, and the interesting thing is how differently they expose them — one of them hides the allow-list entirely, which is why a server you would never add to a production service ends up on somebody's laptop.",

  objectives: [
    "Configure a stdio server in a desktop host's JSON",
    "Wire a server into an agent framework with a filter and a prefix",
    "Say which decisions each host surface exposes and which it hides",
    "Apply the same review question regardless of the host",
    "Decide what to do when a host gives you no filtering"
  ],

  prerequisites: ["5.1", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "A desktop host, via JSON", id: "desktop" },

    {"kind": "flow", "title": "A list of commands your machine runs, with no filter", "caption": "**Adding an entry is agreeing to run that command** — lesson 3.1's point about stdio, in the place people meet it most casually. `npx -y` with no version fetches and executes whatever that name resolves to today, which is the supply-chain shape of a rug pull. **And there is nowhere in this file to filter tools**, so the control lesson 4.1 identified as the effective one is simply absent: the remaining lever is the argument list, which is why `\"/Users/me/projects\"` is the entire access boundary for that server.", "cols": 3, "nodes": [{"id": "j", "label": "mcpServers in a JSON file", "sub": "StdioServerParameters, serialised", "tone": "accent"}, {"id": "c", "label": "command + args + env", "sub": "run at every host startup", "tone": "warn"}, {"id": "x", "label": "npx -y, no version", "sub": "whatever resolves today", "tone": "crit"}, {"id": "f", "label": "No tool filter anywhere", "sub": "every tool reaches the model", "tone": "crit"}, {"id": "a", "label": "So the args ARE the boundary", "sub": "one directory, not a home folder", "tone": "violet"}], "edges": [["j", "c"], ["c", "x"], ["j", "f"], ["f", "a"]], "t": "diagram", "id": "dg-5_2-01-0"},


    { t: "p", text: "Desktop hosts take a configuration file listing the servers to launch. The shape is consistent across hosts because it is the `StdioServerParameters` from lesson 5.1, serialised." },

    { t: "code", lang: "json", title: "the shape of the configuration",
      code: `{
  "mcpServers": {
    "finance": {
      "command": "python",
      "args": ["-m", "finance_server"],
      "env": { "RATES_API_KEY": "..." }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@scope/mcp-filesystem", "/Users/me/projects"]
    }
  }
}`,
      caption: "Not executed here — this is a host's own file rather than something the SDK reads, and the exact path and key names vary by host. **What matters is what it is:** a list of commands your machine will run, with arguments and environment, every time the host starts." },

    { t: "callout", kind: "trap", title: "This file is an execution list, and it has no allow-list",
      body: [
        { t: "p", text: "Two things follow. **First, adding an entry is agreeing to run that command** — lesson 3.1's point about stdio, in the place people meet it most casually. `npx -y` fetches and executes a package at startup, so the thing that runs tomorrow is whatever that name resolves to tomorrow, which is the supply-chain shape of the rug pull from lesson 4.1." },
        { t: "p", text: "**Second, there is nowhere in this file to filter tools.** Every tool the server offers is available to the model, which is precisely the control lesson 4.1 identified as the one that works. So the same server you would wire into a service behind a short allow-list arrives on a laptop with every tool exposed — and the mitigation available here is the argument list: scoping a filesystem server to one directory is doing the work the missing filter cannot." }
      ] },

    { t: "p", text: "Which makes the second entry above the one to read carefully: `\"/Users/me/projects\"` is the entire access boundary for that server. **Pointing it at a home directory instead would expose every file the user can read**, to any tool call the model is persuaded to make." },

    { t: "h2", n: "02", text: "An agent framework, via a toolset", id: "framework" },

    {"kind": "trace", "title": "The two controls, as constructor arguments", "caption": "**That is the real advantage of this surface: the allow-list and the prefix are in code, in version control, and visible in a pull request** where a reviewer can ask why a name is on the list. The same list buried in a configuration nobody reviews gives identical technical protection and far less assurance anyone considered it. **And note the last row:** `get_tools` is a live call at construction time, so a server that is down takes your agent with it and a slow one delays your startup.", "left": "argument", "codeW": 180, "vars": ["what it does", "why here"], "steps": [{"code": "tool_filter=['convert', 'vat']", "state": ["an allow-list, not a deny-list", "reviewable in a pull request"], "tone": "violet"}, {"code": "tool_name_prefix='finance'", "state": ["namespacing", "the three benefits from 5.1"], "changed": [0, 1], "tone": "good"}, {"code": "connection params", "state": ["command, args, env - pin the version", "same as any dependency"], "changed": [0, 1], "tone": "good"}, {"code": "await toolset.close()", "state": ["it owns a subprocess", "5.1's leak applies unchanged"], "changed": [0, 1], "tone": "crit"}, {"code": "get_tools at construction", "state": ["a live subprocess or network call", "a down server breaks startup"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-5_2-02-1"},


    { t: "p", text: "Agent frameworks wrap a connection in an object that produces tools in their own format. The names differ; the shape is consistent." },

    { t: "code", lang: "python", title: "what a framework's wrapper gives you",
      code: `# Illustrative of the shape -- the class name differs by framework.
toolset = McpToolset(
    connection=StdioConnectionParams(command="python", args=["-m", "finance_server"]),
    tool_filter=["convert", "vat"],        # the ALLOW-LIST, as a constructor argument
    tool_name_prefix="finance",            # the namespacing from lesson 5.1
)

agent = Agent(model=..., tools=[toolset])

# ...and at shutdown:
await toolset.close()`,
      caption: "**The two controls from lesson 4.1 are constructor arguments here**, which is the whole advantage of this surface over a JSON file: the allow-list and the prefix are in code, in version control, visible in a pull request, and a reviewer can ask why a name is on the list." },

    { t: "dl", items: [
      ["The filter is an allow-list", "List the tools you want, not the ones you do not. Lesson 2.4 showed why: a server can add a tool mid-connection, so a deny-list only covers what existed when it was written."],
      ["The prefix earns its place three times", "Collisions, legible traces, and the shadowing defence from lesson 4.1 — the same three reasons as `component_name_hook` in lesson 5.1."],
      ["The toolset owns a connection", "So it owns a subprocess, which means lesson 5.1's leak applies unchanged: construct it once at application startup, close it at shutdown, never per request."],
      ["`get_tools` can fail", "It is a network or subprocess call at agent-construction time. A server that is down takes your agent with it unless you handle that, and a server that is slow delays your startup."]
    ] },

    { t: "h2", n: "03", text: "The three surfaces, compared", id: "compared" },

    {"kind": "trace", "title": "The same server is a different risk in each column", "caption": "**A server with twenty tools, four of them destructive, behind a four-name allow-list is a reasonable thing to deploy; the same server in a desktop configuration exposes all twenty.** That is not an argument against desktop hosts — it is an argument for choosing servers differently depending on where they go. **For a laptop, prefer a server whose whole tool list you are comfortable with** and narrow its reach through its arguments; for a service, the allow-list lets you take a broader server and expose a slice.", "left": "decision", "codeW": 170, "vars": ["desktop JSON", "framework toolset", "your own client"], "steps": [{"code": "which tools", "state": ["NONE - no filtering", "tool_filter", "your allow-list"], "tone": "crit"}, {"code": "namespacing", "state": ["NONE", "tool_name_prefix", "component_name_hook"], "changed": [0, 1, 2], "tone": "crit"}, {"code": "pinning the version", "state": ["only if you pin the args", "connection params", "yours"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "connection lifetime", "state": ["the host's business", "yours - close it", "yours - a lifespan"], "changed": [0, 1, 2], "tone": "accent"}, {"code": "reviewable in a pull request", "state": ["only if the file is", "YES", "YES"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-5_2-03-2"},


    { t: "table",
      head: ["Decision", "Desktop JSON", "Framework toolset", "Your own client"],
      rows: [
        ["Which servers", "An entry in the file", "A constructor call", "A connect call"],
        ["Which tools", "**No filtering**", "`tool_filter`", "Your own allow-list"],
        ["Namespacing", "**None**", "`tool_name_prefix`", "`component_name_hook`"],
        ["What the server acts as", "`env`, per entry", "Connection params", "`StdioServerParameters`"],
        ["Pinning the version", "The `args`, if you pin them", "The connection params", "Yours"],
        ["Connection lifetime", "The host's business", "Yours — close it", "Yours — a lifespan"],
        ["Reviewable in a pull request", "Only if the file is in one", "**Yes**", "**Yes**"],
        ["Who sees the handshake", "The host", "The framework", "You"]
      ] },

    { t: "callout", kind: "insight", title: "The rows in bold are why the same server is a different risk in each column",
      body: [
        { t: "p", text: "A server with twenty tools, four of them destructive, behind a four-name allow-list in a framework is a reasonable thing to deploy. **The same server in a desktop configuration exposes all twenty**, and the only lever available is the command line." },
        { t: "p", text: "That is not an argument against desktop hosts — it is an argument for choosing servers differently depending on where they are going. For a laptop, prefer a server whose *whole* tool list you are comfortable with, and use its arguments to narrow its reach. For a service, the allow-list means you can take a broader server and expose a slice of it." }
      ] },

    { t: "h2", n: "04", text: "The review question, in every column", id: "review" },

    {"kind": "tree", "title": "The review question, in every column", "caption": "**Assuming the model does the worst thing available to it, what happens?** It survives the thing that defeats reading descriptions — the descriptions changing. **Note the second branch:** the worst tool that matters is the worst *reachable* one, which in a desktop configuration is every tool the server has rather than the ones you intended to use. The one-line version: connect the server you would be willing to leave connected while someone tries to talk your agent into misusing it.", "root": {"label": "Before connecting anything", "sub": "the same five questions, every surface", "tone": "accent", "children": [{"label": "What does the server act as?", "sub": "and for a desktop stdio server...", "tone": "crit", "children": [{"label": "'the person whose laptop it is'", "sub": "with all their file access", "tone": "crit"}]}, {"label": "What is the worst REACHABLE tool?", "sub": "not the worst you intend to use", "tone": "crit", "children": [{"label": "In a desktop config: all of them", "sub": "there is no filter", "tone": "crit"}]}, {"label": "Is anything irreversible?", "sub": "a delete, a payment, a deploy, a message sent", "tone": "violet", "children": [{"label": "Then the allow-list is not optional", "sub": "nor is an approval step", "tone": "violet"}]}, {"label": "Would you notice it changing?", "sub": "the rug pull", "tone": "warn", "children": [{"label": "A pinned version and a tool-list hash", "sub": "npx -y is the opposite of both", "tone": "warn"}]}]}, "t": "diagram", "id": "dg-5_2-04-3"},


    { t: "p", text: "Lesson 1.1 asked it and lesson 4.1 sharpened it, and it is the same question whichever surface you are using: **assuming the model does the worst thing available to it, what happens?**" },

    { t: "dl", items: [
      ["What does the server act as?", "A service account, a user's own token, an unscoped admin credential? For a stdio server launched by a host, the answer is “the person whose laptop it is”, with all their file access."],
      ["What is the worst tool on the list?", "Not the worst you intend to use — the worst that is *reachable*, which in a desktop configuration is every tool the server has."],
      ["Is anything irreversible?", "A delete, a payment, a deploy, a message sent. If yes, the allow-list and an approval step are not optional extras."],
      ["Would you notice a change?", "Lesson 4.1's rug pull. A pinned version and a hash of the tool list are the answers; `npx -y` with no version is the opposite of both."],
      ["Who can reach it?", "For stdio, only the host. For an HTTP server, whoever can route to the port — and lesson 3.2's checklist applies."]
    ] },

    { t: "callout", kind: "good", title: "The one-line version",
      body: [
        { t: "p", text: "**Connect the server you would be willing to leave connected while someone tries to talk your agent into misusing it.** Everything in modules 4 and 5 is an elaboration of that sentence, and it is a more useful test than reading the descriptions, because it survives the descriptions changing." }
      ] },

    { t: "h2", n: "05", text: "Where this leaves the course", id: "close" },

    {"kind": "layers", "title": "One design decision, five modules of consequence", "caption": "**The protocol itself is small: a handshake, three primitives, three transports and an error shape.** Everything that took five modules follows from one fact — a server's text enters a model's context, and a server's tools act with the server's own credentials. **So you are trusting someone else's prose inside your prompt and someone else's access behind your tool calls**, and every control in the course is an answer to one half of that sentence.", "items": [{"label": "The protocol", "sub": "a handshake, three primitives, three transports", "tone": "good", "side": "module 1"}, {"label": "The contract lives in the schema, not the docstring", "sub": "and errors are results that must not carry your exception text", "tone": "accent", "side": "module 2"}, {"label": "The transport decides what you are responsible for", "sub": "stdio gives isolation free; HTTP takes it back", "tone": "accent", "side": "module 3"}, {"label": "Publishing is a product, and identity is opt-in", "sub": "versions, logs, limits, deprecation by log lines", "tone": "violet", "side": "module 4"}, {"label": "The controls are all client-side code", "sub": "allow-list, prefix, pinned version, scoped credential", "tone": "violet", "side": "module 5"}, {"label": "And with one consumer you own both ends", "sub": "a shared library has none of these obligations", "tone": "teal", "side": "lesson 1.1"}], "t": "diagram", "id": "dg-5_2-05-4"},


    { t: "p", text: "The protocol itself is small: a handshake, three primitives, three transports and an error shape. Everything that took five modules is the consequence of one design decision — **that a server's text enters a model's context and a server's tools act with the server's own credentials.**" },

    { t: "dl", items: [
      ["Writing a server", "The contract lives in the schema rather than the docstring (2.2), errors are results rather than exceptions and must not carry your exception text (2.3), and the transport you choose decides what you are responsible for (3.1, 3.2)."],
      ["Publishing one", "It is a product: a version with a meaning, call logs, limits, and a deprecation procedure that ends when the log lines stop (4.4). And identity is available only if you put it there (4.2)."],
      ["Consuming one", "An allow-list, a prefix, a pinned version, and a scoped credential — all of it client-side code, which is where the controls were all along (4.1, 5.1)."],
      ["Deciding not to", "The question from 1.1 that never stops being the right first one: with one consumer and both ends yours, a shared library has none of these obligations."]
    ] },

    { t: "exercise", kind: "practice", title: "Review a real integration", difficulty: "core", minutes: 26,
      prompt: "Pick a third-party MCP server you would plausibly use. Write its configuration three ways: a desktop host JSON entry, a framework toolset with a filter and prefix, and your own client with a session group. For each, list which of the eight decisions in section 03 you have actually made and which the surface decided for you. Then answer the five review questions in section 04 for that server, and finish with a one-line verdict: would you leave it connected while someone tried to talk your agent into misusing it?",
      hints: [
        "Count the server's tools, then count how many you would actually allow.",
        "Check whether the server pins a version anywhere, or whether you would be fetching latest.",
        "The verdict is the deliverable; the three configurations are what make it informed."
      ],
      solution: {
        notes: [
          { t: "p", text: "The tool count is usually the surprise. A server you were going to add for one capability often has fifteen tools, and writing the allow-list is the moment you discover the other fourteen — which is also, per lesson 1.1, the moment you avoid the accuracy cost of fifteen declarations in every request." },
          { t: "p", text: "The version question is the one that changes behaviour for most people. A configuration that fetches the latest package at every startup has no pinning, no reproducibility and no defence against a changed tool list, and the fix is a version string in the arguments — the same discipline as any other dependency, applied to something that does not look like one." },
          { t: "p", text: "The verdict is deliberately uncomfortable to write down, and that is its value: it forces the assumption into the open. Most teams have never stated what they are assuming about a server they connected, and writing one line makes it reviewable by someone else." }
        ]
      } },

    { t: "h2", n: "06", text: "Finding servers, and naming the hosts", id: "finding" },

    {"kind": "flow", "title": "A registry is discovery, not review", "caption": "**A listing says a server exists and is described — not that anyone reviewed what its tools do or what credentials it holds.** And the rug pull from lesson 4.1 gets *easier* with a registry rather than harder, because the install is one line and the version is often implicit. **So a registry raises the value of the two controls that notice a server changing after you looked at it:** a pinned version, and a hash of the tool list. Treat it the way you treat a package index.", "cols": 3, "nodes": [{"id": "r", "label": "The MCP Registry", "sub": "finding a server is a lookup", "tone": "good"}, {"id": "n", "label": "Not a trust signal", "sub": "nobody reviewed the tools", "tone": "crit"}, {"id": "e", "label": "One-line install, implicit version", "sub": "the rug pull gets easier", "tone": "crit"}, {"id": "p", "label": "So pin the version", "sub": "and hash the tool list", "tone": "violet"}, {"id": "q", "label": "And section 04's questions still apply", "sub": "what it acts as, the worst reachable tool", "tone": "violet"}], "edges": [["r", "n"], ["n", "e"], ["e", "p"], ["p", "q"]], "t": "diagram", "id": "dg-5_2-06-5"},

    { t: "p", text: "Two practical things this course has referred to generically and should name." },

    { t: "dl", items: [
      ["The MCP Registry", "A catalogue of published servers, so finding one is a lookup rather than a search through repositories. It makes discovery easier and **it is not a trust signal** — a listing says a server exists and is described, not that anyone reviewed what its tools do or what credentials it holds. Every question in section 04 still applies to a server you found in a registry, and the pinning question applies harder, because a registry makes it easy to install something whose name you read once."],
      ["The agent frameworks, by name", "`McpToolset` in Google's ADK and the MCP adapters for LangChain and LangGraph are the two you are most likely to meet, and both have the shape in section 02: a connection, a tool filter and a prefix, constructed once and closed at shutdown. The names differ and the four decisions do not."],
      ["Desktop hosts", "Claude Desktop is the common one and the configuration shape in section 01 is shared by the others, including editor integrations. The thing that varies is where the file lives, not what it contains — and none of them, at the time of writing, offers a tool filter."]
    ] },

    { t: "callout", kind: "warn", title: "A registry listing is a discovery mechanism, not a review",
      body: [
        { t: "p", text: "The rug pull in lesson 4.1 gets easier rather than harder with a registry, because the install is one line and the version is often implicit. **So the registry raises the value of pinning a version and of hashing the tool list**, which are the two controls that notice a server changing after you looked at it." },
        { t: "p", text: "The useful habit: treat a registry the way you treat a package index. It tells you something exists and roughly what it claims to do. What it acts as, what its worst tool can reach, and whether you would notice it changing are still yours to establish." }
      ] },

  ],

  takeaways: [
    "**A desktop host's configuration is `StdioServerParameters` serialised to JSON** — a list of commands your machine runs at startup, with arguments and environment.",
    "**That file has nowhere to filter tools**, so every tool a server offers reaches the model — the control lesson 4.1 identified as the one that works is simply absent.",
    "**So the argument list is the access boundary on a desktop**: scoping a filesystem server to one directory is doing the work the missing filter cannot.",
    "**`npx -y` with no version fetches and executes whatever that name resolves to today**, which is the supply-chain shape of the rug pull.",
    "**A framework toolset puts the allow-list and the prefix in constructor arguments**, which is its real advantage: both are in code, in version control, and visible in a pull request.",
    "**A toolset owns a connection and therefore a subprocess**, so lesson 5.1's leak applies — construct once at startup, close at shutdown, never per request.",
    "**`get_tools` is a live call at agent-construction time**, so a server that is down takes your agent with it and one that is slow delays your startup.",
    "**The same server is a different risk in each surface**, because filtering and namespacing are present in two columns and absent from the third.",
    "**For a laptop, prefer a server whose whole tool list you are comfortable with**; for a service, an allow-list lets you take a broader server and expose a slice.",
    "**The review question is the same in every column:** assuming the model does the worst thing available to it, what happens?",
    "**On a stdio server launched by a desktop host, what it acts as is \"the person whose laptop it is\"**, with all their file access.",
    "**The one-line test:** connect the server you would be willing to leave connected while someone tries to talk your agent into misusing it.",
    "**Everything in this course follows from one design decision** — a server's text enters a model's context, and its tools act with the server's own credentials."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is missing from a desktop host's `mcpServers` JSON that a framework toolset provides?",
        options: [
          "The ability to pass environment variables",
          "A tool filter and a name prefix — so every tool the server offers reaches the model, and the allow-list that lesson 4.1 identified as the effective control is simply unavailable",
          "Support for HTTP transports",
          "The server's version"
        ],
        answer: 1,
        why: "It is why the same server is a different risk in the two places. On a desktop the remaining lever is the argument list, which is why scoping a filesystem server to one directory matters so much more there."
      },
      {
        stem: "A configuration entry runs `npx -y @scope/mcp-filesystem`. What is the concern?",
        options: [
          "npx is slower than a local install",
          "With no version pinned it fetches and executes whatever that name resolves to at startup — no reproducibility and no defence against a changed tool list, which is the supply-chain form of a rug pull",
          "npx cannot pass environment variables",
          "Node servers cannot be filtered"
        ],
        answer: 1,
        why: "Adding the entry is agreeing to run a command, and `-y` means agreeing to run whatever version is current. Pinning a version in the arguments is the same discipline as any dependency, applied to something that does not look like one."
      },
      {
        stem: "Why is a framework toolset's `tool_filter` better placed than an equivalent check elsewhere?",
        options: [
          "Because it runs faster than a runtime check",
          "It is a constructor argument, so the allow-list is in code and version control and a reviewer can ask why a name is on it",
          "Because the protocol enforces it server-side",
          "Because it survives a server restart"
        ],
        answer: 1,
        why: "The reviewability is the point. The same list buried in a configuration file nobody reviews provides the same technical protection and far less assurance that anyone considered it."
      },
      {
        stem: "A framework toolset is constructed inside a request handler. What follows?",
        options: [
          "Nothing — toolsets are cheap",
          "It owns a connection and therefore a subprocess, so lesson 5.1's leak and the roughly one-second startup both apply per request",
          "The tool filter stops applying",
          "The prefix is regenerated each time"
        ],
        answer: 1,
        why: "The wrapper changes the ergonomics and not the ownership. Construct it once at application startup and close it at shutdown, the same shape as a database pool and as the session group in 5.1."
      },
      {
        stem: "What is the review question that applies across all three host surfaces?",
        options: [
          "Does the server have good documentation?",
          "Assuming the model does the worst thing available to it, what happens — which means asking what the server acts as, what the worst reachable tool is, and whether anything is irreversible",
          "Is the server written in Python?",
          "Does it support resources as well as tools?"
        ],
        answer: 1,
        why: "It survives the thing that defeats reading descriptions: the descriptions changing. The one-line version is whether you would leave the server connected while someone tried to talk your agent into misusing it."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How do you add an MCP server to an agent?",
        strong: "Through whatever the host offers, but with the same four decisions. Which server, pinned to a version. Which tools, as an allow-list rather than a deny-list, because a server can add tools mid-connection. A name prefix per server, for collisions, legible traces and the shadowing defence. And what the server acts as — a scoped credential rather than whatever was easiest. In a framework those are constructor arguments; in a desktop config the filter and prefix do not exist.",
        answer: [
          { t: "p", text: "Framing it as four decisions rather than a configuration step is the answer, because it transfers across hosts." },
          { t: "p", text: "Knowing that a desktop configuration has no filtering is the detail that distinguishes someone who has used both surfaces — and it is why the same server is a different proposition on a laptop." }
        ]
      },
      {
        level: "advanced",
        q: "A team wants to add a third-party MCP server with fifteen tools. How do you review it?",
        strong: "Start with what it acts as, because that bounds everything: a user's own token, a service account, or something unscoped. Then the worst reachable tool, not the worst one we intend to use — on a desktop config that is all fifteen. Whether anything is irreversible. Whether we would notice it changing, which means a pinned version and ideally a hash of the tool list. And then the allow-list: we usually want one or two of the fifteen, which is also a tool-choice accuracy win.",
        answer: [
          { t: "p", text: "Leading with the credential is right, because it is the only control that survives being wrong about the server." },
          { t: "p", text: "The distinction between the worst tool reachable and the worst one intended is the sharpest part, and it is exactly what a desktop configuration erases." },
          { t: "p", text: "Noting that the allow-list is simultaneously a quality improvement — fewer declarations, better selection — is what makes it an easy sell rather than a security tax." }
        ]
      },
      {
        level: "advanced",
        q: "If you had to summarise MCP's risks in one sentence, what would it be?",
        strong: "A server's text enters your model's context and its tools act with the server's own credentials — so you are trusting someone else's prose inside your prompt and someone else's access behind your tool calls. Everything else follows: the allow-list, the prefix, the pinned version, the scoped credential, and the question of what happens if the model does the worst thing available to it.",
        answer: [
          { t: "p", text: "Compressing it to the two structural facts, rather than listing attack names, is what a good summary does — and both facts are properties of the design rather than bugs." },
          { t: "p", text: "The closing question is the practical form, and the reason it beats reading descriptions is that it survives the descriptions changing." }
        ]
      }
    ]
  }
});
