/* ============================================================================
   LESSON 12.6 — API Design That Ages Well
   ========================================================================= */
EC.receiveLesson({
  id: "12.6",

  lede: "An API is a promise you cannot take back. Once someone has integrated, every field you return is load-bearing and every behaviour is depended on — including the ones you did not intend. **The design work is not the first version**; it is arranging things so the fifth version does not break anyone who wrote against the first.",

  objectives: [
    "Model resources so the URL structure survives new requirements",
    "Distinguish a breaking change from an additive one, precisely",
    "Choose a versioning strategy, and prefer not versioning at all",
    "Paginate, filter and sort in ways that stay correct at scale",
    "Deprecate a field without an incident"
  ],

  prerequisites: ["12.1", "12.4"],

  blocks: [

    { t: "h2", n: "01", text: "Resources, not procedures", id: "resources" },

    { t: "table",
      head: ["Instead of", "Model as", "Why"],
      rows: [
        ["`POST /cancelOrder`", "`POST /orders/{id}/cancellation`", "Cancellation becomes a thing you can also `GET`"],
        ["`POST /getUserOrders`", "`GET /users/{id}/orders`", "Cacheable, safe, prefetchable"],
        ["`POST /updateEmail`", "`PATCH /users/{id}`", "One endpoint absorbs the next field"],
        ["`GET /searchOrders?q=`", "`GET /orders?q=`", "Filtering is a property of the collection"],
        ["`POST /orders/{id}/approve`", "`POST /orders/{id}/approvals`", "An approval has a who and a when worth returning"]
      ],
      caption: "**The test is whether the noun has state worth reading back.** A cancellation has a timestamp, a reason and an actor — so making it a resource means `GET /orders/{id}/cancellation` exists for free, where a `cancelOrder` verb gives you nowhere to put any of it."
    },

    { t: "callout", kind: "insight", title: "Actions that are genuinely not resources", body: [
      { t: "p", text: "Not everything is a noun, and forcing it produces worse URLs than the verb it replaced. A few operations are genuinely procedures, and the honest shape is a sub-path that says so." },
      { t: "code", lang: "python", title: "where a verb is the right answer", numbered: false, code: `
POST /orders/{id}/actions/recalculate      # no state to read back
POST /reports/{id}/actions/regenerate
POST /search                                # a query too large for a URL
POST /batch                                 # several operations, one call`},
      { t: "p", text: "**`POST /search` is the common legitimate case**: a query with twenty filters exceeds practical URL length limits and leaks parameters into access logs and browser history. Losing cacheability is the price, and it is usually worth it." },
      { t: "p", text: "**Be consistent about it.** A single `/actions/` convention is far better than half the API being nouns and half being verbs with no rule a reader can infer." }
    ]},

    { t: "h2", n: "02", text: "What actually breaks a client", id: "breaking" },

    { t: "viz",
      title: "The asymmetry",
      caption: "Adding to a response is safe because a client ignores what it does not know. Adding to a request is safe only if optional. Removing or renaming anything is a break — and so is tightening a rule that used to pass.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Two columns listing additive safe changes against breaking changes in an API">
  <rect x="14" y="26" width="418" height="256" rx="11" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="34" y="52" class="s-label" style="fill:var(--good)">SAFE — additive</text>
  <g class="s-sub">
    <text x="34" y="82">A new field in a response</text>
    <text x="34" y="106">A new OPTIONAL request field</text>
    <text x="34" y="130">A new endpoint</text>
    <text x="34" y="154">A new optional query parameter</text>
    <text x="34" y="178">A new enum value — see the trap</text>
    <text x="34" y="202">Relaxing a validation rule</text>
    <text x="34" y="226">A new error CODE in an existing shape</text>
  </g>
  <text x="34" y="262" class="s-sub" style="fill:var(--good)">Clients ignore what they do not know about.</text>

  <rect x="468" y="26" width="418" height="256" rx="11" style="fill:none;stroke:var(--crit)" stroke-width="1.4"/>
  <text x="488" y="52" class="s-label" style="fill:var(--crit)">BREAKING</text>
  <g class="s-sub">
    <text x="488" y="82">Removing or renaming a field</text>
    <text x="488" y="106">Changing a type — 1 to "1", int to float</text>
    <text x="488" y="130">Making an optional request field required</text>
    <text x="488" y="154">TIGHTENING validation</text>
    <text x="488" y="178">Changing a status code for a case</text>
    <text x="488" y="202">Changing default sort or page size</text>
    <text x="488" y="226">Changing the meaning of a field</text>
  </g>
  <text x="488" y="262" class="s-sub" style="fill:var(--crit)">The last one is the worst: nothing in the schema changes.</text>
</svg>`
    },

    { t: "callout", kind: "trap", title: "The breaking changes that look additive", body: [
      { t: "code", lang: "python", title: "four that pass review", numbered: false, code: `
# 1. A new enum value. Additive for you, breaking for a client whose
#    switch has no default branch -- and for one that validates the
#    response against a generated model with a strict enum.
status: Literal["pending", "paid", "cancelled", "disputed"]   # new

# 2. Tightening validation. The field is unchanged; requests that
#    worked yesterday now 422.
sku: str                              -> Field(pattern=r"^[A-Z]{2}-\\d{4}$")

# 3. Changing a numeric type. JSON has one number type, so 100 becoming
#    100.0 changes the string form and breaks exact comparisons.
total: int                            -> total: float

# 4. Changing the MEANING while keeping the name and type.
#    "total" was ex-VAT; now it includes VAT. Nothing in the schema
#    moves, every schema diff passes, and every client is wrong.`},
      { t: "p", text: "**The fourth is the one that causes real damage**, because no tool detects it. A field whose semantics change is a silent break, and the only defence is treating meaning as part of the contract — a new field with a new name rather than a redefinition of an old one." },
      { t: "p", text: "**Tell clients to ignore unknown values.** Documenting \"treat an unrecognised `status` as `unknown`\" upfront is what makes a new enum value additive in practice rather than only in theory." }
    ]},

    { t: "h2", n: "03", text: "Versioning", id: "versioning" },

    { t: "ladder",
      title: "Shipping a change that would break clients",
      rungs: [
        { level: "bad", label: "Version the whole API",
          why: "`/v2/` duplicates every endpoint, including the ninety that did not change. Both versions need maintaining, bug fixes land in one and not the other, and clients have no incremental path — they migrate everything or nothing.",
          code: `/v1/orders   /v1/customers   /v1/invoices   ...
/v2/orders   /v2/customers   /v2/invoices   ...
# 90 endpoints duplicated to change one field` },
        { level: "ok", label: "Version the endpoint that changed",
          why: "Only the affected resource is duplicated, so the surface stays small and clients migrate one endpoint at a time. Still two code paths for one concept, and the old one accumulates the fixes nobody backports.",
          code: `/orders          # v1 behaviour, kept
/v2/orders       # the new shape
# Everything else is untouched and unversioned.` },
        { level: "best", label: "Do not break it in the first place",
          why: "Add the new field alongside the old, populate both, and remove the old one only when telemetry says nobody reads it. Most \"breaking\" changes are avoidable at the cost of one duplicated field for a while.",
          code: `class OrderPublic(BaseModel):
    # The old field, kept and populated
    total: Decimal = Field(
        deprecated=True,
        description="Ex-VAT total. Deprecated: use total_excluding_tax.",
    )
    # The new, unambiguous pair
    total_excluding_tax: Decimal
    total_including_tax: Decimal

# Then: measure who still reads "total", contact them, and remove it
# once the number is zero.`,
          note: "**Versioning is what you do when you have run out of ways to avoid breaking.** It is a real tool and a permanent cost, so the order is: avoid, then version narrowly, then version broadly." }
      ]
    },

    { t: "table",
      head: ["Strategy", "Looks like", "Trade-off"],
      rows: [
        ["URL path", "`/v2/orders`", "Obvious, cacheable, greppable. Duplicates URLs"],
        ["Header", "`Accept: application/vnd.acme.v2+json`", "Clean URLs. Invisible in logs and hard to test by hand"],
        ["Query parameter", "`/orders?version=2`", "Easy. Easy to omit, and caches key on it inconsistently"],
        ["Date-based", "`Acme-Version: 2026-06-01`", "**Fine granularity**, each client pinned. Needs real transformation machinery"],
        ["None", "Additive only, forever", "**The goal.** Requires discipline about what you promise"]
      ],
      caption: "**Date-based versioning is what large public APIs converge on** — a client pins a date, the server transforms newer responses back into the older shape, and there is no `/v2/`. It is also the most machinery, so it earns its place only with many external consumers."
    },

    { t: "h2", n: "04", text: "Pagination, filtering, sorting", id: "collections" },

    { t: "code", lang: "python", title: "cursor pagination, and why not offsets", code: `
class Page(BaseModel):
    """An envelope, so adding metadata later is additive. A bare list
    has nowhere to put a cursor without a breaking change."""
    data: list[OrderPublic]
    next_cursor: str | None = None
    has_more: bool


@app.get("/orders", response_model=Page)
def list_orders(
    db: DB,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
) -> Page:
    query = select(Order).order_by(Order.created_at.desc(), Order.id.desc())

    if cursor:
        created_at, order_id = decode_cursor(cursor)
        # A composite comparison on the SAME columns as the ORDER BY.
        # Ordering by a non-unique column alone makes the boundary
        # ambiguous and rows are skipped or repeated.
        query = query.where(
            tuple_(Order.created_at, Order.id) < (created_at, order_id)
        )

    rows = db.execute(query.limit(limit + 1)).scalars().all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    return Page(
        data=rows,
        next_cursor=encode_cursor(rows[-1]) if has_more and rows else None,
        has_more=has_more,
    )
`,
      hl: [4, 22, 26],
      caption: "**Fetching `limit + 1` is how you know whether there is a next page** without a second `COUNT` query — which on a large table is the expensive part of the request."
    },

    { t: "callout", kind: "tradeoff", title: "Offset versus cursor", body: [
      { t: "table",
        head: ["", "Offset", "Cursor"],
        rows: [
          ["Jump to page 50", "**Yes**", "No — sequential only"],
          ["Total count", "Natural", "Needs a separate query"],
          ["Correct under concurrent writes", "**No** — rows skipped and repeated", "**Yes**"],
          ["Cost at page 10,000", "**O(offset)** — the database counts past them", "O(limit)"],
          ["Right for", "A human paging a small admin table", "**An API consumed by machines**"]
        ]
      },
      { t: "code", lang: "python", title: "the offset bug, concretely", numbered: false, code: `
# Page 1: rows 1-20 of a table ordered by created_at DESC
# A new order arrives, becoming row 1.
# Page 2 (?offset=20): what was row 20 is now row 21 -- so the client
# sees row 20 twice and never sees what has shifted past the boundary.

# It is not rare: any collection with active writes does this on every
# scan, and it presents as "the export is missing records".`},
      { t: "p", text: "**Offer both if you must**, and default to the cursor. An admin UI that wants page numbers can pass an offset; an integration exporting everything gets correctness." }
    ]},

    { t: "code", lang: "python", title: "filtering and sorting without opening a hole", code: `
SORTABLE = {"created_at": Order.created_at, "total": Order.total}


@app.get("/orders", response_model=Page)
def list_orders(
    db: DB,
    status: Annotated[list[OrderStatus] | None, Query()] = None,
    created_after: Annotated[datetime | None, Query()] = None,
    min_total: Annotated[Decimal | None, Query(ge=0)] = None,
    sort: Annotated[str, Query(pattern=r"^-?(created_at|total)$")] = "-created_at",
) -> Page:
    query = select(Order)

    # Typed, explicit filters. NOT a generic ?filter=<expression>, which
    # is an injection surface and an unbounded query planner problem.
    if status:
        query = query.where(Order.status.in_(status))
    if created_after:
        query = query.where(Order.created_at >= created_after)
    if min_total is not None:
        query = query.where(Order.total >= min_total)

    # An ALLOWLIST, not getattr(Order, field) -- which would let a caller
    # sort by any column, including ones not indexed and ones not public.
    descending = sort.startswith("-")
    column = SORTABLE[sort.lstrip("-")]
    query = query.order_by(column.desc() if descending else column.asc())
    ...
`,
      hl: [10, 16, 26],
      caption: "**`getattr(Order, sort_field)` is the injection here.** It lets a caller order by an unindexed column — a full table sort on demand — or by an internal one, which leaks its existence through timing and error messages."
    },

    { t: "h2", n: "05", text: "Deprecating without an incident", id: "deprecation" },

    { t: "code", lang: "python", title: "the sequence that works", code: `
# 1. ADD the replacement. Populate both. Nothing breaks.
class OrderPublic(BaseModel):
    total: Decimal = Field(deprecated=True)      # shows in OpenAPI
    total_excluding_tax: Decimal
    total_including_tax: Decimal


# 2. ANNOUNCE. Changelog, email, and headers on the response.
@app.get("/orders/{oid}", response_model=OrderPublic)
def get_order(oid: OrderId, response: Response):
    response.headers["Deprecation"] = "Sat, 01 Nov 2026 00:00:00 GMT"
    response.headers["Sunset"] = "Sun, 01 Feb 2027 00:00:00 GMT"
    response.headers["Link"] = '</docs/migration/total>; rel="deprecation"'
    ...


# 3. MEASURE. This is the step people skip, and it is the one that
#    turns removal from a guess into a decision.
@app.middleware("http")
async def track_deprecated_usage(request, call_next):
    response = await call_next(request)
    if requested_fields(request) & DEPRECATED_FIELDS:
        metrics.increment("deprecated_field_read", tags={
            "field": "total",
            "client": request.headers.get("User-Agent", "unknown"),
        })
    return response


# 4. CONTACT the clients the metric names.
# 5. REMOVE, once the count has been zero for a full billing cycle.
`,
      hl: [11, 12, 21, 22],
      caption: "**Steps 3 and 4 are what separate a deprecation from an outage.** Without usage data, removal is a guess — and the client still using it is always the one that cannot be redeployed quickly."
    },

    { t: "callout", kind: "insight", title: "Sparse fieldsets make removal easier", body: [
      { t: "code", lang: "python", title: "let clients say what they need", numbered: false, code: `
GET /orders/o-1?fields=id,total_including_tax

# Two benefits, and the second is the strategic one:
#   1. smaller responses for mobile clients
#   2. the server LEARNS which fields are actually used, which turns
#      "can we remove this?" into a query rather than a debate`},
      { t: "p", text: "**Keep the default the full object.** A sparse fieldset is an optimisation a client opts into; making it mandatory means every consumer must enumerate fields and a new field reaches nobody." },
      { t: "p", text: "**Validate the field list against an allowlist**, for the same reason as the sort parameter — otherwise it is another way to probe for internal attributes." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Review a proposed change set for breakage",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A team proposes eight changes to a public API with forty integrations. Classify each as safe, breaking or silently breaking, and give a shipping plan for the ones that are not safe." },
        { t: "code", lang: "python", numbered: false, title: "the proposal", code: `
# 1. Add "currency" to the order response.
# 2. Rename "customer" to "customer_id" for clarity.
# 3. Add "partial_refund" to the status enum.
# 4. Change "total" from ex-VAT to inc-VAT (finance asked).
# 5. Add a required "idempotency_key" header to POST /refunds.
# 6. Change the default page size from 50 to 20 (performance).
# 7. Return 404 instead of 200-with-empty-list for an unknown customer.
# 8. Tighten "reference" validation to ^[A-Z]{2}\\d{6}$ (it was any string).`},
        { t: "p", text: "Two of the eight are silently breaking — no schema diff detects them." }
      ],
      requirements: [
        "Classify all eight, with the failure each causes.",
        "Identify the two that no schema diff would catch.",
        "Give a non-breaking path for each unsafe change.",
        "Say which one you would refuse outright, and why.",
        "Give the CI check that would have caught the detectable ones.",
        "**Explain why number 6 breaks clients even though nothing in the schema changes.**"
      ],
      hint: "For 6, think about what a client does with a page of results and how it decides whether to fetch more. For 4, ask what a schema diff actually compares.",
      solution: {
        lang: "python",
        title: "review.md",
        code: `# =========================================================================
# THE CLASSIFICATION
# =========================================================================
#
#   #  change                          verdict            detectable?
#   -  ------------------------------  -----------------  -----------
#   1  add "currency" to a response    SAFE               n/a
#   2  rename customer -> customer_id  BREAKING           yes
#   3  new enum value                  BREAKING in prac.  yes
#   4  total ex-VAT -> inc-VAT         SILENTLY BREAKING  NO
#   5  new required header             BREAKING           yes
#   6  default page size 50 -> 20      SILENTLY BREAKING  NO
#   7  200-empty -> 404                BREAKING           yes
#   8  tighten validation              BREAKING           yes
#
# Only ONE of eight is genuinely safe.


# =========================================================================
# 1 — ADD "currency"                                              SAFE
# =========================================================================
# Additive to a response. Clients ignore fields they do not know about.
# Ship it.
#
# One caveat worth stating: a client validating responses against a
# generated model with extra="forbid" WILL break. That is their bug,
# and it is worth documenting "we add fields; ignore unknown ones" in
# the API's compatibility policy so the expectation is explicit.


# =========================================================================
# 2 — RENAME customer -> customer_id                          BREAKING
# =========================================================================
# Every client reading response["customer"] gets a KeyError.
#
# NON-BREAKING PATH:
#   a) add customer_id, populate BOTH from the same value
#   b) mark customer deprecated in the schema, add Deprecation and
#      Sunset headers
#   c) measure reads of customer per client
#   d) remove when the count has been zero for a full billing cycle
#
# Cost: one duplicated field for perhaps two quarters. Compare with
# forty integrations breaking on a Tuesday.


# =========================================================================
# 3 — NEW ENUM VALUE "partial_refund"       BREAKING IN PRACTICE
# =========================================================================
# Additive in theory. In practice it breaks:
#   - clients whose switch has no default branch (silent wrong behaviour,
#     or a crash)
#   - clients validating against a generated model with a strict enum
#     (a hard failure on a valid response)
#
# NON-BREAKING PATH:
#   - announce first, with a lead time
#   - document "treat an unrecognised status as 'unknown'" in the
#     compatibility policy -- ideally before the first release, because
#     it cannot be added retroactively
#   - if the API is date-versioned, map partial_refund -> refunded for
#     clients pinned to an older date
#
# This is the change most worth having a stated policy for, because the
# policy makes it additive for every FUTURE value too.


# =========================================================================
# 4 — total FROM EX-VAT TO INC-VAT      SILENTLY BREAKING  <- refuse
# =========================================================================
# The field name is unchanged. The type is unchanged. The schema diff
# is EMPTY. Every automated check passes.
#
# And every client that reconciles, invoices or displays a price is now
# wrong by the VAT rate -- silently, with no error anywhere, until
# someone's accounts do not balance.
#
# THIS IS THE ONE TO REFUSE OUTRIGHT. Not "do it carefully" -- do not
# do it at all. Redefining a field's meaning while keeping its name is
# the single most damaging change an API can make, because it defeats
# every mechanism designed to catch breakage:
#
#   schema diff       passes (nothing changed)
#   contract tests    pass (the type is right)
#   client tests      pass (the field exists)
#   monitoring        clean (no errors)
#
# NON-BREAKING PATH -- add, never redefine:
#
#   total: Decimal                    # unchanged, ex-VAT, deprecated
#   total_excluding_tax: Decimal      # explicit
#   total_including_tax: Decimal      # what finance wanted
#   tax_amount: Decimal
#
# The new names also fix the original sin: "total" was always ambiguous,
# which is why this request arose. Deprecate it and let it die.


# =========================================================================
# 5 — REQUIRED Idempotency-Key HEADER                         BREAKING
# =========================================================================
# Every existing client gets a 400 on their next refund. Given what
# POST /refunds does, that is a production incident for forty
# integrations simultaneously.
#
# The intent is right -- refunds SHOULD be idempotent (Lesson 12.1) --
# so the answer is sequencing, not refusal:
#
#   a) accept the header, optional. Honour it when present.
#   b) when absent, derive a key from a fingerprint of the request
#      (order_id + amount + a coarse time bucket) so retries are
#      protected even for clients who have not adopted it
#   c) return a Deprecation-style warning header when it is missing
#   d) measure adoption per client
#   e) make it required only after every client sends it -- and even
#      then, consider whether (b) is simply good enough forever


# =========================================================================
# 6 — DEFAULT PAGE SIZE 50 -> 20         SILENTLY BREAKING  <- the subtle one
# =========================================================================
# WHY THIS BREAKS CLIENTS WITH NO SCHEMA CHANGE:
#
# A client that never sends ?limit gets 20 items where it used to get
# 50. Nothing in the schema mentions the default, so no diff detects it.
# What breaks:
#
#   a) A client that treats "fewer than 50 returned" as "last page":
#
#        while True:
#            page = get("/orders", params={"offset": n})
#            process(page)
#            if len(page) < 50:      # hard-coded assumption
#                break
#
#      Now every first page looks like the last, and the client
#      silently processes 20 of 10,000 records. No error, no alert --
#      just missing data in a downstream report.
#
#   b) A client with an overall timeout budget assuming N pages now
#      needs 2.5N requests and starts timing out.
#
#   c) Any client that hard-coded 50 anywhere in its logic.
#
# The general rule: A DEFAULT IS PART OF THE CONTRACT. It is not in the
# schema, so it looks changeable, and it is exactly as depended-upon as
# a field name.
#
# NON-BREAKING PATH:
#   - keep the default at 50
#   - add has_more and next_cursor to the envelope so clients stop
#     inferring the last page from a count (fixing the real problem)
#   - lower the MAXIMUM if the concern is expensive queries, which
#     affects only clients explicitly asking for more
#   - change the default only for a new version, or never


# =========================================================================
# 7 — 200-EMPTY-LIST -> 404 FOR UNKNOWN CUSTOMER              BREAKING
# =========================================================================
# Clients doing response.raise_for_status() now raise where they
# previously got an empty list and carried on.
#
# It is also arguably WRONG on the merits: GET /customers/{id}/orders
# asks for a collection. An empty collection is a valid answer; the
# question of whether the customer exists is a different question, and
# GET /customers/{id} answers it.
#
# NON-BREAKING PATH: do not make this change. If distinguishing
# "no orders" from "no such customer" genuinely matters, the caller
# should check the customer resource -- or the envelope can carry it:
#
#   {"data": [], "customer_exists": false}
#
# ...which is additive.


# =========================================================================
# 8 — TIGHTEN reference VALIDATION                            BREAKING
# =========================================================================
# The field is unchanged in the schema shape, but requests that
# succeeded yesterday now return 422. Any client with an existing
# reference not matching the new pattern is broken immediately -- and
# historical data may violate it too.
#
# NON-BREAKING PATH:
#   a) accept both, log non-conforming values with the client id
#   b) find out how many there are and who sends them -- this is
#      usually the surprise, and often the reason to abandon the change
#   c) announce, with a date
#   d) reject only after the logged count reaches zero
#
# Note the asymmetry: RELAXING validation is always safe, TIGHTENING it
# never is. That asymmetry is worth remembering when writing the FIRST
# version, because it is much easier to loosen later than to tighten.


# =========================================================================
# THE CI CHECK
# =========================================================================
#
#   - name: API contract
#     run: |
#       python -c "import json; from app.main import app; \\
#                  print(json.dumps(app.openapi()))" > pr.json
#       git show origin/main:openapi.json > main.json
#       oasdiff breaking main.json pr.json --fail-on ERR
#
# This catches 2, 3, 5, 7 and 8 -- five of the seven unsafe changes,
# before review.
#
# It does NOT catch 4 or 6, which is the point of this exercise:
#
#   4  the schema is byte-identical; only the MEANING changed
#   6  the default is not expressed in the schema at all
#
# For those, the defence is not a tool:
#   - a written policy that a field's meaning is immutable; a new
#     meaning requires a new name
#   - defaults treated as part of the contract, and listed explicitly
#     in the compatibility document alongside field names
#
# Add a golden-response test for the highest-traffic endpoints too --
# a committed JSON fixture compared byte-for-byte catches a changed
# default immediately, though it cannot catch a changed meaning either.


# =========================================================================
# THE SUMMARY FOR THE TEAM
# =========================================================================
#
#   SHIP NOW:        1
#   SHIP AS ADDITIVE: 2, 4, 5, 7  (add the new thing; keep the old)
#   ANNOUNCE FIRST:  3, 8         (with a measured migration window)
#   DO NOT SHIP:     6            (and fix the real problem: give
#                                  clients has_more so they stop
#                                  inferring the last page)
#   REFUSE:          4 as proposed. Redefinition is not a change that
#                    can be made carefully; it can only be avoided.


# =========================================================================
# TESTS
# =========================================================================

def test_deprecated_fields_are_still_populated(client):
    """The whole additive strategy rests on this: the old field must
    keep working for its full deprecation window."""
    order = client.get("/orders/o-1").json()

    assert order["customer"] == order["customer_id"]
    assert order["total"] == order["total_excluding_tax"]


def test_the_default_page_size_has_not_changed(client):
    """A default is part of the contract even though it is not in the
    schema. This is the test that would have blocked change 6."""
    seed_orders(100)

    assert len(client.get("/orders").json()["data"]) == 50


def test_an_unknown_customer_returns_an_empty_collection(client):
    """Change 7, pinned. An empty collection is a valid answer."""
    r = client.get("/customers/c-does-not-exist/orders")

    assert r.status_code == 200
    assert r.json()["data"] == []


def test_previously_valid_references_are_still_accepted(client):
    """Change 8, pinned to the historical shape until the migration
    window closes."""
    for legacy in ("ref-123", "ORDER/2024/0001", "x"):
        r = client.post("/orders", json={"reference": legacy, **VALID})
        assert r.status_code == 201, f"{legacy!r} was rejected"


def test_the_schema_has_no_breaking_changes_against_main():
    """The automated half. Catches 2, 3, 5, 7, 8 -- not 4 or 6."""
    import subprocess

    current = json.dumps(app.openapi())
    Path("pr.json").write_text(current)
    result = subprocess.run(
        ["oasdiff", "breaking", "main.json", "pr.json", "--fail-on", "ERR"],
        capture_output=True, text=True,
    )

    assert result.returncode == 0, result.stdout`,
        notes: [
          { t: "p", text: "**Change 4 is the one to refuse rather than manage.** Redefining a field's meaning while keeping its name defeats every mechanism designed to catch breakage — the schema diff is empty, contract tests pass, client tests pass, and monitoring is clean. The failure appears weeks later when someone's accounts do not balance." },
          { t: "p", text: "**Change 6 is the subtle one, and the reasoning generalises.** A default is not in the schema, so it looks changeable — but a client inferring \"last page\" from a short result silently processes 20 records out of 10,000, with no error anywhere. Treat defaults as part of the contract and list them explicitly." },
          { t: "p", text: "**The right response to 6 is to fix the underlying problem.** Clients infer the last page from a count because the API never told them; adding `has_more` and `next_cursor` removes the guess and is purely additive. That is usually the shape of a good answer — the breaking change was a symptom of a missing field." },
          { t: "callout", kind: "insight", title: "Relaxing is always safe; tightening never is", body: [
            { t: "p", text: "Change 8 makes the asymmetry concrete. You can always accept more than you did; you can never accept less without breaking whoever was relying on the looser rule." },
            { t: "p", text: "The consequence is a design rule for version one: be as strict as you can afford at the start, because loosening later is free and tightening later is an incident. It is the opposite of the instinct to be permissive early." }
          ]},
          { t: "p", text: "**`oasdiff` in CI catches five of the seven**, which is the honest measure of what tooling buys. It is worth having for exactly that reason — and worth knowing that the two it misses are the two that cause the quietest damage." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team renames a response field from `customer` to `customer_id` for clarity. It is a two-character-per-line change, it passes review, and every one of their own tests passes because they updated them in the same commit." },
      { t: "p", text: "**Forty integrations broke within the hour.** Their own test suite could not have caught it — the tests were updated alongside the code, which is exactly what makes a rename look safe. The clients were not in the repository." },
      { t: "p", text: "**The rollback was fast; the trust was not.** Two of the largest customers added a manual approval step to their upgrade process, and one asked for a contractual notice period on API changes — which the team then had to honour for every future change, including the safe ones." },
      { t: "p", text: "**A schema diff in CI would have caught this in ninety seconds.** The deeper lesson is that your test suite validates your understanding of the contract, not your clients' — so the only checks that mean anything are ones that compare against what you shipped last, not against what you meant." }
    ]}
  ],

  takeaways: [
    "**Model resources, not procedures.** The test is whether the noun has state worth reading back — a cancellation has a time, a reason and an actor.",
    "**A consistent `/actions/` convention is better than half-nouns and half-verbs**, and `POST /search` is a legitimate case when the query is too large for a URL.",
    "**Adding to a response is safe; removing, renaming or retyping is not.** Clients ignore what they do not know about.",
    "**A new enum value is breaking in practice** unless you told clients in advance to treat unrecognised values as unknown.",
    "**Changing a field's meaning while keeping its name is the most damaging change an API can make**, because no schema diff, contract test or monitor detects it.",
    "**A default is part of the contract**, even though it is not in the schema — changing a default page size silently truncates clients that infer the last page from a short result.",
    "**Relaxing validation is always safe; tightening it never is.** So be as strict as you can afford in version one.",
    "**Prefer not breaking to versioning.** Add the new field, populate both, and remove the old one when telemetry says nobody reads it.",
    "**Version the endpoint, not the API**, when you must — `/v2/orders` beats duplicating ninety unchanged endpoints.",
    "**Use cursor pagination for machine consumers.** Offsets skip and duplicate rows under concurrent writes, and cost O(offset) at depth.",
    "**Return an envelope, not a bare list**, so `has_more` and `next_cursor` can be added without a breaking change.",
    "**Allowlist sortable and filterable fields.** `getattr(Model, field)` lets a caller sort by an unindexed or internal column.",
    "**Measure usage before removing anything.** Deprecation without telemetry is a guess, and the client still using it is always the one that cannot redeploy quickly."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A team changes `total` from excluding VAT to including VAT, keeping the name and type. Why is this the most dangerous kind of change?",
        options: [
          "It requires a database migration",
          "No automated check detects it — the schema diff is empty, contract tests pass, and monitoring is clean, while every client is now wrong",
          "It breaks JSON serialisation of decimals",
          "It changes the response size"
        ],
        answer: 1,
        why: "Every mechanism designed to catch breakage compares structure, and the structure is identical. The failure surfaces weeks later when someone's reconciliation does not balance, with nothing pointing at the API change. The rule is that a field's meaning is immutable: a new meaning needs a new name, which also removes the ambiguity that prompted the request."
      },
      {
        stem: "Changing the default page size from 50 to 20 breaks clients. How, given the schema is unchanged?",
        options: [
          "The response envelope changes shape",
          "A client that treats \"fewer than 50 returned\" as the last page now stops after one page, silently processing 20 records out of 10,000",
          "Pagination cursors are invalidated",
          "The status code changes for partial results"
        ],
        answer: 1,
        why: "Defaults are not expressed in the schema, so they look changeable, and they are exactly as depended-upon as a field name. The right fix is to remove the client's need to guess: adding `has_more` and `next_cursor` is purely additive and eliminates the inference that made the change dangerous."
      },
      {
        stem: "Why prefer cursor pagination over offsets for an API consumed by machines?",
        options: [
          "Cursors allow jumping to an arbitrary page",
          "Offsets skip and duplicate rows when the collection is written to during a scan, and cost O(offset) at depth",
          "Cursors are required by the OpenAPI specification",
          "Offsets cannot be combined with filters"
        ],
        answer: 1,
        why: "An offset means \"skip N rows of the current result\", and the current result changes as data is written — so a row inserted near the front pushes another across a page boundary and it is never seen. It presents as \"the export is missing records\". Offsets remain reasonable for a human paging a small admin table."
      },
      {
        stem: "`query.order_by(getattr(Order, sort_field))` where `sort_field` comes from a query parameter. What is the risk?",
        options: [
          "SQL injection through the column name",
          "A caller can sort by any attribute — including unindexed columns, causing a full table sort on demand, and internal ones, revealing their existence",
          "The ORM will raise on an invalid attribute",
          "Sorting cannot be combined with pagination"
        ],
        answer: 1,
        why: "The ORM parameterises values, so classic injection is not the issue — the problem is that the caller chooses the column. An unindexed column means an expensive sort triggered by a query string, and probing for internal column names turns error messages and timing into an enumeration oracle. An explicit allowlist maps public names to columns you have chosen."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What counts as a breaking change to an API?",
        strong: "Anything a client can observe that they might depend on: removing or renaming a field, changing a type, tightening validation, changing a status code, changing a default — and changing the meaning of a field while keeping its name.",
        answer: [
          { t: "p", text: "The last one is what distinguishes a real answer, because it is the one no tool catches and the one that causes the quietest damage." },
          { t: "p", text: "Including defaults shows you have thought past the schema: a default page size is not in the OpenAPI document and is exactly as depended-upon as a field name." },
          { t: "p", text: "The relax-versus-tighten asymmetry is a useful design rule to volunteer — be strict in version one, because loosening later is free." }
        ]
      },
      {
        level: "advanced",
        q: "How would you version an API?",
        strong: "Prefer not to. Most breaking changes can be made additive: add the new field, populate both, measure who reads the old one, remove it when the count is zero. When that fails, version the endpoint rather than the whole API.",
        answer: [
          { t: "p", text: "The cost argument is what makes it convincing: `/v2/` duplicates ninety unchanged endpoints, and both versions then need every bug fix." },
          { t: "p", text: "Mentioning date-based versioning shows range — it is what large public APIs converge on, and it is also the most machinery, so it earns its place only with many external consumers." },
          { t: "p", text: "The telemetry step is the practical detail: removal without usage data is a guess, and the last client is always the one that cannot redeploy quickly." }
        ]
      },
      {
        level: "core",
        q: "How would you design a list endpoint?",
        strong: "An envelope rather than a bare list, cursor pagination, an allowlist of sortable and filterable fields, and a bounded page size. The envelope is what lets you add `has_more` or a total later without breaking anyone.",
        answer: [
          { t: "p", text: "Starting with the envelope shows forward thinking — a bare list has nowhere to put metadata, so the first thing you need is a breaking change." },
          { t: "p", text: "The offset-drift argument justifies cursors on correctness rather than performance, which is the stronger case." },
          { t: "p", text: "The sort allowlist is a small detail with a real security consequence, and `getattr` on a model is the shape to name." }
        ]
      }
    ]
  }
});
