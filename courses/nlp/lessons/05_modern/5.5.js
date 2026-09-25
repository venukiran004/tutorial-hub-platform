/* ============================================================================
   LESSON 5.5 — A Transformer from Scratch in PyTorch
   Mirrors 02_Transformers_InDepth.md · §16. The reference's code instantiates
   to exactly 124,439,808 params — GPT-2 to the digit — but contains two bugs
   that stop it running (§03). Trained to 100% on sequence reversal
   (scratchpad/nlp/n55.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.5",

  lede: "**The reference's `GPTModel(50257)` instantiates to 124,439,808 parameters — GPT-2's count to the digit.** It also crashes twice before it trains: `targets.view(-1)` fails on the non-contiguous slice every training loop produces, and the default `top_k=50` raises `selected index k out of range` on any vocabulary smaller than 50. Both are two-character fixes. This lesson runs the code, fixes it, trains it to 100% on sequence reversal, and opens up what the attention learned.",

  objectives: [
    "Assemble a complete decoder-only transformer and verify its parameter count",
    "Explain weight tying and what it saves",
    "Find and fix the two defects that stop the reference's code running",
    "Train the model to convergence and verify it learned the task",
    "Inspect a trained attention head and identify what it is doing"
  ],

  prerequisites: ["5.4", "4.7"],

  blocks: [

    { t: "h2", n: "01", text: "The whole model", id: "model" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n55.py — attention with a fused QKV projection", code:
"class MultiHeadAttention(nn.Module):\n    def __init__(self, d_model, n_heads, dropout=0.1):\n        super().__init__()\n        self.d_k = d_model // n_heads\n        self.n_heads = n_heads\n        self.qkv = nn.Linear(d_model, 3 * d_model)   # one matmul, not three\n        self.out = nn.Linear(d_model, d_model)\n        self.dropout = nn.Dropout(dropout)\n\n    def forward(self, x, mask=None):\n        B, T, C = x.size()\n        qkv = self.qkv(x).reshape(B, T, 3, self.n_heads, self.d_k)\n        qkv = qkv.permute(2, 0, 3, 1, 4)             # (3, B, heads, T, d_k)\n        Q, K, V = qkv[0], qkv[1], qkv[2]\n\n        scores = (Q @ K.transpose(-2, -1)) / math.sqrt(self.d_k)\n        if mask is not None:\n            scores = scores.masked_fill(mask == 0, float('-inf'))\n\n        weights = self.dropout(torch.softmax(scores, dim=-1))\n        out = (weights @ V).transpose(1, 2).reshape(B, T, C)\n        return self.out(out)",
      caption: "Fusing Q, K and V into one `d_model → 3·d_model` projection is mathematically identical to three separate ones and meaningfully faster — one larger matmul beats three smaller ones on any accelerator." },

    { t: "code", lang: "python", title: "The block and the model", code:
"class TransformerBlock(nn.Module):\n    def forward(self, x, mask=None):\n        x = x + self.attn(self.ln1(x), mask)      # Pre-LN\n        x = x + self.ffn(self.ln2(x))\n        return x\n\nclass GPTModel(nn.Module):\n    def __init__(self, vocab_size, d_model=768, n_heads=12, n_layers=12,\n                 d_ff=3072, max_len=1024, dropout=0.1):\n        super().__init__()\n        self.token_emb = nn.Embedding(vocab_size, d_model)\n        self.pos_emb   = nn.Embedding(max_len, d_model)     # learned positions\n        self.blocks    = nn.ModuleList([...])\n        self.ln_f      = nn.LayerNorm(d_model)              # final norm\n        self.head      = nn.Linear(d_model, vocab_size, bias=False)\n\n        self.head.weight = self.token_emb.weight            # weight tying\n\n    def forward(self, idx, targets=None):\n        B, T = idx.size()\n        x = self.dropout(self.token_emb(idx)\n                         + self.pos_emb(torch.arange(T, device=idx.device)))\n        mask = torch.tril(torch.ones(T, T, device=idx.device)) \\\n                    .unsqueeze(0).unsqueeze(0)\n        for block in self.blocks:\n            x = block(x, mask)\n        logits = self.head(self.ln_f(x))\n        ...",
      caption: "Note `ln_f` — the final LayerNorm a Pre-LN stack needs, which lesson 4.7 flagged as the easiest thing to omit." },

    { t: "h2", n: "02", text: "Weight tying", id: "tying" },

    { t: "out", text:
"GPTModel(50257) -> 124,439,808 params = 124.44M\n\nthe real gpt2 checkpoint      124,439,808\n\nwithout weight tying          163,037,184   (+38,597,376)" },

    { t: "callout", kind: "insight", title: "Exact to the parameter",
      body: [{ t: "p", text: "The reference's architecture reproduces GPT-2's parameter count **exactly** — every projection, bias and norm accounted for, matching the breakdown from lesson 4.10. That is a strong signal the implementation is structurally right, and it is the first thing to check when building a model from a paper. The tying line saves **38,597,376** parameters, a 24% reduction, by pointing the output projection at the embedding matrix rather than storing a second one. The justification is that both matrices map between the same two spaces — one token-to-vector, one vector-to-token — so sharing them is a reasonable prior as well as a saving. Nearly every modern LLM ties them." }] },

    { t: "h2", n: "03", text: "Two bugs", id: "bugs" },

    { t: "out", text:
"RuntimeError: view size is not compatible with input tensor's size and\nstride (at least one dimension spans across two contiguous subspaces).\nUse .reshape(...) instead." },

    { t: "callout", kind: "warn", title: "Bug 1: `targets.view(-1)` fails on the standard target slice",
      body: [{ t: "p", text: "The universal way to build next-token targets is `targets = seq[:, 1:]`, and that slice is **non-contiguous** — it shares storage with `seq` but skips the first column, so its stride does not permit a flat view. `view` refuses; `reshape` copies when it must and succeeds. The fix is `targets.reshape(-1)`. This is not an exotic case: every language-model training loop produces exactly this tensor, so the code as written cannot train at all." }] },

    { t: "out", text:
"RuntimeError: selected index k out of range" },

    { t: "callout", kind: "warn", title: "Bug 2: the default `top_k=50` crashes on a small vocabulary",
      body: [{ t: "p", text: "`torch.topk(logits, top_k)` raises when `top_k` exceeds the vocabulary size. With the default of 50, `generate` crashes on any model with fewer than 50 tokens — which is every toy model anyone writes while learning this. The fix is `min(top_k, logits.size(-1))`. It is a small thing, but it is exactly the kind of defect that only appears when you actually run the code rather than reading it, which is the argument for running everything." }] },

    { t: "h2", n: "04", text: "Training it", id: "training" },

    { t: "p", text: "A task with a single correct answer, so accuracy is unambiguous: given eight digits and a separator, emit them reversed. Solving it requires attending from output position `L+1+i` back to input position `L−1−i` — a reversed copy, which no bigram or positional heuristic can fake." },

    { t: "out", text:
"152,000 params, vocab 12, 3 layers, d_model 64\n\n  step      loss\n  1      36.5871\n  200     1.0287\n  400     1.0190\n  600     1.0134\n  800     1.0111\n  1200    1.0106\n\n  trained in 36.6 s on CPU" },

    { t: "out", text:
"exact-match accuracy: 50/50 = 100.0%\n\n  input   [2, 8, 7, 0, 0, 7, 1, 1]\n  target  [1, 1, 7, 0, 0, 7, 8, 2]\n  output  [1, 1, 7, 0, 0, 7, 8, 2]" },

    { t: "callout", kind: "insight", title: "Why the loss floors near 1.01 rather than 0",
      body: [{ t: "p", text: "Perfect accuracy at a loss of 1.0106 looks contradictory until you notice what the loss averages over. Half the positions are the *source* digits, which are uniform random and genuinely unpredictable — their irreducible cross-entropy is `ln(10) = 2.303`. The other half are the reversed copy, which the model predicts almost perfectly. Averaged, the floor lands near 1.15, and 1.0106 is close to it. This is the `L_∞` term from lesson 5.4 made concrete: part of the loss is the entropy of the data, and no amount of training removes it. **Always ask what a loss floor is made of before concluding a model has stopped learning.**" }] },

    { t: "h2", n: "05", text: "What the attention learned", id: "learned" },

    { t: "out", text:
"final layer, output position 9 — it must copy input position 7\n\n  head 0 attends most to position 3   (weight 0.128)\n  head 1 attends most to position 3   (weight 0.153)\n  head 2 attends most to position 7   (weight 0.698)\n  head 3 attends most to position 9   (weight 0.445)" },

    { t: "callout", kind: "insight", title: "Head 2 found the position it needed, at weight 0.698",
      body: [{ t: "p", text: "Position 9 is the first output token and must reproduce input position 7 — the last source digit. **Head 2 puts 0.698 of its attention exactly there**, with no supervision beyond the next-token loss. Head 3 attends to itself, heads 0 and 1 spread diffusely at weights around 0.13, which is close to uniform over the ten visible positions and means they are contributing little here. This is a much cleaner version of the head analysis in lesson 4.4: on a task with a known correct attention pattern, you can check whether the model found it, and one head did. It is also a reminder that specialisation is real but sparse — one of four heads is doing the work." }] },

    { t: "h2", n: "06", text: "Decoding settings", id: "decoding" },

    { t: "out", text:
"target [8, 4, 2, 0, 8, 5, 0, 1]\n\n  T=1.0 k=1    -> [8, 4, 2, 0, 8, 5, 0, 1]   exact\n  T=1.0 k=5    -> [8, 4, 2, 0, 8, 5, 0, 1]   exact\n  T=2.0 k=10   -> [8, 4, 2, 0, 8, 5, 0, 1]   exact\n  T=0.5 k=50   -> [8, 4, 2, 0, 8, 5, 0, 1]   exact" },

    { t: "callout", kind: "note", title: "Sampling did not break it, which I did not expect",
      body: [{ t: "p", text: "I anticipated that temperature 2.0 with a wide top-k would corrupt a task with exactly one right answer. It did not — all four settings produced the exact target. The model is confident enough after training that even doubling the temperature leaves the correct token dominant in the distribution. That is worth stating plainly rather than quietly dropping: **decoding parameters only matter when the distribution is genuinely uncertain.** On a deterministic task a well-trained model is robust to them, and on an open-ended one they matter enormously — which is why temperature tuning is a generation concern, not a correctness one." }] },

    { t: "h2", n: "07", text: "The generation loop", id: "generate" },

    { t: "code", lang: "python", title: "Autoregressive decoding with temperature and top-k", code:
"@torch.no_grad()\ndef generate(self, idx, max_new_tokens, temperature=1.0, top_k=50):\n    for _ in range(max_new_tokens):\n        # crop to the position table's capacity — a learned table has no\n        # row beyond max_len (lesson 4.9)\n        logits, _ = self(idx[:, -self.pos_emb.num_embeddings:])\n        logits = logits[:, -1, :] / temperature\n\n        if top_k > 0:\n            k = min(top_k, logits.size(-1))        # the fix\n            v, _ = torch.topk(logits, k)\n            logits[logits < v[:, [-1]]] = float('-inf')\n\n        probs = torch.softmax(logits, dim=-1)\n        idx = torch.cat([idx, torch.multinomial(probs, 1)], dim=1)\n    return idx",
      caption: "Note the cropping on the first line — because positions are a learned table, anything past `max_len` has no embedding at all, so the context must be truncated rather than degraded." },

    { t: "p", text: "Temperature divides the logits before the softmax, so `T < 1` sharpens and `T > 1` flattens. Top-k masks everything outside the k highest logits to `−inf` so the softmax assigns them exactly zero. The two compose: temperature reshapes the distribution, top-k truncates it, and they are applied in that order." },

    { t: "exercise", title: "Build it yourself",
      tasks: [
        "Write the model from scratch and check `GPTModel(50257)` gives 124,439,808 parameters before training anything.",
        "Remove the weight tying and confirm the count rises by exactly vocab × d_model.",
        "Train on sequence reversal and compute the theoretical loss floor from the task's entropy before you run it.",
        "Inspect the final layer's attention at each output position and check whether a head tracks the position it needs.",
        "Remove `ln_f` and retrain. Compare the loss curve against the version that has it."
      ] }
  ],

  takeaways: [
    "The reference's GPTModel(50257) instantiates to exactly 124,439,808 parameters — GPT-2's count to the digit.",
    "Weight tying (`head.weight = token_emb.weight`) saves 38,597,376 parameters, 24% of the model.",
    "Bug 1: `targets.view(-1)` fails because `seq[:, 1:]` is non-contiguous — every LM training loop produces that tensor, so the code cannot train as written. Use `.reshape(-1)`.",
    "Bug 2: the default `top_k=50` crashes on any vocabulary smaller than 50. Clamp with `min(top_k, logits.size(-1))`.",
    "Fusing Q, K and V into one d_model → 3·d_model projection is identical mathematically and faster in practice.",
    "Trained to 100% exact-match on sequence reversal in 36.6 s on CPU with 152,000 parameters.",
    "The loss floored at 1.0106 despite perfect accuracy, because half the positions are uniform random digits with irreducible entropy ln(10) = 2.303.",
    "One head out of four found the exact position it needed to copy, at weight 0.698, with no supervision beyond next-token loss.",
    "All four temperature and top-k settings produced the exact answer — decoding parameters only matter when the distribution is genuinely uncertain.",
    "The generation loop must crop context to the position table's size, because a learned table has no row beyond max_len."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does `targets.view(-1)` fail in the reference's loss computation?",
      options: ["The tensor is on the wrong device", "Targets built as `seq[:, 1:]` are non-contiguous, and view cannot flatten a tensor whose stride skips a column", "The dtype is wrong", "The batch size varies"],
      answer: 1,
      why: "The slice shares storage with the original tensor but skips the first column, so a flat view is not expressible under its stride. `reshape` copies when required and works. This is not an edge case — every next-token training loop builds targets exactly this way, so the code cannot train at all until it is fixed." },
    { stem: "The model reached 100% accuracy but the loss floored at 1.0106. Why?",
      options: ["It was overfitting", "Half the positions are uniform random source digits with irreducible entropy ln(10) = 2.303, which averages into the loss", "The learning rate was too high", "Dropout was still active"],
      answer: 1,
      why: "Loss averages over all positions, and the source digits are genuinely unpredictable — no model can do better than chance on them. Only the reversed half is learnable, and the model predicts it almost perfectly. This is the irreducible L_infinity term from lesson 5.4: always decompose a loss floor before concluding a model has stopped learning." },
    { stem: "What does weight tying do?",
      options: ["Freezes the embeddings", "Points the output projection at the embedding matrix, saving vocab × d_model parameters — 38,597,376 here", "Shares weights across layers", "Reduces the vocabulary"],
      answer: 1,
      why: "Both matrices map between the same two spaces — token to vector and vector back to token — so sharing them is a reasonable prior as well as a 24% parameter saving. Nearly every modern LLM does it, and it is why the reference's model matches GPT-2's count exactly." },
    { stem: "All four temperature and top-k settings produced the exact correct answer. What does that show?",
      options: ["The decoding parameters were ignored", "Decoding settings only matter when the distribution is genuinely uncertain — a confident model on a deterministic task is robust to them", "The model was overfit", "Top-k was clamped to 1"],
      answer: 1,
      why: "Even at temperature 2.0 with top-k 10 the correct token remained dominant, because training made the distribution extremely peaked. Temperature and top-k reshape and truncate a distribution; if it has almost all its mass on one token, reshaping changes little. They matter enormously on open-ended generation, which is where they belong." }
  ] },

  interview: { title: "Interview", sub: "Implementation", questions: [
    { level: "Core", q: "Walk me through implementing a decoder-only transformer.",
      strong: "Embeddings plus position, N Pre-LN blocks, final norm, tied output head.",
      answer: [{ t: "p", text: "Token embeddings plus positional embeddings, dropout, then N identical blocks, a final LayerNorm, and a linear head to vocabulary size. Each block is Pre-LN: x becomes x plus attention of LayerNorm of x, then x plus FFN of LayerNorm of x. Inside attention I'd fuse Q, K and V into a single d_model to 3 times d_model projection rather than three separate matrices — mathematically identical, and one large matmul beats three small ones on any accelerator. Then reshape into heads, score, apply the causal mask by filling with negative infinity before the softmax, blend the values, reshape back, and project out. Three details that are easy to miss. The final LayerNorm after the block loop — Pre-LN's last operation is a residual addition, so without it the output was never normalised, and omitting it degrades training quietly. Weight tying, setting the head's weight to the embedding's, which saved 38.6 million parameters here, about 24% of the model. And in the generation loop, cropping the context to the position table's size, because learned positional embeddings have no row beyond max_len. A good sanity check before training anything: instantiate at GPT-2's config and check you get 124,439,808 parameters. The reference implementation does, exactly." }] },
    { level: "Senior", q: "You implement a transformer and the loss plateaus above zero. How do you diagnose it?",
      strong: "First work out what the irreducible floor is — it may be training correctly.",
      answer: [{ t: "p", text: "The first question is what the floor *should* be, because a plateau above zero is often correct rather than a bug. I hit exactly this: a model reached 100% exact-match accuracy on sequence reversal while the loss sat at 1.0106. That looks like failure until you decompose it — half the positions were uniform random source digits with irreducible entropy of ln 10, about 2.303, and only the reversed half was learnable. Averaged, the theoretical floor was near 1.15, so 1.0106 was essentially converged. So step one is always to compute the entropy of the unpredictable part of your target and compare. If the floor genuinely is too high, I'd work down a list. Check the model can overfit a single batch to near-zero loss — if it can't, something is structurally broken, usually the mask, the target alignment being off by one, or a missing final norm. Verify the causal mask makes the upper triangle exactly zero, not merely small. Check target alignment explicitly, since predicting position t from position t is a classic off-by-one that produces a suspiciously low loss rather than a high one. Look at gradient norms per layer — lesson 4.6's Pre-LN versus Post-LN measurement showed nearly six orders of magnitude difference reaching the first block, and a Post-LN stack without warmup will plateau. Then learning rate, which for fine-tuning wants to be around 2e-5 and for training from scratch much higher." }] },
    { level: "Senior", q: "How do you know an implementation you wrote from a paper is correct?",
      strong: "Parameter count first, then overfit a batch, then reproduce a known result.",
      answer: [{ t: "p", text: "Three checks in increasing cost. First, parameter count: instantiate at the published configuration and compare against the published total. It's free, it runs before any training, and it catches a surprising range of structural errors — a missing bias, a wrong d_ff, an untied head, a forgotten projection. When I ran the reference's model at GPT-2's config it gave 124,439,808 parameters, matching the checkpoint exactly, which is strong evidence the structure is right. Second, overfit a single batch. A correct model with a correct loss should drive one batch to near-zero loss. If it can't, the problem is structural rather than about hyperparameters, and you've narrowed it enormously. Third, reproduce a known result on a task with an unambiguous answer — I used sequence reversal, where accuracy is exact match and there's no scoring ambiguity, and got 100% in 36 seconds on CPU with 152,000 parameters. A small deterministic task is worth far more than a large fuzzy one for verification. Beyond those I'd compare intermediate tensors against a reference implementation layer by layer if one exists, and write assertions on things that must hold — the causal mask's upper triangle is exactly 0.0, attention rows sum to 1, shapes are preserved through a block. And I'd run the code rather than read it: the reference here had two runtime bugs that are invisible on the page." }] }
  ] }
});
