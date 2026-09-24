/* ============================================================================
   LESSON 2.11 — CNNs in PyTorch and Keras
   Mirrors 02_CNNs.md · §12 and §13. The reference's CustomCNN is built, its
   shapes traced and its training loop run (scratchpad/dl/d211.py). The AMP
   API it uses is deprecated in torch 2.10 — noted, with the replacement.
   ========================================================================= */
EC.receiveLesson({
  id: "2.11",

  lede: "**Everything in this module so far now assembles into one model class.** The reference's `CustomCNN` is the standard anatomy from lesson 2.2 — conv, batch norm, ReLU, pool, channels doubling as space halves — capped by the global average pooling head from lesson 2.3. This lesson builds it, traces every shape through it, runs the training loop end to end, and flags the one API in the reference that has since been deprecated.",

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

    { t: "callout", kind: "trap", title: "The reference's AMP import is deprecated",
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
      hints: [
        "`clip_grad_norm_` returns the pre-clip norm — capture it rather than discarding it.",
        "For the resolution test, `AdaptiveAvgPool2d` is what makes it work; try replacing it with `Flatten` to see the failure.",
        "The double-softmax model still trains, just badly. Compare loss curves over the same number of steps."
      ],
      solution: {
        notes: [
          { t: "p", text: "The gradient norm log is the practically useful part. In my run the norms sat between 5.3 and 7.0 while the threshold was 1.0, meaning every step was scaled down five- to seven-fold — a silent, permanent reduction in effective learning rate that nobody configured deliberately. A clip threshold should sit above the typical norm so it catches spikes only. Plotting the distribution for a few hundred steps and choosing something around the 95th percentile is a reasonable default." },
          { t: "p", text: "The double-softmax experiment is worth doing once. The model still learns, which is what makes it insidious — softmax of a softmax is a valid function, just a very flat one, so gradients are small and progress is slow. There is no error, no warning, and the only symptom is a training curve that looks disappointing. Having seen it once, you recognise it immediately, and it is one of the few bugs that is genuinely hard to find by reading the code." }
        ]
      } }

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
      options: ["It has more convolutional layers", "Global average pooling replaces VGG's flatten-plus-dense head", "It uses batch normalisation", "It has fewer classes"],
      answer: 1,
      why: "VGG flattens a 7×7×512 map to 25,088 values and feeds dense layers, costing 124 million parameters. GAP collapses the same map to 256 numbers first, so the head is 34,186 parameters. The entire model is 1.18 million against VGG's 138 million." },
    { stem: "Why must you call `scaler.unscale_(optimizer)` before `clip_grad_norm_`?",
      options: ["To free memory", "Gradients are still multiplied by the loss scale, so clipping would use the wrong threshold", "To synchronise the GPU", "To reset the optimiser state"],
      answer: 1,
      why: "AMP multiplies the loss by a large factor to keep small fp16 gradients from underflowing, so the gradients during backward are scaled by that factor. Clipping before unscaling compares a scaled norm against an unscaled threshold, making the clip effectively meaningless and dependent on whatever scale the scaler has settled on." },
    { stem: "`clip_grad_norm_(params, 1.0)` returns values of 5–7 on every step. What does that mean?",
      options: ["Training is diverging", "Every step is being scaled down five- to seven-fold — the clip is acting as a permanent LR reduction", "The clipping is working as intended", "The gradients are too small"],
      answer: 1,
      why: "The returned value is the norm before clipping, so a norm of 6 against a threshold of 1 means the gradient is divided by 6 on that step. Clipping is meant to catch rare spikes; when it fires every step it is silently dividing the learning rate instead. Log the norms and set the threshold above the typical value." },
    { stem: "You port a Keras model to PyTorch, keeping `activation='softmax'` as an `nn.Softmax` layer and using `nn.CrossEntropyLoss`. What happens?",
      options: ["A shape error", "Softmax is applied twice; the model trains slowly with no error", "The loss becomes negative", "Nothing — the two are equivalent"],
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
