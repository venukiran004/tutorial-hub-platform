EC.receiveLesson({
  id: "4.3",

  lede: "LoRA\u2019s idea is one sentence: freeze `W`, and learn the change to it as the product of two thin matrices `B\u00b7A`. It is commonly stated it cleanly \u2014 *\u201ctheir product is the change you wanted\u201d* \u2014 and that sentence is doing more work than it looks. I took the weight update from 4.1\u2019s real fine-tune and decomposed it: reproducing **90% of it needs rank 103** of a possible 768, and a rank-8 adapter captures only **45.2%**. So `B\u00b7A` is not the change you wanted; it is a sizeable fraction of it. The measurement that rescues the idea is the comparison with noise \u2014 a random matrix of the same size captures **2.5%** at rank 8, so the real update is **18\u00d7 more concentrated** than chance, and that concentration is what LoRA is exploiting.",

  objectives: [
    "State the low-rank decomposition and count the parameters it replaces",
    "Measure the rank of a real weight update rather than assuming it is small",
    "Compare an update's spectrum against a random matrix to see what is actually special",
    "Explain why a rank-8 adapter works despite discarding most of the update's energy",
    "Say what LoRA cannot damage, and why that matters after 4.1"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", id: "idea", text: "The one idea",
      sub: "Store the two factors instead of the product" },

    { t: "p", text: "A full fine-tune computes a new weight matrix `W = W\u2080 + \u0394W`, where `\u0394W` has exactly the same shape as `W\u2080`. For GPT-2\u2019s attention projection that is 768\u00d72304, or 1.77 million numbers \u2014 per layer, per matrix. Storing and training all of them is what makes full fine-tuning expensive, and 4.1 measured what else it costs: a quarter of the model\u2019s general perplexity." },

    { t: "p", text: "LoRA\u2019s move is to never form `\u0394W` at all. Freeze `W\u2080`, and represent the update as the product of a tall thin matrix and a short wide one:" },

    { t: "math", tex: "W = W_0 + \\Delta W \\approx W_0 + BA, \\qquad B \\in \\mathbb{R}^{d_{\\text{out}} \\times r},\\; A \\in \\mathbb{R}^{r \\times d_{\\text{in}}}" },

    { t: "p", text: "Train only `A` and `B`. The product `BA` has the full shape of `\u0394W` but is constrained to rank `r`, and the number of trainable parameters falls from `d_out \u00d7 d_in` to `r \u00d7 (d_out + d_in)`." },

    { t: "code", lang: "python", title: "g43.py \u2014 the parameter trade, on a real GPT-2 matrix", code: `d_out, d_in = 768, 2304                 # attn.c_attn
full_p = d_out * d_in                   # what a full fine-tune trains

for r in (1, 2, 4, 8, 16, 32, 64):
    lora_p = r * (d_out + d_in)         # what LoRA trains
    print(r, full_p, lora_p, 100 * lora_p / full_p)`,
      out: `  rank            full params      LoRA params   as % of full    energy kept
  1                   1769472             3072          0.17%          12.8%
  2                   1769472             6144          0.35%          22.8%
  4                   1769472            12288          0.69%          32.3%
  8                   1769472            24576          1.39%          45.2%
  16                  1769472            49152          2.78%          57.9%
  32                  1769472            98304          5.56%          71.9%
  64                  1769472           196608         11.11%          84.0%`,
      hl: [4],
      caption: "At rank 8 you train 1.39% of the parameters. The last column is the part this is rarely mentioned, and it is the subject of this lesson." },

    { t: "viz", title: "What is stored instead", caption: "The product has the full shape; only the two factors exist in memory and only they receive gradients.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Low-rank decomposition of a weight update">
  <text x="16" y="22" class="s-label" style="fill:var(--crit)">FULL FINE-TUNE \u2014 train every entry of \u0394W</text>
  <rect x="16" y="32" width="210" height="62" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="121" y="58" text-anchor="middle" class="s-sub">\u0394W \u2014 768 \u00d7 2304</text>
  <text x="121" y="78" text-anchor="middle" class="s-mono" style="fill:var(--crit)">1,769,472 trained</text>

  <text x="250" y="22" class="s-label" style="fill:var(--good)">LoRA \u2014 train B and A, never form \u0394W</text>
  <rect x="250" y="32" width="26" height="62" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="263" y="110" text-anchor="middle" class="s-sub">B</text>
  <text x="263" y="124" text-anchor="middle" class="s-sub">768\u00d78</text>
  <text x="286" y="68" class="s-mono">\u00d7</text>
  <rect x="300" y="52" width="210" height="22" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="405" y="110" text-anchor="middle" class="s-sub">A</text>
  <text x="405" y="124" text-anchor="middle" class="s-sub">8\u00d72304</text>
  <text x="522" y="68" class="s-mono">=</text>
  <rect x="544" y="32" width="200" height="62" rx="4" class="s-fill" style="stroke:var(--line)" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="644" y="58" text-anchor="middle" class="s-sub">the same 768 \u00d7 2304</text>
  <text x="644" y="78" text-anchor="middle" class="s-mono" style="fill:var(--good)">24,576 trained \u2014 1.39%</text>

  <line x1="16" y1="150" x2="744" y2="150" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="176" class="s-label" style="fill:var(--warn)">BUT: how much of the real \u0394W can a rank-8 product actually represent?</text>
  <rect x="16" y="188" width="330" height="22" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <rect x="346" y="188" width="398" height="22" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="181" y="204" text-anchor="middle" class="s-mono">45.2% captured</text>
  <text x="545" y="204" text-anchor="middle" class="s-sub">54.8% discarded</text>
  <text x="16" y="236" class="s-mono" style="fill:var(--accent)">a random matrix of the same size would capture 2.5% \u2014 that gap is the whole method</text>
</svg>` },

    { t: "h2", n: "02", id: "measured", text: "Is the update actually low-rank?",
      sub: "The premise, tested on the update from 4.1" },

    { t: "p", text: "The low-rank story is an empirical claim about what fine-tuning does, so it can be checked. In 4.1 I fine-tuned every parameter of GPT-2 and saved the difference between the trained and original weights for 36 matrices. The singular values of those differences say how much of each update lives in how few directions." },

    { t: "code", lang: "python", title: "g43.py \u2014 the spectrum of a real \u0394W", code: `deltas = torch.load("g43_deltas.pt")          # W_after - W_before, from 4.1

for n in names:
    d = deltas[n].float()
    s = torch.linalg.svdvals(d)
    tot = float((s ** 2).sum())
    # share of the squared Frobenius norm held by the top r directions
    print(n, [100 * float((s[:r] ** 2).sum()) / tot for r in (1, 2, 4, 8, 16, 32, 64)])`,
      out: `  layer                           shape  r=1      r=2      r=4      r=8      r=16     r=32     r=64
  L0.attn.c_attn.weight        768x2304   12.8%    22.8%    32.3%    45.2%    57.9%    71.9%    84.0%
  L0.attn.c_proj.weight         768x768   24.4%    37.7%    46.8%    56.7%    67.7%    78.7%    88.0%
  L0.mlp.c_fc.weight           768x3072   17.6%    24.2%    33.2%    43.8%    56.6%    70.0%    82.6%
  L1.attn.c_attn.weight        768x2304   14.1%    25.7%    37.8%    48.9%    61.3%    73.7%    84.1%
  L1.attn.c_proj.weight         768x768   40.1%    54.1%    61.7%    68.7%    75.8%    83.3%    90.0%
  L1.mlp.c_fc.weight           768x3072   16.3%    23.0%    28.9%    38.5%    51.7%    66.7%    80.3%
  L10.attn.c_attn.weight       768x2304   25.5%    32.4%    43.3%    55.3%    67.7%    79.5%    88.6%
  L10.attn.c_proj.weight        768x768   39.7%    48.5%    56.4%    66.6%    77.2%    86.7%    93.1%
  L10.mlp.c_fc.weight          768x3072   19.8%    26.3%    33.3%    43.7%    56.9%    71.5%    84.7%
  L11.attn.c_attn.weight       768x2304   25.0%    32.6%    42.4%    55.2%    68.2%    79.9%    88.6%`,
      hl: [4],
      caption: "Rank 8 captures between 38.5% and 68.7% of the update depending on the layer. Not nothing, and not \u201cthe change you wanted\u201d." },

    { t: "code", lang: "python", title: "g43.py \u2014 how much rank 90% of the update needs", code: `cum = torch.cumsum(s ** 2, 0) / tot
r90 = int((cum < 0.90).sum()) + 1
r99 = int((cum < 0.99).sum()) + 1`,
      out: `  layer                         full rank rank for 90%   rank for 99% as % of full
  L0.attn.c_attn.weight               768          103            509        13.4%
  L0.attn.c_proj.weight               768           78            346        10.2%
  L0.mlp.c_fc.weight                  768          122            551        15.9%
  L1.attn.c_proj.weight               768           65            315         8.5%
  L10.attn.c_proj.weight              768           44            277         5.7%
  L11.attn.c_attn.weight              768           75            428         9.8%

  median rank needed for 90% of the update: 94 of 768`,
      hl: [7],
      caption: "The update is genuinely concentrated \u2014 94 of 768 directions \u2014 and that is still more than ten times the rank anyone uses." },

    { t: "callout", kind: "trap", title: "A rank-8 adapter discards more than half the update",
      body: [
        { t: "p", text: "It is commonly said *\u201ctheir product `B\u00b7A` is the \u2018change\u2019 you wanted\u201d*, and at the ranks it recommends \u2014 8 for simple tasks, 16 for instructions \u2014 that product can represent **45.2% and 57.9%** of the change the full fine-tune actually made. The median layer needs rank 94 for 90%." },
        { t: "p", text: "So the decomposition is an *approximation*, not a factorisation, and the gap is large. A reader who takes the sentence literally will be surprised the first time a rank-8 adapter underperforms a full fine-tune on a hard task \u2014 and will reach for a learning-rate change rather than for more rank." },
        { t: "p", text: "The honest form of the claim: **the update is low-rank enough to be worth approximating, and the approximation is lossy in a way the rank controls.** That is also why `r` is the first hyperparameter to raise when a LoRA run plateaus above the loss a full fine-tune reaches." }
      ] },

    { t: "h2", n: "03", id: "noise", text: "What makes it work anyway",
      sub: "The comparison that rescues the idea" },

    { t: "p", text: "If capturing 45% of an update were enough on its own, you could approximate anything. The question is whether `\u0394W` is special, so I ran the same decomposition on a random matrix of identical shape and standard deviation." },

    { t: "code", lang: "python", title: "g43.py \u2014 real update against random noise", code: `rnd = torch.randn(shape) * float(deltas[n0].std())    # same shape, same spread
sr = torch.linalg.svdvals(rnd)`,
      out: `  matrix                            r=1        r=8       r=16 rank for 90%
  real delta-W                    12.8%      45.2%      57.9%        103
  random, same std                 0.3%       2.5%       4.9%        559`,
      hl: [2],
      caption: "At rank 8 the real update holds 18\u00d7 more of its energy than noise does. Noise needs 559 directions for 90%; the update needs 103." },

    { t: "callout", kind: "insight", title: "The update is 18\u00d7 more concentrated than chance \u2014 that gap is the method",
      body: [
        { t: "p", text: "A random 768\u00d72304 matrix spreads its energy evenly: 2.5% in the top eight directions, 559 directions needed for 90%. The real update puts **45.2% in its top eight** and needs 103. Fine-tuning is not moving the weights in an arbitrary direction; it is moving them along a small number of directions that matter for the task." },
        { t: "p", text: "That is the empirical content behind the \u201cintrinsic dimension\u201d argument in the LoRA paper, and it is what justifies the method even though the approximation is lossy. The part you keep is not a random 45% \u2014 it is the 45% with the largest singular values, which is the part doing the most work." },
        { t: "p", text: "The interpretation I would offer, clearly labelled as interpretation rather than measurement: the directions LoRA drops are plausibly a mixture of task-relevant fine detail and optimiser noise, and the fact that rank-8 adapters work well suggests a good deal of the discarded 55% is the latter. I have not separated those two, and doing so properly would require comparing downstream task quality rather than Frobenius norms." }
      ] },

    { t: "callout", kind: "note", title: "What this \u0394W is, and is not",
      body: [
        { t: "p", text: "This update comes from 4.1\u2019s run: twelve examples, eight epochs, a style task on a 124M model. That is a small adaptation, and small adaptations are plausibly more concentrated than large ones. A multi-thousand-example instruction tune may well need more rank, which is consistent with the reference putting complex tasks at r = 32\u201364." },
        { t: "p", text: "The measurement also includes whatever that run\u2019s overfitting contributed \u2014 4.1 showed it memorising training replies, and memorisation is itself a direction in weight space. So I would treat the 103 as an order of magnitude rather than a constant, and the real transferable result as the contrast with the random baseline, which does not depend on the task size." }
      ] },

    { t: "h2", n: "04", id: "practical", text: "What LoRA gives you besides cheap training",
      sub: "Three properties that follow from freezing the base" },

    { t: "dl", items: [
      { k: "The base cannot be damaged", v: "4.1 measured a full fine-tune taking general perplexity from 5.386 to 6.748 \u2014 catastrophic forgetting, in the weights, permanent. A LoRA run cannot do that, because `W\u2080` is never written to. Remove the adapter and you have the original model back, byte for byte." },
      { k: "Adapters are small and swappable", v: "A rank-8 adapter on one matrix is 24,576 numbers against 1.77 million. For a whole model that is tens of megabytes rather than tens of gigabytes \u2014 so you can keep dozens, ship them independently, and serve several from one base (which 3.7's frameworks support directly)." },
      { k: "They can be merged away", v: "`W\u2080 + BA` is just a matrix, so once you are happy you can fold the adapter into the base and ship a normal model with no inference overhead at all. 4.7 does this. The merge is irreversible in the sense that the clean base must be kept separately." }
    ] },

    { t: "callout", kind: "insight", title: "The forgetting result from 4.1 is the strongest argument for LoRA",
      body: [
        { t: "p", text: "Cheap training is the headline, and it is not the most valuable property. 4.1 measured twelve examples and eight epochs costing 25% of GPT-2\u2019s general perplexity, with the training loss improving throughout \u2014 damage that was invisible to the only metric on screen." },
        { t: "p", text: "A frozen base makes that damage **reversible**. The adapter can be bad \u2014 4.8 measures a LoRA run taking generic perplexity from 5.282 to 10.777 at its best-validation epoch, so an adapter is quite capable of degrading the deployed model. What it cannot do is make the degradation permanent: detach the adapter and the original model is back exactly, bit for bit. A bad adapter is a file you delete rather than a model you rebuild." },
        { t: "p", text: "This is also why LoRA is the right default even when you *can* afford full fine-tuning. The cost argument has a threshold; the safety argument does not." }
      ] },

    { t: "exercise", kind: "analysis", title: "Measure the rank of a real weight update", difficulty: "advanced", minutes: 30,
      body: "Take the weight differences saved from a full fine-tune, decompose each with an SVD, and report how much of the update's energy the top r singular directions hold for r = 1 to 64. Then find the rank needed for 90% and 99%. Compare against a random matrix of the same shape and standard deviation, and tabulate the parameter count a rank-r adapter would train against the fraction of the update it could represent.",
      requirements: [
        "Use the squared singular values, since they sum to the squared Frobenius norm \u2014 energy, not magnitude",
        "Report several layers, including early and late blocks and both attention and MLP matrices",
        "Compute the rank at which the cumulative energy first exceeds 90% and 99%",
        "Generate a random baseline matched on shape and standard deviation, not just shape",
        "Put the parameter saving and the energy kept in the same table, so the trade is visible"
      ],
      hint: "If your random baseline looks similar to the real update, check that you matched the standard deviation \u2014 an unscaled randn will have a wildly different norm and the comparison will be meaningless.",
      solution: { lang: "python", title: "g43.py \u2014 the spectrum, the baseline and the trade", code: `deltas = torch.load("g43_deltas.pt")

rows = []
for n in sorted(deltas)[:10]:
    d = deltas[n].float()
    s = torch.linalg.svdvals(d)
    tot = float((s ** 2).sum())
    rows.append((n, tuple(d.shape), s))
    print(n, [100 * float((s[:r] ** 2).sum()) / tot for r in (1, 2, 4, 8, 16, 32, 64)])

# rank needed for a given share of the energy
for n, shape, s in rows:
    cum = torch.cumsum(s ** 2, 0) / float((s ** 2).sum())
    print(n, int((cum < 0.90).sum()) + 1, int((cum < 0.99).sum()) + 1, min(shape))

# the baseline that makes the result mean something
n0, shape0, s0 = rows[0]
rnd = torch.randn(shape0) * float(deltas[n0].std())
sr = torch.linalg.svdvals(rnd)

# the trade LoRA is making
d_out, d_in = shape0
for r in (1, 2, 4, 8, 16, 32, 64):
    print(r, d_out * d_in, r * (d_out + d_in),
          100 * float((s0[:r] ** 2).sum()) / float((s0 ** 2).sum()))`,
        out: `  layer                           shape  r=1      r=8      r=16     r=32     r=64
  L0.attn.c_attn.weight        768x2304   12.8%    45.2%    57.9%    71.9%    84.0%
  L1.attn.c_proj.weight         768x768   40.1%    68.7%    75.8%    83.3%    90.0%
  L10.attn.c_proj.weight        768x768   39.7%    66.6%    77.2%    86.7%    93.1%
  L11.attn.c_attn.weight       768x2304   25.0%    55.2%    68.2%    79.9%    88.6%

  layer                         full rank rank for 90%   rank for 99%
  L0.attn.c_attn.weight               768          103            509
  L0.attn.c_proj.weight               768           78            346
  L1.attn.c_proj.weight               768           65            315
  L10.attn.c_proj.weight              768           44            277
  median rank needed for 90% of the update: 94 of 768

  matrix                            r=1        r=8       r=16 rank for 90%
  real delta-W                    12.8%      45.2%      57.9%        103
  random, same std                 0.3%       2.5%       4.9%        559

  rank            full params      LoRA params   as % of full    energy kept
  8                   1769472            24576          1.39%          45.2%
  16                  1769472            49152          2.78%          57.9%
  32                  1769472            98304          5.56%          71.9%
  64                  1769472           196608         11.11%          84.0%`,
        notes: [
          { t: "p", text: "**The update is not rank-8 \u2014 the median layer needs rank 94 for 90% of its energy.** At the rank the usual advice is for simple tasks, a LoRA adapter can represent 45.2% of what the full fine-tune did. \u201cTheir product is the change you wanted\u201d is a useful simplification and a lossy one, and the loss is controlled by `r`." },
          { t: "p", text: "**The random baseline is what makes the result meaningful.** Noise of the same shape and spread holds 2.5% in its top eight directions and needs 559 for 90%. The real update is 18\u00d7 more concentrated at rank 8 and needs a fifth as many directions \u2014 fine-tuning moves weights along a few directions that matter, which is precisely the property LoRA exploits." },
          { t: "p", text: "**Attention output projections are the most concentrated** \u2014 `attn.c_proj` needs 44\u201378 directions for 90% while `mlp.c_fc` needs 122\u2013131. If you are choosing where to spend rank, that ordering is a hint, and it is consistent with adapters on attention projections being the common default." },
          { t: "p", text: "**The parameter table is the trade stated plainly.** Rank 8 trains 1.39% of the parameters for 45.2% of the update; rank 64 trains 11.11% for 84.0%. Energy is not linear in parameters \u2014 the first few directions are worth far more than the last few \u2014 which is why small ranks work at all and why doubling `r` has diminishing returns." },
          { t: "p", text: "Two limits. This \u0394W comes from twelve examples over eight epochs on a 124M model, and a larger adaptation may be less concentrated \u2014 consistent with the reference suggesting r = 32\u201364 for complex tasks. And Frobenius energy is not task quality: a rank that discards 55% of the norm may lose much less than 55% of the behaviour, which is the empirical reason LoRA works and is not something this measurement can show." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A full fine-tune writes a correction over every pixel of the model. LoRA writes the correction as a low-resolution overlay \u2014 same canvas size, far fewer brush strokes. The measurement says the overlay at eight strokes reproduces about 45% of the correction, and that a random 8-stroke overlay would reproduce 2.5%." },
        { t: "p", text: "The overlay is a separate file. That is the part that matters most: you can throw it away, swap it, send it to someone, or paint it in permanently \u2014 and the canvas underneath is untouched either way." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur LoRA fine-tune plateaus at a noticeably worse loss than a full fine-tune on the same data. The learning rate sweep did not help. What now?\u201d**" },
        { t: "p", text: "That symptom points at rank before anything else. A LoRA adapter is constrained to represent the update as a rank-`r` matrix, and on real updates I measured rank 8 capturing 45.2% of the full fine-tune\u2019s change and rank 16 capturing 57.9%, with the median layer needing 94 directions for 90%. If the task genuinely needs more directions than `r` provides, no learning rate recovers them \u2014 the capacity is not there." },
        { t: "p", text: "So I would sweep `r` upward \u2014 8, 16, 32, 64 \u2014 and watch whether the plateau moves. A plateau that drops with rank is a capacity ceiling and the fix is more rank; a plateau that does not move is something else, most likely the data or the target modules." },
        { t: "p", text: "Target modules is the second thing I would check, and it is cheaper than raising rank everywhere. In my decomposition the attention output projections were the most concentrated \u2014 44 to 78 directions for 90% \u2014 while the MLP input projections needed 122 to 131. If adapters are only on the attention matrices, the MLP update is simply absent, and adding those is often worth more than doubling `r` on the ones you have." },
        { t: "p", text: "The thing I would resist is concluding that LoRA cannot match full fine-tuning here. It usually can, at a rank high enough; the published results showing parity are at ranks chosen for the task, not at a default of 8. And the comparison should be fair in cost terms \u2014 if r=64 closes the gap, that is 11% of the parameters, still a small fraction." },
        { t: "p", text: "I would also ask what the full fine-tune cost in capability outside the task, because that is the comparison people forget. 4.1 measured a full fine-tune taking general perplexity 25% worse while its training loss improved. A LoRA run that reaches a slightly higher task loss and leaves the base model intact may simply be the better artefact." }
      ] }
  ],

  takeaways: [
    "**LoRA freezes `W\u2080` and represents the update as `BA`**, so trainable parameters fall from `d_out \u00d7 d_in` to `r \u00d7 (d_out + d_in)` \u2014 1.39% of the matrix at rank 8.",
    "**The update really is concentrated**: the median layer holds 90% of its energy in 94 of 768 directions.",
    "**But it is not rank 8.** A rank-8 adapter can represent 45.2% of the real update and rank 16 can represent 57.9%, so \u201c`B\u00b7A` is the change you wanted\u201d is a lossy approximation with `r` as the dial.",
    "**The random baseline is what makes the result meaningful**: noise of the same shape and spread holds 2.5% in its top eight directions and needs 559 for 90%, against the update's 103.",
    "**So the update is 18\u00d7 more concentrated than chance at rank 8**, and that concentration \u2014 not literal low rank \u2014 is what the method exploits.",
    "**Energy is not linear in parameters.** Rank 8 buys 45.2% for 1.39% of the parameters; rank 64 buys 84.0% for 11.11%. The first directions are worth far more than the last.",
    "**Attention output projections are the most concentrated** (44\u201378 directions for 90%) and MLP input projections the least (122\u2013131), which is a hint about where to spend rank.",
    "**A frozen base makes damage reversible, not impossible.** The adapter applies on every forward pass and can degrade the model \u2014 4.8 measures 5.282 \u2192 10.777 generic perplexity \u2014 but detaching it restores the base exactly.",
    "**Adapters are small, swappable and mergeable** \u2014 tens of megabytes, several servable from one base, and foldable into `W\u2080` for zero inference overhead.",
    "**The safety argument has no threshold**, unlike the cost argument, which is why LoRA is the right default even when full fine-tuning is affordable."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "An SVD of a real weight update shows rank 8 capturing 45.2% of its energy and the median layer needing rank 94 for 90%. What does this say about LoRA?",
        options: [
          "The method is unsound, since most of the update is discarded",
          "The decomposition is a lossy approximation whose fidelity `r` controls, not an exact factorisation",
          "Rank must be set to at least 94 for the adapter to train at all",
          "The fine-tune that produced this update was badly configured"
        ],
        answer: 1,
        why: "`BA` is constrained to rank `r`, so it can only ever represent the top `r` directions of the true update \u2014 at the recommended defaults that is roughly half. The method works regardless, because the kept directions are the largest ones and because Frobenius energy is not the same as task quality. The practical consequence is that `r` is the first thing to raise when a LoRA run plateaus above a full fine-tune's loss. Nothing prevents training at low rank; it simply has less capacity." },

      { stem: "Why is comparing \u0394W's spectrum against a random matrix the measurement that matters?",
        options: [
          "Because it verifies the SVD implementation is correct",
          "Because without a baseline, \u201c45% in eight directions\u201d could be a property of any matrix rather than something fine-tuning produces",
          "Because random matrices are what the adapter is initialised from",
          "Because it estimates the noise floor of the training run"
        ],
        answer: 1,
        why: "A number with no baseline is uninterpretable. Matched on shape and standard deviation, noise holds 2.5% in its top eight directions and needs 559 for 90%, against the real update's 45.2% and 103 \u2014 so fine-tuning concentrates its change about eighteen-fold relative to chance at that rank. That concentration is the empirical claim LoRA rests on. LoRA initialises `A` randomly and `B` at zero, which is a separate matter." },

      { stem: "A LoRA run plateaus at a worse loss than a full fine-tune and a learning-rate sweep does not help. What is the most likely cause?",
        options: [
          "The base model was quantized, limiting achievable precision",
          "The rank is too low to represent the directions the task needs, which no learning rate can recover",
          "The adapter was initialised incorrectly, with B random instead of zero",
          "The dataset is too small for the number of trainable parameters"
        ],
        answer: 1,
        why: "Rank is a capacity constraint: `BA` cannot express more than `r` directions regardless of how it is optimised, and measured spectra show rank 8 holding 45.2% of a real update against a median of 94 directions for 90%. Sweeping `r` is the diagnostic \u2014 a plateau that falls with rank confirms the ceiling. Extending the adapter to more target modules is the other cheap fix, since an unadapted matrix contributes nothing at all. A bad initialisation would show up as instability early, not as a clean plateau." },

      { stem: "Beyond cheaper training, what is the strongest argument for LoRA over full fine-tuning?",
        options: [
          "It reaches a lower loss on the training data",
          "The base weights are never written to, so any degradation is reversible \u2014 a bad run is a file you delete rather than a model you rebuild",
          "It converges in fewer epochs",
          "It removes the need for a held-out evaluation set"
        ],
        answer: 1,
        why: "4.1 measured a full fine-tune costing 25% of general perplexity while the training loss improved throughout \u2014 permanent damage, invisible to the metric on screen. A frozen base does not prevent degradation, which 4.8 measures reaching 2.04\u00d7 baseline perplexity under LoRA, but it does make it reversible: remove the adapter and the original model is back exactly. Unlike the cost argument, which has a volume threshold, this one holds at any scale, which is why LoRA is a sensible default even when full fine-tuning is affordable. It typically reaches a slightly higher training loss, not lower, and a held-out set is just as necessary." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "LoRA is the question where the one-sentence answer is correct and incomplete",
    questions: [
      { level: "core",
        q: "Explain LoRA.",
        strong: "A strong answer gives the decomposition, the parameter count, and is precise that it is an approximation.",
        answer: [
          { t: "p", text: "Freeze the pretrained weight matrix and represent the fine-tuning update as the product of two thin matrices \u2014 `W\u2080 + BA`, with `B` being `d_out \u00d7 r` and `A` being `r \u00d7 d_in`. Only `A` and `B` get gradients, so the trainable count drops from `d_out \u00d7 d_in` to `r \u00d7 (d_out + d_in)`: on GPT-2's attention projection that is 1.39% of the matrix at rank 8." },
          { t: "p", text: "The part I would be careful about is that `BA` approximates the update rather than reproducing it. I decomposed a real full fine-tune's \u0394W and rank 8 held 45.2% of its energy, with the median layer needing 94 of 768 directions for 90%. So the rank is a fidelity dial, which is why `r` is the first thing to raise when a LoRA run plateaus above a full fine-tune." },
          { t: "p", text: "What makes it work despite that is how concentrated real updates are. A random matrix of the same shape and spread holds 2.5% in its top eight directions and needs 559 for 90% \u2014 the real update is about eighteen times more concentrated at rank 8. Fine-tuning moves weights along a few directions that matter, and LoRA spends its parameters on exactly those." },
          { t: "p", text: "And the property I would mention even if not asked: the base is never written to. A full fine-tune I ran cost 25% of the model's general perplexity permanently; a LoRA run cannot do that, and a bad adapter is a file you delete." }
        ] },

      { level: "advanced",
        q: "Is the claim that weight updates are low-rank actually true?",
        strong: "A strong answer treats it as an empirical claim and reports what measuring it shows.",
        answer: [
          { t: "p", text: "It is true in a weaker and more useful form than it is usually stated. I took \u0394W from a real full fine-tune and the median layer needed rank 94 of 768 for 90% of its energy. That is genuinely concentrated, and it is more than ten times the rank anybody actually uses." },
          { t: "p", text: "So \u201cthe update is low-rank\u201d is not literally why rank-8 adapters work. What the measurement supports is \u201cthe update is far more concentrated than noise\u201d: matched random matrices hold 2.5% in their top eight directions against the real update's 45.2%, and need 559 directions for 90% against 103." },
          { t: "p", text: "My reading \u2014 and I would flag it as interpretation rather than measurement \u2014 is that the discarded directions are a mix of fine task detail and optimiser noise, and the success of small ranks suggests a lot of it is the latter. Separating those would need downstream task quality rather than Frobenius norms, which is the honest limit of what an SVD can tell you." },
          { t: "p", text: "There is also useful structure in which matrices are most concentrated. Attention output projections needed 44 to 78 directions for 90%; MLP input projections needed 122 to 131. That is an argument for where to spend rank, and it is consistent with attention projections being the usual default target." }
        ] },

      { level: "core",
        q: "When would you use full fine-tuning instead of LoRA?",
        strong: "A strong answer makes the case narrow and names what full fine-tuning risks.",
        answer: [
          { t: "p", text: "Rarely, and the bar should be high. The case is a large adaptation that genuinely needs more capacity than a practical rank provides \u2014 a domain shift big enough that even r=64, which is 11% of the parameters and 84% of a measured update's energy, still leaves a gap." },
          { t: "p", text: "Before concluding that, I would check the cheaper explanations: whether the adapters cover the right modules, since an unadapted matrix contributes nothing at all, and whether `r` has actually been swept rather than left at a default of 8." },
          { t: "p", text: "What makes me reluctant is that full fine-tuning is irreversible and the damage is hard to see. I measured a small run taking general perplexity from 5.386 to 6.748 while its training loss kept improving \u2014 so the only number visible during training was pointing the wrong way, and there is no way to undo it afterwards." },
          { t: "p", text: "The operational argument points the same way. Adapters are tens of megabytes, several can be served from one base, and they can be merged in when you want a plain model. A full fine-tune is a new multi-gigabyte artefact per variant, and a separate deployment for each." }
        ] }
    ]
  }
});
