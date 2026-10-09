EC.receiveLesson({
  id: "14.6",
  lede: "A run fails at `ship` with the card already charged. The caller sees a `ConnectionError` \u2014 and the checkpointer still holds the **thread id**, the **checkpoint id**, `next: ('ship',)` and the completed steps. So a dead letter built from the exception alone is a complaint, and one built from the checkpoint is **actionable**. The measurement that makes the queue safe to drain: resuming with `invoke(None, cfg)` ran **only the failed step** \u2014 validate and charge did **not** run again, so the card was not charged twice. A queue whose entries can only be re-run from the start is a queue you dare not drain, so it fills up and becomes a list of things nobody did.",
  objectives: [
    "Inspect what a failed run leaves in the checkpointer",
    "Build a dead letter record that a human can act on",
    "Resume a failed run rather than re-running it",
    "Give the escalation path a condition at each hop",
    "Name the two things that make a dead letter queue useless"
  ],
  prerequisites: ["14.5", "10.8", "9.5"],
  blocks: [
    { t: "h2", n: "01", id: "leaves", text: "What a failed run leaves behind", sub: "More than the exception" },
    { t: "code", lang: "text", title: "Read from the checkpointer after the failure",
      code: "the exception the caller saw:\n  ConnectionError: warehouse API returned 503 after 3 attempts\n\nand what the checkpointer still holds:\n  thread_id      : ORD-4471\n  checkpoint_id  : 1f1c3217-c1b4-63f8-8002-4ab0aab7faf5\n  next           : ('ship',)\n  completed      : ['validate', 'charge']\n  tasks          : [('ship', \"ConnectionError('warehouse API ...')\")]",
      caption: "The state is **not** lost." },
    { t: "callout", kind: "note", title: "And the error is stored as a string", body: [
      { t: "p", text: "Not as an exception object. So a dead letter can **report** the failure but cannot re-raise it \u2014 which is fine for a human, and worth knowing if you intended to branch on the exception type during an automatic drain." },
      { t: "p", text: "The three fields that matter are `next`, which names the step that failed; the completed steps, which say what already happened; and the `checkpoint_id`, which is what makes resuming possible at all." }
    ] },
    { t: "h2", n: "02", id: "record", text: "The dead letter record", sub: "Two fields nobody thinks of" },
    { t: "code", lang: "text", title: "What goes in",
      code: "thread_id                'ORD-4471'\ncheckpoint_id            '1f1c3217-c1b4-63f8-8002-4ab0aab7faf5'\nfailed_node              'ship'\nerror_type               'ConnectionError'\nerror                    'warehouse API returned 503 after 3 attempts'\ncompleted_steps          ['validate', 'charge']\nattempts_made            3\neffects_already_applied  ['charge']\ncompensation_handles     {'charge': 'txn_8841'}\nfirst_seen               '2026-03-11T09:14:02Z'\ncustomer_visible         False",
      caption: "The last two of the first group are the ordinary ones." },
    { t: "callout", kind: "insight", title: "`effects_already_applied` and `compensation_handles`", body: [
      { t: "p", text: "The first tells the human **the card is charged** before they decide anything. Without it they have to go and look, and under pressure they may not \u2014 which is how a refund gets issued twice or a shipment goes out for an order that was cancelled." },
      { t: "p", text: "The second is 14.4's point: *\u201crefund the card\u201d* is not actionable and *\u201crefund `txn_8841`\u201d* is. Both of these have to be captured **when the step ran**, because the system that would tell you later may be the one that failed." }
    ] },
    { t: "h2", n: "03", id: "resume", text: "Resuming rather than re-running", sub: "The property that makes draining safe" },
    { t: "code", lang: "text", title: "invoke(None, cfg) after fixing the dependency",
      code: "steps        : ['validate', 'charge', 'ship']\nvalidate ran : 0 extra times\ncharge ran   : 0 extra times",
      caption: "**Only the failed step** executed." },
    { t: "callout", kind: "good", title: "So the card was not charged twice", body: [
      { t: "p", text: "Which is the property that makes a dead letter queue safe to drain automatically. And it depends on the call form: 10.8 measured that `invoke(input, cfg)` starts a **new run** and only `invoke(None, cfg)` resumes \u2014 so a drain written with the obvious call signature repeats every effect." },
      { t: "p", text: "A queue whose entries can only be re-run from the start is a queue you **dare not drain**. So it fills up, nobody touches it, and it becomes a list of things nobody did \u2014 which is the most common fate of a dead letter queue." }
    ] },
    { t: "h2", n: "04", id: "escalate", text: "The escalation path", sub: "With a condition at each hop" },

    {"kind": "steps", "title": "The escalation path, with a condition at each hop", "caption": "The condition is the useful part — *“retry then escalate”* is not a policy because it does not say when the retry is **wrong**. And the page hop is distinguished by blast radius, which is a count rather than a judgement.", "items": [{"label": "retry", "desc": "the error is transient AND the step is idempotent", "tone": "good", "code": "automatic"}, {"label": "degrade", "desc": "a partial answer is useful AND can be labelled", "tone": "good", "code": "automatic"}, {"label": "compensate", "desc": "effects applied AND every one is reversible", "tone": "warn", "code": "automatic"}, {"label": "dead letter", "desc": "none of the above, and the record is actionable", "tone": "crit", "code": "a human, eventually"}, {"label": "page", "desc": "many runs are failing, not one", "tone": "crit", "code": "a human, now"}], "t": "diagram", "id": "dg-14_6-04-0"},




    { t: "dl", items: [
      ["**retry**", "The error is transient **and** the step is idempotent (14.2, 14.3). Automatic, bounded, no human."],
      ["**degrade**", "A partial answer is useful **and** can be labelled (14.5). Automatic, and the user is told."],
      ["**compensate**", "Effects have been applied **and** can be undone (14.4). Automatic if every applied step is compensable."],
      ["**dead letter**", "None of the above, and the record is complete enough to act on. A human, eventually."],
      ["**page**", "The failure is affecting **many** runs, not one. A human, now."]
    ] },
    { t: "callout", kind: "warn", title: "The condition is the useful part", body: [
      { t: "p", text: "*\u201cRetry then escalate\u201d* is not a policy, because it does not say when the retry is **wrong**. 14.3 measured a retry that succeeded while sending three emails \u2014 no amount of escalation logic would have caught that, because nothing escalated." },
      { t: "p", text: "And the page hop is distinguished by **blast radius**, not severity. One run failing badly is a dead letter; fifty runs failing the same way is an incident, and the difference is a count rather than a judgement." }
    ] },
    { t: "h2", n: "05", id: "useless", text: "The two things that make the queue useless", sub: "Both organisational" },
    { t: "ol", items: [
      "**No owner.** A queue nobody is paged about is a log file with extra steps.",
      "**No classification.** 500 entries of one cause read as 500 problems."
    ] },
    { t: "callout", kind: "mental", title: "Alert on the age of the oldest entry, not the depth", body: [
      { t: "p", text: "A depth of 3 that is four days old is worse than a depth of 40 that is five minutes old. Depth measures arrival rate; **age** measures whether anyone is acting \u2014 and the second is the failure mode of a dead letter queue." },
      { t: "p", text: "For classification, the error type plus the failed node is enough to group them, and the grouping is what turns a queue into a bug report." }
    ] },
    { t: "callout", kind: "tradeoff", title: "And the metric for the mechanism itself", body: [
      { t: "p", text: "What **fraction** of dead letters were resolved by a human action that could have been automated. If it is high, the escalation condition is too eager \u2014 usually a retry predicate that excluded something it should have retried, which 14.2's deny-list default makes likely." },
      { t: "p", text: "That is the one metric that tells you the escalation path is mis-tuned rather than that the system is failing, and the two look identical from the queue depth." }
    ] },
    { t: "exercise", kind: "build", title: "Build a dead letter path",
      difficulty: "core", minutes: 28,
      body: "Run a multi-step graph that fails at a step after one with an effect, and report both what the caller saw and what the checkpointer still holds. Build a dead letter record from it, including the fields a human needs that are not obvious. Then fix the dependency and resume the run rather than re-running it, showing which steps executed. Give the escalation path a condition at each hop. Finally name the two things that make a dead letter queue useless and the metric that reveals a mis-tuned escalation.",
      requirements: ["Fail a graph at a step after one with an effect",
        "Report the exception and what the checkpointer holds",
        "Note how the error is stored",
        "Build a dead letter record with at least eight fields",
        "Identify the two fields that are not obvious and say why each matters",
        "Resume with the correct call form and show only the failed step ran",
        "Explain why the call form matters",
        "Give five escalation hops each with its condition",
        "Name the two organisational failures and the right alert metric"],
      hint: "Call get_state after the failure. The thread id, the checkpoint id and `next` are all still there.",
      solution: { lang: "python", title: "x1406.py \u2014 resume ran only the failed step",
        code: 'try:\n    app.invoke({"order": "ORD-4471", "steps": []}, cfg)\nexcept Exception as e:\n    err = e\n\nsnap = app.get_state(cfg)\nprint(snap.config["configurable"]["checkpoint_id"])\nprint(snap.next)                 # (\'ship\',)\nprint(snap.values["steps"])      # [\'validate\', \'charge\']\n\n# then, after fixing the dependency -- RESUME, do not re-run\nout = app2.invoke(None, cfg)\nprint(out["steps"])              # [\'validate\', \'charge\', \'ship\']',
        out: "==============================================================================\nPART 1 -- what a failed run leaves behind, measured from a checkpoint\n==============================================================================\n  the exception the caller saw:\n    ConnectionError: warehouse API returned 503 after 3 attempts\n\n  and what the checkpointer still holds:\n    thread_id      : ORD-4471\n    checkpoint_id  : 1f1c3217-c1b4-63f8-8002-4ab0aab7faf5\n    next           : ('ship',)\n    completed      : ['validate', 'charge']\n    tasks          : [('ship', '\"ConnectionError(\\'warehouse API returned 503 after 3')]\n                     (the error is stored as a STRING, not an\n                      exception -- so a dead letter cannot\n                      re-raise it, only report it)\n\n  so the state is NOT lost. the run stopped before 'ship' committed,\n  `next` names the step that failed, and the completed steps are\n  recorded. a dead letter built from this is actionable; one built\n  from the exception alone is not.\n\n==============================================================================\nPART 2 -- the dead letter record\n==============================================================================\n    attempts_made              3\n    checkpoint_id              '1f1c3217-c1b4-63f8-8002-4ab0aab7faf5'\n    compensation_handles       {'charge': 'txn_8841'}\n    completed_steps            ['validate', 'charge']\n    customer_visible           False\n    effects_already_applied    ['charge']\n    error                      'warehouse API returned 503 after 3 attempts'\n    error_type                 'ConnectionError'\n    failed_node                'ship'\n    first_seen                 '2026-03-11T09:14:02Z'\n    thread_id                  'ORD-4471'\n\n  the two fields that are not obvious are the ones that matter most:\n\n    effects_already_applied  so the human knows the card is charged\n                             before deciding anything. without it they\n                             have to go and look, and they may not.\n    compensation_handles     'refund the card' is not actionable;\n                             'refund txn_8841' is (14.4).\n\n  and `checkpoint_id` is what makes RESUMING possible rather than\n  re-running. 10.8 measured the distinction: invoke(None, cfg)\n  resumes, invoke(input, cfg) starts a new run -- so a dead letter\n  without the thread and checkpoint can only be retried from scratch,\n  which repeats the charge.\n\n==============================================================================\nPART 3 -- resuming the dead letter rather than re-running it\n==============================================================================\n  after fixing the warehouse and calling invoke(None, cfg):\n    steps        : ['validate', 'charge', 'ship']\n    validate ran : 0 extra times\n    charge ran   : 0 extra times\n\n  the resumed run executed ONLY the failed step. validate and charge\n  did not run again, so the card was not charged twice -- which is the\n  property that makes a dead letter queue safe to drain automatically.\n\n  a dead letter queue whose entries can only be re-run from the start\n  is a queue you dare not drain, so it fills up and becomes a list of\n  things nobody did.\n\n==============================================================================\nPART 4 -- the escalation path, and what has to be true at each hop\n==============================================================================\n  RETRY        the error is transient and the step is idempotent\n               (14.2, 14.3). automatic, bounded, no human.\n  DEGRADE      a partial answer is useful and can be labelled (14.5).\n               automatic, and the user is told.\n  COMPENSATE   effects have been applied and can be undone (14.4).\n               automatic if every applied step is compensable.\n  DEAD LETTER  none of the above, and the record is complete enough\n               to act on. a human, eventually.\n  PAGE         the failure is affecting many runs, not one. a human,\n               now.\n\n  the condition at each hop is the useful part. 'retry then escalate'\n  is not a policy because it does not say when the retry is wrong --\n  and 14.3 measured a retry that succeeded while sending three emails,\n  which no amount of escalation logic would have caught.\n\n==============================================================================\nPART 5 -- the two things that make a dead letter queue useless\n==============================================================================\n  1. NO OWNER. a queue nobody is paged about is a log file with extra\n     steps. the metric worth alerting on is not the queue depth, it is\n     the AGE of the oldest entry -- a depth of 3 that is four days old\n     is worse than a depth of 40 that is five minutes old.\n\n  2. NO CLASSIFICATION. 500 entries of one cause read as 500 problems.\n     the error type plus the failed node is enough to group them, and\n     the grouping is what turns a queue into a bug report.\n\n  and the thing to measure about the whole mechanism: what FRACTION\n  of dead letters were resolved by a human action that could have been\n  automated. if it is high, the escalation condition is too eager --\n  usually a retry predicate that excluded something it should have\n  retried, which the deny-list default makes likely (14.2).",
        notes: [
          { t: "p", text: "**The checkpointer still held the thread id, checkpoint id, `next` and the completed steps** \u2014 the state is not lost." },
          { t: "p", text: "**So a dead letter from the exception alone is a complaint**, and one from the checkpoint is actionable." },
          { t: "p", text: "**The error is stored as a string**, not an exception \u2014 so a drain cannot branch on its type." },
          { t: "p", text: "**Two non-obvious fields**: the effects already applied, and the compensation handles." },
          { t: "p", text: "**The first tells the human the card is charged before they decide**, which prevents a double refund." },
          { t: "p", text: "**The second is 14.4's point** \u2014 \u2018refund txn_8841\u2019 is actionable and must be captured when the step ran." },
          { t: "p", text: "**Resuming ran ONLY the failed step**, so the card was not charged twice." },
          { t: "p", text: "**And that depends on the call form**: `invoke(input, cfg)` starts a new run, only `invoke(None, cfg)` resumes (10.8)." },
          { t: "p", text: "**A queue you dare not drain becomes a list of things nobody did** \u2014 the most common fate of one." },
          { t: "p", text: "**Alert on the AGE of the oldest entry, not the depth**: depth measures arrival, age measures whether anyone is acting." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the queue with 4,000 entries and no owner", body: [
      { t: "p", text: "A team adds a dead letter queue. Six months later it holds 4,000 entries, the oldest from the week it was built, and nobody has drained it. The reason given is that re-running an entry might charge a customer twice." },
      { t: "p", text: "That reason is correct for how the drain was written, and it is why the queue is unusable. A re-run from the start repeats every completed step, so draining is dangerous \u2014 and a queue you dare not drain stops being a recovery mechanism and becomes a list of things nobody did." },
      { t: "p", text: "The fix is to store the thread id and checkpoint id on every entry and resume rather than re-run, which measured executes only the failed step, leaving the earlier charge untouched. The call form matters: passing input starts a new run and only passing None resumes. Then two organisational changes \u2014 an owner who is paged, and an alert on the age of the oldest entry rather than the depth, since a depth of 3 that is four days old is the worse signal. And grouping by error type plus failed node, so 4,000 entries resolve into the handful of causes they actually are." }
    ] }
  ],
  takeaways: [
    "**A failed run leaves the thread id, checkpoint id, `next` and completed steps** in the checkpointer.",
    "**So a dead letter from the exception alone is a complaint**, and one from the checkpoint is actionable.",
    "**The error is stored as a string**, so a drain cannot branch on its type.",
    "**Two non-obvious fields**: effects already applied, and compensation handles.",
    "**The first prevents a double refund** by telling the human what already happened.",
    "**The second must be captured when the step ran** \u2014 the system that would tell you later may be the one that failed.",
    "**Resuming ran only the failed step**, so the card was not charged twice.",
    "**Which depends on the call form**: `invoke(None, cfg)` resumes, `invoke(input, cfg)` starts a new run (10.8).",
    "**A queue you dare not drain becomes a list of things nobody did.**",
    "**Five escalation hops**, each with a condition: retry, degrade, compensate, dead letter, page.",
    "**The condition is the useful part** \u2014 \u2018retry then escalate\u2019 does not say when the retry is wrong.",
    "**The page hop is distinguished by blast radius**, not severity \u2014 a count, not a judgement.",
    "**Alert on the age of the oldest entry, not the depth.**",
    "**And measure what fraction of dead letters a human resolved by something automatable** \u2014 that reveals a too-eager escalation."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A run fails at a step. What does the checkpointer still hold?",
      options: ["Nothing \u2014 the failed superstep rolls back the thread",
        "The thread id, checkpoint id, the name of the failed step in `next`, and the completed steps",
        "Only the original input",
        "The full exception object for re-raising"],
      answer: 1,
      why: "The run stopped before the failing step committed, so the state as of the last completed superstep survives along with the identity of what was next. That is what makes a dead letter actionable rather than a complaint. The error itself is stored as a string, not an exception, so a drain can report it but cannot branch on its type." },
    { stem: "Why is resuming a failed run different from re-running it?",
      options: ["Resuming skips validation",
        "Resuming executes only the failed step, so completed effects like a charge are not repeated",
        "Re-running uses a different checkpointer",
        "Resuming bypasses the retry policy"],
      answer: 1,
      why: "Measured, a resumed run executed only the step that had failed \u2014 the earlier validate and charge did not run again. That is the property that makes automatic draining safe, and it depends on the call form: passing input starts a new run and only passing None resumes, so a drain written with the obvious signature repeats every effect." },
    { stem: "Which two fields make a dead letter record actionable rather than merely informative?",
      options: ["The timestamp and the error message",
        "The effects already applied and the compensation handles",
        "The thread id and the retry count",
        "The failed node and the error type"],
      answer: 1,
      why: "A human deciding what to do needs to know the card is already charged before they act, or a refund gets issued twice. And 'refund the card' is not actionable where 'refund txn_8841' is \u2014 both have to be captured at the moment the step ran, because the system that would tell you afterwards may be the one that failed." },
    { stem: "What should a dead letter queue alert on?",
      options: ["Queue depth, so you know the failure rate",
        "The age of the oldest entry, because depth measures arrival while age measures whether anyone is acting",
        "The rate of change of depth",
        "The number of distinct error types"],
      answer: 1,
      why: "A depth of 3 that is four days old is worse than a depth of 40 that is five minutes old. The characteristic failure of a dead letter queue is not that it fills quickly but that nobody drains it, and only age detects that. Grouping by error type plus failed node is the complementary step, turning a queue into a bug report." }
  ] },
  interview: { title: "Interview practice", sub: "Dead letters", questions: [
    { level: "core", q: "What happens when every recovery mechanism has failed?",
      strong: "A strong answer builds the record from the checkpoint.",
      answer: [
        { t: "p", text: "It goes to a dead letter record built from the checkpoint rather than from the exception, because the exception alone is a complaint and the checkpoint is actionable." },
        { t: "p", text: "I measured what survives a failure: the thread id, the checkpoint id, the name of the failed step in `next`, and the list of completed steps. So the record can say exactly where it stopped and what had already happened." },
        { t: "p", text: "The two fields I would insist on beyond the obvious ones are the effects already applied and the compensation handles. The first tells whoever picks it up that the card is charged before they decide anything \u2014 without it they have to go and look, and under pressure they may not, which is how a refund gets issued twice. The second is that 'refund the card' is not actionable and 'refund txn_8841' is, and that identifier has to be captured when the step ran, because the system that would tell you later may be the one that failed." },
        { t: "p", text: "One detail: the checkpointer stores the error as a string rather than an exception object. Fine for a human, and worth knowing if you intended an automatic drain to branch on the exception type." },
        { t: "p", text: "And I would want the escalation conditions written out rather than implied \u2014 retry if transient and idempotent, degrade if a labelled partial answer is useful, compensate if the applied effects are reversible, dead letter otherwise, and page if the failure is affecting many runs rather than one." }
      ] },
    { level: "advanced", q: "Why do dead letter queues usually end up unused?",
      strong: "A strong answer names the drain safety problem and the ownership gap.",
      answer: [
        { t: "p", text: "Two reasons, and the first is technical in a way that is fixable." },
        { t: "p", text: "Entries can only be re-run from the start, so draining might repeat an effect \u2014 charge a customer twice, send a second email. So nobody drains it, it fills up, and it becomes a list of things nobody did. That is the most common fate of one." },
        { t: "p", text: "The fix is to store the thread and checkpoint ids and resume rather than re-run. I measured a resumed run executing only the failed step, with the earlier charge untouched. It depends on the call form, which is easy to get wrong: passing input starts a new run and only passing None resumes." },
        { t: "p", text: "The second reason is organisational. A queue nobody is paged about is a log file with extra steps, and the right alert is the age of the oldest entry rather than the depth \u2014 a depth of 3 that is four days old is worse than a depth of 40 that is five minutes old, because age is what measures whether anyone is acting." },
        { t: "p", text: "The other half of that is classification. 500 entries of one cause read as 500 problems, and error type plus failed node is enough to group them. That is what turns a queue into a bug report." },
        { t: "p", text: "And the metric I would track about the mechanism itself is what fraction of dead letters a human resolved by an action that could have been automated. If that is high, the escalation condition is too eager \u2014 usually a retry predicate that excluded something it should have retried, which the deny-list default makes likely." }
      ] },
    { level: "advanced", q: "What would you put in front of a human reviewing a dead letter?",
      strong: "A strong answer designs for the decision, not the diagnosis.",
      answer: [
        { t: "p", text: "The decision they have to make, with everything needed to make it on one screen \u2014 not the trace, which is for diagnosis afterwards." },
        { t: "p", text: "So at the top: what the user asked for, what has already happened to the world, and what the options are. 'The card was charged \u00a3148.50 as transaction txn_8841. The shipment was not created. You can resume, refund, or escalate.' Those three facts and three buttons are the review." },
        { t: "p", text: "The effects-already-applied field is the one I would not compromise on, because without it the reviewer has to go and look in another system, and under pressure they may not \u2014 which is how a refund gets issued twice." },
        { t: "p", text: "Resume has to actually resume, not re-run. I measured that a resumed run executes only the failed step, so the earlier charge is untouched \u2014 but that depends on the call form, and a drain written with the obvious signature starts a new run and repeats everything. If resume is not safe, the button should not be there." },
        { t: "p", text: "Then grouping, because 500 entries from one cause read as 500 problems. Error type plus failed node is enough, and it turns the queue into a bug report \u2014 which is usually the more valuable output, since the individual entries are symptoms." },
        { t: "p", text: "And the trace link last, for the cases where the decision is not obvious. Leading with the trace is the common mistake: it is the right artefact for the engineer who will fix the cause and the wrong one for the person who has to decide what to do about this customer now." }
      ] }
  ] }
});
