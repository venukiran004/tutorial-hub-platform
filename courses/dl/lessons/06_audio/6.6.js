/* ============================================================================
   LESSON 6.6 — RNN-T, Streaming, and Whisper
   Mirrors 08_Audio_Speech_Processing.md · §10, §11.
   ========================================================================= */
EC.receiveLesson({
  id: "6.6",

  lede: "**Streaming is a modelling constraint disguised as an engineering one.** A system that must emit words before the sentence ends cannot look at what follows, so it decides on `wreck a nice beach` before hearing anything that would have told it the speaker said `recognise speech`. RNN-T is the architecture that made that trade acceptable, and the two-pass design is how phones get instant text that quietly improves. Whisper takes the opposite bet entirely.",

  objectives: [
    "Explain how RNN-T's prediction and joint networks fix CTC's independence assumption",
    "Describe the 2-D lattice and the emit-or-advance loop",
    "Quantify the streaming trade-off in right context",
    "Describe Whisper's architecture and its three known failure modes",
    "Explain why the 30-second window matters for a voice agent"
  ],

  prerequisites: ["6.5"],

  blocks: [

    { t: "h2", n: "01", text: "RNN-T", id: "rnnt" },

    { t: "p", text: "CTC assumes each frame's output is independent of the others given the audio. That is false — `q` is followed by `u` — and it is why CTC systems need an external language model. RNN-T fixes it structurally." },

    { t: "diagram", kind: "flow", title: "Encoder, prediction, joint",
      caption: "The prediction network is a language model over what has already been emitted. The joint network combines it with the acoustic evidence.",
      cols: 3,
      nodes: [
        { id: "a", label: "audio frames", sub: "input", tone: "accent" },
        { id: "e", label: "ENCODER", sub: "acoustic representation", tone: "teal" },
        { id: "t", label: "emitted text", sub: "what has been output so far", tone: "violet" },
        { id: "p", label: "PREDICTION", sub: "a small LM over labels", tone: "violet" },
        { id: "j", label: "JOINT", sub: "combines both", tone: "good" },
        { id: "s", label: "softmax", sub: "over vocab + blank", tone: "warn" }
      ],
      edges: [["a", "e"], ["e", "j"], ["t", "p"], ["p", "j"], ["j", "s"]] },

    { t: "callout", kind: "mental", title: "Emit or advance — and that is why it streams",
      body: [{ t: "p", text: "At each step the model either emits a symbol and stays on the same frame, or emits blank and advances a frame. That loop consumes audio strictly left to right and can output as soon as it is confident, with no need to see the end of the utterance. It also makes the alignment lattice **two-dimensional** — frames by labels — rather than CTC's one-dimensional path, because the model can emit several symbols from one frame. The cost is that the lattice is much larger, which is why RNN-T is heavier to train and needs careful pruning." }] },

    { t: "table", head: ["", "CTC", "RNN-T"],
      rows: [
        ["Output dependency", "Independent per frame", "Conditioned on previous labels"],
        ["Internal LM", "None", "Yes — the prediction network"],
        ["Lattice", "1-D, monotonic", "2-D, frames × labels"],
        ["Symbols per frame", "At most one", "Several"],
        ["Training cost", "Light", "Heavy — the 2-D lattice"]
      ] },

    { t: "h2", n: "02", text: "What streaming costs", id: "context" },

    { t: "table", head: ["Approach", "Right context", "Effect"],
      rows: [
        ["Full attention", "The whole utterance", "Best WER, cannot stream"],
        ["**Chunked attention**", "320–640 ms", "The usual compromise"],
        ["Look-ahead convolutions", "100–200 ms", "Cheap, small gain"],
        ["**Two-pass**", "Stream, then rescore the whole thing", "What phones actually do"]
      ] },

    { t: "callout", kind: "insight", title: "Two-pass is the design worth knowing",
      body: [{ t: "p", text: "Stream with RNN-T so text appears immediately, then once the utterance ends, rescore the whole thing with an attention decoder that can see everything. The user gets instant feedback and then watches the text quietly improve — which is exactly the behaviour you have seen on a phone keyboard, where a word changes a moment after you said the next one. It resolves the latency-accuracy trade by refusing to pick: you get the streaming model's responsiveness and most of the offline model's accuracy, at the cost of running two models." }] },

    { t: "p", text: "The underlying difficulty is that a streaming encoder must commit before hearing what follows, and speech is full of cases where later words disambiguate earlier ones. Right context of 320–640 ms buys back much of that at a latency most users tolerate." },

    { t: "h2", n: "03", text: "Whisper", id: "whisper" },

    { t: "out", text: `  audio -> pad or trim to EXACTLY 30 s -> 80-band log-mel, 100 fps -> 3000 x 80
        -> 2 conv layers (stride 2 on time) -> 1500 encoder positions
        -> encoder -> decoder, prompted with special tokens` },

    { t: "p", text: "A plain encoder-decoder transformer — architecturally unremarkable — trained on 680,000 hours of weakly-labelled multilingual audio. Its thesis is that **scale and diversity beat clever objectives**, and it made that case convincingly enough to change how people approached the problem." },

    { t: "code", lang: "text", title: "The decoder is steered by a token prompt",
      code: `<|startoftranscript|> <|en|> <|transcribe|> <|notimestamps|> ...text...
                       ^lang  ^task          ^timestamp mode
                              <|translate|> gives English out from any language in`,
      caption: "One model does transcription, translation, language identification and timestamping, selected entirely by the prompt tokens — the same conditioning idea as instruction-tuned language models." },

    { t: "h2", n: "04", text: "Its three failure modes", id: "failures" },

    { t: "dl", items: [
      ["Hallucination on silence or noise", "With no speech in the window the decoder still produces fluent text — often a sign-off phrase learned from YouTube subtitles. Fix: run voice activity detection first and skip windows with no speech."],
      ["Repetition loops", "Greedy decoding can lock into a repeated phrase. Fix: the temperature fallback schedule, plus a compression-ratio check that retries the window."],
      ["Approximate timestamps", "They come from timestamp tokens the model predicts, not from an alignment. For word-level timing, force-align the output with a CTC model instead."]
    ] },

    { t: "callout", kind: "crit", title: "The 30-second window is a hard constraint",
      body: [{ t: "p", text: "Every clip is padded or trimmed to exactly 30 seconds before the encoder sees it, so **a 2-second command costs the same compute as a 30-second one**. For batch transcription of long recordings this is irrelevant — you were going to process 30 seconds at a time anyway. For a voice agent handling short utterances it is a fifteen-fold waste on every request, and it is a large part of why streaming wrappers around Whisper are awkward: you are either padding constantly or re-encoding overlapping windows. If your workload is short commands with a latency budget, this alone may rule Whisper out." }] },

    { t: "callout", kind: "mental", title: "Timestamps from tokens are not an alignment",
      body: [{ t: "p", text: "The distinction matters more than it sounds. Whisper predicts timestamp tokens as part of its output sequence, so they are *generated text* subject to the same fluency-over-accuracy pressure as everything else it produces. A CTC model's alignment, by contrast, falls out of the lattice — it is a consequence of the frame-level probabilities and is genuinely tied to the audio. If you need subtitle timings or word boundaries, transcribe with Whisper for accuracy and then force-align that transcript with a CTC model for timing. Using Whisper's own timestamps for anything that must line up precisely is a common and quiet source of error." }] },

    { t: "exercise", kind: "practice", title: "Measure the streaming trade-off", difficulty: "advanced", minutes: 45,
      prompt: "Take a pretrained ASR model and transcribe a set of recordings twice: once with the full utterance available, and once simulating streaming by truncating the input at each point and taking the output so far. Measure word error rate for both and the latency to first token. Then implement a simple two-pass scheme — streaming output followed by a full rescoring — and see how much of the offline accuracy it recovers. Separately, time Whisper on 2-second and 30-second clips and confirm the cost is the same.",
      hints: [
        "Simulating streaming by repeated truncation is crude but shows the effect.",
        "Words near the end of each chunk are where streaming hurts most.",
        "For the Whisper timing, use identical settings and warm up first."
      ],
      solution: {
        notes: [
          { t: "p", text: "The Whisper timing result is the crisp one: a 2-second clip and a 30-second clip take essentially the same time, because both are padded to 3000 mel frames before the encoder runs. That is a fifteen-fold waste on short utterances and it is entirely structural — no batching or optimisation removes it, since the model's positional embeddings assume that fixed length." },
          { t: "p", text: "For the streaming comparison, expect errors to concentrate on words that later context would have disambiguated, and expect the two-pass rescoring to fix a good share of them. That pattern is the argument for the design: the streaming pass is not meant to be final, it is meant to be immediate, and the second pass is where accuracy comes from. Users tolerate text that improves far better than text that arrives late." },
          { t: "p", text: "Worth also running a silence clip through Whisper while you are set up. It frequently produces confident fluent text, and seeing it once is the most memorable argument for putting voice activity detection in front of any attention-based recogniser." }
        ]
      } }

  ],

  takeaways: [
    "RNN-T adds a prediction network (an LM over emitted labels) and a joint network, fixing CTC's independence assumption.",
    "Its emit-or-advance loop consumes audio left to right, which is what makes it stream.",
    "The lattice is 2-D (frames × labels), so training is heavier and needs pruning.",
    "Streaming costs right context: chunked attention at 320–640 ms is the usual compromise.",
    "Two-pass — stream with RNN-T, rescore with attention — is what phones actually do.",
    "Whisper pads every clip to exactly 30 s, so a 2-second command costs the same as a 30-second one.",
    "Its failure modes: hallucination on silence, repetition loops, and approximate timestamps.",
    "Whisper's timestamps are predicted tokens, not an alignment — force-align with CTC for real timing."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does RNN-T's prediction network do?",
      options: ["Predicts the next audio frame", "Acts as a language model over previously emitted labels", "Aligns frames to labels", "Reduces the frame rate"],
      answer: 1,
      why: "It conditions on what has been emitted so far, giving the model an internal language model that CTC lacks — so it knows `u` is likely after `q`. The joint network combines that with the encoder's acoustic evidence, and the emit-or-advance loop keeps the whole thing streamable." },
    { stem: "Why is RNN-T's lattice two-dimensional?",
      options: ["It processes stereo audio", "At each step it can emit a symbol without advancing a frame, so paths span frames × labels", "It uses bidirectional encoding", "It has two decoders"],
      answer: 1,
      why: "CTC emits at most one symbol per frame, giving a 1-D monotonic path. RNN-T can emit several symbols from one frame before advancing, so the lattice covers every (frame, label) position. That is what lets it condition on labels, and it is also why training is heavier and needs pruning." },
    { stem: "What is the two-pass design?",
      options: ["Running the model twice for ensembling", "Stream with RNN-T for instant text, then rescore the whole utterance with an attention decoder", "Two encoder layers", "Decoding forwards then backwards"],
      answer: 1,
      why: "It refuses to choose between latency and accuracy: the user gets immediate text from the streaming model, which is then quietly improved once the utterance ends and a full-context model can see everything. It is why a word on a phone keyboard sometimes changes a moment after you speak the next one." },
    { stem: "Why does a 2-second clip cost Whisper the same as a 30-second one?",
      options: ["Fixed batch size", "Every clip is padded to exactly 30 s before the encoder runs", "The decoder always generates 30 s of tokens", "Disk I/O dominates"],
      answer: 1,
      why: "Whisper's encoder expects exactly 3000 mel frames, so short clips are padded and the full encoder cost is paid regardless. For batch transcription that is irrelevant; for a voice agent handling short commands it is a fifteen-fold waste on every request, and it is structural rather than an optimisation problem." }
  ] },

  interview: { title: "Interview", sub: "Streaming and production ASR", questions: [
    { level: "Core", q: "How does RNN-T improve on CTC?",
      strong: "A prediction network conditions on emitted labels, giving an internal LM while staying streamable.",
      answer: [{ t: "p", text: "CTC assumes frame outputs are conditionally independent given the audio, which is plainly false for language — `u` follows `q` — and it means CTC has no notion of which word sequences are likely, so it needs an external language model at decode time. RNN-T adds a prediction network, which is a small language model over what has already been emitted, and a joint network that combines it with the encoder output. At each step the model either emits a symbol and stays on the current frame or emits blank and advances, so it consumes audio strictly left to right and can output as soon as it is confident. That is what preserves streaming while adding label conditioning. The cost is that the alignment lattice becomes two-dimensional, frames by labels, so training is considerably heavier and needs careful pruning — which is why RNN-T has a reputation for being fiddly despite being the right architecture for on-device work." }] },
    { level: "Senior", q: "You need ASR for a voice assistant. Walk me through the design.",
      strong: "Streaming is the binding constraint: VAD, then RNN-T, then optional rescoring — probably not Whisper.",
      answer: [{ t: "p", text: "The requirement that decides everything is that the user must see or hear a response quickly, so the recogniser has to stream. That rules out an attention encoder-decoder, whose bidirectional encoder cannot produce anything until the utterance ends. I would put voice activity detection at the front so that we only decode when someone is speaking, which saves compute and, if any attention model is involved downstream, prevents hallucination on silence. Then RNN-T with chunked attention at around 320 to 640 milliseconds of right context, which recovers most of the accuracy lost to streaming at a latency people tolerate. If accuracy matters enough, a second pass that rescores the completed utterance with a full-context model, which is what phone keyboards do — instant text that quietly improves. I would specifically not reach for Whisper here despite its accuracy, because it pads every clip to thirty seconds, so a two-second command costs fifteen times the compute it should, and wrapping it for streaming is awkward. Whisper is the right tool for batch transcription of recordings, which is a different problem." }] },
    { level: "Senior", q: "Someone is using Whisper's timestamps to cut audio clips. What would you tell them?",
      strong: "Those are predicted tokens, not an alignment — force-align with CTC for anything that must line up.",
      answer: [{ t: "p", text: "That they are using a generated quantity as though it were a measured one. Whisper produces timestamps as timestamp tokens within its output sequence, so they come from the same autoregressive decoder that produces the words and are subject to the same pressure towards fluent, plausible output rather than accurate output. They are usually roughly right and can be substantially wrong, particularly around silences, overlapping speech, or after a repetition loop. A CTC model's alignment is a different kind of object — it falls out of the forward lattice as a consequence of frame-level probabilities, so it is tied to the audio by construction. The practical recipe is to transcribe with Whisper because its text accuracy is excellent, then force-align that transcript against the audio with a CTC model to get timings. That gives you the best of both, and it is what most production subtitle pipelines do. If they only need approximate segment boundaries for navigation, Whisper's own timestamps are fine — the distinction matters when something must cut precisely." }] }
  ] }
});
