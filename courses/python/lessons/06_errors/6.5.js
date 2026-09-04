/* ============================================================================
   LESSON 6.5 — Defensive Programming and Error Strategy
   ========================================================================= */
EC.receiveLesson({
  id: "6.5",

  lede: "Every `try` is a decision about what should happen when the world misbehaves, and most codebases make that decision one line at a time until nobody can describe the system's behaviour under failure. **A strategy is a small number of rules applied consistently**: validate at the boundary, fail fast on bugs, degrade on dependencies, and never retry something you cannot safely do twice.",

  objectives: [
    "Decide between failing fast and degrading gracefully for a given failure",
    "Place validation at boundaries and trust internal calls",
    "Use `assert` correctly, and know why it must never guard production behaviour",
    "Retry only what is safe to retry, with backoff, jitter and a budget",
    "Recognise a retry storm and explain why a circuit breaker stops it"
  ],

  prerequisites: ["6.3", "6.4"],

  blocks: [

    { t: "h2", n: "01", text: "Two failure modes, two responses", id: "two" },

    { t: "table",
      head: ["", "Fail fast", "Degrade gracefully"],
      rows: [
        ["The failure is", "A bug, a broken invariant, a misconfiguration", "A dependency being slow, absent or rate limited"],
        ["Continuing would", "Produce or persist wrong data", "Produce a smaller but correct result"],
        ["Response", "Raise, crash, refuse to start", "Fallback, cached value, reduced feature"],
        ["Examples", "Missing `DATABASE_URL` at startup; a negative price; an unknown enum value", "Recommendations service down → show popular items; analytics write fails → drop it"],
        ["The trap", "Being defensive about your own bugs and hiding them", "Degrading something that was never optional, so a partial result looks complete"]
      ],
      caption: "**The question is what a wrong answer costs.** A recommendations panel that falls back to \"popular this week\" is a slightly worse page. A balance that falls back to a cached value is a customer told the wrong number."
    },

    { t: "callout", kind: "trap", title: "The defensive `except` that hides your own bugs", body: [
      { t: "code", lang: "python", title: "what this actually catches", numbered: false, code: `
def get_total(order):
    try:
        return sum(line.price * line.quantity for line in order.lines)
    except Exception:
        return 0                    # "defensive"

# It also catches:
#   AttributeError  -- order.lines was renamed and this was missed
#   TypeError       -- price arrived as a string from a new endpoint
#   KeyError        -- a refactor changed the shape of a line
#
# Each of those is a BUG, and each now silently bills the customer zero.`},
      { t: "p", text: "This is the most common piece of \"defensive\" code in any large Python codebase, and it defends nothing. The dependency failures it was written for do not occur here — the function performs arithmetic. What it catches instead are the mistakes that a traceback would have found in staging." },
      { t: "p", text: "**Catch what you can handle, at the layer that can handle it.** If the answer to \"what do I do with this exception\" is \"return a plausible-looking value\", the correct answer is almost always to let it propagate (Lesson 6.1)." }
    ]},

    { t: "h2", n: "02", text: "Validate at the boundary", id: "boundary" },

    { t: "p", text: "Data that enters your system from outside — an HTTP body, a CSV, a queue message, an environment variable — is untrusted and must be checked once, thoroughly, at the point it arrives. Data that has passed that check is trusted, and re-checking it in every function downstream is noise that also gives false confidence." },

    { t: "viz",
      title: "One validation boundary, not fifteen defensive checks",
      caption: "Parse untrusted input into a typed object at the edge, and everything inside can rely on the types. The checks people scatter through internal functions are guarding against their own bugs, which is what tests and a type checker are for.",
      svg: `<svg viewBox="0 0 900 290" role="img" aria-label="Diagram showing untrusted input passing through a single validation boundary into a trusted interior of typed objects">
  <defs>
    <marker id="bd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="40" width="186" height="150" rx="9" style="fill:none;stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="5 3"/>
  <text x="107" y="66" text-anchor="middle" class="s-label" style="fill:var(--crit)">UNTRUSTED</text>
  <text x="107" y="92" text-anchor="middle" class="s-sub">HTTP body</text>
  <text x="107" y="112" text-anchor="middle" class="s-sub">queue message</text>
  <text x="107" y="132" text-anchor="middle" class="s-sub">CSV upload</text>
  <text x="107" y="152" text-anchor="middle" class="s-sub">env var</text>
  <text x="107" y="176" text-anchor="middle" class="s-sub">anything you did not create</text>

  <line x1="204" y1="115" x2="240" y2="115" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#bd)"/>

  <rect x="244" y="40" width="212" height="150" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.6"/>
  <text x="350" y="66" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">THE BOUNDARY</text>
  <text x="350" y="92" text-anchor="middle" class="s-sub">parse, do not validate</text>
  <text x="350" y="114" text-anchor="middle" class="s-mono" style="font-size:10px">Order(**payload)</text>
  <text x="350" y="140" class="s-sub" text-anchor="middle">raises with a precise,</text>
  <text x="350" y="158" class="s-sub" text-anchor="middle">per-field message</text>
  <text x="350" y="178" class="s-sub" text-anchor="middle">— once, here</text>

  <line x1="460" y1="115" x2="496" y2="115" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#bd)"/>

  <rect x="500" y="40" width="386" height="150" rx="9" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="693" y="66" text-anchor="middle" class="s-label" style="fill:var(--good)">TRUSTED INTERIOR</text>
  <text x="693" y="92" text-anchor="middle" class="s-sub">every function takes an Order, not a dict</text>
  <text x="693" y="114" text-anchor="middle" class="s-sub">quantity is an int because the type says so</text>
  <text x="693" y="136" class="s-sub" text-anchor="middle">no isinstance checks, no "if not x: return None"</text>
  <text x="693" y="160" text-anchor="middle" class="s-sub">a failure here is a BUG — let it raise</text>

  <line x1="14" y1="216" x2="886" y2="216" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="14" y="242" class="s-sub" style="fill:var(--crit)">Defensive checks inside the trusted zone convert your bugs into wrong answers</text>
  <text x="14" y="266" class="s-sub" style="fill:var(--good)">Checks at the boundary convert bad input into a clear, actionable error message</text>
</svg>`
    },

    { t: "code", lang: "python", title: "parse, don't validate", code: `
from dataclasses import dataclass
from decimal import Decimal


class InvalidOrder(ValueError):
    def __init__(self, field: str, reason: str) -> None:
        super().__init__(f"{field}: {reason}")
        self.field, self.reason = field, reason


@dataclass(frozen=True, slots=True)
class Order:
    id: str
    quantity: int
    unit_price: Decimal

    @classmethod
    def parse(cls, payload: dict) -> "Order":
        """The ONLY place a raw payload becomes an Order."""
        try:
            quantity = int(payload["quantity"])
        except KeyError:
            raise InvalidOrder("quantity", "is required") from None
        except (TypeError, ValueError):
            raise InvalidOrder("quantity", "must be an integer") from None

        if quantity < 1:
            raise InvalidOrder("quantity", "must be at least 1")
        ...
        return cls(id=str(payload["id"]), quantity=quantity, unit_price=price)


# Everything downstream takes an Order and asks no questions
def total(order: Order) -> Decimal:
    return order.unit_price * order.quantity        # no checks needed
`,
      caption: "**A validated object is a different type from a raw payload.** Once `total` takes an `Order`, there is no code path where `quantity` is a string — so a check for one is dead code that a reader must still evaluate."
    },

    { t: "callout", kind: "warn", title: "`assert` is not error handling", body: [
      { t: "code", lang: "python", title: "python -O removes these entirely", numbered: false, code: `
def withdraw(account, amount):
    assert amount > 0, "amount must be positive"       # GONE under -O
    assert account.balance >= amount                   # GONE under -O
    account.balance -= amount

# Run with python -O (or PYTHONOPTIMIZE=1, which some base images set):
#   withdraw(acct, -500)  ->  silently CREDITS the account`},
      { t: "p", text: "`assert` compiles to nothing under `-O`. Any check that must hold in production has to be an `if` and a `raise`." },
      { t: "dl", items: [
        ["Use `assert` for", "Internal invariants you believe cannot be false — a sanity check on your own logic, documentation that the type checker cannot express, and anything in a test."],
        ["Use `if ... raise` for", "Anything involving input, configuration, external state or a caller's arguments. Which, in application code, is nearly everything."]
      ]},
      { t: "p", text: "A useful heuristic: **if the assertion firing would be somebody else's fault, it should not be an assert.**" }
    ]},

    { t: "h2", n: "03", text: "Timeouts", id: "timeouts" },

    { t: "p", text: "Every call that crosses a process boundary needs a timeout, and almost every library defaults to waiting forever. This is the single highest-value defensive measure in this lesson: an unbounded wait converts one slow dependency into a queue of stuck workers, and then into an outage of a service that was itself healthy." },

    { t: "code", lang: "python", title: "the defaults are all wrong", code: `
import requests
import socket

# requests: no timeout by default -- waits forever
requests.get(url)                                 # WRONG
requests.get(url, timeout=(3.05, 10))             # (connect, read)

# A database driver
psycopg.connect(dsn, connect_timeout=5)

# A raw socket
socket.setdefaulttimeout(10)

# asyncio
async with asyncio.timeout(10):
    await client.fetch(url)
`,
      caption: "Split connect and read timeouts where the library allows it: **a connect timeout should be short** (a healthy service accepts in milliseconds) while a read timeout depends on the work being asked for."
    },

    { t: "callout", kind: "insight", title: "A timeout budget, not per-call timeouts", body: [
      { t: "p", text: "If your API promises a response in 2 seconds and calls three services with a 10-second timeout each, the promise is fiction. Timeouts must be derived from what the **caller** is willing to wait, and the remaining budget passed down." },
      { t: "code", lang: "python", title: "budget arithmetic", numbered: false, code: `
import time

class Budget:
    def __init__(self, seconds: float) -> None:
        self._deadline = time.monotonic() + seconds     # monotonic, not time()

    def remaining(self) -> float:
        left = self._deadline - time.monotonic()
        if left <= 0:
            raise TimeoutError("budget exhausted")
        return left

budget = Budget(2.0)
profile = client.get("/profile", timeout=budget.remaining())
orders = client.get("/orders", timeout=budget.remaining())`},
      { t: "p", text: "`time.monotonic()` rather than `time.time()`: the wall clock can jump backwards when NTP corrects it, and a deadline computed from it then never expires (Lesson 2.7)." }
    ]},

    { t: "h2", n: "04", text: "Retries", id: "retries" },

    { t: "p", text: "A retry is a bet that the same request will succeed later. That bet is only safe when the operation is **idempotent** — running it twice has the same effect as running it once — and only useful when the failure was **transient**. Retrying anything else multiplies damage." },

    { t: "table",
      head: ["Failure", "Retry?", "Why"],
      rows: [
        ["Connection timeout, connection refused", "**Yes**", "The request may never have arrived"],
        ["HTTP 503, 502, 504", "**Yes**", "The server said it is temporarily unable"],
        ["HTTP 429", "**Yes**, after `Retry-After`", "Explicitly transient, and the server told you when"],
        ["HTTP 500", "Cautiously", "May be a deterministic bug — retrying costs and rarely helps"],
        ["HTTP 400, 422", "**No**", "The request is wrong; it will be wrong next time"],
        ["HTTP 401, 403", "**No**", "Retry after refreshing credentials, not before"],
        ["**Read timeout on a write**", "**Only with an idempotency key**", "The write may have succeeded — this is the dangerous one"]
      ],
      caption: "The last row is where money gets charged twice. A read timeout tells you nothing about whether the server processed the request; it only tells you the answer did not come back."
    },

    { t: "viz",
      title: "Why retries need jitter",
      caption: "When a dependency recovers, every client that failed at the same moment retries at the same moment. Fixed backoff synchronises them into waves that knock the service down again. Random jitter spreads the same number of requests over the window.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram contrasting synchronised retry spikes from fixed backoff with the smooth distribution produced by jittered backoff">
  <text x="14" y="26" class="s-label" style="fill:var(--crit)">FIXED BACKOFF — every client retries at t+1, t+2, t+4</text>

  <line x1="14" y1="132" x2="886" y2="132" class="s-stroke" stroke-width="1"/>

  <rect x="120" y="52" width="16" height="80" style="fill:var(--crit)"/>
  <rect x="300" y="44" width="16" height="88" style="fill:var(--crit)"/>
  <rect x="620" y="60" width="16" height="72" style="fill:var(--crit)"/>

  <line x1="14" y1="52" x2="886" y2="52" style="stroke:var(--crit)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="800" y="46" class="s-sub" style="fill:var(--crit)">capacity</text>

  <text x="128" y="150" text-anchor="middle" class="s-mono" style="font-size:9px">t+1</text>
  <text x="308" y="150" text-anchor="middle" class="s-mono" style="font-size:9px">t+2</text>
  <text x="628" y="150" text-anchor="middle" class="s-mono" style="font-size:9px">t+4</text>
  <text x="360" y="150" class="s-sub" style="fill:var(--crit)">— each spike re-breaks the service that was recovering</text>

  <line x1="14" y1="176" x2="886" y2="176" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="14" y="204" class="s-label" style="fill:var(--good)">FULL JITTER — sleep = random.uniform(0, base * 2 ** attempt)</text>

  <line x1="14" y1="282" x2="886" y2="282" class="s-stroke" stroke-width="1"/>
  <line x1="14" y1="230" x2="886" y2="230" style="stroke:var(--good)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="800" y="224" class="s-sub" style="fill:var(--good)">capacity</text>

  <g style="fill:var(--good)">
    <rect x="60" y="258" width="12" height="24"/><rect x="110" y="252" width="12" height="30"/>
    <rect x="168" y="262" width="12" height="20"/><rect x="222" y="250" width="12" height="32"/>
    <rect x="284" y="258" width="12" height="24"/><rect x="336" y="254" width="12" height="28"/>
    <rect x="398" y="260" width="12" height="22"/><rect x="452" y="250" width="12" height="32"/>
    <rect x="512" y="256" width="12" height="26"/><rect x="566" y="262" width="12" height="20"/>
    <rect x="628" y="252" width="12" height="30"/><rect x="684" y="258" width="12" height="24"/>
    <rect x="742" y="254" width="12" height="28"/><rect x="800" y="260" width="12" height="22"/>
  </g>

  <text x="360" y="300" class="s-sub" style="fill:var(--good)">same total requests, none of them simultaneous</text>
</svg>`
    },

    { t: "ladder",
      title: "A retry loop",
      rungs: [
        { level: "bad", label: "Retry everything, immediately",
          why: "Retries a 400 that will never succeed, hammers a struggling service with no pause, and swallows the final failure so the caller gets `None` and no idea why.",
          code: `for _ in range(5):
    try:
        return client.post("/charge", json=payload)
    except Exception:
        continue
return None` },
        { level: "ok", label: "Selective, with exponential backoff",
          why: "Only transient failures are retried, the delay grows, and the last exception propagates. But every client backs off on the same schedule, so recovery produces synchronised waves — and a write is still being retried without an idempotency key.",
          code: `for attempt in range(5):
    try:
        return client.post("/charge", json=payload)
    except TransientError:
        if attempt == 4:
            raise
        time.sleep(2 ** attempt)` },
        { level: "best", label: "Jittered, budgeted, idempotent",
          why: "Jitter desynchronises clients. The budget caps total time so a caller's own deadline is respected. The idempotency key makes a retried write safe even when the first attempt actually succeeded. And a `RateLimited` uses the delay the server asked for.",
          code: `import random
import uuid

def call_with_retries(fn, *, attempts=4, base=0.2, budget=None):
    key = str(uuid.uuid4())          # SAME key for every attempt
    for attempt in range(attempts):
        try:
            return fn(idempotency_key=key)

        except RateLimited as err:
            delay = err.retry_after              # obey the server
        except TransientError:
            if attempt == attempts - 1:
                raise
            delay = random.uniform(0, base * 2 ** attempt)   # full jitter

        if budget is not None:
            delay = min(delay, budget.remaining())
        time.sleep(delay)`,
          note: "The idempotency key is generated **once, outside the loop**. A fresh key per attempt is the same as no key at all — the server sees each retry as a new request and charges again." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "When to stop retrying entirely", body: [
      { t: "p", text: "Retries help when a failure is isolated. When a dependency is *down*, every client retrying multiplies load on the thing least able to handle it — and holds a worker per attempt, so your own service saturates while waiting on one that cannot answer." },
      { t: "table",
        head: ["Mechanism", "What it does", "Cost"],
        rows: [
          ["**Retry budget**", "Cap retries as a fraction of total requests (say 10%), globally", "Simple, effective, and often enough on its own"],
          ["**Circuit breaker**", "After N consecutive failures, fail immediately for a cooldown, then let one probe through", "State to manage; a mistuned breaker opens on noise"],
          ["**Bulkhead**", "Cap concurrent calls to each dependency", "One slow dependency cannot consume every worker"],
          ["**Load shedding**", "Reject new work when the queue exceeds a depth", "Fast failure beats a timeout for everyone"]
        ]
      },
      { t: "p", text: "**Start with the budget.** A circuit breaker is the well-known answer and the more complex one; a global cap on retry traffic prevents the same disaster with a counter. Add a breaker when you have measured that you need it (Lesson 14.5)." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A resilient call wrapper",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Build the wrapper a service uses for every outbound call. The interesting requirements are the ones that stop it making things worse: it must never retry a non-idempotent write without a key, never exceed the caller's deadline, and never keep hammering a dependency that is clearly down." },
        { t: "p", text: "Assume the exception hierarchy from Lesson 6.3 — `TransientError`, `RateLimited`, and terminal errors under `PaymentRejected`." }
      ],
      requirements: [
        "Retry only transient failures; terminal ones propagate on the first attempt.",
        "Full jitter on the backoff, and obey `Retry-After` when the server supplies it.",
        "Accept a deadline and never sleep past it — a caller waiting 2s must not wait 9s.",
        "Generate one idempotency key per logical operation, not per attempt.",
        "Open a circuit after repeated failures, fail fast while open, and probe once after a cooldown.",
        "Log each retry at the right level, with structured fields.",
        "Test: a decline is not retried, jitter stays within bounds, the deadline is respected, and the circuit opens and recovers."
      ],
      hint: "For the deadline, remember `time.monotonic()`. For the circuit, the hard part is not opening it — it is the half-open state that lets exactly one request through to find out whether the dependency recovered.",
      solution: {
        lang: "python",
        title: "resilient.py",
        code: `from __future__ import annotations

import logging
import random
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import TypeVar

log = logging.getLogger(__name__)

T = TypeVar("T")


class TransientError(Exception):
    """Retrying may help."""


class RateLimited(TransientError):
    def __init__(self, message: str, *, retry_after: float) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class TerminalError(Exception):
    """Retrying cannot help. Never caught by the retry loop."""


class CircuitOpen(TransientError):
    """We refused to call at all. Transient by nature -- it will close."""


# ---- deadline ------------------------------------------------------------

class Deadline:
    """monotonic, not time(): the wall clock jumps when NTP corrects it,
    and a deadline computed from it can then never expire."""

    __slots__ = ("_at",)

    def __init__(self, seconds: float) -> None:
        self._at = time.monotonic() + seconds

    def remaining(self) -> float:
        return max(0.0, self._at - time.monotonic())

    def expired(self) -> bool:
        return self.remaining() <= 0


# ---- circuit breaker -----------------------------------------------------

class State(Enum):
    CLOSED = "closed"        # normal
    OPEN = "open"            # failing fast
    HALF_OPEN = "half_open"  # one probe in flight


@dataclass
class CircuitBreaker:
    """Stops a struggling dependency being hammered by every client.

    HALF_OPEN is the state people omit, and it is the whole point: after
    the cooldown exactly ONE request is allowed through to discover
    whether the dependency recovered. Letting everything through at once
    re-breaks a service that was coming back.
    """

    failure_threshold: int = 5
    cooldown: float = 30.0

    state: State = State.CLOSED
    _failures: int = 0
    _opened_at: float = field(default=0.0)
    _probe_in_flight: bool = False

    def before_call(self) -> None:
        if self.state is State.OPEN:
            if time.monotonic() - self._opened_at < self.cooldown:
                raise CircuitOpen("circuit is open -- not calling")
            self.state = State.HALF_OPEN
            self._probe_in_flight = False

        if self.state is State.HALF_OPEN:
            if self._probe_in_flight:
                raise CircuitOpen("probe already in flight")
            self._probe_in_flight = True

    def on_success(self) -> None:
        if self.state is State.HALF_OPEN:
            log.info("circuit closed", extra={"previous_failures": self._failures})
        self.state = State.CLOSED
        self._failures = 0
        self._probe_in_flight = False

    def on_failure(self) -> None:
        self._failures += 1
        self._probe_in_flight = False

        # A failed probe reopens immediately -- do not spend the whole
        # threshold again proving the dependency is still down.
        if self.state is State.HALF_OPEN or self._failures >= self.failure_threshold:
            if self.state is not State.OPEN:
                log.warning("circuit opened", extra={
                    "consecutive_failures": self._failures,
                    "cooldown_seconds": self.cooldown,
                })
            self.state = State.OPEN
            self._opened_at = time.monotonic()


# ---- the wrapper ---------------------------------------------------------

def call_resiliently(
    operation: Callable[..., T],
    *,
    name: str,
    attempts: int = 4,
    base_delay: float = 0.2,
    max_delay: float = 5.0,
    deadline: Deadline | None = None,
    breaker: CircuitBreaker | None = None,
    sleep: Callable[[float], None] = time.sleep,
    rng: random.Random | None = None,
) -> T:
    """Call operation(idempotency_key=...) with retries.

    sleep and rng are injected so tests neither wait nor flake -- the
    seam that makes this testable at all (Lesson 5.12).
    """
    rng = rng or random.Random()

    # ONE key for the whole logical operation. A fresh key per attempt is
    # the same as no key: the server treats each retry as a new request
    # and charges the customer again.
    idempotency_key = str(uuid.uuid4())

    last: Exception | None = None

    for attempt in range(attempts):
        if deadline is not None and deadline.expired():
            raise TimeoutError(f"{name}: deadline exceeded before attempt {attempt + 1}")

        try:
            if breaker is not None:
                breaker.before_call()

            result = operation(idempotency_key=idempotency_key)

        except CircuitOpen:
            # Do not count this as an attempt against the dependency, and
            # do not sleep-and-retry into a circuit that is still open.
            raise

        except RateLimited as err:
            last = err
            if breaker is not None:
                breaker.on_failure()
            delay = err.retry_after                 # the server told us
            log.warning("rate limited, backing off", extra={
                "operation": name, "attempt": attempt + 1,
                "delay_seconds": delay,
            })

        except TransientError as err:
            last = err
            if breaker is not None:
                breaker.on_failure()
            if attempt == attempts - 1:
                log.error("giving up", extra={
                    "operation": name, "attempts": attempts,
                })
                raise
            # Full jitter: uniform(0, cap) rather than a fixed schedule,
            # so clients that failed together do not retry together.
            delay = rng.uniform(0, min(max_delay, base_delay * 2 ** attempt))
            log.warning("transient failure, retrying", extra={
                "operation": name, "attempt": attempt + 1,
                "delay_seconds": round(delay, 3),
                "error_type": type(err).__name__,
            })

        # TerminalError is NOT caught. It propagates on attempt 1, which
        # is the single most important line in this function.

        else:
            if breaker is not None:
                breaker.on_success()
            return result

        if deadline is not None:
            remaining = deadline.remaining()
            if delay >= remaining:
                # Sleeping past the caller's deadline helps nobody: they
                # have already given up by the time we wake.
                raise TimeoutError(f"{name}: deadline reached") from last
            delay = min(delay, remaining)

        sleep(delay)

    raise last or RuntimeError("unreachable")


# ---- tests ---------------------------------------------------------------

class FakeClock:
    def __init__(self) -> None:
        self.slept: list[float] = []

    def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)


def test_terminal_errors_are_not_retried() -> None:
    """THE requirement. A decline retried four times is four failed-payment
    emails and a fraud flag on the merchant account."""
    calls = 0

    def declines(**_):
        nonlocal calls
        calls += 1
        raise TerminalError("card declined")

    clock = FakeClock()
    try:
        call_resiliently(declines, name="charge", sleep=clock.sleep)
    except TerminalError:
        pass
    else:
        raise AssertionError("terminal error should propagate")

    assert calls == 1
    assert clock.slept == []                    # no backoff was even attempted


def test_one_key_for_every_attempt() -> None:
    """A new key per attempt makes the idempotency guarantee useless."""
    keys = []

    def flaky(*, idempotency_key):
        keys.append(idempotency_key)
        if len(keys) < 3:
            raise TransientError("503")
        return "ok"

    clock = FakeClock()
    assert call_resiliently(flaky, name="charge", sleep=clock.sleep) == "ok"
    assert len(keys) == 3
    assert len(set(keys)) == 1


def test_jitter_stays_within_the_exponential_cap() -> None:
    clock = FakeClock()
    rng = random.Random(0)

    def always_fails(**_):
        raise TransientError("503")

    try:
        call_resiliently(always_fails, name="x", attempts=4,
                         base_delay=0.2, sleep=clock.sleep, rng=rng)
    except TransientError:
        pass

    # Three sleeps for four attempts, each within (0, 0.2 * 2**attempt)
    assert len(clock.slept) == 3
    for attempt, delay in enumerate(clock.slept):
        assert 0 <= delay <= 0.2 * 2 ** attempt


def test_rate_limit_uses_the_servers_delay() -> None:
    clock = FakeClock()
    calls = 0

    def limited(**_):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RateLimited("429", retry_after=7.5)
        return "ok"

    assert call_resiliently(limited, name="x", sleep=clock.sleep) == "ok"
    assert clock.slept == [7.5]                 # not our jitter, theirs


def test_deadline_is_never_exceeded() -> None:
    """A caller who can wait 2 seconds must not be made to wait 9."""
    deadline = Deadline(0.0)                    # already expired

    def never_called(**_):
        raise AssertionError("should not have been attempted")

    try:
        call_resiliently(never_called, name="x", deadline=deadline)
    except TimeoutError:
        pass
    else:
        raise AssertionError("expected TimeoutError")


def test_circuit_opens_then_probes_then_closes() -> None:
    breaker = CircuitBreaker(failure_threshold=2, cooldown=0.0)
    clock = FakeClock()
    healthy = False

    def dependency(**_):
        if not healthy:
            raise TransientError("503")
        return "ok"

    # Two failures open it
    for _ in range(2):
        try:
            call_resiliently(dependency, name="x", attempts=1,
                             breaker=breaker, sleep=clock.sleep)
        except TransientError:
            pass
    assert breaker.state is State.OPEN

    # With cooldown 0 the next call becomes the half-open probe, and the
    # dependency has recovered, so the circuit closes.
    healthy = True
    assert call_resiliently(dependency, name="x", attempts=1,
                            breaker=breaker, sleep=clock.sleep) == "ok"
    assert breaker.state is State.CLOSED


def test_open_circuit_fails_without_calling() -> None:
    breaker = CircuitBreaker(failure_threshold=1, cooldown=60.0)
    breaker.on_failure()
    assert breaker.state is State.OPEN

    def must_not_run(**_):
        raise AssertionError("the circuit should have prevented this call")

    try:
        call_resiliently(must_not_run, name="x", breaker=breaker)
    except CircuitOpen:
        pass
    else:
        raise AssertionError("expected CircuitOpen")


if __name__ == "__main__":
    for t in (
        test_terminal_errors_are_not_retried,
        test_one_key_for_every_attempt,
        test_jitter_stays_within_the_exponential_cap,
        test_rate_limit_uses_the_servers_delay,
        test_deadline_is_never_exceeded,
        test_circuit_opens_then_probes_then_closes,
        test_open_circuit_fails_without_calling,
    ):
        t()
    print("selective, jittered, budgeted, idempotent, and it stops")`,
        notes: [
          { t: "p", text: "**`TerminalError` is not in a single `except` clause, and that is deliberate.** The absence is the design: anything the hierarchy calls terminal propagates on the first attempt with no code required. A retry loop that has to remember to check a status code will eventually forget (Lesson 6.3)." },
          { t: "p", text: "**One key outside the loop.** Generating it per attempt looks identical in a code review and destroys the guarantee — the server sees each retry as a distinct request and charges again. The test asserting `len(set(keys)) == 1` is the only thing that catches the difference." },
          { t: "p", text: "**Injecting `sleep` and `rng` is what makes this testable.** With real sleeping, the jitter test would take seconds and flake; with a real RNG it could not assert bounds at all. Two extra parameters convert an untestable resilience layer into one with seven deterministic tests." },
          { t: "callout", kind: "insight", title: "HALF_OPEN is the state people leave out", body: [
            { t: "p", text: "Opening a circuit is easy. The subtle part is what happens when the cooldown ends: if every waiting client is released at once, they arrive together at a service that has just started accepting connections and knock it straight back down." },
            { t: "p", text: "Half-open allows exactly one probe. Success closes the circuit; failure reopens it immediately, without spending another full threshold proving what one request already established." }
          ]},
          { t: "p", text: "**The deadline check appears twice** — before each attempt, and before each sleep — because both are ways to overrun it. Sleeping four seconds when the caller has 200 ms left is not resilience; the caller has already given up and the retry is pure load on a struggling dependency." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A recommendation service has a brief GC pause and 300 ms of requests time out. Every caller retries three times with a fixed one-second backoff. One second later, all of them retry simultaneously — a spike several times normal traffic into a service still recovering. It times out again. Two seconds later the same thing happens, bigger." },
      { t: "p", text: "**A 300 ms hiccup became a 20-minute outage**, and it spread: the callers held a worker per in-flight retry, so the API tier saturated and started timing out on requests that had nothing to do with recommendations." },
      { t: "p", text: "**Three changes ended it, in increasing order of complexity.** Full jitter — `random.uniform(0, cap)` instead of a fixed schedule — removed the synchronisation and would alone have prevented the escalation. A global retry budget capped retry traffic at 10% of requests. A circuit breaker made a fully-down dependency fail in microseconds rather than holding a worker for the timeout." },
      { t: "p", text: "**The lesson is that retries are load.** Every retry policy is also a load-amplification policy, and the amplification is largest exactly when the system can least afford it. Ask what your retry configuration does when a dependency is 100% down, not when it drops one request in a thousand." }
    ]}
  ],

  takeaways: [
    "**Fail fast on bugs and misconfiguration; degrade on dependencies.** The question is what a wrong answer costs — a fallback recommendation is fine, a fallback account balance is not.",
    "**`except Exception: return 0` catches your own bugs**, turning an `AttributeError` a traceback would have found into a customer billed zero.",
    "**Validate once at the boundary and trust the interior.** Parse untrusted input into a typed object; checks inside the trusted zone are guarding against your own bugs.",
    "**`assert` is removed by `python -O`**, so it must never guard production behaviour. If the assertion firing would be somebody else's fault, use `if ... raise`.",
    "**Every cross-process call needs a timeout** and almost every library defaults to waiting forever. Connect timeouts short, read timeouts sized to the work.",
    "**Derive timeouts from a budget**, not per call: three 10-second timeouts behind a 2-second promise is fiction. Compute deadlines with `time.monotonic()`.",
    "**Retry only transient failures on idempotent operations.** A read timeout on a write is the dangerous case — the write may have succeeded.",
    "**Generate one idempotency key per logical operation, outside the retry loop.** A fresh key per attempt is the same as no key at all.",
    "**Fixed backoff synchronises clients into waves** that re-break a recovering service. Full jitter — `random.uniform(0, cap)` — spreads the same load.",
    "**Obey `Retry-After` when the server sends it.** It knows more about its own recovery than your exponent does.",
    "**Retries are load amplification.** Ask what your policy does when a dependency is 100% down; a global retry budget is the simplest thing that prevents the disaster.",
    "**A circuit breaker's half-open state is the point** — one probe after the cooldown, not every waiting client at once."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `except Exception: return 0` inside a total-calculating function harmful?",
        options: [
          "It is slower than checking conditions explicitly",
          "It catches `AttributeError`, `TypeError` and `KeyError` from your own bugs and silently returns a plausible wrong number",
          "It prevents the caller from adding their own error handling",
          "`Exception` does not catch enough — `BaseException` is needed"
        ],
        answer: 1,
        why: "The function does arithmetic, so there are no dependency failures to defend against. What the clause actually catches are the mistakes a traceback would have surfaced in staging — a renamed attribute, a field arriving as a string — and each now bills a customer zero. Catch what you can handle, at the layer that can handle it; if the handling is \"return a plausible value\", let it propagate."
      },
      {
        stem: "Why generate the idempotency key outside the retry loop rather than per attempt?",
        options: [
          "It saves a UUID generation per attempt",
          "A fresh key per attempt means the server treats each retry as a new request, so the guarantee is gone and a charge can happen twice",
          "The server requires keys to be sequential",
          "It keeps the key out of the logs"
        ],
        answer: 1,
        why: "An idempotency key works by letting the server recognise a repeated request. A new key per attempt looks nearly identical in review and is functionally the same as no key: a read timeout on the first attempt — where the write may well have succeeded — followed by a retry with a different key produces a second charge. Asserting all attempts share one key is the only test that catches it."
      },
      {
        stem: "A dependency recovers after a blip, and every client retries at exactly t+1s, knocking it down again. What is the minimal fix?",
        options: [
          "Increase the backoff to 5 seconds",
          "Full jitter — `random.uniform(0, base * 2 ** attempt)` — so the same retries spread over the window instead of arriving together",
          "Reduce retries to one attempt",
          "Add a circuit breaker"
        ],
        answer: 1,
        why: "The problem is synchronisation, not the delay's length: a longer fixed backoff produces a later spike of the same shape. Randomising within the growing window keeps the same total retries and the same expected latency while spreading arrivals. A circuit breaker also helps and is considerably more machinery; jitter is one line and prevents the escalation on its own."
      },
      {
        stem: "Why must a production balance check not be written as `assert balance >= amount`?",
        options: [
          "Assertions cannot include comparisons",
          "`python -O` removes assert statements entirely, so under an optimised interpreter the check silently disappears",
          "Assertions are too slow for a hot path",
          "`AssertionError` cannot be caught"
        ],
        answer: 1,
        why: "Assertions compile to nothing under `-O`, and some base images set `PYTHONOPTIMIZE`. A withdrawal guarded only by an assert would then process a negative amount and credit the account. Use `assert` for internal invariants you believe cannot be false; use `if ... raise` for anything involving input, configuration, external state or a caller's arguments."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "When would you retry a failed request, and when would you not?",
        strong: "Retry transient failures on idempotent operations — connection errors, 503, 429 with its `Retry-After`. Never retry a 400 or a 422; those will fail identically. The dangerous case is a read timeout on a write, where the operation may have succeeded, and that needs an idempotency key before a retry is safe.",
        answer: [
          { t: "p", text: "Leading with the idempotency question rather than the backoff formula is the signal — plenty of people can describe exponential backoff and far fewer ask whether the operation is safe to repeat at all." },
          { t: "p", text: "Full jitter is the next detail: fixed backoff synchronises every client that failed together into waves that re-break a recovering service, and randomising within the window costs one line." },
          { t: "p", text: "Framing retries as load amplification closes it — the right question is what the policy does when a dependency is 100% down, which leads naturally to budgets and breakers." }
        ]
      },
      {
        level: "core",
        q: "Where should input validation live?",
        strong: "At the boundary, once. Parse untrusted input into a typed object — an `Order`, not a dict — and everything downstream can rely on the types. Checks scattered through internal functions are guarding against your own bugs, which is what tests and a type checker are for.",
        answer: [
          { t: "p", text: "\"Parse, don't validate\" is the compact form of the idea, and the reason it works is that a validated object is a *different type*: there is no code path where `quantity` is a string, so a check for one is dead code a reader must still evaluate." },
          { t: "p", text: "The `assert` distinction fits here — internal invariants may be asserted, but anything about input must be an `if` and a `raise`, because `-O` removes assertions and some base images enable it." },
          { t: "p", text: "Precision in the boundary error is what makes it worth doing: one clear per-field message beats a `TypeError` from three layers down, which is the thing scattered checks never manage to produce." }
        ]
      },
      {
        level: "advanced",
        q: "What is a circuit breaker and when would you add one?",
        strong: "After N consecutive failures it fails calls immediately for a cooldown, then allows one probe through — half-open — to test recovery. It stops a fully-down dependency from holding a worker per request for the timeout duration.",
        answer: [
          { t: "p", text: "The half-open state is the discriminator: opening is easy, and releasing every waiting client at once when the cooldown ends re-breaks the service that was recovering." },
          { t: "p", text: "The honest caveat shows judgement — a breaker is machinery, and a global retry budget capping retry traffic at some fraction of requests prevents the same disaster with a counter. Add the breaker once you have measured that you need it." },
          { t: "p", text: "Tuning is where they usually fail in practice: a threshold too low opens on ordinary noise, and a cooldown too long turns a two-second blip into a minute of self-inflicted downtime." }
        ]
      }
    ]
  }
});
