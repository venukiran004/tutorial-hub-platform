/* ============================================================================
   LESSON 4.2 — Identity and Authentication
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "Lesson 1.1 said MCP does not carry a user, and that is true of the protocol and **not the whole story**. The HTTP transports have an authentication layer, and an authenticated request's token carries a `subject` and a `claims` dictionary that a tool can read with one call. So the honest statement is narrower and more useful: **identity is available if you are on HTTP and you put it there — and it is unavailable over stdio, where there is nothing to put it in.**",

  objectives: [
    "State precisely what the protocol does and does not carry",
    "Implement a TokenVerifier and read the identity it produces",
    "Reach the authenticated subject from inside a tool",
    "Say why a user id as a tool parameter is a vulnerability",
    "Choose an identity strategy for a stdio server, where there is none"
  ],

  prerequisites: ["3.2", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "The structural problem, stated once", id: "problem" },

    {"kind": "flow", "title": "The wrong fix, which reads as reasonable API work", "caption": "**`get_orders(user_id: str)` is not identity, it is a parameter** — and a parameter is something the model fills in, from a conversation an attacker may be participating in. Any user, account or tenant id in a signature that decides whose data comes back makes your access control a prompt-injection target. **It is the most common serious mistake in MCP server design**, precisely because it looks like ordinary API design, and the server feels finished.", "cols": 3, "nodes": [{"id": "d", "label": "A server holds its own credentials", "sub": "one identity, serving everyone", "tone": "warn"}, {"id": "n", "label": "Nothing in tools/call says who prompted it", "sub": "the protocol carries no user", "tone": "warn"}, {"id": "p", "label": "So: get_orders(user_id: str)", "sub": "make the caller say who they are", "tone": "crit"}, {"id": "m", "label": "But the MODEL fills that in", "sub": "from a conversation it does not control", "tone": "crit"}, {"id": "f", "label": "If a tool takes an id that decides whose data", "sub": "it has no access control at all", "tone": "crit"}], "edges": [["d", "n"], ["n", "p"], ["p", "m"], ["m", "f"]], "t": "diagram", "id": "dg-4_2-01-0"},

    { t: "p", text: "A server holds its own credentials. Two different people talking to your agent reach the server through the same connection, with the same token if there is one, and **nothing in a `tools/call` message says who prompted it.**" },

    { t: "p", text: "So the default situation for every MCP server is: one identity, serving everyone. That is fine for a rate table and unacceptable for anything touching a person's data, and the distance between those two cases is the whole lesson." },

    { t: "callout", kind: "trap", title: "The wrong fix, which looks like the right one",
      body: [
        { t: "p", text: "The obvious move is to make the caller say who they are: `get_orders(user_id: str)`. **That is not identity, it is a parameter** — and a parameter is something the model fills in, from a conversation an attacker may be participating in." },
        { t: "p", text: "Any user id, account id or tenant id in a tool signature is a value the model can be persuaded to change. It makes your access control a prompt-injection target, and it is the most common serious mistake in MCP server design because it reads as perfectly reasonable API work. **If a tool takes an identifier that decides whose data comes back, it has no access control at all.**" }
      ] },

    { t: "h2", n: "02", text: "What the SDK's auth layer carries", id: "layer" },

    {"kind": "trace", "title": "A one-method protocol, and the two fields that carry identity", "caption": "**`subject` is who the token was issued for and `claims` is an arbitrary dictionary** — tenant, roles, email — which is where identity actually lives. Note the distinction `client_id` draws: it identifies the *application*, so a bearer token shared by one client authenticates that client and not a person. **`required_scopes` is enforced before a tool runs**, so a token lacking the scope never reaches your code, and returning `None` from the verifier is the rejection.", "left": "AccessToken field", "codeW": 170, "vars": ["what it is", "use it for"], "steps": [{"code": "subject", "state": ["who the token was issued for", "THE user - per-user data"], "tone": "violet"}, {"code": "claims", "state": ["an arbitrary dictionary", "tenant, roles, email"], "changed": [0, 1], "tone": "violet"}, {"code": "client_id", "state": ["the application, not the person", "which app is calling"], "changed": [0, 1], "tone": "warn"}, {"code": "scopes", "state": ["coarse permissions", "finance.read vs finance.write"], "changed": [0, 1], "tone": "accent"}, {"code": "expires_at", "state": ["expiry", "check it, plus the audience"], "changed": [0, 1], "tone": "accent"}, {"code": "verify_token returning None", "state": ["the rejection", "401, before any tool"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-4_2-02-1"},

    { t: "p", text: "On the HTTP transports there is an authentication layer, and the object it produces is worth reading field by field, because it answers the identity question directly." },

    { t: "code", lang: "python", title: "the contract, introspected",
      code: `import inspect
from mcp.server.auth.provider import TokenVerifier, AccessToken

print("TokenVerifier methods:", [m for m in dir(TokenVerifier) if not m.startswith("_")])
print("verify_token:", inspect.signature(TokenVerifier.verify_token))
print("AccessToken fields:", {k: str(v.annotation) for k, v in AccessToken.model_fields.items()})`,
      out: `TokenVerifier methods: ['verify_token']
verify_token: (self, token: str) -> mcp.server.auth.provider.AccessToken | None

AccessToken fields: {'token': 'str', 'client_id': 'str', 'scopes': 'list[str]',
                     'expires_at': 'int | None', 'resource': 'str | None',
                     'subject': 'str | None', 'claims': 'dict[str, Any] | None'}`,
      caption: "**`TokenVerifier` is a one-method protocol** — take a token string, return an `AccessToken` or `None`. And the `AccessToken` has the two fields that matter: **`subject`**, which is who the token was issued for, and **`claims`**, an arbitrary dictionary. That is where identity lives." },

    { t: "code", lang: "python", title: "a verifier, and wiring it in",
      code: `from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from mcp.server.fastmcp import FastMCP

class OurTokens(TokenVerifier):
    async def verify_token(self, token: str) -> AccessToken | None:
        claims = await validate_jwt(token)          # signature, expiry, audience
        if claims is None:
            return None                              # -> 401, before any tool
        return AccessToken(
            token=token,
            client_id=claims["azp"],
            scopes=claims.get("scope", "").split(),
            subject=claims["sub"],                   # <- the user
            claims=claims,                           # <- tenant, roles, email
            expires_at=claims["exp"],
        )

mcp = FastMCP(
    "finance",
    token_verifier=OurTokens(),
    auth=AuthSettings(
        issuer_url="https://auth.example.com",
        resource_server_url="https://mcp.example.com",
        required_scopes=["finance.read"],
    ),
)`,
      caption: "`required_scopes` is enforced before a tool runs, so a token without `finance.read` never reaches your code. **Returning `None` is the rejection** — and because the check is in the transport layer, an unauthenticated caller does not see the handshake or the tool list, which is the property lesson 3.2 wanted from middleware." },

    { t: "h2", n: "03", text: "Reading the caller inside a tool", id: "reading" },

    {"kind": "flow", "title": "Identity from context, never from the signature", "caption": "**`get_access_token()` takes no arguments** — it reads the verified token from the current request's context, the way a web framework exposes the current user. Note what the tool signature does not have: no `user_id`, so the model cannot influence whose orders come back because it is never asked. **And `limit` is still a parameter, correctly.** The test for whether something belongs in the signature is whether a hostile value would be a security problem or merely a strange request.", "cols": 3, "nodes": [{"id": "t", "label": "A signed token, verified in transport", "sub": "signature, expiry, audience", "tone": "good"}, {"id": "c", "label": "get_access_token() - no arguments", "sub": "read from request context", "tone": "violet"}, {"id": "s", "label": "token.subject into the query", "sub": "no user_id in the signature", "tone": "good"}, {"id": "d", "label": "The description states the boundary", "sub": "'Not other users'", "tone": "good"}, {"id": "l", "label": "limit stays a parameter", "sub": "a hostile value is just odd", "tone": "accent"}], "edges": [["t", "c"], ["c", "s"], ["s", "d"], ["c", "l"]], "t": "diagram", "id": "dg-4_2-03-2"},

    { t: "code", lang: "python", title: "one function, no arguments",
      code: `from mcp.server.auth.middleware.auth_context import get_access_token

@mcp.tool()
async def my_orders(limit: int = 20) -> list[dict]:
    """Returns the authenticated caller's own orders. Not other users'."""
    token = get_access_token()
    if token is None or token.subject is None:
        return {"error": "this tool requires an authenticated caller",
                "retryable": False}

    # The identity came from a signed token, not from an argument.
    return await db.orders_for(subject=token.subject, limit=limit)`,
      out: `get_access_token: () -> mcp.server.auth.provider.AccessToken | None
  doc: Get the access token from the current context.`,
      caption: "**`get_access_token()` takes no arguments** — it reads the authenticated token from the current request's context, the same way a web framework exposes the current user. Note what the tool signature does *not* have: no `user_id`. The model cannot influence whose orders come back, because it is never asked." },

    { t: "callout", kind: "good", title: "This is the shape to copy",
      body: [
        { t: "p", text: "The identity comes from a **signed token verified in the transport layer**, is read from **context** rather than from an argument, and the tool's own description states the boundary — *“Not other users'”* — so a model has no reason to try. All three parts matter, and the first is the one that makes it a control rather than a convention." },
        { t: "p", text: "And `limit` is still a parameter, correctly: it is a preference the caller may express. **The test for whether something belongs in the signature is whether a hostile value would be a security problem or merely a strange request.**" }
      ] },

    { t: "h2", n: "04", text: "Still not authorisation", id: "authorisation" },

    {"kind": "layers", "title": "Identity is decoration unless it reaches the predicate", "caption": "**A tool that reads `token.subject` and then queries with an admin credential has established who is calling and asked for the data anyway.** The middle layer is correct and depends on every query being written correctly forever; the bottom layer is what survives a mistake — and the difference matters because a server accretes tools, and the twentieth will be written by someone who has not read this lesson. **The audience check in the top layer is the one people omit**, and it is what stops a token minted for another service being replayed at yours.", "items": [{"label": "Authentication: who is calling", "sub": "signature, expiry, AUDIENCE - the omitted one", "tone": "good", "side": "the verifier"}, {"label": "Authorisation: may they do this", "sub": "scopes answer coarse questions only", "tone": "accent", "side": "scopes"}, {"label": "The subject in the query predicate", "sub": "correct, and depends on remembering forever", "tone": "warn", "side": "per query"}, {"label": "Row-level security in the database", "sub": "survives a forgotten predicate - and one will be", "tone": "violet", "side": "enforcement"}], "t": "diagram", "id": "dg-4_2-04-3"},

    { t: "p", text: "Having a verified subject is necessary and is not the end. Lesson 2.3's three layers apply here with the identity filled in." },

    { t: "dl", items: [
      ["Authentication: who is calling", "The token verifier. Done, if it checks signature, expiry and audience — and the audience check is the one people omit, which lets a token minted for another service be replayed at yours."],
      ["Authorisation: may they do this", "Scopes get you coarse-grained answers (`finance.read` against `finance.write`), and that is as far as a scope can go. Whether *this* subject may read *that* order is a question about your data, not about the token."],
      ["Enforcement: and the query agrees", "The database must also refuse. A tool that reads `token.subject` and then queries with an admin credential has established who is calling and asked for the data anyway — the identity is decoration unless it reaches the predicate."]
    ] },

    { t: "code", lang: "python", title: "the subject reaching the query, or not",
      code: `# Decoration: identity established, then ignored.
token = get_access_token()
rows = await db.fetch("SELECT * FROM orders WHERE id = $1", order_id)   # any order

# A control: the identity is in the predicate.
rows = await db.fetch(
    "SELECT * FROM orders WHERE id = $1 AND customer_subject = $2",
    order_id, token.subject,
)

# Better: the database enforces it whatever the query says.
#   row-level security keyed on the connection's principal, so a forgotten
#   predicate cannot leak -- which is the point, since one will be forgotten.`,
      caption: "The middle version is correct and depends on every query being written correctly forever. **The last version is the one that survives a mistake**, and the difference matters because a server grows tools and the twentieth will be written by someone who has not read this lesson." },

    { t: "h2", n: "05", text: "stdio, where there is no identity", id: "stdio" },

    {"kind": "tree", "title": "Over stdio there is nothing to put identity in", "caption": "**All of the above needs an HTTP transport, because the token arrives in a header.** Over stdio the server runs as whoever launched it, with their credentials, and that *is* the identity — which is usually fine, because a stdio server has exactly one user. **The mistake is not a single identity; it is a single identity serving per-user data.** A server exposing the same data to everyone is a perfectly good design: say so in the instructions, keep the tools read-only, and nobody has to audit it for identity handling.", "root": {"label": "Does the data differ per caller?", "sub": "the question that decides the architecture", "tone": "accent", "children": [{"label": "No - the same for everyone", "sub": "public rates, a policy corpus, a schema", "tone": "good", "children": [{"label": "One service identity is correct", "sub": "say so in instructions; keep tools read-only", "tone": "good"}]}, {"label": "Yes, and it is one user's machine", "sub": "a local stdio server", "tone": "accent", "children": [{"label": "The process identity IS the user", "sub": "an env var for their API token", "tone": "accent"}]}, {"label": "Yes, and there are many users", "sub": "a multi-user service", "tone": "violet", "children": [{"label": "HTTP, with a token verifier", "sub": "stdio cannot express this", "tone": "violet"}, {"label": "Tenant from claims, in the predicate", "sub": "never from a parameter", "tone": "teal"}]}]}, "t": "diagram", "id": "dg-4_2-05-4"},

    { t: "p", text: "All of the above requires an HTTP transport, because the token arrives in a header. **Over stdio there is no header and no authentication layer** — the server runs as whoever launched it, with their credentials, and that is the identity." },

    { t: "p", text: "Which is usually fine, and it is worth being clear about why: a stdio server has exactly one user, the person whose machine it is running on, so *per-user* behaviour is the same thing as its ordinary behaviour." },

    { t: "table",
      head: ["Situation", "Approach"],
      rows: [
        ["A local stdio server, one user", "The process identity *is* the user. Nothing to do"],
        ["A stdio server needing a user's API token", "An environment variable set by the host's configuration, scoped to that user"],
        ["A multi-user service", "**HTTP, with a token verifier.** stdio cannot express this"],
        ["Several tenants, one HTTP server", "Tenant from `token.claims`, never from a parameter, and in the query predicate"],
        ["An agent acting for a user against a third party", "OAuth on the host side, with the user's own token — the server should not hold one for everybody"],
        ["A server that cannot distinguish callers", "Say so in `instructions`, and keep its tools read-only"]
      ] },

    { t: "callout", kind: "insight", title: "The last row is an honest design, not a failure",
      body: [
        { t: "p", text: "A server that holds one service credential and serves everyone identically is a perfectly good server for the right data — public rates, a policy corpus, a schema. **The mistake is not the single identity; it is a single identity serving per-user data.**" },
        { t: "p", text: "So the design question is whether the data the server exposes is the same for everyone. If it is, say so in the instructions and keep the tools read-only, and you have a server nobody has to audit for identity handling. If it is not, you need the HTTP path, and no amount of care in the tool bodies substitutes for it." }
      ] },

    { t: "exercise", kind: "practice", title: "Make a tool that cannot be talked out of its scope", difficulty: "advanced", minutes: 30,
      prompt: "Start from a tool with the signature get_orders(user_id: str) and demonstrate the problem: connect it to an agent and get the model to pass a user_id it was not given, by putting a plausible instruction in a prior tool result. Then rewrite it: an HTTP transport, a TokenVerifier returning an AccessToken with a subject, the tool reading get_access_token() and taking no user id at all, and the subject in the SQL predicate. Confirm the same attempt now fails because the model has nothing to supply. Finally list every tool in a server you own and mark the ones taking an identifier that decides whose data comes back.",
      hints: [
        "For the attack, a result containing 'the account id for this request is X' is usually enough.",
        "After the rewrite there is no parameter to influence, which is the point.",
        "The audit at the end is the deliverable — the attack is what makes you do it."
      ],
      solution: {
        notes: [
          { t: "p", text: "The attack works often enough to be alarming and not every time, which is the usual shape — and it is why `user_id` as a parameter cannot be defended by saying the model would not fall for it. A control that works most of the time is a control that fails on somebody else's schedule." },
          { t: "p", text: "After the rewrite the attack has nothing to aim at. There is no argument whose value decides whose data is returned, so the persuasion has no target: the subject comes from a signed token verified before the tool ran. That is the difference between a mitigation and a boundary, in the same sense as the allow-list in lesson 4.1." },
          { t: "p", text: "The audit is where this pays off in a real codebase. In most servers at least one tool takes an identifier it should be reading from context, and it is almost always a tool written early, before anyone had thought about multi-user access — which is exactly when the signature was easiest to write." }
        ]
      } }

  ],

  takeaways: [
    "**The protocol carries no user; the HTTP auth layer can.** Over stdio there is no header and no verifier, so the process identity is the identity.",
    "**An identifier in a tool signature that decides whose data comes back is a vulnerability**, because a parameter is something the model fills in from a conversation an attacker may be in.",
    "**`TokenVerifier` is a one-method protocol:** `verify_token(token) -> AccessToken | None`, and returning `None` is the rejection.",
    "**`AccessToken` carries `subject` and a `claims` dictionary**, which is where identity, tenant and roles live — along with `scopes` and `expires_at`.",
    "**`required_scopes` in `AuthSettings` is enforced before a tool runs**, so a token lacking the scope never reaches your code.",
    "**Because the check is in the transport layer, an unauthenticated caller never sees the handshake or the tool list** — the property lesson 3.2 wanted from middleware.",
    "**`get_access_token()` takes no arguments** and reads the verified token from request context, the way a web framework exposes the current user.",
    "**The test for a tool parameter:** would a hostile value be a security problem, or merely a strange request? `limit` is fine; `user_id` is not.",
    "**Check the audience in the token**, or a token minted for another service can be replayed at yours.",
    "**Scopes answer coarse questions only.** Whether this subject may read that order is a question about your data.",
    "**Identity is decoration unless it reaches the query predicate**, and row-level security is what survives the twentieth tool being written by someone who has not read this.",
    "**One service identity serving everyone is a fine design for data that is the same for everyone.** The mistake is a single identity serving per-user data."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A tool is declared `get_orders(user_id: str)` and filters on that argument. What is wrong?",
        options: [
          "Nothing, as long as the user_id is validated",
          "A parameter is a value the model supplies from a conversation an attacker may be participating in — so the access control is a prompt-injection target rather than a control",
          "The parameter should be an integer",
          "It should be a resource rather than a tool"
        ],
        answer: 1,
        why: "This is the most common serious mistake in MCP server design, because it reads as perfectly reasonable API work. The fix is that the identity must come from a verified token read out of request context, so there is no argument for the persuasion to aim at."
      },
      {
        stem: "Which fields of `AccessToken` carry the caller's identity?",
        options: [
          "`token` and `client_id`",
          "`subject`, for who the token was issued to, and `claims`, an arbitrary dictionary for things like tenant and roles",
          "`scopes` only",
          "None — AccessToken carries no identity"
        ],
        answer: 1,
        why: "`client_id` identifies the application rather than the person, which is the distinction that matters: a bearer token shared by one client application authenticates that application, and `subject` is what makes per-user behaviour possible."
      },
      {
        stem: "A tool reads `token.subject`, logs it, then queries with an admin credential and no predicate on the subject. What has it achieved?",
        options: [
          "Proper per-user access control",
          "Nothing durable — the identity is decoration, because the query would return any row asked for; the subject has to reach the predicate, and ideally the database enforces it",
          "Authentication but not authorisation",
          "Correct behaviour, since the subject is verified"
        ],
        answer: 1,
        why: "It is lesson 2.3's layered point with identity filled in. The predicate version is correct and depends on every query being written correctly forever; row-level security is what survives a forgotten predicate, and one will be forgotten."
      },
      {
        stem: "How do you give a stdio server per-user behaviour?",
        options: [
          "Pass a user id as a tool argument",
          "You do not — there is no header and no auth layer, so the process identity is the identity. A multi-user service needs an HTTP transport with a token verifier",
          "Use the session id as the user id",
          "Read the user from the client's clientInfo"
        ],
        answer: 1,
        why: "A stdio server has exactly one user — the person whose machine it runs on — so per-user behaviour is just its ordinary behaviour. clientInfo is no help either: lesson 2.1 measured the SDK client reporting the name 'mcp' by default."
      },
      {
        stem: "A server exposes public exchange rates and holds one API credential for everyone. Is that a design flaw?",
        options: [
          "Yes — every server needs per-user identity",
          "No. A single identity is fine for data that is the same for everyone; the mistake is a single identity serving per-user data. Say so in the instructions and keep the tools read-only",
          "Only if it uses an HTTP transport",
          "Yes, unless it uses required_scopes"
        ],
        answer: 1,
        why: "Naming it in the instructions is what makes it an honest design rather than an unexamined one, and it means nobody has to audit the server for identity handling. The design question is simply whether the data differs per caller."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you handle per-user data in an MCP server?",
        strong: "The identity cannot be a tool parameter, because a parameter is something the model supplies and can be persuaded to change. On an HTTP transport I implement a TokenVerifier that validates signature, expiry and audience and returns an AccessToken with a subject; the tool reads get_access_token() from context and takes no user id at all; and the subject goes into the query predicate, ideally with row-level security behind it. Over stdio there is no auth layer, so a multi-user service cannot be a stdio server.",
        answer: [
          { t: "p", text: "Rejecting the parameter approach first, with the reason, is the heart of the answer — it is the mistake the question is usually probing for." },
          { t: "p", text: "Naming the audience check shows real JWT experience: it is the one people omit, and it is what stops a token minted for another service being replayed." },
          { t: "p", text: "Ending at row-level security rather than the predicate is the senior answer, because a server accretes tools and the predicate approach depends on everyone remembering forever." }
        ]
      },
      {
        level: "mid",
        q: "Is it true that MCP does not carry identity?",
        strong: "True of the protocol itself and too blunt as a statement. A tools/call message says nothing about who prompted it, but the HTTP transports have an auth layer: a verified token's subject and claims are available inside a tool via get_access_token(). So identity is available if you are on HTTP and you put it there, and genuinely unavailable over stdio, where there is no header to carry it.",
        answer: [
          { t: "p", text: "Correcting the common shorthand with precision, rather than repeating it, is what the question rewards." },
          { t: "p", text: "The stdio distinction is the practically useful half, because it decides an architecture: a multi-user requirement rules out the transport entirely rather than needing care in the tools." }
        ]
      },
      {
        level: "advanced",
        q: "How do you decide whether something should be a tool parameter?",
        strong: "Ask whether a hostile value would be a security problem or merely a strange request. A limit is fine — the worst case is an odd page size. A user id, account id or tenant id that decides whose data comes back is not, because the model fills it in from a conversation an attacker may be in. Anything in that second category belongs in request context, read from a verified token.",
        answer: [
          { t: "p", text: "Having a one-sentence test rather than a list is what makes this usable on a tool nobody has written yet." },
          { t: "p", text: "A strong answer adds that the audit is worth doing on an existing server, because the offending tool is usually an early one — written when the signature was easiest and nobody had thought about multiple users yet." }
        ]
      }
    ]
  }
});
