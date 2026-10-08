EC.receiveLesson({
  id: "12.3",
  lede: "A swarm has no supervisor: each agent decides whether to answer or hand off, and the handoff is a `Command` (8.8) carrying the reason with the destination. That removes the coordination turn \u2014 one model call per step instead of two. The characteristic failure is measured and worth stating carefully: two agents each handing to the other ran until `GraphRecursionError`, and **neither agent is broken** \u2014 each correctly declines a request outside its area. The loop is a property of **the pair**. The guard has to live in the **shared state**, because no single agent can see the other's handoffs.",
  objectives: [
    "Implement peer-to-peer handoff with Command",
    "Demonstrate the mutual handoff loop",
    "Explain why neither agent is at fault",
    "Put the hop budget where it can work",
    "Compare swarm against supervisor on five dimensions"
  ],
  prerequisites: ["12.2", "8.8"],
  blocks: [
    { t: "h2", n: "01", id: "handoff", text: "Peer-to-peer handoff", sub: "No central router" },
    { t: "code", lang: "python", title: "An agent that may hand off",
      code: 'def billing_agent(state):\n    out = billing.invoke(state["messages"])\n    if out.content.startswith("HANDOFF:"):\n        target = out.content.split(":", 1)[1]\n        return Command(goto=target,\n                       update={"hops": 1,\n                               "trace": ["billing -> %s (not my area)" % target]})\n    return {"messages": [AIMessage(content=out.content, name="billing")], ...}',
      out: "    billing -> tech (not my area)\n    tech answered\n\n  hops: 1",
      caption: "The reason travelled with the destination \u2014 8.8's case exactly." },
    { t: "p", text: "There is no supervisor, so there is no coordination turn: one model call per step rather than two (12.1). That is the swarm's real advantage." },
    { t: "h2", n: "02", id: "loop", text: "The loop two agents can get into", sub: "Measured" },
    { t: "code", lang: "text", title: "Each thinks the other should handle it",
      code: "recursion_limit=8: RAISED GraphRecursionError: Recursion limit of 8 reached\nwithout hitting a stop condition.",
      caption: "The swarm's characteristic failure." },
    { t: "callout", kind: "insight", title: "Neither agent is broken", body: [
      { t: "p", text: "Each one is correctly declining a request outside its area. There is no bug in either agent's logic, no wrong prompt and no malfunction \u2014 and reviewing either one in isolation would find nothing." },
      { t: "p", text: "The loop is a property of **the pair**. Which is 12.1's point made concrete: the complexity moved into the handoffs, and this failure lives entirely in the gap between two correct components." }
    ] },
    { t: "h2", n: "03", id: "guard", text: "The guard, and where it has to live", sub: "Shared state" },
    { t: "code", lang: "python", title: "A hop budget",
      code: 'def billing_agent(state):\n    if state["hops"] >= 2:\n        return {"messages": [AIMessage(content="Escalating to a human.",\n                                        name="billing")],\n                "trace": ["billing: hop budget spent, escalating"]}\n    return Command(goto="tech", update={"hops": 1, ...})',
      out: "    billing -> tech\n    tech -> billing\n    billing: hop budget spent, escalating\n\n  hops: 2",
      caption: "The budget is in the state, not in an agent." },
    { t: "callout", kind: "warn", title: "It cannot be per-agent", body: [
      { t: "p", text: "No single agent knows how many hops have happened \u2014 an agent counting its own handoffs cannot see the other's. So the counter has to be in the **shared state**, which every agent increments and every agent reads." },
      { t: "p", text: "And the escalation path is the swarm's give-up node (11.3): without it, exhausting the budget is an exception rather than an answer. Here it escalates to a human, which is both a usable outcome and the right one \u2014 two agents that cannot place a request is exactly the case a person should see." }
    ] },
    { t: "h2", n: "04", id: "compare", text: "Swarm against supervisor", sub: "Five dimensions" },
    { t: "table", head: ["", "supervisor", "swarm"], rows: [
      ["who decides", "one central agent", "each agent, for itself"],
      ["model calls per turn", "2 (supervisor + worker)", "**1** (the agent)"],
      ["policy point", "the supervisor", "**nowhere central**"],
      ["topology visible", "yes, in the edges", "no \u2014 inside node bodies"],
      ["characteristic bug", "never finishing", "mutual handoff loop"]
    ] },
    { t: "callout", kind: "tradeoff", title: "The policy row decides it for most production systems", body: [
      { t: "p", text: "The model-call column is the swarm's genuine advantage \u2014 no coordination turn. The topology column is 8.8's warning: `Command` destinations do not appear in the drawing unless each node is annotated with its possible targets." },
      { t: "p", text: "But *policy point: nowhere central* is the one that usually settles it. A permission check, a budget check or an approval gate needs somewhere to live, and a swarm has no such place \u2014 so **each agent** has to implement it, consistently, forever. That is a duplication problem that grows with the agent count." }
    ] },
    { t: "exercise", kind: "build", title: "Build a swarm and find its loop",
      difficulty: "advanced", minutes: 32,
      body: "Build two agents that hand off to each other with Command, carrying the reason, and show a successful handoff. Then make each agent hand off to the other unconditionally and run it against a low recursion limit. Explain why neither agent is at fault. Add a hop budget and an escalation path, and explain why the budget cannot live in an agent. Finally compare swarm against supervisor on who decides, model calls, policy, topology visibility and the characteristic bug.",
      requirements: ["Implement peer-to-peer handoff with Command carrying a reason",
        "Show a successful handoff and the hop count",
        "Create the mutual handoff loop and report what stops it",
        "Explain why neither agent is broken",
        "Add a hop budget in shared state and an escalation path",
        "Explain why the budget cannot be per-agent",
        "Compare swarm and supervisor on at least five dimensions"],
      hint: "After building the loop, ask which agent you would fix. Neither is wrong, which is the point.",
      solution: { lang: "python", title: "x1203.py \u2014 the loop, and the shared-state budget",
        code: 'def b2_agent(state):\n    return Command(goto="tech", update={"hops": 1, ...})\n\ndef t2_agent(state):\n    return Command(goto="billing", update={"hops": 1, ...})\n# -> GraphRecursionError\n\n# the budget must be in SHARED state\ndef b3_agent(state):\n    if state["hops"] >= 2:\n        return {"messages": [AIMessage(content="Escalating to a human.",\n                                        name="billing")], ...}\n    return Command(goto="tech", update={"hops": 1, ...})',
        out: "==============================================================================\nPART 1 -- peer-to-peer handoff with Command\n==============================================================================\n  no supervisor. each agent decides whether to answer or to hand\n  off, and the handoff is a Command (8.8) carrying the reason.\n\n    billing -> tech (not my area)\n    tech answered\n\n  hops: 1\n\n  no central router, and the reason travelled with the destination --\n  which 8.8 said is exactly what Command is for.\n==============================================================================\nPART 2 -- the loop two agents can get into\n==============================================================================\n  each thinks the other should handle it:\n\n    recursion_limit=8: RAISED GraphRecursionError: Recursion limit of 8 reached without hitting a st\n\n  that is the swarm's characteristic failure, and note what it is\n  NOT: neither agent is broken. each one is correctly declining a\n  request outside its area. the loop is a property of the PAIR.\n==============================================================================\nPART 3 -- the guard: a hop budget in the state\n==============================================================================\n    billing -> tech\n    tech -> billing\n    billing: hop budget spent, escalating\n\n  hops: 2\n\n  the budget has to live in the SHARED STATE, because no single\n  agent knows how many hops have happened. an agent counting its own\n  handoffs cannot see the other's.\n\n  and the escalation path is the swarm's give-up node (11.3): without\n  it, exhausting the budget is an exception rather than an answer.\n==============================================================================\nPART 4 -- swarm against supervisor\n==============================================================================\n                      supervisor            swarm\n  who decides         one central agent     each agent, for itself\n  model calls/turn    2 (sup + worker)      1 (the agent)\n  policy point        the supervisor        nowhere central\n  topology visible    yes, in the edges     no -- inside node bodies\n  characteristic bug  never finishing       mutual handoff loop\n\n  the model-call column is the swarm's real advantage: no\n  coordination turn. the topology column is its real cost -- 8.8's\n  warning, since Command destinations do not appear in the drawing\n  unless each node is annotated with its possible targets.\n\n  and 'policy point: nowhere central' is the one that decides it for\n  most production systems. a permission check, a budget check or an\n  approval gate needs somewhere to live, and a swarm has no such\n  place -- so each agent has to implement it, consistently, forever.",
        notes: [
          { t: "p", text: "**A swarm has no supervisor**, so no coordination turn \u2014 one model call per step rather than two." },
          { t: "p", text: "**The handoff is a `Command` carrying the reason with the destination**, which is 8.8's case exactly." },
          { t: "p", text: "**Two agents handing to each other ran until `GraphRecursionError`.**" },
          { t: "p", text: "**And neither agent is broken** \u2014 each correctly declines a request outside its area, so reviewing either in isolation finds nothing." },
          { t: "p", text: "**The loop is a property of the pair**, which is 12.1's \u2018complexity moves into the handoffs\u2019 made concrete." },
          { t: "p", text: "**The hop budget must live in shared state**, because an agent counting its own handoffs cannot see the other's." },
          { t: "p", text: "**And the escalation path is the swarm's give-up node** \u2014 two agents that cannot place a request is exactly the case a human should see." },
          { t: "p", text: "**The swarm's advantage is the missing coordination turn**; its costs are an invisible topology (8.8) and no central place for policy." },
          { t: "p", text: "**Which usually settles it**: a permission check, budget check or approval gate has nowhere to live, so every agent implements it forever." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the handoff loop nobody could assign", body: [
      { t: "p", text: "A support swarm has billing, technical and account agents. A class of request \u2014 a charge for an API overage \u2014 bounces between billing and technical until the recursion limit. Each team reviews its own agent's prompt and concludes it is behaving correctly, which it is." },
      { t: "p", text: "The request genuinely sits between two agents' areas, and each is right that it is not squarely theirs. There is no agent to fix, and no prompt change to either one resolves it without making that agent wrong about something else." },
      { t: "p", text: "Three things help, in order. A hop budget in shared state with an escalation path, so the failure becomes a human handoff rather than an exception \u2014 and ambiguous requests reaching a person is the correct outcome. Recording the handoff chain with reasons, so the pattern is visible as a class rather than individual incidents. And then the actual fix, which is a product decision rather than a prompt one: someone has to own overage charges. The system cannot resolve an ambiguity the organisation has not." }
    ] }
  ],
  takeaways: [
    "**A swarm has no supervisor**, so no coordination turn \u2014 one model call per step.",
    "**The handoff is a `Command` carrying the reason with the destination** (8.8).",
    "**Two agents handing to each other ran until `GraphRecursionError`.**",
    "**And neither agent is broken** \u2014 each correctly declines a request outside its area.",
    "**The loop is a property of the pair**, living entirely in the gap between correct components.",
    "**So reviewing either agent in isolation finds nothing.**",
    "**The hop budget must live in shared state**, since an agent cannot see the other's handoffs.",
    "**The escalation path is the swarm's give-up node** (11.3).",
    "**And escalating an ambiguous request to a human is the correct outcome**, not a fallback.",
    "**The swarm's advantage: no coordination turn.**",
    "**Its costs: an invisible topology (8.8) and no central place for policy.**",
    "**Which usually settles it** \u2014 permission, budget and approval checks need somewhere to live.",
    "**Otherwise every agent implements them, consistently, forever.**",
    "**Record the handoff chain with reasons**, so a pattern is visible as a class.",
    "**And a system cannot resolve an ambiguity the organisation has not.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Two agents hand off to each other until the recursion limit. Which agent should you fix?",
      options: ["Whichever one initiated the first handoff",
        "Neither \u2014 each correctly declines a request outside its area; the loop is a property of the pair",
        "Both, by making their prompts more decisive",
        "The one whose domain is broader"],
      answer: 1,
      why: "Each agent's behaviour is individually correct, so reviewing either in isolation finds nothing wrong and no prompt change fixes it without making that agent wrong about something else. The failure lives in the gap between two correct components, which is the concrete form of the complexity moving into the handoffs when you split an agent." },
    { stem: "Where must a swarm's hop budget live?",
      options: ["In each agent, counting its own handoffs",
        "In the shared state, because no single agent can see the other's handoffs",
        "In the recursion limit",
        "In the checkpointer's metadata"],
      answer: 1,
      why: "An agent that counts only its own handoffs is blind to its peer's, so two agents each permitting three handoffs allow six. The counter has to be a shared state key that every agent increments and reads. And it needs an escalation path alongside it, or exhausting the budget is an exception rather than an answer." },
    { stem: "What is the swarm's main disadvantage against a supervisor?",
      options: ["It uses more model calls per step",
        "It has no central place for policy \u2014 permission checks, budget checks and approval gates must be implemented in every agent",
        "It cannot share state between agents",
        "It cannot escalate to a human"],
      answer: 1,
      why: "A swarm actually uses fewer model calls, since there is no coordination turn. What it gives up is the decision point between steps, which is where a permission check, a spend check or an approval gate naturally lives. Without it each agent must implement them consistently \u2014 a duplication burden that grows with the agent count." },
    { stem: "A request bounces between two agents because it genuinely sits between their areas. What is the real fix?",
      options: ["Merge the two agents into one",
        "A hop budget with human escalation, plus a product decision about who owns that request type",
        "Give both agents all the tools",
        "Increase the recursion limit so it eventually resolves"],
      answer: 1,
      why: "The budget and escalation make the failure a usable outcome rather than an exception, and routing an ambiguous request to a person is correct rather than a fallback. But the underlying ambiguity is organisational: if nobody owns overage charges, no prompt makes an agent confidently own them. The system cannot resolve an ambiguity the organisation has not." }
  ] },
  interview: { title: "Interview practice", sub: "Swarm and handoffs", questions: [
    { level: "core", q: "What is a swarm architecture and what does it trade?",
      strong: "A strong answer names the missing coordination turn and the missing policy point.",
      answer: [
        { t: "p", text: "Peer-to-peer handoff with no supervisor. Each agent decides for itself whether to answer or to transfer, and the transfer is a Command carrying the destination and the reason together." },
        { t: "p", text: "What it buys is the coordination turn. A supervisor costs a model call per step that does no work \u2014 I measured five calls against three for the same task \u2014 and a swarm has one call per step instead of two." },
        { t: "p", text: "What it gives up is more important in most production systems: there is nowhere central to put policy. A permission check, a budget check, an approval gate before an acting agent \u2014 all of those need somewhere to live, and in a swarm every agent has to implement them, consistently, forever. That burden grows with the agent count." },
        { t: "p", text: "It also gives up the visible topology. Command destinations live inside node bodies, so the drawn graph shows disconnected nodes unless each one is annotated with its possible targets \u2014 and the drawing is the fastest way into an unfamiliar system." }
      ] },
    { level: "advanced", q: "What is the characteristic failure of a swarm, and how do you fix it?",
      strong: "A strong answer notes neither agent is wrong.",
      answer: [
        { t: "p", text: "Two agents handing off to each other until the recursion limit, and the striking thing is that neither agent is broken." },
        { t: "p", text: "Each one is correctly declining a request outside its area. I built it and watched it run to GraphRecursionError, and if you review either agent in isolation you find nothing wrong \u2014 no bad prompt, no logic error. The loop is a property of the pair." },
        { t: "p", text: "Which is the concrete version of the complexity moving into the handoffs when you split an agent. The failure lives entirely in the gap between two correct components, where no single agent owns it." },
        { t: "p", text: "The guard is a hop budget in the shared state, and it has to be shared \u2014 an agent counting its own handoffs cannot see its peer's, so two agents each allowing three would permit six. Plus an escalation path, because exhausting the budget should be an answer rather than an exception. Escalating an ambiguous request to a human is the right outcome, not a fallback." },
        { t: "p", text: "And then the actual fix is usually organisational. I have seen a class of request bounce between billing and technical because it genuinely sat between them \u2014 and no prompt change resolves that without making one agent wrong. Someone has to own that request type. The system cannot resolve an ambiguity the organisation has not." }
      ] },
    { level: "core", q: "Would you choose a swarm for a production system?",
      strong: "A strong answer weighs the missing policy point heavily.",
      answer: [
        { t: "p", text: "Rarely, and the deciding factor is usually that there is nowhere central to put policy." },
        { t: "p", text: "The attraction is real: one model call per step instead of two, since there is no coordination turn. On a long conversation that is a meaningful saving." },
        { t: "p", text: "But a production system almost always accumulates checks that belong between steps. May this agent run for this user. Has this request spent enough. Pause before the agent that acts. In a swarm each agent has to implement those, consistently, and every new agent is another place to get them wrong." },
        { t: "p", text: "There is also the characteristic failure, which I would want a guard for anyway \u2014 a hop budget in shared state plus escalation. Once I have added that, I have a piece of shared coordination logic and most of a supervisor's value without its structure." },
        { t: "p", text: "Where I would use a swarm is a small fixed set of peer agents with no policy between them and genuinely symmetric handoffs \u2014 a triage front end over three specialists, say. And I would annotate every Command-returning node with its possible destinations, or the drawn graph shows nothing." }
      ] }
  ] }
});
