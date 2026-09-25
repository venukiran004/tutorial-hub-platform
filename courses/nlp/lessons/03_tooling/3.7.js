/* ============================================================================
   LESSON 3.7 — Coreference Resolution and Relation Extraction
   Mirrors 01_NLP_Notes.md · §23-24. The reference's rule-based extractor is
   run on eight sentences and fails five of them, each differently
   (scratchpad/nlp/n37.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.7",

  lede: "**Given `Google did not acquire Yahoo`, the reference's relation extractor emits `('Google', 'acquire', 'Yahoo')`.** It never looks at the negation, so it confidently asserts the one thing the sentence exists to deny. Run over eight sentences it got three right — and the five failures are each a different structural blind spot, which makes them the best available map of what rule-based extraction can and cannot do. This lesson runs that experiment, then covers coreference, the problem you must solve before extraction is even meaningful.",

  objectives: [
    "Define coreference chains and the three kinds of referring expression",
    "Explain why information extraction is broken without coreference",
    "Run a dependency-based relation extractor and diagnose each failure mode",
    "Describe distant supervision and the noise it introduces",
    "Judge when rules suffice and when a learned model is required"
  ],

  prerequisites: ["3.6", "3.1"],

  blocks: [

    { t: "h2", n: "01", text: "Coreference", id: "coref" },

    { t: "p", text: "Coreference resolution decides which expressions in a text refer to the same real-world entity. The output is a set of chains, each grouping the mentions of one entity." },

    { t: "out", text:
"\"Barack Obama was born in Hawaii. He served as the 44th president.\n  The former senator won the 2008 election.\"\n\nchain 0: [Barack Obama, He, The former senator]" },

    { t: "dl", items: [
      ["Proper nouns", "*Barack Obama*, *Google*. Found by NER — the easy case."],
      ["Pronouns", "*he*, *she*, *it*, *they*. Trivially detected, hard to resolve."],
      ["Nominal phrases", "*the company*, *the former senator*. Need noun-chunk detection, and resolving them requires knowing the description fits the entity."],
      ["Demonstratives", "*this*, *that method*. Often refer to events or whole propositions rather than entities, which is harder still."]
    ] },

    { t: "out", text:
"mention detection over that passage\n\nnamed entities : ['Barack Obama', 'Hawaii', '44th', '2008']\nnoun chunks    : ['Barack Obama', 'Hawaii', 'He', 'the 44th president',\n                  'The former senator', 'the 2008 election']\npronouns       : ['He']" },

    { t: "p", text: "The three members of the chain surface through three different mechanisms — NER found *Barack Obama*, the POS tagger found *He*, noun chunking found *The former senator*. Mention detection is the first half of the task and it is already a union of several detectors, each with its own errors. Linking them is the second half." },

    { t: "h2", n: "02", text: "Why extraction needs it", id: "why" },

    { t: "out", text:
"\"Apple released the iPhone. It costs $999.\"\n\nentities  : [('Apple', 'ORG'), ('999', 'MONEY')]\nrelations : [('It', 'cost', '$999')]" },

    { t: "callout", kind: "crit", title: "A triple with a pronoun in it is not a fact",
      body: [{ t: "p", text: "`('It', 'cost', '$999')` cannot go into a knowledge base. *It* is not an entity; it is a placeholder whose meaning lives in the previous sentence. Without coreference every pronoun subject produces a triple like this, and a pipeline that writes them into a graph accumulates thousands of assertions about a node called *It*. Worse, the entity the sentence is actually about — the iPhone — is not even in the entity list here, because spaCy's small model missed it. Coreference is not a refinement you add later; it determines whether the extraction output means anything." }] },

    { t: "h2", n: "03", text: "The ambiguity that grammar cannot resolve", id: "winograd" },

    { t: "out", text:
"The trophy doesn't fit in the suitcase because it is too big.     it = trophy\nThe trophy doesn't fit in the suitcase because it is too small.   it = suitcase" },

    { t: "callout", kind: "insight", title: "One adjective flips the referent",
      body: [{ t: "p", text: "The two sentences are syntactically identical — same parse, same entities, same pronoun position. Swapping *big* for *small* changes what *it* refers to, and nothing in the grammar records that. Resolving them requires knowing that a container must be larger than the thing it contains: world knowledge, not linguistic knowledge. This is the **Winograd schema**, designed specifically to be unsolvable by statistical cues over surface form. Large language models now score well above chance on these, which is genuinely notable, because it means the pretraining corpus encoded enough about physical containment for the pattern to be learned — not that the model reasoned about boxes." }] },

    { t: "h2", n: "04", text: "Running the reference's extractor", id: "extractor" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n37.py — dependency-based relation extraction", code:
"def extract_relations(text):\n    \"\"\"Extract (subject, relation, object) triples from the dependency parse.\"\"\"\n    doc = nlp(text)\n    relations = []\n    for token in doc:\n        if token.dep_ == \"ROOT\" and token.pos_ == \"VERB\":\n            subjects = [c for c in token.children\n                        if c.dep_ in (\"nsubj\", \"nsubjpass\")]\n            objects  = [c for c in token.children\n                        if c.dep_ in (\"dobj\", \"attr\", \"pobj\")]\n            for subj in subjects:\n                subj_span = doc[subj.left_edge.i:subj.right_edge.i + 1]\n                for obj in objects:\n                    obj_span = doc[obj.left_edge.i:obj.right_edge.i + 1]\n                    relations.append((subj_span.text, token.lemma_,\n                                      obj_span.text))\n    return relations",
      caption: "The reference's function, unmodified. It finds the root verb, takes its subject and object children, and expands each to its full subtree." },

    { t: "out", text:
"Google acquired YouTube in 2006.               [('Google', 'acquire', 'YouTube')]                  ok\nElon Musk founded SpaceX in 2002.              [('Elon Musk', 'found', 'SpaceX')]                  ok\nApple is headquartered in Cupertino.           []                                                  MISS\nYouTube was acquired by Google.                []                                                  MISS\nGoogle acquired YouTube and DoubleClick.       [('Google','acquire','YouTube and DoubleClick')]    MERGED\nGoogle, the search giant, acquired YouTube.    [('Google, the search giant,','acquire','YouTube')] NOISY\nGoogle did not acquire Yahoo.                  [('Google', 'acquire', 'Yahoo')]                    WRONG\nGoogle acquired YouTube, and Microsoft         [('Google', 'acquire', 'YouTube')]                  PARTIAL\n  acquired GitHub." },

    { t: "h2", n: "05", text: "Five failures, five lessons", id: "failures" },

    { t: "p", text: "**Passive voice returns nothing.** The parse explains why:" },

    { t: "out", text:
"\"YouTube was acquired by Google.\"\n\n  YouTube    PROPN   nsubjpass   head=acquired\n  was        AUX     auxpass     head=acquired\n  acquired   VERB    ROOT        head=acquired\n  by         ADP     agent       head=acquired\n  Google     PROPN   pobj        head=by      <- not a child of the verb" },

    { t: "p", text: "*Google* hangs off the preposition *by*, not off the verb, so it is never considered. The extractor sees a passive subject and no object and emits nothing. Handling this means special-casing `nsubjpass` and walking through the `agent` edge to invert the roles — which is the moment a rule-based extractor starts growing a rule per construction." },

    { t: "dl", items: [
      ["Copular: *Apple is headquartered in Cupertino*", "Returns nothing. The root is `is`, tagged `AUX` not `VERB`, so the `pos_ == \"VERB\"` guard rejects it before anything else runs."],
      ["Coordination: *acquired YouTube and DoubleClick*", "Returns one triple with the object `\"YouTube and DoubleClick\"`. The subtree expansion swallows the conjunct, so two facts become one malformed one."],
      ["Apposition: *Google, the search giant, acquired…*", "Subject comes back as `\"Google, the search giant,\"` — correct span, useless key. Nothing will match that against a `Google` node in a graph."],
      ["Second clause: *…, and Microsoft acquired GitHub*", "Only one token per sentence is `ROOT`; the second verb is `conj`, so its entire relation is silently dropped."],
      ["Negation: *Google did not acquire Yahoo*", "Emits the relation. `not` is present as `dep_=\"neg\"` and never inspected."]
    ] },

    { t: "callout", kind: "crit", title: "Four of the five failures are silent",
      body: [{ t: "p", text: "Two returned empty lists, two returned malformed strings, and one returned a **false assertion**. None raised an error. In a pipeline writing to a knowledge graph, the empty results reduce recall in a way you might eventually notice, but the negation case actively inserts a falsehood — and a knowledge base that confidently contains the opposite of what its source documents say is worse than one with gaps. If you ship rule-based extraction, negation detection is not an enhancement; it is the minimum bar." }] },

    { t: "h2", n: "06", text: "Learned extraction", id: "learned" },

    { t: "p", text: "The alternative is to treat relation extraction as classification over entity pairs: given a sentence and two marked entities, predict the relation type or `no_relation`. A transformer handles passive voice, coordination and negation because it learned them from data rather than from a rule you had to anticipate." },

    { t: "code", lang: "python", title: "REBEL: generate the triples directly", code:
"from transformers import pipeline\n\ntriplet_extractor = pipeline(\"text2text-generation\",\n                             model=\"Babelscape/rebel-large\")\n\ntext = (\"Elon Musk is the CEO of Tesla, \"\n        \"which is headquartered in Austin, Texas.\")\nresult = triplet_extractor(text, max_length=256)\n# (Elon Musk, CEO of, Tesla), (Tesla, headquartered in, Austin)",
      caption: "REBEL frames extraction as sequence generation — the model writes the triples as text. It handles multiple clauses natively, which the rule-based version cannot." },

    { t: "diagram", kind: "compare", title: "Rules against a learned model",
      columns: [
        { title: "Dependency rules", tone: "warn", items: [
          "3 of 8 sentences correct",
          "One rule per construction, forever",
          "Fails silently on the unanticipated",
          "Fully interpretable when it works",
          "No training data needed",
          "Good for narrow, fixed templates"
        ] },
        { title: "Learned extractor", tone: "good", items: [
          "Handles passive, coordination, negation",
          "Generalises to unseen phrasings",
          "Fails with a confidence score attached",
          "Errors are hard to explain",
          "Needs labelled or distantly-supervised data",
          "Good for open or evolving schemas"
        ] }
      ] },

    { t: "h2", n: "07", text: "Distant supervision", id: "distant" },

    { t: "p", text: "Labelled relation data is expensive, so the standard trick is distant supervision: take an existing knowledge base, find sentences mentioning both entities of a known triple, and label those sentences with that relation. Millions of training examples for free." },

    { t: "diagram", kind: "steps", title: "Distant supervision, and where the noise enters",
      items: [
        { title: "1. Start from a knowledge base", text: "Wikidata holds (Elon Musk, founded, SpaceX). You trust the triple, not any particular sentence." },
        { title: "2. Find co-occurring sentences", text: "Search a corpus for sentences containing both Elon Musk and SpaceX. You now have candidate training examples." },
        { title: "3. Assume the relation is expressed", text: "This is the leap. Label every such sentence as expressing 'founded' — which is where the label noise comes from." },
        { title: "4. Train, then denoise", text: "Multi-instance learning treats the sentence bag as the unit, or attention over the bag learns which sentences actually carry the relation." }
      ] },

    { t: "callout", kind: "trap", title: "The assumption is false, and knowably so",
      body: [{ t: "p", text: "*Elon Musk stepped down from the SpaceX board* mentions both entities and expresses no founding relation at all — yet distant supervision labels it `founded`. So does *Elon Musk was asked about SpaceX in an interview*. The rate of such false positives is high, commonly cited around 30% depending on the relation and corpus, and it is worst for exactly the relations you most want, because prominent entity pairs co-occur constantly for unrelated reasons. The standard mitigations — multi-instance learning, or attention over the bag of sentences — treat the *set* of sentences for an entity pair as the labelled unit and let the model decide which members actually support the relation. Distant supervision is still the right call when annotation is infeasible; it just means your training labels are a noisy signal, and your evaluation set must not be built the same way." }] },

    { t: "h2", n: "08", text: "The knowledge-graph pipeline", id: "pipeline" },

    { t: "diagram", kind: "flow", title: "From documents to a graph", cols: 3,
      nodes: [
        { id: "t", text: "Raw text", tone: "accent" },
        { id: "n", text: "NER: find entity mentions", tone: "accent" },
        { id: "c", text: "Coreference: link mentions in a document", tone: "violet" },
        { id: "r", text: "Relation extraction over entity pairs", tone: "violet" },
        { id: "l", text: "Entity linking to canonical ids", tone: "teal" },
        { id: "g", text: "Deduplicate and write triples", tone: "good" }
      ],
      edges: [["t","n"],["n","c"],["c","r"],["r","l"],["l","g"]] },

    { t: "callout", kind: "warn", title: "Errors compound multiplicatively",
      body: [{ t: "p", text: "Five stages, each imperfect. At a generous 90% per stage the end-to-end accuracy is 0.9⁵ ≈ **59%**, and real coreference and relation extraction are well below 90%. This is why production knowledge-graph pipelines lean so hard on confidence thresholds and human review for anything consequential, and why the entity-linking step matters more than it looks — *Google, the search giant,* and *Google* and *Alphabet's search unit* must all resolve to one node or the graph fragments into near-duplicates that no query will join." }] },

    { t: "exercise", title: "Map the failure surface",
      tasks: [
        "Run the extractor on twenty sentences from your own domain and classify every failure by type. Rank the types by frequency.",
        "Add passive-voice handling by walking the `agent` edge, then find a new sentence it still fails on.",
        "Add negation detection using `dep_ == \"neg\"` and check the subtree, not just the root verb's children.",
        "Build a distant-supervision set from Wikidata for one relation, then hand-label 100 sentences and measure the false-positive rate.",
        "Estimate your pipeline's end-to-end accuracy by measuring each stage separately and multiplying. Compare it with end-to-end measurement."
      ] }
  ],

  takeaways: [
    "The reference's extractor got 3 of 8 sentences right, and four of the five failures were silent.",
    "'Google did not acquire Yahoo' produced ('Google','acquire','Yahoo') — a false assertion, because `dep_=\"neg\"` is never inspected.",
    "Passive voice returned nothing: the agent hangs off the `by` preposition, not off the root verb.",
    "'Apple is headquartered in Cupertino' returned nothing because the root is `AUX`, not `VERB`.",
    "Coordination merged two facts into one object string; apposition produced 'Google, the search giant,' as an entity key.",
    "Only one token per sentence is ROOT, so every relation in a second coordinate clause is dropped.",
    "Without coreference, extraction yields triples like ('It','cost','$999') that cannot enter a knowledge base.",
    "Winograd pairs differ by one adjective and flip the referent — resolving them needs world knowledge, not grammar.",
    "Distant supervision buys millions of labels and introduces roughly 30% false positives, because co-occurrence is not expression."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did the extractor return a relation for 'Google did not acquire Yahoo'?",
      options: ["The parser failed", "It only inspects the root verb's subject and object children and never checks for a `neg` dependency", "'not' was tokenised incorrectly", "The lemma was wrong"],
      answer: 1,
      why: "spaCy parses 'not' correctly as `dep_=\"neg\"` — the information is present and simply unread. The rule matches a subject and an object and emits the triple. That makes it the most dangerous of the five failures: an empty result reduces recall, but this one writes a falsehood into the knowledge base." },
    { stem: "Why did the passive sentence 'YouTube was acquired by Google' return nothing?",
      options: ["'acquired' was not recognised as a verb", "'Google' is a `pobj` under the preposition 'by', so it is not among the root verb's object children", "The sentence was too short", "Passive voice is not parsed"],
      answer: 1,
      why: "The parse is correct: YouTube is `nsubjpass`, and Google attaches to the `agent` preposition 'by' rather than directly to the verb. The extractor only looks at the verb's immediate children for `dobj`, `attr` or `pobj`, finds no object, and emits nothing. Fixing it means walking the agent edge and inverting subject and object." },
    { stem: "Why can't the output ('It', 'cost', '$999') be written to a knowledge graph?",
      options: ["The price format is wrong", "'It' is a pronoun, not an entity — its referent lives in a previous sentence and must be resolved first", "The relation name is wrong", "It can be, after deduplication"],
      answer: 1,
      why: "The triple names no entity. Every pronoun subject produces one of these, so a pipeline without coreference accumulates thousands of assertions about a node called 'It'. Coreference has to run between entity recognition and relation extraction for the output to be meaningful at all." },
    { stem: "What is the core weakness of distant supervision?",
      options: ["It is too slow", "It assumes any sentence mentioning both entities expresses the relation, which is often false", "It needs a labelled corpus", "It only works for one relation type"],
      answer: 1,
      why: "'Elon Musk stepped down from the SpaceX board' mentions both entities and gets labelled 'founded'. False-positive rates around 30% are commonly reported, and they are worst for prominent entity pairs that co-occur constantly for unrelated reasons. Multi-instance learning over the sentence bag is the standard mitigation, and the evaluation set must be built differently from the training set." }
  ] },

  interview: { title: "Interview", sub: "Extraction pipelines", questions: [
    { level: "Core", q: "What is coreference resolution and why does information extraction need it?",
      strong: "It links mentions of the same entity; without it, extracted triples contain pronouns and are unusable.",
      answer: [{ t: "p", text: "It's deciding which expressions in a text refer to the same real-world entity, producing chains — 'Barack Obama', 'He' and 'The former senator' all being one chain. Extraction needs it because relations are extracted per sentence while entities are introduced across sentences. I ran 'Apple released the iPhone. It costs $999' through a relation extractor and got `('It', 'cost', '$999')`. That can't go into a knowledge base: 'It' isn't an entity, it's a placeholder whose meaning is in the previous sentence. Any pipeline without coreference accumulates thousands of assertions about a node called 'It'. What makes it hard is that mention detection alone is already a union of several detectors — NER finds the proper nouns, the tagger finds pronouns, noun chunking finds nominal descriptions like 'the former senator' — and then linking them can require world knowledge. The Winograd schema is the clean illustration: 'the trophy doesn't fit in the suitcase because it is too big' versus 'too small' are syntactically identical, and one adjective flips what 'it' refers to. Nothing in the grammar distinguishes them." }] },
    { level: "Senior", q: "When would you use rule-based relation extraction rather than a learned model?",
      strong: "Narrow fixed templates with no training data; but know the failure surface, because it is large and mostly silent.",
      answer: [{ t: "p", text: "When the domain is narrow, the phrasings are templated, there's no labelled data, and interpretability is a requirement — regulatory text, structured reports, log messages. Rules are debuggable in a way a transformer isn't, and you can ship them in an afternoon. But I'd go in knowing the failure surface, because I've measured it: the standard dependency-based extractor got three of eight sentences right. Passive voice returned nothing, because the agent hangs off the 'by' preposition rather than the verb. A copular sentence returned nothing, because the root was tagged AUX rather than VERB. Coordination merged two facts into one malformed object. Apposition produced 'Google, the search giant,' as an entity key that will never match a graph node. A second coordinate clause was dropped entirely, since only one token per sentence is ROOT. And negation produced a triple asserting the opposite of the sentence. Four of those five were silent. So the rule I'd apply is: rules are fine when you can enumerate the constructions and you write a test per construction, and they stop being fine the moment the input is open-domain prose, because then you're adding a rule per phrasing forever and you don't find out what you missed. And regardless of approach, negation handling is a minimum bar, not an enhancement — a knowledge base containing the opposite of its sources is worse than one with gaps." }] },
    { level: "Senior", q: "You are building a knowledge graph from documents. What is your biggest risk?",
      strong: "Compounding error across stages, and entity linking fragmenting the graph.",
      answer: [{ t: "p", text: "Two things, and the first is arithmetic. The pipeline is NER, then coreference, then relation extraction, then entity linking, then deduplication — five stages, each imperfect, and the errors multiply. At a generous 90% per stage you're at 0.9 to the fifth, about 59% end to end, and real coreference and relation extraction are well below 90%. So I'd measure each stage separately rather than only end to end, because the aggregate number tells you that something is wrong and never which thing. The second risk is entity linking, which is consistently underestimated. 'Google', 'Google, the search giant,' and 'Alphabet's search unit' have to resolve to one canonical node. If they don't, the graph silently fragments into near-duplicates and queries return partial answers that look complete — which is the worst failure mode, because nothing signals it. I'd invest in linking against a canonical id space early rather than treating it as post-processing. Practically, that means confidence thresholds on every stage with low-confidence triples going to review rather than into the graph, provenance stored on every triple so any assertion can be traced back to its source sentence, and a held-out set of hand-built triples to measure against — not one built by the same distant-supervision process that produced the training data, or you're measuring your own assumptions." }] }
  ] }
});
