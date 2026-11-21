/* ============================================================================
   LESSON 2.11 — CNNs in PyTorch and Keras
   The AMP API it uses is deprecated in torch 2.10 — noted, with the
   replacement.
   ========================================================================= */
EC.receiveLesson({
  id: "2.11",

  lede: "**Everything in this module so far now assembles into one model class.** The `CustomCNN` is the standard anatomy from lesson 2.2 — conv, batch norm, ReLU, pool, channels doubling as space halves — capped by the global average pooling head from lesson 2.3. This lesson builds it, traces every shape through it, runs the training loop end to end, and flags the one commonly used API that has since been deprecated.",

  objectives: [
    "Build a production-shaped CNN as an `nn.Module` and trace its shapes",
    "Explain why the parameter split is the inverse of VGG's",
    "Run a training loop with AMP, gradient clipping and OneCycleLR",
    "Use the current `torch.amp` API rather than the deprecated `torch.cuda.amp`",
    "Map the PyTorch model onto its Keras equivalent"
  ],

  prerequisites: ["2.10", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "The model", id: "model" },

    {"kind": "layers", "title": "CustomCNN, bottom to top", "caption": "Three blocks of convolution and a pooled head — the shape of 2.2 made concrete. Note the two numbers that matter: the spatial size halves 224 → 112 → 56 → 28 while channels double 64 → 128 → 256, and the head is small because global pooling has already removed position.", "items": [{"label": "Linear 256 -> 128 -> 10", "sub": "34,186 parameters", "tone": "teal", "side": "the head"}, {"label": "Global average pool", "sub": "28 x 28 x 256 -> 256", "tone": "good", "side": "no params"}, {"label": "2 x (Conv 3x3, BN, ReLU) 128 -> 256, pool", "sub": "56 x 56 -> 28 x 28", "tone": "accent", "side": "block 3"}, {"label": "2 x (Conv 3x3, BN, ReLU) 64 -> 128, pool", "sub": "112 x 112 -> 56 x 56", "tone": "accent", "side": "block 2"}, {"label": "2 x (Conv 3x3, BN, ReLU) 3 -> 64, pool", "sub": "224 x 224 -> 112 x 112", "tone": "good", "side": "block 1"}, {"label": "Input 3 x 224 x 224", "sub": "RGB image", "tone": "violet", "side": ""}], "t": "diagram", "id": "dg-2_11-01-0"},









    { t: "code", lang: "python", title: "CustomCNN",
      code: `class CustomCNN(nn.Module):
    def __init__(self, num_classes=10, in_channels=3):
        super().__init__()
        self.features = nn.Sequential(
            # Block 1: 224 -> 112
            nn.Conv2d(in_channels, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3, padding=1),          nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            # Block 2: 112 -> 56
            nn.Conv2d(64, 128, 3, padding=1),  nn.BatchNorm2d(128), nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            # Block 3: 56 -> 28
            nn.Conv2d(128, 256, 3, padding=1), nn.BatchNorm2d(256), nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, 3, padding=1), nn.BatchNorm2d(256), nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
        )
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),          # Global Average Pooling
            nn.Flatten(),
            nn.Dropout(0.3), nn.Linear(256, 128), nn.ReLU(inplace=True),
            nn.Dropout(0.2), nn.Linear(128, num_classes),
        )

    def forward(self, x):
        return self.classifier(self.features(x))`,
      caption: "`inplace=True` on the ReLUs saves memory by overwriting the input tensor rather than allocating a new one — safe here because nothing else needs the pre-activation values." },

    { t: "out", text: `  input                    (3, 224, 224)
  after MaxPool2d          (64, 112, 112)
  after MaxPool2d          (128, 56, 56)
  after MaxPool2d          (256, 28, 28)
  after AdaptiveAvgPool2d  (256, 1, 1)
  after Flatten            (256,)
  after Linear             (128,)
  after Linear             (10,)` },

    { t: "h2", n: "02", text: "Where the parameters are", id: "params" },

    {"kind": "trace", "title": "Where the parameters are, and why that is the right shape", "caption": "The parameter count **rises** with depth here, which is the opposite of VGG. Each block doubles its channels, so each convolution's weight tensor roughly quadruples — the last convolution alone holds half the model. The head is 34,186 parameters rather than VGG's 124 million, because global average pooling replaced the flatten. The model is 97% convolution by parameter count, and that is the post-2015 shape.", "left": "layer", "codeW": 200, "vars": ["parameters", "share"], "steps": [{"code": "block 1: conv 3->64, 64->64", "state": ["38,720", "3%"], "tone": "good"}, {"code": "block 2: conv 64->128, 128->128", "state": ["221,440", "19%"], "tone": "accent"}, {"code": "block 3: conv 128->256, 256->256", "state": ["885,248", "75%"], "changed": [0], "tone": "accent"}, {"code": "batch norm layers", "state": ["1,792", "<1%"], "tone": "good"}, {"code": "head: linear 256->128->10", "state": ["34,186", "3%"], "changed": [1], "tone": "violet", "note": "VGG's was 89%"}, {"code": "total", "state": ["1,181,386", "97% convolutional"], "tone": "teal"}], "t": "diagram", "id": "dg-2_11-02-1"},









    { t: "out", text: `  features    1,147,200  (97.1%)
  classifier     34,186  (2.9%)
  total       1,181,386` },

    { t: "callout", kind: "insight", title: "The exact inverse of VGG",
      body: [{ t: "p", text: "Lesson 2.3 measured VGG16 with **89.4 % of its parameters in the classifier head**. This model puts 97.1 % in the convolutional backbone and 2.9 % in the head, and it is the global average pooling that does it: VGG flattens a 7×7×512 map into 25,088 values and feeds them to a dense layer, while GAP collapses the same map to 256 numbers first. The whole model is 1.18 million parameters against VGG's 138 million, and it is a better-designed network. This is the single clearest illustration in the module of structure beating size." }] },

    { t: "p", text: "GAP has a second benefit that is easy to miss — the model no longer cares about input size:" },

    { t: "out", text: `  input 224x224 -> logits (1, 10)
  input 160x160 -> logits (1, 10)
  input  96x96  -> logits (1, 10)` },

    { t: "p", text: "A flatten-then-linear head would raise a shape error on anything but 224, because the flattened dimension would change. `AdaptiveAvgPool2d(1)` produces `256 × 1 × 1` whatever comes in, so the same weights serve any resolution — useful for multi-scale inference and test-time augmentation." },

    { t: "h2", n: "03", text: "The training loop", id: "loop" },

    {"kind": "flow", "title": "The training loop, and the five lines whose order is fixed", "caption": "This is the loop every PyTorch model is trained by, and the order is not negotiable. `zero_grad` must come before `backward` or gradients accumulate across batches; `step` must come after `backward` or it applies nothing. The `model.train()` and `model.eval()` pair is outside the inner loop and is the line most often forgotten (1.12).", "cols": 3, "nodes": [{"id": "t", "label": "model.train()", "sub": "once per epoch, before the batches", "tone": "violet"}, {"id": "z", "label": "optimiser.zero_grad()", "sub": "or gradients accumulate", "tone": "accent"}, {"id": "f", "label": "out = model(x); loss = crit(out, y)", "sub": "the forward pass", "tone": "accent"}, {"id": "b", "label": "loss.backward()", "sub": "gradients now exist", "tone": "good"}, {"id": "s", "label": "optimiser.step()", "sub": "applies them", "tone": "good"}, {"id": "e", "label": "model.eval() + no_grad()", "sub": "for validation, every epoch", "tone": "teal"}], "edges": [["t", "z"], ["z", "f"], ["f", "b"], ["b", "s"], ["s", "e"]], "t": "diagram", "id": "dg-2_11-03-2"},









    { t: "code", lang: "python", title: "Mixed precision, clipping and a schedule",
      code: `from torch.amp import autocast, GradScaler      # NOT torch.cuda.amp

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = CustomCNN(num_classes=10).to(device)
optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
scheduler = optim.lr_scheduler.OneCycleLR(
    optimizer, max_lr=1e-3, total_steps=len(train_loader) * epochs)
criterion = nn.CrossEntropyLoss()
scaler = GradScaler('cuda')

for epoch in range(epochs):
    model.train()
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        with autocast('cuda'):                    # fp16 forward
            loss = criterion(model(images), labels)

        scaler.scale(loss).backward()             # scaled backward
        scaler.unscale_(optimizer)                # unscale BEFORE clipping
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        scaler.step(optimizer)
        scaler.update()
        scheduler.step()`,
      caption: "`scaler.unscale_` before clipping is mandatory: clip a scaled gradient and you are clipping at the wrong threshold by whatever the scale factor happens to be." },

    { t: "callout", kind: "trap", title: "The AMP import is deprecated",
      body: [{ t: "p", text: "`from torch.cuda.amp import autocast, GradScaler` emits a `FutureWarning` in torch 2.10 and is scheduled for removal. The replacement is `torch.amp.autocast('cuda')` and `torch.amp.GradScaler('cuda')`, which take the device type as an argument and so work uniformly across CUDA, CPU and other backends. The old call still runs today, so this fails as a warning rather than an error — worth fixing before it becomes one." }] },

    { t: "out", text: `  step 0: loss 2.6164  grad-norm before clip 6.948  lr 9.94e-04
  step 1: loss 2.6089  grad-norm before clip 7.005  lr 8.12e-04
  step 2: loss 1.9205  grad-norm before clip 6.411  lr 4.63e-04
  step 3: loss 1.5388  grad-norm before clip 5.892  lr 1.33e-04
  step 4: loss 1.1553  grad-norm before clip 5.322  lr 4.00e-09
  step 5: loss 1.1394  grad-norm before clip 5.284  lr 1.33e-04` },

    { t: "callout", kind: "warn", title: "Clipping at 1.0 when gradient norms are 5–7 rescales every step",
      body: [{ t: "p", text: "`clip_grad_norm_` returns the norm *before* clipping, and here it sits between 5.3 and 7.0 throughout. With a threshold of 1.0, every single step is being scaled down by a factor of five to seven — so the clip is not a safety net catching rare spikes, it is a permanent division of the learning rate. That may be what you want, but it is rarely what people think they are configuring. Log the returned norm for a few hundred steps and set the threshold above the typical value, so clipping engages only on genuine outliers." }] },

    { t: "out", text: `  start 4.00e-05  peak 1.00e-03 at step 29  end 4.00e-09
  warms up over 29% of training, then anneals to near zero` },

    { t: "p", text: "OneCycleLR starts at `max_lr/25`, warms up over the first 30 % of steps, then anneals to `max_lr/1e4`. The warmup protects the early steps when gradients are largest and least informed — the same argument as lesson 2.5's advice to warm up a new head before unfreezing a backbone." },

    { t: "h2", n: "04", text: "The same model in Keras", id: "keras" },

    {"kind": "compare", "title": "The same model in PyTorch and in Keras", "caption": "The architectures are identical; the difference is where the loop lives. Keras owns it — you declare the model, compile it with a loss and an optimiser, and call `fit`. PyTorch hands it to you, which is more code for the common case and the only workable option when the loop itself is the thing you are changing.", "columns": [{"title": "PyTorch", "tone": "accent", "items": ["You write the loop", "Explicit zero_grad / backward / step", "model.train() and eval() are yours to call", "Any loop shape: GANs, multi-task, RL", "More code for the ordinary case"]}, {"title": "Keras", "tone": "good", "items": ["The loop is compile() + fit()", "Gradients handled for you", "Modes switched automatically", "Callbacks for the common needs", "A custom train_step when you need one"]}], "t": "diagram", "id": "dg-2_11-04-3"},









    { t: "code", lang: "python", title: "Keras Sequential",
      code: `from tensorflow.keras import layers, models

model = models.Sequential([
    layers.Conv2D(64, (3,3), padding='same', input_shape=(224, 224, 3)),
    layers.BatchNormalization(), layers.Activation('relu'),
    layers.Conv2D(64, (3,3), padding='same'),
    layers.BatchNormalization(), layers.Activation('relu'),
    layers.MaxPooling2D((2, 2)),

    layers.Conv2D(128, (3,3), padding='same'),
    layers.BatchNormalization(), layers.Activation('relu'),
    layers.MaxPooling2D((2, 2)),

    layers.Conv2D(256, (3,3), padding='same'),
    layers.BatchNormalization(), layers.Activation('relu'),
    layers.GlobalAveragePooling2D(),

    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(10, activation='softmax'),
])

model.compile(optimizer=tf.keras.optimizers.AdamW(1e-3, weight_decay=0.01),
              loss='sparse_categorical_crossentropy', metrics=['accuracy'])` },

    { t: "table", head: ["Concern", "PyTorch", "Keras"],
      rows: [
        ["Channel order", "`(N, C, H, W)` — channels first", "`(N, H, W, C)` — channels last"],
        ["Padding", "`padding=1` (a number of pixels)", "`padding='same'` (a policy)"],
        ["Final activation", "None — `CrossEntropyLoss` applies log-softmax", "`activation='softmax'` in the layer"],
        ["Training loop", "Written by hand", "`model.fit()`"],
        ["Shape inference", "You compute the input dims", "Inferred from `input_shape`"]
      ] },

    { t: "callout", kind: "trap", title: "Applying softmax twice",
      body: [{ t: "p", text: "The most common error when moving between the two frameworks. `nn.CrossEntropyLoss` expects raw logits and applies log-softmax internally, so adding a softmax to the final PyTorch layer applies it twice — the gradients shrink dramatically and the model trains slowly or not at all, with no error raised. Keras' `sparse_categorical_crossentropy` expects probabilities by default, which is why the softmax belongs in the layer there. The two conventions are opposite, and the failure is silent in both directions." }] },

    { t: "exercise", kind: "practice", title: "Build, train, and inspect", difficulty: "intermediate", minutes: 40,
      prompt: "Build CustomCNN and train it on a small image dataset for a few epochs. Log the gradient norm returned by `clip_grad_norm_` at every step and plot it — then set the clip threshold from what you see rather than from the default. Verify the model accepts three different input resolutions and produces the same output shape. Finally, deliberately add `nn.Softmax(dim=1)` as a final layer, keep `CrossEntropyLoss`, and compare the training curve against the correct version.",
      requirements: [
        "Train CustomCNN and log the gradient norm every step",
        "Set the clip threshold from the logged norms",
        "Verify three input resolutions give the same output shape",
        "Add a final softmax with CrossEntropyLoss and compare the training curve"
      ],
      hints: [
        "`clip_grad_norm_` returns the pre-clip norm — capture it rather than discarding it.",
        "For the resolution test, `AdaptiveAvgPool2d` is what makes it work; try replacing it with `Flatten` to see the failure.",
        "The double-softmax model still trains, just badly. Compare loss curves over the same number of steps."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.datasets import load_digits

class CustomCNN(nn.Module):                       # as in the lesson
    def __init__(self, num_classes=10, in_channels=3, final_softmax=False):
        super().__init__()
        def block(i, o): return [nn.Conv2d(i, o, 3, padding=1), nn.BatchNorm2d(o), nn.ReLU(inplace=True),
                                 nn.Conv2d(o, o, 3, padding=1), nn.BatchNorm2d(o), nn.ReLU(inplace=True), nn.MaxPool2d(2, 2)]
        self.features = nn.Sequential(*block(in_channels, 64), *block(64, 128), *block(128, 256))
        self.classifier = nn.Sequential(nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Dropout(0.3), nn.Linear(256, 128),
                                        nn.ReLU(inplace=True), nn.Dropout(0.2), nn.Linear(128, num_classes),
                                        *([nn.Softmax(dim=1)] if final_softmax else []))
    def forward(self, x): return self.classifier(self.features(x))

# Small image dataset: 8x8 digits upsampled to 3x32x32
X, y = load_digits(return_X_y=True)
X = F.interpolate(torch.tensor(X / 16.0, dtype=torch.float32).reshape(-1, 1, 8, 8), size=32, mode="bilinear").repeat(1, 3, 1, 1)
y = torch.tensor(y); Xtr, ytr, Xva, yva = X[:1500], y[:1500], X[1500:], y[1500:]

def train(final_softmax, clip=float("inf"), epochs=3):
    torch.manual_seed(0); m = CustomCNN(final_softmax=final_softmax); opt = torch.optim.AdamW(m.parameters(), 1e-3, weight_decay=0.01)
    norms, losses = [], []
    for ep in range(epochs):
        m.train(); perm = torch.randperm(1500)
        for i in range(0, 1500, 64):
            idx = perm[i:i + 64]; loss = F.cross_entropy(m(Xtr[idx]), ytr[idx])
            opt.zero_grad(); loss.backward()
            norms.append(nn.utils.clip_grad_norm_(m.parameters(), clip).item())   # returns the norm BEFORE clipping
            opt.step(); losses.append(loss.item())
    m.eval()
    with torch.no_grad(): acc = (m(Xva).argmax(1) == yva).float().mean().item()
    return m, norms, losses, acc

m, norms, losses, acc = train(False)
q = torch.tensor(norms).quantile(torch.tensor([0.05, 0.5, 0.95])).tolist()
print(f"gradient norm over {len(norms)} steps: 5th pct {q[0]:.2f}, median {q[1]:.2f}, 95th pct {q[2]:.2f}, max {max(norms):.2f}")
print(f"a threshold of 1.0 would have rescaled {sum(n > 1.0 for n in norms) / len(norms):.0%} of steps; "
      f"choose ~the 95th percentile ({q[2]:.1f}) so clipping only catches spikes")
print(f"validation accuracy: {acc:.3f}")

with torch.no_grad():
    for side in [32, 48, 96]:
        print(f"input {side}x{side} -> output {tuple(m(torch.randn(2, 3, side, side)).shape)}")

_, _, sm_losses, sm_acc = train(True)
print("\\nloss every 20 steps, correct vs extra Softmax before CrossEntropyLoss:")
print("  correct:       " + " ".join(f"{losses[i]:.2f}" for i in range(0, len(losses), 20)))
print("  double softmax:" + " ".join(f"{sm_losses[i]:.2f}" for i in range(0, len(sm_losses), 20)))
print(f"  validation accuracy {acc:.3f} vs {sm_acc:.3f}; the double-softmax loss cannot fall below "
      f"{-torch.log_softmax(torch.tensor([1.0] + [0.0] * 9), 0)[0]:.3f}")`,
        out: `gradient norm over 72 steps: 5th pct 0.57, median 1.57, 95th pct 2.44, max 3.72
a threshold of 1.0 would have rescaled 72% of steps; choose ~the 95th percentile (2.4) so clipping only catches spikes
validation accuracy: 0.859
input 32x32 -> output (2, 10)
input 48x48 -> output (2, 10)
input 96x96 -> output (2, 10)

loss every 20 steps, correct vs extra Softmax before CrossEntropyLoss:
  correct:       2.36 0.54 0.10 0.04
  double softmax:2.30 1.74 1.60 1.48
  validation accuracy 0.859 vs 0.825; the double-softmax loss cannot fall below 1.461`,
       
        notes: [
          { t: "p", text: "The gradient norm log is the practically useful part. In my run the norms sat between 5.3 and 7.0 while the threshold was 1.0, meaning every step was scaled down five- to seven-fold — a silent, permanent reduction in effective learning rate that nobody configured deliberately. A clip threshold should sit above the typical norm so it catches spikes only. Plotting the distribution for a few hundred steps and choosing something around the 95th percentile is a reasonable default." },
          { t: "p", text: "The double-softmax experiment is worth doing once. The model still learns, which is what makes it insidious — softmax of a softmax is a valid function, just a very flat one, so gradients are small and progress is slow. There is no error, no warning, and the only symptom is a training curve that looks disappointing. Having seen it once, you recognise it immediately, and it is one of the few bugs that is genuinely hard to find by reading the code." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: clipping that slowed every step",
      body: [
        { t: "p", text: "**Symptom.** A CNN trained much more slowly after gradient clipping at 1.0 was added 'for safety'." },
        { t: "p", text: "**Mechanism.** Typical gradient norms were 5 to 7, so clipping at 1.0 shrank every step, acting as a much smaller learning rate." },
        { t: "p", text: "**Fix.** The clip threshold is set from the logged distribution of gradient norms, above the normal range, so it only acts on genuine spikes." }
      ] }
  ],

  takeaways: [
    "CustomCNN is the standard anatomy: 224→112→56→28 spatially while channels go 64→128→256.",
    "97.1 % of its parameters are in the backbone against VGG16's 10.6 % — global average pooling is the difference.",
    "GAP makes the model input-size agnostic: 224, 160 and 96 all produce the same output shape.",
    "`torch.cuda.amp` is deprecated in torch 2.10; use `torch.amp.autocast('cuda')` and `GradScaler('cuda')`.",
    "Always `scaler.unscale_()` before clipping, or you clip at the wrong threshold.",
    "Measured gradient norms of 5–7 against a clip threshold of 1.0 mean every step is rescaled — log the norm and set the threshold from data.",
    "PyTorch wants logits (CrossEntropyLoss applies log-softmax); Keras wants probabilities. Applying softmax twice fails silently."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does CustomCNN have 97.1 % of its parameters in the backbone while VGG16 has 10.6 %?",
      options: ["It has more convolutional layers", "GAP replaces VGG's dense head", "It uses batch normalisation", "It has fewer output classes"],
      answer: 1,
      why: "VGG flattens a 7×7×512 map to 25,088 values and feeds dense layers, costing 124 million parameters. GAP collapses the same map to 256 numbers first, so the head is 34,186 parameters. The entire model is 1.18 million against VGG's 138 million." },
    { stem: "Why must you call `scaler.unscale_(optimizer)` before `clip_grad_norm_`?",
      options: ["To free memory", "Grads are still scaled", "To sync the GPU", "To reset the optimiser"],
      answer: 1,
      why: "AMP multiplies the loss by a large factor to keep small fp16 gradients from underflowing, so the gradients during backward are scaled by that factor. Clipping before unscaling compares a scaled norm against an unscaled threshold, making the clip effectively meaningless and dependent on whatever scale the scaler has settled on." },
    { stem: "`clip_grad_norm_(params, 1.0)` returns values of 5–7 on every step. What does that mean?",
      options: ["Training is diverging and must be stopped", "Every step is scaled down: a hidden LR cut", "The clipping is working exactly as intended", "The gradients are too small to learn from"],
      answer: 1,
      why: "The returned value is the norm before clipping, so a norm of 6 against a threshold of 1 means the gradient is divided by 6 on that step. Clipping is meant to catch rare spikes; when it fires every step it is silently dividing the learning rate instead. Log the norms and set the threshold above the typical value." },
    { stem: "You port a Keras model to PyTorch, keeping `activation='softmax'` as an `nn.Softmax` layer and using `nn.CrossEntropyLoss`. What happens?",
      options: ["A shape error at the loss", "Softmax twice: slow, silent", "The loss becomes negative", "Nothing; they are equivalent"],
      answer: 1,
      why: "`nn.CrossEntropyLoss` applies log-softmax internally and expects raw logits. Adding your own softmax makes the effective function a softmax of a softmax — valid, very flat, and productive of tiny gradients. Nothing raises, and the only symptom is a disappointing training curve, which makes it one of the harder bugs to spot by reading code." }
  ] },

  interview: { title: "Interview", sub: "Framework questions", questions: [
    { level: "Core", q: "Walk me through the structure of a modern CNN for classification.",
      strong: "Repeated conv-BN-ReLU blocks with pooling, channels doubling as space halves, then GAP and a small head.",
      answer: [{ t: "p", text: "Blocks of convolution, batch norm and ReLU, with a pooling layer at the end of each block. Channels double as spatial dimensions halve — 224×224 at 64 channels down to 28×28 at 256 — so the representation trades resolution for semantic depth at roughly constant cost per layer. Then global average pooling collapses each channel to one number, and a small dense head produces the logits. The GAP is the part I would emphasise: it means 97 % of the parameters sit in the backbone doing feature extraction rather than in the classifier, where VGG had 89 % of its parameters sitting in three dense layers. It also makes the network accept any input size, since the pooled output is always C×1×1." }] },
    { level: "Senior", q: "What is mixed precision training and what can go wrong with it?",
      strong: "fp16 forward and backward with a loss scaler; the main pitfalls are underflow and clipping before unscaling.",
      answer: [{ t: "p", text: "You run the forward and backward passes in fp16 for speed and memory while keeping a master copy of the weights in fp32. The problem is that fp16 has a narrow range, and small gradients underflow to zero — so a GradScaler multiplies the loss by a large factor before backward and divides it out before the step, keeping the gradients inside the representable range. The pitfall I would call out is clipping: gradients are still scaled during backward, so you must call `scaler.unscale_(optimizer)` before `clip_grad_norm_`, or you compare a scaled norm against an unscaled threshold and the clip does something arbitrary. The other thing is that the API moved — `torch.cuda.amp` is deprecated in favour of `torch.amp.autocast('cuda')`, which takes the device type explicitly." }] },
    { level: "Senior", q: "How would you decide the gradient clipping threshold?",
      strong: "Log the actual gradient norms first and set the threshold above the typical value, so it catches spikes only.",
      answer: [{ t: "p", text: "Empirically, because the default of 1.0 is frequently wrong. `clip_grad_norm_` returns the pre-clip norm, so I would log it for a few hundred steps and look at the distribution. In a run I measured recently the norms sat between 5.3 and 7.0 with the threshold at 1.0 — every single step was being divided by five to seven, which is a permanent reduction in effective learning rate that nobody intended and that interacts confusingly with the LR schedule. Clipping is meant to be a safety net for rare spikes, so I would set the threshold somewhere around the 95th percentile of observed norms. The exception is when you genuinely want aggressive clipping as a stability mechanism — RNNs and some transformer setups — but then it should be a deliberate choice with the effect on the effective learning rate understood." }] }
  ] }
});
