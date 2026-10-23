/* ============================================================================
   LESSON 1.3 — Tools, Resources and Prompts
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "Three primitives, and almost every server built in a hurry uses only the first. **The distinction is not about the shape of the data — it is about who decides.** A tool is chosen by the model, a resource is chosen by the application, and a prompt is chosen by the user. Getting that wrong does not break anything; it quietly costs a model call for every piece of data a host could have fetched for free.",

  objectives: [
    "State the control question that separates the three primitives",
    "Expose read-only data as a resource rather than behind a tool",
    "Use a resource template for a parameterised address",
    "Decide what belongs in a prompt and what belongs in an instruction",
    "Recognise when a host's support, not your design, decides the answer"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "The question that separates them", id: "control" },

    {"kind": "trace", "title": "Who decides - and the model turn that answer costs", "caption": "**The specification's own distinction is one word each, and the cost column is why it matters.** A rate table behind a tool means a declaration the model must consider, a call it must decide to emit, and a second invocation carrying the result: two model turns to obtain a string the host could have read before the conversation opened. **The rule that falls out is short — if the answer does not depend on what the model is thinking, it is not a tool.**", "left": "primitive", "codeW": 150, "vars": ["who decides", "model turns", "right for"], "steps": [{"code": "tool", "state": ["the MODEL", "2 per use", "side effects, computation"], "tone": "accent"}, {"code": "resource", "state": ["the APPLICATION", "0", "read-only context"], "changed": [0, 1, 2], "tone": "good"}, {"code": "prompt", "state": ["the USER", "0 until invoked", "a recurring task"], "changed": [0, 1, 2], "tone": "violet"}, {"code": "so a rate table as a tool", "state": ["the model", "2, for a string", "nothing - make it a resource"], "changed": [0, 1, 2], "tone": "crit"}], "t": "diagram", "id": "dg-1_3-01-0"},

    { t: "p", text: "The specification names the distinction, and it is one word each: **model-controlled**, **application-controlled**, **user-controlled**. Everything else follows." },

    { t: "dl", items: [
      ["A tool is model-controlled", "The model decides when to call it, which means it must be described well enough to be chosen correctly, and calling it costs a model turn. Right for anything with a side effect, anything requiring arguments the model has to work out, and anything you do not want to happen unless the model judged it necessary."],
      ["A resource is application-controlled", "The host decides when to read it, usually before the model is asked anything. Right for read-only context the model will probably need: a schema, a configuration, a document the user has open. **No model call is spent deciding to fetch it.**"],
      ["A prompt is user-controlled", "The user picks it, typically from a menu in the host. Right for a parameterised task that recurs: *“review this invoice”*, *“summarise this incident”*. It is a template you are publishing, not an instruction you are imposing."]
    ] },

    { t: "callout", kind: "insight", title: "The cost difference is the whole argument",
      body: [
        { t: "p", text: "Exposing the current exchange-rate table as a tool means: the model receives a declaration for it, decides it needs rates, emits a call, the server answers, and the model is invoked again with the result. **That is two model turns to obtain a string the host could have read before the conversation started.**" },
        { t: "p", text: "Exposing it as a resource means the host reads it and includes it, and the model spends nothing deciding. The rule that falls out is short: **if the answer does not depend on what the model is thinking, it is not a tool.**" }
      ] },

    { t: "h2", n: "02", text: "All three, registered and read", id: "registered" },

    {"kind": "flow", "title": "Templates come back from a different call", "caption": "**`list_resources` returned only the concrete `rates://current`.** The parameterised `vat://{country}` is in `list_resource_templates`, because a template cannot be read until a parameter is supplied — which is the point of templates, since it lets a server describe the shape of an address without enumerating ten thousand instances. **A client that only calls `list_resources` is blind to all of them**, so if you expect a host to discover a template, check that it asks.", "cols": 3, "nodes": [{"id": "c", "label": "rates://current", "sub": "a concrete URI", "tone": "good"}, {"id": "l", "label": "list_resources", "sub": "returns it", "tone": "good"}, {"id": "t", "label": "vat://{country}", "sub": "a template", "tone": "violet"}, {"id": "r", "label": "list_resource_templates", "sub": "returns it - a DIFFERENT call", "tone": "violet"}, {"id": "b", "label": "A client that lists only resources", "sub": "never sees the template", "tone": "crit"}], "edges": [["c", "l"], ["t", "r"], ["r", "b"]], "t": "diagram", "id": "dg-1_3-02-1"},

    { t: "code", lang: "python", title: "one server, three primitives",
      code: `from mcp.server.fastmcp import FastMCP

mcp = FastMCP("finance", instructions="Currency conversion and VAT for European invoices.")

RATES = {("GBP", "EUR"): 1.17, ("EUR", "GBP"): 0.85, ("GBP", "USD"): 1.27}
VAT = {"IE": 0.23, "DE": 0.19, "FR": 0.20, "GB": 0.20}

@mcp.tool()                                   # model-controlled: it computes
def convert(amount: float, frm: str, to: str) -> dict:
    """Converts an amount between two currencies."""
    rate = RATES.get((frm.upper(), to.upper()))
    if rate is None:
        return {"error": "no rate for %s->%s" % (frm, to), "retryable": False}
    return {"amount": round(amount * rate, 2), "currency": to.upper(), "rate": rate}

@mcp.resource("rates://current")              # application-controlled: it just IS
def current_rates() -> str:
    """The rate table this server is using."""
    return "\\n".join("%s->%s %.2f" % (a, b, r) for (a, b), r in RATES.items())

@mcp.resource("vat://{country}")              # a TEMPLATE: parameterised address
def vat_rate(country: str) -> str:
    """The VAT rate for one country."""
    r = VAT.get(country.upper())
    return "no rate" if r is None else "%s %.0f%%" % (country.upper(), r * 100)

@mcp.prompt()                                 # user-controlled: they pick it
def invoice_check(country: str) -> str:
    """A prompt template for checking an invoice's tax treatment."""
    return ("Check this invoice for %s. Confirm the VAT rate is correct, "
            "convert the total to EUR, and flag anything inconsistent." % country.upper())`,
      caption: "Three decorators, three different answers to *“who decides when this is used”*. Note that `convert` genuinely computes from its arguments, while `current_rates` returns the same thing however it is asked — which is the test for whether something is a tool." },

    { t: "code", lang: "python", title: "what a client sees of each",
      code: `rs = await session.list_resources()
for r in rs.resources:
    print("  %-18s %s" % (str(r.uri), r.name))

ts = await session.list_resource_templates()
for t in ts.resourceTemplates:
    print("  template: %-16s %s" % (t.uriTemplate, t.name))

got = await session.read_resource("rates://current")
print("  read ->", repr(got.contents[0].text))

ps = await session.list_prompts()
for p in ps.prompts:
    print("  %s(%s)" % (p.name, ", ".join(a.name for a in (p.arguments or []))))

pr = await session.get_prompt("invoice_check", {"country": "ie"})
print("  rendered:", repr(pr.messages[0].content.text))`,
      out: `  rates://current    current_rates
  template: vat://{country}  vat_rate
  read -> 'GBP->EUR 1.17\\nEUR->GBP 0.85\\nGBP->USD 1.27'
  invoice_check(country)
  rendered: 'Check this invoice for IE. Confirm the VAT rate is correct, convert the total to EUR, and flag anything inconsistent.'`,
      caption: "**Note that templates come back from a different call.** `list_resources` returned only the concrete `rates://current`; the parameterised `vat://{country}` is in `list_resource_templates`, because a template is not a thing you can read until a parameter is supplied. A client that only calls `list_resources` will never see it." },

    { t: "h2", n: "03", text: "Resources and their URIs", id: "resources" },

    {"kind": "trace", "title": "Four rules for a resource, and the one with teeth", "caption": "**Nothing in the protocol stops a read from doing work, and nothing promises how often a host will call it — and those two facts combine badly.** A host that pre-fetches every listed resource when a conversation opens is behaving correctly, so a read that increments a counter or sends a notification will fire on connections where nobody asked for anything. The discipline is one line: **a read answers what the value is; anything answering do this is a tool.**", "left": "property", "codeW": 190, "vars": ["consequence"], "steps": [{"code": "addressed by a URI you invent", "state": ["rates://current, db://orders/4821 - any scheme"], "tone": "good"}, {"code": "concrete URIs are listable", "state": ["a host can show, offer or auto-read them"], "changed": [0], "tone": "good"}, {"code": "templates are discoverable, not listable", "state": ["shape without enumerating instances"], "changed": [0], "tone": "accent"}, {"code": "content is text OR binary, with a MIME type", "state": ["a PDF or an image is legitimate"], "changed": [0], "tone": "accent"}, {"code": "reads must be cheap and side-effect free", "state": ["a host may read speculatively, repeatedly"], "changed": [0], "tone": "crit"}], "t": "diagram", "id": "dg-1_3-03-2"},

    { t: "p", text: "A resource is addressed by a URI, and the scheme is yours to invent. `rates://current`, `file:///path`, `db://orders/4821` are all fine; the only requirement is that it is a URI and that it identifies the thing stably." },

    { t: "dl", items: [
      ["Concrete resources are listable", "A fixed URI appears in `resources/list`, so a host can show it, offer it, or read it automatically. Use these for the handful of things a host should know exist."],
      ["Templates are discoverable but not listable", "`vat://{country}` tells a client the shape of an address without enumerating every instance — which matters when there are ten thousand of them. The client fills the parameter from something it already knows."],
      ["Content is text or binary", "A resource read returns contents with a MIME type, so a PDF or an image is as legitimate as a string. The host decides what to do with it, which may be giving it to the model directly."],
      ["Reads should be cheap and side-effect free", "A host may read a resource speculatively, more than once, or in parallel with others. A resource read that charges money or mutates state is a tool wearing the wrong decorator."]
    ] },

    { t: "callout", kind: "trap", title: "A resource with side effects is a bug waiting for a host upgrade",
      body: [
        { t: "p", text: "Nothing in the protocol stops `resources/read` from doing anything you like, and nothing in the protocol promises how often a host will call it. **Those two facts combine badly.** A host that pre-fetches every listed resource when a conversation opens is behaving correctly, and if one of your reads increments a counter or sends a notification, you will see it fire on connections where nobody asked for anything." },
        { t: "p", text: "The discipline is simple: a read answers *what is the value*, and anything that answers *do this* is a tool." }
      ] },

    { t: "h2", n: "04", text: "Prompts, and what they are not", id: "prompts" },

    {"kind": "trace", "title": "Five things you might want, and only one of them is a control", "caption": "**Three of these rows put text in front of a model and hope; the last one is enforceable.** That is the sentence to carry out of the lesson. A prompt in particular cannot steer anything — nothing sends one automatically and a server cannot make a host use one, so it is a template you publish for a user to pick rather than an instruction you impose.", "left": "you want", "codeW": 190, "vars": ["use", "because"], "steps": [{"code": "a repeatable task the user starts", "state": ["a prompt", "they choose it; your template saves typing"], "tone": "violet"}, {"code": "context the model will likely need", "state": ["a resource", "the host fetches it, no model turn"], "changed": [0, 1], "tone": "good"}, {"code": "something to happen", "state": ["a tool", "side effects need a decision"], "changed": [0, 1], "tone": "accent"}, {"code": "a convention across all your tools", "state": ["instructions", "it describes the server, not an operation"], "changed": [0, 1], "tone": "accent"}, {"code": "a rule that MUST hold", "state": ["code in the tool", "none of the above is enforceable"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-1_3-04-3"},

    { t: "p", text: "A prompt is the least used of the three and the most misunderstood. It is **a template the user invokes**, surfaced by the host as something selectable — a slash command, a menu item, a button." },

    { t: "p", text: "The misunderstanding is to treat it as a way of steering the model. It is not: nothing sends a prompt automatically, and a server cannot make a host use one. If you need the model to behave a certain way whenever your tools are in play, that belongs in the server's `instructions` (lesson 1.2) or in the tool descriptions — and even then it is a request rather than a control." },

    { t: "table",
      head: ["You want", "Use", "Because"],
      rows: [
        ["A repeatable task the user starts", "A **prompt**", "The user chooses it, and your template saves them writing it"],
        ["Context the model will likely need", "A **resource**", "The host fetches it with no model turn spent"],
        ["Something to happen", "A **tool**", "The model decides, and side effects need a decision"],
        ["A convention across all your tools", "`instructions`", "It describes the server, not one operation"],
        ["A rule that must hold", "**Code in the tool**", "None of the above is enforceable"]
      ] },

    { t: "p", text: "The last row is the one to carry out of this lesson. Three of the five rows put text in front of a model and hope; only the last one is a control." },

    { t: "h2", n: "05", text: "What the host actually supports", id: "support" },

    {"kind": "tree", "title": "Host support decides whether a correct design does anything", "caption": "**This is why servers drift towards tool-only designs, and it is rational rather than lazy:** a tool is the one primitive guaranteed to be used. The pragmatic shape is to model everything correctly and expose the one or two important read-only items twice — one function, two decorators — so a well-built host gets the efficient path and a tool-only host still works. **Do not do it for everything**, because each extra tool is a declaration in every request and a candidate for mis-selection.", "root": {"label": "You modelled it as a resource or a prompt", "sub": "will the host actually use it?", "tone": "accent", "children": [{"label": "Tools", "sub": "every MCP host calls them", "tone": "good", "children": [{"label": "Always works", "sub": "which is why servers drift here", "tone": "good"}]}, {"label": "Resources", "sub": "the host must decide when to read", "tone": "warn", "children": [{"label": "Uneven: some hosts, some only on user action", "sub": "a resource nobody reads is not a win", "tone": "warn"}]}, {"label": "Prompts", "sub": "need a menu to be reachable", "tone": "crit", "children": [{"label": "Inert in a headless agent service", "sub": "correctly designed, never invoked", "tone": "crit"}]}, {"label": "So for hosts you do not control", "sub": "expose key data as both", "tone": "violet"}]}, "t": "diagram", "id": "dg-1_3-05-4"},

    { t: "p", text: "A design decision made correctly can still come to nothing, because **the host decides what to do with resources and prompts**, and host support is uneven in a way tool support is not." },

    { t: "dl", items: [
      ["Tools are supported everywhere", "Every host that implements MCP calls tools. This is why servers drift towards tool-only designs: it is the one primitive guaranteed to be used."],
      ["Resources depend on the host having somewhere to put them", "A host must decide when to read and where the content goes in the model's context. Some do this well, some only on explicit user action, some not at all."],
      ["Prompts need a user interface", "A prompt is only reachable if the host renders a menu of them. A headless agent service has no menu, so prompts are inert there — correctly designed and never invoked."],
      ["So check your host before deciding", "The capability flags in the initialize response are the client's side of this; the host's own documentation is the rest. A resource nobody reads is not a design win."]
    ] },

    { t: "callout", kind: "tradeoff", title: "The pragmatic shape",
      body: [
        { t: "p", text: "**Model everything correctly, and expose the important read-only data twice** if your consumers are hosts you do not control: as a resource, which is the right design, and as a cheap tool for hosts that will only ever call tools. It is a small duplication — one function, two decorators — and it means a correctly built host gets the efficient path while a tool-only host still works." },
        { t: "p", text: "Do not do this for everything. Each extra tool is a declaration in every request and a candidate for mis-selection, so duplicate the one or two things a model genuinely needs often, and leave the rest as resources." }
      ] },

    { t: "exercise", kind: "practice", title: "Classify, then measure the difference", difficulty: "core", minutes: 24,
      prompt: "Take six capabilities from a system you know — mix read-only lookups, computations and actions with side effects. Classify each as tool, resource or prompt, and write one sentence per decision naming who decides when it is used. Then build a server with the two you classified as resources ALSO exposed as tools, connect a client, and count: how many round trips does the host need to get that data as a resource, and how many as a tool? Finally, write a resource template for something with many instances and confirm it appears in list_resource_templates and not in list_resources.",
      hints: [
        "The test for a tool is whether the answer depends on arguments the model must work out.",
        "Count round trips, not milliseconds — the model turn is the cost.",
        "Anything that charges money or mutates state is a tool, whatever its shape."
      ],
      solution: {
        notes: [
          { t: "p", text: "The round-trip count is the point of the exercise: the resource path is one host-initiated read and no model involvement, while the tool path is a declaration sent, a call decided, a result returned and the model invoked again. Having seen that gap once, the classification stops feeling like pedantry." },
          { t: "p", text: "The template confirmation catches a real bug in client code. A client that only calls `list_resources` sees nothing of your templates, so if you expect a host to discover `vat://{country}` you need to check that it asks — and if it does not, the data needs a concrete resource or a tool as well." }
        ]
      } }

  ],

  takeaways: [
    "**The three primitives answer who decides:** a tool is model-controlled, a resource is application-controlled, a prompt is user-controlled.",
    "**If the answer does not depend on what the model is thinking, it is not a tool.** A rate table behind a tool costs two model turns to fetch a string.",
    "**A resource is addressed by a URI whose scheme you invent** — `rates://current` — and read with `resources/read`.",
    "**Templates come from a different call.** `vat://{country}` appears in `list_resource_templates`, not `list_resources`, so a client that only lists resources never sees it.",
    "**Resource reads must be cheap and side-effect free**, because a host may read them speculatively, repeatedly or in parallel — a read that mutates state is a tool with the wrong decorator.",
    "**A prompt is a template the user invokes**, not a way to steer the model. Nothing sends one automatically and a server cannot make a host use one.",
    "**A convention across your tools belongs in `instructions`; a rule that must hold belongs in the tool's code.** Everything else only puts text in front of a model and hopes.",
    "**Tool support is universal; resource and prompt support is not.** A headless agent service has no menu, so prompts are inert there however well designed.",
    "**For hosts you do not control, expose important read-only data twice** — as a resource for correctness and as a cheap tool for tool-only hosts — but only for the one or two things that matter, since every tool is a declaration in every request."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A server exposes its current exchange-rate table as a tool. What does that cost compared with a resource?",
        options: [
          "Nothing — the data is identical either way",
          "Two model turns: a declaration the model must consider, a call it must decide to emit, and a second invocation with the result — where a resource is one host-initiated read with no model involvement",
          "Extra bandwidth only",
          "It is cheaper, because tools are cached"
        ],
        answer: 1,
        why: "The model turn is the cost that matters, not the bytes. The rule it yields is the one to carry: if the answer does not depend on what the model is thinking, it is not a tool."
      },
      {
        stem: "A client calls `resources/list` and does not see `vat://{country}`, which the server definitely registered. Why?",
        options: [
          "The server failed to advertise the resources capability",
          "It is a template, not a concrete resource — templates are returned by `list_resource_templates`, because a template cannot be read until a parameter is supplied",
          "Templates are only visible after a read",
          "The URI scheme is invalid"
        ],
        answer: 1,
        why: "Templates exist so a server can describe the shape of an address without enumerating ten thousand instances. The practical consequence is that a client which only lists resources is blind to them, which is worth checking before relying on host discovery."
      },
      {
        stem: "A `resources/read` handler increments a usage counter. What goes wrong?",
        options: [
          "Nothing, as long as the counter is thread-safe",
          "A host may read resources speculatively, more than once, or in parallel — so the counter fires on connections where nobody asked for anything, and the protocol never promised otherwise",
          "The read will be rejected by the client",
          "Counters are not allowed in MCP servers"
        ],
        answer: 1,
        why: "Two facts combine badly: the protocol does not stop a read doing work, and it does not promise how often a host will call it. A read answers what the value is; anything answering do this belongs in a tool."
      },
      {
        stem: "You need the model to follow a convention whenever your server's tools are used. Where does it go?",
        options: [
          "A prompt, since prompts steer the model",
          "The server's `instructions`, which describes the server as a whole — and if the convention must actually hold, in the tool's own code, because none of the text-based options is enforceable",
          "A resource the host will read",
          "The tool names"
        ],
        answer: 1,
        why: "Prompts are user-invoked and nothing sends them automatically, so they cannot carry a convention. Instructions are the right home for a cross-tool hint, and the honest framing is that a hint is a request while code is a control."
      },
      {
        stem: "Why do servers drift towards exposing everything as tools?",
        options: [
          "Tools are faster",
          "Tool support is universal across hosts while resource and prompt support is uneven, so a tool is the only primitive guaranteed to be used",
          "Resources were added to the protocol later",
          "The SDK makes resources harder to write"
        ],
        answer: 1,
        why: "It is a rational response to an uneven ecosystem rather than laziness. The pragmatic middle is to model correctly and duplicate the one or two important read-only items as cheap tools, accepting that each extra tool is a declaration in every request."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the difference between a tool, a resource and a prompt in MCP?",
        strong: "Who decides when it is used. A tool is model-controlled, so the model chooses to call it and that costs a turn — right for side effects and computations. A resource is application-controlled, so the host reads it without consulting the model — right for read-only context like a schema or a document. A prompt is user-controlled, surfaced as something selectable, for a recurring parameterised task.",
        answer: [
          { t: "p", text: "Leading with the control question rather than the data shape is what the question is checking, because it is the distinction the specification actually draws." },
          { t: "p", text: "The cost consequence is the detail that shows practical use: a rate table behind a tool is two model turns for a string the host could have fetched before the conversation started." },
          { t: "p", text: "A strong finish notes that host support is uneven — tools work everywhere, prompts need a menu to be reachable at all — which is why real servers often expose important data as both a resource and a cheap tool." }
        ]
      },
      {
        level: "advanced",
        q: "How would you decide what to expose from a system you own?",
        strong: "Per capability, on two questions. Does the answer depend on arguments the model has to work out, or does it just have a current value? And does it have side effects? Anything with side effects is a tool regardless. Current values become resources, with templates where there are many instances. Recurring user tasks become prompts. Then I check what the target hosts actually support, because a resource nobody reads is not a win.",
        answer: [
          { t: "p", text: "Having two concrete questions rather than a vibe is the answer; the side-effect one is the override that keeps it safe." },
          { t: "p", text: "Checking host support before finalising is the detail that distinguishes someone who has shipped a server from someone who has designed one — prompts in a headless agent service are inert however well modelled." },
          { t: "p", text: "The best answers mention the tool-count cost explicitly: duplicating read-only data as a tool is a real option and it is not free, because every declaration is in every request and is a candidate for mis-selection." }
        ]      },
      {
        level: "advanced",
        q: "A colleague says they will use prompts to make the model follow their server's rules. What do you tell them?",
        strong: "That prompts cannot do that. A prompt is user-controlled — the host surfaces it as something selectable and nothing sends it automatically, so a server cannot make a host use one. A cross-tool convention belongs in the server's instructions, and a rule that must actually hold belongs in the tool's own code, because every text-based option is a request rather than a control.",
        answer: [
          { t: "p", text: "The misconception is common and the correction is the lesson's central point: the three primitives differ by who decides, and the user decides about prompts." },
          { t: "p", text: "Naming the escalation — prompt, instructions, tool code — shows the full ladder rather than just rejecting the idea, and the last rung is the only enforceable one." },
          { t: "p", text: "A good answer adds that in a headless agent service there is no menu at all, so prompts are inert there however well written. That is a deployment fact rather than a design one, and it is the reason the question comes up." }
        ]
      }
    ]
  }
});
