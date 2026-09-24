/* ============================================================================
   LESSON 2.7 — Machine Translation
   Mirrors 01_NLP_Notes.md · §15. Marian en-fr and fr-en are run in both
   directions; BLEU is computed by hand and then shown scoring a failed
   translation perfectly (scratchpad/nlp/n26.py, n27.py, n27b.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.7",

  lede: "**The worst translation in my test set scored a perfect round-trip BLEU of 1.0000, and the best one scored 0.3328.** *He kicked the bucket* came back word for word — because Marian had translated it literally into French, destroying the idiom, and then literally back. *The river bank was muddy* became *La rive était boueuse*, which is correct French, and scored lowest because *rive* already implies a river so the word could not survive the return trip. This lesson runs both directions and shows exactly where the metric and the meaning part company.",

  objectives: [
    "Run Marian and M2M100 and read the parameter counts honestly",
    "Compute BLEU's modified n-gram precision and brevity penalty by hand",
    "Explain why one zero-count n-gram order sends BLEU to zero",
    "Demonstrate three ways BLEU disagrees with translation quality",
    "Interpret a BLEU number against the standard bands"
  ],

  prerequisites: ["2.6", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "Neural machine translation", id: "nmt" },

    { t: "p", text: "Modern MT is an encoder-decoder transformer: the encoder reads the source sentence, the decoder generates the target one token at a time, attending back to the encoder at every step. Two families dominate what you will actually deploy." },

    { t: "dl", items: [
      ["Marian / OPUS-MT", "One small model per language pair, from Helsinki-NLP. Fast, CPU-friendly, hundreds of pairs published."],
      ["M2M100", "One model, 100 languages, any-to-any. You set `src_lang` and force the target language's BOS token."],
      ["Forced BOS token", "How a multilingual decoder is told which language to emit. Without it the model picks, and often picks wrong."],
      ["Beam search", "Keep the k best partial translations at each step rather than the single best. Standard at k = 4 for MT."]
    ] },

    { t: "code", lang: "python", title: "scratchpad/nlp/n27.py — Marian, English to French", code:
"import torch\nfrom transformers import MarianMTModel, MarianTokenizer\n\nname = \"Helsinki-NLP/opus-mt-en-fr\"\ntok = MarianTokenizer.from_pretrained(name)     # needs sentencepiece\nmod = MarianMTModel.from_pretrained(name).eval()\n\nfor src in [\"Machine learning is transforming the world.\",\n            \"The bank raised interest rates.\",\n            \"The river bank was muddy.\"]:\n    with torch.no_grad():\n        g = mod.generate(**tok(src, return_tensors=\"pt\"),\n                         num_beams=4, max_length=100)\n    print(tok.decode(g[0], skip_special_tokens=True))",
      caption: "The reference calls this through `pipeline(\"translation\", ...)`, which transformers 5.x removed. `MarianTokenizer` also requires `sentencepiece`, which is not a transformers dependency — install it separately." },

    { t: "out", text:
"75.1M params - a single-pair translation model is SMALL\n\nEN  Machine learning is transforming the world.\nFR  L'apprentissage automatique transforme le monde.\n\nEN  The bank raised interest rates.\nFR  La banque a relevé les taux d'intérêt.\n\nEN  The river bank was muddy.\nFR  La rive était boueuse." },

    { t: "callout", kind: "insight", title: "Word sense disambiguation, for free",
      body: [{ t: "p", text: "*Bank* became **banque** in the financial sentence and **rive** in the river sentence. Nobody gave the model a sense inventory or a disambiguation step — the encoder's contextual representation of *bank* simply differs between the two sentences, and the decoder reads that difference. This is the same fact you measured back in lesson 1.6 about static embeddings: one vector per word type cannot do this, and one vector per token can. The first output also matches the reference's quoted translation exactly." }] },

    { t: "h2", n: "02", text: "M2M100: one model, any direction", id: "m2m" },

    { t: "code", lang: "python", title: "Direct translation between any two of 100 languages", code:
"from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer\n\nmodel = M2M100ForConditionalGeneration.from_pretrained(\"facebook/m2m100_418M\")\ntok   = M2M100Tokenizer.from_pretrained(\"facebook/m2m100_418M\")\n\ntok.src_lang = \"en\"                       # tell the encoder the source\ninputs = tok(\"Life is beautiful.\", return_tensors=\"pt\")\n\ngenerated = model.generate(\n    **inputs,\n    forced_bos_token_id=tok.get_lang_id(\"hi\"))   # force Hindi output\nprint(tok.decode(generated[0], skip_special_tokens=True))",
      caption: "Forget `forced_bos_token_id` and the model chooses a language for you. It is the single most common M2M100 bug." },

    { t: "p", text: "M2M100's selling point is that it was trained on direct pairs rather than pivoting through English. Translating Hindi to French with Marian means Hindi → English → French, and every error in the first hop is inherited by the second. The cost is size: 418M parameters against Marian's 75.1M for a single pair, so if you only ever serve one direction Marian is five times cheaper." },

    { t: "diagram", kind: "compare", title: "One pair or one hundred",
      columns: [
        { title: "Marian per-pair", tone: "good", items: [
          "75.1M params per direction",
          "CPU inference is comfortable",
          "Best quality on its own pair",
          "N languages needs N x (N-1) models",
          "Cross-pair goes via English",
          "Pick when you serve 1-2 directions"
        ] },
        { title: "M2M100 multilingual", tone: "violet", items: [
          "418M params total",
          "GPU preferred",
          "Slightly behind on any single pair",
          "One model covers 9,900 directions",
          "Direct, no English pivot",
          "Pick when you serve many directions"
        ] }
      ] },

    { t: "h2", n: "03", text: "BLEU, from the definition", id: "bleu" },

    { t: "p", text: "BLEU is modified n-gram precision, geometrically averaged over n = 1 to 4, multiplied by a brevity penalty. Precision rather than recall, because a translation should not add content; the brevity penalty exists because precision alone would reward emitting one word you were sure of." },

    { t: "math", tex: "\\text{BLEU} = \\text{BP} \\cdot \\exp\\!\\left(\\sum_{n=1}^{4} w_n \\log p_n\\right), \\qquad \\text{BP} = \\begin{cases} 1 & c > r \\\\ e^{1 - r/c} & c \\leq r \\end{cases}" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n26.py — the reference's BLEU example", code:
"from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction\n\nreference = [[\"the\", \"cat\", \"sat\", \"on\", \"the\", \"mat\"]]\ncandidate =  [\"the\", \"cat\", \"is\", \"on\", \"the\", \"mat\"]\n\nprint(\"%.4f\" % sentence_bleu(reference, candidate))\n\n# and with smoothing, so a single zero order does not annihilate it\nsm = SmoothingFunction().method1\nprint(\"%.4f\" % sentence_bleu(reference, candidate, smoothing_function=sm))",
      caption: "One word differs out of six. Predict the score before reading the output." },

    { t: "out", text:
"reference : the cat sat on the mat\ncandidate : the cat is on the mat\n\nsentence_bleu = 0.0000\n\n  1-gram precision 5/6 = 0.8333\n  2-gram precision 3/5 = 0.6000\n  3-gram precision 1/4 = 0.2500\n  4-gram precision 0/3 = 0.0000    <- the geometric mean is now zero\n\nwith smoothing: 0.2541" },

    { t: "callout", kind: "trap", title: "Five of six words correct scores exactly zero",
      body: [{ t: "p", text: "The geometric mean multiplies the four precisions, so **one zero anywhere zeroes the product**. A six-word sentence has only three 4-grams, and changing one word in the middle breaks all three. This is why sentence-level BLEU is close to meaningless and why BLEU is defined as a *corpus* metric: aggregate the n-gram counts across the whole test set first, then divide, and a single sentence can no longer zero the result. If you must score single sentences, smoothing is mandatory — `method1` here moved 0.0000 to 0.2541." }] },

    { t: "h2", n: "04", text: "The brevity penalty", id: "bp" },

    { t: "out", text:
"reference: the quick brown fox jumps over the lazy dog   (9 words)\n\ncandidate length  BP       BLEU\n  1/9             0.0003   0.0001\n  3/9             0.1353   0.0761\n  5/9             0.4493   0.4493\n  9/9             1.0000   1.0000" },

    { t: "p", text: "At 5 words of 9 every n-gram the candidate emitted was correct, so all four precisions are 1.0 and BLEU equals the brevity penalty exactly — 0.4493. That is the penalty doing the entire job. Without it, the translator's optimal strategy would be to emit the three words it was most confident about and stop." },

    { t: "h2", n: "05", text: "Where BLEU and meaning part company", id: "roundtrip" },

    { t: "p", text: "Round-tripping a sentence through French and back is a tempting way to check a translator without a reference. I ran it on six sentences, and the ranking it produced is the opposite of the truth." },

    { t: "out", text:
"EN   He kicked the bucket.\nFR   Il a donné un coup de pied au seau.\nEN'  He kicked the bucket.\nround-trip BLEU 1.0000\n\nEN   The river bank was muddy.\nFR   La rive était boueuse.\nEN'  The bank was muddy.\nround-trip BLEU 0.3328\n\nEN   The spirit is willing but the flesh is weak.\nFR   L'esprit est disposé, mais la chair est faible.\nEN'  The spirit is ready, but the flesh is weak.\nround-trip BLEU 0.5969" },

    { t: "callout", kind: "crit", title: "The perfect score marks the total failure",
      body: [{ t: "p", text: "*Il a donné un coup de pied au seau* means a man physically kicked a pail. The English idiom means he died. Marian translated it literally, destroying the meaning completely — and because the literal translation round-trips literally, BLEU returned **1.0000**. Meanwhile *La rive était boueuse* is a correct translation, and it scored **0.3328** only because French *rive* already means a river bank, so the word *river* had nowhere to come from on the way back. The metric ranked a catastrophic failure first and a correct translation last." }] },

    { t: "p", text: "The same disagreement shows up without the round trip. Scoring candidates directly against a reference gives a paraphrase 0.0955 and a sentence with the meaning reversed 0.2857 — BLEU preferred the sentence that says the opposite of the truth, because it reuses more of the reference's words." },

    { t: "out", text:
"reference: the cat sat on the mat\n\nbleu 0.0955   perfect paraphrase   'the feline rested on the rug'\nbleu 0.2857   reversed meaning     'the mat sat on the cat'\nbleu 1.0000   exact match          'the cat sat on the mat'" },

    { t: "diagram", kind: "steps", title: "Three ways BLEU misreads a translation",
      items: [
        { title: "Synonyms are invisible", text: "feline for cat, rug for mat: a correct paraphrase scores 0.0955 because BLEU matches surface strings, not meaning." },
        { title: "Word order barely registers", text: "Reversing subject and object scores 0.2857 — higher than the paraphrase. Unigrams all match; only some bigrams break." },
        { title: "Implicit information is punished", text: "French rive already means river bank, so a correct translation loses a word on the return trip and scores 0.3328." }
      ] },

    { t: "h2", n: "06", text: "Reading a BLEU number", id: "bands" },

    { t: "table",
      head: ["BLEU", "What it means in practice"],
      rows: [
        ["under 10", "Almost useless"],
        ["10–19", "Hard to get the gist"],
        ["20–29", "The gist is clear, with significant errors"],
        ["30–40", "Understandable to good"],
        ["40–50", "High quality"],
        ["50–60", "Very high quality, adequate and fluent"],
        ["over 60", "Often better than a human translation"]
      ] },

    { t: "callout", kind: "warn", title: "BLEU is only comparable within one test set",
      body: [{ t: "p", text: "These bands are a rough guide, not a scale. BLEU depends on the number of references, the tokenisation, the domain, and the language pair — Chinese-English BLEU is systematically lower than French-English without the translations being worse. A score of 34 on your data and 34 in a paper are not the same measurement. Use `sacrebleu`, which fixes tokenisation and prints a signature describing the exact configuration, and only ever compare systems on identical data. Current practice supplements it with COMET or BLEURT, which are learned metrics that score meaning and do catch the paraphrase case." }] },

    { t: "exercise", title: "Break the metric yourself",
      tasks: [
        "Translate ten sentences to French and back, and compute round-trip BLEU for each. Find one where a high score hides a bad translation.",
        "Write a candidate that scores above 0.5 against a reference while meaning something different. Note what you had to preserve.",
        "Compute corpus BLEU over 100 sentence pairs and then the mean of their sentence BLEUs. Explain the gap.",
        "Run the same test set through `sacrebleu` and NLTK and compare. If they differ, find the tokenisation difference responsible.",
        "Score the same outputs with COMET and rank the sentences by each metric. Inspect the ten sentences the two rankings disagree on most."
      ] }
  ],

  takeaways: [
    "Marian is 75.1M parameters per direction and disambiguates 'bank' into 'banque' and 'rive' from context alone, with no sense inventory.",
    "M2M100 is 418M parameters but covers 9,900 directions without pivoting through English; forget `forced_bos_token_id` and it picks its own output language.",
    "BLEU is a geometric mean over four n-gram orders, so a single zero order annihilates the score — five of six words correct scored 0.0000.",
    "The brevity penalty is what stops a precision metric rewarding truncation; at 5 words of 9, BLEU equalled the penalty exactly at 0.4493.",
    "Round-trip BLEU gave a destroyed idiom 1.0000 and a correct translation 0.3328 — it measures invertibility, not correctness.",
    "Scoring directly, BLEU preferred a reversed meaning (0.2857) over a correct paraphrase (0.0955).",
    "BLEU is comparable only within one test set and tokenisation; use sacrebleu for the number and COMET or BLEURT to catch what it cannot see."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did 'the cat is on the mat' score exactly 0.0000 against 'the cat sat on the mat'?",
      options: ["The brevity penalty", "The 4-gram precision was 0/3, and the geometric mean multiplies all four orders", "The sentences have different lengths", "NLTK requires multiple references"],
      answer: 1,
      why: "Unigram precision was 0.8333 and bigram 0.6000, but a six-word sentence has only three 4-grams and changing one middle word broke all three. Zero times anything is zero. This is why BLEU is a corpus metric and why sentence-level use needs smoothing — which lifted it to 0.2541." },
    { stem: "Why did the idiom 'he kicked the bucket' get a round-trip BLEU of 1.0000?",
      options: ["Marian translated it correctly", "Because the literal French translation round-trips literally, so the metric sees a perfect match while the meaning was destroyed", "Because the sentence is short", "Because of the brevity penalty"],
      answer: 1,
      why: "It became 'Il a donné un coup de pied au seau' — a man physically kicking a pail, not a death. The failure is symmetric, so the return trip reproduces the original exactly. Round-trip BLEU measures whether a transformation is invertible, which is not the same as whether it is correct." },
    { stem: "Why did a correct translation of 'the river bank was muddy' score only 0.3328?",
      options: ["The translation was wrong", "French 'rive' already means river bank, so the word 'river' had no source on the way back", "The model dropped a word by mistake", "The brevity penalty misfired"],
      answer: 1,
      why: "'La rive était boueuse' is correct — 'rive' specifically denotes the bank of a river, making 'river' redundant in French. Coming back it surfaced as 'The bank was muddy'. Information legitimately becoming implicit in the target language is invisible to a surface-overlap metric, which reads it as loss." },
    { stem: "What does the brevity penalty prevent?",
      options: ["Hallucinated content", "A system emitting only the few words it is most confident about, which would score perfect precision", "Repeated n-grams", "Wrong word order"],
      answer: 1,
      why: "BLEU is precision-based, so a short correct fragment has precision 1.0 in every order. At 5 words out of 9 all four precisions were 1.0 and BLEU equalled the penalty exactly, 0.4493. Without it the optimal strategy is to stop early, which is the opposite of translating." }
  ] },

  interview: { title: "Interview", sub: "Machine translation", questions: [
    { level: "Core", q: "How does BLEU work, and what are its limitations?",
      strong: "Modified n-gram precision over orders 1-4, geometrically averaged, times a brevity penalty — blind to synonyms and nearly blind to word order.",
      answer: [{ t: "p", text: "It computes modified n-gram precision for n from 1 to 4 — clipping each n-gram count at how often it appears in the reference so repeating a correct word cannot inflate the score — takes the geometric mean, and multiplies by a brevity penalty that punishes output shorter than the reference. The geometric mean is the first thing to understand about its behaviour: one zero order zeroes the whole score, so a six-word sentence with one word changed in the middle scores 0.0000 despite five of six words matching. That makes sentence-level BLEU nearly useless without smoothing, and it is why BLEU is properly a corpus metric. The deeper limitation is that it matches surface strings. I have measured a correct paraphrase scoring 0.0955 while a sentence with subject and object swapped — meaning the opposite of the reference — scored 0.2857. BLEU preferred the wrong sentence because it reused more reference words. It is a useful regression signal on a fixed test set and a bad proxy for quality." }] },
    { level: "Senior", q: "Is round-trip translation a valid way to check quality without references?",
      strong: "No — it measures invertibility, and the failure I measured scored a perfect 1.0000.",
      answer: [{ t: "p", text: "No, and I can give the counterexample. I round-tripped 'He kicked the bucket' through French: Marian produced 'Il a donné un coup de pied au seau', which describes a man physically kicking a pail, and the idiom's meaning was completely destroyed. But because the literal translation round-trips literally, the recovered English was word-for-word identical and round-trip BLEU was 1.0000. In the same run, 'The river bank was muddy' translated correctly to 'La rive était boueuse' and scored 0.3328, because French 'rive' already implies a river so that word could not survive the return. So the metric ranked a catastrophic failure first and a correct translation last. The reason is structural: a round trip scores whether the transformation is invertible, and systematic errors are invertible while correct translations that let information become implicit in the target language are not. If I have no references I would use a reference-free learned metric like COMET-QE, or back-translation as a data augmentation technique — which is what it is genuinely good for — rather than as evaluation." }] },
    { level: "Senior", q: "You are choosing between per-pair Marian models and one multilingual model. How do you decide?",
      strong: "Count the directions you actually serve; Marian wins on one or two, M2M100 wins past a handful.",
      answer: [{ t: "p", text: "The deciding number is how many directions you serve in production, not how many you might. Marian is 75.1M parameters per direction and runs comfortably on CPU, so for one or two language pairs it is roughly five times cheaper than M2M100's 418M and usually slightly better on its own pair, because the whole capacity is spent there. The moment you need many directions the arithmetic inverts: per-pair models scale as N by N-1, so ten languages is ninety models to serve, version and monitor, which is an operational problem long before it is a compute one. M2M100 also translates directly between non-English pairs, where a Marian deployment has to pivot through English and compounds the errors of two hops. So: one or two fixed directions, Marian; a long tail of pairs or any significant non-English-to-non-English traffic, the multilingual model. A common middle path is Marian for the two or three high-volume directions and a multilingual model behind them for the tail, which keeps the cheap path cheap." }] }
  ] }
});
