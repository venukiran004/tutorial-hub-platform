/* ============================================================================
   LESSON 6.9 — Robustness, Deployment and Pitfalls
   Mirrors 08_Audio_Speech_Processing.md · §16, §17, §18. Closes the audio
   module with the things that break in production.
   ========================================================================= */
EC.receiveLesson({
  id: "6.9",

  lede: "**A model trained on clean read speech falls apart in a car at 70 km/h, and the gap is closed by augmentation rather than by architecture.** SpecAugment — masking bands of frequency and spans of time in the log-mel — is the single most effective ASR augmentation and costs nothing at all. This lesson closes the module with what makes a speech system survive contact with real audio, real devices and real evaluation.",

  objectives: [
    "Choose augmentations that match the deployment environment",
    "Explain why echo cancellation is a prerequisite for barge-in",
    "Split a system between on-device and cloud",
    "Read an RTF budget for streaming",
    "Recognise the eight pitfalls that cost the most"
  ],

  prerequisites: ["6.8"],

  blocks: [

    { t: "h2", n: "01", text: "Augmentation", id: "augmentation" },

    { t: "table", head: ["Technique", "What it simulates"],
      rows: [
        ["**SpecAugment**", "Masks bands of frequency and spans of time in the log-mel — the most effective ASR augmentation, and it is free"],
        ["Noise mixing", "Babble, road, fan noise at sampled signal-to-noise ratios"],
        ["Room impulse responses", "Far-field reverberation, so the model survives a speaker across the room"],
        ["Speed and tempo perturbation", "0.9× / 1.0× / 1.1×, which also shifts pitch — cheap speaker variety"],
        ["Codec simulation", "Encode and decode through the codecs your product actually uses"],
        ["Gain and clipping", "Microphone distance and overdriven input"]
      ] },

    { t: "callout", kind: "insight", title: "SpecAugment operates on the features, which is why it is free",
      body: [{ t: "p", text: "Noise mixing and reverberation require audio files and a convolution per example, so they cost real time in the data pipeline. SpecAugment masks rectangles directly in the log-mel array — a couple of array assignments — so it adds essentially nothing to the training loop and is applied after the expensive feature computation. It works because masking a frequency band forces the model to infer the phoneme from the remaining bands rather than relying on one cue, and masking a time span forces it to use context. It is the same argument as dropout, applied along axes that mean something. If you add one augmentation to a speech model, add this one." }] },

    { t: "callout", kind: "warn", title: "Barge-in is impossible without echo cancellation",
      body: [{ t: "p", text: "A smart speaker plays its own text-to-speech through a loudspeaker a few centimetres from its microphones. Without **acoustic echo cancellation** the device hears itself, its wake-word detector fires on its own voice, and it interrupts its own sentence. So AEC and beamforming across a microphone array are not afterthoughts bolted on for quality — they are prerequisites for the interaction model. In a car it is worse still: engine and road noise scale with speed, HVAC runs constantly, windows open, and music plays through the same speakers you are recording beside. That environment is why automotive speech teams spend more effort on the signal chain than on the recogniser." }] },

    { t: "h2", n: "02", text: "On device or in the cloud", id: "deployment" },

    { t: "table", head: ["Constraint", "Cloud", "On-device"],
      rows: [
        ["Model size", "Any", "10–200 MB after quantisation"],
        ["Latency", "Network round trip, 50–300 ms", "None"],
        ["Privacy", "Audio leaves the device", "It does not — often the deciding argument"],
        ["Availability", "Needs connectivity", "Works in a tunnel, which is why cars care"],
        ["Cost", "Per hour of audio", "One-time"],
        ["Update", "Instant", "Ships with firmware"]
      ] },

    { t: "diagram", kind: "flow", title: "The usual answer is both",
      caption: "A tiered policy that decides per utterance and degrades gracefully when the network is gone.",
      cols: 4,
      nodes: [
        { id: "v", label: "VAD + wake word", sub: "on device, always on, KB", tone: "good" },
        { id: "r", label: "Streaming RNN-T", sub: "on device, commands", tone: "teal" },
        { id: "p", label: "Policy", sub: "route per utterance", tone: "violet" },
        { id: "c", label: "Cloud model", sub: "long or unusual utterances", tone: "accent" }
      ],
      edges: [["v", "r"], ["r", "p"], ["p", "c", "escalate"]] },

    { t: "out", text: `  RTF budget for streaming on a CPU core:
     RTF 0.3  -> comfortable, room for the rest of the pipeline
     RTF 0.7  -> works, but any hiccup causes audio to queue
     RTF 1.0  -> the buffer grows without bound. Not streaming.` },

    { t: "callout", kind: "crit", title: "RTF 1.0 is not 'just fast enough'",
      body: [{ t: "p", text: "At an RTF of exactly 1.0 the system processes one second of audio per second — which sounds adequate and is in fact the point at which the input buffer grows without bound. Any momentary slowdown, any other process taking the core, any longer-than-usual utterance, and the backlog never clears. You need real headroom, and 0.3 is the figure that leaves room for feature extraction, the wake word, endpointing and whatever else shares the CPU. Quantisation to int8 typically costs a few tenths of a point of WER and buys two to four times on both size and speed, which on-device is almost always a trade worth taking." }] },

    { t: "h2", n: "03", text: "The pitfalls", id: "pitfalls" },

    { t: "table", head: ["Pitfall", "Why it hurts"],
      rows: [
        ["Training at 16 kHz, deploying on 8 kHz telephony", "The model has never seen a band-limited signal; **WER can double**. Train on both, or resample and fine-tune."],
        ["Frame-count off-by-two", "`1 + (N − win)//hop` against a padded library's count. Silently misaligns features and labels."],
        ["Comparing WER across normalisers", "Points of difference come from punctuation and number formatting, not from the model."],
        ["No VAD in front of Whisper", "It hallucinates fluent text on silence, confidently."],
        ["Beam search on CTC without prefix merging", "Paths that collapse to the same string score separately, wasting the beam."],
        ["Ignoring echo cancellation", "The assistant hears its own TTS and barges in on itself."],
        ["MOS from five raters", "The confidence interval is wider than any difference you are trying to show."],
        ["Evaluating only on read speech", "Spontaneous speech has disfluencies, restarts and overlap; read-speech WER flatters a model by a factor of two."]
      ] },

    { t: "callout", kind: "crit", title: "Read-speech WER flatters a model by about two-fold",
      body: [{ t: "p", text: "This is the pitfall that produces the largest gap between a reported number and a shipped experience. Read speech — someone reading prepared sentences in a quiet room — has no false starts, no *um*, no self-corrections, no overlapping speakers, and clean turn boundaries. Real conversation has all of them. A model reporting 5 % WER on LibriSpeech can be at 10 % or worse on spontaneous telephone speech, and the difference is entirely in the evaluation set rather than in the model. If your product handles conversation, evaluate on conversation, and treat any read-speech benchmark as an upper bound on what you will see." }] },

    { t: "callout", kind: "trap", title: "The frame-count off-by-two is the quiet one",
      body: [{ t: "p", text: "`1 + (N − win)//hop` gives the frame count for un-padded framing; a library that centre-pads gives `1 + N//hop`, which differs by roughly `win/hop` frames — two, at the standard 25 ms and 10 ms. It never raises an error. Your features and your labels are simply offset by two frames throughout, and the model learns around the misalignment while performing slightly worse than it should. It is the kind of bug that persists for months because nothing fails, and the way to catch it is to assert the frame count explicitly against the formula rather than trusting the two components agree." }] },

    { t: "exercise", kind: "practice", title: "Break a model, then fix it", difficulty: "advanced", minutes: 50,
      prompt: "Take a pretrained ASR model and measure WER on clean speech. Then degrade the audio four ways and re-measure: resample to 8 kHz and back, add babble noise at 10 dB SNR, convolve with a room impulse response, and encode through a low-bitrate codec. Rank the degradations by damage. Then apply SpecAugment during a short fine-tune and see how much of each gap it closes. Finally, evaluate the same model on read speech and on spontaneous speech and compare.",
      hints: [
        "The 8 kHz round trip is the most instructive — it removes information permanently.",
        "SpecAugment masks in the log-mel, so apply it after feature extraction.",
        "For spontaneous speech, any recording of unscripted conversation will show the gap."
      ],
      solution: {
        notes: [
          { t: "p", text: "The 8 kHz round trip usually does the most damage, and it is the one augmentation cannot fully repair — the fricative band above 4 kHz is gone, and a model can learn to cope with its absence but cannot recover the information. That is the distinction worth internalising: noise and reverberation add interference that a robust model sees through, while band-limiting removes signal permanently. Different problems, different fixes." },
          { t: "p", text: "SpecAugment should close a meaningful share of the noise and reverberation gaps despite simulating neither directly, which is the interesting part. Masking frequency bands teaches the model not to depend on any single region of the spectrum, which is exactly the robustness that noise and reverberation demand. That generality at essentially zero cost is why it became standard." },
          { t: "p", text: "The read-versus-spontaneous comparison is the one to show anyone who quotes a benchmark number. Expect roughly a doubling, and expect the errors to concentrate on disfluencies, restarts and overlapping turns — phenomena that read speech contains none of. It reframes benchmark WER as an upper bound rather than an expectation, which is the correct way to read it." }
        ]
      } }

  ],

  takeaways: [
    "SpecAugment masks frequency bands and time spans in the log-mel — most effective ASR augmentation, and free.",
    "Match augmentation to deployment: noise, reverberation, codecs and gain that your product actually encounters.",
    "Acoustic echo cancellation is a prerequisite for barge-in, not a quality improvement.",
    "Tier the system: VAD and wake word on device, streaming RNN-T on device, cloud for long or unusual utterances.",
    "RTF 1.0 means the buffer grows without bound; target 0.3 for headroom.",
    "int8 quantisation costs a few tenths of a WER point for 2–4× size and speed — almost always worth it on device.",
    "Training at 16 kHz and deploying on 8 kHz telephony can double WER.",
    "Read-speech WER flatters a model by roughly a factor of two against spontaneous speech."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why is SpecAugment described as free?",
      options: ["It requires no code", "It masks rectangles directly in the log-mel array — a couple of assignments, after feature extraction", "It runs on the GPU", "It only applies to validation data"],
      answer: 1,
      why: "Noise mixing and reverberation need audio files and a convolution per example, costing real time in the data pipeline. SpecAugment operates on the already-computed features with simple array assignments, so it adds essentially nothing to the training loop while being the most effective single ASR augmentation." },
    { stem: "Why is echo cancellation a prerequisite for barge-in?",
      options: ["It improves audio quality", "Without it the device hears its own TTS and interrupts itself", "It reduces latency", "It is required by the wake-word model"],
      answer: 1,
      why: "A smart speaker's loudspeaker is centimetres from its microphones, so its own speech is loud in the captured signal. Without acoustic echo cancellation the wake-word detector fires on the device's own voice and it interrupts its own sentence — the interaction model does not work at all, regardless of recogniser quality." },
    { stem: "Your streaming ASR runs at RTF 1.0. Is that acceptable?",
      options: ["Yes — it keeps up exactly", "No — the buffer grows without bound on any hiccup, and there is no headroom for the rest of the pipeline", "Yes, if latency is low", "Only for short utterances"],
      answer: 1,
      why: "RTF 1.0 processes one second of audio per second, leaving zero margin. Any momentary slowdown, any contention for the core, and the backlog never clears. Target around 0.3, which leaves room for feature extraction, the wake word, endpointing and everything else sharing the CPU." },
    { stem: "Your model reports 5 % WER on a read-speech benchmark. What should you expect on real conversation?",
      options: ["About the same", "Roughly double, because spontaneous speech has disfluencies, restarts and overlap", "Better, since conversation is more natural", "It depends only on the noise level"],
      answer: 1,
      why: "Read speech has no false starts, fillers, self-corrections or overlapping speakers, and clean turn boundaries — none of which is true of conversation. The gap is roughly two-fold and lives entirely in the evaluation set. Treat benchmark WER as an upper bound and evaluate on the kind of speech you will actually receive." }
  ] },

  interview: { title: "Interview", sub: "Production speech", questions: [
    { level: "Core", q: "How would you make an ASR model robust to real-world audio?",
      strong: "Augment to match the deployment environment, starting with SpecAugment.",
      answer: [{ t: "p", text: "Augmentation that matches where the model will run. SpecAugment first, because it masks bands of frequency and spans of time directly in the log-mel, costs essentially nothing since it operates on already-computed features, and is the single most effective ASR augmentation — it works by forcing the model not to depend on any one region of the spectrum or any one moment. Then the environment-specific ones: noise mixing at sampled signal-to-noise ratios with the kind of noise you expect, room impulse responses for far-field, speed perturbation at 0.9 and 1.1 for cheap speaker variety, and encoding through whatever codecs your product actually uses. In a car I would add engine and road noise scaled with speed, plus HVAC. One distinction worth drawing: noise and reverberation add interference a robust model can see through, but band-limiting — training at 16 kHz and deploying on 8 kHz telephony — removes information permanently and can double WER, so that one needs training data at the target rate rather than augmentation." }] },
    { level: "Senior", q: "How would you split a voice product between device and cloud?",
      strong: "Tiered: wake word and VAD on device always, streaming recogniser on device, cloud for hard cases.",
      answer: [{ t: "p", text: "Tiered, with a policy that decides per utterance. Always on device: VAD and the wake word, both tiny and always running, because sending continuous audio to a server is unacceptable on privacy grounds and wasteful on cost. Then a compact streaming RNN-T on device for ordinary commands, which gives zero network latency and works in a tunnel — which is exactly why automotive cares. Cloud for long or unusual utterances where the larger model's accuracy justifies the round trip, escalated by a policy that can look at confidence, utterance length or domain. The whole thing has to degrade gracefully when connectivity disappears rather than failing. On budgets, I would target an RTF around 0.3 rather than anything near 1.0, because at 1.0 the buffer grows without bound on any hiccup and there is no headroom for feature extraction and the rest of the pipeline. Quantising to int8 costs a few tenths of a WER point and buys two to four times on size and speed, which on device is nearly always the right trade." }] },
    { level: "Senior", q: "What would make you distrust a reported WER?",
      strong: "An unpublished normaliser, a read-speech test set, and no entity-level breakdown.",
      answer: [{ t: "p", text: "Three things. First, no published normaliser — I have measured identical-meaning hypotheses scoring anywhere from 0.0000 to 0.1667 purely from casing, punctuation and whether numbers were spelled out, which is a wider spread than the difference between most competing systems. A WER without its normalisation scheme is not comparable to anything. Second, evaluation on read speech only, which flatters a model by roughly a factor of two against spontaneous conversation because it contains no disfluencies, restarts or overlap. Third, no breakdown by what the errors fall on: WER weights every word equally, so a system that is slightly worse on filler words and better on names and numbers loses on WER and wins with users. I would want entity error rate alongside. And if the number were quoted as an accuracy percentage — '97 % accurate' from a WER of 0.03 — that would tell me the person does not know WER is unbounded, since insertions are divided by the reference length and can push it above 1." }] }
  ] }
});
