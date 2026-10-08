/* ============================================================================
   LANGCHAIN & LANGGRAPH — CURRICULUM
   ----------------------------------------------------------------------------
   Mirrors 08_LangChain_and_LangGraph/ file for file and section for section.

     M1   01_LangChain_Notes.md            §1-4, §16   -> 1.1-1.8
     M2   01_LangChain_Notes.md            §5-6, §11   -> 2.1-2.9
     M3   01_LangChain_Notes.md            §7-9        -> 3.1-3.8
     M4   01_LangChain_Notes.md §12-15,17,19
            + 15_LangChain_Failure_Handling.md         -> 4.1-4.8
     M5   01_LangChain_Notes.md §10,18
            + 17_RAG_Implementation_LangChain.md §1-3  -> 5.1-5.8
     M6   17_RAG_Implementation_LangChain.md §2,4-12   -> 6.1-6.9
     M7   16_RAG_Failure_Handling.md, 41_RAG_in_Production.md,
            27_Context_Engineering…, 20_Multimodal_RAG…,
            47_Scaling_Optimization_RAG.md             -> 7.1-7.9
     M8   02_LangGraph_Notes.md            §1-4        -> 8.1-8.9
     M9   02_LangGraph_Notes.md            §5,5.5,6,7,15 -> 9.1-9.9
     M10  02_LangGraph_Notes.md            §8-10,12,13,16,17 -> 10.1-10.9
     M11  18_Agent_Implementation_Cookbook.md §0-6,10
            + 11_Agentic_Systems_and_Patterns.md Part I -> 11.1-11.8
     M12  11_… §6, 18_… §7-9, 19_Orchestrator_vs_Supervisor.md -> 12.1-12.8
     M13  12_Context_Management_and_Summarization.md    -> 13.1-13.6
     M14  14_Failure_Handling_and_Resilience.md, 45_…Stepwise…,
            43_Agent_Evaluation.md, 40_…Failure_Modes.md,
            26/48/49 scaling, 21_…Production_Lenses.md  -> 14.1-14.10

     PRACTICE track (Practice/01_LangChain_LangGraph_Programs.md — 50 programs;
       Practice/Agentic_AI_Scenarios_Part01-10.md — 500 scenarios)

     INTERVIEW track (00_Interview_Bank/01, /02, /10, questions.md,
       23/24/25/27 technical QA, 31_Client_Round, 28_Terminology)

   HOW THE CODE IN THIS COURSE IS VERIFIED
   ---------------------------------------
   This environment has langchain-core 1.4.7 and langgraph 1.2.5 installed and
   no provider package or API key. That is enough to run almost everything:
   chains, runnables, parsers, tools, graphs, reducers, checkpointers, stores,
   interrupts, streaming and the retrieval stack (faiss, chromadb, rank-bm25,
   sentence-transformers) all execute locally.

   The model itself is replaced by a scripted `FakeChatModel(BaseChatModel)`
   that returns a fixed list of responses and records every prompt it was
   given — the same technique the ADK course uses. Nothing about the graph,
   the state, the routing or the tool protocol is faked; only the token
   generation is, which means a printed trace is a real trace.

   Two limits are stated wherever they apply. The `langchain` umbrella package
   installed here is 0.2.10 and does not import against core 1.4.7, so the
   LangChain 1.0 `create_agent` / middleware API is presented from the
   reference rather than executed. And anything whose output depends on a real
   model's judgement — the content of a reflection, whether a router picks the
   right branch — is scripted by construction, so those lessons show the
   mechanism and say plainly that the decision is the model's.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "langchain",
    title: "LangChain and LangGraph",
    short: "LangChain",
    blurb: "Composition, state and control flow for LLM applications: the Runnable protocol and LCEL, retrieval from a baseline pipeline to hybrid search and reranking, LangGraph's state machine with checkpoints and human-in-the-loop, the agent patterns from ReAct to swarm, context engineering, and the failure modes that appear once an agent can act.",

    trackLabels: { learn: "LangChain and LangGraph", practice: "Scenarios", interview: "Interview" },
    trackBlurbs: {
      learn: "The reference notes, section by section — every graph, chain and retriever executed here against a scripted model, with the output shown.",
      practice: "The reference's 50 runnable programs and 500 agentic scenarios, answers folded away.",
      interview: "The LangChain, LangGraph and agentic banks plus the technical Q&A files, answers hidden until you ask."
    },

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8", "9.9"],

    modules: [

      /* ================================================================
         M1 · 01_LangChain_Notes.md §1–4, §16
         ================================================================ */
      {
        id: "core",
        short: "M1",
        dir: "01_core",
        phase: "Phase 1 · The composition layer",
        title: "What LangChain Actually Is",
        blurb: "A framework whose whole idea is one interface. Chat models behind a common protocol, prompts as templates rather than f-strings, output parsed into types you can act on, structured output when the parse has to succeed, the handful of core objects every other part of the library passes around — and an honest account of when a plain SDK call is the better answer.",
        outcome: "You can name the Runnable protocol's methods, build a prompt-to-model-to-parser chain, get a typed object back from a model, and say when the framework is earning its dependency.",
        source: "01_LangChain_Notes.md",
        lessons: [
          { id: "1.1", title: "The Problem LangChain Solves", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "One interface over many providers, and the composition that interface buys — built by writing the interface by hand first, so the abstraction has something to be an abstraction over.",
            keywords: ["runnable", "architecture", "abstraction", "provider", "interface", "composition"] },
          { id: "1.2", title: "Chat Models and the Message Protocol", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "System, human, AI and tool messages, what invoke, batch and stream each guarantee, and the scripted model this course uses to run every later example without a key.",
            keywords: ["chat model", "messages", "invoke", "batch", "stream", "BaseChatModel"] },
          { id: "1.3", title: "Prompt Templates", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Why a template is not an f-string: partials, MessagesPlaceholder, few-shot templates, and the injection surface a naive format call leaves open.",
            keywords: ["ChatPromptTemplate", "partial", "MessagesPlaceholder", "few-shot", "formatting"] },
          { id: "1.4", title: "Output Parsers", difficulty: "core", minutes: 28, tier: "must",
            summary: "Turning a string into something your code can branch on — str, JSON, list and datetime parsers, and the two parsers whose job is to recover from the first one failing.",
            keywords: ["output parser", "StrOutputParser", "JsonOutputParser", "retry parser", "fixing parser"] },
          { id: "1.5", title: "Structured Output", difficulty: "core", minutes: 32, tier: "must",
            summary: "with_structured_output and a Pydantic schema, the three mechanisms a provider might use underneath, and what to do on the requests where it still comes back wrong.",
            keywords: ["structured output", "pydantic", "schema", "json mode", "function calling", "validation"] },
          { id: "1.6", title: "The Core Type Vocabulary", difficulty: "core", minutes: 26, tier: "should",
            summary: "Document, embedding, retriever, tool, callback — the objects every other module passes around, defined once so later lessons can assume them.",
            keywords: ["Document", "metadata", "embeddings", "retriever", "vocabulary", "types"] },
          { id: "1.7", title: "Writing Custom Components", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "A custom Runnable, parser and chat model, which is both a useful skill and the clearest way to see what the protocol actually requires of an implementer.",
            keywords: ["custom runnable", "RunnableLambda", "BaseChatModel", "subclass", "protocol"] },
          { id: "1.8", title: "When Not to Use a Framework", difficulty: "core", minutes: 28, tier: "must",
            summary: "The cases where a provider SDK and forty lines of your own code is the better engineering decision, and the specific things you give up by taking it.",
            keywords: ["trade-off", "dependency", "abstraction cost", "sdk", "decision"] }
        ]
      },

      /* ================================================================
         M2 · 01_LangChain_Notes.md §5–6, §11
         ================================================================ */
      {
        id: "lcel",
        short: "M2",
        dir: "02_lcel",
        phase: "Phase 1 · The composition layer",
        title: "LCEL and the Runnable Protocol",
        blurb: "The expression language that makes LangChain worth importing. The pipe operator and what it actually constructs, running steps in parallel, moving data between steps without a lambda soup, branching, fallbacks and retries attached to any step, streaming that works through a whole chain, and configuration changed at call time.",
        outcome: "You can compose a non-trivial chain with parallel branches, routing and fallbacks, stream it token by token, and explain what each operator built.",
        source: "01_LangChain_Notes.md",
        lessons: [
          { id: "2.1", title: "The Runnable Interface", difficulty: "core", minutes: 30, tier: "must",
            summary: "Six methods and one type parameter — the contract every chain, model, parser and retriever satisfies, and why uniformity is what makes the pipe possible.",
            keywords: ["Runnable", "invoke", "batch", "stream", "ainvoke", "protocol", "interface"] },
          { id: "2.2", title: "The Pipe: How LCEL Composes", difficulty: "core", minutes: 32, tier: "must",
            summary: "What `|` builds, how a RunnableSequence executes, and why the chain you wrote is a data structure you can inspect before you run it.",
            keywords: ["LCEL", "pipe", "RunnableSequence", "composition", "graph"] },
          { id: "2.3", title: "Running Steps in Parallel", difficulty: "core", minutes: 28, tier: "must",
            summary: "RunnableParallel, what it does to latency, and the measurement that shows when the parallelism is real and when it is bookkeeping.",
            keywords: ["RunnableParallel", "concurrency", "latency", "fan-out", "dict"] },
          { id: "2.4", title: "Passthrough, Assign and Data Plumbing", difficulty: "core", minutes: 30, tier: "must",
            summary: "Getting the original input to a later step, adding a key without losing the rest, and the chain shapes these two primitives make readable.",
            keywords: ["RunnablePassthrough", "assign", "itemgetter", "plumbing", "dict"] },
          { id: "2.5", title: "Branching and Routing", difficulty: "core", minutes: 30, tier: "should",
            summary: "RunnableBranch and routing by a function, what each costs in readability, and the point at which a router should become a graph instead.",
            keywords: ["RunnableBranch", "routing", "conditional", "dispatch"] },
          { id: "2.6", title: "Fallbacks and Retries", difficulty: "core", minutes: 30, tier: "must",
            summary: "with_retry and with_fallbacks on any runnable, the order they compose in, and the trace that shows what actually ran when the first attempt failed.",
            keywords: ["with_retry", "with_fallbacks", "resilience", "backoff", "order"] },
          { id: "2.7", title: "Streaming Through a Chain", difficulty: "core", minutes: 32, tier: "must",
            summary: "What streams and what cannot, how a parser in the middle of a chain breaks it, and the two APIs that stream events rather than tokens.",
            keywords: ["stream", "astream", "astream_events", "chunks", "token"] },
          { id: "2.8", title: "Async and Batching", difficulty: "core", minutes: 28, tier: "should",
            summary: "The async half of the protocol, what batch concurrency actually does, and the mistake of awaiting a loop where a batch would do.",
            keywords: ["async", "ainvoke", "abatch", "concurrency", "max_concurrency"] },
          { id: "2.9", title: "Configuration at Runtime", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "configurable_fields and configurable_alternatives — changing a model, a temperature or a prompt per call without rebuilding the chain.",
            keywords: ["ConfigurableField", "configurable_alternatives", "with_config", "runtime"] }
        ]
      },

      /* ================================================================
         M3 · 01_LangChain_Notes.md §7–9
         ================================================================ */
      {
        id: "agents",
        short: "M3",
        dir: "03_agents",
        phase: "Phase 1 · The composition layer",
        title: "Tools, Agents and Memory",
        blurb: "The point where a chain stops being a pipeline and starts making decisions. Defining a tool so a model can call it, the tool-calling protocol underneath, the agent loop written by hand before any prebuilt is used, the memory abstractions and their limits, and the question of whether the decision needs a model at all.",
        outcome: "You can write a tool, run the full call-execute-return loop yourself, and justify the choice between a chain and an agent on something other than taste.",
        source: "01_LangChain_Notes.md",
        lessons: [
          { id: "3.1", title: "Defining a Tool", difficulty: "core", minutes: 30, tier: "must",
            summary: "The @tool decorator, what the docstring is actually for, argument schemas, and why a tool description is a prompt you forgot you were writing.",
            keywords: ["tool", "@tool", "args_schema", "docstring", "description"] },
          { id: "3.2", title: "The Tool-Calling Protocol", difficulty: "core", minutes: 32, tier: "must",
            summary: "bind_tools, the tool_calls field on an AI message, the ToolMessage that answers it, and the id that ties the two together — traced through a real round trip.",
            keywords: ["bind_tools", "tool_calls", "ToolMessage", "tool_call_id", "protocol"] },
          { id: "3.3", title: "The Agent Loop, From Scratch", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Thirty lines that are the whole idea: call, check for tool calls, execute, append, repeat. Written by hand so every prebuilt agent afterwards is recognisable.",
            keywords: ["agent loop", "ReAct", "from scratch", "iteration", "termination"] },
          { id: "3.4", title: "Prebuilt Agents and Middleware", difficulty: "core", minutes: 32, tier: "should",
            summary: "What the prebuilt constructors give you over the hand-written loop, the middleware hooks the 1.0 API adds, and which of this runs in this environment.",
            keywords: ["create_agent", "create_react_agent", "middleware", "hooks", "prebuilt"] },
          { id: "3.5", title: "Memory and Its Limits", difficulty: "core", minutes: 30, tier: "must",
            summary: "The conversation buffer, why it is the wrong default past a few turns, and the arithmetic that says when it stops being affordable.",
            keywords: ["memory", "buffer", "history", "context window", "cost"] },
          { id: "3.6", title: "Message History and Trimming", difficulty: "core", minutes: 28, tier: "must",
            summary: "RunnableWithMessageHistory, trim_messages and the strategies for deciding what to drop — measured against what the model then cannot answer.",
            keywords: ["RunnableWithMessageHistory", "trim_messages", "session", "truncation"] },
          { id: "3.7", title: "Agent Failure Modes", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Loops that do not terminate, tools called with garbage, the model narrating a call it never made — each reproduced, then guarded.",
            keywords: ["loop", "max_iterations", "hallucinated tool", "guard", "failure"] },
          { id: "3.8", title: "Chains or Agents: Choosing", difficulty: "core", minutes: 28, tier: "must",
            summary: "The decision rule, the cost difference measured on the same task, and the cases where an agent is a more expensive way to be less reliable.",
            keywords: ["decision", "chain", "agent", "determinism", "cost", "trade-off"] }
        ]
      },

      /* ================================================================
         M4 · 01_LangChain_Notes.md §12–15, §17, §19 + 15_LangChain_Failure_Handling.md
         ================================================================ */
      {
        id: "production",
        short: "M4",
        dir: "04_production",
        phase: "Phase 1 · The composition layer",
        title: "Running LangChain in Production",
        blurb: "Everything between a chain that works on your machine and one that works on traffic: the callback system and what it can see, tracing, caching, token accounting, rate limiting, the order retries and fallbacks compose in, the guardrails, and how to test something whose output is not deterministic.",
        outcome: "You can instrument a chain, bound its cost, make it survive a flaky provider, and write a test suite for it that is not just a snapshot.",
        source: "01_LangChain_Notes.md + 15_LangChain_Failure_Handling.md",
        lessons: [
          { id: "4.1", title: "Callbacks and the Event Stream", difficulty: "core", minutes: 30, tier: "should",
            summary: "The handler interface, the events a run emits, and a working token-and-latency recorder built from it in one class.",
            keywords: ["callbacks", "BaseCallbackHandler", "events", "on_llm_start", "instrumentation"] },
          { id: "4.2", title: "Tracing", difficulty: "core", minutes: 28, tier: "should",
            summary: "What a trace of a chain contains, the span tree a nested chain produces, and the attributes worth attaching before you need them.",
            keywords: ["LangSmith", "tracing", "spans", "run tree", "observability"] },
          { id: "4.3", title: "Caching", difficulty: "core", minutes: 28, tier: "should",
            summary: "Exact-match and semantic caching, the hit rate each gets on realistic traffic, and the staleness problem that comes with the second.",
            keywords: ["cache", "InMemoryCache", "semantic cache", "hit rate", "staleness"] },
          { id: "4.4", title: "Token Counting and Cost", difficulty: "core", minutes: 30, tier: "must",
            summary: "Counting before you send, where the tokens actually go in a chain, and the per-request budget that turns a cost question into a code path.",
            keywords: ["tokens", "tiktoken", "cost", "budget", "accounting"] },
          { id: "4.5", title: "Rate Limiting", difficulty: "core", minutes: 26, tier: "should",
            summary: "InMemoryRateLimiter as a token bucket, what it does to latency under load, and why client-side limiting is cheaper than handling 429s.",
            keywords: ["rate limit", "token bucket", "InMemoryRateLimiter", "429", "throttle"] },
          { id: "4.6", title: "Retries, Fallbacks and Their Order", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Why with_retry inside with_fallbacks behaves differently from the reverse, traced on a chain that fails on purpose.",
            keywords: ["retry", "fallback", "order", "composition", "resilience"] },
          { id: "4.7", title: "Security and Guardrails", difficulty: "core", minutes: 30, tier: "must",
            summary: "Prompt injection through inputs and through retrieved documents, output filtering, secret handling, and what a guardrail can and cannot promise.",
            keywords: ["prompt injection", "guardrails", "sanitisation", "secrets", "security"] },
          { id: "4.8", title: "Testing a Chain", difficulty: "core", minutes: 32, tier: "must",
            summary: "Deterministic tests with a scripted model, property tests for the parts that must always hold, and the eval set for the part that cannot be asserted.",
            keywords: ["testing", "fake model", "deterministic", "eval", "assertions"] }
        ]
      },

      /* ================================================================
         M5 · 01_LangChain_Notes.md §10, §18 + 17_RAG_Implementation §1–3
         ================================================================ */
      {
        id: "rag",
        short: "M5",
        dir: "05_rag",
        phase: "Phase 2 · Retrieval",
        title: "The RAG Pipeline",
        blurb: "Retrieval built once, end to end, with every decision made explicitly: what a loader produces, where to cut a document and what that costs, what an embedding is actually measuring, how a vector store searches, what a retriever adds over a store — and a clear account of what the resulting baseline gets wrong.",
        outcome: "You can build a working RAG chain from documents to grounded answer, and name the specific failure each later strategy exists to fix.",
        source: "01_LangChain_Notes.md §10 + 17_RAG_Implementation_LangChain.md",
        lessons: [
          { id: "5.1", title: "Recall Then Precision", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "The two-stage mental model that organises every retrieval decision — cast wide cheaply, then narrow expensively — and why the order is not negotiable.",
            keywords: ["recall", "precision", "two-stage", "mental model", "retrieval"] },
          { id: "5.2", title: "Document Loaders", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "What a loader returns, the metadata worth keeping at load time, and the formats whose structure is destroyed by loading them naively.",
            keywords: ["loader", "Document", "metadata", "pdf", "html", "source"] },
          { id: "5.3", title: "Splitting: the Chunking Decision", difficulty: "core", minutes: 34, tier: "must",
            summary: "Fixed, recursive and semantic splitting measured on the same corpus, what overlap buys, and the retrieval accuracy each chunk size actually produces.",
            keywords: ["chunking", "RecursiveCharacterTextSplitter", "overlap", "chunk size", "semantic"] },
          { id: "5.4", title: "Embeddings and the Bi-Encoder", difficulty: "core", minutes: 30, tier: "must",
            summary: "What a sentence embedding encodes, cosine similarity computed by hand, and the normalisation detail that silently changes your scores.",
            keywords: ["embeddings", "bi-encoder", "cosine", "vector", "normalisation"] },
          { id: "5.5", title: "Vector Stores", difficulty: "core", minutes: 30, tier: "must",
            summary: "Exact versus approximate search, what an index costs to build and to query, and the metadata filter that changes the answer more than the model does.",
            keywords: ["vector store", "faiss", "chroma", "ann", "index", "filter"] },
          { id: "5.6", title: "Retrievers", difficulty: "core", minutes: 28, tier: "must",
            summary: "The retriever interface over a store, why it is a Runnable, and the configuration that belongs here rather than in the store.",
            keywords: ["retriever", "as_retriever", "search_kwargs", "k", "interface"] },
          { id: "5.7", title: "The Baseline RAG Chain", difficulty: "core", minutes: 32, tier: "must",
            summary: "Retrieve, format, prompt, answer — assembled in LCEL, run end to end, with the prompt that decides whether the answer is grounded.",
            keywords: ["rag chain", "context", "stuff", "prompt", "grounding"] },
          { id: "5.8", title: "What the Baseline Gets Wrong", difficulty: "core", minutes: 30, tier: "must",
            summary: "The baseline run against queries designed to break it — keyword misses, near-duplicate context, no-answer cases — producing the problem list the next module solves.",
            keywords: ["failure", "keyword", "redundancy", "no answer", "diagnosis"] }
        ]
      },

      /* ================================================================
         M6 · 17_RAG_Implementation_LangChain.md §2, §4–12
         ================================================================ */
      {
        id: "retrieval",
        short: "M6",
        dir: "06_retrieval",
        phase: "Phase 2 · Retrieval",
        title: "Retrieval Strategies, Implemented",
        blurb: "Every strategy the reference teaches, in its own shape: intuition, then the formula, then a from-scratch implementation that runs, then the one-line library call it corresponds to. BM25 with the full scoring formula, hybrid search, rank fusion, diversity, cross-encoder reranking, and the metrics that tell you which of them you actually needed.",
        outcome: "You can implement BM25, RRF and MMR from the formula, assemble the full pipeline, and measure Recall@k, MRR and NDCG to decide what to fix.",
        source: "17_RAG_Implementation_LangChain.md",
        lessons: [
          { id: "6.1", title: "Bi-Encoder vs Cross-Encoder", difficulty: "core", minutes: 30, tier: "must",
            summary: "The architectural difference that makes one searchable and the other accurate, the cost ratio measured, and why a pipeline wants both.",
            keywords: ["bi-encoder", "cross-encoder", "reranking", "latency", "architecture"] },
          { id: "6.2", title: "Similarity Search", difficulty: "core", minutes: 26, tier: "must",
            summary: "Dense retrieval as the baseline, cosine computed from scratch against the library's answer, and the query types it reliably misses.",
            keywords: ["similarity", "dense", "cosine", "embedding", "baseline"] },
          { id: "6.3", title: "BM25", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "The full scoring formula implemented term by term, k1 and b explained by what they do to the score, and the exact-match case where a dense retriever scores zero.",
            keywords: ["bm25", "sparse", "idf", "term frequency", "k1", "b", "tokenisation"] },
          { id: "6.4", title: "Hybrid Search", difficulty: "core", minutes: 30, tier: "must",
            summary: "Running dense and sparse together, the score-scale problem that makes naive weighting wrong, and EnsembleRetriever's answer to it.",
            keywords: ["hybrid", "EnsembleRetriever", "weights", "score scale", "fusion"] },
          { id: "6.5", title: "Reciprocal Rank Fusion", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Fusing by rank instead of score, why that removes the calibration problem entirely, and what the k constant is doing.",
            keywords: ["rrf", "rank fusion", "calibration", "reciprocal", "k constant"] },
          { id: "6.6", title: "MMR and Diversity", difficulty: "core", minutes: 30, tier: "should",
            summary: "Maximal marginal relevance implemented from the formula, the lambda trade-off shown on real results, and the near-duplicate problem it exists for.",
            keywords: ["mmr", "diversity", "lambda", "redundancy", "fetch_k"] },
          { id: "6.7", title: "Cross-Encoder Reranking", difficulty: "core", minutes: 30, tier: "must",
            summary: "Reranking a candidate set with a real cross-encoder, the accuracy it buys, the latency it costs, and how to choose the candidate count.",
            keywords: ["rerank", "cross-encoder", "top-n", "latency", "accuracy"] },
          { id: "6.8", title: "The Full Pipeline", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Hybrid retrieve, fuse, diversify, rerank — assembled in order, measured at each stage so each addition has to justify itself.",
            keywords: ["pipeline", "stages", "ablation", "composition", "end-to-end"] },
          { id: "6.9", title: "Measuring Retrieval Accuracy", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Recall@k, Precision@k, MRR and NDCG computed from scratch on the same result set, and the guide that maps each metric to the fix it implies.",
            keywords: ["recall@k", "precision@k", "mrr", "ndcg", "ragas", "evaluation"] }
        ]
      },

      /* ================================================================
         M7 · 16_RAG_Failure_Handling + 41_RAG_in_Production + 27 + 20 + 47
         ================================================================ */
      {
        id: "ragprod",
        short: "M7",
        dir: "07_ragprod",
        phase: "Phase 2 · Retrieval",
        title: "RAG in Production",
        blurb: "What breaks once the corpus is real and changing: the guard that makes the system abstain instead of inventing, rewriting queries that retrieve nothing, budgeting a context window, checking the answer against its own sources, keeping an index fresh, surviving a document that contains instructions, and the architectures for PDFs full of tables and charts.",
        outcome: "You can make a RAG system abstain correctly, keep its index current, defend it against its own documents, and scale it without the quality collapsing.",
        source: "16_RAG_Failure_Handling.md + 41_RAG_in_Production.md + 27 + 20 + 47",
        lessons: [
          { id: "7.1", title: "The No-Context Guard", difficulty: "core", minutes: 30, tier: "must",
            summary: "Score thresholds, the abstain path, and the measured trade-off between answering a question you should not and refusing one you could have.",
            keywords: ["threshold", "abstain", "no answer", "guard", "confidence"] },
          { id: "7.2", title: "Query Transformation", difficulty: "core", minutes: 32, tier: "must",
            summary: "Rewriting, decomposition and HyDE, each measured on the queries that defeat a plain retriever, with the latency each one adds.",
            keywords: ["query rewrite", "decomposition", "hyde", "multi-query", "expansion"] },
          { id: "7.3", title: "Context Budgeting", difficulty: "core", minutes: 30, tier: "must",
            summary: "How many chunks actually fit, what lost-in-the-middle does to the ones that do, and ordering that puts the answer where the model will read it.",
            keywords: ["context budget", "lost in the middle", "ordering", "token limit", "packing"] },
          { id: "7.4", title: "Grounding and Faithfulness", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Checking an answer against the documents it claims to come from, what an entailment check costs, and the failure the check itself has.",
            keywords: ["faithfulness", "grounding", "entailment", "citation", "verification"] },
          { id: "7.5", title: "Index Freshness", difficulty: "core", minutes: 30, tier: "should",
            summary: "Incremental updates, deletes that leave vectors behind, and the staleness window a nightly rebuild actually gives you.",
            keywords: ["freshness", "invalidation", "incremental", "reindex", "staleness"] },
          { id: "7.6", title: "Prompt Injection Through Documents", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "A retrieved document that instructs the model, why the usual input sanitisation misses it entirely, and the defences that partially work.",
            keywords: ["indirect injection", "retrieved content", "defence", "delimiters", "trust"] },
          { id: "7.7", title: "Semantic Caching", difficulty: "core", minutes: 28, tier: "should",
            summary: "Caching on meaning rather than exact text, the threshold that decides a hit, and the wrong-answer rate a loose threshold produces.",
            keywords: ["semantic cache", "threshold", "hit rate", "embedding", "staleness"] },
          { id: "7.8", title: "Multimodal RAG", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "The three architectures for documents with tables and charts — shared-space embeddings, summarise-then-embed, and page-as-image — and which is the production default.",
            keywords: ["multimodal", "MultiVectorRetriever", "clip", "colpali", "tables", "vlm"] },
          { id: "7.9", title: "Scaling a RAG System", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Where latency and cost actually go at volume, what to cache, what to precompute, and the quality that degrades first under load.",
            keywords: ["scaling", "latency", "throughput", "sharding", "cost", "degradation"] }
        ]
      },

      /* ================================================================
         M8 · 02_LangGraph_Notes.md §1–4
         ================================================================ */
      {
        id: "graph",
        short: "M8",
        dir: "08_graph",
        phase: "Phase 3 · LangGraph",
        title: "LangGraph Foundations",
        blurb: "The state machine underneath every agent framework. Why a chain stops being enough, state as a typed schema with reducers that decide how updates merge, nodes as plain functions, edges as the control flow, conditional routing, and the Command object that moves and writes in one step.",
        outcome: "You can design a state schema with the right reducers, build a graph with conditional routing, and explain what the runtime does on each superstep.",
        source: "02_LangGraph_Notes.md",
        lessons: [
          { id: "8.1", title: "Why a Graph", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "The three things a chain cannot do — cycle, branch on state, pause — demonstrated as failures first, so the graph is an answer to something.",
            keywords: ["graph", "cycle", "state", "control flow", "motivation"] },
          { id: "8.2", title: "StateGraph and State Schemas", difficulty: "core", minutes: 32, tier: "must",
            summary: "TypedDict and Pydantic schemas, what the runtime validates, and the shape of the state object every node receives and returns.",
            keywords: ["StateGraph", "TypedDict", "pydantic", "schema", "state"] },
          { id: "8.3", title: "Reducers", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The function that decides how a node's update merges with existing state — the single most misunderstood part of LangGraph, shown by what goes wrong without one.",
            keywords: ["reducer", "Annotated", "operator.add", "add_messages", "merge"] },
          { id: "8.4", title: "Input, Output and Private Schemas", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Keeping internal state out of the public interface, and the three-schema pattern that makes a graph safe to expose.",
            keywords: ["input schema", "output schema", "private", "encapsulation"] },
          { id: "8.5", title: "Nodes", difficulty: "core", minutes: 28, tier: "must",
            summary: "A node is a function from state to a partial update — what that buys in testability, and the mistakes that come from treating it as a method.",
            keywords: ["node", "function", "partial update", "pure", "testing"] },
          { id: "8.6", title: "Edges and the Superstep", difficulty: "core", minutes: 30, tier: "must",
            summary: "Normal edges, START and END, and the superstep model that explains why two parallel nodes see the same input state.",
            keywords: ["edge", "START", "END", "superstep", "parallel", "pregel"] },
          { id: "8.7", title: "Conditional Routing", difficulty: "core", minutes: 32, tier: "must",
            summary: "A function that returns the next node's name, the path map, and the routing bugs that a missing map entry produces.",
            keywords: ["conditional edge", "routing", "path map", "branching"] },
          { id: "8.8", title: "Command: Route and Update Together", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Returning a Command instead of a dict, when that is clearer than a conditional edge, and the handoff pattern it enables.",
            keywords: ["Command", "goto", "update", "handoff", "routing"] },
          { id: "8.9", title: "Compiling and Running", difficulty: "core", minutes: 28, tier: "must",
            summary: "What compile() checks, the recursion limit, invoke against stream, and reading the graph's own drawn structure.",
            keywords: ["compile", "recursion_limit", "invoke", "stream", "visualise"] }
        ]
      },

      /* ================================================================
         M9 · 02_LangGraph_Notes.md §5, §5.5, §6, §7, §15
         ================================================================ */
      {
        id: "stateful",
        short: "M9",
        dir: "09_stateful",
        phase: "Phase 3 · LangGraph",
        title: "Agents, Memory and the Human",
        blurb: "What the graph buys you once state persists: a tool-calling agent built on the primitives, the distinction between a workflow and an agent, checkpoints that survive a process restart, threads as conversations, long-term memory across them, a human in the middle of a run, and the ability to rewind.",
        outcome: "You can build a checkpointed agent, pause it for approval, resume it, and rewind it to an earlier state to take a different branch.",
        source: "02_LangGraph_Notes.md",
        lessons: [
          { id: "9.1", title: "The Tool-Calling Agent", difficulty: "core", minutes: 32, tier: "must",
            summary: "The agent loop as a two-node graph with a conditional edge — the same loop from 3.3, now with state, persistence and a pause point.",
            keywords: ["agent", "tool node", "loop", "conditional", "graph"] },
          { id: "9.2", title: "ToolNode and tools_condition", difficulty: "core", minutes: 28, tier: "must",
            summary: "The two prebuilts that collapse the boilerplate, exactly what each does, and when writing them out by hand is still the better choice.",
            keywords: ["ToolNode", "tools_condition", "prebuilt", "boilerplate"] },
          { id: "9.3", title: "Workflows vs Agents", difficulty: "core", minutes: 30, tier: "must",
            summary: "The pattern catalogue — prompt chaining, routing, parallelisation, orchestrator-worker, evaluator-optimiser — and where the control actually sits in each.",
            keywords: ["workflow", "agent", "patterns", "control", "catalogue"] },
          { id: "9.4", title: "Checkpointing", difficulty: "core", minutes: 32, tier: "must",
            summary: "What a checkpointer writes and when, in-memory against SQLite against Postgres, and exactly what survives a server restart.",
            keywords: ["checkpointer", "persistence", "sqlite", "postgres", "durability"] },
          { id: "9.5", title: "Threads and Short-Term Memory", difficulty: "core", minutes: 28, tier: "must",
            summary: "thread_id as the conversation key, what state is scoped to it, and the multi-user mistake that leaks one conversation into another.",
            keywords: ["thread_id", "config", "session", "short-term memory", "isolation"] },
          { id: "9.6", title: "Long-Term Memory and the Store", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Memory that outlives a thread, the semantic, episodic and procedural kinds, and the namespace design that keeps them retrievable.",
            keywords: ["store", "long-term memory", "semantic", "episodic", "procedural", "namespace"] },
          { id: "9.7", title: "Human-in-the-Loop", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "interrupt() and Command(resume=...), what the checkpointer has to guarantee for it to work, and the re-execution detail that surprises everyone once.",
            keywords: ["interrupt", "Command", "resume", "hitl", "approval"] },
          { id: "9.8", title: "Breakpoints and Approval Gates", difficulty: "core", minutes: 30, tier: "should",
            summary: "Static and dynamic breakpoints, editing state while paused, and the approve-reject-edit gate as a reusable node.",
            keywords: ["breakpoint", "interrupt_before", "approval", "edit state", "gate"] },
          { id: "9.9", title: "Time-Travel Debugging", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Listing checkpoint history, forking from an earlier state, and using it to answer what the agent would have done differently.",
            keywords: ["time travel", "get_state_history", "fork", "replay", "debugging"] }
        ]
      },

      /* ================================================================
         M10 · 02_LangGraph_Notes.md §8–10, §12, §13, §16, §17
         ================================================================ */
      {
        id: "compose",
        short: "M10",
        dir: "10_compose",
        phase: "Phase 3 · LangGraph",
        title: "Composition and Scale",
        blurb: "Graphs built from graphs, work fanned out dynamically and gathered back, the five streaming modes and what each is for, retries and timeouts at the node level, the deadlocks a badly drawn graph produces, testing something stateful, runtime configuration, the function-decorator API, and tools that live in another process.",
        outcome: "You can nest graphs, fan out with Send, choose the right streaming mode, set retry policy per node, and test a stateful graph deterministically.",
        source: "02_LangGraph_Notes.md",
        lessons: [
          { id: "10.1", title: "Subgraphs", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "A compiled graph used as a node, shared versus separate state, and the key-mapping that decides whether the parent sees anything.",
            keywords: ["subgraph", "nesting", "shared state", "mapping", "composition"] },
          { id: "10.2", title: "Map-Reduce with Send", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Fanning out a variable number of parallel branches at runtime, and the reducer that has to exist for the gather to work.",
            keywords: ["Send", "map-reduce", "fan-out", "parallel", "reducer", "dynamic"] },
          { id: "10.3", title: "Streaming Modes", difficulty: "core", minutes: 30, tier: "must",
            summary: "values, updates, messages, custom and debug — what each emits, shown on the same graph, and which one a UI actually wants.",
            keywords: ["stream_mode", "values", "updates", "messages", "custom", "debug"] },
          { id: "10.4", title: "Retries and Timeouts", difficulty: "core", minutes: 30, tier: "must",
            summary: "RetryPolicy on a node, what gets retried and what does not, and the side-effect that makes a retry dangerous.",
            keywords: ["RetryPolicy", "retry", "timeout", "node", "idempotency"] },
          { id: "10.5", title: "Deadlocks and Loop Guards", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "The graph shapes that never terminate, the recursion limit as a backstop rather than a design, and the counters that catch it earlier.",
            keywords: ["deadlock", "recursion_limit", "loop", "guard", "termination"] },
          { id: "10.6", title: "Testing a Graph", difficulty: "core", minutes: 32, tier: "must",
            summary: "Testing nodes as functions, the graph as a path, and the scripted model that makes a stateful agent deterministic under test.",
            keywords: ["testing", "unit", "path", "deterministic", "fake model"] },
          { id: "10.7", title: "Runtime Configuration", difficulty: "core", minutes: 28, tier: "should",
            summary: "config versus state, the context schema and Runtime object, and the rule for which of the two a value belongs in.",
            keywords: ["config", "context_schema", "Runtime", "configurable", "injection"] },
          { id: "10.8", title: "The Functional API", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "@entrypoint and @task as an alternative to drawing a graph, what you keep, and what you give up by not having an explicit topology.",
            keywords: ["functional api", "entrypoint", "task", "imperative", "trade-off"] },
          { id: "10.9", title: "Tools From Another Process", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "MCP as a tool transport, what changes when a tool is not a Python function in your repo, and the failure modes that introduces.",
            keywords: ["mcp", "tool server", "transport", "remote", "protocol"] }
        ]
      },

      /* ================================================================
         M11 · 18_Agent_Implementation_Cookbook.md + 11_Agentic_Systems Part I
         ================================================================ */
      {
        id: "patterns",
        short: "M11",
        dir: "11_patterns",
        phase: "Phase 4 · Agentic systems",
        title: "Agent Patterns",
        blurb: "Every agent pattern as the smallest graph that demonstrates it: core idea, diagram, running code, and an honest statement of when it is the wrong choice. Router, ReAct, reflection, reflexion with episodic memory, plan-and-execute, and retrieval turned into a decision rather than a step.",
        outcome: "You can implement each pattern from its execution cycle, and pick between them on the properties of the task rather than on familiarity.",
        source: "18_Agent_Implementation_Cookbook.md + 11_Agentic_Systems_and_Patterns.md",
        lessons: [
          { id: "11.1", title: "Do You Even Need an Agent?", difficulty: "core", minutes: 28, tier: "must",
            summary: "The ladder from a single call to a full agent, the cost and reliability measured at each rung, and the rule for stopping at the lowest one that works.",
            keywords: ["decision", "ladder", "workflow", "cost", "reliability"] },
          { id: "11.2", title: "Router", difficulty: "core", minutes: 28, tier: "must",
            summary: "One classification, one branch — the cheapest pattern that is still an agent, and the classification failure that defines its ceiling.",
            keywords: ["router", "classification", "dispatch", "branch", "cheap"] },
          { id: "11.3", title: "ReAct", difficulty: "core", minutes: 34, tier: "must",
            summary: "Reason, act, observe, repeat — the execution cycle drawn, the state schema, the loop guards, and what the pattern is actually good at.",
            keywords: ["react", "reason", "act", "observe", "cycle", "tools"] },
          { id: "11.4", title: "Reflection", difficulty: "core", minutes: 32, tier: "should",
            summary: "Generate, critique, revise — the gain measured against the token cost, and the point at which another round stops helping.",
            keywords: ["reflection", "critique", "revision", "self-correction", "diminishing"] },
          { id: "11.5", title: "Reflexion", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Reflection with episodic memory across attempts, the verbal reinforcement idea, and the memory that has to persist for it to mean anything.",
            keywords: ["reflexion", "episodic memory", "verbal rl", "attempts", "learning"] },
          { id: "11.6", title: "Plan-and-Execute", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Planning once and executing many, replanning on failure, and the trade against ReAct that the task's predictability decides.",
            keywords: ["plan and execute", "planner", "executor", "replan", "decomposition"] },
          { id: "11.7", title: "Agentic RAG", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Retrieval as a decision: grade the documents, rewrite the query, retrieve again, or give up — corrective RAG built as a graph.",
            keywords: ["agentic rag", "crag", "self-rag", "grading", "rewrite", "decision"] },
          { id: "11.8", title: "Choosing a Pattern", difficulty: "core", minutes: 30, tier: "must",
            summary: "The comparison table and decision tree, the universal loop guards every pattern needs, and the costs put side by side on one task.",
            keywords: ["comparison", "decision tree", "guards", "selection", "trade-off"] }
        ]
      },

      /* ================================================================
         M12 · 11_Agentic_Systems §6 + 18 §7–9 + 19_Orchestrator_vs_Supervisor
         ================================================================ */
      {
        id: "multi",
        short: "M12",
        dir: "12_multi",
        phase: "Phase 4 · Agentic systems",
        title: "Multi-Agent Systems",
        blurb: "What changes when there is more than one agent: the supervisor that routes turn by turn, the swarm that hands off peer to peer, teams of teams, the distinction between a supervisor and an orchestrator that most discussions blur, adding an agent to a running system, and the failure modes that only appear with two.",
        outcome: "You can build supervisor, swarm and hierarchical topologies, say which one a problem wants, and add an agent to a deployed system without recompiling it.",
        source: "11_Agentic_Systems_and_Patterns.md §6 + 19_Orchestrator_vs_Supervisor.md",
        lessons: [
          { id: "12.1", title: "Why More Than One Agent", difficulty: "core", minutes: 30, tier: "must",
            summary: "The three reasons that justify it and the several that do not, with the coordination overhead measured against a single agent on the same task.",
            keywords: ["multi-agent", "motivation", "overhead", "specialisation", "decision"] },
          { id: "12.2", title: "Supervisor", difficulty: "core", minutes: 32, tier: "must",
            summary: "A router with memory: one agent decides who acts next each turn, the state the workers share, and the supervisor's own failure mode.",
            keywords: ["supervisor", "routing", "workers", "turn", "topology"] },
          { id: "12.3", title: "Swarm and Handoffs", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Peer-to-peer handoff with Command, no central router, and the loop two agents can get into when each thinks the other should act.",
            keywords: ["swarm", "handoff", "Command", "peer", "loop"] },
          { id: "12.4", title: "Hierarchical Teams", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Graphs as nodes inside graphs, where state boundaries fall, and the depth at which the structure costs more than it buys.",
            keywords: ["hierarchical", "teams", "subgraph", "depth", "boundaries"] },
          { id: "12.5", title: "Orchestrator vs Supervisor", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Turn-by-turn router against plan-fan-out-gather decomposer — the crisp distinction, both implemented, and what each does when a worker fails.",
            keywords: ["orchestrator", "supervisor", "decomposer", "fan-out", "comparison"] },
          { id: "12.6", title: "Adding an Agent After Deployment", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "The registry and generic-executor pattern that adds a worker at runtime with no recompile, in-flight run safety, canarying and kill switches.",
            keywords: ["registry", "runtime", "deployment", "canary", "kill switch"] },
          { id: "12.7", title: "Agent-to-Agent Communication", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "What agents actually pass each other, the shared-state and message-passing options, and the protocol question once they are separate services.",
            keywords: ["a2a", "communication", "message passing", "shared state", "protocol"] },
          { id: "12.8", title: "Multi-Agent Failure Modes", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Infinite handoffs, context loss at a boundary, duplicated work, the blame problem when the output is wrong, and the guards for each.",
            keywords: ["failure", "handoff loop", "context loss", "attribution", "guards"] }
        ]
      },

      /* ================================================================
         M13 · 12_Context_Management_and_Summarization.md + 27
         ================================================================ */
      {
        id: "context",
        short: "M13",
        dir: "13_context",
        phase: "Phase 4 · Agentic systems",
        title: "Context Engineering",
        blurb: "The window is a budget and every strategy for managing it trades the same two things: what the agent can still remember against what it costs to remember it. Five strategies implemented and measured, and the rule for which one each agent pattern wants.",
        outcome: "You can measure what a conversation costs as it grows, choose a context strategy on evidence, and say what each one loses.",
        source: "12_Context_Management_and_Summarization.md",
        lessons: [
          { id: "13.1", title: "The Context Window as a Budget", difficulty: "core", minutes: 30, tier: "must",
            summary: "Where the tokens go in an agent turn, the quadratic growth a loop produces, and the cost curve that forces the decision.",
            keywords: ["context window", "budget", "tokens", "growth", "cost"] },
          { id: "13.2", title: "When to Summarize", difficulty: "core", minutes: 28, tier: "must",
            summary: "The trigger conditions — token count, turn count, semantic drift — and the measurement that shows which one fires at the right time.",
            keywords: ["summarization", "trigger", "threshold", "turns", "drift"] },
          { id: "13.3", title: "Sliding Window and Summarization", difficulty: "core", minutes: 30, tier: "must",
            summary: "The two basic strategies implemented on the same conversation, with the questions each one can no longer answer afterwards.",
            keywords: ["sliding window", "summarization", "recency", "loss", "trade-off"] },
          { id: "13.4", title: "Hierarchical and Relevance-Based Context", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Summaries of summaries, and retrieving from history instead of carrying it — the two strategies that scale furthest and what each costs.",
            keywords: ["hierarchical", "relevance", "retrieval", "history", "scaling"] },
          { id: "13.5", title: "Compression", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Compressing context rather than dropping it, what survives, and the measurement that decides whether the compression was lossy where it mattered.",
            keywords: ["compression", "compaction", "lossy", "fidelity", "tokens"] },
          { id: "13.6", title: "Context Strategy by Pattern", difficulty: "core", minutes: 30, tier: "must",
            summary: "What ReAct, plan-and-execute, supervisor and swarm each need from context, and why one strategy is wrong for at least one of them.",
            keywords: ["pattern", "strategy", "selection", "react", "supervisor"] }
        ]
      },

      /* ================================================================
         M14 · 14_Failure_Handling + 45_Stepwise + 43_Agent_Evaluation + 40 + 26/48/49 + 21
         ================================================================ */
      {
        id: "resilience",
        short: "M14",
        dir: "14_resilience",
        phase: "Phase 5 · Production",
        title: "Failure, Evaluation and Scale",
        blurb: "The last module, organised by failure surface rather than by feature: what breaks at the model call, the tool, the sub-agent, the graph and the process; how to retry something that has already had an effect; how to undo a half-finished plan; how to evaluate an agent whose output is a trajectory; and where the cost goes at volume.",
        outcome: "You can make an agent safe to retry, degrade it instead of failing it, evaluate both its answer and its path, and say where it will break first under load.",
        source: "14_Failure_Handling_and_Resilience.md + 43_Agent_Evaluation.md + 45 + 40 + 48 + 49",
        lessons: [
          { id: "14.1", title: "The Failure Surfaces", difficulty: "core", minutes: 32, tier: "must",
            summary: "Nine places an agentic system fails, each with its detection signal, containment and recovery — the map the rest of the module fills in.",
            keywords: ["failure surface", "detection", "containment", "recovery", "taxonomy"] },
          { id: "14.2", title: "Retries, Backoff and Circuit Breakers", difficulty: "core", minutes: 32, tier: "must",
            summary: "Exponential backoff with jitter, the breaker that stops you retrying a dead dependency, and the state machine it runs.",
            keywords: ["retry", "backoff", "jitter", "circuit breaker", "half-open"] },
          { id: "14.3", title: "Idempotency on Retried Side-Effects", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The retry that sends the email twice, idempotency keys, and where the key has to be stored for a restart to respect it.",
            keywords: ["idempotency", "side effects", "key", "exactly once", "retry"] },
          { id: "14.4", title: "Saga and Compensation", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Undoing a plan that failed halfway, compensating actions, and the steps that cannot be compensated and must therefore go last.",
            keywords: ["saga", "compensation", "rollback", "ordering", "transaction"] },
          { id: "14.5", title: "Failure Budgets and Degradation", difficulty: "core", minutes: 30, tier: "should",
            summary: "k-of-N results instead of all-or-nothing, the budget that caps a run's spend, and the degraded answer that beats an error page.",
            keywords: ["budget", "degradation", "k-of-n", "partial", "graceful"] },
          { id: "14.6", title: "Dead Letters and Escalation", difficulty: "core", minutes: 28, tier: "should",
            summary: "Where a run goes when every recovery has failed, what has to be in the record for a human to act on it, and the escalation path.",
            keywords: ["dead letter", "escalation", "human", "record", "queue"] },
          { id: "14.7", title: "Evaluating an Agent", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Outcome against trajectory — why a correct answer by a wrong path is a bug, and the two scoring approaches implemented on the same runs.",
            keywords: ["evaluation", "outcome", "trajectory", "scoring", "path"] },
          { id: "14.8", title: "Observability for Agents", difficulty: "core", minutes: 32, tier: "must",
            summary: "The span tree an agent run produces, the attributes that make a failed run diagnosable, and the one metric that catches a silent loop.",
            keywords: ["observability", "spans", "trace", "attributes", "metrics"] },
          { id: "14.9", title: "Scaling Agentic Systems", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Where latency and cost go at volume, what to cache and what never to, concurrency limits, and the component that saturates first.",
            keywords: ["scaling", "latency", "cost", "concurrency", "bottleneck"] },
          { id: "14.10", title: "The Production Checklist", difficulty: "core", minutes: 30, tier: "must",
            summary: "Everything in the course as a list you can run against a system before it takes traffic, with the measurement behind each line.",
            keywords: ["checklist", "production", "readiness", "review", "summary"] }
        ]
      }
    ]
  });
})();
