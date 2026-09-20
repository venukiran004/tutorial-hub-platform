/* ============================================================================
   LESSON 6.2 — try / except / else / finally
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "Most Python is written with two of the four clauses. That is a shame, because `else` and `finally` are the ones that fix real bugs: `else` keeps your success path out of the protected region, and `finally` is the only construct that still runs while an exception is propagating. The discipline behind both is the same — **a `try` block should contain exactly the operations whose failure you named in the `except`, and nothing else.**",

  objectives: [
    "Predict the exact execution order of all four clauses on both the success and failure paths",
    "Use `else` to stop the success path being caught by your own handler",
    "Explain why a `return`, `break` or `continue` inside `finally` discards an in-flight exception",
    "Apply the narrowest-possible-`try` rule to a function that does four things",
    "Choose between `try/finally`, `with`, and `contextlib.suppress` for cleanup and for ignoring failures"
  ],

  prerequisites: ["6.1", "5.8"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "All four clauses, and when each runs", id: "clauses" },

    {"kind": "flow", "title": "try / except / else / finally", "caption": "except runs only on a matching exception, else only when the try body finished cleanly, finally always. Keeping the success path in else keeps the try block down to the one line that can fail.", "cols": 4, "nodes": [{"id": "try", "label": "try:", "sub": "the one call that can fail", "tone": "accent"}, {"id": "exc", "label": "except E:", "sub": "on a matching exception", "tone": "crit"}, {"id": "els", "label": "else:", "sub": "no exception — the success path", "tone": "good"}, {"id": "fin", "label": "finally:", "sub": "always — cleanup only", "tone": "warn"}], "edges": [["try", "exc", "raised"], ["try", "els", "clean"], ["exc", "fin"], ["els", "fin"]], "t": "diagram", "id": "dg-6_2-01-0"},


    { t: "code", lang: "python", title: "one function, both paths", code: `
import json
from pathlib import Path


def load_settings(path: Path) -> dict:
    handle = None
    try:
        print("try: opening")
        handle = path.open(encoding="utf-8")
        settings = json.load(handle)
    except FileNotFoundError:
        print("except: no file, using defaults")
        return {}
    else:
        print("else: parsed, so nothing raised")
        return settings
    finally:
        print("finally: closing")
        if handle is not None:
            handle.close()


print(load_settings(Path("settings.json")))
print("---")
print(load_settings(Path("missing.json")))
`,
      out: `try: opening
else: parsed, so nothing raised
finally: closing
{'retries': 3}
---
try: opening
except: no file, using defaults
finally: closing
{}`,
      caption: "Read the order in the first block: `else` runs, then `finally`, and only then does the caller receive the value. The `return` expression is evaluated before `finally`, but the function does not actually return until `finally` has finished — which is what makes the next section's trap possible."
    },

    { t: "viz",
      title: "Every path through a try statement",
      caption: "Three routes, one guarantee. `else` runs only on the route where nothing raised; the matching `except` runs only on the route where something did; `finally` is on all three — including the route where the exception is still travelling upwards and no handler here matched it.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="Diagram: three execution paths through a try statement, showing else on the success path, except on the handled path, and finally on all paths including the unhandled one">
  <defs>
    <marker id="e62a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em">PATH 1 — NOTHING RAISED</text>
  <rect x="20" y="30" width="150" height="40" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="95" y="55" text-anchor="middle" class="s-mono" style="font-size:10px">try body</text>
  <line x1="172" y1="50" x2="228" y2="50" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#e62a)"/>
  <rect x="230" y="30" width="150" height="40" rx="7" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.4"/>
  <text x="305" y="55" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">else</text>
  <line x1="382" y1="50" x2="438" y2="50" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#e62a)"/>
  <rect x="440" y="30" width="150" height="40" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="515" y="55" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">finally</text>
  <line x1="592" y1="50" x2="648" y2="50" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#e62a)"/>
  <text x="656" y="54" class="s-sub">carry on after the statement</text>

  <text x="20" y="112" class="s-sub" style="font-weight:700;letter-spacing:.08em">PATH 2 — RAISED, AND A CLAUSE MATCHED</text>
  <rect x="20" y="122" width="150" height="40" rx="7" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.2"/>
  <text x="95" y="147" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">try body raises</text>
  <line x1="172" y1="142" x2="228" y2="142" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#e62a)"/>
  <rect x="230" y="122" width="150" height="40" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="305" y="147" text-anchor="middle" class="s-mono" style="font-size:10px">first matching except</text>
  <line x1="382" y1="142" x2="438" y2="142" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#e62a)"/>
  <rect x="440" y="122" width="150" height="40" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="515" y="147" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">finally</text>
  <line x1="592" y1="142" x2="648" y2="142" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#e62a)"/>
  <text x="656" y="146" class="s-sub">carry on after the statement</text>
  <text x="230" y="178" class="s-sub" style="fill:var(--ink-3)">else is skipped entirely</text>

  <text x="20" y="216" class="s-sub" style="font-weight:700;letter-spacing:.08em">PATH 3 — RAISED, NOTHING MATCHED</text>
  <rect x="20" y="226" width="150" height="40" rx="7" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.2"/>
  <text x="95" y="251" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">try body raises</text>
  <line x1="172" y1="246" x2="438" y2="246" style="stroke:var(--crit)" stroke-width="1.3" marker-end="url(#e62a)"/>
  <text x="200" y="240" class="s-sub" style="fill:var(--crit)">no handler here</text>
  <rect x="440" y="226" width="150" height="40" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="515" y="251" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">finally</text>
  <line x1="592" y1="246" x2="648" y2="246" style="stroke:var(--crit)" stroke-width="1.3" marker-end="url(#e62a)"/>
  <text x="656" y="250" class="s-sub" style="fill:var(--crit)">exception keeps propagating</text>

  <text x="20" y="308" class="s-sub" style="fill:var(--ink-2)">finally also runs when you return, break or continue out of try, except or else. That is what makes it a guarantee — and what makes a return inside it dangerous.</text>
</svg>`
    },

    { t: "dl", items: [
      ["`try`", "The protected region. Keep it to the operations whose failure you are naming below."],
      ["`except`", "Runs when its class matches. First match wins; execution then continues after the whole statement (Lesson 6.1)."],
      ["`else`", "Runs **only if the `try` body completed without raising**, and is *not* protected by the `except` clauses above it."],
      ["`finally`", "Runs on every exit route: success, handled failure, unhandled failure, `return`, `break`, `continue`. Cleanup goes here — or in a context manager."]
    ]},

    { t: "callout", kind: "note", title: "What can still skip finally", body: [
      { t: "ul", items: [
        "**`os._exit()`** — terminates the process immediately, bypassing unwinding, `atexit` handlers and buffer flushes (Lesson 1.9).",
        "**`SIGKILL`, a hard power loss, or a segfault in a C extension** — the interpreter is not running any more, so nothing Python can promise applies.",
        "**A generator that is never resumed *and* never collected.** `finally` inside a generator runs when the generator is closed or garbage-collected; if the interpreter exits with it still suspended, that can be never. Lesson 5.7 covers the mechanics."
      ]},
      { t: "p", text: "Everything else — including `SystemExit`, `KeyboardInterrupt` and a `sys.exit()` deep in a call chain — unwinds normally, so `finally` runs. That is precisely why cleanup belongs there rather than in an `except` clause." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "else: get the success path out of the try", id: "else",
      sub: "The clause people skip, and the bug it prevents." },

    { t: "p", text: "Anything inside `try` is protected. If the success path raises the *same* exception class you are catching, your handler will claim it and report the wrong cause — and the log line will be confidently wrong, which is worse than silence." },

    { t: "code", lang: "python", title: "the misdiagnosis", code: `
def notify(users: dict, user_id: str) -> None:
    try:
        user = users[user_id]
        send_email(user["email"], "Your order shipped")
    except KeyError:
        print(f"unknown user: {user_id}")


users = {"u_1": {"name": "Ada"}}      # note: no "email" key

notify(users, "u_9")                  # genuinely unknown
notify(users, "u_1")                  # exists, but the profile is incomplete
`,
      out: `unknown user: u_9
unknown user: u_1`,
      hl: [4, 6],
      caption: "The second call is a lie. `user[\"email\"]` raised `KeyError('email')`, the handler caught it, and the log now says the user does not exist. Someone will spend an afternoon querying a database for a user that is sitting right there."
    },

    { t: "code", lang: "python", title: "the fix is one keyword", code: `
def notify(users: dict, user_id: str) -> None:
    try:
        user = users[user_id]
    except KeyError:
        print(f"unknown user: {user_id}")
    else:
        send_email(user["email"], "Your order shipped")


notify(users, "u_1")
`,
      out: `Traceback (most recent call last):
  File "/app/notify.py", line 7, in notify
    send_email(user["email"], "Your order shipped")
                ~~~~^^^^^^^^^
KeyError: 'email'`,
      caption: "Now the incomplete profile surfaces as itself — an unhandled `KeyError('email')` with a traceback pointing at the real line. A loud, accurate failure beats a quiet, inaccurate one every time."
    },

    { t: "callout", kind: "trap", title: "The same bug, wearing a suit", body: [
      { t: "p", text: "The dictionary version is easy to spot. These are the ones that reach production:" },
      { t: "code", lang: "python", title: "three real instances", numbered: false, code: `
# 1. The commit is inside the protected region, so a constraint violation
#    during commit is reported as "record not found".
try:
    row = session.get(Order, order_id)
    row.status = "paid"
    session.commit()
except NoResultFound:
    return None

# 2. json.JSONDecodeError IS a ValueError, so a malformed API response is
#    reported as a bad user-supplied quantity.
try:
    qty = int(request.args["qty"])
    payload = response.json()
except ValueError:
    raise BadRequest("qty must be a whole number")

# 3. The retry wrapper retries the SUCCESS path too: if publish() times out
#    after charge() succeeded, the whole block runs again and charges twice.
try:
    receipt = gateway.charge(order)
    events.publish("order.paid", receipt.id)
except TimeoutError:
    return retry_later(order)`},
      { t: "p", text: "In each case, moving everything after the risky call into an `else` clause makes the protected region match the `except` clause. Case 2 is worth remembering on its own: **`json.JSONDecodeError` subclasses `ValueError`**, so one careless `except ValueError` swallows both a user's typo and an upstream service returning HTML." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "finally: guaranteed, and therefore dangerous", id: "finally" },

    { t: "p", text: "`finally` runs no matter how control leaves the `try` statement. If control leaves the `finally` block by a different route — a `return`, `break` or `continue` — that new route **replaces** the old one, and an exception in flight is simply dropped." },

    { t: "code", lang: "python", title: "return in finally destroys the evidence", code: `
def parse_quantity(raw: str) -> int:
    try:
        return int(raw)
    finally:
        return -1              # every path ends here


print(parse_quantity("12"))    # the good value was computed, then discarded
print(parse_quantity("abc"))   # the ValueError was raised, then discarded
`,
      out: `-1
-1`,
      hl: [5],
      caption: "No traceback, no warning, no log line. The `ValueError` existed and was thrown away by a `return` in a cleanup block — and the correct answer for `\"12\"` was thrown away too."
    },

    { t: "code", lang: "python", title: "break and continue do the same thing", code: `
for raw in ["1", "x", "3"]:
    try:
        print(int(raw))
    finally:
        continue               # legal since 3.8 -- and it swallows the error
`,
      out: `1
3`,
      caption: "The `ValueError` from `int(\"x\")` was discarded by `continue`. Before Python 3.8 this was a `SyntaxError`, which was arguably the friendlier behaviour."
    },

    { t: "callout", kind: "trap", title: "finally is for cleanup, never for control flow", body: [
      { t: "ul", items: [
        "**Never `return` from `finally`.** It discards both the pending exception and the pending return value. `ruff` flags it as `B012`; treat it as a hard rule.",
        "**Never `break` or `continue` from `finally`** in a loop wrapping fallible work — same mechanism, same silent loss.",
        "**Do not raise from `finally` casually.** A new exception raised there replaces the one in flight, which becomes its `__context__`; the original is still in the chained traceback but is no longer what handlers see (Lesson 6.3)."
      ]},
      { t: "code", lang: "python", title: "the honest shape", numbered: false, code: `
def parse_quantity(raw: str) -> int:
    try:
        return int(raw)
    finally:
        metrics.increment("quantity.parsed")   # side effect only, no exit

# Cleanup, measurement, releasing a lock, closing a handle: yes.
# Deciding what the function returns: no.`}
    ]},

    { t: "code", lang: "python", title: "inner finally runs before the outer handler", code: `
def inner():
    try:
        raise ValueError("boom")
    finally:
        print("inner finally")        # runs during unwinding


def outer():
    try:
        inner()
    except ValueError as exc:
        print(f"outer except: {exc}")


outer()
`,
      out: `inner finally
outer except: boom`,
      caption: "Cleanup happens on the way past, before any handler further up gets control. This ordering is what makes `finally` correct for releasing resources: by the time a caller handles the failure, the file is closed and the lock is released."
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "The narrowest-possible-try discipline", id: "narrow" },

    { t: "ladder",
      title: "Charging a card and recording it, three ways",
      rungs: [
        { level: "bad", label: "One try around everything", why: "catches its own bugs",
          code: `
def settle(order, gateway, conn):
    try:
        receipt = gateway.capture(order.payment_ref, order.total)
        conn.execute("UPDATE orders SET status='settled' WHERE id=?", (order.id,))
        conn.commit()
        notify_customer(order.email, receipt)
        return receipt
    except Exception as exc:
        logger.error("settle failed: %s", exc)
        return None
`,
          note: "Four operations, one handler, no idea which failed. A typo in notify_customer looks identical to a declined card. Returning None means the caller cannot tell success from failure without checking -- and it will forget."
        },
        { level: "ok", label: "Narrow the try, keep the specific handler", why: "right failure, wrong shape",
          code: `
def settle(order, gateway, conn):
    try:
        receipt = gateway.capture(order.payment_ref, order.total)
        conn.execute("UPDATE orders SET status='settled' WHERE id=?", (order.id,))
        conn.commit()
    except GatewayTimeout as exc:
        raise SettlementDeferred(order.id) from exc

    notify_customer(order.email, receipt)
    return receipt
`,
          note: "Only the gateway failure is handled, and it is translated into something the caller can act on. But the database writes are still inside the protected region, and there is no rollback: a failure between execute and commit leaves an open transaction holding locks."
        },
        { level: "best", label: "One try per concern, else for the success path", why: "each failure has an owner",
          code: `
def settle(order, gateway, conn) -> Receipt:
    try:
        receipt = gateway.capture(order.payment_ref, order.total)
    except GatewayTimeout as exc:
        raise SettlementDeferred(order.id) from exc      # retry is safe
    except GatewayDeclined as exc:
        raise SettlementRefused(order.id) from exc       # retry is not

    try:
        conn.execute("UPDATE orders SET status='settled' WHERE id=?", (order.id,))
    except Exception:
        conn.rollback()          # release locks, leave no half-written state
        raise                    # bare raise: original traceback preserved
    else:
        conn.commit()

    # Outside every try: a failed notification must not undo a settlement.
    notify_customer(order.email, receipt)
    return receipt
`,
          note: "Three concerns, three shapes. The gateway call translates its failures into the caller's vocabulary; the database write rolls back and re-raises; the notification is deliberately unprotected, because a settled payment is worth more than an email. Nothing returns None, so the caller cannot mistake failure for success."
        }
      ]
    },

    { t: "p", text: "The rule that generates all three rungs: **the `try` block holds the operations whose failure the `except` clause names, and nothing else.** Everything that runs only on success moves to `else` or after the statement. Everything that must run regardless moves to `finally` — or, better, to a context manager." },

    /* ================================================================== */
    { t: "h2", n: "05", text: "with, suppress, and when try/finally is still right", id: "with" },

    { t: "table",
      head: ["Need", "Reach for", "Why"],
      rows: [
        ["Release a resource you acquired", "`with`", "The guarantee lives with the resource, not in every call site (Lesson 5.8)"],
        ["Cleanup for something with no context manager", "`try/finally`", "A raw handle, a temporary global, a monkeypatch in a test"],
        ["Ignore one specific failure, deliberately", "`contextlib.suppress(FileNotFoundError)`", "Narrow, self-documenting, and impossible to widen by accident"],
        ["Several resources whose number varies at runtime", "`contextlib.ExitStack`", "Unwinds in reverse order without nesting `with` statements"],
        ["Commit-or-rollback around a block", "`@contextlib.contextmanager`", "`yield` inside `try/except/else` puts the policy in one place"]
      ]
    },

    { t: "code", lang: "python", title: "suppress says what it means", code: `
import contextlib
from pathlib import Path

# The intent: if the file is already gone, that is the desired end state.
with contextlib.suppress(FileNotFoundError):
    Path("/tmp/build.lock").unlink()

# Equivalent, and three lines longer:
try:
    Path("/tmp/build.lock").unlink()
except FileNotFoundError:
    pass

# Better still, when the API offers it -- no exception involved at all:
Path("/tmp/build.lock").unlink(missing_ok=True)
`,
      caption: "`suppress` takes exception classes, so it cannot quietly grow into `except Exception: pass` the way a bare `try` block can. Reviewers read the class name in the `with` line and know exactly what is being ignored."
    },

    { t: "callout", kind: "trap", title: "with does not protect the acquisition", body: [
      { t: "code", lang: "python", title: "the FileNotFoundError comes from open(), not from the block", numbered: false, code: `
# WRONG -- the handler is inside the block, but open() raises before the
# block is ever entered, so the except is unreachable for that failure.
with open("config.toml") as fh:
    try:
        data = fh.read()
    except FileNotFoundError:
        data = ""

# RIGHT -- protect the acquisition, and keep the body out of the try.
try:
    fh = open("config.toml")
except FileNotFoundError:
    data = ""
else:
    with fh:
        data = fh.read()`},
      { t: "p", text: "`with` guarantees the *release*, not the *acquisition*. Anything that can fail while obtaining the resource — a missing file, a refused connection, a lock timeout — needs a handler around the `with` statement, not inside it." }
    ]},

    { t: "code", lang: "python", title: "the transaction pattern, written once", code: `
import contextlib
from collections.abc import Iterator


@contextlib.contextmanager
def transaction(conn) -> Iterator[None]:
    """Commit on success, roll back on any failure, always release."""
    try:
        yield
    except Exception:
        conn.rollback()
        raise                      # bare raise: the caller still sees the cause
    else:
        conn.commit()


# Every call site is now two lines and cannot get the policy wrong:
with transaction(conn):
    conn.execute("UPDATE orders SET status='settled' WHERE id=?", (order.id,))
    conn.execute("INSERT INTO audit (order_id, event) VALUES (?, ?)",
                 (order.id, "settled"))
`,
      caption: "This is `try/except/else` with a name. The `else` is doing real work: committing only when the body completed, and never inside the region where a failure would be caught. Note the bare `raise` — `raise exc` would truncate the traceback at this frame (Lesson 3.7)."
    },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Repair a settlement function that hides its failures",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "The function below is real in shape: it was written correctly, then patched twice during incidents, and each patch made failures quieter. It contains four separate defects from this lesson. Find them, then rewrite it." },
        { t: "code", lang: "python", title: "settlement.py — as found", code: `
def settle_order(order_id: int, conn, gateway):
    cursor = None
    try:
        cursor = conn.cursor()
        order = fetch_order(cursor, order_id)
        receipt = gateway.capture(order.payment_ref, order.total)
        cursor.execute(
            "UPDATE orders SET status = 'settled' WHERE id = ?", (order_id,)
        )
        conn.commit()
        write_audit(cursor, order_id, receipt.id)
        send_receipt_email(order.email, receipt)
        return receipt
    except Exception as exc:
        logger.error("settle failed for %s: %s", order_id, exc)
        cursor.close()
        return None
    finally:
        return None
`},
        { t: "p", text: "Write the defects down before you start rewriting. Three of them are invisible in code review unless you know what to look for, which is the point of the exercise." }
      ],
      requirements: [
        "Name all four defects and, for each, describe the production symptom it produces.",
        "The cursor must be closed exactly once on every path, including when the gateway raises.",
        "A gateway timeout must reach the caller as a **deferrable** failure; a decline must reach it as a **terminal** one. Neither may be swallowed.",
        "The database write must roll back on failure and commit only on success, with the original traceback preserved.",
        "A failure in `send_receipt_email` must **not** undo or hide a completed settlement.",
        "The return type must be `Receipt` — never `None`. Failure is signalled by an exception.",
        "Add one test proving that when the gateway raises, the exception reaches the caller and nothing was committed."
      ],
      hint: "Count how many operations sit inside the one `try` block, then ask which of them the `except Exception` clause was written for. For the cursor, `conn.cursor()` is a context manager in every mainstream driver. And read the last two lines of the function together — what does the caller of a function ending in `finally: return None` ever receive?",
      solution: {
        lang: "python",
        title: "settlement.py",
        code: `"""Settlement, with each failure owned by exactly one handler."""

import logging
from decimal import Decimal

logger = logging.getLogger(__name__)


class SettlementDeferred(Exception):
    """Settlement did not complete but may succeed if retried."""


class SettlementRefused(Exception):
    """The card was declined. Retrying will not help."""


# =====================================================================
# THE FOUR DEFECTS IN THE ORIGINAL
# =====================================================================
# 1. "finally: return None" -- every path, success and failure alike,
#    returns None. The receipt is discarded and so is every exception,
#    including the ones the except clause just logged. SYMPTOM: the job
#    reports success, exits 0, and no settlement is recorded anywhere.
#
# 2. One try around six operations with "except Exception". A typo in
#    send_receipt_email is indistinguishable from a declined card, and
#    the log line says only "settle failed". SYMPTOM: hours of
#    guesswork per incident, because the message names no cause.
#
# 3. cursor.close() only in the except clause, and cursor may still be
#    None when the exception came from conn.cursor() itself -- which
#    then raises AttributeError from inside the handler, producing the
#    "During handling ... another exception occurred" traceback that
#    hides the real error (Lesson 1.9). SYMPTOM: leaked cursors under
#    load, and a misleading traceback when it matters most.
#
# 4. The commit is inside the protected region, and there is no
#    rollback. A failure between UPDATE and commit leaves a
#    transaction open holding row locks until the connection is
#    recycled. SYMPTOM: lock waits and timeouts on unrelated queries.


def settle_order(order_id: int, conn, gateway) -> Receipt:
    """Capture payment and mark the order settled.

    Raises:
        SettlementDeferred: transient failure; safe to retry.
        SettlementRefused: the card was declined; do not retry.
    """
    with conn.cursor() as cursor:          # closed on every path, once
        order = fetch_order(cursor, order_id)

        # --- concern 1: the payment gateway -------------------------
        try:
            receipt = gateway.capture(order.payment_ref, order.total)
        except gateway.Timeout as exc:
            # Translate into our vocabulary so callers need not import
            # the gateway's exceptions to handle a failure.
            raise SettlementDeferred(f"order {order_id} capture timed out") from exc
        except gateway.Declined as exc:
            raise SettlementRefused(f"order {order_id} declined: {exc.code}") from exc

        # --- concern 2: our own database ----------------------------
        try:
            cursor.execute(
                "UPDATE orders SET status = 'settled' WHERE id = ?", (order_id,)
            )
            write_audit(cursor, order_id, receipt.id)
        except Exception:
            conn.rollback()      # release locks; leave no half-written state
            raise                # bare raise keeps the original traceback
        else:
            conn.commit()        # only reachable when both writes succeeded

    # --- concern 3: side effects that must not undo the settlement ---
    # Deliberately outside every try above, and deliberately caught
    # narrowly: the money has moved and the database agrees. An email
    # failure is a WARNING, not a settlement failure.
    try:
        send_receipt_email(order.email, receipt)
    except EmailError:
        logger.warning("receipt email failed for order %s", order_id, exc_info=True)

    return receipt


# =====================================================================
# THE TEST THAT PROVES THE IMPORTANT PART
# =====================================================================
class FakeGateway:
    class Timeout(Exception):
        pass

    class Declined(Exception):
        pass

    def capture(self, ref, amount):
        raise self.Timeout("no response in 5s")


class RecordingConn:
    def __init__(self):
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        self.closed = True
        return False              # never suppress: False lets it propagate

    def execute(self, sql, params):
        return None

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


def test_gateway_timeout_reaches_the_caller_and_commits_nothing():
    conn, gateway = RecordingConn(), FakeGateway()

    try:
        settle_order(42, conn, gateway)
    except SettlementDeferred as exc:
        assert isinstance(exc.__cause__, FakeGateway.Timeout)   # cause kept
    else:
        raise AssertionError("the failure was swallowed")

    assert not conn.committed, "nothing may be committed on a capture failure"
    assert conn.closed, "the cursor must be closed on the failure path too"`,
        notes: [
          { t: "p", text: "**The `finally: return None` is the defect worth internalising.** Everything else in the original is bad practice; that line is a data-loss bug. A `return` in `finally` replaces the exit route, so a raised exception and a computed return value are both discarded — and the function's caller has no way to detect it. There is no situation in which it is correct, which is why `ruff` gives it its own rule (`B012`)." },
          { t: "p", text: "**Returning `Receipt` rather than `Receipt | None` is a design decision, not a style one.** A function that returns `None` on failure requires every call site to check, and the one that forgets fails later, further away, with `AttributeError: 'NoneType' object has no attribute 'id'` (Lesson 1.9). An exception cannot be ignored by accident." },
          { t: "p", text: "**The email call is the interesting one.** It is caught — narrowly — and only logged, because by then the money has moved and the database agrees. Deciding which failures may abort the operation and which may not is the actual work; the syntax is incidental. Note `exc_info=True`, which puts the traceback in the log without raising the severity (Lesson 6.4)." },
          { t: "callout", kind: "insight", title: "Why the test asserts on __cause__", body: [
            { t: "p", text: "Asserting that `exc.__cause__` is the gateway's `Timeout` pins down two things at once: the translation happened, and `raise ... from exc` preserved the original. Without `from`, the assertion fails — and in production the traceback would name `SettlementDeferred` with no hint of which of the gateway's many failure modes caused it (Lesson 6.3)." },
            { t: "p", text: "The second assertion — `not conn.committed` — is the one that would have caught the original bug. Any test that only checked \"an exception was raised\" would pass against a version that had already committed a settlement for a payment that never captured." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A nightly reconciliation job runs at 02:00, writes a summary, and exits. It has reported success every night for four months. Finance then finds that roughly 1% of settlements were never written — spread across the whole four months, with no pattern in time, amount or merchant." },
      { t: "p", text: "**The mechanism was one line in a helper.** A `write_summary` function ended with `finally: return summary`, added during an incident to \"make sure we always get a summary\". Any exception raised inside it — an occasional `IntegrityError` on a duplicate key — was discarded by that `return`. The job never saw a failure, so it exited 0, so the alert that watched exit codes never fired, so nobody looked." },
      { t: "p", text: "**Why 1%:** the duplicate keys only occurred when a settlement had already been partly written by a retried upstream webhook — rare, but steady. Every occurrence was silently dropped, and the summary that was supposed to prove the job worked was itself the thing hiding the failures." },
      { t: "p", text: "**The fix was to delete two words.** Removing `return summary` from the `finally` let the `IntegrityError` propagate; the job failed that night, the alert fired, and the real bug — a missing `ON CONFLICT` clause — was fixed in an hour. The backfill took a week." },
      { t: "p", text: "**The general point:** `finally` is a promise about cleanup, and any exit from it is a promise about control flow. Mixing the two converts \"we always clean up\" into \"we always look fine\". Enable `B012` in your linter and this class of bug cannot be written." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**`else` runs only when the `try` body raised nothing, and is not protected by the `except` clauses above it.** That is what stops your handler catching failures from your own success path.",
    "The classic misdiagnosis is a `KeyError` from the success path being reported as \"not found\" — and its production cousins: a commit inside the protected region, and `json.JSONDecodeError` being caught by `except ValueError`.",
    "**`finally` runs on every exit route**: success, handled failure, propagating failure, `return`, `break`, `continue`. Only `os._exit`, `SIGKILL` and a never-resumed generator skip it.",
    "**A `return`, `break` or `continue` inside `finally` discards the in-flight exception and any pending return value.** No traceback, no log line. `ruff B012` exists for exactly this.",
    "An inner `finally` runs before any outer handler gets control, which is what makes it correct for releasing locks and handles.",
    "**Keep the `try` block to the operations whose failure the `except` clause names.** Everything success-only moves to `else`; everything unconditional moves to `finally` or a context manager.",
    "Raising inside `finally` replaces the exception in flight — the original survives only as `__context__` in the printed chain.",
    "`with` guarantees release, not acquisition: a missing file or refused connection must be handled *around* the `with`, not inside it.",
    "`contextlib.suppress(SpecificError)` states in one line which failure is being ignored, and cannot silently widen into `except Exception: pass`.",
    "A commit-or-rollback context manager is `try/except/else` with a name — and it puts the policy in one place instead of at every call site.",
    "**Signal failure with an exception, not with `None`.** A `None` return has to be checked at every call site, and the site that forgets fails three frames later with a useless `AttributeError`."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A function's `try` block ends with `return int(raw)` and its `finally` block contains `return -1`. What does the function return for the input `\"abc\"`?",
        options: [
          "It raises `ValueError`, because `finally` cannot change the outcome",
          "`-1`, and the `ValueError` is silently discarded",
          "`None`, because the `try` block never completed",
          "`-1`, and the `ValueError` is re-raised after the return"
        ],
        answer: 1,
        why: "Leaving `finally` by a `return` replaces whatever exit was pending, so the exception is discarded entirely — no traceback, no log, nothing for a caller to detect. The exception is not deferred or re-raised afterwards; it ceases to exist. `None` would be the answer only if the `finally` had no `return` and the exception had been caught somewhere without a value, which is not the case here. This is the mechanism behind the `B012` lint rule."
      },
      {
        stem: "Why move the success path into an `else` clause instead of leaving it at the end of the `try` block?",
        options: [
          "It runs faster, because the `else` body is not inside the exception-handling machinery",
          "Because code in `try` is protected by the `except` clauses, so a failure on the success path can be caught and misreported as the failure you were expecting",
          "Because `else` runs before `finally`, and cleanup must happen last",
          "It has no functional effect; it is purely a readability convention"
        ],
        answer: 1,
        why: "The `else` clause is outside the protected region, so a `KeyError` raised while using a successfully fetched record is no longer claimed by the handler written for \"record not found\". That is a correctness difference, not a convention, and it is the whole reason the clause exists. There is no measurable speed difference — entering a `try` is nearly free in modern CPython — and while `else` does run before `finally`, that ordering is true of the `try` body too and is not the reason to use it."
      },
      {
        stem: "Which of these will prevent a `finally` block from running?",
        options: [
          "An unhandled exception propagating out of the `try` block",
          "A `sys.exit()` call inside the `try` block",
          "`os._exit(1)` inside the `try` block",
          "A `KeyboardInterrupt` from Ctrl-C during the `try` block"
        ],
        answer: 2,
        why: "`os._exit` terminates the process immediately at the OS level: no unwinding, no `finally`, no `atexit` handlers, and no flushed buffers. The other three all unwind normally — `sys.exit()` raises `SystemExit` and Ctrl-C raises `KeyboardInterrupt`, and because both are ordinary exceptions travelling up the stack, every `finally` on the way runs. That is precisely why cleanup belongs in `finally` rather than in an `except` clause, which only runs when its class matches."
      },
      {
        stem: "A team wraps a whole request handler in `try: ... except Exception: return None`, then adds `with` blocks inside for the database and HTTP client. A missing config file still crashes the process at startup. Why?",
        options: [
          "`with` suppresses exceptions, so the handler never sees them",
          "The config file is opened at import time, outside the handler's `try` — and an exception raised while *acquiring* a resource is not caught by a handler inside the `with` body",
          "`except Exception` cannot catch `FileNotFoundError`, which is an `OSError`",
          "`return None` inside `except` re-raises the original exception"
        ],
        answer: 1,
        why: "Two things are true and both matter: module-level code runs at import, long before any request handler's `try` exists, and `with open(path)` raises from the `open` call itself — before the block is entered — so any handler written inside the block is unreachable for that failure. `with` does not suppress exceptions unless `__exit__` returns true, which the standard managers never do. `FileNotFoundError` is an `OSError` and therefore very much an `Exception`, and `return None` in a handler ends the handler; it re-raises nothing."
      }
    ]
  },

  /* ==================================================================== */
  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What are the `else` and `finally` clauses of a `try` statement for?",
        strong: "`else` holds the success path, outside the protected region, so a failure there is not caught by the handler you wrote for the risky operation. `finally` holds cleanup and runs on every exit route — success, handled failure, propagating failure, and `return`, `break` or `continue`.",
        answer: [
          { t: "p", text: "The example that proves you have used `else` in anger: `try: user = users[uid] ... except KeyError` where the body then reads `user[\"email\"]`. A profile missing an email is reported as an unknown user, and someone loses an afternoon to it." },
          { t: "p", text: "For `finally`, the sharp fact to volunteer is that a `return` inside it discards the in-flight exception. That single sentence usually ends the question, because it shows you know the clause as a mechanism rather than as a place to put `close()`." },
          { t: "p", text: "A good close: in modern code most `finally` blocks should be context managers instead — the guarantee then lives with the resource rather than being re-typed at every call site." }
        ]
      },
      {
        level: "core",
        q: "How much code should go inside a `try` block?",
        strong: "Exactly the operations whose failure the `except` clause names. Everything that only runs on success goes in `else` or after the statement; everything unconditional goes in `finally` or a `with`. A wide `try` catches its own bugs and reports them as the failure you were expecting.",
        answer: [
          { t: "p", text: "Give the concrete cost of a wide block: a handler written for a gateway timeout that also swallows a typo in a helper called three lines later. Both produce the same log line, so incidents start from zero information." },
          { t: "p", text: "The retry variant is the one that gets money wrong. If `charge()` and `publish()` are both inside a block wrapped by a retry, a timeout in `publish` re-runs `charge` and the customer is charged twice (Lesson 3.7). Narrowing the `try` is what makes the retry safe." },
          { t: "p", text: "Worth naming the review heuristic: count the operations in the block, then ask which one the `except` clause was written for. If the answer is not \"all of them\", the block is too wide." }
        ],
        weak: "\"As little as possible\" with no reason attached. The interesting content is *why* a wide block is dangerous and where the displaced code goes."
      },
      {
        level: "advanced",
        q: "Walk me through how you would structure a function that charges a card, writes to the database, and sends an email.",
        strong: "Three concerns, three shapes. The gateway call gets its own `try` translating timeouts and declines into my own retryable and terminal exceptions. The database write gets a `try/except/else` that rolls back and re-raises on failure and commits in the `else`. The email goes after both, caught narrowly and only logged — a failed email must not undo a settled payment.",
        answer: [
          { t: "p", text: "The reasoning being assessed is which failures may abort the operation. Once money has moved and the database agrees, an email failure is a WARNING; before that point, any failure must leave no trace. Candidates who wrap all three in one handler have not thought about it." },
          { t: "p", text: "Mentioning the rollback is what separates people who have run a database in production. A failure between `execute` and `commit` leaves a transaction open holding row locks until the connection is recycled, and the symptom appears as lock waits on unrelated queries." },
          { t: "p", text: "Strong candidates add that the function should raise rather than return `None`, and that the exception types should express the caller's decision — deferrable versus terminal — because that is what a queue consumer branches on when choosing between redelivery and a dead letter (Lessons 6.3 and 6.5)." },
          { t: "p", text: "If asked how to prove it, the test to describe is the one asserting that on a capture failure the exception reaches the caller *and* nothing was committed. A test that only checks \"it raised\" passes against a version that already wrote the settlement." }
        ]
      }
    ]
  }
});
