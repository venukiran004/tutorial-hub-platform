/* ============================================================================
   LESSON 3.4 — The Registry, and Writing Your Own Model
   The resolutions, the ValueError, the registration and the working custom
   model are executed output from p1.py; the live-connection
   trace is from b1.py (google-adk 2.9.2).
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "**`model=\"gemini-4-carbon\"` is a lookup, and you can add entries to the table.** ADK resolves a model string to a class through a registry of regex patterns, which is how one field accepts Gemini, Claude, anything LiteLLM drives — and anything you write. That last case is not exotic: a model class is two methods, and the one every trace in this course was produced with is about fifteen lines. This lesson registers a working model, resolves it, runs an agent on it, and then adds the one method that makes live streaming possible.",

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

    { t: "code", lang: "python", title: "the registry's whole surface",
      code: `from google.adk.models.registry import LLMRegistry
print(inspect.signature(LLMRegistry.resolve))   # (model: str) -> type[BaseLlm]
print(inspect.signature(LLMRegistry.register))  # (llm_cls: type[BaseLlm]) -> None

for name in ["gemini-4-carbon", "gemini-3.5-flash-lite", "fake-model"]:
    print(LLMRegistry.resolve(name))` },

    { t: "out", text: `resolve('gemini-4-carbon') -> Gemini
resolve('gemini-3.5-flash-lite') -> Gemini
resolve('fake-model') -> ValueError: Model fake-model not found.` },

    { t: "p", text: "Two model ids that differ in version and family both resolve to the same class, because `Gemini.supported_models()` returns patterns rather than a list of names — which is what stops the registry needing an update every time a model id changes. An unregistered name raises `ValueError` at resolution, not later at call time, so a typo in a model string fails at agent construction rather than in production." },

    { t: "diagram", kind: "flow", title: "From a string to something that can be called",
      caption: "Passing a BaseLlm instance directly skips the registry entirely — which is how a fake model works in tests without registering anything.",
      cols: 4,
      nodes: [
        { id: "s", label: "model=\"gemini-4-carbon\"", sub: "a string on LlmAgent", tone: "accent" },
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

    {"kind": "tree", "title": "Model class or callback, and the subclass trick in between", "caption": "**Both can intercept a model call, and the question is what the interception depends on.** A callback sees the agent, the session and the state and applies per agent — right for anything that turns on *who is asking*, like a per-user cache or a guardrail. A model subclass sees only the request and applies everywhere that model is used — right for provider-level concerns: a shared cache, a gateway, instrumentation you want regardless of which agent made the call. **And the subclass trick is usually what people actually want:** extend the provider's own class, so you keep all of its behaviour and add yours in one method.", "root": {"label": "Something must happen around a model call", "sub": "what does it depend on?", "tone": "accent", "children": [{"label": "Who is asking", "sub": "the user, the session, this agent's state", "tone": "violet", "children": [{"label": "A callback", "sub": "before_model_callback - per agent", "tone": "violet"}]}, {"label": "Only the request", "sub": "and it should apply everywhere", "tone": "good", "children": [{"label": "Subclass the provider's class", "sub": "class CachedGemini(Gemini) - keep its behaviour", "tone": "good"}, {"label": "A fresh BaseLlm", "sub": "only for a model ADK cannot reach at all", "tone": "warn"}]}, {"label": "Nothing - you just need the provider", "sub": "LiteLlm(model=...) is one line", "tone": "teal"}]}, "t": "diagram", "id": "dg-3_4-03-1"},

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

    { t: "callout", kind: "trap", title: "Registering is a global side effect",
      body: [{ t: "p", text: "`LLMRegistry.register` mutates process-wide state, so a pattern like `r\".*\"` — or an overly broad one such as `r\"gpt-.*\"` when something else already claims it — changes resolution for every agent in the process, including ones you did not write. Keep patterns specific, register at import time in one place rather than scattered through modules, and in tests prefer passing the model instance directly, which skips the registry entirely." }] },

    { t: "h2", n: "05", text: "A real one: an open model behind BaseLlm", id: "local" },

    { t: "p", text: "The echo model proves the interface; this one earns its keep. `local_llm.py` puts a small open model — Qwen2.5-Instruct, run on CPU with Hugging Face `transformers` — behind `BaseLlm`, so any agent in this course can run without an API key. Several exercise solutions use it for their reference runs, which is why their outputs say *local Qwen2.5-3B*. The adapter has three jobs, and each is a translation between ADK's request shape and what the model's chat template expects." },

    { t: "table", head: ["ADK gives you", "The model needs", "local_llm.py does"],
      rows: [
        ["`config.system_instruction`", "A system message", "Flattens it to text and puts it first"],
        ["`contents` with text, `function_call` and `function_response` parts", "user / assistant / tool messages", "Maps each part to the chat-template role, keeping tool calls and results in order"],
        ["`config.tools` as `FunctionDeclaration`s", "JSON-schema tool definitions", "Converts each schema and passes them to `apply_chat_template(tools=...)`"],
        ["`config.response_schema`", "Nothing — it cannot be constrained", "Appends the schema to the system prompt and asks for JSON"],
        ["An `LlmResponse` back", "Raw generated text", "Parses `<tool_call>{json}</tool_call>` blocks into `function_call` parts, else returns text"]
      ] },

    { t: "code", lang: "python", title: "local_llm.py",
      code: `"""local_llm.py - run ADK agents on a small local model (Qwen2.5-Instruct) instead of Gemini.
Use: LlmAgent(model=LocalLlm(model="local-qwen-3b"), ...), or register it and pass the string "local-qwen-3b".
A 3B model's judgement is weaker than a production model's; the mechanisms each exercise measures are the same."""
import json, re, threading
import torch
from google.adk.models import BaseLlm
from google.adk.models.llm_response import LlmResponse
from google.genai import types
from transformers import AutoModelForCausalLM, AutoTokenizer, logging as hf_logging
hf_logging.set_verbosity_error(); hf_logging.disable_progress_bar()

REPOS = {"local-qwen-3b": "Qwen/Qwen2.5-3B-Instruct", "local-qwen-1.5b": "Qwen/Qwen2.5-1.5B-Instruct", "local-qwen-0.5b": "Qwen/Qwen2.5-0.5B-Instruct"}
_cache, _lock = {}, threading.Lock()

def _load(name):
    with _lock:
        if name not in _cache:
            tok = AutoTokenizer.from_pretrained(REPOS[name])
            dtype = torch.bfloat16 if name == "local-qwen-3b" else torch.float32          # 3B in bf16 fits in 8 GB of RAM
            mdl = AutoModelForCausalLM.from_pretrained(REPOS[name], torch_dtype=dtype).eval()
            _cache[name] = (tok, mdl)
    return _cache[name]

def _schema(s):
    """google.genai Schema -> plain JSON schema dict."""
    if s is None: return {"type": "object", "properties": {}}
    d = s.model_dump(exclude_none=True) if hasattr(s, "model_dump") else dict(s)
    def fix(x):
        if isinstance(x, dict):
            return {k: (v.lower() if k == "type" and isinstance(v, str) else fix(v)) for k, v in x.items()}
        if isinstance(x, list): return [fix(v) for v in x]
        return x
    return fix(d)

class LocalLlm(BaseLlm):
    model: str = "local-qwen-3b"
    max_new_tokens: int = 256
    calls: int = 0
    prompt_tokens: int = 0
    output_tokens: int = 0

    @staticmethod
    def supported_models():
        return [r"local-qwen-.*"]

    def _messages(self, req):
        msgs = []
        sys_text = req.config.system_instruction if req.config and req.config.system_instruction else ""
        if isinstance(sys_text, types.Content): sys_text = "".join(p.text or "" for p in sys_text.parts)
        schema = req.config.response_schema if req.config else None
        if schema is not None:     # Gemini enforces this by constrained decoding; a local model can only be told
            js = schema.model_json_schema() if hasattr(schema, "model_json_schema") else _schema(schema)
            sys_text = f"{sys_text}\\n\\nReply with a single JSON object matching this JSON schema, and nothing else:\\n{json.dumps(js)}"
        if sys_text: msgs.append({"role": "system", "content": str(sys_text)})
        for c in req.contents or []:
            for p in c.parts or []:
                if p.function_call:
                    msgs.append({"role": "assistant", "content": "", "tool_calls": [
                        {"type": "function", "function": {"name": p.function_call.name, "arguments": dict(p.function_call.args or {})}}]})
                elif p.function_response:
                    msgs.append({"role": "tool", "name": p.function_response.name,
                                 "content": json.dumps(p.function_response.response, default=str)})
                elif p.text:
                    msgs.append({"role": "assistant" if c.role == "model" else "user", "content": p.text})
        return msgs

    def _tools(self, req):
        out = []
        for t in (req.config.tools or []) if req.config else []:
            for fd in getattr(t, "function_declarations", None) or []:
                params = _schema(fd.parameters) if fd.parameters else (fd.parameters_json_schema or {"type": "object", "properties": {}})
                out.append({"type": "function", "function": {"name": fd.name, "description": fd.description or "", "parameters": params}})
        return out or None

    async def generate_content_async(self, llm_request, stream=False):
        tok, mdl = _load(self.model)
        msgs, tools = self._messages(llm_request), self._tools(llm_request)
        ids = tok.apply_chat_template(msgs, tools=tools, add_generation_prompt=True, return_tensors="pt", return_dict=True)["input_ids"]
        with torch.no_grad():
            out = mdl.generate(ids, max_new_tokens=self.max_new_tokens, do_sample=False)
        text = tok.decode(out[0, ids.shape[1]:], skip_special_tokens=True)
        self.calls += 1; self.prompt_tokens += ids.shape[1]; self.output_tokens += out.shape[1] - ids.shape[1]
        parts = []
        for m in re.finditer(r"<tool_call>\\s*(\\{.*?\\})\\s*</tool_call>", text, re.S):
            try:
                call = json.loads(m.group(1))
                parts.append(types.Part(function_call=types.FunctionCall(name=call["name"], args=call.get("arguments", {}))))
            except (json.JSONDecodeError, KeyError):
                pass
        if not parts:
            parts = [types.Part(text=re.sub(r"<tool_call>.*?(</tool_call>|$)", "", text, flags=re.S).strip() or text.strip())]
        yield LlmResponse(content=types.Content(role="model", parts=parts),
                          usage_metadata=types.GenerateContentResponseUsageMetadata(
                              prompt_token_count=ids.shape[1], candidates_token_count=out.shape[1] - ids.shape[1]))` },

    { t: "code", lang: "python", title: "smoke_3_4.py — register, resolve by string, run one tool-using turn",
      code: `"""Smoke test for local_llm.py: register, resolve by string, and run one tool-using turn on CPU."""
import asyncio, logging, time, warnings
warnings.filterwarnings("ignore"); logging.disable(logging.WARNING)
from google.adk.agents import LlmAgent
from google.adk.models.registry import LLMRegistry
from google.adk.runners import InMemoryRunner
from google.genai import types
from local_llm import LocalLlm

def get_order(order_id: str) -> dict:
    """Look up one order by its id (for example A-77): status and carrier."""
    return {"order_id": order_id, "status": "shipped", "carrier": "DPD"}

LLMRegistry.register(LocalLlm)
print("resolve('local-qwen-3b') ->", LLMRegistry.resolve("local-qwen-3b").__name__)
agent = LlmAgent(name="desk", model="local-qwen-3b", instruction="Answer order questions using the tools.", tools=[get_order])
llm = agent.canonical_model
print("canonical_model ->", type(llm).__name__, llm.model)

async def main():
    runner = InMemoryRunner(agent=agent, app_name="d")
    sid = (await runner.session_service.create_session(app_name="d", user_id="u")).id
    t0 = time.perf_counter()
    async for e in runner.run_async(user_id="u", session_id=sid,
                                    new_message=types.Content(role="user", parts=[types.Part(text="Where is order A-77?")])):
        for p in (e.content.parts if e.content else []):
            if p.function_call: print(f"  [{e.author}] function_call     {p.function_call.name}({dict(p.function_call.args)})")
            elif p.function_response: print(f"  [{e.author}] function_response {p.function_response.response}")
            elif p.text: print(f"  [{e.author}] text              {p.text.strip()}")
    print(f"model calls {llm.calls}, prompt tokens {llm.prompt_tokens}, output tokens {llm.output_tokens}, "
          f"{time.perf_counter() - t0:.0f}s on CPU")
asyncio.run(main())`,
      out: `resolve('local-qwen-3b') -> LocalLlm
canonical_model -> LocalLlm local-qwen-3b
  [desk] function_call     get_order({'order_id': 'A-77'})
  [desk] function_response {'order_id': 'A-77', 'status': 'shipped', 'carrier': 'DPD'}
  [desk] text              The order A-77 has been shipped and the carrier used is DPD.
model calls 2, prompt tokens 469, output tokens 42, 182s on CPU`,
      caption: "Two model calls for one turn: the first produced the tool call, ADK ran the tool, and the second turned the result into the answer. That loop is ADK's, not the adapter's — the adapter only translated in both directions. The time includes loading a 3B model on a laptop CPU; it is the reason course solutions accept a Gemini model name when a key is set." },

    { t: "callout", kind: "trap", title: "Told is not enforced",
      body: [{ t: "p", text: "Gemini honours `output_schema` with constrained decoding, so the reply comes back in the schema's shape. This adapter can only put the schema in the prompt, and a small model can add a sentence before the JSON or invent a field. Any agent you move to an adapter like this needs the schema validated after the call — the failure Lesson 6.4 measures with this adapter — and the same goes for tool calls: a malformed `<tool_call>` block is dropped and comes back as text, so a tool-use evaluation (Lesson 11.2) is how you find out how often it happens." }] },

    { t: "exercise", kind: "practice", title: "Write, register, resolve, run", difficulty: "advanced", minutes: 26,
      prompt: "Write a BaseLlm subclass that answers with the number of characters in the last user message, register it under a pattern of your choosing, and run an agent on it by model string. Confirm resolve() returns your class and that an unregistered name raises. Then subclass it to add a counter of how many times it was called, and check the count after a tool-using turn. Finally, pass an instance directly instead of a string and confirm the registry is not involved.",
      requirements: [
        "Write a BaseLlm subclass that answers with the character count of the last user message",
        "Register it, run an agent on it by model string, and confirm resolve() returns your class",
        "Confirm an unregistered name raises",
        "Add a call counter and check it after a tool-using turn",
        "Pass an instance directly and confirm the registry is not used"
      ],
      hints: [
        "`supported_models` is a static method returning regex strings.",
        "Count the calls to prove a tool-using turn makes more than one.",
        "Passing the instance is what every test in this course does."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import asyncio, logging, warnings
from google.adk.agents import LlmAgent
from google.adk.models import BaseLlm
from google.adk.models.llm_response import LlmResponse
from google.adk.models.registry import LLMRegistry
from google.adk.runners import InMemoryRunner
from google.genai import types
warnings.filterwarnings("ignore"); logging.disable(logging.WARNING)

class CharCountLlm(BaseLlm):
    """Answers with the number of characters in the last user message; asks for a tool when the user says 'clock'."""
    model: str = "charcount-v1"

    async def generate_content_async(self, llm_request, stream=False):
        last = llm_request.contents[-1]
        if any(p.function_response for p in last.parts):          # a tool result came back: finish the turn
            yield LlmResponse(content=types.Content(role="model", parts=[types.Part(text="The tool answered.")]))
            return
        text = "".join(p.text or "" for p in last.parts)
        if "clock" in text:
            yield LlmResponse(content=types.Content(role="model", parts=[
                types.Part(function_call=types.FunctionCall(name="now", args={}))]))
        else:
            yield LlmResponse(content=types.Content(role="model", parts=[types.Part(text=f"{len(text)} characters")]))

    @staticmethod
    def supported_models() -> list[str]:
        return [r"charcount-.*"]

class CountingLlm(CharCountLlm):
    calls: int = 0
    async def generate_content_async(self, llm_request, stream=False):
        self.calls += 1
        async for r in super().generate_content_async(llm_request, stream):
            yield r

LLMRegistry.register(CharCountLlm)
print("resolve('charcount-v1') ->", LLMRegistry.resolve("charcount-v1").__name__)
try:
    LLMRegistry.resolve("nothing-registered-1")
except ValueError as e:
    print("resolve('nothing-registered-1') ->", type(e).__name__, str(e)[:70])

def now() -> str:
    """The current time."""
    return "12:00"

async def ask(agent, msg):
    runner = InMemoryRunner(agent=agent, app_name="demo")
    s = await runner.session_service.create_session(app_name="demo", user_id="u")
    out = []
    async for e in runner.run_async(user_id="u", session_id=s.id, new_message=types.Content(role="user", parts=[types.Part(text=msg)])):
        if e.content and e.content.parts and e.content.parts[0].text: out.append(e.content.parts[0].text)
    return out

async def main():
    print("\\nby model string :", await ask(LlmAgent(name="a", model="charcount-v1"), "hello there"))
    counting = CountingLlm(model="charcount-counting")
    print("by instance     :", await ask(LlmAgent(name="b", model=counting, tools=[now]), "what does the clock say?"))
    print("model calls in that tool-using turn:", counting.calls, "(one to request the tool, one after its result)")

asyncio.run(main())`,
        out: `resolve('charcount-v1') -> CharCountLlm
resolve('nothing-registered-1') -> ValueError Model nothing-registered-1 not found.

by model string : ['11 characters']
by instance     : ['The tool answered.']
model calls in that tool-using turn: 2 (one to request the tool, one after its result)`,
       
        notes: [
          { t: "p", text: "The call counter is the part worth doing, because it makes a fact from lesson 10.1 concrete: a turn with one tool call invokes the model twice — once to choose the tool, once to answer with its result. People reason about agents as though a turn is one model call, and a counter in a fifteen-line model class disproves that in seconds." },
          { t: "p", text: "Passing the instance directly is also the answer to the global-state problem. Registration is process-wide, so tests that register patterns can interfere with each other; handing the agent a model object needs no registry entry at all and keeps each test self-contained." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a test model registered for every agent in the process",
      body: [
        { t: "p", text: "**Symptom.** After a test helper was imported into an application module, a production agent started answering with canned test responses." },
        { t: "p", text: "**Mechanism.** The helper registered a fake model class with the pattern `r\".*\"` at import time. The registry is process-wide, so every model string in the process resolved to the fake." },
        { t: "p", text: "**Fix.** Test models are passed as instances, which bypasses the registry, and registration happens in one module with specific patterns. A startup check resolves each configured model id and logs the class it got." }
      ] }
  ],

  takeaways: [
    "A model string is resolved by regex against registered classes — two Gemini ids both resolve to `Gemini`.",
    "An unregistered name raises `ValueError` at resolution, so a typo fails at construction rather than in production.",
    "`BaseLlm` requires two methods: `generate_content_async` and `supported_models`.",
    "A working custom model is about fifteen lines, and that is what every executed trace in this course runs on.",
    "Subclass a provider's class to wrap it; use a callback instead when you need the agent's context.",
    "`connect()` returning a `BaseLlmConnection` is what enables `run_live`; registration is process-wide, so keep patterns narrow.",
    "An adapter for an open model translates three things — messages, tool declarations and tool calls — and ADK's tool loop does the rest.",
    "A model that cannot constrain its output is only told the schema, so validate replies and evaluate tool calls after switching to it."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why do gemini-4-carbon and gemini-3.5-flash-lite resolve to the same class?",
      options: ["They are registered aliases of each other", "supported_models() returns regex patterns", "The registry silently falls back to Gemini", "Version suffixes are stripped before lookup"],
      answer: 1,
      why: "Each class advertises patterns it answers to, so one `Gemini` class covers every id matching its patterns. That is what stops the registry needing a code change every time a provider publishes a new model id." },
    { stem: "What does BaseLlm require you to implement?",
      options: ["Only generate_content_async", "generate_content_async and supported_models", "generate_content_async, connect and capabilities", "A complete provider client library"],
      answer: 1,
      why: "An async generator yielding `LlmResponse` objects, and a static method returning the patterns the registry should match. `connect` is optional and only needed for live bidirectional streaming — the base class raises `NotImplementedError` for models that skip it." },
    { stem: "You want to add a per-user cache in front of the model. Model subclass or callback?",
      options: ["Model subclass, because it sees every call", "before_model_callback: it has session and user", "Either; the two work identically here", "Neither; use generate_content_config instead"],
      answer: 1,
      why: "A model class sees only the request, so it has no idea who is asking. A callback has the context — user, session, state — which is exactly what a per-user key needs. Needing session state inside a model class is the signal that you wanted a callback." },
    { stem: "Why do the tests in this course pass a model instance rather than registering one?",
      options: ["Registration is much slower than passing one", "Registration is process-wide, so tests interfere", "Instances support more features than names", "The registry rejects models used in tests"],
      answer: 1,
      why: "`LLMRegistry.register` mutates global state, so a broad pattern registered by one test changes resolution for everything else in the process. Passing the instance skips the registry entirely and keeps each test self-contained." }
  ] },

  interview: { title: "Interview", sub: "Model implementation questions", questions: [
    { level: "Core", q: "How does ADK turn `model=\"gemini-4-carbon\"` into something it can call?",
      strong: "`LLMRegistry.resolve` matches the string against regex patterns each registered class advertises.",
      answer: [{ t: "p", text: "Every model class implements `supported_models()` returning regex patterns, and the registry matches the string against them — which is why `gemini-4-carbon` and `gemini-3.5-flash-lite` both resolve to the same `Gemini` class, and why a new model id usually needs no code change. An unregistered name raises `ValueError` at resolution rather than at call time, so a typo fails when you construct the agent. You can also skip the registry entirely by passing a `BaseLlm` instance, which is what I do in tests." }] },
    { level: "Senior", q: "When would you write your own model class?",
      strong: "Tests, an internal or self-hosted model, or wrapping a provider — not for parameters, providers LiteLLM covers, or fallback.",
      answer: [{ t: "p", text: "Three good reasons. Testing, where a scripted model makes agent behaviour deterministic and free — it is about fifteen lines and it is how I would produce reproducible traces of tool dispatch, state deltas and callbacks without an API key. An internal or self-hosted model behind our own gateway with our own auth and retry policy. And wrapping a provider by subclassing its class, so auth and request translation keep working while I add caching or instrumentation. What I would push back on is writing one for something LiteLLM already drives, for changing generation parameters — that is `generate_content_config` — or for falling back between providers, since `FallbackModel` exists. And if the wrapper needs session state, it should have been a `before_model_callback`." }] },
    { level: "Senior", q: "What does it take to support bidirectional streaming in a custom model?",
      strong: "Implement `connect()` returning a `BaseLlmConnection` — three send methods, a receive generator and close.",
      answer: [{ t: "p", text: "`generate_content_async` only covers request-response; `run_live` calls `connect()`, and the base class raises `NotImplementedError` saying live is not supported for that model, which is precisely the error people hit. The connection interface is small: `send_history`, `send_content` and `send_realtime` going up, a `receive` async generator yielding responses coming down, and `close`. That is genuinely implementable against a script — I have driven `run_live` end to end with a fake connection, including an interruption where a realtime audio chunk arriving mid-answer produced an event with `interrupted=True`. Being able to do that matters beyond curiosity, because otherwise the whole live path is untestable without a live-capable provider and a microphone." }] }
  ] }
});
