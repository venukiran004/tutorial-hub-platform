/* ============================================================================
   LESSON 3.2 — Serving Over HTTP
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "**The transport is the easy part; what the transport removes is the lesson.** An MCP server on an HTTP endpoint is an unauthenticated API with your credentials behind every tool, because the protocol has no authentication of its own. One thing the SDK does defend by default — and it is worth knowing it is there, because `Origin: http://evil.example` came back **403** without a line of code from me — but everything else is yours to add.",

  objectives: [
    "Mount an MCP server as an ASGI application beside your own routes",
    "Put authentication in front of it, and say why it cannot go inside",
    "Explain what the DNS-rebinding protection defends against",
    "Configure allowed hosts and origins deliberately",
    "Recognise the buffering proxy that makes a stream not a stream"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "It is an ASGI application", id: "asgi" },

    {"kind": "flow", "title": "Mount it under your app, not the other way round", "caption": "**`streamable_http_app()` returns a mountable ASGI app**, so the MCP endpoint becomes one route in an application you own. The immediate reason is a health check — a load balancer needs something cheap to poll, and a POST carrying an `initialize` is a poor liveness probe. **The larger reason is that middleware on your app runs before the MCP endpoint sees anything**, and that is where authentication has to live. A server that mounts itself leaves you nowhere to stand.", "cols": 3, "nodes": [{"id": "m", "label": "mcp.streamable_http_app()", "sub": "a mountable ASGI app", "tone": "accent"}, {"id": "s", "label": "Mount('/', app=...)", "sub": "inside your own Starlette app", "tone": "good"}, {"id": "h", "label": "Route('/healthz')", "sub": "a cheap liveness probe", "tone": "good"}, {"id": "w", "label": "Middleware runs FIRST", "sub": "before any MCP message is parsed", "tone": "violet"}, {"id": "o", "label": "Let FastMCP run itself", "sub": "and you have nowhere to stand", "tone": "crit"}], "edges": [["m", "s"], ["s", "h"], ["s", "w"], ["m", "o"]], "t": "diagram", "id": "dg-3_2-01-0"},


    { t: "p", text: "`FastMCP` will run its own server, which is right for a quick start and wrong for anything that needs to sit beside the rest of your service. **The useful form is the app factory**, because then the MCP endpoint is one route in an application you own." },

    { t: "code", lang: "python", title: "two ways to serve it",
      code: `# The quick way: FastMCP runs uvicorn itself.
if __name__ == "__main__":
    mcp.run(transport="streamable-http")        # host/port from the constructor

# The useful way: take the ASGI app and mount it.
from starlette.applications import Starlette
from starlette.routing import Mount, Route

app = Starlette(routes=[
    Route("/healthz", healthz),                  # your own routes
    Route("/metrics", metrics),
    Mount("/", app=mcp.streamable_http_app()),   # the MCP endpoint, at /mcp
])

# uvicorn your_module:app --host 0.0.0.0 --port 8000`,
      caption: "`streamable_http_app()` returns a mountable ASGI app — `sse_app()` is the equivalent for the older transport. **Once it is mounted, every tool you already use for an HTTP service applies:** your own health check, your metrics, your middleware, your logging, your deployment." },

    { t: "callout", kind: "good", title: "Mount it under your own app, not the other way round",
      body: [
        { t: "p", text: "A health endpoint is the immediate reason: a load balancer needs something cheap to poll, and the MCP endpoint is not it — a POST carrying an `initialize` is a poor liveness probe. Mounting MCP inside your own Starlette or FastAPI app gives you `/healthz` for free and a place to put everything else." },
        { t: "p", text: "The larger reason is that **this is where authentication goes**, and middleware on your app runs before the MCP endpoint sees anything. A server that mounts itself leaves you nowhere to stand." }
      ] },

    { t: "h2", n: "02", text: "Authentication goes in front", id: "auth" },

    {"kind": "flow", "title": "The rejection has to precede the handshake", "caption": "**By the time a tool body runs, the caller has already read your entire tool list and every description in it.** So a check inside each tool stops the call and not the reconnaissance — and it has to be remembered in every tool including the one added next month. Middleware rejects before any MCP message is parsed, which is the property worth having. **But note the last node:** a bearer token authenticates the client, not a user, so a server with a token check feels secured and has not solved what a multi-user deployment needs.", "cols": 3, "nodes": [{"id": "r", "label": "A request arrives", "sub": "no Authorization header", "tone": "accent"}, {"id": "m", "label": "Middleware returns 401", "sub": "before the handshake", "tone": "good"}, {"id": "n", "label": "The caller never sees the tool list", "sub": "no names, no descriptions, no schemas", "tone": "good"}, {"id": "t", "label": "A check inside each tool instead", "sub": "stops the call, not the reconnaissance", "tone": "crit"}, {"id": "f", "label": "And is forgotten in the next tool", "sub": "protection by remembering", "tone": "crit"}, {"id": "u", "label": "A token is not a user", "sub": "every holder is the same caller - see 4.2", "tone": "violet"}], "edges": [["r", "m"], ["m", "n"], ["r", "t"], ["t", "f"], ["n", "u"]], "t": "diagram", "id": "dg-3_2-02-1"},


    { t: "p", text: "Lesson 3.1's last exercise ended with an uncomfortable sentence, and this is the answer to it. **An MCP endpoint with no middleware will serve `tools/call` to anyone who can reach the port**, including the destructive tools, acting with whatever credentials the server process holds." },

    { t: "code", lang: "python", title: "middleware, before the protocol is reached",
      code: `from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class RequireToken(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path.startswith("/healthz"):
            return await call_next(request)                  # probes stay open
        token = request.headers.get("authorization", "")
        if not token.startswith("Bearer ") or not verify(token[7:]):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        return await call_next(request)

app = Starlette(
    routes=[Route("/healthz", healthz), Mount("/", app=mcp.streamable_http_app())],
    middleware=[Middleware(RequireToken)],
)`,
      caption: "**The rejection happens before any MCP message is parsed**, which is the property you want: an unauthenticated caller never reaches a tool, a schema, or even the handshake. Note the health-check exemption, which is the kind of hole worth writing deliberately rather than discovering." },

    { t: "p", text: "The reason this cannot live inside a tool is structural: **by the time your tool body runs, the caller has already read your entire tool list and every description in it.** A `before` check in each tool stops the call and not the reconnaissance, and it has to be remembered in every tool including the one added next month." },

    { t: "callout", kind: "trap", title: "A bearer token is not a user",
      body: [
        { t: "p", text: "Middleware like the above authenticates **the client**, which is genuine progress and is not identity. Every caller presenting that token is the same caller as far as your tools are concerned, so a tool cannot return “the caller's own orders” — it can only return orders, to anyone holding the token." },
        { t: "p", text: "That distinction is the whole of lesson 4.2, and it is worth separating now because a server with a token check feels secured and has not solved the problem a multi-user deployment actually has." }
      ] },

    { t: "h2", n: "03", text: "The one defence that is already on", id: "rebinding" },

    {"kind": "trace", "title": "On by default, and measured", "caption": "**Protection is on with empty allow-lists, and the empty list is a statement rather than a gap:** no browser origin is permitted, while ordinary server-to-server calls carrying no Origin keep working. The attack is specific to local servers — a hostile page the user visits makes requests to `127.0.0.1`, and without the check it can drive every tool with the user's own access. **When a legitimate caller gets a 403, add its host to the allow-list**; disabling the protection is the one change that opens a local server to any page.", "left": "request", "codeW": 190, "vars": ["result", "why"], "steps": [{"code": "enable_dns_rebinding_protection", "state": ["True by default", "nothing to switch on"], "tone": "good"}, {"code": "allowed_hosts / allowed_origins", "state": ["[] and []", "no origin permitted"], "changed": [0, 1], "tone": "accent"}, {"code": "POST with no Origin header", "state": ["HTTP 200", "ordinary server-to-server"], "changed": [0, 1], "tone": "good"}, {"code": "POST with Origin: evil.example", "state": ["HTTP 403", "the control working"], "changed": [0, 1], "tone": "violet"}, {"code": "the fix for a false positive", "state": ["add the host to the allow-list", "NOT disabling the check"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-3_2-03-2"},


    { t: "p", text: "Something does come configured by default, and it is easy to meet as a confusing failure rather than as a feature." },

    { t: "code", lang: "python", title: "the defaults, and the behaviour",
      code: `from mcp.server.transport_security import TransportSecuritySettings
print({k: str(v.default) for k, v in TransportSecuritySettings.model_fields.items()})`,
      out: `{'enable_dns_rebinding_protection': 'True', 'allowed_hosts': '[]', 'allowed_origins': '[]'}

# Measured against a running server with curl:
#   no Origin header        -> HTTP 200
#   Origin: http://evil.example -> HTTP 403`,
      caption: "**Protection is on, with empty allow-lists.** A request with no `Origin` is accepted — that is an ordinary server-to-server call. A request carrying an `Origin` the server does not recognise is rejected with **403**, which is what stops a web page in someone's browser from driving your local server." },

    { t: "p", text: "The attack it prevents is worth understanding because it is specific to local servers. A user visits a hostile page; that page makes requests to `http://127.0.0.1:8000`, which from the browser's point of view is the user's own machine. **Without an origin check, the page can call every tool on a local MCP server** — reading files, hitting internal APIs, whatever the server exposes — with the user's own access, from a tab they opened by accident." },

    { t: "code", lang: "python", title: "configuring it for a real deployment",
      code: `from mcp.server.transport_security import TransportSecuritySettings

mcp = FastMCP(
    "finance",
    transport_security=TransportSecuritySettings(
        allowed_hosts=["mcp.internal.example", "mcp.internal.example:8000"],
        allowed_origins=["https://app.example.com"],
    ),
)`,
      caption: "List the hosts your server is legitimately reached by and the browser origins allowed to drive it. **If nothing browser-based ever calls this server, leave `allowed_origins` empty** — the empty list is not a gap, it is the statement that no origin is permitted, while server-to-server calls carrying no Origin continue to work." },

    { t: "callout", kind: "warn", title: "Do not switch it off to make a 403 go away",
      body: [
        { t: "p", text: "The 403 is the control working. When a legitimate caller is rejected, the fix is to add its host or origin to the allow-list — not `enable_dns_rebinding_protection=False`, which is the one setting in this lesson that makes a local server reachable from any web page the user visits." },
        { t: "p", text: "The one place the flag is reasonable is a server that is not on a loopback address and sits behind a proxy already enforcing host and origin rules — and then the check has moved rather than disappeared." }
      ] },

    { t: "h2", n: "04", text: "The thing between you and the client", id: "buffering" },

    {"kind": "trace", "title": "Four ways a stream stops being one", "caption": "**Every one of these is invisible locally, because nothing sits between the client and the server.** The production symptom is an agent that works and is inexplicably slow, with no error logged by anything — which is why the honest check is a tool that reports progress for sixty seconds, called through the deployed URL. Either the updates arrive as they are sent or something in the chain is buffering, and knowing which takes one minute.", "left": "what intervenes", "codeW": 190, "vars": ["effect", "fix"], "steps": [{"code": "a buffering reverse proxy", "state": ["the stream arrives in one piece", "proxy_buffering off for that route"], "tone": "crit"}, {"code": "a compression layer", "state": ["same, and often enabled globally", "exclude the MCP route"], "changed": [0, 1], "tone": "crit"}, {"code": "a platform requiring a full body", "state": ["buffering by design", "json_response + stateless"], "changed": [0, 1], "tone": "warn"}, {"code": "a read timeout under the call length", "state": ["a two-minute call cut at 30s", "raise it, or shorten the call"], "changed": [0, 1], "tone": "crit"}, {"code": "and against localhost", "state": ["all four are invisible", "test the deployed URL"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-3_2-04-3"},


    { t: "p", text: "Streamable HTTP may answer with an SSE stream, which means something in your infrastructure can quietly collect the whole response and deliver it at once." },

    { t: "dl", items: [
      ["A buffering reverse proxy", "nginx buffers responses by default. The stream arrives in one piece at the end, so progress notifications are useless and a long call looks like a hang. `proxy_buffering off` for the MCP route, or the equivalent."],
      ["A compression layer", "Gzip middleware that waits for a complete body does the same thing, and it is often enabled globally in a framework's default middleware stack."],
      ["A platform that requires a complete response", "Some serverless products buffer by design. There, use `json_response=True` and a stateless server, and accept that progress reporting is not available."],
      ["A read timeout shorter than a long call", "A proxy with a 30-second timeout will cut a two-minute tool call, and the client sees a transport error rather than a tool result."]
    ] },

    { t: "callout", kind: "insight", title: "Test through the real path, not against localhost",
      body: [
        { t: "p", text: "Every one of those failures is invisible locally, because there is nothing between the client and the server. The symptom in production is **an agent that works and is inexplicably slow**, with no error anywhere — which is the same failure mode, and the same diagnosis, as a buffered SSE response in any other streaming service." },
        { t: "p", text: "If progress reporting matters, the honest check is a tool that reports progress for sixty seconds, called through the deployed URL. Either the updates arrive as they are sent or something in the chain is buffering, and knowing which takes one minute." }
      ] },

    { t: "h2", n: "05", text: "The checklist before it is reachable", id: "checklist" },

    {"kind": "trace", "title": "Eight questions, and the one that should stop a deployment", "caption": "**Everything on this list except the fourth row is work; the fourth is a different category.** A destructive tool on an unauthenticated endpoint is not a configuration question — and the question to answer before shipping is lesson 1.1's: what is the worst thing a caller could do with the tools this server offers, assuming they are trying?", "left": "question", "codeW": 190, "vars": ["if the answer is unsatisfactory"], "steps": [{"code": "who can reach the port?", "state": ["bind internally, or use your gateway"], "tone": "warn"}, {"code": "what authenticates a caller?", "state": ["middleware in front, not per tool"], "changed": [0], "tone": "warn"}, {"code": "what does the server act as?", "state": ["a scoped service account, never shared admin"], "changed": [0], "tone": "crit"}, {"code": "can a tool do something irreversible?", "state": ["then this is an incident waiting, not config"], "changed": [0], "tone": "crit"}, {"code": "are hosts and origins listed?", "state": ["set them; do not disable the check"], "changed": [0], "tone": "warn"}, {"code": "does anything buffer?", "state": ["test a long call through the real URL"], "changed": [0], "tone": "accent"}, {"code": "what is logged per call?", "state": ["tool, args, caller, duration, outcome"], "changed": [0], "tone": "accent"}], "t": "diagram", "id": "dg-3_2-05-4"},


    { t: "table",
      head: ["Question", "If the answer is unsatisfactory"],
      rows: [
        ["Who can reach the port?", "Bind to an internal interface, or put it behind the same gateway as your other services"],
        ["What authenticates a caller?", "Middleware in front — not a check inside each tool"],
        ["What does the server act as?", "A service account scoped to what the tools need, never a shared admin credential"],
        ["Can a tool do something irreversible?", "Then an unauthenticated endpoint is not a configuration question, it is an incident waiting"],
        ["Are hosts and origins listed?", "Set `allowed_hosts` and `allowed_origins`; do not disable the protection"],
        ["Does anything buffer the response?", "Test a long call through the deployed URL, not localhost"],
        ["Is there a health endpoint?", "Mount MCP under your own app and add one"],
        ["What is logged per call?", "Tool name, arguments, caller, duration, outcome — lesson 4.4"]
      ] },

    { t: "p", text: "**The fourth row is the one that should stop a deployment.** Everything else on the list is work; a destructive tool on an open endpoint is a different category, and the question to answer before shipping is the one from lesson 1.1 — what is the worst thing a caller could do with the tools this server offers." },

    { t: "exercise", kind: "practice", title: "Expose it properly", difficulty: "advanced", minutes: 30,
      prompt: "Take an HTTP MCP server and mount it under your own Starlette app with a /healthz route. Add bearer-token middleware and confirm from curl that a request with no token gets 401 before any MCP message is parsed, while /healthz still answers. Then send a request with Origin: http://evil.example and confirm 403; add that origin to allowed_origins and confirm it now passes. Finally write a tool that reports progress for thirty seconds, call it through a reverse proxy with buffering on, and then with it off — and record the difference in when the updates arrive.",
      hints: [
        "Check the 401 happens before the handshake by looking at what the server logged.",
        "curl -H 'Origin: http://evil.example' is enough to trigger the check.",
        "For the proxy test, nginx with proxy_buffering on is the default."
      ],
      solution: {
        notes: [
          { t: "p", text: "The ordering in the first part is the point: with middleware the rejection precedes any MCP parsing, so an unauthenticated caller never sees your tool list. A check inside each tool would have let them read every tool name and description first, which is reconnaissance you handed over for free." },
          { t: "p", text: "The proxy test is the one that is hard to believe until you watch it. With buffering on, thirty seconds of progress updates arrive together at the end, so the feature appears to work in development and does nothing in production — and no error is logged anywhere, by anything." }
        ]
      } }

  ],

  takeaways: [
    "**`streamable_http_app()` returns a mountable ASGI app**, so the MCP endpoint becomes one route in an application you own, with your health check, metrics and middleware around it.",
    "**Mount MCP under your own app rather than letting it run itself** — a load balancer needs a cheap liveness probe, and middleware is where authentication has to live.",
    "**An MCP endpoint with no middleware serves `tools/call` to anyone who can reach the port**, acting with whatever credentials the server process holds.",
    "**Authentication in middleware rejects before any MCP message is parsed**, so an unauthenticated caller never reaches a tool, a schema or the handshake.",
    "**A check inside each tool stops the call but not the reconnaissance** — by then the caller has read every tool name and description — and must be remembered in every tool added later.",
    "**A bearer token authenticates the client, not a user.** Every caller with that token is the same caller to your tools, which is why per-user answers need lesson 4.2.",
    "**DNS-rebinding protection is on by default with empty allow-lists:** no `Origin` header is accepted, and `Origin: http://evil.example` was measured returning 403.",
    "**It defends a specific attack on local servers** — a hostile web page calling `127.0.0.1` and driving every tool with the user's own access.",
    "**An empty `allowed_origins` is a statement, not a gap:** no browser origin is permitted, while server-to-server calls carrying no Origin keep working.",
    "**Never disable the protection to clear a 403.** Add the host or origin to the allow-list; the 403 is the control working.",
    "**A buffering proxy, a compression layer or a short read timeout makes a stream not a stream**, and all three are invisible against localhost — test a long call through the deployed URL.",
    "**A destructive tool on an open endpoint is not a configuration question.** It is the row that should stop a deployment."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why should authentication be middleware in front of the MCP app rather than a check at the top of each tool?",
        options: [
          "Because middleware is faster",
          "Middleware rejects before any MCP message is parsed, so an unauthenticated caller never reads the tool list or any description — and it cannot be forgotten in a tool added later",
          "Because tools cannot read request headers at all",
          "Because the protocol forbids checks inside tools"
        ],
        answer: 1,
        why: "A per-tool check stops the call but not the reconnaissance: by the time a tool body runs, the caller has already seen every tool name, description and schema. The middleware position also means a new tool is protected by default rather than by remembering."
      },
      {
        stem: "A request carrying `Origin: http://evil.example` returns 403 from a default server, while a request with no Origin returns 200. What is that?",
        options: [
          "A misconfiguration — both should be accepted",
          "DNS-rebinding protection, on by default with empty allow-lists: unrecognised browser origins are refused while ordinary server-to-server calls, which send no Origin, continue to work",
          "CORS, which the SDK does not implement",
          "A bug in the streamable HTTP transport"
        ],
        answer: 1,
        why: "It defends an attack specific to local servers: a hostile page the user visits can make requests to 127.0.0.1 and drive every tool with the user's own access. The empty allow-list is a statement that no origin is permitted, not an oversight."
      },
      {
        stem: "A legitimate internal caller is being rejected with 403. What is the fix?",
        options: [
          "Set `enable_dns_rebinding_protection=False`",
          "Add its host or origin to `allowed_hosts` / `allowed_origins` — the 403 is the control working, and disabling it makes a local server reachable from any page the user visits",
          "Switch to the SSE transport",
          "Use stateless mode"
        ],
        answer: 1,
        why: "Turning a control off to clear its signal is the mistake the setting invites. The one defensible case is a non-loopback server behind a proxy already enforcing host and origin rules, where the check has moved rather than vanished."
      },
      {
        stem: "An agent using a deployed MCP server works but progress updates all arrive at the end. What is the likely cause?",
        options: [
          "The server is not reporting progress",
          "Something in the chain is buffering the response — a reverse proxy with buffering on, a compression layer, or a platform that requires a complete body",
          "The client does not support notifications",
          "Stateless mode is enabled"
        ],
        answer: 1,
        why: "It is invisible locally because nothing sits between client and server, and no error is logged by anything. The one-minute check is a tool that reports progress for a minute, called through the deployed URL rather than localhost."
      },
      {
        stem: "A server with bearer-token middleware has a tool returning \"the caller's own orders\". What is wrong?",
        options: [
          "Nothing — the token identifies the caller",
          "A token authenticates the client, not a user: every caller presenting it is the same caller, so the tool can only return orders to anyone holding the token",
          "The tool should check the token itself",
          "Orders should be a resource rather than a tool"
        ],
        answer: 1,
        why: "This is the gap a token check hides, because the server feels secured. Nothing in MCP carries the caller's identity, so per-user behaviour needs identity passed deliberately on top of the protocol — which is lesson 4.2."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you deploy an MCP server over HTTP?",
        strong: "Take the ASGI app from streamable_http_app() and mount it under my own Starlette or FastAPI app, so I have a health endpoint and somewhere to put middleware. Authentication goes in that middleware, in front — not inside the tools, because by the time a tool runs the caller has already read the whole tool list. Then allowed_hosts and allowed_origins set deliberately, a scoped service account rather than a shared credential, and a long call tested through the deployed URL to catch a buffering proxy.",
        answer: [
          { t: "p", text: "Mounting under your own app rather than letting FastMCP run itself is the structural decision, and the health endpoint is the concrete reason that makes it obvious." },
          { t: "p", text: "The middleware-versus-tool argument is the part worth articulating: a per-tool check stops the call but not the reconnaissance." },
          { t: "p", text: "Mentioning the buffering test shows production experience, because it is the failure with no error message — the agent works and is inexplicably slow." }
        ]
      },
      {
        level: "advanced",
        q: "What is DNS-rebinding protection doing in an MCP server, and is it on?",
        strong: "It is on by default with empty allow-lists. It refuses requests carrying an Origin the server does not recognise, while accepting requests with no Origin at all, which is what ordinary server-to-server traffic sends. The attack is specific to local servers: a hostile page the user visits makes requests to 127.0.0.1, and without the check it can drive every tool on a local MCP server with the user's own access.",
        answer: [
          { t: "p", text: "Knowing it is already on, and that the empty allow-list is deliberate rather than a gap, is the fact being tested." },
          { t: "p", text: "The browser-to-localhost framing is what makes the threat land — it is not a generic CORS discussion, it is about a tab the user opened reaching a server running on their own machine." },
          { t: "p", text: "The strongest answers add the operational trap: when a legitimate caller gets a 403, the tempting fix is to disable the protection, and that is precisely the change that opens the local server to any page." }
        ]
      },
      {
        level: "mid",
        q: "What does an HTTP transport remove that stdio gave you?",
        strong: "Access control and caller isolation. Under stdio the server is a subprocess nobody else can reach and each connection is its own process; over HTTP anyone who can reach the port can call every tool, and two clients share one process separated only by a session id. So authentication, host and origin rules, a scoped credential and anything keyed per caller all become my responsibility, and the protocol provides none of them.",
        answer: [
          { t: "p", text: "Naming both losses — reachability and isolation — is better than naming only authentication, because the isolation one is what breaks previously-correct server code." },
          { t: "p", text: "A good answer closes on the asymmetry: the transport change is one argument to mcp.run, and the security change it implies is a deployment's worth of work." }
        ]
      }
    ]
  }
});
