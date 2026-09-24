/* ============================================================================
   LESSON 2.6 — Text Summarisation
   Mirrors 01_NLP_Notes.md · §14. The TF-IDF sentence scorer, TextRank, and T5
   and BART run for real; the "abstractive" models are measured for how much
   they actually abstract (scratchpad/nlp/n26.py, n26b.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "**Both \"abstractive\" summarisers produced a 100% copy rate.** The textbook split is that extractive systems select sentences and abstractive systems write new ones — so I measured it. On clean prose `facebook/bart-large-cnn` emitted a 20-word verbatim run and not one word absent from the source; on a rambling transcript it copied 57 of 57 words and simply stopped mid-sentence. The distinction is real in the architecture and much softer in the output, and knowing which you actually get decides whether you need a hallucination check.",

  objectives: [
    "Build an extractive summariser from TF-IDF sentence scores and see its failure mode",
    "Explain what TextRank and LexRank add over raw term weighting",
    "Run T5 and BART and measure their copy rate against the source",
    "Compute ROUGE-1, ROUGE-2 and ROUGE-L by hand",
    "Choose extractive or abstractive from faithfulness and latency requirements"
  ],

  prerequisites: ["2.1", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Two families", id: "families" },

    { t: "p", text: "Summarisation condenses a document while keeping what matters. The two approaches differ in where the output words come from." },

    { t: "dl", items: [
      ["Extractive", "Score the sentences already in the document, keep the top few, emit them in their original order. Every output word appeared in the input."],
      ["Abstractive", "Generate new text conditioned on the document. The output may contain words the document never used — and facts it never contained."],
      ["Compression ratio", "Output length over input length. The dial you actually tune; most systems target 10–30%."],
      ["Faithfulness", "Whether the summary asserts only what the source asserts. Extraction gets this free. Generation does not."]
    ] },

    { t: "diagram", kind: "compare", title: "Where the output words come from",
      columns: [
        { title: "Extractive", tone: "good", items: [
          "Rank sentences, keep top k",
          "Output is a subset of the input",
          "Faithful by construction",
          "Choppy: no connectives between picks",
          "CPU, milliseconds, no training",
          "TextRank, LexRank, LSA"
        ] },
        { title: "Abstractive", tone: "violet", items: [
          "Generate token by token",
          "Output may use new words",
          "Can hallucinate facts",
          "Fluent: reads like prose",
          "GPU, seconds, pretrained model",
          "T5, BART, PEGASUS"
        ] }
      ] },

    { t: "h2", n: "02", text: "Extractive, from TF-IDF alone", id: "tfidf" },

    { t: "p", text: "The cheapest scorer sums the TF-IDF weights of a sentence's terms. Rare, content-bearing words push a sentence up; stopwords contribute nothing once they are removed. Original order is preserved so the result still reads forwards." },

    { t: "code", lang: "python", title: "scratchpad/nlp/n26.py — extractive summarisation", code:
"from sklearn.feature_extraction.text import TfidfVectorizer\nimport numpy as np\n\ndef extractive_summarize(text, num_sentences=3):\n    \"\"\"Select the top-N sentences by summed TF-IDF weight.\"\"\"\n    sentences = text.split(\". \")\n    tfidf = TfidfVectorizer(stop_words=\"english\")\n    matrix = tfidf.fit_transform(sentences)\n\n    scores = matrix.sum(axis=1).A1          # one score per sentence\n    top = sorted(np.argsort(scores)[-num_sentences:])   # keep reading order\n    return \". \".join(sentences[i] for i in top)\n\ntext = (\"The transformer architecture was introduced in 2017. \"\n        \"It replaced recurrence with self-attention. \"\n        \"The weather that week was unremarkable. \"\n        \"Attention allows every position to see every other position. \"\n        \"This made training parallel across the sequence.\")",
      caption: "Mirrors the reference's `extractive_summarize`, with the per-sentence scores printed so the ranking is visible." },

    { t: "out", text:
"sentence                                                   score\nThe transformer architecture was introduced in 2017        2.0000\nIt replaced recurrence with self-attention                 1.9923\nThe weather that week was unremarkable                     1.7321\nAttention allows every position to see every other posit   1.6014\nThis made training parallel across the sequence.           1.7321\n\ntop-2 summary: The transformer architecture was introduced in 2017.\n               It replaced recurrence with self-attention" },

    { t: "callout", kind: "trap", title: "The irrelevant sentence outranked the relevant one",
      body: [{ t: "p", text: "*The weather that week was unremarkable* scored **1.7321** — above *Attention allows every position to see every other position* at **1.6014**. The weather sentence is the one sentence in the document that could be deleted without loss, and the scorer ranked it fourth from the top. TF-IDF rewards rare words, and *weather* and *unremarkable* are rare in this document. Nothing in the objective asks which sentence carries the argument." }] },

    { t: "p", text: "The other structural bias is length. Summing over terms means a long sentence accumulates more weight than a short one saying the same thing, so raw sums quietly favour verbosity. Dividing by sentence length removes that but then over-rewards short sentences with one exotic word. Neither normalisation addresses the real problem, which is that term rarity is not importance." },

    { t: "h2", n: "03", text: "What TextRank adds", id: "textrank" },

    { t: "p", text: "TextRank replaces \"which sentence has rare words\" with \"which sentence is similar to many other sentences\". Build a graph whose nodes are sentences and whose edge weights are pairwise similarities, then run PageRank. A sentence central to the document's own similarity graph is one the document keeps returning to — a much better proxy for importance than rarity, and it needs no training either." },

    { t: "diagram", kind: "flow", title: "TextRank: centrality as importance", cols: 3,
      nodes: [
        { id: "s", text: "Split into sentences", tone: "accent" },
        { id: "v", text: "Vectorise each one", tone: "accent" },
        { id: "g", text: "Graph: edges = cosine similarity", tone: "violet" },
        { id: "p", text: "PageRank over the graph", tone: "violet" },
        { id: "k", text: "Keep top k by centrality", tone: "good" },
        { id: "o", text: "Emit in document order", tone: "good" }
      ],
      edges: [["s","v"],["v","g"],["g","p"],["p","k"],["k","o"]] },

    { t: "code", lang: "python", title: "sumy — TextRank, LexRank and LSA", code:
"from sumy.parsers.plaintext import PlaintextParser\nfrom sumy.nlp.tokenizers import Tokenizer\nfrom sumy.summarizers.text_rank import TextRankSummarizer\nfrom sumy.summarizers.lex_rank import LexRankSummarizer\nfrom sumy.summarizers.lsa import LsaSummarizer\n\nparser = PlaintextParser.from_string(text, Tokenizer(\"english\"))\nsummary = TextRankSummarizer()(parser.document, sentences_count=3)\nprint(\" \".join(str(s) for s in summary))",
      caption: "LexRank is the same idea with a similarity threshold; LSA factorises the term-sentence matrix and keeps sentences loading on the top singular vectors." },

    { t: "h2", n: "04", text: "Abstractive: T5 and BART", id: "abstractive" },

    { t: "p", text: "Abstractive models are encoder-decoders: the encoder reads the document, the decoder generates the summary one token at a time. T5 frames every task as text-to-text and needs the prefix `summarize: `; BART was fine-tuned on CNN/DailyMail news and needs no prefix." },

    { t: "callout", kind: "warn", title: "The reference's pipeline call no longer runs",
      body: [{ t: "p", text: "`pipeline(\"summarization\", model=\"t5-small\")` raises `KeyError: Unknown task summarization` on **transformers 5.17**. The `summarization`, `translation` and `question-answering` tasks were removed from the pipeline registry in the 5.x line. The models are unchanged — call `AutoModelForSeq2SeqLM` and `.generate()` directly, which is what the pipeline wrapped. On transformers 4.x the reference's code runs as written." }] },

    { t: "code", lang: "python", title: "scratchpad/nlp/n28.py — driving the model directly", code:
"import torch\nfrom transformers import AutoTokenizer, AutoModelForSeq2SeqLM\n\nname, prefix = \"t5-small\", \"summarize: \"        # BART needs no prefix\ntok = AutoTokenizer.from_pretrained(name)\nmod = AutoModelForSeq2SeqLM.from_pretrained(name).eval()\n\nids = tok(prefix + ARTICLE, return_tensors=\"pt\", truncation=True, max_length=512)\nwith torch.no_grad():\n    g = mod.generate(**ids, max_length=80, min_length=30,\n                     num_beams=4, do_sample=False)\nprint(tok.decode(g[0], skip_special_tokens=True))",
      caption: "`min_length` is not advisory — it masks the end-of-sequence token until the floor is reached, which can force a model to keep writing past the point it wanted to stop." },

    { t: "out", text:
"t5-small  (61M params, 23.1s)\n  in 860 chars -> out 357 chars (58% compression)\n  the transformer architecture was introduced in the 2017 paper Attention Is\n  All You Need by researchers at google. it replaced the recurrent layers that\n  had dominated sequence modelling with a mechanism called self-attention.\n\nfacebook/bart-large-cnn  (406M params, 115.2s)\n  in 860 chars -> out 341 chars (60% compression)\n  The transformer architecture was introduced in the 2017 paper Attention Is\n  All You Need by researchers at Google. It replaced the recurrent layers that\n  had dominated sequence modelling with a mechanism called self-attention." },

    { t: "h2", n: "05", text: "How abstractive is abstractive?", id: "copyrate" },

    { t: "p", text: "Both outputs read well. But neither contained a single word absent from the source, so I measured it properly on three inputs: copy rate, longest verbatim run, and the set of genuinely novel words after normalising case and edge punctuation on both sides." },

    { t: "code", lang: "python", title: "scratchpad/nlp/n26b.py — measuring the copy rate", code:
"def words(s):\n    \"\"\"Lowercase words; decimals kept whole, edge punctuation stripped.\"\"\"\n    raw = re.findall(r\"[A-Za-z0-9][A-Za-z0-9.'-]*\", s.lower())\n    return [w for w in (x.strip(\".'-\") for x in raw) if w]\n\nsrc_w, out_w = words(source), words(summary)\ncopied = sum(1 for w in out_w if w in set(src_w))\nnovel  = sorted({w for w in out_w if w not in set(src_w)})\n\n# longest run of output words appearing verbatim in the source\njoined, best = \" \".join(src_w), 0\nfor i in range(len(out_w)):\n    for j in range(i + 1, len(out_w) + 1):\n        if \" \".join(out_w[i:j]) in joined:\n            best = max(best, j - i)\n        else:\n            break",
      caption: "Normalising both sides matters: comparing raw tokens counts `2017.` as novel against `2017` and inflates the result. My first run did exactly that." },

    { t: "out", text:
"--- clean expository prose ---\nin 28 words -> out 27 words (4% shorter)\ncopy rate 27/27 = 100.0%   longest verbatim run 20 words\ngenuinely novel words: NONE\n\n--- a rambling transcript ---\nin 85 words -> out 57 words (33% shorter)\ncopy rate 57/57 = 100.0%   longest verbatim run 57 words\ngenuinely novel words: NONE\n\n--- a list of facts ---\nin 39 words -> out 32 words (18% shorter)\ncopy rate 27/32 = 84.4%   longest verbatim run 15 words\ngenuinely novel words: ['5.1million', '6.8million', 'and', 'inq3', 'inq4']" },

    { t: "callout", kind: "insight", title: "The only novel words were broken ones",
      body: [{ t: "p", text: "On the transcript BART copied **57 of 57 words** — the entire output was one verbatim run, and it stopped mid-clause at *the person who used to*. That is truncation, not summarisation. On the facts list it did restructure, merging four sentences into two, and its five \"novel\" words were `and` plus four corrupted merges: `5.1million`, `6.8million`, `inq3`, `inq4`. The one place it genuinely composed, it also produced malformed tokens." }] },

    { t: "callout", kind: "note", title: "What this does and does not show",
      body: [{ t: "p", text: "These inputs are short and two of the three sit outside BART's training distribution — it was fine-tuned on news articles that are far longer. On long news copy it does compose more. The honest conclusion is narrower than \"abstractive models copy\": **copy rate is a property of the input as much as the architecture**, and it is cheap to measure, so measure it on your own documents rather than assuming the label on the model card describes your case." }] },

    { t: "h2", n: "06", text: "ROUGE", id: "rouge" },

    { t: "p", text: "Summarisation is scored with ROUGE, which is recall-oriented: of the n-grams in the reference summary, how many did the system produce? Recall is the right orientation because the failure mode being penalised is omission." },

    { t: "math", tex: "\\text{ROUGE-N} = \\frac{\\sum_{S \\in \\text{ref}} \\sum_{g \\in S} \\text{Count}_{\\text{match}}(g)}{\\sum_{S \\in \\text{ref}} \\sum_{g \\in S} \\text{Count}(g)}" },

    { t: "out", text:
"reference : the cat sat on the mat\nhypothesis: the cat was on the mat\n\nROUGE-1  overlap 5  recall 0.8333  precision 0.8333  F1 0.8333\nROUGE-2  overlap 3  recall 0.6000  precision 0.6000  F1 0.6000\nROUGE-L  LCS 5     recall 0.8333  precision 0.8333  F1 0.8333" },

    { t: "table",
      head: ["Variant", "Counts", "Catches"],
      rows: [
        ["ROUGE-1", "Unigram overlap", "Content coverage. Ignores word order entirely."],
        ["ROUGE-2", "Bigram overlap", "Local fluency and phrasing. Drops sharply on reordering."],
        ["ROUGE-L", "Longest common subsequence", "In-order overlap without requiring adjacency."],
        ["ROUGE-Lsum", "LCS per sentence, then summed", "The variant reported in most summarisation papers."]
      ] },

    { t: "callout", kind: "trap", title: "ROUGE rewards exactly the copying you just measured",
      body: [{ t: "p", text: "ROUGE counts n-gram overlap with a reference that was itself written from the source. A system that copies source sentences verbatim scores well by construction, and a system that correctly paraphrases scores worse for using different words. That is a direct incentive toward extraction — and it is part of why fine-tuned abstractive models copy as much as they do. ROUGE cannot detect a hallucinated fact either: an invented sentence made of common words can score respectably." }] },

    { t: "h2", n: "07", text: "Choosing", id: "choosing" },

    { t: "table",
      head: ["Aspect", "Extractive", "Abstractive"],
      rows: [
        ["Method", "Select sentences", "Generate new text"],
        ["Fluency", "Lower — choppy between picks", "Higher — reads naturally"],
        ["Faithfulness", "High, by construction", "Risk of hallucination"],
        ["Speed", "Milliseconds, CPU", "Seconds, GPU preferred"],
        ["Training data", "None required", "Required, and large"],
        ["Examples", "TextRank, LexRank, LSA", "T5, BART, PEGASUS"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Faithfulness against fluency",
      body: [{ t: "p", text: "In a regulated setting — medical, legal, financial — extraction is often the correct answer not because it reads better but because a summary that cannot invent a fact needs no factuality review. Every sentence traces to a source offset you can cite. The moment you generate, you inherit a verification problem: you need either a human in the loop or an entailment check of each summary sentence against the source. Pick the architecture that matches the review budget you actually have." }] },

    { t: "exercise", title: "Measure your own copy rate",
      tasks: [
        "Run the TF-IDF scorer on a document of your own and check whether the top-scoring sentence is the one you would have picked. Note what it ranked above it.",
        "Normalise the sentence scores by token count and see which sentences change rank. Decide which normalisation you would ship.",
        "Run `bart-large-cnn` over ten documents from your domain and compute the copy rate and longest verbatim run for each.",
        "Plot copy rate against input length. If it falls as documents get longer, you have found where the model starts genuinely composing.",
        "Take one abstractive summary and check every factual claim against the source. Record how long the check took — that is your per-document review cost."
      ] }
  ],

  takeaways: [
    "Summed TF-IDF ranked an irrelevant sentence (1.7321) above a relevant one (1.6014); term rarity is a weak proxy for importance, and summing also favours long sentences.",
    "TextRank replaces rarity with graph centrality — how similar a sentence is to the rest of the document — and still needs no training.",
    "`pipeline(\"summarization\")` was removed in transformers 5.x; call `AutoModelForSeq2SeqLM.generate()` directly.",
    "BART-large-cnn hit a 100% copy rate on two of three inputs, with a 57-word verbatim run on one; its only novel tokens elsewhere were malformed merges like `inq3`.",
    "Copy rate depends on the input as much as the architecture, and it takes ten lines to measure — so measure it on your documents.",
    "ROUGE is recall-oriented n-gram overlap; it rewards copying, penalises correct paraphrase, and cannot see a hallucinated fact.",
    "Extraction is faithful by construction, which in a regulated domain is often worth more than fluency."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did the TF-IDF scorer rank the weather sentence above the attention sentence?",
      options: ["A bug in the vectoriser", "Because TF-IDF rewards rare terms, and 'weather' and 'unremarkable' were rare in that document", "Because it was shorter", "Because stopwords were not removed"],
      answer: 1,
      why: "It scored 1.7321 against 1.6014. The objective measures term rarity, and the one deletable sentence in the document happened to contain the rarest words. Nothing in summed TF-IDF asks which sentence carries the argument — rarity is being used as a proxy for importance, and the two come apart routinely." },
    { stem: "What did measuring BART's output on a rambling transcript reveal?",
      options: ["It paraphrased heavily", "It copied 57 of 57 words as a single verbatim run and stopped mid-clause", "It hallucinated new facts", "It failed to produce output"],
      answer: 1,
      why: "Copy rate was 100%, the longest verbatim run was the whole 57-word output, and it ended at 'the person who used to'. That is truncation rather than summarisation — the input was outside the news distribution BART was fine-tuned on, and the model fell back on copying." },
    { stem: "Why is ROUGE recall-oriented rather than precision-oriented?",
      options: ["Recall is easier to compute", "Because the failure mode worth penalising in a summary is omitting important content", "To match BLEU", "Because precision is undefined for summaries"],
      answer: 1,
      why: "A summary that drops the main finding has failed, so the metric asks what fraction of the reference's n-grams were produced. Precision alone would reward a one-word summary. Most reported ROUGE numbers are F1, combining both, but the recall orientation is what the name records." },
    { stem: "Which property makes extraction attractive in a regulated domain?",
      options: ["Higher ROUGE scores", "Every output sentence traces to a source offset, so no factuality review is needed", "Faster inference", "Better fluency"],
      answer: 1,
      why: "Faithfulness comes from construction, not from the model behaving well — an extractive summary cannot assert anything the source did not. That removes the verification step entirely, which usually dominates the true cost of deploying a generative summariser." }
  ] },

  interview: { title: "Interview", sub: "Summarisation", questions: [
    { level: "Core", q: "What is the difference between extractive and abstractive summarisation?",
      strong: "Extraction selects source sentences and is faithful by construction; abstraction generates and can hallucinate.",
      answer: [{ t: "p", text: "Extraction scores the sentences already present and emits the top few, so every output word came from the input and the summary cannot assert anything the source did not. Abstraction runs an encoder-decoder and generates token by token, so it can compress across sentences and read fluently, but it can also state things the document never said. The practical difference is the review cost: an extractive summary needs no factuality check because each sentence carries a source offset, while a generated one needs either a human or an entailment model verifying each claim. One thing worth knowing is that the line blurs in practice — I measured `bart-large-cnn` and got a 100% copy rate on two of three inputs, with a 20-word verbatim run on clean prose. The architecture is abstractive; the behaviour on short or out-of-distribution input often is not." }] },
    { level: "Core", q: "How would you evaluate a summarisation system?",
      strong: "ROUGE for regression testing, plus a faithfulness check, because ROUGE cannot see hallucination.",
      answer: [{ t: "p", text: "ROUGE-1, ROUGE-2 and ROUGE-Lsum against reference summaries, as the automatic number — it is cheap and comparable to published work, so it is what I would gate a pull request on. But I would not ship on ROUGE alone, for two reasons I can demonstrate. It rewards copying, because the references were written from the source, so a verbatim extractor scores well and a correct paraphrase scores worse for choosing different words. And it is blind to hallucination: an invented sentence built from common words scores respectably. So I would pair it with a faithfulness measure — run an NLI model over each summary sentence against the source and report the entailment rate — and a periodic human evaluation on a sample, rating coverage and correctness. The automatic metrics catch regressions; only the faithfulness check catches the failure that actually matters." }] },
    { level: "Senior", q: "You need to summarise clinical notes for physicians. How do you approach it?",
      strong: "Extractive first, because faithfulness is a hard requirement and extraction gives it by construction.",
      answer: [{ t: "p", text: "I would start extractive and make the case for staying there. In a clinical setting a hallucinated negation — a summary saying a patient has no history of a condition they do have — is a patient-safety event, not a quality metric moving. Extraction makes that class of error impossible by construction, and every sentence can link back to its offset in the note so the physician verifies in one click. That traceability is itself a feature clinicians ask for. If fluency turns out to be a genuine blocker I would move to a constrained generative setup rather than an unconstrained one: fine-tune on in-domain note-summary pairs, run an NLI entailment check of every generated sentence against the source note, and drop or flag any sentence that fails. I would also hold out a set of notes containing negations and measure specifically whether negation survives the summary, because that is the failure that hurts and it is invisible in ROUGE. And I would build the review interface to assume the summary is wrong — the physician should be verifying, not reading." }] }
  ] }
});
