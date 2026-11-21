/* ============================================================================
   LESSON 7.2 — CLIP and Contrastive Learning
   The InfoNCE loss is implemented, and real zero-shot classification is run
   on synthesised images — it scores 3/4, and the failure is instructive
   (§05) (n71.py).
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

    {"kind": "flow", "title": "Two encoders, no cross-attention, one shared space", "caption": "The architecture is deliberately minimal: **two towers that never interact, trained so that matching pairs have high cosine similarity and non-matching pairs low — on 400M (image, text) pairs.** 5.9 measured the real checkpoint: **87,456,000 vision parameters, 63,165,952 text parameters, a 512-dimensional shared space, and a learned temperature that saturated at exactly 100.00.** The absence of interaction is the feature: **both sides can be embedded offline and compared with a dot product, which is what makes retrieval at scale possible.**", "cols": 3, "nodes": [{"id": "i", "label": "Image encoder (ViT-L/14)", "sub": "87,456,000 params", "tone": "good"}, {"id": "t", "label": "Text encoder (transformer)", "sub": "63,165,952 params", "tone": "good"}, {"id": "s", "label": "One 512-dim shared space", "sub": "cosine similarity only", "tone": "violet"}, {"id": "n", "label": "No cross-attention anywhere", "sub": "which is the feature", "tone": "violet"}, {"id": "o", "label": "So both sides embed offline", "sub": "retrieval becomes a dot product", "tone": "teal"}], "edges": [["i", "s"], ["t", "s"], ["s", "n"], ["n", "o"]], "t": "diagram", "id": "dg-7_2-01-0"},


    { t: "out", text:
"Image encoder (ViT-L/14 or ResNet)  ->  image embedding\n                                            ^ cosine similarity\nText encoder (Transformer)          ->  text embedding\n\nTrained contrastively on 400M (image, text) pairs:\n  matching pairs     -> high similarity\n  non-matching pairs -> low similarity" },

    { t: "p", text: "Two encoders, no cross-attention, one shared embedding space. Lesson 5.9 measured the real checkpoint: 87,456,000 vision parameters, 63,165,952 text parameters, a 512-dimensional shared space, and a learned temperature that saturated at exactly 100.00." },

    { t: "h2", n: "02", text: "The loss", id: "loss" },

    {"kind": "trace", "title": "0.000284 for perfect alignment and 6.0767 for none, against a chance level of 2.0794", "caption": "The loss is symmetric cross-entropy over the similarity matrix, and the three numbers bracket it exactly. **Perfect alignment gives 0.000284; random data gives 6.0767 — which is nearly three times the chance level of `ln(8) = 2.0794`, not equal to it.** That is the temperature's doing: **at `T = 0.07` the softmax is sharp, so a wrong ranking is confidently wrong rather than merely unhelpful**, which §04 measures directly.", "left": "condition", "codeW": 190, "vars": ["loss", "against chance = 2.0794"], "steps": [{"code": "perfect alignment", "state": ["0.000284", "far below"], "tone": "good"}, {"code": "chance level, ln(8)", "state": ["2.0794", "the reference"], "changed": [0, 1], "tone": "accent"}, {"code": "random data", "state": ["6.0767", "2.9x WORSE than chance"], "changed": [0, 1], "tone": "crit", "note": "the sharp softmax"}], "t": "diagram", "id": "dg-7_2-02-1"},


    { t: "code", lang: "python", title: "InfoNCE, symmetric", code:
"def clip_loss(image_embeddings, text_embeddings, temperature=0.07):\n    image_embeddings = F.normalize(image_embeddings, dim=-1)\n    text_embeddings  = F.normalize(text_embeddings,  dim=-1)\n\n    logits = image_embeddings @ text_embeddings.T / temperature\n\n    # the diagonal is the positive pairs: image i matches text i\n    labels = torch.arange(len(logits))\n\n    loss_i2t = F.cross_entropy(logits,   labels)   # image finds its caption\n    loss_t2i = F.cross_entropy(logits.T, labels)   # caption finds its image\n    return (loss_i2t + loss_t2i) / 2",
      caption: "Normalising first makes the dot product a cosine. The loss is **symmetric** — the model must solve the problem in both directions, which stops it degenerating into a one-way lookup." },

    { t: "out", text:
"batch 8, dim 16, temperature 0.07\n\n  PERFECT alignment (image_i identical to text_i):  loss 0.000284\n  RANDOM (no relationship at all):                  loss 6.0767\n\n  chance level = ln(batch) = ln(8) = 2.0794" },

    { t: "callout", kind: "insight", title: "Random is worse than chance, for the same reason as lesson 6.6",
      body: [{ t: "p", text: "A random model scores **6.0767** where uniform guessing would score **2.0794** — nearly three times worse. This is the same phenomenon the untrained translation model showed: random embeddings at temperature 0.07 produce *confident* and arbitrary similarity judgements, and cross-entropy punishes confident wrongness far harder than uncertainty. It matters practically, because it means a CLIP loss above `ln(batch)` early in training is normal rather than alarming — the model has to get *past* confidently wrong before it reaches uncertain, and only then to correct." }] },

    { t: "h2", n: "03", text: "Why batch size is the difficulty", id: "batch" },

    {"kind": "trace", "title": "The batch is the negative set, so batch size is the difficulty of the task", "caption": "**Every other item in the batch is a negative, so a batch of 8 asks the model to pick the right caption out of 8 and a batch of 32,768 asks it to pick out of 32,768.** Which makes batch size a **capability** parameter rather than a throughput one: `ln(batch)` is the chance-level loss, and **it rises from 2.08 to 10.40 across this table.** That is why CLIP trained at 32,768 and why SigLIP's sigmoid loss — **which scores each pair independently — was a real architectural contribution rather than a tweak.**", "left": "batch", "codeW": 130, "vars": ["ln(batch) = chance loss", "negatives per positive"], "steps": [{"code": "8", "state": ["2.0794", "7"], "tone": "crit"}, {"code": "256", "state": ["5.5452", "255"], "changed": [0, 1], "tone": "warn"}, {"code": "1,024", "state": ["6.9315", "1,023"], "changed": [0, 1], "tone": "good"}, {"code": "32,768", "state": ["10.3972", "32,767"], "changed": [0, 1], "tone": "violet", "note": "CLIP's batch"}], "t": "diagram", "id": "dg-7_2-03-2"},


    { t: "out", text:
"batch       ln(batch)     negatives per positive\n8              2.0794              7\n32             3.4657             31\n256            5.5452            255\n1,024          6.9315          1,023\n32,768        10.3972         32,767" },

    { t: "callout", kind: "crit", title: "Each row is an N-way classification, and N is the batch size",
      body: [{ t: "p", text: "The negatives come *only* from the batch — there is no negative sampling step, the other items in the batch simply are the negatives. So the batch size directly sets the difficulty: CLIP trained at **32,768**, meaning every correct pair had to beat **32,767** competitors. That is why contrastive pretraining is so infrastructure-heavy, and it is a genuine barrier rather than a tuning preference. It is also exactly what **SigLIP** changed: replacing the softmax with a sigmoid makes each pair an independent binary decision, so the loss no longer couples across the batch and large batches stop being a requirement." }] },

    { t: "h2", n: "04", text: "Temperature", id: "temperature" },

    {"kind": "trace", "title": "At T=0.01 the loss on random data is 40.62", "caption": "**At `T = 1.00` the loss on random data is 2.1244 — essentially the chance level of 2.0794, because the softmax is flat enough that being wrong costs little. At `T = 0.01` it is 40.62, because a very sharp softmax converts a slightly wrong ranking into a near-certain wrong answer.** CLIP initialises at **0.07 and learns the value from there**, which is 5.9's `logit_scale` saturating at 100.00 — **so the model chose to be sharp, and the loss landscape at low temperature is why that choice has to be learned rather than set.**", "left": "temperature", "codeW": 140, "vars": ["loss on random data", "mean diagonal p"], "steps": [{"code": "0.01", "state": ["40.6181", "0.2395"], "tone": "crit"}, {"code": "0.07", "state": ["5.0752", "0.0914"], "changed": [0, 1], "tone": "violet", "note": "CLIP's init"}, {"code": "0.20", "state": ["3.4726", "0.0508"], "changed": [0, 1], "tone": "good"}, {"code": "1.00", "state": ["2.1244", "0.1223"], "changed": [0, 1], "tone": "warn", "note": "chance is 2.0794"}], "t": "diagram", "id": "dg-7_2-04-3"},


    { t: "out", text:
"temperature   loss (random data)   mean diagonal probability\n0.01              40.6181                 0.2395\n0.07               5.0752                 0.0914\n0.20               3.4726                 0.0508\n1.00               2.1244                 0.1223" },

    { t: "p", text: "At `T = 1.00` the loss on random data is 2.1244, essentially the chance level of 2.0794 — the softmax is flat enough that being wrong costs little. At `T = 0.01` it is **40.62**, because a very sharp softmax converts a slightly wrong ranking into a near-certain wrong answer. CLIP initialises at 0.07 and *learns* the value from there, and lesson 5.9 found the trained checkpoint had pushed it to its clamp of 100 in the `exp(logit_scale)` parameterisation — the model wanted sharper discrimination than it was allowed." },

    { t: "h2", n: "05", text: "Zero-shot classification, for real", id: "zeroshot" },

    {"kind": "trace", "title": "Three of four right, with no training, and the failure is the interesting one", "caption": "Four programmatically generated images and four captions, **no training, no labels, no fine-tuning — and the three shapes are classified at 0.9950, 0.9998 and 1.0000.** The failure is the block of horizontal bars standing in for printed text: **CLIP calls it a square at 0.7000.** Which is a reasonable mistake — **a filled rectangular region of bars does look like a square to a patch-based encoder** — and a useful reminder that these confidences are **not calibrated**: 0.70 on a wrong answer and 1.00 on a right one are both produced by the same sharp temperature.", "left": "image", "codeW": 150, "vars": ["top caption", "probability", "correct?"], "steps": [{"code": "red circle", "state": ["circle", "0.9950", "yes"], "tone": "good"}, {"code": "blue square", "state": ["square", "0.9998", "yes"], "changed": [0, 1], "tone": "good"}, {"code": "green triangle", "state": ["triangle", "1.0000", "yes"], "changed": [0, 1], "tone": "good"}, {"code": "black bars (as text)", "state": ["square", "0.7000", "NO"], "changed": [0, 1, 2], "tone": "crit"}], "t": "diagram", "id": "dg-7_2-05-4"},


    { t: "p", text: "Four images generated programmatically — a red circle, a blue square, a green triangle and a block of horizontal black bars standing in for printed text — and four candidate captions. No training, no labels, no fine-tuning." },

    { t: "out", text:
"image              circle      square      triangle    text\nred circle         0.9950      0.0040      0.0009      0.0001\nblue square        0.0000      0.9998      0.0002      0.0000\ngreen triangle     0.0000      0.0000      1.0000      0.0000\nblack text         0.0279      0.7000      0.1877      0.0844\n\ncorrect: 3/4" },

    { t: "callout", kind: "insight", title: "Three near-certain, and one honest failure",
      body: [{ t: "p", text: "The shapes are recognised at 0.9950, 0.9998 and 1.0000 — from images synthesised in ten lines of PIL that resemble nothing in CLIP's training distribution. That is genuine zero-shot transfer: alignment learned from 400M web captions generalising to novel input. The fourth case failed, and it is worth being precise about why rather than calling it a CLIP weakness. My \"printed text\" was a stack of horizontal black bars. It **does** look more like a rectangle than like typography, so 0.7000 on *square* is arguably the correct answer to the image I actually produced. The lesson is about evaluation as much as about CLIP: a synthetic test probe is only as good as its resemblance to the thing it claims to represent." }] },

    { t: "h2", n: "06", text: "Prompt sensitivity", id: "prompts" },

    {"kind": "trace", "title": "The same image, 0.9951 down to 0.7440, on phrasing alone", "caption": "**Four phrasings of the same concept against the same image: `“a photo of a red circle”` 0.9951, `“a red circle”` 0.9874, `“red circle”` 0.9811, `“circle”` 0.7440.** So the prompt template is worth a quarter of the score here, **which is why `“a photo of a {}”` is the standard CLIP template and why published zero-shot numbers use prompt ensembles.** The mechanism is simple: **CLIP was trained on captions, and a bare noun is not a caption** — so the text tower sees it as out of distribution.", "left": "phrasing", "codeW": 200, "vars": ["similarity", "lost"], "steps": [{"code": "'a photo of a red circle'", "state": ["0.9951", "-"], "tone": "good"}, {"code": "'a red circle'", "state": ["0.9874", "-0.008"], "changed": [0, 1], "tone": "good"}, {"code": "'red circle'", "state": ["0.9811", "-0.014"], "changed": [0, 1], "tone": "warn"}, {"code": "'circle'", "state": ["0.7440", "-0.251"], "changed": [0, 1], "tone": "crit", "note": "not a caption"}], "t": "diagram", "id": "dg-7_2-06-5"},


    { t: "out", text:
"same image (red circle), different candidate phrasings\n\n  \"a photo of a red circle\"   ->  0.9951\n  \"a red circle\"              ->  0.9874\n  \"red circle\"                ->  0.9811\n  \"circle\"                    ->  0.7440" },

    { t: "callout", kind: "insight", title: "The template is worth 25 points on the bare label",
      body: [{ t: "p", text: "Dropping from `\"a photo of a red circle\"` to `\"circle\"` costs **0.9951 to 0.7440**. The reason is distributional: CLIP's text encoder was trained on web alt-text, which overwhelmingly looks like *\"a photo of a golden retriever\"* rather than *\"golden retriever\"*. A bare label is out of distribution for the text tower. This is why CLIP's own paper reports prompt-ensembling results — averaging embeddings over 80 templates — and it generalises: whenever a model has a training distribution you can name, matching it at inference is free accuracy. It is the same principle as train-serve skew in lesson 3.5, applied deliberately rather than avoided." }] },

    { t: "h2", n: "07", text: "Variants, and what each fixed", id: "variants" },

    {"kind": "trace", "title": "Five variants, and each one names a specific defect of the original", "caption": "Read the right-hand column as a list of CLIP's problems. **OpenCLIP exists because the original training data was never released — a reproducibility failure, not a technical one. SigLIP's sigmoid loss removes the giant-batch requirement §03 measured.** EVA-CLIP attacks fine detail with a better ViT and higher resolution. **And MetaCLIP and ALIGN are the two sides of one argument: curated metadata against 1.8B noisy pairs — data quality against raw scale.**", "left": "model", "codeW": 140, "vars": ["key change", "the defect it addresses"], "steps": [{"code": "OpenCLIP", "state": ["open training on LAION", "the data was never released"], "tone": "good"}, {"code": "SigLIP", "state": ["sigmoid instead of softmax", "the giant-batch requirement"], "changed": [0, 1], "tone": "violet"}, {"code": "EVA-CLIP", "state": ["better ViT, higher resolution", "fine detail"], "changed": [0, 1], "tone": "good"}, {"code": "MetaCLIP", "state": ["curated data with metadata", "data quality over scale"], "changed": [0, 1], "tone": "good"}, {"code": "ALIGN", "state": ["1.8B noisy pairs", "the opposite claim - scale wins"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-7_2-07-6"},


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

    { t: "callout", kind: "trap", title: "Trusting zero-shot labels from one prompt wording",

      body: [

        { t: "p", text: "CLIP's zero-shot accuracy changes with the wording of the label prompts, so a single template can mislead." },

        { t: "p", text: "Choose prompts on labelled validation data and average over several templates." }

      ] },


    { t: "exercise", kind: "Challenge", title: "Probe the alignment", difficulty: "core", minutes: 40,
      requirements: [
        "Implement the contrastive loss and verify it approaches 0 on perfectly aligned data and exceeds ln(batch) on random data.",
        "Sweep batch size from 8 to 1024 on the same data and observe how the loss scales.",
        "Run zero-shot classification on your own images and find a category where it fails.",
        "Compare four prompt templates on the same image and measure the spread.",
        "Test CLIP on counting — three objects against five — and on spatial relations, and record how far it gets."
      ],
      hint: "The loss is the average of two cross-entropies over the same similarity matrix: rows (image → text) and columns (text → image), with the diagonal as the correct class in both.",
      solution: {
        lang: "python", title: "probe_alignment.py",
        code: `"""Synthetic test images with known content: counts, colours, shapes and positions are exact by construction."""
import random
from PIL import Image, ImageDraw, ImageFont
COLOURS = {"red": (220, 30, 30), "blue": (30, 60, 220), "green": (30, 160, 60), "yellow": (240, 200, 20)}

def scene(objects, size=224, bg=(245, 245, 245)):
    """objects: list of (shape, colour, (cx, cy)) with centres in 0-1 coordinates."""
    img = Image.new("RGB", (size, size), bg); d = ImageDraw.Draw(img); r = size // 10
    for shape, colour, (cx, cy) in objects:
        x, y = int(cx * size), int(cy * size); box = [x - r, y - r, x + r, y + r]
        fill = COLOURS[colour]
        if shape == "circle": d.ellipse(box, fill=fill)
        elif shape == "square": d.rectangle(box, fill=fill)
        else: d.polygon([(x, y - r), (x - r, y + r), (x + r, y + r)], fill=fill)
    return img

def count_scene(n, shape="circle", colour="red", seed=0):
    rng = random.Random(seed); spots = [(0.2 + 0.3 * (i % 3), 0.2 + 0.3 * (i // 3)) for i in range(9)]
    rng.shuffle(spots)
    return scene([(shape, colour, spots[i]) for i in range(n)])

def text_image(text, size=(448, 120)):
    img = Image.new("RGB", size, "white"); d = ImageDraw.Draw(img)
    try: font = ImageFont.truetype("arial.ttf", 40)
    except OSError: font = ImageFont.load_default()
    d.text((20, 35), text, fill="black", font=font)
    return img

# ---- the exercise ----
import os, math
os.environ["HF_HUB_OFFLINE"] = "1"
import torch, torch.nn.functional as F
from transformers import CLIPModel, CLIPProcessor
torch.manual_seed(0)

# 1-2. The symmetric contrastive loss: aligned, random, and across batch sizes.
def clip_loss(img, txt, t=0.07):
    img, txt = F.normalize(img, dim=-1), F.normalize(txt, dim=-1)
    logits = img @ txt.T / t; y = torch.arange(len(img))
    return (F.cross_entropy(logits, y) + F.cross_entropy(logits.T, y)) / 2
print("batch   aligned loss   random loss   ln(batch)")
for B in (8, 64, 256, 1024):
    e = torch.randn(B, 512)
    print(f"{B:5}   {clip_loss(e, e):12.6f}   {clip_loss(torch.randn(B, 512), torch.randn(B, 512)):11.3f}   {math.log(B):9.3f}")

clip = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").eval(); proc = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
def probs(img, caps):
    with torch.no_grad(): return clip(**proc(text=caps, images=img, return_tensors="pt", padding=True)).logits_per_image.softmax(-1)[0]

# 3. Zero-shot on synthetic images: colour and shape.
labels = [f"a {c} {s}" for c in ("red", "blue", "green") for s in ("circle", "square", "triangle")]
correct = 0
for c in ("red", "blue", "green"):
    for s in ("circle", "square", "triangle"):
        p = probs(scene([(s, c, (0.5, 0.5))]), [f"a photo of {l}" for l in labels])
        guess = labels[int(p.argmax())]; correct += guess == f"a {c} {s}"
        if guess != f"a {c} {s}": print(f"  zero-shot miss: {c} {s} -> {guess}")
print(f"zero-shot colour+shape: {correct}/9")

# 4. Prompt templates on one image.
img = scene([("circle", "red", (0.5, 0.5))])
for tpl in ("{}", "a photo of {}", "a drawing of {}", "an icon of {}"):
    p = probs(img, [tpl.format(l) for l in labels]); print(f"template {tpl!r:20} P(red circle) = {p[0]:.3f}")

# 5. Counting and spatial relations.
counts = ["one red circle", "two red circles", "three red circles", "four red circles", "five red circles"]
for n in (3, 5):
    p = probs(count_scene(n), [f"a picture of {c}" for c in counts]); print(f"{n} circles -> CLIP picks {counts[int(p.argmax())]!r} ({p.max():.2f})")
p = probs(scene([("circle", "red", (0.5, 0.2)), ("square", "blue", (0.5, 0.8))]),
          ["a red circle above a blue square", "a red circle below a blue square"])
print(f"red circle above blue square: P(above) {p[0]:.3f}, P(below) {p[1]:.3f}")
`,
        out: `batch   aligned loss   random loss   ln(batch)
    8       0.000006         2.036       2.079
   64       0.000049         4.305       4.159
  256       0.000195         5.710       5.545
 1024       0.000780         7.141       6.931
  zero-shot miss: red square -> a red triangle
zero-shot colour+shape: 8/9
template '{}'                 P(red circle) = 0.782
template 'a photo of {}'      P(red circle) = 0.872
template 'a drawing of {}'    P(red circle) = 0.912
template 'an icon of {}'      P(red circle) = 0.863
3 circles -> CLIP picks 'three red circles' (0.31)
5 circles -> CLIP picks 'five red circles' (0.39)
red circle above blue square: P(above) 0.631, P(below) 0.369`,
        notes: [
          { t: "p", text: "Identical embeddings gave a loss near zero, and random ones gave slightly above ln(batch), as expected for a near-uniform softmax over the batch. The aligned loss rises slowly with batch size (6e-6 to 8e-4), because a larger batch contains more near-duplicates to confuse with. That is also why large batches make the task harder and the learned representation better." },
          { t: "p", text: "Zero-shot colour-and-shape classification got 8 of 9, confusing a red square with a red triangle. The prompt template moved P(red circle) from 0.78 bare to 0.91 with 'a drawing of', a 13-point spread on an image the model already gets right. Prompt engineering for zero-shot CLIP is real tuning, not decoration." },
          { t: "p", text: "On these clean images CLIP picked the right count for 3 and 5 circles and the right vertical relation. The confidences were low (0.31–0.63), and lesson 7.8 shows the same model failing most counts when the template changes. Treat a pass on one template as one data point." },
          { t: "p", text: "The images are drawn with PIL so their content is known exactly: counts, colours and positions are ground truth, which makes failures unambiguous. Synthetic flat shapes are easier than photographs in some ways and harder in others, so repeat the probes on your own images." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: zero-shot labels that changed with the wording",
      body: [
        { t: "p", text: "**Symptom.** A CLIP-based image tagger's accuracy changed by several points when the label prompts were reworded." },
        { t: "p", text: "**Mechanism.** Zero-shot classification compares the image with each prompt's embedding, so prompt wording changes the scores." },
        { t: "p", text: "**Fix.** Prompts are chosen on a labelled validation set and an ensemble of prompt templates is averaged." }
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
      options: ["For gradient stability", "Negatives come only from the batch", "To fit the learning-rate schedule", "To parallelise the two towers"],
      answer: 1,
      why: "Each row of the similarity matrix is an N-way classification where N is the batch size. CLIP trained at 32,768, so every correct pair beat 32,767 negatives. SigLIP addressed exactly this by replacing the softmax with a sigmoid, making each pair an independent binary decision so the loss no longer couples across the batch." },
    { stem: "A CLIP model early in training has loss above ln(batch_size). Is that a problem?",
      options: ["Yes, worse than random means it is broken", "No: confident wrong guesses cost more", "Yes, the temperature must be wrong", "It is impossible to exceed ln(batch)"],
      answer: 1,
      why: "Measured: random data at temperature 0.07 gave 6.0767 against a chance level of 2.0794. The model must get past confidently wrong before reaching uncertain, and only then to correct. It is the same phenomenon lesson 6.6 found in an untrained translation model, whose loss was 0.92 nats worse than uniform guessing." },
    { stem: "Why does 'a photo of a red circle' beat bare 'circle' by 0.9951 to 0.7440?",
      options: ["Longer prompts always score higher", "Bare labels are unlike its alt-text", "'photo' matches the image features", "Bare labels tokenise poorly"],
      answer: 1,
      why: "Alt-text overwhelmingly reads 'a photo of a golden retriever' rather than 'golden retriever'. Matching the training distribution at inference is free accuracy, which is why CLIP's paper reports prompt-ensembling over 80 templates. It is train-serve alignment exploited deliberately rather than avoided." },
    { stem: "Which of these is CLIP structurally weak at?",
      options: ["Recognising photographed objects", "Counting and spatial relations", "Distinguishing between colours", "Recognising whole scenes"],
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
