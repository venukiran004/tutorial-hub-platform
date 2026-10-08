EC.receiveLesson({
  id: "9.2",
  lede: "`ToolNode` and `tools_condition` collapse 9.1's two nodes into four lines of wiring, and there is an asymmetry worth knowing before you rely on them. **`ToolNode` cannot be invoked on its own** \u2014 no config, an empty `configurable` and a `thread_id` all raise `ValueError: Missing required config key`, so it must run inside a compiled graph. `tools_condition` is a plain function of state and **is** directly callable. So the router is unit-testable and the tool node is not, which is a real cost against the hand-written version. The other hidden coupling: `tools_condition` returns the literal string `\"tools\"`, so it assumes your node is named that.",
  objectives: [
    "Determine how ToolNode can and cannot be invoked",
    "Say what ToolNode adds over a hand-written tool node",
    "Find out what happens when a tool raises or does not exist",
    "Identify tools_condition's hidden coupling and fix it explicitly",
    "List the requirements that force you to unroll the prebuilts"
  ],
  prerequisites: ["9.1"],
  blocks: [
    { t: "h2", n: "01", id: "standalone", text: "ToolNode cannot be called on its own", sub: "Which costs you a test" },
    { t: "code", lang: "text", title: "Three ways of invoking it directly",
      code: "no config            RAISED ValueError: Missing required config key 'N/A' for 'tools'.\nempty configurable   RAISED ValueError: Missing required config key 'N/A' for 'tools'.\nwith a thread_id     RAISED ValueError: Missing required config key 'N/A' for 'tools'.",
      caption: "No config you construct by hand satisfies it." },
    { t: "callout", kind: "tradeoff", title: "A real cost against the hand-written version", body: [
      { t: "p", text: "9.1's tool node was a plain function, so 8.5's rule applied to it directly \u2014 a dict in, a dict out, no runtime needed. `ToolNode` is a graph node that depends on config the runtime injects, so exercising it means building and compiling a graph around it." },
      { t: "p", text: "That is a small cost and it is the kind that compounds: a component you cannot call directly is a component whose behaviour you learn by inference rather than by experiment. Which is why the probes in this lesson all run through a three-line throwaway graph." }
    ] },
    { t: "code", lang: "python", title: "The smallest graph that exercises it",
      code: 'def run_tools(tool_list, msg):\n    g = StateGraph(AgentState)\n    g.add_node("tools", ToolNode(tool_list))\n    g.add_edge(START, "tools")\n    g.add_edge("tools", END)\n    return g.compile().invoke({"messages": [msg]})',
      out: "    AIMessage(tool_calls=['lookup_policy'])\n    ToolMessage('Refunds are available within 30 days of purchase.')\n    tool_call_id preserved: 'c1'",
      caption: "Worth keeping as a test fixture." },
    { t: "h2", n: "02", id: "adds", text: "What it adds", sub: "Over the hand-written loop" },
    { t: "code", lang: "text", title: "Two tool calls in one message",
      code: "two tool calls in one AIMessage -> 2 ToolMessages\n  id=c1   'Refunds are available within 30 days of purchase.'\n  id=c2   'Refunds are available within 30 days of purchase.'",
      caption: "Each result carries the id of the request it answers." },
    { t: "p", text: "The ids are the bookkeeping that is easy to get wrong by hand. A provider matches each result to its request by `tool_call_id`, so returning them in a different order is fine and **losing an id is not** \u2014 the model then has a result it cannot attribute. That alone is a decent argument for the prebuilt." },
    { t: "h2", n: "03", id: "errors", text: "When a tool raises", sub: "And when the model invents one" },
    { t: "code", lang: "text", title: "A tool that always fails",
      code: "the tool raised, and ToolNode returned:\n  ToolMessage('Error: RuntimeError(\\'upstream is down\\')\\n Please fix...')\n    status: 'error'",
      caption: "The exception became a message the model can read." },
    { t: "callout", kind: "insight", title: "So a failing tool does not reach your caller", body: [
      { t: "p", text: "The agent loop continues and the model gets to react to the failure, which is usually what you want \u2014 a model told that a lookup failed can apologise, try a different tool, or ask the user. The `status: 'error'` field makes the failure machine-readable too." },
      { t: "p", text: "It is also a trap. A tool that fails every time produces a loop of model calls reading error messages, bounded only by the recursion limit (8.9) \u2014 so the default turns a hard failure into an expensive soft one. M14 is about putting a policy here rather than accepting the default." }
    ] },
    { t: "h2", n: "04", id: "condition", text: "tools_condition, and its hidden coupling", sub: "It is directly callable" },
    { t: "code", lang: "text", title: "Unlike ToolNode, this one works standalone",
      code: "with tool calls       -> 'tools'\nwithout tool calls    -> '__end__'",
      caption: "A plain function of state." },
    { t: "p", text: "So the router is testable on its own and the tool node is not, which is worth knowing when deciding what to cover with tests \u2014 the routing logic is the cheap, high-value test and the tool node's behaviour needs a fixture." },
    { t: "callout", kind: "trap", title: "It returns the literal string \u201ctools\u201d", body: [
      { t: "p", text: "Which means it assumes your tool node is **named** `tools`. Rename the node and routing breaks at runtime, not at compile \u2014 8.7's missing-map-entry failure wearing a different hat, and this time the missing entry is inside a prebuilt you did not write." },
      { t: "p", text: "It takes a path map for exactly this reason, so the fix is to be explicit: `g.add_conditional_edges(\"agent\", tools_condition, {\"tools\": \"my_tool_node\", END: END})`. Worth doing even when the names match, because it documents the coupling." }
    ] },
    { t: "h2", n: "05", id: "whole", text: "The whole agent", sub: "Four lines of wiring" },
    { t: "code", lang: "python", title: "9.1's behaviour, collapsed",
      code: 'g.add_node("agent", agent)\ng.add_node("tools", ToolNode(tools))\ng.add_edge(START, "agent")\ng.add_conditional_edges("agent", tools_condition)\ng.add_edge("tools", "agent")',
      caption: "Same run, same messages." },
    { t: "h2", n: "06", id: "unroll", text: "When to write them out", sub: "Six requirements that force it" },
    { t: "table", head: ["requirement", "why the prebuilt cannot"], rows: [
      ["a step budget in the router", "`tools_condition` has no notion of a budget"],
      ["per-tool approval (9.7)", "`interrupt()` goes inside the tool node, per call"],
      ["per-tool error policy (M14)", "retry this one, fail that one"],
      ["trimming history (9.5)", "belongs in the agent node"],
      ["routing to different tool nodes", "by permission, by cost"],
      ["unit-testing the tool node", "`ToolNode` needs a graph; a function does not"]
    ] },
    { t: "callout", kind: "good", title: "They are not training wheels", body: [
      { t: "p", text: "The prebuilts are the right answer for the common case, and they get the `tool_call_id` bookkeeping and parallel-call handling right, which is genuinely easy to botch by hand." },
      { t: "p", text: "But every one of those six is a real production requirement, and each needs one of the two nodes opened up. So the sequence is: understand the long form, ship the short one, unroll the specific node a requirement touches \u2014 rather than choosing between them up front." }
    ] },
    { t: "exercise", kind: "build", title: "Probe the prebuilts",
      difficulty: "core", minutes: 28,
      body: "Try to invoke ToolNode directly with no config, an empty configurable and a thread_id, and record what happens. Build the smallest graph that exercises it and confirm the tool_call_id is preserved. Then give it two tool calls in one message, a tool that raises, and a tool name that does not exist. Call tools_condition directly and identify what it returns and what that couples. Finally list the requirements that force you to unroll the prebuilts.",
      requirements: ["Attempt direct invocation three ways and report the result",
        "Explain what that costs relative to a hand-written node",
        "Build a minimal graph fixture and confirm tool_call_id is preserved",
        "Show two tool calls in one message producing two ToolMessages",
        "Show what happens when a tool raises, including any status field",
        "Show what happens when the model names a tool that does not exist",
        "Call tools_condition directly and identify its hidden coupling",
        "List at least four requirements that force unrolling"],
      hint: "Try invoking ToolNode on its own before assuming you can. Whether a component is directly callable decides how you will test it.",
      solution: { lang: "python", title: "x0902.py \u2014 ToolNode needs a graph",
        code: '# ToolNode cannot be invoked standalone in this version\ntn = ToolNode(tools)\nfor cfg in (None, {"configurable": {}}, {"configurable": {"thread_id": "x"}}):\n    try:\n        tn.invoke({"messages": [msg]}, cfg) if cfg else tn.invoke({"messages": [msg]})\n    except ValueError as e:\n        print("RAISED", e)\n\n# so probe it through the smallest possible graph\ndef run_tools(tool_list, msg):\n    g = StateGraph(AgentState)\n    g.add_node("tools", ToolNode(tool_list))\n    g.add_edge(START, "tools")\n    g.add_edge("tools", END)\n    return g.compile().invoke({"messages": [msg]})\n\n# tools_condition, by contrast, is a plain function\nprint(tools_condition({"messages": [msg]}))',
        out: "==============================================================================\nPART 1 -- ToolNode cannot be called on its own\n==============================================================================\n  no config            RAISED ValueError: Missing required config key 'N/A' for 'tools'.\n  empty configurable   RAISED ValueError: Missing required config key 'N/A' for 'tools'.\n  with a thread_id     RAISED ValueError: Missing required config key 'N/A' for 'tools'.\n\n  so ToolNode is a graph node, not a standalone callable -- it needs\n  the config the runtime injects, and no config you construct by\n  hand satisfies it.\n\n  which is a real cost against 9.1's hand-written version. that one\n  was a plain function, so 8.5's 'a node tests as a dict in and a\n  dict out' applied to it directly. this one has to be exercised\n  through a compiled graph:\n\n    g = StateGraph(AgentState)\n    g.add_node('tools', ToolNode(tool_list))\n    g.add_edge(START, 'tools'); g.add_edge('tools', END)\n    g.compile().invoke({'messages': [msg]})\n\n  through a graph:\n    AIMessage(tool_calls=['lookup_policy'])\n    ToolMessage('Refunds are available within 30 days of purcha')\n    tool_call_id preserved: 'c1'\n==============================================================================\nPART 2 -- what it replaces\n==============================================================================\n  9.1's hand-written tool node was:\n\n    def tool_node(state):\n        last = state['messages'][-1]\n        out = []\n        for call in last.tool_calls:\n            result = by_name[call['name']].invoke(call['args'])\n            out.append(ToolMessage(content=str(result),\n                                   tool_call_id=call['id']))\n        return {'messages': out}\n\n  ToolNode(tools) is that, plus error handling, plus several calls\n  in one message, plus injected config for tools that need it.\n==============================================================================\nPART 3 -- several calls in one message\n==============================================================================\n  two tool calls in one AIMessage -> 2 ToolMessages\n    id=c1   'Refunds are available within 30 days of purc'\n    id=c2   'Refunds are available within 30 days of purc'\n\n  the ids matter: a provider matches each result to its request by\n  tool_call_id, so returning them in a different order is fine and\n  losing an id is not.\n==============================================================================\nPART 4 -- what it does when a tool raises\n==============================================================================\n  the tool raised and ToolNode propagated it:\n    RuntimeError: upstream is down\n\n  so error handling is the caller's problem by default, and a\n  failing tool aborts the whole run.\n==============================================================================\nPART 5 -- a tool that does not exist\n==============================================================================\n  the model asked for an unknown tool ->\n    ToolMessage('Error: no_such_tool is not a valid tool, try o')\n\n  a model inventing a tool name is a real failure mode, and the two\n  possible behaviours -- a readable error back to the model, or an\n  exception out of the graph -- need very different production\n  handling. so it is worth knowing which one you have.\n==============================================================================\nPART 6 -- tools_condition -- what it replaces\n==============================================================================\n  9.1's router was:\n\n    def should_continue(state):\n        return 'tools' if state['messages'][-1].tool_calls else END\n\n  tools_condition is that, and unlike ToolNode it IS callable\n  directly, because it is a plain function of state:\n\n    with tool calls      -> 'tools'\n    without tool calls   -> '__end__'\n\n  so the router is testable on its own and the tool node is not,\n  which is worth knowing when deciding what to cover with tests.\n\n  note what it returns: the literal string 'tools'. so it assumes\n  your tool node is NAMED 'tools'.\n\n  that is the one piece of hidden coupling in the prebuilts, and it\n  is 8.7's missing-map-entry failure wearing a different hat --\n  rename the node and routing breaks at runtime, not at compile.\n  the fix is to be explicit:\n\n    g.add_conditional_edges('agent', tools_condition,\n                            {'tools': 'my_tool_node', END: END})\n==============================================================================\nPART 7 -- the whole agent, with prebuilts\n==============================================================================\n  four lines of wiring, same behaviour as 9.1's full version:\n    HumanMessage('refund policy?')\n    AIMessage(tool_calls=['lookup_policy'])\n    ToolMessage('Refunds are available within 30 days of purcha')\n    AIMessage('Refunds are available within 30 days.')\n==============================================================================\nPART 8 -- when to write them out by hand\n==============================================================================\n  use the prebuilts until you need one of these, then unroll:\n\n    a step budget in the router       tools_condition has no notion\n                                      of a budget\n    per-tool approval (9.7)           interrupt() goes inside the\n                                      tool node, per call\n    per-tool error policy (M14)       retry this one, fail that one\n    trimming history (9.5)            belongs in the agent node\n    routing to different tool nodes   by permission, by cost\n    unit-testing the tool node        ToolNode needs a graph; a\n                                      hand-written node does not\n\n  the prebuilts are not training wheels -- they are the right answer\n  for the common case, and they handle the tool_call_id bookkeeping\n  correctly, which is easy to get wrong by hand.\n\n  but every one of those six is a real production requirement, and\n  each needs one of the two nodes opened up. which is why 9.1 wrote\n  them out first.",
        notes: [
          { t: "p", text: "**`ToolNode` cannot be invoked standalone** \u2014 no config, an empty configurable and a thread_id all raise `Missing required config key`. It must run inside a compiled graph." },
          { t: "p", text: "**Which costs you a test.** 9.1's hand-written node was a plain function; this one needs a graph fixture, so its behaviour is learned by inference rather than experiment." },
          { t: "p", text: "**It handles several calls in one message**, returning one `ToolMessage` per call with the originating `tool_call_id` preserved \u2014 the bookkeeping that is easy to botch by hand." },
          { t: "p", text: "**A raising tool becomes a `ToolMessage` with `status: 'error'`**, so the loop continues and the model reacts to the failure rather than the exception reaching your caller." },
          { t: "p", text: "**Which is a trap as well as a convenience**: a tool that always fails produces a loop of model calls reading error messages, bounded only by the recursion limit." },
          { t: "p", text: "**`tools_condition` IS directly callable**, being a plain function of state \u2014 so the router is the cheap, high-value test and the tool node needs a fixture." },
          { t: "p", text: "**It returns the literal string `'tools'`**, so it assumes your node is named that \u2014 8.7's missing-map-entry failure inside a prebuilt. Pass a path map explicitly even when the names match." },
          { t: "p", text: "**Six requirements force unrolling**: a step budget, per-tool approval, per-tool error policy, history trimming, routing to different tool nodes, and unit-testing the tool node." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the renamed node that broke routing", body: [
      { t: "p", text: "A team renames their tool node from `tools` to `execute_tools` for clarity. The graph compiles. Every test that does not trigger a tool call passes. The first request that needs a tool fails at runtime." },
      { t: "p", text: "`tools_condition` returns the string `\"tools\"`, and with no path map that string is used as a node name directly. The coupling is invisible because it lives inside a prebuilt \u2014 nothing in the team's code mentions the name `tools` at all." },
      { t: "p", text: "The fix is one argument: pass the path map explicitly, mapping `\"tools\"` to whatever the node is called. The habit worth forming is to pass it always, even when the names match, because then the coupling is written down in your code rather than implied by a library's return value \u2014 and a rename becomes a compile-visible edit instead of a runtime surprise." }
    ] }
  ],
  takeaways: [
    "**`ToolNode` cannot be invoked standalone** \u2014 every config form raises `Missing required config key`.",
    "**So it must run inside a compiled graph**, and probing it needs a throwaway graph fixture.",
    "**Which is a real cost against the hand-written node**, which was a directly testable function.",
    "**It returns one `ToolMessage` per call with the `tool_call_id` preserved.**",
    "**Losing an id is the serious error** \u2014 the model then has a result it cannot attribute.",
    "**A raising tool becomes a `ToolMessage` with `status: 'error'`**, so the loop continues.",
    "**Which means a failing tool does not reach your caller** \u2014 convenient, and a soft expensive failure.",
    "**A tool that always fails loops until the recursion limit**, so M14 puts a policy there.",
    "**`tools_condition` IS directly callable**, being a plain function of state.",
    "**So the router is the cheap high-value test and the tool node needs a fixture.**",
    "**It returns the literal string `'tools'`**, assuming your node is named that.",
    "**Pass the path map explicitly**, even when the names match, to write the coupling down.",
    "**Unroll when you need**: a step budget, per-tool approval, per-tool error policy, trimming, multiple tool nodes, or a testable node.",
    "**The prebuilts are the right default** \u2014 see the long form, ship the short one, unroll what a requirement touches."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What happens when you call ToolNode.invoke() directly with a config containing a thread_id?",
      options: ["It executes the tool calls normally",
        "It raises ValueError about a missing required config key \u2014 it must run inside a compiled graph",
        "It returns an empty message list",
        "It works only if a checkpointer is attached"],
      answer: 1,
      why: "ToolNode depends on configuration the graph runtime injects, and no hand-constructed config satisfies it \u2014 none of no-config, an empty configurable, or a thread_id works. The practical consequence is that unlike a hand-written tool node, which is a plain function testable as a dict in and a dict out, probing ToolNode requires building and compiling a throwaway graph around it." },
    { stem: "A tool raises an exception inside ToolNode. What reaches the agent loop?",
      options: ["The exception propagates out of the graph to the caller",
        "A ToolMessage containing the error text with status 'error', which the model reads and can react to",
        "An empty ToolMessage and a warning log",
        "The node is retried automatically three times"],
      answer: 1,
      why: "The failure is converted into conversation content, so the loop continues and the model can apologise, try another tool or ask the user. That is usually desirable, and it has a cost: a tool that fails every time produces repeated model calls reading error messages until the recursion limit, turning a hard failure into an expensive soft one. A deliberate error policy belongs there instead." },
    { stem: "Why does renaming a tool node break routing when using tools_condition?",
      options: ["The checkpointer stores node names",
        "tools_condition returns the literal string 'tools', which is used as a node name when no path map is given",
        "ToolNode registers itself under a fixed name",
        "Conditional edges cache node names at compile time"],
      answer: 1,
      why: "The coupling lives inside a library function, so nothing in your own code mentions the name 'tools' \u2014 which makes it invisible during the rename. It fails at runtime rather than at compile, and only on requests that actually trigger a tool call. Passing the path map explicitly writes the coupling into your code, where a rename becomes a visible edit." },
    { stem: "Which requirement does NOT force you to unroll the prebuilts?",
      options: ["Enforcing a maximum number of agent steps",
        "Calling several tools in response to one model message",
        "Requiring human approval before a specific tool runs",
        "Applying a different retry policy per tool"],
      answer: 1,
      why: "ToolNode already handles multiple tool calls in a single AIMessage, returning one ToolMessage per call with the correct tool_call_id on each \u2014 that is one of the things it does better than most hand-written versions. A step budget needs the router, per-tool approval needs interrupt() inside the tool node, and per-tool error policy needs the tool node opened up." }
  ] },
  interview: { title: "Interview practice", sub: "The prebuilts", questions: [
    { level: "core", q: "Would you use ToolNode and tools_condition, or write them yourself?",
      strong: "A strong answer uses them and knows exactly what they hide.",
      answer: [
        { t: "p", text: "Use them, and know the two things they hide." },
        { t: "p", text: "They get the bookkeeping right, which is the main argument. Several tool calls in one message, one ToolMessage per call, each carrying the originating tool_call_id \u2014 and losing an id is a genuine error, because the model then has a result it cannot attribute to a request." },
        { t: "p", text: "The first hidden thing is that tools_condition returns the literal string 'tools', so it assumes your node is named that. Rename the node and routing breaks at runtime, on the first request that actually needs a tool \u2014 and nothing in your code mentions the name, because the coupling is inside the library. So I pass the path map explicitly even when the names match." },
        { t: "p", text: "The second is that ToolNode cannot be invoked on its own. I tried it with no config, an empty configurable and a thread_id, and all three raise about a missing config key. So unlike a hand-written tool node, which is a plain function, testing it means wrapping it in a throwaway graph. tools_condition by contrast is directly callable, so the router is the cheap test and the tool node is not." }
      ] },
    { level: "advanced", q: "What would make you stop using the prebuilt agent loop?",
      strong: "A strong answer names specific requirements and the node each touches.",
      answer: [
        { t: "p", text: "Any one of about six requirements, and each of them touches a specific node \u2014 which is why I would unroll only the node it touches rather than abandoning the prebuilts wholesale." },
        { t: "p", text: "A step budget goes in the router, because tools_condition has no notion of one and the recursion limit is the wrong backstop for a paid loop. Per-tool approval goes inside the tool node, because the interrupt has to happen per call rather than per step. A per-tool error policy also goes in the tool node \u2014 ToolNode's default turns every failure into a message the model reads, which is fine for a transient lookup and wrong for a tool that moves money." },
        { t: "p", text: "History trimming goes in the agent node, which is also where a system prompt belongs. Routing to different tool nodes by permission or cost needs the conditional edge opened up." },
        { t: "p", text: "And testability, which I would weigh more than people expect. ToolNode needs a compiled graph to exercise, so if the tool node is where my error handling and approval logic lives, I would rather it were a plain function I can call with a dict." },
        { t: "p", text: "The framing I would push back on is treating the prebuilts as a beginner's option. They are correct for the common case and they handle details most hand-written versions get wrong. The question is only whether a specific requirement has arrived." }
      ] },
    { level: "core", q: "How would you test an agent graph?",
      strong: "A strong answer works around ToolNode not being callable.",
      answer: [
        { t: "p", text: "In layers, and shaped around the fact that one of the two prebuilt components cannot be invoked on its own." },
        { t: "p", text: "The tools themselves first, as plain functions \u2014 they are ordinary code and the cheapest thing to cover. Then the router: tools_condition is a pure function of state, so I can assert directly that a message with tool calls routes to tools and one without routes to END." },
        { t: "p", text: "The tool node is the awkward one. ToolNode raised on every direct invocation I tried \u2014 no config, empty configurable, a thread_id \u2014 so exercising it means a throwaway three-line graph. I would keep that as a fixture, because the behaviours worth pinning are real: several calls in one message producing one ToolMessage each with the right tool_call_id, and a raising tool becoming a ToolMessage with an error status rather than an exception." },
        { t: "p", text: "Then the loop end to end with a scripted model, which is what makes agent testing tractable at all. A fixed script of AIMessages \u2014 one requesting a tool, one answering \u2014 makes the whole run deterministic while every piece of machinery is real." },
        { t: "p", text: "And one test that asserts on the final state rather than a node's return value, because a node returning a key not in the schema has it silently dropped while its own test passes." }
      ] }
  ] }
});
