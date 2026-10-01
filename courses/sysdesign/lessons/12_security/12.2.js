/* ============================================================================
   LESSON 12.2 — JWT and Opaque Tokens
   ========================================================================= */
EC.receiveLesson({
  id: "12.2",

  lede: "After login, every request must carry proof of who sent it. There are two families of proof. An **opaque token** is a random string that means nothing by itself: the server looks it up to find the session, and deleting the record revokes it instantly. A **JSON Web Token** carries its claims inside, signed, so any service with the public key can verify it without asking anyone — which is why microservices like it, and why it **cannot be revoked** before it expires. This lesson takes a real JWT apart, shows the forgeries proper validation rejects, measures what each kind of check costs, and builds the pattern that reconciles them: short-lived access tokens with rotating refresh tokens.",

  objectives: [
    "Decode a JWT and explain what each part is for, and what it does not protect",
    "Validate a JWT correctly: algorithm, signature, issuer, audience and expiry",
    "Compare JWT and opaque tokens on size, verification cost and revocation",
    "Bound the revocation window with short-lived access tokens",
    "Implement refresh-token rotation with reuse detection"
  ],

  prerequisites: ["12.1", "11.3"],

  blocks: [

    { t: "h2", n: "01", id: "anatomy", text: "Inside a JWT",
      sub: "Signed, not secret" },

    { t: "viz", title: "Anatomy of a JWT",
      caption: "A JWT is three base64url-encoded parts joined by dots. The header names the algorithm and the key ID used to sign; the payload carries the claims — issuer, audience, subject, scopes, expiry; the signature covers both, made with the issuer's private key. Anyone can read the first two parts. Only the holder of the private key can produce a valid third.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="Anatomy of a JWT">
<text x="130.0" y="20" text-anchor="middle" class="s-label" style="fill:var(--crit)">header</text>
<rect x="20" y="30" width="220" height="30" rx="6" style="fill:var(--crit);fill-opacity:.15;stroke:var(--crit)"/>
<text x="30" y="50" class="s-mono" style="fill:var(--crit)">eyJhbGciOiJFUzI1NiIs…</text>
<rect x="20" y="72" width="220" height="70" rx="8" class="s-fill s-stroke"/>
<text x="30" y="92" class="s-mono" style="font-size:10.5px">{ "alg": "ES256",</text>
<text x="30" y="110" class="s-mono" style="font-size:10.5px">  "kid": "2026-09",</text>
<text x="30" y="128" class="s-mono" style="font-size:10.5px">  "typ": "JWT" }</text>
<text x="130.0" y="160" text-anchor="middle" class="s-sub" style="fill:var(--crit)">how to verify it</text>
<text x="400.0" y="20" text-anchor="middle" class="s-label" style="fill:var(--violet)">payload (claims)</text>
<rect x="250" y="30" width="300" height="30" rx="6" style="fill:var(--violet);fill-opacity:.15;stroke:var(--violet)"/>
<text x="260" y="50" class="s-mono" style="fill:var(--violet)">eyJpc3MiOiJodHRwczov…</text>
<rect x="250" y="72" width="300" height="106" rx="8" class="s-fill s-stroke"/>
<text x="260" y="92" class="s-mono" style="font-size:10.5px">{ "iss": "https://auth…",</text>
<text x="260" y="110" class="s-mono" style="font-size:10.5px">  "aud": "orders-api",</text>
<text x="260" y="128" class="s-mono" style="font-size:10.5px">  "sub": "user-81",</text>
<text x="260" y="146" class="s-mono" style="font-size:10.5px">  "scope": "orders:read",</text>
<text x="260" y="164" class="s-mono" style="font-size:10.5px">  "exp": 1790000300 }</text>
<text x="400.0" y="196" text-anchor="middle" class="s-sub" style="fill:var(--violet)">readable by anyone</text>
<text x="650.0" y="20" text-anchor="middle" class="s-label" style="fill:var(--accent)">signature</text>
<rect x="560" y="30" width="180" height="30" rx="6" style="fill:var(--accent);fill-opacity:.15;stroke:var(--accent)"/>
<text x="570" y="50" class="s-mono" style="fill:var(--accent)">MEUCIQDm2x9…</text>
<rect x="560" y="72" width="180" height="88" rx="8" class="s-fill s-stroke"/>
<text x="570" y="92" class="s-mono" style="font-size:10.5px">ECDSA over</text>
<text x="570" y="110" class="s-mono" style="font-size:10.5px">header + "." + payload,</text>
<text x="570" y="128" class="s-mono" style="font-size:10.5px">with the auth server's</text>
<text x="570" y="146" class="s-mono" style="font-size:10.5px">private key</text>
<text x="650.0" y="178" text-anchor="middle" class="s-sub" style="fill:var(--accent)">proves who issued it</text>
<text x="243" y="50" text-anchor="middle" class="s-label">.</text><text x="553" y="50" text-anchor="middle" class="s-label">.</text>
<text x="380" y="226" text-anchor="middle" class="s-sub">three base64url parts joined by dots; encoding, not encryption</text>
</svg>` },

    { t: "p", text: "A real token, signed with ES256 by PyJWT, then five tokens presented to a properly configured verifier:" },

    { t: "code", lang: "python", title: "jwt_demo.py — decoding a JWT, and five tokens a verifier must judge", code: `import base64, json, time
import jwt                                                   # PyJWT
from cryptography.hazmat.primitives.asymmetric import ec

private_key = ec.generate_private_key(ec.SECP256R1())       # held only by the auth server
public_key = private_key.public_key()                       # published at /.well-known/jwks.json

now = int(time.time())
claims = {"iss": "https://auth.shop.example", "aud": "orders-api", "sub": "user-81",
          "scope": "orders:read", "role": "customer", "iat": now, "exp": now + 300}
token = jwt.encode(claims, private_key, algorithm="ES256", headers={"kid": "2026-09"})

header, payload, signature = token.split(".")
pad = lambda s: s + "=" * (-len(s) % 4)
print(f"token: {len(token)} bytes = header.payload.signature")
print("header :", base64.urlsafe_b64decode(pad(header)).decode())
print("payload:", base64.urlsafe_b64decode(pad(payload)).decode()[:96], "...   <- readable by anyone")

def verify(t):
    try:
        c = jwt.decode(t, public_key, algorithms=["ES256"], audience="orders-api", issuer="https://auth.shop.example")
        return f"valid: {c['sub']} as {c['role']}"
    except jwt.PyJWTError as e: return f"REJECTED ({type(e).__name__})"

tampered = json.loads(base64.urlsafe_b64decode(pad(payload))); tampered["role"] = "admin"
forged = header + "." + base64.urlsafe_b64encode(json.dumps(tampered).encode()).rstrip(b"=").decode() + "." + signature
alg_none = jwt.encode({**claims, "role": "admin"}, key=None, algorithm="none")
wrong_aud = jwt.encode({**claims, "aud": "admin-api"}, private_key, algorithm="ES256")
expired = jwt.encode({**claims, "exp": now - 1}, private_key, algorithm="ES256")

for label, t in (("the real token", token), ("role edited to admin", forged), ('alg: "none", unsigned', alg_none),
                 ("token meant for admin-api", wrong_aud), ("expired a second ago", expired)):
    print(f"{label:<26} -> {verify(t)}")`,
      hl: [19, 21, 26, 27],
      out: `token: 338 bytes = header.payload.signature
header : {"alg":"ES256","kid":"2026-09","typ":"JWT"}
payload: {"iss":"https://auth.shop.example","aud":"orders-api","sub":"user-81","scope":"orders:read","rol ...   <- readable by anyone
the real token             -> valid: user-81 as customer
role edited to admin       -> REJECTED (InvalidSignatureError)
alg: "none", unsigned      -> REJECTED (InvalidAlgorithmError)
token meant for admin-api  -> REJECTED (InvalidAudienceError)
expired a second ago       -> REJECTED (ExpiredSignatureError)` },

    { t: "dl", items: [
      { term: "Anyone can read the payload", def: "The middle part decoded to plain JSON without a key. Never put secrets or personal data you would not show the user in a JWT; if claims must be confidential, use an encrypted JWE or an opaque token." },
      { term: "Editing invalidates the signature", def: "Changing role to admin broke the signature, because it covers the exact bytes of header and payload." },
      { term: "Pin the algorithm", def: "A token whose header says alg \"none\" carries no signature at all; libraries that trusted the header once accepted it. Passing algorithms=[\"ES256\"] means the verifier decides, not the token. The same rule blocks algorithm confusion, where an RS256 public key is misused as an HMAC secret." },
      { term: "Check audience and issuer", def: "A valid token for admin-api must not be accepted by orders-api. Without the aud check, any token from your identity provider works on every service." },
      { term: "Check expiry, with little clock skew", def: "exp, and nbf if present; allow seconds of skew between clocks (8.2), not minutes." }
    ] },

    { t: "callout", kind: "insight", title: "Keys, kid and JWKS",
      body: [
        { t: "p", text: "Services fetch the issuer's public keys from its JWKS endpoint and cache them, choosing by the kid in the token's header. That makes rotation routine: publish a new key, start signing with it, and remove the old key once every token it signed has expired. Asymmetric algorithms (ES256, RS256, EdDSA) mean verifiers hold only public keys; with HS256 every verifier holds the signing secret, so any of them could mint tokens." }
      ] },

    { t: "h2", n: "02", id: "compare", text: "JWT or opaque?",
      sub: "Local verification against instant revocation" },

    { t: "p", text: "What does each kind of check cost per request, and what happens when an account must be cut off? Measured on this machine, with Redis local:" },

    { t: "code", lang: "python", title: "tokens.py — verification cost, size and the revocation window", code: `import random, secrets, time
import jwt, redis
from cryptography.hazmat.primitives.asymmetric import ec, rsa

def per_call(fn, n=2000):
    start = time.perf_counter()
    for _ in range(n): fn()
    return (time.perf_counter() - start) / n * 1e6

claims = {"sub": "user-81", "aud": "orders-api", "exp": int(time.time()) + 300}
ec_key, rsa_key = ec.generate_private_key(ec.SECP256R1()), rsa.generate_private_key(public_exponent=65537, key_size=2048)
es = jwt.encode(claims, ec_key, algorithm="ES256"); rs = jwt.encode(claims, rsa_key, algorithm="RS256")
r = redis.Redis(port=6380); opaque = secrets.token_urlsafe(32)
r.set(f"session:{opaque}", "user-81", ex=300)

print(f"{'check one request':<34} {'size':>7} {'time':>10}  {'revocable?':<}")
for label, size, fn, revoke in (
        ("JWT ES256, verified locally", len(es), lambda: jwt.decode(es, ec_key.public_key(), algorithms=["ES256"], audience="orders-api"), "only at expiry"),
        ("JWT RS256, verified locally", len(rs), lambda: jwt.decode(rs, rsa_key.public_key(), algorithms=["RS256"], audience="orders-api"), "only at expiry"),
        ("opaque token, Redis lookup", len(opaque), lambda: r.get(f"session:{opaque}"), "immediately")):
    print(f"{label:<34} {size:>5} B {per_call(fn):>8.0f} µs  {revoke}")

# A token is stolen and the account disabled at a random moment: how long does the stolen token still work?
rng = random.Random(2)
print("\\nafter the account is disabled, a stolen token keeps working for (10,000 random moments):")
for ttl_min in (60, 15, 5):
    left = sorted(rng.uniform(0, ttl_min) for _ in range(10_000))
    print(f"  JWT with a {ttl_min:>2}-minute lifetime: average {sum(left) / len(left):4.1f} min, worst {left[-1]:4.1f} min")
print("  opaque token, deleted on revoke:   0 min")`,
      out: `check one request                     size       time  revocable?
JWT ES256, verified locally          195 B      127 µs  only at expiry
JWT RS256, verified locally          451 B       54 µs  only at expiry
opaque token, Redis lookup            43 B       82 µs  immediately

after the account is disabled, a stolen token keeps working for (10,000 random moments):
  JWT with a 60-minute lifetime: average 29.9 min, worst 60.0 min
  JWT with a 15-minute lifetime: average  7.5 min, worst 15.0 min
  JWT with a  5-minute lifetime: average  2.5 min, worst  5.0 min
  opaque token, deleted on revoke:   0 min` },

    { t: "p", text: "Verifying a signature locally took tens to about a hundred microseconds, and so did an opaque-token lookup in a Redis on the same machine — the CPU cost is not what decides it. Across a real network the lookup adds a round trip and makes the session store a dependency of **every request in every service**, while the JWT needs nothing but a cached public key. The price of that independence is the second half of the output: once issued, a JWT works until it expires. A stolen one-hour token kept working for half an hour on average after the account was disabled; a five-minute token, two and a half minutes." },

    { t: "diagram", kind: "timeline", title: "How long a stolen token works after revocation",
      caption: "The account is disabled at minute 0. An opaque token stops at once, because the next lookup finds nothing. A JWT keeps working until its exp: up to five minutes for a short-lived access token, up to an hour for a long-lived one. Short access tokens plus refresh tokens — which are opaque and checked at the auth server — bound the window without a lookup on every request.",
      span: 60, tick: 10, unit: "minutes after the account is disabled",
      lanes: [
        { label: "Opaque token", bars: [[0, 0.4, "", "good"]] },
        { label: "JWT, 5 min", bars: [[0, 5, "", "warn"]] },
        { label: "JWT, 60 min", bars: [[0, 60, "still accepted until exp", "crit"]] }
      ] },

    { t: "diagram", kind: "matrix", title: "Choosing a token",
      cols: ["Verification", "Revocation", "Best for"],
      rows: ["Opaque session token", "JWT access token", "Opaque refresh token"],
      cells: [
        [{ text: "a lookup per request", tone: "warn" }, { text: "immediate", tone: "good" }, { text: "browser sessions, monoliths" }],
        [{ text: "local, with a public key", tone: "good" }, { text: "only at expiry", tone: "crit" }, { text: "service-to-service APIs" }],
        [{ text: "at the auth server only", tone: "accent" }, { text: "immediate", tone: "good" }, { text: "renewing short JWTs" }]
      ] },

    { t: "callout", kind: "trap", title: "Revocation lists bring the lookup back",
      body: [
        { t: "p", text: "Checking every JWT against a denylist of revoked token IDs restores revocation and removes the reason for using JWTs. Middle grounds exist — push revocation events to services that keep a small in-memory denylist until the tokens expire, or check a per-user token version only for sensitive operations — but the simple, robust design is short access-token lifetimes. In browsers, keep tokens out of localStorage, where any injected script can read them; an HttpOnly, Secure, SameSite cookie holding an opaque session is still the strongest default for web front ends." }
      ] },

    { t: "h2", n: "03", id: "refresh", text: "Refresh tokens",
      sub: "Long sessions from short tokens" },

    { t: "p", text: "A five-minute access token is fine if the client can quietly get a new one. A **refresh token** is a long-lived, opaque credential sent only to the auth server's token endpoint in exchange for a new access token — so revoking the refresh token ends the session within one access-token lifetime. Because refresh tokens last for days, they are the prize for an attacker. **Rotation** issues a new refresh token on every use and invalidates the old one, and **reuse detection** turns a theft into a signal: if a used refresh token ever comes back, one of the two holders is an attacker, and the whole session is revoked. The exercise builds it." },

    { t: "exercise", kind: "Challenge", title: "Rotation with reuse detection",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Implement a token service where each login starts a **family** of refresh tokens. Each refresh returns a new access token and a new refresh token and marks the old one used. Presenting a used refresh token revokes the entire family. Simulate a user refreshing normally while malware copies one refresh token and replays it later." }
      ],
      requirements: [
        "Opaque, random refresh tokens stored server-side with their family and a used flag",
        "Refresh issues a new pair and marks the presented token used",
        "Reuse of a used token revokes every token in its family",
        "After revocation, the user must log in again"
      ],
      hint: "Keep a set of revoked family IDs; check it before anything else on refresh, so tokens issued after a stolen one are revoked too.",
      solution: { lang: "python", title: "refresh_ex.py",
        code: `import secrets

class TokenService:
    """Refresh tokens are opaque, single-use, and grouped into families (one per login)."""
    def __init__(self): self.tokens, self.revoked_families = {}, set()
    def login(self, user):
        family = secrets.token_hex(4)
        return self._issue(user, family)
    def _issue(self, user, family):
        rt = secrets.token_urlsafe(24)
        self.tokens[rt] = {"user": user, "family": family, "used": False}
        access = f"access-jwt(sub={user}, exp=+5min)"
        return access, rt
    def refresh(self, rt):
        t = self.tokens.get(rt)
        if t is None: return "401 unknown token"
        if t["family"] in self.revoked_families: return "401 session revoked"
        if t["used"]:                                     # a refresh token presented twice: one copy is stolen
            self.revoked_families.add(t["family"])        # we cannot tell which, so end the whole session
            return "401 reuse detected: every token in this session revoked"
        t["used"] = True
        return self._issue(t["user"], t["family"])        # rotate: a new refresh token each time

def show(label, result):
    print(f"{label:<30} -> {result[0] if isinstance(result, tuple) else result}")

svc = TokenService()
access, rt1 = svc.login("asha");              show("asha logs in", access)
access, rt2 = svc.refresh(rt1);               show("asha refreshes with rt1", access)
stolen = rt2                                                # malware copies rt2 from the device
access, rt3 = svc.refresh(rt2);               show("asha refreshes with rt2", access)
show("attacker replays stolen rt2", svc.refresh(stolen))
show("asha refreshes with rt3", svc.refresh(rt3))
show("asha logs in again", svc.login("asha"))`,
        out: `asha logs in                   -> access-jwt(sub=asha, exp=+5min)
asha refreshes with rt1        -> access-jwt(sub=asha, exp=+5min)
asha refreshes with rt2        -> access-jwt(sub=asha, exp=+5min)
attacker replays stolen rt2    -> 401 reuse detected: every token in this session revoked
asha refreshes with rt3        -> 401 session revoked
asha logs in again             -> access-jwt(sub=asha, exp=+5min)`,
        notes: [
          { t: "p", text: "The attacker's replay of rt2 was detected because rt2 had already been used. The service cannot tell whether the attacker or the user holds the newer token, so it revokes the family — including rt3, which the legitimate user holds — and the user simply logs in again. A theft costs the attacker the session and the user one login." },
          { t: "p", text: "In production the refresh endpoint also allows a small grace period for honest races (two tabs refreshing at once), binds refresh tokens to the client (DPoP or mTLS) where possible, and sets an absolute session lifetime so even a never-detected theft eventually ends." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a token that worked on every service",
      body: [
        { t: "p", text: "**Symptom.** A penetration test found that a token issued to a customer-facing mobile app was accepted by the internal admin API, which listed every customer's orders. No credentials had been stolen; the tester had used their own account." },
        { t: "p", text: "**Mechanism.** All services trusted the same identity provider and verified JWT signatures correctly, but none checked the audience. The admin API also authorised by the presence of a valid token rather than by scope or role. Any authenticated user anywhere was effectively an administrator — jwt_demo.py's fourth case, unhandled." },
        { t: "p", text: "**Fix.** Each API now requires its own aud and the scopes for each operation; admin tokens are issued only through a separate client with MFA and short lifetimes; a shared validation library made the checks impossible to skip; and contract tests present tokens for the wrong audience, issuer, algorithm and expiry to every service in CI." }
      ] }
  ],

  takeaways: [
    "A **JWT** is header.payload.signature in base64url: **signed, not encrypted** — the payload is readable by anyone.",
    "Validate everything: **pinned algorithm**, signature, **issuer**, **audience**, expiry — measured, a tampered role, alg \"none\", a wrong audience and an expired token were all rejected.",
    "Publish public keys via **JWKS** with a **kid**, and prefer asymmetric algorithms so verifiers cannot mint tokens.",
    "An **opaque token** is a random handle looked up server-side: small and **instantly revocable**, but every request needs the store.",
    "Measured: local JWT verification and a local Redis lookup both took **~50–125 µs**; the difference that matters is the network round trip and the dependency.",
    "A JWT **cannot be revoked** before expiry: a stolen 60-minute token worked **~30 minutes on average** after the account was disabled; a 5-minute token, **~2.5**.",
    "Use **short-lived JWT access tokens** with **opaque refresh tokens** checked at the auth server.",
    "**Rotate refresh tokens** and detect reuse: a replayed token revoked the whole session.",
    "In browsers, prefer **HttpOnly, Secure, SameSite cookies** to localStorage for anything that grants access."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Which statement about a JWT's payload is true?",
        options: ["It is encrypted, so only the API can read it", "It is base64url-encoded and readable by anyone who has the token; the signature only prevents changes", "It is hashed, so it cannot be read", "It is safe for storing passwords"],
        answer: 1,
        why: "Decoding the payload needs no key — the demo printed it directly. The signature makes tampering detectable but hides nothing. Confidential claims need a JWE or should not be in the token at all." },

      { stem: "A verifier accepts any algorithm named in the token's header. What attack does this allow?",
        options: ["None, if the signature is checked", "A token with alg \"none\" and no signature, or an RS256 public key misused as an HMAC secret, can pass verification", "A replay of an expired token", "Reading the payload"],
        answer: 1,
        why: "Letting the token choose the algorithm lets an attacker choose a verification that always succeeds. Pin the expected algorithms in the verifier. Expiry and confidentiality are separate issues." },

      { stem: "An employee is dismissed and their account disabled. They still hold a JWT access token with a 60-minute lifetime. What happens?",
        options: ["The token stops working immediately", "It keeps working until it expires — up to an hour — unless services check a revocation list", "It works for exactly 60 more minutes", "It is automatically refreshed"],
        answer: 1,
        why: "JWTs are verified locally and stay valid until exp, so the remaining window is anywhere from zero to sixty minutes — thirty on average. Short lifetimes or a revocation check reduce it; disabling the refresh token stops renewals but not the current access token." },

      { stem: "With refresh-token rotation, a refresh token that has already been used is presented again. What should the server do?",
        options: ["Issue new tokens as usual", "Revoke the entire token family, because one of the two holders must be an attacker", "Ignore it silently", "Extend its expiry"],
        answer: 1,
        why: "A rotated token should never be used twice, so reuse means it was copied. The server cannot tell which holder is legitimate, so it ends the session; the real user re-authenticates, and the attacker loses access." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Token questions are rarely about JWT syntax; they are about revocation.",
    questions: [
      { level: "core",
        q: "Compare JWTs and opaque tokens for a microservices system.",
        strong: "A strong answer weighs verification, revocation, size and exposure, and recommends a combination.",
        answer: [
          { t: "p", text: "A JWT is self-contained and signed, so any service can verify it with a cached public key and no network call, and it carries claims for local authorisation decisions. But it cannot be revoked before expiry, its payload is readable, and it is larger. An opaque token is a random handle; every check needs a lookup in a session store, which adds latency and a shared dependency, but revocation is immediate and nothing leaks." },
          { t: "p", text: "I would use short-lived JWT access tokens — five to fifteen minutes — validated strictly for algorithm, signature, issuer, audience and expiry, with opaque, rotating refresh tokens checked only at the auth server. For browser front ends, an opaque session in an HttpOnly cookie at a backend-for-frontend, which exchanges it for JWTs to call internal services." }
        ] },

      { level: "advanced",
        q: "How do you revoke a JWT before it expires?",
        strong: "A strong answer names the options, what each costs, and the default.",
        answer: [
          { t: "p", text: "Strictly, you cannot; you can only stop accepting it. Options: a denylist of token IDs checked on every request, which reintroduces a lookup; a per-user token version or revoked-after timestamp checked for sensitive operations; or revocation events pushed to services that hold a small in-memory denylist until the affected tokens expire." },
          { t: "p", text: "The default I would choose is to keep access tokens short-lived so the window is minutes, revoke the refresh token at the auth server, and add a version check only on high-risk operations such as payments or admin actions." }
        ] },

      { level: "core",
        q: "What must every service check when it receives a JWT?",
        strong: "A strong answer lists each check and the attack it prevents.",
        answer: [
          { t: "p", text: "The algorithm is one it expects, set by the verifier rather than the token, which stops alg none and algorithm confusion. The signature, with a key looked up by kid from the issuer's JWKS. The issuer, so tokens from other identity providers are refused. The audience, so a token meant for another API is refused." },
          { t: "p", text: "Expiry and not-before, with only seconds of clock skew. Then authorisation: the scopes or roles required for this specific operation — a valid token proves identity, not permission. All of it in one shared library, so no service can skip a check." }
        ] }
    ]
  }
});
