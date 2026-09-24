/* ============================================================================
   LESSON 4.5 — The Decoder and Causal Masking
   Mirrors rnn-lstm-gru-transformer-guide.md · §5.7, §5.8. Causal mask
   verified exactly zero above the diagonal (scratchpad/dl/d41.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "**The decoder is the encoder block plus one constraint and one extra sub-layer.** The constraint is that a position may not attend to anything after it — otherwise training a generator on full sequences lets every position read the token it is being asked to predict, which is the leakage lesson 3.6 measured for bidirectional RNNs. The extra sub-layer is cross-attention, where the decoder queries the encoder's output. Both are one line of code and both are easy to get subtly wrong.",

  objectives: [
    "Build a causal mask and verify no position attends forward",
    "Explain why generation requires causality and what happens without it",
    "Describe cross-attention and where its Q, K and V come from",
    "Trace the three sub-layers of a decoder block",
    "Explain the KV cache and why generation is memory-bound"
  ],

  prerequisites: ["4.4"],

  blocks: [

    { t: "h2", n: "01", text: "The causal mask", id: "mask" },

    { t: "code", lang: "python", title: "Upper triangle to −inf",
      code: `mask = torch.triu(torch.ones(L, L), diagonal=1).bool()
scores = scores.masked_fill(mask, float('-inf'))
weights = scores.softmax(-1)          # positions after i get exactly 0`,
      caption: "`diagonal=1` keeps the diagonal unmasked, so a position can attend to itself. Using `diagonal=0` masks the diagonal too and breaks the model in a way that still trains." },

    { t: "out", text: `  causal attention weights (row = query position):
    pos 0: ['1.00', '0.00', '0.00', '0.00', '0.00']
    pos 1: ['0.82', '0.18', '0.00', '0.00', '0.00']
    pos 2: ['0.16', '0.59', '0.25', '0.00', '0.00']
    pos 3: ['0.05', '0.46', '0.35', '0.14', '0.00']
    pos 4: ['0.30', '0.11', '0.42', '0.07', '0.11']
  upper triangle is exactly zero: True` },

    { t: "p", text: "Position 0 can only attend to itself, so its weight is exactly 1.00. Each subsequent row spreads over one more position. The upper triangle is **exactly zero**, not merely small, because `exp(−inf) = 0` — the same reason lesson 3.11 insisted on masking before the softmax rather than after." },

    { t: "callout", kind: "crit", title: "Without the mask, training is leakage and generation is noise",
      body: [{ t: "p", text: "During training the whole target sequence is fed in at once so all positions compute in parallel. Without a causal mask, the representation at position 5 attends to position 6 — the token it is being asked to predict. The model learns to copy from the future, training loss drops to near zero, and at generation time the future does not exist, so it produces nonsense. This is precisely the failure lesson 3.6 measured for a bidirectional RNN used as a language model: the offline metric looks extraordinary and the model is useless. It is the single most consequential one-line bug in transformer implementations." }] },

    { t: "diagram", kind: "matrix", title: "What each position may see",
      caption: "A lower-triangular pattern. During generation this is automatic, since later tokens do not exist yet — the mask exists so parallel training matches sequential inference.",
      cols: ["t0", "t1", "t2", "t3"],
      rows: ["query t0", "query t1", "query t2", "query t3"],
      cells: [
        ["yes", "—", "—", "—"],
        ["yes", "yes", "—", "—"],
        ["yes", "yes", "yes", "—"],
        ["yes", "yes", "yes", "yes"]
      ] },

    { t: "h2", n: "02", text: "The decoder block", id: "block" },

    { t: "diagram", kind: "flow", title: "Three sub-layers",
      caption: "Masked self-attention over what has been generated, then cross-attention into the encoder, then the feed-forward network. Each with a residual and a LayerNorm.",
      cols: 3,
      nodes: [
        { id: "y", label: "target (shifted right)", sub: "T_tgt × d_model", tone: "accent" },
        { id: "s", label: "Masked self-attention", sub: "Q,K,V from the decoder", tone: "crit" },
        { id: "c", label: "Cross-attention", sub: "Q from decoder, K/V from encoder", tone: "violet" },
        { id: "f", label: "Feed-forward", sub: "position-wise", tone: "good" },
        { id: "o", label: "Linear + softmax", sub: "next-token distribution", tone: "teal" },
        { id: "e", label: "encoder output", sub: "T_src × d_model", tone: "warn" }
      ],
      edges: [["y", "s"], ["s", "c"], ["e", "c", "K, V"], ["c", "f"], ["f", "o"]] },

    { t: "dl", items: [
      ["Masked self-attention", "Q, K and V all from the decoder. Lets each generated position attend to earlier generated positions only."],
      ["Cross-attention", "**Q from the decoder, K and V from the encoder.** This is the only place source information enters, and it is unmasked — every target position may attend to every source position, since the whole source is available."],
      ["Feed-forward", "Identical to the encoder's: position-wise, expanding 4× and back."]
    ] },

    { t: "callout", kind: "mental", title: "Cross-attention is Bahdanau attention, generalised",
      body: [{ t: "p", text: "It is the same operation as lesson 3.8's encoder-decoder attention: the decoder asks *what in the source is relevant to what I am generating now?*, and receives a weighted blend of encoder states. What changed is that it is multi-head, scaled, and appears at every decoder layer rather than once. If you understood seq2seq with attention, you already understand cross-attention — the only thing to keep straight is which side supplies Q and which supplies K and V, and the rule is that queries come from whoever is asking." }] },

    { t: "p", text: "The target is **shifted right** and prefixed with a start token, so position i predicts token i while having seen tokens 0 through i−1. Combined with the causal mask this makes every position a valid training example, which is why a decoder extracts far more signal per sequence than a masked-language-model encoder." },

    { t: "h2", n: "03", text: "Generation and the KV cache", id: "kv-cache" },

    { t: "p", text: "Training runs all positions at once. Generation cannot: token `t+1` depends on token `t`, so it is inherently sequential. Recomputing all previous keys and values at every step would be quadratic work per token, so they are cached." },

    { t: "out", text: `  T=  100: KV cache ~      3.7 MB   (12 layers, d=768, fp16)
  T= 1000: KV cache ~     36.9 MB
  T=10000: KV cache ~    368.6 MB` },

    { t: "callout", kind: "tradeoff", title: "Generation is memory-bandwidth-bound, not compute-bound",
      body: [{ t: "p", text: "Generating one token requires reading the entire KV cache and every model weight from memory, and doing comparatively little arithmetic with them. That is why single-sequence generation leaves a GPU's compute largely idle, why batching many sequences together improves throughput so much (the weights are read once for the whole batch), and why the cache — 369 MB per sequence at 10,000 tokens for a modest 12-layer model — is what limits how many concurrent conversations a server can hold. Grouped-query and multi-query attention exist specifically to shrink it, by sharing K and V across heads." }] },

    { t: "code", lang: "python", title: "Both masks in PyTorch",
      code: `causal = nn.Transformer.generate_square_subsequent_mask(tgt_len)

out = decoder(tgt, memory,
              tgt_mask=causal,                      # no looking ahead
              tgt_key_padding_mask=tgt_pad_mask,    # ignore target padding
              memory_key_padding_mask=src_pad_mask) # ignore source padding`,
      caption: "Two distinct kinds of mask. The causal mask is about time; the padding masks are lesson 3.11's problem. Both are needed and neither substitutes for the other." },

    { t: "exercise", kind: "practice", title: "Build the decoder and prove causality", difficulty: "advanced", minutes: 45,
      prompt: "Build a decoder block with masked self-attention and cross-attention. Verify causality empirically: change a token at position t and confirm the output at every position before t is bit-identical. Then deliberately remove the causal mask, train a small language model, and compare its training loss and its generated output against the masked version. Finally, implement greedy generation with and without a KV cache and measure the time per token as the sequence grows.",
      hints: [
        "For the causality test, compare outputs element-wise — earlier positions should be exactly unchanged.",
        "The unmasked model's training loss will be implausibly low. Generate from it to see why.",
        "Without a cache, per-token time grows with sequence length; with one it stays roughly flat."
      ],
      solution: {
        notes: [
          { t: "p", text: "The causality test should give exactly zero difference at positions before t — the same hard-zero result as lesson 3.6's unidirectional RNN. A hard zero makes it a proof rather than an observation, and it is the test to write first when implementing any causal architecture, because every other symptom of a broken mask is indirect." },
          { t: "p", text: "The unmasked language model is worth building once. Its training loss drops close to zero almost immediately because each position can read the answer from the next position, and its generated text is incoherent because at inference that next position does not exist. The gap between a spectacular training curve and useless generation is the signature, and recognising it saves a lot of time — it is the same class of error as fitting a scaler before splitting your data." },
          { t: "p", text: "The KV cache measurement shows per-token generation time roughly constant with cache and growing with sequence length without it. The cache is not an optimisation you add later; it is what makes autoregressive generation tractable at all. Its cost is memory — 369 MB per sequence at 10,000 tokens for a 12-layer model — which is what bounds concurrent users on a serving box and why multi-query attention was invented." }
        ]
      } }

  ],

  takeaways: [
    "The causal mask sets the upper triangle to −inf, so post-softmax weights there are exactly zero.",
    "Use `diagonal=1` so a position can still attend to itself.",
    "Without the mask, each position reads the token it is predicting: near-zero training loss, incoherent generation.",
    "A decoder block has three sub-layers: masked self-attention, cross-attention, feed-forward.",
    "Cross-attention takes Q from the decoder and K, V from the encoder, and is unmasked.",
    "The target is shifted right so every position is a training example.",
    "Generation caches K and V — 369 MB per sequence at 10,000 tokens — making it memory-bandwidth-bound."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What happens if you train a decoder without a causal mask?",
      options: ["It trains more slowly", "Each position attends to the token it is predicting: near-zero training loss and incoherent generation", "It raises a shape error", "Nothing — the mask is an optimisation"],
      answer: 1,
      why: "Training feeds the whole target sequence at once, so position 5 can attend to position 6 and copy the answer. The loss collapses, and at generation time the future does not exist. It is the same leakage lesson 3.6 measured for a bidirectional RNN used as a language model — a spectacular metric and a useless model." },
    { stem: "In cross-attention, where do the query, key and value come from?",
      options: ["All from the encoder", "Q from the decoder, K and V from the encoder", "All from the decoder", "Q from the encoder, K and V from the decoder"],
      answer: 1,
      why: "The decoder is asking, so it supplies the queries; the encoder holds the source information being retrieved, so it supplies keys and values. It is Bahdanau attention generalised to multi-head and applied at every decoder layer. Cross-attention is not causally masked — the whole source is available." },
    { stem: "Why should `torch.triu(..., diagonal=1)` be used rather than `diagonal=0`?",
      options: ["It is faster", "`diagonal=0` masks the diagonal too, preventing a position from attending to itself", "It uses less memory", "There is no difference"],
      answer: 1,
      why: "`diagonal=1` starts masking one above the main diagonal, leaving self-attention intact. With `diagonal=0` position 0 has nothing at all to attend to, producing a softmax over all `-inf` — and elsewhere the model loses access to its own representation while still training, so the bug is quiet." },
    { stem: "Why is autoregressive generation memory-bandwidth-bound?",
      options: ["The model has too many parameters", "Each token requires reading the whole KV cache and all weights while doing little arithmetic", "The softmax is slow", "Attention is quadratic"],
      answer: 1,
      why: "Generating one token moves a lot of data and computes relatively little with it, so a GPU's compute sits idle. That is why batching helps throughput so much — weights are read once for the whole batch — and why the KV cache, at 369 MB per sequence at 10,000 tokens, bounds how many concurrent sequences a server can hold." }
  ] },

  interview: { title: "Interview", sub: "Decoder and generation", questions: [
    { level: "Core", q: "What is causal masking and why is it necessary?",
      strong: "It stops a position attending to later ones, so parallel training matches sequential generation.",
      answer: [{ t: "p", text: "During training the whole target sequence is fed in at once so every position computes in parallel, which is where the transformer's speed comes from. But a language model at position 5 is being asked to predict token 5, and without a mask its representation can attend to position 6 and simply read the answer. You set the scores above the diagonal to negative infinity before the softmax, which makes those weights exactly zero — I have verified the upper triangle is hard zero, not merely small. Without it the training loss collapses towards zero because the task has become copying, and generation produces nonsense because at inference the future genuinely does not exist. It is exactly the leakage failure you get from using a bidirectional encoder as a language model, and it is a one-line bug that produces a spectacular-looking training curve." }] },
    { level: "Senior", q: "Explain the KV cache and its implications for serving.",
      strong: "Cached keys and values avoid recomputation; their size bounds concurrency and makes generation memory-bound.",
      answer: [{ t: "p", text: "Generation is sequential, and at each step the new token has to attend to all previous ones. Recomputing every previous key and value each step would be quadratic work per token, so you cache them — each new step computes only its own K and V and appends. That makes per-token time roughly constant instead of growing. The cost is memory proportional to sequence length, layers and model width: about 369 MB per sequence at 10,000 tokens for a 12-layer model at d=768, and much more for a large one. For serving that is the binding constraint on concurrency — you are not limited by compute but by how many caches fit in GPU memory. It also means generation is memory-bandwidth-bound rather than compute-bound, since each token reads all the weights and the cache while doing little arithmetic. Both facts drive real design decisions: batching many sequences amortises the weight reads, and grouped-query or multi-query attention shrinks the cache by sharing K and V across heads, which is why essentially every recent model uses one of them." }] },
    { level: "Senior", q: "A decoder-only model gets near-zero training loss but generates gibberish. What would you check?",
      strong: "The causal mask, and whether the target is shifted correctly.",
      answer: [{ t: "p", text: "Near-zero training loss on language modelling is implausible, so I would assume leakage rather than success. The first check is the causal mask: without it each position attends to the token it is predicting and the task becomes copying. I would test it directly rather than by inspection — change a token at position t and confirm the outputs at every earlier position are bit-identical, which should be exactly zero difference. The second check is the target shift: if the input is not shifted right relative to the target, position i is being asked to predict the token it was just given, which leaks the same way even with a correct mask. The third possibility is `diagonal=0` instead of `diagonal=1` in the mask construction, which is the opposite error — it removes self-attention rather than allowing lookahead — and that degrades the model rather than inflating it, so it would not explain near-zero loss but is worth ruling out while you are in there. All of these are quiet: nothing raises, and the training curve looks wonderful." }] }
  ] }
});
