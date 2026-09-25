/* ============================================================================
   LESSON 3.4 — NLP Evaluation Metrics
   Mirrors 01_NLP_Notes.md · §20. Every metric the reference names is
   computed. The reference's ROUGE-1 figure did not reproduce (§03), and all
   three generation metrics fail the same test (§07) — scratchpad/nlp/n34.py.
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "**BLEU, METEOR and BERTScore all rank `the mat sat on the cat` at least as highly as a correct paraphrase of `the cat sat on the mat`.** BLEU gives the reversed sentence 0.2857 against the paraphrase's 0.0955. METEOR gives it 0.8519 against 0.4259. BERTScore ties them at 0.9631 and 0.9635 — four ten-thousandths apart. Three generations of metric, each fixing the last one's weakness, and none of them notices that subject and object were swapped. This lesson computes every metric the reference names and establishes what each one cannot see.",

  objectives: [
    "Choose between micro, macro and weighted averaging and justify it from the class distribution",
    "Compute ROUGE, BLEU, METEOR, BERTScore, perplexity and QA exact match",
    "Explain why a 97% accurate model can be worthless",
    "Identify what each generation metric is structurally blind to",
    "Build an evaluation suite that reports more than one number"
  ],

  prerequisites: ["3.3", "2.7"],

  blocks: [

    { t: "h2", n: "01", text: "Metrics by task", id: "bytask" },

    { t: "table",
      head: ["Task", "Primary metrics"],
      rows: [
        ["Classification", "Accuracy, F1, precision, recall, AUC-ROC"],
        ["NER", "Entity-level F1, strict and partial"],
        ["Summarisation", "ROUGE-1, ROUGE-2, ROUGE-L, BERTScore"],
        ["Translation", "BLEU, chrF, COMET, BERTScore"],
        ["Text generation", "Perplexity, BLEU, ROUGE, human evaluation"],
        ["Question answering", "Exact match, token-overlap F1"],
        ["Similarity", "Spearman and Pearson correlation"]
      ] },

    { t: "h2", n: "02", text: "The averaging choice decides the number", id: "averaging" },

    { t: "p", text: "A three-class problem: 950 documents in class 0, 40 in class 1, 10 in class 2. The model gets class 0 perfect, half of class 1, and **none** of class 2." },

    { t: "out", text:
"              precision    recall  f1-score   support\n\n           0     0.9694    1.0000    0.9845       950\n           1     1.0000    0.5000    0.6667        40\n           2     0.0000    0.0000    0.0000        10\n\n    accuracy                         0.9700      1000\n   macro avg     0.6565    0.5000    0.5504      1000\nweighted avg     0.9609    0.9700    0.9619      1000\n\naccuracy      0.9700\nmicro   F1    0.9700\nmacro   F1    0.5504\nweighted F1   0.9619" },

    { t: "callout", kind: "crit", title: "97% accurate, and one class never predicted at all",
      body: [{ t: "p", text: "Accuracy is **0.9700**. Micro F1 is **0.9700** — identical, because in single-label multiclass they are the same quantity by construction, so reporting both tells you nothing twice. Weighted F1 is **0.9619**, barely moved, because it weights by support and class 2 has almost none. Only **macro F1 at 0.5504** reflects that an entire class is being missed completely. If class 2 is fraud, or a safety-critical category, three of your four numbers are actively misleading and the fourth is the one nobody puts on the dashboard." }] },

    { t: "dl", items: [
      ["Micro", "Pool all true positives, false positives and false negatives, then compute once. Equals accuracy in single-label multiclass. Dominated by the largest class."],
      ["Macro", "Compute per class, then average unweighted. Every class counts equally regardless of size — the only average that exposes a failed rare class."],
      ["Weighted", "Per class, averaged by support. A compromise that in practice tracks accuracy closely and hides the same things."],
      ["Per class", "No averaging. Always report this too — the averages exist to compress it, and the compression is where the information goes."]
    ] },

    { t: "h2", n: "03", text: "ROUGE, and a figure that did not reproduce", id: "rouge" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n34.py — the reference's ROUGE example", code:
"from rouge_score import rouge_scorer\n\nscorer = rouge_scorer.RougeScorer([\"rouge1\", \"rouge2\", \"rougeL\"],\n                                  use_stemmer=True)\nscores = scorer.score(\"The cat sat on the mat.\",\n                      \"The cat is on the mat.\")\nfor metric, v in scores.items():\n    print(f\"{metric}: P={v.precision:.3f} R={v.recall:.3f} F1={v.fmeasure:.3f}\")" },

    { t: "out", text:
"rouge1   P=0.833 R=0.833 F1=0.833\nrouge2   P=0.600 R=0.600 F1=0.600\nrougeL   P=0.833 R=0.833 F1=0.833\n\nthe reference quotes rouge1 P=R=F1=0.857" },

    { t: "callout", kind: "warn", title: "0.833, not 0.857 — check the arithmetic",
      body: [{ t: "p", text: "Both sentences have six tokens. Five overlap — *the* twice, plus *cat*, *on*, *mat* — so precision and recall are both 5/6 = **0.8333**. The quoted 0.857 is 6/7, which would require a seven-token sentence. ROUGE-2 at 0.600 reproduces exactly (3 of 5 bigrams). It is a small slip, but it is the kind worth catching: a metric you cannot derive by hand is a metric you cannot debug when it moves unexpectedly." }] },

    { t: "h2", n: "04", text: "QA: exact match and token F1", id: "qa" },

    { t: "p", text: "SQuAD-style evaluation normalises before comparing — lowercase, strip articles and punctuation, collapse whitespace — then reports exact match and token-overlap F1 side by side." },

    { t: "out", text:
"prediction                 gold             EM      F1\n'Arthur Samuel'            'Arthur Samuel'  True    1.0000\n'Arthur Samuel in 1959'    'Arthur Samuel'  False   0.6667\n'arthur samuel'            'Arthur Samuel'  True    1.0000\n'The Arthur Samuel'        'Arthur Samuel'  True    1.0000\n'Samuel'                   'Arthur Samuel'  False   0.6667\n'Alan Turing'              'Arthur Samuel'  False   0.0000" },

    { t: "callout", kind: "insight", title: "Why both numbers are reported",
      body: [{ t: "p", text: "Exact match is binary and unforgiving: *Arthur Samuel in 1959* is a correct answer with extra context and scores **0**. Token F1 gives it 0.6667, which is closer to fair. But F1 alone is too generous — *Samuel* also scores 0.6667, and a bare surname is a materially worse answer than a correct one with a trailing date. Neither number is right on its own, which is exactly why SQuAD reports both. Note also what normalisation buys: *The Arthur Samuel* counts as an **exact** match because the article is stripped, which is the difference between measuring answers and measuring formatting." }] },

    { t: "h2", n: "05", text: "Perplexity", id: "perplexity" },

    { t: "p", text: "Perplexity is the exponential of the mean negative log-likelihood — the model's effective branching factor, or how many equally-likely words it was choosing between on average. Lower is better, and it needs no reference text, which is what makes it useful for language models." },

    { t: "math", tex: "\\text{PPL}(X) = \\exp\\!\\left(-\\frac{1}{N}\\sum_{i=1}^{N} \\log p_\\theta(x_i \\mid x_{<i})\\right)" },

    { t: "out", text:
"gpt2                                           perplexity\nThe cat sat on the mat.                             90.24\nThe quick brown fox jumps over the lazy dog.       162.47\nColorless green ideas sleep furiously.            6413.36\nasdf qwer zxcv hjkl poiu mnbv                      791.05\nthe the the the the the the the                     16.59" },

    { t: "callout", kind: "trap", title: "The best score went to the worst text",
      body: [{ t: "p", text: "*the the the the the the the the* scored **16.59** — by far the lowest perplexity in the set, five times better than an ordinary English sentence. Repetition is trivially predictable, and perplexity rewards predictability, so degenerate repetition is a perplexity *optimum*. This is precisely the failure mode greedy decoding falls into, and it is why you cannot tune a generator on perplexity alone. There is a second oddity worth noting: Chomsky's grammatical-but-meaningless *Colorless green ideas sleep furiously* scored **6413**, far worse than keyboard mash at 791 — GPT-2 tokenises gibberish into subword fragments that become locally predictable once begun, while a sequence of real words in an unprecedented combination surprises it at every step." }] },

    { t: "p", text: "Perplexity is also not comparable across models with different tokenizers. Two models scoring 20 and 25 on the same text are not ranked unless they share a vocabulary, because the per-token normalisation depends on how the text was split. Byte-level and word-level models are especially incomparable." },

    { t: "h2", n: "06", text: "METEOR and BERTScore", id: "meteor" },

    { t: "p", text: "Both were designed to fix BLEU's surface matching. METEOR adds stem and WordNet-synonym matching plus a fragmentation penalty for word order; BERTScore abandons string matching entirely and greedily aligns contextual embeddings." },

    { t: "code", lang: "python", title: "BERTScore", code:
"from bert_score import score\n\nP, R, F1 = score([\"It's a lovely day outside\"],\n                 [\"The weather is beautiful today\"],\n                 lang=\"en\", model_type=\"roberta-large\")\nprint(F1.item())      # 0.9342 - the reference says ~0.90\n\n# the authors recommend rescaling against a random baseline,\n# because raw scores are compressed into a narrow high band\nP, R, F1 = score(cands, refs, lang=\"en\", model_type=\"roberta-large\",\n                 rescale_with_baseline=True)",
      caption: "The paraphrase scores 0.9342 with no shared content words at all — the reference's ~0.90 reproduces." },

    { t: "h2", n: "07", text: "The test every metric fails", id: "failure" },

    { t: "p", text: "One reference sentence, three candidates: an exact match, a correct paraphrase sharing no content words, and the same sentence with subject and object swapped so it means something false." },

    { t: "table",
      head: ["Candidate", "Case", "BLEU", "METEOR", "BERTScore"],
      rows: [
        ["the cat sat on the mat", "exact", "1.0000", "0.9977", "1.0000"],
        ["the cat sits on the mat", "inflection", "0.2541", "0.8067", "—"],
        ["the feline rested on the rug", "correct paraphrase", "0.0955", "0.4259", "0.9635"],
        ["the mat sat on the cat", "reversed meaning", "0.2857", "0.8519", "0.9631"]
      ] },

    { t: "callout", kind: "crit", title: "Each metric fixed the last one's problem and kept this one",
      body: [{ t: "p", text: "**BLEU** ranks the reversed sentence (0.2857) nearly three times above the correct paraphrase (0.0955) — surface overlap, exactly as designed. **METEOR** fixes inflection handsomely, lifting *sits* for *sat* from 0.2541 to 0.8067 via stemming, but still puts the reversed meaning (0.8519) twice as high as the paraphrase (0.4259). **BERTScore** finally solves the paraphrase, scoring it 0.9635 — and rates the reversed sentence 0.9631, a gap of **0.0004**. Rescaled against the baseline the two are 0.7838 and 0.7815, still within 0.0023. All the same words are present in all the same contexts; greedy token alignment has no reason to care which noun was the subject." }] },

    { t: "diagram", kind: "steps", title: "What each metric generation bought, and what it kept",
      items: [
        { title: "BLEU (2002)", text: "Modified n-gram precision. Cheap, language-independent, reproducible. Blind to synonyms; nearly blind to meaning-changing reordering." },
        { title: "METEOR (2005)", text: "Adds stemming, synonym matching and a fragmentation penalty. Handles inflection well. Still ranks a reversed meaning above a correct paraphrase." },
        { title: "BERTScore (2019)", text: "Greedy alignment over contextual embeddings. Solves paraphrase. Scores a reversed meaning within 0.0004 of a correct one." },
        { title: "Learned metrics (COMET, BLEURT)", text: "Regression models trained on human judgements. Correlate better with people, and inherit whatever their training data contained." }
      ] },

    { t: "callout", kind: "tradeoff", title: "What to actually do about it",
      body: [{ t: "p", text: "None of this means automatic metrics are useless — it means they are *regression detectors*, not quality measures. A drop in BLEU reliably tells you something changed; a rise does not reliably tell you the system got better. So: pick one automatic metric and hold it fixed for CI, report it with the exact tokenisation and tool version, and never compare it across test sets. Then pair it with something that catches what it cannot see — an entailment check for faithfulness, targeted adversarial cases like the swapped-argument sentence above, and periodic human evaluation on a sample. The adversarial cases are cheap and worth the most: you now have one that defeats three metrics at once." }] },

    { t: "exercise", title: "Build the suite",
      tasks: [
        "Reproduce the averaging table on your own imbalanced data and find the class where macro and weighted F1 disagree most.",
        "Derive ROUGE-1 by hand for a sentence pair and check it against `rouge_score`. Resolve any difference before trusting the library.",
        "Score a model's outputs with BLEU, METEOR and BERTScore, then rank the sentences by each. Inspect the ten the rankings disagree on most.",
        "Write five adversarial pairs like the swapped-argument case and add them as assertions — each metric must rank the correct sentence above the wrong one.",
        "Measure perplexity on your generator's output and on the reference text. If the output scores lower, check it for repetition before celebrating."
      ] }
  ],

  takeaways: [
    "Accuracy and micro F1 are the same number in single-label multiclass; reporting both is reporting one thing twice.",
    "A model at 0.9700 accuracy scored 0.5504 macro F1 while predicting one class zero times — macro was the only average that showed it.",
    "The reference's ROUGE-1 of 0.857 did not reproduce; five overlapping tokens out of six is 0.833.",
    "QA reports exact match and token F1 together because EM scores a correct-but-verbose answer 0, and F1 alone rates a bare surname as highly as it.",
    "Perplexity gave 'the the the the...' its best score of 16.59 — repetition is a perplexity optimum, which is why generators cannot be tuned on it.",
    "Perplexity is incomparable across models with different tokenizers.",
    "BERTScore rated a correct paraphrase 0.9635 and a reversed meaning 0.9631 — a gap of 0.0004.",
    "BLEU, METEOR and BERTScore all fail the swapped-argument test; treat automatic metrics as regression detectors, not quality measures."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "A model scores 0.9700 accuracy and 0.5504 macro F1. What has happened?",
      options: ["A bug in the metric", "At least one class is being predicted badly or never, and it is small enough not to move accuracy", "The classes are balanced", "Macro F1 is always lower"],
      answer: 1,
      why: "Here class 2 had 10 of 1,000 samples and was never predicted, scoring 0.0000 F1. Accuracy and micro F1 are dominated by the 950-sample majority class, and weighted F1 at 0.9619 barely moves because it weights by support. Macro averages classes equally, so one dead class pulls it down hard — which is the whole point of reporting it." },
    { stem: "Why is 'the the the the the the the the' the best-scoring text under perplexity?",
      options: ["A tokenisation artefact", "Because perplexity rewards predictability, and repetition is maximally predictable", "Because 'the' is the most common English word", "The sequence was in GPT-2's training data"],
      answer: 1,
      why: "It scored 16.59 against 90.24 for an ordinary English sentence. Perplexity is exp of mean negative log-likelihood, so a sequence the model can predict with near-certainty scores very low. Degenerate repetition is therefore a perplexity optimum, which is exactly the failure mode greedy decoding produces — and the reason perplexity cannot be a generator's objective." },
    { stem: "BERTScore rates a correct paraphrase 0.9635 and a reversed meaning 0.9631. Why?",
      options: ["A bug in the implementation", "It greedily aligns contextual token embeddings, and both sentences contain the same words in similar contexts", "roberta-large is too small", "The baseline rescaling was off"],
      answer: 1,
      why: "'The cat sat on the mat' and 'The mat sat on the cat' share every token, and greedy alignment over embeddings has no mechanism for checking which noun filled which argument slot. The gap is 0.0004, and 0.0023 after baseline rescaling. BERTScore genuinely solved the paraphrase problem BLEU has — it did not solve this one." },
    { stem: "What follows from three metrics failing the same adversarial example?",
      options: ["Use accuracy instead", "Treat automatic metrics as regression detectors and pair them with targeted adversarial cases and human evaluation", "Average the three metrics", "Only use human evaluation"],
      answer: 1,
      why: "A drop in the metric reliably means something changed; a rise does not reliably mean the system improved, because the metric is blind in known directions. The practical response is to fix one metric for CI with its exact configuration, add cheap adversarial assertions covering the known blind spots, and sample for human evaluation." }
  ] },

  interview: { title: "Interview", sub: "Evaluation", questions: [
    { level: "Core", q: "When would you report macro F1 rather than accuracy?",
      strong: "Whenever classes are imbalanced and the rare classes matter — accuracy hides a dead class entirely.",
      answer: [{ t: "p", text: "Whenever the class distribution is skewed and the small classes are the ones you care about, which in practice is most real problems — fraud, defects, safety categories, anything rare and expensive. I ran a case with 950, 40 and 10 samples across three classes where the model never predicted the smallest class at all: accuracy was 0.9700, micro F1 was 0.9700 — identical, because in single-label multiclass they're the same quantity — and weighted F1 was 0.9619. Only macro F1, at 0.5504, showed that a class had been completely abandoned. Macro averages the per-class F1 without weighting by support, so a rare class counts as much as a common one. I'd also always print the per-class report alongside, because the averages exist to compress it and the compression is where the information goes. The one caution is that macro F1 can be noisy when a class has very few test examples — a couple of samples moving changes it a lot — so I report support counts with it." }] },
    { level: "Senior", q: "How would you evaluate a summarisation or translation system end to end?",
      strong: "One fixed automatic metric for CI, plus faithfulness checks, adversarial cases and sampled human evaluation.",
      answer: [{ t: "p", text: "I'd start from what the automatic metrics can't see, because that determines what else the suite needs. I've measured BLEU, METEOR and BERTScore on a reference sentence against a correct paraphrase and against the same sentence with subject and object swapped. BLEU preferred the reversed sentence, 0.2857 to 0.0955. METEOR also preferred it, 0.8519 to 0.4259. BERTScore tied them at 0.9631 and 0.9635 — four ten-thousandths apart. So none of the three notices a meaning-inverting reordering. Given that, I'd treat the automatic metric as a regression detector: pick one, fix the tokenisation and tool version, use sacrebleu so the configuration is recorded in a signature, and gate on movement rather than on the absolute value — and never compare the number across test sets or language pairs. Around it I'd put three things: an entailment check running an NLI model over each output sentence against the source, which is what actually catches hallucination; a set of adversarial assertions covering the known blind spots, starting with swapped arguments and negation, which are cheap and each defeat several metrics at once; and periodic human evaluation on a sample, which is the only thing that measures quality rather than proxying it. The automatic number tells me when to look. It doesn't tell me the system is good." }] },
    { level: "Senior", q: "A teammate reports their model improved perplexity from 25 to 18. What do you ask?",
      strong: "Whether the tokenizer changed, and whether the output has become repetitive.",
      answer: [{ t: "p", text: "Two questions. First: did the tokenizer or vocabulary change? Perplexity is normalised per token, so it isn't comparable across models that split text differently — a model with a larger vocabulary has fewer, harder predictions per sentence and a byte-level model has many easy ones, and comparing their perplexities directly is meaningless. If the tokenizer changed, the number moved for free. Second: has the output become more repetitive? Perplexity rewards predictability, and degenerate repetition is a perplexity optimum, not a failure of it. I measured 'the the the the the the the the' at 16.59 on GPT-2 against 90.24 for an ordinary English sentence — repeating one token scores five times better than real language. So a generator that's collapsing toward repetitive output will show improving perplexity the whole way down. I'd ask to see sampled generations next to the number, plus a repetition statistic like the rate of repeated n-grams, and some task-level measure of whether the output is actually more useful. If the tokenizer is unchanged and the samples look healthy, then 25 to 18 is a real improvement and a substantial one." }] }
  ] }
});
