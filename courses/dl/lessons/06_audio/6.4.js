/* ============================================================================
   LESSON 6.4 — Self-Supervised Speech and the Three ASR Architectures
   Mirrors 08_Audio_Speech_Processing.md · §6, §7.
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "**Transcribing speech is expensive, and that economic fact shaped the field.** Self-supervised pretraining learns representations from unlabelled audio and then needs only a fraction of the labels — wav2vec 2.0 reached usable word error rates with **ten minutes** of transcribed audio where a supervised model needed hundreds of hours. On top of those representations sit three architectures for turning audio into text, and choosing between them is a latency decision far more than an accuracy one.",

  objectives: [
    "Contrast wav2vec 2.0's contrastive objective with HuBERT's masked prediction",
    "Explain why self-supervision mattered for low-resource languages",
    "Distinguish CTC, RNN-T and attention encoder-decoder",
    "Choose an ASR architecture from a streaming requirement"
  ],

  prerequisites: ["6.3"],

  blocks: [

    { t: "h2", n: "01", text: "Learning from unlabelled audio", id: "ssl" },

    { t: "table", head: ["Model", "Pretext task", "Key mechanism"],
      rows: [
        ["**wav2vec 2.0**", "Contrastive: identify the true quantised latent for a masked span among distractors", "CNN encoder over the **raw waveform** → transformer → product-quantised targets"],
        ["**HuBERT**", "Masked prediction of *cluster IDs* from an offline k-means over features", "Iterative: cluster, predict, re-cluster on better features"],
        ["**WavLM**", "HuBERT plus simulated overlapped speech and noise", "Built for meetings, diarisation, separation"],
        ["**Whisper**", "None — plain supervised, at 680k hours", "Scale of weakly-labelled web data instead of a pretext task"]
      ] },

    { t: "callout", kind: "insight", title: "Ten minutes of labels instead of hundreds of hours",
      body: [{ t: "p", text: "That is the number that changed the field. Pretraining on unlabelled audio — which is abundant for almost any language — and fine-tuning on a tiny labelled set made ASR feasible where a transcribed corpus does not exist and would cost a fortune to create. For most of the world's languages that is the difference between having speech recognition and not having it. The same shift happened in vision and text, but the labelling cost for speech is unusually high, so the effect was unusually large." }] },

    { t: "diagram", kind: "compare", title: "Contrastive against masked prediction",
      caption: "Both mask spans and predict what was hidden. They differ in what the target is, and that changes how hard they are to train.",
      columns: [
        { title: "wav2vec 2.0 — contrastive", tone: "accent", items: [
          "Target: the true quantised latent for the masked span",
          "Must be distinguished from sampled distractors",
          "Needs negative sampling, a temperature, and a diversity loss",
          "More machinery, and more ways to become unstable"
        ] },
        { title: "HuBERT — masked prediction", tone: "good", items: [
          "Target: a k-means cluster ID assigned offline",
          "Ordinary cross-entropy over cluster labels",
          "No negatives, no temperature",
          "Trains more stably; needs an iterative re-clustering loop"
        ] }
      ] },

    { t: "callout", kind: "mental", title: "The interview version",
      body: [{ t: "p", text: "wav2vec 2.0 is contrastive over quantised latents; HuBERT is masked prediction over k-means cluster IDs, which sidesteps the negative-sampling machinery entirely and is easier to train stably. Both learn **representations** — neither is an ASR system until you attach a CTC head and fine-tune. That last clause is the one people miss: downloading wav2vec 2.0 does not give you a transcriber, it gives you an encoder." }] },

    { t: "p", text: "Whisper is the interesting outlier. It uses no pretext task at all — just supervised training on 680,000 hours of weakly-labelled web audio. It demonstrates that at sufficient scale, noisy supervision substitutes for clever self-supervision, which is a recurring pattern in modern machine learning." },

    { t: "h2", n: "02", text: "Three ways to produce text", id: "architectures" },

    { t: "table", head: ["", "**CTC**", "**RNN-T**", "**Attention enc-dec**"],
      rows: [
        ["Streams?", "Yes", "**Yes — the on-device standard**", "No, without hacks"],
        ["Output dependency", "Conditionally independent per frame", "Autoregressive over labels", "Fully autoregressive"],
        ["Built-in LM", "None", "Yes — the prediction network", "Yes — the decoder"],
        ["Alignment", "Marginalised over monotonic alignments", "Marginalised, in 2-D", "Learned by cross-attention, free to reorder"],
        ["Typical use", "wav2vec fine-tunes, forced alignment", "Phone keyboards, in-car, live captions", "Whisper, batch transcription"],
        ["Failure mode", "Cannot model that 'the' follows 'of'", "Heavier, trickier to train", "Can hallucinate fluent text unconstrained by the audio"]
      ] },

    { t: "callout", kind: "insight", title: "CTC is fast and dumb about language; attention is accurate and cannot stream; RNN-T is the compromise",
      body: [{ t: "p", text: "That one sentence covers most of what the choice involves. CTC's conditional independence between frames — the assumption lesson 3.10 identified — means it has no idea that `the` is likely after `of`, so it needs an external language model at decode time. An attention decoder has a language model built in and reorders freely, which is why Whisper is so fluent and also why it can hallucinate whole sentences that were never spoken. RNN-T adds a prediction network that conditions on previous *labels* while keeping the alignment monotonic and streamable, which is precisely the combination on-device dictation needs. It is the reason your phone can transcribe as you speak." }] },

    { t: "h2", n: "03", text: "The streaming constraint", id: "streaming" },

    { t: "p", text: "Whether a system can emit text before the utterance finishes is usually the binding requirement, and it eliminates options immediately." },

    { t: "dl", items: [
      ["Live captions, dictation, voice assistants", "Must stream. RNN-T, or CTC with a causal encoder. An attention encoder-decoder cannot, because its encoder is bidirectional over the whole utterance."],
      ["Batch transcription of recordings", "No streaming constraint, so use the most accurate option — which is currently an attention model like Whisper."],
      ["Forced alignment", "CTC, because its monotonic lattice gives you timings directly. This is how subtitle timings and phoneme boundaries get produced."],
      ["Keyword spotting", "Neither — a small always-on classifier, covered in lesson 6.8."]
    ] },

    { t: "callout", kind: "warn", title: "Whisper hallucinates on silence and noise",
      body: [{ t: "p", text: "Because an attention decoder is a language model conditioned on audio, it can continue producing fluent, plausible text when the audio contains nothing to transcribe — subtitle-style boilerplate, repeated phrases, or invented sentences during long silences. This is a well-documented and widely reproduced failure, and it is structural rather than a bug: the decoder's language modelling is what makes it accurate and is also what lets it run free. In production you guard against it with voice activity detection to avoid decoding silence at all, and by checking the average token log-probability and no-speech probability that the model reports." }] },

    { t: "exercise", kind: "practice", title: "Compare the three on the same audio", difficulty: "advanced", minutes: 45,
      prompt: "Take a pretrained wav2vec 2.0 CTC model and Whisper, and transcribe the same set of recordings with both. Compare word error rate, latency to first token, and behaviour on two adversarial inputs: thirty seconds of silence, and audio with heavy background noise. Then decode the CTC model's output twice, greedily and with an n-gram language model, and measure how much the language model buys.",
      hints: [
        "`torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H` gives a CTC model with a decoder.",
        "For the silence test, feed actual silence — what each model outputs is the interesting part.",
        "The LM gain on CTC is usually large, which is the point of the exercise."
      ],
      solution: {
        notes: [
          { t: "p", text: "The silence test is the one to run first. A CTC model will emit blanks and produce nothing, which is the correct answer. An attention model may produce fluent invented text, because nothing in its decoder requires the output to be grounded in the audio. That single comparison makes the architectural difference concrete in a way the table cannot, and it explains why production systems put voice activity detection in front of Whisper rather than trusting it with arbitrary input." },
          { t: "p", text: "The language model comparison typically shows a large improvement for CTC — often several points of word error rate — because CTC's conditional independence assumption means it genuinely has no notion of which word sequences are likely. The same experiment on an attention model shows much less gain, since the decoder already is a language model. That asymmetry is the practical consequence of the conditional independence assumption, and it is worth measuring once so the architecture table stops being abstract." },
          { t: "p", text: "On latency, an attention model cannot produce any output until the encoder has processed the whole utterance, so its time to first token scales with utterance length. A streaming CTC or RNN-T system emits as it goes. If your application is interactive, that difference dominates every accuracy consideration — users notice a two-second delay far more than a one-point word error rate difference." }
        ]
      } }

  ],

  takeaways: [
    "Self-supervised pretraining let wav2vec 2.0 reach usable WER with ten minutes of labels instead of hundreds of hours.",
    "wav2vec 2.0 is contrastive over quantised latents; HuBERT is masked prediction over k-means cluster IDs and trains more stably.",
    "Neither is an ASR system until a CTC head is attached and fine-tuned.",
    "Whisper uses no pretext task — 680k hours of weakly-labelled supervision instead.",
    "CTC streams but is conditionally independent per frame, so it needs an external language model.",
    "Attention encoder-decoders are accurate and cannot stream; they can hallucinate fluent text on silence.",
    "RNN-T is the streaming compromise with a built-in label language model — the on-device standard."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is the key difference between wav2vec 2.0 and HuBERT?",
      options: ["One uses raw waveform, the other log-mel", "wav2vec 2.0 is contrastive over quantised latents; HuBERT does masked prediction of k-means cluster IDs", "HuBERT is supervised", "wav2vec 2.0 is larger"],
      answer: 1,
      why: "The pretext task differs. Contrastive learning needs negative sampling, a temperature and a diversity loss; HuBERT's masked prediction over offline cluster IDs is ordinary cross-entropy, which sidesteps that machinery and trains more stably at the cost of an iterative re-clustering loop." },
    { stem: "Which ASR architecture is the on-device standard for dictation?",
      options: ["CTC", "RNN-T", "Attention encoder-decoder", "Whisper"],
      answer: 1,
      why: "RNN-T streams while conditioning on previously emitted labels, so it has an internal language model and can still emit text before the utterance ends. CTC streams but has no language modelling; attention models have language modelling but cannot stream. RNN-T is the combination on-device dictation requires." },
    { stem: "Why does a CTC model need an external language model?",
      options: ["It is too small", "Its frame predictions are conditionally independent, so it cannot model which word sequences are likely", "It cannot handle long audio", "Its vocabulary is limited"],
      answer: 1,
      why: "CTC assumes each frame's prediction is independent of the others given the input, so nothing in the model knows that `the` commonly follows `of`. An external language model supplies that at decode time, and the gain is typically several points of word error rate — much larger than it would be for an attention model, which already is a language model." },
    { stem: "Whisper produces fluent text for a recording of pure silence. Why?",
      options: ["A bug in the decoder", "Its attention decoder is a language model that can generate text unconstrained by the audio", "The audio was not actually silent", "The sample rate was wrong"],
      answer: 1,
      why: "An attention decoder generates autoregressively with a built-in language model, and nothing structurally requires its output to be grounded in the input. That language modelling is what makes it fluent and accurate, and also what lets it hallucinate. Production systems use voice activity detection and the model's no-speech probability as guards." }
  ] },

  interview: { title: "Interview", sub: "ASR architecture", questions: [
    { level: "Core", q: "Compare CTC, RNN-T and attention encoder-decoder for ASR.",
      strong: "A latency decision: CTC streams but has no LM, attention has an LM but cannot stream, RNN-T does both.",
      answer: [{ t: "p", text: "The one-line version is that CTC is fast and dumb about language, attention models are accurate and cannot stream, and RNN-T is the compromise that made on-device dictation work. CTC predicts a symbol per frame with conditional independence between frames, so it streams naturally and gives you monotonic alignments for free — useful for forced alignment — but it has no idea which word sequences are likely and needs an external language model at decode time. An attention encoder-decoder has a language model built into its decoder and can reorder freely, which makes it the most accurate option and is why Whisper works so well; but its encoder is bidirectional over the whole utterance, so no output appears until the audio ends, and its language modelling lets it hallucinate fluent text on silence. RNN-T keeps the monotonic streaming alignment while adding a prediction network conditioned on previously emitted labels, so it gets an internal language model without giving up streaming. The choice is usually made by whether the application is interactive." }] },
    { level: "Senior", q: "Why did self-supervised pretraining matter so much for speech?",
      strong: "Transcription is expensive, so reducing the labelled requirement to minutes changed which languages were feasible.",
      answer: [{ t: "p", text: "Because the labelling cost in speech is unusually high — someone has to listen and type, which is slow and requires a fluent speaker of the language. Supervised ASR historically needed hundreds of hours of transcribed audio, and for most of the world's languages that corpus simply does not exist. wav2vec 2.0 showed you could pretrain on unlabelled audio, which is abundant almost everywhere, and then fine-tune to usable word error rates with around ten minutes of labels. That is a change of kind rather than degree: it moved ASR from something available for a few dozen well-resourced languages to something achievable for many more. The mechanism is the same as pretraining elsewhere — learn the structure of the domain from raw data, then attach a small task head — but the economics made the impact larger here. The thing to keep straight is that the pretrained model is an encoder, not a recogniser; you still need a CTC or transducer head and a fine-tuning stage before it transcribes anything." }] },
    { level: "Senior", q: "How would you guard against Whisper hallucinating in production?",
      strong: "VAD in front of it, and check the model's own no-speech and log-probability signals.",
      answer: [{ t: "p", text: "The root cause is structural — an attention decoder is a language model conditioned on audio, and nothing forces its output to be grounded — so I would treat it as something to contain rather than fix. First, voice activity detection in front, so segments with no speech are never decoded at all; most hallucination happens on silence or non-speech noise, and simply not asking the question removes it. Second, Whisper reports a no-speech probability and average token log-probability per segment, and thresholding on those catches a good share of the rest; a segment with low average log-probability is usually invented. Third, I would look for the characteristic signatures — exact repetition of a phrase, and subtitle boilerplate like channel credits that it learned from its training data — and filter them. And for anything consequential I would want a confidence signal surfaced to whoever consumes the transcript, rather than presenting fluent text as though it were equally reliable throughout. If hallucination were unacceptable rather than undesirable, I would use a CTC model instead and accept the accuracy cost, because CTC emits blanks on silence and cannot invent language it did not hear." }] }
  ] }
});
