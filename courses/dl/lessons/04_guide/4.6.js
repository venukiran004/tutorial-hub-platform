/* ============================================================================
   LESSON 4.6 — Building a Transformer in PyTorch
   A complete encoder-decoder is assembled and trained to 99.4% on a real
   seq2seq task, and its cross-attention inspected (scratchpad/dl/d46.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.6",

  lede: "**Everything from 4.2 to 4.5 assembles here into one model that trains to 99.4 % on unseen data.** The task is sequence reversal, chosen because it cannot be solved by copying or by local pattern-matching — target position 0 must attend to the *last* source token. That makes cross-attention inspectable: if the model has learned the task properly, its attention should form an anti-diagonal. It does, exactly.",

  objectives: [
    "Assemble embeddings, positional encoding, and `nn.Transformer` into a working model",
    "Apply causal and padding masks together, correctly",
    "Shift the target and compute the loss over real positions only",
    "Implement greedy generation",
    "Read a cross-attention map and check it against the task"
  ],

  prerequisites: ["4.5"],

  blocks: [

    { t: "h2", n: "01", text: "The model", id: "model" },

    {"kind": "layers", "title": "The translation model, as it is assembled", "caption": "Read it bottom-up. The encoder stack sees the whole source at once; the decoder stack is causal over the target and additionally **cross-attends** to the encoder's output, which is the one connection between the two halves and the thing to inspect when a translation is fluent but wrong (§04).", "items": [{"label": "Output projection to the vocabulary", "sub": "often tied to the embedding", "tone": "teal", "side": "logits"}, {"label": "Decoder stack, N blocks", "sub": "causal self-attn, cross-attn, FFN", "tone": "accent", "side": "target"}, {"label": "Cross-attention", "sub": "queries from the target, keys from the source", "tone": "violet", "side": "the bridge"}, {"label": "Encoder stack, N blocks", "sub": "bidirectional self-attn, FFN", "tone": "good", "side": "source"}, {"label": "Embedding + positional encoding", "sub": "both sides", "tone": "good", "side": ""}], "t": "diagram", "id": "dg-4_6-01-0"},





    { t: "code", lang: "python", title: "The whole thing",
      code: `class Model(nn.Module):
    def __init__(self, d=128, h=4, ff=512, L=2):
        super().__init__()
        self.d = d
        self.emb = nn.Embedding(V, d, padding_idx=PAD)
        self.pe  = PositionalEncoding(d)
        self.tr  = nn.Transformer(d_model=d, nhead=h,
                                  num_encoder_layers=L, num_decoder_layers=L,
                                  dim_feedforward=ff, dropout=0.1,
                                  batch_first=True, norm_first=True)
        self.out = nn.Linear(d, V)

    def embed(self, x):
        return self.pe(self.emb(x) * math.sqrt(self.d))     # scale, then add PE

    def forward(self, src, tgt_in):
        causal = nn.Transformer.generate_square_subsequent_mask(tgt_in.size(1))
        h = self.tr(self.embed(src), self.embed(tgt_in),
                    tgt_mask=causal,
                    src_key_padding_mask=(src == PAD),
                    tgt_key_padding_mask=(tgt_in == PAD),
                    memory_key_padding_mask=(src == PAD))
        return self.out(h)`,
      caption: "Four masks, three of them about padding and one about time. `memory_key_padding_mask` is the one people forget — without it, cross-attention attends to the source's padding." },

    { t: "out", text: `  model parameters: 931,348
    embedding    2,560  transformer  926,208  output    2,580` },

    { t: "p", text: "**99.4 % of the parameters are in the transformer stack**, with the embedding and output projection almost free — a consequence of the tiny 20-token vocabulary here. In a real language model with a 50,000-token vocabulary the embedding would dominate instead, which is why input and output embeddings are often tied." },

    { t: "h2", n: "02", text: "Training", id: "training" },

    {"kind": "flow", "title": "Training it: one forward pass for the whole target", "caption": "This is the transformer's decisive advantage over an RNN decoder. Because the causal mask prevents any position seeing the future, the **entire** target sequence can be processed in one parallel pass — every position predicting its own next token simultaneously. The same model at inference must go one token at a time, which is why training is fast and generation is not.", "cols": 3, "nodes": [{"id": "t", "label": "The whole target, shifted right", "sub": "one tensor", "tone": "violet"}, {"id": "m", "label": "Causal mask", "sub": "no position sees the future", "tone": "accent"}, {"id": "p", "label": "One parallel forward pass", "sub": "every position at once", "tone": "good"}, {"id": "l", "label": "Loss at every position", "sub": "T predictions from one pass", "tone": "good"}, {"id": "i", "label": "Inference is sequential", "sub": "one token at a time", "tone": "warn"}, {"id": "a", "label": "Fast to train, slow to generate", "sub": "the asymmetry that defines it", "tone": "teal"}], "edges": [["t", "m"], ["m", "p"], ["p", "l"], ["l", "i"], ["i", "a"]], "t": "diagram", "id": "dg-4_6-02-1"},





    { t: "code", lang: "python", title: "Shift the target, mask the loss",
      code: `tgt_in, tgt_out = tgt[:, :-1], tgt[:, 1:]        # shift right
loss = F.cross_entropy(model(src, tgt_in).reshape(-1, V),
                       tgt_out.reshape(-1),
                       ignore_index=PAD)`,
      caption: "`tgt_in` starts with `<sos>` and excludes the final token; `tgt_out` excludes `<sos>`. Position i predicts token i+1 having seen 0..i — combined with the causal mask, every position is a valid training example." },

    { t: "out", text: `    step    0: loss 3.1315
    step  500: loss 1.4535
    step 1000: loss 0.5171
    step 1500: loss 0.2584
    step 2000: loss 0.1417
    step 2500: loss 0.1110
    step 2999: loss 0.0692
  trained in 282s` },

    { t: "p", text: "Loss falls from 3.13 — roughly `ln(20)`, the uniform-distribution value over the vocabulary, so the model starts knowing nothing — to 0.069. Note the shape: slow for the first few hundred steps while the model learns the output format, then rapid once it discovers the reversal structure." },

    { t: "h2", n: "03", text: "Generation", id: "generation" },

    {"kind": "flow", "title": "Generation, and the three things that must match training", "caption": "Generation re-enters the model with its own output, so any mismatch with training shows up as fluent nonsense. The three to check are the **special tokens** (start the decoder with the same BOS it was trained with), the **shift** (the input is the target shifted right by one), and the **stop** condition (generate until EOS or a length cap, or it runs forever).", "cols": 3, "nodes": [{"id": "b", "label": "Start with BOS", "sub": "the same one training used", "tone": "accent"}, {"id": "f", "label": "Forward, take the last position", "sub": "its logits are the next token", "tone": "accent"}, {"id": "s", "label": "Sample or argmax", "sub": "greedy, beam, or top-p", "tone": "good"}, {"id": "a", "label": "Append, repeat", "sub": "with the KV cache", "tone": "good"}, {"id": "e", "label": "Stop at EOS, or a cap", "sub": "or it generates forever", "tone": "warn"}, {"id": "m", "label": "Any mismatch: fluent nonsense", "sub": "not an error", "tone": "crit"}], "edges": [["b", "f"], ["f", "s"], ["s", "a"], ["a", "e"], ["e", "m"]], "t": "diagram", "id": "dg-4_6-03-2"},





    { t: "code", lang: "python", title: "Greedy decoding",
      code: `@torch.no_grad()
def greedy(src, max_len=12):
    model.eval()
    ys = torch.full((src.size(0), 1), SOS, dtype=torch.long)
    for _ in range(max_len):
        logits = model(src, ys)[:, -1]              # last position only
        ys = torch.cat([ys, logits.argmax(-1, keepdim=True)], dim=1)
        if (ys[:, -1] == EOS).all():
            break
    return ys`,
      caption: "This recomputes the whole decoder at every step. Correct but wasteful — a KV cache is what makes real generation tractable, as lesson 4.5 covered." },

    { t: "out", text: `  exact-match accuracy on 500 unseen sequences: 99.4%
    src [18, 14, 16, 18, 11, 3, 7, 15, 19] -> pred [19, 15, 7, 3, 11, 18, 16, 14, 18] correct=True
    src [16, 15, 6, 4, 13, 12]             -> pred [12, 13, 4, 6, 15, 16]             correct=True
    src [14, 13, 7, 10]                    -> pred [10, 7, 13, 14]                    correct=True` },

    { t: "p", text: "**Exact match**, not per-token accuracy — every token in the sequence must be right, which is the strict metric lesson 3.7 argued for. Note the variable lengths are handled correctly, including the repeated `18` in the first example, which requires genuine positional reasoning rather than content lookup." },

    { t: "h2", n: "04", text: "Reading the cross-attention", id: "attention" },

    {"kind": "flow", "title": "Reading the cross-attention as a diagnostic", "caption": "Cross-attention is the only place the target looks at the source, so its weights are a soft alignment and are genuinely informative here — unlike the attention-is-not-attribution caution of ML 9.3, because this attention **is** the information path. A diagonal band means the model is translating in order; a column that attracts every target position usually means a source token the model cannot handle.", "cols": 3, "nodes": [{"id": "c", "label": "Cross-attention weights", "sub": "target positions x source positions", "tone": "violet"}, {"id": "d", "label": "A diagonal band", "sub": "translating roughly in order", "tone": "good"}, {"id": "r", "label": "Off-diagonal blocks", "sub": "reordering: expected between languages", "tone": "good"}, {"id": "o", "label": "One source column attracts everything", "sub": "a token it cannot handle", "tone": "crit"}, {"id": "u", "label": "Uniform weights", "sub": "it is ignoring the source", "tone": "crit"}, {"id": "i", "label": "Here attention IS the path", "sub": "unlike ML 9.3's caution", "tone": "teal"}], "edges": [["c", "d"], ["c", "r"], ["c", "o"], ["c", "u"], ["d", "i"]], "t": "diagram", "id": "dg-4_6-04-3"},





    { t: "out", text: `  cross-attention (7, 7) (target positions x source positions)
  argmax source position for each target position:
    [5, 4, 3, 2, 1, 0, 0]` },

    { t: "callout", kind: "insight", title: "A perfect anti-diagonal",
      body: [{ t: "p", text: "For a six-token source, target position 0 attends most strongly to source position 5, position 1 to position 4, and so on down to position 5 attending to position 0 — exactly the alignment the reversal task requires, `i → 5−i`. The model was never told this; it discovered it from examples, and cross-attention makes the discovery legible. This is why attention was such a significant development for interpretability as well as for accuracy: the alignment between input and output is an explicit, inspectable matrix rather than something buried in a hidden state. The seventh position mapping to 0 again is the model handling the end-of-sequence token, which has no source counterpart." }] },

    { t: "h2", n: "05", text: "What to check when it will not train", id: "debugging" },

    {"kind": "matrix", "title": "What to check when it will not train", "caption": "Every row produces a model that runs and learns nothing, so none of them raises. The order is by how often it is the cause — and the first two account for most of it, because both are silent and both are about the mask.", "cols": ["Symptom", "Check"], "rows": ["Causal mask missing", "Padding not masked", "Loss over pad tokens", "No positional encoding", "Learning rate, no warmup", "Decoder input not shifted"], "cells": [[{"text": "trains fast, generates nonsense", "tone": "crit"}, "it was copying the answer"], [{"text": "attends to padding", "tone": "crit"}, "the mask before the softmax (3.11)"], [{"text": "loss varies with batch padding", "tone": "crit"}, "ignore_index"], [{"text": "word order ignored", "tone": "crit"}, "a bag of tokens"], [{"text": "diverges in the first steps", "tone": "warn"}, "post-norm needs warmup (4.4)"], [{"text": "learns the identity", "tone": "crit"}, "input is target[:-1], label target[1:]"]], "t": "diagram", "id": "dg-4_6-05-4"},





    { t: "table", head: ["Symptom", "Likely cause"],
      rows: [
        ["Loss near zero within a few hundred steps", "Causal mask missing or target not shifted — the model is copying"],
        ["Loss stuck at `ln(vocab_size)`", "Learning rate wrong, or the target and prediction are misaligned"],
        ["Trains but generates repetition", "Missing `memory_key_padding_mask`, so cross-attention reads source padding"],
        ["Diverges in the first few hundred steps", "Post-norm without warmup — pass `norm_first=True`"],
        ["Loss falls, generation is poor", "Evaluating with teacher forcing rather than by generating"],
        ["Works at training length, fails when longer", "Positional encoding table too small, or learned embeddings"]
      ] },

    { t: "callout", kind: "good", title: "Test on a task you can verify by eye",
      body: [{ t: "p", text: "Copy and reversal are ideal first targets because you know the correct output for any input, the model cannot fake success, and the expected attention pattern is predictable — a diagonal for copy, an anti-diagonal for reversal. If your transformer cannot learn to reverse a nine-token sequence, the bug is in the masking or the target shift, not in the task's difficulty. I would get this working before pointing the same code at real data, where a subtle masking bug looks like a hard problem rather than a broken model." }] },

    { t: "exercise", kind: "practice", title: "Build it, break it, inspect it", difficulty: "advanced", minutes: 55,
      prompt: "Build and train the model on sequence reversal to above 95 % exact match. Then break it four ways and record the symptom of each: remove the causal mask; remove the target shift; remove `memory_key_padding_mask`; and set `norm_first=False`. Finally, extract cross-attention from every layer and head, and compare the anti-diagonal sharpness across layers.",
      hints: [
        "Use exact-match accuracy, not per-token — per-token hides most failures.",
        "Hook `decoder.layers[i].multihead_attn` with `need_weights=True` to capture the maps.",
        "Later layers usually show cleaner task structure than earlier ones."
      ],
      solution: {
        notes: [
          { t: "p", text: "The no-causal-mask run is the most instructive: training loss collapses towards zero within a couple of hundred steps because each position can read the token it is predicting, and generation is nonsense. If you only watched the loss curve you would conclude the model was working extremely well. That gap between a spectacular training metric and useless output is the signature to recognise — it is the same class of error as leaking test data into a scaler." },
          { t: "p", text: "The layer comparison usually shows the last decoder layer with the cleanest anti-diagonal and earlier layers more diffuse, which is consistent with the general finding that later layers carry more task-specific structure. Individual heads within a layer also differ — some show the task alignment clearly while others look like noise or attend uniformly, which matches the point in lesson 4.3 that head specialisation is real but looser than the textbook version suggests." },
          { t: "p", text: "Missing `memory_key_padding_mask` is the subtlest of the four because the model still trains and still reaches reasonable accuracy — it just wastes attention on source padding, and lesson 3.11 measured that leak at over 80 % of attention weight for short sequences in a heavily padded batch. The symptom is degraded accuracy that scales with how much padding your batches carry, which looks like ordinary model error unless you think to group results by sequence length." }
        ]
      } }

  ],

  takeaways: [
    "`nn.Transformer` needs four masks: one causal, three for padding — including `memory_key_padding_mask`.",
    "Scale embeddings by `√d_model` before adding positional encoding.",
    "Shift the target so `tgt_in` starts with `<sos>` and `tgt_out` excludes it; mask the loss with `ignore_index`.",
    "Trained to 99.4 % exact match on unseen sequences; loss fell from 3.13 (≈ ln 20) to 0.069.",
    "Cross-attention argmax was [5, 4, 3, 2, 1, 0, 0] — the exact anti-diagonal reversal requires.",
    "The alignment is an inspectable matrix, which is why attention helped interpretability as well as accuracy.",
    "Debug on copy or reversal first — you know the answer and the expected attention pattern."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why scale embeddings by `√d_model` before adding positional encoding?",
      options: ["To prevent overflow", "Embeddings are initialised small, so without scaling the positional signal would dominate token identity", "To normalise the attention scores", "It is required by LayerNorm"],
      answer: 1,
      why: "Embedding weights start with small variance while sinusoidal encodings have components of order 1. Without scaling up the embeddings first, position would swamp token identity at the first layer. It is a magnitude-matching step, the same family of concern as the √d_k division in attention." },
    { stem: "The model reached 99.4 % exact match. Why is exact match a better metric here than per-token accuracy?",
      options: ["It is easier to compute", "Per-token accuracy can look high while most sequences contain at least one error", "It handles padding better", "They are equivalent"],
      answer: 1,
      why: "Getting a whole sequence right requires every token to be right, so per-token accuracy of 95 % on nine-token sequences could mean fewer than two thirds of sequences are fully correct. For generation tasks the sequence is the unit the user cares about, so that is what should be measured." },
    { stem: "Cross-attention argmax reads [5, 4, 3, 2, 1, 0, 0] for a six-token source. What does that show?",
      options: ["A bug in the mask", "The model learned the reversal alignment — target i attends to source 5−i", "Attention collapsed onto one position", "The positional encoding failed"],
      answer: 1,
      why: "That is exactly the anti-diagonal the reversal task requires, discovered from examples with no supervision on alignment. The trailing 0 is the end-of-sequence token, which has no source counterpart. Cross-attention makes the learned alignment directly inspectable." },
    { stem: "Your transformer's training loss collapses to near zero in 200 steps and generation is gibberish. What is wrong?",
      options: ["Learning rate too high", "Missing causal mask or target shift — the model is reading the answer", "Too few parameters", "Wrong positional encoding"],
      answer: 1,
      why: "Near-zero loss on next-token prediction is implausible, so assume leakage. Without a causal mask each position attends to the token it is predicting; without the target shift it is handed that token directly. Both make training trivial and generation impossible, and neither raises an error." }
  ] },

  interview: { title: "Interview", sub: "Building transformers", questions: [
    { level: "Core", q: "Walk me through building an encoder-decoder transformer in PyTorch.",
      strong: "Embeddings scaled by √d_model plus positional encoding, `nn.Transformer` with four masks, shifted target, masked loss.",
      answer: [{ t: "p", text: "Embeddings scaled by the square root of `d_model` with positional encoding added, then `nn.Transformer` with `norm_first=True` for pre-norm, then a linear projection to the vocabulary. The masking is where the care goes: a causal mask on the decoder's self-attention so no position sees the future, and three padding masks — source, target, and crucially `memory_key_padding_mask` for cross-attention, which people forget and which lets the decoder attend to the source's padding. For training, shift the target so the decoder input starts with a start token and the labels exclude it, then cross-entropy with `ignore_index` on the pad token. I would verify the whole thing on sequence reversal before touching real data, because you know the correct output and the expected attention pattern — I trained exactly this to 99.4 % exact match and the cross-attention came out as a clean anti-diagonal." }] },
    { level: "Senior", q: "How would you debug a transformer that trains but generates poorly?",
      strong: "Check for masking leakage first, then confirm you are evaluating by generating.",
      answer: [{ t: "p", text: "First I would look at the training loss value rather than its trend. If it is implausibly low — near zero on next-token prediction — the model is reading the answer, which means the causal mask is missing or the target is not shifted. I would test causality directly: perturb a token at position t and confirm the outputs at every earlier position are bit-identical, which should be exactly zero difference. Second, I would check how generation is being evaluated, because teacher-forced validation loss degrades gently with length while free-running accuracy collapses — the metric that looks fine may be measuring a task the model never performs. Third, `memory_key_padding_mask`: without it cross-attention spends weight on source padding, and I have measured that leak at over 80 % of attention for short sequences in a heavily padded batch, which shows up as accuracy that correlates with sequence length. And I would inspect the cross-attention itself, because on a task with a known alignment you can see immediately whether the model found it." }] },
    { level: "Senior", q: "What would you look for in a transformer's attention maps?",
      strong: "Whether the alignment matches the task, and how it differs across layers and heads.",
      answer: [{ t: "p", text: "On a task with a known correct alignment, whether the model found it — for reversal I measured the cross-attention argmax as [5, 4, 3, 2, 1, 0, 0] on a six-token source, which is the exact anti-diagonal, discovered without any supervision on alignment. That is a strong signal the model has learned the structure rather than memorising outputs. Beyond that I would compare across layers, since later decoder layers typically show cleaner task-specific structure while earlier ones are more diffuse, and across heads within a layer, where some show interpretable patterns and others look like noise. I would be careful not to over-read it though: attention weights show where the model looked, not why it decided what it did, and there is a real literature on attention not being a reliable explanation. On a task where I know the ground-truth alignment it is strong evidence; on open-ended text it is suggestive at best." }] }
  ] }
});
