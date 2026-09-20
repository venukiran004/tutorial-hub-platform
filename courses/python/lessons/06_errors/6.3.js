/* ============================================================================
   LESSON 6.3 — raise, Chaining and Custom Exceptions
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "Raising is easy. Raising in a way that leaves the next engineer a usable traceback at 3 a.m. is a design decision. **The difference between `raise X` and `raise X from err` is whether the original cause survives** — and a custom hierarchy is worth building only when callers would handle its branches differently.",

  objectives: [
    "Distinguish implicit chaining, explicit chaining and suppression, and read the traceback each produces",
    "Choose `raise ... from err` over a bare `raise ...` when translating an exception",
    "Design an exception hierarchy around what callers need to catch, not around where errors occur",
    "Attach structured data to an exception rather than formatting it into the message",
    "Re-raise correctly with a bare `raise`, and know why `raise err` is worse"
  ],

  prerequisites: ["6.1", "6.2"],

  blocks: [

    { t: "h2", n: "01", text: "Three ways to raise", id: "raise" },

    { t: "code", lang: "python", title: "each does something different", code: `
def process(payload):
    try:
        return parse(payload)
    except ValueError as err:
        # 1. bare raise -- re-raise the CURRENT exception, unchanged.
        #    Traceback keeps the original line. Use after logging or
        #    partial cleanup, when you do not want to handle it here.
        log.warning("parse failed for %s", payload["id"])
        raise

        # 2. raise from -- translate, keeping the cause.
        raise ParseError(payload["id"]) from err

        # 3. raise from None -- translate, DISCARDING the cause.
        raise ParseError(payload["id"]) from None
`,
      caption: "There is a fourth form — a plain `raise ParseError(...)` inside an `except` — and it behaves like form 2 with a weaker join phrase. The next section shows why that matters."
    },

    { t: "callout", kind: "trap", title: "`raise err` is not the same as `raise`", body: [
      { t: "code", lang: "python", title: "the traceback loses its origin", numbered: false, code: `
def outer():
    try:
        inner()
    except ValueError as err:
        raise err            # WRONG -- adds THIS line to the traceback

def outer_correct():
    try:
        inner()
    except ValueError:
        raise                # the traceback still points at inner()`},
      { t: "p", text: "`raise err` re-raises the same object but appends the current frame, so the traceback now shows the `except` block as well as the real origin. In a deeply nested call chain that is several extra frames of noise pointing at code that did nothing wrong." },
      { t: "p", text: "**Use a bare `raise` whenever you are not changing the exception.** It costs less typing and produces a cleaner traceback, and the only reason people write `raise err` is that it looks more explicit." }
    ]},

    { t: "h2", n: "02", text: "What the join phrase tells you", id: "chaining" },

    { t: "viz",
      title: "The two phrases in a chained traceback",
      caption: "Python always records the exception that was being handled. The phrase joining the two tracebacks tells you whether the second was a deliberate translation or an accident that happened while handling the first — which is the difference between a designed error path and a bug in your error handler.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Diagram contrasting implicit chaining, which reads During handling another exception occurred, with explicit chaining, which reads The above exception was the direct cause">
  <rect x="14" y="20" width="424" height="128" rx="9" style="fill:none;stroke:var(--crit)" stroke-width="1.4"/>
  <text x="34" y="46" class="s-label" style="fill:var(--crit)">IMPLICIT — __context__</text>
  <text x="34" y="70" class="s-mono" style="font-size:10px">except KeyError:</text>
  <text x="34" y="86" class="s-mono" style="font-size:10px">    raise ConfigError(...)</text>
  <text x="34" y="112" class="s-sub">"During handling of the above exception,</text>
  <text x="34" y="128" class="s-sub">another exception occurred"</text>

  <rect x="462" y="20" width="424" height="128" rx="9" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="482" y="46" class="s-label" style="fill:var(--good)">EXPLICIT — __cause__</text>
  <text x="482" y="70" class="s-mono" style="font-size:10px">except KeyError as err:</text>
  <text x="482" y="86" class="s-mono" style="font-size:10px">    raise ConfigError(...) from err</text>
  <text x="482" y="112" class="s-sub">"The above exception was the direct</text>
  <text x="482" y="128" class="s-sub">cause of the following exception"</text>

  <text x="34" y="180" class="s-sub" style="fill:var(--crit)">Reads as: something went wrong INSIDE the handler — look for a bug here</text>
  <text x="482" y="180" class="s-sub" style="fill:var(--good)">Reads as: a deliberate translation — the design is working</text>

  <line x1="14" y1="204" x2="886" y2="204" class="s-stroke" stroke-width="1"/>

  <rect x="14" y="224" width="424" height="82" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="34" y="250" class="s-label">SUPPRESSED — __suppress_context__</text>
  <text x="34" y="274" class="s-mono" style="font-size:10px">    raise ConfigError(...) from None</text>
  <text x="34" y="296" class="s-sub">no second traceback at all</text>

  <rect x="462" y="224" width="424" height="82" rx="9" class="s-fill-2 s-stroke" stroke-width="1.2"/>
  <text x="482" y="250" class="s-label">WHEN TO SUPPRESS</text>
  <text x="482" y="272" class="s-sub">The cause is noise a caller cannot act on —</text>
  <text x="482" y="292" class="s-sub">and never merely to make output tidier</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the same failure, three tracebacks", code: `
class ConfigError(Exception):
    pass


def load(config: dict) -> str:
    try:
        return config["database_url"]
    except KeyError:
        raise ConfigError("database_url is not set")        # implicit


def load_explicit(config: dict) -> str:
    try:
        return config["database_url"]
    except KeyError as err:
        raise ConfigError("database_url is not set") from err


def load_clean(config: dict) -> str:
    try:
        return config["database_url"]
    except KeyError:
        raise ConfigError("database_url is not set") from None
`,
      out: `# load({})
Traceback (most recent call last):
  File "app.py", line 7, in load
    return config["database_url"]
KeyError: 'database_url'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "app.py", line 22, in <module>
    load({})
ConfigError: database_url is not set

# load_clean({})
Traceback (most recent call last):
  File "app.py", line 24, in <module>
    load_clean({})
ConfigError: database_url is not set`,
      caption: "For a missing config key, `from None` is right: the `KeyError` adds nothing a reader can act on. For a failing database driver it would be wrong — the driver's message is the only thing that says *why*."
    },

    { t: "callout", kind: "insight", title: "The rule for choosing", body: [
      { t: "dl", items: [
        ["`from err`", "The default when you translate one exception into another. Anyone debugging needs the original message, and losing it means reading your code to guess what happened."],
        ["`from None`", "Only when the cause is a mechanical detail the caller cannot act on — a `KeyError` behind a missing setting, a `ValueError` behind a bad user string you have already described precisely."],
        ["Neither", "Fine outside an `except` block. Inside one, Python chains implicitly anyway and the traceback says \"During handling\", which reads as *your handler is broken* — so be deliberate rather than letting it happen."]
      ]},
      { t: "p", text: "**The cost of `from None` is asymmetric.** Keeping an unhelpful cause wastes ten seconds of reading; discarding a helpful one can cost an hour, because the information no longer exists anywhere." }
    ]},

    { t: "h2", n: "03", text: "Designing a hierarchy", id: "hierarchy" },

    {"kind": "tree", "title": "Designing an exception hierarchy", "caption": "One base class per library lets callers catch everything from it in one clause; subclasses let them be specific. Two levels is nearly always enough.", "root": {"label": "PaymentError", "sub": "the library's base", "tone": "accent", "children": [{"label": "CardDeclined", "sub": "retry with another card", "tone": "warn"}, {"label": "GatewayTimeout", "sub": "retry later", "tone": "warn"}, {"label": "InvalidAmount", "sub": "a caller bug — do not retry", "tone": "crit"}]}, "t": "diagram", "id": "dg-6_3-03-0"},


    { t: "p", text: "The question is not \"what can go wrong here\". It is **\"what would a caller do differently\"**. Two failures that lead to the same handling do not need two exception types, however different their causes." },

    { t: "ladder",
      title: "Exceptions for an HTTP client library",
      rungs: [
        { level: "bad", label: "Built-ins, or one class for everything",
          why: "A caller cannot distinguish \"retry this\" from \"your API key is wrong\" without matching on message text — which breaks the moment anyone rewords it. Catching `ValueError` around your call also catches `ValueError`s from unrelated code inside it.",
          code: `def fetch(self, path):
    if not self.token:
        raise ValueError("no token")
    r = requests.get(...)
    if r.status_code == 401:
        raise Exception("unauthorised")
    if r.status_code >= 500:
        raise Exception("server error")` },
        { level: "ok", label: "A class per failure",
          why: "Each case is catchable and named. But there is no common base, so a caller who wants to handle *any* client failure must list every class — and every new exception you add silently escapes their handler.",
          code: `class MissingToken(Exception): ...
class Unauthorised(Exception): ...
class ServerError(Exception): ...
class RateLimited(Exception): ...
class Timeout(Exception): ...

# The caller, today:
except (MissingToken, Unauthorised, ServerError, RateLimited, Timeout):
    ...` },
        { level: "best", label: "One base, branches by caller response",
          why: "A caller catches at the level they can act on: `ApiError` for anything from this library, `RetryableError` for the retry loop, `Unauthorised` for a specific credential prompt. Adding a new subclass never escapes an existing handler.",
          code: `class ApiError(Exception):
    """Base for every error this client raises. Callers can catch
    this and know it came from us, not from requests or the stdlib."""


class ConfigurationError(ApiError):
    """Wrong before the request was made. Retrying cannot help."""


class RequestFailed(ApiError):
    """The request was made and did not succeed."""
    def __init__(self, message: str, *, status: int, request_id: str | None = None):
        super().__init__(message)
        self.status = status
        self.request_id = request_id


class RetryableError(RequestFailed):
    """Transient. A retry with backoff is appropriate."""


class RateLimited(RetryableError):
    def __init__(self, message: str, *, retry_after: float, **kwargs):
        super().__init__(message, **kwargs)
        self.retry_after = retry_after


class Unauthorised(RequestFailed):
    """Terminal. Retrying with the same credentials cannot help."""`,
          note: "The hierarchy encodes the **decision** a caller makes — retry or not — rather than the HTTP status that caused it. That is why `RateLimited` sits under `RetryableError` and `Unauthorised` does not." }
      ]
    },

    { t: "code", lang: "python", title: "what the caller writes", code: `
import time

for attempt in range(3):
    try:
        data = client.fetch("/orders")
        break
    except RateLimited as err:
        time.sleep(err.retry_after)          # structured, not parsed from text
    except RetryableError:
        time.sleep(2 ** attempt)
    except Unauthorised:
        refresh_credentials()                # a different action entirely
        raise
    except ApiError as err:
        log.error("api call failed", extra={"status": getattr(err, "status", None)})
        raise
`,
      caption: "Order matters: `except` clauses are tried top to bottom, so **the most specific must come first**. Putting `ApiError` at the top would make every clause below it unreachable — and Python will not warn you."
    },

    { t: "callout", kind: "trap", title: "Data belongs on the exception, not in the message", body: [
      { t: "code", lang: "python", title: "the difference at the call site", numbered: false, code: `
# Bad -- the only way to get retry_after back is to parse English
raise RateLimited(f"rate limited, retry after {seconds}s")

match = re.search(r"retry after (\\d+)s", str(err))     # fragile

# Good -- the value is an attribute
raise RateLimited("rate limited", retry_after=seconds, status=429)

time.sleep(err.retry_after)`},
      { t: "p", text: "A message is for a human reading a log. An attribute is for code making a decision. The moment a caller needs to `re.search` your exception text, the message has been asked to do a job it cannot do reliably — and a wording change becomes a breaking API change." },
      { t: "p", text: "**Keep secrets out of both.** Exception messages end up in logs, error trackers and sometimes HTTP responses; a token or a connection string in the message is a token in Sentry (Lesson 6.4)." }
    ]},

    { t: "callout", kind: "tradeoff", title: "How many exception classes", body: [
      { t: "table",
        head: ["Situation", "Do this"],
        rows: [
          ["A caller would handle it differently", "A distinct class"],
          ["Callers only ever log and re-raise", "Reuse an existing class; add an attribute if the detail matters"],
          ["It is a programming error — wrong types, broken invariant", "Let `TypeError`, `ValueError` or `AssertionError` through; do not wrap"],
          ["It comes from a library you wrap", "Translate to your own type with `from err`, so callers depend on your API rather than `requests`"],
          ["It is one of a dozen validation failures", "One class carrying a `field` and a `reason`, not twelve classes"]
        ]
      },
      { t: "p", text: "**A hierarchy is a public API.** Every class in it is something a caller may write an `except` for, and removing or re-parenting one later is a breaking change. Start with a base plus two or three branches, and add a class when a real caller needs to distinguish something." },
      { t: "p", text: "The opposite failure is real too: a library raising bare `Exception` forces every caller to write `except Exception`, which then swallows their own bugs (Lesson 6.1)." }
    ]},

    { t: "h2", n: "04", text: "Translating at the boundary", id: "boundary" },

    {"kind": "flow", "title": "Translate at the boundary", "caption": "A low-level exception from a dependency becomes your domain's exception, chained with 'from' so the cause survives in the traceback. Callers see one vocabulary.", "cols": 3, "nodes": [{"id": "lib", "label": "httpx.TimeoutException", "sub": "the dependency's error", "tone": "crit"}, {"id": "b", "label": "except … as e: raise GatewayTimeout(...) from e", "sub": "the boundary", "tone": "accent"}, {"id": "dom", "label": "GatewayTimeout", "sub": "your caller's vocabulary", "tone": "good"}], "edges": [["lib", "b"], ["b", "dom"]], "t": "diagram", "id": "dg-6_3-04-1"},


    { t: "code", lang: "python", title: "wrapping a dependency, correctly", code: `
import requests


class ApiError(Exception):
    pass


class RetryableError(ApiError):
    pass


class Client:
    def fetch(self, path: str) -> dict:
        try:
            response = self._session.get(f"{self._base}{path}", timeout=10)
            response.raise_for_status()
            return response.json()

        except requests.Timeout as err:
            # from err: the caller sees it was a timeout, not a mystery
            raise RetryableError(f"timeout calling {path}") from err

        except requests.HTTPError as err:
            status = err.response.status_code
            if status == 429:
                raise RateLimited(
                    "rate limited",
                    retry_after=float(err.response.headers.get("Retry-After", 1)),
                    status=status,
                ) from err
            if status >= 500:
                raise RetryableError(f"server error {status}") from err
            if status == 401:
                raise Unauthorised("credentials rejected", status=status) from err
            raise RequestFailed(f"request failed: {status}", status=status) from err

        except ValueError as err:
            # response.json() raises ValueError on a non-JSON body
            raise ApiError(f"invalid JSON from {path}") from err
`,
      hl: [19, 20, 24, 25, 26, 27, 28],
      caption: "The boundary exists so callers depend on **your** exception types rather than on `requests`. Swapping to `httpx` then changes one file rather than every caller — and that is the whole reason to wrap rather than let library exceptions escape."
    },

    { t: "callout", kind: "note", title: "Exception groups, briefly", body: [
      { t: "code", lang: "python", title: "when several things fail at once (3.11+)", numbered: false, code: `
# Raised by asyncio.TaskGroup, or explicitly
raise ExceptionGroup("validation failed", [
    ValueError("name is required"),
    TypeError("age must be an integer"),
])

# except* handles matching members and lets the rest propagate
try:
    validate_all(payload)
except* ValueError as group:
    for err in group.exceptions:
        report_field_error(err)
except* TypeError:
    ...`},
      { t: "p", text: "Reach for a group only when failures are genuinely **concurrent and independent** — parallel tasks, or a validator collecting every problem before reporting. For a sequential pipeline where the first failure stops everything, a single exception is clearer and `except*` is overhead." },
      { t: "p", text: "You will meet these again with `TaskGroup` in Lesson 11.6, which raises one whether or not you ask for it." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "An exception hierarchy for a payments client",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Design the exceptions for a payment gateway client, then write the translation layer. The hierarchy is the deliverable — the retry loop is the test of whether you designed it correctly, because a caller should be able to write one without a single `if` on a status code." },
        { t: "p", text: "One requirement is a trap: a declined card and a gateway outage both come back as failed payments, and treating them the same way is how a system retries a decline forty times." }
      ],
      requirements: [
        "A single base class so a caller can catch everything from this library.",
        "A split between failures where retrying can help and failures where it cannot.",
        "A declined card must be terminal and must carry the decline reason as data.",
        "Rate limiting must carry `retry_after` as a number, not in the message.",
        "Every translated exception preserves its cause; justify any use of `from None`.",
        "Nothing raised may contain the API key or the full card number, even in `repr`.",
        "Write the retry loop a caller would write, and a test proving a decline is not retried."
      ],
      hint: "Ask what the caller does, not what went wrong. A timeout, a 503 and a 429 all lead to \"wait and try again\"; a decline and a bad API key both lead to \"stop\" — but for very different reasons, and the caller acts differently on each.",
      solution: {
        lang: "python",
        title: "payments.py",
        code: `from __future__ import annotations

import time
from dataclasses import dataclass

import requests


# ---- the hierarchy -------------------------------------------------------
#
# Shaped by what a CALLER does, not by what went wrong:
#
#   PaymentError                  catch-all for "came from this library"
#   |- ConfigurationError         we are misconfigured -- fix the deploy
#   |- TransientError             wait and retry
#   |  |- GatewayUnavailable      timeout, 5xx
#   |  \\- RateLimited             429, carries retry_after
#   \\- PaymentRejected            the gateway answered "no" -- do NOT retry
#      |- CardDeclined            carries a decline code
#      \\- AuthenticationFailed    our credentials are wrong


class PaymentError(Exception):
    """Base for everything this client raises."""


class ConfigurationError(PaymentError):
    """Wrong before any request was made. Retrying cannot help."""


class TransientError(PaymentError):
    """The gateway did not give an answer. Retrying may help."""


class GatewayUnavailable(TransientError):
    def __init__(self, message: str, *, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


class RateLimited(TransientError):
    def __init__(self, message: str, *, retry_after: float) -> None:
        super().__init__(message)
        self.retry_after = retry_after          # a number, not prose


class PaymentRejected(PaymentError):
    """The gateway gave a definite answer, and it was no.

    Terminal by design: retrying a decline is how a customer gets six
    identical failed-payment emails and the merchant gets a fraud flag.
    """


class CardDeclined(PaymentRejected):
    def __init__(self, *, decline_code: str, last4: str) -> None:
        # Only the last four digits ever enter the object -- never the PAN.
        super().__init__(f"card ending {last4} declined ({decline_code})")
        self.decline_code = decline_code
        self.last4 = last4

    @property
    def is_retryable_by_customer(self) -> bool:
        """insufficient_funds may work tomorrow; stolen_card never will.
        Still not retryable by US -- this tells the UI what to say."""
        return self.decline_code in {"insufficient_funds", "try_again_later"}


class AuthenticationFailed(PaymentRejected):
    """Our API key is wrong or revoked. Terminal, and pages an engineer
    rather than showing the customer anything."""


# ---- the translation layer ----------------------------------------------

@dataclass(frozen=True, slots=True)
class Client:
    base_url: str
    api_key: str
    timeout: float = 10.0

    def __repr__(self) -> str:
        # The dataclass-generated repr would print the API key into every
        # traceback that shows a frame holding a Client. Overriding it is
        # the cheapest secret-leak fix there is.
        return f"Client(base_url={self.base_url!r}, api_key='***')"

    def charge(self, *, amount_pence: int, token: str) -> str:
        if not self.api_key:
            # from None is NOT needed -- there is no active exception here.
            raise ConfigurationError("api_key is not set")

        try:
            response = requests.post(
                f"{self.base_url}/charges",
                json={"amount": amount_pence, "token": token},
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=self.timeout,
            )
            response.raise_for_status()

        except requests.Timeout as err:
            # from err: "which endpoint, and did it connect" lives in the
            # requests exception and nowhere else.
            raise GatewayUnavailable("gateway timed out") from err

        except requests.HTTPError as err:
            raise self._translate(err) from err

        except requests.RequestException as err:
            raise GatewayUnavailable("could not reach the gateway") from err

        try:
            return response.json()["charge_id"]
        except (ValueError, KeyError) as err:
            raise GatewayUnavailable("malformed gateway response") from err

    @staticmethod
    def _translate(err: requests.HTTPError) -> PaymentError:
        response = err.response
        status = response.status_code

        if status == 429:
            return RateLimited(
                "rate limited by the gateway",
                retry_after=float(response.headers.get("Retry-After", 1)),
            )
        if status == 401 or status == 403:
            return AuthenticationFailed("gateway rejected our credentials")
        if status == 402:
            body = response.json()
            return CardDeclined(
                decline_code=body.get("decline_code", "unknown"),
                last4=body.get("last4", "????"),
            )
        if status >= 500:
            return GatewayUnavailable(f"gateway error {status}", status=status)
        return PaymentError(f"unexpected gateway response {status}")


# ---- the loop a caller writes -------------------------------------------

def charge_with_retries(
    client: Client,
    *,
    amount_pence: int,
    token: str,
    attempts: int = 4,
) -> str:
    """No status codes, no message parsing -- the hierarchy carries it."""
    last: TransientError | None = None

    for attempt in range(attempts):
        try:
            return client.charge(amount_pence=amount_pence, token=token)

        except RateLimited as err:
            last = err
            time.sleep(err.retry_after)          # the gateway told us how long

        except GatewayUnavailable as err:
            last = err
            time.sleep(2 ** attempt)

        # PaymentRejected is deliberately NOT caught: a decline and a bad
        # API key must propagate on the first attempt.

    raise GatewayUnavailable(f"giving up after {attempts} attempts") from last


# ---- tests --------------------------------------------------------------

class FakeResponse:
    def __init__(self, status: int, body: dict | None = None, headers: dict | None = None):
        self.status_code, self._body, self.headers = status, body or {}, headers or {}

    def json(self) -> dict:
        return self._body

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(response=self)


def translate(status: int, body: dict | None = None, headers: dict | None = None):
    err = requests.HTTPError(response=FakeResponse(status, body, headers))
    return Client._translate(err)


def test_declines_are_terminal_and_carry_the_reason() -> None:
    err = translate(402, {"decline_code": "insufficient_funds", "last4": "4242"})

    assert isinstance(err, PaymentRejected)
    assert not isinstance(err, TransientError)      # THE assertion
    assert err.decline_code == "insufficient_funds"
    assert err.is_retryable_by_customer


def test_a_decline_is_not_retried() -> None:
    """The requirement that matters: a customer must not receive six
    failed-payment emails because we looped on a definite 'no'."""
    calls = 0

    class Declining(Client):
        def charge(self, **kwargs):
            nonlocal calls
            calls += 1
            raise CardDeclined(decline_code="stolen_card", last4="4242")

    client = Declining(base_url="x", api_key="k")
    try:
        charge_with_retries(client, amount_pence=100, token="t")
    except CardDeclined:
        pass
    else:
        raise AssertionError("the decline should have propagated")

    assert calls == 1


def test_rate_limit_carries_a_number() -> None:
    err = translate(429, headers={"Retry-After": "2.5"})

    assert isinstance(err, TransientError)
    assert err.retry_after == 2.5                   # no regex over the message


def test_server_errors_are_transient_and_auth_is_not() -> None:
    assert isinstance(translate(503), TransientError)
    assert isinstance(translate(401), PaymentRejected)


def test_every_error_is_catchable_as_one_base() -> None:
    for status in (401, 402, 429, 503, 418):
        body = {"decline_code": "x", "last4": "1111"} if status == 402 else None
        assert isinstance(translate(status, body), PaymentError)


def test_no_secret_reaches_a_traceback() -> None:
    client = Client(base_url="https://pay.example", api_key="sk_live_SECRET")

    assert "sk_live_SECRET" not in repr(client)
    assert "sk_live_SECRET" not in str(client)

    err = CardDeclined(decline_code="stolen_card", last4="4242")
    assert "4242" in str(err)                       # last four is fine
    assert "4111111111114242" not in str(err)


if __name__ == "__main__":
    for t in (
        test_declines_are_terminal_and_carry_the_reason,
        test_a_decline_is_not_retried,
        test_rate_limit_carries_a_number,
        test_server_errors_are_transient_and_auth_is_not,
        test_every_error_is_catchable_as_one_base,
        test_no_secret_reaches_a_traceback,
    ):
        t()
    print("hierarchy shaped by caller response, causes preserved, no secrets")`,
        notes: [
          { t: "p", text: "**`assert not isinstance(err, TransientError)` is the test that encodes the design.** It says a decline must never end up on the retry branch — and it fails loudly if someone later re-parents `CardDeclined` for convenience. A hierarchy without a test like this is a comment." },
          { t: "p", text: "**Every branch answers \"what does the caller do\", not \"what went wrong\".** A timeout, a 503 and a 429 have nothing in common technically and everything in common operationally: wait, then try again. Grouping by cause instead would have put the 429 next to the 401, and the retry loop would need status codes again." },
          { t: "p", text: "**`from err` throughout, and no `from None` anywhere.** Each translated exception hides genuinely useful detail — which endpoint, whether the connection was made, what the body looked like. The one place a `from None` might be argued is the `ConfigurationError`, and it is not in an `except` block at all, so the question does not arise." },
          { t: "callout", kind: "trap", title: "The `__repr__` override is not optional", body: [
            { t: "p", text: "A `@dataclass` generates a `__repr__` printing every field. Any traceback showing a frame that holds a `Client` prints the API key — into logs, into Sentry, into a support ticket someone pastes into a chat." },
            { t: "p", text: "The same argument covers `last4` versus the full card number: the exception is allowed to carry exactly the identifier a human needs to recognise the card, and nothing that would be a compliance incident if it reached a log aggregator (Lesson 6.4)." }
          ]},
          { t: "p", text: "**`is_retryable_by_customer` is not the same as retryable by us.** `insufficient_funds` may succeed tomorrow, `stolen_card` never will — but neither justifies our retry loop trying again in two seconds. Keeping that distinction as a property on the exception lets the UI say something useful without ever reaching the retry code." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A subscription service's billing worker wraps every gateway call in `except Exception: retry_later()`. A card is declined for `stolen_card`. The worker retries with exponential backoff — six times over two days." },
      { t: "p", text: "**The customer receives six failed-payment emails**, the gateway flags the merchant account for repeated attempts on a reported-stolen card, and the risk team opens a review that takes three weeks to close." },
      { t: "p", text: "**The code was not lazy — it was undesigned.** The exceptions came straight from the HTTP library, so the only way to distinguish a 402 from a 503 was to inspect a status code inside the handler. The team wrote the catch-all precisely because there was no type to catch." },
      { t: "p", text: "**The fix was a hierarchy, not a condition.** Once `PaymentRejected` and `TransientError` were separate branches, the retry loop stopped catching the wrong thing structurally rather than by remembering to check. A design where the wrong thing is hard to write beats one where it merely needs an extra `if` — because the `if` gets removed in six months by someone simplifying." }
    ]}
  ],

  takeaways: [
    "**A bare `raise` re-raises without adding a frame**; `raise err` appends the current line and pollutes the traceback with code that did nothing wrong.",
    "**`raise X from err` sets `__cause__`** and prints \"The above exception was the direct cause\" — the phrase that says a translation was deliberate.",
    "**Raising inside `except` without `from` chains implicitly** and prints \"During handling of the above exception\", which reads as a bug in your handler.",
    "`raise X from None` discards the cause. Use it only when the original adds nothing actionable — the cost of losing a useful cause is far higher than keeping an unhelpful one.",
    "**Design a hierarchy around what callers do, not around what went wrong.** A timeout, a 503 and a 429 belong together because they all mean \"wait and retry\".",
    "One base class per library lets a caller catch everything you raise without listing every subclass — and means a new subclass never escapes their handler.",
    "**Put data on the exception as attributes**, not formatted into the message. The moment a caller must `re.search` your text, a wording change is a breaking API change.",
    "**`except` clauses are tried top to bottom**, so the most specific must come first; a base class at the top makes every clause below it silently unreachable.",
    "Translate library exceptions at your boundary with `from err`, so callers depend on your types and swapping `requests` for `httpx` changes one file.",
    "**Keep secrets out of exception messages and `repr`.** A dataclass `__repr__` prints every field, and any traceback holding that object puts your API key in the error tracker.",
    "Do not wrap programming errors — `TypeError`, `ValueError` from bad arguments, a broken invariant — in domain exceptions. They are bugs, and hiding them makes them harder to find.",
    "**Exception groups and `except*` are for genuinely concurrent, independent failures.** In a sequential pipeline where the first failure stops everything, one exception is clearer."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A traceback reads \"During handling of the above exception, another exception occurred\". What does that tell you?",
        options: [
          "The second exception was raised deliberately with `from`",
          "The second was raised inside an `except` block without `from`, so Python chained it implicitly — often a sign the handler itself has a bug",
          "Two threads raised at the same time",
          "The first exception was suppressed"
        ],
        answer: 1,
        why: "Python records the exception being handled in `__context__` and prints that phrase when a new one escapes the handler. It reads as \"something went wrong while dealing with the first problem\". When the translation is intentional, `raise X from err` sets `__cause__` instead and prints \"The above exception was the direct cause\", which tells a reader the design is working rather than sending them hunting for a bug in your handler."
      },
      {
        stem: "You are designing exceptions for an HTTP client. What should determine the branches?",
        options: [
          "The HTTP status codes, one class per code",
          "What a caller would do differently — retry, prompt for credentials, give up — since that is what an `except` clause selects on",
          "The layer of the application where the error occurred",
          "One class per method, so tracebacks identify the call site"
        ],
        answer: 1,
        why: "An exception type exists to be caught, so its only useful distinction is one that changes the handler. A timeout, a 503 and a 429 have different causes and identical responses — wait and retry — so they belong on one branch. Grouping by cause forces callers back to inspecting status codes inside the handler, which is exactly what the hierarchy was supposed to replace."
      },
      {
        stem: "Why attach `retry_after` as an attribute rather than putting it in the message?",
        options: [
          "Messages have a length limit",
          "Code must otherwise parse English out of the message, so a wording change silently becomes a breaking API change",
          "Attributes are faster to access",
          "Messages are stripped in production builds"
        ],
        answer: 1,
        why: "A message is for a human reading a log; an attribute is for code making a decision. When a caller writes `re.search(r\"retry after (\\d+)\", str(err))`, your prose is now part of your public API and any reword breaks their retry loop without a test failing anywhere. `err.retry_after` is stable, typed and obvious."
      },
      {
        stem: "A billing worker catches `Exception` and retries. A stolen-card decline is retried six times over two days. What is the real fix?",
        options: [
          "Add an `if status == 402: return` check inside the handler",
          "Split the hierarchy so terminal rejections and transient failures are different branches, and stop catching the terminal one",
          "Reduce the retry count to two",
          "Log the status code before retrying"
        ],
        answer: 1,
        why: "The check works and gets deleted in six months by someone simplifying the handler. Making the retry loop catch `TransientError` only means a decline propagates structurally — there is no line to remove and no condition to forget. The team wrote the catch-all in the first place because library exceptions gave them nothing better to catch, which is the actual root cause."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between `raise X`, `raise X from err` and `raise X from None`?",
        strong: "Inside an `except`, all three chain — but differently. A plain `raise X` chains implicitly via `__context__` and prints \"During handling\". `from err` sets `__cause__` and prints \"the direct cause\". `from None` suppresses the context entirely.",
        answer: [
          { t: "p", text: "Explaining what each phrase *signals to a reader* is the substantive half: \"During handling\" reads as a bug in the handler, \"direct cause\" reads as a deliberate translation. That is why you use `from err` even though the traceback would appear anyway." },
          { t: "p", text: "The `from None` judgement is where opinions show: it is right when the cause is mechanical noise like a `KeyError` behind a missing setting, and wrong whenever the original message is the only thing that says why — and the cost is asymmetric, since a discarded cause is gone." },
          { t: "p", text: "The bare `raise` is worth adding unprompted, along with why `raise err` is worse — it appends the current frame and points a reader at code that did nothing wrong." }
        ]
      },
      {
        level: "advanced",
        q: "How would you design an exception hierarchy for a library?",
        strong: "One base so callers can catch everything from the library, then branches by what a caller would do differently — retry, re-authenticate, give up. Not by cause, and not one class per failure mode.",
        answer: [
          { t: "p", text: "The concrete example carries it: a timeout, a 503 and a 429 all mean \"wait and try again\" and belong together, while a decline and an expired API key are both terminal but need different handling." },
          { t: "p", text: "Structured attributes over message text — `err.retry_after`, `err.status` — is the detail that separates people who have designed a hierarchy from people who have used one." },
          { t: "p", text: "Two constraints show maturity: a hierarchy is a public API, so re-parenting a class later is a breaking change; and programming errors like `TypeError` should not be wrapped, because hiding a bug behind a domain exception makes it harder to find." }
        ]
      },
      {
        level: "core",
        q: "When should you catch an exception and wrap it in your own type?",
        strong: "At a boundary you own — a client wrapping `requests`, a repository wrapping a driver — so callers depend on your types rather than on your dependency. Always with `from err`, so the original detail survives.",
        answer: [
          { t: "p", text: "The payoff is the concrete part: swapping `requests` for `httpx` changes one file instead of every caller, because nobody outside the boundary ever wrote `except requests.Timeout`." },
          { t: "p", text: "The limit matters as much as the rule. Wrapping everywhere produces layers of translation where each one loses a little context; the boundary is the module that owns the dependency, not every function that calls through it." },
          { t: "p", text: "And do not wrap bugs. A `TypeError` from your own bad arguments is not a domain error, and turning it into one makes it look like an expected condition." }
        ]
      }
    ]
  }
});
