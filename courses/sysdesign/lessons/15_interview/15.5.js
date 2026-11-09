/* ============================================================================
   LESSON 15.5 — Walkthrough: Notifications, News Feed and Chat
   ========================================================================= */
EC.receiveLesson({
  id: "15.5",

  lede: "Notifications, news feeds and chat look like three products, and they are one problem: something happens once and has to reach many people, quickly and in the right order. Each version stresses a different part of that. A notification system must deliver exactly once through providers that fail and lose acknowledgements, and must not let marketing delay a login code. A feed must decide whether to do the fan-out work when a post is written or when it is read, and the answer changes for an account with twenty million followers. Chat must deliver in order across servers whose clocks disagree, and must tell everyone who is online without drowning in heartbeats. This lesson measures each one.",

  objectives: [
    "Design a notification pipeline with priorities, retries, rate caps and idempotent delivery",
    "Compare fan-out on write, on read and the hybrid on a heavy-tailed follower graph",
    "Explain the celebrity problem as a burst problem, and where the pull cost really lands",
    "Order chat messages with per-conversation sequence numbers instead of timestamps",
    "Design presence so its traffic scales with state changes, not with heartbeats"
  ],

  prerequisites: ["15.2", "6.3", "1.6", "8.2"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "notifications",
      text: "A notification system",
      sub: "Priorities, retries and exactly-once from the user's point of view" },
    { t: "p",
      text: "Requirements: services send notifications by push, SMS and email; users' preferences and quiet hours are respected; security codes arrive within seconds; nobody receives the same notification twice; and a failing provider delays messages rather than losing them. The volume is often modest (thousands a second), and the difficulty is all in delivery semantics." },
    { t: "viz",
      title: "The notification pipeline",
      caption: "The API deduplicates by an idempotency key from the producer and applies preferences. Separate queues per priority keep security codes out of marketing backlogs. Workers enforce per-user and per-provider rate caps, retry with backoff, and pass the idempotency key to providers that support it.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="120.0" y1="126.0" x2="150.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="270.0" y1="126.0" x2="305.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="425.0" y1="126.0" x2="460.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="572.0" y1="100.0" x2="628.0" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="580.0" y1="126.0" x2="620.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="572.0" y1="152.0" x2="628.0" y2="180.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="100" width="110" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="65.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Producers</text>
<text x="65.0" y="140" text-anchor="middle" class="s-sub">services, events</text>
<rect x="150" y="100" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="210.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--accent)">Notify API</text>
<text x="210.0" y="140" text-anchor="middle" class="s-sub">dedupe, prefs</text>
<rect x="305" y="100" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="365.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--warn)">Priority queues</text>
<text x="365.0" y="140" text-anchor="middle" class="s-sub">P0 / P1 / P2</text>
<rect x="460" y="100" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="520.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--accent)">Workers</text>
<text x="520.0" y="140" text-anchor="middle" class="s-sub">rate caps, retry</text>
<rect x="620" y="20" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="680.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--good)">Push / APNs</text>
<rect x="620" y="100" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="680.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--good)">SMS</text>
<rect x="620" y="180" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="680.0" y="202" text-anchor="middle" class="s-label" style="fill:var(--good)">Email</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "notify.py — retries, duplicates and priorities",
      code: `import heapq, random

rng = random.Random(8)

def provider_send(fail_rate, ack_loss):
    """A push provider: it may fail outright, or deliver but lose the acknowledgement (the sender sees a timeout)."""
    r = rng.random()
    if r < fail_rate: return "failed"
    if r < fail_rate + ack_loss: return "delivered_no_ack"
    return "ok"

def run(idempotent, n=10_000, fail_rate=0.05, ack_loss=0.02, max_tries=4):
    delivered, dupes, lost = set(), 0, 0
    for i in range(n):
        key = f"notif:{i}"
        for attempt in range(max_tries):
            res = provider_send(fail_rate, ack_loss)
            if res in ("ok", "delivered_no_ack"):
                if key in delivered and not idempotent: dupes += 1
                delivered.add(key)                      # with a key, the provider drops repeats: the user sees one
            if res == "ok": break
        else:
            lost += key not in delivered
    return len(delivered), dupes, lost

for idem in (False, True):
    d, dup, lost = run(idem)
    print(f"idempotency key {'on ' if idem else 'off'}: delivered {d:,} of 10,000, duplicates seen by users {dup}, never delivered {lost}")

# Priorities under a backlog: 5,000 marketing messages are queued when 50 security codes arrive.
queue, t, done = [], 0.0, {}
for i in range(5_000): heapq.heappush(queue, (2, i, "marketing"))
for i in range(50): heapq.heappush(queue, (0, 5_000 + i, "security code"))
fifo = [("marketing", i) for i in range(5_000)] + [("security code", i) for i in range(50)]
rate = 500                                             # sends per second through the provider
fifo_wait = (5_000 + 25) / rate
while queue:
    prio, i, kind = heapq.heappop(queue); t += 1 / rate
    done.setdefault(kind, []).append(t)
print(f"\\nsecurity codes behind a 5,000-message backlog at {rate}/s: "
      f"FIFO median wait {fifo_wait:.1f} s; priority queue median {sorted(done['security code'])[25]:.2f} s")`,
      out: `idempotency key off: delivered 10,000 of 10,000, duplicates seen by users 209, never delivered 0
idempotency key on : delivered 10,000 of 10,000, duplicates seen by users 0, never delivered 0

security codes behind a 5,000-message backlog at 500/s: FIFO median wait 10.1 s; priority queue median 0.05 s` },
    { t: "dl",
      items: [
        { term: "Retries without a key make duplicates",
          def: "When a provider delivers but the acknowledgement is lost, the sender sees a timeout and retries. With 2% lost acknowledgements, 209 of 10,000 users got a notification twice. With an idempotency key the provider drops the repeat, so delivery is at-least-once on the wire and exactly-once for the user." },
        { term: "Priorities are separate queues",
          def: "In one FIFO queue, 50 security codes behind 5,000 marketing messages waited a median of 10 seconds. With a priority queue they waited 0.05 seconds. Use separate queues, or at least separate consumers, per priority." },
        { term: "Rate caps protect users and providers",
          def: "A per-user cap (for example three marketing messages a day) and a per-provider cap that stays under the provider's own limits, so a burst cannot get the sender throttled or blocked." }
      ] },
    { t: "h2", n: "02", id: "feed", text: "A news feed", sub: "Fan-out on write, on read, or both" },
    { t: "p",
      text: "Fan-out on write copies each new post's ID into every follower's inbox when it is posted, so reading a feed is one read. Fan-out on read stores nothing extra and assembles each feed from the accounts the reader follows. Real follower counts are heavy-tailed, so the simulation draws a million users from a Pareto distribution and compares the two, plus the hybrid that pushes for ordinary authors and pulls for the largest." },
    { t: "code",
      lang: "python",
      title: "feed.py — the cost of each strategy on a heavy-tailed graph",
      code: `import random

# A follower graph with a heavy tail: most users have a few hundred followers, a few have millions.
rng = random.Random(11)
USERS = 1_000_000
followers = sorted((min(int(rng.paretovariate(1.2) * 40), 20_000_000) for _ in range(USERS)), reverse=True)
POSTS_PER_USER = 0.5                                   # posts per user per day
FEED_LOADS_PER_USER = 10                               # feed loads per user per day
EDGES = sum(followers)
FOLLOWING = EDGES / USERS                              # follows per user, consistent with the graph

def daily_cost(threshold):
    """Push (fan-out on write) for authors with fewer followers than threshold; pull the rest at read time.
    A reader follows an account with probability proportional to its follower count, which is what follower counts mean."""
    push_writes = sum(f for f in followers if f < threshold) * POSTS_PER_USER
    celeb_edges = sum(f for f in followers if f >= threshold)
    pulls_per_load = FOLLOWING * celeb_edges / EDGES          # celebrities the average reader follows
    reads = USERS * FEED_LOADS_PER_USER * (1 + pulls_per_load) # one inbox read plus one read per followed celebrity
    return push_writes, reads, sum(1 for f in followers if f >= threshold), pulls_per_load

print(f"largest accounts: {followers[:3]}; median {followers[USERS // 2]}")
print(f"one post by the top account under pure push: {followers[0]:,} inbox writes")
print(f"follows per user {FOLLOWING:.0f}")
print("\\nthreshold     inbox writes/day   reads/day          accounts pulled   pulls per feed load")
for th in (float("inf"), 1_000_000, 100_000, 10_000, 1_000):
    w, r, c, pl = daily_cost(th)
    label = "pure push" if th == float("inf") else f"{th:,}"
    print(f"{label:>10}   {w:>16,.0f}   {r:>16,.0f}   {c:>12,}   {pl:>10.1f}")
w, r, c, pl = daily_cost(0)
print(f"{'pure pull':>10}   {w:>16,.0f}   {r:>16,.0f}   {c:>12,}   {pl:>10.1f}")`,
      out: `largest accounts: [20000000, 1720657, 1377047]; median 71
one post by the top account under pure push: 20,000,000 inbox writes
follows per user 234

threshold     inbox writes/day   reads/day          accounts pulled   pulls per feed load
 pure push        117,045,228         10,000,000              0          0.0
 1,000,000        103,259,407        285,716,430              7         27.6
   100,000         94,002,142        470,861,720             92         46.1
    10,000         79,707,449        756,755,590          1,315         74.7
     1,000         56,672,840      1,217,447,780         20,992        120.7
 pure pull                  0      2,350,904,570      1,000,000        234.1` },
    { t: "viz",
      title: "Writes and reads as the push threshold falls",
      caption: "Pure push costs 117 million inbox writes a day and the minimum possible reads. Moving accounts to pull trades writes for reads, and because follows concentrate on large accounts, reads grow faster than writes fall. Pulling only the 7 largest accounts removes 12% of writes and adds 28 pulls to every feed load.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">10M</text>
<line x1="64" y1="155.3" x2="610" y2="155.3" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="159.3" text-anchor="end" class="s-sub">100M</text>
<line x1="64" y1="86.7" x2="610" y2="86.7" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="90.7" text-anchor="end" class="s-sub">1B</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">10B</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">pure push</text>
<text x="200.5" y="242" text-anchor="middle" class="s-sub">1M</text>
<text x="337.0" y="242" text-anchor="middle" class="s-sub">100k</text>
<text x="473.5" y="242" text-anchor="middle" class="s-sub">10k</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">1k</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">push for authors below this many followers</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">operations per day (log)</text>
<polyline points="64.0,150.7 200.5,154.5 337.0,157.2 473.5,162.1 610.0,172.3" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="150.7" r="2" style="fill:var(--warn)"/>
<circle cx="200.5" cy="154.5" r="2" style="fill:var(--warn)"/>
<circle cx="337.0" cy="157.2" r="2" style="fill:var(--warn)"/>
<circle cx="473.5" cy="162.1" r="2" style="fill:var(--warn)"/>
<circle cx="610.0" cy="172.3" r="2" style="fill:var(--warn)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">inbox writes/day</text>
<polyline points="64.0,224.0 200.5,124.0 337.0,109.1 473.5,95.0 610.0,80.8" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="224.0" r="2" style="fill:var(--accent)"/>
<circle cx="200.5" cy="124.0" r="2" style="fill:var(--accent)"/>
<circle cx="337.0" cy="109.1" r="2" style="fill:var(--accent)"/>
<circle cx="473.5" cy="95.0" r="2" style="fill:var(--accent)"/>
<circle cx="610.0" cy="80.8" r="2" style="fill:var(--accent)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">feed reads/day</text>
</svg>` },
    { t: "callout",
      kind: "insight",
      title: "The celebrity problem is a burst, not a total",
      body: [
        { t: "p",
          text: "Over a day, the largest account adds only a few percent to total fan-out writes. What breaks pure push is one post becoming 20 million inbox writes at once: at a million writes a second, the last follower sees the post 20 seconds late, and the write pipeline is saturated for everyone else. The hybrid pulls those few accounts at read time. Their recent posts are a single hot cache entry shared by millions of readers, so the 'extra reads' in the table are cheap cache hits, not database queries." }
      ] },
    { t: "table",
      head: ["Strategy", "Write cost", "Read cost", "Use when"],
      rows: [
        ["Fan-out on write", "One write per follower per post", "One inbox read", "Most authors; read-heavy feeds"],
        ["Fan-out on read", "None", "One read per followed account", "Tiny scale, or very write-heavy graphs"],
        ["Hybrid", "Push below a follower threshold", "Inbox plus cached celebrity posts", "Any real social graph"]
      ] },
    { t: "h2", n: "03", id: "chat", text: "Chat", sub: "Ordering, group fan-out and presence" },
    { t: "p",
      text: "Chat needs persistent connections (WebSockets, lesson 1.6), delivery to users who may be offline, and order within a conversation. The tempting way to order messages is the server timestamp. The simulation sends 2,000 messages in one busy conversation through two servers whose clocks differ by 120 ms." },
    { t: "code",
      lang: "python",
      title: "chat.py — timestamps against sequence numbers",
      code: `import random
rng = random.Random(3)

# Two people typing quickly in one conversation, each through a different server whose clock is skewed.
skew_ms = {"server_a": 0, "server_b": -120}            # server_b's clock runs 120 ms behind
events, true_t = [], 0.0
for i in range(2_000):
    true_t += rng.expovariate(1 / 150)                 # a message every 150 ms on average
    server = rng.choice(list(skew_ms))
    events.append((true_t, true_t + skew_ms[server], i))

by_timestamp = [i for _, _, i in sorted(events, key=lambda e: e[1])]
inversions = sum(1 for a, b in zip(by_timestamp, by_timestamp[1:]) if a > b)
print(f"ordering by server timestamp: {inversions} adjacent pairs out of order in 2,000 messages")

# The fix: the conversation's owner (one partition) assigns a sequence number as each message arrives.
seq = {i: n for n, (_, _, i) in enumerate(sorted(events, key=lambda e: e[0]))}
by_seq = sorted(seq, key=seq.get)
print(f"ordering by per-conversation sequence number: {sum(1 for a, b in zip(by_seq, by_seq[1:]) if a > b)} out of order")

# Fan-out of a group message: one write, N deliveries; large groups are where it gets expensive.
for members in (2, 50, 500, 5_000):
    print(f"group of {members:>5}: 1 stored message -> {members - 1:>5} deliveries over open connections")`,
      out: `ordering by server timestamp: 266 adjacent pairs out of order in 2,000 messages
ordering by per-conversation sequence number: 0 out of order
group of     2: 1 stored message ->     1 deliveries over open connections
group of    50: 1 stored message ->    49 deliveries over open connections
group of   500: 1 stored message ->   499 deliveries over open connections
group of  5000: 1 stored message ->  4999 deliveries over open connections` },
    { t: "callout",
      kind: "trap",
      title: "Server clocks do not order messages",
      body: [
        { t: "p",
          text: "With a 120 ms clock difference, 266 of 2,000 adjacent messages came out in the wrong order: replies appeared above the questions they answered. Clocks on different machines are never exactly in step (lesson 8.2). The fix is to give each conversation one owner, a partition, that assigns a sequence number as each message arrives. Clients display by sequence number and detect gaps, and nothing depends on wall clocks." }
      ] },
    { t: "dl",
      items: [
        { term: "Store, then deliver",
          def: "A message is written to the conversation's partition with its sequence number, then pushed to online members over their connections; offline members fetch from their last-seen sequence number when they reconnect." },
        { term: "Group size is the fan-out",
          def: "A 5,000-member group turns one stored message into 4,999 deliveries. Large groups and channels move toward the feed's pull model: members fetch new messages when they open the channel." },
        { term: "A connection registry",
          def: "Which gateway holds each user's connection, so a message can be routed to the right server. It is soft state, rebuilt as clients reconnect." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Presence for ten million users",
      difficulty: "advanced",
      minutes: 25,
      body: [
        { t: "p",
          text: "Ten million users are connected, each with 200 contacts of whom about 20% are online. Compare pushing every heartbeat to online contacts against pushing only state changes, at heartbeat intervals of 5, 30 and 60 seconds. Then work out how long a crashed client still appears online with a 30-second heartbeat and a 60-second TTL." }
      ],
      requirements: [
        "Presence messages per second when every heartbeat is fanned out, at three intervals",
        "Presence messages per second when only changes are fanned out, at six changes per user per hour",
        "The write rate of heartbeats to the presence service alone",
        "The median and worst-case staleness after a crash"
      ],
      hint: "Separate the heartbeat, which only refreshes a TTL in the presence service, from the notification, which goes to contacts. Only changes need to reach contacts.",
      solution: { lang: "python",
        title: "presence.py",
        code: `import random

# Presence: 10 million connected users, each with 200 contacts of whom ~20% are online.
ONLINE, CONTACTS, ONLINE_SHARE = 10_000_000, 200, 0.2
CHANGES_PER_USER_HOUR = 6                              # going online, offline, idle, back

def heartbeat_fanout(interval_s):
    """Every user heartbeats; each heartbeat is pushed to every online contact."""
    return ONLINE / interval_s * CONTACTS * ONLINE_SHARE

def change_fanout():
    """Only state changes are pushed; heartbeats go to the presence service alone and expire a TTL there."""
    return ONLINE * CHANGES_PER_USER_HOUR / 3600 * CONTACTS * ONLINE_SHARE

for iv in (5, 30, 60):
    print(f"push every heartbeat ({iv:>2} s): {heartbeat_fanout(iv):>14,.0f} presence messages/s")
print(f"push changes only:           {change_fanout():>14,.0f} presence messages/s")
print(f"heartbeats to the presence service alone (30 s): {ONLINE / 30:>10,.0f} writes/s")

# Staleness: with a 30 s heartbeat and a 60 s TTL, how long does a crashed client still look online?
rng = random.Random(1)
stale = sorted(60 - rng.uniform(0, 30) for _ in range(100_000))        # time since the last heartbeat at the crash
print(f"\\nafter a crash, the user still shows online for: median {stale[50_000]:.0f} s, worst {stale[-1]:.0f} s")
print("a clean logout sends 'offline' immediately; only crashes and lost connections wait for the TTL")`,
        out: `push every heartbeat ( 5 s):     80,000,000 presence messages/s
push every heartbeat (30 s):     13,333,333 presence messages/s
push every heartbeat (60 s):      6,666,667 presence messages/s
push changes only:                  666,667 presence messages/s
heartbeats to the presence service alone (30 s):    333,333 writes/s

after a crash, the user still shows online for: median 45 s, worst 60 s
a clean logout sends 'offline' immediately; only crashes and lost connections wait for the TTL`,
        notes: [
          { t: "p",
            text: "Fanning out every heartbeat is unworkable: 13 million messages a second at a 30-second interval, 80 million at 5 seconds. Fanning out only changes costs about 670,000 a second, twenty times less than even the 30-second heartbeat. The heartbeats still happen, but they go only to the presence service, about 330,000 TTL refreshes a second, which a sharded in-memory store handles." },
          { t: "p",
            text: "The price is staleness after a crash: a user whose app dies still appears online until the TTL expires, a median of 45 seconds and at most 60. A clean logout sends 'offline' at once, so only crashes wait. Products accept this, and large contact lists often go further: presence for a 5,000-member group is fetched when someone opens the member list, not pushed." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the login codes that arrived after they expired",
      body: [
        { t: "p",
          text: "**Symptom.** During a weekly marketing campaign, users trying to log in reported that their one-time codes arrived three to four minutes late, after the codes had expired. Login success fell by a third for the duration of the campaign." },
        { t: "p",
          text: "**Mechanism.** All notifications shared one queue and one pool of workers. The campaign enqueued two million messages in a minute, and every login code waited behind them. Worse, the SMS provider began throttling the account for exceeding its rate, so retries backed off and lengthened the delay further." },
        { t: "p",
          text: "**Fix.** Security codes have their own queue, workers and provider account, with a latency alert at 10 seconds. Campaigns are rate-limited at the source to stay under the provider's limits. Messages carry an expiry, and workers drop anything already past it instead of sending a useless code." }
      ] }
  ],

  takeaways: [
    "Lost acknowledgements make retries send duplicates: **209 in 10,000** without an idempotency key, **0** with one.",
    "Security codes behind a 5,000-message backlog waited **10 s** in one FIFO and **0.05 s** with priority queues.",
    "Pure push cost **117M** inbox writes a day; a hybrid trades writes for reads, which grow faster on a heavy-tailed graph.",
    "The celebrity problem is a **burst**: one post to **20M** followers at 1M writes/s delays the last follower by **20 s**.",
    "Pulled celebrity posts are a **shared hot cache entry**, so the hybrid's extra reads are cheap.",
    "A **120 ms** clock difference put **266 of 2,000** chat messages out of order; per-conversation **sequence numbers** put 0.",
    "Group size is fan-out: large groups and channels move toward **pull**.",
    "Fan out presence **changes**, not heartbeats: **670k/s** against **13M/s** for 10M users.",
    "Heartbeats only refresh a **TTL**; a crashed client looks online for a median **45 s** with a 30 s heartbeat and 60 s TTL."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A provider sometimes delivers a notification but the acknowledgement is lost, so the sender retries. What prevents duplicates?",
        options: [
          "Fewer retries, so that repeats become much rarer",
          "A key the provider deduplicates on",
          "A much longer timeout before every retry",
          "Sending through two providers at the same time"
        ],
        answer: 1,
        why: "The sender cannot tell a lost acknowledgement from a failure, so some retries will repeat a delivered message. A key lets the receiving side drop the repeat. Fewer retries and longer timeouts reduce duplicates but lose messages, and two providers double them." },
      { stem: "Why does pure fan-out on write fail for an account with 20 million followers?",
        options: [
          "Its posts are too large to store in many inboxes",
          "One post means 20M writes at once, a burst",
          "Followers of large accounts rarely read feeds",
          "Inbox storage costs more than reads do"
        ],
        answer: 1,
        why: "The problem is the burst: millions of writes for one event saturate the fan-out pipeline and delay delivery. Post IDs are tiny, readers of large accounts are as active as anyone, and the daily totals are not the issue." },
      { stem: "Two chat servers' clocks differ by 120 ms. What orders messages within a conversation correctly?",
        options: [
          "The timestamp set by the sending server",
          "A sequence number from the conversation's owner",
          "The local timestamp on each client device",
          "The order in which messages reach each recipient"
        ],
        answer: 1,
        why: "One owner per conversation assigns a monotonically increasing number, so order never depends on clocks. Server and device clocks both drift, and arrival order differs between recipients." },
      { stem: "Ten million users heartbeat every 30 seconds. What should be pushed to their online contacts?",
        options: [
          "Every heartbeat, so presence is always fresh",
          "Only changes of state: online, offline, idle",
          "A full contact-list snapshot every minute",
          "Nothing; contacts poll every five seconds"
        ],
        answer: 1,
        why: "Pushing heartbeats to contacts cost 13 million messages a second in the exercise; pushing only changes cost about 670,000. Heartbeats only refresh a TTL in the presence service. Snapshots and fast polling multiply the traffic further." }
    ] },

  interview: { title: "In an interview",
    sub: "Each of these is a full prompt on its own, and each one comes down to its fan-out decision.",
    questions: [
      { level: "core",
        q: "Design a news feed for a social network.",
        strong: "A strong answer estimates, chooses a hybrid fan-out with a threshold, and covers ranking, caching and pagination.",
        answer: [
          { t: "p",
            text: "Posts go to a post store; on write, a fan-out service pushes the post ID into each follower's inbox, a capped list in an in-memory store, for authors below a follower threshold such as 100,000. Posts by accounts above it are not pushed. At read time the feed service merges the reader's inbox with the recent posts of the large accounts they follow, which are cached once and shared, then ranks the result and hydrates post content from cache." },
          { t: "p",
            text: "I would size it from the numbers: posts per day times average followers gives the write load, and the threshold is set where a single post's fan-out would take more than a few seconds. Pagination uses a cursor on the ranked list, and inboxes are rebuilt from the post store if lost, because they are derived data." }
        ] },
      { level: "core",
        q: "How would you guarantee that a user never gets the same notification twice?",
        strong: "A strong answer accepts at-least-once delivery on the wire and achieves exactly-once effect with keys and deduplication.",
        answer: [
          { t: "p",
            text: "I cannot get exactly-once delivery over a network, so I make repeats harmless. Producers attach an idempotency key; the notification API deduplicates on it within a window; workers pass it to providers that support one; and for those that do not, the worker records the key as sent before calling, so a crash between send and record is the only gap, and it is small. Retries then cannot produce a second message the user sees." }
        ] },
      { level: "advanced",
        q: "Design chat for groups of up to 100,000 members.",
        strong: "A strong answer separates small groups from very large ones and changes the fan-out model for the large ones.",
        answer: [
          { t: "p",
            text: "Small conversations work as usual: one partition per conversation assigns sequence numbers, stores the message, and pushes it to online members through the gateways that hold their connections. At 100,000 members, pushing every message to every member is a broadcast storm, so large groups become channels: messages are stored and members fetch the latest when they open the channel, with a lightweight 'new activity' signal rather than full delivery." },
          { t: "p",
            text: "Presence in such groups is fetched on demand, not pushed. Read receipts are aggregated counts, not per-member events. Sending is rate-limited per member, because one user can otherwise generate 100,000 deliveries per message." }
        ] }
    ] }
});
