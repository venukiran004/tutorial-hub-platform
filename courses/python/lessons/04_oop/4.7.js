/* ============================================================================
   LESSON 4.7 — Composition Over Inheritance
   ========================================================================= */
EC.receiveLesson({
  id: "4.7",

  lede: "Inheritance is the first tool people reach for and the wrong one most of the time. The reason is structural: **inheritance is a compile-time decision that fixes one axis of variation forever**, and real requirements vary along several axes at once. Composition lets you change them independently, and it produces objects you can test without constructing a hierarchy.",

  objectives: [
    "Apply the is-a test and recognise when reuse is masquerading as it",
    "Spot the class explosion that signals multiple axes of variation",
    "Convert an inheritance hierarchy to composition without changing callers",
    "Choose between composition, delegation and inheritance deliberately",
    "Explain why composed designs are easier to test"
  ],

  prerequisites: ["4.5", "4.6"],

  blocks: [

    { t: "h2", n: "01", text: "The is-a test, and how it fails", id: "is-a" },

    { t: "p", text: "The usual advice is *inherit when B is-a A, compose when B has-a A.* That is correct and insufficient, because English lets you claim is-a for almost anything. `AdminUser` is-a `User`. `CachedRepository` is-a `Repository`. `RetryingHttpClient` is-a `HttpClient`. All plausible, and only one of them is a good idea." },

    { t: "callout", kind: "mental", title: "The sharper test", body: [
      { t: "p", text: "**Is every instance of the subclass usable everywhere the base class is expected, with no caller needing to know the difference?**" },
      { t: "p", text: "That is the Liskov substitution principle, and it is a stricter question than is-a. Apply it to the three examples above:" },
      { t: "ul", items: [
        "`AdminUser` — yes. Anywhere a `User` is used, an admin works. Inheritance is fine.",
        "`CachedRepository` — usually yes, but with a caveat: it returns stale data, and a caller expecting freshness is now wrong. If that matters, it is not substitutable.",
        "`RetryingHttpClient` — no. It changes timing and can repeat side effects (Lesson 3.7). A caller doing a non-idempotent POST is broken by the substitution and cannot tell."
      ]},
      { t: "p", text: "The failures are not about vocabulary. They are about **behaviour a caller relies on that the subclass silently changes** — which is exactly what inheritance hides and composition makes visible." }
    ]},

    { t: "h2", n: "02", text: "The class explosion", id: "explosion" },

    {"kind": "tree", "title": "The class explosion", "caption": "Every combination of two axes needs its own subclass: 2 × 3 today, 3 × 4 next quarter. Composition holds one object per axis and combines them at runtime.", "root": {"label": "Report", "children": [{"label": "PdfReport", "tone": "accent", "children": [{"label": "PdfSalesReport", "tone": "crit"}, {"label": "PdfStockReport", "tone": "crit"}]}, {"label": "HtmlReport", "tone": "accent", "children": [{"label": "HtmlSalesReport", "tone": "crit"}, {"label": "HtmlStockReport", "tone": "crit"}]}]}, "t": "diagram", "id": "dg-4_7-02-0"},




    { t: "p", text: "The clearest signal that inheritance is the wrong axis is combinatorial growth. Every new capability doubles the number of classes." },

    { t: "viz",
      title: "Two axes of variation, one inheritance chain",
      caption: "Inheritance can vary along one axis cleanly. Two independent axes force a class per combination, and a third makes it unmanageable. Composition holds each axis as a separate collaborator, so n plus m replaces n times m.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Diagram contrasting combinatorial class explosion under inheritance with independent collaborators under composition">
  <defs>
    <marker id="b5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--crit)">INHERITANCE — one class per combination</text>

  <rect x="20" y="38" width="150" height="28" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="95" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">Report</text>

  <g style="stroke:var(--border-strong)" stroke-width="1.1" fill="none">
    <path d="M70 66 L48 88" marker-end="url(#b5)"/>
    <path d="M120 66 L200 88" marker-end="url(#b5)"/>
  </g>

  <rect x="20" y="92" width="120" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="80" y="110" text-anchor="middle" class="s-mono" style="font-size:9.5px">CsvReport</text>
  <rect x="150" y="92" width="120" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="210" y="110" text-anchor="middle" class="s-mono" style="font-size:9.5px">JsonReport</text>

  <g style="stroke:var(--crit)" stroke-width="1.1" fill="none" stroke-dasharray="3 2">
    <path d="M55 118 L40 140"/><path d="M105 118 L150 140"/>
    <path d="M185 118 L262 140"/><path d="M235 118 L372 140"/>
  </g>

  <rect x="14" y="144" width="112" height="26" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="70" y="162" text-anchor="middle" class="s-mono" style="font-size:9px">CsvGzipReport</text>
  <rect x="130" y="144" width="112" height="26" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="186" y="162" text-anchor="middle" class="s-mono" style="font-size:9px">CsvZipReport</text>
  <rect x="246" y="144" width="118" height="26" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="305" y="162" text-anchor="middle" class="s-mono" style="font-size:9px">JsonGzipReport</text>
  <rect x="368" y="144" width="112" height="26" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="424" y="162" text-anchor="middle" class="s-mono" style="font-size:9px">JsonZipReport</text>

  <text x="20" y="196" class="s-sub" style="fill:var(--crit)">2 formats x 2 compressions = 4 classes.  Add encryption: 8.  Add a format: 12.</text>

  <line x1="20" y1="212" x2="880" y2="212" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="238" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--good)">COMPOSITION — one collaborator per axis</text>

  <rect x="20" y="252" width="150" height="46" rx="8" style="fill:var(--good-soft);stroke:var(--good)" stroke-width="1.5"/>
  <text x="95" y="272" text-anchor="middle" class="s-mono" style="font-size:10px">Report</text>
  <text x="95" y="288" text-anchor="middle" class="s-sub">holds two collaborators</text>

  <line x1="170" y1="266" x2="228" y2="266" style="stroke:var(--good)" stroke-width="1.4" marker-end="url(#b5)"/>
  <rect x="234" y="252" width="140" height="26" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="304" y="270" text-anchor="middle" class="s-mono" style="font-size:9.5px">Formatter</text>
  <line x1="170" y1="284" x2="228" y2="284" style="stroke:var(--good)" stroke-width="1.4" marker-end="url(#b5)"/>
  <rect x="234" y="284" width="140" height="26" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="304" y="302" text-anchor="middle" class="s-mono" style="font-size:9.5px">Compressor</text>

  <text x="400" y="270" class="s-sub" style="fill:var(--good)">2 formatters + 2 compressors = 4 small classes,</text>
  <text x="400" y="288" class="s-sub" style="fill:var(--good)">and every combination already works.</text>
  <text x="400" y="306" class="s-sub">Adding encryption is 1 more class, not 8.</text>
</svg>`
    },

    { t: "ladder",
      title: "A report that can be formatted and compressed",
      rungs: [
        { level: "bad", label: "A class per combination", why: "n times m",
          code: `class Report: ...
class CsvReport(Report): ...
class JsonReport(Report): ...
class CsvGzipReport(CsvReport): ...
class CsvZipReport(CsvReport): ...
class JsonGzipReport(JsonReport): ...
class JsonZipReport(JsonReport): ...`,
          note: "The compression logic is duplicated across the two branches, because it cannot be shared without multiple inheritance and the MRO problems of Lesson 4.5. Adding Parquet means three new classes; adding encryption doubles everything." },

        { level: "ok", label: "Mixins", why: "fewer classes, new problems",
          code: `class GzipMixin:
    def compress(self, data: bytes) -> bytes:
        return gzip.compress(data)


class CsvGzipReport(GzipMixin, CsvReport): ...
class JsonGzipReport(GzipMixin, JsonReport): ...`,
          note: "The duplication is gone and the combinatorial class count is not — you still declare a class per pairing. It also reintroduces MRO ordering questions, and the compression cannot be chosen at runtime: it is baked into the type at import." },

        { level: "best", label: "Collaborators", why: "n plus m, chosen at runtime",
          code: `from typing import Protocol


class Formatter(Protocol):
    def format(self, rows: list[dict]) -> bytes: ...


class Compressor(Protocol):
    def compress(self, data: bytes) -> bytes: ...


class Report:
    def __init__(
        self,
        rows: list[dict],
        *,
        formatter: Formatter,
        compressor: Compressor = NoCompression(),
    ) -> None:
        self._rows = rows
        self._formatter = formatter
        self._compressor = compressor

    def render(self) -> bytes:
        return self._compressor.compress(self._formatter.format(self._rows))


Report(rows, formatter=CsvFormatter(), compressor=Gzip())
Report(rows, formatter=JsonFormatter())          # no compression`,
          note: "One `Report` class. Two formatters and two compressors are four small classes, and every combination already works — including combinations nobody anticipated. The choice is made at runtime, so it can come from configuration. And each piece is testable alone: `CsvFormatter().format(rows)` needs no `Report` at all." }
      ]
    },

    { t: "h2", n: "03", text: "Delegation without boilerplate", id: "delegation" },

    {"kind": "flow", "title": "Composition: has-a instead of is-a", "caption": "Report holds a renderer and a data source; new combinations are constructor arguments, not new classes.", "cols": 3, "nodes": [{"id": "r", "label": "Report", "sub": "orchestrates", "tone": "good"}, {"id": "ren", "label": "renderer", "sub": "Pdf | Html", "tone": "accent"}, {"id": "src", "label": "source", "sub": "Sales | Stock", "tone": "warn"}], "edges": [["r", "ren", "has a"], ["r", "src", "has a"]], "t": "diagram", "id": "dg-4_7-03-1"},




    { t: "p", text: "The usual objection to composition is boilerplate: an inherited method comes free, a delegated one has to be forwarded. Python has three answers depending on how much of the interface you are exposing." },

    { t: "tabs", items: [
      { label: "Explicit forwarding", blocks: [
        { t: "code", lang: "python", title: "best for a small, deliberate surface", code: `
class Playlist:
    def __init__(self, tracks: list[Track]) -> None:
        self._tracks = tracks

    # Forward only what the abstraction should expose.
    def __len__(self) -> int:
        return len(self._tracks)

    def __iter__(self) -> Iterator[Track]:
        return iter(self._tracks)

    def add(self, track: Track) -> None:
        if track in self._tracks:
            raise ValueError(f"{track.title!r} is already in the playlist")
        self._tracks.append(track)
`},
        { t: "p", text: "Verbose and correct. The forwarding is the design: `add` enforces a rule that `list.append` does not, and `sort`, `clear` and `pop` are deliberately unavailable. Inheriting from `list` would have exposed all of them and made the rule unenforceable — the Lesson 4.4 leak, in structural form." }
      ]},
      { label: "__getattr__ catch-all", blocks: [
        { t: "code", lang: "python", title: "forward everything not defined locally", code: `
class LoggingConnection:
    """Wraps a DB connection, logging queries, forwarding the rest."""

    def __init__(self, wrapped: Connection) -> None:
        self._wrapped = wrapped

    def execute(self, sql: str, params: tuple = ()) -> Cursor:
        logger.debug("sql: %s", sql)
        return self._wrapped.execute(sql, params)

    def __getattr__(self, name: str):
        # Called ONLY when normal lookup fails, so the methods defined
        # above are never routed through here.
        return getattr(self._wrapped, name)
`},
        { t: "callout", kind: "warn", title: "The costs of the catch-all", body: [
          { t: "ul", items: [
            "**Dunder methods are not forwarded.** Special methods are looked up on the *type*, not the instance, so `len(wrapper)` and `with wrapper:` bypass `__getattr__` entirely. You must define those explicitly.",
            "**Autocomplete and mypy see nothing.** The wrapper has no visible interface, so tooling cannot help callers.",
            "**A typo becomes a wrong forward.** `conn.exectue(...)` is forwarded to the wrapped object rather than raising, and fails there with a confusing message.",
            "**Infinite recursion is one mistake away.** Referencing `self._wrapped` before it is set — during `__init__`, or after unpickling — re-enters `__getattr__` forever (Lesson 1.9)."
          ]}
        ]}
      ]},
      { label: "Generated forwarding", blocks: [
        { t: "code", lang: "python", title: "explicit, without typing it by hand", code: `
def _forward(*names: str):
    """Class decorator: generate explicit delegating methods."""
    def decorate(cls):
        for name in names:
            def make(method_name: str):        # factory: avoids the
                def method(self, *args, **kwargs):   # late-binding trap
                    return getattr(self._wrapped, method_name)(*args, **kwargs)
                method.__name__ = method_name
                return method
            setattr(cls, name, make(name))
        return cls
    return decorate


@_forward("commit", "rollback", "close")
class LoggingConnection:
    def __init__(self, wrapped: Connection) -> None:
        self._wrapped = wrapped
`},
        { t: "p", text: "A middle ground: the forwarded names are listed explicitly, so the surface is visible and a typo on an unlisted method still raises. Note the `make(name)` factory — building the closures in a loop without it would hit the late-binding trap from Lesson 3.6 and every generated method would forward to the last name." }
      ]}
    ]},

    { t: "callout", kind: "trap", title: "Inheriting from built-ins to \"reuse\" them", body: [
      { t: "code", lang: "python", title: "the surface you did not mean to expose", numbered: false, code: `
class Playlist(list):
    def add(self, track):
        if track in self:
            raise ValueError("already present")
        self.append(track)


p = Playlist()
p.add(track)          # goes through the rule
p.append(track)       # bypasses it entirely -- and so do
                      # extend, insert, __setitem__, __iadd__ ...`},
      { t: "p", text: "Inheriting from `list` inherits every mutating method, and each one is a hole in the rule `add` was written to enforce. There is no way to close them without overriding all of them, and new ones may appear in future Python versions." },
      { t: "p", text: "There is a second, subtler problem: built-in methods implemented in C often do not call your overrides. `dict.update` does not go through your `__setitem__`, so overriding it protects less than you would expect. `collections.UserList` and `UserDict` exist precisely because of this — but composition is usually the better answer, because it lets you expose *only* the operations your abstraction actually has." }
    ]},

    { t: "h2", n: "04", text: "When inheritance is right", id: "when-inheritance" },

    { t: "table",
      head: ["Use inheritance when", "Use composition when"],
      rows: [
        ["The subclass is genuinely substitutable — no caller needs to know", "Behaviour varies along more than one axis"],
        ["You are extending a framework that requires it — a Django model, a pytest plugin", "You want to choose the behaviour at runtime or from configuration"],
        ["There is real shared implementation, and the hierarchy is one level deep", "You want each piece testable on its own"],
        ["The relationship will never change for an instance", "The relationship might change during the object's life"],
        ["You control both the base and every subclass", "You are wrapping something you do not control"]
      ],
      caption: "Framework inheritance is the case people forget. Subclassing `models.Model` or `unittest.TestCase` is correct and unavoidable — the framework's contract *is* the base class, and fighting it produces worse code than accepting it."
    },

    { t: "callout", kind: "tradeoff", title: "The honest costs of composition", body: [
      { t: "ul", items: [
        "**More objects to wire.** Three collaborators means three constructor parameters, and something must assemble them — usually a factory or the application's startup code.",
        "**An extra indirection when reading.** `report._formatter.format(...)` is one hop further than an inherited `self.format(...)`.",
        "**Forwarding boilerplate**, unless the exposed surface is deliberately small — which it usually should be.",
        "**Harder to discover.** An inherited method appears in autocomplete on the object; a delegated one may not."
      ]},
      { t: "p", text: "These are real, and they are why *some* inheritance is correct. The judgement is that the costs are fixed and small, while inheritance's costs grow with the hierarchy — a second axis of variation turns a mild annoyance into a combinatorial problem." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Break a class explosion",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "The notification hierarchy below has grown to nine classes across three axes: channel, formatting and delivery guarantee. A fourth channel would add three more, and a second formatting option would add four." },
        { t: "p", text: "Convert it to composition, keeping the existing call sites working. Then add a capability that would have required six new classes and show that it requires one." }
      ],
      requirements: [
        "Identify the axes of variation and say how many classes the current design needs for each new value.",
        "Define a `Protocol` per axis, describing only what the sender requires.",
        "Reduce it to one `Notifier` class holding collaborators.",
        "Keep the existing call sites working with a factory or classmethod, so nothing outside changes on the day you ship.",
        "Add a new delivery guarantee and show it needs one class, not six.",
        "Write a test that combines two collaborators the original design had no class for."
      ],
      hint: "The last requirement is the point of the exercise: composition supports combinations nobody wrote a class for, which is what makes n+m beat n×m.",
      solution: {
        lang: "python",
        title: "notifications.py",
        code: `# ---- the original: 9 classes, 3 axes ------------------------------------
#
#   Notification
#     EmailNotification
#       PlainEmailNotification
#         RetryingPlainEmailNotification
#       HtmlEmailNotification
#         RetryingHtmlEmailNotification
#     SmsNotification
#       RetryingSmsNotification
#     SlackNotification
#
# AXES:  channel (email, sms, slack)
#        formatting (plain, html)
#        delivery (immediate, retrying)
#
# A fourth channel needs 3 new classes. A second formatting option needs
# 4. Adding "queued" delivery needs 6. And the design already has holes:
# there is no HtmlSmsNotification, because nobody wrote one -- not
# because the combination is meaningless.


# ---- the redesign -------------------------------------------------------

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Protocol

logger = logging.getLogger(__name__)


# ---- one protocol per axis, each declaring only what is needed ----

class Channel(Protocol):
    """Delivers an already-formatted body to a recipient.

    Raises:
        DeliveryError: the message could not be delivered. Callers may
        retry only if the channel documents itself as idempotent.
    """
    name: str

    def deliver(self, recipient: str, body: str) -> None: ...


class Formatter(Protocol):
    """Turns a subject and message into a channel-ready body."""

    def format(self, subject: str, message: str) -> str: ...


class DeliveryPolicy(Protocol):
    """Decides how a delivery attempt is made."""

    def execute(self, send: Callable[[], None]) -> None: ...


class DeliveryError(Exception):
    """A notification could not be delivered."""


# ---- channels ----

@dataclass
class EmailChannel:
    name: str = "email"

    def deliver(self, recipient: str, body: str) -> None:
        logger.info("email -> %s (%d chars)", recipient, len(body))


@dataclass
class SmsChannel:
    name: str = "sms"
    max_length: int = 160

    def deliver(self, recipient: str, body: str) -> None:
        if len(body) > self.max_length:
            raise DeliveryError(
                f"sms body is {len(body)} chars, max {self.max_length}"
            )
        logger.info("sms -> %s", recipient)


@dataclass
class SlackChannel:
    name: str = "slack"

    def deliver(self, recipient: str, body: str) -> None:
        logger.info("slack -> %s", recipient)


# ---- formatters ----

class PlainFormatter:
    def format(self, subject: str, message: str) -> str:
        return f"{subject}\\n\\n{message}"


class HtmlFormatter:
    def format(self, subject: str, message: str) -> str:
        return f"<h1>{subject}</h1><p>{message}</p>"


class MarkdownFormatter:
    def format(self, subject: str, message: str) -> str:
        return f"*{subject}*\\n{message}"


# ---- delivery policies ----

class Immediate:
    def execute(self, send: Callable[[], None]) -> None:
        send()


@dataclass
class Retrying:
    attempts: int = 3
    base_delay: float = 1.0

    def execute(self, send: Callable[[], None]) -> None:
        for attempt in range(1, self.attempts + 1):
            try:
                send()
                return
            except DeliveryError:
                if attempt == self.attempts:
                    raise
                time.sleep(self.base_delay * 2 ** (attempt - 1))


# ---- THE NEW CAPABILITY: one class, not six ----

@dataclass
class Queued:
    """Hand off to a background queue instead of sending inline.

    Under the original design this needed one subclass per existing
    channel-and-formatting combination -- six classes. Here it is one,
    and it composes with every channel and formatter automatically,
    including ones written later.
    """
    queue: list[Callable[[], None]]

    def execute(self, send: Callable[[], None]) -> None:
        self.queue.append(send)


# ---- one class, three collaborators ----

class Notifier:
    def __init__(
        self,
        *,
        channel: Channel,
        formatter: Formatter,
        delivery: DeliveryPolicy | None = None,
    ) -> None:
        self._channel = channel
        self._formatter = formatter
        self._delivery = delivery or Immediate()

    def notify(self, recipient: str, subject: str, message: str) -> None:
        body = self._formatter.format(subject, message)
        self._delivery.execute(lambda: self._channel.deliver(recipient, body))

    # ---- compatibility: existing call sites keep working ----

    @classmethod
    def html_email(cls, *, retries: int = 3) -> Notifier:
        """Replaces RetryingHtmlEmailNotification."""
        return cls(
            channel=EmailChannel(),
            formatter=HtmlFormatter(),
            delivery=Retrying(attempts=retries),
        )

    @classmethod
    def plain_sms(cls) -> Notifier:
        """Replaces SmsNotification."""
        return cls(channel=SmsChannel(), formatter=PlainFormatter())


# ---- tests --------------------------------------------------------------

class RecordingChannel:
    """Satisfies Channel by shape alone -- no import, no inheritance."""

    name = "recording"

    def __init__(self, fail_times: int = 0) -> None:
        self.delivered: list[tuple[str, str]] = []
        self.attempts = 0
        self._fail_times = fail_times

    def deliver(self, recipient: str, body: str) -> None:
        self.attempts += 1
        if self.attempts <= self._fail_times:
            raise DeliveryError("transient")
        self.delivered.append((recipient, body))


def test_combination_the_original_had_no_class_for() -> None:
    """Markdown over SMS with queued delivery.

    The original hierarchy had no MarkdownSmsQueuedNotification, and
    adding one would have meant a new class. Here it is three arguments.
    """
    queue: list = []
    channel = RecordingChannel()
    notifier = Notifier(
        channel=channel,
        formatter=MarkdownFormatter(),
        delivery=Queued(queue),
    )

    notifier.notify("+44700900000", "Deploy", "all green")

    assert channel.delivered == []       # queued, not sent
    assert len(queue) == 1

    queue[0]()                           # the worker runs it later
    assert channel.delivered == [("+44700900000", "*Deploy*\\nall green")]


def test_retry_policy_is_independent_of_channel() -> None:
    channel = RecordingChannel(fail_times=2)
    notifier = Notifier(
        channel=channel,
        formatter=PlainFormatter(),
        delivery=Retrying(attempts=3, base_delay=0),
    )

    notifier.notify("a@x.com", "Alert", "disk full")

    assert channel.attempts == 3
    assert len(channel.delivered) == 1


def test_each_piece_is_testable_alone() -> None:
    """The real payoff: no Notifier needed to test a formatter."""
    assert HtmlFormatter().format("Hi", "there") == "<h1>Hi</h1><p>there</p>"

    sms = SmsChannel(max_length=10)
    try:
        sms.deliver("+44", "x" * 20)
    except DeliveryError as exc:
        assert "max 10" in str(exc)
    else:
        raise AssertionError("expected DeliveryError")


if __name__ == "__main__":
    test_combination_the_original_had_no_class_for()
    test_retry_policy_is_independent_of_channel()
    test_each_piece_is_testable_alone()
    print("3 channels + 3 formatters + 3 policies = 9 classes, 27 combinations")`,
        notes: [
          { t: "p", text: "**The arithmetic is the argument.** Nine classes under inheritance gave nine *combinations*, each one hand-written. Nine classes under composition give twenty-seven, and the combinations nobody anticipated work without anyone writing them. Adding a fourth channel takes the total to thirty-six for the cost of one class." },
          { t: "p", text: "**`Queued` is the requirement that would have hurt most.** Under the original design a queued variant of each existing combination meant six new subclasses — and every future channel would need its own queued twin. As a policy it is one class that composes with everything, including channels written afterwards." },
          { t: "p", text: "**The classmethods are what make this shippable.** `Notifier.html_email()` preserves the old call sites exactly, so the migration is a one-line import change per caller rather than a coordinated rewrite. A redesign nobody can adopt incrementally is a redesign that does not land." },
          { t: "callout", kind: "insight", title: "Why the gaps in the original were the real tell", body: [
            { t: "p", text: "The original had no `HtmlSmsNotification` — not because HTML over SMS is meaningless, but because nobody had needed it yet. Under inheritance, an unwritten combination does not exist, so the design silently constrains what callers can ask for." },
            { t: "p", text: "That is the diagnostic worth remembering: **when a hierarchy has holes that are accidental rather than deliberate, the axes are independent and want to be collaborators.** A missing combination should be a missing argument, not a missing class." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A codebase has `HttpClient`, and someone adds `RetryingHttpClient(HttpClient)` overriding `post` to retry on timeout. Months later, an order service using it starts creating duplicate orders. The order code was never changed." },
      { t: "p", text: "**The substitution was not safe.** `RetryingHttpClient` is-a `HttpClient` by every naming test, and it changes a behaviour the caller depended on: that a `post` happens at most once. Because it was injected as an `HttpClient`, the order service had no way to know — and no reason to look." },
      { t: "p", text: "**Composition would have made it visible.** `RetryPolicy(attempts=3).execute(lambda: client.post(...))` puts the retry at the call site, where the engineer writing the order code sees it and can ask whether the operation is idempotent (Lesson 3.7). The behaviour is no longer hidden behind a type." },
      { t: "p", text: "The general principle: **inheritance hides a behaviour change behind a type; composition puts it at the call site.** When the changed behaviour is something a caller relies on — timing, side effects, freshness, ordering — hiding it is the whole problem, and the is-a test will not catch it. Substitutability will." }
    ]}
  ],

  takeaways: [
    "The is-a test is too weak. Ask instead: **is the subclass usable everywhere the base is expected, with no caller needing to know?** That is substitutability, and it catches what naming does not.",
    "**Class explosion is the clearest signal.** Inheritance varies cleanly along one axis; two independent axes force a class per combination, and n×m growth is the symptom.",
    "Composition turns n×m into **n+m**, and supports combinations nobody wrote a class for.",
    "**A hierarchy with accidental holes** — a combination missing only because nobody needed it yet — means the axes are independent and want to be collaborators.",
    "Delegation has three forms: **explicit forwarding** for a small deliberate surface, `__getattr__` catch-all for a transparent wrapper, and generated forwarding as a middle ground.",
    "`__getattr__` does **not** forward dunder methods — special methods are looked up on the type, so `len()` and `with` bypass it and must be defined explicitly.",
    "**Inheriting from a built-in exposes every method you did not mean to.** `Playlist(list)` cannot enforce a rule that `append` bypasses, and C-level methods often skip your overrides entirely.",
    "Inheritance is right for **genuine substitutability**, **framework contracts** you do not control, and **one-level hierarchies with real shared implementation**.",
    "Composition's costs — wiring, indirection, forwarding — are **fixed and small**; inheritance's costs grow with the hierarchy.",
    "**Inheritance hides a behaviour change behind a type; composition puts it at the call site.** When the change affects timing, side effects or freshness, hiding it is the bug."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`RetryingHttpClient(HttpClient)` overrides `post` to retry on timeout. What is the design problem?",
        options: [
          "It violates the single responsibility principle by mixing transport and retry logic",
          "It is not substitutable — it changes a behaviour callers depend on (at-most-once delivery) and hides that change behind a type they cannot inspect",
          "Retries belong in the transport layer, not the client",
          "Nothing, provided the retry count is configurable"
        ],
        answer: 1,
        why: "It passes every is-a test and still breaks callers: a service doing a non-idempotent POST now issues duplicates, and because the object was injected as an `HttpClient` there is nothing at the call site to reveal it. Composition — `RetryPolicy().execute(lambda: client.post(...))` — puts the retry where the engineer can see it and ask whether the operation is safe to repeat."
      },
      {
        stem: "Two formats and two compression modes need four classes; adding encryption makes eight. What does this indicate?",
        options: [
          "The hierarchy needs an additional abstract base class to factor out the common code",
          "Multiple independent axes of variation — inheritance can only vary cleanly along one, so composition should hold each axis as a collaborator",
          "The classes should use multiple inheritance with mixins",
          "The format and compression logic should be merged into one class"
        ],
        answer: 1,
        why: "Combinatorial growth is the diagnostic. Inheritance fixes one axis at definition time, so a second axis forces a class per pairing and a third doubles it again. Mixins reduce duplication but keep the class count and add MRO ordering questions. Collaborators turn n×m into n+m, make the choice runtime-configurable, and support combinations nobody wrote a class for."
      },
      {
        stem: "A wrapper uses `__getattr__` to forward everything to the wrapped object. Why does `len(wrapper)` still fail?",
        options: [
          "`__getattr__` cannot return callables",
          "Special methods are looked up on the type rather than the instance, so dunder access bypasses `__getattr__` entirely",
          "`len()` requires the object to inherit from `Sized`",
          "The wrapped object's `__len__` is private"
        ],
        answer: 1,
        why: "Implicit special-method lookup goes to the type, not through the instance's attribute machinery — so `len()`, `with`, `+` and subscripting all skip `__getattr__`. Any dunder the wrapper should support must be defined explicitly. This is one of several reasons the catch-all is a blunt tool: it also hides the interface from mypy and autocomplete, and silently forwards typos."
      },
      {
        stem: "When is inheritance clearly the right choice over composition?",
        options: [
          "Whenever two classes share more than three methods",
          "When a framework's contract *is* the base class — a Django model, a pytest plugin — and you do not control it",
          "When the subclass adds new methods without overriding any",
          "When performance matters, since attribute lookup is faster than delegation"
        ],
        answer: 1,
        why: "Framework inheritance is the case people forget while reciting \"favour composition\". Subclassing `models.Model` is how the framework discovers and configures your class; fighting it produces worse code than accepting it. Shared methods alone signal reuse, which is the most common reason people inherit wrongly, and the performance difference is negligible next to the design cost."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why favour composition over inheritance?",
        strong: "Because inheritance is a definition-time decision that fixes one axis of variation, and real requirements vary along several. Two independent axes force a class per combination; composition holds each axis as a collaborator, turning n×m into n+m and letting the choice be made at runtime.",
        answer: [
          { t: "p", text: "The combinatorial argument is the one that convinces, because it is arithmetic rather than taste. Two formats and two compressions is four classes; add encryption and it is eight." },
          { t: "p", text: "The testing consequence is worth adding: composed pieces are testable alone. `CsvFormatter().format(rows)` needs no `Report`, where an inherited method can only be tested through a full instance of the subclass." },
          { t: "p", text: "Being fair about the costs keeps it credible — more wiring, an extra indirection, and forwarding boilerplate. The judgement is that those costs are fixed and small while inheritance's grow with the hierarchy." }
        ]
      },
      {
        level: "core",
        q: "How do you decide whether something should inherit?",
        strong: "Substitutability, not is-a. Ask whether every instance of the subclass is usable everywhere the base is expected, with no caller needing to know the difference. English lets you claim is-a for almost anything; substitutability catches the cases where a subclass silently changes behaviour a caller relies on.",
        answer: [
          { t: "p", text: "`RetryingHttpClient` is the example that makes the distinction vivid. It is-a `HttpClient` by any naming test, and it changes at-most-once delivery into at-least-once — which produces duplicate orders in a caller that never changed." },
          { t: "p", text: "The properties to check are timing, side effects, freshness and ordering. Those are what callers depend on implicitly and what a type signature cannot express." },
          { t: "p", text: "Naming framework inheritance as the legitimate exception shows you are not reciting a rule. Subclassing `models.Model` is how the framework works, and composition there would be fighting the tool." }
        ]
      },
      {
        level: "advanced",
        q: "What is wrong with `class Playlist(list)`?",
        strong: "It inherits every mutating method, so any rule you add in `add()` is bypassed by `append`, `extend`, `insert`, `__setitem__` and `__iadd__`. There is no way to close those holes without overriding all of them, and new ones can appear in future versions.",
        answer: [
          { t: "p", text: "The subtler half is worth volunteering: built-in methods implemented in C frequently do not call your overrides. `dict.update` does not route through a custom `__setitem__`, so overriding protects far less than it appears to." },
          { t: "p", text: "That is exactly why `collections.UserList` and `UserDict` exist — pure-Python implementations whose methods do call your overrides. Knowing they exist and why signals you have hit this." },
          { t: "p", text: "The better answer is usually composition, because it lets you expose *only* the operations your abstraction actually has. A playlist is not a list — it has no meaningful `sort` in place, and forwarding `__len__` and `__iter__` gives callers everything they need." }
        ],
        weak: "Answering only that it is \"bad practice\" or citing the Liskov principle without a concrete hole. The specific bypass — `p.append(x)` skipping the duplicate check — is what makes the argument land."
      }
    ]
  }
});
