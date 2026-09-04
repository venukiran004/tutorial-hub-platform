/* ============================================================================
   LESSON 12.4 — FastAPI Fundamentals
   ========================================================================= */
EC.receiveLesson({
  id: "12.4",

  lede: "FastAPI's central idea is that **the function signature is the contract**. Parameter types become validation, the return type becomes the response schema, and the OpenAPI document is derived from both rather than maintained alongside them — which is why it stays true. Everything else in the framework follows from taking that idea seriously.",

  objectives: [
    "Map path, query, body and header parameters from a signature",
    "Use `response_model` to make the output contract explicit and enforced",
    "Return correct status codes without writing them at every call site",
    "Read the generated OpenAPI document as the artefact it is",
    "Recognise the four mistakes that make a FastAPI service slow or wrong"
  ],

  prerequisites: ["12.3", "12.1"],

  blocks: [

    { t: "h2", n: "01", text: "The signature is the contract", id: "signature" },

    { t: "code", lang: "python", title: "where each parameter comes from", code: `
from typing import Annotated
from fastapi import FastAPI, Header, Path, Query

app = FastAPI(title="Billing API", version="1.4.0")


@app.get("/customers/{customer_id}/orders")
def list_orders(
    # In the path template -> a path parameter
    customer_id: Annotated[str, Path(pattern=r"^c-[0-9]+$")],

    # Not in the path, a scalar -> a query parameter
    status: Annotated[str | None, Query(max_length=20)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,

    # A header, named explicitly
    request_id: Annotated[str | None, Header(alias="X-Request-ID")] = None,

    # A Pydantic model -> the request body
    # (a GET has none, but this is the rule)
) -> list[OrderPublic]:
    ...
`,
      hl: [10, 14, 15, 18],
      caption: "**The rules are mechanical.** A name appearing in the path template is a path parameter; a Pydantic model is the body; anything else scalar is a query parameter. Nothing is configured — it is read from the signature (Lesson 8.7)."
    },

    { t: "callout", kind: "insight", title: "Why `Annotated` rather than a default", body: [
      { t: "code", lang: "python", title: "the old form still works and should not be used", numbered: false, code: `
# Legacy: the constraint lives in the DEFAULT slot
def old(limit: int = Query(20, ge=1, le=100)): ...

# Modern: the constraint is part of the TYPE, the default is a default
def new(limit: Annotated[int, Query(ge=1, le=100)] = 20): ...`},
      { t: "ul", items: [
        "**The function is callable directly** — `list_orders(customer_id=\"c-1\")` works in a test, where the legacy form passes a `Query` object as the value.",
        "**The type is reusable.** `PageLimit = Annotated[int, Query(ge=1, le=100)]` can be shared across every endpoint.",
        "**Type checkers understand it.** `limit: int = Query(20)` makes `mypy` see a `Query` where an `int` was declared."
      ]},
      { t: "p", text: "**Being able to call the handler as an ordinary function is the practical win** — it means a unit test needs no HTTP client at all (Lesson 9.6)." }
    ]},

    { t: "h2", n: "02", text: "response_model earns its place", id: "response" },

    { t: "viz",
      title: "What `response_model` does that a return annotation alone does not",
      caption: "It filters. A handler returning an ORM object with fifteen columns produces a response with exactly the declared fields — so a new column cannot leak, and the OpenAPI schema stays accurate.",
      svg: `<svg viewBox="0 0 900 270" role="img" aria-label="Diagram showing an ORM object with many fields being filtered by a response model down to the declared public fields">
  <rect x="14" y="34" width="250" height="200" rx="11" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="139" y="60" text-anchor="middle" class="s-label">WHAT THE HANDLER RETURNS</text>
  <g class="s-mono" style="font-size:9px">
    <text x="34" y="86">id</text>
    <text x="34" y="104">customer_id</text>
    <text x="34" y="122">total</text>
    <text x="34" y="140" style="fill:var(--crit)">cost_price</text>
    <text x="34" y="158" style="fill:var(--crit)">margin</text>
    <text x="34" y="176" style="fill:var(--crit)">fraud_score</text>
    <text x="34" y="194" style="fill:var(--crit)">internal_notes</text>
    <text x="34" y="212" style="fill:var(--crit)">_sa_instance_state</text>
  </g>

  <rect x="300" y="94" width="200" height="76" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.6"/>
  <text x="400" y="122" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">response_model=</text>
  <text x="400" y="142" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">OrderPublic</text>
  <text x="400" y="160" text-anchor="middle" class="s-sub">validate, then filter</text>

  <rect x="536" y="34" width="250" height="200" rx="11" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="661" y="60" text-anchor="middle" class="s-label" style="fill:var(--good)">WHAT THE CLIENT GETS</text>
  <g class="s-mono" style="font-size:9px">
    <text x="556" y="86">id</text>
    <text x="556" y="104">customer_id</text>
    <text x="556" y="122">total</text>
  </g>
  <text x="556" y="164" class="s-sub" style="fill:var(--good)">A column added to the table</text>
  <text x="556" y="184" class="s-sub" style="fill:var(--good)">does not appear here.</text>
  <text x="556" y="212" class="s-sub">And the OpenAPI schema says so.</text>

  <line x1="268" y1="132" x2="296" y2="132" style="stroke:var(--border-strong)" stroke-width="1.4"/>
  <line x1="504" y1="132" x2="532" y2="132" style="stroke:var(--border-strong)" stroke-width="1.4"/>
</svg>`
    },

    { t: "code", lang: "python", title: "the shape worth copying", code: `
from fastapi import status


@app.post(
    "/orders",
    response_model=OrderPublic,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": ErrorResponse, "description": "Order already exists"},
        422: {"model": ValidationErrorResponse},
    },
    summary="Create an order",
    tags=["orders"],
)
def create_order(payload: OrderCreate, response: Response) -> OrderPublic:
    """Create an order for the authenticated customer.

    This docstring becomes the endpoint description in the generated
    documentation, so it is written for the API's consumer rather than
    for the next maintainer.
    """
    order = orders.create(payload)
    response.headers["Location"] = f"/orders/{order.id}"
    return order          # an ORM object; the response_model filters it
`,
      hl: [6, 7, 9, 24],
      caption: "**`responses=` documents the failure cases.** Without it the generated schema claims the endpoint only ever returns 201, so a client generated from it has no type for the error body (Lesson 12.1)."
    },

    { t: "callout", kind: "warn", title: "The return annotation and `response_model` are not the same thing", body: [
      { t: "table",
        head: ["", "`-> OrderPublic` alone", "`response_model=OrderPublic`"],
        rows: [
          ["Filters extra fields", "**Yes** (0.89+)", "Yes"],
          ["Validates the output", "Yes", "Yes"],
          ["Works when returning an ORM object", "The checker objects", "**Yes** — declared separately"],
          ["Allows a different in/out type", "No", "**Yes**"],
          ["Appears in OpenAPI", "Yes", "Yes"]
        ]
      },
      { t: "p", text: "**Use `response_model` when the handler returns something other than the declared type** — an ORM entity, a dict, a `Response`. Use the return annotation when they genuinely match, because then the type checker helps too." },
      { t: "p", text: "**Returning a `Response` directly bypasses both.** That is sometimes right — a file download, a redirect — and it means you have opted out of validation and out of the schema, so say so in `responses=`." }
    ]},

    { t: "h2", n: "03", text: "The generated contract", id: "openapi" },

    { t: "code", lang: "python", title: "OpenAPI is an artefact, not a website", code: `
# The interactive pages are the least interesting use:
#   /docs      Swagger UI
#   /redoc     ReDoc
#   /openapi.json   the document itself

# What the document is actually for:

# 1. Generate a typed client, so consumers do not hand-write one
#    npx openapi-typescript-codegen --input openapi.json --output ./client

# 2. Detect breaking changes in CI
#    oasdiff breaking main-openapi.json pr-openapi.json

# 3. Contract tests against the schema
#    schemathesis run openapi.json --checks all

# Export it without starting the server:
python -c "
import json
from app.main import app
print(json.dumps(app.openapi()))
" > openapi.json
`,
      caption: "**The breaking-change check is the one worth adding first.** `oasdiff` in CI turns \"we removed a field nobody used\" from a support ticket into a failed build (Lesson 12.6)."
    },

    { t: "callout", kind: "insight", title: "Make the schema readable to whoever consumes it", body: [
      { t: "code", lang: "python", title: "small things that make a generated client good", numbered: false, code: `
app = FastAPI(
    title="Billing API",
    version="1.4.0",
    description="Orders, invoices and refunds.",
    # A stable operation id becomes the CLIENT METHOD NAME. Without it
    # you get "list_orders_customers__customer_id__orders_get".
    generate_unique_id_function=lambda route: f"{route.tags[0]}_{route.name}",
)


class OrderPublic(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{
                "id": "o-1042",
                "customer_id": "c-77",
                "total": "59.97",
            }]
        }
    )
    ...`},
      { t: "p", text: "**The operation id becomes a method name in every generated client.** The default is derived from the path and is unreadable, and changing it later renames methods for everyone — so it is worth setting on day one." }
    ]},

    { t: "h2", n: "04", text: "The four mistakes", id: "mistakes" },

    { t: "ladder",
      title: "An endpoint that queries a database",
      rungs: [
        { level: "bad", label: "`async def` with a blocking driver",
          why: "The handler is a coroutine, so FastAPI runs it on the event loop. The synchronous query blocks that loop, so the service handles one request at a time regardless of worker count — the most common FastAPI performance bug by a wide margin.",
          code: `@app.get("/orders")
async def list_orders(db: Session = Depends(get_db)):
    return db.query(Order).all()        # psycopg2 — BLOCKS the loop` },
        { level: "ok", label: "`def` with a blocking driver",
          why: "FastAPI runs a non-async handler in a thread pool, so blocking is contained to one thread. This is the correct answer for a synchronous stack, and it is a one-word change.",
          code: `@app.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    return db.query(Order).all()        # runs in a worker thread` },
        { level: "best", label: "`async def` with an async driver",
          why: "Nothing blocks the loop, so one process handles thousands of concurrent requests. It requires the whole stack to be async, which is a real commitment rather than a syntax choice.",
          code: `@app.get("/orders", response_model=list[OrderPublic])
async def list_orders(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Order]:
    result = await db.execute(
        select(Order).options(selectinload(Order.customer)).limit(limit)
    )
    return result.scalars().all()`,
          note: "**The rule: `async def` only if every await in the body is genuinely async.** A coroutine containing one synchronous call is strictly worse than a plain `def`, because it takes the whole loop rather than one thread (Lesson 11.6)." }
      ]
    },

    { t: "table",
      head: ["Mistake", "Symptom", "Fix"],
      rows: [
        ["`async def` around blocking I/O", "Throughput collapses under load; p99 triples", "Use `def`, or an async driver"],
        ["No `response_model`", "Internal fields leak; schema is wrong", "Declare it, always"],
        ["The dependency creates a client per request", "TLS handshake per call; pool churn", "Build at startup in `lifespan`"],
        ["Returning `dict` instead of a model", "No validation, no schema, silent shape drift", "Return a model or set `response_model`"]
      ],
      caption: "**The first one is worth checking in any FastAPI codebase you inherit.** `grep -n 'async def' | grep -v await` finds handlers declared async that never await anything — usually a sign the author added `async` because the framework's examples do."
    },

    { t: "h2", n: "05", text: "Structure", id: "structure" },

    { t: "code", lang: "python", title: "routers, and the lifespan for expensive objects", code: `
# app/api/orders.py
from fastapi import APIRouter

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderPublic])
def list_orders(...): ...


@router.post("", response_model=OrderPublic, status_code=201)
def create_order(...): ...


# app/main.py
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Anything expensive is built ONCE here, not per request: HTTP
    clients, connection pools, a loaded model."""
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=3.05))
    app.state.pool = await create_pool(settings.database_url)
    yield
    await app.state.http.aclose()
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan, title="Billing API", version="1.4.0")
app.include_router(orders.router)
app.include_router(refunds.router)
`,
      hl: [22, 23, 25, 26],
      caption: "**`lifespan` replaced `@app.on_event(\"startup\")`**, which is deprecated. The `yield` form guarantees the shutdown half runs, so a connection pool is closed rather than abandoned (Lesson 5.8)."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a service that is slow, leaky and undocumented",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "This API works. Under load it serves one request at a time, it exposes fields it should not, and the generated documentation is useless to anyone building a client." },
        { t: "code", lang: "python", numbered: false, title: "main.py — as found", code: `
app = FastAPI()

@app.get("/orders/{oid}")
async def get_order(oid, db=Depends(get_db)):
    order = db.query(Order).filter(Order.id == oid).first()
    if not order:
        return {"error": "not found"}
    return order.__dict__

@app.get("/orders")
async def list_orders(customer=None, limit=20, db=Depends(get_db)):
    q = db.query(Order)
    if customer:
        q = q.filter(Order.customer_id == customer)
    return [o.__dict__ for o in q.limit(limit).all()]

@app.post("/orders")
async def create_order(payload: dict, db=Depends(get_db)):
    order = Order(**payload)
    db.add(order)
    db.commit()
    return order.__dict__

@app.get("/rates")
async def rates():
    async with httpx.AsyncClient() as c:
        return (await c.get(RATES_URL)).json()`},
        { t: "p", text: "Seven problems. One of them makes every other endpoint slow." }
      ],
      requirements: [
        "Identify all seven and the symptom each causes.",
        "Say which one serialises the whole service, and why.",
        "Give every endpoint an input and an output contract.",
        "Fix the status codes and the not-found path.",
        "Move the HTTP client out of the request path.",
        "**Explain why `limit=20` with no annotation is a security problem, not just a typing gap.**"
      ],
      hint: "Look at what `db` is, then at whether any handler awaits anything. Then ask what `Order(**payload)` lets a client set.",
      solution: {
        lang: "python",
        title: "main.py",
        code: `# =========================================================================
# THE SEVEN PROBLEMS
# =========================================================================
#
# 1. async def WITH A SYNCHRONOUS DRIVER   <- serialises the service
#
#    Every handler is "async def", so FastAPI runs it ON THE EVENT LOOP.
#    db.query(...) is psycopg2 -- synchronous. While it runs, the loop
#    cannot service any other request.
#
#    Declared "def" instead, FastAPI would run each handler in a thread
#    pool and blocking would cost one thread out of forty. As written,
#    it costs all concurrency in the process, so the service handles one
#    request at a time no matter how many workers are configured
#    (Lesson 11.6).
#
#    Note none of these handlers awaits anything except /rates -- the
#    "async" was copied from the framework's examples.
#
# 2. NO TYPE ANNOTATIONS ON PARAMETERS
#
#    oid, customer and limit are untyped, so FastAPI applies no
#    validation at all. See the security note on limit below.
#
# 3. return order.__dict__
#
#    Exposes every attribute the entity carries -- _sa_instance_state,
#    cost_price, internal_notes -- and every column added later, with no
#    diff to review (Lesson 12.3).
#
# 4. NOT FOUND RETURNS 200
#
#    {"error": "not found"} with a 200 status. raise_for_status() passes
#    for every client, retry policies never fire, and the error-rate
#    dashboard reads zero while requests fail (Lesson 12.1).
#
# 5. Order(**payload) FROM AN UNVALIDATED dict
#
#    A mass-assignment vulnerability. A client may set ANY column:
#
#      {"customer_id": "c-1", "total": "0.01", "status": "paid",
#       "id": "o-EXISTING"}
#
#    -- setting their own price, marking it paid without paying, or
#    colliding with another order's id.
#
# 6. A NEW httpx.AsyncClient PER REQUEST
#
#    A TCP handshake and a TLS negotiation on every call to /rates, for
#    a connection thrown away immediately (Lesson 12.2).
#
# 7. NO response_model, NO status_code, NO tags, NO title
#
#    The generated OpenAPI document says every endpoint returns an
#    unspecified object. A generated client has no types, operation ids
#    are unreadable, and no error shapes are declared.


from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Path, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session


# ---- contracts ----------------------------------------------------------

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class OrderCreate(StrictModel):
    """FIX 5: the input contract is the allowlist.

    Note what is ABSENT: id, total, status, created_at. A client cannot
    set them because there is nowhere to put them -- extra="forbid"
    rejects the attempt rather than ignoring it.
    """
    customer_id: Annotated[str, Field(pattern=r"^c-\\d+$")]
    lines: Annotated[list[OrderLineIn], Field(min_length=1, max_length=100)]


class OrderPublic(StrictModel):
    """FIX 3: the output contract. A column added to the table does not
    appear here."""
    id: str
    customer_id: str
    total: Decimal
    status: str
    created_at: datetime


class ErrorResponse(StrictModel):
    error: str
    detail: str | None = None


# FIX 2: a reusable constrained type, so the bound is declared once.
PageLimit = Annotated[int, Query(ge=1, le=100)]
OrderId = Annotated[str, Path(pattern=r"^o-\\d+$", max_length=32)]


# ---- lifespan -----------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FIX 6: expensive objects built ONCE. The yield form guarantees
    the shutdown half runs, so the pool is closed rather than
    abandoned (Lesson 5.8)."""
    app.state.http = httpx.AsyncClient(
        timeout=httpx.Timeout(10.0, connect=3.05),
        limits=httpx.Limits(max_connections=20),
    )
    yield
    await app.state.http.aclose()


# ---- FIX 7: a documented application -----------------------------------

app = FastAPI(
    lifespan=lifespan,
    title="Billing API",
    version="1.4.0",
    description="Orders and exchange rates.",
    # Without this, a generated client method is called
    # "get_order_orders__oid__get".
    generate_unique_id_function=lambda r: f"{r.tags[0]}_{r.name}",
)


# ---- FIX 1: "def", not "async def" -------------------------------------
# The driver is synchronous, so these run in FastAPI's thread pool and
# blocking costs one thread rather than the whole loop.

@app.get(
    "/orders/{oid}",
    response_model=OrderPublic,
    tags=["orders"],
    responses={404: {"model": ErrorResponse}},
)
def get_order(oid: OrderId, db: Annotated[Session, Depends(get_db)]) -> Order:
    order = db.get(Order, oid)
    if order is None:
        # FIX 4: a STATUS, not a 200 with an error body.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "order not found")
    return order


@app.get("/orders", response_model=list[OrderPublic], tags=["orders"])
def list_orders(
    db: Annotated[Session, Depends(get_db)],
    # FIX 2: typed and bounded. See the security note below.
    limit: PageLimit = 20,
    customer: Annotated[str | None, Query(pattern=r"^c-\\d+$")] = None,
) -> list[Order]:
    query = select(Order).options(selectinload(Order.customer))
    if customer:
        query = query.where(Order.customer_id == customer)
    return db.execute(query.limit(limit)).scalars().all()


@app.post(
    "/orders",
    response_model=OrderPublic,
    status_code=status.HTTP_201_CREATED,
    tags=["orders"],
    responses={409: {"model": ErrorResponse}},
)
def create_order(
    payload: OrderCreate,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> Order:
    # FIX 5: fields set explicitly from the validated model. Prices come
    # from OUR catalogue; status is OUR decision.
    order = Order(
        customer_id=payload.customer_id,
        total=price_lines(payload.lines),
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # FIX 4b: 201 with a Location header (Lesson 12.1).
    response.headers["Location"] = f"/orders/{order.id}"
    return order


# ---- the one handler that IS async -------------------------------------

@app.get("/rates", response_model=dict[str, Decimal], tags=["rates"])
async def rates(request: Request) -> dict[str, Decimal]:
    """async def is CORRECT here: the only I/O is httpx, which is async,
    so nothing blocks the loop.

    FIX 6: the client comes from app.state, built once at startup.
    """
    response = await request.app.state.http.get(RATES_URL)
    response.raise_for_status()
    return response.json()


# =========================================================================
# WHY limit=20 WITH NO ANNOTATION IS A SECURITY PROBLEM
# =========================================================================
#
# With no annotation FastAPI applies no validation, so limit arrives as
# whatever the client sends:
#
#   ?limit=1000000        -> a million-row query and a million-row
#                            response. One request, unbounded work.
#   ?limit=-1             -> passed to LIMIT; behaviour is driver-
#                            dependent and may mean "no limit".
#   ?limit=abc            -> a string reaches .limit(), raising inside
#                            the query builder -> a 500 for a bad
#                            client request.
#
# It is not a typing gap because the effect is not a wrong type -- it is
# UNBOUNDED WORK DRIVEN BY AN UNTRUSTED INPUT. That is a denial of
# service requiring no special effort: one curl with a large number
# occupies a worker, a connection and hundreds of megabytes.
#
# Annotated[int, Query(ge=1, le=100)] makes all three a 422 before any
# database work happens (Lesson 6.5).


# =========================================================================
# TESTS
# =========================================================================

import pytest


def test_handlers_that_do_not_await_are_not_async():
    """PROBLEM 1 -- the one that serialises the service. Asserts the
    property directly, so a future 'async' added out of habit fails
    here rather than in a load test."""
    import inspect

    for route in app.routes:
        fn = getattr(route, "endpoint", None)
        if fn is None or not inspect.iscoroutinefunction(fn):
            continue
        source = inspect.getsource(fn)
        assert "await " in source, (
            f"{fn.__name__} is async but awaits nothing — it will block "
            "the event loop"
        )


def test_a_missing_order_is_a_404(client):
    """PROBLEM 4. raise_for_status() must see the failure."""
    r = client.get("/orders/o-999")

    assert r.status_code == 404
    assert "error" not in r.json() or r.status_code >= 400


def test_a_client_cannot_set_the_price_or_the_status(client):
    """PROBLEM 5 — mass assignment. The original let a client mark an
    order paid for a penny."""
    r = client.post("/orders", json={
        "customer_id": "c-1",
        "lines": [{"sku": "AB-1234", "quantity": 1}],
        "total": "0.01",
        "status": "paid",
    })

    assert r.status_code == 422          # extra='forbid'


def test_the_response_contains_only_the_public_fields(client):
    """PROBLEM 3."""
    r = client.get("/orders/o-1")

    assert set(r.json()) == {
        "id", "customer_id", "total", "status", "created_at",
    }


def test_limit_is_bounded(client):
    """PROBLEM 2 — the security one. Unbounded work from one query
    parameter."""
    for bad in ("1000000", "-1", "abc"):
        assert client.get(f"/orders?limit={bad}").status_code == 422

    assert client.get("/orders?limit=100").status_code == 200


def test_the_http_client_is_built_once(client):
    """PROBLEM 6. Not a new TLS handshake per request."""
    created = 0
    real = httpx.AsyncClient.__init__

    def counting(self, *a, **kw):
        nonlocal created
        created += 1
        real(self, *a, **kw)

    with mock.patch.object(httpx.AsyncClient, "__init__", counting):
        with TestClient(app):            # triggers lifespan
            for _ in range(10):
                client.get("/rates")

    assert created == 1


def test_the_schema_describes_the_responses(client):
    """PROBLEM 7. A generated client needs types and error shapes."""
    schema = app.openapi()
    get_order = schema["paths"]["/orders/{oid}"]["get"]

    assert "200" in get_order["responses"]
    assert "404" in get_order["responses"]
    assert get_order["operationId"] == "orders_get_order"
    assert "OrderPublic" in json.dumps(get_order["responses"]["200"])`,
        notes: [
          { t: "p", text: "**The `async def` with a synchronous driver is the fix worth internalising**, because it is invisible in review and catastrophic under load. FastAPI runs a coroutine on the event loop and a plain `def` in a thread pool — so removing one word takes the service from one concurrent request to forty (Lesson 11.6)." },
          { t: "p", text: "**`Order(**payload)` is mass assignment**, and it is the most serious problem here. A client sets `status: \"paid\"` and `total: \"0.01\"` and the ORM obliges. The input model fixes it not by checking those fields but by having nowhere to put them — `extra=\"forbid\"` rejects the attempt outright." },
          { t: "p", text: "**The unannotated `limit` is a denial-of-service vector, not a typing nicety.** `?limit=1000000` is one curl that occupies a worker, a connection and hundreds of megabytes. Anything sized by an untrusted input needs a bound, and the bound belongs at the boundary (Lesson 6.5)." },
          { t: "callout", kind: "insight", title: "The async-without-await test is worth keeping", body: [
            { t: "p", text: "It inspects every route, finds handlers declared `async` whose source contains no `await`, and fails. That catches the mistake at the moment someone makes it, rather than in a load test three weeks later." },
            { t: "p", text: "It is a heuristic — a handler could await something indirectly — but the false-positive rate is near zero and the failure it prevents is the most expensive one in the framework (Lesson 8.7)." }
          ]},
          { t: "p", text: "**Setting `generate_unique_id_function` on day one costs one line.** The default operation id is derived from the path, so a generated client has a method called `get_order_orders__oid__get` — and fixing it later renames methods for every consumer." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team ships a FastAPI service that handles 40 requests per second in staging. In production it manages 6, with p99 latency above four seconds, on hardware four times larger." },
      { t: "p", text: "**Every handler was `async def` and every database call was `psycopg2`.** In staging, load tests ran requests sequentially and never exposed it. In production, concurrent requests queued behind each other on the event loop, so the service processed one at a time while its worker threads sat idle." },
      { t: "p", text: "**The fix was deleting the word `async` from nine function definitions.** Throughput went to 55 requests per second immediately, because FastAPI then ran each handler in its thread pool and forty could block independently." },
      { t: "p", text: "**`async def` is a claim that the body never blocks.** FastAPI believes it and schedules accordingly, so an unfounded claim converts a threaded server into a single-threaded one. If nothing in the handler is awaited, the correct declaration is `def` — and it is faster." }
    ]}
  ],

  takeaways: [
    "**The function signature is the contract.** Path parameters come from the template, a Pydantic model is the body, and other scalars are query parameters — read from the signature, not configured.",
    "**Use `Annotated[int, Query(...)]` rather than a `Query()` default**, so the handler stays callable as an ordinary function and the type checker sees the real type.",
    "**Declare `response_model` on every endpoint.** It filters the output, so a column added to a table cannot leak into the API, and it makes the schema accurate.",
    "**Document failures with `responses=`**, or the generated schema claims the endpoint only ever succeeds and clients have no type for the error body.",
    "**`async def` is a claim that the body never blocks.** With a synchronous driver, `def` is both correct and faster, because FastAPI runs it in a thread pool.",
    "**A handler declared `async` that awaits nothing is a bug** — grep for it, and assert against it in a test.",
    "**Never return an ORM object without a response model.** `order.__dict__` exposes every column, including ones added later.",
    "**Build clients and pools in `lifespan`**, not per request, and the `yield` form guarantees shutdown runs.",
    "**Annotate and bound every query parameter.** An unbounded `limit` is unbounded work driven by an untrusted input.",
    "**Never construct an entity from an unvalidated payload.** `Model(**payload)` is mass assignment and lets a client set price, status or id.",
    "**Set `generate_unique_id_function` on day one**, because operation ids become method names in every generated client and changing them later is a breaking change.",
    "**Treat the OpenAPI document as an artefact**: generate clients from it, and diff it in CI to catch breaking changes before consumers do."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A FastAPI service handles 6 requests per second in production despite large hardware. Every handler is `async def` and the driver is `psycopg2`. Why?",
        options: [
          "The thread pool is too small",
          "`async def` makes FastAPI run the handler on the event loop, so each synchronous query blocks all concurrency in the process",
          "`psycopg2` holds the GIL for the duration of a query",
          "The connection pool is exhausted"
        ],
        answer: 1,
        why: "`async def` is a claim that the body never blocks, and FastAPI schedules accordingly. A plain `def` handler runs in a thread pool where blocking costs one thread out of forty. Deleting the word `async` from handlers that await nothing typically restores throughput immediately — and is the single most common FastAPI performance bug."
      },
      {
        stem: "An endpoint returns an ORM object with no `response_model`. What is the risk?",
        options: [
          "The response will not be valid JSON",
          "Every attribute the entity carries is serialised — including columns added later, with nothing in a migration diff to signal it",
          "FastAPI raises because the type is not a Pydantic model",
          "The response cannot be cached"
        ],
        answer: 1,
        why: "The API surface becomes whatever the entity happens to have, so a column added for an internal report appears publicly the same afternoon. A response model filters to declared fields, which makes exposure a deliberate act visible in a diff — and keeps the OpenAPI schema accurate at the same time."
      },
      {
        stem: "`def list_orders(limit=20)` with no annotation. Why is this more than a typing gap?",
        options: [
          "FastAPI will reject the route at startup",
          "No validation is applied, so `?limit=1000000` is unbounded work driven by an untrusted input — a denial of service requiring one request",
          "The default will be ignored",
          "The parameter becomes part of the request body"
        ],
        answer: 1,
        why: "Without an annotation FastAPI passes the value through unchecked. A large number produces a million-row query and response; a negative one is driver-dependent; a non-numeric one raises inside the query builder and returns a 500 for a bad client request. `Annotated[int, Query(ge=1, le=100)]` makes all three a 422 before any database work."
      },
      {
        stem: "Why prefer `Annotated[int, Query(ge=1)]` over `limit: int = Query(20, ge=1)`?",
        options: [
          "The legacy form is deprecated and will be removed",
          "The constraint lives in the type rather than the default slot, so the handler stays callable as a plain function and the type checker sees an `int`",
          "`Annotated` supports more constraints",
          "It generates a better OpenAPI schema"
        ],
        answer: 1,
        why: "With the legacy form, calling the handler directly passes a `Query` object as the value, so a unit test needs an HTTP client. `Annotated` keeps the default a real default, makes the constrained type reusable across endpoints, and lets `mypy` see the declared type rather than a `Query` instance."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When should a FastAPI endpoint be `async def`?",
        strong: "Only when everything it does is genuinely awaitable. FastAPI runs a coroutine on the event loop and a plain `def` in a thread pool, so a coroutine containing a synchronous call blocks all concurrency rather than one thread.",
        answer: [
          { t: "p", text: "Framing `async def` as a claim the framework believes is what makes the consequence obvious, rather than a rule to memorise." },
          { t: "p", text: "The counter-intuitive part is worth stating plainly: with a synchronous driver, `def` is faster — which surprises people who assume async is always an upgrade." },
          { t: "p", text: "Suggesting a test that greps routes for `async` handlers with no `await` shows how to prevent it rather than just diagnose it." }
        ]
      },
      {
        level: "core",
        q: "Why declare a `response_model`?",
        strong: "It filters the output to declared fields and makes the OpenAPI schema accurate. Without it, returning an ORM object exposes every column — including ones added later by a migration nobody connected to the API.",
        answer: [
          { t: "p", text: "The migration example is what makes it concrete: the diff that causes the leak contains no API code at all, so review cannot catch it." },
          { t: "p", text: "Separating input and output models follows naturally, and closes the mass-assignment hole in the same move." },
          { t: "p", text: "Mentioning that `responses=` documents the failure cases shows you think of the schema as a contract consumers generate from." }
        ]
      },
      {
        level: "advanced",
        q: "How do you keep a FastAPI service's OpenAPI document useful?",
        strong: "Declare response models and error responses, set stable operation ids, and treat the document as a build artefact — generate clients from it, and diff it in CI to catch breaking changes before consumers do.",
        answer: [
          { t: "p", text: "The operation-id point is a small detail with a long tail: the default is unreadable, it becomes a method name in every generated client, and changing it later is itself a breaking change." },
          { t: "p", text: "`oasdiff` in CI is the concrete practice that turns \"we removed a field nobody used\" from a support ticket into a failed build." },
          { t: "p", text: "Noting that the schema is derived rather than maintained is why it stays true — the failure mode of hand-written API docs is that they drift." }
        ]
      }
    ]
  }
});
