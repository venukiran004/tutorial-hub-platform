/* ============================================================================
   LESSON 4.8 — Tool Authentication
   Every type, field and signature introspected from google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "4.8",

  lede: "**The hard question about tool auth is not how to store a key — it is whose authority the tool acts with.** A tool calling a weather API acts as your application. A tool reading the user's calendar must act as that user, which means the agent has to pause mid-invocation, send them through an OAuth flow, and resume with a token that belongs to them. ADK models this explicitly: `AuthScheme` describes what the API wants, `AuthCredential` carries what you have, `request_credential` pauses the run, and a credential service stores the result. This lesson covers all four, and the decision that comes before them.",

  objectives: [
    "Distinguish application credentials from user credentials and say which a tool needs",
    "Configure an API key, HTTP or service-account credential on a tool or toolset",
    "Follow the interactive OAuth flow: request_credential, resume, get_auth_response",
    "Choose a credential service and know where each one stores tokens",
    "Avoid the three ways tool credentials leak"
  ],

  prerequisites: ["4.2", "4.6"],

  blocks: [

    { t: "h2", n: "01", text: "Whose authority", id: "whose" },

    { t: "diagram", kind: "compare", title: "Two completely different problems",
      caption: "Getting this wrong is the most consequential mistake in the lesson: a tool that acts as the application while appearing to act as the user will happily read one customer's data for another.",
      columns: [
        { title: "The application acts", tone: "accent", items: ["a public weather API", "your own internal service", "a shared data warehouse (read-only role)", "credential: an API key or service account", "same for every user", "authorisation is your job (lesson 9.1)"] },
        { title: "The user acts", tone: "warn", items: ["their Google Calendar", "their GitHub issues", "their mailbox", "credential: an OAuth token, per user", "obtained interactively, once", "authorisation is the upstream's job"] }
      ] },

    { t: "code", lang: "python", title: "The types, from the package",
      code: `from google.adk.auth import (AuthConfig, AuthCredential, AuthCredentialTypes,
                             AuthScheme, AuthSchemeType, OAuth2Auth)

print([e.value for e in AuthCredentialTypes])
# ['apiKey', 'http', 'oauth2', 'openIdConnect', 'serviceAccount']

print(list(AuthConfig.model_fields))
# ['auth_scheme', 'raw_auth_credential', 'exchanged_auth_credential', 'credential_key']`,
      caption: "`AuthScheme` is the API's requirement — it mirrors OpenAPI's security schemes. `AuthCredential` is what you hold. `AuthConfig` pairs them, and its `exchanged_auth_credential` is where the *result* of an interactive flow lands." },

    { t: "h2", n: "02", text: "Application credentials", id: "app" },

    { t: "code", lang: "python", title: "An API key on a generated toolset",
      code: `from fastapi.openapi.models import APIKey, APIKeyIn
from google.adk.auth import AuthCredential, AuthCredentialTypes
from google.adk.tools.openapi_tool import OpenAPIToolset

scheme = APIKey(**{"in": APIKeyIn.header, "name": "X-API-Key"})
credential = AuthCredential(auth_type=AuthCredentialTypes.API_KEY, api_key=os.environ["PARTNER_KEY"])

toolset = OpenAPIToolset(spec_str=spec, spec_str_type="yaml",
                         auth_scheme=scheme, auth_credential=credential)`,
      caption: "The key is attached to the toolset, so every generated tool carries it; the model never sees it and cannot leak it, because it is not in the declaration. The same pair can go on an individual `AuthenticatedFunctionTool`." },

    { t: "p", text: "For a tool you write yourself, the simplest correct thing is often no ADK auth at all: read the credential from the environment or a secret manager inside the tool. The auth types earn their place when a *toolset* needs configuring, or when the flow is interactive." },

    { t: "callout", kind: "trap", title: "Never make a credential a tool parameter",
      body: "`def fetch(api_key: str, query: str)` puts the key in the declaration, which means the model is asked to supply it, which means it appears in the conversation, in the session, in your logs and in the trace. Credentials come from the environment, from the credential service, or from `tool_context`; never from the model." },

    { t: "h2", n: "03", text: "User credentials, interactively", id: "oauth" },

    { t: "p", text: "When the tool must act as the user, the agent cannot proceed until the user authenticates. ADK's answer is to pause the invocation:" },

    { t: "code", lang: "python", title: "The two calls that drive the flow",
      code: `# signatures verified on 2.9.2
ToolContext.request_credential(auth_config: AuthConfig) -> None
ToolContext.get_auth_response(auth_config: AuthConfig) -> AuthCredential | None


def list_events(day: str, tool_context: ToolContext) -> dict:
    """Lists the user's calendar events for a day.

    Args:
        day: the date, e.g. '2026-09-23'.
    """
    credential = tool_context.get_auth_response(CALENDAR_AUTH)      # already authorised?
    if credential is None:
        tool_context.request_credential(CALENDAR_AUTH)              # pause and ask
        return {"status": "auth_required",
                "message": "I need permission to read your calendar."}
    return {"status": "ok", "events": calendar_api(credential.oauth2.access_token).list(day)}`,
      caption: "First call: no credential, so the tool requests one and returns a pending status. The framework records the request in `EventActions.requested_auth_configs`, the client takes the user through the consent screen, and the invocation resumes — on the second pass `get_auth_response` returns the exchanged credential." },

    { t: "diagram", kind: "steps", title: "The interactive flow, end to end",
      caption: "The same pause-and-resume machinery as human confirmation (lesson 9.3): the framework surfaces a request, your client satisfies it, the invocation continues.",
      items: [
        { label: "Tool needs a user credential and has none", desc: "calls request_credential(auth_config) and returns a pending result", tone: "accent" },
        { label: "ADK records the request on the event", desc: "EventActions.requested_auth_configs — the client can see what is needed", tone: "good" },
        { label: "Your client runs the OAuth flow", desc: "redirect, consent, callback with the code — outside the agent entirely", tone: "warn" },
        { label: "The invocation resumes with the credential", desc: "the exchanged credential lands in the auth config", tone: "violet" },
        { label: "The tool runs and the credential is stored", desc: "the credential service keeps it for next time", tone: "crit" }
      ] },

    { t: "code", lang: "python", title: "An OAuth2 scheme, and where the token ends up",
      code: `from google.adk.auth import OAuth2Auth
print(list(OAuth2Auth.model_fields))
# ['client_id', 'client_secret', 'auth_uri', 'nonce', 'state', 'redirect_uri',
#  'auth_response_uri', 'auth_code', 'access_token', 'refresh_token', 'id_token',
#  'expires_at', 'expires_in', 'audience', 'prompt', 'code_verifier',
#  'code_challenge_method', 'token_endpoint_auth_method']`,
      caption: "Both halves of the flow live in one object: what you send (client id, auth uri, redirect uri, PKCE fields) and what comes back (auth code, access token, refresh token, expiry). `code_verifier` and `code_challenge_method` are there because PKCE is expected for public clients (lesson 12.10 of the Python course)." },

    { t: "h2", n: "04", text: "Where credentials live", id: "service" },

    { t: "code", lang: "python", title: "The credential services ADK ships",
      code: `# from google.adk.auth.credential_service:
#   in_memory_credential_service        — process memory; dev only
#   session_state_credential_service    — in the session's state

from google.adk.auth.credential_service.in_memory_credential_service import InMemoryCredentialService

runner = Runner(agent=root, app_name="app",
                session_service=session_service,
                credential_service=InMemoryCredentialService())`,
      caption: "The base contract is two methods, `load_credential` and `save_credential`. The session-state service persists tokens wherever your session service persists state — which is convenient and means your session store now holds bearer tokens." },

    { t: "callout", kind: "trap", title: "Tokens in session state are tokens in your database",
      body: "`session_state_credential_service` writes access and refresh tokens into session state, and `DatabaseSessionService` writes session state into your database — in plain text unless you encrypt it. For anything beyond a prototype, store user tokens in a secret manager or an encrypted store with a short-lived cache, and keep the session state holding a reference rather than the token itself (lesson 9.1)." },

    { t: "h2", n: "05", text: "The three leaks", id: "leaks" },

    { t: "diagram", kind: "matrix", title: "How tool credentials actually escape",
      caption: "None of these is exotic. All three have happened to people who thought about auth carefully and then logged a request body.",
      rows: ["A credential as a tool parameter", "A token in a tool's return value", "Logging args or responses wholesale"],
      cols: ["Where it ends up", "Fix"],
      cells: [
        [{ text: "the declaration, the conversation, the session, the trace", tone: "crit" }, { text: "credentials come from env, the credential service or tool_context", tone: "good" }],
        [{ text: "the model's context, and every later model call", tone: "crit" }, { text: "return a status, never the credential", tone: "good" }],
        [{ text: "your log aggregator, indefinitely", tone: "crit" }, { text: "log named fields, never **args or the whole response", tone: "good" }]
      ] },

    { t: "exercise", kind: "design", title: "Three tools, three auth designs", difficulty: "advanced", minutes: 20,
      body: [{ t: "p", text: "Design the authentication for: (a) a tool that looks up public train times from a partner API with a shared key; (b) a tool that reads the *user's* Google Drive; (c) a tool that queries your company warehouse, where every employee may see different rows. For each: whose authority, which credential type, where the secret lives, and what the tool returns when authentication is missing." }],
      requirements: ["Three designs", "Whose authority named explicitly in each", "The missing-credential behaviour for each"],
      hint: "(c) is the one where the answer is neither purely application nor purely user credentials.",
      solution: { lang: "text", title: "Solution",
        code: `(a) application authority. API key from a secret manager, injected as an AuthCredential
    on the toolset or read from the environment inside the tool. Missing → raise: it is a
    misconfiguration, not a runtime condition, and every user is equally broken.

(b) user authority. OAuth2 with PKCE, obtained interactively via request_credential,
    stored per user in a credential store (not plain session state). Missing → return
    {"status":"auth_required"} so the agent can ask, and the client runs the flow.

(c) application connection, user authorisation. One service account connects to the
    warehouse with a read-only role; the tool passes the authenticated user's identity
    to a row-level security policy or filters by it explicitly. Missing user identity →
    raise, because a query with no identity must never run. The credential is the
    application's; the *authority* is still the user's, and the enforcement is in the
    query, not in the agent.`,
        notes: [{ t: "p", text: "(c) is the case people get wrong: they connect with a powerful service account and rely on the agent's instruction to restrict what it asks for. That is not a control. The identity has to reach the data layer — row-level security, a filtered view, or an explicit user predicate in every query — so the enforcement does not depend on the model's cooperation." }] } }
  ],

  takeaways: [
    "Decide first whose authority a tool acts with: the application's (API key, service account) or the user's (OAuth token, per user).",
    "AuthScheme describes what the API wants, AuthCredential what you hold, AuthConfig pairs them, and exchanged_auth_credential is where an interactive result lands.",
    "The five credential types are apiKey, http, oauth2, openIdConnect and serviceAccount.",
    "Interactive flows pause the invocation: request_credential records the need, the client runs the OAuth flow, and get_auth_response returns the credential on resume.",
    "Credential services store the result; the session-state one puts tokens wherever your session state lives, which for a database session service means tokens in your database.",
    "Never make a credential a tool parameter and never return one — both put it in the model's context and in every later call.",
    "When the application connects but the user's authority applies, the identity must reach the data layer, not just the prompt."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A tool must read the current user's calendar. What does it need?",
      options: ["An API key in the environment", "A per-user OAuth credential, obtained interactively with request_credential", "A service account with domain-wide access", "The user's password as a tool argument"],
      answer: 1,
      why: "The tool must act as that user, so it needs a token belonging to them. ADK pauses the invocation: the tool calls request_credential and returns a pending status, the client runs the consent flow, and on resume get_auth_response returns the exchanged credential. A service account with domain-wide access would let any user read any calendar." },
    { stem: "Why must a credential never be a tool parameter?",
      options: ["It would be too long", "It would appear in the declaration, so the model supplies it — putting it in the conversation, the session, the logs and the trace", "ADK forbids string parameters", "It slows the tool down"],
      answer: 1,
      why: "Parameters are generated into the declaration the model sees and fills in, which means the secret travels through the model's context and is recorded in the session's events. Credentials come from the environment, from the credential service, or from tool_context — never from the model." },
    { stem: "What does session_state_credential_service imply about where tokens are stored?",
      options: ["In a secret manager", "Wherever your session service persists state — including your database, in plain text unless you encrypt it", "In the model's context", "Only in memory"],
      answer: 1,
      why: "It writes credentials into session state, and session state goes wherever the session service puts it. With DatabaseSessionService that means bearer tokens in your application database. For production, store them in a secret manager or an encrypted store and keep only a reference in state." },
    { stem: "Your warehouse tool connects with one service account, and the agent's instruction says to only query the user's own region. Is that a control?",
      options: ["Yes, if the instruction is clear", "No — the identity must reach the data layer through row-level security or an explicit predicate", "Yes, if temperature is low", "Only with output_schema"],
      answer: 1,
      why: "An instruction is a preference the model can be argued out of, and the service account can read everything. The user's identity has to be enforced where the data is — a row-level security policy, a filtered view, or a user predicate added by the tool rather than by the model — so that a crafted message cannot widen the query." }
  ] },

  interview: { title: "Interview", sub: "Tool-auth questions", questions: [
    { level: "Core", q: "How does an ADK tool get a credential that belongs to the user?",
      strong: "It pauses: request_credential records the need, the client runs OAuth, the invocation resumes and get_auth_response returns the exchanged credential.",
      answer: [{ t: "p", text: "The tool first asks get_auth_response for an existing credential. If there is none, it calls request_credential with an AuthConfig describing the scheme, and returns a pending status. ADK records the request on the event in requested_auth_configs and the invocation stops there. The client — a web front end, the dev UI — sees the request, takes the user through the provider's consent flow, and resumes the invocation with the result; the exchanged credential lands in the auth config and the tool runs for real. A credential service stores it so the next conversation does not repeat the flow. It is the same pause-and-resume machinery as human confirmation, which is why both need a session service that persists." }] },
    { level: "Core", q: "How do you decide whether a tool acts as the application or as the user?",
      strong: "Ask whether two different users calling it should get different data; if so it needs their credential, not yours.",
      answer: [{ t: "p", text: "The test is whether the answer depends on who is asking. A train timetable is the same for everyone, so the application's own API key is correct and authorisation is entirely my problem. A calendar, a mailbox or a private repository differs per user, so the tool must act with that user's authority - an OAuth token obtained interactively and stored per user. The dangerous middle case is a shared backend where rows differ by user: the connection is the application's but the authority is still the user's, so their identity has to reach the data layer through row-level security or an explicit predicate the tool adds itself. Relying on the agent's instruction to only ask for permitted rows is not authorisation; it is a hope." }] },
    { level: "Senior", q: "Where do you store user OAuth tokens for an agent in production?",
      strong: "In a secret manager or encrypted store keyed by user, with a short-lived cache — not in session state.",
      answer: [{ t: "p", text: "ADK's session-state credential service is convenient and puts tokens wherever session state goes, which with a database session service means bearer tokens in application tables, usually unencrypted and usually readable by anything that can read a session. In production I would keep them in a dedicated store — a secret manager, or a table encrypted with a KMS key — keyed by user and provider, with the refresh token treated as the sensitive one and the access token cached briefly in memory. The session then holds a reference, not the token. I would also think about revocation from the start: a user disconnecting an integration must invalidate what we hold, and a compromised session must not be a compromised mailbox." }] }
  ] }
});
