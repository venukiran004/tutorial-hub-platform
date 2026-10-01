/* ============================================================================
   LESSON 10.5 — Gateway, Discovery, Sidecar and Service Mesh
   ========================================================================= */
EC.receiveLesson({
  id: "10.5",

  lede: "Once a system is several services, a layer of infrastructure appears between them that no single service owns. An **API gateway** is the front door for traffic from outside — north–south. **Service discovery** keeps track of which instances of each service exist and are healthy, as containers come and go. A **sidecar** proxy beside every instance handles the networking a service would otherwise implement in each language — TLS, retries, timeouts, metrics — and a **service mesh** is a fleet of those sidecars driven by a **control plane**. Each solves a real problem and each adds a hop, a component to run, and new ways to fail: stale registries, and retries that multiply through the layers.",

  objectives: [
    "Place gateway, registry, sidecars and control plane on one map, and say what each owns",
    "Measure how registry TTLs, client caching and outlier ejection decide how long a dead instance gets traffic",
    "Explain why retries in several layers multiply, and cap them with a retry budget",
    "Propagate deadlines through a call chain so abandoned work stops",
    "Decide when a gateway, a library or a full mesh is the right tool"
  ],

  prerequisites: ["10.1", "7.2", "2.2"],

  blocks: [

    { t: "h2", n: "01", id: "map", text: "The map",
      sub: "North–south through the gateway, east–west through the sidecars" },

    { t: "viz", title: "Gateway, sidecars, control plane and registry",
      caption: "External clients reach the system only through the gateway, which authenticates, rate-limits and routes. Inside, every pod pairs a service with a sidecar proxy; services talk to each other proxy to proxy, so encryption, retries, timeouts and metrics are applied uniformly in any language. The control plane pushes routes, policies and certificates to the proxies (dashed violet), using the registry's view of which instances exist and are healthy.",
      svg: `<svg viewBox="0 0 760 330" width="100%" role="img" aria-label="Gateway, sidecars, control plane and registry">
<defs><marker id="gw-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="380" y="10" width="300" height="36" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="530.0" y="25.0" text-anchor="middle" class="s-label">control plane</text><text x="530.0" y="40.0" text-anchor="middle" class="s-sub">routes, retry policy, certificates</text>
<rect x="16" y="160" width="92" height="40" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="62.0" y="184.0" text-anchor="middle" class="s-label">clients</text>
<rect x="140" y="150" width="120" height="60" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="200.0" y="177.0" text-anchor="middle" class="s-label">API gateway</text><text x="200.0" y="192.0" text-anchor="middle" class="s-sub">auth, limits, routing</text>
<line x1="108" y1="180" x2="138" y2="180" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#gw-a)"/>
<text x="200" y="232" text-anchor="middle" class="s-sub" style="fill:var(--accent)">north–south</text>
<rect x="300" y="110" width="190" height="80" rx="10" style="fill:none;stroke:var(--line);stroke-dasharray:4 4"/>
<text x="482" y="105" text-anchor="end" class="s-sub">pod</text>
<rect x="310" y="118" width="170" height="30" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="395.0" y="137.0" text-anchor="middle" class="s-mono">orders</text>
<rect x="310" y="156" width="170" height="26" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/><text x="395.0" y="173.0" text-anchor="middle" class="s-sub">sidecar proxy</text>
<line x1="395" y1="148" x2="395" y2="156" style="stroke:var(--ink-3)" stroke-width="1.4"/>
<rect x="540" y="64" width="190" height="80" rx="10" style="fill:none;stroke:var(--line);stroke-dasharray:4 4"/>
<text x="722" y="59" text-anchor="end" class="s-sub">pod</text>
<rect x="550" y="72" width="170" height="30" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="635.0" y="91.0" text-anchor="middle" class="s-mono">payments</text>
<rect x="550" y="110" width="170" height="26" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/><text x="635.0" y="127.0" text-anchor="middle" class="s-sub">sidecar proxy</text>
<line x1="635" y1="102" x2="635" y2="110" style="stroke:var(--ink-3)" stroke-width="1.4"/>
<rect x="300" y="236" width="190" height="80" rx="10" style="fill:none;stroke:var(--line);stroke-dasharray:4 4"/>
<text x="482" y="231" text-anchor="end" class="s-sub">pod</text>
<rect x="310" y="244" width="170" height="30" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="395.0" y="263.0" text-anchor="middle" class="s-mono">inventory</text>
<rect x="310" y="282" width="170" height="26" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/><text x="395.0" y="299.0" text-anchor="middle" class="s-sub">sidecar proxy</text>
<line x1="395" y1="274" x2="395" y2="282" style="stroke:var(--ink-3)" stroke-width="1.4"/>
<path d="M470 46 V108" style="stroke:var(--violet);stroke-dasharray:3 4;fill:none" stroke-width="1.2"/>
<path d="M640 46 V62" style="stroke:var(--violet);stroke-dasharray:3 4;fill:none" stroke-width="1.2"/>
<path d="M380 28 H286 V300 H298" style="stroke:var(--violet);stroke-dasharray:3 4;fill:none" stroke-width="1.2"/>
<line x1="260" y1="180" x2="308" y2="169" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#gw-a)"/>
<line x1="490" y1="169" x2="548" y2="129" style="stroke:var(--warn)" stroke-width="1.5" marker-end="url(#gw-a)"/>
<path d="M482 182 C530 200 528 290 492 295" style="fill:none;stroke:var(--warn)" stroke-width="1.5" marker-end="url(#gw-a)"/>
<text x="636" y="178" text-anchor="middle" class="s-sub" style="fill:var(--warn)">east–west, proxy to proxy:</text>
<text x="636" y="194" text-anchor="middle" class="s-sub" style="fill:var(--warn)">mTLS, retries, timeouts, metrics</text>
<rect x="540" y="252" width="200" height="36" rx="8" class="s-fill" style="stroke:var(--teal)" stroke-width="1.5"/><text x="640.0" y="267.0" text-anchor="middle" class="s-label">service registry</text><text x="640.0" y="282.0" text-anchor="middle" class="s-sub">Kubernetes endpoints, Consul</text>
<path d="M740 270 H750 V28 H682" style="fill:none;stroke:var(--teal);stroke-dasharray:3 4" stroke-width="1.1"/>
<text x="640" y="306" text-anchor="middle" class="s-sub" style="fill:var(--teal)">who is where, and healthy</text>
</svg>` },

    { t: "diagram", kind: "matrix", title: "Who does what",
      cols: ["Traffic", "Owns", "Examples"],
      rows: ["Load balancer", "API gateway", "Sidecar proxy", "Service mesh", "Service registry"],
      cells: [
        [{ text: "into one service", tone: "accent" }, { text: "spreading load, health checks" }, { text: "ALB, NGINX, HAProxy" }],
        [{ text: "north–south", tone: "accent" }, { text: "auth, limits, routing" }, { text: "Kong, AWS API Gateway, Envoy" }],
        [{ text: "in and out of one pod", tone: "warn" }, { text: "mTLS, retries, telemetry" }, { text: "Envoy, linkerd2-proxy" }],
        [{ text: "east–west", tone: "warn" }, { text: "uniform policy for all sidecars" }, { text: "Istio, Linkerd, Consul" }],
        [{ text: "none", tone: "teal" }, { text: "which instances exist, healthy" }, { text: "Kubernetes, Consul, Eureka" }]
      ] },

    { t: "h2", n: "02", id: "gateway", text: "The API gateway",
      sub: "One front door, kept thin" },

    { t: "p", text: "A gateway gives external clients one address and one contract while the services behind it change. It terminates TLS, authenticates (12.1), applies rate limits and quotas (7.3), routes by path or header, and sometimes aggregates several calls into one response for a client type — a backend for frontend (9.4's facade). It is the place for concerns that apply to **every** external request, and the wrong place for business logic, which turns it into a bottleneck every team must change." },

    { t: "callout", kind: "trap", title: "The gateway as a single point of failure",
      body: [
        { t: "p", text: "Every external request passes through the gateway, so it must be stateless and run as several instances behind a load balancer, in several zones, with its own capacity planning and the strictest change control in the system. Keep rate-limit counters and sessions in shared stores (Redis), not in gateway memory — 9.3's per-process singleton problem applies here too." }
      ] },

    { t: "h2", n: "03", id: "discovery", text: "Service discovery",
      sub: "Who is where, and how fast the answer changes" },

    { t: "p", text: "Instances are cattle, not pets: autoscaling adds them, deploys replace them, crashes remove them, and each gets a new address. A **registry** tracks them — instances register on start and send heartbeats, and are removed when heartbeats stop for a **TTL**. Clients look up instances, either themselves (client-side discovery, a smart client or sidecar choosing an instance) or through a load balancer (server-side). Kubernetes does this natively: a Service's endpoints are the registry, and kube-proxy or the mesh does the choosing." },

    { t: "p", text: "How long does a dead instance keep receiving traffic? Ten instances, one crashes at t = 10 s, a hundred requests a second, round robin, under three configurations:" },

    { t: "code", lang: "python", title: "discovery.py — the cost of a stale view after a crash", code: `import itertools

def simulate(ttl, client_cache, eject_after=None, seconds=70, rps=100, crash_at=10):
    """10 instances heartbeat to a registry every second; instance 3 crashes at t=10 s.
    The registry drops an instance \`ttl\` s after its last heartbeat; clients refresh their copy of the
    list every \`client_cache\` s; optionally they eject an instance after N consecutive failures."""
    alive = set(range(10)); last_beat = {i: 0.0 for i in range(10)}
    cached, cached_at, streak, ejected = list(range(10)), 0.0, {}, set()
    rr, failures = itertools.count(), [0] * seconds
    for tick in range(seconds * rps):
        t = tick / rps
        if t >= crash_at: alive.discard(3)
        for i in alive: last_beat[i] = t                             # heartbeats (1 s granularity is plenty)
        if t - cached_at >= client_cache:                            # client refreshes from the registry
            cached = [i for i in range(10) if t - last_beat[i] < ttl]; cached_at = t; ejected.clear()
        choices = [i for i in cached if i not in ejected] or cached
        target = choices[next(rr) % len(choices)]
        if target not in alive:
            failures[int(t)] += 1
            streak[target] = streak.get(target, 0) + 1
            if eject_after and streak[target] >= eject_after: ejected.add(target)
        else: streak[target] = 0
    return failures

configs = [("TTL 30 s, client cache 30 s", 30, 30, None),
           ("TTL 5 s, client cache 5 s", 5, 5, None),
           ("TTL 30 s, cache 30 s + eject after 3 failures", 30, 30, 3)]
for label, ttl, cache, eject in configs:
    f = simulate(ttl, cache, eject)
    last = max((s for s, n in enumerate(f) if n), default=None)
    print(f"{label:<46} failed requests {sum(f):>5}   errors until t = {last + 1} s")`,
      hl: [14, 15, 21],
      out: `TTL 30 s, client cache 30 s                    failed requests   500   errors until t = 60 s
TTL 5 s, client cache 5 s                      failed requests    50   errors until t = 15 s
TTL 30 s, cache 30 s + eject after 3 failures  failed requests     4   errors until t = 31 s` },

    { t: "viz", title: "Failed requests after one of ten instances crashes",
      caption: "With a 30-second registry TTL and clients refreshing every 30 seconds, the dead instance kept a tenth of all traffic for fifty seconds: 500 errors. Shorter timers cut that to 50 errors in five seconds, at the cost of more heartbeat and lookup traffic. Passive outlier ejection — stop sending to an instance after three consecutive failures, as Envoy does — reduced it to four errors without touching the timers.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0</text>
<line x1="64" y1="172.5" x2="610" y2="172.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="176.5" text-anchor="end" class="s-sub">25</text>
<line x1="64" y1="121.0" x2="610" y2="121.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="125.0" text-anchor="end" class="s-sub">50</text>
<line x1="64" y1="69.5" x2="610" y2="69.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="73.5" text-anchor="end" class="s-sub">75</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">100</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">0–10</text>
<text x="155.0" y="242" text-anchor="middle" class="s-sub">10–20</text>
<text x="246.0" y="242" text-anchor="middle" class="s-sub">20–30</text>
<text x="337.0" y="242" text-anchor="middle" class="s-sub">30–40</text>
<text x="428.0" y="242" text-anchor="middle" class="s-sub">40–50</text>
<text x="519.0" y="242" text-anchor="middle" class="s-sub">50–60</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">60–70</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">seconds; instance 3 of 10 crashes at t = 10 s</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">failed requests per 10 s</text>
<polyline points="64.0,224.0 155.0,18.0 246.0,18.0 337.0,18.0 428.0,18.0 519.0,18.0 610.0,224.0" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="224.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="155.0" cy="18.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="246.0" cy="18.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="337.0" cy="18.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="428.0" cy="18.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="519.0" cy="18.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="224.0" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">TTL 30 s, cache 30 s</text>
<polyline points="64.0,224.0 155.0,121.0 246.0,224.0 337.0,224.0 428.0,224.0 519.0,224.0 610.0,224.0" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="224.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="155.0" cy="121.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="246.0" cy="224.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="337.0" cy="224.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="428.0" cy="224.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="519.0" cy="224.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="610.0" cy="224.0" r="3.6" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">TTL 5 s, cache 5 s</text>
<polyline points="64.0,224.0 155.0,217.8 246.0,224.0 337.0,221.9 428.0,224.0 519.0,224.0 610.0,224.0" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="224.0" r="3.6" style="fill:var(--good)"/>
<circle cx="155.0" cy="217.8" r="3.6" style="fill:var(--good)"/>
<circle cx="246.0" cy="224.0" r="3.6" style="fill:var(--good)"/>
<circle cx="337.0" cy="221.9" r="3.6" style="fill:var(--good)"/>
<circle cx="428.0" cy="224.0" r="3.6" style="fill:var(--good)"/>
<circle cx="519.0" cy="224.0" r="3.6" style="fill:var(--good)"/>
<circle cx="610.0" cy="224.0" r="3.6" style="fill:var(--good)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">+ eject after 3 errors</text>
</svg>` },

    { t: "callout", kind: "insight", title: "Two kinds of health checking",
      body: [
        { t: "p", text: "**Active** checks — the registry or load balancer probing each instance (2.2's readiness) — find failures within a probe interval and catch instances that receive no traffic. **Passive** checks — outlier detection on real requests — react within a few requests but only for instances that are being called. Production meshes use both, plus a cap on how many instances may be ejected at once, so a shared dependency failing cannot make every instance look dead." }
      ] },

    { t: "h2", n: "04", id: "mesh", text: "Sidecars and the service mesh",
      sub: "Networking moved out of the application" },

    { t: "p", text: "Every service needs the same networking behaviour: timeouts, retries with backoff, circuit breaking (7.2), mutual TLS, load balancing, metrics and traces. Implemented as a library, it must be written for every language and upgraded by redeploying every service. A **sidecar** proxy runs beside each instance and intercepts its traffic, so the behaviour is language-independent and upgraded separately; a **mesh** manages all the sidecars centrally, which also gives every call a consistent identity for zero-trust authorisation (12.3)." },

    { t: "p", text: "Centralised retry policy creates a trap of its own: retries are now configured in the client library, the sidecar and the gateway — each reasonable alone. When the backend is down, they multiply:" },

    { t: "code", lang: "python", title: "retrylayers.py — retries at every layer, with and without a budget", code: `class Backend:
    def __init__(self): self.calls = 0
    def handle(self, req):
        self.calls += 1
        raise ConnectionError("503")                        # the database behind it is down

class Retrying:
    """A hop that retries what is below it: a client library, a sidecar, a gateway ..."""
    def __init__(self, inner, attempts=3, budget=None):
        self.inner, self.attempts, self.budget = inner, attempts, budget
        self.requests = self.retries = 0
    def handle(self, req):
        self.requests += 1
        for attempt in range(self.attempts):
            try: return self.inner.handle(req)
            except ConnectionError:
                last = attempt == self.attempts - 1
                over_budget = self.budget is not None and self.retries >= self.budget * self.requests
                if last or over_budget: raise
                self.retries += 1

def stack(layers, budget=None):
    backend = Backend(); top = backend
    for _ in range(layers): top = Retrying(top, attempts=3, budget=budget)
    return backend, top

print(f"{'retrying layers':>16} {'backend calls per user request':>32} {'with a 10% retry budget':>26}")
for layers in (1, 2, 3, 4):
    results = []
    for budget in (None, 0.1):
        backend, top = stack(layers, budget)
        for _ in range(100):
            try: top.handle("GET /orders")
            except ConnectionError: pass
        results.append(backend.calls / 100)
    print(f"{layers:>16} {results[0]:>32.1f} {results[1]:>26.1f}")`,
      hl: [18, 19, 24],
      out: ` retrying layers   backend calls per user request    with a 10% retry budget
               1                              3.0                        1.1
               2                              9.0                        1.2
               3                             27.0                        1.3
               4                             81.0                        1.5` },

    { t: "p", text: "Three retrying layers turned each user request into **27** calls to a backend that was already failing, and four layers into **81** — a retry storm that keeps a recovering service down (7.1). A **retry budget** — retry only while retries are under 10% of requests — held it to about one call per request at any depth. Configure retries in **one** layer, usually the sidecar nearest the caller, and make the others pass errors through." },

    { t: "callout", kind: "tradeoff", title: "Library, sidecar or mesh?",
      body: [
        { t: "p", text: "A mesh costs a proxy per pod (memory, CPU, a little latency per hop), a control plane to run and upgrade, and a new layer to debug when requests fail. It pays off with many services in several languages and requirements for uniform mTLS, traffic shifting for canaries, and per-call telemetry. With a handful of services in one language, a shared client library plus a gateway does most of the job. Proxyless gRPC and sidecar-less modes (such as Istio's ambient mode) are attempts to keep the mesh's benefits with less per-pod overhead." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Propagate the deadline",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "A request travels gateway → A → B → C, with 20 ms per network hop. A works 100 ms, B 150 ms, and C either 700 ms (slow) or 200 ms (fast). The gateway gives the user an error after 800 ms. Compare **independent timeouts**, where each hop keeps working regardless, with **deadline propagation**, where each hop passes the absolute deadline along and refuses work it cannot finish in time — what gRPC deadlines and mesh timeout headers provide." }
      ],
      requirements: [
        "Simulate the chain in virtual time: no sleeping",
        "Report what the user receives and when",
        "Measure the work done by hops after the user was already told it timed out",
        "With propagation, a hop refuses before working if the remaining budget is too small"
      ],
      hint: "Pass the absolute deadline, not a duration: each hop compares its arrival time plus its expected work against it. Without propagation, give the downstream hops an infinite deadline.",
      solution: { lang: "python", title: "deadline_ex.py",
        code: `NET = 20                                           # ms per network hop, each way

def call(hops, t, deadline, propagate, log):
    """Hop hops[0] receives a request at time t; returns (ok, time the response leaves this hop)."""
    name, work = hops[0]
    if propagate and t + work > deadline:          # not enough budget left: refuse before doing anything
        log.append((name, t, t, "refused")); return False, t
    end = t + work
    if len(hops) > 1:                              # do our part, then call the next hop
        ok, back = call(hops[1:], end + NET, deadline if propagate else float("inf"), propagate, log)
        end = back + NET
        if not ok: log.append((name, t, end, "failed")); return False, end
    log.append((name, t, end, "done")); return True, end

def run(hops, propagate, timeout=800):
    log = []
    ok, finished = call(hops, NET, timeout, propagate, log)
    if ok and finished <= timeout: user_sees = ("ok", finished)
    elif finished > timeout:       user_sees = ("timeout", timeout)      # the gateway stopped waiting
    else:                          user_sees = ("timeout", finished)     # refused early: the error came back sooner
    orphaned = sum(max(0, end - max(start, timeout)) for _, start, end, _ in log)
    return user_sees, orphaned, log

for label, hops in (("C slow (700 ms)", [("A", 100), ("B", 150), ("C", 700)]),
                    ("C fast (200 ms)", [("A", 100), ("B", 150), ("C", 200)])):
    for propagate in (False, True):
        (result, at), orphaned, log = run(hops, propagate)
        mode = "deadline propagated" if propagate else "independent timeouts"
        print(f"{label}  {mode:<21} user gets {result:<7} at {at:>4} ms; work after the user gave up: {orphaned:>4} hop-ms")`,
        out: `C slow (700 ms)  independent timeouts  user gets timeout at  800 ms; work after the user gave up:  690 hop-ms
C slow (700 ms)  deadline propagated   user gets timeout at  350 ms; work after the user gave up:    0 hop-ms
C fast (200 ms)  independent timeouts  user gets ok      at  550 ms; work after the user gave up:    0 hop-ms
C fast (200 ms)  deadline propagated   user gets ok      at  550 ms; work after the user gave up:    0 hop-ms`,
        notes: [
          { t: "p", text: "With independent timeouts the user waited the full 800 ms for an error, while A, B and C carried on for 690 hop-milliseconds producing an answer nobody would read — work that, under load, competes with requests that could still succeed. With the deadline propagated, C saw at once that 700 ms could not fit in the 490 ms left and refused; the user got an error at 350 ms and no work was orphaned. When C was fast, both versions succeeded identically." },
          { t: "p", text: "Propagation needs the deadline in every request (gRPC sends grpc-timeout automatically; HTTP services can use a header) and every hop to honour it — including cancelling database queries. It also makes retries safer: a retry with no time left is refused instead of joining the storm." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a mesh rollout that multiplied an outage",
      body: [
        { t: "p", text: "**Symptom.** A brief database failover — normally thirty seconds of errors — turned into twenty minutes of total outage the week after a service mesh was rolled out. The database recovered, but was immediately overwhelmed by traffic far above any normal peak." },
        { t: "p", text: "**Mechanism.** The mesh's default policy retried failed calls three times. The services' HTTP clients already retried three times, and the gateway retried twice. During the failover every failed user request became eighteen database-bound attempts, and the services' connection pools filled with retries; when the database came back, the retry backlog arrived at once — retrylayers.py in production." },
        { t: "p", text: "**Fix.** Retries now live in exactly one layer — the caller's sidecar — with a retry budget and jittered backoff; client libraries and the gateway pass errors through. Deadlines propagate from the gateway, so retries stop when the user has gone. A load test that fails the database mid-run is part of every mesh policy change." }
      ] }
  ],

  takeaways: [
    "The **gateway** owns north–south concerns — TLS, auth, limits, routing — and must stay **thin, stateless and replicated**.",
    "A **registry** tracks instances by registration and heartbeat **TTL**; Kubernetes endpoints are one.",
    "Staleness costs errors: measured, a 30 s TTL and 30 s client cache sent a dead instance traffic for **50 s (500 errors)**; 5 s timers, **50 errors**.",
    "**Passive outlier ejection** cut the same failure to **4 errors** without changing timers; use it with active health checks.",
    "A **sidecar** moves networking — mTLS, retries, timeouts, telemetry — out of every language's code; a **mesh** manages all sidecars from a **control plane**.",
    "Retries **multiply across layers**: measured, 3 retrying layers made **27** backend calls per request, 4 made **81**; a **10% retry budget** kept it near **1**.",
    "Retry in **one** layer, with a budget and jitter; let the others pass errors through.",
    "**Propagate deadlines**: measured, failure came at **350 ms instead of 800 ms**, with **no orphaned work**.",
    "A mesh pays off with many services and languages and strict security; with a few services, a gateway and a client library are simpler."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What is the difference between an API gateway and a load balancer?",
        options: ["They are the same thing", "A load balancer spreads traffic across instances of a service; a gateway is the front door for many services, adding auth, rate limits, routing and aggregation", "A gateway only handles internal traffic", "A load balancer authenticates users"],
        answer: 1,
        why: "Load balancers distribute requests among instances. A gateway routes external requests to many services and applies cross-cutting policy. Gateways handle north–south traffic, and load balancers generally do not authenticate end users." },

      { stem: "An instance crashes and clients keep getting errors from it for almost a minute. Which change helps most without adding registry load?",
        options: ["Increase the number of instances", "Passive outlier ejection in the client or sidecar: stop sending to an instance after a few consecutive failures", "Increase the registry TTL", "Disable health checks"],
        answer: 1,
        why: "Outlier ejection reacts to real failures within a few requests — four errors instead of 500 in the simulation — without changing heartbeat or refresh rates. More instances only dilute the errors, a longer TTL makes it worse, and disabling health checks removes the protection entirely." },

      { stem: "The client library, the sidecar and the gateway each retry failed calls 3 times. The backend goes down. How many backend calls can one user request cause?",
        options: ["3", "9", "27", "Unlimited"],
        answer: 2,
        why: "Each layer retries the whole of the layer below: 3 × 3 × 3 = 27, as measured. Retries in one layer would give 3; two layers 9. The count is bounded, but a 27-fold amplification is enough to keep a recovering backend down." },

      { stem: "What does deadline propagation achieve in a call chain?",
        options: ["It makes every call faster", "Each hop knows the time left for the whole request, so it can refuse work that cannot finish in time and stop work the user has abandoned", "It removes the need for timeouts", "It retries calls automatically"],
        answer: 1,
        why: "Passing an absolute deadline lets every hop make the same decision the gateway will: in the exercise the slow call was refused at once, the user heard back at 350 ms instead of 800 ms, and no orphaned work ran. It does not speed up calls, replace timeouts, or retry anything." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Be ready to say what each component costs, not just what it does.",
    questions: [
      { level: "core",
        q: "What does an API gateway do, and how do you stop it becoming a bottleneck or single point of failure?",
        strong: "A strong answer lists responsibilities, keeps business logic out, and covers availability and state.",
        answer: [
          { t: "p", text: "It is the single entry point for external clients: TLS termination, authentication, rate limiting and quotas, routing to services, request and response shaping, and sometimes aggregation per client type as a backend for frontend. It decouples clients from the internal service layout." },
          { t: "p", text: "To keep it from becoming a bottleneck, it stays thin — no business logic — and stateless, with counters and sessions in shared stores. It runs as many instances behind a load balancer across zones, is load-tested and capacity-planned like any critical service, and changes to it are reviewed and rolled out carefully, with canaries." }
        ] },

      { level: "advanced",
        q: "What is a service mesh, and when would you adopt one?",
        strong: "A strong answer explains data plane and control plane, the benefits, and the costs.",
        answer: [
          { t: "p", text: "A sidecar proxy beside every service instance forms the data plane: it handles mTLS, retries, timeouts, circuit breaking, load balancing and telemetry for all traffic in and out. A control plane distributes configuration, routing rules and certificates to the proxies, giving uniform policy and identity across services in any language." },
          { t: "p", text: "I would adopt one with many services in several languages, a zero-trust requirement for service identity and encryption, and a need for traffic shifting and per-call observability. The costs are per-pod resources, extra latency per hop, a complex control plane to operate, and policy pitfalls such as retries configured in several layers. For a few services in one language, a client library and a gateway are usually enough." }
        ] },

      { level: "core",
        q: "Client-side or server-side service discovery?",
        strong: "A strong answer contrasts the two and names how failures are detected.",
        answer: [
          { t: "p", text: "Client-side: the caller, or its sidecar, fetches the instance list from the registry and balances across it — no extra hop, smarter balancing, but discovery logic in every client or a mesh. Server-side: the caller hits a load balancer or a Kubernetes Service address, which knows the instances — simpler clients, one more hop." },
          { t: "p", text: "Either way, dead instances are removed by heartbeat TTLs and active health checks, and passive outlier detection on real traffic covers the gap between a crash and the registry noticing, which otherwise lasts as long as the TTL plus the client's cache interval." }
        ] }
    ]
  }
});
