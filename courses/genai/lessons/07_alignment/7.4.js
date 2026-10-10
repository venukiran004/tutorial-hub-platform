EC.receiveLesson({
  id: "7.4",

  lede: "A reward model turns comparisons into a scalar, and the Bradley-Terry loss that does it depends **only on differences of rewards**. That is not a footnote \u2014 it means the absolute scale is mathematically unidentifiable. I fitted the same 4,000 comparisons twice, once from zero and once from an initialisation of 100 everywhere, and the fitted scores differed by about 100 while every pairwise difference matched to **0.000000**. The worked numbers all check out exactly, and the property they rest on is this one.",

  objectives: [
    "Write the Bradley-Terry loss and read it in words",
    "Compute the loss and its gradient for a given reward gap",
    "Explain why the sigmoid saturates and what that buys",
    "Demonstrate that the absolute reward scale carries no information",
    "Judge a reward model by held-out preference accuracy, and know what its ceiling is"
  ],

  prerequisites: ["7.1", "7.3"],

  blocks: [

    { t: "h2", n: "01", id: "why", text: "Why comparisons rather than scores",
      sub: "7.1's asymmetry, made concrete" },

    { t: "p", text: "You want a function that says this answer is worth 7.2 and that one 3.1. Humans cannot supply that: ask ten people to rate an answer out of ten and you get ten different scales. They *can* reliably say A is better than B." },

    { t: "p", text: "So you collect comparisons and fit a scalar-scoring model whose **differences** explain them. The scores are a latent construct invented to be consistent with the clicks \u2014 which is exactly why \u00a704\u2019s result about the scale follows." },

    { t: "math", tex: "P(A \\succ B) = \\sigma\\big(r(A) - r(B)\\big), \\qquad \\sigma(z) = \\frac{1}{1 + e^{-z}}" },

    { t: "p", text: "Maximising the likelihood of the observed choices gives the training objective." },

    { t: "math", tex: "\\mathcal{L}_{\\text{RM}} = -\\,\\mathbb{E}_{(x,\\,y_w,\\,y_l)}\\Big[\\log \\sigma\\big(r_\\theta(x, y_w) - r_\\theta(x, y_l)\\big)\\Big]" },

    { t: "callout", kind: "insight", title: "Read it in words",
      body: [
        { t: "p", text: "**Push the winner\u2019s score above the loser\u2019s, and stop pushing once the gap is comfortably positive.** The second clause is the sigmoid saturating, and \u00a703 measures how fast." },
        { t: "p", text: "Note what the loss does *not* contain: any notion of a correct absolute value. There is no target like \u201cthis answer should score 7.2\u201d, only a target ordering. Every property in this lesson follows from that." },
        { t: "p", text: "It is also exactly the binary cross-entropy of a logistic regression whose single feature is the reward gap. So an RM is a classifier wearing a scorer\u2019s clothing \u2014 it is trained to predict which of two answers a human picked." }
      ] },

    { t: "h2", n: "02", id: "numbers", text: "The loss on numbers",
      sub: "Checking the three cases" },

    { t: "code", lang: "python", title: "g74.py \u00a7A \u2014 the worked examples", code: `sig  = lambda z: 1.0 / (1.0 + np.exp(-z))
loss = lambda gap: -np.log(sig(gap))`,
      out: `  case                              gap      sigma       loss
  model is right                    0.6     0.6457     0.4375   reference 0.4372  OK
  model has it backwards           -1.3     0.2142     1.5410   reference 1.5412  OK
  already confident                 4.0     0.9820     0.0181   reference 0.0180  OK

  reference calls the backwards case '3.5x the penalty': 3.522x -> OK`,
      hl: [3, 4, 5, 7],
      caption: "All three match to rounding, and so does the 3.5\u00d7 claim at 3.522\u00d7." },

    { t: "h2", n: "03", id: "saturation", text: "Saturation is the sigmoid's derivative",
      sub: "Not a heuristic, not a trick" },

    { t: "p", text: "The gradient of the loss with respect to the gap has an unusually clean form, which is why this loss is used rather than something hand-designed." },

    { t: "math", tex: "\\frac{\\partial}{\\partial g}\\big[-\\log\\sigma(g)\\big] = \\sigma(g) - 1, \\qquad \\big|\\text{gradient}\\big| = 1 - \\sigma(g)" },

    { t: "code", lang: "python", title: "g74.py \u00a7B \u2014 loss and gradient against the gap", code: `for g in (-4, -2, -1, 0, 0.6, 1, 2, 4, 8):
    grad = 1 - sig(g)`,
      out: `  gap              loss   |gradient|  % of max grad
  -4.0           4.0181       0.9820          98.2%
  -2.0           2.1269       0.8808          88.1%
  -1.0           1.3133       0.7311          73.1%
   0.0           0.6931       0.5000          50.0%
   0.6           0.4375       0.3543          35.4%
   1.0           0.3133       0.2689          26.9%
   2.0           0.1269       0.1192          11.9%
   4.0           0.0181       0.0180           1.8%
   8.0           0.0003       0.0003           0.0%`,
      hl: [2, 10, 11],
      caption: "At gap 4 the gradient is 1.8% of its maximum; at gap 8 it is 0.03%. Capacity goes where the model is wrong." },

    { t: "callout", kind: "good", title: "This is the same shape as the Bradley-Terry loss being well-behaved",
      body: [
        { t: "p", text: "A badly ranked pair at gap \u22124 carries 98.2% of the maximum gradient, and a confidently correct pair at gap 4 carries 1.8%. So the optimiser automatically spends its budget on the pairs it currently gets wrong, with no curriculum, no reweighting and no hard-example mining." },
        { t: "p", text: "The symmetry is worth noticing: the loss at gap \u2212g and the gradient at gap +g are related through \u03c3, so the function is steepest exactly where the model is most wrong and flattest where it is most right. That is the property you would hand-design if you could, and here it falls out of the likelihood." },
        { t: "p", text: "It also sets up the failure mode in \u00a705. Because gradient vanishes once a gap is large, an RM has no pressure to keep *calibrated* magnitudes \u2014 it only needs the ordering. Nothing in training constrains how big a correct gap becomes." }
      ] },

    { t: "callout", kind: "note", title: "Use logsigmoid, not log of sigmoid",
      body: [
        { t: "p", text: "`-F.logsigmoid(gap)` rather than `-torch.log(torch.sigmoid(gap))`. For a large negative gap the inner sigmoid underflows to zero and the log becomes `-inf`; `logsigmoid` computes it in one numerically stable step." },
        { t: "p", text: "Large negative gaps are exactly what you get early in training when the model has pairs backwards, so this is not an edge case \u2014 it is the first few hundred steps of every run." },
        { t: "p", text: "The same argument applies throughout this module. 7.6\u2019s DPO loss has the identical shape, and the same stability note applies there for the same reason." }
      ] },

    { t: "h2", n: "04", id: "unidentifiable", text: "The absolute scale carries no information",
      sub: "Demonstrated exactly, not argued" },

    { t: "p", text: "It is commonly stated that \u201cthe absolute scale is meaningless (only differences matter), so normalise scores before use\u201d. That is a strong claim and it is provable in one experiment: fit the same comparisons from two very different starting points and compare." },

    { t: "code", lang: "python", title: "g74.py \u00a7C \u2014 fit 4,000 comparisons from six latent rewards", code: `true_r = np.array([2.0, 1.4, 0.9, 0.3, -0.5, -1.2])
for _ in range(4000):
    i, j = rng.choice(6, size=2, replace=False)
    PAIRS.append((i, j) if rng.random() < sig(true_r[i] - true_r[j]) else (j, i))

def fit(pairs, n_items, iters=4000, lr=0.25, init=None):
    r = np.zeros(n_items) if init is None else init.copy()
    for _ in range(iters):
        g = np.zeros(n_items)
        for w, l in pairs:
            p = sig(r[w] - r[l])
            g[w] += (1 - p); g[l] -= (1 - p)
        r += lr * g / len(pairs)
    return r`,
      out: `  answer       true r   fitted r  fitted-mean
  0             2.000      1.479        1.479
  1             1.400      0.985        0.985
  2             0.900      0.392        0.392
  3             0.300     -0.148       -0.148
  4            -0.500     -1.066       -1.066
  5            -1.200     -1.642       -1.642

  true   spread (max-min): 3.200
  fitted spread (max-min): 3.121
  correlation of true vs fitted: 0.9989`,
      hl: [8, 9, 10, 11],
      caption: "Correlation 0.9989 and spread recovered to within 2.5% \u2014 the fit works. Note the fitted column is shifted from the true one." },

    { t: "code", lang: "python", title: "g74.py \u00a7C \u2014 the same data, initialised at 100", code: `shifted = fit(PAIRS, 6, init=np.full(6, 100.0))`,
      out: `  refit starting from r = 100 everywhere:
    fitted: [101.479 100.985 100.392  99.852  98.934  98.358]
    same DIFFERENCES? max |pairwise-diff change| = 0.000000`,
      hl: [2, 3],
      caption: "Scores around 100 instead of around 0, and every pairwise difference identical to six decimal places." },

    { t: "callout", kind: "insight", title: "So a reward model's raw score is not a quantity",
      body: [
        { t: "p", text: "The loss is a function of \\(r_w - r_l\\) only, so adding any constant to every reward leaves it exactly unchanged. The mean is a free parameter the data cannot pin down, and the fit confirms it to six decimals." },
        { t: "p", text: "Which means \u201cthe reward model scored this answer 4.7\u201d is a statement with no content on its own. It is meaningful only relative to another score from the same model \u2014 and not comparable at all across two RMs, or across two training runs of the same RM." },
        { t: "p", text: "Hence the practical instruction: normalise before use. In RLHF the rewards go into an advantage calculation, and 7.5 shows why an unnormalised scale interacts badly with a fixed KL coefficient \u2014 \u03b2 trades off against reward magnitude, so a shifted scale silently retunes your leash." }
      ] },

    { t: "callout", kind: "tradeoff", title: "The differences are identified; the scale of the differences is set by the data",
      body: [
        { t: "p", text: "Worth being precise, because \u201conly differences matter\u201d can be over-read. The *differences* are identified \u2014 recovered here to a correlation of 0.9989. What is unidentified is the additive constant, not the spread." },
        { t: "p", text: "The spread does carry meaning: it is how decisively the comparisons separate the items. True spread 3.200 came back as 3.121, so Bradley-Terry recovers the strength of preference as well as the ordering, given enough comparisons." },
        { t: "p", text: "That is why normalising should mean *centring*, and rescaling only if you know what you are doing. Dividing by the standard deviation discards the information about how strong the preferences were, which is real signal." }
      ] },

    { t: "viz", title: "Two fits, one set of differences", caption: "Initialised at 0 or at 100, the fitted scores differ by ~100 and every pairwise difference is identical.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Bradley-Terry fits from two initialisations give identical differences">
  <text x="16" y="22" class="s-label">FIT FROM r = 0</text>
  <line x1="60" y1="70" x2="700" y2="70" stroke="var(--line)" stroke-width="1.2"/>
  <circle cx="648" cy="70" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="648" y="58" text-anchor="middle" class="s-mono" style="font-size:9px">1.48</text>
  <circle cx="589" cy="70" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="589" y="58" text-anchor="middle" class="s-mono" style="font-size:9px">0.99</text>
  <circle cx="518" cy="70" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="518" y="58" text-anchor="middle" class="s-mono" style="font-size:9px">0.39</text>
  <circle cx="453" cy="70" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="453" y="58" text-anchor="middle" class="s-mono" style="font-size:9px">-0.15</text>
  <circle cx="343" cy="70" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="343" y="58" text-anchor="middle" class="s-mono" style="font-size:9px">-1.07</text>
  <circle cx="274" cy="70" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="274" y="58" text-anchor="middle" class="s-mono" style="font-size:9px">-1.64</text>
  <text x="60" y="90" class="s-sub" style="font-size:9px">-2</text>
  <text x="700" y="90" class="s-sub" style="font-size:9px">+2</text>

  <text x="16" y="140" class="s-label">FIT FROM r = 100</text>
  <line x1="60" y1="188" x2="700" y2="188" stroke="var(--line)" stroke-width="1.2"/>
  <circle cx="648" cy="188" r="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="648" y="176" text-anchor="middle" class="s-mono" style="font-size:9px">101.48</text>
  <circle cx="589" cy="188" r="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="589" y="176" text-anchor="middle" class="s-mono" style="font-size:9px">100.99</text>
  <circle cx="518" cy="188" r="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="518" y="176" text-anchor="middle" class="s-mono" style="font-size:9px">100.39</text>
  <circle cx="453" cy="188" r="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="453" y="176" text-anchor="middle" class="s-mono" style="font-size:9px">99.85</text>
  <circle cx="343" cy="188" r="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="343" y="176" text-anchor="middle" class="s-mono" style="font-size:9px">98.93</text>
  <circle cx="274" cy="188" r="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="274" y="176" text-anchor="middle" class="s-mono" style="font-size:9px">98.36</text>
  <text x="60" y="208" class="s-sub" style="font-size:9px">98</text>
  <text x="700" y="208" class="s-sub" style="font-size:9px">102</text>

  <text x="16" y="236" class="s-mono" style="fill:var(--good)">identical spacing \u2014 max pairwise-difference change = 0.000000</text>
</svg>` },

    { t: "h2", n: "05", id: "accuracy", text: "Judging a reward model",
      sub: "And the ceiling nobody mentions" },

    { t: "p", text: "The metric is the right one: held-out preference accuracy, meaning how often \\(r(y_w) > r(y_l)\\). It also gives a floor \u2014 below about 65% and downstream RL chases noise. What it does not mention is that the ceiling is not 100%." },

    { t: "code", lang: "python", title: "g74.py \u00a7D \u2014 fitted accuracy against the best possible", code: `def accuracy(r, pairs):
    return np.mean([r[w] > r[l] for w, l in pairs])`,
      out: `  fitted RM accuracy on its own training pairs: 78.6%
  BAYES-OPTIMAL accuracy (using the TRUE rewards): 78.6%`,
      hl: [3, 4],
      caption: "The fit reaches the theoretical maximum exactly \u2014 and the maximum is 78.6%, not 100%." },

    { t: "callout", kind: "insight", title: "78.6% is the ceiling because the labels are themselves stochastic",
      body: [
        { t: "p", text: "The comparisons were generated *from* Bradley-Terry: a pair with a reward gap of 0.6 is won by the better answer only 64.6% of the time. So some labels disagree with the true ordering, and no scorer \u2014 not even one handed the exact latent rewards \u2014 can predict them all." },
        { t: "p", text: "The fitted model matching the Bayes-optimal accuracy to the decimal is the real validation here. It says the fit has extracted everything the data contains, and the remaining 21.4% is annotator noise rather than model error." },
        { t: "p", text: "Which reframes the 65% floor usefully. It is not \u201c65% of the way to perfect\u201d \u2014 it is 65% against a ceiling set by how consistently your annotators agree. If your human-human agreement is 75%, an RM at 70% is doing well, and chasing 90% means chasing label noise." }
      ] },

    { t: "callout", kind: "trap", title: "My own noise sweep in \u00a7D is not valid, and I am leaving it out",
      body: [
        { t: "p", text: "The script also perturbed the true rewards with Gaussian noise and reported accuracy at each level. The numbers came out **non-monotone** \u2014 63.2% at noise 1.0, then 70.4% at 2.0 and 68.8% at 4.0 \u2014 which cannot be right, since more noise cannot help." },
        { t: "p", text: "The cause is the experiment, not the phenomenon: six items, one random draw per noise level. With that little data a single draw can happen to preserve the ordering, so the sampling variance swamps the effect I was trying to show." },
        { t: "p", text: "The fix would be averaging over many draws, which I have not done here \u2014 so I am reporting that the sweep is uninformative rather than quoting its numbers. The \u00a7D results that *are* sound are the two above, because they involve no resampling." }
      ] },

    { t: "h2", n: "06", id: "practical", text: "Building one",
      sub: "A backbone, a scalar head, and four practical rules" },

    { t: "code", lang: "python", title: "the architecture", code: `class RewardModel(nn.Module):
    """Base LLM + a scalar head on the LAST token. One number per (prompt, answer)."""
    def __init__(self, backbone, hidden):
        super().__init__()
        self.backbone = backbone                 # the SFT model, LM head removed
        self.v_head   = nn.Linear(hidden, 1, bias=False)

    def forward(self, input_ids, attention_mask):
        h = self.backbone(input_ids, attention_mask=attention_mask).last_hidden_state
        last = attention_mask.sum(1) - 1                       # index of final real token
        pooled = h[torch.arange(h.size(0)), last]
        return self.v_head(pooled).squeeze(-1)

def rm_loss(model, chosen, chosen_mask, rejected, rejected_mask):
    r_w = model(chosen,   chosen_mask)
    r_l = model(rejected, rejected_mask)
    return -F.logsigmoid(r_w - r_l).mean()       # BCE-with-logits on the gap`,
      hl: [9, 10, 16],
      caption: "The `attention_mask.sum(1) - 1` is doing real work \u2014 with left or right padding, the last *real* token is not the last position." },

    { t: "dl", items: [
      { k: "Initialise from the SFT model", v: "Not the base model. The RM has to understand the task distribution it is scoring, and 7.1 showed a base model does not even represent turn structure." },
      { k: "Train about one epoch", v: "RMs overfit fast, and an overfit RM is worse than a smaller one \u2014 because 7.11\u2019s reward hacking is the policy exploiting exactly the RM\u2019s overfitted quirks." },
      { k: "Normalise before use", v: "\u00a704 is why. Centre the scores; be cautious about rescaling, since the spread is real signal." },
      { k: "Measure held-out preference accuracy", v: "And measure your annotator agreement too, because that is the ceiling the accuracy should be read against." }
    ] },

    { t: "exercise", kind: "build", title: "Fit Bradley-Terry and confirm what it can and cannot identify", difficulty: "advanced", minutes: 35,
      body: "Implement the Bradley-Terry fit on synthetic comparisons generated from known latent rewards. Verify that the differences are recovered and the additive constant is not, by fitting from two different initialisations. Then compute your fit's preference accuracy against the Bayes-optimal accuracy available from the true rewards.",
      requirements: [
        "Generate comparisons stochastically from sigma(r_i - r_j), not deterministically",
        "Fit from at least two different initialisations and compare pairwise differences",
        "Report correlation between true and fitted rewards, and both spreads",
        "Compute Bayes-optimal accuracy using the true rewards as the scorer",
        "State what the gap between your accuracy and 100% consists of"
      ],
      hint: "Generate the labels with a sigmoid rather than by always picking the higher reward. If you generate them deterministically you will measure a ceiling of 100% and learn nothing about the real one.",
      solution: { lang: "python", title: "the fit and both checks", code: `sig = lambda z: 1.0 / (1.0 + np.exp(-z))

true_r = np.array([2.0, 1.4, 0.9, 0.3, -0.5, -1.2])
rng = np.random.default_rng(0)
PAIRS = []
for _ in range(4000):
    i, j = rng.choice(len(true_r), size=2, replace=False)
    # STOCHASTIC label -- this is what sets the accuracy ceiling
    PAIRS.append((i, j) if rng.random() < sig(true_r[i] - true_r[j]) else (j, i))

def fit(pairs, n, iters=4000, lr=0.25, init=None):
    r = np.zeros(n) if init is None else init.copy()
    for _ in range(iters):
        g = np.zeros(n)
        for w, l in pairs:
            p = sig(r[w] - r[l])
            g[w] += (1 - p); g[l] -= (1 - p)
        r += lr * g / len(pairs)
    return r

a = fit(PAIRS, len(true_r))
b = fit(PAIRS, len(true_r), init=np.full(len(true_r), 100.0))
D = lambda r: r[:, None] - r[None, :]
print("corr(true, fitted)      : %.4f" % np.corrcoef(true_r, a)[0, 1])
print("spread true / fitted    : %.3f / %.3f"
      % (true_r.ptp(), a.ptp()))
print("max |diff change|       : %.6f" % np.abs(D(a) - D(b)).max())

acc = lambda r: np.mean([r[w] > r[l] for w, l in PAIRS])
print("fitted accuracy         : %.1f%%" % (100 * acc(a)))
print("Bayes-optimal accuracy  : %.1f%%" % (100 * acc(true_r)))`,
        out: `  corr(true, fitted)      : 0.9989
  spread true / fitted    : 3.200 / 3.121
  max |diff change|       : 0.000000
  fitted accuracy         : 78.6%
  Bayes-optimal accuracy  : 78.6%`,
        notes: [
          { t: "p", text: "**The third line is the headline.** Two fits whose scores differ by about 100 produce pairwise differences identical to six decimal places, because the loss is a function of differences only. The additive constant is a free parameter no amount of data constrains." },
          { t: "p", text: "**But the spread is identified**, which is the part \u201conly differences matter\u201d can obscure. True spread 3.200 came back as 3.121, so Bradley-Terry recovers how *strongly* items are preferred, not merely their order. That argues for centring scores rather than standardising them, since dividing by the standard deviation throws that away." },
          { t: "p", text: "**The last two lines are the real validation.** Matching Bayes-optimal to the decimal says the fit extracted everything in the data \u2014 and that the best achievable accuracy is 78.6%, not 100%, because the labels were generated stochastically." },
          { t: "p", text: "**So read the 65% floor against your annotator agreement, not against 100%.** A gap of 21.4% here is pure label noise. If your humans agree with each other 75% of the time, an RM at 70% is close to the ceiling and pushing for 90% means fitting disagreement." },
          { t: "p", text: "One thing to avoid if you extend this: I also perturbed the true rewards with Gaussian noise to show accuracy degrading, and got a non-monotone result \u2014 63.2% at noise 1.0 then 70.4% at 2.0. With six items and one draw per level, sampling variance dominates. Average over many draws or do not report it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "The Bradley-Terry loss is logistic regression on the reward gap, so an RM is a classifier that predicts which answer a human picked. Its gradient is \\(1 - \\sigma(g)\\), which means it automatically spends capacity where it is wrong and stops when a gap is comfortable." },
        { t: "p", text: "And because the loss sees only differences, the absolute score is not a quantity \u2014 demonstrated at 0.000000 difference between fits a hundred apart. Centre before use, judge by held-out preference accuracy, and read that accuracy against your annotators\u2019 agreement rather than against 100%." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur reward model gets 71% preference accuracy on held-out pairs. Is that good?\u201d**" },
        { t: "p", text: "It depends entirely on a number most teams have not measured: how often two human annotators agree with each other on the same pairs. That is the ceiling, and it is nowhere near 100%." },
        { t: "p", text: "I can show why with a synthetic case where I know the truth. I generated 4,000 comparisons from six known latent rewards using the Bradley-Terry sigmoid, so labels are stochastic \u2014 a gap of 0.6 means the better answer wins only 64.6% of the time. The best achievable accuracy, using the *true* rewards as the scorer, was 78.6%. My fitted model also got 78.6%, which says it had extracted everything in the data and the remaining 21.4% was pure label noise." },
        { t: "p", text: "So against a 78.6% ceiling, 71% is reasonable. Against a 95% ceiling it is poor. Without the agreement number, 71% is uninterpretable, and the standard advice that below about 65% downstream RL chases noise is a floor rather than a target." },
        { t: "p", text: "I would also check how the scores are being used, because a trained RM's raw scale carries no information at all. I fitted the same comparisons from an initialisation of zero and from an initialisation of 100: the scores came out about a hundred apart and every pairwise difference was identical to six decimal places. The loss depends only on differences, so the mean is a free parameter." },
        { t: "p", text: "That matters downstream because the KL coefficient in RLHF trades off against reward magnitude. If someone retrains the RM and the scale shifts, a fixed beta is silently a different leash length \u2014 so centre the rewards, and be careful about dividing by the standard deviation, since the spread is genuine signal about how decisive the preferences were." },
        { t: "p", text: "And one epoch, initialised from the SFT model. RMs overfit quickly, and an overfit RM is worse than a weaker one because the policy will find and exploit exactly its overfitted quirks." }
      ] }
  ],

  takeaways: [
    "**Bradley-Terry models preference as \u03c3(r_w \u2212 r_l)**, so the RM loss is logistic regression on the reward gap \u2014 a classifier predicting which answer a human picked.",
    "**The worked numbers all check out**: gap 0.6 \u2192 loss 0.4375, gap \u22121.3 \u2192 1.5410 (3.522\u00d7 the penalty), gap 4.0 \u2192 0.0181.",
    "**The gradient is 1 \u2212 \u03c3(gap)**, so a badly ranked pair carries 98.2% of maximum gradient and a confidently correct one 1.8% \u2014 capacity goes where the model is wrong, automatically.",
    "**Use `logsigmoid`, not log of sigmoid**, because large negative gaps are the first few hundred steps of every run and will otherwise produce `-inf`.",
    "**The absolute reward scale is unidentifiable** \u2014 fits from 0 and from 100 gave scores ~100 apart with every pairwise difference identical to 0.000000.",
    "**So \u201cthe RM scored this 4.7\u201d has no content** on its own, and scores are not comparable across models or across training runs.",
    "**But the spread IS identified** \u2014 true spread 3.200 recovered as 3.121 \u2014 so centre the scores rather than standardising them, since the spread is real signal.",
    "**Normalise before use because \u03b2 trades against reward magnitude** in RLHF, so a shifted scale silently retunes the KL leash.",
    "**Preference accuracy has a ceiling well below 100%**: measured, the Bayes-optimal accuracy was 78.6% because the labels are stochastic, and the fit matched it exactly.",
    "**So read accuracy against annotator agreement, not against 100%** \u2014 the 65% figure is a floor, and chasing 90% against a 78% ceiling means fitting label noise.",
    "**Initialise from the SFT model and train about one epoch**, because an overfit RM is worse than a weaker one \u2014 the policy exploits its quirks.",
    "**`attention_mask.sum(1) - 1` is load-bearing** in the scalar head, because with padding the last real token is not the last position."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Fitting the same 4,000 comparisons from an initialisation of 0 and from 100 gave fitted scores about 100 apart, with every pairwise difference identical to 0.000000. What does this establish?",
        options: [
          "The optimiser failed to converge from the second initialisation",
          "The absolute reward scale is unidentifiable \u2014 the loss is a function of differences only, so the mean is a free parameter the data cannot constrain",
          "The learning rate was too small to correct the offset within 4,000 iterations",
          "Bradley-Terry requires rewards to be initialised near zero to be well-posed"
        ],
        answer: 1,
        why: "Adding any constant to every reward leaves r_w \u2212 r_l unchanged, so the likelihood is exactly invariant to a shift and no amount of data pins the mean down. Both fits converged correctly \u2014 the identical differences prove it. The practical consequence is that a raw RM score is meaningless alone and not comparable across models or runs, which is why scores are centred before being used in RL, where \u03b2 trades off against reward magnitude." },

      { stem: "A reward model reaches 78.6% preference accuracy, exactly matching the accuracy obtained by scoring with the true latent rewards. What does the remaining 21.4% consist of?",
        options: [
          "Model capacity limitations that a larger reward model would reduce",
          "Label noise \u2014 the comparisons are stochastic, so some disagree with the true ordering and no scorer can predict them",
          "Overfitting to the training pairs, which held-out evaluation would reveal",
          "Optimisation error from insufficient training iterations"
        ],
        answer: 1,
        why: "The labels were generated from the Bradley-Terry sigmoid, so a pair with a gap of 0.6 is won by the better answer only 64.6% of the time \u2014 meaning some labels contradict the true ordering by construction. Matching the Bayes-optimal accuracy proves the fit extracted everything available, so the gap is irreducible given these labels. This reframes the usual 65% guidance: it is a floor measured against an annotator-agreement ceiling, not against perfection." },

      { stem: "Why does the Bradley-Terry gradient of 1 \u2212 \u03c3(gap) matter practically?",
        options: [
          "It makes the loss convex, guaranteeing a unique global optimum",
          "It concentrates capacity where the model is wrong \u2014 98.2% of maximum gradient at gap \u22124 against 1.8% at gap +4 \u2014 with no curriculum or hard-example mining needed",
          "It bounds the reward scale, preventing the scores from drifting",
          "It ensures the reward model's outputs are calibrated probabilities"
        ],
        answer: 1,
        why: "The sigmoid saturates, so the optimiser automatically stops spending on pairs it already ranks confidently and keeps pushing on pairs it has backwards. This is the property you would hand-design, and it falls out of the likelihood rather than being added. Note it does not bound the scale \u2014 quite the opposite: because gradient vanishes once a gap is large, nothing in training constrains how big a correct gap becomes, and nothing makes the scores calibrated." },

      { stem: "Which normalisation is appropriate for reward model scores before use in RL?",
        options: [
          "Standardise to zero mean and unit variance, so the scale is fully determined",
          "Centre them, and be cautious about rescaling \u2014 the additive constant is meaningless but the spread is identified and carries real signal about preference strength",
          "Map them to [0, 1] with a sigmoid, since they are logits",
          "No normalisation is needed, since only differences enter the objective"
        ],
        answer: 1,
        why: "The shift is the unidentified part and centring removes it. The spread is not unidentified \u2014 measured, a true spread of 3.200 was recovered as 3.121 \u2014 so dividing by the standard deviation discards information about how decisively the comparisons separated the answers. Normalisation is needed despite only differences entering the RM loss, because downstream the rewards meet a fixed KL coefficient, and \u03b2 trades off against reward magnitude." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The reward model, which is a classifier in disguise",
    questions: [
      { level: "advanced",
        q: "Explain how a reward model is trained.",
        strong: "A strong answer writes the loss and reads it in words.",
        answer: [
          { t: "p", text: "From pairwise comparisons, not from absolute ratings \u2014 because humans cannot give calibrated scores but can reliably say A is better than B. You model the probability a human prefers A as a sigmoid of the reward gap, \u03c3(r(A) \u2212 r(B)), and maximise the likelihood of the observed choices." },
          { t: "p", text: "That makes the loss negative log-sigmoid of the gap between chosen and rejected. In words: push the winner\u2019s score above the loser\u2019s, and stop pushing once the gap is comfortably positive. It is exactly binary cross-entropy on the gap, so an RM is a classifier wearing a scorer\u2019s clothing." },
          { t: "p", text: "Architecturally it is the SFT model with the language-model head replaced by a scalar head reading the last real token \u2014 and `attention_mask.sum(1) - 1` rather than the last position, because padding moves it. Initialise from SFT rather than base, since it has to understand the task distribution." },
          { t: "p", text: "The gradient is 1 \u2212 \u03c3(gap), which is the nice part: at a gap of \u22124 it is 98% of maximum and at +4 it is 1.8%, so capacity automatically goes to the pairs currently ranked wrongly. And train about one epoch \u2014 RMs overfit fast, and an overfit RM is worse than a weaker one because the policy will exploit its quirks." }
        ] },

      { level: "advanced",
        q: "What does a reward model's output value actually mean?",
        strong: "A strong answer knows the scale is unidentifiable and what follows.",
        answer: [
          { t: "p", text: "On its own, nothing. The loss depends only on differences of rewards, so adding a constant to every score leaves it exactly unchanged \u2014 the mean is a free parameter the data cannot determine." },
          { t: "p", text: "I verified that rather than taking it on faith: fitting the same 4,000 comparisons from an initialisation of zero and from an initialisation of 100 gave scores about a hundred apart, with every pairwise difference identical to six decimal places. So \u201cthe RM scored this 4.7\u201d is only meaningful relative to another score from the same model, and not comparable across models or across runs." },
          { t: "p", text: "The part that *is* identified is the spread. A true spread of 3.200 came back as 3.121, so Bradley-Terry recovers how strongly items are preferred, not just the ordering. That is why I would centre the scores but think twice before standardising \u2014 dividing by the standard deviation discards genuine signal." },
          { t: "p", text: "It matters downstream because in RLHF the KL coefficient \u03b2 trades off against reward magnitude. A retrained RM with a shifted or rescaled output silently changes your leash length without anything in the config changing, which is a nasty class of bug." }
        ] },

      { level: "core",
        q: "How do you know if your reward model is good enough?",
        strong: "A strong answer treats the ceiling as the missing number.",
        answer: [
          { t: "p", text: "Held-out preference accuracy \u2014 how often r(chosen) exceeds r(rejected) on pairs the model never saw. The common guidance is that below about 65% downstream RL chases noise, and I would treat that as a floor rather than a target." },
          { t: "p", text: "The number most teams are missing is the ceiling, which is their own annotator agreement. Preference labels are stochastic, so the best achievable accuracy is well under 100%. In a synthetic case where I knew the latent rewards, the Bayes-optimal accuracy was 78.6% \u2014 and my fitted model hit 78.6% exactly, meaning the remaining 21.4% was pure label noise rather than model error." },
          { t: "p", text: "So 71% against a 78% ceiling is good, and 71% against a 95% ceiling is poor. Without the agreement measurement the accuracy is uninterpretable, and pushing it higher risks fitting disagreement between annotators." },
          { t: "p", text: "I would also hold out whole prompts rather than individual pairs, so the evaluation measures generalisation to new tasks rather than to new responses on tasks already seen \u2014 and watch the train-test gap closely, since the overfitting happens fast." }
        ] }
    ]
  }
});
