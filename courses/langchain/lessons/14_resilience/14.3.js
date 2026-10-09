EC.receiveLesson({
  id: "14.3",
  lede: "A node that sends an email and **then** fails, with `max_attempts=3`: the run **succeeded** and the customer got **three emails**. The retry is working exactly as configured \u2014 LangGraph re-runs the **whole node**, because a node is the unit of retry. Then the finding that decides the design: an idempotency key stored in **graph state does not work**. The key written on attempt 1 was `None` on attempts 2 and 3, because a node's state writes are only committed when the node **succeeds** \u2014 a failed attempt's write is discarded with the attempt. Which is required for the retry to be transparent, and makes graph state **structurally unable** to hold the key. In an external ledger it took **2 attempts and 1 email** \u2014 the key also let the retry succeed.",
  objectives: [
    "Demonstrate a retry duplicating a side effect",
    "Measure why an idempotency key in graph state cannot work",
    "Place the key outside the retry's transaction",
    "Derive the key from the request rather than the attempt",
    "Distinguish a retry from a restart"
  ],
  prerequisites: ["14.2", "9.5", "9.6"],
  blocks: [
    { t: "h2", n: "01", id: "twice", text: "The retry that sends the email three times", sub: "And the run succeeded" },
    { t: "code", lang: "text", title: "A node that acts, then fails",
      code: "a node that sends and THEN fails, with max_attempts=3:\n  node attempts : 3\n  emails sent   : 3\n  final status  : sent",
      caption: "The run **succeeded**. The customer got three emails." },
    { t: "callout", kind: "trap", title: "The node is the unit of retry", body: [
      { t: "p", text: "LangGraph re-runs the **whole node**, not the part after the failure \u2014 so everything before the failing line happens again. There is no mechanism that could know which statement failed, and no way to resume a Python function in the middle." },
      { t: "p", text: "Which means the dangerous shape is **any** node that performs an effect and then does anything that can fail. Including a state write, a log, a second tool call, or a model call to summarise what it just did." }
    ] },
    { t: "h2", n: "02", id: "state", text: "A key in graph state does not work", sub: "The measurement" },
    { t: "code", lang: "text", title: "The key the node saw on each of its three attempts",
      code: "[None, None, None]\nemails sent: 3",
      caption: "It was written on attempt 1 and attempt 2 still saw `None`." },
    { t: "callout", kind: "insight", title: "And this is correct behaviour, not a bug", body: [
      { t: "p", text: "A node's state writes are only committed when the node **succeeds**, so a failed attempt's write is discarded along with the attempt. That is required for the retry to be transparent \u2014 a retry that left traces of its failed attempts in state would not be a retry, it would be three partial executions." },
      { t: "p", text: "So graph state is **structurally unable** to hold an idempotency key. Not awkward, not discouraged \u2014 unable, by the same property that makes retries safe for everything else. 9.5 is the related fact: a checkpoint holds the state as of the last **completed** superstep." }
    ] },
    { t: "h2", n: "03", id: "outside", text: "So the key lives outside the transaction", sub: "And claimed before the effect" },
    { t: "code", lang: "text", title: "With the key in an external ledger",
      code: "node attempts : 2\nemails sent   : 1\nledger        : {'ORD-4471-confirm': 'sent'}",
      caption: "**Two** attempts, not three \u2014 and one email." },
    { t: "callout", kind: "good", title: "The key did two things", body: [
      { t: "p", text: "It prevented the duplicate, and it let the retry **succeed**. Attempt 1 sent and failed; attempt 2 found the key, skipped the effect, and returned normally \u2014 so the retry stopped at two rather than exhausting its budget." },
      { t: "p", text: "The ordering is load-bearing: the key is claimed **before** the effect. Claiming it afterwards means a crash between the effect and the write leaves no record, so the retry sends again. That is the same bug with a smaller window, which is the worst kind \u2014 it passes testing." }
    ] },
    { t: "h2", n: "04", id: "where", text: "Where the key comes from", sub: "The request, not the node" },
    { t: "code", lang: "text", title: "Four options, one of them subtle",
      code: "good    hash of (thread_id, step, action, arguments)\n        or an id supplied by the caller\nbad     uuid4() in the node       -- different on every attempt\nbad     a timestamp               -- same\nsubtle  the model's own output, if the arguments it generates vary\n        between attempts",
      caption: "A key that changes per attempt is not a key." },
    { t: "callout", kind: "warn", title: "The subtle one is specific to agents", body: [
      { t: "p", text: "A deterministic key over **non-deterministic arguments** is not deterministic. The retry re-runs the whole node, so a model call inside it runs again \u2014 and if the model phrases the email differently or rounds the amount differently, the hash changes and the key does not match." },
      { t: "p", text: "So the key has to be derived from something stable: the thread, the step, and the **intent**, not the generated text. If the arguments genuinely must come from the model, generate them once in an earlier node and pass them in." }
    ] },
    { t: "h2", n: "05", id: "restart", text: "A restart is a different problem", sub: "And the answer depends on where the key lives" },
    { t: "table", head: ["the key lives in", "after a process restart"], rows: [
      ["memory (a dict)", "lost \u2014 **the effect repeats**"],
      ["graph state", "lost for the failed step; 9.5 means the checkpoint has the last **completed** superstep, so the step re-runs"],
      ["a store (9.6)", "survives \u2014 the effect does not repeat"],
      ["the external system itself", "**best** \u2014 the only guarantee that does not depend on your process"]
    ] },
    { t: "callout", kind: "mental", title: "So \u201cexactly once\u201d is not something a framework can give you", body: [
      { t: "p", text: "The strongest version available is **at-least-once delivery plus a deduplicating receiver**, and the receiver is usually not yours. A payment provider refusing a duplicate idempotency key is a real guarantee; your dict is a hope." },
      { t: "p", text: "Which is why the best answer to *\u201cwhere does the key go\u201d* is *\u201cin the request to the external system\u201d*. Every other location is a layer of your own that can be lost, and the one that cannot be lost is the one on the far side of the call." }
    ] },
    { t: "diagram", kind: "matrix", title: "Where the idempotency key has to live",
      caption: "Graph state is **structurally unable** to hold one: a node’s writes commit only on success, so the key written on attempt 1 read `None` on attempts 2 and 3. Measured — three attempts, three emails.",
      cols: ["survives a retry", "survives a restart", "verdict"],
      rows: ["a dict in memory", "graph state", "a store (9.6)", "the external system"],
      cells: [
        [true, false, { text: "lost on restart", tone: "warn" }],
        [{ text: "NO — always None", tone: "crit" }, false, { text: "cannot work", tone: "crit" }],
        [true, true, { text: "works", tone: "good" }],
        [true, true, { text: "the only real one", tone: "good" }]
      ] },
    { t: "exercise", kind: "build", title: "Make a side effect safe to retry",
      difficulty: "advanced", minutes: 34,
      body: "Build a node that performs a side effect and then fails, give it a retry policy, and measure how many times the effect happens. Then try to protect it with an idempotency key stored in graph state, recording what the key looked like on each attempt, and explain the result. Move the key outside the graph's transaction and measure again, including the attempt count. Say where the key must come from and why a key generated in the node cannot work. Finally distinguish a retry from a restart for each possible location of the key.",
      requirements: ["Build a node that acts then fails, with a retry policy",
        "Report the attempt count and the number of times the effect happened",
        "Explain why the whole node re-runs",
        "Attempt an in-state idempotency key and record it per attempt",
        "Explain why the in-state key is empty and why that is correct",
        "Move the key outside and measure attempts and effects",
        "Note that the key also lets the retry succeed",
        "State where the key must be derived from, including the agent-specific trap",
        "Compare retry against restart for four key locations"],
      hint: "Print the key the node sees on every attempt. It is None every time, and the reason is why the whole approach has to change.",
      solution: { lang: "python", title: "x1403.py \u2014 an in-state key is always None",
        code: 'def notify2(s):\n    seen_keys.append(s.get("sent_key"))\n    if s.get("sent_key") == "ORD-4471-confirm":\n        return {"n": a2["n"]}              # already sent, skip\n    sent2.append("email")\n    out = {"sent_key": "ORD-4471-confirm", "n": a2["n"]}\n    if a2["n"] < 3:\n        raise ConnectionError("timed out after sending")\n    return out\n\ng2.add_node("notify", notify2,\n            retry_policy=RetryPolicy(max_attempts=3))\n# seen_keys -> [None, None, None]     emails sent -> 3',
        out: "==============================================================================\nPART 1 -- the retry that sends the email twice\n==============================================================================\n  a node that sends and THEN fails, with max_attempts=3:\n    node attempts : 3\n    emails sent   : 3\n    final status  : sent\n\n  so the run SUCCEEDED and the customer got 3 emails. the retry is\n  working exactly as configured -- LangGraph re-runs the WHOLE node,\n  not the part after the failure, because a node is the unit of retry.\n\n==============================================================================\nPART 2 -- an idempotency key in graph state does NOT protect it\n==============================================================================\n  the key the node saw on each of its 3 attempts:\n    [None, None, None]\n    emails sent: 3\n\n  the key was written on attempt 1 and attempt 2 still saw None. a\n  node's state writes are only committed when the node SUCCEEDS, so a\n  failed attempt's write is discarded along with the attempt.\n\n  which is the whole point: the retry is meant to be transparent, so\n  it cannot let a failed attempt leave a trace in state. that makes\n  graph state structurally unable to hold an idempotency key.\n\n==============================================================================\nPART 3 -- so the key has to live outside the retry's transaction\n==============================================================================\n  with the key in an external ledger:\n    node attempts : 2\n    emails sent   : 1\n    ledger        : {'ORD-4471-confirm': 'sent'}\n\n  ONE email. and note the attempt count: TWO, not three. attempt 1\n  sent and then failed; attempt 2 found the key, skipped the effect,\n  and RETURNED SUCCESSFULLY -- so the retry stopped early rather than\n  exhausting its budget. an idempotency key does not just prevent the\n  duplicate, it lets the retry succeed.\n\n  the ordering also matters: the key is claimed BEFORE the effect, not\n  after. claiming it after means a crash between the effect and the\n  write leaves no record, and the retry sends again -- which is the\n  same bug with a smaller window.\n\n==============================================================================\nPART 4 -- where the key has to come from\n==============================================================================\n  it has to be derived from the REQUEST, not generated in the node.\n  a uuid4() made inside the node is different on every attempt, so it\n  identifies the attempt rather than the intent -- and an idempotency\n  key that changes per attempt is not one.\n\n    good   hash of (thread_id, step, action, arguments)\n           or an id supplied by the caller\n    bad    uuid4() in the node\n    bad    a timestamp\n    subtle the model's own output, if the arguments it generates vary\n           between attempts -- which they can, since the retry re-runs\n           the node and a model call inside it is not deterministic.\n\n  that last one is specific to agents and it is the one that catches\n  people: a deterministic key over non-deterministic arguments is not\n  deterministic.\n\n==============================================================================\nPART 5 -- and a restart is a different problem from a retry\n==============================================================================\n  a retry happens inside one run and the key protects it. a RESTART\n  after the process died is a fresh run, and whether it repeats the\n  effect depends on where the key lives:\n\n    in memory (a dict)   lost. the effect repeats.\n    in graph state       lost for the failed step, and 9.5 means the\n                         checkpoint has the state as of the last\n                         COMPLETED superstep -- so the step re-runs.\n    in a store (9.6)     survives. the effect does not repeat.\n    in the external\n      system itself      best. the payment provider refusing a\n                         duplicate key is the only guarantee that\n                         does not depend on your process at all.\n\n  so 'exactly once' is not something an agent framework can give you.\n  the strongest version available is at-least-once delivery plus a\n  deduplicating receiver, and the receiver is usually not yours.",
        notes: [
          { t: "p", text: "**A node that sent and then failed sent three times**, and the run SUCCEEDED \u2014 the retry worked exactly as configured." },
          { t: "p", text: "**The node is the unit of retry**: LangGraph re-runs the whole function, so everything before the failing line happens again." },
          { t: "p", text: "**An idempotency key in graph state was None on every attempt.**" },
          { t: "p", text: "**Because state writes are only committed when the node succeeds** \u2014 a failed attempt's write is discarded with the attempt." },
          { t: "p", text: "**Which is required for the retry to be transparent**, and makes graph state structurally unable to hold the key." },
          { t: "p", text: "**In an external ledger: 2 attempts, 1 email.** The key prevented the duplicate AND let the retry succeed." },
          { t: "p", text: "**The key is claimed BEFORE the effect** \u2014 claiming it after leaves a crash window that passes testing." },
          { t: "p", text: "**The key must be derived from the request**, not generated in the node \u2014 a uuid4 per attempt identifies the attempt, not the intent." },
          { t: "p", text: "**And the agent-specific trap**: a deterministic key over model-generated arguments is not deterministic, because the retry re-runs the model call." },
          { t: "p", text: "**\u2018Exactly once\u2019 is not available** \u2014 the strongest version is at-least-once plus a deduplicating receiver, and the receiver should be the external system." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: three confirmation emails and a green dashboard", body: [
      { t: "p", text: "Customers occasionally receive two or three identical confirmation emails. The error rate is zero, every run shows as successful, and the team cannot reproduce it \u2014 the node has a retry policy and the retries are working." },
      { t: "p", text: "That is the cause. The node sends the email and then does something that intermittently fails, so the retry re-runs the whole node, including the send. The run succeeds on the final attempt, which is why the dashboard is green: this is a success-path bug, and the retry count is the only trace of it." },
      { t: "p", text: "The fix is an idempotency key outside graph state \u2014 measured, a key in state is None on every retry, because a failed attempt's writes are discarded. In an external ledger, claimed before the send, three attempts became one email and two attempts. The diagnostic to add permanently is the retry attempt number on every span, because without it three attempts inside one run are invisible and they also corrupt latency and cost per run." }
    ] }
  ],
  takeaways: [
    "**A node that acted then failed performed its effect three times**, and the run succeeded.",
    "**The node is the unit of retry** \u2014 the whole function re-runs, not the part after the failure.",
    "**So any node that acts and then does anything fallible is dangerous.**",
    "**An idempotency key in graph state was None on every attempt.**",
    "**Because state writes commit only on success**, so a failed attempt's write is discarded.",
    "**Which is required for retries to be transparent** \u2014 so this is correct, not a bug.",
    "**Graph state is structurally unable to hold an idempotency key.**",
    "**In an external ledger: 2 attempts, 1 email.**",
    "**The key also let the retry succeed**, by letting attempt 2 skip and return normally.",
    "**Claim the key BEFORE the effect** \u2014 claiming it after leaves a crash window that passes testing.",
    "**Derive the key from the request**: thread, step, action, arguments \u2014 or a caller-supplied id.",
    "**A uuid4 in the node identifies the attempt, not the intent.**",
    "**And a deterministic key over model-generated arguments is not deterministic.**",
    "**\u2018Exactly once\u2019 is not available** \u2014 at-least-once plus a deduplicating receiver is, and the receiver should be the external system."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A node sends an email, then fails, with max_attempts=3. What happens?",
      options: ["The email is sent once and the run fails",
        "The email is sent three times and the run succeeds, because the whole node re-runs",
        "The retry resumes after the send and the email goes once",
        "The retry policy refuses to retry a node with side effects"],
      answer: 1,
      why: "A node is the unit of retry, so everything before the failing line executes again \u2014 there is no mechanism that could resume a Python function partway through. The run then succeeds on the final attempt, which makes this a success-path bug: the dashboard is green and the retry count is the only trace." },
    { stem: "Why was an idempotency key stored in graph state None on every retry attempt?",
      options: ["The reducer discarded it as a duplicate",
        "A node's state writes commit only when the node succeeds, so a failed attempt's write is discarded with the attempt",
        "The key was written after the exception was raised",
        "Graph state is not visible to a node reading it"],
      answer: 1,
      why: "This is required for retries to be transparent: a retry that left traces of its failed attempts in state would be three partial executions rather than one retried step. The consequence is that graph state is structurally unable to hold such a key \u2014 not discouraged, unable \u2014 and the key must live outside the graph's transaction." },
    { stem: "Why must an idempotency key be claimed before the side effect rather than after?",
      options: ["The external system validates the key first",
        "A crash between the effect and the write leaves no record, so the retry performs the effect again",
        "Writing after the effect blocks the retry policy",
        "Claiming first allows the key to be reused"],
      answer: 1,
      why: "Writing the key afterwards narrows the duplication window without closing it, and a narrow window is the worst case because it passes testing and fails in production. Claiming first means the worst outcome is a claimed key with no effect, which is a stuck record you can detect, rather than a duplicate effect you cannot undo." },
    { stem: "Why can a key generated from the model's own output be unreliable in an agent?",
      options: ["Model output cannot be hashed deterministically",
        "The retry re-runs the whole node including the model call, so the generated arguments can differ and the key changes",
        "The model does not see the key",
        "Keys must be shorter than model output"],
      answer: 1,
      why: "A deterministic hash over non-deterministic inputs is not deterministic. Since the whole node re-runs, a model call inside it runs again, and a differently phrased amount or description yields a different key that fails to match. The key must derive from stable facts \u2014 thread, step, intent \u2014 or the arguments must be generated once in an earlier node." }
  ] },
  interview: { title: "Interview practice", sub: "Idempotency", questions: [
    { level: "advanced", q: "How do you make a side effect safe to retry in an agent?",
      strong: "A strong answer rules out graph state with the measurement.",
      answer: [
        { t: "p", text: "With an idempotency key that lives outside the graph's state, claimed before the effect, derived from the request." },
        { t: "p", text: "The reason it cannot be in graph state is the thing I would want to be precise about, because it is the natural first instinct. I measured it: a node wrote the key on attempt 1 and saw None on attempts 2 and 3. A node's state writes commit only when the node succeeds, so a failed attempt's write is discarded along with the attempt." },
        { t: "p", text: "And that is correct behaviour \u2014 it is what makes a retry transparent rather than three partial executions. Which means graph state is structurally unable to hold the key, not merely a poor place for it." },
        { t: "p", text: "The problem it is solving is that the node is the unit of retry. LangGraph re-runs the whole function, so a node that sends an email and then fails sends three times \u2014 and the run succeeds, so the dashboard is green and the retry count is the only trace." },
        { t: "p", text: "With the key in an external ledger it was two attempts and one email. Worth noting that the key did two things: it prevented the duplicate and it let the retry succeed, because attempt 2 found the key, skipped the send and returned normally." }
      ] },
    { level: "advanced", q: "Can you achieve exactly-once execution?",
      strong: "A strong answer says no and names what is achievable.",
      answer: [
        { t: "p", text: "No, and I would rather say that plainly than describe a scheme that sounds like it." },
        { t: "p", text: "What is achievable is at-least-once delivery plus a deduplicating receiver. The key question is where the dedupe lives, and the ranking is clear: an in-memory dict is lost on restart and the effect repeats. Graph state is lost for the failed step, and the checkpoint holds the last completed superstep, so the step re-runs. A store survives. And the external system itself is best, because it is the only guarantee that does not depend on my process being alive." },
        { t: "p", text: "So the honest answer to 'where does the key go' is 'in the request to the external system'. A payment provider refusing a duplicate idempotency key is a real guarantee. My dict is a hope." },
        { t: "p", text: "The distinction I would draw out is between a retry and a restart. A retry happens inside one run and a key anywhere outside the node's transaction protects it. A restart after the process died is a fresh run, and only a key in durable storage \u2014 ideally the receiver's \u2014 survives it." },
        { t: "p", text: "There is also an agent-specific trap worth mentioning: a deterministic key over model-generated arguments is not deterministic, because the retry re-runs the model call and the arguments can come back phrased differently. So the key has to derive from the thread, the step and the intent, or the arguments have to be generated once in an earlier node and passed in." }
      ] },
    { level: "core", q: "A reviewer says the idempotency key should just be a uuid4 generated at the start of the node. What do you say?",
      strong: "A strong answer explains that it identifies the attempt, not the intent.",
      answer: [
        { t: "p", text: "That it would identify the attempt rather than the intent, so it would not prevent anything." },
        { t: "p", text: "The whole node re-runs on retry, including the line that generates the uuid. So attempt 2 produces a different key, finds no matching record, and performs the effect again \u2014 which is exactly the behaviour the key was meant to prevent. A key that changes per attempt is not an idempotency key." },
        { t: "p", text: "What it has to be derived from is something stable across attempts: a hash of the thread id, the step, the action and its arguments, or an id supplied by the caller. Then every attempt computes the same key and the second one finds the first one's record." },
        { t: "p", text: "There is a subtler version of the same mistake that is specific to agents, and I would raise it in the same conversation. If the arguments come from a model call inside the node, the retry re-runs that call, and a differently phrased description or a differently rounded amount changes the hash. So a deterministic key over non-deterministic arguments is not deterministic \u2014 the arguments have to be generated once in an earlier node and passed in." },
        { t: "p", text: "And wherever the key goes, it has to be claimed before the effect rather than after. Claiming after narrows the duplication window without closing it, which is worse than a wide window because it passes testing." }
      ] }
  ] }
});
