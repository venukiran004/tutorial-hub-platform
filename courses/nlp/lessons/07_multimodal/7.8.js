/* ============================================================================
   LESSON 7.8 — Multimodal Evaluation
   Mirrors 03_Multimodal_AI.md · §11. CLIPScore is measured against count,
   colour and shape errors — and it rates "one blue square" HIGHER than the
   correct "two blue squares" (§03) (scratchpad/nlp/n71.py).
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

    { t: "out", text:
"image: exactly TWO BLUE SQUARES\n\ncaption                                                    CLIPScore\ntwo blue squares                                            0.6717\nthree blue squares                                          0.6708\none blue square                                             0.6741\ntwo red squares                                             0.6122\ntwo blue circles                                            0.6235\na blue square on the left and a blue square on the right    0.7028\na photograph of a cat                                       0.5082" },

    { t: "out", text:
"gap against the correct caption\n\n  wrong COUNT (three)      -0.0009\n  wrong COUNT (one)        +0.0023      <- the wrong caption scores HIGHER\n  wrong COLOUR             -0.0595\n  wrong SHAPE              -0.0482\n  completely unrelated     -0.1635" },

    { t: "callout", kind: "crit", title: "It cannot count, and it is not merely indifferent — it is wrong",
      body: [{ t: "p", text: "*\"one blue square\"* beats the correct *\"two blue squares\"* by **+0.0023** on an image with two squares. *\"three blue squares\"* is within 0.0009, which is noise. Meanwhile colour and shape errors are separated by 0.05 and an unrelated caption by 0.16, so the metric is not broken in general — it is specifically blind to count. The reason is exactly lesson 7.2's finding: CLIPScore *is* a CLIP cosine, and CLIP encodes counting weakly because web alt-text rarely states it. **A metric built on a model inherits that model's blind spots**, which is the same lesson lesson 3.4 reached when BLEU, METEOR and BERTScore all ranked a reversed meaning above a correct paraphrase." }] },

    { t: "p", text: "Note also that the *longest* caption scores highest at 0.7028 — the spatially-explicit one. Length and specificity inflate CLIPScore somewhat independently of accuracy, which is worth knowing before using it to compare captioners that produce different caption lengths." },

    { t: "h2", n: "04", text: "VQA soft accuracy", id: "vqa" },

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

    { t: "exercise", title: "Test the metrics",
      tasks: [
        "Compute CLIPScore for a correct caption and a wrong-count variant on your own images, and record the gap.",
        "Check whether CLIPScore rises with caption length independently of accuracy.",
        "Compute FID on two samples drawn from the same real dataset and see how far from 0 it lands.",
        "Vary the FID sample size from 500 to 10,000 and note how much the number moves.",
        "Build ten synthetic probes with known counts and positions, and use them as a regression suite."
      ] }
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
      options: ["A bug in the implementation", "CLIPScore is a CLIP cosine, and CLIP encodes counting weakly because web alt-text rarely states counts", "Shorter captions always score higher", "The image was ambiguous"],
      answer: 1,
      why: "The gap was +0.0023 for the wrong count, while colour errors were separated by 0.0595 and shape by 0.0482 — so the metric works in general and is specifically blind to count. A metric built on a model inherits that model's blind spots, exactly as lesson 3.4 found for BLEU, METEOR and BERTScore." },
    { stem: "What does FID actually compare?",
      options: ["Two individual images", "Two distributions — sets of real and generated images embedded through Inception-v3 and fitted with Gaussians", "Caption quality", "Perceptual similarity of matched pairs"],
      answer: 1,
      why: "It is undefined for a single image, needs thousands on both sides to be stable, and is sensitive to the sample size, so FID numbers only compare when computed identically. It also inherits Inception-v3's features entirely — a difference Inception cannot see is a difference FID cannot measure." },
    { stem: "Why is VQA accuracy defined as min(humans giving that answer / 3, 1)?",
      options: ["To reward confident answers", "Because visual questions often have several defensible answers, so ground truth is a distribution rather than a single value", "To normalise across question types", "To penalise rare answers"],
      answer: 1,
      why: "Ten annotators answer each question; three agreeing with you gives full credit. It exists because 'what colour is the shirt' on an arguably-blue-or-teal shirt has no single right answer, and exact match would call a reasonable response wrong. It is a more honest framing than most benchmarks, at the cost of needing ten human annotations per question." },
    { stem: "How should you evaluate a property like object counting?",
      options: ["Use CLIPScore with more samples", "Generate images with known counts and check the extracted number directly against ground truth, with no model in the loop", "Use FID", "Use CIDEr against human captions"],
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
