/* ============================================================================
   LESSON 10.1 — Monolith, Modular Monolith, Microservices
   ========================================================================= */
EC.receiveLesson({
  id: "10.1",

  lede: "The most consequential architecture decision is how many separately deployed pieces a system has. A **monolith** is one deployable; **microservices** are many, each owning its data and deployed on its own; the **modular monolith** sits between, one deployable with boundaries inside it as strict as service boundaries. Splitting buys independent deploys, independent scaling and fault isolation, and it pays with every function call that becomes a network call — measured here at **thousands of times slower**, less available, and harder to change consistently. Most teams should start modular and split only where a boundary has earned it. The worst outcome is the **distributed monolith**: all of the costs, none of the benefits.",

  objectives: [
    "Measure the cost of turning a function call into a network call",
    "Compute what a chain of synchronous services does to availability and latency",
    "Choose between monolith, modular monolith and microservices from team and domain, not fashion",
    "Recognise a distributed monolith and its causes",
    "Enforce module boundaries inside a monolith with an automated check"
  ],

  prerequisites: ["9.2", "7.2"],

  blocks: [

    { t: "h2", n: "01", id: "spectrum", text: "Three shapes",
      sub: "How many things do you deploy, and where are the boundaries?" },

    { t: "diagram", kind: "compare", title: "Monolith, modular monolith, microservices",
      caption: "The difference that matters is not size but boundaries and deployment. A monolith without internal boundaries degrades into a big ball of mud; a modular monolith keeps the boundaries and one deployment; microservices make every boundary a network and deployment boundary too.",
      columns: [
        { title: "Monolith", tone: "accent", items: ["one deployable, one database", "calls are function calls", "one transaction across everything", "simple to run, debug and test", "boundaries erode without discipline"] },
        { title: "Modular monolith", tone: "good", items: ["one deployable, strict modules", "modules talk through public APIs", "each module owns its tables", "boundaries checked in CI", "a module can be extracted later"] },
        { title: "Microservices", tone: "violet", items: ["many deployables, data per service", "calls cross the network", "no cross-service transactions", "deploy and scale each alone", "needs platform and observability"] }
      ] },

    { t: "h2", n: "02", id: "cost", text: "What a boundary costs when it becomes a network",
      sub: "The same function, in process and behind HTTP" },

    { t: "p", text: "Moving code into another service turns a function call into a network request: serialisation, a socket, a server, parsing, and a reply. Measured on one machine, with no real network at all:" },

    { t: "code", lang: "python", title: "hop.py — one function, called directly and over HTTP on localhost", code: `import http.client, json, statistics, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

def price(sku): return {"sku": sku, "pence": 1999}         # the same work, in process or behind HTTP

class PriceHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps(price(self.path.rsplit("/", 1)[-1])).encode()
        self.send_response(200); self.send_header("Content-Length", str(len(body))); self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args): pass

server = ThreadingHTTPServer(("127.0.0.1", 0), PriceHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
port = server.server_address[1]

def timed(fn, n):
    samples = []
    for i in range(n):
        start = time.perf_counter(); fn(i); samples.append((time.perf_counter() - start) * 1e6)
    samples.sort()
    return statistics.median(samples), samples[int(n * 0.99)]

conn = http.client.HTTPConnection("127.0.0.1", port)          # one kept-alive connection
def over_http(i):
    conn.request("GET", f"/price/sku-{i}"); json.loads(conn.getresponse().read())

for label, fn, n in (("function call", lambda i: price(f"sku-{i}"), 100_000),
                     ("HTTP + JSON, same machine", over_http, 2_000)):
    p50, p99 = timed(fn, n)
    print(f"{label:<26} median {p50:9.1f} µs   p99 {p99:9.1f} µs")`,
      hl: [4, 25, 26],
      out: `function call              median       0.2 µs   p99       0.4 µs
HTTP + JSON, same machine  median     629.0 µs   p99     911.9 µs` },

    { t: "p", text: "The direct call took a fraction of a microsecond; the same work over HTTP on the **same machine** took around 0.6 ms — roughly **3,000 times** longer, before adding a real network's half a millisecond or more per round trip inside a data centre. That is affordable for one call per request and ruinous for a loop that used to make hundreds of them. Latency is only the first cost. Each remote call can also **fail independently**, and callers must now handle timeouts, retries and idempotency (7.1, 6.3) for something that used to be a function." },

    { t: "p", text: "Chain those calls synchronously — the API calls orders, which calls pricing, which calls catalog — and the costs compound. A simulation of requests passing through 1 to 20 services in sequence, each **99.9% available** with a realistic latency tail:" },

    { t: "code", lang: "python", title: "chainsim.py — availability and latency of a synchronous chain", code: `import random

def service_call(rng):
    """One downstream call: 99.9% available; latency median ~5 ms with a long tail."""
    if rng.random() < 0.001: return None
    return rng.lognormvariate(1.6, 0.6)                     # ms

def request(rng, hops):
    """A request that must call \`hops\` services one after another (a synchronous chain)."""
    total = 0.0
    for _ in range(hops):
        ms = service_call(rng)
        if ms is None: return None
        total += ms
    return total

rng = random.Random(5)
print(f"{'services in the chain':>22} {'success':>9} {'p50':>8} {'p99':>8}")
for hops in (1, 3, 5, 10, 20):
    results = [request(rng, hops) for _ in range(100_000)]
    ok = sorted(r for r in results if r is not None)
    print(f"{hops:>22} {len(ok) / len(results):>9.2%} {ok[len(ok) // 2]:>6.1f}ms {ok[int(len(ok) * 0.99)]:>6.1f}ms")`,
      hl: [5, 11, 13],
      out: ` services in the chain   success      p50      p99
                     1    99.89%    4.9ms   19.8ms
                     3    99.71%   16.6ms   39.0ms
                     5    99.51%   28.4ms   56.1ms
                    10    99.00%   57.9ms   94.2ms
                    20    98.03%  117.3ms  165.8ms` },

    { t: "viz", title: "Latency of one request, by the number of services it waits on",
      caption: "Each service is individually fine: 99.9% available, a 5 ms median. A request that waits on twenty of them in sequence has a 117 ms median and a 166 ms p99, and fails about 2% of the time — 0.999 to the twentieth power is 98.0%. Availability multiplies down and latency adds up along every synchronous chain.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">0 ms</text>
<line x1="64" y1="180.0" x2="610" y2="180.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="184.0" text-anchor="end" class="s-sub">45 ms</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">90 ms</text>
<line x1="64" y1="72.0" x2="610" y2="72.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="76.0" text-anchor="end" class="s-sub">135 ms</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">180 ms</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub">1</text>
<text x="200.5" y="252" text-anchor="middle" class="s-sub">3</text>
<text x="337.0" y="252" text-anchor="middle" class="s-sub">5</text>
<text x="473.5" y="252" text-anchor="middle" class="s-sub">10</text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub">20</text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">services called one after another</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">latency of the whole request</text>
<polyline points="64.0,210.2 200.5,187.2 337.0,166.7 473.5,121.0 610.0,35.0" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="210.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="200.5" cy="187.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="337.0" cy="166.7" r="3.6" style="fill:var(--crit)"/>
<circle cx="473.5" cy="121.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="35.0" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">p99</text>
<polyline points="64.0,228.1 200.5,214.1 337.0,199.9 473.5,164.5 610.0,93.2" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="228.1" r="3.6" style="fill:var(--accent)"/>
<circle cx="200.5" cy="214.1" r="3.6" style="fill:var(--accent)"/>
<circle cx="337.0" cy="199.9" r="3.6" style="fill:var(--accent)"/>
<circle cx="473.5" cy="164.5" r="3.6" style="fill:var(--accent)"/>
<circle cx="610.0" cy="93.2" r="3.6" style="fill:var(--accent)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">median</text>
</svg>` },

    { t: "callout", kind: "insight", title: "Shorten the synchronous chain",
      body: [
        { t: "p", text: "The repairs come from earlier modules. Call independent services **in parallel** rather than in sequence (1.2). Answer from **local data** kept up to date by events (6.2) rather than asking another service at request time. Move work that need not finish before the response **onto a queue** (6.1). Each turns a link in the chain from \"must be up and fast right now\" into \"will catch up\"." }
      ] },

    { t: "h2", n: "03", id: "distributed-monolith", text: "The distributed monolith",
      sub: "All the costs of microservices, none of the benefits" },

    { t: "p", text: "The failure mode of a microservices migration is a system that is deployed as many services but behaves as one: services that **share a database schema**, call each other **synchronously** for every request, and must be **released together** because a change to one breaks the others. It has the network costs measured above, and still cannot deploy, scale or fail independently." },

    { t: "viz", title: "A distributed monolith, and services with real boundaries",
      caption: "Left: five services reach into one shared database and call each other synchronously, so a schema change or a slow service affects all of them. Right: each service owns its data, the gateway is the only synchronous entry point, and services learn about each other's changes from an event stream, so each can be deployed, scaled and broken on its own.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Distributed monolith and bounded services">
<defs><marker id="dm-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<text x="185" y="18" text-anchor="middle" class="s-label" style="fill:var(--crit)">Distributed monolith</text>
<line x1="185" y1="55" x2="313" y2="121" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="185" y1="55" x2="264" y2="227" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="185" y1="55" x2="106" y2="227" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="313" y1="121" x2="264" y2="227" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="313" y1="121" x2="106" y2="227" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="313" y1="121" x2="57" y2="121" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="264" y1="227" x2="106" y2="227" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="264" y1="227" x2="57" y2="121" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="106" y1="227" x2="57" y2="121" style="stroke:var(--crit)" stroke-width="1.3"/>
<line x1="185" y1="69" x2="185" y2="129" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.3"/>
<line x1="313" y1="135" x2="208" y2="141" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.3"/>
<line x1="264" y1="241" x2="199" y2="160" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.3"/>
<line x1="106" y1="241" x2="171" y2="160" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.3"/>
<line x1="57" y1="135" x2="162" y2="141" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.3"/>
<rect x="141.0" y="41.0" width="88" height="28" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/><text x="185.0" y="59.0" text-anchor="middle" class="s-mono">orders</text>
<rect x="269.3926296998457" y="106.64338553438" width="88" height="28" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/><text x="313.3926296998457" y="124.64338553438" text-anchor="middle" class="s-mono">billing</text>
<rect x="220.35100905948389" y="212.85661446562" width="88" height="28" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/><text x="264.3510090594839" y="230.85661446562" text-anchor="middle" class="s-mono">catalog</text>
<rect x="61.64899094051614" y="212.85661446562" width="88" height="28" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/><text x="105.64899094051614" y="230.85661446562" text-anchor="middle" class="s-mono">shipping</text>
<rect x="12.607370300154258" y="106.64338553438" width="88" height="28" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/><text x="56.60737030015426" y="124.64338553438" text-anchor="middle" class="s-mono">users</text>
<path d="M150.0 138 v22 a35.0 6 0 0 0 70 0 v-22" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/><ellipse cx="185" cy="138" rx="35.0" ry="6" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/><text x="185" y="158" text-anchor="middle" class="s-sub">shared DB</text>
<text x="185" y="286" text-anchor="middle" class="s-sub" style="fill:var(--crit)">sync calls everywhere, one schema: release and fail together</text>
<line x1="380" y1="28" x2="380" y2="290" style="stroke:var(--line);stroke-dasharray:4 4"/>
<text x="575" y="18" text-anchor="middle" class="s-label" style="fill:var(--good)">Services with boundaries</text>
<rect x="515" y="34" width="120" height="30" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="575.0" y="53.0" text-anchor="middle" class="s-mono">gateway</text>
<line x1="575" y1="64" x2="440" y2="92" style="stroke:var(--ink-3)" stroke-width="1.3" marker-end="url(#dm-a)"/>
<rect x="400" y="94" width="80" height="30" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="440.0" y="113.0" text-anchor="middle" class="s-mono">orders</text>
<line x1="440" y1="124" x2="440" y2="142" style="stroke:var(--ink-3)" stroke-width="1.3"/>
<path d="M412.0 148 v22 a28.0 6 0 0 0 56 0 v-22" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><ellipse cx="440" cy="148" rx="28.0" ry="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><text x="440" y="168" text-anchor="middle" class="s-sub">own data</text>
<line x1="575" y1="64" x2="528" y2="92" style="stroke:var(--ink-3)" stroke-width="1.3" marker-end="url(#dm-a)"/>
<rect x="488" y="94" width="80" height="30" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="528.0" y="113.0" text-anchor="middle" class="s-mono">billing</text>
<line x1="528" y1="124" x2="528" y2="142" style="stroke:var(--ink-3)" stroke-width="1.3"/>
<path d="M500.0 148 v22 a28.0 6 0 0 0 56 0 v-22" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><ellipse cx="528" cy="148" rx="28.0" ry="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><text x="528" y="168" text-anchor="middle" class="s-sub">own data</text>
<line x1="575" y1="64" x2="616" y2="92" style="stroke:var(--ink-3)" stroke-width="1.3" marker-end="url(#dm-a)"/>
<rect x="576" y="94" width="80" height="30" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="616.0" y="113.0" text-anchor="middle" class="s-mono">catalog</text>
<line x1="616" y1="124" x2="616" y2="142" style="stroke:var(--ink-3)" stroke-width="1.3"/>
<path d="M588.0 148 v22 a28.0 6 0 0 0 56 0 v-22" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><ellipse cx="616" cy="148" rx="28.0" ry="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><text x="616" y="168" text-anchor="middle" class="s-sub">own data</text>
<line x1="575" y1="64" x2="704" y2="92" style="stroke:var(--ink-3)" stroke-width="1.3" marker-end="url(#dm-a)"/>
<rect x="664" y="94" width="80" height="30" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="704.0" y="113.0" text-anchor="middle" class="s-mono">shipping</text>
<line x1="704" y1="124" x2="704" y2="142" style="stroke:var(--ink-3)" stroke-width="1.3"/>
<path d="M676.0 148 v22 a28.0 6 0 0 0 56 0 v-22" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><ellipse cx="704" cy="148" rx="28.0" ry="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><text x="704" y="168" text-anchor="middle" class="s-sub">own data</text>
<rect x="400" y="206" width="344" height="26" rx="13" style="fill:var(--violet);fill-opacity:.12;stroke:var(--violet)"/>
<text x="572" y="223" text-anchor="middle" class="s-sub" style="fill:var(--violet)">event stream: OrderPlaced, PaymentTaken, ...</text>
<line x1="440" y1="178" x2="440" y2="204" style="stroke:var(--violet);stroke-dasharray:4 3" stroke-width="1.3"/>
<line x1="528" y1="178" x2="528" y2="204" style="stroke:var(--violet);stroke-dasharray:4 3" stroke-width="1.3"/>
<line x1="616" y1="178" x2="616" y2="204" style="stroke:var(--violet);stroke-dasharray:4 3" stroke-width="1.3"/>
<line x1="704" y1="178" x2="704" y2="204" style="stroke:var(--violet);stroke-dasharray:4 3" stroke-width="1.3"/>
<text x="575" y="286" text-anchor="middle" class="s-sub" style="fill:var(--good)">own data, events between them: deploy alone, fail alone</text>
</svg>` },

    { t: "dl", items: [
      { term: "Shared database", def: "Two services writing the same tables are one service with two deploy pipelines: neither can change the schema alone. Each service owns its data; others get it through an API or events (6.4's CDC)." },
      { term: "Synchronous call chains", def: "A request that needs five services up at once is only as available as their product. Prefer events and local copies for data another service owns." },
      { term: "Lockstep releases", def: "If services must deploy together, the boundary is in the wrong place, or contracts are not versioned. Version APIs and events, and make consumers tolerate unknown fields." },
      { term: "Shared domain libraries", def: "A common library of domain models (9.2's incident) couples every service to every model change." },
      { term: "Entity services", def: "Splitting by noun — an OrderService, a CustomerService with CRUD endpoints — instead of by business capability makes every use case a chatty conversation between them (10.2)." }
    ] },

    { t: "h2", n: "04", id: "choose", text: "Choosing",
      sub: "Team shape first, then domain, then scale" },

    { t: "p", text: "Microservices are mainly an **organisational** tool: they let many teams deploy without coordinating. **Conway's law** says systems mirror the communication structure of the organisation that builds them, so service boundaries that do not match team boundaries produce constant cross-team negotiation. The inverse Conway manoeuvre deliberately shapes teams around the architecture you want. Technical scale is a weaker reason than it sounds — a well-built monolith runs behind a load balancer on many machines (2.1)." },

    { t: "diagram", kind: "matrix", title: "A starting point, by engineering team size",
      caption: "A heuristic, not a rule. Strong reasons to split earlier: a component with very different scaling or availability needs, a different technology, regulatory isolation (payments, health data), or a separate team that genuinely needs its own release cadence.",
      cols: ["Shape", "Why", "Watch for"],
      rows: ["Under 10 engineers", "10–30 engineers", "30–100 engineers", "Over 100 engineers"],
      cells: [
        [{ text: "monolith, modular inside", tone: "good" }, { text: "fastest to change" }, { text: "modules eroding", tone: "warn" }],
        [{ text: "modular monolith", tone: "good" }, { text: "teams own modules" }, { text: "merge-queue contention", tone: "warn" }],
        [{ text: "services per domain", tone: "accent" }, { text: "teams deploy alone" }, { text: "distributed monolith", tone: "crit" }],
        [{ text: "platform + services + cells", tone: "violet" }, { text: "isolation, autonomy" }, { text: "platform cost", tone: "warn" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "Why the modular monolith is usually the right first answer",
      body: [
        { t: "p", text: "It keeps the cheap things cheap — function calls, one transaction, one deploy, one place to debug — while building the one thing that makes a later split possible: **boundaries that hold**. Shopify runs one of the largest Ruby on Rails monoliths as a modular monolith with enforced component boundaries. When a module later needs to become a service, it already has a public API and owns its tables, so extraction is a deployment change rather than a redesign — the strangler fig of 10.6. Splitting first and discovering the boundaries later is the expensive order." }
      ] },

    { t: "callout", kind: "trap", title: "\"We'll use microservices so we can scale\"",
      body: [
        { t: "p", text: "A stateless monolith already scales horizontally. What microservices add is scaling **parts** separately — useful when one component needs a hundred machines and the rest need three — and team autonomy. They also add a network call per boundary, distributed transactions (5.4), eventual consistency, versioned contracts, distributed tracing, and a platform team to run it all. Ask which specific component needs independent scaling, deployment or isolation, and split that one." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Keep a modular monolith modular",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A modular monolith's boundaries erode one convenient import at a time. Write an **architecture fitness function**: a check that runs in CI, parses every file's imports, and fails if one module imports another module's internals instead of its public `api`. Also report the module-level dependency graph and any cycles between modules. Run it on a three-module shop that has two violations hidden in it." }
      ],
      requirements: [
        "Parse imports with the ast module, not regular expressions",
        "Allow imports within a module and of another module's api",
        "Report each violation with file, line and the internal module imported",
        "Report module dependencies and any two-way cycles"
      ],
      hint: "For each file, its module is the second path component (shop/<module>/...). For each import, the imported module is the second dotted component and the third must be api.",
      solution: { lang: "python", title: "boundaries_ex.py",
        code: `import ast, pathlib, tempfile

FILES = {                                                  # a modular monolith: one deployable, three modules
    "shop/orders/api.py":     "from shop.orders.service import place_order\\n",
    "shop/orders/service.py": "from shop.billing.api import charge\\nfrom shop.catalog.db import PRODUCTS\\nfrom shop.orders import models\\n",
    "shop/orders/models.py":  "class Order: ...\\n",
    "shop/billing/api.py":    "from shop.billing.ledger import charge\\n",
    "shop/billing/ledger.py": "from shop.orders.models import Order\\nimport shop.catalog.api\\n",
    "shop/catalog/api.py":    "from shop.catalog.db import PRODUCTS\\n",
    "shop/catalog/db.py":     "PRODUCTS = {}\\n",
}

def check(root):
    """Rule: code in one module may import another module only through its public \`api\`."""
    violations, edges = [], set()
    for path in sorted(root.rglob("*.py")):
        here = path.relative_to(root).parts[1]                     # shop/<module>/file.py
        for node in ast.walk(ast.parse(path.read_text())):
            if isinstance(node, ast.ImportFrom): names = [node.module or ""]
            elif isinstance(node, ast.Import): names = [alias.name for alias in node.names]
            else: continue
            for name in names:
                parts = name.split(".")
                if parts[0] != "shop" or len(parts) < 2 or parts[1] == here: continue
                edges.add((here, parts[1]))
                if parts[2:3] != ["api"]:
                    violations.append(f"{path.relative_to(root)}:{node.lineno} imports {name} (internal to {parts[1]})")
    cycles = sorted({tuple(sorted((a, b))) for a, b in edges if (b, a) in edges})
    return violations, sorted(edges), cycles

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    for rel, text in FILES.items():
        (root / rel).parent.mkdir(parents=True, exist_ok=True); (root / rel).write_text(text)
    violations, edges, cycles = check(root)
    print("module dependencies:", ", ".join(f"{a} -> {b}" for a, b in edges))
    print("boundary violations:", *violations or ["none"], sep="\\n  ")
    print("cycles between modules:", ", ".join(" <-> ".join(c) for c in cycles) or "none")`,
        out: `module dependencies: billing -> catalog, billing -> orders, orders -> billing, orders -> catalog
boundary violations:
  shop/billing/ledger.py:1 imports shop.orders.models (internal to orders)
  shop/orders/service.py:2 imports shop.catalog.db (internal to catalog)
cycles between modules: billing <-> orders`,
        notes: [
          { t: "p", text: "Two imports bypassed public APIs: billing reached into the orders model, and orders read the catalog's storage directly. The first also created a cycle: orders depends on billing and billing on orders, which means neither could ever be extracted alone. The fix is for billing to receive what it needs from orders as data, or to react to an OrderPlaced event." },
          { t: "p", text: "Tools do this in production: import-linter for Python, ArchUnit for Java, Packwerk at Shopify for Ruby, dependency-cruiser for JavaScript. Run them in CI so the boundary is enforced by the build, not by code review." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: forty services that had to deploy on the same night",
      body: [
        { t: "p", text: "**Symptom.** Two years into a migration from a monolith, a company had forty services and deployed them all together in a fortnightly release window. A one-line change to the order status field needed changes in eleven services, and a release was rolled back because one of them was missed. Checkout latency had tripled." },
        { t: "p", text: "**Mechanism.** The monolith had been split by entity — users, orders, products, carts — and every service still read and wrote the original shared database. Use cases spanned many services, so checkout made fourteen synchronous calls. The architecture had microservices' network costs and the monolith's coupling: a distributed monolith." },
        { t: "p", text: "**Fix.** The teams re-drew boundaries around business capabilities — checkout, fulfilment, catalogue, accounts (10.2) — merging several entity services back together, gave each its own schema with data shared through events and CDC, versioned the events, and made each service deployable alone. Checkout's synchronous calls fell from fourteen to three, and release windows were abolished." }
      ] }
  ],

  takeaways: [
    "The decision is how many **separately deployed** pieces, and where the **boundaries** are — not code size.",
    "A boundary that becomes a network costs: measured, a local HTTP call took **~0.6 ms** against **~0.2 µs** for the function — **~3,000×** — before any real network.",
    "Synchronous chains compound: measured, twenty services at **99.9%** each gave **98.0%** success and a **166 ms** p99.",
    "Shorten chains with **parallel calls, local copies fed by events, and queues**.",
    "A **distributed monolith** — shared database, synchronous chains, lockstep releases — has every cost of microservices and none of the benefits.",
    "Microservices are mainly an **organisational** tool; **Conway's law** means boundaries should match teams and business capabilities.",
    "Start with a **modular monolith**: cheap calls and transactions, plus boundaries that make a later split a deployment change.",
    "Split a component out when it has a concrete need — independent scaling, deployment cadence, technology or isolation.",
    "Enforce module boundaries with an **automated fitness function** in CI — measured, two violations and a cycle found in a three-module shop."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A request passes synchronously through 10 services, each 99.9% available. Roughly what is the request's availability?",
        options: ["99.9%", "99.0%", "90%", "99.99%"],
        answer: 1,
        why: "Availabilities multiply along a chain where every service must succeed: 0.999¹⁰ ≈ 0.990, and the simulation measured 99.00%. 99.9% would hold only if failures never coincided with requests through the others; 90% would need each at 99%; 99.99% is better than any single service." },

      { stem: "Which is the clearest sign of a distributed monolith?",
        options: ["Services written in different languages", "Several services read and write the same database tables and must be released together", "More than ten services", "An API gateway in front of the services"],
        answer: 1,
        why: "Shared tables and lockstep releases mean the services cannot change or deploy independently — the coupling of a monolith with the costs of a network. Language diversity, service count and a gateway say nothing about coupling." },

      { stem: "Why is a modular monolith often a better first step than microservices?",
        options: ["It cannot scale, so it is cheaper", "It keeps function calls and transactions while building enforced boundaries, so a module can be extracted later without a redesign", "It avoids the need for module boundaries", "It requires no database"],
        answer: 1,
        why: "The modular monolith keeps in-process calls, single transactions and one deployment, and develops the boundaries that make later extraction cheap. It scales horizontally like any stateless monolith, its whole point is boundaries, and it has a database — one schema with tables owned per module." },

      { stem: "A team wants microservices \"so the system can scale\". What should you ask first?",
        options: ["Which programming language they prefer", "Which specific component needs to scale, deploy or fail independently of the rest, and why a horizontally scaled monolith is not enough", "How many services they plan to create", "Whether they will use Kubernetes"],
        answer: 1,
        why: "A stateless monolith already scales horizontally. The case for splitting is a concrete part with different scaling, release or isolation needs, or teams that need autonomy. Language, service counts and orchestration platforms are implementation details that follow from that answer." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "This question is asked to hear trade-offs, not a preference.",
    questions: [
      { level: "core",
        q: "When would you choose a modular monolith over microservices?",
        strong: "A strong answer reasons from team size, domain maturity and operational capacity, and names the costs of distribution.",
        answer: [
          { t: "p", text: "By default for a small or medium team, a young product whose domain boundaries are still moving, or an organisation without a platform for deploying, observing and securing many services. The modular monolith keeps in-process calls and single transactions and is far simpler to run, while enforced module boundaries — each module owning its tables and exposing an API, checked in CI — keep later extraction cheap." },
          { t: "p", text: "I would move a module out when it has a concrete reason: very different scaling, a separate team needing its own release cadence, a different technology, or isolation for compliance or blast radius. Every split costs a network call per boundary, eventual consistency instead of transactions, and versioned contracts, so I want the benefit to be specific." }
        ] },

      { level: "advanced",
        q: "What is a distributed monolith, and how do you get out of one?",
        strong: "A strong answer names the symptoms, the root causes, and a stepwise repair.",
        answer: [
          { t: "p", text: "Services that are deployed separately but cannot change separately: they share database tables, call each other synchronously for every request, and must be released together. Usually the cause is splitting by entity rather than business capability, keeping the shared database, and unversioned contracts." },
          { t: "p", text: "The repair: redraw boundaries around capabilities and merge services that always change together; give each service its own schema, moving shared reads to events or CDC-fed local copies; version APIs and events and make consumers tolerant; replace synchronous chains with events where the data can be slightly stale; and verify independent deployability with contract tests, until release trains are unnecessary." }
        ] },

      { level: "core",
        q: "How does Conway's law affect architecture decisions?",
        strong: "A strong answer applies it in both directions.",
        answer: [
          { t: "p", text: "Systems end up mirroring the communication structure of the teams that build them. If a service is owned by three teams, it becomes a negotiation; if one team owns pieces of five services, it ships slowly. So I align service or module boundaries with team ownership and business capabilities." },
          { t: "p", text: "The inverse Conway manoeuvre uses it deliberately: to get loosely coupled domain services, first form small teams that each own one domain end to end, including its data, and the architecture tends to follow." }
        ] }
    ]
  }
});
