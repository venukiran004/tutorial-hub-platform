/* ============================================================================
   LESSON 6.7 — Decoding, Biasing and Text to Speech
   Mirrors 08_Audio_Speech_Processing.md · §12, §13.
   ========================================================================= */
EC.receiveLesson({
  id: "6.7",

  lede: "**The acoustic model gives probabilities; decoding turns them into text, and that is where product quality is won.** The single highest-value trick in commercial ASR is not a better model — it is contextual biasing, injecting the user's own contact list into the beam so that *\"Call Aoife\"* succeeds where a generic model fails. This lesson covers decoding, then runs the pipeline in reverse for text to speech, where the same tension between quality and streaming reappears.",

  objectives: [
    "Distinguish greedy, beam and prefix beam search, and say why CTC needs the third",
    "Apply shallow fusion and contextual biasing",
    "Describe the four stages of a TTS pipeline",
    "Contrast autoregressive and non-autoregressive acoustic models",
    "Explain why streaming TTS chunks on clauses rather than token counts"
  ],

  prerequisites: ["6.6", "3.9"],

  blocks: [

    { t: "h2", n: "01", text: "Decoding", id: "decoding" },

    { t: "table", head: ["Method", "What it does", "When"],
      rows: [
        ["**Greedy / best path**", "Argmax per frame, then collapse", "CTC, latency-critical — surprisingly close to beam for strong models"],
        ["**Beam search**", "Keep the best `k` prefixes by accumulated score", "The default everywhere else"],
        ["**Prefix beam search**", "Beam search that merges paths collapsing to the same text", "The *correct* beam search for CTC"],
        ["**Shallow fusion**", "Add `λ · log P_LM(y)` to the beam score", "Cheap way to inject a domain language model"],
        ["**Contextual biasing**", "Boost a per-session word list", "The single highest-value trick in product ASR"]
      ] },

    { t: "callout", kind: "trap", title: "Plain beam search double-counts on CTC",
      body: [{ t: "p", text: "Lesson 6.5 established that many frame-level paths collapse to the same text — five of them for a three-frame `ab`. Ordinary beam search treats those as distinct hypotheses, so the beam fills with different spellings of the *same* output while genuinely different candidates are pruned away. **Prefix beam search** merges paths that collapse identically, summing their probabilities, which is both correct and much more effective use of the beam. If you are decoding CTC with a generic beam search implementation, you are quietly wasting most of your beam width." }] },

    { t: "h2", n: "02", text: "Biasing", id: "biasing" },

    { t: "p", text: "A generic model has never seen your contacts, your playlist names, or your company's part numbers, and those are precisely the words a user most wants recognised. Contextual biasing boosts a per-session word list during decoding." },

    { t: "callout", kind: "insight", title: "Biasing is what makes an assistant feel personal",
      body: [{ t: "p", text: "*\"Call Aoife\"* fails against a generic model — the name is rare in the training data and the acoustics are ambiguous — and succeeds when the beam is boosted toward the names in the user's contact list, injected at session start. The implementations vary: a weighted finite-state transducer, a trie of boosted prefixes checked during beam expansion, or simply prompting a prompt-conditioned model with the relevant vocabulary. The point is that the information is available at request time and costs nothing to supply, and no amount of general model improvement substitutes for it. When someone reports that an assistant *\"never gets my friend's name right\"*, this is nearly always the missing piece." }] },

    { t: "p", text: "**Shallow fusion** is the general form: add `λ · log P_LM(y)` to the beam score during search. It is cheap, requires no retraining, and matters most for CTC, whose conditional independence assumption means it has no internal language model at all. For an attention model or RNN-T the gain is smaller, since they already carry one." },

    { t: "h2", n: "03", text: "Text to speech", id: "tts" },

    { t: "out", text: `  text -> TEXT NORMALISATION -> PHONEMES -> ACOUSTIC MODEL -> VOCODER -> waveform
          "$3.50" -> "three     grapheme     mel spectrogram   mel -> audio
           dollars fifty"       to phoneme` },

    { t: "table", head: ["Stage", "Job", "Representative models"],
      rows: [
        ["**Normalisation**", "Numbers, dates, currency, abbreviations into spoken words", "Rules plus a small seq2seq"],
        ["**G2P**", "Letters to phonemes, with a lexicon for exceptions", "Dictionary plus neural fallback"],
        ["**Acoustic model**", "Phonemes to mel spectrogram, with duration and pitch", "Tacotron 2, FastSpeech 2"],
        ["**Vocoder**", "Mel to waveform", "Griffin-Lim (fast, robotic), WaveNet (excellent, slow), **HiFi-GAN** (the practical default)"]
      ] },

    { t: "callout", kind: "warn", title: "Normalisation is the stage that embarrasses you in a demo",
      body: [{ t: "p", text: "The acoustic model and vocoder get the attention, and the front end is what fails publicly. `$3.50` must become *three dollars fifty*; `Dr.` is *doctor* or *drive* depending on context; `1/2` is *a half* or *January the second* or *one slash two*; `2025` is *twenty twenty-five* as a year and *two thousand and twenty-five* as a quantity. These are genuinely hard and largely unglamorous, which is why they are usually rules with a neural fallback rather than a learned model — and why a system that sounds superb on prepared sentences can mangle an address." }] },

    { t: "h2", n: "04", text: "Autoregressive or not", id: "ar" },

    { t: "diagram", kind: "compare", title: "Tacotron 2 against FastSpeech 2",
      caption: "The same trade as ASR: the autoregressive model sounds better and can fail catastrophically.",
      columns: [
        { title: "Tacotron 2 — autoregressive", tone: "warn", items: [
          "Decodes one mel frame at a time with attention",
          "Sounds natural — prosody emerges from the sequence model",
          "Attention can slip: babbling, early stopping, repeated words",
          "Slow, and latency scales with output length"
        ] },
        { title: "FastSpeech 2 — non-autoregressive", tone: "good", items: [
          "Explicit duration predictor per phoneme",
          "Generates all frames in parallel",
          "Roughly an order of magnitude faster",
          "Cannot lose alignment — there is no attention to slip"
        ] }
      ] },

    { t: "p", text: "For a real-time agent that robustness is worth more than the last sliver of naturalness. A TTS system that occasionally babbles is not shippable at any quality level, and *cannot lose alignment* is a much stronger guarantee than *rarely loses alignment*." },

    { t: "h2", n: "05", text: "Where it has gone since", id: "modern" },

    { t: "p", text: "Neural audio codecs — EnCodec, SoundStream — turn audio into discrete tokens, and a language model over those tokens does TTS. That is the VALL-E approach, and it is what enables **voice cloning from a few seconds of reference audio**: the reference is simply a prompt prefix in the token sequence. The same trick underlies speech-to-speech models, where audio tokens go in and audio tokens come out with no text in between." },

    { t: "callout", kind: "good", title: "For agents, streaming TTS matters more than quality",
      body: [{ t: "p", text: "Synthesise the first clause while the language model is still writing the rest, so audio starts in roughly 200 ms instead of after the full sentence. The critical implementation detail is **where you chunk**: on punctuation and clause boundaries, never on a fixed token count. Chunking every N tokens will cut mid-phrase, and since prosody — the pitch and timing contour — is computed per chunk, the result has an audible discontinuity in the middle of a noun phrase. Users forgive slightly synthetic-sounding speech and do not forgive speech that sounds like it was spliced together, which it was." }] },

    { t: "exercise", kind: "practice", title: "Decode and synthesise", difficulty: "advanced", minutes: 45,
      prompt: "Take a CTC model's frame probabilities and decode three ways: greedy, plain beam search, and prefix beam search. Compare the outputs and count how many distinct texts survive in the beam for each method — plain beam search should show duplicates. Then add shallow fusion with a small n-gram language model and measure the change. Separately, build a biasing list of ten unusual names, and measure recognition accuracy on utterances containing them with and without boosting.",
      hints: [
        "For plain beam search, track the frame-level paths; for prefix beam, track collapsed text.",
        "Count unique collapsed strings in the beam — that is the wasted-width measurement.",
        "For biasing, boosting the log-probability of the first token of each name is enough to see the effect."
      ],
      solution: {
        notes: [
          { t: "p", text: "The beam-occupancy count is the measurement worth making. With plain beam search a large share of the beam holds different frame alignments of the same text, so an apparent width of 10 might carry only three or four distinct hypotheses. Prefix beam search merges them and uses the full width on genuinely different candidates, which is why it both scores better and is the correct algorithm rather than just a faster one." },
          { t: "p", text: "The biasing experiment usually produces the largest single improvement anyone measures on a product-like test set, because rare proper nouns are exactly where a general model is weakest and exactly what users care about most. It also shows the limits: boosting too aggressively makes the model hallucinate contact names into unrelated audio, so the weight is a precision-recall dial rather than a free win, and it should be tuned against utterances that contain none of the boosted words." },
          { t: "p", text: "Greedy decoding being close to beam search for a strong model is worth confirming, because it changes the engineering calculus. If the gap is a fraction of a point, the latency-critical path can use greedy and reserve beam search for offline rescoring — which is the two-pass idea from lesson 6.6 in a different guise." }
        ]
      } }

  ],

  takeaways: [
    "CTC needs *prefix* beam search — plain beam search fills with different spellings of the same text.",
    "Shallow fusion adds `λ · log P_LM(y)` to the beam score; it matters most for CTC, which has no internal LM.",
    "Contextual biasing of a per-session word list is the highest-value trick in product ASR.",
    "TTS is normalisation → G2P → acoustic model → vocoder.",
    "Normalisation is unglamorous and is what fails publicly: `$3.50`, `Dr.`, `1/2`, `2025`.",
    "Tacotron 2 is autoregressive and can babble; FastSpeech 2 predicts durations and cannot lose alignment.",
    "Neural audio codecs plus a token language model give VALL-E-style TTS and few-second voice cloning.",
    "Stream TTS by chunking on clause boundaries, never on fixed token counts, or prosody breaks mid-phrase."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does CTC need prefix beam search rather than plain beam search?",
      options: ["It is faster", "Many frame paths collapse to the same text, so a plain beam fills with duplicates", "CTC outputs are not probabilities", "Plain beam search cannot handle blanks"],
      answer: 1,
      why: "Lesson 6.5 showed five of 27 three-frame paths collapsing to `ab`. Plain beam search treats those as distinct hypotheses, so the beam holds different spellings of one output while genuinely different candidates are pruned. Prefix beam search merges them and sums their probabilities, using the full width on real alternatives." },
    { stem: "What is contextual biasing and why does it matter?",
      options: ["Fine-tuning on user data", "Boosting a per-session word list during decoding — contacts, playlists, part numbers", "Adjusting the acoustic model's priors", "Weighting the training set"],
      answer: 1,
      why: "Rare proper nouns are where a general model is weakest and where users care most. Injecting the user's contact list at session start and boosting those prefixes in the beam turns `Call Aoife` from a failure into a success, and it is information available for free at request time that no general model improvement substitutes for." },
    { stem: "Why choose FastSpeech 2 over Tacotron 2 for a real-time voice agent?",
      options: ["It sounds more natural", "It predicts durations explicitly, so it generates in parallel and cannot lose alignment", "It uses less memory", "It supports more languages"],
      answer: 1,
      why: "Tacotron 2's attention can slip, producing babbling, early stopping or repeated words — a failure that is unacceptable at any quality level. FastSpeech 2's explicit duration predictor removes the attention entirely, making it roughly ten times faster and structurally incapable of that failure." },
    { stem: "Where should streaming TTS chunk its input?",
      options: ["Every 20 tokens", "On punctuation and clause boundaries", "Every 500 ms of predicted audio", "At sentence ends only"],
      answer: 1,
      why: "Prosody is computed per chunk, so a chunk that cuts mid-phrase produces an audible discontinuity inside a noun phrase. Clause boundaries are where prosody naturally resets. Fixed token counts will eventually split anywhere, and sentence ends are too coarse to get audio started in 200 ms." }
  ] },

  interview: { title: "Interview", sub: "Decoding and TTS", questions: [
    { level: "Core", q: "How would you improve a deployed ASR system's accuracy on user-specific terms?",
      strong: "Contextual biasing — inject the session's word list into the beam.",
      answer: [{ t: "p", text: "Contextual biasing, before anything involving retraining. The failure is almost always on rare proper nouns — contact names, playlist titles, part numbers — which a general model has barely seen and which users notice immediately. The information is available at request time for free: you know whose phone it is, so you know the contact list. Implemented as a trie of boosted prefixes checked during beam expansion, or a weighted FST, or by prompting a prompt-conditioned model with the relevant vocabulary. It is the single highest-value trick in product ASR and it requires no model changes. The caveat is that the boost weight is a precision-recall dial rather than a free win — boost too hard and the model starts hallucinating contact names into unrelated audio — so I would tune it against a set of utterances that deliberately contain none of the boosted terms. Shallow fusion with a domain language model is the more general version of the same idea." }] },
    { level: "Senior", q: "Walk me through a TTS pipeline and where it fails.",
      strong: "Normalisation, G2P, acoustic model, vocoder — and normalisation is what fails publicly.",
      answer: [{ t: "p", text: "Four stages. Text normalisation expands numbers, dates, currency and abbreviations into spoken words. Grapheme-to-phoneme converts letters to phonemes with a lexicon for exceptions. An acoustic model turns phonemes into a mel spectrogram with durations and pitch. A vocoder turns mel into a waveform, with HiFi-GAN the practical default. Where it fails in public is normalisation — `$3.50` has to become three dollars fifty, `Dr.` is doctor or drive depending on context, `2025` is twenty twenty-five as a year and two thousand and twenty-five as a quantity. Those are unglamorous and largely rule-based, and a system that sounds superb on prepared sentences will mangle an address. The other failure worth naming is autoregressive acoustic models: Tacotron 2 sounds excellent and its attention can slip into babbling or stopping early, which is not shippable at any quality level. FastSpeech 2 predicts durations explicitly, generates in parallel, and structurally cannot lose alignment, which for a real-time agent is worth more than the last sliver of naturalness." }] },
    { level: "Senior", q: "A voice agent feels slow even though the TTS model is fast. What would you look at?",
      strong: "Whether TTS streams and where it chunks — time to first audio, not total synthesis time.",
      answer: [{ t: "p", text: "The metric that matters is time to first audio, and a model with excellent throughput can still be slow to start if it waits for the whole text. I would check whether synthesis begins while the language model is still generating — chunk the LLM's output and synthesise the first clause immediately, which gets audio started in around 200 milliseconds rather than after the full sentence. Then where the chunking happens: it must be on punctuation and clause boundaries, never a fixed token count, because prosody is computed per chunk and cutting mid-phrase produces an audible splice inside a noun phrase. Users tolerate slightly synthetic speech and do not tolerate speech that sounds stitched together. Beyond TTS I would look at the whole chain, since the perceived delay is endpointing plus ASR plus LLM first token plus TTS first audio, and endpointing — deciding the user has actually finished speaking — is frequently the largest and least examined component. An aggressive endpointer feels snappy and interrupts people; a conservative one feels sluggish." }] }
  ] }
});
