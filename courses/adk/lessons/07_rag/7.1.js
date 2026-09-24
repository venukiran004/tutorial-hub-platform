/* ============================================================================
   LESSON 7.1 — RAG in ADK: Ingestion to Grounded Answer
   The retrieval tool, its generated declaration and the traced turn are
   executed output from scratchpad/adk/r1.py on google-adk 2.9.2. The
   BaseRetrievalTool docstring is quoted from the installed source.
   ========================================================================= */
EC.receiveLesson({
  id: "7.1",

  lede: "**In a RAG pipeline, retrieval is a stage you run. In an agent, retrieval is a tool the model may or may not call.** That one difference reorganises everything: there is no fixed step that always fetches context, so the model decides when to look and what to look for, and your job moves from orchestrating a chain to making a good tool and an instruction that says when to use it. Everything you know about chunking, embeddings and vector search still applies — it all lives behind the tool — but the failure modes change, and the most important new one is an agent that answers confidently without searching at all.",

  objectives: [
    "Map the classic RAG pipeline onto ADK components",
    "Build a retrieval tool and read the declaration ADK generates for it",
    "Explain why a retrieval miss must be a normal result rather than an error",
    "Instruct an agent to ground its answers and to admit when nothing matched",
    "Choose between a custom retrieval tool, Vertex AI RAG and a grounded built-in"
  ],

  prerequisites: ["4.1", "4.4"],

  blocks: [

    { t: "h2", n: "01", text: "The pipeline, and where it goes", id: "pipeline" },

    {"kind": "steps", "title": "The classic pipeline, and who owns each stage in ADK", "caption": "The first two stages happen before the agent exists. The last one has no equivalent in a pipeline at all, and it is where agentic RAG succeeds or fails.", "items": [{"label": "Ingest and chunk", "sub": "offline batch job — not an agent concern"}, {"label": "Embed and index", "sub": "offline, into a vector store"}, {"label": "Decide whether to search", "sub": "THE MODEL — your instruction, indirectly", "tone": "crit"}, {"label": "Embed query and search", "sub": "inside the tool's run_async", "tone": "good"}, {"label": "Chunks become an event", "sub": "the framework — auditable in the session", "tone": "accent"}, {"label": "Generate the answer", "sub": "the next model call in the same turn", "tone": "accent"}], "t": "diagram", "id": "dg-7_1-01-0"},



    { t: "table", head: ["Classic RAG stage", "In ADK", "Who owns it"],
      rows: [
        ["Ingest and chunk documents", "Offline, before the agent exists", "You — a batch job, not an agent concern"],
        ["Embed and index", "Offline, into a vector store", "You, or a managed corpus"],
        ["Embed the query, search", "Inside the retrieval tool's `run_async`", "You, or the managed service"],
        ["Assemble the prompt with context", "The framework — the tool result becomes an event", "ADK"],
        ["Generate the answer", "The next model call in the same turn", "ADK"],
        ["Decide **whether** to retrieve at all", "**The model**", "Your instruction, indirectly"]
      ] },

    { t: "callout", kind: "insight", title: "The last row is the whole lesson",
      body: [{ t: "p", text: "A pipeline retrieves on every request by construction. An agent retrieves when it decides to, which is better when the question does not need documents — no wasted search, no irrelevant chunks diluting the prompt — and worse when the model believes it already knows. Everything that follows is about making that decision go the right way: a tool whose description says exactly what is in the corpus, and an instruction that says answers must come from it." }] },

    { t: "h2", n: "02", text: "A retrieval tool", id: "tool" },

    { t: "code", lang: "python", title: "r1.py — retrieval over three documents",
      code: `from google.adk.tools.retrieval import BaseRetrievalTool

class TinyCorpus(BaseRetrievalTool):
    """A retrieval tool over three documents, so the wiring is visible."""

    def __init__(self):
        super().__init__(name="search_docs",
                         description="Searches the company policy documents.")

    async def run_async(self, *, args, tool_context):
        q = args["query"].lower()
        hits = [f"[{k}] {v}" for k, v in DOCS.items() if matches(q, k, v)]
        return "\\n".join(hits) if hits else "No matching document found."`,
      caption: "Subclassing `BaseRetrievalTool` rather than writing a plain function is what fixes the declaration — see below. In production the body would embed the query and hit a vector store; the shape is identical." },

    { t: "out", text: "declaration params: {'type': 'object', 'properties': {'query': {'type': 'string', 'description': 'The query to retrieve.'}}}" },

    { t: "p", text: "One parameter, a string, always. That constraint is deliberate and it is the most useful thing the base class does for you: every retrieval tool in your system presents the same interface to the model, so the model's job is reduced to writing a good query rather than guessing at filters, page sizes and result counts it has no basis for choosing." },

    { t: "callout", kind: "good", title: "The description is the routing logic",
      body: [{ t: "p", text: "\"Searches the company policy documents\" is what the model reads when deciding whether this tool can answer the question in front of it. In a system with three corpora — policies, product manuals, past tickets — the descriptions are the only thing distinguishing them, so write them as an index rather than a label: say what is in there, what is not, and roughly how current it is. A tool called `search` described as `searches documents` will be called for everything and will be right by luck." }] },

    { t: "h2", n: "03", text: "One grounded turn", id: "turn" },

    { t: "out", text: `=== naive RAG: retrieve once, answer ===
  call: search_docs {'query': 'refund policy'}
  retrieved: {'result': '[refund-policy] Refunds are issued within 14 days of purchase. Digital goods are non-refundable once downloaded.'}
  answer: Refunds are issued within 14 days, and digital goods are non-refundable once downloaded.
  queries issued: ['refund policy']` },

    { t: "p", text: "Three events, and the important one is the middle. The retrieved text is a **function response event** in the session, which means it is in the transcript: auditable now, replayed into subsequent turns, and available to whatever renders citations. Nothing was injected invisibly into a prompt — the context the model used is a thing you can point at in the log." },

    { t: "diagram", kind: "flow", title: "Retrieval inside a turn",
      caption: "Compare with the pipeline diagram in any RAG tutorial: the difference is the dashed decision, which a pipeline does not have and an agent cannot avoid.",
      cols: 3,
      nodes: [
        { id: "q", label: "User question", sub: "\"can I get a refund?\"", tone: "accent" },
        { id: "d", label: "Model decides", sub: "search, or answer from what it knows", tone: "warn" },
        { id: "r", label: "search_docs(query)", sub: "embed, search, return text", tone: "good" },
        { id: "e", label: "Function response event", sub: "in the session, auditable", tone: "violet" },
        { id: "a", label: "Model answers", sub: "second request, with the chunks in context" }
      ],
      edges: [["q", "d"], ["d", "r", "decides to search"], ["r", "e"], ["e", "a"]] },

    { t: "h2", n: "04", text: "A miss is a result, not an error", id: "miss" },

    { t: "code", lang: "python", title: "From the installed source of BaseRetrievalTool",
      code: `"""The base class for tools that retrieve data for a query.

Matching nothing is a normal outcome, not an error: \`run_async\` returns a
message saying no result was found rather than raising, so the model can act
on it and continue the turn.
"""`,
      caption: "Quoted verbatim from google-adk 2.9.2. It is rare for a docstring to state a design principle this directly, and it is worth taking seriously." },

    { t: "p", text: "If a miss raised, the turn would end in an error and the user would see a failure for a question the agent could have handled by saying \"I could not find anything about that\". Returning a sentence instead lets the model do something sensible: apologise, ask a clarifying question, or — as in the next lesson — search again with different words." },

    { t: "callout", kind: "trap", title: "An empty result is where hallucination starts",
      body: [{ t: "p", text: "A model handed \"No matching document found.\" and no instruction about what to do with it will frequently answer from its own weights, fluently and without hedging. This is the single most common RAG failure in production and it is invisible in testing, because the answer looks exactly like a good one. The instruction must say it explicitly — answer only from the documents, and say when nothing matched — and you should evaluate that behaviour deliberately (lesson 11.2) rather than assuming the sentence worked." }] },

    { t: "h2", n: "05", text: "What to use in production", id: "production" },

    {"kind": "matrix", "title": "Choosing a retriever", "caption": "Interception means a before_tool_callback fires and the query appears in your trace as an argument you can audit. Portability means the agent still works on another provider.", "cols": ["You run it", "Interceptable", "Citations"], "rows": ["FilesRetrieval", "Your BaseRetrievalTool", "VertexAiRagRetrieval", "google_search"], "cells": [[true, true, {"text": "you add ids", "tone": "warn"}], [true, true, {"text": "you add ids", "tone": "warn"}], [false, true, {"text": "from the corpus", "tone": "good"}], [false, false, {"text": "grounding metadata", "tone": "good"}]], "t": "diagram", "id": "dg-7_1-05-1"},



    { t: "table", head: ["Option", "What it is", "When"],
      rows: [
        ["`FilesRetrieval`", "Retrieval over local files, via LlamaIndex", "Prototypes, small fixed corpora, getting the wiring right"],
        ["`LlamaIndexRetrieval`", "Any LlamaIndex retriever behind the same interface", "You already have a LlamaIndex stack"],
        ["`VertexAiRagRetrieval`", "A managed Vertex AI RAG corpus", "Production on Google Cloud without running a vector store"],
        ["Your own `BaseRetrievalTool`", "Whatever you have — pgvector, Elasticsearch, an internal search API", "Most enterprises, because the corpus already exists somewhere"],
        ["`google_search` / `url_context`", "Grounded built-ins with citation metadata", "Public information rather than your documents (lesson 4.4)"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Retrieval quality is not an ADK concern",
      body: [{ t: "p", text: "Chunk size, overlap, embedding model, hybrid search, reranking — none of that is in ADK, and none of it changes when you move a retriever behind a tool. That is good news and a warning. Good, because your existing search investment transfers intact. A warning, because no amount of agent design rescues a corpus that does not contain the answer, and 'the agent is wrong' is far more often a retrieval problem than a prompting one. Measure recall on your corpus before you tune instructions." }] },

    { t: "h2", n: "06", text: "Citations", id: "citations" },

    { t: "p", text: "The prefix `[refund-policy]` in the retrieved text is not decoration — it is the cheapest citation mechanism there is. Return the document id with each chunk, instruct the model to name the documents it used, and the answer arrives attributable. For the built-in grounded tools the provider gives you structured grounding metadata instead (lesson 4.4), which is richer; for your own corpus, an id in the text is enough to start, and it is what makes a wrong answer diagnosable." },

    { t: "exercise", kind: "practice", title: "Build the smallest honest RAG agent", difficulty: "advanced", minutes: 28,
      prompt: "Write a BaseRetrievalTool over five short documents with ids. Give the agent an instruction that requires answers to come from retrieved text and to name the source. Run three questions: one clearly answerable, one answerable only by combining two documents, and one with no answer in the corpus. Record what happens in each case, especially the third. Then remove the 'say when nothing matched' sentence from the instruction and run the third question again.",
      hints: [
        "Keep the retrieval deliberately dumb — you are testing the agent's behaviour, not your search.",
        "The two-document question is the one that motivates the next lesson.",
        "Run the third question several times; the failure is probabilistic, which is the point."
      ],
      solution: {
        notes: [
          { t: "p", text: "The first question works and proves the wiring. The third is the one to dwell on: with the instruction, you should get an honest 'nothing in the documents covers that'; without it, you will fairly often get a confident answer drawn from the model's own knowledge, phrased exactly like the grounded one. That is the whole argument for evaluating groundedness rather than eyeballing answers — the two are indistinguishable by inspection." },
          { t: "p", text: "The two-document question usually exposes a single-retrieval agent's limit: one query returns one document's chunks, and the model answers from half the picture without noticing it had half. Nothing in the naive wiring encourages a second search, which is exactly what agentic RAG adds and what the next lesson measures." }
        ]
      } }

  ],

  takeaways: [
    "In ADK, retrieval is a tool the model chooses to call, not a stage that always runs.",
    "`BaseRetrievalTool` fixes the declaration to a single `query` string, so every corpus looks the same to the model.",
    "The tool's description is the routing logic — describe what is in the corpus, not that it is a corpus.",
    "Retrieved text becomes a function-response event, so the context used is auditable in the transcript.",
    "A miss returns a message rather than raising, and the instruction must say what to do with it.",
    "Chunking, embeddings and reranking live behind the tool unchanged — retrieval quality is still a retrieval problem."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is the main structural difference between a RAG pipeline and RAG in an agent?",
      options: ["Agents cannot use vector stores", "The agent decides whether to retrieve at all", "Agents retrieve after generating", "Chunking happens at query time"],
      answer: 1,
      why: "A pipeline retrieves unconditionally; an agent calls a tool when it decides to. That saves a search on questions that do not need one, and it introduces the failure mode where the model answers from its own weights without looking — which is why the tool description and the instruction carry so much weight." },
    { stem: "Why does BaseRetrievalTool fix the declaration to a single query string?",
      options: ["To keep the schema small", "So every retrieval tool presents the same interface and the model only writes a query", "Because vector stores accept one argument", "To prevent injection"],
      answer: 1,
      why: "The model has no sound basis for choosing filters, result counts or page sizes, and offering them invites arbitrary values. Reducing every corpus to one string means the model's only job is writing a good query, and it means three different corpora in one agent are distinguished by their descriptions rather than by their signatures." },
    { stem: "Retrieval finds nothing. What does the tool return?",
      options: ["It raises a RetrievalError", "None", "A message saying nothing was found", "An empty list"],
      answer: 2,
      why: "The base class docstring states it outright: matching nothing is a normal outcome, so `run_async` returns a message and the turn continues. That lets the model apologise, ask for clarification, or rephrase and search again — all of which are impossible if the turn has already ended in an exception." },
    { stem: "Your agent gives a fluent, wrong answer about a topic absent from the corpus. What is the first fix?",
      options: ["A larger model", "An instruction requiring answers to come from retrieved text, plus an evaluation of groundedness", "More chunks per query", "A lower temperature"],
      answer: 1,
      why: "The model filled a gap from its own weights, which is what models do unless told otherwise. The instruction has to make grounding explicit, and because a fluent ungrounded answer is indistinguishable from a grounded one by inspection, the behaviour needs measuring rather than assuming. Bigger models hallucinate more persuasively, not less." }
  ] },

  interview: { title: "Interview", sub: "RAG questions", questions: [
    { level: "Core", q: "How is RAG different when you build it with an agent framework?",
      strong: "Retrieval becomes a tool the model may call rather than a mandatory stage, which trades wasted searches for the risk of no search at all.",
      answer: [{ t: "p", text: "In a classic pipeline every request embeds the query, searches, and stuffs the chunks into the prompt. In ADK the retriever is a tool, so the model decides. That is genuinely better for questions that do not need documents, and it lets the model search several times or search differently after a miss. The cost is a new failure mode: an agent that believes it already knows the answer never calls the tool, and you get a confident ungrounded response. So the design work moves to the tool's description, which is what the model routes on, and to an instruction that makes grounding a requirement." }] },
    { level: "Core", q: "Where does chunking and embedding live in an ADK RAG system?",
      strong: "Entirely behind the tool, offline for ingestion and inside run_async for the query — ADK has no opinion about any of it.",
      answer: [{ t: "p", text: "Ingestion, chunking and indexing are a batch job that has nothing to do with the agent. At query time, the tool's `run_async` embeds the query and searches whatever store you use — pgvector, Elasticsearch, a Vertex AI RAG corpus — and returns text. Nothing about that changes when you put it behind a tool, which is the good news: existing search infrastructure transfers as-is. It is also worth saying plainly in an interview that agent design does not fix retrieval quality. If the corpus does not contain the answer or the retriever does not surface it, no instruction will help, and I would measure recall before touching prompts." }] },
    { level: "Senior", q: "Your RAG agent is confidently wrong about a quarter of the time. How do you diagnose it?",
      strong: "Split it into retrieval failure and grounding failure, because the fixes are unrelated — read the transcripts to tell them apart.",
      answer: [{ t: "p", text: "The transcripts settle it, because the retrieved text is a function-response event rather than something injected invisibly into a prompt. For each wrong answer I ask two questions. Did the tool get called at all, and did it return the right chunks? If the answer came back with no search, or with a miss, that is a grounding failure: the model filled the gap from its own weights, and the fix is in the instruction and in evaluating groundedness with a labelled set. If the chunks were returned and the answer still contradicts them, that is also grounding, and usually a sign the context is too diluted — too many chunks, or a long conversation competing for attention. But if the right document never surfaced, no amount of prompting helps and I go to the retrieval side: recall on a labelled query set, chunk size, whether the query the model wrote resembles the language of the corpus. The reason to separate these before changing anything is that teams reliably spend a fortnight on prompts for what turns out to be a chunking problem." }] }
  ] }
});
