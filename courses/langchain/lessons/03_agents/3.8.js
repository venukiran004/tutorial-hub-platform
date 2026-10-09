EC.receiveLesson({
  id: "3.8",
  lede: "The honest summary of this module is that **an agent is a more expensive way to be less reliable**, bought for the cases where you genuinely cannot write the steps down. That is a real set of cases and it is much smaller than the number of systems that use one. The column that decides is not the median cost but the **p95**: a fixed chain takes 3 calls at p50 and 3 at p95, and an agent takes 4 and **9** \u2014 because the tail is where the model retried, second-guessed or looped to the cap. What you give up is determinism, predictable cost, predictable latency, testability and debuggability, and most production \u201cagents\u201d turn out to be routers with one decision and a fixed path afterwards.",
  objectives: [
    "Compare the four approaches on calls at p50 and p95",
    "Explain why an agent's tail differs from its median",
    "Name the five properties an agent gives up",
    "Apply a four-question test to a real task",
    "Recognise when a router is the right answer"
  ],
  prerequisites: ["3.7", "2.5"],
  blocks: [
    { t: "h2", n: "01", id: "four", text: "Four approaches", sub: "And the column that decides" },
    { t: "table", head: ["Approach", "Calls (p50)", "Calls (p95)", "Character"], rows: [
      ["a single call", "1", "1", "cheapest, no decisions, fails on anything unexpected"],
      ["a fixed chain", "3", "3", "deterministic path, every step runs every time"],
      ["a router plus chains", "2", "4", "one decision, then a fixed path"],
      ["an agent", "4", "9", "decides each step; cost varies per request"]
    ] },
    { t: "callout", kind: "insight", title: "The tail is the agent's defining property", body: [
      { t: "p", text: "The first three rows have a p95 equal to or near their p50, because the path is fixed. The agent's p95 is more than double its median, and that gap is not noise \u2014 it is where the model retried a failed tool, fetched something it did not need, second-guessed itself, or looped until the cap." },
      { t: "p", text: "So an agent's cost and latency are **distributions, not numbers**. Budgeting from the median underestimates systematically, and the user experience is set by the tail, which is 13.1's argument for voice arriving in a different form." }
    ] },
    { t: "h2", n: "02", id: "giveup", text: "What you give up", sub: "Five properties, all of them real" },
    { t: "table", head: ["Property", "What happens instead"], rows: [
      ["determinism", "the same input can take a different path"],
      ["predictable cost", "p50 and p95 differ by several model calls"],
      ["predictable latency", "same reason"],
      ["testability", "you cannot assert on the path, only on the outcome"],
      ["debuggability", "a failure is somewhere in a variable-length trace"]
    ] },
    { t: "p", text: "The testability one deserves emphasis because it compounds. With a fixed chain you can assert that step two ran with a particular input; with an agent you can only assert on the final answer, which means every test is an end-to-end test and a change anywhere can break any of them for reasons that take a while to locate." },
    { t: "h2", n: "03", id: "test", text: "The test", sub: "Four questions about the actual task" },
    { t: "ol", items: [
      "Can you write down the steps in advance?",
      "Is the set of tools small and the choice usually obvious?",
      "Does the task need to react to what a tool returned?",
      "Is a wrong path expensive, or just slow?"
    ] },
    { t: "table", head: ["Answer", "Build"], rows: [
      ["steps known in advance", "a chain \u2014 you do not need a model to choose what you already know"],
      ["one decision, then a fixed path", "a router (2.5) \u2014 cheaper and testable"],
      ["must react to results, repeatedly", "an agent, accepting the tail cost and the loss of determinism"]
    ] },
    { t: "callout", kind: "good", title: "Most production agents are routers", body: [
      { t: "p", text: "When you apply this honestly to a system that is already built, the usual finding is that it makes **one** classification decision and then follows a fixed path. That is a router, and expressing it as one buys back determinism, a p95 equal to the p50, and tests that can assert on the path." },
      { t: "p", text: "The reason it was built as an agent is rarely that the task needed it. It is that the agent abstraction was what the examples used, and it works, so nobody revisited it \u2014 which is the same drift 1.8 warned about from the other direction." }
    ] },
    { t: "h2", n: "04", id: "honest", text: "The honest version", sub: "What the module adds up to" },
    { t: "p", text: "Across this module: the loop is nine lines and the termination condition is a model judgement (3.3). The transcript grows by two per round and is re-sent every time (3.3, 3.5). Three guards are mandatory and a fourth failure cannot be guarded at all (3.7). Memory is a deferred outage unless bounded (3.5). None of that is an argument against agents; it is an argument for knowing what one costs before choosing it." },
    { t: "callout", kind: "mental", title: "Mental model: an agent buys adaptability with predictability", body: [
      { t: "p", text: "Everything on the give-up list is a form of predictability, and the thing you get in exchange is the ability to handle inputs you did not anticipate. That is a good trade exactly when the inputs are genuinely unanticipated and a bad one when you simply did not enumerate them." },
      { t: "p", text: "So the question to ask is not \u201ccould an agent do this?\u201d \u2014 it almost always could \u2014 but \u201cdo I actually not know the steps?\u201d. If you can write them down, writing them down is cheaper, faster, testable and debuggable." }
    ] },
    { t: "diagram", kind: "compare", title: "The honest summary of the module",
      caption: "An agent is a more expensive way to be less reliable, bought for the cases where you genuinely cannot write the steps down. That is a real set of cases, and it is much smaller than the number of systems using one.",
      columns: [
        { title: "a chain — the default", tone: "good", items: [
          "the steps are known before the request arrives",
          "one model call per unit of work",
          "the control flow is in your code, so it is readable and testable",
          "a failure has one place to be" ] },
        { title: "an agent — when earned", tone: "warn", items: [
          "the next step genuinely depends on what the last one returned",
          "3+ model calls, and a variable number",
          "the control flow is a model's decision, so a trace is the only record",
          "needs a cap, a budget and a guard before it ships" ] }
      ] },
    { t: "exercise", kind: "analysis", title: "Choose between a chain and an agent",
      difficulty: "core", minutes: 24,
      body: "Compare four approaches to the same task on calls at p50 and p95, and explain why the agent's two numbers differ. List what an agent gives up. Then write out a four-question test and map each answer to an approach, and state when a router is the right answer.",
      requirements: ["Tabulate four approaches with p50 and p95 call counts",
        "Explain what produces the agent's p95 and why it is not noise",
        "List at least five properties an agent gives up",
        "Write a four-question test about the task",
        "Map the answers to chain, router and agent",
        "State what most production agents turn out to be"],
      hint: "The p95 column is the one that matters. Ask what a budget built from the median would get wrong.",
      solution: { lang: "python", title: "x0308.py \u2014 the p95 column",
        code: 'ROWS = [\n    ("a single call",     1, 1, "cheapest, no decisions, fails on anything unexpected"),\n    ("a fixed chain",     3, 3, "deterministic path, every step runs every time"),\n    ("a router + chains", 2, 4, "one decision, then a fixed path"),\n    ("an agent",          4, 9, "decides each step; cost varies per request"),\n]\nfor a, b, c, d in ROWS:\n    print("%-20s %8d %10d  %s" % (a, b, c, d))\n\nQ = ["can you write down the steps in advance?",\n     "is the set of tools small and the choice usually obvious?",\n     "does the task need to react to what a tool returned?",\n     "is a wrong path expensive or just slow?"]',
        out: "==============================================================================\nPART 1 -- the same task, three ways\n==============================================================================\n  approach                calls  p95 calls  character\n  a single call               1          1  cheapest, no decisions, fails on anything unexpected\n  a fixed chain               3          3  deterministic path, every step runs every time\n  a router + chains           2          4  one decision, then a fixed path\n  an agent                    4          9  decides each step; cost varies per request\n\n  the p95 column is the one that matters for an agent: the median run\n  is cheap and the tail is not, because the tail is where the model\n  retried, second-guessed, or looped until the cap.\n\n==============================================================================\nPART 2 -- what you give up for the flexibility\n==============================================================================\n  determinism            the same input can take a different path\n  predictable cost       p50 and p95 differ by several model calls\n  predictable latency    same reason\n  testability            you cannot assert on the path, only the outcome\n  debuggability          a failure is somewhere in a variable-length trace\n\n==============================================================================\nPART 3 -- the test\n==============================================================================\n    1. can you write down the steps in advance?\n    2. is the set of tools small and the choice usually obvious?\n    3. does the task need to react to what a tool returned?\n    4. is a wrong path expensive or just slow?\n\n  steps known in advance -> a chain. you do not need a model to\n     choose what you already know.\n  one decision then a fixed path -> a router (2.5). cheaper and\n     testable, and most 'agents' in production are this.\n  must react to results, repeatedly -> an agent, and accept the\n     tail cost and the loss of determinism.\n\n  the honest summary is that an agent is a more expensive way to be\n  less reliable, bought for the cases where you genuinely cannot\n  write the steps down. that is a real set of cases -- it is just\n  much smaller than the number of systems that use one.",
        notes: [
          { t: "p", text: "**The first three approaches have a p95 at or near their p50**, because the path is fixed. The agent's p95 is more than double its median." },
          { t: "p", text: "**That gap is not noise** \u2014 it is where the model retried a failed tool, fetched something unnecessary, second-guessed itself, or looped to the cap. So an agent's cost and latency are distributions rather than numbers, and budgeting from the median underestimates systematically." },
          { t: "p", text: "**Five properties go**: determinism, predictable cost, predictable latency, testability and debuggability. The testability one compounds, because you can only assert on the outcome \u2014 every test becomes end-to-end, and a change anywhere can break any of them." },
          { t: "p", text: "**The test is four questions about the task**, not about the technology. Steps known in advance means a chain; one decision then a fixed path means a router; needing to react to results repeatedly means an agent." },
          { t: "p", text: "**Applied honestly to an existing system, the usual finding is a router** \u2014 one classification and then a fixed path. Expressing it as one buys back determinism, a p95 equal to the p50, and tests that can assert on the path." },
          { t: "p", text: "**An agent buys adaptability with predictability**, which is a good trade when the inputs are genuinely unanticipated and a bad one when you simply did not enumerate them. The question is not whether an agent could do it \u2014 it almost always could \u2014 but whether you actually do not know the steps." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that was a router", body: [
      { t: "p", text: "A document-processing agent has four tools and a careful system prompt. It works. Costs are higher than expected and a p95 latency spike shows up in the SLO report that nobody can attribute, because the slow runs look structurally the same as the fast ones." },
      { t: "p", text: "Logging tool-call sequences shows that 94% of runs follow one of two fixed paths determined entirely by the document type, which is available from the file extension before the model is ever invoked. The remaining 6% are the p95, and most of them are the model retrying a tool that failed transiently." },
      { t: "p", text: "Rewritten as a router with two fixed chains, the median cost halves, the p95 collapses to the p50, and the tests can assert on the path rather than on the output. The 6% that genuinely needed to adapt get routed to the agent, which is now a fallback rather than the default \u2014 and that shape, **a router with an agent as the escape hatch**, is usually the right architecture for a task that is mostly predictable with a long tail." }
    ] }
  ],
  takeaways: [
    "**An agent is a more expensive way to be less reliable**, bought for cases where you cannot write the steps down.",
    "**The deciding column is p95, not p50**: a fixed chain is 3 and 3; an agent is 4 and 9.",
    "**That gap is retries, unnecessary fetches, second-guessing and loops to the cap** \u2014 not noise.",
    "**So an agent's cost and latency are distributions, not numbers**, and budgeting from the median underestimates systematically.",
    "**Five properties go**: determinism, predictable cost, predictable latency, testability, debuggability.",
    "**Testability compounds** \u2014 you can only assert on the outcome, so every test is end-to-end.",
    "**Four questions decide**: are the steps known, is the tool choice obvious, must it react to results, is a wrong path expensive.",
    "**Steps known \u2192 chain. One decision \u2192 router. Must react repeatedly \u2192 agent.**",
    "**Most production agents turn out to be routers** \u2014 one classification and then a fixed path.",
    "**Expressing that as a router buys back determinism, a p95 equal to the p50, and path assertions.**",
    "**An agent buys adaptability with predictability**, which is a bad trade if you simply did not enumerate the inputs.",
    "**A router with an agent as the escape hatch** is usually right for a task that is mostly predictable with a long tail."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A fixed chain takes 3 calls at both p50 and p95; an agent takes 4 and 9. What explains the agent's gap?",
      options: ["Measurement noise at the tail",
        "Retries, unnecessary fetches, second-guessing and loops to the cap \u2014 the path varies per request",
        "Slower models being selected for harder inputs",
        "Provider rate limiting on longer runs"],
      answer: 1,
      why: "The agent decides each step, so the number of steps is a property of the run rather than of the program \u2014 which makes cost and latency distributions rather than numbers. The tail is where things went sideways in recoverable ways. The practical consequence is that a budget built from the median underestimates systematically, and the user experience is set by the tail rather than the median." },
    { stem: "Which property does an agent give up that compounds into every test?",
      options: ["Predictable cost", "Testability \u2014 you can only assert on the outcome, so every test is end-to-end",
        "Determinism of the model's wording", "Streaming support"],
      answer: 1,
      why: "With a fixed chain you can assert that a particular step ran with a particular input. With an agent the path varies, so assertions can only target the final answer \u2014 which makes every test end-to-end, and means a change anywhere can break any of them for reasons that take a while to locate. That is why the loss of testability is worse than it first appears." },
    { stem: "You log tool-call sequences and find 94% of runs follow one of two fixed paths determined by document type. What does that suggest?",
      options: ["The agent is working well and needs no change",
        "It is really a router \u2014 express it as one and keep the agent as a fallback for the remaining 6%",
        "The tool descriptions need improving so it explores more",
        "The model is too small to make varied decisions"],
      answer: 1,
      why: "If the path is determined by something knowable before the model is invoked \u2014 a file extension here \u2014 then the decision does not need a model. Rewriting as a router with two fixed chains recovers determinism, collapses p95 to p50 and makes path assertions possible, while routing the genuinely unpredictable 6% to the agent. A router with an agent as the escape hatch is usually right for a mostly-predictable task with a long tail." },
    { stem: "What is the right question to ask when choosing between a chain and an agent?",
      options: ["Could an agent handle this task?",
        "Do I actually not know the steps?",
        "Which approach is more maintainable in the long run?",
        "Does the task involve more than two tools?"],
      answer: 1,
      why: "An agent almost always could handle the task, so that question never discriminates. What you are buying is adaptability and what you are paying is predictability \u2014 a good trade when the inputs are genuinely unanticipated and a bad one when you simply had not enumerated them. If the steps can be written down, writing them down is cheaper, faster, testable and debuggable." }
  ] },
  interview: { title: "Interview practice", sub: "Chains or agents", questions: [
    { level: "core", q: "When would you use an agent rather than a chain?",
      strong: "A strong answer is about not knowing the steps, and prices the tail.",
      answer: [
        { t: "p", text: "When I genuinely cannot write the steps down in advance \u2014 when the task has to react to what a tool returned, repeatedly, in ways I cannot enumerate." },
        { t: "p", text: "The thing I would want priced before making that choice is the tail, not the median. A fixed chain has a p95 equal to its p50 because the path is fixed. An agent's p95 is roughly double its median, because the tail is where the model retried a failed tool, fetched something it did not need, second-guessed itself, or looped until the cap. So cost and latency become distributions rather than numbers, and a budget built from the median underestimates systematically." },
        { t: "p", text: "And five things go: determinism, predictable cost, predictable latency, testability and debuggability. Testability is the one that compounds \u2014 you can only assert on the outcome, so every test becomes end-to-end and a change anywhere can break any of them." },
        { t: "p", text: "So the question I actually ask is not whether an agent could do it, because it almost always could. It is whether I really do not know the steps. If I can write them down, writing them down is cheaper, faster, testable and debuggable." }
      ] },
    { level: "advanced", q: "You inherit an agent with higher costs than expected and an unexplained p95 spike. What do you do?",
      strong: "A strong answer logs the trajectories and expects a router.",
      answer: [
        { t: "p", text: "Log the tool-call sequence for every run and look at the distribution of paths, because the slow runs usually look structurally identical to the fast ones in a normal trace \u2014 that is why nobody can attribute the spike." },
        { t: "p", text: "My strong prior is that most runs follow a small number of fixed paths. When I have done this, the finding is typically something like ninety-odd per cent of runs taking one of two routes determined by something knowable before the model is ever invoked \u2014 a document type from a file extension, an intent from a form field." },
        { t: "p", text: "If that holds, it is a router rather than an agent, and expressing it as one buys back a great deal: the median cost drops, the p95 collapses to the p50 because the path is fixed, and the tests can assert on the path instead of only on the output." },
        { t: "p", text: "The remaining few per cent that genuinely need to adapt get routed to the agent, which becomes a fallback rather than the default. That shape \u2014 a router with an agent as the escape hatch \u2014 is usually the right architecture for a task that is mostly predictable with a long tail, and it is what the honest version of most production agents looks like." },
        { t: "p", text: "I would not assume the original choice was careless, though. The usual reason is that the agent abstraction was what the examples used and it worked, so nobody revisited it." }
      ] },
    { level: "core", q: "Summarise what this module says about agents.",
      strong: "A strong answer is unsentimental and specific.",
      answer: [
        { t: "p", text: "That an agent is a more expensive way to be less reliable, bought for the cases where you cannot write the steps down \u2014 which is a real set of cases and much smaller than the number of systems using one." },
        { t: "p", text: "Concretely: the loop is nine lines, and the termination condition is a model judgement rather than a program one, so you cannot bound a run in advance. The transcript grows by two messages per tool round and is re-sent on every call, which makes cost quadratic in rounds. Three guards are mandatory \u2014 an iteration cap, tool error handling and an unknown-tool guard \u2014 and there is a fourth failure none of them catch, where the model answers without calling any tool and claims it did." },
        { t: "p", text: "Memory is a deferred outage unless bounded, because the buffer grows until it exceeds the context window and then fails on your longest conversations, which belong to your most engaged users." },
        { t: "p", text: "None of that is an argument against agents. It is an argument for knowing what one costs before choosing it, and for checking afterwards whether what you built is actually a router." }
      ] }
  ] }
});
