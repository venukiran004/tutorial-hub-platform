/* ============================================================================
   LESSON 3.8 — Information Theory: Entropy and KL
   ========================================================================= */
EC.receiveLesson({
  id: "3.8",

  lede: "**Cross-entropy is not an arbitrary loss function** — it is the number of extra bits you pay for believing the wrong distribution, and minimising it is exactly maximum likelihood. Entropy, cross-entropy and KL divergence are three views of one idea, and knowing which is which explains most of what a classifier is doing.",

  objectives: [
    "Define entropy as expected surprise and compute it",
    "Explain why cross-entropy is the loss every classifier uses",
    "Use KL divergence, and say why it is not a distance",
    "Compute mutual information and use it for feature selection",
    "Read a loss value as bits rather than as an abstract number"
  ],

  prerequisites: ["3.7"],

  blocks: [

    { t: "h2", n: "01", text: "Entropy is expected surprise", id: "entropy" },

    { t: "code", lang: "python", title: "start from what surprise should mean", code: `
import numpy as np

# SURPRISE should satisfy three things:
#   - a certain event is not surprising:  surprise(1) = 0
#   - a rarer event is more surprising:   decreasing in p
#   - independent events add:             s(pq) = s(p) + s(q)
#
# Only the logarithm satisfies all three, so:
#
#     surprise(p) = -log2(p)   bits

def surprise(p):
    return -np.log2(p)

surprise(1.0)        # 0.0    certain -- nothing learned
surprise(0.5)        # 1.0    a coin flip -- exactly one bit
surprise(1/1024)     # 10.0   ten bits
surprise(1e-12)      # 39.9   very surprising indeed

# ENTROPY IS THE AVERAGE SURPRISE:
#
#     H(p) = -sum p_i log2(p_i)     bits

def entropy(p):
    p = np.asarray(p, dtype=float)
    p = p[p > 0]                          # 0 log 0 = 0 by convention
    return float(-(p * np.log2(p)).sum())

entropy([0.5, 0.5])                       # 1.0    fair coin
entropy([0.9, 0.1])                       # 0.469  biased -- less to learn
entropy([1.0, 0.0])                       # 0.0    certain -- nothing
entropy([0.25]*4)                         # 2.0    four equal outcomes
entropy([1/256]*256)                      # 8.0    one byte, exactly

# TWO PROPERTIES WORTH KNOWING:
#
# 1. UNIFORM MAXIMISES ENTROPY. For n outcomes the maximum is log2(n),
#    reached only when all are equally likely. Any structure reduces it.
entropy([1/6]*6), np.log2(6)              # 2.585, 2.585

# 2. ENTROPY IS THE OPTIMAL AVERAGE CODE LENGTH. A distribution with
#    entropy 2.585 bits cannot be encoded in fewer than 2.585 bits per
#    symbol on average, and can be encoded arbitrarily close to it.
#    That is Shannon's source coding theorem, and it is why entropy is
#    measured in bits rather than being a dimensionless index.

# WHICH GIVES A COMPRESSION BOUND YOU CAN COMPUTE:
freqs = np.array([0.40, 0.25, 0.15, 0.10, 0.06, 0.04])
entropy(freqs)                            # 2.246 bits per symbol
2.246 / 8                                 # 0.281 -- best possible ratio
#
# A file of these symbols cannot compress below 28% of its raw size.
# If your compressor reaches 30%, it is near optimal and further
# tuning is wasted -- which is a genuinely useful thing to know before
# spending a week on it.
`,
      hl: [11, 21, 44, 51],
      caption: "**Entropy is a hard bound on compression, not an index.** If a symbol stream has 2.25 bits of entropy, no encoder reaches below 28% of its raw size — worth computing before optimising a compressor."
    },

    { t: "h2", n: "02", text: "Cross-entropy and KL", id: "cross-entropy" },

    { t: "viz",
      title: "Cross-entropy is entropy plus the cost of being wrong",
      caption: "H(p,q) = H(p) + KL(p‖q). The first term is irreducible — it is the data's own uncertainty. The second is what your model costs you, and it is the only part training can reduce.",
      svg: `<svg viewBox="0 0 880 220" role="img" aria-label="A bar split into an irreducible entropy portion and a reducible KL portion">
  <rect x="70" y="60" width="330" height="52" style="fill:var(--accent);fill-opacity:.28;stroke:var(--accent)" stroke-width="2"/>
  <text x="150" y="92" class="s-label" style="fill:var(--accent)">H(p)  --  irreducible</text>

  <rect x="400" y="60" width="220" height="52" style="fill:var(--crit);fill-opacity:.28;stroke:var(--crit)" stroke-width="2"/>
  <text x="428" y="92" class="s-label" style="fill:var(--crit)">KL(p || q)  --  your model</text>

  <line x1="70" y1="132" x2="620" y2="132" style="stroke:var(--ink-3)" stroke-width="1.5"/>
  <line x1="70" y1="126" x2="70" y2="138" style="stroke:var(--ink-3)" stroke-width="1.5"/>
  <line x1="620" y1="126" x2="620" y2="138" style="stroke:var(--ink-3)" stroke-width="1.5"/>
  <text x="270" y="154" class="s-label" style="fill:var(--ink-2)">H(p, q)  --  the loss you minimise</text>

  <text x="70" y="42" class="s-sub" style="fill:var(--ink-3)">training moves only the right-hand block</text>
  <text x="650" y="80" class="s-sub" style="fill:var(--ink-3)">a loss that stops falling has</text>
  <text x="650" y="98" class="s-sub" style="fill:var(--ink-3)">reached H(p) -- the data's own</text>
  <text x="650" y="116" class="s-sub" style="fill:var(--ink-3)">noise, not a training failure</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the loss you already use, read as bits", code: `
def cross_entropy(p, q):
    """Expected bits to encode data from p using a code built for q."""
    p, q = np.asarray(p, float), np.asarray(q, float)
    mask = p > 0
    return float(-(p[mask] * np.log2(q[mask])).sum())

def kl(p, q):
    """Extra bits paid for using q instead of p."""
    p, q = np.asarray(p, float), np.asarray(q, float)
    mask = p > 0
    return float((p[mask] * np.log2(p[mask] / q[mask])).sum())

p = np.array([0.7, 0.2, 0.1])          # the truth
q = np.array([0.5, 0.3, 0.2])          # the model

entropy(p)                             # 1.157   irreducible
cross_entropy(p, q)                    # 1.286   what you pay
kl(p, q)                               # 0.129   the waste

# THE IDENTITY:  H(p,q) = H(p) + KL(p||q)
np.isclose(cross_entropy(p, q), entropy(p) + kl(p, q))     # True
#
# MINIMISING CROSS-ENTROPY IS MINIMISING KL, because H(p) does not
# depend on your model. Training can only ever move the second term.

# A PERFECT MODEL PAYS THE ENTROPY AND NOTHING MORE:
cross_entropy(p, p), kl(p, p)          # (1.157, 0.0)

# WHICH MAKES A LOSS VALUE INTERPRETABLE. For 10-class classification:
np.log(10)                             # 2.303 nats -- random guessing
#
#   loss 2.30   the model has learned nothing
#   loss 1.60   equivalent to ~5 plausible classes remaining
#   loss 0.69   ~2 classes
#   loss 0.10   nearly certain, ~1.1 effective classes
#
# PERPLEXITY makes that explicit: exp(loss) is the effective number of
# choices the model is still weighing.
for loss in (2.303, 1.609, 0.693, 0.105):
    print(f"loss {loss:.3f}  ->  perplexity {np.exp(loss):.2f}")
#
# THIS IS HOW TO READ A LANGUAGE MODEL'S LOSS. A perplexity of 20 means
# the model is choosing among about 20 equally plausible next tokens.
# It also gives you a floor: if the text itself has irreducible
# entropy, no model can go below it, and a loss curve that flattens
# there has converged rather than failed.

# CROSS-ENTROPY IS MAXIMUM LIKELIHOOD IN DISGUISE:
#
#   -log P(data | model) = -sum_i log q(y_i)
#                        = N * cross-entropy(empirical, q)
#
# Minimising the loss and maximising the likelihood are the SAME
# operation, which is why the loss was never an arbitrary choice.
`,
      hl: [18, 22, 32, 47],
      caption: "**Perplexity is `exp(loss)`, the effective number of choices remaining.** It turns an abstract loss into a sentence you can say out loud, and it gives you a floor the model cannot go below."
    },

    { t: "callout", kind: "trap", title: "KL is not a distance", body: [
      { t: "p", text: "**`KL(p‖q) ≠ KL(q‖p)`**, and it violates the triangle inequality. Which order you use is a modelling decision with visible consequences, not a convention." },
      { t: "code", lang: "python", numbered: false, title: "and the two orders fail differently", code: `
p = np.array([0.5, 0.5, 0.0, 0.0])
q = np.array([0.25, 0.25, 0.25, 0.25])

kl(p, q)      # 1.0   -- finite
kl(q, p)      # inf   -- q has mass where p has none

# FORWARD KL, KL(p||q) -- "mass covering".
#   Wherever p has mass, q MUST have mass, or the term blows up. A
#   model fitted this way spreads itself to cover everything, including
#   regions with almost no data.
#   This is what maximum likelihood does.
#
# REVERSE KL, KL(q||p) -- "mode seeking".
#   Wherever q has mass, p must too, but q is free to IGNORE parts of
#   p. A model fitted this way locks onto one mode and drops the rest.
#   This is what variational inference does.

# THE VISIBLE CONSEQUENCE on a two-mode target:
#   forward KL  -> a single wide distribution straddling both modes,
#                  placing most of its mass in the empty gap between
#   reverse KL  -> a tight fit to ONE mode, ignoring the other
#
# NEITHER IS WRONG. They optimise different things, and "my generative
# model produces blurry averages" versus "my generative model ignores
# whole categories" is often exactly this choice showing up.

# THE SYMMETRIC ALTERNATIVE, when you genuinely need a distance:
def js(p, q):
    """Jensen-Shannon divergence: symmetric, and its square root is a
    true metric. Always finite, because m has mass wherever either
    does."""
    m = 0.5 * (np.asarray(p, float) + np.asarray(q, float))
    return 0.5 * kl(p, m) + 0.5 * kl(q, m)

js(p, q), js(q, p)       # 0.311, 0.311 -- symmetric, and finite`},
      { t: "p", text: "**\"Blurry averages\" and \"ignores whole categories\" are often this choice showing up**, not a bug. Forward KL covers the data and hedges; reverse KL commits to a mode and drops the rest." }
    ]},

    { t: "h2", n: "03", text: "Mutual information", id: "mutual-information" },

    { t: "code", lang: "python", title: "the dependence measure that catches everything", code: `
# MUTUAL INFORMATION is the KL divergence between the joint and the
# product of the marginals -- exactly the gap from lesson 3.7:
#
#     I(X;Y) = KL( P(X,Y) || P(X)P(Y) )
#            = H(X) - H(X|Y)
#
# Read the second form as: how many bits of uncertainty about X are
# removed by learning Y.

def mutual_information(joint):
    joint = np.asarray(joint, float)
    joint = joint / joint.sum()
    px = joint.sum(axis=1, keepdims=True)
    py = joint.sum(axis=0, keepdims=True)
    ind = px * py
    m = joint > 0
    return float((joint[m] * np.log2(joint[m] / ind[m])).sum())

# INDEPENDENT -- the joint IS the product of marginals.
mutual_information([[0.25, 0.25], [0.25, 0.25]])       # 0.0

# PERFECTLY DEPENDENT -- Y is a copy of X.
mutual_information([[0.5, 0.0], [0.0, 0.5]])           # 1.0 bit

# PARTIALLY DEPENDENT.
mutual_information([[0.4, 0.1], [0.1, 0.4]])           # 0.278

# WHY IT BEATS CORRELATION: it catches ANY dependence, not just linear.
rng = np.random.default_rng(0)
x = rng.uniform(-1, 1, 100_000)
y = x**2 + rng.normal(0, 0.05, 100_000)

np.corrcoef(x, y)[0, 1]                                # 0.002 -- blind

from sklearn.feature_selection import mutual_info_regression
mutual_info_regression(x.reshape(-1, 1), y, random_state=0)   # [1.15]
#
# THE PARABOLA FROM LESSON 3.7, FOUND. This is why a feature filter
# should use mutual information rather than correlation -- correlation
# encodes a linearity assumption the downstream model does not share.

# WHAT MI DOES NOT TELL YOU:
#
# 1. DIRECTION. I(X;Y) = I(Y;X) always -- it is symmetric, so it says
#    nothing about which causes which.
#
# 2. SHAPE. A high MI does not say whether the relationship is
#    increasing, U-shaped or something else. Plot it.
#
# 3. REDUNDANCY. Two features can each have high MI with the target and
#    be duplicates of each other. Ranking features by individual MI and
#    taking the top k routinely selects the same information k times --
#    which is why greedy selection needs a redundancy penalty (mRMR)
#    rather than a plain ranking.
`,
      hl: [5, 6, 37, 52],
      caption: "**Ranking features by individual mutual information selects duplicates.** Two copies of the same signal both score highly, so a plain top-`k` can pick the same information repeatedly — the reason mRMR penalises redundancy."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Diagnose a classifier from its loss alone",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Four models are training on the same 10-class problem. You have only their loss curves — no accuracy, no confusion matrices. Diagnose each one." },
        { t: "code", lang: "python", numbered: false, title: "final losses, in nats", code: `
runs = {
    "A": {"train": 2.302, "val": 2.303},
    "B": {"train": 0.011, "val": 3.847},
    "C": {"train": 1.386, "val": 1.402},
    "D": {"train": 0.694, "val": 0.691},
}
# 10 classes. The label noise rate is believed to be about 8%.`},
        { t: "p", text: "For each run, say what is happening, express it in perplexity, and give the next action." }
      ],
      requirements: [
        "Compute the reference losses: random guessing, and the label-noise floor.",
        "Diagnose each run with its perplexity.",
        "Say which run is closest to the achievable limit.",
        "Give one concrete next action per run.",
        "Explain what a validation loss above the random baseline means.",
        "Include tests."
      ],
      hint: "Compute `ln(10)` first, then work out what loss an 8% label-noise rate implies for a perfect model.",
      solution: {
        lang: "python",
        title: "diagnose.py",
        code: `import numpy as np

K = 10
NOISE = 0.08

runs = {
    "A": {"train": 2.302, "val": 2.303},
    "B": {"train": 0.011, "val": 3.847},
    "C": {"train": 1.386, "val": 1.402},
    "D": {"train": 0.694, "val": 0.691},
}


# =========================================================================
# THE TWO REFERENCE LINES
# =========================================================================
#
# 1. RANDOM GUESSING. A uniform prediction over K classes:
random_loss = np.log(K)                    # 2.3026 nats
#
# Any loss at or above this means the model has learned nothing. A
# loss ABOVE it means something worse -- see run B.

# 2. THE LABEL-NOISE FLOOR. With a fraction e of labels flipped
# uniformly to a wrong class, even a perfect model cannot do better
# than predicting the noisy label distribution:
#
#     the true class gets (1-e), each other gets e/(K-1)
#
# Its expected loss is the ENTROPY of that distribution:

def noise_floor(k=K, e=NOISE):
    p = np.full(k, e / (k - 1))
    p[0] = 1 - e
    return float(-(p * np.log(p)).sum())

floor = noise_floor()                      # 0.4573 nats
#
# NO MODEL CAN GO BELOW 0.457 ON THIS DATA. That is not a training
# limitation -- it is H(p), the irreducible term from the identity
# H(p,q) = H(p) + KL(p||q). Only the KL term is reachable.

perplexity = np.exp

perplexity(random_loss)                    # 10.00  -- all classes open
perplexity(floor)                          # 1.58   -- nearly decided


# =========================================================================
# THE FOUR DIAGNOSES
# =========================================================================

for name, r in runs.items():
    print(f"{name}: train {r['train']:.3f} (ppl {perplexity(r['train']):5.2f})   "
          f"val {r['val']:.3f} (ppl {perplexity(r['val']):6.2f})   "
          f"gap {r['val'] - r['train']:+.3f}")

# A: train 2.302 (ppl 10.00)   val 2.303 (ppl  10.00)   gap +0.001
# B: train 0.011 (ppl  1.01)   val 3.847 (ppl  46.86)   gap +3.836
# C: train 1.386 (ppl  4.00)   val 1.402 (ppl   4.06)   gap +0.016
# D: train 0.694 (ppl  2.00)   val 0.691 (ppl   1.99)   gap -0.003


# ---- RUN A -- NOT LEARNING ---------------------------------------------
#
# Loss 2.302 on BOTH sets, exactly ln(10). Perplexity 10.00: the model
# is spreading its probability uniformly over all ten classes. It has
# learned nothing at all.
#
# This is not underfitting-by-degree, it is a training failure. The
# signatures are unambiguous because the loss sits precisely at the
# uniform value rather than slightly below it.
#
# NEXT ACTION: this is almost never a modelling problem. Check, in
# order: learning rate zero or gradients not flowing (a detached
# tensor, a frozen layer), labels shuffled relative to inputs, or the
# final layer outputting a constant. Run the gradient check from
# lesson 2.6 before changing anything about the architecture.


# ---- RUN B -- SEVERE OVERFITTING, AND WORSE -----------------------------
#
# Train 0.011 (perplexity 1.01 -- memorised) against val 3.847.
#
# THE VALIDATION LOSS IS ABOVE ln(10) = 2.303. That is the important
# part and it is often missed: the model is performing WORSE THAN
# RANDOM GUESSING on unseen data.
#
# A model that had learned nothing would score 2.303. Scoring 3.847
# means it is CONFIDENTLY WRONG -- assigning high probability to
# incorrect classes. Cross-entropy punishes confident errors without
# limit, so this is the signature of memorisation plus overconfidence.
perplexity(3.847)                          # 46.9, on a 10-class problem
#
# A perplexity above K is only possible through confident mistakes.
#
# NEXT ACTION: regularise hard. Early stopping first (the val curve
# will have had a minimum long before this point), then dropout,
# weight decay, and label smoothing -- which directly targets the
# overconfidence by capping the maximum achievable confidence.


# ---- RUN C -- UNDERFITTING ----------------------------------------------
#
# Train 1.386, val 1.402, gap 0.016. No overfitting at all, and 1.386
# is exactly ln(4).
#
# PERPLEXITY 4.00: the model has narrowed ten classes down to four
# equally plausible ones. It has learned something real -- 2.3 -> 1.39
# is genuine progress -- but it is a long way from the 0.457 floor.
np.log(4)                                  # 1.3863, matching exactly
#
# The tiny generalisation gap says capacity is the constraint, not
# data. A model that is not overfitting has room to grow.
#
# NEXT ACTION: increase capacity, train longer, or improve features.
# Do NOT add regularisation -- there is nothing to regularise.


# ---- RUN D -- CLOSE TO DONE, WITH A CAVEAT ------------------------------
#
# Train 0.694, val 0.691. Perplexity 2.00 -- the model is choosing
# between two plausible classes.
#
# Val is very slightly BELOW train, which is normal when regularisation
# is active during training but not at evaluation (dropout, or
# batch-norm in train mode). It is not a sign of a leak by itself.
#
# THE GAP TO THE FLOOR: 0.691 against 0.457 is 0.234 nats, so about a
# third of the remaining loss is still model error rather than noise.
runs["D"]["val"] - floor                   # 0.234
(runs["D"]["val"] - floor) / runs["D"]["val"]   # 34%
#
# NEXT ACTION: there is real headroom, but it is the last third. The
# cheap wins are gone. Before spending more on the model, VERIFY THE
# 8% NOISE ESTIMATE -- the whole floor depends on it, and if the true
# rate is 15% then D is already at the limit and further work is
# wasted.
noise_floor(e=0.15)                        # 0.6903 -- exactly D's loss
#
# THAT IS THE MOST IMPORTANT FINDING IN THE SET. If label noise is 15%
# rather than 8%, run D has converged and the correct action is to
# clean labels, not to train longer. A single unverified assumption
# is the difference between "a third to go" and "finished".


# =========================================================================
# WHICH IS CLOSEST TO THE LIMIT
# =========================================================================
#
#   D:  0.691 vs floor 0.457  ->  1.51x the floor      <- closest
#   C:  1.402 vs floor 0.457  ->  3.07x
#   A:  2.303 vs floor 0.457  ->  5.04x
#   B:  3.847 vs floor 0.457  ->  8.41x (and worse than random)
#
# RANKING BY DISTANCE TO THE ACHIEVABLE FLOOR is more informative than
# ranking by loss, because it says how much room is actually left
# rather than how good the number looks.


# =========================================================================
# TESTS
# =========================================================================

def test_random_baseline_is_log_k():
    assert np.isclose(np.log(K), 2.3026, atol=1e-4)
    assert np.isclose(np.exp(np.log(K)), K)


def test_noise_floor_is_below_random_and_above_zero():
    assert 0 < noise_floor() < np.log(K)


def test_noise_floor_rises_with_noise():
    floors = [noise_floor(e=e) for e in (0.0, 0.05, 0.08, 0.15, 0.30)]

    assert all(a < b for a, b in zip(floors, floors[1:]))
    assert np.isclose(floors[0], 0.0, atol=1e-12)      # clean labels


def test_run_a_is_exactly_uniform():
    assert abs(runs["A"]["val"] - np.log(K)) < 0.002
    assert abs(np.exp(runs["A"]["val"]) - K) < 0.05


def test_run_b_is_worse_than_random():
    """The finding that distinguishes overfitting from confident
    wrongness."""
    assert runs["B"]["val"] > np.log(K)
    assert np.exp(runs["B"]["val"]) > K


def test_run_c_has_no_generalisation_gap():
    assert runs["C"]["val"] - runs["C"]["train"] < 0.05
    assert runs["C"]["val"] > 2 * noise_floor()        # room to grow


def test_run_d_is_at_the_floor_if_noise_is_15_percent():
    """The assumption that decides whether D is finished."""
    assert abs(noise_floor(e=0.15) - runs["D"]["val"]) < 0.01


def test_ranking_by_distance_to_floor():
    order = sorted(runs, key=lambda k: runs[k]["val"] / noise_floor())

    assert order[0] == "D"
    assert order[-1] == "B"`,
        notes: [
          { t: "p", text: "**Two reference lines make a loss readable**: `ln(10) = 2.303` for random guessing, and the entropy of the noisy label distribution — 0.457 nats at 8% noise — as the floor no model can pass." },
          { t: "callout", kind: "insight", title: "Run B is worse than random, which is a different diagnosis from overfitting", body: [
            { t: "p", text: "A validation loss of 3.847 exceeds `ln(10)`, giving perplexity 46.9 on a 10-class problem. A model that had learned nothing would score 2.303; scoring higher means it is *confidently wrong*, and cross-entropy punishes confident errors without limit." },
            { t: "p", text: "That points at label smoothing specifically, not just at generic regularisation — it caps the confidence the model can express." }
          ]},
          { t: "p", text: "**Run A sits precisely at `ln(10)` with zero gap**, which is a training failure rather than underfitting: a zero learning rate, gradients not flowing, or labels shuffled relative to inputs. Run the gradient check from lesson 2.6 before touching the architecture." },
          { t: "p", text: "**Run C's loss is exactly `ln(4)`** — ten classes narrowed to four equally plausible ones, with no generalisation gap. Capacity is the constraint, so adding regularisation would be the wrong move." },
          { t: "p", text: "**The most important finding is about run D's assumption.** The 8% noise estimate gives a floor of 0.457, leaving a third of the loss reachable. If the true rate is 15%, the floor is 0.690 — exactly D's loss — and the correct action is to clean labels rather than train longer. One unverified number separates \"a third to go\" from \"finished\"." },
          { t: "p", text: "**Rank by distance to the floor, not by loss.** It says how much room is left rather than how good the number looks." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team spent six weeks trying to push a text classifier's cross-entropy below 0.35 and could not, despite trying larger models, more data and extensive tuning." },
      { t: "p", text: "**They eventually had 500 examples relabelled by three annotators and measured the disagreement rate: 12%.** The entropy of a 12%-noise label distribution over their class count was 0.34 nats." },
      { t: "p", text: "**The model had converged in week one.** Everything after that was measuring annotator disagreement, and no architecture could have gone below it — the floor was in the labels, not the model." },
      { t: "p", text: "**Estimate the label-noise floor before setting a loss target.** It costs a few hundred relabelled examples and it tells you whether the target you agreed to is achievable at all." }
    ]}
  ],

  takeaways: [
    "**Surprise is `−log p`**, because only the logarithm makes independent events add.",
    "**Entropy is expected surprise**, and the uniform distribution maximises it at `log₂(n)`.",
    "**Entropy is a hard compression bound**, so computing it tells you when further compressor tuning is wasted.",
    "**`H(p,q) = H(p) + KL(p‖q)`** — training moves only the second term, because the first is the data's own uncertainty.",
    "**Minimising cross-entropy is maximum likelihood**, which is why the loss was never an arbitrary choice.",
    "**Perplexity is `exp(loss)`** — the effective number of choices the model is still weighing.",
    "**`ln(K)` is the random-guessing loss.** A validation loss above it means the model is confidently wrong, not merely uninformed.",
    "**KL is not symmetric and is not a distance.** Forward KL covers the data and hedges; reverse KL commits to one mode.",
    "**\"Blurry averages\" versus \"ignores whole categories\" is often the KL direction showing up**, not a bug.",
    "**Mutual information is the KL between the joint and the product of marginals** — it catches any dependence, not just linear.",
    "**Ranking features by individual mutual information selects duplicates**, since redundant copies both score highly.",
    "**Estimate the label-noise floor before setting a loss target** — a few hundred relabelled examples say whether the target is reachable."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A 10-class classifier reaches a validation loss of 3.85 nats. What does that mean?",
        options: [
          "It is close to convergence",
          "It is worse than random guessing (`ln(10) = 2.30`) — the model is confidently wrong, not merely uninformed",
          "The loss is being computed in the wrong base",
          "It has 3.85 classes remaining"
        ],
        answer: 1,
        why: "Perplexity of 46.9 on a 10-class problem is only possible through confident mistakes, and cross-entropy punishes those without limit. This points at label smoothing specifically — it caps the confidence the model can express — rather than at generic regularisation."
      },
      {
        stem: "Why is minimising cross-entropy not an arbitrary choice of loss?",
        options: [
          "It is differentiable, unlike accuracy",
          "It is maximum likelihood — `−log P(data|model)` equals `N ×` cross-entropy — and equivalently it minimises `KL(p‖q)`",
          "It is bounded below by zero",
          "It works well empirically"
        ],
        answer: 1,
        why: "`H(p,q) = H(p) + KL(p‖q)`, and `H(p)` does not depend on the model, so minimising the loss can only move the KL term. Differentiability is a convenience; the likelihood identity is the reason."
      },
      {
        stem: "Your generative model produces blurry averages instead of committing to distinct modes. What is the likely cause?",
        options: [
          "Insufficient capacity",
          "Forward KL, which is mass-covering — the model must put mass wherever the data has any, so it straddles modes and fills the gap between them",
          "The learning rate is too high",
          "Too much regularisation"
        ],
        answer: 1,
        why: "Reverse KL is mode-seeking and produces the opposite failure — a tight fit to one mode with whole categories ignored. Neither is wrong; they optimise different things, and this is a modelling decision rather than a bug."
      },
      {
        stem: "You cannot push a classifier's loss below 0.35 despite six weeks of work. What should you check?",
        options: [
          "Try a larger model",
          "The label-noise floor — relabel a sample and compute the entropy of the noisy label distribution, which may already equal 0.35",
          "Increase the learning rate",
          "Add more training data"
        ],
        answer: 1,
        why: "`H(p)` is irreducible: if annotators disagree 12% of the time, the entropy of that distribution is the floor and no architecture goes below it. A few hundred relabelled examples answer the question, and they are cheaper than the six weeks."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does cross-entropy loss actually measure?",
        strong: "The expected bits to encode data from the true distribution using a code built for your model's distribution. It decomposes as `H(p) + KL(p‖q)` — irreducible data uncertainty plus the cost of your model being wrong — and minimising it is maximum likelihood.",
        answer: [
          { t: "p", text: "The decomposition is the substance: it explains why training can only ever move one of the two terms." },
          { t: "p", text: "Adding perplexity as the readable form — `exp(loss)` is the effective number of choices — shows you use the number rather than just report it." }
        ]
      },
      {
        level: "advanced",
        q: "Why is KL divergence not a distance, and does it matter?",
        strong: "It is asymmetric and violates the triangle inequality. It matters because the two directions give different models: forward KL is mass-covering and hedges across modes, reverse KL is mode-seeking and drops modes. Jensen-Shannon is the symmetric alternative when you need a metric.",
        answer: [
          { t: "p", text: "Connecting the asymmetry to a visible failure mode — blurry averages against dropped categories — makes it practical rather than a technicality." },
          { t: "p", text: "Noting that maximum likelihood uses forward KL and variational inference uses reverse places both methods at once." }
        ]
      },
      {
        level: "advanced",
        q: "How would you know when a model has converged as far as it can?",
        strong: "Compare the loss against the label-noise floor — the entropy of the noisy label distribution. If annotators disagree 12% of the time, that entropy is a hard limit no model passes. I would relabel a few hundred examples to estimate it before setting any target.",
        answer: [
          { t: "p", text: "Proposing to measure the floor rather than to keep training is the judgement being tested." },
          { t: "p", text: "Framing it as `H(p)` from the cross-entropy decomposition shows the answer comes from understanding rather than a rule of thumb." }
        ]
      }
    ]
  }
});
