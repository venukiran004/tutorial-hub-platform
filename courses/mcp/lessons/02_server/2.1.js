/* ============================================================================
   LESSON 2.1 — A Server With All Three Primitives
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "**A useful MCP server is about twenty lines**, and the decorators do the work: a function's signature becomes a JSON schema, its docstring becomes the description, and a URI string becomes an address. This lesson builds one with all three primitives and then adds the piece every real server needs and most tutorials omit — a lifespan, so expensive setup happens once per connection rather than once per call.",

  objectives: [
    "Register tools, resources and prompts with the decorator API",
    "Explain what each decorator generates and what it does not",
    "Use a lifespan to hold a connection, a client or a loaded model",
    "Reach the lifespan context and the request metadata from inside a tool",
    "Distinguish the bundled FastMCP from the separate package of the same name"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", text: "Three decorators", id: "decorators" },

    {"kind": "trace", "title": "Three decorators, and what each one generates", "caption": "**The braces are the whole difference between a resource and a template** — a plain URI is listable, a braced one is discoverable and its parameters arrive as function arguments. Note the third column: the decorators generate a great deal and they do not generate parameter descriptions from a docstring, which is what lesson 2.2 measures. **`mcp.run(transport=stdio)` is the entire deployment** for a local server.", "left": "decorator", "codeW": 190, "vars": ["registers", "generated from"], "steps": [{"code": "@mcp.tool()", "state": ["a model-callable operation", "annotations and the docstring's first line"], "tone": "accent"}, {"code": "@mcp.resource('rates://current')", "state": ["a concrete, listable address", "the return value"], "changed": [0, 1], "tone": "good"}, {"code": "@mcp.resource('vat://{country}')", "state": ["a TEMPLATE, not listable", "braces become function arguments"], "changed": [0, 1], "tone": "violet"}, {"code": "@mcp.prompt()", "state": ["a user-invoked template", "parameters become prompt arguments"], "changed": [0, 1], "tone": "violet"}, {"code": "mcp.run(transport=stdio)", "state": ["the whole deployment", "the host launches it as a subprocess"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-2_1-01-0"},


    { t: "p", text: "`FastMCP` is the decorator API bundled with the SDK, and it is the right starting point for almost every server. Three decorators cover the three primitives." },

    { t: "code", lang: "python", title: "the whole server",
      code: `from mcp.server.fastmcp import FastMCP

mcp = FastMCP("finance", instructions="Currency conversion and VAT for European invoices.")

RATES = {("GBP", "EUR"): 1.17, ("EUR", "GBP"): 0.85, ("GBP", "USD"): 1.27}
VAT = {"IE": 0.23, "DE": 0.19, "FR": 0.20, "GB": 0.20}

@mcp.tool()
def convert(amount: float, frm: str, to: str) -> dict:
    """Converts an amount between two currencies."""
    rate = RATES.get((frm.upper(), to.upper()))
    if rate is None:
        return {"error": "no rate for %s->%s" % (frm, to), "retryable": False}
    return {"amount": round(amount * rate, 2), "currency": to.upper(), "rate": rate}

@mcp.resource("rates://current")
def current_rates() -> str:
    """The rate table this server is using."""
    return "\\n".join("%s->%s %.2f" % (a, b, r) for (a, b), r in RATES.items())

@mcp.resource("vat://{country}")
def vat_rate(country: str) -> str:
    """The VAT rate for one country."""
    r = VAT.get(country.upper())
    return "no rate" if r is None else "%s %.0f%%" % (country.upper(), r * 100)

@mcp.prompt()
def invoice_check(country: str) -> str:
    """A prompt template for checking an invoice's tax treatment."""
    return ("Check this invoice for %s. Confirm the VAT rate is correct, "
            "convert the total to EUR, and flag anything inconsistent." % country.upper())

if __name__ == "__main__":
    mcp.run(transport="stdio")`,
      caption: "**`mcp.run(transport=stdio)` is the whole deployment** for a local server: it reads JSON-RPC frames from standard input and writes replies to standard output, so the host launches this file as a subprocess. Module 3 covers the other two transports." },

    { t: "dl", items: [
      ["`@mcp.tool()`", "Registers the function as model-callable. The parameter annotations become the input schema, the docstring's first line becomes the description, and the return value is serialised for the client. Section 02 of lesson 2.2 shows exactly how much of your intent survives that generation."],
      ["`@mcp.resource(uri)`", "Registers a readable address. A plain URI becomes a concrete resource that appears in `resources/list`; a URI with `{braces}` becomes a template whose parameters are passed to the function as arguments."],
      ["`@mcp.prompt()`", "Registers a template the user can invoke. The return value becomes the prompt's message content, and the function's parameters become the arguments a host collects before rendering it."]
    ] },

    { t: "callout", kind: "note", title: "Two different things are called FastMCP",
      body: [
        { t: "p", text: "`mcp.server.fastmcp.FastMCP` is bundled with the official SDK and is what this course uses. There is also a separate third-party package installed as `fastmcp`, now on its own major version, with a larger feature set — server composition, proxying, generated clients — and its own release cadence." },
        { t: "p", text: "They share a name and an ancestry, and the import line is the only way to tell which one a code sample is using. **When reading anything about FastMCP, check whether the import is `from mcp.server.fastmcp import FastMCP` or `from fastmcp import FastMCP`**, because the APIs have diverged and the second is not a dependency you get for free." }
      ] },

    { t: "h2", n: "02", text: "What a lifespan is for", id: "lifespan" },

    {"kind": "trace", "title": "One open, three calls, one close", "caption": "**`loaded_once` stays at 1 across three calls, which is the proof that setup ran once rather than per request** — and the `finally` is what guarantees the teardown, which is the reason to use a context manager rather than a module-level global. **Lifespan is per connection**, and lesson 1.1 measured that a stdio connection is its own process: so one database connection per host is correct here, and the same code under HTTP shares one process between callers, where a pool is right and a single connection is a bug that appears under load.", "left": "event", "codeW": 170, "vars": ["output", "what it proves"], "steps": [{"code": "connection opens", "state": ["[server] lifespan: opening", "once, before any request"], "tone": "accent"}, {"code": "call 1", "state": ["loaded_once: 1", "the context is reused"], "changed": [0, 1], "tone": "good"}, {"code": "call 2", "state": ["loaded_once: 1", "still the same object"], "changed": [0, 1], "tone": "good"}, {"code": "call 3", "state": ["loaded_once: 1", "setup did not re-run"], "changed": [0, 1], "tone": "good"}, {"code": "connection closes", "state": ["[server] lifespan: closing", "the finally block, guaranteed"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-2_1-02-1"},


    { t: "p", text: "The server above holds its rate table in a module-level dictionary, which is fine because it is a literal. Real servers need a database connection, an HTTP client, a loaded model or a credential — **and building one of those inside a tool means building it on every call.**" },

    { t: "p", text: "The `lifespan` argument takes an async context manager. Whatever it yields is available to every request for the life of the connection." },

    { t: "code", lang: "python", title: "setup once, teardown guaranteed",
      code: `import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass
from mcp.server.fastmcp import Context, FastMCP

@dataclass
class Deps:
    rates: dict
    opened: int

@asynccontextmanager
async def lifespan(server: FastMCP):
    print("[server] lifespan: opening", file=sys.stderr, flush=True)
    deps = Deps(rates={("GBP", "EUR"): 1.17}, opened=1)
    try:
        yield deps                 # whatever you yield becomes the context
    finally:
        print("[server] lifespan: closing", file=sys.stderr, flush=True)

mcp = FastMCP("lifespan-demo", lifespan=lifespan)

@mcp.tool()
def convert(amount: float, ctx: Context) -> dict:
    """Converts GBP to EUR using the rates loaded at startup."""
    deps = ctx.request_context.lifespan_context
    rate = deps.rates[("GBP", "EUR")]
    return {"amount": round(amount * rate, 2), "loaded_once": deps.opened}`,
      out: `[server] lifespan: opening
call 1 -> {   "amount": 117.0,   "loaded_once": 1 }
call 2 -> {   "amount": 117.0,   "loaded_once": 1 }
call 3 -> {   "amount": 117.0,   "loaded_once": 1 }
[server] lifespan: closing`,
      caption: "**One “opening”, three calls, one “closing”** — and `loaded_once` stays at 1, which is the proof that setup ran once rather than per request. The `finally` block is what guarantees the teardown, and it is the reason to use a context manager rather than a module-level global." },

    { t: "p", text: "Note the prints go to **stderr**. Over stdio, standard output is the protocol channel, so a stray `print()` in a server corrupts the message stream — section 04 returns to this because it is the most common way a new stdio server breaks." },

    { t: "callout", kind: "good", title: "Lifespan is per connection, not per server",
      body: [
        { t: "p", text: "Lesson 1.1 measured this: each stdio connection is its own process, so the lifespan runs once per connection and anything it opens belongs to that connection alone. **For a stdio server that is usually what you want** — one database connection per host, released when the host exits." },
        { t: "p", text: "For an HTTP server it is the thing to think about twice, because now several callers share one process. A connection pool in the lifespan is right; a single connection handed to concurrent requests is a bug that only appears under load. Lesson 3.2 covers the HTTP case." }
      ] },

    { t: "h2", n: "03", text: "What else the Context carries", id: "context" },

    {"kind": "trace", "title": "Six things on the Context, and two that need the client's permission", "caption": "**A `Context` parameter is filled server-side and never appears in the schema the model sees**, which is what makes it usable — the model is not asked to supply it. The measured `request_id=5` is the fifth request on the connection, counting the handshake and a `tools/list`. **And `client=mcp` is the warning:** that is the SDK client's default name, so `clientInfo.name` is weak evidence about who is calling you and no basis for a decision.", "left": "what you reach for", "codeW": 210, "vars": ["gives you", "requires"], "steps": [{"code": "ctx.request_context.lifespan_context", "state": ["whatever your lifespan yielded", "nothing - the main reason to take a Context"], "tone": "good"}, {"code": "ctx.request_id", "state": ["5 - monotonic per connection", "nothing"], "changed": [0, 1], "tone": "good"}, {"code": "ctx.session.client_params", "state": ["clientInfo and capabilities", "nothing - but the name said 'mcp'"], "changed": [0, 1], "tone": "warn"}, {"code": "await ctx.info / warning / error", "state": ["protocol log messages", "the client's logging capability"], "changed": [0, 1], "tone": "accent"}, {"code": "await ctx.report_progress", "state": ["a progress bar in the host", "a progress token from the caller"], "changed": [0, 1], "tone": "accent"}, {"code": "await ctx.read_resource", "state": ["your own resources, from a tool", "nothing"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-2_1-03-2"},


    { t: "p", text: "Declaring a parameter annotated `Context` gets your tool the request's metadata without it appearing in the schema the model sees — the SDK recognises the annotation and fills it in." },

    { t: "code", lang: "python", title: "the request, from inside the tool",
      code: `@mcp.tool()
async def report(ctx: Context) -> str:
    """Shows what else the Context carries."""
    return "request_id=%s client=%s" % (
        ctx.request_id,
        ctx.session.client_params.clientInfo.name if ctx.session.client_params else "?",
    )`,
      out: `report -> request_id=5 client=mcp`,
      caption: "`request_id=5` because this was the fifth request on the connection — the handshake, a `tools/list` and three calls preceded it. `client=mcp` is the default name the SDK's own client reports, which is worth knowing: **most clients do not set a useful `clientInfo.name`**, so it is weak evidence about who is calling you." },

    { t: "dl", items: [
      ["`ctx.request_context.lifespan_context`", "Whatever your lifespan yielded. The main reason to take a Context at all."],
      ["`ctx.request_id`", "Monotonic per connection. Useful in log lines so a caller's report can be matched to a request."],
      ["`ctx.session`", "The server-side session, including the client's declared capabilities and `clientInfo`. This is how a server discovers whether the client supports sampling or elicitation before attempting either."],
      ["`await ctx.info(...)`, `ctx.warning(...)`, `ctx.error(...)`", "Protocol-level log messages the client may surface — and only if the client declared the `logging` capability. Otherwise they go nowhere."],
      ["`await ctx.report_progress(...)`", "Progress notifications for a long call, which a host can render as a bar. Requires the caller to have sent a progress token."],
      ["`await ctx.read_resource(uri)`", "A server reading its own resources, so a tool and a resource can share one implementation."]
    ] },

    { t: "h2", n: "04", text: "The two ways a new stdio server breaks", id: "breaks" },

    {"kind": "flow", "title": "Two failures, one symptom, one diagnostic", "caption": "**Both present as “the client cannot talk to my server” and neither error message mentions printing or blocking.** A `print()` writes your text into the middle of a JSON-RPC stream, so the client's parser fails at a stream position that has nothing to do with the tool you were debugging — and a library logging to stdout, or a warning at import time, does identical damage. **The one-step diagnostic settles it:** run the server by hand and send nothing. It should sit silently on stdin, and anything on stdout before your first message is the bug.", "cols": 3, "nodes": [{"id": "p", "label": "print() in a tool", "sub": "or a library logging to stdout", "tone": "crit"}, {"id": "c", "label": "The stream is corrupted", "sub": "stdout IS the protocol channel", "tone": "crit"}, {"id": "b", "label": "A blocking call in a tool", "sub": "requests.get, a sync driver", "tone": "crit"}, {"id": "f", "label": "The whole connection freezes", "sub": "one event loop serves every request", "tone": "crit"}, {"id": "d", "label": "Run it by hand, send nothing", "sub": "any stdout output is the bug", "tone": "violet"}, {"id": "s", "label": "Log to stderr; await your IO", "sub": "asyncio.to_thread for sync libraries", "tone": "good"}], "edges": [["p", "c"], ["b", "f"], ["c", "d"], ["f", "d"], ["d", "s"]], "t": "diagram", "id": "dg-2_1-04-3"},


    { t: "p", text: "Both are mechanical, both are silent, and between them they account for most of the time lost on a first server." },

    { t: "code", lang: "python", title: "the print that corrupts the protocol",
      code: `@mcp.tool()
def convert(amount: float, frm: str, to: str) -> dict:
    """Converts an amount between two currencies."""
    print("converting", amount)             # WRONG over stdio: stdout is the wire
    ...

# Instead:
import logging, sys
log = logging.getLogger(__name__)
logging.basicConfig(stream=sys.stderr, level=logging.INFO)   # stderr, explicitly

@mcp.tool()
def convert_ok(amount: float, frm: str, to: str) -> dict:
    """Converts an amount between two currencies."""
    log.info("converting %s %s->%s", amount, frm, to)
    ...`,
      caption: "A `print()` writes a line of your text into the middle of a JSON-RPC stream. The client's parser then fails on something that is not a message, and the error it reports has nothing to do with the tool you were debugging. **Configure logging to stderr once, at the top of the file**, and never use `print` in a stdio server." },

    { t: "dl", items: [
      ["A blocking call in an async tool", "The server is one event loop. A synchronous `requests.get` or a blocking database driver inside a tool freezes every other request on that connection, which looks like the server hanging rather than like a slow tool. Use an async client, or `await asyncio.to_thread(...)` for a library with no async version."],
      ["stdout used for anything but the protocol", "Not just your own prints: a library that logs to stdout by default will do the same thing, and so will a warning printed at import time. If a server works when run by hand and fails under a host, this is the first thing to check."]
    ] },

    { t: "callout", kind: "trap", title: "The symptom never names the cause",
      body: [
        { t: "p", text: "Both failures present as *“the client cannot talk to my server”*, and neither error message mentions printing or blocking. **The diagnostic that settles it in one step is to run the server by hand and type nothing:** `python finance_server.py` should sit silently waiting for input on stdin. If anything at all appears on stdout before you send a message, that output is the bug." }
      ] },

    { t: "exercise", kind: "practice", title: "Build it, then break it deliberately", difficulty: "core", minutes: 26,
      prompt: "Write a server with one tool, one concrete resource, one resource template and one prompt, and confirm all four appear from a client. Then add a lifespan that prints on open and close and holds a counter, call a tool three times, and confirm the counter proves setup ran once. Finally break it twice on purpose: add a print() to a tool and record exactly what the client reports, then put a time.sleep(5) in one tool and call two tools concurrently to see the second wait. Fix both.",
      hints: [
        "The template needs braces in the URI and a matching function parameter.",
        "Print to stderr with flush=True, or you will not see lifespan output in order.",
        "For the concurrency test, use asyncio.gather on two different tool calls."
      ],
      solution: {
        notes: [
          { t: "p", text: "The print() failure is worth causing once because the error is so unhelpful. What you get is a parse failure from the client, naming a position in a stream rather than your tool — and once you have seen it, you will recognise it instantly the next time a server mysteriously stops working after someone adds a debug line." },
          { t: "p", text: "The sleep test makes the single-event-loop point concrete: both calls go to one process, so the blocking one holds the loop and the other waits behind it even though they are unrelated. With `asyncio.sleep` instead, the two overlap. That is the whole argument for async tools, and it is the same argument as in any async service." }
        ]
      } }

  ],

  takeaways: [
    "**Three decorators cover the three primitives:** `@mcp.tool()`, `@mcp.resource(uri)` and `@mcp.prompt()`, with a braced URI making a template rather than a concrete resource.",
    "**`mcp.run(transport=\"stdio\")` is the whole deployment** for a local server — the host launches the file as a subprocess and talks JSON-RPC over its stdin and stdout.",
    "**Two different things are called FastMCP:** the one bundled at `mcp.server.fastmcp` and a separate third-party package. The import line is the only way to tell which a code sample uses.",
    "**A lifespan runs setup once per connection** and its `finally` guarantees teardown — measured as one open, three calls with `loaded_once: 1`, one close.",
    "**Lifespan is per connection, which for stdio means per process.** For HTTP, several callers share it, so a pool is right and a single shared connection is a bug that appears under load.",
    "**A `Context` parameter is filled by the SDK and never appears in the model's schema**, and it carries the lifespan context, the request id, the client's capabilities, logging and progress.",
    "**`clientInfo.name` is weak evidence** — the SDK's own client reports `mcp` by default, so it is not a basis for any decision about who is calling.",
    "**`ctx.info` and friends only reach the client if it declared the `logging` capability**; otherwise they go nowhere.",
    "**Never `print()` in a stdio server.** stdout is the protocol channel, so a stray line corrupts the stream and the client's error names a stream position rather than your tool.",
    "**A blocking call in a tool freezes the whole connection**, because the server is one event loop — it looks like a hang rather than a slow tool.",
    "**The one-step diagnostic:** run the server by hand and type nothing. Anything on stdout before you send a message is the bug."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A tool prints a debug line with `print()`. The client now fails with a parse error naming a stream position. Why?",
        options: [
          "The print made the response too large",
          "Over stdio, stdout *is* the JSON-RPC channel — the printed line lands in the middle of the message stream and the client's parser fails on text that is not a message",
          "print() is not thread-safe",
          "The tool must return a string if it prints"
        ],
        answer: 1,
        why: "The error never mentions printing, which is what makes it expensive to debug. Configure logging to stderr at the top of the file, and remember that a library logging to stdout does exactly the same damage."
      },
      {
        stem: "A server opens a database connection inside each tool call. What does a lifespan change?",
        options: [
          "Nothing — the connection cost is the same",
          "Setup runs once per connection and teardown is guaranteed by the context manager's `finally`, so the connection is opened once rather than per call",
          "It makes the tools synchronous",
          "It shares the connection between hosts"
        ],
        answer: 1,
        why: "The measurement was one 'opening', three calls, one 'closing', with the counter staying at 1. The reason to use a context manager rather than a module-level global is precisely the guaranteed teardown."
      },
      {
        stem: "Why does a `Context` parameter not appear in the schema the model sees?",
        options: [
          "Because it has no type annotation",
          "The SDK recognises the Context annotation and fills it in server-side, so it is not part of the tool's declared interface",
          "Because it is always optional",
          "It does appear, and must be documented"
        ],
        answer: 1,
        why: "That is what makes it usable: a tool can reach the lifespan context, the request id and the client's capabilities without the model being asked to supply any of them. It is the main reason to take a Context at all."
      },
      {
        stem: "An HTTP-transport server puts a single database connection in its lifespan. What is the risk?",
        options: [
          "None — a lifespan is designed for exactly this",
          "Several callers now share one process, so concurrent requests share one connection — a bug that appears only under load. A pool belongs there instead",
          "The lifespan will run per request",
          "HTTP servers cannot use a lifespan"
        ],
        answer: 1,
        why: "For stdio the per-connection process makes one connection correct. HTTP changes the sharing model without changing the code, which is why the transport decision in module 3 reaches back into the server's design."
      },
      {
        stem: "A server calls `await ctx.info(\"starting\")` and the client never shows it. What is the likely reason?",
        options: [
          "Log messages are only emitted on error",
          "The client did not declare the `logging` capability, so protocol log messages have nowhere to go",
          "info is deprecated in favour of print",
          "The message exceeded the size limit"
        ],
        answer: 1,
        why: "It is the same capability-contract logic as in lesson 1.2, in the other direction: the server can only use what the client advertised. For diagnostics you need regardless of the client, log to stderr as well."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Walk me through writing a minimal MCP server.",
        strong: "Instantiate FastMCP with a name and instructions, then decorate functions: @mcp.tool() for model-callable operations, @mcp.resource(uri) for readable addresses — braces in the URI make it a template — and @mcp.prompt() for user-invoked templates. The annotations become the schema and the docstring becomes the description. Then mcp.run with a transport; stdio for local, which makes the server a subprocess of the host.",
        answer: [
          { t: "p", text: "The braces detail is a small thing that shows the API has actually been used rather than skimmed." },
          { t: "p", text: "A strong answer adds the lifespan unprompted, because any server worth writing needs setup that should not run per call, and the guaranteed teardown is the reason it is a context manager." },
          { t: "p", text: "Mentioning that stdout is the wire — so no print() — is the detail that saves the interviewer's team a day at some point." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague's stdio server works when they run it by hand but fails under the host. Where do you look?",
        strong: "stdout. Over stdio the protocol uses standard output, so anything else written there corrupts the stream — a print in a tool, a library that logs to stdout by default, or a warning emitted at import. The one-step check is to run the server and send nothing: it should sit silently on stdin, and any output at all before the first message is the bug.",
        answer: [
          { t: "p", text: "Naming import-time output and third-party logging, not just the obvious print, is what makes this a real debugging answer — those are the cases that survive a code review." },
          { t: "p", text: "The silent-startup check is the part worth remembering, because it converts a confusing client-side parse error into a one-command diagnosis." },
          { t: "p", text: "A good second candidate is a blocking call freezing the event loop, which presents as a hang rather than a parse failure. Distinguishing the two symptoms shows the difference between having read this and having debugged it." }
        ]
      },
      {
        level: "mid",
        q: "What is the difference between the FastMCP in the SDK and the fastmcp package?",
        strong: "They share a name and an ancestry and have diverged. `mcp.server.fastmcp.FastMCP` ships with the official SDK; `fastmcp` is a separate third-party package on its own major version with more features — composition, proxying, client generation — and its own release cadence and dependency. The import line is the only way to tell which one a code sample is using.",
        answer: [
          { t: "p", text: "This matters mostly for reading: a snippet that uses a method the bundled class does not have is usually written against the other package, and the error is a confusing AttributeError." },
          { t: "p", text: "The practical position is to start with the bundled one, since it is already a dependency, and to take the third-party package deliberately if you need something it adds rather than by copying a code sample." }
        ]
      }
    ]
  }
});
