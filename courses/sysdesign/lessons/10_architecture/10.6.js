/* ============================================================================
   LESSON 10.6 — Migration, Cells, ADRs and Anti-Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "10.6",

  lede: "Architectures are not chosen once; they are changed while running. This lesson collects the techniques for changing them safely and the structures that limit the damage when a change goes wrong. The **strangler fig** replaces a legacy system one slice at a time behind a routing facade, proving each slice in a **shadow run** first. **Expand–contract** changes schemas and APIs with old and new versions live at once. **Cells** and **shuffle sharding** bound the blast radius of a bad deploy or a poison request. **Architecture decision records** keep the reasons, and a short catalogue of **anti-patterns** names the shapes that keep recurring.",

  objectives: [
    "Migrate a component with a strangler-fig facade, a shadow run and a gradual cut-over",
    "Change a database column with expand–contract while two application versions run",
    "Bound blast radius with cells, and measure what shuffle sharding adds",
    "Record an architectural decision in an ADR with context, options and consequences",
    "Recognise the common architecture anti-patterns and their repairs"
  ],

  prerequisites: ["10.1", "10.2", "4.2"],

  blocks: [

    { t: "h2", n: "01", id: "strangler", text: "The strangler fig",
      sub: "Replace a system while it keeps running" },

    { t: "p", text: "Big-bang rewrites fail so reliably that the warning is folklore: the old system keeps changing while the new one is built, and the cut-over day reveals every behaviour nobody wrote down. Martin Fowler's **strangler fig** — named after a vine that grows around a tree until it replaces it — does it incrementally. Put a **facade** in front of the legacy system so all traffic passes a point you control; build one slice in the new system; **shadow** it, then route a growing share of users to it; repeat until the old system serves nothing and can be deleted." },

    { t: "viz", title: "Five phases of strangling one slice",
      caption: "The facade comes first and changes nothing. In the shadow run the legacy system still answers every request, while the new service is also called and its answers compared and thrown away. Only when they agree does real traffic move — a sticky 1% of users, then more, watching errors and business metrics at each step — until the legacy code for that slice can be deleted.",
      svg: `<svg viewBox="0 0 760 252" width="100%" role="img" aria-label="Strangler fig phases">
<text x="158" y="37" text-anchor="end" class="s-label">1  facade in front</text>
<rect x="170" y="18" width="330" height="28" rx="5" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)"/>
<text x="180" y="37" class="s-sub" style="fill:var(--ink)">monolith 100%</text>
<text x="514" y="37" class="s-sub">all traffic still to the monolith</text>
<text x="158" y="81" text-anchor="end" class="s-label">2  shadow run</text>
<rect x="170" y="62" width="330" height="28" rx="5" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)"/>
<rect x="173" y="65" width="324" height="22" rx="4" style="fill:none;stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.4"/>
<text x="180" y="81" class="s-sub" style="fill:var(--ink)">monolith 100%</text>
<text x="514" y="81" class="s-sub">new service also called; answers compared</text>
<text x="158" y="125" text-anchor="end" class="s-label">3  canary</text>
<rect x="170" y="106" width="327" height="28" rx="5" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)"/>
<rect x="497" y="106" width="4" height="28" rx="5" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/>
<text x="180" y="125" class="s-sub" style="fill:var(--ink)">monolith 99%</text>
<text x="514" y="125" class="s-sub">1% of users, sticky by user ID</text>
<text x="158" y="169" text-anchor="end" class="s-label">4  ramp</text>
<rect x="170" y="150" width="165" height="28" rx="5" style="fill:var(--warn);fill-opacity:.3;stroke:var(--warn)"/>
<rect x="335" y="150" width="165" height="28" rx="5" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/>
<text x="180" y="169" class="s-sub" style="fill:var(--ink)">monolith 50%</text>
<text x="345" y="169" class="s-sub" style="fill:var(--ink)">new service 50%</text>
<text x="514" y="169" class="s-sub">watch errors, latency, business metrics</text>
<text x="158" y="213" text-anchor="end" class="s-label">5  done</text>
<rect x="170" y="194" width="330" height="28" rx="5" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/>
<text x="180" y="213" class="s-sub" style="fill:var(--ink)">new service 100%</text>
<text x="514" y="213" class="s-sub">the monolith's pricing code is deleted</text>
<text x="170" y="244" class="s-sub" style="fill:var(--warn)">■ legacy</text><text x="240" y="244" class="s-sub" style="fill:var(--good)">■ new service</text><text x="340" y="244" class="s-sub" style="fill:var(--good)">┅ shadow call</text>
</svg>` },

    { t: "p", text: "The shadow run is where the undocumented behaviour surfaces. Here a new pricing service is compared against the monolith on 10,000 real-looking carts before it serves anyone:" },

    { t: "code", lang: "python", title: "strangler.py — a routing facade with a shadow run and a sticky cut-over", code: `import hashlib, random
from decimal import Decimal, ROUND_HALF_UP

def legacy_total(cart):                        # the monolith: VAT rounded on every line
    return sum((Decimal(p) * q * Decimal("1.2")).quantize(Decimal("0.01"), ROUND_HALF_UP) for p, q in cart)

def new_total(cart):                           # the new pricing service, first version: VAT rounded once
    return (sum(Decimal(p) * q for p, q in cart) * Decimal("1.2")).quantize(Decimal("0.01"), ROUND_HALF_UP)

def new_total_fixed(cart):                     # after the shadow run: VAT rounded per line, as invoices require
    line = lambda price, qty: (Decimal(price) * qty * Decimal("1.2")).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return sum(line(p, q) for p, q in cart)

class Facade:
    """The strangler's router: every request passes here; a percentage goes to the new service."""
    def __init__(self, new, percent=0, shadow=False):
        self.new, self.percent, self.shadow, self.mismatches, self.calls = new, percent, shadow, [], 0
    def total(self, user, cart):
        self.calls += 1
        bucket = int(hashlib.md5(user.encode()).hexdigest(), 16) % 100   # sticky per user (9.5)
        if bucket < self.percent: return self.new(cart)
        answer = legacy_total(cart)
        if self.shadow:                                                   # call the new one too, compare, discard
            candidate = self.new(cart)
            if candidate != answer: self.mismatches.append((cart, answer, candidate))
        return answer

rng = random.Random(9)
carts = [[(f"{rng.randint(1, 4999) / 100:.2f}", rng.randint(1, 3)) for _ in range(rng.randint(1, 5))] for _ in range(10_000)]
for label, new in (("shadow run, first version", new_total), ("shadow run, fixed version", new_total_fixed)):
    facade = Facade(new, percent=0, shadow=True)
    for i, cart in enumerate(carts): facade.total(f"user-{i}", cart)
    print(f"{label:<27} {len(facade.mismatches):>5} of {facade.calls:,} carts differ", end="")
    if facade.mismatches:
        cart, old, new_ = facade.mismatches[0]; print(f"   e.g. {cart}: legacy {old}, new {new_}")
    else: print()
for percent in (1, 10, 50, 100):
    served = sum(int(hashlib.md5(f"user-{i}".encode()).hexdigest(), 16) % 100 < percent for i in range(10_000))
    print(f"cut over {percent:>3}% of users -> {served:>5,} of 10,000 served by the new service")`,
      hl: [21, 23, 25],
      out: `shadow run, first version    2789 of 10,000 carts differ   e.g. [('30.59', 2), ('11.35', 1), ('0.53', 2), ('41.19', 2)]: legacy 187.17, new 187.16
shadow run, fixed version       0 of 10,000 carts differ
cut over   1% of users ->   108 of 10,000 served by the new service
cut over  10% of users ->   971 of 10,000 served by the new service
cut over  50% of users -> 5,072 of 10,000 served by the new service
cut over 100% of users -> 10,000 of 10,000 served by the new service` },

    { t: "p", text: "The first version of the new service differed on **28% of carts**, by a penny: the monolith rounded VAT on each line, the new service once on the total. Both are defensible arithmetic; only one matches the invoices customers already hold, and nobody had written it down. The shadow run found it with zero customer impact. The fixed version agreed on all 10,000, and the cut-over then moved sticky groups of users across." },

    { t: "callout", kind: "trap", title: "Data is the hard part",
      body: [
        { t: "p", text: "Routing requests is easy; moving the data the slice owns is not. The usual sequence: the new service first reads the legacy tables (or a view), then keeps its own copy in sync through CDC (4.4), then becomes the writer with changes flowing back to the legacy tables for code that still reads them, and finally the legacy tables are dropped. At every step exactly one side is the source of truth for each piece of data, and the reconciliation job that proves they agree runs until the end." }
      ] },

    { t: "h2", n: "02", id: "expand", text: "Expand–contract",
      sub: "Old and new, live at the same time" },

    { t: "p", text: "During any rolling deploy, two versions of an application run at once, so every schema or API change must work with both. **Expand–contract** (parallel change) does it in three steps: **expand** — add the new column, field or endpoint alongside the old one and keep them in step; **migrate** — backfill old data and move every reader and writer to the new form; **contract** — once nothing uses the old form, remove it. Each step is separately deployable and reversible. The exercise does it to a real PostgreSQL table." },

    { t: "h2", n: "03", id: "cells", text: "Cells and shuffle sharding",
      sub: "Decide in advance how much can break at once" },

    { t: "p", text: "Redundancy (7.5) protects against machines failing. It does not protect against the failures that hit every replica identically: a bad deploy, a bad configuration push, a poison request that crashes any server that handles it. **Cell-based architecture** splits the system into complete, independent copies — each with its own API servers, database, cache and queue — and assigns each customer to one. A change is deployed to one cell first; a failure stays inside the cell it started in." },

    { t: "viz", title: "Four cells behind a router",
      caption: "The router maps each customer to one cell and does nothing else, so it rarely changes. A deploy goes to one cell first; when it is bad, a quarter of customers see errors until it is rolled back, instead of all of them. Cells also make scaling predictable — add a cell rather than grow one — and give natural units for data residency and noisy-tenant isolation.",
      svg: `<svg viewBox="0 0 760 252" width="100%" role="img" aria-label="Cell-based architecture">
<defs><marker id="ce-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="260" y="10" width="240" height="40" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
<text x="380" y="28" text-anchor="middle" class="s-label">cell router</text><text x="380" y="43" text-anchor="middle" class="s-sub">customer ID → cell (thin, very stable)</text>
<line x1="380" y1="50" x2="102" y2="78" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ce-a)"/>
<rect x="16" y="80" width="172" height="128" rx="12" style="fill:var(--good);fill-opacity:.06;stroke:var(--good);stroke-dasharray:6 4" stroke-width="1.5"/>
<text x="28" y="98" class="s-label" style="fill:var(--good)">cell 1</text><text x="176" y="98" text-anchor="end" class="s-sub">25% of customers</text>
<rect x="28" y="108" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="63" y="129" text-anchor="middle" class="s-mono">API</text>
<rect x="106" y="108" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="141" y="129" text-anchor="middle" class="s-mono">DB</text>
<rect x="28" y="152" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="63" y="173" text-anchor="middle" class="s-mono">cache</text>
<rect x="106" y="152" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="141" y="173" text-anchor="middle" class="s-mono">queue</text>
<line x1="380" y1="50" x2="288" y2="78" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ce-a)"/>
<rect x="202" y="80" width="172" height="128" rx="12" style="fill:var(--crit);fill-opacity:.06;stroke:var(--crit);stroke-dasharray:6 4" stroke-width="1.5"/>
<text x="214" y="98" class="s-label" style="fill:var(--crit)">cell 2</text><text x="362" y="98" text-anchor="end" class="s-sub">25% of customers</text>
<rect x="214" y="108" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="249" y="129" text-anchor="middle" class="s-mono">API</text>
<rect x="292" y="108" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="327" y="129" text-anchor="middle" class="s-mono">DB</text>
<rect x="214" y="152" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="249" y="173" text-anchor="middle" class="s-mono">cache</text>
<rect x="292" y="152" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="327" y="173" text-anchor="middle" class="s-mono">queue</text>
<line x1="380" y1="50" x2="474" y2="78" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ce-a)"/>
<rect x="388" y="80" width="172" height="128" rx="12" style="fill:var(--good);fill-opacity:.06;stroke:var(--good);stroke-dasharray:6 4" stroke-width="1.5"/>
<text x="400" y="98" class="s-label" style="fill:var(--good)">cell 3</text><text x="548" y="98" text-anchor="end" class="s-sub">25% of customers</text>
<rect x="400" y="108" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="435" y="129" text-anchor="middle" class="s-mono">API</text>
<rect x="478" y="108" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="513" y="129" text-anchor="middle" class="s-mono">DB</text>
<rect x="400" y="152" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="435" y="173" text-anchor="middle" class="s-mono">cache</text>
<rect x="478" y="152" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="513" y="173" text-anchor="middle" class="s-mono">queue</text>
<line x1="380" y1="50" x2="660" y2="78" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#ce-a)"/>
<rect x="574" y="80" width="172" height="128" rx="12" style="fill:var(--good);fill-opacity:.06;stroke:var(--good);stroke-dasharray:6 4" stroke-width="1.5"/>
<text x="586" y="98" class="s-label" style="fill:var(--good)">cell 4</text><text x="734" y="98" text-anchor="end" class="s-sub">25% of customers</text>
<rect x="586" y="108" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="621" y="129" text-anchor="middle" class="s-mono">API</text>
<rect x="664" y="108" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="699" y="129" text-anchor="middle" class="s-mono">DB</text>
<rect x="586" y="152" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="621" y="173" text-anchor="middle" class="s-mono">cache</text>
<rect x="664" y="152" width="70" height="34" rx="6" class="s-fill" style="stroke:var(--line)"/><text x="699" y="173" text-anchor="middle" class="s-mono">queue</text>
<text x="188" y="228" text-anchor="middle" class="s-sub" style="fill:var(--crit)">cell 2 got the bad deploy first:</text>
<text x="188" y="244" text-anchor="middle" class="s-sub" style="fill:var(--crit)">a quarter of customers affected, then rolled back</text>
<text x="565" y="236" text-anchor="middle" class="s-sub">each cell is a complete stack; cells share nothing</text>
</svg>` },

    { t: "p", text: "**Shuffle sharding**, which AWS uses for services such as Route 53, goes further: instead of fixed cells, each customer gets a random small set of nodes from the pool, so two customers rarely share their whole set. One customer sends a request that crashes every node that handles it:" },

    { t: "code", lang: "python", title: "cells.py — a poison customer against three layouts", code: `import itertools, random

CUSTOMERS, NODES = 100_000, 8
rng = random.Random(4)

def layout(kind):
    """Which nodes serve each customer."""
    if kind == "one shared fleet":   return [tuple(range(NODES))] * CUSTOMERS          # everyone on every node
    if kind == "4 cells of 2 nodes": return [(2 * c, 2 * c + 1) for c in (rng.randrange(4) for _ in range(CUSTOMERS))]
    if kind == "shuffle sharding, 2 of 8":
        pairs = list(itertools.combinations(range(NODES), 2))                         # 28 possible shards
        return [rng.choice(pairs) for _ in range(CUSTOMERS)]

print("one customer sends a poison request that crashes every node serving it:")
print(f"{'':>26} {'customers fully down':>22} {'customers degraded':>20}")
for kind in ("one shared fleet", "4 cells of 2 nodes", "shuffle sharding, 2 of 8"):
    serving = layout(kind)
    dead = set(serving[0])                                     # customer 0 is the poison one
    down = sum(set(s) <= dead for s in serving)                # every node it uses has crashed
    degraded = sum(bool(set(s) & dead) and not set(s) <= dead for s in serving)
    print(f"{kind:>26} {down / CUSTOMERS:>22.1%} {degraded / CUSTOMERS:>20.1%}")`,
      hl: [11, 19, 20],
      out: `one customer sends a poison request that crashes every node serving it:
                             customers fully down   customers degraded
          one shared fleet                 100.0%                 0.0%
        4 cells of 2 nodes                  25.1%                 0.0%
  shuffle sharding, 2 of 8                   3.6%                42.6%` },

    { t: "p", text: "On one shared fleet the poison request eventually reached and crashed every node: **100%** of customers down. With four fixed cells, it took out its own cell: **25%**. With each customer on a random 2 of 8 nodes, only customers with exactly the same pair — 1 in 28 — lost everything: **3.6%**, while about 43% lost one node and were still served by the other. Clients must retry on the other node of their shard for that to hold." },

    { t: "h2", n: "04", id: "adr", text: "Architecture decision records",
      sub: "Write down why, while you still know" },

    { t: "p", text: "Two years later, nobody remembers why the system uses Kafka rather than SQS, or why that service has its own database. Without the reasons, teams either preserve decisions whose context has gone or reverse decisions whose reasons still hold. An **ADR** is a short, numbered, version-controlled document recording one decision. Michael Nygard's format is the common one:" },

    { t: "code", lang: "text", title: "docs/adr/0007-event-sourcing-for-the-ledger.md", code: `# ADR-0007: Event-source the ledger context

Status: Accepted, 2026-03-02. Supersedes nothing. Review when: ledger writes exceed 5,000/s.

## Context
Finance needs a complete, tamper-evident history of every balance change, and
answers to questions we cannot predict (disputes, regulator requests).
Current design: a balances table plus an audit table written by triggers,
which has drifted from the balances twice this year.

## Options considered
1. Keep CRUD + audit table, add reconciliation      - cheapest; drift remains possible
2. CRUD + transactional outbox events (6.4)          - history only from today
3. Event sourcing for the ledger context only (10.4) - history is the data; more complex

## Decision
Option 3, for the ledger bounded context only. Other contexts consume its events.

## Consequences
+ Audit history cannot drift from balances; point-in-time balances for disputes
+ New read models by replay (e.g. regulator reports)
- Projections lag writes by up to ~1 s; account page must handle it
- Event schemas must be versioned; we adopt upcasters and a schema registry
- Team needs replay/snapshot tooling: ~3 weeks of work` },

    { t: "callout", kind: "insight", title: "Keep them short, immutable and close to the code",
      body: [
        { t: "p", text: "One decision per record, a page or less, stored in the repository the decision affects so it is reviewed like code. Never edit an accepted ADR's decision; write a new one that supersedes it, so the history of thinking survives. The **options considered** and **consequences** sections are the valuable ones — they show the trade-off was understood, and the review trigger says when to revisit it." }
      ] },

    { t: "h2", n: "05", id: "anti", text: "Anti-patterns",
      sub: "Shapes worth recognising early" },

    { t: "table", head: ["Anti-pattern", "What it looks like", "Repair"], rows: [
      ["Distributed monolith", "services that share a database and deploy together", "redraw boundaries by capability; data per service (10.1)"],
      ["Nano-services", "a service per function; more pipelines than features", "merge into services per bounded context"],
      ["Shared database", "several services write the same tables", "one owner per table; APIs, events or CDC for others"],
      ["Chatty services", "dozens of synchronous calls per request", "batch APIs, local copies via events, BFF (9.4)"],
      ["Big-bang rewrite", "a new system that must replace the old in one day", "strangler fig with shadow runs"],
      ["Golden hammer", "one technology for every problem", "choose per problem; record why in an ADR"],
      ["Resume-driven design", "Kubernetes and a mesh for three services", "the simplest design that meets the requirements (9.2)"],
      ["God service", "one service every change must touch", "split by bounded context; thin gateways and facades"]
    ] },

    { t: "diagram", kind: "compare", title: "Analytical data: warehouse, lake or mesh",
      caption: "Data mesh (Zhamak Dehghani, 2019) applies bounded contexts to analytics: each domain publishes its data as a documented, versioned product on a shared self-serve platform, under common rules enforced by tooling. It addresses an organisational bottleneck — one central data team for fifty domains — and is overhead for an organisation with a handful.",
      columns: [
        { title: "Data warehouse", tone: "accent", items: ["central team, central model", "schema on write", "curated, consistent", "the team becomes a queue"] },
        { title: "Data lake", tone: "warn", items: ["central storage, raw files", "schema on read", "cheap to load anything", "often a swamp: who owns what?"] },
        { title: "Data mesh", tone: "violet", items: ["domains own their data products", "SLOs, docs, schemas per product", "self-serve platform", "federated, automated governance"] }
      ] },

    { t: "exercise", kind: "Challenge", title: "Rename a column with zero downtime",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "A `users.fullname` column must become `display_name`. Version 1 of the application reads and writes `fullname`; version 2 uses `display_name`; during the rollout both run against the same PostgreSQL table, inserting and updating rows. Perform the rename with expand–contract so that no write from either version is lost and the two columns never disagree, then remove the old column." }
      ],
      requirements: [
        "Expand: add display_name and keep it in step with fullname for inserts and updates from either version",
        "Migrate: backfill existing rows in small batches while both versions keep writing",
        "Verify after each phase that no row has the two columns out of sync",
        "Contract: remove the synchronisation and drop fullname once only version 2 runs"
      ],
      hint: "A BEFORE INSERT OR UPDATE trigger can copy whichever column the writer set into the other: on insert, coalesce each from the other; on update, copy the one that changed. Backfill with UPDATE ... WHERE id IN (SELECT id ... WHERE display_name IS NULL LIMIT 1000) in a loop.",
      solution: { lang: "python", title: "expand_ex.py",
        code: `import psycopg

db = psycopg.connect("host=127.0.0.1 port=5433 user=postgres dbname=postgres", autocommit=True)
db.execute("DROP TABLE IF EXISTS users CASCADE")
db.execute("CREATE TABLE users (id serial PRIMARY KEY, fullname text)")
db.execute("INSERT INTO users (fullname) SELECT 'user ' || g FROM generate_series(1, 5000) g")

def check(label):
    rows, bad = db.execute("SELECT count(*), count(*) FILTER (WHERE fullname IS DISTINCT FROM display_name) FROM users").fetchone()
    print(f"{label:<54} {rows:>5} rows, {bad:>4} out of sync")

# 1. EXPAND: add the new column, and keep both columns in step while two app versions run
db.execute("ALTER TABLE users ADD COLUMN display_name text")
db.execute("""CREATE FUNCTION sync_names() RETURNS trigger AS $$ BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.display_name := coalesce(NEW.display_name, NEW.fullname);
        NEW.fullname     := coalesce(NEW.fullname, NEW.display_name);
    ELSIF NEW.fullname IS DISTINCT FROM OLD.fullname THEN NEW.display_name := NEW.fullname;
    ELSIF NEW.display_name IS DISTINCT FROM OLD.display_name THEN NEW.fullname := NEW.display_name;
    END IF;
    RETURN NEW; END $$ LANGUAGE plpgsql""")
db.execute("CREATE TRIGGER sync_names BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION sync_names()")
check("after expand (old rows not yet backfilled)")

# 2. MIGRATE: backfill in small batches (short transactions, no long lock), while both versions write
while db.execute("""UPDATE users SET display_name = fullname WHERE id IN
                    (SELECT id FROM users WHERE display_name IS NULL LIMIT 1000)""").rowcount:
    db.execute("INSERT INTO users (fullname) VALUES ('written by the OLD app')")                       # v1, still live
    db.execute("INSERT INTO users (display_name) VALUES ('written by the NEW app')")                   # v2, rolling out
    db.execute("UPDATE users SET fullname = 'renamed by OLD' WHERE id = 7")
    db.execute("UPDATE users SET display_name = 'renamed by NEW' WHERE id = 8")
check("after backfill, with old and new versions writing")

# 3. CONTRACT: every instance now runs v2; drop the bridge, then the old column
db.execute("DROP TRIGGER sync_names ON users; DROP FUNCTION sync_names()")
before = db.execute("SELECT count(*) FROM users").fetchone()[0]
db.execute("ALTER TABLE users DROP COLUMN fullname")
print(f"{'after contract: fullname dropped':<54} {before:>5} rows,", "columns:",
      [r[0] for r in db.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")])
print("rows 7 and 8:", db.execute("SELECT id, display_name FROM users WHERE id IN (7, 8) ORDER BY id").fetchall())`,
        out: `after expand (old rows not yet backfilled)              5000 rows, 5000 out of sync
after backfill, with old and new versions writing       5010 rows,    0 out of sync
after contract: fullname dropped                        5010 rows, columns: ['id', 'display_name']
rows 7 and 8: [(7, 'renamed by OLD'), (8, 'renamed by NEW')]`,
        notes: [
          { t: "p", text: "After the expand step, the 5,000 existing rows were out of sync, as expected: nothing had copied them yet. The batched backfill fixed them while the old and new versions kept inserting and renaming rows, and the trigger kept every write consistent — the row renamed by the old version and the row renamed by the new one both survived into the final column." },
          { t: "p", text: "Batches keep each transaction short, so the backfill never holds locks that block the live application. In production each phase is its own deploy with a pause between: expand, then ship version 2, then backfill, then confirm no version 1 instances remain, then contract. Any step can be rolled back without data loss until the old column is dropped." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a configuration push that took down every region at once",
      body: [
        { t: "p", text: "**Symptom.** A routine configuration change to the request-routing layer — validated in staging — caused every server that loaded it to crash within seconds. It was pushed globally in one step, and the whole service was unavailable for over an hour while engineers worked out how to reach servers that kept crashing on start-up." },
        { t: "p", text: "**Mechanism.** The configuration contained a value that triggered a bug only with production traffic patterns. Every server, in every region, ran the same code and loaded the same configuration, so redundancy offered no protection: the failure was correlated by design. Outages of this shape at large providers are why their post-incident reports keep recommending staged configuration rollouts." },
        { t: "p", text: "**Fix.** Configuration is now deployed like code: to one cell first, with automatic health checks and a bake time, then to progressively larger waves, with automatic rollback when error rates rise. The last known good configuration is kept on every server, so a crash loop falls back to it. A one-cell failure now costs a fraction of customers for a few minutes." }
      ] }
  ],

  takeaways: [
    "Replace systems with the **strangler fig**: a facade, one slice at a time, **shadow run**, then a sticky gradual cut-over.",
    "Shadow runs find what nobody wrote down: measured, a new pricing service differed on **28% of carts** — per-line versus per-total VAT rounding — with **zero customer impact**.",
    "The data is the hard part: one source of truth per piece of data at every step, CDC to sync, reconciliation until the end.",
    "**Expand–contract** changes schemas and APIs with old and new versions live; each step is deployable and reversible.",
    "Redundancy does not stop **correlated failures** — bad deploys, configuration, poison requests; **cells** bound them.",
    "Measured: a poison customer took down **100%** on one fleet, **25%** with four cells, **3.6%** with shuffle sharding (2 of 8 nodes).",
    "Deploy code **and configuration** to one cell first, with bake time and automatic rollback.",
    "Record significant decisions in **ADRs**: context, options, decision, consequences, and when to review — never edited, only superseded.",
    "Recognise the **anti-patterns**: distributed monolith, nano-services, shared database, chatty services, big-bang rewrite, golden hammer.",
    "**Data mesh** applies bounded contexts to analytics — for organisations large enough to have a central-team bottleneck."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What is the purpose of a shadow run in a strangler-fig migration?",
        options: ["To load-test the legacy system", "To send real requests to the new implementation as well, compare its answers with the legacy system's, and discard them — finding differences before any user is affected", "To route half the users to the new system", "To back up the legacy database"],
        answer: 1,
        why: "In shadow mode the legacy system still serves every response; the new one runs in parallel only so its results can be compared. The penny-rounding difference on 28% of carts was found this way with no customer impact. Routing users comes later, and it is neither a load test nor a backup." },

      { stem: "Why do schema changes need expand–contract during a rolling deploy?",
        options: ["Databases forbid renaming columns", "Two application versions run at once, so the schema must work for both until the old version is gone", "It is faster than ALTER TABLE", "It avoids needing backups"],
        answer: 1,
        why: "A rolling deploy means old and new code share the database for a while. Expanding first (both forms present and in sync) and contracting only after the old version is gone keeps both working. Databases can rename columns, but the old code would break; speed and backups are not the point." },

      { stem: "Each customer is assigned 2 random nodes out of 8. One customer's poison request crashes both of its nodes. Roughly what fraction of customers lose all their nodes?",
        options: ["100%", "25%", "About 3.6% — only those with the same pair, 1 of 28", "0%"],
        answer: 2,
        why: "There are 28 possible pairs, so about 1 in 28 customers share both nodes with the poison customer — 3.6% in the simulation. Others sharing one node are degraded but served by their second node. Fixed cells of two nodes would lose 25%; one shared fleet, everyone." },

      { stem: "What belongs in an architecture decision record?",
        options: ["The complete design document for the system", "The context, the options considered, the decision, its consequences and when to revisit it — for one decision", "Only the final decision, in one line", "Meeting minutes"],
        answer: 1,
        why: "An ADR is short and about one decision, and its value is the reasoning: why this option over the others, what it costs, and what would make it worth revisiting. A full design document is too broad, a one-line decision loses the why, and minutes record discussion rather than conclusions." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Migration questions reward caution and specifics.",
    questions: [
      { level: "advanced",
        q: "Explain the strangler fig pattern. How do you handle the data?",
        strong: "A strong answer covers the facade, slicing, shadow runs, gradual cut-over and a stepwise data plan with one source of truth.",
        answer: [
          { t: "p", text: "Put a facade — a gateway or proxy — in front of the legacy system so all traffic passes a point I control. Pick one slice with clear boundaries, ideally a bounded context, build it in the new system, run it in shadow mode comparing results with the legacy system, then move a sticky percentage of users across while watching errors and business metrics, and finally delete the legacy code for that slice. Repeat." },
          { t: "p", text: "For data: first the new service reads the legacy data, then keeps its own copy in sync through CDC, then becomes the writer with changes replicated back for legacy readers, and finally the legacy tables are retired. At each step one side is the source of truth for each record, and a reconciliation job proves the copies agree until the migration is finished." }
        ] },

      { level: "advanced",
        q: "What is a cell-based architecture and when would you use it?",
        strong: "A strong answer separates correlated from independent failures and mentions deployment practice and shuffle sharding.",
        answer: [
          { t: "p", text: "The system is divided into complete, independent copies — cells — each serving a subset of customers with its own compute and data, behind a thin router. It bounds the blast radius of failures that redundancy cannot stop because they hit every replica alike: bad deploys, bad configuration, poison requests, noisy tenants." },
          { t: "p", text: "I would use it at large scale or for strict availability requirements, deploying changes cell by cell with bake times and automatic rollback. Shuffle sharding refines it: each customer gets a random small set of nodes, so a poison customer only fully takes out the few who share its exact set. The costs are more infrastructure, cross-cell features such as global search, and keeping the router simple and very stable." }
        ] },

      { level: "core",
        q: "How do you document and evaluate architecture decisions?",
        strong: "A strong answer describes ADRs and connects decisions to automated checks.",
        answer: [
          { t: "p", text: "With architecture decision records: one short document per significant decision, numbered and stored with the code — context, options considered, decision, consequences and a review trigger. Accepted ADRs are never edited; a new one supersedes them, so the reasoning history survives." },
          { t: "p", text: "Where a decision implies a rule — module boundaries, latency budgets, no cycles, no shared tables — I turn it into a fitness function that runs in CI, so the decision is enforced rather than remembered. And I revisit ADRs when their review trigger fires, such as a traffic threshold." }
        ] }
    ]
  }
});
