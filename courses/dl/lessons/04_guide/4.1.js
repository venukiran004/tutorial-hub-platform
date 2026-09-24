/* ============================================================================
   LESSON 4.1 — Why Transformers Replaced Recurrence
   Mirrors rnn-lstm-gru-transformer-guide.md · §1, §5.1, §5.2.
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "**Module 3 built the recurrent architectures and measured exactly where each one fails.** This module builds what replaced them. The transformer's claim is not that attention is a better mechanism than recurrence — module 3 already had attention, bolted onto a seq2seq model. It is that once you have attention, the recurrence is doing nothing you need, and removing it buys parallelism across the whole sequence.",

  objectives: [
    "State the two problems recurrence creates and which one attention alone solves",
    "Explain why sequential computation prevents parallel training",
    "Identify the encoder-decoder shape of the original transformer",
    "Name the three families that descend from it"
  ],

  prerequisites: ["3.13"],

  blocks: [

    { t: "h2", n: "01", text: "What recurrence costs", id: "problems" },

    { t: "dl", items: [
      ["Sequential computation", "`h_t` requires `h_{t−1}`, so a sequence of length T takes T steps that cannot overlap. Length, not size, bounds training throughput."],
      ["Path length", "Information from step 1 reaches step T through T transformations. Module 3 measured the gradient at 1.8e-17 over 60 steps for an RNN and 1.7e-12 for an LSTM."],
      ["Fixed-size state", "Everything known so far must fit in one vector — 667:1 compression at a thousand steps, measured in lesson 3.1."]
    ] },

    { t: "callout", kind: "insight", title: "Attention fixed two of three; removing recurrence fixed the last",
      body: [{ t: "p", text: "Bahdanau's attention already solved the fixed-size state and the path length — the decoder reads every encoder position directly, so nothing is compressed and every pair is one hop apart. What it did not solve was sequential computation, because the encoder was still an RNN running step by step. The transformer's contribution was noticing that attention had taken over all the real work, so the recurrence could go. That is why the paper is called *Attention Is All You Need* rather than something about a new mechanism: the mechanism already existed and was three years old." }] },

    { t: "h2", n: "02", text: "Parallelism", id: "parallelism" },

    { t: "diagram", kind: "compare", title: "T steps against one",
      caption: "Both do comparable arithmetic. Only one can do it at the same time.",
      columns: [
        { title: "Recurrent", tone: "warn", items: [
          "h₂ cannot start until h₁ finishes",
          "Training time scales with sequence length",
          "A GPU sits mostly idle on short batches",
          "But: O(1) state, so streaming is natural"
        ] },
        { title: "Self-attention", tone: "good", items: [
          "Every position computed simultaneously",
          "One large matrix multiply per layer",
          "Saturates a GPU",
          "But: O(n²) memory — 34 GB at 32k tokens"
        ] }
      ] },

    { t: "p", text: "This is why transformers scaled and RNNs did not. The recipe that produced modern language models — vastly more data, vastly more parameters — requires training runs that finish, and a model whose throughput is capped by sequence length cannot absorb that much data in reasonable time. The architectural advantage is real but secondary; **the decisive advantage is that you can train it**." },

    { t: "h2", n: "03", text: "The shape of the thing", id: "architecture" },

    { t: "diagram", kind: "flow", title: "The original encoder-decoder transformer",
      caption: "Six encoder blocks and six decoder blocks in the original. The decoder attends both to itself (causally) and to the encoder's output.",
      cols: 3,
      nodes: [
        { id: "i", label: "Input embedding + PE", sub: "source tokens", tone: "accent" },
        { id: "e", label: "Encoder ×6", sub: "self-attention + FFN", tone: "teal" },
        { id: "m", label: "Encoder output", sub: "one vector per source token", tone: "violet" },
        { id: "o", label: "Output embedding + PE", sub: "shifted target", tone: "accent" },
        { id: "d", label: "Decoder ×6", sub: "causal self-attn + cross-attn + FFN", tone: "good" },
        { id: "l", label: "Linear + softmax", sub: "next-token distribution", tone: "warn" }
      ],
      edges: [["i", "e"], ["e", "m"], ["o", "d"], ["m", "d", "cross-attention"], ["d", "l"]] },

    { t: "table", head: ["Family", "Uses", "Examples", "Good at"],
      rows: [
        ["Encoder-only", "Bidirectional self-attention", "BERT, RoBERTa", "Classification, NER, retrieval — the whole input is available"],
        ["Decoder-only", "Causal self-attention", "GPT, LLaMA, Claude", "Generation — and, at scale, nearly everything else"],
        ["Encoder-decoder", "Both, joined by cross-attention", "T5, BART, the original", "Translation and summarisation, where input and output are distinct"]
      ] },

    { t: "callout", kind: "note", title: "Decoder-only won, for a reason worth understanding",
      body: [{ t: "p", text: "The original design assumed you need an encoder to read and a decoder to write. What emerged from scaling is that a decoder-only model given a long enough context can treat 'read this, then write that' as a single next-token prediction problem — the source text is simply earlier in the sequence. Since causal attention lets every training position contribute a prediction, decoder-only models also extract more learning signal per token than an encoder whose objective masks 15 % of the input. Encoder-only models remain the efficient choice when you want a fixed-size representation rather than text, which is why retrieval and classification systems still use them." }] },

    { t: "h2", n: "04", text: "What the rest of the module covers", id: "roadmap" },

    { t: "diagram", kind: "steps", title: "Building it up",
      caption: "Each piece is verified against PyTorch before the next is added.",
      items: [
        { label: "4.2 Self-attention", sub: "Q, K, V and the scaled dot product", tone: "accent" },
        { label: "4.3 Multi-head + position", sub: "several relationships, and order", tone: "accent" },
        { label: "4.4 The encoder block", sub: "attention, FFN, residual, LayerNorm", tone: "teal" },
        { label: "4.5 Decoder and causal masking", sub: "generation without looking ahead", tone: "teal" },
        { label: "4.6–4.7 In PyTorch, and compared", sub: "assembled and costed", tone: "violet" },
        { label: "4.8–4.10 Four projects", sub: "ANN, all-four comparison, forecasting, translation", tone: "good" }
      ] },

    { t: "exercise", kind: "practice", title: "Measure the parallelism gap", difficulty: "intermediate", minutes: 25,
      prompt: "Time an LSTM and a transformer encoder layer of comparable parameter count on the same batch at sequence lengths 32, 128, 512 and 2048, recording forward-plus-backward time and peak memory. Plot both against length. Identify where each architecture's curve bends and explain which resource binds in each case. Then repeat with batch size 1 and batch size 64, and note how the two architectures respond differently to batching.",
      hints: [
        "Warm up before timing, and take a median rather than a mean.",
        "The LSTM's time should be roughly linear in T; the transformer's memory roughly quadratic.",
        "Batching helps one of them far more than the other — think about what limits each."
      ],
      solution: {
        notes: [
          { t: "p", text: "The LSTM's time grows linearly with sequence length and barely improves with batching at small batch sizes, because its bottleneck is the sequential dependency rather than arithmetic — a GPU cannot fill its cores when each step waits for the previous. The transformer's time grows more slowly at first but its memory grows quadratically, so it hits a wall rather than a slope. Those are different kinds of limit: one is a latency floor you cannot remove by adding hardware, the other a capacity ceiling you can push back with FlashAttention or more memory." },
          { t: "p", text: "The batching result is the one that explains history. Batching gives the transformer a lot because it is already compute-bound and more work per kernel launch is pure gain. It gives the LSTM much less, because the sequential chain is unchanged — you are running more chains in parallel but each is still T steps deep. That difference in how the two architectures absorb hardware is why one scaled to models with hundreds of billions of parameters and the other did not." }
        ]
      } }

  ],

  takeaways: [
    "Recurrence costs three things: sequential computation, long gradient paths, and a fixed-size state.",
    "Attention already fixed path length and state size; removing recurrence fixed parallelism.",
    "Training throughput, not accuracy, is the decisive advantage — a model capped by sequence length cannot absorb enough data.",
    "The original design is 6 encoder and 6 decoder blocks joined by cross-attention.",
    "Encoder-only (BERT) for representations, decoder-only (GPT) for generation, encoder-decoder (T5) for translation.",
    "Decoder-only won at scale partly because causal attention extracts a prediction from every position."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Which problem does attention alone NOT solve, requiring recurrence to be removed?",
      options: ["Long-range dependencies", "Sequential computation preventing parallel training", "The fixed-size context vector", "Vanishing gradients"],
      answer: 1,
      why: "Bahdanau attention already gave a direct path to every encoder state, fixing both the bottleneck and path length — but the encoder was still an RNN running step by step. Only removing the recurrence makes all positions computable simultaneously, which is what the transformer contributed." },
    { stem: "Why did transformers scale when RNNs did not?",
      options: ["They have more parameters", "Parallel training means throughput is not capped by sequence length", "They need less data", "They are more accurate per parameter"],
      answer: 1,
      why: "The modern recipe needs training runs over enormous datasets to finish in reasonable time. An RNN's throughput is bounded by its sequential chain regardless of hardware, so it cannot absorb that much data. The architectural advantages are real but secondary to simply being trainable at scale." },
    { stem: "Which transformer family suits document classification best?",
      options: ["Decoder-only", "Encoder-only, such as BERT", "Encoder-decoder", "None — use an LSTM"],
      answer: 1,
      why: "Classification needs a fixed-size representation of a fully available input, which is exactly what bidirectional self-attention over the whole document produces. Decoder-only models can do it at scale but are architecturally aimed at generation, and encoder-decoder adds a decoder you do not need." },
    { stem: "What is the transformer's main cost compared to an RNN?",
      options: ["More parameters", "O(n²) attention memory — 34 GB for one 32k-token sequence", "Slower inference always", "It cannot handle long sequences at all"],
      answer: 1,
      why: "The attention matrix is T×T per head, so doubling context quadruples memory. An RNN's state is O(1) regardless of length, which is why recurrence remains preferable for streaming and for sequences long enough that quadratic memory becomes prohibitive." }
  ] },

  interview: { title: "Interview", sub: "Architecture motivation", questions: [
    { level: "Core", q: "Why were transformers developed when LSTMs already worked?",
      strong: "Parallelism — LSTM training is capped by sequence length regardless of hardware.",
      answer: [{ t: "p", text: "Attention had already solved the two modelling problems: the fixed-size context vector and the long gradient path between distant positions. What remained was that the encoder was still recurrent, so computing step t required step t−1 and training time scaled with sequence length no matter how much hardware you had. The transformer's observation was that once attention is doing the work of relating positions, the recurrence is not contributing anything you cannot get another way, and removing it makes every position computable at once. That turned out to matter more than any accuracy argument, because the recipe that produced modern language models depends on training runs over enormous corpora finishing in reasonable time — and an architecture whose throughput is bounded by sequence length simply cannot absorb that much data." }] },
    { level: "Senior", q: "What did the transformer actually invent, and what did it inherit?",
      strong: "It inherited attention from 2014 seq2seq work; the contribution was removing the recurrence.",
      answer: [{ t: "p", text: "Attention was not new. Bahdanau introduced it in 2014 and Luong refined the scoring in 2015, both bolted onto recurrent encoder-decoders, and it had already solved the fixed-size context bottleneck and given a direct path between any decoder step and any source position. What the transformer contributed was noticing that attention had taken over all the work that mattered, so the recurrence could be deleted entirely — plus the engineering that made a pure-attention stack trainable: scaling scores by the square root of the key dimension so the softmax does not saturate, multi-head attention so several relationships coexist at no extra parameter cost, positional encoding to restore the order self-attention structurally cannot see, and the residual-and-LayerNorm structure that lets blocks stack deeply. The title is precise rather than grandiose — it is a claim about what can be removed, not about a new mechanism. I find that framing useful because it makes the contribution legible as a series of specific engineering decisions rather than one insight." }] },
    { level: "Senior", q: "Why did decoder-only architectures come to dominate?",
      strong: "A long context makes 'read then write' one next-token problem, and every position yields training signal.",
      answer: [{ t: "p", text: "Two reasons. Architecturally, once the context window is long enough, the distinction between reading an input and writing an output disappears — the source is just earlier tokens in the same sequence, so a single causal model handles what previously needed an encoder and a decoder joined by cross-attention. And in terms of training efficiency, causal language modelling produces a prediction at every position, so every token in the corpus contributes learning signal; BERT's masked objective only trains on the roughly 15 % of positions it masks, which is a large factor in effective data efficiency. That said, I would not say encoder-only is obsolete — when you want a fixed-size vector rather than text, for retrieval or classification, a bidirectional encoder is much cheaper and gives representations that see the whole input at once. It is a case of the general-purpose option winning at scale rather than the specialised option being wrong." }] }
  ] }
});
