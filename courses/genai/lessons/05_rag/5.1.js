EC.receiveLesson({
  id: "5.1",

  lede: "RAG is two systems in a trench coat: a search engine that finds text, and a model that reads it. The reference\u2019s framing \u2014 retrieve, augment, generate \u2014 is right, and the thing it does not say is that **the first system decides the outcome**. A model cannot ground an answer in a document the retriever did not return. So the number this whole module is measured against is recall: how often the answer-bearing text reaches the prompt at all. I built a 360,000-character corpus from this course\u2019s own reference documentation, wrote 20 questions with known answers, and measured **75% recall at k=1, 95% at k=5**. Then I found that two of those twenty \u201cfailures\u201d were bugs in my own evaluation set, worth **10 percentage points**.",

  objectives: [
    "Describe the two phases of a RAG system and what happens in each",
    "Explain why retrieval quality bounds answer quality",
    "Define recall@k and compute it against a labelled question set",
    "Read k as a cost dial rather than a quality dial",
    "Recognise when a retrieval failure is actually an evaluation-set failure"
  ],

  prerequisites: ["4.2"],

  blocks: [

    { t: "h2", n: "01", id: "shape", text: "The shape of it",
      sub: "Two phases that run at completely different times" },

    { t: "p", text: "Almost every description of RAG draws one pipeline \u2014 query, retriever, context, model. That hides the part that matters operationally, which is that a RAG system has **two phases running on different clocks**." },

    { t: "dl", items: [
      { k: "Index time (offline, occasional)", v: "Load the documents, split them into chunks (5.4), embed every chunk (5.3), and store the vectors in an index (5.5). This runs when the documents change \u2014 minutes or hours, and it is where almost every irreversible decision gets made." },
      { k: "Query time (online, every request)", v: "Embed the query, find the nearest chunks, paste them into a prompt, generate. This runs in milliseconds and it can only choose among the chunks index time created." }
    ] },

    { t: "p", text: "That split is why chunking gets a whole lesson later and why getting it wrong is expensive: a bad chunk boundary is baked into the index, and no amount of query-time cleverness recovers text that was severed from its context before it was ever embedded." },

    { t: "viz", title: "Two phases, two clocks", caption: "Everything below the line runs per request. Everything above it runs when the documents change \u2014 and constrains everything below.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Index time and query time in a RAG system">
  <text x="16" y="22" class="s-label" style="fill:var(--violet)">INDEX TIME \u2014 when the documents change</text>
  <rect x="16" y="34" width="120" height="34" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="76" y="55" text-anchor="middle" class="s-sub">documents</text>
  <text x="146" y="55" class="s-mono">\u2192</text>
  <rect x="168" y="34" width="120" height="34" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="228" y="51" text-anchor="middle" class="s-sub">chunk</text>
  <text x="228" y="64" text-anchor="middle" class="s-sub">1,187 pieces</text>
  <text x="298" y="55" class="s-mono">\u2192</text>
  <rect x="320" y="34" width="120" height="34" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="380" y="51" text-anchor="middle" class="s-sub">embed</text>
  <text x="380" y="64" text-anchor="middle" class="s-sub">384 dims each</text>
  <text x="450" y="55" class="s-mono">\u2192</text>
  <rect x="472" y="34" width="120" height="34" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="532" y="51" text-anchor="middle" class="s-sub">index</text>
  <text x="532" y="64" text-anchor="middle" class="s-sub">1.82 MB</text>
  <text x="606" y="55" class="s-mono" style="fill:var(--violet)">once, 13 s</text>

  <line x1="16" y1="96" x2="744" y2="96" stroke="var(--line)" stroke-width="1.4" stroke-dasharray="6 4"/>
  <text x="16" y="118" class="s-mono" style="fill:var(--crit)">everything below can only choose among the chunks above</text>

  <text x="16" y="152" class="s-label" style="fill:var(--good)">QUERY TIME \u2014 every request</text>
  <rect x="16" y="164" width="104" height="34" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="68" y="185" text-anchor="middle" class="s-sub">query</text>
  <text x="130" y="185" class="s-mono">\u2192</text>
  <rect x="152" y="164" width="104" height="34" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="204" y="185" text-anchor="middle" class="s-sub">embed</text>
  <text x="266" y="185" class="s-mono">\u2192</text>
  <rect x="288" y="164" width="104" height="34" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="340" y="181" text-anchor="middle" class="s-sub">search</text>
  <text x="340" y="194" text-anchor="middle" class="s-sub">top k</text>
  <text x="402" y="185" class="s-mono">\u2192</text>
  <rect x="424" y="164" width="104" height="34" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="476" y="185" text-anchor="middle" class="s-sub">prompt</text>
  <text x="538" y="185" class="s-mono">\u2192</text>
  <rect x="560" y="164" width="104" height="34" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="612" y="185" text-anchor="middle" class="s-sub">generate</text>
  <text x="674" y="185" class="s-mono" style="fill:var(--good)">11 ms</text>

  <text x="16" y="240" class="s-mono" style="fill:var(--warn)">measured: retrieval is 11 ms of a request that then spends hundreds of ms generating</text>
  <text x="16" y="262" class="s-sub">so retrieval is essentially free in latency terms \u2014 its cost is the context tokens it adds, and its risk</text>
  <text x="16" y="280" class="s-sub">is that a chunk the retriever missed cannot be used by any model, however capable</text>
</svg>` },

    { t: "h2", n: "02", id: "why", text: "What it is for",
      sub: "4.2 answered this from the fine-tuning side; here it is from the other" },

    { t: "p", text: "4.2 measured the decisive comparison already: I trained a fact into a model and put the same fact in a retrieved document, then changed the fact. Retrieval was correct the instant the document changed; the fine-tuned model kept reciting the old value with no prompt able to override it. That is the argument for RAG and it does not depend on any benchmark." },

    { t: "p", text: "The reference lists five reasons, and they decompose into two that are structural and three that follow from them:" },

    { t: "ul", items: [
      "**The knowledge is editable.** A document is a file; the weights are not. Everything else on the list is downstream of this.",
      "**The source is identifiable.** The system knows which chunk it used, so an answer can carry a citation that a reader can check \u2014 which 5.13 shows is harder to do honestly than it looks.",
      "*Up-to-date information*: a consequence of editability, as is anything about a training cutoff.",
      "*Reduced hallucination*: a consequence of having the text present, and a partial one \u2014 a model can still misread a document that is right there, which is M6's subject.",
      "*No retraining*: a consequence of the knowledge living outside the model."
    ] },

    { t: "callout", kind: "insight", title: "Retrieval quality is a ceiling on answer quality",
      body: [
        { t: "p", text: "If the chunk containing the answer is not in the top k, the model is being asked a question whose answer is not in front of it. The best case is then an honest refusal; the realistic case is a fluent answer built from whatever was retrieved instead." },
        { t: "p", text: "So the first measurement of any RAG system is not answer quality, it is **recall** \u2014 how often the answer-bearing text makes it into the prompt at all. Everything in M5 after this lesson is an attempt to move that number, and everything in M6 is about what happens to the text once it arrives." },
        { t: "p", text: "That ordering matters because the two failure modes look identical from outside. \u201cThe model made something up\u201d and \u201cthe retriever did not find it\u201d produce the same bad answer, and only instrumenting retrieval separately tells them apart." }
      ] },

    { t: "h2", n: "03", id: "measuring", text: "The measurement",
      sub: "A real corpus, real questions, and recall@k" },

    { t: "p", text: "The corpus for this module is this course\u2019s own reference documentation \u2014 twelve markdown files, 360,000 characters of genuine technical prose with headings, code blocks and tables. That shape matters: a RAG system pointed at clean paragraphs behaves differently from one pointed at documents that are half code." },

    { t: "code", lang: "python", title: "rag_harness.py \u2014 the index", code: `chunks, meta = H.build(H.chunk_recursive, size=500, overlap=50)
E = enc.encode(chunks, normalize_embeddings=True, batch_size=64)

Q = enc.encode([q for q, _, _ in QS], normalize_embeddings=True)
S = Q @ E.T                      # cosine, since both sides are normalised
RANK = np.argsort(-S, axis=1)`,
      out: `  12 documents, 359549 characters
  recursive chunking at 500 chars with 50 overlap -> 1187 chunks
  embedded in 13.2 s  (90 chunks/sec, 384 dimensions)
  index size in memory: 1.82 MB (1187 x 384 float32)
  the corpus itself is 0.36 MB of text`,
      caption: "The index is five times the size of the text it indexes. At 384 dimensions that is the cheap end \u2014 5.3 measures what larger embedding models cost." },

    { t: "code", lang: "python", title: "g51.py \u2014 recall at k", code: `for k in (1, 3, 5, 10, 20, 50):
    cr = np.mean([H.recall_at_k(RANK[i], chunks, meta, *QS[i], k) for i in range(len(QS))])
    dr = np.mean([H.doc_recall_at_k(RANK[i], meta, QS[i][1], k) for i in range(len(QS))])`,
      out: `  20 questions, each with a known answer-bearing chunk in a known document

  k              chunk recall    document recall
  1                       75%                85%
  3                       90%                95%
  5                       95%               100%
  10                      95%               100%
  20                     100%               100%
  50                     100%               100%`,
      hl: [4],
      caption: "Chunk recall: a top-k chunk is from the right document and contains the answer. Document recall: it merely comes from the right document." },

    { t: "callout", kind: "insight", title: "Two recall numbers, because they fail differently",
      body: [
        { t: "p", text: "Document recall reaches 100% at k=5 while chunk recall is still 95%. The gap is a question where the retriever found the right *document* and the wrong *passage* of it \u2014 which is a chunking problem, not a search problem, and is fixed by different machinery." },
        { t: "p", text: "Keeping both numbers separates \u201cthe search is looking in the wrong place\u201d from \u201cthe search is right and the pieces are cut badly\u201d. In this corpus the second is the residual failure, which is the result that makes 5.4 the longest lesson in the module." }
      ] },

    { t: "h2", n: "04", id: "evalbug", text: "Two of my twenty failures were my fault",
      sub: "And they were worth ten percentage points" },

    { t: "p", text: "The first time I ran this, chunk recall was 65% at k=1 and 90% at k=5. Looking at the per-question table rather than the summary turned up two questions whose \u201cfailure\u201d had nothing to do with retrieval." },

    { t: "code", lang: "python", title: "g51.py \u2014 the per-question view that caught it", code: `for i, (q, doc, must) in enumerate(QS):
    rank = next((r + 1 for r, idx in enumerate(RANK[i][:200])
                 if meta[idx] == doc and H.hits(chunks[idx], must)), None)
    print(q, rank, meta[RANK[i][0]])`,
      out: `  question                                           rank top hit from
  What does top_p do?                                   3 01_LLM_Par
  ...
  Why divide alpha by r?                               15 03_Fine_Tu
  What is catastrophic forgetting?                    120 07_LLM_Tra

  2 of 20 questions have their answer outside the top 5
    Why divide alpha by r?         wanted 03_Fine_Tuning_LLM.md  got 03_Fine_Tuning_LLM.md
    What is catastrophic forgetting?  wanted 03_Fine_Tuning_LLM.md  got 07_LLM_Training_and_Alignment.md`,
      caption: "Both of these are the evaluation set being wrong, in two different ways." },

    { t: "callout", kind: "trap", title: "\u201ctop_p\u201d does not appear in prose that says \u201cTop-p\u201d",
      body: [
        { t: "p", text: "The chunk retrieved first for *\u201cWhat does top_p do?\u201d* was the section of the parameters document that explains nucleus sampling. My scorer marked it a miss, because it looked for the literal substring `top_p` and the prose writes **Top-p**." },
        { t: "p", text: "The retriever was right and the matcher was wrong. Folding case and treating `_`, `-` and space as the same separator fixed it." },
        { t: "p", text: "The second failure is more interesting because nothing is broken. *\u201cWhat is catastrophic forgetting?\u201d* retrieved a chunk from the alignment document, which also explains catastrophic forgetting \u2014 correctly, and at length. My label said only the fine-tuning document counted. **The retriever returned a correct answer that my evaluation set called wrong.**" },
        { t: "p", text: "Fixing both moved chunk recall from **65% to 75% at k=1** and from 90% to 95% at k=5. Ten points of what looked like retrieval failure was label failure." }
      ] },

    { t: "callout", kind: "warn", title: "recall@k measures agreement with your labels, not correctness",
      body: [
        { t: "p", text: "This is the thing to carry out of the lesson, because it generalises past this corpus. Every RAG evaluation compares retrieved text against a human judgement of what *should* have been retrieved, and that judgement is made quickly, by someone who knows what they meant and cannot see every other place the answer appears." },
        { t: "p", text: "The two failure modes are both common. **Brittle matching** rejects correct retrievals over formatting \u2014 a hyphen, a plural, a code-formatted identifier. **Incomplete labels** reject correct retrievals because the labeller named one source and the corpus has three." },
        { t: "p", text: "Both bias the measurement *downwards*, which is the dangerous direction: they make a working retriever look broken and send you to fix something that is not wrong. The defence is cheap \u2014 read the per-question table, not the summary, and look at the actual text of anything scored as a miss. Twenty questions is small enough to read all of them, and that is an argument for starting small." }
      ] },

    { t: "h2", n: "05", id: "k", text: "k is a cost dial",
      sub: "Not a quality dial, past the point where recall plateaus" },

    { t: "code", lang: "python", title: "g51.py \u2014 what each extra chunk costs the prompt", code: `tk = tiktoken.get_encoding("cl100k_base")
for k in (1, 3, 5, 10):
    toks = sum(len(tk.encode(chunks[j])) for j in RANK[0][:k])`,
      out: `  embed the query + score 1187 chunks + sort: 11.02 ms median

  top-1       90 tokens of context
  top-3      230 tokens of context
  top-5      423 tokens of context
  top-10     737 tokens of context`,
      caption: "Retrieval itself is 11 ms. What k actually costs is prompt tokens, on every single request." },

    { t: "callout", kind: "tradeoff", title: "Recall plateaus at k=5 and the bill does not",
      body: [
        { t: "p", text: "Chunk recall goes 75%, 90%, 95% at k = 1, 3, 5 \u2014 and then sits at 95% through k=10 before reaching 100% at k=20. The context cost over the same range goes 90, 230, 423, 737 tokens and keeps climbing linearly." },
        { t: "p", text: "So past k=5 on this corpus you are paying for tokens that are not improving recall. 3.12\u2019s arithmetic turns that into money: 300 extra prompt tokens on a million calls is roughly $750 at a frontier input rate, for five percentage points of recall that only arrive at k=20." },
        { t: "p", text: "And there is a quality argument against large k as well, which M6 takes up: more retrieved chunks means more irrelevant text in the context, and a model reading ten chunks to answer from one is more easily distracted than a model reading three. Recall is a ceiling on quality, not a guarantee of it." },
        { t: "p", text: "The right way to pick k is therefore from the recall curve on your own corpus \u2014 find where it flattens, and stop there. Which requires having a labelled question set, which is the first thing most RAG projects skip." }
      ] },

    { t: "exercise", kind: "lab", title: "Build a RAG evaluation set and measure recall", difficulty: "core", minutes: 35,
      body: "Take a corpus you know well, chunk and embed it, and write at least twenty questions whose answers you can locate in specific documents. Measure chunk recall and document recall at k = 1, 3, 5, 10, 20. Then read the per-question table and check every question whose answer was not found \u2014 report how many of those are genuine retrieval failures and how many are problems with your labels.",
      requirements: [
        "Use real documents with real structure, not clean synthetic paragraphs",
        "Record both chunk recall and document recall, since they fail differently",
        "For every question, report the rank at which the answer was found, not just whether it was in the top k",
        "Inspect the retrieved text for every apparent failure before accepting it as one",
        "Report the recall curve against the context-token cost at each k"
      ],
      hint: "Before concluding the retriever failed, print the top chunk and read it. The first two failures you find will probably be your matching rule rather than the search.",
      solution: { lang: "python", title: "g51.py \u2014 the baseline measurement", code: `chunks, meta = H.build(H.chunk_recursive, size=500, overlap=50)
E = enc.encode(chunks, normalize_embeddings=True, batch_size=64)
Q = enc.encode([q for q, _, _ in QS], normalize_embeddings=True)
RANK = np.argsort(-(Q @ E.T), axis=1)

for k in (1, 3, 5, 10, 20, 50):
    cr = np.mean([H.recall_at_k(RANK[i], chunks, meta, *QS[i], k) for i in range(len(QS))])
    dr = np.mean([H.doc_recall_at_k(RANK[i], meta, QS[i][1], k) for i in range(len(QS))])
    print(k, cr, dr)

# the per-question view -- this is the one that catches label bugs
for i, (q, doc, must) in enumerate(QS):
    rank = next((r + 1 for r, idx in enumerate(RANK[i][:200])
                 if meta[idx] in H._docs(doc) and H.hits(chunks[idx], must)), None)
    print(q, rank, meta[RANK[i][0]])

# the fix that was worth ten points
def _norm(t):
    return re.sub(r"[_\-\s]+", " ", t.lower())`,
        out: `  BEFORE fixing the evaluation set:
  k              chunk recall    document recall
  1                       65%                80%
  3                       85%                90%
  5                       90%                95%
  20                      95%                95%

  AFTER:
  k              chunk recall    document recall
  1                       75%                85%
  3                       90%                95%
  5                       95%               100%
  20                     100%               100%

  remaining genuine failure:
    Why divide alpha by r?    found at rank 15, right document

  context cost:
    top-1       90 tokens
    top-3      230 tokens
    top-5      423 tokens
    top-10     737 tokens
  retrieval latency: 11.02 ms median over 1,187 chunks`,
        notes: [
          { t: "p", text: "**Ten percentage points of apparent retrieval failure was my evaluation set.** One question looked for the literal string `top_p` in prose that writes \u201cTop-p\u201d; another insisted on one source document for a term the corpus explains in two. Both biased the result downwards, which is the direction that sends you off to fix a retriever that is working." },
          { t: "p", text: "**Read the per-question table, not the summary.** The aggregate said 65% and gave no indication that a third of the gap was mislabelling. The per-question view with the rank of the correct answer made both bugs obvious in about a minute, and twenty questions is few enough to read every one." },
          { t: "p", text: "**The residual failure is real and instructive.** \u201cWhy divide alpha by r?\u201d sits at rank 15 in the right document \u2014 the passage that answers it calls the term a \u201cvolume knob\u201d and never uses the word \u201cdivide\u201d. An abstract question against a metaphorical answer is precisely the gap that query transformation (5.8) and hybrid search (5.9) exist to close." },
          { t: "p", text: "**Recall plateaus at k=5 and cost does not.** 95% recall at 423 context tokens against 95% at 737 for k=10 \u2014 the extra chunks buy nothing here and are charged on every request. Choosing k from the curve is only possible if the curve exists, which needs the labelled set this exercise builds." },
          { t: "p", text: "One limit worth naming: twenty questions means each one is worth five percentage points, so differences smaller than that are noise. It is enough to find bugs and to compare large design changes, and not enough to tune a threshold. 5.9 and 5.10 lean on it for the former only." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "RAG is a search engine wearing a language model as a hat. When the answer is wrong, the question is which half failed \u2014 and the only way to know is to measure the search separately, because a confident wrong answer looks the same either way." },
        { t: "p", text: "And the search can only return what index time created. That is why the decisions in 5.3 and 5.4 are worth more attention than the ones at query time: they are the ones you cannot take back without rebuilding." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur RAG system gives wrong answers maybe a fifth of the time. The model is good. Where do you start?\u201d**" },
        { t: "p", text: "By separating the two systems, because \u201cthe model made something up\u201d and \u201cthe retriever never found it\u201d produce identical symptoms and have completely different fixes. Until retrieval is instrumented on its own, every debugging conversation is speculation." },
        { t: "p", text: "Concretely: take fifty of the wrong answers, find where the correct answer actually lives in the corpus, and check whether that text was in the context the model received. That splits the fifth into two piles and tells you which half of the system to work on. In my own baseline, measuring retrieval alone gave 75% recall at k=1 and 95% at k=5 \u2014 which immediately says that a system running at k=1 has a retrieval problem and a system running at k=5 probably has a reading problem." },
        { t: "p", text: "I would also want both recall numbers, chunk and document, because the gap between them is diagnostic. Right document and wrong passage is a chunking problem; wrong document is a search problem; and they are fixed by different work." },
        { t: "p", text: "The thing I would warn about before anyone trusts those numbers is the evaluation set. Building mine, two of twenty apparent failures were my labels rather than the retriever \u2014 one looked for `top_p` in prose that says \u201cTop-p\u201d, the other named one source document for a term the corpus covers in two. That was ten percentage points, and both errors made the retriever look worse than it was. So the first pass is reading the per-question table and the actual retrieved text, not the summary statistic." },
        { t: "p", text: "And I would ask what k they are running at and whether anyone chose it from a curve. Recall plateaued at k=5 on my corpus while context cost kept climbing linearly \u2014 so there is often a cheap win sitting in a parameter nobody picked deliberately." }
      ] }
  ],

  takeaways: [
    "**A RAG system has two phases on different clocks**: index time, where chunking and embedding decisions are baked in, and query time, which can only choose among what index time produced.",
    "**Retrieval quality is a ceiling on answer quality.** A chunk that was not retrieved cannot be used by any model, so recall is the first thing to measure.",
    "**The two failure modes look identical from outside** \u2014 a bad answer from a hallucination and from a retrieval miss are the same bad answer, and only separate instrumentation tells them apart.",
    "**Measured baseline on a real 360k-character corpus: 75% chunk recall at k=1, 90% at k=3, 95% at k=5**, reaching 100% at k=20.",
    "**Keep chunk recall and document recall separately.** Document recall hit 100% at k=5 while chunk recall was 95% \u2014 that gap is a chunking failure, not a search failure.",
    "**Two of my twenty \u201cretrieval failures\u201d were evaluation-set bugs** worth 10 percentage points: a matcher that rejected \u201cTop-p\u201d when the question said `top_p`, and a label naming one source for a term covered in two.",
    "**Both label errors biased recall downwards**, which is the dangerous direction \u2014 it sends you to fix a retriever that is working.",
    "**Read the per-question table, not the summary**, and read the retrieved text of anything scored a miss. Twenty questions is few enough to check every one.",
    "**k is a cost dial once recall plateaus**: 95% recall at 423 context tokens (k=5) against 95% at 737 tokens (k=10), charged on every request.",
    "**The residual real failure was an abstract question against a metaphorical answer** \u2014 \u201cWhy divide alpha by r?\u201d against prose calling it a \u201cvolume knob\u201d \u2014 which is what 5.8 and 5.9 exist to fix."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is recall the first metric to measure in a RAG system, before answer quality?",
        options: [
          "Because recall is cheaper to compute than answer quality",
          "Because a chunk that was not retrieved cannot be used by any model, so retrieval bounds what the answer can be",
          "Because answer quality metrics are unreliable for generated text",
          "Because recall correlates almost perfectly with answer quality"
        ],
        answer: 1,
        why: "The model can only ground an answer in text that reached the prompt, so retrieval sets a ceiling that no amount of model capability raises. It also separates two failure modes that look identical from outside \u2014 a hallucination and a retrieval miss produce the same wrong answer, and only instrumenting retrieval on its own distinguishes them. Recall is not a guarantee of answer quality either: M6 covers what goes wrong when the right text is present and the model still misreads it." },

      { stem: "Document recall reaches 100% at k=5 while chunk recall is 95%. What does that gap indicate?",
        options: [
          "The embedding model is underperforming on this corpus",
          "A question where the right document was found but the retrieved passage of it does not contain the answer \u2014 a chunking problem",
          "The index needs more dimensions",
          "The questions are ambiguous and should be rewritten"
        ],
        answer: 1,
        why: "Document recall asks whether any top-k chunk came from the right source; chunk recall additionally requires that chunk to contain the answer. The gap is therefore search succeeding and chunking failing \u2014 the passage was cut so that the answer-bearing text ended up in a chunk that did not match the query. That is fixed by chunk size, overlap or strategy (5.4), not by a better embedding model, which is why keeping the two numbers separate is worth the extra line of code." },

      { stem: "A retrieval evaluation reports 65% recall@1. Inspection shows one question looked for the literal string `top_p` in prose that writes \u201cTop-p\u201d. What is the general lesson?",
        options: [
          "Questions should always be phrased using the corpus's exact wording",
          "recall@k measures agreement with your labels rather than correctness, and brittle matching biases it downwards",
          "Substring matching should be replaced by embedding similarity for scoring",
          "The corpus should be normalised before indexing"
        ],
        answer: 1,
        why: "The retriever returned the passage that explains nucleus sampling \u2014 it was correct and the scorer was wrong. Both common label failures, brittle matching and incomplete labels, reject correct retrievals and therefore understate recall, which sends engineers to fix a working system. Fixing both here moved recall@1 from 65% to 75%. Phrasing questions in corpus wording would defeat the purpose of testing semantic retrieval, and the defence is reading the per-question table rather than changing the corpus." },

      { stem: "Chunk recall is 95% at k=5 and still 95% at k=10, while context cost goes from 423 to 737 tokens. What follows?",
        options: [
          "Increase k to 10, since more context gives the model more to work with",
          "Stop at k=5 \u2014 past the plateau the extra chunks add prompt tokens on every request without improving recall",
          "Reduce k to 3 to save tokens, accepting the recall loss",
          "The plateau means the embedding model has saturated and should be replaced"
        ],
        answer: 1,
        why: "Once recall flattens, additional chunks are pure cost \u2014 charged on every request, and at a frontier input rate 300 extra tokens over a million calls is roughly $750. There is a quality argument too: more irrelevant text in the context gives the model more to be distracted by, which M6 takes up. Choosing k from the recall curve requires a labelled question set, which is the step most RAG projects skip, leaving k at whatever the tutorial used." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where \u201cwe use RAG\u201d needs to be followed by \u201cand here is how we know it works\u201d",
    questions: [
      { level: "core",
        q: "Explain RAG and why you would use it.",
        strong: "A strong answer gives the two-phase structure and the editability argument rather than a list of benefits.",
        answer: [
          { t: "p", text: "Two systems: a search engine that finds relevant text and a model that reads it. At index time you chunk the documents, embed the chunks and store the vectors; at query time you embed the question, pull the nearest chunks and put them in the prompt. The two run on completely different clocks, and query time can only choose among what index time produced." },
          { t: "p", text: "The reason to use it is that the knowledge stays editable. I measured the decisive version of this: train a fact into a model and put the same fact in a retrieved document, then change the fact \u2014 retrieval was correct the moment the document changed, and the fine-tuned model kept reciting the old value with no prompt able to override it. Everything else on the usual list, freshness and citations and no retraining, follows from the knowledge living in a file rather than in weights." },
          { t: "p", text: "The thing I would stress is that retrieval quality is a ceiling. A chunk that is not retrieved cannot be used by any model, so the first number is recall, not answer quality. On a real 360,000-character corpus I measured 75% chunk recall at k=1 and 95% at k=5 \u2014 which already tells you that a system running at k=1 has a different problem from one running at k=5." },
          { t: "p", text: "And the two failure modes are indistinguishable from outside. A hallucination and a retrieval miss produce the same confident wrong answer, so unless retrieval is instrumented separately every debugging conversation is guesswork." }
        ] },

      { level: "advanced",
        q: "How would you evaluate a retrieval system?",
        strong: "A strong answer builds a labelled set, keeps two recall metrics, and is sceptical of its own labels.",
        answer: [
          { t: "p", text: "A labelled question set over the real corpus, with recall@k as the headline. Twenty to a few hundred questions whose answers I can locate in specific documents, measured at k = 1, 3, 5, 10, 20 so there is a curve rather than a point." },
          { t: "p", text: "Two recall numbers, not one. Chunk recall \u2014 did a top-k chunk contain the answer \u2014 and document recall \u2014 did a top-k chunk come from the right source. The gap between them separates a search problem from a chunking problem, which need different fixes. In my measurement document recall hit 100% at k=5 while chunk recall was 95%, so the residual failure was chunking." },
          { t: "p", text: "And I would be sceptical of the labels before I was sceptical of the retriever. Two of my twenty apparent failures were my own evaluation set \u2014 one scorer looked for `top_p` in prose that writes \u201cTop-p\u201d, and one question named a single source document for a term the corpus explains in two places. That was ten percentage points, and both errors made the system look worse than it was." },
          { t: "p", text: "So the discipline is to read the per-question table with the rank of each correct answer, and to read the actual retrieved text for anything scored a miss. The summary statistic gave no hint that a third of the gap was mislabelling." },
          { t: "p", text: "On sizing: twenty questions means each is worth five points, which is enough to catch bugs and compare large design changes and not enough to tune a threshold. I would be explicit about which of those I was doing." }
        ] },

      { level: "core",
        q: "How do you choose k?",
        strong: "A strong answer reads it off a curve and names both costs.",
        answer: [
          { t: "p", text: "From the recall curve on my own corpus \u2014 find where it flattens and stop there. On mine, chunk recall went 75%, 90%, 95% at k = 1, 3, 5 and then stayed at 95% through k=10, so k=5 is the knee." },
          { t: "p", text: "Past the plateau, k is a pure cost dial. The same range took context from 423 tokens at k=5 to 737 at k=10 \u2014 charged on every request, which at a frontier input rate is real money over a million calls. Retrieval latency itself is irrelevant by comparison; I measured 11 ms to score 1,187 chunks." },
          { t: "p", text: "There is a second cost that is not on the bill. More retrieved chunks means more irrelevant text in the context, and a model answering from one chunk among ten is easier to distract than one answering from one among three. So the plateau is roughly where quality stops improving too." },
          { t: "p", text: "All of which needs a labelled set to see. Without one, k gets left at whatever number the tutorial used, and that is usually the cheapest available improvement sitting untouched." }
        ] }
    ]
  }
});
