/* ============================================================================
   GENERATIVE AI AND LLMS — CURRICULUM
   ----------------------------------------------------------------------------
   The course mirrors the reference folder tutorial-hub/07_GenAI_and_LLMs file
   for file and section for section, in the reference's own order, rewritten in
   this site's voice. Nothing is added to the topic list and nothing in the
   reference is left out:

     LEARN track (one module per reference file, or per run of that file's
     sections where one file carries two modules' worth; each file's
     "Interview Deep Dive" section is folded into the interview block of the
     lesson it belongs to)

       M1   01_LLM_Parameters.md              §1-16   -> 1.1-1.16
       M2   04_Prompt_Engineering.md          §1-19   -> 2.1-2.19
       M3   02_LLM_Inference_Optimization.md  §1-14   -> 3.1-3.14
       M4   03_Fine_Tuning_LLM.md             §1-9    -> 4.1-4.8
       M5   05_RAG_and_Vector_Stores.md       §1-13.5 -> 5.1-5.13
       M6   05_RAG_and_Vector_Stores.md       §14-22  -> 6.1-6.8
       M7   07_LLM_Training_and_Alignment.md  §0-14   -> 7.1-7.15
       M8   06_LLM_Evaluation.md              §0-F    -> 8.1-8.13
       M9   26_LLM_Metrics_and_LLM_as_Judge   §1-18   -> 9.1-9.17
       M10  27_LLM_Observability_and_Tracing  §1-15   -> 10.1-10.14
       M11  20_Hallucination + 21_Cost + 23_Guardrails -> 11.1-11.17
       M12  22_Eval_Prompts_and_Finetuning + 25_Deprecation -> 12.1-12.7
       M13  28_Voice_Agents_and_Realtime      §1-16   -> 13.1-13.15

     PRACTICE track (00_Scenario_Based_Questions_GenAI.md,
       18_Production_Scenarios_LLM_APIs.md, 19_Client_Round_Prompting.md)

     INTERVIEW track (Interview_Questions/ plus 24_LLM_Systems_Interview_Notes)

   The reference's API examples are written against provider endpoints. Where a
   claim can be checked without a key it is checked: sampling, penalties,
   token counting and cost arithmetic are run locally on GPT-2 logits and on
   tiktoken, and the printed output beneath a program is what it printed here.
   Where a number can only come from a provider, the lesson says whose number
   it is and when it was quoted.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "genai",
    title: "Generative AI and LLMs",
    short: "GenAI",
    blurb: "The controls on a large model and what each one does to the distribution, prompting as an engineering discipline, serving and inference economics, LoRA and QLoRA, retrieval from chunking to GraphRAG, the post-training stack from SFT to GRPO, evaluation and the metrics that judge it, observability, the production failure modes, and voice agents.",

    trackLabels: { learn: "GenAI and LLMs", practice: "Scenarios", interview: "Interview" },
    trackBlurbs: {
      learn: "The reference notes, section by section — every parameter demonstrated on real logits, every cost carried through on numbers.",
      practice: "The reference's GenAI scenario challenges and production situations, answers folded away.",
      interview: "The Glassdoor banks, the topic bank and the systems notes, answers hidden until you ask."
    },

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11", "1.12", "1.13", "1.14", "1.15", "1.16", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6"],

    modules: [

      /* ================================================================
         M1 · 01_LLM_Parameters.md §1–16
         ================================================================ */
      {
        id: "parameters",
        short: "M1",
        dir: "01_parameters",
        phase: "Phase 1 · Controlling a model",
        title: "The Controls on a Model",
        blurb: "Everything you are allowed to change at inference time, in the order the sampler applies it: temperature on the logits, top-k and top-p on the candidate set, penalties on what has already been said, then the limits and the structure — max tokens, stop sequences, logit bias, seed, JSON mode, function calling, reasoning tokens, images, streaming, batching, and the token arithmetic that turns all of it into a bill.",
        outcome: "You can name every parameter on a chat completion, say what it does to the probability distribution, and predict what a request will cost before you send it.",
        source: "01_LLM_Parameters.md",
        lessons: [
          { id: "1.1", title: "The Sampling Pipeline", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Logits, softmax, and the four stages that stand between a model's raw scores and the token it emits — built once on real GPT-2 logits so every later parameter has somewhere to attach.",
            keywords: ["logits", "softmax", "sampling", "greedy", "autoregressive", "vocabulary", "distribution"] },
          { id: "1.2", title: "Temperature", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "The one division that sharpens or flattens the whole distribution, what tau=0 and tau>1 actually do to the probabilities, and the ranges each kind of task wants.",
            keywords: ["temperature", "softmax", "determinism", "greedy", "creativity", "entropy"] },
          { id: "1.3", title: "Top-p and Top-k", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Two ways to cut the tail off a distribution — a fixed count and a cumulative mass — why top-p adapts where top-k cannot, and why you should move one knob and not both.",
            keywords: ["top-p", "nucleus", "top-k", "truncation", "cumulative probability", "tail"] },
          { id: "1.4", title: "Frequency, Presence and Repetition Penalties", difficulty: "core", minutes: 28, tier: "must",
            summary: "Three different penalties on tokens you have already produced — by count, by appearance, and by division — with the ranges that help and the ones that wreck the output.",
            keywords: ["frequency penalty", "presence penalty", "repetition penalty", "repetition", "diversity"] },
          { id: "1.5", title: "Max Tokens and the Context Window", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "The two limits people confuse: the window that holds prompt and output together, and the cap on output alone — and what a finish_reason of 'length' is telling you.",
            keywords: ["context window", "max tokens", "truncation", "finish reason", "budget"] },
          { id: "1.6", title: "Stop Sequences and Logit Bias", difficulty: "core", minutes: 26, tier: "should",
            summary: "Ending generation on a string you choose, and moving a specific token's odds by its id — the two controls that operate on tokens rather than on the distribution's shape.",
            keywords: ["stop sequence", "logit bias", "token id", "ban", "delimiter"] },
          { id: "1.7", title: "Seed and Reproducibility", difficulty: "core", minutes: 26, tier: "should",
            summary: "What a seed fixes and what it does not, why temperature=0 is still not deterministic, and what system_fingerprint is for.",
            keywords: ["seed", "reproducibility", "determinism", "system fingerprint", "version pinning"] },
          { id: "1.8", title: "Structured Output", difficulty: "core", minutes: 30, tier: "must",
            summary: "JSON mode, schema-enforced structured output and the tool-call workaround, ranked by what each one actually guarantees.",
            keywords: ["json mode", "structured output", "pydantic", "json schema", "response format", "validation"] },
          { id: "1.9", title: "Function Calling", difficulty: "core", minutes: 30, tier: "must",
            summary: "The model returns arguments, not results — the schema it reads, the tool_choice settings, parallel calls, and the division of labour people get wrong.",
            keywords: ["function calling", "tools", "tool choice", "json schema", "parallel tool calls"] },
          { id: "1.10", title: "Reasoning Tokens", difficulty: "core", minutes: 26, tier: "should",
            summary: "Hidden thinking tokens that you pay for and never see, how reasoning_effort moves the bill, and when the extra spend is worth it.",
            keywords: ["reasoning tokens", "o1", "o3", "reasoning effort", "max completion tokens", "cost"] },
          { id: "1.11", title: "Multimodal Parameters", difficulty: "core", minutes: 26, tier: "should",
            summary: "How an image becomes tokens, what the detail setting costs in tiles, and the budgeting that follows for vision and audio calls.",
            keywords: ["vision", "detail", "image tokens", "tiles", "audio", "modalities"] },
          { id: "1.12", title: "Streaming", difficulty: "foundation", minutes: 24, tier: "should",
            summary: "Chunks instead of a response, time-to-first-token as the metric users feel, and the usage that only arrives in the last chunk.",
            keywords: ["streaming", "sse", "time to first token", "chunk", "delta", "usage"] },
          { id: "1.13", title: "The Batch API and Prompt Caching", difficulty: "core", minutes: 30, tier: "must",
            summary: "Half price for work that can wait a day, and the prefix cache that pays for putting the static part of a prompt first — with the arithmetic for both.",
            keywords: ["batch api", "prompt caching", "cache control", "prefix", "discount", "jsonl"] },
          { id: "1.14", title: "Token Counting and Budgeting", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Counting exactly with tiktoken instead of guessing, the rules of thumb and how far they are off, and turning a token count into a cost before you send it.",
            keywords: ["tiktoken", "token counting", "cost estimate", "budget", "encoding", "characters per token"] },
          { id: "1.15", title: "Provider Comparison and Model Selection", difficulty: "core", minutes: 28, tier: "should",
            summary: "Which parameters each provider actually supports, what that means for provider-agnostic code, and the task-to-model table with its prices.",
            keywords: ["openai", "anthropic", "google", "huggingface", "model selection", "pricing", "portability"] },
          { id: "1.16", title: "Response Metadata, Rate Limits and Retries", difficulty: "core", minutes: 28, tier: "must",
            summary: "finish_reason, usage and the rate-limit headers — the three things a production call must read — and the exponential backoff that keeps a client polite.",
            keywords: ["finish reason", "usage", "rate limit", "retry", "backoff", "tenacity", "429"] }
        ]
      },

      /* ================================================================
         M2 · 04_Prompt_Engineering.md §1–19
         ================================================================ */
      {
        id: "prompting",
        short: "M2",
        dir: "02_prompting",
        phase: "Phase 1 · Controlling a model",
        title: "Prompt Engineering",
        blurb: "Prompting treated as engineering rather than folklore: the shot patterns, chain-of-thought and its descendants, ReAct, decomposition, structured and multimodal prompts, DSPy's optimisation, then the parts that only matter in production — evaluation, caching, versioning, injection defence and debugging.",
        outcome: "You can choose a prompting pattern from the shape of the task, test a prompt like code, and defend one against a user who is trying to break it.",
        source: "04_Prompt_Engineering.md",
        lessons: [
          { id: "2.1", title: "What a Prompt Is Made Of", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "The anatomy of a prompt, the roles, and the principles that survive across models.", keywords: ["prompt", "system", "user", "instruction", "context", "delimiter"] },
          { id: "2.2", title: "Zero-Shot, One-Shot and Few-Shot", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "What examples buy, how many is enough, and the selection and ordering effects nobody expects.", keywords: ["zero shot", "few shot", "in-context learning", "exemplar", "ordering"] },
          { id: "2.3", title: "Chain-of-Thought", difficulty: "core", minutes: 30, tier: "must",
            summary: "Making the reasoning explicit, when it helps and when it only lengthens the bill.", keywords: ["chain of thought", "cot", "step by step", "reasoning", "scratchpad"] },
          { id: "2.4", title: "Tree-of-Thought and Self-Consistency", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Searching over reasoning paths, and voting across samples instead of trusting one.", keywords: ["tree of thought", "self consistency", "sampling", "voting", "search"] },
          { id: "2.5", title: "ReAct", difficulty: "core", minutes: 28, tier: "must",
            summary: "Interleaving reasoning with tool calls, and the loop that turns a model into an agent.", keywords: ["react", "reasoning", "acting", "observation", "tool", "loop"] },
          { id: "2.6", title: "Role and Persona Prompting", difficulty: "foundation", minutes: 24, tier: "should",
            summary: "What a persona actually changes, and the cases where it is superstition.", keywords: ["role", "persona", "system prompt", "voice", "expertise"] },
          { id: "2.7", title: "Structured Output by Prompt", difficulty: "core", minutes: 26, tier: "should",
            summary: "Getting parseable output from prompting alone, and why it ranks below a schema.", keywords: ["structured output", "json", "format", "parsing", "schema"] },
          { id: "2.8", title: "Decomposition and Chaining", difficulty: "core", minutes: 28, tier: "must",
            summary: "Splitting one hard call into several easy ones, and what the split costs.", keywords: ["decomposition", "chaining", "pipeline", "subtask", "intermediate"] },
          { id: "2.9", title: "Multimodal Prompting", difficulty: "core", minutes: 26, tier: "should",
            summary: "Prompting with images alongside text, and the instructions that images need.", keywords: ["multimodal", "vision", "image", "ocr", "diagram"] },
          { id: "2.10", title: "Function and Tool-Calling Patterns", difficulty: "core", minutes: 28, tier: "must",
            summary: "The prompt-side half of tool use: descriptions, schemas and the failure modes.", keywords: ["tool calling", "function", "schema", "description", "arguments"] },
          { id: "2.11", title: "Prompt Optimisation with DSPy", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Compiling prompts against a metric instead of writing them by hand.", keywords: ["dspy", "optimizer", "signature", "compile", "metric", "bootstrap"] },
          { id: "2.12", title: "Prompt Evaluation and Testing", difficulty: "core", minutes: 30, tier: "must",
            summary: "A test set, a metric and a regression run — the difference between a prompt and a guess.", keywords: ["evaluation", "test set", "regression", "metric", "golden set"] },
          { id: "2.13", title: "Prompt Caching and Cost", difficulty: "core", minutes: 26, tier: "should",
            summary: "Ordering a prompt so the cache can hit it, and what the hit is worth.", keywords: ["prompt caching", "prefix", "cost", "cache hit", "static content"] },
          { id: "2.14", title: "Provider-Specific Patterns", difficulty: "core", minutes: 24, tier: "should",
            summary: "The conventions each provider's models were trained to expect.", keywords: ["openai", "anthropic", "gemini", "xml tags", "system prompt"] },
          { id: "2.15", title: "System Prompts for Agents", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "What an agent's standing instructions must contain, and what they must not.", keywords: ["agent", "system prompt", "tools", "constraints", "policy"] },
          { id: "2.16", title: "Guardrails and Prompt Injection Defence", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Why injection is not solvable by prompting, and the layers that actually reduce it.", keywords: ["prompt injection", "jailbreak", "guardrail", "defence", "untrusted input"] },
          { id: "2.17", title: "Production Prompt Management", difficulty: "core", minutes: 28, tier: "must",
            summary: "Versioning, rollout and rollback for text that behaves like code but is not reviewed like it.", keywords: ["versioning", "registry", "rollout", "rollback", "a/b test"] },
          { id: "2.18", title: "Templates for Common Tasks", difficulty: "foundation", minutes: 24, tier: "should",
            summary: "The reference's worked templates for extraction, classification, summarisation and the rest.", keywords: ["template", "extraction", "classification", "summarization", "rewriting"] },
          { id: "2.19", title: "Debugging and Common Failure Modes", difficulty: "core", minutes: 28, tier: "must",
            summary: "Reading a bad output back to the instruction that caused it.", keywords: ["debugging", "failure mode", "ambiguity", "conflict", "overlong"] }
        ]
      },

      /* ================================================================
         M3 · 02_LLM_Inference_Optimization.md §1–14
         ================================================================ */
      {
        id: "inference",
        short: "M3",
        dir: "03_inference",
        phase: "Phase 2 · Running a model",
        title: "Serving and Inference",
        blurb: "What happens on the server between a request and a token: the prefill and decode phases and why they are bound by different resources, the KV cache that makes decoding possible and the memory it eats, quantization, attention kernels, batching, speculative decoding, the serving frameworks, distributed inference, and the benchmarking that tells you which of these actually helped.",
        outcome: "You can read a serving benchmark, say which phase a workload is bound by, and pick the optimisation that addresses it rather than the fashionable one.",
        source: "02_LLM_Inference_Optimization.md",
        lessons: [
          { id: "3.1", title: "Prefill and Decode", difficulty: "core", minutes: 30, tier: "must",
            summary: "The two phases of generation, why one is compute-bound and the other memory-bound, and the metrics each one owns.", keywords: ["prefill", "decode", "ttft", "tpot", "memory bandwidth", "arithmetic intensity"] },
          { id: "3.2", title: "The KV Cache", difficulty: "core", minutes: 32, tier: "must",
            summary: "What is cached, the size formula carried through on a real model, and PagedAttention.", keywords: ["kv cache", "memory", "paged attention", "vllm", "cache size"] },
          { id: "3.3", title: "Quantization for Inference", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "GPTQ, AWQ and GGUF — what each quantizes, what it costs in quality, and what it buys.", keywords: ["quantization", "gptq", "awq", "gguf", "int4", "int8", "perplexity"] },
          { id: "3.4", title: "Attention Optimizations", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "FlashAttention and its relatives — the same maths, a different memory schedule.", keywords: ["flash attention", "tiling", "sram", "io aware", "memory"] },
          { id: "3.5", title: "Batching Strategies", difficulty: "core", minutes: 30, tier: "must",
            summary: "Static, dynamic and continuous batching, and the latency each one trades for throughput.", keywords: ["batching", "continuous batching", "throughput", "latency", "padding"] },
          { id: "3.6", title: "Speculative Decoding", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "A draft model proposing tokens the big model verifies, and when the arithmetic works out.", keywords: ["speculative decoding", "draft model", "acceptance rate", "verification"] },
          { id: "3.7", title: "Serving Frameworks", difficulty: "core", minutes: 30, tier: "must",
            summary: "vLLM, TGI, TensorRT-LLM and the rest — what each is for and where each wins.", keywords: ["vllm", "tgi", "tensorrt", "sglang", "ollama", "serving"] },
          { id: "3.8", title: "Distributed Inference", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Tensor, pipeline and expert parallelism, and the communication each one adds.", keywords: ["tensor parallel", "pipeline parallel", "sharding", "nccl", "multi-gpu"] },
          { id: "3.9", title: "Model Compression", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "Pruning and distillation as alternatives to quantization, and what each keeps.", keywords: ["pruning", "distillation", "sparsity", "compression"] },
          { id: "3.10", title: "Deployment Architectures", difficulty: "core", minutes: 30, tier: "must",
            summary: "API, self-hosted and hybrid, with the cost and control each one implies.", keywords: ["deployment", "self hosted", "api", "hybrid", "gateway", "autoscaling"] },
          { id: "3.11", title: "Benchmarking and Monitoring", difficulty: "core", minutes: 28, tier: "must",
            summary: "The numbers to measure, the ones that mislead, and how to load-test a token stream.", keywords: ["benchmark", "throughput", "p99", "load test", "monitoring"] },
          { id: "3.12", title: "Cost Optimization in Serving", difficulty: "core", minutes: 28, tier: "must",
            summary: "The cost per million tokens of your own hardware, worked, against the API price.", keywords: ["cost", "gpu hours", "utilisation", "break even", "spot"] },
          { id: "3.13", title: "Grammar-Constrained Decoding", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Masking the logits to a grammar so invalid output is impossible rather than unlikely.", keywords: ["grammar", "constrained decoding", "ebnf", "outlines", "fsm", "json schema"] },
          { id: "3.14", title: "LMSYS Chatbot Arena", difficulty: "core", minutes: 24, tier: "should",
            summary: "Pairwise human preference at scale, the Elo it produces, and what it cannot tell you.", keywords: ["chatbot arena", "elo", "bradley-terry", "preference", "leaderboard"] }
        ]
      },

      /* ================================================================
         M4 · 03_Fine_Tuning_LLM.md §1–9
         ================================================================ */
      {
        id: "finetuning",
        short: "M4",
        dir: "04_finetuning",
        phase: "Phase 2 · Running a model",
        title: "Adapting a Model with LoRA",
        blurb: "The parameter question: how to change a model's behaviour without retraining it. What fine-tuning is and when it beats retrieval or prompting, the one low-rank idea behind LoRA, the formula and why the scaling is alpha over r, QLoRA's four-bit base, and one complete worked run from data to merged weights.",
        outcome: "You can decide between prompting, retrieval and fine-tuning on evidence, and run a LoRA job whose settings you can each justify.",
        source: "03_Fine_Tuning_LLM.md",
        lessons: [
          { id: "4.1", title: "What Fine-Tuning Is", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "Changing weights rather than context, and what that can and cannot teach a model.", keywords: ["fine tuning", "weights", "adaptation", "catastrophic forgetting"] },
          { id: "4.2", title: "Fine-Tune, Retrieve or Prompt", difficulty: "core", minutes: 28, tier: "must",
            summary: "The three ways to change an answer, and the question each one is actually the answer to.", keywords: ["rag", "prompting", "fine tuning", "decision", "knowledge", "behaviour"] },
          { id: "4.3", title: "How LoRA Works", difficulty: "core", minutes: 30, tier: "must",
            summary: "The update matrix is low-rank, so store the two factors instead — the whole idea in one picture.", keywords: ["lora", "low rank", "decomposition", "adapter", "rank"] },
          { id: "4.4", title: "The Formula, and Why alpha Over r", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "h = W0x + (alpha/r)BAx carried through on numbers, and what the scaling term is protecting.", keywords: ["lora", "alpha", "rank", "scaling", "formula", "initialisation"] },
          { id: "4.5", title: "QLoRA", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "A four-bit frozen base with adapters in higher precision, and the VRAM that makes possible.", keywords: ["qlora", "nf4", "4-bit", "vram", "double quantization", "paged optimizer"] },
          { id: "4.6", title: "What Happens During Training", difficulty: "core", minutes: 28, tier: "should",
            summary: "The data flow through a LoRA step, what is frozen, and what the loss curve should look like.", keywords: ["training loop", "gradient", "frozen", "loss curve", "trainable parameters"] },
          { id: "4.7", title: "One Complete Example", difficulty: "core", minutes: 36, tier: "must",
            summary: "The reference's worked QLoRA run end to end — data, train, test, merge.", keywords: ["worked example", "dataset", "peft", "trl", "merge", "inference"] },
          { id: "4.8", title: "The Settings That Matter", difficulty: "core", minutes: 28, tier: "must",
            summary: "The handful of hyperparameters worth touching, sensible defaults, and the reference's FAQ.", keywords: ["rank", "alpha", "learning rate", "epochs", "target modules", "faq"] }
        ]
      },

      /* ================================================================
         M5 · 05_RAG_and_Vector_Stores.md §1–13.5
         ================================================================ */
      {
        id: "rag",
        short: "M5",
        dir: "05_rag",
        phase: "Phase 3 · Giving it something to read",
        title: "Retrieval-Augmented Generation",
        blurb: "Retrieval from the ground up: what RAG is for and what it is not, embeddings and the chunking decisions that determine everything downstream, the vector stores and their index structures, the similarity metrics, the naive pipeline, then query transformation, hybrid search, re-ranking, the advanced patterns, agentic retrieval, structured data and caching.",
        outcome: "You can build a retrieval pipeline whose every stage you can justify, and diagnose a bad answer to the stage that produced it.",
        source: "05_RAG_and_Vector_Stores.md",
        lessons: [
          { id: "5.1", title: "RAG Fundamentals", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Retrieve, then generate — the shape of the pipeline and the problem it solves.", keywords: ["rag", "retrieval", "grounding", "context", "pipeline"] },
          { id: "5.2", title: "RAG, Fine-Tuning or Prompting", difficulty: "core", minutes: 26, tier: "must",
            summary: "The same decision as 4.2, from the retrieval side, with the cost of each.", keywords: ["rag", "fine tuning", "prompting", "knowledge", "freshness", "decision"] },
          { id: "5.3", title: "Embeddings", difficulty: "core", minutes: 32, tier: "must",
            summary: "What an embedding model is trained to do, the model choices, and the dimensions that cost you.", keywords: ["embeddings", "bi-encoder", "dimension", "normalisation", "mteb", "model choice"] },
          { id: "5.4", title: "Chunking Strategies", difficulty: "core", minutes: 36, tier: "must",
            summary: "Fixed, recursive, semantic and document-aware chunking, and why this is the decision that matters most.", keywords: ["chunking", "overlap", "recursive", "semantic", "markdown", "chunk size"] },
          { id: "5.5", title: "Vector Stores and Indexing", difficulty: "core", minutes: 36, tier: "must",
            summary: "FAISS, Chroma, Pinecone, Qdrant and pgvector, and the HNSW and IVF structures underneath.", keywords: ["faiss", "chroma", "pinecone", "qdrant", "pgvector", "hnsw", "ivf"] },
          { id: "5.6", title: "Similarity Search and Metrics", difficulty: "core", minutes: 26, tier: "must",
            summary: "Cosine, dot product and L2 — when they agree, when they do not, and what normalisation assumes.", keywords: ["cosine", "dot product", "euclidean", "normalisation", "ann", "recall"] },
          { id: "5.7", title: "The Naive RAG Pipeline", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "The simplest thing that works, end to end, as the baseline everything else must beat.", keywords: ["pipeline", "baseline", "top-k", "prompt template", "citation"] },
          { id: "5.8", title: "Query Transformation", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Rewriting, expansion, HyDE and step-back prompting — fixing the query rather than the index.", keywords: ["query rewriting", "hyde", "multi query", "step back", "expansion"] },
          { id: "5.9", title: "Hybrid Search and Re-ranking", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "BM25 beside vectors, reciprocal rank fusion, and a cross-encoder that reorders the shortlist.", keywords: ["hybrid search", "bm25", "rrf", "cross encoder", "colbert", "reranking"] },
          { id: "5.10", title: "Advanced RAG Patterns", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Self-RAG, corrective RAG and the parent-document and small-to-big patterns.", keywords: ["self rag", "crag", "parent document", "small to big", "sentence window"] },
          { id: "5.11", title: "Agentic RAG", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Letting the model decide whether, what and how often to retrieve.", keywords: ["agentic rag", "router", "tool", "iteration", "planning"] },
          { id: "5.12", title: "RAG with Structured Data", difficulty: "core", minutes: 28, tier: "should",
            summary: "Text-to-SQL and table retrieval, where embeddings are the wrong instrument.", keywords: ["text to sql", "tables", "structured", "schema", "sql agent"] },
          { id: "5.13", title: "Caching, Citations and Observability", difficulty: "core", minutes: 30, tier: "must",
            summary: "Semantic caching and its false hits, citations that survive review, and what to log.", keywords: ["semantic cache", "citation", "observability", "cache hit", "attribution"] }
        ]
      },

      /* ================================================================
         M6 · 05_RAG_and_Vector_Stores.md §14–22
         ================================================================ */
      {
        id: "rag_production",
        short: "M6",
        dir: "06_rag_production",
        phase: "Phase 3 · Giving it something to read",
        title: "Retrieval in Production",
        blurb: "What happens to a retrieval system once it has users: RAGAS and the four scores, scaling and cost, knowledge graphs, multimodal and code retrieval, the operational questions about traffic and coordination, and the real incidents the reference collected.",
        outcome: "You can measure a retrieval system, run it at volume, and recognise the failure that caused an incident from its symptoms.",
        source: "05_RAG_and_Vector_Stores.md",
        lessons: [
          { id: "6.1", title: "Evaluation with RAGAS", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Faithfulness, answer relevancy, context precision and recall — each computed, not just named.", keywords: ["ragas", "faithfulness", "answer relevancy", "context precision", "context recall"] },
          { id: "6.2", title: "Production and Scalability", difficulty: "core", minutes: 28, tier: "must",
            summary: "Index size, update strategy, sharding and the latency budget of a retrieval call.", keywords: ["scalability", "index", "reindex", "sharding", "latency", "throughput"] },
          { id: "6.3", title: "Additional RAG Topics", difficulty: "core", minutes: 28, tier: "should",
            summary: "The reference's collection of things that do not fit elsewhere but bite in practice.", keywords: ["metadata", "filtering", "access control", "freshness", "deduplication"] },
          { id: "6.4", title: "Knowledge Graphs and GraphRAG", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Retrieval over entities and relations, and the questions a vector index cannot answer.", keywords: ["knowledge graph", "graphrag", "entity", "relation", "community", "neo4j"] },
          { id: "6.5", title: "Multimodal RAG", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Retrieving over images, tables and diagrams alongside text.", keywords: ["multimodal rag", "image", "table", "clip", "colpali", "pdf"] },
          { id: "6.6", title: "RAG for Code", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Why code chunks on syntax rather than length, and what a repository index must carry.", keywords: ["code rag", "ast", "repository", "symbol", "chunking", "context"] },
          { id: "6.7", title: "Traffic, Cost and Guardrails", difficulty: "core", minutes: 28, tier: "must",
            summary: "The operational questions: who pays, what happens at peak, and who is allowed to see what.", keywords: ["traffic", "cost", "rate limit", "access control", "guardrail", "coordination"] },
          { id: "6.8", title: "Real Production Incidents", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "The reference's incident write-ups, each traced to the stage that broke.", keywords: ["incident", "postmortem", "regression", "stale index", "embedding drift"] }
        ]
      },

      /* ================================================================
         M7 · 07_LLM_Training_and_Alignment.md §0–14
         ================================================================ */
      {
        id: "alignment",
        short: "M7",
        dir: "07_alignment",
        phase: "Phase 4 · How it learnt to answer",
        title: "Training and Alignment",
        blurb: "The objective question: how a model learns what a good answer is. Pretraining and Chinchilla, supervised fine-tuning and its loss masking, the reward model derived from Bradley-Terry, RLHF with PPO and its KL leash, DPO with the derivation that deletes the reward model, the DPO family, GRPO, RLVR and reasoning models, test-time compute, reward hacking, RLAIF, and distillation.",
        outcome: "You can derive DPO from the RLHF objective, say what each method in the family removes, and choose one from the data you actually have.",
        source: "07_LLM_Training_and_Alignment.md",
        lessons: [
          { id: "7.1", title: "The One Idea", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "Pretraining gives a model language; everything after it gives the model a preference.", keywords: ["alignment", "post-training", "preference", "objective", "stages"] },
          { id: "7.2", title: "Pretraining and Chinchilla", difficulty: "core", minutes: 30, tier: "must",
            summary: "Next-token prediction at scale, and the compute-optimal token-to-parameter ratio.", keywords: ["pretraining", "chinchilla", "scaling laws", "compute optimal", "tokens", "flops"] },
          { id: "7.3", title: "Supervised Fine-Tuning", difficulty: "core", minutes: 30, tier: "must",
            summary: "Loss masking, chat templates, and why SFT data quality dominates SFT data quantity.", keywords: ["sft", "loss masking", "chat template", "instruction tuning", "data quality"] },
          { id: "7.4", title: "The Reward Model", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Bradley-Terry on pairwise preferences, worked on numbers and then written from scratch.", keywords: ["reward model", "bradley terry", "pairwise", "preference", "logistic"] },
          { id: "7.5", title: "RLHF with PPO", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Four models in memory, the KL leash that stops the policy running away, and what it costs.", keywords: ["rlhf", "ppo", "kl penalty", "critic", "policy", "reference model"] },
          { id: "7.6", title: "DPO", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "The full derivation — why the partition function cancels — then the loss on numbers and from scratch.", keywords: ["dpo", "derivation", "partition function", "implicit reward", "beta"] },
          { id: "7.7", title: "The DPO Family", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "ORPO, KTO, SimPO and IPO, each defined by what it removes.", keywords: ["orpo", "kto", "simpo", "ipo", "reference free", "unpaired"] },
          { id: "7.8", title: "GRPO", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Group-normalised advantage deletes the critic, and the degenerate case where all rewards agree.", keywords: ["grpo", "group advantage", "critic free", "normalisation", "degenerate"] },
          { id: "7.9", title: "RLVR and Reasoning Models", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Verifiable rewards, and how a model is trained to think before it answers.", keywords: ["rlvr", "verifiable reward", "reasoning", "r1", "chain of thought"] },
          { id: "7.10", title: "Test-Time Compute", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "The second scaling axis: spending more at inference instead of more in training.", keywords: ["test time compute", "scaling", "best of n", "search", "reasoning effort"] },
          { id: "7.11", title: "Reward Hacking and Overoptimization", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "The policy learns the reward model's mistakes, and the KL budget that bounds the damage.", keywords: ["reward hacking", "goodhart", "overoptimization", "kl", "proxy"] },
          { id: "7.12", title: "RLAIF and Constitutional AI", difficulty: "core", minutes: 26, tier: "should",
            summary: "Replacing the human labeller with a model and a written constitution.", keywords: ["rlaif", "constitutional ai", "ai feedback", "critique", "revision"] },
          { id: "7.13", title: "Distillation and Model Merging", difficulty: "core", minutes: 28, tier: "should",
            summary: "Teaching a small model from a large one, and averaging weights that were trained apart.", keywords: ["distillation", "merging", "slerp", "ties", "teacher", "student"] },
          { id: "7.14", title: "Choosing a Method", difficulty: "core", minutes: 26, tier: "must",
            summary: "The decision guide, keyed on the data you have rather than the paper you read.", keywords: ["decision", "preference data", "budget", "sft", "dpo", "grpo"] },
          { id: "7.15", title: "Evaluating an Aligned Model", difficulty: "core", minutes: 28, tier: "must",
            summary: "Win rates, the alignment tax, and the regression that alignment work usually causes.", keywords: ["win rate", "alignment tax", "regression", "benchmark", "judge"] }
        ]
      },

      /* ================================================================
         M8 · 06_LLM_Evaluation.md
         ================================================================ */
      {
        id: "evaluation",
        short: "M8",
        dir: "08_evaluation",
        phase: "Phase 5 · Knowing whether it works",
        title: "Evaluating Models and Applications",
        blurb: "Two different jobs that share a word: evaluating a model — perplexity, reference metrics, benchmarks, leaderboards, the judge, safety and calibration — and evaluating an application, where the unit is a RAG answer, an agent trajectory or a guardrail, and where online evaluation is the only ground truth.",
        outcome: "You can tell which of the two jobs a question is about, pick the metric that answers it, and say what that metric cannot see.",
        source: "06_LLM_Evaluation.md",
        lessons: [
          { id: "8.1", title: "The One Idea", difficulty: "foundation", minutes: 24, tier: "must",
            summary: "Evaluating a model and evaluating an application are different jobs with different units.", keywords: ["evaluation", "model", "application", "unit", "ground truth"] },
          { id: "8.2", title: "Perplexity", difficulty: "core", minutes: 28, tier: "must",
            summary: "The intrinsic metric, computed, and the reasons it stopped being enough.", keywords: ["perplexity", "cross entropy", "intrinsic", "tokenizer", "comparison"] },
          { id: "8.3", title: "Reference-Based Metrics", difficulty: "core", minutes: 28, tier: "should",
            summary: "BLEU, ROUGE and friends where a reference answer exists, and the tasks where one does not.", keywords: ["bleu", "rouge", "reference", "n-gram", "task specific"] },
          { id: "8.4", title: "Standard Benchmarks", difficulty: "core", minutes: 28, tier: "must",
            summary: "MMLU, GSM8K, HumanEval and the rest — what each measures and how each gets gamed.", keywords: ["mmlu", "gsm8k", "humaneval", "benchmark", "contamination"] },
          { id: "8.5", title: "Leaderboards and Elo", difficulty: "core", minutes: 26, tier: "should",
            summary: "Preference at scale, the Elo update, and the confidence interval nobody prints.", keywords: ["leaderboard", "elo", "arena", "preference", "confidence"] },
          { id: "8.6", title: "LLM-as-a-Judge", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "The workhorse of modern evaluation: the rubric, the prompt, and the agreement you must measure.", keywords: ["llm as judge", "rubric", "pairwise", "agreement", "kappa"] },
          { id: "8.7", title: "Safety, Truthfulness and Calibration", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "TruthfulQA, robustness suites, and whether a model's confidence means anything.", keywords: ["truthfulqa", "robustness", "calibration", "ece", "refusal"] },
          { id: "8.8", title: "RAG Evaluation in Two Stages", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Score retrieval and generation separately, because a single number hides which one failed.", keywords: ["rag evaluation", "retrieval", "generation", "faithfulness", "recall"] },
          { id: "8.9", title: "Agent and Tool-Use Evaluation", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Judging a trajectory rather than an answer: tool choice, arguments, recovery and cost.", keywords: ["agent evaluation", "trajectory", "tool use", "success rate", "steps"] },
          { id: "8.10", title: "End-to-End, Regression and Guardrail Evaluation", difficulty: "core", minutes: 30, tier: "must",
            summary: "A golden set that gates a deploy, and the safety checks that run beside it.", keywords: ["regression", "golden set", "ci", "guardrail", "end to end"] },
          { id: "8.11", title: "Online Evaluation", difficulty: "core", minutes: 28, tier: "must",
            summary: "Implicit signals, A/B tests and live scoring — the only evaluation on real traffic.", keywords: ["online evaluation", "a/b test", "implicit feedback", "thumbs", "live"] },
          { id: "8.12", title: "A RAG Answer Evaluated End to End", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "The reference's worked example, every score computed on one real answer.", keywords: ["worked example", "rag", "faithfulness", "relevancy", "scoring"] },
          { id: "8.13", title: "Choosing a Metric, and the Tooling", difficulty: "core", minutes: 26, tier: "must",
            summary: "The cheat sheet, the frameworks, and the pitfalls the reference keeps as soundbites.", keywords: ["metric selection", "tooling", "ragas", "deepeval", "pitfalls"] }
        ]
      },

      /* ================================================================
         M9 · 26_LLM_Metrics_and_LLM_as_Judge.md §1–18
         ================================================================ */
      {
        id: "metrics",
        short: "M9",
        dir: "09_metrics",
        phase: "Phase 5 · Knowing whether it works",
        title: "Metrics and the Judge",
        blurb: "Every metric that gets quoted about a language model, computed rather than cited: perplexity, BLEU, ROUGE, METEOR, chrF and BERTScore, exact match and F1, pass@k, the retrieval family from precision@k to NDCG, the RAG scores, then the judge itself — its biases, its calibration against humans, and the statistics nobody runs.",
        outcome: "You can compute any metric in the field by hand, and say what a reported number leaves out.",
        source: "26_LLM_Metrics_and_LLM_as_Judge.md",
        lessons: [
          { id: "9.1", title: "The Map: Four Families", difficulty: "foundation", minutes: 24, tier: "must",
            summary: "Every metric belongs to one of four families; knowing which tells you what it can see.", keywords: ["metrics", "taxonomy", "intrinsic", "reference", "retrieval", "judge"] },
          { id: "9.2", title: "Perplexity", difficulty: "core", minutes: 28, tier: "must",
            summary: "Computed from a real model's log-probabilities, and why two models' numbers rarely compare.", keywords: ["perplexity", "log probability", "cross entropy", "tokenizer"] },
          { id: "9.3", title: "BLEU", difficulty: "core", minutes: 30, tier: "must",
            summary: "Modified n-gram precision, the brevity penalty, and the geometric mean — all on one pair.", keywords: ["bleu", "precision", "brevity penalty", "n-gram", "clipping"] },
          { id: "9.4", title: "ROUGE", difficulty: "core", minutes: 28, tier: "must",
            summary: "ROUGE-1, ROUGE-2 and ROUGE-L worked, and the summaries they reward wrongly.", keywords: ["rouge", "recall", "lcs", "summarization", "f1"] },
          { id: "9.5", title: "METEOR, chrF and BERTScore", difficulty: "core", minutes: 28, tier: "should",
            summary: "Three attempts to fix n-gram overlap, and what each one buys.", keywords: ["meteor", "chrf", "bertscore", "stemming", "embedding", "alignment"] },
          { id: "9.6", title: "Exact Match, F1 and Accuracy", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "The simplest metrics, the normalisation they depend on, and where they mislead.", keywords: ["exact match", "f1", "accuracy", "normalisation", "span"] },
          { id: "9.7", title: "Pass@k", difficulty: "core", minutes: 28, tier: "must",
            summary: "The unbiased estimator for code, derived, with the curve it produces.", keywords: ["pass@k", "humaneval", "estimator", "code", "sampling"] },
          { id: "9.8", title: "Retrieval Metrics", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Precision@k, recall@k, MAP, MRR and NDCG computed on one ranked list.", keywords: ["precision@k", "recall@k", "map", "mrr", "ndcg", "dcg", "ranking"] },
          { id: "9.9", title: "RAG Metrics", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "The RAGAS family as arithmetic rather than as an API call.", keywords: ["ragas", "faithfulness", "relevancy", "context precision", "claims"] },
          { id: "9.10", title: "LLM-as-a-Judge", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Pointwise, pairwise and reference-guided judging, and the prompt each one needs.", keywords: ["judge", "pointwise", "pairwise", "rubric", "reference guided"] },
          { id: "9.11", title: "Judge Biases, and the Fixes", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Position, verbosity, self-preference and formatting bias — each measured, each mitigated.", keywords: ["position bias", "verbosity bias", "self preference", "swap", "bias"] },
          { id: "9.12", title: "Calibrating a Judge Against Humans", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Cohen's kappa and the agreement study that makes a judge's score mean something.", keywords: ["kappa", "agreement", "human labels", "calibration", "inter-rater"] },
          { id: "9.13", title: "Agent-as-a-Judge and Agent Metrics", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Scoring a trajectory, and the metrics that only exist once a model can act.", keywords: ["agent judge", "trajectory", "tool accuracy", "steps", "cost per task"] },
          { id: "9.14", title: "Safety, Robustness and Calibration", difficulty: "core", minutes: 28, tier: "should",
            summary: "The metrics for refusal, adversarial robustness and confidence, with ECE computed.", keywords: ["safety", "robustness", "calibration", "ece", "refusal rate"] },
          { id: "9.15", title: "Latency, Throughput and Cost", difficulty: "core", minutes: 26, tier: "must",
            summary: "The operational metrics, the percentiles that matter, and a latency budget worked.", keywords: ["latency", "p95", "throughput", "cost per request", "ttft", "budget"] },
          { id: "9.16", title: "The Statistics Nobody Runs", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Confidence intervals on an eval score, and the sample size a claimed win needs.", keywords: ["confidence interval", "bootstrap", "sample size", "significance", "overlap"] },
          { id: "9.17", title: "Choosing a Metric, and the Pitfalls", difficulty: "core", minutes: 26, tier: "must",
            summary: "The selection table, and the mistakes the reference keeps a list of.", keywords: ["metric selection", "pitfalls", "gaming", "proxy", "interview"] }
        ]
      },

      /* ================================================================
         M10 · 27_LLM_Observability_and_Tracing.md §1–15
         ================================================================ */
      {
        id: "observability",
        short: "M10",
        dir: "10_observability",
        phase: "Phase 5 · Knowing whether it works",
        title: "Observability and Tracing",
        blurb: "Why a non-deterministic system needs different instrumentation: the four signals, the four layers worth measuring, traces and spans and what each span must carry, a tracer written from scratch, the OpenTelemetry GenAI conventions, sampling and PII, online evals on live traffic, alerts that fire for a reason, and one long worked incident.",
        outcome: "You can instrument an LLM application so that a quality regression is diagnosable from its traces rather than from guesswork.",
        source: "27_LLM_Observability_and_Tracing.md",
        lessons: [
          { id: "10.1", title: "Why LLM Systems Need Their Own Observability", difficulty: "core", minutes: 26, tier: "must",
            summary: "The failures are silent and the output is different every time, so the usual signals do not fire.", keywords: ["observability", "non-determinism", "silent failure", "quality", "monitoring"] },
          { id: "10.2", title: "The Four Signals", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "Metrics, logs, traces and evals — what each answers and what none of them can.", keywords: ["metrics", "logs", "traces", "evals", "signals"] },
          { id: "10.3", title: "What to Measure: The Four Layers", difficulty: "core", minutes: 28, tier: "must",
            summary: "Infrastructure, model, application and business, and the metric each layer owns.", keywords: ["layers", "infrastructure", "model", "application", "business", "kpi"] },
          { id: "10.4", title: "Traces and Spans", difficulty: "core", minutes: 28, tier: "must",
            summary: "The vocabulary — trace, span, parent, attribute, event — applied to one request.", keywords: ["trace", "span", "parent", "attribute", "context propagation"] },
          { id: "10.5", title: "A Worked Trace of One RAG Request", difficulty: "core", minutes: 30, tier: "must",
            summary: "Every span of a real retrieval request, with the timing that shows where it went.", keywords: ["trace", "rag", "waterfall", "timing", "span"] },
          { id: "10.6", title: "What Every Span Must Carry", difficulty: "core", minutes: 26, tier: "must",
            summary: "The attributes without which a trace cannot answer a question later.", keywords: ["attributes", "model", "tokens", "cost", "prompt version", "user"] },
          { id: "10.7", title: "A Tracer From Scratch", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "The reference's 25-line tracer, built and run, so the vendors stop being magic.", keywords: ["tracer", "context var", "decorator", "span", "from scratch"] },
          { id: "10.8", title: "OpenTelemetry and the GenAI Conventions", difficulty: "core", minutes: 28, tier: "should",
            summary: "The standard attribute names, and why using them is what makes a trace portable.", keywords: ["opentelemetry", "otel", "semantic conventions", "gen_ai", "exporter"] },
          { id: "10.9", title: "The Tool Landscape", difficulty: "foundation", minutes: 24, tier: "should",
            summary: "LangSmith, Langfuse, Phoenix, Braintrust and the rest — what distinguishes them.", keywords: ["langsmith", "langfuse", "phoenix", "braintrust", "tooling"] },
          { id: "10.10", title: "Sampling, PII and the Cost of Observability", difficulty: "core", minutes: 28, tier: "must",
            summary: "You cannot store every prompt: what to sample, what to redact, and what that costs.", keywords: ["sampling", "pii", "redaction", "retention", "cost"] },
          { id: "10.11", title: "Online Evals on Live Traffic", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "Scoring a fraction of production requests, and keeping the scoring from becoming the bill.", keywords: ["online eval", "sampling", "judge", "live traffic", "cost"] },
          { id: "10.12", title: "Alerts That Actually Fire", difficulty: "core", minutes: 28, tier: "must",
            summary: "Thresholds on metrics that move for a reason, and the ones that only page you at 3am.", keywords: ["alerting", "threshold", "false positive", "slo", "paging"] },
          { id: "10.13", title: "When Accuracy Fell From 95% to 60%", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "The reference's long incident, decomposed hypothesis by hypothesis to the cause.", keywords: ["incident", "decomposition", "hypothesis", "regression", "root cause"] },
          { id: "10.14", title: "The Runbook and the Pitfalls", difficulty: "core", minutes: 26, tier: "must",
            summary: "The condensed procedure, and the instrumentation mistakes that make it useless.", keywords: ["runbook", "procedure", "pitfalls", "triage", "checklist"] }
        ]
      },

      /* ================================================================
         M11 · 20_Hallucination + 21_Cost + 23_Guardrails
         ================================================================ */
      {
        id: "failure_modes",
        short: "M11",
        dir: "11_failure_modes",
        phase: "Phase 6 · Production",
        title: "Hallucination, Cost and Guardrails",
        blurb: "The three production issues that arrive first. Why models state things that are not true and why retrieval does not stop it; where an LLM bill actually comes from and the five levers that reduce it; and the guardrail pipeline on both sides of the model, including the over-refusal that a careless one creates.",
        outcome: "You can detect an unfaithful answer, cut a bill without cutting quality, and build a guardrail that blocks attacks without blocking users.",
        source: "20_LLM_Hallucination_and_Faithfulness.md · 21_LLM_Cost_and_Token_Optimization.md · 23_LLM_Guardrails_and_Safety.md",
        lessons: [
          { id: "11.1", title: "Why Models Hallucinate", difficulty: "core", minutes: 28, tier: "must",
            summary: "The mechanism, not the metaphor: what next-token prediction does when it does not know.", keywords: ["hallucination", "confabulation", "next token", "uncertainty", "mechanism"] },
          { id: "11.2", title: "Why RAG Still Hallucinates", difficulty: "core", minutes: 28, tier: "must",
            summary: "Grounding is not a guarantee — the four ways an answer departs from its context.", keywords: ["rag", "faithfulness", "grounding", "context", "unsupported"] },
          { id: "11.3", title: "Hallucination in Production", difficulty: "core", minutes: 28, tier: "should",
            summary: "The reference's real scenarios, each with what the user saw and what caused it.", keywords: ["scenario", "production", "incident", "citation", "fabrication"] },
          { id: "11.4", title: "Detecting Hallucination From Scratch", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Claim extraction, entailment against the context, and self-consistency — implemented.", keywords: ["detection", "claim", "entailment", "nli", "self consistency"] },
          { id: "11.5", title: "Mitigation in Depth", difficulty: "core", minutes: 30, tier: "must",
            summary: "The layered defences, ordered by what each one costs you in latency and refusals.", keywords: ["mitigation", "citation", "abstention", "verification", "defence in depth"] },
          { id: "11.6", title: "Faithfulness in Production", difficulty: "core", minutes: 28, tier: "must",
            summary: "Measuring faithfulness on live traffic, the decision flow, and the checklist.", keywords: ["faithfulness", "monitoring", "decision flow", "checklist", "threshold"] },
          { id: "11.7", title: "Where the Bill Comes From", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Decomposing a real monthly bill into the calls, tokens and models that caused it.", keywords: ["cost", "tokens", "bill", "decomposition", "unit economics"] },
          { id: "11.8", title: "Cutting Input and Output Tokens", difficulty: "core", minutes: 28, tier: "must",
            summary: "The two largest levers, with what each one is worth and what it risks.", keywords: ["input tokens", "output tokens", "compression", "truncation", "max tokens"] },
          { id: "11.9", title: "Routing, Cascades and Caching", difficulty: "core", minutes: 30, tier: "must",
            summary: "Sending the easy queries somewhere cheaper, and not sending the repeated ones at all.", keywords: ["routing", "cascade", "caching", "small model", "confidence"] },
          { id: "11.10", title: "Batching, Streaming and the Agentic Multiplier", difficulty: "core", minutes: 26, tier: "must",
            summary: "Throughput levers that are not price levers, and why agents multiply everything.", keywords: ["batching", "streaming", "agent", "multiplier", "steps", "throughput"] },
          { id: "11.11", title: "Budgets, Monitoring and Guardrails on Spend", difficulty: "core", minutes: 26, tier: "must",
            summary: "Per-user and per-feature budgets, the alerts, and the decision flow.", keywords: ["budget", "quota", "monitoring", "alert", "spend", "limit"] },
          { id: "11.12", title: "The Risk Taxonomy", difficulty: "core", minutes: 26, tier: "must",
            summary: "What a guardrail is actually defending against, sorted into categories that behave differently.", keywords: ["risk", "taxonomy", "harm", "injection", "pii", "policy"] },
          { id: "11.13", title: "Input Guardrails", difficulty: "core", minutes: 28, tier: "must",
            summary: "Everything you can check before the model sees the request, and what each check costs.", keywords: ["input guardrail", "classifier", "injection", "pii", "moderation"] },
          { id: "11.14", title: "Output Guardrails", difficulty: "core", minutes: 28, tier: "must",
            summary: "Checking a response before the user sees it, including on a stream.", keywords: ["output guardrail", "moderation", "schema", "pii", "streaming"] },
          { id: "11.15", title: "The Guardrail Pipeline", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Putting the checks in order, in parallel where possible, within a latency budget.", keywords: ["pipeline", "latency", "parallel", "fail open", "fail closed"] },
          { id: "11.16", title: "Over-Refusal and Red-Teaming", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "The other failure mode, and the testing that finds both kinds before users do.", keywords: ["over refusal", "false positive", "red team", "adversarial", "testing"] },
          { id: "11.17", title: "Guardrail Metrics and the Decision Flow", difficulty: "core", minutes: 26, tier: "must",
            summary: "Measuring a guardrail on both errors, and choosing thresholds deliberately.", keywords: ["metrics", "precision", "recall", "threshold", "decision flow", "checklist"] }
        ]
      },

      /* ================================================================
         M12 · 22_Eval_Prompts_and_Finetuning + 25_Deprecation
         ================================================================ */
      {
        id: "model_ops",
        short: "M12",
        dir: "12_model_ops",
        phase: "Phase 6 · Production",
        title: "Prompt, Eval and Model Operations",
        blurb: "The operational half of the work: running evaluation as a process rather than a one-off, managing prompts like deployable artefacts, keeping fine-tuning maintainable, and surviving the day a provider deprecates the model your product is built on.",
        outcome: "You can run an LLM feature through change — a new prompt, a new model, a deprecation notice — without a regression reaching users.",
        source: "22_LLM_Eval_Prompts_and_Finetuning.md · 25_Model_Deprecation_and_Migration.md",
        lessons: [
          { id: "12.1", title: "Evaluating LLMs in Production", difficulty: "core", minutes: 30, tier: "must",
            summary: "Turning evaluation into a pipeline that runs on every change, not a spreadsheet.", keywords: ["evaluation", "pipeline", "ci", "dataset", "regression"] },
          { id: "12.2", title: "Prompt Management", difficulty: "core", minutes: 28, tier: "must",
            summary: "Prompts as versioned artefacts with owners, diffs, rollout and rollback.", keywords: ["prompt management", "versioning", "registry", "rollout", "ownership"] },
          { id: "12.3", title: "Fine-Tuning in Production", difficulty: "core", minutes: 28, tier: "should",
            summary: "What a fine-tuned model commits you to, and the retraining cadence it implies.", keywords: ["fine tuning", "retraining", "drift", "ownership", "decision flow"] },
          { id: "12.4", title: "How Models Get Deprecated", difficulty: "core", minutes: 28, tier: "must",
            summary: "Silent version drift, hard sunsets and the behaviour changes between them.", keywords: ["deprecation", "version drift", "sunset", "pinning", "failure modes"] },
          { id: "12.5", title: "Instrumenting for Drift", difficulty: "core", minutes: 28, tier: "must",
            summary: "What to record now so that a change in the model is visible when it happens.", keywords: ["drift", "instrumentation", "fingerprint", "baseline", "canary"] },
          { id: "12.6", title: "The Migration Playbook", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Shadow traffic, paired evaluation and the staged cutover.", keywords: ["migration", "shadow", "cutover", "paired eval", "rollback"] },
          { id: "12.7", title: "A 90-Day Migration", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "The reference's worked timeline, with what happens in each window.", keywords: ["migration", "timeline", "worked example", "checklist", "risk"] }
        ]
      },

      /* ================================================================
         M13 · 28_Voice_Agents_and_Realtime.md §1–16
         ================================================================ */
      {
        id: "voice",
        short: "M13",
        dir: "13_voice",
        phase: "Phase 6 · Production",
        title: "Voice Agents and Real Time",
        blurb: "What changes when the interface is speech and the budget is measured in hundreds of milliseconds: the two architectures, the latency budget worked end to end, endpointing, barge-in and echo cancellation, streaming every stage, prompting for speech, living with transcription errors, the conversation state machine, and what a call costs.",
        outcome: "You can budget a voice turn, choose between a cascade and a speech-native model on the numbers, and name where a laggy agent is losing its time.",
        source: "28_Voice_Agents_and_Realtime.md",
        lessons: [
          { id: "13.1", title: "Why Voice Is a Different Problem", difficulty: "core", minutes: 26, tier: "must",
            summary: "Turn-taking, latency tolerance and the absence of a delete key.", keywords: ["voice", "latency", "turn taking", "realtime", "conversation"] },
          { id: "13.2", title: "Two Architectures", difficulty: "core", minutes: 28, tier: "must",
            summary: "ASR to LLM to TTS against a speech-native model, and what each gives up.", keywords: ["cascade", "speech native", "asr", "tts", "realtime api"] },
          { id: "13.3", title: "The Latency Budget, Worked", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Every millisecond of a turn accounted for, and where the budget is usually lost.", keywords: ["latency", "budget", "ttft", "endpointing", "network", "ms"] },
          { id: "13.4", title: "The Program", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The reference's working voice agent, read stage by stage.", keywords: ["program", "pipeline", "streaming", "audio", "implementation"] },
          { id: "13.5", title: "Endpointing", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Deciding the user has stopped talking — the hardest problem in the stack.", keywords: ["endpointing", "vad", "silence", "turn detection", "false trigger"] },
          { id: "13.6", title: "Barge-In and Echo Cancellation", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "Letting the user interrupt, and not letting the agent hear itself.", keywords: ["barge in", "echo cancellation", "interruption", "duplex", "aec"] },
          { id: "13.7", title: "Streaming Every Stage", difficulty: "core", minutes: 28, tier: "must",
            summary: "Partial transcripts, streamed tokens and streamed audio, overlapped.", keywords: ["streaming", "partial", "chunk", "overlap", "pipeline"] },
          { id: "13.8", title: "Prompting a Model That Will Be Spoken", difficulty: "core", minutes: 26, tier: "must",
            summary: "Writing for the ear: length, structure, numbers and the things markdown breaks.", keywords: ["prompting", "speech", "ssml", "brevity", "numbers", "formatting"] },
          { id: "13.9", title: "Living With ASR Errors", difficulty: "core", minutes: 26, tier: "should",
            summary: "Designing around transcription mistakes instead of pretending they do not happen.", keywords: ["asr", "wer", "confirmation", "phonetic", "recovery"] },
          { id: "13.10", title: "Tools and Latency Hiding", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Filling the silence while a tool runs, and what the user will forgive.", keywords: ["tools", "latency hiding", "filler", "acknowledgement", "async"] },
          { id: "13.11", title: "The Conversation State Machine", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "The states a voice turn moves through, and the transitions that go wrong.", keywords: ["state machine", "turn", "listening", "speaking", "transition"] },
          { id: "13.12", title: "Evaluating a Voice Agent", difficulty: "core", minutes: 28, tier: "should",
            summary: "What to measure when the output is audio and the transcript is not the product.", keywords: ["evaluation", "wer", "task success", "interruption rate", "latency"] },
          { id: "13.13", title: "Observability for Voice", difficulty: "core", minutes: 26, tier: "should",
            summary: "The spans a voice turn needs, and the audio you are allowed to keep.", keywords: ["observability", "spans", "audio", "pii", "retention"] },
          { id: "13.14", title: "What a Call Costs", difficulty: "core", minutes: 26, tier: "must",
            summary: "ASR, LLM and TTS priced per minute of conversation, carried through.", keywords: ["cost", "per minute", "asr", "tts", "tokens", "call"] },
          { id: "13.15", title: "Telephony, In-Car and On-Device", difficulty: "core", minutes: 26, tier: "should",
            summary: "The deployment targets that change the constraints, and the pitfalls list.", keywords: ["telephony", "sip", "in-car", "on-device", "codec", "pitfalls"] }
        ]
      }
    ]
  });
})();
