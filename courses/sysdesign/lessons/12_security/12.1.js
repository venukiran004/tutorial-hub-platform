/* ============================================================================
   LESSON 12.1 — Authentication, Authorisation, OAuth and OIDC
   ========================================================================= */
EC.receiveLesson({
  id: "12.1",

  lede: "Two questions guard every request. **Authentication** asks who is calling; **authorisation** asks whether they may do this. Systems fail at both in characteristic ways: passwords stored with fast hashes, login flows that let an attacker swap in a stolen code, permission checks scattered through code until one is missed. This lesson measures why password hashing must be slow, walks through **OAuth 2.0's authorization-code flow with PKCE** — and the attacks each of its parameters stops — explains what **OpenID Connect** adds, and compares role-, attribute- and relationship-based authorisation, ending with a Zanzibar-style permission check.",

  objectives: [
    "Separate authentication from authorisation, and place each in the identity stack",
    "Store passwords with a slow, salted hash, and quantify why",
    "Trace the authorization-code flow with PKCE, and name the attack that state and PKCE each prevent",
    "Explain what OpenID Connect adds to OAuth 2.0",
    "Choose between RBAC, ABAC and ReBAC, and implement a relationship-based check"
  ],

  prerequisites: ["1.4", "10.5"],

  blocks: [

    { t: "h2", n: "01", id: "authn", text: "Who are you?",
      sub: "Authentication, and storing what proves it" },

    { t: "diagram", kind: "layers", title: "The identity stack",
      caption: "Each layer builds on the one below. Most applications should own none of the bottom three: an identity provider (Okta, Auth0, Entra ID, Cognito, Keycloak) stores identities, authenticates with MFA and passkeys, and issues tokens, while the application consumes tokens and decides what the identified user may do.",
      items: [
        { label: "Federation and SSO", sub: "OIDC, SAML: log in once, trusted by many applications", tone: "violet" },
        { label: "Tokens and sessions", sub: "access, refresh and ID tokens; session cookies (12.2)", tone: "accent" },
        { label: "Authentication", sub: "passwords, MFA, passkeys (WebAuthn), mTLS for services", tone: "good" },
        { label: "Identity store", sub: "users, credentials, groups: a database, LDAP, an identity provider", tone: "teal" }
      ] },

    { t: "p", text: "If you do store passwords, the store will eventually leak — a backup, an injection, an insider — and what matters then is how fast an attacker can test guesses against the hashes. A general-purpose hash is designed to be fast, which is exactly wrong here. Measured on one CPU core:" },

    { t: "code", lang: "python", title: "passwords.py — guesses per second against three hashes", code: `import hashlib, os, time

def rate(fn, seconds=1.0):
    n, start = 0, time.perf_counter()
    while time.perf_counter() - start < seconds: fn(b"guess%d" % n); n += 1
    return n / (time.perf_counter() - start)

salt = os.urandom(16)
hashes = {
    "SHA-256 (fast)": lambda p: hashlib.sha256(p).digest(),
    "PBKDF2-SHA256, 600k rounds": lambda p: hashlib.pbkdf2_hmac("sha256", p, salt, 600_000),
    "scrypt, n=2^15, r=8 (32 MB)": lambda p: hashlib.scrypt(p, salt=salt, n=2**15, r=8, p=1, maxmem=64 * 2**20),
}
SPACE = 62 ** 8                                       # every 8-character password of letters and digits
print(f"{'hash':<28} {'guesses/s, one core':>20} {'try all 8-char passwords':>26}")
for name, fn in hashes.items():
    r = rate(fn)
    years = SPACE / r / 3600 / 24 / 365
    print(f"{name:<28} {r:>20,.0f} {years:>21,.0f} years")
print("(one CPU core; attackers use thousands of GPU cores, which helps the fast hash far more than the slow ones)")`,
      out: `hash                          guesses/s, one core   try all 8-char passwords
SHA-256 (fast)                          1,408,495                     5 years
PBKDF2-SHA256, 600k rounds                      6             1,238,746 years
scrypt, n=2^15, r=8 (32 MB)                    10               686,327 years
(one CPU core; attackers use thousands of GPU cores, which helps the fast hash far more than the slow ones)` },

    { t: "p", text: "One core tried over a million SHA-256 guesses a second; a single modern GPU computes billions, enough to try every 8-character alphanumeric password in hours. PBKDF2 with 600,000 iterations and scrypt allowed about ten guesses a second per core — some 100,000 times slower, which is the point. scrypt and **Argon2id** are also **memory-hard**: each guess needs tens of megabytes, which GPUs cannot provide cheaply in parallel. Every password gets its own random **salt**, so identical passwords hash differently and precomputed tables are useless." },

    { t: "callout", kind: "trap", title: "Encryption is not hashing, and MFA is not optional",
      body: [
        { t: "p", text: "Encrypted passwords can be decrypted by whoever obtains the key, which usually leaks with the data. Hash them with Argon2id, scrypt or bcrypt, tuned so one verification takes tens to hundreds of milliseconds. And since most account takeovers use passwords reused from other breaches, the strongest control is not the hash but **multi-factor authentication** — ideally phishing-resistant passkeys or hardware keys rather than SMS codes." }
      ] },

    { t: "h2", n: "02", id: "oauth", text: "OAuth 2.0 and OpenID Connect",
      sub: "Delegated access, and identity on top of it" },

    { t: "p", text: "**OAuth 2.0** lets a user grant an application limited access to an API without giving it their password: the application receives an **access token** scoped to what the user approved. **OpenID Connect** is a thin layer on top that adds authentication: an **ID token** — a signed statement from the provider of who logged in, when and how — plus a standard user-info endpoint. Sign-in-with-Google is OIDC; \"allow this app to read your calendar\" is OAuth." },

    { t: "viz", title: "The authorization-code flow with PKCE, for a mobile app",
      caption: "The app never sees the password; the browser talks to the auth server. What comes back through the browser is only a short-lived, single-use code, which is worthless without the verifier that never left the device. The app checks state to ensure the callback answers a login it started, then exchanges code plus verifier for tokens directly with the auth server, and calls the API with the access token.",
      svg: `<svg viewBox="0 0 760 413.5" width="100%" role="img"><defs><marker id="q173363accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q173363good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q173363warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q173363crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q173363violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q173363teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q173363line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<rect x="34.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="90.0" y="32" text-anchor="middle" class="s-label">Mobile app</text>
<rect x="227.33333333333337" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="283.33333333333337" y="32" text-anchor="middle" class="s-label">Browser</text>
<rect x="420.6666666666667" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="476.6666666666667" y="32" text-anchor="middle" class="s-label">Auth server</text>
<rect x="614.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="670.0" y="32" text-anchor="middle" class="s-label">API</text>
<line x1="90.0" y1="42" x2="90.0" y2="401.5" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="283.33333333333337" y1="42" x2="283.33333333333337" y2="401.5" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="476.6666666666667" y1="42" x2="476.6666666666667" y2="401.5" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="670.0" y1="42" x2="670.0" y2="401.5" style="stroke:var(--line);stroke-dasharray:3 4"/>
<rect x="4.0" y="48" width="220.6" height="20" rx="5" style="fill:var(--violet);fill-opacity:.16;stroke:var(--violet)"/>
<text x="114.3" y="62" text-anchor="middle" class="s-sub" style="fill:var(--ink)">make verifier; send only its hash</text>
<line x1="90.0" y1="87" x2="279.33333333333337" y2="87" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q173363accent)"/>
<text x="186.66666666666669" y="81" text-anchor="middle" class="s-sub" style="fill:var(--accent)">open /authorize</text>
<line x1="283.33333333333337" y1="114" x2="472.6666666666667" y2="114" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q173363accent)"/>
<text x="380.0" y="108" text-anchor="middle" class="s-sub" style="fill:var(--accent)">GET /authorize?challenge&amp;state</text>
<line x1="476.6666666666667" y1="141" x2="287.33333333333337" y2="141" style="stroke:var(--ink-3);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q173363line)"/>
<text x="380.0" y="135" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">(login page)</text>
<line x1="283.33333333333337" y1="168" x2="472.6666666666667" y2="168" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q173363accent)"/>
<text x="380.0" y="162" text-anchor="middle" class="s-sub" style="fill:var(--accent)">password + MFA</text>
<line x1="476.6666666666667" y1="195" x2="287.33333333333337" y2="195" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q173363good)"/>
<text x="380.0" y="189" text-anchor="middle" class="s-sub" style="fill:var(--good)">(302 callback?code&amp;state)</text>
<line x1="283.33333333333337" y1="222" x2="94.0" y2="222" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q173363good)"/>
<text x="186.66666666666669" y="216" text-anchor="middle" class="s-sub" style="fill:var(--good)">(code, state)</text>
<rect x="23.099999999999994" y="237" width="133.8" height="20" rx="5" style="fill:var(--teal);fill-opacity:.16;stroke:var(--teal)"/>
<text x="90.0" y="251" text-anchor="middle" class="s-sub" style="fill:var(--ink)">check state matches</text>
<line x1="90.0" y1="276" x2="472.6666666666667" y2="276" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q173363warn)"/>
<text x="283.33333333333337" y="270" text-anchor="middle" class="s-sub" style="fill:var(--warn)">POST /token: code + verifier</text>
<rect x="381.8666666666667" y="291" width="189.6" height="20" rx="5" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn)"/>
<text x="476.6666666666667" y="305" text-anchor="middle" class="s-sub" style="fill:var(--ink)">hash(verifier) == challenge?</text>
<line x1="476.6666666666667" y1="330" x2="94.0" y2="330" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q173363good)"/>
<text x="283.33333333333337" y="324" text-anchor="middle" class="s-sub" style="fill:var(--good)">(access + id + refresh tokens)</text>
<line x1="90.0" y1="357" x2="666.0" y2="357" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q173363accent)"/>
<text x="380.0" y="351" text-anchor="middle" class="s-sub" style="fill:var(--accent)">GET /orders  Bearer &lt;access&gt;</text>
<line x1="670.0" y1="384" x2="94.0" y2="384" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q173363good)"/>
<text x="380.0" y="378" text-anchor="middle" class="s-sub" style="fill:var(--good)">(orders)</text></svg>` },

    { t: "p", text: "Each parameter in that flow exists because of an attack. A minimal authorization server and mobile client, then three attempts to misuse them:" },

    { t: "code", lang: "python", title: "pkce.py — the flow, an intercepted code, a replay and a forged callback", code: `import base64, hashlib, secrets

def b64url(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

class AuthServer:
    """The authorization server: issues one-time codes, and exchanges them for tokens."""
    def __init__(self): self.codes, self.users = {}, {"asha": "correct horse battery staple"}
    def authorize(self, client_id, redirect_uri, state, code_challenge, user, password):
        if self.users.get(user) != password: return None
        code = secrets.token_urlsafe(16)
        self.codes[code] = {"client": client_id, "user": user, "challenge": code_challenge, "redirect": redirect_uri}
        return f"{redirect_uri}?code={code}&state={state}"          # the browser is sent here
    def token(self, client_id, code, code_verifier, redirect_uri):
        grant = self.codes.pop(code, None)                          # a code works once
        if not grant or grant["client"] != client_id or grant["redirect"] != redirect_uri:
            return "400 invalid_grant"
        if b64url(hashlib.sha256(code_verifier.encode()).digest()) != grant["challenge"]:
            return "400 invalid_grant: PKCE verifier does not match"
        return f"200 access_token for {grant['user']} (+ id_token if OIDC, + refresh_token)"

class MobileApp:
    """A public client: it cannot keep a client secret, so it proves possession with PKCE instead."""
    def start_login(self):
        self.state = secrets.token_urlsafe(8)                       # binds the callback to this login (CSRF)
        self.verifier = secrets.token_urlsafe(48)                   # stays on the device
        return b64url(hashlib.sha256(self.verifier.encode()).digest())   # only the hash leaves
    def finish_login(self, auth, callback):
        params = dict(p.split("=") for p in callback.split("?")[1].split("&"))
        if params["state"] != self.state: return "rejected: state mismatch"
        return auth.token("mobile-app", params["code"], self.verifier, "myapp://callback")

auth, app = AuthServer(), MobileApp()
challenge = app.start_login()
callback = auth.authorize("mobile-app", "myapp://callback", app.state, challenge, "asha", "correct horse battery staple")

stolen_code = callback.split("code=")[1].split("&")[0]             # a malicious app also registered myapp://
attacker_guess = secrets.token_urlsafe(48)                         # it saw the code, never the verifier
print("attacker redeems the code :", auth.token("mobile-app", stolen_code, attacker_guess, "myapp://callback"))

app2 = MobileApp(); ch2 = app2.start_login()
cb2 = auth.authorize("mobile-app", "myapp://callback", app2.state, ch2, "asha", "correct horse battery staple")
print("real app redeems its code :", app2.finish_login(auth, cb2))
print("same code, second time    :", auth.token("mobile-app", cb2.split("code=")[1].split("&")[0], app2.verifier, "myapp://callback"))
print("forged callback (CSRF)    :", app2.finish_login(auth, "myapp://callback?code=xyz&state=attacker"))`,
      hl: [14, 17, 24, 25, 26],
      out: `attacker redeems the code : 400 invalid_grant: PKCE verifier does not match
real app redeems its code : 200 access_token for asha (+ id_token if OIDC, + refresh_token)
same code, second time    : 400 invalid_grant
forged callback (CSRF)    : rejected: state mismatch` },

    { t: "dl", items: [
      { term: "code_verifier / code_challenge (PKCE)", def: "A malicious app that registered the same custom URL scheme can receive the redirect and steal the code. Without the verifier, which only the real app holds, the code cannot be exchanged — the first line of the output. PKCE is now recommended for every client, not only mobile and single-page apps." },
      { term: "Single-use, short-lived codes", def: "A code that has been redeemed is gone, so a replay fails, and an unused code expires in about a minute." },
      { term: "state", def: "A random value the app generates and checks on the callback. Without it, an attacker can feed the app a callback carrying the attacker's own code, logging the victim into the attacker's account (login CSRF)." },
      { term: "Exact redirect URI", def: "The auth server only redirects to pre-registered URIs, compared exactly, so codes cannot be sent to an attacker's site." }
    ] },

    { t: "table", head: ["Grant", "Who uses it", "Status"], rows: [
      ["Authorization code + PKCE", "web apps, SPAs, mobile and desktop apps", "the default for anything with a user"],
      ["Client credentials", "service to service, no user involved", "use with mTLS or private-key auth where possible"],
      ["Device code", "TVs, CLIs, devices without a browser", "the user approves on another device"],
      ["Refresh token", "renewing access without a new login", "rotate on use; detect reuse (12.2)"],
      ["Implicit", "old SPAs: token returned in the URL", "deprecated — tokens leak through history and logs"],
      ["Resource owner password", "app collects the user's password", "deprecated — defeats the point of OAuth"]
    ] },

    { t: "h2", n: "03", id: "authz", text: "What may you do?",
      sub: "Roles, attributes and relationships" },

    { t: "diagram", kind: "compare", title: "Three authorisation models",
      caption: "Most systems combine them: roles for coarse access (staff, admin), relationships for sharing (this document, this team's projects), attributes for context (region, time, device posture). The important architectural decision is to centralise the policy — one service or library, tested — rather than scattering if-statements.",
      columns: [
        { title: "RBAC: roles", tone: "accent", items: ["user → role → permissions", "simple, auditable", "role explosion when roles must vary per resource", "admin, editor, viewer"] },
        { title: "ABAC: attributes", tone: "warn", items: ["policy over user, resource, environment", "fine-grained, contextual", "harder to audit: who can see this?", "OPA / Rego, Cedar"] },
        { title: "ReBAC: relationships", tone: "violet", items: ["access follows a graph of relations", "sharing, groups, nested folders", "needs a fast graph-check service", "Zanzibar, SpiceDB, OpenFGA"] }
      ] },

    { t: "callout", kind: "insight", title: "Google Zanzibar",
      body: [
        { t: "p", text: "Google's authorisation system for Drive, YouTube and other products stores permissions as relationship tuples — doc:readme#viewer@user:alice — with rules such as \"editors are viewers\" and \"viewers of a folder are viewers of its documents\". It answers millions of checks per second with low latency, and carries consistency tokens (zookies) so a check never uses permission data older than the content it protects. SpiceDB and OpenFGA are open-source systems built on the same model; the exercise builds a small version." }
      ] },

    { t: "exercise", kind: "Challenge", title: "A relationship-based permission check",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "Store permissions as Zanzibar-style tuples — (object, relation, subject) — where a subject is a user, a wildcard, or a userset such as `group:finance#member`. Implement `check(object, relation, user)` with three rules: usersets are expanded recursively (nested groups); stronger relations imply weaker ones (owner → editor → viewer); and relations are inherited from a document's parent folder." }
      ],
      requirements: [
        "Tuples for groups, nested groups, a folder, a document and a public document",
        "Recursive userset expansion with a depth guard against cycles",
        "Implied relations and inheritance through a parent relation",
        "Checks that cover each rule, including a user who must be denied"
      ],
      hint: "check(doc, viewer, u) is true if a tuple grants it directly or through a userset, or check(doc, editor, u) is true, or check(parent_folder, viewer, u) is true.",
      solution: { lang: "python", title: "rebac_ex.py",
        code: `# Relationship tuples, as in Google's Zanzibar: (object, relation, subject). A subject may be a user,
# or a set of users written "object#relation" (everyone with that relation on that object).
TUPLES = {
    ("group:finance", "member", "user:asha"),
    ("group:finance", "member", "group:auditors#member"),          # nested group
    ("group:auditors", "member", "user:ben"),
    ("folder:q3", "viewer", "group:finance#member"),
    ("folder:q3", "owner", "user:chen"),
    ("doc:forecast", "parent", "folder:q3"),
    ("doc:forecast", "editor", "user:dara"),
    ("doc:public-faq", "viewer", "user:*"),                       # anyone
}
# Rewrites: what each relation implies. viewer <- editor <- owner, and viewers of a doc's parent folder.
IMPLIED = {"viewer": ["editor"], "editor": ["owner"]}
INHERIT = {"viewer": "parent", "editor": "parent", "owner": "parent"}

def check(obj, rel, user, depth=0):
    if depth > 10: return False                                    # guard against cycles
    for o, r, subject in TUPLES:
        if o != obj or r != rel: continue
        if subject in (user, "user:*"): return True
        if "#" in subject:                                         # a userset: recurse into it
            s_obj, s_rel = subject.split("#")
            if check(s_obj, s_rel, user, depth + 1): return True
    for stronger in IMPLIED.get(rel, []):                          # an editor can view, an owner can edit
        if check(obj, stronger, user, depth + 1): return True
    via = INHERIT.get(rel)
    for o, r, parent in TUPLES:                                    # same relation on the parent folder
        if o == obj and r == via and check(parent, rel, user, depth + 1): return True
    return False

for obj, rel, user in [("doc:forecast", "viewer", "user:asha"),    # finance member -> folder viewer -> doc
                       ("doc:forecast", "viewer", "user:ben"),     # auditor -> finance -> ...
                       ("doc:forecast", "editor", "user:ben"),
                       ("doc:forecast", "viewer", "user:dara"),    # editor implies viewer
                       ("doc:forecast", "editor", "user:chen"),    # owner of the parent folder
                       ("doc:forecast", "viewer", "user:eve"),
                       ("doc:public-faq", "viewer", "user:eve")]:
    print(f"can {user:<10} {rel:<6} {obj:<16} -> {check(obj, rel, user)}")`,
        out: `can user:asha  viewer doc:forecast     -> True
can user:ben   viewer doc:forecast     -> True
can user:ben   editor doc:forecast     -> False
can user:dara  viewer doc:forecast     -> True
can user:chen  editor doc:forecast     -> True
can user:eve   viewer doc:forecast     -> False
can user:eve   viewer doc:public-faq   -> True`,
        notes: [
          { t: "p", text: "Asha can view the forecast through finance membership and the folder; Ben through a nested group — auditors are finance members — but only as a viewer, not an editor; Dara because editing implies viewing; Chen because owning the folder makes him an editor of its documents; Eve only the public page. Every grant is explainable by following tuples, which is ReBAC's main practical advantage: \"who can see this?\" has an answer." },
          { t: "p", text: "Production systems add what this omits: caching and indexing so a check is a few milliseconds even through deep groups, consistency tokens so a just-revoked share is honoured, and reverse queries (\"list everything Asha can see\") for search results, which naive recursion cannot answer efficiently." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a password database and a fast hash",
      body: [
        { t: "p", text: "**Symptom.** A forum's database backup was found on a public file share. Within a week, a large share of its users' passwords appeared in plain text on cracking forums, and several users reported their email and bank accounts being accessed." },
        { t: "p", text: "**Mechanism.** Passwords were stored as unsalted, single-round MD5 hashes. Identical passwords shared hashes, so common ones were recovered from precomputed tables instantly, and GPUs tested billions of guesses a second against the rest — the first line of passwords.py, with the attacker's hardware. Users who reused passwords lost far more than their forum account." },
        { t: "p", text: "**Fix.** All sessions were revoked and passwords reset; storage moved to Argon2id with per-user salts, with legacy hashes wrapped and upgraded at next login; MFA was offered and then required for moderators; and backups were encrypted with keys held in a separate account. Breached-password checks now reject passwords that appear in known leaks." }
      ] }
  ],

  takeaways: [
    "**Authentication** establishes who is calling; **authorisation** decides what they may do — and most applications should delegate the former to an identity provider.",
    "Hash passwords with a **slow, salted, memory-hard** function: measured, SHA-256 allowed **~1.3 million guesses a second** on one core, PBKDF2 and scrypt about **ten**.",
    "**MFA**, ideally phishing-resistant passkeys, stops most account takeovers that start with reused passwords.",
    "**OAuth 2.0** delegates scoped API access with an access token; **OIDC** adds authentication with a signed **ID token**.",
    "Use the **authorization-code flow with PKCE** for every client with a user; implicit and password grants are deprecated.",
    "**PKCE** made a stolen code useless; **single-use codes** stopped a replay; **state** rejected a forged callback (login CSRF).",
    "Use **client credentials** for service-to-service calls and **device code** for devices without a browser.",
    "**RBAC** for coarse roles, **ABAC** for context, **ReBAC** for sharing; centralise the policy rather than scattering checks.",
    "A Zanzibar-style check answered every case through **tuples, usersets, implied relations and inheritance** — and can explain each grant."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why should passwords be hashed with Argon2id or scrypt rather than SHA-256?",
        options: ["SHA-256 is broken and produces collisions", "They are deliberately slow and memory-hard, so each guess costs an attacker far more — about ten guesses a second per core instead of over a million", "They are reversible, so passwords can be recovered", "They do not need salts"],
        answer: 1,
        why: "Password hashing needs to be expensive to brute-force, and general-purpose hashes are built for speed. SHA-256 is not broken for collisions in this sense; password hashes must never be reversible; and they all need per-user salts." },

      { stem: "A malicious app registers the same custom URL scheme as your mobile app and intercepts the authorization code. What stops it from getting tokens?",
        options: ["The state parameter", "PKCE: exchanging the code requires the code_verifier, which never left the real app", "HTTPS", "The access token's expiry"],
        answer: 1,
        why: "The code alone is not enough: the token endpoint checks that the verifier hashes to the challenge sent at the start, and only the real app has it. state protects against forged callbacks, HTTPS does not help when the redirect itself is delivered to the wrong app, and expiry does not prevent the exchange." },

      { stem: "What does OpenID Connect add to OAuth 2.0?",
        options: ["Encryption of access tokens", "Authentication: a signed ID token describing who logged in, and a standard user-info endpoint", "A replacement for refresh tokens", "Role-based access control"],
        answer: 1,
        why: "OAuth 2.0 is about delegated authorisation — access tokens for APIs. OIDC standardises login on top of it with the ID token and identity claims. It does not encrypt access tokens, replace refresh tokens or define authorisation models." },

      { stem: "Users share documents with individuals, teams and nested teams, and documents inherit access from folders. Which authorisation model fits best?",
        options: ["RBAC with one role per document", "ReBAC: permissions as relationships, with nested groups and inheritance evaluated as a graph", "No authorisation; rely on obscure URLs", "ABAC with only time-of-day rules"],
        answer: 1,
        why: "Sharing structures are graphs of relationships, which is exactly what ReBAC models. Per-document roles explode, unguessable URLs are not access control, and attributes such as time of day do not express who shared what with whom." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Security questions reward precise mechanisms over buzzwords.",
    questions: [
      { level: "core",
        q: "Walk me through the OAuth 2.0 authorization-code flow with PKCE.",
        strong: "A strong answer covers every hop and why each parameter exists.",
        answer: [
          { t: "p", text: "The client creates a random code_verifier and sends its SHA-256 hash as the code_challenge, plus a random state, when redirecting the browser to the authorization server. The user authenticates there — the client never sees the password — and approves scopes. The server redirects back to the exact registered URI with a short-lived, single-use code and the state." },
          { t: "p", text: "The client checks state against the one it stored, preventing forged callbacks, then exchanges the code plus the verifier at the token endpoint over a back channel. The server checks the verifier hashes to the challenge, so an intercepted code is useless, and returns an access token, a refresh token, and with OIDC an ID token. The client calls APIs with the access token as a bearer token." }
        ] },

      { level: "core",
        q: "How should passwords be stored?",
        strong: "A strong answer names algorithms, salting, tuning and the surrounding controls.",
        answer: [
          { t: "p", text: "With a slow, salted, memory-hard password hash — Argon2id preferably, or scrypt or bcrypt — tuned so one verification takes tens to hundreds of milliseconds on the server. A unique random salt per user defeats precomputed tables and makes identical passwords look different. Never encryption, which can be reversed with a key." },
          { t: "p", text: "Around it: rate limiting and lockout on login, breached-password checks at registration, MFA, and a migration path that rehashes legacy hashes at the next login. Better still for most applications is not storing passwords at all and delegating to an identity provider." }
        ] },

      { level: "advanced",
        q: "How would you design authorisation for a document-sharing product at scale?",
        strong: "A strong answer chooses ReBAC, centralises it, and addresses latency, consistency and listing.",
        answer: [
          { t: "p", text: "Relationship-based access control, as in Zanzibar: tuples for direct shares, group membership and folder hierarchy, with rewrite rules such as owner implies editor implies viewer, and inheritance from parent folders. A central authorisation service — SpiceDB, OpenFGA, or built in-house — answers check requests for every service." },
          { t: "p", text: "For scale: cache and precompute hot group expansions, replicate close to callers, and keep checks in single-digit milliseconds. For correctness, consistency tokens so a check after a revocation never uses stale data. And reverse indexes for listing what a user can access, because search and listing pages cannot call check on every candidate document." }
        ] }
    ]
  }
});
