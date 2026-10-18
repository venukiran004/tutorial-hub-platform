/* ============================================================================
   LESSON 5.1 — BERT, GPT and T5
   The three families are probed on the same inputs: BERT's future attention
   is 0.3074 and GPT-2's is exactly 0, and asking BERT for three tokens
   returns gibberish (scratchpad/nlp/n51.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "**Asked to fill three blanks after \"The capital of France is\", BERT produced \"in le ##y\".** Given one blank it answers *paris* at 0.417. The difference is not knowledge — it is that BERT predicts each mask independently and cannot choose its own output length, which is precisely why an encoder-only model cannot generate. This lesson separates the three architecture families by what their attention is allowed to see, and shows what each can and cannot do as a consequence.",

  objectives: [
    "Distinguish the three families by attention pattern, objective and use case",
    "Verify bidirectional against causal attention numerically",
    "Explain concretely why an encoder-only model cannot generate",
    "Describe masked LM, next-token prediction and span corruption",
    "Justify why the field converged on decoder-only"
  ],

  prerequisites: ["4.10", "4.5"],

  blocks: [

    { t: "h2", n: "01", text: "Three families", id: "families" },

    {"kind": "trace", "title": "Three families, and the row that matters is what each cannot do", "caption": "**An encoder cannot generate autoregressively and a decoder cannot see its own future** — and those two limits are not design preferences, they follow from the attention mask. Encoder-decoder has a dash in that row, which is why it survived for translation and summarisation: **it reads bidirectionally and writes causally.** The measured sizes are worth noting too — **T5-small is 60.5M against BERT-base's 109.5M**, so the family and the size are independent choices.", "left": "property", "codeW": 140, "vars": ["encoder-only", "decoder-only", "encoder-decoder"], "steps": [{"code": "attention", "state": ["bidirectional", "causal", "both + cross"], "tone": "accent"}, {"code": "objective", "state": ["masked LM", "next token", "span corruption"], "changed": [0, 1, 2], "tone": "accent"}, {"code": "CANNOT", "state": ["generate", "see its future", "-"], "changed": [0, 1, 2], "tone": "crit"}, {"code": "examples", "state": ["BERT, RoBERTa, BGE", "GPT-4, LLaMA, Claude", "T5, BART, Whisper"], "changed": [0, 1, 2], "tone": "good"}, {"code": "measured size", "state": ["109,482,240", "124,439,808", "60,506,624"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-5_1-01-0"},






    { t: "table",
      head: ["", "Encoder-only", "Decoder-only", "Encoder-decoder"],
      rows: [
        ["Attention", "Bidirectional", "Causal", "Encoder bidirectional, decoder causal + cross"],
        ["Objective", "Masked LM", "Next-token prediction", "Span corruption / seq2seq"],
        ["Strength", "Understanding, embeddings", "Generation, in-context learning", "Source-to-target transformation"],
        ["Cannot", "Generate autoregressively", "See its own future", "—"],
        ["Examples", "BERT, RoBERTa, DeBERTa, BGE", "GPT-4, LLaMA, Mistral, Claude", "T5, BART, FLAN-T5, Whisper"],
        ["Size measured", "109,482,240 (BERT-base)", "124,439,808 (GPT-2)", "60,506,624 (T5-small)"]
      ] },

    { t: "h2", n: "02", text: "What each is allowed to see", id: "seeing" },

    {"kind": "trace", "title": "0.3074 to the future in BERT, exactly 0.0000 in GPT-2", "caption": "The same sentence through the first head of the first layer of each. **BERT's row 2 sends 0.3074 of its weight forward and distributes across all eight positions; GPT-2's row 2 is `[0.477, 0.139, 0.384, 0.000, 0.000, 0.000]` — three exact zeros.** Which makes the architectural claim concrete and checkable: **the difference between the two families is visible in one attention row, and the zeros are exact rather than small** because of 4.5's `-inf` fill.", "left": "model", "codeW": 170, "vars": ["max weight on a future token", "row 2"], "steps": [{"code": "bert-base-uncased", "state": ["0.3074", "spread over all 8 positions"], "tone": "accent"}, {"code": "gpt2", "state": ["0.0000", "[0.477, 0.139, 0.384, 0, 0, 0]"], "changed": [0, 1], "tone": "violet", "note": "exact, not small"}], "t": "diagram", "id": "dg-5_1-02-1"},






    { t: "out", text:
"\"the cat sat on the mat\", first head of the first layer\n\nbert-base-uncased  (encoder-only)\n  max attention to a FUTURE token: 0.3074\n  row 2 attends to: [0.099, 0.085, 0.113, 0.177, 0.066, 0.090, 0.201, 0.168]\n\ngpt2  (decoder-only)\n  max attention to a FUTURE token: 0.0000\n  row 2 attends to: [0.477, 0.139, 0.384, 0.000, 0.000, 0.000]" },

    { t: "callout", kind: "insight", title: "One number separates the families",
      body: [{ t: "p", text: "BERT's token 2 spreads attention across all eight positions, including the four that follow it — its single largest weight, **0.201**, goes to a token further right. GPT-2's token 2 puts **exactly 0.0** on every position after itself. That is the whole architectural distinction, and everything else follows from it: what objective you can train, whether you can generate, and what the model is good at. The causal mask is not an optimisation; it defines the family." }] },

    { t: "h2", n: "03", text: "BERT: masked language modelling", id: "bert" },

    {"kind": "trace", "title": "Eighty, ten and ten — a split that exists to prevent train-serve skew", "caption": "**Fine-tuning and inference never contain `[MASK]`, so if 100% of masked positions carried it, the pretraining and downstream distributions would differ at every position the model cared about** — a built-in train-serve skew of exactly 3.5's kind, designed out of the objective. And the measured fills show the objective working: **`floor` at 0.314 for the mat position, while the subject position is a flat `girl 0.069, man 0.067, dog 0.056`** — the context constrains one far more than the other.", "left": "component", "codeW": 170, "vars": ["what it does", "why"], "steps": [{"code": "mask 15% of tokens", "state": ["the objective", "-"], "tone": "accent"}, {"code": "of those, 80% -> [MASK]", "state": ["the normal case", "-"], "changed": [0], "tone": "good"}, {"code": "10% a random token", "state": ["forces real context use", "no [MASK] to lean on"], "changed": [0, 1], "tone": "violet"}, {"code": "10% left unchanged", "state": ["matches inference", "where [MASK] never appears", "-"], "changed": [0, 1], "tone": "violet"}, {"code": "NSP", "state": ["dropped by RoBERTa", "unnecessary"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-5_1-03-2"},






    { t: "out", text:
"MLM pre-training\n  mask 15% of tokens; of those, 80% become [MASK],\n  10% a random token, 10% are left unchanged\n\nNSP: given (sentence A, sentence B), is B the real next sentence?\n  RoBERTa showed NSP is unnecessary and removed it\n\nBERT-base   12 layers, 768 dim, 12 heads, 110M params\nBERT-large  24 layers, 1024 dim, 16 heads, 340M params" },

    { t: "out", text:
"filling masks, top-3 predictions\n\n  \"The [MASK] sat on the mat.\"     girl 0.069, man 0.067, dog 0.056\n  \"The cat sat on the [MASK].\"     floor 0.314, bed 0.119, couch 0.107\n  \"The [MASK] sat on the [MASK].\"  man 0.045 / floor 0.208" },

    { t: "callout", kind: "insight", title: "The second line only works because attention is bidirectional",
      body: [{ t: "p", text: "Predicting the *last* word uses only left context, which a causal model could also do. Predicting the *first* word — the one in \"The [MASK] sat on the mat\" — requires reading everything to its right. A decoder-only model structurally cannot do that, because by the time it reaches that position it has seen nothing after it. This is what makes BERT a better encoder: every token's representation is informed by the whole sentence, not just its prefix." }] },

    { t: "p", text: "The 80/10/10 split exists to stop the model becoming dependent on seeing a literal `[MASK]` token. Fine-tuning and inference never contain `[MASK]`, so if 100% of masked positions carried it, the pretraining and downstream distributions would differ at every position the model cared about — a built-in train-serve skew, of exactly the kind lesson 3.5 measured." },

    { t: "h2", n: "04", text: "Why BERT cannot generate", id: "cannot" },

    {"kind": "trace", "title": "One mask gives Paris; three masks give “in le ##y”", "caption": "**With one mask BERT is excellent — `paris` at 0.417. With three it produces `in le ##y`, because every masked position is predicted independently and in parallel, with no access to what the others decided.** Which is the precise reason an encoder cannot generate: **generation requires each token to condition on the previous one, and MLM's parallelism is exactly the absence of that.** Not a quality problem — a structural one.", "left": "prompt", "codeW": 190, "vars": ["output", "why"], "steps": [{"code": "'The capital of France is [MASK].'", "state": ["paris 0.417", "one decision"], "tone": "good"}, {"code": "'...is [MASK] [MASK] [MASK].'", "state": ["'in le ##y'", "three independent decisions"], "changed": [0, 1], "tone": "crit"}, {"code": "so", "state": ["no conditioning between positions", "which IS generation"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-5_1-04-3"},






    { t: "out", text:
"one mask\n  \"The capital of France is [MASK].\"\n  -> paris 0.417, lille 0.071, lyon 0.063\n\nthree masks\n  \"The capital of France is [MASK] [MASK] [MASK].\"\n  -> \"in le ##y\"" },

    { t: "callout", kind: "crit", title: "Two problems, both fatal for generation",
      body: [{ t: "p", text: "**You must decide the output length in advance.** The number of `[MASK]` tokens is part of the input, so the model cannot produce a two-word answer when you asked for three, or stop when it is finished. A decoder emits an end-of-text token and decides for itself. **And each mask is predicted independently.** There is no factorisation making mask 2 conditional on what mask 1 turned out to be, so the three positions produce individually-plausible tokens that do not form a phrase — `in le ##y`. Autoregression gets joint coherence for free from the chain rule; masked prediction does not have it at all." }] },

    { t: "h2", n: "05", text: "GPT: next-token prediction", id: "gpt" },

    {"kind": "trace", "title": "Five positions, five distributions, one forward pass", "caption": "**`logits` is (1, 5, 50257): one next-token distribution per position, all from a single pass** — this is 4.5's parallel training made concrete. **Each position is scored against the token that actually followed it, and the causal mask is what makes computing them simultaneously legitimate.** Read the confidences: **0.454 after `on` and 0.076 after `the`**, so the model is far surer about a preposition's object than about what the object is.", "left": "after", "codeW": 190, "vars": ["top token", "p"], "steps": [{"code": "'The'", "state": ["\\n", "0.014"], "tone": "warn"}, {"code": "'The cat'", "state": ["' was'", "0.110"], "changed": [0, 1], "tone": "good"}, {"code": "'The cat sat'", "state": ["' on'", "0.224"], "changed": [0, 1], "tone": "good"}, {"code": "'The cat sat on'", "state": ["' the'", "0.454"], "changed": [0, 1], "tone": "good", "note": "most confident"}, {"code": "'The cat sat on the'", "state": ["' floor'", "0.076"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-5_1-05-4"},






    { t: "out", text:
"prompt \"The cat sat on the\" -> logits (1, 5, 50257)\n\none next-token distribution per position, all from ONE forward pass\n\n  after 'The'                  \\n 0.014, ' the' 0.010\n  after 'The cat'              ' was' 0.110, ' is' 0.073\n  after 'The cat sat'          ' on' 0.224, ' in' 0.132\n  after 'The cat sat on'       ' the' 0.454, ' a' 0.110\n  after 'The cat sat on the'   ' floor' 0.076, ' bed' 0.065" },

    { t: "p", text: "Five positions, five distributions, one forward pass — this is the parallel training from lesson 4.5, made concrete. Each position is scored against the token that actually followed it, and the causal mask is what makes computing them simultaneously legitimate." },

    { t: "dl", items: [
      ["Greedy", "Take the argmax every step. Deterministic, and prone to the repetition loops lesson 3.4 found perplexity rewards."],
      ["Top-k", "Sample from the k highest-probability tokens. Simple, but k is fixed regardless of how peaked the distribution is."],
      ["Top-p (nucleus)", "Sample from the smallest set whose cumulative probability exceeds p. Adapts its size to the distribution's shape, which is why it is the usual default."],
      ["Temperature", "Divide logits by T before the softmax. T below 1 sharpens, above 1 flattens. Orthogonal to the truncation method, and composable with it."]
    ] },

    { t: "h2", n: "06", text: "T5: everything is text-to-text", id: "t5" },

    {"kind": "trace", "title": "One model, three tasks, and the task name is in the input string", "caption": "`t5-small` translates, summarises and judges grammatical acceptability — **and the only thing that changes is the prefix.** Which is what “everything is text-to-text” means operationally: **there is no task head, no label space and no output layer per task, so adding a task means writing a prefix.** The pretraining objective matches: **span corruption drops contiguous spans and trains the decoder to emit them, and crucially a span can be any length** — which is what BERT's fixed one-token-per-mask cannot do.", "left": "input prefix", "codeW": 200, "vars": ["output"], "steps": [{"code": "'translate English to German: ...'", "state": ["'Das Haus ist wunderbar.'"], "tone": "good"}, {"code": "'summarize: ...'", "state": ["a shortened version"], "changed": [0], "tone": "good"}, {"code": "'cola sentence: ...'", "state": ["'acceptable'"], "changed": [0], "tone": "good", "note": "a classification, as text"}, {"code": "pretraining", "state": ["span corruption - any length"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-5_1-06-5"},






    { t: "out", text:
"t5-small, one model, three completely different tasks\n\n  \"translate English to German: The house is wonderful.\"\n    -> \"Das Haus ist wunderbar.\"\n\n  \"summarize: The transformer replaced recurrence with attention, which\n     allowed parallel training and removed the sequential bottleneck.\"\n    -> \"transformer replaced recurrence with attention, which allowed\n        parallel training.\"\n\n  \"cola sentence: The course is jumping well.\"\n    -> \"acceptable\"" },

    { t: "callout", kind: "insight", title: "The task lives in the input string",
      body: [{ t: "p", text: "A 60-million-parameter model translated correctly into German, summarised, and gave a grammaticality judgement — with **no task-specific heads**, no separate classifiers, and no architectural change between the three. The task prefix is just more text. That reframing, which T5 introduced, is the direct ancestor of prompting: once every task is a string in and a string out, describing a new task is something you do at inference rather than at training time." }] },

    { t: "p", text: "T5's pretraining objective is span corruption: drop contiguous spans, replace each with a sentinel like `<extra_id_0>`, and train the decoder to emit the dropped spans. It sits between BERT's and GPT's objectives — bidirectional reading of the corrupted input, autoregressive generation of the output — and crucially a span can be **any length**, unlike BERT's rigid one-token-per-mask." },

    { t: "out", text:
"span corruption format\n\n  in:  \"The <extra_id_0> sat on the <extra_id_1> quietly.\"\n  out: \"<extra_id_0> ... <extra_id_1> ... <extra_id_2>\"\n\nt5-small's actual output here is poor - it is a 60M model and raw\nspan filling is not what it was fine-tuned for. The format is the point." },

    { t: "h2", n: "07", text: "Why decoder-only won", id: "convergence" },

    { t: "diagram", kind: "compare", title: "What each family still does best",
      columns: [
        { title: "Encoder-only", tone: "teal", items: [
          "Sentence embeddings and retrieval",
          "Cross-encoder reranking",
          "Token classification and NER",
          "Cheap: 110M is often enough",
          "Bidirectional context per token",
          "Still the right tool for these"
        ] },
        { title: "Decoder-only", tone: "violet", items: [
          "Chat, completion, code, agents",
          "In-context and few-shot learning",
          "One stack, one objective, scales",
          "No task-specific heads at all",
          "KV cache makes decoding tractable",
          "Where the field converged"
        ] }
      ] },

    { t: "callout", kind: "tradeoff", title: "Simplicity and scaling, not superiority at every task",
      body: [{ t: "p", text: "Decoder-only won because one stack trained on one objective scales cleanly, prompt and output share a single sequence, and **in-context learning emerged** — one model performs any task described in the prompt, with no head to train. That removed an entire engineering category. But it did not win on every axis. Encoder-only models remain better and far cheaper for embeddings and reranking, where you want one bidirectional representation rather than a generation. Encoder-decoder still wins where a distinct source needs a clean bidirectional read before any output is produced, which is why Whisper is encoder-decoder and why translation systems often still are." }] },

    { t: "exercise", title: "Probe the families yourself",
      tasks: [
        "Extract attention weights from an encoder and a decoder on the same sentence and confirm the future-attention maximum is 0 for one and not the other.",
        "Ask BERT to fill one mask, then two, then five, and record where the output stops being coherent.",
        "Take a single GPT-2 forward pass and print the next-token distribution at every position, verifying they all come from one pass.",
        "Run three unrelated tasks through T5 by changing only the prefix, and confirm nothing else changes.",
        "Compare an encoder-only embedding model against a decoder-only model of similar size on a retrieval task, and compare both cost and accuracy."
      ] }
  ],

  takeaways: [
    "BERT's largest attention weight for one token went to a position to its right (0.201); GPT-2 puts exactly 0.0000 on every future position.",
    "Bidirectional attention is what lets BERT predict a word from its right context, which a causal model structurally cannot do.",
    "MLM masks 15% of tokens with an 80/10/10 split to avoid making the model depend on seeing a literal [MASK], which never appears downstream.",
    "BERT gave 'paris' at 0.417 for one mask and 'in le ##y' for three — output length must be fixed in advance and each mask is predicted independently.",
    "Autoregression gets joint coherence from the chain rule; masked prediction has no such factorisation.",
    "One GPT-2 forward pass produces a next-token distribution at every position simultaneously — the parallel training the causal mask makes valid.",
    "Top-p adapts its candidate set to the distribution's shape, which is why it beats fixed top-k as a default.",
    "A 60M T5 translated, summarised and judged grammaticality with no task-specific heads — the task prefix is just text, which is the ancestor of prompting.",
    "Span corruption sits between the other two objectives and allows variable-length spans, unlike BERT's one token per mask.",
    "Decoder-only won on simplicity, scaling and emergent in-context learning — not by being better at embeddings or at source-to-target transformation."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why can't an encoder-only model like BERT generate text?",
      options: ["It is too small", "Output length must be fixed in advance as [MASK] tokens, and each mask is predicted independently with no joint factorisation", "It lacks a decoder head", "Its vocabulary is too small"],
      answer: 1,
      why: "Given one mask it answers 'paris' at 0.417; given three it produced 'in le ##y'. It cannot decide to stop, and nothing makes mask 2 conditional on mask 1. An autoregressive model gets both properties free from the chain rule — it emits an end token when finished and conditions each token on all previous ones." },
    { stem: "Why does MLM use an 80/10/10 split rather than always inserting [MASK]?",
      options: ["To add noise for regularisation", "Because [MASK] never appears at fine-tuning or inference, so always using it would create a train-serve mismatch at every position the model cares about", "To speed up training", "To handle variable sequence lengths"],
      answer: 1,
      why: "If every masked position carried a literal [MASK], the model would learn representations conditioned on a token that downstream inputs never contain. Replacing 10% with random tokens and leaving 10% unchanged forces it to build useful representations of real tokens too. It is the train-serve skew problem, designed out of the objective." },
    { stem: "What did T5's text-to-text framing change?",
      options: ["It made models faster", "Every task became a string in and a string out, removing task-specific heads and making the task itself part of the input", "It introduced bidirectional attention", "It removed the need for fine-tuning"],
      answer: 1,
      why: "A 60M T5 translated into German, summarised, and judged grammaticality with only the prefix changing. Once the task lives in the input string, describing a new task is an inference-time act rather than a training-time one — which is the direct ancestor of prompting." },
    { stem: "Why did the field converge on decoder-only architectures?",
      options: ["They are better at every task", "One stack and one objective scale cleanly, and in-context learning emerged, removing task-specific heads entirely", "They use less memory", "Bidirectional attention was found to be harmful"],
      answer: 1,
      why: "Simplicity and scaling, plus the emergence of few-shot learning from the prompt. It was not a clean win everywhere: encoder-only models are still better and cheaper for embeddings and reranking, and encoder-decoder still suits tasks with a distinct source needing a full bidirectional read, like Whisper's speech-to-text." }
  ] },

  interview: { title: "Interview", sub: "Architecture families", questions: [
    { level: "Core", q: "What is the difference between BERT, GPT and T5?",
      strong: "Attention pattern, then objective, then use case — in that order.",
      answer: [{ t: "p", text: "I'd answer in the order attention pattern, training objective, use case, because the first determines the other two. BERT is encoder-only with bidirectional attention: every token sees the whole sequence, and it's trained with masked language modelling. That makes it excellent for understanding tasks — classification, NER, extractive QA, sentence embeddings — and structurally unable to generate. GPT is decoder-only with causal attention: each token sees only the past, trained on next-token prediction, so it generates, and at scale in-context learning emerges. T5 is encoder-decoder: bidirectional encoder, causal decoder with cross-attention to it, trained with span corruption, and it frames every task as text-to-text. I measured the attention difference directly — on the same sentence, BERT's largest weight for one token went to a position to its right, while GPT-2 placed exactly 0.0000 on every future position. And the consequence is concrete: asked to fill one blank BERT gives 'paris' at 0.417, asked to fill three it gives 'in le ##y', because output length must be fixed in advance and each mask is predicted independently." }] },
    { level: "Core", q: "Why did the industry converge on decoder-only models?",
      strong: "One stack, one objective, and in-context learning emerged for free.",
      answer: [{ t: "p", text: "Three reasons that reinforce each other. Architecturally it's simpler — one stack, one attention pattern, no cross-attention, and the prompt and the output are just positions in the same sequence, so there's no boundary to engineer around. The training objective is next-token prediction on raw text, which needs no labels and therefore scales with however much text you have. And in-context learning emerged: past a certain scale the model performs tasks described in the prompt with no fine-tuning and no task-specific head, which eliminated an entire category of engineering. Before that, deploying five tasks meant five fine-tuned models with five heads; after it, one model and five prompts. I'd be careful not to overstate it though. Encoder-only models are still better and much cheaper for embeddings and reranking — a 110M BERT-style encoder beats a decoder-only model of similar size at producing one good bidirectional representation, because that's what it was built to do. And encoder-decoder still wins where you have a distinct source that benefits from a full bidirectional read before any output starts, which is why Whisper is encoder-decoder. The convergence was on the general-purpose model, not on every task." }] },
    { level: "Senior", q: "You need embeddings for a retrieval system. Which family and why?",
      strong: "Encoder-only, bidirectional, trained with a contrastive objective — not a general LLM.",
      answer: [{ t: "p", text: "Encoder-only, and specifically a model trained for embeddings with a contrastive objective — something like BGE or E5 — rather than a general LLM. Three reasons. Bidirectionality: for a single fixed-size representation of a passage you want every token informed by the whole passage, not just its prefix. A decoder-only model's last-token representation has seen everything, but the earlier tokens haven't, so mean pooling over them mixes representations of very different context. Cost: retrieval means embedding the entire corpus and re-embedding on every update, plus one embedding per query at serving. A 110M encoder is an order of magnitude cheaper than a small LLM, per document, forever. Training objective: masked language modelling alone doesn't give you a good sentence embedding — lesson 3.6's measurement of BERT's final-layer anisotropy is part of why — so you want a model contrastively fine-tuned to put paraphrases close and unrelated text far apart, which is exactly what the sentence-transformers line does. There is a real counter-case worth acknowledging: LLM-based embeddings have become competitive at the top of the leaderboards, and if retrieval quality dominates cost they're worth evaluating. But I'd start with a purpose-built encoder, measure recall@k on my own data, and only move up if the numbers justify the cost." }] }
  ] }
});
