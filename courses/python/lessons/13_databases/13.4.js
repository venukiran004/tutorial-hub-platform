/* ============================================================================
   LESSON 13.4 — Transactions and Isolation
   ========================================================================= */
EC.receiveLesson({
  id: "13.4",

  lede: "A transaction is a promise that a group of changes happens completely or not at all. **The hard part is not writing `COMMIT` — it is deciding where the boundary goes**, and knowing which concurrency anomalies your isolation level still permits. Most data corruption in production is two correct transactions interleaving in a way nobody modelled.",

  objectives: [
    "Place a transaction boundary so it covers an invariant, not a statement",
    "Name the anomalies each isolation level allows",
    "Choose between optimistic and pessimistic locking",
    "Recognise a deadlock and remove its cause",
    "Retry a serialisation failure correctly"
  ],

  prerequisites: ["13.3"],

  blocks: [

    { t: "h2", n: "01", text: "Where the boundary goes", id: "boundary" },

    { t: "code", lang: "python", title: "the boundary is the invariant", code: `
# WRONG. Two transactions. If the second fails, money has left one
# account and arrived nowhere. The database was consistent at every
# commit and the SYSTEM is not.
def transfer(from_id, to_id, amount):
    with transaction():
        debit(from_id, amount)
    with transaction():                  # a separate transaction
        credit(to_id, amount)


# RIGHT. One transaction covers the invariant "total money is
# unchanged". Either both sides happen or neither does.
def transfer(from_id, to_id, amount):
    with transaction():
        debit(from_id, amount)
        credit(to_id, amount)


# ALSO WRONG, differently. The HTTP call is inside the transaction, so
# a slow payment provider holds database locks for its entire timeout.
# Under load that is connection exhaustion.
def checkout(order_id):
    with transaction():
        order = lock_order(order_id)
        charge = stripe.Charge.create(...)      # 2s, sometimes 30s
        order.status = "paid"
`,
      hl: [6, 15, 25],
      caption: "**The rule: a transaction spans exactly the writes that must agree, and nothing slow.** External calls belong outside it — or the transaction is split, with the external call between the two halves and an idempotency key making the retry safe."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**A transaction is a lock held on your behalf.** Everything it touches is unavailable to conflicting work until it ends, so the question \"how long is this transaction?\" is the same question as \"how long is the rest of the system blocked?\"" },
      { t: "p", text: "That reframing settles most design questions. A transaction wrapping an HTTP call is a lock held for a network round trip; a transaction opened at the start of a request handler and committed at the end is a lock held for the whole request, including the JSON serialisation." },
      { t: "p", text: "**Short, and covering an invariant.** Those two goals occasionally conflict, and when they do the invariant wins — but the conflict is usually a sign that something slow is in the wrong place." }
    ]},

    { t: "h2", n: "02", text: "Isolation levels", id: "isolation" },

    {"kind": "matrix", "title": "Isolation levels and the anomalies they allow", "caption": "Higher isolation prevents more anomalies and costs more locking or retries. PostgreSQL's default is READ COMMITTED; SERIALIZABLE may abort a transaction that must then be retried.", "rows": ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"], "cols": ["dirty read", "non-repeatable read", "phantom read", "serialisation anomaly"], "cells": [[{"text": "possible", "tone": "crit"}, {"text": "possible", "tone": "crit"}, {"text": "possible", "tone": "crit"}, {"text": "possible", "tone": "crit"}], [{"text": "prevented", "tone": "good"}, {"text": "possible", "tone": "warn"}, {"text": "possible", "tone": "warn"}, {"text": "possible", "tone": "warn"}], [{"text": "prevented", "tone": "good"}, {"text": "prevented", "tone": "good"}, {"text": "pg: prevented", "tone": "good"}, {"text": "possible", "tone": "warn"}], [{"text": "prevented", "tone": "good"}, {"text": "prevented", "tone": "good"}, {"text": "prevented", "tone": "good"}, {"text": "prevented — may abort", "tone": "good"}]], "t": "diagram", "id": "dg-13_4-02-0"},


    { t: "table",
      head: ["Level", "Dirty read", "Non-repeatable read", "Phantom", "Write skew"],
      rows: [
        ["`READ UNCOMMITTED`", "Possible*", "Possible", "Possible", "Possible"],
        ["`READ COMMITTED` **(default)**", "No", "**Possible**", "**Possible**", "**Possible**"],
        ["`REPEATABLE READ`", "No", "No", "No†", "**Possible**"],
        ["`SERIALIZABLE`", "No", "No", "No", "**No**"]
      ],
      caption: "*PostgreSQL has no dirty reads at any level — `READ UNCOMMITTED` behaves as `READ COMMITTED`. †PostgreSQL's `REPEATABLE READ` uses snapshot isolation, which prevents phantoms; the SQL standard permits them. **Write skew is the one that survives `REPEATABLE READ` and surprises people.**"
    },

    { t: "code", lang: "python", title: "the anomalies, concretely", code: `
# NON-REPEATABLE READ -- READ COMMITTED only.
# The same query returns different values within one transaction,
# because each statement takes a fresh snapshot.
BEGIN;
SELECT balance FROM accounts WHERE id = 1;   -- 100
                              -- another transaction commits -50
SELECT balance FROM accounts WHERE id = 1;   -- 50. Same query, same
COMMIT;                                      -- transaction, new answer.


# PHANTOM READ -- new ROWS appear, not just new values.
BEGIN;
SELECT count(*) FROM orders WHERE status = 'pending';   -- 5
                              -- another transaction inserts one
SELECT count(*) FROM orders WHERE status = 'pending';   -- 6
COMMIT;


# WRITE SKEW -- the subtle one. Both transactions read, both decide
# correctly based on what they read, both write, and the combined
# result violates an invariant NEITHER of them broke alone.
#
# Rule: at least one doctor must be on call.
#
#   T1: SELECT count(*) FROM doctors WHERE on_call;   -- 2, fine
#   T2: SELECT count(*) FROM doctors WHERE on_call;   -- 2, fine
#   T1: UPDATE doctors SET on_call = false WHERE id = 'alice';
#   T2: UPDATE doctors SET on_call = false WHERE id = 'bob';
#   both COMMIT.
#
# Zero doctors on call. They wrote to DIFFERENT rows, so no lock
# conflicts and REPEATABLE READ permits it. Only SERIALIZABLE
# detects it, because only SERIALIZABLE tracks read dependencies.
`,
      hl: [22, 33],
      caption: "**Write skew is why `SERIALIZABLE` exists.** No amount of row locking helps when the two transactions never touch the same row — the conflict is between what one read and what the other wrote."
    },

    { t: "h2", n: "03", text: "Locking", id: "locking" },

    { t: "ladder",
      title: "Decrementing stock when an order is placed",
      rungs: [
        { level: "bad", label: "Read, decide, write",
          why: "A textbook lost update. Two requests read a stock of 1, both decide it is sufficient, both write 0, and two customers are promised the last unit. The window is milliseconds and the traffic pattern that hits it is a sale announcement.",
          code: `product = db.get(Product, pid)          # stock = 1
if product.stock < quantity:
    raise OutOfStock()
product.stock -= quantity               # both write 0
db.commit()` },
        { level: "ok", label: "An atomic update with a guard",
          why: "The read and the write are one statement, so the database serialises them and the guard cannot be raced. Correct, fast, and the right answer for a simple counter — it just cannot express a decision that needs several rows.",
          code: `result = db.execute(
    update(Product)
    .where(Product.id == pid, Product.stock >= quantity)
    .values(stock=Product.stock - quantity)
)
if result.rowcount == 0:
    raise OutOfStock()          # the guard failed: no stock` },
        { level: "best", label: "Pessimistic lock, when the decision is complex",
          why: "`FOR UPDATE` holds the row until commit, so the read reflects reality and no other transaction can change it mid-decision. Use it when the choice depends on several rows or on logic SQL cannot express.",
          code: `with transaction():
    product = db.execute(
        select(Product).where(Product.id == pid).with_for_update()
    ).scalar_one()

    # Now the read is authoritative for the rest of the transaction.
    if product.stock < quantity:
        raise OutOfStock()
    if product.reserved + quantity > product.stock:
        raise Reserved()

    product.stock -= quantity
    Reservation(product_id=pid, quantity=quantity).save()`,
          note: "**Order your locks consistently.** Two transactions locking the same rows in opposite orders deadlock; always acquiring by ascending id removes the possibility entirely." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "Optimistic versus pessimistic", body: [
      { t: "code", lang: "python", title: "optimistic: a version column", numbered: false, code: `
# No lock taken. The update asserts that nothing changed since the read.
result = db.execute(
    update(Order)
    .where(Order.id == oid, Order.version == expected_version)
    .values(status="shipped", version=Order.version + 1)
)
if result.rowcount == 0:
    raise ConcurrentModification("Someone else changed this order")`},
      { t: "table",
        head: ["", "Optimistic", "Pessimistic"],
        rows: [
          ["Cost when uncontended", "**Nothing**", "A lock, held to commit"],
          ["Cost when contended", "Retry, or fail", "Waiting"],
          ["Right for", "**Rare conflicts** — editing a form", "Frequent conflicts — stock, balances"],
          ["User experience", "\"Someone changed this\"", "A slower response"],
          ["Risk", "Livelock under heavy contention", "**Deadlock, and lock waits**"]
        ]
      },
      { t: "p", text: "**Optimistic locking gives a better user experience for human-edited data**, because \"someone else changed this while you were editing\" is information a person can act on — where a silent last-write-wins destroys their colleague's changes without telling either of them." }
    ]},

    { t: "h2", n: "04", text: "Deadlocks", id: "deadlocks" },

    {"kind": "cycle", "title": "A database deadlock", "caption": "Transaction 1 updates row A then wants row B; transaction 2 updated B and wants A. The database detects the cycle, aborts one, and the application must retry. Updating rows in a consistent order prevents it.", "nodes": [{"label": "T1 locks row A", "tone": "accent"}, {"label": "T1 waits for row B", "tone": "warn"}, {"label": "T2 locks row B", "tone": "accent"}, {"label": "T2 waits for row A", "tone": "warn"}], "centre": "detected → one is aborted", "t": "diagram", "id": "dg-13_4-04-1"},


    { t: "viz",
      title: "Two transactions, opposite lock order",
      caption: "Neither can proceed and neither will yield. PostgreSQL detects the cycle after a timeout and kills one — so a deadlock is a retryable error, not corruption. The cure is consistent ordering, not retries.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Two transactions deadlocking by locking rows in opposite order">
  <rect x="40" y="30" width="330" height="180" rx="10" style="fill:var(--surface);stroke:var(--border)"/>
  <text x="205" y="58" text-anchor="middle" class="s-label">T1 — transfer A to B</text>
  <text x="205" y="92" text-anchor="middle" class="s-sub" style="fill:var(--good)">1. LOCK account A  ✓</text>
  <text x="205" y="122" text-anchor="middle" class="s-sub" style="fill:var(--crit)">2. LOCK account B  ✗ waits</text>

  <rect x="530" y="30" width="330" height="180" rx="10" style="fill:var(--surface);stroke:var(--border)"/>
  <text x="695" y="58" text-anchor="middle" class="s-label">T2 — transfer B to A</text>
  <text x="695" y="92" text-anchor="middle" class="s-sub" style="fill:var(--good)">1. LOCK account B  ✓</text>
  <text x="695" y="122" text-anchor="middle" class="s-sub" style="fill:var(--crit)">2. LOCK account A  ✗ waits</text>

  <path d="M370 112 L525 100" style="stroke:var(--crit)" fill="none" marker-end="url(#ar)"/>
  <path d="M530 148 L375 160" style="stroke:var(--crit)" fill="none" marker-end="url(#ar)"/>
  <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
    <path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker></defs>

  <text x="450" y="240" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">Fix: always lock by ascending id — then T2 takes A first and simply waits</text>
</svg>`
    },

    { t: "code", lang: "python", title: "removing the cause", code: `
# THE BUG: lock order depends on the direction of the transfer.
def transfer(from_id, to_id, amount):
    with transaction():
        a = lock(from_id)        # T1 locks A, T2 locks B
        b = lock(to_id)          # T1 wants B, T2 wants A -> deadlock
        ...


# THE FIX: a total order on the locks. Every transaction acquires in
# the same sequence, so a cycle cannot form.
def transfer(from_id, to_id, amount):
    with transaction():
        first, second = sorted([from_id, to_id])     # ascending id

        accounts = db.execute(
            select(Account)
            .where(Account.id.in_([first, second]))
            .order_by(Account.id)          # the ORDER BY matters:
            .with_for_update()             # locks are taken in row order
        ).scalars().all()

        by_id = {a.id: a for a in accounts}
        debit(by_id[from_id], amount)
        credit(by_id[to_id], amount)
`,
      hl: [13, 19],
      caption: "**`ORDER BY` with `FOR UPDATE` is what makes the ordering real.** Without it the planner may return rows in any order, and the locks are acquired in that order — reintroducing the cycle you just sorted away."
    },

    { t: "callout", kind: "trap", title: "Three more deadlock sources", body: [
      { t: "code", lang: "python", title: "less obvious than the classic", numbered: false, code: `
# 1. A BULK UPDATE WITHOUT AN ORDER.
UPDATE accounts SET rate = rate * 1.1 WHERE region = 'EU';
# Two concurrent runs may reach rows in different orders. Add a
# deterministic ORDER BY, or partition the work by key range.

# 2. FOREIGN KEY LOCKS YOU DID NOT ASK FOR.
INSERT INTO order_items (order_id, ...) VALUES (...);
# Takes a FOR KEY SHARE lock on the parent order row, to stop it
# being deleted. Two transactions inserting items for two orders in
# opposite order deadlock -- and neither statement mentions a lock.

# 3. AN UPSERT RACE.
INSERT ... ON CONFLICT (key) DO UPDATE ...;
# Concurrent upserts on overlapping key sets can deadlock. Inserting
# a sorted batch in one statement avoids it; a loop does not.`},
      { t: "p", text: "**Number two is the one that gets diagnosed slowly**, because the deadlock report names two `INSERT` statements that share no table and take no explicit locks. `pg_locks` shows the foreign-key locks that the statements do not." }
    ]},

    { t: "h2", n: "05", text: "Retrying correctly", id: "retry" },

    { t: "code", lang: "python", title: "the retry that SERIALIZABLE requires", code: `
from psycopg import errors

RETRIABLE = (errors.SerializationFailure, errors.DeadlockDetected)


def with_retry(fn, attempts: int = 3):
    """SERIALIZABLE does not prevent conflicts -- it DETECTS them and
    aborts one side. Using it without a retry loop converts a
    correctness win into an error rate."""
    for attempt in range(attempts):
        try:
            with transaction(isolation="SERIALIZABLE"):
                return fn()

        except RETRIABLE:
            if attempt == attempts - 1:
                raise
            # Jitter is not optional: without it, two conflicting
            # transactions retry in lockstep and conflict again.
            time.sleep((2 ** attempt) * 0.05 * (0.5 + random.random()))

    raise AssertionError("unreachable")


# The function MUST be safe to run again from the top. That means no
# side effects outside the transaction:
#
#   with_retry(lambda: transfer(a, b, 100))          # safe
#   with_retry(lambda: charge_card_then_record())    # NOT safe --
#                                                    # the card is
#                                                    # charged twice
`,
      hl: [12, 20],
      caption: "**A retried transaction re-runs everything inside it**, so anything with an external effect must be outside — or idempotent, which for a payment means a deterministic idempotency key (Lesson 12.7)."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Find the concurrency bug in a booking system",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "This seat-booking code has double-booked seats four times in six months, always during a popular release. It passes every test, and the team cannot reproduce it locally." },
        { t: "code", lang: "python", numbered: false, title: "app/booking.py", code: `
def book_seats(event_id: str, seat_ids: list[str], user_id: str):
    event = db.get(Event, event_id)
    if event.status != "on_sale":
        raise EventClosed()

    seats = db.query(Seat).filter(Seat.id.in_(seat_ids)).all()
    for seat in seats:
        if seat.booked_by is not None:
            raise SeatTaken(seat.id)

    total = sum(s.price for s in seats)
    charge = stripe.Charge.create(amount=total, customer=user_id)

    for seat in seats:
        seat.booked_by = user_id
    booking = Booking(user_id=user_id, seat_ids=seat_ids,
                      charge_id=charge.id)
    db.add(booking)
    db.commit()
    return booking`},
        { t: "p", text: "Explain the exact interleaving that double-books, then fix it. There is also a deadlock waiting to happen and a payment problem." }
      ],
      requirements: [
        "Give the precise two-request interleaving, step by step.",
        "Explain why it only happens under load and never in tests.",
        "Fix the double booking, and say which isolation level you rely on.",
        "Identify the deadlock and remove its cause.",
        "Move the payment so a failure cannot leave seats or money wrong.",
        "Write a test that actually reproduces the race."
      ],
      hint: "There is a gap between checking `booked_by` and setting it. How long is that gap here, and what is happening during it? For the deadlock, ask what order `IN (...)` returns rows in.",
      solution: {
        lang: "python",
        title: "app/booking.py",
        code: `# =========================================================================
# THE INTERLEAVING
# =========================================================================
#
#   time  request A (seats 5,6)          request B (seats 6,7)
#   ----  ---------------------------    ---------------------------
#   t0    SELECT seats 5,6
#         booked_by is NULL -> ok
#   t1                                   SELECT seats 6,7
#                                        booked_by is NULL -> ok
#                                        (A has not written yet)
#   t2    stripe.Charge.create()
#         ... 1.8 SECONDS ...
#   t3                                   stripe.Charge.create()
#                                        ... 2.1 SECONDS ...
#   t4    UPDATE seats SET booked_by=A
#         COMMIT
#   t5                                   UPDATE seats SET booked_by=B
#                                        COMMIT   <- overwrites A
#
#   Seat 6 is sold twice. Both customers are charged. B's write wins
#   and A holds a receipt for a seat that is not theirs.
#
# THE WINDOW IS THE STRIPE CALL. Between the check at t0 and the
# write at t4 there is a two-second network round trip during which
# nothing protects the seats. It is not a millisecond race -- it is a
# two-second one, which is why it happens four times a year rather
# than never.
#
#
# =========================================================================
# WHY IT NEVER REPRODUCES LOCALLY
# =========================================================================
#
# 1. Tests are sequential. One request completes before the next
#    starts, so the interleaving cannot occur.
# 2. Stripe is mocked and returns in microseconds, collapsing the
#    two-second window to nothing.
# 3. Local load is one user. The race needs two requests for
#    OVERLAPPING seats within the same two seconds, which happens
#    only when many people want the same seats -- a popular release.
#
# The test at the bottom fixes all three deliberately: real
# concurrency, an artificial delay in the window, and overlapping
# seat sets.
#
#
# =========================================================================
# THE OTHER TWO BUGS
# =========================================================================
#
# THE DEADLOCK. Once locking is added, .filter(Seat.id.in_(seat_ids))
# returns rows in whatever order the planner chooses -- often the
# order of the index, but not guaranteed and not stable across plans.
# Request A locking (5,6) and request B locking (6,5) deadlock. The
# fix is an explicit ORDER BY on the locking query, not sorting the
# Python list, because it is the ROW order that determines lock order.
#
# THE PAYMENT. stripe.Charge.create() is inside what will become the
# transaction, and it is not idempotent. Two problems:
#   a) holding row locks across a 2s network call blocks every other
#      booking for those seats -- and under a 30s Stripe timeout, for
#      thirty seconds
#   b) if the commit fails after a successful charge, the customer is
#      charged for nothing, with no record to refund against
#
#
# =========================================================================
# THE FIX
# =========================================================================

def book_seats(event_id: str, seat_ids: list[str], user_id: str) -> Booking:
    """Three phases: reserve (transaction), charge (no transaction),
    confirm (transaction). No external call ever holds a lock."""

    # ---- PHASE 1: reserve, under lock. Short and local. ------------
    with transaction():
        event = db.get(Event, event_id)
        if event.status != "on_sale":
            raise EventClosed()

        # FOR UPDATE holds the rows until commit, so no other
        # transaction can read-then-write them behind us.
        #
        # ORDER BY is what prevents the deadlock: every transaction
        # acquires seat locks in ascending id order, so a cycle cannot
        # form. Sorting seat_ids in Python is NOT sufficient -- the
        # planner decides row order, and therefore lock order.
        seats = db.execute(
            select(Seat)
            .where(Seat.id.in_(seat_ids), Seat.event_id == event_id)
            .order_by(Seat.id)
            .with_for_update()
        ).scalars().all()

        if len(seats) != len(set(seat_ids)):
            raise SeatNotFound()          # an id that does not exist

        now = utcnow()
        for seat in seats:
            if seat.booked_by is not None:
                raise SeatTaken(seat.id)
            # A reservation that EXPIRES. Without the expiry, an
            # abandoned checkout holds seats forever.
            if seat.reserved_until and seat.reserved_until > now:
                raise SeatReserved(seat.id)

        reservation = Reservation(
            id=new_id(),
            user_id=user_id,
            event_id=event_id,
            seat_ids=sorted(seat_ids),
            amount=sum(s.price for s in seats),
            expires_at=now + timedelta(minutes=10),
        )
        db.add(reservation)

        for seat in seats:
            seat.reserved_until = reservation.expires_at
            seat.reserved_by = user_id
    # Locks released here. Total held time: a few milliseconds.

    # ---- PHASE 2: charge. NO transaction, NO locks held. -----------
    try:
        charge = stripe.Charge.create(
            amount=int(reservation.amount * 100),
            customer=user_id,
            # Deterministic: a retry of this whole function reuses the
            # same key, so the customer cannot be charged twice.
            idempotency_key=f"reservation-{reservation.id}",
        )
    except stripe.error.CardError:
        release_reservation(reservation.id)      # free the seats now
        raise PaymentFailed()
    except stripe.error.APIConnectionError:
        # The outcome is UNKNOWN -- the charge may have succeeded.
        # Do NOT release: let the reservation expire, and let the
        # reconciliation job below decide.
        raise PaymentUnknown()

    # ---- PHASE 3: confirm, under lock again. -----------------------
    with transaction():
        seats = db.execute(
            select(Seat)
            .where(Seat.id.in_(seat_ids))
            .order_by(Seat.id)                   # same order, again
            .with_for_update()
        ).scalars().all()

        # The reservation may have expired while Stripe was slow.
        # Someone else may now hold these seats.
        res = db.get(Reservation, reservation.id)
        if res.status != "active" or res.expires_at < utcnow():
            # We have taken money for seats we cannot deliver. Refund
            # immediately -- this is a real path, not a theoretical one.
            stripe.Refund.create(charge=charge.id)
            raise ReservationExpired()

        for seat in seats:
            seat.booked_by = user_id
            seat.reserved_until = None
            seat.reserved_by = None

        res.status = "confirmed"
        booking = Booking(
            id=new_id(),
            user_id=user_id,
            seat_ids=sorted(seat_ids),
            charge_id=charge.id,
            reservation_id=res.id,
        )
        db.add(booking)

    return booking


# ---- the schema constraint that makes it structurally impossible ----
#
# Locking is the runtime defence. This is the one that holds even if
# a future code path forgets:
#
#   ALTER TABLE seats ADD CONSTRAINT seats_single_booking
#       EXCLUDE (id WITH =) WHERE (booked_by IS NOT NULL);
#
# More usefully, model bookings as rows rather than a column, and let
# a partial unique index enforce it:
#
#   CREATE UNIQUE INDEX seat_bookings_one_active
#       ON seat_bookings (seat_id) WHERE released_at IS NULL;
#
# Now a double booking cannot be COMMITTED, regardless of isolation
# level, lock order, or what the application code does. The second
# transaction gets a UniqueViolation.


# ---- reconciliation, for PaymentUnknown -----------------------------
#
# @cron("*/5 * * * *")
# def reconcile_unknown_payments():
#     """The APIConnectionError case. Ask Stripe what actually
#     happened, using the deterministic key we sent."""
#     for res in expired_reservations_without_bookings():
#         charge = stripe.Charge.retrieve_by_idempotency_key(
#             f"reservation-{res.id}")
#         if charge and charge.paid:
#             if seats_still_available(res.seat_ids):
#                 confirm_booking(res, charge)     # complete it
#             else:
#                 stripe.Refund.create(charge=charge.id)
#                 notify(res.user_id, "seats_no_longer_available")
#         release_reservation(res.id)


# =========================================================================
# ISOLATION LEVEL
# =========================================================================
#
# READ COMMITTED -- the default -- is sufficient HERE, because the
# defence is an explicit FOR UPDATE row lock rather than the isolation
# level. FOR UPDATE under READ COMMITTED re-reads the row after the
# lock is granted, so the second transaction sees the first's write.
#
# SERIALIZABLE would also work and would remove the need for explicit
# locks, but it needs a retry loop on SerializationFailure and costs
# throughput on a hot path. Explicit locking is the better fit when
# the contended rows are known in advance, which they are.
#
# What neither level fixes on its own is the two-second Stripe window
# -- no isolation level helps when the transaction is not open during
# the gap. That is why the restructuring comes first and the locking
# second.


# =========================================================================
# THE TEST THAT REPRODUCES IT
# =========================================================================

def test_concurrent_bookings_for_overlapping_seats(db_url):
    """Reproduces the production race by restoring all three things
    the original test suite removed: real concurrency, a real delay in
    the window, and overlapping seat sets."""
    event = seed_event(seats=["s1", "s2", "s3"])
    barrier = threading.Barrier(2)
    results = []

    def book(user, seats):
        with mock.patch("stripe.Charge.create") as charge:
            def slow_charge(**kwargs):
                barrier.wait()          # both threads are inside the
                time.sleep(0.5)         # window at the same moment
                return SimpleNamespace(id=f"ch_{user}", paid=True)
            charge.side_effect = slow_charge
            try:
                results.append(("ok", user, book_seats(event.id, seats, user)))
            except SeatTaken as exc:
                results.append(("taken", user, exc))

    a = threading.Thread(target=book, args=("user-a", ["s1", "s2"]))
    b = threading.Thread(target=book, args=("user-b", ["s2", "s3"]))
    a.start(); b.start(); a.join(); b.join()

    # Exactly one wins seat s2. The other gets a clean SeatTaken.
    outcomes = [r[0] for r in results]
    assert sorted(outcomes) == ["ok", "taken"]

    seat = db.get(Seat, "s2")
    assert seat.booked_by is not None
    assert Booking.query.filter(Booking.seat_ids.contains(["s2"])).count() == 1


def test_locks_are_acquired_in_a_consistent_order(db_url):
    """The deadlock. Opposite seat orders, run concurrently."""
    seed_event(seats=["s1", "s2"])
    errors = []

    def book(user, seats):
        try:
            book_seats("e-1", seats, user)
        except DeadlockDetected as exc:
            errors.append(exc)
        except SeatTaken:
            pass

    run_concurrently([
        lambda: book("a", ["s1", "s2"]),
        lambda: book("b", ["s2", "s1"]),       # reversed
    ])

    assert errors == [], "lock order is not deterministic"


def test_a_failed_charge_releases_the_seats(db):
    with mock.patch("stripe.Charge.create", side_effect=CardError):
        with pytest.raises(PaymentFailed):
            book_seats("e-1", ["s1"], "user-a")

    assert db.get(Seat, "s1").reserved_until is None
    assert book_seats("e-1", ["s1"], "user-b") is not None


def test_a_double_booking_cannot_be_committed(db):
    """The schema-level guarantee, independent of application code."""
    db.execute(insert_booking(seat_id="s1", user="a"))

    with pytest.raises(IntegrityError):
        db.execute(insert_booking(seat_id="s1", user="b"))`,
        notes: [
          { t: "p", text: "**The window is the Stripe call, not a millisecond race.** Two seconds separate the availability check from the write, and nothing protects the seats during it — which is why the bug appears four times a year rather than never, and only when many people want the same seats." },
          { t: "p", text: "**The three-phase split is the structural fix.** Reserve under lock, charge with no locks held, confirm under lock. No external call ever holds a database lock, and the longest transaction is a few milliseconds." },
          { t: "callout", kind: "insight", title: "Sorting the Python list does not prevent the deadlock", body: [
            { t: "p", text: "Lock order is determined by the order the database returns rows, not by the order of the ids in your `IN` list. Without an explicit `ORDER BY` on the locking query, the planner chooses — and it may choose differently for two concurrent statements." },
            { t: "p", text: "`ORDER BY Seat.id` alongside `with_for_update()` is what makes the total order real, and it must be the same order in both phases." }
          ]},
          { t: "p", text: "**`APIConnectionError` is not the same as a declined card.** The charge may have succeeded, so releasing the reservation risks selling seats that have been paid for. The correct response is to leave it expiring and let a reconciliation job ask Stripe — using the deterministic idempotency key — what actually happened." },
          { t: "p", text: "**The partial unique index is the guarantee that outlives the code.** Locking is a runtime defence that a future code path can bypass; `CREATE UNIQUE INDEX ... WHERE released_at IS NULL` makes a committed double booking impossible regardless of isolation level or application logic." },
          { t: "p", text: "**The test restores what the original suite removed** — real threads, a real delay inside the window, and overlapping seat sets. Any one of those missing and the race cannot occur, which is exactly why \"it passes every test\" was true and meaningless." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team saw intermittent `deadlock detected` errors on a bulk price update. They added a retry loop, the errors stopped appearing in logs, and the ticket was closed." },
      { t: "p", text: "**Six months later the same job began timing out instead.** The retries had grown from occasional to constant as data volume rose, and the job was now spending most of its time retrying rather than working — the deadlock rate had been a leading indicator nobody was reading." },
      { t: "p", text: "**The cause was a bulk `UPDATE ... WHERE region = 'EU'` with no `ORDER BY`.** Two concurrent runs reached rows in different orders. Adding a deterministic order eliminated the deadlocks entirely, and the retry loop never fired again." },
      { t: "p", text: "**A retry is the right response to a deadlock and the wrong response to a deadlock rate.** One is handling an unavoidable event; the other is silencing a signal that something is ordered inconsistently." }
    ]}
  ],

  takeaways: [
    "**A transaction spans exactly the writes that must agree**, and nothing slow — an external call inside one holds locks for a network round trip.",
    "**A transaction is a lock held on your behalf**, so \"how long is this transaction?\" is the same question as \"how long is everything else blocked?\"",
    "**PostgreSQL defaults to `READ COMMITTED`**, which permits non-repeatable reads, phantoms and write skew.",
    "**Write skew survives `REPEATABLE READ`** — two transactions writing different rows, each correct alone, together breaking an invariant. Only `SERIALIZABLE` detects it.",
    "**`SERIALIZABLE` detects conflicts rather than preventing them**, so it is unusable without a retry loop with jitter.",
    "**Anything retried must be safe to run from the top** — no external side effects inside the transaction, or they happen twice.",
    "**A single atomic `UPDATE` with a guard beats read-decide-write** for a simple counter, and cannot be raced.",
    "**Use `FOR UPDATE` when the decision spans several rows** or needs logic SQL cannot express.",
    "**Optimistic locking suits human-edited data** — \"someone changed this\" is information a person can act on, where last-write-wins destroys work silently.",
    "**Deadlocks come from inconsistent lock ordering.** Acquiring by ascending id removes the possibility.",
    "**`ORDER BY` with `FOR UPDATE` is what makes lock order real** — sorting the ids in Python does not, because the planner decides row order.",
    "**Foreign keys take locks you did not write**, so two inserts that share no table can deadlock through their parents.",
    "**A rising deadlock rate is a signal, not noise.** Retrying handles the event; consistent ordering removes the cause."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Two transactions each check that at least one doctor is on call, see two, and each takes a different doctor off call. Both commit. Which isolation level prevents this?",
        options: [
          "`READ COMMITTED`",
          "`SERIALIZABLE` — the transactions write different rows, so no lock conflicts and only read-dependency tracking catches it",
          "`REPEATABLE READ`",
          "Any level, with `FOR UPDATE` on the row being changed"
        ],
        answer: 1,
        why: "This is write skew. Because the two transactions never touch the same row, no amount of row locking on the rows they write helps — the conflict is between what one read and what the other wrote. `SERIALIZABLE` tracks those read dependencies; nothing below it does."
      },
      {
        stem: "A booking system checks seat availability, calls a payment provider taking two seconds, then writes the booking. Why does it double-book?",
        options: [
          "The isolation level is too low",
          "Nothing holds the seats during the two-second payment call, so a second request passes the same availability check",
          "The commit is not atomic",
          "The payment provider retries"
        ],
        answer: 1,
        why: "No isolation level helps when the transaction is not open across the gap. The fix is structural: reserve under a lock, charge with no locks held, confirm under a lock — so the longest transaction is milliseconds and no external call ever holds a row."
      },
      {
        stem: "You sort seat ids in Python before a `SELECT ... IN (...) FOR UPDATE`. Does this prevent deadlocks?",
        options: [
          "Yes — the locks are acquired in list order",
          "No — the database decides the row order and therefore the lock order; an explicit `ORDER BY` on the query is required",
          "Yes, provided the list is unique",
          "Only under `SERIALIZABLE`"
        ],
        answer: 1,
        why: "The planner is free to return rows in any order, and it may choose differently for two concurrent statements with different plans. `ORDER BY id` alongside `with_for_update()` is what imposes a total order, and it must be the same order everywhere the rows are locked."
      },
      {
        stem: "A job retries on `deadlock detected`, and the retry rate has grown steadily for six months. What does that indicate?",
        options: [
          "The retry limit is too low",
          "Lock ordering is inconsistent somewhere — the retry handles the event but the rising rate is a signal that the cause was never removed",
          "The database needs more memory",
          "Deadlocks are normal at scale"
        ],
        answer: 1,
        why: "A retry is the correct response to an individual deadlock and the wrong response to a deadlock rate. A bulk `UPDATE` with no `ORDER BY` is the usual cause: two concurrent runs reach rows in different orders, and the frequency grows with data volume until the job spends more time retrying than working."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is write skew, and which isolation level prevents it?",
        strong: "Two transactions read overlapping data, each makes a correct decision, and each writes to a different row — so no lock conflicts and the combined result breaks an invariant neither broke alone. Only `SERIALIZABLE` catches it, because only it tracks read dependencies.",
        answer: [
          { t: "p", text: "The doctors-on-call example is the clearest, and giving a concrete one is what shows understanding rather than recall of a table." },
          { t: "p", text: "The point that row locking does not help — because the rows written are different — is the insight interviewers listen for." },
          { t: "p", text: "Adding that `SERIALIZABLE` needs a retry loop shows you have used it rather than only read about it." }
        ]
      },
      {
        level: "advanced",
        q: "How would you prevent double-booking a seat?",
        strong: "Structurally first: split the flow so no external call holds a lock. Then `SELECT ... FOR UPDATE ORDER BY id` for the reservation, and a partial unique index so a double booking cannot be committed even if the application logic is wrong.",
        answer: [
          { t: "p", text: "Leading with the structural fix rather than the lock shows you have identified the real window — the payment call, not the milliseconds around the write." },
          { t: "p", text: "The `ORDER BY` detail is what prevents the deadlock the locking introduces, and mentioning it unprompted is a strong signal." },
          { t: "p", text: "The database constraint as a backstop is the answer that survives future code changes, which is the level above getting this one function right." }
        ]
      },
      {
        level: "core",
        q: "Where should a transaction begin and end?",
        strong: "Around the invariant — the set of writes that must all happen or none. Not around a single statement, and never around an external call, because a transaction is a lock held for its whole duration.",
        answer: [
          { t: "p", text: "The transfer example makes the invariant point concrete in one sentence: two transactions means money can leave one account and arrive nowhere." },
          { t: "p", text: "Framing a transaction as a held lock is what makes the \"nothing slow inside\" rule follow rather than being asserted." },
          { t: "p", text: "Mentioning that a request-scoped transaction holds locks through JSON serialisation is a good concrete example of the boundary being too wide." }
        ]
      }
    ]
  }
});
