EC.receiveLesson({
  id: "9.9",
  lede: "Every checkpoint carries a `checkpoint_id`, and that id is an **address you can go back to**. Pass an earlier checkpoint's config to `invoke` and the graph continues from there \u2014 the measured fork preserved the history before the fork point and re-executed only what came after. `update_state` at an old checkpoint creates a **branch**: changing `n` from 10 to 100 at step 1 and replaying gave `add_ten -> 110` against the original's `20`. So *\u201cwhat would it have done if\u2026\u201d* is answerable by **replaying rather than reasoning**. The constraint nobody mentions is that forking re-executes nodes, so 9.7's side-effect rule applies at a larger scale.",
  objectives: [
    "List checkpoint history and read an earlier state",
    "Fork a run from an earlier checkpoint",
    "Create a counterfactual branch with update_state",
    "Name the three uses and which pays for persistence",
    "State the side-effect constraint on replay"
  ],
  prerequisites: ["9.4", "9.7"],
  blocks: [
    { t: "h2", n: "01", id: "history", text: "The history is the run's history", sub: "And each entry has an address" },
    { t: "code", lang: "text", title: "A three-node run",
      code: "final: ['double -> 10', 'add_ten -> 20', 'final n=20']\n\n5 checkpoints, newest first:\n  step=3   next=()               n=20   id=1f0a5d3c\n  step=2   next=('final',)       n=20   id=1f0a5d2b\n  step=1   next=('add_ten',)     n=10   id=1f0a5d1a\n  step=0   next=('double',)      n=5    id=1f0a5d09\n  step=-1  next=('__start__',)   n=5    id=1f0a5cf8",
      caption: "Each entry carries a `checkpoint_id` \u2014 an address." },
    { t: "p", text: "Reading an earlier state answers *\u201cwhat did the state look like before the decision\u201d* without re-running anything, which is the debugging use on its own. The state is already there \u2014 you paid for it by checkpointing (9.4)." },
    { t: "h2", n: "02", id: "fork", text: "Forking", sub: "Re-running from an earlier point" },
    { t: "code", lang: "text", title: "Pass the old checkpoint's config back to invoke",
      code: "resumed from step 1: ['double -> 10', 'add_ten -> 20', 'final n=20']",
      caption: "One preserved step plus two re-executed ones." },
    { t: "callout", kind: "insight", title: "History before the fork is preserved", body: [
      { t: "p", text: "The trace contains the steps from the original run up to the fork point, then the re-executed ones. The reducer appended to the state **as it was at that checkpoint**, not to the final state." },
      { t: "p", text: "That is the whole point of forking from an address rather than re-running from the start: the prefix is real history, and only the suffix is recomputed." }
    ] },
    { t: "h2", n: "03", id: "counterfactual", text: "Forking with a change", sub: "The counterfactual" },
    { t: "code", lang: "text", title: "update_state at an old checkpoint",
      code: "original at step 1: n=10\nupdate_state(n=100) returned a new checkpoint config\nre-run from there  : ['double -> 10', 'add_ten -> 110', 'final n=110']",
      caption: "`add_ten -> 110` against the original run's `20`." },
    { t: "p", text: "So *\u201cwhat would it have done if `n` had been 100 there\u201d* is answerable by **replaying, not reasoning** \u2014 which is the capability the name *time travel* is pointing at. `update_state` returns a new config rather than mutating the old checkpoint, so the original branch is still there to compare against." },
    { t: "h2", n: "04", id: "uses", text: "What it is actually for", sub: "Three uses, increasingly valuable" },
    { t: "ol", items: [
      "**Debugging.** Read the state before a bad decision rather than adding logging and re-running. The state is already there.",
      "**Recovery.** A run failed at step 7 of 9 \u2014 resume from step 6 instead of repeating six model calls. **This is the one that pays for persistence in production.**",
      "**Counterfactuals.** Fork with an edited state and compare, which is how you evaluate a prompt change against a *real* conversation rather than a synthetic one."
    ] },
    { t: "callout", kind: "mental", title: "You have already paid for it", body: [
      { t: "p", text: "9.4's cost is a checkpoint per superstep, each holding the whole internal state. Time travel is not an additional feature with an additional cost \u2014 it is the thing that checkpointing already bought." },
      { t: "p", text: "So the question is whether you use it, not whether to enable it. A team paying for per-superstep persistence and still debugging by adding log lines and re-running is paying twice." }
    ] },
    { t: "h2", n: "05", id: "constraint", text: "The constraint nobody mentions", sub: "9.7's rule, at a larger scale" },
    { t: "p", text: "Forking **re-executes nodes**. So everything 9.7 said about re-execution applies again, with a wider blast radius:" },
    { t: "ul", items: [
      "a node with side effects runs its side effects **again**",
      "a tool that moves money moves it again",
      "an idempotency key stored in state is replayed with the **old** value \u2014 which is either the fix or the bug, depending on whether you meant it"
    ] },
    { t: "callout", kind: "warn", title: "Safe on computation, careful on action", body: [
      { t: "p", text: "Time travel is safe on a graph of pure computation and model calls, and needs care the moment a node acts on the world. Which is the same conclusion 9.7 reached from a different direction: **side effects and replay do not mix**." },
      { t: "p", text: "The design response is to keep effects in as few nodes as possible, so a graph that might be replayed has a small, identifiable set of nodes you must not replay carelessly. That is also the shape 9.7 recommended for approval gates \u2014 the two constraints point at the same architecture." }
    ] },
    { t: "p", text: "The idempotency-key case is worth sitting with, because it is the one where the right answer is genuinely ambiguous. Replaying with the old key makes the downstream call a no-op, which is correct for recovery and wrong for a counterfactual where you *want* the action to happen differently." },
    { t: "exercise", kind: "build", title: "Fork a run and change the past",
      difficulty: "advanced", minutes: 30,
      body: "Run a multi-node graph with a checkpointer and list the full history with checkpoint ids. Read an earlier state and say what that answers on its own. Then fork from that checkpoint by passing its config to invoke, and explain what happened to the history before the fork point. Create a counterfactual by calling update_state at an old checkpoint and replaying. Finally name the three uses, say which pays for persistence, and state the constraint on replay.",
      requirements: ["List the full checkpoint history including checkpoint ids",
        "Read an earlier state and say what it answers without re-running",
        "Fork from an earlier checkpoint by passing its config to invoke",
        "Explain what happened to the history before the fork point",
        "Create a counterfactual with update_state and compare the outcome",
        "Note that update_state returns a new config rather than mutating",
        "Name three uses and identify which justifies persistence in production",
        "State the side-effect constraint on replay"],
      hint: "Compare the forked run's trace against the original's. What is preserved and what is recomputed is the mechanism.",
      solution: { lang: "python", title: "x0909.py \u2014 n=100 at step 1 gives 110, not 20",
        code: 'hist = list(app.get_state_history(cfg))\nfor h in hist:\n    print("step=%-3s next=%-12s n=%-4s id=%s"\n          % (h.metadata.get("step"), str(h.next), h.values.get("n"),\n             h.config["configurable"]["checkpoint_id"][:8]))\n\n# fork: pass the old checkpoint config back to invoke\nt = [h for h in hist if h.metadata.get("step") == 1][0]\napp.invoke(None, t.config)\n\n# counterfactual: edit at that checkpoint, then replay\nnew_cfg = app.update_state(t.config, {"n": 100})\nprint(app.invoke(None, new_cfg)["trace"])',
        out: "==============================================================================\nPART 1 -- the checkpoint history is the run's history\n==============================================================================\n  final: ['double -> 10', 'add_ten -> 20', 'final n=20']\n\n  5 checkpoints, newest first:\n    step=3   next=()           n=20   id=1f1c3124\n    step=2   next=('final',)   n=20   id=1f1c3124\n    step=1   next=('add_ten',) n=10   id=1f1c3124\n    step=0   next=('double',)  n=5    id=1f1c3124\n    step=-1  next=('__start__',) n=None id=1f1c3124\n\n  each one carries a checkpoint_id, and that id is the address you\n  can go back to.\n==============================================================================\nPART 2 -- reading an earlier state\n==============================================================================\n  the checkpoint after step 1:\n    values : {'n': 10, 'trace': ['double -> 10']}\n    next   : ('add_ten',)\n\n  so you can answer 'what did the state look like before the\n  decision' without re-running anything, which is the debugging\n  use on its own.\n==============================================================================\nPART 3 -- forking -- re-running from an earlier point\n==============================================================================\n  pass that checkpoint's config back to invoke, and the graph\n  continues FROM there:\n\n    resumed from step 1: ['double -> 10', 'add_ten -> 20', 'final n=20']\n\n  note the trace -- it contains the steps from the original run\n  up to the fork point, then the re-executed ones. the reducer\n  appended to the state AS IT WAS at that checkpoint, which is\n  the whole point: history before the fork is preserved.\n==============================================================================\nPART 4 -- forking with a CHANGE -- the counterfactual\n==============================================================================\n  update_state at an old checkpoint creates a new branch:\n\n    original at step 1: n=10\n    update_state(n=100) returned a new checkpoint config\n    re-run from there  : ['double -> 10', 'add_ten -> 110', 'final n=110']\n\n  so the question 'what would it have done if n had been 100\n  there' is answerable by replaying, not by reasoning. that is\n  the capability the name 'time travel' is pointing at.\n==============================================================================\nPART 5 -- what it is actually for\n==============================================================================\n  three uses, in increasing order of how much they justify the\n  checkpointer's cost:\n\n    1. DEBUGGING. read the state before a bad decision rather than\n       adding logging and re-running. the state is already there.\n\n    2. RECOVERY. a run failed at step 7 of 9 -- resume from step 6\n       instead of repeating six model calls. this is the one that\n       pays for persistence in production.\n\n    3. COUNTERFACTUALS. fork with an edited state and compare, which\n       is how you evaluate a prompt change against a real\n       conversation rather than a synthetic one.\n\n  and the cost, from 9.4: a checkpoint per superstep, each holding\n  the whole internal state. time travel is not free -- it is the\n  thing you already paid for by checkpointing, so the question is\n  whether you use it, not whether to enable it.\n==============================================================================\nPART 6 -- the constraint nobody mentions\n==============================================================================\n  forking re-executes nodes. so everything 9.7 said about\n  re-execution applies at a larger scale:\n\n    - a node with side effects runs its side effects AGAIN\n    - a tool that moves money moves it again\n    - an idempotency key stored in state is replayed with the old\n      value, which is either the fix or the bug depending on whether\n      you meant it\n\n  so time travel is safe on a graph of pure computation and\n  model calls, and needs care the moment a node acts on the world.\n  which is the same conclusion as 9.7, reached from a different\n  direction: side effects and replay do not mix, and a graph that\n  might be replayed should keep its effects in as few nodes as\n  possible.",
        notes: [
          { t: "p", text: "**Every checkpoint carries a `checkpoint_id`**, which is an address you can return to." },
          { t: "p", text: "**Reading an earlier state answers \u2018what did the state look like before the decision\u2019** without re-running anything \u2014 the state is already there." },
          { t: "p", text: "**Forking preserves the history before the fork point** and re-executes only what came after, because the reducer appends to the state as it was at that checkpoint." },
          { t: "p", text: "**`update_state` at an old checkpoint creates a branch**: n=100 at step 1 replayed to `add_ten -> 110` against the original's 20." },
          { t: "p", text: "**And it returns a new config rather than mutating the old checkpoint**, so the original branch survives for comparison." },
          { t: "p", text: "**Three uses**: debugging (read the state), recovery (resume at step 6 of 9 rather than repeating six model calls), and counterfactuals (evaluate a change against a real conversation)." },
          { t: "p", text: "**Recovery is the one that pays for persistence in production**, and all three are already paid for by 9.4's per-superstep checkpointing." },
          { t: "p", text: "**Forking re-executes nodes**, so 9.7's rule applies at a larger scale: side effects run again, and an idempotency key in state is replayed with the old value \u2014 the fix for recovery and the bug for a counterfactual." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the replay that charged the customer twice", body: [
      { t: "p", text: "An order-processing graph fails at its final notification step. An engineer forks from the checkpoint before the failure to finish the run. The customer is charged a second time." },
      { t: "p", text: "The fork point was before the payment node, so replaying re-executed it. Nothing is wrong with the fork mechanism \u2014 it did exactly what it was asked, and the engineer chose a checkpoint by looking at where the failure was rather than at where the effects were." },
      { t: "p", text: "Two things follow. Fork from the checkpoint **after** the last side effect, which requires knowing which nodes have them \u2014 so a graph that might be replayed should keep effects in few, clearly named nodes. And make the effectful calls idempotent on a key carried in the state, so a replay is a no-op rather than a repeat. That second one has the ambiguity worth being deliberate about: it is exactly right for recovery and exactly wrong for a counterfactual, where you want the action to happen differently." }
    ] }
  ],
  takeaways: [
    "**Every checkpoint carries a `checkpoint_id`**, which is an address you can return to.",
    "**Reading an earlier state answers questions without re-running anything.**",
    "**Forking preserves the history before the fork point** and re-executes only the suffix.",
    "**Because the reducer appends to the state as it was at that checkpoint.**",
    "**`update_state` at an old checkpoint creates a branch** \u2014 n=100 at step 1 gave 110, not 20.",
    "**And it returns a new config rather than mutating**, so the original survives for comparison.",
    "**So \u2018what would it have done if\u2026\u2019 is answerable by replaying rather than reasoning.**",
    "**Three uses: debugging, recovery, counterfactuals.**",
    "**Recovery is the one that pays for persistence** \u2014 resume at step 6 of 9 rather than repeat six model calls.",
    "**All three are already paid for by per-superstep checkpointing** (9.4).",
    "**So the question is whether you use it, not whether to enable it.**",
    "**Forking re-executes nodes**, so 9.7's side-effect rule applies at a larger scale.",
    "**An idempotency key in state is replayed with the old value** \u2014 right for recovery, wrong for a counterfactual.",
    "**Keep effects in as few nodes as possible**, which is the same architecture 9.7 recommended."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "You fork a run from the checkpoint at step 1. What does the resulting trace contain?",
      options: ["Only the steps after the fork point",
        "The original run's steps up to the fork point, then the re-executed ones",
        "The full original trace plus the re-executed steps appended",
        "Only the final state, with no history"],
      answer: 1,
      why: "The fork restores the state as it stood at that checkpoint, including whatever an accumulating key had collected by then, and the reducer appends the re-executed steps to that prefix. So the history before the fork is real and only the suffix is recomputed \u2014 which is the advantage of forking from an address over re-running from the start." },
    { stem: "What does update_state at an old checkpoint return?",
      options: ["The mutated checkpoint, with the original overwritten",
        "A new checkpoint config, so the original branch survives for comparison",
        "None \u2014 it modifies state in place",
        "The full state history including the edit"],
      answer: 1,
      why: "It creates a branch rather than editing the past, which is what makes counterfactual comparison possible: you replay from the new config and still have the original run to compare against. In the measured case, changing n from 10 to 100 at step 1 produced add_ten -> 110 while the original's 20 remained available." },
    { stem: "Which use of time travel most justifies the cost of checkpointing in production?",
      options: ["Debugging, since the state is already recorded",
        "Recovery \u2014 resuming a run that failed at step 7 of 9 rather than repeating six model calls",
        "Counterfactual evaluation of prompt changes",
        "Auditing what the agent did"],
      answer: 1,

      why: "Debugging and counterfactuals are valuable and intermittent; recovery pays on every failed run, and the saving is proportional to how far the run got. Since the per-superstep checkpoint is already being written, all three are capabilities you have paid for \u2014 so a team persisting state and still debugging by adding log lines and re-running is paying twice." },
    { stem: "An engineer forks from a checkpoint before a payment node to finish a failed run. What happens?",
      options: ["The payment node is skipped, since it already succeeded",
        "The payment is executed again \u2014 forking re-executes nodes, so side effects repeat",
        "The replay raises, detecting the duplicate",
        "The checkpointer deduplicates by node name"],
      answer: 1,
      why: "Replay re-runs every node after the fork point, and the runtime has no knowledge of which nodes touched the world. The engineer picked the fork point by looking at where the failure was rather than where the effects were. The defences are forking after the last side effect \u2014 which requires knowing which nodes have them \u2014 and making effectful calls idempotent on a key carried in the state." }
  ] },
  interview: { title: "Interview practice", sub: "Time-travel debugging", questions: [
    { level: "core", q: "What is time-travel debugging in LangGraph and what is it for?",
      strong: "A strong answer names recovery as the one that pays.",
      answer: [
        { t: "p", text: "Every checkpoint carries an id, so an earlier state is an address. You can read it, or pass its config back to invoke and the graph continues from there \u2014 preserving the history before that point and re-executing only the rest." },
        { t: "p", text: "Three uses. Debugging: read the state before a bad decision rather than adding logging and re-running, because the state is already recorded. Counterfactuals: edit the state at an old checkpoint and replay, which lets you evaluate a prompt change against a real conversation rather than a synthetic one \u2014 I measured that, changing a value at step 1 and getting a different downstream result while the original branch stayed intact." },
        { t: "p", text: "But the one that pays for persistence in production is recovery. A run that failed at step 7 of 9 resumes from step 6 instead of repeating six model calls, and the saving scales with how far the run got." },
        { t: "p", text: "The framing I would use is that none of this is an extra feature with an extra cost. Checkpointing already writes the whole state every superstep, so time travel is what you have already paid for \u2014 the question is whether you use it." }
      ] },
    { level: "advanced", q: "What would you be careful about when replaying a run?",
      strong: "A strong answer names side effects and the idempotency ambiguity.",
      answer: [
        { t: "p", text: "Side effects, because forking re-executes nodes and the runtime has no idea which of them touched the world." },
        { t: "p", text: "It is the same constraint as resuming from an interrupt, at a larger scale. There, a node containing interrupt() runs twice, so nothing above the interrupt may have side effects. Here, every node after the fork point runs again \u2014 so a payment node gets replayed, and nothing warns you." },
        { t: "p", text: "I have seen that charge a customer twice: an engineer forked from before the failure to finish a run, and the fork point happened to be before the payment node. The mechanism worked exactly as designed; the engineer chose the fork point by where the failure was rather than where the effects were." },
        { t: "p", text: "So two defences. Fork after the last side effect, which requires knowing which nodes have them \u2014 and that argues for keeping effects in as few, clearly named nodes as possible. Which is incidentally the same architecture that makes approval gates safe, so the two constraints point the same way." },
        { t: "p", text: "The second is idempotency keys carried in state, and that one has a genuine ambiguity worth being deliberate about. Replaying with the old key makes the downstream call a no-op, which is exactly right for recovery and exactly wrong for a counterfactual where you want the action to happen differently. So the key's lifetime has to be a decision rather than an accident." }
      ] },
    { level: "core", q: "How would you build a regression suite for an agent using checkpoints?",
      strong: "A strong answer uses real forks as fixtures.",
      answer: [
        { t: "p", text: "By keeping real checkpoints as fixtures and replaying from them, which is the thing persistence makes possible and almost nobody uses." },
        { t: "p", text: "The idea is that a checkpoint is a complete, real state \u2014 a conversation that actually happened, with its messages, its tool results and its position in the graph. That is a far better test input than a synthetic state I constructed by hand, because I cannot imagine the shapes real conversations take." },
        { t: "p", text: "So when something goes wrong in production, I would save the checkpoint from just before the bad decision and turn it into a test: fork from it, assert on what the graph does next. That pins the specific failure with no fabrication at all." },
        { t: "p", text: "The same mechanism evaluates a change. Fork a set of saved checkpoints under the old prompt and the new one and compare the next decisions \u2014 which answers 'did this prompt change help' against real conversations rather than invented ones." },
        { t: "p", text: "The care needed is side effects, because forking re-executes nodes. For a test suite I would stub the effectful tools, which is the right thing anyway \u2014 but it has to be deliberate, since replaying a real checkpoint through a real payment node charges a real customer. That is an argument for keeping effects in few, clearly named nodes so they are easy to substitute." }
      ] }
  ] }
});
