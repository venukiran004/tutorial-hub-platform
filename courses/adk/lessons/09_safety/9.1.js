/* ============================================================================
   LESSON 9.1 — Authentication, Secrets and Least Privilege
   The auth exports, the credential service contract and the shipped
   implementations are introspected from google-adk 2.9.2
   (scratchpad/adk/g1.py).
   ========================================================================= */
EC.receiveLesson({
  id: "9.1",

  lede: "**An agent has two identities and they are constantly confused.** There is the identity the *application* runs as — a service account with database access and API keys — and the identity of the *person* talking to it, which ADK never checks and never enforces. Every serious security problem in an agent system comes from that gap: a tool acting with the application's authority on behalf of a user who should not have it, or a `user_id` taken from a request body that lets anyone read anyone's data. This lesson is about closing it.",

  objectives: [
    "Distinguish the agent's identity from the user's and say which a tool should act as",
    "Explain why ADK never authenticates the user and what that means for your code",
    "Use the credential service, and know where credentials must not go",
    "Apply least privilege to tools, service accounts and state scopes",
    "Handle multi-tenant data access so that the boundary is enforced below the agent"
  ],

  prerequisites: ["4.8", "5.2"],

  blocks: [

    { t: "h2", n: "01", text: "Two identities", id: "two" },

    { t: "diagram", kind: "compare", title: "Who is acting?",
      caption: "Most incidents are a tool in the left column doing something that needed the right column's authority.",
      columns: [
        { title: "The agent's identity", tone: "accent", items: ["A service account or API key", "Same for every user", "What the deployment runs as (12.2)", "Right for: public data, shared lookups, your own systems"] },
        { title: "The user's identity", tone: "violet", items: ["An OAuth token or an authenticated principal", "Different per person", "Never established by ADK", "Right for: their mailbox, their orders, their files"] }
      ] },

    { t: "callout", kind: "mental", title: "The one-line test",
      body: [{ t: "p", text: "Ask whether two different users calling this tool should get different data. If yes, the tool needs the user's authority, not the application's — and \"the agent will only ask for the right rows\" is not authorisation, it is a hope about a language model. If no, the application's own credential is correct and your only job is making sure the tool cannot be steered somewhere it should not go." }] },

    { t: "h2", n: "02", text: "ADK does not authenticate anyone", id: "no-auth" },

    { t: "p", text: "`run_async(user_id=…, session_id=…)` takes a string. It is not validated, not signed and not checked against anything — it is simply the key under which state, memory and sessions are stored and retrieved. Pass `\"u2\"` and you get user 2's data, whoever you are." },

    { t: "code", lang: "python", title: "The only line that matters",
      code: `# WRONG - the caller chooses whose data to read.
user_id = request.json["user_id"]

# RIGHT - derived from something the caller cannot forge.
user_id = verify_session_cookie(request.cookies["session"]).subject

async for event in runner.run_async(user_id=user_id, session_id=sid, new_message=msg):
    ...`,
      caption: "This is the whole of ADK's identity model. Everything else in this lesson assumes you got this line right." },

    { t: "callout", kind: "trap", title: "And the session id, too",
      body: [{ t: "p", text: "`get_session` is keyed by user and session together, so a leaked session id is not enough on its own — but only if the `user_id` is trustworthy. If both come from the request, a caller supplies someone else's pair and reads their conversation. Store the session id server-side against your own conversation record and look it up from the authenticated user, rather than accepting it from the client." }] },

    { t: "h2", n: "03", text: "The credential service", id: "credentials" },

    { t: "code", lang: "python", title: "What ships",
      code: `import google.adk.auth as A
print(sorted(n for n in dir(A) if n[0].isupper()))

from google.adk.auth.credential_service.base_credential_service import BaseCredentialService
print([n for n in dir(BaseCredentialService) if not n.startswith("_")])` },

    { t: "out", text: `['AuthConfig', 'AuthCredential', 'AuthCredentialTypes', 'AuthScheme', 'AuthSchemeType',
 'BaseAuthProvider', 'OAuth2Auth', 'OpenIdConnectWithConfig']
['load_credential', 'save_credential']
credential services: ['base_credential_service', 'in_memory_credential_service', 'session_state_credential_service']` },

    { t: "p", text: "Two methods and two implementations. A tool that needs the user's OAuth token calls `request_credential` and later `get_auth_response` (lesson 4.8); the service is where the resulting token is kept between turns, so the user is not asked to authorise on every message." },

    { t: "callout", kind: "warn", title: "Read the names carefully",
      body: [{ t: "p", text: "`InMemoryCredentialService` holds tokens in a process dictionary — lost on restart, not shared between replicas, and therefore a prompt to re-authorise every deploy. `SessionStateCredentialService` puts them in session state, which is convenient and means the token now lives in the same dictionary that gets interpolated into instructions and read by every tool and callback. Neither is what you want for a long-lived refresh token in production: that belongs in a secrets manager or an encrypted store, behind a service you implement." }] },

    { t: "h2", n: "04", text: "Where secrets must not go", id: "not-there" },

    { t: "table", head: ["Place", "Why not"],
      rows: [
        ["Session state", "Interpolated into instructions, visible to every tool and callback, and persisted to your session database in plain form"],
        ["A tool's return value", "Becomes an event in the transcript, replayed into every subsequent model request for the rest of the conversation"],
        ["The instruction", "Sent to the provider on every single request, and reproduced in any log of the prompt"],
        ["An agent's own fields", "The agent object is shared across concurrent invocations — one user's token becomes everyone's"],
        ["Plain `env_vars` on a deployment", "Readable in the engine's spec by anyone with console access; use a secret reference (lesson 12.2)"]
      ] },

    { t: "callout", kind: "insight", title: "Anything the model can see, the user can extract",
      body: [{ t: "p", text: "A sufficiently determined user will get the model to repeat its system instruction, and a tool result is in the transcript the model is reading. So the rule is not \"do not show the secret to the user\" — it is \"do not put the secret anywhere the model can read\". Tools should hold credentials in their own closure or fetch them from a secrets manager at call time, and return data, never keys." }] },

    { t: "h2", n: "05", text: "Least privilege, three layers deep", id: "least-privilege" },

    { t: "diagram", kind: "layers", title: "Each layer assumes the one above it failed",
      caption: "This is why an agent with a read-only database role is a fundamentally different risk from one with a write role and a careful prompt.",
      items: [
        { label: "The agent", sub: "give it only the tools its job needs (lesson 4.7)", tone: "accent" },
        { label: "The tool", sub: "a narrow signature — no arbitrary SQL, no arbitrary paths", tone: "good" },
        { label: "The credential", sub: "a role that can only do what the tool needs", tone: "warn" },
        { label: "The data layer", sub: "row-level security keyed by the user, not by the query", tone: "violet" }
      ] },

    { t: "p", text: "The layers matter because each one is a different kind of failure. A prompt injection defeats the instruction. A model mistake defeats the tool's intent. A bug in your predicate defeats the query. What does not get defeated by any of those is a database role that physically cannot write, or row-level security that filters on the authenticated user before your SQL is considered." },

    { t: "code", lang: "python", title: "The shape that survives review",
      code: `def orders_for_user(status: str, tool_context) -> dict:
    """Lists the current user's orders.

    Args:
        status: one of open, shipped, cancelled.
    """
    if status not in {"open", "shipped", "cancelled"}:
        return {"error": f"unknown status {status!r}", "retryable": False}
    # The user id comes from the context, never from an argument.
    return db.query(
        "SELECT id, total, status FROM orders WHERE user_id = %s AND status = %s LIMIT 50",
        (tool_context.user_id, status))`,
      caption: "Three defences in six lines: an enum check, a parameterised query, and a user id the model cannot supply because it is not a parameter." },

    { t: "callout", kind: "trap", title: "Never let the model pass the user id",
      body: [{ t: "p", text: "A tool with a `user_id` parameter is a tool the model can be persuaded to call with somebody else's. It will look reasonable in the declaration and it will work perfectly in testing, because in testing there is one user. Take the identity from `tool_context.user_id`, which came from your authenticated request, and leave it out of the signature entirely — the model does not need to know it exists." }] },

    { t: "h2", n: "06", text: "Multi-tenancy", id: "tenancy" },

    { t: "dl", items: [
      ["app_name separates products, not tenants", "It is part of the storage key, so two apps do not see each other's sessions — but it is configuration, not a security boundary you can vary per request."],
      ["`user:` state is per user, `app:` state is shared by everyone", "A tenant identifier written to `app:` state is visible to every user of the deployment. This is the most common state-scope mistake with a security consequence (lesson 5.2)."],
      ["The database is where tenancy is enforced", "Row-level security or an unavoidable predicate, keyed by the authenticated principal. If the only thing separating tenants is a WHERE clause the model influences, they are not separated."],
      ["Artifacts and memory have the same boundary", "Both are keyed by app and user. A deletion request or an isolation guarantee has to reach all three stores, not just sessions."]
    ] },

    { t: "exercise", kind: "practice", title: "Attack your own agent", difficulty: "advanced", minutes: 26,
      prompt: "Take an agent with a tool that reads records. Write down, then test: (1) can a caller read another user's data by changing the request body? (2) does any tool take a user id, account id or tenant id as a parameter? (3) what can the database credential do beyond what the tools need? (4) if the model were fully compromised and could call any tool with any arguments, what is the worst outcome? Write the four answers as a short threat note and fix whichever you cannot answer well.",
      hints: [
        "Actually send the modified request rather than reading the code and concluding it is fine.",
        "Question 4 is the one that decides whether prompt engineering is a control or a comfort.",
        "Check `app:` state writes for anything tenant-specific."
      ],
      solution: {
        notes: [
          { t: "p", text: "The usual finding on question 1 is that the `user_id` is taken from the client, because that is what every quickstart does and nothing goes wrong until there are two users. Question 2 usually turns up at least one identifier in a signature that should have come from the context — and it always looks harmless, because the model has no reason to lie until somebody gives it one." },
          { t: "p", text: "Question 4 is the one worth writing down and keeping. Assume the model does exactly the worst thing available to it, because that is the situation a successful prompt injection creates. If the answer is 'it reads some public prices', the design is sound and the instruction is a nicety. If the answer is 'it empties the orders table', no amount of prompting fixes that, and the work is in the credential and the tool signature." }
        ]
      } }

  ],

  takeaways: [
    "Two identities: the agent's service account and the user's — ADK establishes neither.",
    "`user_id` is an unvalidated string used as a storage key; derive it from an authenticated principal, never from the request body.",
    "The credential service has two shipped implementations, neither suited to long-lived production tokens.",
    "Secrets must not enter state, tool return values, instructions or agent fields — anything the model reads is extractable.",
    "Apply least privilege at four layers: tools given, tool signature, credential scope, and the data layer.",
    "Never give a tool a `user_id` parameter — take it from `tool_context.user_id`."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Where does ADK verify that a user_id is genuine?",
      options: ["In the session service", "In the runner", "Nowhere — it is an unvalidated key", "In the credential service"],
      answer: 2,
      why: "It is a string used to key sessions, state and memory, and whatever you pass is taken at face value. That makes the line where you derive it the most security-critical line in the application: from a verified token or cookie, never from a request body the caller controls." },
    { stem: "A tool needs to return the user's orders. Which signature is safe?",
      options: ["`orders(user_id: str, status: str)`", "`orders(status: str, tool_context)` using tool_context.user_id", "`orders(user_id: str)` with an instruction not to guess", "Either, with a before_tool check"],
      answer: 1,
      why: "A `user_id` parameter is a value the model supplies and can be persuaded to change, and it works perfectly in single-user testing. Taking the identity from the context means the model cannot influence it at all — and the declaration does not even mention that it exists." },
    { stem: "Why should an OAuth refresh token not live in session state?",
      options: ["State has a size limit", "State is interpolated into instructions and readable by every tool and callback", "Tokens cannot be serialised", "State is not persisted"],
      answer: 1,
      why: "State is designed to be visible: it fills instruction templates, every tool and callback can read it, and it is written to your session store in plain form. Anything the model can see is extractable by a determined user, so credentials belong in a secrets manager behind a service, not in the agent's working memory." },
    { stem: "What is the strongest defence against an agent reading another tenant's rows?",
      options: ["A careful system instruction", "A before_tool_callback", "Row-level security keyed by the authenticated user", "A narrower tool description"],
      answer: 2,
      why: "The first three all assume something above the database behaved correctly — the model, the callback, the query the tool built. Row-level security filters before the query is considered, so it holds even when a prompt injection, a model mistake or a bug in your predicate has already won." }
  ] },

  interview: { title: "Interview", sub: "Security questions", questions: [
    { level: "Core", q: "How does ADK authenticate users?",
      strong: "It does not — `user_id` is an unvalidated string you supply, and everything depends on where you got it.",
      answer: [{ t: "p", text: "The runner takes a `user_id` and uses it as the key for sessions, state and memory. Nothing verifies it. So the security of the whole system rests on deriving that string server-side from an authenticated principal — a verified session cookie or a validated token — rather than accepting it from the request. I have seen this go wrong in the most ordinary way: a quickstart passes the id from the client body, there is one user during development, and the vulnerability ships. The same applies to the session id, which should be looked up from your own conversation record rather than accepted from the caller." }] },
    { level: "Core", q: "Where do you keep API keys an agent's tools need?",
      strong: "In a secrets manager, read by the tool at call time — never in state, a tool's return value or the instruction.",
      answer: [{ t: "p", text: "The rule I apply is that a secret must not go anywhere the model can read, because anything in the prompt or the transcript is extractable by a user who tries. That rules out session state, which is interpolated into instructions and visible to every tool and callback; it rules out returning a key from a tool, since the return value becomes an event replayed into every later request; and it rules out the instruction itself. In ADK the shipped credential services are in-memory and session-state, which are fine for a user's short-lived OAuth token during a flow and not what I would use for a long-lived secret. For those the tool fetches from a secrets manager, and on Agent Engine the value arrives as a secret reference rather than a plain environment variable." }] },
    { level: "Senior", q: "Design the access-control story for an agent over a multi-tenant database.",
      strong: "Identity from the authenticated request, never a parameter; narrow tools; a minimal role; and row-level security as the layer that actually holds.",
      answer: [{ t: "p", text: "I start at the bottom because that is the only layer that survives everything above it failing. The database enforces tenancy with row-level security keyed by the authenticated principal, so a query that forgets its predicate returns nothing rather than everything. The connection uses a role scoped to exactly the tables and operations the tools need — read-only unless writing is the point. Tools have narrow signatures with enumerated arguments and parameterised queries, and crucially none of them takes a user, account or tenant id as a parameter: that comes from `tool_context.user_id`, which came from my authenticated request, so the model cannot influence it and the declaration does not advertise it. Above that, agents only get the tools their role needs, and a `before_tool_callback` enforces anything conditional. The instruction is last and I would not describe it as a control at all. The question I would put to the team is the one that decides how much of this is necessary: if the model did the worst thing available to it, what happens? If the answer is unacceptable, the fix is in the credential and the signature, not in the prompt." }] }
  ] }
});
