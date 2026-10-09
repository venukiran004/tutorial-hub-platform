EC.receiveLesson({
  id: "14.2",
  lede: "Exponential backoff without jitter is **deterministic**, so every client that failed together retries together \u2014 measured, 60 clients all landed in **one 50 ms window**, which is the same spike that caused the failure arriving again half a second later. Full jitter cut the peak to **9**; equal jitter to 14, trading an even spread for a guaranteed minimum wait. Then the breaker: 100 requests at 3 attempts each made **300 doomed calls** to a dead dependency, and the breaker turned that into **5**. And LangGraph's default retry predicate is a **deny list**, so an `AttributeError` from a typo *is* retried and a `TimeoutError` is **not**, because it subclasses `OSError`.",
  objectives: [
    "Measure why backoff needs jitter",
    "Compare full and equal jitter",
    "Read what LangGraph's default retry predicate actually does",
    "Implement a circuit breaker and measure what it saves",
    "Say what should never be retried"
  ],
  prerequisites: ["14.1", "10.4"],
  blocks: [
    { t: "h2", n: "01", id: "jitter", text: "Why backoff needs jitter", sub: "The synchronised retry" },
    { t: "code", lang: "text", title: "60 clients retrying, in 50 ms windows",
      code: "strategy       busiest window   delay range\nno jitter      60 of 60         0.50s - 0.50s\nfull jitter     9 of 60         0.02s - 0.49s\nequal jitter   14 of 60         0.25s - 0.50s",
      caption: "Backoff alone is **deterministic**, so it preserves the spike." },
    { t: "callout", kind: "insight", title: "The retry wave is the original outage, repeated", body: [
      { t: "p", text: "If 60 clients failed because a dependency was overloaded, backoff without jitter sends all 60 back at the same instant \u2014 so the dependency gets the same spike that knocked it over, 500 ms later, and again at 1 s, 2 s, 4 s." },
      { t: "p", text: "**Full jitter** spreads them across the whole interval, cutting the peak by about 85%. **Equal jitter** spreads them across the second half, so its peak is roughly twice full jitter's \u2014 the trade is a guaranteed minimum wait for a less even spread, which is worth it when each retry is expensive and you want none arriving immediately." }
    ] },
    { t: "h2", n: "02", id: "predicate", text: "What LangGraph actually retries", sub: "A deny list, not an allow list" },
    { t: "code", lang: "text", title: "default_retry_on, asked directly",
      code: "ValueError         -> False\nTimeoutError       -> False\nConnectionError    -> True\nAttributeError     -> True\nKeyError           -> False\nRuntimeError       -> False",
      caption: "Read from `langgraph.types.default_retry_on`." },
    { t: "callout", kind: "trap", title: "Which is the opposite of what the names suggest", body: [
      { t: "p", text: "`TimeoutError` is **not** retried, because it subclasses `OSError`, which is on the deny list. A timeout is the single most retryable failure there is, and the default declines it." },
      { t: "p", text: "`AttributeError` **is** retried, three times, because it is not on the list. A typo in a node now costs three attempts and three times the latency before it fails identically." },
      { t: "p", text: "So the predicate is worth writing explicitly rather than taking. The default's shape \u2014 deny the things we recognise, retry the rest \u2014 is defensible for a library that cannot know your dependencies, and it is not a policy for a system that can." }
    ] },
    { t: "h2", n: "03", id: "breaker", text: "The circuit breaker", sub: "Measured against a dead dependency" },
    { t: "code", lang: "text", title: "100 requests, 3 attempts each",
      code: "no breaker   : 300 calls to a dependency that is down\nwith breaker : 5 attempted, 295 skipped\ntransitions  : [('closed', 'open')]",
      caption: "**300 doomed calls became 5.**" },
    { t: "p", text: "And the 5 it made were the ones that **discovered** the problem. Everything after was refused locally, in microseconds, with no network round trip \u2014 which is the difference between a degraded dependency and a degraded dependency plus 295 requests waiting on timeouts." },
    { t: "h2", n: "04", id: "halfopen", text: "Half-open is the part people omit", sub: "And the measured transitions" },
    { t: "code", lang: "text", title: "The full state machine, exercised",
      code: "after 2 failures          : state=open\none probe while still down: state=open (re-opened on ONE failure)\ndependency recovers, one probe succeeds:\n  result='ok' state=closed\n\ntransitions: [('closed','open'), ('open','half-open'),\n              ('half-open','open'), ('open','half-open'),\n              ('half-open','closed')]",
      caption: "Half-open sends **one** request, not a wave." },
    { t: "callout", kind: "warn", title: "And one failure in half-open re-opens immediately", body: [
      { t: "p", text: "It does not spend the failure threshold again. Without that, recovery means every waiting client hitting a dependency that has just come back up \u2014 which knocks it over again, and now you have an outage that oscillates." },
      { t: "p", text: "So a breaker without half-open is not a breaker, it is a timer. The two properties that make it work are that the probe is **singular** and that a failed probe is **immediately** disqualifying." }
    ] },
    { t: "h2", n: "05", id: "never", text: "What should not be retried", sub: "Three categories" },
    { t: "dl", items: [
      ["**safe**", "A read. A model call that failed before generating. A tool lookup."],
      ["**unsafe**", "Anything that already had an effect \u2014 which is 14.3, where the measurement is that LangGraph re-runs the **whole node**, so a node that acts and then fails acts twice."],
      ["**pointless**", "A 400-class error. A schema validation failure. A malformed prompt. Retrying a deterministic failure three times costs three times as much and fails three times."]
    ] },
    { t: "callout", kind: "tradeoff", title: "And the default policy retries several pointless cases", body: [
      { t: "p", text: "An `AttributeError`, a bare `Exception` subclass you defined, anything not on the deny list. Each of those is deterministic, so the retry is pure cost \u2014 and with backoff it is cost plus latency." },
      { t: "p", text: "The practical rule: write `retry_on` as an explicit allow list of the transport failures your dependencies actually produce. That is usually three or four exception types, and it is shorter than the deny list it replaces." }
    ] },
    { t: "diagram", kind: "cycle", title: "The breaker’s state machine", centre: "measured",
      caption: "100 requests at 3 attempts each made **300** doomed calls to a dead dependency; the breaker made **5** and skipped 295. Half-open sends **one** probe, and a single failure there re-opens immediately rather than spending the threshold again.",
      nodes: [
        { label: "closed", sub: "calls pass through", tone: "good", edge: "5 failures" },
        { label: "open", sub: "295 refused locally", tone: "crit", edge: "cooldown expires" },
        { label: "half-open", sub: "exactly ONE probe", tone: "warn", edge: "probe succeeds" }
      ] },
    { t: "exercise", kind: "build", title: "Retry correctly",
      difficulty: "core", minutes: 32,
      body: "Compute exponential backoff delays and show the problem with determinism by measuring how many of 60 clients land in the same short window with no jitter, full jitter and equal jitter. Read LangGraph's default retry predicate and report what it does with several common exception types. Then implement a circuit breaker with closed, open and half-open states, measure how many calls it saves against a dead dependency, and exercise the half-open transition in both directions. Finally classify what should and should not be retried.",
      requirements: ["Compute exponential backoff delays",
        "Measure the busiest window for no, full and equal jitter",
        "Explain the trade between full and equal jitter",
        "Report what default_retry_on does with at least five exception types",
        "Identify the two surprising cases and explain each",
        "Implement a breaker and measure calls saved against a dead dependency",
        "Exercise half-open in both directions and print the transitions",
        "Classify retries as safe, unsafe or pointless"],
      hint: "Ask default_retry_on directly rather than inferring from the docs. TimeoutError is the surprising one.",
      solution: { lang: "python", title: "x1402.py \u2014 300 doomed calls became 5",
        code: 'from langgraph.types import default_retry_on\nfor e in (ValueError("x"), TimeoutError("x"), ConnectionError("x"),\n          AttributeError("x"), KeyError("x")):\n    print(type(e).__name__, default_retry_on(e))\n\n# the breaker: closed -> open -> half-open -> closed/open\nb = Breaker(threshold=5, cool=10.0)\nfor _ in range(100):\n    for _ in range(3):\n        try:\n            b.call(dead)\n        except Exception:\n            pass\nprint(b.calls_made, b.calls_skipped)        # 5, 295',
        out: "==============================================================================\nPART 1 -- why backoff needs jitter -- the synchronised retry\n==============================================================================\n  exponential backoff, base 0.5s:\n    attempt 1 -> wait  0.50s\n    attempt 2 -> wait  1.00s\n    attempt 3 -> wait  2.00s\n    attempt 4 -> wait  4.00s\n    attempt 5 -> wait  8.00s\n\n  the problem is that this is DETERMINISTIC. every client that failed\n  at the same moment retries at the same moment.\n\n  60 clients retrying, measured in 50ms windows:\n    strategy       busiest window   delay range\n    no jitter      60 of 60         0.50s - 0.50s\n    full jitter     9 of 60         0.02s - 0.49s\n    equal jitter   14 of 60         0.25s - 0.50s\n\n  no jitter puts all 60 in ONE window -- which is the same spike that\n  caused the failure, arriving again half a second later.\n\n  full jitter spreads them across the whole interval, so the peak is\n  about a tenth of that. equal jitter spreads them across the SECOND\n  HALF of the interval, so its peak is twice full jitter's -- the\n  trade is a guaranteed minimum wait for a less even spread, which\n  matters when each retry is expensive and you want none of them\n  arriving immediately.\n\n==============================================================================\nPART 2 -- what LangGraph's RetryPolicy retries -- and what it does not\n==============================================================================\n  default_retry_on, asked directly:\n    ValueError         -> False\n    TimeoutError       -> False\n    ConnectionError    -> True\n    AttributeError     -> True\n    KeyError           -> False\n    RuntimeError       -> False\n\n  it is a DENY list, not an allow list -- so an AttributeError from a\n  typo is retried three times, and a TimeoutError is NOT, because it\n  subclasses OSError which is excluded. that is the opposite of what\n  most people assume from the names.\n\n==============================================================================\nPART 3 -- the circuit breaker, implemented and measured\n==============================================================================\n  no breaker   : 300 calls to a dependency that is down\n  with breaker : 5 attempted, 295 skipped\n  transitions  : [('closed', 'open')]\n\n  so the breaker turned 300 doomed calls into 5. and the 5 it made\n  were the ones that discovered the problem -- everything after was\n  refused locally, in microseconds, with no network round trip.\n\n==============================================================================\nPART 4 -- the half-open state is the part people omit\n==============================================================================\n  after 2 failures          : state=open\n  one probe while still down: state=open (re-opened on ONE failure)\n  dependency recovers, one probe succeeds:\n    result='ok' state=closed\n  transitions: [('closed', 'open'), ('open', 'half-open'), ('half-open', 'open'), ('open', 'half-open'), ('half-open', 'closed')]\n\n  half-open sends ONE request, not a wave. and a single failure in\n  half-open re-opens immediately -- it does not spend the threshold\n  again. without that, recovery means 100 waiting clients all hitting\n  a dependency that has just come back up, which knocks it over again.\n\n==============================================================================\nPART 5 -- what should NOT be retried\n==============================================================================\n  a retry is only correct when the operation is idempotent or has had\n  no effect yet. the measured cases:\n\n    SAFE      a read. a model call that failed before generating.\n              a tool lookup.\n    UNSAFE    anything that already had an effect -- which is 14.3,\n              and the measurement there is that LangGraph's node retry\n              re-runs the WHOLE node, so a node that acts and then\n              fails acts twice.\n    POINTLESS a 400-class error. a schema validation failure. a\n              malformed prompt. retrying a deterministic failure three\n              times costs three times as much and fails three times.\n\n  and the deny-list finding above means the default policy retries\n  several POINTLESS cases -- an AttributeError, a KeyError -- so the\n  retry_on predicate is worth writing explicitly rather than taking.",
        notes: [
          { t: "p", text: "**Backoff without jitter is deterministic**, so 60 clients that failed together all landed in one 50 ms window \u2014 the original spike, repeated." },
          { t: "p", text: "**Full jitter cut the peak to 9 of 60**; equal jitter to 14, trading spread for a guaranteed minimum wait." },
          { t: "p", text: "**LangGraph's default predicate is a deny list**, which inverts two expectations." },
          { t: "p", text: "**TimeoutError is NOT retried**, because it subclasses OSError \u2014 the most retryable failure there is, declined by default." },
          { t: "p", text: "**AttributeError IS retried**, three times, so a typo costs three attempts before failing identically." },
          { t: "p", text: "**The breaker turned 300 doomed calls into 5**, and those 5 were the ones that discovered the problem." },
          { t: "p", text: "**Everything after was refused locally in microseconds**, with no network round trip." },
          { t: "p", text: "**Half-open sends ONE request, not a wave**, and one failure re-opens immediately rather than spending the threshold again." },
          { t: "p", text: "**So a breaker without half-open is a timer**, and recovery without it oscillates." },
          { t: "p", text: "**Write retry_on as an explicit allow list** of the transport failures your dependencies produce \u2014 usually three or four types." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the retry storm that was the outage", body: [
      { t: "p", text: "A dependency degrades for ten seconds. The agent retries three times with exponential backoff. The dependency then stays down for four minutes, and the graphs show a clean sawtooth of load spikes at 0.5, 1 and 2 seconds after each wave." },
      { t: "p", text: "The backoff has no jitter, so every client that failed in the same moment retries in the same moment. The ten-second blip generated a synchronised wave that re-created the overload, which generated another wave \u2014 measured, 60 clients with no jitter all land in a single 50 millisecond window, where full jitter puts at most 9 there." },
      { t: "p", text: "Two changes fix it. Jitter on the backoff, so the wave becomes a spread. And a circuit breaker, so after the fifth failure the calls stop being attempted at all \u2014 in the measured case that turned 300 doomed calls into 5, with the remaining 295 refused locally in microseconds. The breaker also has to have a half-open state that sends exactly one probe, because otherwise recovery is itself a synchronised wave against a dependency that has just come back." }
    ] }
  ],
  takeaways: [
    "**Backoff without jitter is deterministic**, so clients that failed together retry together.",
    "**60 clients with no jitter landed in one 50 ms window** \u2014 the original spike, repeated.",
    "**Full jitter cut the peak to 9 of 60**; equal jitter to 14.",
    "**Equal jitter trades an even spread for a guaranteed minimum wait**, which matters when retries are expensive.",
    "**LangGraph's default retry predicate is a deny list**, not an allow list.",
    "**TimeoutError is NOT retried** \u2014 it subclasses OSError, which is excluded.",
    "**AttributeError IS retried**, three times, so a typo costs three attempts.",
    "**So write retry_on explicitly** as an allow list of real transport failures.",
    "**A breaker turned 300 doomed calls into 5**, and those 5 discovered the problem.",
    "**The rest were refused locally in microseconds**, with no round trip.",
    "**Half-open sends ONE probe, not a wave.**",
    "**And one failure in half-open re-opens immediately**, without spending the threshold again.",
    "**So a breaker without half-open is a timer**, and recovery oscillates.",
    "**Three categories**: safe (reads), unsafe (anything with an effect \u2014 14.3), pointless (deterministic failures)."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does exponential backoff need jitter?",
      options: ["To avoid hitting provider rate limits on the first attempt",
        "Because it is deterministic, so clients that failed together retry together \u2014 60 clients landed in one 50 ms window",
        "Because providers penalise regular retry intervals",
        "To make retry timing reproducible in tests"],
      answer: 1,
      why: "The retry wave is the original spike arriving again. Measured, no jitter puts all 60 clients in a single 50 millisecond window where full jitter puts at most 9, so an outage that caused the failures gets re-created by the recovery attempt \u2014 and again at every subsequent backoff interval." },
    { stem: "What does LangGraph's default retry predicate do with a TimeoutError?",
      options: ["Retries it, since timeouts are transient",
        "Does not retry it, because TimeoutError subclasses OSError, which is on the deny list",
        "Retries it only if a max_interval is set",
        "Raises a TypeError, since it is not an Exception subclass"],
      answer: 1,
      why: "The default is a deny list: recognised deterministic errors return False and everything else returns True. Because TimeoutError inherits from OSError, the most retryable failure there is gets declined, while an AttributeError from a typo is retried three times. That inversion is the reason to write the predicate explicitly." },
    { stem: "What does the half-open state contribute to a circuit breaker?",
      options: ["It halves the retry interval during recovery",
        "It sends exactly one probe rather than a wave, and a single failure re-opens immediately",
        "It allows reads through while blocking writes",
        "It keeps the breaker closed for idempotent operations"],
      answer: 1,
      why: "Without it, the cooldown expiring releases every waiting client at once against a dependency that has just come back, which knocks it over again and makes the outage oscillate. The two load-bearing properties are that the probe is singular and that a failed probe is immediately disqualifying rather than spending the failure threshold again." },
    { stem: "Which retry is 'pointless' rather than merely unsafe?",
      options: ["Re-sending a payment request",
        "Retrying a schema validation failure, which is deterministic and will fail identically three times",
        "Retrying a read after a connection reset",
        "Retrying a model call that failed before generating"],
      answer: 1,
      why: "A deterministic failure produces the same result every attempt, so retrying costs three times as much, adds the backoff latency, and fails the same way. Unsafe is different \u2014 that is an operation with an effect, where the retry succeeds and does the thing twice. The default deny-list predicate permits several pointless cases." }
  ] },
  interview: { title: "Interview practice", sub: "Retries and breakers", questions: [
    { level: "core", q: "How would you configure retries for an agent's tool calls?",
      strong: "A strong answer writes the predicate rather than taking the default.",
      answer: [
        { t: "p", text: "With an explicit allow list of exception types and jittered backoff \u2014 and the explicit part matters because the default surprised me." },
        { t: "p", text: "I read LangGraph's default predicate and it is a deny list: it names deterministic errors and retries everything else. The consequence is that a TimeoutError is not retried, because it subclasses OSError, while an AttributeError from a typo is retried three times. That is backwards for both cases." },
        { t: "p", text: "So I would write retry_on as the three or four transport failures my dependencies actually produce \u2014 connection errors, 5xx responses, explicit timeouts. It ends up shorter than the deny list it replaces." },
        { t: "p", text: "Jitter is the other half. Backoff alone is deterministic, so every client that failed in the same moment retries in the same moment \u2014 I measured 60 clients landing in a single 50 millisecond window with no jitter, against 9 with full jitter. The retry wave is the original spike." },
        { t: "p", text: "And I would not retry anything with an effect without an idempotency key, because the node is the unit of retry \u2014 LangGraph re-runs the whole node, so a node that acts and then fails acts again." }
      ] },
    { level: "advanced", q: "When is a circuit breaker worth adding?",
      strong: "A strong answer quantifies the saving and insists on half-open.",
      answer: [
        { t: "p", text: "As soon as a dependency can be down rather than merely slow, because the saving is large and easy to measure." },
        { t: "p", text: "I ran 100 requests at three attempts each against a dead dependency. Without a breaker that is 300 calls, every one of them doomed, each paying a connection timeout. With a breaker it was 5 attempted and 295 skipped \u2014 and the 5 were the ones that discovered the problem." },
        { t: "p", text: "The 295 matter for a reason beyond the dependency: they were refused locally in microseconds, so the requests failed fast instead of occupying a worker for a timeout each. A breaker protects the caller as much as the callee." },
        { t: "p", text: "What I would insist on is a proper half-open state. It sends exactly one probe when the cooldown expires, and a single failure re-opens immediately rather than spending the failure threshold again. Without that, recovery releases every waiting client at once against something that has just come back up, and the outage oscillates." },
        { t: "p", text: "In an agent specifically I would put the breaker around the model call too, not just the tools \u2014 that is 80% of the turn and the part I do not control, so it is the most likely thing to be down and the most expensive thing to be waiting on." }
      ] },
    { level: "core", q: "Where would you put the retry logic \u2014 in the node, in the graph, or in the client?",
      strong: "A strong answer places it by what the retry's unit is.",
      answer: [
        { t: "p", text: "It depends on what the unit of work is, and I would usually want it at more than one level \u2014 but with different jobs." },
        { t: "p", text: "At the node level, via a retry policy, for transient failures of a step. That is the natural place and it has one property worth knowing: LangGraph re-runs the whole node, so anything before the failing line runs again. Which means node-level retries are only safe when the node has no effects or has an idempotency key outside graph state." },
        { t: "p", text: "Inside the node, around the specific call, when the node does several things and only one of them is flaky. That is more code and it gives you a much smaller retry scope \u2014 which is sometimes the right answer precisely because the whole-node re-run is unacceptable." },
        { t: "p", text: "At the client level only for the whole request, and really that is a resume rather than a retry: if the run was checkpointed, re-invoking with None continues from the failed step instead of repeating the completed ones." },
        { t: "p", text: "What I would not do is layer them without thinking about the multiplication. Three attempts at the node inside three at the client is nine, with the backoff compounding \u2014 and if the predicate is the default deny list, several of those attempts are on deterministic failures that will never succeed." }
      ] }
  ] }
});
