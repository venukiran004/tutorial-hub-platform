/* ============================================================================
   LESSON 3.2 — NLP with NLTK
   Mirrors 01_NLP_Notes.md · §18. Tokenisers, stemmers, WordNet and
   collocations run for real. The reference's ne_chunk output did not
   reproduce — see §03 (scratchpad/nlp/n32.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "**Porter stems `universal`, `university` and `universe` to the same string: `univers`.** Three unrelated meanings collapsed into one feature. That is not a bug — it is what a stemmer is, a set of suffix-stripping rules with no dictionary and no idea what a word means. NLTK is the library that shows you the machinery rather than hiding it, and this lesson uses it to make the stemming-versus-lemmatisation distinction concrete, then reaches WordNet, which is the thing NLTK has that nothing else does.",

  objectives: [
    "Use NLTK's tokenisers, taggers and chunkers, and check their output rather than trusting it",
    "Contrast Porter, Snowball and WordNet normalisation on words designed to break them",
    "Navigate WordNet: synsets, hypernym paths, antonyms and path similarity",
    "Find collocations with PMI and explain why raw frequency finds nothing useful",
    "State honestly where NLTK is faster than spaCy and where it is not"
  ],

  prerequisites: ["3.1", "1.2"],

  blocks: [

    { t: "h2", n: "01", text: "What NLTK is for", id: "what" },

    { t: "p", text: "NLTK is a teaching and research toolkit that predates the production libraries by a decade. It bundles dozens of corpora, implementations of most classical algorithms, and interfaces to lexical resources — and it makes every step inspectable. Where spaCy hands you one opinionated pipeline, NLTK hands you the parts." },

    { t: "dl", items: [
      ["Corpora", "Gutenberg, Brown, Reuters, movie reviews, WordNet, and about a hundred more, each with a consistent reader interface."],
      ["Algorithms", "Multiple tokenisers, four stemmers, taggers, chunkers, parsers — usually several implementations of each so you can compare them."],
      ["Lexical resources", "WordNet, VADER's lexicon, stopword lists in many languages. This is the part with no real substitute."],
      ["Downloads", "Nothing ships with the package. `nltk.download('punkt')` and friends fetch data at runtime, which is a deployment consideration."]
    ] },

    { t: "h2", n: "02", text: "Tokenising and tagging", id: "tokenising" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n32.py — the reference's example", code:
"import nltk\nfrom nltk.tokenize import word_tokenize, sent_tokenize\nfrom nltk import pos_tag, ne_chunk\n\n# nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')\n# nltk.download('maxent_ne_chunker'); nltk.download('words')\n\ntext = \"Steve Jobs founded Apple Inc. in Cupertino. He was a visionary leader.\"\n\nprint(sent_tokenize(text))\ntokens = word_tokenize(text)\ntagged = pos_tag(tokens)\n\ntree = ne_chunk(tagged)\nfor subtree in tree:\n    if hasattr(subtree, \"label\"):\n        entity = \" \".join(word for word, tag in subtree.leaves())\n        print(entity, subtree.label())",
      caption: "On NLTK 3.9 and later the downloads are `punkt_tab`, `averaged_perceptron_tagger_eng` and `maxent_ne_chunker_tab` — the older names still resolve but the data layout changed." },

    { t: "out", text:
"sent_tokenize: ['Steve Jobs founded Apple Inc. in Cupertino.',\n                'He was a visionary leader.']\n\nword_tokenize: ['Steve', 'Jobs', 'founded', 'Apple', 'Inc.', 'in',\n                'Cupertino', '.', 'He', 'was', 'a', 'visionary', 'leader', '.']\n\npos_tag[:5]: [('Steve','NNP'), ('Jobs','NNP'), ('founded','VBD'),\n              ('Apple','NNP'), ('Inc.','NNP')]" },

    { t: "p", text: "The tokeniser handled the hard part correctly: `Inc.` keeps its full stop as one token, and the sentence splitter still broke after `Cupertino.` rather than after `Inc.`. That is the Punkt model, which is trained rather than rule-based, doing exactly what it should." },

    { t: "h2", n: "03", text: "Where the reference's output did not reproduce", id: "nechunk" },

    { t: "p", text: "The reference states that `ne_chunk` returns *Steve Jobs (PERSON)*, *Apple Inc. (ORGANIZATION)* and *Cupertino (GPE)*. Run on NLTK 3.10.3, it does not." },

    { t: "out", text:
"NLTK ne_chunk:\n  Steve            PERSON\n  Jobs             PERSON        <- split into two entities\n  Apple Inc.       PERSON        <- should be ORGANIZATION\n  Cupertino        GPE\n\nspaCy en_core_web_sm:\n  Steve Jobs       PERSON\n  Apple Inc.       ORG\n  Cupertino        GPE" },

    { t: "callout", kind: "warn", title: "Two of three entities wrong",
      body: [{ t: "p", text: "`ne_chunk` split *Steve Jobs* into two separate PERSON entities and labelled *Apple Inc.* as a PERSON. Only *Cupertino* came out right. spaCy got all three correct on the same sentence. This is not a dig at NLTK — the maximum-entropy chunker dates from an earlier era and was never the library's selling point — but it is a concrete reason not to use NLTK's NER for anything real, and a reminder to run the reference's examples rather than quoting their claimed output. The sentence is about as easy as NER gets." }] },

    { t: "h2", n: "04", text: "Stemming against lemmatisation", id: "stemming" },

    { t: "p", text: "Both reduce inflected forms to a common base, but by completely different means. A stemmer applies suffix-stripping rules and never consults a dictionary; a lemmatiser looks the word up and needs to know its part of speech. The difference shows on words chosen to expose it." },

    { t: "out", text:
"word         porter     snowball   wordnet-n    wordnet-v\nrunning      run        run        running      run\nruns         run        run        run          run\nran          ran        ran        ran          run\nbetter       better     better     better       better\nstudies      studi      studi      study        study\nstudying     studi      studi      studying     study\ncaresses     caress     caress     caress       caress\nponies       poni       poni       pony         ponies\nwas          wa         was        wa           be\nuniversal    univers    univers    universal    universal\nuniversity   univers    univers    university   university\nuniverse     univers    univers    universe     universe" },

    { t: "callout", kind: "trap", title: "Three findings in that table",
      body: [{ t: "p", text: "**Stemmers over-merge.** *universal*, *university* and *universe* all become `univers` — three unrelated concepts sharing one feature, and no amount of downstream modelling recovers the distinction. **Stemmers produce non-words.** `studi`, `poni`, and Porter's `wa` for *was* are not English, which is fine for a retrieval index and useless anywhere a human reads the output. **Lemmatisation needs the POS tag.** `ran` stays `ran` by default because WordNet's lemmatiser assumes a noun; tell it `pos=\"v\"` and it gives `run`. That default is why lemmatisation so often appears not to work — it is doing exactly what you asked, for the wrong part of speech." }] },

    { t: "p", text: "Snowball differs from Porter only slightly here — it leaves *was* alone where Porter mangles it to `wa` — but it is the better default: it is the same author's revision, handles more edge cases, and supports fifteen languages where Porter is English only." },

    { t: "h2", n: "05", text: "WordNet", id: "wordnet" },

    { t: "p", text: "WordNet is a hand-built lexical database: words grouped into synsets (sets of synonyms sharing one meaning), linked by relations — hypernym for *is-a*, hyponym for the inverse, meronym for *part-of*, plus antonymy. It encodes what a word *means* and how meanings relate, which no amount of distributional training gives you directly." },

    { t: "out", text:
"'bank' has 18 synsets; first three:\n  bank.n.01                              sloping land (especially the slope beside a body of water)\n  depository_financial_institution.n.01  a financial institution that accepts deposits and channels\n  bank.n.03                              a long ridge or pile\n\n'run' has 57 synsets\n\npath similarity  dog/cat 0.2000   dog/car 0.0769\n\nhypernym path for dog.n.01:\n  entity -> physical_entity -> object -> whole -> living_thing\n         -> organism -> animal -> domestic_animal -> dog\n\nlemmas of good.a.01: ['good']\nantonyms: ['bad']" },

    { t: "callout", kind: "insight", title: "Why the polysemy counts matter",
      body: [{ t: "p", text: "*bank* has **18** distinct senses and *run* has **57**. Every one of those is a different meaning a static word embedding has to average into a single vector — which is precisely the failure you measured in lesson 1.6 and watched Marian avoid in lesson 2.7. WordNet's sense inventory is the explicit version of what contextual embeddings learn implicitly. It also gives you the antonym relation, which distributional methods are famously bad at: *good* and *bad* appear in near-identical contexts, so their embeddings are similar, while WordNet records them as opposites." }] },

    { t: "p", text: "`path_similarity` scores two synsets by how far apart they sit in the hypernym tree — dog and cat at 0.2000, dog and car at 0.0769. It is crude compared with an embedding, but it is interpretable: you can print the path and see exactly why. That is the trade WordNet always offers — less coverage and less nuance, in exchange for being able to explain every number." },

    { t: "h2", n: "06", text: "Frequency and collocations", id: "collocations" },

    { t: "p", text: "A collocation is a word pair that co-occurs more than chance would predict — a fixed phrase rather than an accident of grammar. The scoring function decides whether you find any." },

    { t: "code", lang: "python", title: "PMI over a real corpus", code:
"from nltk.collocations import BigramCollocationFinder\nfrom nltk.metrics import BigramAssocMeasures\nfrom nltk.corpus import gutenberg\n\nwords = [w.lower() for w in gutenberg.words(\"austen-emma.txt\") if w.isalpha()]\n\nfinder = BigramCollocationFinder.from_words(words)\nfinder.apply_freq_filter(10)          # without this, PMI returns only hapaxes\nprint(finder.nbest(BigramAssocMeasures.pmi, 8))",
      caption: "`apply_freq_filter` is not optional. PMI is maximised by pairs that occur once and only together, so without a frequency floor it returns nothing but noise." },

    { t: "out", text:
"austen-emma.txt: 161600 alphabetic tokens\n\ntop PMI bigrams : brunswick square, don t, william larkins, box hill,\n                  maple grove, abbey mill, colonel campbell, robert martin\n\ntop raw-freq    : to be, of the, it was, in the, i am, she had,\n                  she was, had been" },

    { t: "callout", kind: "insight", title: "PMI finds names; frequency finds grammar",
      body: [{ t: "p", text: "The PMI list is almost entirely proper nouns and place names — *Brunswick Square*, *William Larkins*, *Box Hill*. These are genuine fixed phrases: the words essentially never appear apart. The raw-frequency list is *to be*, *of the*, *it was* — function-word pairs that are common because English is common, carrying no information about this novel at all. This is the same idf intuition from lesson 1.4 in a different guise: raw counts measure how much English a text contains, and you need a contrastive statistic to measure what the text is *about*." }] },

    { t: "h2", n: "07", text: "NLTK or spaCy: the honest timing", id: "speed" },

    { t: "p", text: "The usual claim is that spaCy is fast and NLTK is slow. On the same work, that is only half true." },

    { t: "out", text:
"300 short documents\n\n                      NLTK      spaCy\ntokenise only         0.032s    0.014s     spaCy 2.3x faster\ntokenise + POS tag    0.101s    0.260s     NLTK 2.6x faster" },

    { t: "callout", kind: "note", title: "Why NLTK wins the second row",
      body: [{ t: "p", text: "NLTK's tagger is an averaged perceptron over hand-designed features — a dot product per token, and essentially free. spaCy's tagger reads `tok2vec` output, which is a neural encoder that has to run over the whole document first. On short documents that fixed cost dominates and NLTK comes out ahead. The picture inverts on long documents, in larger batches, and on any measure of accuracy — spaCy's tagger is substantially more accurate, and its NER got all three entities right where NLTK's got one. Speed is the wrong axis to choose on here; I am reporting it because the numbers came out against the received wisdom and it would be dishonest to leave them out." }] },

    { t: "diagram", kind: "compare", title: "Which library, for what",
      columns: [
        { title: "NLTK", tone: "teal", items: [
          "Dozens of bundled corpora",
          "WordNet, with no real substitute",
          "Several implementations to compare",
          "Weak NER: 1 of 3 entities correct",
          "Data downloaded at runtime",
          "Teaching, research, lexical work"
        ] },
        { title: "spaCy", tone: "good", items: [
          "One opinionated pipeline",
          "No lexical database",
          "One implementation, tuned",
          "Strong NER: 3 of 3 correct",
          "Models pinned as artefacts",
          "Production annotation at scale"
        ] }
      ] },

    { t: "p", text: "In practice they are not competitors so much as different layers. A production system runs spaCy; the same team reaches for NLTK when it needs WordNet for a synonym expansion, a bundled corpus to sanity-check something, or a second implementation of an algorithm to check the first against." },

    { t: "exercise", title: "Break the normalisers",
      tasks: [
        "Find five more word triples that Porter conflates into one stem the way it does universal, university and universe.",
        "Lemmatise a document twice — once with the default noun assumption, once feeding real POS tags from `pos_tag`. Count how many lemmas differ.",
        "Walk the hypernym path from a domain term of yours up to `entity` and note where it stops being useful.",
        "Run PMI collocations on your own corpus with frequency floors of 1, 5, 20 and 100, and describe how the output changes at each.",
        "Use WordNet antonyms to build a negation-aware word list, then test it against the failing sentiment component from lesson 3.1."
      ] }
  ],

  takeaways: [
    "Porter stems universal, university and universe all to `univers`, and was to `wa` — stemmers over-merge and produce non-words.",
    "WordNet's lemmatiser assumes nouns: `ran` stays `ran` until you pass `pos=\"v\"`, which is why lemmatisation so often looks broken.",
    "Snowball is the better default stemmer — same author, more edge cases handled, fifteen languages.",
    "NLTK's `ne_chunk` split 'Steve Jobs' and called 'Apple Inc.' a PERSON; the reference's quoted output did not reproduce, and spaCy got all three right.",
    "WordNet records 18 senses for `bank` and 57 for `run` — the explicit version of the polysemy that static embeddings average away.",
    "WordNet gives antonyms, which distributional methods get wrong because `good` and `bad` share contexts.",
    "PMI collocations surface fixed phrases and proper nouns; raw frequency surfaces function-word pairs and tells you nothing about the text.",
    "NLTK tokenising is 2.3x slower than spaCy, but NLTK tokenise-plus-tag was 2.6x faster on short documents — spaCy's neural tok2vec is the fixed cost."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why do 'universal', 'university' and 'universe' all stem to `univers`?",
      options: ["A bug in the Porter implementation", "Because a stemmer strips suffixes by rule with no dictionary and no notion of meaning", "Because they share an etymology the stemmer looks up", "Because the corpus was too small"],
      answer: 1,
      why: "Porter is a fixed sequence of suffix-stripping rules applied to the surface string. It has no lexicon to tell it these are three unrelated concepts, so all three lose their endings and land on the same output. Three distinct meanings become one feature, and nothing downstream can recover the distinction." },
    { stem: "Why does WordNet's lemmatiser return 'ran' for 'ran'?",
      options: ["'ran' is not in WordNet", "It defaults to treating the word as a noun; with `pos=\"v\"` it returns 'run'", "It only handles regular verbs", "The wordnet data was not downloaded"],
      answer: 1,
      why: "`lemmatize()` takes a `pos` argument defaulting to noun. As a noun, 'ran' has no simpler form, so it comes back unchanged. Pass `pos=\"v\"` and you get 'run'. This is the most common reason lemmatisation appears not to work — it needs POS tags, which means running a tagger first." },
    { stem: "Why does `apply_freq_filter` matter before ranking collocations by PMI?",
      options: ["It speeds up the search", "Because PMI is maximised by pairs occurring once and only together, so without a floor it returns only noise", "It removes stopwords", "PMI requires equal frequencies"],
      answer: 1,
      why: "PMI measures how much more often two words co-occur than independence predicts, and that ratio is highest for a pair appearing exactly once, in each other's company. A frequency floor is what makes the statistic usable — at a floor of 10 over Emma it returned Brunswick Square and William Larkins rather than hapax noise." },
    { stem: "What did comparing NLTK and spaCy on tokenise-plus-tag actually show?",
      options: ["spaCy was faster on both tasks", "NLTK was 2.6x faster at tagging short documents, because spaCy's neural tok2vec is a fixed cost", "The two were identical", "NLTK failed to complete"],
      answer: 1,
      why: "NLTK took 0.101s against spaCy's 0.260s on 300 short documents. NLTK's averaged perceptron tagger is a dot product per token; spaCy must run its neural encoder over the document first. The result inverts on long documents and in batches, and spaCy is markedly more accurate — but the raw number went against the received wisdom." }
  ] },

  interview: { title: "Interview", sub: "NLTK and lexical resources", questions: [
    { level: "Core", q: "What is the difference between stemming and lemmatisation, and when would you use each?",
      strong: "Stemming is rule-based suffix stripping with no dictionary; lemmatisation is a dictionary lookup needing POS. Stem for retrieval, lemmatise for anything readable.",
      answer: [{ t: "p", text: "A stemmer applies suffix-stripping rules to the surface string, with no dictionary and no idea what the word means. A lemmatiser looks the word up in a lexicon and returns a real base form, but it needs the part of speech to do it. The practical consequences are sharp in both directions. Stemmers over-merge: Porter maps universal, university and universe all to `univers`, collapsing three unrelated concepts into one feature. They also emit non-words — `studi`, `poni`, `wa` for was — which is harmless in a retrieval index and unacceptable anywhere a human sees the output. Lemmatisers are correct but slower and dependent on tagging: WordNet's returns `ran` for ran until you tell it the word is a verb, which trips people up constantly. So: stemming when the output feeds a bag-of-words index and speed matters, lemmatisation when the output is read by a person or feeds something that needs real words. And if I'm stemming I use Snowball, not Porter — same author, better edge cases, and it handles fifteen languages." }] },
    { level: "Core", q: "What is WordNet and what would you use it for?",
      strong: "A hand-built lexical database of synsets and relations — the reliable source for antonyms and sense inventories.",
      answer: [{ t: "p", text: "It's a hand-curated database where words are grouped into synsets — sets of synonyms sharing one meaning — linked by relations: hypernym for is-a, hyponym for the inverse, meronym for part-of, and antonymy. I'd use it for three things. Query expansion, where you widen a search with genuine synonyms rather than embedding neighbours that are merely related. Antonym detection, which is the case where distributional methods are outright bad — good and bad occur in nearly identical contexts so their embeddings are close, while WordNet simply records them as opposites. And as an interpretable similarity: path similarity gave dog/cat 0.2000 against dog/car 0.0769, and unlike a cosine you can print the hypernym path and see exactly why. It's also a good way to make polysemy concrete — bank has 18 senses and run has 57, and every one of those is a meaning a static embedding has to average into one vector. The limitations are that it's English-first, coverage of new and domain-specific vocabulary is poor, and it's been essentially frozen for years." }] },
    { level: "Senior", q: "A teammate wants to build production NER with NLTK. What do you say?",
      strong: "Show them the measurement: `ne_chunk` got one of three entities right on a trivial sentence.",
      answer: [{ t: "p", text: "I'd run it rather than argue about it. On 'Steve Jobs founded Apple Inc. in Cupertino', `ne_chunk` split Steve Jobs into two separate PERSON entities and labelled Apple Inc. as a PERSON — one of three correct, on about the easiest NER sentence there is. spaCy's small model got all three right on the same input. That's a concrete measurement on their own example, which is more persuasive than a general claim about library quality. The underlying reason is that NLTK's maximum-entropy chunker is from an earlier generation and was never what the library was for. NLTK's real value is the corpora, WordNet, and having several implementations of an algorithm side by side so you can compare them — those are genuinely hard to get elsewhere. So the recommendation is spaCy for the annotation pipeline, or a fine-tuned transformer if the domain is specialised, and keep NLTK around for the lexical work. I'd also note the deployment angle: NLTK downloads its data at runtime, so a production container needs those fetched at build time or it fails on a cold start in an environment with no network." }] }
  ] }
});
