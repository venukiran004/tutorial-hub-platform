/* ============================================================================
   LESSON 14.2 — Configuration, Environments and Secrets
   ========================================================================= */
EC.receiveLesson({
  id: "14.2",

  lede: "Configuration is the seam between one codebase and every environment it runs in. **Get it wrong and the same artefact behaves differently in ways nobody can predict** — a missing variable that surfaces at 2am on the first request that needs it, a staging job writing to the production database, an API key in a log line with ninety days of retention.",

  objectives: [
    "Separate configuration from code, and know what counts as which",
    "Build typed settings that fail at startup rather than at first use",
    "Layer per-environment overrides without duplicating everything",
    "Keep secrets out of the repository, the image and the logs",
    "Rotate a credential without downtime"
  ],

  prerequisites: ["14.1"],

  blocks: [

    { t: "h2", n: "01", text: "What is configuration", id: "what" },


    { t: "viz",
      title: "Where configuration comes from, and which wins",
      caption: "Later sources override earlier ones. Keeping that order explicit is what lets a developer override one value locally without editing anything the deployment depends on.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Configuration precedence from defaults through files and environment to command-line flags">
  <g style="stroke-width:2">
    <rect x="30"  y="56" width="170" height="54" rx="7" style="fill:var(--ink-3);fill-opacity:.07;stroke:var(--line)"/>
    <rect x="226" y="56" width="170" height="54" rx="7" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="422" y="56" width="170" height="54" rx="7" style="fill:var(--warn);fill-opacity:.13;stroke:var(--warn)"/>
    <rect x="618" y="56" width="170" height="54" rx="7" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)"/>
  </g>
  <text x="50"  y="88" class="s-sub" style="fill:var(--ink-3)">code defaults</text>
  <text x="246" y="88" class="s-sub" style="fill:var(--ink-2)">config file</text>
  <text x="442" y="88" class="s-sub" style="fill:var(--ink-2)">environment</text>
  <text x="638" y="88" class="s-sub" style="fill:var(--good)">CLI flags</text>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="204" y1="83" x2="222" y2="83" marker-end="url(#cfg-a)"/>
    <line x1="400" y1="83" x2="418" y2="83" marker-end="url(#cfg-a)"/>
    <line x1="596" y1="83" x2="614" y2="83" marker-end="url(#cfg-a)"/>
  </g>
  <text x="330" y="136" class="s-sub" style="fill:var(--ink-3)">increasing precedence</text>

  <text x="30" y="178" class="s-sub" style="fill:var(--crit)">Secrets belong only in the environment or a secret store — never in the file, and never with a default in code.</text>
  <text x="30" y="202" class="s-sub" style="fill:var(--ink-3)">Validate the whole configuration at startup and exit on failure, rather than discovering a missing value at 3am.</text>

  <defs><marker id="cfg-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker></defs>
</svg>`
    },
    { t: "table",
      head: ["Value", "Config?", "Why"],
      rows: [
        ["Database URL", "**Yes**", "Differs per environment"],
        ["Log level", "**Yes**", "Differs per environment"],
        ["API keys", "**Yes** — and a secret", "Differs, and must not be readable"],
        ["Feature flags", "**Yes**", "Changes without a deploy"],
        ["HTTP timeout", "Usually", "Tuned per environment, sometimes"],
        ["Tax rate for a country", "**No**", "A business rule; belongs in code and tests"],
        ["Approval threshold", "**No**", "A rule with a history, reviewed like code"],
        ["Retry count", "No", "A design decision, not an environment one"]
      ],
      caption: "**The test: does this value differ between environments running the same release?** If not, it is code — and putting it in config removes it from review, from version control history and from tests."
    },

    { t: "callout", kind: "trap", title: "Over-configuration is its own failure", body: [
      { t: "p", text: "A codebase where everything is configurable has no defined behaviour. Reading it tells you nothing, because the answer to every question is \"it depends on the environment\" — and no test covers the combination that is actually deployed." },
      { t: "code", lang: "python", title: "the shape it takes", numbered: false, code: `
# 47 environment variables, of which 3 ever differ between
# environments. The other 44 are:
#   - defaults nobody has changed since 2021
#   - values that MUST match across environments but might not
#   - business rules that escaped review by becoming config

ORDER_APPROVAL_THRESHOLD=10000     # a rule. Belongs in code.
MAX_RETRIES=3                      # a design decision.
ENABLE_NEW_CHECKOUT=false          # legitimately a flag.
DATABASE_URL=...                   # legitimately config.`},
      { t: "p", text: "**A business rule in an environment variable has no history and no test.** Changing the approval threshold should be a reviewed commit with a test that pins it, not an edit to a deployment manifest that nobody diffs." }
    ]},

    { t: "h2", n: "02", text: "Typed settings", id: "typed" },

    { t: "code", lang: "python", title: "config.py — the whole contract in one place", code: `
from pydantic import Field, SecretStr, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        # extra="forbid" catches typos. DATABSE_URL in a manifest
        # would otherwise be silently ignored and the real setting
        # would fall back to a default -- or fail much later.
        extra="forbid",
        # Nested settings from DATABASE__POOL_SIZE style variables.
        env_nested_delimiter="__",
    )

    # --- required. No default means a missing value is a startup
    #     failure, which is exactly what you want. ------------------
    environment: Literal["development", "staging", "production"]
    database_url: PostgresDsn                 # parsed, not just a string
    jwt_secret: SecretStr = Field(min_length=32)

    # --- optional, with defaults that suit development -------------
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    port: int = Field(default=8000, ge=1, le=65535)
    request_timeout_seconds: float = Field(default=10.0, gt=0, le=120)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @field_validator("log_level")
    @classmethod
    def no_debug_in_production(cls, v: str, info) -> str:
        # Cross-field validation: production at DEBUG logs request
        # bodies, which means logging credentials. Refuse to start.
        if v == "DEBUG" and info.data.get("environment") == "production":
            raise ValueError("DEBUG logging is not permitted in production")
        return v


# Module level: the process fails to start if anything is missing or
# invalid, with a message naming every problem at once.
settings = Settings()
`,
      hl: [11, 19, 21, 35],
      caption: "**`extra=\"forbid\"` is the setting people omit and regret.** A typo in a deployment manifest is otherwise ignored entirely, and the symptom is a service quietly using a default nobody intended."
    },

    { t: "ladder",
      title: "Reading a database URL",
      rungs: [
        { level: "bad", label: "os.environ at the point of use",
          why: "Fails at first use rather than at startup — so a service starts healthily, passes its readiness check, and 500s on the first request that touches payments. It is also untyped, untestable and scattered across the codebase.",
          code: `def get_db():
    return create_engine(os.environ["DATABASE_URL"])

# Missing -> KeyError, on the first request, in production, at 2am.` },
        { level: "ok", label: "A module-level constant",
          why: "Fails at import, which is the important improvement. Still untyped and unvalidated: an empty string, a MySQL URL or a malformed host all pass, and the failure arrives later with a worse message.",
          code: `DATABASE_URL = os.environ["DATABASE_URL"]
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Better. Now a missing variable stops the deploy, not a user.` },
        { level: "best", label: "A typed settings object",
          why: "Every variable is declared, parsed, validated and documented in one place. Startup fails with every problem listed at once, the IDE knows the types, and a test can construct a `Settings` with overrides in one line.",
          code: `settings = Settings()          # raises here, listing all problems

# pydantic_core.ValidationError: 3 validation errors for Settings
# database_url
#   Field required
# jwt_secret
#   String should have at least 32 characters
# port
#   Input should be less than or equal to 65535

# And in tests:
def test_something():
    s = Settings(environment="development", database_url=TEST_DB, ...)`,
          note: "**Listing every error at once matters more than it sounds.** Fixing one variable per deploy cycle is how a five-minute configuration problem becomes an hour." }
      ]
    },

    { t: "h2", n: "03", text: "Environments", id: "environments" },

    { t: "code", lang: "python", title: "layering, without duplicating", code: `
# The precedence order pydantic-settings uses, highest first:
#
#   1. arguments passed to Settings(...)      -- tests
#   2. environment variables                  -- deployment
#   3. .env file                              -- local development
#   4. secrets directory (/run/secrets/...)   -- Docker/Kubernetes
#   5. field defaults                         -- the code
#
# So one class covers every environment. There is no per-environment
# settings module, and no "if environment == 'staging'" in the code.


# .env.example -- COMMITTED. The documentation of what is required.
# Every variable, no real values.
#
#   ENVIRONMENT=development
#   DATABASE_URL=postgresql://localhost/orders_dev
#   JWT_SECRET=a-development-secret-at-least-32-characters
#   LOG_LEVEL=DEBUG

# .env -- GITIGNORED. Real local values, never committed.


# Where per-environment differences genuinely belong: the deployment
# manifest, not the code.
#
#   production:  ENVIRONMENT=production  LOG_LEVEL=INFO
#   staging:     ENVIRONMENT=staging     LOG_LEVEL=DEBUG
`,
      hl: [4, 14],
      caption: "**Commit `.env.example` and gitignore `.env`.** The example is the only reliable documentation of what the service needs, and it is the file a new engineer copies on their first morning."
    },

    { t: "callout", kind: "insight", title: "Guard rails between environments", body: [
      { t: "code", lang: "python", title: "the check that prevents a very bad afternoon", numbered: false, code: `
@model_validator(mode="after")
def do_not_point_at_production(self) -> "Settings":
    """A staging job with a stale manifest writing to the production
    database is not hypothetical -- it is one copy-paste away."""
    if self.environment != "production":
        host = self.database_url.host or ""
        if "prod" in host or host in PRODUCTION_HOSTS:
            raise ValueError(
                f"environment={self.environment} but the database host "
                f"is {host}. Refusing to start."
            )
    return self


@model_validator(mode="after")
def production_requires_real_secrets(self) -> "Settings":
    if self.environment == "production":
        if self.jwt_secret.get_secret_value().startswith("dev-"):
            raise ValueError("A development secret is set in production")
        if not self.database_url.scheme.endswith("ssl"):
            raise ValueError("Production database connections must use TLS")
    return self`},
      { t: "p", text: "**These checks cost nothing and fail loudly at startup**, which is the only moment they can help. The alternative is discovering the mistake from the data." }
    ]},

    { t: "h2", n: "04", text: "Secrets", id: "secrets" },

    { t: "table",
      head: ["Storage", "Verdict"],
      rows: [
        ["In the repository", "**Never.** Git history is permanent; a rotation does not remove it"],
        ["A Docker `ENV` or `ARG`", "**Never.** Image layers are readable by anyone who can pull it"],
        ["A URL or query string", "**Never.** URLs appear in access logs, proxies and browser history"],
        ["An environment variable", "Acceptable — the common baseline"],
        ["A mounted file (`/run/secrets`)", "**Better** — not in `/proc/*/environ`, rotatable without a restart"],
        ["A secret manager with a short-lived token", "**Best** — audited, rotatable, revocable"]
      ],
      caption: "**Environment variables leak more easily than people expect**: a crash reporter serialising `os.environ`, a `docker inspect`, a debug endpoint dumping settings, or a subprocess inheriting the whole environment."
    },

    { t: "code", lang: "python", title: "SecretStr, and why it earns its place", code: `
class Settings(BaseSettings):
    stripe_key: SecretStr
    database_url: SecretStr


settings = Settings()

print(settings.stripe_key)          # SecretStr('**********')
logger.info("config", extra={"settings": settings.model_dump()})
#   -> {'stripe_key': SecretStr('**********'), ...}
repr(settings)                      # masked
str(settings.stripe_key)            # masked
# A traceback rendering local variables shows the mask, not the key.

# Reading it is explicit, and greppable in review:
stripe.api_key = settings.stripe_key.get_secret_value()
`,
      hl: [8, 15],
      caption: "**The value is that leaking becomes deliberate.** `.get_secret_value()` is a small speed bump that turns an accidental log line into a visible decision, and `grep -r get_secret_value` lists every place a secret is unwrapped."
    },

    { t: "callout", kind: "trap", title: "Where secrets actually leak", body: [
      { t: "code", lang: "python", title: "six real paths", numbered: false, code: `
# 1. A DEBUG ENDPOINT. Ships in a hurry, stays forever.
@app.get("/debug/config")
def debug_config():
    return settings.model_dump()          # everything, to anyone

# 2. AN EXCEPTION HANDLER LOGGING THE REQUEST.
logger.error("failed", extra={"body": await request.json()})
# The login route's body contains a password.

# 3. A CRASH REPORTER. Sentry and similar serialise local variables
#    by default -- including a connection string in a stack frame.
#    Configure a denylist explicitly.

# 4. SUBPROCESSES INHERIT os.environ ENTIRELY.
subprocess.run(["some-tool"])             # gets every secret you have
subprocess.run(["some-tool"], env={"PATH": os.environ["PATH"]})  # better

# 5. A URL WITH CREDENTIALS.
requests.get(f"https://api/x?token={token}")   # logged by every proxy
requests.get("https://api/x", headers={"Authorization": f"Bearer {token}"})

# 6. THE CI LOG. Echoing a variable, or a tool printing its config.
#    Most CI systems mask REGISTERED secrets only -- a value derived
#    from one is not masked.`},
      { t: "p", text: "**Number four is the least known.** A subprocess inherits the entire environment by default, so a shelled-out tool — and any dependency it loads — has your database password whether it needs it or not." }
    ]},

    { t: "h2", n: "05", text: "Rotation", id: "rotation" },

    { t: "code", lang: "python", title: "accept two keys, so rotation is not an outage", code: `
class Settings(BaseSettings):
    # The current key, used for signing.
    jwt_secret: SecretStr = Field(min_length=32)
    # Previous keys, still accepted for verification. This is what
    # makes rotation a rolling change rather than a mass logout.
    jwt_secret_previous: SecretStr | None = None


def verify_token(token: str) -> TokenData:
    keys = [settings.jwt_secret]
    if settings.jwt_secret_previous:
        keys.append(settings.jwt_secret_previous)

    for key in keys:
        try:
            return decode(token, key.get_secret_value())
        except InvalidSignatureError:
            continue
    raise HTTPException(401, "Invalid token")


# THE ROTATION SEQUENCE
#   1. set jwt_secret_previous = the current key; deploy
#   2. set jwt_secret = a new key; deploy  (both now accepted)
#   3. wait longer than the maximum token lifetime
#   4. clear jwt_secret_previous; deploy
#
# No user is logged out, and step 2 is reversible.
`,
      hl: [6, 23],
      caption: "**Build this before you need it.** Rotating under pressure — after a leak — is when you discover that your design assumed one key, and the choice becomes \"log everyone out\" or \"leave the compromised key valid\"."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a configuration module",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "This module has caused three incidents: a service that started without a payment key and failed on the first checkout, a staging job that wrote to production, and a Stripe key found in a log aggregator." },
        { t: "code", lang: "python", numbered: false, title: "app/config.py", code: `
import os

DATABASE_URL = os.environ.get("DATABASE_URL",
                              "postgresql://localhost/app")
STRIPE_KEY = os.environ.get("STRIPE_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
DEBUG = os.environ.get("DEBUG", "False")
PORT = os.environ.get("PORT", 8000)
ADMIN_EMAILS = os.environ.get("ADMIN_EMAILS", "").split(",")

if DEBUG:
    logging.basicConfig(level=logging.DEBUG)
    logger.info(f"Config: {vars()}")`},
        { t: "p", text: "Find every problem — there are at least ten — and rewrite it. Explain which line caused each incident." }
      ],
      requirements: [
        "List all ten, and map the three incidents to their lines.",
        "Explain why `if DEBUG:` is always true.",
        "Explain why `PORT` breaks when it is set but not when it is absent.",
        "Rewrite with typed settings.",
        "Add the guard that prevents the staging-to-production incident.",
        "Give the rotation path for the leaked Stripe key."
      ],
      hint: "Look at what `os.environ.get` returns, always. And at what `ADMIN_EMAILS` contains when the variable is unset.",
      solution: {
        lang: "python",
        title: "src/app/config.py",
        code: `# =========================================================================
# THE TEN
# =========================================================================
#
# 1. DEFAULTS FOR REQUIRED VALUES.  <- INCIDENT 1
#    STRIPE_KEY defaults to "". The service starts happily, passes its
#    readiness probe, and fails on the first checkout with an
#    unhelpful Stripe authentication error. A missing payment key must
#    prevent startup, not surface at the till.
#
# 2. A DEVELOPMENT SECRET AS A PRODUCTION DEFAULT.
#    JWT_SECRET = "dev-secret". If the variable is ever unset in
#    production -- a renamed manifest key, a new region, a typo -- the
#    service signs tokens with a value that is in the repository, in
#    every fork, and in every CI log. Anyone can forge any token.
#
# 3. A LOCALHOST DATABASE DEFAULT.  <- contributes to INCIDENT 2
#    A missing DATABASE_URL silently connects somewhere. It should
#    fail.
#
# 4. if DEBUG: IS ALWAYS TRUE.  <- INCIDENT 3
#    os.environ.get returns a STRING. DEBUG="False" is a non-empty
#    string, which is truthy. So debug logging is on in every
#    environment, permanently -- which is how a Stripe key reached
#    the log aggregator.
#
#    "" -> falsy, "False" -> TRUE, "0" -> TRUE, "false" -> TRUE.
#    The only falsy value is the empty string.
#
# 5. logger.info(f"Config: {vars()}") LOGS EVERY SECRET.  <- INCIDENT 3
#    Combined with (4), every deploy writes the Stripe key, the JWT
#    secret and the database password to the log aggregator, with
#    whatever retention it has, searchable by anyone with access.
#
# 6. PORT IS A STRING WHEN SET.
#    The default is the int 8000; os.environ.get returns "8000" when
#    the variable EXISTS. So it works locally (default, int) and fails
#    in deployment (string) wherever an int is required -- the
#    opposite of the usual pattern, which is why it is confusing.
#
# 7. ADMIN_EMAILS IS [""] WHEN UNSET.
#    "".split(",") == [""], not []. So "" in ADMIN_EMAILS is True,
#    and any check like "if user.email in ADMIN_EMAILS" behaves
#    strangely for an empty email.
#
# 8. NO VALIDATION ANYWHERE. A MySQL URL, a malformed host, a 4-char
#    JWT secret and a port of 99999 all pass.
#
# 9. NO ENVIRONMENT AWARENESS.  <- INCIDENT 2
#    Nothing knows whether this is staging or production, so nothing
#    can refuse a staging deployment pointed at the production
#    database. A stale manifest is all it takes.
#
# 10. SIDE EFFECTS AT IMPORT. logging.basicConfig() runs on import,
#     so importing config for any reason -- a test, a script, a CLI --
#     reconfigures global logging.
#
# Also: no way to override in tests without patching os.environ, and
# no documentation of what the service requires.


# =========================================================================
# THE INCIDENTS
# =========================================================================
#
#   1. Started without a payment key    -> finding 1 (the "" default)
#   2. Staging wrote to production      -> findings 3 and 9
#   3. Stripe key in the log aggregator -> findings 4 and 5 together
#
# Incident 3 needed BOTH bugs: the truthy string turned debug on
# everywhere, and the vars() log then wrote every secret. Either
# alone is survivable.


# =========================================================================
# THE REWRITE
# =========================================================================

from pydantic import (Field, SecretStr, PostgresDsn, EmailStr,
                      field_validator, model_validator)
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="forbid",          # a typo'd variable is an error, not
        case_sensitive=False,    # a silently-ignored line
    )

    # ---- required. No defaults: a missing value stops the deploy. --
    environment: Literal["development", "staging", "production"]
    database_url: PostgresDsn
    stripe_key: SecretStr = Field(min_length=20)      # finding 1
    jwt_secret: SecretStr = Field(min_length=32)      # finding 2

    # ---- optional, properly typed ---------------------------------
    # bool parses "true"/"false"/"1"/"0" correctly -- finding 4.
    debug: bool = False
    # int coerces and RANGE-CHECKS -- findings 6 and 8.
    port: int = Field(default=8000, ge=1024, le=65535)
    # A real list type. Empty means empty -- finding 7.
    admin_emails: list[EmailStr] = Field(default_factory=list)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # ---- guards ---------------------------------------------------

    @model_validator(mode="after")
    def debug_is_not_permitted_in_production(self) -> "Settings":
        """Findings 4 and 5, at the root. Debug logging in production
        means logging request bodies, which means logging
        credentials."""
        if self.environment == "production" and (
            self.debug or self.log_level == "DEBUG"
        ):
            raise ValueError(
                "DEBUG is not permitted in production: it logs request "
                "bodies, including credentials."
            )
        return self

    @model_validator(mode="after")
    def non_production_must_not_use_production_data(self) -> "Settings":
        """INCIDENT 2. One stale manifest is all it takes, and the
        cost is measured in restored backups."""
        if self.environment == "production":
            return self

        host = (self.database_url.host or "").lower()
        if any(marker in host for marker in ("prod", "production", "live")):
            raise ValueError(
                f"environment={self.environment} but the database host is "
                f"{host!r}. Refusing to start."
            )
        return self

    @model_validator(mode="after")
    def production_requires_production_secrets(self) -> "Settings":
        """Finding 2: catch a development value that reached
        production, whatever the route."""
        if self.environment != "production":
            return self

        for name in ("jwt_secret", "stripe_key"):
            value = getattr(self, name).get_secret_value()
            if value.startswith(("dev-", "test-", "sk_test_")):
                raise ValueError(f"{name} holds a non-production value")

        if self.database_url.scheme not in ("postgresql+psycopg",):
            pass  # driver check, per your stack
        if "sslmode=require" not in str(self.database_url):
            raise ValueError("Production database connections require TLS")
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


# Constructed at import. The process does not start if anything is
# missing or invalid -- and it reports EVERY problem at once, not one
# per deploy cycle.
#
# NO logging.basicConfig() here (finding 10). Logging is configured in
# main.py, which reads settings. Importing config does nothing
# observable.
settings = Settings()


# =========================================================================
# .env.example -- COMMITTED. The only reliable documentation.
# =========================================================================
#
#   ENVIRONMENT=development
#   DATABASE_URL=postgresql://localhost:5432/app_dev
#   STRIPE_KEY=sk_test_replace_me_with_a_real_test_key
#   JWT_SECRET=generate-with-openssl-rand-hex-32-at-least-32-chars
#   DEBUG=true
#   LOG_LEVEL=DEBUG
#   ADMIN_EMAILS=["you@example.com"]
#
# .env is gitignored. This file is not.


# =========================================================================
# ROTATING THE LEAKED STRIPE KEY
# =========================================================================
#
# The key was in a log aggregator with 90-day retention, readable by
# everyone with dashboard access. Treat it as fully compromised: it is
# not "probably fine because it was internal".
#
#   1. IMMEDIATELY, in the Stripe dashboard, create a NEW restricted
#      key with only the permissions this service uses. Do not
#      recreate a full-access key that was over-privileged.
#
#   2. Deploy the new key. Stripe supports multiple active keys, so
#      there is no window where neither works.
#
#   3. Revoke the old key. Only after step 2 is confirmed healthy in
#      every region and every worker -- a background worker on an old
#      release is the one everyone forgets.
#
#   4. Audit the Stripe logs for the exposure window. Look for calls
#      from unexpected IPs, and for refunds and payouts in
#      particular.
#
#   5. Purge the logs where possible, and shorten retention. Note that
#      purging is best-effort: assume backups and downstream copies
#      exist.
#
#   6. Add the CI check below so a key cannot be committed again, and
#      add a secret-scanning denylist to the log pipeline.
#
# THE GENERAL LESSON: design for rotation BEFORE a leak. A service
# that accepts one key makes rotation an outage; one that accepts a
# current and a previous key makes it a rolling deploy. See the JWT
# example in section 5 -- Stripe gives you this for free, your own
# signing keys do not.


# =========================================================================
# TESTS
# =========================================================================

def test_a_missing_required_value_prevents_startup(monkeypatch):
    """Incident 1. The service must not start without a payment key."""
    monkeypatch.delenv("STRIPE_KEY", raising=False)

    with pytest.raises(ValidationError, match="stripe_key"):
        Settings(_env_file=None)


def test_debug_parses_as_a_boolean():
    """Finding 4 -- the string "False" was truthy."""
    assert Settings(**base(debug="False")).debug is False
    assert Settings(**base(debug="false")).debug is False
    assert Settings(**base(debug="0")).debug is False
    assert Settings(**base(debug="true")).debug is True


def test_staging_cannot_point_at_a_production_database():
    """Incident 2."""
    with pytest.raises(ValidationError, match="Refusing to start"):
        Settings(**base(
            environment="staging",
            database_url="postgresql://prod-db.internal:5432/app",
        ))


def test_production_refuses_debug_logging():
    """Incident 3, at the root."""
    with pytest.raises(ValidationError, match="not permitted in production"):
        Settings(**base(environment="production", log_level="DEBUG"))


def test_secrets_are_masked_in_output():
    """Finding 5. Even if something logs the settings object."""
    s = Settings(**base())

    assert "sk_test" not in repr(s)
    assert "sk_test" not in str(s.model_dump())
    assert s.stripe_key.get_secret_value().startswith("sk_test")


def test_admin_emails_is_empty_when_unset():
    """Finding 7 -- it used to be [""]."""
    assert Settings(**base()).admin_emails == []


def test_a_typo_in_a_variable_name_is_an_error():
    """extra="forbid". Otherwise DATABSE_URL is silently ignored."""
    with pytest.raises(ValidationError):
        Settings(**base(), databse_url="postgresql://x/y")


def test_no_secrets_are_committed():
    """A CI guard. Cheap, and it catches the next one."""
    result = subprocess.run(
        ["gitleaks", "detect", "--no-git", "--redact"],
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stdout`,
        notes: [
          { t: "p", text: "**`if DEBUG:` is always true because `os.environ.get` returns a string.** `\"False\"` is non-empty and therefore truthy — as are `\"0\"`, `\"false\"` and `\"no\"`. The only falsy value the variable can hold is the empty string, which is why debug logging was on in every environment." },
          { t: "p", text: "**Incident 3 needed two bugs together.** The truthy string enabled debug logging everywhere, and `logger.info(f\"Config: {vars()}\")` then wrote every secret to the aggregator on each deploy. Either alone is survivable; the combination is a credential disclosure with ninety days of retention." },
          { t: "callout", kind: "insight", title: "The PORT bug runs the wrong way round", body: [
            { t: "p", text: "`os.environ.get(\"PORT\", 8000)` returns the integer `8000` when the variable is absent and the string `\"8000\"` when it is set. So it works locally, where nobody sets it, and fails in deployment, where everybody does." },
            { t: "p", text: "That inversion is what makes untyped configuration expensive: the failure appears furthest from where it can be debugged, and the local reproduction requires setting a variable you would not think to set." }
          ]},
          { t: "p", text: "**A development secret as a production default is the finding with the widest blast radius.** `JWT_SECRET = \"dev-secret\"` means one missing manifest key gives every fork of the repository the ability to forge any token — and nothing about the running service looks wrong." },
          { t: "p", text: "**The staging-to-production guard costs eight lines.** Comparing the declared environment against the database host and refusing to start is the difference between a failed deploy and a restore from backup." },
          { t: "p", text: "**Rotate to a restricted key, not a replacement of the same key.** The exposure is the moment to ask why the service held a full-access key at all, and creating the new one with only the permissions actually used means the next leak is smaller." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service read `FEATURE_NEW_CHECKOUT` with `os.environ.get(\"FEATURE_NEW_CHECKOUT\", \"false\")` and gated on the truthiness of the result. The new checkout was enabled everywhere from the day the code shipped." },
      { t: "p", text: "**It went unnoticed for five weeks**, because the new checkout mostly worked. The bug surfaced as a slow drift in conversion rate that the analytics team spent a fortnight investigating — the flag was never on anyone's list of things that had changed." },
      { t: "p", text: "**The fix was a type annotation.** `debug: bool = False` in a settings class parses `\"false\"` correctly, and would have failed loudly on a value it could not interpret." },
      { t: "p", text: "**Untyped configuration does not fail — it behaves.** That is what makes it worse than a crash: there is no error to search for and no line to point at, only a number that moved." }
    ]}
  ],

  takeaways: [
    "**Configuration is what differs between environments running the same release.** Everything else is code, and belongs in review and in tests.",
    "**A business rule in an environment variable has no history and no test.** Thresholds and retry counts are design decisions, not deployment settings.",
    "**Every environment variable is a string.** `\"False\"`, `\"0\"` and `\"no\"` are all truthy, which is how a disabled feature ships enabled.",
    "**Fail at startup, not at first use.** A service that starts without its payment key passes its readiness probe and fails at the till.",
    "**Typed settings report every problem at once**, which turns a five-minute configuration fix into one deploy rather than five.",
    "**Set `extra=\"forbid\"`.** A typo'd variable name is otherwise ignored entirely, and the service quietly uses a default.",
    "**Never default a secret to a development value.** One missing manifest key then gives everyone with the repository the ability to forge tokens.",
    "**Commit `.env.example`, gitignore `.env`.** The example is the only reliable documentation of what the service needs.",
    "**Validate across environments**: refuse to start if a staging deployment points at a production database, or if production has DEBUG logging.",
    "**Use `SecretStr` so leaking becomes deliberate.** It masks in logs, reprs and tracebacks, and `.get_secret_value()` is greppable in review.",
    "**Secrets leak through debug endpoints, crash reporters, inherited subprocess environments and URLs** — not usually through the repository.",
    "**Mounted secret files beat environment variables**: they are absent from `/proc/*/environ` and can be rotated without a restart.",
    "**Design for rotation before you need it.** Accept a current and a previous key, so rotating is a rolling deploy rather than a mass logout."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`DEBUG = os.environ.get(\"DEBUG\", \"False\")` followed by `if DEBUG:`. What happens?",
        options: [
          "Debug is off unless the variable is set to true",
          "Debug is always on — `\"False\"` is a non-empty string and therefore truthy",
          "It raises a TypeError",
          "It depends on the shell"
        ],
        answer: 1,
        why: "Every environment variable is a string, and the only falsy string is the empty one — so `\"False\"`, `\"0\"` and `\"no\"` all enable the feature. A typed `debug: bool = False` field parses these correctly and fails loudly on a value it cannot interpret."
      },
      {
        stem: "Why should a missing `STRIPE_KEY` prevent startup rather than defaulting to an empty string?",
        options: [
          "Empty strings are invalid Python",
          "The service otherwise starts, passes its readiness probe, and fails on the first checkout — turning a configuration error into a customer-facing incident",
          "Stripe rejects empty keys with a 500",
          "It makes local development harder"
        ],
        answer: 1,
        why: "The whole point of validating configuration at startup is to move the failure to a moment when nobody is affected and the cause is obvious. A default for a required value converts a deploy-time error into a production incident with a customer attached."
      },
      {
        stem: "`PORT = os.environ.get(\"PORT\", 8000)` works locally but breaks in deployment. Why?",
        options: [
          "The deployment platform reserves port 8000",
          "The default is an int, but `os.environ.get` returns a string when the variable is set — so it is typed correctly only when nobody configures it",
          "Ports below 1024 need privileges",
          "The variable name collides with a platform variable"
        ],
        answer: 1,
        why: "The failure runs the opposite way to the usual pattern, which is what makes it confusing: it works where the variable is absent and breaks where it is present. Reproducing it locally requires setting a variable you would have no reason to set."
      },
      {
        stem: "What does `SecretStr` actually buy you?",
        options: [
          "Encryption of the value at rest",
          "Masking in reprs, logs and tracebacks, and an explicit `.get_secret_value()` call that makes every unwrap visible and greppable",
          "Prevention of the value being sent over the network",
          "Automatic rotation"
        ],
        answer: 1,
        why: "It is not encryption — the value is in memory in plain text. What it changes is that leaking becomes a deliberate act rather than an accident: a log line that serialises the settings object shows a mask, and `grep -r get_secret_value` enumerates every place a secret is unwrapped."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you handle configuration in a Python service?",
        strong: "A typed settings class validated at startup, with no defaults for required values. Environment variables for deployment, a gitignored `.env` locally, and a committed `.env.example` documenting what is needed.",
        answer: [
          { t: "p", text: "The fail-at-startup point is the substance: a service that starts without its payment key passes every health check and fails at the till." },
          { t: "p", text: "Mentioning that validation reports every error at once shows you have deployed one, since fixing one variable per cycle is the actual pain." },
          { t: "p", text: "Distinguishing configuration from business rules — thresholds belong in code with tests — demonstrates judgement about what should be configurable at all." }
        ]
      },
      {
        level: "advanced",
        q: "Where do secrets leak in practice?",
        strong: "Rarely from the repository, usually from debug endpoints, crash reporters serialising locals, subprocesses inheriting the whole environment, credentials in URLs, and log lines that dump a request body or a settings object.",
        answer: [
          { t: "p", text: "The subprocess inheritance point is the one most people have not considered, and it is genuinely common." },
          { t: "p", text: "Naming a specific mitigation for each — a denylist in the crash reporter, an explicit `env=` argument — keeps it practical rather than a list of fears." },
          { t: "p", text: "`SecretStr` is worth mentioning for the right reason: it makes leaking deliberate and greppable, not because it encrypts anything." }
        ]
      },
      {
        level: "advanced",
        q: "How would you rotate a signing key without logging everyone out?",
        strong: "Accept two keys: sign with the current one, verify against current and previous. Deploy the previous slot, then the new key, wait longer than the maximum token lifetime, then clear the old slot.",
        answer: [
          { t: "p", text: "The sequencing is the answer, and stating that each step is independently reversible is what makes it credible." },
          { t: "p", text: "Saying you build this before you need it is the point: rotating under pressure is when you discover the design assumed one key." },
          { t: "p", text: "Extending it to a leaked third-party key — rotate to a restricted key rather than an equivalent one — shows you treat the incident as a chance to reduce blast radius." }
        ]
      }
    ]
  }
});
