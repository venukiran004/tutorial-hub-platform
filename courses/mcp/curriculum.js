/* ============================================================================
   MODEL CONTEXT PROTOCOL — CURRICULUM
   ----------------------------------------------------------------------------
   Five modules covering MCP as a protocol rather than as a framework feature:
   the three roles and the handshake, the three primitives, building a server
   with both the decorator API and the low-level one, the three transports and
   what changes when a server stops being a subprocess, the security surface a
   server hands its callers, and consuming servers written by other people.

   Every API in this course was introspected from the installed SDK and every
   trace was produced by running a real client against a real server over
   stdio — no mocking, no transcription from documentation.

     Version pinned at authoring: mcp 1.28.1, protocol revision 2025-11-25,
     pydantic 2.12.5, starlette 1.7.0, Python 3.11.

   Not in this course: the A2A protocol, which is agent-to-agent rather than
   agent-to-tools and belongs with the agent runtimes; and building agents,
   which is what the ADK and LangChain courses are for. This course is the
   protocol and the servers.
   ========================================================================= */
(function () {
  "use strict";

  EC.defineCourse({
    id: "mcp",
    title: "Model Context Protocol",
    subtitle: "Writing, securing and consuming MCP servers",
    short: "MCP",
    tagline: "The protocol read off the wire: the handshake, the three primitives, servers built two ways, the three transports, and the security surface a published server hands its callers.",

    blurb: "MCP turns M tools times N frameworks into M plus N. This course takes the protocol apart: hosts, clients and servers; tools, resources and prompts; the initialize handshake and capability negotiation; a server written with FastMCP and the same one written against the low-level API; stdio, SSE and streamable HTTP; the injection surface, per-user identity, in-process testing, and versioning an interface other teams depend on.",

    published: ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "2.4"],

    modules: [

      /* ================================================================
         PHASE 1 · THE PROTOCOL
         ================================================================ */
      {
        id: "protocol",
        short: "M1",
        dir: "01_protocol",
        phase: "Phase 1 · The protocol",
        title: "Roles, Handshake and Primitives",
        blurb: "What MCP is and the integration problem it exists to solve; host, client and server as three separate roles that people routinely conflate; the initialize exchange and what capability negotiation actually settles; and the three primitives, which are three different answers rather than three names for tools.",
        outcome: "You can name the three roles in a running system, read an initialize response, and say whether a given capability should be a tool, a resource or a prompt.",
        lessons: [
          { id: "1.1", title: "What MCP Is, and the Three Roles", difficulty: "core", minutes: 28, tier: "must",
            summary: "The M times N integration problem and how a protocol turns it into M plus N; host, client and server distinguished precisely; the one-client-per-server rule; and an honest list of what MCP does not solve.",
            keywords: ["mcp", "model context protocol", "host", "client", "server", "integration", "n times m"] },
          { id: "1.2", title: "The Handshake, Executed", difficulty: "core", minutes: 30, tier: "must",
            summary: "A real initialize exchange: protocol revision 2025-11-25, serverInfo, instructions, and the capability flags both sides declare — plus what a client must not call because the server never advertised it.",
            keywords: ["initialize", "handshake", "capabilities", "protocol version", "serverinfo", "negotiation", "listchanged"] },
          { id: "1.3", title: "Tools, Resources and Prompts", difficulty: "core", minutes: 32, tier: "must",
            summary: "Three primitives and the question each answers: a tool is model-controlled, a resource is application-controlled, a prompt is user-controlled. Resource templates, URI schemes, and why putting read-only data behind a tool wastes a model call.",
            keywords: ["tools", "resources", "prompts", "resource template", "uri", "model-controlled", "primitives"] }
        ]
      },

      /* ================================================================
         PHASE 2 · BUILDING A SERVER
         ================================================================ */
      {
        id: "server",
        short: "M2",
        dir: "02_server",
        phase: "Phase 2 · Building a server",
        title: "Servers, Schemas and Errors",
        blurb: "A server offering all three primitives in a dozen lines, then the part that decides whether a model can use it: how much of a tool's contract reaches the schema, measured three ways. Then the five error paths a caller can see, and the low-level API for the three things the decorators do not expose.",
        outcome: "You can write a server whose tool schemas carry their own constraints, whose results are typed, and whose failures reach the caller as data rather than as your exception text.",
        lessons: [
          { id: "2.1", title: "A Server With All Three Primitives", difficulty: "core", minutes: 30, tier: "must",
            summary: "FastMCP's decorators, what each one registers, the lifespan hook for expensive setup, and the distinction between the bundled FastMCP and the separate third-party package with the same name.",
            keywords: ["fastmcp", "decorator", "tool", "resource", "prompt", "lifespan", "mcp.run", "stdio"] },
          { id: "2.2", title: "The Tool Contract: What Reaches the Model", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The measurement that decides tool quality: a Google-style docstring puts its whole Args block into the description and leaves the schema undocumented, Annotated with Field carries descriptions and constraints, and a Pydantic return type is the only way to get an outputSchema and structuredContent.",
            keywords: ["inputschema", "outputschema", "structuredcontent", "annotated", "pydantic field", "enum", "docstring", "tool description"] },
          { id: "2.3", title: "Five Ways a Call Fails", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Unknown tool, missing argument, wrong type, a raised exception and a returned error payload — all executed. isError tracks execution rather than meaning, and a raised exception sends its message verbatim to whoever called you.",
            keywords: ["iserror", "error handling", "validation", "exception", "information disclosure", "retryable", "tool error"] },
          { id: "2.4", title: "The Low-Level Server API", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "What FastMCP fills in for you: InitializationOptions, the capabilities you declare, NotificationOptions and the tools_changed notification — and the three cases where you need the layer underneath.",
            keywords: ["server", "lowlevel", "initializationoptions", "notificationoptions", "list_tools", "call_tool", "notifications"] }
        ]
      },

      /* ================================================================
         PHASE 3 · TRANSPORTS
         ================================================================ */
      {
        id: "transport",
        short: "M3",
        dir: "03_transport",
        phase: "Phase 3 · Transports",
        title: "stdio, SSE and Streamable HTTP",
        blurb: "Three transports, and the decision is not about performance. A stdio server is a subprocess protected by being unreachable; the same code on an HTTP endpoint is an open API with your credentials behind every tool. What changes, and what has to be added back.",
        outcome: "You can choose a transport from the deployment you actually have, and say what access control, identity and buffering each one implies.",
        lessons: [
          { id: "3.1", title: "Three Transports, and What Each Assumes", difficulty: "core", minutes: 30, tier: "must",
            summary: "stdio as a subprocess reading JSON-RPC frames from standard input, SSE with its two endpoints, and streamable HTTP folding both onto one — with the stateless and json_response settings that decide whether a server can scale horizontally.",
            keywords: ["stdio", "sse", "streamable http", "transport", "subprocess", "stateless", "json_response", "session"] },
          { id: "3.2", title: "Serving Over HTTP", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "The server as an ASGI application: mounting it, putting authentication in front, the origin and host checks that exist to stop DNS rebinding, and the buffering proxy that makes a stream not a stream.",
            keywords: ["asgi", "starlette", "mount", "authentication", "dns rebinding", "origin check", "buffering", "reverse proxy"] }
        ]
      },

      /* ================================================================
         PHASE 4 · SECURITY AND OPERATION
         ================================================================ */
      {
        id: "production",
        short: "M4",
        dir: "04_production",
        phase: "Phase 4 · Security and operation",
        title: "The Injection Surface, Identity, Testing and Versioning",
        blurb: "A server you publish is a dependency with a prompt-shaped attack surface: its tool descriptions enter someone else's model context, and it acts with its own credentials for every user. The threats with names, the identity problem, a test suite that needs no subprocess, and what you owe a consumer you cannot redeploy.",
        outcome: "You can state what a server's callers are trusting, give it per-user identity rather than one shared token, test it in-process, and change it without breaking somebody else's agent at runtime.",
        lessons: [
          { id: "4.1", title: "The Injection Surface", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Tool descriptions are prompt, which makes them an attack surface with names: tool poisoning, the rug pull, the confused deputy, and cross-server shadowing. What a consumer can actually control, and why an allow-list beats reading the descriptions once.",
            keywords: ["prompt injection", "tool poisoning", "rug pull", "confused deputy", "allow-list", "untrusted", "security"] },
          { id: "4.2", title: "Identity and Authentication", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "The structural problem: a server holds one credential and serves every caller, so answers cannot differ per user unless identity crosses the boundary. Token verifiers, the OAuth provider hooks, and what to do when the protocol gives you nothing.",
            keywords: ["auth", "oauth", "tokenverifier", "authsettings", "identity", "per-user", "credential", "multi-tenancy"] },
          { id: "4.3", title: "Testing a Server", difficulty: "core", minutes: 28, tier: "should",
            summary: "Testing in-process with a client session over a memory stream: no subprocess, no port, same second as the rest of the suite. What to assert — that the tool appears, that its schema is what you meant, and that a bad argument returns an error rather than raising.",
            keywords: ["testing", "pytest", "in-process", "schema assertion", "clientsession", "memory stream", "regression"] },
          { id: "4.4", title: "Operating One Other Teams Depend On", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "A published server is a product: tool names and argument names are the public interface, so renaming one is a breaking change discovered at runtime. Versioning, deprecation, logging every call, rate limits, and the notification that tells clients the tool list moved.",
            keywords: ["versioning", "deprecation", "breaking change", "logging", "rate limit", "tools_changed", "operations", "sla"] }
        ]
      },

      /* ================================================================
         PHASE 5 · CONSUMING
         ================================================================ */
      {
        id: "clients",
        short: "M5",
        dir: "05_clients",
        phase: "Phase 5 · Consuming",
        title: "Clients, and Servers You Did Not Write",
        blurb: "The other direction: a client of your own, several servers at once, and the same server wired into a desktop host, an agent framework and your own code. Plus the lifecycle bug that leaks a subprocess per request.",
        outcome: "You can write a client, manage several servers in one process without leaking them, and wire a third-party server into an agent with a filter you can justify in review.",
        lessons: [
          { id: "5.1", title: "Writing a Client", difficulty: "core", minutes: 30, tier: "must",
            summary: "ClientSession over stdio, the initialize-then-use lifecycle, and the context managers that own the subprocess. Several servers at once with a session group, and the leak that happens when a web handler constructs a client per request.",
            keywords: ["clientsession", "stdio_client", "lifecycle", "context manager", "sessiongroup", "leak", "shutdown"] },
          { id: "5.2", title: "Consuming From Any Host", difficulty: "core", minutes: 28, tier: "should",
            summary: "The same server from a desktop host's JSON config, from an agent framework's toolset object, and from your own code — with the tool filter, the name prefix and the review question that should precede all three.",
            keywords: ["claude desktop", "config", "toolset", "tool filter", "prefix", "host", "integration"] }
        ]
      }
    ]
  });
})();
