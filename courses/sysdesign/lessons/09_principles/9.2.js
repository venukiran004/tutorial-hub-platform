/* ============================================================================
   LESSON 9.2 — DRY, KISS, YAGNI, Coupling and Cohesion
   ========================================================================= */
EC.receiveLesson({
  id: "9.2",

  lede: "SOLID says how to arrange the parts. A second set of heuristics says how much to build and how tightly to tie it together: **DRY** (one home for each piece of knowledge), **KISS** and **YAGNI** (no machinery before it is needed), **low coupling and high cohesion** (changes stay inside one module), **composition over inheritance**, and **fail fast**. Each is easy to state and easy to misapply — DRY applied to text instead of knowledge creates the very coupling the others warn against. This lesson shows each one's payoff and the way it misleads, with the numbers to tell them apart.",

  objectives: [
    "Tell duplicated knowledge from look-alike code, and avoid the wrong abstraction",
    "Weigh a speculative feature against YAGNI's costs of build, delay, carry and repair",
    "Measure coupling as the blast radius of a change, and reduce it",
    "Assemble behaviour by composition and explain why wrapper order matters",
    "Validate configuration at start-up so a bad deploy stops itself"
  ],

  prerequisites: ["9.1"],

  blocks: [

    { t: "h2", n: "01", id: "dry", text: "DRY: one home for each piece of knowledge",
      sub: "About knowledge, not about text" },

    { t: "p", text: "*The Pragmatic Programmer*'s definition is precise: every piece of **knowledge** must have a single, unambiguous, authoritative representation. It is not \"never type the same characters twice\". The two readings give opposite advice, and both mistakes are common:" },

    { t: "code", lang: "python", title: "dry.py — duplicated knowledge, and a merged look-alike", code: `# 1. One piece of KNOWLEDGE written twice: the VAT rate
billing  = {"vat": 0.20}                       # the billing service's copy
checkout = {"vat": 0.20}                       # checkout's copy of the same fact
def total(net, cfg): return round(net * (1 + cfg["vat"]), 2)

billing["vat"] = 0.175                         # the rate changes; one team updates its copy
print("knowledge duplicated, one copy updated:")
print(f"  receipt shown at checkout: {total(80, checkout):.2f}   invoice from billing: {total(80, billing):.2f}")

# 2. Two DIFFERENT rules that happen to look alike, merged into one helper
LENGTH = (3, 20)
def valid_length(s): return LENGTH[0] <= len(s) <= LENGTH[1]
validate_username = validate_product_name = valid_length      # "don't repeat yourself"

LENGTH = (3, 80)                               # merchandising: product names may be 80 characters
print("look-alike rules merged, then one of them changes:")
print(f"  55-character product name accepted: {validate_product_name('Curved monitor, 49 inch, 5120 x 1440, 240 Hz, USB-C hub')}")
print(f"  80-character username accepted:     {validate_username('x' * 80)}   <- nobody asked for this")`,
      hl: [2, 3, 6, 13, 15],
      out: `knowledge duplicated, one copy updated:
  receipt shown at checkout: 96.00   invoice from billing: 94.00
look-alike rules merged, then one of them changes:
  55-character product name accepted: True
  80-character username accepted:     True   <- nobody asked for this` },

    { t: "p", text: "In the first case one fact — the VAT rate — had two homes, one was updated, and a customer's receipt now disagrees with their invoice by two pounds. That is a real DRY violation. In the second, two rules that merely **looked** alike were merged; when one changed, the other changed with it, and usernames can now be 80 characters long. That is DRY applied to text, and the result is coupling between two things that should have been free to differ." },

    { t: "diagram", kind: "flow", title: "Two blocks of code look alike: merge them?",
      caption: "The test is not whether the code is identical today but whether it represents the same rule, owned by the same people, so that it must change together. When unsure, leave the duplicate: two copies are cheap to merge later, and a wrong merge is expensive to undo once other code depends on it.",
      cols: 3,
      nodes: [
        { id: "q", label: "Same rule?", sub: "same owner, changes together", tone: "accent" },
        { id: "yes", label: "Yes: one home", sub: "a constant, a function, a service", tone: "good" },
        { id: "no", label: "No: keep both", sub: "they may diverge", tone: "violet" },
        { id: "unsure", label: "Unsure", sub: "wait for the third copy", tone: "warn" },
        { id: "later", label: "Then decide", sub: "with three real examples", tone: "teal" }
      ],
      edges: [["q", "yes", "yes"], ["q", "no", "no"], ["q", "unsure", "?"], ["unsure", "later"]] },

    { t: "callout", kind: "trap", title: "The wrong abstraction",
      body: [
        { t: "p", text: "Sandi Metz's warning: duplication is far cheaper than the wrong abstraction. A helper extracted from two look-alike callers grows a parameter for the first difference, a flag for the second, and a special case for the third, until nobody can change it without breaking someone. The repair is to inline it back into its callers and let each keep only what it needs. Across services the cost is higher still: a shared library of domain models used by thirty services is DRY, and it is also a lockstep deployment for every field change — the incident at the end of this lesson." }
      ] },

    { t: "h2", n: "02", id: "kiss-yagni", text: "KISS and YAGNI",
      sub: "The simplest design that meets today's requirements" },

    { t: "p", text: "**KISS** — keep it simple — favours the design with the fewest moving parts that solves the problem: a function before a class, a class before a framework, one database before three. **YAGNI** — you aren't gonna need it — says not to build capability for a requirement you do not yet have. The case for YAGNI is not that guesses are always wrong; it is that a speculative feature costs something even when the guess is **right**:" },

    { t: "diagram", kind: "matrix", title: "What a feature built in advance costs you",
      caption: "Martin Fowler's breakdown of a presumptive feature. Even a correct guess delays everything else that could have shipped instead and makes every change until then pay for the extra code. A wrong guess adds the cost of reworking or removing it — which is the common case, because requirements arrive differently from how they were imagined.",
      cols: ["Build", "Delay", "Carry", "Repair"],
      rows: ["Needed later, exactly as guessed", "Needed later, but differently", "Never needed"],
      cells: [
        [{ text: "paid early", tone: "warn" }, { text: "other work waits", tone: "crit" }, { text: "every change works around it", tone: "crit" }, { text: "none", tone: "good" }],
        [{ text: "paid early", tone: "warn" }, { text: "other work waits", tone: "crit" }, { text: "every change works around it", tone: "crit" }, { text: "rework it", tone: "crit" }],
        [{ text: "wasted", tone: "crit" }, { text: "other work waits", tone: "crit" }, { text: "every change works around it", tone: "crit" }, { text: "remove it", tone: "crit" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "YAGNI is not \"don't design\"",
      body: [
        { t: "p", text: "Some decisions are cheap to change later and some are not. A missing method is a two-way door: add it when needed. A **data model, a public API, an identifier scheme, a partition key (4.2)** or a wire format are one-way doors: once data and clients exist, changing them means migrations and versioning. YAGNI applies to features and machinery; for one-way doors, spend the thought now — choose the shard key carefully, put a version in the API path, use IDs that will not collide when you add a second region." }
      ] },

    { t: "h2", n: "03", id: "coupling", text: "Coupling and cohesion",
      sub: "How far does a change travel?" },

    { t: "p", text: "**Coupling** is how much one module depends on others; **cohesion** is how much the parts inside one module belong together. Together they decide a design's **blast radius**: when a module changes, how many others might break and need retesting? That is measurable from the import graph. Here is the same shop organised two ways — by technical layer, with shared `models` and `utils` that everything imports and a cycle between them, and by business capability, with modules talking through small interfaces and emails and reports reacting to events instead of importing:" },

    { t: "code", lang: "python", title: "blast.py — how many modules a change can reach", code: `def blast_radius(imports):
    """For each module: how many OTHER modules depend on it, directly or transitively.
    Those are the modules a change to it can break, and that must be retested."""
    dependents = {m: set() for m in imports}
    for m, deps in imports.items():
        for d in deps: dependents[d].add(m)
    def reach(m, seen):
        for d in dependents[m]:
            if d not in seen: seen.add(d); reach(d, seen)
        return seen
    return {m: len(reach(m, set()) - {m}) for m in imports}          # a cycle reaches back to itself

tangled = {                                    # organised by technical layer, everyone reaches everywhere
    "utils":    ["models"],
    "models":   ["utils"],
    "pricing":  ["models", "utils", "stock"],
    "stock":    ["models", "utils", "orders"],
    "orders":   ["models", "utils", "pricing", "payments"],
    "payments": ["models", "utils", "orders"],
    "emails":   ["models", "utils", "orders"],
    "reports":  ["models", "utils", "orders", "payments"],
}
modular = {                                    # organised by capability, talking through small interfaces
    "catalog":  [],
    "pricing":  ["catalog"],
    "stock":    ["catalog"],
    "orders":   ["pricing", "stock"],
    "payments": [],
    "checkout": ["orders", "payments"],
    "emails":   [],                            # reacts to order events, imports nothing
    "reports":  [],                            # reads events, imports nothing
}
for name, graph in (("tangled", tangled), ("modular", modular)):
    radius = blast_radius(graph)
    worst = max(radius, key=radius.get)
    print(f"{name:<8} average blast radius {sum(radius.values()) / len(radius):.1f} of {len(graph) - 1} other modules;"
          f" worst: {worst} ({radius[worst]})")
    print("         " + "  ".join(f"{m}:{r}" for m, r in radius.items()))`,
      hl: [4, 5, 6, 7, 8, 9, 10, 11],
      out: `tangled  average blast radius 4.2 of 7 other modules; worst: utils (7)
         utils:7  models:7  pricing:5  stock:5  orders:5  payments:5  emails:0  reports:0
modular  average blast radius 1.2 of 7 other modules; worst: catalog (4)
         catalog:4  pricing:2  stock:2  orders:1  payments:1  checkout:0  emails:0  reports:0` },

    { t: "viz", title: "The blast radius of a change, module by module",
      caption: "Each box shows how many of the other seven modules depend on it, directly or transitively — what a change to it can break. In the tangled design the utils–models cycle ties everything together, so a change to either can reach all seven. Organised by capability, the most depended-on module, catalog, reaches four, and most changes reach one or none.",
      svg: `<svg viewBox="0 0 760 312" width="100%" role="img" aria-label="Blast radius of a change, tangled and modular">
<defs><marker id="bl-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<text x="180" y="18" text-anchor="middle" class="s-label" style="fill:var(--crit)">Tangled: organised by layer</text>
<line x1="208" y1="55" x2="243" y2="76" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="247" y1="77" x2="212" y2="56" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="301" y1="144" x2="291" y2="98" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="292" y1="148" x2="207" y2="61" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="301" y1="172" x2="291" y2="218" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="275" y1="218" x2="275" y2="100" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="262" y1="220" x2="196" y2="66" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="247" y1="239" x2="212" y2="260" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="194" y1="252" x2="260" y2="98" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="180" y1="250" x2="180" y2="68" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="203" y1="256" x2="288" y2="169" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="152" y1="261" x2="117" y2="240" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="108" y1="224" x2="249" y2="93" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="98" y1="220" x2="164" y2="66" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="113" y1="239" x2="148" y2="260" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="73" y1="153" x2="243" y2="87" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="68" y1="148" x2="153" y2="61" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="68" y1="168" x2="153" y2="255" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="115" y1="82" x2="241" y2="82" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="113" y1="77" x2="148" y2="56" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="98" y1="96" x2="164" y2="250" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="85" y1="98" x2="85" y2="216" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<rect x="144.0" y="36.0" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
<text x="180.0" y="54.0" text-anchor="middle" class="s-mono" style="font-size:10px">utils</text>
<text x="180.0" y="77.0" text-anchor="middle" class="s-sub" style="fill:var(--crit)">breaks 7</text>
<rect x="239.4594154601839" y="67.63246763185288" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
<text x="275.4594154601839" y="85.63246763185288" text-anchor="middle" class="s-mono" style="font-size:10px">models</text>
<text x="275.4594154601839" y="108.63246763185288" text-anchor="middle" class="s-sub" style="fill:var(--crit)">breaks 7</text>
<rect x="279.0" y="144.0" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
<text x="315.0" y="162.0" text-anchor="middle" class="s-mono" style="font-size:10px">pricing</text>
<text x="315.0" y="185.0" text-anchor="middle" class="s-sub" style="fill:var(--crit)">breaks 5</text>
<rect x="239.4594154601839" y="220.36753236814712" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
<text x="275.4594154601839" y="238.36753236814712" text-anchor="middle" class="s-mono" style="font-size:10px">stock</text>
<text x="275.4594154601839" y="261.3675323681471" text-anchor="middle" class="s-sub" style="fill:var(--crit)">breaks 5</text>
<rect x="144.0" y="252.0" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
<text x="180.0" y="270.0" text-anchor="middle" class="s-mono" style="font-size:10px">orders</text>
<text x="180.0" y="293.0" text-anchor="middle" class="s-sub" style="fill:var(--crit)">breaks 5</text>
<rect x="48.540584539816095" y="220.36753236814712" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
<text x="84.5405845398161" y="238.36753236814712" text-anchor="middle" class="s-mono" style="font-size:10px">payments</text>
<text x="84.5405845398161" y="261.3675323681471" text-anchor="middle" class="s-sub" style="fill:var(--crit)">breaks 5</text>
<rect x="9.0" y="144.0" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="45.0" y="162.0" text-anchor="middle" class="s-mono" style="font-size:10px">emails</text>
<text x="45.0" y="185.0" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 0</text>
<rect x="48.54058453981607" y="67.63246763185288" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="84.54058453981607" y="85.63246763185288" text-anchor="middle" class="s-mono" style="font-size:10px">reports</text>
<text x="84.54058453981607" y="108.63246763185288" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 0</text>
<text x="180" y="300" text-anchor="middle" class="s-sub">average blast radius 4.2 of 7</text>
<line x1="380" y1="28" x2="380" y2="300" style="stroke:var(--line);stroke-dasharray:4 4"/>
<text x="580" y="18" text-anchor="middle" class="s-label" style="fill:var(--good)">Modular: organised by capability</text>
<line x1="472" y1="203" x2="481" y2="240" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="532" y1="203" x2="521" y2="241" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="480" y1="132" x2="472" y2="174" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="513" y1="131" x2="529" y2="176" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="556" y1="62" x2="522" y2="107" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<line x1="605" y1="61" x2="647" y2="108" style="stroke:var(--ink-3);stroke-opacity:.7" stroke-width="1.1" marker-end="url(#bl-a)"/>
<rect x="544" y="38" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="580" y="56" text-anchor="middle" class="s-mono" style="font-size:10px">checkout</text>
<text x="580" y="79" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 0</text>
<rect x="459" y="104" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="495" y="122" text-anchor="middle" class="s-mono" style="font-size:10px">orders</text>
<text x="495" y="145" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 1</text>
<rect x="639" y="104" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="675" y="122" text-anchor="middle" class="s-mono" style="font-size:10px">payments</text>
<text x="675" y="145" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 1</text>
<rect x="419" y="176" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="455" y="194" text-anchor="middle" class="s-mono" style="font-size:10px">pricing</text>
<text x="455" y="217" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 2</text>
<rect x="514" y="176" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="550" y="194" text-anchor="middle" class="s-mono" style="font-size:10px">stock</text>
<text x="550" y="217" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 2</text>
<rect x="464" y="241" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
<text x="500" y="259" text-anchor="middle" class="s-mono" style="font-size:10px">catalog</text>
<text x="500" y="282" text-anchor="middle" class="s-sub" style="fill:var(--warn)">breaks 4</text>
<rect x="654" y="191" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="690" y="209" text-anchor="middle" class="s-mono" style="font-size:10px">emails</text>
<text x="690" y="232" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 0</text>
<rect x="654" y="241" width="72" height="28" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
<text x="690" y="259" text-anchor="middle" class="s-mono" style="font-size:10px">reports</text>
<text x="690" y="282" text-anchor="middle" class="s-sub" style="fill:var(--good)">breaks 0</text>
<text x="580" y="300" text-anchor="middle" class="s-sub">average blast radius 1.2 of 7</text>
</svg>` },

    { t: "dl", items: [
      { term: "Signs of tight coupling", def: "Changing one module routinely requires changing another; modules share mutable data or database tables; import cycles; a module that cannot be tested without starting several others." },
      { term: "Signs of low cohesion", def: "A module named utils, common, helpers or manager; methods that use disjoint sets of fields; a change touches a small part of a large file, every time." },
      { term: "The repair", def: "Group what changes together (cohesion), and connect groups through narrow interfaces or events rather than shared internals (coupling). The same rule draws microservice boundaries in 10.1." }
    ] },

    { t: "p", text: "The **Law of Demeter** is coupling at the level of a single line: a method should talk to its own fields, its parameters and the objects it creates — not reach through them. `order.customer.wallet.cards[0].charge(total)` couples the order code to the internal structure of customers, wallets and cards; when wallets gain a default-card rule, every such chain is wrong. `order.customer.pay(total)` — tell, don't ask — keeps that knowledge inside the customer." },

    { t: "h2", n: "04", id: "composition", text: "Composition over inheritance",
      sub: "Assemble behaviour instead of inheriting it" },

    { t: "p", text: "Inheritance shares behaviour by making one class a kind of another. It works for a genuine, shallow is-a relationship, and fails for optional behaviours that combine: a sender that may retry, may log and may be metered needs a subclass for each combination. Composition wraps one object in another that has the same interface and adds one behaviour; any combination is assembled at run time:" },

    { t: "code", lang: "python", title: "compose.py — three wrappers, three orders, three behaviours", code: `import random

class HttpSender:                              # the core behaviour
    def __init__(self, fail_rate, seed=3): self.rng, self.fail_rate = random.Random(seed), fail_rate
    def send(self, msg):
        if self.rng.random() < self.fail_rate: raise ConnectionError("reset by peer")
        return f"sent {msg!r}"

class Retrying:                                # each optional behaviour is a small wrapper ...
    def __init__(self, inner, attempts=3): self.inner, self.attempts = inner, attempts
    def send(self, msg):
        for i in range(self.attempts):
            try: return self.inner.send(msg)
            except ConnectionError:
                if i == self.attempts - 1: raise

class Logging:
    def __init__(self, inner, log): self.inner, self.log = inner, log
    def send(self, msg):
        try: result = self.inner.send(msg); self.log.append(f"ok   {msg}"); return result
        except ConnectionError as e: self.log.append(f"FAIL {msg}: {e}"); raise

class Metered:
    def __init__(self, inner): self.inner, self.calls = inner, 0
    def send(self, msg): self.calls += 1; return self.inner.send(msg)

# ... and any combination is assembled at run time, in any order
def run(build):
    log, wire = [], Metered(HttpSender(fail_rate=0.4))
    sender = build(wire, log)
    delivered = 0
    for i in range(6):
        try: sender.send(f"order-{i}"); delivered += 1
        except ConnectionError: pass
    fails = sum(line.startswith("FAIL") for line in log)
    return f"{delivered}/6 delivered, {wire.calls} network attempts, {len(log)} log lines ({fails} failures)"

print("Logging(Retrying(http)):", run(lambda http, log: Logging(Retrying(http), log)))
print("Retrying(Logging(http)):", run(lambda http, log: Retrying(Logging(http, log))))
print("Logging(http), no retry:", run(lambda http, log: Logging(http, log)))

print("\\nclasses needed to offer every combination of N optional behaviours:")
for n in (2, 3, 5, 8):
    print(f"  {n} behaviours: inheritance {2 ** n:>3} subclasses, composition {n} wrappers")`,
      hl: [9, 10, 17, 18, 37, 38, 39],
      out: `Logging(Retrying(http)): 6/6 delivered, 12 network attempts, 6 log lines (0 failures)
Retrying(Logging(http)): 6/6 delivered, 12 network attempts, 12 log lines (6 failures)
Logging(http), no retry: 3/6 delivered, 6 network attempts, 6 log lines (3 failures)

classes needed to offer every combination of N optional behaviours:
  2 behaviours: inheritance   4 subclasses, composition 2 wrappers
  3 behaviours: inheritance   8 subclasses, composition 3 wrappers
  5 behaviours: inheritance  32 subclasses, composition 5 wrappers
  8 behaviours: inheritance 256 subclasses, composition 8 wrappers` },

    { t: "viz", title: "The order of wrappers is a design decision",
      caption: "Same four classes, same flaky network, same six messages. Left: logging outside the retry records only the outcome of each send, so a link failing 40% of the time looks perfectly healthy in the logs. Right: logging inside the retry records every attempt, and the six failures are visible. Neither is wrong; they answer different questions, and the choice should be deliberate.",
      svg: `<svg viewBox="0 0 760 262" width="100%" role="img" aria-label="Wrapper order">
  <text x="180" y="18" text-anchor="middle" class="s-mono" style="fill:var(--ink)">Logging(Retrying(http))</text>
  <rect x="20" y="32" width="320" height="168" rx="12" style="fill:var(--violet);fill-opacity:.07;stroke:var(--violet)" stroke-width="1.5"/>
  <text x="34" y="52" class="s-label" style="fill:var(--violet)">Logging</text>
  <rect x="44" y="64" width="272" height="112" rx="10" style="fill:var(--accent);fill-opacity:.07;stroke:var(--accent)" stroke-width="1.5"/>
  <text x="58" y="84" class="s-label" style="fill:var(--accent)">Retrying × 3</text>
  <rect x="70" y="98" width="220" height="56" rx="9" style="fill:var(--teal);fill-opacity:.1;stroke:var(--teal)" stroke-width="1.5"/>
  <text x="180" y="122" text-anchor="middle" class="s-mono">http</text><text x="180" y="140" text-anchor="middle" class="s-sub">fails 40% of attempts</text>
  <text x="180" y="226" text-anchor="middle" class="s-sub">log: 6 lines, 0 failures</text>
  <text x="180" y="246" text-anchor="middle" class="s-sub" style="fill:var(--warn)">the flaky link is invisible</text>
  <line x1="380" y1="10" x2="380" y2="252" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <text x="580" y="18" text-anchor="middle" class="s-mono" style="fill:var(--ink)">Retrying(Logging(http))</text>
  <rect x="420" y="32" width="320" height="168" rx="12" style="fill:var(--accent);fill-opacity:.07;stroke:var(--accent)" stroke-width="1.5"/>
  <text x="434" y="52" class="s-label" style="fill:var(--accent)">Retrying × 3</text>
  <rect x="444" y="64" width="272" height="112" rx="10" style="fill:var(--violet);fill-opacity:.07;stroke:var(--violet)" stroke-width="1.5"/>
  <text x="458" y="84" class="s-label" style="fill:var(--violet)">Logging</text>
  <rect x="470" y="98" width="220" height="56" rx="9" style="fill:var(--teal);fill-opacity:.1;stroke:var(--teal)" stroke-width="1.5"/>
  <text x="580" y="122" text-anchor="middle" class="s-mono">http</text><text x="580" y="140" text-anchor="middle" class="s-sub">fails 40% of attempts</text>
  <text x="580" y="226" text-anchor="middle" class="s-sub">log: 12 lines, 6 failures</text>
  <text x="580" y="246" text-anchor="middle" class="s-sub" style="fill:var(--good)">every attempt is visible</text>
</svg>` },

    { t: "p", text: "The class count is the other half of the argument: offering every combination of eight optional behaviours by inheritance takes 256 subclasses, against eight wrappers. This is the decorator pattern of 9.4, and at system scale it is the middleware chain in a web framework and the sidecar proxy of 10.5, where retries, timeouts, TLS and metrics wrap a service without its code changing." },

    { t: "h2", n: "05", id: "fail-fast", text: "Inversion of control and failing fast",
      sub: "Wire it in one place; check it before serving" },

    { t: "p", text: "Dependency injection (9.1) moves construction out of the classes that use things. Where does it go? To a single **composition root** — the `main` function or application factory that reads configuration, builds the database pool, the gateway adapters and the services, and wires them together. Everything else just receives what it needs. That one place is also where to **fail fast**: parse and validate every setting before the service accepts traffic." },

    { t: "code", lang: "python", title: "failfast.py — the same typo, read lazily and validated at start-up", code: `ENV = {"DB_URL": "postgres://db:5432/shop", "REFUND_TIMEOUT_MS": "5s", "MAX_RETRIES": "3"}   # a typo: "5s"

class LazyService:
    """Reads configuration where it is used. Starts, passes health checks, serves traffic ..."""
    def __init__(self, env): self.env = env
    def handle(self, request):
        if request == "refund":                # ... until the first request that needs the bad value
            timeout = int(self.env["REFUND_TIMEOUT_MS"])
            return f"refund sent, {timeout} ms timeout"
        return "200 OK"

class Settings:
    """Parses and checks every setting once, at start-up, and refuses to start if any is wrong."""
    def __init__(self, env):
        errors = []
        def integer(name, lo, hi):
            try:
                value = int(env[name])
                if not lo <= value <= hi: errors.append(f"{name}={value} is outside {lo}..{hi}")
                return value
            except KeyError: errors.append(f"{name} is missing")
            except ValueError: errors.append(f"{name}={env[name]!r} is not a whole number of milliseconds")
        self.refund_timeout_ms = integer("REFUND_TIMEOUT_MS", 100, 30_000)
        self.max_retries = integer("MAX_RETRIES", 0, 10)
        if errors: raise SystemExit("refusing to start: " + "; ".join(errors))

traffic = [("09:00", "browse")] * 3 + [("13:20", "checkout"), ("02:47", "refund")]   # refunds are rare

print("lazy:")
svc = LazyService(ENV); print("  09:00  deployed, health check 200 OK, rollout continues to every instance")
for at, request in traffic:
    try: svc.handle(request)
    except ValueError as e: print(f"  {at}  first {request} request: ValueError: {e}"); break
print("eager:")
try: Settings(ENV)
except SystemExit as e: print(f"  09:00  {e}\\n         the first instance never becomes ready; the rollout halts; the old version keeps serving")`,
      hl: [8, 16, 17, 18, 25],
      out: `lazy:
  09:00  deployed, health check 200 OK, rollout continues to every instance
  02:47  first refund request: ValueError: invalid literal for int() with base 10: '5s'
eager:
  09:00  refusing to start: REFUND_TIMEOUT_MS='5s' is not a whole number of milliseconds
         the first instance never becomes ready; the rollout halts; the old version keeps serving` },

    { t: "diagram", kind: "timeline", title: "Seventeen hours of a latent failure, or none",
      caption: "Lazily read configuration passes every health check, so the rollout reaches every instance; the bad value is only parsed when the first refund arrives in the small hours, when every instance fails at once. Validated at start-up, the first new instance refuses to start, never becomes ready, and the deployment stops with the old version still serving.",
      span: 20, tick: 4, unit: "hours after a 09:00 deploy",
      lanes: [
        { label: "Lazy config", bars: [[0, 0.6, "deploy", "accent"], [0.6, 17.8, "serving; every check green; the typo waits", "warn"], [17.8, 20, "failing", "crit"]] },
        { label: "Validated", bars: [[0, 0.6, "refused", "crit"], [0.6, 20, "old version keeps serving; the typo is fixed at 09:05", "good"]] }
      ] },

    { t: "callout", kind: "insight", title: "Fail fast, then degrade gracefully",
      body: [
        { t: "p", text: "These two rules apply to different moments. At **start-up and at module boundaries**, fail fast: reject invalid configuration, malformed input and broken invariants immediately and loudly, close to the cause. At **run time, for dependencies**, degrade gracefully (7.4): a slow recommendation service should not take down checkout. Silently \"fixing\" bad data — clamping a negative total to zero and carrying on — is the worst of both: the failure is hidden and shows up later, somewhere else." }
      ] },

    { t: "table", head: ["Principle", "In one line", "Misapplied, it becomes"], rows: [
      ["Separation of concerns", "presentation, business rules and storage live apart", "layers that only forward calls"],
      ["Encapsulation", "state changes only through methods that keep it valid", "getters and setters for every field"],
      ["Abstraction", "callers see what, not how", "an interface with one implementation, forever"],
      ["Law of Demeter", "talk to neighbours, not their internals", "wrapper methods that only delegate"],
      ["Convention over configuration", "sensible defaults; configure only the unusual", "magic nobody can find"],
      ["Fail fast", "reject bad state where it enters", "crashing on recoverable run-time errors"]
    ] },

    { t: "exercise", kind: "Challenge", title: "Find the dependency that freezes the domain",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Robert Martin's **instability** metric makes coupling a number: for each module, Ca counts the modules that depend on it, Ce the modules it depends on, and I = Ce / (Ca + Ce), from 0 (everything depends on it, it depends on nothing: hard to change) to 1 (the reverse: free to change). The **stable-dependencies principle** says dependencies should point towards stability. Compute the metrics for this shop's import graph, report dependencies that point towards less stable modules, find import cycles, and propose a fix." }
      ],
      requirements: [
        "Ca, Ce and I for every module",
        "Every dependency from a module to a less stable one",
        "Every import cycle, reported once",
        "Apply a fix and show the report again"
      ],
      hint: "The domain imports marketing's promo_banner, which changes weekly. Watch what that one edge does to promo_banner's apparent stability.",
      solution: { lang: "python", title: "stability_ex.py",
        code: `def report(imports):
    ce = {m: len(deps) for m, deps in imports.items()}                      # efferent: what m depends on
    ca = {m: sum(m in deps for deps in imports.values()) for m in imports}  # afferent: who depends on m
    inst = {m: ce[m] / (ca[m] + ce[m]) if ca[m] + ce[m] else 0.0 for m in imports}
    print(f"  {'module':<13}{'Ca':>4}{'Ce':>4}{'I':>7}")
    for m in sorted(imports, key=inst.get):
        print(f"  {m:<13}{ca[m]:>4}{ce[m]:>4}{inst[m]:>7.2f}")
    bad = [f"{m} ({inst[m]:.2f}) -> {d} ({inst[d]:.2f})" for m, deps in imports.items() for d in deps if inst[d] > inst[m]]
    print("  depends on something less stable:", ", ".join(bad) or "none")
    found, path = set(), []
    def walk(m):
        if m in path:
            loop = path[path.index(m):]; k = loop.index(min(loop))    # one canonical rotation per cycle
            found.add(" -> ".join(loop[k:] + loop[:k] + [loop[k]])); return
        path.append(m)
        for d in imports[m]: walk(d)
        path.pop()
    for m in imports: walk(m)
    print("  import cycles:", ", ".join(sorted(found)) or "none")

shop = {
    "money":        [],
    "domain":       ["money", "promo_banner"],         # the domain shows a banner price ...
    "pricing":      ["domain", "money"],
    "orders":       ["domain", "pricing"],
    "payments":     ["domain", "money"],
    "checkout":     ["orders", "payments", "pricing"],
    "admin_ui":     ["orders", "payments", "promo_banner"],
    "promo_banner": ["pricing"],                       # ... from marketing's widget, changed weekly
}
print("as found:"); report(shop)

shop["domain"] = ["money"]                             # invert: domain defines a Promotions port,
shop["promo_banner"] = ["pricing", "domain"]           # and the widget implements it
print("\\nafter inverting the dependency:"); report(shop)`,
        out: `as found:
  module         Ca  Ce      I
  money           3   0   0.00
  promo_banner    2   1   0.33
  domain          3   2   0.40
  pricing         3   2   0.40
  orders          2   2   0.50
  payments        2   2   0.50
  checkout        0   3   1.00
  admin_ui        0   3   1.00
  depends on something less stable: promo_banner (0.33) -> pricing (0.40)
  import cycles: domain -> promo_banner -> pricing -> domain

after inverting the dependency:
  module         Ca  Ce      I
  money           3   0   0.00
  domain          4   1   0.20
  pricing         3   2   0.40
  orders          2   2   0.50
  payments        2   2   0.50
  promo_banner    1   2   0.67
  checkout        0   3   1.00
  admin_ui        0   3   1.00
  depends on something less stable: none
  import cycles: none` ,
        notes: [
          { t: "p", text: "The metric alone points at the wrong edge. Because the domain imports promo_banner, promo_banner gains dependents and looks fairly stable (0.33), so the flagged edge is promo_banner → pricing — a symptom. The real problem is the cycle domain → promo_banner → pricing → domain: the most central module now changes whenever marketing's weekly widget does." },
          { t: "p", text: "The fix is dependency inversion: the domain declares the small interface it needs (a promotions port), and the widget implements it. After the change the domain's instability falls from 0.40 to 0.20, the widget rises to 0.67 — accurately volatile — and there are no cycles. Metrics find candidates; knowing which modules actually change often is what makes them meaningful." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the shared library that froze thirty services",
      body: [
        { t: "p", text: "**Symptom.** Adding an optional `gift_message` field to orders took five weeks. Thirty services had to be redeployed in a particular order, two releases were rolled back when consumers built against the old version rejected messages with the new field, and every team's roadmap slipped for a field only three of them used." },
        { t: "p", text: "**Mechanism.** Years earlier, in the name of DRY, the domain models — Order, Customer, Product — had been moved into a shared library that every service imported. Each service now depended on every model's exact shape, including fields it never read; the library was the most depended-on module in the company and could not change without everyone. The services were separately deployed and still one system: a distributed monolith." },
        { t: "p", text: "**Fix.** Each service now owns the models it needs and maps from versioned API and event schemas (6.3's schema registry), tolerating unknown fields. The shared library was reduced to stable, low-level code — money arithmetic, ID generation, tracing — that genuinely is the same knowledge everywhere and rarely changes." }
      ] }
  ],

  takeaways: [
    "**DRY** is about **knowledge**: a rate written twice drifted, and a receipt disagreed with its invoice.",
    "Merging code that only **looks** alike couples rules that should differ: measured, widening product names silently allowed **80-character usernames**.",
    "When unsure, keep the duplicate; **the wrong abstraction** costs more than duplication.",
    "**YAGNI**: a speculative feature costs build, delay and carry even when the guess is right, and repair when it is wrong.",
    "Spend design effort on **one-way doors** — data models, APIs, IDs, partition keys — and defer everything that is cheap to add later.",
    "Coupling is measurable as **blast radius**: the same shop averaged **4.2** of 7 modules per change organised by layer, and **1.2** organised by capability.",
    "**Law of Demeter**: tell, don't ask — a chain of getters couples you to other objects' internals.",
    "**Composition** gives any combination of behaviours from N wrappers instead of 2ᴺ subclasses — and the **order** of wrappers changes behaviour: logging outside a retry hid **6 failures**.",
    "Wire dependencies in one **composition root**, and **validate configuration at start-up**, so a bad deploy refuses to start instead of failing seventeen hours later.",
    "Fail fast on bad input and configuration; degrade gracefully on failing dependencies."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Two functions both check that a string is 3 to 20 characters long: one for usernames, one for product names. Should they share one implementation?",
        options: ["Yes: identical code is always a DRY violation", "Only if they represent the same rule with the same owner, so they must change together; otherwise keep them separate", "No: DRY only applies across services", "Yes, but add a parameter for each future difference"],
        answer: 1,
        why: "DRY concerns duplicated knowledge. These are two business rules that happen to coincide today; merging them couples their futures, as the 80-character usernames showed. Adding parameters for each difference is how the wrong abstraction grows, and DRY applies at every scale, not only across services." },

      { stem: "A team builds a plugin system for export formats nobody has asked for yet, and later the first real request needs a different shape. Which YAGNI costs were paid?",
        options: ["Only the cost of building it", "Build, delay and carry, plus the repair of reworking it", "None, because it was eventually used", "Only the cost of repair"],
        answer: 1,
        why: "The plugin system was built early (build), displaced other work (delay), had to be maintained and worked around until needed (carry), and then needed rework because the guess was wrong (repair). Even a correct guess pays build, delay and carry." },

      { stem: "In the composition example, why did logging outside the retry show no failures while the network failed 40% of attempts?",
        options: ["The retry wrapper suppressed logging", "The outer logger only sees the result of each retried send, which succeeded; the failed attempts happened inside, where it cannot see them", "The random seed differed between runs", "Logging only records successful calls by design"],
        answer: 1,
        why: "Each wrapper sees only what passes through its own interface. Outside the retry, the logger sees one call per message and its final outcome. Inside, it sees each attempt. The seed was the same in all runs, and the logger records failures when it is placed where they are visible." },

      { stem: "A configuration value is read and parsed only when the first refund is processed. What is the main risk?",
        options: ["Slower start-up", "A typo passes start-up and health checks, reaches every instance, and fails only when that code path first runs — possibly hours later, everywhere at once", "Higher memory use", "The value cannot be changed at run time"],
        answer: 1,
        why: "Lazy parsing hides the error from start-up and readiness checks, so a rolling deployment proceeds to all instances. The failure appears on a rare path, far from the change that caused it. Validating at start-up stops the rollout at the first instance. Start-up time and memory are negligible either way." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "These questions test judgement more than definitions.",
    questions: [
      { level: "core",
        q: "What does DRY really mean, and when is duplication the better choice?",
        strong: "A strong answer distinguishes knowledge from text and gives a case where deduplication creates coupling.",
        answer: [
          { t: "p", text: "DRY means each piece of knowledge — a business rule, a rate, a schema — has one authoritative home, so it cannot drift. It does not mean identical-looking code must be merged. Two validators that coincide today but belong to different rules should stay separate, because merging them makes a change to one silently change the other." },
          { t: "p", text: "Duplication is also better across service boundaries: a shared library of domain models makes every service deploy in lockstep. I would rather have each service own its models and map from a versioned contract. When I am unsure, I keep the duplicate and wait for a third case before extracting an abstraction." }
        ] },

      { level: "core",
        q: "How do you recognise and reduce coupling in a codebase or a system?",
        strong: "A strong answer names concrete signals, a measurement, and repairs at both code and system level.",
        answer: [
          { t: "p", text: "Signals: changes that routinely touch several modules, import cycles, shared database tables, modules called utils or common, tests that need half the system running. I can measure it from the import graph — how many modules depend on each one transitively — or from version control, by which files change together." },
          { t: "p", text: "Repairs: group what changes together by business capability, connect groups through narrow interfaces or events, break cycles by inverting a dependency, and follow tell-don't-ask instead of reaching into other objects. At system level the same thinking gives service boundaries with their own data and versioned contracts." }
        ] },

      { level: "advanced",
        q: "Where does YAGNI stop applying? Give examples of things you would design ahead of need.",
        strong: "A strong answer separates reversible from irreversible decisions with concrete examples.",
        answer: [
          { t: "p", text: "YAGNI applies to features and internal machinery, which are cheap to add when needed. It does not apply to decisions that are expensive to reverse once data and clients exist: the data model, the partition key, identifier formats, the public API's shape and versioning, event schemas, and tenant isolation." },
          { t: "p", text: "For those I spend the thought up front — a shard key that will spread load at ten times today's scale, IDs that will not collide across regions, a version in the API from day one — while still not building the features that would use them until they are asked for." }
        ] }
    ]
  }
});
