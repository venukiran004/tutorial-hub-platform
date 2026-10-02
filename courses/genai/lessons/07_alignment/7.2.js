EC.receiveLesson({
  id: "7.2",

  lede: "Chinchilla gives two numbers worth memorising \u2014 training FLOPs \u2248 6ND and D \u2248 20N \u2014 and the reference\u2019s worked examples check out exactly: a 7B model compute-optimally trained is 140B tokens and **5.88 \u00d7 10\u00b2\u00b9** FLOPs, and Llama-3 8B at 15T tokens is **1,875 tokens per parameter, 93.8\u00d7 Chinchilla**. The part the reference asserts without quantifying is the interesting one, and the arithmetic is startling: over-training that 8B costs **7.2 \u00d7 10\u00b2\u00b3** training FLOPs, which is **1.22\u00d7 more than training a 70B Chinchilla-optimally**. The \u201cwasted\u201d training compute exceeds the entire cost of the bigger model.",

  objectives: [
    "State the pretraining objective and the two Chinchilla relations",
    "Compute compute-optimal token counts and training FLOPs for a given model size",
    "Explain why production models are deliberately over-trained",
    "Compute the inference volume at which over-training pays for itself",
    "Identify what you actually control at the pretraining stage"
  ],

  prerequisites: ["7.1"],

  blocks: [

    { t: "h2", n: "01", id: "objective", text: "One loss, and the scaling question it raises",
      sub: "You will not do this, and interviewers ask anyway" },

    { t: "p", text: "7.1 gave the objective: cross-entropy on the next token, no labels, no humans. Once that is fixed, the only remaining decisions are how big the model is and how much text it sees \u2014 and those trade against each other under a compute budget." },

    { t: "math", tex: "\\mathcal{L}_{\\text{pretrain}} = -\\frac{1}{T}\\sum_{t} \\log P_\\theta(x_t \\mid x_{<t})" },

    { t: "p", text: "The two relations that answer the trade-off are the ones to have memorised, because every scaling question in an interview reduces to them." },

    { t: "math", tex: "\\text{Training FLOPs} \\approx 6ND \\qquad\\qquad \\text{compute-optimal: } D \\approx 20N" },

    { t: "dl", items: [
      { k: "N", v: "Parameters. The 6 is roughly 2 for the forward pass and 4 for the backward pass, per parameter per token." },
      { k: "D", v: "Training tokens. Note this is tokens *processed*, so a second epoch over the same text counts twice." },
      { k: "D \u2248 20N", v: "The compute-optimal ratio \u2014 about 20 tokens per parameter. This is the Chinchilla result and it replaced an earlier consensus that models should be much larger relative to their data." }
    ] },

    { t: "code", lang: "python", title: "g72.py \u00a7A \u2014 the reference's worked example, checked", code: `N = 7e9
D = 20 * N
flops = 6 * N * D`,
      out: `  a 7B model, compute-optimal at 20 tokens/param
  D      = 20 x 7e9      = 1.4e+11 tokens
  FLOPs  = 6 x N x D     = 5.88e+21
  reference says ~5.9e21 -> MATCHES`,
      hl: [4],
      caption: "140 billion tokens and 5.88 \u00d7 10\u00b2\u00b9 FLOPs. The reference's arithmetic is correct." },

    { t: "callout", kind: "good", title: "Worth checking rather than trusting",
      body: [
        { t: "p", text: "This module is the most arithmetic-heavy in the course and the reference\u2019s numbers here are right \u2014 which is worth saying explicitly, because elsewhere they have not always been. 4.4 and 3.12 both turned up slips, and 6.8 turned up a claim that measurement contradicted." },
        { t: "p", text: "The habit that catches all of them is the same and costs nothing: recompute the worked example before building on it. A scaling relation you have verified once is a tool; one you have only read is a liability in an interview." },
        { t: "p", text: "The 6ND relation in particular is an approximation that ignores attention\u2019s quadratic term, embeddings and layer norms. It is accurate to within a few percent for typical transformer shapes at typical sequence lengths, which is why everyone uses it \u2014 but it is a rule of thumb rather than an identity." }
      ] },

    { t: "h2", n: "02", id: "overtrain", text: "Why production models ignore Chinchilla",
      sub: "It optimises the wrong cost" },

    { t: "p", text: "Chinchilla answers: given a fixed *training* compute budget, what model size and token count minimise loss? That is the right question for a research lab publishing a result and the wrong one for a product, because a served model is run billions of times after training ends." },

    { t: "code", lang: "python", title: "g72.py \u00a7B \u2014 Llama-3 8B against the optimum", code: `N8, D8 = 8e9, 15e12`,
      out: `  Llama-3 8B saw ~15T tokens
  tokens per parameter     = 1875
  Chinchilla-optimal would = 20
  ratio                    = 93.8x
  reference says ~1,875 tokens/param and ~90x -> BOTH MATCH

  training FLOPs, Chinchilla-optimal 8B : 7.68e+21
  training FLOPs, as actually trained   : 7.2e+23
  extra training compute spent          : 93.8x`,
      hl: [4, 8, 9],
      caption: "Ninety-four times the compute-optimal token count, and therefore ninety-four times the training FLOPs." },

    { t: "callout", kind: "insight", title: "The trade is training cost once against inference cost forever",
      body: [
        { t: "p", text: "Inference costs roughly **2N FLOPs per generated token** \u2014 the forward pass only, no backward. So inference cost scales with model *size* and is completely independent of how many tokens the model was trained on." },
        { t: "p", text: "That asymmetry is the whole argument. Training is a one-off; inference is a per-request tax you pay for the life of the product. So you deliberately overspend on training in order to reach a given quality at a *smaller* N, and then every request afterwards is cheaper." },
        { t: "p", text: "6.2 reached the structurally identical conclusion about retrieval \u2014 ingestion runs on the slow clock, so per-document work there is free relative to per-query work. Same shape, different scale: do expensive things where they happen once." }
      ] },

    { t: "h2", n: "03", id: "crossover", text: "When the waste pays for itself",
      sub: "The arithmetic the reference leaves out, and it is not small" },

    { t: "p", text: "The usual informal claim is that an aggressively over-trained 8B reaches roughly the quality of a Chinchilla-optimal 70B. Take that as given for a moment and the comparison becomes arithmetic." },

    { t: "code", lang: "python", title: "g72.py \u00a7C \u2014 training cost both ways, then the crossover", code: `N_big, N_small = 70e9, 8e9
train_big   = 6 * N_big * 20 * N_big      # 70B, Chinchilla-optimal
train_small = 6 * N_small * 15e12         # 8B, over-trained to 15T tokens
saving = 2 * N_big - 2 * N_small           # inference FLOPs saved per token`,
      out: `                                                      FLOPs
  train 70B Chinchilla-optimal (1.4T tokens)       5.88e+23
  train 8B over-trained (15T tokens)                7.2e+23
  extra TRAINING cost of the big model            -1.32e+23

  inference FLOPs/token, 70B : 1.4e+11
  inference FLOPs/token,  8B : 1.6e+10
  saving per generated token : 1.24e+11

  break-even inference volume: 1.06e+12 tokens generated`,
      hl: [3, 4, 5, 11],
      caption: "Read line three: the extra cost of the big model is negative. The over-trained small model costs MORE to train." },

    { t: "callout", kind: "trap", title: "The \u201cwaste\u201d exceeds the cost of just training the bigger model",
      body: [
        { t: "p", text: "Training the 8B to 15T tokens is **7.2 \u00d7 10\u00b2\u00b3** FLOPs. Training a 70B Chinchilla-optimally is **5.88 \u00d7 10\u00b2\u00b3**. The over-trained small model is **1.22\u00d7 more expensive to train** than the large model it is meant to replace." },
        { t: "p", text: "That inverts the usual framing. \u201cYou knowingly waste some training FLOPs to get a smaller model\u201d suggests a modest premium. At 94\u00d7 Chinchilla the premium is larger than the entire training run you avoided, so this is not a small sacrifice for a large convenience \u2014 it is a bigger up-front bill in exchange for a cheaper per-token cost." },
        { t: "p", text: "Which means it only makes sense at volume, and the break-even is computable: **1.06 \u00d7 10\u00b9\u00b2 generated tokens**. Below that, you would have been better off training the 70B." }
      ] },

    { t: "callout", kind: "tradeoff", title: "And the break-even is wildly sensitive to traffic",
      body: [
        { t: "p", text: "A trillion generated tokens means very different things at different scales. At a billion tokens a day it is about **2.9 years**. At a trillion tokens a day \u2014 which large providers exceed \u2014 it is about **a day**." },
        { t: "p", text: "So this decision separates cleanly by who is making it. For a frontier lab serving enormous volume, over-training is obviously correct and the training premium is recovered almost immediately. For a team serving a few million tokens a day, it would never pay back \u2014 which is fine, because they are not training models anyway, they are choosing one." },
        { t: "p", text: "That is the useful transfer. When you pick an open model, you are inheriting someone else\u2019s resolution of this trade, and an aggressively over-trained small model is the right inheritance precisely because *they* paid the training premium and you only pay inference." }
      ] },

    { t: "callout", kind: "warn", title: "The whole argument rests on a quality claim I cannot verify here",
      body: [
        { t: "p", text: "Everything above assumes an over-trained 8B actually matches a Chinchilla-optimal 70B. That is a folk claim, it is probably generous to the 8B, and it is not arithmetic \u2014 so the break-even figure inherits its uncertainty entirely." },
        { t: "p", text: "What *is* arithmetic, and worth separating out: for a **fixed** model size, over-training adds training cost and changes nothing whatsoever about inference. Inference is 2N per token regardless of D." },
        { t: "p", text: "So the saving comes entirely from being able to choose a smaller N. There is no inference benefit to over-training per se \u2014 the benefit is the smaller model it supposedly enables, which means the argument depends completely on the claim it is usually used to justify." }
      ] },

    { t: "code", lang: "python", title: "g72.py \u00a7D \u2014 the same point, tabulated", code: `for mult in (1, 5, 20, 90):
    d = 20 * N_small * mult`,
      out: `  8B at   1x Chinchilla (   0.2T tokens): train 7.68e+21 FLOPs, inference 1.6e+10/token
  8B at   5x Chinchilla (   0.8T tokens): train 3.84e+22 FLOPs, inference 1.6e+10/token
  8B at  20x Chinchilla (   3.2T tokens): train 1.54e+23 FLOPs, inference 1.6e+10/token
  8B at  90x Chinchilla (  14.4T tokens): train 6.91e+23 FLOPs, inference 1.6e+10/token`,
      hl: [1, 4],
      caption: "The training column moves by 90\u00d7. The inference column does not move at all." },

    { t: "viz", title: "Training once against inference forever", caption: "Over-training an 8B to 94\u00d7 Chinchilla costs more than training a 70B optimally. It pays back only at volume.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Training and inference cost comparison">
  <text x="16" y="22" class="s-label">TRAINING FLOPs \u2014 ONE-OFF</text>
  <text x="16" y="52" class="s-sub">70B, Chinchilla</text>
  <rect x="150" y="40" width="392" height="20" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="552" y="55" class="s-mono" style="font-size:10px;fill:var(--accent)">5.88e23</text>

  <text x="16" y="84" class="s-sub">8B, 94\u00d7 over-trained</text>
  <rect x="150" y="72" width="480" height="20" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="640" y="87" class="s-mono" style="font-size:10px;fill:var(--crit)">7.2e23 \u2014 MORE</text>

  <line x1="16" y1="110" x2="744" y2="110" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="138" class="s-label">INFERENCE FLOPs PER TOKEN \u2014 PAID FOREVER</text>
  <text x="16" y="168" class="s-sub">70B</text>
  <rect x="150" y="156" width="480" height="20" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="640" y="171" class="s-mono" style="font-size:10px;fill:var(--crit)">1.4e11</text>

  <text x="16" y="200" class="s-sub">8B</text>
  <rect x="150" y="188" width="55" height="20" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="215" y="203" class="s-mono" style="font-size:10px;fill:var(--good)">1.6e10 \u2014 8.75\u00d7 cheaper</text>

  <line x1="16" y1="226" x2="744" y2="226" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="252" class="s-mono" style="fill:var(--warn)">break-even: 1.06e12 generated tokens</text>
  <text x="16" y="272" class="s-sub">\u2248 2.9 years at 1e9 tokens/day \u00b7 \u2248 1 day at 1e12 tokens/day</text>
  <text x="16" y="292" class="s-sub">and all of it assumes the over-trained 8B matches the 70B \u2014 a quality claim, not arithmetic</text>
</svg>` },

    { t: "h2", n: "04", id: "control", text: "What you actually control",
      sub: "Not the architecture" },

    { t: "p", text: "The reference\u2019s closing point on this stage is the one practitioners confirm most consistently: data mix and deduplication beat almost every architectural tweak. That is not a claim about transformers being perfect, it is a claim about where the remaining variance lives." },

    { t: "callout", kind: "insight", title: "And 6.8 measured the deduplication half of it",
      body: [
        { t: "p", text: "Not on pretraining, but the mechanism is the same one. Adding 20,000 unrelated chunks to a retrieval index changed nothing; adding near-duplicates of real content collapsed recall. Duplication concentrates probability mass on repeated text, which is exactly what you do not want in a pretraining corpus either." },
        { t: "p", text: "The pretraining version of this is memorisation: text appearing many times is learned as a string rather than generalised from, which wastes capacity and creates the verbatim-regurgitation behaviour that causes legal and privacy problems downstream." },
        { t: "p", text: "6.3\u2019s ladder transfers directly \u2014 normalise, then exact-hash, then near-duplicate detection by MinHash at corpus scale. That is precisely the pipeline large pretraining corpora run, for the same reasons and at a different order of magnitude." }
      ] },

    { t: "exercise", kind: "analysis", title: "Price a model choice with the scaling relations", difficulty: "core", minutes: 25,
      body: "For a model you are considering serving, compute the training FLOPs it represents, the inference FLOPs per generated token, and the break-even inference volume against one plausible alternative of a different size. Then state what your actual traffic implies about which is cheaper in total.",
      requirements: [
        "Use 6ND for training and 2N per token for inference",
        "State the token count the model was actually trained on, and its ratio to 20N",
        "Compute break-even generated-token volume against your alternative",
        "Convert that to a duration at your real traffic",
        "Say explicitly which parts of your answer are arithmetic and which are quality assumptions"
      ],
      hint: "Separate the two cleanly. The FLOPs are arithmetic and certain; the claim that two differently sized models are of equal quality is neither, and it drives the whole conclusion.",
      solution: { lang: "python", title: "the comparison", code: `def train_flops(N, D):      return 6 * N * D
def infer_flops(N):         return 2 * N          # per generated token

def breakeven(N_small, D_small, N_big, D_big=None):
    """Generated tokens at which the small model's extra training cost is repaid."""
    D_big = D_big if D_big is not None else 20 * N_big      # Chinchilla-optimal
    extra = train_flops(N_small, D_small) - train_flops(N_big, D_big)
    saving = infer_flops(N_big) - infer_flops(N_small)
    if extra <= 0:
        return 0.0                                         # cheaper to train too
    return extra / saving

N_s, D_s, N_b = 8e9, 15e12, 70e9
print("train  8B @15T : %.3g" % train_flops(N_s, D_s))
print("train 70B @1.4T: %.3g" % train_flops(N_b, 20 * N_b))
print("infer  8B/token: %.3g" % infer_flops(N_s))
print("infer 70B/token: %.3g" % infer_flops(N_b))
bt = breakeven(N_s, D_s, N_b)
print("break-even     : %.3g tokens" % bt)
for per_day in (1e6, 1e9, 1e12):
    print("  at %.0e tok/day: %.1f days" % (per_day, bt / per_day))`,
        out: `  train  8B @15T : 7.2e+23
  train 70B @1.4T: 5.88e+23
  infer  8B/token: 1.6e+10
  infer 70B/token: 1.4e+11
  break-even     : 1.06e+12 tokens
    at 1e+06 tok/day: 1064516.1 days
    at 1e+09 tok/day: 1064.5 days
    at 1e+12 tok/day: 1.1 days`,
        notes: [
          { t: "p", text: "**The break-even spans six orders of magnitude in time.** At a million tokens a day it is roughly three thousand years; at a trillion a day it is one day. So \u201cis over-training worth it\u201d has no answer independent of volume, and anyone who quotes a universal one is quoting their own traffic." },
          { t: "p", text: "**The sign of `extra` is the first thing to check.** Here it is positive \u2014 7.2e23 against 5.88e23 \u2014 meaning the over-trained small model costs *more* to train than the large one, which is the opposite of how the trade is usually described. If it came out negative the small model would win outright with no crossover to compute." },
          { t: "p", text: "**Inference is independent of D, and that is the crux.** Over-training does not make a model cheaper to run; it is supposed to make a *smaller* model good enough. The entire saving is attributable to the reduction in N, not to the extra tokens." },
          { t: "p", text: "**So label the quality assumption loudly.** That an 8B at 15T tokens matches a 70B at 1.4T is the load-bearing premise and it is not derivable from these relations. Everything downstream of it is as uncertain as it is." },
          { t: "p", text: "One approximation worth remembering: 6ND and 2N both ignore attention's quadratic term, so they drift at long context. For a 70B at short context they are good to a few percent, which is enough for a decision spanning orders of magnitude \u2014 but not enough to compare two models within 10% of each other." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Two relations: training is 6ND, inference is 2N per token. The first depends on how long you trained; the second does not. That asymmetry generates the entire over-training strategy and also bounds it \u2014 the saving comes from picking a smaller N, never from the extra tokens themselves." },
        { t: "p", text: "And hold the magnitude: over-training an 8B to 94\u00d7 Chinchilla costs more than training a 70B optimally, repaid only after about a trillion generated tokens. It is a volume bet, not a free lunch, and when you adopt an open model you are inheriting someone else\u2019s bet that already paid off." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat is Chinchilla and why do modern models ignore it?\u201d**" },
        { t: "p", text: "Chinchilla says that for a fixed training compute budget, you should train on about 20 tokens per parameter \u2014 with training FLOPs about 6ND. A 7B model compute-optimally trained is therefore 140 billion tokens and about 5.9 \u00d7 10\u00b2\u00b9 FLOPs." },
        { t: "p", text: "Modern models ignore it because it optimises training cost, and in production you serve the model billions of times, so inference dominates. Inference is roughly 2N FLOPs per generated token \u2014 it scales with model size and is completely independent of how long you trained. So you overspend on training to reach a given quality at a smaller N, and every request afterwards is cheaper." },
        { t: "p", text: "Where I would push beyond the standard answer is the magnitude, because \u201cwaste some training FLOPs\u201d undersells it. Llama-3 8B at 15 trillion tokens is 1,875 tokens per parameter \u2014 about 94\u00d7 Chinchilla \u2014 which is 7.2 \u00d7 10\u00b2\u00b3 training FLOPs. Training a 70B Chinchilla-optimally is 5.88 \u00d7 10\u00b2\u00b3. The over-trained 8B costs 1.22\u00d7 *more* to train than the 70B it is meant to replace." },
        { t: "p", text: "So it is a volume bet with a computable break-even: about 1.06 trillion generated tokens. At a billion tokens a day that is nearly three years; at a trillion a day it is a day. Which is why this is obviously right for a frontier lab and would never pay back for a small team." },
        { t: "p", text: "And I would flag the premise, because it is the weak link. All of that assumes an over-trained 8B genuinely matches a Chinchilla-optimal 70B, which is a quality claim rather than arithmetic and is probably generous. For a fixed model size, over-training adds training cost and changes nothing about inference \u2014 the entire saving comes from being able to choose a smaller model." }
      ] }
  ],

  takeaways: [
    "**Two relations carry every scaling question**: training FLOPs \u2248 6ND, and compute-optimal D \u2248 20N \u2014 about twenty tokens per parameter.",
    "**The reference's worked examples check out**: a 7B optimally trained is 140B tokens and 5.88 \u00d7 10\u00b2\u00b9 FLOPs; Llama-3 8B at 15T is 1,875 tokens/param and 93.8\u00d7 Chinchilla.",
    "**Inference is \u22482N FLOPs per generated token** \u2014 it scales with model size and is entirely independent of how many tokens the model was trained on.",
    "**That asymmetry is the whole over-training argument**: training is a one-off, inference is a tax paid for the life of the product.",
    "**The premium is larger than usually implied** \u2014 over-training an 8B to 15T tokens is 7.2 \u00d7 10\u00b2\u00b3 FLOPs against 5.88 \u00d7 10\u00b2\u00b3 for a Chinchilla-optimal 70B, so it costs 1.22\u00d7 *more* to train.",
    "**Break-even is about 1.06 \u00d7 10\u00b9\u00b2 generated tokens**, which is ~2.9 years at a billion tokens a day and ~1 day at a trillion.",
    "**So over-training is a volume bet**, obviously right for a frontier lab and never repaid for a small deployment \u2014 and the sign of the extra training cost is the first thing to check.",
    "**Over-training gives no inference benefit by itself.** Inference is 2N regardless of D; the saving comes entirely from being able to pick a smaller N.",
    "**Which makes the load-bearing premise a quality claim, not arithmetic** \u2014 that an over-trained 8B matches an optimal 70B is assumed, probably generously.",
    "**6ND and 2N ignore attention's quadratic term**, so they are good to a few percent at typical shapes and unsuitable for comparing models within 10% of each other.",
    "**What you control at this stage is data mix and deduplication**, and duplication causes memorisation \u2014 the same mechanism 6.8 measured collapsing retrieval recall."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Training an 8B model on 15T tokens costs 7.2 \u00d7 10\u00b2\u00b3 FLOPs, while training a 70B Chinchilla-optimally costs 5.88 \u00d7 10\u00b2\u00b3. What does this tell you about over-training?",
        options: [
          "The figures must be wrong, since a smaller model cannot cost more to train",
          "It is a volume bet rather than a saving \u2014 the training premium exceeds the cost of the larger model and is only repaid through inference, after about 1.06 \u00d7 10\u00b9\u00b2 generated tokens",
          "The 8B model will also be cheaper to train than the 70B once the data pipeline is amortised",
          "Over-training reduces inference cost per token, which is where the saving comes from"
        ],
        answer: 1,
        why: "Training FLOPs are 6ND, so 94\u00d7 the compute-optimal token count is 94\u00d7 the training cost, which here overtakes the larger model's entire training run. The payoff is purely in inference, at 2N per token, giving a computable break-even of about a trillion generated tokens \u2014 roughly 2.9 years at a billion tokens a day and a day at a trillion. Over-training itself does not change inference cost at all, since inference is independent of D." },

      { stem: "Why does over-training not reduce inference cost directly?",
        options: [
          "Because inference uses only the forward pass, which is unaffected by training length",
          "Because inference FLOPs are approximately 2N per generated token \u2014 a function of model size alone \u2014 so the saving comes entirely from being able to choose a smaller N",
          "Because KV caching eliminates the dependence on training data volume",
          "Because quantization at serving time overwrites any benefit from longer training"
        ],
        answer: 1,
        why: "Inference cost depends on N and not on D, so training a fixed-size model for longer adds training expense and changes serving cost by nothing. The strategy works only because longer training is supposed to let a smaller model reach a target quality, and the entire saving is attributable to that reduction in N. This is why the load-bearing premise \u2014 that an over-trained small model matches a larger optimally-trained one \u2014 is a quality claim rather than something the scaling relations establish." },

      { stem: "A team serving a few million tokens per day asks whether they should favour an aggressively over-trained model. What is the right framing?",
        options: [
          "No \u2014 the training premium would take millennia to repay at that volume",
          "Yes \u2014 they inherit someone else's already-repaid training bet and pay only inference, which is cheaper at the smaller N",
          "It makes no difference, since the models are of equal quality by assumption",
          "They should train their own model at the Chinchilla-optimal ratio instead"
        ],
        answer: 1,
        why: "The break-even calculation applies to whoever pays for training. A team choosing an existing open model pays no training cost at all, so they simply benefit from the smaller N's cheaper inference \u2014 the lab that over-trained it absorbed the premium. The break-even figure of roughly a trillion tokens is the right lens for the trainer and the wrong lens for the adopter, which is the useful distinction here." },

      { stem: "What is the main limitation of using 6ND and 2N for a model comparison?",
        options: [
          "They apply only to decoder-only architectures",
          "They ignore attention's quadratic term, embeddings and normalisation, so they are accurate to a few percent at typical shapes and unsuitable for separating models within about 10% of each other",
          "They assume a single training epoch and break down if data is repeated",
          "They measure throughput rather than compute, so they cannot be converted to cost"
        ],
        answer: 1,
        why: "Both are rules of thumb that drop terms which matter more at long context, where attention's quadratic cost grows. That precision is ample for decisions spanning orders of magnitude \u2014 such as a break-even that moves between one day and three thousand years depending on traffic \u2014 and inadequate for a close comparison. Repeated data is handled correctly, incidentally: D counts tokens processed, so a second epoch over the same text counts twice." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Scaling questions, which all reduce to two relations",
    questions: [
      { level: "core",
        q: "How many tokens should you train a 13B model on, and what does that cost?",
        strong: "A strong answer computes it and then questions whether compute-optimal is the goal.",
        answer: [
          { t: "p", text: "Compute-optimally, about 20 tokens per parameter, so 260 billion tokens. Training FLOPs are about 6ND, which is 6 \u00d7 1.3 \u00d7 10\u00b9\u2070 \u00d7 2.6 \u00d7 10\u00b9\u00b9, roughly 2 \u00d7 10\u00b2\u00b2." },
          { t: "p", text: "But I would question the premise, because compute-optimal optimises training cost and almost nobody\u2019s objective is that. If the model is going to be served, inference is about 2N per generated token and you pay it forever, so the right move is usually to over-train well past 20 tokens per parameter in order to hit a quality target at a smaller size." },
          { t: "p", text: "Llama-3 8B is the reference point: 15 trillion tokens, 1,875 per parameter, about 94\u00d7 Chinchilla. Worth knowing the magnitude because it is bigger than people expect \u2014 that works out to 7.2 \u00d7 10\u00b2\u00b3 training FLOPs, which is more than training a 70B Chinchilla-optimally at 5.88 \u00d7 10\u00b2\u00b3." },
          { t: "p", text: "So if someone asks for the compute-optimal number I would give it, then say what I would actually do and why, with the break-even: roughly a trillion generated tokens before the premium is recovered." }
        ] },

      { level: "advanced",
        q: "Someone proposes over-training your model 10\u00d7 past Chinchilla to reduce serving costs. How do you evaluate it?",
        strong: "A strong answer separates the arithmetic from the quality assumption.",
        answer: [
          { t: "p", text: "First I would check what it is actually claiming, because over-training a fixed-size model does nothing for serving cost. Inference is 2N per token regardless of D, so 10\u00d7 the tokens at the same N is 10\u00d7 the training bill and identical serving cost." },
          { t: "p", text: "The proposal only makes sense if it is really \u201cover-train a *smaller* model to reach the quality we need\u201d. Then there is a genuine trade and it is computable: the extra training cost divided by the per-token inference saving gives a break-even in generated tokens." },
          { t: "p", text: "For the canonical case \u2014 an 8B over-trained to 15T against a 70B at 1.4T \u2014 that break-even is about 1.06 trillion generated tokens. At a billion a day it is nearly three years; at a trillion a day it is a day. So I would want our actual projected volume before agreeing, and I would check the sign first, because here the small model is the more expensive one to train." },
          { t: "p", text: "And I would be explicit that the premise is the weak part. That the smaller over-trained model matches the larger one is a quality claim, not arithmetic, and the entire case collapses if it needs a 13B rather than an 8B. I would want that validated on our own evaluations before committing the training budget." }
        ] },

      { level: "core",
        q: "What has the biggest effect on pretraining quality?",
        strong: "A strong answer names data, not architecture.",
        answer: [
          { t: "p", text: "Data mix and deduplication, by a wide margin over architectural tweaks. That is not a claim that transformers are optimal \u2014 it is a claim about where the remaining variance is, and it has been consistent across labs." },
          { t: "p", text: "Deduplication matters for a specific reason: duplicated text concentrates probability mass on exact strings, so the model memorises rather than generalises. That wastes capacity and produces verbatim regurgitation, which becomes a privacy and licensing problem at serving time rather than a quality one." },
          { t: "p", text: "The pipeline is the same ladder I would use for a retrieval corpus, at a different scale \u2014 normalise, exact-hash, then near-duplicate detection with MinHash and LSH because pairwise comparison is quadratic. I measured the retrieval version of this: unrelated volume changed recall by nothing while near-duplicates collapsed it, which is the same mechanism." },
          { t: "p", text: "The mix question is harder and more judgement-driven \u2014 how much code, how much maths, how much multilingual text, how to weight high-quality curated sources against scraped bulk. That is where labs differ most and publish least." }
        ] }
    ]
  }
});
