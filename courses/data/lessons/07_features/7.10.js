/* ============================================================================
   LESSON 7.10 — Text, Embeddings and High-Cardinality Features
   ========================================================================= */
EC.receiveLesson({
  id: "7.10",

  lede: "**Text is the highest-cardinality feature there is: every document is unique, and the vocabulary that describes it is fit from the data like any other encoder.** Bag of words counts terms; TF-IDF reweights them; hashing skips the vocabulary entirely; an embedding learns a geometry where similar meanings are near each other. Each is a fit step, each leaks if fit on test data, and the vocabulary decisions — what to lowercase, what to drop, what counts as a word — silently decide what the model can see.",

  objectives: [
    "Turn text into a numeric matrix with bag-of-words and TF-IDF, and explain what each weight means",
    "Make the vocabulary decisions — tokenisation, case, stop words, n-grams, min/max document frequency — deliberately",
    "Use the hashing trick when the vocabulary cannot be stored or must not be fit",
    "Use pretrained embeddings for text and learned entity embeddings for high-cardinality IDs",
    "Fit every text transformer on training data and detect the vocabulary leak when it is not"
  ],

  prerequisites: ["4.5", "7.1", "7.2"],

  blocks: [

    { t: "h2", n: "01", text: "Text as a very wide sparse matrix", id: "bow" },

    { t: "p", text: "A document becomes a row; each distinct term becomes a column; the cell is how many times the term appears. **That is bag-of-words: the order of words is discarded and only their presence and count survive.** The matrix is enormous — thousands of columns — and almost entirely zero, which is why it is stored sparse and why a linear model is the natural consumer." },

    { t: "dl", items: [
      ["Tokenisation", "Splitting text into units — usually words, sometimes character n-grams. The regex that does it decides whether `\"don't\"` is one token or two and whether `\"3.5\"` survives."],
      ["Vocabulary", "The set of tokens that get a column, fit from the training corpus. Everything not in it is invisible at transform time."],
      ["Term frequency (TF)", "How many times a term appears in a document. Raw count, or a dampened version — binary presence, log count, or divided by document length."],
      ["Inverse document frequency (IDF)", "`log(N / df)` — a term that appears in every document gets weight near zero; one that appears in few gets a high weight. Fit from the training corpus."],
      ["TF-IDF", "TF × IDF, then usually L2-normalised per row. Common words are down-weighted, distinctive words up-weighted, and documents of different lengths become comparable."],
      ["n-gram", "A sequence of n consecutive tokens. `\"not good\"` as a bigram carries what the unigrams `\"not\"` and `\"good\"` lose. The vocabulary grows roughly with n."]
    ]},

    { t: "viz",
      title: "Three documents, one vocabulary, two weightings",
      caption: "Counts say how often each word appears. TF-IDF says how distinctive it is: 'the' is in every document and its weight collapses; 'refund' is in one and its weight rises. The matrix is 3 × 7 here and 100,000 × 50,000 in practice — and almost all zeros.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="Three short documents, their bag-of-words count matrix, and the same matrix reweighted by TF-IDF with common words shrunk and rare words grown">
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="30" class="s-sub" style="fill:var(--ink-2)">d1: "the order arrived late"</text>
    <text x="30" y="50" class="s-sub" style="fill:var(--ink-2)">d2: "the refund was late"</text>
    <text x="30" y="70" class="s-sub" style="fill:var(--ink-2)">d3: "the order was great"</text>
  </g>

  <text x="30" y="110" class="s-label" style="fill:var(--accent)">counts</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="132" class="s-sub" style="fill:var(--ink-3)">       the  order  arrived  late  refund  was  great</text>
    <text x="30" y="152" class="s-sub" style="fill:var(--ink-2)">d1      1     1       1      1      0     0     0</text>
    <text x="30" y="172" class="s-sub" style="fill:var(--ink-2)">d2      1     0       0      1      1     1     0</text>
    <text x="30" y="192" class="s-sub" style="fill:var(--ink-2)">d3      1     1       0      0      0     1     1</text>
  </g>
  <text x="30" y="216" class="s-sub" style="fill:var(--ink-3)">"the" scores the same as "refund" — one each</text>

  <text x="470" y="110" class="s-label" style="fill:var(--good)">TF-IDF (rounded, before L2 norm)</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="470" y="132" class="s-sub" style="fill:var(--ink-3)">       the  order  arrived  late  refund  was  great</text>
    <text x="470" y="152" class="s-sub" style="fill:var(--ink-2)">d1     0.0   0.4     1.1    0.4    0.0    0.0   0.0</text>
    <text x="470" y="172" class="s-sub" style="fill:var(--ink-2)">d2     0.0   0.0     0.0    0.4    1.1    0.4   0.0</text>
    <text x="470" y="192" class="s-sub" style="fill:var(--ink-2)">d3     0.0   0.4     0.0    0.0    0.0    0.4   1.1</text>
  </g>
  <text x="470" y="216" class="s-sub" style="fill:var(--good)">"the" (in 3/3 docs) → 0;  "refund" (in 1/3) → highest</text>

  <line x1="30" y1="240" x2="850" y2="240" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="266" class="s-sub" style="fill:var(--ink-3)">The IDF column weights are FIT from the corpus. A word that is common in test but absent from training has no column at all — it is invisible.</text>
  <text x="30" y="288" class="s-sub" style="fill:var(--ink-3)">Bigrams add "arrived late", "was late", "was great" as columns: "late" alone cannot tell d1 from d2, but the bigrams can.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "CountVectorizer and TfidfVectorizer, and what the decisions do", code: `
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

docs = pd.Series([
    "The order arrived late. Very late.",
    "Refund requested: the order was damaged on arrival",
    "Great service, the order was early!",
    "late again, not great",
])

# COUNTS -- the default tokeniser lowercases and splits on non-word chars,
# keeping tokens of 2+ characters:
cv = CountVectorizer()
X = cv.fit_transform(docs)                          # scipy sparse, (4, n_terms)
X.shape                                             # (4, 17)
cv.get_feature_names_out()
# ['again' 'arrival' 'arrived' 'damaged' 'early' 'great' 'late' 'not'
#  'on' 'order' 'refund' 'requested' 'service' 'the' 'very' 'was' ...]
X.toarray()[0]                                      # d1: late=2, the=1, order=1, ...
#
# 17 columns from 4 short documents. On 100k reviews it is 50k+
# columns, and 99.9% of cells are zero. Keep it sparse: .toarray()
# on the real matrix is gigabytes.

# THE VOCABULARY IS THE FIT. New words at transform time vanish:
cv.transform(pd.Series(["the shipment was slow"])).toarray()
# 'the' and 'was' counted; 'shipment' and 'slow' have no column -> ignored.
#
# That is the same unseen-category problem as 7.1, with a vocabulary
# of tens of thousands instead of tens. It is why the vocabulary
# must be fit on TRAINING text: fit on all and the test set's words
# have columns the model was trained against.

# TF-IDF: reweight by how distinctive each term is.
tf = TfidfVectorizer()
Xt = tf.fit_transform(docs)
dict(zip(tf.get_feature_names_out(), tf.idf_.round(2)))
# {'the': 1.0, 'order': 1.22, 'late': 1.51, 'great': 1.51, 'refund': 1.92, ...}
#
# idf = ln((1 + N) / (1 + df)) + 1  (sklearn's smoothed form).
# 'the' is in every doc -> idf 1.0 (the floor). 'refund' is in one
# -> 1.92. Then each row is L2-normalised, so a long review and a
# short one have the same norm and cosine similarity works.

# THE DECISIONS, each a keyword argument, each changing the matrix:
tf2 = TfidfVectorizer(
    lowercase=True,            # "Late" == "late". Almost always yes.
    stop_words="english",      # drop 'the', 'was', 'on', ... -- a fixed list.
                               # Removes noise; ALSO removes 'not', which
                               # is the difference between "good" and
                               # "not good". Check the list before using it.
    ngram_range=(1, 2),        # unigrams AND bigrams: 'not great' becomes a
                               # column. Vocabulary roughly triples.
    min_df=2,                  # a term must appear in >= 2 docs. Drops
                               # typos, names, one-offs -- most of the
                               # vocabulary on a real corpus.
    max_df=0.9,                # a term in > 90% of docs is a stop word
                               # for THIS corpus, whatever the list says.
    max_features=20_000,       # keep the top-k by frequency. A hard cap
                               # on the matrix width.
    sublinear_tf=True,         # tf -> 1 + log(tf): a word appearing 20
                               # times is not 20x as important as once.
    token_pattern=r"(?u)\\b\\w\\w+\\b",    # the default: 2+ word chars.
                               # "a", "i", digits-with-dots, "$" all vanish.
)
Xt2 = tf2.fit_transform(docs)
tf2.get_feature_names_out()
# ['arrived late', 'late', 'order', 'order arrived', ...]  -- fewer, with bigrams

# WHAT stop_words="english" REMOVES THAT YOU MIGHT WANT:
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
sorted(w for w in ["not", "no", "never", "very", "against", "without"] if w in ENGLISH_STOP_WORDS)
# ['against', 'never', 'no', 'not', 'very', 'without']
#
# For sentiment, 'not' is the most important token in the language.
# Use a custom list, or no list plus max_df, or keep bigrams so
# 'not great' survives as its own term even if 'not' is dropped.

# BINARY PRESENCE instead of counts -- for short texts, presence is
# the signal and count is noise (see 7.6):
CountVectorizer(binary=True)

# CHARACTER N-GRAMS: for misspellings, morphology, short strings.
TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))
# 'refund' -> ' re', 'ref', 'efu', 'fun', 'und', 'nd ', ... A typo
# 'refnud' shares most of them. Robust; much wider vocabulary.

# A LINEAR MODEL ON THE SPARSE MATRIX is the standard pairing:
from sklearn.linear_model import LogisticRegression
y = np.array([0, 0, 1, 0])                          # 1 = positive
m = LogisticRegression().fit(Xt2, y)
# The coefficients ARE the words: the top positive and negative terms.
coef = pd.Series(m.coef_[0], index=tf2.get_feature_names_out()).sort_values()
coef.head(3), coef.tail(3)
#
# Trees on a 50k-column sparse matrix are slow and split on one word
# at a time; a linear model with L2 or L1 is fast and reads well.
`,
      hl: [21, 33, 42, 62],
      caption: "**`stop_words=\"english\"` removes 'not', 'no', 'never' and 'very'.** For sentiment, 'not' is the most important token in the language — check the list, or keep bigrams so 'not great' survives as its own term."
    },

    { t: "callout", kind: "trap", title: "The vocabulary fit on all data is a leak with fifty thousand columns", body: [
      { t: "p", text: "Fit `TfidfVectorizer` on train and test together and every test-set word has a column, with an IDF that counts the test documents. The model trains against a vocabulary shaped by the data it will be scored on. **The effect is small on a large homogeneous corpus and large on a small or shifting one** — a support-ticket model where new product names appear each month will look better than it is." },
      { t: "p", text: "Inside a Pipeline the vectoriser is fit per fold. Outside one, `fit_transform` on train and `transform` on test, every time." }
    ]},

    { t: "h2", n: "02", text: "Hashing: no vocabulary at all", id: "hashing" },

    { t: "p", text: "**The hashing trick maps each token to a column by hashing it, with no vocabulary to fit, store or leak.** The cost is collisions — two words in one column, and no way to name the column afterwards. For streams, for very large vocabularies, and for anything that must not have a fit step, it is the right tool." },

    { t: "code", lang: "python", title: "HashingVectorizer, its collisions, and when it wins", code: `
from sklearn.feature_extraction.text import HashingVectorizer

hv = HashingVectorizer(n_features=2**18, alternate_sign=True, norm="l2")
Xh = hv.transform(docs)                              # NO fit. transform only.
Xh.shape                                             # (4, 262144)
#
# Every token hashes to one of 262,144 columns. 'late' always lands
# in the same column, on any machine, on any day, with no state.

# WHAT IS LOST:
#   - the column names. hv.get_feature_names_out() does not exist.
#     A coefficient on column 173,204 is a coefficient on "whatever
#     hashes there". The model is not interpretable by word.
#   - collisions. With 50k distinct tokens in 262k buckets, ~9% of
#     tokens share a bucket with another. alternate_sign=True makes
#     half the collisions subtract rather than add, so they cancel
#     in expectation -- a small trick that measurably helps.
#   - IDF. There is no document-frequency table without a fit. Use
#     HashingVectorizer -> TfidfTransformer if IDF matters, and the
#     TfidfTransformer is then the fit step (on train).

# WHAT IS GAINED:
#   - no fit: can be applied to a stream, in parallel, before any
#     training data exists
#   - no vocabulary to store or ship: the model is the coefficients
#     and the hash function
#   - constant memory whatever the vocabulary size
#   - unseen words are not "ignored" -- they hash somewhere, and the
#     model has a (possibly zero) weight for that bucket
#   - NO VOCABULARY LEAK by construction

# THE SIZE: n_features=2**18 to 2**20 is usual. Bigger means fewer
# collisions and a wider coefficient vector; the matrix stays sparse
# regardless.

# WHEN TO USE IT:
#   streaming / online learning      the vocabulary is never final
#   >1M distinct tokens              the vocabulary does not fit
#   many short texts (URLs, agents)  the tokens are near-unique anyway
#   a strict no-fit-step requirement
# WHEN NOT:
#   you need to read the coefficients
#   the corpus is small and stable

# THE SAME IDEA FOR NON-TEXT HIGH CARDINALITY -- FeatureHasher (7.1)
# on ids, and the "hashed cross":
from sklearn.feature_extraction import FeatureHasher
fh = FeatureHasher(n_features=2**16, input_type="string")
crosses = [[f"{u}|{p}"] for u, p in zip(["u1", "u2", "u1"], ["p9", "p9", "p3"])]
fh.transform(crosses).shape                          # (3, 65536)
#
# user x product as a single hashed feature: a column per PAIR,
# without enumerating the pairs. This is how recommender and ad
# models handle billions of combinations.
`,
      hl: [3, 9, 18, 40],
      caption: "**`alternate_sign=True` makes half the collisions subtract rather than add**, so they cancel in expectation. It is a small trick and it measurably helps — and it is why the hashed matrix can hold negative counts."
    },

    { t: "h2", n: "03", text: "Embeddings", id: "embeddings" },

    { t: "p", text: "**Bag-of-words knows nothing about meaning: 'refund' and 'reimbursement' are as unrelated as 'refund' and 'giraffe'.** An embedding maps each token — or each document, or each customer ID — to a dense vector in a space where similar things are close. For text the vectors come pretrained from a model that has read far more than your corpus; for IDs they are learned from your data, and are the modern answer to high-cardinality categoricals." },

    { t: "code", lang: "python", title: "pretrained text embeddings, and learned embeddings for IDs", code: `
# PRETRAINED SENTENCE EMBEDDINGS -- one dense vector per document.
# from sentence_transformers import SentenceTransformer
# model = SentenceTransformer("all-MiniLM-L6-v2")        # 384 dims, fast
# E = model.encode(docs.tolist(), normalize_embeddings=True)
# E.shape                                                # (4, 384)
#
# Dense, fixed width, no vocabulary. "refund requested" and "I want
# my money back" land close together; bag-of-words puts them
# nowhere near. The model was trained on the internet, so it knows
# synonyms, paraphrase and a great deal of world knowledge your
# corpus does not contain.
#
# AS FEATURES: 384 numeric columns into any model. A logistic
# regression on them is a strong baseline; a tree model handles
# them too. Cosine similarity between vectors is meaningful --
# which is what makes them the foundation of retrieval.

# THE DECISIONS:
#   which model     size vs quality vs language coverage. MiniLM is
#                   small and fast; larger models embed better and
#                   cost more per document.
#   normalise       normalize_embeddings=True makes dot product ==
#                   cosine; do it unless you have a reason not to.
#   truncation      most models cap at 256-512 tokens. A long
#                   document is silently cut. Chunk it, or embed the
#                   summary, or know that only the start was read.
#   it is a fit-free TRANSFORM of each document, so nothing leaks
#                   -- but the pretrained model's knowledge is a
#                   fixed prior, and a domain it has never seen
#                   (internal jargon, product codes) embeds poorly.

# EMBEDDINGS AS AN ENCODING FOR HIGH-CARDINALITY IDS -- the entity
# embedding. A neural network learns a k-dimensional vector per
# category, trained on the target, so that categories with similar
# effects end up near each other.
#
# import torch, torch.nn as nn
# class EntityModel(nn.Module):
#     def __init__(self, n_products, dim=16, n_other=10):
#         super().__init__()
#         self.emb = nn.Embedding(n_products, dim)        # the lookup table
#         self.head = nn.Sequential(nn.Linear(dim + n_other, 64), nn.ReLU(), nn.Linear(64, 1))
#     def forward(self, product_idx, other):
#         return self.head(torch.cat([self.emb(product_idx), other], dim=1))
#
# 40,000 products x 16 dims = 640k parameters, learned end to end.
# After training, emb.weight is a (40000, 16) matrix: each product's
# learned coordinates. Products bought by the same people land near
# each other. The table can be EXTRACTED and used as 16 numeric
# features in a tree model -- which is a common pattern: train the
# net for the embedding, ship the tree.
#
# COMPARED TO 7.1-7.2:
#   one-hot           40k columns, no notion of similarity
#   target encoding   1 column, the mean target -- similarity in one
#                     dimension only
#   embedding         16 columns, learned similarity in 16 dimensions;
#                     needs a neural net and enough data per category
#
# THE LEAK IS THE SAME AS TARGET ENCODING'S: the embedding is trained
# on the target. Train it on the training split; a row's own label
# shaped its category's vector. For a small category, the vector is
# fit to a handful of labels -- regularise (weight decay on the
# embedding), and treat categories under a count threshold as one
# "rare" index, exactly as 7.1 groups them.

# UNSEEN CATEGORY: an index outside the table. Reserve index 0 as
# "unknown", map anything unseen to it, and make sure it was TRAINED
# -- by mapping the rare training categories to it too, so the
# "unknown" vector is not the untrained random initialisation.

# THE SIMPLER MIDDLE GROUND -- SVD on a co-occurrence or TF-IDF
# matrix gives dense vectors without a neural net:
from sklearn.decomposition import TruncatedSVD
svd = TruncatedSVD(n_components=50, random_state=0)
Xt_full = TfidfVectorizer(min_df=1).fit_transform(docs)
E_svd = svd.fit_transform(Xt_full)                    # (4, 50) dense
#
# Latent semantic analysis: 50 dense features from a 50k-column
# sparse matrix. Fit on train. Loses interpretability, gains
# density and some synonymy. A reasonable step before a tree model
# that cannot take the sparse matrix directly.
`,
      hl: [9, 30, 41, 60],
      caption: "**Train the net for the embedding, ship the tree.** A learned `(40000, 16)` table of product coordinates can be extracted and used as sixteen numeric features in a gradient-booster — a common pattern that gets the embedding's similarity without serving a neural network."
    },

    { t: "table",
      head: ["Method", "Output", "Fit step", "Unseen token / category", "Interpretable", "Use when"],
      rows: [
        ["Bag of words (counts)", "Sparse, vocab-wide", "Vocabulary on train", "Ignored", "Yes — columns are words", "Small corpus, presence matters, baseline"],
        ["TF-IDF", "Sparse, vocab-wide, normalised", "Vocabulary + IDF on train", "Ignored", "Yes", "**The default** for text into a linear model"],
        ["Hashing", "Sparse, fixed width", "**None**", "Hashed to a bucket", "No", "Streams, huge vocabularies, no-fit constraint"],
        ["Char n-grams", "Sparse, very wide", "Vocabulary on train", "Partially matched", "Partly", "Typos, morphology, short strings, codes"],
        ["SVD on TF-IDF (LSA)", "Dense, k dims", "Vocabulary + SVD on train", "Ignored then projected", "No", "Dense input for a tree; some synonymy"],
        ["Pretrained sentence embedding", "Dense, 384–1024 dims", "None (transform only)", "Embedded by the model", "No", "Meaning matters; small labelled set; retrieval"],
        ["Learned entity embedding", "Dense, k dims per category", "Trained on target, on train", "Reserved 'unknown' index", "No", "Very high-cardinality IDs with enough data per category"]
      ],
      caption: "**Every row except hashing and pretrained embeddings has a fit step, and every fit step leaks if it sees test data.** The two without a fit step pay for it — hashing in interpretability and collisions, pretrained embeddings in domain fit."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A ticket classifier whose vocabulary cannot leak",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Support tickets arrive with free text and a category label. Build the text feature pipeline — TF-IDF with deliberate vocabulary decisions, plus a hashed fallback — inside a Pipeline so the vocabulary is fit per fold; show the coefficient-as-words interpretation; measure the vocabulary leak by fitting the vectoriser on all data and comparing; and demonstrate that the stop-word list would have removed the token that carries the strongest signal." },
        { t: "p", text: "Then show a hashed version scoring within a point of TF-IDF with no fit step, and an unseen-word test proving new product names do not crash either." }
      ],
      requirements: [
        "TfidfVectorizer inside a Pipeline with a linear classifier; CV score.",
        "Vocabulary decisions stated: case, n-grams, min_df, max_df, sublinear TF, and a custom stop list that keeps negations.",
        "Top positive and negative terms per class from the coefficients.",
        "Leak measurement: vectoriser fit on all data vs inside the fold, on a small corpus.",
        "Hashed pipeline within ~1 AUC point, and an unseen-word test for both.",
        "A test that the default stop list removes a signal-bearing negation."
      ],
      hint: "Make the corpus small — a few hundred tickets — and make new product names appear in the 'test' half. That is where the vocabulary leak shows.",
      solution: {
        lang: "python",
        title: "ticket_text.py",
        code: `import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, HashingVectorizer, ENGLISH_STOP_WORDS
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score, StratifiedKFold, train_test_split
from sklearn.metrics import roc_auc_score


# =========================================================================
# A SYNTHETIC TICKET CORPUS with known structure
# =========================================================================

REFUND = ["refund", "money back", "charged twice", "reimburse", "not received", "cancel"]
PRAISE = ["great", "thanks", "resolved", "helpful", "quick", "brilliant"]
NEUTRAL = ["order", "account", "delivery", "update", "please", "the", "my", "was", "is", "and"]
PRODUCTS_TRAIN = ["alpha", "beta", "gamma"]
PRODUCTS_NEW = ["delta", "epsilon"]                 # appear only in the test half


def make_corpus(n=600, seed=0, products=PRODUCTS_TRAIN):
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n):
        y = int(rng.random() < 0.4)                  # 1 = refund request
        words = list(rng.choice(NEUTRAL, 6))
        words += list(rng.choice(REFUND if y else PRAISE, 2))
        # NEGATION: "not great" is a refund signal; "not charged" is praise
        if rng.random() < 0.3:
            words += ["not", "great"] if y else ["not", "charged"]
        words.append(rng.choice(products))
        rng.shuffle(words)
        rows.append({"text": " ".join(words), "y": y})
    return pd.DataFrame(rows)


# =========================================================================
# THE VOCABULARY DECISIONS, stated
# =========================================================================

KEEP = {"not", "no", "never", "without", "against", "very"}
STOP = sorted(ENGLISH_STOP_WORDS - KEEP)             # the list, minus negations


def tfidf_pipeline():
    return make_pipeline(
        TfidfVectorizer(
            lowercase=True,
            stop_words=STOP,
            ngram_range=(1, 2),                      # "not great" survives as a term
            min_df=2,                                # drop one-off tokens
            max_df=0.95,
            sublinear_tf=True,
        ),
        LogisticRegression(C=2.0, max_iter=2000),
    )


def hashed_pipeline():
    return make_pipeline(
        HashingVectorizer(n_features=2**16, ngram_range=(1, 2), alternate_sign=True,
                          norm="l2", stop_words=STOP),
        LogisticRegression(C=2.0, max_iter=2000),
    )


def cv_auc(pipe, X, y):
    return cross_val_score(pipe, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=0),
                           scoring="roc_auc").mean()


def top_terms(pipe, k=5):
    vec, clf = pipe.named_steps["tfidfvectorizer"], pipe.named_steps["logisticregression"]
    coef = pd.Series(clf.coef_[0], index=vec.get_feature_names_out()).sort_values()
    return coef.tail(k).index.tolist(), coef.head(k).index.tolist()


# =========================================================================
# THE LEAK, MEASURED
# =========================================================================

def vocabulary_leak(train, test):
    """Fit the vectoriser on all text (leaky) vs on train only (honest);
    train the classifier on train either way; score on test."""
    # HONEST
    honest = tfidf_pipeline().fit(train["text"], train["y"])
    auc_honest = roc_auc_score(test["y"], honest.predict_proba(test["text"])[:, 1])
    vocab_honest = set(honest.named_steps["tfidfvectorizer"].get_feature_names_out())

    # LEAKY: vocabulary and IDF from train + test
    vec = TfidfVectorizer(lowercase=True, stop_words=STOP, ngram_range=(1, 2),
                          min_df=2, max_df=0.95, sublinear_tf=True)
    vec.fit(pd.concat([train["text"], test["text"]]))
    clf = LogisticRegression(C=2.0, max_iter=2000).fit(vec.transform(train["text"]), train["y"])
    auc_leaky = roc_auc_score(test["y"], clf.predict_proba(vec.transform(test["text"]))[:, 1])
    vocab_leaky = set(vec.get_feature_names_out())

    return {"auc_honest": round(auc_honest, 4), "auc_leaky": round(auc_leaky, 4),
            "vocab_honest": len(vocab_honest), "vocab_leaky": len(vocab_leaky),
            "test_only_terms": sorted(vocab_leaky - vocab_honest)[:10]}


# =========================================================================
# TESTS
# =========================================================================

def test_tfidf_pipeline_scores_well():
    df = make_corpus()
    assert cv_auc(tfidf_pipeline(), df["text"], df["y"]) > 0.9


def test_top_terms_are_the_planted_signals():
    df = make_corpus()
    p = tfidf_pipeline().fit(df["text"], df["y"])
    pos, neg = top_terms(p, k=8)
    assert any(t in pos for t in ["refund", "money back", "charged twice", "reimburse", "not great"])
    assert any(t in neg for t in ["great", "thanks", "resolved", "helpful", "not charged"])


def test_negation_bigram_survives_and_carries_signal():
    df = make_corpus()
    p = tfidf_pipeline().fit(df["text"], df["y"])
    vec, clf = p.named_steps["tfidfvectorizer"], p.named_steps["logisticregression"]
    names = list(vec.get_feature_names_out())
    assert "not great" in names and "not charged" in names
    coef = dict(zip(names, clf.coef_[0]))
    assert coef["not great"] > 0 and coef["not charged"] < 0      # opposite signs to their unigrams


def test_default_stop_list_removes_the_negation():
    """What stop_words='english' would have done."""
    assert "not" in ENGLISH_STOP_WORDS
    df = make_corpus()
    vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=2).fit(df["text"])
    names = set(vec.get_feature_names_out())
    assert "not" not in names and "not great" not in names
    # and the model is measurably worse without it
    default = make_pipeline(TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=2),
                            LogisticRegression(C=2.0, max_iter=2000))
    assert cv_auc(tfidf_pipeline(), df["text"], df["y"]) > cv_auc(default, df["text"], df["y"]) + 0.01


def test_vocabulary_leak_is_visible_on_a_shifting_corpus():
    train = make_corpus(n=300, seed=1, products=PRODUCTS_TRAIN)
    test = make_corpus(n=300, seed=2, products=PRODUCTS_NEW)     # new product names
    r = vocabulary_leak(train, test)
    assert r["vocab_leaky"] > r["vocab_honest"]
    assert any(p in " ".join(r["test_only_terms"]) for p in PRODUCTS_NEW)
    # the leaky score is not lower; on small shifting corpora it is often higher
    assert r["auc_leaky"] >= r["auc_honest"] - 0.02


def test_hashed_pipeline_is_close_and_has_no_fit():
    df = make_corpus()
    t = cv_auc(tfidf_pipeline(), df["text"], df["y"])
    h = cv_auc(hashed_pipeline(), df["text"], df["y"])
    assert abs(t - h) < 0.03, (t, h)
    hv = hashed_pipeline().named_steps["hashingvectorizer"]
    assert not hasattr(hv, "vocabulary_")


def test_unseen_words_do_not_crash_either():
    df = make_corpus()
    new = pd.Series(["zeta omega refund please", "kappa thanks resolved"])
    for pipe in (tfidf_pipeline(), hashed_pipeline()):
        pipe.fit(df["text"], df["y"])
        p = pipe.predict_proba(new)[:, 1]
        assert p[0] > p[1]                          # refund > praise, ignoring the unknown words


def test_matrix_is_sparse():
    df = make_corpus()
    X = tfidf_pipeline().named_steps["tfidfvectorizer"].fit_transform(df["text"])
    assert hasattr(X, "nnz")
    assert X.nnz / (X.shape[0] * X.shape[1]) < 0.1


def test_min_df_drops_one_off_tokens():
    df = make_corpus()
    df.loc[0, "text"] += " uniquetoken12345"
    vec = tfidf_pipeline().named_steps["tfidfvectorizer"].fit(df["text"])
    assert "uniquetoken12345" not in vec.get_feature_names_out()`,
        notes: [
          { t: "p", text: "**The custom stop list keeps the negations, and the test shows why.** `\"not great\"` gets a positive coefficient and `\"not charged\"` a negative one — opposite signs to their unigrams — and the default `\"english\"` list would have removed `not` and every bigram containing it, at a measurable cost in AUC." },
          { t: "callout", kind: "insight", title: "The vocabulary leak shows up on a shifting corpus", body: [
            { t: "p", text: "Training tickets mention products alpha, beta and gamma; test tickets mention delta and epsilon. **Fit on all text and the leaky vocabulary contains the new product names — columns the classifier trained against that would not exist in production.** On a large, stable corpus the effect is small; on a small or drifting one, which support tickets always are, it is not." }
          ]},
          { t: "p", text: "**Bigrams are what let the classifier read negation without a parser.** `\"not great\"` is one column with its own coefficient, so the model does not need to learn that `not` flips `great` — it just learns the pair. The vocabulary roughly triples, and `min_df=2` prunes most of the growth." },
          { t: "p", text: "**The hashed pipeline scores within three points and has no `vocabulary_` attribute.** Nothing was fit in the vectoriser, so nothing could leak; the cost is that the model's coefficients are on buckets, not words, and the top-terms function cannot run on it." },
          { t: "p", text: "**Unseen words are handled differently by the two pipelines and both survive.** TF-IDF ignores `zeta` and `omega` — no column — and scores the ticket on `refund`; hashing sends them to buckets the model has a weight for, likely near zero. Neither raises, and both rank the refund ticket above the thanks." },
          { t: "p", text: "**`top_terms` is the interpretability dividend of a linear model on TF-IDF.** The coefficients are words; the strongest positive and negative terms per class are a sanity check that the model learned the planted signal and not a spurious token." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A sentiment model uses `TfidfVectorizer(stop_words=\"english\")`. What has it lost?",
          options: [
            "Nothing important; stop words are noise",
            "The negations — 'not', 'no', 'never' are on the list — so 'not good' and 'good' become the same feature",
            "Only the articles 'the' and 'a'",
            "The ability to handle uppercase"
          ],
          answer: 1,
          why: "The English stop list contains the most important sentiment tokens in the language. Use a custom list that keeps negations, or `max_df` to drop corpus-specific common words instead, or bigrams so 'not good' survives as its own term regardless."
        }
      ]
    }
  ],

  takeaways: [
    "**Bag-of-words discards order and keeps counts** — a document is a sparse row over a vocabulary fit from the training corpus.",
    "**Words not in the vocabulary are invisible at transform time** — the unseen-category problem with fifty thousand categories.",
    "**TF-IDF down-weights words that appear everywhere and up-weights distinctive ones**, then L2-normalises rows so lengths are comparable.",
    "**`stop_words=\"english\"` removes 'not', 'no', 'never' and 'very'** — check the list, keep the negations, or rely on bigrams.",
    "**Bigrams let a linear model read negation without a parser**: 'not great' is one column with its own sign.",
    "**`min_df` prunes one-off tokens; `max_df` finds this corpus's own stop words; `sublinear_tf` stops 20 occurrences counting 20×.**",
    "**Keep the matrix sparse** — `.toarray()` on a real corpus is gigabytes.",
    "**A linear model is the natural consumer** and its coefficients are words; trees on a sparse 50k-column matrix are slow and split one word at a time.",
    "**The vocabulary and IDF are fit steps and leak if fit on test text** — small on a stable corpus, large on a shifting one.",
    "**Hashing has no fit step, no vocabulary, no leak, constant memory** — and pays in collisions and in unreadable coefficients.",
    "**Pretrained sentence embeddings know synonyms your corpus does not** — dense, fit-free, and truncated silently past the model's token limit.",
    "**Learned entity embeddings are the modern encoding for very high-cardinality IDs** — trained on the target, so they leak like target encoding and need a trained 'unknown' index.",
    "**Train the net for the embedding, ship the tree** — the learned table is sixteen numeric features any model can take."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is a `HashingVectorizer` immune to vocabulary leakage?",
        options: [
          "It uses a fixed English vocabulary",
          "It has no fit step — each token maps to a column by hashing, so nothing is learned from any data and the test set cannot shape the columns",
          "It lowercases everything",
          "It is not; it leaks the same way"
        ],
        answer: 1,
        why: "There is no vocabulary to fit, store or contaminate. The price is collisions — two tokens in one bucket, softened by `alternate_sign` — and coefficients on buckets rather than words. IDF, if wanted, is a separate `TfidfTransformer` that is then the fit step."
      },
      {
        stem: "What does the IDF term do to a word that appears in every document?",
        options: [
          "Doubles its weight",
          "Drives its weight to the floor — `log(N/df)` with df = N is zero (or 1 in sklearn's smoothed form), so a ubiquitous word contributes almost nothing",
          "Removes the document",
          "Leaves it unchanged"
        ],
        answer: 1,
        why: "IDF measures how distinctive a term is across the corpus. 'The' is in every document and says nothing about any of them; 'refund' is in a few and says a lot. The weights are fit from the training corpus and applied unchanged at transform time."
      },
      {
        stem: "A learned entity embedding for 40,000 product IDs is trained on the target. What leakage risk does it carry?",
        options: [
          "None; embeddings are unsupervised",
          "The same as target encoding — each row's label shaped its product's vector, so it must be trained on the training split only, with rare products merged into a trained 'unknown' index",
          "Only if the dimension is too large",
          "Only for unseen products"
        ],
        answer: 1,
        why: "The embedding is fit to the target by gradient descent; a product with three rows has a vector fit to three labels. Train on the training split, regularise the embedding, group rare IDs into an 'unknown' index that is itself trained — the same discipline as 7.1 and 7.2, in a different representation."
      },
      {
        stem: "A pretrained sentence-embedding model has a 256-token limit and is given a 2,000-word ticket. What happens?",
        options: [
          "It raises an error",
          "The text is silently truncated — only the beginning is embedded, and the resolution described at the end is never read",
          "It embeds the whole text at lower quality",
          "It splits the text automatically"
        ],
        answer: 1,
        why: "Most embedding models truncate without warning. Chunk long documents and pool the chunk vectors, embed a summary, or at least know which part was read — a ticket whose outcome is in the final paragraph embeds as its opening complaint."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you turn free text into features for a classifier?",
        strong: "TF-IDF into a linear model as the baseline: tokenise, lowercase, unigrams and bigrams so negation survives as a term, a custom stop list that keeps 'not', `min_df` to prune one-offs, sublinear TF. The matrix stays sparse and the coefficients are words, which makes the model checkable. The vectoriser is a fit step — vocabulary and IDF — so it lives inside the Pipeline and is fit per fold. If the vocabulary is huge or the data streams, hashing removes the fit step at the cost of readability. If meaning matters more than words, a pretrained sentence embedding.",
        answer: [
          { t: "p", text: "Saying 'the vectoriser is a fit step' and where it lives is what distinguishes someone who has leaked a vocabulary from someone who has not yet." }
        ]
      },
      {
        level: "advanced",
        q: "What are the trade-offs between TF-IDF, hashing and embeddings?",
        strong: "TF-IDF is interpretable — coefficients are words — and needs a vocabulary fit on training text, which can leak and which makes unseen words invisible. Hashing has no fit, no vocabulary and constant memory, so it suits streams and huge vocabularies, and pays with collisions and unreadable columns. Pretrained embeddings are dense, fit-free and know synonyms the corpus does not, but they are a fixed prior that embeds domain jargon poorly and silently truncates long text. On a small labelled set embeddings usually win; on a large domain-specific corpus TF-IDF often does; hashing is the choice when there must be no fit step.",
        answer: [
          { t: "p", text: "Ending with when each wins, rather than a ranking, is the honest answer." }
        ]
      },
      {
        level: "advanced",
        q: "How does an entity embedding relate to target encoding?",
        strong: "It is target encoding in k dimensions. Target encoding gives each category one number — the mean target — fit on the training labels. An entity embedding gives each category a learned vector, fit on the same labels by a network, so categories with similar effects end up near each other in more than one dimension. Same leakage: train on the training split, regularise, merge rare categories into a trained 'unknown'. And the learned table can be extracted and handed to a tree model as k numeric columns — the net is the encoder, the tree is the model.",
        answer: [
          { t: "p", text: "Framing the embedding as target encoding generalised — same leak, same fixes — shows the concepts are connected rather than memorised separately." }
        ]
      }
    ]
  }
});
