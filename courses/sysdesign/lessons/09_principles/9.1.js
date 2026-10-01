/* ============================================================================
   LESSON 9.1 — SOLID
   ========================================================================= */
EC.receiveLesson({
  id: "9.1",

  lede: "Most of a system's cost is paid after it ships, in changes. The SOLID principles are five ways of keeping a change **local** — so that a request from one team touches one place, a new feature is added rather than edited in, a replacement part really does replace, and business rules do not break when a vendor or a database is swapped. Each is shown here the way it shows up in practice: as a **violation**, the **bug** that violation causes, and the **repair**. Every one of them reappears at system scale in the modules that follow.",

  objectives: [
    "Find the actors a class answers to, and split it so each change has one home",
    "Add behaviour through an extension point instead of editing a tested switch",
    "Write a contract test that catches a substitute with weaker guarantees",
    "Split a fat interface into the roles its clients actually use",
    "Invert a dependency so business policy can be tested with no network"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", id: "srp", text: "S — Single responsibility",
      sub: "One reason to change, which means one actor" },

    { t: "p", text: "\"A class should do one thing\" is the usual summary, and it is too vague to apply: everything does one thing at some level of abstraction. Robert C. Martin's sharper version is that a module should be responsible to **one actor** — one team, role or stakeholder whose requests change it. When two actors share a class, a change one of them asks for can silently move the other's numbers." },

    { t: "p", text: "Here finance owns pay, operations owns the legal working-time report, and both use a shared helper for the overtime threshold. Finance asks for overtime pay to start after 38 hours instead of 40; a developer changes the helper:" },

    { t: "code", lang: "python", title: "srp.py — a shared rule, changed for one department", code: `OVERTIME_AFTER = 40                            # one shared rule, used by two departments

class Employee:
    """Pay (finance's rules) and the hours report (operations' rules) in one class."""
    def __init__(self, name, hours, rate): self.name, self.hours, self.rate = name, hours, rate
    def _regular_hours(self): return min(self.hours, OVERTIME_AFTER)
    def calculate_pay(self):                   # finance
        overtime = self.hours - self._regular_hours()
        return self._regular_hours() * self.rate + overtime * self.rate * 1.5
    def report_hours(self):                    # operations: the legal working-time report
        return f"{self._regular_hours()} regular + {self.hours - self._regular_hours()} overtime"

def show(title, staff):
    print(title)
    for e in staff:
        print(f"  {e.name:<5} pay {e.calculate_pay():7.2f}   hours report: {e.report_hours()}")

staff = [Employee("Asha", 42, 20.0), Employee("Ben", 39, 22.0)]
show("before:", staff)
OVERTIME_AFTER = 38                            # finance: "overtime PAY now starts after 38 hours"
show("after finance's change:", staff)

class PayPolicy:                               # changed only when finance asks
    overtime_after = 38
    def pay(self, e):
        regular = min(e.hours, self.overtime_after)
        return regular * e.rate + (e.hours - regular) * e.rate * 1.5

class HoursReport:                             # changed only when operations (or the law) asks
    overtime_after = 40
    def line(self, e):
        regular = min(e.hours, self.overtime_after)
        return f"{regular} regular + {e.hours - regular} overtime"

print("split by actor:")
for e in staff:
    print(f"  {e.name:<5} pay {PayPolicy().pay(e):7.2f}   hours report: {HoursReport().line(e)}")`,
      hl: [6, 7, 10],
      out: `before:
  Asha  pay  860.00   hours report: 40 regular + 2 overtime
  Ben   pay  858.00   hours report: 39 regular + 0 overtime
after finance's change:
  Asha  pay  880.00   hours report: 38 regular + 4 overtime
  Ben   pay  869.00   hours report: 38 regular + 1 overtime
split by actor:
  Asha  pay  880.00   hours report: 40 regular + 2 overtime
  Ben   pay  869.00   hours report: 39 regular + 0 overtime` },

    { t: "p", text: "Pay changed, as finance asked. So did the hours report: Ben, who worked 39 hours, is now reported as having done an hour of overtime, which operations never asked for and which is wrong under the 40-hour rule they report against. Nothing failed; a compliance report is quietly incorrect. Split by actor, each rule has its own home, and the second run changes only pay." },

    { t: "viz", title: "One class serving three actors, and the split",
      caption: "Left: finance, operations and IT all change the same class, and two of its methods share a helper, so a change for one actor reaches another's output. Right: each actor's rules live in their own class around a plain data object; a change requested by one actor has exactly one place to go.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Single responsibility before and after">
  <defs><marker id="srp-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
  <text x="185" y="16" text-anchor="middle" class="s-label" style="fill:var(--crit)">Three actors, one class</text>
  <rect x="27" y="28" width="96" height="30" rx="7" class="s-fill" style="stroke:var(--accent)"/><text x="75" y="47" text-anchor="middle" class="s-label">Finance</text>
  <rect x="141" y="28" width="98" height="30" rx="7" class="s-fill" style="stroke:var(--violet)"/><text x="190" y="47" text-anchor="middle" class="s-label">Operations</text>
  <rect x="258" y="28" width="84" height="30" rx="7" class="s-fill" style="stroke:var(--teal)"/><text x="300" y="47" text-anchor="middle" class="s-label">IT / DBA</text>
  <rect x="16" y="88" width="336" height="146" rx="10" class="s-fill s-stroke" stroke-width="1.4"/>
  <text x="75" y="134" text-anchor="middle" class="s-mono" style="fill:var(--accent)">calculate_pay()</text>
  <text x="190" y="134" text-anchor="middle" class="s-mono" style="fill:var(--violet)">report_hours()</text>
  <text x="300" y="134" text-anchor="middle" class="s-mono" style="fill:var(--teal)">save()</text>
  <rect x="80" y="180" width="140" height="28" rx="6" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
  <text x="150" y="198" text-anchor="middle" class="s-mono" style="fill:var(--crit)">_regular_hours()</text>
  <text x="340" y="224" text-anchor="end" class="s-label">class Employee</text>
  <line x1="75" y1="58" x2="75" y2="118" style="stroke:var(--accent)" stroke-width="1.4" marker-end="url(#srp-a)"/>
  <line x1="190" y1="58" x2="190" y2="118" style="stroke:var(--violet)" stroke-width="1.4" marker-end="url(#srp-a)"/>
  <line x1="300" y1="58" x2="300" y2="118" style="stroke:var(--teal)" stroke-width="1.4" marker-end="url(#srp-a)"/>
  <line x1="88" y1="142" x2="124" y2="177" style="stroke:var(--crit);stroke-dasharray:4 3" stroke-width="1.3" marker-end="url(#srp-a)"/>
  <line x1="180" y1="142" x2="168" y2="177" style="stroke:var(--crit);stroke-dasharray:4 3" stroke-width="1.3" marker-end="url(#srp-a)"/>
  <text x="236" y="168" class="s-sub" style="fill:var(--crit)">shared: one change</text>
  <text x="236" y="182" class="s-sub" style="fill:var(--crit)">moves both outputs</text>
  <line x1="380" y1="20" x2="380" y2="236" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <text x="575" y="16" text-anchor="middle" class="s-label" style="fill:var(--good)">One actor per class</text>
  <rect x="404" y="28" width="104" height="30" rx="7" class="s-fill" style="stroke:var(--accent)"/><text x="456" y="47" text-anchor="middle" class="s-label">Finance</text>
  <rect x="524" y="28" width="104" height="30" rx="7" class="s-fill" style="stroke:var(--violet)"/><text x="576" y="47" text-anchor="middle" class="s-label">Operations</text>
  <rect x="644" y="28" width="104" height="30" rx="7" class="s-fill" style="stroke:var(--teal)"/><text x="696" y="47" text-anchor="middle" class="s-label">IT / DBA</text>
  <rect x="404" y="96" width="104" height="44" rx="8" class="s-fill" style="stroke:var(--accent)"/><text x="456" y="116" text-anchor="middle" class="s-mono">PayPolicy</text><text x="456" y="131" text-anchor="middle" class="s-sub">after 38 h</text>
  <rect x="524" y="96" width="104" height="44" rx="8" class="s-fill" style="stroke:var(--violet)"/><text x="576" y="116" text-anchor="middle" class="s-mono">HoursReport</text><text x="576" y="131" text-anchor="middle" class="s-sub">after 40 h</text>
  <rect x="644" y="96" width="104" height="44" rx="8" class="s-fill" style="stroke:var(--teal)"/><text x="696" y="116" text-anchor="middle" class="s-mono">Repository</text><text x="696" y="131" text-anchor="middle" class="s-sub">save, load</text>
  <line x1="456" y1="58" x2="456" y2="94" style="stroke:var(--accent)" stroke-width="1.4" marker-end="url(#srp-a)"/>
  <line x1="576" y1="58" x2="576" y2="94" style="stroke:var(--violet)" stroke-width="1.4" marker-end="url(#srp-a)"/>
  <line x1="696" y1="58" x2="696" y2="94" style="stroke:var(--teal)" stroke-width="1.4" marker-end="url(#srp-a)"/>
  <rect x="496" y="182" width="160" height="36" rx="8" class="s-fill s-stroke"/><text x="576" y="205" text-anchor="middle" class="s-mono">Employee (data)</text>
  <line x1="456" y1="140" x2="520" y2="180" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#srp-a)"/>
  <line x1="576" y1="140" x2="576" y2="180" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#srp-a)"/>
  <line x1="696" y1="140" x2="632" y2="180" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#srp-a)"/>
</svg>` },

    { t: "callout", kind: "insight", title: "The same principle, one level up",
      body: [
        { t: "p", text: "A service owned by three teams has the same problem as a class owned by three departments: every deploy needs three sign-offs, and one team's change breaks another's feature. Drawing service boundaries around the team or business capability that changes them — Conway's law used on purpose — is SRP at architecture scale, and the starting point of domain-driven design in 10.2." }
      ] },

    { t: "h2", n: "02", id: "ocp", text: "O — Open for extension, closed for modification",
      sub: "Add the new case; do not edit the old ones" },

    { t: "p", text: "A function with an `if`/`elif` chain over types — payment methods, carriers, notification channels — must be edited for every new type. Each edit risks the existing branches, all of which must be retested, and the file becomes a merge conflict for every team adding a type. The repair is an **extension point**: the stable code looks up behaviour in a registry, and a new type registers itself." },

    { t: "code", lang: "python", title: "ocp.py — carriers register themselves; the pricing function never changes", code: `CARRIERS = {}                                  # the extension point: a registry of pricing rules

def carrier(name):
    def register(fn): CARRIERS[name] = fn; return fn
    return register

def shipping_cost(carrier_name, kg):           # closed: never edited to add a carrier
    try: return CARRIERS[carrier_name](kg)
    except KeyError: raise ValueError(f"unknown carrier {carrier_name!r}") from None

@carrier("post")
def post(kg): return 3.50 + 1.20 * kg

@carrier("courier")
def courier(kg): return 9.00 + 0.80 * kg

# --- months later, in a new file: a drone carrier, added without touching anything above ---
@carrier("drone")
def drone(kg):
    if kg > 2: raise ValueError("drones carry at most 2 kg")
    return 6.00

for name, kg in (("post", 1.5), ("courier", 1.5), ("drone", 1.5), ("drone", 3), ("pigeon", 1)):
    try: print(f"{name:<8} {kg:>4} kg  ->  {shipping_cost(name, kg):6.2f}")
    except ValueError as e: print(f"{name:<8} {kg:>4} kg  ->  refused: {e}")`,
      hl: [1, 3, 4, 7, 8],
      out: `post      1.5 kg  ->    5.30
courier   1.5 kg  ->   10.20
drone     1.5 kg  ->    6.00
drone       3 kg  ->  refused: drones carry at most 2 kg
pigeon      1 kg  ->  refused: unknown carrier 'pigeon'` },

    { t: "diagram", kind: "compare", title: "Edit the switch, or register an extension",
      caption: "Closed for modification does not mean the code never changes; it means the common change — another carrier, another channel — does not require editing code that already works. Choose the extension point for the axis that actually changes.",
      columns: [
        { title: "Modify: a growing switch", tone: "crit", items: ["every new type edits shared code", "every edit risks the old branches", "all branches retested every time", "one file, many teams, many conflicts"] },
        { title: "Extend: a registry or strategy", tone: "good", items: ["a new type is new code only", "tested branches are untouched", "the new type is tested alone", "teams add types independently"] }
      ] },

    { t: "callout", kind: "trap", title: "Closed against the wrong change",
      body: [
        { t: "p", text: "An extension point is a bet on which way the code will change. Carriers vary here, so pricing is open to new carriers — but if the next request is \"every carrier now charges by volume, not weight\", every registered function must change, and the abstraction is in the way. Do not build extension points for imagined variation (9.2's YAGNI); build them the second or third time the same kind of change arrives." }
      ] },

    { t: "h2", n: "03", id: "lsp", text: "L — Liskov substitution",
      sub: "A substitute must keep the promises, not just the method names" },

    { t: "p", text: "Barbara Liskov's principle says that code written against a type must keep working when handed any subtype. The textbook case is a `Square` subclass of `Rectangle` whose width setter also changes the height, so a function that doubles a rectangle's width gets an area of 36 from a 3 × 3 square, not the 18 it expected. The case that costs real money is subtler: **a replacement with the same methods and weaker guarantees**." },

    { t: "p", text: "A `Store` promises read-your-writes. Code is written and tested against an in-memory store. Later, for scale, someone substitutes a replicated store with exactly the same `put` and `get` — but reads now go to a replica that lags behind:" },

    { t: "code", lang: "python", title: "lsp.py — same methods, weaker promise, and a contract test that notices", code: `import random

class Store:
    """Contract: once put(key, value) returns, get(key) returns value (read-your-writes)."""
    def put(self, key, value): raise NotImplementedError
    def get(self, key): raise NotImplementedError

class MemoryStore(Store):
    def __init__(self, initial=None): self.data = dict(initial or {})
    def put(self, key, value): self.data[key] = value
    def get(self, key): return self.data.get(key)

class ReplicatedStore(Store):
    """Same methods, weaker promise: writes go to a primary, reads to a lagging replica."""
    def __init__(self, initial=None, seed=1):
        self.primary, self.replica = dict(initial or {}), dict(initial or {})
        self.backlog, self.rng = [], random.Random(seed)
    def put(self, key, value):
        self.primary[key] = value; self.backlog.append((key, value))
    def get(self, key):
        for _ in range(self.rng.randint(0, 2)):        # the replica catches up a little at a time
            if self.backlog: k, v = self.backlog.pop(0); self.replica[k] = v
        return self.replica.get(key)

class ReadYourWritesStore(ReplicatedStore):
    """The repair: remember this client's own writes and read those from the primary (5.3)."""
    def __init__(self, initial=None, seed=1): super().__init__(initial, seed); self.mine = set()
    def put(self, key, value): super().put(key, value); self.mine.add(key)
    def get(self, key):
        value = super().get(key)
        return self.primary[key] if key in self.mine else value

def rename(store, user, name):                         # written, and tested, against MemoryStore
    store.put(f"user:{user}", name)
    return f"Saved. Hello, {store.get(f'user:{user}')}!"

def contract_test(store, n=1000):
    """Every Store must pass this: it checks the behaviour callers rely on, not just the methods."""
    stale = 0
    for i in range(n):
        store.put(f"k{i % 50}", i)
        stale += store.get(f"k{i % 50}") != i
    return stale

for make in (MemoryStore, ReplicatedStore, ReadYourWritesStore):
    greeting = rename(make({"user:7": "Al"}), 7, "Bo")
    print(f"{make.__name__:<20} rename -> {greeting!r:<22} contract test: {contract_test(make()):>3} of 1000 reads stale")`,
      hl: [4, 20, 21, 22, 23, 29, 30, 31],
      out: `MemoryStore          rename -> 'Saved. Hello, Bo!'    contract test:   0 of 1000 reads stale
ReplicatedStore      rename -> 'Saved. Hello, Al!'    contract test: 904 of 1000 reads stale
ReadYourWritesStore  rename -> 'Saved. Hello, Bo!'    contract test:   0 of 1000 reads stale` },

    { t: "viz", title: "The substitute that broke a promise",
      caption: "Left: the replicated store accepts the write on the primary but serves the read from a replica that has not received it, so the user who just renamed themselves sees their old name. The interface is identical, so no type checker objects. Right: the repair keeps the contract by reading a client's own recent writes from the primary — the read-your-writes session guarantee of 5.3.",
      svg: `<svg viewBox="0 0 760 233" width="100%" role="img"><defs><marker id="q539022accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q539022good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q539022warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q539022crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q539022violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q539022teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q539022line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">ReplicatedStore: breaks the contract</text>
<rect x="6.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="62.0" y="54" text-anchor="middle" class="s-label">Caller</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Primary</text>
<rect x="252.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="308.0" y="54" text-anchor="middle" class="s-label">Replica</text>
<line x1="62.0" y1="64" x2="62.0" y2="221.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="221.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="308.0" y1="64" x2="308.0" y2="221.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="62.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q539022accent)"/>
<text x="123.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">put(user:7, Bo)</text>
<line x1="185.0" y1="112" x2="66.0" y2="112" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q539022good)"/>
<text x="123.5" y="106" text-anchor="middle" class="s-sub" style="fill:var(--good)">(ok)</text>
<line x1="62.0" y1="142" x2="304.0" y2="142" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q539022accent)"/>
<text x="185.0" y="136" text-anchor="middle" class="s-sub" style="fill:var(--accent)">get(user:7)</text>
<line x1="308.0" y1="172" x2="66.0" y2="172" style="stroke:var(--crit);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q539022crit)"/>
<text x="185.0" y="166" text-anchor="middle" class="s-sub" style="fill:var(--crit)">("Al": stale)</text>
<line x1="185.0" y1="202" x2="304.0" y2="202" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q539022violet)"/>
<text x="246.5" y="196" text-anchor="middle" class="s-sub" style="fill:var(--violet)">(Bo arrives, too late)</text><line x1="380.0" y1="10" x2="380.0" y2="223" style="stroke:var(--line);stroke-dasharray:4 4"/><g transform="translate(390.0,0)"><defs><marker id="r940698accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="r940698good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="r940698warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="r940698crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="r940698violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="r940698teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="r940698line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">ReadYourWritesStore: honours it</text>
<rect x="6.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="62.0" y="54" text-anchor="middle" class="s-label">Caller</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Primary</text>
<rect x="252.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="308.0" y="54" text-anchor="middle" class="s-label">Replica</text>
<line x1="62.0" y1="64" x2="62.0" y2="221.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="221.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="308.0" y1="64" x2="308.0" y2="221.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="62.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#r940698accent)"/>
<text x="123.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">put(user:7, Bo)</text>
<line x1="185.0" y1="112" x2="66.0" y2="112" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#r940698good)"/>
<text x="123.5" y="106" text-anchor="middle" class="s-sub" style="fill:var(--good)">(ok)</text>
<rect x="10.600000000000001" y="130" width="102.8" height="20" rx="5" style="fill:var(--teal);fill-opacity:.16;stroke:var(--teal)"/>
<text x="62.0" y="144" text-anchor="middle" class="s-sub" style="fill:var(--ink)">user:7 is mine</text>
<line x1="62.0" y1="172" x2="181.0" y2="172" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#r940698accent)"/>
<text x="123.5" y="166" text-anchor="middle" class="s-sub" style="fill:var(--accent)">get(user:7)</text>
<line x1="185.0" y1="202" x2="66.0" y2="202" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#r940698good)"/>
<text x="123.5" y="196" text-anchor="middle" class="s-sub" style="fill:var(--good)">("Bo")</text></g></svg>` },

    { t: "callout", kind: "trap", title: "Signatures do not encode behaviour",
      body: [
        { t: "p", text: "Types check that methods exist and accept the right arguments. They cannot check that a write is visible to the next read, that `close()` is safe to call twice, that an iterator returns items in order, or that a method does not raise for inputs the base type accepts. Those promises are the contract, and the way to enforce them is a **contract test**: one suite, written against the interface, run against every implementation. Swapping a database, a cache or a queue is an LSP question — 5.3's consistency models are the vocabulary for the promises." }
      ] },

    { t: "h2", n: "04", id: "isp", text: "I — Interface segregation",
      sub: "Clients should not depend on methods they do not use" },

    { t: "p", text: "A single wide interface — a repository with reads, writes, schema migration and backup — forces every client to depend on all of it and every implementer to provide all of it. Clients that only read are coupled to changes in the admin methods. Worse, an implementation that cannot support part of the interface, such as a read replica, must stub those methods to raise — which is precisely an LSP violation waiting for a caller." },

    { t: "diagram", kind: "matrix", title: "Who uses which part of one wide repository interface",
      caption: "Each client uses a small cluster of methods, and the read replica can only honestly implement two of six. The clusters are the interfaces to extract: a Reader (get, search), a Writer (put, delete), and Admin (migrate, backup). The checkout depends on Reader and Writer, the report job on Reader alone, and the replica implements Reader without lying.",
      cols: ["get", "search", "put", "delete", "migrate", "backup"],
      rows: ["Checkout", "Search page", "Nightly report", "Admin console", "Read replica (implements)"],
      cells: [
        [true, null, true, null, null, null],
        [true, true, null, null, null, null],
        [null, true, null, null, null, null],
        [null, null, null, true, true, true],
        [true, true, { text: "stub: raises", tone: "crit" }, { text: "stub: raises", tone: "crit" }, { text: "stub: raises", tone: "crit" }, { text: "stub: raises", tone: "crit" }]
      ] },

    { t: "p", text: "In Python, `typing.Protocol` makes role interfaces cheap: a function that only reads declares a parameter of type `Reader`, and anything with `get` and `search` satisfies it, with no inheritance. At system scale this is the argument for narrow APIs per consumer — a backend-for-frontend per client type, or separate read and write models in CQRS (10.4)." },

    { t: "h2", n: "05", id: "dip", text: "D — Dependency inversion",
      sub: "Policy should not depend on detail" },

    { t: "p", text: "When an order service constructs a vendor's payment client inside itself, the most important code in the company depends on the least stable — an SDK, an HTTP API, a vendor contract — and cannot be tested without them. Dependency inversion flips the arrow: the **domain defines the interface it needs** (a port), and the vendor-specific **adapter implements it**. The business policy depends on nothing but its own abstraction, and everything concrete is passed in." },

    { t: "viz", title: "Which way the arrow points",
      caption: "Before: the order service imports and constructs the vendor client, so it depends on the vendor. After: the domain owns the PaymentGateway interface; the Stripe adapter and the test fake both depend on it. The source-code dependency now points from the detail into the policy — the inversion — while calls at run time still flow from the service to the vendor.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="Dependency inversion">
  <defs><marker id="dip-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-2)"/></marker></defs>
  <text x="170" y="18" text-anchor="middle" class="s-label" style="fill:var(--crit)">Before: policy depends on detail</text>
  <rect x="90" y="44" width="160" height="46" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="170" y="64" text-anchor="middle" class="s-mono">OrderService</text><text x="170" y="80" text-anchor="middle" class="s-sub">business rules</text>
  <rect x="90" y="150" width="160" height="46" rx="9" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="170" y="170" text-anchor="middle" class="s-mono">stripe.PaymentIntent</text><text x="170" y="186" text-anchor="middle" class="s-sub">vendor SDK, HTTP</text>
  <line x1="170" y1="90" x2="170" y2="147" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#dip-a)"/>
  <text x="180" y="124" class="s-sub">imports, constructs</text>
  <text x="170" y="222" text-anchor="middle" class="s-sub">tests need the network; a timeout cannot be staged</text>
  <line x1="350" y1="24" x2="350" y2="226" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <text x="560" y="18" text-anchor="middle" class="s-label" style="fill:var(--good)">After: detail depends on policy</text>
  <rect x="380" y="30" width="360" height="118" rx="12" style="fill:var(--accent);fill-opacity:.05;stroke:var(--accent);stroke-dasharray:5 4"/>
  <text x="392" y="46" class="s-sub" style="fill:var(--accent)">domain</text>
  <rect x="400" y="54" width="150" height="40" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="475" y="78" text-anchor="middle" class="s-mono">OrderService</text>
  <rect x="580" y="96" width="150" height="40" rx="9" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="655" y="114" text-anchor="middle" class="s-mono">PaymentGateway</text><text x="655" y="129" text-anchor="middle" class="s-sub">interface (port)</text>
  <line x1="550" y1="80" x2="578" y2="106" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#dip-a)"/>
  <rect x="440" y="176" width="140" height="40" rx="9" class="s-fill" style="stroke:var(--teal)" stroke-width="1.5"/>
  <text x="510" y="194" text-anchor="middle" class="s-mono">StripeGateway</text><text x="510" y="209" text-anchor="middle" class="s-sub">adapter</text>
  <rect x="600" y="176" width="140" height="40" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="670" y="194" text-anchor="middle" class="s-mono">FakeGateway</text><text x="670" y="209" text-anchor="middle" class="s-sub">tests</text>
  <line x1="530" y1="176" x2="624" y2="139" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#dip-a)"/>
  <line x1="670" y1="176" x2="662" y2="139" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#dip-a)"/>
  <text x="560" y="232" text-anchor="middle" class="s-sub">implements: the arrows point into the domain</text>
</svg>` },

    { t: "code", lang: "python", title: "dip.py — the policy, a port, an adapter, and tests that need no vendor", code: `import time
from typing import Protocol

class PaymentGateway(Protocol):                # the port: defined by, and owned by, the domain
    def charge(self, customer: str, cents: int, idempotency_key: str) -> str: ...

class OrderService:                            # business policy: knows no vendor, no HTTP
    def __init__(self, gateway: PaymentGateway):
        self.gateway, self.state = gateway, {}
    def place(self, order_id, customer, cents):
        if self.state.get(order_id) == "paid": return "already paid"
        try:
            ref = self.gateway.charge(customer, cents, idempotency_key=order_id)
        except TimeoutError:                   # did the charge happen? unknown: never mark it paid
            self.state[order_id] = "unknown"; return "pending: reconcile later"
        self.state[order_id] = "paid"; return f"paid ({ref})"

class StripeGateway:                           # an adapter: the only code that knows the vendor
    def __init__(self, client): self.client = client
    def charge(self, customer, cents, idempotency_key):
        return self.client.PaymentIntent.create(customer=customer, amount=cents, currency="usd",
                                                idempotency_key=idempotency_key).id

class FakeGateway:                             # for tests: records calls, fails on demand
    def __init__(self, fail=None): self.calls, self.fail = [], fail
    def charge(self, customer, cents, idempotency_key):
        self.calls.append(idempotency_key)
        if self.fail: raise self.fail
        return f"ch_{len(self.calls)}"

def test_double_click_charges_once():
    gw = FakeGateway(); svc = OrderService(gw)
    svc.place("o1", "cus_9", 4200); svc.place("o1", "cus_9", 4200)
    assert gw.calls == ["o1"]

def test_timeout_is_not_recorded_as_paid():
    svc = OrderService(FakeGateway(fail=TimeoutError()))
    assert svc.place("o2", "cus_9", 4200) == "pending: reconcile later"
    assert svc.state["o2"] == "unknown"

def test_key_is_the_order_id():
    gw = FakeGateway(); OrderService(gw).place("o3", "cus_9", 100)
    assert gw.calls == ["o3"]

start = time.perf_counter()
for test in (test_double_click_charges_once, test_timeout_is_not_recorded_as_paid, test_key_is_the_order_id):
    test(); print(f"  ok  {test.__name__}")
print(f"3 tests in {(time.perf_counter() - start) * 1000:.2f} ms: no network, no vendor sandbox, timeouts on demand")`,
      hl: [4, 5, 8, 9, 13],
      out: `  ok  test_double_click_charges_once
  ok  test_timeout_is_not_recorded_as_paid
  ok  test_key_is_the_order_id
3 tests in 0.06 ms: no network, no vendor sandbox, timeouts on demand` },

    { t: "p", text: "The three tests ran in a fraction of a millisecond, and the most important one — a timeout must not be recorded as a successful payment, the ambiguity of 7.2 — is a single line to stage with a fake, and nearly impossible to stage against a real vendor on demand. The Stripe adapter is small and dumb on purpose; it is tested separately, against the vendor's sandbox, with a contract test like 03's." },

    { t: "callout", kind: "insight", title: "Hexagonal architecture is DIP for a whole service",
      body: [
        { t: "p", text: "Apply the same move to every edge of a service — database, message broker, HTTP framework, vendor APIs — and you get ports and adapters (10.3): a domain core with no imports from infrastructure, surrounded by adapters that can be swapped, faked or migrated one at a time." }
      ] },

    { t: "diagram", kind: "matrix", title: "SOLID at a glance, and at system scale",
      cols: ["Smell in code", "Repair", "The same idea at scale"],
      rows: ["Single responsibility", "Open/closed", "Liskov substitution", "Interface segregation", "Dependency inversion"],
      cells: [
        [{ text: "one class, many teams", tone: "crit" }, { text: "split by actor", tone: "good" }, { text: "service per team or capability" }],
        [{ text: "a growing if/elif on type", tone: "crit" }, { text: "registry or strategy", tone: "good" }, { text: "plugins, webhooks, consumers" }],
        [{ text: "subclass weakens a promise", tone: "crit" }, { text: "contract tests", tone: "good" }, { text: "swapping in a weaker store" }],
        [{ text: "stubs that raise", tone: "crit" }, { text: "role interfaces", tone: "good" }, { text: "an API per consumer, CQRS" }],
        [{ text: "vendor client built inside the logic", tone: "crit" }, { text: "inject a port", tone: "good" }, { text: "hexagonal architecture" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "SOLID is a means, not a score",
      body: [
        { t: "p", text: "Applied to everything, the principles produce an interface per class, a factory per interface and a call chain nobody can follow. Each one has a price — indirection — and pays for itself only where the change it protects against actually happens: many actors, many types, many implementations, slow or flaky dependencies. 9.2's KISS and YAGNI are the counterweight." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Refactor a notification sender",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "This function has been edited by four teams and cannot be tested without an SMTP server and an SMS provider:" },
        { t: "code", lang: "python", title: "notify_before.py", code: `def notify(user, msg):
    for channel in user["prefers"]:
        if channel == "email":
            smtp = smtplib.SMTP("mail.internal", 25)
            smtp.sendmail("noreply@shop", user["email"], f"Subject: {msg['title']}\\n\\n{msg['body']}")
        elif channel == "sms":
            twilio.Client(SID, TOKEN).messages.create(to=user["phone"], body=msg["title"][:160])
        elif channel == "push":
            ...                                  # the next team will add another elif here` },
        { t: "p", text: "Refactor it so that adding a channel touches no existing code, each channel's formatting lives in one class, and the whole thing can be tested with fakes." }
      ],
      requirements: [
        "A Transport protocol with send(to, text) that the notifier depends on",
        "A registry so each channel registers itself (open/closed)",
        "One class per channel that only knows that channel's message shape",
        "Add a push channel without editing the notifier",
        "A test with fake transports that asserts what was sent"
      ],
      hint: "The decorator registry from ocp.py and the injected gateway from dip.py combine directly: register channel classes, and give each one its transport when the notifier is built.",
      solution: { lang: "python", title: "notify_ex.py",
        code: `from typing import Protocol

class Transport(Protocol):                     # DIP: the notifier depends on this, not on SMTP or Twilio
    def send(self, to: str, text: str) -> None: ...

CHANNELS = {}                                  # OCP: channels register themselves
def channel(name):
    def register(cls): CHANNELS[name] = cls; return cls
    return register

@channel("email")
class Email:                                   # SRP: knows only how an email is shaped
    def __init__(self, transport): self.transport = transport
    def deliver(self, user, msg): self.transport.send(user["email"], f"Subject: {msg['title']}\\n\\n{msg['body']}")

@channel("sms")
class Sms:
    def __init__(self, transport): self.transport = transport
    def deliver(self, user, msg): self.transport.send(user["phone"], msg["title"][:160])

class Notifier:                                # never edited when a channel is added
    def __init__(self, transports):
        self.channels = {name: CHANNELS[name](t) for name, t in transports.items()}
    def notify(self, user, msg):
        sent = [c for c in user["prefers"] if c in self.channels]
        for c in sent: self.channels[c].deliver(user, msg)
        return sent

# --- a new channel, added in its own module: no existing line changes ---
@channel("push")
class Push:
    def __init__(self, transport): self.transport = transport
    def deliver(self, user, msg): self.transport.send(user["device"], msg["title"])

class Recorder:                                # a fake transport for tests and this demo
    def __init__(self, name): self.name, self.sent = name, []
    def send(self, to, text):
        self.sent.append((to, text)); print(f"  [{self.name:<5}] {to:<18} {text.splitlines()[0]}")

fakes = {name: Recorder(name) for name in ("email", "sms", "push")}
notifier = Notifier(fakes)
asha = {"email": "asha@example.com", "phone": "+44 7700 900123", "device": "device-81", "prefers": ["push", "email"]}
ben = {"email": "ben@example.com", "phone": "+44 7700 900456", "device": "device-12", "prefers": ["sms", "fax"]}
for user in (asha, ben):
    print("sent via", notifier.notify(user, {"title": "Your order shipped", "body": "Order 1042 is on its way."}))
assert fakes["sms"].sent == [("+44 7700 900456", "Your order shipped")]
print("test passed: no SMTP server, no SMS provider")`,
        out: `  [push ] device-81          Your order shipped
  [email] asha@example.com   Subject: Your order shipped
sent via ['push', 'email']
  [sms  ] +44 7700 900456    Your order shipped
sent via ['sms']
test passed: no SMTP server, no SMS provider`,
        notes: [
          { t: "p", text: "Push was added below the Notifier, in what would be its own module, without changing a line above it; a channel the notifier has no transport for, such as Ben's fax, is skipped rather than crashing. The test runs without a mail server or an SMS account because the transports are injected." },
          { t: "p", text: "Three principles did the work: open/closed through the registry, single responsibility in the per-channel classes, dependency inversion through the Transport protocol. This is also the skeleton of the notification service in 15.5, where each channel becomes a queue and a worker pool." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a rounding helper that changed 40,000 invoices",
      body: [
        { t: "p", text: "**Symptom.** After a routine release, finance found that about 40,000 invoices issued that week were a cent off their order totals. The release had contained no billing changes — only a reporting-team ticket to \"show prices rounded consistently on dashboards\"." },
        { t: "p", text: "**Mechanism.** Billing and reporting both called a shared `format_money()` helper. Billing used its return value as the amount to charge; reporting used it for display. The reporting team changed it to round half-up for display, which was correct for them and changed the rounding of every charged amount. Two actors, one function: the single-responsibility violation of srp.py, with money on the line." },
        { t: "p", text: "**Fix.** Billing got its own money type with the rounding rule its regulators require, and display formatting moved into the reporting code. A contract test pinned billing's rounding behaviour, and the affected invoices were corrected with credit notes. The review checklist gained a question: who else calls the code this change touches, and do they want it to change?" }
      ] }
  ],

  takeaways: [
    "**Single responsibility** means one **actor**: a class that answers to finance and operations lets a change for one break the other — measured, finance's 38-hour change silently altered the operations hours report.",
    "**Open/closed**: add new cases through an **extension point** — a registry or strategy — so that adding a carrier or channel edits no tested code.",
    "Build an extension point for the axis that **actually varies**, after the second or third change of that kind, not for imagined ones.",
    "**Liskov substitution** is about **behaviour**: a replicated store with identical methods made **904 of 1,000** reads stale and showed a renamed user their old name.",
    "**Contract tests** — one suite run against every implementation — catch weaker substitutes that type checkers cannot.",
    "**Interface segregation**: split a wide interface into the **roles** clients use; stubs that raise are the warning sign, and they are LSP violations waiting to happen.",
    "**Dependency inversion**: the domain owns the **port**, adapters implement it, and business policy can be tested — including timeouts — with no network.",
    "Each principle reappears at scale: services per team, plugins and webhooks, consistency contracts, APIs per consumer, **hexagonal architecture**.",
    "Every principle costs indirection; apply it where the change it protects against actually happens."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Finance asks for a change to overtime pay. Afterwards, the operations team's legal hours report is wrong. Which principle was violated, and what is the repair?",
        options: ["Open/closed: add a new overtime class instead of editing", "Single responsibility: two actors shared one class and helper; give each actor's rules their own home", "Liskov: the subclass broke the base contract", "Dependency inversion: inject the overtime threshold from configuration"],
        answer: 1,
        why: "The bug came from two actors — finance and operations — depending on one rule in one class, so a change for one moved the other's output. Splitting by actor is the repair. There is no subclass (not Liskov), configuration would still be shared by both actors, and an extension point does not separate owners." },

      { stem: "A team replaces an in-memory store with a replicated one that has exactly the same methods. Users start seeing their old profile name right after saving. What would have caught this before production?",
        options: ["A type checker", "A contract test written against the Store interface and run against every implementation", "Making the replicated store a subclass of the in-memory store", "Adding more unit tests for the in-memory store"],
        answer: 1,
        why: "The promise broken — read-your-writes — is behaviour, not a signature, so a type checker passes it. A contract test states the behaviour and runs against each implementation. Subclassing changes nothing about the replica's behaviour, and more tests of the old store never exercise the new one." },

      { stem: "A read-replica class implements a repository interface and raises NotImplementedError from put, delete, migrate and backup. Which principle is the root cause?",
        options: ["Interface segregation: the interface is wider than what this implementation (and most clients) need", "Single responsibility: the replica does too much", "Open/closed: the interface should be extended", "Dependency inversion: the replica depends on a concrete class"],
        answer: 0,
        why: "The replica is forced to implement methods it cannot support because one wide interface bundles several roles. Splitting it into Reader, Writer and Admin lets the replica implement only Reader. The stubs are also Liskov violations, but they are a symptom of the fat interface, not the root cause." },

      { stem: "In dependency inversion, what exactly is inverted?",
        options: ["The order of calls at run time: the vendor now calls the service", "The direction of the source-code dependency: the adapter depends on an interface owned by the domain, instead of the domain depending on the vendor", "The inheritance hierarchy is reversed", "The database now depends on the application schema"],
        answer: 1,
        why: "At run time the service still calls the vendor through the adapter. What changes is which code knows about which: the domain defines the port, and the vendor-specific adapter imports it. Nothing is inherited in reverse, and the database is unaffected." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Interviewers want the bug each principle prevents, not the acronym.",
    questions: [
      { level: "core",
        q: "Explain the SOLID principles with an example of each.",
        strong: "A strong answer gives, for each principle, a concrete violation and the problem it causes — not just a definition.",
        answer: [
          { t: "p", text: "Single responsibility: a module answers to one actor — a class shared by finance and operations lets a pay change break a compliance report. Open/closed: new cases are added through an extension point, like a carrier registry, instead of editing a growing switch. Liskov: substitutes must keep the contract's behaviour — a replicated store with the same methods but stale reads breaks callers that relied on read-your-writes." },
          { t: "p", text: "Interface segregation: clients depend on small role interfaces — a read replica should implement Reader, not stub out Writer. Dependency inversion: the domain owns the interfaces it needs and infrastructure implements them, so business rules are testable without a vendor and the vendor can be swapped." }
        ] },

      { level: "core",
        q: "How does dependency injection relate to dependency inversion, and why does it matter for testing?",
        strong: "A strong answer separates the principle from the technique and names a test that is impossible without it.",
        answer: [
          { t: "p", text: "Dependency inversion is the design principle — depend on abstractions owned by the policy, not on concrete details. Dependency injection is the technique that makes it work at run time: the concrete implementation is passed in, through a constructor or a container, rather than constructed inside." },
          { t: "p", text: "For testing it means I can pass a fake. That makes failure paths testable: I can make the payment gateway time out on demand and assert the order is marked unknown, not paid — which is hard to provoke against a real provider. The real adapter gets its own contract tests against the vendor's sandbox." }
        ] },

      { level: "advanced",
        q: "Where do you see SOLID principles at the level of system architecture?",
        strong: "A strong answer maps each principle to an architectural decision and knows when it is over-applied.",
        answer: [
          { t: "p", text: "Service boundaries drawn around the team or capability that changes them are single responsibility. Event-driven consumers and webhooks are open/closed — a new consumer subscribes without the producer changing. Replacing a datastore is a Liskov question about consistency guarantees, and per-consumer APIs or CQRS read models are interface segregation. Ports and adapters is dependency inversion for a whole service." },
          { t: "p", text: "The same caution applies at scale: microservices split along imagined axes, or an abstraction layer over a database you will never replace, cost latency and operational load for flexibility nobody uses. I apply them where the change they protect against has actually happened or is clearly coming." }
        ] }
    ]
  }
});
