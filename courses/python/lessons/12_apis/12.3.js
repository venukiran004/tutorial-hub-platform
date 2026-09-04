/* ============================================================================
   LESSON 12.3 — Pydantic: Validation as a Boundary
   ========================================================================= */
EC.receiveLesson({
  id: "12.3",

  lede: "Pydantic is usually introduced as \"validation\", which undersells it. Its real job is to be **the line where untrusted data becomes a typed object** — parse once, at the edge, and every function inside the line can trust its arguments. That is the same discipline as Lesson 6.5, with a library that makes the error messages good enough to return to a caller.",

  objectives: [
    "Model a payload so the parsed object is impossible to misuse",
    "Choose between field constraints, validators and model validators",
    "Control serialisation — aliases, exclusions, and what leaves your service",
    "Load typed settings from the environment with `BaseSettings`",
    "Recognise where Pydantic is the wrong tool"
  ],

  prerequisites: ["8.3", "6.5"],

  blocks: [

    { t: "h2", n: "01", text: "Parse, don't validate", id: "parse" },

    { t: "viz",
      title: "The line, and what it changes",
      caption: "Outside the line, everything is a `dict` of unknown shape and every function must be defensive. Inside, the type is the guarantee — so the checks disappear rather than being repeated.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram showing untrusted payloads passing through a Pydantic model into a trusted interior of typed objects">
  <rect x="14" y="34" width="220" height="150" rx="11" style="fill:none;stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="5 3"/>
  <text x="124" y="60" text-anchor="middle" class="s-label" style="fill:var(--crit)">UNTRUSTED</text>
  <text x="124" y="88" text-anchor="middle" class="s-sub">request body</text>
  <text x="124" y="110" text-anchor="middle" class="s-sub">queue message</text>
  <text x="124" y="132" text-anchor="middle" class="s-sub">CSV row</text>
  <text x="124" y="154" text-anchor="middle" class="s-sub">env var</text>
  <text x="124" y="176" text-anchor="middle" class="s-mono" style="font-size:9px">dict[str, Any]</text>

  <rect x="266" y="34" width="230" height="150" rx="11" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.7"/>
  <text x="381" y="60" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">THE MODEL</text>
  <text x="381" y="86" text-anchor="middle" class="s-mono" style="font-size:10px">Order(**payload)</text>
  <text x="381" y="114" text-anchor="middle" class="s-sub">coerce · constrain · reject</text>
  <text x="381" y="140" text-anchor="middle" class="s-sub">one error, per field,</text>
  <text x="381" y="160" text-anchor="middle" class="s-sub">with the path and the value</text>

  <rect x="528" y="34" width="358" height="150" rx="11" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="707" y="60" text-anchor="middle" class="s-label" style="fill:var(--good)">TRUSTED</text>
  <text x="707" y="88" text-anchor="middle" class="s-sub">every function takes an Order</text>
  <text x="707" y="112" text-anchor="middle" class="s-sub">quantity IS an int, ≥ 1</text>
  <text x="707" y="136" text-anchor="middle" class="s-sub">no isinstance, no "if not x"</text>
  <text x="707" y="160" text-anchor="middle" class="s-sub" style="fill:var(--good)">a failure here is a BUG — let it raise</text>

  <line x1="238" y1="109" x2="262" y2="109" style="stroke:var(--border-strong)" stroke-width="1.4"/>
  <line x1="500" y1="109" x2="524" y2="109" style="stroke:var(--border-strong)" stroke-width="1.4"/>

  <text x="14" y="222" class="s-sub">The parsed object is a DIFFERENT TYPE from the payload — which is why the checks vanish rather than repeat.</text>
  <text x="14" y="250" class="s-sub" style="fill:var(--crit)">Validation scattered through the interior is defending against your own bugs; that is what tests are for.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "a model that makes misuse impossible", code: `
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Currency(StrEnum):
    GBP = "GBP"
    USD = "USD"
    EUR = "EUR"


class OrderLine(BaseModel):
    model_config = ConfigDict(
        extra="forbid",            # an unknown key is a caller mistake
        frozen=True,               # immutable once parsed
        str_strip_whitespace=True,
    )

    sku: Annotated[str, Field(pattern=r"^[A-Z]{2}-\\d{4}$")]
    quantity: Annotated[int, Field(ge=1, le=1000)]
    unit_price: Annotated[Decimal, Field(gt=0, max_digits=10, decimal_places=2)]

    @property
    def total(self) -> Decimal:
        return self.unit_price * self.quantity


class Order(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    customer_id: str
    lines: Annotated[list[OrderLine], Field(min_length=1, max_length=100)]
    placed_at: datetime
    currency: Currency = Currency.GBP

    @field_validator("placed_at")
    @classmethod
    def not_in_the_future(cls, v: datetime) -> datetime:
        if v > datetime.now(v.tzinfo):
            raise ValueError("placed_at cannot be in the future")
        return v
`,
      hl: [17, 18, 23, 24, 34],
      caption: "**`extra=\"forbid\"` is the setting most worth turning on.** By default Pydantic ignores unknown keys, so a client sending `quanitity` gets the default and no error — and the bug surfaces as a wrong number rather than a rejected request."
    },

    { t: "callout", kind: "trap", title: "The default is to silently discard typos", body: [
      { t: "code", lang: "python", title: "two characters, no error", numbered: false, code: `
class Payload(BaseModel):
    quantity: int = 1


Payload(**{"quanitity": 500})       # -> Payload(quantity=1)
                                     # No error. The 500 is gone.`,
        out: `quantity=1`},
      { t: "p", text: "With `extra=\"forbid\"` the same call raises with the offending key named. With `extra=\"allow\"` the value is kept on the model, which is occasionally what you want for a passthrough proxy and almost never otherwise." },
      { t: "p", text: "**Set it in a shared base model** so every model in the service inherits it, rather than hoping each author remembers." },
      { t: "code", lang: "python", title: "one base, applied everywhere", numbered: false, code: `
class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        str_strip_whitespace=True,
        validate_assignment=True,
    )


class Order(StrictModel):
    ...`}
    ]},

    { t: "h2", n: "02", text: "Where to put a rule", id: "validators" },

    { t: "table",
      head: ["Rule", "Use", "Runs"],
      rows: [
        ["`quantity >= 1`", "`Field(ge=1)`", "In Rust, fastest — prefer this"],
        ["A string matching a pattern", "`Field(pattern=...)`", "In Rust"],
        ["One of a fixed set", "An `Enum` or `Literal`", "In Rust"],
        ["Normalise a value before checking", "`@field_validator(mode=\"before\")`", "Before coercion"],
        ["Check one field, needing custom logic", "`@field_validator`", "After coercion"],
        ["A rule spanning two fields", "**`@model_validator(mode=\"after\")`**", "Once the model exists"],
        ["Reshape the whole input", "`@model_validator(mode=\"before\")`", "On the raw dict"]
      ],
      caption: "**Reach for `Field` constraints first.** Pydantic v2 evaluates them in compiled Rust; a Python validator is roughly an order of magnitude slower and only pays off when the rule genuinely needs code."
    },

    { t: "code", lang: "python", title: "the two validator shapes you will actually use", code: `
from pydantic import model_validator


class DateRange(BaseModel):
    start: datetime
    end: datetime

    @model_validator(mode="after")
    def end_after_start(self) -> "DateRange":
        """Cross-field rules need the whole model, so mode='after'.
        Returns self; raising ValueError produces a proper error."""
        if self.end <= self.start:
            raise ValueError("end must be after start")
        return self


class Payment(BaseModel):
    amount: Decimal
    currency: Currency

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_shape(cls, data: dict) -> dict:
        """mode='before' sees the RAW input, which is where you absorb a
        format you do not control -- an old client, a vendor's payload
        -- without leaking it into the model's fields."""
        if "amount_cents" in data:
            data = dict(data)
            data["amount"] = Decimal(data.pop("amount_cents")) / 100
        return data
`,
      hl: [8, 21],
      caption: "**`mode=\"before\"` is the adapter layer.** It lets one model accept two input shapes while presenting one clean interface inside — far better than two models and a branch at every call site."
    },

    { t: "callout", kind: "insight", title: "The errors are the product", body: [
      { t: "code", lang: "python", title: "what a caller gets back", numbered: false, code: `
from pydantic import ValidationError

try:
    Order.model_validate({"customer_id": "c-1", "lines": [], "placed_at": "nope"})
except ValidationError as exc:
    print(exc.errors())`,
        out: `[
 {"type": "too_short", "loc": ("lines",),
  "msg": "List should have at least 1 item after validation, not 0",
  "input": []},
 {"type": "datetime_parsing", "loc": ("placed_at",),
  "msg": "Input should be a valid datetime, ...",
  "input": "nope"}
]`},
      { t: "p", text: "**Every problem is reported, not just the first** — so a client fixes their payload in one round trip rather than five. `loc` is a path, so a nested error points at `(\"lines\", 2, \"quantity\")`." },
      { t: "p", text: "**Never return `str(exc)` to a caller.** It includes the input values, which is how a validation error leaks a password or a card number into a log or an HTTP response. Map `errors()` into your own shape and drop `input` (Lesson 6.4)." }
    ]},

    { t: "h2", n: "03", text: "Serialisation is a separate contract", id: "serialisation" },

    { t: "code", lang: "python", title: "what goes out is not what came in", code: `
from pydantic import Field, SecretStr, computed_field


class User(BaseModel):
    id: str
    email: str
    password_hash: str = Field(exclude=True)      # never serialised
    api_key: SecretStr                            # repr'd as **********
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)

    @computed_field
    @property
    def display_name(self) -> str:
        return self.email.split("@")[0]


user.model_dump()                       # python objects
user.model_dump(mode="json")            # JSON-safe: datetime -> str
user.model_dump_json()                  # a JSON string, in Rust
user.model_dump(by_alias=True)          # {"createdAt": ...}
user.model_dump(exclude_none=True)      # drop nulls
user.model_dump(include={"id", "email"})
`,
      hl: [7, 8, 9],
      caption: "**`Field(exclude=True)` and `SecretStr` are the two that prevent incidents.** A `password_hash` in a `model_dump()` reaches a log or a response the first time someone logs the object (Lesson 6.4)."
    },

    { t: "callout", kind: "warn", title: "Separate the input model from the output model", body: [
      { t: "code", lang: "python", title: "one model for two jobs is how fields leak", numbered: false, code: `
# The tempting version: one User model for create, read and update
@app.post("/users")
def create(user: User) -> User:      # accepts id? accepts created_at?
    ...                               # returns password_hash?`},
      { t: "code", lang: "python", title: "three models, three contracts", numbered: false, code: `
class UserCreate(StrictModel):
    email: EmailStr
    password: SecretStr               # in, never out


class UserUpdate(StrictModel):
    email: EmailStr | None = None     # all optional: PATCH semantics


class UserPublic(StrictModel):
    id: str                           # out, never in
    email: EmailStr
    created_at: datetime


@app.post("/users", response_model=UserPublic, status_code=201)
def create(payload: UserCreate) -> UserPublic:
    ...`},
      { t: "p", text: "**The models are cheap and the coupling is expensive.** One shared model means adding an internal field to the entity silently adds it to the API — the classic accidental breaking change, in the direction of exposure rather than removal (Lesson 12.6)." }
    ]},

    { t: "h2", n: "04", text: "Settings", id: "settings" },

    { t: "code", lang: "python", title: "typed configuration, validated at startup", code: `
from pydantic import Field, PostgresDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="APP_",
        env_nested_delimiter="__",     # APP_DB__POOL_SIZE
        extra="forbid",                # a typo'd env var is an error
    )

    environment: Literal["local", "staging", "production"] = "local"
    database_url: PostgresDsn
    secret_key: SecretStr
    pool_size: int = Field(default=10, ge=1, le=100)
    request_timeout: float = Field(default=10.0, gt=0)

    @model_validator(mode="after")
    def production_is_stricter(self) -> "Settings":
        if self.environment == "production" and self.pool_size < 5:
            raise ValueError("production needs a pool of at least 5")
        return self


@functools.cache
def get_settings() -> Settings:
    """Cached, so the environment is read once per process. Called from
    a function rather than at import, so a test can override it and an
    unset variable fails with a message rather than an ImportError
    (Lesson 9.6)."""
    return Settings()
`,
      hl: [10, 26, 27],
      caption: "**The point is that it fails at startup.** A missing or malformed variable stops the process immediately with the field named, rather than raising a `KeyError` three hours into a batch job."
    },

    { t: "callout", kind: "tradeoff", title: "Where Pydantic is the wrong tool", body: [
      { t: "table",
        head: ["Situation", "Better"],
        rows: [
          ["Internal objects you construct yourself", "`@dataclass(slots=True)` — no validation cost (Lesson 4.10)"],
          ["Millions of rows in a hot loop", "A dataclass, or columns — validating each row is the bottleneck"],
          ["Data you receive and pass straight on", "`TypedDict` — zero runtime cost (Lesson 8.4)"],
          ["A structural interface", "`Protocol` — Pydantic is about data, not behaviour"],
          ["Dataframe-shaped data", "`pandera` or column checks, not per-row models"]
        ]
      },
      { t: "p", text: "**Validation costs about 1–3 µs per model in v2.** Negligible at the edge of a request; significant at a million rows, where the right move is to validate the schema once and process columns." },
      { t: "p", text: "**Use it at boundaries, not everywhere.** A Pydantic model for an object that never leaves your process is paying a runtime check to protect against your own bugs — which is what the type checker and the tests are for." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Turn a defensive handler into a boundary",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "This handler validates by hand, leaks a field it should not, and has three bugs the checks do not catch. Replace the checking with a model." },
        { t: "code", lang: "python", numbered: false, title: "handler.py — as found", code: `
@app.post("/orders")
def create_order(payload: dict):
    if "customer_id" not in payload:
        return {"error": "customer_id required"}, 400
    if "lines" not in payload or not payload["lines"]:
        return {"error": "lines required"}, 400

    total = 0
    for line in payload["lines"]:
        if line.get("quantity", 0) <= 0:
            return {"error": "bad quantity"}, 400
        total += line["price"] * line["quantity"]

    order = orders.create(
        customer_id=payload["customer_id"],
        lines=payload["lines"],
        total=total,
        notes=payload.get("notes", ""),
    )
    return order.__dict__`},
        { t: "p", text: "The three uncaught bugs are the interesting part — the hand-written checks look thorough." }
      ],
      requirements: [
        "Replace the manual checks with input and output models.",
        "Find the three bugs the existing checks miss.",
        "Say what `return order.__dict__` exposes.",
        "Report every validation problem at once, not one per round trip.",
        "Keep the error response free of the submitted values.",
        "**Explain why the error status should be 422 rather than 400.**"
      ],
      hint: "What type is `line[\"price\"]` when it arrives as JSON? What happens if `lines` is a dict rather than a list? And how many lines may a client send?",
      solution: {
        lang: "python",
        title: "handler.py",
        code: `# =========================================================================
# THE THREE BUGS THE CHECKS MISS
# =========================================================================
#
# 1. price IS A FLOAT, AND IT IS MONEY
#
#    JSON has one number type. {"price": 19.99} arrives as a Python
#    float, so total accumulates binary rounding error:
#
#      0.1 + 0.2                      -> 0.30000000000000004
#      19.99 * 3                      -> 59.97000000000001
#
#    Nothing checks the TYPE at all -- only that quantity > 0 -- so a
#    price of "19.99" as a STRING also passes the checks and then
#    raises TypeError inside the multiplication, or worse, silently
#    concatenates if quantity were a string too (Lesson 2.6).
#
# 2. lines MAY NOT BE A LIST
#
#    "lines" in payload and payload["lines"] being truthy is satisfied
#    by a dict, a string, or an int:
#
#      {"lines": "abc"}   -> iterating gives "a", "b", "c";
#                            line.get() raises AttributeError
#      {"lines": {"a": 1}} -> iterating gives the KEY "a"
#
#    The 400 check passes and the handler crashes with a 500 -- so a
#    malformed request is reported as our bug.
#
# 3. NO UPPER BOUND ON ANYTHING
#
#    A client may send 500,000 lines, a customer_id of 10 MB, or a
#    quantity of 2**63. The loop is unbounded work driven by an
#    untrusted input, which is a denial-of-service vector requiring no
#    special effort to trigger.
#
# Plus: total is computed from client-supplied prices with no reference
# to the catalogue, and returned as authoritative.


from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import HTTPException, Request, status
from fastapi.exception_handlers import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    """One base, so no author has to remember the settings.

    extra="forbid" is the important one: by default Pydantic DISCARDS
    unknown keys, so a client sending "quanitity" gets the default and
    no error at all.
    """

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        str_strip_whitespace=True,
    )


# ---- input --------------------------------------------------------------

class OrderLineIn(StrictModel):
    sku: Annotated[str, Field(pattern=r"^[A-Z]{2}-\\d{4}$")]

    # BUG 3: bounded on both sides. le=1000 is a business rule; without
    # it, quantity is bounded only by what fits in an int.
    quantity: Annotated[int, Field(ge=1, le=1000)]


class OrderCreate(StrictModel):
    """Note what is NOT here: no total, no id, no created_at. A client
    does not get to tell us what an order costs -- see below."""

    customer_id: Annotated[str, Field(min_length=1, max_length=64)]

    # BUG 2: typed as a list, so a dict or a string is rejected with a
    # clear message instead of crashing inside the loop.
    # BUG 3: max_length bounds the work an untrusted request can cause.
    lines: Annotated[list[OrderLineIn], Field(min_length=1, max_length=100)]

    notes: Annotated[str, Field(default="", max_length=2000)]


# ---- output -------------------------------------------------------------

class OrderLineOut(StrictModel):
    sku: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderPublic(StrictModel):
    """A SEPARATE model, which is what stops internal fields leaking.

    order.__dict__ exposed everything the ORM object happened to carry:
    _sa_instance_state, internal_notes, cost_price (our margin),
    fraud_score, and any column added later -- automatically, with no
    code change to notice in review.
    """

    id: str
    customer_id: str
    lines: list[OrderLineOut]
    total: Decimal
    currency: str
    created_at: datetime


# ---- the handler --------------------------------------------------------

@app.post(
    "/orders",
    response_model=OrderPublic,               # the output contract
    status_code=status.HTTP_201_CREATED,
)
def create_order(payload: OrderCreate) -> OrderPublic:
    """Every check from the original is gone, because the type is the
    guarantee. What remains is the part that was never validation:
    pricing must come from OUR catalogue, not from the request.
    """
    # BUG 1: prices are looked up, not accepted. Decimal from a string,
    # never from a float.
    priced = []
    for line in payload.lines:
        product = catalogue.get(line.sku)
        if product is None:
            raise HTTPException(422, f"unknown sku: {line.sku}")
        priced.append((line, product.unit_price))

    total = sum((price * line.quantity for line, price in priced),
                start=Decimal("0.00"))

    order = orders.create(
        customer_id=payload.customer_id,
        lines=[(line.sku, line.quantity, price) for line, price in priced],
        total=total,
        notes=payload.notes,
    )
    # Constructed explicitly rather than dumping the entity.
    return OrderPublic.model_validate(order, from_attributes=True)


# ---- the error contract -------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_errors(request: Request, exc: RequestValidationError):
    """Report EVERY problem at once, and never echo the input.

    str(exc) and exc.errors() both include the submitted value, so
    returning them verbatim leaks whatever the client sent -- a
    password, a card number, a token (Lesson 6.4).
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "validation_failed",
            "detail": [
                {
                    "field": ".".join(str(p) for p in err["loc"][1:]),
                    "message": err["msg"],
                    "type": err["type"],
                    # "input" deliberately omitted
                }
                for err in exc.errors()
            ],
        },
    )


# =========================================================================
# WHY 422 RATHER THAN 400
# =========================================================================
#
#   400  the request is MALFORMED -- the bytes are not valid JSON, the
#        Content-Type is wrong, the framing is broken. The client cannot
#        fix this by changing a value.
#
#   422  the request is well-formed and SEMANTICALLY wrong -- it parsed
#        fine, and quantity is -1.
#
# The distinction is actionable: a 400 usually means the client's
# serialiser or transport is broken, and a 422 means a specific field
# needs a different value. A client that treats them the same writes one
# handler; a client that treats them differently can retry a 422 with a
# corrected payload and must not retry a 400 unchanged.
#
# The original returned 400 for both, so a caller could not tell "your
# JSON is broken" from "quantity must be positive".


# =========================================================================
# TESTS
# =========================================================================

import pytest


def test_a_typo_is_rejected_rather_than_ignored(client):
    """extra='forbid'. By DEFAULT Pydantic discards unknown keys, so
    'quanitity' would silently become the default."""
    r = client.post("/orders", json={
        "customer_id": "c-1",
        "lines": [{"sku": "AB-1234", "quanitity": 5}],
    })

    assert r.status_code == 422
    fields = {d["field"] for d in r.json()["detail"]}
    assert "lines.0.quanitity" in fields or "lines.0.quantity" in fields


def test_lines_must_be_a_list(client):
    """BUG 2. The original's truthiness check passed for a string, then
    crashed inside the loop and returned a 500."""
    for bad in ("abc", {"a": 1}, 42):
        r = client.post("/orders", json={"customer_id": "c-1", "lines": bad})
        assert r.status_code == 422, f"{bad!r} was accepted"


def test_the_client_cannot_set_the_price(client):
    """BUG 1, and the security half of it: prices come from the
    catalogue. A client supplying 0.01 must be rejected, not obeyed."""
    r = client.post("/orders", json={
        "customer_id": "c-1",
        "lines": [{"sku": "AB-1234", "quantity": 1, "unit_price": "0.01"}],
    })

    assert r.status_code == 422          # extra='forbid' catches it


def test_money_is_exact(client):
    """BUG 1. Three lines at 19.99 is 59.97, not 59.97000000000001."""
    r = client.post("/orders", json={
        "customer_id": "c-1",
        "lines": [{"sku": "AB-1234", "quantity": 3}],
    })

    assert r.status_code == 201
    assert r.json()["total"] == "59.97"


def test_an_oversized_request_is_bounded(client):
    """BUG 3. 500,000 lines is unbounded work driven by an untrusted
    input, and needs no special effort to send."""
    r = client.post("/orders", json={
        "customer_id": "c-1",
        "lines": [{"sku": "AB-1234", "quantity": 1}] * 500_000,
    })

    assert r.status_code == 422


def test_every_error_is_reported_at_once(client):
    """The original returned on the FIRST problem, so fixing a payload
    took one round trip per mistake."""
    r = client.post("/orders", json={
        "lines": [{"sku": "bad", "quantity": -1}],
    })

    fields = {d["field"] for d in r.json()["detail"]}
    assert len(fields) >= 3          # customer_id, sku, quantity


def test_errors_do_not_echo_the_input(client):
    """str(exc) and exc.errors() both include the submitted value."""
    r = client.post("/orders", json={
        "customer_id": "c-1",
        "lines": [{"sku": "AB-1234", "quantity": 1}],
        "notes": "card 4111111111111111",
    })

    assert "4111111111111111" not in r.text


def test_the_response_exposes_only_the_public_contract(client):
    """order.__dict__ returned every attribute the entity happened to
    have -- including cost_price and any column added later."""
    r = client.post("/orders", json={
        "customer_id": "c-1",
        "lines": [{"sku": "AB-1234", "quantity": 1}],
    })

    assert set(r.json()) == {
        "id", "customer_id", "lines", "total", "currency", "created_at",
    }`,
        notes: [
          { t: "p", text: "**`return order.__dict__` is the most dangerous line in the original**, because it is automatic. It exposes `_sa_instance_state`, `cost_price`, `internal_notes`, `fraud_score` — and every column anyone adds in future, with no diff to review. A separate output model makes exposure a deliberate act." },
          { t: "p", text: "**Typing `lines` as `list[OrderLineIn]` fixes a 500, not just a validation gap.** The original's `not payload[\"lines\"]` check is satisfied by the string `\"abc\"`, which then iterates into characters and raises `AttributeError` inside the loop — so a malformed request was reported as a server error." },
          { t: "p", text: "**The price lookup is a security fix wearing a correctness costume.** Accepting `price` from the request means a client can order anything for a penny. `extra=\"forbid\"` rejects it outright, and the catalogue lookup means the total is ours regardless of what was sent." },
          { t: "callout", kind: "insight", title: "The bounds are the denial-of-service fix", body: [
            { t: "p", text: "`max_length=100` on `lines` and `le=1000` on `quantity` cost nothing and cap the work an untrusted request can cause. Without them, a single request with half a million lines drives an unbounded loop and an unbounded database write." },
            { t: "p", text: "This is the same rule as capping input length before a regex (Lesson 5.11): anything sized by data you did not produce needs a limit, and the limit belongs at the boundary." }
          ]},
          { t: "p", text: "**Omitting `input` from the error response is not optional.** `exc.errors()` includes the value that failed, so a validation error on a payload containing a card number returns that card number — into a log, a browser console, and an error tracker (Lesson 6.4)." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team returns their ORM objects directly from FastAPI endpoints, which works and saves writing response models. Eight months later someone adds a `supplier_cost` column to the products table for a margin report." },
      { t: "p", text: "**The column appeared in the public API the same afternoon.** Every product endpoint began returning wholesale cost to customers, because the response shape was whatever the entity happened to have — and nothing in the diff mentioned the API at all." },
      { t: "p", text: "**A competitor found it within a week.** The change that caused it was a migration and a report; the review had no reason to consider the API surface, because the coupling was invisible in the code being changed." },
      { t: "p", text: "**An explicit response model would have made it a non-event.** The new column simply would not have appeared, and adding it to the API would have been a deliberate line in a diff. **The cost of a separate output model is a few lines per endpoint; the cost of not having one is that your API surface changes when your database does.**" }
    ]}
  ],

  takeaways: [
    "**Parse at the boundary, then trust the type.** A parsed model is a different type from a payload, which is why the defensive checks disappear rather than repeat.",
    "**`extra=\"forbid\"` is the setting most worth turning on.** The default silently discards unknown keys, so a typo becomes a default value rather than an error.",
    "**Put the settings in a shared base model**, so every model inherits them and no author has to remember.",
    "**Prefer `Field` constraints to validators.** They run in compiled Rust; a Python validator is roughly ten times slower and should earn its place.",
    "**Cross-field rules need `@model_validator(mode=\"after\")`**; absorbing a legacy input shape needs `mode=\"before\"`.",
    "**Pydantic reports every error at once**, so a client fixes their payload in one round trip — and `loc` gives the path into nested data.",
    "**Never return `str(exc)` or raw `errors()` to a caller.** Both include the submitted value, which is how a card number ends up in a log.",
    "**Separate input and output models.** One shared model means adding an internal field silently adds it to your public API.",
    "**`Field(exclude=True)` and `SecretStr`** keep credentials out of `model_dump` and out of reprs.",
    "**Bound every collection and string from an untrusted source.** Without `max_length`, a single request can drive unbounded work.",
    "**Load configuration with `BaseSettings` behind a cached function**, so it fails at startup with the field named rather than mid-job.",
    "**Do not use Pydantic everywhere.** Internal objects want dataclasses; a million rows want columns; a structural interface wants a `Protocol`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A client sends `{\"quanitity\": 500}` to a model with a `quantity: int = 1` field. What happens by default?",
        options: [
          "A validation error naming the unknown key",
          "The unknown key is silently discarded and `quantity` takes its default of 1",
          "`quanitity` is stored on the model as an extra attribute",
          "The request is rejected as malformed JSON"
        ],
        answer: 1,
        why: "Pydantic ignores unknown keys unless told otherwise, so a two-character typo becomes a wrong value with no error anywhere. `extra=\"forbid\"` turns it into a clear rejection naming the field. Set it in a shared base model rather than per model, so it applies without anyone having to remember."
      },
      {
        stem: "An endpoint returns `order.__dict__`. Eight months later a `supplier_cost` column is added to the table. What happens?",
        options: [
          "Nothing — the API response shape is fixed at deploy time",
          "The new column appears in the public API immediately, with nothing in the diff mentioning the API",
          "The endpoint raises because the shape no longer matches",
          "The field is included but set to null"
        ],
        answer: 1,
        why: "Dumping an entity makes the API surface whatever the entity happens to have, so a migration silently changes a public contract. Reviewers of a migration have no reason to think about the API. An explicit response model means the field does not appear unless someone adds it deliberately, as a visible line in a diff."
      },
      {
        stem: "Why should a validation failure return 422 rather than 400?",
        options: [
          "422 is retried automatically by HTTP clients",
          "400 means the request is malformed — bad JSON, wrong content type; 422 means it parsed correctly and a value is semantically wrong",
          "400 is reserved for authentication problems",
          "They are interchangeable; 422 is a convention only"
        ],
        answer: 1,
        why: "The distinction is actionable for the caller. A 400 usually means their serialiser or transport is broken and retrying unchanged will fail identically. A 422 names a field they can correct and resubmit. Collapsing both into 400 means a client cannot tell \"your JSON is broken\" from \"quantity must be positive\"."
      },
      {
        stem: "Why is returning `exc.errors()` directly to a client risky?",
        options: [
          "It is too verbose for most clients",
          "Each entry includes the `input` value that failed, so a validation error on a payload containing a secret returns that secret",
          "The error types are not stable across Pydantic versions",
          "It bypasses the response model"
        ],
        answer: 1,
        why: "A field that failed validation still had a value, and Pydantic reports it to help debugging. If the payload contained a password, a token or a card number, that value goes back in the response — and into logs and error trackers with it. Map the errors into your own shape and drop `input`."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does Pydantic give you beyond type hints?",
        strong: "Runtime enforcement at a boundary. Type hints are checked before the code runs and say nothing about a payload that arrives at three in the morning; a Pydantic model turns untrusted data into a typed object or rejects it with a per-field error.",
        answer: [
          { t: "p", text: "\"Parse, don't validate\" is the framing worth using: the parsed object is a different type, so the checks disappear rather than being repeated through the interior." },
          { t: "p", text: "The error quality is a real product feature — every problem reported at once, with a path into nested data, so a client fixes their payload in one round trip." },
          { t: "p", text: "Knowing where not to use it — internal objects, hot loops over millions of rows — keeps it a judgement rather than a default." }
        ]
      },
      {
        level: "advanced",
        q: "Would you use the same model for request and response?",
        strong: "No. They are different contracts: the input has fields the output must never contain, like a password, and the output has fields a client must not set, like an id. One model means adding an internal field silently exposes it.",
        answer: [
          { t: "p", text: "The migration example is what makes the argument concrete — a column added for a report appearing in the public API the same afternoon, with nothing in the diff about the API." },
          { t: "p", text: "The cost comparison lands it: a few extra lines per endpoint against an API surface that changes whenever the database does." },
          { t: "p", text: "Mentioning `Field(exclude=True)` and `SecretStr` shows the defence in depth for the fields that matter most." }
        ]
      },
      {
        level: "advanced",
        q: "Where do you put a rule that spans two fields?",
        strong: "`@model_validator(mode=\"after\")`, because it runs once the model exists and both fields are coerced. Single-field constraints belong in `Field` where they run in compiled Rust, and reshaping a legacy input shape belongs in `mode=\"before\"`.",
        answer: [
          { t: "p", text: "Knowing the performance ordering — Rust constraints, then Python validators — shows the choice is informed rather than habitual." },
          { t: "p", text: "`mode=\"before\"` as an adapter layer is the genuinely useful pattern: one model accepting two input shapes beats two models and a branch at every call site." },
          { t: "p", text: "Noting that a validator should raise `ValueError` rather than returning a flag connects it to how the error ends up in the response." }
        ]
      }
    ]
  }
});
