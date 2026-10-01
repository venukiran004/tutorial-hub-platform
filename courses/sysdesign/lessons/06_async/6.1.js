/* ============================================================================
   LESSON 6.1 — Message Queues: Decoupling and Buffering
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "A queue sits between the code that produces work and the code that does it, and buys three things: a spike becomes a **backlog instead of a wave of errors**, the producer keeps working when the consumer is down, and slow work leaves the request path entirely (2.5). What it costs is time and visibility — work now finishes *later*, somewhere else — so a queue must come with the number that says whether it is keeping up: **consumer lag**. And it needs somewhere for messages that will never succeed, or one bad message can stop everything behind it.",

  objectives: [
    "Explain what a queue buys over a synchronous call: buffering, decoupling and asynchrony",
    "Simulate a spike with and without a queue and compute the backlog and the drain time",
    "Use consumer lag and message age as the health metrics of a queue",
    "Handle poison messages with retries and a dead-letter queue",
    "Size and autoscale a consumer fleet against a processing-time target"
  ],

  prerequisites: ["2.5"],

  blocks: [

    { t: "h2", n: "01", id: "what", text: "What a queue buys",
      sub: "Absorb, decouple, defer" },

    { t: "diagram", kind: "flow", title: "Producers, a queue, consumers — and the dead-letter queue",
      caption: "Producers enqueue and return at once. Consumers pull at their own pace, acknowledge each message only when it is done, and the queue redelivers anything not acknowledged. A message that keeps failing goes to a dead-letter queue (DLQ) for a human, instead of blocking the rest.",
      cols: 4,
      nodes: [
        { id: "api", label: "API servers", sub: "enqueue and return 202", tone: "accent" },
        { id: "q", label: "Queue", sub: "durable, ordered-ish", tone: "warn" },
        { id: "c", label: "Consumer pool", sub: "N workers, pull + ack", tone: "good" },
        { id: "db", label: "Email, PDFs, payments", sub: "the slow work", tone: "violet" },
        { id: "m", label: "Lag / age metrics", sub: "drive alerts and scaling", tone: "teal" },
        { id: "dlq", label: "Dead-letter queue", sub: "after N failed attempts", tone: "crit" }
      ],
      edges: [["api", "q", "publish"], ["q", "c", "deliver"], ["c", "db", "do the work"], ["q", "m", "", "dashed"], ["c", "dlq", "gives up", "dashed"]] },

    { t: "dl", items: [
      ["Buffering", "Arrivals above the consumers' capacity accumulate as a backlog instead of being rejected. The work still has to be done, but it is done at a rate the consumers can sustain."],
      ["Decoupling", "Producer and consumer no longer need to be up at the same time, scale together, or know about each other. A consumer outage becomes a delay, not an error on the producer's side."],
      ["Asynchrony", "Work that the user does not need to wait for — a receipt email, a thumbnail, an analytics event — leaves the request, which is the availability argument of 2.5's exercise."]
    ] },

    { t: "h2", n: "02", id: "spike", text: "A spike, absorbed",
      sub: "Errors become waiting" },

    { t: "p", text: "Six consumers handle 600 messages a second. Normal traffic is 400 a second; for one minute it jumps to 1,500:" },

    { t: "code", lang: "python", title: "spike.py — the same spike, synchronous and queued", code: `CONSUMERS, PER_CONSUMER = 6, 100            # each consumer handles 100 messages/s
CAPACITY = CONSUMERS * PER_CONSUMER         # 600/s
def arrivals(t):                            # messages arriving in second t
    return 1_500 if 60 <= t < 120 else 400  # a one-minute spike to 2.5x capacity

depth, series, rejected_sync, max_age = 0, [], 0, 0
for t in range(0, 601):
    a = arrivals(t)
    rejected_sync += max(0, a - CAPACITY)   # without a queue: excess requests fail or time out
    depth = max(0, depth + a - CAPACITY)
    max_age = max(max_age, depth / CAPACITY)  # FIFO: the newest message waits behind the backlog
    series.append(depth)

peak = max(series); drained = next(t for t in range(120, 601) if series[t] == 0)
print("capacity %d/s; spike of 1,500/s from t=60 to t=120" % CAPACITY)
print("synchronous: %s requests rejected or timed out during the spike" % "{:,}".format(rejected_sync))
print("with a queue: 0 rejected; peak backlog %s messages at t=120" % "{:,}".format(peak))
print("              backlog drained at t=%d s; worst wait %.0f s" % (drained, max_age))
for t in (0, 60, 90, 120, 180, 240, 300, 360, 390):
    print("   t=%3d s  depth %7s  %s" % (t, "{:,}".format(series[t]), "#" * (series[t] // 2_000)))`,
      out: `capacity 600/s; spike of 1,500/s from t=60 to t=120
synchronous: 54,000 requests rejected or timed out during the spike
with a queue: 0 rejected; peak backlog 54,000 messages at t=120
              backlog drained at t=389 s; worst wait 90 s
   t=  0 s  depth       0  
   t= 60 s  depth     900  
   t= 90 s  depth  27,900  #############
   t=120 s  depth  53,800  ##########################
   t=180 s  depth  41,800  ####################
   t=240 s  depth  29,800  ##############
   t=300 s  depth  17,800  ########
   t=360 s  depth   5,800  ##
   t=390 s  depth       0  `,
      caption: "Synchronously, every request above capacity fails during that minute — 54,000 of them. With a queue, none fails, but the backlog peaks at 54,000 messages and takes **four and a half minutes** after the spike to drain, because the consumers' only spare capacity is the 200 a second by which normal traffic falls short of 600. Drain time = backlog ÷ (capacity − arrival rate): a queue whose consumers are barely above average load never really drains." },

    { t: "viz", title: "The backlog over time",
      caption: "During the one-minute spike the backlog climbs at 900 a second for that minute and then falls at only 200 a second. The asymmetry is the lesson: queues fill fast and drain slowly unless consumers have real headroom.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">0k</text>
<line x1="64" y1="180.0" x2="610" y2="180.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="184.0" text-anchor="end" class="s-sub">15k</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">30k</text>
<line x1="64" y1="72.0" x2="610" y2="72.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="76.0" text-anchor="end" class="s-sub">45k</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">60k</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub">0</text>
<text x="103.0" y="252" text-anchor="middle" class="s-sub">30</text>
<text x="142.0" y="252" text-anchor="middle" class="s-sub">60</text>
<text x="181.0" y="252" text-anchor="middle" class="s-sub">90</text>
<text x="220.0" y="252" text-anchor="middle" class="s-sub">120</text>
<text x="259.0" y="252" text-anchor="middle" class="s-sub">150</text>
<text x="298.0" y="252" text-anchor="middle" class="s-sub">180</text>
<text x="337.0" y="252" text-anchor="middle" class="s-sub">210</text>
<text x="376.0" y="252" text-anchor="middle" class="s-sub">240</text>
<text x="415.0" y="252" text-anchor="middle" class="s-sub">270</text>
<text x="454.0" y="252" text-anchor="middle" class="s-sub">300</text>
<text x="493.0" y="252" text-anchor="middle" class="s-sub">330</text>
<text x="532.0" y="252" text-anchor="middle" class="s-sub">360</text>
<text x="571.0" y="252" text-anchor="middle" class="s-sub">390</text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub">420</text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">seconds — the spike runs from 60 to 120</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">backlog (thousands)</text>
<polyline points="64.0,234.0 103.0,234.0 142.0,230.8 181.0,133.6 220.0,40.3 259.0,61.9 298.0,83.5 337.0,105.1 376.0,126.7 415.0,148.3 454.0,169.9 493.0,191.5 532.0,213.1 571.0,234.0 610.0,234.0" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="103.0" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="142.0" cy="230.8" r="3.6" style="fill:var(--warn)"/>
<circle cx="181.0" cy="133.6" r="3.6" style="fill:var(--warn)"/>
<circle cx="220.0" cy="40.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="259.0" cy="61.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="298.0" cy="83.5" r="3.6" style="fill:var(--warn)"/>
<circle cx="337.0" cy="105.1" r="3.6" style="fill:var(--warn)"/>
<circle cx="376.0" cy="126.7" r="3.6" style="fill:var(--warn)"/>
<circle cx="415.0" cy="148.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="454.0" cy="169.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="493.0" cy="191.5" r="3.6" style="fill:var(--warn)"/>
<circle cx="532.0" cy="213.1" r="3.6" style="fill:var(--warn)"/>
<circle cx="571.0" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="610.0" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">messages waiting</text>
</svg>` },

    { t: "callout", kind: "insight", title: "Watch lag and age, not depth",
      body: [
        { t: "p", text: "Queue depth alone is ambiguous: 50,000 messages is nothing for a fleet that processes 10,000 a second and a crisis for one that processes 50. The two metrics that mean something are **consumer lag** — how far behind the newest message the consumers are — and **age of the oldest message**, which is the delay a user actually experiences. Alert on age crossing the processing-time target, and scale consumers on lag (the exercise)." }
      ] },

    { t: "h2", n: "03", id: "delivery", text: "Acknowledgement, redelivery and poison",
      sub: "What happens when a consumer fails mid-message" },

    { t: "p", text: "A consumer receives a message, which becomes invisible to other consumers for a **visibility timeout**. If the consumer acknowledges it, it is deleted; if the consumer crashes or the timeout expires, it is delivered again. That is what makes queues reliable — and it means every message may be processed **more than once**, which 6.3 makes safe. It also means a message that *always* fails is redelivered forever:" },

    { t: "code", lang: "python", title: "dlq.py — a poison message in a strictly ordered queue", code: `from collections import deque

def run(use_dlq, max_attempts=3):
    q = deque([{"id": i, "attempts": 0, "poison": i == 2} for i in range(1, 9)])
    done, dlq, ticks = [], [], 0
    while q and ticks < 50:
        ticks += 1
        m = q[0]                                    # strict FIFO: always the head first
        if m["poison"]:                             # e.g. a malformed payload: fails every time
            m["attempts"] += 1
            if use_dlq and m["attempts"] >= max_attempts:
                dlq.append(q.popleft()["id"])       # park it; alert a human; keep going
            continue                                # otherwise: retried, at the head, forever
        done.append(q.popleft()["id"])
    return done, dlq, ticks

for use in (False, True):
    done, dlq, ticks = run(use)
    print("%-16s processed %-24s dead-lettered %-6s after %d attempts" %
          ("with a DLQ" if use else "without a DLQ", done, dlq, ticks))`,
      out: `without a DLQ    processed [1]                      dead-lettered []     after 50 attempts
with a DLQ       processed [1, 3, 4, 5, 6, 7, 8]    dead-lettered [2]    after 10 attempts`,
      caption: "Without a dead-letter queue, message 2 — a malformed payload that fails every time — sits at the head of the queue and is retried forever; the seven healthy messages behind it are never processed. With a DLQ after three attempts, it is set aside and everything else flows. Alert on DLQ depth: every message there is a bug or bad data that someone must look at." },

    { t: "diagram", kind: "matrix", title: "Common queue technologies",
      caption: "Kafka is a log rather than a queue (6.2): messages are kept after consumption and many consumer groups can read them independently. For a simple work queue, SQS or RabbitMQ is less to operate.",
      cols: ["Model", "Ordering", "After consuming", "Typical use"],
      rows: ["Amazon SQS", "RabbitMQ", "Kafka", "Redis Streams"],
      cells: [
        [{ text: "managed queue" }, { text: "best effort / FIFO", tone: "warn" }, { text: "deleted", tone: "accent" }, { text: "work queues" }],
        [{ text: "broker, routing" }, { text: "per queue", tone: "good" }, { text: "deleted", tone: "accent" }, { text: "routing, priorities" }],
        [{ text: "partitioned log" }, { text: "per partition", tone: "good" }, { text: "retained", tone: "violet" }, { text: "streams, replay" }],
        [{ text: "log in Redis" }, { text: "per stream", tone: "good" }, { text: "retained (capped)", tone: "violet" }, { text: "lightweight streams" }]
      ] },

    { t: "callout", kind: "trap", title: "A queue as a place to hide an overload",
      body: [
        { t: "p", text: "A queue turns \"the consumers cannot keep up\" from an error into a number that grows quietly. If average arrivals exceed consumer capacity, no amount of buffering helps: the backlog grows without bound, the oldest message gets older every minute, and eventually messages expire, the queue hits its size limit, or the backlog is so stale that processing it is pointless — an order confirmation an hour late." },
        { t: "p", text: "A queue is a **shock absorber for bursts**, not a substitute for capacity. Size consumers for the sustained peak with headroom, bound the queue, alert on message age, and decide in advance what happens when the bound is hit — reject at the producer (backpressure, 7.4) or shed the least important work." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Size a consumer fleet for a two-minute target",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Notification jobs arrive at an average of about 350 a second, with a daily swell, a lunchtime burst, and a six-fold spike at 19:00 when the marketing push goes out. Each consumer handles 50 a second. Every job must be processed within two minutes of arriving." }
      ],
      requirements: [
        "Simulate a day minute by minute with a backlog carried between minutes",
        "Find the smallest fixed fleet that meets the two-minute target",
        "Add lag-based autoscaling with a realistic three-minute scaling delay and measure it",
        "Improve on it for the known 19:00 spike",
        "Report worst wait and consumer-hours per day for each"
      ],
      hint: "Autoscaling reacts to what it has already seen. Which part of the day can be predicted rather than reacted to?",
      solution: { lang: "python", title: "consumers_ex.py",
        code: `import math

PER_CONSUMER = 50                     # messages per second one consumer can handle
SLA_S = 120                           # every message processed within two minutes of arrival

def rate(minute):                     # arrivals per second, by minute of the day
    h = minute / 60
    base = 300 + 200 * math.sin((h - 9) / 24 * 2 * math.pi)          # daily swell
    if 12 <= h < 13: base *= 2.5                                       # lunchtime burst
    if 19 <= h < 19.25: base *= 6                                      # the 19:00 push notification
    return base

def simulate(consumers_for):
    backlog, worst, consumer_minutes = 0.0, 0.0, 0
    for m in range(24 * 60):
        n = consumers_for(m, backlog); consumer_minutes += n
        cap = n * PER_CONSUMER
        backlog = max(0.0, backlog + (rate(m) - cap) * 60)
        worst = max(worst, backlog / cap)
    return worst, consumer_minutes / 60

print("peak arrival rate: %.0f/s at 19:00; average %.0f/s" % (max(map(rate, range(1440))),
      sum(map(rate, range(1440))) / 1440))
fixed = next(n for n in range(1, 200) if simulate(lambda m, b, n=n: n)[0] <= SLA_S)
w, h = simulate(lambda m, b: fixed)
print("fixed fleet  : %3d consumers, worst wait %4.0f s, %5.0f consumer-hours/day" % (fixed, w, h))

def autoscale(m, backlog, floor=4, delay=3):
    """Scale on what the metrics showed \`delay\` minutes ago, plus enough to clear the lag."""
    seen = rate(max(0, m - delay))
    return max(floor, math.ceil((seen + backlog / SLA_S) / PER_CONSUMER))
w, h = simulate(autoscale)
print("autoscale lag: worst wait %4.0f s, %5.0f consumer-hours/day (3-minute scaling delay)" % (w, h))
w, h = simulate(lambda m, b: autoscale(m, b, floor=12))
print("  + floor 12 : worst wait %4.0f s, %5.0f consumer-hours/day" % (w, h))

def scheduled(m, backlog):             # the 19:00 push is known in advance: pre-scale for it
    boost = 48 if 18 * 60 + 55 <= m < 19 * 60 + 20 else 0
    return max(boost, autoscale(m, backlog))
w, h = simulate(scheduled)
print("  + pre-scale for 19:00: worst wait %4.0f s, %5.0f consumer-hours/day" % (w, h))`,
        out: `peak arrival rate: 2400/s at 19:00; average 349/s
fixed fleet  :  42 consumers, worst wait  115 s,  1008 consumer-hours/day
autoscale lag: worst wait  260 s,   188 consumer-hours/day (3-minute scaling delay)
  + floor 12 : worst wait  180 s,   311 consumer-hours/day
  + pre-scale for 19:00: worst wait   87 s,   192 consumer-hours/day`,
        notes: [
          { t: "p", text: "A fixed fleet must be sized for the 19:00 spike, so it idles the rest of the day: over a thousand consumer-hours to handle an average a tenth of the peak. Lag-based autoscaling cuts that by more than four-fifths — and **misses the target**, because a six-fold spike arrives faster than a three-minute scaling loop can respond; a higher floor narrows the miss at a large cost." },
          { t: "p", text: "The spike is not a surprise: marketing schedules it. **Pre-scaling for known events** and autoscaling on lag for everything else meets the target at roughly the autoscaling cost. Reactive scaling handles what you cannot predict; scheduled scaling handles what you can, and most large spikes — sales, pushes, sporting events, batch jobs — are on someone's calendar (11.4)." },
          { t: "p", text: "Scaling on lag rather than CPU is deliberate. CPU says consumers are busy; lag says they are behind. A consumer pool can be at 100% CPU and keeping up, or at 40% CPU and falling behind because it waits on a slow downstream — and only lag tells you which." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the receipt emails that arrived the next morning",
      body: [
        { t: "p", text: "**Symptom.** After a Black Friday evening, customers complained that order confirmations arrived eight to fourteen hours late, and support was flooded with \"did my order go through?\" contacts. Orders themselves were fine. The email queue's dashboard had shown depth climbing all evening, but nobody was alerted." },
        { t: "p", text: "**Mechanism.** The email consumers were a fixed fleet of four, sized for a normal peak. Order volume ran at three times their capacity for six hours, so the backlog grew all evening and took the whole night to drain. The only alert was on consumer errors, and there were none — the consumers were healthy, just outnumbered. Depth was graphed; age was not." },
        { t: "p", text: "**Fix.** An alert on the oldest message's age crossing five minutes; consumers autoscaled on lag with a higher ceiling; transactional emails (receipts) moved to their own queue and consumers, separate from bulk marketing email, so a newsletter can never delay a receipt; and the sale calendar now drives pre-scaling. The queue had done its job — nothing was lost — and still produced an incident, because nobody had decided how late was too late." }
      ] }
  ],

  takeaways: [
    "A queue buys **buffering** (a spike becomes a backlog), **decoupling** (independent availability and scaling) and **asynchrony** (slow work leaves the request).",
    "Measured: a one-minute spike to 2.5× capacity caused **54,000 failures synchronously** and **zero with a queue** — at the cost of a backlog that took four and a half minutes to drain.",
    "**Drain time = backlog ÷ (capacity − arrival rate)**: consumers barely above average load never drain.",
    "Monitor **consumer lag** and **age of the oldest message**, not depth alone; alert on age crossing the processing-time target.",
    "Consumers **acknowledge after finishing**; unacknowledged messages are redelivered, so processing is **at least once** (6.3).",
    "A **poison message** with no DLQ blocked every message behind it; a **dead-letter queue** after N attempts let the rest flow.",
    "A queue absorbs **bursts**, not sustained overload: bound it and decide what happens at the bound (7.4).",
    "Size consumers on **lag**, and **pre-scale for known events** — measured, lag-only autoscaling missed a scheduled 6× spike that pre-scaling met at a fifth of the fixed fleet's cost.",
    "Separate queues for work with different urgency, so bulk work never delays critical work."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Consumers process 600 messages/s; arrivals are 400/s after a spike left 54,000 messages queued. How long until the backlog clears?",
        options: ["90 seconds", "About 4.5 minutes", "54 seconds", "It never clears"],
        answer: 1,
        why: "Only the spare capacity drains the backlog: 600 − 400 = 200 messages a second, and 54,000 ÷ 200 = 270 seconds. 90 s would be the backlog divided by full capacity, ignoring that new messages keep arriving; 54 s has no basis; and it does clear because capacity exceeds arrivals." },

      { stem: "Which metric best tells you a queue's consumers are failing to keep up with what users need?",
        options: ["Consumer CPU usage", "Number of consumers", "Age of the oldest unprocessed message", "Total messages ever processed"],
        answer: 2,
        why: "The oldest message's age is the delay users actually experience, and compared against the processing target it says directly whether the queue is too far behind. CPU can be high while keeping up or low while waiting on a slow dependency; consumer count and lifetime totals say nothing about delay." },

      { stem: "A malformed message fails every time it is processed. In a strictly ordered queue without a dead-letter queue, what happens?",
        options: ["It is skipped automatically", "It is redelivered forever and blocks the messages behind it", "It is deleted after the visibility timeout", "The queue reorders around it"],
        answer: 1,
        why: "An unacknowledged message is redelivered, and in strict order nothing behind it is processed until it succeeds — which it never will; the simulation processed one healthy message in fifty attempts. Visibility timeouts cause redelivery, not deletion, and an ordered queue by definition does not reorder." },

      { stem: "Average arrival rate permanently exceeds consumer capacity. What does adding a larger queue achieve?",
        options: ["It solves the problem", "It postpones the failure: the backlog and message age grow without bound", "It reduces arrivals", "It speeds up consumers"],
        answer: 1,
        why: "A queue only smooths bursts around an average the consumers can handle; when the average exceeds capacity, the backlog grows forever and messages get older until they expire or are useless. Only more capacity, less work, or backpressure to producers addresses it." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Every queue in a design should come with its reason and its lag alert.",
    questions: [
      { level: "core",
        q: "When would you put a message queue in a design?",
        strong: "A strong answer gives the three reasons and the costs, with an example of each.",
        answer: [
          { t: "p", text: "For three reasons. To take slow or unreliable work out of the request — sending email, generating a PDF — so the user gets a fast response and that dependency no longer affects availability. To absorb bursts, so a spike becomes a backlog processed at a sustainable rate instead of errors. And to decouple producer and consumer so they can be deployed, scaled and fail independently." },
          { t: "p", text: "The costs are that work completes later and elsewhere, processing is at-least-once so consumers must be idempotent, and failures become asynchronous. So I would add a dead-letter queue, alert on oldest-message age against a target, and scale consumers on lag." }
        ] },

      { level: "core",
        q: "How do you handle a message that keeps failing?",
        strong: "A strong answer distinguishes transient from permanent failure and describes retries with backoff and a DLQ.",
        answer: [
          { t: "p", text: "Retry transient failures with exponential backoff — by delaying redelivery or re-enqueueing with a delay — because a downstream timeout may succeed in a minute. After a fixed number of attempts, treat it as permanent and move it to a dead-letter queue, so it stops consuming capacity and stops blocking ordered messages behind it." },
          { t: "p", text: "The DLQ is monitored and alerting: each message there is a bug or bad data. Once fixed, the messages are replayed from the DLQ — which is only safe if the consumer is idempotent." }
        ] },

      { level: "advanced",
        q: "How would you autoscale consumers?",
        strong: "A strong answer scales on lag, acknowledges reaction delay, and adds scheduled capacity for known spikes.",
        answer: [
          { t: "p", text: "On lag, not CPU: lag says whether consumers are behind, while CPU only says they are busy — a pool waiting on a slow database can be idle and falling behind. The target is enough consumers to clear the backlog within the processing-time goal: arrival rate plus backlog divided by the goal, divided by per-consumer throughput, with a floor and a ceiling." },
          { t: "p", text: "Reactive scaling has a delay of minutes, so a sudden multi-fold spike will breach the target before capacity arrives. For predictable spikes — scheduled pushes, sales, batch jobs — I would pre-scale on a schedule, and keep reactive scaling for the rest. I would also check that the downstream the consumers call can take the extra load, or scaling consumers just moves the bottleneck." }
        ] }
    ]
  }
});
