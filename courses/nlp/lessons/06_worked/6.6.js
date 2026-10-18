/* ============================================================================
   LESSON 6.6 — The Decoder, Cross-Attention and the Loss
   ========================================================================= */
EC.receiveLesson({
  id: "6.6",

  lede: "**The untrained toy model scores a cross-entropy loss of 2.5320. Guessing uniformly over its five-word vocabulary would score 1.6094.** It is 0.92 nats *worse than chance* — perplexity 12.58 against a vocabulary of 5. Random weights are not neutral; they are confidently arbitrary, and cross-entropy punishes confident wrongness far harder than it punishes uncertainty. This lesson traces the decoder, shows cross-attention as the alignment matrix it is, and computes the loss that training would minimise.",

  objectives: [
    "Explain teacher forcing and the shifted-right decoder input",
    "Verify that decoder self-attention is masked and cross-attention is not",
    "Read cross-attention as a target-by-source alignment matrix",
    "Compute cross-entropy loss and compare it against a uniform baseline",
    "Recognise the signature of an untrained model in both the attention and the loss"
  ],

  prerequisites: ["6.5", "4.5"],

  blocks: [

    { t: "h2", n: "01", text: "Teacher forcing", id: "teacher" },

    {"kind": "trace", "title": "The input is the target shifted right, which is how three predictions train in parallel", "caption": "**The decoder input is `[<bos>, ich, liebe]` and the target is `[ich, liebe, KI]` — the same sequence offset by one.** So position 0 is given `<bos>` and must predict `ich`, position 1 is given `<bos> ich` and must predict `liebe`, and position 2 is given both and must predict `KI`. **All three are scored in one forward pass, which is only legitimate because the causal mask stops position 0 seeing `ich` in its own input.**", "left": "position", "codeW": 150, "vars": ["given", "must predict"], "steps": [{"code": "0", "state": ["<bos>", "ich"], "tone": "good"}, {"code": "1", "state": ["<bos> ich", "liebe"], "changed": [0, 1], "tone": "good"}, {"code": "2", "state": ["<bos> ich liebe", "KI"], "changed": [0, 1], "tone": "good"}, {"code": "all three", "state": ["one forward pass", "the mask makes it legal"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-6_6-01-0"},

    { t: "out", text:
"target sentence:  ich liebe KI\n\n  decoder input  (shifted right)   [<bos>,  ich,   liebe]\n  decoder target (what to predict) [ich,   liebe, KI   ]\n\n  position 0: given <bos>              -> predict ich\n  position 1: given <bos> ich          -> predict liebe\n  position 2: given <bos> ich liebe    -> predict KI" },

    { t: "callout", kind: "insight", title: "The shift is what makes all three predictions computable at once",
      body: [{ t: "p", text: "Feed the *gold* prefix rather than the model's own output, shifted one position right, and every position's prediction task is well posed simultaneously. Combined with the causal mask, all three are computed in **one forward pass** — which is the 74.2x training-versus-generation gap lesson 4.5 measured. The cost is exposure bias: at training time position 2 always sees the correct `ich liebe`, and at inference it sees whatever the model actually produced. Lesson 4.5 showed GPT-2 assigning just 0.0836 to a gold token it would never have chosen, being scored on a prefix it disagreed with." }] },

    { t: "h2", n: "02", text: "Masked self-attention", id: "masked" },

    {"kind": "trace", "title": "Exactly zero above the diagonal, and row 0 is forced to 1.000", "caption": "**Upper-triangle maximum 0.00e+00**, as required — 4.5's `-inf` fill reproduced in a 3×3 matrix. And `<bos>`'s weight of 1.000 is **forced rather than chosen**, the same structural artefact 6.2 flagged: one visible position means a softmax of 1.0 whatever the score. The sublayer's job is narrow and worth naming: **it answers *“what have I written so far?”* and nothing else — it has no access to the English at all.**", "left": "query", "codeW": 130, "vars": ["-> <bos>", "-> ich", "-> liebe"], "steps": [{"code": "<bos>", "state": ["1.000", "0.000", "0.000"], "tone": "violet", "note": "forced"}, {"code": "ich", "state": ["0.368", "0.632", "0.000"], "changed": [0, 1], "tone": "good"}, {"code": "liebe", "state": ["0.257", "0.334", "0.409"], "changed": [0, 1, 2], "tone": "good"}, {"code": "sees the source?", "state": ["no", "no", "no"], "changed": [0, 1, 2], "tone": "accent"}], "t": "diagram", "id": "dg-6_6-02-1"},

    { t: "out", text:
"decoder self-attention weights\n\n             <bos>   ich     liebe\n  <bos>    [1.000   0.000   0.000]\n  ich      [0.368   0.632   0.000]\n  liebe    [0.257   0.334   0.409]\n\n  upper-triangle maximum: 0.00e+00" },

    { t: "p", text: "Exactly zero above the diagonal, as required — and `<bos>`'s weight of 1.000 is forced rather than chosen, the same structural artefact lesson 6.2 flagged. This sublayer answers *\"what have I written so far?\"* and nothing else; it has no access to the English at all." },

    { t: "h2", n: "03", text: "Cross-attention", id: "cross" },

    {"kind": "trace", "title": "Queries from the target, keys and values from the source — and no triangle", "caption": "**The shape is (3, 3) but it is target-by-source, not target-by-target — so there is nothing to mask: a German word may legitimately read any English word, including ones later in the sentence.** Rows sum to 1.0 over the **source**, which is 4.7's cross-attention measurement in miniature. This is the sublayer that answers *“what does the English say?”*, and it is the only place the two languages meet.", "left": "target query", "codeW": 130, "vars": ["-> I", "-> love", "-> AI", "row sum"], "steps": [{"code": "<bos>", "state": ["0.347", "0.300", "0.353", "1.0"], "tone": "good"}, {"code": "ich", "state": ["0.313", "0.391", "0.296", "1.0"], "changed": [0, 1, 2], "tone": "good"}, {"code": "liebe", "state": ["0.328", "0.360", "0.312", "1.0"], "changed": [0, 1, 2], "tone": "good"}, {"code": "masked?", "state": ["no - target x source", "-", "-", "-"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-6_6-03-2"},

    { t: "out", text:
"cross-attention weights — queries from the decoder, keys and values\nfrom the encoder memory\n\n             I        love     AI\n  <bos>    [0.347    0.300    0.353]\n  ich      [0.313    0.391    0.296]\n  liebe    [0.328    0.360    0.312]\n\n  shape (3, 3) — target by source\n  rows sum to [1.0, 1.0, 1.0]" },

    { t: "callout", kind: "insight", title: "Rectangular, unmasked, and it is the alignment matrix",
      body: [{ t: "p", text: "Three structural facts. It is **target length by source length**, so it would be (5, 3) for a five-word German translation of a three-word English sentence — self-attention is always square, cross-attention is not. It is **unmasked**, because the whole source already exists. And each row sums to 1 over the *source* positions, meaning every output token distributes its full attention across the English words. That makes it an **alignment matrix**: read row `liebe` and you see which English words the model consulted to produce it. It is the single most useful debugging artefact an encoder-decoder model provides, and lesson 6.5 noted it is what you inspect when content goes missing." }] },

    { t: "h2", n: "04", text: "What an untrained alignment looks like", id: "untrained" },

    {"kind": "trace", "title": "Maximum deviation from uniform: 0.0577", "caption": "This is what an untrained alignment looks like, quantified. **Uniform would be 0.333 in every cell and the largest deviation anywhere is 0.0577** — so the cross-attention matrix carries essentially no alignment information. The diagonal is **barely** favoured: **0.3500 mean on the diagonal against 0.3250 off it, a gap of 0.025.** Which is the honest reading of any attention map from an untrained model: **the structure people point to in trained alignment plots has to be learned, and here it is not there yet.**", "left": "measurement", "codeW": 190, "vars": ["value"], "steps": [{"code": "uniform would be", "state": ["0.333 in every cell"], "tone": "accent"}, {"code": "max deviation", "state": ["0.0577"], "changed": [0], "tone": "crit"}, {"code": "diagonal mean", "state": ["0.3500"], "changed": [0], "tone": "warn"}, {"code": "off-diagonal mean", "state": ["0.3250"], "changed": [0], "tone": "warn", "note": "a gap of 0.025"}], "t": "diagram", "id": "dg-6_6-04-3"},

    { t: "out", text:
"how far is this from uniform?\n\n  uniform would be 0.333 in every cell\n  maximum deviation from uniform: 0.0577\n\n  diagonal mean      0.3500\n  off-diagonal mean  0.3250" },

    { t: "callout", kind: "crit", title: "There is no alignment here at all",
      body: [{ t: "p", text: "A **trained** translation model would show a strong diagonal — *I* to *ich*, *love* to *liebe*, *AI* to *KI* — often with near-one weights for a language pair this word-aligned. This matrix deviates from uniform by at most **0.0577**, and its diagonal mean of 0.3500 against an off-diagonal 0.3250 is noise. The model is attending essentially equally to every English word for every German word, which means it has learned nothing about correspondence. That is precisely what you should expect from hand-picked weights, and it is worth seeing: **the alignment matrix is where training becomes visible.** If you were debugging a real model and saw this, you would know immediately that cross-attention was not learning." }] },

    { t: "h2", n: "05", text: "The loss", id: "loss" },

    {"kind": "trace", "title": "The model predicts “liebe” at all three positions, and the loss is 2.532", "caption": "**Mean cross-entropy 2.532, matching the reference exactly** — and the per-position probabilities show why: **p(target) is 0.014, 0.436 and 0.081.** Position 1 scores well **by accident**, because the target there happens to be `liebe`. Which is the classic untrained signature: **mode collapse — one output token dominates regardless of input, at 0.762, 0.436 and 0.774** — and it is what the first few hundred training steps typically fix, **before the model learns anything about the task.**", "left": "position", "codeW": 140, "vars": ["predicted", "target", "p(target)"], "steps": [{"code": "0", "state": ["liebe (0.762)", "ich", "0.014"], "tone": "crit"}, {"code": "1", "state": ["liebe (0.436)", "liebe", "0.436"], "changed": [0, 1, 2], "tone": "warn", "note": "right by accident"}, {"code": "2", "state": ["liebe (0.774)", "KI", "0.081"], "changed": [0, 1, 2], "tone": "crit"}, {"code": "mean loss", "state": ["-", "-", "2.532"], "changed": [2], "tone": "violet", "note": "mode collapse"}], "t": "diagram", "id": "dg-6_6-05-4"},

    { t: "out", text:
"                 <bos>   <eos>   ich     liebe   KI\n  -> ich        0.093   0.093   0.014   0.762   0.038\n  -> liebe      0.035   0.035   0.143   0.436   0.351\n  -> KI         0.058   0.058   0.030   0.774   0.081\n\n  pos 0: predict 'liebe'   target 'ich'     p(target) = 0.014\n  pos 1: predict 'liebe'   target 'liebe'   p(target) = 0.436\n  pos 2: predict 'liebe'   target 'KI'      p(target) = 0.081\n\n  mean cross-entropy loss = 2.532        reference 2.532" },

    { t: "math", tex: "\\mathcal{L} = -\\frac{1}{T}\\sum_{t=1}^{T} \\log p_\\theta\\!\\left(y_t \\mid y_{<t}, \\text{source}\\right)" },

    { t: "callout", kind: "crit", title: "0.92 nats worse than guessing",
      body: [{ t: "p", text: "Uniform guessing over five words costs `ln(5) = 1.6094` nats. This model costs **2.5320** — perplexity 12.58 against a vocabulary of only 5. It is comprehensively worse than a model that knows nothing and admits it. Look at position 0 to see why: the correct token `ich` got **0.014**, costing `−ln(0.014) = 4.2687` nats for that position alone, while a uniform guess would have cost 1.6094. The model put 0.762 on `liebe` instead. **Random weights are not a neutral starting point** — they produce confident, arbitrary predictions, and cross-entropy's `−log p` blows up as `p` approaches zero. That asymmetry is exactly what makes cross-entropy a good training signal: being confidently wrong is punished far more than being unsure." }] },

    { t: "p", text: "Notice also the mode collapse: the model predicts `liebe` at **all three** positions, giving it 0.762, 0.436 and 0.774. One output token dominates regardless of input. That is the other classic untrained signature, and it is what the first few hundred training steps typically fix — before a model learns anything about the task, it learns the marginal frequency of tokens." },

    { t: "h2", n: "06", text: "What training would change", id: "training" },

    { t: "diagram", kind: "steps", title: "From this loss to a working model",
      items: [
        { title: "Backpropagate", text: "The gradient of 2.532 flows back through the LM head, the decoder blocks, cross-attention into the encoder memory, and the encoder blocks — every matrix in both stacks." },
        { title: "First, learn the marginals", text: "The quickest loss reduction is matching token frequencies, which alone gets below the uniform baseline of 1.6094." },
        { title: "Then, learn the alignment", text: "Cross-attention develops the diagonal that is absent here. This is where the model starts to translate rather than guess." },
        { title: "Then, learn the conditionals", text: "Word choice conditioned on both source and generated prefix — where the remaining loss lives." }
      ] },

    { t: "callout", kind: "insight", title: "One loss updates both stacks",
      body: [{ t: "p", text: "The encoder has no loss of its own. It is trained entirely by gradient flowing backwards through **cross-attention** — the decoder's queries meeting the encoder's keys and values is the only path connecting the two. So the encoder learns to produce representations that happen to be useful for the decoder's cross-attention, which is a purely indirect signal. That is worth appreciating: nothing ever tells the encoder what a good source representation is, only whether the decoder managed to translate from it." }] },

    { t: "exercise", title: "Compute and compare",
      tasks: [
        "Run the script and confirm the loss of 2.532 to three decimals.",
        "Compute ln(vocab_size) and verify the model is worse than uniform.",
        "Compute the per-position loss and identify which position contributes most.",
        "Plot the cross-attention matrix as a heatmap and confirm there is no diagonal.",
        "Hand-modify W_out to raise p(ich) at position 0 and recompute the loss."
      ] }
  ],

  takeaways: [
    "Teacher forcing feeds the gold prefix shifted right, so all target positions are predicted in one parallel pass.",
    "Decoder self-attention is masked with an upper-triangle maximum of exactly 0.00e+00, and <bos>'s weight of 1.000 is structurally forced.",
    "Cross-attention is target-by-source, unmasked, with rows summing to 1 over the source — the alignment matrix.",
    "This model's cross-attention deviates from uniform by at most 0.0577, with a diagonal mean of 0.3500 against 0.3250 off-diagonal: no alignment at all.",
    "A trained model would show a strong diagonal — the alignment matrix is where training becomes visible.",
    "The loss is 2.5320 against a uniform baseline of ln(5) = 1.6094, so the model is 0.92 nats WORSE than guessing.",
    "Position 0 gave the correct token 0.014, costing 4.2687 nats alone — cross-entropy punishes confident wrongness far more than uncertainty.",
    "The model predicts 'liebe' at all three positions — mode collapse, the other classic untrained signature.",
    "The encoder has no loss of its own; it is trained only by gradient flowing back through cross-attention."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "The toy model's loss is 2.532 on a 5-word vocabulary. Is that good?",
      options: ["Yes, well below chance", "No — uniform guessing costs ln(5) = 1.6094, so it is 0.92 nats worse than knowing nothing", "It is exactly chance", "Loss cannot be compared to a baseline"],
      answer: 1,
      why: "Perplexity 12.58 against a vocabulary of 5. Position 0 gave the correct token just 0.014, costing 4.2687 nats. Random weights are not neutral — they produce confident arbitrary predictions, and -log p blows up as p approaches zero. Always compute ln(vocab) as the baseline before judging a loss." },
    { stem: "What shape is the cross-attention matrix, and why?",
      options: ["Square, like self-attention", "Target length by source length, because decoder queries meet encoder keys", "Source by source", "It has no fixed shape"],
      answer: 1,
      why: "Here (3, 3) only because both sentences are three words; a five-word translation of a three-word source would give (5, 3). Rows sum to 1 over the source positions, so each output token distributes its full attention across the input words — which is what makes it an alignment matrix and the best debugging artefact an encoder-decoder model offers." },
    { stem: "How can you tell this model's cross-attention has learned nothing?",
      options: ["The weights are negative", "It deviates from uniform by at most 0.0577, with a diagonal mean of 0.3500 against 0.3250 off-diagonal", "The rows do not sum to 1", "It is masked"],
      answer: 1,
      why: "A trained model on a word-aligned pair would show a strong diagonal — I to ich, love to liebe, AI to KI. This one attends essentially equally to every source word for every target word, which is noise. If you saw this while debugging a real model you would know immediately that cross-attention was not learning." },
    { stem: "How does the encoder get trained when the loss is computed on the decoder's output?",
      options: ["It has a separate reconstruction loss", "Gradient flows back through cross-attention, which is the only path connecting the two stacks", "It is pretrained separately and frozen", "Through the shared embedding table"],
      answer: 1,
      why: "The decoder's queries meeting the encoder's keys and values is the sole connection. So the encoder learns to produce representations that are useful for the decoder's cross-attention — an entirely indirect signal. Nothing ever tells the encoder what a good source representation is, only whether the decoder could translate from it." }
  ] },

  interview: { title: "Interview", sub: "Training an encoder-decoder", questions: [
    { level: "Core", q: "What is teacher forcing and what does it cost?",
      strong: "Feeding the gold prefix shifted right — it makes training parallel, and causes exposure bias.",
      answer: [{ t: "p", text: "During training you feed the decoder the correct target sequence shifted one position right, so position t sees the gold tokens up to t minus 1 and predicts token t. Combined with the causal mask that makes every position's prediction task well posed simultaneously, so the whole target is scored in one forward pass rather than one per token. I measured that gap directly — about 74 times faster for 128 tokens. The cost is exposure bias: at training the model always conditions on a correct prefix, and at inference it conditions on its own output, mistakes included. I showed this on GPT-2, where it assigned just 0.0836 to a gold token it would never have chosen and then continued being scored on a prefix it disagreed with. At inference nothing supplies that correction, so an early low-probability choice becomes the context for everything after and errors compound. The mitigations are scheduled sampling, which mixes the model's own predictions into training, sequence-level or RL fine-tuning that optimises the whole output rather than each token against a gold prefix, and better decoding." }] },
    { level: "Senior", q: "How do you tell whether a sequence-to-sequence model is learning?",
      strong: "Compare the loss against ln(vocab), and look for a diagonal in cross-attention.",
      answer: [{ t: "p", text: "Two checks, and the first is embarrassingly easy to skip. Compare the loss against the uniform baseline, ln of the vocabulary size. I traced a toy translation model with hand-picked weights whose loss was 2.532 on a five-word vocabulary, and ln 5 is 1.6094 — so it was 0.92 nats worse than a model that knows nothing and admits it, perplexity 12.58 against a vocabulary of 5. A loss number on its own is uninterpretable; you need the baseline. It also tells you something about initialisation: random weights aren't neutral, they're confidently arbitrary, and cross-entropy punishes that much harder than uncertainty. The second check is the cross-attention matrix, which for an encoder-decoder model is target length by source length and is effectively an alignment map. In a model that's learning you see a diagonal developing — source word i attended to when generating target word i, for a word-aligned language pair. In the toy model the maximum deviation from uniform was 0.0577 and the diagonal mean was 0.3500 against 0.3250 off-diagonal, which is noise. Watching that matrix across training is the clearest signal of whether the model is translating or just learning token frequencies — which, incidentally, is what the first few hundred steps always do first." }] },
    { level: "Senior", q: "Cross-attention is the only link between encoder and decoder. What follows from that?",
      strong: "The encoder is trained by an entirely indirect signal, and it is the obvious place to intervene.",
      answer: [{ t: "p", text: "Several things. First, on training: the encoder has no loss of its own. Gradient reaches it only by flowing backwards through cross-attention, so it learns to produce representations that happen to be useful for the decoder's queries. Nothing ever tells it what a good source representation is — only whether the decoder managed to translate from it. That's a surprisingly indirect signal for something that carries all the source information, and it's part of why encoder-decoder models can be slower to converge than decoder-only ones where every token has a direct next-token objective. Second, on inference efficiency: because the memory is fixed during generation, its key and value projections can be computed once and reused for every decoder step — the encoder-decoder analogue of a KV cache, and a meaningful saving. Third, on debugging and control, this is the intervention point. Cross-attention weights are a rectangular, inspectable alignment matrix, so you can see which source positions an output drew from, add coverage penalties for source positions nothing attends to, or constrain the alignment directly. A decoder-only model has no equivalent — the prompt and output are one sequence and there's no distinguished matrix telling you what came from where. That interpretability is an underrated argument for the architecture in domains where you need to audit the output against the input." }] }
  ] }
});
