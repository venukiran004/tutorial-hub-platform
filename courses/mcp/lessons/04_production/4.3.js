/* ============================================================================
   LESSON 4.3 — Testing a Server
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**A full client-and-server round trip, in process, with no subprocess and no port: 29.7 ms for the whole suite against 1201 ms for the same assertions over stdio.** That forty-fold difference is what decides whether a test suite runs on every save or before a release, which is the difference between a design tool and a gate. This lesson is the fixture, and the four things worth asserting that unit tests on your functions cannot reach.",

  objectives: [
    "Connect a client and server over memory streams with no subprocess",
    "Assert on the generated schema, not just the function's behaviour",
    "Test the error paths as results rather than as exceptions",
    "Catch a breaking interface change before a consumer does",
    "Say what still needs a real subprocess or a real port"
  ],

  prerequisites: ["2.3", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "The fixture", id: "fixture" },

    {"kind": "trace", "title": "Forty times faster, and that ratio is the whole argument", "caption": "**A suite that finishes in tens of milliseconds runs on every save; one taking a second per file runs before a release** — by which time the mistake has been built on. Almost all of the subprocess cost is interpreter startup, paid per test file at best and per test at worst. **The helper takes `mcp._mcp_server`**, the low-level object FastMCP wraps, which is the same private attribute lesson 1.2 used for the version and carries the same caveat.", "left": "measured", "codeW": 180, "vars": ["in process", "over a subprocess"], "steps": [{"code": "connect", "state": ["17.0 ms", "1088.1 ms"], "tone": "violet"}, {"code": "the whole suite", "state": ["29.7 ms", "1201.3 ms"], "changed": [0, 1], "tone": "violet"}, {"code": "what it spawns", "state": ["nothing - memory streams", "a Python interpreter"], "changed": [0, 1], "tone": "accent"}, {"code": "what it binds", "state": ["nothing - no port", "stdin and stdout pipes"], "changed": [0, 1], "tone": "accent"}, {"code": "so when does it run", "state": ["on every save", "before a release"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-4_3-01-0"},

    { t: "p", text: "The SDK ships a helper that wires a client session straight to a server object over in-memory streams. No process is spawned, no socket is opened, and the protocol path is the real one." },

    { t: "code", lang: "python", title: "a whole suite, executed",
      code: `import asyncio, json, time
from mcp.shared.memory import create_connected_server_and_client_session
from finance_server import mcp

async def main():
    t0 = time.perf_counter()
    async with create_connected_server_and_client_session(mcp._mcp_server) as session:
        init_done = time.perf_counter()

        tools = {t.name: t for t in (await session.list_tools()).tools}
        assert "convert" in tools, "convert must be exposed"
        schema = tools["convert"].inputSchema
        assert schema["required"] == ["amount", "frm", "to"], schema["required"]

        ok = await session.call_tool("convert", {"amount": 100, "frm": "GBP", "to": "EUR"})
        assert not ok.isError
        assert json.loads(ok.content[0].text)["amount"] == 117.0

        bad = await session.call_tool("convert", {"amount": "lots", "frm": "GBP", "to": "EUR"})
        assert bad.isError, "a wrong type must be an error result, not a raise"

        res = await session.read_resource("rates://current")
        assert "GBP->EUR" in res.contents[0].text

    print("  all assertions passed")
    print("  connect: %.1f ms, whole suite: %.1f ms"
          % ((init_done - t0) * 1000, (time.perf_counter() - t0) * 1000))

asyncio.run(main())`,
      out: `  all assertions passed
  connect: 17.0 ms, whole suite: 29.7 ms`,
      caption: "**17 ms to connect, 29.7 ms for everything.** Note `mcp._mcp_server`: the helper takes the low-level server object that `FastMCP` wraps — the same attribute lesson 1.2 used to set a version, and the same caveat applies, since it is not a supported interface." },

    { t: "code", lang: "python", title: "the same assertions over a subprocess",
      code: `params = StdioServerParameters(command=sys.executable, args=["finance_server.py"])
async with stdio_client(params) as (r, w):
    async with ClientSession(r, w) as s:
        await s.initialize()
        ...`,
      out: `  subprocess connect: 1088.1 ms
  whole suite: 1201.3 ms`,
      caption: "**Forty times slower, and almost all of it is the interpreter starting.** That cost is per test file at best and per test at worst, and it is what turns a suite you run constantly into one you run before a release — by which time the mistake has been built on." },

    { t: "callout", kind: "good", title: "As a pytest fixture",
      body: [
        { t: "p", text: "Wrap it once and every test gets a connected session:" },
        { t: "p", text: "`@pytest_asyncio.fixture` returning the context manager's session, with `mcp._mcp_server` as the argument. Tests then take `session` and read like a consumer — which is the point, because that is who you are testing for." }
      ] },

    { t: "h2", n: "02", text: "Assert on the schema, not the function", id: "schema" },

    {"kind": "trace", "title": "Four assertions a unit test cannot make", "caption": "**Call the function directly for its logic — that needs none of this machinery.** What needs a client is the part MCP generated, and that is where the regressions are. **The third row is the highest-value line in the file:** converting `Annotated[str, Field(description=...)]` back to `str` is a plausible tidy-up by someone who has not measured what a docstring contributes, and it changes no behaviour while removing the documentation from every consumer's prompt.", "left": "assert", "codeW": 190, "vars": ["catches", "a unit test sees it?"], "steps": [{"code": "'convert' in tools", "state": ["a decorator typo, a failed import", "no"], "tone": "good"}, {"code": "schema['required'] == {...}", "state": ["an argument made required", "no"], "changed": [0, 1], "tone": "good"}, {"code": "'description' in properties['frm']", "state": ["an Annotated converted back to str", "NO - behaviour unchanged"], "changed": [0, 1], "tone": "crit"}, {"code": "outputSchema is not None", "state": ["a typed return changed to dict", "no"], "changed": [0, 1], "tone": "good"}, {"code": "bad.isError", "state": ["a raise that escapes later", "no"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-4_3-02-1"},

    { t: "p", text: "The function is ordinary Python and you can call it directly; a unit test for `convert(100, \"GBP\", \"EUR\")` needs none of this machinery. **What needs a client is the part MCP generated**, and that is where the regressions are." },

    { t: "dl", items: [
      ["That the tool appears at all", "A typo in a decorator, a module that failed to import, a conditional registration that stopped firing — all of these produce a server that starts fine and is missing a tool. `assert \"convert\" in tools` catches it."],
      ["That the schema is what you meant", "Lesson 2.2 measured that a docstring contributes nothing. An assertion on `required`, on an `enum`, or on a parameter having a `description` is how you find out that somebody rewrote an `Annotated` into a plain annotation."],
      ["That a bad argument is an error result", "Lesson 2.3 measured that nothing raises client-side. A test asserting `bad.isError` documents the contract and catches the day someone adds a `raise` that escapes."],
      ["That your error shape is consistent", "If your convention is `{\"error\": ..., \"retryable\": ...}`, assert it on every tool's failure path. This is the one most likely to drift, because each tool is written at a different time."]
    ] },

    { t: "code", lang: "python", title: "the schema assertions worth writing",
      code: `async def test_convert_schema(session):
    tools = {t.name: t for t in (await session.list_tools()).tools}
    s = tools["convert"].inputSchema

    # The contract a consumer depends on.
    assert set(s["required"]) == {"amount", "frm", "to"}
    assert s["properties"]["amount"]["type"] == "number"

    # The things lesson 2.2 showed are easy to lose.
    assert "description" in s["properties"]["frm"], "Annotated/Field was dropped"
    assert s["properties"]["rounding"]["enum"] == ["up", "down", "nearest"]

    # And the output contract, if you promised one.
    assert tools["convert"].outputSchema is not None, "typed return was removed"`,
      caption: "Each of these fails on a change that is invisible to a unit test and visible to every consumer. **The third is the highest-value line in the file**, because converting `Annotated[str, Field(description=...)]` back to `str` is a plausible tidy-up by someone who has not read lesson 2.2." },

    { t: "h2", n: "03", text: "Testing what you promised", id: "promises" },

    {"kind": "flow", "title": "Asserting listChanged is False, on purpose", "caption": "**The assertion reads oddly and that is the design: it is not that False is correct forever, it is that changing it should be deliberate.** Declaring `listChanged` without sending notifications leaves a caching client holding a stale list for the whole connection, with nothing erroring — lesson 1.2's warning, in executable form. The test fails the day someone turns the flag on, and somebody has to confirm the notifications exist before they can make it pass.", "cols": 3, "nodes": [{"id": "a", "label": "assert listChanged is False", "sub": "a deliberately odd assertion", "tone": "violet"}, {"id": "s", "label": "Someone declares it True", "sub": "a reasonable-looking change", "tone": "warn"}, {"id": "f", "label": "The test fails", "sub": "and asks the question", "tone": "good"}, {"id": "c", "label": "Are notifications actually sent?", "sub": "per session - lesson 2.4", "tone": "good"}, {"id": "n", "label": "Without the test: a stale list, silently", "sub": "for the life of every connection", "tone": "crit"}], "edges": [["a", "s"], ["s", "f"], ["f", "c"], ["a", "n"]], "t": "diagram", "id": "dg-4_3-03-2"},

    { t: "p", text: "Lesson 1.2 made the point that capability flags are a contract. The same applies to everything else the handshake asserts, and the handshake is cheap to assert on." },

    { t: "code", lang: "python", title: "the handshake as a regression test",
      code: `async def test_handshake(session):
    init = session._init_result        # or capture it from initialize()
    assert init.serverInfo.name == "finance"
    assert init.instructions and "ECB" in init.instructions
    assert init.capabilities.tools is not None
    assert init.capabilities.resources is not None

    # If you declared listChanged, you have promised notifications.
    assert init.capabilities.tools.listChanged is False, \\
        "listChanged declared -- is anything actually sending notifications?"`,
      caption: "The last assertion is the useful one and reads oddly: **it asserts the flag is False precisely so that turning it on is a deliberate act** that fails a test and makes someone confirm the notifications exist. Lesson 1.2's warning in executable form." },

    { t: "h2", n: "04", text: "Catching a breaking change", id: "breaking" },

    {"kind": "compare", "title": "A fingerprint, and when it is worth the friction", "caption": "**It fails on any change to a name, a description, a schema or an output schema — including the ones you meant — and the failure message says what to do.** The point is that a change to your consumers' prompt cannot happen without somebody noticing. The executed version produced `43f8831a3a1bb42a`, stable across two calls. **For an internal server it will fail on every intentional edit and be updated without thought**, which is worse than not having it.", "columns": [{"title": "External consumers: worth it", "tone": "good", "items": ["A changed description is a changed prompt", "A renamed argument breaks their calls at runtime", "You cannot see who is calling you", "The test makes it a code-review conversation", "43f8831a3a1bb42a, stable"]}, {"title": "Your team only: probably not", "tone": "warn", "items": ["Fails on every intentional edit", "Gets updated without being read", "Worse than no test at all", "Assert the specifics instead", "required, enums, descriptions present"]}], "t": "diagram", "id": "dg-4_3-04-3"},

    { t: "p", text: "For a server other teams consume, the most valuable test is the one that fails when you change your public interface — because the alternative is their agent failing at runtime (lesson 4.4)." },

    { t: "code", lang: "python", title: "a snapshot of the interface",
      code: `import hashlib, json

def interface_fingerprint(tools):
    """Everything a consumer can see, in a stable order."""
    payload = [
        {
            "name": t.name,
            "description": t.description,
            "input": t.inputSchema,
            "output": t.outputSchema,
        }
        for t in sorted(tools, key=lambda t: t.name)
    ]
    blob = json.dumps(payload, sort_keys=True).encode()
    return hashlib.sha256(blob).hexdigest()[:16]

async def test_interface_unchanged(session):
    tools = (await session.list_tools()).tools
    assert interface_fingerprint(tools) == "43f8831a3a1bb42a", (
        "The public interface changed. If deliberate, bump the version, write a "
        "changelog entry, and update this hash."
    )`,
      out: `tools: ['convert', 'vat']
fingerprint: 43f8831a3a1bb42a
stable on a second call: 43f8831a3a1bb42a`,
      caption: "A deliberately annoying test. **It fails on any change to a name, a description, a schema or an output schema** — including the ones you meant — and the failure message tells you what to do. The point is that a change to your consumers' prompt cannot happen without somebody noticing." },

    { t: "callout", kind: "tradeoff", title: "Whether the fingerprint is worth the friction",
      body: [
        { t: "p", text: "**For a server with external consumers, yes.** A changed description is a changed prompt in somebody else's agent, and a renamed argument breaks their calls at runtime with no warning — this test is the cheapest way to make that a code-review conversation instead." },
        { t: "p", text: "**For a server only your team uses, probably not.** It will fail on every intentional edit and be updated without thought, which is worse than not having it. Assert on the specific things you promised instead: the `required` set, the enum values, the presence of descriptions." }
      ] },

    { t: "h2", n: "05", text: "What in-process testing cannot cover", id: "limits" },

    {"kind": "trace", "title": "What memory streams cannot see", "caption": "**The fixture exercises the protocol honestly and deliberately skips the transport**, so the whole stdout class is invisible to it — a `print()`, a library logging to stdout, an import-time warning. **The division that works:** everything about the protocol and the schemas in process, where it is cheap enough to run constantly, plus exactly one deliberate smoke test over stdio for about a second, because that is the only thing that catches a real process's problems.", "left": "not covered", "codeW": 190, "vars": ["instead"], "steps": [{"code": "stdout corruption", "state": ["run the server and send nothing - lesson 2.1"], "tone": "crit"}, {"code": "authentication and scopes", "state": ["an HTTP test; the token is a header"], "changed": [0], "tone": "warn"}, {"code": "origin and host checks", "state": ["curl against a running server - 403"], "changed": [0], "tone": "warn"}, {"code": "buffering in a proxy", "state": ["a long call through the deployed URL"], "changed": [0], "tone": "warn"}, {"code": "concurrency across callers", "state": ["two clients at once, over HTTP"], "changed": [0], "tone": "accent"}, {"code": "subprocess startup and env", "state": ["ONE stdio smoke test, ~1 second"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-4_3-05-4"},

    { t: "p", text: "The fixture exercises the protocol honestly and deliberately skips the transport, so some things are out of its reach and need naming." },

    { t: "table",
      head: ["Not covered", "What to do instead"],
      rows: [
        ["stdout corruption", "The one-step check from lesson 2.1: run the server and send nothing"],
        ["Authentication and scopes", "An HTTP test against a real app, since the token is a header"],
        ["Origin and host checks", "curl against a running server — lesson 3.2 measured 403"],
        ["Buffering in a proxy", "A long call through the deployed URL, not localhost"],
        ["Concurrency across callers", "Two clients at once against an HTTP server, where they share a process"],
        ["Subprocess startup and env", "One smoke test over stdio, accepting the second it costs"],
        ["Your lifespan's teardown under failure", "A test that raises mid-call and asserts the resource was released"]
      ] },

    { t: "callout", kind: "insight", title: "One slow test is worth having",
      body: [
        { t: "p", text: "Keep the fast suite fast and add **exactly one** test that spawns the server the way a host will: over stdio, as a subprocess, with the real command line. It costs a second or a few and it is the only thing that catches the whole class of failures in lesson 2.1 — a print on stdout, an import-time warning, a missing dependency in the packaged environment. **Make it fail on the client's log as well as on the result:** the Python SDK client logs a whole stray stdout line as `Failed to parse JSONRPC message from server` and skips it, so a smoke test that only checks the call passes with a print in the server." },
        { t: "p", text: "That is the division that works: everything about the protocol and the schemas in process, where it is cheap enough to run constantly, and one deliberate smoke test for the things only a real process has." }
      ] },

    { t: "callout", kind: "trap", title: "Testing the functions and not the generated schema",

      body: [

        { t: "p", text: "Unit tests that call your tool functions directly pass after a change that removes every parameter description from the schema, because the functions still work. What the model sees has changed and nothing failed." },

        { t: "p", text: "Test through an in-process client and assert on the tool list, required fields, parameter descriptions and enums — the parts MCP generates." }

      ] },


    { t: "exercise", kind: "practice", title: "Build the suite, then break the server", difficulty: "core", minutes: 28,
      prompt: "Write a pytest fixture using create_connected_server_and_client_session and a suite asserting: the tool list, the required set, a parameter description, an enum, an outputSchema, a successful call, and a wrong-type call returning isError. Time it. Then break the server four ways and confirm which tests catch which: rename a tool, convert an Annotated parameter back to a plain annotation, change a Pydantic return to a dict, and add a print() to a tool. Finally add one stdio smoke test and record what it costs.",
      requirements: [
        "Write a pytest fixture using create_connected_server_and_client_session",
        "Assert the tool list, the required set, a parameter description, an enum, an outputSchema, a successful call and a wrong-type call",
        "Time the suite",
        "Break the server four ways and record which tests catch which",
        "Add one stdio smoke test and record what it costs"
      ],
      hints: [
        "The Annotated change is the one a unit test on the function cannot see.",
        "The print() is the one no in-process test catches — that is the lesson.",
        "Expect the whole in-process suite well under 100 ms."
      ],
      solution: {
        lang: "python", title: "test_finance.py + run_breaks.py",
        code: `"""pytest test_finance.py  -- set BREAK=rename|plain|dict|print to break the server one way at a time."""
import json, os, sys, time
from typing import Annotated, Literal
import pytest
from pydantic import BaseModel, Field
from mcp.server.fastmcp import FastMCP

BREAK = os.environ.get("BREAK", "")
mcp = FastMCP("finance")
RATES = {("GBP", "EUR"): 1.17, ("EUR", "GBP"): 0.85}

class Conversion(BaseModel):
    amount: float
    currency: str

Currency = Literal["GBP", "EUR"]
if BREAK == "plain":
    def convert(amount: float, frm: str, to: str) -> Conversion:
        """Convert an amount between currencies."""
        return Conversion(amount=round(amount * RATES[(frm, to)], 2), currency=to)
elif BREAK == "dict":
    def convert(amount: Annotated[float, Field(gt=0, description="Amount in the source currency")],
                frm: Currency, to: Currency) -> dict:
        """Convert an amount between currencies."""
        return {"amount": round(amount * RATES[(frm, to)], 2), "currency": to}
else:
    def convert(amount: Annotated[float, Field(gt=0, description="Amount in the source currency")],
                frm: Currency, to: Currency) -> Conversion:
        """Convert an amount between currencies."""
        if BREAK == "print": print("converting", flush=True)
        return Conversion(amount=round(amount * RATES[(frm, to)], 2), currency=to)
mcp.tool(name="convert_currency" if BREAK == "rename" else "convert")(convert)

if __name__ == "__main__":            # \`python test_finance.py\` serves over stdio for the smoke test
    mcp.run(); sys.exit()

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.shared.memory import create_connected_server_and_client_session

@pytest.fixture
def anyio_backend(): return "asyncio"

@pytest.fixture
async def session():
    async with create_connected_server_and_client_session(mcp) as s:
        yield s

async def tool(s, name="convert"):
    return {t.name: t for t in (await s.list_tools()).tools}[name]

@pytest.mark.anyio
async def test_tool_list(session):
    assert [t.name for t in (await session.list_tools()).tools] == ["convert"]

@pytest.mark.anyio
async def test_required(session):
    assert (await tool(session)).inputSchema["required"] == ["amount", "frm", "to"]

@pytest.mark.anyio
async def test_parameter_description(session):
    assert (await tool(session)).inputSchema["properties"]["amount"]["description"] == "Amount in the source currency"

@pytest.mark.anyio
async def test_enum(session):
    assert (await tool(session)).inputSchema["properties"]["frm"]["enum"] == ["GBP", "EUR"]

@pytest.mark.anyio
async def test_output_schema(session):
    assert set((await tool(session)).outputSchema["properties"]) == {"amount", "currency"}

@pytest.mark.anyio
async def test_successful_call(session):
    r = await session.call_tool("convert", {"amount": 100, "frm": "GBP", "to": "EUR"})
    assert not r.isError and r.structuredContent == {"amount": 117.0, "currency": "EUR"}

@pytest.mark.anyio
async def test_wrong_type_is_error_result(session):
    r = await session.call_tool("convert", {"amount": "lots", "frm": "GBP", "to": "EUR"})
    assert r.isError

@pytest.mark.anyio
async def test_stdio_smoke(caplog):
    # The Python SDK client LOGS a stray stdout line and skips it, so the call still succeeds:
    # the smoke test must fail on that log record, not just on the call result.
    caplog.set_level("ERROR", logger="mcp.client.stdio")
    t0 = time.perf_counter()
    params = StdioServerParameters(command=sys.executable, args=[__file__], env={**os.environ})
    async with stdio_client(params) as (r, w), ClientSession(r, w) as s:
        await s.initialize()
        res = await s.call_tool("convert", {"amount": 1, "frm": "GBP", "to": "EUR"})
        assert not res.isError
    bad = [r for r in caplog.records if "Failed to parse JSONRPC message" in r.getMessage()]
    assert not bad, f"server wrote {len(bad)} non-protocol line(s) to stdout"
    print(f"stdio smoke test: {(time.perf_counter() - t0) * 1000:.0f} ms")

# ---- run_breaks.py: run the suite healthy and once per break ----
"""Runs test_finance.py once healthy and once per break, and reports which tests catch which break."""
import os, re, subprocess, sys, time

for brk in ["", "rename", "plain", "dict", "print"]:
    t0 = time.perf_counter()
    r = subprocess.run([sys.executable, "-m", "pytest", "test_finance.py", "-q", "-p", "no:cacheprovider", "-s", "-W", "ignore"],
                       env={**os.environ, "BREAK": brk}, capture_output=True, text=True)
    failed = sorted(set(re.findall(r"FAILED test_finance.py::(\\w+)", r.stdout)))
    summary = r.stdout.strip().splitlines()[-1]
    smoke = re.search(r"stdio smoke test: (\\d+) ms", r.stdout)
    print(f"{brk or 'healthy':<8} {summary:<40} wall {time.perf_counter() - t0:4.1f}s"
          + (f"  (stdio smoke {smoke.group(1)} ms)" if smoke else ""))
    for name in failed: print(f"           caught by {name}")`,
        out: `healthy  8 passed in 5.28s                        wall 15.5s  (stdio smoke 3579 ms)
rename   7 failed, 1 passed in 5.97s              wall 16.1s
           caught by test_enum
           caught by test_output_schema
           caught by test_parameter_description
           caught by test_required
           caught by test_stdio_smoke
           caught by test_successful_call
           caught by test_tool_list
plain    2 failed, 6 passed in 5.53s              wall 15.6s  (stdio smoke 3158 ms)
           caught by test_enum
           caught by test_parameter_description
dict     2 failed, 6 passed in 5.65s              wall 15.8s  (stdio smoke 3252 ms)
           caught by test_output_schema
           caught by test_successful_call
print    1 failed, 7 passed in 5.93s              wall 16.1s
           caught by test_stdio_smoke`,
       
        notes: [
          { t: "p", text: "The four breakages map cleanly: the rename fails the tool-list assertion, the Annotated removal fails the description assertion, the dict return fails the outputSchema assertion — and the print() passes everything, because in-memory streams are not stdout. That last one is the argument for the single smoke test — and the smoke test only catches it if it asserts that the client logged no parse failures, because the call itself still succeeds. Measured: with that assertion the print fails exactly one test, the smoke test; without it, all eight pass. It is better learned here than from a host." },
          { t: "p", text: "The Annotated case is the one to dwell on, because it is the realistic regression: nothing about the function's behaviour changed, every unit test still passes, and every consumer's model just lost the documentation for that parameter. Only an assertion on the generated schema sees it." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: the tidy-up that removed every parameter description",
      body: [
        { t: "p", text: "**Symptom.** Two consuming teams reported in the same week that their agents had started passing dates in the wrong format to a scheduling server. The server's own test suite was green and its functions had not changed behaviour." },
        { t: "p", text: "**Mechanism.** A refactor replaced `Annotated[str, Field(description=\"ISO 8601 date, e.g. 2026-03-01\")]` with plain `str` across the module, on the grounds that the descriptions duplicated the docstrings. The functions were identical; the generated schemas lost every parameter description, so the format guidance vanished from each consumer's prompt. Unit tests call the function, and the function was fine." },
        { t: "p", text: "**Why it was missed.** The suite tested what the team wrote and not what MCP generated from it. A schema regression has no failing call to observe — the tool still works when given a correct argument." },
        { t: "p", text: "**Fix.** An in-process client fixture now asserts, for every tool, the required set, that each parameter carries a description, and the enum values, and a fingerprint of the full tool list fails the build when the public surface changes unannounced. At about 30 ms for the suite it runs on every save." }
      ] }
  ],

  takeaways: [
    "**`create_connected_server_and_client_session` wires a client to a server over memory streams** — no subprocess, no port, and the real protocol path.",
    "**Measured: 17 ms to connect and 29.7 ms for the whole suite, against 1088 ms and 1201 ms over stdio** — forty times, almost all of it interpreter startup.",
    "**That ratio decides whether a suite runs on every save or before a release**, which is the difference between a design tool and a gate.",
    "**Unit-test the function directly; use a client for what MCP generated.** The regressions live in the generated part.",
    "**Assert that the tool appears**, because a decorator typo or a failed import produces a server that starts fine and is missing a tool.",
    "**Assert that a parameter has a `description`** — converting `Annotated[str, Field(...)]` back to `str` is a plausible tidy-up that silently removes documentation from every consumer's prompt.",
    "**Assert that a bad argument returns `isError`**, documenting the contract from lesson 2.3 and catching a `raise` that escapes later.",
    "**Assert `listChanged is False`** so that turning it on is a deliberate act someone has to justify.",
    "**An interface fingerprint over names, descriptions and schemas** makes any change to your consumers' prompt a code-review conversation — worth the friction for external consumers, not for your own team.",
    "**In-process testing cannot see stdout corruption**, authentication, origin checks, proxy buffering or cross-caller concurrency.",
    "**Add exactly one stdio smoke test.** It costs about a second and is the only thing that catches a print on stdout, an import-time warning, or a missing dependency in the packaged environment."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why test through a client session at all, when the tool is an ordinary Python function you can call directly?",
        options: ["Because tool functions cannot be called directly in Python", "The regressions live in what MCP generates from the function", "Because a client session runs faster than a direct call", "To test the transport layer rather than the tools"],
        answer: 1,
        why: "Call the function directly for its logic; that needs no machinery. What a unit test cannot see is a decorator typo, a dropped Annotated, or a changed required set — all of which are invisible to the function and visible to every consumer."
      },
      {
        stem: "In-process testing was 29.7 ms against 1201 ms over a subprocess. Why does that gap matter beyond convenience?",
        options: ["It does not matter, because both are fast enough", "A fast suite runs on every save; a slow one only before release", "Because CI providers bill by the second of runtime", "Because subprocess tests give less accurate results"],
        answer: 1,
        why: "Almost all of the subprocess cost is interpreter startup, paid per file at best. Speed is what makes a suite a design tool rather than a gate, which is the same argument as for any fast test suite."
      },
      {
        stem: "Someone converts `frm: Annotated[str, Field(description=\"ISO 4217 code\")]` to `frm: str`. Which test catches it?",
        options: ["A unit test that calls the function directly", "An assertion that the schema property has a description", "A smoke test that runs the server over stdio", "None, because this change is not a regression"],
        answer: 1,
        why: "It is the realistic regression and it is a plausible tidy-up by someone who has not measured what a docstring contributes. Every unit test still passes while every consumer's model loses the documentation for that parameter."
      },
      {
        stem: "Why assert that `capabilities.tools.listChanged is False`?",
        options: ["Because listChanged is deprecated in the current revision", "So enabling it fails a test until notifications are sent", "Because a true value breaks older client implementations", "To make the initialise handshake measurably faster"],
        answer: 1,
        why: "It is lesson 1.2's warning in executable form. The assertion reads oddly on purpose: it is not that False is correct forever, it is that the change should be deliberate rather than incidental."
      },
      {
        stem: "A tool has a `print()` added to it. Which test catches that?",
        options: ["The schema assertions, which see the changed function", "Only a smoke test that spawns the server over stdio", "The isError assertion, which sees the corrupted result", "The interface fingerprint, which hashes the function body"],
        answer: 1,
        why: "This is the argument for keeping exactly one slow test. It costs about a second and catches the whole class from lesson 2.1: a print on stdout, an import-time warning, or a dependency missing from the packaged environment."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How would you test an MCP server?",
        strong: "Two layers. The functions themselves as ordinary unit tests, with no MCP involved. Then a client session over in-memory streams — create_connected_server_and_client_session — asserting on what the framework generated: that the tool appears, that the schema's required set and enums and descriptions are what I meant, that an outputSchema exists if I promised one, and that a bad argument comes back as isError rather than raising. That suite ran in about 30 ms against 1.2 seconds over a subprocess.",
        answer: [
          { t: "p", text: "The split between testing the function and testing the generated interface is the structure of the answer, and it is what makes the suite worth writing at all." },
          { t: "p", text: "Having the timing to hand turns a preference into an argument: forty times is the difference between running on save and running before a release." }
        ]
      },
      {
        level: "advanced",
        q: "What would you assert that most people do not?",
        strong: "That each parameter still has a description in the generated schema. Converting an Annotated with Field back to a plain annotation is a plausible tidy-up that changes no behaviour, passes every unit test, and silently removes the documentation from every consumer's prompt. For a server with external consumers I would also fingerprint the whole interface — names, descriptions, schemas — so any change to their prompt has to be acknowledged in a code review.",
        answer: [
          { t: "p", text: "The Annotated regression is a specific, realistic failure rather than a general principle, which is what makes the answer credible." },
          { t: "p", text: "The fingerprint answer is stronger for naming when not to use it: on an internal server it fails on every intentional edit and gets updated without thought, which is worse than not having it." }
        ]
      },
      {
        level: "advanced",
        q: "What can in-process tests not tell you?",
        strong: "Anything about the transport. stdout corruption from a print or an import-time warning, because memory streams are not stdout. Authentication and scopes, because the token is a header. The origin and host checks. Proxy buffering, which is invisible against localhost. And concurrency between callers, since over HTTP they share a process. So I keep the fast suite fast and add exactly one stdio smoke test for about a second, because it covers the whole stdout class.",
        answer: [
          { t: "p", text: "Knowing the boundary of your own test strategy is the point, and the stdout case is the one with the most expensive symptom relative to its cause." },
          { t: "p", text: "The 'exactly one' is the detail that shows judgement — it resists the pull towards testing everything slowly while still covering the class that only a real process exposes." }
        ]
      }
    ]
  }
});
