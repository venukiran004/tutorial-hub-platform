EC.receiveLesson({
  id: "12.7",
  lede: "Three options, in increasing isolation: **shared state**, where every agent reads and writes one message list; **filtered state**, where each agent receives a constructed view; and **message passing**, necessary once they are separate services. Measured: with shared state, agent B received the human's message *and* A's output \u2014 context for free, and A's working notes in B's prompt. With `Send`, the worker saw `keys=['piece']` and **not** the parent's `secret`. And the attribution problem is sharp: without the `name` field a later agent sees a sequence of assistant turns with no idea which agent produced which, which makes 12.8's blame question unanswerable.",
  objectives: [
    "Compare the three channels by isolation",
    "Show what shared state gives an agent and what it costs",
    "Use Send as an isolation boundary between agents",
    "Explain the attribution problem and its fix",
    "Decide what the payload is once agents are separate services"
  ],
  prerequisites: ["12.2", "10.2", "10.9"],
  blocks: [
    { t: "h2", n: "01", id: "three", text: "Three options", sub: "In increasing isolation" },

    {"kind": "layers", "title": "Three options, in increasing isolation", "caption": "The question each one answers is what a downstream agent can **tell apart**. In a shared message list a retrieved quotation and a hedged guess have the same form — both are assistant turns — so provenance has to be structure rather than prose.", "items": [{"label": "shared state", "sub": "every agent reads and writes one message list", "tone": "warn", "side": "no isolation"}, {"label": "filtered state", "sub": "each agent receives a constructed view", "tone": "good", "side": "some"}, {"label": "message passing", "sub": "necessary once they are separate services", "tone": "accent", "side": "full"}], "t": "diagram", "id": "dg-12_7-01-0"},




    { t: "dl", items: [
      ["**shared state**", "Every agent reads and writes one message list. Simplest, and every agent's output is in every later agent's prompt whether relevant or not."],
      ["**filtered state**", "Each agent receives a constructed view \u2014 10.2's `Send`, which gives a worker exactly what you passed and nothing else."],
      ["**message passing**", "Agents exchange explicit payloads and share no state. Necessary once they are separate services."]
    ] },
    { t: "h2", n: "02", id: "shared", text: "Shared state", sub: "Context for free, and paid for" },
    { t: "code", lang: "text", title: "What B saw",
      code: "b saw ['HumanMessage', 'a']",
      caption: "B received the human's message **and** A's output." },
    { t: "callout", kind: "tradeoff", title: "Both halves are real", body: [
      { t: "p", text: "The benefit is context for free: B knows what the human asked and what A found, without anyone designing a payload. That is why shared state is the right default inside one graph." },
      { t: "p", text: "The cost is that A's working notes are in B's prompt and B pays for them \u2014 and 12.2 noted this compounds across a supervisor loop, since every worker's output reaches every later worker." }
    ] },
    { t: "h2", n: "03", id: "filtered", text: "Filtered state with Send", sub: "An isolation boundary" },
    { t: "code", lang: "text", title: "What the worker received",
      code: "worker saw keys=['piece']",
      caption: "**Not** `secret`, which was in the parent state." },
    { t: "p", text: "So `Send` is the mechanism for agent-to-agent isolation **inside one graph**, and it is the right default when one agent's context should not reach another \u2014 which is 12.1's second structural reason for splitting agents at all." },
    { t: "h2", n: "04", id: "attribution", text: "The attribution problem", sub: "And its one-field fix" },
    { t: "code", lang: "text", title: "With and without the name field",
      code: "name=None   HumanMessage('task')\nname='a'    AIMessage('A: found 3 sources')\nname='b'    AIMessage('B: summarised')",
      caption: "Without `name`, those two `AIMessage`s are indistinguishable." },
    { t: "callout", kind: "insight", title: "It matters for two different reasons", body: [
      { t: "p", text: "An agent cannot **weigh** information it cannot attribute. A claim from the retrieval agent and a guess from the summarising agent should not carry equal authority, and without `name` they are both just assistant turns." },
      { t: "p", text: "And 12.8's blame problem is unanswerable without it: when the output is wrong, *\u201cwhich agent said that\u201d* has to be answerable from the history. Nothing in the runtime sets `name`, so it is a deliberate choice every agent has to make." }
    ] },
    { t: "h2", n: "05", id: "services", text: "Once they are separate services", sub: "10.9's three concerns, unchanged" },
    { t: "table", head: ["concern", "here"], rows: [
      ["serialisation", "the payload must be JSON-able. A LangChain message object is; a graph's full state with reducers is not."],
      ["latency", "a hop per handoff, on every handoff"],
      ["failure", "the other agent can be absent, slow, or crash mid-call \u2014 and 10.9 measured a crash returning an **empty line** rather than an error"]
    ] },
    { t: "p", text: "So the design question becomes what the payload **is**, and there are two options:" },
    { t: "table", head: ["payload", "property"], rows: [
      ["the whole conversation", "simple, and it grows without bound and crosses the wire every hop"],
      ["a task-specific payload", "bounded, and the receiving agent lacks context it might need"]
    ] },
    { t: "callout", kind: "good", title: "The second is almost always right", body: [
      { t: "p", text: "And it makes 12.8's context loss a **design decision** rather than an accident \u2014 you choose what to drop instead of discovering what was missing." },
      { t: "p", text: "The refinement that makes it workable is to send the **conversation id** alongside the task payload, so the receiving agent can fetch history if it needs it. That keeps the wire small and makes the context *available* rather than copied." }
    ] },
    { t: "h2", n: "06", id: "recommend", text: "The practical recommendation", sub: "Two settings" },
    { t: "p", text: "**Inside one graph**: shared state for the conversation, `Send` for anything a worker should not see, and `name` on every message so attribution survives." },
    { t: "p", text: "**Across services**: an explicit task payload with a schema, plus the conversation id so the receiving side can fetch history. And whichever you choose, **record the handoff itself** \u2014 who handed to whom and why, which is the trace 12.8 needs and the reason 8.8 argued for `Command` carrying the reason with the destination." },
    { t: "exercise", kind: "build", title: "Compare the three channels",
      difficulty: "advanced", minutes: 30,
      body: "Build two agents sharing one message list and report what the second one received. Then fan out with Send from a state containing a key the worker should not see, and report which keys the worker got. Show the message list with and without the name field and explain the two reasons attribution matters. Finally say what changes once the agents are separate services, and decide what the payload should be.",
      requirements: ["Build two agents on shared state and report what the second received",
        "State both halves of the shared-state trade",
        "Use Send and report which keys the worker received",
        "Show the attribution problem and its fix",
        "Give two distinct reasons the name field matters",
        "List what changes once agents are separate services",
        "Choose a payload design and justify it"],
      hint: "Have the second agent report the names of the messages it received. What is missing without the name field is the point.",
      solution: { lang: "python", title: "x1207.py \u2014 keys=['piece'], not 'secret'",
        code: '# shared state: B sees A\'s output\ndef b1(state):\n    seen = [getattr(m, "name", None) or type(m).__name__\n            for m in state["messages"]]\n    return {"messages": [AIMessage(content="B: summarised", name="b")],\n            "trace": ["b saw %s" % seen]}\n\n# filtered state: Send gives the worker only what you passed\ndef fan(state):\n    return [Send("w", {"piece": "p1"})]\n\ndef w(state):\n    return {"results": ["worker saw keys=%s" % sorted(state.keys())]}',
        out: "==============================================================================\nPART 1 -- what agents actually pass each other\n==============================================================================\n  three options, in increasing isolation:\n\n  1. SHARED STATE. every agent reads and writes one message list.\n     simplest, and every agent's output is in every later agent's\n     prompt whether relevant or not (12.2).\n\n  2. FILTERED STATE. each agent receives a constructed view --\n     10.2's Send, which gives a worker exactly what you passed and\n     nothing else.\n\n  3. MESSAGE PASSING. agents exchange explicit payloads and share no\n     state. necessary once they are separate services.\n\n  shared state -- what B saw:\n    b saw ['HumanMessage', 'a']\n\n  B received the human's message AND A's output. which is the\n  benefit (context for free) and the cost (A's working notes are in\n  B's prompt, and B pays for them).\n==============================================================================\nPART 2 -- filtered state with Send\n==============================================================================\n    worker saw keys=['piece']\n\n  the worker did NOT get 'secret'. so Send is the mechanism for\n  agent-to-agent isolation inside one graph, and it is the right\n  default when one agent's context should not reach another --\n  which is 12.1's second reason for splitting agents at all.\n==============================================================================\nPART 3 -- the attribution problem\n==============================================================================\n  with shared state, every agent writes AIMessages into one list. so\n  without the `name` field a later agent sees a sequence of\n  assistant turns with no idea which agent produced which:\n\n    name=None   HumanMessage('task')\n    name='a'    AIMessage('A: found 3 sources')\n    name='b'    AIMessage('B: summarised')\n\n  which matters for two reasons. an agent cannot weigh information\n  it cannot attribute. and 12.8's blame problem is unanswerable\n  without it -- when the output is wrong, 'which agent said that'\n  has to be answerable from the history.\n==============================================================================\nPART 4 -- once they are separate services\n==============================================================================\n  shared state stops being available, so the question becomes a\n  protocol question -- and 10.9's three concerns apply unchanged:\n\n    SERIALISATION  the payload must be JSON-able. a LangChain\n                   message object is, which is convenient; a\n                   graph's full state with reducers is not.\n    LATENCY        a hop per handoff, on every handoff\n    FAILURE        the other agent can be absent, slow, or crash\n                   mid-call -- and 10.9 measured a crash returning\n                   an EMPTY LINE rather than an error\n\n  so the design question is what the payload IS. the two options:\n\n    the whole conversation   simple, and it grows without bound and\n                             crosses the wire every hop\n    a task-specific payload  bounded, and the receiving agent lacks\n                             context it might need\n\n  the second is almost always right, and it makes 12.8's context\n  loss a design decision rather than an accident -- you choose what\n  to drop instead of discovering what was missing.\n==============================================================================\nPART 5 -- the practical recommendation\n==============================================================================\n  inside one graph: shared state for the conversation, Send for\n  anything a worker should not see, and `name` on every message so\n  attribution survives.\n\n  across services: an explicit task payload with a schema, plus the\n  conversation id so the receiving side can fetch history if it\n  needs it. that keeps the wire small and makes the context\n  available rather than copied.\n\n  and whichever you choose, record the handoff itself -- who handed\n  to whom and why. that is the trace 12.8 needs, and the reason 8.8\n  argued for Command carrying the reason with the destination.",
        notes: [
          { t: "p", text: "**Three channels in increasing isolation**: shared state, filtered state via `Send`, and message passing across services." },
          { t: "p", text: "**With shared state B received the human's message and A's output** \u2014 context for free, with A's working notes in B's prompt." },
          { t: "p", text: "**Which is why shared state is the right default inside one graph**, and why the cost compounds across a supervisor loop (12.2)." },
          { t: "p", text: "**With `Send` the worker saw `keys=['piece']` and not `secret`** \u2014 so `Send` is the isolation boundary inside one graph." },
          { t: "p", text: "**Which is 12.1's second structural reason for splitting agents**, enforced rather than requested." },
          { t: "p", text: "**Without `name`, two agents' `AIMessage`s are indistinguishable** \u2014 and nothing in the runtime sets it." },
          { t: "p", text: "**It matters twice**: an agent cannot weigh information it cannot attribute, and 12.8's blame question needs it to be answerable." },
          { t: "p", text: "**Across services, 10.9's three concerns apply unchanged** \u2014 serialisation, a hop per handoff, and a crash returning an empty line rather than an error." },
          { t: "p", text: "**Send a task payload plus the conversation id**, which keeps the wire small and makes context available rather than copied \u2014 turning context loss into a design decision." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that trusted a guess", body: [
      { t: "p", text: "A research agent retrieves sources and a writing agent composes the answer, sharing one message list. The writer occasionally states something the retriever had explicitly flagged as uncertain, presenting it as established fact." },
      { t: "p", text: "The messages carry no `name`, so from the writer's perspective the history is a sequence of assistant turns \u2014 a retrieved quotation and a hedged speculation look identical in form. It cannot weigh what it cannot attribute, so it treats both as prior context of equal standing." },
      { t: "p", text: "Setting `name` on each agent's messages is the minimum fix and lets the writer's prompt distinguish sources from working notes. The stronger version is to stop using the shared list as the channel for findings: pass retrieved sources as a structured state key with their provenance, and keep the message list for the conversation. That makes the distinction structural rather than something the writer has to infer from text \u2014 which is 5.7's citation argument applied between agents instead of between a model and a corpus." }
    ] }
  ],
  takeaways: [
    "**Three channels in increasing isolation**: shared state, `Send`-filtered state, message passing.",
    "**Shared state gave B the human's message and A's output** \u2014 context for free.",
    "**And A's working notes are in B's prompt**, paid for again, compounding across a loop.",
    "**`Send` gave the worker `keys=['piece']` and not `secret`.**",
    "**So `Send` is the isolation boundary inside one graph**, enforcing 12.1's second reason.",
    "**Without `name`, two agents' messages are indistinguishable**, and the runtime does not set it.",
    "**It matters twice**: weighing information, and answering 12.8's blame question.",
    "**An agent cannot weigh information it cannot attribute.**",
    "**Across services, 10.9's three concerns apply**: serialisation, a hop per handoff, and silent crashes.",
    "**A whole-conversation payload is simple and grows without bound.**",
    "**A task payload is bounded and drops what the sender did not think to include.**",
    "**Send a task payload plus the conversation id**, making context available rather than copied.",
    "**Which turns context loss into a design decision** rather than an accident.",
    "**Record the handoff itself** \u2014 who handed to whom and why (8.8).",
    "**Pass findings as structured state with provenance**, not as prose in a shared list."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A worker fanned out with Send from a state containing a `secret` key received which keys?",
      options: ["All the parent's keys plus the Send payload",
        "Only the keys the Send passed \u2014 the worker saw keys=['piece']",
        "The parent's keys, filtered by the worker's schema",
        "An empty state; the payload arrives as an argument"],
      answer: 1,
      why: "The second argument to Send is the worker's whole state, so nothing from the parent leaks in. That makes Send the mechanism for agent-to-agent isolation inside one graph, and it enforces a boundary rather than requesting one \u2014 which matters when the reason for splitting agents was that one agent's context should not reach another." },
    { stem: "Why does the `name` field on agent messages matter in two distinct ways?",
      options: ["For routing and for checkpointing",
        "An agent cannot weigh information it cannot attribute, and 'which agent said that' must be answerable when the output is wrong",
        "For token counting and for trimming",
        "For deduplication and for ordering"],
      answer: 1,
      why: "Without attribution, a retrieved quotation and a hedged speculation appear identically as assistant turns, so a later agent treats them as equally authoritative. And when the final output is wrong, assigning it to a step requires knowing which agent produced which message. Nothing in the runtime sets name, so each agent must set it deliberately." },
    { stem: "Once agents are separate services, what should the handoff payload be?",
      options: ["The whole conversation, so nothing is lost",
        "A task-specific payload plus the conversation id, so context is available rather than copied",
        "Only the task payload, keeping the wire minimal",
        "The full graph state including reducers"],
      answer: 1,
      why: "A whole-conversation payload grows without bound and crosses the wire on every hop. A bare task payload is bounded but drops whatever the sender did not anticipate needing. Including the conversation id lets the receiver fetch history when required, which keeps the wire small and turns context loss into a design decision rather than an accident." },
    { stem: "A writing agent presents a retriever's flagged uncertainty as established fact. What is the structural fix?",
      options: ["Instruct the writer to be more careful in its prompt",
        "Pass retrieved findings as a structured state key with provenance, keeping the message list for conversation",
        "Give the writer its own retrieval tool",
        "Run the writer twice and compare"],
      answer: 1,
      why: "In a shared message list a quotation and a speculation have the same form, so the writer has to infer the distinction from text. Carrying findings in a structured key with their provenance makes the difference available rather than inferred \u2014 the same argument citations make between a model and a corpus, applied between two agents. Setting name is the minimum; this is the robust version." }
  ] },
  interview: { title: "Interview practice", sub: "Agent-to-agent communication", questions: [
    { level: "core", q: "What do agents actually pass each other?",
      strong: "A strong answer gives three options ordered by isolation.",
      answer: [
        { t: "p", text: "Three options, and I would order them by isolation. Shared state, where every agent reads and writes one message list. Filtered state, where each agent gets a constructed view. And message passing with no shared state, which becomes necessary once they are separate services." },
        { t: "p", text: "Inside one graph, shared state is the right default. I measured it: the second agent received the human's message and the first agent's output without anyone designing a payload. The cost is that the first agent's working notes are in the second's prompt, and that compounds across a supervisor loop because every worker's output reaches every later worker." },
        { t: "p", text: "Where one agent's context should not reach another, Send is the mechanism. I fanned out from a state containing a secret key and the worker saw only the key I passed \u2014 so it enforces the boundary rather than requesting it, which matters if the reason for splitting the agents was isolation in the first place." },
        { t: "p", text: "And whichever channel I use, I would set the name field on every message. Without it two agents' outputs are indistinguishable assistant turns." }
      ] },
    { level: "advanced", q: "What changes when the agents become separate services?",
      strong: "A strong answer treats it as a payload design question.",
      answer: [
        { t: "p", text: "Shared state stops being available, so it becomes a protocol question \u2014 and the same three concerns as any out-of-process call apply: serialisation, a hop per handoff, and a wider failure set including a crash that returns nothing rather than an error." },
        { t: "p", text: "The serialisation constraint shapes the design immediately. A LangChain message object is JSON-able, which is convenient; a graph's full state with reducers is not. So the payload has to be something you chose." },
        { t: "p", text: "Then there are two options and one of them is almost always right. Sending the whole conversation is simple and grows without bound, crossing the wire on every hop. Sending a task-specific payload is bounded, and drops whatever the sender did not think to include." },
        { t: "p", text: "I would take the task payload plus the conversation id, so the receiving agent can fetch history if it needs it. That keeps the wire small and makes the context available rather than copied \u2014 and it converts context loss from an accident into a design decision, because you are choosing what to omit." },
        { t: "p", text: "And I would record the handoff itself: who handed to whom and why. That is the trace you need when the output is wrong, and it is the reason a handoff mechanism should carry its reason alongside its destination." }
      ] },
    { level: "core", q: "How would you pass retrieved documents between agents?",
      strong: "A strong answer carries provenance as structure, not prose.",
      answer: [
        { t: "p", text: "As a structured state key with provenance on each document, not as prose in the shared message list." },
        { t: "p", text: "The reason is that in a message list a retrieved quotation and a hedged speculation have the same form \u2014 both are assistant turns \u2014 so a downstream agent has to infer the distinction from wording. I have seen a writing agent present a researcher's flagged uncertainty as established fact for exactly that reason." },
        { t: "p", text: "So each document would carry its id, its source, and ideally how it was retrieved and how confident the retrieval was. Then a downstream agent can weigh them, and the final answer can cite them \u2014 which is what makes the output checkable rather than merely plausible." },
        { t: "p", text: "The shared message list stays for the conversation, which is what it is good at. The findings go in a key with a reducer appropriate to how they accumulate \u2014 and a deduplicating reducer is worth considering, since two agents retrieving overlapping documents is a normal occurrence." },
        { t: "p", text: "Across services I would send document ids and a fetch, rather than the documents themselves. That keeps the payload bounded, avoids the same text crossing the wire several times, and means every agent reads the same version rather than a copy made at handoff time." }
      ] }
  ] }
});
