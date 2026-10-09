EC.receiveLesson({
  id: "12.6",
  lede: "`add_node` is a build-time call, so *\u201cadd a worker\u201d* normally means editing the graph and redeploying. The registry pattern turns the worker **set** into data: one generic executor node plus a dict of worker specs, and adding `billing` to the dict then invoking the **same compiled graph** ran it. What that costs is the topology \u2014 8.9's drawing now shows one node called `executor` whatever the registry contains, so the thing you would look at to understand the system tells you nothing about it. Which is 8.8's `Command` problem in a stronger form: there an annotation could recover the destinations, and here the worker set is **not in the code at all**.",
  objectives: [
    "Replace fixed worker nodes with a registry and a generic executor",
    "Add a worker at runtime with no recompile",
    "Say what the pattern costs and why it is worse than 8.8's case",
    "Make the registry read safe for in-flight runs",
    "Decide when the pattern is worth it"
  ],
  prerequisites: ["12.2", "8.9", "10.7"],
  blocks: [
    { t: "h2", n: "01", id: "problem", text: "add_node is a build-time call", sub: "So the worker set is topology" },

    { t: "code", lang: "python", title: "One generic executor, and a dict",
      code: 'REGISTRY = {\n    "docs":    {"prompt": "You answer from the documentation.", "enabled": True},\n    "account": {"prompt": "You answer about accounts.",         "enabled": True},\n}\n\ndef executor(state):\n    spec = REGISTRY.get(state["worker"])\n    if spec is None or not spec["enabled"]:\n        return {"trace": ["executor: %r unavailable" % state["worker"]]}\n    return {"results": [...], "trace": ["executor ran %s" % state["worker"]]}',
      out: "    worker=docs      -> ['executor ran docs']\n    worker=account   -> ['executor ran account']",
      caption: "The worker set is now runtime state rather than topology." },
    { t: "h2", n: "02", id: "runtime", text: "Adding one at runtime", sub: "No recompile" },

    {"kind": "steps", "title": "The registry turns the worker set into data", "caption": "`add_node` is a build-time call, so *“add a worker”* normally means editing the graph and redeploying. One generic executor plus a dict of specs removes that — and the safety comes from what a row **cannot** say.", "items": [{"label": "one generic executor node", "desc": "it reads a spec and runs it; the graph topology never changes", "tone": "accent", "code": "build time"}, {"label": "a dict of worker specs", "desc": "a prompt, a tool list from an ALLOWLIST, and a few flags", "tone": "good", "code": "data"}, {"label": "nothing else may be expressed", "desc": "no code, no new tool, no permission — or the registry grants capabilities without review", "tone": "crit", "code": "the limit"}, {"label": "enabled defaults to OFF", "desc": "so adding a row and turning it on are two deliberate steps", "tone": "good", "code": "safety"}], "t": "diagram", "id": "dg-12_6-02-0"},


    { t: "code", lang: "text", title: "The same compiled graph",
      code: "added 'billing' to the registry, then invoked the SAME compiled graph:\n  ['executor ran billing']",
      caption: "The graph never changed." },
    { t: "p", text: "The worker is a row of data the executor reads, so a new one needs no `add_node`, no `compile()` and no deploy \u2014 which is the entire point and also the entire cost." },
    { t: "h2", n: "03", id: "cost", text: "What this costs", sub: "The topology stops describing the system" },
    { t: "code", lang: "text", title: "draw_ascii(), whatever the registry contains",
      code: "+-----------+\n| __start__ |\n+-----------+\n      *\n+------------+\n|  executor  |\n+------------+",
      caption: "One node, three workers." },
    { t: "callout", kind: "warn", title: "Worse than 8.8's Command problem", body: [
      { t: "p", text: "8.8 hid the **destinations** inside node bodies, and an annotation could recover them for the renderer. Here the worker set is not in the code at all \u2014 there is nothing to annotate, because the set is a runtime value." },
      { t: "p", text: "So the registry has to **become** the documentation: a listing endpoint, or the registry itself in version control. Without one of those, the only way to know what the system can do is to read a database." }
    ] },
    { t: "h2", n: "04", id: "inflight", text: "In-flight run safety", sub: "The read has to be atomic per run" },
    { t: "p", text: "A run that started before a worker was disabled may route to it afterwards. So the registry read must be atomic **per run**, not per node execution:" },
    { t: "ul", items: [
      "read the registry once at the start of the run and carry the snapshot in the state (or the context, 10.7)",
      "or **version** the registry and pin a run to a version"
    ] },
    { t: "callout", kind: "insight", title: "Reading it per node execution makes a trace uninterpretable", body: [
      { t: "p", text: "A single run can then see two different worker sets, so the trace records decisions made against configurations that never coexisted \u2014 and no amount of logging recovers which was in force when." },
      { t: "p", text: "Which is the same argument as pinning a dependency version (10.9): a thing that can change under you mid-operation turns a reproducible failure into an unreproducible one." }
    ] },
    { t: "code", lang: "text", title: "The kill switch",
      code: "disabling a worker mid-flight:\n  ['executor: 'account' unavailable']",
      caption: "The executor **degraded** rather than raising." },
    { t: "p", text: "Which is the right default for a kill switch: the point is to stop a worker without failing every run that wanted it. A kill switch that raises turns one bad worker into a total outage." },
    { t: "h2", n: "05", id: "canary", text: "Canarying", sub: "A data change" },
    { t: "code", lang: "python", title: "A variant is a row",
      code: 'REGISTRY["docs_v2"] = {..., "traffic": 0.05}',
      caption: "And the routing decision reads it." },
    { t: "p", text: "Genuinely easier than the compiled-graph version, where two variants of a worker means two nodes and a conditional edge weighted by a random number. The caution is that a canary needs **per-variant measurement** to mean anything, so the trace has to record which variant ran \u2014 the same point as 10.5's *record which exit fired*." },
    { t: "h2", n: "06", id: "when", text: "When to use it", sub: "And the test" },
    { t: "table", head: ["worth it when", "not worth it when"], rows: [
      ["workers are genuinely added often, by people who should not need a deploy", "the worker set changes a few times a year \u2014 a deploy is cheaper than a registry, a listing endpoint and a version-pinning scheme"],
      ["workers differ only in **configuration** \u2014 a prompt, a tool list \u2014 so one executor serves all of them", "workers differ **structurally**, because then the executor grows a branch per worker and you have reinvented the graph badly"]
    ] },
    { t: "callout", kind: "mental", title: "The test: can one generic executor really run every worker?", body: [
      { t: "p", text: "If it needs an `if`-statement per worker, the registry is giving up the topology and **not** buying the flexibility \u2014 you have the opacity of a data-driven system and the rigidity of a coded one." },
      { t: "p", text: "That test also tells you when to stop: the first worker that needs special handling in the executor is the signal that this worker belongs as a real node, not a registry row." }
    ] },
    { t: "exercise", kind: "build", title: "Add a worker without recompiling",
      difficulty: "advanced", minutes: 34,
      body: "Replace fixed worker nodes with a single generic executor that reads a registry of worker specs, and confirm it runs two workers. Add a third at runtime and invoke the same compiled graph. Then draw the graph and say what the drawing tells you. Explain why the registry read must be atomic per run and what goes wrong otherwise. Demonstrate a kill switch and say why degrading is the right default. Finally give the test for whether the pattern is worth it.",
      requirements: ["Build a generic executor reading a registry and run two workers",
        "Add a worker at runtime and invoke the same compiled graph",
        "Draw the graph and say what it reveals",
        "Explain why this is worse than 8.8's Command problem",
        "Explain why the registry read must be atomic per run",
        "Demonstrate a kill switch and explain why it degrades rather than raises",
        "Give the test for whether one executor can serve every worker"],
      hint: "Draw the graph after adding a worker. The drawing is unchanged, which is the cost of the pattern.",
      solution: { lang: "python", title: "x1206.py \u2014 one node, three workers",
        code: 'def executor(state):\n    spec = REGISTRY.get(state["worker"])\n    if spec is None or not spec["enabled"]:\n        return {"trace": ["executor: %r unavailable" % state["worker"]]}\n    return {"results": [...], "trace": ["executor ran %s" % state["worker"]]}\n\napp = g.compile()\n\nREGISTRY["billing"] = {"prompt": "...", "enabled": True}\napp.invoke({"worker": "billing", ...})      # the SAME compiled graph\n\nREGISTRY["account"]["enabled"] = False      # the kill switch',
        out: "==============================================================================\nPART 1 -- the problem: add_node is a build-time call\n==============================================================================\n  a graph's nodes are fixed at compile(). so 'add a worker' normally\n  means editing the graph definition and redeploying -- which is\n  fine, and is not always available.\n\n  the registry pattern turns the worker SET into data:\n\n    ONE generic executor node, and a dict of worker specs.\n\n    worker=docs      -> ['executor ran docs']\n    worker=account   -> ['executor ran account']\n==============================================================================\nPART 2 -- adding one at runtime, with no recompile\n==============================================================================\n    added 'billing' to the registry, then invoked the SAME compiled\n    graph:\n      ['executor ran billing']\n\n  the graph never changed. the worker is a row of data the executor\n  reads, so the set of workers is runtime state rather than topology.\n==============================================================================\nPART 3 -- what this costs\n==============================================================================\n  the topology no longer describes the system. 8.9's drawing shows\n  ONE node called 'executor', whatever the registry contains -- so\n  the thing you would look at to understand the system now tells you\n  nothing about it.\n\n\n  which is 8.8's Command problem in a stronger form: there, the\n  destinations were hidden in node bodies and an annotation could\n  recover them. here the worker set is not in the code at all.\n\n  so the registry has to become the documentation: a listing\n  endpoint, or the registry itself in version control.\n==============================================================================\nPART 4 -- in-flight run safety\n==============================================================================\n  a run that started before a worker was disabled may route to it\n  afterwards. so the registry read has to be ATOMIC per run, not per\n  node execution:\n\n    - read the registry once at the start of the run and carry the\n      snapshot in the state (or in the context, 10.7)\n    - or version the registry and pin a run to a version\n\n  reading it per node execution means a run can see two different\n  worker sets, which makes a trace impossible to interpret -- the\n  same argument as pinning a dependency version (10.9).\n\n  disabling a worker mid-flight (the kill switch):\n    [\"executor: 'account' unavailable\"]\n\n  note the executor DEGRADED rather than raising -- which is the\n  right default for a kill switch, because the point is to stop a\n  worker without failing every run that wanted it.\n==============================================================================\nPART 5 -- canarying\n==============================================================================\n  the registry makes a canary a data change:\n\n    REGISTRY['docs_v2'] = {..., 'traffic': 0.05}\n\n  and the routing decision reads it. which is genuinely easier than\n  the compiled-graph version, where two variants of a worker means\n  two nodes and a conditional edge weighted by a random number.\n\n  the caution is that a canary needs per-variant measurement to mean\n  anything, so the trace has to record WHICH variant ran -- the same\n  point as 10.5's 'record which exit fired'.\n==============================================================================\nPART 6 -- when to use it\n==============================================================================\n  worth it when:\n    - workers are genuinely added often, by people who should not\n      need a deploy\n    - workers differ only in configuration (a prompt, a tool list),\n      so one executor can serve all of them\n\n  not worth it when:\n    - the worker set changes a few times a year. then a deploy is\n      cheaper than a registry, a listing endpoint and a version\n      pinning scheme.\n    - workers differ structurally, because then the executor grows\n      a branch per worker and you have reinvented the graph badly\n\n  the test: can one generic executor really run every worker? if it\n  needs an if-statement per worker, the registry is giving up the\n  topology and not buying the flexibility.",
        notes: [
          { t: "p", text: "**`add_node` is a build-time call**, so the worker set is normally topology \u2014 and the registry pattern turns it into data." },
          { t: "p", text: "**Adding a worker to the dict and invoking the same compiled graph ran it** \u2014 no `add_node`, no `compile()`, no deploy." },
          { t: "p", text: "**The drawing shows one node called `executor`** whatever the registry contains, so the thing you would read to understand the system tells you nothing." },
          { t: "p", text: "**Which is worse than 8.8's `Command` problem**: there an annotation could recover the destinations, and here the worker set is not in the code at all." },
          { t: "p", text: "**So the registry must become the documentation** \u2014 a listing endpoint, or the registry in version control." },
          { t: "p", text: "**The registry read must be atomic per run**, by snapshotting it into the state or pinning a version." },
          { t: "p", text: "**Otherwise one run sees two worker sets**, and the trace records decisions against configurations that never coexisted \u2014 10.9's version-pinning argument." },
          { t: "p", text: "**The kill switch degraded rather than raising**, which is right: a kill switch that raises turns one bad worker into a total outage." },
          { t: "p", text: "**The test: can one generic executor really run every worker?** If it needs an `if` per worker, you have the opacity of a data-driven system and the rigidity of a coded one." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the registry nobody could read", body: [
      { t: "p", text: "A team adopts the registry pattern so that product managers can add workers without a deploy. Eighteen months later there are forty workers, the registry lives in a production database, and no engineer can say what the system does without querying it. The graph diagram shows three nodes." },
      { t: "p", text: "The pattern worked exactly as intended and the documentation never caught up. The topology stopped describing the system on day one, and nothing replaced it \u2014 so the system's capabilities became a runtime fact rather than a reviewable artefact." },
      { t: "p", text: "Two things would have prevented it, and both are cheap at the start and expensive later. Keep the registry in version control as the source of truth and sync it to the database, so a change is a reviewable diff. And expose a listing endpoint, so \u201cwhat can this system do\u201d has an answer that is not a SQL query. The general rule is that a pattern which removes a reviewable artefact has to supply a replacement, and \u201cwe will document it\u201d is not one." }
    ] }
  ],
  takeaways: [
    "**`add_node` is a build-time call**, so the worker set is normally topology.",
    "**The registry pattern turns it into data**: one generic executor plus a dict of specs.",
    "**Adding a worker to the dict ran it on the same compiled graph** \u2014 no deploy.",
    "**And the drawing shows one node whatever the registry contains.**",
    "**Worse than 8.8's `Command` problem** \u2014 there an annotation could recover the destinations.",
    "**Here the worker set is not in the code at all**, so there is nothing to annotate.",
    "**So the registry must become the documentation** \u2014 a listing endpoint or version control.",
    "**The registry read must be atomic per run**: snapshot it, or pin a version.",
    "**Otherwise one run sees two worker sets** and the trace is uninterpretable.",
    "**Which is 10.9's version-pinning argument** \u2014 a thing that changes mid-operation destroys reproducibility.",
    "**A kill switch should degrade rather than raise**, or one bad worker is a total outage.",
    "**A canary becomes a data change**, and needs per-variant measurement to mean anything.",
    "**Worth it when workers are added often and differ only in configuration.**",
    "**Not worth it for a few changes a year** \u2014 a deploy is cheaper than the whole scheme.",
    "**The test: if the executor needs an `if` per worker, you have the opacity and the rigidity.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What does the registry pattern cost?",
      options: ["Extra latency from the registry lookup",
        "The topology stops describing the system \u2014 the drawing shows one executor node whatever the registry contains",
        "The ability to use checkpointers",
        "Type safety on worker inputs"],
      answer: 1,
      why: "The graph diagram is the fastest way into an unfamiliar system, and after this change it conveys nothing about which workers exist. It is worse than hiding Command destinations in node bodies, because there an annotation can restore the drawing \u2014 here the worker set is a runtime value, so there is nothing in the code to annotate. The registry must become the documentation." },
    { stem: "Why must the registry be read atomically per run?",
      options: ["Dictionary reads are not thread-safe",
        "Otherwise one run can see two different worker sets, so the trace records decisions against configurations that never coexisted",
        "The checkpointer serialises the registry",
        "Workers cache their specs after first use"],
      answer: 1,
      why: "A run that begins before a worker is disabled may route to it afterwards, and a per-execution read means different nodes in the same run observe different configurations. That makes a failure unreproducible, since no single registry state explains the trace. Snapshotting into the state or pinning a version fixes it \u2014 the same reasoning as pinning a dependency version." },
    { stem: "A kill switch disables a worker mid-flight. Should the executor raise?",
      options: ["Yes \u2014 the caller needs to know the worker is gone",
        "No \u2014 it should degrade, because a kill switch that raises turns one bad worker into a total outage",
        "Yes, so the retry policy can take over",
        "Only if no other worker can serve the request"],
      answer: 1,
      why: "The purpose of a kill switch is to stop one worker without failing every request that wanted it. Raising propagates the failure to the whole run, which converts a targeted mitigation into an outage \u2014 the opposite of what the switch was flipped for. Degrading lets the run continue, report the unavailability, and route elsewhere if it can." },
    { stem: "What is the test for whether the registry pattern is worth it?",
      options: ["Whether more than ten workers exist",
        "Whether one generic executor can genuinely run every worker \u2014 if it needs an if-statement per worker, you have the opacity without the flexibility",
        "Whether the team deploys more than weekly",
        "Whether the workers are owned by different teams"],
      answer: 1,
      why: "The pattern pays off when workers differ only in configuration \u2014 a prompt, a tool list \u2014 so one executor serves all of them. The moment a worker needs special handling in the executor, you have given up the inspectable topology and reintroduced per-worker code, which is the worst of both. That first special case is the signal the worker belongs as a real node." }
  ] },
  interview: { title: "Interview practice", sub: "Adding an agent after deployment", questions: [
    { level: "core", q: "How would you add a worker to a deployed multi-agent system without a redeploy?",
      strong: "A strong answer describes the registry and names its cost.",
      answer: [
        { t: "p", text: "A registry and a generic executor. One node that reads a dict of worker specs \u2014 a prompt, a tool list, an enabled flag \u2014 and runs whichever one the routing decision named. Adding a worker is then adding a row, and I verified that against the same compiled graph: no add_node, no compile, no deploy." },
        { t: "p", text: "What it costs is the topology. The drawn graph shows one node called executor whatever the registry contains, so the artefact you would read to understand the system tells you nothing about it." },
        { t: "p", text: "That is worse than hiding routing inside Command returns, because there an annotation restores the drawing. Here the worker set is a runtime value, so there is nothing in the code to annotate." },
        { t: "p", text: "So the registry has to become the documentation \u2014 kept in version control as the source of truth, with a listing endpoint so 'what can this system do' is answerable without a database query. A pattern that removes a reviewable artefact has to supply a replacement." }
      ] },
    { level: "advanced", q: "What are the operational hazards of a runtime worker registry?",
      strong: "A strong answer names the atomic read and the kill-switch behaviour.",
      answer: [
        { t: "p", text: "Three, and the first is the one that destroys debuggability." },
        { t: "p", text: "The registry read has to be atomic per run. If each node execution reads it fresh, a single run can observe two different worker sets \u2014 so the trace records decisions made against configurations that never coexisted, and no amount of logging recovers which was in force when. I would snapshot the registry into the state at the start of the run, or version it and pin the run to a version. Same argument as pinning a dependency." },
        { t: "p", text: "Second, the kill switch has to degrade rather than raise. The point of disabling a worker is to stop that worker, not to fail every request that wanted it \u2014 so an executor that raises on a disabled worker turns a targeted mitigation into an outage." },
        { t: "p", text: "Third, canarying is easy to add and easy to make meaningless. A variant is just another registry row with a traffic weight, which is genuinely simpler than two nodes and a weighted conditional edge \u2014 but it needs the trace to record which variant ran, or there is nothing to compare." },
        { t: "p", text: "And the test I would apply before adopting any of it: can one executor really run every worker? If it needs a branch per worker, I have given up the inspectable topology and kept the per-worker code, which is the worst of both." }
      ] },
    { level: "core", q: "How would you let non-engineers add agents safely?",
      strong: "A strong answer constrains what a registry row can express.",
      answer: [
        { t: "p", text: "By making the registry row express as little as possible \u2014 because the safety comes from what a row cannot say, not from reviewing what it does say." },
        { t: "p", text: "So a worker spec would be a prompt, a tool list drawn from an allowlist, and a few flags. Not arbitrary code, not a new tool definition, and not a permission \u2014 the tools a worker may use have to be chosen from a set an engineer approved, or the registry becomes a way to grant capabilities without review." },
        { t: "p", text: "That constraint is also what keeps the generic executor generic. The moment a row needs something the executor cannot express, the honest answer is that this worker is a real node and belongs in the graph." },
        { t: "p", text: "Operationally: the registry in version control as the source of truth so a change is a reviewable diff, a listing endpoint so the system's capabilities are answerable without a database query, a snapshot read per run so a trace is interpretable, and a kill switch that degrades rather than raises." },
        { t: "p", text: "And an enabled-by-default-off flag, so adding a row and turning it on are two steps. That makes the risky action the small, deliberate one rather than a side effect of creating the record." }
      ] }
  ] }
});
