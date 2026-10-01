/* ============================================================================
   LESSON 1.6 — Keeping a Connection Open: Polling, SSE, WebSockets, Webhooks
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "HTTP lets only the client speak first, so \"tell me when something changes\" needs a workaround. There are four, and they trade the same two things: **requests that carry nothing** against **connections that must be held open**. Polling wastes requests; WebSockets and server-sent events hold a connection per user, which turns a stateless server into a stateful one. Webhooks are the server-to-server version, and they bring their own two problems: **proving who sent the call, and surviving the same call twice.**",

  objectives: [
    "Compare short polling, long polling, server-sent events and WebSockets on requests, delay and held connections",
    "Choose a push mechanism from the direction of traffic and the client environment",
    "Explain why holding connections makes a server stateful, and design the fan-out across servers",
    "Verify a webhook's signature and timestamp, and say what each check defeats",
    "Build a webhook receiver that is safe under at-least-once, out-of-order delivery"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", id: "four", text: "Four ways to hear about a change",
      sub: "Asking repeatedly, asking and waiting, or keeping a line open" },

    { t: "diagram", kind: "timeline", title: "Sixty seconds of each mechanism, with two events at 17 s and 44 s",
      caption: "Short polling asks every 10 seconds and is told nothing most of the time (green: a poll that found an event). Long polling asks once and the server holds the request until an event or a timeout. SSE and WebSockets open one connection and keep it; events flow the moment they happen.",
      span: 60, tick: 10, unit: "seconds",
      lanes: [
        { label: "Short poll", bars: [[0, 1, "", "warn"], [10, 11, "", "warn"], [20, 21, "", "good"], [30, 31, "", "warn"], [40, 41, "", "warn"], [50, 51, "", "good"]] },
        { label: "Long poll", bars: [[0, 17, "held… event", "accent"], [17, 44, "held… event", "accent"], [44, 60, "held…", "accent"]] },
        { label: "SSE", bars: [[0, 60, "one connection, server → client", "violet"]] },
        { label: "WebSocket", bars: [[0, 60, "one connection, both directions", "good"]] }
      ] },

    { t: "p", text: "Short polling saw the event at 17 s only at its 20 s poll, and the one at 44 s at 50 s: delay is half the interval on average. The other three deliver at once. What they cost instead becomes clear at a million users:" },

    { t: "code", lang: "python", title: "push_cost.py — a million connected users, two events each per hour", code: `USERS = 1_000_000            # connected clients
UPDATES_PER_HOUR = 2         # real events per user per hour (a chat or order-status app)
RTT_S = 0.08                 # client <-> server round trip
KB_PER_CONN = 30             # memory a server holds per open connection (buffers + state)

events_per_s = USERS * UPDATES_PER_HOUR / 3600

rows = []
for interval in (5, 30):                       # short polling every N seconds
    req_s = USERS / interval
    rows.append((f"short poll every {interval}s", req_s, 1 - events_per_s / req_s, interval / 2, 0))
lp_timeout = 30                                # long polling: held until an event or 30 s
lp_req_s = USERS / lp_timeout + events_per_s
rows.append(("long polling (30 s hold)", lp_req_s, 1 - events_per_s / lp_req_s, RTT_S, USERS))
rows.append(("SSE / WebSocket", 0, 0, RTT_S / 2, USERS))

print("%-24s %12s %10s %12s %14s" % ("mechanism", "requests/s", "empty", "avg delay", "held conns"))
for name, req_s, empty, delay, held in rows:
    print("%-24s %12s %9.1f%% %10.2f s %14s" % (name, "{:,.0f}".format(req_s), 100 * empty, delay,
          "{:,}".format(held) if held else "-"))
print()
print("events that actually happen: %.0f per second" % events_per_s)
print("memory to hold %s connections at %d KB: %.0f GB across the fleet"
      % ("{:,}".format(USERS), KB_PER_CONN, USERS * KB_PER_CONN / 1e6))`,
      out: `mechanism                  requests/s      empty    avg delay     held conns
short poll every 5s           200,000      99.7%       2.50 s              -
short poll every 30s           33,333      98.3%      15.00 s              -
long polling (30 s hold)       33,889      98.4%       0.08 s      1,000,000
SSE / WebSocket                     0       0.0%       0.04 s      1,000,000

events that actually happen: 556 per second
memory to hold 1,000,000 connections at 30 KB: 30 GB across the fleet`,
      caption: "Short polling every five seconds sends **200,000 requests a second to deliver 556 events**: 99.7% of the work is asking \"anything new?\" and hearing no. Holding connections removes the requests but replaces them with a million open sockets and about 30 GB of memory across the fleet — a different cost, paid in state rather than throughput." },

    { t: "diagram", kind: "matrix", title: "Choosing among them",
      caption: "SSE is the most underused of the four: one-way push is what most \"live\" features need, and it is plain HTTP, so proxies, compression and browser reconnection work without extra code.",
      cols: ["Direction", "Over plain HTTP", "Auto-reconnect", "Best for"],
      rows: ["Short polling", "Long polling", "Server-sent events", "WebSockets", "Webhooks"],
      cells: [
        [{ text: "client asks" }, { text: "yes", tone: "good" }, { text: "n/a" }, { text: "rarely changing data", tone: "warn" }],
        [{ text: "client asks, server waits" }, { text: "yes", tone: "good" }, { text: "by hand" }, { text: "last-resort fallback" }],
        [{ text: "server → client" }, { text: "yes", tone: "good" }, { text: "built in", tone: "good" }, { text: "feeds, LLM tokens", tone: "violet" }],
        [{ text: "both ways" }, { text: "upgrade, then not", tone: "warn" }, { text: "by hand" }, { text: "chat, games, editors", tone: "good" }],
        [{ text: "server → server" }, { text: "yes", tone: "good" }, { text: "sender retries" }, { text: "payments, integrations", tone: "accent" }]
      ] },

    { t: "callout", kind: "insight", title: "The token stream from an LLM is server-sent events",
      body: [
        { t: "p", text: "When a chat assistant's answer appears word by word, the browser is almost always reading SSE: one HTTP response with `Content-Type: text/event-stream` that the server keeps writing `data:` lines to. It is the right tool because the traffic is one-way, the client already made a request, and SSE passes through every proxy and CDN that understands HTTP. Reaching for WebSockets there buys a second direction nobody uses and loses the plain-HTTP tooling." }
      ] },

    { t: "h2", n: "02", id: "stateful", text: "Held connections make the server stateful",
      sub: "And the fan-out that follows" },

    { t: "p", text: "Module 2 depends on any server being able to answer any request (1.1). A WebSocket breaks that: the connection to a particular user lives on one particular server, and a message for that user must reach **that** server. With twenty servers, the sender's server usually does not hold the recipient's connection." },

    { t: "diagram", kind: "flow", title: "Delivering a message to a user connected to a different server",
      caption: "The connection servers keep only sockets. A pub-sub backplane — Redis, NATS or Kafka (6.2) — carries each message to whichever server holds the recipient, and a presence store records who is where.",
      cols: 4,
      nodes: [
        { id: "a", label: "Alice's phone", sub: "connected to WS-1", tone: "accent" },
        { id: "w1", label: "WS server 1", sub: "holds Alice's socket" },
        { id: "ps", label: "Pub-sub backplane", sub: "channel user:bob", tone: "violet" },
        { id: "w2", label: "WS server 7", sub: "holds Bob's socket" },
        { id: "db", label: "Message store", sub: "durable copy first", tone: "warn" },
        { id: "pr", label: "Presence", sub: "bob → WS-7, online", tone: "teal" },
        { id: "push", label: "Mobile push", sub: "if Bob is offline", tone: "crit" },
        { id: "b", label: "Bob's phone", sub: "receives instantly", tone: "good" }
      ],
      edges: [["a", "w1", "send"], ["w1", "ps", "publish"], ["ps", "w2", "deliver"], ["w1", "db", "persist"], ["w2", "b", "push frame"], ["ps", "pr", "who is where?", "dashed"], ["pr", "push", "offline", "dashed"]] },

    { t: "callout", kind: "trap", title: "The deploy that reconnects a million clients at once",
      body: [
        { t: "p", text: "Stateless servers can be restarted one at a time with no one noticing. A WebSocket server cannot: restarting it drops every connection it holds, and every one of those clients reconnects **immediately** — and, if they all use the same retry delay, at the same instant. A rolling deploy across twenty servers becomes twenty synchronised storms of 50,000 reconnects, each one re-authenticating and re-subscribing." },
        { t: "p", text: "Two things are mandatory. Clients reconnect with **exponential backoff and random jitter** (7.1), so the storm spreads over seconds instead of arriving in one. And the server **drains** before stopping — it stops accepting new connections and closes existing ones gradually, ideally telling clients to reconnect elsewhere — so a deploy is a trickle rather than a wave." }
      ] },

    { t: "h2", n: "03", id: "webhooks", text: "Webhooks: push between servers",
      sub: "Your URL, called by someone else's system" },

    { t: "p", text: "A webhook is a URL you give a provider — a payment processor, a Git host, a shipping carrier — which it calls with a POST when something happens. It replaces polling the provider's API. It also makes your endpoint a door on the public internet that anyone can knock on, so it has to answer two questions before doing anything: **did this really come from the provider, and is it fresh?**" },

    { t: "code", lang: "python", title: "webhook_sig.py — signing and verification, and what each check defeats", code: `import hashlib, hmac, json, time

SECRET = b"whsec_9b1c0e"          # shared once, out of band, per subscriber

def sign(body: bytes, ts: int) -> str:
    """Provider side: sign the timestamp and the exact bytes sent."""
    mac = hmac.new(SECRET, f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={ts},v1={mac}"

def verify(body: bytes, header: str, now: int, tolerance_s: int = 300) -> str:
    """Receiver side: recompute, compare in constant time, reject stale timestamps."""
    parts = dict(p.split("=", 1) for p in header.split(","))
    ts = int(parts["t"])
    if abs(now - ts) > tolerance_s:
        return "REJECT: timestamp outside tolerance (replay?)"
    expected = hmac.new(SECRET, f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    return "ok" if hmac.compare_digest(expected, parts["v1"]) else "REJECT: bad signature"

now = 1_790_000_000
body = json.dumps({"id": "evt_77", "type": "payment.succeeded", "amount": 4999}).encode()
header = sign(body, now)

print("genuine           ", verify(body, header, now + 2))
print("amount edited     ", verify(body.replace(b"4999", b"9"), header, now + 2))
print("replayed next day ", verify(body, header, now + 86_400))
print("re-serialised JSON", verify(json.dumps(json.loads(body), indent=1).encode(), header, now + 2))`,
      out: `genuine            ok
amount edited      REJECT: bad signature
replayed next day  REJECT: timestamp outside tolerance (replay?)
re-serialised JSON REJECT: bad signature`,
      hl: [7, 14, 16, 17],
      caption: "The HMAC proves the body came from someone holding the shared secret and was not changed — editing the amount fails. The signed timestamp defeats replay — a captured genuine request is useless a day later. The last line is the one that catches real integrations: **verify the raw bytes you received**, not JSON you parsed and re-serialised, because whitespace and key order change the signature." },

    { t: "diagram", kind: "steps", title: "A webhook handler, in the only safe order",
      caption: "Everything slow or fallible happens after the 200, on a worker reading the queue. A handler that does the work first will be slow, time out, be retried, and do the work twice.",
      items: [
        { label: "Verify signature and timestamp on the raw body", desc: "reject with 400 before parsing anything", code: "HMAC + ±5 min", tone: "crit" },
        { label: "De-duplicate on the event id", desc: "a unique index; a repeat is acknowledged and dropped", code: "evt_77 seen?", tone: "warn" },
        { label: "Enqueue the event durably", desc: "a queue or an outbox row in the same transaction (6.4)", code: "queue.put", tone: "accent" },
        { label: "Return 2xx immediately", desc: "within the provider's timeout — typically a few seconds", code: "200 OK", tone: "good" },
        { label: "Process on a worker, tolerating order", desc: "events can arrive out of order: compare versions, never assume sequence", code: "seq > last?", tone: "violet" }
      ] },

    { t: "exercise", kind: "Challenge", title: "A webhook receiver that survives retries and reordering",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A provider delivers `order.updated` events at least once: if it does not see your 200, it retries the same event later, and retries arrive in any order relative to newer events. Simulate a provider that loses 30% of your acknowledgements and shuffles delivery, and build a receiver whose final state per order is correct." }
      ],
      requirements: [
        "The HTTP handler verifies the signature, de-duplicates by event id, enqueues and returns — nothing else",
        "A duplicate delivery is acknowledged with 200 so the provider stops retrying",
        "The worker applies events so that an older event never overwrites a newer one",
        "Print deliveries made, events enqueued, and the final state per order",
        "Show that enqueued equals events sent, however many deliveries there were"
      ],
      hint: "Each event carries a sequence number. The worker keeps the highest sequence it has applied per order and ignores anything lower.",
      solution: { lang: "python", title: "webhook_rx.py",
        code: `import hashlib, hmac, json, random
from collections import deque

SECRET = b"whsec_9b1c0e"
def sign(body, ts): return f"t={ts},v1=" + hmac.new(SECRET, f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
def valid(body, header, now):
    p = dict(x.split("=", 1) for x in header.split(","))
    exp = hmac.new(SECRET, f"{p['t']}.".encode() + body, hashlib.sha256).hexdigest()
    return abs(now - int(p["t"])) <= 300 and hmac.compare_digest(exp, p["v1"])

seen: set[str] = set()      # in production: a table with a unique index on event_id
queue: deque = deque()      # in production: a durable queue (6.1)

def receive(body: bytes, header: str, now: int) -> int:
    """The whole HTTP handler: verify, de-duplicate, enqueue, answer. No business logic."""
    if not valid(body, header, now):
        return 400
    event = json.loads(body)
    if event["id"] in seen:
        return 200          # already have it: acknowledge so the provider stops retrying
    seen.add(event["id"])
    queue.append(event)
    return 200

# The provider: at-least-once delivery. 30% of our 200s are lost on the way back,
# so the provider retries the same event; events can also arrive out of order.
rng = random.Random(3)
events = [{"id": f"evt_{i}", "type": "order.updated", "order": 900 + i % 4, "seq": i} for i in range(1, 9)]
deliveries = acks = 0
pending = events[:]
now = 1_790_000_000
while pending:
    rng.shuffle(pending)
    still = []
    for ev in pending:
        body = json.dumps(ev).encode()
        deliveries += 1
        status = receive(body, sign(body, now), now)
        if status == 200 and rng.random() > 0.30:
            acks += 1          # the provider saw our 200
        else:
            still.append(ev)   # lost or failed: provider will retry
    pending = still
    now += 60

processed = {}
while queue:                   # the worker: apply in sequence order per order, latest wins
    ev = queue.popleft()
    if ev["seq"] > processed.get(ev["order"], (0, None))[0]:
        processed[ev["order"]] = (ev["seq"], ev["id"])

print("events sent by provider :", len(events))
print("HTTP deliveries         :", deliveries)
print("enqueued for processing :", len(seen))
print("final state per order   :", {k: v[1] for k, v in sorted(processed.items())})`,
        out: `events sent by provider : 8
HTTP deliveries         : 15
enqueued for processing : 8
final state per order   : {900: 'evt_8', 901: 'evt_5', 902: 'evt_6', 903: 'evt_7'}`,
        notes: [
          { t: "p", text: "Fifteen deliveries became eight enqueued events — exactly the number sent — because the handler's de-duplication made every repeat a no-op. Returning **200 for a duplicate** matters as much as dropping it: a 409 or 500 tells the provider the delivery failed, and it will keep retrying an event you already have, for days." },
          { t: "p", text: "The handler contains no business logic, deliberately. Every millisecond of work inside it lengthens the window in which the provider times out and retries, and any exception inside it becomes a failed delivery. Verify, de-duplicate, enqueue, answer — and let a worker that can retry on its own terms do the rest." },
          { t: "p", text: "Ordering is solved by **versions, not arrival order**. The worker keeps the highest sequence applied per order and ignores anything older, so a retried `evt_4` arriving after `evt_8` cannot roll order 900 back. If a provider gives no sequence, use its event timestamp, or re-fetch the object's current state from the provider's API on every event — slower, but immune to ordering entirely." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: every customer charged twice, by a webhook that worked",
      body: [
        { t: "p", text: "**Symptom.** A marketplace began receiving complaints of duplicate payout emails, then of duplicate payouts — sellers paid twice for one sale. The payment provider's dashboard showed each `payment.succeeded` webhook delivered two or three times, all with 200 responses eventually." },
        { t: "p", text: "**Mechanism.** The webhook handler did all the work inline: it recorded the payment, calculated fees, triggered the payout and sent the email, then returned 200. During a busy period the payout service slowed to eight seconds; the provider's timeout was five. The provider saw no response, retried, and the handler — which had no de-duplication — ran the whole flow again. The first attempt had not failed; it had only been slow." },
        { t: "p", text: "**Fix.** The five-step order in section 03: verify, insert the event id under a unique constraint, enqueue, return 200 within milliseconds. The payout worker took its own idempotency key from the event id (6.3), so even a duplicate that slipped past could not pay twice. The finance team reversed the duplicates; the alert that would have caught it — **webhook deliveries per event id greater than one** — was added the same week." }
      ] }
  ],

  takeaways: [
    "HTTP lets only the client speak first. The four workarounds trade **empty requests** against **held connections**.",
    "Measured at a million users: short polling every 5 s makes **200,000 requests a second to deliver 556 events** — 99.7% wasted.",
    "**Long polling** holds each request until an event or timeout; **SSE** is one-way push over plain HTTP; **WebSockets** are two-way after an upgrade.",
    "Most \"live\" features — feeds, progress bars, **LLM token streams** — are one-way, and SSE is the simplest correct tool for them.",
    "**A held connection makes a server stateful**: a message must reach the server holding the recipient's socket, through a pub-sub backplane and a presence store.",
    "Restarting a connection server drops every socket at once: clients need **backoff with jitter** and servers need **draining**, or deploys become reconnect storms.",
    "Webhooks are server-to-server push. **Verify an HMAC over the raw bytes and a signed timestamp** — the first defeats forgery and tampering, the second replay.",
    "Webhook handler order: **verify → de-duplicate on event id → enqueue → 200** → process on a worker. Business logic inside the handler gets retried.",
    "Acknowledge a **duplicate with 200**, or the provider keeps retrying an event you already have.",
    "Handle reordering with **versions, not arrival order**: apply an event only if it is newer than what you have."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A dashboard shows a build's progress, updated by the server every few seconds. The browser never sends anything back. Which mechanism fits best?",
        options: ["Short polling every second", "WebSockets", "Server-sent events", "A webhook to the browser"],
        answer: 2,
        why: "The traffic is one-way, server to client, which is exactly what SSE provides — over plain HTTP, with reconnection built into the browser. WebSockets would work but add a second direction nobody uses and lose proxy and HTTP tooling. Polling every second wastes requests and still delays updates by half a second on average. Webhooks are calls to a server's URL, and a browser does not have one." },

      { stem: "Why does adding WebSockets to a chat feature complicate horizontal scaling?",
        options: ["WebSockets cannot be load-balanced", "Each user's connection lives on one server, so messages must be routed to the server holding the recipient", "WebSockets require a separate database", "WebSocket messages are larger than HTTP requests"],
        answer: 1,
        why: "Statelessness let any server answer any request; a held socket ties a user to one server, so a message sent via server 1 must reach server 7 where the recipient is connected — hence a pub-sub backplane and a presence store. WebSockets can be load-balanced at connection time; the problem is routing messages afterwards. They need no special database, and their frames are typically smaller than HTTP requests." },

      { stem: "A webhook handler verifies the signature against the request body after parsing it and re-serialising it as JSON. Genuine requests sometimes fail verification. Why?",
        options: ["The secret has expired", "Re-serialising changes whitespace or key order, so the bytes differ from what was signed", "HMAC is non-deterministic", "The timestamp tolerance is too short"],
        answer: 1,
        why: "The provider signed the exact bytes it sent; parsing and re-serialising can reorder keys or change spacing, producing different bytes and a different HMAC — the script shows a re-serialised body rejected. HMAC is deterministic for the same key and bytes. An expired secret would fail every request, not some, and a tolerance problem would reject on the timestamp check with a different error." },

      { stem: "A provider retries a webhook event you already processed. What should your handler return?",
        options: ["409 Conflict, because it is a duplicate", "500, so the provider knows something is wrong", "200, and do nothing further", "Nothing — drop the connection"],
        answer: 2,
        why: "The provider retries until it sees a 2xx, so the only response that stops the retries is a success — and since you already have the event, success is true. A 409 or 500 tells the provider delivery failed, which causes more retries of an event you already hold. Dropping the connection looks like a timeout and triggers a retry as well." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Real-time questions are really questions about state and delivery guarantees.",
    questions: [
      { level: "core",
        q: "How would you push order-status updates to a web and mobile app?",
        strong: "A strong answer picks by direction, includes the offline case, and names the fan-out mechanism.",
        answer: [
          { t: "p", text: "The traffic is one-way, so for the web app I would use server-sent events — plain HTTP, reconnection built in, works through proxies. For mobile, an open connection only exists while the app is in the foreground, so I would pair the in-app connection with platform push notifications for when it is backgrounded." },
          { t: "p", text: "The order service publishes a status event to a pub-sub channel per user; whichever connection server holds that user's stream forwards it. Since a client can miss events while reconnecting, each event carries a sequence number, and on reconnect the client asks for anything after the last one it saw — so the stream is a view onto durable state, not the state itself." }
        ] },

      { level: "advanced",
        q: "Design the connection layer for a chat system with ten million concurrent users.",
        strong: "A strong answer treats connections as state, separates holding sockets from logic, and plans for deploys.",
        answer: [
          { t: "p", text: "A dedicated tier of connection servers that do nothing but hold WebSockets — at around a hundred thousand connections each, about a hundred servers — behind an L4 balancer. They are thin: authenticate on connect, register the user in a presence store keyed by user id, subscribe to that user's channel on a pub-sub backplane, and forward frames." },
          { t: "p", text: "Message flow: persist first in the message store, then publish to the recipient's channel; the server holding them delivers. If presence says offline, a push notification instead. And deploys get explicit design: servers drain gradually, clients reconnect with exponential backoff and jitter, and reconnect resumes from the last message id — because otherwise every rolling deploy is a reconnect storm against the auth service." }
        ] },

      { level: "core",
        q: "What does a production-grade webhook receiver look like?",
        strong: "A strong answer gives the order of operations and explains each step by the failure it prevents.",
        answer: [
          { t: "p", text: "Verify the HMAC over the raw request bytes and check a signed timestamp within a few minutes — that stops forgery, tampering and replay. Insert the event id under a unique constraint, so a retried delivery is detected; acknowledge duplicates with 200 so the provider stops. Enqueue durably and return 200 straight away." },
          { t: "p", text: "All business logic runs on a worker, because anything slow in the handler causes the provider to time out and retry, and that is how a payment flow runs twice. The worker handles reordering with versions — apply only if newer — and uses the event id as the idempotency key for any side effect it causes downstream." }
        ] }
    ]
  }
});
