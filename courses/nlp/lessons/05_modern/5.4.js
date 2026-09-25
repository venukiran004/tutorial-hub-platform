/* ============================================================================
   LESSON 5.4 — Scaling Laws and Emergent Abilities
   Mirrors 02_Transformers_InDepth.md · §15. The Chinchilla arithmetic is
   verified, and "emergence" is reproduced from a perfectly smooth underlying
   curve purely by changing the metric (§05) — scratchpad/nlp/n54.py.
   ========================================================================= */
EC.receiveLesson({
  id: "5.4",

  lede: "**I produced a textbook emergence curve from a capability that improves perfectly smoothly.** Take a per-token accuracy rising on a smooth logistic — no discontinuity anywhere — and score it by exact match over 20 tokens. It reads 0.000000 at 10¹⁰ parameters, 0.000111 at 10¹¹ and 0.029793 at 10¹², a 269x jump that looks exactly like a capability switching on. Nothing switched on. This lesson works through the scaling laws that are solid, and then why the most-repeated claim built on them needs care.",

  objectives: [
    "Apply the Chinchilla rule and compute compute-optimal parameter and token counts",
    "Explain why Chinchilla beat Gopher on the same compute budget",
    "Justify why modern models deliberately overshoot Chinchilla-optimal",
    "Read a power law and understand what its exponent implies",
    "Distinguish genuine capability emergence from a metric artefact"
  ],

  prerequisites: ["5.3", "4.10"],

  blocks: [

    { t: "h2", n: "01", text: "The Chinchilla result", id: "chinchilla" },

    { t: "out", text:
"model           params    tokens     tokens/param   train FLOPs\nGopher           280B       300B            1.1       5.04e+23\nChinchilla        70B      1400B           20.0       5.88e+23\nGPT-3            175B       300B            1.7       3.15e+23\nLLaMA-1 65B       65B      1400B           21.5       5.46e+23\nLLaMA-3 8B         8B     15000B         1875.0       7.20e+23" },

    { t: "callout", kind: "crit", title: "A quarter the size, four times the data, same budget, better model",
      body: [{ t: "p", text: "Chinchilla and Gopher used near-identical training compute — 5.88e23 against 5.04e23 FLOPs, a ratio of 1.17 — and Chinchilla won across the board at **a quarter of Gopher's parameter count**. The difference was entirely how the budget was split. Gopher saw 1.1 tokens per parameter and GPT-3 saw 1.7, against a compute-optimal figure near 20. In other words, the flagship models of that era were **substantially under-trained**, and the field had been buying parameters when it should have been buying data. That single finding redirected how large models were trained." }] },

    { t: "math", tex: "N \\propto C^{0.5}, \\qquad D \\propto C^{0.5} \\qquad \\Rightarrow \\qquad \\frac{D}{N} \\approx 20 \\text{ (constant)}" },

    { t: "out", text:
"compute C          optimal N       optimal D       D/N\n1e+21              0.9B            18B             20.0\n1e+22              2.9B            58B             20.0\n1e+23              9.1B            183B            20.0\n1e+24             28.9B            577B            20.0\n1e+25             91.3B           1826B            20.0\n\ndouble the compute -> multiply BOTH N and D by sqrt(2) = 1.414" },

    { t: "p", text: "Because both scale as the square root of compute, their ratio is constant — the rule is simply *scale parameters and data together*. Using `C ≈ 6ND` from lesson 4.10, you can go from a compute budget straight to a model size and a token count in one line." },

    { t: "h2", n: "02", text: "Why modern models ignore it", id: "overshoot" },

    { t: "out", text:
"model           tokens/param   Chinchilla-optimal   shortfall\nGopher                   1.1            5600B          18.7x\nGPT-3                    1.7            3500B          11.7x\nChinchilla              20.0            1400B           1.0x\nLLaMA-1 65B             21.5            1300B           1.0x\nLLaMA-3 8B            1875.0             160B           1.0x" },

    { t: "callout", kind: "insight", title: "LLaMA-3 8B saw 1875 tokens per parameter — 94x past optimal",
      body: [{ t: "p", text: "That is not a mistake, it is a different objective. Chinchilla answers *what minimises training loss for a fixed training budget*. Nobody deploying a model cares only about that, because **inference cost scales with N and is paid on every request, forever**, while training is paid once. If overshooting on data lets you reach the same quality with a smaller model, you have traded a one-off training cost for a permanent inference saving — and at serving scale that trade is overwhelmingly worth it. Hence the modern pattern: small models trained far past the point Chinchilla would stop. The 8B model above consumed 7.20e23 training FLOPs, *more* than Gopher's 280B model did." }] },

    { t: "h2", n: "03", text: "The power law", id: "powerlaw" },

    { t: "math", tex: "L(N) = \\left(\\frac{N_c}{N}\\right)^{\\alpha} + L_{\\infty}" },

    { t: "out", text:
"Kaplan constants N_c = 8.8e13, alpha = 0.076, L_inf = 1.69\n\nparams      loss      drop from previous\n1e+06       5.7059\n1e+07       5.0612    0.6447\n1e+08       4.5200    0.5412\n1e+09       4.0656    0.4543\n1e+10       3.6843    0.3814\n1e+11       3.3641    0.3202\n1e+12       3.0953    0.2688" },

    { t: "callout", kind: "insight", title: "The exponent is 0.076, which is why scaling is so expensive",
      body: [{ t: "p", text: "Each **10x** in parameters buys a progressively smaller absolute loss reduction — 0.6447, then 0.5412, down to 0.2688. With an exponent of 0.076, improving loss meaningfully requires orders of magnitude, not factors. That is the honest shape of scaling: it is remarkably *reliable*, which is what made it plannable and fundable, and it is remarkably *expensive*. The `L_∞` term matters too: there is an irreducible floor at 1.69, the entropy of the data itself, which no amount of scale crosses." }] },

    { t: "p", text: "The practical value of a power law is prediction. You fit it on small models you can afford to train, extrapolate, and know roughly what a run 100x larger will achieve before committing to it. That is what turned large-model training from a gamble into a budgeting exercise." },

    { t: "h2", n: "04", text: "Emergent abilities, as usually described", id: "emergence" },

    { t: "out", text:
"the standard claim\n\n  few-shot learning          appears around 1B parameters\n  code generation            appears around 10B\n  chain-of-thought reasoning appears around 100B\n\nthese capabilities are said not to exist in smaller models —\nthey \"emerge\" discontinuously at scale" },

    { t: "p", text: "The claim is striking and widely repeated: performance sits at chance across several orders of magnitude, then rises sharply. If true, it has serious implications — you cannot predict what a larger model will be able to do, and safety-relevant capabilities could appear without warning. It is worth testing." },

    { t: "h2", n: "05", text: "Producing emergence from a smooth curve", id: "artefact" },

    { t: "p", text: "Take a capability whose *per-token* accuracy improves along a smooth logistic in log-parameters. Score the same underlying model two ways: continuously, and by exact match over a 5-token answer." },

    { t: "out", text:
"params    per-token acc    exact-match (5 tok)    continuous credit\n1e7           0.0208             0.000000              0.0208\n1e8           0.0601             0.000001              0.0601\n1e9           0.1611             0.000109              0.1611\n1e10          0.3659             0.006555              0.3659\n1e11          0.6341             0.102544              0.6341\n1e12          0.8389             0.415459              0.8389\n1e13          0.9399             0.733566              0.9399" },

    { t: "callout", kind: "crit", title: "Same model, same improvement — one metric shows a smooth rise, the other a cliff",
      body: [{ t: "p", text: "The per-token column is a smooth logistic by construction; there is **no discontinuity anywhere in the underlying capability**. But exact match reads 0.000109 at 10⁹, then 0.006555, then 0.102544, then 0.415459 — flat against the axis for three orders of magnitude and then a sharp climb. That is the emergence curve, and it was produced entirely by the metric requiring all five tokens to be right at once. Schaeffer, Miranda and Koyejo made precisely this argument in 2023, showing that many reported emergent abilities disappear when the same model outputs are scored with a continuous metric." }] },

    { t: "out", text:
"how sharp the metric makes it look\n\nexact match over    1e10        1e11        1e12      jump 1e11->1e12\n 1 token          0.365864    0.634136    0.838891        1x\n 2 tokens         0.133857    0.402128    0.703738        2x\n 5 tokens         0.006555    0.102544    0.415459        4x\n10 tokens         0.000043    0.010515    0.172606       16x\n20 tokens         0.000000    0.000111    0.029793      269x" },

    { t: "callout", kind: "insight", title: "The longer the required output, the sharper the apparent emergence",
      body: [{ t: "p", text: "Scored on a single token the same smooth capability shows no jump at all. Require 20 tokens and it appears to jump **269x** between 10¹¹ and 10¹². This is mechanical: exact match over k tokens is `p^k`, and raising a smooth sigmoid to a high power manufactures a threshold. Note which benchmarks this implicates most — multi-step arithmetic, code that must compile, chain-of-thought where the whole chain must be right. Those are exactly the tasks where emergence is most often reported, and exactly the ones with the longest all-or-nothing outputs." }] },

    { t: "callout", kind: "note", title: "What this does and does not settle",
      body: [{ t: "p", text: "It does **not** show that emergence is never real, and it does not mean large models are not qualitatively more useful — they plainly are. What it shows is that a sharp benchmark curve is not by itself evidence of a discontinuity in the model, because a discontinuous *metric* over a smooth capability produces the same picture. The practical discipline that follows is concrete: when you see a capability jump, re-score the same outputs with a continuous metric — per-token accuracy, edit distance, log-probability of the correct answer — before concluding anything switched on. If the continuous version is smooth, you have a metric effect. If it is also sharp, you have something worth investigating." }] },

    { t: "diagram", kind: "compare", title: "Two readings of the same benchmark jump",
      columns: [
        { title: "Emergence as capability", tone: "violet", items: [
          "Something new appears at a scale threshold",
          "Smaller models genuinely cannot do it",
          "Larger models are unpredictable",
          "Implies safety-relevant surprises",
          "Would show under any metric"
        ] },
        { title: "Emergence as measurement", tone: "warn", items: [
          "Underlying skill improves smoothly",
          "Exact match over k tokens is p^k",
          "A sigmoid raised to a power looks like a cliff",
          "Predictable from smaller models",
          "Vanishes under continuous scoring"
        ] }
      ] },

    { t: "h2", n: "06", text: "Using scaling laws in practice", id: "practice" },

    { t: "dl", items: [
      ["Fit before you commit", "Train a ladder of small models, fit the power law, extrapolate. Knowing the loss a 100x run will reach is worth far more than the cost of the ladder."],
      ["Budget with C ≈ 6ND", "Six FLOPs per parameter per token for training. Turn GPU-hours into a feasible (N, D) pair before choosing an architecture."],
      ["Weight inference cost", "Chinchilla optimises training only. If you serve the model at volume, overshoot D and shrink N — a permanent saving against a one-off cost."],
      ["Distrust sharp curves", "Re-score with a continuous metric before believing a capability appeared. Most reported cliffs are p^k in disguise."]
    ] },

    { t: "callout", kind: "tradeoff", title: "What scaling laws do not tell you",
      body: [{ t: "p", text: "They predict **loss**, not capability, and the relationship between the two is not one you can assume. They are fitted within an architecture and data distribution, so they extrapolate only while those hold — a change of tokeniser, data mix or architecture invalidates the fit. And they say nothing about data *quality*: the token counts in every table above treat all tokens as equal, which is plainly false, and much of the recent progress in small models has come from better data rather than more of it. Treat a scaling law as a well-calibrated instrument with a narrow operating range, not a law of nature." }] },

    { t: "exercise", title: "Fit and test",
      tasks: [
        "Compute the Chinchilla-optimal N and D for a compute budget you could actually afford, using C ≈ 6ND.",
        "Take three models you use and compute their tokens-per-parameter ratio. Note which are over- and under-trained.",
        "Reproduce the emergence simulation and vary the number of required tokens from 1 to 50.",
        "Find a published emergence claim, then check whether the paper reports any continuous metric alongside the discontinuous one.",
        "Train three small models at increasing size, fit the power law, and predict a fourth before training it."
      ] }
  ],

  takeaways: [
    "Chinchilla (70B, 1.4T tokens) beat Gopher (280B, 300B tokens) at near-identical compute — 5.88e23 against 5.04e23 FLOPs.",
    "The rule is N ∝ C^0.5 and D ∝ C^0.5, so tokens-per-parameter is constant at about 20 and both scale by sqrt(2) when compute doubles.",
    "Gopher saw 1.1 tokens per parameter and GPT-3 1.7 — the flagship models of that era were substantially under-trained.",
    "LLaMA-3 8B saw 1875 tokens per parameter, 94x past Chinchilla-optimal, because inference cost scales with N and is paid forever.",
    "The Kaplan exponent is 0.076, so each 10x in parameters buys a shrinking absolute loss reduction: 0.6447 down to 0.2688.",
    "L_inf is an irreducible floor — the entropy of the data — that no amount of scale crosses.",
    "A perfectly smooth logistic per-token accuracy, scored by exact match over 5 tokens, reads 0.000109 then 0.006555 then 0.102544 then 0.415459 — an emergence curve from nothing discontinuous.",
    "Exact match over k tokens is p^k, so the longer the required output the sharper the apparent jump: 1x at one token, 269x at twenty.",
    "This does not prove emergence is never real — it proves a sharp benchmark curve is not by itself evidence of one.",
    "Scaling laws predict loss, not capability, and are only valid within the architecture and data distribution they were fitted on."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "What did Chinchilla actually show?",
      options: ["That bigger models are always better", "That for a fixed compute budget, parameters and data should scale equally — and the flagship models of the era were badly under-trained", "That data quality matters more than quantity", "That 70B is the optimal model size"],
      answer: 1,
      why: "Chinchilla used essentially Gopher's compute (5.88e23 against 5.04e23 FLOPs) at a quarter the parameters and four times the data, and won. Gopher saw 1.1 tokens per parameter and GPT-3 1.7 against a compute-optimal figure near 20 — the field had been buying parameters when it should have been buying data." },
    { stem: "Why does LLaMA-3 8B use 1875 tokens per parameter when Chinchilla says 20?",
      options: ["The Chinchilla result was wrong", "Chinchilla optimises training compute only, while inference cost scales with N and is paid on every request forever", "It was trained on lower-quality data", "To improve few-shot learning"],
      answer: 1,
      why: "Overshooting on data to reach the same quality with a smaller model trades a one-off training cost for a permanent inference saving. At serving scale that is overwhelmingly worth it — which is why LLaMA-3 8B consumed 7.20e23 training FLOPs, more than Gopher's 280B model did." },
    { stem: "How was an emergence curve produced from a smooth capability?",
      options: ["By adding noise", "By scoring a smoothly improving per-token accuracy with exact match over several tokens, which is p^k and manufactures a threshold", "By using too few models", "By plotting on a log axis"],
      answer: 1,
      why: "Per-token accuracy followed a smooth logistic with no discontinuity, yet exact match over 5 tokens read 0.000109, 0.006555, 0.102544, 0.415459 across successive orders of magnitude. Over 20 tokens the apparent jump between 1e11 and 1e12 was 269x. Raising a sigmoid to a power creates the cliff." },
    { stem: "What should you do when you see a sharp capability jump on a benchmark?",
      options: ["Report it as emergence", "Re-score the same outputs with a continuous metric — per-token accuracy, edit distance, log-probability — before concluding anything switched on", "Train a larger model", "Increase the sample size"],
      answer: 1,
      why: "A discontinuous metric over a smooth capability produces the same picture as a genuine discontinuity, so the sharp curve alone is not evidence. If the continuous version is smooth, it is a metric effect. If it is also sharp, you have something real. The tasks where emergence is most reported — multi-step arithmetic, code that must compile, chain-of-thought — are exactly those with long all-or-nothing outputs." }
  ] },

  interview: { title: "Interview", sub: "Scaling", questions: [
    { level: "Core", q: "What are scaling laws and what did Chinchilla change?",
      strong: "Loss follows a power law in parameters and data; Chinchilla showed they must scale together.",
      answer: [{ t: "p", text: "Scaling laws say that loss follows a smooth power law in model size, dataset size and compute — L of N is N_c over N to the alpha, plus an irreducible floor. What makes them valuable is predictability: you fit on small models you can afford and extrapolate, so a large run becomes a budgeting exercise rather than a gamble. Chinchilla's contribution was working out the optimal *allocation*. For a fixed compute budget, parameters and data should each scale as the square root of compute, which means tokens per parameter is roughly constant at about 20. The demonstration was that Chinchilla at 70B on 1.4 trillion tokens beat Gopher at 280B on 300 billion, using essentially the same compute — 5.88e23 against 5.04e23 FLOPs. That implied the flagship models of the time were badly under-trained: Gopher saw 1.1 tokens per parameter and GPT-3 1.7, against an optimal 20. The field had been buying parameters when it should have been buying data. One thing worth adding is that modern practice deliberately overshoots Chinchilla — LLaMA-3 8B saw 1875 tokens per parameter — because Chinchilla optimises training cost and inference cost is paid on every request forever." }] },
    { level: "Senior", q: "Are emergent abilities real?",
      strong: "Many reported cases are metric artefacts; a sharp benchmark curve is not by itself evidence.",
      answer: [{ t: "p", text: "I'd be careful with the claim, because a sharp benchmark curve isn't by itself evidence of a discontinuity in the model. I can demonstrate why. Take a capability whose per-token accuracy improves along a perfectly smooth logistic in log-parameters — no discontinuity anywhere by construction — and score it with exact match over five tokens. You get 0.000109, then 0.006555, then 0.102544, then 0.415459 across successive orders of magnitude: flat against the axis and then a sharp climb, which is exactly the emergence shape. Nothing switched on; exact match over k tokens is p to the k, and raising a sigmoid to a power manufactures a threshold. The effect scales with the required output length — over 20 tokens the apparent jump between 1e11 and 1e12 is 269 times, over a single token there's no jump at all. Schaeffer, Miranda and Koyejo made this argument in 2023 and showed many reported emergent abilities vanish under continuous scoring. What I wouldn't say is that emergence is never real or that large models aren't qualitatively more useful — they clearly are. The discipline I'd apply is: when you see a jump, re-score the same outputs with a continuous metric before concluding anything. Note which benchmarks this implicates most — multi-step arithmetic, code that must compile, chain-of-thought — all long all-or-nothing outputs." }] },
    { level: "Senior", q: "You have a fixed compute budget for training a model you will serve at scale. How do you allocate it?",
      strong: "Not at Chinchilla-optimal — overshoot on data to shrink the model, because inference is paid forever.",
      answer: [{ t: "p", text: "I'd start from Chinchilla as the reference point and then deliberately move away from it, because Chinchilla answers the wrong question for a model you're going to serve. It minimises training loss for a fixed training budget, which is right if you train once and never deploy. In production, inference cost scales with parameter count and is paid on every request, forever, while training is a one-off. So the right trade is to overshoot on tokens and shrink the model: spend more training compute to reach the same quality at a smaller N, and recoup it permanently at serving time. That's exactly what the LLaMA line does — LLaMA-3 8B at 1875 tokens per parameter is 94 times past Chinchilla-optimal, and it consumed more training compute than Gopher's 280B model did. Concretely I'd use C is roughly 6ND to turn GPU-hours into feasible pairs, pick the smallest N that hits my quality bar, and put everything else into D. I'd also fit my own scaling curve on a ladder of small models rather than trusting published constants, because they're fitted within a specific architecture and data distribution and don't transfer cleanly. And I'd push hard on data quality, which none of these laws model at all — they count all tokens as equal, which is plainly false, and a lot of recent small-model progress has come from better data rather than more of it." }] }
  ] }
});
