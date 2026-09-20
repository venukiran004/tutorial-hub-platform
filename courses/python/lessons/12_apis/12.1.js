/* ============================================================================
   LESSON 12.1 — HTTP, Honestly
   ========================================================================= */
EC.receiveLesson({
  id: "12.1",

  lede: "Every API you build or consume sits on a protocol most engineers know by imitation rather than by reading. That is usually survivable — until a retry charges a customer twice, a cache serves one tenant another's data, or a 200 with an error body defeats every client's error handling. **The parts of HTTP that matter are few, and each one prevents a specific bug.**",

  objectives: [
    "Choose a method from its semantics — safety and idempotency — not from habit",
    "Return a status code a client can act on without reading the body",
    "Explain why idempotency is what makes a retry safe",
    "Use caching headers deliberately, including to prevent caching",
    "Recognise the cost of not reusing connections"
  ],

  prerequisites: ["7.8"],

  blocks: [

    { t: "h2", n: "01", text: "Methods are a contract", id: "methods" },

    { t: "table",
      head: ["Method", "Safe", "Idempotent", "Means"],
      rows: [
        ["`GET`", "**Yes**", "Yes", "Read. Must have no side effects at all"],
        ["`HEAD`", "**Yes**", "Yes", "The headers a `GET` would return"],
        ["`OPTIONS`", "**Yes**", "Yes", "What this resource supports"],
        ["`PUT`", "No", "**Yes**", "Replace the resource at this URL with this body"],
        ["`DELETE`", "No", "**Yes**", "Remove it. Deleting twice is not an error"],
        ["`POST`", "No", "**No**", "Everything else — create, act, submit"],
        ["`PATCH`", "No", "Not by default", "Apply a partial change"]
      ],
      caption: "**Safe** means no side effects, so a crawler or a prefetch cannot break anything. **Idempotent** means doing it twice has the same effect as once — which is what makes a retry safe, and is the single most useful property in the table."
    },

    { t: "callout", kind: "trap", title: "A GET with side effects breaks things you do not control", body: [
      { t: "code", lang: "python", title: "the endpoint that looks harmless", numbered: false, code: `
@app.get("/orders/{order_id}/cancel")     # WRONG -- a GET that mutates
def cancel(order_id: str):
    orders.cancel(order_id)
    return {"cancelled": order_id}`},
      { t: "ul", items: [
        "**Browsers prefetch links.** Hovering over it in some clients cancels the order.",
        "**Crawlers follow it.** A search engine indexing an admin page cancels everything it can reach.",
        "**Proxies and CDNs cache it**, so the second cancel returns a cached success without reaching you.",
        "**Retries are automatic.** Every HTTP client retries a `GET` on a connection error, because the specification says it is safe to."
      ]},
      { t: "code", lang: "python", title: "the correct shape", numbered: false, code: `
@app.post("/orders/{order_id}/cancellation")
def cancel(order_id: str) -> Order:
    return orders.cancel(order_id)`},
      { t: "p", text: "**The infrastructure between you and your caller acts on these semantics.** A `GET` that mutates is not a style preference — it is a promise you broke, and the systems that believed you are the ones that break." }
    ]},

    { t: "h2", n: "02", text: "Status codes a client can act on", id: "status" },

    { t: "viz",
      title: "The classes tell a client what to do",
      caption: "A client decides three things from the status alone: is this a success, should I retry, and is the problem mine or theirs. A code that answers those correctly means the client needs no special cases for your API.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram of HTTP status classes and what a client should do with each">
  <rect x="14" y="24" width="872" height="44" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.3"/>
  <text x="34" y="52" class="s-mono" style="font-size:12px;fill:var(--good)">2xx</text>
  <text x="100" y="52" class="s-label" style="fill:var(--good)">It worked</text>
  <text x="300" y="52" class="s-sub">200 ok · 201 created, with Location · 202 accepted, not done · 204 no body</text>

  <rect x="14" y="78" width="872" height="44" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="34" y="106" class="s-mono" style="font-size:12px">3xx</text>
  <text x="100" y="106" class="s-label">Look elsewhere</text>
  <text x="300" y="106" class="s-sub">301 moved for good · 304 your cached copy is still valid · 307/308 keep the method</text>

  <rect x="14" y="132" width="872" height="44" rx="8" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.3"/>
  <text x="34" y="160" class="s-mono" style="font-size:12px;fill:var(--warn)">4xx</text>
  <text x="100" y="160" class="s-label" style="fill:var(--warn)">You are wrong</text>
  <text x="300" y="160" class="s-sub">Do NOT retry unchanged · 400 malformed · 401 who? · 403 no · 404 gone · 409 conflict · 422 invalid</text>

  <rect x="14" y="186" width="872" height="44" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.3"/>
  <text x="34" y="214" class="s-mono" style="font-size:12px;fill:var(--crit)">5xx</text>
  <text x="100" y="214" class="s-label" style="fill:var(--crit)">We are wrong</text>
  <text x="300" y="214" class="s-sub">RETRY with backoff · 500 bug · 502 bad upstream · 503 try later · 504 upstream timeout</text>

  <line x1="14" y1="248" x2="886" y2="248" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="14" y="274" class="s-sub" style="fill:var(--crit)">429 is the exception worth memorising: a 4xx that SHOULD be retried, after Retry-After.</text>
  <text x="14" y="296" class="s-sub">A 200 carrying an error body defeats every client's error handling — including retries, alerts and dashboards.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the codes worth getting right", code: `
# 201 — created. The Location header is the point: it tells the client
#       where the thing now lives.
return Response(status_code=201, headers={"Location": f"/orders/{order.id}"})

# 202 — accepted, not finished. For anything queued.
return Response(status_code=202, headers={"Location": f"/jobs/{job.id}"})

# 204 — success, deliberately no body. Common for DELETE.
return Response(status_code=204)

# 400 vs 422 — malformed vs well-formed but wrong
#   400: the JSON does not parse
#   422: it parses, but quantity is -1

# 401 vs 403 — who are you, versus you may not
#   401: no credentials, or bad ones. Send WWW-Authenticate.
#   403: credentials fine, this action is not permitted.

# 409 — the request conflicts with current state
#   "this order is already cancelled", "that email is taken"

# 429 — slow down. ALWAYS include Retry-After.
return Response(status_code=429, headers={"Retry-After": "30"})
`,
      caption: "**401 and 403 are the pair most often swapped.** 401 means *unauthenticated* — the client should get credentials and try again. 403 means *unauthorised* — the same request will never work, so retrying is pointless (Lesson 6.3)."
    },

    { t: "callout", kind: "warn", title: "The 200-with-an-error-body anti-pattern", body: [
      { t: "code", lang: "python", title: "what it costs the caller", numbered: false, code: `
# The API returns:
#   HTTP 200 OK
#   {"success": false, "error": "insufficient funds"}

# Now every client must write this:
response = client.post(url, json=payload)
response.raise_for_status()          # passes — it was a 200
body = response.json()
if not body.get("success"):          # a second, bespoke error check
    raise PaymentError(body["error"])`},
      { t: "ul", items: [
        "**Every retry policy is defeated** — nothing sees a failure, so nothing retries what should be retried.",
        "**Every dashboard is wrong.** Error rate reads zero while payments fail.",
        "**Every proxy, gateway and load balancer** treats it as a success.",
        "**Every client needs custom handling**, and one of them will forget."
      ]},
      { t: "p", text: "**The status code is the machine-readable part of the response.** The body is for humans and for detail; the code is what infrastructure, monitoring and client libraries act on — and if it says success, they will all believe it." }
    ]},

    { t: "h2", n: "03", text: "Idempotency", id: "idempotency" },

    {"kind": "matrix", "title": "Safe and idempotent methods", "caption": "Safe: no state change. Idempotent: repeating has the same effect as doing it once. A client may retry idempotent requests freely; POST needs an idempotency key to be retried safely.", "rows": ["GET", "PUT", "DELETE", "POST", "PATCH"], "cols": ["safe", "idempotent"], "cells": [[true, true], [false, true], [false, true], [false, false], [false, {"text": "not guaranteed", "tone": "warn"}]], "t": "diagram", "id": "dg-12_1-03-0"},

    { t: "viz",
      title: "The timeout that charges twice",
      caption: "A read timeout tells you the answer did not come back. It tells you nothing about whether the server processed the request — so a retry without an idempotency key is a second charge.",
      svg: `<svg viewBox="0 0 900 290" role="img" aria-label="Diagram showing a request that succeeded server-side but timed out client-side, and a retry causing a duplicate charge">
  <text x="14" y="26" class="s-label" style="fill:var(--crit)">WITHOUT AN IDEMPOTENCY KEY</text>

  <g class="s-mono" style="font-size:9px">
    <text x="14" y="58" class="s-sub">client</text>
    <text x="800" y="58" class="s-sub">server</text>

    <line x1="80" y1="70" x2="780" y2="70" style="stroke:var(--border-strong)" stroke-width="1.2"/>
    <text x="400" y="64" text-anchor="middle">POST /charges  £50</text>

    <rect x="700" y="78" width="160" height="18" rx="3" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="710" y="91" style="fill:var(--crit)">charged £50 ✓</text>

    <line x1="780" y1="112" x2="500" y2="112" style="stroke:var(--crit)" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="480" y="116" text-anchor="end" style="fill:var(--crit)">response lost</text>

    <line x1="80" y1="140" x2="780" y2="140" style="stroke:var(--border-strong)" stroke-width="1.2"/>
    <text x="400" y="134" text-anchor="middle">retry: POST /charges  £50</text>

    <rect x="700" y="148" width="160" height="18" rx="3" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="710" y="161" style="fill:var(--crit)">charged £50 AGAIN</text>
  </g>

  <line x1="14" y1="184" x2="886" y2="184" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="14" y="212" class="s-label" style="fill:var(--good)">WITH ONE</text>
  <g class="s-mono" style="font-size:9px">
    <line x1="80" y1="238" x2="780" y2="238" style="stroke:var(--border-strong)" stroke-width="1.2"/>
    <text x="400" y="232" text-anchor="middle">retry: POST /charges  Idempotency-Key: abc-123</text>
    <rect x="660" y="246" width="200" height="18" rx="3" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
    <text x="670" y="259" style="fill:var(--good)">seen abc-123 — replay the result</text>
  </g>
  <text x="14" y="284" class="s-sub" style="fill:var(--good)">Same key, same answer, charged once. The client may retry freely.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "implementing it on the server", code: `
from fastapi import Header, HTTPException


@app.post("/charges", status_code=201)
def create_charge(
    request: ChargeRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
) -> Charge:
    """The key makes a retry safe. Without one, a POST is not idempotent
    and the client cannot safely repeat it (Lesson 6.5)."""

    existing = idempotency.get(idempotency_key)
    if existing is not None:
        # Same key, different body: the client has a bug, and replaying
        # the old answer would hide it.
        if existing.request_hash != request.fingerprint():
            raise HTTPException(422, "idempotency key reused with a different body")
        return existing.response

    charge = gateway.charge(request.amount, request.customer)

    # Store AFTER the work, so a crash mid-charge leaves no key and the
    # retry genuinely re-attempts rather than replaying a phantom result.
    idempotency.store(idempotency_key, request.fingerprint(), charge, ttl=86_400)
    return charge
`,
      hl: [12, 16, 22],
      caption: "**Storing after the work is deliberate.** Store first and a crash between storing and charging leaves a key claiming success for a charge that never happened — the retry then replays a result that does not exist."
    },

    { t: "callout", kind: "insight", title: "Which methods need a key", body: [
      { t: "table",
        head: ["Method", "Idempotent by design?", "Needs a key?"],
        rows: [
          ["`GET`, `HEAD`", "Yes — no effects at all", "No"],
          ["`PUT`", "Yes — you send the whole new state", "No"],
          ["`DELETE`", "Yes — already-deleted is still deleted", "No"],
          ["`POST`", "**No** — each call creates something", "**Yes**, for anything with a consequence"],
          ["`PATCH`", "Depends — `{\"status\": \"paid\"}` yes, `{\"$inc\": 1}` no", "If it is relative"]
        ]
      },
      { t: "p", text: "**`PUT` is idempotent because it is a replacement**, not an edit: sending the same body twice leaves the same state. That is the reason to prefer `PUT` over `POST` for updates where you can send the whole resource." },
      { t: "p", text: "**`DELETE` twice should return 204, not 404.** The resource is gone either way, which is the state the client asked for — returning 404 on the second call forces every client to special-case a successful retry." }
    ]},

    { t: "h2", n: "04", text: "Caching and connections", id: "caching" },

    { t: "code", lang: "python", title: "the headers, and what each one does", code: `
# Tell caches the answer is per-user and must never be shared
Cache-Control: private, no-store

# Cacheable by shared caches for 5 minutes, then revalidate
Cache-Control: public, max-age=300

# Cacheable, but must check with us every time before using it
Cache-Control: no-cache          # NOT "do not cache" -- that is no-store

# Conditional requests: the client sends what it has, you reply 304
ETag: "a3f91c2"
If-None-Match: "a3f91c2"    ->  304 Not Modified, empty body

# The header that prevents the cross-tenant bug
Vary: Authorization
`,
      hl: [2, 9, 17],
      caption: "**`no-cache` means revalidate, not \"never cache\"** — the directive for that is `no-store`. Getting them the wrong way round is how private data ends up in a shared cache."
    },

    { t: "callout", kind: "trap", title: "A missing `Vary` header leaks between users", body: [
      { t: "code", lang: "python", title: "the shape of the bug", numbered: false, code: `
@app.get("/me/orders")
def my_orders(user: User = Depends(current_user)) -> list[Order]:
    return orders.for_user(user.id)      # response depends on the
                                          # Authorization header
# Response:
#   Cache-Control: public, max-age=60
#   (no Vary header)`},
      { t: "p", text: "A shared cache keys on the URL. Two users request `/me/orders`, the URL is identical, and the second one is served the first one's orders — for the full sixty seconds." },
      { t: "code", lang: "python", title: "either fix works; pick deliberately", numbered: false, code: `
# 1. Say what the response varies on
Cache-Control: private, max-age=60
Vary: Authorization

# 2. Or do not cache per-user responses in shared caches at all
Cache-Control: private, no-store`},
      { t: "p", text: "**`private` alone is the minimum**, and `Vary: Authorization` is the belt-and-braces that survives a proxy misreading it. Any response whose content depends on a header must declare that header (Lesson 10.4)." }
    ]},

    { t: "ladder",
      title: "Making a hundred API calls",
      rungs: [
        { level: "bad", label: "A fresh connection every time",
          why: "Each `requests.get` opens a TCP connection, negotiates TLS, sends one request and closes it. The handshake is two to three round trips and dominates the time for anything but a slow endpoint.",
          code: `for url in urls:
    r = requests.get(url)          # new connection each time
    handle(r.json())

# 100 requests: ~14 s, of which ~11 s is handshakes` },
        { level: "ok", label: "A Session",
          why: "One connection, reused. This is the single largest easy win when calling an API repeatedly, and it is a one-line change.",
          code: `with requests.Session() as session:
    for url in urls:
        r = session.get(url, timeout=10)
        handle(r.json())

# 100 requests: ~3.2 s` },
        { level: "best", label: "A configured client, held for the process",
          why: "Connection reuse, a pool sized to your concurrency, timeouts that are never optional, and retries only on the statuses where a retry is correct. Built once and injected, not created per call.",
          code: `from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def build_client(pool_size: int = 20) -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.3,                       # 0.3s, 0.6s, 1.2s
        status_forcelist=[429, 502, 503, 504],    # NOT 500 or any 4xx
        allowed_methods={"GET", "PUT", "DELETE", "HEAD"},   # idempotent only
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(
        max_retries=retry,
        pool_connections=pool_size,
        pool_maxsize=pool_size,
    )
    session.mount("https://", adapter)
    session.headers["User-Agent"] = "acme-billing/1.4"
    return session`,
          note: "**`allowed_methods` excludes `POST` deliberately.** Retrying a non-idempotent request is how a timeout becomes a double charge — so a `POST` is retried only where you control the idempotency key (Lesson 12.2)." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix an API that six clients have had to work around",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "This API works, and every team consuming it has written a special case for it. Find each protocol violation and say which client behaviour it breaks." },
        { t: "code", lang: "python", numbered: false, title: "routes.py — as found", code: `
@app.get("/orders/{oid}/refund")
def refund(oid: str):
    result = payments.refund(oid)
    if not result.ok:
        return {"success": False, "error": result.error}
    return {"success": True, "refund_id": result.id}

@app.post("/orders")
def create(order: OrderIn):
    o = orders.create(order)
    return {"id": o.id}

@app.get("/me/orders")
def mine(user=Depends(current_user)):
    return Response(
        content=json.dumps([o.dict() for o in orders.for_user(user.id)]),
        headers={"Cache-Control": "public, max-age=300"},
    )

@app.delete("/orders/{oid}")
def delete(oid: str):
    if not orders.exists(oid):
        raise HTTPException(404, "not found")
    orders.delete(oid)
    return {"deleted": True}

@app.post("/login")
def login(creds: Credentials):
    if not auth.check(creds):
        raise HTTPException(403, "bad credentials")
    return {"token": auth.issue(creds)}`},
        { t: "p", text: "There are seven. One of them is a data leak." }
      ],
      requirements: [
        "Identify each violation and the client behaviour it breaks.",
        "Say which one leaks data between users, and how.",
        "Fix the method semantics and the status codes.",
        "Make the refund safe to retry.",
        "Explain what a client currently has to write to use this API safely.",
        "**Say why the `DELETE` returning 404 is wrong even though the order really is missing.**"
      ],
      hint: "Start with the method on the first route and ask what a browser prefetch would do. Then look at what the third route caches and what it varies on.",
      solution: {
        lang: "python",
        title: "routes.py",
        code: `# =========================================================================
# THE SEVEN VIOLATIONS
# =========================================================================
#
# 1. GET /orders/{oid}/refund  -- A GET THAT MUTATES
#
#    GET is defined as SAFE, so the infrastructure acts on that:
#      - browsers and link previews prefetch it -> refunds issued by a
#        hover
#      - crawlers follow it -> every reachable order refunded
#      - proxies cache it -> the second refund returns a cached success
#        without reaching the server
#      - every HTTP client retries a GET on a connection error
#        automatically, because the spec says that is safe
#
#    BREAKS: everything. This is the most serious of the seven.
#
#
# 2. A 200 CARRYING {"success": false}
#
#    BREAKS: raise_for_status() passes, so no client's error handling
#    fires. Retry policies never trigger. The error-rate dashboard
#    reads zero while refunds fail. Every consumer must write a second,
#    bespoke check -- and one of the six forgot.
#
#
# 3. POST /orders RETURNS 200, NO Location
#
#    BREAKS: a client cannot tell "created" from "already existed", and
#    has to construct the resource URL by string-building rather than
#    following the header. Should be 201 with Location.
#
#
# 4. /me/orders IS PUBLICLY CACHEABLE  <- THE DATA LEAK
#
#    Cache-Control: public with no Vary. A shared cache keys on the URL,
#    and the URL is identical for every user. So:
#
#      user A requests /me/orders  -> cached for 300s
#      user B requests /me/orders  -> served A's orders
#
#    BREAKS: confidentiality. Any CDN, reverse proxy or corporate proxy
#    between the client and the service will do this, and it needs no
#    bug on their side -- the response told them it was safe.
#
#
# 5. DELETE RETURNS 404 ON A SECOND CALL
#
#    DELETE is idempotent: the client asked for the resource to be gone,
#    and it is gone. A 404 on the retry reports failure for a state that
#    matches the request exactly.
#
#    BREAKS: retries. A client whose first DELETE timed out (but
#    succeeded) retries, gets a 404, and reports an error for an
#    operation that worked. Every consumer ends up writing
#    "if status == 404: treat as success", which is the whole point of
#    idempotency being pushed onto six clients instead of one server.
#
#
# 6. LOGIN FAILURE RETURNS 403
#
#    401 = we do not know who you are; get credentials and retry.
#    403 = we know who you are and you may not do this; retrying is
#          pointless.
#
#    BREAKS: client auth flows. A 401 tells a client to refresh a token
#    or prompt for a password; a 403 tells it to give up. Bad
#    credentials are the definition of 401, and it should carry
#    WWW-Authenticate.
#
#
# 7. THE REFUND CANNOT BE RETRIED SAFELY
#
#    Even as a POST, refunding is not idempotent: two calls issue two
#    refunds. A client whose request timed out has no safe move --
#    retrying may double-refund, not retrying may leave the customer
#    unpaid.
#
#    BREAKS: every caller's error handling, in the specific way that
#    costs money (Lesson 6.5).


from __future__ import annotations

import hashlib
import json

from fastapi import Depends, Header, HTTPException, Response, status


# =========================================================================
# FIXED
# =========================================================================

@app.post(
    "/orders/{oid}/refunds",          # a sub-RESOURCE, created by POST
    status_code=status.HTTP_201_CREATED,
    response_model=Refund,
)
def create_refund(
    oid: str,
    response: Response,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
) -> Refund:
    """FIX 1: POST, because it has an effect.
    FIX 7: an idempotency key, because a POST is not idempotent and the
           client must be able to retry a timeout safely.
    """
    fingerprint = hashlib.sha256(f"{oid}".encode()).hexdigest()

    existing = idempotency.get(idempotency_key)
    if existing is not None:
        if existing.fingerprint != fingerprint:
            # Same key, different request: a client bug. Replaying the
            # old answer would hide it.
            raise HTTPException(422, "idempotency key reused with a different body")
        # A replay is not a creation.
        response.status_code = status.HTTP_200_OK
        return existing.result

    result = payments.refund(oid)

    # FIX 2: the failure is a STATUS, not a field in a 200 body.
    if not result.ok:
        raise HTTPException(
            status.HTTP_409_CONFLICT,          # conflicts with current state
            detail=result.error,
        )

    # Stored AFTER the work: a crash mid-refund leaves no key, so the
    # retry genuinely re-attempts rather than replaying a phantom.
    idempotency.store(idempotency_key, fingerprint, result, ttl=86_400)
    return result


@app.post("/orders", status_code=status.HTTP_201_CREATED, response_model=Order)
def create_order(order: OrderIn, response: Response) -> Order:
    """FIX 3: 201, and a Location header so the client can follow it
    rather than building the URL itself."""
    created = orders.create(order)
    response.headers["Location"] = f"/orders/{created.id}"
    return created


@app.get("/me/orders", response_model=list[Order])
def my_orders(response: Response, user: User = Depends(current_user)) -> list[Order]:
    """FIX 4 -- the data leak.

    private:  no shared cache may store it, only the user's own browser
    no-store: not even that, for anything sensitive
    Vary:     belt and braces -- if a proxy caches it anyway, at least
              it keys on the Authorization header rather than the URL
    """
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["Vary"] = "Authorization"
    return orders.for_user(user.id)


@app.delete("/orders/{oid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(oid: str) -> Response:
    """FIX 5: idempotent. The client asked for it to be gone; it is
    gone. Whether we did the deleting is our business, not theirs.

    This is what stops six clients each writing
    'if status == 404: treat as success'.
    """
    orders.delete_if_exists(oid)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/login")
def login(creds: Credentials, response: Response) -> Token:
    """FIX 6: 401, with WWW-Authenticate, so a client knows to obtain
    credentials rather than to give up."""
    if not auth.check(creds):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth.issue(creds)


# =========================================================================
# WHAT A CLIENT HAD TO WRITE BEFORE
# =========================================================================
#
#   response = session.get(f"/orders/{oid}/refund")   # a GET, and it
#                                                     # may be retried
#                                                     # automatically
#   response.raise_for_status()        # passes on a failed refund
#   body = response.json()
#   if not body["success"]:            # the second error check
#       raise RefundError(body["error"])
#
#   # and separately:
#   if delete_response.status_code == 404:
#       pass                           # actually success
#   if login_response.status_code == 403:
#       prompt_for_password()          # actually a 401 case
#
# After the fix, all of that is:
#
#   response = session.post(f"/orders/{oid}/refunds",
#                           headers={"Idempotency-Key": str(uuid4())})
#   response.raise_for_status()
#
# Six clients stop carrying workarounds, and the retry logic they
# already have starts working.


# =========================================================================
# WHY 404 ON A SECOND DELETE IS WRONG
# =========================================================================
#
# The question a status code answers is "did the request achieve what
# was asked?" DELETE asks for the resource to not exist. After the
# second call, it does not exist. That is success.
#
# 404 answers a different question -- "was it there when you asked?" --
# which the client did not ask and cannot act on.
#
# The concrete cost: a client whose first DELETE times out has no way to
# distinguish
#     "my delete worked, the response was lost"
# from
#     "the order never existed"
# ...so it reports an error for an operation that succeeded. Returning
# 204 for both makes the retry safe, which is the entire purpose of
# DELETE being idempotent.


# =========================================================================
# TESTS
# =========================================================================

def test_refund_is_a_post_not_a_get(client):
    """Violation 1. A GET route here would be prefetched and crawled."""
    assert client.get("/orders/o-1/refund").status_code == 405
    assert client.post("/orders/o-1/refunds",
                       headers={"Idempotency-Key": "k1"}).status_code == 201


def test_a_failed_refund_is_not_a_200(client):
    """Violation 2. raise_for_status() must see the failure."""
    with failing_gateway():
        r = client.post("/orders/o-1/refunds", headers={"Idempotency-Key": "k2"})

    assert r.status_code == 409
    assert r.status_code >= 400          # what every client actually checks


def test_the_same_key_refunds_once(client):
    """Violation 7. Two identical requests, one refund."""
    headers = {"Idempotency-Key": "k3"}

    first = client.post("/orders/o-1/refunds", headers=headers)
    second = client.post("/orders/o-1/refunds", headers=headers)

    assert first.status_code == 201
    assert second.status_code == 200            # a replay, not a creation
    assert first.json()["id"] == second.json()["id"]
    assert payments.refund_count("o-1") == 1


def test_per_user_responses_are_not_publicly_cacheable(client, alice, bob):
    """Violation 4 — THE DATA LEAK. A shared cache keys on the URL, and
    the URL is identical for every user."""
    r = client.get("/me/orders", headers=alice.auth)

    cache_control = r.headers["Cache-Control"]
    assert "public" not in cache_control
    assert "private" in cache_control or "no-store" in cache_control
    assert "Authorization" in r.headers.get("Vary", "")


def test_deleting_twice_succeeds(client):
    """Violation 5. This is what makes a timed-out DELETE retryable."""
    client.post("/orders", json={"sku": "W-1"})

    assert client.delete("/orders/o-1").status_code == 204
    assert client.delete("/orders/o-1").status_code == 204      # not 404


def test_bad_credentials_are_401_with_a_challenge(client):
    """Violation 6. 401 tells a client to get credentials; 403 tells it
    to give up."""
    r = client.post("/login", json={"user": "x", "password": "wrong"})

    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_creation_returns_201_and_a_location(client):
    """Violation 3."""
    r = client.post("/orders", json={"sku": "W-1"})

    assert r.status_code == 201
    assert r.headers["Location"] == f"/orders/{r.json()['id']}"`,
        notes: [
          { t: "p", text: "**The `GET` refund is the one that would cause an incident.** Every layer between the client and the service acts on the promise that a `GET` is safe: browsers prefetch, crawlers follow, proxies cache, and clients retry automatically on a connection error. The method is not a naming convention — it is a contract other systems enforce on your behalf." },
          { t: "p", text: "**The cache leak needs no bug on anyone else's side.** `Cache-Control: public` with no `Vary` tells a shared cache that this response is the same for everyone, and the cache believes it. Any CDN or corporate proxy will serve one user's orders to the next — correctly, according to what the response said." },
          { t: "p", text: "**The 404-on-second-delete is the violation that quietly costs the most**, because it pushes idempotency onto six clients instead of solving it once. Every one of them writes `if status == 404: treat as success`, and the one that forgets reports failures for operations that worked." },
          { t: "callout", kind: "insight", title: "The replay returns 200, not 201", body: [
            { t: "p", text: "201 means \"a resource was created by this request\". A replay created nothing — it returned a resource that already existed — so 200 is the honest answer and lets a client distinguish the two if it cares." },
            { t: "p", text: "The fingerprint check alongside it turns a client bug into a clear 422 rather than a silently wrong replay: the same key with a different body means their retry logic is reusing keys, and hiding that would be worse than failing." }
          ]},
          { t: "p", text: "**Storing the idempotency record after the work is the ordering that matters.** Store first, and a crash between storing and charging leaves a key asserting success for something that never happened — so the retry replays a result that does not exist, which is worse than the double charge it was preventing." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A payments integration works for eight months. Then the provider has thirty seconds of network trouble, and forty customers are charged twice in a single afternoon." },
      { t: "p", text: "**The client library retried `POST /charges` on a read timeout.** Every one of those charges had succeeded on the provider's side; only the responses were lost. The retry was configured with `allowed_methods` left at the default, which includes every method." },
      { t: "p", text: "**Neither side was obviously wrong in isolation.** The provider processed each request exactly once as asked. The client retried what looked like a transient failure. What was missing was the one thing that lets those two correct behaviours coexist: an idempotency key." },
      { t: "p", text: "**Two lines fixed it permanently** — a `uuid4()` per logical charge, generated once outside the retry loop, and `allowed_methods` restricted to idempotent methods. **A read timeout tells you the answer did not arrive, never that the work did not happen**, and that distinction is the whole reason idempotency keys exist." }
    ]}
  ],

  takeaways: [
    "**Methods are a contract the infrastructure enforces.** A `GET` that mutates will be prefetched, crawled, cached and auto-retried, because every layer believes the promise it made.",
    "**Safe means no side effects; idempotent means twice is the same as once.** The second property is what makes a retry safe.",
    "**A status code is the machine-readable part of a response.** A 200 carrying an error body defeats every retry policy, dashboard and proxy between you and the caller.",
    "**401 is \"who are you\"; 403 is \"you may not\".** A 401 tells a client to get credentials; a 403 tells it to stop.",
    "**429 is a 4xx that should be retried** — always send `Retry-After` with it.",
    "**201 needs a `Location` header**, so a client follows a URL instead of building one.",
    "**`DELETE` twice should return 204, not 404.** The resource is gone, which is what the client asked for — 404 forces every client to special-case a successful retry.",
    "**`POST` needs an idempotency key** for anything with a consequence, and the record must be stored *after* the work.",
    "**A read timeout tells you the answer did not arrive, not that the work did not happen.** That is the entire reason keys exist.",
    "**`no-cache` means revalidate; `no-store` means do not keep it.** Confusing them puts private data in shared caches.",
    "**Any response that depends on a header must declare it with `Vary`** — a missing `Vary: Authorization` on a per-user response is a cross-tenant leak.",
    "**Reuse connections.** A `Session` turns a hundred TLS handshakes into one, and it is the largest easy win when calling an API repeatedly."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An endpoint is `GET /orders/{id}/cancel`. What goes wrong beyond style?",
        options: [
          "Nothing — the method is a convention",
          "Browsers prefetch it, crawlers follow it, proxies cache it and clients auto-retry it, because `GET` is defined as safe and everything acts on that",
          "GET requests cannot carry path parameters reliably",
          "It will be rejected by most web servers"
        ],
        answer: 1,
        why: "The method is a contract other systems enforce. Link prefetching, search-engine crawling, proxy caching and automatic retry on connection errors are all built on the guarantee that a `GET` has no side effects. Breaking it means orders get cancelled by a hover, by an indexer, or by a client library doing exactly what the specification permits."
      },
      {
        stem: "A payment API returns `HTTP 200` with `{\"success\": false, \"error\": \"declined\"}`. What does that cost callers?",
        options: [
          "Nothing, as long as the body is documented",
          "`raise_for_status()` passes, so no retry policy fires, error-rate dashboards read zero, and every client must write a second bespoke check",
          "The response cannot be cached",
          "Clients must parse the body twice"
        ],
        answer: 1,
        why: "The status code is what infrastructure and client libraries act on. A 200 tells proxies, load balancers, monitoring and every HTTP library that the call succeeded. Each consumer then needs custom handling, one of them forgets, and failures are invisible on dashboards while they are happening."
      },
      {
        stem: "A `POST /charges` times out after the server has charged the card. The client retries and the customer is charged twice. What was missing?",
        options: [
          "A longer client timeout",
          "An idempotency key generated once per logical operation, so the server recognises the retry and replays the original result",
          "A 409 response on the second attempt",
          "Retries should have been disabled entirely"
        ],
        answer: 1,
        why: "A read timeout means the response did not arrive; it says nothing about whether the work happened. `POST` is not idempotent, so the client has no safe move — retrying may double-charge, not retrying may leave the customer unpaid. A key generated outside the retry loop lets the server return the original result, and makes retrying correct."
      },
      {
        stem: "`GET /me/orders` returns `Cache-Control: public, max-age=300` with no `Vary`. What happens?",
        options: [
          "The response is cached per user by their browser only",
          "A shared cache keys on the URL, which is identical for all users, so the second user is served the first user's orders",
          "The cache is bypassed because the response requires authentication",
          "Only the response headers are shared, not the body"
        ],
        answer: 1,
        why: "This needs no bug on the cache's side — the response declared itself publicly shareable. Any CDN or corporate proxy will serve one user's data to the next for the full five minutes. Per-user responses need `private` at minimum, `no-store` for anything sensitive, and `Vary: Authorization` so a cache that stores it anyway keys on the credential."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between PUT and POST?",
        strong: "`PUT` replaces the resource at a URL with the body you send, so it is idempotent — the same request twice leaves the same state. `POST` creates or acts, and each call is a new effect, so it is not.",
        answer: [
          { t: "p", text: "Idempotency is the useful half of the answer, because it determines whether a client may safely retry — and that is what the distinction is actually for." },
          { t: "p", text: "Following through to idempotency keys for `POST` shows the practical consequence: a timed-out charge is only retryable if the server can recognise the repeat." },
          { t: "p", text: "The `PATCH` nuance is a good addition — a partial update is idempotent if it sets absolute values and not if it increments." }
        ]
      },
      {
        level: "core",
        q: "When would you return 401 versus 403?",
        strong: "401 when the request lacks valid credentials — the client should authenticate and retry, and the response should carry `WWW-Authenticate`. 403 when the credentials are fine but the action is not permitted, so retrying is pointless.",
        answer: [
          { t: "p", text: "Framing it as what the client should *do next* is what makes the distinction actionable rather than a definition to memorise." },
          { t: "p", text: "The security nuance is worth raising: returning 403 for a resource the user may not even know about leaks its existence, which is why 404 is sometimes the right answer instead." },
          { t: "p", text: "Mentioning that a 401 on a login failure is what lets a client refresh a token automatically connects it to real client behaviour." }
        ]
      },
      {
        level: "advanced",
        q: "How do you make a retry safe?",
        strong: "Only retry idempotent methods automatically. For a `POST` with a consequence, use an idempotency key generated once per logical operation and reused across attempts, so the server can recognise the repeat and replay the original result.",
        answer: [
          { t: "p", text: "\"A timeout tells you the answer did not arrive, not that the work did not happen\" is the sentence the whole answer rests on." },
          { t: "p", text: "The implementation detail that separates people who have built it: store the idempotency record *after* the work, or a crash leaves a key claiming a success that never occurred." },
          { t: "p", text: "Restricting `allowed_methods` in the retry configuration is the client-side half, and it is the setting whose default has caused real double charges." }
        ]
      }
    ]
  }
});
