/* ============================================================================
   LESSON 6.8 — The Small Models, and How to Measure Any of It
   Mirrors 08_Audio_Speech_Processing.md · §14, §15. All five of the
   reference's WER cases recomputed with its own function and matched exactly
   (scratchpad/dl/d68.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.8",

  lede: "**The models around the big one decide how a product feels, and the metric you choose decides whether you can tell.** Voice activity detection gates everything; a wake word's operating point is set by false accepts per hour, not by accuracy. And word error rate — the number every speech system is judged on — is **not a percentage**, cannot be inverted, and moves by several points purely from how you render numbers before scoring. All five of the reference's worked WER cases are verified here.",

  objectives: [
    "Distinguish VAD, wake word, endpointing, diarisation and verification",
    "Explain why wake-word metrics are asymmetric",
    "Compute WER and read its edit breakdown",
    "Explain why WER is unbounded and cannot be quoted as accuracy",
    "Choose between WER, CER, entity error rate, MOS and RTF"
  ],

  prerequisites: ["6.7"],

  blocks: [

    { t: "h2", n: "01", text: "The small models", id: "small" },

    { t: "table", head: ["Task", "Question", "Notes"],
      rows: [
        ["**VAD**", "Is anyone speaking right now?", "Runs constantly, must be tiny. WebRTC (GMM) or Silero (small neural). Gates everything downstream."],
        ["**Wake word**", "Did they say the trigger phrase?", "Always-on, on-device, a few hundred KB. Tuned for false accepts per hour."],
        ["**Endpointing**", "Have they *finished* speaking?", "Different from VAD, and the hardest of the three."],
        ["**Diarisation**", "Who spoke when?", "Segment, embed (x-vector/ECAPA), cluster. Overlapping speech is where it fails."],
        ["**Speaker verification**", "Is this the enrolled user?", "Cosine similarity between embeddings against a threshold set by the false-accept budget."]
      ] },

    { t: "callout", kind: "insight", title: "Wake-word metrics are asymmetric on purpose",
      body: [{ t: "p", text: "A missed wake word annoys the user; a false accept means the device started recording someone's living room. Those are not comparable costs, so the operating point is set by **false accepts per hour** — commonly under 1 — and the miss rate is whatever that constraint costs you. This is why quoting wake-word accuracy is meaningless: the number that matters is one side of the curve, chosen by a privacy requirement rather than by a modelling one. It is a good example of a metric being determined by the product's consequences rather than by convention." }] },

    { t: "callout", kind: "trap", title: "Endpointing is not VAD, and it is the hard one",
      body: [{ t: "p", text: "VAD asks whether sound is speech right now. Endpointing asks whether the user has *finished their thought*, which is a different and much harder question — people pause mid-sentence to think, and the pause before *\"...to my mother\"* looks identical to the pause after a completed command. Cut too early and you interrupt them; wait too long and the assistant feels sluggish. It is usually the largest and least examined component of a voice agent's perceived latency, and the best systems use the language model's own expectation of whether the utterance is complete rather than silence duration alone." }] },

    { t: "h2", n: "02", text: "Word error rate", id: "wer" },

    { t: "math", tex: "\\text{WER} = \\frac{S + D + I}{N_{\\text{reference}}}" },

    { t: "out", text: `   S  D  I      WER    ref S/D/I  ref WER   match
   0  1  0   0.1429   0,1,     0     0.1429   True
   1  0  0   0.1429   1,0,     0     0.1429   True
   1  0  0   0.1667   1,0,     0     0.1667   True
   0  0  2   0.5000   0,0,     2     0.5000   True
   0  0  3   3.0000   0,0,     3     3.0000   True

  all five match: True` },

    { t: "table", head: ["Reference", "Hypothesis", "WER"],
      rows: [
        ["set the temperature to twenty two degrees", "set the temperature to twenty degrees", "0.1429"],
        ["set the temperature to twenty two degrees", "set the temperature to twenty two degree", "0.1429"],
        ["call mum on the way home", "call mom on the way home", "0.1667"],
        ["navigate to kings cross", "navigate to kings cross station now", "0.5000"],
        ["yes", "yes yes yes yes", "**3.0000**"]
      ] },

    { t: "callout", kind: "crit", title: "Three lessons in those five rows",
      body: [{ t: "p", text: "**Rows 1 and 2 score identically at 0.1429** — yet dropping `two` from a temperature command changes what the thermostat does, while `degree` for `degrees` changes nothing at all. WER cannot tell them apart. **`mum` → `mom` costs 0.1667** and is completely harmless; WER counts disagreement, not meaning. And **the last row is 3.0000**, because insertions are divided by the *reference* length, so WER is unbounded above. Anyone who says '97 % accurate' from a WER of 0.03 is quoting a number that cannot be inverted like that — there is no complement, because the quantity is not bounded by 1." }] },

    { t: "h2", n: "03", text: "Normalisation decides the number", id: "normalisation" },

    { t: "out", text: `  exact       : WER 0.0000   (S0 D0 I0)
  spelled out : WER 0.1667   (S1 D0 I0)
  with comma  : WER 0.1667   (S1 D0 I0)
  capitalised : WER 0.1667   (S1 D0 I0)` },

    { t: "p", text: "Four hypotheses with **identical meaning** scoring anywhere from 0.0000 to 0.1667, purely from how numbers, punctuation and casing are rendered. Two systems on the same audio can differ by several points on this alone. **Fix one normaliser, publish it, and compare only within it** — a WER quoted without its normalisation scheme is not a comparable number." },

    { t: "h2", n: "04", text: "The other metrics", id: "metrics" },

    { t: "out", text: `  WER 0.1429  CER 0.0976   'set the temperature to twenty degrees'
  WER 0.1429  CER 0.0244   'set the temperature to twenty two degree'
  WER 0.1667  CER 0.0417   'call mom on the way home'` },

    { t: "callout", kind: "insight", title: "CER separates what WER conflates",
      body: [{ t: "p", text: "Rows 1 and 2 have identical WER of 0.1429 and character error rates of **0.0976 and 0.0244** — a factor of four. Character error rate correctly registers that dropping a whole word (`two`) is a larger error than dropping one letter (`degrees` → `degree`), which is exactly the distinction WER is blind to. That does not make CER the better metric in general — it is the right choice for Chinese and Japanese, where word boundaries are not marked, and for spelling-heavy content — but it is a useful second number precisely because it fails differently." }] },

    { t: "table", head: ["Metric", "Measures", "Watch out"],
      rows: [
        ["**WER**", "Word-level errors", "Normalisation decides the number"],
        ["**CER**", "Character-level", "Right for Chinese, Japanese, spelling-heavy content"],
        ["**Entity error rate**", "Did the *name*, *number* or *address* survive", "The metric your product actually cares about"],
        ["**MOS / CMOS**", "Human 1–5 naturalness for TTS", "Needs many raters; CMOS compares two systems and is far more sensitive"],
        ["**RTF**", "Processing time / audio duration", "Must be well under 1.0 to stream"],
        ["**Latency**", "Time to first token, and to final", "RTF can be excellent while latency is terrible, if you buffer"]
      ] },

    { t: "out", text: `  fast GPU batch      3.00s to process 300.0s audio -> RTF 0.010  streams
  streaming target    0.25s to process   1.0s audio -> RTF 0.250  streams
  too slow            1.40s to process   1.0s audio -> RTF 1.400  CANNOT stream` },

    { t: "callout", kind: "good", title: "Entity error rate is usually the metric that matters",
      body: [{ t: "p", text: "A user does not care that the model wrote `mom` for `mum`. They care enormously whether the phone number, the address, the drug name or the account reference came through correctly. Entity error rate — computed only over the spans that carry meaning — tracks product quality far better than WER, and the two frequently disagree: a system with worse WER can be clearly better in use because its errors fall on filler words rather than on names. If you are building a product rather than publishing a paper, define the entities you care about and measure those." }] },

    { t: "exercise", kind: "practice", title: "Build the evaluation you would actually ship", difficulty: "intermediate", minutes: 40,
      prompt: "Implement WER with a full substitution/deletion/insertion breakdown and verify it against the five reference cases. Then build a normaliser — lowercase, strip punctuation, expand numbers — and measure how much WER moves on a real transcript set with and without it. Implement entity error rate over a chosen entity type such as numbers or proper nouns, and compare the ranking of two systems under WER against their ranking under entity error rate. Finally, measure RTF and time-to-first-token for a model and show they can disagree.",
      hints: [
        "Backtrace through the edit-distance matrix to get the S/D/I breakdown.",
        "Try to construct a pair of systems where WER and entity error rate rank them oppositely.",
        "For the RTF/latency point, add artificial buffering and watch RTF stay flat while latency rises."
      ],
      solution: {
        notes: [
          { t: "p", text: "The case where WER and entity error rate disagree is the one worth constructing, because it is common in practice and it changes decisions. A system that is slightly worse on filler words and noticeably better on names and numbers will lose on WER and win with users. Once you have seen the two metrics rank systems oppositely on your own data, reporting WER alone stops feeling sufficient." },
          { t: "p", text: "The normaliser experiment usually moves WER by several points, which is more than the difference between many competing systems. That is the practical reason to publish the normaliser alongside any number: a WER without one is not comparable to anyone else's, and the temptation to pick the normalisation that flatters your system is real and largely invisible to readers." },
          { t: "p", text: "For RTF against latency, adding a buffer that accumulates five seconds of audio before processing leaves RTF unchanged — the same total work over the same duration — while time to first token rises by five seconds. A system can therefore report an excellent RTF and feel unusable. Report both, and for interactive applications report time to first token first." }
        ]
      } }

  ],

  takeaways: [
    "VAD gates everything; wake words are tuned for false accepts per hour, commonly under 1.",
    "Endpointing — has the user finished? — is distinct from VAD and is the hardest of the small models.",
    "All five of the reference's WER cases reproduce exactly, including the S/D/I breakdown.",
    "WER is unbounded: `yes` → `yes yes yes yes` scores 3.0000. It is not a percentage and cannot be inverted.",
    "Identical meaning scored 0.0000 to 0.1667 purely from normalisation — publish the normaliser.",
    "CER separated two cases WER scored identically (0.0976 against 0.0244).",
    "Entity error rate usually tracks product quality better than WER.",
    "RTF must be well under 1.0 to stream, and can look excellent while latency is terrible."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Reference `yes`, hypothesis `yes yes yes yes`. What is the WER?",
      options: ["0.75", "1.0", "3.0", "0.25"],
      answer: 2,
      why: "Three insertions divided by a reference length of one gives 3.0000. Insertions are counted against the reference, so WER is unbounded above — which is why it is not a percentage and why '97 % accurate' from a WER of 0.03 is not a valid restatement." },
    { stem: "Why is a WER figure meaningless without its normalisation scheme?",
      options: ["Different languages score differently", "Casing, punctuation and number rendering moved identical-meaning hypotheses from 0.0000 to 0.1667", "WER depends on the audio codec", "Reference length varies"],
      answer: 1,
      why: "Measured on four hypotheses with the same meaning: exact match scored 0.0000 while spelled-out numbers, a trailing comma, or capitalisation each scored 0.1667. That range exceeds the gap between many competing systems, so a WER without a published normaliser is not comparable." },
    { stem: "How is a wake word's operating point chosen?",
      options: ["By maximising accuracy", "By a false-accepts-per-hour budget, commonly under 1", "By minimising the miss rate", "By equal error rate"],
      answer: 1,
      why: "The two errors have incomparable costs: a miss annoys, while a false accept means the device started recording a private conversation. So the threshold is set by a privacy constraint on false accepts and the miss rate is whatever that costs. Quoting wake-word accuracy conflates two things that must not be traded freely." },
    { stem: "Two systems have identical WER but one is clearly better in use. What metric would show that?",
      options: ["CER", "Entity error rate", "RTF", "MOS"],
      answer: 1,
      why: "WER weights every word equally, so errors on filler words count the same as errors on a phone number or a name. Entity error rate measures only the spans that carry meaning, and it frequently ranks systems differently from WER — which is the ranking that matches user experience." }
  ] },

  interview: { title: "Interview", sub: "Evaluation and the small models", questions: [
    { level: "Core", q: "What is word error rate and what are its limitations?",
      strong: "Edit distance over words divided by reference length — unbounded, meaning-blind, and normalisation-dependent.",
      answer: [{ t: "p", text: "Substitutions plus deletions plus insertions, divided by the number of reference words. Three limitations matter. It is unbounded, because insertions are divided by the reference length — `yes` transcribed as `yes yes yes yes` gives a WER of 3.0, so it is not a percentage and a WER of 0.03 does not mean 97 per cent accurate. It is blind to meaning: I have verified a case where dropping `two` from a temperature command and writing `degree` for `degrees` score identically at 0.1429, although one changes what the thermostat does and the other changes nothing. And it depends heavily on normalisation — identical-meaning hypotheses scored anywhere from 0.0000 to 0.1667 in my measurements, purely from casing, punctuation and whether numbers were spelled out, which is a wider range than the difference between many competing systems. So I would always publish the normaliser, and for a product I would report entity error rate alongside, since that is what users actually experience." }] },
    { level: "Senior", q: "How do VAD, endpointing and wake-word detection differ?",
      strong: "Is there speech, has the user finished, and was the trigger said — three different questions with different metrics.",
      answer: [{ t: "p", text: "VAD asks whether sound is speech right now; it runs constantly, must be tiny, and gates everything downstream so that the expensive models only run when someone is talking. Wake-word detection asks whether a specific trigger phrase was said; it is always on and on-device, typically a few hundred kilobytes, and its operating point is set by false accepts per hour rather than by accuracy, because a miss annoys while a false accept means the device started recording a private conversation. Endpointing asks whether the user has finished their thought, and it is the hardest of the three — people pause mid-sentence, and the silence before `to my mother` is indistinguishable from the silence after a complete command. Cut early and you interrupt; wait and the assistant feels slow. It is usually the largest component of a voice agent's perceived latency and the least examined, and the better systems use the language model's own sense of whether the utterance is complete rather than silence duration alone." }] },
    { level: "Senior", q: "A model has RTF 0.1 but users say it feels slow. What is going on?",
      strong: "RTF measures throughput, not latency — buffering keeps RTF flat while time to first token rises.",
      answer: [{ t: "p", text: "RTF is processing time divided by audio duration, so it is a throughput measure and says nothing about when the first output appears. A system that buffers five seconds of audio before processing has exactly the same RTF as one that processes continuously — the same work over the same duration — while its time to first token is five seconds worse. So I would measure time to first token and time to final separately and treat those as the user-facing numbers, with RTF as a capacity-planning figure. The usual culprits are a buffering window before the recogniser, an attention encoder that cannot emit until the utterance ends, or a conservative endpointer waiting for a long silence. Each of those is invisible in RTF and dominant in perceived speed. For anything interactive I would report time to first token first and RTF second, because the ordering of those two in a report tends to determine which one gets optimised." }] }
  ] }
});
