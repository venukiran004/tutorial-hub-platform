/* ============================================================================
   LESSON 2.2 — Sentiment Analysis
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**\"Oh great, another meeting\" scores +0.625.** A lexicon-based sentiment model reads the words and gets the sentence exactly backwards, because sarcasm lives in the gap between what is said and what is meant — and there is no word in that sentence carrying the negative. This lesson runs VADER on the worked examples, shows the three things it handles that a bag of words cannot, and then measures the four constructions that defeat it.",

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

    {"kind": "trace", "title": "Faint praise lands slightly negative, which a word-counter would get wrong", "caption": "VADER's `compound` runs from −1 to +1, and **the third row is the one worth reading: *okay, nothing special* at −0.092 — very slightly negative, which is a reasonable reading of faint praise and something a naive positive-word counter gets wrong** (it would see *okay* and *special* and call it positive). The four approaches split on one axis: **VADER and TextBlob need no training data at all; the other two need labels or a pretrained model.**", "left": "input", "codeW": 230, "vars": ["compound", "a word-counter would say"], "steps": [{"code": "'This product is absolutely amazing!'", "state": ["+0.624", "positive - agrees"], "tone": "good"}, {"code": "'Terrible experience. Would not recommend'", "state": ["-0.638", "negative - agrees"], "changed": [0, 1], "tone": "good"}, {"code": "'The food was okay, nothing special.'", "state": ["-0.092", "POSITIVE - wrong"], "changed": [0, 1], "tone": "violet", "note": "faint praise"}], "t": "diagram", "id": "dg-2_2-01-0"},












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

    {"kind": "trace", "title": "Five rules, and the negation one changes the sign", "caption": "Capitalisation does **nothing** here — `good` and `GOOD` both score +0.440, which is worth knowing because VADER is often described as handling emphasis. What it does handle is measurable: **punctuation lifts +0.440 to +0.583, a booster lifts it to +0.493, and negation flips it to −0.341.** The last row is the strongest: **`bad` at −0.542 becomes `not bad` at +0.431** — a sign change, which is the thing a bag of words structurally cannot do.", "left": "input", "codeW": 150, "vars": ["compound", "what the rule did"], "steps": [{"code": "'good' -> 'GOOD'", "state": ["+0.440 -> +0.440", "nothing"], "tone": "warn"}, {"code": "'good' -> 'good!!!'", "state": ["+0.440 -> +0.583", "punctuation boost"], "changed": [0, 1], "tone": "good"}, {"code": "'good' -> 'very good'", "state": ["+0.440 -> +0.493", "a booster word"], "changed": [0, 1], "tone": "good"}, {"code": "'good' -> 'not good'", "state": ["+0.440 -> -0.341", "negation flips it"], "changed": [0, 1], "tone": "violet"}, {"code": "'bad' -> 'not bad'", "state": ["-0.542 -> +0.431", "a sign change"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-2_2-02-1"},












    { t: "out", text: `  'good'       +0.440   vs  'GOOD'       +0.440
  'good'       +0.440   vs  'good!!!'    +0.583
  'good'       +0.440   vs  'not good'   -0.341
  'good'       +0.440   vs  'very good'  +0.493
  'bad'        -0.542   vs  'not bad'    +0.431` },

    { t: "callout", kind: "insight", title: "Negation flips the sign, and a booster shifts the magnitude",
      body: [{ t: "p", text: "`not good` goes from +0.440 to **−0.341** — VADER looks back a few tokens for a negator and inverts. `not bad` goes from −0.542 to **+0.431**, correctly handling litotes. `very` raises the magnitude, and `!!!` raises it further. This is exactly what lesson 1.1 showed a bag of words cannot do: to TF-IDF, `not good` is the multiset `{not, good}` and the negation is a separate, unconnected feature. VADER's rules are hand-written and shallow, and they still capture something a purely count-based model structurally cannot." }] },

    { t: "callout", kind: "note", title: "The capitalisation boost did not fire here",
      body: [{ t: "p", text: "Capitalisation is usually listed among what VADER handles, and it does — but `GOOD` alone scored **exactly the same as `good`**, +0.440. VADER's rule boosts a capitalised word only when the surrounding text is *not* all caps, so a single word in isolation gets no lift. The feature is real; it needs mixed case around it to trigger. Worth knowing before you build a test around it and conclude the library is broken." }] },

    { t: "h2", n: "03", text: "Where every lexicon fails", id: "failures" },

    {"kind": "trace", "title": "Five sentences, five wrong answers, and each wrong for a different reason", "caption": "**Sarcasm needs world knowledge about meetings. Litotes needs *not bad* to be mild praise rather than negated praise. Comparison needs the model to know which clause is the subject. Unrealised intent needs *wanted to* to reverse *love*. And *unbelievable* is genuinely ambiguous out of context.** No rule list closes these, **because each requires something outside the sentence — which is the argument for a model with context, and the reason §05 ends where it does.**", "left": "input", "codeW": 230, "vars": ["VADER", "the right answer"], "steps": [{"code": "'Oh great, another meeting.'", "state": ["+0.625", "negative - sarcasm"], "tone": "crit"}, {"code": "'The movie was not bad at all.'", "state": ["+0.431", "mild praise, not strong"], "changed": [0, 1], "tone": "crit"}, {"code": "'...better than their last, which was awful'", "state": ["-0.026", "positive - comparison"], "changed": [0, 1], "tone": "crit"}, {"code": "'I wanted to love it.'", "state": ["+0.637", "negative - it did not happen"], "changed": [0, 1], "tone": "crit"}, {"code": "'Unbelievable quality.'", "state": ["+0.202", "unknowable without context"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-2_2-03-2"},












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

    {"kind": "flow", "title": "Domain register beats general accuracy, and the lexicon cannot be fixed", "caption": "**A model trained on movie reviews applied to financial news reads *volatile*, *aggressive* and *exposure* as negative when they are neutral domain terms, and misses that *beat expectations* is strongly positive.** Lexicons are worse still, **because the polarity is fixed at build time** — *sick* is positive in one register and negative in another, and no amount of context helps a static table. **So: assume a general model is wrong on your domain until measured, and budget a few hundred hand-labelled examples to check.**", "cols": 3, "nodes": [{"id": "v", "label": "VADER: social, short, no labels, now", "sub": "emoji, slang, emphasis", "tone": "good"}, {"id": "c", "label": "Classical fine-tune: your own domain", "sub": "a few thousand labels", "tone": "good"}, {"id": "t", "label": "Pretrained transformer: best general", "sub": "handles negation and context", "tone": "good"}, {"id": "a", "label": "ABSA when the output must be per-aspect", "sub": "which reviews always are", "tone": "accent"}, {"id": "d", "label": "But register beats accuracy", "sub": "'volatile' is neutral in finance", "tone": "crit"}, {"id": "m", "label": "So measure on your own sample first", "sub": "a few hundred labels", "tone": "violet"}], "edges": [["v", "d"], ["c", "d"], ["t", "d"], ["a", "d"], ["d", "m"]], "t": "diagram", "id": "dg-2_2-05-3"},












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
      requirements: [
        "Compare VADER, a TF-IDF classifier and a transformer on one labelled set",
        "Build twenty adversarial examples and score each approach on them",
        "Implement aspect-based sentiment by splitting on conjunctions",
        "Check it on reviews with mixed aspects"
      ],
      hints: [
        "The adversarial set is where the approaches separate; on ordinary text they are closer than you expect.",
        "`but` is the single highest-value split point in review text.",
        "Label your own adversarial examples first, before running anything, so you are not grading on a curve."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import re
import numpy as np
from datasets import load_dataset
from nltk.sentiment import SentimentIntensityAnalyzer      # needs nltk.download("vader_lexicon") once
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from transformers import pipeline, logging as hf_logging
hf_logging.set_verbosity_error(); hf_logging.disable_progress_bar()

sst = load_dataset("nyu-mll/glue", "sst2")
val_X, val_y = sst["validation"]["sentence"], np.array(sst["validation"]["label"])
vader = SentimentIntensityAnalyzer()
vec = TfidfVectorizer(ngram_range=(1, 2), min_df=2)
clf = LogisticRegression(max_iter=3000, C=4).fit(vec.fit_transform(sst["train"]["sentence"][:20000]), sst["train"]["label"][:20000])
bert = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

predict = {
    "VADER (no training)": lambda X: np.array([vader.polarity_scores(x)["compound"] >= 0 for x in X], dtype=int),
    "TF-IDF + logistic":   lambda X: clf.predict(vec.transform(X)),
    "DistilBERT SST-2":    lambda X: np.array([r["label"] == "POSITIVE" for r in bert(list(X), batch_size=32)], dtype=int),
}
print("caution: the DistilBERT checkpoint was fine-tuned on SST-2's training split, so on this validation set it is in-domain")
print(f"\\n{'approach':<22} SST-2 validation")
for name, f in predict.items(): print(f"{name:<22} {(f(val_X) == val_y).mean():.3f}")

ADV = [  # (text, label 1 = positive, kind)
 ("Oh great, another two hours of my life I will never get back.", 0, "sarcasm"),
 ("Wow, what a masterpiece of tedium.", 0, "sarcasm"),
 ("I just love waiting forty minutes for cold food.", 0, "sarcasm"),
 ("Brilliant, the screen cracked on day one.", 0, "sarcasm"),
 ("The film is not good.", 0, "negation"),
 ("I would not say it was bad at all.", 1, "negation"),
 ("Nothing about this hotel disappointed me.", 1, "negation"),
 ("It never fails to make me smile.", 1, "negation"),
 ("The service was not unpleasant.", 1, "litotes"),
 ("Not the worst meal I have had this year.", 1, "litotes"),
 ("The sequel is no small achievement.", 1, "litotes"),
 ("Hardly a disaster, honestly.", 1, "litotes"),
 ("The first film was far better than this one.", 0, "comparative"),
 ("This is better than anything else they have made.", 1, "comparative"),
 ("Less boring than I expected, which is not saying much.", 0, "comparative"),
 ("Their old app was worse, but this is still clumsy.", 0, "comparative"),
 ("The food was superb but the service was appalling and we will not return.", 0, "mixed aspects"),
 ("The battery is weak, yet the camera is fantastic and that is what I bought it for.", 1, "mixed aspects"),
 ("Great acting, terrible script, and the script is what matters.", 0, "mixed aspects"),
 ("The plot drags in the middle, but the ending makes it all worthwhile.", 1, "mixed aspects"),
]
texts, labels, kinds = [t for t, _, _ in ADV], np.array([l for _, l, _ in ADV]), [k for _, _, k in ADV]
print(f"\\n{'approach':<22} " + "  ".join(f"{k:>13}" for k in dict.fromkeys(kinds)) + "   all 20")
for name, f in predict.items():
    ok = f(texts) == labels
    print(f"{name:<22} " + "  ".join(f"{ok[[k == kk for k in kinds]].sum():>11}/4" for kk in dict.fromkeys(kinds)) + f"   {ok.sum():>5}/20")

def aspects(review):
    parts = re.split(r"[.!?;]+|,?\\s+\\b(?:but|yet|although|though|however|whereas)\\b\\s+", review)
    return [(p.strip(), "pos" if vader.polarity_scores(p)["compound"] >= 0 else "neg") for p in parts if p and p.strip()]
print("\\naspect-level sentiment by splitting on contrastive conjunctions (VADER per clause):")
for r in ["The food was superb but the service was appalling.", "The battery is weak, yet the camera is fantastic.",
          "Lovely staff. The room was tiny though the view was stunning."]:
    print(f"  {r}\\n    -> {aspects(r)}")`,
        out: `caution: the DistilBERT checkpoint was fine-tuned on SST-2's training split, so on this validation set it is in-domain

approach               SST-2 validation
VADER (no training)    0.625
TF-IDF + logistic      0.781
DistilBERT SST-2       0.911

approach                     sarcasm       negation        litotes    comparative  mixed aspects   all 20
VADER (no training)              0/4            2/4            2/4            3/4            3/4      10/20
TF-IDF + logistic                2/4            0/4            0/4            3/4            3/4       8/20
DistilBERT SST-2                 3/4            3/4            4/4            3/4            3/4      16/20

aspect-level sentiment by splitting on contrastive conjunctions (VADER per clause):
  The food was superb but the service was appalling.
    -> [('The food was superb', 'pos'), ('the service was appalling', 'neg')]
  The battery is weak, yet the camera is fantastic.
    -> [('The battery is weak', 'neg'), ('the camera is fantastic', 'pos')]
  Lovely staff. The room was tiny though the view was stunning.
    -> [('Lovely staff', 'pos'), ('The room was tiny', 'pos'), ('the view was stunning', 'pos')]`,
       
        notes: [
          { t: "p", text: "How far apart the three land depends on the text. On short, informal posts VADER with no training is a serious baseline; on SST-2's movie-review sentences the reference run measured VADER at 0.625, TF-IDF with logistic regression at 0.781 and an SST-2 fine-tuned DistilBERT at 0.911 — the last in-domain, which flatters it. The adversarial set is the more useful comparison. On twenty hand-built cases the transformer got 16 right, VADER 10 and the TF-IDF model 8, which missed every negation and litotes case because a bag of n-grams sees `not` and `good` without their relationship. Sarcasm is worth testing rather than assuming: the transformer caught three of four sarcastic sentences here, and the one it missed — `Oh great, another two hours of my life I will never get back` — carries its complaint in an idiom after a positive opener." },
          { t: "p", text: "Splitting on `but` is the cheapest large improvement in aspect-based sentiment, because English uses it to mark a contrast and the two sides very often carry opposite sentiment about different aspects. Splitting only on full stops leaves 'the food was excellent but the service was terrible' as one unit, which averages to nothing useful." },
          { t: "p", text: "Writing your own adversarial examples and labelling them before running anything is worth the discipline. It is easy to look at a model's output on a tricky sentence and rationalise the score it gave, and pre-committing to the label removes that. It is also how you discover that some of your examples are genuinely ambiguous, which is itself informative about what the task can achieve." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: sarcastic reviews counted as praise",
      body: [
        { t: "p", text: "**Symptom.** A brand-monitoring tool reported a surge in positive sentiment during a product failure." },
        { t: "p", text: "**Mechanism.** Customers wrote sarcastically — 'great, it broke again'. A lexicon-based model scored the positive words and missed the meaning." },
        { t: "p", text: "**Fix.** Sentiment is measured with a model fine-tuned on in-domain labelled data, evaluated on an adversarial set including sarcasm and negation." }
      ] }
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
      options: ["A bug in VADER's lexicon", "Sarcasm is not lexical", "The sentence is too short", "Punctuation confused it"],
      answer: 1,
      why: "Every word-level method reads the words. Sarcasm places the meaning in the gap between what is said and what is meant, and no word in the sentence carries the negative. It requires reasoning about the whole utterance, which a lexicon plus rules cannot do by construction." },
    { stem: "What does VADER do that a TF-IDF bag of words cannot?",
      options: ["Use a much larger vocabulary", "Apply negation and emphasis rules", "Run faster on long documents", "Handle many languages at once"],
      answer: 1,
      why: "To a bag of words, `not good` is the multiset `{not, good}` and the negation is an unconnected feature. VADER looks back for a negator and inverts the polarity, taking `good` from +0.440 to −0.341 and `bad` from −0.542 to +0.431 in `not bad`." },
    { stem: "Why is aspect-based sentiment more useful than document-level?",
      options: ["It is simply the more accurate method", "Mixed views average to a false neutral", "It needs far less labelled data", "It runs much faster at inference"],
      answer: 1,
      why: "*The food was excellent but the service was terrible* has no single sentiment; a document-level score returns roughly neutral, which conveys nothing and hides that there is anything to act on. Per-aspect output tells an operator which specific thing to fix, which is what turns a number into a decision." },
    { stem: "You apply a film-review sentiment model to financial news. What should you expect?",
      options: ["Similar accuracy to film reviews", "Systematic errors on domain terms", "Better accuracy, as news is cleaner", "It will refuse to run on news"],
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
