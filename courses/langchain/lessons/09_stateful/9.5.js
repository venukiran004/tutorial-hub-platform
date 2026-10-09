EC.receiveLesson({
  id: "9.5",
  lede: "`thread_id` is the conversation key, and it is **the only thing** separating two users' conversations \u2014 whatever the caller passes, with nothing validating it. The three ways that goes wrong are worth naming precisely, and the demonstration is blunt: two users invoking with `thread_id=\"default\"` produce one conversation, so the second user's model call saw the first user's message. The other measurement is the cost of memory working correctly: six turns wrote **13 checkpoints**, each containing the full history to that point \u2014 so storage is **quadratic in turns**, not linear. That one surprises people more than the context-window problem.",
  objectives: [
    "Show that thread_id is the conversation boundary",
    "Say what is scoped to a thread and what should not be",
    "Name the three ways multi-user scoping goes wrong",
    "Measure how a thread's storage grows with turns",
    "Explain why trimming is a node rather than a setting"
  ],
  prerequisites: ["9.4"],
  blocks: [
    { t: "h2", n: "01", id: "key", text: "thread_id is the conversation key", sub: "And the only boundary" },

    {"kind": "matrix", "title": "thread_id is the only thing separating two users", "caption": "Whatever the caller passes, with **nothing validating it**. Three ways that goes wrong, and all three are the same bug: an identifier chosen by the client is a security boundary chosen by the client.", "cols": ["what happens", "severity"], "rows": ["two users share an id", "an id is guessable", "an id is reused", "an id is omitted"], "cells": [[{"text": "they share a conversation", "tone": "crit"}, {"text": "data exposure", "tone": "crit"}], [{"text": "anyone can read the thread", "tone": "crit"}, {"text": "data exposure", "tone": "crit"}], [{"text": "the next user sees the history", "tone": "crit"}, {"text": "data exposure", "tone": "crit"}], [{"text": "no persistence at all", "tone": "warn"}, {"text": "silent memory loss", "tone": "warn"}]], "t": "diagram", "id": "dg-9_5-01-0"},




    { t: "code", lang: "text", title: "Three invocations across two threads",
      code: "thread=alice  sent 'hello'    -> 2 messages in state\nthread=alice  sent 'again'    -> 4 messages in state\nthread=bob    sent 'hi'       -> 2 messages in state\n\nthread=alice  [HumanMessage('hello'), AIMessage('you said: hello'),\n               HumanMessage('again'), AIMessage('you said: again')]\nthread=bob    [HumanMessage('hi'), AIMessage('you said: hi')]",
      caption: "Alice's second message landed in a four-message conversation; Bob's first in a two-message one." },
    { t: "h2", n: "02", id: "scoped", text: "What is scoped to a thread", sub: "Everything in the state" },
    { t: "p", text: "There is no per-thread and per-user distinction inside the state. The **whole** state is scoped to the `thread_id`, which means:" },
    { t: "dl", items: [
      ["conversation history", "correctly thread-scoped"],
      ["a user's preferences", "**wrongly** thread-scoped \u2014 forgotten when a new conversation starts"],
      ["a cached lookup", "wrongly thread-scoped \u2014 recomputed once per thread"]
    ] },
    { t: "callout", kind: "mental", title: "The tell is a key you would want to read from another thread", body: [
      { t: "p", text: "Anything that should outlive one conversation does not belong in graph state at all \u2014 that is what the Store is for (9.6). The test is simple: would you ever want to read this key while serving a *different* thread? If yes, it is in the wrong place." },
      { t: "p", text: "And 9.4's cost argument reinforces it: a preference in graph state is re-serialised on every superstep of every conversation forever, where in the store it is written once." }
    ] },
    { t: "h2", n: "03", id: "leak", text: "The three ways it goes wrong", sub: "And the mechanism is not subtle" },
    { t: "h3", text: "1. A thread_id that is not user-scoped" },
    { t: "code", lang: "python", title: "Taking the id from the request",
      code: 'thread_id = conversation_id      # from a URL, guessable',
      caption: "Anyone who can pass that id reads the conversation." },
    { t: "p", text: "Nothing validates a `thread_id` \u2014 it is a dictionary key. So the fix is to derive it server-side from the authenticated session and never from the request body, which makes the boundary an authorisation decision rather than a parameter." },
    { t: "h3", text: "2. A default thread_id" },
    { t: "code", lang: "text", title: "Two users, both with thread_id=\u201cdefault\u201d",
      code: "HumanMessage('user one secret')\nAIMessage('you said: user one secret')\nHumanMessage('user two question')\nAIMessage('you said: user two question')",
      caption: "User two's model call saw user one's message." },
    { t: "callout", kind: "warn", title: "A cross-user leak produced by a sensible-looking default", body: [
      { t: "p", text: "`thread_id=\"default\"` is what you write while developing, and it works. It is also a single shared conversation for every user of the system, so one user's private message is in the next user's prompt." },
      { t: "p", text: "This is 7.6's lesson in a different place: the context window is the trust boundary, and anything that reaches it reaches the model. Here the leak is not an injection \u2014 it is a dictionary key with a careless value." }
    ] },
    { t: "h3", text: "3. A missing checkpointer" },
    { t: "p", text: "9.4's failure: the `thread_id` is accepted, nothing is persisted, no error. This is the **opposite** bug \u2014 the leak is absent and so is the memory \u2014 and it hides the other two during testing, because a system that remembers nothing cannot leak anything." },
    { t: "h2", n: "04", id: "growth", text: "The history grows without limit", sub: "And storage is quadratic" },
    { t: "code", lang: "text", title: "Six turns",
      code: "after 6 turns: 12 messages in state\ncheckpoints for the thread: 13",
      caption: "Each checkpoint contains the full history up to that point." },
    { t: "callout", kind: "insight", title: "Two consequences, biting at different times", body: [
      { t: "p", text: "The first is familiar: the model call grows until it exceeds the context window (7.3). The second is the one that surprises people \u2014 **every checkpoint serialises the whole history**, so storage is quadratic in turns rather than linear." },
      { t: "p", text: "Six turns wrote 13 checkpoints, each holding the conversation to that point. At a hundred turns that is not a hundred messages stored, it is the sum of the first hundred prefixes." }
    ] },
    { t: "p", text: "`add_messages` appends, so nothing removes anything. Memory working correctly and storage growing quadratically are the same mechanism \u2014 which is why trimming is not an optional optimisation." },
    { t: "h2", n: "05", id: "trimming", text: "Trimming is a node, not a setting", sub: "And it has two shapes" },
    { t: "dl", items: [
      ["keep the last N turns", "A node that returns a message list with the old ones removed. Simple, and it loses the beginning of the conversation \u2014 including anything the user said once and expects to be remembered."],
      ["summarise older turns", "A node that replaces a run of old messages with one summary message. This is what 8.3's **id-based replacement** in `add_messages` is for \u2014 you are editing history, not appending to it."]
    ] },
    { t: "p", text: "Both are nodes in the graph, which means they are also places where a decision gets made and can be got wrong. A trimming node that drops a tool call but keeps its `ToolMessage` leaves the history malformed \u2014 so trimming has to respect message pairing, which is the detail that makes the naive version fail." },
    { t: "exercise", kind: "build", title: "Scope conversations, then break the scoping",
      difficulty: "core", minutes: 28,
      body: "Run a graph across two thread_ids and confirm each conversation accumulates independently. Then say what is scoped to a thread and give the test for whether a key belongs there. Demonstrate the default-thread_id leak with two users. Name the three ways multi-user scoping goes wrong, including the one that hides the others. Finally run several turns on one thread and measure both the message count and the checkpoint count, and explain what that means for storage.",
      requirements: ["Run two threads and show each accumulating independently",
        "State what is scoped to a thread and give the test for a misplaced key",
        "Demonstrate two users sharing a default thread_id",
        "Name three ways multi-user scoping goes wrong",
        "Explain which one hides the others and why",
        "Measure messages and checkpoints after several turns",
        "Explain why storage is quadratic in turns",
        "Give two trimming strategies and the detail that makes the naive one fail"],
      hint: "Count the checkpoints as well as the messages. The checkpoint count is where the surprising cost is.",
      solution: { lang: "python", title: "x0905.py \u2014 6 turns, 13 checkpoints",
        code: 'for tid, text in (("alice", "hello"), ("alice", "again"), ("bob", "hi")):\n    cfg = {"configurable": {"thread_id": tid}}\n    res = app.invoke({"messages": [HumanMessage(content=text)]}, cfg)\n    print(tid, len(res["messages"]))\n\n# the default-thread_id leak\ncfgd = {"configurable": {"thread_id": "default"}}\napp.invoke({"messages": [HumanMessage(content="user one secret")]}, cfgd)\napp.invoke({"messages": [HumanMessage(content="user two question")]}, cfgd)\nprint(app.get_state(cfgd).values["messages"])    # one shared conversation\n\n# and the growth\ncfgh = {"configurable": {"thread_id": "long"}}\nfor i in range(6):\n    app.invoke({"messages": [HumanMessage(content="turn %d" % i)]}, cfgh)\nprint(len(app.get_state(cfgh).values["messages"]),\n      len(list(app.get_state_history(cfgh))))',
        out: "==============================================================================\nPART 1 -- thread_id is the conversation key\n==============================================================================\n  thread=alice  sent 'hello'  -> 2 messages in state\n  thread=alice  sent 'again'  -> 4 messages in state\n  thread=bob    sent 'hi'     -> 2 messages in state\n\n  alice's second message landed in a 4-message conversation; bob's\n  first landed in a 2-message one. the thread_id is the only thing\n  separating them.\n\n  thread=alice  [\"HumanMessage('hello')\", \"AIMessage('you said: hello')\", \"HumanMessage('again')\", \"AIMessage('you said: again')\"]\n  thread=bob    [\"HumanMessage('hi')\", \"AIMessage('you said: hi')\"]\n==============================================================================\nPART 2 -- what is scoped to a thread -- everything in the state\n==============================================================================\n  there is no per-thread and per-user distinction in the state. the\n  WHOLE state is scoped to the thread_id, which means:\n\n    - conversation history   correctly thread-scoped\n    - a user's preferences   WRONGLY thread-scoped (9.6)\n    - a cached lookup        wrongly thread-scoped, recomputed per thread\n\n  so anything that should outlive one conversation does not belong\n  in graph state at all. that is what the Store is for (9.6), and the\n  tell is a key you would want to read from a DIFFERENT thread.\n==============================================================================\nPART 3 -- the multi-user mistake\n==============================================================================\n  the leak is not subtle once you see the mechanism: thread_id is\n  whatever the caller passes, and nothing validates it.\n\n  the three ways it goes wrong:\n\n  1. a thread_id that is not user-scoped\n       thread_id = conversation_id            <- from a URL, guessable\n     anyone who can pass that id reads the conversation. the fix is\n     to derive it server-side from the authenticated session, never\n     from the request body.\n\n  2. a DEFAULT thread_id\n     two users, both with thread_id='default':\n       HumanMessage('user one secret')\n       AIMessage('you said: user one secret')\n       HumanMessage('user two question')\n       AIMessage('you said: user two question')\n     user two's model call saw user one's message. that is a\n     cross-user leak produced by a sensible-looking default.\n\n  3. a MISSING checkpointer (9.4)\n     thread_id accepted, nothing persisted, no error -- so the leak\n     is absent and so is the memory. this one is the opposite bug\n     and it hides the other two during testing.\n==============================================================================\nPART 4 -- the history grows without limit\n==============================================================================\n  after 6 turns: 12 messages in state\n  checkpoints for the thread: 18\n\n  add_messages appends, so nothing removes anything. two consequences\n  that bite at different times:\n\n    - the model call grows until it exceeds the context window (7.3)\n    - every checkpoint serialises the whole history, so storage is\n      quadratic in turns, not linear\n\n  the second one surprises people. 6 turns wrote 18 checkpoints, each\n  containing the full history up to that point.\n\n  so short-term memory needs a trimming strategy, and it is a node\n  in the graph rather than a setting: keep the last N turns, or\n  summarise older ones into a single message, which is what the\n  message-id replacement in add_messages (8.3) is for.",
        notes: [
          { t: "p", text: "**`thread_id` is the conversation key and the only boundary** \u2014 whatever the caller passes, with nothing validating it." },
          { t: "p", text: "**The WHOLE state is thread-scoped**, so conversation history belongs there and a user's preferences do not \u2014 the test is whether you would ever read the key while serving a different thread." },
          { t: "p", text: "**Two users with `thread_id=\"default\"` share one conversation**: the second user's model call saw the first user's message." },
          { t: "p", text: "**A guessable `thread_id` is a read of someone else's conversation**, so derive it server-side from the authenticated session, never from the request body." },
          { t: "p", text: "**The missing checkpointer is the opposite bug** \u2014 no leak and no memory \u2014 and it hides the other two during testing, because a system that remembers nothing cannot leak." },
          { t: "p", text: "**Six turns produced 12 messages and 13 checkpoints**, each containing the full history to that point." },
          { t: "p", text: "**So storage is quadratic in turns, not linear** \u2014 the sum of the prefixes rather than the final list. That surprises people more than the context-window problem." },
          { t: "p", text: "**Trimming is a node, not a setting**: keep the last N turns, or summarise older ones using `add_messages`' id-based replacement (8.3) \u2014 and it must respect message pairing or the history is left malformed." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the demo thread_id that shipped", body: [
      { t: "p", text: "A prototype uses `thread_id=\"default\"` so the developer can keep re-running it. It ships. Users begin seeing fragments of other people's conversations in answers, and the symptom is intermittent and impossible to reproduce on a quiet system." },
      { t: "p", text: "Every user shares one conversation, so the leak rate is proportional to concurrency \u2014 invisible with one tester and constant under load. There is no injection and no bug in any node: the state was correctly scoped to the thread it was told to use." },
      { t: "p", text: "Two things would have prevented it. Derive the `thread_id` server-side from the authenticated session, so a literal is impossible to pass. And make the thread id a required argument with no default anywhere in the code path, so the prototype cannot omit it \u2014 which is the general principle: a boundary with a convenient default is a boundary that will be crossed, and the fix belongs in the signature rather than in a review." }
    ] }
  ],
  takeaways: [
    "**`thread_id` is the conversation key and the only boundary**, with nothing validating it.",
    "**The whole state is thread-scoped** \u2014 there is no per-user scope inside it.",
    "**The test for a misplaced key**: would you read it while serving a different thread?",
    "**If yes it belongs in the Store** (9.6), and 9.4's per-superstep cost argues the same way.",
    "**Two users with `thread_id=\"default\"` share one conversation** \u2014 a measured cross-user leak.",
    "**A guessable `thread_id` is a read of someone else's conversation.**",
    "**So derive it server-side from the authenticated session, never from the request body.**",
    "**A missing checkpointer is the opposite bug** \u2014 no leak and no memory.",
    "**And it hides the other two in testing**, because a system that remembers nothing cannot leak.",
    "**Six turns produced 12 messages and 13 checkpoints**, each holding the full history to that point.",
    "**So storage is quadratic in turns**, not linear \u2014 the sum of the prefixes.",
    "**Memory working and storage growing quadratically are the same mechanism.**",
    "**Trimming is a node, not a setting**: last N turns, or summarise with id-based replacement.",
    "**And it must respect message pairing**, or a dropped tool call leaves a stranded `ToolMessage`.",
    "**A boundary with a convenient default will be crossed** \u2014 fix it in the signature."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What separates two users' conversations in a LangGraph application?",
      options: ["The checkpointer's per-user namespace",
        "Only the thread_id \u2014 whatever the caller passes, with nothing validating it",
        "The state schema's user key",
        "The store's namespace tuple"],
      answer: 1,
      why: "A thread_id is effectively a dictionary key into the checkpointer, and the entire state is scoped to it. Nothing checks that the caller is entitled to that thread, so a guessable or shared id is a direct read of someone else's conversation. That makes deriving it server-side from an authenticated session an authorisation decision rather than a convenience." },
    { stem: "Six turns on one thread produced 13 checkpoints. What does that imply for storage?",
      options: ["Storage is linear in turns, at roughly two checkpoints per turn",
        "Storage is quadratic \u2014 each checkpoint holds the full history to that point, so the total is the sum of the prefixes",
        "Only the latest checkpoint is retained, so storage is constant",
        "Checkpoints store deltas, so the growth is negligible"],
      answer: 1,
      why: "Each checkpoint serialises the whole state including the entire message list as it stood at that step. So a hundred-turn conversation does not store a hundred messages; it stores the sum of the first hundred prefixes. This is the same mechanism that makes conversational memory work, which is why trimming is structural rather than an optimisation." },
    { stem: "Which multi-user mistake hides the other two during testing?",
      options: ["A guessable thread_id taken from a URL",
        "A missing checkpointer \u2014 nothing persists, so nothing can leak",
        "A default thread_id shared by all users",
        "Storing user preferences in graph state"],
      answer: 1,
      why: "With no checkpointer the thread_id is accepted and ignored, so no state is retained and cross-user leakage is impossible by construction. Tests pass and the scoping bugs stay dormant until a durable saver is added \u2014 at which point both the memory and the leak appear together, which is a confusing moment to discover the scoping was never right." },
    { stem: "Where do a user's preferences belong, and why not in graph state?",
      options: ["In graph state, since every node needs them",
        "In the Store \u2014 graph state is thread-scoped, so preferences would be forgotten each new conversation and re-serialised every superstep",
        "In the system prompt, regenerated per request",
        "In the checkpointer's metadata"],
      answer: 1,
      why: "The whole state is scoped to one thread_id, so a preference written in one conversation is invisible in the next. It would also be serialised on every superstep of every conversation, per 9.4's measurement. The test that generalises is whether you would ever want to read the key while serving a different thread \u2014 if so, it is in the wrong place." }
  ] },
  interview: { title: "Interview practice", sub: "Threads and short-term memory", questions: [
    { level: "core", q: "How does conversational memory work in LangGraph?",
      strong: "A strong answer names the two mechanisms and their consequence.",
      answer: [
        { t: "p", text: "It is a checkpointer plus a reducer. There is no separate memory feature." },
        { t: "p", text: "The checkpointer persists the state against a thread_id, so invoking that thread again starts from the persisted state. The reducer on the message key appends, so the new turn is added to the history that came back. The model's next call then sees the whole conversation." },
        { t: "p", text: "Which means memory and unbounded growth are the same mechanism. I measured six turns producing twelve messages and thirteen checkpoints, each checkpoint holding the full history to that point \u2014 so storage is quadratic in turns, not linear. That surprises people more than the context-window problem does." },
        { t: "p", text: "So trimming is structural rather than an optimisation, and it is a node in the graph: either keep the last N turns, or summarise older ones into a single message. The second is what add_messages' id-based replacement is for, since you are editing history rather than appending to it." }
      ] },
    { level: "advanced", q: "What would you check in a multi-tenant LangGraph deployment?",
      strong: "A strong answer treats thread_id as an authorisation decision.",
      answer: [
        { t: "p", text: "Where the thread_id comes from, first and mainly. It is the only thing separating two users' conversations and nothing validates it \u2014 it is effectively a dictionary key into the checkpointer." },
        { t: "p", text: "So I would want it derived server-side from the authenticated session, never taken from a request body or a URL. If a conversation id from a URL is used directly, anyone who can pass that id reads the conversation, and that is an authorisation bug rather than a framework one." },
        { t: "p", text: "Then I would grep for literal thread ids. A default like 'default' is what you write while prototyping and it works perfectly \u2014 and it is one shared conversation for every user of the system. I measured that: two users invoking with the same default produced a single four-message conversation, so the second user's model call contained the first user's message. The leak rate is proportional to concurrency, so it is invisible with one tester." },
        { t: "p", text: "I would make the thread id a required argument with no default anywhere in the code path, because a boundary with a convenient default is a boundary that gets crossed \u2014 the fix belongs in the signature rather than in a code review." },
        { t: "p", text: "And I would check whether anything user-scoped rather than conversation-scoped has ended up in graph state, since the whole state is thread-scoped. Preferences there are both forgotten between conversations and re-serialised on every superstep." }
      ] },
    { level: "core", q: "How would you manage a conversation that gets too long?",
      strong: "A strong answer makes trimming a node and respects pairing.",
      answer: [
        { t: "p", text: "A trimming node in the graph, before the model call, with the strategy chosen from what the conversation needs \u2014 and respecting message pairing, which is the detail that makes the naive version fail." },
        { t: "p", text: "Two shapes. Keep the last N turns, which is simple and loses the beginning \u2014 including anything the user said once and expects to be remembered. Or summarise older turns into one message, which preserves the gist and is what add_messages' id-based replacement is for, since you are editing history rather than appending to it." },
        { t: "p", text: "The pairing constraint is the part people get wrong: dropping an AIMessage that contained tool calls while keeping its ToolMessage leaves a result with no request, and providers reject that. So the trim has to operate on turn boundaries rather than on a message count." },
        { t: "p", text: "There are two pressures to manage, not one. The obvious one is the context window. The less obvious one is storage: I measured six turns producing thirteen checkpoints, each holding the full history to that point \u2014 so storage is quadratic in turns, not linear." },
        { t: "p", text: "Trimming helps both, which is worth knowing because the storage cost is usually the one nobody has budgeted for and it grows faster than anyone expects." }
      ] }
  ] }
});
