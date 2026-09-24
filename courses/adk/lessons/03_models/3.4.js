/* ============================================================================
   LESSON 3.4 — The Registry, and Writing Your Own Model
   The resolutions, the ValueError, the registration and the working custom
   model are executed output from scratchpad/adk/p1.py; the live-connection
   trace is from scratchpad/adk/b1.py (google-adk 2.9.2).
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "**`model=\"gemini-2.5-pro\"` is a lookup, and you can add entries to the table.** ADK resolves a model string to a class through a registry of regex patterns, which is how one field accepts Gemini, Claude, anything LiteLLM drives — and anything you write. That last case is not exotic: a model class is two methods, and the one every trace in this course was produced with is about fifteen lines. This lesson registers a working model, resolves it, runs an agent on it, and then adds the one method that makes live streaming possible.",

  objectives: [
    "Explain how a model string becomes a class",
    "Register your own `BaseLlm` subclass and resolve it",
    "Implement `generate_content_async` and `supported_models`",
    "Say when writing a model is the right answer rather than a wrapper",
    "Add a live connection so a custom model supports `run_live`"
  ],

  prerequisites: ["3.2", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Resolution is a regex match", id: "resolve" },

    { t: "code", lang: "python", title: "p1.py — the registry's whole surface",
      code: `from google.adk.models.registry import LLMRegistry
print(inspect.signature(LLMRegistry.resolve))   # (model: str) -> type[BaseLlm]
print(inspect.signature(LLMRegistry.register))  # (llm_cls: type[BaseLlm]) -> None

for name in ["gemini-2.5-pro", "gemini-1.5-flash-002", "fake-model"]:
    print(LLMRegistry.resolve(name))` },

    { t: "out", text: `resolve('gemini-2.5-pro') -> Gemini
resolve('gemini-1.5-flash-002') -> Gemini
resolve('fake-model') -> ValueError: Model fake-model not found.` },

    { t: "p", text: "Two model ids that differ in version and family both resolve to the same class, because `Gemini.supported_models()` returns patterns rather than a list of names — which is what stops the registry needing an update every time a model id changes. An unregistered name raises `ValueError` at resolution, not later at call time, so a typo in a model string fails at agent construction rather than in production." },

    { t: "diagram", kind: "flow", title: "From a string to something that can be called",
      caption: "Passing a BaseLlm instance directly skips the registry entirely — which is how a fake model works in tests without registering anything.",
      cols: 4,
      nodes: [
        { id: "s", label: "model=\"gemini-2.5-pro\"", sub: "a string on LlmAgent", tone: "accent" },
        { id: "r", label: "LLMRegistry.resolve", sub: "regex match over registered classes", tone: "violet" },
        { id: "c", label: "A BaseLlm subclass", sub: "Gemini, Claude, LiteLlm, yours", tone: "good" },
        { id: "i", label: "canonical_model", sub: "the instance the agent calls", tone: "warn" }
      ],
      edges: [["s", "r"], ["r", "c"], ["c", "i"]] },

    { t: "h2", n: "02", text: "A model in fifteen lines", id: "custom" },

    {"kind": "steps", "title": "Write, register, resolve, run", "caption": "Executed end to end: the agent was constructed with model=\"echo-1\", the registry resolved it to EchoLlm, and the reply came back through the ordinary event machinery.", "items": [{"label": "Subclass BaseLlm", "sub": "generate_content_async + supported_models", "tone": "good"}, {"label": "LLMRegistry.register", "sub": "process-wide — keep the pattern narrow", "tone": "warn"}, {"label": "resolve('echo-1')", "sub": "-> EchoLlm", "tone": "accent"}, {"label": "The agent replies", "sub": "'echo: hello there'", "tone": "violet"}], "t": "diagram", "id": "dg-3_4-02-0"},

    { t: "code", lang: "python", title: "Registered, resolved and run",
      code: `class EchoLlm(BaseLlm):
    """A model in forty characters, registered by a regex."""

    model: str = "echo-1"

    async def generate_content_async(self, llm_request, stream=False):
        last = last_user_text(llm_request)
        yield LlmResponse(content=types.Content(
            role="model", parts=[types.Part(text=f"echo: {last}")]))

    @staticmethod
    def supported_models():
        return [r"echo-.*"]

LLMRegistry.register(EchoLlm)

agent = LlmAgent(name="a", model="echo-1", instruction="x")` },

    { t: "out", text: `after register(EchoLlm):
  resolve('echo-1') -> EchoLlm
  LlmAgent(model='echo-1').canonical_model -> EchoLlm
  the agent replied: echo: hello there` },

    { t: "p", text: "That is a complete, working model: the agent resolved the string, the runner called it, and the reply came back through the ordinary event machinery. **Two methods are all `BaseLlm` requires** — an async generator that yields `LlmResponse` objects, and a static method returning the patterns it answers to." },

    { t: "callout", kind: "insight", title: "This is why the course has executed traces",
      body: [{ t: "p", text: "The `FakeLlm` behind every trace in this course is this same fifteen lines with a script instead of an echo. Because it is a real `BaseLlm`, ADK treats it as a model in every respect — so the events, state deltas, tool dispatch and callbacks around it are the genuine framework, and only the model's judgement is replaced. Lesson 11.3 makes that the basis of a test suite." }] },

    { t: "h2", n: "03", text: "When to write one", id: "when" },

    { t: "table", head: ["Situation", "Write a model?", "Why"],
      rows: [
        ["Testing", "**Yes**", "A scripted model makes agent behaviour deterministic and free (lesson 11.3)"],
        ["An internal or self-hosted model", "**Yes**", "Your own gateway, your own auth, your own retry policy"],
        ["Adding caching or logging around a provider", "**Yes** — subclass the provider's class", "You get its behaviour and add yours in `generate_content_async`"],
        ["A provider LiteLLM already supports", "No", "`LiteLlm(model=…)` is one line and maintained (lesson 3.2)"],
        ["Changing generation parameters", "No", "That is `generate_content_config` (lesson 3.1)"],
        ["Falling back between providers", "No", "`FallbackModel` exists for exactly this (lesson 3.2)"]
      ] },

    { t: "code", lang: "python", title: "The subclass trick, which is usually what you actually want",
      code: `class CachedGemini(Gemini):
    """Gemini, with a cache in front of it."""

    async def generate_content_async(self, llm_request, stream=False):
        key = cache_key(llm_request)
        if (hit := await cache.get(key)) is not None:
            yield hit
            return
        async for response in super().generate_content_async(llm_request, stream):
            await cache.set(key, response)
            yield response`,
      caption: "Inheriting the provider's class means auth, retries and request translation keep working. Note that this caches at the model layer; `before_model_callback` (lesson 6.1) does the same job with access to the agent's context, and is usually the better place." },

    { t: "callout", kind: "tradeoff", title: "A model class or a callback?",
      body: [{ t: "p", text: "Both can intercept a model call. A callback sees the agent, the session and the state, and is per agent — right for anything that depends on *who is asking*, like a per-user cache or a guardrail. A model subclass sees only the request, and applies everywhere that model is used — right for provider-level concerns like a shared cache, a gateway, or instrumentation you want regardless of which agent made the call. If you find yourself needing session state inside a model class, you wanted a callback." }] },

    { t: "h2", n: "04", text: "Adding a live connection", id: "live" },

    { t: "p", text: "`generate_content_async` covers request-response. Bidirectional streaming (lesson 10.2) needs one more method: `connect`, returning an async context manager over a `BaseLlmConnection`. The base class raises `NotImplementedError` with the message `Live connection is not supported for {model}` — which is exactly the error you get from `run_live` on a model that has not implemented it." },

    { t: "code", lang: "python", title: "The connection interface, introspected",
      code: `class BaseLlmConnection:
    async def send_history(self, history: list[types.Content]) -> None: ...
    async def send_content(self, content: types.Content) -> None: ...
    async def send_realtime(self, blob: types.Blob) -> None: ...
    async def receive(self) -> AsyncGenerator[LlmResponse, None]: ...
    async def close(self) -> None: ...`,
      caption: "Three methods going up, one generator coming down, one to close. Implementing these against a scripted script is how lesson 10.2's BIDI trace was produced without a live-capable provider." },

    { t: "diagram", kind: "layers", title: "What a model class can support",
      caption: "Each row is optional on top of the one above. Most custom models only ever need the first two.",
      items: [
        { label: "supported_models()", sub: "the patterns the registry matches", tone: "accent" },
        { label: "generate_content_async()", sub: "request → responses; everything non-live", tone: "good" },
        { label: "connect()", sub: "returns a BaseLlmConnection — enables run_live", tone: "violet" },
        { label: "capabilities", sub: "what the runtime may assume about it", tone: "warn" }
      ] },

    { t: "callout", kind: "warn", title: "Registering is a global side effect",
      body: [{ t: "p", text: "`LLMRegistry.register` mutates process-wide state, so a pattern like `r\".*\"` — or an overly broad one such as `r\"gpt-.*\"` when something else already claims it — changes resolution for every agent in the process, including ones you did not write. Keep patterns specific, register at import time in one place rather than scattered through modules, and in tests prefer passing the model instance directly, which skips the registry entirely." }] },

    { t: "exercise", kind: "practice", title: "Write, register, resolve, run", difficulty: "advanced", minutes: 26,
      prompt: "Write a BaseLlm subclass that answers with the number of characters in the last user message, register it under a pattern of your choosing, and run an agent on it by model string. Confirm resolve() returns your class and that an unregistered name raises. Then subclass it to add a counter of how many times it was called, and check the count after a tool-using turn. Finally, pass an instance directly instead of a string and confirm the registry is not involved.",
      hints: [
        "`supported_models` is a static method returning regex strings.",
        "Count the calls to prove a tool-using turn makes more than one.",
        "Passing the instance is what every test in this course does."
      ],
      solution: {
        notes: [
          { t: "p", text: "The call counter is the part worth doing, because it makes a fact from lesson 10.1 concrete: a turn with one tool call invokes the model twice — once to choose the tool, once to answer with its result. People reason about agents as though a turn is one model call, and a counter in a fifteen-line model class disproves that in seconds." },
          { t: "p", text: "Passing the instance directly is also the answer to the global-state problem. Registration is process-wide, so tests that register patterns can interfere with each other; handing the agent a model object needs no registry entry at all and keeps each test self-contained." }
        ]
      } }

  ],

  takeaways: [
    "A model string is resolved by regex against registered classes — two Gemini ids both resolve to `Gemini`.",
    "An unregistered name raises `ValueError` at resolution, so a typo fails at construction rather than in production.",
    "`BaseLlm` requires two methods: `generate_content_async` and `supported_models`.",
    "A working custom model is about fifteen lines, and that is what every executed trace in this course runs on.",
    "Subclass a provider's class to wrap it; use a callback instead when you need the agent's context.",
    "`connect()` returning a `BaseLlmConnection` is what enables `run_live`; registration is process-wide, so keep patterns narrow."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why do gemini-2.5-pro and gemini-1.5-flash-002 resolve to the same class?",
      options: ["They are aliases", "supported_models() returns regex patterns, not names", "The registry falls back to Gemini", "Version suffixes are stripped first"],
      answer: 1,
      why: "Each class advertises patterns it answers to, so one `Gemini` class covers every id matching its patterns. That is what stops the registry needing a code change every time a provider publishes a new model id." },
    { stem: "What does BaseLlm require you to implement?",
      options: ["Only generate_content_async", "generate_content_async and supported_models", "generate_content_async, connect and capabilities", "A full provider client"],
      answer: 1,
      why: "An async generator yielding `LlmResponse` objects, and a static method returning the patterns the registry should match. `connect` is optional and only needed for live bidirectional streaming — the base class raises `NotImplementedError` for models that skip it." },
    { stem: "You want to add a per-user cache in front of the model. Model subclass or callback?",
      options: ["Model subclass — it sees every call", "before_model_callback — it has the session and the user", "Either works identically", "Neither; use generate_content_config"],
      answer: 1,
      why: "A model class sees only the request, so it has no idea who is asking. A callback has the context — user, session, state — which is exactly what a per-user key needs. Needing session state inside a model class is the signal that you wanted a callback." },
    { stem: "Why do the tests in this course pass a model instance rather than registering one?",
      options: ["Registration is slower", "Registration is process-wide, so tests could interfere with each other", "Instances support more features", "The registry rejects test models"],
      answer: 1,
      why: "`LLMRegistry.register` mutates global state, so a broad pattern registered by one test changes resolution for everything else in the process. Passing the instance skips the registry entirely and keeps each test self-contained." }
  ] },

  interview: { title: "Interview", sub: "Model implementation questions", questions: [
    { level: "Core", q: "How does ADK turn `model=\"gemini-2.5-pro\"` into something it can call?",
      strong: "`LLMRegistry.resolve` matches the string against regex patterns each registered class advertises.",
      answer: [{ t: "p", text: "Every model class implements `supported_models()` returning regex patterns, and the registry matches the string against them — which is why `gemini-2.5-pro` and `gemini-1.5-flash-002` both resolve to the same `Gemini` class, and why a new model id usually needs no code change. An unregistered name raises `ValueError` at resolution rather than at call time, so a typo fails when you construct the agent. You can also skip the registry entirely by passing a `BaseLlm` instance, which is what I do in tests." }] },
    { level: "Senior", q: "When would you write your own model class?",
      strong: "Tests, an internal or self-hosted model, or wrapping a provider — not for parameters, providers LiteLLM covers, or fallback.",
      answer: [{ t: "p", text: "Three good reasons. Testing, where a scripted model makes agent behaviour deterministic and free — it is about fifteen lines and it is how I would produce reproducible traces of tool dispatch, state deltas and callbacks without an API key. An internal or self-hosted model behind our own gateway with our own auth and retry policy. And wrapping a provider by subclassing its class, so auth and request translation keep working while I add caching or instrumentation. What I would push back on is writing one for something LiteLLM already drives, for changing generation parameters — that is `generate_content_config` — or for falling back between providers, since `FallbackModel` exists. And if the wrapper needs session state, it should have been a `before_model_callback`." }] },
    { level: "Senior", q: "What does it take to support bidirectional streaming in a custom model?",
      strong: "Implement `connect()` returning a `BaseLlmConnection` — three send methods, a receive generator and close.",
      answer: [{ t: "p", text: "`generate_content_async` only covers request-response; `run_live` calls `connect()`, and the base class raises `NotImplementedError` saying live is not supported for that model, which is precisely the error people hit. The connection interface is small: `send_history`, `send_content` and `send_realtime` going up, a `receive` async generator yielding responses coming down, and `close`. That is genuinely implementable against a script — I have driven `run_live` end to end with a fake connection, including an interruption where a realtime audio chunk arriving mid-answer produced an event with `interrupted=True`. Being able to do that matters beyond curiosity, because otherwise the whole live path is untestable without a live-capable provider and a microphone." }] }
  ] }
});
