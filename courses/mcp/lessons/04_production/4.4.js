/* ============================================================================
   LESSON 4.4 — Operating One Other Teams Depend On
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "**Your tool names and argument names are a public API, and nothing about MCP makes that obvious.** Renaming an argument is a breaking change your consumers discover at runtime, inside a model's tool call, as a validation error nobody is watching for. This lesson is what you owe people who cannot redeploy when you do: a version policy, a deprecation path, logs that answer the question they will ask, and limits that stop one caller spending the budget.",

  objectives: [
    "Identify which parts of a server are a public interface",
    "Classify a change as breaking or additive, correctly",
    "Deprecate a tool without breaking a consumer at runtime",
    "Log the line that answers the question a consumer will ask",
    "Decide what limits a published server needs"
  ],

  prerequisites: ["4.3", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "What is actually public", id: "public" },

    {"kind": "trace", "title": "Nine surfaces, and the one that fails without an error", "caption": "**Every breaking row produces a failure somebody can see — inside a model's tool call, as a validation error nobody is watching for.** The description row is different: it changes the text in your consumers' model context, so their agent starts choosing your tool more or less often, and nothing anywhere reports it. **That is the rug-pull mechanism from the author's side**, and the reason a description edit deserves a changelog entry.", "left": "change", "codeW": 190, "vars": ["breaking?", "they discover it as"], "steps": [{"code": "rename a tool", "state": ["BREAKING", "a call to a tool that is gone"], "tone": "crit"}, {"code": "rename an argument", "state": ["BREAKING", "a validation error mid-conversation"], "changed": [0, 1], "tone": "crit"}, {"code": "make an argument required", "state": ["BREAKING", "every existing call failing"], "changed": [0, 1], "tone": "crit"}, {"code": "narrow a type or enum", "state": ["BREAKING", "valid calls rejected"], "changed": [0, 1], "tone": "crit"}, {"code": "rename a result field", "state": ["BREAKING for parsers", "a KeyError in their code"], "changed": [0, 1], "tone": "crit"}, {"code": "edit a description", "state": ["not breaking", "NOTHING - no error anywhere"], "changed": [0, 1], "tone": "violet"}, {"code": "add an optional argument or a tool", "state": ["additive", "more declarations per request"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-4_4-01-0"},

    { t: "p", text: "Everything a client can observe is an interface, which is a longer list than it looks." },

    { t: "table",
      head: ["Surface", "Changing it is", "Discovered by the consumer as"],
      rows: [
        ["A tool name", "**Breaking**", "A call to a tool that no longer exists"],
        ["An argument name", "**Breaking**", "A validation error mid-conversation"],
        ["Making an argument required", "**Breaking**", "Every existing call failing validation"],
        ["Narrowing a type or an enum", "**Breaking**", "Previously valid calls rejected"],
        ["A result's field names", "**Breaking** for anything parsing them", "A KeyError in their code, or a confused model"],
        ["A tool description", "Not breaking, but **a prompt change**", "Different behaviour, with no error anywhere"],
        ["Adding an optional argument", "Additive", "Nothing"],
        ["Adding a tool", "Additive, and a prompt change", "More declarations per request"],
        ["Loosening a constraint", "Additive", "Nothing"]
      ] },

    { t: "callout", kind: "insight", title: "The description row is the one without an error",
      body: [
        { t: "p", text: "Every breaking row above produces a failure somebody can see. **Changing a description produces no error at all** — it changes the text in your consumers' model context, so their agent starts choosing your tool more or less often, or using it differently, and nothing anywhere reports it." },
        { t: "p", text: "That is why lesson 4.1 called a silent description change the rug-pull mechanism and why lesson 4.3 suggested fingerprinting the interface. From the author's side the same fact has a simpler consequence: **a description edit deserves a changelog entry**, because for your consumers it is a behaviour change." }
      ] },

    { t: "h2", n: "02", text: "Versioning something with no version", id: "versioning" },

    {"kind": "trace", "title": "Versioning something the API cannot version", "caption": "**Lesson 1.2 measured the awkward part: `FastMCP` has no `version` parameter**, so by default every server reports the SDK's number and consumers cannot tell your releases apart. Set it through the private attribute anyway — it is the one field a consumer can alert on without hashing your tool list. **And semantic versioning here means the interface, not the implementation**, because that is what your consumers depend on; a number with no published meaning cannot be pinned against.", "left": "what to do", "codeW": 190, "vars": ["why"], "steps": [{"code": "mcp._mcp_server.version = '2.3.0'", "state": ["the only route through the decorator API"], "tone": "violet"}, {"code": "major for anything breaking", "state": ["renames, required, narrowed types"], "changed": [0], "tone": "crit"}, {"code": "minor for additive", "state": ["a new tool, a new optional argument"], "changed": [0], "tone": "good"}, {"code": "publish what the number means", "state": ["an unexplained number cannot be pinned against"], "changed": [0], "tone": "accent"}, {"code": "convert and convert_v2 side by side", "state": ["so they migrate when they choose, not when you deploy"], "changed": [0], "tone": "good"}, {"code": "the real detail in instructions", "state": ["read by a human AND a model"], "changed": [0], "tone": "accent"}], "t": "diagram", "id": "dg-4_4-02-1"},

    { t: "p", text: "Lesson 1.2 measured the awkward part: `FastMCP` has no `version` parameter, so by default every server reports the SDK's version and consumers cannot tell your releases apart." },

    { t: "dl", items: [
      ["Set a version, even via the private attribute", "`mcp._mcp_server.version = \"2.3.0\"` is the only route through the decorator API. It is the one field a consumer can alert on without hashing your tool list, and the alternative is that all your releases look identical."],
      ["Say what the number means", "Semantic versioning on *the interface*, not on your implementation: a major bump for anything in the breaking column, a minor for additive, a patch for a behaviour fix with no interface change. A number with no published meaning is not useful to pin against."],
      ["Version the tools, not just the server, when you must break", "`convert` and `convert_v2` side by side for a deprecation window is unlovely and it works, because a consumer migrates when they choose rather than when you deploy."],
      ["Put the real detail in `instructions`", "A consumer reading `finance 2.3.0` learns nothing about what changed. One sentence in the instructions — what the data covers, how current it is, where the changelog lives — is read by both a human and a model."]
    ] },

    { t: "h2", n: "03", text: "Deprecating without breaking", id: "deprecation" },

    {"kind": "steps", "title": "Four steps, and step three is the whole procedure", "caption": "**A deprecation window measured in dates is a guess; one measured in log lines is a fact.** If the warning is still firing, somebody's agent still depends on the tool and removing it will break them whatever the announcement said — and you cannot see your consumers, because there is no dependency graph and the caller may be an agent built once and left running. **Note where the notice goes:** the description is the only channel that reaches the model choosing the tool, so a clear notice reduces the calls rather than merely labelling them.", "items": [{"label": "Add the replacement", "code": "additive", "desc": "A new tool affects nobody, so this step is free and can ship immediately.", "tone": "good"}, {"label": "Mark the old one, and log it", "code": "in the description", "desc": "DEPRECATED with a removal date, delegating to the new one -- and a log line on every call.", "tone": "accent"}, {"label": "Wait for the log lines to stop", "code": "not for a date", "desc": "The only evidence that nobody depends on it. A server with no call logs cannot do this at all.", "tone": "violet"}, {"label": "Remove it, bump the major", "code": "breaking", "desc": "Now safe, because you have evidence rather than an announcement.", "tone": "good"}], "t": "diagram", "id": "dg-4_4-03-2"},

    { t: "p", text: "The reason this needs a procedure is the one fact that makes MCP different from an HTTP API: **you cannot see your consumers.** There is no client library with a dependency graph, no user-agent you can trust, and the caller may be an agent somebody built once and left running." },

    { t: "code", lang: "python", title: "a deprecation that cannot break anyone",
      code: `# Step 1 -- add the replacement. Additive, so nobody is affected.
@mcp.tool()
def convert_amount(...) -> Conversion:
    """Converts between currencies at ECB daily reference rates."""
    ...

# Step 2 -- mark the old one in its description, and log every use.
@mcp.tool()
def convert(...) -> Conversion:
    """DEPRECATED, removal 2027-04-01: use convert_amount instead.
    Converts between currencies at ECB daily reference rates."""
    log.warning("deprecated tool called tool=convert client=%s", caller_id())
    return convert_amount(...)

# Step 3 -- wait until the log line stops appearing. Not until a date passes.

# Step 4 -- remove it, and bump the major version.`,
      caption: "**The deprecation notice goes in the description because that is the only channel that reaches a model**, which is itself worth noticing: the warning is read by the thing choosing the tool, so a clear notice reduces the calls rather than merely labelling them." },

    { t: "callout", kind: "good", title: "Step 3 is the whole procedure",
      body: [
        { t: "p", text: "A deprecation window measured in dates is a guess; a deprecation window measured in **log lines** is a fact. If the warning is still firing, somebody's agent still depends on the tool, and removing it will break them whatever the announcement said." },
        { t: "p", text: "This is also the argument for the per-call logging in the next section being in place *before* you need it. A server with no call logs cannot run step 3 at all, so its only options are to break a consumer or to keep every tool forever." }
      ] },

    { t: "h2", n: "04", text: "The log line that answers their question", id: "logging" },

    {"kind": "trace", "title": "Five fields, and the one that decides a deprecation", "caption": "**Their side sees a model's decision; yours sees what was actually called with what** — which is why only your logs can answer a consumer's question. **Note the outcome field doing double duty:** “which tools fail” and “which tools are used at all”, and the second is what tells you a tool can be removed. And log named fields rather than the whole argument dictionary, chosen per tool — harmless on a currency tool, personal data on a customer lookup, in a log you may keep for ninety days.", "left": "field", "codeW": 190, "vars": ["answers"], "steps": [{"code": "tool name and outcome", "state": ["which tools fail - and which are used at all"], "tone": "violet"}, {"code": "a reference id", "state": ["shared with the error you returned - lesson 2.3"], "changed": [0], "tone": "good"}, {"code": "the caller", "state": ["token subject, or client id - never clientInfo.name"], "changed": [0], "tone": "accent"}, {"code": "duration", "state": ["the usual cause of 'your server is broken'"], "changed": [0], "tone": "accent"}, {"code": "named arguments, per tool", "state": ["enough to reproduce; nothing you would not keep"], "changed": [0], "tone": "crit"}], "t": "diagram", "id": "dg-4_4-04-3"},

    { t: "p", text: "A consumer whose agent behaves oddly will ask you what it called. **Only your logs can answer that**, because their side sees a model's decision and yours sees the actual arguments." },

    { t: "code", lang: "python", title: "one line per call",
      code: `import logging, sys, time, uuid
logging.basicConfig(stream=sys.stderr, level=logging.INFO)   # stderr: lesson 2.1
log = logging.getLogger("mcp.calls")

@mcp.tool()
async def convert(amount: float, frm: str, to: str, ctx: Context) -> Conversion:
    """Converts between currencies at ECB daily reference rates."""
    started, ref = time.monotonic(), uuid.uuid4().hex[:8]
    try:
        result = await _convert(amount, frm, to)
        outcome = "ok"
        return result
    except Exception:
        outcome = "error"
        log.exception("tool=convert ref=%s", ref)
        raise
    finally:
        log.info(
            "tool=convert outcome=%s ref=%s request=%s subject=%s "
            "frm=%s to=%s amount=%s ms=%.0f",
            outcome, ref, ctx.request_id, subject_or_none(),
            frm, to, amount, (time.monotonic() - started) * 1000,
        )`,
      caption: "**Named fields, not the whole argument dictionary.** Logging `**kwargs` wholesale is how a server starts recording personal data it never meant to keep — and on a currency tool the arguments are harmless, while on a customer-lookup tool they are not. Choose the fields deliberately, per tool." },

    { t: "dl", items: [
      ["The tool name and the outcome", "So “which tools fail” and “which tools are used at all” are both answerable. The second is what tells you a tool can be removed."],
      ["A reference id, shared with any error you return", "Lesson 2.3's pattern: the consumer quotes the reference and you find the stack trace, without the stack trace ever crossing the boundary."],
      ["The caller, as precisely as you can", "The token subject if you have one (lesson 4.2), the client id otherwise. `clientInfo.name` is not it — lesson 2.1 measured the SDK client reporting `mcp`."],
      ["Duration", "A slow tool is the usual cause of a consumer reporting that your server is broken, and the distribution matters more than the mean."],
      ["Named arguments, chosen per tool", "Enough to reproduce the call, nothing you would not want in a log retained for ninety days."]
    ] },

    { t: "h2", n: "05", text: "Limits, and what happens without them", id: "limits" },

    {"kind": "trace", "title": "Five limits, and the one that needs identity", "caption": "**A published server has a new failure mode: a consumer whose agent loops.** Lesson 2.3 showed a model will retry an identical call when the error does not say `retryable: false`, and a looping agent can call your tool hundreds of times a minute. **The rate limit needs the caller identity from lesson 4.2 to be per-caller** — without it the only available limit is global, which converts one consumer's bug into everyone's outage and leaves you unable to say whose.", "left": "limit", "codeW": 190, "vars": ["without it"], "steps": [{"code": "a rate limit PER CALLER", "state": ["one looping agent degrades the server for everyone"], "tone": "crit"}, {"code": "a cap on result size", "state": ["a huge result is resent on every later turn"], "changed": [0], "tone": "crit"}, {"code": "a timeout on everything upstream", "state": ["your tool is somebody's blocked turn"], "changed": [0], "tone": "warn"}, {"code": "concurrency limits on scarce work", "state": ["over HTTP all callers share one process"], "changed": [0], "tone": "warn"}, {"code": "retryable: false on permanent failures", "state": ["the cheapest loop prevention there is"], "changed": [0], "tone": "good"}], "t": "diagram", "id": "dg-4_4-05-4"},

    { t: "p", text: "A published server has a new failure mode: **a consumer whose agent loops.** Lesson 2.3 noted that a model will retry an identical call when the error does not say `retryable: false`, and a model in a loop can call your tool hundreds of times in a minute." },

    { t: "dl", items: [
      ["A rate limit per caller", "The first thing to add, and it needs the caller identity from lesson 4.2 to be per-caller rather than global. Without identity, one looping agent degrades the server for everyone."],
      ["A cap on result size", "A tool that can return ten thousand rows will be asked for ten thousand rows, and the result goes into a model's context and is resent on every subsequent turn. Cap it, say so in the description, and return a count with the truncation."],
      ["A timeout on everything you call", "Your tool is somebody's blocked turn. A tool with no upstream timeout holds their conversation until their client gives up, and lesson 3.2's proxy may cut it first and tell them nothing useful."],
      ["Concurrency limits on expensive work", "A semaphore around whatever is scarce — a database pool, a GPU, a third-party quota you pay for. Over HTTP all callers share one process (lesson 3.1), so one caller can exhaust it."],
      ["`retryable: false` on everything permanent", "The cheapest loop prevention there is, and it is a property of your error payloads rather than of your infrastructure."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Publishing is a support commitment, not a deployment",
      body: [
        { t: "p", text: "The honest summary of this lesson is that **a server is a product**: it needs a version with a meaning, a changelog, a deprecation procedure, call logs, limits, and someone to answer when a consumer's agent starts behaving oddly. None of that is hard and all of it is ongoing." },
        { t: "p", text: "Which is why lesson 1.1's advice stands: if the capability has one consumer and you own both ends, a shared library has none of these obligations. **Publish when the consumers are genuinely on other stacks or in other teams**, and when the interface has settled enough that you would not be embarrassed to freeze it for a deprecation window." }
      ] },

    { t: "exercise", kind: "practice", title: "Write the operational half", difficulty: "advanced", minutes: 30,
      prompt: "Take a server with three tools. Add: a version set through the private attribute, a one-line-per-call log with named fields, a per-caller rate limit, and a result-size cap on whichever tool can return the most. Then run a deprecation: add a replacement tool, mark the old one deprecated in its description with a removal date, make it delegate, and confirm your log distinguishes calls to each. Finally write the changelog entry for a description-only change, and explain in one sentence why it needs one.",
      hints: [
        "The rate limit needs a caller identity to be per-caller — global is a different control.",
        "Make the deprecated tool delegate rather than duplicating the logic.",
        "The last part is the point of the lesson."
      ],
      solution: {
        notes: [
          { t: "p", text: "The log that distinguishes the two tools is what makes the deprecation finishable. Without it the removal date is a guess, and the two available options are both bad: break whoever is still calling, or keep the tool forever because you cannot prove nobody is." },
          { t: "p", text: "The changelog answer is the one to get right. A description change produces no error anywhere and still changes your consumers' behaviour, because the description is text in their model's context — so it is a behaviour change that is invisible to every form of monitoring they have, which is exactly why it has to be announced." },
          { t: "p", text: "The rate limit is where identity earns its place a second time. Without a caller to key on, the only available limit is global, which means one consumer's looping agent degrades your server for every other consumer — and you will not be able to tell them which one it was." }
        ]
      } }

  ],

  takeaways: [
    "**Tool names, argument names, required sets, types and result fields are a public API**, and changing any of them breaks consumers at runtime inside a model's tool call.",
    "**A description change is not breaking and is still a behaviour change** — it alters the text in your consumers' model context with no error anywhere, which is why it deserves a changelog entry.",
    "**`FastMCP` has no `version` parameter**, so set `_mcp_server.version` anyway: it is the one field a consumer can alert on without hashing your tool list.",
    "**Version the interface, not the implementation**, and publish what the number means — a number with no stated meaning cannot be pinned against.",
    "**You cannot see your consumers.** There is no dependency graph and no trustworthy user-agent, and the caller may be an agent somebody built once and left running.",
    "**The deprecation notice goes in the description**, because that is the only channel that reaches the model choosing the tool — so a clear notice reduces the calls rather than merely labelling them.",
    "**Deprecate by log lines, not by dates.** If the warning still fires, somebody still depends on the tool, whatever the announcement said.",
    "**A server with no call logs cannot finish a deprecation at all**, so the logging has to exist before you need it.",
    "**Log named fields, never the whole argument dictionary**, or you will record personal data you never meant to keep.",
    "**Log the caller as precisely as you can** — the token subject, or the client id. `clientInfo.name` is not it.",
    "**A looping consumer is the new failure mode**, and a rate limit needs caller identity to be per-caller rather than global.",
    "**Cap result sizes**, because a result goes into a model's context and is resent on every subsequent turn.",
    "**`retryable: false` on permanent failures is the cheapest loop prevention available**, and it lives in your error payloads rather than your infrastructure."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which change to a published server produces no error for consumers and still changes their agent's behaviour?",
        options: [
          "Renaming an argument",
          "Editing a tool description — it is text in their model's context, so their agent may choose the tool more or less often, with nothing anywhere reporting it",
          "Adding an optional argument",
          "Loosening an enum"
        ],
        answer: 1,
        why: "Every breaking change produces a visible failure; a description change does not. That is the rug-pull mechanism from lesson 4.1 seen from the author's side, and the reason a description edit deserves a changelog entry."
      },
      {
        stem: "Why deprecate by log lines rather than by a date?",
        options: [
          "Dates are hard to agree",
          "Because you cannot see your consumers — if the deprecation warning is still firing, somebody's agent still depends on the tool, whatever the announcement said",
          "Because MCP has no versioning",
          "Because logs are cheaper than announcements"
        ],
        answer: 1,
        why: "There is no dependency graph and the caller may be an agent built once and left running. It also means a server with no per-call logging cannot finish a deprecation: the only options left are breaking someone or keeping every tool forever."
      },
      {
        stem: "Why log named fields rather than the whole argument dictionary?",
        options: [
          "To reduce log volume",
          "Because a wholesale dump records whatever the arguments happen to contain — harmless on a currency tool, personal data on a customer lookup — in a log you may retain for months",
          "Because dictionaries cannot be serialised",
          "Because the model needs the fields named"
        ],
        answer: 1,
        why: "It is a per-tool decision rather than a global setting, which is the part people skip. Volume is a side benefit; the reason is that `**kwargs` logging is how a server starts holding data nobody decided to keep."
      },
      {
        stem: "A consumer's agent loops and calls one tool hundreds of times a minute. What limits the damage to other consumers?",
        options: [
          "A global rate limit",
          "A per-caller rate limit, which needs the caller identity from lesson 4.2 — without identity the only available limit is global, so one looping agent degrades the server for everyone",
          "A shorter timeout",
          "Switching to stateless mode"
        ],
        answer: 1,
        why: "A global limit converts one consumer's bug into everyone's outage, and leaves you unable to say which consumer caused it. Returning `retryable: false` on permanent failures is the cheap complement, since lesson 2.3 showed a model will otherwise retry an identical call."
      },
      {
        stem: "Why cap the number of rows a tool can return?",
        options: [
          "To keep responses under the HTTP size limit",
          "Because the result enters a model's context and is resent on every subsequent turn, so an unbounded result is a cost paid repeatedly for the rest of the conversation",
          "Because MCP cannot serialise large arrays",
          "To avoid timeouts"
        ],
        answer: 1,
        why: "The cost is per turn rather than per call, which is what makes it worse than an ordinary large API response. Say the cap in the description and return a count alongside the truncation, so the model knows there is more rather than assuming it has everything."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What does it take to run an MCP server other teams depend on?",
        strong: "Treating it as a product. A version with a published meaning — set through the private attribute, since FastMCP has no version parameter — semantic on the interface rather than the implementation. One log line per call with named fields, the caller, a duration and a reference id. Per-caller rate limits, a result-size cap, and timeouts on everything upstream. And a deprecation procedure that ends when the log lines stop, not when a date passes, because I cannot see my consumers.",
        answer: [
          { t: "p", text: "The log-lines-not-dates point is the one that shows this has been done: it also explains why the logging has to exist before the deprecation does." },
          { t: "p", text: "Naming the version awkwardness rather than assuming a version field exists is a small sign of having actually built one." },
          { t: "p", text: "A strong close is the counsel against publishing at all: one consumer and both ends yours means a shared library carries none of these obligations." }
        ]
      },
      {
        level: "advanced",
        q: "Which changes to a server are breaking?",
        strong: "Renaming a tool or an argument, making an argument required, narrowing a type or an enum, and changing result field names for anything that parses them — all discovered by the consumer at runtime, inside a model's tool call. Additive: a new optional argument, a new tool, a loosened constraint. And the interesting case in between is a description edit: not breaking, no error anywhere, and still a change to the prompt their model sees.",
        answer: [
          { t: "p", text: "Having the three categories, with the description case called out separately, is the complete answer — most people give the first two." },
          { t: "p", text: "Noting that the failure arrives inside a tool call is what makes the breakage severe: it surfaces as a validation error in the middle of someone's conversation rather than at deploy time." }
        ]
      },
      {
        level: "mid",
        q: "A consumer says your server is broken. What do you need in order to answer?",
        strong: "A per-call log with the tool name, the outcome, the caller, the duration, the named arguments and a reference id. Their side only sees a model's decision; mine sees what was actually called with what. If I returned an error, it carried that reference, so they can quote it and I can find the stack trace without ever having sent them my internals.",
        answer: [
          { t: "p", text: "The asymmetry between what each side can see is the reason the log exists, and stating it is better than listing fields." },
          { t: "p", text: "The reference id connects to lesson 2.3's disclosure rule, which is the pair worth having: a useless message for an attacker and a findable incident for you." },
          { t: "p", text: "A good addition is duration distribution rather than mean, since 'your server is broken' most often turns out to be one slow tool at the tail." }
        ]
      }
    ]
  }
});
