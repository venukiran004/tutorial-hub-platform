/* ============================================================================
   LESSON 3.8 — Natural Language Inference and Text Augmentation
   Mirrors 01_NLP_Notes.md · §25-26. roberta-large-mnli is run as a task, as
   a faithfulness checker, and as a validator for augmented data — where it
   caught two of three corrupted sentences (scratchpad/nlp/n38.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.8",

  lede: "**Naive synonym replacement turned `The service at this restaurant was excellent` into `The Robert William Service at this restaurant was fantabulous`.** WordNet lists the Canadian poet as a synonym of *service*, and nothing in the method knows the difference. It did the same to *product*, promoting it to *Cartesian product*. Two of three augmented sentences were corrupted — and an NLI model flagged both, scoring them NEUTRAL against their originals at 0.995 and 0.997. This lesson covers entailment as a task, as a hallucination detector, and as the validator that makes augmentation safe.",

  objectives: [
    "Define entailment, contradiction and neutral, and run an NLI model",
    "Use NLI to check a summary's faithfulness against its source",
    "Explain why zero-shot classification is NLI in disguise",
    "Apply the standard augmentation methods and predict which break which labels",
    "Validate augmented data automatically instead of trusting it"
  ],

  prerequisites: ["3.7", "3.4"],

  blocks: [

    { t: "h2", n: "01", text: "The task", id: "task" },

    { t: "p", text: "Natural language inference takes a premise and a hypothesis and classifies their relationship into three classes. The three-way distinction is the whole point — two of them are not simply \"true\" and \"false\"." },

    { t: "dl", items: [
      ["Entailment", "The hypothesis must be true given the premise. Not merely consistent with it — forced by it."],
      ["Contradiction", "The hypothesis cannot be true given the premise. Actively incompatible."],
      ["Neutral", "The hypothesis may or may not be true. Consistent with the premise but not supported by it — this is the class that matters most in practice."],
      ["Datasets", "SNLI (570k pairs, image captions) and MultiNLI (433k, multiple genres). MNLI's genre diversity is why MNLI-trained models transfer better."]
    ] },

    { t: "code", lang: "python", title: "scratchpad/nlp/n38.py — running NLI", code:
"import torch\nfrom transformers import AutoTokenizer, AutoModelForSequenceClassification\n\nname = \"roberta-large-mnli\"\ntok = AutoTokenizer.from_pretrained(name)\nmod = AutoModelForSequenceClassification.from_pretrained(name).eval()\n\ndef nli(premise, hypothesis):\n    enc = tok(premise, hypothesis, return_tensors=\"pt\", truncation=True)\n    with torch.no_grad():\n        probs = torch.softmax(mod(**enc).logits, -1)[0]\n    return {mod.config.id2label[i]: probs[i].item()\n            for i in range(len(probs))}",
      caption: "The premise and hypothesis go in as a sentence *pair* — this is where `token_type_ids` earns its keep, marking which segment is which." },

    { t: "out", text:
"premise: \"A man is playing a guitar on stage.\"\n\n  A man is performing music.             ENTAILMENT      0.990\n  A man is sleeping at home.             CONTRADICTION   0.999\n  The man is a professional musician.    NEUTRAL         0.997\n\npremise: \"The company reported record profits.\"\n  The company lost money.                CONTRADICTION   0.999\n\npremise: \"Two dogs are running in a field.\"\n  Animals are outdoors.                  ENTAILMENT      0.978" },

    { t: "callout", kind: "insight", title: "Neutral is the useful class",
      body: [{ t: "p", text: "*The man is a professional musician* is perfectly plausible given someone playing guitar on stage — and it does not follow. The model scored it NEUTRAL at **0.997**, cleanly separated from the entailment at 0.990 and the contradiction at 0.999. That distinction between *not contradicted* and *supported* is exactly what a binary true/false classifier cannot express, and it is the reason NLI is useful as a tool. Most hallucinations are not contradictions; they are plausible additions nothing in the source supports." }] },

    { t: "h2", n: "02", text: "NLI as a faithfulness checker", id: "faithfulness" },

    { t: "p", text: "Lessons 2.6 and 3.4 both ended at the same wall: ROUGE and BERTScore cannot see a hallucinated fact. NLI can. Treat the source document as the premise and each generated sentence as a hypothesis." },

    { t: "out", text:
"source: \"The company reported revenue of 4.2 million dollars in the first\n         quarter, up from 3.1 million in the same quarter last year. The\n         chief executive said the growth came from enterprise customers.\"\n\ncandidate summary sentence                    expected       NLI verdict\nRevenue rose to 4.2 million dollars in Q1.    faithful       ENTAILMENT      0.993\nRevenue grew year over year.                  faithful       ENTAILMENT      0.990\nGrowth was driven by enterprise customers.    faithful       ENTAILMENT      0.977\nRevenue fell to 4.2 million dollars.          contradicted   CONTRADICTION   0.989\nThe company expects 6 million next quarter.   unsupported    NEUTRAL         0.997" },

    { t: "callout", kind: "insight", title: "Five for five, and the two failure types separate",
      body: [{ t: "p", text: "The three faithful sentences came back ENTAILMENT at 0.977 and above. The contradicted sentence — revenue *fell* rather than rose — came back CONTRADICTION at 0.989. And the fabricated forward-looking claim came back NEUTRAL at 0.997, which is the right answer: the source neither supports nor denies a forecast. That three-way split is operationally useful. **Contradiction is an urgent bug**; **neutral is a hallucination**; only entailment is safe to ship unreviewed. A ROUGE score cannot distinguish any of these, which is precisely the gap lesson 3.4 left open." }] },

    { t: "p", text: "The production shape of this is a pipeline stage: split the generated text into sentences, run each against the source, and route anything not entailed to a human or drop it. It costs one forward pass per sentence, which is cheap next to the generation itself." },

    { t: "h2", n: "03", text: "Zero-shot classification is NLI", id: "zeroshot" },

    { t: "out", text:
"text: \"I want to book a flight to Paris\"\n\nhypothesis                            entailment\n\"This example is about travel.\"       0.9438\n\"This example is about sports.\"       0.0205\n\"This example is about cooking.\"      0.0033" },

    { t: "p", text: "This is the zero-shot pipeline from lesson 3.3, written out. There is no separate zero-shot model — `facebook/bart-large-mnli` is an NLI model, and the pipeline loops over candidate labels, builds a hypothesis from a template, and normalises the entailment probabilities. Knowing that tells you how to improve it: the hypothesis template is a prompt you can tune. *This example is about travel* works less well for some label sets than *This text describes a travel-related request*, and trying a few templates is the cheapest accuracy gain available." },

    { t: "h2", n: "04", text: "Text augmentation", id: "augmentation" },

    { t: "p", text: "Augmentation generates additional training examples from existing ones. The premise is that a transformation preserving the label produces a valid new example — and the whole difficulty is in whether it actually does." },

    { t: "table",
      head: ["Method", "What it does", "Risk"],
      rows: [
        ["Synonym replacement", "Swap words for WordNet synonyms", "High. Senses and proper nouns leak in, as below."],
        ["Random insertion", "Insert a synonym of a random word at a random position", "Moderate. Produces ungrammatical text the model then learns from."],
        ["Random swap", "Exchange two words' positions", "High for anything order-sensitive; destroys NER offsets outright."],
        ["Random deletion", "Drop words with probability p", "Catastrophic if you delete the word carrying the label."],
        ["Back-translation", "Translate out and back to paraphrase", "Low, and the highest quality — but see lesson 2.7 on idioms."],
        ["Contextual insertion", "Use a masked LM to fill new positions", "Low. Fluent and in-distribution, at the cost of a forward pass."]
      ] },

    { t: "p", text: "The first four are EDA — Easy Data Augmentation — and they are easy in exactly the way that hides the problem. Here is what synonym replacement actually produced:" },

    { t: "out", text:
"original   The movie was absolutely terrible and I hated every minute\naugmented  The movie was dead abominable and I hated every minute\n\noriginal   The service at this restaurant was excellent\naugmented  The Robert William Service at this restaurant was fantabulous\n\noriginal   I would not recommend this product to anyone\naugmented  I would not advocate this Cartesian product to anyone" },

    { t: "callout", kind: "crit", title: "WordNet does not know which sense you meant",
      body: [{ t: "p", text: "*service* became **Robert William Service**, the Canadian poet, because WordNet contains a proper-noun synset for that name. *product* became **Cartesian product**, the mathematical sense. This is the same polysemy that lessons 1.6 and 3.6 measured, arriving as a data-corruption bug: WordNet lists 18 senses for *bank* and a synonym-replacement routine picks among all of them with no idea which is in play. Feed these into training with the original labels and you are teaching the model that sentences about a dead poet carry restaurant sentiment." }] },

    { t: "h2", n: "05", text: "Validating augmentation with NLI", id: "validating" },

    { t: "p", text: "The fix is not a better synonym heuristic. It is to stop trusting the transformation and check it — the original entails the augmentation, or the augmentation is discarded." },

    { t: "out", text:
"augmented sentence                              NLI vs original\nThe movie was dead abominable and I hated...    ENTAILMENT   0.972    keep\nThe Robert William Service at this restaur...   NEUTRAL      0.995    discard\nI would not advocate this Cartesian product...  NEUTRAL      0.997    discard" },

    { t: "callout", kind: "insight", title: "The filter caught both corruptions and kept the good one",
      body: [{ t: "p", text: "Two of three augmentations were corrupt, and NLI identified exactly those two, at 0.995 and 0.997 confidence. The surviving one — *dead abominable* for *absolutely terrible* — is stilted but genuinely meaning-preserving, and entailment scored it 0.972. So the augmentation pipeline becomes: generate liberally, then filter on entailment against the source, keeping only what survives. You get fewer examples than you generated and all of them are valid, which is strictly better than more examples of unknown quality. One forward pass per candidate is a negligible cost next to training on poisoned data." }] },

    { t: "diagram", kind: "flow", title: "Augment, then verify", cols: 3,
      nodes: [
        { id: "o", text: "Original labelled example", tone: "accent" },
        { id: "g", text: "Generate candidates liberally", tone: "violet" },
        { id: "n", text: "NLI: does the original entail it?", tone: "violet" },
        { id: "k", text: "Entailed: keep with the original label", tone: "good" },
        { id: "d", text: "Neutral or contradiction: discard", tone: "crit" },
        { id: "t", text: "Train on originals plus survivors", tone: "good" }
      ],
      edges: [["o","g"],["g","n"],["n","k"],["n","d"],["k","t"],["o","t"]] },

    { t: "h2", n: "06", text: "Which augmentation for which task", id: "which" },

    { t: "table",
      head: ["Task", "Safe", "Unsafe", "Why"],
      rows: [
        ["Topic classification", "Deletion, synonym, back-translation", "—", "Topic is carried redundantly across many words; losing one rarely changes it."],
        ["Sentiment", "Back-translation, contextual insertion", "Deletion, naive synonym", "The label often rests on one word. Delete *terrible* and the label is now wrong."],
        ["NER", "Entity substitution from a gazetteer", "Swap, deletion, synonym", "Span offsets are part of the label; any reordering invalidates every annotation."],
        ["NLI and paraphrase", "Back-translation on the premise", "Anything on the hypothesis", "The label *is* the relation between the two sentences; changing one changes it."],
        ["QA", "Paraphrasing the question", "Anything touching the context", "The answer is a span with character offsets into the context."]
      ] },

    { t: "callout", kind: "tradeoff", title: "Augmentation is a small-data technique",
      body: [{ t: "p", text: "The honest framing: EDA-style augmentation gives meaningful gains at a few hundred examples per class and approximately nothing at tens of thousands, where the model has already seen the variation you are synthesising. Before reaching for it, check whether you have a data *quantity* problem at all — if the failures are concentrated in one class or one input type, targeted collection beats augmentation decisively. And if you do augment, hold the validation and test sets **pristine**: augmenting them inflates your metrics and measures your transformation rather than your model." }] },

    { t: "exercise", title: "Build a verified augmentation pipeline",
      tasks: [
        "Run synonym replacement over 100 of your own sentences and count how many survive an entailment filter.",
        "Inspect twenty discarded ones and classify why each failed — wrong sense, proper noun, broken grammar.",
        "Compare back-translation against synonym replacement on survival rate and on downstream accuracy.",
        "Use NLI to check a summarisation model's output, and report the fraction of sentences that are entailed, neutral and contradicted.",
        "Train with 10x augmentation at 200, 2,000 and 20,000 examples per class. Plot the gain and find where it vanishes."
      ] }
  ],

  takeaways: [
    "NLI classifies a premise-hypothesis pair as entailment, contradiction or neutral; neutral is the class that makes it useful.",
    "As a faithfulness checker it got five of five: faithful sentences ENTAILMENT at 0.977+, a contradicted one CONTRADICTION 0.989, a fabricated forecast NEUTRAL 0.997.",
    "Contradiction is an urgent bug, neutral is a hallucination, entailment is safe — a distinction ROUGE and BERTScore cannot make at all.",
    "Zero-shot classification is an NLI model looped over label templates; the template is a tunable prompt.",
    "Naive synonym replacement produced 'Robert William Service' for 'service' and 'Cartesian product' for 'product' — WordNet polysemy as a data-corruption bug.",
    "NLI flagged both corrupted augmentations at 0.995 and 0.997 NEUTRAL and kept the valid one at 0.972 ENTAILMENT.",
    "Generate liberally, then filter on entailment: fewer valid examples beat more examples of unknown quality.",
    "Deletion destroys sentiment labels, swapping destroys NER offsets, and augmentation stops helping once you have tens of thousands of examples per class.",
    "Never augment the validation or test set."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why is 'neutral' the most useful NLI class in practice?",
      options: ["It is the most common", "Because most hallucinations are plausible additions the source does not support, rather than outright contradictions", "It is easiest to predict", "It indicates low confidence"],
      answer: 1,
      why: "A fabricated forecast — 'The company expects 6 million next quarter' — scored NEUTRAL at 0.997 against a source that says nothing about forecasts. It is not contradicted, and it is not supported. A binary true/false classifier collapses that into 'not false', which is exactly the wrong answer for a faithfulness check." },
    { stem: "How does NLI catch what ROUGE and BERTScore cannot?",
      options: ["It is more accurate", "It asks whether the source supports the claim, rather than measuring surface or embedding overlap", "It uses a larger model", "It does not — they are equivalent"],
      answer: 1,
      why: "Overlap metrics score similarity of form. A hallucinated sentence built from words present in the source scores well on both. NLI asks a different question — does the premise force the hypothesis — so it separated a contradicted sentence (0.989) from a fabricated one (0.997 neutral) from three faithful ones (0.977+)." },
    { stem: "Why did synonym replacement produce 'Robert William Service'?",
      options: ["A bug in NLTK", "WordNet contains a proper-noun synset for the poet, and the method has no way to know which sense of 'service' was meant", "The sentence was mistokenised", "The random seed was unlucky"],
      answer: 1,
      why: "It is the polysemy problem from lessons 1.6 and 3.6 arriving as data corruption. WordNet lists every sense of a word, including proper nouns, and a replacement routine samples among them blindly. 'product' became 'Cartesian product' the same way. Training on these with the original labels teaches the model falsehoods." },
    { stem: "What is the right way to use augmentation you cannot fully trust?",
      options: ["Use a smaller replacement probability", "Generate liberally, then filter with an entailment check against the original, discarding anything not entailed", "Augment the test set too, for consistency", "Only use back-translation"],
      answer: 1,
      why: "The filter caught both corrupted sentences at 0.995 and 0.997 NEUTRAL and kept the valid one at 0.972 ENTAILMENT. One forward pass per candidate is negligible against the cost of training on poisoned data, and fewer verified examples beat more of unknown quality. The test set is never augmented." }
  ] },

  interview: { title: "Interview", sub: "NLI and data augmentation", questions: [
    { level: "Core", q: "What is natural language inference and what would you use it for?",
      strong: "Three-way premise-hypothesis classification; in practice its main value is as a faithfulness checker and zero-shot classifier.",
      answer: [{ t: "p", text: "It classifies a premise-hypothesis pair as entailment, contradiction or neutral. As a benchmark it's a measure of language understanding, but what makes it valuable in production is that it's a reusable *tool*. The main use I'd reach for is hallucination detection: treat the source document as the premise and each generated sentence as the hypothesis, and anything not entailed gets flagged. I ran this on a summarisation case and it got five of five — three faithful sentences at 0.977 entailment and above, a sentence saying revenue fell when it rose as contradiction at 0.989, and a fabricated forward-looking claim as neutral at 0.997. That three-way split is operationally useful in a way a binary check isn't: contradiction is an urgent bug, neutral is a hallucination, and only entailment is safe unreviewed. It's also what closes the gap that ROUGE and BERTScore leave — both are blind to hallucination because they measure overlap of form. The second use is zero-shot classification, which is literally an NLI model looped over hypothesis templates. And the third is validating augmented training data." }] },
    { level: "Core", q: "When does text augmentation help, and when does it hurt?",
      strong: "Helps at a few hundred examples per class; hurts whenever the transformation silently changes the label.",
      answer: [{ t: "p", text: "It helps when you're genuinely data-limited — a few hundred examples per class — and the gains fade to essentially nothing by tens of thousands, where the model has already seen the variation you're synthesising. It hurts whenever the transformation changes the label without telling you, and that's more common than people assume. I ran naive WordNet synonym replacement on three sentences and two came back corrupted: 'service' became 'Robert William Service', the Canadian poet, and 'product' became 'Cartesian product'. WordNet lists every sense including proper nouns, and the method has no idea which one is in play. Train on those with the original sentiment labels and you're teaching falsehoods. The task matters too: random deletion is usually fine for topic classification, where the signal is spread across many words, and catastrophic for sentiment, where deleting one word like 'terrible' inverts the label. Word swapping destroys NER entirely because span offsets are part of the annotation. So my approach is: check whether it's actually a data-quantity problem first, because targeted collection beats augmentation when failures are concentrated; prefer back-translation or contextual insertion over EDA; and never, under any circumstances, augment the validation or test set." }] },
    { level: "Senior", q: "How would you build a hallucination detector for a summarisation system?",
      strong: "Sentence-level NLI against the source, with the three classes routed differently.",
      answer: [{ t: "p", text: "Split the generated summary into sentences and run each one as a hypothesis against the source document as premise, using an MNLI-trained model — MNLI rather than SNLI because the genre diversity transfers better to real documents. Then route by class rather than thresholding a single score, because the three classes mean different things operationally. Contradiction is the urgent case: the summary asserts something the source denies, and that's a bug worth alerting on. Neutral is the common hallucination — a plausible claim the source simply doesn't support, like a forward-looking statement in a report about past results — and those get flagged for review or dropped. Only entailment ships unreviewed. In my measurements that separation was clean: faithful sentences at 0.977 and above, a contradiction at 0.989, a fabricated forecast at 0.997 neutral. There are two practical complications. First, long sources exceed the model's context, so you need to retrieve the relevant passage per claim rather than passing the whole document — which makes this a retrieval problem too, and a retrieval miss looks exactly like a hallucination. Second, the entailment threshold is a product decision, same as the abstention threshold in QA: it trades false alarms against missed hallucinations, and the right point depends on whether a reviewer is in the loop. I'd also report the entailment rate as a headline metric alongside ROUGE, because it measures the thing ROUGE structurally cannot." }] }
  ] }
});
