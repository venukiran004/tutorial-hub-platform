/* ============================================================================
   LESSON 3.1 — NLP with spaCy
   Mirrors 01_NLP_Notes.md · §17. The pipeline, the Doc/Token/Span object
   model, a custom component and both matchers are run and timed
   (scratchpad/nlp/n31.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**PhraseMatcher matched 5,000 terms 3,538 times faster than Matcher, finding exactly the same match.** 6.358 ms per document against 0.0018 ms. That gap is the whole lesson in miniature: spaCy gives you several ways to do the same thing and they are not interchangeable at scale. This lesson takes the pipeline apart — what the components are, what `Doc`, `Token` and `Span` actually hold, how to add your own component and how to make it fast.",

  objectives: [
    "Read `nlp.pipe_names` and explain what each component contributes",
    "Describe the Doc/Token/Span object model and why tokens are views, not strings",
    "Disable components and batch with `nlp.pipe`, and know what each buys",
    "Write and register a custom pipeline component with a custom attribute",
    "Choose between Matcher and PhraseMatcher from the pattern count"
  ],

  prerequisites: ["2.8", "1.2"],

  blocks: [

    { t: "h2", n: "01", text: "The pipeline is a list", id: "pipeline" },

    { t: "p", text: "`spacy.load` returns a `Language` object, and calling it runs the text through an ordered list of components. Each one annotates the same `Doc` in place and passes it along. Nothing here is hidden — you can print the list, reorder it, remove from it and add to it." },

    { t: "out", text:
"load 0.59s   spaCy 3.8.11   model 3.7.0\npipe_names: ['tok2vec', 'tagger', 'parser', 'attribute_ruler', 'lemmatizer', 'ner']\n\n  tok2vec          Tok2Vec\n  tagger           Tagger\n  parser           DependencyParser\n  attribute_ruler  AttributeRuler\n  lemmatizer       EnglishLemmatizer\n  ner              EntityRecognizer" },

    { t: "dl", items: [
      ["tok2vec", "Computes the token vectors every downstream component reads. Shared, so the encoder runs once rather than per component."],
      ["tagger", "Part-of-speech tags. Fills `token.tag_`, the fine-grained Penn Treebank tag."],
      ["parser", "Dependency parse. Fills `token.dep_` and `token.head`, and it is what makes `doc.sents` available."],
      ["attribute_ruler", "Rule-based fixes over the statistical output, and the mapping from fine tags to coarse `token.pos_`."],
      ["lemmatizer", "Dictionary lemmas, which need the POS tag — which is why it runs after the tagger."],
      ["ner", "Named entity spans. Fills `doc.ents`."]
    ] },

    { t: "callout", kind: "note", title: "Tokenisation is not in that list",
      body: [{ t: "p", text: "The tokeniser is not a pipeline component — it runs first, always, and produces the `Doc` that the components then annotate. That is why you cannot disable it and why `nlp.make_doc(text)` gives you a tokenised `Doc` without running anything else. It is also the fastest path when all you need is tokens." }] },

    { t: "h2", n: "02", text: "One sentence, fully annotated", id: "annotated" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n31.py — the reference's sentence", code:
"import spacy\n\nnlp = spacy.load(\"en_core_web_sm\")     # sm: fast. md/lg: vectors. trf: most accurate\ndoc = nlp(\"Apple is looking at buying U.K. startup for $1 billion\")\n\nfor token in doc:\n    print(f\"{token.text:10} {token.pos_:6} {token.dep_:10} \"\n          f\"{token.is_stop} {token.lemma_}\")\n\nfor ent in doc.ents:\n    print(f\"{ent.text:20} {ent.label_:10} ({ent.start_char}:{ent.end_char})\")",
      caption: "Four model sizes ship: `sm` has no word vectors, `md` and `lg` do, and `trf` wraps a transformer. `doc.similarity()` silently degrades on `sm` because there are no vectors to compare." },

    { t: "out", text:
"TEXT       POS    DEP        STOP   LEMMA\nApple      PROPN  nsubj      False  Apple\nis         AUX    aux        True   be\nlooking    VERB   ROOT       False  look\nat         ADP    prep       True   at\nbuying     VERB   pcomp      False  buy\nU.K.       PROPN  dobj       False  U.K.\nstartup    NOUN   dep        False  startup\nfor        ADP    prep       True   for\n$          SYM    quantmod   False  $\n1          NUM    compound   False  1\nbillion    NUM    pobj       False  billion\n\nentities:\n  Apple            ORG        (0:5)\n  U.K.             GPE        (27:31)\n  $1 billion       MONEY      (44:54)" },

    { t: "p", text: "Two details worth noticing. `U.K.` survived as a single token, full stops included — the tokeniser carries exception lists for abbreviations, so it does not split on that full stop or treat it as a sentence boundary. And `$1 billion` is one entity span covering three tokens: entities are spans, not tokens, which is why `doc.ents` is a separate iterator rather than a token attribute." },

    { t: "h2", n: "03", text: "Doc, Token and Span are views", id: "objects" },

    { t: "p", text: "A `Token` is not a string. It holds an index into the parent `Doc`, and every attribute you read is looked up from the `Doc`'s underlying arrays. Slicing gives a `Span`, which is likewise a pair of indices. Nothing is copied." },

    { t: "out", text:
"type(doc)       Doc\ntype(doc[0])    Token\ntype(doc[0:2])  Span\n\ndoc[0].doc is doc  -> True\nspan.doc is doc    -> True\n\na Token stores an index, not a string: token.i = 3, token.idx = 17\ndoc.text[17:19] = 'at'" },

    { t: "callout", kind: "insight", title: "Why the two indices are different",
      body: [{ t: "p", text: "`token.i` is the token's position in the document — 3 here — and `token.idx` is its **character** offset in the original text — 17. You need the character offset whenever you report a result back to something that holds the raw string: highlighting in a UI, writing an annotation back to a database, citing a source. This is the same offset mapping you used for extractive QA in lesson 2.8, and it is the reason spaCy never destroys the original text. `doc.text` reconstructs the input exactly, whitespace included." }] },

    { t: "h2", n: "04", text: "Making it fast", id: "fast" },

    { t: "p", text: "Two levers, and they compound. Disable the components you do not use, and batch with `nlp.pipe` rather than calling `nlp` in a loop." },

    { t: "out", text:
"parsing 200 copies of the same sentence\n\ndisable=[]                                               0.988s\ndisable=['parser']                                       0.844s\ndisable=['parser', 'ner']                                0.550s\ndisable=['parser','ner','tagger','lemmatizer','attribute_ruler']  0.534s\n\n500 docs, one at a time : 3.218s\n500 docs, nlp.pipe      : 1.397s   (2.30x)" },

    { t: "p", text: "Dropping the parser and NER roughly halved the time — those two are the expensive components. Dropping everything else after that bought almost nothing, because `tok2vec` is still running and it is the shared cost underneath. If you genuinely only want tokens, `nlp.make_doc` skips the pipeline altogether." },

    { t: "callout", kind: "trap", title: "`nlp.pipe` is the API, not a convenience wrapper",
      body: [{ t: "p", text: "Calling `nlp(text)` in a loop processes one document at a time and leaves the model's batch dimension at 1, which wastes most of the matrix multiply. `nlp.pipe(texts, batch_size=50)` was **2.30x** faster here on 500 short documents, and the gap widens with a transformer model where batching matters far more. It also accepts `n_process` for multiprocessing. If you are calling `nlp()` inside a `for` loop over a list you already have, that is the single easiest speedup available." }] },

    { t: "h2", n: "05", text: "Custom components", id: "custom" },

    { t: "p", text: "A component is any callable taking a `Doc` and returning a `Doc`. Register it with `@Language.component`, declare any custom attributes on `Doc`, `Token` or `Span`, and add it to the pipeline by name." },

    { t: "code", lang: "python", title: "scratchpad/nlp/n31.py — a custom component", code:
"from spacy.language import Language\nfrom spacy.tokens import Doc\n\nDoc.set_extension(\"sentiment\", default=\"neutral\", force=True)\n\n@Language.component(\"custom_sentiment\")\ndef custom_sentiment(doc):\n    pos = {\"good\", \"great\", \"excellent\", \"amazing\", \"love\"}\n    neg = {\"bad\", \"terrible\", \"awful\", \"hate\", \"worst\"}\n    p = sum(1 for t in doc if t.text.lower() in pos)\n    n = sum(1 for t in doc if t.text.lower() in neg)\n    doc._.sentiment = \"positive\" if p > n else \"negative\" if n > p else \"neutral\"\n    return doc\n\nnlp.add_pipe(\"custom_sentiment\", last=True)",
      caption: "Custom attributes live under the `._.` namespace so they can never collide with spaCy's own. `force=True` allows re-registration, which matters in notebooks." },

    { t: "out", text:
"pipe_names now: ['tok2vec','tagger','parser','attribute_ruler','lemmatizer','ner','custom_sentiment']\n\nThis is a great product with amazing features  -> positive\nThis is the worst thing I have ever bought     -> negative\nThe product arrived on Tuesday                 -> neutral\nThis is not good at all                        -> positive   <- wrong" },

    { t: "callout", kind: "trap", title: "The same negation failure, again",
      body: [{ t: "p", text: "*This is not good at all* came back **positive**, because the component counts `good` and never looks at `not`. This is exactly the failure you measured in lesson 2.2, where VADER handled negation correctly and a bag-of-words lexicon did not. It is worth seeing twice: the mechanism that makes a lexicon component fast — independent word lookups with no context — is precisely the mechanism that makes it wrong. If you write a component like this, put a negation window in it or accept that it will invert on negated sentences." }] },

    { t: "p", text: "Where a component sits matters. `last=True` puts it at the end, after NER, so it can read `doc.ents`. `before=\"ner\"` would let it modify tokens the entity recogniser then sees. A component that needs POS tags must run after the tagger, and spaCy will not stop you from getting that wrong — it will just hand you empty attributes." },

    { t: "h2", n: "06", text: "Rule-based matching", id: "matching" },

    { t: "p", text: "Statistical models are not always the right tool. If you know the exact strings or the exact grammatical shape you want, a matcher is faster, exact, and debuggable. spaCy has two, and choosing wrongly costs you three orders of magnitude." },

    { t: "code", lang: "python", title: "Matcher: token-level patterns", code:
"from spacy.matcher import Matcher, PhraseMatcher\n\nmatcher = Matcher(nlp.vocab)\nmatcher.add(\"ML_PATTERN\", [[{\"LOWER\": \"machine\"}, {\"LOWER\": \"learning\"}]])\nmatcher.add(\"ADJ_MODEL\",  [[{\"POS\": \"ADJ\"},       {\"LOWER\": \"model\"}]])\n\ndoc = nlp(\"Machine Learning uses a large model for deep learning tasks\")\nfor match_id, start, end in matcher(doc):\n    print(nlp.vocab.strings[match_id], doc[start:end].text)\n\n# PhraseMatcher: exact phrases, hashed\nphrase = PhraseMatcher(nlp.vocab, attr=\"LOWER\")\nphrase.add(\"NLP_TERMS\", [nlp.make_doc(t) for t in\n                         [\"machine learning\", \"deep learning\",\n                          \"natural language processing\"]])",
      caption: "`Matcher` patterns can reference any token attribute — `POS`, `LEMMA`, `IS_DIGIT`, `OP` for quantifiers. `PhraseMatcher` only does literal sequences, which is why it can hash them." },

    { t: "out", text:
"ML_PATTERN    Machine Learning\nADJ_MODEL     large model\n\nphrase: Machine Learning\nphrase: Deep Learning" },

    { t: "h2", n: "07", text: "Which matcher, and why it matters", id: "benchmark" },

    { t: "out", text:
"5000 patterns, 500 runs over a 12-token document\nboth matchers found exactly 1 match\n\n                 build     per document\nMatcher          0.381s    6.3580 ms\nPhraseMatcher    0.164s    0.0018 ms\n\nPhraseMatcher is 3538x faster at match time" },

    { t: "callout", kind: "insight", title: "Why the gap is three orders of magnitude",
      body: [{ t: "p", text: "`Matcher` evaluates patterns as small state machines over the token sequence — with 5,000 patterns it has 5,000 machines to advance at every token, and attribute predicates like `POS` have to be checked at each step. `PhraseMatcher` compiles literal phrases into a hash-based trie keyed on the token attribute, so each token is one hash lookup regardless of how many phrases are registered. The cost stops depending on the pattern count. If your patterns are literal strings — product names, drug names, a gazetteer — use `PhraseMatcher`. Keep `Matcher` for patterns that genuinely need grammar." }] },

    { t: "diagram", kind: "compare", title: "Choosing a matcher",
      columns: [
        { title: "Matcher", tone: "warn", items: [
          "Token patterns with attributes",
          "POS, LEMMA, SHAPE, regex, quantifiers",
          "Cost grows with pattern count",
          "6.358 ms/doc at 5000 patterns",
          "Needs the tagger for POS patterns",
          "Use for grammatical shapes"
        ] },
        { title: "PhraseMatcher", tone: "good", items: [
          "Literal phrase sequences only",
          "Match on LOWER, ORTH or LEMMA",
          "Cost independent of pattern count",
          "0.0018 ms/doc at 5000 patterns",
          "Runs on make_doc output alone",
          "Use for gazetteers and term lists"
        ] }
      ] },

    { t: "h2", n: "08", text: "Why spaCy is the production default", id: "production" },

    { t: "p", text: "The case is not that spaCy's models are the most accurate — `en_core_web_trf` is competitive but a fine-tuned transformer will usually beat it. The case is that everything around the model is built for shipping: one object holds all annotations with offsets preserved, components are declarative and swappable, batching and multiprocessing are first-class, the models are versioned artefacts you pin, and the whole thing runs on CPU at a speed that makes per-document cost a non-issue." },

    { t: "callout", kind: "tradeoff", title: "Where spaCy stops being the answer",
      body: [{ t: "p", text: "When the task is classification or generation rather than linguistic annotation, spaCy is the wrong shape — you want HuggingFace and a fine-tuned model, which lesson 3.3 covers. When you need state-of-the-art NER on a specialised domain, spaCy's pretrained pipelines will underperform a domain-tuned transformer, though you can wrap one in a spaCy component and keep the surrounding machinery. And for one-off research or teaching, NLTK's breadth of corpora and algorithms is genuinely more useful, which is the subject of the next lesson." }] },

    { t: "exercise", title: "Take the pipeline apart",
      tasks: [
        "Print `nlp.pipe_names`, then load with each component disabled in turn and find which attributes go empty. Confirm the lemmatizer degrades when the tagger is off.",
        "Time your own workload with and without `nlp.pipe`, and sweep `batch_size` from 1 to 1000. Plot it and find where the curve flattens.",
        "Write a component that tags each sentence with its token count, registered as a `Span` extension rather than a `Doc` one.",
        "Add a negation window to the sentiment component so `not good` scores negative, then find an input that still fools it.",
        "Build a PhraseMatcher over 10,000 terms from your own domain and measure per-document cost. Compare it against the equivalent Matcher patterns."
      ] }
  ],

  takeaways: [
    "`nlp.pipe_names` lists the components; tokenisation happens before them and cannot be disabled.",
    "`Token` and `Span` are views into the parent `Doc` — `token.i` is the token index, `token.idx` the character offset you need for citation.",
    "Disabling the parser and NER roughly halved runtime; disabling the rest bought almost nothing, because `tok2vec` is the shared cost.",
    "`nlp.pipe` was 2.30x faster than a loop on 500 documents, and the gap widens with larger models.",
    "A custom component is any `Doc` to `Doc` callable; custom attributes live under `._.` so they cannot collide.",
    "The word-counting sentiment component scored 'This is not good at all' as positive — the same negation blindness measured in lesson 2.2.",
    "PhraseMatcher beat Matcher by 3538x on 5,000 patterns (0.0018 ms against 6.358 ms per document) because hashing does not scale with pattern count.",
    "Use Matcher when patterns need grammar, PhraseMatcher when they are literal strings."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did disabling the tagger and lemmatizer barely change runtime after the parser and NER were already off?",
      options: ["They were never running", "Because `tok2vec` is the shared cost underneath and it still runs", "Because the document was too short", "Because spaCy caches results"],
      answer: 1,
      why: "Timing went 0.988s to 0.550s when the parser and NER came out, then only to 0.534s when everything else did. The tok2vec component computes the token vectors all downstream components read, and it dominates what remains. To skip it entirely you need `nlp.make_doc`, which runs only the tokeniser." },
    { stem: "What is the difference between `token.i` and `token.idx`?",
      options: ["They are aliases", "`token.i` is the token's index in the Doc; `token.idx` is its character offset in the original text", "`token.idx` is the vocabulary hash", "`token.i` is the sentence number"],
      answer: 1,
      why: "For the token 'at' in the example, `i` was 3 and `idx` was 17 — and `doc.text[17:19]` returns 'at'. The character offset is what you need to highlight a result in a UI or write an annotation back against the raw string, which is why spaCy never discards the original text." },
    { stem: "Why is PhraseMatcher 3538x faster than Matcher at 5,000 patterns?",
      options: ["It runs in C and Matcher does not", "It hashes literal phrases into a trie, so cost does not grow with pattern count, while Matcher advances one state machine per pattern per token", "It only checks the first token", "It uses multiple threads"],
      answer: 1,
      why: "Matcher evaluates each pattern as a state machine over the tokens, so 5,000 patterns means 5,000 machines to advance at every position, with attribute predicates checked at each step. PhraseMatcher compiles literal sequences into a hash-keyed trie — one lookup per token no matter how many phrases are registered. Both found exactly the same single match." },
    { stem: "Why did the custom sentiment component label 'This is not good at all' as positive?",
      options: ["A bug in `set_extension`", "It counts lexicon words independently and never reads 'not'", "The component ran before the tagger", "'good' is not in the lexicon"],
      answer: 1,
      why: "It counts how many tokens fall in a positive set and how many in a negative set, with no window around either. 'good' matches, 'not' is invisible to it, so positives win. The property that makes it fast — independent lookups with no context — is exactly what makes it wrong, which is the same result lesson 2.2 measured against VADER." }
  ] },

  interview: { title: "Interview", sub: "spaCy in production", questions: [
    { level: "Core", q: "What does spaCy's pipeline actually do when you call `nlp(text)`?",
      strong: "Tokenise, then run an ordered list of components that each annotate the same Doc in place.",
      answer: [{ t: "p", text: "The tokeniser runs first and produces a `Doc` — that step is not a pipeline component and cannot be disabled. Then the components in `nlp.pipe_names` run in order, each annotating that same `Doc` and passing it on: `tok2vec` computes the shared token vectors, `tagger` adds POS, `parser` adds dependencies and sentence boundaries, `attribute_ruler` and `lemmatizer` fill lemmas, and `ner` adds entity spans. The ordering encodes real dependencies — the lemmatizer needs the tagger's output, so putting a component in the wrong place gets you empty attributes rather than an error. What matters in practice is that this is all inspectable and editable: you can disable components you don't need, which roughly halved my runtime when I dropped the parser and NER, and you can insert your own anywhere in the sequence." }] },
    { level: "Core", q: "When would you use spaCy's Matcher versus PhraseMatcher?",
      strong: "PhraseMatcher for literal term lists, Matcher only when the pattern needs grammar — the performance gap is three orders of magnitude.",
      answer: [{ t: "p", text: "PhraseMatcher whenever the patterns are literal strings — a product catalogue, a drug list, a gazetteer of place names — because it compiles them into a hash-keyed trie and its cost per document does not grow with the number of phrases. Matcher when the pattern genuinely needs linguistic attributes: an adjective followed by a particular noun, a lemma rather than a surface form, a quantifier over optional tokens. The gap is not small. I benchmarked 5,000 patterns over a twelve-token document and got 6.358 ms per document for Matcher against 0.0018 ms for PhraseMatcher — about 3,538 times — with both finding exactly the same single match. Matcher has to advance one state machine per pattern at every token; PhraseMatcher does one hash lookup. So the rule I use is: if you can express it as a literal list, express it as a literal list, and reach for Matcher only when you actually need the grammar." }] },
    { level: "Senior", q: "How would you deploy a spaCy pipeline handling millions of documents a day?",
      strong: "Disable unused components, batch with nlp.pipe, pin the model version, and watch for train-serve tokenisation skew.",
      answer: [{ t: "p", text: "First, cut what I'm not using — the parser and NER are the expensive components, and dropping them roughly halved runtime in my measurements. If a downstream consumer only needs entities, there's no reason to be running the parser. Second, batch: `nlp.pipe` with a tuned `batch_size` was 2.30x faster than a loop on 500 short documents, and with `n_process` for multiprocessing on top. Third, pin the model version as a build artefact, not a download at startup — `en_core_web_sm` 3.7.0 and 3.8.0 produce different annotations, and if that changes under you the downstream features shift silently. That's the same train-serve skew problem as any other preprocessing step, and it's the one I'd put monitoring on: track the distribution of entity types and tokens per document over time, because a tokenisation change shows up there before it shows up in an accuracy metric anyone is watching. For throughput beyond what that gives, the options are horizontal scaling behind a queue, or moving the heavy statistical components off the hot path entirely and running them asynchronously, keeping only tokenisation and matching synchronous." }] }
  ] }
});
