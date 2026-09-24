/* ============================================================================
   LESSON 3.11 — Padding, Packing and Masking
   Mirrors 03_Sequence_Models.md · §12. Packed-vs-padded h_n divergence,
   attention leakage onto padding, and loss masking all measured
   (scratchpad/dl/d39.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.11",

  lede: "**Real sequences have different lengths; batched tensors do not.** Padding reconciles them, and then quietly corrupts everything downstream — the final hidden state is computed after steps of fake input, attention spends most of its weight on positions that do not exist, and the loss trains the model to predict `<pad>`. None of it raises an error. This lesson measures each failure and fixes it, and in one case **80 % of attention was landing on padding**.",

  objectives: [
    "Pad a batch and identify what breaks as a result",
    "Use `pack_padded_sequence` and show it changes the final hidden state",
    "Mask attention scores before the softmax and measure the leakage without it",
    "Exclude padded positions from the loss with `ignore_index`"
  ],

  prerequisites: ["3.10", "3.6"],

  blocks: [

    { t: "h2", n: "01", text: "Padding", id: "padding" },

    { t: "diagram", kind: "cells", title: "A batch of three sequences",
      caption: "Padding to the longest member is what makes a rectangular tensor possible. Here 5 of 15 positions — a third — are fake.",
      items: [
        { label: "w₁ w₂ w₃ w₄ w₅", sub: "length 5", tone: "good" },
        { label: "w₁ w₂ w₃ ▢ ▢", sub: "length 3 + 2 pad", tone: "warn" },
        { label: "w₁ w₂ ▢ ▢ ▢", sub: "length 2 + 3 pad", tone: "crit" }
      ] },

    { t: "callout", kind: "trap", title: "Padding is not free in an RNN",
      body: [{ t: "p", text: "It is tempting to assume that a zero vector fed to an RNN does nothing. It does not. `h_t = tanh(W_hh h_{t−1} + W_xh · 0 + b)` still applies `W_hh` and the bias, so the hidden state keeps evolving — it just evolves on the basis of nothing. After two padding steps, `h_n` for that sequence is the state two spurious updates past where the real sequence ended. This is why sorting a batch by length changes your results, and why two runs that differ only in batch composition can disagree." }] },

    { t: "h2", n: "02", text: "Packing", id: "packing" },

    { t: "code", lang: "python", title: "pack, run, unpack",
      code: `from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence

packed = pack_padded_sequence(padded_input, lengths,
                              batch_first=True, enforce_sorted=False)
packed_output, (h_n, c_n) = lstm(packed)
output, output_lengths = pad_packed_sequence(packed_output, batch_first=True)`,
      caption: "`enforce_sorted=False` lets PyTorch sort and unsort internally. Older code sorts the batch by length manually — no longer necessary, and a common source of index-tracking bugs." },

    { t: "out", text: `  padded  h_n[0][1] (seq of true length 3): [0.2015, -0.1020, -0.1050]
  packed  h_n[0][1]                       : [0.1961, -0.1103, -0.1144]
  identical: False
  outputs agree at real positions: True` },

    { t: "p", text: "**The final hidden states genuinely differ.** The packed version's `h_n` is the state after the sequence's last *real* token; the padded version's is two zero-input steps later. The per-position outputs agree wherever real tokens exist — so if you only use `output`, padding is harmless. If you use `h_n`, as every many-to-one classifier does, it is wrong." },

    { t: "callout", kind: "insight", title: "Packing is a correctness fix before it is a speed fix",
      body: [{ t: "p", text: "Packing is usually introduced as an optimisation — skip the padded steps, save compute. The saving is real but modest. The correctness argument is the one that matters: without packing, `h_n` is not the summary of your sequence, and every classifier built on it is subtly wrong in a way proportional to how much padding each example carries. Short sequences in a batch with one long one are damaged most, which means the bug's severity depends on batch composition and will move around as you change batch size." }] },

    { t: "h2", n: "03", text: "Masking attention", id: "attention-mask" },

    { t: "code", lang: "python", title: "Mask before the softmax, not after",
      code: `mask = torch.arange(max_len).expand(batch, max_len) < lengths.unsqueeze(1)
scores = scores.masked_fill(~mask.unsqueeze(1), float('-inf'))
weights = torch.softmax(scores, dim=-1)     # padded positions get exactly 0`,
      caption: "`-inf` before the softmax gives `exp(-inf) = 0`, so padded positions receive exactly zero weight and the remaining weights still sum to 1." },

    { t: "out", text: `  mask:
[[1 1 1 1 1]
 [1 1 1 0 0]
 [1 1 0 0 0]]

  row 2 (true length 2) weights unmasked: [0.058, 0.139, 0.586, 0.040, 0.178]
  row 2 masked                          : [0.295, 0.705, 0.0, 0.0, 0.0]
  masked weight on padding = 0.0; unmasked leaks 0.803 of attention onto padding` },

    { t: "callout", kind: "crit", title: "80.3 % of the attention went to positions that do not exist",
      body: [{ t: "p", text: "For a sequence of true length 2 in a batch padded to 5, the unmasked attention put **0.803 of its total weight on the three padding positions** — the context vector is over three-quarters noise. It is worse than it looks: padding embeddings are typically a single learned `<pad>` vector, so it is not even random noise but a consistent signal the model will learn to exploit, producing a model that appears to work and depends on an artefact of your batching. Masking after the softmax and renormalising is also wrong, incidentally — the padded positions have already absorbed probability mass that the real positions should have competed for." }] },

    { t: "h2", n: "04", text: "Masking the loss", id: "loss-mask" },

    { t: "out", text: `  loss over all 15 positions      : 2.2107
  loss over the 10 real positions: 2.1076
  33% of positions are padding - unmasked, the model is trained to predict padding` },

    { t: "code", lang: "python", title: "`ignore_index` is the clean way",
      code: `PAD = 0
loss = F.cross_entropy(logits.reshape(-1, V),
                       targets.reshape(-1),
                       ignore_index=PAD)`,
      caption: "`ignore_index` excludes those positions from both the numerator and the denominator, so the reported loss is a genuine per-real-token average." },

    { t: "p", text: "A third of the positions here are padding, so an unmasked loss spends a third of its gradient teaching the model to emit `<pad>` — which it will duly learn to do, including at inference where it should be generating content. The reported loss is also not comparable across batches, because it depends on how much padding each batch happens to contain." },

    { t: "table", head: ["Where padding leaks", "Symptom", "Fix"],
      rows: [
        ["RNN final state", "`h_n` computed past the real sequence end", "`pack_padded_sequence`"],
        ["Attention", "Context vector dominated by padding — 80 % measured", "`masked_fill(-inf)` before softmax"],
        ["Loss", "Model trained to predict `<pad>`; loss varies with batch composition", "`ignore_index=PAD`"],
        ["Pooling", "Mean over padded positions dilutes the average", "Sum over the mask, divide by true length"],
        ["Metrics", "Accuracy counts trivially correct pad predictions", "Compute over the mask only"]
      ] },

    { t: "exercise", kind: "practice", title: "Find every padding leak", difficulty: "intermediate", minutes: 35,
      prompt: "Build a batch with very unequal lengths — say 2, 5 and 30 — and trace padding through a full model. Compare `h_n` with and without packing. Compute attention weights with and without masking and record how much weight lands on padding for each sequence. Compute the loss with and without `ignore_index`. Then train a classifier both ways and compare accuracy, paying particular attention to whether the gap depends on how much padding a sequence carries.",
      hints: [
        "Make the length disparity extreme so the effects are unmistakable.",
        "Report attention leakage per sequence — it should scale with padding fraction.",
        "Group test accuracy by sequence length to see where the unmasked model fails."
      ],
      solution: {
        notes: [
          { t: "p", text: "Attention leakage scales with padding fraction, which is the diagnostic signature. For a length-2 sequence padded to 5 I measured 80.3 % of weight on padding; with a length-2 sequence in a batch padded to 30 it would be worse still. That dependence on batch composition is what makes this bug so unpleasant — the same model gives different results depending on which examples happened to be batched together, so it does not reproduce cleanly and looks like random variance." },
          { t: "p", text: "Grouping accuracy by length is the analysis that identifies the problem. The unmasked model will be roughly fine on the longest sequences in each batch, which carry little padding, and clearly worse on short ones. An aggregate metric averages this into a mild overall deficit that looks like ordinary model error. Any time accuracy correlates with sequence length, padding handling is the first thing to check." },
          { t: "p", text: "One subtlety worth noticing: the unmasked model often still reaches decent accuracy, because it learns to exploit the padding signal consistently and padding is a reliable feature at training time. That is exactly why these bugs survive — the model is not broken, it has learned something real about your batching procedure, and the failure surfaces at inference when batch composition differs or when examples arrive one at a time." }
        ]
      } }

  ],

  takeaways: [
    "Padding is not inert in an RNN — the state keeps updating from `W_hh` and the bias on zero input.",
    "Packing changes `h_n` measurably; the packed version is the state at the last real token.",
    "Per-position outputs agree at real positions, so padding only hurts if you use `h_n` — which classifiers do.",
    "Unmasked attention on a length-2 sequence padded to 5 put 80.3 % of its weight on padding.",
    "Mask with `-inf` *before* the softmax; masking afterwards leaves mass already absorbed by padding.",
    "Unmasked loss trains the model to predict `<pad>` and varies with batch composition; use `ignore_index`.",
    "Accuracy correlating with sequence length is the signature of a padding bug."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does padding corrupt an RNN's final hidden state?",
      options: ["Zero inputs are ignored", "The state keeps updating from the recurrent weights and bias even on zero input", "Padding causes gradient explosion", "The LSTM gates reject it"],
      answer: 1,
      why: "`h_t = tanh(W_hh h_{t−1} + W_xh·0 + b)` still applies the recurrent matrix and bias, so the state evolves on the basis of nothing. The measured packed and padded `h_n` values genuinely differ. Per-position outputs are fine at real positions — the damage is specific to `h_n`, which is what many-to-one classifiers use." },
    { stem: "Where should you apply an attention mask?",
      options: ["After the softmax, then renormalise", "Before the softmax, setting padded scores to −inf", "On the input embeddings only", "In the loss function"],
      answer: 1,
      why: "`exp(-inf) = 0`, so masking before the softmax gives padded positions exactly zero weight while the real positions still sum to 1. Masking afterwards is wrong because the padded positions have already absorbed probability mass that the real positions should have competed for." },
    { stem: "In the measured example, how much attention weight landed on padding without a mask?",
      options: ["About 5 %", "About 80 %", "Exactly 0 %", "About 30 %"],
      answer: 1,
      why: "0.803 of the total weight, for a sequence of true length 2 padded to length 5 — the context vector was over three-quarters noise. Worse, padding embeddings are usually a single learned `<pad>` vector, so it is a consistent signal the model can learn to depend on." },
    { stem: "Your model's accuracy is noticeably worse on short sequences than long ones. What is the likely cause?",
      options: ["Short sequences are inherently harder", "A padding bug — short sequences carry the most padding", "The learning rate is too high", "Insufficient training data for short sequences"],
      answer: 1,
      why: "Padding damage scales with padding fraction, so the shortest sequences in each batch are hurt most while the longest are nearly unaffected. An aggregate metric averages this into what looks like ordinary model error. Accuracy correlating with length is the signature — check packing, attention masking and `ignore_index`." }
  ] },

  interview: { title: "Interview", sub: "Variable-length sequences", questions: [
    { level: "Core", q: "How do you handle variable-length sequences in a mini-batch?",
      strong: "Pad to the longest, then pack for the RNN, mask attention, and exclude padding from the loss.",
      answer: [{ t: "p", text: "Pad every sequence to the batch maximum so you have a rectangular tensor, then undo the consequences at each place padding would leak in. For the RNN, `pack_padded_sequence` so the recurrence stops at each sequence's real end — this matters because padding is not inert, the state keeps updating from the recurrent weights and bias on zero input, so `h_n` ends up several spurious steps past where the sequence actually finished. For attention, build a boolean mask and set padded scores to negative infinity before the softmax. For the loss, `ignore_index` on the pad token. And for any pooling or metric, sum over the mask and divide by true length rather than by the padded length. The theme is that padding is invisible to the framework — nothing errors — so every one of these has to be done deliberately." }] },
    { level: "Senior", q: "Why is masking before the softmax different from masking after it?",
      strong: "After the softmax, padding has already taken probability mass that the real positions should have competed for.",
      answer: [{ t: "p", text: "Softmax normalises across all positions, so if padding is included the padded positions consume some of the total probability. Zeroing them afterwards and renormalising rescales what is left, but the *relative* weights among the real positions are not what they would have been had padding never competed — the scores were exponentiated and summed together. Masking with negative infinity beforehand means `exp(-inf)` is exactly zero, so padding contributes nothing to the denominator and the real positions compete only with each other. The magnitude of this matters: I measured 80.3 % of attention weight landing on padding for a length-2 sequence in a batch padded to 5, so the context vector was mostly noise. And since `<pad>` is usually one learned embedding rather than random values, it is a consistent signal the model can learn to rely on, which produces a model that works in training and fails when batch composition changes." }] },
    { level: "Senior", q: "A model's accuracy correlates with sequence length. How would you investigate?",
      strong: "Suspect padding handling — the damage scales with padding fraction, so short sequences suffer most.",
      answer: [{ t: "p", text: "That correlation is the classic signature of a padding bug, because every padding-related error scales with how much padding a sequence carries, and the shortest sequences in each batch carry the most. I would check three places in order. Whether the RNN is packed, since without it `h_n` is the state some number of zero-input steps past the real end and any classifier built on `h_n` is wrong by an amount proportional to the padding. Whether attention is masked before the softmax. And whether the loss uses `ignore_index`, since otherwise a third or more of the gradient can be teaching the model to emit the pad token. A quick diagnostic is to run inference with batch size 1, where there is no padding at all — if accuracy on short sequences jumps, that confirms it immediately. I would also bucket examples by length when batching, which reduces padding across the board and is worth doing regardless." }] }
  ] }
});
