/* ============================================================================
   LESSON 3.2 — Multimodal, Other Providers and Fallbacks
   LiteLlm and the registry behaviour verified against google-adk 2.9.2 with
   the extensions extra installed.
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "**An agent's input is a `types.Content` with a list of parts, and a part can be text, an image, a PDF, audio or video — so multimodal input needs no special agent, only a different part.** And because the model is an object behind a `BaseLlm` interface, an agent can be driven by Claude, by a local Ollama model, or by anything LiteLLM supports, with the rest of the framework unchanged. This lesson covers sending non-text input, what each modality costs, the provider adapters ADK ships, and the honest limits of provider portability — tool calling and structured output are where agents built for one model stop working on another.",

  objectives: [
    "Send an image, a PDF or audio to an agent as a Part, inline or by URI",
    "Say what a document costs in tokens compared with the same content as text",
    "Use LiteLlm, Claude and Gemma adapters, and register a custom BaseLlm",
    "Name the three things that do not port cleanly between providers",
    "Decide between multimodal input and pre-processing to text"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "A message is a list of parts", id: "parts" },

    { t: "code", lang: "python", title: "Text, an image and a PDF in one turn",
      code: `from google.genai import types

msg = types.Content(role="user", parts=[
    types.Part(text="Which of these two invoices is overdue, and by how much?"),
    types.Part(inline_data=types.Blob(mime_type="image/png", data=png_bytes)),
    types.Part(file_data=types.FileData(mime_type="application/pdf",
                                        file_uri="gs://bucket/invoice-1042.pdf")),
])

async for event in runner.run_async(user_id="u1", session_id="s1", new_message=msg):
    ...`,
      caption: "Nothing about the agent changes. `inline_data` carries bytes in the request — fine up to a few megabytes; `file_data` references a URI the model can fetch, which is how large documents and video are handled. The Vertex AI backend accepts `gs://` URIs; the Gemini API path uses its own file service." },

    { t: "diagram", kind: "compare", title: "The three ways content reaches the model",
      caption: "Choose by size and reuse: inline for small one-off images, a file reference for anything large or re-used, and an artifact when the agent itself produced or needs to keep the file (lesson 6.3).",
      columns: [
        { title: "inline_data", tone: "accent", items: ["bytes in the request", "small images, short audio", "no storage to manage", "re-sent on every call it stays in context"] },
        { title: "file_data (URI)", tone: "good", items: ["a reference the model fetches", "large PDFs, video", "needs the model to have access", "cheaper to repeat"] },
        { title: "an ADK artifact", tone: "warn", items: ["saved through the artifact service", "versioned, per session or per user", "loaded by a tool or callback", "lesson 6.3"] }
      ] },

    { t: "dl", items: [
      ["Images", "Counted as a fixed number of tokens per tile, so a screenshot is comparable to a page of text. Excellent for layout questions — 'which field is empty on this form' — and wasteful for text you could have extracted."],
      ["PDFs and documents", "Handled natively by the Gemini models: pages become both text and images, so tables and stamps survive. This is usually better than your own text extraction, and always more expensive."],
      ["Audio", "Transcription and understanding in one step; the conversation-level equivalent is the live streaming path (lesson 10.2)."],
      ["Video", "Sampled at a frame rate plus the audio track; the most expensive modality by a wide margin, and the one where a URI reference rather than inline bytes is mandatory in practice."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Multimodal or pre-process",
      body: "A 40-page PDF sent to the model on every turn is re-read on every turn. If the agent needs one figure from it, extract that figure once in a tool and put the *answer* in state; if the agent needs to reason over the whole document's layout, send the document. The wrong choice is invisible until the bill arrives, because both work." },

    { t: "h2", n: "02", text: "Other providers", id: "providers" },

    { t: "code", lang: "python", title: "The adapters ADK ships",
      code: `from google.adk.models import Gemini, Claude, Gemma, LiteLlm, ApigeeLlm, FallbackModel
from google.adk.agents import LlmAgent

# 1. a first-party Claude model on Vertex AI: resolved from the string
a1 = LlmAgent(name="a1", model="claude-3-5-sonnet@20240620", instruction="…")

# 2. anything LiteLLM drives — OpenAI, Anthropic direct, Azure, Bedrock, Ollama, …
#    pip install "google-adk[extensions]"
a2 = LlmAgent(name="a2", model=LiteLlm(model="openai/gpt-4o"), instruction="…")
a3 = LlmAgent(name="a3", model=LiteLlm(model="ollama_chat/llama3.1"), instruction="…")

# 3. your own
class MyLlm(BaseLlm):
    @staticmethod
    def supported_models() -> list[str]:
        return [r"mycorp-.*"]
    async def generate_content_async(self, llm_request, stream=False):
        ...
LLMRegistry.register(MyLlm)`,
      caption: "`LiteLlm(model=…)` takes LiteLLM's provider-prefixed ids and passes extra kwargs through. `Claude` and `Gemma` are resolved from their patterns without an extra dependency; LiteLlm needs the extensions extra and raises a clear ImportError naming it if missing." },

    { t: "p", text: "The scripted model used throughout this course is the same mechanism: a `BaseLlm` subclass implementing `generate_content_async` as an async generator of `LlmResponse`. Anything that can produce those objects can drive an ADK agent, which is why testing without a network is straightforward (lesson 11.3)." },

    { t: "h2", n: "03", text: "What does not port", id: "portability" },

    { t: "diagram", kind: "matrix", title: "Where provider portability actually breaks",
      caption: "The framework ports; the behaviour does not. An agent tuned on one model will need its instruction, and sometimes its tool design, revisited on another.",
      rows: ["Agent, runner, sessions, events", "Tool calling", "Structured output", "Thinking / reasoning", "Multimodal input", "Built-in server-side tools"],
      cols: ["Ports cleanly?"],
      cells: [
        [{ text: "yes — framework code is provider-agnostic", tone: "good" }],
        [{ text: "mostly: supported widely, but reliability and parallel-call behaviour differ", tone: "warn" }],
        [{ text: "varies: native schema enforcement is not universal", tone: "warn" }],
        [{ text: "no: different models, different mechanisms — use PlanReActPlanner instead", tone: "crit" }],
        [{ text: "varies by provider and modality", tone: "warn" }],
        [{ text: "no: google_search and code execution are Gemini-side features", tone: "crit" }]
      ] },

    { t: "dl", items: [
      ["Tool calling", "The declaration format is normalised by the adapter, but how eagerly a model calls tools, whether it emits several calls in one turn, and how it behaves when a tool errors are all model-specific. An agent whose instruction was tuned for one model will over- or under-call on another."],
      ["Structured output", "`output_schema` leans on native support where it exists and on prompting where it does not; validation still happens, but failure rates differ."],
      ["Built-in tools", "`google_search`, `url_context` and built-in code execution run on Google's side of the API. They are not available behind LiteLLM — the portable equivalents are ordinary function tools calling a search API or a sandbox you run (lesson 4.4)."],
      ["Token accounting and limits", "Context windows, pricing units and rate-limit behaviour differ, which changes where compaction is needed and what a fallback should fall back to."]
    ] },

    { t: "h2", n: "04", text: "Fallback and degradation", id: "fallback" },

    { t: "code", lang: "python", title: "A fallback across providers",
      code: `resilient = FallbackModel(
    models=[Gemini(model="gemini-2.5-pro"),
            LiteLlm(model="anthropic/claude-3-5-sonnet-20241022")],
    retriable_status_codes=[429, 500, 503],
)`,
      caption: "Legitimate for availability, and a trap for behaviour: the second model has different tool-calling habits, so an agent that falls back is not the agent you evaluated. Record which model answered on every invocation (lesson 11.1), and evaluate the fallback path as its own configuration." },

    { t: "diagram", kind: "steps", title: "A sane multi-provider policy",
      caption: "Most teams that adopt a second provider do it for availability or cost, then discover the quality question afterwards. Deciding these four points first is cheaper.",
      items: [
        { label: "Name the reason", desc: "availability, cost, data residency or capability — each implies a different design", tone: "accent" },
        { label: "Keep tools portable", desc: "prefer function tools over server-side built-ins if a second provider is on the roadmap", tone: "good" },
        { label: "Evaluate per provider", desc: "the same evalset against each configuration; a fallback path is a configuration", tone: "warn" },
        { label: "Record the model on every answer", desc: "otherwise a silent degradation looks like a model regression", tone: "crit" }
      ] },

    { t: "exercise", kind: "practice", title: "Send a document, then decide against it", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "Write the code to ask an agent a question about a PDF two ways: (a) by sending the document as a Part on every turn; (b) by extracting the answer once in a tool and putting it in session state. Then state which you would ship for each of these: a one-off 'summarise this contract', a support agent that answers questions about the same 200-page manual all day, and an agent that checks whether a scanned form is signed." }],
      requirements: ["Both code paths", "A verdict for each of the three scenarios", "The cost argument stated in terms of what is re-sent"],
      hint: "Ask what changes between turns: the document or the question.",
      solution: { lang: "text", title: "Solution",
        code: `(a) one-off contract summary  → send the PDF. It is read once; extraction would only
    lose the layout, and there is no repetition to amortise.

(b) 200-page manual, all day  → do not send it. Index it once and give the agent a
    retrieval tool (module 7); sending 200 pages on every turn re-reads the whole
    manual to answer 'what is the warranty period'.

(c) is the form signed?       → send the image. The question is about pixels, and no
    text extraction can answer it. Keep the image out of the ongoing context after
    the check, or every later turn re-sends it.`,
        notes: [{ t: "p", text: "The rule behind all three: send the media when the question is about the media, and pre-process when the same media answers many questions. The failure mode is leaving a large part in the conversation after the turn that needed it, so it is re-sent for the rest of the session — one more argument for compaction (lesson 5.6)." }] } }
  ],

  takeaways: [
    "Multimodal input is a Part: text, inline_data bytes, or file_data pointing at a URI — the agent needs no change.",
    "Inline for small one-off media, a URI reference for large or repeated files, an ADK artifact when the agent owns the file.",
    "Documents are read natively by Gemini models, preserving layout — better than home-made extraction and always more expensive.",
    "The model is a BaseLlm object: Claude and Gemma resolve from strings, LiteLlm drives OpenAI, Azure, Bedrock and Ollama, and your own subclass can be registered.",
    "Framework code ports between providers; tool-calling behaviour, structured output reliability, thinking and built-in server-side tools do not.",
    "google_search and built-in code execution are Gemini-side features and have no LiteLLM equivalent — use function tools if portability matters.",
    "A FallbackModel keeps you available and silently changes behaviour: record which model answered, and evaluate the fallback path as its own configuration."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How do you send an image to an ADK agent?",
      options: ["Configure a multimodal agent class", "Add a Part with inline_data or file_data to the Content you pass as new_message", "Save it as an artifact first — there is no other way", "Encode it into the instruction"],
      answer: 1,
      why: "A message is a Content with a list of parts, and a part may carry bytes (inline_data) or a URI (file_data) alongside text. No agent configuration changes; the model's own multimodal support does the rest. Artifacts are for files the agent produces or must keep, which is a different concern." },
    { stem: "Which of these is NOT available when an agent runs on a non-Gemini model through LiteLLM?",
      options: ["Function tools", "Sessions and state", "The google_search built-in tool", "Callbacks"],
      answer: 2,
      why: "google_search, url_context and built-in code execution execute on Google's side of the model API, so they have no equivalent behind another provider. Everything in the framework itself — sessions, state, events, callbacks, function tools — is provider-agnostic." },
    { stem: "A support agent answers questions about the same 200-page manual all day. What should you do with the manual?",
      options: ["Send it as a Part on every turn", "Index it once and give the agent a retrieval tool", "Put it in the instruction", "Store it as an artifact and load it every turn"],
      answer: 1,
      why: "Sending it every turn re-reads 200 pages to answer a one-line question, and the cost repeats for every user and every message. Indexing once and retrieving the relevant passages is the whole argument for RAG — send the media when the question is about the media, and pre-process when one document answers many questions." },
    { stem: "You add a FallbackModel so quota errors do not fail invocations. What new risk have you introduced?",
      options: ["Higher latency only", "Silent quality change: the fallback model behaves differently and you cannot tell which answered unless you record it", "The session service breaks", "Tools stop working"],
      answer: 1,
      why: "A fallback succeeds — that is its purpose — so nothing errors. But the second model has different tool-calling and instruction-following behaviour, so the agent you evaluated is not the agent that answered. Recording the model per invocation turns an invisible degradation into a measurable one." }
  ] },

  interview: { title: "Interview", sub: "Model-portability questions", questions: [
    { level: "Core", q: "How would you add image input to an existing ADK agent?",
      strong: "Nothing changes on the agent: add an image Part to the Content passed as new_message, inline for small files or by URI for large ones.",
      answer: [{ t: "p", text: "A user message is a types.Content with a parts list, and a part can carry text, inline bytes with a mime type, or a file URI. So the change is entirely on the calling side: build the Content with an extra part and pass it to run_async. Small screenshots go inline; large documents and video go by URI so they are not re-uploaded in the request body. The only agent-side consideration is the model — it must be one that accepts that modality — and the only operational one is not leaving a large part in the conversation after the turn that needed it, because the history is re-sent on every subsequent call." }] },
    { level: "Core", q: "What does it take to run an ADK agent on a non-Google model?",
      strong: "Swap the model object for LiteLlm or another adapter; expect to revisit tool-calling behaviour, structured output and any built-in tools.",
      answer: [{ t: "p", text: "Mechanically it is one line: model=LiteLlm(model='openai/gpt-4o') instead of a Gemini string, with the extensions extra installed. The framework — agents, runner, sessions, events, callbacks, function tools — is provider-agnostic, so nothing else in the code changes. What does not carry over is behaviour: how eagerly the model calls tools, whether it issues several calls per turn, how reliably it produces schema-valid output, and its reasoning configuration. And the built-in tools that execute on Google's side — google_search, url_context, built-in code execution — simply do not exist elsewhere, so an agent that depends on them needs function-tool replacements. I would re-run the evalset against the new provider rather than assume parity." }] },
    { level: "Senior", q: "When is multimodal input the wrong answer even though it works?",
      strong: "When the same media answers many questions: pre-process once into state or an index rather than re-sending it every turn.",
      answer: [{ t: "p", text: "Multimodal input is right when the question is about the artefact — is this form signed, which field is empty, what does this chart show — because no extraction pipeline preserves what the model needs. It is wrong when one document serves many questions across many turns and users, because every turn re-sends and re-reads it, and the history keeps it in context afterwards. There the correct design is to process it once: extract, chunk and index for retrieval, or run a single extraction tool and keep the structured result in state. The tell is whether the media changes as often as the question does; if the question changes and the media does not, the media belongs behind a tool rather than in the prompt." }] }
  ] }
});
