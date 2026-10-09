EC.receiveLesson({
  id: "2.5",
  lede: "Routing in LCEL has two forms and the choice between them is readability, not capability. `RunnableBranch` is an if/elif/else built from a list of condition-and-chain tuples. A **plain function returning a Runnable** does the same thing, because LCEL invokes whatever a `RunnableLambda` returns \u2014 and for three or more branches it usually reads better, since the conditions are ordinary Python rather than lambdas in a tuple list. What neither can do is the important part: **pick a branch, look at the result, and choose again.** A chain cannot loop, and that single limitation is the specific reason LangGraph exists.",
  objectives: [
    "Write a router with RunnableBranch and with a plain function",
    "Choose between them on readability grounds",
    "State the four things a chain-based router cannot do",
    "Explain why the default branch should be honest rather than a guess",
    "Identify when a router should become a graph"
  ],
  prerequisites: ["2.4"],
  blocks: [
    { t: "h2", n: "01", id: "branch", text: "RunnableBranch", sub: "if/elif/else as a data structure" },

    {"kind": "tree", "title": "Routing: two forms, one capability", "caption": "The choice is readability, not capability. `RunnableBranch` is an if/elif/else built from condition-and-chain tuples; a plain function returning a Runnable does the same thing, because LCEL invokes whatever a `RunnableLambda` returns.", "root": {"label": "classify the question", "sub": "RunnableBranch, or a function", "tone": "accent", "children": [{"label": "billing", "sub": "the billing chain", "tone": "good", "edge": "matches"}, {"label": "technical", "sub": "the support chain", "tone": "good", "edge": "matches"}, {"label": "default", "sub": "the catch-all — NOT optional", "tone": "crit", "edge": "nothing matched"}]}, "t": "diagram", "id": "dg-2_5-01-0"},




    { t: "code", lang: "python", title: "Conditions and chains, in order",
      code: 'branch = RunnableBranch(\n    (lambda x: "math" in x["topic"].lower(), math_chain),\n    (lambda x: "code" in x["topic"].lower(), code_chain),\n    general)                       # the default, last and unconditional',
      out: "topic=Math           -> MATH: help\ntopic=Code review    -> CODE: help\ntopic=Weather        -> GENERAL: help",
      caption: "Evaluated top to bottom; the first matching condition wins." },
    { t: "p", text: "The final argument is the default and is not a tuple \u2014 it runs when nothing matched. Forgetting it is a construction error rather than a runtime surprise, which is the one thing `RunnableBranch` does better than an `if` chain." },
    { t: "h2", n: "02", id: "function", text: "A function that returns a Runnable", sub: "Usually more readable" },
    { t: "code", lang: "python", title: "The same router, as ordinary Python",
      code: 'def route(x):\n    t = x["topic"].lower()\n    if "math" in t:\n        return math_chain\n    if "code" in t:\n        return code_chain\n    return general\n\nfn_router = RunnableLambda(route)',
      out: "topic=Math           -> MATH: help\ntopic=Code review    -> CODE: help\ntopic=Weather        -> GENERAL: help",
      caption: "Identical behaviour. LCEL invokes a Runnable returned from a RunnableLambda." },
    { t: "callout", kind: "insight", title: "Returning a Runnable is a feature, not an accident", body: [
      { t: "p", text: "When a `RunnableLambda` returns a Runnable, LCEL invokes it with the same input rather than passing the object along as a value. That is deliberate, and it makes the function form a first-class routing mechanism rather than a trick." },
      { t: "p", text: "For two branches, `RunnableBranch` is fine. For three or more, the function usually wins: the conditions are ordinary statements you can read, debug and unit-test, rather than lambdas inside a tuple list where a misplaced bracket is a long afternoon." }
    ] },
    { t: "h2", n: "03", id: "cannot", text: "What neither can do", sub: "And why that matters more than the choice between them" },
    { t: "ul", items: [
      "**Loop back to an earlier step.** A chain is a directed acyclic path; there is no way to express \u201cgo again\u201d.",
      "**Run a branch, inspect the result, and choose again.** Routing happens once, before the branch runs.",
      "**Pause for a human and resume later.** There is no state to suspend and nothing to resume into.",
      "**Keep state across several passes.** Each invocation starts from its input."
    ] },
    { t: "callout", kind: "mental", title: "This list is the reason LangGraph exists", body: [
      { t: "p", text: "Every item above is something an agent does routinely. Call a tool, look at what came back, decide whether to call another. Retrieve, grade the documents, decide to retrieve again with a different query. Draft, critique, revise. Ask a human to approve before acting." },
      { t: "p", text: "None of those are expressible as a chain, and the attempt to express them is what produces the recursive-chain code that nobody can follow. 8.1 shows the three failures directly, so that the graph arrives as an answer to something rather than as a new API to learn." }
    ] },
    { t: "h2", n: "04", id: "default", text: "The default branch", sub: "Where routing costs the most" },
    { t: "p", text: "A router that mis-classifies sends the question to a chain that cannot answer it, and the user gets a confident wrong answer rather than an error. That is worse than a failure, because nothing signals it." },
    { t: "code", lang: "python", title: "An honest default",
      code: 'safe = RunnableBranch(\n    (lambda x: "math" in x["topic"].lower(), math_chain),\n    RunnableLambda(lambda x: "I am not sure which specialist handles that."))',
      out: "I am not sure which specialist handles that.",
      caption: "A default that declines beats a default that guesses." },
    { t: "p", text: "The temptation is to make the default a general-purpose chain, so that something always gets answered. That converts every routing failure into a plausible answer from the wrong specialist \u2014 which is invisible in metrics and arrives as a complaint. A default that says it does not know is a measurable signal, and the rate at which it fires tells you whether the router needs work." },
    { t: "exercise", kind: "build", title: "Route two ways, then find the wall",
      difficulty: "core", minutes: 22,
      body: "Implement the same three-way router with RunnableBranch and with a plain function returning a Runnable, and confirm they behave identically. Then write down what neither can express, and build a router whose default declines rather than guessing.",
      requirements: ["A three-way RunnableBranch with a default",
        "The same routing as a function returning a Runnable",
        "Confirm both produce the same outputs for the same inputs",
        "List at least three things a chain-based router cannot do",
        "Show a default branch that declines, and say why that beats a general fallback chain"],
      hint: "The function form works because LCEL invokes a Runnable returned from a RunnableLambda. The limits list is the setup for module 8.",
      solution: { lang: "python", title: "x0205.py \u2014 two routers, one wall",
        code: 'from langchain_core.runnables import RunnableBranch, RunnableLambda\n\nmath_chain = RunnableLambda(lambda x: "MATH: " + x["q"])\ncode_chain = RunnableLambda(lambda x: "CODE: " + x["q"])\ngeneral    = RunnableLambda(lambda x: "GENERAL: " + x["q"])\n\nbranch = RunnableBranch(\n    (lambda x: "math" in x["topic"].lower(), math_chain),\n    (lambda x: "code" in x["topic"].lower(), code_chain),\n    general)\n\ndef route(x):\n    t = x["topic"].lower()\n    if "math" in t: return math_chain\n    if "code" in t: return code_chain\n    return general\n\nfn_router = RunnableLambda(route)\n\nsafe = RunnableBranch(\n    (lambda x: "math" in x["topic"].lower(), math_chain),\n    RunnableLambda(lambda x: "I am not sure which specialist handles that."))',
        out: "==============================================================================\nPART 1 -- RunnableBranch is if/elif/else\n==============================================================================\n  topic=Math           -> MATH: help\n  topic=Code review    -> CODE: help\n  topic=Weather        -> GENERAL: help\n\n==============================================================================\nPART 2 -- a plain function router does the same thing\n==============================================================================\n  topic=Math           -> MATH: help\n  topic=Code review    -> CODE: help\n  topic=Weather        -> GENERAL: help\n\n  returning a Runnable from a RunnableLambda works: LCEL invokes it.\n  that is usually more readable than RunnableBranch for 3+ branches,\n  because the conditions are ordinary Python rather than lambdas in a\n  tuple list.\n\n==============================================================================\nPART 3 -- what neither can do\n==============================================================================\n  both of these pick ONE branch and run it. neither can:\n    - loop back to an earlier step\n    - run a branch, look at the result, and choose again\n    - pause for a human and resume later\n    - keep state across several passes\n\n  the moment you need any of those, you want a graph rather than a\n  chain. that is 8.1, and the inability to cycle is the specific\n  reason LangGraph exists.\n\n==============================================================================\nPART 4 -- the routing failure that costs most\n==============================================================================\n  a router that mis-classifies sends the question to a chain that\n  cannot answer it, and the user sees a confident wrong answer rather\n  than an error. the guard is a default branch that is honest:\n   I am not sure which specialist handles that.\n\n  a default that says \'I do not know\' beats a default that guesses.",
        notes: [
          { t: "p", text: "**Both routers produced identical output.** The function form works because LCEL invokes a Runnable returned from a RunnableLambda rather than passing it along as a value \u2014 deliberate behaviour, which makes it a first-class mechanism and not a trick." },
          { t: "p", text: "**For three or more branches the function usually reads better**, because the conditions are ordinary statements you can debug and unit-test rather than lambdas inside a tuple list. RunnableBranch's one real advantage is that forgetting the default is a construction error rather than a runtime surprise." },
          { t: "p", text: "**Neither can loop, re-decide after seeing a result, pause for a human, or carry state across passes.** Every one of those is something an agent does routinely, and the attempt to express them with chains is what produces recursive chain code nobody can follow." },
          { t: "p", text: "**That list is the specific reason LangGraph exists**, which is why 8.1 opens by demonstrating the failures rather than introducing the API \u2014 the graph should arrive as an answer to something." },
          { t: "p", text: "**An honest default beats a general-purpose fallback.** A catch-all chain turns every routing failure into a plausible answer from the wrong specialist, which is invisible in metrics and arrives as a complaint. A default that declines is a measurable signal, and its firing rate tells you whether the router needs work." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the router that quietly answered everything", body: [
      { t: "p", text: "A support assistant routes to billing, technical and account specialists, with a general chain as the default. Satisfaction is mediocre and no errors are logged. The routing accuracy has never been measured because there is nothing to measure \u2014 every request is answered." },
      { t: "p", text: "The general default is doing the damage. A mis-routed billing question goes to the general chain, which produces a fluent and unhelpful answer, and no signal is emitted anywhere. The first change is not a better classifier; it is making the default decline, so the rate of \u201cI am not sure\u201d becomes a number on a dashboard." },
      { t: "p", text: "Once that number exists, two things follow. You can see whether routing is the problem at all, and you can log the declined inputs, which is a labelled dataset for improving the router \u2014 gathered automatically, from exactly the cases that were failing. Replacing a silent wrong answer with a visible refusal is usually the highest-value change available in a routed system." }
    ] }
  ],
  takeaways: [
    "**`RunnableBranch` is if/elif/else as data**: condition-and-chain tuples, evaluated top to bottom, with an unconditional default last.",
    "**A function returning a Runnable does the same thing**, because LCEL invokes what a RunnableLambda returns.",
    "**For three or more branches the function usually reads better** \u2014 ordinary statements rather than lambdas in a tuple list.",
    "**RunnableBranch's real advantage is that a missing default is a construction error**, not a runtime surprise.",
    "**Neither can loop back to an earlier step.**",
    "**Neither can run a branch, inspect the result, and choose again** \u2014 routing happens once, before the branch runs.",
    "**Neither can pause for a human or carry state across passes.**",
    "**Those four limits are the specific reason LangGraph exists**, and 8.1 demonstrates them before introducing the API.",
    "**A mis-routed question produces a confident wrong answer**, which is worse than an error because nothing signals it.",
    "**An honest default beats a general fallback chain**: it makes routing failure measurable instead of invisible.",
    "**Declined inputs are a free labelled dataset** for improving the router, gathered from exactly the failing cases."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A RunnableLambda returns a Runnable rather than a value. What does LCEL do?",
      options: ["Passes the Runnable object along as the step's output",
        "Invokes it with the same input \u2014 which is what makes function-based routing work",
        "Raises a type error, since a Runnable is not a valid output",
        "Serialises it into the chain at construction time"],
      answer: 1,
      why: "Returning a Runnable from a RunnableLambda causes LCEL to invoke it, which is deliberate rather than incidental and makes the plain-function router a first-class mechanism. For three or more branches it usually reads better than RunnableBranch, since the conditions become ordinary statements you can debug and unit-test instead of lambdas buried in a tuple list." },
    { stem: "Which of these can a RunnableBranch express?",
      options: ["Run a branch, examine its output, then route again based on what came back",
        "Pick one branch based on the input and run it",
        "Loop back and retry a different branch if the first was unhelpful",
        "Pause mid-branch for human approval and resume afterwards"],
      answer: 1,
      why: "Routing happens once, before any branch runs, so the decision cannot depend on a branch's output. Looping, re-deciding, pausing and carrying state across passes are all outside what a chain can express, and all four are things agents do routinely \u2014 which is exactly why LangGraph exists and why 8.1 demonstrates these failures before introducing the graph API." },
    { stem: "Why is a general-purpose default branch worse than one that declines?",
      options: ["It costs more, since the general chain uses a larger model",
        "It turns every routing failure into a plausible answer from the wrong specialist, with no signal emitted",
        "It increases latency on the default path",
        "It prevents the router from being retrained on production traffic"],
      answer: 1,
      why: "A catch-all answers everything, so a mis-routed question produces a fluent unhelpful response and nothing is logged \u2014 routing accuracy becomes unmeasurable because there are no failures to count. A default that declines makes the failure rate a dashboard number, and the declined inputs are a labelled dataset drawn from precisely the cases that were going wrong." },
    { stem: "When should a router become a graph?",
      options: ["When there are more than five branches",
        "When the decision needs to be revisited after seeing a branch's result",
        "When the branches call different providers",
        "When routing latency becomes significant"],
      answer: 1,
      why: "Branch count is a readability question, not a capability one \u2014 a plain function handles many branches fine. The capability wall is re-deciding: looking at what a branch produced and choosing again, which a chain cannot express because routing happens once before anything runs. The same wall covers looping, pausing for a human, and carrying state across passes." }
  ] },
  interview: { title: "Interview practice", sub: "Routing", questions: [
    { level: "core", q: "How do you route between sub-chains in LCEL?",
      strong: "A strong answer gives both forms and prefers the readable one.",
      answer: [
        { t: "p", text: "Two ways. RunnableBranch takes a list of condition-and-chain tuples plus an unconditional default, evaluated top to bottom. Or a plain function that returns a Runnable, wrapped in RunnableLambda \u2014 LCEL invokes whatever the lambda returns, so that works as a router." },
        { t: "p", text: "For two branches I would use RunnableBranch. For three or more I usually prefer the function, because the conditions become ordinary if statements you can read, debug and unit-test, rather than lambdas inside a tuple list where a misplaced bracket costs an afternoon." },
        { t: "p", text: "The one thing RunnableBranch does better is that forgetting the default is a construction error rather than a runtime surprise, which is worth something." },
        { t: "p", text: "The design decision I would actually spend time on is the default, not the mechanism. A general-purpose fallback answers everything, so a mis-routed question comes back as a fluent wrong answer with nothing logged. A default that declines makes routing failure a measurable rate." }
      ] },
    { level: "advanced", q: "When does a router stop being enough?",
      strong: "A strong answer identifies re-deciding, not branch count.",
      answer: [
        { t: "p", text: "When the decision needs to be revisited after seeing a result. Routing in a chain happens once, before any branch runs, so the choice cannot depend on what a branch produced." },
        { t: "p", text: "That is the wall, and it is not about branch count \u2014 a plain function handles twenty branches fine. The things that break are: looping back, running a branch and choosing again based on the output, pausing for a human and resuming, and carrying state across several passes." },
        { t: "p", text: "Every one of those is routine agent behaviour. Call a tool and decide whether to call another. Retrieve, grade the documents, retrieve again with a rewritten query. Draft, critique, revise. Ask for approval before acting. None are expressible as a chain." },
        { t: "p", text: "What I have seen happen when people push past the wall anyway is recursive chain code \u2014 a chain that calls itself with a modified input, with the termination condition buried somewhere. It works for a while and nobody can follow it. That is the point to move to a graph, and I would rather move early than refactor out of that." }
      ] },
    { level: "core", q: "Routing accuracy is unmeasured and satisfaction is poor. Where do you start?",
      strong: "A strong answer makes failure visible before improving the classifier.",
      answer: [
        { t: "p", text: "By making the default decline instead of answering. Right now there is nothing to measure, because every request gets answered \u2014 a mis-routed billing question goes to the general chain, which produces something fluent and unhelpful, and no signal is emitted anywhere." },
        { t: "p", text: "So the first change is not a better classifier. It is replacing the catch-all with a refusal, so the rate of 'I am not sure which specialist handles that' becomes a number on a dashboard. That tells you whether routing is even the problem, which you currently cannot know." },
        { t: "p", text: "The second benefit is that the declined inputs are a labelled dataset, gathered automatically from exactly the cases that were failing. That is the data you want for improving the router, and it only exists once you stop papering over the failures." },
        { t: "p", text: "The objection will be that refusing is a worse user experience than a general answer, and I would push back on that. A confident wrong answer from the wrong specialist is not a better experience, it is a worse one that arrives as a complaint instead of a metric. If the refusal rate turns out to be high, that is information you needed." }
      ] }
  ] }
});
