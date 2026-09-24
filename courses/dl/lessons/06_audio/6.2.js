/* ============================================================================
   LESSON 6.2 — Framing and the Mel Scale
   Mirrors 08_Audio_Speech_Processing.md · §2, §3. Every mel value in the
   reference reproduced exactly; the leakage effect and the log-gain identity
   measured (scratchpad/dl/d61.py). The reference's octave framing is
   corrected against its own table.
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "**Speech is non-stationary — the spectrum during `/s/` is nothing like the spectrum during `/a/` — but over 25 ms it is approximately stationary, and that single approximation is the entire justification for framing.** Slice, window, transform, then warp the frequency axis to match perception. This lesson computes every step, reproduces all six of the reference's mel values exactly, and finds one claim in its prose that its own table contradicts.",

  objectives: [
    "Derive frame and hop sizes in samples from milliseconds",
    "Explain why windowing is necessary and measure the leakage it prevents",
    "State the time-frequency resolution trade-off",
    "Compute mel values and explain what the scale actually does",
    "Justify the log with the gain identity"
  ],

  prerequisites: ["6.1"],

  blocks: [

    { t: "h2", n: "01", text: "Framing", id: "framing" },

    { t: "out", text: `  25 ms window at 16000 Hz = 400 samples
  10 ms hop    at 16000 Hz = 160 samples -> 100 frames per second
  overlap = 240 samples = 15 ms
  n_fft=512 -> 257 bins, spacing 31.25 Hz` },

    { t: "p", text: "Every number matches the reference. **100 frames per second** is the figure every speech paper assumes, and it comes directly from the 10 ms hop. The windows overlap by 15 ms, so consecutive frames share most of their samples — which smooths the feature sequence and means a 1-second utterance gives 100 frames rather than 40." },

    { t: "diagram", kind: "timeline", title: "Overlapping frames",
      caption: "A 25 ms window advancing 10 ms at a time. The overlap is what makes the feature sequence smooth rather than blocky.",
      span: 55, tick: 10,
      lanes: [
        { label: "frame 0", bars: [[0, 25, "25 ms", "accent"]] },
        { label: "frame 1", bars: [[10, 35, "25 ms", "good"]] },
        { label: "frame 2", bars: [[20, 45, "25 ms", "violet"]] },
        { label: "frame 3", bars: [[30, 55, "25 ms", "teal"]] }
      ] },

    { t: "h2", n: "02", text: "Windowing", id: "windowing" },

    { t: "p", text: "Each frame is multiplied by a taper (Hann or Hamming) before the FFT. Without it, the frame's abrupt edges act like a rectangular pulse and smear energy across every frequency. Measured on a 1000.7 Hz tone — deliberately off a bin centre, so the frame does not contain whole cycles:" },

    { t: "out", text: `  rectangular : peak bin 32, energy >10 bins away =  1.231% of total
  hann        : peak bin 32, energy >10 bins away =  0.000% of total` },

    { t: "callout", kind: "insight", title: "Leakage falls from 1.23 % to effectively zero",
      body: [{ t: "p", text: "A pure tone should put all its energy in one place. Un-windowed, 1.23 % of it lands more than ten bins from the peak — smeared across frequencies that contain nothing. Hann windowing removes it entirely to measurement precision. The cost is a slightly wider main lobe, so frequency resolution is marginally worse, and that is a trade everybody accepts because smeared energy in a spectrogram is worse than a slightly blurred peak. The tone was chosen at 1000.7 Hz rather than a round number on purpose: a frequency that lands exactly on a bin centre contains whole cycles within the frame and shows almost no leakage, which is how you can accidentally convince yourself windowing does not matter." }] },

    { t: "h2", n: "03", text: "The resolution trade-off", id: "uncertainty" },

    { t: "out", text: `   10 ms window =  160 samples -> frequency resolution 100.00 Hz, time resolution  10 ms
   25 ms window =  400 samples -> frequency resolution  40.00 Hz, time resolution  25 ms
   50 ms window =  800 samples -> frequency resolution  20.00 Hz, time resolution  50 ms
  100 ms window = 1600 samples -> frequency resolution  10.00 Hz, time resolution 100 ms` },

    { t: "p", text: "A longer window resolves frequency better and time worse, exactly in proportion — you cannot improve both, which is the uncertainty principle. **25 ms is the compromise the field settled on for speech**, because it is long enough to resolve the pitch and formant structure and short enough that a phone does not change much within it." },

    { t: "h2", n: "04", text: "The mel scale", id: "mel" },

    { t: "math", tex: "\\text{mel}(f) = 2595 \\log_{10}\\!\\left(1 + \\frac{f}{700}\\right)" },

    { t: "out", text: `  mel(  100) =   150.49   reference   150.49   match=True
  mel(  200) =   283.23   reference   283.23   match=True
  mel(  400) =   509.38   reference   509.38   match=True
  mel( 1000) =   999.99   reference   999.99   match=True
  mel( 4000) =  2146.06   reference  2146.06   match=True
  mel( 8000) =  2840.02   reference  2840.02   match=True` },

    { t: "callout", kind: "trap", title: "The reference's octave framing contradicts its own table",
      body: [{ t: "p", text: "The prose says the gap from 100 to 200 Hz 'sounds far bigger' than the gap from 4,000 to 8,000 Hz, since both are one octave. But its own table gives those spans as **132.74 mel and 693.96 mel** — the high octave is more than five times larger in mel units, not smaller. The mel scale is not a pure logarithm; it is close to *linear* below about 1 kHz and logarithmic above, so octaves are not equal steps on it. What is actually true, and what the filterbank depends on, is resolution **per hertz**: low frequencies get 1.3274 mel per Hz against 0.1735 at the top, a factor of **7.7**. Forty times the bandwidth yields only 5.2 times the mel. That is the correct statement of the same underlying idea." }] },

    { t: "out", text: `    mel(  100) =   150.49   mel/f = 1.505
    mel( 1000) =   999.99   mel/f = 1.000
    mel( 4000) =  2146.06   mel/f = 0.537
    mel( 8000) =  2840.02   mel/f = 0.355` },

    { t: "p", text: "The `mel/f` column shows the compression directly: near 1.5 mel per Hz at 100 Hz, pinned at exactly 1.0 at 1000 Hz by the constant 2595, and down to 0.355 at 8 kHz." },

    { t: "h2", n: "05", text: "The filterbank", id: "filterbank" },

    { t: "out", text: `  filterbank shape (257, 40) (freq bins x mel filters)
    filter  0:    31.2 -    62.5 Hz  (width    31.2 Hz)
    filter  1:    62.5 -   125.0 Hz  (width    62.5 Hz)
    filter 19:  1562.5 -  1843.8 Hz  (width   281.2 Hz)
    filter 38:  6562.5 -  7468.8 Hz  (width   906.2 Hz)
    filter 39:  7000.0 -  7968.8 Hz  (width   968.8 Hz)` },

    { t: "p", text: "Triangular filters spaced equally **on the mel axis**, which makes them narrow at the bottom and wide at the top — filter 0 spans 31 Hz, filter 39 spans 969 Hz, a factor of 31. Multiplying the 257-bin power spectrum by 40 triangles collapses it to 40 numbers that follow perception rather than physics. (These edges differ slightly from the reference's, which used different filterbank normalisation and edge conventions; the shape of the progression is the point.)" },

    { t: "h2", n: "06", text: "Why the log", id: "log" },

    { t: "out", text: `  gain  2.0: power x    4, mean log shift 1.3863, std 1.10e-07, ln(4)=1.3863
  gain  4.0: power x   16, mean log shift 2.7726, std 1.55e-07, ln(16)=2.7726
  gain 10.0: power x  100, mean log shift 4.6052, std 6.58e-07, ln(100)=4.6052` },

    { t: "callout", kind: "insight", title: "Gain becomes an exact constant offset",
      body: [{ t: "p", text: "Multiplying the waveform by 4 multiplies mel power by 16, and in the log domain that is a shift of exactly `ln(16) = 2.7726` — with a standard deviation of 1.5e-07 across all 80 bands and every frame. It is a constant, not approximately a constant. That is what makes **cepstral mean normalisation** work: subtracting the per-utterance mean in the log domain removes microphone gain and channel colouration exactly, because those effects are multiplicative on the signal and therefore additive after the log. It is also why loudness differences between recordings stop being a modelling problem once you take the log." }] },

    { t: "exercise", kind: "practice", title: "Build the front end and probe it", difficulty: "intermediate", minutes: 40,
      prompt: "Compute a log-mel spectrogram from a speech recording with 25 ms windows and 10 ms hop, and verify you get 100 frames per second. Then vary the window from 10 ms to 100 ms and compare the spectrograms — identify which resolves individual pitch pulses and which resolves formants. Compute the same spectrogram with a rectangular window and with Hann, and measure the off-peak energy for a pure tone placed off a bin centre. Finally, apply a gain of 10× and confirm the log-mel difference is a constant equal to `ln(100)`.",
      hints: [
        "Use a tone at something like 1000.7 Hz, not 1000 Hz, or leakage will not appear.",
        "Short windows show vertical striations (pitch pulses); long windows show horizontal bands (formants).",
        "For the gain check, compare log-mel values element-wise, not just means."
      ],
      solution: {
        notes: [
          { t: "p", text: "The window sweep produces the classic pair of pictures: a short window resolves individual glottal pulses as vertical striations while smearing the formants, and a long window resolves the formants as horizontal bands while smearing the pulses. Neither is better — they answer different questions, and 25 ms sits between them. Seeing both once makes the uncertainty principle concrete in a way the formula does not." },
          { t: "p", text: "The off-bin-centre detail is what makes the leakage experiment work. A tone at exactly 1000 Hz with these parameters contains close to whole cycles within the frame, so the rectangular window's discontinuity is small and leakage barely appears — you can conclude windowing is unnecessary from a badly chosen test. At 1000.7 Hz I measured 1.23 % of energy more than ten bins from the peak un-windowed against effectively zero with Hann." },
          { t: "p", text: "The gain check should give a constant to about seven decimal places. It is worth confirming element-wise rather than on the mean, because that is what justifies cepstral mean normalisation: the effect is identical in every band and every frame, so a single subtraction removes it completely. If your measurement shows variance, you probably have an epsilon floor inside the log clipping quiet bins — which is a real implementation detail worth knowing about, since it breaks the identity exactly where the signal is weakest." }
        ]
      } }

  ],

  takeaways: [
    "25 ms at 16 kHz is 400 samples; a 10 ms hop is 160 samples, giving 100 frames per second.",
    "`n_fft=512` gives 257 bins spaced 31.25 Hz apart.",
    "Windowing cut off-peak leakage from 1.231 % to effectively zero for an off-bin-centre tone.",
    "Longer window means better frequency and worse time resolution, exactly in proportion.",
    "All six of the reference's mel values reproduce exactly.",
    "Its octave claim is contradicted by its own table — the real property is 7.7× more mel per Hz at low frequencies.",
    "Log turns a gain into an exact constant offset (std 1.5e-07), which is why cepstral mean normalisation works."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why is each frame multiplied by a window function before the FFT?",
      options: ["To reduce computation", "The frame's abrupt edges otherwise smear energy across all frequencies", "To normalise loudness", "To remove DC offset"],
      answer: 1,
      why: "An un-windowed frame is effectively multiplied by a rectangular pulse, whose transform has large side lobes — measured at 1.231 % of energy landing more than ten bins from a pure tone's peak. Hann windowing removed it to effectively zero, at the cost of a slightly wider main lobe." },
    { stem: "You double the analysis window from 25 ms to 50 ms. What happens?",
      options: ["Both resolutions improve", "Frequency resolution improves to 20 Hz, time resolution worsens to 50 ms", "Nothing changes", "Frequency resolution worsens"],
      answer: 1,
      why: "The two trade off exactly: 400 samples gives 40 Hz resolution, 800 samples gives 20 Hz, and the time resolution degrades correspondingly. This is the uncertainty principle, and 25 ms is the compromise the field settled on for speech." },
    { stem: "The reference says one octave at 100–200 Hz 'sounds bigger' than one at 4000–8000 Hz. Is that right in mel terms?",
      options: ["Yes — 132.74 against 693.96 mel", "No — the high octave spans more mel; the real property is resolution per Hz", "Yes, by a factor of 5", "The mel scale does not apply to octaves"],
      answer: 1,
      why: "Its own table gives 132.74 mel for the low octave and 693.96 for the high one, so the high octave is larger in mel. The mel scale is near-linear below 1 kHz rather than a pure log, so octaves are not equal steps. The correct statement is 1.3274 mel per Hz at the bottom against 0.1735 at the top — a factor of 7.7." },
    { stem: "Why take the log of the mel spectrogram?",
      options: ["To compress the file", "Loudness perception is logarithmic, and it turns multiplicative channel effects into additive offsets", "To make values positive", "To speed up training"],
      answer: 1,
      why: "Measured: a 4× waveform gain becomes an exact shift of `ln(16) = 2.7726` with standard deviation 1.5e-07 across every band and frame. Because gain and channel colouration are multiplicative on the signal, they become additive after the log, so subtracting the per-utterance mean removes them exactly." }
  ] },

  interview: { title: "Interview", sub: "Speech features", questions: [
    { level: "Core", q: "Walk me through turning a waveform into log-mel features.",
      strong: "Frame at 25 ms with 10 ms hop, window, FFT, mel filterbank, log.",
      answer: [{ t: "p", text: "Slice the waveform into 25 ms frames advancing 10 ms at a time — at 16 kHz that is 400-sample windows with a 160-sample hop, giving 100 frames per second and 15 ms of overlap between consecutive frames. Multiply each frame by a Hann window, because the abrupt edges of an un-windowed frame smear energy across the spectrum; I measured 1.23 % of a pure tone's energy landing more than ten bins from its peak without one, and effectively zero with. Then FFT, typically with `n_fft=512`, giving 257 bins about 31 Hz apart, and take the power. Multiply by a mel filterbank — triangular filters spaced equally on the mel axis, so narrow at low frequencies and wide at high — which collapses 257 bins to 40 or 80. Finally take the log, both because loudness perception is logarithmic and because it turns multiplicative channel effects into additive ones, which is what lets mean normalisation remove microphone colouration." }] },
    { level: "Senior", q: "How would you choose the number of mel bands?",
      strong: "80 for neural ASR, 40 for classical or constrained systems — driven by the model, not the audio.",
      answer: [{ t: "p", text: "80 is the default for anything neural — Whisper uses 80, Conformer uses 80 — and 40 was the classical standard that persists in embedded work where per-frame cost matters. The choice is really about how much resolution the downstream model can exploit rather than about the signal, because the underlying spectrum has 257 bins either way and you are deciding how coarsely to summarise it. More bands means finer spectral detail and a wider input layer; fewer means a smaller model and more smoothing. I would not tune this as a hyperparameter in most projects, because the gains are small and it breaks compatibility with pretrained weights, which is a much larger consideration — if you are fine-tuning Whisper you use 80 bands at 100 frames per second because that is what its encoder expects, and changing it means retraining from scratch. Where it does matter is a bespoke embedded model under a hard memory budget, and there I would sweep 20, 40 and 80 and take the smallest that holds accuracy." }] },
    { level: "Senior", q: "Why is log-mel still the standard input when we have end-to-end models?",
      strong: "It encodes perceptual structure for free and costs nothing; raw-waveform models mostly relearn it.",
      answer: [{ t: "p", text: "Because it is a well-chosen inductive bias that costs nothing. The mel warping encodes that low frequencies need finer resolution — 1.33 mel per hertz at 100 Hz against 0.17 at 8 kHz, a factor of nearly eight — and the log encodes that loudness is perceived logarithmically. Both are facts about hearing that a model would otherwise have to discover from data. The evidence that they are the right facts is that models trained directly on raw waveforms, like wav2vec 2.0's convolutional front end, tend to learn filters that look approximately mel-like anyway, so you are paying data to rediscover something known. It is also worth being precise that it is not compression: a minute of 16 kHz audio and a minute of 80-band log-mel are both about 1.92 MB. The benefit is entirely about the axes being the right ones. Raw waveform models do win when there is enormous data and the task depends on fine phase structure, which is more common in speaker and audio-event work than in recognition." }] }
  ] }
});
