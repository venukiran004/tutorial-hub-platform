EC.receiveLesson({
  id: "11.3",
  lede: "ReAct is 9.1's agent loop with the **reasoning made explicit in the message history** \u2014 and that is the whole mechanism, not a separate feature. The first `AIMessage` carries both content (*\u201cI should look up the refund policy first\u201d*) and a tool call, so the next model call sees what the previous turn was thinking. Which means the reasoning **costs tokens on every subsequent call** and is the first thing 9.5's trimming will remove. The loop guards are not optional: with a model that never stops asking, a three-step budget in the router plus a `give_up` **node** produced a usable answer rather than an exception \u2014 and that node is what turns *\u201cthe agent failed\u201d* into a response you can show a user.",
  objectives: [
    "Describe the reason-act-observe-repeat cycle",
    "Explain where the reasoning actually lives and what it costs",
    "Design the state schema and say what does not belong in it",
    "Add a step budget and a give-up node",
    "Say what ReAct is good and bad at"
  ],
  prerequisites: ["9.1", "10.5"],
  blocks: [
    { t: "h2", n: "01", id: "cycle", text: "Reason, act, observe, repeat", sub: "And the reasoning is content" },
    { t: "code", lang: "text", title: "One cycle",
      code: "HumanMessage('refund policy?')\nAIMessage(tool_calls=['lookup_policy'])        <- content: 'I should look up\n                                                  the refund policy first.'\nToolMessage('Refunds are available within 30 days of purchase.')\nAIMessage('The policy says 30 days, which answers the question.')",
      caption: "The first `AIMessage` has **both** content and a tool call." },
    { t: "callout", kind: "insight", title: "The reasoning is not a separate mechanism", body: [
      { t: "p", text: "It is content in the message list, and it stays there \u2014 so the next model call sees what the previous turn was thinking. That is the entire difference between ReAct and a bare tool-calling loop." },
      { t: "p", text: "Which has a cost: the reasoning text is carried on **every** subsequent call, so a long ReAct run pays for its own earlier thoughts repeatedly. It is also the first thing 9.5's trimming will remove, which quietly turns ReAct back into a bare loop." }
    ] },
    { t: "code", lang: "text", title: "What the model saw on each call",
      code: "call 1 received 1 message(s)\ncall 2 received 3 message(s):\n  HumanMessage('refund policy?')\n  AIMessage(tool_calls=['lookup_policy'])\n  ToolMessage('Refunds are available within 30 days of purchase.')",
      caption: "9.1's growing list, now carrying reasoning as well as results." },
    { t: "h2", n: "02", id: "schema", text: "The state schema", sub: "And what does not belong in it" },
    { t: "code", lang: "python", title: "Two keys",
      code: 'class ReActState(TypedDict):\n    messages: Annotated[List[BaseMessage], add_messages]\n    steps: Annotated[int, operator.add]',
      caption: "Messages because the loop is the list; a counter because the router needs it." },
    { t: "callout", kind: "warn", title: "No `current_tool` or `last_result` key", body: [
      { t: "p", text: "The message list already holds both. Duplicating them gives you **two sources of truth that can disagree**, and the message list is the one the model actually reads." },
      { t: "p", text: "8.8's tell applies too: a key that exists only so a router can read back what a node already knew is a `Command` waiting to happen. The step counter is different \u2014 it is genuinely a property of the run that no single node knows." }
    ] },
    { t: "h2", n: "03", id: "guards", text: "The loop guards", sub: "And the give-up node" },
    { t: "code", lang: "python", title: "A budget in the router",
      code: 'def guarded(state):\n    if state["steps"] >= 3:\n        return "give_up"\n    return tools_condition(state)',
      out: "  a model that never stops asking, with a 3-step budget:\n    steps taken: 3\n    last message: AIMessage('I could not complete this in 3 steps.')",
      caption: "The graph **returned** rather than raising." },
    { t: "callout", kind: "good", title: "The give-up node is what makes failure usable", body: [
      { t: "p", text: "The budget being in the router means the graph returns rather than hitting the recursion limit (8.9, 10.5). But the `give_up` **node** is what matters more than it looks: it turns *\u201cthe agent failed\u201d* into a response a caller can show a user." },
      { t: "p", text: "Without it, exhaustion is a `GraphRecursionError` \u2014 which means the caller gets an exception, the user gets a 500, and nothing distinguishes a hard task from a broken one. With it, the system has an answer: *\u201cI could not complete this in three steps.\u201d*" }
    ] },
    { t: "p", text: "Note also that `guarded` wraps `tools_condition` rather than replacing it \u2014 which is 9.2's unrolling done minimally. You keep the prebuilt's logic and add exactly the one thing it has no notion of." },
    { t: "h2", n: "04", id: "goodat", text: "What ReAct is good at", sub: "And bad at" },
    { t: "table", head: ["good at", "bad at"], rows: [
      ["the next action genuinely depends on the last result", "anything a router does \u2014 one classification is cheaper and cannot loop"],
      ["exploration: searching, diagnosing, following a trail", "long plans \u2014 the model re-decides from scratch every turn, so it has no commitment to a strategy"],
      ["recovering from a tool failure by trying something else", "predictable cost \u2014 the step count is model output"]
    ] },
    { t: "callout", kind: "mental", title: "ReAct is right when the unpredictability is in the task", body: [
      { t: "p", text: "Not in your design. If you can draw the sequence, draw it \u2014 and that is 11.1's test restated: the loop earns its cost only when the next action depends on the last result in a way you cannot enumerate." },
      { t: "p", text: "The no-commitment property is the one that surprises people. ReAct re-decides everything every turn, which is why it recovers well from a failed tool and why it wanders on a six-step task \u2014 and it is exactly what 11.6's plan-and-execute fixes." }
    ] },
    { t: "diagram", kind: "steps", title: "The reasoning IS the message history",
      caption: "ReAct is 9.1's loop with the reasoning made explicit — and that is the whole mechanism, not a separate feature. The first `AIMessage` carries **both** content and `tool_calls`, which is why dropping that content removes the pattern and leaves the loop (13.6).",
      items: [
        { label: "AIMessage(content + tool_calls)", desc: "“I should look up the order” AND the call itself, in one message", tone: "violet", code: "the thought" },
        { label: "ToolMessage(result)", desc: "the observation, matched by tool_call_id", tone: "warn", code: "the observation" },
        { label: "the model reads BOTH next turn", desc: "its own stated intent plus what came back — that is the reasoning trace", tone: "accent", code: "the loop" },
        { label: "so a window that drops content breaks it", desc: "the observations are the bulky part, so a window keeps the JSON and evicts the intent", tone: "crit", code: "13.6" }
      ] },
    { t: "exercise", kind: "build", title: "Build ReAct and guard it",
      difficulty: "core", minutes: 34,
      body: "Build a ReAct agent with a scripted model whose first message carries both reasoning content and a tool call, and show the full message history. Report what the model received on each call and say where the reasoning lives. Design the state schema and say what does not belong in it. Then add a step budget to the router and a give-up node, run it against a model that never stops asking, and show that the graph returns a usable answer. Finally say what ReAct is good and bad at.",
      requirements: ["Build a ReAct loop with reasoning content in the AIMessage",
        "Show the full message history",
        "Report what the model received on each call",
        "Explain where the reasoning lives and what it costs",
        "Give the state schema and say what does not belong",
        "Add a step budget to the router and a give-up node",
        "Show the graph returning rather than raising",
        "Say what ReAct is good and bad at"],
      hint: "Put content AND a tool call in the same AIMessage, then look at what the second call received. The reasoning is just history.",
      solution: { lang: "python", title: "x1103.py \u2014 a budget and a give-up node",
        code: 'script = [\n    AIMessage(content="I should look up the refund policy first.",\n              tool_calls=[{"name": "lookup_policy",\n                           "args": {"topic": "refunds"}, "id": "c1"}]),\n    AIMessage(content="The policy says 30 days, which answers the question."),\n]\n\n# the guard wraps tools_condition rather than replacing it\ndef guarded(state):\n    if state["steps"] >= 3:\n        return "give_up"\n    return tools_condition(state)\n\ng2.add_conditional_edges("agent", guarded,\n                         {"tools": "tools", "give_up": "give_up", END: END})',
        out: "==============================================================================\nPART 1 -- reason, act, observe, repeat\n==============================================================================\n  ReAct is the agent loop from 9.1 with the REASONING made explicit\n  in the message history:\n\n    reason   the model says what it intends and why\n    act      it emits a tool call\n    observe  the tool result returns as a ToolMessage\n    repeat   the model sees all of it and decides again\n\n    HumanMessage('refund policy?')\n    AIMessage(tool_calls=['lookup_policy'])\n    ToolMessage('Refunds are available within 30 days of purc')\n    AIMessage('The policy says 30 days, which answers the q')\n\n  note the first AIMessage has BOTH content and a tool call. the\n  content is the reasoning, and it stays in the history -- so the\n  next model call sees what the previous turn was thinking.\n==============================================================================\nPART 2 -- what the model saw on each call\n==============================================================================\n  call 1 received 1 message(s):\n    HumanMessage('refund policy?')\n  call 2 received 3 message(s):\n    HumanMessage('refund policy?')\n    AIMessage(tool_calls=['lookup_policy'])\n    ToolMessage('Refunds are available within 30 days of purc')\n\n  so the 'reasoning' is not a separate mechanism -- it is content in\n  the message list. which means it costs tokens on every subsequent\n  call, and it is the thing trimming (9.5) will remove first.\n==============================================================================\nPART 3 -- the state schema, and what belongs in it\n==============================================================================\n    class ReActState(TypedDict):\n        messages: Annotated[List[BaseMessage], add_messages]\n        steps: Annotated[int, operator.add]\n\n  messages with add_messages, because the loop IS the accumulating\n  list (9.1). and a step counter, because the router needs it.\n\n  what does NOT belong: a 'current_tool' or 'last_result' key. the\n  message list already holds both, and duplicating them gives you\n  two sources of truth that can disagree.\n==============================================================================\nPART 4 -- the loop guards, which are not optional\n==============================================================================\n  a model that never stops asking, with a 3-step budget:\n    steps taken: 3\n    last message: AIMessage('I could not complete this in 3 steps.')\n\n  the budget is in the ROUTER and 'give_up' is a real node, so the\n  graph returns a usable answer rather than raising (8.9, 10.5).\n\n  and the give_up node matters more than it looks: it is what turns\n  'the agent failed' into a response the caller can show a user.\n==============================================================================\nPART 5 -- what ReAct is actually good at\n==============================================================================\n  good at:\n    - tasks where the next action genuinely depends on the last\n      result and you cannot enumerate the sequence\n    - exploration: searching, diagnosing, following a trail\n    - recovering from a tool failure by trying something else\n\n  bad at:\n    - anything a router does. one classification is cheaper and\n      cannot loop.\n    - long plans. the model re-decides from scratch every turn, so\n      it has no commitment to a strategy -- which is what\n      plan-and-execute (11.6) fixes.\n    - predictable cost. the step count is model output.\n\n  the honest summary: ReAct is the right pattern when the\n  UNPREDICTABILITY is in the task rather than in your design. if you\n  can draw the sequence, draw it.",
        notes: [
          { t: "p", text: "**The first `AIMessage` carries both reasoning content and a tool call**, and the content stays in the history." },
          { t: "p", text: "**So the reasoning is not a separate mechanism** \u2014 it is content in the message list, which the next call reads." },
          { t: "p", text: "**Which means it costs tokens on every subsequent call**, and is the first thing 9.5's trimming removes \u2014 quietly turning ReAct back into a bare loop." },
          { t: "p", text: "**The schema is messages plus a step counter.** No `current_tool` or `last_result` key: the message list holds both, and duplicating gives two sources of truth that can disagree." },
          { t: "p", text: "**The budget goes in the router**, so the graph returns rather than hitting the recursion limit." },
          { t: "p", text: "**And `guarded` wraps `tools_condition` rather than replacing it** \u2014 9.2's unrolling done minimally." },
          { t: "p", text: "**The `give_up` node is what makes failure usable**: without it, exhaustion is an exception and the user gets a 500." },
          { t: "p", text: "**ReAct is right when the unpredictability is in the task, not the design.** It re-decides every turn, which is why it recovers from failures and wanders on long plans \u2014 what 11.6 fixes." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that got worse after a trimming fix", body: [
      { t: "p", text: "A ReAct agent is hitting context limits on long runs. The team adds a trimming node that keeps the last four messages. Context errors stop, and the agent begins repeating tool calls it has already made and taking more steps to finish." },
      { t: "p", text: "The trim is dropping the earlier `AIMessage` content \u2014 the reasoning \u2014 along with older tool results. ReAct's whole mechanism is that the model can see what previous turns were thinking, so trimming it removes the pattern while leaving the loop. The agent is now re-deriving its intent every turn from whatever four messages survive." },
      { t: "p", text: "The structural fix is to trim selectively: keep the original question and a summary of earlier reasoning, and drop the bulky tool observations instead \u2014 which are usually the large part anyway. That is what `add_messages`' id-based replacement is for (8.3): replace a run of old messages with one summary rather than dropping them. The general point is that in ReAct the reasoning is data the pattern depends on, so a trimming policy that treats all messages as interchangeable will remove the thing that was working." }
    ] }
  ],
  takeaways: [
    "**ReAct is 9.1's loop with the reasoning made explicit in the message history.**",
    "**The first `AIMessage` carries both content and a tool call**, and the content stays.",
    "**So the reasoning is content, not a separate mechanism.**",
    "**Which means it costs tokens on every subsequent call.**",
    "**And it is the first thing trimming removes**, quietly turning ReAct back into a bare loop.",
    "**The schema is messages plus a step counter** \u2014 nothing else.",
    "**No `current_tool` or `last_result`**: the message list holds both, and duplicating creates disagreement.",
    "**The budget goes in the router**, so the graph returns rather than hitting the recursion limit.",
    "**Wrap `tools_condition` rather than replacing it** \u2014 minimal unrolling (9.2).",
    "**The `give_up` node makes failure usable** \u2014 a response rather than a 500.",
    "**Good at: dependent next actions, exploration, recovering from a tool failure.**",
    "**Bad at: anything a router does, long plans, and predictable cost.**",
    "**It re-decides every turn**, which is why it recovers well and wanders on long tasks.",
    "**ReAct is right when the unpredictability is in the task, not the design.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Where does ReAct's reasoning live?",
      options: ["In a dedicated state key the router reads",
        "In the content of the AIMessage that also carries the tool call \u2014 it is message history",
        "In the tool node's output alongside the result",
        "In a scratchpad the framework maintains separately"],
      answer: 1,
      why: "The model emits content and a tool call in the same message, and the content persists in the list. That is the whole mechanism: the next call sees what the previous turn intended. It also means the reasoning is carried on every subsequent call, so it costs tokens repeatedly \u2014 and it is the first thing an undiscriminating trimming policy removes." },
    { stem: "What does NOT belong in a ReAct state schema?",
      options: ["A step counter for the router",
        "A last_result key \u2014 the message list already holds it, giving two sources of truth",
        "The message list with add_messages",
        "Anything beyond the two above"],
      answer: 1,
      why: "The tool's result is already in the history as a ToolMessage, and that is the copy the model actually reads. A duplicate key can disagree with it, and nothing resolves the conflict. The step counter is different: it is a property of the run that no individual node knows, which is exactly what state is for." },
    { stem: "Why does a give_up node matter more than just putting a budget in the router?",
      options: ["It prevents the recursion limit from firing",
        "It turns exhaustion into a response the caller can show a user, rather than an exception",
        "It records which exit fired for monitoring",
        "It allows the agent to retry with a larger budget"],
      answer: 1,
      why: "A budget in the router means the graph stops; a give-up node means it stops with something to say. Without it the caller receives an error and the user receives a 500, and nothing distinguishes a genuinely hard request from a broken system. With it, 'I could not complete this in three steps' is a result the product can handle." },
    { stem: "An agent starts repeating tool calls after a trimming node is added. Why?",
      options: ["The trim broke the tool_call_id pairing",
        "The trim dropped the earlier reasoning content, so the model re-derives its intent each turn",
        "Trimming invalidates the checkpointer's history",
        "The step counter was reset by the trim"],
      answer: 1,
      why: "ReAct depends on the model seeing what previous turns were thinking, and that reasoning is ordinary message content. A policy that keeps the last N messages treats it as interchangeable with tool observations and removes it first. Trimming selectively \u2014 summarising earlier reasoning and dropping bulky tool results \u2014 preserves the pattern, which is what id-based message replacement exists for." }
  ] },
  interview: { title: "Interview practice", sub: "ReAct", questions: [
    { level: "core", q: "What distinguishes ReAct from a plain tool-calling loop?",
      strong: "A strong answer says the reasoning is message content.",
      answer: [
        { t: "p", text: "The reasoning is explicit in the message history. The model emits content saying what it intends and why, in the same message as the tool call, and that content stays in the list." },
        { t: "p", text: "So the next model call sees not just the tool result but what the previous turn was trying to do. That is the entire difference \u2014 it is not a separate mechanism, it is content." },
        { t: "p", text: "Which has a cost worth being aware of: the reasoning is carried on every subsequent call, so a long run pays for its own earlier thoughts repeatedly. And it is the first thing a naive trimming policy removes, which quietly turns ReAct back into a bare loop. I have seen an agent start repeating tool calls after someone added a keep-the-last-four-messages trim." },
        { t: "p", text: "So if I am trimming a ReAct agent, I would summarise the earlier reasoning rather than drop it, and drop the bulky tool observations instead \u2014 which are usually the large part anyway." }
      ] },
    { level: "advanced", q: "How would you make a ReAct agent production-ready?",
      strong: "A strong answer adds a budget, a give-up node, and keeps the schema small.",
      answer: [
        { t: "p", text: "Three things, and the third is the one people skip." },
        { t: "p", text: "A step budget in the router, read from a counter in the state. That makes the graph return rather than hit the recursion limit, which matters because an exception as the normal failure path means you cannot distinguish a hard task from a runaway. I would wrap tools_condition rather than replace it, so I keep the prebuilt's logic and add only the thing it has no notion of." },
        { t: "p", text: "A progress check alongside it, because a budget bounds the iterations and notices nothing about whether anything is advancing. An agent making the same tool call repeatedly will burn the full budget." },
        { t: "p", text: "And a give-up node, which is the one that gets omitted. A budget means the graph stops; a give-up node means it stops with something to say. Without it the caller gets an exception and the user gets a 500, and 'this request was genuinely hard' is indistinguishable from 'the system is broken'." },
        { t: "p", text: "Beyond that I would keep the schema to messages and a counter. No last_result or current_tool keys \u2014 the message list already holds those and is the copy the model reads, so a duplicate is a second source of truth that can disagree with it." }
      ] },
    { level: "core", q: "What tools would you give a ReAct agent?",
      strong: "A strong answer bounds the toolset and designs the descriptions.",
      answer: [
        { t: "p", text: "Few, narrow, and each one obviously distinct from the others \u2014 because the model chooses between them from their descriptions alone, and similar tools produce wrong choices." },
        { t: "p", text: "Few, because every tool is in the prompt on every call. A dozen tools is a large fixed token cost per turn, multiplied by the turn count, and it also makes the choice harder rather than richer." },
        { t: "p", text: "Narrow, because a tool that does several things needs arguments the model has to get right, and each argument is a failure mode. Two tools with no arguments beat one tool with a mode flag." },
        { t: "p", text: "Distinct, because the model's only information is the description. If two tools could plausibly serve the same request, it will sometimes pick the wrong one \u2014 and that failure looks like a reasoning failure when it is a naming problem." },
        { t: "p", text: "I would also think about what a tool returns. A tool returning a large blob puts that blob in the message history for every subsequent turn, so it is paid repeatedly. Returning a summary with an id to fetch detail is often better." },
        { t: "p", text: "And none of them should do anything irreversible without an approval gate, because an agent chooses its own actions and the step count is model output." }
      ] }
  ] }
});
