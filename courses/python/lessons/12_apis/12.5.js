/* ============================================================================
   LESSON 12.5 — Dependencies, Middleware and Errors
   ========================================================================= */
EC.receiveLesson({
  id: "12.5",

  lede: "Three mechanisms that decide what a service is like to operate. `Depends` is dependency injection driven by signatures, so a handler declares what it needs and a test overrides it in one line. Middleware wraps every request, which makes it powerful and easy to misuse. **And an error contract is a design decision** — the alternative is every endpoint failing differently.",

  objectives: [
    "Use `Depends` for resources, authentication and shared parameters",
    "Override a dependency in a test without patching anything",
    "Choose between middleware, a dependency and an exception handler",
    "Design one error contract and enforce it centrally",
    "Manage the request lifecycle, including what runs after the response"
  ],

  prerequisites: ["12.4", "9.6"],

  blocks: [

    { t: "h2", n: "01", text: "Depends", id: "depends" },

    {"kind": "tree", "title": "Depends builds a graph per request", "caption": "A handler depends on a current user, which depends on a token, which depends on the request headers; a database session is shared by anything in the request that asks for it. FastAPI resolves the graph once per request and caches each node.", "root": {"label": "handler", "tone": "good", "children": [{"label": "current_user", "tone": "accent", "children": [{"label": "token", "children": [{"label": "Authorization header"}]}, {"label": "db session", "tone": "warn"}]}, {"label": "db session", "sub": "same instance, cached", "tone": "warn"}]}, "t": "diagram", "id": "dg-12_5-01-0"},

    { t: "code", lang: "python", title: "a dependency is just a callable", code: `
from typing import Annotated
from fastapi import Depends, HTTPException, status


def get_db() -> Iterator[Session]:
    """A yield dependency: the code after the yield runs when the
    response has been sent, so cleanup is guaranteed (Lesson 5.8)."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],      # dependencies compose
) -> User:
    user = auth.verify(token, db)
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# Named types, so a handler reads as a declaration of what it needs
DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


@app.get("/me/orders", response_model=list[OrderPublic])
def my_orders(user: CurrentUser, db: DB) -> list[Order]:
    return orders.for_user(db, user.id)
`,
      hl: [8, 17, 30, 31],
      caption: "**The named-alias pattern is the one to adopt.** `user: CurrentUser, db: DB` is readable, reusable and impossible to get subtly wrong — where repeating `Annotated[Session, Depends(get_db)]` in forty signatures invites one of them to differ."
    },

    { t: "callout", kind: "insight", title: "Dependencies are cached per request", body: [
      { t: "code", lang: "python", title: "resolved once, however many times it is asked for", numbered: false, code: `
def expensive_lookup(db: DB) -> Config:
    return db.query(Config).one()          # called ONCE per request


@app.get("/x")
def handler(
    a: Annotated[Config, Depends(expensive_lookup)],
    b: Annotated[Config, Depends(expensive_lookup)],
):
    assert a is b                          # the same object


# Opt out when you genuinely want two:
Annotated[Config, Depends(expensive_lookup, use_cache=False)]`},
      { t: "p", text: "**The cache is keyed on the callable**, so `current_user` appearing in a route dependency, a sub-dependency and the handler resolves once. That is what makes deep dependency trees affordable." },
      { t: "p", text: "**It does not persist across requests.** For that you want `lifespan` state or an `lru_cache` on a settings function (Lesson 12.4)." }
    ]},

    { t: "code", lang: "python", title: "dependencies that exist only for their side effect", code: `
def require_admin(user: CurrentUser) -> None:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "admin required")


def verify_api_key(x_api_key: Annotated[str, Header()]) -> None:
    if not secrets.compare_digest(x_api_key, settings.api_key.get_secret_value()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid api key")


# Applied to a route without appearing in the signature
@app.delete("/orders/{oid}", dependencies=[Depends(require_admin)])
def delete_order(oid: OrderId, db: DB): ...


# Or to a whole router
admin = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])

# Or to the application
app = FastAPI(dependencies=[Depends(verify_api_key)])
`,
      hl: [12, 17, 20],
      caption: "**`dependencies=[...]` is for checks whose return value you do not need.** Putting the guard on the router means a new admin endpoint is protected by default rather than by the author remembering."
    },

    { t: "h2", n: "02", text: "Overriding in tests", id: "overrides" },

    { t: "code", lang: "python", title: "the reason to use Depends at all", code: `
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(db_session) -> Iterator[TestClient]:
    """No patching, no monkeypatching, no import-path guessing
    (Lesson 9.5)."""
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[current_user] = lambda: User(id="u-1", is_admin=False)

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()          # or it leaks between tests


def test_admin_only_route_is_forbidden(client):
    assert client.delete("/orders/o-1").status_code == 403
`,
      hl: [10, 11, 16],
      caption: "**This is the payoff.** The override is by *object*, not by import path, so moving `get_db` to another module does not break the test — which is exactly what `patch(\"app.main.get_db\")` would do (Lesson 9.5)."
    },

    { t: "callout", kind: "warn", title: "Clear the overrides, and use the context manager", body: [
      { t: "ul", items: [
        "**`dependency_overrides` is global to the app object**, so a test that does not clear it changes every later test — and the failure appears in an unrelated file.",
        "**`with TestClient(app)` runs `lifespan`.** Without the `with`, startup and shutdown never fire, so `app.state.http` does not exist and the failure is an `AttributeError` far from the cause.",
        "**Override the innermost dependency you can.** Overriding `current_user` tests authorisation; overriding `get_db` tests the query. Overriding both tests neither."
      ]}
    ]},

    { t: "h2", n: "03", text: "Middleware, and when not to use it", id: "middleware" },

    {"kind": "layers", "title": "Middleware wraps every request", "caption": "Each middleware sees the request on the way in and the response on the way out, in nested order. Cross-cutting concerns — request IDs, timing, CORS — belong here; business logic does not.", "taper": true, "items": [{"label": "request-id middleware", "sub": "outermost: first in, last out", "tone": "warn"}, {"label": "timing / logging middleware", "tone": "accent"}, {"label": "CORS middleware", "tone": "accent"}, {"label": "router → dependencies → handler", "sub": "the innermost", "tone": "good"}], "t": "diagram", "id": "dg-12_5-03-1"},

    { t: "viz",
      title: "Where each mechanism sits",
      caption: "Middleware wraps everything, including routes that do not exist and requests that fail validation. A dependency runs only for the routes that declare it. That difference decides which one a given job belongs in.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram of the request lifecycle showing middleware wrapping routing, dependencies and the handler">
  <rect x="14" y="26" width="872" height="248" rx="12" style="fill:none;stroke:var(--violet-line)" stroke-width="1.5"/>
  <text x="34" y="52" class="s-label" style="fill:var(--violet)">MIDDLEWARE — every request, including 404s and 422s</text>

  <rect x="46" y="66" width="808" height="192" rx="11" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="66" y="92" class="s-label">ROUTING — path matched, or 404 here</text>

  <rect x="78" y="106" width="744" height="140" rx="10" style="fill:none;stroke:var(--accent-line)" stroke-width="1.3"/>
  <text x="98" y="132" class="s-label" style="fill:var(--accent-ink)">DEPENDENCIES — only for this route</text>
  <text x="98" y="154" class="s-sub">auth · db session · shared params · guards</text>

  <rect x="110" y="168" width="680" height="64" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="130" y="194" class="s-label" style="fill:var(--accent-ink)">VALIDATION, then the HANDLER</text>
  <text x="130" y="216" class="s-sub">a raise here is caught by an exception handler</text>

  <text x="14" y="294" class="s-sub">Middleware sees the raw request and the final response. A dependency sees a parsed, routed, authorised one.</text>
</svg>`
    },

    { t: "table",
      head: ["Job", "Use", "Why"],
      rows: [
        ["A correlation id on every log line", "**Middleware**", "Must cover 404s and 422s too"],
        ["Request duration metrics", "**Middleware**", "Should measure failures as well as successes"],
        ["CORS, GZip, trusted hosts", "**Middleware**", "Protocol-level, before routing"],
        ["Authentication", "**A dependency**", "Route-specific, and it needs to appear in the schema"],
        ["A database session", "**A dependency**", "Only routes that need one should open one"],
        ["Turning an exception into a response", "**An exception handler**", "Centralised, and it keeps handlers clean"],
        ["Reading the request body", "A dependency", "Middleware consuming the body breaks the handler"]
      ],
      caption: "**Authentication in middleware is the classic mistake.** It runs for `/health` and `/docs`, it cannot be route-specific without a path allowlist that drifts, and it does not appear in the OpenAPI document — so generated clients do not know the endpoint needs a token."
    },

    { t: "code", lang: "python", title: "middleware done properly", code: `
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware


class RequestContext(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_var.set(request_id)     # a ContextVar
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            # Log with the id attached, then re-raise so the exception
            # handlers still produce the response.
            log.exception("unhandled", extra={"request_id": request_id})
            raise
        finally:
            request_id_var.reset(token)            # or it leaks
            duration = time.perf_counter() - start
            metrics.observe(request.url.path, duration)

        response.headers["X-Request-ID"] = request_id
        return response


app.add_middleware(RequestContext)
`,
      hl: [9, 20],
      caption: "**`reset(token)` in a `finally` is not optional.** A `ContextVar` left set persists into whatever runs next on that task, so log lines get attributed to the wrong request — confidently, which is worse than no correlation id at all (Lesson 6.4)."
    },

    { t: "callout", kind: "trap", title: "`BaseHTTPMiddleware` is more expensive than it looks", body: [
      { t: "ul", items: [
        "**It buffers the response body**, which breaks streaming responses and server-sent events.",
        "**It adds a task and a queue per request**, measurably in a hot path.",
        "**Reading `await request.body()` consumes the stream**, so the handler receives nothing unless you put it back."
      ]},
      { t: "code", lang: "python", title: "raw ASGI middleware avoids all three", numbered: false, code: `
class RequestId:
    """No buffering, no extra task. Harder to read, and correct for
    anything on the hot path or anything streaming."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        request_id = str(uuid.uuid4())
        token = request_id_var.set(request_id)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                message["headers"].append(
                    (b"x-request-id", request_id.encode()))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            request_id_var.reset(token)`},
      { t: "p", text: "**Use `BaseHTTPMiddleware` for convenience and raw ASGI when it matters.** If the service streams anything, the choice is made for you." }
    ]},

    { t: "h2", n: "04", text: "One error contract", id: "errors" },

    { t: "ladder",
      title: "Reporting a failure",
      rungs: [
        { level: "bad", label: "Every endpoint invents its own",
          why: "Three shapes for one concept. Every client writes three parsers, and the fourth endpoint invents a fourth shape because there was nothing to follow.",
          code: `return {"error": "not found"}, 404
return {"detail": "not found"}
return {"success": False, "message": "not found"}
raise HTTPException(404, "not found")        # {"detail": "..."}` },
        { level: "ok", label: "One handler for `HTTPException`",
          why: "A consistent shape, and every endpoint gets it without effort. Still leaves unhandled exceptions producing a different body, which is the case that matters most.",
          code: `@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.status_code, "message": exc.detail}},
    )` },
        { level: "best", label: "A typed contract, covering every path",
          why: "Domain exceptions map to statuses in one table, validation errors get a field-level shape, and an unexpected exception still produces the contract — with the correlation id, so a user's screenshot leads straight to the logs.",
          code: `class ErrorDetail(BaseModel):
    field: str | None = None
    message: str
    code: str


class ErrorResponse(BaseModel):
    error: str                       # a stable machine-readable code
    message: str                     # human-readable
    request_id: str
    details: list[ErrorDetail] = []


# Domain exception -> status, in ONE place (Lesson 6.3)
STATUS_FOR = {
    OrderNotFound: 404,
    DuplicateOrder: 409,
    InsufficientFunds: 402,
    NotEntitled: 403,
}


@app.exception_handler(DomainError)
async def domain_error(request: Request, exc: DomainError):
    status_code = STATUS_FOR.get(type(exc), 400)
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            error=type(exc).__name__,
            message=str(exc),
            request_id=request_id_var.get(),
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    """The safety net. Logs the traceback, returns NOTHING about it."""
    log.exception("unhandled", extra={"request_id": request_id_var.get()})
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="internal_error",
            message="An unexpected error occurred.",
            request_id=request_id_var.get(),
        ).model_dump(),
    )`,
          note: "**The `request_id` in the body is what makes support tractable.** A user pastes an error, and it maps to one request in the logs — without it, \"it failed at about three\" is the whole report." }
      ]
    },

    { t: "callout", kind: "warn", title: "Never return an exception's text to a client", body: [
      { t: "code", lang: "python", title: "what leaks", numbered: false, code: `
# All of these have shipped:
return {"error": str(exc)}
# -> 'connection to server at "10.0.3.14", port 5432 failed:
#     FATAL: password authentication failed for user "billing_rw"'

return {"error": traceback.format_exc()}
# -> file paths, line numbers, library versions, local variables

raise HTTPException(500, f"query failed: {sql}")
# -> your schema`},
      { t: "p", text: "**A 500 body should say nothing.** The detail goes to the log with the correlation id; the client gets a stable code and an id to quote. Anything more is reconnaissance for someone probing the service." },
      { t: "p", text: "**The same applies to validation errors** — Pydantic's `errors()` includes the submitted value, so echoing it returns whatever the client sent, including a password (Lesson 12.3)." }
    ]},

    { t: "h2", n: "05", text: "After the response", id: "background" },

    { t: "code", lang: "python", title: "BackgroundTasks, and its limits", code: `
from fastapi import BackgroundTasks


@app.post("/orders", status_code=201)
def create_order(payload: OrderCreate, background: BackgroundTasks, db: DB):
    order = orders.create(db, payload)
    # Runs AFTER the response is sent, in the same process.
    background.add_task(send_confirmation, order.id)
    return order
`,
      caption: "**In the same process, with no retry and no durability.** A restart between the response and the task loses it silently — so it is right for a best-effort email and wrong for anything that must happen (Lesson 12.7)."
    },

    { t: "callout", kind: "tradeoff", title: "BackgroundTasks or a real queue", body: [
      { t: "table",
        head: ["", "`BackgroundTasks`", "A queue and workers"],
        rows: [
          ["Survives a restart", "**No**", "Yes"],
          ["Retries", "No", "Yes"],
          ["Visible when it fails", "Only in logs", "Yes — a dead-letter queue"],
          ["Setup cost", "None", "A broker and a worker deployment"],
          ["Blocks the worker", "**Yes** — it runs in the request's process", "No"],
          ["Right for", "A best-effort side effect", "**Anything that must happen**"]
        ]
      },
      { t: "p", text: "**The blocking point is easy to miss.** A background task holds the worker that served the request, so a slow one reduces throughput exactly as if it had run before the response — the client just does not wait for it." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Give a service one error contract and a testable auth path",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "This service authenticates in middleware, fails differently on every endpoint, and cannot be tested without patching. Six problems." },
        { t: "code", lang: "python", numbered: false, title: "main.py — as found", code: `
@app.middleware("http")
async def auth(request: Request, call_next):
    token = request.headers.get("Authorization", "")
    user = verify(token)
    if not user:
        return JSONResponse({"error": "unauthorized"}, status_code=401)
    request.state.user = user
    return await call_next(request)

@app.get("/orders/{oid}")
def get_order(oid: str, request: Request):
    order = db.query(Order).get(oid)
    if not order:
        return {"error": "not found"}, 404
    if order.customer_id != request.state.user.id:
        raise HTTPException(403, "forbidden")
    return order

@app.post("/refunds")
def refund(payload: dict, request: Request):
    try:
        return payments.refund(payload["order_id"])
    except Exception as e:
        return JSONResponse({"detail": str(e)}, status_code=500)

@app.get("/health")
def health():
    return {"ok": True}`},
        { t: "p", text: "One of the six makes the service impossible to deploy behind a load balancer." }
      ],
      requirements: [
        "Identify all six and the consequence of each.",
        "Say which one breaks the deployment, and why.",
        "Move authentication to a dependency, and say what that buys.",
        "Define one error contract and apply it to every path.",
        "Make the whole thing testable without patching.",
        "**Explain what `str(e)` on line 24 can return to a client.**"
      ],
      hint: "Ask which requests the middleware runs for. Then look at what the health check has to get past.",
      solution: {
        lang: "python",
        title: "main.py",
        code: `# =========================================================================
# THE SIX PROBLEMS
# =========================================================================
#
# 1. AUTH IN MIDDLEWARE BLOCKS /health   <- breaks the deployment
#
#    Middleware runs for EVERY request, so the load balancer's health
#    probe -- which sends no Authorization header -- gets a 401. The
#    balancer marks every instance unhealthy and takes the service out
#    of rotation.
#
#    The usual "fix" is a path allowlist inside the middleware, which
#    then drifts: someone adds /metrics or /docs and forgets, or an
#    allowlist entry is a prefix and accidentally exempts /healthz-admin.
#
#    It also does not appear in the OpenAPI schema, so a generated
#    client has no idea the endpoints need a token.
#
# 2. THREE ERROR SHAPES FOR ONE CONCEPT
#
#      {"error": "unauthorized"}      middleware
#      {"error": "not found"}, 404    a TUPLE -- see (3)
#      {"detail": "..."}              HTTPException, and the 500 handler
#
#    Every client writes three parsers, and the fourth endpoint invents
#    a fourth shape because there is no contract to follow.
#
# 3. return {...}, 404  IS NOT A STATUS CODE
#
#    FastAPI is not Flask. Returning a tuple serialises the TUPLE:
#
#      HTTP 200 OK
#      [{"error": "not found"}, 404]
#
#    So a missing order is a 200 containing a JSON array. Every client's
#    raise_for_status() passes (Lesson 12.1).
#
# 4. str(e) RETURNED TO THE CLIENT
#
#    See the section below. This leaks infrastructure detail.
#
# 5. payload: dict -- NO VALIDATION
#
#    payload["order_id"] raises KeyError on a missing key, which the
#    bare except turns into a 500. A malformed request is reported as
#    our bug, and there is no schema for anyone generating a client.
#
# 6. NOTHING IS TESTABLE WITHOUT PATCHING
#
#    db is a module global, verify() is called directly in middleware,
#    and payments is imported at module level. A test must patch import
#    paths, which breaks when a module moves (Lesson 9.5).


from __future__ import annotations

import logging
import uuid
from contextvars import ContextVar
from typing import Annotated, Iterator

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


# ---- FIX 2: ONE error contract -----------------------------------------

class ErrorDetail(BaseModel):
    field: str | None = None
    message: str
    code: str


class ErrorResponse(BaseModel):
    error: str            # stable, machine-readable
    message: str          # human-readable
    request_id: str       # what a user quotes to support
    details: list[ErrorDetail] = []


# ---- domain exceptions, mapped to statuses in one place ----------------

class DomainError(Exception):
    """Base for every expected failure (Lesson 6.3)."""


class OrderNotFound(DomainError): ...
class NotEntitled(DomainError): ...
class RefundRejected(DomainError): ...


STATUS_FOR: dict[type[DomainError], int] = {
    OrderNotFound: status.HTTP_404_NOT_FOUND,
    NotEntitled: status.HTTP_403_FORBIDDEN,
    RefundRejected: status.HTTP_409_CONFLICT,
}


# ---- FIX 6: dependencies, so everything is overridable -----------------

def get_db() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


bearer = HTTPBearer(auto_error=False)


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """FIX 1: authentication as a DEPENDENCY.

    Three things this buys over middleware:
      - it runs only for routes that declare it, so /health needs no
        allowlist and cannot be forgotten
      - HTTPBearer appears in the OpenAPI schema, so generated clients
        know a token is required
      - a test overrides it by OBJECT, with no import path to guess
    """
    if credentials is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = auth.verify(credentials.credentials, db)
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


# ---- middleware: only what genuinely belongs there ----------------------

@app.middleware("http")
async def request_context(request: Request, call_next):
    """Correlation id and timing. These MUST cover 404s and 422s, which
    is exactly what middleware is for -- unlike auth."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    token = request_id_var.set(request_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        # Without the reset, the id leaks into whatever runs next on
        # this task and log lines are confidently misattributed.
        request_id_var.reset(token)


# ---- handlers: every failure path produces the contract ----------------

def _error(status_code: int, error: str, message: str,
           details: list[ErrorDetail] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            error=error, message=message,
            request_id=request_id_var.get(),
            details=details or [],
        ).model_dump(),
    )


@app.exception_handler(DomainError)
async def handle_domain(request: Request, exc: DomainError):
    return _error(STATUS_FOR.get(type(exc), 400), type(exc).__name__, str(exc))


@app.exception_handler(HTTPException)
async def handle_http(request: Request, exc: HTTPException):
    return _error(exc.status_code, "http_error", str(exc.detail))


@app.exception_handler(RequestValidationError)
async def handle_validation(request: Request, exc: RequestValidationError):
    # Field-level detail, WITHOUT the submitted value -- Pydantic's
    # errors() includes "input", which echoes whatever was sent
    # (Lesson 12.3).
    return _error(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "validation_failed",
        "The request body is invalid.",
        [ErrorDetail(field=".".join(str(p) for p in e["loc"][1:]),
                     message=e["msg"], code=e["type"])
         for e in exc.errors()],
    )


@app.exception_handler(Exception)
async def handle_unexpected(request: Request, exc: Exception):
    """FIX 4: the safety net. Logs everything, returns nothing."""
    log.exception("unhandled", extra={"request_id": request_id_var.get(),
                                      "path": request.url.path})
    return _error(500, "internal_error", "An unexpected error occurred.")


# ---- routes -------------------------------------------------------------

@app.get("/orders/{oid}", response_model=OrderPublic, tags=["orders"])
def get_order(oid: OrderId, user: CurrentUser, db: DB) -> Order:
    """FIX 3: raise, do not return a tuple. The exception handler turns
    it into the contract with the right status."""
    order = db.get(Order, oid)
    if order is None:
        raise OrderNotFound(f"no order {oid}")
    if order.customer_id != user.id:
        # 404, not 403: a 403 confirms the order EXISTS, which lets a
        # caller enumerate other customers' order ids.
        raise OrderNotFound(f"no order {oid}")
    return order


class RefundRequest(BaseModel):
    """FIX 5: a schema, so a missing field is a 422 rather than a 500."""
    model_config = ConfigDict(extra="forbid")

    order_id: Annotated[str, Field(pattern=r"^o-\\d+$")]
    reason: Annotated[str, Field(max_length=500)] = ""


@app.post("/refunds", response_model=RefundPublic, status_code=201,
          tags=["refunds"])
def create_refund(payload: RefundRequest, user: CurrentUser, db: DB) -> Refund:
    """No try/except. An expected failure raises a DomainError and the
    handler maps it; an unexpected one hits the safety net."""
    return payments.refund(db, payload.order_id, requested_by=user.id)


@app.get("/health", tags=["ops"], include_in_schema=False)
def health() -> dict[str, bool]:
    """FIX 1: no CurrentUser, so no token is needed. Nothing had to be
    exempted -- the dependency simply is not declared."""
    return {"ok": True}


# =========================================================================
# WHAT str(e) CAN RETURN TO A CLIENT
# =========================================================================
#
# The original caught every exception and returned its text. Real
# examples of what that produces:
#
#   OperationalError:
#     'connection to server at "10.0.3.14", port 5432 failed: FATAL:
#      password authentication failed for user "billing_rw"'
#     -> internal IP, port, database username
#
#   ProgrammingError:
#     'column orders.internal_margin does not exist
#      LINE 1: SELECT orders.id, orders.internal_margin FROM orders'
#     -> the schema, and a column name that reveals the business model
#
#   requests.ConnectionError:
#     "HTTPSConnectionPool(host='payments-internal.acme.local', port=443)"
#     -> internal service names and topology
#
#   KeyError: 'order_id'
#     -> harmless, and useless to the caller: it says nothing about
#        which field was wrong or what was expected
#
# None of it helps the caller and all of it helps someone probing the
# service. The detail belongs in the log, keyed by request_id; the
# client gets a stable code and an id to quote (Lesson 6.4).


# =========================================================================
# TESTS — no patching anywhere
# =========================================================================

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(db_session) -> Iterator[TestClient]:
    """FIX 6. Overrides are by OBJECT, so moving get_db to another
    module does not break this."""
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[current_user] = lambda: User(id="u-1")

    with TestClient(app) as c:          # the "with" runs lifespan
        yield c

    app.dependency_overrides.clear()    # or it leaks into later tests


def test_health_needs_no_authentication():
    """PROBLEM 1 — the deployment breaker. The probe sends no token."""
    with TestClient(app) as c:
        assert c.get("/health").status_code == 200


def test_a_protected_route_without_a_token_is_401():
    with TestClient(app) as c:
        r = c.get("/orders/o-1")

    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_not_found_is_a_404_not_a_200_with_a_tuple(client):
    """PROBLEM 3. The original returned HTTP 200 with the body
    [{"error": "not found"}, 404]."""
    r = client.get("/orders/o-999")

    assert r.status_code == 404
    assert isinstance(r.json(), dict)


def test_every_failure_uses_one_shape(client):
    """PROBLEM 2. Four different failures, one contract."""
    responses = [
        client.get("/orders/o-999"),                       # domain, 404
        client.post("/refunds", json={}),                  # validation, 422
        client.get("/orders/NOT-AN-ID"),                   # path, 422
        client.post("/refunds", json={"order_id": "o-boom"}),  # unexpected, 500
    ]

    for r in responses:
        body = r.json()
        assert set(body) >= {"error", "message", "request_id"}
        assert isinstance(body["error"], str)


def test_a_500_reveals_nothing(client):
    """PROBLEM 4."""
    with failing_database():
        r = client.get("/orders/o-1")

    assert r.status_code == 500
    text = r.text.lower()
    for leak in ("password", "postgres", "traceback", "select ",
                 "10.0.", "internal"):
        assert leak not in text
    assert r.json()["request_id"]          # the id IS returned


def test_the_request_id_survives_into_the_response(client):
    r = client.get("/orders/o-999", headers={"X-Request-ID": "abc-123"})

    assert r.headers["X-Request-ID"] == "abc-123"
    assert r.json()["request_id"] == "abc-123"


def test_another_users_order_is_404_not_403(client):
    """403 confirms the resource exists, which lets a caller enumerate
    other customers' order ids."""
    r = client.get("/orders/o-belonging-to-someone-else")

    assert r.status_code == 404


def test_auth_appears_in_the_schema():
    """PROBLEM 1b. In middleware it does not, so a generated client has
    no idea a token is required."""
    schema = app.openapi()

    assert "HTTPBearer" in schema["components"]["securitySchemes"]
    assert "security" in schema["paths"]["/orders/{oid}"]["get"]`,
        notes: [
          { t: "p", text: "**Auth in middleware breaking the health check is the deployment problem, and the usual fix makes it worse.** A path allowlist inside the middleware drifts: someone adds `/metrics`, an entry turns out to be a prefix match, and an endpoint is exempted that should not be. As a dependency there is nothing to exempt — `/health` simply does not declare it." },
          { t: "p", text: "**`return {...}, 404` is a Flask habit that FastAPI does not share.** It serialises the tuple, so a missing order returns HTTP 200 with a JSON array — and every client's `raise_for_status()` passes. It is the kind of bug that survives because the body looks right in a browser." },
          { t: "p", text: "**Returning 404 rather than 403 for another user's order is a deliberate choice.** A 403 confirms the resource exists, which turns the endpoint into an enumeration oracle: iterate order ids and the status distinguishes real from imaginary. 404 for both reveals nothing." },
          { t: "callout", kind: "insight", title: "The `request_id` in the body is what makes support work", body: [
            { t: "p", text: "A user pastes an error message and it maps to exactly one request in the logs, with the traceback the client never saw. Without it, a support ticket is \"it failed around three o'clock\" and the investigation starts by guessing." },
            { t: "p", text: "Echoing an inbound `X-Request-ID` is what extends that across services — the id a load balancer generated appears in every downstream log line for the same request (Lesson 6.4)." }
          ]},
          { t: "p", text: "**The `Exception` handler is the one that must never be omitted.** Without it, an unexpected error produces the framework's default 500 body — a different shape from every other error in the service, at exactly the moment a client most needs to parse it consistently." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team adds authentication middleware to their API. It works in every test and in staging. Twenty minutes after the production deploy, the load balancer marks all six instances unhealthy and the service is removed from rotation." },
      { t: "p", text: "**The health probe sent no `Authorization` header**, so the middleware returned 401 to it. Staging had no load balancer in front of the service, so nothing had ever probed it that way." },
      { t: "p", text: "**The rollback fixed it, and the retry a week later added a path allowlist.** Three months after that, someone added `/metrics` and the Prometheus scraper started failing — the same bug, in the same place, because the allowlist was a list someone had to remember to update." },
      { t: "p", text: "**As a dependency, neither incident happens.** `/health` and `/metrics` do not declare `CurrentUser`, so there is nothing to exempt and nothing to forget — and the routes that *do* declare it appear correctly in the OpenAPI schema. **Middleware is for what genuinely applies to every request; anything route-specific is a dependency.**" }
    ]}
  ],

  takeaways: [
    "**`Depends` is dependency injection driven by the signature**, so a handler declares what it needs and a test overrides it by object rather than by import path.",
    "**Define named aliases** — `DB = Annotated[Session, Depends(get_db)]` — so forty signatures cannot drift apart.",
    "**Dependencies are cached per request**, keyed on the callable, which is what makes deep dependency trees affordable.",
    "**`dependencies=[Depends(guard)]` on a router** protects new endpoints by default rather than by the author remembering.",
    "**Clear `dependency_overrides` after each test**, and use `with TestClient(app)` so `lifespan` actually runs.",
    "**Authentication belongs in a dependency, not middleware.** Middleware runs for the health check too, does not appear in the schema, and needs a path allowlist that drifts.",
    "**Middleware is for what genuinely applies to every request** — correlation ids, timing, CORS — including 404s and validation failures.",
    "**`BaseHTTPMiddleware` buffers the response body**, so it breaks streaming; raw ASGI middleware does not.",
    "**Reset a `ContextVar` in a `finally`**, or the correlation id leaks into the next request and log lines are confidently misattributed.",
    "**Define one error contract and enforce it with exception handlers**, including a handler for bare `Exception` — otherwise unexpected failures return a different shape from everything else.",
    "**Never return an exception's text.** It leaks internal hostnames, database users, schema and file paths; the client gets a stable code and a request id.",
    "**`BackgroundTasks` runs in the same process with no durability or retry**, and it holds the worker — right for a best-effort email, wrong for anything that must happen."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Authentication middleware is deployed and the load balancer marks every instance unhealthy. Why?",
        options: [
          "The middleware is too slow for the probe's timeout",
          "Middleware runs for every request, so the health probe — which sends no `Authorization` header — receives a 401",
          "Middleware cannot access `request.state`",
          "The probe uses HTTP/1.0, which the middleware rejects"
        ],
        answer: 1,
        why: "The usual fix, a path allowlist inside the middleware, drifts — someone adds `/metrics` and the scraper breaks the same way. As a dependency there is nothing to exempt: `/health` does not declare `CurrentUser`. It also puts the security scheme in the OpenAPI document, which middleware cannot do."
      },
      {
        stem: "A FastAPI handler does `return {\"error\": \"not found\"}, 404`. What does the client receive?",
        options: [
          "A 404 with the error body",
          "HTTP 200 with the body `[{\"error\": \"not found\"}, 404]` — the tuple is serialised as data",
          "A 500, because the return type is invalid",
          "A 404 with an empty body"
        ],
        answer: 1,
        why: "That tuple form is Flask's, not FastAPI's. FastAPI serialises whatever is returned, so the status stays 200 and the code becomes an array element. Every client's `raise_for_status()` passes and the failure is invisible. Raise an exception and let a handler map it to a status."
      },
      {
        stem: "Why return 404 rather than 403 when a user requests another customer's order?",
        options: [
          "403 is reserved for authentication failures",
          "A 403 confirms the resource exists, so a caller can enumerate valid ids by watching which status comes back",
          "404 is cacheable and 403 is not",
          "Most clients do not handle 403"
        ],
        answer: 1,
        why: "Distinguishing \"does not exist\" from \"exists but is not yours\" turns the endpoint into an oracle: iterate ids and the status reveals which are real. Returning 404 for both leaks nothing. It is one of the few places where a deliberately less precise status is the more correct one."
      },
      {
        stem: "What is wrong with `return JSONResponse({\"detail\": str(exc)}, status_code=500)`?",
        options: [
          "`str()` on an exception may raise",
          "It returns internal detail — database hostnames and users, SQL fragments, internal service names — none of which helps the caller",
          "The status code should be 400",
          "`JSONResponse` bypasses the response model"
        ],
        answer: 1,
        why: "A real `OperationalError` message contains the database host, port and username; a `ProgrammingError` contains SQL and column names. It is useless to the caller and useful to anyone probing the service. Log the detail with a correlation id and return a stable error code plus that id, which is what makes a support ticket traceable."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Middleware or a dependency?",
        strong: "Middleware for what genuinely applies to every request — correlation ids, timing, CORS — including 404s and validation failures. A dependency for anything route-specific, especially authentication.",
        answer: [
          { t: "p", text: "The health-check failure is the example that settles it, and the follow-on — a path allowlist that drifts until the metrics scraper breaks — shows why the obvious fix is not one." },
          { t: "p", text: "The schema point is the one people miss: auth as a dependency appears in the OpenAPI document, so generated clients know a token is needed." },
          { t: "p", text: "Mentioning that `BaseHTTPMiddleware` buffers the response body, and therefore breaks streaming, shows the cost is understood as well as the placement." }
        ]
      },
      {
        level: "advanced",
        q: "How do you design an error contract for an API?",
        strong: "One response shape for every failure, a stable machine-readable code, a human-readable message, a request id, and optional field-level details. Enforced with exception handlers — including one for bare `Exception`, so unexpected errors match too.",
        answer: [
          { t: "p", text: "Mapping domain exceptions to statuses in one table keeps handlers clean and means the status is decided once rather than at every raise site." },
          { t: "p", text: "The request id in the body is the operational detail that makes support tractable — a user's screenshot maps to one request in the logs." },
          { t: "p", text: "Being explicit that the 500 body says nothing, while the log says everything, is the security half and the part people get wrong under pressure." }
        ]
      },
      {
        level: "advanced",
        q: "How do you test an endpoint that needs a database and an authenticated user?",
        strong: "`app.dependency_overrides` — replace `get_db` and `current_user` with fakes. The override is by object rather than import path, so moving a module does not break the test, and no patching is involved.",
        answer: [
          { t: "p", text: "Contrasting it with `patch(\"app.main.get_db\")` shows why it is better: patching binds to an import path that a refactor invalidates (Lesson 9.5)." },
          { t: "p", text: "Clearing the overrides afterwards is the detail that matters — they live on the app object, so a leaked override fails an unrelated test in another file." },
          { t: "p", text: "Overriding the innermost dependency you can is the judgement: replacing `current_user` tests authorisation, replacing `get_db` tests the query, replacing both tests neither." }
        ]
      }
    ]
  }
});
