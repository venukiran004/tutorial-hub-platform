/* ============================================================================
   LESSON 2.8 — Image Segmentation, Transposed and Dilated Convolutions
   Mirrors 02_CNNs.md · §9, §15 and §16 — the reference separates them, but
   upsampling and dilation exist to serve dense prediction, so they belong
   here. All shapes executed in scratchpad/dl/d28.py.
   ========================================================================= */
EC.receiveLesson({
  id: "2.8",

  lede: "**Segmentation is classification run at every pixel, and that one change breaks the architecture you have been building.** A classifier throws spatial information away on purpose — pool, pool, pool, until a 224×224 image is a single vector. Segmentation needs that information back at full resolution. The answers are an encoder-decoder with skip connections (U-Net), learned upsampling (transposed convolution) and a way of seeing widely without downsampling at all (dilated convolution).",

  objectives: [
    "Distinguish semantic, instance and panoptic segmentation",
    "Trace the shapes through a U-Net encoder and decoder",
    "Measure how much spatial detail pooling destroys, and explain what skips recover",
    "Use transposed convolution and avoid its checkerboard artefacts",
    "Apply dilated convolutions to grow the receptive field at constant resolution"
  ],

  prerequisites: ["2.7", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Three kinds of segmentation", id: "kinds" },

    { t: "dl", items: [
      ["Semantic", "Every pixel gets a class. All cars share one label — there is no notion of individual objects. FCN, U-Net, DeepLab."],
      ["Instance", "Detect objects, then produce a binary mask for each. Car 1 and car 2 are distinct. Mask R-CNN = Faster R-CNN plus a mask branch."],
      ["Panoptic", "Both at once: every pixel is classified, and every countable 'thing' also gets a unique instance id. Amorphous 'stuff' like sky and road just gets a class."]
    ] },

    { t: "h2", n: "02", text: "From a classifier head to a dense head", id: "fcn" },

    { t: "p", text: "The fully convolutional network's insight is that the classifier's final linear layer is a 1×1 convolution — exactly the operation from lesson 2.4. Apply it at every position instead of after pooling, and you get a prediction per location." },

    { t: "out", text: `  feature map (512, 7, 7)
  classifier : GAP -> Linear(512,21)      -> (21,)  (one label)
  FCN head   : Conv2d(512,21,1)           -> (21, 7, 7)  (a label per position)
  upsampled to input size                 -> (21, 224, 224)` },

    { t: "callout", kind: "insight", title: "Nothing about the backbone changes",
      body: [{ t: "p", text: "You can take any pretrained classification backbone, delete the global average pool and linear layer, and bolt on a 1×1 convolution with one output channel per class. The backbone's weights transfer directly, because it was never doing anything classification-specific — it was extracting features, and the head was the only part that collapsed space. This is why every segmentation model starts from ImageNet weights, and why lesson 2.5's transfer learning applies unchanged." }] },

    { t: "p", text: "The problem is that `7×7` upsampled to `224×224` is extremely coarse — each predicted value covers a 32×32 block of the output. That is the problem U-Net solves." },

    { t: "h2", n: "03", text: "U-Net", id: "unet" },

    { t: "diagram", kind: "flow", title: "The U shape",
      caption: "Down the left, up the right, and a horizontal skip at every level carrying full-resolution detail across the bottleneck.",
      cols: 3,
      nodes: [
        { id: "e1", label: "64 × 256 × 256", sub: "encoder 1", tone: "accent" },
        { id: "e2", label: "128 × 128 × 128", sub: "encoder 2", tone: "accent" },
        { id: "b", label: "512 × 16 × 16", sub: "bottleneck", tone: "crit" },
        { id: "d2", label: "384 × 64 × 64", sub: "decoder + skip", tone: "good" },
        { id: "d1", label: "96 × 256 × 256", sub: "decoder + skip", tone: "good" },
        { id: "o", label: "C × 256 × 256", sub: "one channel per class", tone: "violet" }
      ],
      edges: [["e1", "e2"], ["e2", "b"], ["b", "d2"], ["d2", "d1"], ["d1", "o"], ["e1", "d1", "skip"], ["e2", "d2", "skip"]] },

    { t: "out", text: `  encoder 1: (64, 256, 256)   <- kept for the skip
  encoder 2: (128, 128, 128)  <- kept for the skip
  encoder 3: (256, 64, 64)    <- kept for the skip
  encoder 4: (512, 32, 32)    <- kept for the skip
  bottleneck: (512, 16, 16)
  decoder 1: upsampled (256, 32, 32) + skip (512, 32, 32) = (768, 32, 32)
  decoder 2: upsampled (128, 64, 64) + skip (256, 64, 64) = (384, 64, 64)
  decoder 3: upsampled (64, 128, 128) + skip (128, 128, 128) = (192, 128, 128)
  decoder 4: upsampled (32, 256, 256) + skip (64, 256, 256) = (96, 256, 256)` },

    { t: "p", text: "Each decoder level upsamples, then **concatenates** the matching encoder map along the channel axis — note the channel counts adding, 256 + 512 = 768. This is concatenation, not the addition that ResNet uses, which is a distinction worth keeping straight." },

    { t: "h2", n: "04", text: "What the skips actually recover", id: "skips" },

    { t: "p", text: "Thin one-pixel lines through four rounds of max pooling and back up:" },

    { t: "out", text: `  original 64x64 thin lines: 512 lit pixels
  after 4 poolings: (4, 4), then upsampled back
  pixels recovered exactly: 512 of 4096 (12.5%)
  reconstruction error: 0.8750` },

    { t: "p", text: "**Only 12.5 % of the image survives the round trip.** Fine structure — cell boundaries, thin vessels, object edges — is simply gone by the bottleneck, and no decoder can invent it back. The skip connection is not an optimisation trick here; it is the only path by which that information reaches the output at all. That is why U-Net came out of biomedical imaging, where the thing you are segmenting is frequently one or two pixels wide." },

    { t: "h2", n: "05", text: "Transposed convolution", id: "transposed" },

    { t: "p", text: "Upsampling with learned weights rather than fixed interpolation. A 2×2 input with a stride-2, kernel-2 transposed convolution:" },

    { t: "out", text: `  input 2x2:
[[1. 2.]
 [3. 4.]]
  ConvTranspose2d(k=2,s=2) -> (4, 4):
[[1. 1. 2. 2.]
 [1. 1. 2. 2.]
 [3. 3. 4. 4.]
 [3. 3. 4. 4.]]
  parameters: 4 (learned), against interpolate() which has 0 (fixed)` },

    { t: "callout", kind: "trap", title: "Checkerboard artefacts when the kernel is not divisible by the stride",
      body: [{ t: "p", text: "A transposed convolution places a copy of the kernel at each output stride position and sums the overlaps. If `k` is not a multiple of `s`, different output pixels receive different numbers of contributions. With `k=3, s=2` on a uniform input, the measured output values were **1.0, 2.0 and 4.0** — a four-fold variation from an input that was perfectly flat. That periodic pattern is the checkerboard artefact you see in GAN and segmentation outputs. Use `k=2, s=2` or `k=4, s=2`, or sidestep it entirely with `F.interpolate` followed by an ordinary 3×3 convolution, which is what most modern architectures do." }] },

    { t: "h2", n: "06", text: "Dilated convolution", id: "dilated" },

    { t: "p", text: "The other way to see a large area: spread the kernel's taps apart instead of shrinking the image. A 3×3 kernel with dilation `d` covers `1 + 2d` pixels in each direction." },

    { t: "out", text: `  dilation 1: kernel still 3x3 (584 params), covers 3x3, output (32, 32)
  dilation 2: kernel still 3x3 (584 params), covers 5x5, output (32, 32)
  dilation 4: kernel still 3x3 (584 params), covers 9x9, output (32, 32)
  dilation 8: kernel still 3x3 (584 params), covers 17x17, output (32, 32)` },

    { t: "p", text: "**Identical parameter count, identical output resolution, receptive field growing from 3 to 17.** Stacking dilations 1, 2, 4, 8 gives exponential context growth with no downsampling anywhere — so there is nothing to upsample and nothing lost. This is DeepLab's central mechanism, and its Atrous Spatial Pyramid Pooling runs several dilations in parallel to capture objects at multiple scales at once." },

    { t: "diagram", kind: "compare", title: "Two routes to a large receptive field",
      caption: "Pooling is cheaper per layer but destroys resolution. Dilation keeps resolution but costs full-resolution compute at every layer.",
      columns: [
        { title: "Pool, then upsample", tone: "warn", items: [
          "Receptive field grows and compute falls",
          "Fine detail is destroyed — 12.5 % recovered in the measurement above",
          "Needs skip connections to be usable",
          "U-Net, FCN"
        ] },
        { title: "Dilate", tone: "good", items: [
          "Receptive field grows at constant resolution",
          "No detail lost, nothing to recover",
          "Compute stays at full resolution throughout — expensive",
          "DeepLab, WaveNet"
        ] }
      ] },

    { t: "callout", kind: "trap", title: "Gridding artefacts from stacked equal dilations",
      body: [{ t: "p", text: "Stacking several layers at the same dilation rate means the sampled positions never interleave — with dilation 2 throughout, a given output pixel only ever draws on even-indexed inputs and half the image is invisible to it. The fix is to vary the rates so they are not all multiples of one another, which is why DeepLab uses sequences like 1, 2, 5 rather than 2, 2, 2." }] },

    { t: "exercise", kind: "practice", title: "Build U-Net and prove the skips matter", difficulty: "advanced", minutes: 45,
      prompt: "Implement a U-Net with four encoder and four decoder levels and confirm the shapes match at every concatenation. Then build the identical network with the skip connections removed and train both on a segmentation task with thin structures — hand-drawn shapes with 1–2 pixel outlines will do. Compare not just overall accuracy but boundary accuracy specifically: the fraction of pixels within two of a true boundary that are correctly labelled. Then replace the transposed convolutions with `interpolate` plus a 3×3 convolution and check whether any checkerboard pattern in the output disappears.",
      hints: [
        "A shape mismatch at concatenation means your upsample and skip are at different levels — print both before every `torch.cat`.",
        "Overall pixel accuracy can be high while boundaries are terrible, because interiors dominate the pixel count.",
        "To see checkerboarding, look at the raw logits on a uniform input rather than the final mask."
      ],
      solution: {
        notes: [
          { t: "p", text: "The two networks will look close on overall pixel accuracy and far apart on boundary accuracy, which is the point. Interiors are the overwhelming majority of pixels and are easy, so a global metric hides exactly the failure segmentation models are judged on. This is the reason segmentation work reports IoU per class and boundary F-scores rather than pixel accuracy — on an image that is 90 % background, predicting all background scores 90 %." },
          { t: "p", text: "For the skipless network, the ceiling is set by what survives the bottleneck. In the measurement above only 12.5 % of a thin-line image was recoverable after four poolings, and the decoder cannot reconstruct information that is no longer present. No amount of extra decoder capacity fixes that — it is an information-theoretic limit, not a capacity limit, and recognising which of the two you are facing is a generally useful diagnostic habit." },
          { t: "p", text: "The checkerboard comparison is clearest on raw logits. With `k=3, s=2` a uniform input produced output values of 1, 2 and 4 in my measurement; with interpolate plus a 3×3, the output is uniform. Modern architectures have largely abandoned transposed convolution for this reason." }
        ]
      } }

  ],

  takeaways: [
    "Semantic labels every pixel by class; instance separates individual objects; panoptic does both.",
    "An FCN head is a 1×1 convolution — the classifier's linear layer applied at every position — so any pretrained backbone transfers.",
    "U-Net concatenates (not adds) each encoder map into the matching decoder level: 256 + 512 = 768 channels.",
    "Four poolings on thin structures recover only 12.5 % of pixels — the skips are the only path for that detail.",
    "Transposed convolution with `k` not divisible by `s` causes checkerboarding: uniform input gave outputs of 1, 2 and 4.",
    "Dilation grows the receptive field from 3 to 17 with identical parameters and resolution; vary the rates to avoid gridding."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does U-Net need skip connections?",
      options: ["To help gradients flow, as in ResNet", "Because downsampling destroys fine spatial detail the decoder cannot reconstruct", "To reduce parameter count", "To allow deeper networks"],
      answer: 1,
      why: "Measured on thin one-pixel lines, four rounds of pooling and upsampling recovered only 12.5 % of the image exactly. The information is gone, not merely hard to recover, so the skip is the only route by which full-resolution detail reaches the output. Gradient flow is a genuine secondary benefit but not the reason the architecture exists." },
    { stem: "How does a U-Net combine the skip with the upsampled feature map?",
      options: ["Element-wise addition, as in ResNet", "Concatenation along the channel axis", "Element-wise multiplication", "Averaging"],
      answer: 1,
      why: "The channel counts add: upsampled 256 plus skip 512 gives 768, and a convolution then reduces them. This differs deliberately from ResNet's addition — concatenation preserves both sources separately and lets the following convolution decide how to weigh them, at the cost of more channels." },
    { stem: "A transposed convolution with kernel 3 and stride 2 produces a visible grid pattern. Why?",
      options: ["The learning rate is too high", "Output positions receive uneven numbers of kernel contributions because 3 is not divisible by 2", "The kernel is too small", "Padding is incorrect"],
      answer: 1,
      why: "The operation places a kernel copy at each stride position and sums overlaps; uneven overlap means uneven output. On a uniform input with k=3, s=2 the measured output values were 1, 2 and 4. Use k=2 or k=4 with stride 2, or replace the layer with `interpolate` plus a 3×3 convolution." },
    { stem: "What does a dilated convolution buy you?",
      options: ["Fewer parameters", "A larger receptive field with no loss of resolution and no extra parameters", "Faster inference", "Better gradient flow"],
      answer: 1,
      why: "A 3×3 kernel at dilation 8 covers 17×17 with the same 584 parameters and the same 32×32 output. It is the alternative to pooling for gaining context: nothing is downsampled so nothing needs recovering, at the cost of running full-resolution compute throughout." }
  ] },

  interview: { title: "Interview", sub: "Segmentation questions", questions: [
    { level: "Core", q: "How does a segmentation network differ from a classifier?",
      strong: "It predicts a class per pixel, so the spatial collapse in the classifier head is replaced by a decoder that restores resolution.",
      answer: [{ t: "p", text: "A classifier deliberately destroys spatial information — pooling repeatedly until a 224×224 image is one vector — because it only needs one answer. Segmentation needs an answer per pixel, so the head becomes a 1×1 convolution producing one channel per class at every position, which is just the classifier's linear layer applied everywhere. The backbone is unchanged and transfers directly from ImageNet. The hard part is resolution: a 7×7 prediction map upsampled to 224×224 is far too coarse, so you need either an encoder-decoder with skip connections, or dilated convolutions that never downsample in the first place." }] },
    { level: "Senior", q: "Why are skip connections essential in U-Net rather than merely helpful?",
      strong: "Because downsampling destroys information outright — the decoder cannot reconstruct what is no longer there.",
      answer: [{ t: "p", text: "It is an information argument rather than an optimisation one. I measured thin one-pixel structures through four rounds of pooling and upsampling and recovered 12.5 % of the pixels exactly — the rest is simply not present in the bottleneck representation. A decoder with unlimited capacity still cannot output boundaries it has no information about. The skip carries the encoder's full-resolution feature map around the bottleneck and concatenates it in, which is the only path that detail has. That is why the architecture came out of biomedical imaging, where the structures being segmented are often a pixel or two wide, and it is also why you should measure boundary accuracy rather than overall pixel accuracy — interiors dominate the pixel count and hide the failure." }] },
    { level: "Senior", q: "When would you choose dilated convolutions over an encoder-decoder?",
      strong: "When resolution matters more than compute, and the objects need wide context — DeepLab's trade-off.",
      answer: [{ t: "p", text: "Dilation grows the receptive field without downsampling — I measured a 3×3 kernel covering 17×17 at dilation 8 with identical parameters and output size. Since nothing is lost, nothing needs recovering, so there is no decoder and no risk of a bottleneck throwing away the detail you need. The cost is that every layer runs at full resolution, which is expensive in both memory and time, so it suits moderate input sizes better than large ones. I would pick it when boundary precision is critical and I can afford the compute, and a U-Net when memory is tight or inputs are large. One caveat: stacking equal dilation rates causes gridding, where a given output only ever samples one parity of input positions, so the rates need to vary — DeepLab uses sequences like 1, 2, 5 for exactly this reason." }] }
  ] }
});
