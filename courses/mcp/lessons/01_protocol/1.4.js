/* ============================================================================
   LESSON 1.4 — The Server-to-Client Direction
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "**Everything so far has the client asking and the server answering. The protocol runs the other way too**, and it is the half most people never meet: a server can ask the client's model for a completion, ask which directories are in scope, or ask the user a question directly. All three worked against a client that supplied them — and against an ordinary client that did not, all three failed with `isError: True` and *“Sampling not supported”*. That makes them a hard dependency on the host rather than a feature you can simply use.",

  objectives: [
    "Name the three server-initiated requests and what each asks for",
    "Implement the client callbacks that make them possible",
    "Predict what happens when the client does not support them",
    "Check the client's capabilities before depending on one",
    "Say what each one hands to the server, and why that matters"
  ],

  prerequisites: ["1.2", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "Three requests that run backwards", id: "three" },

    {"kind": "trace", "title": "Three requests, and what the server is borrowing", "caption": "**A server holds no model, has no user and sees no filesystem beyond its own**, and each of these asks the client for exactly one of those. The rationale is the same throughout: the host already has the model, the user and the file access, so the server asks rather than acquiring its own API key, prompt surface or paths. **Which is a good design, and also why these are the three most consequential capabilities in the protocol** — section 05.", "left": "request", "codeW": 190, "vars": ["it asks for", "so the server need not"], "steps": [{"code": "sampling/createMessage", "state": ["run this completion for me", "hold an API key or a bill"], "tone": "violet"}, {"code": "roots/list", "state": ["which directories may I look at?", "guess at a boundary"], "changed": [0, 1], "tone": "good"}, {"code": "elicitation/create", "state": ["ask the user this", "build a UI of its own"], "changed": [0, 1], "tone": "violet"}, {"code": "and all three", "state": ["the host decides, per client", "the control is the consumer's"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-1_4-01-0"},

    { t: "p", text: "A server holds no model, has no user and sees no filesystem beyond its own. Each of these requests asks the client for exactly one of those things." },

    { t: "dl", items: [
      ["Sampling — `sampling/createMessage`", "*“Run this completion for me.”* The server sends messages and gets back a model's reply, using **the host's model and the host's budget**. It lets a server do something model-shaped without holding an API key of its own."],
      ["Roots — `roots/list`", "*“Which directories am I allowed to look at?”* The client declares boundaries, and a filesystem or repository server uses them instead of guessing. Note the direction: the boundary is the client's to state, not the server's to assume."],
      ["Elicitation — `elicitation/create`", "*“Ask the user this.”* The server gets a structured answer from the person, mid-tool-call. This is the one that makes a confirmation step possible from inside a server."]
    ] },

    { t: "callout", kind: "insight", title: "Why this exists at all",
      body: [
        { t: "p", text: "Without sampling, a server that wants to summarise something needs its own model, its own API key and its own bill — and every consumer inherits a dependency they did not choose. With it, the server borrows the model the host already has." },
        { t: "p", text: "The same logic runs through all three: **the host has the model, the user and the file access, so the server asks rather than acquiring its own.** That is a good design, and it is also why these three are the most consequential capabilities in the protocol from a security point of view — section 05." }
      ] },

    { t: "h2", n: "02", text: "A server that uses all three", id: "server" },

    {"kind": "flow", "title": "The server's end: ctx.session, and ctx.elicit", "caption": "**`ctx.elicit` takes a Pydantic schema**, so the user's answer arrives typed rather than as free text — the same contract idea as lesson 2.2's output schemas, pointed at a person instead of a model. Sampling and roots go through `ctx.session`, which is the server's end of the connection. **Note what the tool returns when the user says no:** the schema's own fields carry the answer, so the tool branches on `proceed` rather than on the request having completed.", "cols": 3, "nodes": [{"id": "s", "label": "ctx.session.create_message(...)", "sub": "SamplingMessage, not a dict", "tone": "violet"}, {"id": "r", "label": "ctx.session.list_roots()", "sub": "returns the client's declared roots", "tone": "good"}, {"id": "e", "label": "ctx.elicit(message=, schema=)", "sub": "a Pydantic model, so the answer is typed", "tone": "violet"}, {"id": "a", "label": "Check action AND the fields", "sub": "accept means they answered", "tone": "crit"}, {"id": "d", "label": "Then branch on proceed", "sub": "which is what they actually said", "tone": "crit"}], "edges": [["s", "a"], ["r", "a"], ["e", "a"], ["a", "d"]], "t": "diagram", "id": "dg-1_4-02-1"},

    { t: "code", lang: "python", title: "three tools, each calling back",
      code: `from pydantic import BaseModel, Field
from mcp.types import SamplingMessage, TextContent
from mcp.server.fastmcp import Context, FastMCP

mcp = FastMCP("callback-demo")

@mcp.tool()
async def summarise(text: str, ctx: Context) -> str:
    """Summarises text by asking the CLIENT's model, not one of its own."""
    result = await ctx.session.create_message(
        messages=[SamplingMessage(role="user",
                                  content=TextContent(type="text",
                                                      text="Summarise in one line: " + text))],
        max_tokens=100,
    )
    return result.content.text

@mcp.tool()
async def where_may_i_look(ctx: Context) -> list[str]:
    """Asks the client which directories are in scope."""
    roots = await ctx.session.list_roots()
    return [str(r.uri) for r in roots.roots]

class Confirm(BaseModel):
    """What the user has to tell us before we proceed."""
    proceed: bool = Field(description="True to go ahead")
    reason: str = Field(default="", description="Why, for the audit log")

@mcp.tool()
async def delete_everything(ctx: Context) -> str:
    """Asks the USER directly before doing something irreversible."""
    answer = await ctx.elicit(message="This deletes all records. Confirm?", schema=Confirm)
    if answer.action != "accept" or not answer.data.proceed:
        return "declined"
    return "would delete; reason=%r" % answer.data.reason`,
      caption: "**`ctx.elicit` takes a Pydantic schema**, so the user's answer arrives typed rather than as free text — the same contract idea as lesson 2.2's output schemas, pointed at a person. Sampling and roots go through `ctx.session`, which is the server's end of the connection." },

    { t: "h2", n: "03", text: "The client side, and what it decides", id: "client" },

    {"kind": "trace", "title": "Passing the callback is what declares the capability", "caption": "**There is no separate flag to set** — the client supplies a function and the capability is declared for it. Each callback is the host's decision rather than the server's, which is the whole design: the server asks and the host answers however it chooses. **And read the elicitation result carefully:** `action=accept` means the user engaged with the dialogue, while `proceed: false` is their answer, so a server checking only `action` has read a refusal as consent.", "left": "the client passes", "codeW": 190, "vars": ["the server can then call", "what the host controls"], "steps": [{"code": "sampling_callback", "state": ["create_message", "which model, and the budget"], "tone": "violet"}, {"code": "list_roots_callback", "state": ["list_roots", "which paths it admits to"], "changed": [0, 1], "tone": "good"}, {"code": "elicitation_callback", "state": ["ctx.elicit", "how the prompt is rendered"], "changed": [0, 1], "tone": "violet"}, {"code": "nothing", "state": ["none of them", "the capability is simply absent"], "changed": [0, 1], "tone": "crit"}, {"code": "and the measured answer", "state": ["action=accept, proceed=false", "answered, and said no"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-1_4-03-2"},

    { t: "p", text: "A client opts in by passing callbacks. **Each one is the host's decision rather than the server's**, which is the whole point: the server asks and the host answers however it chooses." },

    { t: "code", lang: "python", title: "a client that supplies all three",
      code: `import mcp.types as T

async def sampling(ctx, params: T.CreateMessageRequestParams):
    asked = params.messages[0].content.text
    print("    [client] server asked for a completion: %r" % asked[:58])
    return T.CreateMessageResult(
        role="assistant",
        content=T.TextContent(type="text", text="(the host's model would answer here)"),
        model="host-model-v1", stopReason="endTurn",
    )

async def list_roots(ctx):
    print("    [client] server asked which directories are in scope")
    return T.ListRootsResult(roots=[T.Root(uri="file:///Users/me/projects", name="projects")])

async def elicit(ctx, params: T.ElicitRequestParams):
    print("    [client] server asked the USER: %r" % params.message)
    return T.ElicitResult(action="accept", content={"proceed": False, "reason": "not today"})

async with ClientSession(read, write,
                         sampling_callback=sampling,
                         list_roots_callback=list_roots,
                         elicitation_callback=elicit) as session:
    ...`,
      out: `  call summarise:
    [client] server asked for a completion: 'Summarise in one line: a long document about invoices'
    -> (the host's model would answer here)

  call where_may_i_look:
    [client] server asked which directories are in scope
    -> file:///Users/me/projects

  call delete_everything:
    [client] server asked the USER: 'This deletes all records. Confirm?'
    -> declined`,
      caption: "**Passing the callback is what declares the capability** — there is no separate flag to set. Note the elicitation result: `action='accept'` means the user responded rather than cancelling, and `proceed: false` is their answer, so the two are separate questions and a server has to check both." },

    { t: "callout", kind: "trap", title: "action: accept does not mean yes",
      body: [
        { t: "p", text: "`action` describes what the *user did with the dialogue* — accepted it, declined it, or cancelled — and the schema's fields carry what they actually said. A user who engages with the prompt and answers *no* produces `action='accept'` with `proceed: false`." },
        { t: "p", text: "So a server that checks only `action == 'accept'` and proceeds has read a refusal as consent. Check both, in that order: did they answer, and what did they say." }
      ] },

    { t: "h2", n: "04", text: "What happens without the callbacks", id: "unsupported" },

    {"kind": "trace", "title": "No callbacks: three failed calls, not three degraded ones", "caption": "**Not a reduced result — a failed call.** The tool raised, the error reached the caller as `isError: True`, and the message names the missing capability. So a server built on any of these three does not work at all for a host that has not implemented them, which is the fact that decides whether you can use them. **Tools and resources work everywhere; these work where the host chose to support them**, and host support is much thinner here than for anything in lesson 1.3.", "left": "tool", "codeW": 170, "vars": ["isError", "message"], "steps": [{"code": "summarise", "state": ["True", "Sampling not supported"], "tone": "crit"}, {"code": "where_may_i_look", "state": ["True", "List roots not supported"], "changed": [1], "tone": "crit"}, {"code": "delete_everything", "state": ["True", "Elicitation not supported"], "changed": [1], "tone": "crit"}, {"code": "so check first", "state": ["-", "client_params.capabilities.sampling"], "changed": [0, 1], "tone": "good"}, {"code": "and degrade", "state": ["False", "a truncation, with degraded: true"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-1_4-04-3"},

    { t: "p", text: "The same server, against an ordinary client that passes nothing — which is the overwhelmingly common case." },

    { t: "code", lang: "python", title: "no callbacks, three failures",
      code: `# A client that passes NO callbacks -- the ordinary case.
async with ClientSession(read, write) as session:
    await session.initialize()
    for tool in ("summarise", "where_may_i_look", "delete_everything"):
        res = await session.call_tool(tool, args_for(tool))
        print("  %-20s isError=%-5s %s" % (tool, res.isError, res.content[0].text))`,
      out: `  summarise            isError=True  Error executing tool summarise: Sampling not supported
  where_may_i_look     isError=True  Error executing tool where_may_i_look: List roots not supported
  delete_everything    isError=True  Error executing tool delete_everything: Elicitation not supported`,
      caption: "**Not a degraded result — a failed call.** The tool raised, the error reached the caller as `isError: True`, and the message names the missing capability. So a server built on any of these three does not work at all for a host that has not implemented them." },

    { t: "p", text: "That is the fact that decides whether you can use them. **Tools and resources work everywhere; these three work where the host chose to support them**, and host support is much thinner here than for anything in lesson 1.3." },

    { t: "code", lang: "python", title: "checking before depending",
      code: `@mcp.tool()
async def summarise(text: str, ctx: Context) -> dict:
    """Summarises text. Falls back to an extract if the host cannot sample."""
    caps = ctx.session.client_params.capabilities if ctx.session.client_params else None
    if caps is None or caps.sampling is None:
        return {"summary": text[:200],
                "note": "truncated: this host does not support sampling",
                "degraded": True}
    result = await ctx.session.create_message(...)
    return {"summary": result.content.text, "degraded": False}`,
      caption: "The client's declared capabilities arrived in the handshake (lesson 1.2), and the server has them on the session. **Reading them is the difference between a tool that degrades and a tool that fails** — and saying `degraded: true` in the result is what lets a model tell the user it got the cheap version." },

    { t: "h2", n: "05", text: "What each one hands over", id: "security" },

    {"kind": "trace", "title": "What each one hands over", "caption": "**Granting sampling is materially like handing over an API key:** the server chooses the prompt, it runs on your model, and it is billed to you — which also runs lesson 4.1's injection problem in both directions, since your model reads text the server composed and the result returns to the server. **Elicitation is the one that borrows your credibility:** the message is the server's text rendered by your interface, so *“enter your API key to continue”* is a phishing prompt with your branding around it.", "left": "capability", "codeW": 150, "vars": ["the server gains", "the cost to you", "grant it to"], "steps": [{"code": "sampling", "state": ["your model and budget", "its prompts, your tokens", "servers you would give a key"], "tone": "crit"}, {"code": "elicitation", "state": ["a prompt in your UI", "your apparent authority", "servers you would vouch for"], "changed": [0, 1, 2], "tone": "crit"}, {"code": "roots", "state": ["your directory boundaries", "path disclosure only", "freely, and narrowly"], "changed": [0, 1, 2], "tone": "good"}, {"code": "the honest default", "state": ["none of the three", "-", "then roots when needed"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-1_4-05-4"},

    { t: "p", text: "These three are the most consequential capabilities a client can grant, because each gives a server something it otherwise could not reach." },

    { t: "table",
      head: ["Capability", "What the server gains", "What that costs you"],
      rows: [
        ["Sampling", "Your model, your budget", "It spends your tokens, and it chooses the prompt — including any text it wants the model to read"],
        ["Roots", "Your directory boundaries", "Little directly; it learns your paths, which is reconnaissance for a filesystem server"],
        ["Elicitation", "A prompt in front of your user", "It writes the message. A server can ask your user anything, in your interface, with your apparent authority"]
      ] },

    { t: "dl", items: [
      ["Sampling is the server choosing a prompt for your model", "Nothing restricts what it sends. A server with sampling can run any completion it likes on your account, and lesson 4.1's injection problem now runs in both directions — your model reads text the server composed, with the result returning to the server."],
      ["Elicitation is the server writing to your user", "The message is the server's text, rendered by your host, so it inherits your interface's credibility. *“Enter your API key to continue”* is a phishing prompt with your branding around it."],
      ["Roots is the mildest of the three", "It discloses paths rather than granting an action, and it exists so a server has a boundary to respect instead of a directory to guess. The failure mode is declaring more than the server needs."],
      ["All three are per-client decisions", "The host grants them by passing a callback, so the control sits exactly where lesson 5.1 said the controls sit: in client code, with the consumer."]
    ] },

    { t: "callout", kind: "tradeoff", title: "When to grant them",
      body: [
        { t: "p", text: "**Roots, freely** — declare the narrowest set that works, because the alternative is a server guessing. **Sampling, for servers you would give an API key to**, since that is materially what you are doing, and with a spend limit if your host supports one. **Elicitation, for servers whose prompts you would be comfortable showing a user unread** — which is a short list, and for anything else prefer a confirmation step your own code writes." },
        { t: "p", text: "The honest default for a third-party server is none of the three, and then granting roots when a filesystem server needs it. A server that cannot function without sampling is asking for your model budget in its first sentence." }
      ] },

    { t: "exercise", kind: "practice", title: "Build both ends, then take the callbacks away", difficulty: "advanced", minutes: 30,
      prompt: "Write a server with three tools, one per capability. Write a client supplying all three callbacks, and confirm each tool works and that your callback printed. Then remove the callbacks one at a time and record the exact error for each. Next, add a capability check to the sampling tool so it degrades to a truncation with degraded: true rather than failing, and confirm it now works against both clients. Finally, have the server's elicitation message ask for something it should not — an API key — and write one sentence on what your host's UI would have shown the user.",
      hints: [
        "Passing the callback is what declares the capability; there is no separate flag.",
        "Check both action and the schema's fields — accept does not mean yes.",
        "The last part is the point of section 05."
      ],
      solution: {
        notes: [
          { t: "p", text: "The three error messages are worth having seen, because they are the clearest statement of the dependency: *“Sampling not supported”* is a failed call, not a missing feature, so a server built on sampling is unusable for most hosts rather than merely reduced." },
          { t: "p", text: "The capability check is the shape to adopt for anything optional. A tool that reads `client_params.capabilities` and degrades is a tool that works everywhere; one that assumes is a tool that works where it was written. And `degraded: true` in the payload is what lets the model tell the user it got the cheap answer rather than silently presenting a truncation as a summary." },
          { t: "p", text: "The phishing prompt is uncomfortable to write and that is the exercise. Your host renders the server's text, so the dialogue carries your application's styling and your user's trust — which means elicitation is a capability to grant to servers you would vouch for, and the reason the honest default for a third party is to leave all three off." }
        ]
      } }

  ],

  takeaways: [
    "**The protocol runs server-to-client as well:** sampling asks for a completion, roots asks which directories are in scope, elicitation asks the user a question.",
    "**The rationale is that the host owns the model, the user and the file access**, so a server asks rather than acquiring its own API key, prompt surface or paths.",
    "**A client opts in by passing a callback** — `sampling_callback`, `list_roots_callback`, `elicitation_callback`. There is no separate flag.",
    "**Against a client with no callbacks all three fail**: `isError: True` and *\"Sampling not supported\"*, *\"List roots not supported\"*, *\"Elicitation not supported\"*.",
    "**So these are a hard dependency on the host**, not a feature you can assume — unlike tools and resources, which work everywhere.",
    "**`action: \"accept\"` does not mean yes.** It means the user engaged with the dialogue; their answer is in the schema's fields, so a refusal arrives as `accept` with `proceed: false`.",
    "**Read `client_params.capabilities` and degrade** rather than failing, and say `degraded: true` in the result so the model can tell the user it got the cheap version.",
    "**Sampling spends your tokens on a prompt the server composed**, which runs lesson 4.1's injection problem in both directions.",
    "**Elicitation renders the server's text in your interface**, so it inherits your application's credibility — *\"enter your API key\"* is a phishing prompt with your branding.",
    "**Roots is the mildest:** it discloses paths rather than granting an action, and exists so a server has a boundary to respect instead of one to guess.",
    "**Grant roots freely and narrowly, sampling only to servers you would give an API key, and elicitation only to servers whose prompts you would show a user unread** — which is a short list.",
    "**All three are granted in client code**, which is where lesson 5.1 showed every other control living too."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A server's tool calls `ctx.session.create_message`. The client passed no callbacks. What does the caller see?",
        options: [
          "An empty result",
          "`isError: True` with \"Error executing tool summarise: Sampling not supported\" — a failed call, not a degraded one",
          "The tool blocks until a model is available",
          "The SDK substitutes a default model"
        ],
        answer: 1,
        why: "All three server-initiated requests behave this way, which is what makes them a hard host dependency rather than a feature. A server built on sampling does not work for most hosts, so a capability check and a degraded path are the difference between usable everywhere and usable where it was written."
      },
      {
        stem: "An elicitation returns `action: \"accept\"` with `proceed: false`. What did the user do?",
        options: [
          "Approved the action",
          "Engaged with the dialogue and answered no — `action` describes what they did with the prompt, and their answer is in the schema's fields",
          "Cancelled the dialogue",
          "Nothing; the result is invalid"
        ],
        answer: 1,
        why: "They are two separate questions, and a server checking only `action` has read a refusal as consent. Check whether they answered, then what they said."
      },
      {
        stem: "Why does sampling exist rather than servers holding their own API keys?",
        options: [
          "Because MCP forbids outbound HTTP from servers",
          "Because the host already has a model and a budget — so the server borrows them rather than making every consumer inherit a model dependency and a bill they did not choose",
          "Because it is faster",
          "To guarantee the same model across tools"
        ],
        answer: 1,
        why: "The same reasoning covers all three: the host owns the model, the user and the file access, so the server asks. The cost is the other side of it — a server with sampling can run any completion it likes on your account."
      },
      {
        stem: "Which capability most deserves caution before granting it to a third-party server?",
        options: [
          "Roots, because it reveals paths",
          "Elicitation — the server writes a message your host renders in your interface, so it inherits your application's credibility and can ask your user anything",
          "Logging, because it is verbose",
          "They carry identical risk"
        ],
        answer: 1,
        why: "\"Enter your API key to continue\" is a phishing prompt with your branding around it. Sampling is the close second since it spends your budget on a prompt the server composed; roots is the mildest because it discloses rather than grants."
      },
      {
        stem: "How should a tool that would like to use sampling be written?",
        options: [
          "Call create_message and let it fail if unsupported",
          "Read `client_params.capabilities` first and fall back to a non-model path, returning `degraded: true` so the model can tell the user it got the cheap version",
          "Require sampling in the server's instructions",
          "Retry create_message until it succeeds"
        ],
        answer: 1,
        why: "The client's capabilities arrived in the handshake and sit on the session, so the check is cheap. The `degraded` flag matters because otherwise a truncation is presented to the user as a summary with nothing marking the difference."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Does MCP only run client-to-server?",
        strong: "No. There are three server-initiated requests: sampling asks the client to run a completion, roots asks which directories are in scope, and elicitation asks the user a question directly. The host opts in by passing a callback, and against a client that passed none all three fail with isError and a 'not supported' message — so they are a hard dependency on the host rather than something a server can assume.",
        answer: [
          { t: "p", text: "Naming all three with what each asks for is the answer; most people know sampling exists and stop there." },
          { t: "p", text: "The failure behaviour is the practically important half, because it decides whether you can build on them: a server that needs sampling is unusable for most hosts." },
          { t: "p", text: "A strong finish is the rationale — the host owns the model, the user and the file access, so the server asks rather than acquiring its own." }
        ]
      },
      {
        level: "advanced",
        q: "What would make you refuse a server's request for sampling or elicitation?",
        strong: "Sampling means the server chooses prompts that run on my model and my budget, so granting it is materially like handing over an API key — I would grant it only to a server I would do that for, with a spend limit if the host supports one. Elicitation means the server writes a message my interface renders, so it borrows my application's credibility; 'enter your API key to continue' is a phishing prompt with my branding. Roots I would grant freely but narrowly, since it discloses paths rather than granting an action.",
        answer: [
          { t: "p", text: "The API-key framing for sampling is the one that makes the decision concrete rather than vague, and it is accurate about what is being granted." },
          { t: "p", text: "The phishing example for elicitation is what distinguishes someone who has thought about it from someone who has read the list of capabilities." },
          { t: "p", text: "Noting that all three are granted in client code puts the control in the right place: the consumer decides, which is the same conclusion as every other control in the protocol." }
        ]
      },
      {
        level: "mid",
        q: "How would you write a tool that benefits from sampling but must work without it?",
        strong: "Read the client's declared capabilities off the session — they arrived in the handshake — and branch. If sampling is available, call create_message; if not, fall back to something non-model like a truncation or an extract, and return degraded: true in the payload so the model can tell the user it got the cheap version rather than presenting a truncation as a summary.",
        answer: [
          { t: "p", text: "The capability check is the mechanism and it is cheap, since the information is already on the session from initialize." },
          { t: "p", text: "The degraded flag is the detail that shows care about the consumer: without it the difference between a real summary and the first 200 characters is invisible to everyone downstream." }
        ]
      }
    ]
  }
});
