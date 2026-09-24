/* ============================================================================
   LESSON 6.3 — MFCCs, and Whether You Still Need Them
   Mirrors 08_Audio_Speech_Processing.md · §4, §5. Decorrelation and energy
   compaction measured on a real 3.4-second speech recording — a synthetic
   tone signal gives the opposite answer, which is noted (scratchpad/dl/d63.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "**MFCCs solve a problem that no longer exists, and the measurement shows both halves of that sentence.** Adjacent log-mel bands on real speech correlate at **0.95** — wildly redundant — and the DCT cuts that by 62 % while packing 98 % of the energy into 13 of 40 coefficients. That was essential when the acoustic model was a Gaussian mixture with diagonal covariance. For a neural network it is information thrown away for nothing.",

  objectives: [
    "Describe the full front end and where the DCT sits in it",
    "Measure the correlation between log-mel bands and what the DCT does to it",
    "Quantify what truncating to 13 coefficients discards",
    "Choose between MFCC, log-mel and raw waveform for a given system"
  ],

  prerequisites: ["6.2"],

  blocks: [

    { t: "h2", n: "01", text: "The full pipeline", id: "pipeline" },

    { t: "diagram", kind: "steps", title: "Waveform to MFCC",
      caption: "Log-mel is the output of step five. MFCC adds two more, and modern systems stop at five.",
      items: [
        { label: "Frame", sub: "25 ms windows, 10 ms hop", tone: "accent" },
        { label: "Window", sub: "Hann — prevents spectral leakage", tone: "accent" },
        { label: "|FFT|²", sub: "257 power bins", tone: "teal" },
        { label: "Mel filterbank", sub: "40 or 80 triangular filters", tone: "teal" },
        { label: "log", sub: "← modern systems stop here", tone: "good" },
        { label: "DCT", sub: "decorrelate and compact", tone: "violet" },
        { label: "Keep 13", sub: "MFCC", tone: "warn" }
      ] },

    { t: "h2", n: "02", text: "The redundancy the DCT removes", id: "decorrelation" },

    { t: "out", text: `  REAL SPEECH: 54,400 samples @ 16000 Hz = 3.40 s
  log-mel (40, 341)

  mean correlation, ADJACENT bands : +0.9524
  mean |correlation|, all pairs    : 0.7348
  mean correlation, ADJACENT MFCCs : +0.2622
  mean |correlation|, all MFCC pairs: 0.2807
  DCT cut mean |correlation| by 62%` },

    { t: "callout", kind: "insight", title: "Adjacent mel bands correlate at 0.95",
      body: [{ t: "p", text: "The filterbank's triangles overlap by design, so neighbouring bands measure overlapping slices of the same spectrum — and on real speech the result is a correlation of **0.9524** between adjacent bands and 0.7348 averaged over all pairs. That is enormous redundancy. The DCT is an orthogonal rotation into a basis where that structure is largely gone, bringing the mean absolute correlation down to 0.2807. Nothing is lost in the rotation itself; the DCT is invertible. What loses information is the truncation that follows." }] },

    { t: "callout", kind: "note", title: "A synthetic signal gives the opposite answer",
      body: [{ t: "p", text: "I first ran this on three pure tones plus noise and got mean absolute band correlation of 0.0877 — with the *MFCCs* coming out more correlated than the log-mel bands, which inverts the textbook claim. The reason is that a few isolated tones excite a handful of bands independently and produce none of the broad spectral envelope that real speech has. The measurement was not wrong; the signal was not speech. It is a good reminder that verifying a claim about a domain requires data from that domain, and that a synthetic test can confidently tell you the opposite of the truth." }] },

    { t: "h2", n: "03", text: "Energy compaction", id: "compaction" },

    { t: "out", text: `  first  1 coefficients:  71.00% of energy
  first  2 coefficients:  88.61% of energy
  first  5 coefficients:  94.35% of energy
  first 13 coefficients:  98.22% of energy
  first 20 coefficients:  99.20% of energy
  first 40 coefficients: 100.00% of energy

  truncating to 13: mean abs error 0.5191 on a range of 18.80 = 2.76%` },

    { t: "p", text: "**The first coefficient alone holds 71 % of the energy** — it is essentially overall loudness, which is why it is often discarded for speaker-independent work. Thirteen coefficients reach 98.22 %, and reconstructing log-mel from them gives a mean absolute error of 2.76 % of the feature's range. So the classic choice of 13 is well judged: it captures the spectral envelope and discards the fine structure." },

    { t: "callout", kind: "mental", title: "Low coefficients are the envelope, high ones are the pitch",
      body: [{ t: "p", text: "The cepstrum is a spectrum of a log spectrum, so its low coefficients describe slow variation across frequency — the broad shape of the vocal tract's response, which is what determines the phoneme. High coefficients describe rapid variation, which is the harmonic comb produced by the glottal pulse train — pitch. Truncating to 13 therefore keeps *what was said* and discards *who said it and at what pitch*, which is exactly right for speaker-independent recognition and exactly wrong for speaker identification. That single fact explains most of the feature choices in classical speech processing." }] },

    { t: "h2", n: "03b", text: "What the DCT is doing geometrically", id: "geometry" },

    { t: "p", text: "The DCT is an orthogonal change of basis. Instead of describing the log spectrum by its value in each of 40 mel bands, it describes it as a weighted sum of 40 cosine shapes of increasing frequency *across the frequency axis*." },

    { t: "dl", items: [
      ["Coefficient 0", "The flat shape — overall level. Measured at 71 % of the total energy, which is essentially loudness."],
      ["Low coefficients", "Slow shapes: the broad tilt and curvature of the spectrum. This is the vocal tract's resonance pattern, which determines the phoneme."],
      ["High coefficients", "Fast shapes: rapid ripple across frequency, which is the harmonic comb of the glottal pulse train — pitch and voice quality."]
    ] },

    { t: "callout", kind: "insight", title: "Why 'cepstrum' and 'quefrency' are not just jokes",
      body: [{ t: "p", text: "The names are deliberate anagrams — cepstrum from spectrum, quefrency from frequency — and they mark a genuine conceptual inversion. The cepstrum is a spectrum *of a log spectrum*, so its axis is not frequency but a rate of variation across frequency, measured in seconds. A high quefrency component corresponds to a rapid ripple across the spectrum, which in speech is caused by a harmonic series, whose spacing is the pitch period. That is why pitch detection is classically done by finding a peak in the cepstrum: a periodic excitation produces a spike at the quefrency equal to its period. The inverted vocabulary is a warning that you are working in a domain where the usual intuitions about the axes do not transfer." }] },

    { t: "h2", n: "04", text: "Why it no longer matters", id: "obsolete" },

    { t: "p", text: "Decorrelation was essential when the acoustic model was a **Gaussian mixture with diagonal covariance**. A diagonal covariance matrix assumes features are independent given the state, and log-mel bands correlating at 0.95 violate that outright — the model would be badly mis-specified. The DCT made the assumption approximately true." },

    { t: "callout", kind: "crit", title: "A neural network models correlation natively, so the DCT only costs you",
      body: [{ t: "p", text: "A CNN or transformer has no diagonal-covariance assumption to protect. It learns whatever correlation structure exists, and correlated inputs are not a problem — they are information. So applying the DCT and truncating removes 1.78 % of the energy and all of the pitch structure in exchange for nothing at all. Every modern speech model reflects this: Whisper uses 80-band log-mel, Conformer uses 80, and wav2vec 2.0 skips features entirely and learns its own front end from the raw waveform. If you find MFCCs in a new neural pipeline, it is almost always inherited from a template rather than chosen." }] },

    { t: "table", head: ["Feature", "Use it when"],
      rows: [
        ["**MFCC (13 + deltas)**", "Classical GMM-HMM, tiny embedded keyword spotters, speaker ID with i-vectors — anywhere 13 numbers per frame is the budget"],
        ["**Log-mel (80 bands)**", "Any neural ASR or TTS of the last decade. Whisper 80, Conformer 80"],
        ["**Raw waveform**", "wav2vec 2.0 and successors, which learn the front end with strided convolutions"]
      ] },

    { t: "out", text: `  MFCC 13             13 numbers/frame ->  5 KB per second
  MFCC 13 + d + dd    39 numbers/frame -> 15 KB per second
  log-mel 40          40 numbers/frame -> 16 KB per second
  log-mel 80          80 numbers/frame -> 31 KB per second` },

    { t: "p", text: "The size difference is the only remaining argument, and it matters on a microcontroller running a wake-word detector in a few kilobytes of RAM. Note that MFCC with deltas and delta-deltas is 39 numbers — essentially the same as 40-band log-mel, so if you were adding dynamic features anyway the saving has already evaporated." },

    { t: "exercise", kind: "practice", title: "Measure the redundancy yourself", difficulty: "intermediate", minutes: 40,
      prompt: "On a real speech recording, compute 40-band log-mel and the band-to-band correlation matrix — confirm adjacent bands correlate above 0.9. Apply the DCT and measure the correlation among the first 13 cepstral coefficients. Then reconstruct log-mel from 13 coefficients and measure the error. Finally, train the same small classifier on MFCC-13, MFCC-39 and log-mel-40 features for a simple task such as digit or speaker classification, and compare.",
      hints: [
        "Use real speech — synthetic tones give the opposite correlation result.",
        "`torchaudio.functional.create_dct(40, 40, 'ortho')` gives an invertible transform.",
        "For speaker classification, expect the feature ranking to differ from digit classification."
      ],
      solution: {
        notes: [
          { t: "p", text: "The two classification tasks should rank the features differently, and that is the most useful outcome. Log-mel typically wins for content classification because the network exploits the correlation the DCT would have removed. For speaker identification the picture is more interesting, since pitch information lives in the high cepstral coefficients that truncation discards — so MFCC-13 can actually be a *worse* speaker feature than log-mel despite MFCCs' history in that field, where they were paired with explicit pitch features." },
          { t: "p", text: "On real speech I measured adjacent-band correlation at 0.9524 and the DCT reducing mean absolute correlation by 62 %. If your numbers are much lower, check that you are using speech rather than music or tones — I got 0.0877 on synthetic tones, which inverted the conclusion entirely. Broad spectral envelope is what creates the correlation, and only real voiced speech has it." },
          { t: "p", text: "The reconstruction error quantifies the trade precisely: 13 of 40 coefficients hold 98.22 % of the energy and reconstruct log-mel to within 2.76 % of its range. So MFCCs are not a lossy disaster — they are a well-chosen summary. The point is simply that for a neural network the 1.78 % is free to keep, and the pitch structure it contains is sometimes exactly what you need." }
        ]
      } }

  ],

  takeaways: [
    "The front end is frame, window, |FFT|², mel filterbank, log — and modern systems stop there.",
    "On real speech, adjacent log-mel bands correlate at +0.9524; mean absolute correlation over all pairs is 0.7348.",
    "The DCT is an invertible rotation that cut mean absolute correlation by 62 %.",
    "13 of 40 coefficients hold 98.22 % of the energy; reconstruction error is 2.76 % of the range.",
    "The first coefficient alone is 71 % — essentially loudness.",
    "Low cepstral coefficients are the spectral envelope (the phoneme); high ones are pitch.",
    "Decorrelation mattered for diagonal-covariance GMMs. Neural networks model correlation natively, so the DCT only discards information.",
    "A synthetic tone signal gives the opposite correlation result — verify domain claims on domain data."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why were MFCCs designed to decorrelate the mel bands?",
      options: ["To reduce storage", "Gaussian mixtures with diagonal covariance assume independent features, which correlated bands violate", "To improve frequency resolution", "To remove noise"],
      answer: 1,
      why: "A diagonal covariance matrix assumes features are conditionally independent, and adjacent log-mel bands correlating at 0.9524 breaks that outright. The DCT rotated into a basis where the assumption was approximately true. Neural networks have no such assumption, which is why the step became unnecessary." },
    { stem: "How much energy do the first 13 cepstral coefficients retain?",
      options: ["About 50 %", "98.22 %", "About 71 %", "100 %"],
      answer: 1,
      why: "Measured on real speech: 98.22 % across 13 of 40 coefficients, reconstructing log-mel to within 2.76 % of its range. The first coefficient alone holds 71 %, which is essentially overall loudness and is often discarded for speaker-independent work." },
    { stem: "What information sits in the high cepstral coefficients that truncation discards?",
      options: ["Background noise", "Pitch — the harmonic structure from the glottal pulse train", "Loudness", "Frequency resolution"],
      answer: 1,
      why: "The cepstrum is a spectrum of a log spectrum, so high coefficients capture rapid variation across frequency, which is the harmonic comb of the voice's pitch. Low coefficients capture the slow variation that is the vocal tract's envelope, and therefore the phoneme. Truncating keeps what was said and discards who said it." },
    { stem: "Should you use MFCCs for a new neural ASR system?",
      options: ["Yes — they are the standard", "No — use 80-band log-mel or raw waveform; the DCT only discards information", "Yes, with deltas", "Only for streaming"],
      answer: 1,
      why: "The DCT existed to satisfy a diagonal-covariance assumption that neural models do not make. Whisper uses 80-band log-mel, Conformer uses 80, and wav2vec 2.0 learns from the raw waveform. MFCCs remain reasonable only where 13 numbers per frame is a hard budget, such as a microcontroller keyword spotter." }
  ] },

  interview: { title: "Interview", sub: "Feature choice", questions: [
    { level: "Core", q: "What are MFCCs and do you still need them?",
      strong: "DCT of log-mel truncated to 13. Not for neural models — they were for diagonal-covariance GMMs.",
      answer: [{ t: "p", text: "You take the log-mel spectrogram, apply a DCT across the frequency axis, and keep the first 12 or 13 coefficients. The DCT does two things: it decorrelates, and it compacts energy into the low coefficients. On real speech I measured adjacent log-mel bands correlating at 0.95, and the DCT cutting mean absolute correlation by 62 per cent while the first 13 coefficients held 98.2 per cent of the energy. That decorrelation mattered enormously when the acoustic model was a Gaussian mixture with diagonal covariance, because such a model assumes independent features and correlated bands violate the assumption outright. A neural network models correlation natively, so the DCT is now pure loss — you discard the fine structure, which includes pitch, in exchange for nothing. Every modern system reflects that: Whisper and Conformer take 80-band log-mel, and wav2vec 2.0 takes the raw waveform. I would only reach for MFCCs where 13 numbers a frame is a hard budget, like an embedded keyword spotter." }] },
    { level: "Senior", q: "What are delta and delta-delta features, and do you need them?",
      strong: "First and second time derivatives of the features — needed for GMMs, redundant for anything convolutional or attentional.",
      answer: [{ t: "p", text: "Deltas are the frame-to-frame difference of each coefficient and delta-deltas the difference of those, so they encode how the spectrum is changing rather than what it is. They mattered enormously for GMM-HMM systems because those models treat each frame independently given the state — the frame is the unit, and nothing in the model can see the neighbouring frames, so dynamic information had to be packed into the feature vector explicitly. That is why the classic configuration is 13 MFCCs plus deltas plus delta-deltas, giving 39 numbers a frame. For a neural model with any temporal receptive field — a convolution over time, a recurrent layer, an attention layer — the derivative is trivially computable from adjacent frames that the model already sees, so appending it adds parameters and no information. Worth noting the arithmetic too: 13 plus deltas plus delta-deltas is 39 numbers, essentially the same as 40-band log-mel, so the size argument for MFCCs evaporates as soon as you add the dynamic features." }] },
    { level: "Senior", q: "When would raw waveform beat log-mel as a model input?",
      strong: "With very large data, and where fine temporal or phase structure matters.",
      answer: [{ t: "p", text: "Log-mel bakes in two assumptions — that low frequencies deserve finer resolution, and that loudness perception is logarithmic — and it also discards phase entirely, since it keeps only magnitude. Those are good assumptions for recognition, which is why log-mel has survived. Raw waveform wins when you have enough data to learn a better front end than the mel warping, which in practice means the scale wav2vec 2.0 operates at, and when phase or fine temporal structure carries task-relevant information — speaker verification, audio event detection, and anything involving source separation or spatial cues. The evidence that mel is close to right is that learned front ends tend to converge on approximately mel-like filters anyway, so at moderate data scales you are spending examples rediscovering something you could have supplied. For a project with hundreds rather than thousands of hours I would use log-mel and spend the compute elsewhere." }] }
  ] }
});
