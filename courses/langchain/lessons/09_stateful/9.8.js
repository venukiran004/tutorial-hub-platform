EC.receiveLesson({
  id: "9.8",
  lede: "A **static** breakpoint is configuration: `compile(checkpointer=..., interrupt_before=[\"execute\"])` pauses before that node with no `interrupt()` call anywhere, and you resume with `invoke(None)` rather than `Command(resume=...)` \u2014 because there is no question to answer. While paused, `update_state()` lets a human **correct** the state before the action runs, which is what makes a breakpoint an approval *gate* rather than a delay. And the edit goes through the **reducers**, so a correction appends to an accumulating key rather than replacing it. The dynamic version \u2014 `interrupt()` inside a node \u2014 is what you want when the decision to ask is itself logic, which is most production approval.",
  objectives: [
    "Add a static breakpoint and resume from it",
    "Edit state while paused and note that the edit goes through reducers",
    "Say why interrupt_before on the acting node is the right choice",
    "Build a gate that decides for itself whether to ask",
    "Choose between static and dynamic breakpoints"
  ],
  prerequisites: ["9.7"],
  blocks: [
    { t: "h2", n: "01", id: "static", text: "A static breakpoint is configuration", sub: "No code in the node" },
    { t: "code", lang: "python", title: "interrupt_before",
      code: 'app = g.compile(checkpointer=saver, interrupt_before=["execute"])',
      out: "  invoke stops before 'execute':\n    trace: ['prepared']\n    next : ('execute',)\n\n  resuming with invoke(None) runs the rest:\n    ['prepared', 'EXECUTED refund of 50.00']",
      caption: "`invoke(None)`, not `Command(resume=...)`." },
    { t: "callout", kind: "insight", title: "A pause, not a prompt", body: [
      { t: "p", text: "There is no `interrupt()` call anywhere in the node, so there is no payload and no question \u2014 which is why resuming takes `invoke(None)`. That is the practical difference from 9.7: a static breakpoint stops, a dynamic one asks." },
      { t: "p", text: "Because it is configuration, it can be added to a graph you did not write. And 8.5's point applies: it takes the node **name**, so renaming a node silently disables the breakpoint \u2014 the approval gate stops existing and nothing reports it." }
    ] },
    { t: "h2", n: "02", id: "edit", text: "Editing state while paused", sub: "Which is what makes it a gate" },
    { t: "code", lang: "text", title: "Correcting a refund before it runs",
      code: "paused before executing a refund of 9999.00\nafter update_state: amount=50.00\nthen resumed: ['prepared', 'amount corrected', 'EXECUTED refund of 50.00']",
      caption: "A human changed the state and the action used the corrected value." },
    { t: "callout", kind: "mental", title: "The edit goes through the reducers", body: [
      { t: "p", text: "Notice `'amount corrected'` was **appended** to the trace rather than replacing it. `update_state()` is an update like any other (8.3), so every reducer applies." },
      { t: "p", text: "Which matters most for message lists: editing a message means `add_messages`' **id-based replacement** (8.3), not an append. Pass a message with the same id to change it; pass one without and you have added a message rather than corrected it." }
    ] },
    { t: "h2", n: "03", id: "after", text: "interrupt_after, and why it is less useful", sub: "For approval specifically" },
    { t: "p", text: "For a two-node graph `interrupt_after=[\"prepare\"]` and `interrupt_before=[\"execute\"]` are the same pause. They differ when a node has several successors: *after prepare* is one pause, *before each successor* is several." },
    { t: "callout", kind: "good", title: "Gate the action, not the preparation", body: [
      { t: "p", text: "For approval, `interrupt_before` on the **acting** node is the right choice, because what you are gating is the action. That also stays correct when someone later adds another path into that node \u2014 the gate covers the new path automatically." },
      { t: "p", text: "`interrupt_after` on the preparing node gates one *route* to the action rather than the action itself, so a second route added later bypasses it. Same pause today, different invariant." }
    ] },
    { t: "h2", n: "04", id: "dynamic", text: "The dynamic gate", sub: "Which decides for itself whether to ask" },
    { t: "p", text: "A static breakpoint pauses **every** time. Most approvals should depend on the request: refunds over a threshold, writes to production, anything irreversible." },
    { t: "code", lang: "python", title: "One node, three behaviours",
      code: 'def gate(state):\n    if state["amount"] > 100:\n        decision = interrupt({"approve_refund": state["amount"]})\n        if decision != "approve":\n            return Command(goto=END, update={"trace": ["refused by human"]})\n        return {"trace": ["approved by human"]}\n    return {"trace": ["auto-approved (%.2f <= 100)" % state["amount"]]}',
      out: "  amount=50  -> ['prepared', 'auto-approved (50.00 <= 100)', 'EXECUTED refund of 50.00']\n  amount=500, resume='approve' -> [..., 'approved by human', 'EXECUTED refund of 500.00']\n  amount=500, resume='deny'    -> ['prepared', 'refused by human']",
      caption: "Skip the gate, approve, or refuse \u2014 one node." },
    { t: "callout", kind: "insight", title: "The refusal uses Command, and that is 8.8's case exactly", body: [
      { t: "p", text: "`Command(goto=END)` makes the gate both decide and route, which 8.8 said is the right choice when the decision depends on something the node learned while running \u2014 here, the human's answer. Writing the decision to state for a separate router to read back would be 8.8's tell for a `Command` waiting to happen." },
      { t: "p", text: "And the interrupt is the **first** thing in the branch that pauses, with the action in a separate node \u2014 9.7's re-execution rule, obeyed by construction rather than by care." }
    ] },
    { t: "h2", n: "05", id: "choose", text: "Static or dynamic?", sub: "Five differences" },
    { t: "table", head: ["", "static (`interrupt_before`)", "dynamic (`interrupt()` in a node)"], rows: [
      ["what it is", "configuration, no code", "a node you write"],
      ["when it pauses", "every time", "on a condition"],
      ["payload", "no question, no answer", "carries a payload and a response"],
      ["resuming", "`invoke(None)`", "`Command(resume=...)`"],
      ["fragility", "breaks on a node rename", "breaks only if you change the node"]
    ] },
    { t: "p", text: "Use static for **debugging** and for a blanket *never act unattended* policy. Use dynamic for anything where the decision to ask is itself logic \u2014 which is most production approval, because approving everything is a workflow nobody sustains and approving nothing is not a gate." },
    { t: "diagram", kind: "matrix", title: "A static breakpoint is configuration, not code",
      caption: "`interrupt_before=[“execute”]` pauses with **no `interrupt()` call anywhere**, and you resume with `invoke(None)` rather than `Command(resume=…)`. Two mechanisms that look alike and take different resume calls.",
      cols: ["where it is declared", "how you resume"],
      rows: ["interrupt() in a node", "interrupt_before at compile"],
      cells: [
        [{ text: "in the node body", tone: "accent" }, { text: "Command(resume=value)", tone: "good" }],
        [{ text: "in compile() — config", tone: "violet" }, { text: "invoke(None)", tone: "warn" }]
      ] },
    { t: "exercise", kind: "build", title: "Build an approval gate",
      difficulty: "core", minutes: 30,
      body: "Add a static breakpoint before an acting node and resume from it, noting which resume form it takes. While paused, correct a value with update_state and confirm the action uses the corrected value \u2014 and note what the reducers did to the edit. Compare interrupt_before against interrupt_after and say which is right for approval and why. Then build a dynamic gate that only asks above a threshold, handling skip, approve and refuse in one node.",
      requirements: ["Add a static breakpoint and show the pause and the next field",
        "Resume it and note which resume form a static breakpoint takes",
        "Correct a value with update_state and confirm the action uses it",
        "Note what the reducers did to the edit, and what that means for message lists",
        "Compare interrupt_before and interrupt_after and pick one for approval",
        "Explain the invariant difference rather than just the behaviour",
        "Build a dynamic gate with a threshold handling skip, approve and refuse",
        "Say when to use static and when dynamic"],
      hint: "When you edit state while paused, check what happened to an accumulating key. The edit is an update like any other.",
      solution: { lang: "python", title: "x0908.py \u2014 the edit went through the reducer",
        code: 'app = g.compile(checkpointer=saver, interrupt_before=["execute"])\n\ncfg = {"configurable": {"thread_id": "b2"}}\napp.invoke({"amount": 9999.0, "trace": []}, cfg)      # pauses\napp.update_state(cfg, {"amount": 50.0, "trace": ["amount corrected"]})\napp.invoke(None, cfg)                                  # invoke(None), not Command\n\n# the dynamic version decides for itself\ndef gate(state):\n    if state["amount"] > 100:\n        decision = interrupt({"approve_refund": state["amount"]})\n        if decision != "approve":\n            return Command(goto=END, update={"trace": ["refused by human"]})\n        return {"trace": ["approved by human"]}\n    return {"trace": ["auto-approved"]}',
        out: "==============================================================================\nPART 1 -- a static breakpoint -- interrupt_before\n==============================================================================\n  compile(checkpointer=..., interrupt_before=['execute'])\n\n  invoke stops before 'execute':\n    trace: ['prepared']\n    next : ('execute',)\n\n  no interrupt() call anywhere in the node. the pause is\n  CONFIGURATION, which means it can be added to a graph you did not\n  write -- and 8.5's point applies: it takes the node NAME, so\n  renaming a node silently disables the breakpoint.\n\n  resuming with invoke(None) runs the rest:\n    ['prepared', 'EXECUTED refund of 50.00']\n\n  note invoke(None), not Command(resume=...). a static breakpoint has\n  no question to answer -- it is a pause, not a prompt. that is the\n  practical difference from 9.7's interrupt().\n==============================================================================\nPART 2 -- editing the state while paused\n==============================================================================\n  paused before executing a refund of 9999.00\n  after update_state: amount=50.00\n  then resumed: ['prepared', 'amount corrected', 'EXECUTED refund of 50.00']\n\n  so a human can correct the state before the action runs. that is\n  the capability that makes a breakpoint an approval GATE rather\n  than just a delay.\n\n  and note update_state went through the REDUCERS -- 'amount\n  corrected' was appended to trace rather than replacing it. so an\n  edit is an update like any other (8.3), which is why editing a\n  message list needs add_messages' id-replacement rather than append.\n==============================================================================\nPART 3 -- interrupt_after, and why it is less useful\n==============================================================================\n  interrupt_after=['prepare'] -> trace ['prepared'], next ('execute',)\n\n  for a two-node graph these are the same pause. they differ when a\n  node has several successors: 'after prepare' is one pause, 'before\n  each successor' is several.\n\n  for approval, interrupt_before on the ACTING node is the right\n  one, because what you are gating is the action -- and that stays\n  correct when someone adds another path into it.\n==============================================================================\nPART 4 -- the dynamic breakpoint -- a gate that decides for itself\n==============================================================================\n  a static breakpoint pauses every time. most approvals should\n  depend on the request: refunds over a threshold, writes to\n  production, anything irreversible.\n\n  amount=50 (under the threshold):\n    ['prepared', 'auto-approved (50.00 <= 100)', 'EXECUTED refund of 50.00']\n\n  amount=500, paused. resuming with 'approve':\n    ['prepared', 'approved by human', 'EXECUTED refund of 500.00']\n  amount=500, resuming with 'deny':\n    ['prepared', 'refused by human', 'EXECUTED refund of 500.00']\n\n  one node, three behaviours: skip the gate, approve, refuse. the\n  refusal uses Command(goto=END) (8.8) so the gate both decides and\n  routes -- which is exactly the case 8.8 said Command is for,\n  because the decision came from something the node learned.\n\n  and the interrupt is the FIRST thing in the branch that pauses\n  (9.7's re-execution rule), with the action in a separate node.\n==============================================================================\nPART 5 -- static or dynamic?\n==============================================================================\n  static (interrupt_before)   dynamic (interrupt in a node)\n  configuration, no code      a node you write\n  pauses every time           pauses on a condition\n  no question, no answer      carries a payload and a response\n  invoke(None) to continue    Command(resume=...) to continue\n  breaks on a node rename     breaks only if you change the node\n\n  use static for debugging and for a blanket 'never act unattended'\n  policy. use dynamic for anything where the decision to ask is\n  itself logic -- which is most production approval.",
        notes: [
          { t: "p", text: "**A static breakpoint is configuration** \u2014 `interrupt_before=[\"execute\"]` with no `interrupt()` call in the node." },
          { t: "p", text: "**You resume it with `invoke(None)`**, not `Command(resume=...)`, because there is no question to answer \u2014 a pause rather than a prompt." },
          { t: "p", text: "**It takes the node NAME**, so renaming a node silently disables the gate (8.5)." },
          { t: "p", text: "**`update_state()` lets a human correct the state before the action runs**, which is what makes a breakpoint a gate rather than a delay." },
          { t: "p", text: "**And the edit goes through the reducers** \u2014 the correction was appended to the trace. For message lists that means using `add_messages`' id-based replacement, or you add a message instead of correcting one." },
          { t: "p", text: "**`interrupt_before` on the ACTING node is right for approval**, because it gates the action rather than one route to it \u2014 so a path added later is covered automatically." },
          { t: "p", text: "**A dynamic gate decides for itself whether to ask**, handling skip, approve and refuse in one node \u2014 with `Command(goto=END)` for the refusal, which is 8.8's case exactly." },
          { t: "p", text: "**And the interrupt is first in the branch that pauses**, with the action in a separate node \u2014 9.7's rule obeyed by construction." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the approval gate that stopped existing", body: [
      { t: "p", text: "A graph gates a payment node with `interrupt_before=[\"send_payment\"]`. Months later the node is renamed to `execute_payment` during a refactor. The graph compiles, every test passes, and payments now execute unattended." },
      { t: "p", text: "The breakpoint names a node that no longer exists, and nothing checks that \u2014 `interrupt_before` is a list of strings, so an entry that matches nothing is simply a list of strings that matches nothing. There is no error and no pause, and the only symptom is an absence." },
      { t: "p", text: "Two defences. Assert after compiling that the gated names are in the graph's nodes, which is three lines and turns a silent absence into a startup failure. Better, use a dynamic gate: a node that calls `interrupt()` cannot be disabled by renaming anything, because the pause is code inside the thing being gated rather than a reference to its name. The general shape is that configuration referring to names by string is configuration that drifts \u2014 and a gate is exactly the kind of thing you want failing loudly rather than quietly." }
    ] }
  ],
  takeaways: [
    "**A static breakpoint is configuration**: `interrupt_before=[\"node\"]`, with no code in the node.",
    "**Resume with `invoke(None)`**, not `Command(resume=...)` \u2014 a pause, not a prompt.",
    "**It takes the node name**, so renaming a node silently disables the gate.",
    "**`update_state()` lets a human correct the state before the action runs.**",
    "**Which is what makes a breakpoint a gate rather than a delay.**",
    "**The edit goes through the reducers** \u2014 a correction appended to the accumulating key.",
    "**So editing a message means `add_messages`' id-based replacement**, not an append.",
    "**`interrupt_before` on the acting node gates the action**; `interrupt_after` gates one route to it.",
    "**So a path added later is covered by the first and bypasses the second.**",
    "**A dynamic gate decides for itself whether to ask** \u2014 skip, approve and refuse in one node.",
    "**The refusal uses `Command(goto=END)`**, which is 8.8's case: the node learned the decision.",
    "**And the interrupt comes first in the branch**, with the action in a separate node (9.7).",
    "**Static for debugging and blanket policies; dynamic when the decision to ask is logic.**",
    "**Assert that gated node names exist after compiling** \u2014 or use a dynamic gate that cannot drift."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "How do you resume from a static breakpoint added with interrupt_before?",
      options: ["Command(resume=True)",
        "invoke(None) \u2014 there is no question to answer, so there is no value to send",
        "update_state() followed by compile()",
        "Command(goto=...) naming the next node"],
      answer: 1,
      why: "A static breakpoint involves no interrupt() call, so nothing asked anything and there is no payload. It is a pause rather than a prompt, and invoke(None) simply continues from the recorded position. Command(resume=...) is for a dynamic interrupt, where the value you pass becomes the return value of the interrupt() call inside the node." },
    { stem: "A human corrects a value with update_state while a graph is paused. What happens to an accumulating key in that update?",
      options: ["It is replaced, since update_state bypasses reducers",
        "It goes through the reducer \u2014 so a correction is appended rather than replacing the existing value",
        "It is merged only if the key has no reducer",
        "It is written directly to the checkpoint without merging"],
      answer: 1,
      why: "update_state is an ordinary update, so every reducer applies exactly as it would for a node's return value. That is usually what you want for a trace, and it is a trap for message lists: appending a corrected message leaves both versions present. Editing a message requires add_messages' id-based replacement, passing the same id as the message being changed." },
    { stem: "Why prefer interrupt_before on the acting node over interrupt_after on the preparing node?",
      options: ["interrupt_after does not support update_state",
        "It gates the action itself rather than one route to it, so a path added later is covered automatically",
        "interrupt_after pauses after side effects have run",
        "Only interrupt_before works with a checkpointer"],
      answer: 1,
      why: "In a two-node graph the two produce the same pause, so the difference is the invariant rather than today's behaviour. Gating the acting node means every route into it passes the gate, including one added next year. Gating the preparing node protects the current path and silently leaves a new path unguarded \u2014 which is exactly the kind of regression nobody tests for." },
    { stem: "A gated node is renamed during a refactor. What happens to interrupt_before?",
      options: ["compile() raises, since the name is unknown",
        "It silently stops pausing \u2014 the list entry matches no node and nothing reports it",
        "It pauses before every node instead",
        "The checkpointer rejects the configuration"],
      answer: 1,
      why: "interrupt_before is a list of strings, and an entry matching nothing is simply inert. There is no error, no pause, and the only symptom is an absence \u2014 so an approval gate can stop existing while every test passes. Asserting after compile that the gated names are among the graph's nodes converts that into a startup failure; a dynamic gate avoids the class of problem entirely." }
  ] },
  interview: { title: "Interview practice", sub: "Breakpoints and approval", questions: [
    { level: "core", q: "How would you add an approval step to an existing graph?",
      strong: "A strong answer distinguishes static from dynamic and picks for the case.",
      answer: [
        { t: "p", text: "Two options, and I would choose based on whether the decision to ask is itself logic." },
        { t: "p", text: "A static breakpoint is pure configuration \u2014 interrupt_before naming the acting node, with no code in the node at all. That is ideal for debugging or a blanket 'never act unattended' policy, and it can be added to a graph you did not write. You resume it with invoke(None), because nothing asked a question." },
        { t: "p", text: "A dynamic gate is a node that calls interrupt(), which is what you want when approval should depend on the request \u2014 above a threshold, irreversible actions, writes to production. Approving everything is a workflow nobody sustains, so in production this is usually the right one." },
        { t: "p", text: "Either way I would gate the acting node rather than the preparing one. In a simple graph those are the same pause, but gating the action means every route into it is covered including one added later, whereas gating the route protects today's path and silently leaves a new one unguarded." }
      ] },
    { level: "advanced", q: "What would you be careful about with a static breakpoint?",
      strong: "A strong answer names the rename drift and the reducer on edits.",
      answer: [
        { t: "p", text: "Two things, and the first is that it refers to a node by name string." },
        { t: "p", text: "interrupt_before is a list of strings, so an entry that matches no node is simply inert. Rename the gated node during a refactor and the graph compiles, the tests pass, and the approval gate has stopped existing \u2014 the only symptom is an absence. For a payment or a deletion that is a serious silent regression." },
        { t: "p", text: "So I would assert after compiling that every gated name is in the graph's nodes, which is three lines and turns the drift into a startup failure. Or prefer a dynamic gate, where the pause is code inside the thing being gated and cannot be disabled by renaming anything." },
        { t: "p", text: "The second is what happens when a human edits state while paused. update_state is an ordinary update, so it goes through the reducers \u2014 I watched a correction get appended to an accumulating key rather than replacing it." },
        { t: "p", text: "That is fine for a trace and a trap for a message list: appending a corrected message leaves both versions in the history. Editing a message means using add_messages' id-based replacement, passing the same id as the message being corrected. Otherwise your 'edit' is an addition and the model sees both." }
      ] },
    { level: "core", q: "How would you decide which actions need human approval?",
      strong: "A strong answer bounds by reversibility and blast radius.",
      answer: [
        { t: "p", text: "By reversibility and blast radius, not by how confident the model seems \u2014 confidence is not a signal I can calibrate, and reversibility is a property of the action I can state." },
        { t: "p", text: "So: anything that moves money, sends a message to a third party, deletes data, or changes production configuration. Those are irreversible or externally visible, and the cost of a wrong one is not recoverable by retrying." },
        { t: "p", text: "Then I would add a threshold where one makes sense, which is what a dynamic gate is for. Refunds under a small amount auto-approve and larger ones pause \u2014 because gating everything produces a queue nobody works, and a gate that is always approved by reflex is worse than no gate, since it looks like a control and is not one." },
        { t: "p", text: "Structurally I would gate the acting node with interrupt_before rather than the node that prepares the action, so every route into it is covered including one someone adds later." },
        { t: "p", text: "And I would prefer a dynamic gate for anything load-bearing, because a static one refers to a node by name string \u2014 rename the node and the gate silently stops existing, with no error and no pause. If I did use a static gate I would assert at startup that the gated names are actually in the graph." }
      ] }
  ] }
});
