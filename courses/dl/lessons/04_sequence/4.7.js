/* ============================================================================
   LESSON 4.7 — CTC Loss and Language Modelling
   ========================================================================= */
EC.receiveLesson({
  id: "4.7",

  lede: "**When the input has 21 frames and the label has 5 symbols and nobody tells you which frames belong to which symbol, the loss must sum over every alignment — and CTC does that in a table the size of the input times twice the label, instead of enumerating the 27 paths of even a toy case.** The forward algorithm is worked on three frames and matched to torch's ctc_loss to five decimals; a bidirectional LSTM trained with it reads synthetic speech-like frames at 5.6 % symbol error with 43 % of frames predicted blank — the peaky behaviour every CTC model shows. The second half is the language model: perplexity defined and computed for uniform, unigram, bigram and LSTM models on one corpus (9.0, 7.33, 1.90, 1.01), generation with temperature, character against word level, and the CRF layer that makes sequence labelling respect its own constraints.",

  objectives: [
    "State the alignment problem, the blank token and the collapse rule, and enumerate valid paths on a toy case",
    "Run the CTC forward algorithm by hand and match it to brute force and to torch",
    "Train a CTC model on frame sequences, decode greedily, and measure sequence and symbol error rates",
    "Define perplexity, compute it for count-based and neural language models, and generate with temperature",
    "Explain sequence labelling with a CRF layer and run Viterbi decoding under a transition constraint"
  ],

  prerequisites: ["4.5", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The alignment problem and the blank", id: "alignment" },

    { t: "p", text: "Speech recognition, handwriting recognition and any task where a long input maps to a short label sequence without a known alignment face the same problem: the network produces one output per input frame, but the target has fewer symbols and nobody says which frames are which. Connectionist temporal classification (Graves et al., 2006) solves it with a blank symbol and a collapse rule:" },

    { t: "code", lang: "text", title: "T = 3 frames, alphabet {−, a, b}, target 'a' (executed)",
      code: `collapse rule: merge repeated symbols, then remove blanks       'aa-' -> 'a',   'a-a' -> 'aa'   (the blank separates repeats)

27 possible paths of length 3; those that collapse to 'a':   --a  -a-  -aa  a--  aa-  aaa      (6 of 27)

frame probabilities (blank, a, b):   [0.6, 0.3, 0.1]   [0.5, 0.4, 0.1]   [0.7, 0.2, 0.1]
P('a') = Σ over the 6 paths of Π_t P(path_t | frame t) = 0.48900`,
      caption: "The model's output at each frame is a distribution over the alphabet plus blank; the probability of a label is the total probability of every frame-level path that collapses to it. Enumerating paths is exponential in T; the forward algorithm below is quadratic in the label length and linear in T." },

    { t: "code", lang: "text", title: "The forward algorithm on the extended label [−, a, −] (executed)",
      code: `α[t, s] = probability of being at extended position s after frame t, having emitted the prefix
α[0, 0] = P(−|0) = 0.6;   α[0, 1] = P(a|0) = 0.3;   α[0, 2] = 0
α[t, s] = ( α[t−1, s] + α[t−1, s−1] + α[t−1, s−2] if the skip is legal ) · P(ext[s] | t)
          (the skip s−2 is allowed only over a blank between two different symbols)

        s=0 (−)   s=1 (a)   s=2 (−)
t=0     0.6       0.3       0
t=1     0.3       0.36      0.15
t=2     0.21      0.132     0.357

P('a') = α[2, 2] + α[2, 1] = 0.357 + 0.132 = 0.48900       (matches the brute force)
torch F.ctc_loss = −log P = 0.71539;   −log(0.48900) = 0.71539`,
      caption: "The extended label puts a blank between and around every symbol, so the path may or may not use them. The table is (T × (2L + 1)) and each cell sums at most three predecessors — dynamic programming over alignments. The loss is −log of the total; the gradient flows to every frame in proportion to how much of the probability mass its paths carry. torch computes exactly this." },

    { t: "code", lang: "text", title: "A CTC model on synthetic speech-like frames (executed)",
      code: `data: each label of 2–5 symbols (alphabet of 5) rendered as 2–5 noisy frames per symbol with 0–2 frames of noise between; 3,000 sequences
model: bidirectional LSTM (hidden 128) -> per-frame logits over 6 classes (5 symbols + blank);  loss F.ctc_loss;  greedy decoding = argmax per frame, then collapse

30 epochs (60 s):  sequence error rate 0.188,  symbol error rate (edit distance / label length) 0.056

one test sequence, 21 frames, true labels [3, 2, 1, 3, 1]:
  per-frame argmax   [0, 3, 3, 0, 0, 0, 2, 2, 2, 0, 0, 1, 1, 0, 3, 3, 3, 0, 0, 1, 1]  ->  collapsed [3, 2, 1, 3, 1]
  43 % of frames are blank -- CTC's 'peaky' behaviour: the model emits each symbol briefly and blanks everywhere else`,
      caption: "The label is never aligned by hand; the model learns where symbols are from the sum over alignments. The peaky output is characteristic: CTC does not need the symbol to span its frames, only to appear once between blanks, so it learns to spike. Symbol error is the metric that matters (WER in speech, 10.2); sequence error counts a whole label wrong for one slip." },

    { t: "dl", items: [
      ["Decoding", "Greedy: argmax per frame, collapse. Beam search over prefixes (prefix beam search) merges paths that collapse to the same prefix and can add a language model's score — the standard for speech (10.2)."],
      ["Where CTC applies", "Speech (DeepSpeech, wav2vec 2.0 fine-tuning, 10.2), handwriting and scene-text recognition, some sequence-to-sequence tasks with monotonic alignment. Its assumptions: output length ≤ input length, monotonic alignment, conditionally independent frames given the input (no output dependencies — which is why a language model is added at decoding)."],
      ["Alternatives", "Attention-based seq2seq (4.6) learns the alignment as a by-product and can reorder; RNN-Transducer (10.2) keeps CTC's streaming property and adds output dependencies."],
      ["zero_infinity", "A label longer than its input, or with repeats needing more blanks than the frames allow, has no valid path and infinite loss; torch's zero_infinity=True skips those instead of producing NaN (2.4)."]
    ] },

    { t: "h2", n: "02", text: "Language models and perplexity", id: "lm" },

    { t: "p", text: "A language model assigns a probability to a sequence by the chain rule, P(w₁…w_T) = Π P(w_t | w_{<t}), and is trained to predict each token from its predecessors — the objective every GPT is trained on. Perplexity is the exponential of the mean per-token negative log-likelihood: the effective number of choices the model faces per token." },

    { t: "code", lang: "text", title: "Four models on one periodic toy corpus (executed)",
      code: `corpus: 'the cat sat on the mat . the dog sat on the log . the cat saw the dog . the dog saw the cat .' × 40  ->  1,040 tokens, vocabulary 9

perplexity = exp( −(1/T) Σ log P(w_t | context) )
  uniform                        9.00      every token equally likely
  unigram                        7.33      frequencies only
  bigram (add-0.01 smoothing)    1.90      one token of context
  LSTM (hidden 64, 15 epochs)    1.01      held-out; the corpus repeats, so memory makes it almost deterministic

generation from 'the', sampling with temperature:
  T = 0.5:  'the cat sat on the mat . the dog sat on the log'
  T = 2.0:  'the cat sat on the mat . the dog sat on the log'       -- the model is so certain that even T = 2 does not change a token`,
      caption: "Perplexity 1.9 for the bigram says each word is, on average, a choice between fewer than two options given the previous word; the LSTM's 1.01 says the corpus is memorised, which is the honest result on a text that repeats exactly. On real text, word-level perplexities run from ~100 (a small LSTM on Penn Treebank) to the low tens for large transformers, and the numbers are only comparable at the same tokenisation." },

    { t: "dl", items: [
      ["Character vs word vs subword", "Character-level: 15 symbols here against 9 words, sequences 3.6× longer, no out-of-vocabulary problem, longer dependencies to learn. Word-level: short sequences, a vocabulary that never covers everything. Subword (BPE, 4.8): the compromise every modern model uses. Perplexity per character and per word are different units; compare via bits per character or convert with the token count."],
      ["Text generation with an RNN", "Feed the model's sampled token back as the next input (one-to-many, 4.1); control with temperature, top-k and top-p (4.6); stop at an end token. Karpathy's char-RNN is 4.1's NumPy model on a real corpus."],
      ["Perplexity's limits", "It measures prediction of the training distribution's text, not usefulness; two models at equal perplexity can differ greatly in generation quality, and instruction-tuned models are not evaluated by it. It is the training metric, not the product metric."],
      ["What the transformer changed", "The objective (next token) is the same; the model's ability to condition on thousands of tokens at once, trained in parallel, is what changed (module 5). The LSTM language models of 2016–2018 (AWD-LSTM, ELMo) were the last of this line."]
    ] },

    { t: "h2", n: "03", text: "Sequence labelling and the CRF layer", id: "crf" },

    { t: "p", text: "Tagging assigns a label to every token — part of speech, named-entity spans in BIO format, slot filling. A bidirectional encoder with a per-token softmax treats each position independently, which permits impossible sequences: an I-PER tag after B-ORG, an I tag after O. A conditional random field layer adds a transition matrix A[y_i, y_{i+1}] and scores whole label sequences:" },

    { t: "code", lang: "text", title: "Viterbi decoding with a transition constraint (executed)",
      code: `tags {O, B, I};  transitions A with A[O, I] = −inf (an inside tag cannot follow outside)
emission scores from the encoder, three steps:   [2.0, 1.0, 0.5]   [0.2, 0.3, 2.5]   [1.0, 0.1, 1.5]

independent argmax per step:   O  I  I        -- O -> I is forbidden
Viterbi over emissions + transitions:   B  I  I   score 5.0     -- the best legal sequence: the first tag is changed to keep the span consistent`,
      caption: "Training a CRF layer maximises the log-likelihood of the gold sequence under the score Σ emission + Σ transition, normalised by a sum over all sequences computed with the same forward algorithm as CTC (dynamic programming over a lattice). At inference Viterbi finds the best sequence. BiLSTM-CRF was the standard NER architecture before BERT, and a CRF head on a transformer encoder is still used where label constraints are hard." },

    { t: "table", head: ["Task", "Output", "Loss", "Decoding", "Example"],
      rows: [
        ["Sequence classification", "One label", "Cross-entropy on the final/pooled state", "argmax", "Sentiment (4.5)"],
        ["Sequence labelling", "One label per token", "Per-token CE, or CRF log-likelihood", "argmax, or Viterbi", "NER, POS, slot filling"],
        ["Unaligned transcription", "Shorter label sequence", "CTC", "Greedy collapse, prefix beam + LM", "Speech (10.2), OCR"],
        ["Sequence-to-sequence", "Any sequence", "Per-token CE with teacher forcing", "Greedy, beam, sampling (4.6)", "Translation, summarisation"],
        ["Language modelling", "The next token, always", "Per-token CE (next-token prediction)", "Sampling with controls", "GPT; perplexity as the metric"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does CTC need a blank symbol?",
          options: [
            "To pad short sequences",
            "Two reasons: the collapse rule merges repeated symbols, so a blank between two identical symbols ('a−a') is the only way to emit 'aa'; and the model needs an output for frames that carry no symbol (silence, transitions) — without it every frame would have to be assigned a label symbol",
            "To mark the end of the sequence",
            "To make the loss differentiable"
          ],
          answer: 1,
          why: "The extended label [−, a, −] in the forward algorithm places optional blanks around and between symbols; the s − 2 skip is disallowed exactly when the two symbols are the same, which is the rule that makes 'aa−' collapse to 'a' and 'a−a' to 'aa'."
        },
        {
          stem: "The trained CTC model predicted blank on 43 % of frames and each symbol as a short spike. Is this a defect?",
          options: [
            "Yes; the model should label every frame of a symbol",
            "No — CTC sums over all alignments and needs a symbol to appear only once between blanks, so the model learns to emit each symbol briefly and blank elsewhere; the peaky behaviour is characteristic and the decoded label [3, 2, 1, 3, 1] was exactly right",
            "Yes; it means the blank class is over-weighted",
            "It means the input frames were too noisy"
          ],
          answer: 1,
          why: "Peaky outputs are a well-known property of CTC training (Graves noted it; later work analysed why the optimum is peaky). It matters when frame-level timing is needed — then a forced alignment or an RNN-T (10.2) is used instead."
        },
        {
          stem: "A bigram model reached perplexity 1.90 and an LSTM 1.01 on the same corpus. What does each number mean, and why is 1.01 not impressive?",
          options: [
            "The LSTM is 88 % better; it is impressive",
            "Perplexity is the effective number of choices per token: the bigram faces ~1.9 options given the previous word, the LSTM ~1 — but the corpus is four sentences repeated forty times, so a model with memory can predict it almost exactly; the number reports memorisation of a periodic text, not language ability",
            "The bigram was under-smoothed",
            "Perplexity below 2 is impossible"
          ],
          answer: 1,
          why: "Perplexity is only as meaningful as the held-out text is representative. The definition and the computation are what the toy shows; the values that matter are on real corpora at a stated tokenisation."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "CTC by hand and by training, perplexity three ways, and Viterbi with a CRF constraint",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "**(a)** For T = 3 frames over {−, a, b}, enumerate the paths that collapse to 'a', compute P('a') by brute force from the given frame probabilities, then implement the CTC forward algorithm over the extended label and show it agrees; compare −log P with F.ctc_loss." },
        { t: "p", text: "**(b)** Generate 3,000 synthetic frame sequences (2–5 symbols from an alphabet of 5, each rendered as 2–5 noisy one-hot frames with 0–2 noise frames between). Train a bidirectional LSTM with ctc_loss for 30 epochs and report sequence and symbol error rates with greedy decoding, plus one decoded example and the fraction of blank frames." },
        { t: "p", text: "**(c)** On the repeated four-sentence corpus, compute perplexity for uniform, unigram, add-0.01 bigram and an LSTM language model (held-out 20 %), and generate 12 tokens from 'the' at temperatures 0.5 and 2." },
        { t: "p", text: "**(d)** Implement Viterbi decoding for three tags with a transition matrix that forbids O → I, and show a case where the per-step argmax is illegal and Viterbi corrects it." }
      ],
      requirements: [
        "(a) the path list, three agreeing probabilities.",
        "(b) two error rates, one example, one fraction.",
        "(c) four perplexities and two generations.",
        "(d) the two label sequences and the Viterbi score."
      ],
      hint: "(a) α[t, s] sums α[t−1, s], α[t−1, s−1] and α[t−1, s−2] (the last only when ext[s] is a symbol different from ext[s−2]), times P(ext[s] | t); P = α[T−1, last] + α[T−1, last−1]. (b) ctc_loss wants (T, B, C) log-probabilities and concatenated targets with lengths; use zero_infinity=True. (d) Keep a back-pointer per step; the transition matrix is added to the score at each step.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) valid paths: --a -a- -aa a-- aa- aaa;  brute force 0.48900;  forward algorithm 0.48900;  ctc_loss 0.71539 = −log 0.48900

# (b) bidirectional LSTM (hidden 128), 30 epochs: sequence error 0.188, symbol error 0.056
#     21 frames, true [3, 2, 1, 3, 1]: argmax [0,3,3,0,0,0,2,2,2,0,0,1,1,0,3,3,3,0,0,1,1] -> [3, 2, 1, 3, 1];  43 % blank frames

# (c) perplexity: uniform 9.00, unigram 7.33, bigram 1.90, LSTM 1.01
#     T=0.5 and T=2.0 both generate 'the cat sat on the mat . the dog sat on the log' -- the model is certain

# (d) per-step argmax O I I (illegal);  Viterbi with A[O, I] = −inf: B I I, score 5.0`,
        notes: [
          { t: "p", text: "(a) is the whole of CTC in a 3 × 3 table; every speech model's loss is this table at scale." },
          { t: "p", text: "(b) shows the loss training a model with no alignment information at all, and the peaky output it produces." },
          { t: "p", text: "(c) and (d) are the two other sequence losses in the toolbox: the language model's next-token objective with its metric, and the structured loss that respects label constraints." }
        ]
      }
    }
  ],

  takeaways: [
    "CTC handles unaligned targets with a blank symbol and a collapse rule (merge repeats, remove blanks); the label's probability is the sum over all frame-level paths that collapse to it — 6 of 27 paths for 'a' over three frames, P = 0.489.",
    "The forward algorithm computes that sum in a T × (2L + 1) table over the blank-extended label, each cell summing at most three predecessors; it matched brute force and torch's ctc_loss (0.71539) exactly.",
    "A bidirectional LSTM trained with CTC on synthetic frames reached 5.6 % symbol error with no alignment supervision, predicting blank on 43 % of frames — the peaky output CTC models learn; decoding is greedy collapse or prefix beam search with a language model.",
    "A language model factorises P(sequence) by the chain rule and is trained on next-token prediction; perplexity = exp(mean NLL per token) is the effective number of choices: 9.0 uniform, 7.33 unigram, 1.90 bigram, 1.01 LSTM on a periodic corpus, where the last number means memorisation.",
    "Character, word and subword tokenisation trade vocabulary against sequence length; generation feeds sampled tokens back with temperature and truncation controls; perplexity is the training metric, not the product metric.",
    "Sequence labelling adds a CRF layer with a transition matrix so that whole label sequences are scored; Viterbi turned an illegal O-I-I into B-I-I under an O → I prohibition — the BiLSTM-CRF recipe for NER."
  ],

  quiz: {
    title: "CTC Loss and Language Modelling — Knowledge Check",
    questions: [
      {
        stem: "What assumption does CTC make that an attention-based seq2seq model does not?",
        options: [
          "That the input is audio",
          "Monotonic alignment with output no longer than input, and conditional independence of frame outputs given the input — so it cannot reorder and models no dependencies between output symbols (a language model is added at decoding); attention learns any alignment and conditions each output on the previous ones",
          "That the vocabulary is small",
          "That the target contains no repeated symbols"
        ],
        answer: 1,
        why: "Those assumptions are what make the forward-algorithm factorisation possible and what make CTC suited to transcription tasks (speech, OCR) and unsuited to translation. RNN-T relaxes the independence assumption while keeping streaming."
      },
      {
        stem: "How is the CTC forward algorithm related to the CRF's normaliser?",
        options: [
          "They are unrelated",
          "Both are dynamic programming over a lattice of sequences: CTC sums path probabilities over alignments of a fixed label, the CRF sums exp(scores) over all label sequences for the partition function; each is a forward recursion whose cells sum a few predecessors, and both have a Viterbi counterpart for the best single path",
          "The CRF uses beam search instead",
          "CTC has no normaliser"
        ],
        answer: 1,
        why: "The sum–product (forward) and max–product (Viterbi) recursions are the same algebra with different operators. Recognising the pattern is what lets you implement either loss in twenty lines, as the exercise does."
      },
      {
        stem: "Why are perplexities not comparable across models with different tokenisers?",
        options: [
          "Because perplexity depends on the learning rate",
          "Because perplexity is per token, and a subword tokeniser produces more tokens per sentence than a word tokeniser (and characters more still), spreading the same total log-likelihood over more units; compare by total bits on the same text, or bits per character",
          "Because different tokenisers have different vocabularies",
          "They are comparable; tokenisation does not matter"
        ],
        answer: 1,
        why: "A model's total NLL of a text is tokenisation-independent in principle; the per-token average is not. The toy corpus's character-level version has 3.6× as many tokens, and its per-character perplexity would be much lower than the per-word 1.90 for the same predictive quality."
      },
      {
        stem: "At temperature 2.0 the LSTM still generated the training text verbatim. What does that show about temperature?",
        options: [
          "That temperature has no effect on LSTMs",
          "That temperature rescales the model's logits, so it can only add diversity where the model has some — a model that assigns nearly all probability to one next token stays certain even when the logits are halved; on a real corpus the same setting produces visibly more random text",
          "That the sampling code was greedy",
          "That the corpus has only one sentence"
        ],
        answer: 1,
        why: "Temperature divides logits; if the top logit leads by twenty, dividing by two leaves a lead of ten and a probability still near 1. The controls of 4.6 act on the distribution the model provides, not on the model."
      },
      {
        stem: "When would you add a CRF layer to a transformer tagger?",
        options: [
          "Always; it is free",
          "When the label scheme has hard constraints (BIO spans, valid state sequences) that a per-token softmax violates, and when training data are small enough that learning the transitions explicitly helps; with a large pretrained encoder the gain is often marginal and the cost is a slower Viterbi decode",
          "Never; transformers learn constraints implicitly",
          "Only for part-of-speech tagging"
        ],
        answer: 1,
        why: "The Viterbi example shows the constraint at work on one illegal sequence. BiLSTM-CRF was the NER standard; with BERT-scale encoders the encoder alone usually respects the scheme well enough, and the CRF is a measured choice."
      }
    ]
  },

  interview: {
    title: "Interview Questions — CTC Loss and Language Modelling",
    sub: "The alignment problem and the forward algorithm, CTC in practice, perplexity, and structured labelling.",
    questions: [
      {
        level: "Core",
        q: "Explain CTC loss and work a small example.",
        strong: "CTC trains a model that outputs one distribution per input frame to produce a shorter label sequence with no alignment given. It adds a blank symbol and defines a collapse rule — merge consecutive repeats, then delete blanks — so that every frame-level path maps to a label; the probability of a label is the sum of the probabilities of all paths that collapse to it, and the loss is minus its log. With three frames over {blank, a, b}, six of the twenty-seven paths collapse to 'a' (−−a, −a−, −aa, a−−, aa−, aaa; note 'a−a' would be 'aa'), and with frame distributions [0.6, 0.3, 0.1], [0.5, 0.4, 0.1], [0.7, 0.2, 0.1] their total is 0.489. The forward algorithm computes the same sum without enumeration: over the blank-extended label [−, a, −], a table α[t, s] where each cell sums its predecessors at s, s − 1 and — only across a blank between different symbols — s − 2, times the frame probability of ext[s]. The table's last row gave 0.357 + 0.132 = 0.489, and torch's ctc_loss returned −log 0.489 = 0.71539. The gradient flows to every frame in proportion to the mass of the paths through it, which is how the model learns where symbols are. Its assumptions — monotonic alignment, output no longer than input, frames conditionally independent — are what make it right for speech and OCR and wrong for translation.",
        answer: [
          { t: "p", text: "The blank and collapse rule, the executed enumeration, the forward recursion with the executed table, the torch check, and the assumptions." }
        ]
      },
      {
        level: "Core",
        q: "What is perplexity and how do you interpret it?",
        strong: "A language model gives each token a probability conditioned on its predecessors; perplexity is exp of the mean negative log-probability per token over a held-out text — equivalently, the effective number of equally likely choices the model faces at each step. A uniform model over a nine-word vocabulary has perplexity 9; a unigram model using frequencies alone had 7.33 on my toy corpus; a bigram model with one word of context 1.90; an LSTM 1.01 — and that last number is a warning as much as a result, because the corpus was four sentences repeated and the model memorised it. Interpretation needs three cautions. It is per token, so values are comparable only at the same tokenisation (subwords give more tokens than words, characters more still; compare total bits or bits per character). It measures prediction of text like the training distribution, not usefulness — an instruction-tuned model is judged by task metrics and human preference, not perplexity. And a lower value can hide poor generation; two models at equal perplexity can differ greatly in what they produce. It remains the right training metric and the right early-stopping signal for any next-token model.",
        answer: [
          { t: "p", text: "The definition, the executed ladder of models, and the three interpretive cautions." }
        ]
      },
      {
        level: "Advanced",
        q: "How would you build a named-entity recogniser, and why would you add a CRF?",
        strong: "Tokenise, embed (pretrained vectors or, today, a transformer encoder), run a bidirectional encoder so every token's representation sees both contexts, and apply a per-token classifier over BIO tags — B-PER, I-PER, O and so on — trained with per-token cross-entropy, with padded positions masked out of the loss and packing for variable lengths (4.5). The weakness of the per-token softmax is that it scores positions independently and can emit sequences the scheme forbids: I-PER after B-ORG, or I after O — in my toy example the per-step argmax gave O-I-I. A CRF layer adds a learned transition matrix A[y_i, y_{i+1}] and scores whole sequences by Σ emission + Σ transition, trained by maximising the gold sequence's log-likelihood normalised over all sequences (a forward recursion, the same algebra as CTC's) and decoded with Viterbi; with A[O, I] = −inf it produced B-I-I, the best legal sequence. Add it when the label constraints are hard and the data small — the BiLSTM-CRF era — and measure whether it still helps on top of a large pretrained encoder, which usually respects the scheme on its own; the cost is a slower decode. Evaluate with span-level F1, not token accuracy, since the O tag dominates.",
        answer: [
          { t: "p", text: "The pipeline, the independence weakness with the executed illegal output, the CRF's mechanism and Viterbi result, when to use it, and the metric." }
        ]
      }
    ]
  }
});
