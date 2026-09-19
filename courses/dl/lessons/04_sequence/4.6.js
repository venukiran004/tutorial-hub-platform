/* ============================================================================
   LESSON 4.6 — Seq2Seq, Attention and Beam Search
   ========================================================================= */
EC.receiveLesson({
  id: "4.6",

  lede: "**An encoder–decoder without attention must compress the whole input into one vector and decode from it; with attention the decoder looks back at every input position at every step, and on a date-translation task that is the difference between 65.5 % and 99.9 % exact matches.** This lesson builds both, with teacher forcing and scheduled sampling; implements Luong's attention and shows the alignment it learns (every output digit points at the source character it came from); writes beam search and measures it against greedy decoding; and ends with the sampling controls — temperature, top-k, top-p — that text generation runs on.",

  objectives: [
    "Build an encoder–decoder with a GRU encoder, a bridge and a GRU decoder, trained with teacher forcing",
    "Add Luong attention, read the learned alignment, and explain scheduled sampling and the exposure-bias argument",
    "Distinguish Bahdanau (additive) and Luong (dot, general) scores, global and local attention, hard and soft attention, and the copy mechanism",
    "Implement beam search with a width, an end token and length normalisation, and compare with greedy decoding",
    "Apply temperature, top-k and top-p to a decoder distribution and read their effect on entropy and support"
  ],

  prerequisites: ["4.5"],

  blocks: [

    { t: "h2", n: "01", text: "The task and the encoder–decoder", id: "seq2seq" },

    { t: "code", lang: "text", title: "Date translation: four human formats to ISO (executed)",
      code: `'august 15, 2021' -> '2021-08-15'      '3 january 1988' -> '1988-01-03'      '07/03/2001' -> '2001-07-03'      'dec 2 2026' -> '2026-12-02'
12,000 pairs (10,000 train, 2,000 test); source vocabulary 37 characters, target 14 (+ pad, <sos>, <eos>); source length up to 18, target 12`,
      caption: "A many-to-many task with reordering: the year moves from the end to the front, the month becomes two digits from a word. It is small enough to train in a minute and structured enough that the alignment is readable." },

    { t: "code", lang: "python", title: "Encoder, bridge, decoder step, teacher forcing",
      code: `enc_out, h = GRU(bidirectional=True)(embed(src))              # enc_out (B, T_src, 2H): one vector per source position
s = tanh(bridge(cat[h_fwd, h_bwd]))                             # the decoder's initial state from the encoder's final states

for t in 1 .. T_tgt:                                            # decoding, one target character at a time
    logits, s = step(y_prev, s, enc_out)                        # y_prev: the previous TARGET character (teacher forcing) …
    y_prev = y[t] if random() < p_teacher else logits.argmax()  # … or the model's own guess (p_teacher < 1: scheduled sampling)

loss = cross_entropy over all steps, ignore_index = pad`,
      caption: "Without attention the step is a plain GRU cell fed the previous character: everything it knows about the source is in the initial state s — a 64-dimensional bottleneck. Teacher forcing feeds the true previous character during training, which parallelises the loss and keeps early training stable; at inference the model must feed itself its own guesses." },

    { t: "h2", n: "02", text: "Attention", id: "attention" },

    { t: "code", lang: "python", title: "Luong 'general' attention in the decoder step",
      code: `def step(y_prev, s, enc_out, mask):
    e = embed(y_prev)
    scores = einsum("bh,bjh->bj", W_a(s), enc_out).masked_fill(~mask, -inf)   # s^T W_a h_j for every source position j
    a = softmax(scores)                                                          # the alignment: a distribution over source positions
    ctx = einsum("bj,bjh->bh", a, enc_out)                                       # the context: source states weighted by a
    s = GRUCell(cat[e, ctx], s)
    return out(cat[s, ctx]), s, a`,
      caption: "At every step the decoder state asks the encoder outputs a question — 'which source positions matter now?' — and receives a weighted average of them. The bottleneck is gone: the decoder has the whole source at every step, and what it reads is learned. Masking the padded positions to −inf keeps them from receiving weight." },

    { t: "code", lang: "text", title: "Exact-match accuracy on 2,000 test dates after 6 epochs, greedy decoding (executed)",
      code: `no attention (bridge vector only)                        0.655      (43 s)
Luong attention                                          0.999      (63 s)
Luong attention, scheduled sampling (tf 1.0 -> 0.3)      0.999
Luong attention, no teacher forcing at all (tf 0)        1.000

alignment for 'december 2, 2026' -> '2026-12-02': the source character each output character attends to most
  2<-'2'(1.00)  0<-'2'(1.00)  2<-'2'(1.00)  6<-'6'(1.00)  -<-' '(1.00)  1<-' '(0.98)  2<-'e'(0.99)  -<-' '(0.57)  0<-' '(1.00)  2<-'2'(1.00)`,
      caption: "Thirty-four points from attention. The alignment is the mechanism made visible: the year digits point at the year, the month digits at the month's letters, the separators at spaces. Scheduled sampling made no difference here, and training with the model's own outputs from the start (tf = 0) worked as well as teacher forcing — on a short, deterministic task exposure bias is not a problem; on long open-ended generation it is." },

    { t: "dl", items: [
      ["Bahdanau (additive)", "score = vᵀ tanh(W₁ s + W₂ h_j): a one-hidden-layer network on the pair. The original (2015), computed *before* the decoder step so the context feeds the recurrence. Executed on random vectors: [0.006, 0.042, 0.071, 0, 0, 0.879, 0, 0, 0]."],
      ["Luong dot / general / concat", "score = s·h_j (needs equal sizes), sᵀ W_a h_j (used above), or additive. Computed *after* the step; cheaper. Executed: general gave [0, 0.953, 0, 0, 0.002, 0.024, 0, 0, 0.022] on the same vectors — same idea, different weights."],
      ["Global vs local", "Global attends over all source positions (above). Local attends over a window around a predicted position p_t — cheaper for long sources, and a precursor of sliding-window attention (5.3)."],
      ["Soft vs hard", "Soft: the weighted average, differentiable. Hard: sample one position; not differentiable, trained with REINFORCE (module 8); rarely used."],
      ["Copy / pointer mechanism", "p(w) = p_gen · P_vocab(w) + (1 − p_gen) · Σ_{j: x_j = w} a_j — mix the vocabulary distribution with the attention distribution over source tokens, so the decoder can emit a rare source word (a name, a number) it could never generate. Pointer-generator networks for summarisation; the ancestor of retrieval-augmented decoding."],
      ["Exposure bias and scheduled sampling", "Teacher forcing trains on gold prefixes and tests on the model's own, possibly wrong, prefixes. Scheduled sampling mixes in the model's guesses with a rising probability; measured no effect here, and its benefit on long generation is contested."]
    ] },

    { t: "h2", n: "03", text: "Decoding: greedy, beam, sampling", id: "decoding" },

    { t: "code", lang: "python", title: "Beam search (executed)",
      code: `beams = [([<sos>], 0.0, state, done=False)]
for t in range(max_len):
    candidates = []
    for tokens, logp, state, done in beams:
        if done: candidates.append(beam); continue
        logits, state2, _ = step(tokens[-1], state, enc_out)
        for v, i in log_softmax(logits).topk(B):                          # extend each beam by its B best next tokens
            candidates.append((tokens + [i], logp + v, state2, i == <eos>))
    beams = sorted(candidates, key=score)[:B]                              # keep the B best sequences overall
    if all done: break

greedy vs beam (width 3) on 500 test dates:  greedy 0.998, beam 0.998, disagreements 0
the three beams for 'december 2, 2026':  ('2026-12-02', −0.00)  ('22066-12-02', −7.54)  ('2026-12-02-2', −8.07)`,
      caption: "Greedy takes the best token at each step; beam search keeps the B best partial sequences and can recover from a locally good but globally poor choice. On a task where the model is 99.8 % sure at every step they agree on every example; on translation beam search is worth a BLEU point or two. Two details in production: divide the score by length^α (α ≈ 0.6–1) so longer hypotheses are not penalised for being longer, and add a coverage penalty so that every source position is attended at least once." },

    { t: "code", lang: "text", title: "Temperature, top-k and top-p on a 30-way decoder distribution (executed)",
      code: `the distribution: entropy 2.46 nats, top probability 0.388

temperature:  T = 0.5  entropy 0.75      T = 1  2.46      T = 2  3.18
top-k, k = 5:                            entropy 1.26,  support 5
top-p (nucleus), p = 0.9:                support 17,  entropy 2.15
top-p on the flatter T = 2 distribution: support 23    -- nucleus size adapts to the distribution's shape

greedy = argmax (T → 0);  beam = argmax over sequences;  sampling with T / top-k / top-p trades accuracy for diversity`,
      caption: "Temperature (1.2) sharpens or flattens; top-k keeps the k most likely tokens; top-p keeps the smallest set whose probability exceeds p, which is five tokens when the model is confident and twenty-three when it is not. These are the controls behind every 'creativity' slider (5.3), and beam search is what you use instead when there is one right answer." },

    { t: "table", head: ["Decoder", "Objective", "Use", "Cost"],
      rows: [
        ["Greedy", "Best token each step", "Fast; fine when the model is confident", "1 pass per token"],
        ["Beam search (B)", "Approximate best sequence", "Translation, speech, structured outputs", "B passes per token, plus bookkeeping"],
        ["Sampling with temperature", "A draw from p^(1/T)", "Open-ended generation", "1 pass per token"],
        ["Top-k / top-p", "A draw from a truncated distribution", "Generation without the long tail's nonsense", "1 pass per token"],
        ["Constrained / lexically constrained", "Best sequence satisfying constraints", "Must-include terms, grammars", "Beam search with extra state"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Attention raised exact-match accuracy from 0.655 to 0.999. What limitation of the plain encoder–decoder does it remove?",
          options: [
            "The decoder's vocabulary size",
            "The single-vector bottleneck: without attention the decoder sees the source only through the bridge state, a 64-dimensional summary of an 18-character input, while with attention every decoder step reads a learned weighted average of all encoder outputs — the alignment showed each output digit pointing at its source character",
            "The need for teacher forcing",
            "The recurrence's vanishing gradient"
          ],
          answer: 1,
          why: "Bahdanau et al.'s finding on translation: the bottleneck's cost grows with sentence length, and attention removes the dependence. It also shortens the gradient path from an output to its source, which is the observation that led to the transformer."
        },
        {
          stem: "Beam search and greedy decoding agreed on all 500 test dates. When does beam search matter?",
          options: [
            "Never; it is a historical technique",
            "When the model's per-step distributions are uncertain and a locally best token leads to a globally poor sequence — translation, speech recognition — where keeping several hypotheses recovers a point or two; on a task where the model is 99.8 % sure at every step there is nothing to recover",
            "Only for very long sequences",
            "Only when the vocabulary is large"
          ],
          answer: 1,
          why: "The three beams for one example scored −0.00, −7.54 and −8.07: the alternatives were never close. Beam search is insurance against uncertainty, and its width, length normalisation and coverage penalty are tuned on validation BLEU."
        },
        {
          stem: "Top-p sampling kept 17 tokens at T = 1 and 23 at T = 2 from the same logits. Why is that the argument for top-p over top-k?",
          options: [
            "Because top-p is faster",
            "Because the nucleus adapts its size to the distribution: a confident step keeps few tokens and an uncertain one keeps many, whereas top-k keeps exactly k regardless — truncating too much when the model is unsure and too little when it is sure",
            "Because top-k cannot be combined with temperature",
            "Because top-p guarantees the argmax is included"
          ],
          answer: 1,
          why: "Holtzman et al. introduced nucleus sampling for exactly this reason: fixed-k truncation misbehaves at both ends. Both are usually applied together with a temperature in practice."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Seq2seq with and without attention, the alignment, beam search, and the sampling controls",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** Generate 12,000 date pairs in four source formats. Build a GRU encoder–decoder with a bridge, train with teacher forcing for 6 epochs, and report exact-match accuracy on 2,000 test pairs with greedy decoding." },
        { t: "p", text: "**(b)** Add Luong general attention to the decoder step, retrain, and report accuracy; also train with scheduled sampling (tf 1.0 → 0.3) and with tf = 0. For one test example print, for each output character, the source character with the highest attention weight." },
        { t: "p", text: "**(c)** Implement beam search (width 3, end token, sum of log-probabilities) and compare with greedy on 500 test pairs; print the three beams for one example." },
        { t: "p", text: "**(d)** For a random 30-way logit vector, report the entropy at temperatures 0.5, 1, 2, and the support and entropy under top-k (k = 5) and top-p (p = 0.9); repeat top-p on the T = 2 distribution." }
      ],
      requirements: [
        "(a) one accuracy.",
        "(b) three accuracies and an alignment.",
        "(c) two accuracies, a disagreement count, three beams.",
        "(d) six numbers plus the T = 2 support."
      ],
      hint: "(b) Mask padded source positions with −inf before the softmax; concatenate the context to both the GRU input and the output projection. (c) Keep finished beams in the candidate list unchanged so they compete on score. (d) Top-p: sort descending, keep tokens while the cumulative probability before each is below p, renormalise.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) no attention:  0.655

# (b) Luong attention 0.999;  scheduled sampling 0.999;  tf = 0  1.000
#     'december 2, 2026' -> '2026-12-02':  2←'2' 0←'2' 2←'2' 6←'6' -←' ' 1←' ' 2←'e' -←' ' 0←' ' 2←'2'  (weights 0.57–1.00)

# (c) greedy 0.998, beam 0.998, 0 disagreements;  beams: ('2026-12-02', −0.00) ('22066-12-02', −7.54) ('2026-12-02-2', −8.07)

# (d) entropy: T=0.5 0.75, T=1 2.46, T=2 3.18;  top-k k=5: entropy 1.26, support 5;  top-p 0.9: support 17, entropy 2.15;  top-p at T=2: support 23`,
        notes: [
          { t: "p", text: "(a) and (b) are the experiment that established attention: 34 points on a task with reordering." },
          { t: "p", text: "(c) is beam search in twelve lines, and the measurement that says when it is worth them." },
          { t: "p", text: "(d) is the generation toolkit: three knobs, each with a measurable effect on the distribution before a single token is sampled." }
        ]
      }
    }
  ],

  takeaways: [
    "An encoder–decoder reads the source into a state and generates the target from it, one token at a time, trained with teacher forcing (the true previous token as input); without attention the source passes through one vector, and on date translation that gave 0.655 exact matches.",
    "Attention lets each decoder step compute a distribution over source positions (scores → softmax → context) and read a weighted average of the encoder outputs: 0.999, with alignments that point each output digit at its source character.",
    "Scores can be additive (Bahdanau) or multiplicative (Luong dot/general); attention can be global or local, soft or hard; the copy mechanism mixes the attention distribution into the output so rare source tokens can be emitted.",
    "Scheduled sampling and training without teacher forcing made no difference on this short deterministic task; exposure bias is a long-generation problem.",
    "Beam search keeps the B best partial sequences and can beat greedy when per-step distributions are uncertain; here greedy and width-3 beam agreed on all 500 pairs (the second beam scored −7.5); production adds length normalisation and coverage.",
    "Temperature reshapes the distribution (entropy 0.75 → 3.18 from T = 0.5 to 2), top-k keeps a fixed number of tokens, top-p keeps a nucleus that adapts to confidence (17 tokens at T = 1, 23 at T = 2)."
  ],

  quiz: {
    title: "Seq2Seq, Attention and Beam Search — Knowledge Check",
    questions: [
      {
        stem: "What is teacher forcing and what problem does it create?",
        options: [
          "Training with a larger learning rate; instability",
          "Feeding the true previous target token as the decoder's input at each training step, so every step's loss is computed in parallel from gold prefixes; at inference the decoder feeds itself its own predictions, so it sees prefixes it never trained on — exposure bias — which scheduled sampling tries to address by mixing in model predictions during training",
          "Copying the encoder state to the decoder; a bottleneck",
          "Using a teacher network's outputs; distillation"
        ],
        answer: 1,
        why: "On the date task neither scheduled sampling nor tf = 0 changed the result, because a confident model's own prefixes are the gold prefixes; on long open-ended generation the train–test mismatch is real and is one motivation for sequence-level training and RLHF (module 8)."
      },
      {
        stem: "What is the difference between Bahdanau and Luong attention?",
        options: [
          "Bahdanau is for images, Luong for text",
          "Bahdanau scores with an additive one-layer network vᵀtanh(W₁s + W₂h_j) and computes the context before the decoder step, feeding it into the recurrence; Luong scores with a dot product (or sᵀW_a h_j) after the step and combines the context with the new state for the output — cheaper, and the form that became the transformer's scaled dot product",
          "Luong attention is not differentiable",
          "They differ only in the softmax temperature"
        ],
        answer: 1,
        why: "Both produce a distribution over source positions and a context vector; on random vectors the two scores gave different alignments ([0, 0.95, …] vs [0.006, 0.042, 0.071, …, 0.879, …]) because they are different functions with different weights. The multiplicative form generalised."
      },
      {
        stem: "Why does beam search need length normalisation?",
        options: [
          "Because long sequences use more memory",
          "Because a hypothesis's score is a sum of log-probabilities, each ≤ 0, so every additional token lowers the score and the search prefers short outputs; dividing by length^α (α ≈ 0.6–1) removes the bias — the measured beams showed the effect: the correct 10-character output at −0.00 against longer ones at −7.5 and −8.1",
          "To keep the beam width constant",
          "Because the end token has zero probability"
        ],
        answer: 1,
        why: "Without normalisation translation models truncate sentences; with too much they ramble. A coverage penalty complements it by rewarding hypotheses that attended to every source position."
      },
      {
        stem: "What does the copy (pointer) mechanism add to a seq2seq model?",
        options: [
          "A second encoder",
          "The ability to output a source token directly: the final distribution mixes the vocabulary softmax with the attention distribution over source positions, p(w) = p_gen·P_vocab(w) + (1 − p_gen)·Σ a_j, so names, numbers and rare words in the input can be reproduced even if they are out of vocabulary",
          "A cache of previous outputs",
          "A constraint that outputs are permutations of the input"
        ],
        answer: 1,
        why: "Summarisation and data-to-text need to reproduce entities verbatim; the pointer-generator network made that a learned choice per step. Retrieval-augmented generation in the GenAI course is the same instinct at document scale."
      },
      {
        stem: "Which decoding method would you choose for machine translation, and which for a chatbot?",
        options: [
          "Sampling for both",
          "Beam search (width 4–8, length-normalised) for translation, where there is a right answer and the metric rewards it; sampling with temperature and top-p for a chatbot, where diversity and naturalness matter and beam search produces repetitive, generic text",
          "Greedy for both",
          "Beam search for both"
        ],
        answer: 1,
        why: "The date task showed beam and greedy agreeing when the model is confident; translation models are not that confident. Open-ended generation is the opposite regime: the most likely sequence is often the dullest, and nucleus sampling was introduced to fix exactly that."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Seq2Seq, Attention and Beam Search",
    sub: "The encoder–decoder and its bottleneck, attention's mechanism and evidence, decoding strategies, and the generation controls.",
    questions: [
      {
        level: "Core",
        q: "Explain the encoder–decoder architecture and the attention mechanism, with evidence that attention matters.",
        strong: "An encoder reads the source sequence into states — here a bidirectional GRU producing one vector per source character — and a decoder generates the target one token at a time from a state initialised by a bridge from the encoder's final states, fed the previous target token (teacher forcing in training, its own prediction at inference). Without attention everything the decoder knows about the source passes through that initial state, a single 64-dimensional vector; on translating dates between formats that model reached 65.5 % exact matches. Attention removes the bottleneck: at each decoder step the current state is scored against every encoder output (Luong's sᵀW_a h_j), the scores are softmaxed into a distribution over source positions, and the weighted average of the encoder outputs — the context — is concatenated to the decoder's input and to its output projection. The same model with attention reached 99.9 %, and the learned alignment is readable: for 'december 2, 2026' each output digit of '2026-12-02' attends to the source character it came from with weights near 1.0. Attention also shortens the gradient path from output to source from the length of the sequence to one step, which is the property the transformer (module 5) built everything on.",
        answer: [
          { t: "p", text: "Both halves of the architecture, the bottleneck, the attention computation, the executed 34-point gain, the alignment, and the gradient-path remark." }
        ]
      },
      {
        level: "Core",
        q: "How does beam search work, and when is it worth using?",
        strong: "Keep the B best partial output sequences instead of one. At each step, extend every live beam by its B most probable next tokens, score each candidate by the sum of its log-probabilities, keep the B best overall, mark beams that emitted the end token as finished but still competing, and stop when all are finished or a length limit is reached. It approximates the most probable whole sequence, which greedy decoding — the best token at each step — can miss when an early locally-best token leads to a poor continuation. It is worth using when per-step distributions are genuinely uncertain: translation and speech recognition gain a point or two of BLEU or WER with widths of 4 to 8. On the date task the model was 99.8 % sure at every step, greedy and beam agreed on all 500 test examples, and the runner-up beam scored −7.5 against the winner's −0.00. Two corrections are standard in production: length normalisation, because summed log-probabilities penalise longer hypotheses, and a coverage penalty in translation so that every source position is attended. For open-ended generation beam search is the wrong tool — it finds the most probable and therefore most generic text — and sampling with temperature and top-p is used instead.",
        answer: [
          { t: "p", text: "The algorithm, when it helps with the executed null result, the two corrections, and the regime where sampling replaces it." }
        ]
      },
      {
        level: "Core",
        q: "What do temperature, top-k and top-p do to a decoder's distribution?",
        strong: "All three act on the logits before a token is sampled. Temperature divides the logits by T: below 1 it sharpens the distribution toward the argmax, above 1 it flattens it — on a 30-way distribution with entropy 2.46 nats, T = 0.5 gave 0.75 and T = 2 gave 3.18; T → 0 is greedy decoding. Top-k zeroes everything but the k most probable tokens and renormalises: at k = 5 the support is 5 and the entropy 1.26, whatever the model's confidence. Top-p, nucleus sampling, keeps the smallest set of tokens whose cumulative probability exceeds p: at p = 0.9 it kept 17 tokens from the T = 1 distribution and 23 from the flatter T = 2 one — the truncation adapts to the model's uncertainty, which is why it replaced top-k as the default. In practice a temperature and a top-p are combined; the failure modes are repetition at low temperature and incoherence at high, and a repetition penalty is the usual third control. Beam search, by contrast, is a search for the most probable sequence and is used where one right answer exists.",
        answer: [
          { t: "p", text: "Each control's mechanism with the executed entropies and supports, the adaptivity argument for top-p, and the practical combination." }
        ]
      }
    ]
  }
});
