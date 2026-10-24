/* ============================================================================
   LESSON 2.3 — Five Ways a Call Fails
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "**Five different failures, and not one of them raises on the client.** They all come back as a result, four of them with `isError` set — and the fifth, a tool that returns its own error payload, comes back with `isError: False` because nothing went wrong as far as the protocol is concerned. That gap between *execution failed* and *the answer is bad* is the thing to understand, along with a disclosure problem: a raised exception sends its message verbatim to whoever called you.",

  objectives: [
    "Predict what a client sees for each of the five failure paths",
    "Explain what isError actually tracks",
    "Stop exception text from reaching a caller you do not control",
    "Return an error a model can act on rather than one it will retry",
    "Decide where validation belongs"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "All five, executed", id: "five" },

    {"kind": "trace", "title": "Five failures, nothing raised on the client", "caption": "**Four results carry `isError: True`; the fifth is an ordinary successful call whose payload happens to describe a failure.** Read the fourth row closely — the exception's own message crossed the process boundary verbatim, which on a published server means handing hostnames, ports and file paths to a caller you may not know. And note that Pydantic validation happens server-side, so the full validation error text travels too.", "left": "what the client did", "codeW": 190, "vars": ["isError", "content"], "steps": [{"code": "called a tool that does not exist", "state": ["True", "'Unknown tool: nope'"], "tone": "warn"}, {"code": "omitted a required argument", "state": ["True", "the full Pydantic validation error"], "changed": [1], "tone": "warn"}, {"code": "sent the wrong type", "state": ["True", "'Input should be a valid number...'"], "changed": [1], "tone": "warn"}, {"code": "hit a tool that raises", "state": ["True", "'...explode: upstream timed out'"], "changed": [1], "tone": "crit"}, {"code": "hit a tool returning an error dict", "state": ["FALSE", "{'error': ..., 'retryable': false}"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-2_3-01-0"},


    { t: "p", text: "One server, one client, five calls. The tool `convert` takes an amount and two currency codes; `explode` raises a `ConnectionError`." },

    { t: "code", lang: "python", title: "the client, and what came back",
      code: `async def show(session, label, name, args):
    print("--- %s" % label)
    try:
        r = await session.call_tool(name, args)
        print("    isError    :", r.isError)
        for c in r.content:
            print("    content    : %s %r" % (c.type, getattr(c, "text", None)))
    except Exception as e:
        print("    RAISED %s: %s" % (type(e).__name__, e))

await show(session, "a tool that does not exist", "nope", {})
await show(session, "a required argument missing", "convert", {"amount": 1})
await show(session, "wrong type for an argument", "convert",
           {"amount": "lots", "frm": "GBP", "to": "EUR"})
await show(session, "the tool body raises", "explode", {})
await show(session, "the tool returns an error dict", "convert",
           {"amount": 1, "frm": "GBP", "to": "XXX"})`,
      out: `--- a tool that does not exist
    isError    : True
    content    : text 'Unknown tool: nope'
--- a required argument missing
    isError    : True
    content    : text "Error executing tool convert: 2 validation errors for convertArguments
                       frm\\n  Field required [type=missing, input_value={'amount': 1}, ...
--- wrong type for an argument
    isError    : True
    content    : text 'Error executing tool convert: 1 validation error for convertArguments
                       amount\\n  Input should be a valid number, unable to parse string ...
--- the tool body raises
    isError    : True
    content    : text 'Error executing tool explode: upstream timed out'
--- the tool returns an error dict
    isError    : False
    content    : text '{\\n  "error": "no rate for GBP->XXX",\\n  "retryable": false\\n}'`,
      caption: "**Nothing raised on the client.** Four results carry `isError: True` with a human-readable message, and the fifth — a perfectly ordinary successful call whose payload happens to describe a failure — carries `isError: False`." },

    { t: "h2", n: "02", text: "What isError actually tracks", id: "iserror" },

    {"kind": "compare", "title": "Execution failed, or the answer is bad", "caption": "**The split is correct and it needs a convention.** “I could not run your tool” and “I ran it and there is no rate for XXX” are genuinely different facts, and collapsing them would lose information — a missing rate is not a malfunction. But it means **the semantic error channel is yours to define and the protocol will not help you be consistent.** Pick one shape for the whole server, document it in the instructions, and use it everywhere: a server where half the tools return an error key and the other half a status key is one a model handles badly for no reason.", "columns": [{"title": "isError: True", "tone": "warn", "items": ["The tool did not execute", "No such tool", "Arguments failed validation", "An exception escaped your function", "The content is a message, not your return value"]}, {"title": "isError: False", "tone": "violet", "items": ["Your function ran and returned", "The payload may still describe a failure", "A consumer checking only the flag calls it good", "So the error shape is yours to define", "One shape, server-wide, documented"]}], "t": "diagram", "id": "dg-2_3-02-4"},

    { t: "p", text: "The flag means **the tool did not execute successfully**. It does not mean the answer is bad, and it does not mean the caller got what it wanted." },

    { t: "dl", items: [
      ["isError: True", "The call did not complete: no such tool, arguments that failed validation, or an exception escaping your function. The content is a message, not your return value."],
      ["isError: False", "Your function ran and returned. Whether what it returned is useful is a question about your payload, which the protocol has no opinion about."]
    ] },

    { t: "p", text: "So a client cannot use `isError` alone to decide whether a call achieved anything. **A tool that returns `{\"error\": \"no rate for GBP->XXX\"}` succeeded**, and a consumer checking only the flag will treat that as a good result and pass the dictionary to the model as if it were data." },

    { t: "callout", kind: "insight", title: "That is the right design, and it needs a convention",
      body: [
        { t: "p", text: "The split is correct: *“I could not run your tool”* and *“I ran it and the answer is that there is no rate”* are genuinely different, and collapsing them would lose information. A missing rate is not a malfunction." },
        { t: "p", text: "But it means the semantic error channel is **yours to define**, and the protocol will not help you be consistent. Pick one shape for your whole server — an `error` key and a `retryable` flag is a reasonable default — document it in the server's instructions, and use it everywhere. A server where half the tools return `{\"error\": ...}` and the other half return `{\"status\": \"failed\"}` is one a model handles badly for no reason." }
      ] },

    { t: "h2", n: "03", text: "The disclosure problem", id: "disclosure" },

    {"kind": "flow", "title": "The exception message is the leak, and the fix is four lines", "caption": "**A database error names the host and port, a file error names the path, an HTTP error names the internal service** — messages written by developers for developers, now handed to whoever called the server. The `ref` is what makes the replacement useful rather than merely safe: a consumer quotes it in a support request and you find the stack trace. **The dividing line is simply whether the caller is you:** for a server you alone consume, let it raise, because the trace is the most useful thing available at that moment.", "cols": 3, "nodes": [{"id": "r", "label": "An unguarded exception", "sub": "'connection to prod-db-3.internal:5432'", "tone": "crit"}, {"id": "l", "label": "It reaches the caller verbatim", "sub": "hostnames, ports, paths, service names", "tone": "crit"}, {"id": "c", "label": "catch, log with a ref id", "sub": "log.exception(... ref=%s ...)", "tone": "good"}, {"id": "s", "label": "Return a sentence plus the ref", "sub": "'the order service is unavailable'", "tone": "good"}, {"id": "f", "label": "isError flips to False", "sub": "a deliberate trade - document the shape", "tone": "violet"}, {"id": "o", "label": "Only you consume it? Let it raise", "sub": "the trace beats a sentence", "tone": "accent"}], "edges": [["r", "l"], ["l", "c"], ["c", "s"], ["s", "f"], ["l", "o"]], "t": "diagram", "id": "dg-2_3-03-1"},


    { t: "p", text: "Look again at the fourth result: `Error executing tool explode: upstream timed out`. **The exception's message crossed the process boundary verbatim.** That string was written by a developer for a developer, and it has just been handed to whoever called the server." },

    { t: "code", lang: "python", title: "what an unguarded exception can leak",
      code: `# Each of these raises a message that goes straight to the caller.
await conn.execute(...)
# -> 'connection to server at "prod-db-3.internal" (10.0.4.21), port 5432 failed'

requests.get(f"{INTERNAL_API}/customers/{cid}").raise_for_status()
# -> '404 Client Error for url: http://billing-svc.internal:8080/customers/9912'

open(CONFIG_PATH).read()
# -> "[Errno 2] No such file or directory: '/opt/app/secrets/prod.env'"

row["cutomer_id"]
# -> "KeyError: 'cutomer_id'"   plus, in some drivers, the row's contents`,
      caption: "Hostnames, internal addresses, ports, file paths, service names and sometimes data. **Over stdio on your own laptop that is a convenience; on a published HTTP server it is reconnaissance** handed to a caller who may be in another company." },

    { t: "code", lang: "python", title: "the boundary that stops it",
      code: `import logging, uuid
log = logging.getLogger(__name__)

@mcp.tool()
async def lookup(order_id: str) -> dict:
    """Returns an order's status and shipping date."""
    try:
        return await _lookup(order_id)
    except (TimeoutError, ConnectionError):
        ref = uuid.uuid4().hex[:8]
        log.warning("lookup failed ref=%s order=%s", ref, order_id, exc_info=True)
        return {"error": "the order service is unavailable",
                "retryable": True, "ref": ref}
    except Exception:
        ref = uuid.uuid4().hex[:8]
        log.exception("lookup bug ref=%s order=%s", ref, order_id)
        return {"error": "internal error", "retryable": False, "ref": ref}`,
      caption: "**The real exception goes to your logs with a reference; a sentence goes to the caller.** The `ref` is what makes the pair useful — a consumer can quote it in a support request, and you can find the stack trace. Note that this converts the failure into `isError: False`, which is the deliberate trade: you have chosen to report it semantically rather than as an execution failure." },

    { t: "callout", kind: "tradeoff", title: "Whether to catch at all",
      body: [
        { t: "p", text: "**For a server you alone consume, do not bother.** The raw exception is the most useful thing that can happen to you, `isError: True` is the honest signal, and adding a translation layer costs you the stack trace at the only moment you want it." },
        { t: "p", text: "**For a published server, catch everything.** You do not know who is reading the message, your internal hostnames are not theirs to see, and an unhandled exception is a worse experience than a sentence plus a reference. The dividing line is simply whether the caller is you." }
      ] },

    { t: "h2", n: "04", text: "An error a model can act on", id: "actionable" },

    {"kind": "trace", "title": "An error a model can act on", "caption": "**`retryable` is the highest-value field there is**, because without it a model will cheerfully call the same tool with the same arguments three times and each attempt is a full round trip. **The third row is the general principle:** anything the schema can reject never becomes a failed call at all, so a constraint beats an error message. And never return “invalid input” — it says something was wrong and nothing about what, so the model's only remaining move is to guess differently.", "left": "situation", "codeW": 170, "vars": ["poor", "better"], "steps": [{"code": "unsupported currency", "state": ["'invalid input'", "'supported: EUR, USD, GBP' + retryable false"], "tone": "crit"}, {"code": "upstream briefly down", "state": ["'Error: 503'", "a sentence + retryable TRUE"], "changed": [0, 1], "tone": "warn"}, {"code": "argument out of range", "state": ["'amount must be positive'", "gt=0 in the schema - no call happens"], "changed": [0, 1], "tone": "violet"}, {"code": "caller not permitted", "state": ["'Forbidden'", "'only returns the caller's own orders'"], "changed": [0, 1], "tone": "warn"}, {"code": "rate limited", "state": ["'429'", "'retry after 30s' + retryable true"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-2_3-04-2"},


    { t: "p", text: "When the caller is a language model, the error message is an instruction about what to do next — so the useful question is what the model should do differently." },

    { t: "table",
      head: ["Situation", "A poor error", "A better one"],
      rows: [
        ["Unsupported currency", "`invalid input`", "`no rate for GBP->XXX; supported: EUR, USD, GBP` with `retryable: false`"],
        ["Upstream briefly down", "`Error: 503`", "`the rate service is unavailable` with `retryable: true`"],
        ["Argument out of range", "`amount must be positive`", "A `gt=0` constraint in the schema, so the call never happens"],
        ["Caller not permitted", "`Forbidden`", "`this tool only returns the caller's own orders` with `retryable: false`"],
        ["Rate limited", "`429`", "`rate limit reached; retry after 30s` with `retryable: true`"]
      ] },

    { t: "dl", items: [
      ["Say whether retrying helps", "The single most valuable field. Without it a model will cheerfully call the same tool with the same arguments three times, and each attempt is a round trip."],
      ["List the valid options when the set is small", "`supported: EUR, USD, GBP` converts a failed call into a correct one. Enumerating a thousand values does not, which is what the schema's `enum` is for."],
      ["Prefer a constraint to an error", "The third row is the general principle: anything the schema can reject never becomes a failed call at all. Validation in the body is the fallback, not the plan."],
      ["Never say \"invalid input\"", "It tells the model that something was wrong and nothing about what, so its only move is to guess differently."]
    ] },

    { t: "h2", n: "05", text: "Where validation belongs", id: "validation" },

    {"kind": "layers", "title": "Three layers, and only the last one is authorisation", "caption": "**The protocol encourages conflating validation with authorisation, and they are different.** A schema constraint stops a malformed call; it does not stop a well-formed call that should not be allowed — `order_id` matching a pattern says nothing about whether this caller may read that order, and nothing in MCP even carries who the caller is. **So keep the layers straight:** the schema is for shape, the body for business rules, and the system behind the tool for permission. The last is the only one an attacker cannot talk past.", "items": [{"label": "The schema, via Field constraints", "sub": "gt, bounds, pattern, Literal - before your function runs", "tone": "good", "side": "shape"}, {"label": "Your function body", "sub": "cross-field rules, existence checks - return your error shape", "tone": "accent", "side": "rules"}, {"label": "The system behind the tool", "sub": "the database must refuse it too", "tone": "crit", "side": "permission"}, {"label": "And a check in the body with an admin credential behind it", "sub": "has enforced nothing at all", "tone": "crit", "side": "not a control"}], "t": "diagram", "id": "dg-2_3-05-3"},


    { t: "p", text: "Three layers can reject a bad argument, and they are not interchangeable." },

    { t: "dl", items: [
      ["The schema, via Field constraints", "Cheapest and earliest. `gt=0`, `Literal`, `max_length` and `pattern` are enforced before your function is entered, and the second and third results above show the SDK's Pydantic validation producing a clean rejection with no code of yours involved."],
      ["Your function body", "For anything the schema cannot express: a cross-field rule, a value that must exist in a database, a date that must be in the future. Return your error shape rather than raising."],
      ["The system behind the tool", "The last line and the only real one. A tool that checks a caller's permission in Python and then issues a query with an admin credential has not enforced anything — the database must also refuse."]
    ] },

    { t: "callout", kind: "warn", title: "Validation in the tool is not authorisation",
      body: [
        { t: "p", text: "It is worth separating the two now because the protocol encourages conflating them. **A schema constraint stops a malformed call; it does not stop a well-formed call that should not be allowed.** `order_id` matching a pattern says nothing about whether this caller may read that order, and nothing in MCP carries who the caller is (lesson 4.2)." },
        { t: "p", text: "So keep the layers straight: the schema is for shape, the body is for business rules, and the database or downstream service is for permission. The third is the only one an attacker cannot talk their way past." }
      ] },

    { t: "exercise", kind: "practice", title: "Reproduce all five, then make them good", difficulty: "core", minutes: 26,
      prompt: "Build a server with a working tool and a tool that raises. From a client, reproduce all five failure paths and record isError and the content for each — confirm nothing raises client-side. Then: replace the raising tool's unguarded exception with a caught version returning a sentence plus a reference id, and confirm the real exception is in your logs and not in the client's result. Add a retryable flag to every error your tools return. Finally, move one body-level validation into a Field constraint and confirm the rejection now happens before your function runs.",
      hints: [
        "Have the raising tool include a hostname in its message, so the disclosure is visible.",
        "Check isError before and after you add the catch — it flips to False.",
        "For the last part, print the schema and confirm the constraint is in it."
      ],
      solution: {
        notes: [
          { t: "p", text: "Seeing the hostname arrive in the client's result is the part that changes behaviour. It is obviously fine on a laptop and obviously not fine the moment the server is reachable by anyone else, and the catch costs four lines." },
          { t: "p", text: "The `isError` flip is worth noticing and not worth worrying about. You have deliberately converted an execution failure into a semantic one, which is the right trade for a published server — but it means your consumers cannot rely on the flag, which is exactly why the error shape has to be documented and consistent." },
          { t: "p", text: "Moving validation into the schema is the one that compounds. The rejection is earlier, the message is better than anything you would have written, and the constraint is visible to the model before it calls — so the best outcome is that the bad call is never attempted." }
        ]
      } }

  ],

  takeaways: [
    "**All five failure paths return a result; none raises on the client** — unknown tool, missing argument, wrong type, a raised exception, and a returned error payload.",
    "**`isError` means the tool did not execute**, not that the answer is bad. A tool returning `{\"error\": ...}` succeeded, and carries `isError: False`.",
    "**So a consumer cannot judge a call by the flag alone**, and the semantic error channel is yours to define and keep consistent across the whole server.",
    "**A raised exception's message crosses the boundary verbatim** — `Error executing tool explode: upstream timed out` — which on a published server means leaking hostnames, ports, file paths and service names.",
    "**For a server only you consume, let it raise.** The stack trace is the most useful thing available and `isError: True` is honest.",
    "**For a published server, catch everything:** log the real exception with a reference id, return a sentence plus that reference.",
    "**`retryable` is the highest-value field in an error payload.** Without it a model will retry an identical call that cannot ever succeed.",
    "**List the valid options when the set is small** — `supported: EUR, USD, GBP` turns a failed call into a correct one.",
    "**Never return \"invalid input\"**: it says something was wrong and nothing about what, so the model's only move is to guess.",
    "**Prefer a schema constraint to a body check.** `gt=0` and `Literal` are enforced before your function is entered, and the model sees them before calling.",
    "**Validation is not authorisation.** The schema stops a malformed call; only the database or downstream service can stop a well-formed call that should not be allowed."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A tool returns `{\"error\": \"no rate for GBP->XXX\", \"retryable\": false}`. What does the client see in `isError`?",
        options: [
          "True, because the payload describes an error",
          "False — the function ran and returned, so the call succeeded as far as the protocol is concerned",
          "True, because `retryable` is false",
          "It is unset for dict returns"
        ],
        answer: 1,
        why: "The flag tracks execution, not meaning, and the split is deliberate: 'I could not run your tool' and 'I ran it and there is no rate' are different facts. The consequence is that the semantic error channel is yours to define and document."
      },
      {
        stem: "An unguarded `ConnectionError` in a tool produces `Error executing tool explode: upstream timed out` in the client's result. Why does that matter on a published server?",
        options: [
          "It does not — the message is harmless",
          "Exception text crosses the boundary verbatim, so hostnames, internal addresses, ports and file paths are handed to a caller who may be in another organisation",
          "Because it sets isError to False",
          "Because the client will retry automatically"
        ],
        answer: 1,
        why: "A database connection error names the host and port; a file error names the path. On your own laptop that is convenience, and on a server someone else calls it is reconnaissance. The fix is four lines: log the real one with a reference, return a sentence."
      },
      {
        stem: "Which field most reduces wasted round trips when a model hits a tool error?",
        options: [
          "A numeric error code",
          "`retryable` — without it a model will call the same tool with the same arguments again, and each attempt is a full round trip",
          "A stack trace",
          "The tool's version"
        ],
        answer: 1,
        why: "It is the one piece of information the model cannot infer. Listing valid options when the set is small is the close second, because it converts a failed call into a correct one rather than merely stopping a retry."
      },
      {
        stem: "A tool validates `amount > 0` in its body and returns an error when it is not. What is better?",
        options: [
          "Raising a ValueError instead",
          "A `gt=0` constraint in the schema, so the call is rejected before the function is entered and the model sees the constraint before calling",
          "Logging the bad value and continuing",
          "Returning None"
        ],
        answer: 1,
        why: "The rejection is earlier, the message is the provider's rather than yours, and the constraint is visible in the declaration — so the best outcome is that the bad call never happens. Body validation is the fallback for rules a schema cannot express."
      },
      {
        stem: "A tool checks in Python whether the caller may read an order, then queries with an admin credential. What has it enforced?",
        options: [
          "Proper authorisation",
          "Nothing durable — the check is in the layer an attacker influences, and the database would have served any order asked for",
          "Authorisation, as long as the check is correct",
          "Shape validation only"
        ],
        answer: 1,
        why: "Keeping the layers straight is the point: the schema is for shape, the body for business rules, and the database or downstream service for permission. Only the last cannot be talked past — and nothing in MCP even carries who the caller is."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How does error handling work in an MCP tool?",
        strong: "Failures come back as results rather than exceptions on the client. An unknown tool, a validation failure or an escaping exception all return isError: True with a message; a tool that returns its own error payload returns isError: False, because it executed fine. So isError tracks execution, not meaning, and the semantic error channel is the server author's to define — I would standardise on an error key and a retryable flag across the whole server.",
        answer: [
          { t: "p", text: "The isError distinction is the thing being tested, and most answers miss that a returned error payload is a successful call." },
          { t: "p", text: "Saying that the convention has to be consistent server-wide is the practical half: a server where half the tools report failures differently is one a model handles badly for no reason." }
        ]
      },
      {
        level: "advanced",
        q: "What is wrong with letting exceptions propagate out of an MCP tool?",
        strong: "The message crosses the process boundary verbatim, so a database error names the host and port, a file error names the path, and an HTTP error names the internal service. On a server other people call, that is reconnaissance. I would catch, log the real exception with a short reference id, and return a sentence plus that reference — while accepting that this flips isError to False, which is why the error shape must be documented.",
        answer: [
          { t: "p", text: "Having concrete examples of what leaks is what makes this land; 'it might expose internals' is the version that does not." },
          { t: "p", text: "The reference id is the detail that shows operational experience: it keeps the caller's message useless to an attacker while keeping the incident findable for you." },
          { t: "p", text: "The strongest answers draw the line rather than making a rule: for a server only you consume, letting it raise is better, because the stack trace is the most useful thing available at that moment." }
        ]
      },
      {
        level: "advanced",
        q: "Where should argument validation live?",
        strong: "As much as possible in the schema, via Field constraints — gt, bounds, pattern, and Literal for anything the code branches on — because those are enforced before the function is entered and the model can see them before calling. The body handles what a schema cannot express: cross-field rules, existence checks. And authorisation is neither of those: it belongs in the database or downstream service, because a permission check in the tool body with an admin credential behind it has enforced nothing.",
        answer: [
          { t: "p", text: "The three-layer answer with the distinction between validation and authorisation is what the question is for, and the last layer is the one candidates most often fold into the second." },
          { t: "p", text: "Noting that a visible constraint can prevent the bad call entirely — rather than merely rejecting it — is the insight that makes the schema the preferred layer." }
        ]
      }
    ]
  }
});
