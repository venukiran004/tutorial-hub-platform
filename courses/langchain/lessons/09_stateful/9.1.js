EC.receiveLesson({
  id: "9.1",
  lede: "3.3's agent was a loop you could not see inside. Here it is as a graph, and the whole thing is two nodes plus a conditional edge \u2014 with the `tools \u2192 agent` edge being the cycle a chain could not express (8.1). What the trace shows is that the loop works by **growing the message list**: call one received 1 message, call two received 3, and the tool result reached the model as a `ToolMessage` in the history rather than as an argument. Which is why `add_messages` is the right reducer here \u2014 the agent loop is literally an accumulating list. And the termination condition is the router, so **the model decides when the loop ends**.",
  objectives: [
    "Build the agent loop as a two-node graph",
    "Explain how a tool result reaches the model",
    "Identify where the termination condition lives",
    "Show what happens when the model never stops asking",
    "Say why the long form is worth seeing before the prebuilts"
  ],
  prerequisites: ["8.7", "3.3"],
  blocks: [
    { t: "h2", n: "01", id: "shape", text: "Two nodes and a conditional edge", sub: "That is the whole agent" },
    { t: "code", lang: "python", title: "The loop, written out",
      code: 'def agent(state):\n    return {"messages": [bound.invoke(state["messages"])]}\n\ndef tool_node(state):\n    last = state["messages"][-1]\n    out = []\n    for call in last.tool_calls:\n        result = by_name[call["name"]].invoke(call["args"])\n        out.append(ToolMessage(content=str(result), tool_call_id=call["id"]))\n    return {"messages": out}\n\ndef should_continue(state):\n    return "tools" if getattr(state["messages"][-1], "tool_calls", None) else END\n\ng.add_edge(START, "agent")\ng.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})\ng.add_edge("tools", "agent")      # <- the cycle',
      out: "    HumanMessage('what is the refund policy')\n    AIMessage(tool_calls=['lookup_policy'])\n    ToolMessage('Refunds are available within 30 days of purchase.')\n    AIMessage('Refunds are available within 30 days of purchase.')",
      caption: "The `tools \u2192 agent` edge is the thing 8.1 showed a chain cannot express." },
    { t: "h2", n: "02", id: "grows", text: "The loop works by growing the message list", sub: "Measured on each call" },
    { t: "code", lang: "text", title: "What the model received",
      code: "call 1 received 1 message(s):\n  HumanMessage('what is the refund policy')\n\ncall 2 received 3 message(s):\n  HumanMessage('what is the refund policy')\n  AIMessage(tool_calls=['lookup_policy'])\n  ToolMessage('Refunds are available within 30 days of purchase.')",
      caption: "The tool result arrived as a message in the history." },
    { t: "callout", kind: "insight", title: "Which is why `add_messages` is the reducer", body: [
      { t: "p", text: "The tool result does not reach the model as an argument or a return value \u2014 it is appended to the conversation as a `ToolMessage`, and the model reads it there. So the agent loop is an accumulating list by construction." },
      { t: "p", text: "8.3's warning applies directly: with no reducer, each node's update would replace the list and the model would see only the most recent message. The agent would call a tool, lose the question, and loop forever. That is the single mistake most likely to break an agent built from scratch." }
    ] },
    { t: "h2", n: "03", id: "termination", text: "The model decides when to stop", sub: "And that is the risk" },
    { t: "p", text: "`should_continue` returns `END` when the model stops asking for tools. So the termination condition is the model's judgement, which is the whole idea of an agent and also 8.9's problem: if the model never stops asking, only the recursion limit does." },
    { t: "code", lang: "text", title: "A model that always asks for a tool",
      code: "recursion_limit=8:\n  RAISED GraphRecursionError: Recursion limit of 8 reached without\n  hitting a stop condition.",
      caption: "With the default limit of 10007 that would be thousands of model calls first." },
    { t: "callout", kind: "warn", title: "A production agent needs a step budget in the state", body: [
      { t: "p", text: "8.9 established that relying on the recursion limit makes an exception your normal failure path, so you cannot distinguish a long legitimate run from a runaway. For an agent that matters more than for a pure-computation graph, because each superstep is a paid model call." },
      { t: "p", text: "The shape is an iteration counter in the state, incremented in the agent node, and a router that returns `END` when it reaches a budget. Then \u201cgave up\u201d is a state you can route on, record and return to the caller \u2014 and the recursion limit catches only the case where that logic itself failed." }
    ] },
    { t: "h2", n: "04", id: "why", text: "Why the long form is worth seeing", sub: "9.2 collapses it to four lines" },
    { t: "p", text: "The prebuilts replace both nodes and the graph becomes four lines of wiring. Worth having written it out once, because every production change is a change to a specific node or edge:" },
    { t: "dl", items: [
      ["the conditional edge", "where a step budget goes"],
      ["the tool node", "where per-tool error handling goes (M14)"],
      ["the agent node", "where a system prompt and message trimming go (9.5)"],
      ["the cycle", "where `interrupt()` goes for approval (9.7)"]
    ] },
    { t: "p", text: "Every one of those is a modification you can only make if you know which node or edge it belongs to. The prebuilts are the right default and they are also an abstraction you will need to open \u2014 so the order is: see the long version, use the short one, unroll when a requirement demands it." },
    { t: "diagram", kind: "flow", title: "The agent loop, as a graph you can see inside", cols: 3,
      caption: "3.3's loop was something you could not inspect. Here it is two nodes plus a conditional edge — and the `tools → agent` edge is the **cycle a chain could not express** (8.1), which is the whole reason this module exists.",
      nodes: [
        { id: "a", label: "agent", sub: "calls the model", tone: "violet" },
        { id: "t", label: "tools", sub: "executes every call", tone: "warn" },
        { id: "e", label: "END", sub: "no tools requested", tone: "good" }
      ],
      edges: [["a", "t", "asked for tools"], ["t", "a", "the cycle", "dashed"], ["a", "e", "answered"]] },
    { t: "exercise", kind: "build", title: "Build the agent loop from two nodes",
      difficulty: "core", minutes: 32,
      body: "Build a tool-calling agent as a graph with an agent node, a tool node and a conditional edge, using a scripted model so the tool call is deterministic. Run it and show every message. Then report what the model received on each call and explain how the tool result reached it. Identify where the termination condition lives, and demonstrate what happens when the model never stops asking for tools. Finally say which production changes belong to which node or edge.",
      requirements: ["Build the loop with two nodes and a conditional edge",
        "Show every message in the completed run",
        "Report how many messages the model received on each call",
        "Explain how the tool result reaches the model and why add_messages is required",
        "Identify where the termination condition lives",
        "Show what happens with a model that always requests a tool",
        "Map at least four production requirements to specific nodes or edges"],
      hint: "Record what the model received on each invocation. The growth of that list is the mechanism of the whole loop.",
      solution: { lang: "python", title: "x0901.py \u2014 call 1 saw 1 message, call 2 saw 3",
        code: 'class AgentState(TypedDict):\n    messages: Annotated[List[BaseMessage], add_messages]\n\nscript = [\n    AIMessage(content="", tool_calls=[{"name": "lookup_policy",\n                                       "args": {"topic": "refunds"}, "id": "c1"}]),\n    AIMessage(content="Refunds are available within 30 days of purchase."),\n]\nmodel = FakeChatModel(script=script)\nbound = model.bind_tools([lookup_policy])\n\ndef should_continue(state):\n    return "tools" if getattr(state["messages"][-1], "tool_calls", None) else END\n\ng.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})\ng.add_edge("tools", "agent")\n\n# and what each model call received\nfor i, seen in enumerate(model.seen):\n    print("call %d received %d message(s)" % (i + 1, len(seen)))',
        out: "==============================================================================\nPART 1 -- the agent loop is two nodes and a conditional edge\n==============================================================================\n  3.3's agent was a loop you could not see inside. here it is as a\n  graph, and the whole thing is:\n\n    agent  -- calls the model\n    tools  -- runs whatever the model asked for\n    a conditional edge: tool calls present -> tools, else -> END\n    a normal edge: tools -> agent\n\n  that last edge is the cycle, and it is the thing a chain could not\n  express (8.1).\n\n  the run, message by message:\n    HumanMessage('what is the refund policy')\n    AIMessage(tool_calls=['lookup_policy'])\n    ToolMessage('Refunds are available within 30 days of purcha')\n    AIMessage('Refunds are available within 30 days of purcha')\n==============================================================================\nPART 2 -- what the model saw on each call\n==============================================================================\n  the loop works by GROWING the message list. each model call sees\n  everything that came before:\n\n    call 1 received 1 message(s):\n      HumanMessage('what is the refund policy')\n    call 2 received 3 message(s):\n      HumanMessage('what is the refund policy')\n      AIMessage(tool_calls=['lookup_policy'])\n      ToolMessage('Refunds are available within 30 days of purcha')\n\n  so the tool result reaches the model as a ToolMessage in the\n  history, not as an argument. that is why add_messages is the right\n  reducer here (8.3) -- the loop is literally an accumulating list.\n==============================================================================\nPART 3 -- the termination condition is the router\n==============================================================================\n  should_continue returns END when the model stops asking for tools.\n  so the model decides when the loop ends, which is the whole idea\n  and also the risk 8.9 warned about: if the model never stops asking,\n  only the recursion limit does.\n\n  a model that always asks for a tool, recursion_limit=8:\n    RAISED GraphRecursionError: Recursion limit of 8 reached without hitting a stop condition. You can increase the limit by setting the `recursion_limit` config key.\nFor troubleshooting, visit: https://docs.langchain.com/oss/python\n\n  so a production agent wants an explicit step budget in the state\n  and a router that ends on it, not the recursion limit (8.9).\n==============================================================================\nPART 4 -- why this shape is worth seeing written out\n==============================================================================\n  9.2 replaces both nodes with prebuilts and the graph becomes four\n  lines. worth having seen the long version once, because:\n\n    - the conditional edge is where a step budget goes\n    - the tool node is where per-tool error handling goes (M14)\n    - the agent node is where a system prompt and message trimming go\n    - the cycle is where interrupt() goes for approval (9.7)\n\n  every one of those is a change to a node or an edge you can only\n  make if you know which one it is.",
        notes: [
          { t: "p", text: "**The agent is two nodes and a conditional edge**, with the `tools -> agent` edge as the cycle 8.1 showed a chain cannot express." },
          { t: "p", text: "**The loop works by growing the message list**: call 1 received 1 message, call 2 received 3." },
          { t: "p", text: "**The tool result reaches the model as a `ToolMessage` in the history**, not as an argument or a return value." },
          { t: "p", text: "**So `add_messages` is required, not optional.** Without a reducer each update would replace the list, the model would lose the question, and the agent would loop forever \u2014 8.3's silent failure, in the place it does the most damage." },
          { t: "p", text: "**The termination condition is the router**, so the model decides when the loop ends \u2014 which is the idea of an agent and also the risk." },
          { t: "p", text: "**A model that always asks for a tool runs until the recursion limit**, and with 8.9's measured default of 10007 that is thousands of paid model calls." },
          { t: "p", text: "**So a production agent needs a step budget in the state** and a router that ends on it, making \u2018gave up\u2019 a state you can route on rather than an exception." },
          { t: "p", text: "**Each production requirement belongs to a specific node or edge**: the budget to the router, error handling to the tool node, prompts and trimming to the agent node, approval to the cycle \u2014 which is why the long form is worth seeing before the prebuilts." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that forgot the question", body: [
      { t: "p", text: "A hand-built agent calls a tool, receives the result, and then calls the same tool again with the same arguments \u2014 forever, until the recursion limit. The tool works. The model is fine." },
      { t: "p", text: "The message key has no reducer, so each node's update replaced the list rather than appending. By the second model call the history contained only the `ToolMessage`, so the model had the answer and not the question \u2014 and with no question to resolve, asking again is a reasonable thing for it to do." },
      { t: "p", text: "The diagnostic is to print what the model received on each call, which shows a list that never grows. The fix is `Annotated[List[BaseMessage], add_messages]`, and the reason this bug is so common is that 8.3's missing reducer is silent on a sequential path \u2014 so every non-looping test passes and the failure only appears once the cycle runs twice." }
    ] }
  ],
  takeaways: [
    "**The agent loop is two nodes and a conditional edge**, plus a `tools \u2192 agent` edge that is the cycle.",
    "**The loop works by growing the message list** \u2014 call 1 saw 1 message, call 2 saw 3.",
    "**The tool result reaches the model as a `ToolMessage` in the history**, not as an argument.",
    "**So `add_messages` is required** \u2014 without it the model loses the question and loops forever.",
    "**And that failure is silent on a non-looping test** (8.3), which is why it is so common.",
    "**The termination condition is the router**, so the model decides when the loop ends.",
    "**A model that always asks for a tool runs to the recursion limit** \u2014 10007 paid calls by default.",
    "**So put a step budget in the state** and route to `END` on it.",
    "**Then \u2018gave up\u2019 is a state you can route on**, not an exception.",
    "**The conditional edge is where a step budget goes.**",
    "**The tool node is where per-tool error handling goes** (M14).",
    "**The agent node is where a system prompt and message trimming go** (9.5).",
    "**The cycle is where `interrupt()` goes for approval** (9.7).",
    "**Which is why the long form is worth seeing before the prebuilts collapse it.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "How does a tool's result reach the model in an agent loop?",
      options: ["As an argument to the next model call",
        "As a ToolMessage appended to the conversation, which the model reads as history",
        "As a separate state key the agent node reads",
        "Through the tool's return value, passed directly"],
      answer: 1,
      why: "The tool node returns a ToolMessage carrying the result and the originating tool_call_id, and the reducer appends it to the message list. The next model call therefore receives the question, the model's tool request and the result as three messages \u2014 measured as 1 message on the first call and 3 on the second. This is why the message key must accumulate." },
    { stem: "An agent calls the same tool repeatedly with identical arguments until the recursion limit. What is the most likely cause?",
      options: ["The tool is returning an error the model cannot parse",
        "The message key has no reducer, so each update replaced the list and the model lost the original question",
        "The conditional edge is wired backwards",
        "The recursion limit is set too low"],
      answer: 1,
      why: "With replacement rather than add_messages, the history contains only the most recent update by the second model call \u2014 so the model holds the tool result without the question that motivated it, and asking again is reasonable behaviour. The bug is silent in any test that does not loop twice, which is what makes it the commonest failure in a hand-built agent." },
    { stem: "Where does an agent's termination condition live?",
      options: ["In the recursion limit",
        "In the conditional edge's routing function \u2014 which is why a step budget belongs there",
        "In the tool node, which signals completion",
        "In the model's system prompt"],
      answer: 1,
      why: "The router inspects the latest message and returns END when the model stopped requesting tools, so the model's judgement decides the loop's length. Since that judgement can fail, the router is also the right place for an explicit step budget read from the state \u2014 making 'gave up' a routable state rather than a GraphRecursionError, which 8.9 showed cannot be distinguished from a runaway." },
    { stem: "Why write the agent loop out by hand when prebuilts exist?",
      options: ["The prebuilts are less efficient",
        "Every production change \u2014 a step budget, per-tool error handling, trimming, approval \u2014 modifies a specific node or edge you have to be able to identify",
        "The prebuilts cannot use a scripted model",
        "Hand-written nodes are required for checkpointing"],
      answer: 1,
      why: "The prebuilts are the right default for the common case. But a step budget goes in the router, error policy in the tool node, system prompts and history trimming in the agent node, and approval interrupts in the cycle \u2014 so the moment a real requirement arrives you need to know which component it belongs to. Seeing the long form once makes the short form legible rather than opaque." }
  ] },
  interview: { title: "Interview practice", sub: "The agent loop", questions: [
    { level: "core", q: "Describe a tool-calling agent as a graph.",
      strong: "A strong answer is two nodes, an edge and the accumulating list.",
      answer: [
        { t: "p", text: "Two nodes and a conditional edge. An agent node that calls the model, a tool node that executes whatever the model asked for, a conditional edge that goes to tools if there are tool calls and to END otherwise, and a normal edge from tools back to agent." },
        { t: "p", text: "That last edge is the cycle, and it is the thing a chain cannot express \u2014 which is the whole reason an agent is a graph rather than a pipeline." },
        { t: "p", text: "The mechanism is that the message list grows. I measured it: the first model call received one message, the second received three \u2014 the question, the model's tool request, and the tool result as a ToolMessage. The result reaches the model as conversation history, not as an argument." },
        { t: "p", text: "Which makes the reducer on that key load-bearing rather than cosmetic. With plain replacement the second model call sees only the tool result, so the model has the answer without the question and asks again \u2014 forever. That is the commonest way a hand-built agent fails, and it is silent in any test that does not loop twice." }
      ] },
    { level: "advanced", q: "How do you stop an agent from running away?",
      strong: "A strong answer puts a budget in state, not in the recursion limit.",
      answer: [
        { t: "p", text: "A step budget in the state, checked by the router \u2014 not the recursion limit." },
        { t: "p", text: "The loop's exit condition is the model deciding to stop requesting tools, which is the point of an agent and also something that can fail. If the only backstop is the recursion limit, then the graph's failure path is a GraphRecursionError, and you cannot distinguish a long legitimate run from a runaway." },
        { t: "p", text: "That matters more for an agent than for a computational graph because every superstep is a paid model call. On the version I measured the default limit was 10007 supersteps, and all of them execute \u2014 so a runaway spends real money before anything stops it." },
        { t: "p", text: "So: an iteration counter in the state, incremented in the agent node, and a router with three outcomes \u2014 finished, continue, budget exhausted. Then 'gave up' is a state I can route on, record, and return to the caller as a proper result. I would make those outcomes an enum and build the path map from it, because the budget-exhausted branch is exactly the rare path nobody tests." },
        { t: "p", text: "And I would still set the recursion limit explicitly and low, as a backstop for the case where my own counter logic is wrong." }
      ] },
    { level: "core", q: "What would you put in an agent's state beyond the messages?",
      strong: "A strong answer justifies each key by what reads it.",
      answer: [
        { t: "p", text: "As little as possible, and each key justified by something that reads it \u2014 because the state is serialised on every superstep and every key is visible to every node." },
        { t: "p", text: "The messages, with add_messages as the reducer, because that is the loop's mechanism. A step counter, because the router needs it to enforce a budget and the recursion limit is the wrong backstop for a paid loop." },
        { t: "p", text: "Beyond that I would want a reason for each one. Something the agent learned that a later node needs, like a resolved customer id, earns its place. A field that exists only so a routing function can read back what a node already knew does not \u2014 that is a Command waiting to happen." },
        { t: "p", text: "What I would keep out is anything large. A raw provider response or a document's full text gets written on every superstep of the conversation, and I measured an 8 KB blob costing 24 KB across a two-node run. Those belong in storage with a reference in the state." },
        { t: "p", text: "And anything user-scoped rather than conversation-scoped belongs in the store instead, because the whole state is scoped to one thread \u2014 so a preference kept there is both forgotten between conversations and re-serialised forever." }
      ] }
  ] }
});
