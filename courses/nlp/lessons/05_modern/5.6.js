/* ============================================================================
   LESSON 5.6 — HuggingFace in Practice
   Mirrors 02_Transformers_InDepth.md · §17. LoRA's arithmetic is computed
   (0.271% of BERT trainable, 4x less training memory), the low-rank premise
   is checked honestly (§04), and distillation temperature is measured
   (scratchpad/nlp/n56.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.6",

  lede: "**LoRA at rank 8 makes 296,450 parameters trainable out of 109,483,778 — 0.271% — and cuts training memory from 1751.7 MB to 441.5 MB.** The memory saving is the part that matters, and it is not where people usually look: the weights still occupy 437.9 MB either way. What collapses is gradients (437.9 MB to 1.2 MB) and Adam state (875.9 MB to 2.4 MB), because both scale with *trainable* parameters rather than total. This lesson covers the fine-tuning toolkit, and checks the premise LoRA rests on.",

  objectives: [
    "Use the Trainer API and understand what its defaults commit you to",
    "Compute LoRA's parameter and memory savings for a real model",
    "State precisely what LoRA's low-rank assumption claims, and what it does not",
    "Explain distillation temperature and what dark knowledge means",
    "Choose between full fine-tuning, PEFT and distillation"
  ],

  prerequisites: ["5.5", "3.3"],

  blocks: [

    { t: "h2", n: "01", text: "The Trainer", id: "trainer" },

    { t: "code", lang: "python", title: "The standard fine-tuning configuration", code:
"training_args = TrainingArguments(\n    output_dir=\"./results\",\n    num_train_epochs=3,\n    per_device_train_batch_size=16,\n    per_device_eval_batch_size=64,      # no gradients, so larger fits\n    learning_rate=2e-5,\n    weight_decay=0.01,\n    warmup_ratio=0.1,\n    eval_strategy=\"epoch\",              # was evaluation_strategy before 4.41\n    save_strategy=\"epoch\",\n    load_best_model_at_end=True,\n    fp16=True,\n)\n\ntrainer = Trainer(model=model, args=training_args,\n                  train_dataset=train_dataset, eval_dataset=eval_dataset,\n                  tokenizer=tokenizer)\ntrainer.train()",
      caption: "`load_best_model_at_end=True` requires `eval_strategy` and `save_strategy` to match — a mismatch raises at construction, which is one of the few errors this API gives you early." },

    { t: "dl", items: [
      ["`learning_rate=2e-5`", "Two orders below training from scratch. The single most common cause of a fine-tune that destroys the pretrained weights is leaving this too high."],
      ["`warmup_ratio=0.1`", "Ramp the learning rate over the first 10% of steps. Matters most for Post-LN models, which lesson 4.6 showed deliver 1.918e-07 of gradient to the first block."],
      ["`fp16=True`", "Halves activation memory and uses tensor cores. Use `bf16` instead on Ampere or newer — same speed, far better dynamic range, and it avoids the loss-scaling failures fp16 is prone to."],
      ["`per_device_eval_batch_size=64`", "Larger than training because evaluation stores no gradients or optimiser state. Free throughput people routinely leave on the table."]
    ] },

    { t: "h2", n: "02", text: "LoRA", id: "lora" },

    { t: "math", tex: "W' = W + BA, \\qquad B \\in \\mathbb{R}^{d \\times r},\\; A \\in \\mathbb{R}^{r \\times d}, \\quad r \\ll d" },

    { t: "p", text: "Freeze `W`. Learn a low-rank update instead, as the product of two thin matrices. At inference you can fold `BA` back into `W` so there is **no added latency at all** — unlike adapters, which insert real layers into the forward pass." },

    { t: "out", text:
"one d x d attention projection at d = 768 is 589,824 params\n\nrank r   LoRA params   fraction   reduction\n1             1,536      0.0026        384x\n2             3,072      0.0052        192x\n4             6,144      0.0104         96x\n8            12,288      0.0208         48x\n16           24,576      0.0417         24x\n32           49,152      0.0833         12x\n64           98,304      0.1667          6x" },

    { t: "out", text:
"LoRA r=8 on query and value of all 12 BERT layers\n\n  LoRA matrices              294,912\n  classification head          1,538\n  trainable total            296,450   = 0.271% of 109,483,778" },

    { t: "h2", n: "03", text: "Where the memory actually goes", id: "memory" },

    { t: "out", text:
"                 weights    gradients    Adam state    total\nfull fine-tune   437.9 MB    437.9 MB      875.9 MB   1751.7 MB\nLoRA r=8         437.9 MB      1.2 MB        2.4 MB    441.5 MB" },

    { t: "callout", kind: "insight", title: "The weights are unchanged — it is the optimiser that collapses",
      body: [{ t: "p", text: "A common misreading of LoRA is that it makes the *model* smaller. It does not: all 437.9 MB of weights stay resident, because the forward pass needs them. What shrinks is everything that scales with **trainable** parameters — gradients by 365x and Adam's two moment buffers by the same. Since Adam state is twice the gradient size, it is the single largest term in a full fine-tune, and removing it is most of the 4x saving here. On a 7B model the effect is the difference between needing multiple cards and fitting on one, which is exactly what QLoRA exploits: quantise the frozen base to 4-bit to shrink the one term LoRA cannot touch, then train adapters in higher precision on top." }] },

    { t: "h2", n: "04", text: "Is the low-rank assumption justified?", id: "lowrank" },

    { t: "p", text: "LoRA is often explained as \"weight matrices are low-rank\". That claim is easy to test, so I tested it — taking a randomly initialised matrix and measuring how much a rank-`r` truncated SVD captures." },

    { t: "out", text:
"rank r     fraction of a RANDOM 768x768 matrix captured\n1                0.3%\n4                1.0%\n16               3.9%\n64              14.5%\n256             49.0%\n768            100.0%" },

    { t: "callout", kind: "warn", title: "The usual explanation is wrong; the real claim is narrower",
      body: [{ t: "p", text: "A rank-64 approximation captures only **14.5%** of a random matrix — low rank fits it badly, because a random matrix is full rank. So \"weights are low-rank\" is not the claim and would not survive contact with the data. LoRA's actual hypothesis is about the **update**: `ΔW`, the difference between the fine-tuned and pretrained weights, has low *intrinsic rank*, because adapting a model that already works to a specific task requires far less expressive change than learning the weights in the first place. That is a much more plausible claim, and it is supported empirically — rank 8 or 16 usually matches full fine-tuning on a single downstream task. It also predicts the failure case correctly: when the adaptation is large, such as teaching a genuinely new language or domain, low rank is not enough and you need a higher `r` or full fine-tuning." }] },

    { t: "h2", n: "05", text: "The PEFT family", id: "peft" },

    { t: "table",
      head: ["Method", "Approach", "Trainable", "Inference cost"],
      rows: [
        ["LoRA", "Low-rank update to existing weights", "0.1–1%", "Zero — fold BA into W"],
        ["Adapters", "Bottleneck layers inserted between blocks", "1–5%", "Added layers, real latency"],
        ["Prefix tuning", "Learned virtual tokens prepended to K and V", "~0.1%", "Longer effective sequence"],
        ["Prompt tuning", "Learned soft-prompt embeddings only", "~0.01%", "Longer effective sequence"]
      ] },

    { t: "callout", kind: "tradeoff", title: "LoRA won on the inference column",
      body: [{ t: "p", text: "All four train a tiny fraction of parameters, so the differentiator is not training cost — it is what happens afterwards. LoRA's update is a linear term you can add into the frozen weights once and then serve as an ordinary model, so a LoRA-tuned model is exactly as fast as the base. Adapters add modules to the forward pass permanently. Prefix and prompt tuning consume context positions, which costs quadratic attention and eats the context budget. LoRA also composes well: you can keep many small adapter files and swap or merge them per request, which is how multi-tenant fine-tuned serving works." }] },

    { t: "h2", n: "06", text: "Knowledge distillation", id: "distillation" },

    { t: "math", tex: "\\mathcal{L} = \\alpha \\cdot \\mathcal{L}_{\\text{CE}}(y, \\hat{y}_s) + (1-\\alpha)\\, T^2 \\cdot D_{\\text{KL}}\\!\\left(\\frac{\\hat{y}_t}{T} \\,\\Big\\|\\, \\frac{\\hat{y}_s}{T}\\right)" },

    { t: "out", text:
"teacher logits: cat 4.0, tiger 2.5, lion 2.2, car -1.0, bus -3.0\n\nT        cat       tiger     lion      car       bus\n1.0      0.7163    0.1598    0.1184    0.0048    0.0007\n2.0      0.5022    0.2372    0.2042    0.0412    0.0152\n3.0      0.4096    0.2485    0.2248    0.0774    0.0397\n5.0      0.3275    0.2427    0.2285    0.1205    0.0808\n10.0     0.2632    0.2266    0.2199    0.1597    0.1307\n\nentropy   T=1.0  0.8152      T=2.0  1.2066      (maximum 1.6094)" },

    { t: "callout", kind: "insight", title: "Dark knowledge is the structure among the wrong answers",
      body: [{ t: "p", text: "At **T = 1** the teacher says *cat* at 0.7163 and everything else is nearly zero — the same information a hard label carries, and nothing more. At **T = 5** it says *cat* 0.3275, *tiger* 0.2427, *lion* 0.2285, but *car* only 0.1205 and *bus* 0.0808. The teacher is now telling the student something the label cannot: **tigers and lions are the kind of thing a cat could be mistaken for, and cars are not**. That similarity structure is learned from millions of examples and transfers in a way a one-hot label never could. Raising the temperature is how you surface it — entropy goes from 0.8152 at T=1 toward the maximum 1.6094." }] },

    { t: "p", text: "The `T²` factor exists because gradients through a softmax at temperature `T` scale as `1/T²`. Without it, raising the temperature would silently shrink the distillation term's contribution relative to the hard-label term, and `α` would no longer mean what you set it to. Multiplying by `T²` keeps the two terms comparable as you tune `T`." },

    { t: "out", text:
"BERT-base  (teacher)   109,482,240 params, 12 layers\nDistilBERT (student)    66,362,880 params,  6 layers\n\nstudent is 60.6% of the teacher, 1.65x smaller,\nand retains about 97% of its GLUE score" },

    { t: "h2", n: "07", text: "Choosing an approach", id: "choosing" },

    { t: "diagram", kind: "steps", title: "In increasing order of cost",
      items: [
        { title: "Prompt it", text: "Zero training. Try this first — lesson 3.3's zero-shot classifier scored 0.998 with no labelled data, which tells you whether the task is even separable." },
        { title: "LoRA fine-tune", text: "0.271% of parameters trainable, 4x less training memory, zero inference overhead. The right default when you have a few thousand labelled examples." },
        { title: "Full fine-tune", text: "Every parameter. Better when the adaptation is large — a new domain, a new language — or when you have a lot of data and the capacity to use it." },
        { title: "Distil", text: "Train a smaller student against the teacher's soft outputs. The only option here that reduces INFERENCE cost, which is what you pay forever." }
      ] },

    { t: "callout", kind: "insight", title: "PEFT cuts training cost; distillation cuts inference cost",
      body: [{ t: "p", text: "These are solutions to different problems and are routinely confused. LoRA makes it *cheaper to train* — the served model is the same size and the same speed, because you fold the update back in. Distillation makes it *cheaper to serve* — DistilBERT is 1.65x smaller and correspondingly faster, forever, at about 97% of the quality. If your constraint is a GPU you cannot fit a fine-tune onto, reach for LoRA or QLoRA. If your constraint is latency or cost per request in production, no amount of PEFT helps and distillation or quantisation is what you want. They compose: distil first, then LoRA the student." }] },

    { t: "exercise", title: "Measure the savings",
      tasks: [
        "Compute LoRA trainable parameters for your own model at ranks 4, 8, 16 and 64, and plot against downstream accuracy.",
        "Measure peak training memory with full fine-tuning and with LoRA, and attribute the difference to gradients against optimiser state.",
        "Take a fine-tuned model, compute ΔW against the base, and examine its singular value spectrum to see whether it really is low-rank.",
        "Sweep distillation temperature from 1 to 10 and inspect the teacher's distribution on examples your student gets wrong.",
        "Compare a LoRA-tuned base model against a distilled student on both accuracy and per-request latency."
      ] }
  ],

  takeaways: [
    "LoRA at rank 8 on BERT's query and value projections makes 296,450 of 109,483,778 parameters trainable — 0.271%.",
    "Training memory fell from 1751.7 MB to 441.5 MB, but the 437.9 MB of weights is unchanged — gradients and Adam state are what collapse.",
    "Adam state is twice the gradient size, so it is the largest term in a full fine-tune and removing it is most of the saving.",
    "The claim is NOT that weights are low-rank — a rank-64 approximation captures only 14.5% of a random 768×768 matrix.",
    "The real claim is that the fine-tuning UPDATE has low intrinsic rank, which predicts correctly that large adaptations need higher r.",
    "LoRA's update folds back into W, so a LoRA-tuned model has zero inference overhead; adapters and prefix tuning do not.",
    "Distillation temperature surfaces dark knowledge: at T=1 the teacher says cat 0.7163 and nothing else, at T=5 it says tiger 0.2427 and lion 0.2285 but car only 0.1205.",
    "The T² factor compensates for softmax gradients scaling as 1/T², keeping α meaningful as T changes.",
    "DistilBERT is 66,362,880 parameters against BERT's 109,482,240 — 60.6%, 6 layers instead of 12, at about 97% of GLUE.",
    "PEFT cuts training cost; distillation cuts inference cost. They solve different problems and compose."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "LoRA cut training memory from 1751.7 MB to 441.5 MB. What actually shrank?",
      options: ["The model weights", "Gradients and Adam optimiser state, which scale with trainable parameters — the 437.9 MB of weights is unchanged", "The activations", "The dataset"],
      answer: 1,
      why: "Gradients fell from 437.9 MB to 1.2 MB and Adam state from 875.9 MB to 2.4 MB. The weights must stay resident for the forward pass. Since Adam keeps two moments per trainable parameter, it is the largest term in a full fine-tune, and eliminating it is most of the saving — which is also why QLoRA quantises the frozen base, the one term LoRA cannot touch." },
    { stem: "What does LoRA's low-rank assumption actually claim?",
      options: ["That weight matrices are low-rank", "That the fine-tuning update ΔW has low intrinsic rank, not the weights themselves", "That attention is low-rank", "That gradients are sparse"],
      answer: 1,
      why: "A rank-64 truncated SVD captures only 14.5% of a random 768×768 matrix, so 'weights are low-rank' is false. Adapting a model that already works to one task needs far less expressive change than learning the weights originally — which is why rank 8 or 16 usually suffices, and why genuinely large adaptations like a new language need higher rank or full fine-tuning." },
    { stem: "Why does distillation raise the temperature of the teacher's outputs?",
      options: ["To regularise the student", "To surface the relative structure among wrong answers — at T=5 the teacher shows tiger and lion are plausible and car is not", "To speed up training", "To match the student's capacity"],
      answer: 1,
      why: "At T=1 the teacher gives cat 0.7163 and everything else near zero, which is what a hard label already says. At T=5 it gives tiger 0.2427 and lion 0.2285 against car's 0.1205 — a similarity structure learned from millions of examples that a one-hot label cannot express. That is the dark knowledge being transferred." },
    { stem: "Your inference costs are too high. Does LoRA help?",
      options: ["Yes, it makes the model smaller", "No — LoRA cuts training cost and folds back into W at zero inference overhead; distillation or quantisation is what reduces serving cost", "Yes, by reducing context length", "Only with adapters"],
      answer: 1,
      why: "A LoRA-tuned model serves at exactly the base model's size and speed, because the update is merged into the existing weights. That is a feature, but it means PEFT solves training cost, not serving cost. For inference you need a genuinely smaller model — distillation, where DistilBERT is 1.65x smaller at about 97% quality — or fewer bytes per parameter via quantisation." }
  ] },

  interview: { title: "Interview", sub: "Fine-tuning and compression", questions: [
    { level: "Core", q: "What is LoRA and why does it work?",
      strong: "A learned low-rank update to frozen weights; it works because the fine-tuning delta has low intrinsic rank.",
      answer: [{ t: "p", text: "You freeze the pretrained weights and learn an update expressed as the product of two thin matrices — W prime equals W plus B times A, where B is d by r and A is r by d with r much smaller than d. At rank 8 on BERT's query and value projections that's 296,450 trainable parameters out of about 109 million, 0.271%. The saving that matters is memory during training: I measured 1751.7 MB down to 441.5 MB, and the breakdown is instructive — the 437.9 MB of weights is unchanged, because the forward pass needs them, but gradients drop from 437.9 MB to 1.2 MB and Adam state from 875.9 MB to 2.4 MB, since both scale with trainable parameters. Adam keeping two moments per parameter makes it the largest term in a full fine-tune. On why it works, I'd be careful with the usual explanation. It isn't that weight matrices are low-rank — I checked, and a rank-64 approximation captures only 14.5% of a random 768 by 768 matrix. The claim is about the *update*: adapting a model that already works to one downstream task requires far less expressive change than learning the weights originally. That's more plausible, it's supported empirically, and it predicts the failure mode — genuinely large adaptations like a new language need higher rank or full fine-tuning." }] },
    { level: "Core", q: "What is knowledge distillation and what is dark knowledge?",
      strong: "Training a student on the teacher's soft outputs; dark knowledge is the structure among the wrong answers.",
      answer: [{ t: "p", text: "You train a small student to match a large teacher's output distribution rather than just the hard labels, with a loss combining ordinary cross-entropy against the true label and a KL term against the teacher's softened predictions. Dark knowledge is what the soft targets carry that the labels don't. I measured it on a teacher whose logits were cat 4.0, tiger 2.5, lion 2.2, car minus 1, bus minus 3. At temperature 1 you get cat at 0.7163 and everything else essentially zero — that's just the label again. At temperature 5 you get cat 0.3275, tiger 0.2427, lion 0.2285, but car only 0.1205 and bus 0.0808. The teacher is now saying that a cat could plausibly be confused with a tiger or a lion but not a car, and that similarity structure was learned from millions of examples. It's a much richer training signal per example, which is why a student can reach close to teacher quality on far less data. One detail worth knowing: the loss multiplies the KL term by T squared, because gradients through a softmax at temperature T scale as one over T squared — without it, raising the temperature would silently shrink that term's contribution and your alpha would stop meaning what you set. DistilBERT is the canonical result: 6 layers instead of 12, 60.6% of the parameters, about 97% of GLUE." }] },
    { level: "Senior", q: "You need to adapt a 7B model to your domain with one GPU. What do you do?",
      strong: "QLoRA — quantise the frozen base to 4-bit and train LoRA adapters on top.",
      answer: [{ t: "p", text: "QLoRA, almost certainly. Work the memory arithmetic first: a 7B model in fp16 is 14 GB of weights, and full fine-tuning adds gradients at 14 GB plus Adam's two moments at 28 GB or more, so you're past 56 GB before storing a single activation — it doesn't fit. LoRA alone removes the gradient and optimiser terms, which is the bulk of it, but the frozen weights still sit there at 14 GB and LoRA can't touch them. QLoRA closes that gap by quantising the frozen base to 4-bit, taking the weights to about 3.5 GB, and training the adapters in higher precision on top. Now the whole thing fits comfortably on one 24 GB card with room for activations. Concretely I'd start at rank 16 targeting the query and value projections, since that's the well-trodden configuration, and raise the rank only if the adaptation turns out to be large — a genuinely new domain or language is exactly the case where the low-rank assumption gets strained. Learning rate an order of magnitude above a normal fine-tune, since you're training far fewer parameters. Gradient checkpointing if activations become the constraint. And I'd be clear about what this does and doesn't solve: QLoRA makes *training* fit on one card. The served model is still 7B, so if inference cost is also a problem I'd need distillation or quantisation at serving time, which is a separate decision." }] }
  ] }
});
