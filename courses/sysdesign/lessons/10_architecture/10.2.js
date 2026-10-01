/* ============================================================================
   LESSON 10.2 — Domain-Driven Design
   ========================================================================= */
EC.receiveLesson({
  id: "10.2",

  lede: "Where should one module or service end and the next begin? Domain-driven design, from Eric Evans' 2003 book, answers from the business rather than the database: find the places where a word — \"product\", \"account\", \"order\" — keeps one consistent meaning, and draw the boundary there. Those **bounded contexts** become modules or services, each with its own model and a **ubiquitous language** shared with the people who run that part of the business. Inside a context, **aggregates** mark what must be consistent in one transaction, and they are the most practical thing DDD gives a system designer: get their size wrong and a popular product page becomes a queue of write conflicts.",

  objectives: [
    "Explain bounded contexts and why one shared model of \"product\" is a trap",
    "Classify subdomains as core, supporting or generic, and decide what to build and what to buy",
    "Draw a context map and choose a relationship for each integration, including an anti-corruption layer",
    "Size an aggregate by its invariants, and measure what an oversized one costs",
    "Derive candidate context boundaries from the use cases that read and write each field"
  ],

  prerequisites: ["10.1", "9.4"],

  blocks: [

    { t: "h2", n: "01", id: "contexts", text: "Bounded contexts",
      sub: "One word, one meaning, inside one boundary" },

    { t: "p", text: "Ask four teams in a shop what a \"product\" is and you get four different answers. To the catalogue team it is a name, a description and photographs; to the warehouse it is a SKU, a quantity and a bin location; to pricing it is a price, a tax class and a discount; to shipping it is a weight and a size. A single `Product` table with all of those columns, shared by everyone, couples four teams that change for different reasons — the single-responsibility problem of 9.1 at the scale of an organisation." },

    { t: "diagram", kind: "compare", title: "\"Product\" in four bounded contexts",
      caption: "Each context keeps only the attributes it needs, named in its own language, and changes them on its own schedule. What crosses the boundaries is an identifier — product_id or SKU — and events, never the model itself.",
      columns: [
        { title: "Catalogue", tone: "accent", items: ["name, description", "images, category", "SEO text, reviews"] },
        { title: "Inventory", tone: "violet", items: ["SKU, quantity", "warehouse, bin", "supplier, reorder level"] },
        { title: "Pricing", tone: "good", items: ["price, currency", "tax class", "discounts, promotions"] },
        { title: "Shipping", tone: "warn", items: ["weight, dimensions", "shipping class", "hazardous flag"] }
      ] },

    { t: "dl", items: [
      { term: "Bounded context", def: "A boundary inside which one model and its terms are consistent. It usually maps to one team and becomes one module (10.1) or one service." },
      { term: "Ubiquitous language", def: "The vocabulary the developers and the business share inside a context, used in conversation, code and tests alike. If the business says \"backorder\" and the code says pending_flag_2, the model is drifting from the domain." },
      { term: "Domain event", def: "Something that happened, named in the past tense — OrderPlaced, StockReserved, PaymentFailed. Events are how contexts tell each other about changes without sharing models (6.2)." }
    ] },

    { t: "h2", n: "02", id: "map", text: "Subdomains and the context map",
      sub: "What to build, what to buy, and how the pieces relate" },

    { t: "p", text: "Not every context deserves the same investment. The **core domain** is what makes the business different — the pricing engine of a marketplace, the matching of a ride-hailing app — and gets the strongest people and the most careful model. **Supporting** domains are necessary and specific to you but not differentiating; build them simply. **Generic** domains — identity, email, payments processing — are the same everywhere; buy them. A **context map** then records how each pair of contexts integrates:" },

    { t: "viz", title: "A context map for an online shop",
      caption: "Ordering and pricing are the core domain here; catalogue, inventory, payments and shipping are supporting; identity is bought. Catalogue and pricing publish to ordering; ordering announces OrderPlaced and OrderPaid for inventory and shipping to react to. Payments wraps the payment provider in an anti-corruption layer so the provider's model never leaks in, while shipping simply conforms to the carrier's API.",
      svg: `<svg viewBox="0 0 760 338" width="100%" role="img" aria-label="Context map for an online shop">
<defs><marker id="cm-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="30" y="30" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/><text x="110.0" y="53.0" text-anchor="middle" class="s-label">Catalogue</text><text x="110.0" y="69.0" text-anchor="middle" class="s-sub">supporting</text>
<rect x="300" y="30" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/><text x="380.0" y="53.0" text-anchor="middle" class="s-label">Ordering</text><text x="380.0" y="69.0" text-anchor="middle" class="s-sub">core: build it well</text>
<rect x="570" y="30" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/><text x="650.0" y="53.0" text-anchor="middle" class="s-label">Pricing</text><text x="650.0" y="69.0" text-anchor="middle" class="s-sub">core: build it well</text>
<rect x="30" y="140" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/><text x="110.0" y="163.0" text-anchor="middle" class="s-label">Inventory</text><text x="110.0" y="179.0" text-anchor="middle" class="s-sub">supporting</text>
<rect x="300" y="140" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/><text x="380.0" y="163.0" text-anchor="middle" class="s-label">Payments</text><text x="380.0" y="179.0" text-anchor="middle" class="s-sub">supporting</text>
<rect x="570" y="140" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/><text x="650.0" y="163.0" text-anchor="middle" class="s-label">Shipping</text><text x="650.0" y="179.0" text-anchor="middle" class="s-sub">supporting</text>
<rect x="30" y="250" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--line)" stroke-width="1.6"/><text x="110.0" y="273.0" text-anchor="middle" class="s-label">Identity</text><text x="110.0" y="289.0" text-anchor="middle" class="s-sub">generic: buy (OIDC)</text>
<rect x="300" y="250" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6"/><text x="380.0" y="273.0" text-anchor="middle" class="s-label">Payment provider</text><text x="380.0" y="289.0" text-anchor="middle" class="s-sub">external API</text>
<rect x="570" y="250" width="160" height="52" rx="9" class="s-fill" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6"/><text x="650.0" y="273.0" text-anchor="middle" class="s-label">Carrier API</text><text x="650.0" y="289.0" text-anchor="middle" class="s-sub">external API</text>
<line x1="190" y1="56" x2="298" y2="56" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><text x="244" y="48" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">product events</text>
<line x1="570" y1="56" x2="462" y2="56" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><text x="516" y="48" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">price quotes</text>
<line x1="300" y1="82" x2="192" y2="140" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><text x="228" y="104" text-anchor="end" class="s-sub" style="fill:var(--ink-2)">OrderPlaced</text>
<line x1="380" y1="82" x2="380" y2="138" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><text x="388" y="114" text-anchor="start" class="s-sub" style="fill:var(--ink-2)">charge</text>
<line x1="460" y1="82" x2="568" y2="140" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><text x="532" y="104" text-anchor="start" class="s-sub" style="fill:var(--ink-2)">OrderPaid</text>
<line x1="380" y1="192" x2="380" y2="248" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><text x="388" y="224" text-anchor="start" class="s-sub" style="fill:var(--ink-2)">anti-corruption layer</text>
<line x1="650" y1="192" x2="650" y2="248" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><text x="658" y="224" text-anchor="start" class="s-sub" style="fill:var(--ink-2)">conformist</text>
<rect x="190" y="318" width="22" height="12" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
<text x="220" y="328" class="s-sub">core</text>
<rect x="310" y="318" width="22" height="12" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/>
<text x="340" y="328" class="s-sub">supporting</text>
<rect x="430" y="318" width="22" height="12" rx="3" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/>
<text x="460" y="328" class="s-sub">generic</text>
<rect x="550" y="318" width="22" height="12" rx="3" class="s-fill" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.5"/>
<text x="580" y="328" class="s-sub">external</text>
</svg>` },

    { t: "table", head: ["Relationship", "Meaning", "Use when"], rows: [
      ["Customer–supplier", "upstream plans for downstream's needs", "two internal teams with a shared roadmap"],
      ["Conformist", "downstream adopts upstream's model as is", "a big external API you cannot influence, and whose model is acceptable"],
      ["Anti-corruption layer", "downstream translates upstream's model", "legacy systems, partners, vendors whose model would distort yours (9.4)"],
      ["Open host service + published language", "upstream offers a documented API or event schema to all", "many consumers; versioned schemas in a registry (6.3)"],
      ["Shared kernel", "two contexts share a small part of the model", "rarely — it couples both teams to every change (9.2's incident)"],
      ["Separate ways", "no integration at all", "the cost of integrating exceeds the value"]
    ] },

    { t: "h2", n: "03", id: "aggregates", text: "Aggregates",
      sub: "The unit of consistency, and therefore of contention" },

    { t: "p", text: "Inside a context, an **aggregate** is a cluster of objects that must be consistent with each other at the end of every transaction: an order and its lines, whose total must equal the sum of the lines and whose status must allow the change. One object, the **root**, is the only way in; it enforces the invariants; it is loaded and saved as a unit, usually with a version number for optimistic concurrency (5.2). Everything outside the aggregate is referred to **by ID** and kept up to date by events, eventually." },

    { t: "viz", title: "An Order aggregate",
      caption: "The order is the root: callers ask it to add a line or change the address, and it checks the rules before anything changes. Lines are entities with identities local to the order; the address is a value object, replaced whole rather than edited. The customer and the product belong to other aggregates and contexts, so the order holds only their IDs — loading an order never loads a customer.",
      svg: `<svg viewBox="0 0 760 246" width="100%" role="img" aria-label="An Order aggregate">
<defs><marker id="cm-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="170" y="24" width="420" height="180" rx="14" style="fill:var(--good);fill-opacity:.05;stroke:var(--good);stroke-dasharray:6 4" stroke-width="1.5"/>
<text x="184" y="44" class="s-sub" style="fill:var(--good)">Order aggregate: one consistency boundary</text>
<rect x="300" y="56" width="160" height="48" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/><text x="380.0" y="77.0" text-anchor="middle" class="s-mono">Order</text><text x="380.0" y="93.0" text-anchor="middle" class="s-sub">root: id, status, version</text>
<rect x="190" y="142" width="120" height="44" rx="9" class="s-fill" style="stroke:var(--violet)" stroke-width="1.6"/><text x="250.0" y="161.0" text-anchor="middle" class="s-mono">Address</text><text x="250.0" y="177.0" text-anchor="middle" class="s-sub">value object</text>
<rect x="320" y="142" width="120" height="44" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/><text x="380.0" y="161.0" text-anchor="middle" class="s-mono">OrderLine</text><text x="380.0" y="177.0" text-anchor="middle" class="s-sub">entity, local id</text>
<rect x="450" y="142" width="126" height="44" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/><text x="513.0" y="161.0" text-anchor="middle" class="s-mono">OrderLine</text><text x="513.0" y="177.0" text-anchor="middle" class="s-sub">entity, local id</text>
<line x1="350" y1="104" x2="250" y2="140" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><line x1="380" y1="104" x2="380" y2="140" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/><line x1="410" y1="104" x2="513" y2="140" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#cm-a)"/>
<rect x="20" y="58" width="120" height="44" rx="9" class="s-fill" style="stroke:var(--line);stroke-dasharray:5 4" stroke-width="1.6"/><text x="80.0" y="77.0" text-anchor="middle" class="s-mono">Customer</text><text x="80.0" y="93.0" text-anchor="middle" class="s-sub">another aggregate</text>
<line x1="298" y1="80" x2="142" y2="80" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#cm-a)"/><text x="220" y="72" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">customer_id</text>
<rect x="620" y="142" width="120" height="44" rx="9" class="s-fill" style="stroke:var(--line);stroke-dasharray:5 4" stroke-width="1.6"/><text x="680.0" y="161.0" text-anchor="middle" class="s-mono">Product</text><text x="680.0" y="177.0" text-anchor="middle" class="s-sub">another context</text>
<line x1="578" y1="164" x2="618" y2="164" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#cm-a)"/>
<text x="598" y="136" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">product_id</text>
<text x="380" y="228" text-anchor="middle" class="s-sub">change it only through the root, in one transaction; refer to anything outside by ID</text>
</svg>` },

    { t: "p", text: "The size of an aggregate is a performance decision as much as a modelling one, because **one aggregate is one unit of contention**: two transactions changing the same aggregate conflict. Model a product's reviews as part of the product and every review on a popular product competes with every other. Sixty customers review the same product at once — with one of them submitting twice — under each design:" },

    { t: "code", lang: "python", title: "aggregate.py — reviews inside the product, or as their own aggregates", code: `import copy, random, threading, time

class Conflict(Exception): pass

class Store:
    """Optimistic concurrency: save succeeds only if nobody saved since you loaded (5.2)."""
    def __init__(self): self.rows, self.lock, self.conflicts = {}, threading.Lock(), 0
    def load(self, key):
        with self.lock:
            version, data = self.rows.get(key, (0, None))
            return version, copy.deepcopy(data)
    def save(self, key, expected, data):
        with self.lock:
            if self.rows.get(key, (0, None))[0] != expected:
                self.conflicts += 1; raise Conflict(key)
            self.rows[key] = (expected + 1, data)

def write_review(store, key_for, product, customer, rng):
    key = key_for(product, customer)
    while True:                                                 # load, change, save; retry on conflict
        version, data = store.load(key)
        data = data or {"reviews": {}}
        if customer in data["reviews"]: return "duplicate"      # invariant: one review per customer
        time.sleep(rng.uniform(0.001, 0.004))                   # validation, spam check ...
        data["reviews"][customer] = "★★★★☆"
        try: store.save(key, version, data); return "saved"
        except Conflict: continue

designs = {
    "Product holds its reviews": lambda product, customer: product,                 # one big aggregate
    "Review is its own aggregate": lambda product, customer: f"{product}/{customer}",  # small, keyed by both IDs
}
for name, key_for in designs.items():
    store = Store()
    customers = [f"c{i}" for i in range(60)] + ["c7"]           # 60 customers, and c7 submits twice
    threads = [threading.Thread(target=write_review, args=(store, key_for, "p-42", c, random.Random(i)))
               for i, c in enumerate(customers)]
    start = time.perf_counter()
    for t in threads: t.start()
    for t in threads: t.join()
    reviews = sum(len(d["reviews"]) for _, d in store.rows.values())
    print(f"{name:<28} {reviews} reviews stored, {store.conflicts:>4} conflicts retried, "
          f"{(time.perf_counter() - start) * 1000:4.0f} ms")`,
      hl: [19, 23, 27, 30, 31],
      out: `Product holds its reviews    60 reviews stored, 1035 conflicts retried,  114 ms
Review is its own aggregate  60 reviews stored,    0 conflicts retried,   12 ms` },

    { t: "p", text: "With the reviews inside the product, sixty writers fought over one version number and lost over a thousand times between them, retrying until each got through. As separate aggregates there was nothing to fight over: **zero conflicts**, roughly nine times faster. And the invariant — one review per customer per product — still held in both, because the small aggregate's key is the product and the customer together, so a second review by c7 lands on the same key and is rejected." },

    { t: "callout", kind: "trap", title: "Aggregates designed from the database diagram",
      body: [
        { t: "p", text: "An aggregate is drawn around an **invariant that must hold in one transaction**, not around a foreign-key graph. If nothing requires a product and its reviews to change atomically, they are separate aggregates. The usual symptoms of an oversized aggregate are optimistic-lock failures that rise with traffic, loading a thousand objects to change one, and transactions that span several teams' data. The opposite mistake — invariants split across aggregates — shows up as data that is briefly or permanently inconsistent, and is fixed by moving the rule, not by adding a cross-aggregate transaction." }
      ] },

    { t: "table", head: ["Building block", "Identity", "Changes", "Example"], rows: [
      ["Entity", "yes, stable for life", "mutable", "Order, Customer, OrderLine"],
      ["Value object", "none — equal if values equal", "immutable; replace it", "Money, Address, DateRange"],
      ["Aggregate", "the root's identity", "one transaction at a time", "Order with its lines"],
      ["Domain event", "an event ID", "never; it happened", "OrderPlaced, StockReserved"],
      ["Repository", "—", "loads and saves whole aggregates", "OrderRepository"],
      ["Domain service", "—", "stateless", "a pricing calculation across aggregates"]
    ] },

    { t: "callout", kind: "tradeoff", title: "Strategic DDD always, tactical DDD where it pays",
      body: [
        { t: "p", text: "The strategic half — contexts, language, subdomains, the context map — is cheap and helps every system, because it decides boundaries. The tactical half — aggregates, value objects, repositories, domain events in code — pays off in a core domain with rich rules; applied to a CRUD admin screen it is ceremony. A common shape is a carefully modelled core and plain CRUD for the generic and supporting parts." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Let the boundaries fall out",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "Workshops such as event storming find contexts by listing business operations and the data each one touches. Do it mechanically: given ten operations and the product fields each reads or writes, cluster the operations by how much their fields overlap, report each cluster with its fields, and list the fields that appear in more than one cluster. Compare the result with the four contexts above." }
      ],
      requirements: [
        "Measure overlap between two operations with the Jaccard similarity of their field sets",
        "Agglomerative clustering with average linkage, stopping below a similarity threshold",
        "Print each cluster's operations and fields",
        "List fields shared across clusters"
      ],
      hint: "Start with every operation in its own group; repeatedly merge the most similar pair of groups; stop when the best pair is below about 0.25.",
      solution: { lang: "python", title: "contexts_ex.py",
        code: `USE_CASES = {                                  # what each business operation reads or writes about a "product"
    "show product page":      {"product_id", "name", "description", "images", "category"},
    "search catalogue":       {"product_id", "name", "category", "description"},
    "edit listing":           {"product_id", "name", "description", "images"},
    "reserve stock":          {"sku", "product_id", "quantity", "warehouse"},
    "receive delivery":       {"sku", "quantity", "warehouse", "supplier"},
    "reorder from supplier":  {"sku", "supplier", "quantity", "reorder_level"},
    "price the basket":       {"product_id", "price", "tax_class", "discount"},
    "run a promotion":        {"product_id", "discount", "price"},
    "quote shipping":         {"sku", "weight", "dimensions", "shipping_class"},
    "print the label":        {"sku", "weight", "shipping_class"},
}

def jaccard(a, b): return len(a & b) / len(a | b)

def cluster(cases, threshold):
    """Merge the two most similar groups (average linkage) until no pair is similar enough."""
    groups = [[name] for name in cases]
    def sim(g, h): return sum(jaccard(cases[a], cases[b]) for a in g for b in h) / (len(g) * len(h))
    while True:
        pairs = [(sim(g, h), i, j) for i, g in enumerate(groups) for j, h in enumerate(groups) if i < j]
        best, i, j = max(pairs) if pairs else (0, 0, 0)
        if best < threshold: return groups
        groups[i] += groups.pop(j)

groups = cluster(USE_CASES, threshold=0.25)
owners = {}
for n, g in enumerate(groups, 1):
    fields = set().union(*(USE_CASES[u] for u in g))
    for f in fields: owners.setdefault(f, []).append(n)
    print(f"context {n}: {', '.join(g)}")
    print(f"           fields: {', '.join(sorted(fields))}")
shared = sorted(f for f, ctx in owners.items() if len(ctx) > 1)
print("fields used by more than one context:", ", ".join(f"{f} {owners[f]}" for f in shared))`,
        out: `context 1: show product page, edit listing, search catalogue
           fields: category, description, images, name, product_id
context 2: reserve stock, receive delivery, reorder from supplier
           fields: product_id, quantity, reorder_level, sku, supplier, warehouse
context 3: price the basket, run a promotion
           fields: discount, price, product_id, tax_class
context 4: quote shipping, print the label
           fields: dimensions, shipping_class, sku, weight
fields used by more than one context: product_id [1, 2, 3], sku [2, 4]`,
        notes: [
          { t: "p", text: "The four clusters are exactly catalogue, inventory, pricing and shipping, and the only fields used by more than one are **identifiers**: product_id and SKU. That is the signature of good boundaries — contexts share keys and events, not attributes. If description or price had appeared in several clusters, it would mean either a missing context or one that needs to publish that data to the others." },
          { t: "p", text: "Real inputs are richer — version-control history of which files change together, database access logs of which services touch which columns — but the method is the same, and it is a useful check on boundaries drawn in a workshop." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the shared Customer table nobody could change",
      body: [
        { t: "p", text: "**Symptom.** Adding a second delivery address took a quarter. The `customers` table had 140 columns, was read by nine services and written by five, and every migration needed a cross-team review and a coordinated deploy. A column rename had once broken billing for an afternoon." },
        { t: "p", text: "**Mechanism.** \"Customer\" meant different things to marketing (consent, segments), billing (tax ID, payment methods), support (tickets, notes) and delivery (addresses, instructions), and all of it lived in one model owned by nobody. Every context's change was every other context's risk." },
        { t: "p", text: "**Fix.** The teams split the table along context lines: each context got its own customer model with only its fields, keyed by the same customer ID, and identity became a small service publishing CustomerRegistered and CustomerDeleted events (the latter driving GDPR erasure in every context). Delivery added multiple addresses the following sprint without asking anyone." }
      ] }
  ],

  takeaways: [
    "A **bounded context** is a boundary where one model and one vocabulary are consistent; it usually maps to a team and a module or service.",
    "One shared model of a business noun couples every team that uses it; give each context its **own model**, sharing only **IDs and events**.",
    "Invest in the **core domain**, build supporting domains simply, and **buy generic** ones.",
    "A **context map** names each integration: customer–supplier, conformist, **anti-corruption layer**, open host with a published language.",
    "An **aggregate** is a consistency boundary: one root, invariants enforced inside, one per transaction, others referenced **by ID**.",
    "An aggregate is also a **unit of contention**: measured, reviews inside one product caused **over 1,000 conflicts**; reviews as their own aggregates, **zero**, roughly **9× faster**.",
    "Size aggregates by **invariants that must hold atomically**, not by the foreign keys in a schema.",
    "Clustering operations by the fields they touch recovered the **four contexts**, which shared only **product_id and SKU**.",
    "Apply strategic DDD everywhere; tactical DDD where the domain's rules are rich enough to repay it."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Catalogue, inventory, pricing and shipping all need \"product\" data. What does DDD recommend?",
        options: ["One Product table shared by all four, to avoid duplication", "A separate product model per context with only the fields it needs, linked by a shared product ID and events", "Merge the four teams", "Store all product data in a document database"],
        answer: 1,
        why: "Each context's notion of a product differs and changes for different reasons, so each keeps its own model; identifiers and events connect them. A shared table couples all four teams, merging teams avoids the question, and the storage technology does not change the coupling." },

      { stem: "Popular products get hundreds of reviews per minute, and review writes keep failing with optimistic-lock conflicts. What is the likely design problem?",
        options: ["The database is too slow", "Reviews were modelled inside the Product aggregate, so every review contends for the product's version", "Optimistic locking should be replaced with no locking", "Reviews need a cache"],
        answer: 1,
        why: "An aggregate is a unit of contention; putting reviews inside the product makes every review a write to the same aggregate. Making each review its own aggregate removed all conflicts in the simulation. Dropping concurrency control would lose writes, and neither a faster database nor a cache addresses the contention." },

      { stem: "Your payments context integrates with an external provider whose API uses its own statuses, amounts in minor units and error codes. Which context-map relationship fits?",
        options: ["Shared kernel", "Anti-corruption layer: translate the provider's model at the boundary so it does not leak into yours", "Conformist: use the provider's model everywhere", "Separate ways"],
        answer: 1,
        why: "An anti-corruption layer — an adapter at context scale — protects your model from a foreign one. Conforming would spread the provider's statuses and units through your code, a shared kernel is for two internal contexts, and you cannot go separate ways from your payment provider." },

      { stem: "Which subdomain should get the most modelling effort and the strongest engineers?",
        options: ["Generic, because it is used by everyone", "Core, because it is what differentiates the business", "Supporting, because there are more of them", "Whichever has the most code"],
        answer: 1,
        why: "The core domain is the competitive advantage, so it repays careful modelling. Generic subdomains like identity or email are best bought, and supporting ones built simply. Code volume is not a measure of business value." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "DDD questions test whether your boundaries come from the business.",
    questions: [
      { level: "advanced",
        q: "Explain DDD and how you would apply it to an e-commerce platform.",
        strong: "A strong answer covers strategic design first, then aggregates, and links contexts to teams and services.",
        answer: [
          { t: "p", text: "DDD designs software around the business domain. Strategically, I would find bounded contexts — catalogue, ordering, pricing, inventory, payments, shipping, identity — each with its own model and language: a product in the catalogue has photos and descriptions, in inventory a SKU and quantity. I would classify them: ordering and pricing as core, the rest supporting, identity generic and bought. Contexts integrate through IDs and domain events — OrderPlaced, PaymentTaken — with an anti-corruption layer around the payment provider." },
          { t: "p", text: "Tactically, inside ordering the Order is an aggregate root with its lines; it enforces invariants such as the total matching the lines and legal status changes, is saved in one transaction with a version, and refers to customers and products by ID. Each context maps to a team and starts as a module in a modular monolith, extracted into a service only when it needs to deploy or scale independently." }
        ] },

      { level: "advanced",
        q: "How do you decide how big an aggregate should be?",
        strong: "A strong answer ties size to invariants and contention, with an example of each mistake.",
        answer: [
          { t: "p", text: "From the invariants that must hold at the end of every transaction: include what those rules need and nothing else. Everything else is referenced by ID and updated eventually through events." },
          { t: "p", text: "Too large, and the aggregate becomes a contention point and a slow load — reviews inside a product make every review conflict with every other. Too small, and an invariant spans aggregates and cannot be enforced without a distributed transaction — the fix is to move the rule or the boundary, or accept eventual consistency with a compensating action if the business can live with it." }
        ] },

      { level: "core",
        q: "What is a bounded context, and how does it relate to a microservice?",
        strong: "A strong answer distinguishes the concepts and says when they coincide.",
        answer: [
          { t: "p", text: "A bounded context is a modelling boundary: inside it, terms and the model are consistent. A microservice is a deployment boundary. A good default is one context per service, or per module in a modular monolith, owned by one team." },
          { t: "p", text: "They need not be one-to-one: a context can be deployed as several services for scaling reasons, and a small team may host several contexts in one deployable. What should not happen is one service spanning contexts with conflicting models, or one context split so that its invariants cross a network." }
        ] }
    ]
  }
});
