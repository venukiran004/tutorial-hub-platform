/* ============================================================================
   LESSON 4.9 — Positional Encoding Deep Dive
   Mirrors 02_Transformers_InDepth.md · §10. Permutation equivariance is
   proved numerically, RoPE's relative property verified to 6 decimals, the
   ALiBi slopes and PI/NTK arithmetic reproduced. RoPE's "long-range decay"
   holds only for aligned q,k (§06) — scratchpad/nlp/n49.py.
   ========================================================================= */
EC.receiveLesson({
  id: "4.9",

  lede: "**RoPE gives the same attention score for positions (0,3), (10,13), (100,103) and (5000,5003) — 2.803810, 2.803811, 2.803815, 2.804198.** Rotate the query and key by their *absolute* positions and the dot product depends only on the *difference*, because a rotation's transpose is its inverse. That one identity is why every recent large model uses RoPE, and this lesson derives it, verifies it, and works through the four other schemes that came before.",

  objectives: [
    "Prove permutation equivariance and verify it numerically",
    "Place every positional scheme on the absolute/relative and input/attention axes",
    "Derive why RoPE's absolute rotation produces relative position",
    "Compute ALiBi's per-head slopes and bias matrix",
    "Apply Position Interpolation and NTK-aware scaling to extend a context window"
  ],

  prerequisites: ["4.8", "4.2"],

  blocks: [

    { t: "h2", n: "01", text: "The proof that position is needed", id: "equivariance" },

    { t: "p", text: "Let `P` be any permutation matrix, so `PPᵀ = I`. Attention with no positional information:" },

    { t: "math", tex: "\\text{Attn}(PX) = \\text{softmax}\\!\\left(\\frac{P(XW_Q)(XW_K)^{\\top}P^{\\top}}{\\sqrt{d_k}}\\right)P(XW_V) = P \\cdot \\text{Attn}(X)" },

    { t: "p", text: "Softmax is applied row-wise and `P(·)Pᵀ` only relabels rows and columns, so the permutation passes straight through. Attention is **permutation-equivariant**. Verified on random matrices:" },

    { t: "out", text:
"permutation [4, 1, 0, 5, 2, 3]\nmax |Attn(PX) - P.Attn(X)| = 1.91e-06" },

    { t: "callout", kind: "crit", title: "Without position, \"dog bites man\" equals \"man bites dog\"",
      body: [{ t: "p", text: "Float32 noise, nothing more. The two sentences are literally the same input to the mechanism — same multiset of tokens, same output multiset. Since word order carries a large share of meaning in every natural language, this is not a limitation to work around later; it is a hole that has to be filled before the architecture is usable at all." }] },

    { t: "h2", n: "02", text: "Two design axes", id: "axes" },

    { t: "table",
      head: ["", "Absolute — encode position i", "Relative — encode distance i − j"],
      rows: [
        ["Added to the input embedding", "Learned absolute (BERT, GPT-2); sinusoidal (original)", "Shaw et al. relative PE"],
        ["Applied inside attention", "rare", "T5 relative bias; RoPE (rotation); ALiBi (linear bias)"]
      ] },

    { t: "callout", kind: "insight", title: "Why relative usually wins, and why applying it in attention wins",
      body: [{ t: "p", text: "Two separate arguments, often conflated. **Relative beats absolute** because what matters linguistically is how far apart two tokens are, not their index in the document — the relationship between a verb and its subject is the same at position 5 and position 5,000. **Inside attention beats added to the input** because a signal added once at the embedding has to survive every subsequent layer, diluting as each block writes into the residual stream, whereas a scheme applied to Q and K is reapplied fresh in every layer. RoPE wins on both axes at once, which is the short version of why it took over." }] },

    { t: "h2", n: "03", text: "Learned absolute", id: "learned" },

    { t: "code", lang: "python", title: "The simplest scheme", code:
"self.pos_emb = nn.Embedding(max_len, d_model)          # trainable table\npos = self.pos_emb(torch.arange(T, device=x.device))   # (T, d_model)\nx   = self.token_emb(idx) + pos",
      caption: "One learned vector per position, no different in kind from the token embedding table." },

    { t: "p", text: "Maximally flexible within the trained length, and hard-capped outside it. GPT-2's context is 1024 and GPT-3's is 2048 for exactly this reason: the table has no row for index 2049, so the model does not degrade at longer lengths — it raises an index error. It also spends `L_max × d` parameters on something a formula can compute for free." },

    { t: "h2", n: "04", text: "Sinusoidal, and its hidden relative structure", id: "sinusoidal" },

    { t: "out", text:
"d = 4, base 10000, so omega_0 = 1.0000 and omega_1 = 0.0100\n\n  pos=0: [0.000,  1.000, 0.000, 1.000]\n  pos=1: [0.841,  0.540, 0.010, 1.000]\n  pos=2: [0.909, -0.416, 0.020, 1.000]\n          fast pair swings         slow pair barely moves\n\nreference values reproduce exactly" },

    { t: "p", text: "Lesson 4.2 established the frequency spectrum and verified the rotation property empirically. The derivation is the angle-addition identity applied to each pair:" },

    { t: "math", tex: "\\begin{bmatrix}PE_{pos+k,\\,2i}\\\\ PE_{pos+k,\\,2i+1}\\end{bmatrix} = \\begin{bmatrix}\\cos k\\omega_i & \\sin k\\omega_i\\\\ -\\sin k\\omega_i & \\cos k\\omega_i\\end{bmatrix}\\begin{bmatrix}PE_{pos,\\,2i}\\\\ PE_{pos,\\,2i+1}\\end{bmatrix}" },

    { t: "p", text: "The matrix depends on `k` but not on `pos`. So an absolute encoding already contains relative structure the model *can* learn to exploit — it just is not forced to. RoPE takes this observation and makes it the mechanism rather than a possibility." },

    { t: "h2", n: "05", text: "Relative bias: Shaw and T5", id: "relative" },

    { t: "dl", items: [
      ["Shaw et al. (2018)", "Add a learned vector `a_{i−j}` to the keys (and optionally values) inside the attention computation. Distances are clipped to ±k so the table stays small. The value-side term complicates KV caching, which is why it fell out of favour."],
      ["T5 relative bias", "Drop the vectors entirely. Add one learned **scalar** per (distance bucket, head) directly to the attention logits, with no positional information in the input at all."],
      ["Log-spaced buckets", "Distances 0–7 get their own buckets; 8–11 share one, 12–15 another, 16–23 another. Fine resolution nearby, coarse far away — which is both cheap and a reasonable prior."],
      ["Parameter cost", "A `num_buckets × num_heads` table. Tiny — a few thousand parameters for the whole model."]
    ] },

    { t: "math", tex: "\\text{score}(i,j) = \\frac{q_i \\cdot k_j}{\\sqrt{d_k}} + b^{(h)}_{\\text{bucket}(i-j)}" },

    { t: "h2", n: "06", text: "RoPE", id: "rope" },

    { t: "p", text: "Do not add anything. **Rotate** the query and key vectors by an angle proportional to their absolute position, using the same frequency spectrum as sinusoidal. Since rotation matrices satisfy `Rₘᵀ = R₋ₘ` and `R_a R_b = R_{a+b}`:" },

    { t: "math", tex: "\\langle \\tilde q_m, \\tilde k_n \\rangle = (R_m q)^{\\top}(R_n k) = q^{\\top} R_m^{\\top} R_n k = q^{\\top} R_{\\,n-m}\\, k" },

    { t: "out", text:
"the reference's d=2 check\n\n  q=[1,0] at m=2 -> [-0.4161,  0.9093]    reference [-0.416,  0.909]\n  k=[1,0] at n=5 -> [ 0.2837, -0.9589]    reference [ 0.284, -0.959]\n\n  <q~, k~> = -0.9900     cos(m - n) = cos(-3) = -0.9900" },

    { t: "out", text:
"d = 64, same random q and k, same relative distance of 3\n\n  m=0     n=3       score 2.803810\n  m=10    n=13      score 2.803811\n  m=100   n=103     score 2.803815\n  m=5000  n=5003    score 2.804198\n\ndifferent distances give genuinely different scores\n  distance 0    -0.726951\n  distance 1     0.271698\n  distance 2     1.760896\n  distance 5     0.952095\n  distance 10   -0.492164" },

    { t: "callout", kind: "insight", title: "Absolute rotation, relative result",
      body: [{ t: "p", text: "The score at distance 3 is the same to six significant figures whether the tokens sit at positions 0 and 3 or 5000 and 5003 — the tiny drift is float32 accumulation in the angle, not a property of the method. Nothing about the scheme is relative by construction: each vector is rotated by its own absolute position. The relativity emerges because the dot product cancels the shared rotation. This also makes RoPE completely KV-cache friendly: a cached key stays valid forever, since its rotation was determined by its own position and never needs revising as the sequence grows." }] },

    { t: "code", lang: "python", title: "The rotate_half implementation used in LLaMA and HuggingFace", code:
"def rotate_half(x):\n    x1, x2 = x[..., :x.shape[-1] // 2], x[..., x.shape[-1] // 2:]\n    return torch.cat([-x2, x1], dim=-1)      # the 90-degree part of the rotation\n\ndef apply_rope(x, cos, sin):\n    return x * cos + rotate_half(x) * sin    # = R_m . x, elementwise",
      caption: "HuggingFace pairs dimensions as `(i, i + d/2)` rather than `(2i, 2i+1)`. Mathematically equivalent up to a fixed channel permutation, and it makes the rotation two elementwise multiplies with no per-pair matmul." },

    { t: "h2", n: "07", text: "RoPE's long-range decay, measured carefully", id: "decay" },

    { t: "p", text: "The reference states that high-frequency pairs make distant tokens' contributions oscillate and cancel, giving a natural long-range decay. That is checkable, and the answer depends on what you measure." },

    { t: "out", text:
"case A - q and k identical (maximally aligned)\n\n  distance     score    fraction of distance-0\n  0           70.0645    1.0000\n  1           68.0572    0.9714\n  8           49.0722    0.7004\n  64          38.3147    0.5468\n  512         20.0806    0.2866\n  2048         3.7520    0.0536\n\ncase B - 2000 independent random q, k pairs\n\n  distance     mean score    mean |score|\n  0              0.0775        6.4192\n  16             0.0470        6.1250\n  256           -0.0557        5.9750\n  2048           0.1471        6.3891" },

    { t: "callout", kind: "warn", title: "The decay is in the upper bound, not in typical magnitude",
      body: [{ t: "p", text: "With aligned query and key, the score falls monotonically to **5.36%** of its distance-0 value by 2048 positions — a strong, clean decay exactly as described. With *independent random* vectors, mean absolute score does not decay at all, staying around 6.0–6.5 at every distance. Both are correct and they are not in conflict: rotation is orthogonal, so it preserves the distribution of a dot product between independent vectors, while the *maximum achievable* score for a given pair decays because the per-pair phase offsets spread out and cancel. So RoPE bounds how strongly a token can attend far away; it does not make far-away attention typically weaker. Worth stating precisely, because \"RoPE decays with distance\" is often read as the stronger claim." }] },

    { t: "h2", n: "08", text: "ALiBi", id: "alibi" },

    { t: "p", text: "No positional embedding of any kind. Subtract a penalty from the attention logits that grows linearly with distance, with a different fixed slope per head." },

    { t: "math", tex: "\\text{score}(i,j) = q_i \\cdot k_j - m_h\\,|i - j|, \\qquad m_h = 2^{-8h/H}" },

    { t: "out", text:
"H = 8    r = 2^(-8/8) = 0.5000\n  slopes: 0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625, 0.0078125, 0.00390625\n  exactly: 1/2, 1/4, 1/8, 1/16, 1/32, 1/64, 1/128, 1/256\n\nH = 16   r = 2^(-8/16) = 0.7071\n  slopes: 0.7071, 0.5, 0.3536, 0.25, 0.1768, 0.125, 0.0884, 0.0625\n\nbias row for slope 0.5, query at i=4\n  key j:     0      1      2      3      4\n  bias:   -2.0   -1.5   -1.0   -0.5    0.0" },

    { t: "callout", kind: "insight", title: "Different slopes give heads different horizons",
      body: [{ t: "p", text: "The geometric slope sequence is the whole design. A head with slope 1/2 is penalised 2.0 at distance 4 — it can barely see past a few tokens, so it becomes a local head. A head with slope 1/256 is penalised 0.0156 at the same distance and effectively ignores position, so it can attend anywhere. One architecture therefore contains a spectrum of receptive fields without learning any of them. The cost is that the bias is **monotonic**: ALiBi structurally cannot express \"attend strongly to something far away and weakly to something near\", which RoPE can. That is the trade — best-in-class train-short-test-long extrapolation, slightly less expressive." }] },

    { t: "h2", n: "09", text: "Extending a trained context window", id: "extension" },

    { t: "out", text:
"train L = 2048, target L' = 8192, scale s = 4.0\n\nPosition Interpolation\n  m' = m x L/L' = m x 0.2500\n  position 8191 becomes 2047.8 - back inside the trained range\n\nNTK-aware base scaling, d = 128\n  base 10000 -> 10000 x s^(d/(d-2)) = 40889.9\n\n  pair    omega before      omega after      ratio\n  0       1.000000e+00      1.000000e+00     1.0000\n  16      1.000000e-01      7.032275e-02     0.7032\n  32      1.000000e-02      4.945290e-03     0.4945\n  63      1.154782e-04      2.886955e-05     0.2500" },

    { t: "diagram", kind: "steps", title: "Three ways to stretch RoPE",
      items: [
        { title: "Position Interpolation", text: "Scale every position by L/L' so the largest index lands inside the trained range. Simple and needs a little fine-tuning; it compresses fine-grained high-frequency detail uniformly." },
        { title: "NTK-aware scaling", text: "Raise the RoPE base instead, so high frequencies are barely touched (ratio 1.0000 at pair 0) and low frequencies stretch most (0.2500 at pair 63). Often works with no fine-tuning at all." },
        { title: "YaRN", text: "NTK-by-parts: keep high frequencies, interpolate low, ramp the middle, and scale the attention logits by 1/sqrt(t) to hold softmax sharpness at the longer length. LLaMA-3 went from 8K to 128K this way." }
      ] },

    { t: "callout", kind: "insight", title: "Why NTK-aware often needs no fine-tuning",
      body: [{ t: "p", text: "Position Interpolation squeezes *all* frequencies equally, so the high-frequency pairs — the ones resolving adjacent tokens — lose resolution they were relying on, and the model needs retraining to adapt. NTK-aware scaling exploits the fact that the problem is only with *low* frequencies: those are the ones whose full period the model never saw during training. Leave the fine ruler alone and stretch the coarse one. The measured ratios show it doing exactly that — pair 0 unchanged at 1.0000, pair 63 scaled to 0.2500, a smooth gradient between." }] },

    { t: "h2", n: "10", text: "The whole field on one table", id: "comparison" },

    { t: "table",
      head: ["Scheme", "Abs/Rel", "Applied", "Params", "Extrapolation", "Used by"],
      rows: [
        ["Learned absolute", "Absolute", "Input", "L_max × d", "None — hard cap", "BERT, GPT-2/3, ViT"],
        ["Sinusoidal", "Absolute, relative via rotation", "Input", "0", "Defined, but weak in practice", "Original Transformer"],
        ["Shaw relative", "Relative", "Keys/values in attention", "Small table", "Good", "Transformer-XL"],
        ["T5 bias", "Relative", "Scalar on logits", "Buckets × heads", "Good", "T5, DeBERTa"],
        ["RoPE", "Relative", "Rotates Q and K", "0", "Good; great with PI/NTK/YaRN", "LLaMA, Mistral, Gemma, Qwen"],
        ["ALiBi", "Relative", "Linear logit bias", "0", "Best train-short to test-long", "BLOOM, MPT"]
      ] },

    { t: "exercise", title: "Verify the schemes",
      tasks: [
        "Demonstrate permutation equivariance on your own attention implementation, then add positional encoding and show it breaks.",
        "Implement RoPE and confirm the score for a fixed distance is identical at several absolute positions.",
        "Reproduce the aligned-versus-random decay measurement and explain the difference to someone in two sentences.",
        "Build the ALiBi bias matrix for 8 heads and plot each head's effective attention horizon.",
        "Take a RoPE model, apply Position Interpolation and NTK-aware scaling at 4x, and compare perplexity at the extended length."
      ] }
  ],

  takeaways: [
    "Attention is permutation-equivariant — verified to 1.91e-06 — so without positional information 'dog bites man' and 'man bites dog' are identical inputs.",
    "Two axes: absolute against relative, and added to the input against applied inside attention. RoPE wins on both.",
    "A signal added once at the input dilutes through the stack; a scheme applied to Q and K is reapplied in every layer.",
    "Learned absolute embeddings have no row past max_len, which is why GPT-2 stops at 1024 and GPT-3 at 2048.",
    "RoPE's identity: <R_m q, R_n k> = q^T R_{n-m} k, so absolute rotations produce relative scores. Verified at 2.8038 for distance 3 at positions 0, 10, 100 and 5000.",
    "RoPE is KV-cache friendly because a key's rotation depends only on its own position and never needs revising.",
    "RoPE's long-range decay holds for aligned q,k (70.06 down to 3.75, a fall to 5.36%) but not for independent random pairs, where mean |score| stays flat — it bounds the maximum, not the typical.",
    "ALiBi slopes are 2^(-8h/H): for 8 heads exactly 1/2 down to 1/256, giving each head a different horizon with no learned parameters.",
    "ALiBi's bias is monotonic, so it cannot express strong attention to a distant token — the cost of its excellent extrapolation.",
    "Position Interpolation scales all positions by L/L'; NTK-aware raises the base so high frequencies stay at 1.0000x and low ones scale to 0.2500x, which is why it often needs no fine-tuning."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why is RoPE a relative scheme when it rotates by absolute position?",
      options: ["It subtracts the mean position", "Because a rotation's transpose is its inverse, so the dot product q^T R_m^T R_n k reduces to q^T R_{n-m} k", "It uses relative indices internally", "It is actually absolute"],
      answer: 1,
      why: "Each vector is rotated by its own absolute position, and the shared rotation cancels in the dot product. Measured: the score at distance 3 was 2.803810 at positions (0,3) and 2.804198 at (5000,5003) — identical to six significant figures, the drift being float32 accumulation." },
    { stem: "Does RoPE make distant tokens attend less strongly?",
      options: ["Yes, in all cases", "It lowers the maximum achievable score with distance but not the typical magnitude for independent q and k", "No, distance has no effect", "Only with ALiBi added"],
      answer: 1,
      why: "With aligned q and k the score fell from 70.06 to 3.75 — 5.36% — by distance 2048. With 2000 independent random pairs, mean |score| stayed around 6.0-6.5 at every distance, because rotation is orthogonal and preserves the dot-product distribution. The decay is a bound, not a typical behaviour." },
    { stem: "Why does ALiBi extrapolate better than a learned positional table?",
      options: ["It has more parameters", "It is a distance penalty computed from |i − j|, so it is defined at any length, while a table has no row for unseen positions", "It uses higher precision", "It normalises the scores"],
      answer: 1,
      why: "ALiBi never learns anything about position — the slopes are fixed at 2^(-8h/H) and the bias is a function of distance. A learned table caps hard at max_len, which is why GPT-2 stops at 1024. The cost of ALiBi's approach is that the bias is monotonic, so it cannot express strong long-range attention." },
    { stem: "Why does NTK-aware scaling often work without fine-tuning where Position Interpolation does not?",
      options: ["It changes fewer parameters", "It leaves high frequencies nearly untouched (ratio 1.0000) and stretches only the low ones (0.2500), so fine positional resolution survives", "It uses a larger base for all pairs equally", "It retrains the embeddings"],
      answer: 1,
      why: "Position Interpolation squeezes every frequency by L/L', so the high-frequency pairs resolving adjacent tokens lose resolution and the model must adapt. The problem is really only with low frequencies, whose full period was never seen in training. NTK-aware raises the base so the fine ruler is left alone and the coarse one stretches." }
  ] },

  interview: { title: "Interview", sub: "Positional schemes", questions: [
    { level: "Core", q: "Why is RoPE relative if you rotate by absolute position?",
      strong: "Because the shared rotation cancels in the dot product, leaving a function of n − m.",
      answer: [{ t: "p", text: "Because of one identity. You rotate the query at position m by R_m and the key at position n by R_n, then the attention score is the dot product of those, which is q transpose R_m transpose R_n k. Rotation matrices are orthogonal, so R_m transpose is R minus m, and rotations compose additively, so the whole thing collapses to q transpose R of n minus m times k. The score depends only on the difference. Nothing about the construction is relative — each vector is rotated by its own absolute index — and the relativity emerges from the cancellation. I verified it: same random q and k at distance 3 gave 2.803810 at positions 0 and 3, and 2.804198 at 5000 and 5003, identical to six significant figures with the drift just float32 accumulation in the angle. Two practical consequences follow. It's KV-cache friendly, because a cached key's rotation was determined by its own position and never needs revising as the sequence grows. And because it's applied to Q and K inside every attention layer rather than added once at the input, it doesn't dilute with depth the way an additive encoding does." }] },
    { level: "Senior", q: "How would you take a 4K-context model to 32K?",
      strong: "Rescale the RoPE angles — PI, NTK-aware or YaRN — with light fine-tuning.",
      answer: [{ t: "p", text: "Assuming it's a RoPE model, the family of answers is to rescale the rotation angles so positions beyond the trained range land back in the regime the model understands. Position Interpolation is the simplest: multiply every position by L over L prime, so at 8x, position 32767 becomes about 4095, inside the trained range. It works but needs fine-tuning, because squeezing all frequencies equally costs the high-frequency pairs the fine positional resolution they were relying on to distinguish adjacent tokens. NTK-aware scaling is usually the better first try because it often needs no fine-tuning at all: instead of scaling positions you raise the RoPE base, which leaves high frequencies essentially untouched and stretches the low ones. I computed the ratios at 4x with d equals 128 — pair 0 unchanged at exactly 1.0000, pair 63 scaled to 0.2500, a smooth gradient between. The insight is that the problem was only ever with low frequencies, whose full period the model never observed. YaRN is the production answer and what LLaMA-3 used to go from 8K to 128K: NTK-by-parts, keeping high frequencies, interpolating low, ramping the middle, plus scaling the attention logits by one over root t to hold softmax sharpness constant at the longer length. Whatever I picked I'd measure perplexity across the full extended range, not just at the end, because these methods can degrade mid-range while looking fine at the extremes." }] },
    { level: "Senior", q: "Compare ALiBi and RoPE for a long-context model.",
      strong: "ALiBi extrapolates best out of the box; RoPE is more expressive and extends well with YaRN.",
      answer: [{ t: "p", text: "ALiBi's strength is train-short, test-long: it adds a penalty proportional to distance with a fixed per-head slope of 2 to the minus 8h over H, and since that's a function of distance rather than anything learned, it's defined at any length. Train at 1K and run at 10K and it degrades gracefully. The slope spectrum is elegant too — for 8 heads it's exactly one half down to one over 256, so some heads are forced local and others effectively ignore distance, giving a range of receptive fields for free. The weakness is that the bias is strictly monotonic in distance, so the model structurally cannot express attending strongly to something far away while ignoring something near. For retrieval-style tasks over long context, that's exactly the pattern you need. RoPE is more expressive because it modulates the score by a phase rather than subtracting a penalty, and empirically it's stronger on most long-context benchmarks. Its native range is limited by training, but that's a solved problem now with YaRN. I'd also flag one thing I'd want to state carefully: RoPE is often described as having built-in long-range decay, and when I measured it, the decay showed clearly for aligned query and key — down to 5.36% of the distance-zero score by 2048 — but mean absolute score for independent random pairs didn't decay at all. So it bounds how strongly a token can attend far away rather than making distant attention typically weak. In practice I'd pick RoPE plus YaRN, which is where the field has landed." }] }
  ] }
});
