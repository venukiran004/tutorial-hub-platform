/* ============================================================================
   LESSON 6.5 — Stream Processing and Event-Driven Architecture
   ========================================================================= */
EC.receiveLesson({
  id: "6.5",

  lede: "Once events flow through a log, you can compute over them continuously: counts per minute, fraud rules over the last sixty seconds, sessions, joins between streams. Stream processing has one idea that batch processing never needed: **every event has two times** — when it happened and when it arrived — and they disagree, sometimes by minutes. Windows defined on arrival time are simple and wrong whenever the pipeline stalls; windows on **event time** are right, at the cost of deciding how long to wait for latecomers. Above the mechanics sits a design style — **event-driven architecture** — whose decoupling is real and whose debugging costs are too.",

  objectives: [
    "Distinguish event time from processing time and show what each window gets wrong",
    "Explain tumbling, sliding and session windows and when each fits",
    "Use watermarks and allowed lateness to trade completeness against delay",
    "Implement an event-time sliding-window rule that survives out-of-order arrival",
    "Weigh event-driven architecture's decoupling against its costs in tracing and consistency"
  ],

  prerequisites: ["6.2", "6.3"],

  blocks: [

    { t: "h2", n: "01", id: "two-times", text: "Two clocks on every event",
      sub: "When it happened, and when you heard about it" },

    { t: "diagram", kind: "timeline", title: "Five events: when they happened, and when they arrived",
      caption: "A phone that was offline delivers e2 two minutes late; a stalled consumer delivers e3 and e4 together. Counting by arrival puts all three in the wrong minute. Counting by event time puts them where they belong — if the window is still open when they arrive.",
      span: 6, tick: 1, unit: "minutes",
      lanes: [
        { label: "happened", bars: [[0.3, 0.5, "e1", "accent"], [0.8, 1.0, "e2", "accent"], [2.1, 2.3, "e3", "accent"], [2.6, 2.8, "e4", "accent"], [4.2, 4.4, "e5", "accent"]] },
        { label: "arrived", bars: [[0.4, 0.6, "e1", "warn"], [2.9, 3.1, "e2", "crit"], [3.45, 3.65, "e3", "crit"], [3.7, 3.9, "e4", "crit"], [4.3, 4.5, "e5", "warn"]] }
      ] },

    { t: "p", text: "Ten minutes of app events at about 3,000 a minute. Three per cent come from phones that were offline and arrive up to two minutes late; and the consumer was down for ninety seconds in the middle and then caught up. Counted per minute by processing time and by event time:" },

    { t: "code", lang: "python", title: "windows.py — per-minute counts by processing time and by event time", code: `import random
from collections import Counter

rng = random.Random(10)
events = []                                                     # (event time, processing time)
for i in range(30_000):                                         # 10 minutes of app events
    t_event = rng.uniform(0, 600)
    delay = rng.expovariate(1 / 0.5) if rng.random() > 0.03 else rng.uniform(20, 120)  # offline phones
    t_proc = t_event + delay
    if 240 <= t_proc < 330:                                     # the consumer was down for 90 s...
        t_proc = 330 + (t_proc - 240) / 6                       # ...then caught up in 15 s
    events.append((t_event, t_proc))
events.sort(key=lambda e: e[1])                                 # the stream delivers in processing order

truth = Counter(int(te // 60) for te, _ in events)
by_proc = Counter(int(tp // 60) for _, tp in events)

def event_time(allowed_lateness):
    """One-minute tumbling windows on event time. A window is final once the watermark
    (max event time seen - allowed lateness) passes its end; anything later is dropped."""
    counts, closed, max_seen, dropped = Counter(), set(), 0.0, 0
    for te, _ in events:
        max_seen = max(max_seen, te)
        w = int(te // 60)
        if w in closed: dropped += 1; continue
        counts[w] += 1
        closed.update(range(int((max_seen - allowed_lateness) // 60)))
    return counts, dropped

et, _ = event_time(60)
print("minute       true   by processing time   by event time (60 s lateness)")
for m in range(10):
    print("  %d       %6d %12d %+6d %14d %+6d" % (m, truth[m], by_proc[m], by_proc[m] - truth[m], et[m], et[m] - truth[m]))
print("\\nallowed lateness vs late events dropped (of %d)" % len(events))
for lateness in (0, 30, 60, 120):
    print("  %4d s   %5d dropped" % (lateness, event_time(lateness)[1]))`,
      out: `minute       true   by processing time   by event time (60 s lateness)
  0         2939         2844    -95           2910    -29
  1         3055         3006    -49           3026    -29
  2         3076         3073     -3           3046    -30
  3         3011         3017     +6           2911   -100
  4         2970            0  -2970           2947    -23
  5         3026         6010  +2984           2998    -28
  6         2970         2956    -14           2939    -31
  7         2952         2956     +4           2918    -34
  8         2992         2990     -2           2992     +0
  9         3009         3022    +13           3009     +0

allowed lateness vs late events dropped (of 30000)
     0 s    3785 dropped
    30 s    3451 dropped
    60 s     304 dropped
   120 s      30 dropped`,
      hl: [10, 11, 23, 25, 27],
      caption: "By processing time, **minute 4 shows zero events and minute 5 shows double** — the outage moved three thousand events into the minute the consumer caught up. A dashboard would show a crash and a spike that never happened. By event time, every minute is within about one per cent, the residue being events later than the window was willing to wait for. The lateness table shows that choice: wait too briefly and the outage's backlog arrives after its windows closed." },

    { t: "h2", n: "02", id: "windows", text: "Windows and watermarks",
      sub: "Grouping an endless stream, and deciding when a group is done" },

    { t: "diagram", kind: "compare", title: "Three kinds of window",
      caption: "Most streaming engines — Flink, Kafka Streams, Spark Structured Streaming, Beam — offer all three on event time, with watermarks to decide when each window's result is final.",
      columns: [
        { title: "Tumbling", tone: "accent", items: [
          "fixed size, no overlap: 12:00–12:01, 12:01–12:02",
          "each event in exactly one window",
          "per-minute counts, hourly billing"
        ] },
        { title: "Sliding (hopping)", tone: "violet", items: [
          "fixed size, overlapping: the last 60 s, every 5 s",
          "each event in several windows",
          "\"5 transactions in any 60 s\" rules"
        ] },
        { title: "Session", tone: "good", items: [
          "per key, closes after a gap of inactivity",
          "variable length",
          "user sessions, a device's burst of activity"
        ] }
      ] },

    { t: "dl", items: [
      ["Watermark", "The stream's estimate of how far event time has progressed — \"we do not expect events older than T any more\". Typically the maximum event time seen minus an allowed lateness."],
      ["Allowed lateness", "How long a window stays open after its end. Longer means more complete results and later answers; shorter means faster, more approximate answers and more dropped events."],
      ["Late events", "Events behind the watermark. Drop them, send them to a side output for a correction job, or update an already-emitted result — the choice depends on whether the consumer of the result can accept a revision."]
    ] },

    { t: "callout", kind: "trap", title: "Processing-time windows on a pipeline that can stall",
      body: [
        { t: "p", text: "Windowing on arrival time needs no watermarks and gives answers immediately, which is why it is so often the first implementation. It is correct only as long as the pipeline never falls behind — and every pipeline falls behind: a deploy, a rebalance (6.2), a slow downstream. Each stall turns into a false dip followed by a false spike, and alerting built on those counts pages people for incidents that did not happen while hiding the one that did." },
        { t: "p", text: "Use event time for anything that will be compared, alerted on or billed, and size allowed lateness from measured delay — including the pipeline's own worst catch-up — not from what feels reasonable." }
      ] },

    { t: "h2", n: "03", id: "eda", text: "Event-driven architecture",
      sub: "Services that react to facts instead of calling each other" },

    { t: "diagram", kind: "flow", title: "One event, many independent reactions",
      caption: "The order service publishes a fact and is done; it does not know who listens. New behaviour — a fraud model, a loyalty programme — is added by subscribing, with no change to the publisher. That is the decoupling. The cost is that the end-to-end flow now exists nowhere in code.",
      cols: 3,
      nodes: [
        { id: "o", label: "Order service", sub: "publishes OrderPlaced", tone: "accent" },
        { id: "t", label: "orders topic", sub: "the log (6.2)", tone: "warn" },
        { id: "p", label: "Payments", sub: "charges, emits PaymentTaken", tone: "good" },
        { id: "w", label: "Warehouse", sub: "reserves, then ships", tone: "good" },
        { id: "a", label: "Analytics", sub: "streams into the warehouse", tone: "violet" },
        { id: "f", label: "Fraud model", sub: "added later, no publisher change", tone: "teal" }
      ],
      edges: [["o", "t", "publish"], ["t", "p"], ["t", "w"], ["t", "a"], ["t", "f", "", "dashed"]] },

    { t: "table",
      head: ["Gains", "Costs"],
      rows: [
        ["Publishers and consumers deploy and fail independently", "No single place shows the whole flow; \"where is order 901?\" needs tracing"],
        ["New consumers attach without changing the publisher", "Eventual consistency between services is the default (5.3)"],
        ["Spikes are absorbed by the log (6.1)", "Event schemas become contracts that must be versioned like APIs"],
        ["Replay rebuilds any consumer's state (6.2)", "Duplicates and reordering must be handled everywhere (6.3)"]
      ],
      caption: "Distributed tracing with the trace id carried in event headers (11.5), a schema registry, and per-flow dashboards are what make event-driven systems operable rather than mysterious." },

    { t: "exercise", kind: "Challenge", title: "A fraud rule on event time",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "Flag any card used five or more times in any sixty-second span. Stolen cards are used in quick bursts, and their card terminals retry, so 40% of their transactions arrive up to 45 seconds late and out of order. Normal cards make a handful of purchases an hour." }
      ],
      requirements: [
        "Implement the rule with one-minute tumbling windows on arrival time",
        "Implement it with a sliding sixty-second window on event time, ignoring events behind a watermark of 60 s",
        "Report stolen cards caught and false alarms for each",
        "Explain each missed card in the first approach: what split its burst?"
      ],
      hint: "For the event-time version, keep each card's recent event times sorted and use two pointers to find the largest group within sixty seconds.",
      solution: { lang: "python", title: "fraud_window_ex.py",
        code: `import random
from collections import defaultdict, deque

rng = random.Random(12)
events = []                                            # (card, event time, arrival time)
for card in range(1, 301):                             # normal cards: a few purchases an hour
    for _ in range(rng.randint(1, 6)):
        t = rng.uniform(0, 3600); events.append((card, t, t + rng.expovariate(2)))
FRAUD = set(range(1001, 1021))
for card in FRAUD:                                     # stolen cards: 6 purchases inside 50 s
    start = rng.uniform(100, 3400)
    for _ in range(6):
        t = start + rng.uniform(0, 50)
        late = rng.uniform(0, 45) if rng.random() < 0.4 else rng.expovariate(2)  # card terminals retrying
        events.append((card, t, t + late))
events.sort(key=lambda e: e[2])                        # delivered in arrival order

def processing_time_tumbling():
    counts = defaultdict(int)
    for card, _, arr in events: counts[(card, int(arr // 60))] += 1
    return {card for (card, _), n in counts.items() if n >= 5}

def event_time_sliding(lateness=60, window=60):
    """Per card, keep event times; alert when any 60 s span of EVENT time holds >= 5.
    Events older than the watermark are ignored (they can no longer change the answer)."""
    seen, flagged, max_t = defaultdict(list), set(), 0.0
    for card, t, _ in events:
        max_t = max(max_t, t)
        if t < max_t - lateness - window: continue     # too late to matter
        times = sorted(seen[card] + [t]); seen[card] = times
        lo = 0
        for hi in range(len(times)):                   # two-pointer: largest group within 60 s
            while times[hi] - times[lo] > window: lo += 1
            if hi - lo + 1 >= 5: flagged.add(card); break
    return flagged

for name, f in (("processing-time, tumbling", processing_time_tumbling), ("event-time, sliding", event_time_sliding)):
    flagged = f()
    print("%-28s caught %2d of %d stolen cards, %d false alarms" %
          (name, len(flagged & FRAUD), len(FRAUD), len(flagged - FRAUD)))`,
        out: `processing-time, tumbling    caught 10 of 20 stolen cards, 0 false alarms
event-time, sliding          caught 20 of 20 stolen cards, 0 false alarms`,
        notes: [
          { t: "p", text: "Arrival-time tumbling windows missed half the stolen cards, for two reasons that compound. A tumbling boundary can cut a fifty-second burst into three and three; and late retries push some of the burst's transactions into the next minute by arrival. Neither has anything to do with fraud — they are artefacts of which clock and which window shape was used." },
          { t: "p", text: "The event-time sliding window caught all twenty with no false alarms, because it asks the question the rule actually states — any sixty seconds of real time — and because a watermark generous enough for the retries keeps each card's burst together however it arrives." },
          { t: "p", text: "Two production refinements: keep per-card state bounded by evicting times behind the watermark (a streaming engine's keyed state with a TTL), and decide what to do with events later than the watermark — here they are ignored, but for fraud a late-arriving fifth transaction may still deserve a delayed alert through a side output." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the outage the dashboard invented",
      body: [
        { t: "p", text: "**Symptom.** At 02:14 the on-call engineer was paged: checkout volume had dropped to zero for one minute, then spiked to double. Two engineers spent forty minutes looking for a checkout outage. There had been none — customers had checked out normally throughout." },
        { t: "p", text: "**Mechanism.** The metrics pipeline counted checkout events in one-minute windows by processing time. A rolling restart of the stream processor paused consumption for about seventy seconds, then the backlog was processed in a burst: section 01's zero-then-double, exactly. The alert rule \"checkouts below 20% of normal for one minute\" was correct; the numbers feeding it were not." },
        { t: "p", text: "**Fix.** The checkout metrics moved to event-time windows with a two-minute allowed lateness and an alert that evaluates windows only once the watermark has passed them. A separate, simpler alert on **consumer lag** (6.1) now catches genuine pipeline stalls — so a stall pages the people who own the pipeline, not the people who own checkout." }
      ] }
  ],

  takeaways: [
    "Every event has an **event time** (when it happened) and a **processing time** (when it arrived); they differ by seconds to minutes.",
    "Measured: a 90-second consumer stall made processing-time counts show **zero in one minute and double in the next**; event-time counts stayed within about 1%.",
    "**Tumbling** windows partition time; **sliding** windows overlap; **session** windows close after a gap of inactivity.",
    "A **watermark** estimates how far event time has progressed; **allowed lateness** trades completeness for delay. Too short dropped thousands of events after the stall.",
    "Decide what late events do: **drop, side-output, or revise** an emitted result.",
    "Measured: a five-in-sixty-seconds fraud rule caught **half the stolen cards on arrival-time tumbling windows and all of them on event-time sliding windows**.",
    "Use event time for anything **alerted on, compared or billed**.",
    "**Event-driven architecture** decouples publishers from consumers and makes new consumers free — and moves the flow out of any single codebase.",
    "Make it operable with **trace ids in event headers**, a **schema registry**, idempotent consumers and **lag alerts** owned by the pipeline team."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A stream processor counts events per minute by processing time. It pauses for 90 seconds and then catches up. What does the dashboard show?",
        options: ["Accurate counts", "A drop to near zero, then a spike, though real traffic was steady", "Only a short delay in the numbers", "Duplicated counts for every minute"],
        answer: 1,
        why: "Processing-time windows assign events to the minute they arrived, so the stalled minute receives almost nothing and the catch-up minute receives its own events plus the backlog — the measured 0 and double. Event-time windows would put each event in the minute it happened. Nothing is duplicated; events are just attributed to the wrong window." },

      { stem: "What does a watermark with an allowed lateness of 60 seconds mean?",
        options: ["Events older than 60 seconds are deleted from the log", "A window is considered complete once the stream has seen event times 60 seconds past its end; events for it arriving after that are late", "Every event is delayed by 60 seconds", "Windows are 60 seconds long"],
        answer: 1,
        why: "The watermark is the maximum event time seen minus the allowed lateness; when it passes a window's end, that window is finalised, and stragglers for it are late. The log is untouched, events are not artificially delayed, and window length is a separate setting." },

      { stem: "Which window best expresses \"five transactions on one card within any sixty seconds\"?",
        options: ["A one-minute tumbling window on processing time", "A sixty-second sliding window on event time, per card", "A session window with a one-hour gap", "A global count since the card was issued"],
        answer: 1,
        why: "\"Any sixty seconds\" is a sliding span, and it refers to when the transactions happened, so a per-card sliding window on event time matches the rule — it caught all twenty stolen cards. Tumbling boundaries split bursts and processing time mis-orders them; a one-hour session or a lifetime count answers different questions." },

      { stem: "What is the main operational cost of event-driven architecture?",
        options: ["Higher CPU usage per request", "The end-to-end flow is spread across services, so tracing, schema contracts and lag monitoring become essential", "It requires synchronous calls", "It prevents adding new consumers"],
        answer: 1,
        why: "Publishers do not know their consumers and no code contains the whole flow, so answering where a given order is stuck needs trace ids carried through events, versioned schemas and per-consumer lag alerts. CPU is not the issue, the style is asynchronous by design, and adding consumers is its main benefit." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Say \"event time\" before the interviewer has to.",
    questions: [
      { level: "advanced",
        q: "How would you compute real-time metrics — say, orders per minute — from an event stream?",
        strong: "A strong answer chooses event time, explains watermarks and lateness, and covers late events and pipeline stalls.",
        answer: [
          { t: "p", text: "With a stream processor — Flink, Kafka Streams — consuming the orders topic and counting in one-minute tumbling windows on event time, the timestamp carried in each event, not the time it arrives. Arrival-time windows produce false dips and spikes whenever the pipeline stalls or catches up." },
          { t: "p", text: "Event time needs a watermark to decide when a minute is complete: maximum event time seen minus an allowed lateness sized from measured delays, including the pipeline's own catch-up. Late events go to a side output that corrects the stored result, and alerts fire only on finalised windows. A separate consumer-lag alert distinguishes a stalled pipeline from a real business drop." }
        ] },

      { level: "core",
        q: "What is event-driven architecture and when would you use it?",
        strong: "A strong answer defines it, gives the benefit precisely, and is honest about the costs.",
        answer: [
          { t: "p", text: "Services communicate by publishing facts — OrderPlaced, PaymentTaken — to a log, and other services react to them, rather than calling each other directly. The publisher does not know its consumers, so new behaviour is added by subscribing, services deploy and fail independently, and the log absorbs spikes and allows replay." },
          { t: "p", text: "I use it where several independent parts of the business react to the same facts and eventual consistency between them is acceptable. The costs are that the flow is no longer visible in one place, so I need tracing through event headers, versioned schemas and per-consumer lag monitoring, and every consumer must handle duplicates and reordering. For a request that needs an immediate answer from another service, a synchronous call is still simpler." }
        ] },

      { level: "advanced",
        q: "How do you handle events that arrive after their window has closed?",
        strong: "A strong answer lists the options and ties the choice to the consumer of the result.",
        answer: [
          { t: "p", text: "Three options. Drop them, if the result is approximate anyway — real-time dashboards. Send them to a side output that a correction job applies to the stored results, which suits metrics that are later reconciled. Or emit an updated result for the window, if downstream consumers accept revisions — an upsert into a table keyed by window rather than an append." },
          { t: "p", text: "The allowed lateness decides how many fall into this path; I size it from the measured delay distribution and the pipeline's worst catch-up, and I track the late-event rate as a metric, because a sudden rise usually means an upstream device or pipeline is delaying data." }
        ] }
    ]
  }
});
