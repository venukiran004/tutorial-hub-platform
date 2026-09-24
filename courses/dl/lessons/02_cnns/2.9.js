/* ============================================================================
   LESSON 2.9 — Grad-CAM and Visual Explainability
   Mirrors 02_CNNs.md · §10. Run for real against pretrained ResNet-18 on a
   real photograph (scratchpad/dl/d29.py, d29b.py). The class-discrimination
   limitation is measured and reported rather than glossed over.
   ========================================================================= */
EC.receiveLesson({
  id: "2.9",

  lede: "**A model that is right for the wrong reason will fail the moment the wrong reason goes away, and accuracy cannot tell you which you have.** Grad-CAM answers the question directly: which regions of this image drove this prediction? It needs no architecture change and no retraining — just a forward pass, a backward pass, and four lines of arithmetic on the last convolutional block. This lesson runs it on a real photograph with real ImageNet weights, and measures where it works and where it does not.",

  objectives: [
    "Derive Grad-CAM's four steps and the shapes at each one",
    "Explain why the gradients are pooled and why the result is passed through ReLU",
    "Run Grad-CAM with forward and backward hooks, avoiding the hook that breaks the graph",
    "Interpret a heatmap's concentration and centre of mass",
    "State Grad-CAM's resolution and class-discrimination limits from measurement"
  ],

  prerequisites: ["2.8", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "The idea", id: "idea" },

    { t: "p", text: "The last convolutional block holds feature maps that are semantically rich but still spatially arranged — in ResNet-18 that is 512 channels at 7×7. If you knew which of those 512 channels mattered for a given class, you could take a weighted sum of their spatial maps and see *where* the evidence was. Grad-CAM gets those weights from the gradient." },

    { t: "math", tex: "\\alpha_k^c = \\frac{1}{Z}\\sum_i\\sum_j \\frac{\\partial y^c}{\\partial A^k_{ij}} \\qquad\\qquad L^c = \\mathrm{ReLU}\\!\\left(\\sum_k \\alpha_k^c A^k\\right)" },

    { t: "diagram", kind: "steps", title: "Grad-CAM in four steps",
      caption: "No retraining and no architecture change — everything comes from one forward and one backward pass.",
      items: [
        { label: "Forward", sub: "get the score for target class c", tone: "accent" },
        { label: "Backward", sub: "∂y_c/∂A — gradients w.r.t. the last conv feature maps", tone: "violet" },
        { label: "Pool", sub: "average each gradient map → one weight α_k per channel", tone: "teal" },
        { label: "Combine", sub: "ReLU(Σ α_k A_k), upsample to input size", tone: "good" }
      ] },

    { t: "out", text: `  1. forward pass  : logits (1, 1000), top class 620 (score 4.776)
  2. activations A : (1, 512, 7, 7)  (the last conv block's feature maps)
     gradients dy/dA: (1, 512, 7, 7)  (same shape, one per feature map value)
  3. alpha_k = GAP(gradients) : (1, 512, 1, 1)  (one weight per channel)
  4. cam = ReLU(sum_k alpha_k * A_k), upsampled : (224, 224)` },

    { t: "p", text: "The pooling step is the key move. The raw gradient is `512 × 7 × 7` — a value per feature map *position*. Averaging over the spatial dimensions collapses that to one number per channel, answering 'how much does this feature map as a whole matter for this class?' rather than 'does this individual pixel matter?', which would be noisy." },

    { t: "h2", n: "02", text: "Running it", id: "code" },

    { t: "code", lang: "python", title: "Hooks, and the one that silently breaks",
      code: `def grad_cam(model, image, target_class, target_layer):
    acts, grads = {}, {}

    def fwd(mod, i, o):
        acts['v'] = o.detach()      # MUST return None — a return value
                                    # REPLACES the module's output
    def bwd(mod, gi, go):
        grads['v'] = go[0].detach()

    h1 = target_layer.register_forward_hook(fwd)
    h2 = target_layer.register_full_backward_hook(bwd)

    out = model(image)
    model.zero_grad()
    out[0, target_class].backward()

    w = grads['v'].mean(dim=[2, 3], keepdim=True)          # alpha_k
    cam = F.relu((w * acts['v']).sum(dim=1, keepdim=True))
    cam = F.interpolate(cam, size=image.shape[2:], mode='bilinear',
                        align_corners=False)
    h1.remove(); h2.remove()
    return cam / cam.max()`,
      caption: "Always remove the hooks. A hook left registered fires on every subsequent forward pass and leaks memory by holding activations alive." },

    { t: "callout", kind: "trap", title: "A forward hook that returns a value replaces the output",
      body: [{ t: "p", text: "Writing the hook as `lambda mod, i, o: acts.setdefault('v', o.detach())` looks tidy and is broken. The lambda returns the detached tensor, and PyTorch interprets a non-`None` return from a forward hook as a replacement for the module's output — so the rest of the network runs on a tensor with no graph attached, no gradient reaches the target layer, and the backward hook never fires. The symptom is a `KeyError` on the gradients dictionary, which sends you looking at the backward hook when the bug is in the forward one. Write hooks as `def` statements with no return." }] },

    { t: "h2", n: "03", text: "On a real photograph", id: "real" },

    { t: "p", text: "A photograph of a dog, through ResNet-18 with genuine ImageNet weights:" },

    { t: "out", text: `  88.46%  class 258  Samoyed
   4.58%  class 279  Arctic fox
   4.43%  class 270  Alaskan tundra wolf
   0.56%  class 259  Pomeranian
   0.47%  class 257  Pyrenean Mountain Dog` },

    { t: "out", text: `=== Grad-CAM for the predicted class (Samoyed) ===
  raw CAM before ReLU: min 0.0125, max 1.0289, 0.0% negative
  fraction of pixels above half-max: 21.5%  (a uniform map would be 100%)
  centre of mass: row 103, col 80 of 224` },

    { t: "p", text: "**The heatmap is concentrated on 21.5 % of the image**, not spread across it. That concentration is what makes the method useful — a uniform map would tell you nothing. For the confidently predicted class, note that no part of the raw CAM is negative: every feature map that contributes is contributing in favour." },

    { t: "h2", n: "04", text: "Why the ReLU", id: "relu" },

    { t: "p", text: "Ask the same network about a class it rejects entirely:" },

    { t: "out", text: `  target: class 133 (bittern), p = 0.000000%
  raw CAM: min -0.3799, max 0.0036, 95.9% negative
  after ReLU, the whole map is 0.0036 - nothing supports it` },

    { t: "callout", kind: "insight", title: "A blank heatmap is a real answer",
      body: [{ t: "p", text: "For the rejected class, 95.9 % of the raw map is negative — the image contains active evidence *against* 'bittern' almost everywhere. The ReLU discards all of it, leaving essentially zero. That is the correct behaviour: Grad-CAM is asking 'what supports this class?', and the honest answer here is 'nothing'. The consequence worth remembering is that an empty heatmap does not mean the method failed; it means the class you asked about has no positive evidence in the image. If you want to see what argues against a class, look at the raw map before the ReLU." }] },

    { t: "h2", n: "05", text: "Two limits, measured", id: "limits" },

    { t: "out", text: `  Samoyed                vs Arctic fox              correlation +0.9712
  Samoyed                vs Alaskan tundra wolf     correlation +0.9164
  Arctic fox             vs Alaskan tundra wolf     correlation +0.9590` },

    { t: "p", text: "Grad-CAM is usually presented as *class-discriminative*, and it is — for classes in different parts of the image. For **visually similar classes occupying the same region it is close to useless**: these three heatmaps correlate at 0.92 to 0.97. The method tells you the network looked at the animal; it cannot tell you what distinguished Samoyed from Arctic fox, because that distinction lives in fine texture the 7×7 map cannot express." },

    { t: "out", text: `  layer4 feature map is 7x7, upsampled to 224x224
  each CAM value covers a 32x32 block of the input` },

    { t: "p", text: "That is the second limit and the reason heatmaps look blurry: each of the 49 values covers a 32×32 patch. Hooking an earlier layer gives a finer map but weaker semantics, since early features are edges rather than objects. The last convolutional block is the standard compromise." },

    { t: "diagram", kind: "compare", title: "What Grad-CAM can and cannot tell you",
      caption: "Useful for the first kind of question, unreliable for the second.",
      columns: [
        { title: "Answers well", tone: "good", items: [
          "Is the model looking at the object or the background?",
          "Is it relying on a watermark, border or artefact?",
          "Which of two spatially separated objects drove the call?",
          "Why did this particular image fail?"
        ] },
        { title: "Answers poorly", tone: "warn", items: [
          "What distinguishes two similar classes (correlation 0.92–0.97)",
          "Fine-grained localisation — resolution is 32×32 blocks",
          "Whether a feature is causal rather than merely correlated",
          "Anything about layers other than the one you hooked"
        ] }
      ] },

    { t: "callout", kind: "good", title: "The failure this catches is the one that matters",
      body: [{ t: "p", text: "The canonical story is a tank classifier that had learned to detect sunny weather, because the tank photographs happened to be taken on a clear day. Accuracy on the test set was excellent; the model was useless. Grad-CAM catches exactly this class of problem — heatmaps sitting on the sky, on a hospital's scanner watermark, on a ruler placed next to skin lesions — and it catches it before deployment rather than after. Run it on your validation failures as a matter of routine; it takes minutes and occasionally saves a project." }] },

    { t: "exercise", kind: "practice", title: "Audit a model with Grad-CAM", difficulty: "intermediate", minutes: 35,
      prompt: "Take a pretrained classifier and generate Grad-CAM heatmaps for twenty validation images — ten it gets right and ten it gets wrong. For each, record the fraction of pixels above half-max and the centre of mass. Compare the two groups: are the failures less concentrated, or concentrated somewhere unexpected? Then pick one image and generate heatmaps for the top five predicted classes, computing pairwise correlations. Finally, repeat the whole thing hooking layer3 instead of layer4 and compare the resolution and the sharpness of what you see.",
      hints: [
        "Normalise each heatmap by its own max before comparing concentrations.",
        "The centre of mass is a quick numeric proxy for 'is it looking at the middle or the edge?'.",
        "For layer3 the feature map is 14×14, so the upsampling factor halves."
      ],
      solution: {
        notes: [
          { t: "p", text: "The correctly classified images typically give tight heatmaps on the object — I measured 21.5 % of pixels above half-max for a confidently predicted Samoyed. Failures often show one of two patterns: diffuse maps with no clear focus, meaning no strong evidence was found, or tight maps in the wrong place, meaning the model found strong evidence for the wrong thing. The second is much more dangerous, because the model is confident and wrong for a reason that will recur." },
          { t: "p", text: "The pairwise correlations across the top five classes are the sobering part. For visually similar classes in the same location I measured 0.92 to 0.97, meaning Grad-CAM essentially cannot distinguish them. Read honestly, the heatmap says 'the model looked at the animal' and nothing more — anyone claiming it explains *why* the model chose one fine-grained class over another is over-reading it." },
          { t: "p", text: "Hooking layer3 gives a 14×14 map, so each value covers 16×16 input pixels rather than 32×32. The maps are visibly sharper but often less semantically coherent, because layer3's features are closer to textures than to objects. That trade-off is why layer4 is the default, and seeing both once makes it clear the choice is a real one rather than a convention." }
        ]
      } }

  ],

  takeaways: [
    "Grad-CAM: forward, backward to the last conv block, average gradients per channel, ReLU the weighted sum.",
    "Averaging gradients spatially gives one weight per feature map — 512×7×7 becomes 512×1×1.",
    "A forward hook that returns a value replaces the module's output and breaks the graph; use `def`, not a lambda with a return.",
    "Measured on a real photograph: the heatmap for the predicted class covers 21.5 % of pixels above half-max.",
    "For a rejected class, 95.9 % of the raw map is negative and ReLU leaves nothing — a blank map is a real answer.",
    "Heatmaps for visually similar classes correlate at 0.92–0.97, so Grad-CAM is weakly class-discriminative there.",
    "Resolution is 7×7 upsampled: each value covers a 32×32 input block."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why are the gradients averaged over the spatial dimensions?",
      options: ["To save memory", "To get one importance weight per feature map, rather than a noisy per-pixel value", "Because gradients are always spatially constant", "To normalise the heatmap"],
      answer: 1,
      why: "The raw gradient is 512×7×7. Averaging collapses it to 512×1×1, answering how much each feature map matters as a whole rather than how much each individual position matters. The spatial information is not lost — it comes back from the activations `A_k`, which are what get weighted and summed." },
    { stem: "Why is a ReLU applied to the weighted sum?",
      options: ["To normalise values to [0,1]", "To keep only features that argue in favour of the class, discarding those arguing against it", "To avoid numerical overflow", "To match the network's activation function"],
      answer: 1,
      why: "Negative contributions are evidence for other classes. For a class the network rejected, 95.9 % of the raw map was negative and the ReLU correctly left nothing — the honest answer being that nothing in the image supports it. To see what argues *against* a class, inspect the raw map before the ReLU." },
    { stem: "Your Grad-CAM code raises a KeyError on the gradients dict. What is the most likely cause?",
      options: ["The backward hook was registered on the wrong layer", "The forward hook returns a value, replacing the output with a detached tensor", "The model is in eval mode", "The target class index is out of range"],
      answer: 1,
      why: "PyTorch treats a non-None return from a forward hook as a replacement output. A lambda using `setdefault` returns the detached tensor, so the rest of the network runs without a graph, no gradient reaches the target layer, and the backward hook never fires. The error surfaces at the gradients dict, which points away from the actual bug." },
    { stem: "Grad-CAM heatmaps for 'Samoyed' and 'Arctic fox' on the same image correlate at 0.97. What does that tell you?",
      options: ["The implementation is buggy", "Grad-CAM cannot distinguish visually similar classes in the same location", "The model is poorly trained", "The heatmaps should be renormalised"],
      answer: 1,
      why: "It is a genuine limitation, not a bug. Both classes are supported by the same region — the animal — and what distinguishes them is fine texture that a 7×7 feature map upsampled to 224×224 cannot represent. Grad-CAM tells you *where* the model looked, not what fine-grained distinction it made there." }
  ] },

  interview: { title: "Interview", sub: "Explainability questions", questions: [
    { level: "Core", q: "Explain how Grad-CAM works.",
      strong: "Gradients of the class score w.r.t. the last conv activations, pooled into per-channel weights, weighted sum, ReLU, upsample.",
      answer: [{ t: "p", text: "You take the score for the class of interest and backpropagate to the last convolutional block's activations. That gives a gradient tensor the same shape as the activations — 512×7×7 in ResNet-18. Averaging each channel's gradient map spatially gives one importance weight per feature map, which answers how much that whole feature matters for this class rather than how much each pixel does. You then take the weighted sum of the activation maps using those weights, apply a ReLU to keep only features arguing in favour of the class, and upsample to the input size. The whole thing is one forward pass and one backward pass, with no retraining and no architecture change, which is why it is the default tool for this." }] },
    { level: "Senior", q: "What are Grad-CAM's limitations?",
      strong: "Coarse resolution, weak discrimination between similar classes, and it shows correlation rather than causation.",
      answer: [{ t: "p", text: "Three that matter. First, resolution: the map comes from a 7×7 feature grid, so each value covers a 32×32 input block and the heatmaps are inherently blurry — hooking an earlier layer sharpens them but the features are less semantic. Second, class discrimination is weaker than usually claimed. I measured heatmaps for Samoyed, Arctic fox and Alaskan tundra wolf on the same photograph correlating at 0.92 to 0.97, because all three are supported by the same region and the distinguishing evidence is fine texture the map cannot represent. It tells you the model looked at the animal, not what it concluded from it. Third, it shows where activation and gradient coincide, which is not the same as showing what caused the prediction — for that you need an intervention, like occluding the highlighted region and checking whether the score actually drops." }] },
    { level: "Senior", q: "How would you use Grad-CAM in a production workflow?",
      strong: "As a routine audit on validation failures, looking for models that are right for the wrong reason.",
      answer: [{ t: "p", text: "I would run it over a sample of validation images — deliberately including failures, not just successes — before any model ships. The failure mode it catches is the one accuracy is blind to: a model that is right for a reason that will not generalise. The classic cases are heatmaps sitting on a scanner watermark, on a ruler placed beside a skin lesion, or on the sky rather than the object. Those models score well and are useless in deployment. I would look at two things numerically: how concentrated the map is, and where its centre of mass sits relative to the object. Diffuse maps mean no strong evidence; tight maps in the wrong place are the dangerous case. I would also be careful how the output is presented to non-specialists, because a heatmap looks authoritative and people over-read it — given the correlation numbers I mentioned, it supports 'the model attended here' far better than it supports 'the model decided this because of that'." }] }
  ] }
});
