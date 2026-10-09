EC.receiveLesson({
  id: "8.8",
  lede: "A node can return a `Command` instead of a dict, carrying an update **and** a destination together \u2014 and then there is no `add_conditional_edges` call at all, because the routing came from the node's return value. The useful question is when that is clearer than a conditional edge, and there is a sharp tell: **a key in the schema that exists only so a routing function can read it back is a `Command` waiting to happen.** The cost is that the destinations now live inside node bodies, so the drawn graph is incomplete \u2014 which matters because that drawing is the only picture anyone looks at when debugging a graph they did not write.",
  objectives: [
    "Return a Command and route without a conditional edge",
    "Decide between Command and a conditional edge on a clear criterion",
    "Implement the handoff pattern",
    "Explain what Command costs the graph's drawn structure",
    "Annotate a node so the drawing is complete again"
  ],
  prerequisites: ["8.7"],
  blocks: [
    { t: "h2", n: "01", id: "command", text: "Update and destination together", sub: "And no conditional edge" },
    { t: "code", lang: "python", title: "A node that routes itself",
      code: 'from langgraph.types import Command\n\ndef step(state):\n    n = state["n"] * 2\n    return Command(update={"n": n, "trace": ["doubled to %d" % n]},\n                   goto="big" if n > 10 else "small")',
      out: "    n=2   -> ['doubled to 4', 'small']\n    n=20  -> ['doubled to 40', 'big']",
      caption: "There is no `add_conditional_edges` call \u2014 the destination came from the return value." },
    { t: "h2", n: "02", id: "which", text: "Command or a conditional edge?", sub: "They express the same thing, split differently" },
    { t: "table", head: ["", "conditional edge", "`Command`"], rows: [
      ["who decides", "node computes, router decides", "node computes **and** decides"],
      ["visibility", "the decision is in the graph's structure", "the decision is inside the node"],
      ["re-derivation", "the router recomputes what the node knew", "none"],
      ["functions to keep in sync", "two", "one"]
    ] },
    { t: "callout", kind: "mental", title: "The criterion, and the tell", body: [
      { t: "p", text: "Use a **conditional edge** when the decision is a property of the state that any reader could compute. Use **`Command`** when the decision depends on something the node learned while running and would otherwise have to be stashed in state purely for a router to read it back." },
      { t: "p", text: "That last case is the tell: **a key in the schema that exists only so a routing function can read it is a `Command` waiting to happen.** It is also a 8.4 problem, since that key is part of the state's public surface for no reason anyone outside the graph would recognise." }
    ] },
    { t: "h2", n: "03", id: "handoff", text: "The handoff pattern", sub: "Which is Command's real use" },
    { t: "code", lang: "python", title: "Transferring control, with the reason attached",
      code: 'def triage(state):\n    t = state["topic"]\n    target = "billing" if t == "refund" else "tech"\n    return Command(update={"trace": ["triage -> %s" % target]},\n                   goto=target)',
      out: "  topic='refund'      -> ['triage -> billing', 'billing handled it']\n  topic='api error'   -> ['triage -> tech', 'tech handled it']",
      caption: "One return statement, and the reason travels with the destination." },
    { t: "p", text: "This is what M12's multi-agent work is built on: an agent decides it is the wrong agent and transfers control, carrying a reason. The handoff being one return statement \u2014 rather than a state write plus a router that reads it \u2014 is what makes a trace of a multi-agent run readable, because the transfer and its justification are one event." },
    { t: "h2", n: "04", id: "cost", text: "The cost", sub: "The topology is no longer in the topology" },
    { t: "p", text: "With conditional edges you can draw the graph and see every path. With `Command` the destinations live inside node bodies, so the drawn graph is **incomplete** \u2014 the renderer has no way to know where a node might send execution." },
    { t: "callout", kind: "warn", title: "That drawing is the only picture anyone looks at", body: [
      { t: "p", text: "8.9 shows a graph drawing itself, and it is the fastest way to understand a graph you did not write \u2014 and the check that catches an unreachable branch or a node never connected to `END`." },
      { t: "p", text: "A graph whose routing is all `Command` renders as a set of disconnected nodes, which is worse than verbose edges. So the cost is paid by whoever reads the graph next, which is the kind of cost that does not show up in the measurement you take while writing it." }
    ] },
    { t: "code", lang: "python", title: "The fix: declare the possible destinations",
      code: 'from typing import Literal\n\ndef step(state) -> Command[Literal["big", "small"]]:\n    ...',
      caption: "The annotation is read by the graph renderer." },
    { t: "p", text: "It is optional, and skipping it costs you the only diagram anyone looks at. Which makes it one of those annotations worth treating as mandatory by convention \u2014 it is not enforced, it is cheap, and the thing it protects is legibility for someone who is not you." },
    { t: "diagram", kind: "compare", title: "Command, or a conditional edge",
      caption: "A node returning a `Command` carries an update and a destination together — and then there is no `add_conditional_edges` call at all, because the routing came from the return value. The useful question is what each one makes visible.",
      columns: [
        { title: "add_conditional_edges", tone: "good", items: [
          "the routing is declared in the graph",
          "so the drawn graph shows every possible path",
          "the update and the decision are separate steps",
          "a path map gives you a place for a default" ] },
        { title: "a node returning Command", tone: "warn", items: [
          "update and destination in one return",
          "the routing is INSIDE the node, so the drawn graph shows nothing",
          "fewer moving parts for a genuine state-machine transition",
          "annotate the destinations or you lose the diagram" ] }
      ] },
    { t: "exercise", kind: "build", title: "Route from inside a node",
      difficulty: "advanced", minutes: 30,
      body: "Write a node that returns a Command with both an update and a destination, and confirm the graph routes without any conditional edge. Compare Command against a conditional edge on who decides, what is visible and how many functions must stay in sync, and give a criterion for choosing. Implement a handoff where one node transfers control to a specialist and carries the reason. Then draw the graph and say what is missing, and show the annotation that fixes it.",
      requirements: ["Return a Command with update and goto, and confirm routing with no conditional edge",
        "Compare Command against a conditional edge on at least three dimensions",
        "Give a criterion for choosing between them",
        "State the tell that indicates Command is the right choice",
        "Implement a handoff carrying a reason",
        "Draw the graph and identify what the drawing is missing",
        "Show the annotation that makes the drawing complete"],
      hint: "Look for a state key that exists only so a router can read it. That is the signal that the decision belongs in the node.",
      solution: { lang: "python", title: "x0808.py \u2014 routing with no conditional edge",
        code: 'from langgraph.types import Command\n\ndef step(state):\n    n = state["n"] * 2\n    return Command(update={"n": n, "trace": ["doubled to %d" % n]},\n                   goto="big" if n > 10 else "small")\n\n# the handoff pattern\ndef triage(state):\n    target = "billing" if state["topic"] == "refund" else "tech"\n    return Command(update={"trace": ["triage -> %s" % target]}, goto=target)\n\n# and the annotation that keeps the drawing complete\n# def step(state) -> Command[Literal["big", "small"]]: ...',
        out: "==============================================================================\nPART 1 -- Command returns an update and a destination together\n==============================================================================\n  return Command(update={...}, goto='big' if n > 10 else 'small')\n\n  note there is NO add_conditional_edges call. the destination came\n  from the node's return value.\n    n=2   -> ['doubled to 4', 'small']\n    n=20  -> ['doubled to 40', 'big']\n==============================================================================\nPART 2 -- when Command is clearer than a conditional edge\n==============================================================================\n  the two express the same thing and split the logic differently:\n\n  conditional edge         node computes, router decides\n    - the decision is visible in the graph's structure\n    - the router re-derives from state what the node already knew\n    - two functions to keep in sync\n\n  Command                  node computes AND decides\n    - the decision is inside the node, invisible in the topology\n    - no re-derivation: the node knows why it is routing\n    - one function\n\n  so: use a conditional edge when the decision is a property of the\n  STATE that any reader could compute. use Command when the decision\n  depends on something the node learned while running and would have\n  to be stashed in state purely for a router to read it back.\n\n  that last case is the tell. a key in the schema that exists only so\n  a routing function can read it is a Command waiting to happen.\n==============================================================================\nPART 3 -- the handoff pattern\n==============================================================================\n  Command's real use is multi-agent handoff (M12): an agent decides\n  it is the wrong agent and transfers control, carrying a reason.\n\n  topic='refund'    -> ['triage -> billing', 'billing handled it']\n  topic='api error' -> ['triage -> tech', 'tech handled it']\n\n  the handoff is one return statement, and the reason for it travels\n  in the same object as the destination -- which is what makes a\n  trace of a multi-agent run readable.\n==============================================================================\nPART 4 -- the cost: the topology is no longer in the topology\n==============================================================================\n  with conditional edges you can draw the graph and see every path.\n  with Command the destinations live inside node bodies, so the\n  drawn graph is incomplete.\n\n    (draw unavailable: ImportError: Install grandalf to draw graphs: `pip install grandalf`.)\n\n  LangGraph's answer is to declare the possible destinations so the\n  drawing is complete again:\n\n    def step(state) -> Command[Literal['big', 'small']]:\n\n  the annotation is read by the graph renderer. it is optional and\n  skipping it costs you the only picture anyone looks at when\n  debugging someone else's graph.",
        notes: [
          { t: "p", text: "**`Command` carries an update and a destination together**, so the graph routes with no `add_conditional_edges` call at all." },
          { t: "p", text: "**The two approaches split the logic differently**: a conditional edge puts the decision in the topology and makes the router re-derive what the node already knew; `Command` keeps it in one function." },
          { t: "p", text: "**Use a conditional edge when the decision is a property of the state** any reader could compute, and `Command` when it depends on something the node learned while running." },
          { t: "p", text: "**The tell: a key in the schema that exists only so a routing function can read it back is a `Command` waiting to happen** \u2014 and it is an 8.4 problem too, since that key is public for no external reason." },
          { t: "p", text: "**The handoff pattern is `Command`'s real use** (M12): an agent decides it is the wrong agent and transfers control, carrying the reason in the same object as the destination." },
          { t: "p", text: "**Which is what makes a multi-agent trace readable** \u2014 the transfer and its justification are one event rather than a state write plus a router read." },
          { t: "p", text: "**The cost is that the drawn graph becomes incomplete**, because destinations live inside node bodies and the renderer cannot see them." },
          { t: "p", text: "**Annotate the node with its possible destinations** \u2014 `-> Command[Literal[\"big\", \"small\"]]` \u2014 which the renderer reads. Optional, cheap, and the thing it protects is legibility for someone else." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the graph that could not be drawn", body: [
      { t: "p", text: "A multi-agent graph uses `Command` for every handoff, with no destination annotations. A new engineer runs `draw_ascii()` to understand it and gets a set of nodes with almost no edges between them." },
      { t: "p", text: "Every route is a `goto` inside a node body, so the renderer has nothing to draw. The actual control flow is discoverable only by reading all eight node functions and collecting their `goto` targets by hand \u2014 which is the task the diagram exists to avoid." },
      { t: "p", text: "The fix is one annotation per node, and it is worth adopting as a convention rather than a judgement call, precisely because the person who pays for its absence is never the person who wrote the node. The broader point is that `Command` trades a structural property \u2014 the topology being inspectable \u2014 for conciseness, and annotations are how you get the property back without giving up the conciseness." }
    ] }
  ],
  takeaways: [
    "**`Command` returns an update and a destination together**, so no conditional edge is needed.",
    "**A conditional edge puts the decision in the topology**; `Command` puts it in the node.",
    "**A conditional edge makes the router re-derive what the node already knew** \u2014 two functions to keep in sync.",
    "**Use a conditional edge when the decision is a property of state any reader could compute.**",
    "**Use `Command` when it depends on something the node learned while running.**",
    "**The tell: a schema key that exists only for a router to read back is a `Command` waiting to happen.**",
    "**And that key is an 8.4 problem too**, being public for no external reason.",
    "**The handoff pattern is `Command`'s real use** \u2014 transferring control with the reason attached.",
    "**Which makes a multi-agent trace readable**: the transfer and its justification are one event.",
    "**The cost is that the drawn graph becomes incomplete**, since destinations live in node bodies.",
    "**And that drawing is the only picture anyone looks at** for a graph they did not write.",
    "**Annotate with `-> Command[Literal[...]]`** so the renderer can see the destinations.",
    "**Treat that annotation as mandatory by convention** \u2014 its absence is paid for by someone else."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What signals that a routing decision belongs in a Command rather than a conditional edge?",
      options: ["The graph has more than three branches",
        "A state key exists only so a routing function can read back something a node already knew",
        "The decision depends on the previous node's output",
        "The node is asynchronous"],
      answer: 1,
      why: "That key is pure re-derivation plumbing: the node computed the decision, wrote it down so a separate function could read it, and the router then recomputes nothing useful. Command removes both the key and the second function. It is also a schema-surface problem, since the key is part of the state's public interface for a reason no external caller would recognise." },
    { stem: "What does using Command cost?",
      options: ["Reducers no longer apply to the update",
        "The drawn graph becomes incomplete, because destinations live inside node bodies where the renderer cannot see them",
        "The node can no longer be unit tested",
        "Conditional edges stop working elsewhere in the graph"],
      answer: 1,
      why: "The topology is no longer fully expressed in the topology. A graph routing entirely through Command renders as near-disconnected nodes, so understanding its control flow means reading every node body and collecting goto targets by hand \u2014 which is the task the diagram exists to avoid. Annotating each node with its possible destinations restores the drawing." },
    { stem: "Why is the handoff pattern Command's natural use?",
      options: ["Conditional edges cannot route between agents",
        "The transfer and its reason become one event, carried in the same object, which is what makes a multi-agent trace readable",
        "Command is faster than a conditional edge",
        "Agents cannot write to shared state"],
      answer: 1,
      why: "An agent deciding it is the wrong agent knows both the destination and why. With a conditional edge that becomes a state write followed by a router that reads it, so the trace shows two events and the reasoning is separated from the transfer. Command keeps them together in one return statement, which is why multi-agent architectures are built on it." },
    { stem: "What does `-> Command[Literal[\"big\", \"small\"]]` do?",
      options: ["Restricts at runtime which destinations the node may return",
        "Declares the possible destinations so the graph renderer can draw them",
        "Validates the update dict against the schema",
        "Registers the node for conditional routing"],
      answer: 1,
      why: "It is read by the renderer rather than enforced by the runtime, and it exists to restore the drawn structure that Command otherwise hides. Being optional and purely for legibility, it is easy to skip \u2014 and the person who pays for its absence is whoever next has to understand the graph, which is an argument for treating it as a convention rather than a choice." }
  ] },
  interview: { title: "Interview practice", sub: "Command", questions: [
    { level: "core", q: "When would you use Command instead of a conditional edge?",
      strong: "A strong answer gives a criterion and the concrete tell.",
      answer: [
        { t: "p", text: "When the routing decision depends on something the node learned while running, rather than on a property of the state that any reader could compute." },
        { t: "p", text: "The concrete tell I look for is a key in the schema that exists only so a routing function can read it back. That is pure plumbing: the node computed the decision, wrote it to state, and a separate function reads it to recompute nothing useful. Command removes both the key and the second function." },
        { t: "p", text: "It is also a schema problem, because that key is part of the state's public surface for a reason no caller would recognise \u2014 so it shows up twice as a smell." },
        { t: "p", text: "Conversely I would keep a conditional edge when the decision really is derivable from state, because then the decision is visible in the graph's structure and someone can see the branch without reading the node. That visibility is worth the second function." }
      ] },
    { level: "advanced", q: "What is the downside of routing with Command?",
      strong: "A strong answer names the lost drawing and who pays for it.",
      answer: [
        { t: "p", text: "The topology stops being in the topology. Destinations live inside node bodies, so the graph renderer has nothing to draw." },
        { t: "p", text: "That sounds minor until you inherit one. A multi-agent graph routing entirely through Command draws as a set of nodes with almost no edges, so understanding the control flow means reading every node function and collecting the goto targets by hand \u2014 which is exactly the work the diagram exists to save." }
        ,{ t: "p", text: "And drawing the graph is genuinely the fastest way into an unfamiliar one. It is also the check that catches a node nobody connected to END, or a branch that is unreachable because a router never returns its key." },
        { t: "p", text: "The fix is to annotate each node with its possible destinations, which the renderer reads. It costs one line and it is optional, which is the problem \u2014 nothing enforces it and the person who pays for its absence is never the person who wrote the node." },
        { t: "p", text: "So I would treat that annotation as mandatory by convention rather than as a judgement call. The general shape is that Command trades an inspectable structural property for conciseness, and the annotation is how you keep both." }
      ] },
    { level: "core", q: "How would you keep a large graph understandable?",
      strong: "A strong answer names concrete, cheap conventions.",
      answer: [
        { t: "p", text: "Mostly through conventions that keep the structure inspectable, because the thing that degrades first in a large graph is anyone's ability to see the control flow." },
        { t: "p", text: "The drawing is the main artefact, so I would protect it. That means annotating every Command-returning node with its possible destinations, since without that the renderer draws disconnected nodes and the only way to learn the control flow is reading every node body and collecting goto targets by hand." },
        { t: "p", text: "Routing decisions as named enum members rather than node names, with the path map built from the enumeration. That keeps the decision vocabulary in the problem domain and makes the set of outcomes something a test can enumerate." },
        { t: "p", text: "Nodes destructuring the keys they read on their first line, so 'which nodes depend on this key' is a grep rather than a review. There is nothing in a node signature that declares its dependencies, and that is the cheapest available substitute." },
        { t: "p", text: "And a deliberately small state schema with an output schema at any external boundary, because every key is shared by every node and visible to every caller \u2014 so schema growth is coupling growth." },
        { t: "p", text: "None of those is enforced by the framework, which is why I would write them down as conventions rather than hope." }
      ] }
  ] }
});
