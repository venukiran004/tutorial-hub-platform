/* ============================================================================
   LESSON 12.2 — Consuming APIs Well
   ========================================================================= */
EC.receiveLesson({
  id: "12.2",

  lede: "Calling someone else's API is where your service inherits their failure modes. **The default settings of every HTTP client in Python are wrong for production** — no timeout, no connection reuse, no retry policy — and each default costs you a specific outage. This lesson is the client you should be building instead.",

  objectives: [
    "Configure a client with timeouts, pooling and retries that are correct rather than default",
    "Choose between `requests` and `httpx` with a reason",
    "Retry only what is safe to retry, with jitter and a budget",
    "Consume paginated endpoints without materialising everything",
    "Wrap a third-party API behind a boundary your code owns"
  ],

  prerequisites: ["12.1", "6.5"],

  blocks: [

    { t: "h2", n: "01", text: "The defaults are the bugs", id: "defaults" },

    {"kind": "flow", "title": "The defaults are the bugs", "caption": "requests.get(url) has no timeout, no retry policy and trusts whatever comes back. A production client sets a timeout, checks the status, retries only idempotent calls with backoff, and validates the body at the boundary.", "cols": 5, "nodes": [{"id": "t", "label": "timeout=(3, 10)", "sub": "connect, read", "tone": "crit"}, {"id": "s", "label": "raise_for_status()", "sub": "4xx/5xx are errors", "tone": "warn"}, {"id": "r", "label": "retry with backoff", "sub": "5xx and timeouts only", "tone": "accent"}, {"id": "v", "label": "validate the body", "sub": "a Pydantic model", "tone": "good"}, {"id": "c", "label": "reuse the session", "sub": "connection pooling", "tone": "violet"}], "edges": [["t", "s"], ["s", "r"], ["r", "v"], ["v", "c"]], "t": "diagram", "id": "dg-12_2-01-0"},


    { t: "viz",
      title: "Everything between your call and the response",
      caption: "Each layer is a place the call can fail differently. A client that treats them all as one exception cannot retry intelligently, because a timeout and a 400 need opposite responses.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="The layers of an outbound HTTP call and the distinct failure at each">
  <g style="stroke-width:2">
    <rect x="24"  y="56" width="150" height="52" rx="7" style="fill:var(--accent);fill-opacity:.13;stroke:var(--accent)"/>
    <rect x="196" y="56" width="150" height="52" rx="7" style="fill:var(--accent);fill-opacity:.13;stroke:var(--accent)"/>
    <rect x="368" y="56" width="150" height="52" rx="7" style="fill:var(--accent);fill-opacity:.13;stroke:var(--accent)"/>
    <rect x="540" y="56" width="150" height="52" rx="7" style="fill:var(--accent);fill-opacity:.13;stroke:var(--accent)"/>
    <rect x="712" y="56" width="144" height="52" rx="7" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)"/>
  </g>
  <text x="44"  y="88" class="s-sub" style="fill:var(--ink-2)">DNS</text>
  <text x="216" y="88" class="s-sub" style="fill:var(--ink-2)">TCP + TLS</text>
  <text x="388" y="88" class="s-sub" style="fill:var(--ink-2)">request sent</text>
  <text x="560" y="88" class="s-sub" style="fill:var(--ink-2)">server work</text>
  <text x="732" y="88" class="s-sub" style="fill:var(--good)">response</text>

  <g class="s-sub" style="fill:var(--crit)">
    <text x="24"  y="138">resolution fails</text>
    <text x="196" y="138">connect timeout</text>
    <text x="368" y="138">write timeout</text>
    <text x="540" y="138">read timeout, 5xx</text>
    <text x="712" y="138">4xx — your fault</text>
  </g>

  <text x="24" y="186" class="s-sub" style="fill:var(--good)">retry: connect timeouts, 429, 502/503/504 — the request may not have been processed</text>
  <text x="24" y="208" class="s-sub" style="fill:var(--crit)">do not retry: 4xx, and read timeouts on a non-idempotent POST — it may already have succeeded</text>
  <text x="24" y="230" class="s-sub" style="fill:var(--ink-3)">Set connect and read timeouts separately; a single timeout value conflates two very different failures.</text>
</svg>`
    },
    { t: "table",
      head: ["Default", "Costs you", "Fix"],
      rows: [
        ["**No timeout**", "One hung host holds a worker forever, then the pool, then the service", "`timeout=(3.05, 10)` on every call"],
        ["No connection reuse", "A TLS handshake per request — often most of the latency", "One `Session` or `Client`, held for the process"],
        ["No retry policy", "A transient 503 becomes a user-visible failure", "`Retry` on idempotent methods only"],
        ["Retry on every method", "A timed-out `POST` charges twice", "`allowed_methods` restricted"],
        ["Small connection pool", "Threads block inside the client, so your concurrency is imaginary", "Size the pool to your worker count"],
        ["Raw exceptions escape", "Callers depend on `requests`, not on you", "Translate at your boundary"]
      ],
      caption: "**The first row causes more incidents than the rest combined.** `requests` waits forever by default, which turns a partner's bad afternoon into your outage."
    },

    { t: "code", lang: "python", title: "the client to build once", code: `
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def build_session(*, pool_size: int = 20) -> requests.Session:
    """Constructed at startup and reused. Never per call."""
    session = requests.Session()

    retry = Retry(
        total=3,
        backoff_factor=0.3,                       # 0.3s, 0.6s, 1.2s
        backoff_jitter=0.2,                       # urllib3 2.x
        status_forcelist=[429, 502, 503, 504],
        allowed_methods={"GET", "HEAD", "PUT", "DELETE", "OPTIONS"},
        respect_retry_after_header=True,
        raise_on_status=False,
    )

    adapter = HTTPAdapter(
        max_retries=retry,
        pool_connections=pool_size,
        pool_maxsize=pool_size,
    )
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    session.headers.update({
        "User-Agent": "acme-billing/1.4 (+https://acme.example/contact)",
        "Accept": "application/json",
    })
    return session
`,
      hl: [13, 16, 22, 23],
      caption: "**`status_forcelist` excludes 500 deliberately.** A 500 is usually a deterministic bug on their side — retrying costs you three times the latency and rarely helps, where a 503 explicitly says \"try later\"."
    },

    { t: "callout", kind: "trap", title: "The timeout that is not a timeout", body: [
      { t: "code", lang: "python", title: "what each number bounds", numbered: false, code: `
requests.get(url)                        # waits FOREVER. The default.
requests.get(url, timeout=10)            # 10s to connect AND 10s per read
requests.get(url, timeout=(3.05, 10))    # (connect, read) -- what you want

# The read timeout is between BYTES, not for the whole response.
# A server dribbling one byte every 9 seconds never times out.`},
      { t: "p", text: "**A healthy host accepts a connection in milliseconds**, so the connect timeout should be small — 3.05 rather than 3, because it is fractionally above the TCP retransmission window and avoids retrying into a retry." },
      { t: "p", text: "**The read timeout does not bound total duration.** For that you need a deadline in your own code, or `httpx`'s `Timeout(..., pool=...)` plus an outer budget (Lesson 6.5)." },
      { t: "code", lang: "python", title: "a real overall bound", numbered: false, code: `
import time


class Budget:
    """time.monotonic, not time.time -- the wall clock can jump when NTP
    corrects it, and a deadline computed from it may never expire."""

    def __init__(self, seconds: float) -> None:
        self._deadline = time.monotonic() + seconds

    def remaining(self) -> float:
        left = self._deadline - time.monotonic()
        if left <= 0:
            raise TimeoutError("budget exhausted")
        return left


budget = Budget(5.0)
a = session.get(url_a, timeout=(3.05, budget.remaining()))
b = session.get(url_b, timeout=(3.05, budget.remaining()))`}
    ]},

    { t: "h2", n: "02", text: "requests or httpx", id: "clients" },

    { t: "table",
      head: ["", "`requests`", "`httpx`"],
      rows: [
        ["Async support", "**No**", "**Yes** — same API, `AsyncClient`"],
        ["HTTP/2", "No", "Yes, with `http2=True`"],
        ["Default timeout", "**None** — waits forever", "**5 seconds**"],
        ["Test stubbing", "`responses`", "`respx`"],
        ["Ubiquity", "Everywhere; every example uses it", "Growing"],
        ["Choose when", "The codebase is synchronous and already uses it", "**New code**, or anything that may go async"]
      ],
      caption: "**`httpx` having a default timeout is not a small detail.** It is the difference between an unconfigured client that hangs and one that fails — and the failure mode you get by accident matters more than the one you get by design."
    },

    { t: "code", lang: "python", title: "the same client, both libraries", code: `
import httpx

# Sync — a drop-in shape
client = httpx.Client(
    base_url="https://api.partner.test",
    timeout=httpx.Timeout(10.0, connect=3.05),
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=20),
    headers={"User-Agent": "acme-billing/1.4"},
    transport=httpx.HTTPTransport(retries=3),      # connection errors only
)

# Async — identical surface
async with httpx.AsyncClient(
    base_url="https://api.partner.test",
    timeout=httpx.Timeout(10.0, connect=3.05),
    limits=httpx.Limits(max_connections=20),
) as client:
    response = await client.get("/orders")
`,
      caption: "**`httpx`'s built-in `retries` covers connection failures only, not status codes.** For status-based retry you write the loop yourself or use `tenacity` — which is arguably clearer, since it is explicit about what is being retried and why."
    },

    { t: "h2", n: "03", text: "Retrying correctly", id: "retry" },

    { t: "ladder",
      title: "Retrying a call that sometimes fails",
      rungs: [
        { level: "bad", label: "Retry everything, immediately",
          why: "Retries a 400 that will never succeed, hammers a struggling service with no pause, and retries a `POST` that may have already charged the customer.",
          code: `for _ in range(5):
    try:
        return session.post(url, json=payload)
    except Exception:
        continue` },
        { level: "ok", label: "Selective, with exponential backoff",
          why: "Only transient failures are retried and the delay grows. But every client backs off on the same schedule, so a recovering service is hit by synchronised waves.",
          code: `for attempt in range(4):
    try:
        r = session.get(url, timeout=(3.05, 10))
        if r.status_code not in (429, 502, 503, 504):
            return r
    except requests.RequestException:
        pass
    time.sleep(2 ** attempt)` },
        { level: "best", label: "Jittered, budgeted, and honest about idempotency",
          why: "Jitter desynchronises clients so recovery is not undone by the retry storm. The budget stops a caller waiting past their own deadline. And a `POST` is retried only when an idempotency key makes it safe.",
          code: `import random
import time
import uuid


RETRYABLE_STATUS = {429, 502, 503, 504}
IDEMPOTENT = {"GET", "HEAD", "PUT", "DELETE", "OPTIONS"}


def call(session, method: str, url: str, *, attempts: int = 4,
         budget: Budget | None = None, **kwargs) -> requests.Response:
    # One key for the whole logical operation, generated OUTSIDE the
    # loop -- a fresh key per attempt is the same as no key at all.
    if method not in IDEMPOTENT:
        kwargs.setdefault("headers", {}).setdefault(
            "Idempotency-Key", str(uuid.uuid4()))

    for attempt in range(attempts):
        try:
            response = session.request(
                method, url, timeout=(3.05, 10), **kwargs)
            if response.status_code not in RETRYABLE_STATUS:
                return response
            # The server knows more about its recovery than we do
            delay = float(response.headers.get("Retry-After", 0)) or None
        except requests.RequestException:
            if attempt == attempts - 1:
                raise
            delay = None

        if attempt == attempts - 1:
            return response

        # Full jitter: uniform(0, cap), not a fixed schedule
        wait = delay if delay is not None else random.uniform(0, 0.3 * 2 ** attempt)
        if budget is not None:
            wait = min(wait, budget.remaining())
        time.sleep(wait)`,
          note: "**Retries are load amplification.** Ask what your policy does when a dependency is 100% down, not when it drops one request in a thousand — a global retry budget capping retry traffic at a fraction of requests prevents the disaster a per-call policy causes (Lesson 6.5)." }
      ]
    },

    { t: "callout", kind: "insight", title: "`tenacity` for anything more than a loop", body: [
      { t: "code", lang: "python", title: "the policy becomes declarative", numbered: false, code: `
from tenacity import (retry, retry_if_exception_type, stop_after_attempt,
                      stop_after_delay, wait_exponential_jitter)


@retry(
    retry=retry_if_exception_type(TransientError),
    wait=wait_exponential_jitter(initial=0.2, max=5),
    stop=(stop_after_attempt(4) | stop_after_delay(15)),
    reraise=True,
)
def fetch(url: str) -> dict:
    response = session.get(url, timeout=(3.05, 10))
    if response.status_code in RETRYABLE_STATUS:
        raise TransientError(response.status_code)
    response.raise_for_status()
    return response.json()`},
      { t: "p", text: "**`stop_after_attempt | stop_after_delay` is the combination worth copying**: four tries *or* fifteen seconds, whichever comes first, so a slow dependency cannot turn four attempts into a minute." },
      { t: "p", text: "**`reraise=True` matters.** Without it, tenacity raises its own `RetryError` wrapping yours, so callers see a library exception instead of the failure they can act on." }
    ]},

    { t: "h2", n: "04", text: "Pagination", id: "pagination" },

    { t: "code", lang: "python", title: "yield pages, never accumulate them", code: `
from collections.abc import Iterator


def iter_orders(session, since: str) -> Iterator[dict]:
    """A generator, so a caller can stop early and memory stays flat
    however many pages exist (Lesson 8.1)."""
    url = "/orders"
    params = {"since": since, "limit": 100}

    while url:
        response = session.get(url, params=params, timeout=(3.05, 10))
        response.raise_for_status()
        body = response.json()

        yield from body["data"]

        # Cursor pagination: follow the link, do not compute the next URL
        url = body.get("next")
        params = None            # the cursor URL already carries them


# The caller decides how much to consume
for order in itertools.islice(iter_orders(session, "2026-01-01"), 50):
    process(order)              # 1 request, not 400
`,
      hl: [17, 22],
      caption: "**Following the server's `next` link beats computing offsets.** Offset pagination skips and duplicates rows when the underlying data changes mid-scan; a cursor is stable because it encodes a position rather than a count."
    },

    { t: "callout", kind: "warn", title: "The three pagination bugs", body: [
      { t: "ul", items: [
        "**Offset drift.** `?page=2&limit=100` over data being written re-reads and skips rows. Use a cursor, or order by an immutable key and paginate on that.",
        "**No page limit.** A loop with no bound becomes infinite if the API returns the same cursor twice — which happens.",
        "**Accumulating into a list.** `all_orders = []` with `.extend()` per page defeats the point: memory scales with the dataset again."
      ]},
      { t: "code", lang: "python", title: "the guard worth having", numbered: false, code: `
seen_cursors: set[str] = set()
pages = 0

while url:
    if url in seen_cursors or pages > MAX_PAGES:
        raise RuntimeError(f"pagination loop or runaway at page {pages}")
    seen_cursors.add(url)
    pages += 1
    ...`}
    ]},

    { t: "h2", n: "05", text: "The boundary", id: "boundary" },

    { t: "code", lang: "python", title: "one place that knows about the vendor", code: `
from dataclasses import dataclass


class PartnerError(Exception):
    """Base for everything this client raises, so a caller can catch
    one thing and know it came from us (Lesson 6.3)."""


class PartnerUnavailable(PartnerError):
    """Transient. A retry may help."""


class PartnerRejected(PartnerError):
    """Terminal. The request was wrong."""


@dataclass(frozen=True, slots=True)
class Order:
    """OUR type, not their JSON. A field rename upstream changes one
    mapping function rather than forty call sites."""
    id: str
    total: Decimal
    status: str

    @classmethod
    def from_payload(cls, payload: dict) -> "Order":
        return cls(
            id=payload["order_id"],                 # their name
            total=Decimal(str(payload["amount_cents"])) / 100,
            status=payload["state"].lower(),
        )


class PartnerClient:
    def __init__(self, session: requests.Session, base: str) -> None:
        self._session, self._base = session, base

    def get_order(self, order_id: str) -> Order:
        try:
            response = self._session.get(
                f"{self._base}/orders/{order_id}", timeout=(3.05, 10))
        except requests.Timeout as exc:
            raise PartnerUnavailable("timed out") from exc
        except requests.RequestException as exc:
            raise PartnerUnavailable("could not reach the partner") from exc

        if response.status_code >= 500:
            raise PartnerUnavailable(f"partner error {response.status_code}")
        if response.status_code == 404:
            raise PartnerRejected(f"no such order {order_id}")
        response.raise_for_status()

        return Order.from_payload(response.json())
`,
      hl: [19, 26, 41],
      caption: "**Two boundaries in one class: exceptions and types.** Callers never see `requests` or the vendor's field names, so swapping to `httpx` or absorbing an upstream rename changes this file alone (Lesson 6.3)."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Harden a client that took the service down",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "This client caused an outage: the partner had a slow afternoon and every worker in the service ended up waiting on it. Find every problem and rebuild it." },
        { t: "code", lang: "python", numbered: false, title: "partner.py — as found", code: `
import requests

def get_order(order_id):
    r = requests.get(f"{BASE}/orders/{order_id}")
    return r.json()

def list_orders(since):
    orders = []
    page = 1
    while True:
        r = requests.get(f"{BASE}/orders", params={"since": since, "page": page})
        data = r.json()
        orders.extend(data["data"])
        if not data["data"]:
            break
        page += 1
    return orders

def create_refund(order_id, amount):
    for _ in range(3):
        try:
            r = requests.post(f"{BASE}/refunds",
                              json={"order": order_id, "amount": amount})
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
    raise Exception("refund failed")`},
        { t: "p", text: "Eight problems. One of them can refund a customer three times." }
      ],
      requirements: [
        "Identify all eight and the failure each produces.",
        "Say which one caused the outage, and precisely how.",
        "Say which one can triple-refund, and why the retry loop makes it worse.",
        "Make pagination memory-flat and loop-proof.",
        "Give callers exception types they can act on.",
        "**Explain why `r.json()` without checking the status is its own bug.**"
      ],
      hint: "Count the things that are missing rather than wrong: there is no timeout, no session, and no status check anywhere.",
      solution: {
        lang: "python",
        title: "partner.py",
        code: `# =========================================================================
# THE EIGHT PROBLEMS
# =========================================================================
#
# 1. NO TIMEOUT ANYWHERE  <- THE OUTAGE
#
#    requests waits FOREVER by default. When the partner slowed down,
#    every worker thread that called get_order blocked indefinitely.
#    The thread pool filled, then requests queued, then the health check
#    could not be served either -- so an orchestrator that was watching
#    a healthy process restarted it into the same state.
#
#    One slow dependency became total unavailability. This is the single
#    most expensive default in the library.
#
# 2. A NEW CONNECTION PER CALL
#    No Session, so every request does a TCP handshake and a TLS
#    negotiation. For a list of 40 pages that is 40 handshakes, usually
#    most of the elapsed time.
#
# 3. r.json() WITH NO STATUS CHECK
#    A 500 returning an HTML error page reaches .json() and raises
#    JSONDecodeError -- an error about parsing, blaming the wrong
#    system. Worse: a 404 returning {"error": "not found"} parses fine
#    and is returned as if it were an order.
#
# 4. OFFSET PAGINATION, UNBOUNDED
#    Two faults: page numbers drift when rows are written during the
#    scan (rows re-read and skipped), and nothing bounds the loop -- an
#    API that keeps returning data spins forever.
#
# 5. THE WHOLE RESULT ACCUMULATED IN A LIST
#    orders.extend(...) per page: memory scales with the dataset, and
#    the caller cannot start work until the last page arrives.
#
# 6. THE REFUND RETRY CAN TRIPLE-CHARGE  <- the money bug
#
#    POST is not idempotent. If the first attempt SUCCEEDS but the
#    response is lost -- a timeout, a dropped connection -- the loop
#    retries and refunds again. Three attempts, three refunds, and the
#    caller sees a failure.
#
#    The bare "except Exception: pass" makes it worse: it swallows the
#    evidence, so the logs show one failed refund rather than three
#    successful ones.
#
# 7. except Exception: pass
#    Hides everything, including a bug in our own code -- a TypeError
#    from a bad argument is retried three times and then reported as
#    "refund failed" (Lesson 6.5).
#
# 8. raise Exception(...)
#    Callers cannot distinguish "the partner is down, retry later" from
#    "this refund is invalid, do not retry". Every consumer ends up
#    matching on the message string.


from __future__ import annotations

import itertools
import logging
import random
import time
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from decimal import Decimal

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

log = logging.getLogger(__name__)

RETRYABLE = {429, 502, 503, 504}
MAX_PAGES = 10_000


# ---- FIX 8: exceptions a caller can act on ------------------------------

class PartnerError(Exception):
    """Base: catch this to mean 'came from the partner client'."""


class PartnerUnavailable(PartnerError):
    """Transient — a retry may help."""


class PartnerRejected(PartnerError):
    """Terminal — the request was wrong; retrying cannot help."""


@dataclass(frozen=True, slots=True)
class Order:
    id: str
    total: Decimal
    status: str

    @classmethod
    def from_payload(cls, p: dict) -> "Order":
        return cls(p["order_id"], Decimal(str(p["amount_cents"])) / 100,
                   p["state"].lower())


class PartnerClient:
    def __init__(self, base: str, *, pool_size: int = 20,
                 connect: float = 3.05, read: float = 10.0) -> None:
        self._base = base.rstrip("/")
        self._timeout = (connect, read)          # FIX 1
        self._session = self._build_session(pool_size)

    @staticmethod
    def _build_session(pool_size: int) -> requests.Session:
        """FIX 2: one Session for the life of the client. Its pool is
        sized to our worker count, or threads block INSIDE requests and
        the concurrency we configured is imaginary."""
        session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=0.3,
            status_forcelist=sorted(RETRYABLE),
            # FIX 6a: POST is NOT here. Retrying a non-idempotent
            # request is how a timeout becomes a double refund.
            allowed_methods={"GET", "HEAD", "PUT", "DELETE", "OPTIONS"},
            respect_retry_after_header=True,
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry,
                              pool_connections=pool_size,
                              pool_maxsize=pool_size)
        session.mount("https://", adapter)
        session.headers.update({
            "User-Agent": "acme-billing/1.4",
            "Accept": "application/json",
        })
        return session

    # ---- FIX 3: one place that turns a response into a result or an
    #      exception, so no caller ever sees a raw requests object -----

    def _handle(self, response: requests.Response, *, context: str) -> dict:
        if response.status_code >= 500:
            raise PartnerUnavailable(f"{context}: {response.status_code}")
        if response.status_code == 429:
            raise PartnerUnavailable(f"{context}: rate limited")
        if 400 <= response.status_code < 500:
            raise PartnerRejected(f"{context}: {response.status_code} "
                                  f"{response.text[:200]}")
        try:
            return response.json()
        except ValueError as exc:
            # A 200 with a non-JSON body is the partner's bug, not a
            # parsing problem in ours -- say so.
            raise PartnerUnavailable(f"{context}: malformed JSON") from exc

    def _request(self, method: str, path: str, **kwargs) -> dict:
        try:
            response = self._session.request(
                method, f"{self._base}{path}", timeout=self._timeout, **kwargs)
        except requests.Timeout as exc:
            raise PartnerUnavailable(f"{method} {path}: timed out") from exc
        except requests.RequestException as exc:
            raise PartnerUnavailable(f"{method} {path}: {exc}") from exc
        return self._handle(response, context=f"{method} {path}")

    # ---- reads ---------------------------------------------------------

    def get_order(self, order_id: str) -> Order:
        return Order.from_payload(self._request("GET", f"/orders/{order_id}"))

    def iter_orders(self, since: str) -> Iterator[Order]:
        """FIX 4 + 5: cursor pagination, bounded, and a GENERATOR.

        Memory is one page regardless of dataset size, and a caller
        taking the first 50 makes one request rather than 400
        (Lesson 8.1).
        """
        path = "/orders"
        params: dict | None = {"since": since, "limit": 100}
        seen: set[str] = set()

        for page in itertools.count(1):
            if path in seen:
                raise PartnerUnavailable(f"pagination loop at page {page}")
            if page > MAX_PAGES:
                raise PartnerUnavailable(f"runaway pagination past {MAX_PAGES}")
            seen.add(path)

            body = self._request("GET", path, params=params)
            for item in body["data"]:
                yield Order.from_payload(item)

            # Follow the server's cursor rather than computing offsets:
            # a cursor encodes a position, so concurrent writes cannot
            # cause rows to be re-read or skipped.
            nxt = body.get("next")
            if not nxt:
                return
            path, params = nxt, None

    # ---- writes --------------------------------------------------------

    def create_refund(self, order_id: str, amount: Decimal,
                      *, attempts: int = 3) -> dict:
        """FIX 6: an idempotency key, generated ONCE for the whole
        logical refund. A fresh key per attempt is the same as no key --
        the partner would see three distinct refunds.

        FIX 7: only transient failures are retried; a PartnerRejected
        propagates on the first attempt.
        """
        key = str(uuid.uuid4())
        payload = {"order": order_id, "amount": str(amount)}
        last: PartnerUnavailable | None = None

        for attempt in range(attempts):
            try:
                return self._request(
                    "POST", "/refunds", json=payload,
                    headers={"Idempotency-Key": key},
                )
            except PartnerRejected:
                # Terminal. Retrying an invalid refund three times just
                # wastes three round trips and delays the error.
                raise
            except PartnerUnavailable as exc:
                last = exc
                if attempt == attempts - 1:
                    break
                # Full jitter: uniform(0, cap). A fixed schedule
                # synchronises every client into waves that re-break a
                # recovering service (Lesson 6.5).
                time.sleep(random.uniform(0, 0.3 * 2 ** attempt))
                log.warning("refund retry", extra={
                    "order_id": order_id, "attempt": attempt + 1,
                    "idempotency_key": key,
                })

        raise PartnerUnavailable(f"refund failed after {attempts} attempts") from last


# =========================================================================
# WHY r.json() WITHOUT A STATUS CHECK IS ITS OWN BUG
# =========================================================================
#
# Two distinct failures, and the second is worse:
#
#   a) A 500 returning an HTML error page raises JSONDecodeError. The
#      traceback says "Expecting value: line 1 column 1", which sends
#      whoever is debugging to the parser rather than to the partner.
#
#   b) A 404 returning {"error": "not found"} parses PERFECTLY. The
#      function returns that dict, and the caller treats it as an
#      order -- so the failure surfaces later as a KeyError on
#      "amount_cents", somewhere unrelated.
#
# (b) is the reason to check the status FIRST. A well-formed error body
# is indistinguishable from a result unless you look at the code that
# was designed to tell you (Lesson 12.1).


# =========================================================================
# TESTS
# =========================================================================

import pytest
import responses


@responses.activate
def test_every_request_has_a_timeout():
    """PROBLEM 1 — the outage. Asserted on the call, so a future
    refactor cannot drop it."""
    captured = {}

    def record(request):
        captured["timeout"] = request.req_kwargs.get("timeout")
        return 200, {}, '{"order_id": "o-1", "amount_cents": 100, "state": "PAID"}'

    responses.add_callback(responses.GET, f"{BASE}/orders/o-1", record)
    PartnerClient(BASE).get_order("o-1")

    assert captured["timeout"] == (3.05, 10.0)


@responses.activate
def test_an_error_body_is_not_returned_as_data():
    """PROBLEM 3(b). A 404 with valid JSON parses fine and must NOT be
    returned as an order."""
    responses.add(responses.GET, f"{BASE}/orders/o-1",
                  json={"error": "not found"}, status=404)

    with pytest.raises(PartnerRejected):
        PartnerClient(BASE).get_order("o-1")


@responses.activate
def test_a_non_json_500_blames_the_partner_not_the_parser():
    """PROBLEM 3(a)."""
    responses.add(responses.GET, f"{BASE}/orders/o-1",
                  body="<html>502 Bad Gateway</html>", status=502)

    with pytest.raises(PartnerUnavailable):
        PartnerClient(BASE).get_order("o-1")


@responses.activate
def test_refund_retries_reuse_one_idempotency_key():
    """PROBLEM 6 — the money bug. Three attempts must present ONE key,
    or the partner sees three distinct refunds."""
    keys = []

    def record(request):
        keys.append(request.headers["Idempotency-Key"])
        if len(keys) < 3:
            return 503, {}, ""
        return 200, {}, '{"refund_id": "r-1"}'

    responses.add_callback(responses.POST, f"{BASE}/refunds", record)
    PartnerClient(BASE).create_refund("o-1", Decimal("10.00"))

    assert len(keys) == 3
    assert len(set(keys)) == 1


@responses.activate
def test_a_rejected_refund_is_not_retried():
    """PROBLEM 7. A 422 will be a 422 next time; three attempts waste
    three round trips and delay the error."""
    calls = []
    responses.add_callback(
        responses.POST, f"{BASE}/refunds",
        lambda r: calls.append(1) or (422, {}, '{"error": "already refunded"}'))

    with pytest.raises(PartnerRejected):
        PartnerClient(BASE).create_refund("o-1", Decimal("10.00"))

    assert len(calls) == 1


@responses.activate
def test_pagination_streams_and_stops_early():
    """PROBLEM 5. Taking two orders must make one request, not forty."""
    requests_made = []

    def page(request):
        requests_made.append(request.url)
        return 200, {}, json.dumps({
            "data": [{"order_id": f"o-{i}", "amount_cents": 100,
                      "state": "PAID"} for i in range(100)],
            "next": "/orders?cursor=abc",
        })

    responses.add_callback(responses.GET, f"{BASE}/orders", page)

    got = list(itertools.islice(PartnerClient(BASE).iter_orders("2026-01-01"), 2))

    assert len(got) == 2
    assert len(requests_made) == 1


@responses.activate
def test_a_pagination_loop_is_detected():
    """PROBLEM 4. An API returning the same cursor twice must not spin
    forever."""
    responses.add(responses.GET, f"{BASE}/orders", json={
        "data": [{"order_id": "o-1", "amount_cents": 1, "state": "PAID"}],
        "next": "/orders",          # points at itself
    })

    with pytest.raises(PartnerUnavailable, match="pagination loop"):
        list(PartnerClient(BASE).iter_orders("2026-01-01"))


@responses.activate
def test_connections_are_reused():
    """PROBLEM 2. One Session, one connection pool, not 40 handshakes."""
    client = PartnerClient(BASE)
    adapter = client._session.get_adapter("https://x")

    assert adapter._pool_maxsize == 20
    assert client._session is client._session      # held, not per call`,
        notes: [
          { t: "p", text: "**The missing timeout caused the outage, and the mechanism is worth spelling out.** Blocked workers filled the pool, queued requests filled the queue, and eventually the health-check endpoint could not be served either — so the orchestrator restarted a process that was not broken, into the same condition. One slow dependency became total unavailability." },
          { t: "p", text: "**Generating the idempotency key outside the retry loop is the difference between a fix and a bug that looks like a fix.** A fresh key per attempt is identical to no key at all: the partner sees three distinct refunds and honours all three. The test asserting `len(set(keys)) == 1` is the only thing that catches it." },
          { t: "p", text: "**Checking the status before parsing catches the error body that parses cleanly.** A 404 returning `{\"error\": \"not found\"}` is valid JSON, so `r.json()` succeeds and the caller receives it as an order — surfacing much later as a `KeyError` somewhere unrelated (Lesson 12.1)." },
          { t: "callout", kind: "insight", title: "Splitting the exception hierarchy is what makes the retry loop correct", body: [
            { t: "p", text: "`PartnerRejected` propagates on the first attempt and `PartnerUnavailable` is retried. That distinction is what stops a 422 costing three round trips, and it lives in the type rather than in an `if` the next person can delete." },
            { t: "p", text: "It also gives callers something to act on: catch `PartnerUnavailable` to degrade gracefully, let `PartnerRejected` surface as a user-visible error (Lesson 6.3)." }
          ]},
          { t: "p", text: "**The pagination generator makes early termination free.** Taking two orders makes one request rather than forty, and the loop guard turns an API returning the same cursor twice into a clear error instead of an infinite loop that looks like a hang." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's checkout service becomes unavailable for forty minutes. Their own infrastructure is healthy, their database is fine, and their error rate is zero — because no requests are completing at all." },
      { t: "p", text: "**A payment partner had slowed to about ninety seconds per response.** The client had no timeout, so every worker thread that touched checkout blocked. The pool filled, the queue behind it filled, and then the liveness probe — served by the same workers — began timing out." },
      { t: "p", text: "**The orchestrator restarted the pods**, which came up healthy, accepted traffic, filled their pools again within seconds, and were restarted again. The restart loop made the outage look like an infrastructure problem and cost half an hour of investigation in the wrong place." },
      { t: "p", text: "**One argument would have prevented it**: `timeout=(3.05, 10)`. The checkout would have failed fast, the error rate would have spiked and named the partner, and the rest of the service would have kept serving. **A missing timeout does not slow you down — it converts someone else's degradation into your outage.**" }
    ]}
  ],

  takeaways: [
    "**`requests` has no default timeout.** One slow dependency then fills your worker pool, your queue, and eventually your health check — turning their degradation into your outage.",
    "**Use `timeout=(connect, read)`.** A healthy host connects in milliseconds, so the connect budget is small; the read timeout is between bytes, not for the whole response.",
    "**A read timeout does not bound total duration.** For that you need your own deadline, computed with `time.monotonic`.",
    "**Build one `Session` or `Client` and hold it.** Per-call construction pays a TLS handshake every time, which usually dominates the latency.",
    "**Size the client's connection pool to your worker count**, or threads block inside the library and your configured concurrency is imaginary.",
    "**Retry only idempotent methods automatically.** `allowed_methods` left at its default is how a timed-out `POST` becomes a double charge.",
    "**Exclude 500 from the retry list.** It is usually a deterministic bug on their side; 429, 502, 503 and 504 are the ones that say \"later\".",
    "**Generate an idempotency key once per logical operation**, outside the retry loop — a fresh key per attempt is the same as no key.",
    "**Use full jitter**, and honour `Retry-After` when the server sends it. A fixed schedule synchronises clients into waves that re-break a recovering service.",
    "**Check the status before parsing.** An error body that happens to be valid JSON is indistinguishable from a result otherwise.",
    "**Yield pages, never accumulate them**, and follow the server's cursor rather than computing offsets — offsets drift when data is written mid-scan.",
    "**Translate at your boundary.** Your own exception types and your own dataclasses mean a vendor rename or a library swap changes one file."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A partner slows to 90 seconds per response and the whole service becomes unavailable, with an error rate of zero. What was missing?",
        options: [
          "A circuit breaker around the partner",
          "A timeout — `requests` waits forever, so workers blocked, the pool filled, and eventually the health check could not be served",
          "More worker threads",
          "Retries with exponential backoff"
        ],
        answer: 1,
        why: "The error rate was zero because nothing completed, successfully or otherwise. A timeout would have failed checkout fast, spiked the error rate with the partner named, and left the rest of the service serving. A circuit breaker helps too, and is machinery you add after the one argument that prevents the outage."
      },
      {
        stem: "A refund retry loop generates a new `uuid4()` idempotency key on each attempt. What happens when the first attempt succeeds but the response is lost?",
        options: [
          "The partner recognises the retry and returns the original refund",
          "The partner sees a different key, treats it as a new request, and refunds again — the key achieves nothing",
          "The retry is rejected as a duplicate",
          "The refund is rolled back automatically"
        ],
        answer: 1,
        why: "An idempotency key works by letting the server recognise a repeated request. A fresh key per attempt is functionally identical to no key at all, and the code looks correct in review. The key must be generated once for the whole logical operation, and a test asserting all attempts share one key is what catches the difference."
      },
      {
        stem: "`return r.json()` with no status check. The API returns 404 with `{\"error\": \"not found\"}`. What happens?",
        options: [
          "`json()` raises because the status is not 2xx",
          "It parses fine and the error dict is returned as if it were data, surfacing later as a `KeyError` somewhere unrelated",
          "`requests` raises automatically on 4xx",
          "The response body is empty for 404s"
        ],
        answer: 1,
        why: "A well-formed error body is indistinguishable from a result unless you check the code designed to tell you. The related failure is a 500 returning HTML, which raises `JSONDecodeError` and sends whoever is debugging to the parser instead of the partner. Check the status first, then parse."
      },
      {
        stem: "Why prefer cursor pagination over `?page=N&limit=100` when reading a large collection?",
        options: [
          "Cursors are faster for the server to compute",
          "Offsets drift when rows are written during the scan, so pages re-read and skip records; a cursor encodes a position and is stable",
          "Page numbers have a maximum value",
          "Cursors allow parallel fetching"
        ],
        answer: 1,
        why: "An offset means \"skip the first N rows of the current result\", and the current result changes as data is written — so a row inserted before your position pushes one across a page boundary and you never see it. A cursor names where you were. Bound the loop and track seen cursors too: an API returning the same cursor twice is not hypothetical."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What do you configure on an HTTP client before using it in production?",
        strong: "A timeout on every call, a session so connections are reused, a connection pool sized to the worker count, and a retry policy restricted to idempotent methods and transient statuses.",
        answer: [
          { t: "p", text: "Leading with the timeout is right, because it is the default that causes outages rather than slowness — and the mechanism, workers filling until the health check fails, is worth describing." },
          { t: "p", text: "The `allowed_methods` detail shows first-hand experience: leaving it at the default is what turns a timed-out POST into a double charge." },
          { t: "p", text: "Sizing the pool to the worker count is the one people miss, and it makes the difference between configured concurrency and real concurrency." }
        ]
      },
      {
        level: "advanced",
        q: "How do you consume a paginated API over a million records?",
        strong: "A generator that yields items and follows the server's cursor, so memory is one page and a caller can stop early. Bound the loop and track seen cursors, because an API repeating a cursor is a real failure mode.",
        answer: [
          { t: "p", text: "The offset-drift argument is the substance: page numbers are unstable under concurrent writes, so rows get re-read and skipped in ways that look like data loss." },
          { t: "p", text: "Yielding rather than accumulating is what makes early termination free — taking fifty records makes one request rather than four hundred." },
          { t: "p", text: "Mentioning the runaway guard shows you have been bitten: an unbounded `while True` around someone else's cursor is a hang with no diagnostic." }
        ]
      },
      {
        level: "advanced",
        q: "How would you structure the code that talks to a third-party API?",
        strong: "Behind a client class that owns the session, translates their errors into my own exception hierarchy, and maps their payloads into my own types. Callers depend on my boundary, not on `requests` or their field names.",
        answer: [
          { t: "p", text: "The two-boundary framing — exceptions and types — is what makes it concrete, and each has a distinct payoff: swapping the HTTP library, and absorbing an upstream rename." },
          { t: "p", text: "Splitting transient from terminal errors is what lets the retry logic be correct without an `if` on status codes at every call site." },
          { t: "p", text: "Being clear about the limit keeps it honest: the boundary is the module that owns the dependency, not a wrapper around every function that calls through it." }
        ]
      }
    ]
  }
});
