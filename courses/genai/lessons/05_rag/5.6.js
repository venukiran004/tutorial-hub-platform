EC.receiveLesson({
  id: "5.6",

  lede: "Cosine, dot product and L2 are usually described as three choices. On **normalised** vectors they are not choices at all \u2014 all three produce identical rankings, which I measured: 75% / 90% / 95% recall and 100% top-1 agreement across the board. On **unnormalised** vectors they diverge violently: dot product collapsed to **30% recall@1** against cosine\u2019s 75%, agreeing with it on the top hit **15%** of the time. The reason is visible in one number \u2014 chunk length correlates **\u22120.85** with vector magnitude, so dot product was substantially ranking by shortness.",

  objectives: [
    "State the algebraic relationship between the three metrics on unit vectors",
    "Explain what magnitude encodes and why that corrupts dot-product ranking",
    "Verify that your embeddings are actually normalised before trusting a metric choice",
    "Choose a metric consistently across indexing and querying",
    "Recognise when a comparison measured your library rather than your data"
  ],

  prerequisites: ["5.3"],

  blocks: [

    { t: "h2", n: "01", id: "algebra", text: "On unit vectors there is no choice",
      sub: "The three metrics are the same ranking written three ways" },

    { t: "p", text: "If every vector has length 1, the relationships collapse. Cosine similarity is defined as the dot product divided by the two magnitudes, and both magnitudes are 1:" },

    { t: "math", tex: "\\cos(a,b) = \\frac{a \\cdot b}{\\|a\\|\\,\\|b\\|} = a \\cdot b" },

    { t: "p", text: "And squared Euclidean distance expands into a constant minus the dot product:" },

    { t: "math", tex: "\\|a-b\\|^2 = \\|a\\|^2 + \\|b\\|^2 - 2\\,a\\cdot b = 2 - 2\\,a\\cdot b" },

    { t: "p", text: "So sorting by L2 ascending is exactly sorting by dot product descending. Three names, one ordering." },

    { t: "code", lang: "python", title: "g56.py \u2014 verified rather than assumed", code: `En = E / np.linalg.norm(E, axis=1, keepdims=True)
Qn = QV / np.linalg.norm(QV, axis=1, keepdims=True)

R_cos = np.argsort(-(Qn @ En.T), axis=1)
R_dot = np.argsort(-(Qn @ En.T), axis=1)
d2    = ((Qn[:, None, :] - En[None, :, :]) ** 2).sum(-1)
R_l2  = np.argsort(d2, axis=1)`,
      out: `  metric                      r@1      r@3      r@5  same top-1 as cos
  cosine                      75%      90%      95%               100%
  dot product                 75%      90%      95%               100%
  L2 distance                 75%      90%      95%               100%`,
      caption: "Identical, as the algebra requires. If your numbers differ here, your vectors are not unit length." },

    { t: "callout", kind: "insight", title: "Which means the metric question is really a normalisation question",
      body: [
        { t: "p", text: "Almost every argument about cosine against dot product is an argument about whether the vectors are normalised, conducted without anyone saying so. Settle that and the metric follows \u2014 and most retrieval stacks normalise, so most of the time the answer is \u201cit does not matter\u201d." },
        { t: "p", text: "The reason to use dot product on normalised vectors is purely computational: it is one matrix multiply, with no division and no square root. That is why vector databases offer an inner-product mode and why 5.5\u2019s FAISS index was built with `METRIC_INNER_PRODUCT` over pre-normalised vectors." }
      ] },

    { t: "h2", n: "02", id: "broken", text: "My first attempt measured nothing",
      sub: "And the failure is worth more than the result would have been" },

    { t: "callout", kind: "warn", title: "\u201cUnnormalised\u201d vectors that were normalised anyway",
      body: [
        { t: "p", text: "To show where the metrics diverge I encoded the corpus with `normalize_embeddings=False` and compared again. All three metrics agreed perfectly, which is not what should happen." },
        { t: "p", text: "The tell was in a line I had printed almost as an afterthought: **chunk vector norms: min 1.000, median 1.000, max 1.000**. Every vector was unit length despite asking for no normalisation." },
        { t: "p", text: "The cause is that a `SentenceTransformer` is a pipeline, and these models ship with a **Normalize module as the final step**. The `normalize_embeddings` argument controls an additional normalisation the wrapper can apply \u2014 it cannot undo one baked into the model\u2019s own architecture. My comparison measured the library, not the mathematics." },
        { t: "p", text: "The fix was to stop using the wrapper: load the transformer directly, mean-pool the token embeddings, and skip the pooling pipeline\u2019s final step. That produces genuinely unnormalised vectors, and everything below is measured on those." }
      ] },

    { t: "code", lang: "python", title: "g56.py \u2014 mean-pooling by hand, with no normalisation step", code: `tok = AutoTokenizer.from_pretrained(MODEL)
mdl = AutoModel.from_pretrained(MODEL).eval()

def encode_raw(texts, bs=64):
    """Mean-pool the transformer output. NO normalisation step."""
    out = []
    for i in range(0, len(texts), bs):
        b = tok(texts[i:i+bs], padding=True, truncation=True,
                max_length=256, return_tensors="pt")
        with torch.no_grad():
            h = mdl(**b).last_hidden_state
        m = b["attention_mask"].unsqueeze(-1).float()
        out.append(((h * m).sum(1) / m.sum(1)).numpy())
    return np.vstack(out)`,
      out: `  chunk vector norms: min 1.4315  median 2.1696  max 5.6318  ratio 3.93x`,
      hl: [4],
      caption: "Now there is real magnitude variation \u2014 a factor of 3.93 between the smallest and largest vector." },

    { t: "h2", n: "03", id: "magnitude", text: "What magnitude encodes",
      sub: "And it is not what you want to rank by" },

    { t: "code", lang: "python", title: "g56.py \u2014 does chunk length drive the magnitude?", code: `lens = np.array([len(c) for c in chunks])
print(np.corrcoef(lens, norms)[0, 1])`,
      out: `  correlation between chunk length and vector norm: -0.8524

  length band                   n    median norm
  0-150 chars                 195         3.9468
  150-300 chars               229         2.5975
  300-450 chars               343         2.1124
  450-700 chars               420         1.9508`,
      hl: [1],
      caption: "Strongly negative: short chunks have large vectors. Mean pooling over few tokens averages away less." },

    { t: "callout", kind: "insight", title: "The magnitude is an artefact of pooling, not a measure of relevance",
      body: [
        { t: "p", text: "A mean-pooled embedding is the average of its token vectors. Average two tokens and the result keeps most of their magnitude; average two hundred and the components cancel against each other, leaving something smaller. Hence **\u22120.85**: length drives magnitude downwards, almost deterministically." },
        { t: "p", text: "So on unnormalised vectors, a dot product is `cosine \u00d7 |query| \u00d7 |chunk|` \u2014 and that last factor is a proxy for *how short the chunk is*. A short chunk gets a scoring bonus for being short." },
        { t: "p", text: "That is the whole mechanism, and it is why normalisation is not a stylistic preference. Magnitude here carries information about document length and nothing about relevance, so ranking by anything that includes it is ranking partly by noise." }
      ] },

    { t: "h2", n: "04", id: "diverge", text: "What that costs",
      sub: "A 45-point collapse, and 15% agreement with cosine" },

    { t: "code", lang: "python", title: "g56.py \u2014 the three metrics on genuinely unnormalised vectors", code: `R_cos = np.argsort(-(Qn @ En.T), axis=1)      # normalised both sides
R_dot = np.argsort(-(QV @ E.T), axis=1)       # raw magnitudes
d2    = ((QV[:, None, :] - E[None, :, :]) ** 2).sum(-1)
R_l2  = np.argsort(d2, axis=1)`,
      out: `  metric                      r@1      r@3      r@5  same top-1 as cos mean |rank diff|
  cosine                      75%      90%      95%               100%             100%
  dot product                 30%      70%      80%                15%              39%
  L2 distance                 70%      90%      95%                95%              90%

  last column: overlap of the top-10 sets with cosine's top-10`,
      hl: [2],
      caption: "Dot product loses 45 points at k=1 and shares only 39% of its top-10 with cosine's." },

    { t: "code", lang: "python", title: "g56.py \u2014 and what it retrieved instead", code: `long_bias_dot = np.mean([np.mean([len(chunks[j]) for j in R_dot[i][:5]])
                         for i in range(len(QS))])`,
      out: `  mean length of the top-5 chunks retrieved:
    by dot product (unnormalised):    169 chars
    by cosine:                        389 chars
    corpus mean:                      347 chars`,
      hl: [2],
      caption: "Dot product retrieved chunks less than half the corpus's mean length. It was ranking by shortness." },

    { t: "callout", kind: "trap", title: "L2 survives much better, and that is not a reason to trust it",
      body: [
        { t: "p", text: "L2 kept 70% at k=1 and 95% of cosine\u2019s top-10, where dot product kept 30% and 39%. The reason is that squared distance is `|a|\u00b2 + |b|\u00b2 \u2212 2a\u00b7b` \u2014 the magnitude terms *add* rather than multiply, so a large chunk vector is penalised as often as it is rewarded, and direction still dominates." },
        { t: "p", text: "It is still wrong. It is wrong less dramatically, which is worse in practice \u2014 a metric that degrades gracefully is one you can ship without noticing, while the 45-point collapse gets investigated on day one." },
        { t: "p", text: "The rule that avoids all of this: **normalise at index time, normalise the query, and then use inner product.** One decision, made once, and the metric question stops existing." }
      ] },

    { t: "viz", title: "Normalised and unnormalised, side by side", caption: "On unit vectors the three metrics are one ranking. On raw vectors, dot product is partly ranking by chunk length.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Metric agreement with and without normalisation">
  <text x="16" y="22" class="s-label" style="fill:var(--good)">NORMALISED \u2014 all three are the same ranking</text>
  <rect x="16" y="34" width="210" height="28" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="121" y="53" text-anchor="middle" class="s-sub">cosine \u2014 75% r@1</text>
  <rect x="238" y="34" width="210" height="28" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="343" y="53" text-anchor="middle" class="s-sub">dot \u2014 75% r@1</text>
  <rect x="460" y="34" width="210" height="28" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="565" y="53" text-anchor="middle" class="s-sub">L2 \u2014 75% r@1</text>
  <text x="684" y="53" class="s-mono" style="fill:var(--good)">100%</text>
  <text x="16" y="80" class="s-sub">top-1 agreement with cosine: 100% for both. The algebra requires it.</text>

  <line x1="16" y1="100" x2="744" y2="100" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="126" class="s-label" style="fill:var(--crit)">UNNORMALISED \u2014 norms vary 3.93\u00d7</text>
  <text x="16" y="152" class="s-sub">cosine</text>
  <rect x="110" y="140" width="420" height="18" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="540" y="154" class="s-mono" style="fill:var(--good)">75% r@1</text>

  <text x="16" y="182" class="s-sub">L2</text>
  <rect x="110" y="170" width="392" height="18" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="512" y="184" class="s-mono" style="fill:var(--warn)">70% r@1 \u2014 95% agreement</text>

  <text x="16" y="212" class="s-sub">dot product</text>
  <rect x="110" y="200" width="168" height="18" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="288" y="214" class="s-mono" style="fill:var(--crit)">30% r@1 \u2014 15% agreement</text>

  <line x1="16" y1="238" x2="744" y2="238" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="262" class="s-mono" style="fill:var(--crit)">chunk length correlates \u22120.85 with magnitude \u2014 dot product was ranking by shortness</text>
  <text x="16" y="282" class="s-sub">it retrieved chunks averaging 169 characters against a corpus mean of 347</text>
</svg>` },

    { t: "h2", n: "05", id: "practice", text: "What to actually do",
      sub: "Three rules, and a check" },

    { t: "ol", items: [
      "**Normalise at index time**, so the stored vectors are unit length and nothing downstream has to remember.",
      "**Normalise the query the same way.** Normalising one side and not the other is a real bug and it produces a ranking that is neither cosine nor dot product.",
      "**Then use inner product**, because it is the cheapest of the three and now equivalent to all of them.",
      "**Verify it once**: print the min, median and max norm of your stored vectors. If they are not all 1.0, something in the pipeline is not doing what you think \u2014 which is exactly how I found my own broken measurement."
    ] },

    { t: "callout", kind: "note", title: "Where unnormalised vectors are deliberate",
      body: [
        { t: "p", text: "Some retrieval models encode confidence or specificity in magnitude on purpose and are trained with an unnormalised dot-product objective. For those, normalising discards information the model intended you to use, and the right metric is the one the model was trained with." },
        { t: "p", text: "The way to tell is the model card, not an experiment \u2014 and the default for the sentence-transformers family in this module is normalised. The failure mode to avoid is choosing a metric by habit while the model assumes the other one." }
      ] },

    { t: "exercise", kind: "analysis", title: "Measure whether your metric choice matters", difficulty: "core", minutes: 25,
      body: "Encode a corpus both with and without normalisation and compare cosine, dot product and L2 on each. Report recall and the agreement with cosine's ranking. Then check whether vector magnitude correlates with chunk length, and what the mean length of the retrieved chunks is under each metric.",
      requirements: [
        "Verify that your \u201cunnormalised\u201d vectors actually have varying norms before comparing anything",
        "Report top-1 agreement and top-10 overlap with cosine, not just recall",
        "Compute the correlation between chunk length and vector norm",
        "Report the mean length of the top-5 chunks retrieved under each metric",
        "Confirm that on normalised vectors all three metrics agree exactly"
      ],
      hint: "If your three metrics agree on supposedly unnormalised vectors, print the norms. A SentenceTransformer pipeline may be normalising inside the model regardless of the argument you passed.",
      solution: { lang: "python", title: "g56.py \u2014 mean-pooling by hand to get real magnitudes", code: `tok = AutoTokenizer.from_pretrained(MODEL)
mdl = AutoModel.from_pretrained(MODEL).eval()

def encode_raw(texts, bs=64):
    out = []
    for i in range(0, len(texts), bs):
        b = tok(texts[i:i+bs], padding=True, truncation=True,
                max_length=256, return_tensors="pt")
        with torch.no_grad():
            h = mdl(**b).last_hidden_state
        m = b["attention_mask"].unsqueeze(-1).float()
        out.append(((h * m).sum(1) / m.sum(1)).numpy())
    return np.vstack(out)

E, QV = encode_raw(chunks), encode_raw(questions)
norms = np.linalg.norm(E, axis=1)
print(norms.min(), np.median(norms), norms.max())          # must NOT all be 1.0
print(np.corrcoef([len(c) for c in chunks], norms)[0, 1])

En = E / norms[:, None]
Qn = QV / np.linalg.norm(QV, axis=1, keepdims=True)
R_cos = np.argsort(-(Qn @ En.T), axis=1)
R_dot = np.argsort(-(QV @ E.T), axis=1)
R_l2  = np.argsort(((QV[:, None, :] - E[None, :, :]) ** 2).sum(-1), axis=1)`,
        out: `  chunk vector norms: min 1.4315  median 2.1696  max 5.6318  ratio 3.93x
  correlation between chunk length and vector norm: -0.8524

  length band                   n    median norm
  0-150 chars                 195         3.9468
  450-700 chars               420         1.9508

  UNNORMALISED
  metric                      r@1      r@3      r@5  same top-1 as cos  top-10 overlap
  cosine                      75%      90%      95%               100%            100%
  dot product                 30%      70%      80%                15%             39%
  L2 distance                 70%      90%      95%                95%             90%

  NORMALISED
  cosine                      75%      90%      95%               100%
  dot product                 75%      90%      95%               100%
  L2 distance                 75%      90%      95%               100%

  mean length of the top-5 retrieved:
    dot product (unnormalised):    169 chars
    cosine:                        389 chars
    corpus mean:                   347 chars`,
        notes: [
          { t: "p", text: "**On normalised vectors all three are identical, and that is algebra rather than luck.** Cosine is the dot product when both magnitudes are 1, and squared L2 is 2 minus twice the dot product \u2014 a monotone transform, so the sort order is the same. If your three disagree here, your vectors are not unit length." },
          { t: "p", text: "**Unnormalised, dot product collapses to 30% at k=1 and shares 15% of its top hits with cosine.** It is not a slightly different ranking, it is mostly a different one. L2 holds up far better at 70% and 95% agreement, because its magnitude terms add rather than multiply." },
          { t: "p", text: "**The mechanism is visible in one number: \u22120.85.** Mean pooling over more tokens averages components away, so long chunks have small vectors \u2014 almost deterministically. Dot product multiplies by that magnitude, so it awards a bonus for being short, and retrieved chunks averaging 169 characters against a corpus mean of 347." },
          { t: "p", text: "**L2 degrading gracefully is the more dangerous outcome.** A 45-point collapse gets investigated immediately; a five-point one ships. The rule that removes the whole question is to normalise at index time, normalise the query, and use inner product." },
          { t: "p", text: "**And print your norms once.** My first attempt at this comparison found all three metrics agreeing on supposedly unnormalised vectors, because the SentenceTransformer pipeline ends in a Normalize module that the `normalize_embeddings=False` argument does not remove. The min/median/max line was what exposed it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Direction is meaning; magnitude is an accident of how many tokens got averaged. Cosine throws the accident away. Dot product multiplies by it. Normalise, and the two become the same operation." },
        { t: "p", text: "And when a comparison shows no difference where theory says there should be one, suspect the library before the theory." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe switched our vector store from cosine to inner product for speed and recall dropped noticeably. Why?\u201d**" },
        { t: "p", text: "Because the vectors are not normalised. On unit vectors those two metrics are the same operation \u2014 cosine *is* the inner product when both magnitudes are one \u2014 so switching could not change the ranking at all. A drop proves the premise is false." },
        { t: "p", text: "The check is one line: print the min, median and max norm of the stored vectors. I would expect something like the 1.43 to 5.63 range I measured on mean-pooled embeddings, where the ratio was almost 4\u00d7." },
        { t: "p", text: "The damage is predictable once you know that. Magnitude in a mean-pooled embedding is largely a function of length \u2014 I measured a correlation of \u22120.85, because averaging more tokens cancels more components \u2014 so an inner product is scoring `cosine \u00d7 magnitude` and the magnitude term is a bonus for being short. In my measurement that took recall@1 from 75% to 30%, and the retrieved chunks averaged 169 characters against a corpus mean of 347." },
        { t: "p", text: "The fix is to normalise at index time and normalise the query, then keep inner product \u2014 they get the speed they switched for, and the ranking becomes identical to cosine. The one thing to be careful about is doing both sides: normalising the index and not the query gives a ranking that is neither metric." },
        { t: "p", text: "I would also ask whether the embedding model expects unnormalised vectors, because a few are trained with magnitude carrying meaning. That is a model-card question rather than an experiment, and if the answer is yes then normalising discards information and the right move is to keep cosine out of it entirely." }
      ] }
  ],

  takeaways: [
    "**On unit vectors the three metrics are one ranking.** Measured: identical recall and 100% top-1 agreement, which the algebra requires.",
    "**Cosine is the dot product when both magnitudes are 1**, and squared L2 is `2 \u2212 2a\u00b7b`, a monotone transform of it \u2014 so all three sort the same way.",
    "**The metric question is really a normalisation question**, usually argued without either party saying so.",
    "**My first attempt measured the library.** `normalize_embeddings=False` still returned unit vectors, because the SentenceTransformer pipeline ends in a Normalize module \u2014 caught by printing the norms.",
    "**With genuinely unnormalised vectors the norms vary 3.93\u00d7** (1.43 to 5.63) and the metrics diverge violently.",
    "**Dot product collapsed to 30% recall@1 against cosine's 75%**, agreeing on the top hit only 15% of the time and sharing 39% of its top-10.",
    "**Because magnitude is an artefact of pooling, not relevance**: chunk length correlates **\u22120.85** with vector norm, since averaging more tokens cancels more components.",
    "**So dot product was ranking by shortness** \u2014 it retrieved chunks averaging 169 characters against a corpus mean of 347.",
    "**L2 degraded gracefully to 70%**, which is more dangerous than a collapse: a five-point loss ships, a 45-point loss gets investigated.",
    "**Normalise at index time, normalise the query, use inner product** \u2014 and print the norms once to confirm it actually happened."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "On normalised vectors, cosine and dot product produce identical rankings. Why?",
        options: [
          "Because the embedding model was trained with a cosine objective",
          "Because cosine is the dot product divided by both magnitudes, and both are 1",
          "Because the index rounds scores to the same precision",
          "Because normalisation removes the differences between vectors"
        ],
        answer: 1,
        why: "Cosine is defined as a\u00b7b / (|a||b|), so with unit vectors the denominator is 1 and cosine is exactly the dot product. Squared L2 expands to 2 \u2212 2a\u00b7b, which is a monotone decreasing transform, so sorting by it ascending matches sorting by dot product descending \u2014 all three give one ordering. Normalisation discards magnitude, not direction, and the vectors remain entirely distinguishable." },

      { stem: "A comparison of metrics on \u201cunnormalised\u201d vectors shows all three agreeing perfectly. What is the most likely explanation?",
        options: [
          "The corpus is too homogeneous for the metrics to diverge",
          "The vectors are normalised anyway \u2014 many sentence-transformer models end in a Normalize module the argument does not remove",
          "The evaluation set is too small to show a difference",
          "Dot product and cosine were computed with the same code path"
        ],
        answer: 1,
        why: "A SentenceTransformer is a pipeline, and these models ship with normalisation as the final step; the `normalize_embeddings` flag controls an additional wrapper-level normalisation and cannot undo one inside the model. The diagnostic is to print the norms \u2014 min, median and max all exactly 1.0000 is the signature. Getting genuinely unnormalised vectors means mean-pooling the transformer output directly, which then showed a 3.93\u00d7 spread in magnitude." },

      { stem: "On genuinely unnormalised embeddings, dot product retrieved chunks averaging 169 characters against a corpus mean of 347, and recall@1 fell from 75% to 30%. What is the mechanism?",
        options: [
          "Shorter chunks are semantically more precise, so the ranking is correct but the labels are wrong",
          "Mean pooling over fewer tokens cancels fewer components, so short chunks have larger vectors and the dot product rewards them",
          "Longer chunks exceed the model's sequence limit and are truncated to noise",
          "The query vectors have larger magnitude than the chunk vectors"
        ],
        answer: 1,
        why: "A mean-pooled embedding averages its token vectors, and averaging more of them cancels more components \u2014 measured, chunk length correlates \u22120.85 with vector norm. The dot product is cosine multiplied by both magnitudes, so that length artefact becomes a scoring bonus for brevity. Truncation is a separate real hazard but would affect the direction of long vectors rather than produce this systematic length bias." },

      { stem: "Why is L2's graceful degradation (70% vs cosine's 75%) arguably worse than dot product's collapse to 30%?",
        options: [
          "Because L2 is more expensive to compute at scale",
          "Because a small loss ships unnoticed while a large one gets investigated immediately",
          "Because L2 cannot be used with approximate nearest-neighbour indexes",
          "Because L2 scores are not comparable across queries"
        ],
        answer: 1,
        why: "A 45-point drop is a production incident on day one; a five-point drop looks like noise and persists indefinitely, quietly costing recall. L2 holds up better because its magnitude terms add rather than multiply \u2014 |a|\u00b2 + |b|\u00b2 \u2212 2a\u00b7b \u2014 so direction still dominates. It is still the wrong metric for unnormalised vectors, and the fix for all of this is to normalise at index time so the question does not arise. L2 is well supported by ANN indexes." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A question with a one-line answer and a revealing follow-up",
    questions: [
      { level: "core",
        q: "Cosine, dot product or L2 \u2014 which do you use?",
        strong: "A strong answer says it depends only on normalisation and explains why.",
        answer: [
          { t: "p", text: "On normalised vectors it makes no difference, so the real answer is \u2018normalise, then use inner product because it is cheapest\u2019. Cosine is the dot product when both magnitudes are one, and squared L2 is 2 minus twice the dot product \u2014 a monotone transform, so all three give the same ordering. I verified that: identical recall and 100% top-1 agreement." },
          { t: "p", text: "Where it does matter is when the vectors are not normalised, and then it matters enormously. I measured dot product dropping to 30% recall@1 against cosine's 75%, agreeing on the top hit 15% of the time." },
          { t: "p", text: "The reason is that magnitude in a mean-pooled embedding is mostly an artefact of length \u2014 I measured a correlation of \u22120.85 between chunk length and vector norm, because averaging more tokens cancels more components. So an unnormalised dot product scores cosine times a brevity bonus, and it retrieved chunks averaging 169 characters against a corpus mean of 347." },
          { t: "p", text: "So the practical rule is three lines: normalise at index time, normalise the query the same way, use inner product. And print the norms once to confirm it happened." }
        ] },

      { level: "advanced",
        q: "How would you verify your retrieval stack is doing what you think?",
        strong: "A strong answer proposes cheap invariant checks and has one that caught a real bug.",
        answer: [
          { t: "p", text: "Check the invariants that must hold, because they are cheap and they fail loudly. Print the min, median and max norm of the stored vectors \u2014 if they are supposed to be normalised and they are not all 1.0, something in the pipeline is not what you think." },
          { t: "p", text: "That one caught a real mistake of mine. I was trying to show where the metrics diverge, encoded with `normalize_embeddings=False`, and found all three metrics agreeing perfectly \u2014 which theory says cannot happen. The norms line showed every vector at exactly 1.0000. These models ship with a Normalize module as the last pipeline step, and the argument controls a wrapper-level normalisation rather than removing that one. My comparison had measured the library." },
          { t: "p", text: "The same spirit applies elsewhere: confirm cosine and inner product agree on normalised vectors, check `max_seq_length` against the chunk size in tokens, and confirm the query is embedded with the identical model and settings as the index. Each is a line, and each catches a failure that otherwise shows up as mysteriously poor recall." },
          { t: "p", text: "The general version is that when a result contradicts something you can derive, the derivation is usually right and the plumbing is usually wrong \u2014 so look at the plumbing first." }
        ] },

      { level: "core",
        q: "Someone switches from cosine to inner product for speed and recall drops. What happened?",
        strong: "A strong answer identifies the contradiction immediately and names the fix.",
        answer: [
          { t: "p", text: "Their vectors are not normalised. On unit vectors those two are the same operation, so the switch could not have changed the ranking \u2014 a drop is proof that the precondition does not hold." },
          { t: "p", text: "One line confirms it: print the norms of the stored vectors. On mean-pooled embeddings I measured a range from 1.43 to 5.63, nearly a 4\u00d7 spread." },
          { t: "p", text: "The damage follows from what magnitude means. It correlates \u22120.85 with chunk length, so inner product adds a brevity bonus to the relevance score, and short chunks float to the top \u2014 in my measurement recall@1 went from 75% to 30% and the retrieved chunks were less than half the corpus's mean length." },
          { t: "p", text: "The fix keeps what they wanted: normalise at index time and normalise the query, then stay on inner product. They get the speed and a ranking identical to cosine. The thing to watch is doing both sides \u2014 normalising only the index gives a ranking that is neither metric and is harder to reason about than either." }
        ] }
    ]
  }
});
