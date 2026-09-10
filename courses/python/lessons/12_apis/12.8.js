/* ============================================================================
   LESSON 12.8 — Authentication, Authorisation and Secrets
   ========================================================================= */
EC.receiveLesson({
  id: "12.8",

  lede: "Authentication asks who you are. Authorisation asks what you may do. **Most breaches are failures of the second**, because the first is a library call and the second is a decision made separately in every handler you write — and missed in one of them.",

  objectives: [
    "Store passwords so a database leak is not an account leak",
    "Choose between sessions and tokens on the property that actually differs",
    "Issue and verify a JWT without the four mistakes that make it useless",
    "Place authorisation where it cannot be forgotten",
    "Keep secrets out of the repository, the image and the logs"
  ],

  prerequisites: ["12.4", "12.5"],

  blocks: [

    { t: "h2", n: "01", text: "Passwords", id: "passwords" },


    { t: "viz",
      title: "Authentication, authorisation and secrets are three questions",
      caption: "They fail differently and are fixed differently. Conflating them is how an endpoint ends up correctly identifying a user and then letting them read someone else's record.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Three separate security questions with the failure each produces">
  <g style="stroke-width:2">
    <rect x="24"  y="46" width="260" height="124" rx="8" style="fill:var(--accent);fill-opacity:.13;stroke:var(--accent)"/>
    <rect x="310" y="46" width="260" height="124" rx="8" style="fill:var(--warn);fill-opacity:.13;stroke:var(--warn)"/>
    <rect x="596" y="46" width="260" height="124" rx="8" style="fill:var(--good);fill-opacity:.13;stroke:var(--good)"/>
  </g>
  <text x="44"  y="74" class="s-label" style="fill:var(--accent)">AUTHENTICATION</text>
  <text x="330" y="74" class="s-label" style="fill:var(--warn)">AUTHORISATION</text>
  <text x="616" y="74" class="s-label" style="fill:var(--good)">SECRETS</text>

  <text x="44"  y="102" class="s-sub" style="fill:var(--ink-2)">who are you?</text>
  <text x="330" y="102" class="s-sub" style="fill:var(--ink-2)">may you do this?</text>
  <text x="616" y="102" class="s-sub" style="fill:var(--ink-2)">where is the key kept?</text>

  <text x="44"  y="134" class="s-sub" style="fill:var(--ink-3)">401 when it fails</text>
  <text x="330" y="134" class="s-sub" style="fill:var(--ink-3)">403 when it fails</text>
  <text x="616" y="134" class="s-sub" style="fill:var(--ink-3)">env or a secret store</text>
  <text x="44"  y="156" class="s-sub" style="fill:var(--crit)">a stolen token</text>
  <text x="330" y="156" class="s-sub" style="fill:var(--crit)">reading another user's row</text>
  <text x="616" y="156" class="s-sub" style="fill:var(--crit)">a key in the repo</text>

  <text x="24" y="206" class="s-sub" style="fill:var(--ink-3)">Authorise on the object, not the endpoint: knowing who the caller is says nothing about whether this row is theirs.</text>
</svg>`
    },
    { t: "code", lang: "python", title: "the whole of it", code: `
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

# Argon2id is the current recommendation; bcrypt remains fine. The
# parameters are the point -- they are what makes an offline attack
# expensive, and they must be raised as hardware improves.
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def hash_password(plain: str) -> str:
    # The salt is generated per password and stored inside the hash
    # string. You never manage it, and you never reuse one.
    return ph.hash(plain)


def verify_password(plain: str, stored: str) -> bool:
    try:
        ph.verify(stored, plain)
    except (VerifyMismatchError, VerificationError):
        return False

    # Parameters were raised since this hash was made. We have the
    # plaintext right now, and this is the only moment we ever will --
    # so upgrade it silently.
    if ph.check_needs_rehash(stored):
        user.password_hash = ph.hash(plain)
        db.commit()

    return True
`,
      hl: [7, 12, 25],
      caption: "**Never write this yourself.** Not the salt generation, not the comparison, not a \"quick\" SHA-256 with a pepper. A password hash has one job — to be slow — and every hand-rolled version is fast."
    },

    { t: "callout", kind: "trap", title: "Login endpoints leak more than you think", body: [
      { t: "code", lang: "python", title: "three leaks in nine lines", numbered: false, code: `
# LEAK 1 -- USER ENUMERATION VIA THE MESSAGE.
user = db.get_by_email(email)
if not user:
    raise HTTPException(401, "No account with that email")   # no
if not verify(password, user.hash):
    raise HTTPException(401, "Incorrect password")           # no
# Both must be the SAME message: "Invalid email or password".

# LEAK 2 -- USER ENUMERATION VIA TIMING.
# The early return above skips the hash entirely, so a missing account
# answers in 2ms and a real one in 200ms. That difference is trivially
# measurable over a network, and it is a full account list.
if user is None:
    ph.verify(DUMMY_HASH, password)      # burn the same time
    raise HTTPException(401, GENERIC)

# LEAK 3 -- THE PASSWORD IN A LOG.
logger.info("login attempt", extra={"body": await request.json()})
# One debug line, and every password is in the log aggregator with a
# 90-day retention -- searchable by anyone with dashboard access.`},
      { t: "p", text: "**Leak 2 is the one that survives review**, because the code looks careful — the messages match, and the early return reads as an optimisation. It is a full enumeration oracle regardless." },
      { t: "p", text: "**Rate limit by both IP and account.** IP alone misses a distributed attempt against one account; account alone misses credential stuffing across thousands of accounts from one host." }
    ]},

    { t: "h2", n: "02", text: "Sessions or tokens", id: "sessions-vs-tokens" },

    { t: "table",
      head: ["", "Server session", "JWT"],
      rows: [
        ["Revocation", "**Immediate — delete the row**", "**Not possible** until expiry, without a store"],
        ["Verification", "A lookup per request", "A signature check, no I/O"],
        ["Carries state", "Any amount, server-side", "Everything is in the token and visible"],
        ["Size on the wire", "~32 bytes", "Several hundred bytes, every request"],
        ["Cross-service", "Needs a shared store", "**Self-contained**"],
        ["Right for", "**A first-party web application**", "Service-to-service, and short-lived access tokens"]
      ],
      caption: "**Revocation is the whole argument.** Everything else is a detail; the question is what you do at 3am when a token is compromised, and a stateless JWT has no answer that does not involve waiting."
    },

    { t: "callout", kind: "tradeoff", title: "The refresh-token compromise", body: [
      { t: "p", text: "The standard resolution keeps both properties by splitting the credential in two: a **short-lived access token** verified statelessly, and a **long-lived refresh token** that is a database row." },
      { t: "code", lang: "python", title: "why this works", numbered: false, code: `
access token    15 minutes    JWT, no lookup, cannot be revoked
refresh token   30 days       opaque, a row, revoked instantly

# Compromise is bounded by the access token lifetime, not the session's.
# Revoking the refresh token means the attacker gets at most 15 more
# minutes -- and the user is not asked to log in every quarter hour.

# ROTATION detects theft. Each refresh issues a NEW refresh token and
# invalidates the old one. If an old one is ever presented again, two
# parties hold it: revoke the entire family and force a re-login.`},
      { t: "p", text: "**Rotation with reuse detection is the part worth implementing.** Without it, a stolen refresh token is a thirty-day session for the attacker and nothing ever notices; with it, the theft surfaces the moment either party refreshes." },
      { t: "p", text: "**If you are building one first-party web app, use a session.** The refresh dance exists to solve a distributed-systems problem, and adopting it for a single application buys complexity with no return." }
    ]},

    { t: "h2", n: "03", text: "JWTs, without the four mistakes", id: "jwt" },

    { t: "code", lang: "python", title: "issuing and verifying", code: `
import jwt

def issue_access_token(user: User) -> str:
    now = datetime.now(tz=UTC)
    return jwt.encode(
        {
            "sub": str(user.id),
            "iat": now,
            "exp": now + timedelta(minutes=15),    # SHORT. Always.
            "iss": "api.acme.com",
            "aud": "api.acme.com",
            "scopes": user.scopes,
            # A version bumped on password change and on logout-
            # everywhere: verification rejects tokens minted before it.
            "ver": user.token_version,
        },
        settings.jwt_secret.get_secret_value(),
        algorithm="HS256",
    )


def verify(token: str) -> TokenData:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            # A LIST of accepted algorithms, never taken from the token.
            algorithms=["HS256"],
            audience="api.acme.com",
            issuer="api.acme.com",
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired", {"WWW-Authenticate": "Bearer"})
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    return TokenData(**payload)
`,
      hl: [9, 15, 28, 31],
      caption: "**`options={\"require\": [...]}` is not decoration.** Without it a token with no `exp` verifies perfectly and never expires — and a token with no `aud` minted for a different service of yours is accepted here."
    },

    { t: "callout", kind: "trap", title: "The four that appear in real code", body: [
      { t: "code", lang: "python", title: "each has caused a public breach", numbered: false, code: `
# 1. ALGORITHM CONFUSION.
jwt.decode(token, key, algorithms=[header["alg"]])   # catastrophic
# The attacker sets alg to "none", or swaps RS256 for HS256 and signs
# with your PUBLIC key as the HMAC secret. Both forge any token.
# Always pass a fixed list you control.

# 2. DECODING WITHOUT VERIFYING.
payload = jwt.decode(token, options={"verify_signature": False})
# Appears in debugging code and survives to production. The payload is
# base64, not encryption -- anyone can write one.

# 3. SECRETS IN THE PAYLOAD.
{"sub": "u-1", "password_hash": "...", "internal_role": "admin"}
# A JWT is SIGNED, not ENCRYPTED. Every claim is readable by anyone
# holding the token, including the browser it was issued to.

# 4. NO EXPIRY, OR A LONG ONE.
{"sub": "u-1"}                                 # valid forever
{"sub": "u-1", "exp": now + timedelta(days=90)}  # 90 days of exposure
# There is no revocation. The expiry IS the security boundary.`},
      { t: "p", text: "**Number one is the classic and it still ships.** Any code path where the algorithm comes from the token rather than your configuration is a complete authentication bypass, not a hardening opportunity." }
    ]},

    { t: "h2", n: "04", text: "Authorisation is the harder half", id: "authz" },

    { t: "ladder",
      title: "Only the owner may read an order",
      rungs: [
        { level: "bad", label: "Authenticated means authorised",
          why: "The endpoint proves who is asking and then ignores the answer. Any logged-in user reads any order by changing the id — the single most common vulnerability in real APIs, and it passes every test that only logs in as the owner.",
          code: `@app.get("/orders/{oid}")
def get_order(oid: str, user: CurrentUser, db: DB):
    return db.get(Order, oid)          # whose order? nobody asked` },
        { level: "ok", label: "Check in the handler",
          why: "Correct here, and it depends on every future handler remembering. There will be twelve of them, written by four people over two years, and one will be missed — the omission looks exactly like working code.",
          code: `@app.get("/orders/{oid}")
def get_order(oid: str, user: CurrentUser, db: DB):
    order = db.get(Order, oid)
    if order is None or order.account_id != user.account_id:
        raise HTTPException(404, "Not found")   # 404, not 403
    return order` },
        { level: "best", label: "Make the scope structural",
          why: "The dependency resolves the resource and the permission together, so a handler cannot receive an object it is not entitled to. Forgetting the check is no longer possible, because there is nothing to forget.",
          code: `def owned_order(
    oid: str, user: CurrentUser, db: DB,
) -> Order:
    order = db.execute(
        select(Order).where(
            Order.id == oid,
            Order.account_id == user.account_id,   # in the QUERY
        )
    ).scalar_one_or_none()

    if order is None:
        # 404 whether it is missing or forbidden. A 403 confirms the
        # id exists, which is an enumeration oracle.
        raise HTTPException(404, "Not found")
    return order


OwnedOrder = Annotated[Order, Depends(owned_order)]


@app.get("/orders/{oid}", response_model=OrderPublic)
def get_order(order: OwnedOrder) -> Order:
    return order                       # already proven to be theirs`,
          note: "**Filtering in the query rather than after the fetch is the important part.** A post-fetch comparison still loads the row, so a timing difference or an error in the serialiser can reveal that it exists." }
      ]
    },

    { t: "callout", kind: "insight", title: "404 rather than 403", body: [
      { t: "p", text: "Returning 403 for another account's order tells the caller the id is real. Iterate through ids, sort by status code, and you have an inventory of every order in the system — including how many exist and roughly when they were created." },
      { t: "p", text: "**Use 403 only when the caller already knows the resource exists** — their own order, an action their role forbids. Then the distinction is useful rather than informative to an attacker." },
      { t: "p", text: "**Log the difference even when you do not return it.** A 404 that was really a 403 is a strong signal in the audit log, and a burst of them from one account is an attack in progress." }
    ]},

    { t: "h2", n: "05", text: "Secrets", id: "secrets" },

    { t: "code", lang: "python", title: "typed, validated, and hard to leak", code: `
from pydantic import SecretStr, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SecretStr renders as "**********" in repr, str, logs and
    # tracebacks. Reading it requires .get_secret_value(), which is
    # both a safety net and a grep target for review.
    database_url: SecretStr
    jwt_secret: SecretStr = Field(min_length=32)
    stripe_key: SecretStr

    # No default. A missing secret must fail at STARTUP, loudly, not
    # at 2am on the first request that needs it.
    model_config = {"env_file": ".env", "extra": "forbid"}


settings = Settings()       # raises here if anything is missing
`,
      hl: [10, 11],
      caption: "**Fail at import, not at first use.** A service that starts happily with no Stripe key and fails on the first payment has turned a configuration error into a production incident with a customer attached."
    },

    { t: "table",
      head: ["Never", "Instead"],
      rows: [
        ["A secret in the repository", "An environment variable, or a secret manager"],
        ["A secret in a Docker `ENV`", "Injected at runtime — image layers are readable"],
        ["A secret in a URL or query string", "A header — URLs are logged everywhere"],
        ["Logging the request body on an auth route", "An explicit allowlist of loggable fields"],
        ["The same secret in every environment", "**Per-environment**, so staging cannot touch production"],
        ["A secret that has never rotated", "A rotation schedule, and two valid keys during it"]
      ],
      caption: "**Assume every secret leaks eventually.** The design question is not how to prevent it but how quickly you can rotate — which means supporting two valid keys at once, tested, before you need it."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Audit an authentication module",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "This module passes its tests and was approved in review. Find every security problem and rewrite it." },
        { t: "code", lang: "python", numbered: false, title: "app/auth.py", code: `
SECRET = "dev-secret-change-me"

@app.post("/login")
async def login(email: str, password: str, db: DB):
    logger.info(f"login: {email} / {password}")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(401, "No account with that email")

    if hashlib.sha256(password.encode()).hexdigest() != user.password_hash:
        raise HTTPException(401, "Wrong password")

    token = jwt.encode({"user_id": user.id, "role": user.role}, SECRET)
    return {"token": token}


def current_user(authorization: str = Header(None)) -> User:
    payload = jwt.decode(authorization.split()[1], SECRET,
                         algorithms=["HS256", "none"])
    return db.get(User, payload["user_id"])


@app.get("/orders/{oid}")
def get_order(oid: str, user=Depends(current_user)):
    return db.get(Order, oid)`},
        { t: "p", text: "There are at least eleven distinct problems. Two of them are complete authentication bypasses on their own." }
      ],
      requirements: [
        "List all eleven, ranked by severity.",
        "Identify the two total bypasses and explain the exact attack.",
        "Rewrite the module correctly.",
        "Explain why the password check is broken even before the algorithm question.",
        "Give the migration path for existing SHA-256 hashes — you cannot re-hash what you do not have.",
        "Write the tests that would have caught the bypasses."
      ],
      hint: "Look at what `algorithms` accepts, and at what happens in `get_order` after the user is resolved. For the migration, ask what you actually have in the database and what you get at login.",
      solution: {
        lang: "python",
        title: "app/auth.py",
        code: `# =========================================================================
# THE FINDINGS, RANKED
# =========================================================================
#
# CRITICAL -- complete bypass
#   1. algorithms=["none"] in jwt.decode. An attacker crafts a token
#      with alg "none" and NO SIGNATURE, sets user_id to 1 and role to
#      "admin", and is authenticated as anyone. No secret needed.
#
#        header  = {"alg": "none", "typ": "JWT"}
#        payload = {"user_id": 1, "role": "admin"}
#        token   = b64(header) + "." + b64(payload) + "."
#
#      One list entry, total compromise.
#
#   2. A hard-coded secret, committed. "dev-secret-change-me" is in the
#      repository, in every fork, in every CI log, and on the laptop of
#      everyone who has ever cloned it. Anyone holding it forges tokens
#      indefinitely -- and rotating it is now a coordinated incident.
#
# HIGH
#   3. BROKEN OBJECT-LEVEL AUTHORISATION. get_order resolves the user
#      and then never uses it. Any authenticated user reads any order
#      by changing the id. This is the most common real API
#      vulnerability and it passes every test written by someone who
#      logs in as the owner.
#
#   4. UNSALTED SHA-256 FOR PASSWORDS. Wrong on three counts:
#        - fast: a modern GPU does billions of SHA-256 per second, so
#          the entire table is cracked offline in hours
#        - unsalted: identical passwords produce identical hashes, so
#          one crack breaks every user sharing it, and rainbow tables
#          apply directly
#        - a non-constant-time == comparison (see 5)
#
#   5. TIMING-UNSAFE COMPARISON. == short-circuits on the first
#      differing byte. Marginal over a network for a hash, but it is
#      free to do correctly and the habit matters where it is not.
#
#   6. NO TOKEN EXPIRY. No exp claim means valid forever. Combined with
#      no revocation, a token leaked once is permanent access.
#
#   7. PASSWORDS LOGGED IN PLAINTEXT. Every password, in the log
#      aggregator, with 90-day retention, searchable by anyone with
#      dashboard access -- and now also in every backup of it.
#
# MEDIUM
#   8. USER ENUMERATION VIA MESSAGE. "No account with that email"
#      versus "Wrong password" turns the login form into an account
#      directory.
#
#   9. USER ENUMERATION VIA TIMING. The early return skips hashing
#      entirely: a missing account answers in ~2ms, a real one in
#      ~200ms. Fixing the message alone does NOT fix this.
#
#  10. ROLE EMBEDDED IN THE TOKEN, NEVER RECHECKED. Revoking an admin
#      role has no effect until the token expires -- which, per (6),
#      is never.
#
#  11. NO RATE LIMITING. Unlimited attempts, so credential stuffing
#      runs at whatever rate the network allows.
#
# Also: authorization.split()[1] raises IndexError -> 500 on a
# malformed header, and AttributeError on a missing one. Not a
# vulnerability, but it is a 500 where a 401 belongs, and 500s hide
# real signals in the log.


# =========================================================================
# WHY THE PASSWORD CHECK IS BROKEN BEFORE THE ALGORITHM QUESTION
# =========================================================================
#
# Even with SHA-256 replaced by Argon2, this code is wrong: it compares
# a computed digest to a stored string with ==. A password verifier
# must take the SAME time for a correct and an incorrect password, and
# must derive the salt from the stored hash rather than assuming there
# is none. ph.verify() does both. Swapping the algorithm without
# swapping the comparison leaves half the bug in place.


# =========================================================================
# THE REWRITE
# =========================================================================

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)

# Burned when the account does not exist, so the response time matches
# a real verification. Computed once at import.
DUMMY_HASH = ph.hash("dummy-password-for-constant-time-response")

INVALID = "Invalid email or password"      # ONE message, both cases


class LoginRequest(BaseModel):
    email: EmailStr
    # SecretStr keeps it out of repr, logs and tracebacks even if
    # someone later logs the model.
    password: SecretStr = Field(min_length=8, max_length=1024)
    # The max matters: Argon2 on a 10MB password is a denial of
    # service against your own CPU.


@app.post("/login", response_model=TokenPair)
def login(
    body: LoginRequest,
    db: DB,
    request: Request,
    response: Response,
) -> TokenPair:
    # Both dimensions. IP alone misses a distributed attempt on one
    # account; account alone misses stuffing from a single host.
    rate_limit(f"login:ip:{request.client.host}", limit=20, window=300)
    rate_limit(f"login:email:{body.email}", limit=5, window=300)

    user = db.execute(
        select(User).where(User.email == body.email)
    ).scalar_one_or_none()

    plain = body.password.get_secret_value()

    if user is None:
        # Burn equivalent time. Without this the early return is a
        # complete enumeration oracle regardless of the message.
        ph.verify_dummy(DUMMY_HASH, plain)
        raise HTTPException(401, INVALID)

    if not _verify(user, plain, db):
        # Never log the password. The email and IP are what an
        # investigation actually needs.
        logger.warning("login_failed", extra={
            "email": body.email, "ip": request.client.host,
        })
        raise HTTPException(401, INVALID)

    if not user.is_active:
        raise HTTPException(401, INVALID)      # same message: no signal

    logger.info("login_success", extra={"user_id": user.id})
    return _issue_pair(user, response)


def _verify(user: User, plain: str, db: Session) -> bool:
    """Handles both the legacy and the current hash format."""
    # ---- the migration path -------------------------------------
    # Existing rows hold unsalted SHA-256. We cannot re-hash them
    # offline, because we do not have the plaintext -- we only ever
    # have it here, for one user, at login.
    if user.hash_scheme == "sha256_legacy":
        digest = hashlib.sha256(plain.encode()).hexdigest()
        # compare_digest even for the legacy path: constant time.
        if not hmac.compare_digest(digest, user.password_hash):
            return False

        # Correct password in hand -> upgrade now, silently.
        user.password_hash = ph.hash(plain)
        user.hash_scheme = "argon2id"
        db.commit()
        return True

    # ---- the current path ---------------------------------------
    try:
        ph.verify(user.password_hash, plain)
    except (VerifyMismatchError, VerificationError):
        return False

    # Parameters raised since this hash was made; upgrade while we
    # still have the plaintext.
    if ph.check_needs_rehash(user.password_hash):
        user.password_hash = ph.hash(plain)
        db.commit()

    return True


# The rest of the migration, which the login path alone cannot finish:
#
#   1. Deploy the dual-path verifier above. Every login upgrades one
#      user, so the population converts itself without a mass reset.
#   2. Track the remaining sha256_legacy count as a metric.
#   3. After a full login cycle -- 60 to 90 days -- the tail is
#      dormant accounts. Force a password reset on those and delete
#      the legacy path.
#   4. Treat the old hashes as compromised throughout: they are
#      unsalted SHA-256 and must be assumed cracked if the database
#      ever leaked. Notify, and require a reset for privileged
#      accounts immediately rather than waiting for step 3.


# =========================================================================
# TOKENS
# =========================================================================

def _issue_pair(user: User, response: Response) -> TokenPair:
    now = datetime.now(tz=UTC)

    access = jwt.encode(
        {
            "sub": str(user.id),
            "iat": now,
            "exp": now + timedelta(minutes=15),     # SHORT
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "scopes": user.scopes,
            # Bumped on password change and logout-everywhere, so
            # existing tokens stop verifying immediately. This is the
            # revocation a stateless token otherwise lacks.
            "ver": user.token_version,
        },
        settings.jwt_secret.get_secret_value(),     # from the env
        algorithm="HS256",
    )

    # Opaque, a database row, revocable instantly. Only the hash is
    # stored -- a leaked backup must not yield usable refresh tokens.
    raw = secrets.token_urlsafe(32)
    db.add(RefreshToken(
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        user_id=user.id,
        family_id=new_id(),
        expires_at=now + timedelta(days=30),
    ))
    db.commit()

    # HttpOnly so JavaScript cannot read it; Secure so it never
    # crosses plaintext; SameSite=strict as CSRF defence.
    response.set_cookie(
        "refresh_token", raw,
        httponly=True, secure=True, samesite="strict",
        max_age=30 * 24 * 3600, path="/auth/refresh",
    )
    return TokenPair(access_token=access, expires_in=900)


@app.post("/auth/refresh", response_model=TokenPair)
def refresh(refresh_token: Annotated[str, Cookie()], db: DB,
            response: Response) -> TokenPair:
    row = db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash
                == hashlib.sha256(refresh_token.encode()).hexdigest()
        )
    ).scalar_one_or_none()

    if row is None or row.expires_at < datetime.now(tz=UTC):
        raise HTTPException(401, "Invalid refresh token")

    if row.used_at is not None:
        # REUSE DETECTION. A rotated token presented twice means two
        # parties hold it -- one of them is not the user. Kill the
        # whole family, not just this token.
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == row.family_id)
            .values(revoked_at=datetime.now(tz=UTC))
        )
        db.commit()
        logger.critical("refresh_reuse", extra={"user_id": row.user_id})
        raise HTTPException(401, "Invalid refresh token")

    row.used_at = datetime.now(tz=UTC)
    db.commit()
    return _issue_pair(db.get(User, row.user_id), response)


# =========================================================================
# VERIFICATION
# =========================================================================

bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: DB,
) -> User:
    if creds is None:
        raise HTTPException(401, "Not authenticated",
                            headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.jwt_secret.get_secret_value(),
            # A FIXED list. Never from the token, and "none" never
            # appears. This single line is finding 1.
            algorithms=["HS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired",
                            headers={"WWW-Authenticate": "Bearer"})
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    user = db.get(User, UUID(payload["sub"]))

    # Re-read authority from the database, do not trust the claim.
    # Finding 10: a revoked role must take effect now, not at expiry.
    if user is None or not user.is_active:
        raise HTTPException(401, "Invalid token")
    if payload.get("ver") != user.token_version:
        raise HTTPException(401, "Token revoked")

    return user


CurrentUser = Annotated[User, Depends(current_user)]


# =========================================================================
# AUTHORISATION -- finding 3
# =========================================================================

def owned_order(oid: UUID, user: CurrentUser, db: DB) -> Order:
    """Ownership is IN THE QUERY, so a handler cannot receive an order
    that is not the caller's. The check is structural rather than
    remembered."""
    order = db.execute(
        select(Order).where(
            Order.id == oid,
            Order.account_id == user.account_id,
        )
    ).scalar_one_or_none()

    if order is None:
        # 404 whether missing or forbidden. A 403 would confirm the id
        # exists, which is an enumeration oracle over the order table.
        raise HTTPException(404, "Not found")
    return order


@app.get("/orders/{oid}", response_model=OrderPublic)
def get_order(order: Annotated[Order, Depends(owned_order)]) -> Order:
    return order


# =========================================================================
# TESTS
# =========================================================================

def test_an_alg_none_token_is_rejected(client):
    """Finding 1. The complete bypass, pinned."""
    forged = (
        base64url({"alg": "none", "typ": "JWT"}) + "."
        + base64url({"sub": "1", "role": "admin"}) + "."
    )

    r = client.get("/orders/o-1", headers={"Authorization": f"Bearer {forged}"})

    assert r.status_code == 401


def test_a_token_signed_with_a_different_key_is_rejected(client):
    forged = jwt.encode({"sub": "1", "exp": far_future()},
                        "attacker-key", algorithm="HS256")

    r = client.get("/orders/o-1", headers={"Authorization": f"Bearer {forged}"})

    assert r.status_code == 401


def test_a_token_without_exp_is_rejected(client):
    """Finding 6. require=["exp"] is what makes this fail."""
    token = jwt.encode({"sub": str(USER_ID), "iss": ISS, "aud": AUD},
                       settings.jwt_secret.get_secret_value(),
                       algorithm="HS256")

    r = client.get("/orders/o-1", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 401


def test_a_user_cannot_read_another_accounts_order(client):
    """Finding 3. The vulnerability every owner-only test misses."""
    other = create_order(account_id="account-b")
    token = login_as(account_id="account-a")

    r = client.get(f"/orders/{other.id}",
                   headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 404          # 404, not 403 -- no oracle


def test_login_does_not_reveal_whether_an_account_exists(client):
    """Findings 8 and 9 together: same body, and comparable timing."""
    real = timed(lambda: client.post("/login", json={
        "email": "real@example.com", "password": "wrong-password"}))
    fake = timed(lambda: client.post("/login", json={
        "email": "nope@example.com", "password": "wrong-password"}))

    assert real.response.json() == fake.response.json()
    assert abs(real.seconds - fake.seconds) < 0.05


def test_the_password_never_reaches_the_logs(client, caplog):
    """Finding 7."""
    client.post("/login", json={"email": "a@b.com", "password": "hunter2"})

    assert "hunter2" not in caplog.text


def test_a_legacy_sha256_hash_is_upgraded_on_login(client, db):
    """The migration path. One login, one converted user."""
    user = create_user(
        password_hash=hashlib.sha256(b"correct-horse").hexdigest(),
        hash_scheme="sha256_legacy",
    )

    assert client.post("/login", json={
        "email": user.email, "password": "correct-horse"}).status_code == 200

    db.refresh(user)
    assert user.hash_scheme == "argon2id"
    assert user.password_hash.startswith("$argon2id$")


def test_refresh_token_reuse_revokes_the_whole_family(client, db):
    """Rotation is worth nothing without this."""
    first = login_and_get_refresh_cookie(client)
    second = client.post("/auth/refresh", cookies={"refresh_token": first})

    replay = client.post("/auth/refresh", cookies={"refresh_token": first})

    assert replay.status_code == 401
    # And the token the attacker stole is dead too:
    assert client.post("/auth/refresh", cookies={
        "refresh_token": cookie_of(second)}).status_code == 401


def test_bumping_token_version_invalidates_existing_tokens(client, db):
    """Finding 10. Revocation must take effect now."""
    token = login_as(USER_ID)
    assert client.get("/orders", headers=auth(token)).status_code == 200

    db.get(User, USER_ID).token_version += 1
    db.commit()

    assert client.get("/orders", headers=auth(token)).status_code == 401


def test_no_secret_is_hard_coded():
    """Finding 2, as a CI gate rather than a review habit."""
    source = Path("app").rglob("*.py")
    for path in source:
        text = path.read_text()
        assert "dev-secret" not in text
        assert not re.search(r'SECRET\\s*=\\s*["\\']', text)`,
        notes: [
          { t: "p", text: "**`algorithms=[\"HS256\", \"none\"]` is a total bypass in one list entry.** An attacker base64-encodes a header of `{\"alg\": \"none\"}` and a payload naming any user, appends an empty signature, and is authenticated as an administrator. No secret is required and nothing in the logs looks unusual." },
          { t: "p", text: "**Finding 3 is the one that survives review most often**, because the code reads as authenticated: `Depends(current_user)` is right there. It resolves the user and then never consults them, so any logged-in caller reads any order. Resolving ownership inside the dependency makes the omission impossible rather than merely unlikely." },
          { t: "callout", kind: "insight", title: "The timing oracle outlasts the message fix", body: [
            { t: "p", text: "Making both failures return \"Invalid email or password\" is the fix everyone applies. It does not close the hole: the early return still skips hashing entirely, so a missing account answers in milliseconds and a real one in a fifth of a second." },
            { t: "p", text: "Verifying against a dummy hash costs one wasted Argon2 call per invalid email and removes an enumeration oracle that no amount of message-matching addresses." }
          ]},
          { t: "p", text: "**The SHA-256 migration cannot be done offline.** You hold digests, not passwords, so the only moment the plaintext exists is during a successful login — which is why the dual-path verifier upgrades one user at a time and the tail is closed with a forced reset after a full login cycle." },
          { t: "p", text: "**Treat the legacy hashes as already cracked.** Unsalted SHA-256 falls to a GPU in hours, so if the database was ever exposed the correct assumption is that those passwords are known — privileged accounts get a forced reset immediately rather than waiting for the gradual migration." },
          { t: "p", text: "**Refresh rotation without reuse detection is theatre.** Rotating gives a stolen token a new value; detecting that an old one was presented twice is what reveals that two parties hold it, and revoking the whole family is what ends the attacker's access rather than the victim's." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team shipped an API with per-endpoint ownership checks written by hand. Eleven of twelve endpoints had them. The twelfth — an invoice PDF download added during a rush — did not." },
      { t: "p", text: "**A customer changed one digit in a URL and downloaded another company's invoice.** They reported it, which was the fortunate part; the access log showed the pattern had been available for seven months." },
      { t: "p", text: "The remediation was not adding the missing check. It was moving every resource lookup behind a dependency that filters by account in the query, so **there is no code path that fetches a resource without proving ownership** — and a handler physically cannot receive an object it is not entitled to." },
      { t: "p", text: "**The general principle: a security control you have to remember is a security control you will forget.** Structure beats discipline, because structure survives the rushed Friday commit and discipline does not." }
    ]}
  ],

  takeaways: [
    "**Authentication is a library call; authorisation is a decision in every handler.** That asymmetry is why most breaches are authorisation failures.",
    "**Use Argon2id or bcrypt with real parameters**, and never hand-roll salting, comparison or a \"quick\" SHA-256 with a pepper.",
    "**Upgrade hashes at login**, because that is the only moment you ever hold the plaintext — and it is also how you migrate a legacy scheme without a mass reset.",
    "**One error message for both login failures, and burn the same time when the account does not exist.** Matching the message without matching the timing leaves the oracle open.",
    "**Revocation is the whole sessions-versus-JWT argument.** A stateless token cannot be withdrawn; everything else is a detail.",
    "**Short access token plus a revocable refresh token** is the standard compromise — and rotation is worthless without reuse detection.",
    "**Never take the algorithm from the token.** `algorithms=[header[\"alg\"]]` or a list containing `\"none\"` is a complete authentication bypass.",
    "**Require `exp`, `iat`, `aud` and `iss` explicitly**, or a token lacking them verifies perfectly and never expires.",
    "**A JWT is signed, not encrypted.** Every claim is readable by whoever holds it.",
    "**Filter ownership in the query, not after the fetch**, and put it in a dependency so a handler cannot receive a resource that is not the caller's.",
    "**Return 404, not 403, for another account's resource** — a 403 confirms the id exists and turns iteration into an inventory.",
    "**Re-read authority from the database.** A role baked into a token cannot be revoked before it expires.",
    "**Use `SecretStr` and fail at startup on a missing secret**, and assume every secret leaks eventually — so support two valid keys during rotation before you need to."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`jwt.decode(token, key, algorithms=[\"HS256\", \"none\"])`. What can an attacker do?",
        options: [
          "Nothing — HS256 is still checked first",
          "Craft a token with `alg: none` and an empty signature, naming any user and role, and be authenticated as them without knowing the secret",
          "Only read the payload, not forge one",
          "Cause a denial of service"
        ],
        answer: 1,
        why: "The `none` algorithm means the signature is not verified at all, so the token is just base64-encoded JSON that anyone can write. Accepting it anywhere is a total bypass. The related attack is RS256-to-HS256 confusion, where a public key is used as the HMAC secret — both are prevented by passing a fixed list you control."
      },
      {
        stem: "A login endpoint returns \"Invalid email or password\" for both failures, but returns early when the account is missing. Is enumeration fixed?",
        options: [
          "Yes — the messages are identical",
          "No — the early return skips password hashing, so a missing account answers in milliseconds and a real one takes far longer",
          "Yes, provided rate limiting is enabled",
          "Only if the status codes also match"
        ],
        answer: 1,
        why: "Timing is as readable as the message body and trivially measurable over a network. Verifying against a dummy hash before returning costs one wasted Argon2 call per invalid email and closes an oracle that matching messages does not touch."
      },
      {
        stem: "Why return 404 rather than 403 when a user requests another account's order?",
        options: [
          "403 is not a valid REST status code",
          "403 confirms the id exists, so iterating ids and sorting by status code yields an inventory of every order in the system",
          "404 is faster to produce",
          "Clients handle 404 more consistently"
        ],
        answer: 1,
        why: "The distinction between \"does not exist\" and \"exists but is not yours\" is information, and it is information only an attacker benefits from. Use 403 when the caller already knows the resource exists — their own resource, an action their role forbids — and log the real reason even when you do not return it."
      },
      {
        stem: "Your database holds unsalted SHA-256 password hashes. How do you migrate to Argon2?",
        options: [
          "Re-hash the stored digests with Argon2 in a batch job",
          "Verify the legacy hash at login, and re-hash with Argon2 while you have the plaintext — then force a reset on the dormant tail",
          "Force every user to reset their password immediately",
          "Run both schemes forever"
        ],
        answer: 1,
        why: "Hashing a digest adds no strength — the original password remains as weak as the SHA-256 protecting it. Login is the only moment the plaintext exists, so a dual-path verifier converts the population gradually. Treat the old hashes as cracked throughout, and reset privileged accounts immediately rather than waiting."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Sessions or JWTs?",
        strong: "Sessions for a first-party web application, because revocation is immediate. JWTs for service-to-service and short-lived access tokens, paired with a revocable refresh token — a stateless token cannot be withdrawn, and that is the property that matters at 3am.",
        answer: [
          { t: "p", text: "Leading with revocation rather than \"stateless scales better\" shows you have operated one; the scaling argument is real but rarely the constraint." },
          { t: "p", text: "The access-plus-refresh split is the answer that shows you know both, and the lifetime numbers — fifteen minutes, thirty days — make it concrete." },
          { t: "p", text: "Volunteering rotation with reuse detection is the detail that separates a design you have read about from one you have shipped." }
        ]
      },
      {
        level: "advanced",
        q: "Where does authorisation belong in an API?",
        strong: "In the resolution of the resource, not in the handler. A dependency that filters by the caller's account in the query means a handler cannot receive an object it is not entitled to — so forgetting the check stops being possible.",
        answer: [
          { t: "p", text: "The point to make is that a control you have to remember is one you will eventually forget, and the omission looks exactly like working code." },
          { t: "p", text: "Filtering in the query rather than comparing after the fetch is the detail interviewers listen for — a post-fetch check still loaded the row." },
          { t: "p", text: "Adding the 404-not-403 reasoning shows you think about what a response reveals, not only whether it is correct." }
        ]
      },
      {
        level: "core",
        q: "How would you store passwords?",
        strong: "Argon2id or bcrypt with parameters tuned to the hardware, never a general-purpose hash. Verify with the library's constant-time function, and re-hash at login when the parameters have been raised.",
        answer: [
          { t: "p", text: "Naming the property — a password hash's job is to be slow — explains why SHA-256 is wrong better than naming an algorithm does." },
          { t: "p", text: "The re-hash-at-login detail is a strong signal, because it shows you have thought about the lifetime of a stored credential rather than just the first write." },
          { t: "p", text: "A maximum password length is a small thing worth mentioning: Argon2 on a ten-megabyte input is a denial of service against your own CPU." }
        ]
      }
    ]
  }
});
