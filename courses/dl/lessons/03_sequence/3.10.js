/* ============================================================================
   LESSON 3.10 — CTC Loss
   Mirrors 03_Sequence_Models.md · §11. Collapsing verified by implementation,
   torch.nn.CTCLoss run with gradients (scratchpad/dl/d39.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.10",

  lede: "**Sometimes you know what was said but not when it was said.** An hour of speech has thousands of audio frames and a few hundred characters of transcript, and nobody has labelled which frames correspond to which letter. CTC makes that labelling unnecessary: the network predicts a symbol at every frame, and the loss sums the probability of *every* alignment that collapses to the right answer. It is the reason speech recognition and OCR can be trained on ordinary transcripts.",

  objectives: [
    "State the alignment problem CTC solves",
    "Apply the collapsing rule and explain what the blank token is for",
    "Describe how CTC marginalises over alignments",
    "Use `torch.nn.CTCLoss` with the correct tensor layout",
    "Name the tasks CTC suits and its main assumption"
  ],

  prerequisites: ["3.9"],

  blocks: [

    { t: "h2", n: "01", text: "The alignment problem", id: "problem" },

    { t: "p", text: "Speech recognition takes maybe 1,000 audio frames and must produce maybe 50 characters. A frame-level loss needs to know which frames are the `h` in *hello* — information that labelling an hour of audio by hand would produce, and that nobody has. CTC's answer is to stop requiring it." },

    { t: "diagram", kind: "flow", title: "Many frames, few symbols",
      caption: "The network emits one distribution per frame. Collapsing turns that frame-level output into the final string.",
      cols: 3,
      nodes: [
        { id: "a", label: "1,000 audio frames", sub: "10 ms each", tone: "accent" },
        { id: "n", label: "Network", sub: "one distribution per frame", tone: "teal" },
        { id: "f", label: "h - e e - l l l - o", sub: "frame-level symbols", tone: "violet" },
        { id: "c", label: "collapse", sub: "merge repeats, drop blanks", tone: "warn" },
        { id: "o", label: "\"hello\"", sub: "the transcript", tone: "good" }
      ],
      edges: [["a", "n"], ["n", "f"], ["f", "c"], ["c", "o"]] },

    { t: "h2", n: "02", text: "Collapsing, and the blank", id: "collapsing" },

    { t: "p", text: "The rule is: merge runs of the same symbol, then delete blanks. Applied to five inputs:" },

    { t: "out", text: `  h-eel-lll-o  -> 'hello'
  hello        -> 'helo'
  h-e-l-l-o    -> 'hello'
  heelllloo    -> 'helo'
  hel-lo       -> 'hello'` },

    { t: "callout", kind: "insight", title: "The blank exists to let a symbol repeat",
      body: [{ t: "p", text: "Look at line 2: the frame sequence `hello` collapses to **`helo`**, losing an `l`. Merging runs of identical symbols is what makes the output length-invariant — the network can dwell on a long vowel for thirty frames without producing thirty vowels — but it also destroys genuine repeats. The blank is the separator that solves this: `hel-lo` keeps both `l`s because the blank breaks the run. So the blank is not 'silence' or 'no output'; it is a structural token whose job is to mark a boundary between two emissions of the same symbol. It also gives the network somewhere to put its probability mass on frames that carry no new information, which in practice is most of them." }] },

    { t: "h2", n: "03", text: "Marginalising over alignments", id: "marginalising" },

    { t: "math", tex: "P(\\text{target} \\mid x) = \\sum_{\\pi \\,\\in\\, \\mathcal{B}^{-1}(\\text{target})} \\prod_{t=1}^{T} P(\\pi_t \\mid x_t)" },

    { t: "p", text: "`B⁻¹(target)` is the set of all frame-level sequences that collapse to the target. CTC's loss is the negative log of that sum — so instead of committing to one alignment, it credits every valid one in proportion to its probability. The number of alignments is combinatorial, which is why this is computed with a forward-backward dynamic program rather than enumerated." },

    { t: "callout", kind: "mental", title: "It is the same trick as an HMM's forward algorithm",
      body: [{ t: "p", text: "If you have met hidden Markov models, CTC's dynamic program is the forward algorithm over a lattice whose states are the target string interleaved with blanks. The key insight in both cases is that you never enumerate the exponentially many paths — you accumulate probability column by column, reusing the sum over all prefixes that reach each state. That is what turns an intractable marginalisation into an `O(T · L)` computation, and it is why CTC was practical in 2006 on the hardware of the time." }] },

    { t: "h2", n: "04", text: "Running it", id: "pytorch" },

    { t: "code", lang: "python", title: "torch.nn.CTCLoss",
      code: `logits = model(audio)                     # (T, B, C) — TIME FIRST
log_probs = logits.log_softmax(2)          # CTCLoss wants log-probabilities

loss = nn.CTCLoss(blank=0, zero_infinity=True)(
    log_probs,       # (T, B, C)
    targets,         # concatenated target labels, 1-D
    input_lengths,   # (B,) frames per example
    target_lengths)  # (B,) labels per example`,
      caption: "`zero_infinity=True` guards the case where the target is longer than the input: no valid alignment exists, the loss is infinite, and without this flag the infinity propagates into the gradients and destroys the run." },

    { t: "out", text: `  input  (T=12, B=2, C=6) log-probs; targets lengths [3, 2]
  CTC loss 6.5710, gradient flows: True` },

    { t: "callout", kind: "trap", title: "CTCLoss is time-first, unlike everything else",
      body: [{ t: "p", text: "Almost every other PyTorch module accepts `batch_first=True` and most codebases use it throughout. `CTCLoss` requires `(T, B, C)` with **time as the first dimension** and offers no option. Passing `(B, T, C)` does not raise an error when B and T happen to be compatible sizes — it silently interprets your batch dimension as time, computes a meaningless loss, and trains. The other layout trap is that `targets` is a single concatenated 1-D tensor with a separate lengths vector, not a padded 2-D tensor. Both mistakes produce a model that trains to convergence and transcribes nothing." }] },

    { t: "h2", n: "05", text: "Where it fits", id: "applications" },

    { t: "dl", items: [
      ["Speech recognition", "Audio frames to characters or subwords. DeepSpeech, wav2letter, and the CTC head in wav2vec 2.0."],
      ["Handwriting and OCR", "Pixel columns to characters, where per-column labels are equally unavailable. Tesseract's LSTM engine."],
      ["Any monotonic alignment", "Keyword spotting, phoneme recognition — anything where output order follows input order."]
    ] },

    { t: "callout", kind: "tradeoff", title: "CTC assumes monotonic alignment and conditional independence",
      body: [{ t: "p", text: "Two assumptions come with it. First, the alignment must be **monotonic** — output symbols appear in the same order as the input they come from. That holds for speech and handwriting and fails completely for translation, where word order changes, which is why translation uses attention instead. Second, frame predictions are **conditionally independent** given the input: CTC has no language model of its own, and cannot use the fact that it just emitted `q` to raise the probability of `u`. This is why CTC systems are almost always paired with an external language model at decoding time, and why attention-based and RNN-transducer models eventually overtook pure CTC for speech." }] },

    { t: "exercise", kind: "practice", title: "Train a CTC model", difficulty: "advanced", minutes: 50,
      prompt: "Implement the collapsing function and verify it on cases with and without repeated characters. Then build a small CTC model on a synthetic task: generate variable-length input sequences where each target symbol is stretched over a random number of frames with noise, and train a bidirectional LSTM with CTCLoss to recover the target. Decode greedily (argmax per frame, then collapse) and measure character error rate. Finally, deliberately pass the tensors as `(B, T, C)` and observe what happens.",
      hints: [
        "Test collapsing on 'hello' as a frame sequence — it should give 'helo'.",
        "Bidirectional is fine here; CTC does not require causality.",
        "Targets go in as one concatenated 1-D tensor plus a lengths vector."
      ],
      solution: {
        notes: [
          { t: "p", text: "The collapsing test is the one to do first, because the blank's purpose only becomes obvious when you see `hello` collapse to `helo`. Every subsequent confusion about CTC outputs traces back to not having internalised that repeated symbols need a blank between them — including the common observation that a trained CTC model emits blanks on the large majority of frames, which is not a pathology but the expected behaviour." },
          { t: "p", text: "During training you should see the loss fall while greedy decoding produces nothing useful for a while, then rather suddenly start producing recognisable output. That is characteristic: the model first learns to emit blanks everywhere, which is a good local solution since blanks dominate valid alignments, and only then learns to place actual symbols. A CTC loss that falls smoothly while decoded output stays empty is normal early on rather than a sign of failure." },
          { t: "p", text: "The deliberate `(B, T, C)` experiment is worth ten minutes. When B and T are both plausible sizes nothing raises — the loss computes, gradients flow, and training proceeds against a completely meaningless objective. This is the archetypal silent shape bug, and the defence is asserting your tensor layout explicitly before the loss call rather than trusting that an error would have surfaced." }
        ]
      } }

  ],

  takeaways: [
    "CTC trains sequence models when the input-to-output alignment is unknown, as in speech and handwriting.",
    "Collapsing merges runs of identical symbols then drops blanks.",
    "`hello` as frames collapses to `helo` — the blank exists to let a symbol repeat: `hel-lo` gives `hello`.",
    "The loss marginalises over every alignment that collapses to the target, via an O(T·L) dynamic program.",
    "`nn.CTCLoss` requires `(T, B, C)` — time first, with no `batch_first` option.",
    "Targets are a concatenated 1-D tensor plus separate length vectors.",
    "CTC assumes monotonic alignment and conditional independence between frames, so it has no built-in language model."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does the frame sequence `hello` collapse to under CTC?",
      options: ["hello", "helo", "helllo", "h-e-l-l-o"],
      answer: 1,
      why: "Collapsing merges runs of identical symbols, so the two adjacent `l`s become one and you get `helo`. To produce a genuine double letter the network must emit a blank between them — `hel-lo` collapses to `hello`. This is precisely what the blank token exists for." },
    { stem: "What problem does CTC solve?",
      options: ["Vanishing gradients", "Training when the alignment between input frames and output labels is unknown", "Variable batch sizes", "Overfitting on small datasets"],
      answer: 1,
      why: "Speech has thousands of frames and a short transcript, with no per-frame labels available. CTC sums the probability of every frame-level sequence that collapses to the target, so the model learns an alignment implicitly rather than requiring one to be supplied." },
    { stem: "What tensor layout does `nn.CTCLoss` expect for its log-probabilities?",
      options: ["(B, T, C) like most PyTorch modules", "(T, B, C) — time first, with no batch_first option", "(B, C, T)", "(C, T, B)"],
      answer: 1,
      why: "Time comes first and there is no `batch_first` argument, unlike the RNN modules. Passing `(B, T, C)` with compatible sizes raises no error — it silently treats the batch dimension as time and optimises a meaningless objective while appearing to train normally." },
    { stem: "Why is CTC unsuitable for machine translation?",
      options: ["Sequences are too long", "It assumes monotonic alignment, and translation reorders words", "It cannot handle large vocabularies", "The loss is too slow"],
      answer: 1,
      why: "CTC's dynamic program only considers alignments where output order follows input order. Translation routinely reorders — German verbs move to the end, adjective order differs — so the correct alignment is not monotonic and CTC cannot represent it. Attention handles arbitrary reordering, which is why translation uses it." }
  ] },

  interview: { title: "Interview", sub: "CTC questions", questions: [
    { level: "Core", q: "Explain CTC loss and what the blank token is for.",
      strong: "It marginalises over all alignments collapsing to the target; the blank separates repeated symbols.",
      answer: [{ t: "p", text: "CTC is for training when you know the output but not its alignment to the input — speech, where you have a transcript but no per-frame labels. The network emits a distribution over the alphabet plus a blank at every frame, and any frame-level sequence that collapses to the target counts as correct. Collapsing means merging runs of identical symbols and then removing blanks, and the loss is the negative log of the summed probability of all such sequences, computed with a forward-backward dynamic program rather than enumerated. The blank is the part people misunderstand: it is not silence, it is a separator. Because collapsing merges repeats, the frame sequence `hello` would give `helo` and lose an `l` — you need `hel-lo`, with a blank between them, to get a genuine double letter. That is the blank's structural job." }] },
    { level: "Senior", q: "What are CTC's limitations?",
      strong: "Monotonic alignment only, and conditional independence between frames means no internal language model.",
      answer: [{ t: "p", text: "Two. The alignment has to be monotonic — output symbols in the same order as the input that produced them — which holds for speech and handwriting and fails for translation, where word order changes between languages. And the frame predictions are conditionally independent given the input, so the model has no internal language model: having just emitted `q` it cannot raise the probability of `u`. That is why CTC systems are nearly always decoded with an external language model, often via a beam search that combines the acoustic and language scores. It is also why attention-based encoder-decoders and RNN transducers eventually overtook pure CTC for speech, since both can condition on what they have already output. CTC remains attractive for its simplicity, its speed, and the fact that it is naturally streaming, which attention models are not." }] },
    { level: "Senior", q: "A CTC model trains — the loss falls — but decodes to empty output. What is happening?",
      strong: "Probably normal early behaviour, but check the tensor layout and target encoding before anything else.",
      answer: [{ t: "p", text: "First I would check whether it is early in training, because this is the expected trajectory: emitting blanks everywhere is a strong local solution — blanks dominate the valid alignments — so the model learns that first and starts placing real symbols later. A falling loss with empty decodes for the first while is normal rather than broken. If it persists, I would check the tensor layout, because `CTCLoss` wants `(T, B, C)` with time first and offers no `batch_first` option; passing `(B, T, C)` with compatible dimensions computes a meaningless loss without raising anything, and the model trains happily against nothing. Then the targets, which must be a concatenated 1-D tensor with separate length vectors rather than a padded 2-D tensor. After that I would verify that input length always exceeds target length — otherwise no valid alignment exists and the loss is infinite, which `zero_infinity=True` masks rather than fixes. All of these fail silently, which is why I would check layout before touching hyperparameters." }] }
  ] }
});
