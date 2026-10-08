EC.receiveLesson({
  id: "13.6",
  lede: "The strategies are **not interchangeable across patterns**, because the patterns need different things from context. ReAct needs the **reasoning** history \u2014 the pattern *is* the model seeing what previous turns intended \u2014 so a sliding window on a ReAct agent is actively wrong: it treats reasoning as interchangeable with tool observations, which are the **bulky** part, so it drops the reasoning and keeps the JSON. The symptom is an agent repeating tool calls it has already made. Plan-and-execute, meanwhile, has **no context problem at all**: 11.6 measured each worker receiving one step and no history, so 13.1's quadratic growth does not apply \u2014 an under-stated advantage coming from the same property that makes workers unable to adapt.",
  objectives: [
    "State what each pattern needs from context",
    "Identify the strategy that is actively wrong and why",
    "Explain why plan-and-execute has no context problem",
    "Give a per-pattern recommendation",
    "Apply one measurement across all of them"
  ],
  prerequisites: ["13.5", "11.3", "11.6", "12.2"],
  blocks: [
    { t: "h2", n: "01", id: "needs", text: "What each pattern needs", sub: "Four different answers" },
    { t: "dl", items: [
      ["**ReAct** needs the reasoning history", "Because the pattern **is** the model seeing what previous turns intended (11.3). Drop the `AIMessage` content and you have removed the pattern and left the loop."],
      ["**plan-and-execute** needs almost nothing per worker", "11.6 measured each worker receiving one step and no history, so the prompt is constant regardless of the task's length."],
      ["**supervisor** needs the workers' outputs", "Because that is what it decides on (12.2) \u2014 but not their reasoning."],
      ["**swarm** needs whatever the handoff passed", "Which is a design decision rather than an accumulation (12.7)."]
    ] },
    { t: "h2", n: "02", id: "notinter", text: "So they are not interchangeable", sub: "And one row is surprising" },
    { t: "table", head: ["pattern", "what it needs", "wrong strategy"], rows: [
      ["ReAct", "reasoning + results", "**an aggressive window**, or a vague summary"],
      ["plan-and-execute", "the current step", "any \u2014 **it has no history to manage**"],
      ["supervisor", "worker **outputs**", "dropping worker messages"],
      ["swarm", "the handoff payload", "none \u2014 but context **loss** is its risk (12.8)"]
    ] },
    { t: "callout", kind: "insight", title: "Plan-and-execute has no context problem", body: [
      { t: "p", text: "11.6's constant prompt size means 13.1's quadratic growth **does not apply** to the workers \u2014 only to the planner, which runs once. So the pattern that looked rigid is the one that scales to an arbitrarily long task without any of this module's machinery." },
      { t: "p", text: "Which is a genuine and under-stated advantage, and it comes from the **same property** that makes workers unable to adapt: they have no history. The limitation and the advantage are one mechanism seen twice." }
    ] },
    { t: "h2", n: "03", id: "wrong", text: "The one that is actively wrong", sub: "A sliding window on a ReAct agent" },
    { t: "p", text: "11.3's reasoning lives in `AIMessage` content, and a window that keeps the last N messages treats it as interchangeable with tool observations \u2014 which are usually the **bulky** part. So the window drops the reasoning and keeps the JSON." },
    { t: "callout", kind: "trap", title: "The symptom is a repeated tool call", body: [
      { t: "p", text: "An agent that calls the same tool with the same arguments it already used, because it is re-deriving its intent each turn from whatever survived. It looks like a reasoning failure and it is a context-strategy failure \u2014 the information that would have prevented it was dropped by configuration." },
      { t: "p", text: "And 12.8 named duplicated work as cheap to detect from traces. This is one of its causes, which is an argument for the metric: the same tool with the same arguments twice in one request is a signal with a short list of explanations." }
    ] },
    { t: "p", text: "The right strategy for ReAct is **compression first** (13.5): tool results compress safely and losslessly, and they are the large part. Then a detailed summary of older reasoning, keeping the recent turns verbatim." },
    { t: "h2", n: "04", id: "rec", text: "The per-pattern recommendation", sub: "Four shapes" },
    { t: "code", lang: "text", title: "What to do",
      code: "REACT\n  compress tool results (free, and they are the bulk)\n  summarise older reasoning, told to preserve intent and identifiers\n  keep the last 2-3 turns verbatim\n\nPLAN-AND-EXECUTE\n  nothing per worker\n  the planner gets the task; the gather step gets the results\n  if the results are large, compress them before gathering\n\nSUPERVISOR\n  keep worker outputs, drop worker reasoning\n  the `name` field is load-bearing here (12.7)\n\nSWARM\n  a task payload plus the conversation id (12.7)\n  the problem is not accumulation, it is loss",
      caption: "Four patterns, four different answers." },
    { t: "callout", kind: "warn", title: "The supervisor's `name` field is load-bearing", body: [
      { t: "p", text: "A summary that loses attribution makes the supervisor's next decision worse, because it decides **which worker to call** and it now cannot tell which worker said what. So the summarisation prompt has to preserve who produced each finding, not only the findings." },
      { t: "p", text: "And the swarm row inverts the whole module: its risk is context **loss** rather than accumulation, so the strategy is about what to **include** rather than what to drop." }
    ] },
    { t: "h2", n: "05", id: "measure", text: "The measurement", sub: "The same for all of them" },
    { t: "ol", items: [
      "List the facts the context must preserve.",
      "Apply the strategy.",
      "Check which facts survive."
    ] },
    { t: "callout", kind: "mental", title: "Whatever the pattern and whatever the strategy", body: [
      { t: "p", text: "13.3 measured a sliding window destroying **all five facts** of a conversation while reporting a healthy token count. A token count cannot tell you that a strategy removed the subject of the conversation, and no amount of tuning the window size finds it." },
      { t: "p", text: "So the fact-survival check is the one measurement this module insists on, and it is three lines of code. Everything else here \u2014 the triggers, the hierarchy, the compression ordering \u2014 is a choice you can revisit. This is the check that tells you whether the choice was wrong." }
    ] },
    { t: "exercise", kind: "analysis", title: "Match the strategy to the pattern",
      difficulty: "advanced", minutes: 30,
      body: "State what each of the four agent patterns needs from context and which strategy would be wrong for it. Identify the one combination that is actively harmful and explain the mechanism and the symptom. Explain why one pattern has no context problem at all and where that property comes from. Give a per-pattern recommendation, including which field is load-bearing for a supervisor. Finally state the one measurement that applies regardless of pattern or strategy.",
      requirements: ["State what each of four patterns needs from context",
        "Give the wrong strategy for each",
        "Identify the actively harmful combination",
        "Explain the mechanism by which it fails and its symptom",
        "Explain why plan-and-execute has no context problem",
        "Connect that advantage to the pattern's limitation",
        "Give a per-pattern recommendation",
        "Name the load-bearing field for a supervisor",
        "Note that the swarm's risk is loss rather than accumulation",
        "State the one measurement that applies to all of them"],
      hint: "Ask what each pattern reads on its next step. A window on ReAct drops reasoning and keeps the bulky JSON.",
      solution: { lang: "python", title: "x1306.py \u2014 a window on ReAct drops the pattern",
        code: '# a window keeps the last N MESSAGES, and reasoning is not the bulky part\nreasoning = AIMessage(content="I should check the order before refunding.")\nobservation = ToolMessage(content=json.dumps(big_order_payload), ...)\n\nprint(ntok([reasoning]), ntok([observation]))   # the JSON dominates\n\n# so the window evicts the reasoning and keeps the JSON --\n# and the symptom is the agent repeating a tool call it already made,\n# because it re-derives its intent each turn from what survived.',
        out: "==============================================================================\nPART 1 -- what each pattern needs from context\n==============================================================================\n  REACT needs the REASONING history, because the pattern IS the\n  model seeing what previous turns intended (11.3). so a strategy\n  that drops the AIMessage content removes the pattern and leaves\n  the loop.\n\n  PLAN-AND-EXECUTE needs almost nothing per worker. 11.6 measured\n  each worker receiving ONE step and no history, so the prompt is\n  constant regardless of the task's length.\n\n  SUPERVISOR needs the workers' outputs, because that is what it\n  decides on (12.2) -- but not their reasoning.\n\n  SWARM needs whatever the handoff passed, which is a design\n  decision rather than an accumulation (12.7).\n==============================================================================\nPART 2 -- so the strategies are not interchangeable\n==============================================================================\n  pattern            what it needs           wrong strategy\n  ReAct              reasoning + results     an aggressive window\n                                              or a vague summary\n  plan-and-execute   the current step         any -- it has no\n                                              history to manage\n  supervisor         worker OUTPUTS           dropping worker\n                                              messages\n  swarm              the handoff payload      none -- but context\n                                              LOSS is its risk (12.8)\n\n  the plan-and-execute row is the interesting one: it has no\n  context problem at all. 11.6's constant prompt size means\n  13.1's quadratic growth does not apply to the workers -- only to\n  the planner, which runs once.\n\n  which is a genuine and under-stated advantage of the pattern, and\n  it comes from the same property that makes workers unable to\n  adapt: they have no history.\n==============================================================================\nPART 3 -- the one that is actively wrong\n==============================================================================\n  a sliding window on a ReAct agent.\n\n  11.3's reasoning lives in AIMessage content, and a window that\n  keeps the last N messages treats it as interchangeable with tool\n  observations -- which are usually the BULKY part. so the window\n  drops reasoning and keeps JSON.\n\n  the symptom is an agent that repeats tool calls it has already\n  made, because it is re-deriving its intent each turn from\n  whatever survived.\n\n  the right strategy for ReAct is COMPRESSION FIRST (13.5): tool\n  results compress safely and losslessly, and they are the large\n  part. then a detailed summary of older reasoning, keeping the\n  recent turns verbatim.\n==============================================================================\nPART 4 -- the per-pattern recommendation\n==============================================================================\n  REACT\n    compress tool results (free, and they are the bulk)\n    summarise older reasoning, told to preserve intent and\n      identifiers\n    keep the last 2-3 turns verbatim\n\n  PLAN-AND-EXECUTE\n    nothing per worker\n    the planner gets the task; the gather step gets the results\n    if the results are large, compress them before gathering\n\n  SUPERVISOR\n    keep worker outputs, drop worker reasoning\n    the `name` field is load-bearing here (12.7) -- a summary that\n      loses attribution makes the supervisor's next decision worse\n\n  SWARM\n    a task payload plus the conversation id (12.7)\n    the problem is not accumulation, it is loss -- so the strategy\n      is about what to INCLUDE rather than what to drop\n==============================================================================\nPART 5 -- the measurement, which is the same for all of them\n==============================================================================\n  whatever the pattern and whatever the strategy:\n\n    1. list the facts the context must preserve\n    2. apply the strategy\n    3. check which facts survive\n\n  13.3 measured a sliding window destroying all five facts of a\n  conversation while reporting a healthy token count. a token count\n  cannot tell you that a strategy removed the subject of the\n  conversation, and no amount of tuning the window size finds it.\n\n  so the fact-survival check is the one measurement this module\n  insists on, and it is three lines of code.",
        notes: [
          { t: "p", text: "**ReAct needs the reasoning history**, because the pattern is the model seeing what previous turns intended (11.3)." },
          { t: "p", text: "**So a sliding window on a ReAct agent is actively wrong**: it treats reasoning as interchangeable with tool observations, which are the bulky part." },
          { t: "p", text: "**The symptom is an agent repeating a tool call it already made**, re-deriving its intent each turn \u2014 which looks like a reasoning failure." },
          { t: "p", text: "**And 12.8's duplicated-work metric detects it**: the same tool with the same arguments twice in one request." },
          { t: "p", text: "**Plan-and-execute has no context problem at all** \u2014 11.6's constant prompt means 13.1's quadratic growth does not apply to the workers." },
          { t: "p", text: "**Which comes from the same property that makes workers unable to adapt**: they have no history. The limitation and the advantage are one mechanism." },
          { t: "p", text: "**A supervisor needs worker outputs, not their reasoning** \u2014 and the `name` field is load-bearing, because it decides which worker to call next." },
          { t: "p", text: "**The swarm inverts the module**: its risk is context loss, so the strategy is about what to include rather than what to drop." },
          { t: "p", text: "**ReAct's right strategy is compression first** (13.5), then a detailed summary of older reasoning, then the recent turns verbatim." },
          { t: "p", text: "**And the measurement is the same for all of them**: list the facts, apply the strategy, check which survive." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that kept calling the same tool", body: [
      { t: "p", text: "A ReAct agent with a ten-message sliding window starts looking up the same order three times in one request. The traces show each lookup returning identical data. The context never overflows and the token metrics look good." },
      { t: "p", text: "The window keeps the last ten messages, and the tool observations are far bulkier than the reasoning. So the `AIMessage` content explaining why the lookup was needed is evicted while the JSON it produced survives \u2014 and ReAct's whole mechanism is the model reading its own previous intent. Without it, the agent re-derives its plan each turn from the observations alone and arrives at the same next step." },
      { t: "p", text: "The fix is to compress the tool results rather than evict messages: they are the large part, they compress losslessly because their structure is known, and the saving is paid back on every later turn. Then summarise older reasoning with an instruction to preserve intent, and keep the last two or three turns verbatim. The detection worth having regardless is a duplicated-work metric \u2014 the same tool with the same arguments twice in one request is cheap to spot from traces and has a short list of causes." }
    ] }
  ],
  takeaways: [
    "**The strategies are not interchangeable across patterns**, because the patterns need different things.",
    "**ReAct needs the reasoning history** \u2014 the pattern is the model seeing its own previous intent (11.3).",
    "**So a sliding window on ReAct is actively wrong**: reasoning is not the bulky part, the JSON is.",
    "**The symptom is a repeated tool call**, which looks like a reasoning failure.",
    "**And 12.8's duplicated-work metric detects it** from traces.",
    "**ReAct's right strategy is compression first** (13.5), then a detailed summary, then recent turns.",
    "**Plan-and-execute has no context problem at all** \u2014 11.6's workers get one step and no history.",
    "**So 13.1's quadratic growth does not apply** to them, only to the planner, which runs once.",
    "**And that advantage is the same mechanism as its limitation**: no history means no adaptation.",
    "**A supervisor needs worker outputs, not their reasoning** (12.2).",
    "**The `name` field is load-bearing there** \u2014 losing attribution makes the next decision worse.",
    "**The swarm inverts the module**: its risk is context loss, not accumulation.",
    "**So for a swarm the strategy is what to include**, not what to drop.",
    "**And one measurement covers all of them**: list the facts, apply the strategy, check which survive."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why is a sliding window actively wrong for a ReAct agent?",
      options: ["Windows break the tool-call and tool-result pairing",
        "The reasoning lives in AIMessage content and is not the bulky part, so the window evicts the reasoning and keeps the JSON",
        "ReAct agents cannot be checkpointed with a trimmed history",
        "The window changes the order the model sees messages in"],
      answer: 1,
      why: "ReAct's mechanism is the model reading what its previous turns intended, and a window treats that content as interchangeable with tool observations, which are usually far larger. So the pattern is removed and the loop remains \u2014 the agent re-derives its plan each turn from observations alone, and the symptom is calling the same tool with the same arguments twice." },
    { stem: "Why does plan-and-execute have no context problem?",
      options: ["Its planner summarises the task up front",
        "Each worker receives one step and no history, so the prompt is constant and the quadratic growth does not apply",
        "Workers run in parallel, so their contexts are smaller",
        "The gather step discards worker contexts"],
      answer: 1,
      why: "A constant per-worker prompt means conversation-length growth never reaches the workers; only the planner sees the whole task, and it runs once. That is a real advantage and it comes from the same property that makes workers unable to react to what earlier steps found \u2014 the limitation and the benefit are one mechanism seen twice." },
    { stem: "Why is the `name` field load-bearing when summarising a supervisor's history?",
      options: ["It is required for message serialisation",
        "The supervisor decides which worker to call next, so a summary that loses attribution makes that decision worse",
        "Reducers key on it when merging worker outputs",
        "It determines which worker receives the summary"],
      answer: 1,
      why: "A supervisor's job is routing, and its input is what each worker produced. Strip the attribution and it can see the findings but not who found them, so it cannot tell which worker still has something to contribute. The summarisation prompt therefore has to preserve who produced each finding, not just the findings themselves." },
    { stem: "How is a swarm's context problem different from the others'?",
      options: ["It has more agents, so the context grows faster",
        "Its risk is context loss rather than accumulation, so the strategy is about what to include",
        "Swarms cannot share a message history at all",
        "Handoffs reset the context automatically"],
      answer: 1,
      why: "A swarm passes whatever the handoff was designed to pass, which is a deliberate payload rather than an accumulation. So nothing grows unmanageably; the failure is a receiving agent not being given what it needs \u2014 which inverts the module's framing from choosing what to drop to choosing what to include." }
  ] },
  interview: { title: "Interview practice", sub: "Pattern-specific context", questions: [
    { level: "advanced", q: "Does the right context strategy depend on the agent pattern?",
      strong: "A strong answer gives four different answers and one actively wrong pair.",
      answer: [
        { t: "p", text: "Yes, and there is one combination I would call actively wrong rather than merely suboptimal." },
        { t: "p", text: "A sliding window on a ReAct agent. ReAct's mechanism is the model seeing what its previous turns intended, and that reasoning lives in the assistant message content \u2014 which is not the bulky part. The tool observations are. So a window that keeps the last N messages evicts the reasoning and keeps the JSON, which removes the pattern and leaves the loop." },
        { t: "p", text: "The symptom is specific and I would look for it: an agent calling the same tool with the same arguments twice in one request, because it re-derives its intent each turn from the observations alone. It reads as a reasoning failure and it is a configuration failure." },
        { t: "p", text: "The others differ. A supervisor needs worker outputs but not their reasoning, and the name field is load-bearing there because it is deciding which worker to call next. A swarm's risk is context loss rather than accumulation, so its strategy is about what to include." },
        { t: "p", text: "And plan-and-execute has no context problem at all. Each worker gets one step and no history, so the prompt is constant and the quadratic growth never reaches them \u2014 which is an under-stated advantage that comes from the same property making workers unable to adapt." }
      ] },
    { level: "core", q: "What is the one thing you would always measure about a context strategy?",
      strong: "A strong answer names fact survival and why tokens are not enough.",
      answer: [
        { t: "p", text: "Fact survival. List the facts the context must preserve, apply the strategy, check which survive \u2014 three lines of code." },
        { t: "p", text: "The reason is that a token count cannot see the failure that matters. I measured a sliding window reporting 156 tokens against an original 489 \u2014 a healthy 68% saving \u2014 while having destroyed all five identifying facts of the conversation, including the order number the whole exchange was about." },
        { t: "p", text: "Nothing in the token metric distinguishes a 68% saving from a 68% information loss, and no amount of tuning the window size recovers it, because the facts were at the beginning and a window keeps the end." },
        { t: "p", text: "Everything else in context management is a choice I would be willing to revisit \u2014 the trigger threshold, whether to go hierarchical, the compression ordering. This is the check that tells me whether the choice was wrong, and it works the same way regardless of pattern or strategy." },
        { t: "p", text: "If the facts are not enumerable up front, the stronger version is to ask the original and the trimmed context the same question and compare the answers. That costs two model calls per test case and catches what a fact list misses, since the list only contains what I thought to write down." }
      ] },
    { level: "advanced", q: "An agent is calling the same tool twice with identical arguments. How would you diagnose it?",
      strong: "A strong answer suspects the context strategy before the prompt.",
      answer: [
        { t: "p", text: "I would suspect the context strategy before the prompt, because that symptom has a specific mechanical cause in a ReAct agent." },
        { t: "p", text: "ReAct works by the model reading what its previous turns intended, and that reasoning lives in the assistant message content. A sliding window keeps the last N messages and treats that content as interchangeable with tool observations \u2014 which are usually far bulkier. So the window evicts the reasoning and keeps the JSON, and the agent re-derives its plan each turn from the observations alone, arriving at the same next step." },
        { t: "p", text: "So the first thing I would check is whether any trimming is configured and what it kept. If reasoning content is being dropped, the behaviour is explained and no prompt change fixes it." },
        { t: "p", text: "The fix is to compress rather than evict. Tool results are the large part, they have a known structure so compressing them is a formatting function rather than a model call, and the saving is paid back on every later turn \u2014 I measured 80 tokens to 21, which is 590 over ten turns. Then summarise older reasoning with an instruction to preserve intent, and keep the last two or three turns verbatim." },
        { t: "p", text: "If there is no trimming, then it is a prompt or tool-description problem and I would look at whether two tools are indistinguishable, or whether the result is being returned in a form the model does not recognise as an answer." },
        { t: "p", text: "Either way I would add the detection permanently: the same tool with the same arguments twice in one request is cheap to spot from traces, it has a short list of causes, and it is otherwise invisible \u2014 the request succeeds, it just costs twice as much and takes twice as long." }
      ] }
  ] }
});
