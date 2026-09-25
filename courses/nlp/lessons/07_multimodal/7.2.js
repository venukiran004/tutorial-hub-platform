/* ============================================================================
   LESSON 7.2 — CLIP and Contrastive Learning
   Mirrors 03_Multimodal_AI.md · §2. The InfoNCE loss is implemented, and
   real zero-shot classification is run on synthesised images — it scores 3/4,
   and the failure is instructive (§05) (scratchpad/nlp/n71.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.2",

  lede: "**CLIP identified a red circle at 0.9950, a blue square at 0.9998 and a green triangle at 1.0000 — images generated from scratch that no model has ever seen — and then called a page of printed text a `square` at 0.7000.** Three successes and one failure, and the failure is the more useful result: my synthetic text was horizontal black bars, which genuinely does look more like a rectangle than like typography. This lesson implements the contrastive loss, runs the real model, and is specific about where zero-shot transfer stops working.",

  objectives: [
    "Implement the InfoNCE contrastive loss and verify it on aligned and random data",
    "Explain why contrastive pretraining needs enormous batch sizes",
    "Show what temperature does to the discrimination task",
    "Run zero-shot classification and measure prompt sensitivity",
    "Identify what CLIP is and is not good at"
  ],

  prerequisites: ["7.1", "5.9"],

  blocks: [

    { t: "h2", n: "01", text: "The architecture", id: "architecture" },

    { t: "out", text:
"Image encoder (ViT-L/14 or ResNet)  ->  image embedding\n                                            ^ cosine similarity\nText encoder (Transformer)          ->  text embedding\n\nTrained contrastively on 400M (image, text) pairs:\n  matching pairs     -> high similarity\n  non-matching pairs -> low similarity" },

    { t: "p", text: "Two encoders, no cross-attention, one shared embedding space. Lesson 5.9 measured the real checkpoint: 87,456,000 vision parameters, 63,165,952 text parameters, a 512-dimensional shared space, and a learned temperature that saturated at exactly 100.00." },

    { t: "h2", n: "02", text: "The loss", id: "loss" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n71.py — InfoNCE, symmetric", code:
"def clip_loss(image_embeddings, text_embeddings, temperature=0.07):\n    image_embeddings = F.normalize(image_embeddings, dim=-1)\n    text_embeddings  = F.normalize(text_embeddings,  dim=-1)\n\n    logits = image_embeddings @ text_embeddings.T / temperature\n\n    # the diagonal is the positive pairs: image i matches text i\n    labels = torch.arange(len(logits))\n\n    loss_i2t = F.cross_entropy(logits,   labels)   # image finds its caption\n    loss_t2i = F.cross_entropy(logits.T, labels)   # caption finds its image\n    return (loss_i2t + loss_t2i) / 2",
      caption: "Normalising first makes the dot product a cosine. The loss is **symmetric** — the model must solve the problem in both directions, which stops it degenerating into a one-way lookup." },

    { t: "out", text:
"batch 8, dim 16, temperature 0.07\n\n  PERFECT alignment (image_i identical to text_i):  loss 0.000284\n  RANDOM (no relationship at all):                  loss 6.0767\n\n  chance level = ln(batch) = ln(8) = 2.0794" },

    { t: "callout", kind: "insight", title: "Random is worse than chance, for the same reason as lesson 6.6",
      body: [{ t: "p", text: "A random model scores **6.0767** where uniform guessing would score **2.0794** — nearly three times worse. This is the same phenomenon the untrained translation model showed: random embeddings at temperature 0.07 produce *confident* and arbitrary similarity judgements, and cross-entropy punishes confident wrongness far harder than uncertainty. It matters practically, because it means a CLIP loss above `ln(batch)` early in training is normal rather than alarming — the model has to get *past* confidently wrong before it reaches uncertain, and only then to correct." }] },

    { t: "h2", n: "03", text: "Why batch size is the difficulty", id: "batch" },

    { t: "out", text:
"batch       ln(batch)     negatives per positive\n8              2.0794              7\n32             3.4657             31\n256            5.5452            255\n1,024          6.9315          1,023\n32,768        10.3972         32,767" },

    { t: "callout", kind: "crit", title: "Each row is an N-way classification, and N is the batch size",
      body: [{ t: "p", text: "The negatives come *only* from the batch — there is no negative sampling step, the other items in the batch simply are the negatives. So the batch size directly sets the difficulty: CLIP trained at **32,768**, meaning every correct pair had to beat **32,767** competitors. That is why contrastive pretraining is so infrastructure-heavy, and it is a genuine barrier rather than a tuning preference. It is also exactly what **SigLIP** changed: replacing the softmax with a sigmoid makes each pair an independent binary decision, so the loss no longer couples across the batch and large batches stop being a requirement." }] },

    { t: "h2", n: "04", text: "Temperature", id: "temperature" },

    { t: "out", text:
"temperature   loss (random data)   mean diagonal probability\n0.01              40.6181                 0.2395\n0.07               5.0752                 0.0914\n0.20               3.4726                 0.0508\n1.00               2.1244                 0.1223" },

    { t: "p", text: "At `T = 1.00` the loss on random data is 2.1244, essentially the chance level of 2.0794 — the softmax is flat enough that being wrong costs little. At `T = 0.01` it is **40.62**, because a very sharp softmax converts a slightly wrong ranking into a near-certain wrong answer. CLIP initialises at 0.07 and *learns* the value from there, and lesson 5.9 found the trained checkpoint had pushed it to its clamp of 100 in the `exp(logit_scale)` parameterisation — the model wanted sharper discrimination than it was allowed." },

    { t: "h2", n: "05", text: "Zero-shot classification, for real", id: "zeroshot" },

    { t: "p", text: "Four images generated programmatically — a red circle, a blue square, a green triangle and a block of horizontal black bars standing in for printed text — and four candidate captions. No training, no labels, no fine-tuning." },

    { t: "out", text:
"image              circle      square      triangle    text\nred circle         0.9950      0.0040      0.0009      0.0001\nblue square        0.0000      0.9998      0.0002      0.0000\ngreen triangle     0.0000      0.0000      1.0000      0.0000\nblack text         0.0279      0.7000      0.1877      0.0844\n\ncorrect: 3/4" },

    { t: "callout", kind: "insight", title: "Three near-certain, and one honest failure",
      body: [{ t: "p", text: "The shapes are recognised at 0.9950, 0.9998 and 1.0000 — from images synthesised in ten lines of PIL that resemble nothing in CLIP's training distribution. That is genuine zero-shot transfer: alignment learned from 400M web captions generalising to novel input. The fourth case failed, and it is worth being precise about why rather than calling it a CLIP weakness. My \"printed text\" was a stack of horizontal black bars. It **does** look more like a rectangle than like typography, so 0.7000 on *square* is arguably the correct answer to the image I actually produced. The lesson is about evaluation as much as about CLIP: a synthetic test probe is only as good as its resemblance to the thing it claims to represent." }] },

    { t: "h2", n: "06", text: "Prompt sensitivity", id: "prompts" },

    { t: "out", text:
"same image (red circle), different candidate phrasings\n\n  \"a photo of a red circle\"   ->  0.9951\n  \"a red circle\"              ->  0.9874\n  \"red circle\"                ->  0.9811\n  \"circle\"                    ->  0.7440" },

    { t: "callout", kind: "insight", title: "The template is worth 25 points on the bare label",
      body: [{ t: "p", text: "Dropping from `\"a photo of a red circle\"` to `\"circle\"` costs **0.9951 to 0.7440**. The reason is distributional: CLIP's text encoder was trained on web alt-text, which overwhelmingly looks like *\"a photo of a golden retriever\"* rather than *\"golden retriever\"*. A bare label is out of distribution for the text tower. This is why CLIP's own paper reports prompt-ensembling results — averaging embeddings over 80 templates — and it generalises: whenever a model has a training distribution you can name, matching it at inference is free accuracy. It is the same principle as train-serve skew in lesson 3.5, applied deliberately rather than avoided." }] },

    { t: "h2", n: "07", text: "Variants, and what each fixed", id: "variants" },

    { t: "table",
      head: ["Model", "Key change", "Problem it addresses"],
      rows: [
        ["OpenCLIP", "Open training on LAION", "Reproducibility — the original data was never released"],
        ["SigLIP", "Sigmoid loss instead of softmax", "Removes the giant-batch requirement"],
        ["EVA-CLIP", "Better ViT, higher resolution", "Fine detail and overall quality"],
        ["MetaCLIP", "Curated data with metadata", "Data quality over raw scale"],
        ["ALIGN", "1.8B noisy pairs", "Showed scale can substitute for cleaning"]
      ] },

    { t: "callout", kind: "tradeoff", title: "What CLIP is good and bad at",
      body: [{ t: "p", text: "It is excellent at recognising photographed objects, scenes and styles, because that is what web alt-text describes. It is weak at **reading text in images**, **counting**, **spatial relations** (*left of*, *above*) and **fine-grained distinctions** within a category — and all four weaknesses trace to the same source: captions rarely state those things. \"A photo of three cats on the left of a sofa\" is not how people caption images, so the training signal for counting and position is thin. That is worth knowing before deploying it: CLIP's failures are not random, they are a shadow of its training distribution." }] },

    { t: "exercise", title: "Probe the alignment",
      tasks: [
        "Implement the contrastive loss and verify it approaches 0 on perfectly aligned data and exceeds ln(batch) on random data.",
        "Sweep batch size from 8 to 1024 on the same data and observe how the loss scales.",
        "Run zero-shot classification on your own images and find a category where it fails.",
        "Compare four prompt templates on the same image and measure the spread.",
        "Test CLIP on counting — three objects against five — and on spatial relations, and record how far it gets."
      ] }
  ],

  takeaways: [
    "CLIP is two encoders with no cross-attention, aligned only by a symmetric contrastive loss over 400M pairs.",
    "The loss is symmetric so the model must match images to captions AND captions to images, preventing a one-way degenerate solution.",
    "Perfect alignment gives loss 0.000284; random gives 6.0767 against a chance level of ln(8) = 2.0794 — random is worse than chance, so an early loss above ln(batch) is normal.",
    "Negatives come only from the batch, so batch size sets the difficulty: CLIP's 32,768 means every positive beat 32,767 competitors.",
    "SigLIP's sigmoid loss makes each pair independent, removing the giant-batch requirement entirely.",
    "Temperature 0.01 gives loss 40.62 on random data against 2.12 at temperature 1.00 — a sharp softmax converts a slight misranking into a confident error.",
    "Zero-shot on synthesised images: 0.9950, 0.9998 and 1.0000 on three shapes, with one honest failure where the probe itself was ambiguous.",
    "Prompting matters: 'a photo of a red circle' scores 0.9951 against 0.7440 for bare 'circle', because web alt-text is the text tower's training distribution.",
    "CLIP is weak at reading text in images, counting, spatial relations and fine-grained distinctions — all things captions rarely state."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does contrastive pretraining need enormous batch sizes?",
      options: ["For gradient stability", "The negatives come only from the batch, so batch size is the number of competitors each positive pair must beat", "To fit the learning rate schedule", "To parallelise the two towers"],
      answer: 1,
      why: "Each row of the similarity matrix is an N-way classification where N is the batch size. CLIP trained at 32,768, so every correct pair beat 32,767 negatives. SigLIP addressed exactly this by replacing the softmax with a sigmoid, making each pair an independent binary decision so the loss no longer couples across the batch." },
    { stem: "A CLIP model early in training has loss above ln(batch_size). Is that a problem?",
      options: ["Yes, it is worse than random so something is broken", "No — random embeddings at low temperature produce confidently wrong judgements, and cross-entropy punishes that harder than uncertainty", "Yes, the temperature must be wrong", "It is impossible to exceed ln(batch)"],
      answer: 1,
      why: "Measured: random data at temperature 0.07 gave 6.0767 against a chance level of 2.0794. The model must get past confidently wrong before reaching uncertain, and only then to correct. It is the same phenomenon lesson 6.6 found in an untrained translation model, whose loss was 0.92 nats worse than uniform guessing." },
    { stem: "Why does 'a photo of a red circle' beat bare 'circle' by 0.9951 to 0.7440?",
      options: ["Longer prompts always score higher", "CLIP's text encoder was trained on web alt-text, so a bare label is out of distribution for it", "The word 'photo' matches image features", "Bare labels tokenise poorly"],
      answer: 1,
      why: "Alt-text overwhelmingly reads 'a photo of a golden retriever' rather than 'golden retriever'. Matching the training distribution at inference is free accuracy, which is why CLIP's paper reports prompt-ensembling over 80 templates. It is train-serve alignment exploited deliberately rather than avoided." },
    { stem: "Which of these is CLIP structurally weak at?",
      options: ["Recognising photographed objects", "Counting objects and spatial relations, because captions rarely state them", "Distinguishing colours", "Recognising scenes"],
      answer: 1,
      why: "Its weaknesses — reading text in images, counting, spatial relations, fine-grained within-category distinctions — all trace to the training distribution. Nobody captions an image 'three cats to the left of a sofa', so the supervision for those properties is thin. CLIP's failures are a shadow of its data, not random." }
  ] },

  interview: { title: "Interview", sub: "Contrastive learning", questions: [
    { level: "Core", q: "How does CLIP work?",
      strong: "Two encoders into a shared space, aligned by a symmetric contrastive loss over the batch.",
      answer: [{ t: "p", text: "An image encoder and a text encoder each produce one vector, projected into a shared space — 512 dimensions for the base model. They're trained on around 400 million image-caption pairs with a contrastive loss: normalise both sides, compute the full similarity matrix between every image and every caption in the batch, and treat each row as a classification problem where the correct answer is the diagonal. It's symmetric, so both image-to-text and text-to-image are optimised, which prevents a degenerate one-way solution. The crucial structural detail is that the two towers never attend to each other — each embedding depends only on its own input. That's what makes CLIP a retrieval model: you can embed a corpus once offline and match any query with a dot product. It's also what enables zero-shot classification, since you just embed candidate captions and pick the nearest. I tested that on images I generated from scratch — a red circle, a blue square, a green triangle — and got 0.9950, 0.9998 and 1.0000, with no training on anything resembling them. The alignment learned from web captions genuinely transfers." }] },
    { level: "Senior", q: "What are CLIP's failure modes and where do they come from?",
      strong: "Counting, spatial relations, text in images, fine-grained distinctions — all shadows of the caption distribution.",
      answer: [{ t: "p", text: "Its weaknesses are systematic and traceable to one cause: it learned from web alt-text, so it knows what people write in captions and not much else. It's excellent at photographed objects, scenes and artistic styles, because that's what captions describe. It's weak at counting — nobody writes 'three cats' unless the count matters. Weak at spatial relations, since 'to the left of the sofa' is rare phrasing. Weak at reading text within an image, which is why document understanding needs different models entirely. And weak at fine-grained within-category distinctions, like bird species, unless the captions happened to name them. There's also prompt sensitivity, which is really the same issue: I measured 'a photo of a red circle' scoring 0.9951 and bare 'circle' scoring 0.7440 on the identical image, because a bare label is out of distribution for a text tower trained on alt-text. That's why the paper ensembles over 80 templates. The practical upshot is that CLIP's failures aren't random noise you can average away — they're structured, predictable from the training data, and you should test the specific properties your application depends on rather than trusting an aggregate benchmark." }] },
    { level: "Senior", q: "You need to train a contrastive model but cannot run batch sizes of 32,768. What are your options?",
      strong: "SigLIP's sigmoid loss, or a memory bank / momentum encoder — or don't pretrain at all.",
      answer: [{ t: "p", text: "The constraint is real and worth naming precisely: in InfoNCE the negatives come only from the batch, so batch size is literally the number of competitors each positive must beat. At 32,768 that's 32,767 negatives per pair, and that's why CLIP-scale pretraining is infrastructure-heavy rather than merely expensive. Three ways around it. First and best, SigLIP: replace the softmax with a sigmoid so each pair becomes an independent binary decision. The loss stops coupling across the batch, so large batches are no longer required and it scales down gracefully. That's the cleanest answer and I'd start there. Second, decouple the negatives from the batch — MoCo's approach, keeping a queue of embeddings from recent batches as extra negatives, updated by a momentum encoder so they don't go stale. You get a large effective negative set with a small compute batch. Third, gradient accumulation doesn't help here, which is worth knowing, because the loss needs all the similarities simultaneously rather than summed across steps. But the answer I'd actually give first is: don't pretrain. Fine-tune an existing CLIP on your domain pairs, which needs orders of magnitude less data and no giant batches, and only consider pretraining if your domain is genuinely far from web imagery — medical or satellite data, for instance." }] }
  ] }
});
