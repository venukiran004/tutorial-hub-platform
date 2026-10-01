EC.receiveLesson({
  id: "5.3",

  lede: "An embedding model turns text into a vector so that similar meanings land near each other. Choosing one looks like a leaderboard exercise \u2014 the reference lists OpenAI\u2019s models, BGE, Nomic and GTE with their dimensions \u2014 and on the shared corpus the leaderboard answer lost badly. **all-mpnet-base-v2**, the larger and generally better-ranked model, scored **35% recall@1** against all-MiniLM-L6-v2\u2019s **75%**, and took **9.4\u00d7 longer** to encode the corpus. Investigating why is more useful than the number: mpnet preferred short heading-like chunks that were topically right and did not contain the answer.",

  objectives: [
    "Say what a bi-encoder is trained to do and why that differs from a cross-encoder",
    "Compare embedding models on your own corpus rather than on a leaderboard",
    "Measure what dimensions cost and whether they buy anything",
    "Recognise when a model difference is a measurement artefact",
    "Choose a model from the retrieval task rather than from a benchmark rank"
  ],

  prerequisites: ["5.1"],

  blocks: [

    { t: "h2", n: "01", id: "what", text: "What the model is trained to do",
      sub: "One vector per text, compared by a dot product" },

    { t: "p", text: "A retrieval embedding model is a **bi-encoder**: it encodes the query and the document *separately*, into the same space, so that the dot product of the two vectors predicts relevance. That separation is what makes retrieval possible at all \u2014 the documents can be embedded once, offline, and a query compared against a million of them with one matrix multiply." },

    { t: "p", text: "The alternative is a **cross-encoder**, which takes the query and the document *together* and produces a relevance score. It is far more accurate, because the two texts can attend to each other, and it is useless for search: scoring a million documents means a million forward passes. 5.9 uses one as a second stage over a shortlist, which is the arrangement that makes both properties available." },

    { t: "callout", kind: "insight", title: "The bi-encoder's constraint is the whole reason RAG has failure modes",
      body: [
        { t: "p", text: "A chunk\u2019s vector is computed without knowing what question will be asked. It has to be a single summary that is close to *every* query the chunk could answer and far from every query it could not \u2014 384 numbers, decided in advance, covering all possible questions." },
        { t: "p", text: "That is why the module\u2019s running failure happens: \u201cWhy divide alpha by r?\u201d against a passage calling it a \u201cvolume knob\u201d. A cross-encoder reading both texts together would score that pair highly. A bi-encoder had to commit to the passage\u2019s vector before the question existed." },
        { t: "p", text: "So the limitations measured throughout this module are not bugs in a particular model \u2014 they follow from encoding independently, which is the property that makes search fast." }
      ] },

    { t: "h2", n: "02", id: "models", text: "Four models on the same corpus",
      sub: "The leaderboard answer came last" },

    { t: "code", lang: "python", title: "g53.py \u2014 identical corpus, identical questions", code: `for name in MODELS:
    enc = SentenceTransformer(name)
    E = enc.encode(chunks, normalize_embeddings=True, batch_size=128)
    QV = enc.encode([q for q, _, _ in QS], normalize_embeddings=True)
    RANK = np.argsort(-(QV @ E.T), axis=1)`,
      out: `  model                                dims   encode s      r@1      r@3      r@5   index MB
  all-MiniLM-L6-v2                      384       26.9      75%      90%      95%       1.82
  all-mpnet-base-v2                     768      251.8      35%      65%      65%       3.65
  paraphrase-MiniLM-L3-v2               384       23.8      70%      80%      80%       1.82
  bge-small-en-v1.5                     384      174.5      70%      80%      90%       1.82`,
      hl: [2, 3],
      caption: "The 768-dimension model is worst on this corpus and takes 9.4\u00d7 as long to build the index." },

    { t: "callout", kind: "warn", title: "Before believing that, I checked whether it was my measurement",
      body: [
        { t: "p", text: "A result that contradicts the general ranking is exactly the kind to be suspicious of, so I inspected mpnet\u2019s actual retrievals rather than accepting the summary \u2014 the habit 5.1 arrived at the hard way." },
        { t: "p", text: "It is not broken. Score ranges are sane (min \u22120.015, max 0.654, mean 0.152), the model loads correctly, and for *\u201cWhat is speculative decoding?\u201d* its top hit is the right section of the right document." },
        { t: "p", text: "What differs is rank 2 and below. MiniLM\u2019s second hit is the passage that actually explains the mechanism; mpnet\u2019s is about constrained decoding, and its third is about prefill. And its top-1 is a *heading* chunk \u2014 topically perfect, containing the words \u201c6. Speculative Decoding\u201d and not the explanation." },
        { t: "p", text: "So part of the gap is real retrieval quality on this corpus and part is my scorer, which requires a chunk to contain specific substrings. A heading chunk is a correct retrieval by any human judgement and a miss by my rule. I would not publish \u201cmpnet is worse\u201d as a general claim \u2014 what I can publish is that **the higher-ranked model was not better here**, which is the point." }
      ] },

    { t: "callout", kind: "insight", title: "What this means for choosing a model",
      body: [
        { t: "p", text: "Benchmark rankings are averages over benchmark corpora. Yours is not one of them \u2014 it has its own vocabulary, its own document structure, and its own question style. A model tuned to perform on retrieval benchmarks of web passages has no particular reason to excel on markdown technical documentation with code blocks in it." },
        { t: "p", text: "The cost asymmetry makes this easy to act on. Running four models over a 1,200-chunk corpus and scoring them against twenty questions took under ten minutes of compute and no engineering. Choosing from a leaderboard takes no time and can cost 40 recall points." },
        { t: "p", text: "The practical order: start with a small fast model, build the evaluation set, and only then try larger ones \u2014 with a measurement ready to tell you whether they helped." }
      ] },

    { t: "table",
      head: ["Model", "Dims", "Encode time", "r@5 here", "When to reach for it"],
      rows: [
        ["all-MiniLM-L6-v2", "384", "26.9 s", "**95%**", "The default. Fast, small, and best on this corpus"],
        ["bge-small-en-v1.5", "384", "174.5 s", "90%", "Strong general retriever; worth testing, 6.5\u00d7 the encode cost here"],
        ["paraphrase-MiniLM-L3-v2", "384", "23.8 s", "80%", "Fastest. Trained for paraphrase similarity rather than retrieval"],
        ["all-mpnet-base-v2", "768", "251.8 s", "65%", "Higher general ranking, and not on this corpus"]
      ] },

    { t: "h2", n: "03", id: "dims", text: "What dimensions cost",
      sub: "And how far you can cut before it hurts" },

    { t: "p", text: "Dimensions are the obvious cost dial: they set the index size, the memory, and the time of every comparison. The reference notes OpenAI\u2019s `text-embedding-3-large` at 3072 dimensions against `3-small` at 1536, which is a real doubling of storage for every vector you will ever hold." },

    { t: "code", lang: "python", title: "g53.py \u2014 truncating the vector, which is the naive thing to try", code: `for d in (384, 256, 128, 64, 32):
    Ed = E[:, :d]
    Ed = Ed / np.linalg.norm(Ed, axis=1, keepdims=True)     # renormalise after cutting`,
      out: `  dims kept         r@1      r@3      r@5     index MB
  384               75%      90%      95%         1.82
  256               75%      85%      95%         1.22
  128               75%      85%      90%         0.61
  64                60%      85%      85%         0.30
  32                40%      70%      70%         0.15`,
      hl: [3],
      caption: "Two thirds of the dimensions can be thrown away for five points of recall@5 and a third of the storage." },

    { t: "callout", kind: "tradeoff", title: "The degradation is gentle, then sudden",
      body: [
        { t: "p", text: "384 to 128 costs **five points at k=5** and saves **two thirds of the index**. Below that it falls apart: 64 dimensions loses 15 points at k=1, and 32 loses 35." },
        { t: "p", text: "That shape \u2014 a long flat region then a cliff \u2014 is what you would expect if the information is unevenly distributed across dimensions, with the early ones carrying most of it. Which is exactly the property that **Matryoshka** embedding models are trained to have deliberately: they are optimised so that truncating is safe, and the reference\u2019s `nomic-embed-text-v1.5` is one of them." },
        { t: "p", text: "My truncation is the naive version \u2014 cutting a model not trained for it \u2014 so these numbers are a floor rather than what a purpose-built model would give. The fact that it degrades gently anyway is a useful thing to know before paying for 3072 dimensions." },
        { t: "p", text: "The honest caveat: 20 questions means each is worth 5 points, so the 384-to-128 difference is one question. The cliff at 32\u201364 is several and is the part I would rely on." }
      ] },

    { t: "viz", title: "Dimensions against recall and storage", caption: "A long flat region and then a cliff. The flat part is where the storage saving is free.",
      svg: `<svg viewBox="0 0 760 266" width="100%" role="img" aria-label="Recall and index size against embedding dimensions">
  <text x="16" y="22" class="s-label">RECALL@5 BY DIMENSIONS KEPT</text>
  <text x="16" y="52" class="s-sub">384</text>
  <rect x="80" y="40" width="380" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="470" y="52" class="s-mono" style="fill:var(--good)">95%</text>
  <text x="530" y="52" class="s-sub">1.82 MB</text>

  <text x="16" y="80" class="s-sub">256</text>
  <rect x="80" y="68" width="380" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="470" y="80" class="s-mono" style="fill:var(--good)">95%</text>
  <text x="530" y="80" class="s-sub">1.22 MB</text>

  <text x="16" y="108" class="s-sub">128</text>
  <rect x="80" y="96" width="360" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="450" y="108" class="s-mono" style="fill:var(--good)">90%</text>
  <text x="530" y="108" class="s-sub">0.61 MB \u2014 a third of the storage</text>

  <text x="16" y="136" class="s-sub">64</text>
  <rect x="80" y="124" width="340" height="16" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="430" y="136" class="s-mono" style="fill:var(--warn)">85%</text>
  <text x="530" y="136" class="s-sub">0.30 MB</text>

  <text x="16" y="164" class="s-sub">32</text>
  <rect x="80" y="152" width="280" height="16" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="370" y="164" class="s-mono" style="fill:var(--crit)">70%</text>
  <text x="530" y="164" class="s-sub">0.15 MB</text>

  <line x1="16" y1="190" x2="744" y2="190" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="214" class="s-mono" style="fill:var(--accent)">flat from 384 to 128, then a cliff \u2014 the early dimensions carry most of the information</text>
  <text x="16" y="236" class="s-sub">Matryoshka models are trained so this is true by design; this is the naive truncation, so it is a floor</text>
  <text x="16" y="258" class="s-sub">caveat: at 20 questions each is worth 5 points, so trust the cliff and not the single-point differences</text>
</svg>` },

    { t: "h2", n: "04", id: "choosing", text: "Choosing one",
      sub: "Four properties, in the order they matter" },

    { t: "ol", items: [
      "**Recall on your corpus.** Measured, not inferred. The spread here was 65% to 95% at k=5 across four reasonable models \u2014 larger than any other single decision in this module except chunking.",
      "**Encode throughput**, because it sets how long a re-index takes. 26.9 s against 251.8 s on 1,200 chunks is the difference between re-indexing on every deploy and treating it as a batch job.",
      "**Dimensions**, which set storage and search cost. Worth caring about at millions of vectors and irrelevant at thousands \u2014 the whole index here is under 4 MB either way.",
      "**Sequence limit.** Most of these cap at 256 or 384 tokens, and text beyond that is silently truncated. If your chunks are larger than the limit, the tail is not being indexed at all \u2014 which 5.4's 2000-character result partly reflects."
    ] },

    { t: "callout", kind: "trap", title: "The truncation limit is the quiet one",
      body: [
        { t: "p", text: "`all-MiniLM-L6-v2` has `max_seq_length = 256` tokens, roughly 1,000 characters. A 2,000-character chunk is cut in half before it is ever embedded, and nothing warns you \u2014 the call succeeds and returns a vector." },
        { t: "p", text: "That is a second, independent reason large chunks performed badly in 5.4: not only does one vector have to represent several topics, but on a 256-token model it is representing only the first half of them." },
        { t: "p", text: "Check `enc.max_seq_length` against your chunk size in tokens, not characters. It is one line, and it catches a failure that is otherwise invisible." }
      ] },

    { t: "exercise", kind: "lab", title: "Compare embedding models on your own corpus", difficulty: "core", minutes: 30,
      body: "Run at least three embedding models over the same corpus and question set, holding chunking and k fixed. Report recall, encode time, dimensions and index size for each. Then truncate the best model's vectors to several smaller dimensions and find where recall falls off. For any model that performs surprisingly badly, inspect its actual retrievals before accepting the number.",
      requirements: [
        "Hold the chunking and the question set identical across all models",
        "Include at least one model with more dimensions than the others",
        "Report encode time as well as recall \u2014 it determines re-index cost",
        "Truncate and renormalise to 256, 128, 64 and 32 dimensions",
        "Check each model's max_seq_length against your chunk size in tokens"
      ],
      hint: "If a model scores far worse than expected, print its top three retrievals for one question before concluding anything. The answer is often that it retrieved something a human would call correct and your scorer would not.",
      solution: { lang: "python", title: "g53.py \u2014 models, dimensions, and the diagnostic", code: `for name in MODELS:
    enc = SentenceTransformer(name)
    E = enc.encode(chunks, normalize_embeddings=True, batch_size=128)
    QV = enc.encode([q for q, _, _ in QS], normalize_embeddings=True)
    RANK = np.argsort(-(QV @ E.T), axis=1)
    print(name, enc.max_seq_length, E.shape[1],
          {k: recall(RANK, k) for k in (1, 3, 5)})

# naive truncation of the winner
for d in (384, 256, 128, 64, 32):
    Ed = E[:, :d]; Ed /= np.linalg.norm(Ed, axis=1, keepdims=True)
    Qd = QV[:, :d]; Qd /= np.linalg.norm(Qd, axis=1, keepdims=True)
    print(d, recall(np.argsort(-(Qd @ Ed.T), axis=1), 5))

# the diagnostic for the surprising result
q = "What is speculative decoding?"
for name in ("all-MiniLM-L6-v2", "all-mpnet-base-v2"):
    enc = SentenceTransformer(name)
    E = enc.encode(sub, normalize_embeddings=True)
    s = (enc.encode([q], normalize_embeddings=True) @ E.T)[0]
    for r in np.argsort(-s)[:3]:
        print(name, round(float(s[r]), 4), repr(sub[r][:80]))`,
        out: `  model                                dims   encode s      r@1      r@3      r@5   index MB
  all-MiniLM-L6-v2                      384       26.9      75%      90%      95%       1.82
  all-mpnet-base-v2                     768      251.8      35%      65%      65%       3.65
  paraphrase-MiniLM-L3-v2               384       23.8      70%      80%      80%       1.82
  bge-small-en-v1.5                     384      174.5      70%      80%      90%       1.82

  dims kept         r@1      r@3      r@5     index MB
  384               75%      90%      95%         1.82
  256               75%      85%      95%         1.22
  128               75%      85%      90%         0.61
  64                60%      85%      85%         0.30
  32                40%      70%      70%         0.15

  DIAGNOSTIC -- "What is speculative decoding?"
  == all-MiniLM-L6-v2   max_seq_length=256
     0.6086  'for ongoing requests during new prefills [fence] --- 6. Speculative Decoding'
     0.6060  'O-aware algorithm that minimizes memory transfers.5. **What is speculative decod'
  == all-mpnet-base-v2  max_seq_length=384
     0.6541  'for ongoing requests during new prefills [fence] --- 6. Speculative Decoding'
     0.4839  'off-schema responses at the token-sampling level. How It Works  At each decoding'`,
        notes: [
          { t: "p", text: "**The highest-ranked model was the worst here, at 9.4\u00d7 the encode cost.** 65% against 95% at k=5. That is a larger spread than any decision in this module other than chunking, and it is not predictable from a leaderboard \u2014 which is the whole argument for spending ten minutes measuring it." },
          { t: "p", text: "**The diagnostic is what makes the result usable.** mpnet is not broken: sane score range, correct top-1. Its top hit is a *heading* chunk \u2014 \u20186. Speculative Decoding\u2019 \u2014 which is topically perfect and contains none of the explanation. MiniLM's second hit is the passage that actually explains the mechanism; mpnet's is about constrained decoding." },
          { t: "p", text: "**So part of the gap is my scorer**, which demands specific substrings and marks a heading chunk a miss where a human would call it a reasonable retrieval. The defensible claim is \u2018the higher-ranked model was not better on this corpus and question set\u2019 \u2014 not \u2018mpnet is worse\u2019." },
          { t: "p", text: "**Dimensions degrade gently then suddenly.** 384 to 128 costs five points at k=5 and saves two thirds of the index; 64 and 32 fall off a cliff. This is naive truncation of a model not trained for it, so it is a floor \u2014 Matryoshka models are trained to make exactly this safe." },
          { t: "p", text: "**Check max_seq_length.** MiniLM caps at 256 tokens, about 1,000 characters, so a 2,000-character chunk loses its second half silently. That is an independent reason 5.4's large chunks performed badly, and it is one line to check." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A bi-encoder has to summarise a passage into one vector before knowing what will be asked of it. Everything it does well and everything it fails at follows from that \u2014 speed, because the work is done in advance, and vocabulary blindness, because the summary was committed to too early." },
        { t: "p", text: "And which model summarises *your* documents best is a property of your documents. Ten minutes of measurement beats a leaderboard that was averaged over somebody else's corpus." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe are picking an embedding model. The top of the MTEB leaderboard is a 4096-dimension model. Should we use it?\u201d**" },
        { t: "p", text: "Probably not as a starting point, and the way to find out is cheap enough that there is no reason to argue about it. I ran four models over a real corpus with a twenty-question labelled set: the top-ranked general model scored 65% recall@5 where a small fast one scored 95%, at 9.4\u00d7 the encoding time. That took under ten minutes of compute." },
        { t: "p", text: "The reason benchmark rank travels badly is that it is an average over benchmark corpora, and yours has its own vocabulary, structure and question style. A model tuned on web passages has no particular reason to excel on technical documentation full of code blocks." },
        { t: "p", text: "The dimensions are a separate cost I would push back on independently. Truncating my best model from 384 to 128 dimensions cost five points of recall@5 and saved two thirds of the index. At 4096 dimensions you are paying for storage and comparison cost on every vector forever, and the question is whether anyone has measured what it buys on your data." },
        { t: "p", text: "What I would actually do: start with a small fast model, build the evaluation set \u2014 which is the real work and is needed regardless \u2014 and then try the expensive model with a measurement ready. If it wins, use it. The order matters because without the evaluation set the decision is permanently a matter of taste." },
        { t: "p", text: "One more check that costs a line: `max_seq_length` against the chunk size in tokens. Many of these cap at 256 or 384 tokens and silently truncate beyond it, so a large chunk can be half-indexed with no error anywhere." }
      ] }
  ],

  takeaways: [
    "**A bi-encoder encodes query and document separately**, which is what makes search fast and is the source of every vocabulary-mismatch failure in this module.",
    "**A cross-encoder reads both together and is far more accurate**, and cannot be used for search \u2014 which is why 5.9 uses one over a shortlist instead.",
    "**The highest-ranked model was the worst here**: all-mpnet-base-v2 at 65% recall@5 against all-MiniLM-L6-v2 at 95%, for 9.4\u00d7 the encode time.",
    "**I checked that before publishing it.** mpnet is not broken \u2014 its top hit was a heading chunk, topically right and containing none of the explanation.",
    "**So part of that gap is my scorer**, and the defensible claim is \u201cthe higher-ranked model was not better on this corpus\u201d rather than \u201cmpnet is worse\u201d.",
    "**Benchmark rank is an average over somebody else's corpora.** Measuring four models on your own took under ten minutes and the spread was 30 points.",
    "**Dimensions degrade gently, then suddenly**: 384 to 128 cost five points at k=5 and two thirds of the storage; 64 and 32 fell off a cliff.",
    "**That shape is what Matryoshka models make deliberate** \u2014 this was naive truncation of a model not trained for it, so it is a floor rather than a ceiling.",
    "**Check `max_seq_length` against your chunk size in tokens.** MiniLM caps at 256 tokens, so a 2,000-character chunk loses its second half with no error.",
    "**Order the properties: recall on your corpus, encode throughput, dimensions, sequence limit** \u2014 and only the first two usually decide anything."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why can a cross-encoder not be used as the primary retriever?",
        options: [
          "It produces vectors of a different dimension than the index expects",
          "It scores a query-document pair jointly, so ranking a million documents needs a million forward passes",
          "It cannot be fine-tuned on domain data",
          "Its scores are not comparable across queries"
        ],
        answer: 1,
        why: "A bi-encoder embeds documents once offline and compares a query to all of them with a single matrix multiply. A cross-encoder must see the query and document together to produce a score, so there is nothing to precompute and the cost is linear in corpus size per query. That joint attention is exactly why it is more accurate, which is why 5.9 runs one over a shortlist of twenty rather than over the index." },

      { stem: "A 768-dimension model ranked higher on public benchmarks scores 65% recall@5 on your corpus where a 384-dimension model scores 95%. What is the right conclusion?",
        options: [
          "The larger model is misconfigured and should be debugged",
          "Benchmark rank is an average over other corpora \u2014 measure on yours, and inspect the actual retrievals before trusting either number",
          "Larger embedding models are generally worse for retrieval",
          "The evaluation set is too small to compare models"
        ],
        answer: 1,
        why: "The diagnostic showed mpnet working correctly \u2014 sane scores, correct top-1 \u2014 but preferring heading chunks that are topically right and contain no explanation, which a strict substring scorer marks as misses. So part of the gap is real and part is the measurement, and the supportable claim is about this corpus rather than about the model in general. The lesson is that ten minutes of measurement beats a leaderboard averaged over somebody else's data; larger models are often better, just not reliably here." },

      { stem: "Truncating embeddings from 384 to 128 dimensions costs five points of recall@5 and saves two thirds of the index. What explains the shape of that curve?",
        options: [
          "Renormalisation after truncation recovers most of the lost information",
          "Information is unevenly distributed across dimensions, with the early ones carrying most of it",
          "Cosine similarity is invariant to the number of dimensions",
          "The index uses product quantization below 256 dimensions"
        ],
        answer: 1,
        why: "A long flat region followed by a cliff at 64 and 32 dimensions is what you see when the leading dimensions carry most of the signal. Matryoshka embedding models are trained to make that property hold deliberately so truncation is safe; this measurement used naive truncation of a model not trained for it, which makes the result a floor. Renormalising is necessary for the comparison to be meaningful but does not restore information, and cosine is certainly not dimension-invariant." },

      { stem: "Why should you check a model's `max_seq_length` before choosing a chunk size?",
        options: [
          "Because chunks longer than the limit raise an exception at encode time",
          "Because text beyond the limit is silently truncated, so the tail of a large chunk is never indexed",
          "Because the limit determines the output dimension",
          "Because longer sequences require a larger batch size"
        ],
        answer: 1,
        why: "MiniLM caps at 256 tokens, roughly 1,000 characters, and encoding a 2,000-character chunk succeeds and returns a vector representing only the first half. Nothing warns you. That is an independent reason large chunks underperformed in 5.4 \u2014 on top of one vector having to represent several topics, it was representing only some of them. Checking it is one line against the chunk size measured in tokens rather than characters." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where \u201cwe used the top of the leaderboard\u201d is not an answer",
    questions: [
      { level: "core",
        q: "How do you choose an embedding model?",
        strong: "A strong answer measures on the real corpus and knows what else to check.",
        answer: [
          { t: "p", text: "By measuring on my own corpus with a labelled question set, because benchmark rank is an average over other people's data. I ran four models over a real 360,000-character corpus and the spread at recall@5 was 65% to 95% \u2014 and the model that won was the small fast one, not the highest-ranked." },
          { t: "p", text: "That measurement took under ten minutes of compute and no engineering beyond the evaluation set, which is needed anyway. Choosing from a leaderboard takes no time and risks thirty recall points, so the asymmetry makes it an easy call." },
          { t: "p", text: "Alongside recall I would record encode throughput, because it determines what a re-index costs \u2014 26.9 seconds against 251.8 on the same corpus is the difference between re-indexing on every deploy and running it as a batch job. Dimensions matter for storage and comparison cost, though at thousands of vectors the whole index is a few megabytes either way." },
          { t: "p", text: "And I would check `max_seq_length` against the chunk size in tokens. Several of these cap at 256 tokens and silently truncate, so a large chunk can be half-indexed with nothing in the logs." }
        ] },

      { level: "advanced",
        q: "A model performs much worse than expected on your corpus. What do you do?",
        strong: "A strong answer inspects retrievals before accepting or rejecting the number.",
        answer: [
          { t: "p", text: "Look at what it actually retrieved before concluding anything \u2014 a result that contradicts the general ranking is precisely the kind that is usually a measurement problem." },
          { t: "p", text: "In my case the larger model scored 35% recall@1 against 75%, which is a big enough gap to be suspicious of. The diagnostic showed it working correctly: sane score range, and for the question I probed, a correct top-1. What it had retrieved was a *heading* chunk \u2014 topically perfect, containing none of the explanation \u2014 which my substring scorer marked as a miss and a human would call a reasonable hit." },
          { t: "p", text: "So the gap was part real retrieval difference and part scorer strictness, and the conclusion I could defend narrowed accordingly: the higher-ranked model was not better on this corpus and this question set. That is still the decision-relevant fact, and it is a much weaker claim than \u2018mpnet is worse\u2019." },
          { t: "p", text: "This is the same discipline that caught two label bugs worth ten points when I built the evaluation set. The summary statistic never tells you which of these you are looking at; the per-question view and the retrieved text do." }
        ] },

      { level: "core",
        q: "How many dimensions do you need?",
        strong: "A strong answer has measured the curve rather than assuming more is better.",
        answer: [
          { t: "p", text: "Fewer than people pay for, and the way to know is to truncate and measure. On my corpus, cutting all-MiniLM-L6-v2 from 384 to 128 dimensions cost five points of recall@5 and saved two thirds of the index. Below that it fell off a cliff \u2014 64 dimensions lost fifteen points at k=1 and 32 lost thirty-five." },
          { t: "p", text: "That shape tells you something useful: the information is concentrated in the leading dimensions. Matryoshka models are trained so that holds by design, which is what makes their truncation safe and documented. Mine was naive truncation of a model not trained for it, so the numbers are a floor." },
          { t: "p", text: "Where it matters is scale. At a few thousand vectors the entire index is under four megabytes and dimensions are irrelevant. At a hundred million vectors, 3072 dimensions against 768 is a four-fold difference in memory and in every comparison, which is a real infrastructure decision." },
          { t: "p", text: "So I would choose dimensions from the corpus size rather than from the model ranking, and I would measure the truncation curve before paying for the large variant." }
        ] }
    ]
  }
});
