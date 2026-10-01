/* ============================================================================
   LESSON 10.3 — Layered, Hexagonal and Clean Architecture
   ========================================================================= */
EC.receiveLesson({
  id: "10.3",

  lede: "Inside one service, architecture is mostly about which way the dependencies point. The classic **layered** architecture stacks presentation on business logic on data access, so the business rules depend on the database. **Hexagonal** architecture (ports and adapters) and **clean** architecture turn that around: the domain and use cases sit at the centre and depend on nothing, and everything technological — HTTP, the database, the message broker, a vendor's API — plugs in from the outside through interfaces the core defines. The payoff is concrete and testable: the same use case runs behind HTTP, a command line or a queue consumer, against an in-memory store or PostgreSQL, unchanged.",

  objectives: [
    "Describe layered, hexagonal and clean architecture by the direction of their dependencies",
    "Separate driving adapters from driven adapters, and the ports each one uses",
    "Run one use case through several entry points and storage adapters without changing it",
    "Write a contract test that every adapter for a port must pass",
    "Judge when the extra indirection pays for itself"
  ],

  prerequisites: ["9.1", "10.1"],

  blocks: [

    { t: "h2", n: "01", id: "direction", text: "Three shapes, one question",
      sub: "What do the business rules depend on?" },

    { t: "viz", title: "Layered, hexagonal and clean, by the direction of their arrows",
      caption: "Layered: each layer depends on the one below, so the business layer imports the data layer and every rule is written in terms of tables and an ORM. Hexagonal: the core defines ports; driving adapters (HTTP, CLI, queue) call into it and driven adapters (Postgres, a payments API, the clock) implement its ports, so every dependency points inward. Clean architecture draws the same rule as rings: source code may depend only on rings further in.",
      svg: `<svg viewBox="0 0 760 318" width="100%" role="img" aria-label="Layered, hexagonal and clean architecture">
<defs><marker id="ar-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker><marker id="ar-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker></defs>
<text x="120" y="18" text-anchor="middle" class="s-label" style="fill:var(--warn)">Layered</text>
<rect x="30" y="34" width="180" height="40" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="120.0" y="58.0" text-anchor="middle" class="s-label">Presentation</text>
<line x1="120" y1="74" x2="120" y2="98" style="stroke:var(--ink-3)" stroke-width="1.6" marker-end="url(#ar-a)"/>
<rect x="30" y="100" width="180" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="120.0" y="124.0" text-anchor="middle" class="s-label">Business logic</text>
<line x1="120" y1="140" x2="120" y2="164" style="stroke:var(--crit)" stroke-width="1.6" marker-end="url(#ar-c)"/>
<rect x="30" y="166" width="180" height="40" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="120.0" y="190.0" text-anchor="middle" class="s-label">Data access</text>
<line x1="120" y1="206" x2="120" y2="226" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#ar-a)"/>
<path d="M75 234 v26 a45 8 0 0 0 90 0 v-26" class="s-fill" style="stroke:var(--line)" stroke-width="1.4"/><ellipse cx="120" cy="234" rx="45" ry="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.4"/>
<text x="120" y="258" text-anchor="middle" class="s-sub">database</text>
<text x="120" y="290" text-anchor="middle" class="s-sub" style="fill:var(--crit)">the rules depend on the storage</text>
<line x1="250" y1="28" x2="250" y2="300" style="stroke:var(--line);stroke-dasharray:4 4"/>
<text x="385" y="18" text-anchor="middle" class="s-label" style="fill:var(--good)">Hexagonal (ports and adapters)</text>
<polygon points="438.7,181.0 385.0,212.0 331.3,181.0 331.3,119.0 385.0,88.0 438.7,119.0" style="fill:var(--good);fill-opacity:.1;stroke:var(--good)" stroke-width="1.6"/>
<text x="385" y="146" text-anchor="middle" class="s-label">core</text><text x="385" y="162" text-anchor="middle" class="s-sub">domain, use cases</text>
<text x="290" y="58" text-anchor="middle" class="s-sub" style="fill:var(--accent)">driving</text>
<text x="480" y="58" text-anchor="middle" class="s-sub" style="fill:var(--violet)">driven</text>
<rect x="260" y="72" width="58" height="30" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="289.0" y="91.0" text-anchor="middle" class="s-mono">HTTP</text>
<line x1="318" y1="87" x2="330" y2="120" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#ar-a)"/>
<rect x="260" y="128" width="58" height="30" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="289.0" y="147.0" text-anchor="middle" class="s-mono">CLI</text>
<line x1="318" y1="143" x2="330" y2="150" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#ar-a)"/>
<rect x="260" y="184" width="58" height="30" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="289.0" y="203.0" text-anchor="middle" class="s-mono">queue</text>
<line x1="318" y1="199" x2="330" y2="180" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#ar-a)"/>
<rect x="452" y="72" width="58" height="30" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="481.0" y="91.0" text-anchor="middle" class="s-mono">Postgres</text>
<line x1="452" y1="87" x2="440" y2="120" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#ar-a)"/>
<rect x="452" y="128" width="58" height="30" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="481.0" y="147.0" text-anchor="middle" class="s-mono">payments</text>
<line x1="452" y1="143" x2="440" y2="150" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#ar-a)"/>
<rect x="452" y="184" width="58" height="30" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="481.0" y="203.0" text-anchor="middle" class="s-mono">clock</text>
<line x1="452" y1="199" x2="440" y2="180" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#ar-a)"/>
<text x="385" y="270" text-anchor="middle" class="s-sub" style="fill:var(--good)">every arrow points into the core;</text>
<text x="385" y="290" text-anchor="middle" class="s-sub" style="fill:var(--good)">adapters are swappable</text>
<line x1="522" y1="28" x2="522" y2="300" style="stroke:var(--line);stroke-dasharray:4 4"/>
<text x="642" y="18" text-anchor="middle" class="s-label" style="fill:var(--good)">Clean</text>
<circle cx="642" cy="150" r="106" style="fill:var(--line);fill-opacity:.07;stroke:var(--line)" stroke-width="1.4"/>
<text x="642" y="59" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">frameworks, drivers</text>
<circle cx="642" cy="150" r="80" style="fill:var(--violet);fill-opacity:.07;stroke:var(--violet)" stroke-width="1.4"/>
<text x="642" y="85" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">interface adapters</text>
<circle cx="642" cy="150" r="54" style="fill:var(--accent);fill-opacity:.07;stroke:var(--accent)" stroke-width="1.4"/>
<text x="642" y="111" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">use cases</text>
<circle cx="642" cy="150" r="28" style="fill:var(--good);fill-opacity:.07;stroke:var(--good)" stroke-width="1.4"/>
<text x="642" y="154" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">entities</text>
<line x1="742" y1="190" x2="676" y2="164" style="stroke:var(--good)" stroke-width="1.5" marker-end="url(#ar-a)"/>
<text x="642" y="290" text-anchor="middle" class="s-sub" style="fill:var(--good)">source dependencies point inward</text>
</svg>` },

    { t: "p", text: "Layered architecture is not wrong — it separates concerns (9.2) and is easy to explain. Its weakness is the one red arrow: business logic depends on persistence, so a rule cannot be tested without a database, and changing the storage means changing the rules. Alistair Cockburn's **hexagonal** architecture (2005) and Robert Martin's **clean** architecture (2012) are the same correction: 9.1's dependency inversion, applied to a whole service." },

    { t: "dl", items: [
      { term: "Port", def: "An interface owned by the core. A driving port is what the outside can ask the core to do (a use case, such as PlaceOrder); a driven port is what the core needs from the outside (Orders storage, a payment gateway, a clock)." },
      { term: "Driving adapter", def: "Translates an external input into a call on a driving port: an HTTP handler, a CLI command, a queue consumer, a scheduled job, a test." },
      { term: "Driven adapter", def: "Implements a driven port with a technology: a PostgreSQL repository, an S3 blob store, a Stripe client (9.4's adapter), an in-memory fake for tests." },
      { term: "Composition root", def: "The one place that builds the adapters and hands them to the core (9.2) — main(), an application factory, or a DI container's configuration." }
    ] },

    { t: "h2", n: "02", id: "hexagon", text: "Ports and adapters, running",
      sub: "One use case, two entry points, two databases" },

    { t: "p", text: "The core below is a domain object, a driven port and a use case, with no imports from any framework or database driver. Two driven adapters implement the port — a dictionary and a real PostgreSQL table — and both must pass the same contract test. Two driving adapters, an HTTP handler and a CLI, call the same use case:" },

    { t: "code", lang: "python", title: "hexagon.py — the core, two storage adapters, two entry points", code: `import json, time
from dataclasses import dataclass
from typing import Optional, Protocol

# ── the core: domain and use case, importing nothing from the outside world ──────────────────
@dataclass(frozen=True)
class Order:
    id: str
    customer: str
    total_pence: int

class Orders(Protocol):                              # driven port: what the core needs from storage
    def add(self, order: Order) -> None: ...
    def get(self, order_id: str) -> Optional[Order]: ...

class PlaceOrder:                                    # driving port: what the outside may ask the core
    def __init__(self, orders: Orders): self.orders = orders
    def __call__(self, order_id: str, customer: str, total_pence: int) -> str:
        if total_pence <= 0: raise ValueError("an order must cost something")
        if self.orders.get(order_id): return "already placed"
        self.orders.add(Order(order_id, customer, total_pence))
        return "placed"

# ── driven adapters: implement the core's port with a technology ───────────────────────────
class InMemoryOrders:
    def __init__(self): self.rows = {}
    def add(self, order): self.rows[order.id] = order
    def get(self, order_id): return self.rows.get(order_id)

class PostgresOrders:
    def __init__(self, conn):
        self.conn = conn
        conn.execute("DROP TABLE IF EXISTS hex_orders")
        conn.execute("CREATE TABLE hex_orders (id text PRIMARY KEY, customer text, total_pence int)")
    def add(self, order):
        self.conn.execute("INSERT INTO hex_orders VALUES (%s, %s, %s)", (order.id, order.customer, order.total_pence))
    def get(self, order_id):
        row = self.conn.execute("SELECT id, customer, total_pence FROM hex_orders WHERE id = %s", (order_id,)).fetchone()
        return Order(*row) if row else None

# ── driving adapters: turn a technology's input into a call on the core ────────────────────
def http_post_orders(place_order, body: str):
    try:
        req = json.loads(body)
        return 201, place_order(req["id"], req["customer"], int(req["total_pence"]))
    except (KeyError, ValueError) as e: return 400, f"bad request: {e}"

def cli(place_order, argv):
    order_id, customer, total = argv
    return place_order(order_id, customer, int(total))

# ── one contract for every Orders adapter (9.1) ─────────────────────────────────────────────
def orders_contract(orders):
    assert orders.get("o-1") is None
    orders.add(Order("o-1", "asha", 4200))
    assert orders.get("o-1") == Order("o-1", "asha", 4200)

if __name__ == "__main__":
    import psycopg
    with psycopg.connect("host=127.0.0.1 port=5433 user=postgres dbname=postgres", autocommit=True) as conn:
        for name, make in (("InMemoryOrders", InMemoryOrders), ("PostgresOrders", lambda: PostgresOrders(conn))):
            start = time.perf_counter(); orders_contract(make())
            print(f"contract test  {name:<15} passed in {(time.perf_counter() - start) * 1000:6.2f} ms")
        good = json.dumps({"id": "o-7", "customer": "ben", "total_pence": 1999})
        free = json.dumps({"id": "o-8", "customer": "ben", "total_pence": 0})
        for name, make in (("InMemoryOrders", InMemoryOrders), ("PostgresOrders", lambda: PostgresOrders(conn))):
            place = PlaceOrder(make())                                   # wiring: the composition root
            print(f"{name:<15} HTTP {http_post_orders(place, good)}  CLI {cli(place, ['o-7', 'ben', '1999'])!r}"
                  f"  HTTP {http_post_orders(place, free)}")`,
      hl: [12, 16, 53, 67],
      out: `contract test  InMemoryOrders  passed in   0.02 ms
contract test  PostgresOrders  passed in   8.49 ms
InMemoryOrders  HTTP (201, 'placed')  CLI 'already placed'  HTTP (400, 'bad request: an order must cost something')
PostgresOrders  HTTP (201, 'placed')  CLI 'already placed'  HTTP (400, 'bad request: an order must cost something')` },

    { t: "p", text: "Both storage adapters passed the contract — the in-memory one in hundredths of a millisecond, PostgreSQL in a few milliseconds — and the use case behaved identically on both: HTTP placed the order, the CLI recognised the same order as already placed, and the validation rule produced the same 400 regardless of storage. The business rule \"an order must cost something\" lives in exactly one place, and the HTTP adapter only translates its exception into a status code." },

    { t: "callout", kind: "insight", title: "The test pyramid follows the hexagon",
      body: [
        { t: "p", text: "Most tests target the core through its driving ports with in-memory driven adapters: thousands of them run in seconds and cover every business rule. A **contract suite per port** runs against each real adapter — PostgreSQL in a container, the vendor's sandbox — proving the adapters are substitutable (9.1's Liskov). A handful of end-to-end tests check the wiring. A codebase where every test needs a database usually has its rules in the wrong ring." }
      ] },

    { t: "diagram", kind: "matrix", title: "Comparing the three",
      cols: ["Rules depend on", "Test the rules with", "Swap the database"],
      rows: ["Layered", "Hexagonal", "Clean"],
      cells: [
        [{ text: "data access layer", tone: "crit" }, { text: "a database or mocks", tone: "warn" }, { text: "edit business code", tone: "crit" }],
        [{ text: "their own ports", tone: "good" }, { text: "in-memory adapters", tone: "good" }, { text: "write an adapter", tone: "good" }],
        [{ text: "inner rings only", tone: "good" }, { text: "in-memory adapters", tone: "good" }, { text: "write an adapter", tone: "good" }]
      ] },

    { t: "callout", kind: "trap", title: "Ports that leak the technology",
      body: [
        { t: "p", text: "A port called `OrdersRepository` with methods like `execute_sql`, `begin_transaction` or `find_by_mongo_filter`, or one that returns ORM objects or HTTP responses, has carried the outside world into the core. Ports are named and typed in the domain's language — `add(order)`, `get(order_id)`, `orders_awaiting_shipment(since)` — and return domain objects. Transactions usually belong to the use case boundary (a unit of work), not to individual repository calls." }
      ] },

    { t: "callout", kind: "tradeoff", title: "When it is worth it",
      body: [
        { t: "p", text: "Ports and adapters cost an interface and a mapping per boundary, plus the discipline to keep framework types out of the core. That pays off for services with real business rules, several entry points (API, events, batch jobs), dependencies that change or are hard to test against, and a long life. For a thin CRUD service whose \"logic\" is validation and a SQL query, a straightforward layered design — or the framework's own conventions — is simpler and fine (9.2's KISS)." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Add a queue consumer without touching the core",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Orders now also arrive as messages from a broker. Write a third driving adapter — a consumer — that parses each message, calls the same PlaceOrder use case, and decides what to tell the broker. Messages may be redelivered (6.3), malformed, or invalid by business rules. The core must not change." }
      ],
      requirements: [
        "Parse the message and call the unchanged PlaceOrder use case",
        "A redelivered message must not create a second order",
        "Malformed or invalid messages go to a dead-letter list instead of blocking the queue",
        "The consumer contains no business rules"
      ],
      hint: "Idempotency is already in the core — PlaceOrder returns 'already placed' for a known ID — so the consumer only maps outcomes: success or duplicate means ack; a parse error or rule violation means dead-letter, then ack.",
      solution: { lang: "python", title: "queue_adapter_ex.py",
        code: `import json
from dataclasses import dataclass

# ── the core, unchanged from hexagon.py ──────────────────────────────────────────────────────
@dataclass(frozen=True)
class Order:
    id: str
    customer: str
    total_pence: int

class PlaceOrder:
    def __init__(self, orders): self.orders = orders
    def __call__(self, order_id, customer, total_pence):
        if total_pence <= 0: raise ValueError("an order must cost something")
        if self.orders.get(order_id): return "already placed"
        self.orders.add(Order(order_id, customer, total_pence))
        return "placed"

class InMemoryOrders:
    def __init__(self): self.rows = {}
    def add(self, order): self.rows[order.id] = order
    def get(self, order_id): return self.rows.get(order_id)

# ── the new driving adapter: a queue consumer ───────────────────────────────────────────────
class OrderQueueConsumer:
    """Turns broker messages into calls on the core. Knows JSON and acks; knows no business rules."""
    def __init__(self, place_order): self.place_order, self.dead_letters = place_order, []
    def on_message(self, raw: bytes):
        try:
            msg = json.loads(raw)
            result = self.place_order(msg["order_id"], msg["customer"], int(msg["total_pence"]))
            return "ack", result                                  # done, or a harmless duplicate
        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
            self.dead_letters.append((raw, repr(e)))              # a poison message: park it, keep going
            return "ack, DLQ", type(e).__name__ + ": " + str(e)

orders = InMemoryOrders()
consumer = OrderQueueConsumer(PlaceOrder(orders))                 # the composition root, again
inbox = [("new order",      b'{"order_id": "o-1", "customer": "asha", "total_pence": 4200}'),
         ("redelivered",    b'{"order_id": "o-1", "customer": "asha", "total_pence": 4200}'),
         ("free order",     b'{"order_id": "o-2", "customer": "ben", "total_pence": 0}'),
         ("truncated JSON", b'{"order_id": "o-3", "customer": "chen"'),
         ("new order",      b'{"order_id": "o-4", "customer": "dara", "total_pence": 999}')]
for label, raw in inbox:
    status, detail = consumer.on_message(raw)
    print(f"{label:<15} {status:<11} {detail}")
print("orders stored:", sorted(orders.rows), "| dead letters:", len(consumer.dead_letters))`,
        out: `new order       ack         placed
redelivered     ack         already placed
free order      ack, DLQ    ValueError: an order must cost something
truncated JSON  ack, DLQ    JSONDecodeError: Expecting ',' delimiter: line 1 column 39 (char 38)
new order       ack         placed
orders stored: ['o-1', 'o-4'] | dead letters: 2`,
        notes: [
          { t: "p", text: "The consumer is about fifteen lines of JSON parsing and error mapping. The redelivered message was harmless because the use case — not the adapter — owns the rule that an order ID is placed once, so HTTP, CLI and queue all inherit it. The free order and the truncated message were parked in the dead-letter list, and the queue kept moving." },
          { t: "p", text: "One design choice deserves a second look in production: a business-rule rejection (a zero total) and a malformed message both went to the dead-letter queue here. Many teams separate them — malformed messages are a producer bug to fix, while rule rejections may need a compensating event back to the producer, such as OrderRejected." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: an ORM upgrade that took six weeks",
      body: [
        { t: "p", text: "**Symptom.** A security advisory required upgrading the service's ORM by a major version. The upgrade changed lazy-loading defaults and session semantics, and it took six weeks: hundreds of business-logic functions broke, and some of the breakage — orders priced against stale related rows — reached production." },
        { t: "p", text: "**Mechanism.** The service was layered in name only. Business functions took ORM sessions as arguments, navigated relationships that triggered lazy loads (9.4's remote proxy), and committed transactions themselves. Every rule depended on how the ORM behaved, so changing the ORM meant re-verifying every rule — and the tests, which all used the database, were too slow to run often." },
        { t: "p", text: "**Fix.** The team introduced ports for its three main aggregates, moved ORM usage into adapters with a contract suite each, and moved transaction handling to the use-case boundary. Business-rule tests moved to in-memory adapters and dropped from twenty minutes to forty seconds. The next ORM upgrade touched only the adapters and took two days." }
      ] }
  ],

  takeaways: [
    "The three architectures differ in **which way dependencies point**: layered points down to the database; hexagonal and clean point **inward to the core**.",
    "A **port** is an interface owned by the core: driving ports are its use cases, driven ports are what it needs.",
    "**Driving adapters** (HTTP, CLI, queue, tests) call into the core; **driven adapters** (Postgres, vendors, clocks) implement its ports.",
    "Measured: one use case ran behind **HTTP and a CLI**, on **in-memory and PostgreSQL** storage, with identical results and **no change to the core**.",
    "A **contract suite per port** proves adapters are substitutable — the in-memory store in **~0.02 ms**, PostgreSQL in a few milliseconds.",
    "Most business-rule tests should run against **in-memory adapters**; slow, database-bound test suites often mean rules live in the wrong ring.",
    "Name ports in the **domain's language**; ports that expose SQL, ORM objects or HTTP types leak technology into the core.",
    "A new entry point is a new adapter: a queue consumer added idempotency and dead-lettering **without touching the core**.",
    "Use it where rules are rich and lives are long; keep thin CRUD services simple."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What is the essential difference between layered and hexagonal architecture?",
        options: ["Hexagonal has six layers", "In layered architecture the business logic depends on the data access layer; in hexagonal, adapters depend on interfaces owned by the core", "Hexagonal architecture forbids databases", "Layered architecture cannot have an HTTP API"],
        answer: 1,
        why: "The shapes are about dependency direction. Layered points down to persistence; hexagonal inverts it so the core defines ports and the database adapter implements one. The number six is just a drawing, both use databases, and both can expose HTTP." },

      { stem: "Which of these is a driven adapter?",
        options: ["An HTTP request handler", "A PostgreSQL implementation of the Orders port", "A CLI command", "A test that calls the use case"],
        answer: 1,
        why: "Driven adapters implement ports the core needs — storage, vendors, clocks. HTTP handlers, CLI commands, queue consumers and tests are driving adapters: they call into the core's use cases." },

      { stem: "A port is defined as execute_sql(query) and returns database rows. What is wrong?",
        options: ["Nothing; ports should be flexible", "It leaks the storage technology into the core; ports should be named in domain terms and return domain objects", "Ports must be asynchronous", "SQL should be generated by the core"],
        answer: 1,
        why: "A port exists so the core does not know the technology. execute_sql makes the core write SQL and handle rows, re-coupling it to the database. Asynchrony is unrelated, and having the core generate SQL is the same leak." },

      { stem: "How should business rules mostly be tested in a hexagonal service?",
        options: ["End to end against the real database and HTTP stack", "Through the use cases with in-memory driven adapters, with separate contract tests for each real adapter", "Only through manual QA", "By mocking every method call inside the core"],
        answer: 1,
        why: "In-memory adapters make rule tests fast and focused, and per-port contract suites prove the real adapters behave the same. End-to-end tests are few and check wiring; mocking internals couples tests to implementation; manual QA is not a test strategy." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Expect to sketch the hexagon and explain what it buys you.",
    questions: [
      { level: "core",
        q: "Explain hexagonal architecture. What problem does it solve?",
        strong: "A strong answer covers ports, both kinds of adapter, dependency direction, and the testing payoff.",
        answer: [
          { t: "p", text: "The domain and use cases form a core that depends on nothing external. The core defines ports: driving ports are its use cases, driven ports are interfaces for what it needs, like order storage or a payment gateway. Driving adapters — HTTP handlers, consumers, CLIs — call the use cases; driven adapters — a Postgres repository, a Stripe client — implement the ports. All source dependencies point inward." },
          { t: "p", text: "It solves the layered problem of business rules depending on infrastructure. Rules can be tested quickly with in-memory adapters, technologies can be swapped or upgraded by replacing an adapter, and new entry points such as an event consumer reuse the same use cases unchanged." }
        ] },

      { level: "advanced",
        q: "Where do transactions belong in a hexagonal or clean architecture?",
        strong: "A strong answer places them at the use-case boundary through a unit-of-work port, and connects them to aggregates.",
        answer: [
          { t: "p", text: "At the use-case boundary: a use case is one business operation, so it should commit or roll back as a whole. The core expresses that through a unit-of-work port — begin, commit, rollback, or a context manager — implemented by the database adapter, so repositories do not commit on their own." },
          { t: "p", text: "Combined with DDD, a use case usually changes one aggregate per transaction; other aggregates or services are updated by events, published through an outbox in the same transaction so the change and the event commit together." }
        ] },

      { level: "core",
        q: "When would you not use hexagonal architecture?",
        strong: "A strong answer weighs indirection against the service's rules, lifetime and entry points.",
        answer: [
          { t: "p", text: "For a thin CRUD service, a short-lived prototype, or a script, where the logic is little more than validation and a query. Ports, adapters and mapping layers would add code without protecting anything that changes." },
          { t: "p", text: "I would introduce it when a service gains real rules, a second entry point, a dependency that is slow or awkward to test against, or a technology likely to change — often by extracting one port at a time rather than restructuring everything at once." }
        ] }
    ]
  }
});
