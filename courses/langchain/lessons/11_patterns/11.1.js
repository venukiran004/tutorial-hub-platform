EC.receiveLesson({
  id: "11.1",
  lede: "There is a ladder from a single call to a full agent, and the rungs are not equivalent in anything except capability \u2014 each step down trades a **bound** for a **freedom**. Measured on one question: a single call is 1 model call, a single tool-calling turn is 1 (the tool output *is* the answer), a router is 1 plus a branch that does no model work, and the agent loop is **2** \u2014 a second call existing only to turn the tool result into prose. The rule is to stop at the lowest rung that works, and the test is specific: does the **sequence** of operations vary by request, or only the **choice**?",
  objectives: [
    "Describe the ladder and what each rung trades",
    "Measure the model calls at each rung on one task",
    "Recognise that a single tool-calling turn is not an agent",
    "Apply the sequence-against-choice test",
    "Explain why the mistake is asymmetric"
  ],
  prerequisites: ["9.3", "9.1"],
  blocks: [
    { t: "h2", n: "01", id: "ladder", text: "The ladder", sub: "Each rung trades a bound for a freedom" },

    {"kind": "timeline", "title": "The ladder, in model calls", "caption": "The rungs are not equivalent in anything except capability — **each step down trades a bound for a freedom**. Measured on one question, which is the comparison worth having before reaching for the top rung.", "span": 7, "tick": 1, "unit": "model calls for the same question", "lanes": [{"label": "a single call", "bars": [[0, 1, "1", "good"]]}, {"label": "a chain", "bars": [[0, 2, "2", "good"]]}, {"label": "a router", "bars": [[0, 2, "2 — bounded", "good"]]}, {"label": "one tool call", "bars": [[0, 2, "2", "teal"]]}, {"label": "ReAct, 2 tools", "bars": [[0, 3, "3", "warn"]]}, {"label": "a full agent", "bars": [[0, 6.5, "unbounded", "crit"]]}], "t": "diagram", "id": "dg-11_1-01-0"},




    { t: "table", head: ["rung", "model calls", "control", "can it loop?"], rows: [
      ["1 one call", "1", "yours", "no"],
      ["2 one call + tools", "2+", "yours", "no"],
      ["3 router", "1 + branch", "yours", "no"],
      ["4 ReAct agent", "**2..N**", "the model's", "**yes**"],
      ["5 plan-and-execute", "1 + N + \u2026", "shared", "yes"]
    ] },
    { t: "p", text: "The rungs differ in capability and in what you can **predict** (9.3). A workflow's cost and latency are countable by reading the graph; an agent's are not, which is why 8.9's recursion limit exists at all." },
    { t: "h2", n: "02", id: "rung2", text: "Rung 2 is not an agent", sub: "And it covers a real class of task" },
    { t: "code", lang: "text", title: "A single tool-calling turn",
      code: "model asked for: lookup_policy\ntool returned  : 'Refunds are available within 30 days of purchase.'\nmodel calls    : 1",
      caption: "One call, and the tool output **is** the answer." },
    { t: "p", text: "Worth naming as a rung because *\u201clook this up\u201d* is a real and common requirement, and people reach for an agent loop to serve it. If the tool's output is what the user wants, returning it is the whole system." },
    { t: "h2", n: "03", id: "rung3", text: "Rung 3: the cheapest useful agency", sub: "One classification" },
    { t: "code", lang: "text", title: "A router",
      code: "['classified as billing', 'billing handled it']\nmodel calls: 1  (one classification; the branch did no model work)",
      caption: "Paths enumerable, looping structurally impossible." },
    { t: "h2", n: "04", id: "rung4", text: "Rung 4: the agent, and what it costs", sub: "Two calls for a one-call answer" },
    { t: "code", lang: "text", title: "The same question through an agent loop",
      code: "HumanMessage('refund policy?')\nAIMessage(tool_calls=['lookup_policy'])\nToolMessage('Refunds are available within 30 days of purchase.')\nAIMessage('Refunds are available within 30 days.')\nmodel calls: 2",
      caption: "The second call turns the tool result into prose." },
    { t: "callout", kind: "insight", title: "Two calls for the answer one tool call already had", body: [
      { t: "p", text: "The second model call exists to phrase the result. That is sometimes exactly what you want \u2014 a tool returning structured data needs turning into a sentence \u2014 and it is not free, and it is not the answer." },
      { t: "p", text: "So the question at rung 4 is whether you are buying the **loop** or the **phrasing**. If it is the phrasing, you are at rung 2 with a formatting step, and formatting does not need to be a loop." }
    ] },
    { t: "h2", n: "05", id: "rule", text: "The rule, and the test", sub: "Sequence or choice" },
    { t: "callout", kind: "mental", title: "Does the sequence vary, or only the choice?", body: [
      { t: "p", text: "If only the **choice** varies \u2014 the request is one of five kinds and each needs one known operation \u2014 you are on rung 3, and a conditional edge expresses it exactly." },
      { t: "p", text: "If the **sequence** genuinely varies, because the next action depends on what the last one returned in a way you cannot enumerate, you need rung 4. That is the only honest justification for the loop." }
    ] },
    { t: "h2", n: "06", id: "asymmetry", text: "Why the mistake is asymmetric", sub: "Which is the real argument" },
    { t: "p", text: "A bounded pattern that nearly works is **one branch away** from working \u2014 the gap is visible and the fix is local. An agent that works unpredictably is a measurement problem, a cost problem and a debugging problem at once, and none of those is one change away from fixed." },
    { t: "p", text: "That asymmetry is why the rule is *stop at the lowest rung that works* rather than *choose the appropriate rung*. Guessing low costs you a branch; guessing high costs you the ability to say anything about the system's behaviour." },
    { t: "exercise", kind: "analysis", title: "Measure the ladder",
      difficulty: "core", minutes: 28,
      body: "Implement the same task at four rungs \u2014 a single call, a single tool-calling turn, a router, and an agent loop \u2014 using a scripted model so the comparison is deterministic. Count the model calls at each. Explain why a single tool-calling turn is not an agent and what class of task it covers. Explain what the agent's second model call buys. Then state the rule and the test, and say why the mistake is asymmetric.",
      requirements: ["Implement at least four rungs on one task",
        "Count the model calls at each rung",
        "Explain why rung 2 is not an agent",
        "Say what the agent loop's second model call is for",
        "Give the sequence-against-choice test",
        "Explain why guessing low is cheaper than guessing high"],
      hint: "Count the agent loop's model calls against the single tool-calling turn. The extra call is doing something specific.",
      solution: { lang: "python", title: "x1101.py \u2014 2 calls for a 1-call answer",
        code: '# rung 2: one tool-calling turn, and the tool output IS the answer\nfirst = b2.invoke([HumanMessage(content="what is the refund policy")])\nif first.tool_calls:\n    result = lookup_policy.invoke(first.tool_calls[0]["args"])\nprint("model calls:", len(m2.seen))        # 1\n\n# rung 4: the agent loop\ng4.add_conditional_edges("agent", tools_condition)\ng4.add_edge("tools", "agent")\ng4.compile().invoke({"messages": [HumanMessage(content="refund policy?")]})\nprint("model calls:", len(m4.seen))        # 2',
        out: "==============================================================================\nPART 1 -- the ladder, with the cost of each rung\n==============================================================================\n  rung                      model calls   control        can it loop?\n  1 one call                1             yours          no\n  2 one call + tools        2+            yours           no\n  3 router                  1 + branch    yours          no\n  4 ReAct agent             2..N          the model's    yes\n  5 plan-and-execute        1 + N + ...   shared         yes\n\n  the point of the ladder is that the rungs are not equivalent in\n  anything except capability. each step down trades a bound for a\n  freedom, and the bound is what you can predict (9.3).\n==============================================================================\nPART 2 -- rung 1 -- one call, measured\n==============================================================================\n  a single call: 'Refunds take 30 days.'\n  model calls: 1\n\n  no graph, no state, no loop. and it answers any question the model\n  already knows -- which for a documented policy is most of them.\n==============================================================================\nPART 3 -- rung 2 -- one call with tools, which is NOT an agent\n==============================================================================\n  a single tool-calling turn: the model asks, you execute, you\n  return the result to the user WITHOUT asking the model again.\n\n  model asked for: lookup_policy\n  tool returned  : 'Refunds are available within 30 days of purchase.'\n  model calls    : 1\n\n  one call, and the tool output IS the answer. worth naming as a\n  rung because it covers a real class of task -- 'look this up' --\n  and people reach for an agent loop to do it.\n==============================================================================\nPART 4 -- rung 3 -- a router, which is the cheapest useful agency\n==============================================================================\n  ['classified as billing', 'billing handled it']\n  model calls: 1  (one classification; the branch did no model work)\n\n  paths are enumerable -- one per category -- so cost and latency\n  are bounded by the most expensive branch. looping is structurally\n  impossible.\n==============================================================================\nPART 5 -- rung 4 -- the agent, and what it costs\n==============================================================================\n  the same question through an agent loop:\n    HumanMessage('refund policy?')\n    AIMessage(tool_calls=['lookup_policy'])\n    ToolMessage('Refunds are available within 30 days of purc')\n    AIMessage('Refunds are available within 30 days.')\n  model calls: 2\n\n  TWO model calls for the answer one tool call already had. the\n  second call exists to turn the tool result into prose, which is\n  sometimes what you want and is not free.\n==============================================================================\nPART 6 -- the rule\n==============================================================================\n  stop at the lowest rung that works, and the test is specific:\n\n    does the SEQUENCE of operations vary by request, or only the\n    CHOICE of operation?\n\n  if only the choice varies, you are on rung 3 and a conditional\n  edge expresses it exactly. if the sequence genuinely varies -- the\n  next action depends on what the last one returned, in a way you\n  cannot enumerate -- you need rung 4.\n\n  what makes this worth being disciplined about is the asymmetry of\n  the mistake. a bounded pattern that nearly works is one branch\n  away from working. an agent that works unpredictably is a\n  measurement problem, a cost problem and a debugging problem at\n  once -- and none of those is one change away from fixed.",
        notes: [
          { t: "p", text: "**The rungs trade a bound for a freedom** \u2014 each step down gives the model more control and you less ability to predict cost and latency." },
          { t: "p", text: "**A single tool-calling turn is 1 model call and not an agent** \u2014 the tool output is the answer, which covers the whole \u2018look this up\u2019 class of task." },
          { t: "p", text: "**A router is 1 model call plus a branch that does no model work**, with enumerable paths and no possibility of looping." },
          { t: "p", text: "**The agent loop took 2 model calls** for the answer one tool call already had \u2014 the second exists to turn the tool result into prose." },
          { t: "p", text: "**So ask whether you are buying the loop or the phrasing.** If it is the phrasing, that is rung 2 with a formatting step, and formatting need not be a loop." },
          { t: "p", text: "**The test: does the SEQUENCE of operations vary by request, or only the CHOICE?** Only the choice is a router." },
          { t: "p", text: "**And the mistake is asymmetric**: a bounded pattern that nearly works is one branch away from working, while an unpredictable agent is a measurement, cost and debugging problem at once." },
          { t: "p", text: "**Which is why the rule is \u2018stop at the lowest rung that works\u2019** rather than \u2018choose the appropriate rung\u2019." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that was a lookup", body: [
      { t: "p", text: "A team builds an agent to answer policy questions from an internal wiki. It has one tool: a wiki search. Every request produces a tool call followed by a model call that rephrases the retrieved paragraph. Latency is two model calls and users occasionally see a rephrasing that drops a caveat from the original." },
      { t: "p", text: "The loop is never used \u2014 there is one tool, called once, every time. The second model call is doing formatting, and formatting is where the dropped caveat came from: the paraphrase lost information the source had." },
      { t: "p", text: "Returning the retrieved passage directly is rung 2, halves the latency and cost, and is **more** accurate because it does not paraphrase. If the passage needs shaping for display, that is a template or a formatting call with the original kept alongside \u2014 which is also 5.7's citation argument: the source is what makes the answer checkable, and rephrasing it away removes the thing you would verify against." }
    ] }
  ],
  takeaways: [
    "**The rungs trade a bound for a freedom** \u2014 capability for predictability.",
    "**A single call is 1 model call** and answers anything the model already knows.",
    "**A single tool-calling turn is 1 call and not an agent** \u2014 the tool output is the answer.",
    "**Which covers the whole \u2018look this up\u2019 class of task** that people build agents for.",
    "**A router is 1 call plus a branch that does no model work.**",
    "**With enumerable paths and no possibility of looping.**",
    "**The agent loop took 2 calls** for the answer one tool call already had.",
    "**The second call turns the tool result into prose** \u2014 sometimes wanted, never free.",
    "**So ask whether you are buying the loop or the phrasing.**",
    "**The test: does the sequence of operations vary, or only the choice?**",
    "**Only the choice varying is a router**, expressed exactly by a conditional edge.",
    "**The mistake is asymmetric**: a bounded pattern is one branch from working.",
    "**An unpredictable agent is a measurement, cost and debugging problem at once.**",
    "**So stop at the lowest rung that works**, rather than choosing the appropriate rung."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "An agent loop answered a question in two model calls where a single tool-calling turn needed one. What is the second call doing?",
      options: ["Verifying the tool's output",
        "Turning the tool result into prose \u2014 which is formatting, not the loop",
        "Deciding whether to call another tool, which it declined",
        "Re-reading the conversation to check for completeness"],
      answer: 1,
      why: "The tool already produced the answer; the model's second turn phrases it. That is sometimes exactly what you want, and it means the extra call is buying formatting rather than agency. If the loop is never used \u2014 one tool, called once, every time \u2014 then you are paying an agent's cost for a formatting step that does not need to be a loop." },
    { stem: "What test decides whether you need an agent rather than a router?",
      options: ["Whether more than one tool is involved",
        "Whether the SEQUENCE of operations varies by request, or only the CHOICE of operation",
        "Whether the task requires reasoning",
        "Whether the output needs to be structured"],
      answer: 1,
      why: "A request resolving to one of five intents, each needing one known operation, has a varying choice and a fixed sequence \u2014 which a conditional edge expresses exactly, with one model call and no possibility of a loop. An agent is justified when the next action depends on the last result in a way you cannot enumerate in advance." },
    { stem: "Why is guessing too low on the ladder cheaper than guessing too high?",
      options: ["Lower rungs are easier to implement",
        "A bounded pattern that nearly works is one branch away from working; an unpredictable agent is a measurement, cost and debugging problem at once",
        "Higher rungs require more infrastructure",
        "Lower rungs can be upgraded automatically"],
      answer: 1,
      why: "The failure of a router is visible and local: a category it does not handle is one branch to add. The failure of an agent is diffuse \u2014 you cannot bound its cost by reading it, cannot reproduce its path reliably, and cannot say which of several interacting decisions produced a bad outcome. None of those is one change from fixed." },
    { stem: "Why is a single tool-calling turn worth naming as a distinct rung?",
      options: ["It is the only rung that can use tools",
        "Because 'look this up' is a common requirement and people build agent loops to serve it",
        "It is the cheapest way to get structured output",
        "It allows parallel tool calls"],
      answer: 1,
      why: "If the tool's output is what the user wants, returning it is the entire system \u2014 one model call to decide what to look up, then the result. Naming the rung makes it available as a choice. Without it the ladder jumps from a single call to a loop, and the loop gets built for tasks that never iterate." }
  ] },
  interview: { title: "Interview practice", sub: "Do you need an agent?", questions: [
    { level: "core", q: "How do you decide how much agency a system needs?",
      strong: "A strong answer gives a ladder and a concrete test.",
      answer: [
        { t: "p", text: "I think of it as a ladder and stop at the lowest rung that works. A single call, a single tool-calling turn, a router, then an agent loop, then planning." },
        { t: "p", text: "The test between a router and an agent is the one I actually use: does the sequence of operations vary by request, or only the choice? If a request resolves to one of five intents and each needs one known operation, that is a router \u2014 one model call, enumerable paths, and looping is structurally impossible." },
        { t: "p", text: "I would also name the second rung explicitly, because people skip it. A single tool-calling turn where the tool's output is the answer is one model call and covers the whole 'look this up' class of task. I measured an agent loop taking two calls for the same question, with the second call existing to turn the tool result into prose." },
        { t: "p", text: "So at rung four the question is whether you are buying the loop or the phrasing. If the loop is never actually used, you are paying an agent's cost for a formatting step." }
      ] },
    { level: "advanced", q: "Why default to the simplest pattern rather than picking the right one?",
      strong: "A strong answer names the asymmetry of the two mistakes.",
      answer: [
        { t: "p", text: "Because the two mistakes are not symmetric, so 'pick the right one' is worse advice than 'start low'." },
        { t: "p", text: "If I guess too low, the failure is visible and local. A router that does not handle a category is one branch to add, and I can see exactly which requests fall through because the paths are enumerable." },
        { t: "p", text: "If I guess too high, the failure is diffuse. I cannot bound the cost by reading the code, cannot reliably reproduce the path a bad run took, and when the output is wrong I cannot say which of several interacting decisions produced it. None of that is one change from fixed \u2014 it is a measurement problem, a cost problem and a debugging problem simultaneously." },
        { t: "p", text: "There is also a practical asymmetry in effort. Moving up the ladder is additive: a router plus a loop is an agent. Moving down means discovering which of the agent's freedoms were load-bearing, which requires the measurements you did not have." },
        { t: "p", text: "So when someone asks for an agent, I ask for twenty real examples of what it must handle. Most of the time they resolve to a handful of intents with one operation each \u2014 and saying that early is worth more than knowing any individual pattern." }
      ] },
    { level: "core", q: "A product manager says competitors have an agent and we need one. How do you respond?",
      strong: "A strong answer redirects to the requirement without dismissing it.",
      answer: [
        { t: "p", text: "I would take the underlying want seriously and separate it from the implementation, because 'an agent' is usually describing an outcome rather than an architecture." },
        { t: "p", text: "So: what should it be able to do that the current thing cannot? Usually the answer is something like 'handle more kinds of question' or 'not need a human for simple cases', and neither of those names a pattern." },
        { t: "p", text: "Then I would ask for twenty real examples from the support queue. If they resolve to a handful of intents with one operation each, the honest answer is that a router delivers the outcome at one model call with enumerable paths and no possibility of a runaway \u2014 and I would say that plainly rather than build the agent and discover it." },
        { t: "p", text: "Where I would agree readily is if the examples genuinely vary in sequence: research, diagnosis, anything where the next step depends on the last result. Then an agent is correct and I would scope the bounds alongside it." },
        { t: "p", text: "What I would not do is argue the point abstractly. The examples settle it, and they are cheap to gather \u2014 which is more persuasive than a position about architectures." }
      ] }
  ] }
});
