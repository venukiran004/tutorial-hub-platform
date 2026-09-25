/* ============================================================================
   LESSON 7.5 — Audio, Speech and Video
   Mirrors 03_Multimodal_AI.md · §5-6. Whisper's shape is measured (78% of
   its parameters are decoder), and video's token arithmetic computed — ten
   seconds at 24 fps is 61,440 tokens (scratchpad/nlp/n75.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.5",

  lede: "**Ten seconds of video at 24 fps is 61,440 visual tokens — more than most context windows, for ten seconds.** Thirty seconds of audio is 480,000 raw samples, which would be 2.3 × 10¹¹ attention entries per head per layer. Neither modality can be fed to a transformer in its natural form, and every audio and video model is fundamentally a decision about how to compress it first. This lesson covers those decisions: spectrograms for audio, and four competing strategies for video.",

  objectives: [
    "Explain why raw waveforms and raw frames cannot be tokenised directly",
    "Trace how a mel spectrogram turns audio into a fixed token sequence",
    "Read Whisper's architecture and say why ASR is encoder-decoder",
    "Compute video's token cost and evaluate the four compression strategies",
    "Derive the saving from spatio-temporal factorisation"
  ],

  prerequisites: ["7.4", "5.7"],

  blocks: [

    { t: "h2", n: "01", text: "Why raw audio is impossible", id: "raw" },

    { t: "out", text:
"16 kHz audio\n\n  1 second        16,000 samples\n  10 seconds     160,000\n  30 seconds     480,000\n  10 minutes   9,600,000\n\n30 seconds as tokens would be 2.30e+11 attention entries\nper head, per layer" },

    { t: "p", text: "The problem is identical to images in lesson 5.7: the natural representation has far more elements than a quadratic-cost mechanism can accept. And the solution is identical too — do not tokenise the raw signal. For images that meant patches; for audio it means a **spectrogram**." },

    { t: "h2", n: "02", text: "The spectrogram", id: "spectrogram" },

    { t: "out", text:
"Whisper: 16 kHz audio, 160-sample hop (10 ms), 80 mel bins\n\n  1 second    ->  100 frames x 80 mels =   8,000 values\n  10 seconds  -> 1000 frames x 80 mels =  80,000\n  30 seconds  -> 3000 frames x 80 mels = 240,000\n\n  a stride-2 convolution then halves 3000 frames to 1500\n  so Whisper's encoder always sees exactly 1500 tokens" },

    { t: "callout", kind: "insight", title: "The compression is in the time axis, not the value count",
      body: [{ t: "p", text: "Note the spectrogram has only **half** as many values as the raw waveform — 240,000 against 480,000 — which looks like a poor return. The saving is not in total values, it is in **sequence length**. 480,000 timesteps become 3,000 frames, then 1,500 after the conv, and since attention is quadratic in sequence length that is a reduction of roughly 10⁵ in attention cost. The 80 mel bins become the *feature* dimension, where cost is linear. Moving information from the quadratic axis to the linear axis is the whole manoeuvre, and it is exactly what image patching does too." }] },

    { t: "out", text:
"why a 10 ms hop\n\n  hop            frames in 30s    resolves\n  80 samples         6000          5 ms - very fine, expensive\n  160 samples        3000          10 ms - Whisper's choice\n  320 samples        1500          20 ms - coarser, cheaper\n  1600 samples        300          100 ms - misses phoneme boundaries" },

    { t: "p", text: "Phonemes last roughly 50–150 ms, so a 10 ms frame gives 5 to 15 frames per phoneme — enough to see the transitions that distinguish one from another. At 100 ms hops a whole phoneme might occupy a single frame and the distinguishing detail is gone. The hop size is a resolution choice made against the physics of speech, not an arbitrary hyperparameter." },

    { t: "h2", n: "03", text: "Whisper", id: "whisper" },

    { t: "out", text:
"openai/whisper-tiny: 37,760,640 params\n\n  encoder layers 4, decoder layers 4, d_model 384, heads 6\n  mel bins 80, max source positions 1500\n  vocabulary 51,865 (multilingual, with language tags)\n\n  encoder    8,208,384   (22%)\n  decoder   29,552,256   (78%)" },

    { t: "callout", kind: "insight", title: "78% of the parameters are decoder, despite equal layer counts",
      body: [{ t: "p", text: "Four encoder layers and four decoder layers, yet the decoder holds more than three times the parameters. Two reasons, both from earlier lessons. A decoder block is **1.33x** an encoder block because of cross-attention, which lesson 4.7 measured exactly. And the decoder carries the **output embedding** over a 51,865-token multilingual vocabulary, which at `d_model = 384` is nearly 20M parameters on its own — the same vocabulary-dominates-at-small-scale effect lesson 4.10 found in GPT-2. The audio side of a speech model is far cheaper than the text side." }] },

    { t: "callout", kind: "crit", title: "ASR is encoder-decoder for exactly the reasons lesson 5.1 predicted",
      body: [{ t: "p", text: "Source and target are **different modalities**, of **different lengths**, and the entire audio **exists before** transcription begins. That is precisely the shape lesson 5.1 identified as still favouring encoder-decoder over decoder-only, and Whisper is the clearest live example. It also gains what lesson 6.6 described: cross-attention is a target-by-source alignment matrix, and Whisper uses it literally — **word-level timestamps are read off the cross-attention weights**, telling you which audio frames produced which word. A decoder-only model has no such matrix and no equivalent way to produce them." }] },

    { t: "h2", n: "04", text: "Video's arithmetic", id: "video" },

    { t: "out", text:
"at 256 visual tokens per frame\n\n  clip     fps    frames     tokens      attention entries\n  1s        8         8      2,048           4.19e+06\n  5s        8        40     10,240           1.05e+08\n  10s      24       240     61,440           3.77e+09\n  60s      24     1,440    368,640           1.36e+11" },

    { t: "callout", kind: "crit", title: "Ten seconds exceeds most context windows",
      body: [{ t: "p", text: "**61,440 tokens** for ten seconds of ordinary video. Lesson 5.9 established that a single 1024-pixel image is already 5,329 tokens and 130% of a 4k window; video multiplies that by the frame count. A minute at 24 fps is 368,640 tokens and 1.36 × 10¹¹ attention entries. No amount of FlashAttention or ring attention makes that routine. Video is not a harder version of the image problem — it is a different problem, because the token count grows linearly with duration while attention grows quadratically with tokens." }] },

    { t: "table",
      head: ["Strategy", "How", "What it costs"],
      rows: [
        ["Sparse frame sampling", "1 fps, or keyframes only", "Misses fast motion entirely"],
        ["Spatial pooling", "Average or downsample patches before the transformer", "Loses fine spatial detail in every frame"],
        ["Bottleneck resampler", "Fixed token budget per frame or per clip", "Whatever the queries miss is gone"],
        ["Factorised attention", "Spatial pass, then temporal pass", "No single-hop cross-frame, cross-patch attention"]
      ] },

    { t: "h2", n: "05", text: "Spatio-temporal factorisation", id: "factorised" },

    { t: "out", text:
"16 frames x 196 patches = 3,136 tokens\n\n  joint attention over all tokens      9,834,496 entries\n  spatial pass, then temporal pass       664,832 entries\n\n  14.8x cheaper" },

    { t: "callout", kind: "insight", title: "The saving is real and the restriction is specific",
      body: [{ t: "p", text: "Instead of one attention over all 3,136 tokens, do attention within each frame (16 separate 196-token problems) then attention across frames at each spatial position (196 separate 16-token problems). **14.8x fewer entries**, and it is what TimeSformer and ViViT do. The cost is precise: a patch can no longer attend to a *different* patch in a *different* frame in one hop — it needs two, one spatial and one temporal. For tracking an object that moves across the frame, that matters. It is the same trade as Swin's windows in lesson 5.7: restrict attention to a structured subset, recover the missing paths through depth." }] },

    { t: "h2", n: "06", text: "The audio model landscape", id: "landscape" },

    { t: "table",
      head: ["Model", "Task", "Notable for"],
      rows: [
        ["Whisper", "Speech to text", "Encoder-decoder, 99 languages, robust to noise and accents"],
        ["Bark", "Text to speech", "Multi-speaker, emotion, non-verbal sounds"],
        ["VALL-E", "Voice cloning", "Three-second enrollment"],
        ["MusicGen", "Text to music", "Conditioned generation"],
        ["AudioLM", "Audio continuation", "Autoregressive over raw audio tokens"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Generation inverts the tokenisation problem",
      body: [{ t: "p", text: "Recognition compresses audio into something a transformer can read. **Generation** must produce audio at full rate — 16,000 samples per second — from a model that emits one token at a time. Generating a second of speech token by token at sample rate is hopeless, so generative audio models use a neural codec: an encoder that compresses waveform into a few hundred discrete tokens per second, and a decoder that reconstructs it. The transformer then predicts *codec tokens*, and the codec expands them back to audio. It is the same manoeuvre as the VAE in latent diffusion from lesson 7.4 — put the expensive sequential model in a compressed space and decode once at the end." }] },

    { t: "exercise", title: "Compute the budgets",
      tasks: [
        "Compute the sequence length for your audio at several hop sizes, and check it against your model's limit.",
        "Work out the token count for a video length and frame rate you care about, and compare it against your context window.",
        "Compute the factorisation saving for your frame count and patch count.",
        "Load Whisper and verify the encoder-to-decoder parameter split for a larger variant.",
        "Extract Whisper's cross-attention on a real clip and check whether the alignment matches the spoken timing."
      ] }
  ],

  takeaways: [
    "Thirty seconds of 16 kHz audio is 480,000 samples — 2.3e+11 attention entries, so the raw waveform can never be tokenised directly.",
    "A mel spectrogram halves the value count but reduces sequence length from 480,000 to 3,000, which is what matters when attention is quadratic.",
    "Whisper's stride-2 conv takes 3,000 frames to a fixed 1,500-token encoder input.",
    "The 10 ms hop is chosen against phoneme duration (50-150 ms), giving 5-15 frames per phoneme.",
    "whisper-tiny is 78% decoder despite equal layer counts, because decoder blocks are 1.33x and the 51,865-token vocabulary embedding is ~20M parameters.",
    "ASR is encoder-decoder because source and target are different modalities and lengths, and the audio exists in full beforehand.",
    "Whisper reads word-level timestamps directly off its cross-attention alignment matrix — something a decoder-only model cannot do.",
    "Ten seconds of video at 24 fps is 61,440 tokens; a minute is 368,640 and 1.36e+11 attention entries.",
    "Factorising attention into spatial then temporal passes is 14.8x cheaper, at the cost of no single-hop cross-frame, cross-patch attention.",
    "Generative audio inverts the problem with a neural codec — the transformer predicts codec tokens, not samples, exactly as latent diffusion predicts latents."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "A mel spectrogram has only half the values of the raw waveform. Why is it such a large saving?",
      options: ["Fewer values means less memory", "The saving is in sequence length — 480,000 timesteps become 3,000 frames — and attention is quadratic in that axis while linear in the feature axis", "Mel bins are perceptually weighted", "It removes noise"],
      answer: 1,
      why: "The 80 mel bins become the feature dimension, where cost is linear. Moving information off the quadratic axis onto the linear one reduces attention cost by roughly 10^5. That is the same manoeuvre as image patching, and it is why both modalities need a front end before the transformer." },
    { stem: "Why is whisper-tiny 78% decoder when both stacks have four layers?",
      options: ["The decoder has more layers in practice", "Decoder blocks are 1.33x an encoder block, and the decoder carries a 51,865-token output embedding worth about 20M parameters", "The encoder is quantised", "Audio features are smaller than text features"],
      answer: 1,
      why: "Lesson 4.7 measured the 1.33x from the extra cross-attention sublayer, and lesson 4.10 measured how vocabulary dominates at small scale. At d_model 384, a 51,865-word multilingual vocabulary is nearly 20M parameters on its own. The audio side of a speech model is far cheaper than the text side." },
    { stem: "How does Whisper produce word-level timestamps?",
      options: ["A separate alignment model", "From the cross-attention weights, which form a target-by-source alignment matrix showing which audio frames produced which word", "By measuring silence gaps", "From the decoder's positional embeddings"],
      answer: 1,
      why: "Cross-attention is target length by source length, so each output token's row shows which encoder frames it attended to. Lesson 6.6 identified this as the alignment matrix and the best debugging artefact an encoder-decoder gives you — here it is a shipped product feature. A decoder-only model has no such matrix." },
    { stem: "What does factorising video attention into spatial and temporal passes cost?",
      options: ["Accuracy on static scenes", "A patch can no longer attend to a different patch in a different frame in one hop — it needs two", "More memory", "Temporal resolution"],
      answer: 1,
      why: "The saving is 14.8x for 16 frames of 196 patches, which is substantial. But tracking an object that moves across the frame requires exactly that cross-frame, cross-position path, so it now takes two hops. It is the same trade as Swin's windows: restrict attention to a structured subset, recover the missing paths through depth." }
  ] },

  interview: { title: "Interview", sub: "Audio and video", questions: [
    { level: "Core", q: "How does a transformer process audio?",
      strong: "Via a spectrogram — the raw waveform has far too many timesteps for quadratic attention.",
      answer: [{ t: "p", text: "Not directly on the waveform, because the sequence length is impossible. Thirty seconds of 16 kHz audio is 480,000 samples, which would be around 2.3 times 10 to the 11 attention entries per head per layer. Instead you compute a mel spectrogram: slide a window across the signal with a hop of typically 10 milliseconds, take a Fourier transform in each window, and map the result onto perceptually-spaced mel bins. Whisper uses a 160-sample hop and 80 mel bins, so 30 seconds becomes 3,000 frames of 80 values, then a stride-2 convolution halves that to a fixed 1,500-token encoder input. The thing worth understanding is where the saving actually is. The spectrogram has 240,000 values against the waveform's 480,000 — only a factor of two. But the sequence length drops from 480,000 to 3,000, and attention is quadratic in sequence length while linear in the feature dimension. So you've moved information off the expensive axis onto the cheap one, which is exactly what image patching does too. The hop size isn't arbitrary either: phonemes last 50 to 150 milliseconds, so 10 millisecond frames give you 5 to 15 frames per phoneme, enough to see the transitions that distinguish them." }] },
    { level: "Senior", q: "Why is Whisper an encoder-decoder model?",
      strong: "Different modalities, different lengths, source complete beforehand — and cross-attention gives timestamps.",
      answer: [{ t: "p", text: "It has exactly the shape that still favours encoder-decoder. The source is audio and the target is text — genuinely different modalities, not one sequence. Their lengths are unrelated: thirty seconds of audio might be five words or a hundred. And the entire audio exists before transcription begins, so the encoder can read it bidirectionally and produce one fixed memory that every decoder step consults. A decoder-only model would have to concatenate audio features and text into one causal stream, losing the bidirectional read and paying to re-attend over the audio at every generated token. There's a second advantage that's easy to overlook and that Whisper ships as a feature: cross-attention is a target-by-source matrix, so each output token's attention row tells you which audio frames produced it. That's how Whisper generates word-level timestamps — it reads them off the alignment directly. A decoder-only model has no distinguished matrix telling you what came from where. Worth noting the parameter split too: whisper-tiny is 78% decoder despite having four layers on each side, because decoder blocks carry cross-attention and the decoder owns a 51,865-token multilingual output embedding." }] },
    { level: "Senior", q: "You need to build video understanding. What is your first constraint?",
      strong: "Token count — ten seconds at 24 fps is 61,440 tokens before anything else.",
      answer: [{ t: "p", text: "Token budget, and it binds immediately. At a modest 256 visual tokens per frame, ten seconds at 24 fps is 61,440 tokens — more than most context windows, for ten seconds of video. A minute is 368,640 tokens and about 1.36 times 10 to the 11 attention entries. So the first design question isn't the architecture, it's how to compress, and there are four options with different costs. Sparse frame sampling, taking 1 fps or keyframes, is simplest and misses fast motion entirely — fine for 'what is this video about', useless for 'when does the person fall'. Spatial pooling before the transformer keeps temporal resolution and loses fine detail in each frame. A bottleneck resampler gives a fixed token budget regardless of length, which is what makes long video tractable, at the cost that whatever the queries miss is gone. And factorised attention — spatial within each frame, then temporal across frames — I computed at 14.8 times cheaper for 16 frames of 196 patches, with the specific cost that a patch can't attend to a different patch in a different frame in one hop. I'd choose from the task: if it needs fine temporal detail, sample densely and pool spatially; if it needs fine spatial detail, sample frames sparsely; if it needs both, you're looking at a long-context setup and should budget accordingly." }] }
  ] }
});
