/* ============================================================================
   LESSON 11.3 — Online and Federated Learning
   ========================================================================= */
EC.receiveLesson({
  id: "11.3",

  lede: "**Two ways of learning without the whole dataset in one place at one time: online learning updates a model one row at a time as the stream arrives, and federated learning trains one model across data that must stay where it is.** A logistic model trained by `partial_fit` on 20,000 streamed rows reaches the accuracy of a batch fit within the first 5,000 (0.830 against 0.828, with a Bayes rate of 0.829) and recovers its true weights to the second decimal; its cumulative regret against the true model after 15,000 rows is −12 errors — the cost of learning online was nothing. When the relationship flips at row 10,000, the batch model falls from 0.831 to 0.618 and stays there; the online learner drops to 0.716 for 500 rows and is back to 0.826, and ADWIN raises the alarm 240 rows after the change; the learning rate is the dial, 0.001 recovering to 0.788 and 0.1 to 0.818. Federated averaging is worked on two clients — client A returns 0.200 for the first weight, client B 0.139, the server averages by data size to 0.176 — and after 20 rounds matches a centralised fit (0.826 against 0.827). Non-IID clients are shown to be two different problems: skewed features cost nothing here, while different conditionals cap the global model at 0.652 against 0.783 for local models, which personalisation recovers. A one-row client's update reveals its row exactly, which is what secure aggregation and differential privacy exist for, and the privacy noise costs 0.826 → 0.717 → 0.600 as the multiplier rises.",

  objectives: [
    "Contrast batch and online learning, train with partial_fit and River, and evaluate prequentially",
    "Define regret and explain why online gradient descent's regret grows sublinearly",
    "Handle concept drift on a stream with the learning rate, a drift detector and an adaptive model",
    "Work federated averaging by hand and explain what non-IID data does to it — and which kind of non-IID",
    "Explain what a gradient update leaks, and how secure aggregation and differential privacy address it, with the accuracy cost measured"
  ],

  prerequisites: ["11.1", "1.8", "4.5"],

  blocks: [

    { t: "h2", n: "01", text: "Online against batch, evaluated prequentially", id: "online" },

    { t: "p", text: "A batch learner sees all its data at once and fits; an online learner sees one row (or a mini-batch), updates, discards it and waits for the next. The reasons to learn online are memory — the data do not fit — latency — the model must reflect the last minute — and drift — the world moves, and a model fitted last month is wrong this month. Evaluation is prequential (predict, then train): each row is scored by the model before the model sees its label, so the running accuracy is an honest out-of-sample number with no split at all." },

    { t: "code", lang: "python", title: "A 20,000-row logistic stream, three ways (executed)",
      code: `# stream: 5 features, true weights (1.5, −1.0, 0.5, 0.0, 2.0), intercept −0.5, Bernoulli labels; Bayes rate on rows 5,000+: 0.8291

batch = LogisticRegression().fit(X[:5000], y[:5000])                          # accuracy on the next 15,000: 0.8281

sgd = SGDClassifier(loss="log_loss", learning_rate="constant", eta0=0.01)
for i, (x_i, y_i) in enumerate(stream):
    if i: correct.append(sgd.predict(x_i) == y_i)                              # predict first ...
    sgd.partial_fit(x_i, y_i, classes=[0, 1])                                  # ... then learn: prequential
# prequential accuracy: rows 1-1,000 0.8080 · 1,000-5,000 0.8177 · 5,000-20,000 0.8299
# final weights (1.56, −1.05, 0.52, 0.07, 2.00) against the truth (1.5, −1.0, 0.5, 0.0, 2.0);  32 s for 20,000 single-row calls

model = river.compose.Pipeline(preprocessing.StandardScaler(), linear_model.LogisticRegression(optim.SGD(0.05)))
for x_i, y_i in stream: y_pred = model.predict_one(x_i); metric.update(y_i, y_pred); model.learn_one(x_i, y_i)
# prequential accuracy 0.8240, log-loss 0.3869;  1.3 s -- River is built for one row at a time, scikit-learn is not`,
      caption: "By row 5,000 the online learner is as accurate as the batch fit on 5,000 rows, and from then on it keeps improving while the batch model is frozen. scikit-learn's `partial_fit` works but pays the array-validation overhead on every call — 1.6 ms a row against River's 65 µs — which is why River (and Vowpal Wabbit) exist: dictionaries in, one row at a time, scalers that update online, and metrics that are prequential by construction." },

    { t: "code", lang: "python", title: "Regret: cumulative errors against the best fixed predictor (executed)",
      code: `#  after N rows      online errors    batch model's    true model's    online regret vs the truth
#       100                14               13               15              −1   (−0.0100 per row)
#     1,000               166              168              165              +1   (+0.0010)
#     5,000               830              845              837              −7   (−0.0014)
#    15,000             2,551            2,578            2,563             −12   (−0.0008)`,
      caption: "Regret is the cumulative loss of the online learner minus that of the best fixed predictor chosen in hindsight. For online gradient descent on a convex loss it grows as O(√T), so the per-row cost of learning on the fly goes to zero — and here, on a stationary stream, the online learner's regret against the true model is within sampling noise of zero and it beats the batch model, which stopped learning at row 5,000. The guarantee holds against a *fixed* comparator; when the best predictor itself changes, the comparison is against the best sequence, and that is the drift setting." },

    { t: "h2", n: "02", text: "Concept drift on the stream", id: "drift" },

    { t: "code", lang: "python", title: "At row 10,000 the sign of feature 0's effect flips (executed)",
      code: `batch model (fitted on rows 0-5,000):  accuracy on rows 5,000-10,000 0.8310;  on rows 10,000-20,000 0.6182   <- wrong for ever
online SGD, η = 0.01:                  0.8340 before;  0.7160 in the 500 rows after the change;  0.8263 on rows 12,000-20,000
ADWIN on the online learner's error stream (δ 0.002): alarm at t = 10,240

the learning rate is the dial:
#  η        stationary accuracy (5,000-10,000)    first 1,000 rows after the change    rows 12,000-20,000
#  0.001            0.8338                                  0.6620                          0.7876     <- precise, slow to recover
#  0.01             0.8340                                  0.7410                          0.8263
#  0.1              0.8246                                  0.8140                          0.8181     <- fast, noisy

River HoeffdingAdaptiveTreeClassifier (a tree with ADWIN inside each branch): prequential accuracy over the whole drifting stream 0.8007`,
      caption: "The online learner's advantage is not accuracy on a stationary stream — the batch fit matched it — but the ability to forget. How fast it forgets is the learning rate, and the choice is the online version of bias–variance: a small η averages over a long past and is precise until the past becomes wrong; a large η tracks the present and pays in noise. A drift detector on the error stream (11.1) turns the choice into a policy — small η normally, a reset or a larger η after an alarm — and adaptive models such as the Hoeffding adaptive tree build the detector in, replacing a subtree when its error rises." },

    { t: "table", head: ["Situation", "Reach for"], rows: [
      ["Data fit in memory and the world is stable", "batch training on a schedule (10.9's refit cadence); online learning buys nothing"],
      ["Data do not fit, or arrive continuously, world stable", "mini-batch `partial_fit` or River; prequential evaluation; a small learning rate"],
      ["Gradual drift", "a moderate learning rate or a sliding window; monitor the error stream"],
      ["Abrupt drift", "a detector (ADWIN, DDM, Page–Hinkley) that triggers a reset or a larger rate; an adaptive model"],
      ["Recurring regimes (weekday/weekend, seasons)", "a model per regime, or the regime as a feature — not forgetting"],
      ["Labels arrive late", "the detector runs on the input side (11.1) until labels land; the learner updates when they do"]
    ] },

    { t: "h2", n: "03", text: "Federated averaging, worked on two clients", id: "fedavg" },

    { t: "p", text: "Federated learning trains a single model on data held by many clients — phones, hospitals, banks — that cannot be pooled. FedAvg (McMahan et al., 2017) is the basic algorithm: the server sends the current global weights to the clients; each client runs a few epochs of local SGD on its own data and returns its updated weights; the server averages them, weighted by each client's number of rows; repeat. No data leaves a client; only weights travel." },

    { t: "viz",
      title: "One round of federated averaging",
      caption: "The server broadcasts the global weights, each client trains locally and returns weights, and the server averages them weighted by data size. Secure aggregation lets the server see only the sum; differential privacy clips and adds noise before or at the aggregate.",
      svg: `<svg viewBox="0 0 760 260" role="img" aria-label="A server box at the top and two client boxes below. Arrows down carry the global weights; arrows up carry the locally trained weights; the server shows the weighted average.">
  <rect x="270" y="20" width="220" height="60" rx="8" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="380" y="44" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)" font-family="ui-sans-serif, system-ui, sans-serif">server</text>
  <text x="380" y="64" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">w ← (600·w_A + 400·w_B) / 1000</text>
  <rect x="60" y="170" width="240" height="70" rx="8" fill="var(--surface-2)" stroke="var(--good)" stroke-width="1.5"/>
  <text x="180" y="194" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)" font-family="ui-sans-serif, system-ui, sans-serif">client A · 600 rows</text>
  <text x="180" y="212" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">one local epoch of SGD</text>
  <text x="180" y="228" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">w_A[0] = 0.200</text>
  <rect x="460" y="170" width="240" height="70" rx="8" fill="var(--surface-2)" stroke="var(--good)" stroke-width="1.5"/>
  <text x="580" y="194" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)" font-family="ui-sans-serif, system-ui, sans-serif">client B · 400 rows</text>
  <text x="580" y="212" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">one local epoch of SGD</text>
  <text x="580" y="228" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">w_B[0] = 0.139</text>
  <g stroke="var(--ink-3)" stroke-width="1.5" fill="none">
    <path d="M320 80 L200 168"/><path d="M440 80 L560 168"/>
    <path d="M240 168 L350 82" stroke="var(--accent)"/><path d="M520 168 L410 82" stroke="var(--accent)"/>
  </g>
  <g fill="var(--ink-3)"><polygon points="200,168 204,158 210,164"/><polygon points="560,168 550,164 556,158"/></g>
  <g fill="var(--accent)"><polygon points="350,82 340,86 346,92"/><polygon points="410,82 414,92 420,86"/></g>
  <text x="220" y="118" font-size="11" fill="var(--ink-3)" font-family="ui-sans-serif, system-ui, sans-serif">global w ↓</text>
  <text x="320" y="140" font-size="11" fill="var(--accent)" font-family="ui-sans-serif, system-ui, sans-serif">w_A ↑</text>
  <text x="500" y="118" font-size="11" fill="var(--ink-3)" font-family="ui-sans-serif, system-ui, sans-serif">↓ global w</text>
  <text x="410" y="140" font-size="11" fill="var(--accent)" font-family="ui-sans-serif, system-ui, sans-serif">↑ w_B</text>
  <text x="380" y="100" text-anchor="middle" font-size="11" fill="var(--crit)" font-family="ui-sans-serif, system-ui, sans-serif">no rows cross the line; only weights</text>
</svg>` },

    { t: "code", lang: "text", title: "Round 1 by hand, then 20 rounds (executed; IID clients, a logistic model, batch 50, learning rate 0.1)",
      code: `global weights start at 0.  Client A (600 rows) and client B (400 rows) each run one local epoch.
client A returns  w_A = (0.200, −0.107, 0.067, 0.020, 0.239)
client B returns  w_B = (0.139, −0.112, 0.048, 0.017, 0.173)
FedAvg:  w = (600·w_A + 400·w_B) / 1000 = (0.176, −0.109, 0.059, 0.019, 0.213)        check the first component: (600·0.200 + 400·0.139)/1000 = 0.176

after round  5:  w = (0.59, −0.38, 0.22, 0.07, 0.73)    held-out accuracy 0.8257
after round 10:  w = (0.86, −0.56, 0.34, 0.10, 1.08)    0.8272
after round 20:  w = (1.13, −0.75, 0.47, 0.14, 1.44)    0.8264
centralised logistic regression on the pooled 1,000 rows:  w = (1.52, −1.04, 0.64, 0.20, 1.95),  accuracy 0.8265`,
      caption: "With IID clients FedAvg is distributed SGD with infrequent synchronisation and converges to the centralised solution; after 20 rounds the weights are still growing toward it (the learning rate is small and one epoch per round is short) but the accuracy has already arrived. The weighting matters: the exercise shows an unweighted average over-counting a 300-row client against a 700-row one by 0.08 on the largest weight." },

    { t: "h2", n: "04", text: "Non-IID data: which kind", id: "noniid" },

    { t: "p", text: "Clients are never IID: a phone's keyboard data is one person's vocabulary, a hospital's patients are one region's. 'Non-IID' covers three different situations, and they do very different things to FedAvg. **Label skew** — clients have different class proportions. **Feature skew** — clients see different regions of the input space. **Concept skew** — the relationship P(y | x) itself differs between clients. The executed experiments separate them." },

    { t: "code", lang: "python", title: "Three kinds of non-IID on the same logistic problem (executed)",
      code: `# LABEL SKEW: client A holds only positives, client B only negatives; 5 local epochs per round
#  round 1: client A's w[0] +0.37, client B's +0.40, global +0.38, accuracy 0.8251      round 20: 1.24 / 1.27 / 1.25, accuracy 0.8260
#  -- the two clients pull the same way, because the relationship is the same and a logistic gradient uses both classes' geometry

# FEATURE SKEW: client A sees rows with x0 < −0.3 (positive rate 0.28), client B rows with x0 > 0.3 (0.645); 30 rounds
#  local epochs per round   accuracy   ||w_A − w_B|| at the last round
#          1                 0.8274          0.059
#          5                 0.8273          0.177
#         20                 0.8278          0.298        <- more local steps, more client drift, same accuracy on a convex problem
#  FedProx (a proximal term μ‖w − w_global‖² in the local objective), 5 epochs:  μ 0.1: drift 0.111, accuracy 0.8273;  μ 1.0: drift 0.045, accuracy 0.8233
#  centralised on the pooled rows: 0.8275

# CONCEPT SKEW: three hospitals with the same features and DIFFERENT true weight vectors
#                                            hospital A   B       C      mean
#  FedAvg global model, 40 rounds              0.600    0.620   0.735   0.652
#  a single centralised model on the pooled rows 0.610    0.615   0.760   0.662     <- the ideal FedAvg approximates is itself poor
#  each hospital training alone on 600 rows    0.785    0.790   0.775   0.783
#  the global model fine-tuned locally, 5 epochs 0.775    0.780   0.775   0.777     <- personalisation`,
      caption: "On a convex, well-specified model, label and feature skew cost nothing: client drift — the local updates diverging from each other, which grows with the number of local steps — is real and measurable, and FedProx's proximal term shrinks it, but the averaged model still converges to the pooled solution. The situation that breaks the global model is concept skew, and no amount of averaging fixes it, because there is no single model to find: the centralised fit is as bad. The answers are personalisation (a global model as a starting point, fine-tuned per client), clustering clients into groups that share a concept, or a model with client-specific parts. Deep models add a fourth cost, which the convex case hides: with non-convex losses, local steps move clients toward different minima and averaging them can land between." },

    { t: "h2", n: "05", text: "Privacy: what an update leaks, and what it costs to hide it", id: "privacy" },

    { t: "code", lang: "python", title: "A client with one row, and the two defences (executed)",
      code: `# a client holding ONE row (x, y = 0) trains one step from w = 0 and returns the update
update = (−0.0063, 0.0066, −0.0320, −0.0052, 0.0268)
# the logistic gradient at w = 0 is (p − y)·x = 0.5·x, and the update is −lr × that, so
update / (−0.1 × 0.5) = (0.126, −0.132, 0.640, 0.105, −0.536)  ==  the client's row (0.126, −0.132, 0.640, 0.105, −0.536)   -- recovered exactly

# defence 1, SECURE AGGREGATION: each client adds a random mask; the masks cancel across clients; the server sees only Σ updates
# defence 2, DIFFERENTIAL PRIVACY: clip each client's update to norm C, add N(0, σ²C²) noise to the aggregate
#  clip C = 1, noise multiplier σ:   0 (clipping only) 0.8259 · 0.1 0.8191 · 0.5 0.7171 · 1.0 0.6003 · 2.0 0.5013    accuracy after 20 rounds, 2 clients`,
      caption: "'The data never leave the device' is true and insufficient: a gradient is a function of the data, and with few rows it is close to invertible — gradient-inversion attacks recover images from deep-network updates. Secure aggregation hides individual updates from the server; differential privacy bounds what the aggregate itself reveals about any one client, at a cost in accuracy that is steep with two clients and small noise multipliers and shrinks as the number of clients averaged grows, since the noise is added once to the sum. The privacy budget ε is computed from σ, the sampling rate and the number of rounds by a moments accountant (Opacus, TensorFlow Privacy); the trade-off is real and is the number a privacy review asks for." },

    { t: "dl", items: [
      ["Frameworks", "Flower (framework-agnostic, simulation and deployment), TensorFlow Federated, PySyft; NVIDIA FLARE for hospitals. Each implements the client loop, the server aggregation, secure aggregation and DP as pluggable strategies."],
      ["Cross-device vs cross-silo", "Millions of unreliable phones with little data each (sampling a fraction per round, dropouts, compression) against a few reliable institutions with much data (all present every round, heavier local training, governance and audits)."],
      ["Communication", "The round trip dominates: fewer, larger local steps trade communication for client drift; quantisation and sparsification shrink the update; the server can be a peer in decentralised variants."],
      ["Evaluation", "Per-client accuracy alongside the mean, because a global model that is good on average and bad for a minority of clients is the concept-skew failure in disguise."]
    ] },

    { t: "ladder",
      title: "Learning from data you cannot collect in one place",
      rungs: [
        { level: "bad", label: "Ship the data to the server and train there", code: `pooled = concat(client_data); model.fit(pooled)`,
          note: "**The accuracy ceiling (0.8265 here) — and a privacy, regulatory and bandwidth problem that is the reason the data were separate.**" },
        { level: "ok", label: "FedAvg with weighted averaging, a few local epochs, per-client evaluation", code: `w = Σ n_k w_k / Σ n_k       # 0.8264 after 20 rounds on IID clients
report accuracy per client, not only the mean`,
          note: "Matches the centralised model on IID or feature-skewed data. Blind to concept skew (0.652 against 0.783 local), and each update still reveals its client's data to the server." },
        { level: "best", label: "Secure aggregation, clipped and noised updates with an accounted ε, FedProx or fewer local steps against drift, personalisation where the conditionals differ", code: `update = clip(w_k − w, C); server sees Σ masked updates + N(0, σ²C²)   # ε from the accountant
local objective += μ/2 ‖w − w_global‖²                                    # drift 0.177 -> 0.111 at μ 0.1
per-client fine-tune from the global model                                # 0.652 -> 0.777 mean under concept skew`,
          note: "The server learns only the aggregate, the aggregate reveals a bounded amount about any client, drift is controlled, and clients whose worlds differ get a model for their world." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The online learner's cumulative regret against the true model after 15,000 rows was −12 errors. What does a negative regret mean here?",
          options: [
            "The online learner is better than the true model",
            "Sampling noise: the true model is the Bayes-optimal predictor in expectation, and over 15,000 Bernoulli labels the online learner happened to make 12 fewer errors — the regret bound is O(√T) in expectation, and here the learning cost was indistinguishable from zero",
            "The regret formula is wrong",
            "The batch model was over-fitted"
          ],
          answer: 1,
          why: "Regret is measured against a comparator on the realised labels, which are noisy; a learner that has converged to the true weights makes the same expected number of errors and can be ahead or behind by chance. The point of the table is the trend: the per-row regret shrinks toward zero rather than growing, which is what a sublinear bound promises."
        },
        {
          stem: "After the relationship flipped, SGD with η = 0.001 recovered to 0.788 by row 20,000 and η = 0.1 to 0.818, while on the stationary stream η = 0.001 was better (0.834 against 0.825). Why?",
          options: [
            "Larger learning rates are always better under drift",
            "The learning rate sets how much of the past the model remembers: a small η averages over many rows and is precise while they agree, and slow to unlearn them when they stop; a large η weights recent rows and tracks a change quickly at the cost of noise — the online bias–variance trade-off",
            "The small rate diverged",
            "The change was too small to matter at η = 0.001"
          ],
          answer: 1,
          why: "Neither rate is right for both regimes, which is why the practical answer is a policy — a small rate with a drift detector that triggers a reset or a temporary increase (ADWIN fired 240 rows after the change) — or a model such as the Hoeffding adaptive tree that carries its own detectors."
        },
        {
          stem: "Client A returned 0.200 and client B 0.139 for the first weight; the server set the global weight to 0.176. Why not 0.1695, the plain average?",
          options: [
            "A rounding difference",
            "FedAvg weights each client's model by its number of rows — (600 × 0.200 + 400 × 0.139)/1000 = 0.176 — so the average approximates the gradient on the pooled data rather than over-counting the smaller client",
            "The server adds momentum",
            "Client B's update was clipped"
          ],
          answer: 1,
          why: "FedAvg is distributed SGD: the pooled gradient is the data-size-weighted mean of the client gradients. The exercise quantifies the alternative — an unweighted average of a 300-row and a 700-row client over-weights the small one by 0.08 on the largest component — which in a cross-device setting with wildly different data sizes would let a few busy devices dominate."
        },
        {
          stem: "Three hospitals with different true relationships: FedAvg's global model scores 0.652, a centralised model on the pooled data 0.662, and each hospital's own model 0.783. What does the centralised number tell you?",
          options: [
            "That federated learning failed",
            "That the failure is not federation's: no single model fits three different conditionals, so the ideal FedAvg approximates is itself poor; the fix is personalisation — the global model fine-tuned per hospital reached 0.777 — or clustering clients by concept, not more rounds or a better optimiser",
            "That the hospitals' data are corrupted",
            "That more local epochs are needed"
          ],
          answer: 1,
          why: "Concept skew is different in kind from label or feature skew, which cost nothing on the same problem. Diagnosing it needs per-client evaluation: a global model that averages 0.652 with every client below its own local model is the signature, and the remedy is a model with client-specific parts."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "FedAvg by hand, the learning-rate schedules, and the one-pass budget",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Client A (300 rows) returns weights (0.40, −0.20, 0.10) and client B (700 rows) returns (0.10, −0.30, 0.50). Compute the FedAvg global weights and the unweighted average, and say by how much the unweighted version over-weights the small client." },
        { t: "p", text: "**(b)** On the stream whose relationship flips at row 10,000, run SGD with a constant rate of 0.01, a constant rate of 0.1, `invscaling` from 0.1, and scikit-learn's `optimal` schedule. Report the accuracy on rows 5,000–10,000, the first 1,000 rows after the change, and rows 15,000–20,000, and explain the pattern." },
        { t: "p", text: "**(c)** On 200,000 rows × 20 features, time a batch logistic regression, a `partial_fit` pass in mini-batches of 1,000, and 20,000 River `learn_one` calls; report rows per second and the memory each holds." }
      ],
      requirements: [
        "(a) two weight vectors and the gap.",
        "(b) a four-row table and the explanation.",
        "(c) three timings with memory."
      ],
      hint: "(a) Weights are n_k / Σn_k. (b) A decaying schedule that has decayed cannot recover. (c) River trades throughput for row-at-a-time semantics.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) FedAvg:  (300·w_A + 700·w_B)/1000 = (0.19, −0.27, 0.38)     component 0: (300·0.40 + 700·0.10)/1000 = 0.190
#     unweighted: (0.25, −0.25, 0.30) -- over-weights the 300-row client by 0.08 on the largest component

# (b) schedule              rows 5,000-10,000    first 1,000 after the change    rows 15,000-20,000
#     constant η 0.01           0.8340                   0.7360                       0.8222
#     constant η 0.1            0.8246                   0.8240                       0.8148
#     invscaling from 0.1       0.8340                   0.7360                       0.8228     <- by row 10,000 the rate has decayed to ~0.01
#     'optimal'                 0.7830                   0.7870                       0.7916     <- 1/(α(t + t0)): decays fast, tied to the regularisation; never converges well here
#     A schedule that decays is right for a stationary stream and wrong for a drifting one: once decayed, it cannot unlearn.
#     Constant rates keep the ability to adapt; the drift detector decides when to spend it.

# (c) batch LogisticRegression, 200,000 × 20:   0.10 s;  the whole 32 MB matrix in memory
#     partial_fit, mini-batches of 1,000:        0.11 s for the pass, ~1.9 million rows/s;  memory = one batch, 0.16 MB
#     River learn_one:                           22 µs/row = ~45,000 rows/s;  memory = one row + the model
#     -- mini-batch partial_fit is as fast as batch and needs 1/200 of the memory; River is 40× slower per row and is the
#        right tool when rows arrive one at a time and the pipeline (scaler, model, metric) must update with each`,
        notes: [
          { t: "p", text: "(a) is the weighting rule and why it exists." },
          { t: "p", text: "(b) shows that the learning-rate schedule is a statement about whether the world can change." },
          { t: "p", text: "(c) is the cost table: online learning is not for speed; it is for memory, latency and drift." }
        ]
      }
    }
  ],

  takeaways: [
    "Online learning updates one row at a time and is evaluated prequentially; on a stationary stream it matched the batch fit by row 5,000 (0.830 vs 0.828, Bayes 0.829) and its regret against the true model stayed within noise of zero — O(√T) in theory, −12 errors in 15,000 rows in practice.",
    "Its real advantage is forgetting: after a concept flip the batch model stayed at 0.618 while the online learner recovered to 0.826; the learning rate sets the memory (0.001 recovers slowly, 0.1 fast and noisy), a drift detector turns the rate into a policy, and decaying schedules cannot recover at all.",
    "FedAvg averages client weights by data size — (600 × 0.200 + 400 × 0.139)/1000 = 0.176 — and on IID clients converges to the centralised model (0.8264 vs 0.8265).",
    "Non-IID is three things: label skew and feature skew cost nothing on a convex model (client drift grows with local steps, 0.059 → 0.298, and FedProx shrinks it), but concept skew caps the global model at 0.652 against 0.783 for local models, and personalisation (0.777) or clustering is the remedy — evaluate per client.",
    "An update leaks its data: a one-row client's gradient returned the row exactly. Secure aggregation hides individual updates; differential privacy bounds what the aggregate reveals, at an accuracy cost (0.826 → 0.717 → 0.600 as σ rises) that a moments accountant converts into ε.",
    "River and mini-batch partial_fit are the tools; batch training on a schedule remains the default whenever the data fit and the world is stable."
  ],

  quiz: {
    title: "Online and Federated Learning — Knowledge Check",
    questions: [
      {
        stem: "Why is prequential evaluation honest without a held-out set?",
        options: [
          "Because it uses cross-validation internally",
          "Because every row is scored by the model before the model has seen that row's label, so each prediction is out-of-sample by construction, and the running metric is the model's accuracy on data it had not yet learned from",
          "Because the stream is shuffled",
          "Because online models cannot over-fit"
        ],
        answer: 1,
        why: "Test-then-train makes the whole stream a test set that is also the training set, one row later. It is also the natural monitor: the executed prequential accuracy dropped from 0.834 to 0.716 the moment the concept changed, which a held-out set from before the change could never show."
      },
      {
        stem: "A team runs FedAvg across 50 hospitals and reports a mean accuracy of 0.80. What must they also report, and why?",
        options: [
          "The number of rounds",
          "Accuracy per hospital: concept skew — hospitals whose conditionals differ — shows as a global model that is good on average and worse than each hospital's own model for some of them (0.652 against 0.783 in the executed case), and the mean hides exactly that",
          "The server's hardware",
          "The learning rate"
        ],
        answer: 1,
        why: "Federated evaluation is a distribution over clients, and the failure mode that matters is the minority of clients the global model does not fit. Per-client numbers point to personalisation or clustering; a mean points nowhere."
      },
      {
        stem: "Why does a client that trains for 20 local epochs per round drift further from the other clients than one that trains for one epoch, and does it matter?",
        options: [
          "It does not drift; more epochs are always better",
          "Each client's local optimum differs from the global one when its data differ, so more local steps move it further toward its own optimum (drift 0.059 at 1 epoch, 0.298 at 20); on a convex model the average still converges (accuracy unchanged), on a non-convex model averaging divergent clients can land between minima, and FedProx's proximal term or fewer local steps controls it",
          "The drift is due to different learning rates",
          "Drift is a communication artefact"
        ],
        answer: 1,
        why: "More local computation per round saves communication — the expensive resource in cross-device settings — at the price of client drift. The executed convex case shows drift without damage; the concern is deep models, where the loss surface is non-convex and the trade-off is real."
      },
      {
        stem: "A federated system uses secure aggregation and no differential privacy. What is protected and what is not?",
        options: [
          "Everything is protected",
          "Individual updates are hidden from the server (it sees only the sum), but the aggregate model still reveals information about clients' data — membership and attribute inference on the trained model, and with few clients the sum is nearly an individual update; differential privacy is what bounds that leakage, with an accounted ε",
          "Nothing is protected without encryption at rest",
          "The data are protected but the model is public"
        ],
        answer: 1,
        why: "Secure aggregation is a statement about the server's view during training; differential privacy is a statement about what any output reveals about any one client. The executed one-row example shows how little is hidden by 'the data stay on the device' alone; the executed noise sweep shows what DP costs."
      },
      {
        stem: "When should a team choose batch retraining on a schedule over online learning?",
        options: [
          "Always — online learning is experimental",
          "When the data fit in memory and the world is stable enough that a scheduled refit keeps up: online learning buys memory, latency and adaptivity, none of which matters then, and it costs simplicity, reproducibility and easy evaluation (the batch fit matched the online learner's accuracy on the stationary stream)",
          "Never — online learning is strictly better",
          "Only for image data"
        ],
        answer: 1,
        why: "The executed stationary stream is the case for batch: same accuracy, one artefact to version, a backtest that is easy to run. Online learning earns its complexity when rows arrive continuously, do not fit, or stop resembling the past — and 10.9's retraining cadence covers the middle ground."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Online and Federated Learning",
    sub: "Streams, regret and drift; averaging across clients, non-IID data, and privacy.",
    questions: [
      {
        level: "Core",
        q: "What is online learning, when is it worth its complexity, and how do you evaluate it?",
        strong: "A model that updates from one row or mini-batch at a time and never holds the dataset: `partial_fit` in scikit-learn, `learn_one` in River. It is worth it for three reasons — the data do not fit in memory, the model must reflect the last minute, or the world drifts and a model fitted last month is wrong now — and not for accuracy: on a stationary stream the online logistic model and a batch fit on 5,000 rows scored 0.830 and 0.828 against a Bayes rate of 0.829. Evaluation is prequential: predict each row, then learn it, so every prediction is out of sample and the running metric is honest with no split; it doubles as the drift monitor, since it fell from 0.834 to 0.716 the moment the relationship changed. The theory is regret — cumulative loss minus the best fixed predictor's — which grows as O(√T) for online gradient descent on a convex loss; executed, the regret against the true model was within noise of zero after 15,000 rows.",
        answer: [
          { t: "p", text: "The definition and tools, the three reasons with the executed accuracy tie, prequential evaluation as both metric and monitor, and regret." }
        ]
      },
      {
        level: "Core",
        q: "Explain federated averaging with a concrete round.",
        strong: "The server holds global weights and sends them to the clients; each client runs a few epochs of SGD on its own data from those weights and returns the result; the server sets the new global weights to the average of the returned weights, weighted by each client's number of rows; repeat. In my worked round, from zero weights, client A with 600 rows returned 0.200 for the first weight and client B with 400 rows returned 0.139, so the server set (600 × 0.200 + 400 × 0.139)/1000 = 0.176. No rows leave a client, only weights. On IID clients it is distributed SGD with infrequent synchronisation and after 20 rounds matched a centralised fit at 0.826. The weighting is not optional — an unweighted average over-counts small clients — and the number of local epochs trades communication against client drift, which I measured growing from 0.06 to 0.30 in weight distance as local epochs went from 1 to 20.",
        answer: [
          { t: "p", text: "The loop, the executed round with the arithmetic, convergence on IID clients, the weighting, and the local-epoch trade-off." }
        ]
      },
      {
        level: "Senior",
        q: "How does concept drift change how you train and monitor a model on a stream?",
        strong: "It changes the objective from fitting the past to tracking the present. A batch model fitted before a change stays wrong — mine fell from 0.831 to 0.618 and stayed there — while an online learner recovers, at a speed set by its learning rate: 0.001 was the most accurate while the world was stable and recovered to only 0.788 in 10,000 rows, 0.1 lost a point of accuracy on the stable stream and was back to 0.814 within a thousand rows. A decaying schedule is worse than either after a change, because once it has decayed it cannot unlearn. So the design is a policy rather than a rate: a small rate normally, a detector on the prequential error stream — ADWIN fired 240 rows after the change — that triggers a reset or a larger rate, and where the drift is abrupt and frequent, an adaptive model such as a Hoeffding adaptive tree that replaces subtrees when their error rises. Monitoring is the prequential metric itself, per segment; and the labels' latency decides how much of this is possible — when they arrive late, the input-side monitors of 11.1 stand in until they do.",
        answer: [
          { t: "p", text: "The executed batch-versus-online numbers, the learning rate as memory with three rates, schedules, the detector-driven policy, adaptive models, and label latency." }
        ]
      },
      {
        level: "Senior",
        q: "What does 'non-IID' do to federated learning?",
        strong: "It depends on which kind. Label skew — clients with different class proportions — and feature skew — clients seeing different parts of the input space — cost nothing on a convex, well-specified model: my label-skewed clients, one with only positives and one with only negatives, converged to the same accuracy as IID clients, and feature-skewed clients reached the centralised accuracy with client drift that grew with local epochs and that FedProx's proximal term shrank. Concept skew — clients whose P(y | x) differs — is the one that breaks the global model, and it breaks the centralised model too: three hospitals with different true weight vectors gave a FedAvg global accuracy of 0.652 and a pooled centralised model of 0.662 against 0.783 for each hospital's own model. No optimiser fixes that, because there is no single model to find; the remedies are personalisation — the global model fine-tuned per client recovered 0.777 — clustering clients into shared concepts, or models with client-specific parts. The diagnosis needs per-client evaluation, which is why a federated system's headline number should be a distribution over clients rather than a mean. Deep models add a cost the convex case hides: with a non-convex loss, averaging clients that have drifted to different minima can land between them, which is why cross-device systems keep local epochs short.",
        answer: [
          { t: "p", text: "The three kinds with executed outcomes, why concept skew is different, the remedies, per-client evaluation, and the non-convex caveat." }
        ]
      },
      {
        level: "Staff",
        q: "A consortium of banks wants to train a shared fraud model without sharing transactions. Design it and name what could still go wrong.",
        strong: "Cross-silo federation: a few reliable clients with much data each, all present every round. Architecture: a coordinating server that never receives rows; each bank computes local updates on its own transactions; secure aggregation so the server sees only the sum of updates, because a single bank's update is a function of its data and with small batches nearly invertible — a one-row client's update returned its row exactly in my test; differential privacy on the updates, clipped to a norm and noised, with the ε computed by a moments accountant and agreed by the banks' privacy officers, and the accuracy cost measured — my sweep went from 0.826 to 0.717 to 0.600 as the noise multiplier rose, which is the number that decides the budget. Training: FedAvg with weighting by transaction volume, a few local epochs, FedProx if drift shows, and per-bank evaluation alongside the mean. What goes wrong: concept skew, because fraud patterns differ by bank and geography — if a bank's own model beats the global one on its data, the global model needs personalisation or the banks need clustering; feature-schema skew, because the banks' features must be computed identically or the federation is training on incompatible inputs, which is 11.1's training–serving skew across organisations; label latency and label skew, since chargebacks arrive weeks later and at different rates; a malicious or faulty participant poisoning the aggregate, which needs robust aggregation (trimmed means, norm bounds) and audit; and the governance question of who owns the model and who may run it against whom. The technical answer is Flower or NVIDIA FLARE with secure aggregation and DP; the hard part is the agreement about features, labels and ε.",
        answer: [
          { t: "p", text: "Cross-silo design with secure aggregation and accounted DP, the executed leak and cost numbers, training details, and five concrete failure modes with their controls." }
        ]
      }
    ]
  }
});
