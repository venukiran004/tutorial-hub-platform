/* ============================================================================
   LESSON 3.4 — Training a CNN in PyTorch
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "**A convolutional network trained properly on 20,000 MNIST images reaches 98.8 % in three epochs; the same network with one thing missing reaches 87 %, 92 % or — with a preprocessing mismatch between training and serving — 54 %.** This lesson is the recipe with each ingredient removed once: input normalisation, BatchNorm, the one-cycle schedule, augmentation. Then what to do with a trained network — test-time augmentation, evaluating at other resolutions through adaptive pooling, progressive resizing for faster training — and the checklist for a CNN that will not converge, which is lesson 2.4's checklist with the image-specific items added.",

  objectives: [
    "Build an image pipeline with a Dataset, torchvision transforms and a DataLoader, and a CNN with BatchNorm and global pooling",
    "Run the ablations — normalisation, BatchNorm, schedule, augmentation — and read each result",
    "Apply test-time augmentation and evaluate at other resolutions, and know what adaptive pooling does and does not make possible",
    "Use progressive resizing to cut training time and read the cost",
    "Diagnose a CNN that will not converge from the image-specific signatures, including train/serve preprocessing skew"
  ],

  prerequisites: ["3.3", "2.3", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "The pipeline", id: "pipeline" },

    { t: "code", lang: "python", title: "Dataset with transforms, the network, the loop",
      code: `class DS(Dataset):
    def __getitem__(self, i):
        x = self.X[i].float() / 255                    # uint8 -> [0, 1]
        if self.transform: x = self.transform(x)       # augmentation, on the tensor
        return (x - MEAN) / STD, self.y[i]             # standardise with the TRAINING set's mean and std

aug = torchvision.transforms.v2.RandomAffine(degrees=10, translate=(0.1, 0.1), scale=(0.9, 1.1))
loader = DataLoader(DS(X, y, aug), batch_size=128, shuffle=True, num_workers=0)

class CNN(nn.Module):                                   # conv-BN-ReLU blocks, two pools, GAP, linear: 140,458 params
    def __init__(self, c=32):
        block = lambda i, o: nn.Sequential(nn.Conv2d(i, o, 3, padding=1, bias=False), nn.BatchNorm2d(o), nn.ReLU())
        self.f = nn.Sequential(block(1, c), block(c, c), nn.MaxPool2d(2), block(c, 2c), block(2c, 2c), nn.MaxPool2d(2), block(2c, 4c))
        self.head = nn.Linear(4c, 10)
    def forward(self, x): return self.head(F.adaptive_avg_pool2d(self.f(x), 1).flatten(1))

opt = SGD(lr=0.05, momentum=0.9, nesterov=True, weight_decay=5e-4);  sched = OneCycleLR(max_lr=0.05, total_steps=epochs * len(loader))`,
      caption: "Three details carry weight. The mean and std are the training set's (0.1307, 0.3081) and are applied identically at test time. Convolutions have no bias because BatchNorm's β replaces it. Augmentation lives in the Dataset so that every epoch sees different views, and the DataLoader can parallelise it with num_workers on a real machine — here 0, on a CPU with four threads." },

    { t: "h2", n: "02", text: "The ablations", id: "ablations" },

    { t: "code", lang: "text", title: "20,000 MNIST images, batch 128, 3 epochs, test accuracy after each epoch (executed)",
      code: `baseline: normalised inputs, BatchNorm, one-cycle           0.3334   0.9625   0.9881     162 s
no BatchNorm                                                 0.1270   0.7261   0.8706     136 s
constant lr 0.05 instead of one-cycle                        0.9237   0.9719   0.9263     166 s
+ augmentation (affine ±10°, ±10 % shift, scale 0.9–1.1)     0.5108   0.9757   0.9890     219 s
trained on unnormalised [0, 1] inputs, evaluated the same way 0.8885   0.9029   0.9881     180 s
   … the same model evaluated on STANDARDISED inputs         0.3324   0.3639   0.5448              <- train/serve skew`,
      caption: "Four readings. BatchNorm is worth eleven points in three epochs at this learning rate. The constant rate is *ahead* after one epoch (one-cycle is still warming up) and behind at the end, bouncing (0.972 → 0.926) where the annealed run lands; 1.8's lesson again. Augmentation adds a tenth of a point on a task this easy and costs 35 % in time. And normalisation itself did not matter with BatchNorm in the network — but a model trained on one preprocessing and served with another lost forty-four points, which is the bug that ships." },

    { t: "callout", kind: "warn", title: "Train/serve preprocessing skew",
      body: "The unnormalised model reached 0.9881 evaluated on unnormalised inputs and 0.5448 evaluated on standardised ones. Every preprocessing step — scaling, mean/std, channel order, resize method, colour space — is part of the model. Save it with the weights (a transform object, or the constants in the checkpoint), apply it through one function used by both training and inference, and add a test that runs one saved image through the serving path and asserts the known prediction." },

    { t: "h2", n: "03", text: "After training: TTA, resolution, resizing", id: "after" },

    { t: "code", lang: "text", title: "Test-time augmentation and evaluation at other sizes (executed)",
      code: `TTA (average the softmax over nine one-pixel shifts):
  baseline model    0.9881 -> 0.9884          augmented model   0.9890 -> 0.9885

the trained networks evaluated on bilinearly resized test images (adaptive pooling makes any size run):
  size      baseline    augmented model
  20 × 20   0.8915      0.9338
  24 × 24   0.9793      0.9813
  28 × 28   0.9881      0.9890        <- training size
  32 × 32   0.9689      0.9786
  40 × 40   0.5724      0.7668`,
      caption: "TTA moved nothing here — a network with pooling is already nearly shift-invariant on a centred dataset — and it costs nine forward passes; its gains are on harder data with flips and crops. Adaptive pooling lets the network *run* at any resolution, but the receptive fields and the pooling stages were tuned at 28 px: at 40 px objects are 1.4× larger than anything seen in training and accuracy halves. The augmented model, which saw scale variation, degrades more gracefully." },

    { t: "code", lang: "text", title: "Progressive resizing: two epochs at 20 px, then one at 28 px (executed)",
      code: `test accuracy at 28 px after each epoch:  0.5113   0.5035   0.9857        138 s  (162 s for three epochs at 28 px, 0.9881)`,
      caption: "Training on smaller images is cheaper (a 20 px epoch is about half the cost of a 28 px one) and the low-resolution epochs learn most of what the filters need; a final epoch at full size recovers the resolution-specific details. The 28 px score during the small epochs is low because the BatchNorm statistics and scale are wrong for that size — the metric to watch during those epochs is at the training size. fast.ai popularised this on ImageNet; the trade here was 15 % of the time for 0.2 points." },

    { t: "dl", items: [
      ["Augmentation for images (torchvision.transforms.v2)", "Geometric: RandomResizedCrop, RandomHorizontalFlip (not for digits or text), RandomAffine, RandomRotation. Photometric: ColorJitter, RandomGrayscale, GaussianBlur. Erasing and mixing: RandomErasing (cutout), CutMix, MixUp (1.7, 3.5). Policies: AutoAugment, RandAugment, TrivialAugment — learned or randomised combinations that are the modern default. Apply on tensors, in the Dataset, with the labels transformed alongside for detection and segmentation."],
      ["Input normalisation", "Per-channel mean and std of the training set, applied identically everywhere. With BatchNorm after the first layer it barely affects accuracy (0.9881 either way here); it always affects the usable learning rate (2.4) and it is the source of the skew bug."],
      ["Varying input sizes", "Adaptive pooling before the head accepts any H × W; fully convolutional networks (3.7) output a map whose size follows the input. Accuracy still depends on the objects' scale relative to the training scale, which is why multi-scale training and test-time multi-scale exist."],
      ["What the filters learned", "First-layer 3 × 3 kernels are small oriented edge and blob detectors (one printed above: a diagonal gradient); 57 % of first-block activations were positive on a test digit. Feature maps deeper in the network respond to strokes and parts; Grad-CAM (3.7) shows what the decision used."]
    ] },

    { t: "h2", n: "04", text: "A CNN that will not converge", id: "debug" },

    { t: "table", head: ["Symptom", "Image-specific cause", "Check"],
      rows: [
        ["Loss flat at ln K", "Channel order wrong (HWC fed as CHW), all-zero images after a bad normalisation, labels misaligned by a shuffled DataFrame", "Plot a batch with its labels; print x.mean(), x.std() per channel; the overfit-one-batch test (2.4)"],
        ["Trains, validation at chance", "Different preprocessing in the validation Dataset (no normalisation, different resize), or leakage of test images into training", "Run the same tensor through both paths and diff; the shuffled-label test"],
        ["Good training loss, poor test", "Augmentation that produces implausible images (wrapping shifts in 1.7), or flips on a task where orientation is the label", "Visualise augmented batches; check per-class accuracy for confusable pairs (6/9, b/d)"],
        ["Accuracy collapses in deployment", "Serving preprocessing differs from training (0.9881 → 0.5448 above); image decoded in a different colour space or range (0–255 vs 0–1)", "A golden-image test through the serving path"],
        ["NaN after some epochs", "Learning rate too high for the size of the images' effective batch; a corrupt image with NaN pixels", "assert torch.isfinite on batches; gradient-norm log (1.8)"],
        ["Slow, GPU idle", "Data loading is the bottleneck: decoding and augmentation on one process", "num_workers > 0, pin_memory, cache decoded tensors; profile the loader alone"]
      ] },

    { t: "ladder",
      title: "From a network that trains to one that ships",
      rungs: [
        { level: "bad", label: "Train with ad-hoc preprocessing in the notebook, save the weights", code: `x = img / 255; model(x)      # and at serving time: x = (img - mean) / std`,
          note: "**0.9881 in the notebook, 0.5448 in production. The preprocessing was part of the model and was left behind.**" },
        { level: "ok", label: "One Dataset class for train and eval, normalisation constants in the checkpoint, TTA if it helps", code: `ckpt = {"model": state_dict, "mean": 0.1307, "std": 0.3081, "size": 28}`,
          note: "The constants travel with the weights; TTA measured (0.9881 → 0.9884) and dropped as not worth nine passes here." },
        { level: "best", label: "A single preprocess() function shared by training and serving, a golden-image test, augmentation chosen by visualising it, resolution matched to deployment", code: `def preprocess(img): ...          # used by DS.__getitem__ and by serve()
assert serve(golden_png) == expected  # in CI`,
          note: "Preprocessing skew becomes a failing test instead of a silent regression; the resolution table says what happens if deployment images differ in scale." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Training on unnormalised [0, 1] inputs gave the same accuracy as standardised inputs (0.9881), yet the unnormalised model scored 0.5448 when evaluated on standardised inputs. Explain both facts.",
          options: [
            "The first is luck; the second shows normalisation is required",
            "BatchNorm after the first convolution re-standardises whatever scale the input has, so training is insensitive to it; but the network's weights were fitted to one input distribution, and feeding it a different one at test time is a distribution shift the model never saw — preprocessing is part of the model",
            "The second run had a bug in the DataLoader",
            "Standardised inputs are always worse"
          ],
          answer: 1,
          why: "Both facts follow from the same layer: BatchNorm absorbs scale during training and then bakes the training-time statistics into its running averages. The failure is train/serve skew, and the fix is one shared preprocessing function and a golden-image test."
        },
        {
          stem: "The constant-rate run led after epoch one (0.924 vs 0.333) and trailed after epoch three (0.926 vs 0.988). What happened?",
          options: [
            "One-cycle is worse for short runs",
            "One-cycle spends its first epoch warming up from a small rate, so it is behind early; it then anneals to zero, so it converges cleanly, while the constant rate keeps bouncing around the minimum (0.972 at epoch two, 0.926 at epoch three) — the schedule matters at the end, not the start",
            "The constant run overfit",
            "The seeds differed"
          ],
          answer: 1,
          why: "Lesson 1.8's result on a convolutional network: the anneal is what the final accuracy comes from, and a constant rate at the peak value never settles. Judge a schedule by the last epoch."
        },
        {
          stem: "Why does accuracy fall from 0.988 to 0.572 when the same network is evaluated on 40 × 40 versions of the test images, even though it runs without error?",
          options: [
            "Adaptive pooling is lossy",
            "Adaptive pooling makes the shapes work, but the filters, receptive fields and pooling stages were fitted at 28 px; at 40 px every digit is 1.4× larger than anything seen in training, so the learned features fire at the wrong scale — the model that trained with scale augmentation degrades less (0.767)",
            "Bilinear resizing corrupts the images",
            "The BatchNorm layers reset"
          ],
          answer: 1,
          why: "Running at a size and being accurate at a size are different properties. Multi-scale training, scale augmentation and FPNs (3.6) exist because convolutional features are equivariant to translation but not to scale."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "The skew bug, reproduced and fixed; resolution and TTA measured",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Train the CNN on 20,000 MNIST images with inputs scaled to [0, 1] but not standardised, three epochs with one-cycle. After each epoch evaluate twice: on [0, 1] test inputs and on standardised ones. Report both accuracies per epoch." },
        { t: "p", text: "**(b)** Evaluate the baseline model on bilinearly resized test sets at 20, 24, 28, 32 and 40 px, and apply nine-shift TTA at 28 px. Report the accuracies." },
        { t: "p", text: "**(c)** Train with progressive resizing — two epochs at 20 px, one at 28 px, one one-cycle schedule across all three — and report the 28 px test accuracy after each epoch and the total time against the three-epoch 28 px run." }
      ],
      requirements: [
        "(a) three pairs of accuracies.",
        "(b) five accuracies and a TTA pair.",
        "(c) three accuracies and two times."
      ],
      hint: "(a) Keep everything else identical; the only change is whether (x − mean)/std is applied. (b) F.interpolate(x, size=(s, s), mode='bilinear'); TTA averages softmax probabilities, not logits. (c) Resize inside the Dataset so the loader length changes with the size; build the one-cycle schedule with the total step count of all three loaders.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) trained on [0, 1] inputs; test accuracy (evaluated on [0, 1], evaluated on standardised):
#     epoch 1 (0.8885, 0.3324)   epoch 2 (0.9029, 0.3639)   epoch 3 (0.9881, 0.5448)
#     -- identical to the standardised baseline when evaluated consistently; forty-four points lost to the mismatch

# (b) 20 px 0.8915   24 px 0.9793   28 px 0.9881   32 px 0.9689   40 px 0.5724
#     TTA at 28 px: 0.9881 -> 0.9884

# (c) progressive resizing (20, 20, 28 px): 28 px test accuracy 0.5113, 0.5035, 0.9857;  138 s against 162 s for 0.9881 at 28 px throughout`,
        notes: [
          { t: "p", text: "(a) is the deployment bug in miniature, and the reason the ladder's top rung is a shared preprocessing function with a test." },
          { t: "p", text: "(b) separates 'runs at a size' from 'is accurate at a size'; the augmented model's better numbers off-scale are the case for scale augmentation." },
          { t: "p", text: "(c) is a 15 % time saving for 0.2 points here; on ImageNet-scale runs the saving is hours." }
        ]
      }
    }
  ],

  takeaways: [
    "The recipe: standardised inputs with the training set's statistics, conv-BN-ReLU blocks without conv bias, two pools, global average pooling, SGD with Nesterov momentum and weight decay, one-cycle. 20,000 MNIST images, three epochs: 0.9881 with 140,458 parameters.",
    "Ablations: no BatchNorm 0.8706 (−11.8); constant rate 0.9263 (−6.2, bouncing 0.972 → 0.926); augmentation +0.1 at +35 % time. Input normalisation did not change accuracy with BatchNorm present — but a model served with different preprocessing than it trained on fell from 0.9881 to 0.5448.",
    "TTA (nine shifts) moved 0.9881 → 0.9884 at nine times the inference cost; its value is on harder data with flips and crops, and it must be measured.",
    "Adaptive pooling lets a network run at any resolution; accuracy still depends on scale: 0.979 at 24 px, 0.969 at 32 px, 0.572 at 40 px for a model trained at 28 px, and 0.767 at 40 px for the scale-augmented model.",
    "Progressive resizing (20, 20, 28 px) reached 0.9857 in 138 s against 0.9881 in 162 s; the low-resolution epochs learn most of the features and the final full-size epoch recovers the detail.",
    "Image-specific failures — channel order, preprocessing mismatch between Datasets, implausible augmentation, decode differences at serving, loader bottlenecks — each have a check; the golden-image test through the serving path is the one that catches the expensive one."
  ],

  quiz: {
    title: "Training a CNN in PyTorch — Knowledge Check",
    questions: [
      {
        stem: "Why do the convolutions in a conv-BN-ReLU block have bias=False?",
        options: [
          "To save memory",
          "Because BatchNorm subtracts the batch mean immediately after the convolution, cancelling any constant bias, and then adds its own learned β — the conv bias would be redundant, wasted parameters that also receive weight decay",
          "Because biases cause dead ReLUs",
          "It is a convention with no reason"
        ],
        answer: 1,
        why: "y = γ·(conv(x) + b − μ)/σ + β and μ includes b, so b vanishes. Every ResNet and its descendants omit the conv bias for this reason; the block's offset is β."
      },
      {
        stem: "Which augmentation would be wrong for MNIST and why?",
        options: [
          "Small rotations",
          "Horizontal flips: a flipped 2 or 5 is not a digit anyone writes, and a flipped 6/9 pair or b/d in text changes the label — augmentation must produce inputs that could occur with the same label",
          "Small translations",
          "Slight scaling"
        ],
        answer: 1,
        why: "Affine perturbations of ±10°, ±10 % and 0.9–1.1 scale were used and helped slightly; flips would inject label noise. Lesson 1.7's wrapping roll was the same mistake in a different form. Visualise augmented batches before trusting them."
      },
      {
        stem: "A DataLoader with num_workers=0 leaves the GPU idle half the time on a real machine. What is happening and what fixes it?",
        options: [
          "The GPU is too slow",
          "Decoding and augmenting each image runs in the main process, serially with training; num_workers > 0 runs the Dataset in parallel processes so batches are ready when the GPU needs them — pin_memory and caching decoded tensors help further; profile the loader alone to confirm",
          "The batch size is too small",
          "BatchNorm is synchronising"
        ],
        answer: 1,
        why: "On the CPU-only runs here the loader is not the bottleneck, but the augmented run was 35 % slower entirely because of transform time, which is exactly what workers parallelise on a GPU machine. Lesson 2.2's loader timing is the same lesson."
      },
      {
        stem: "During the two low-resolution epochs of progressive resizing the 28 px test accuracy was 0.51. Should you be worried?",
        options: [
          "Yes; the model is broken",
          "No: the network is being evaluated at a size it is not currently trained for, so the BatchNorm statistics and feature scales mismatch; the metric to watch during those epochs is at the training size, and the final full-size epoch brought it to 0.9857",
          "Yes; progressive resizing does not work with BatchNorm",
          "No; test accuracy is irrelevant during training"
        ],
        answer: 1,
        why: "It is the resolution-mismatch effect from the evaluation table (0.572 at 40 px), seen from the other side. Evaluate at the current training size or accept that the number is not meaningful until the final phase."
      },
      {
        stem: "What belongs in a checkpoint besides the weights for an image model?",
        options: [
          "Nothing; the weights define the model",
          "Everything the serving path needs to reproduce the training-time input: the normalisation mean and std, the input size and resize method, the channel order and range, and the class-index-to-label map — because a mismatch in any of them silently degrades accuracy (0.9881 → 0.5448 here)",
          "The training images",
          "The optimiser state only"
        ],
        answer: 1,
        why: "The preprocessing is part of the function the model computes. Lesson 2.3's checkpoint held the training state to resume a run; the deployment checkpoint holds the input contract to reproduce a prediction."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Training a CNN",
    sub: "The recipe and its ablations, preprocessing skew, TTA and resolution, and the debugging table.",
    questions: [
      {
        level: "Core",
        q: "Walk me through training a CNN for image classification and what each choice is worth.",
        strong: "Data: a Dataset that scales the raw image to [0, 1], applies augmentation, and standardises with the training set's per-channel mean and std, served by a DataLoader with workers. Model: conv-BatchNorm-ReLU blocks without conv bias, resolution halving with channels doubling, global average pooling and one linear layer — 140k parameters for MNIST. Optimiser: SGD with Nesterov momentum and weight decay 5e-4 under a one-cycle schedule. On 20,000 MNIST images, three epochs: 0.9881. I removed each ingredient once. Without BatchNorm: 0.8706, twelve points. With a constant rate instead of one-cycle: 0.9263, bouncing between epochs where the annealed run settled. With affine augmentation: 0.9890, a tenth of a point for 35 % more time on a task this easy — on real images it is the largest single gain. Standardisation itself changed nothing with BatchNorm present, but the same model served with different preprocessing than it trained on fell to 0.5448, which is the ingredient that fails in production rather than in the notebook.",
        answer: [
          { t: "p", text: "The four components, the baseline, each executed ablation, and the skew result as the deployment lesson." }
        ]
      },
      {
        level: "Core",
        q: "How do you handle images of varying size?",
        strong: "Two different questions. Shapes: put an adaptive average pool before the classifier head, or make the network fully convolutional, and any input size runs — the network here evaluated at 20 through 40 pixels without error. Accuracy: convolutional features are equivariant to translation but not to scale, so a model trained at 28 px scored 0.979 at 24 px, 0.969 at 32 px and 0.572 at 40 px, where every digit was 1.4× larger than anything it had seen. The remedies are to train with scale augmentation — the augmented model scored 0.767 at 40 px — to train at multiple resolutions, to resize inputs to the training scale at serving time, or, for detection, to use a feature pyramid so objects are matched to a level at their own scale. For batching, images of different sizes need a collate function that pads or crops to a common size, with the padding masked where it would leak into pooled statistics.",
        answer: [
          { t: "p", text: "Shapes against accuracy, the executed resolution table, the remedies, and batching." }
        ]
      },
      {
        level: "Advanced",
        q: "A CNN reaches 98 % in development and 55 % in production. Where do you look first?",
        strong: "The preprocessing, because the model's function includes it and it is the part most often reimplemented for serving. I reproduced this exact failure: a network trained on [0, 1] inputs scored 0.9881 evaluated the same way and 0.5448 evaluated on standardised inputs — a distribution shift the network never saw, invisible in the loss because the weights are fine. So: run one saved image through the development path and the production path and diff the tensors at every stage — decode (PIL against OpenCV gives RGB against BGR), range (0–255 against 0–1), resize method and target size, mean/std constants, channel order (HWC against CHW), dtype. Whichever stage differs is the bug. Then I make it structural: a single preprocess() function imported by both the Dataset and the server, the constants stored in the checkpoint, and a golden-image test in CI that asserts the known prediction. If preprocessing matches, the next suspects are model.eval() (1.6), a different image domain than training (2.4's validation-at-chance branch), and a class-index map that was shuffled between environments.",
        answer: [
          { t: "p", text: "Preprocessing first with the executed reproduction, the stage-by-stage diff, the structural fix, and the next suspects." }
        ]
      }
    ]
  }
});
