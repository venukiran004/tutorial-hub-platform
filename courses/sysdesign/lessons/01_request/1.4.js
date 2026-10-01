/* ============================================================================
   LESSON 1.4 — HTTP, HTTPS and TLS
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "HTTP is a text conversation: a request line, some headers, a blank line, a body, and a response shaped the same way. Nearly everything a system designer cares about in it is a **contract carried in that text** — which methods are safe to retry, which status codes mean try again, which headers allow a cache to answer instead of you. HTTPS wraps the same text in TLS, and the price of that wrapping is **round trips before the first byte**, which is why TLS versions and connection reuse show up in latency budgets.",

  objectives: [
    "Read a raw HTTP request and response and name every part",
    "Classify the HTTP methods as safe, idempotent and cacheable, and say why that decides retry behaviour",
    "Choose the correct status code for a situation and say whether a client should retry it",
    "Count the round trips a new HTTPS connection costs under TLS 1.2, TLS 1.3 and QUIC",
    "Explain what HTTP/2 and HTTP/3 change, and what problem each solves"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [

    { t: "h2", n: "01", id: "anatomy", text: "What actually goes over the wire",
      sub: "A request line, headers, a blank line, a body" },

    { t: "p", text: "HTTP/1.1 is plain text, which makes it easy to see. This starts a real server, writes a request to a socket by hand, and prints both sides exactly:" },

    { t: "code", lang: "python", title: "http_raw.py — one request and response, unabridged", code: `import socket, threading
from http.server import BaseHTTPRequestHandler, HTTPServer

class Orders(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def do_GET(self):
        body = b'{"id": 42, "status": "shipped"}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "private, max-age=30")
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *a): pass
    def version_string(self): return "orders/1.0"
    def date_time_string(self, timestamp=None): return "Thu, 01 Oct 2026 09:00:00 GMT"

srv = HTTPServer(("127.0.0.1", 0), Orders)
threading.Thread(target=srv.serve_forever, daemon=True).start()

request = (b"GET /orders/42 HTTP/1.1\\r\\n"
           b"Host: shop.example.com\\r\\n"
           b"Accept: application/json\\r\\n"
           b"Connection: close\\r\\n\\r\\n")
with socket.create_connection(srv.server_address) as s:
    s.sendall(request)
    response = b"".join(iter(lambda: s.recv(4096), b""))

print("---- what the client sent ----")
print(request.decode().replace("\\r\\n", "\\n").rstrip())
print("---- what came back ----")
print(response.decode().replace("\\r\\n", "\\n"))
srv.shutdown()`,
      out: `---- what the client sent ----
GET /orders/42 HTTP/1.1
Host: shop.example.com
Accept: application/json
Connection: close
---- what came back ----
HTTP/1.1 200 OK
Server: orders/1.0
Date: Thu, 01 Oct 2026 09:00:00 GMT
Content-Type: application/json
Content-Length: 31
Cache-Control: private, max-age=30

{"id": 42, "status": "shipped"}`,
      hl: [21, 22, 23, 24],
      caption: "The request is a **method and path**, then **headers** — `Host` tells one IP which of many sites you want — then a blank line. The response is a **status line**, headers, a blank line and the body. `Content-Length` says where the body ends; `Cache-Control` tells every cache on the way back how long it may reuse this answer (3.5)." },

    { t: "diagram", kind: "layers", title: "One HTTPS request, as layers",
      caption: "Each layer wraps the one above it. A layer-4 balancer reads the TCP and IP layers; a layer-7 proxy decrypts TLS to read the HTTP inside (1.3).",
      items: [
        { label: "HTTP: GET /orders/42, headers, body", sub: "the application's conversation", tone: "good", side: "L7 reads this" },
        { label: "TLS: encryption, integrity, server identity", sub: "the S in HTTPS", tone: "violet", side: "L7 terminates" },
        { label: "TCP: ordered, reliable byte stream, port 443", sub: "connection set-up costs a round trip", tone: "accent", side: "L4 reads this" },
        { label: "IP: addresses, routing between networks", sub: "best effort, may drop or reorder", side: "" }
      ] },

    { t: "h2", n: "02", id: "methods", text: "Methods: the retry contract",
      sub: "Safe, idempotent and cacheable are promises other systems rely on" },

    { t: "p", text: "Each method carries two promises that infrastructure acts on without asking you. **Safe** means the request does not change anything on the server. **Idempotent** means sending it twice has the same effect as sending it once. Proxies, browsers and client libraries retry idempotent requests automatically when a connection drops — so declaring the wrong method is how a payment gets taken twice." },

    { t: "diagram", kind: "matrix", title: "The method contract",
      caption: "POST is the only common method that is neither safe nor idempotent, so it is the one that is never retried automatically and the one that needs an idempotency key when it must be (1.5, 6.3). PATCH can be written idempotently, but the protocol does not promise it.",
      cols: ["Safe", "Idempotent", "Cacheable", "Use for"],
      rows: ["GET", "HEAD", "PUT", "DELETE", "POST", "PATCH"],
      cells: [
        [true, true, true, { text: "read a resource" }],
        [true, true, true, { text: "headers only" }],
        [false, true, false, { text: "replace it entirely" }],
        [false, true, false, { text: "remove it" }],
        [false, false, { text: "rarely", tone: "warn" }, { text: "create, or trigger" }],
        [false, { text: "not promised", tone: "warn" }, false, { text: "change part of it" }]
      ] },

    { t: "callout", kind: "trap", title: "A timeout does not tell you whether the POST happened",
      body: [
        { t: "p", text: "A client sends `POST /payments`, the server charges the card, and the response is lost when a load balancer restarts. The client sees a timeout. **It cannot know whether the charge happened.** If it retries, the customer may pay twice; if it does not, the order may never complete." },
        { t: "p", text: "Changing the method does not fix it — a payment is genuinely not idempotent. The fix is to make the request idempotent by contract: the client generates an **`Idempotency-Key`** once per logical payment and sends it on every attempt, and the server stores the key with the result, returning the stored result for a repeat instead of charging again. Stripe's API works this way (14.3), and 6.3 builds it properly." }
      ] },

    { t: "h2", n: "03", id: "status", text: "Status codes: what the client should do next",
      sub: "The first digit is the category; the category is the retry decision" },

    { t: "diagram", kind: "matrix", title: "The codes worth knowing, and whether to retry",
      caption: "4xx means the request is wrong and repeating it unchanged will fail again — except 429, which means \"later\". 5xx means the server failed; 502, 503 and 504 are usually transient and safe to retry with backoff (7.1) if the method is idempotent.",
      cols: ["Means", "Retry?"],
      rows: ["200 · 201 · 204", "301 · 302 · 304", "400 · 422", "401", "403", "404", "409", "429", "500", "502 · 503 · 504"],
      cells: [
        [{ text: "OK · created · OK with no body", tone: "good" }, { text: "—" }],
        [{ text: "moved for good · moved for now · not modified", tone: "accent" }, { text: "follow / use cache" }],
        [{ text: "malformed · well-formed but invalid", tone: "warn" }, { text: "no — fix the request", tone: "crit" }],
        [{ text: "not authenticated: who are you?", tone: "warn" }, { text: "after re-auth", tone: "warn" }],
        [{ text: "authenticated, not allowed", tone: "warn" }, { text: "no", tone: "crit" }],
        [{ text: "no such resource", tone: "warn" }, { text: "no", tone: "crit" }],
        [{ text: "conflicts with current state", tone: "warn" }, { text: "after re-reading", tone: "warn" }],
        [{ text: "too many requests", tone: "violet" }, { text: "yes — after Retry-After", tone: "good" }],
        [{ text: "unhandled server error", tone: "crit" }, { text: "cautiously, if idempotent", tone: "warn" }],
        [{ text: "bad gateway · unavailable · gateway timeout", tone: "crit" }, { text: "yes, with backoff", tone: "good" }]
      ] },

    { t: "p", text: "Two pairs are worth getting right in an interview because they signal care. **401 against 403**: 401 is \"I do not know who you are\" — send credentials; 403 is \"I know who you are and the answer is no\". **301 against 302**: a 301 is cached by browsers indefinitely, so a URL shortener that returns 301 cannot count clicks after the first one per browser — which is why most return 302 (15.3)." },

    { t: "h2", n: "04", id: "tls", text: "HTTPS: what TLS buys and what it costs",
      sub: "Three guarantees, paid for in round trips" },

    { t: "dl", items: [
      ["Confidentiality", "Nobody on the path — Wi-Fi, ISP, a compromised router — can read the request. Without it, a session cookie on public Wi-Fi is a stolen account."],
      ["Integrity", "Nobody can change the bytes in flight. Without it, an ISP can and does inject content into pages."],
      ["Authentication of the server", "The certificate, signed by a certificate authority the client trusts, proves you reached the real `shop.example.com`. Mutual TLS adds the reverse — the client proves its identity too — which is how services authenticate each other (12.3)."]
    ] },

    { t: "p", text: "The handshake uses asymmetric cryptography to agree on a symmetric key, then everything after it is encrypted with that fast symmetric key. The CPU cost is small on modern hardware. **The cost that matters is round trips** — and it is paid before the first byte of the response can arrive:" },

    { t: "viz", title: "TLS 1.2 against TLS 1.3, arrow by arrow",
      caption: "TLS 1.3 sends the client's key share in its first message, so the server can finish its half of the handshake immediately and the request rides on the client's Finished. One round trip saved on every new connection.",
      svg: `<svg viewBox="0 0 760 350" width="100%" role="img" aria-label="TLS 1.2 and TLS 1.3 handshakes">
<defs><marker id="hs-tcp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="hs-tls" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="hs-http" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker></defs>
<text x="180" y="22" text-anchor="middle" class="s-label">TCP + TLS 1.2 + request</text>
<text x="180" y="40" text-anchor="middle" class="s-sub">4 round trips to the first response byte</text>
<text x="50" y="62" text-anchor="middle" class="s-mono">client</text><text x="310" y="62" text-anchor="middle" class="s-mono">server</text>
<line x1="50" y1="68" x2="50" y2="316" style="stroke:var(--line)" stroke-width="1.2"/>
<line x1="310" y1="68" x2="310" y2="316" style="stroke:var(--line)" stroke-width="1.2"/>
<line x1="50" y1="78" x2="310" y2="98" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#hs-tcp)"/>
<text x="180.0" y="79" text-anchor="middle" class="s-sub" style="fill:var(--accent)">SYN</text>
<line x1="310" y1="108" x2="50" y2="128" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#hs-tcp)"/>
<text x="180.0" y="109" text-anchor="middle" class="s-sub" style="fill:var(--accent)">SYN-ACK</text>
<line x1="50" y1="138" x2="310" y2="158" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#hs-tls)"/>
<text x="180.0" y="139" text-anchor="middle" class="s-sub" style="fill:var(--violet)">ACK, ClientHello</text>
<line x1="310" y1="168" x2="50" y2="188" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#hs-tls)"/>
<text x="180.0" y="169" text-anchor="middle" class="s-sub" style="fill:var(--violet)">ServerHello, certificate</text>
<line x1="50" y1="198" x2="310" y2="218" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#hs-tls)"/>
<text x="180.0" y="199" text-anchor="middle" class="s-sub" style="fill:var(--violet)">key exchange, Finished</text>
<line x1="310" y1="228" x2="50" y2="248" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#hs-tls)"/>
<text x="180.0" y="229" text-anchor="middle" class="s-sub" style="fill:var(--violet)">Finished</text>
<line x1="50" y1="258" x2="310" y2="278" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#hs-http)"/>
<text x="180.0" y="259" text-anchor="middle" class="s-sub" style="fill:var(--good)">GET /orders/42</text>
<line x1="310" y1="288" x2="50" y2="308" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#hs-http)"/>
<text x="180.0" y="289" text-anchor="middle" class="s-sub" style="fill:var(--good)">200 OK</text>
<text x="570" y="22" text-anchor="middle" class="s-label">TCP + TLS 1.3 + request</text>
<text x="570" y="40" text-anchor="middle" class="s-sub">3 round trips — one fewer</text>
<text x="440" y="62" text-anchor="middle" class="s-mono">client</text><text x="700" y="62" text-anchor="middle" class="s-mono">server</text>
<line x1="440" y1="68" x2="440" y2="256" style="stroke:var(--line)" stroke-width="1.2"/>
<line x1="700" y1="68" x2="700" y2="256" style="stroke:var(--line)" stroke-width="1.2"/>
<line x1="440" y1="78" x2="700" y2="98" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#hs-tcp)"/>
<text x="570.0" y="79" text-anchor="middle" class="s-sub" style="fill:var(--accent)">SYN</text>
<line x1="700" y1="108" x2="440" y2="128" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#hs-tcp)"/>
<text x="570.0" y="109" text-anchor="middle" class="s-sub" style="fill:var(--accent)">SYN-ACK</text>
<line x1="440" y1="138" x2="700" y2="158" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#hs-tls)"/>
<text x="570.0" y="139" text-anchor="middle" class="s-sub" style="fill:var(--violet)">ACK, ClientHello + key share</text>
<line x1="700" y1="168" x2="440" y2="188" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#hs-tls)"/>
<text x="570.0" y="169" text-anchor="middle" class="s-sub" style="fill:var(--violet)">ServerHello, cert, Finished</text>
<line x1="440" y1="198" x2="700" y2="218" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#hs-http)"/>
<text x="570.0" y="199" text-anchor="middle" class="s-sub" style="fill:var(--good)">Finished + GET /orders/42</text>
<line x1="700" y1="228" x2="440" y2="248" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#hs-http)"/>
<text x="570.0" y="229" text-anchor="middle" class="s-sub" style="fill:var(--good)">200 OK</text>
<text x="20" y="340" class="s-sub"><tspan style="fill:var(--accent)">■ TCP</tspan>   <tspan style="fill:var(--violet)">■ TLS</tspan>   <tspan style="fill:var(--good)">■ HTTP</tspan>   — each arrow is half a round trip; at 250 ms per round trip the difference is a quarter of a second</text>
</svg>` },

    { t: "code", lang: "python", title: "handshake.py — round trips to the first byte, at four distances", code: `SETUPS = {   # round trips before the first byte of the response can arrive
    "HTTP/1.1 + TLS 1.2  (new connection)":  1 + 2 + 1,   # TCP, TLS 1.2, request
    "HTTP/2   + TLS 1.3  (new connection)":  1 + 1 + 1,   # TCP, TLS 1.3, request
    "HTTP/3   (QUIC, new connection)":       1 + 1,       # QUIC handshake includes TLS 1.3
    "TLS 1.3 0-RTT resumption":              1 + 0 + 1,   # TCP, early data with request
    "reused keep-alive connection":          1,           # just the request
}
print("%-40s %5s" % ("", "RTTs") + "".join("%10s" % f"{r} ms" for r in (2, 20, 80, 250)))
for name, rtts in SETUPS.items():
    print("%-40s %5d" % (name, rtts) + "".join("%10d" % (rtts * r) for r in (2, 20, 80, 250)))`,
      out: `                                          RTTs      2 ms     20 ms     80 ms    250 ms
HTTP/1.1 + TLS 1.2  (new connection)         4         8        80       320      1000
HTTP/2   + TLS 1.3  (new connection)         3         6        60       240       750
HTTP/3   (QUIC, new connection)              2         4        40       160       500
TLS 1.3 0-RTT resumption                     2         4        40       160       500
reused keep-alive connection                 1         2        20        80       250`,
      caption: "At 2 ms none of this matters. At 250 ms — a user on another continent — a new HTTP/1.1 + TLS 1.2 connection costs a full second before any of your code's output arrives, and a reused connection costs a quarter of that. **Connection reuse is the largest single item on the list**, which is why keep-alive, connection pools (11.3) and HTTP/2 matter more than any TLS setting." },

    { t: "h2", n: "05", id: "versions", text: "HTTP/1.1, HTTP/2 and HTTP/3",
      sub: "Each version fixes the head-of-line blocking the previous one left" },

    { t: "diagram", kind: "compare", title: "What each version changed",
      caption: "Each version keeps the same methods, headers and status codes — the semantics in sections 02 and 03 are unchanged. What changes is how requests share a connection, and that is a latency question.",
      columns: [
        { title: "HTTP/1.1 (1997)", tone: "warn", items: [
          "text on the wire",
          "one request at a time per connection",
          "browsers open ~6 connections per host to cope",
          "a slow response blocks the ones behind it",
          "keep-alive reuses a connection"
        ] },
        { title: "HTTP/2 (2015)", tone: "accent", items: [
          "binary frames, compressed headers",
          "many requests multiplexed on one connection",
          "no head-of-line blocking between requests",
          "but one lost TCP packet stalls every stream",
          "the default for gRPC (1.5)"
        ] },
        { title: "HTTP/3 (2022)", tone: "good", items: [
          "runs on QUIC over UDP, not TCP",
          "a lost packet stalls only its own stream",
          "TLS 1.3 built into the transport handshake",
          "connections survive a network change",
          "matters most on lossy mobile networks"
        ] }
      ] },

    { t: "callout", kind: "insight", title: "Why HTTP/3 left TCP",
      body: [
        { t: "p", text: "HTTP/2 removed head-of-line blocking at the HTTP layer but kept it at the TCP layer: TCP delivers bytes in order, so a single lost packet holds back every multiplexed stream until it is retransmitted. On a clean data-centre network that rarely matters; on a phone losing 2% of packets it can make HTTP/2 slower than six HTTP/1.1 connections." },
        { t: "p", text: "Fixing it inside TCP was impossible because TCP lives in operating-system kernels and in middleboxes that would take a decade to update. So QUIC reimplements reliability per stream in user space, over UDP, which every network already passes. The lesson generalises: **a design that needs the network's infrastructure to change will lose to one that works around it.**" }
      ] },

    { t: "exercise", kind: "Challenge", title: "Make a mobile app start fast for users far from the origin",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "A mobile app makes six independent API calls when it starts. Users are in Mumbai; the origin is in us-east, 220 ms away. A CDN point of presence in Mumbai is 20 ms away and keeps a warm, reused connection to the origin (200 ms). Each call takes the origin 30 ms." },
        { t: "p", text: "Compare three designs and find the start-up time of each, ignoring DNS." }
      ],
      requirements: [
        "A: a new HTTP/1.1 + TLS 1.2 connection for each call, calls made one after another",
        "B: one HTTP/2 + TLS 1.3 connection to the origin with the six calls multiplexed on it",
        "C: as B, but the connection terminates at the CDN, which forwards over its warm origin link",
        "Explain which change contributes most, and why C helps even though the API responses are not cacheable"
      ],
      hint: "In B and C the six calls are in flight at once, so they cost one round trip together, not six.",
      solution: { lang: "python", title: "startup.py",
        code: `RTT_ORIGIN = 220      # ms, Mumbai phone -> us-east origin
RTT_EDGE = 20         # ms, Mumbai phone -> CDN point of presence in Mumbai
EDGE_TO_ORIGIN = 200  # ms, PoP -> origin over a warm, reused connection
CALLS = 6             # API calls the app makes at start-up; independent of each other
SERVER_MS = 30        # time the origin spends on each call

# A: a fresh HTTP/1.1 + TLS 1.2 connection per call, calls one after another
a = CALLS * (4 * RTT_ORIGIN + SERVER_MS)
# B: one HTTP/2 + TLS 1.3 connection, the six calls multiplexed on it at once
b = 2 * RTT_ORIGIN + (RTT_ORIGIN + SERVER_MS)
# C: as B, but TLS terminates at the edge; edge forwards over its warm origin link
c = 2 * RTT_EDGE + (RTT_EDGE + EDGE_TO_ORIGIN + SERVER_MS)

for name, ms in (("A  new HTTP/1.1+TLS1.2 per call, sequential", a),
                 ("B  one HTTP/2+TLS1.3 conn, multiplexed", b),
                 ("C  as B, TLS terminated at the edge", c)):
    print("%-46s %6d ms" % (name, ms))`,
        out: `A  new HTTP/1.1+TLS1.2 per call, sequential      5460 ms
B  one HTTP/2+TLS1.3 conn, multiplexed            690 ms
C  as B, TLS terminated at the edge               290 ms`,
        notes: [
          { t: "p", text: "A to B is the big step — **5.5 seconds to 0.7** — and it comes from two changes that compound: one connection instead of six, so the handshake is paid once; and multiplexing, so the six calls share a single round trip instead of queueing. Neither change touches the server." },
          { t: "p", text: "B to C more than halves what is left, and **nothing is cached**. The handshake's round trips now cross 20 ms instead of 220 ms, and the edge forwards over a connection it already holds open, so the long haul is paid once per call and never for set-up. That is why CDNs terminate TLS for dynamic APIs too (1.3) — the handshake alone justifies it." },
          { t: "p", text: "What C cannot remove is the single 200 ms crossing to the origin for each response, because the data lives in us-east. Going below about 290 ms means putting the data nearer — regional read replicas or caching at the edge (3.5, 4.1) — which is a consistency decision, not a protocol one." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the certificate that expired while every check stayed green",
      body: [
        { t: "p", text: "**Symptom.** At 00:00 UTC on a Saturday every browser and mobile client began failing to connect with a certificate error. The status page was green, every health check was green, and the on-call engineer was not paged for forty minutes, until customer complaints reached support." },
        { t: "p", text: "**Mechanism.** The TLS certificate on the public load balancer had been renewed by hand once a year and the person who did it had left. It expired at midnight. The health checks ran from inside the VPC against the app servers over plain HTTP — behind the point where TLS terminated — so they tested everything except the one thing that had broken. Monitoring that does not take the user's path cannot see failures on the user's path." },
        { t: "p", text: "**Fix.** A new certificate restored service within an hour. Then: automated issuance and renewal (ACME, or the cloud provider's managed certificates) with renewal at two-thirds of the lifetime; an **external synthetic check** that makes a real HTTPS request from outside, as a user would; and an alert on certificate expiry at 30, 14 and 7 days, for every hostname, so that automation failing is itself noticed." }
      ] }
  ],

  takeaways: [
    "An HTTP message is **a start line, headers, a blank line and a body**. `Host` selects the site on a shared IP; `Content-Length` frames the body; `Cache-Control` licenses caches to answer for you.",
    "**Safe** means no change; **idempotent** means twice equals once. Infrastructure retries idempotent methods automatically — GET, PUT, DELETE — and never POST.",
    "**A timeout on a POST tells you nothing about whether it happened.** Make it idempotent by contract with an `Idempotency-Key` stored with the result.",
    "**4xx: fix the request; 5xx: the server failed.** 429 and 502/503/504 are the retryable ones, with backoff and only for idempotent requests.",
    "**401 is unauthenticated, 403 is unauthorised.** **301 is cached by browsers for good**, so a link shortener that counts clicks returns 302.",
    "TLS gives **confidentiality, integrity and server authentication**; mutual TLS adds client authentication.",
    "The cost of TLS is **round trips before the first byte**: TCP + TLS 1.2 + request is 4, TLS 1.3 is 3, QUIC is 2, a reused connection is 1.",
    "**Connection reuse is worth more than any TLS setting** — at 250 ms per round trip, a fresh connection costs a second and a reused one a quarter of that.",
    "HTTP/2 multiplexes requests on one connection; **HTTP/3 moves to QUIC over UDP** so one lost packet stalls only its own stream.",
    "**Monitor from the user's path.** Health checks behind TLS termination cannot see an expired certificate."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A client's PUT /users/7/address times out. Is it safe for the client library to retry automatically?",
        options: ["No — any write might be applied twice", "Yes — PUT replaces the resource, so applying it twice leaves the same state as once", "Only if the server returned 500", "Only with an Idempotency-Key header"],
        answer: 1,
        why: "PUT is idempotent by definition: it replaces the resource with the given representation, so a duplicate leaves the same final state. That is why infrastructure retries it. The \"any write\" worry applies to POST, which is neither safe nor idempotent. A timeout gives no status code at all, and an idempotency key is the tool for making a POST safe to retry, not something PUT needs." },

      { stem: "A user is logged in but requests another user's invoice. Which status code is correct?",
        options: ["401 Unauthorized", "403 Forbidden (or 404 to avoid revealing it exists)", "400 Bad Request", "409 Conflict"],
        answer: 1,
        why: "The server knows who the user is — authentication succeeded — and is refusing permission, which is 403. Many APIs return 404 instead, so as not to confirm that the invoice exists. 401 asks the client to authenticate, which would not help. The request is well-formed, so 400 is wrong, and 409 is for a conflict with the resource's current state." },

      { stem: "How many round trips does a brand-new HTTPS connection with TLS 1.3 over TCP cost before the first byte of the response arrives?",
        options: ["1", "2", "3", "4"],
        answer: 2,
        why: "One round trip for the TCP handshake, one for the TLS 1.3 handshake, and the request travels with the client's Finished message, so the response arrives at the end of the third. Four is TLS 1.2, which needs two round trips for its handshake. Two is QUIC, whose transport handshake includes TLS. One is a reused, already-established connection." },

      { stem: "Why can HTTP/2 perform worse than HTTP/1.1 on a lossy mobile network?",
        options: ["HTTP/2 headers are larger", "All of HTTP/2's streams share one TCP connection, so one lost packet stalls them all", "HTTP/2 does not support TLS", "HTTP/2 opens too many connections"],
        answer: 1,
        why: "TCP delivers bytes strictly in order, so while one lost packet is retransmitted, every stream multiplexed on the connection waits. HTTP/1.1's six separate connections lose only one request's worth of progress. HTTP/2 headers are compressed and smaller, it is used with TLS almost universally, and it opens fewer connections, not more. HTTP/3 moved to QUIC precisely to fix this." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "HTTP questions are really questions about retries, caching and latency.",
    questions: [
      { level: "core",
        q: "What is the difference between PUT, PATCH and POST, and why does it matter?",
        strong: "A strong answer goes past CRUD mapping to idempotency and what infrastructure does with it.",
        answer: [
          { t: "p", text: "PUT replaces a resource at a known URL, so it is idempotent — twice is the same as once. PATCH changes part of a resource; it can be written idempotently, like setting a field, but the protocol does not promise it, and an increment is not. POST creates a resource or triggers an action and is neither safe nor idempotent." },
          { t: "p", text: "It matters because clients, proxies and libraries act on the contract. They retry idempotent requests on a dropped connection, and never POST. So a POST that must be retried — a payment, an order — needs an idempotency key the server stores with the result, so a duplicate returns the first result instead of acting again." }
        ] },

      { level: "core",
        q: "Walk me through what HTTPS costs and how you would reduce it.",
        strong: "A strong answer counts round trips, not CPU, and names reuse and edge termination.",
        answer: [
          { t: "p", text: "The CPU cost of TLS is small now. The cost that matters is round trips before the first byte: TCP is one, TLS 1.2 adds two, TLS 1.3 adds one, then the request is one more. At 250 ms between a user and the origin, a new TLS 1.2 connection is a second of waiting." },
          { t: "p", text: "So, in order: reuse connections — keep-alive, HTTP/2 multiplexing, connection pools between services — so the handshake is paid rarely. Use TLS 1.3, and HTTP/3 where clients support it. And terminate TLS at a CDN close to the user, so the handshake round trips are short, with the CDN holding warm connections back to the origin. That last one helps even for responses that cannot be cached." }
        ] },

      { level: "advanced",
        q: "A URL shortener needs to count clicks. Which redirect status would you return, and why?",
        strong: "A strong answer connects the status code's caching semantics to the product requirement.",
        answer: [
          { t: "p", text: "302, or 307 if I need to preserve the method. A 301 says the move is permanent, and browsers cache it indefinitely, so after the first click a browser goes straight to the destination without asking me — I would never see the second click." },
          { t: "p", text: "The cost of 302 is that every click comes to my service, so the redirect path has to be fast: the short-code lookup is served from a cache and the click is recorded asynchronously on a queue rather than in the request. If counting did not matter and load did, 301 would offload repeat clicks to the browser — that is the trade, and I would ask which the product wants." }
        ] }
    ]
  }
});
