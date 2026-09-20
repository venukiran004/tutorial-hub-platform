/* ============================================================================
   LESSON 12.10 — Auth in Depth: OAuth2, Authorisation Models and the
   OWASP Top 10
   Mirrors 34_Auth_and_Security/Auth_and_Security.md §4 (secure randomness,
   timing-safe comparison), §8 (OAuth2 and OIDC), §9 (RBAC, ABAC, scopes,
   object-level checks), §11 (API keys and service-to-service), §12–13
   (transport and injection defences), §16 (OWASP Top 10) and §17 (tooling).
   Lesson 12.8 covered passwords, sessions, JWTs and secrets; this picks up
   the sections it did not.
   ========================================================================= */
EC.receiveLesson({
  id: "12.10",

  lede: "**Lesson 12.8 taught how to check who a user is. This one is about everything around that check: where the random tokens come from, why a secret is never compared with ==, how 'Sign in with Google' actually works and which OAuth2 flow a given client needs, the four authorisation models and the one check everybody forgets, how services authenticate to each other, the web-layer defences, and the OWASP Top 10 mapped to the Python line that fixes each item.** The reference's security file is long because the attack surface is; this lesson is its map.",

  objectives: [
    "Generate tokens with secrets rather than random, and compare secrets with hmac.compare_digest",
    "Explain OAuth2 as delegation and OIDC as identity on top, and choose the grant type for a web app, a SPA, a machine and a CLI",
    "Implement RBAC as a dependency factory, describe ABAC and scopes, and add the object-level ownership check",
    "Authenticate service-to-service calls with API keys or client credentials, and harden transport with TLS, cookie flags, CORS and CSRF defences",
    "Map each OWASP Top 10 category to its Python defence and the tool that catches it"
  ],

  prerequisites: ["12.8", "12.5"],

  blocks: [

    { t: "h2", n: "01", text: "Secure randomness and timing-safe comparison", id: "secrets" },

    { t: "code", lang: "python", title: "secrets, not random",
      code: `import secrets, hmac
secrets.token_urlsafe(32)      # 'sFEUi3y-PcTfLa1AEL45zsI2K_AgmroW6mbD55L7twM' — session ids, reset and API tokens
secrets.token_hex(16)          # 32 hex characters
secrets.token_bytes(32)        # raw bytes: a signing key
secrets.choice(alphabet)       # a secure random pick: an OTP digit
secrets.randbelow(1_000_000)   # a secure integer in [0, n)

# comparing a secret the caller supplied against the one you hold
hmac.compare_digest(provided_token, expected_token)   # constant time
# provided_token == expected_token                     # short-circuits at the first differing byte`,
      caption: "random is a Mersenne Twister: deterministic, and predictable from a few hundred outputs. secrets reads the operating system's CSPRNG. The two have the same call shape and completely different guarantees." },

    { t: "p", text: "The timing argument: `==` on two strings returns as soon as a byte differs, so a comparison that fails at byte 1 is faster than one that fails at byte 16, and an attacker who can measure the difference recovers the secret one byte at a time. Measured here on 32-character tokens, Python's `==` showed 47.6 ns against 44.8 ns — within noise at this length, because the C-level compare is fast and the network dwarfs it — but the leak is real for longer secrets, slower comparisons and patient attackers, and `compare_digest` costs 20 ns to remove it entirely (66.8 ns early, 66.3 ns late). Use it for API keys, tokens, HMAC signatures and CSRF tokens, always." },

    { t: "h2", n: "02", text: "OAuth2 and OpenID Connect", id: "oauth" },

    { t: "p", text: "**OAuth2 is an authorisation framework**: it lets an application obtain limited access to a resource on a user's behalf without ever seeing the user's password — the delegation behind 'Sign in with Google' and 'let this app read your calendar'. **OpenID Connect is a thin authentication layer on top**: it adds an ID token, a JWT that says who the user is. OAuth2 gives access; OIDC gives identity." },

    { t: "diagram", kind: "flow", title: "Authorization Code flow with PKCE", caption: "The browser is redirected to the provider, the user consents, the provider sends a short-lived code back to your redirect URI, and your backend exchanges the code plus the PKCE verifier for tokens. The user's password never touches your app; the code is useless without the verifier.", cols: 5, nodes: [
      { id: "app", label: "your app", sub: "generates verifier + challenge" },
      { id: "prov", label: "provider login", sub: "user authenticates, consents", tone: "accent" },
      { id: "code", label: "redirect with code", sub: "short-lived, one use", tone: "warn" },
      { id: "ex", label: "POST /token", sub: "code + verifier → tokens", tone: "good" },
      { id: "tok", label: "access + ID token", sub: "+ refresh token", tone: "violet" }
    ], edges: [["app", "prov", "redirect + challenge"], ["prov", "code"], ["code", "ex"], ["ex", "tok"]] },

    { t: "table", head: ["Grant type", "Use it for", "Note"],
      rows: [
        ["**Authorization Code + PKCE**", "Web apps, SPAs and mobile apps logging in a user via a provider", "PKCE is mandatory for public clients — it defeats interception of the code"],
        ["**Client Credentials**", "Machine to machine, no user — a service calling another service", "The service authenticates with its own client_id and secret"],
        ["Refresh Token", "Exchanging a refresh token for a new access token", "Rotate on use; revoke the family on reuse (lesson 12.8)"],
        ["Device Code", "Input-constrained devices: TVs, CLIs", "The user approves on another device"],
        ["Password (ROPC)", "Legacy; first-party trusted clients only", "The user's password goes to your app — avoid for third parties"],
        ["Implicit", "Nothing — deprecated", "Tokens in the URL fragment; use Code + PKCE"]
      ] },

    { t: "h2", n: "03", text: "Authorisation models", id: "authz" },

    { t: "diagram", kind: "compare", title: "RBAC, ABAC, scopes and ownership", caption: "Four different questions. A request can pass three of them and still be an attack if the fourth — does this user own this row — is missing. That omission is OWASP's number-one category.", columns: [
      { title: "RBAC", tone: "accent", items: ["permissions attach to roles", "users hold roles", "admin / editor / viewer", "coarse, simple, most common"] },
      { title: "ABAC", tone: "good", items: ["decide from attributes", "user + resource + context", "'editors edit their own department's docs before 6 pm'", "fine-grained, policy engine"] },
      { title: "Scopes", tone: "warn", items: ["what a CLIENT may do", "in the token: read:orders", "orthogonal to user roles", "limit third-party apps"] },
      { title: "Object-level", tone: "crit", items: ["does this user own THIS row?", "checked per request, per object", "the most forgotten check", "OWASP A01"] }
    ] },

    { t: "code", lang: "python", title: "The reference's RBAC dependency factory, plus the ownership check",
      code: `from enum import Enum
from fastapi import Depends, HTTPException, status

class Role(str, Enum):
    admin = "admin"; editor = "editor"; viewer = "viewer"

PERMISSIONS = {"delete_doc": {Role.admin}, "edit_doc": {Role.admin, Role.editor}, "view_doc": {Role.admin, Role.editor, Role.viewer}}

def require(permission: str):
    def dependency(user: User = Depends(current_user)):
        if user.role not in PERMISSIONS[permission]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "not allowed")
        return user
    return dependency

@app.delete("/docs/{doc_id}")
def delete_doc(doc_id: int, user: User = Depends(require("delete_doc")), db=Depends(get_db)):
    doc = db.get(Document, doc_id)
    if doc is None or doc.owner_id != user.id:      # the object-level check: 404, not 403, to avoid leaking existence
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    db.delete(doc)`,
      caption: "require('delete_doc') is a dependency built per permission; the role check happens before the handler runs. The ownership check has to be inside the handler, because it needs the row — and it is the line most APIs are missing." },

    { t: "h2", n: "04", text: "API keys and service-to-service auth", id: "s2s" },

    { t: "p", text: "For a machine caller there is no user to log in. Two patterns: an **API key** — a random token (`secrets.token_urlsafe`) handed to the caller, stored hashed on your side like a password, sent in a header, compared with `compare_digest`, scoped and revocable — or **OAuth2 client credentials**, where the calling service authenticates to an authorisation server and presents a short-lived access token, which scales better across many services and expires by itself. Inside one platform, mutual TLS between services adds identity at the transport layer. In every case: rotate, scope narrowly, log the key id (never the key), and rate-limit per key." },

    { t: "h2", n: "05", text: "Transport and web-layer defences", id: "web" },

    { t: "table", head: ["Layer", "Defence", "The setting"],
      rows: [
        ["TLS", "Everything over HTTPS; HSTS so browsers never downgrade", "`Strict-Transport-Security: max-age=31536000; includeSubDomains`"],
        ["Cookies", "Session cookies unreadable by scripts and unsent cross-site", "`Secure; HttpOnly; SameSite=Lax` (Strict for the most sensitive)"],
        ["CORS", "Allow exactly the origins that need the API — never `*` with credentials", "`CORSMiddleware(allow_origins=[...], allow_credentials=True)`"],
        ["CSRF", "For cookie-authenticated state changes: SameSite plus a synchroniser token compared with `compare_digest`", "Bearer tokens in a header are immune — the browser does not attach them automatically"],
        ["Injection", "Parameterised SQL, no `shell=True`, path joins checked against a base directory, outbound URLs allow-listed against SSRF", "Lessons 13.3 and 7.3; `pickle` never on untrusted input"]
      ] },

    { t: "h2", n: "06", text: "The OWASP Top 10, mapped to Python", id: "owasp" },

    { t: "diagram", kind: "matrix", title: "OWASP Top 10 — the Python defence and the tool that catches it", caption: "Each category has one primary defence in code and one tool that finds the omission before an attacker does. Broken access control sits at number one because the object-level check is the easiest line to forget.", rows: ["A01 Broken access control", "A02 Cryptographic failures", "A03 Injection", "A04 Insecure design", "A05 Security misconfiguration", "A06 Vulnerable components", "A07 Identification and authentication", "A08 Software and data integrity", "A09 Logging and monitoring", "A10 SSRF"], cols: ["defence", "tool"], cells: [
      [{ text: "per-request, per-object authz; deny by default", tone: "crit" }, { text: "tests per role and per object" }],
      [{ text: "argon2 hashes, TLS, keys in a vault", tone: "accent" }, { text: "bandit, ruff --select S" }],
      [{ text: "parameterised SQL, allow-lists, no shell=True", tone: "accent" }, { text: "bandit, sqlmap in staging" }],
      [{ text: "threat model, rate limits, throttling", tone: "warn" }, { text: "design review" }],
      [{ text: "debug off, strict CORS, generic errors", tone: "warn" }, { text: "config linting, a prod checklist" }],
      [{ text: "pinned, audited dependencies", tone: "accent" }, { text: "pip-audit, Dependabot" }],
      [{ text: "MFA, lockout, no session fixation", tone: "accent" }, { text: "auth event logs" }],
      [{ text: "no pickle on input; signed artefacts", tone: "crit" }, { text: "bandit, SBOM and provenance" }],
      [{ text: "log auth events, never secrets; alert", tone: "good" }, { text: "structured logs, alerts" }],
      [{ text: "allow-list outbound hosts", tone: "crit" }, { text: "egress policy" }]
    ] },

    { t: "code", lang: "bash", title: "The reference's tooling, layered",
      code: `bandit -r src/                       # SAST: eval, shell=True, weak hashes, hard-coded passwords
ruff check --select S .              # the same rules as a ruff plugin (flake8-bandit)
pip-audit                            # SCA: installed dependencies against the advisory database
detect-secrets scan > .secrets.baseline   # secret scanning, then as a pre-commit hook
# in CI: Dependabot or Renovate for automated upgrade PRs; gitleaks on every push`,
      caption: "Static analysis for your code, a scanner for your dependencies, a scanner for secrets in the repository — three tools, each cheap, each catching a different half of the list above." },

    { t: "exercise", kind: "review", title: "Find the four gaps", difficulty: "advanced", minutes: 15,
      body: [{ t: "p", text: "An endpoint `GET /invoices/{id}` requires a valid JWT, checks `user.role in {'admin', 'accountant'}`, loads the invoice by id and returns it. Its API-key twin for a partner compares `request.headers['X-Key'] == PARTNER_KEY`, where PARTNER_KEY was generated with `random.choice`. CORS is `allow_origins=['*'], allow_credentials=True`. Name the four problems, the OWASP category of each, and the one-line fix." }],
      requirements: ["Four problems, each with its category", "The fix for each in one line", "Which one you would fix first and why"],
      hint: "The role check passes for every accountant — including for invoices that belong to another company's account.",
      solution: { lang: "text", title: "Solution",
        code: `1  no object-level check: any accountant reads any invoice         A01  → if invoice.account_id != user.account_id: 404
2  API key compared with ==                                         A02  → hmac.compare_digest(provided, expected)
3  PARTNER_KEY from random.choice — predictable                     A02  → secrets.token_urlsafe(32), stored hashed
4  CORS '*' with credentials — any site can call as the user         A05  → allow_origins=[the real origins]
fix 1 first: it is exploitable today by any logged-in accountant with a URL`,
        notes: [{ t: "p", text: "Three of the four pass every automated scanner; only the predictable key would be flagged. The object-level check has to come from a person who asks 'whose row is this?' on every handler that takes an id." }] } }
  ],

  takeaways: [
    "Tokens come from secrets, never random; secrets are compared with hmac.compare_digest, never ==.",
    "OAuth2 delegates access, OIDC adds identity; Authorization Code + PKCE for anything with a user, Client Credentials for machines, never Implicit or ROPC for third parties.",
    "RBAC for coarse roles, ABAC for attribute policies, scopes for what a client may do — and the object-level ownership check on every handler that takes an id.",
    "Service-to-service: hashed, scoped, rotated API keys or client-credentials tokens; log the key id, never the key.",
    "HTTPS with HSTS, cookies Secure + HttpOnly + SameSite, CORS with explicit origins, CSRF tokens for cookie-authenticated writes, parameterised everything.",
    "OWASP Top 10: each item is one defence in code and one tool in CI — bandit, pip-audit, detect-secrets — with broken access control first because it is the check tools cannot see."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why must an API key be compared with hmac.compare_digest rather than ==?",
      options: ["== does not work on strings", "== returns as soon as a byte differs, so response time leaks how many leading bytes matched", "compare_digest also hashes the key", "== is slower"],
      answer: 1,
      why: "A short-circuiting comparison finishes faster when the mismatch is early, and an attacker measuring response times can recover the secret one byte at a time. compare_digest takes the same time regardless of where the strings differ — measured here at 66 ns either way — and costs nothing worth mentioning." },
    { stem: "A single-page app needs to log users in via Google. Which OAuth2 flow?",
      options: ["Implicit", "Resource Owner Password", "Authorization Code with PKCE", "Client Credentials"],
      answer: 2,
      why: "A SPA is a public client that cannot keep a secret, so the code flow needs PKCE: a verifier the app generates and a challenge it sends, so an intercepted authorisation code cannot be exchanged without the verifier. Implicit is deprecated for putting tokens in the URL; ROPC hands the password to the app; client credentials has no user." },
    { stem: "A user with the 'accountant' role can read any invoice by changing the id in the URL. Which OWASP category, and what is missing?",
      options: ["A03 Injection — parameterise the query", "A01 Broken access control — the object-level ownership check", "A02 Cryptographic failures — hash the id", "A10 SSRF — allow-list the id"],
      answer: 1,
      why: "The role check answers 'may accountants read invoices?' but not 'may this accountant read this invoice?'. Object-level authorisation compares the row's owner or account with the requester on every request, and returns 404 rather than 403 so the existence of other users' rows is not confirmed." },
    { stem: "What does OpenID Connect add to OAuth2?",
      options: ["Refresh tokens", "An ID token — a JWT stating who the user is — turning delegated access into authentication", "PKCE", "Scopes"],
      answer: 1,
      why: "OAuth2 on its own tells your app it may access a resource; it does not standardise who the user is. OIDC layers an ID token with standard claims (sub, email, iss, aud, exp) and a discovery document, which is what 'Sign in with …' actually relies on." }
  ] },

  interview: { title: "Interview", sub: "Security questions past the password check", questions: [
    { level: "Core", q: "Explain the difference between authentication and authorisation, and where each happens in a FastAPI app.",
      strong: "Authentication establishes who; authorisation decides what they may do. The first is a dependency that turns a token into a user; the second is a permission dependency plus an object-level check in the handler.",
      answer: [{ t: "p", text: "Authentication verifies identity — a password, a session cookie, a JWT, an OAuth2 code exchanged for tokens — and in FastAPI it is a current_user dependency that validates the credential and returns the user or 401. Authorisation decides what that identity may do: a role or scope check, which fits a dependency factory like require('edit_doc') returning 403, and an ownership check that has to live in the handler because it needs the loaded row — 404 if the row is not theirs. Authentication is one decision per request; authorisation is one per resource touched." }] },
    { level: "Core", q: "RBAC or ABAC?",
      strong: "RBAC by default for its simplicity; ABAC when policies depend on attributes of the resource or context that roles cannot express.",
      answer: [{ t: "p", text: "Role-based access control attaches permissions to a handful of roles and assigns roles to users; it is easy to reason about, audit and test, and covers most applications. Attribute-based control evaluates a policy over attributes of the user, the resource and the context — department, ownership, time, classification — and is needed when the rules are genuinely conditional: 'editors may edit documents in their own department before the cut-off'. ABAC is more expressive and harder to audit, so it is usually implemented with a policy engine and kept for the cases RBAC cannot state. Either way the object-level check is separate: a role or a policy still has to be evaluated against this specific row." }] },
    { level: "Senior", q: "Design service-to-service authentication for a dozen internal services.",
      strong: "Short-lived client-credentials tokens from an internal authorisation server, mTLS on the transport, scopes per service pair, key rotation, and per-caller rate limits and logging.",
      answer: [{ t: "p", text: "Static API keys work for two services and become unmanageable at a dozen: rotation is manual, scope is all-or-nothing, and a leaked key is valid until someone notices. Run an internal authorisation server (or use the platform's identity — Kubernetes service accounts, cloud IAM) and have each service obtain a short-lived access token via client credentials, with scopes naming what it may call; the callee validates the signature, audience and scope and rejects anything else. Put mutual TLS between services so the transport itself asserts identity and encrypts traffic. Rotate client secrets on a schedule, log the caller's client id on every request, rate-limit per caller, and alert on scope failures — a service suddenly asking for a scope it never used is the signal of a compromise." }] }
  ] }
});
