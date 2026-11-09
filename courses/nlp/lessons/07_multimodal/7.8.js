/* ============================================================================
   LESSON 7.8 — Multimodal Evaluation
   CLIPScore is measured against count, colour and shape errors — and it
   rates "one blue square" HIGHER than the correct "two blue squares" (§03)
   (n71.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.8",

  lede: "**On an image containing exactly two blue squares, CLIPScore rates the caption \"one blue square\" at 0.6741 and the correct \"two blue squares\" at 0.6717.** The wrong count scores higher. Colour errors it catches (−0.0595), shape errors it catches (−0.0482), an unrelated caption it catches decisively (−0.1635) — but counting, the single most checkable property of a caption, it gets backwards. This is lesson 3.4's finding repeating in a new modality: the metric inherits the blind spots of the model underneath it.",

  objectives: [
    "Read FID, IS and LPIPS and say what each actually measures",
    "Measure CLIPScore against specific caption errors",
    "Explain why CLIPScore inherits CLIP's weaknesses",
    "Interpret VQA soft accuracy and why it is defined that way",
    "Build an evaluation suite that covers what single metrics miss"
  ],

  prerequisites: ["7.7", "3.4"],

  blocks: [

    { t: "h2", n: "01", text: "Image generation metrics", id: "generation" },

    {"kind": "trace", "title": "Three metrics, and two of them score a distribution rather than an image", "caption": "**FID and IS both measure quality *and* diversity together, over a set — so neither can score a single image, and a model that produces one perfect picture every time scores badly on both.** FID is a Fréchet distance between real and generated feature distributions in Inception-v3 space, which means **it inherits whatever Inception-v3 is sensitive to.** LPIPS is the odd one out: **a learned perceptual distance between two specific images, so it needs a reference and answers a different question.**", "left": "metric", "codeW": 130, "vars": ["measures", "direction", "per image?"], "steps": [{"code": "FID", "state": ["quality + diversity", "lower, 0 = identical", "no - a set"], "tone": "good"}, {"code": "IS", "state": ["quality + diversity", "higher", "no - a set"], "changed": [0, 1, 2], "tone": "good"}, {"code": "LPIPS", "state": ["perceptual similarity of two", "lower = more similar", "yes, with a reference"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-7_8-01-0"},


    { t: "table",
      head: ["Metric", "Measures", "Direction", "How"],
      rows: [
        ["FID", "Quality and diversity together", "Lower is better, 0 = identical", "Fréchet distance between real and generated feature distributions in Inception-v3 space"],
        ["IS", "Quality and diversity", "Higher is better", "exp of the mean KL between per-image class distribution and the marginal"],
        ["LPIPS", "Perceptual similarity of two images", "Lower is more similar", "Learned distance over deep features"]
      ] },

    { t: "callout", kind: "insight", title: "FID compares distributions, not images",
      body: [{ t: "p", text: "This is the point people most often miss. FID does not score an individual image — it embeds a *set* of real images and a *set* of generated ones through Inception-v3, fits a Gaussian to each, and measures the distance between those Gaussians. So it is undefined for one image, it needs thousands on both sides to be stable, and it is sensitive to the sample size you used, which is why FID numbers are only comparable when computed identically. It also inherits Inception-v3's feature space entirely: a difference Inception was never trained to notice is a difference FID cannot see." }] },

    { t: "callout", kind: "trap", title: "FID rewards matching the training distribution",
      body: [{ t: "p", text: "A model that reproduces the real distribution exactly scores 0 — including reproducing its biases, its artefacts and its typical compositions. A model that generates something genuinely novel but plausible is *penalised*, because novelty moves it away from the reference distribution. So FID measures *distributional fidelity*, not quality and certainly not usefulness, and optimising for it directly pushes toward the average of the training set. It is the same shape of problem as ROUGE rewarding copying in lesson 3.4." }] },

    { t: "h2", n: "02", text: "Vision-language metrics", id: "vl" },

    {"kind": "trace", "title": "One of these needs no reference caption, which is why it gets used", "caption": "**CLIPScore's appeal is that it is reference-free — you need only the image and the candidate, not human captions to compare against — which makes it usable at scale where CIDEr and SPICE are not.** The others all need references: **CIDEr wants several, SPICE parses both into scene graphs, and BLEU/ROUGE/METEOR are 3.4's text metrics with all their limits.** The question §03 answers is whether reference-free also means useful.", "left": "metric", "codeW": 140, "vars": ["what it does", "needs a reference?"], "steps": [{"code": "CLIPScore", "state": ["scaled CLIP cosine", "NO"], "tone": "violet"}, {"code": "CIDEr", "state": ["TF-IDF weighted n-grams", "several"], "changed": [0, 1], "tone": "good"}, {"code": "SPICE", "state": ["scene graphs: objects, relations", "yes"], "changed": [0, 1], "tone": "good"}, {"code": "BLEU / ROUGE / METEOR", "state": ["3.4's text metrics", "yes"], "changed": [0, 1], "tone": "warn"}, {"code": "VQA accuracy", "state": ["min(humans giving it / 3, 1)", "ten humans"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-7_8-02-1"},


    { t: "table",
      head: ["Metric", "Task", "What it does"],
      rows: [
        ["CLIPScore", "Text-image alignment", "Scaled cosine between CLIP text and image embeddings — needs no reference caption"],
        ["CIDEr", "Captioning", "TF-IDF weighted n-gram overlap against multiple references"],
        ["SPICE", "Captioning", "Parses both into scene graphs and compares objects, attributes and relations"],
        ["BLEU / ROUGE / METEOR", "Captioning", "The text metrics from lesson 3.4, with all their limits"],
        ["VQA accuracy", "Visual QA", "min(humans giving that answer / 3, 1)"]
      ] },

    { t: "p", text: "CLIPScore's appeal is that it is **reference-free** — you do not need human captions to compare against, only the image and the candidate. That makes it usable at scale where CIDEr and SPICE are not. The question is whether it measures what you need." },

    { t: "h2", n: "03", text: "CLIPScore, tested", id: "clipscore" },

    {"kind": "trace", "title": "The wrong count scores higher than the right one", "caption": "The image has **exactly two blue squares**, and the measurement is damning: **`'one blue square'` scores 0.6741 against the correct `'two blue squares'` at 0.6717 — the wrong caption wins by +0.0023.** Meanwhile wrong colour costs −0.0595 and wrong shape −0.0482, **so CLIPScore sees colour and shape and is blind to number.** And the longest caption scores highest at **0.7028**: **length and specificity inflate it somewhat independently of accuracy**, which matters before comparing captioners with different output lengths.", "left": "caption", "codeW": 210, "vars": ["CLIPScore", "gap from correct"], "steps": [{"code": "'two blue squares' (correct)", "state": ["0.6717", "-"], "tone": "accent"}, {"code": "'one blue square'", "state": ["0.6741", "+0.0023 - HIGHER"], "changed": [0, 1], "tone": "crit"}, {"code": "'three blue squares'", "state": ["0.6708", "-0.0009"], "changed": [0, 1], "tone": "crit", "note": "count is invisible"}, {"code": "'two red squares'", "state": ["0.6122", "-0.0595"], "changed": [0, 1], "tone": "good"}, {"code": "'...on the left and...on the right'", "state": ["0.7028", "+0.0311 - longest"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-7_8-03-2"},


    { t: "out", text:
"image: exactly TWO BLUE SQUARES\n\ncaption                                                    CLIPScore\ntwo blue squares                                            0.6717\nthree blue squares                                          0.6708\none blue square                                             0.6741\ntwo red squares                                             0.6122\ntwo blue circles                                            0.6235\na blue square on the left and a blue square on the right    0.7028\na photograph of a cat                                       0.5082" },

    { t: "out", text:
"gap against the correct caption\n\n  wrong COUNT (three)      -0.0009\n  wrong COUNT (one)        +0.0023      <- the wrong caption scores HIGHER\n  wrong COLOUR             -0.0595\n  wrong SHAPE              -0.0482\n  completely unrelated     -0.1635" },

    { t: "callout", kind: "crit", title: "It cannot count, and it is not merely indifferent — it is wrong",
      body: [{ t: "p", text: "*\"one blue square\"* beats the correct *\"two blue squares\"* by **+0.0023** on an image with two squares. *\"three blue squares\"* is within 0.0009, which is noise. Meanwhile colour and shape errors are separated by 0.05 and an unrelated caption by 0.16, so the metric is not broken in general — it is specifically blind to count. The reason is exactly lesson 7.2's finding: CLIPScore *is* a CLIP cosine, and CLIP encodes counting weakly because web alt-text rarely states it. **A metric built on a model inherits that model's blind spots**, which is the same lesson lesson 3.4 reached when BLEU, METEOR and BERTScore all ranked a reversed meaning above a correct paraphrase." }] },

    { t: "p", text: "Note also that the *longest* caption scores highest at 0.7028 — the spatially-explicit one. Length and specificity inflate CLIPScore somewhat independently of accuracy, which is worth knowing before using it to compare captioners that produce different caption lengths." },

    { t: "h2", n: "04", text: "VQA soft accuracy", id: "vqa" },

    {"kind": "flow", "title": "A metric that admits the ground truth is a distribution", "caption": "**Ten annotators answer each question. Three or more giving your answer scores 1.0; one gives 0.33.** The definition exists because **visual questions frequently have several defensible answers — *what colour is the shirt?* on a shirt that is arguably blue or arguably teal — and a binary exact-match metric would call a reasonable answer wrong.** Which is **a more honest framing than most benchmarks use**, and it has a price: **ten human annotations per question, so it exists only for the datasets that paid for it.**", "cols": 3, "nodes": [{"id": "t", "label": "Ten annotators per question", "sub": "not one gold answer", "tone": "accent"}, {"id": "s", "label": "3 or more agree -> 1.0; one -> 0.33", "sub": "min(count/3, 1)", "tone": "good"}, {"id": "w", "label": "Because 'blue' or 'teal' are both defensible", "sub": "exact match would say wrong", "tone": "violet"}, {"id": "h", "label": "So the truth is a distribution", "sub": "stated in the metric", "tone": "violet"}, {"id": "c", "label": "At ten annotations per question", "sub": "only where someone paid", "tone": "warn"}], "edges": [["t", "s"], ["s", "w"], ["w", "h"], ["h", "c"]], "t": "diagram", "id": "dg-7_8-04-3"},


    { t: "math", tex: "\\text{accuracy}(a) = \\min\\!\\left(\\frac{\\#\\{\\text{humans who gave } a\\}}{3},\\; 1\\right)" },

    { t: "callout", kind: "insight", title: "The metric encodes that humans disagree",
      body: [{ t: "p", text: "Ten annotators answer each question. If at least **three** gave your answer you score 1.0; if one did you score 0.33. The definition exists because visual questions frequently have several defensible answers — *what colour is the shirt?* on a shirt that is arguably blue or arguably teal — and a binary exact-match metric would call a reasonable answer wrong. It is an explicit admission that the ground truth is a distribution rather than a value, which is a more honest framing than most benchmarks use. The cost is that it needs ten human annotations per question, so it is expensive and exists only for the datasets that paid for it." }] },

    { t: "h2", n: "05", text: "What to actually measure", id: "suite" },

    { t: "diagram", kind: "compare", title: "Automatic metrics against what they miss",
      columns: [
        { title: "What they do well", tone: "good", items: [
          "Detect regressions on a fixed test set",
          "Compare systems under identical conditions",
          "Run cheaply at scale, every commit",
          "Separate grossly wrong from roughly right",
          "Give a number a pull request can gate on"
        ] },
        { title: "What they miss", tone: "warn", items: [
          "Counting — CLIPScore prefers the wrong count",
          "Spatial relations, for the same reason",
          "Hallucinated objects in a fluent caption",
          "Novelty, which FID actively penalises",
          "Whether the output is useful to anyone"
        ] }
      ] },

    { t: "callout", kind: "tradeoff", title: "The same conclusion as lesson 3.4",
      body: [{ t: "p", text: "Treat these as **regression detectors**, not quality measures. A drop reliably means something changed; a rise does not reliably mean the system improved, because the metric is blind in known directions. So: fix one metric with its exact configuration for CI, add **targeted adversarial cases** covering the known blind spots — for multimodal that means counting, spatial relations and hallucinated objects — and sample for human evaluation. The adversarial cases are cheap and worth the most: you now have one that CLIPScore gets backwards, and it took four generated squares to build." }] },

    { t: "callout", kind: "insight", title: "A better counting check, for free",
      body: [{ t: "p", text: "If you need to evaluate counting, do not ask a metric that cannot count. Generate images with a **known** object count, and score the caption by extracting the number and comparing it directly — an exact check against ground truth you constructed, with no model in the loop. The same applies to spatial relations, colours and any attribute you can control at generation time. Synthetic probes with known answers are the most reliable multimodal evaluation available, and this lesson's four-square image is an example of exactly that." }] },

    { t: "code", lang: "python", title: "FID and CLIPScore, as library calls",
      code: 'from torchmetrics.image.fid import FrechetInceptionDistance\nfrom torchmetrics.multimodal.clip_score import CLIPScore\n\nfid = FrechetInceptionDistance(feature=2048)\nfid.update(real_uint8, real=True)      # accumulate over MANY images\nfid.update(fake_uint8, real=False)\nfid.compute()\n\nclip = CLIPScore(model_name_or_path="openai/clip-vit-base-patch16")\nclip(image_uint8, "two blue squares")',
      caption: "`fid.update` twice, then `compute` once — the API itself says it is a set-level metric." },
    { t: "p", text: "The shape of the FID interface is the thing to notice: **`update` accumulates feature statistics and `compute` returns a single number, so there is no per-image FID to report** — §01’s point enforced by the library. In practice it needs **thousands** of images to be stable, and **a FID computed on 100 images is noise with a plausible-looking value.** `feature=2048` selects the Inception-v3 pool layer, and changing it changes the number, so **two FIDs are comparable only at the same feature setting.**" },
    { t: "exercise", kind: "Challenge", title: "Test the metrics", difficulty: "core", minutes: 40,
      requirements: [
        "Compute CLIPScore for a correct caption and a wrong-count variant on your own images, and record the gap.",
        "Check whether CLIPScore rises with caption length independently of accuracy.",
        "Compute FID on two samples drawn from the same real dataset and see how far from 0 it lands.",
        "Vary the FID sample size from 500 to 10,000 and note how much the number moves.",
        "Build ten synthetic probes with known counts and positions, and use them as a regression suite."
      ],
      hint: "CLIPScore is 2.5 × max(cosine(image, caption), 0). Compare a correct and a wrong caption on the same image: if the gap is near zero, the metric cannot see the property you changed.",
      solution: {
        lang: "python", title: "test_metrics.py",
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
import os
os.environ["HF_HUB_OFFLINE"] = "1"
import numpy as np, torch, torch.nn.functional as F
from scipy import linalg
from transformers import CLIPModel, CLIPProcessor
clip = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").eval(); cp = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
feat = lambda x: getattr(x, "pooler_output", x)

def clipscore(img, caption):
    with torch.no_grad():
        i = F.normalize(feat(clip.get_image_features(**cp(images=img, return_tensors="pt"))), dim=-1)
        t = F.normalize(feat(clip.get_text_features(**cp(text=[caption], return_tensors="pt", padding=True))), dim=-1)
    return 2.5 * max((i @ t.T).item(), 0)

# 1. Correct count against a wrong count.
for n, right, wrong in ((3, "three red circles", "five red circles"), (2, "two red circles", "four red circles")):
    a, b = clipscore(count_scene(n), right), clipscore(count_scene(n), wrong)
    print(f"{n} circles: CLIPScore correct {a:.4f}, wrong count {b:.4f}, gap {a - b:+.4f}")

# 2. Length without accuracy.
img = scene([("circle", "red", (0.5, 0.5))])
for c in ("a red circle", "a red circle on a white background", "a red circle on a white background, centred, flat colour, simple vector graphic"):
    print(f"  {clipscore(img, c):.4f}  {c}")

# 3-4. FID between two samples of the same distribution, and its dependence on sample size.
def fid(a, b):
    mu1, mu2 = a.mean(0), b.mean(0); s1, s2 = np.cov(a, rowvar=False), np.cov(b, rowvar=False)
    covmean = linalg.sqrtm(s1 @ s2).real
    return float(((mu1 - mu2) ** 2).sum() + np.trace(s1 + s2 - 2 * covmean))
rng = np.random.default_rng(0); d = 64
print("\\nsamples   FID(same distribution, two draws)")
for n in (500, 1000, 2000, 5000, 10000):
    print(f"{n:7}   {fid(rng.standard_normal((n, d)), rng.standard_normal((n, d))):.3f}")

# 5. A regression suite of synthetic probes with known answers.
COUNT = ["one red circle", "two red circles", "three red circles", "four red circles", "five red circles"]
probes = [(count_scene(k), COUNT[k - 1], COUNT) for k in range(1, 6)]
probes += [(scene([("circle", "red", (0.5, 0.2)), ("square", "blue", (0.5, 0.8))]), "a red circle above a blue square",
            ["a red circle above a blue square", "a red circle below a blue square"]),
           (scene([("square", "red", (0.2, 0.5)), ("circle", "blue", (0.8, 0.5))]), "a red square left of a blue circle",
            ["a red square left of a blue circle", "a red square right of a blue circle"])]
passed = 0
for img, truth, options in probes:
    with torch.no_grad(): p = clip(**cp(text=options, images=img, return_tensors="pt", padding=True)).logits_per_image[0]
    ok = options[int(p.argmax())] == truth; passed += ok
    if not ok: print(f"  FAIL {truth!r}: model chose {options[int(p.argmax())]!r}")
print(f"probe suite: {passed}/{len(probes)} pass")
`,
        out: `3 circles: CLIPScore correct 0.7774, wrong count 0.7776, gap -0.0002
2 circles: CLIPScore correct 0.7748, wrong count 0.7933, gap -0.0185
  0.7521  a red circle
  0.8171  a red circle on a white background
  0.8167  a red circle on a white background, centred, flat colour, simple vector graphic

samples   FID(same distribution, two draws)
    500   4.438
   1000   2.181
   2000   1.125
   5000   0.449
  10000   0.216
  FAIL 'two red circles': model chose 'three red circles'
  FAIL 'three red circles': model chose 'four red circles'
  FAIL 'four red circles': model chose 'five red circles'
  FAIL 'a red square left of a blue circle': model chose 'a red square right of a blue circle'
probe suite: 3/7 pass`,
        notes: [
          { t: "p", text: "CLIPScore could not tell the count. For three circles the correct and wrong-count captions scored within 0.0002. For two circles the wrong count ('four') scored higher. Adding true but uninformative detail ('on a white background') raised the score from 0.75 to 0.82. A longer caption that describes more of the image wins regardless of whether it is more accurate about what matters." },
          { t: "p", text: "FID between two samples of the same distribution is not zero: 4.4 at 500 samples, falling to 0.2 at 10,000, roughly in proportion to 1/n. FID numbers are only comparable at a fixed sample size, and a small gap between two models at 1,000 samples may be pure estimation bias. Here it is computed on 64-dimensional Gaussian features to isolate the statistics; real FID uses Inception features." },
          { t: "p", text: "The probe suite passed 3 of 7: one circle, five circles and the vertical relation. It failed counts 2–4 and left/right. In lesson 7.2 the same model counted three and five correctly when every caption was prefixed 'a picture of', and in 7.1 it got left/right right when the caption said 'to the left of'. That sensitivity is the reason to keep a fixed suite: rerun the identical probes on every model or prompt change and treat any flip as a regression." },
          { t: "p", text: "The images are drawn with PIL so their content is known exactly: counts, colours and positions are ground truth, which makes failures unambiguous. Synthetic flat shapes are easier than photographs in some ways and harder in others, so repeat the probes on your own images." }
        ]
      } }
  ],

  takeaways: [
    "FID compares distributions, not images — it needs thousands of samples, is sensitive to sample size, and inherits Inception-v3's feature space.",
    "FID rewards matching the training distribution, so genuine novelty is penalised; it measures distributional fidelity, not quality.",
    "CLIPScore is reference-free, which makes it usable at scale where CIDEr and SPICE are not.",
    "On an image of two blue squares, CLIPScore rated 'one blue square' at 0.6741 ABOVE the correct 'two blue squares' at 0.6717.",
    "It separates colour errors by 0.0595, shape by 0.0482 and unrelated captions by 0.1635 — it is specifically blind to count, not broken generally.",
    "The reason is that CLIPScore IS a CLIP cosine, and CLIP encodes counting weakly because captions rarely state it — a metric inherits its model's blind spots.",
    "The longest caption scored highest at 0.7028, so length and specificity inflate CLIPScore somewhat independently of accuracy.",
    "VQA soft accuracy is min(humans giving that answer / 3, 1), an explicit admission that ground truth is a distribution.",
    "Treat automatic metrics as regression detectors, and pair them with adversarial probes covering counting, spatial relations and hallucination.",
    "For properties you can control at generation time, synthetic probes with known answers beat any learned metric."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "On an image of two blue squares, CLIPScore rated 'one blue square' higher than 'two blue squares'. Why?",
      options: ["A bug in the implementation", "CLIP encodes counting weakly", "Shorter captions score higher", "The image was ambiguous"],
      answer: 1,
      why: "The gap was +0.0023 for the wrong count, while colour errors were separated by 0.0595 and shape by 0.0482 — so the metric works in general and is specifically blind to count. A metric built on a model inherits that model's blind spots, exactly as lesson 3.4 found for BLEU, METEOR and BERTScore." },
    { stem: "What does FID actually compare?",
      options: ["Two individual images", "Two image distributions", "Caption quality", "Matched-pair similarity"],
      answer: 1,
      why: "It is undefined for a single image, needs thousands on both sides to be stable, and is sensitive to the sample size, so FID numbers only compare when computed identically. It also inherits Inception-v3's features entirely — a difference Inception cannot see is a difference FID cannot measure." },
    { stem: "Why is VQA accuracy defined as min(humans giving that answer / 3, 1)?",
      options: ["To reward confident answers", "Valid answers form a distribution", "To normalise across question types", "To penalise rare answers"],
      answer: 1,
      why: "Ten annotators answer each question; three agreeing with you gives full credit. It exists because 'what colour is the shirt' on an arguably-blue-or-teal shirt has no single right answer, and exact match would call a reasonable response wrong. It is a more honest framing than most benchmarks, at the cost of needing ten human annotations per question." },
    { stem: "How should you evaluate a property like object counting?",
      options: ["CLIPScore with more samples", "Known counts, checked directly", "FID on the generated images", "CIDEr against human captions"],
      answer: 1,
      why: "Do not ask a metric that cannot count. Synthetic probes with controlled attributes give exact ground truth for counting, spatial relations, colours — anything you can set at generation time. They are the most reliable multimodal evaluation available, and this lesson's probe took four generated squares to build." }
  ] },

  interview: { title: "Interview", sub: "Evaluating multimodal systems", questions: [
    { level: "Core", q: "How would you evaluate an image captioning model?",
      strong: "Reference-based metrics for regression, plus targeted probes for what they miss.",
      answer: [{ t: "p", text: "I'd use several things because no single metric covers it. CIDEr and SPICE against human references are the standard reported numbers — CIDEr is TF-IDF weighted n-gram overlap, SPICE parses both captions into scene graphs and compares objects, attributes and relations, which makes it more semantic. CLIPScore is useful because it's reference-free, just a scaled cosine between CLIP's image and text embeddings, so it runs at scale without human captions. But I'd be specific about what CLIPScore misses, because I've measured it. On an image containing exactly two blue squares, it scored 'one blue square' at 0.6741 and the correct 'two blue squares' at 0.6717 — the wrong count scored higher. It caught colour errors by 0.06 and shape errors by 0.05 and an unrelated caption by 0.16, so it isn't broken generally; it's specifically blind to counting, because CLIPScore is a CLIP cosine and CLIP learned from captions that rarely state counts. So the metric inherits the model's blind spots, which is the same conclusion I reached for BLEU and BERTScore on text. My suite would be: one reference metric fixed for CI, CLIPScore for scale, and a set of synthetic probes with known counts, positions and colours where I can check answers exactly against ground truth I constructed." }] },
    { level: "Senior", q: "What does FID measure and what does it miss?",
      strong: "Distributional fidelity to a reference set — which penalises genuine novelty.",
      answer: [{ t: "p", text: "It embeds a set of real images and a set of generated ones through Inception-v3, fits a Gaussian to each feature distribution, and measures the Fréchet distance between them. The first thing to be clear about is that it scores distributions, not images — it's undefined for a single image, needs thousands on each side to be stable, and moves with sample size, so FID numbers are only comparable when computed identically. That alone invalidates a lot of cross-paper comparison. What it misses follows from what it optimises. A model that reproduces the reference distribution exactly scores zero, including reproducing its biases, artefacts and typical compositions. A model generating something genuinely novel but plausible is penalised, because novelty is distance from the reference. So FID measures distributional fidelity, not quality and certainly not usefulness — it's the same shape of problem as ROUGE rewarding a summariser for copying. It also inherits Inception-v3's feature space entirely, so a difference Inception was never trained to notice is invisible to it. I'd use FID as a regression detector across training runs of the same model, never as a cross-paper quality claim, and pair it with human preference evaluation and prompt-adherence checks, which measure things FID structurally cannot." }] },
    { level: "Senior", q: "Your multimodal metrics all look good but users complain. What is happening?",
      strong: "The metrics are blind in known directions — find which failure they cannot see.",
      answer: [{ t: "p", text: "Almost certainly that the failures users care about are in the metrics' blind spots, and those blind spots are known and enumerable rather than mysterious. The pattern I'd check first is counting and spatial relations, because both CLIP-based metrics and CLIP-conditioned generators are weak there for the same reason — web alt-text rarely states them, so the training signal is thin. I measured CLIPScore rating 'one blue square' above 'two blue squares' on an image with two squares, so a captioner that systematically miscounts would show no metric penalty at all. Second, hallucinated objects: a fluent caption mentioning something absent scores well on n-gram overlap and on CLIPScore, because it's distributionally typical. Third, if it's a generative model, FID actively penalises novelty, so a model optimised toward FID drifts toward the average of its training set and produces images that are technically faithful and boring. The diagnostic approach is to collect actual user complaints, categorise them, and then construct a targeted probe for each category — usually synthetic, with known ground truth, which is both cheap and exact. Then check whether your existing metrics move on those probes. If they don't, you've found the gap, and those probes become the regression suite that actually protects the thing users care about." }] }
  ] }
});
