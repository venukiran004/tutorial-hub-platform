/* ============================================================================
   LESSON 1.3 — Proxies, Load Balancers and Gateways
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "Four boxes sit between a client and your code, and interviewers ask you to tell them apart: the reverse proxy, the load balancer, the API gateway and the service mesh. They are not four different things so much as **one thing with progressively more knowledge** — a reverse proxy that also spreads load is a load balancer; one that also understands users and policy is a gateway. **What a box can do is set by what it can see**, and that is decided by whether it reads only the connection or the whole request.",

  objectives: [
    "Distinguish a forward proxy from a reverse proxy by whose side it is on",
    "Place the reverse proxy, load balancer, API gateway and service mesh on one progression",
    "Explain what a layer-4 box can see and a layer-7 box can see, and what each can therefore do",
    "Decide where TLS terminates and say what that costs and buys",
    "Assign a list of requirements to the box that should own each one"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", id: "forward-reverse", text: "Forward and reverse: whose side is it on?",
      sub: "Same mechanism, opposite clients" },

    { t: "p", text: "A proxy is anything that receives a request and makes another one on the sender's behalf. The only question that separates the two kinds is **which party configured it**, and therefore which party it protects." },

    { t: "viz", title: "A forward proxy guards clients; a reverse proxy guards servers",
      caption: "Top: the clients chose the proxy — the destination sees the proxy's address, not theirs. Bottom: the servers chose it — clients see one address and never learn how many machines are behind it.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Forward proxy and reverse proxy">
  <defs><marker id="fr-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <text x="16" y="20" class="s-label" style="fill:var(--accent)">FORWARD PROXY — configured by the clients' organisation</text>
  <rect x="16" y="34" width="90" height="26" rx="6" class="s-fill s-stroke"/><text x="61" y="51" text-anchor="middle" class="s-sub">laptop</text>
  <rect x="16" y="66" width="90" height="26" rx="6" class="s-fill s-stroke"/><text x="61" y="83" text-anchor="middle" class="s-sub">laptop</text>
  <rect x="16" y="98" width="90" height="26" rx="6" class="s-fill s-stroke"/><text x="61" y="115" text-anchor="middle" class="s-sub">laptop</text>
  <line x1="106" y1="47" x2="196" y2="72" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#fr-a)"/>
  <line x1="106" y1="79" x2="196" y2="79" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#fr-a)"/>
  <line x1="106" y1="111" x2="196" y2="86" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#fr-a)"/>
  <rect x="198" y="54" width="150" height="50" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="273" y="76" text-anchor="middle" class="s-label">Forward proxy</text>
  <text x="273" y="93" text-anchor="middle" class="s-sub">egress filter · cache · VPN</text>
  <line x1="348" y1="79" x2="470" y2="79" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#fr-a)"/>
  <text x="409" y="70" text-anchor="middle" class="s-sub">internet</text>
  <rect x="472" y="54" width="150" height="50" rx="9" class="s-fill s-stroke"/>
  <text x="547" y="76" text-anchor="middle" class="s-label">any website</text>
  <text x="547" y="93" text-anchor="middle" class="s-sub">sees the proxy's IP</text>

  <text x="16" y="150" class="s-label" style="fill:var(--good)">REVERSE PROXY — configured by the servers' owner</text>
  <rect x="16" y="176" width="150" height="50" rx="9" class="s-fill s-stroke"/>
  <text x="91" y="198" text-anchor="middle" class="s-label">any client</text>
  <text x="91" y="215" text-anchor="middle" class="s-sub">sees one address</text>
  <line x1="166" y1="201" x2="290" y2="201" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#fr-a)"/>
  <text x="228" y="192" text-anchor="middle" class="s-sub">internet</text>
  <rect x="292" y="176" width="160" height="50" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="372" y="198" text-anchor="middle" class="s-label">Reverse proxy</text>
  <text x="372" y="215" text-anchor="middle" class="s-sub">TLS · routing · cache · WAF</text>
  <line x1="452" y1="196" x2="560" y2="168" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#fr-a)"/>
  <line x1="452" y1="201" x2="560" y2="201" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#fr-a)"/>
  <line x1="452" y1="206" x2="560" y2="234" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#fr-a)"/>
  <rect x="562" y="156" width="110" height="24" rx="6" class="s-fill s-stroke"/><text x="617" y="172" text-anchor="middle" class="s-sub">app-1 (private)</text>
  <rect x="562" y="189" width="110" height="24" rx="6" class="s-fill s-stroke"/><text x="617" y="205" text-anchor="middle" class="s-sub">app-2 (private)</text>
  <rect x="562" y="222" width="110" height="24" rx="6" class="s-fill s-stroke"/><text x="617" y="238" text-anchor="middle" class="s-sub">app-3 (private)</text>
</svg>` },

    { t: "dl", items: [
      ["Forward proxy — the client's bodyguard", "A company routes all outbound traffic through one so it can filter, log and cache; a VPN is one for anonymity. The destination sees the proxy's address. **System design rarely features it** — it is on the user's side of the internet."],
      ["Reverse proxy — the server's receptionist", "It owns your public address, terminates TLS, compresses, caches, filters attacks, and forwards to servers that stay on private addresses. Every other box in this lesson **is a reverse proxy with more features**. NGINX, HAProxy, Envoy and Cloudflare are all reverse proxies first."]
    ] },

    { t: "h2", n: "02", id: "progression", text: "One box, growing more knowledge",
      sub: "Reverse proxy → load balancer → API gateway, and the mesh beside them" },

    { t: "diagram", kind: "flow", title: "Each box is the previous one plus something it now knows",
      caption: "A load balancer is a reverse proxy that knows about a pool of servers and their health. A gateway is one that knows about users, products and policy. The service mesh moves the same ideas inside the system, one proxy beside every service (10.5).",
      cols: 3,
      nodes: [
        { id: "rp", label: "Reverse proxy", sub: "one address, TLS, cache", tone: "accent" },
        { id: "lb", label: "Load balancer", sub: "a pool, its health", tone: "good" },
        { id: "gw", label: "API gateway", sub: "users, keys, policy", tone: "violet" },
        { id: "sm", label: "Service mesh", sub: "the same, between services", tone: "teal" }
      ],
      edges: [["rp", "lb", "+ pool, health checks"], ["lb", "gw", "+ auth, limits"], ["gw", "sm", "moved inside", "dashed"]] },

    { t: "table",
      head: ["", "Reverse proxy", "Load balancer", "API gateway", "Service mesh"],
      rows: [
        ["Sits in front of", "Your servers", "A pool of identical servers", "All your services, as one front door", "Every service, beside it"],
        ["Knows about", "Upstream addresses", "+ which members are healthy", "+ who the caller is, which product, what quota", "+ every service-to-service call"],
        ["Primary job", "TLS, routing, caching, compression", "Spread load; drop dead members", "Auth, rate limits, routing by API, aggregation", "mTLS, retries, timeouts, telemetry between services"],
        ["Layer", "L4 or L7", "L4 (fast) or L7 (content-aware)", "L7", "L4 and L7"],
        ["Examples", "NGINX, HAProxy, Envoy", "AWS ALB/NLB, HAProxy, NGINX", "Kong, AWS API Gateway, Apigee", "Istio, Linkerd (Envoy sidecars)"],
        ["Traffic direction", "North–south", "North–south (or internal)", "North–south", "East–west"]
      ],
      caption: "North–south is traffic entering and leaving the system; east–west is traffic between services inside it. The gateway is about the first, the mesh about the second — which is the cleanest way to stop confusing them." },

    { t: "h2", n: "03", id: "l4-l7", text: "Layer 4 against layer 7: what the box can see",
      sub: "A connection, or a request" },

    { t: "p", text: "The OSI layer number answers one question: has the box read the HTTP request, or only the TCP connection carrying it? A **layer-4** box sees addresses and ports and forwards bytes it never parses — which makes it extremely fast and lets it carry any protocol. A **layer-7** box terminates TLS, parses the request, and can make decisions on anything in it." },

    { t: "code", lang: "python", title: "l4_l7.py — the same request, seen by each kind of box", code: `import zlib

RAW = (b"GET /api/orders/42 HTTP/1.1\\r\\n"
       b"Host: shop.example.com\\r\\n"
       b"Cookie: session=9f2c; ab_bucket=B\\r\\n"
       b"Authorization: Bearer eyJhbGciOi...\\r\\n"
       b"User-Agent: Mozilla/5.0 (iPhone)\\r\\n\\r\\n")
CONN = {"src_ip": "198.51.100.23", "src_port": 51544, "dst_ip": "203.0.113.10", "dst_port": 443}

def l4_view(conn: dict, payload: bytes) -> dict:
    """A layer-4 balancer sees the connection, and the payload only as opaque bytes."""
    return {**conn, "payload": f"<{len(payload)} bytes, unread>"}

def l7_view(conn: dict, payload: bytes) -> dict:
    """A layer-7 proxy parses the HTTP request (after terminating TLS)."""
    head, _, _ = payload.partition(b"\\r\\n\\r\\n")
    lines = head.decode().split("\\r\\n")
    method, path, _ = lines[0].split(" ")
    headers = dict(l.split(": ", 1) for l in lines[1:])
    cookies = dict(c.split("=") for c in headers["Cookie"].split("; "))
    return {"src_ip": conn["src_ip"], "method": method, "path": path,
            "host": headers["Host"], "session": cookies["session"],
            "ab_bucket": cookies["ab_bucket"], "auth": headers["Authorization"][:12] + "...",
            "device": "mobile" if "iPhone" in headers["User-Agent"] else "desktop"}

def route_l4(v):  # can only hash what it can see
    key = f'{v["src_ip"]}:{v["src_port"]}'.encode()
    return ["app-1", "app-2", "app-3"][zlib.crc32(key) % 3] + "  (by connection hash)"

def route_l7(v):
    if v["path"].startswith("/api/"):   pool = "api-pool"
    elif v["path"].startswith("/static/"): pool = "cdn-origin"
    else:                                pool = "web-pool"
    if v["ab_bucket"] == "B":           pool += "-canary"
    return pool + "  (by path + cookie)"

print("L4 sees:"); [print("   %-10s %s" % kv) for kv in l4_view(CONN, RAW).items()]
print("L7 sees:"); [print("   %-10s %s" % kv) for kv in l7_view(CONN, RAW).items()]
print()
print("L4 routes to:", route_l4(l4_view(CONN, RAW)))
print("L7 routes to:", route_l7(l7_view(CONN, RAW)))`,
      out: `L4 sees:
   src_ip     198.51.100.23
   src_port   51544
   dst_ip     203.0.113.10
   dst_port   443
   payload    <161 bytes, unread>
L7 sees:
   src_ip     198.51.100.23
   method     GET
   path       /api/orders/42
   host       shop.example.com
   session    9f2c
   ab_bucket  B
   auth       Bearer eyJhb...
   device     mobile

L4 routes to: app-3  (by connection hash)
L7 routes to: api-pool-canary  (by path + cookie)`,
      hl: [12, 28, 31, 34],
      caption: "The L4 box can only hash the connection, so the same user may land on different servers on different connections, and it cannot tell an API call from an image. The L7 box routes the API call to the API pool and sends this user to the canary because of a cookie — **and can do so only because it decrypted the request.**" },

    { t: "diagram", kind: "compare", title: "Choosing the layer",
      caption: "A common production shape uses both: an L4 network balancer at the edge for raw throughput and DDoS absorption, in front of L7 proxies that do the routing.",
      columns: [
        { title: "Layer 4 — the connection", tone: "accent", items: [
          "sees: source and destination IP and port",
          "millions of connections, microseconds of overhead",
          "any protocol: HTTP, gRPC, database, game traffic",
          "cannot route by path, header or cookie",
          "TLS passes through untouched (or not at all)",
          "AWS NLB, HAProxy in TCP mode, LVS"
        ] },
        { title: "Layer 7 — the request", tone: "violet", items: [
          "sees: method, path, host, headers, cookies, body",
          "route /api and /static to different pools",
          "canaries, A/B buckets, sticky sessions by cookie",
          "retries, compression, caching, WAF rules",
          "must terminate TLS, which costs CPU",
          "AWS ALB, NGINX, Envoy, HAProxy in HTTP mode"
        ] }
      ] },

    { t: "h2", n: "04", id: "tls", text: "Where TLS ends",
      sub: "Termination, re-encryption and passthrough" },

    { t: "p", text: "An L7 box must decrypt to read the request, so TLS **terminates** there. What happens between it and your servers is a separate decision with three answers:" },

    { t: "diagram", kind: "matrix", title: "Three places TLS can end",
      caption: "Termination at the edge is the default. Re-encryption is what zero-trust networks (12.3) and most compliance regimes now expect. Passthrough is rare: it gives up every L7 feature to keep the proxy blind.",
      cols: ["Client → proxy", "Proxy → server", "Proxy can route on path?", "Cost"],
      rows: ["Terminate at edge", "Re-encrypt (TLS bridging)", "Passthrough (L4)"],
      cells: [
        [{ text: "TLS", tone: "good" }, { text: "plain HTTP", tone: "warn" }, { text: "yes", tone: "good" }, { text: "cheap; plain inside" }],
        [{ text: "TLS", tone: "good" }, { text: "TLS again", tone: "good" }, { text: "yes", tone: "good" }, { text: "costs two handshakes" }],
        [{ text: "TLS", tone: "good" }, { text: "same TLS", tone: "good" }, { text: "no", tone: "crit" }, { text: "keys on servers, no L7" }]
      ] },

    { t: "callout", kind: "insight", title: "Terminating TLS at the edge is also a latency decision",
      body: [
        { t: "p", text: "The TLS handshake costs one or two round trips (1.4). If it terminates at a CDN point of presence 10 ms from the user instead of at an origin 150 ms away, those round trips cost 10 ms each instead of 150. That is why CDNs terminate TLS even for responses they cannot cache — the handshake alone justifies it — and keep a warm, long-lived connection back to the origin." }
      ] },

    { t: "callout", kind: "trap", title: "The single load balancer that took everything down",
      body: [
        { t: "p", text: "Adding a load balancer removes the single point of failure from your app tier and **creates a new one in front of it**. One NGINX instance on one VM is a design where losing one machine takes the whole site offline — exactly what the balancer was introduced to prevent." },
        { t: "p", text: "The balancer must itself be redundant: a pair sharing a floating IP with failover (VRRP, keepalived), several behind DNS or anycast, or a managed balancer that the cloud provider runs across availability zones. In an interview, drawing one balancer box is fine; failing to say it is really several when asked about failure is not." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Put each requirement on the right box",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "A platform has a public API used by partners, a web front end, and twenty internal microservices. The following requirements arrive in one planning meeting. For each, name the box that should own it — CDN, L4 balancer, L7 load balancer, API gateway, service mesh or the application — and say why it belongs there rather than one layer over." },
        { t: "ol", items: [
          "Partners get 1,000 requests per minute per API key; over that, they receive 429",
          "Absorb a 400 Gbit/s volumetric DDoS",
          "Send 5% of web traffic to a canary build, sticky per user",
          "Every call between internal services must be encrypted and authenticated",
          "Reject requests whose order total does not match the sum of its lines",
          "Serve product images with a one-day cache",
          "Retry a failed call from the orders service to the inventory service once, with a 200 ms timeout"
        ] }
      ],
      requirements: [
        "Assign each of the seven requirements to exactly one box",
        "For each, give the information the box needs and confirm it can see it",
        "Identify the requirement that must not live in infrastructure at all",
        "Say which requirement, if put on the gateway, would be a mistake and why"
      ],
      hint: "Ask what each requirement needs to know: a byte count, a cookie, an API key, a service identity, or the meaning of the request body.",
      solution: { lang: "text", title: "assignment.txt",
        code: `1  per-key quota, 429           API GATEWAY      needs the API key and a quota per product
2  400 Gbit/s volumetric DDoS    CDN / L4 edge     needs only packets; must be absorbed before
                                                   anything stateful (or anything you pay per
                                                   request for) sees the traffic
3  5% canary, sticky per user    L7 LOAD BALANCER needs a cookie to keep a user in one bucket
4  encrypted service-to-service  SERVICE MESH     mTLS between sidecars; identity per service
5  total = sum of lines          APPLICATION      needs the meaning of the body: business rule
6  images, one-day cache         CDN              static, cacheable, closest to the user
7  retry inventory once, 200 ms  SERVICE MESH     east-west call policy (or a client library)`,
        notes: [
          { t: "p", text: "The principle behind every line is **put a rule at the lowest layer that can see what it needs** — lower layers are cheaper per request and protect everything above them. A DDoS needs only packets, so it is absorbed at the edge before it can exhaust anything stateful; a canary needs a cookie, so it needs L7; a quota needs an API key, so it needs the gateway." },
          { t: "p", text: "Requirement 5 must stay in the **application**. A gateway can validate that a body is well-formed JSON against a schema, but whether a total matches its lines is a business rule, and business rules in infrastructure config are untested, unversioned with the code, and invisible to the next developer. This is the most common way gateways rot into a second, worse application tier." },
          { t: "p", text: "The tempting mistake is requirement 7 on the gateway. The gateway sees north–south traffic; the orders → inventory call never passes through it. Retries and timeouts between services belong to the mesh or to a shared client library (7.1), and putting them in two places at once gives you retries multiplied by retries — a retry storm (7.1)." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the gateway that became an application",
      body: [
        { t: "p", text: "**Symptom.** Over two years a company's API gateway accumulated 140 custom plugins: request rewriting, field-level validation, response reshaping for mobile clients, discount-code checks and a cache of feature flags. A routine gateway upgrade broke checkout for every mobile user, and the rollback took four hours because nobody could reproduce the plugin chain outside production." },
        { t: "p", text: "**Mechanism.** Business logic had migrated into the one tier that every request passes through, had no unit tests, was deployed separately from the services it belonged to, and was owned by a platform team that did not understand the rules it encoded. The gateway had become the most critical and least tested application in the company, sitting at a single choke point." },
        { t: "p", text: "**Fix.** The rule in section 02's table, enforced: the gateway does **identity, quotas, routing and coarse validation, nothing that requires knowing what an order is**. Mobile response shaping moved to a backend-for-frontend service owned by the mobile team (10.5); discount checks moved into the pricing service; the plugin count went from 140 to 9, and gateway upgrades became boring again." }
      ] }
  ],

  takeaways: [
    "A **forward proxy** is configured by the clients and protects them; a **reverse proxy** is configured by the server owner and protects the servers. System design is almost entirely about the second.",
    "**Every box in the path is a reverse proxy with more knowledge**: + a pool and health = load balancer; + users and policy = API gateway; the same ideas between services = service mesh.",
    "**North–south** traffic enters the system (gateway); **east–west** traffic moves between services (mesh). That one distinction separates the two most-confused boxes.",
    "**Layer 4 sees the connection; layer 7 sees the request.** L4 is faster and protocol-agnostic; L7 can route on path, header and cookie — because it decrypted the request.",
    "Common production shape: **L4 at the edge** for throughput and DDoS absorption, **L7 behind it** for routing.",
    "TLS can **terminate at the edge**, be **re-encrypted** to the servers, or **pass through** untouched; passthrough gives up every L7 feature.",
    "Terminating TLS close to the user is a latency win in its own right: the handshake's round trips become short ones.",
    "**A single load balancer is a new single point of failure.** It must be a redundant pair, a fleet behind DNS or anycast, or a managed multi-zone service.",
    "**Put a rule at the lowest layer that can see what it needs** — and keep business rules out of infrastructure entirely."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You need to send all requests whose path starts with /api/v2 to a new cluster. Which kind of balancer can do this?",
        options: ["A layer-4 balancer, by hashing the destination port", "A layer-7 balancer, after terminating TLS", "Either, since both see the URL", "Neither — this must be done in DNS"],
        answer: 1,
        why: "The path is inside the HTTP request, which is encrypted inside TLS, so only a box that terminates TLS and parses HTTP — layer 7 — can see it. A layer-4 balancer sees addresses and ports, and every HTTPS request arrives on port 443 whatever its path. DNS resolves host names and never sees a path at all." },

      { stem: "What distinguishes an API gateway from a service mesh most cleanly?",
        options: ["The gateway uses Envoy and the mesh does not", "The gateway handles north–south traffic entering the system; the mesh handles east–west traffic between services", "The gateway is layer 4 and the mesh is layer 7", "There is no difference; they are synonyms"],
        answer: 1,
        why: "The gateway is the front door, applying identity, quotas and routing to traffic arriving from outside; the mesh puts a proxy beside every service to govern calls between them. Both commonly use Envoy, so the implementation does not separate them; both operate at layer 7 for HTTP; and they solve different problems, so they are not synonyms." },

      { stem: "A team adds one NGINX load balancer in front of three app servers to remove the single point of failure. What have they actually done?",
        options: ["Removed the single point of failure", "Moved the single point of failure from the app tier to the balancer", "Made the system slower with no benefit", "Required the app servers to be stateful"],
        answer: 1,
        why: "The app tier is now redundant, but every request passes through one NGINX instance on one machine, so losing that machine still takes everything down. The balancer itself must be redundant — a failover pair, several behind DNS or anycast, or a managed multi-zone balancer. The added latency is well under a millisecond, and balancing works best with stateless servers, not stateful ones." },

      { stem: "Which requirement does NOT belong on an API gateway?",
        options: ["Rate limiting per API key", "Validating that an access token is signed and unexpired", "Checking that a discount code is valid for the items in the basket", "Routing /v1 and /v2 to different backends"],
        answer: 2,
        why: "Whether a discount applies to a basket is a business rule that needs the meaning of the request and of the catalogue; it belongs in the service that owns pricing, where it is tested and deployed with the code. Per-key quotas, token signature checks and version routing need only the key, the token and the path — information the gateway already sees — and applying them once at the front door is exactly what the gateway is for." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The question is rarely the definitions; it is whether you know what each box can see.",
    questions: [
      { level: "core",
        q: "What is the difference between a reverse proxy, a load balancer and an API gateway?",
        strong: "A strong answer presents them as one progression defined by what each box knows, and gives a reason to choose each.",
        answer: [
          { t: "p", text: "They are one progression. A reverse proxy owns the public address and forwards to servers on private ones — terminating TLS, caching, compressing. A load balancer is a reverse proxy that knows about a pool of identical servers and their health, so it spreads traffic and stops sending to dead ones. An API gateway is a reverse proxy that knows about callers and products — it authenticates, applies per-key quotas, routes by API and version, and sometimes aggregates." },
          { t: "p", text: "In practice one product often plays several roles — NGINX or Envoy can be all three. The design question is which responsibilities to put at the front door, and my rule is identity, quotas and routing, never business logic, because the front door is the worst-tested and most critical place to put code." }
        ] },

      { level: "core",
        q: "When would you choose a layer-4 load balancer over a layer-7 one?",
        strong: "A strong answer ties the choice to what each can see and gives the common combined shape.",
        answer: [
          { t: "p", text: "When I do not need to look inside the request, or cannot. L4 sees addresses and ports, forwards bytes without parsing them, handles millions of connections cheaply and carries any protocol — database connections, game traffic, gRPC with TLS passthrough. L7 terminates TLS and parses HTTP, which costs CPU but lets me route on path, host, header or cookie, do canaries and sticky sessions, retries and caching." },
          { t: "p", text: "The common production answer is both: an L4 network balancer at the edge for throughput and to absorb volumetric attacks, in front of a fleet of L7 proxies that do the routing." }
        ] },

      { level: "advanced",
        q: "Where would you terminate TLS in a system that handles payments?",
        strong: "A strong answer separates the edge from the inside and names the compliance and latency considerations.",
        answer: [
          { t: "p", text: "At the edge for the client connection — a CDN or the L7 balancer — because I need L7 routing and WAF rules, and terminating near the user makes the handshake round trips short. Then re-encrypt from the proxy to the services rather than sending plain HTTP inside: payment environments under PCI DSS expect cardholder data to be encrypted on every network hop, and zero-trust practice says the internal network is not a trust boundary." },
          { t: "p", text: "Between services I would let a service mesh do mutual TLS with per-service identities, so encryption and authentication of east–west traffic do not depend on every team getting it right in code. Passthrough to the payment service is the option if a requirement says no intermediary may see the plaintext, at the cost of every L7 feature on that path." }
        ] }
    ]
  }
});
