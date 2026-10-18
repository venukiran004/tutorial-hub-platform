/* ============================================================================
   LESSON 5.8 — A Prompt, Traced End to End
   "The capital of France is" is pushed through gpt2 with every shape and
   distribution captured — and the model does NOT say Paris (§05) —
   scratchpad/nlp/n58.py.
   ========================================================================= */
EC.receiveLesson({
  id: "5.8",

  lede: "**Given \"The capital of France is\", GPT-2's most likely next token is ` the` at 0.0846. ` Paris` is fifth, at 0.0322.** Greedy decoding continues \"the capital of the French Republic\" and never reaches the answer. The same model family got this right in lesson 5.1 — BERT filled the mask with *paris* at 0.417 — and the difference is instructive. This lesson traces one prompt through every stage of a real model, with the actual tensors, and uses that trace to show what each decoding strategy does to one concrete distribution.",

  objectives: [
    "Follow a prompt through tokenisation, embedding, the stack, logits and sampling",
    "Read the shape at every stage and say why it is that shape",
    "Watch the residual stream grow and see what the final LayerNorm does to it",
    "Compare temperature, top-k, top-p and beam search on the same distribution",
    "Explain why a causal model can fail a question a masked model answers"
  ],

  prerequisites: ["5.7", "5.5"],

  blocks: [

    { t: "h2", n: "01", text: "Tokenisation", id: "tokenise" },

    {"kind": "trace", "title": "Twenty-four characters, five tokens, no special tokens at all", "caption": "**GPT-2 is a causal LM, so there is no `[CLS]` or `[SEP]` to mark** — which is why the shape is (1, 5) rather than (1, 7), and why slicing `[1:-1]` off a GPT-2 sequence removes real words. The `Ġ` is byte-level BPE's printable stand-in for a leading space, from 4.8 — **so `Ġcapital` is a different token from `capital`, and the space is carried by the word that follows it.**", "left": "property", "codeW": 160, "vars": ["value"], "steps": [{"code": "text", "state": ["'The capital of France is' - 24 chars"], "tone": "accent"}, {"code": "input_ids", "state": ["[464, 3139, 286, 4881, 318]"], "changed": [0], "tone": "good"}, {"code": "tokens", "state": ["['The', 'Ġcapital', 'Ġof', 'ĠFrance', 'Ġis']"], "changed": [0], "tone": "good"}, {"code": "shape / special tokens", "state": ["(1, 5) / none"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-5_8-01-0"},





    { t: "out", text:
"'The capital of France is'   (24 characters)\n\n  input_ids   [464, 3139, 286, 4881, 318]\n  tokens      ['The', 'Ġcapital', 'Ġof', 'ĠFrance', 'Ġis']\n  shape       (1, 5)\n  vocabulary  50,257" },

    { t: "p", text: "Five words, five tokens, no special tokens added — GPT-2 is a causal LM with no `[CLS]` or `[SEP]` to mark. The `Ġ` is byte-level BPE's printable stand-in for a leading space, from lesson 4.8." },

    { t: "h2", n: "02", text: "Embedding", id: "embed" },

    {"kind": "trace", "title": "The positional signal is twice the token signal at the input", "caption": "**Token embeddings come in at RMS 0.1077 and position embeddings at 0.2176 — so in a trained GPT-2 the positional contribution is about 2× the token contribution, summing to 0.2418.** Which is the measured answer to the question 4.2 §06 raised from the other side: **the original paper scaled embeddings up by `sqrt(d_model)` to stop position dominating, and here, after training, position dominates anyway** — because learned tables find their own scale and this one chose a larger one.", "left": "tensor", "codeW": 170, "vars": ["shape", "RMS"], "steps": [{"code": "token embeddings", "state": ["(5, 768)", "0.1077"], "tone": "good"}, {"code": "position embeddings", "state": ["(5, 768)", "0.2176"], "changed": [0, 1], "tone": "violet", "note": "2x the tokens"}, {"code": "summed", "state": ["(5, 768)", "0.2418"], "changed": [1], "tone": "accent"}], "t": "diagram", "id": "dg-5_8-02-1"},





    { t: "out", text:
"token embedding table      (50257, 768)\nposition embedding table    (1024, 768)\n\n  token embeddings   (5, 768)   RMS 0.1077\n  position embeds    (5, 768)   RMS 0.2176\n  summed             (5, 768)   RMS 0.2418" },

    { t: "callout", kind: "insight", title: "Here the positional signal is twice the token signal",
      body: [{ t: "p", text: "For these five tokens at these five positions, the positional embedding's RMS is **0.2176** against the token embedding's **0.1077** — position is the *louder* input. That is the situation lesson 4.2's `sqrt(d_model)` scaling was supposedly invented to prevent, and GPT-2 applies no scaling at all. Two caveats keep this honest: this is five specific tokens at the first five positions, not a whole-table average, and early positions carry unusually large learned embeddings. But it makes the point that the tidy story about embedding magnitudes does not describe real models — GPT-2 leans on the LayerNorm at the start of block 1 to fix the scale, and clearly does not need position to be quiet." }] },

    { t: "h2", n: "03", text: "Through the stack", id: "stack" },

    {"kind": "trace", "title": "The residual stream grows 200-fold and then the final norm pulls it back", "caption": "**RMS goes 0.2418 at the embedding output to 50.9625 at layer 11 — a 211× growth — and then the final LayerNorm brings it to 6.8346.** 4.7 measured 1.29× on an *untrained* stack; this is what training does to the same mechanism. And the attention check confirms the architecture across the whole model: **upper-triangle maximum 0.00e+00 over all 144 head-layer combinations.** The sink is here too: **the final token puts 61% of its layer-0 attention on the first token.**", "left": "layer", "codeW": 130, "vars": ["shape", "RMS"], "steps": [{"code": "0 (embedding output)", "state": ["(1, 5, 768)", "0.2418"], "tone": "good"}, {"code": "1", "state": ["(1, 5, 768)", "2.8246"], "changed": [1], "tone": "good"}, {"code": "4", "state": ["(1, 5, 768)", "44.4031"], "changed": [1], "tone": "warn"}, {"code": "11", "state": ["(1, 5, 768)", "50.9625"], "changed": [1], "tone": "crit", "note": "211x the input"}, {"code": "12 (final LayerNorm)", "state": ["(1, 5, 768)", "6.8346"], "changed": [1], "tone": "violet"}], "t": "diagram", "id": "dg-5_8-03-2"},





    { t: "out", text:
"12 layers, 12 heads, d_model 768, d_ff 3072\nhidden_states: 13 tensors (embedding output plus 12 layers)\n\n  layer    shape            RMS\n  0        (1, 5, 768)       0.2418\n  1        (1, 5, 768)       2.8246\n  4        (1, 5, 768)      44.4031\n  8        (1, 5, 768)      49.8286\n  11       (1, 5, 768)      50.9625\n  12       (1, 5, 768)       6.8346" },

    { t: "callout", kind: "crit", title: "The stream grows 211x, then the final LayerNorm cuts it to a seventh",
      body: [{ t: "p", text: "RMS goes from 0.2418 at the embedding to **50.9625** by layer 11 — a 211x growth, because the Pre-LN residual path is never rescaled, exactly as lesson 4.7 predicted but far more dramatically than 12 untrained blocks showed. Most of it happens early: layer 1 alone multiplies it by 11.7. Then entry 12, which is the output *after* `ln_f`, drops to **6.8346**. That final normalisation is not a formality — it is taking a stream that has accumulated across twelve layers and putting it back on a scale the output projection can use. Omitting it, as lesson 4.7 warned, feeds a vector 7x too large into the vocabulary projection." }] },

    { t: "out", text:
"attention: 12 tensors, each (1, 12, 5, 5)\n           (batch, heads, query positions, key positions)\n\nlayer 0 head 0, last row — what the final token attends to:\n  [0.6099, 0.1519, 0.0626, 0.0945, 0.0812]\n\nupper-triangle maximum across all layers and heads: 0.00e+00" },

    { t: "p", text: "The attention matrix is square in sequence length, and every future weight across all 144 head-layer combinations is **exactly zero** — the causal mask from lesson 4.5 doing its job. The final token puts 61% of its layer-0 attention on the first token, which is the attention-sink behaviour lesson 4.4 found in BERT appearing here too." },

    { t: "h2", n: "04", text: "Logits", id: "logits" },

    {"kind": "trace", "title": "All the logits are large and negative, and it does not matter", "caption": "**The raw logit range is [−129.868, −100.250] — every value negative, and softmax is shift-invariant, so only their differences matter.** Which is worth knowing before debugging a model by printing logits: **their absolute level is meaningless.** And the shape is (1, 5, 50257): **one distribution per position from a single pass, of which generation uses only the last, because it is the only position that has attended to the whole prompt.**", "left": "property", "codeW": 170, "vars": ["value", "note"], "steps": [{"code": "logits shape", "state": ["(1, 5, 50257)", "one per position"], "tone": "good"}, {"code": "used for generation", "state": ["(50257,)", "the last position only"], "changed": [0, 1], "tone": "violet"}, {"code": "raw logit range", "state": ["[-129.868, -100.250]", "all negative"], "changed": [0, 1], "tone": "warn"}, {"code": "why that is fine", "state": ["softmax is shift-invariant", "only differences matter"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-5_8-04-3"},





    { t: "out", text:
"logits (1, 5, 50257)   — one distribution per position\nfor generation we use only the last: (50257,)\n\nraw logit range [-129.868, -100.250]" },

    { t: "p", text: "One distribution per position, all from a single forward pass — during training every one is scored, and during generation only the last is used, because it is the only position that has attended to the whole prompt. Note the logits are all large and negative; softmax is shift-invariant, so only their differences matter." },

    { t: "h2", n: "05", text: "What the model actually predicts", id: "predicts" },

    {"kind": "trace", "title": "Paris is fifth, at 0.0322, behind “the” at 0.0846", "caption": "**The model's top candidate is `' the'` and `' Paris'` is fifth — and entropy is 5.9985 nats against a maximum of 10.8249, so the distribution is genuinely uncertain rather than wrong.** `'The capital of France is the capital of...'` is a perfectly good continuation. Greedy decoding then shows the consequence: **it takes `' the'`, and from there `' capital'` at 0.1697 and `' of'` at 0.9271** — **each step is locally confident and the path never reaches Paris.**", "left": "step / candidate", "codeW": 170, "vars": ["token", "p"], "steps": [{"code": "top candidate", "state": ["' the'", "0.0846"], "tone": "warn"}, {"code": "5th candidate", "state": ["' Paris'", "0.0322"], "changed": [0, 1], "tone": "crit"}, {"code": "greedy step 1", "state": ["' capital'", "0.1697"], "changed": [0, 1], "tone": "warn"}, {"code": "greedy step 2", "state": ["' of'", "0.9271"], "changed": [0, 1], "tone": "crit", "note": "locally certain"}, {"code": "entropy", "state": ["5.9985 nats", "max 10.8249"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-5_8-05-4"},





    { t: "out", text:
"top 10 next-token candidates after 'The capital of France is'\n\n  ' the'       0.0846\n  ' now'       0.0479\n  ' a'         0.0462\n  ' France'    0.0324\n  ' Paris'     0.0322\n  ' in'        0.0266\n  ' also'      0.0264\n  ' not'       0.0238\n  ' home'      0.0233\n  ' still'     0.0155\n\nentropy 5.9985 nats (maximum ln(50257) = 10.8249)" },

    { t: "callout", kind: "crit", title: "The right answer is fifth, at 3.2%",
      body: [{ t: "p", text: "GPT-2 is not confident and does not prefer *Paris*. Entropy is **5.9985** of a possible 10.8249 — better than uniform, but genuinely uncertain, and the top ten candidates span only 36% of the mass. Compare lesson 5.1, where BERT filled `The capital of France is [MASK].` with *paris* at **0.417**. The difference is not knowledge, it is the **constraint**. BERT sees a full stop after the mask, so exactly one token must complete a sentence — and only a city fits. GPT-2 sees an open continuation and every grammatical continuation competes: *is the capital of…*, *is now…*, *is a…* are all fluent English. The model is not failing to know the answer; it is being asked a different question." }] },

    { t: "out", text:
"greedy decoding, step by step\n\nstep   context                          chosen        p\n0      'The capital of France is'       ' the'        0.0846\n1      'The capital of France is the'   ' capital'    0.1697\n2      '...of France is the capital'    ' of'         0.9271\n3      '...France is the capital of'    ' the'        0.2828\n4      '...is the capital of the'       ' French'     0.1367\n5      '...the capital of the French'   ' Republic'   0.3006\n\nresult: 'The capital of France is the capital of the French Republic'" },

    { t: "callout", kind: "insight", title: "One weak first choice determines everything after it",
      body: [{ t: "p", text: "The first token was chosen at 0.0846 — barely preferred over four alternatives within a percentage point. Everything downstream conditions on it, and by step 2 the model is at 0.9271 confidence, locked into a phrasing that cannot reach *Paris*. This is **exposure bias** from lesson 4.5 in its purest form: a near-arbitrary early decision becomes unquestionable context. It is also the argument for beam search, which keeps several first tokens alive — though here even beam 4 produced *'the capital of France, and the capital of France is the'*, because the whole region of the distribution is weak." }] },

    { t: "h2", n: "06", text: "Decoding strategies on this one distribution", id: "decoding" },

    {"kind": "trace", "title": "Top-p at 0.9 keeps 1,503 tokens; top-k at 50 covers 55% of the mass", "caption": "The two truncations are not comparable settings. **`k=50` keeps 50 tokens covering 0.5495 of the mass; `p=0.90` keeps 1,503 tokens** — because this distribution has a long tail and a fixed `k` cannot know that. Which is the argument for nucleus sampling: **it adapts its size to the shape.** Temperature is orthogonal and does not change the ranking: **at `T=0.1` the top token holds 0.994 and sampling is effectively greedy; at `T=2.0` entropy is 9.4254 against a uniform maximum of 10.8249.**", "left": "setting", "codeW": 140, "vars": ["tokens kept", "mass covered", "entropy"], "steps": [{"code": "T=0.1", "state": ["all", "-", "0.0409"], "tone": "crit", "note": "effectively greedy"}, {"code": "T=2.0", "state": ["all", "-", "9.4254"], "changed": [2], "tone": "crit", "note": "near-uniform"}, {"code": "k=50", "state": ["50", "0.5495", "-"], "changed": [0, 1, 2], "tone": "good"}, {"code": "p=0.90", "state": ["1503", "0.90", "-"], "changed": [0, 1], "tone": "violet", "note": "30x more tokens"}, {"code": "p=0.99", "state": ["9144", "0.99", "-"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-5_8-06-5"},





    { t: "out", text:
"--- temperature ---\nT=0.1   entropy 0.0409   ' the' 0.994, ' now' 0.003, ' a' 0.002\nT=0.5   entropy 2.2773   ' the' 0.397, ' now' 0.128, ' a' 0.118\nT=1.0   entropy 5.9985   ' the' 0.085, ' now' 0.048, ' a' 0.046\nT=1.5   entropy 8.4797   ' the' 0.016, ' now' 0.011, ' a' 0.011\nT=2.0   entropy 9.4254   ' the' 0.005, ' now' 0.004, ' a' 0.004" },

    { t: "p", text: "Temperature divides the logits before the softmax. At `T = 0.1` the distribution is effectively one-hot at 0.994 — sampling becomes greedy. At `T = 2.0` entropy is 9.4254, approaching the uniform maximum of 10.8249, and the top token holds half a percent. Temperature does not change the *ranking*, only how sharply the ranking is expressed." },

    { t: "out", text:
"--- top-k ---\nk=1      keeps    1 token,  covering 0.0846 of the mass\nk=5      keeps    5 tokens, covering 0.2433\nk=10     keeps   10 tokens, covering 0.3590\nk=50     keeps   50 tokens, covering 0.5495\nk=500    keeps  500 tokens, covering 0.7997\n\n--- top-p (nucleus) ---\np=0.50   keeps   32 tokens\np=0.80   keeps  502 tokens\np=0.90   keeps 1503 tokens\np=0.95   keeps 3119 tokens\np=0.99   keeps 9144 tokens" },

    { t: "callout", kind: "insight", title: "On this flat distribution, top-k 50 is far more aggressive than top-p 0.9",
      body: [{ t: "p", text: "`k=50` keeps 50 tokens covering **55%** of the probability mass. `p=0.9` needs **1503** tokens to reach 90% — thirty times as many. That gap is the whole argument for nucleus sampling: `k` is a fixed count applied regardless of shape, so on a peaked distribution 50 tokens is absurdly permissive and on a flat one like this it is severely restrictive. Top-p asks for a fixed amount of *probability* and lets the count follow, so it truncates hard when the model is confident and stays open when it is not. On a distribution where the model genuinely does not know the answer, that is the behaviour you want." }] },

    { t: "out", text:
"the same prompt, four strategies, 12 new tokens\n\n  greedy            ' the capital of the French Republic, and the capital of the'\n  T=0.7 top-p 0.9   ' a place that has never had much of a French culture,'\n  T=1.5 top-k 50    \" a place that's pretty close...<|endoftext|>\"\n  beam 4            ' the capital of France, and the capital of France is the'" },

    { t: "callout", kind: "trap", title: "Greedy and beam both loop",
      body: [{ t: "p", text: "Greedy produces *the capital of… the capital of*, and beam 4 produces *the capital of France, and the capital of France is*. Both repeat, and beam repeats *more* — because beam search optimises total sequence log-probability, and as lesson 3.4 measured with perplexity, **repetition is high-probability**. The sampled outputs do not loop. This is the standard finding that likelihood-maximising decoding is a poor objective for open-ended generation, and it is why chat models sample rather than beam-search despite beam being \"better\" by log-probability." }] },

    { t: "h2", n: "07", text: "Detokenisation and the full shape table", id: "shapes" },

    {"kind": "trace", "title": "Four strategies, four different texts, one prompt", "caption": "**Greedy and beam-4 both loop — `'the capital of France, and the capital of France is the'` — which is 3.4's finding that perplexity rewards repetition, arriving as output.** Sampling escapes the loop and pays for it: **`T=0.7, p=0.9` invents a claim about French culture, and `T=1.5, k=50` runs into `<|endoftext|>` mid-sentence.** The decoded ids are the same eleven integers the whole lesson has been tracking, **so the only thing that differed between these four outputs was how one distribution was sampled.**", "left": "strategy", "codeW": 160, "vars": ["output", "failure mode"], "steps": [{"code": "greedy", "state": ["'...the capital of the French Republic...'", "repetition"], "tone": "warn"}, {"code": "beam 4", "state": ["'...and the capital of France is the'", "repetition, worse"], "changed": [0, 1], "tone": "crit"}, {"code": "T=0.7, top-p 0.9", "state": ["'...never had much of a French culture'", "invention"], "changed": [0, 1], "tone": "warn"}, {"code": "T=1.5, top-k 50", "state": ["'...pretty close...<|endoftext|>'", "early stop"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-5_8-07-6"},





    { t: "out", text:
"final ids  [464, 3139, 286, 4881, 318, 262, 3139, 286, 262, 4141, 2066]\ndecoded    'The capital of France is the capital of the French Republic'" },

    { t: "table",
      head: ["Stage", "Shape", "Why"],
      rows: [
        ["input text", "'The capital of France is'", "24 characters"],
        ["input_ids", "(1, 5)", "Byte-level BPE, no special tokens"],
        ["token embeddings", "(1, 5, 768)", "Lookup in a (50257, 768) table"],
        ["+ positional", "(1, 5, 768)", "Added, not concatenated"],
        ["Q, K, V per block", "(1, 12, 5, 64)", "12 heads × 64 dims = 768"],
        ["attention scores", "(1, 12, 5, 5)", "Square in sequence length, causally masked"],
        ["attention output", "(1, 5, 768)", "Heads concatenated and projected"],
        ["after 12 blocks", "(1, 5, 768)", "Shape preserved — that is what lets it stack"],
        ["final LayerNorm", "(1, 5, 768)", "RMS 50.96 → 6.83"],
        ["logits", "(1, 5, 50257)", "Tied to the embedding matrix"],
        ["last position only", "(50257,)", "The only position that saw the whole prompt"],
        ["sampled token", "(1,)", "Appended, and the loop repeats"]
      ] },

    { t: "code", lang: "python", title: "The three lines this whole lesson traced",
      code: 'from transformers import AutoTokenizer, AutoModelForCausalLM\n\ntok = AutoTokenizer.from_pretrained("gpt2")\nmodel = AutoModelForCausalLM.from_pretrained("gpt2")\n\nout = model(**tok("The capital of France is", return_tensors="pt"),\n            output_hidden_states=True, output_attentions=True)\n\nout.logits.shape          # (1, 5, 50257)\nlen(out.hidden_states)    # 13 - the embedding output plus 12 layers\nlen(out.attentions)       # 12, each (1, 12, 5, 5)',
      caption: "`AutoModelForCausalLM` adds the LM head; `AutoModel` would return only `last_hidden_state`." },
    { t: "p", text: "The two `output_*` flags are what made §03 possible, and they are off by default for a reason: **`output_hidden_states=True` returns 13 tensors and `output_attentions=True` returns 12 more, so a long sequence materialises every attention matrix at once** — which is exactly the `O(n²)` memory FlashAttention exists to avoid. Useful for inspection, and not something to leave on in a serving path." },
    { t: "exercise", title: "Trace your own prompt",
      tasks: [
        "Push a prompt through a model with `output_hidden_states=True` and plot residual-stream RMS against layer depth.",
        "Find the layer where RMS grows fastest, and check what the final LayerNorm reduces it to.",
        "Print the top-10 next tokens for a factual prompt and check whether the model actually prefers the right answer.",
        "For the same distribution, compute how many tokens top-k 50 and top-p 0.9 each keep. Repeat on a prompt the model is confident about.",
        "Generate with greedy, beam and nucleus sampling and count repeated n-grams in each."
      ] }
  ],

  takeaways: [
    "'The capital of France is' tokenises to 5 tokens with no special tokens added.",
    "For these tokens the positional embedding RMS (0.2176) was twice the token embedding RMS (0.1077) — GPT-2 applies no sqrt(d_model) scaling and does not need position to be quiet.",
    "The residual stream grew from RMS 0.2418 to 50.9625 across 12 layers — 211x — because Pre-LN never rescales it.",
    "The final LayerNorm cut it from 50.9625 to 6.8346; omitting it would feed a 7x oversized vector to the output projection.",
    "Future attention weights were exactly 0.00e+00 across all 144 head-layer combinations.",
    "GPT-2's top token is ' the' at 0.0846 and ' Paris' is fifth at 0.0322, with entropy 5.9985 of a possible 10.8249.",
    "BERT answered the same question at 0.417 because a following full stop constrains the answer to one token; GPT-2's open continuation lets every fluent phrasing compete.",
    "A first token chosen at 0.0846 locked greedy decoding into a phrasing that reached 0.9271 confidence two steps later and could never produce Paris.",
    "On this flat distribution top-k 50 kept 55% of the mass while top-p 0.9 needed 1503 tokens — k is a fixed count, p adapts to shape.",
    "Greedy and beam both looped; beam repeated more, because likelihood-maximising decoding rewards repetition."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did BERT answer 'paris' at 0.417 where GPT-2 gave it 0.0322 and ranked it fifth?",
      options: ["BERT is a larger model", "BERT's mask is followed by a full stop, constraining the answer to one sentence-completing token, while GPT-2's open continuation lets every fluent phrasing compete", "GPT-2 lacks the knowledge", "Different tokenisers"],
      answer: 1,
      why: "It is a difference in the question, not in knowledge. 'The capital of France is [MASK].' admits only a city. 'The capital of France is' admits 'the capital of...', 'now...', 'a...' — all fluent English, all competing. GPT-2's entropy was 5.9985 of a possible 10.8249: genuinely uncertain about how to continue, not about the fact." },
    { stem: "The residual stream reached RMS 50.9625 by layer 11 and the model output was 6.8346. What happened?",
      options: ["The last layer shrinks activations", "The final LayerNorm rescaled the accumulated stream before the output projection", "Numerical overflow", "Dropout was applied"],
      answer: 1,
      why: "Pre-LN never normalises the residual path, so magnitude accumulates across all twelve layers — 211x growth from the embedding. `ln_f` after the stack brings it back to a usable scale. Omitting that final norm, which lesson 4.7 flagged as an easy mistake, feeds a vector seven times too large into the vocabulary projection." },
    { stem: "On this distribution, top-k 50 kept 55% of the mass while top-p 0.9 kept 1503 tokens. What does that show?",
      options: ["Top-p is always more permissive", "k is a fixed count applied regardless of distribution shape, while p fixes the probability mass and lets the count adapt", "The model was miscalibrated", "Top-k is broken on large vocabularies"],
      answer: 1,
      why: "On a flat distribution 50 tokens is severely restrictive; on a peaked one the same k would be absurdly permissive. Top-p truncates hard when the model is confident and stays open when it is not, which is why it is the better default — especially on exactly the distributions where the model genuinely does not know." },
    { stem: "Why did beam search repeat more than sampling?",
      options: ["A bug in the implementation", "Beam maximises total sequence log-probability, and repetition is high-probability", "The beam width was too small", "Beam search ignores the prompt"],
      answer: 1,
      why: "Beam 4 produced 'the capital of France, and the capital of France is'. Lesson 3.4 measured the underlying fact directly: repeated tokens score the best perplexity of any text tested. Likelihood-maximising decoding therefore drifts toward loops, which is why chat models sample instead of beam-searching despite beam being better by log-probability." }
  ] },

  interview: { title: "Interview", sub: "End to end", questions: [
    { level: "Core", q: "Walk me through what happens when you send a prompt to an LLM.",
      strong: "Tokenise, embed with position, N blocks, final norm, logits, sample the last position, append, repeat.",
      answer: [{ t: "p", text: "The text is tokenised into subword ids — 'The capital of France is' becomes five tokens for GPT-2, with no special tokens since it's a causal model. Each id looks up a vector in the embedding table, positional embeddings are added, and that's the input to the stack. Then twelve identical blocks, each doing masked multi-head self-attention followed by a feed-forward network, with residual connections and pre-norm LayerNorms. The shape never changes — batch by sequence by d_model throughout — which is what lets the block repeat. After the last block a final LayerNorm, then a projection to vocabulary size giving logits at every position. For generation you take only the last position, because it's the only one that has attended to the whole prompt. Softmax it, apply your decoding strategy, sample a token, append it, and run the whole thing again. One number I find clarifying: I traced the residual stream's RMS through GPT-2 and it went from 0.2418 at the embedding to 50.96 by layer 11 — a 211x growth, since Pre-LN never rescales the residual path — and then the final LayerNorm brought it to 6.83. That final norm is doing real work, not bookkeeping." }] },
    { level: "Core", q: "Explain temperature, top-k and top-p.",
      strong: "Temperature reshapes the distribution; top-k and top-p truncate it, by count and by mass respectively.",
      answer: [{ t: "p", text: "Temperature divides the logits before the softmax, so below 1 sharpens toward the argmax and above 1 flattens toward uniform. On a real distribution I traced, temperature 0.1 put 0.994 on the top token — effectively greedy — and temperature 2.0 dropped it to 0.005 with entropy near the uniform maximum. It changes how sharply the ranking is expressed, never the ranking itself. Top-k and top-p both truncate, and the difference between them is the whole point. Top-k keeps a fixed number of tokens regardless of shape. Top-p keeps the smallest set whose cumulative probability reaches p, so the count adapts. On the distribution I measured — a genuinely uncertain one — k equals 50 kept just 55% of the mass while p equals 0.9 needed 1503 tokens to reach 90%. Thirty times as many. On a peaked distribution the comparison inverts and k equals 50 would be absurdly permissive. That's why top-p is the better default: it truncates hard when the model is confident and stays open when it isn't. In practice you compose them — a temperature around 0.7 with top-p 0.9 is a common setting — and they're applied in that order, reshape then truncate." }] },
    { level: "Senior", q: "A model gives a wrong answer to a factual question. How do you diagnose it?",
      strong: "Look at the distribution, not the output — the answer may be present but outranked.",
      answer: [{ t: "p", text: "I'd look at the probability distribution rather than the generated string, because those tell you different things. I have a good example: GPT-2 asked to continue 'The capital of France is' generates 'the capital of the French Republic' and never says Paris. That looks like a knowledge failure. But inspecting the distribution, ' Paris' is there at 0.0322, fifth — the model has the fact, it just prefers fluent continuations like ' the', ' now' and ' a', each within a percentage point of each other. Entropy was 5.9985 of a possible 10.8249, so it's uncertain about phrasing, not about France. And the same knowledge scored 0.417 when BERT was asked with a trailing full stop, which constrains the answer to a single sentence-completing token. So the diagnosis has three branches. If the right answer is absent from the top of the distribution, it's a knowledge or retrieval problem and the fix is context, retrieval or fine-tuning. If it's present but outranked, it's a prompting or decoding problem — constrain the format, use few-shot examples, or restrict the output space. If it's ranked first but not generated, it's a decoding problem, and I'd check whether an early weak choice locked in a bad continuation, which is what happened here: a first token chosen at 0.0846 became unquestionable context, and two steps later the model was at 0.9271 confidence in a phrasing that could never reach the answer." }] }
  ] }
});
