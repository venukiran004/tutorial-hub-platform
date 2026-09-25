/* ============================================================================
   LESSON 1.8 — POS Tagging and Dependency Parsing
   Mirrors 01_NLP_Notes.md · §8. Every reference example is run through spaCy
   3.8 and reproduces exactly, including the SVO triple and the noun chunks
   (scratchpad/nlp/n18.py).
   ========================================================================= */
EC.receiveLesson({
  id: "1.8",

  lede: "**Bag of words cannot tell `the cat chased the mouse` from `the mouse chased the cat` — the token multisets are identical.** A dependency parse can, because it records which word is the subject of which verb. This lesson runs the reference's examples through spaCy, verifies each one, and measures a subject-verb agreement spanning twelve tokens that no bigram model could ever see.",

  objectives: [
    "Read a POS tag and explain why tagging requires context",
    "Interpret a dependency parse and extract subject-verb-object triples",
    "State what a parse gives you that a bag of words cannot",
    "Use noun chunks for phrase extraction",
    "Judge when syntactic analysis is worth the cost"
  ],

  prerequisites: ["1.7"],

  blocks: [

    { t: "h2", n: "01", text: "Part-of-speech tags", id: "pos" },

    { t: "out", text: `  token      pos    tag   explanation
  The        DET    DT    determiner
  quick      ADJ    JJ    adjective
  brown      ADJ    JJ    adjective
  fox        NOUN   NN    noun, singular or mass
  jumps      VERB   VBZ   verb, 3rd person singular present
  over       ADP    IN    conjunction, subordinating or preposition
  the        DET    DT    determiner
  lazy       ADJ    JJ    adjective
  dog        NOUN   NN    noun, singular or mass` },

    { t: "p", text: "Two tag sets, and spaCy exposes both. `pos_` is the **universal** set of 17 coarse tags — `ADJ, ADP, ADV, AUX, CCONJ, DET, INTJ, NOUN, NUM, PART, PRON, PROPN, PUNCT, SCONJ, SYM, VERB, X` — designed to be comparable across languages. `tag_` is the finer language-specific set, Penn Treebank for English, which distinguishes `VBZ` from `VBD` from `VBG` and so carries tense and number." },

    { t: "out", text: `  'I book a flight'      'book' -> VERB (VBP)
  'I read the book'      'book' -> NOUN (NN)
  'They will play'       'play' -> VERB (VB)
  'It was a play'        'play' -> NOUN (NN)
  'The duck can fly'     'duck' -> NOUN (NN)
  'I duck under it'      'duck' -> VERB (VBP)` },

    { t: "callout", kind: "insight", title: "The tag is a property of the sentence, not the word",
      body: [{ t: "p", text: "`book`, `play` and `duck` each take two different tags depending only on what surrounds them. That is why POS tagging is a model and not a dictionary lookup — a large fraction of English word types are ambiguous, and the frequent ones are the worst. It is also why the classical pipeline put tagging early: lemmatisation needs the tag (lesson 1.2 measured `lemmatize(\"better\")` returning `better` rather than `good` without it), and so do many downstream rules." }] },

    { t: "h2", n: "02", text: "Dependency parsing", id: "dependency" },

    { t: "out", text: `  token      dep          head
  The        --det       --> cat
  cat        --nsubj     --> chased
  chased     --ROOT      --> chased
  the        --det       --> mouse
  mouse      --dobj      --> chased
  across     --prep      --> chased
  the        --det       --> garden
  garden     --pobj      --> across` },

    { t: "diagram", kind: "tree", title: "The same parse as a tree",
      caption: "Every word has exactly one head. The root points at itself, which is how you find it.",
      root: { label: "chased · ROOT", children: [
        { label: "cat · nsubj", tone: "good", children: [{ label: "The · det" }] },
        { label: "mouse · dobj", tone: "accent", children: [{ label: "the · det" }] },
        { label: "across · prep", tone: "violet", children: [
          { label: "garden · pobj", children: [{ label: "the · det" }] }
        ] }
      ] } },

    { t: "p", text: "A dependency parse is a tree over the words themselves — no phrase nodes, just labelled arcs from head to dependent. `nsubj` and `dobj` are the two that carry most of the meaning: who did it, and to what. Every token has exactly one head, and the root is the token whose head is itself." },

    { t: "code", lang: "python", title: "Extracting subject-verb-object",
      code: `def extract_svo(doc):
    triples = []
    for token in doc:
        if token.dep_ == "ROOT":
            subject = [c for c in token.children if c.dep_ in ("nsubj", "nsubjpass")]
            obj     = [c for c in token.children if c.dep_ in ("dobj", "attr", "prep")]
            if subject:
                triples.append((subject[0].text, token.text,
                                obj[0].text if obj else None))
    return triples`,
      caption: "`nsubjpass` catches the passive voice, where the grammatical subject is the semantic object — *the mouse was chased* has `mouse` as `nsubjpass`." },

    { t: "out", text: `  SVO triples: [('cat', 'chased', 'mouse')]
  reference says: [('cat', 'chased', 'mouse')]` },

    { t: "h2", n: "03", text: "What a parse buys", id: "why" },

    { t: "out", text: `  'The cat chased the mouse'   -> SVO [('cat', 'chased', 'mouse')]
  'The mouse chased the cat'   -> SVO [('mouse', 'chased', 'cat')]
  as a BAG OF WORDS these two are IDENTICAL:
    ['cat', 'chased', 'mouse', 'the', 'the']
    ['cat', 'chased', 'mouse', 'the', 'the']` },

    { t: "callout", kind: "insight", title: "The multisets are the same; the meanings are opposite",
      body: [{ t: "p", text: "This is the cleanest demonstration of what bag of words discards. The two sentences share every token with identical counts, so BoW, TF-IDF and any model built on them produce **exactly the same vector** — there is no possible classifier that separates them. The parse distinguishes them immediately, because `cat` is `nsubj` in one and `dobj` in the other. That is why bigrams were introduced in lesson 1.4 as a partial fix, and why attention, which relates every position to every other, was such a large step." }] },

    { t: "out", text: `  subject 'engineers' -> verb 'promoted', 12 tokens apart` },

    { t: "p", text: "In *\"The engineers who joined the company last year from several different teams were promoted\"*, the subject and its verb are **twelve tokens apart**. The agreement — *engineers … were*, not *was* — spans that whole distance. A bigram model sees only `(teams, were)` and has no way to know. This is the concrete form of the long-range dependency problem that module 4's attention mechanism exists to solve." },

    { t: "h2", n: "04", text: "Noun chunks", id: "chunks" },

    { t: "out", text: `  Machine learning engineers               root=engineers       dep=nsubj
  Google                                   root=Google          dep=pobj
  large-scale recommendation systems       root=systems         dep=dobj` },

    { t: "p", text: "A noun chunk is a noun plus the words describing it, extracted directly from the parse. It is the cheapest useful phrase extractor available: *machine learning engineers* comes out as one unit rather than three tokens, with its head and its grammatical role attached. For key-phrase extraction, building a knowledge graph, or turning prose into structured triples, this is usually where you start." },

    { t: "h2", n: "05", text: "Is it worth it?", id: "worth" },

    { t: "diagram", kind: "compare", title: "When syntax earns its cost",
      caption: "Parsing is fast but not free, and a transformer often reaches the same place without it.",
      columns: [
        { title: "Worth parsing", tone: "good", items: [
          "Extracting structured relations — who did what to whom",
          "Rule systems that need grammatical roles",
          "Key-phrase and noun-phrase extraction",
          "Low-data settings where a model cannot learn syntax itself",
          "Anywhere the output must be auditable"
        ] },
        { title: "Skip it", tone: "warn", items: [
          "Text classification — a fine-tuned transformer learns what it needs",
          "Very short or very noisy text, where parsers are unreliable",
          "Anything at web scale where the per-document cost matters",
          "Languages without a good parser available"
        ] }
      ] },

    { t: "callout", kind: "note", title: "Transformers learn syntax without being taught it",
      body: [{ t: "p", text: "Probing studies consistently find that attention heads in BERT-like models align with dependency relations that nobody supervised — some heads attend from a verb to its subject, others from a determiner to its noun. So for a task where a transformer is already in the pipeline, explicit parsing is often redundant: the model has its own, and it is generally more robust on informal text than a treebank-trained parser. Parsing remains valuable when you need the structure as an **output** rather than as an internal representation, which is exactly the relation-extraction and knowledge-graph case." }] },

    { t: "exercise", kind: "practice", title: "Extract structure from real text", difficulty: "core", minutes: 35,
      prompt: "Run a parser over a few hundred sentences from a real source and extract subject-verb-object triples. Measure what fraction of sentences yield a triple, and inspect the failures — passives, coordinated subjects, copulas and relative clauses each break the naive extractor differently. Extend it to handle the passive via `nsubjpass`, and to follow conjunctions so *the cat and the dog chased the mouse* yields two triples. Finally, measure the distance between each subject and its verb, and plot the distribution.",
      hints: [
        "`token.children` and `token.head` are the two navigation primitives.",
        "Copulas — *the cat is black* — have no `dobj`; the complement is `attr` or `acomp`.",
        "The subject-verb distance distribution has a long tail, and that tail is the point."
      ],
      solution: {
        notes: [
          { t: "p", text: "The distance distribution is the result worth keeping. Most subject-verb pairs are adjacent or nearly so, which is why bigram and trigram models worked at all, but the tail runs long — I measured one ordinary sentence with a gap of twelve tokens. That tail is small in frequency and large in importance, because the sentences with embedded clauses are usually the ones carrying the complex information you wanted to extract." },
          { t: "p", text: "The naive extractor's failures are instructive in a specific way: each one corresponds to a genuine grammatical construction rather than to noise. Passives invert the roles, coordination gives several subjects for one verb, copulas have no direct object at all, and relative clauses embed a second verb with its own arguments. Handling them turns a twenty-line function into something much larger, which is the honest reason rule-based relation extraction is harder than it looks." },
          { t: "p", text: "Worth also running the parser over informal text — social media, chat logs, transcripts — and seeing the quality drop. Treebank-trained parsers assume edited prose, and their accuracy falls sharply without it. That degradation is one of the strongest practical arguments for letting a transformer learn its own syntax rather than depending on an explicit parse." }
        ]
      } }

  ],

  takeaways: [
    "spaCy exposes both the 17 universal POS tags (`pos_`) and the finer Penn Treebank set (`tag_`).",
    "The tag depends on the sentence: `book`, `play` and `duck` each take two tags depending on context.",
    "A dependency parse is a tree over words — every token has one head, and the root is its own head.",
    "`nsubj` and `dobj` carry most of the meaning; `nsubjpass` catches the passive.",
    "The SVO extraction reproduces the reference exactly: `[('cat', 'chased', 'mouse')]`.",
    "*Cat chased mouse* and *mouse chased cat* have identical bags of words and opposite meanings.",
    "A measured sentence had its subject twelve tokens from its verb — invisible to a bigram model.",
    "Noun chunks give phrase extraction directly from the parse, with head and role attached.",
    "Transformers learn syntax without supervision, so parse when you need structure as output, not as features."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why can't POS tagging be a dictionary lookup?",
      options: ["Dictionaries are too large", "Many words take different tags depending on context — `book` is a verb or a noun", "Tags change over time", "Dictionaries lack rare words"],
      answer: 1,
      why: "`I book a flight` and `I read the book` give `book` different tags, and the same holds for `play` and `duck`. The tag is a property of the sentence, not the word type, and ambiguity is concentrated in the most frequent words — which is why it requires a model." },
    { stem: "What does a dependency parse capture that bag of words cannot?",
      options: ["Word frequency", "Which word is the subject and which the object", "Document length", "Vocabulary size"],
      answer: 1,
      why: "`The cat chased the mouse` and `The mouse chased the cat` have identical token multisets, so BoW and TF-IDF produce exactly the same vector and no classifier over them can separate the two. The parse marks `cat` as `nsubj` in one and `dobj` in the other." },
    { stem: "In a dependency parse, how do you identify the root?",
      options: ["It is the first token", "Its head is itself", "It has no children", "It is the longest word"],
      answer: 1,
      why: "The root is the token whose head points back at itself, which is the convention that lets the parse be stored as a flat head-index array. It is usually the main verb, and it is the entry point for walking the tree — the SVO extractor starts there and reads its children." },
    { stem: "When is explicit parsing most likely to be redundant?",
      options: ["Relation extraction", "Text classification with a fine-tuned transformer", "Knowledge-graph construction", "Rule-based extraction"],
      answer: 1,
      why: "Probing studies find attention heads aligning with dependency relations that nobody supervised, so a transformer already has an internal syntax and is more robust on informal text than a treebank-trained parser. Parsing stays valuable when the structure is the *output* — relations, triples, key phrases — rather than an internal feature." }
  ] },

  interview: { title: "Interview", sub: "Syntax", questions: [
    { level: "Core", q: "What is dependency parsing and what would you use it for?",
      strong: "A tree of labelled head-dependent arcs over words; used when you need grammatical structure as output.",
      answer: [{ t: "p", text: "It produces a tree over the words themselves, where each token has exactly one head and the arc carries a label — `nsubj` for subject, `dobj` for direct object, `det` for determiner, and so on. The root is the token whose head is itself, usually the main verb. The reason to use it is that it captures who did what to whom, which a bag of words structurally cannot: `the cat chased the mouse` and `the mouse chased the cat` have identical token counts and opposite meanings, and only the parse distinguishes them. In practice I would reach for it when I need the structure as an output — extracting subject-verb-object triples for a knowledge graph, pulling noun phrases as key phrases, or driving a rule system that needs grammatical roles. For classification I would not bother, because a fine-tuned transformer learns whatever syntax it needs and is more robust on informal text than a parser trained on edited prose." }] },
    { level: "Senior", q: "Do transformers make POS tagging and parsing obsolete?",
      strong: "As features, largely yes; as outputs, no — and the distinction is what matters.",
      answer: [{ t: "p", text: "As input features, largely. Probing work consistently finds attention heads in BERT-like models aligning with dependency relations nobody supervised — heads that attend from a verb to its subject, or a determiner to its noun — so the model builds its own syntactic representation and feeding it an explicit parse adds little. It is also more robust: a treebank-trained parser degrades sharply on social media or transcripts, where a transformer trained on varied text holds up better. Where they are not obsolete is when the structure is the deliverable. If I need subject-verb-object triples for a knowledge graph, or noun phrases as candidate key terms, or an auditable rule that fires on a grammatical role, I need an explicit parse — a transformer's implicit syntax is not something I can read off and act on. The same applies in low-data settings, where a model has no chance to learn syntax from scratch and a parser trained on a treebank brings knowledge the task's own data cannot supply." }] },
    { level: "Senior", q: "Why is long-range agreement a problem for classical models?",
      strong: "Because n-gram models have a fixed window, and the dependency can be many tokens wide.",
      answer: [{ t: "p", text: "Grammatical agreement holds between words that can be arbitrarily far apart. I measured an ordinary sentence — engineers who joined the company last year from several different teams were promoted — where the subject and its verb sit twelve tokens apart, with the number agreement spanning that whole distance. A bigram model sees only the immediately preceding word, which here is `teams`, and would happily predict `was`. A trigram model does no better, and going further is blocked by sparsity, since the n-gram space grows as the vocabulary to the power n while the data does not. The deeper problem is that a count-based model cannot represent the *relationship* at all, only co-occurrence. Recurrent models addressed this by carrying a state forward, which works until the gradient vanishes, and attention addressed it properly by giving every position a direct connection to every other regardless of distance. That specific sentence is a good thing to keep in mind when reading about why attention mattered." }] }
  ] }
});
