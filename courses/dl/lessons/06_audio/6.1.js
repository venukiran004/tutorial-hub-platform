/* ============================================================================
   LESSON 6.1 — The Signal: Sampling, Nyquist, Bit Depth
   Mirrors 08_Audio_Speech_Processing.md · §1. Storage arithmetic and the
   aliasing demonstration executed in scratchpad/dl/d61.py.
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "**Before any model touches speech, a continuous pressure wave has been turned into integers, and every choice in that conversion constrains what the model can possibly learn.** Sample rate sets the highest frequency that exists at all. Bit depth sets the noise floor. Get either wrong and no architecture recovers the information — which is why a model trained on 16 kHz audio degrades badly on telephone speech, and why that degradation is not a modelling problem.",

  objectives: [
    "State the Nyquist limit and derive it from a sample rate",
    "Explain why speech uses 16 kHz and music 44.1 kHz",
    "Describe aliasing and why resamplers low-pass filter first",
    "Compute the storage cost of raw audio and of features"
  ],

  prerequisites: ["5.5"],

  blocks: [

    { t: "h2", n: "01", text: "The parameters", id: "parameters" },

    { t: "table", head: ["Term", "What it is", "Speech default"],
      rows: [
        ["Sample rate", "Measurements per second", "**16,000 Hz**"],
        ["Nyquist frequency", "Highest representable frequency = rate / 2", "8,000 Hz"],
        ["Bit depth", "Bits per sample", "16-bit signed"],
        ["Channels", "Microphones", "1 (mono) for ASR"],
        ["Frame", "A short slice analysed as one unit", "25 ms"]
      ] },

    { t: "h2", n: "02", text: "Why 16 kHz", id: "nyquist" },

    { t: "math", tex: "f_{\\text{Nyquist}} = \\frac{f_s}{2}" },

    { t: "p", text: "Nyquist says a sampled signal can represent frequencies up to half the sample rate, and no higher. Speech intelligibility lives below 8 kHz: the **formants** that distinguish vowels sit under 3 kHz, and fricatives like `/s/` reach 4–8 kHz. So 16 kHz captures everything recognition needs. Music needs the full ~20 kHz of human hearing, hence 44.1 kHz." },

    { t: "diagram", kind: "flow", title: "Sample rate and what survives",
      caption: "Telephony's 8 kHz rate puts the Nyquist limit at 4 kHz, which cuts straight through the fricative band.",
      cols: 3,
      nodes: [
        { id: "t", label: "8 kHz — telephone", sub: "Nyquist 4 kHz", tone: "crit" },
        { id: "s", label: "16 kHz — speech", sub: "Nyquist 8 kHz", tone: "good" },
        { id: "m", label: "44.1 kHz — music", sub: "Nyquist 22.05 kHz", tone: "accent" },
        { id: "f", label: "Formants < 3 kHz", sub: "vowel identity", tone: "teal" },
        { id: "fr", label: "Fricatives 4–8 kHz", sub: "/s/ vs /f/", tone: "warn" }
      ],
      edges: [["t", "f"], ["s", "f"], ["s", "fr"], ["m", "fr"]] },

    { t: "callout", kind: "insight", title: "This is why `/s/` and `/f/` are hard on a phone call",
      body: [{ t: "p", text: "Telephone audio is sampled at 8 kHz, so nothing above 4 kHz exists — and the energy that distinguishes `/s/` from `/f/` lives in exactly that band. The confusion you experience spelling a name over the phone is not a perceptual failing, it is missing data. The same applies to models: a system trained on 16 kHz audio and deployed on telephony sees inputs where half the spectrum is empty, and accuracy collapses. The fix is retraining or fine-tuning on 8 kHz data, not a better decoder, because no amount of modelling recovers frequencies the ADC never recorded." }] },

    { t: "h2", n: "03", text: "Aliasing", id: "aliasing" },

    { t: "callout", kind: "trap", title: "Frequencies above Nyquist do not vanish — they fold back",
      body: [{ t: "p", text: "A 9 kHz tone sampled at 16 kHz does not disappear; it reappears as a 7 kHz tone that was never in the original signal. The sampling process cannot distinguish them, and once the samples exist the false frequency is indistinguishable from a real one. This is why **every resampler low-pass filters before it downsamples** — if you naively drop every other sample to halve a rate, everything above the new Nyquist folds into your audible band as noise that no later processing can remove. If you are writing resampling code yourself rather than using `torchaudio.transforms.Resample` or `soxr`, this is the mistake you will make." }] },

    { t: "h2", n: "04", text: "What it costs to store", id: "storage" },

    { t: "out", text: `  16,000 samples/s x 16 bits x 1 ch = 256,000 bit/s = 32 KB/s
  one minute of raw PCM: 1.92 MB
  same minute as 80-band log-mel at 100 fps: 6000 x 80 x 4 bytes = 1.92 MB` },

    { t: "callout", kind: "note", title: "The features are exactly the same size, and that is the point",
      body: [{ t: "p", text: "Both come to 1.92 MB per minute — the reference's arithmetic checks out exactly. Log-mel is not a compression scheme, and anyone who introduces it as one has the wrong idea. It is a **perceptually weighted re-representation**: the same quantity of numbers, arranged so that the axes correspond to what matters for recognition rather than to raw physics. The learnability improves enormously; the storage does not change at all. Lesson 6.2 covers why that rearrangement helps." }] },

    { t: "h2", n: "04b", text: "What lives where in the spectrum", id: "spectrum" },

    { t: "table", head: ["Band", "What is there", "Lost at 8 kHz sampling?"],
      rows: [
        ["80–300 Hz", "Fundamental frequency — pitch, speaker identity", "No"],
        ["300–3,000 Hz", "Formants F1 and F2 — vowel identity", "No"],
        ["2,000–4,000 Hz", "F3, consonant transitions, intelligibility", "Partly"],
        ["4,000–8,000 Hz", "Fricative energy — `/s/`, `/f/`, `/th/`", "**Yes, entirely**"],
        ["Above 8,000 Hz", "Breathiness, air, perceived quality", "Yes, and also at 16 kHz"]
      ] },

    { t: "callout", kind: "mental", title: "The 300–3,400 Hz telephone band was chosen deliberately",
      body: [{ t: "p", text: "Early telephony engineers measured which band carried the most intelligibility per unit of bandwidth and settled on roughly 300 to 3,400 Hz — enough for vowels and most consonant transitions, and cheap to transmit. It was a good engineering compromise and it is why phone calls are intelligible at all. What it sacrificed is the fricative band, which is why spelling a name over the phone is genuinely hard rather than merely annoying, and why the NATO alphabet exists. Understanding that the constraint is a hundred-year-old bandwidth decision, not a codec artefact, makes it clear why no amount of modern processing fixes it." }] },

    { t: "h2", n: "05", text: "Bit depth", id: "bit-depth" },

    { t: "p", text: "16-bit signed gives 65,536 levels and a dynamic range of about 96 dB, which comfortably exceeds the roughly 60 dB range of ordinary speech. The practical consequences are about handling rather than resolution:" },

    { t: "dl", items: [
      ["Integer or float", "Files store `int16` in [−32768, 32767]; models want `float32` in [−1, 1]. Dividing by 32768 is the conversion, and forgetting it feeds the network values 32,000× too large."],
      ["Clipping", "Samples that hit the limits are flat-topped and cannot be recovered. Check for runs at ±32767 in recordings you did not make yourself."],
      ["24-bit and 32-bit float", "Used in production recording for headroom during mixing. For ASR the extra depth carries essentially nothing, so 16-bit is standard."]
    ] },

    { t: "exercise", kind: "practice", title: "Hear aliasing happen", difficulty: "intermediate", minutes: 30,
      prompt: "Generate a tone sweeping from 100 Hz to 15 kHz at a 32 kHz sample rate. Downsample to 16 kHz two ways: by naively taking every second sample, and with a proper resampler that low-pass filters first. Plot the spectrogram of each and identify where the naive version's frequencies fold back. Then compute the Nyquist frequency for 8 kHz, 16 kHz, 22.05 kHz and 44.1 kHz, and mark which speech sounds each preserves.",
      hints: [
        "`torchaudio.transforms.Resample` filters correctly; `x[::2]` does not.",
        "The fold-back is a mirror image — frequencies above the new Nyquist reflect downward.",
        "A sweep makes the folding visible as a V shape in the spectrogram."
      ],
      solution: {
        notes: [
          { t: "p", text: "The naive version produces a spectrogram where the sweep rises to 8 kHz and then descends again — the reflection is unmistakable once you see it, and it makes clear that aliasing is not noise but a deterministic, structured corruption. The properly resampled version simply stops at 8 kHz, having discarded the content above it. Discarding is correct; folding is not." },
          { t: "p", text: "The point worth carrying forward is that aliasing is irreversible. Once the samples exist, the false 7 kHz component is a real component of your signal and nothing downstream can identify it as spurious. That is why the filter has to come before the decimation, and why this is one of the few audio bugs that genuinely cannot be fixed later in the pipeline." }
        ]
      } }

  ],

  takeaways: [
    "Nyquist: a sample rate of `f_s` represents frequencies up to `f_s/2` and no higher.",
    "16 kHz for speech captures formants (<3 kHz) and fricatives (4–8 kHz); 44.1 kHz for music.",
    "Telephone audio at 8 kHz cuts the fricative band, which is why `/s/` and `/f/` confuse — and why models degrade on telephony.",
    "Frequencies above Nyquist fold back as lower frequencies that were never there, irreversibly.",
    "Always low-pass filter before downsampling.",
    "One minute at 16 kHz/16-bit is 1.92 MB — and 80-band log-mel at 100 fps is also 1.92 MB.",
    "Log-mel is a perceptual re-representation, not compression."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is the highest frequency representable at a 16 kHz sample rate?",
      options: ["16 kHz", "8 kHz", "32 kHz", "It depends on bit depth"],
      answer: 1,
      why: "The Nyquist frequency is half the sample rate. That is why 16 kHz is the speech standard — it covers formants below 3 kHz and fricatives up to 8 kHz, which is everything recognition needs. Bit depth affects the noise floor, not the frequency range." },
    { stem: "You downsample 32 kHz audio to 16 kHz by taking every second sample. What happens?",
      options: ["Nothing — it is a valid downsample", "Content above 8 kHz folds back as false lower frequencies", "The audio becomes quieter", "The file size doubles"],
      answer: 1,
      why: "Everything above the new Nyquist aliases into the audible band as frequencies that were never present, and once sampled they are indistinguishable from real content. This is why resamplers low-pass filter before decimating — it is one of the few audio bugs that genuinely cannot be fixed downstream." },
    { stem: "Is log-mel a compression of the waveform?",
      options: ["Yes — it is much smaller", "No — one minute is 1.92 MB either way", "Yes, by about 10×", "It depends on the number of mel bands"],
      answer: 1,
      why: "The arithmetic works out identically: 16 kHz 16-bit PCM is 1.92 MB per minute, and 80-band log-mel at 100 frames per second with float32 is also 1.92 MB. The benefit is that the axes correspond to perception rather than raw physics, which makes the representation far more learnable at the same size." },
    { stem: "Why does a model trained on 16 kHz audio perform badly on telephone speech?",
      options: ["Telephone audio is noisier", "8 kHz sampling means nothing above 4 kHz exists, removing the fricative band", "The bit depth is lower", "Phone codecs add latency"],
      answer: 1,
      why: "The Nyquist limit at 8 kHz sampling is 4 kHz, and the energy distinguishing `/s/` from `/f/` sits between 4 and 8 kHz. The information is absent from the recording, so no decoder recovers it — the fix is training or fine-tuning on 8 kHz data." }
  ] },

  interview: { title: "Interview", sub: "Audio fundamentals", questions: [
    { level: "Core", q: "Why is 16 kHz the standard sample rate for speech?",
      strong: "Nyquist gives 8 kHz, which covers formants and fricatives — everything recognition needs.",
      answer: [{ t: "p", text: "Nyquist says you can represent frequencies up to half the sample rate, so 16 kHz gives you everything below 8 kHz. Speech intelligibility lives in that range: the formants that distinguish one vowel from another are below about 3 kHz, and fricatives like `/s/` and `/sh/` carry their energy between 4 and 8 kHz. Sampling faster would capture content that does not help recognition while doubling the data. Music is different because it uses the full range of human hearing up to about 20 kHz, which is why 44.1 kHz became the CD standard. The practically important corollary is telephony at 8 kHz — the Nyquist limit there is 4 kHz, which cuts straight through the fricative band, so a model trained on 16 kHz audio degrades sharply on phone calls and needs retraining rather than a better decoder." }] },
    { level: "Senior", q: "You inherit an audio pipeline with mixed sample rates. What do you do?",
      strong: "Normalise to one rate with a proper resampler, and decide that rate from the deployment target.",
      answer: [{ t: "p", text: "First I would audit what rates are actually present, because mixed-rate data usually means mixed provenance and the rate often correlates with something else — telephony recordings at 8 kHz being a different acoustic condition as well as a different rate. Then normalise to a single rate using a filtering resampler, never naive decimation, since anything above the new Nyquist folds back irreversibly. Which rate to choose comes from deployment: if the product will see telephone audio, training everything at 16 kHz means the model has never encountered a band-limited signal and WER can double, so I would either train on both conditions or downsample everything to 8 kHz and accept the ceiling that imposes. Upsampling 8 kHz audio to 16 kHz does not help — it inserts no information, it just makes the tensor shapes match while leaving the upper half of the spectrum empty, which is arguably worse because it hides the problem. I would also check for clipping, since runs of samples at the integer limits indicate recordings that were overdriven and cannot be repaired." }] },
    { level: "Senior", q: "Explain aliasing and why it matters in an audio pipeline.",
      strong: "Content above Nyquist folds back irreversibly, so filtering must precede any downsampling.",
      answer: [{ t: "p", text: "A frequency above the Nyquist limit does not get discarded when you sample — it reflects and appears as a lower frequency that was never in the signal. A 9 kHz tone sampled at 16 kHz becomes an indistinguishable 7 kHz tone. What makes it serious is that it is irreversible: once the samples exist, the false component is a genuine component of your data and nothing downstream can identify it as spurious. So any operation that reduces the sample rate must low-pass filter first, which is what every proper resampler does and what naive slicing like `x[::2]` does not. In a pipeline this matters wherever rates change — ingesting mixed-rate data, handling telephony, or resampling for a model that expects a specific rate. I would use `torchaudio.transforms.Resample` or `soxr` rather than writing it, and if I inherited a pipeline with unexplained high-frequency noise, naive decimation somewhere upstream is where I would look first." }] }
  ] }
});
