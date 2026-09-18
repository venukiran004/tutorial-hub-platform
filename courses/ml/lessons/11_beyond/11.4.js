/* ============================================================================
   LESSON 11.4 — Recommender Systems
   ========================================================================= */
EC.receiveLesson({
  id: "11.4",

  lede: "**A recommender predicts what a person will want from what people like them have wanted — and the interesting part is what 'like them' means, what 'wanted' means when nobody says so, and how to score a list rather than a number.** Neighbourhood collaborative filtering is worked on a five-by-six matrix: Ann's Pearson similarity to Ed is 0.969, to Di −1.000, and her predicted rating for the item only her anti-neighbours liked is 3.00 by the user route and off the scale by the item route. Matrix factorisation on a 500 × 200 matrix takes the RMSE from a bias baseline of 0.956 to 0.609 with alternating least squares, with the generating rank of 8 recovered by validation and the regulariser shown to matter more than the rank. Clicks are not ratings: on implicit feedback a weighted factorisation (WRMF) and pairwise ranking (BPR) reach an NDCG@10 of 0.159 and 0.144 against popularity's 0.064, and NDCG is worked by hand. Thirty items nobody has clicked are ranked at 0.406 by content features and at chance by every collaborative method; a user with no history is served best by popularity. And a system that only exploits its own scores shows 27 of 200 items, settles at 72 % of the achievable clicks and never learns what it is missing, where Thompson sampling shows all 200 and reaches 99 %.",

  objectives: [
    "Compute user-based and item-based collaborative filtering predictions by hand and explain when they disagree",
    "Fit matrix factorisation by ALS and by SGD, choose rank and regularisation by validation, and read the noise floor",
    "Model implicit feedback with confidence-weighted factorisation and pairwise ranking, and evaluate with precision, recall, NDCG and MAP",
    "Handle cold-start items and users with content features, popularity and switching hybrids, with the evidence for each",
    "Explain the exposure feedback loop and why a recommender must explore"
  ],

  prerequisites: ["5.1", "7.4", "11.2"],

  blocks: [

    { t: "h2", n: "01", text: "Neighbourhood collaborative filtering, by hand", id: "cf" },

    { t: "code", lang: "text", title: "Five users, six items, 0 = unrated (executed)",
      code: `        i1  i2  i3  i4  i5  i6
Ann      5   3   ·   1   4   ·
Ben      4   ·   ·   1   5   2
Cy       1   1   5   ·   1   4
Di       ·   1   4   5   ·   5
Ed       5   4   ·   2   4   ·

USER-BASED: predict Ann's rating of i3.  Pearson similarity on co-rated items:
   Ann–Ben  3 co-rated  r = +0.885        Ann–Cy  3 co-rated  r = 0.000        Ann–Di  2 co-rated  r = −1.000        Ann–Ed  4 co-rated  r = +0.969
neighbours who rated i3: Cy (0.000), Di (−1.000);  Ann's mean 3.25, Cy's 2.40, Di's 3.75
   r̂(Ann, i3) = μ_Ann + Σ sim·(r − μ_u) / Σ|sim| = 3.25 + (0.000·(5 − 2.40) + (−1.000)·(4 − 3.75)) / 1.000 = 3.000

ITEM-BASED: adjusted cosine between items (ratings minus each user's mean), over the items Ann rated:
   sim(i3, i1) = −1.000   sim(i3, i2) = −0.537   sim(i3, i4) = +1.000   sim(i3, i5) = −1.000
   r̂(Ann, i3) = Σ sim·r_Ann / Σ|sim| = −2.717  -- off the scale: with two or three co-raters per pair the similarities are ±1 and the estimate is noise`,
      caption: "User-based CF asks 'what did people like Ann think of i3'; item-based asks 'how does i3 relate to the items Ann rated'. Both mean-centre, because Cy rates everything low and Di high. Both fail on a matrix this sparse — Ann's only neighbours who rated i3 are the two she agrees with least — and item-based fails louder because its similarities are computed on two or three shared ratings each. Item-based is the production choice at scale (item similarities are stable and precomputable; users change daily), with a minimum-support rule and shrinkage on similarities computed from few pairs." },

    { t: "h2", n: "02", text: "Matrix factorisation: ALS and SGD", id: "mf" },

    { t: "p", text: "Model each rating as a global mean plus a user bias, an item bias and the dot product of a user vector and an item vector: r̂_ui = μ + b_u + b_i + p_uᵀq_i. The vectors are k latent factors learned only from the observed entries — Funk's SVD from the Netflix prize, which is not an SVD because an SVD would need every entry. Two solvers: alternating least squares fixes the item vectors and solves a ridge regression for each user (and vice versa), which is exact per step and parallel; stochastic gradient descent visits each observed rating and nudges its user and item vectors by the error, which is cheap per step and handles biases naturally." },

    { t: "code", lang: "python", title: "500 users × 200 items generated from rank 8 with biases and noise sd 0.4; 15 % observed, 80 / 20 split (executed)",
      code: `global mean baseline          RMSE 1.1201
user + item bias baseline     RMSE 0.9556                    <- always fit the biases first; they are half the story

ALS on the residuals, k = 8, λ = 3:  RMSE by iteration 1 / 3 / 5 / 10 / 15:  0.9532  0.8398  0.7284  0.6389  0.6376   (0.2 s)
   λ =  0.1  0.7157      λ = 1  0.6090      λ = 3  0.6381      λ = 10  0.8557      λ = 30  0.9556   <- λ = 30 shrinks the factors to nothing: the bias baseline again
   k =  2    0.8770      k = 4  0.7990      k = 8  0.6377      k = 16  0.6862      k = 32  0.7088   <- the generating rank wins, but λ moved the error more than k did
SGD with biases, k = 8, λ 0.05, lr 0.01:  epoch 1 / 5 / 10 / 20 / 40:  1.0174  0.9576  0.9567  0.9498  0.8815   (4.8 s)  -- still converging
the noise floor: the generator's noise sd is 0.4, so no model can reach below about 0.40 on these test ratings`,
      caption: "Regularisation is the decisive hyperparameter: with 24 observed ratings per user and 8 factors, an unregularised solve over-fits, and too much shrinks the factors to zero and returns the bias baseline. The rank is chosen by the same validation curve, and it is not the case that more factors are better. ALS converges in a handful of passes; SGD needs many epochs and a learning-rate schedule, but scales to data that do not fit a per-user solve and to extra terms — time-dependent biases, implicit signals — that the Netflix-prize models used." },

    { t: "h2", n: "03", text: "Implicit feedback: clicks, not ratings", id: "implicit" },

    { t: "p", text: "Most systems never see a rating. They see clicks, views, purchases and dwell — positive-only signals with no negatives: an unclicked item was not necessarily disliked, it was probably never shown. Two ideas turn this into a learning problem. **WRMF** (Hu, Koren and Volinsky) treats every entry as a preference — 1 if clicked, 0 otherwise — with a *confidence* 1 + α·count, so that observed clicks are weighted heavily and unobserved entries lightly, and solves it by ALS over the full matrix, which its algebra makes tractable. **BPR** (Rendle et al.) gives up on absolute scores and learns a ranking: for a user, a clicked item should score above an unclicked one, optimised by sampling (user, clicked, unclicked) triples and taking gradient steps on the sigmoid of the score difference." },

    { t: "code", lang: "python", title: "14,246 clicks over 500 users (28.5 each); one fifth of each user's clicks held out; top-10 lists (executed)",
      code: `#  model                              P@10     R@10     NDCG@10   MAP@10   hit rate
#  popularity                         0.0440   0.0842   0.0642    0.0258    0.370
#  WRMF (implicit ALS, α 10, k 16)    0.1038   0.1941   0.1590    0.0753    0.654     (0.2 s)
#  BPR (pairwise SGD, 30 epochs)      0.0960   0.1767   0.1438    0.0648    0.656     (6.0 s)

NDCG by hand, top 5, relevance (1, 0, 1, 0, 0):   DCG = 1/log₂2 + 1/log₂4 = 1.5000;  ideal (1, 1, 0, 0, 0): 1.6309;  NDCG = 0.9197
the same two hits at ranks 4 and 5:               NDCG = 0.5013                       -- position is the whole point of the metric`,
      caption: "Both implicit models more than double popularity's precision and reach two thirds of users with at least one hit in ten. The metrics answer different questions: precision@K is the share of the list that was right, recall@K the share of the user's held-out clicks the list found, NDCG@K rewards putting the hits early with a logarithmic discount, MAP averages precision at each hit, and hit rate is the share of users the list helped at all. The exercise shows the models' ordering flip as the data thin out and WRMF's confidence weight α tuned by validation (0.162 at α = 1, 0.120 at α = 100)." },

    { t: "callout", kind: "trap", title: "The offline metric is not the online outcome", body: "Held-out clicks were generated by the old system's exposure: a model that reproduces what was shown scores well and a model that would have surfaced something better scores badly, because the user never had the chance to click it. Offline ranking metrics select candidates; 11.1's A/B test or interleaving decides. Popularity bias compounds it — the held-out set is dominated by items that were popular, which is why popularity is a strong offline baseline and a weak product." },

    { t: "h2", n: "04", text: "Content, hybrids and the cold start", id: "cold" },

    { t: "code", lang: "python", title: "30 cold items nobody has clicked; 100 users with their history cut to n clicks (executed; NDCG@10)",
      code: `# each item has six binary 'genre' features; a user's profile is the mean of the features of the items they clicked; content score = cosine(profile, item)
#  model                                     warm items (497 users)    the 30 cold items ranked among themselves (490 users)
#  WRMF (collaborative)                          0.1845                     0.2404      <- an untrained item vector: chance order
#  content-based (profile · genres)              0.1216                     0.4057      <- the only method with anything to say
#  popularity                                    0.0686                     0.2404
#  random                                        0.0503                     0.2700
#  hybrid: standardised WRMF + 0.5 × content     0.1904                     (switch to content: WRMF has nothing)

# cold USERS: the same 100 users, training clicks cut to n
#  n known clicks     WRMF     content   popularity
#      0             0.0369    0.0369     0.0551      <- no history: only popularity has a signal
#      1             0.0724    0.0751     0.0538
#      3             0.0554    0.0674     0.0509
#     10             0.1366    0.1025     0.0577      <- by ten clicks the collaborative model has overtaken`,
      caption: "Collaborative filtering needs interactions on both sides: a new item has no vector and a new user has no row, and no amount of factorisation helps. Content features carry a new item from its first day; popularity is the only honest answer for a user with no history; and a switching hybrid — content or popularity below a threshold of interactions, collaborative above — is the standard design. The weighted hybrid on warm items (0.190 against 0.185) shows content also adds a little where the collaborative signal is thin." },

    { t: "table", head: ["Approach", "Needs", "Strength", "Weakness"], rows: [
      ["User-based CF", "ratings from similar users", "intuitive, no item features", "sparse similarities; users change; O(users²)"],
      ["Item-based CF", "co-ratings of items", "stable, precomputable, explainable ('because you liked …')", "cold items; popularity bias"],
      ["Matrix factorisation", "many interactions", "compact, accurate, scales", "cold users and items; not explainable"],
      ["WRMF / BPR", "implicit signals", "the right objective for clicks", "negative sampling and confidence are hyperparameters"],
      ["Content-based", "item features", "cold items; diversity by design", "limited discovery; feature quality"],
      ["Hybrid (switch, weight, cascade)", "both", "covers the cold start", "more to tune and to explain"]
    ] },

    { t: "h2", n: "05", text: "The feedback loop: explore or stagnate", id: "explore" },

    { t: "code", lang: "python", title: "200 items with true click rates; a system that shows its top 10 each round, 2,000 impressions a round, 200 rounds, 20 seeds (executed)",
      code: `# the initial estimates are the historical popularity, which is unrelated to the true rates; the ten best items would yield 496 clicks a round
#  policy          total clicks     clicks a round, last 20 rounds     items ever shown     Gini of exposure
#  exploit only        70,187            355   (72 % of the oracle)         27 of 200             0.949
#  ε-greedy 0.1        81,780            444   (90 %)                      134 of 200             0.878
#  Thompson            91,925            493   (99 %)                      200 of 200             0.848`,
      caption: "A recommender trains on the clicks it caused. Show only the current top 10 and the estimates of the other 190 never change; the system converges on the best of what it happened to show and cannot know what it did not. Exploration is not a tax on accuracy — here it earned 31 % more clicks — and Thompson sampling (11.2) does it in proportion to uncertainty. The same loop produces filter bubbles and popularity concentration; exposure Gini and catalogue coverage belong on the dashboard beside click rate." },

    { t: "ladder",
      title: "Building a recommender for a catalogue with clicks and a few ratings",
      rungs: [
        { level: "bad", label: "Item-based CF on the ratings, ranked by predicted rating", code: `sim = adjusted_cosine(R); score = Σ sim · r_user / Σ|sim|`,
          note: "**Ratings are a few percent of the signal; the predictions are noise where the co-rating counts are small (−2.7 on a 1–5 scale above); new items never appear; and a rating model is not a click model.**" },
        { level: "ok", label: "WRMF on the clicks, popularity for new users, content for new items", code: `score = WRMF(clicks, α tuned by NDCG on held-out clicks)     # 0.159 vs popularity 0.064
if n_clicks(user) < 3: popularity;  if item is new: content score`,
          note: "The right objective and the cold-start switch. Still exploit-only: it will settle on 72 % of what it could earn and never find out." },
        { level: "best", label: "Implicit factorisation plus content in a switching hybrid, exploration by Thompson sampling, offline NDCG for candidates and an A/B test for the decision, exposure monitored", code: `candidates = WRMF ∪ content ∪ popular;  rank by score + a posterior sample per item
offline: NDCG@10, hit rate, coverage;  online: interleaving / A/B on clicks and retention;  monitor catalogue coverage and exposure Gini`,
          note: "Serves new users and items, keeps learning, and is judged by what people do rather than by what the old system showed them." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "User-based CF predicted 3.00 for Ann's rating of i3 and item-based −2.72. What went wrong with the item-based estimate?",
          options: [
            "Item-based CF cannot handle missing ratings",
            "Its item similarities were each computed on two or three co-raters, so they came out at exactly ±1, and a weighted average of Ann's ratings by such similarities is noise; item-based CF needs a minimum support per pair and shrinkage of similarities toward zero when the count is small",
            "Ann's mean was not subtracted",
            "The adjusted cosine is the wrong similarity"
          ],
          answer: 1,
          why: "Both routes are estimates from neighbours, and the quality of a similarity is the number of shared ratings behind it. With five users there are almost none; in production, item-item similarities are computed over thousands of co-raters, shrunk when the count is low, and restricted to the top-k neighbours."
        },
        {
          stem: "ALS reached RMSE 0.609 at λ = 1 and 0.956 at λ = 30 — the bias baseline exactly. Why?",
          options: [
            "A large λ makes ALS diverge",
            "λ = 30 penalises the factor vectors so hard that they shrink to zero, leaving only μ + b_u + b_i, which is the bias baseline; regularisation is a dial between over-fitting 24 ratings per user with 8 free factors and fitting nothing at all",
            "The biases were re-estimated at λ = 30",
            "λ only affects the item vectors"
          ],
          answer: 1,
          why: "The ridge solve per user is (QᵀQ + λI)⁻¹Qᵀr; as λ grows the solution goes to zero. The validation curve over λ moved the error by 0.35, the curve over k by 0.24 — the regulariser is the hyperparameter to tune first, and the rank second."
        },
        {
          stem: "Why is a rating model the wrong objective for click data, even when it can be trained?",
          options: [
            "Because clicks are integers",
            "Because unclicked items are not negatives — most were never shown — so treating the matrix as ratings with zeros learns 'never shown' as 'disliked'; WRMF weights the zeros by low confidence and BPR only asks that clicked items outrank unclicked ones",
            "Because rating models cannot use biases",
            "Because clicks are too sparse for ALS"
          ],
          answer: 1,
          why: "Implicit feedback is positive-only and confounded by exposure. WRMF's confidence weighting and BPR's pairwise objective are the two standard ways to encode 'a click is evidence, its absence is weak evidence', and both beat popularity by a factor of two on NDCG here."
        },
        {
          stem: "In the exposure simulation the exploit-only policy showed 27 of 200 items and settled at 72 % of the achievable clicks. What is the mechanism, and what does it look like in a real system?",
          options: [
            "A bug in the estimates",
            "The system learns only from the clicks it causes: items it never shows keep their (wrong) initial estimates for ever, so it converges on the best of what it happened to show; in production it appears as popularity concentration, a shrinking catalogue and filter bubbles, and the remedy is deliberate exploration",
            "The click rates changed over time",
            "Ten items is too few to show"
          ],
          answer: 1,
          why: "Thompson sampling showed every item and reached 99 % of the oracle; ε-greedy 90 %. The exploration's cost is small and its absence is invisible — no metric on the exploit-only system reports what it did not learn — which is why catalogue coverage and exposure Gini are monitored beside click rate."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "A prediction by hand, ranking metrics by hand, and the models as the data thin",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Uma rates (4, ·, 5, 2), Vic (5, 3, 4, 1) and Wen (1, 4, 2, 5) on four items. Compute Uma's Pearson similarity with Vic and with Wen on co-rated items, the three users' means, and the user-based prediction of Uma's rating of item 2." },
        { t: "p", text: "**(b)** Two rankings of five items, three of which are relevant: A = (1, 1, 0, 1, 0) and B = (0, 1, 1, 0, 1). Compute DCG, ideal DCG, NDCG@5, precision at each rank and AP@5 for both." },
        { t: "p", text: "**(c)** On a fresh 500 × 200 click matrix, keep 100 %, 50 %, 25 % and 10 % of the training clicks and report NDCG@10 for popularity, WRMF and BPR; then sweep WRMF's confidence α over 1, 10, 40, 100 on the full data." }
      ],
      requirements: [
        "(a) two similarities, three means, one prediction with the arithmetic.",
        "(b) five numbers per ranking.",
        "(c) a four-row table and a four-row sweep."
      ],
      hint: "(a) Vic and Wen are mirror images of each other. (b) The ideal DCG is the same for both. (c) Pairwise ranking needs enough pairs.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) Uma–Vic: 3 co-rated, r = +0.8386, Vic's mean 3.25;  Uma–Wen: 3 co-rated, r = −0.8386, Wen's mean 3.00;  Uma's mean 3.6667
#     r̂ = 3.6667 + (0.8386·(3 − 3.25) + (−0.8386)·(4 − 3.00)) / (0.8386 + 0.8386) = 3.0417
#     Wen's 4 counts AGAINST item 2 because Wen disagrees with Uma; the negative neighbour is as informative as the positive one.

# (b)                  DCG                                        NDCG@5   precision@1..5                 AP@5
#     A (1,1,0,1,0)    1/log₂2 + 1/log₂3 + 1/log₂5 = 2.0616       0.9675   1.00 1.00 0.667 0.75 0.60      0.9167
#     B (0,1,1,0,1)    1/log₂3 + 1/log₂4 + 1/log₂6 = 1.5178       0.7123   0.00 0.50 0.667 0.50 0.60      0.5889
#     ideal DCG (1,1,1,0,0) = 2.1309.  Same three hits; A's are earlier; both metrics say so, AP more sharply.

# (c) training clicks kept   clicks / user   popularity   WRMF     BPR
#     100 %                     23.1          0.0755    0.1518   0.1635
#      50 %                     11.6          0.0685    0.0982   0.0811
#      25 %                      5.8          0.0495    0.0625   0.0525
#      10 %                      2.4          0.0473    0.0445   0.0471     <- at two clicks per user nothing beats popularity
#     WRMF α on the full data:  1: 0.1615   10: 0.1506   40: 0.1429   100: 0.1199  -- α is a hyperparameter, and on this data the light weighting wins`,
        notes: [
          { t: "p", text: "(a) is the mean-centred neighbour formula once more, with a negatively correlated neighbour contributing correctly." },
          { t: "p", text: "(b) is the ranking metrics computed, which is the only way to remember what each rewards." },
          { t: "p", text: "(c) is the data-hunger of the two implicit models and the tuning that WRMF's confidence needs; at ten clicks a user the pairwise model has the pairs it needs, at two nothing does." }
        ]
      }
    }
  ],

  takeaways: [
    "Neighbourhood CF predicts from mean-centred ratings of similar users (Ann: 3.25 + Σ sim·(r − μ)/Σ|sim| = 3.00) or from similar items; similarities on two or three co-ratings are ±1 and useless, so production item-based CF uses minimum support, shrinkage and top-k neighbours.",
    "Matrix factorisation models r̂ = μ + b_u + b_i + p_uᵀq_i on the observed entries only; ALS took the RMSE from the bias baseline's 0.956 to 0.609, the regulariser mattered more than the rank (λ = 30 returned the bias baseline), and the noise floor bounds what any model can do.",
    "Implicit feedback is positive-only and exposure-confounded: WRMF weights unobserved entries by low confidence, BPR learns pairwise rankings; both doubled popularity's NDCG@10 (0.159 and 0.144 against 0.064), and offline ranking metrics select candidates while the online test decides.",
    "NDCG discounts hits by log₂(rank + 1) and normalises by the ideal (two hits at ranks 1 and 3: 0.92; at ranks 4 and 5: 0.50); precision, recall, MAP and hit rate answer different questions.",
    "Cold items need content (0.406 against chance for every collaborative method); cold users need popularity until a few clicks exist (WRMF overtook by ten); a switching hybrid is the standard design.",
    "A recommender trains on the clicks it causes: exploit-only showed 27 of 200 items and stalled at 72 % of the achievable clicks, Thompson sampling showed all and reached 99 % — exploration, coverage and exposure Gini are part of the product."
  ],

  quiz: {
    title: "Recommender Systems — Knowledge Check",
    questions: [
      {
        stem: "Why is item-based collaborative filtering preferred to user-based in most production systems?",
        options: [
          "It is more accurate on every dataset",
          "Item–item similarities are stable and can be precomputed offline over many co-raters, while users' tastes change and the user–user matrix is far larger; item-based recommendations are also explainable ('because you liked …')",
          "It handles cold items",
          "It does not need mean-centring"
        ],
        answer: 1,
        why: "The choice is operational as much as statistical: a catalogue of 100,000 items has a tractable similarity matrix and users a billion pairs. Item-based CF still fails on new items and on sparse pairs — the worked example's ±1 similarities from two co-raters — which minimum support and shrinkage address."
      },
      {
        stem: "A team fits matrix factorisation with k = 64 and λ = 0.01 on 20 ratings per user and reports a training RMSE of 0.3. What has happened?",
        options: [
          "They have found the true rank",
          "They have over-fitted: 64 free factors per user against 20 ratings with almost no regularisation memorises the training entries; the held-out RMSE will be far worse, and the executed λ sweep showed the regulariser moving test error by 0.35 while the rank moved it by 0.24",
          "The noise floor is 0.3",
          "The biases are absorbing the signal"
        ],
        answer: 1,
        why: "Training error on a factorisation is nearly meaningless; the held-out entries are the only test. Rank and regularisation are chosen together by validation, and the executed curve had its minimum at the generating rank with λ around 1–3, not at the largest rank."
      },
      {
        stem: "Which metric would you report for a home-page recommender that shows ten items and where a single good item is enough to keep the user?",
        options: [
          "RMSE of predicted ratings",
          "Hit rate at 10 (the share of users with at least one relevant item in the list) alongside NDCG@10 — the first matches the product's success condition, the second rewards putting the hit near the top where it will be seen",
          "MAP at 100",
          "Precision at 1 only"
        ],
        answer: 1,
        why: "Metrics encode the product's question. Hit rate is the right one when one good item suffices; NDCG adds position, which matters on a scrollable list. The executed WRMF reached a hit rate of 0.654, meaning two thirds of users would have found something; precision@10 of 0.10 says the other nine slots were misses, which for this product is fine."
      },
      {
        stem: "A new product launches tomorrow with no interactions. How should the recommender treat it on day one, and how does that change over the first weeks?",
        options: [
          "Do not recommend it until it has clicks",
          "Score it by content on day one — content-based ranking reached 0.406 on cold items where every collaborative method was at chance — give it exploratory exposure so that clicks accumulate, and switch to the collaborative score once it has enough interactions; monitor its exposure so the loop does not starve it",
          "Give it the global mean rating",
          "Copy the vector of the most similar existing item permanently"
        ],
        answer: 1,
        why: "The cold start has two parts: representing the item (content) and learning about it (exploration). Copying a similar item's vector is a reasonable content-based initialisation, but it must be updated as evidence arrives, and without exploration the evidence never comes."
      },
      {
        stem: "Offline evaluation ranks model B above model A on held-out clicks, but an A/B test shows A wins on engagement. Which result should the team trust, and why might they disagree?",
        options: [
          "The offline result — it uses more data",
          "The A/B test: held-out clicks were generated under the old system's exposure, so offline metrics favour a model that reproduces what was shown, and a model that surfaces genuinely better items scores badly offline because users never had the chance to click them",
          "Neither — rerun both",
          "The offline result, because A/B tests are noisy"
        ],
        answer: 1,
        why: "Exposure bias is structural in logged interaction data; counterfactual evaluation (inverse propensity weighting on logged exposure) narrows the gap, but the online test is the ground truth for a system whose training data it will generate. This is why 11.1's rollout stages exist for recommenders in particular."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Recommender Systems",
    sub: "Collaborative filtering, factorisation, implicit feedback, evaluation, cold start and the loop.",
    questions: [
      {
        level: "Core",
        q: "Explain collaborative filtering and its main failure mode.",
        strong: "Predict what a user will like from the preferences of users who agree with them — or, item-based, from how the items they liked relate to other items. User-based: compute Pearson similarity between the target user and others on co-rated items, then predict the target's rating as their mean plus a similarity-weighted average of the neighbours' deviations from their own means; on my worked matrix Ann's neighbours who rated the item were the two she disagreed with, and the prediction was 3.00 — her mean pulled down by a perfectly anti-correlated neighbour. Item-based uses adjusted cosine between items and Ann's own ratings of similar items; it is precomputable and explainable, which is why production systems use it. The failure mode is sparsity and, at its extreme, the cold start: similarities built on two or three co-ratings are ±1 and meaningless — item-based gave −2.7 on a 1–5 scale — and a new user or item has no similarities at all. The fixes are minimum support and shrinkage for the similarities, factorisation for the sparsity, and content or popularity for the cold start.",
        answer: [
          { t: "p", text: "The two routes with the worked numbers, why item-based is used, and the sparsity and cold-start failures with their fixes." }
        ]
      },
      {
        level: "Core",
        q: "How does matrix factorisation work and how do you choose the rank?",
        strong: "Each user and item gets a vector of k latent factors and a bias, and a rating is modelled as μ + b_u + b_i + p_uᵀq_i, fitted only on the observed entries with an L2 penalty — not an SVD, which would need the missing entries. ALS fixes one side and solves a ridge regression for each vector on the other, alternating; SGD walks the observed ratings and updates both vectors by the error. On my 500 × 200 matrix, generated from rank 8, the bias baseline scored 0.956, ALS with k = 8 and λ = 1 reached 0.609 in fifteen passes, and the rank curve had its minimum at 8 — but the regularisation curve mattered more: λ = 0.1 over-fitted to 0.716, λ = 30 shrank the factors to zero and returned 0.956 exactly. So the rank is chosen on held-out RMSE jointly with λ, never on training error, and the noise floor — 0.4 in the generator — tells you how far there is to go.",
        answer: [
          { t: "p", text: "The model, the two solvers, the executed numbers, and rank and λ chosen together by validation." }
        ]
      },
      {
        level: "Senior",
        q: "Your data are clicks, not ratings. What changes?",
        strong: "Everything about the objective. Clicks are positive-only and confounded by exposure: an unclicked item is usually one that was never shown, so a rating model that treats zeros as dislikes learns the old system's exposure. Two standard reformulations: WRMF treats every cell as a binary preference with a confidence 1 + α·count, so observed clicks weigh heavily and unobserved cells lightly, solved by ALS over the full matrix; BPR abandons scores and learns a ranking from sampled triples — a user, a clicked item, an unclicked one — by pushing the clicked item's score above the other's. On 14,000 clicks WRMF and BPR reached NDCG@10 of 0.159 and 0.144 against popularity's 0.064. Evaluation changes with it: precision and recall at K, NDCG for position, MAP, hit rate — and the awareness that held-out clicks are biased toward what was shown, so the offline metric selects candidates and interleaving or an A/B test decides. And the hyperparameters are different: WRMF's α (0.162 at α = 1 down to 0.120 at α = 100 on my data), BPR's negative sampling, and enough interactions per user — at two clicks a user neither model beat popularity.",
        answer: [
          { t: "p", text: "Positive-only and exposure-confounded data, WRMF and BPR with executed results, ranking metrics and their bias, and the hyperparameters." }
        ]
      },
      {
        level: "Senior",
        q: "How do you evaluate a recommender, offline and online?",
        strong: "Offline, hold out a slice of each user's interactions — the most recent ones, to respect time — and score the top-K list: precision@K for how much of the list was right, recall@K for how much of the user's relevant set it found, NDCG@K for position with a logarithmic discount (two hits at ranks 1 and 3 score 0.92, at ranks 4 and 5 0.50), MAP, and hit rate for the share of users helped at all; plus coverage and exposure concentration, because a system that recommends the same 27 items to everyone can score well. Choose the metric from the product: hit rate when one good item is enough, NDCG when the list is scrolled. Then remember that the held-out interactions were generated by the previous system's exposure, so offline metrics favour reproducing it; counterfactual estimators with logged propensities help, and the decision is made online — interleaving for rankers, an A/B test on engagement and retention with a stable hash assignment and a pre-registered size, guardrails on latency and coverage.",
        answer: [
          { t: "p", text: "The offline protocol and metrics with the worked NDCG, matching the metric to the product, exposure bias, and the online decision." }
        ]
      },
      {
        level: "Staff",
        q: "Design a recommender for a streaming service with a large catalogue, new titles every week, and a mix of clicks, completions and a few ratings.",
        strong: "A two-stage system with a cold-start path and exploration built in. Candidate generation: an implicit factorisation on the interactions — completions weighted above clicks, and the confidence tuned by held-out NDCG — plus content-based candidates from title metadata and embeddings for new releases, plus a popularity slate; several hundred candidates per user. Ranking: a model that scores each candidate with the user's history, the candidate's features and the context (device, time, position), trained on logged impressions with the exposure propensities, and objective aligned with what the business wants — completion or retention rather than click. Cold start: a new title is represented by its content on day one and given exploratory exposure so its interaction vector can form; a new user gets popularity and onboarding choices until a handful of interactions exist, where in my experiment the collaborative model overtook content by ten clicks. Exploration everywhere: a Thompson-style perturbation of scores or a slot reserved for uncertain items, because the exploit-only loop settled at 72 % of the achievable clicks and showed 27 of 200 items. Evaluation: offline NDCG and coverage to select candidates and rankers, interleaving to compare rankers cheaply, an A/B test on retention to decide, and monitors on catalogue coverage, exposure Gini and per-segment quality so that the loop does not quietly narrow the service to its own past.",
        answer: [
          { t: "p", text: "Two stages, weighted implicit signals, the content and popularity paths for cold start with the executed crossover, exploration with the executed loop numbers, and the evaluation ladder." }
        ]
      }
    ]
  }
});
