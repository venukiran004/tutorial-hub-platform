EC.receiveLesson({
  id: "3.6",
  lede: "`RunnableWithMessageHistory` wires a store into a chain and keys it by `session_id` \u2014 which is config, not input, exactly as 2.9's rule predicts, since two concurrent users differ on it and it is not part of the question. It also emits a deprecation warning: **\u201cRunnableWithMessageHistory is deprecated. Use LangGraph's built-in persistence instead\u201d**, which is 9.4. `trim_messages` is the other half, and the parameter that matters most is `include_system` \u2014 keeping the instructions even when they are the oldest message, because dropping the system prompt to save tokens silently changes the behaviour of every subsequent turn.",
  objectives: [
    "Wire history into a chain and key it correctly",
    "Explain why session_id is config rather than input",
    "Apply trim_messages with the four main strategies",
    "Say why include_system is almost always right",
    "Recognise that this API is superseded by graph persistence"
  ],
  prerequisites: ["3.5", "2.9"],
  blocks: [
    { t: "h2", n: "01", id: "wire", text: "Wiring history in", sub: "A store, a key, and a placeholder" },
    { t: "code", lang: "python", title: "Three turns against one session",
      code: 'prompt = ChatPromptTemplate.from_messages([\n    ("system", "You are terse."),\n    MessagesPlaceholder(variable_name="history"),\n    ("human", "{input}")])\n\nwith_hist = RunnableWithMessageHistory(\n    prompt | model | StrOutputParser(), get_history,\n    input_messages_key="input", history_messages_key="history")\n\ncfg = {"configurable": {"session_id": "s1"}}\nfor i in range(1, 4):\n    with_hist.invoke({"input": "question %d" % i}, config=cfg)',
      out: "after 3 turns, stored messages: 6\n   Human:    question 1\n   AI:       ok 1\n   Human:    question 2\n   AI:       ok 2\n   Human:    question 3\n   AI:       ok 3",
      caption: "Two messages stored per turn. The placeholder from 1.3 is where they go back in." },
    { t: "callout", kind: "good", title: "session_id is config, and that is the rule from 2.9", body: [
      { t: "p", text: "Apply the test: could two concurrent calls legitimately differ on it, and is it part of the question being asked? A session id differs per call and is not part of the question, so it is config \u2014 and that is exactly where the API puts it." },
      { t: "p", text: "The failure if you get this wrong is a good one to picture: a session id in the input dict would be interpolated into the prompt as data, so the model would see it, and the history lookup would not happen at all." }
    ] },
    { t: "h2", n: "02", id: "deprecated", text: "And it is deprecated", sub: "Pointing at module 9" },
    { t: "callout", kind: "warn", title: "The warning this emits", body: [
      { t: "p", text: "Running the code above produces: *\u201cRunnableWithMessageHistory is deprecated. Use LangGraph's built-in persistence instead.\u201d*" },
      { t: "p", text: "That is a real directional signal rather than a detail. Conversation memory has moved from being a chain wrapper to being graph state with a checkpointer \u2014 which is 9.4 and 9.5, and which gets you durability, time travel and a pause point as well as history. The chain-level API still works and is what most existing code uses." }
    ] },
    { t: "p", text: "It is worth understanding this one anyway, for the same reason 3.3 writes the agent loop by hand: the graph version does the same job with more machinery, and knowing what the simple version does makes the richer one legible rather than magical." },
    { t: "h2", n: "03", id: "trim", text: "trim_messages", sub: "Four strategies, and one parameter that matters" },
    { t: "code", lang: "text", title: "Trimming a 17-message history",
      code: 'original: 17 messages\n\nlast 6 messages        -> 6 kept: S H A H A H\nlast 4 messages        -> 4 kept: S H A H\nfirst 5 messages       -> 5 kept: S H A H A\nlast 5, end on human   -> 4 kept: S H A H',
      caption: "S = system, H = human, A = ai. Note that the system message survives every strategy." },
    { t: "callout", kind: "insight", title: "include_system is the parameter that matters", body: [
      { t: "p", text: "The system message is usually the *oldest* message, so a naive \u201ckeep the last N\u201d drops it first. `include_system=True` pins it, which is almost always what you want \u2014 dropping the instructions to save a few tokens silently changes the behaviour of every subsequent turn." },
      { t: "p", text: "The failure is particularly nasty because it is gradual and correlated with conversation length: short conversations keep their instructions and behave correctly, long ones lose them and start drifting, so the symptom looks like \u201cthe model gets worse the longer you talk to it\u201d rather than like a bug." }
    ] },
    { t: "p", text: "`end_on=\"human\"` is the other parameter worth knowing. A history that ends on a tool call or an incomplete exchange can confuse the next turn, so trimming to a clean boundary is safer than trimming to an exact count \u2014 which is why the last row kept four messages rather than the five it was allowed." },
    { t: "h2", n: "04", id: "loses", text: "What each strategy loses", sub: "The decision this is really about" },
    { t: "table", head: ["Strategy", "Loses"], rows: [
      ["drop oldest (`last`)", "early facts: a name, an order id, a constraint stated once"],
      ["keep oldest (`first`)", "everything recent, which is usually what the question is about"],
      ["summarise", "specifics \u2014 numbers, names and exact wording become a paraphrase"],
      ["retrieve from history", "nothing, but adds a lookup and can retrieve the wrong turn"]
    ] },
    { t: "p", text: "`strategy=\"first\"` is listed for completeness and is almost never right for a conversation \u2014 it keeps the opening and discards everything the user has said since, which inverts the usual relevance ordering. It exists for cases where the beginning is the specification and the rest is working." },
    { t: "diagram", kind: "matrix", title: "Trimming strategies, and what each one loses",
      caption: "`RunnableWithMessageHistory` keys a store by `session_id` — config, not input, exactly as 2.9's test predicts. What it does not decide is which messages survive, and that choice is the one with consequences (13.3 measures them).",
      cols: ["per-turn cost", "what it loses"],
      rows: ["the full buffer", "last-k messages", "a token-budget trim", "a running summary"],
      cells: [
        [{ text: "grows every turn", tone: "crit" }, { text: "nothing — until the window", tone: "good" }],
        [{ text: "constant", tone: "good" }, { text: "the beginning, where the facts are", tone: "crit" }],
        [{ text: "bounded", tone: "good" }, { text: "the same, but by the right unit", tone: "warn" }],
        [{ text: "bounded + a call", tone: "warn" }, { text: "whatever the prompt omitted", tone: "warn" }]
      ] },
    { t: "exercise", kind: "build", title: "Wire history, then trim it",
      difficulty: "core", minutes: 26,
      body: "Wire a message store into a chain with RunnableWithMessageHistory and run three turns against one session, then inspect what was stored. Note the deprecation warning and what it points at. Then build a long history and trim it four ways, reporting which messages survive each strategy. Explain which parameter matters most and what each strategy loses.",
      requirements: ["A chain with a MessagesPlaceholder, wired to a per-session store",
        "Three turns against one session id, with the stored messages printed",
        "State why session_id is config rather than input",
        "Quote the deprecation warning and what it recommends",
        "Trim a 17-message history four ways and report what survives each",
        "Explain include_system and what dropping the system prompt does",
        "Tabulate what each strategy loses"],
      hint: "Show the message kinds rather than contents when comparing strategies \u2014 the shape is what differs. Watch what happens to the system message.",
      solution: { lang: "python", title: "x0306.py \u2014 store, key, trim",
        code: 'from langchain_core.runnables.history import RunnableWithMessageHistory\nfrom langchain_core.chat_history import InMemoryChatMessageHistory\nfrom langchain_core.messages import trim_messages\n\nstore = {}\ndef get_history(session_id: str):\n    if session_id not in store:\n        store[session_id] = InMemoryChatMessageHistory()\n    return store[session_id]\n\nwith_hist = RunnableWithMessageHistory(\n    prompt | model | StrOutputParser(), get_history,\n    input_messages_key="input", history_messages_key="history")\n\ncfg = {"configurable": {"session_id": "s1"}}\nfor i in range(1, 4):\n    with_hist.invoke({"input": "question %d" % i}, config=cfg)\n\nfor kw in (dict(max_tokens=6, strategy="last", token_counter=len, include_system=True),\n           dict(max_tokens=4, strategy="last", token_counter=len, include_system=True),\n           dict(max_tokens=5, strategy="first", token_counter=len),\n           dict(max_tokens=5, strategy="last", token_counter=len,\n                include_system=True, end_on="human")):\n    print(len(trim_messages(long_hist, **kw)))',
        out: "==============================================================================\nPART 1 -- RunnableWithMessageHistory wires history in\n==============================================================================\n  after 3 turns, stored messages: 6\n   Human:    question 1\n   AI:       ok 1\n   Human:    question 2\n   AI:       ok 2\n   Human:    question 3\n   AI:       ok 3\n\n  the session_id is config, not input -- 2.9's rule exactly. two\n  concurrent users differ on it and it is not part of the question.\n\n==============================================================================\nPART 2 -- trim_messages, four strategies\n==============================================================================\n  original: 17 messages\n\n  last 6 messages        -> 6 kept: S A H A H A\n  last 4 messages        -> 4 kept: S A H A\n  first 5 messages       -> 5 kept: S H A H A\n  last 5, end on human   -> 5 kept: S A H A H\n\n  S=system H=human A=ai. note include_system keeps the instructions\n  even when they are the oldest message, which is almost always right\n  -- dropping the system prompt to save tokens changes the behaviour\n  of every subsequent turn.\n\n==============================================================================\nPART 3 -- what each strategy loses\n==============================================================================\n  drop oldest (last)     early facts: the user's name, the order id, the constraint stated once\n  keep oldest (first)    everything recent, which is usually what the question is about\n  summarise              specifics -- numbers, names and exact wording become a paraphrase\n  retrieve from history  nothing, but adds a lookup and can retrieve the wrong turn\n\n  there is no strategy that loses nothing. the question is which loss\n  your application can tolerate, and that is a product decision --\n  module 13 makes it one with measurements attached.",
        notes: [
          { t: "p", text: "**Two messages stored per turn**, and the `session_id` goes in config \u2014 which is 2.9's rule applied exactly: two concurrent users differ on it and it is not part of the question." },
          { t: "p", text: "**The API is deprecated**, with the warning pointing at LangGraph's built-in persistence. Conversation memory has moved from a chain wrapper to graph state with a checkpointer, which additionally gets you durability, time travel and a pause point \u2014 9.4 and 9.5." },
          { t: "p", text: "**`include_system=True` is the parameter that matters.** The system message is usually the oldest, so a naive keep-the-last-N drops the instructions first \u2014 and that silently changes the behaviour of every subsequent turn." },
          { t: "p", text: "**That failure is gradual and correlated with length**: short conversations keep their instructions and behave, long ones drift. The symptom reads as \u2018the model gets worse the longer you talk to it\u2019 rather than as a bug, which is why it survives." },
          { t: "p", text: "**`end_on=\"human\"` trims to a clean boundary rather than an exact count** \u2014 the last row kept four of its five allowed messages, because ending on a dangling assistant turn or a tool call confuses the next request." },
          { t: "p", text: "**`strategy=\"first\"` is almost never right for a conversation**, since it keeps the opening and discards everything said since, inverting the usual relevance ordering. It exists for cases where the beginning is the specification and the rest is working." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the assistant that gets worse the longer you talk to it", body: [
      { t: "p", text: "Users report that an assistant starts well and degrades over a long session \u2014 it forgets its tone, stops following formatting rules, and eventually answers questions it was told to refuse. Short sessions are fine. Nothing is logged." },
      { t: "p", text: "The trimmer is dropping the system message. It is the oldest message in the list, so a keep-the-last-N strategy without `include_system=True` discards it first, and after that every turn runs without instructions." },
      { t: "p", text: "The reason it reads as model degradation rather than as a bug is the correlation with length \u2014 it looks exactly like a context-quality problem, which sends people to prompt engineering and model upgrades. The one-line fix is `include_system=True`; the general guard is a test that asserts the system message survives trimming at several history lengths, because this is not visible in any output and no error is raised." }
    ] }
  ],
  takeaways: [
    "**`RunnableWithMessageHistory` wires a store into a chain**, keyed by `session_id`.",
    "**`session_id` is config, not input** \u2014 2.9's test exactly: concurrent calls differ on it and it is not part of the question.",
    "**The API is deprecated**, pointing at LangGraph's built-in persistence (9.4).",
    "**Memory has moved from a chain wrapper to graph state with a checkpointer**, which also gets durability, time travel and a pause point.",
    "**Learn it anyway**, for the same reason 3.3 writes the agent loop by hand \u2014 it makes the richer version legible.",
    "**`include_system=True` is the parameter that matters**, because the system message is usually the oldest and gets dropped first.",
    "**Dropping the system prompt silently changes every subsequent turn.**",
    "**That failure is gradual and correlated with length**, so it reads as \u201cthe model gets worse the longer you talk\u201d rather than as a bug.",
    "**`end_on=\"human\"` trims to a clean boundary** rather than an exact count, avoiding a dangling turn.",
    "**`strategy=\"first\"` is almost never right for a conversation**, since it inverts the usual relevance ordering.",
    "**Test that the system message survives trimming** at several history lengths \u2014 nothing else will tell you."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why is `session_id` passed in config rather than in the input dict?",
      options: ["Because config values are cached between calls",
        "Because concurrent calls differ on it and it is not part of the question \u2014 2.9's test",
        "Because the input dict is reserved for prompt variables only",
        "Because it must be serialisable, and inputs need not be"],
      answer: 1,
      why: "It satisfies both halves of the rule: two concurrent users legitimately differ on it, and it is operational rather than part of what is being asked. Putting it in the input would interpolate it into the prompt as data the model sees, and the history lookup would not happen at all \u2014 so the mistake fails in two ways at once, one visible and one silent." },
    { stem: "What does `include_system=True` do, and why does it matter?",
      options: ["Adds a system message if none exists",
        "Pins the system message so trimming does not drop it, since it is usually the oldest",
        "Includes system messages in the token count",
        "Allows the system prompt to be rewritten during trimming"],
      answer: 1,
      why: "The system message sits at the start of the list, so a keep-the-last-N strategy discards it before anything else. Losing it silently changes the behaviour of every later turn, and the failure correlates with conversation length \u2014 short sessions keep their instructions and behave, long ones drift \u2014 so it reads as model degradation rather than as a bug and sends people to prompt engineering instead." },
    { stem: "What does the RunnableWithMessageHistory deprecation warning recommend?",
      options: ["Using trim_messages directly instead",
        "LangGraph's built-in persistence",
        "Managing history manually in the application layer",
        "Switching to the chat model's own memory parameter"],
      answer: 1,
      why: "Conversation memory has moved from a chain wrapper to graph state with a checkpointer, which is module 9. That version also provides durability across restarts, time-travel debugging and a pause point for human input \u2014 so it is a genuine supersession rather than a rename. The chain-level API still works and is what most existing code uses, which is why it is worth knowing." },
    { stem: "Which trimming strategy is almost never right for a conversation?",
      options: ["`last` with include_system", "`first`", "`last` with end_on='human'", "Any strategy with a token counter"],
      answer: 1,
      why: "`first` keeps the opening messages and discards everything said since, which inverts the relevance ordering of almost every conversation \u2014 the recent turns are usually what the current question is about. It exists for cases where the beginning is a specification and the rest is working through it, which is a real but narrow situation and not what a chat assistant looks like." }
  ] },
  interview: { title: "Interview practice", sub: "History and trimming", questions: [
    { level: "core", q: "How do you add conversation memory to a chain?",
      strong: "A strong answer wires it and then flags the supersession.",
      answer: [
        { t: "p", text: "A MessagesPlaceholder in the prompt for the history to go into, a per-session store, and RunnableWithMessageHistory to wire the two together \u2014 telling it which input key is the new message and which placeholder receives the history." },
        { t: "p", text: "The session id goes in config rather than in the input, which is the general rule: two concurrent users differ on it and it is not part of the question being asked. Putting it in the input would be wrong twice over \u2014 it would interpolate into the prompt as data the model sees, and the history lookup would not happen." },
        { t: "p", text: "I would flag that this API is deprecated. Running it emits a warning pointing at LangGraph's built-in persistence, because memory has moved from being a chain wrapper to being graph state with a checkpointer." },
        { t: "p", text: "That is a genuine supersession rather than a rename \u2014 the graph version also gives you durability across a restart, time-travel debugging and a pause point for human input. I would still learn the chain version, because it is what most existing code uses and because knowing the simple version is what makes the richer one legible." }
      ] },
    { level: "advanced", q: "An assistant gets worse the longer the conversation. What is your first hypothesis?",
      strong: "A strong answer goes to the dropped system message.",
      answer: [
        { t: "p", text: "That the trimmer is dropping the system message. It is the oldest message in the list, so a keep-the-last-N strategy without include_system discards it first, and after that every turn runs with no instructions at all." },
        { t: "p", text: "What makes it convincing as a hypothesis is the shape of the symptom. It correlates with length \u2014 short sessions are fine, long ones drift \u2014 and the drift is specifically about instruction-following: tone, formatting, refusals. Those are exactly the things the system prompt was carrying." },
        { t: "p", text: "And it reads as model degradation rather than as a bug, which is why it survives. People go to prompt engineering or a bigger model, both of which are reasonable responses to the symptom and neither of which touches the cause." },
        { t: "p", text: "The fix is include_system equals True, which is one parameter. The guard I would add is a test asserting the system message survives trimming at several history lengths, because nothing in the output reveals this and no error is ever raised." }
      ] },
    { level: "core", q: "What does end_on do, and when would you use it?",
      strong: "A strong answer is about clean boundaries rather than counts.",
      answer: [
        { t: "p", text: "It trims to a clean conversational boundary rather than to an exact message count. end_on human means the trimmed history stops after a human turn, so you may keep fewer messages than your budget allowed \u2014 in the run I did, it kept four of the five it was permitted." },
        { t: "p", text: "The reason it matters is that a history ending in the wrong place confuses the next request. If trimming cuts after an assistant message that was mid-exchange, or worse after a tool call whose result was dropped, the model sees a dangling turn and the transcript is arguably malformed." },
        { t: "p", text: "The tool-call case is the one I would call out specifically, because it connects to the protocol from 3.2. A tool call with no corresponding ToolMessage is rejected by the provider, so a trimmer that splits a call from its result does not degrade quality \u2014 it breaks the request outright." },
        { t: "p", text: "So I would use it by default in anything with tools, and treat the exact-count version as acceptable only for plain back-and-forth chat where there is nothing to split." }
      ] }
  ] }
});
