/* ============================================================================
   LESSON 2.2 — Sentiment Analysis
   Mirrors 01_NLP_Notes.md · §10. VADER is run on the reference's examples and
   on the cases that break every lexicon method (scratchpad/nlp/n22.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**\"Oh great, another meeting\" scores +0.625.** A lexicon-based sentiment model reads the words and gets the sentence exactly backwards, because sarcasm lives in the gap between what is said and what is meant — and there is no word in that sentence carrying the negative. This lesson runs VADER on the reference's examples, shows the three things it handles that a bag of words cannot, and then measures the four constructions that defeat it.",

  objectives: [
    "Compare lexicon, classical and transformer approaches to sentiment",
    "Explain what VADER handles beyond word presence",
    "Identify the constructions that defeat lexicon methods",
    "Describe aspect-based sentiment and why it is more useful",
    "Choose an approach from the text type and the budget"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "The approaches", id: "approaches" },

    { t: "table", head: ["Approach", "Training data", "Strength", "Weakness"],
      rows: [
        ["**VADER** (lexicon + rules)", "None", "Instant, tuned for social media, handles emoji and emphasis", "No understanding beyond the rules"],
        ["**TextBlob**", "None", "Simplest API, also reports subjectivity", "Weaker than VADER on informal text"],
        ["**Classical** (TF-IDF + linear)", "Labelled", "Fast, interpretable, domain-adaptable", "No word order or negation"],
        ["**Transformer**", "Labelled, or pretrained", "Best accuracy, handles context", "Slower, needs a GPU to fine-tune"]
      ] },

    { t: "out", text: `  This product is absolutely amazing!      compound +0.624
  Terrible experience. Would not recommend compound -0.638
  The food was okay, nothing special.      compound -0.092` },

    { t: "p", text: "VADER's `compound` score runs from −1 to +1. Note the third example: *okay, nothing special* lands at −0.092, very slightly negative, which is a reasonable reading of faint praise and something a naive positive-word counter would get wrong." },

    { t: "h2", n: "02", text: "What VADER adds", id: "vader" },

    { t: "out", text: `  'good'       +0.440   vs  'GOOD'       +0.440
  'good'       +0.440   vs  'good!!!'    +0.583
  'good'       +0.440   vs  'not good'   -0.341
  'good'       +0.440   vs  'very good'  +0.493
  'bad'        -0.542   vs  'not bad'    +0.431` },

    { t: "callout", kind: "insight", title: "Negation flips the sign, and a booster shifts the magnitude",
      body: [{ t: "p", text: "`not good` goes from +0.440 to **−0.341** — VADER looks back a few tokens for a negator and inverts. `not bad` goes from −0.542 to **+0.431**, correctly handling litotes. `very` raises the magnitude, and `!!!` raises it further. This is exactly what lesson 1.1 showed a bag of words cannot do: to TF-IDF, `not good` is the multiset `{not, good}` and the negation is a separate, unconnected feature. VADER's rules are hand-written and shallow, and they still capture something a purely count-based model structurally cannot." }] },

    { t: "callout", kind: "note", title: "The capitalisation boost did not fire here",
      body: [{ t: "p", text: "The reference lists capitalisation among what VADER handles, and it does — but `GOOD` alone scored **exactly the same as `good`**, +0.440. VADER's rule boosts a capitalised word only when the surrounding text is *not* all caps, so a single word in isolation gets no lift. The feature is real; it needs mixed case around it to trigger. Worth knowing before you build a test around it and conclude the library is broken." }] },

    { t: "h2", n: "03", text: "Where every lexicon fails", id: "failures" },

    { t: "out", text: `  +0.625   Oh great, another meeting.
  +0.431   The movie was not bad at all.
  -0.026   This is better than their last album, which was awful.
  +0.637   I wanted to love it.
  +0.202   Unbelievable quality.` },

    { t: "callout", kind: "crit", title: "Four different ways to be wrong",
      body: [{ t: "p", text: "**Sarcasm**: *Oh great, another meeting* scores +0.625 — the only sentiment-bearing word is `great` and it means the opposite. **Comparatives**: *better than their last album, which was awful* is positive about this album, but `awful` drags it to −0.026. **Implicature**: *I wanted to love it* is a polite negative review and scores +0.637, because `love` is there and the past-tense framing that carries the disappointment is not lexical. **Ambiguity**: *unbelievable quality* can be praise or complaint and the words cannot decide. All four require reasoning about the sentence, not the words in it, which is precisely what a transformer's contextual representation provides and a lexicon by construction cannot." }] },

    { t: "h2", n: "04", text: "Aspect-based sentiment", id: "absa" },

    { t: "p", text: "*\"The food was excellent but the service was terrible\"* has no single sentiment. Document-level analysis averages it to roughly neutral, which is the least useful possible summary — it says nothing about either aspect and does not indicate that there is anything to say." },

    { t: "diagram", kind: "flow", title: "Aspect-based sentiment",
      caption: "One document, several aspects, one sentiment each. The output is actionable in a way a single score never is.",
      cols: 3,
      nodes: [
        { id: "d", label: "The food was excellent but the service was terrible", sub: "one review", tone: "accent" },
        { id: "f", label: "food", sub: "positive", tone: "good" },
        { id: "s", label: "service", sub: "negative", tone: "crit" },
        { id: "p", label: "price", sub: "not mentioned", tone: "warn" }
      ],
      edges: [["d", "f"], ["d", "s"], ["d", "p"]] },

    { t: "callout", kind: "good", title: "This is the version businesses actually want",
      body: [{ t: "p", text: "A restaurant chain does not need to know that 62 % of reviews are positive. It needs to know that food scores well everywhere and service scores badly at three specific locations, because that is a thing someone can act on. The same applies to product reviews — battery against screen against price — and hotel reviews — room against location against staff. **Aspect-based sentiment turns a number into a decision.** The simplest implementation is to split into clauses, find aspect mentions, and run sentence-level sentiment on the clause containing each; a fine-tuned ABSA model does better on clauses where the aspect and its sentiment are far apart." }] },

    { t: "code", lang: "python", title: "The simple version",
      code: `def simple_absa(text, aspects, sentiment_model):
    """Check sentiment in the clause around each aspect mention."""
    results = {}
    for sent in text.split("."):
        for aspect in aspects:
            if aspect.lower() in sent.lower():
                results[aspect] = sentiment_model(sent)[0]["label"]
    return results`,
      caption: "Splitting on `.` is crude — it will not separate the two halves of *the food was excellent but the service was terrible*, which is one sentence with two opposite sentiments. Clause splitting on conjunctions, or the dependency parse from lesson 1.8, does better." },

    { t: "h2", n: "05", text: "Choosing", id: "choosing" },

    { t: "dl", items: [
      ["VADER", "Social media, short informal text, no labelled data, and you need an answer now. Handles emoji, slang and emphasis out of the box."],
      ["Classical, fine-tuned", "You have a few thousand labelled examples in your own domain. Domain vocabulary matters more than general accuracy — *sick* is positive in one register and negative in another."],
      ["Pretrained transformer", "Best general accuracy with no training, and handles negation and context properly. `cardiffnlp/twitter-roberta-base-sentiment-latest` for social text."],
      ["ABSA model", "When the output needs to be per-aspect, which for any review-driven product it does."]
    ] },

    { t: "callout", kind: "trap", title: "Sentiment models are domain-sensitive in a way people underestimate",
      body: [{ t: "p", text: "A model trained on movie reviews applied to financial news will read *volatile*, *aggressive* and *exposure* as negative when they are neutral domain terms, and will miss that *beat expectations* is strongly positive. Sentiment lexicons are even worse, because the polarity is fixed at build time. If your domain has its own register — finance, medicine, gaming, any subculture — assume a general model is wrong until you have measured it on your own labelled sample, and budget for a few hundred hand-labelled examples to check." }] },

    { t: "exercise", kind: "practice", title: "Find where sentiment breaks", difficulty: "core", minutes: 35,
      prompt: "Run VADER, a classical TF-IDF classifier and a pretrained transformer on the same labelled sentiment set, and compare. Then hand-build a set of twenty adversarial examples — sarcasm, negation, litotes, comparatives, mixed aspects — and measure each approach on those specifically. Finally, implement simple aspect-based sentiment by splitting on conjunctions as well as full stops, and check it on reviews containing 'but'.",
      hints: [
        "The adversarial set is where the approaches separate; on ordinary text they are closer than you expect.",
        "`but` is the single highest-value split point in review text.",
        "Label your own adversarial examples first, before running anything, so you are not grading on a curve."
      ],
      solution: {
        notes: [
          { t: "p", text: "On ordinary review text the three approaches are often within a few points, which is the surprise — VADER with no training at all is a serious baseline for informal text. The adversarial set is where they separate sharply: the transformer handles negation and comparatives that VADER gets backwards, and sarcasm defeats everything, which is worth confirming rather than assuming a big enough model fixes it." },
          { t: "p", text: "Splitting on `but` is the cheapest large improvement in aspect-based sentiment, because English uses it to mark a contrast and the two sides very often carry opposite sentiment about different aspects. Splitting only on full stops leaves 'the food was excellent but the service was terrible' as one unit, which averages to nothing useful." },
          { t: "p", text: "Writing your own adversarial examples and labelling them before running anything is worth the discipline. It is easy to look at a model's output on a tricky sentence and rationalise the score it gave, and pre-committing to the label removes that. It is also how you discover that some of your examples are genuinely ambiguous, which is itself informative about what the task can achieve." }
        ]
      } }

  ],

  takeaways: [
    "VADER's compound score runs −1 to +1 and needs no training data.",
    "Negation is handled: `good` +0.440 becomes `not good` −0.341, and `bad` −0.542 becomes `not bad` +0.431.",
    "Emphasis shifts magnitude: `good!!!` scores +0.583 against `good` at +0.440.",
    "The capitalisation boost needs mixed case around it — `GOOD` alone scored identically to `good`.",
    "Sarcasm defeats it entirely: *Oh great, another meeting* scores +0.625.",
    "Comparatives, implicature and ambiguity fail too — all require reasoning about the sentence, not the words.",
    "Aspect-based sentiment gives one sentiment per aspect, which is the version that supports a decision.",
    "Sentiment is strongly domain-dependent — a film-review model misreads financial language."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "VADER scores 'Oh great, another meeting' at +0.625. Why?",
      options: ["A bug in the lexicon", "Sarcasm is not lexical — the only sentiment word is `great` and it means the opposite", "The sentence is too short", "Punctuation confused it"],
      answer: 1,
      why: "Every word-level method reads the words. Sarcasm places the meaning in the gap between what is said and what is meant, and no word in the sentence carries the negative. It requires reasoning about the whole utterance, which a lexicon plus rules cannot do by construction." },
    { stem: "What does VADER do that a TF-IDF bag of words cannot?",
      options: ["Use a larger vocabulary", "Apply negation, boosters and punctuation emphasis — `not good` scores −0.341", "Run faster", "Handle multiple languages"],
      answer: 1,
      why: "To a bag of words, `not good` is the multiset `{not, good}` and the negation is an unconnected feature. VADER looks back for a negator and inverts the polarity, taking `good` from +0.440 to −0.341 and `bad` from −0.542 to +0.431 in `not bad`." },
    { stem: "Why is aspect-based sentiment more useful than document-level?",
      options: ["It is more accurate", "A review with opposite sentiments about different aspects averages to a meaningless neutral", "It needs less data", "It runs faster"],
      answer: 1,
      why: "*The food was excellent but the service was terrible* has no single sentiment; a document-level score returns roughly neutral, which conveys nothing and hides that there is anything to act on. Per-aspect output tells an operator which specific thing to fix, which is what turns a number into a decision." },
    { stem: "You apply a film-review sentiment model to financial news. What should you expect?",
      options: ["Similar accuracy", "Systematic errors — domain terms like `volatile` and `exposure` read as negative when they are neutral", "Better accuracy, since news is cleaner", "It will refuse to run"],
      answer: 1,
      why: "Polarity is register-dependent. Finance uses `volatile`, `aggressive` and `exposure` as neutral technical terms, and `beat expectations` is strongly positive in a way no general lexicon knows. Assume a general model is wrong on a specialised domain until measured on a few hundred hand-labelled examples from it." }
  ] },

  interview: { title: "Interview", sub: "Sentiment", questions: [
    { level: "Core", q: "How would you build a sentiment classifier?",
      strong: "Start with VADER or a pretrained transformer, then fine-tune on domain data if the register differs.",
      answer: [{ t: "p", text: "It depends on whether I have labels and what the text looks like. With no labels and informal text, VADER is a genuinely strong start — it handles negation, boosters and punctuation emphasis out of the box, taking `good` at +0.44 to `not good` at −0.34, and it costs nothing. With no labels and ordinary prose, a pretrained transformer sentiment model is more accurate and handles context properly. With a few thousand domain labels I would fine-tune, because sentiment is strongly register-dependent — a film-review model reads `volatile` and `exposure` as negative in financial text where they are neutral. Whichever I chose, I would build a small adversarial set by hand covering negation, sarcasm, comparatives and mixed aspects, because on ordinary text these approaches are closer than you expect and it is the hard cases that separate them. And for any review-driven product I would push for aspect-based output rather than a document score, since 'sixty-two per cent positive' is not something anyone can act on." }] },
    { level: "Senior", q: "A client wants sentiment on their product reviews. What do you actually deliver?",
      strong: "Aspect-based output, not a single score, plus an honest statement of what the model cannot read.",
      answer: [{ t: "p", text: "A document-level percentage is almost useless to them, so I would push for aspect-based output. 'Sixty-two per cent positive' supports no decision; 'food scores well everywhere, service scores badly at three sites' does. The implementation can start crude — split on full stops *and* on `but`, since English uses it to mark contrast and the two halves very often carry opposite sentiment about different aspects, then run sentence-level sentiment on the clause containing each aspect mention. I would also deliver an explicit list of what the model will get wrong, with examples from their own data: sarcasm, which I have measured scoring +0.625 on a plainly negative sentence, comparatives against a previous product, and polite negatives like 'I wanted to love it'. Setting that expectation before launch is the difference between a useful tool and one that loses trust the first time someone spot-checks it. And I would insist on a few hundred hand-labelled reviews from their domain, because sentiment is register-dependent and a general model's accuracy on their text is unknown until measured." }] },
    { level: "Senior", q: "What are the hard cases in sentiment analysis?",
      strong: "Sarcasm, negation scope, comparatives, implicature and mixed aspects — all require sentence-level reasoning.",
      answer: [{ t: "p", text: "Five, and they fail differently. Sarcasm is the hardest because the sentiment is the opposite of every word present — I measured 'Oh great, another meeting' at +0.625. Negation scope is subtler than a flip: 'I do not think this is good' negates across a clause boundary, and rule-based negators with a fixed lookback window miss it. Comparatives confuse the target: 'better than their last album, which was awful' is positive about this album and lexicons drag it negative on `awful`. Implicature carries meaning with no sentiment word at all — 'I wanted to love it' is a negative review and scored +0.637. And mixed aspects mean there is no single answer to give, which is an argument for aspect-based output rather than a modelling problem. Transformers handle negation, comparatives and much of the implicature because they have contextual representations. Sarcasm remains genuinely hard for everything, since it often depends on knowledge outside the text." }] }
  ] }
});
