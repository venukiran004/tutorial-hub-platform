/* ============================================================================
   LESSON 9.5 — Behavioural Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "9.5",

  lede: "Behavioural patterns decide **who makes a decision, and who hears about it**. A **strategy** makes an algorithm a swappable part. An **observer** lets a subject announce events without knowing who listens. A **chain of responsibility** passes a request along a line of handlers, any of which may act on it or stop it. In one process these are small. Each is also the seed of a system-design pattern: strategies become policies and experiments, observers become publish–subscribe and event-driven architecture, and chains become middleware and gateway filters — where the in-process versions' hidden assumptions turn into outages.",

  objectives: [
    "Select a strategy per user deterministically, so an experiment is consistent and fair",
    "Explain why synchronous observers couple the subject to every observer's speed and failures",
    "Order a middleware chain so caching cannot leak private responses",
    "Implement a state machine that rejects illegal transitions and ignores duplicates",
    "Map each behavioural pattern to the system-design pattern it grows into"
  ],

  prerequisites: ["9.1", "9.4"],

  blocks: [

    { t: "h2", n: "01", id: "strategy", text: "Strategy",
      sub: "An algorithm as a swappable part" },

    { t: "p", text: "A strategy is a family of interchangeable algorithms behind one interface, chosen at run time: how to rank search results, which load-balancing policy to use (2.2), which eviction policy (3.3), how to back off (7.1). In Python a strategy is usually just a function, and the registry of 9.1 holds them. The interesting decision is not how to swap strategies but **how to choose one** — and for an A/B experiment, choosing per request is a bug:" },

    { t: "code", lang: "python", title: "strategy.py — two ranking strategies, chosen per request or per user", code: `import hashlib, random

def by_price(items):  return sorted(items, key=lambda i: i["price"])            # a strategy is just a function
def by_rating(items): return sorted(items, key=lambda i: -i["rating"])
RANKERS = {"price": by_price, "rating": by_rating}

def random_variant(user_id, rng=random.Random(7)):        # choose a strategy per REQUEST
    return rng.choice(["price", "rating"])

def hashed_variant(user_id, experiment="search-ranking-v2"):
    """Choose per USER: hash (experiment, user) into 100 buckets; buckets 0-49 get 'price'."""
    bucket = int(hashlib.sha256(f"{experiment}:{user_id}".encode()).hexdigest(), 16) % 100
    return "price" if bucket < 50 else "rating"

items = [{"name": "kettle", "price": 25, "rating": 4.1}, {"name": "toaster", "price": 40, "rating": 4.8}]
for assign in (random_variant, hashed_variant):
    seen = [assign("user-81") for _ in range(12)]          # one user, twelve searches
    users = [assign(f"user-{u}") for u in range(10_000)]
    flips = sum(a != b for a, b in zip(seen, seen[1:]))
    print(f"{assign.__name__:<15} user-81 sees: {' '.join(v[0].upper() for v in seen)}  ({flips} switches)"
          f"   10,000 users: {users.count('price') / 100:.1f}% price")

print("ranked for user-81:", [i["name"] for i in RANKERS[hashed_variant("user-81")](items)])`,
      hl: [3, 7, 10, 12, 13],
      out: `random_variant  user-81 sees: R P R P P P R P P P P R  (6 switches)   10,000 users: 50.5% price
hashed_variant  user-81 sees: P P P P P P P P P P P P  (0 switches)   10,000 users: 49.7% price
ranked for user-81: ['kettle', 'toaster']` },

    { t: "viz", title: "One user, twelve searches",
      caption: "Choosing a strategy at random per request splits traffic 50/50 but flips the same user between rankings six times in twelve searches — a confusing product and a useless experiment, since every user saw both variants. Hashing the experiment name with the user ID gives each user one stable variant while keeping the overall split even; changing the experiment name reshuffles users for the next test.",
      svg: `<svg viewBox="0 0 760 170" width="100%" role="img" aria-label="Strategy assignment per request and per user">
<text x="172" y="46" text-anchor="end" class="s-label">assigned per request</text>
<rect x="186" y="24" width="34" height="34" rx="6" style="fill:var(--violet);fill-opacity:.22;stroke:var(--violet)" stroke-width="1.3"/>
<text x="203" y="46" text-anchor="middle" class="s-mono">R</text>
<rect x="226" y="24" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="243" y="46" text-anchor="middle" class="s-mono">P</text>
<rect x="266" y="24" width="34" height="34" rx="6" style="fill:var(--violet);fill-opacity:.22;stroke:var(--violet)" stroke-width="1.3"/>
<text x="283" y="46" text-anchor="middle" class="s-mono">R</text>
<rect x="306" y="24" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="323" y="46" text-anchor="middle" class="s-mono">P</text>
<rect x="346" y="24" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="363" y="46" text-anchor="middle" class="s-mono">P</text>
<rect x="386" y="24" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="403" y="46" text-anchor="middle" class="s-mono">P</text>
<rect x="426" y="24" width="34" height="34" rx="6" style="fill:var(--violet);fill-opacity:.22;stroke:var(--violet)" stroke-width="1.3"/>
<text x="443" y="46" text-anchor="middle" class="s-mono">R</text>
<rect x="466" y="24" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="483" y="46" text-anchor="middle" class="s-mono">P</text>
<rect x="506" y="24" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="523" y="46" text-anchor="middle" class="s-mono">P</text>
<rect x="546" y="24" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="563" y="46" text-anchor="middle" class="s-mono">P</text>
<rect x="586" y="24" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="603" y="46" text-anchor="middle" class="s-mono">P</text>
<rect x="626" y="24" width="34" height="34" rx="6" style="fill:var(--violet);fill-opacity:.22;stroke:var(--violet)" stroke-width="1.3"/>
<text x="643" y="46" text-anchor="middle" class="s-mono">R</text>
<text x="186" y="76" class="s-sub" style="fill:var(--crit)">6 switches: a page that reorders itself</text>
<text x="172" y="114" text-anchor="end" class="s-label">hashed per user</text>
<rect x="186" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="203" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="226" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="243" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="266" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="283" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="306" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="323" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="346" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="363" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="386" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="403" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="426" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="443" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="466" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="483" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="506" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="523" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="546" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="563" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="586" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="603" y="114" text-anchor="middle" class="s-mono">P</text>
<rect x="626" y="92" width="34" height="34" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.3"/>
<text x="643" y="114" text-anchor="middle" class="s-mono">P</text>
<text x="186" y="144" class="s-sub" style="fill:var(--good)">0 switches: one consistent experience</text>
<text x="186" y="164" class="s-sub">P = ranked by price, R = ranked by rating; the same user, twelve searches in a row</text>
</svg>` },

    { t: "callout", kind: "insight", title: "At system scale: policies, flags and experiments",
      body: [
        { t: "p", text: "Feature-flag systems and experimentation platforms are strategy selectors with a control plane: the strategies are deployed code, and which one runs for whom is configuration that can change without a deploy. The hashing above is how they assign users — sticky, uniform, independent across experiments — and the same idea routes a percentage of traffic to a canary release." }
      ] },

    { t: "h2", n: "02", id: "observer", text: "Observer",
      sub: "Announce an event without knowing who listens" },

    { t: "p", text: "A subject keeps a list of observers and notifies them when something happens; it knows they exist but not what they do. Registration notifies email, the CRM and a bonus service, and adding a fourth listener does not touch registration (9.1's open/closed). The textbook implementation calls each observer **synchronously, in turn** — which quietly makes the subject as slow as its slowest observer and as fragile as its most fragile one:" },

    { t: "code", lang: "python", title: "observer.py — the same three observers, called in turn or queued", code: `import queue, threading, time

class Events:
    """The subject: knows only that someone may be listening."""
    def __init__(self): self.subscribers = []
    def subscribe(self, fn): self.subscribers.append(fn)
    def publish_sync(self, event):                        # the textbook version: call each observer in turn
        for fn in self.subscribers: fn(event)
    def publish_isolated(self, event, outbox):            # each observer runs later, alone
        for fn in self.subscribers: outbox.put((fn, event))

done = []
def send_welcome_email(user): time.sleep(0.3); done.append("email")          # a slow SMTP server
def update_crm(user): raise ConnectionError("CRM timed out")                   # a broken integration
def award_signup_bonus(user): done.append("bonus")

def register(events, user, outbox=None):
    start = time.perf_counter()
    try:
        # ... the account row is written here ...
        if outbox is None: events.publish_sync(user)
        else: events.publish_isolated(user, outbox)
        result = "registered"
    except Exception as e: result = f"FAILED: {e}"
    return result, (time.perf_counter() - start) * 1000

events = Events()
for fn in (send_welcome_email, update_crm, award_signup_bonus): events.subscribe(fn)

result, ms = register(events, "asha")
print(f"synchronous observers : {result:<28} in {ms:4.0f} ms; observers that ran: {done}")

done.clear(); outbox, failures = queue.Queue(), []
def worker():                                             # in production: a queue and a worker pool (6.1)
    while True:
        fn, event = outbox.get()
        try: fn(event)
        except Exception as e: failures.append(f"{fn.__name__}: {e}")   # retried or dead-lettered, alone
        outbox.task_done()
for _ in range(3): threading.Thread(target=worker, daemon=True).start()
result, ms = register(events, "ben", outbox)
outbox.join()
print(f"queued, isolated      : {result:<28} in {ms:4.0f} ms; observers that ran: {sorted(done)}; failed: {failures}")`,
      hl: [7, 8, 9, 10, 38],
      out: `synchronous observers : FAILED: CRM timed out        in  300 ms; observers that ran: ['email']
queued, isolated      : registered                   in    0 ms; observers that ran: ['bonus', 'email']; failed: ['update_crm: CRM timed out']` },

    { t: "viz", title: "Synchronous observers, and queued ones",
      caption: "Called in turn, the slow email server added 300 ms to registration, the CRM's error failed the whole request after the account was already written, and the bonus observer never ran. Queued, registration returned at once; each observer ran in a worker, the CRM failure was recorded on its own for retry or a dead-letter queue, and the other two completed.",
      svg: `<svg viewBox="0 0 760 262" width="100%" role="img" aria-label="Synchronous and queued observers">
<defs><marker id="ob-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<text x="20" y="20" class="s-label" style="fill:var(--crit)">Synchronous: the subject calls each observer in turn</text>
<rect x="20" y="34" width="120" height="42" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="80.0" y="59.0" text-anchor="middle" class="s-mono">register()</text>
<line x1="140" y1="55" x2="178" y2="55" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="180" y="34" width="130" height="42" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/><text x="245.0" y="53.0" text-anchor="middle" class="s-mono">email</text><text x="245.0" y="68.0" text-anchor="middle" class="s-sub" style="fill:var(--warn)">+300 ms</text>
<line x1="310" y1="55" x2="348" y2="55" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="350" y="34" width="130" height="42" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/><text x="415.0" y="53.0" text-anchor="middle" class="s-mono">update_crm</text><text x="415.0" y="68.0" text-anchor="middle" class="s-sub" style="fill:var(--crit)">raises</text>
<line x1="480" y1="55" x2="518" y2="55" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="520" y="34" width="130" height="42" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="585.0" y="53.0" text-anchor="middle" class="s-mono">bonus</text><text x="585.0" y="68.0" text-anchor="middle" class="s-sub" style="fill:var(--line)">never runs</text>
<text x="20" y="98" class="s-sub" style="fill:var(--crit)">the user waits for the email, then sees an error; the account exists, the bonus does not</text>
<line x1="20" y1="114" x2="740" y2="114" style="stroke:var(--line);stroke-dasharray:4 4"/>
<text x="20" y="138" class="s-label" style="fill:var(--good)">Queued: the subject records the event; workers run each observer alone</text>
<rect x="20" y="168" width="120" height="42" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="80.0" y="187.0" text-anchor="middle" class="s-mono">register()</text><text x="80.0" y="202.0" text-anchor="middle" class="s-sub" style="fill:var(--accent)">returns now</text>
<line x1="140" y1="189" x2="198" y2="189" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="200" y="168" width="120" height="42" rx="8" class="s-fill" style="stroke:var(--teal)" stroke-width="1.5"/><text x="260.0" y="187.0" text-anchor="middle" class="s-mono">queue</text><text x="260.0" y="202.0" text-anchor="middle" class="s-sub" style="fill:var(--teal)">durable (6.4)</text>
<line x1="320" y1="189" x2="438" y2="166" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="440" y="150" width="140" height="32" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="510.0" y="170.0" text-anchor="middle" class="s-mono">email</text>
<text x="592" y="170" class="s-sub" style="fill:var(--good)">done, later</text>
<line x1="320" y1="189" x2="438" y2="202" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="440" y="186" width="140" height="32" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/><text x="510.0" y="206.0" text-anchor="middle" class="s-mono">update_crm</text>
<text x="592" y="206" class="s-sub" style="fill:var(--warn)">retried / DLQ</text>
<line x1="320" y1="189" x2="438" y2="238" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="440" y="222" width="140" height="32" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="510.0" y="242.0" text-anchor="middle" class="s-mono">bonus</text>
<text x="592" y="242" class="s-sub" style="fill:var(--good)">done</text>
<text x="20" y="236" class="s-sub" style="fill:var(--good)">registration returns in milliseconds;</text><text x="20" y="252" class="s-sub" style="fill:var(--good)">a broken observer fails alone, and is retried</text>
</svg>` },

    { t: "callout", kind: "trap", title: "The in-memory queue is not the fix",
      body: [
        { t: "p", text: "The demo's queue lives in the process. If the process crashes after the account is written and before the workers run, the welcome email and the bonus are lost — the dual-write problem of 6.4. In production the event goes to a durable broker through a **transactional outbox**, observers become **consumers** with their own retries and dead-letter queues, and they must be idempotent because delivery is at least once (6.3). That is publish–subscribe (6.2): the observer pattern with the subject and observers in different processes and a broker between them." }
      ] },

    { t: "h2", n: "03", id: "chain", text: "Chain of responsibility",
      sub: "A line of handlers; any of them may stop the request" },

    { t: "p", text: "A chain of responsibility passes a request through a sequence of handlers. Each can act on it, change it, pass it on, or answer it and stop — authentication returns 401, a rate limiter returns 429, a cache returns a stored response. This is exactly how web middleware, gRPC interceptors and Envoy filter chains work. The handlers are independent, which makes it easy to reorder them — and **order is part of the behaviour**:" },

    { t: "code", lang: "python", title: "chain.py — the same three handlers, in two orders", code: `from functools import reduce

SESSIONS = {"tok-asha": "asha"}

def account_page(req):                                   # the application handler
    return 200, f"<h1>{req['user']}'s account</h1> card ending 4242"

def auth(next_handler):                                  # each middleware wraps the next one in the chain
    def handle(req):
        user = SESSIONS.get(req.get("token"))
        if user is None: return 401, "please log in"
        return next_handler({**req, "user": user})
    return handle

def cache_by_path(next_handler):
    store = {}
    def handle(req):
        if req["path"] not in store: store[req["path"]] = next_handler(req)
        return store[req["path"]]                        # keyed by URL only
    return handle

def cache_by_user(next_handler):
    store = {}
    def handle(req):
        key = (req["user"], req["path"])                 # needs auth to have run already
        if key not in store: store[key] = next_handler(req)
        return store[key]
    return handle

def build(middlewares, app):                             # the first middleware listed sees the request first
    return reduce(lambda inner, mw: mw(inner), reversed(middlewares), app)

for label, chain in (("cache -> auth -> app ", [cache_by_path, auth]), ("auth -> cache -> app ", [auth, cache_by_user])):
    handler = build(chain, account_page)
    handler({"path": "/account", "token": "tok-asha"})            # Asha views her account
    status, body = handler({"path": "/account"})                    # then an anonymous request
    print(f"{label} anonymous GET /account -> {status} {body}")`,
      hl: [19, 25, 30, 31],
      out: `cache -> auth -> app  anonymous GET /account -> 200 <h1>asha's account</h1> card ending 4242
auth -> cache -> app  anonymous GET /account -> 401 please log in` },

    { t: "viz", title: "Where the anonymous request stops",
      caption: "Top: the cache runs before authentication and keys responses by URL alone, so after Asha loads her account page, an anonymous request for the same URL is answered from the cache with her name and card. Bottom: authentication runs first and stops the anonymous request with a 401; the cache behind it keys by user, so it can never serve one user's page to another.",
      svg: `<svg viewBox="0 0 760 230" width="100%" role="img" aria-label="Middleware order">
<defs><marker id="ob-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<text x="20" y="22" class="s-label" style="fill:var(--crit)">cache → auth → app</text>
<rect x="20" y="30" width="120" height="44" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="80.0" y="50.0" text-anchor="middle" class="s-mono">anonymous</text><text x="80.0" y="65.0" text-anchor="middle" class="s-sub" style="fill:var(--line)">GET /account</text>
<line x1="142" y1="52" x2="178" y2="52" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="180" y="30" width="120" height="44" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/><text x="240.0" y="50.0" text-anchor="middle" class="s-mono">cache</text><text x="240.0" y="65.0" text-anchor="middle" class="s-sub" style="fill:var(--crit)">keyed by URL</text>
<line x1="304" y1="52" x2="328" y2="52" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="330" y="30" width="120" height="44" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="390.0" y="56.0" text-anchor="middle" class="s-mono">auth</text>
<line x1="454" y1="52" x2="478" y2="52" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="480" y="30" width="120" height="44" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="540.0" y="56.0" text-anchor="middle" class="s-mono">app</text>
<path d="M240 74 Q240 96 200 96 L140 96" style="fill:none;stroke:var(--crit)" stroke-width="1.5" marker-end="url(#ob-a)"/>
<text x="252" y="100" class="s-sub" style="fill:var(--crit)">HIT: Asha's account page, card ending 4242</text>
<text x="20" y="126" class="s-label" style="fill:var(--good)">auth → cache → app</text>
<rect x="20" y="134" width="120" height="44" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="80.0" y="154.0" text-anchor="middle" class="s-mono">anonymous</text><text x="80.0" y="169.0" text-anchor="middle" class="s-sub" style="fill:var(--line)">GET /account</text>
<line x1="142" y1="156" x2="178" y2="156" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="180" y="134" width="120" height="44" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="240.0" y="154.0" text-anchor="middle" class="s-mono">auth</text><text x="240.0" y="169.0" text-anchor="middle" class="s-sub" style="fill:var(--good)">no session</text>
<line x1="304" y1="156" x2="328" y2="156" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="330" y="134" width="120" height="44" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="390.0" y="154.0" text-anchor="middle" class="s-mono">cache</text><text x="390.0" y="169.0" text-anchor="middle" class="s-sub" style="fill:var(--line)">keyed by user</text>
<line x1="454" y1="156" x2="478" y2="156" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#ob-a)"/>
<rect x="480" y="134" width="120" height="44" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="540.0" y="160.0" text-anchor="middle" class="s-mono">app</text>
<path d="M240 178 Q240 200 200 200 L140 200" style="fill:none;stroke:var(--good)" stroke-width="1.5" marker-end="url(#ob-a)"/>
<text x="252" y="204" class="s-sub" style="fill:var(--good)">401: please log in</text>
</svg>` },

    { t: "callout", kind: "trap", title: "Order rules for middleware",
      body: [
        { t: "p", text: "Put **authentication before anything that varies by user** — caching, personalisation, per-user rate limits. Cache only responses that are the same for everyone, or include the user in the cache key and mark private responses `Cache-Control: private` so CDNs skip them (3.5). Put **cheap rejections first** — IP rate limits and request-size limits before expensive authentication. Put **tracing and logging outermost** so they see every request, including rejected ones. Write the order down, and test it with an anonymous request against a personalised URL." }
      ] },

    { t: "h2", n: "04", id: "family", text: "The rest of the family",
      sub: "And what each becomes at system scale" },

    { t: "table", head: ["Pattern", "In one process", "At system scale", "See"], rows: [
      ["Strategy", "swap an algorithm", "feature flags, routing policies, experiments", "2.2, 3.3"],
      ["Observer", "notify listeners", "publish–subscribe, event-driven architecture", "6.2, 10.4"],
      ["Chain of responsibility", "handlers in sequence", "middleware, gateway and sidecar filters", "10.5"],
      ["Command", "a request as an object", "job queues, retries, undo, audit logs", "6.1"],
      ["State", "behaviour by current state", "order lifecycles, circuit breakers", "7.1"],
      ["Mediator", "objects talk via a coordinator", "saga orchestrators, workflow engines", "5.4"],
      ["Memento", "save and restore state", "snapshots and checkpoints", "8.6"],
      ["Iterator", "walk a collection", "cursor pagination, streaming results", "1.5"]
    ] },

    { t: "p", text: "The **State** pattern deserves a closer look because it is everywhere in distributed systems: an order, a payment, a deployment and a circuit breaker each have a small set of states and a small set of legal transitions between them. Making that table explicit — instead of scattering `if status == ...` checks — is what lets a service reject impossible events and ignore duplicate ones, which an event-driven consumer must do. The exercise builds one." },

    { t: "exercise", kind: "Challenge", title: "An order lifecycle as a state machine",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Orders move through created, paid, shipped, delivered, and on to refunds and returns. Events arrive from a queue, so they may be **redelivered** (6.3) and may be **wrong** — a cancellation after shipping, a payment after a refund. Implement the lifecycle as an explicit transition table, apply a stream of events, ignore duplicates by event ID, and reject illegal transitions with a clear error." }
      ],
      requirements: [
        "A transition table: for each state, the events it accepts and the resulting state",
        "Idempotency: an event ID seen before is ignored",
        "Illegal transitions raise an error naming the event and the current state",
        "Terminal states accept nothing",
        "Print each step and the final path"
      ],
      hint: "A dictionary of dictionaries is the whole state machine: TRANSITIONS[state][event] gives the next state, and a missing key means the event is illegal there. Record event IDs only after a transition succeeds.",
      solution: { lang: "python", title: "state_ex.py",
        code: `class IllegalTransition(Exception): pass

class Order:
    """The State pattern as a table: each state lists the events it accepts and where they lead."""
    TRANSITIONS = {
        "created":   {"pay": "paid", "cancel": "cancelled"},
        "paid":      {"ship": "shipped", "cancel": "refunding"},
        "refunding": {"refunded": "cancelled"},
        "shipped":   {"deliver": "delivered", "return": "returning"},
        "returning": {"refunded": "returned"},
        "delivered": {"return": "returning"},
        "cancelled": {}, "returned": {},
    }
    def __init__(self, order_id): self.id, self.state, self.seen, self.history = order_id, "created", set(), []
    def apply(self, event_id, event):
        if event_id in self.seen: return f"{event:<9} duplicate of {event_id}, ignored"        # idempotent
        nxt = self.TRANSITIONS[self.state].get(event)
        if nxt is None: raise IllegalTransition(f"{event!r} is not allowed when {self.state!r}")
        self.seen.add(event_id); self.history.append((self.state, event, nxt)); self.state = nxt
        return f"{event:<9} {self.history[-1][0]} -> {nxt}"

order = Order("o-1042")
stream = [("e1", "pay"), ("e2", "ship"), ("e2", "ship"),          # a redelivered message (6.3)
          ("e3", "cancel"),                                       # a customer cancels after shipping
          ("e4", "deliver"), ("e5", "return"), ("e6", "refunded"), ("e7", "pay")]
for event_id, event in stream:
    try: print("  ok    ", order.apply(event_id, event))
    except IllegalTransition as e: print("  REJECT", e)
print("final state:", order.state, "| path:", " -> ".join([order.history[0][0]] + [h[2] for h in order.history]))`,
        out: `  ok     pay       created -> paid
  ok     ship      paid -> shipped
  ok     ship      duplicate of e2, ignored
  REJECT 'cancel' is not allowed when 'shipped'
  ok     deliver   shipped -> delivered
  ok     return    delivered -> returning
  ok     refunded  returning -> returned
  REJECT 'pay' is not allowed when 'returned'
final state: returned | path: created -> paid -> shipped -> delivered -> returning -> returned`,
        notes: [
          { t: "p", text: "The redelivered `ship` was ignored, so the order did not ship twice; the cancellation after shipping was rejected instead of silently creating an impossible state; and nothing was accepted once the order reached the terminal `returned` state. Every rule is in one table that a product manager can read." },
          { t: "p", text: "In a real consumer, a rejected event goes to a dead-letter queue or triggers a compensating flow (a cancellation after shipping becomes a return), and the state and the seen event IDs are stored in the same transaction as the state change. Libraries such as `transitions` in Python, and workflow engines like Temporal or AWS Step Functions, are this table with persistence and timers." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a cache that served account pages to strangers",
      body: [
        { t: "p", text: "**Symptom.** During a traffic spike, users began reporting that their account page showed someone else's name, email address and partial card number. It stopped when caching was switched off." },
        { t: "p", text: "**Mechanism.** To absorb the spike, caching was enabled on more routes at the edge. The cache sat in front of the application's authentication and keyed responses by URL, and the account routes did not mark their responses private. The first user to load `/account` populated the cache, and later users — logged in or not — received that page: chain.py's first order, at the scale of a CDN. Steam's store suffered this class of failure in December 2015, when a caching configuration change during a denial-of-service attack served pages generated for some users to others." },
        { t: "p", text: "**Fix.** Personalised routes now send `Cache-Control: private, no-store`, the edge caches only an allow-list of public routes, and a synthetic test requests personalised URLs as two different users and as an anonymous one after every configuration change, failing the deploy if any two responses match." }
      ] }
  ],

  takeaways: [
    "A **strategy** makes an algorithm swappable; in Python, usually a function in a registry.",
    "For experiments, choose a strategy **per user by hashing**, not per request: measured, random assignment flipped one user **6 times in 12 searches**; hashing gave **0 flips** and still split users ~50/50.",
    "An **observer** lets a subject announce events without knowing who listens — open for new listeners.",
    "**Synchronous observers** couple the subject to each one: measured, a slow email added **300 ms** to registration and a CRM error **failed it**, after the account was written.",
    "Queue observers so each runs **alone**, with retries and dead letters — durably, through an **outbox**, in production: that is **publish–subscribe**.",
    "A **chain of responsibility** passes a request through handlers that may stop it; it is how middleware, interceptors and gateway filters work.",
    "**Middleware order is behaviour**: a cache before authentication served **Asha's account page to an anonymous request**.",
    "Authenticate before anything user-specific; reject cheaply first; trace outermost; mark private responses private.",
    "The **State** pattern — an explicit transition table — lets an event consumer **ignore duplicates and reject impossible events**.",
    "Command, mediator, memento and iterator grow into job queues, saga orchestrators, checkpoints and cursor pagination."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "An A/B test picks a ranking strategy with random.choice() on every search request. What goes wrong?",
        options: ["The traffic split will not be close to 50/50", "Each user sees both variants, flipping between them, so the experience is inconsistent and the experiment cannot attribute behaviour to a variant", "Random choice is too slow for search", "Nothing, as long as the sample is large"],
        answer: 1,
        why: "The overall split is fine — 50.5% in the run — but assignment must be per user for the experiment to compare groups of users, and for each user to see one consistent product. A large sample does not fix contaminated groups, and random.choice is fast." },

      { stem: "Registration notifies three observers synchronously. The second raises an exception. What happens?",
        options: ["Only the second observer is skipped", "The exception propagates to registration: the request fails, and observers after it never run", "The subject retries the observer automatically", "All observers run, then the exception is reported"],
        answer: 1,
        why: "Calling observers in turn makes their failures the subject's failures, and stops the loop at the first exception, so later observers never run. Nothing retries automatically. Isolation requires catching per observer or, better, queueing each one separately." },

      { stem: "A middleware chain runs a response cache keyed by URL before authentication. What is the risk?",
        options: ["Slightly slower responses", "A personalised response cached for one user can be served to other users, including anonymous ones", "Authentication runs twice", "The cache never gets any hits"],
        answer: 1,
        why: "A cache in front of authentication answers before identity is checked, and a URL-only key cannot tell users apart, so the first user's private page is served to everyone requesting that URL. It is a confidentiality breach, not a performance issue." },

      { stem: "Why does an event-driven order service benefit from an explicit state machine?",
        options: ["It makes events arrive in order", "It lets the consumer ignore duplicate events and reject transitions that are impossible from the current state, in one readable table", "It removes the need for a database", "It makes the broker deliver exactly once"],
        answer: 1,
        why: "Brokers deliver at least once and producers can be wrong; a transition table plus seen event IDs makes the consumer idempotent and turns impossible events into explicit rejections. It does not reorder events, replace storage, or change the broker's delivery guarantee." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Each pattern here is a small version of something you will be asked to design.",
    questions: [
      { level: "core",
        q: "How does the observer pattern relate to publish–subscribe and event-driven architecture?",
        strong: "A strong answer names the coupling of synchronous observers and what a broker changes.",
        answer: [
          { t: "p", text: "Observer is the in-process form: a subject notifies registered listeners without knowing what they do. Called synchronously, though, the subject waits for every observer and fails when one fails. Publish–subscribe moves the observers into other processes with a broker between them, so the publisher only needs the broker to accept the event." },
          { t: "p", text: "That brings its own requirements: publish through an outbox so the event and the state change commit together, make consumers idempotent because delivery is at least once, and give each consumer retries and a dead-letter queue. Event-driven architecture is that, applied as the main way services integrate." }
        ] },

      { level: "core",
        q: "How would you assign users to variants in an A/B test?",
        strong: "A strong answer gives deterministic hashing and explains stickiness, uniformity and independence.",
        answer: [
          { t: "p", text: "Hash the experiment name together with a stable user ID into buckets — say 0 to 99 — and map bucket ranges to variants. It needs no storage, the same user always gets the same variant, the split is uniform, and including the experiment name makes assignments independent across experiments." },
          { t: "p", text: "Ramping is just widening a bucket range, and the assignment is logged with each exposure for analysis. I would avoid per-request randomness, which shows users both variants, and session-based IDs when the effect should be measured across sessions." }
        ] },

      { level: "advanced",
        q: "How do you decide the order of middleware in a gateway or web framework?",
        strong: "A strong answer gives ordering rules with reasons, including the security consequence of getting caching wrong.",
        answer: [
          { t: "p", text: "Tracing and request logging outermost, so every request is visible including rejected ones. Then cheap protective rejections: request-size limits, IP-level rate limits. Then authentication, then anything that depends on identity: per-user rate limits, authorisation, personalisation and any caching of personalised content, with the user in the cache key." },
          { t: "p", text: "The failure I design against is a cache in front of authentication keyed only by URL, which serves one user's private page to others. Shared caches should hold only public responses, personalised responses should be marked private, and I would test the chain with two users and an anonymous request against a personalised URL." }
        ] }
    ]
  }
});
