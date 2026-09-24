/* ============================================================================
   LESSON 12.3 — Invoking a Deployed Agent
   The whole Python surface below was EXECUTED locally against AdkApp — the
   same wrapper Agent Engine deploys — on vertexai 2.1.3 + google-adk 2.9.2
   (scratchpad/adk/d1.py). The REST section is the same operations over HTTP
   and is the one part not run here, since it needs a live engine.
   ========================================================================= */
EC.receiveLesson({
  id: "12.3",

  lede: "**Deploying is the easy half. The half that shapes your application is how you call the thing afterwards.** A deployed agent is not an HTTP endpoint you POST a question to and get an answer from — it is a resource you create sessions on and stream events from, and those events arrive as plain JSON dictionaries rather than the `Event` objects your local code is used to. This lesson calls every operation a deployed engine exposes, using the very wrapper that gets deployed, so the code here is the code that talks to production.",

  objectives: [
    "Get a handle on a deployed engine from its resource name",
    "Manage remote sessions and keep a multi-turn conversation going",
    "Stream events from a deployed agent and read the JSON form",
    "Call the same operations over REST, and know which IAM role is needed",
    "Choose between a deployed engine, a local runner and an A2A endpoint for a given caller"
  ],

  prerequisites: ["12.2", "5.1"],

  blocks: [

    { t: "h2", n: "01", text: "The handle", id: "handle" },

    {"kind": "steps", "title": "The four calls an application makes", "caption": "Executed against AdkApp — the same wrapper Agent Engine deploys. It is deliberately not a question-in, answer-out endpoint: a turn is a sequence of things happening, and a decent interface wants to show them.", "items": [{"label": "agent_engines.get(name)", "sub": "resource name from configuration", "tone": "accent"}, {"label": "async_create_session", "sub": "returns a dict — store its id", "tone": "violet"}, {"label": "async_stream_query", "sub": "message + user_id + session_id", "tone": "good"}, {"label": "async_get_session", "sub": "the transcript, on their side", "tone": "warn"}], "t": "diagram", "id": "dg-12_3-01-0"},



    { t: "code", lang: "python", title: "From a resource name to something you can call",
      code: `import vertexai
from vertexai import agent_engines

vertexai.init(project="my-project", location="us-central1")

remote = agent_engines.get(
    "projects/123456789/locations/us-central1/reasoningEngines/987654321")
print(remote.display_name, remote.update_time)`,
      caption: "The resource name is the deployment's address and belongs in configuration. `agent_engines.list()` finds it the first time; after that, hard-coding it is not a smell — it is the point." },

    { t: "p", text: "The object that comes back exposes the operations the deployment registered, which lesson 12.2 printed: session create, get, list and delete, memory add and search, and the streaming query in its several modes. Everything below uses exactly those names, and everything below was executed — against a local `AdkApp`, which is the same wrapper the remote engine runs, so the call signatures and the shapes of what comes back are real rather than recalled." },

    { t: "h2", n: "02", text: "Sessions are remote too", id: "sessions" },

    { t: "code", lang: "python", title: "Creating a conversation on the deployed agent",
      code: `s = await remote.async_create_session(user_id="u1", state={"units": "metric"})
print(sorted(s))
print(s["id"][:8], s["state"])`,
      caption: "Executed against AdkApp. There is a synchronous `create_session` too, but it now warns that it is deprecated in favour of the async form." },

    { t: "out", text: `['app_name', 'events', 'id', 'last_update_time', 'state', 'user_id']
046f83b8 {'units': 'metric'}` },

    { t: "p", text: "Two things to notice. The session comes back as a **dictionary, not a `Session` object** — everything crossing the deployment boundary is JSON, which is a running theme of this lesson. And the keys are the same six fields lesson 5.1 introspected, because it is the same session model; it simply lives in Vertex AI's managed store rather than in your database." },

    { t: "callout", kind: "trap", title: "No session id means no conversation",
      body: [{ t: "p", text: "`stream_query` will accept a call without `session_id` and it will work — as a single isolated turn, every time. Applications that forget to keep the id produce an agent that cannot remember the previous sentence, and the bug looks like a model problem rather than a client problem. Create a session when a conversation starts, store its id next to your own conversation record, and pass it on every call." }] },

    { t: "h2", n: "03", text: "Streaming a turn", id: "stream" },

    { t: "code", lang: "python", title: "The call your application actually makes",
      code: `async for ev in remote.async_stream_query(
        message="what is the weather in London?",
        user_id="u1", session_id=sid):
    for p in (ev.get("content") or {}).get("parts", []):
        if "text" in p:
            print(f"  {ev['author']}: text {p['text']!r}")
        if "function_call" in p:
            print(f"  {ev['author']}: call {p['function_call']['name']}({p['function_call'].get('args')})")
        if "function_response" in p:
            print(f"  {ev['author']}: result {p['function_response']['response']}")` },

    { t: "out", text: `  weather: call get_weather({'city': 'London'})
  weather: result {'city': 'London', 'temp_c': 14, 'sky': 'rain'}
  weather: text 'It is 14C and raining in London.'` },

    { t: "p", text: "The full event stream crosses the boundary — the tool call and the tool result, not only the answer. That is what makes a real interface possible: you can show \"checking the weather…\" while the tool runs, and you have the audit trail client-side. It also means your client must decide what to render, exactly as a local runner does: most applications display text from final events and turn calls into progress indicators." },

    { t: "callout", kind: "insight", title: "Events arrive as dictionaries, and the keys are snake_case",
      body: [{ t: "p", text: "Locally you get `Event` objects and write `event.content.parts[0].function_call.name`. Remotely you get plain dicts and write `ev[\"content\"][\"parts\"][0][\"function_call\"][\"name\"]`. Write one small adapter that turns an event dict into whatever your UI consumes, and keep it in one file — the alternative is dictionary indexing spread through your application, which breaks silently when a part is a kind you did not expect." }] },

    { t: "table", head: ["Mode", "Method", "Use"],
      rows: [
        ["Async streaming", "`async_stream_query`", "The default for a server that is already async — one event at a time as they happen"],
        ["Blocking streaming", "`stream_query`", "Scripts, notebooks, sync web handlers; the same events from an ordinary `for` loop"],
        ["Raw event stream", "`streaming_agent_run_with_events`", "Takes a JSON request; the low-level form the dev tooling uses"],
        ["Sessions", "`async_create_session` / `get` / `list` / `delete`", "Conversation lifecycle, managed remotely"],
        ["Memory", "`async_add_session_to_memory` / `async_search_memory`", "The memory service (lesson 5.4), exposed across the boundary"]
      ] },

    { t: "h2", n: "04", text: "Reading back a conversation", id: "readback" },

    { t: "code", lang: "python", title: "Listing and fetching, executed",
      code: `listed = await remote.async_list_sessions(user_id="u1")
back = await remote.async_get_session(user_id="u1", session_id=sid)
print("events:", len(back["events"]), "| state:", back["state"])` },

    { t: "out", text: `async_list_sessions -> ['046f83b8']
async_get_session -> events: 4 | state: {'units': 'metric'}` },

    { t: "p", text: "Four events for one tool-using turn — the user message, the call, the response, the answer — exactly the shape lesson 5.1 traced locally. The transcript is on the deployment's side, which is convenient until you want to analyse it: 'which conversations preceded a refund' is a join you can write in SQL when you own the session database, and an export when you do not." },

    { t: "h2", n: "05", text: "The same thing over REST", id: "rest" },

    { t: "p", text: "Not every caller is Python. The engine is a Vertex AI resource, so every registered operation is reachable over HTTPS by naming the method and passing its arguments — the resource type in the path is `reasoningEngines`, Agent Engine's original name." },

    { t: "code", lang: "bash", title: "Streaming a turn with curl",
      code: `ENGINE="projects/my-project/locations/us-central1/reasoningEngines/987654321"

curl -X POST \\
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \\
  -H "Content-Type: application/json" \\
  "https://us-central1-aiplatform.googleapis.com/v1/$\{ENGINE}:streamQuery?alt=sse" \\
  -d '{
    "class_method": "async_stream_query",
    "input": {
      "user_id": "u1",
      "session_id": "046f83b8-11d6-4b59-8bd8-57727bf0fce9",
      "message": "what is the weather in London?"
    }
  }'`,
      caption: "`class_method` is one of the names from `register_operations()`, and `input` is that method's keyword arguments. Session operations use the `:query` endpoint the same way — for example `class_method: \"async_create_session\"`." },

    { t: "callout", kind: "note", title: "Which of this page was run",
      body: [{ t: "p", text: "Every Python block above was executed against `AdkApp`, the wrapper Agent Engine deploys, so the signatures and result shapes are verified. The curl call needs a live engine and a project, so it is shown rather than run — but its `class_method` values come from the executed `register_operations()` output, which is the part people usually get wrong." }] },

    { t: "h2", n: "06", text: "Who is allowed to call it", id: "auth" },

    { t: "dl", items: [
      ["The caller needs an identity", "Agent Engine is behind Google IAM, not an API key in a header. Calls carry a bearer token from Application Default Credentials — a service account in production, your own `gcloud` login in development."],
      ["`roles/aiplatform.user`", "The role that permits querying an engine. Grant it to the service account of whatever service fronts the agent, not to end users."],
      ["End users do not call the engine", "Your backend does, on their behalf. It authenticates the user, derives `user_id` itself, and calls the engine with its own credentials — which is what stops a caller reading another person's sessions by typing their id (lesson 5.1)."],
      ["The agent has a separate identity", "The service account the engine *runs as* (lesson 12.2) is not the one calling it. Confusing the two is how an agent ends up with permission to do things its callers should not be able to ask for."]
    ] },

    { t: "diagram", kind: "flow", title: "The call path in a real deployment",
      caption: "Two different identities and two different trust boundaries. The browser never holds Google credentials, and user_id is derived server-side from the authenticated session rather than taken from the request.",
      cols: 3,
      nodes: [
        { id: "b", label: "Browser", sub: "your session cookie", tone: "accent" },
        { id: "a", label: "Your backend", sub: "authenticates the user, sets user_id", tone: "good" },
        { id: "e", label: "Agent Engine", sub: "called with the backend's service account", tone: "violet" },
        { id: "t", label: "Agent's tools", sub: "run as the engine's own service account", tone: "warn" }
      ],
      edges: [["b", "a", "HTTPS"], ["a", "e", "IAM token"], ["e", "t"]] },

    { t: "h2", n: "07", text: "When not to call it this way", id: "alternatives" },

    { t: "table", head: ["Caller", "Best route", "Why"],
      rows: [
        ["Your own backend", "The Python SDK against the resource name", "Typed, streaming, session management included"],
        ["A non-Python service", "REST with `class_method`", "Same operations, no SDK needed"],
        ["**Another agent**", "A2A (lesson 8.3–8.4)", "Agent-to-agent has its own protocol, agent card and task model — richer than a query call"],
        ["A test suite", "A local runner, not the deployment", "Tests should not depend on a deploy; lesson 11.3 runs agents in process"],
        ["A batch job", "A local runner or a queue worker", "Streaming a turn at a time is the wrong shape for ten thousand documents"]
      ] },

    { t: "callout", kind: "good", title: "Keep the deployment behind one client module",
      body: [{ t: "p", text: "One file that holds the resource name, creates sessions, adapts event dicts, and exposes two or three functions your application calls. It gives you a seam for tests — swap the client for a local runner — and it means moving from Agent Engine to Cloud Run later touches one file instead of every handler. That is a small amount of discipline for a large amount of optionality." }] },

    { t: "exercise", kind: "practice", title: "Write the client before you have an engine", difficulty: "advanced", minutes: 28,
      prompt: "Build an AdkApp around a tool-using agent locally and write a client module against it with three functions: start_conversation(user_id) returning a session id, ask(user_id, session_id, message) yielding rendered updates, and history(user_id, session_id). Have ask() turn each event dict into one of three things — a progress line for a call, nothing for a raw result, or text for an answer. Then confirm the only line that would change against a real deployment is the one that builds the client object.",
      hints: [
        "`AdkApp(agent=agent)` needs a project id: `vertexai.init(...)` or the GOOGLE_CLOUD_PROJECT environment variable.",
        "Use the async methods; the sync session ones now warn that they are deprecated.",
        "Parts are dicts — check for the keys 'text', 'function_call' and 'function_response'.",
        "Substituting `agent_engines.get(RESOURCE)` for `AdkApp(agent=agent)` should be the whole change."
      ],
      solution: {
        code: `class AgentClient:
    def __init__(self, backend):          # AdkApp locally, agent_engines.get() in prod
        self._b = backend

    async def start_conversation(self, user_id):
        return (await self._b.async_create_session(user_id=user_id))["id"]

    async def ask(self, user_id, session_id, message):
        async for ev in self._b.async_stream_query(
                message=message, user_id=user_id, session_id=session_id):
            for p in (ev.get("content") or {}).get("parts", []):
                if "function_call" in p:
                    yield ("progress", p["function_call"]["name"])
                elif "text" in p:
                    yield ("text", p["text"])

    async def history(self, user_id, session_id):
        return (await self._b.async_get_session(
            user_id=user_id, session_id=session_id))["events"]`,
        notes: [
          { t: "p", text: "The constructor taking a backend is what makes the seam real: locally you pass an `AdkApp` and the whole thing runs in process with no cloud project, in production you pass the object `agent_engines.get()` returned, and nothing else in the module changes. That is not a coincidence — it is because both expose the operations `register_operations()` listed." },
          { t: "p", text: "Dropping raw function responses from the stream is the right default for a chat interface: the model is about to summarise them, so showing both is noise. Keep them if the interface is a debugging view, and keep the whole event list either way, because a support conversation about a wrong answer is answered by the trace rather than by the text." }
        ]
      } }

  ],

  takeaways: [
    "A deployed engine is addressed by a resource name; `agent_engines.get()` returns a handle exposing the registered operations.",
    "Sessions are remote and arrive as JSON dictionaries with the same six fields as a local `Session`.",
    "Omitting `session_id` silently produces isolated single turns — store the id with your own conversation record.",
    "`async_stream_query` streams the whole event sequence, tool calls included, as dicts with snake_case keys.",
    "REST works for any language: `:streamQuery` with `class_method` and `input`, authorised by an IAM bearer token.",
    "The identity calling the engine and the identity the engine runs as are different — keep both narrow."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Your application calls stream_query without a session_id on every message. What does the user experience?",
      options: ["An error after the first call", "An agent that never remembers anything said before", "The same conversation, since user_id is enough", "Slower responses as history is rebuilt"],
      answer: 1,
      why: "Each call without a session id is an isolated turn against a fresh session. It works, which is what makes it dangerous — nothing errors, the agent simply has no history, and the symptom looks like a model failing to pay attention rather than a client forgetting to pass an argument." },
    { stem: "How do event objects differ between a local runner and a deployed engine?",
      options: ["They do not — both yield Event objects", "The deployment yields plain JSON dicts with snake_case keys", "The deployment yields only final text events", "The deployment yields XML"],
      answer: 1,
      why: "Everything crossing the deployment boundary is JSON, so `event.content.parts[0].text` becomes `ev[\"content\"][\"parts\"][0][\"text\"]`. The full event sequence still crosses — tool calls and responses included — which is what lets a client show progress while a tool runs." },
    { stem: "A Java service needs to call your deployed agent. What is the route?",
      options: ["Rewrite the caller in Python", "POST to the engine's :streamQuery endpoint with class_method and input", "Deploy a second agent for Java callers", "Use an API key in a header"],
      answer: 1,
      why: "Every registered operation is reachable over HTTPS by naming the method in `class_method` and passing its keyword arguments in `input`. Authorisation is an IAM bearer token rather than an API key, because the engine is an ordinary Vertex AI resource behind Google IAM." },
    { stem: "Which identity should be allowed to query the engine?",
      options: ["Each end user's Google account", "The service account of the backend that fronts the agent", "The service account the engine runs as", "Anyone with the resource name"],
      answer: 1,
      why: "Your backend authenticates the user, derives `user_id` itself, and calls the engine with its own credentials — which is what stops a caller reading someone else's sessions by supplying their id. The engine's own service account is a different identity again: it is what the agent's tools act as, and it should be scoped to what the tools need." }
  ] },

  interview: { title: "Interview", sub: "Invocation questions", questions: [
    { level: "Core", q: "How does an application call a deployed ADK agent?",
      strong: "Get a handle from the resource name, create a session, then stream a query with user_id and session_id.",
      answer: [{ t: "p", text: "It is three steps rather than one request. `agent_engines.get()` on the resource name returns a handle exposing the operations the deployment registered. A conversation begins with `async_create_session`, which returns a session dictionary whose id my application stores alongside its own conversation record. Every message is then `async_stream_query` with the message, the user id and that session id, yielding the full event sequence as JSON dicts — tool calls, tool results and text. It is deliberately not a question-in, answer-out endpoint, because a turn is a sequence of things happening, and a decent interface wants to show them." }] },
    { level: "Core", q: "What would you keep in configuration rather than code?",
      strong: "The resource name, the project and the region — everything that differs between environments.",
      answer: [{ t: "p", text: "The resource name is the deployment's address and it differs between staging and production, so it belongs in configuration and should be set by whatever deploys the engine rather than copied from a console. The project and region go with it. What I would not do is discover the engine by listing and matching on display name at startup: it is a network call on every boot, and it silently picks the wrong engine the day somebody leaves a second one lying around — which is easy to do, because calling create twice makes a new engine rather than updating the old one." }] },
    { level: "Senior", q: "You need to expose a deployed agent to a web front end. Design the path.",
      strong: "Browser to your backend over your own auth; backend to the engine with a service account; user_id derived server-side; events adapted in one client module.",
      answer: [{ t: "p", text: "The browser never talks to Vertex AI, because that would mean putting Google credentials in a client and letting the caller choose their own user id. It talks to my backend over my own session auth. The backend authenticates the request, derives `user_id` from the authenticated principal rather than from the request body, looks up the stored session id for that conversation, and calls the engine with its own service account holding `roles/aiplatform.user`. Then it re-streams: server-sent events to the browser, with the event dicts adapted into whatever the UI renders — progress for tool calls, text for answers — in one client module so the adaptation lives in a single place. Two details I would insist on in review. The identity the engine runs as is separate from the identity calling it, and both should be scoped to exactly what they need. And the session id must be stored server-side against the conversation, because a client that forgets to send it gets an agent with no memory and a bug report that blames the model." }] }
  ] }
});
