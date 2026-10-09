EC.receiveLesson({
  id: "9.3",
  lede: "The distinction is one sentence: **a workflow is control flow you wrote, with the model filling in steps; an agent is control flow the model decides, with tools you wrote.** It is a spectrum, and the useful question for any design is *where the control sits* \u2014 because that decides what you can predict. A workflow's cost, latency and failure modes are enumerable before you ship. An agent's are not, which is precisely why 8.9's recursion limit exists: nobody can bound an agent's step count by reading it. The practical rule that falls out is to **use the least agentic pattern that solves the problem**, and most tasks described as needing an agent are a router plus three tools.",
  objectives: [
    "State the workflow-agent distinction in terms of control",
    "Implement each pattern and identify where control sits",
    "Say which patterns have enumerable execution paths",
    "Explain why an evaluator-optimiser needs two exit conditions",
    "Apply the least-agentic-pattern rule"
  ],
  prerequisites: ["9.1", "8.7"],
  blocks: [
    { t: "h2", n: "01", id: "distinction", text: "The distinction", sub: "And why it decides predictability" },

    {"kind": "layers", "title": "A spectrum, and the useful question is where the decision lives", "caption": "A workflow is control flow **you** wrote with the model filling in steps; an agent is control flow the **model** decides with tools you wrote. Most real systems are somewhere in the middle, and naming the point is more useful than picking a label.", "items": [{"label": "a chain", "sub": "every step fixed before the request arrives", "tone": "good", "side": "you decide"}, {"label": "a workflow with a router", "sub": "you wrote the branches; the model picks one", "tone": "teal", "side": "you decide"}, {"label": "a workflow with an agent step", "sub": "one node inside it is free to loop", "tone": "warn", "side": "mixed"}, {"label": "an agent with constrained tools", "sub": "the model drives; the tool list is the limit", "tone": "violet", "side": "model decides"}, {"label": "an open agent", "sub": "the model decides the whole path", "tone": "crit", "side": "model decides"}], "t": "diagram", "id": "dg-9_3-01-0"},




    { t: "table", head: ["", "control flow", "you write"], rows: [
      ["workflow", "**you** wrote it", "the structure; the model fills in steps"],
      ["agent", "the **model** decides it", "the tools; the model chooses and sequences"]
    ] },
    { t: "callout", kind: "insight", title: "It decides what you can predict", body: [
      { t: "p", text: "A workflow's cost, latency and failure modes are enumerable before you ship \u2014 you can count the model calls by reading the graph. An agent's are not." },
      { t: "p", text: "That is the concrete consequence rather than an abstraction, and 8.9's recursion limit is the evidence: a framework needs a hard step ceiling precisely because nobody can bound an agent's step count by reading it. The limit exists for agents, not for workflows." }
    ] },
    { t: "h2", n: "02", id: "chaining", text: "Prompt chaining", sub: "Control: yours, entirely" },
    { t: "code", lang: "text", title: "A fixed sequence",
      code: "['outline', 'draft', 'polish']",
      caption: "Three model calls, always, in that order." },
    { t: "p", text: "Which is a chain \u2014 8.1's rule applies, and a graph adds nothing here unless you need a gate between the steps. If you do need one, that is a reason to use a graph; wanting the steps named is not." },
    { t: "h2", n: "03", id: "routing", text: "Routing", sub: "Control: yours, with the model classifying" },
    { t: "code", lang: "text", title: "The model picks a category; you picked the destinations",
      code: "topic='refund'      -> ['classified', 'billing']\ntopic='api error'   -> ['classified', 'technical']",
      caption: "The set of possible paths is still enumerable." },
    { t: "callout", kind: "good", title: "The cheapest way to add model-driven behaviour", body: [
      { t: "p", text: "The model contributes a classification and you retain every destination, so the number of distinct execution paths equals the number of categories. Cost and latency are bounded by the most expensive branch." },
      { t: "p", text: "This is the pattern most often skipped in favour of an agent, and it solves a surprising proportion of \u201cwe need an agent\u201d requirements \u2014 because the real requirement is usually *handle these five kinds of request differently*, which is a router." }
    ] },
    { t: "h2", n: "04", id: "parallel", text: "Parallelisation", sub: "Control: yours, fan-out fixed" },
    { t: "code", lang: "text", title: "Three reviewers in one superstep",
      code: "['security review', 'performance review', 'style review', 'merged 3']",
      caption: "Latency is the slowest branch; cost is still the sum." },
    { t: "p", text: "8.6's superstep model applies in full: all three see the same snapshot, none can observe another, and the reducer on the shared findings key is **mandatory** rather than optional (8.3) \u2014 without one the fan-in raises." },
    { t: "h2", n: "05", id: "orchestrator", text: "Orchestrator-worker", sub: "Control: shared" },
    { t: "p", text: "The orchestrator decides **how many** workers at runtime, which a fixed fan-out cannot \u2014 it needs 8.7's list-returning router. In the measured run the orchestrator produced three sections, so three workers ran; a statically wired fan-out would have had to guess that number." },
    { t: "callout", kind: "warn", title: "The first pattern you cannot enumerate by reading", body: [
      { t: "p", text: "The execution graph depends on what the model planned, so cost and latency become **distributions rather than numbers**. That is the point at which capacity planning changes character: you are reasoning about a p99 rather than a count." },
      { t: "p", text: "Which also means the plan needs a bound. An orchestrator that decides to spawn two hundred workers is a correct implementation of a bad plan, and nothing downstream will question it \u2014 so the cap belongs in the orchestrator node, not in the worker." }
    ] },
    { t: "h2", n: "06", id: "evaluator", text: "Evaluator-optimiser", sub: "Control: shared, with a cycle" },
    { t: "code", lang: "text", title: "Generate, evaluate, loop back",
      code: "['generate', 'evaluate(score=1)', 'generate', 'evaluate(score=2)',\n 'generate', 'evaluate(score=3)']\nattempts: 3",
      caption: "Three iterations, ending on the quality condition." },
    { t: "callout", kind: "insight", title: "The router needs two exit conditions", body: [
      { t: "p", text: "Good enough, **and out of attempts**. The second one is the lesson: without it the only exit is the recursion limit, and 8.9 showed that a graph whose normal failure path is an exception cannot distinguish failure from runaway." },
      { t: "p", text: "With both, \u201cthe output never got good enough\u201d is a state you can route on, record, and return to the caller as a result rather than an error \u2014 which is what lets a caller decide between retrying, escalating and accepting the best attempt." }
    ] },
    { t: "h2", n: "07", id: "table", text: "Where the control sits", sub: "The whole catalogue" },
    { t: "table", head: ["pattern", "control", "paths enumerable?"], rows: [
      ["prompt chaining", "yours", "**yes** \u2014 exactly one"],
      ["routing", "yours", "**yes** \u2014 one per category"],
      ["parallelisation", "yours", "**yes** \u2014 fixed fan-out"],
      ["orchestrator-worker", "shared", "no \u2014 count from runtime"],
      ["evaluator-optimiser", "shared", "no \u2014 iterations from runtime"],
      ["agent", "the model's", "no \u2014 nothing is bounded"]
    ] },
    { t: "callout", kind: "mental", title: "Use the least agentic pattern that solves the problem", body: [
      { t: "p", text: "Every row down that table trades predictability for flexibility. Reading upward is the cheaper direction: a bounded pattern that nearly works is usually closer to a solution than an agent that works unpredictably." },
      { t: "p", text: "And most tasks described as needing an agent are a router plus three tools. The tell is whether the *sequence* of operations genuinely varies by request, or whether only the *choice* does \u2014 the second is routing, and it keeps every property you want." }
    ] },
    { t: "exercise", kind: "build", title: "Implement the pattern catalogue",
      difficulty: "core", minutes: 30,
      body: "Implement prompt chaining, routing, parallelisation, orchestrator-worker and evaluator-optimiser as graphs, and for each one say where the control sits and whether the execution paths are enumerable by reading the code. For the parallel pattern note what the reducer is doing. For the evaluator-optimiser, give the router two exit conditions and explain why the second is necessary. Finally produce the comparison and state the rule it implies.",
      requirements: ["Implement at least five patterns as graphs",
        "For each, identify where the control sits",
        "Say which patterns have enumerable execution paths",
        "Note why the reducer is mandatory in the parallel pattern",
        "Give the evaluator-optimiser two exit conditions and justify the second",
        "Explain what changes about cost and latency once paths are not enumerable",
        "State the rule the comparison implies"],
      hint: "For each pattern, ask whether you could count the model calls by reading the code. That question separates the catalogue into two halves.",
      solution: { lang: "python", title: "x0903.py \u2014 control, and what it costs to give away",
        code: '# evaluator-optimiser: note the TWO exit conditions\ndef good_enough(s):\n    if s["score"] >= 3:\n        return END                 # quality reached\n    if s["attempts"] >= 5:\n        return END                 # budget exhausted -- the one people omit\n    return "generate"\n\ng5.add_conditional_edges("evaluate", good_enough,\n                        {"generate": "generate", END: END})\n\n# parallelisation: the reducer is mandatory, not an optimisation\nclass ParS(TypedDict):\n    findings: Annotated[List[str], operator.add]',
        out: "==============================================================================\nPART 1 -- the distinction that matters\n==============================================================================\n  WORKFLOW : you wrote the control flow. the model fills in steps.\n  AGENT    : the model decides the control flow. you wrote the tools.\n\n  that is the whole difference, and it is a spectrum rather than two\n  boxes -- the question for any design is WHERE THE CONTROL SITS.\n\n  it matters because it decides what you can predict. a workflow's\n  cost, latency and failure modes are enumerable before you ship. an\n  agent's are not -- 8.9's recursion limit exists precisely because\n  nobody can bound an agent's step count by reading it.\n==============================================================================\nPART 2 -- prompt chaining -- control: yours, entirely\n==============================================================================\n  a fixed sequence, each step's output feeding the next.\n\n    ['outline', 'draft', 'polish']\n\n  three model calls, always, in that order. 8.1's point applies: this\n  is a chain, and a graph adds nothing unless you need a gate between\n  the steps.\n==============================================================================\nPART 3 -- routing -- control: yours, with the model classifying\n==============================================================================\n    topic='refund'    -> ['classified', 'billing']\n    topic='api error' -> ['classified', 'technical']\n\n  the model picks a CATEGORY and you picked the destinations. so the\n  set of possible paths is still enumerable -- which is why routing\n  is the cheapest way to add model-driven behaviour without giving up\n  predictability.\n==============================================================================\nPART 4 -- parallelisation -- control: yours, fan-out fixed\n==============================================================================\n    ['performance review', 'security review', 'style review', 'merged 3']\n\n  three reviewers in one superstep (8.6), so the latency is the\n  slowest branch rather than the sum -- and the cost is still the sum.\n  the reducer on findings is mandatory here, not optional (8.3).\n==============================================================================\nPART 5 -- orchestrator-worker -- control: SHARED\n==============================================================================\n  the orchestrator decides HOW MANY workers at runtime, which a fixed\n  fan-out cannot (8.7's list return).\n\n    the orchestrator produced 3 sections, so 3 workers run.\n    a fixed parallel fan-out would have had to guess that number.\n\n  this is the first pattern where you cannot enumerate the execution\n  graph by reading the code -- it depends on what the model planned.\n  so cost and latency become distributions rather than numbers.\n==============================================================================\nPART 6 -- evaluator-optimiser -- control: SHARED, with a cycle\n==============================================================================\n  generate, evaluate, and loop back if the evaluation fails.\n\n    ['generate', 'evaluate(score=1)', 'generate', 'evaluate(score=2)', 'generate', 'evaluate(score=3)']\n    attempts: 3\n\n  note the router has TWO exit conditions: good enough, and out of\n  attempts. the second one is the lesson -- without it the only exit\n  is the recursion limit, and a graph whose normal failure path is an\n  exception cannot distinguish failure from runaway (8.9).\n==============================================================================\nPART 7 -- and the agent -- control: the model's\n==============================================================================\n  one node, one conditional edge, and a cycle (9.1). the model\n  chooses the tool, the order, and when to stop.\n\n  pattern                control        paths enumerable?\n  prompt chaining        yours          yes, exactly one\n  routing                yours          yes, one per category\n  parallelisation        yours          yes, fixed fan-out\n  orchestrator-worker    shared         no -- count from runtime\n  evaluator-optimiser    shared         no -- iterations from runtime\n  agent                  the model's    no -- nothing is bounded\n\n  the practical rule: use the least agentic pattern that solves the\n  problem. every row down that table trades predictability for\n  flexibility, and most tasks described as needing an agent are a\n  router plus three tools.",
        notes: [
          { t: "p", text: "**A workflow is control flow you wrote; an agent is control flow the model decides.** It is a spectrum, and the question is where the control sits." },
          { t: "p", text: "**That decides what you can predict.** A workflow's cost and latency are countable by reading the graph; an agent's are not \u2014 which is why a framework needs a recursion limit at all." },
          { t: "p", text: "**Prompt chaining, routing and parallelisation all have enumerable paths**: one, one per category, and a fixed fan-out." },
          { t: "p", text: "**Routing is the cheapest way to add model-driven behaviour** without giving up predictability, and it is the pattern most often skipped in favour of an agent." },
          { t: "p", text: "**In the parallel pattern the reducer is mandatory** \u2014 8.3 showed a fan-in without one raises rather than silently picking a winner." },
          { t: "p", text: "**Orchestrator-worker is the first pattern you cannot enumerate by reading**, since the worker count comes from the model's plan \u2014 so cost and latency become distributions, and the cap belongs in the orchestrator." },
          { t: "p", text: "**The evaluator-optimiser's router needs two exit conditions**: good enough, and out of attempts. Without the second the only exit is the recursion limit, which 8.9 showed makes failure indistinguishable from runaway." },
          { t: "p", text: "**Use the least agentic pattern that solves the problem** \u2014 most tasks described as needing an agent are a router plus three tools, and the tell is whether the sequence varies or only the choice does." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that was a router", body: [
      { t: "p", text: "A team builds an agent with five tools for a support assistant. It works most of the time, occasionally calls three tools when one would do, occasionally loops, and nobody can quote a per-request cost. Six weeks go into prompt engineering to make it more decisive." },
      { t: "p", text: "Looking at the traffic, every request resolves to exactly one of five known intents, and each intent needs exactly one tool. The *choice* varies; the *sequence* never does. That is a router, and as a router the cost is one classification call plus one tool call, the paths number five, and looping is structurally impossible." },
      { t: "p", text: "The prompt engineering was trying to make the model behave like a router, which is work a conditional edge does for free and correctly. The diagnostic question is the one that generalises: does the sequence of operations genuinely vary by request, or only the choice? If only the choice varies, every property you are fighting for \u2014 bounded cost, enumerable paths, no loops \u2014 is available by construction." }
    ] }
  ],
  takeaways: [
    "**A workflow is control flow you wrote; an agent is control flow the model decides.**",
    "**It is a spectrum, and the question is where the control sits.**",
    "**That decides predictability**: a workflow's cost and latency are countable by reading the graph.",
    "**An agent's are not** \u2014 which is why a framework needs a recursion limit at all.",
    "**Prompt chaining: one path.** A chain, so a graph adds nothing without a gate between steps.",
    "**Routing: one path per category**, and the cheapest way to add model-driven behaviour.",
    "**Parallelisation: fixed fan-out**, latency is the slowest branch and cost is still the sum.",
    "**And its reducer is mandatory** \u2014 a fan-in without one raises (8.3).",
    "**Orchestrator-worker is the first pattern you cannot enumerate by reading.**",
    "**So cost and latency become distributions**, and the worker cap belongs in the orchestrator.",
    "**The evaluator-optimiser needs two exit conditions**: good enough, and out of attempts.",
    "**Without the second, the only exit is the recursion limit** \u2014 failure indistinguishable from runaway.",
    "**Use the least agentic pattern that solves the problem.**",
    "**Most tasks described as needing an agent are a router plus three tools.**",
    "**The tell: does the sequence vary by request, or only the choice?**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What distinguishes a workflow from an agent?",
      options: ["Agents use tools and workflows do not",
        "Where the control flow is decided \u2014 you wrote it, or the model decides it",
        "Agents have cycles and workflows are linear",
        "Workflows are compiled and agents are interpreted"],
      answer: 1,
      why: "Both can use tools, have cycles and call models. The difference is who decides the sequence, and it has a concrete consequence: a workflow's cost, latency and failure modes are enumerable by reading the graph, while an agent's are not. That is why frameworks need a recursion limit \u2014 the ceiling exists because nobody can bound an agent's step count statically." },
    { stem: "Why does an evaluator-optimiser router need two exit conditions?",
      options: ["To handle both success and error states from the generator",
        "Because without an attempt budget the only exit is the recursion limit, making failure indistinguishable from a runaway",
        "To allow the evaluator to be skipped on the first pass",
        "Because the quality score may be unavailable"],
      answer: 1,
      why: "Exiting only on 'good enough' means a generator that never reaches the threshold loops until GraphRecursionError, which is an exception rather than a result. With an explicit budget, 'never got good enough' becomes a state you can route on, record, and hand back to the caller \u2014 who can then retry, escalate or accept the best attempt." },
    { stem: "Which pattern is the first whose execution paths cannot be enumerated by reading the code?",
      options: ["Routing, because the model picks the category",
        "Orchestrator-worker, because the number of workers comes from the model's plan at runtime",
        "Parallelisation, because branches may fail independently",
        "Prompt chaining, because each step's output varies"],
      answer: 1,
      why: "Routing has one path per category and parallelisation has a fixed fan-out, so both remain countable. An orchestrator decides the worker count at runtime, so the execution graph depends on what the model planned \u2014 and cost and latency become distributions rather than numbers. That is also why the worker cap belongs in the orchestrator node." },
    { stem: "A support assistant resolves every request to one of five intents, each needing one tool. What pattern fits?",
      options: ["An agent, so the model can combine tools when needed",
        "Routing \u2014 only the choice varies, not the sequence, so the paths number five and looping is impossible",
        "Orchestrator-worker, to parallelise the tool calls",
        "An evaluator-optimiser, to retry poor answers"],
      answer: 1,
      why: "The decisive question is whether the sequence of operations varies or only the choice does. Here only the choice varies, which a conditional edge expresses exactly \u2014 giving bounded cost of one classification plus one tool call, five enumerable paths, and no possibility of a loop. Building it as an agent means prompt-engineering a model into behaving like a router." }
  ] },
  interview: { title: "Interview practice", sub: "Workflows and agents", questions: [
    { level: "core", q: "When would you build an agent rather than a workflow?",
      strong: "A strong answer asks whether the sequence varies or only the choice.",
      answer: [
        { t: "p", text: "When the sequence of operations genuinely varies by request, not just the choice of operation. That distinction decides it for most of the cases I have seen." },
        { t: "p", text: "If the request resolves to one of a known set of intents and each needs a known operation, that is routing \u2014 the model contributes a classification and I keep every destination. Cost is one classification call plus the work, the paths number the categories, and looping is structurally impossible." },
        { t: "p", text: "An agent is for when you genuinely cannot say in advance how many steps are needed or in what order \u2014 open-ended research, debugging, anything where the next action depends on what the last one returned in a way you cannot enumerate." },
        { t: "p", text: "The reason I default toward workflows is predictability. A workflow's cost, latency and failure modes are countable by reading the graph. An agent's are not, which is why frameworks ship a recursion limit at all \u2014 it exists because nobody can bound an agent's step count statically." }
      ] },
    { level: "advanced", q: "How would you make an agentic system more predictable?",
      strong: "A strong answer moves control back up the spectrum deliberately.",
      answer: [
        { t: "p", text: "By moving control back toward me wherever the flexibility is not being used \u2014 which is usually most places." },
        { t: "p", text: "The first move is to look at real traffic and ask how many distinct sequences actually occur. I have seen an agent with five tools where every request used exactly one tool, chosen from five \u2014 so the sequence never varied and six weeks had gone into prompt-engineering the model into behaving like a router. Replacing it with a conditional edge made the cost one call plus one tool, the paths five, and loops impossible." },
        { t: "p", text: "Where I genuinely need an agent, I would bound it explicitly rather than rely on the framework. A step budget in the state with a router that ends on it, so 'gave up' is a result rather than a GraphRecursionError. A cap on any fan-out in the node that decides the count, because an orchestrator spawning two hundred workers is a correct implementation of a bad plan." },
        { t: "p", text: "And for anything with a quality loop, two exit conditions \u2014 good enough, and out of attempts. Omitting the second is the commonest version of this mistake, and it means the only exit is an exception." },
        { t: "p", text: "The general rule I would state is: use the least agentic pattern that solves the problem, and read the catalogue upward rather than downward. A bounded pattern that nearly works is closer to a solution than an agent that works unpredictably." }
      ] },
    { level: "core", q: "A stakeholder asks for 'an AI agent'. How do you scope it?",
      strong: "A strong answer converts the request into the control question.",
      answer: [
        { t: "p", text: "By turning it into a question about control: does the sequence of operations genuinely vary by request, or only the choice of operation?" },
        { t: "p", text: "So I would ask for ten or twenty real examples of what it should handle, and look at what each one requires. If every example resolves to one of a handful of intents and each needs one known operation, that is a router \u2014 and I would say so, because as a router the cost is one classification plus the work, the paths are enumerable, and looping is structurally impossible." },
        { t: "p", text: "If the examples genuinely differ in how many steps and in what order \u2014 research, diagnosis, anything where the next action depends on what the last returned in a way nobody can enumerate \u2014 then an agent is the right shape and I would scope the bounds explicitly alongside it." },
        { t: "p", text: "What I would be direct about is the trade. A workflow's cost, latency and failure modes are countable by reading the graph. An agent's are not, which is why frameworks ship a recursion limit \u2014 and on the version I measured the default allowed over ten thousand supersteps, all of which execute." },
        { t: "p", text: "In my experience most requests described as needing an agent are a router plus three tools, and saying that early is more useful than discovering it after six weeks of prompt engineering." }
      ] }
  ] }
});
