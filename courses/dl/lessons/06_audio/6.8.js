/* ============================================================================
   LESSON 6.8 — The Small Models, and How to Measure Any of It
   ========================================================================= */
EC.receiveLesson({
  id: "6.8",

  lede: "**The models around the big one decide how a product feels, and the metric you choose decides whether you can tell.** Voice activity detection gates everything; a wake word's operating point is set by false accepts per hour, not by accuracy. And word error rate — the number every speech system is judged on — is **not a percentage**, cannot be inverted, and moves by several points purely from how you render numbers before scoring. All five of the worked WER cases are verified here.",

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

    {"kind": "matrix", "title": "The five small models that sit around the recogniser", "caption": "None of these is the ASR model and all of them decide whether the product works. The third row is the one that is routinely confused with the first: VAD asks whether anyone is speaking *now*, endpointing asks whether they have **finished** — a much harder question, because a pause mid-sentence and a pause at the end look identical for the first few hundred milliseconds.", "cols": ["Question", "Constraint"], "rows": ["VAD", "Wake word", "Endpointing", "Diarisation", "Speaker verification"], "cells": [["is anyone speaking now?", {"text": "runs constantly; must be tiny", "tone": "accent"}], ["did they say the trigger?", "a few hundred KB, always on"], [{"text": "have they finished?", "tone": "crit"}, "the hardest of the three"], ["who spoke when?", "overlap is where it fails"], ["is this the enrolled user?", "a threshold from a false-accept budget"]], "t": "diagram", "id": "dg-6_8-01-0"},



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

    {"kind": "trace", "title": "Five rows that show what WER cannot see", "caption": "Rows 1 and 2 score **identically** — yet dropping `two` from a temperature command changes what the thermostat does, while `degree` for `degrees` changes nothing at all. `mum` to `mom` costs 0.1667 and is completely harmless. And the last row is 3.0000, because insertions divide by the *reference* length, so WER is unbounded above: anyone quoting \"97% accurate\" from a WER of 0.03 is inverting a quantity that has no complement.", "left": "what changed", "codeW": 220, "vars": ["S D I", "WER"], "steps": [{"code": "dropped 'two' - changes the action", "state": ["0 1 0", "0.1429"], "tone": "crit"}, {"code": "'degrees' -> 'degree' - harmless", "state": ["1 0 0", "0.1429"], "changed": [1], "tone": "warn", "note": "the same score"}, {"code": "'mum' -> 'mom' - harmless", "state": ["1 0 0", "0.1667"], "tone": "warn"}, {"code": "added 'station now'", "state": ["0 0 2", "0.5000"], "tone": "accent"}, {"code": "'yes' -> 'yes yes yes yes'", "state": ["0 0 3", "3.0000"], "changed": [1], "tone": "crit", "note": "unbounded above"}], "t": "diagram", "id": "dg-6_8-02-1"},



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

    {"kind": "trace", "title": "Four identical meanings, four different numbers", "caption": "Nothing about the recognition changed across these four — only how numbers, punctuation and casing are rendered — and the score moves from 0.0000 to 0.1667. Two systems on the same audio can differ by several points on this alone, which is more than separates many competing models. **Fix one normaliser, publish it, and compare only within it**: a WER quoted without its normalisation scheme is not a comparable number.", "left": "rendering", "codeW": 200, "vars": ["S D I", "WER"], "steps": [{"code": "exact match", "state": ["0 0 0", "0.0000"], "tone": "good"}, {"code": "number spelled out", "state": ["1 0 0", "0.1667"], "changed": [1], "tone": "crit"}, {"code": "a comma added", "state": ["1 0 0", "0.1667"], "tone": "crit"}, {"code": "capitalised", "state": ["1 0 0", "0.1667"], "tone": "crit"}, {"code": "meaning, in all four", "state": ["identical", "unchanged"], "tone": "violet"}], "t": "diagram", "id": "dg-6_8-03-2"},



    { t: "out", text: `  exact       : WER 0.0000   (S0 D0 I0)
  spelled out : WER 0.1667   (S1 D0 I0)
  with comma  : WER 0.1667   (S1 D0 I0)
  capitalised : WER 0.1667   (S1 D0 I0)` },

    { t: "p", text: "Four hypotheses with **identical meaning** scoring anywhere from 0.0000 to 0.1667, purely from how numbers, punctuation and casing are rendered. Two systems on the same audio can differ by several points on this alone. **Fix one normaliser, publish it, and compare only within it** — a WER quoted without its normalisation scheme is not a comparable number." },

    { t: "h2", n: "04", text: "The other metrics", id: "metrics" },

    {"kind": "matrix", "title": "The other metrics, and which one your product cares about", "caption": "Entity error rate is usually the one that matters: a user does not care that the model wrote `mom` for `mum`, and cares enormously whether the phone number survived. It frequently disagrees with WER — a system with worse WER can be clearly better in use because its errors fall on filler words — and RTF against latency disagree the same way, since a buffer leaves RTF flat while time-to-first-token rises.", "cols": ["Measures", "Watch"], "rows": ["WER", "CER", "Entity error rate", "MOS / CMOS", "RTF", "Latency"], "cells": [["word-level errors", {"text": "the normaliser decides it", "tone": "crit"}], ["character-level", "right for Chinese, Japanese"], [{"text": "did the name or number survive", "tone": "good"}, "what the product cares about"], ["human 1-5 naturalness", "five raters is not enough"], ["processing time / duration", "must be well under 1.0"], ["time to first token, and final", {"text": "great RTF, terrible latency", "tone": "warn"}]], "t": "diagram", "id": "dg-6_8-04-3"},



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
      requirements: [
        "Implement WER with a substitution, deletion and insertion breakdown and verify it",
        "Build a normaliser and measure how much WER moves",
        "Implement entity error rate and compare two systems' rankings",
        "Measure RTF and time-to-first-token and show they can disagree"
      ],
      hints: [
        "Backtrace through the edit-distance matrix to get the S/D/I breakdown.",
        "Try to construct a pair of systems where WER and entity error rate rank them oppositely.",
        "For the RTF/latency point, add artificial buffering and watch RTF stay flat while latency rises."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import re

def align(ref, hyp):
    """Levenshtein over words with a backtrace; returns (S, D, I)."""
    R, H = len(ref), len(hyp)
    d = [[(0, 0, 0, 0)] * (H + 1) for _ in range(R + 1)]        # (cost, S, D, I)
    for i in range(1, R + 1): d[i][0] = (i, 0, i, 0)
    for j in range(1, H + 1): d[0][j] = (j, 0, 0, j)
    for i in range(1, R + 1):
        for j in range(1, H + 1):
            if ref[i - 1] == hyp[j - 1]: d[i][j] = d[i - 1][j - 1]; continue
            s, de, ins = d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]
            d[i][j] = min((s[0] + 1, s[1] + 1, s[2], s[3]), (de[0] + 1, de[1], de[2] + 1, de[3]), (ins[0] + 1, ins[1], ins[2], ins[3] + 1))
    return d[R][H][1:]

def wer(ref, hyp):
    r, h = ref.split(), hyp.split()
    S, D, I = align(r, h)
    return (S + D + I) / max(len(r), 1), S, D, I

cases = [("the cat sat", "the cat sat", 0.0), ("the cat sat", "the bat sat", 1/3), ("the cat sat", "the sat", 1/3),
         ("the cat sat", "the cat sat down", 1/3), ("a b", "x y z w", 2.0)]
for ref, hyp, want in cases:
    w, S, D, I = wer(ref, hyp)
    print(f"{ref!r:>14} -> {hyp!r:<20} WER {w:.3f} (S{S} D{D} I{I})  expected {want:.3f}  {'ok' if abs(w - want) < 1e-9 else 'MISMATCH'}")

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
def say(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + say(n % 100))
def normalise(s):
    s = s.lower().replace("%", " percent")
    s = re.sub(r"\\d+", lambda m: say(int(m.group())) if int(m.group()) < 1000 else m.group(), s)
    return re.sub(r"\\s+", " ", re.sub(r"[^\\w\\s']", " ", s)).strip()

refs = ["Send 25 dollars to Priya, please.", "The meeting is at 3 o'clock.", "Call Mr. Okafor on Tuesday!", "Rates rose 5% in May."]
# A: sloppy on filler words, right on names.  B: clean everywhere except the names.
sysA = ["send twenty five dollar to priya please", "the meeting is at three", "call mister okafor tuesday", "rates rose five percent in may"]
sysB = ["Send 25 dollars to Maria, please.", "The meeting is at 3 o'clock.", "Call Mr. Okoro on Tuesday!", "Rates rose 5% in May."]
def corpus_wer(R, H, norm):
    f = normalise if norm else (lambda s: s)
    errs = sum(sum(align(f(r).split(), f(h).split())) for r, h in zip(R, H)); return errs / sum(len(f(r).split()) for r in R)
print("\\n          raw WER   normalised WER")
for name, H in [("system A", sysA), ("system B", sysB)]:
    print(f"{name}  {corpus_wer(refs, H, False):8.3f}   {corpus_wer(refs, H, True):14.3f}")

ENTITIES = {"priya", "okafor", "maria", "okoro"}                # proper nouns we care about
def entity_error(R, H):
    tot = err = 0
    for r, h in zip(R, H):
        rset, hset = set(normalise(r).split()), set(normalise(h).split())
        for e in rset & ENTITIES: tot += 1; err += e not in hset
    return err / tot
print("\\nentity error rate:  A", f"{entity_error(refs, sysA):.2f}", "  B", f"{entity_error(refs, sysB):.2f}")

# RTF and time to first token measured on two decoders over the same 10 s of audio.
# The "model" is a fixed amount of matrix work per 20 ms frame; what differs is when output is released.
import time, numpy as np
W = np.random.default_rng(0).standard_normal((512, 512)).astype(np.float32)
def frame_work(): v = np.ones(512, np.float32); [v := np.tanh(W @ v) for _ in range(4)]
def run(chunk_frames, lookahead_frames):
    t0, first = time.perf_counter(), None
    for i in range(500):                              # 500 frames = 10 s
        frame_work()
        if chunk_frames and (i + 1) % chunk_frames == 0 and first is None:
            for _ in range(lookahead_frames): frame_work()  # streaming pays extra right-context work per chunk
            first = time.perf_counter() - t0
    total = time.perf_counter() - t0
    return total / 10.0, first if first is not None else total   # offline releases text only at the end
for name, cf, la in [("offline (whole clip, one pass)", 0, 0), ("streaming (16-frame chunks)", 16, 8)]:
    rtf, ttft = run(cf, la)
    print(f"{name:<32} RTF {rtf:.4f}   time to first token {ttft * 1000:7.1f} ms")`,
        out: ` 'the cat sat' -> 'the cat sat'        WER 0.000 (S0 D0 I0)  expected 0.000  ok
 'the cat sat' -> 'the bat sat'        WER 0.333 (S1 D0 I0)  expected 0.333  ok
 'the cat sat' -> 'the sat'            WER 0.333 (S0 D1 I0)  expected 0.333  ok
 'the cat sat' -> 'the cat sat down'   WER 0.333 (S0 D0 I1)  expected 0.333  ok
         'a b' -> 'x y z w'            WER 2.000 (S2 D0 I2)  expected 2.000  ok

          raw WER   normalised WER
system A     0.818            0.167
system B     0.091            0.083

entity error rate:  A 0.00   B 1.00
offline (whole clip, one pass)   RTF 0.0039   time to first token    39.2 ms
streaming (16-frame chunks)      RTF 0.0048   time to first token     2.6 ms`,
       
        notes: [
          { t: "p", text: "The case where WER and entity error rate disagree is the one worth constructing, because it is common in practice and it changes decisions. A system that is slightly worse on filler words and noticeably better on names and numbers will lose on WER and win with users. Once you have seen the two metrics rank systems oppositely on your own data, reporting WER alone stops feeling sufficient." },
          { t: "p", text: "The normaliser experiment usually moves WER by several points, which is more than the difference between many competing systems. That is the practical reason to publish the normaliser alongside any number: a WER without one is not comparable to anyone else's, and the temptation to pick the normalisation that flatters your system is real and largely invisible to readers." },
          { t: "p", text: "For RTF against latency, adding a buffer that accumulates five seconds of audio before processing leaves RTF unchanged — the same total work over the same duration — while time to first token rises by five seconds. A system can therefore report an excellent RTF and feel unusable. Report both, and for interactive applications report time to first token first." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a model that won on WER and lost on account numbers",
      body: [
        { t: "p", text: "**Symptom.** A team switched speech vendors because the new one had lower WER, and errors in spoken account numbers rose." },
        { t: "p", text: "**Mechanism.** WER weights every word equally. The new system was better on common words and worse on numbers, which mattered most to the business." },
        { t: "p", text: "**Fix.** Evaluation reports error rates for the entity types that matter alongside WER, with a fixed normaliser." }
      ] }
  ],

  takeaways: [
    "VAD gates everything; wake words are tuned for false accepts per hour, commonly under 1.",
    "Endpointing — has the user finished? — is distinct from VAD and is the hardest of the small models.",
    "All five of the WER cases reproduce exactly, including the S/D/I breakdown.",
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
      options: ["Different languages score differently", "Normalisation alone moved WER 0 → 0.17", "WER depends on the audio codec used", "The length of the reference varies"],
      answer: 1,
      why: "Measured on four hypotheses with the same meaning: exact match scored 0.0000 while spelled-out numbers, a trailing comma, or capitalisation each scored 0.1667. That range exceeds the gap between many competing systems, so a WER without a published normaliser is not comparable." },
    { stem: "How is a wake word's operating point chosen?",
      options: ["By maximising overall accuracy", "By a false-accept budget per hour", "By minimising the miss rate", "By the equal error rate point"],
      answer: 1,
      why: "The two errors have incomparable costs: a miss annoys, while a false accept means the device started recording a private conversation. So the threshold is set by a privacy constraint on false accepts and the miss rate is whatever that costs. Quoting wake-word accuracy conflates two things that must not be traded freely." },
    { stem: "Two systems have identical WER but one is clearly better in use. What metric would show that?",
      options: ["Character error rate", "Entity error rate", "Real-time factor", "Mean opinion score"],
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
