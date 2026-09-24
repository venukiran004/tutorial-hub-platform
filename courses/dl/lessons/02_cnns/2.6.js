/* ============================================================================
   LESSON 2.6 — Data Augmentation
   Mirrors 02_CNNs.md · §7. Transform behaviour, MixUp/CutMix arithmetic and
   TTA are all executed in scratchpad/dl/d26.py.
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "**Augmentation is the cheapest regularisation there is: you tell the model which changes to an image should not change its answer.** Flip a cat and it is still a cat, so a horizontally flipped training image is a free extra example — and a model that has seen both cannot latch onto left-versus-right as a feature. The whole discipline is deciding which transformations preserve your labels, and that answer is different for photographs, X-rays, satellite tiles and pictures of text.",

  objectives: [
    "Build a standard augmentation pipeline and explain what each transform buys",
    "State why augmentation applies to training data only, and verify it",
    "Compute MixUp and CutMix targets, including where lambda comes from",
    "Choose augmentations by asking what preserves the label in your domain",
    "Apply test-time augmentation and describe its cost"
  ],

  prerequisites: ["2.5", "1.9"],

  blocks: [

    { t: "h2", n: "01", text: "The standard pipeline", id: "pipeline" },

    { t: "code", lang: "python", title: "What almost every vision project starts with",
      code: `import torchvision.transforms as T

train_transform = T.Compose([
    T.RandomResizedCrop(224, scale=(0.8, 1.0)),
    T.RandomHorizontalFlip(p=0.5),
    T.RandomRotation(15),
    T.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
    T.RandomAffine(degrees=0, translate=(0.1, 0.1)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406],   # ImageNet stats
                std=[0.229, 0.224, 0.225]),
])

eval_transform = T.Compose([
    T.Resize(256), T.CenterCrop(224), T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])`,
      caption: "Two pipelines, not one. The normalisation is identical in both — lesson 2.5 showed why it must match what the pretrained weights expect." },

    { t: "p", text: "Pushing the *same* image through the training pipeline five times gives five different tensors:" },

    { t: "out", text: `  input (3, 256, 256) -> output (3, 224, 224)
    draw 0: mean 0.4352  std 0.2226  differs from draw 0 by 0.0000
    draw 1: mean 0.4870  std 0.2858  differs from draw 0 by 0.2830
    draw 2: mean 0.3489  std 0.2064  differs from draw 0 by 0.2203
    draw 3: mean 0.5230  std 0.2606  differs from draw 0 by 0.2525
    draw 4: mean 0.4798  std 0.2264  differs from draw 0 by 0.2510` },

    { t: "p", text: "The model never sees the same training image twice. With a 2,000-image dataset and 50 epochs it sees 100,000 distinct inputs, all carrying labels you already have." },

    { t: "h2", n: "02", text: "Training only — and why", id: "train-only" },

    { t: "out", text: `  three eval passes identical: True
  three train passes identical: False` },

    { t: "callout", kind: "trap", title: "Augmenting the validation set makes your metric noise",
      body: [{ t: "p", text: "If validation images are randomly transformed, the same model scores differently on every run and you can no longer tell a real improvement from a lucky draw. Worse, a random crop can cut the object out of the frame entirely, so your validation accuracy understates the model and you tune against a corrupted signal. Evaluation must be deterministic: resize, centre crop, normalise. The one legitimate exception is test-time augmentation, covered below, where you average over several views *deliberately* and apply the same procedure every time." }] },

    { t: "h2", n: "03", text: "Which transforms preserve your label", id: "domain" },

    { t: "p", text: "Every augmentation is an assertion about invariance. A horizontal flip says *left-right orientation carries no class information*, and that assertion is sometimes false:" },

    { t: "out", text: `  original    :
[[0. 1. 2.]
 [3. 4. 5.]]
  hflipped    :
[[2. 1. 0.]
 [5. 4. 3.]]` },

    { t: "table", head: ["Domain", "Safe", "Harmful", "Why"],
      rows: [
        ["Natural photographs", "Flip, crop, rotate ±15°, colour jitter", "Vertical flip", "Gravity is real — upside-down dogs are rare"],
        ["Medical imaging", "Small rotations, flips", "Colour jitter, heavy contrast", "Intensity *is* the diagnostic signal"],
        ["Satellite / aerial", "All rotations, both flips", "—", "There is no canonical orientation from above"],
        ["Text in images", "Perspective, slight blur", "Horizontal flip", "Mirrored text is not text"],
        ["Digits, characters", "Small affine", "Flips, large rotation", "6 becomes 9, b becomes d"]
      ] },

    { t: "callout", kind: "mental", title: "The one question to ask",
      body: [{ t: "p", text: "Before adding any transform, ask: *would a human expert still give this image the same label?* If a radiologist would call a contrast-jittered scan a different finding, that augmentation is teaching your model something false. This question also tells you how far to push a parameter — rotation is safe at 15°, questionable at 45°, and usually wrong at 180° for anything photographed on the ground." }] },

    { t: "h2", n: "04", text: "MixUp and CutMix", id: "mixup" },

    { t: "p", text: "These go further than transforming one image: they blend two, and blend the labels by the same amount." },

    { t: "math", tex: "\\tilde{x} = \\lambda x_i + (1-\\lambda)x_j, \\qquad \\tilde{y} = \\lambda y_i + (1-\\lambda)y_j" },

    { t: "out", text: `  lam=0.9: pixel value 0.90, label [0.900, 0.0, 0.100]  (sums to 1.0)
  lam=0.7: pixel value 0.70, label [0.700, 0.0, 0.300]  (sums to 1.0)
  lam=0.5: pixel value 0.50, label [0.500, 0.0, 0.500]  (sums to 1.0)` },

    { t: "p", text: "The target is now *soft* — a distribution rather than a one-hot vector — which is why MixUp is often described as a strong regulariser: the model is explicitly forbidden from being confident about an ambiguous input. `λ` is drawn from `Beta(α, α)`, and the usual `α = 0.2` has a counter-intuitive shape:" },

    { t: "out", text: `  Beta(0.2,0.2) draws: mean 0.503, fraction below 0.1 or above 0.9 = 0.669` },

    { t: "p", text: "**Two thirds of draws are above 0.9 or below 0.1**, so most batches are barely mixed and only a minority are the dramatic half-and-half blends people picture. `α < 1` puts the mass at the extremes; raising `α` towards 1 makes the mixing uniform and much more aggressive." },

    { t: "diagram", kind: "compare", title: "MixUp against CutMix",
      caption: "Both mix the label by λ. They differ in whether the mixture is per-pixel or spatial.",
      columns: [
        { title: "MixUp", tone: "accent", items: [
          "Every pixel is a weighted blend of both images",
          "Result looks like a double exposure — unnatural",
          "λ drawn from Beta(α, α)",
          "Strong on label smoothing and calibration"
        ] },
        { title: "CutMix", tone: "violet", items: [
          "A rectangular patch of image j is pasted onto image i",
          "Every pixel is a real pixel from a real image",
          "λ is derived from the patch area",
          "Also teaches localisation — the object may be occluded"
        ] }
      ] },

    { t: "out", text: `  target lam=0.9: patch 70x70 = 4,900px of 50,176 -> actual lam 0.9023
  target lam=0.5: patch 158x158 = 24,964px of 50,176 -> actual lam 0.5025` },

    { t: "p", text: "CutMix recomputes `λ` from the *actual* pasted area rather than using the drawn value, because integer patch dimensions never land exactly on the target. Skipping that recomputation is a real bug — it puts the label mix slightly out of step with the image mix on every batch." },

    { t: "h2", n: "05", text: "Test-time augmentation", id: "tta" },

    { t: "p", text: "Predict on several augmented copies of a test image and average. Five views, where one view goes wrong:" },

    { t: "out", text: `  per-view predictions: [2, 1, 2, 2, 2]  (true class 2)
  majority vote        : 2
  averaged logits      : 2  <- averaging fixes the outlier view` },

    { t: "p", text: "Typically worth one to two points of accuracy, at the cost of running inference `k` times. Average the logits or probabilities rather than voting — voting throws away the confidence information that makes a single dissenting view easy to outweigh." },

    { t: "callout", kind: "tradeoff", title: "Start light and let overfitting tell you when to add more",
      body: [{ t: "p", text: "Augmentation trades training fit for generalisation, and it is possible to overdo it: a pipeline so aggressive that the training signal is destroyed gives a model that underfits everything. The practical rule is to start with flip and crop, train, and look at the gap between training and validation accuracy. A large gap means add more augmentation. No gap, with both numbers low, means you already have too much — or a capacity problem that augmentation will not fix." }] },

    { t: "exercise", kind: "practice", title: "Measure what augmentation is worth", difficulty: "intermediate", minutes: 35,
      prompt: "Take a small image dataset (2,000 training images is plenty) and train the same model four ways: no augmentation, flip plus crop, the full standard pipeline, and the full pipeline plus MixUp. For each, record training accuracy, validation accuracy and the gap. Then add test-time augmentation to the best model and measure what it adds. Finally, deliberately apply the training transform to your validation set and observe what happens to the metric's run-to-run variance.",
      hints: [
        "Keep the number of epochs fixed across runs, or you are comparing two things at once.",
        "The train/validation *gap* is the quantity augmentation targets — watch it, not just validation accuracy.",
        "For the last part, evaluate the same fixed model three times and compare the three numbers."
      ],
      solution: {
        notes: [
          { t: "p", text: "The expected pattern is that no-augmentation gives the highest training accuracy and the worst validation accuracy — a large gap, which is overfitting by definition. Each augmentation step should narrow the gap, usually by lowering training accuracy and raising validation accuracy at the same time. MixUp typically lowers training accuracy a lot, because the model is being scored against soft targets it is not allowed to match exactly, so compare validation numbers only." },
          { t: "p", text: "The last part is the one worth doing. Evaluating a *fixed* model on a randomly augmented validation set gives a different number each time, which makes the metric useless for comparing checkpoints — you cannot tell a 0.5-point improvement from noise. That is why the evaluation transform is deterministic, and it is a mistake that survives in real codebases for a surprisingly long time because it degrades the number without ever throwing an error." }
        ]
      } }

  ],

  takeaways: [
    "Augmentation asserts an invariance: apply only transforms under which a human expert would keep the label.",
    "Five draws of the same image through a training pipeline give five different tensors; the eval pipeline gives one, deterministically.",
    "Augmenting validation data makes the metric noisy and can hide the object — it is always a bug.",
    "MixUp blends images and labels by the same λ, producing soft targets.",
    "`Beta(0.2, 0.2)` puts 67 % of its mass outside [0.1, 0.9], so most MixUp batches are only mildly mixed.",
    "CutMix recomputes λ from the actual pasted area so image and label stay consistent.",
    "TTA averages predictions over several views for roughly +1–2 points, at k× inference cost."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why must augmentation be applied to training data only?",
      options: ["It is slower on validation data", "A random validation transform makes the metric noisy and can crop the object away", "Validation data is already augmented", "It causes data leakage"],
      answer: 1,
      why: "A fixed model scored on randomly transformed validation images produces a different number each run, so you cannot distinguish a real improvement from a lucky draw. The verified behaviour is that three eval passes are identical while three train passes are not — that determinism is the whole point of a separate eval pipeline." },
    { stem: "MixUp with λ = 0.7 combines a class-0 image and a class-2 image. What is the target?",
      options: ["[1, 0, 0]", "[0.7, 0, 0.3]", "[0, 0, 1]", "[0.5, 0, 0.5]"],
      answer: 1,
      why: "The label is mixed by exactly the same λ as the pixels: `ỹ = λy_i + (1−λ)y_j`. The result is a soft target summing to 1, which forbids the model from being fully confident about an input that genuinely contains two things." },
    { stem: "With α = 0.2, what do most MixUp draws look like?",
      options: ["Close to a 50/50 blend", "Mostly extreme — near 0 or near 1, so barely mixed", "Uniformly spread", "Always exactly 0.5"],
      answer: 1,
      why: "`Beta(α, α)` with α < 1 is U-shaped, putting its mass at the ends. Measured over 10,000 draws, 66.9 % fell below 0.1 or above 0.9. So most batches are only lightly mixed and the dramatic double-exposure images are the minority — which is why α = 0.2 is a mild setting despite MixUp's reputation." },
    { stem: "You are classifying handwritten digits. Which augmentation is dangerous?",
      options: ["Small rotation", "Slight translation", "Horizontal flip", "Mild scaling"],
      answer: 2,
      why: "Flipping changes the class — a mirrored 2 is not a 2, and 6 and 9 become each other under rotation. The general test is whether a human expert would still assign the same label; for digits, characters and text the answer for flips is no, while for satellite imagery every flip and rotation is fine because there is no canonical orientation." }
  ] },

  interview: { title: "Interview", sub: "Augmentation questions", questions: [
    { level: "Core", q: "How do you choose augmentations for a new problem?",
      strong: "By asking what transformations preserve the label in that domain, then starting light and watching the train/validation gap.",
      answer: [{ t: "p", text: "Every augmentation is a claim that some change should not alter the answer, so I start by asking whether a domain expert would still give the transformed image the same label. For natural photographs that admits flips, crops, modest rotations and colour jitter. For medical images colour and contrast jitter are dangerous because intensity is the diagnostic signal. For satellite imagery all rotations and both flips are fine because there is no canonical orientation. For anything containing text or digits, horizontal flips are out. Then I start with flip and crop, train, and use the gap between training and validation accuracy to decide whether to add more — a wide gap means add, and both numbers being low means I have overdone it or have a capacity problem instead." }] },
    { level: "Senior", q: "Explain MixUp and why it works.",
      strong: "Blend two images and their labels by the same λ; the soft target regularises confidence and smooths the decision boundary.",
      answer: [{ t: "p", text: "You take a convex combination of two images and the same combination of their one-hot labels, so a 0.7 mix of class 0 and class 2 has target [0.7, 0, 0.3]. The model is trained to be exactly 70 % confident, which directly penalises the over-confidence networks fall into, and it encourages linear behaviour between training examples rather than the sharp, arbitrary decision surfaces you otherwise get in the gaps between data. In practice it improves calibration as much as accuracy. One detail worth knowing is that λ comes from `Beta(α, α)` and the standard α = 0.2 is U-shaped — I measured 67 % of draws outside [0.1, 0.9] — so most batches are barely mixed and it is a gentler technique than the example images suggest." }] },
    { level: "Senior", q: "A colleague reports that validation accuracy fluctuates by two points between runs of the same checkpoint. What would you check?",
      strong: "Whether the training transform is being applied to the validation set.",
      answer: [{ t: "p", text: "The same weights on the same data should give the same number, so something stochastic is in the evaluation path. The first thing I would check is whether the validation loader is using the training transform — random resized crop and colour jitter on evaluation images will move the metric by exactly that sort of margin, and a random crop can remove the object from the frame entirely, which also depresses the number rather than just adding noise. After that I would check for dropout or batch norm left in training mode, which is `model.eval()` not being called, and for non-determinism in the data loader's ordering if the metric is computed per-batch. All three fail silently — nothing throws, the number is just quietly wrong — which is why this can survive in a codebase for months." }] }
  ] }
});
