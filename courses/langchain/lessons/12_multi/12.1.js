EC.receiveLesson({
  id: "12.1",
  lede: "The same task, two ways: one agent with both tools took **3 model calls**; a supervisor plus two specialists took **5** \u2014 3 supervisor turns and 2 worker turns. So the coordination cost is **2 extra model calls for identical work**, and every supervisor turn is a call that does no work, only deciding who works next. Three reasons justify paying that, and all three are **structural** \u2014 different permissions, a context budget that genuinely does not fit, separate ownership. The reasons that do not justify it include the most commonly given one: *\u201cspecialist agents are better at their domain\u201d*, when a prompt is a specialist.",
  objectives: [
    "Measure the coordination overhead against a single agent",
    "Name the three structural reasons that justify multiple agents",
    "Reject the reasons that do not",
    "Explain why the complexity moves rather than reduces",
    "State the honest default"
  ],
  prerequisites: ["11.1", "11.8"],
  blocks: [
    { t: "h2", n: "01", id: "measured", text: "The same task, one agent and two", sub: "Measured" },
    { t: "code", lang: "text", title: "One agent with both tools",
      code: "model calls : 3\nmessages    : 6",
      caption: "Two tool calls and a final answer." },
    { t: "code", lang: "text", title: "A supervisor plus two specialists",
      code: "supervisor calls : 3\nworker calls     : 2\ntotal model calls: 5\n\ntrace: ['supervisor -> docs', 'docs', 'supervisor -> account',\n        'account', 'supervisor -> FINISH']",
      caption: "**2 extra model calls** for the same work." },
    { t: "callout", kind: "insight", title: "Every supervisor turn does no work", body: [
      { t: "p", text: "A supervisor turn decides who works next. It retrieves nothing, writes nothing and answers nothing \u2014 so the coordination overhead is one model call per unit of work, plus one more to decide it is finished." },
      { t: "p", text: "That is the number to hold against any multi-agent proposal. It is not large in absolute terms and it scales with the number of handoffs, so a five-step task pays six coordination calls." }
    ] },
    { t: "h2", n: "02", id: "reasons", text: "The three reasons that justify it", sub: "All structural" },
    { t: "dl", items: [
      ["different tools with different **permissions**", "An agent that can issue refunds and an agent that can read docs should not be one agent with both \u2014 then every turn has the refund tool available. Splitting is 3.6's least privilege."],
      ["**context** that does not fit or should not mix", "Twenty tools in one prompt is a large fixed cost per turn (11.3), and tool descriptions from an untrusted source should not share a prompt with privileged tools (7.6, 10.9)."],
      ["separate **ownership** and release cycles", "A team boundary \u2014 the same argument as 10.1's subgraph: an interface is worth its cost when two groups evolve separately."]
    ] },
    { t: "h2", n: "03", id: "notreasons", text: "And the reasons that do not", sub: "Including the most common one" },
    { t: "callout", kind: "trap", title: "\u201cSpecialist agents are better at their domain\u201d", body: [
      { t: "p", text: "A **prompt** is a specialist. One agent with a routing step and three system prompts gets the same specialisation for one model call instead of two." },
      { t: "p", text: "So this reason is usually describing a want that a router satisfies \u2014 and 11.2 measured a router at one model call with enumerable paths and no possibility of looping." }
    ] },
    { t: "dl", items: [
      ["\u201cit mirrors how a human team works\u201d", "An org chart solves human **communication bandwidth** and **accountability** problems. Neither constraint applies here, so copying the structure imports the coordination cost without the reason."],
      ["\u201ceach agent is simpler\u201d", "Each agent is simpler and the **system** is not. The complexity moved into the handoffs, where it is harder to see \u2014 12.8 is entirely about failures that live in the gaps."],
      ["\u201cit will scale better\u201d", "More model calls per request is the opposite of scaling. The measurement is **5 against 3** for the same answer."]
    ] },
    { t: "h2", n: "04", id: "moved", text: "The complexity moves", sub: "Which is the argument worth internalising" },
    { t: "p", text: "The *each agent is simpler* claim is true and misleading in the same sentence. Splitting one agent into three does reduce each one's prompt and tool list. What it adds is the handoff logic, the shared state's contract, the attribution problem and the coordination failures \u2014 none of which any individual agent owns." },
    { t: "callout", kind: "mental", title: "Bugs that nobody owns", body: [
      { t: "p", text: "12.8's failures \u2014 infinite handoffs, context loss at a boundary, duplicated work, the blame problem \u2014 are all properties of the **system** rather than of an agent. Each agent can be correct while the system fails." },
      { t: "p", text: "Which is why the complexity being *harder to see* matters more than it being *moved*. A complicated agent is complicated in a file you can read; a complicated handoff is complicated in the space between two files." }
    ] },
    { t: "h2", n: "05", id: "default", text: "The honest default", sub: "11.1's ladder, one level up" },
    { t: "p", text: "One agent with the tools it needs, until one of the three structural reasons applies. And note that all three are about **permissions, context budget or ownership** rather than about capability." },
    { t: "callout", kind: "good", title: "Not whether multiple agents could work", body: [
      { t: "p", text: "The question is whether a **single agent cannot** \u2014 which is 11.1's ladder reasoning applied one level up. Multiple agents will usually work; so will one, more cheaply and with fewer gaps." },
      { t: "p", text: "And the same asymmetry holds: splitting later is additive, while merging later means discovering which boundaries were load-bearing \u2014 which requires measurements nobody took." }
    ] },
    { t: "exercise", kind: "analysis", title: "Measure the coordination overhead",
      difficulty: "core", minutes: 30,
      body: "Implement the same two-part task twice: once as a single agent with both tools, and once as a supervisor with two specialist workers, using scripted models so the comparison is deterministic. Count the model calls in each and state the coordination overhead. Then give the three structural reasons that justify multiple agents and at least three reasons that do not, explaining for each why it does or does not hold. Finally state the default and the question it rests on.",
      requirements: ["Implement the task as a single agent and count the model calls",
        "Implement it as a supervisor plus two workers and count the calls",
        "State the coordination overhead and what a supervisor turn does",
        "Give three structural reasons that justify multiple agents",
        "Reject at least three reasons that do not, with the argument for each",
        "Explain why the complexity moves rather than reduces",
        "State the default and the question behind it"],
      hint: "Count the supervisor's calls separately from the workers'. The supervisor's calls do no work, which is the whole overhead.",
      solution: { lang: "python", title: "x1201.py \u2014 5 calls against 3",
        code: '# one agent with both tools\nb1 = one.bind_tools([search_docs, check_account])\ng1.add_conditional_edges("agent", tools_condition)\ng1.add_edge("tools", "agent")\nprint(len(one.seen))                      # 3\n\n# a supervisor plus two specialists\ndef supervisor(state):\n    out = sup.invoke(state["messages"])\n    return {"next": out.content.strip(), ...}\n\ng2.add_conditional_edges("supervisor", route,\n                         {"docs": "docs", "account": "account", END: END})\ng2.add_edge("docs", "supervisor")\ng2.add_edge("account", "supervisor")\nprint(len(sup.seen) + len(docs_agent.seen) + len(acct_agent.seen))   # 5',
        out: "==============================================================================\nPART 1 -- the same task, one agent and two\n==============================================================================\n  ONE agent with both tools:\n    model calls : 3\n    messages    : 6\n\n  SUPERVISOR plus two specialists:\n    supervisor calls : 3\n    worker calls     : 2\n    total model calls: 5\n    trace            : ['supervisor -> docs', 'docs', 'supervisor -> account', 'account', 'supervisor -> FINISH']\n\n  so the coordination cost is 2 extra model calls for the same work.\n  every supervisor turn is a model call that does no work -- it only\n  decides who works next.\n==============================================================================\nPART 2 -- the three reasons that justify it\n==============================================================================\n  1. DIFFERENT TOOLS WITH DIFFERENT PERMISSIONS\n     an agent that can issue refunds and an agent that can read docs\n     should not be one agent with both, because then every turn has\n     the refund tool available. splitting is least privilege (3.6).\n\n  2. CONTEXT THAT DOES NOT FIT OR SHOULD NOT MIX\n     20 tools in one prompt is a large fixed cost per turn (11.3),\n     and tool descriptions from an untrusted source should not share\n     a prompt with privileged tools (7.6, 10.9).\n\n  3. SEPARATE OWNERSHIP AND RELEASE CYCLES\n     a team boundary. the same argument as 10.1's subgraph: an\n     interface is worth its cost when two groups evolve separately.\n==============================================================================\nPART 3 -- and the reasons that do not\n==============================================================================\n  'specialist agents are better at their domain'\n     a prompt is a specialist. one agent with a routing step and\n     three system prompts gets the same specialisation for one model\n     call instead of two.\n\n  'it mirrors how a human team works'\n     an org chart is a solution to human communication bandwidth and\n     accountability. neither constraint applies here, and copying the\n     structure imports the coordination cost without the reason.\n\n  'each agent is simpler'\n     each agent is simpler and the SYSTEM is not. the complexity\n     moved into the handoffs, where it is harder to see -- 12.8 is\n     entirely about failures that live in the gaps.\n\n  'it will scale better'\n     more model calls per request is the opposite of scaling. the\n     measurement above is 5 calls against 3 for the same answer.\n==============================================================================\nPART 4 -- the honest default\n==============================================================================\n  one agent with the tools it needs, until one of the three reasons\n  applies. and the reasons are all STRUCTURAL -- permissions,\n  context budget, ownership -- rather than about capability.\n\n  which is 11.1's ladder one level up: the question is not whether\n  multiple agents could work, but whether a single agent cannot.",
        notes: [
          { t: "p", text: "**One agent took 3 model calls; a supervisor plus two specialists took 5** \u2014 2 extra for identical work." },
          { t: "p", text: "**Every supervisor turn does no work** \u2014 it retrieves nothing and answers nothing, only deciding who works next." },
          { t: "p", text: "**So the overhead scales with handoffs**: a five-step task pays six coordination calls." },
          { t: "p", text: "**Three structural reasons justify it**: different permissions (3.6), a context budget that does not fit or should not mix (7.6, 10.9), and separate ownership (10.1's subgraph argument)." },
          { t: "p", text: "**\u2018Specialist agents are better at their domain\u2019 does not** \u2014 a prompt is a specialist, and a router gets the same specialisation for one model call." },
          { t: "p", text: "**\u2018It mirrors a human team\u2019 does not** \u2014 an org chart solves bandwidth and accountability problems that do not apply here." },
          { t: "p", text: "**\u2018Each agent is simpler\u2019 is true and misleading**: each agent is simpler and the system is not, because the complexity moved into the handoffs." },
          { t: "p", text: "**And the handoffs are where nobody is looking** \u2014 12.8's failures are all properties of the system rather than of an agent." },
          { t: "p", text: "**So the default is one agent**, and the question is not whether multiple agents could work but whether a single agent cannot." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the five-agent system that replaced a prompt", body: [
      { t: "p", text: "A team builds five specialist agents \u2014 billing, technical, account, shipping, general \u2014 coordinated by a supervisor. Latency doubles, cost roughly doubles, and quality is indistinguishable from the single agent it replaced. Every individual agent tests well." },
      { t: "p", text: "The specialisation was entirely in the system prompts, and a prompt does not need an agent to hold it. A router selecting one of five prompts and a shared tool list gets the same behaviour at one classification call, with enumerable paths and no handoff loops available." },
      { t: "p", text: "What makes this hard to unwind afterwards is that nobody measured the single-agent baseline, so there is no evidence for the change beyond the latency number \u2014 which is exactly 11.8's advice in reverse. The useful move at design time is to build the single agent first and keep it as the comparison, because a multi-agent system without a measured baseline is a system nobody can argue about." }
    ] }
  ],
  takeaways: [
    "**One agent took 3 model calls; a supervisor plus two specialists took 5.**",
    "**Every supervisor turn does no work** \u2014 it only decides who works next.",
    "**So the overhead scales with handoffs** \u2014 a five-step task pays six coordination calls.",
    "**Three structural reasons justify it: permissions, context budget, ownership.**",
    "**Different permissions** \u2014 one agent with both tools has the dangerous one available every turn.",
    "**Context that does not fit or should not mix** \u2014 twenty tools, or untrusted tool descriptions.",
    "**Separate ownership** \u2014 10.1's subgraph argument, applied to agents.",
    "**\u2018Specialists are better\u2019 does not justify it** \u2014 a prompt is a specialist.",
    "**\u2018It mirrors a human team\u2019 does not** \u2014 an org chart solves problems that do not apply here.",
    "**\u2018Each agent is simpler\u2019 is true and misleading** \u2014 the system is not simpler.",
    "**The complexity moves into the handoffs**, where nobody is looking.",
    "**A complicated agent is complicated in a file; a complicated handoff is complicated between files.**",
    "**All three good reasons are structural**, not about capability.",
    "**The question is not whether multiple agents could work, but whether one cannot.**",
    "**Build the single agent first and keep it as the baseline.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A supervisor plus two specialists took 5 model calls where one agent took 3. Where did the extra calls go?",
      options: ["Into the workers' longer prompts",
        "Into supervisor turns, which do no work \u2014 they only decide who acts next",
        "Into retries caused by the handoffs",
        "Into serialising state between agents"],
      answer: 1,
      why: "Each supervisor turn is a model call that retrieves nothing, writes nothing and answers nothing; it selects the next worker. Three such turns were needed for two units of work \u2014 one before each worker and one to decide the task was complete. So the overhead scales with the number of handoffs rather than being a fixed cost." },
    { stem: "Which reason does NOT justify splitting into multiple agents?",
      options: ["One tool can issue refunds and should not be available on every turn",
        "Specialist agents are better at their domain than one generalist",
        "Twenty tool descriptions do not fit usefully in one prompt",
        "A different team owns one of the workflows and releases separately"],
      answer: 1,
      why: "Specialisation lives in the system prompt, and a prompt does not need an agent to hold it. A router selecting one of several prompts achieves the same behaviour at one model call, with enumerable paths and no handoff loops possible. The other three are structural \u2014 about permissions, context budget and ownership \u2014 and cannot be solved by prompting." },
    { stem: "What is wrong with the claim that each agent is simpler in a multi-agent system?",
      options: ["It is false \u2014 the agents are not simpler",
        "It is true, and the system is not: the complexity moved into the handoffs, where no agent owns it",
        "Simplicity is not a useful design criterion",
        "The agents become simpler only after several refactors"],
      answer: 1,
      why: "Splitting genuinely reduces each agent's prompt and tool list. What it adds is handoff logic, a shared-state contract, the attribution problem and the coordination failures \u2014 and every one of those is a property of the system rather than of an agent. Each agent can be correct while the system fails, which is harder to debug than one complicated agent in a file you can read." },
    { stem: "What should you build before a multi-agent system?",
      options: ["The supervisor, since it is the coordination point",
        "The single-agent version, and keep it as a measured baseline",
        "The shared state schema",
        "The handoff protocol"],
      answer: 1,
      why: "Without a baseline there is no evidence for the change beyond latency, and a multi-agent system nobody can compare is one nobody can argue about. It is also the cheaper direction: splitting later is additive, while merging later means discovering which boundaries were load-bearing from measurements nobody took." }
  ] },
  interview: { title: "Interview practice", sub: "Why more than one agent", questions: [
    { level: "core", q: "When do you need more than one agent?",
      strong: "A strong answer gives structural reasons and prices the overhead.",
      answer: [
        { t: "p", text: "When one of three structural things is true: the tools need different permissions, the context does not fit or should not mix, or different people own the workflows and release separately." },
        { t: "p", text: "All three are structural rather than about capability, which matters because the most common reason given \u2014 that specialist agents are better at their domain \u2014 is not one of them. A prompt is a specialist. A router selecting one of three system prompts gets the same specialisation for one model call." },
        { t: "p", text: "The permissions one is the clearest. If one agent can issue refunds and read docs, then every turn has the refund tool available, which is a least-privilege problem rather than a quality one. Splitting fixes something prompting cannot." },
        { t: "p", text: "And I would price the overhead. I measured the same two-part task at three model calls for one agent and five for a supervisor plus two specialists \u2014 because every supervisor turn is a call that does no work, it only decides who works next. That scales with handoffs, so a five-step task pays six coordination calls." }
      ] },
    { level: "advanced", q: "What is wrong with 'each agent is simpler'?",
      strong: "A strong answer says the complexity moved somewhere worse.",
      answer: [
        { t: "p", text: "It is true and misleading at the same time, which is what makes it persuasive." },
        { t: "p", text: "Splitting one agent into three genuinely reduces each one's prompt and tool list. What it adds is the handoff logic, the shared state's contract, the attribution problem, and a set of coordination failures \u2014 infinite handoffs, context loss at a boundary, duplicated work." },
        { t: "p", text: "Every one of those is a property of the system rather than of an agent, which means each agent can be individually correct while the system fails. That is strictly harder to debug than one complicated agent, because a complicated agent is complicated in a file you can read and a complicated handoff is complicated in the space between two files." },
        { t: "p", text: "The related claim I would also push back on is that it mirrors how a human team works. An org chart exists to solve human communication bandwidth and accountability, and neither constraint applies here \u2014 so copying the structure imports the coordination cost without the reason for it." },
        { t: "p", text: "So my default is one agent with the tools it needs, and I would build that first and keep it as the baseline. A multi-agent system without a measured single-agent comparison is one nobody can argue about later." }
      ] },
    { level: "core", q: "A team wants to split one agent into five because its prompt is too long. What do you suggest?",
      strong: "A strong answer separates the real problem from the proposed fix.",
      answer: [
        { t: "p", text: "I would ask what specifically is too long, because the answer decides whether splitting helps at all." },
        { t: "p", text: "If it is the tool list, that is a real context problem and one of the three structural reasons \u2014 twenty tool descriptions are a fixed cost on every turn, and the choice gets harder rather than richer. Splitting by tool group is justified." },
        { t: "p", text: "If it is the instructions, splitting does not help. A prompt is a specialist, so a router selecting one of five system prompts gets the same reduction in per-turn context for one model call instead of two. That is strictly cheaper than five agents with a supervisor." },
        { t: "p", text: "And if it is the conversation history, neither helps \u2014 that is a trimming problem, and the agents would each carry the same history." },
        { t: "p", text: "So the question I would push on is which part of the prompt is the problem, measured in tokens. 'The prompt is too long' is a symptom with three different causes and only one of them is fixed by splitting." }
      ] }
  ] }
});
