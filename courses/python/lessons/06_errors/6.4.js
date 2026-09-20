/* ============================================================================
   LESSON 6.4 — Logging That Survives Production
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "Logging is the only debugging tool you have on a machine you cannot attach to. Most codebases get it wrong in the same three ways: they configure it inside library code, they format messages eagerly, and they write prose a human must read instead of fields a machine can filter. **A log line nobody can query is a log line nobody reads.**",

  objectives: [
    "Explain the logger → handler → formatter model and why propagation matters",
    "Configure logging once at the entry point and never inside a library",
    "Choose a level that means something operationally, not emotionally",
    "Emit structured fields with `extra` and attach a correlation ID with `contextvars`",
    "Keep secrets out of logs deliberately, with a filter rather than discipline"
  ],

  prerequisites: ["6.2", "6.3"],

  blocks: [

    { t: "h2", n: "01", text: "The model", id: "model",
      sub: "Four objects, and the one relationship people miss" },

    {"kind": "flow", "title": "The logging model", "caption": "A logger emits a record; handlers decide where it goes; formatters decide what it looks like; levels filter at each stage. Loggers form a tree by dotted name, and records propagate to the root.", "cols": 4, "nodes": [{"id": "log", "label": "logger 'app.db'", "sub": "level, propagates to 'app' and root", "tone": "accent"}, {"id": "rec", "label": "LogRecord", "sub": "message, level, extras", "tone": "good"}, {"id": "h", "label": "handlers", "sub": "stream, file, HTTP …", "tone": "warn"}, {"id": "fmt", "label": "formatter", "sub": "text or JSON", "tone": "violet"}], "edges": [["log", "rec"], ["rec", "h"], ["h", "fmt"]], "t": "diagram", "id": "dg-6_4-01-0"},



    { t: "viz",
      title: "How a log record travels",
      caption: "A logger decides whether to create a record. Handlers decide where it goes and may filter again. Then the record travels UP the logger hierarchy to every ancestor's handlers — which is why one handler on the root logger is usually all the configuration you need, and why adding a second produces duplicates.",
      svg: `<svg viewBox="0 0 900 340" role="img" aria-label="Diagram of a log record passing a logger level check, then its handlers, then propagating to parent loggers up to root">
  <defs>
    <marker id="lg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="24" width="176" height="66" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="102" y="50" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">log.info(...)</text>
  <text x="102" y="72" text-anchor="middle" class="s-sub">on logger "app.billing"</text>

  <line x1="194" y1="57" x2="228" y2="57" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#lg)"/>

  <rect x="232" y="24" width="200" height="66" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="332" y="46" text-anchor="middle" class="s-label">LEVEL CHECK</text>
  <text x="332" y="66" text-anchor="middle" class="s-sub">effective level, inherited</text>
  <text x="332" y="82" text-anchor="middle" class="s-sub">from the nearest ancestor set</text>

  <line x1="436" y1="57" x2="470" y2="57" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#lg)"/>
  <text x="446" y="46" class="s-mono" style="font-size:9px;fill:var(--crit)">below? dropped</text>

  <rect x="474" y="24" width="200" height="66" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="574" y="46" text-anchor="middle" class="s-label">RECORD CREATED</text>
  <text x="574" y="70" text-anchor="middle" class="s-sub">msg, args, exc_info, extra</text>

  <line x1="574" y1="94" x2="574" y2="124" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#lg)"/>

  <rect x="330" y="128" width="490" height="72" rx="9" style="fill:none;stroke:var(--border-strong)" stroke-width="1.2"/>
  <text x="350" y="152" class="s-label">app.billing HANDLERS</text>
  <text x="350" y="174" class="s-sub">filters → formatter → destination</text>
  <text x="350" y="192" class="s-sub">usually NONE — leave handlers to the root</text>

  <line x1="330" y1="164" x2="286" y2="164" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#lg)"/>
  <text x="150" y="160" class="s-mono" style="font-size:10px">propagate = True</text>
  <text x="150" y="178" class="s-sub">(the default)</text>

  <line x1="574" y1="204" x2="574" y2="232" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#lg)"/>

  <rect x="330" y="236" width="490" height="72" rx="9" style="fill:none;stroke:var(--border-strong)" stroke-width="1.2"/>
  <text x="350" y="260" class="s-label">app HANDLERS → root HANDLERS</text>
  <text x="350" y="282" class="s-sub">one StreamHandler on root writing to stdout</text>
  <text x="350" y="300" class="s-sub">is the whole configuration for most services</text>

  <text x="14" y="262" class="s-sub" style="fill:var(--crit)">A handler here AND</text>
  <text x="14" y="280" class="s-sub" style="fill:var(--crit)">on root = every line</text>
  <text x="14" y="298" class="s-sub" style="fill:var(--crit)">logged twice</text>
</svg>`
    },

    { t: "dl", items: [
      ["**Logger**", "What you call. Named, hierarchical by dots, and the level check happens here. `logging.getLogger(\"app.billing\")` is a child of `app`, which is a child of the root."],
      ["**Handler**", "Where a record goes — stdout, a file, syslog, an HTTP collector. Attach these once, at the root, in the application's entry point."],
      ["**Formatter**", "How a record becomes text. Plain for a terminal, JSON for a log aggregator."],
      ["**Filter**", "Arbitrary logic that drops or *modifies* records. Under-used: this is where redaction and correlation IDs belong, because it applies everywhere without touching call sites."]
    ]},

    { t: "callout", kind: "trap", title: "Never configure logging in a library", body: [
      { t: "code", lang: "python", title: "the rule, both halves", numbered: false, code: `
# ---- in library / package code: get a logger, nothing else ----
import logging

log = logging.getLogger(__name__)     # "yourpkg.client" -- hierarchical

def fetch(path):
    log.debug("fetching %s", path)


# ---- in the application entry point ONLY ----
def main():
    logging.basicConfig(level=logging.INFO, format="...")`},
      { t: "p", text: "`basicConfig` in an imported module runs at import time and adds a handler to the **root** logger. The application then adds its own, and every line appears twice. Worse, whichever module imported first silently wins on the format." },
      { t: "p", text: "**`__name__` is the right logger name** because it inherits the package hierarchy for free. An operator can then raise `yourpkg` to DEBUG without turning on the whole world, which is a thing they will want to do at exactly the wrong moment to be editing code." },
      { t: "p", text: "The one line a library should add is `logging.getLogger(__name__).addHandler(logging.NullHandler())` at package level — it prevents the \"No handlers could be found\" warning if an application never configures anything." }
    ]},

    { t: "h2", n: "02", text: "Levels that mean something", id: "levels" },

    {"kind": "layers", "title": "Levels that mean something", "caption": "A level is a promise about who needs to act. Set the threshold per environment and the meaning per message.", "items": [{"label": "CRITICAL", "sub": "the process cannot continue", "tone": "crit"}, {"label": "ERROR", "sub": "a request or job failed; someone should look", "tone": "crit"}, {"label": "WARNING", "sub": "unexpected but handled; watch the rate", "tone": "warn"}, {"label": "INFO", "sub": "the normal narrative of the service", "tone": "accent"}, {"label": "DEBUG", "sub": "for you, in development", "tone": "good"}], "t": "diagram", "id": "dg-6_4-02-1"},



    { t: "table",
      head: ["Level", "Means", "Who acts", "Example"],
      rows: [
        ["`DEBUG`", "Detail useful only when investigating", "Nobody, until they turn it on", "Request payloads, cache hits, retry attempts"],
        ["`INFO`", "A normal thing happened that someone may want to count", "Nobody — but a dashboard graphs it", "Job started, 4,200 orders processed, config loaded"],
        ["`WARNING`", "Something unexpected, handled, but worth knowing", "Someone, eventually", "Retry succeeded on attempt 3; deprecated field still in use"],
        ["`ERROR`", "An operation failed and a user or job is affected", "An engineer, today", "Payment could not be recorded; report generation failed"],
        ["`CRITICAL`", "The process cannot continue or data is at risk", "An engineer, now", "Cannot reach the database on startup; corruption detected"]
      ],
      caption: "**The test for a level is who is expected to act and how quickly**, not how bad it felt to write. A retry that eventually succeeded is a WARNING, not an ERROR — logging it as ERROR is how a team learns to ignore errors."
    },

    { t: "ladder",
      title: "Logging a failure",
      rungs: [
        { level: "bad", label: "Prose, eagerly formatted, no traceback",
          why: "The f-string is built even when DEBUG is disabled. The exception's type and traceback are gone, so all a reader gets is your rewording of it. And `order_id` is embedded in text, so it cannot be filtered on.",
          code: `log.error(f"Failed to process order {order.id}: {err}")` },
        { level: "ok", label: "Lazy formatting and the traceback",
          why: "`%s` arguments are only interpolated if a handler will emit the record, and `exception()` attaches the full traceback. Still one blob of text — searching for every failure of one order means a substring match.",
          code: `try:
    process(order)
except ProcessingError:
    log.exception("failed to process order %s", order.id)` },
        { level: "best", label: "Structured fields",
          why: "The message is a stable, searchable constant and the varying parts are queryable fields. `level:ERROR AND order_id:8821` is a filter, not a substring search — and the same fields aggregate, so you can count failures per customer without parsing anything.",
          code: `try:
    process(order)
except ProcessingError:
    log.exception(
        "order processing failed",
        extra={
            "order_id": order.id,
            "customer_id": order.customer_id,
            "amount_pence": order.amount_pence,
            "attempt": attempt,
        },
    )`,
          note: "`log.exception()` is `log.error(..., exc_info=True)`. It only works **inside an `except` block** — elsewhere there is no active exception and the traceback is empty." }
      ]
    },

    { t: "callout", kind: "insight", title: "Why `%s` and not an f-string", body: [
      { t: "code", lang: "python", title: "two costs, one of them surprising", numbered: false, code: `
# The f-string is evaluated ALWAYS -- even when DEBUG is off and the
# record is discarded microseconds later.
log.debug(f"payload: {json.dumps(payload)}")      # serialises every call

# Deferred: json.dumps runs only if something will emit the record.
log.debug("payload: %s", payload)

# And the message stays a CONSTANT, so an aggregator can group
# "payload: %s" as one event with a varying argument.`},
      { t: "p", text: "The performance argument is real when the argument is expensive — a `json.dumps` on a hot path costs the same whether the line is emitted or not. The grouping argument matters more: tools like Sentry and Datadog fingerprint on the raw message, and an f-string produces a distinct message per call, so one recurring problem becomes ten thousand unique events." },
      { t: "p", text: "**Linters enforce this**: `ruff`'s `G` rules and pylint's `logging-fstring-interpolation` both flag it (Lesson 9.7)." }
    ]},

    { t: "h2", n: "03", text: "Structured output", id: "structured" },

    { t: "code", lang: "python", title: "a JSON formatter in twenty lines", code: `
import json
import logging
from datetime import datetime, timezone

# Attributes LogRecord always has -- anything else came from extra=
_STANDARD = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {
    "message", "asctime", "taskName",
}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }

        # Everything passed via extra=, without listing it here
        payload.update({
            k: v for k, v in record.__dict__.items() if k not in _STANDARD
        })

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)
`,
      out: `{"ts": "2026-09-04T22:14:03.221+00:00", "level": "ERROR",
 "logger": "app.billing", "message": "order processing failed",
 "module": "billing", "line": 88, "order_id": 8821,
 "customer_id": "c-441", "request_id": "9f2c...",
 "exception": "Traceback (most recent call last):\\n  ..."}`,
      caption: "`default=str` matters: a `Decimal`, a `datetime` or a `UUID` in `extra` would otherwise raise inside the formatter — and **an exception in a formatter is swallowed by logging**, so the line simply vanishes."
    },

    { t: "callout", kind: "warn", title: "Reserved names in `extra` raise", body: [
      { t: "code", lang: "python", title: "the collision", numbered: false, code: `
log.info("done", extra={"module": "billing"})
# KeyError: "Attempt to overwrite 'module' in LogRecord"

# Safe: prefix your own fields, or nest them
log.info("done", extra={"ctx": {"module": "billing"}})`},
      { t: "p", text: "`extra` writes straight onto the `LogRecord`, so any key clashing with a built-in attribute — `message`, `module`, `name`, `args`, `levelname`, `exc_info`, `filename`, `lineno`, `process` — raises at the call site." },
      { t: "p", text: "Two defences: nest everything under one key, or adopt a prefix convention. Either way, decide once — discovering the rule through a `KeyError` in production is a poor way to learn it." }
    ]},

    { t: "h2", n: "04", text: "Correlation IDs", id: "correlation" },

    { t: "p", text: "In a service handling concurrent requests, interleaved log lines are useless without something tying one request's lines together. Passing a `request_id` through every function signature is the obvious approach and it is unbearable. A **filter reading a `ContextVar`** does it in one place." },

    { t: "code", lang: "python", title: "set it once, appears on every line", code: `
import contextvars
import logging
import uuid

request_id: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="-"
)


class ContextFilter(logging.Filter):
    """A filter that MODIFIES rather than drops -- the underused half
    of the filter API."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id.get()
        return True                    # True = keep the record


# In middleware, per request:
def handle(request):
    token = request_id.set(request.headers.get("X-Request-ID") or str(uuid.uuid4()))
    try:
        return route(request)
    finally:
        request_id.reset(token)        # restore, so nothing leaks between requests
`,
      caption: "A `ContextVar` is per-task and per-thread, so concurrent requests never see each other's value — unlike a module-level global, which would give you whichever request last wrote to it (Lesson 11.7)."
    },

    { t: "callout", kind: "trap", title: "Secrets in logs are a leak, not a mistake", body: [
      { t: "code", lang: "python", title: "the four ways it happens", numbered: false, code: `
log.info("request: %s", request.headers)          # 1. Authorization header
log.debug("user: %s", user)                       # 2. a __repr__ with a password
log.exception("payment failed")                   # 3. locals in the traceback
log.info("connecting to %s", DATABASE_URL)        # 4. credentials in a URL`},
      { t: "p", text: "Logs are copied to aggregators, retained for months, and readable by far more people than your database. A token logged once is a token to rotate, and \"we deleted the line\" is not a remediation." },
      { t: "code", lang: "python", title: "redact centrally, not at call sites", numbered: false, code: `
import re

SECRET_PATTERN = re.compile(
    r"(?i)(authorization|api[_-]?key|password|token|secret)"
    r"([\\\"':=\\s]+)([^\\\"'\\s,}]+)"
)


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = SECRET_PATTERN.sub(r"\\1\\2***", record.msg)
        record.args = tuple(
            SECRET_PATTERN.sub(r"\\1\\2***", a) if isinstance(a, str) else a
            for a in (record.args or ())
        )
        return True`},
      { t: "p", text: "**A filter is a backstop, not the design.** The primary defence is not putting secrets in objects that get logged — override `__repr__` on anything holding a credential (Lesson 6.3), and never log a whole headers dict. The filter catches what discipline misses, which over a large codebase is always something." }
    ]},

    { t: "h2", n: "05", text: "Configuring an application", id: "config" },

    { t: "code", lang: "python", title: "dictConfig — the whole setup in one place", code: `
import logging.config
import os
import sys

LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
JSON_LOGS = os.environ.get("LOG_FORMAT", "text").lower() == "json"


def configure_logging() -> None:
    """Call ONCE, from the entry point. Never from library code."""
    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,       # keep loggers already created
        "filters": {
            "context": {"()": ContextFilter},
            "redact": {"()": RedactingFilter},
        },
        "formatters": {
            "text": {
                "format": "%(asctime)s %(levelname)-8s %(name)s "
                          "[%(request_id)s] %(message)s",
            },
            "json": {"()": JsonFormatter},
        },
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": "json" if JSON_LOGS else "text",
                "filters": ["context", "redact"],
            },
        },
        "root": {"level": LEVEL, "handlers": ["stdout"]},
        "loggers": {
            # Third-party noise, turned down without touching our level
            "urllib3": {"level": "WARNING"},
            "botocore": {"level": "WARNING"},
        },
    })
`,
      hl: [12, 33, 36, 37],
      caption: "`disable_existing_loggers: False` is essential — the default `True` silences every logger created before this call, which includes all of them if configuration happens after imports."
    },

    { t: "callout", kind: "tradeoff", title: "Where to send logs", body: [
      { t: "table",
        head: ["Destination", "Use when", "Watch out for"],
        rows: [
          ["**stdout** (`StreamHandler`)", "Containers, systemd, anything supervised — the default", "Nothing. The platform handles rotation, shipping and retention"],
          ["A file (`RotatingFileHandler`)", "A long-running process on a host you own", "Rotation is per-process — two workers on one file corrupt it"],
          ["`SysLogHandler`", "The host aggregates centrally already", "Message size limits truncate JSON silently"],
          ["An HTTP collector", "You have no other shipping path", "**Never synchronously** — a slow collector becomes your latency"]
        ]
      },
      { t: "p", text: "**In a container, log to stdout and stop thinking about it.** Writing files inside a container means logs die with it, rotation fights the orchestrator, and the platform's collector — which is already reading stdout — sees nothing." },
      { t: "p", text: "If you must ship from inside the process, wrap the handler in `QueueHandler` with a `QueueListener` so the emitting thread never blocks on the network. A logging call that can block is a logging call that can take down a request path." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a service's logs queryable",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "The handler below is typical of code that grew rather than being designed. Every problem in it is one that survives review because each line looks reasonable on its own." },
        { t: "code", lang: "python", title: "handlers.py — as found", numbered: false, code: `
import logging

logging.basicConfig(level=logging.DEBUG)       # in an imported module

def handle_payment(request):
    logging.info(f"handling payment for {request.user_id}")
    logging.debug(f"headers: {dict(request.headers)}")
    try:
        result = gateway.charge(request.amount, request.card_token)
    except Exception as e:
        logging.error("payment failed: " + str(e))
        return {"ok": False}
    logging.info(f"charged {request.amount} for {request.user_id}, id={result.id}")
    return {"ok": True, "charge_id": result.id}`},
        { t: "p", text: "Rewrite it, and build the configuration it needs." }
      ],
      requirements: [
        "Find all seven problems in the snippet before rewriting.",
        "Use a module logger, and move configuration to an entry point.",
        "Emit structured fields, with a stable message string per event.",
        "Attach a request ID to every line without threading it through signatures.",
        "Guarantee the card token and the Authorization header cannot reach a log.",
        "Preserve the traceback on failure, and pick levels a responder would agree with.",
        "Write tests that assert on the emitted records — including one proving a secret is redacted."
      ],
      hint: "`logging.info(...)` on the module calls the **root** logger, which is a different bug from `basicConfig` in a library. And look carefully at what `except Exception` plus `str(e)` throws away.",
      solution: {
        lang: "python",
        title: "handlers.py",
        code: `from __future__ import annotations

# =========================================================================
# THE SEVEN PROBLEMS
# =========================================================================
#
# 1. basicConfig() at import time in a library module -- adds a handler to
#    the ROOT logger, so the application's own configuration is either
#    duplicated or silently overridden, depending on import order.
#
# 2. logging.info(...) uses the ROOT logger directly. There is no logger
#    name, so an operator cannot raise this module to DEBUG without
#    raising every dependency too.
#
# 3. f-strings: evaluated even when the level is disabled, and they make
#    every call a UNIQUE message, so an aggregator cannot group them.
#
# 4. dict(request.headers) at DEBUG logs the Authorization header.
#
# 5. except Exception with str(e): no traceback, no exception type, and
#    it catches genuine bugs (a TypeError in our own code) as if they
#    were payment failures.
#
# 6. Values are embedded in prose, so "every failure for user 44" is a
#    substring search rather than a field query.
#
# 7. DEBUG as the global level in production: high volume, and it is the
#    level at which libraries print request bodies.

import contextvars
import logging
import uuid
from typing import Any

log = logging.getLogger(__name__)               # 1 + 2

request_id: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="-"
)

REDACTED = "***"
SENSITIVE_HEADERS = {"authorization", "cookie", "x-api-key", "proxy-authorization"}


def safe_headers(headers: dict[str, str]) -> dict[str, str]:
    """Redact at the SOURCE. The filter downstream is a backstop, not
    a licence to log raw headers."""
    return {
        k: (REDACTED if k.lower() in SENSITIVE_HEADERS else v)
        for k, v in headers.items()
    }


def fingerprint(token: str) -> str:
    """Enough to correlate two log lines about the same card, useless
    to anyone who steals the log."""
    return f"tok_{token[-4:]}" if len(token) >= 4 else REDACTED


def handle_payment(request: Any) -> dict[str, Any]:
    token = request_id.set(
        request.headers.get("X-Request-ID") or str(uuid.uuid4())
    )
    try:
        # DEBUG, lazy, redacted, and structured.
        log.debug("payment request received", extra={
            "user_id": request.user_id,
            "amount_pence": request.amount,
            "headers": safe_headers(dict(request.headers)),
            "card": fingerprint(request.card_token),
        })

        try:
            result = gateway.charge(request.amount, request.card_token)

        except PaymentRejected as err:
            # WARNING, not ERROR: the system worked correctly. A decline
            # is a business outcome, and paging on it teaches the team
            # to ignore the channel (Lesson 6.3).
            log.warning("payment rejected", extra={
                "user_id": request.user_id,
                "amount_pence": request.amount,
                "reason": getattr(err, "decline_code", "unknown"),
            })
            return {"ok": False, "reason": "rejected"}

        except TransientError:
            # ERROR: a user is affected and nobody chose this outcome.
            # exception() attaches the traceback -- the exception TYPE is
            # often the only thing that identifies which dependency broke.
            log.exception("payment gateway unavailable", extra={
                "user_id": request.user_id,
                "amount_pence": request.amount,
            })
            return {"ok": False, "reason": "unavailable"}

        # INFO: the event a dashboard counts. Message is a CONSTANT.
        log.info("payment captured", extra={
            "user_id": request.user_id,
            "amount_pence": request.amount,
            "charge_id": result.id,
        })
        return {"ok": True, "charge_id": result.id}

    finally:
        request_id.reset(token)


# =========================================================================
# Configuration -- entry point only
# =========================================================================

import os
import re
import sys

SECRET_PATTERN = re.compile(
    r"(?i)\\b(authorization|api[_-]?key|password|secret|card_token)\\b"
    r"([\\\"':=\\s]+)(\\S+)"
)


class ContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id.get()
        return True


class RedactingFilter(logging.Filter):
    """The backstop. Catches secrets that reached a message despite the
    redaction at source -- which, across a large codebase, is always
    something."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = SECRET_PATTERN.sub(r"\\1\\2" + REDACTED, record.msg)
        if record.args:
            record.args = tuple(
                SECRET_PATTERN.sub(r"\\1\\2" + REDACTED, a) if isinstance(a, str) else a
                for a in record.args
            )
        return True


def configure_logging() -> None:
    """Call once, from main(). Never at import time."""
    import logging.config

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "context": {"()": ContextFilter},
            "redact": {"()": RedactingFilter},
        },
        "formatters": {
            "text": {
                "format": "%(asctime)s %(levelname)-8s %(name)s "
                          "[%(request_id)s] %(message)s",
            },
        },
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": "text",
                "filters": ["context", "redact"],
            },
        },
        "root": {
            "level": os.environ.get("LOG_LEVEL", "INFO").upper(),
            "handlers": ["stdout"],
        },
        "loggers": {"urllib3": {"level": "WARNING"}},
    })


# =========================================================================
# Tests -- assert on RECORDS, not on captured text
# =========================================================================

def test_success_logs_one_info_with_fields(caplog) -> None:
    with caplog.at_level(logging.INFO):
        handle_payment(FakeRequest(user_id=44, amount=1999))

    record = next(r for r in caplog.records if r.message == "payment captured")

    # The message is a CONSTANT -- this assertion would break with f-strings
    assert record.levelname == "INFO"
    assert record.user_id == 44
    assert record.amount_pence == 1999


def test_decline_is_warning_not_error(caplog) -> None:
    """A responder woken at 3 a.m. by a customer's expired card learns
    to mute the channel."""
    with caplog.at_level(logging.DEBUG):
        handle_payment(FakeRequest(user_id=44, amount=1999, declines=True))

    levels = {r.message: r.levelname for r in caplog.records}
    assert levels["payment rejected"] == "WARNING"


def test_gateway_failure_keeps_the_traceback(caplog) -> None:
    with caplog.at_level(logging.ERROR):
        handle_payment(FakeRequest(user_id=44, amount=1999, unavailable=True))

    record = caplog.records[-1]
    assert record.levelname == "ERROR"
    assert record.exc_info is not None                  # log.exception, not log.error
    assert "TransientError" in caplog.text


def test_no_secret_reaches_a_record(caplog) -> None:
    """Two layers, tested together: source redaction and the filter."""
    with caplog.at_level(logging.DEBUG):
        handle_payment(FakeRequest(
            user_id=44, amount=1999,
            card_token="tok_live_4111111111111111",
            headers={"Authorization": "Bearer sk_live_SECRET"},
        ))

    text = caplog.text
    assert "sk_live_SECRET" not in text
    assert "4111111111111111" not in text
    assert "tok_1111" in text                           # the fingerprint survives


def test_request_id_is_attached_and_does_not_leak(caplog) -> None:
    filt = ContextFilter()

    handle_payment(FakeRequest(user_id=1, amount=1, headers={"X-Request-ID": "abc"}))
    for record in caplog.records:
        filt.filter(record)
        assert record.request_id == "abc"

    # reset() in the finally means the next request starts clean
    assert request_id.get() == "-"


if __name__ == "__main__":
    print("run with pytest -- caplog is a pytest fixture")`,
        notes: [
          { t: "p", text: "**Asserting on `caplog.records`, not `caplog.text`, is what makes these tests meaningful.** `record.user_id == 44` can only pass if the value was a structured field; a test that greps the rendered string passes just as happily for an f-string, so it would never catch a regression back to prose." },
          { t: "p", text: "**The decline being WARNING rather than ERROR is a judgement, and the test records it.** The system did exactly what it should — a card was refused. Logging that at ERROR is how a team ends up with an alert channel nobody reads, and once that happens the real errors are invisible too." },
          { t: "p", text: "**Two layers of secret protection, both tested.** `safe_headers` and `fingerprint` stop the secret entering the record at all; `RedactingFilter` catches whatever some other module logs carelessly. Relying only on the filter means trusting a regex against every future call site; relying only on discipline means trusting every future engineer." },
          { t: "callout", kind: "insight", title: "Why the message must be a constant", body: [
            { t: "p", text: "Error trackers and log aggregators fingerprint on the raw message template. `\"payment captured\"` with fields is one event with a million occurrences you can group, count and alert on a rate change." },
            { t: "p", text: "`f\"charged 1999 for 44\"` is a million distinct events. Grouping breaks, rate alerting is impossible, and the search that would answer \"how often does this happen\" returns one result each time." }
          ]},
          { t: "p", text: "**`request_id.reset(token)` in a `finally` is the detail that separates working code from a subtle bug.** Without it a `ContextVar` set during one request persists into whatever runs next on that task, and log lines get attributed to the wrong request — which is worse than having no correlation ID at all, because it is confidently wrong." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A payments team is asked how many customers were affected by a 40-minute outage. The logs are complete — every failure was recorded. Answering takes two days." },
      { t: "p", text: "**The messages were f-strings.** `f\"payment failed for user {uid}: {err}\"` produced a distinct message per line, so the aggregator had 90,000 unique events rather than one event with 90,000 occurrences. There was no `user_id` field to count distinct values of, only a substring inside prose, and the error text varied because it included the gateway's message." },
      { t: "p", text: "**Someone wrote a regex over exported logs.** It missed the lines where a user ID happened to appear in a different position, and nobody could prove the count was right — so the number given to the customer-communications team came with a caveat that made it unusable." },
      { t: "p", text: "**One field would have answered it in ten seconds.** `log.error(\"payment failed\", extra={\"user_id\": uid})` makes the query a count of distinct `user_id` where `message = \"payment failed\"`. The cost of structured logging is a slightly less natural-looking call; the cost of not having it is discovered on the day you most need the answer." }
    ]}
  ],

  takeaways: [
    "**Libraries get a logger; applications configure one.** `basicConfig` in an imported module adds a root handler at import time and duplicates or overrides the application's own setup.",
    "**Use `logging.getLogger(__name__)`** so logger names inherit the package hierarchy — an operator can then raise one package to DEBUG without turning on everything.",
    "A record passes the logger's level check, then its handlers, then **propagates up to every ancestor's handlers**. A handler on both a child and the root logs every line twice.",
    "**Use `%s` arguments, not f-strings.** Interpolation is deferred when the level is disabled, and the message stays a constant that aggregators can group and count.",
    "**Levels are about who acts and how fast.** A retry that eventually succeeded is a WARNING; a business decline is a WARNING; only a failure someone must fix today is an ERROR.",
    "**`log.exception()` attaches the traceback** and works only inside an `except` block. `str(err)` throws away the exception type, which is often the only thing identifying the broken dependency.",
    "**Put varying values in `extra`, not in the message**, so `order_id:8821` is a field query rather than a substring search — and beware reserved names, which raise.",
    "**A `Filter` can modify records, not just drop them.** That is where correlation IDs and redaction belong, because it applies everywhere without touching call sites.",
    "**A `ContextVar` gives a per-request ID** that concurrent tasks cannot see across — and it must be `reset()` in a `finally`, or lines get attributed to the wrong request.",
    "**Redact at the source and filter as a backstop.** Never log a whole headers dict, override `__repr__` on anything holding a credential, and treat a logged token as one to rotate.",
    "**In a container, log to stdout.** Files die with the container, rotation fights the orchestrator, and the platform's collector is already reading stdout.",
    "`dictConfig` with `disable_existing_loggers: False` is the whole application setup — the default `True` silences every logger created before the call."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why should a library module never call `logging.basicConfig()`?",
        options: [
          "It is slow at import time",
          "It adds a handler to the root logger at import, so the application's configuration is duplicated or overridden depending on import order",
          "It is deprecated in favour of `dictConfig`",
          "It forces the DEBUG level on every logger"
        ],
        answer: 1,
        why: "`basicConfig` configures the **root** logger, which is shared by the whole process. When a library does it at import time, whichever module imported first wins on format and level, and the application's own handler then produces a second copy of every line. A library should only call `logging.getLogger(__name__)` — plus, at package level, a `NullHandler` to avoid the no-handlers warning."
      },
      {
        stem: "Why `log.info(\"order failed\", extra={\"order_id\": oid})` rather than an f-string?",
        options: [
          "f-strings cannot contain variables in logging calls",
          "The message stays a constant that aggregators group and count, and the value becomes a queryable field rather than a substring",
          "`extra` output is compressed",
          "f-strings break the `%` formatter"
        ],
        answer: 1,
        why: "Error trackers fingerprint on the raw message, so an f-string turns one recurring problem into thousands of unique events — grouping breaks and rate alerting becomes impossible. The field also makes \"how many distinct customers were affected\" a count rather than a regex over exported logs. The deferred-evaluation performance gain is real but secondary."
      },
      {
        stem: "A payment is declined because the customer's card expired. What level?",
        options: [
          "ERROR — the payment did not go through",
          "WARNING — the system worked correctly and no engineer needs to act, but someone may want to see the rate",
          "CRITICAL — revenue is affected",
          "DEBUG — it is routine"
        ],
        answer: 1,
        why: "The level should say who acts and how quickly. A decline is a correct outcome of a working system: nobody is paged, nothing is broken, and the customer is told. Logging it as ERROR inflates the error rate until the team stops trusting the channel — and then the genuine gateway outage, logged at the same level, is invisible too."
      },
      {
        stem: "You need a request ID on every log line in a concurrent service. What is the right mechanism?",
        options: [
          "Pass it as a parameter through every function that logs",
          "A `ContextVar` read by a logging `Filter`, set per request and reset in a `finally`",
          "A module-level global assigned at the start of each request",
          "A thread-local, since asyncio tasks share threads safely"
        ],
        answer: 1,
        why: "A filter can modify records, so one object attaches the ID to every line without touching a single call site. A `ContextVar` is isolated per task and per thread, where a module-level global would return whichever request wrote to it last — confidently wrong attribution, which is worse than none. The `reset()` in a `finally` matters: without it the value persists into whatever runs next on that task."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you set up logging in a Python application?",
        strong: "One configuration call at the entry point — `dictConfig` with a `StreamHandler` on stdout and `disable_existing_loggers: False`. Every module does `logging.getLogger(__name__)` and nothing else. In a container, stdout and let the platform ship it.",
        answer: [
          { t: "p", text: "The library-versus-application split is the part that shows you have debugged someone else's duplicate log lines: `basicConfig` in an imported module configures the root logger at import time, and import order then decides your format." },
          { t: "p", text: "`__name__` as the logger name is worth justifying rather than stating — it gives an operator a hierarchy to turn up one package without drowning in a dependency's DEBUG output." },
          { t: "p", text: "The `disable_existing_loggers: False` detail is a small thing that has silenced a lot of production logging, and mentioning it signals you have written the config rather than copied it." }
        ]
      },
      {
        level: "advanced",
        q: "What makes logs useful in an incident?",
        strong: "Structure. A stable message with fields you can filter and aggregate, a correlation ID tying one request's lines together, levels that mean who acts, and tracebacks preserved via `log.exception`.",
        answer: [
          { t: "p", text: "The concrete failure makes the case: an f-string message turns one problem into 90,000 unique events, so \"how many customers were affected\" becomes a two-day regex exercise instead of a ten-second count." },
          { t: "p", text: "Correlation IDs via a `ContextVar` and a filter is the design detail — it applies everywhere without threading a parameter through every signature, which is the reason teams abandon the idea." },
          { t: "p", text: "Level discipline belongs in the same answer: an ERROR channel inflated with business outcomes gets muted, and then it is useless for the incident it existed for." }
        ]
      },
      {
        level: "advanced",
        q: "How do you stop secrets ending up in logs?",
        strong: "Two layers. At the source, never log whole headers or request objects, and override `__repr__` on anything holding a credential. As a backstop, a logging `Filter` that redacts known key patterns from messages and args.",
        answer: [
          { t: "p", text: "Naming both layers and why neither suffices alone is the answer: a filter alone trusts a regex against every future call site, and discipline alone trusts every future engineer." },
          { t: "p", text: "The `__repr__` route is the one people miss — a dataclass prints every field, so any traceback holding a client object puts the API key in the error tracker without anyone logging it deliberately." },
          { t: "p", text: "Closing on the operational consequence lands it: a logged token is a rotated token, because logs are copied to aggregators, retained for months and readable by far more people than the database." }
        ]
      }
    ]
  }
});
