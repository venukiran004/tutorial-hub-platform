EC.receiveLesson({
  id: "14.4",
  lede: "A four-step plan \u2014 reserve, charge, ship, email \u2014 fails at **ship**. Measured: the card is charged and nothing has shipped, so doing nothing leaves the customer paying for an order that does not exist, which is **worse than the original failure**. Compensating runs in **reverse order**, because the compensations have the same dependencies as the steps, inverted. Then the step that forces the design: move the email to **position 1** and a failure at step 2 is **unrecoverable** \u2014 an email cannot be un-sent, and a correction is a second effect, not an undo. So the rule is not stylistic: **non-compensable steps go last**, because any failure before them is recoverable and any failure after them is not \u2014 which makes a planner's step ordering a **correctness property**.",
  objectives: [
    "Run a plan that fails partway and inspect the resulting state",
    "Compensate in reverse order and explain why the order matters",
    "Identify steps that cannot be compensated",
    "Derive the ordering rule and make it checkable",
    "Say what a saga has to record, and where"
  ],
  prerequisites: ["14.3", "11.6"],
  blocks: [
    { t: "h2", n: "01", id: "halfway", text: "A plan that fails halfway", sub: "And why doing nothing is worse" },
    { t: "code", lang: "text", title: "Four steps, failing at the third",
      code: "completed: ['reserve stock', 'charge the card']\nfailed at: ship (ConnectionError: warehouse API down)\nworld    : {'reserved': True, 'charged': True,\n            'emailed': False, 'shipped': False}",
      caption: "The card is charged and nothing has shipped." },
    { t: "p", text: "Doing nothing leaves the customer paying for an order that does not exist \u2014 which is **worse than the original failure**, because the original failure was recoverable and this state is a support ticket." },
    { t: "h2", n: "02", id: "reverse", text: "Compensating in reverse", sub: "And why the order is not arbitrary" },
    { t: "code", lang: "text", title: "Unwinding",
      code: "charge the card    compensated\nreserve stock      compensated\nworld after compensation: {'reserved': False, 'charged': False, ...}",
      caption: "Last done, first undone." },
    { t: "callout", kind: "insight", title: "The compensations have the steps' dependencies, inverted", body: [
      { t: "p", text: "Releasing stock before refunding is harmless in this example. In a system where the refund needs the reservation record to look up the transaction, it is not \u2014 and reasoning about which case you are in, per plan, is more expensive than always going in reverse." },
      { t: "p", text: "So reverse order is a rule you adopt because it is cheap and always safe, not because every plan requires it. That is usually the right trade for a recovery path, which is the code least likely to be exercised and most likely to be wrong." }
    ] },
    { t: "h2", n: "03", id: "noncomp", text: "The step that cannot be undone", sub: "The same plan, reordered" },
    { t: "code", lang: "text", title: "With the email moved to step 1",
      code: "completed : ['email the customer']\nfailed at : charge the card\nsent      : [\"email: 'your order is confirmed'\"]\ncan it be un-sent? NO",
      caption: "The customer has been told their order is confirmed. It is not." },
    { t: "callout", kind: "trap", title: "A correction is a second effect, not an undo", body: [
      { t: "p", text: "An email is not compensable. Neither is a webhook delivered to a third party, a message posted to a channel, or a file written to someone else's bucket. Sending *\u201cplease disregard\u201d* does not restore the previous state \u2014 the customer has now been told two things and trusts neither." },
      { t: "p", text: "Which is why the category matters more than the mechanism. Most of the saga literature is about **how** to compensate; the part that decides whether your plan is correct is **which steps you cannot**." }
    ] },
    { t: "h2", n: "04", id: "rule", text: "So the ordering rule is forced", sub: "Non-compensable steps go last" },
    { t: "code", lang: "text", title: "Same steps, same compensations, different semantics",
      code: "reserve, charge, ship, email     a failure anywhere is recoverable\nemail, reserve, charge, ship     a failure after step 1 is not",
      caption: "The ordering is a **correctness property**, not a style choice." },
    { t: "callout", kind: "warn", title: "And a planner has no reason to know this", body: [
      { t: "p", text: "11.6's planner generates the step list from the task. Nothing in a tool's name or description tells it that `send_email` is irreversible and `reserve_stock` is not \u2014 so the ordering constraint has to be **metadata on the tool**, checked before execution." },
      { t: "p", text: "The check is mechanical: if any non-compensable step is followed by a compensable one, the plan is reorderable and should be reordered. If it cannot be reordered because of a real dependency, the plan needs a human (14.6) rather than an attempt." }
    ] },
    { t: "h2", n: "05", id: "record", text: "What a saga records, and where", sub: "Not in the thing it compensates" },
    { t: "p", text: "14.3's measurement applies directly: a failed attempt's state writes are discarded. So the compensation log cannot live in graph state \u2014 it goes to a store or a table, written as each step **completes**." },
    { t: "code", lang: "text", title: "Per completed step",
      code: "step, arguments, result, timestamp, compensation handle",
      caption: "The handle is the part people forget." },
    { t: "callout", kind: "good", title: "\u201cRefund the card\u201d is not actionable", body: [
      { t: "p", text: "*\u201cRefund transaction `txn_8841`\u201d* is. So the record has to capture whatever identifier the compensation will need, at the moment the step runs \u2014 because it may not be derivable afterwards, especially if the failure is the system that would have told you." },
      { t: "p", text: "And if compensation itself fails, that is a **dead letter** (14.6), not a retry loop. A failed compensation is the one case where a human genuinely has to look, because the system is now in a state no code path anticipated." }
    ] },
    { t: "diagram", kind: "steps", title: "Non-compensable steps go last",
      caption: "Not a style choice — a **correctness property**. With the email last, a failure anywhere is recoverable. Move it to step 1 and any failure after it is not, because a correction email is a second effect rather than an undo.",
      items: [
        { label: "reserve stock", desc: "compensation: release the reservation", tone: "good", code: "reversible" },
        { label: "charge the card", desc: "compensation: refund txn_8841 — capture the handle NOW", tone: "good", code: "reversible" },
        { label: "create the shipment", desc: "compensation: cancel the shipment", tone: "good", code: "reversible" },
        { label: "email the customer", desc: "nothing can un-send it — so it must go last", tone: "crit", code: "FINAL" }
      ] },
    { t: "exercise", kind: "build", title: "Undo a half-finished plan",
      difficulty: "advanced", minutes: 32,
      body: "Run a multi-step plan that fails partway and report which steps completed, where it failed, and the resulting state. Explain why doing nothing is worse than the original failure. Compensate in reverse order and say why the order matters. Then reorder the plan so a non-compensable step runs first, run it again, and show that the failure is now unrecoverable. Derive the ordering rule, make it mechanically checkable, and say what the saga has to record and where.",
      requirements: ["Run a plan that fails partway and report completed steps and state",
        "Explain why doing nothing is worse than the failure",
        "Compensate in reverse order and show the resulting state",
        "Justify reverse order",
        "Reorder so a non-compensable step is first and run it again",
        "Show that the failure is now unrecoverable and explain why a correction is not an undo",
        "State the ordering rule and the mechanical check",
        "Say why a planner cannot know this and where the metadata belongs",
        "List what each completed step records, including the compensation handle"],
      hint: "Run the same plan twice with the email in different positions. The second one cannot be undone.",
      solution: { lang: "python", title: "x1404.py \u2014 the ordering is a correctness property",
        code: 'STEPS = [("reserve stock", reserve, lambda: world.update(reserved=False)),\n         ("charge the card", charge, lambda: world.update(charged=False)),\n         ("ship", ship, None),            # fails\n         ("email the customer", email, None)]   # NOT compensable\n\ndone, failed_at = [], None\nfor name, do, undo in STEPS:\n    try:\n        do(); done.append((name, undo))\n    except Exception as e:\n        failed_at = (name, type(e).__name__, str(e)); break\n\nfor name, undo in reversed(done):        # REVERSE order\n    if undo is None:\n        print(name, "CANNOT BE COMPENSATED")\n    else:\n        undo()',
        out: "==============================================================================\nPART 1 -- a four-step plan that fails at step 3\n==============================================================================\n  completed: ['reserve stock', 'charge the card']\n  failed at: ship (ConnectionError: warehouse API down)\n  world    : {'reserved': True, 'charged': True, 'emailed': False, 'shipped': False}\n\n  so the card is charged and nothing has shipped. doing nothing leaves\n  the customer paying for an order that does not exist -- which is\n  worse than the original failure.\n\n==============================================================================\nPART 2 -- compensating in REVERSE order\n==============================================================================\n    charge the card    compensated\n    reserve stock      compensated\n  world after compensation: {'reserved': False, 'charged': False, 'emailed': False, 'shipped': False}\n\n  reverse order matters because the compensations have the same\n  dependencies as the steps, inverted. releasing stock before refunding\n  is harmless here; in a system where the refund needs the reservation\n  record it is not, and the general rule is cheaper than reasoning\n  about each case.\n\n==============================================================================\nPART 3 -- the step that cannot be compensated -- and the measurement\n==============================================================================\n  the SAME plan with the email moved to step 1:\n    completed : ['email the customer']\n    failed at : charge the card\n    sent      : [\"email: 'your order is confirmed'\"]\n    can it be un-sent? NO\n\n  an email is not compensable. neither is a webhook delivered to a\n  third party, a message posted to a channel, or a file written to\n  someone else's bucket. a 'correction' email is a second effect, not\n  an undo -- the customer has now been told two things.\n\n  so the ordering rule is forced: THE NON-COMPENSABLE STEPS GO LAST.\n  not because it is tidier, but because any failure before them is\n  recoverable and any failure after them is not.\n\n==============================================================================\nPART 4 -- which makes the plan's shape a correctness property\n==============================================================================\n  the two orderings use the same steps and the same compensations and\n  have different failure semantics:\n\n    reserve, charge, ship, email     a failure anywhere is recoverable\n    email, reserve, charge, ship     a failure after step 1 is not\n\n  so when a PLANNER generates the plan (11.6), the ordering is not a\n  stylistic choice it can make freely -- and a planner has no reason\n  to know which of its tools are compensable. that has to be metadata\n  on the tool, checked before execution:\n\n    @tool(...)  compensable=True / False\n\n  and the check is mechanical: if any non-compensable step is followed\n  by a compensable one, the plan is reorderable and should be\n  reordered. if it cannot be reordered because of a real dependency,\n  the plan needs a human (14.6) rather than an attempt.\n\n==============================================================================\nPART 5 -- what a saga needs recorded, and where\n==============================================================================\n  the compensation log cannot live in the same place as the thing it\n  compensates, for the reason 14.3 measured: a failed attempt's state\n  writes are discarded. so the log goes to a store or a table, written\n  as each step COMPLETES:\n\n    step, arguments, result, timestamp, compensation handle\n\n  the compensation handle is the part people forget. 'refund the card'\n  is not actionable -- 'refund transaction txn_8841' is. so the record\n  has to capture whatever identifier the compensation will need, at\n  the moment the step runs, because it may not be derivable later.\n\n  and if compensation itself fails, that is a dead letter (14.6), not\n  a retry loop. a failed compensation is the one case where a human\n  genuinely has to look, because the system is now in a state no code\n  path anticipated.",
        notes: [
          { t: "p", text: "**The plan failed at ship with the card charged**, so doing nothing leaves the customer paying for an order that does not exist." },
          { t: "p", text: "**Which is worse than the original failure**, because the failure was recoverable and this state is a support ticket." },
          { t: "p", text: "**Compensation runs in reverse order**, because the compensations carry the steps' dependencies, inverted." },
          { t: "p", text: "**Reverse is a rule adopted for being cheap and always safe**, rather than because every plan needs it \u2014 the right trade for code that rarely runs." },
          { t: "p", text: "**With the email moved to step 1, a failure at step 2 is unrecoverable.**" },
          { t: "p", text: "**A correction is a second effect, not an undo** \u2014 the customer has been told two things." },
          { t: "p", text: "**So non-compensable steps go last**: a failure before them is recoverable and after them is not." },
          { t: "p", text: "**Which makes the plan's ordering a correctness property**, not a style choice." },
          { t: "p", text: "**And a planner cannot know it** \u2014 so compensability is metadata on the tool, checked before execution." },
          { t: "p", text: "**The record needs the compensation handle**: \u2018refund txn_8841\u2019 is actionable and \u2018refund the card\u2019 is not. And a failed compensation is a dead letter, not a retry." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the planner that emailed first", body: [
      { t: "p", text: "A plan-and-execute agent handles order fulfilment. Its planner, given 'confirm this order', produces: email the customer, reserve stock, charge the card, create the shipment. It works until the payment provider has an outage, and then customers hold confirmations for orders that were never charged." },
      { t: "p", text: "The ordering is wrong and the planner had no way to know it. Nothing in the name or description of `send_email` says it is irreversible, so the model put the customer-facing step first because that reads as helpful. Measured, the same four steps with the email last make every failure recoverable; with the email first, any failure after step 1 is not \u2014 and a 'please disregard' email is a second effect, not an undo." },
      { t: "p", text: "The fix is metadata rather than prompting: mark each tool compensable or not, and check the generated plan before executing it. If a non-compensable step is followed by a compensable one, reorder; if a real dependency prevents reordering, send the plan to a human instead of attempting it. And the compensation log goes to a store rather than graph state, with the handle each undo will need \u2014 'refund txn_8841', not 'refund the card' \u2014 because a failed attempt's state writes are discarded." }
    ] }
  ],
  takeaways: [
    "**A plan that failed at step 3 left the card charged and nothing shipped.**",
    "**Doing nothing is worse than the original failure** \u2014 the failure was recoverable, this is a ticket.",
    "**Compensate in reverse order**: the compensations carry the steps' dependencies, inverted.",
    "**Reverse is adopted for being cheap and always safe**, not because every plan requires it.",
    "**With a non-compensable step first, a later failure is unrecoverable.**",
    "**A correction is a second effect, not an undo.**",
    "**An email, a webhook, a channel message and someone else's bucket are all non-compensable.**",
    "**So non-compensable steps go last** \u2014 failures before them are recoverable, after them are not.",
    "**Which makes the plan's ordering a correctness property.**",
    "**A planner cannot know which tools are reversible**, so it is metadata on the tool.",
    "**The check is mechanical**: a non-compensable step followed by a compensable one is reorderable.",
    "**If a real dependency blocks reordering, the plan needs a human** (14.6).",
    "**The compensation log goes to a store, not graph state** \u2014 failed attempts' writes are discarded (14.3).",
    "**And it must record the compensation handle** \u2014 \u2018refund txn_8841\u2019, not \u2018refund the card\u2019."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A plan fails after charging the card but before shipping. Why is doing nothing the worst option?",
      options: ["The retry policy will not fire again",
        "The customer is paying for an order that does not exist \u2014 a recoverable failure has become a support ticket",
        "The checkpoint cannot be resumed once a step has an effect",
        "The reservation expires and corrupts the state"],
      answer: 1,
      why: "The original failure was a warehouse API being unavailable, which is transient and recoverable. Leaving the charge in place converts it into an inconsistent state that no automatic path will resolve, and the customer experiences it as being billed for nothing. Compensation exists to keep a failure from becoming an inconsistency." },
    { stem: "Why must compensating actions run in reverse order?",
      options: ["Reverse order is required by the checkpointer",
        "The compensations carry the same dependencies as the steps, inverted \u2014 and always reversing is cheaper than reasoning per plan",
        "Forward order would double-compensate the first step",
        "It minimises the number of calls"],
      answer: 1,
      why: "A refund may need the reservation record to locate the transaction, so releasing the reservation first can break it. Whether a given plan has such a dependency is more expensive to determine than simply always unwinding in reverse \u2014 a good trade for a recovery path, which is the code least exercised and most likely to be wrong." },
    { stem: "Why do non-compensable steps have to go last?",
      options: ["They are usually the slowest",
        "Any failure before them is recoverable and any failure after them is not, so their position decides the plan's failure semantics",
        "They cannot be retried",
        "Planners generate them last by default"],
      answer: 1,
      why: "Measured on the same four steps: with the email last, a failure anywhere can be unwound; with the email first, a failure at step 2 leaves the customer holding a confirmation for an order that was never charged. The step list is therefore a correctness property rather than a stylistic choice, and a correction email is a second effect, not an undo." },
    { stem: "Where does the compensation log belong, and why?",
      options: ["In graph state, so it is checkpointed with the run",
        "In a store or table outside the graph, because a failed attempt's state writes are discarded",
        "In the tool's own response",
        "In the dead letter queue from the start"],
      answer: 1,
      why: "The same mechanism that makes an in-state idempotency key useless applies here: writes commit only when a node succeeds, so the log of what to undo would be lost exactly when a step fails. It must be written externally as each step completes, including the handle the undo will need \u2014 'refund txn_8841' rather than 'refund the card'." }
  ] },
  interview: { title: "Interview practice", sub: "Saga and compensation", questions: [
    { level: "advanced", q: "How would you handle an agent plan that fails halfway through?",
      strong: "A strong answer compensates in reverse and records handles.",
      answer: [
        { t: "p", text: "By compensating the completed steps in reverse order, from a log written outside the graph." },
        { t: "p", text: "The reason it matters is that the partial state is often worse than the failure. I ran a four-step plan \u2014 reserve, charge, ship, email \u2014 that failed at ship, and the result was a charged card and no shipment. The original failure was a transient API outage; the state left behind is a customer paying for nothing." },
        { t: "p", text: "Reverse order because the compensations carry the steps' dependencies inverted \u2014 a refund may need the reservation record to find the transaction. Rather than reason about that per plan, I would always reverse, because this is the code path least likely to be exercised and most likely to be wrong." },
        { t: "p", text: "The log has to live in a store rather than graph state, for the reason I measured elsewhere: a failed attempt's state writes are discarded, so the record of what to undo disappears exactly when a step fails. It is written as each step completes." },
        { t: "p", text: "And each entry needs the compensation handle. 'Refund the card' is not actionable; 'refund transaction txn_8841' is \u2014 and that identifier may not be derivable later, especially if the thing that failed is the system that would have told you." }
      ] },
    { level: "advanced", q: "What do you do about steps that cannot be undone?",
      strong: "A strong answer makes ordering a checked property.",
      answer: [
        { t: "p", text: "Put them last, and check that mechanically rather than trusting the planner." },
        { t: "p", text: "The measurement that convinced me is that the same four steps have different failure semantics depending on order. With the email last, a failure anywhere is recoverable. With the email first, a failure at step 2 leaves the customer holding a confirmation for an order that was never charged \u2014 and an email cannot be un-sent. A 'please disregard' is a second effect, not an undo; the customer has now been told two things and trusts neither." },
        { t: "p", text: "So the step ordering is a correctness property, not a style choice. And a planner has no reason to know it \u2014 nothing in a tool's name or description says send_email is irreversible while reserve_stock is not. In fact a model will tend to put the customer-facing step first, because that reads as helpful." },
        { t: "p", text: "Which means compensability has to be metadata on the tool and the check runs before execution: if any non-compensable step is followed by a compensable one, the plan is reorderable and gets reordered. If a genuine dependency prevents that, the plan goes to a human rather than being attempted." },
        { t: "p", text: "The same category covers webhooks to third parties, messages posted to channels, and files written to someone else's storage. And if a compensation itself fails, that is a dead letter rather than a retry loop \u2014 it is the one case where a human genuinely has to look, because the system is in a state no code path anticipated." }
      ] },
    { level: "core", q: "How would you test a compensation path?",
      strong: "A strong answer forces the failure at each step deliberately.",
      answer: [
        { t: "p", text: "By forcing a failure at every step in turn and asserting the world is back where it started \u2014 because this is the code path least likely to run naturally and most likely to be wrong." },
        { t: "p", text: "So for an n-step plan I would have n tests: fail at step 1, fail at step 2, and so on. Each one runs the plan, triggers the failure, runs the compensation, and then asserts on the external state rather than on the log \u2014 the log says what the code thought it did." },
        { t: "p", text: "The case that catches real bugs is failing at the last step, because that is where the most compensations have to run and where the reverse ordering actually matters. A plan that fails at step 1 has nothing to undo." },
        { t: "p", text: "I would also test that a compensation failing is handled, since that is the one case that genuinely needs a human \u2014 the system is then in a state no code path anticipated, so it should become a dead letter rather than a retry loop." },
        { t: "p", text: "And there is a check that is not a test: assert at plan-construction time that no non-compensable step is followed by a compensable one. That is a property of the plan rather than of a run, so it catches the ordering bug before anything executes \u2014 which matters when a planner is generating the plan, because it will generate a different one tomorrow." }
      ] }
  ] }
});
