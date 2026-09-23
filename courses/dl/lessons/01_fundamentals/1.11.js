/* ============================================================================
   LESSON 1.11 — The Same Network in Keras and PyTorch
   Mirrors 01_Neural_Network_Fundamentals.md · §13 (Keras Implementation)
   and §14 (PyTorch Implementation). Both reference programs are run on the
   scikit-learn breast-cancer table (30 features, binary), which is the
   n_features / binary-classification setting the programs are written for.
   ========================================================================= */
EC.receiveLesson({
  id: "1.11",

  lede: "**Two frameworks, one network: three ReLU layers with batch norm and dropout, a sigmoid output, Adam or AdamW, early stopping and a learning-rate schedule.** Keras declares the model, compiles it with a loss and metrics, and calls fit() with callbacks — the fastest path from idea to a trained prototype. PyTorch subclasses nn.Module and writes the training loop out — every zero_grad, backward and step visible, which is why research prefers it. This lesson runs the reference's two programs on the same tabular dataset, reads the Keras summary against the parameter arithmetic of lesson 1.1, walks the PyTorch loop line by line against lessons 1.4 to 1.9, and ends with both models at 96 % test accuracy.",

  objectives: [
    "Build, compile and fit the reference's Keras model with early stopping, plateau scheduling and checkpointing, and read its summary",
    "Write the reference's MLPClassifier as an nn.Module built from a list of hidden sizes",
    "Write a PyTorch training loop with an optimiser, a scheduler, gradient clipping and a validation pass, and say what each line does",
    "Explain why BCEWithLogitsLoss takes logits and where the sigmoid went",
    "Count a model's parameters in both frameworks and account for batch norm's trainable and non-trainable ones"
  ],

  prerequisites: ["1.7", "1.8", "1.9", "1.10"],

  blocks: [

    { t: "h2", n: "01", text: "The data", id: "data" },

    { t: "p", text: "Both reference programs take `n_features` inputs and produce one sigmoid output — a binary classifier on a table. The scikit-learn breast-cancer dataset is that: 569 tumours, 30 measured features, malignant or benign. Split into 400 for training, 69 for validation (the callbacks and the scheduler watch it) and 100 held out, and standardised with statistics from the training split only." },

    { t: "code", lang: "python", title: "One split and one scaler for both frameworks",
      code: `from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X, y = load_breast_cancer(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=100, random_state=0, stratify=y)
X_train, X_val, y_train, y_val = train_test_split(X_tr, y_tr, test_size=69, random_state=0, stratify=y_tr)
sc = StandardScaler().fit(X_train)
X_train, X_val, X_te = sc.transform(X_train), sc.transform(X_val), sc.transform(X_te)
n_features = X_train.shape[1]` },

    { t: "out", text: `breast cancer: 30 features, train 400, val 69, test 100, positives 0.627` },

    { t: "h2", n: "02", text: "Keras", id: "keras" },

    { t: "code", lang: "python", title: "The reference's Keras program",
      code: `import tensorflow as tf
from tensorflow.keras import layers, models, callbacks

# build
model = models.Sequential([
    layers.Input(shape=(n_features,)),
    layers.Dense(256, activation='relu', kernel_initializer='he_normal'),
    layers.BatchNormalization(),
    layers.Dropout(0.3),
    layers.Dense(128, activation='relu', kernel_initializer='he_normal'),
    layers.BatchNormalization(),
    layers.Dropout(0.3),
    layers.Dense(64, activation='relu', kernel_initializer='he_normal'),
    layers.Dense(1, activation='sigmoid')          # binary classification
])

# compile: optimiser, loss and the metrics to report
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss='binary_crossentropy',
    metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
)

# callbacks: lessons 1.7 and 1.9 as objects
cb = [
    callbacks.EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True),
    callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5),
    callbacks.ModelCheckpoint('best_model.keras', save_best_only=True),
]

# train
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=100, batch_size=32,
    callbacks=cb, verbose=1
)`,
      caption: "Keras 3 takes the input shape as an Input layer rather than the input_shape argument of the reference's Dense; nothing else changed. Run on TensorFlow 2.21, CPU." },

    { t: "out", text: `Keras: stopped after 19 epochs (6 s); params 50,689
  epoch   1: loss 0.4330 acc 0.7800 auc 0.9088 | val_loss 0.3951 val_acc 0.8841 val_auc 0.9553 | lr 1.00e-03
  epoch   5: loss 0.0733 acc 0.9600 auc 0.9971 | val_loss 0.1253 val_acc 0.9565 val_auc 0.9767 | lr 1.00e-03
  epoch  10: loss 0.0603 acc 0.9775 auc 0.9979 | val_loss 0.1261 val_acc 0.9710 val_auc 0.9736 | lr 1.00e-03
  epoch  19: loss 0.0344 acc 0.9900 auc 0.9991 | val_loss 0.1611 val_acc 0.9565 val_auc 0.9767 | lr 5.00e-04
  test: loss 0.1073 acc 0.9600 auc 0.9936` },

    { t: "p", text: "Every callback did its job in a 19-epoch run. The best validation loss came around epoch 9; ReduceLROnPlateau halved the rate after five epochs without improvement (the lr column reads 5 × 10⁻⁴ at epoch 19); EarlyStopping fired after ten, and `restore_best_weights=True` put the epoch-9 weights back before evaluation. The test set — 100 tumours the model never saw — comes out at 96 % accuracy and an AUC of 0.994." },

    { t: "code", lang: "text", title: "model.summary(), and the arithmetic behind it",
      code: `Layer (type)                    Output Shape        Param #
dense (Dense)                   (None, 256)           7,936      30·256 + 256
batch_normalization             (None, 256)           1,024      4 per unit: γ, β (trained) + running mean, var (not)
dropout (Dropout)               (None, 256)               0
dense_1 (Dense)                 (None, 128)          32,896      256·128 + 128
batch_normalization_1           (None, 128)             512
dropout_1 (Dropout)             (None, 128)               0
dense_2 (Dense)                 (None, 64)            8,256      128·64 + 64
dense_3 (Dense)                 (None, 1)                65      64·1 + 1
 Total params: 150,533       Trainable: 49,921    Non-trainable: 768    Optimizer: 99,844`,
      caption: "The dense counts are lesson 1.1's formula. Batch norm carries four numbers per unit, two of them trained (γ, β) and two running statistics (lesson 1.8); the 768 non-trainable are the running means and variances of the two norm layers. The 99,844 optimiser parameters are Adam's m and v — two per trainable weight — which is why Adam needs three times a model's memory." },

    { t: "h2", n: "03", text: "PyTorch", id: "pytorch" },

    { t: "code", lang: "python", title: "The reference's MLPClassifier",
      code: `import torch, torch.nn as nn, torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

class MLPClassifier(nn.Module):
    def __init__(self, input_dim, hidden_dims=[256, 128, 64], dropout=0.3):
        super().__init__()
        layers_list = []
        prev_dim = input_dim
        for h_dim in hidden_dims:                       # one block per hidden size
            layers_list.extend([
                nn.Linear(prev_dim, h_dim),
                nn.BatchNorm1d(h_dim),                  # after the linear, before the activation
                nn.ReLU(),
                nn.Dropout(dropout),
            ])
            prev_dim = h_dim
        layers_list.append(nn.Linear(prev_dim, 1))      # a LOGIT — no sigmoid here
        self.network = nn.Sequential(*layers_list)

    def forward(self, x):
        return self.network(x).squeeze(-1)             # (batch, 1) → (batch,)`,
      caption: "The same three hidden sizes, built from a list so the depth is a parameter. Two differences from the Keras model: batch norm goes before the ReLU, and the output is a raw logit because the sigmoid lives inside the loss." },

    { t: "code", lang: "python", title: "The reference's training loop, annotated",
      code: `device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = MLPClassifier(input_dim=n_features).to(device)
optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)     # lesson 1.5
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)       # lesson 1.9
criterion = nn.BCEWithLogitsLoss()      # sigmoid + BCE in one numerically stable op — lesson 1.3

for epoch in range(100):
    model.train()                                     # dropout on, batch norm uses batch stats
    total_loss = 0
    for X_batch, y_batch in train_loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)
        optimizer.zero_grad()                         # gradients accumulate by default; clear them
        logits = model(X_batch)                       # forward — lesson 1.3
        loss = criterion(logits, y_batch.float())
        loss.backward()                               # autograd — lesson 1.4
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)   # lesson 1.12
        optimizer.step()                              # the update — lesson 1.5
        total_loss += loss.item()
    scheduler.step()                                  # once per epoch, after the optimiser

    model.eval()                                      # dropout off, batch norm uses running stats
    with torch.no_grad():                             # no graph, no memory for activations
        val_logits = model(X_val_tensor.to(device))
        val_loss = criterion(val_logits, y_val_tensor.to(device).float())
    print(f"Epoch {epoch}: train_loss={total_loss/len(train_loader):.4f}, "
          f"val_loss={val_loss:.4f}, lr={scheduler.get_last_lr()[0]:.6f}")`,
      caption: "Every line of the loop is one lesson of this module made explicit. Keras runs the same sequence inside fit(); PyTorch makes you write it, which is the cost and the point." },

    { t: "out", text: `PyTorch: device cpu, params 50,049
  Epoch 0: train_loss=0.4942, val_loss=0.4204, lr=0.001000
  Epoch 4: train_loss=0.1303, val_loss=0.1592, lr=0.000994
  Epoch 9: train_loss=0.0754, val_loss=0.1512, lr=0.000976
  Epoch 19: train_loss=0.0596, val_loss=0.1910, lr=0.000905
  Epoch 49: train_loss=0.0770, val_loss=0.2203, lr=0.000500
  Epoch 99: train_loss=0.0516, val_loss=0.1846, lr=0.000000
  test: acc 0.9600 auc 0.9961  (6 s)` },

    { t: "p", text: "The PyTorch loop has no early stopping — the reference's loop runs the full hundred epochs on the cosine schedule — and the validation loss shows what that costs: it bottoms out near epoch 9 at 0.151 and then drifts up to 0.18–0.22 as the model overfits 400 examples, with dropout and weight decay holding it from going further. The cosine schedule takes the rate to zero by epoch 99, which freezes the model wherever it is. Test accuracy is the same 96 % as Keras, AUC 0.996; the two frameworks, given the same architecture and data, land in the same place." },

    { t: "callout", kind: "trap", title: "Where the sigmoid went",
      body: [{ t: "p", text: "The Keras model ends in Dense(1, activation='sigmoid') and uses loss='binary_crossentropy'. The PyTorch model ends in nn.Linear(prev_dim, 1) with no activation and uses BCEWithLogitsLoss, which applies the sigmoid inside the loss using the log-sum-exp trick so that a logit of −100 does not produce log(0). To get probabilities from the PyTorch model at inference you apply torch.sigmoid yourself; to get them from Keras you do not. Mixing the conventions — a sigmoid in the model *and* a with-logits loss — trains, badly, and is silent." }] },

    { t: "h2", n: "04", text: "Side by side", id: "compare" },

    { t: "table", head: ["", "Keras", "PyTorch"],
      rows: [
        ["Model", "Sequential list of layers", "nn.Module subclass with a forward()"],
        ["Loss and optimiser", "compile(optimizer, loss, metrics)", "Objects you call yourself"],
        ["Training loop", "fit() — hidden", "Written out: zero_grad, forward, loss, backward, step"],
        ["Early stopping, LR on plateau, checkpoints", "Callbacks", "Code in the loop (lessons 1.7, 1.9)"],
        ["Train/eval modes", "Handled by fit() and predict()", "model.train() / model.eval(), your responsibility"],
        ["Output activation", "In the model", "In the loss (with-logits)"],
        ["Device", "Automatic", "Explicit .to(device) on model and every batch"],
        ["Where it is used", "Prototypes, production pipelines in TensorFlow", "Research, and increasingly production"]
      ] },

    { t: "viz", title: "The training step, as both frameworks execute it",
      caption: "The same seven operations in the same order. Keras runs them inside fit() and exposes hooks (callbacks) between epochs; PyTorch hands you the loop and the responsibility for train/eval mode, device placement and clearing gradients.",
      svg: `<svg viewBox="0 0 760 200" role="img" aria-label="The seven operations of one training step">
<defs><marker id="ah111" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<g>
  <rect x="16" y="60" width="92" height="56" rx="9" class="s-fill s-stroke" stroke-width="1.4"/><text x="62" y="84" text-anchor="middle" class="s-label">batch</text><text x="62" y="102" text-anchor="middle" class="s-sub">DataLoader</text>
  <rect x="122" y="60" width="92" height="56" rx="9" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="1.4"/><text x="168" y="84" text-anchor="middle" class="s-label">forward</text><text x="168" y="102" text-anchor="middle" class="s-sub">logits</text>
  <rect x="228" y="60" width="92" height="56" rx="9" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)" stroke-width="1.4"/><text x="274" y="84" text-anchor="middle" class="s-label">loss</text><text x="274" y="102" text-anchor="middle" class="s-sub">BCE with logits</text>
  <rect x="334" y="60" width="92" height="56" rx="9" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)" stroke-width="1.4"/><text x="380" y="84" text-anchor="middle" class="s-label">backward</text><text x="380" y="102" text-anchor="middle" class="s-sub">autograd</text>
  <rect x="440" y="60" width="92" height="56" rx="9" class="s-fill s-stroke" stroke-width="1.4"/><text x="486" y="84" text-anchor="middle" class="s-label">clip</text><text x="486" y="102" text-anchor="middle" class="s-sub">max norm 1.0</text>
  <rect x="546" y="60" width="92" height="56" rx="9" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="1.4"/><text x="592" y="84" text-anchor="middle" class="s-label">step</text><text x="592" y="102" text-anchor="middle" class="s-sub">AdamW</text>
  <rect x="652" y="60" width="92" height="56" rx="9" class="s-fill s-stroke" stroke-width="1.4"/><text x="698" y="84" text-anchor="middle" class="s-label">schedule</text><text x="698" y="102" text-anchor="middle" class="s-sub">per epoch</text>
  <line x1="108" y1="88" x2="120" y2="88" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah111)"/>
  <line x1="214" y1="88" x2="226" y2="88" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah111)"/>
  <line x1="320" y1="88" x2="332" y2="88" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah111)"/>
  <line x1="426" y1="88" x2="438" y2="88" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah111)"/>
  <line x1="532" y1="88" x2="544" y2="88" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah111)"/>
  <line x1="638" y1="88" x2="650" y2="88" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah111)"/>
  <text x="62" y="40" text-anchor="middle" class="s-sub">zero_grad() first</text>
  <text x="380" y="150" text-anchor="middle" class="s-sub">Keras: all of this is inside model.fit(); callbacks run between epochs</text>
  <text x="380" y="172" text-anchor="middle" class="s-sub">PyTorch: you write it, and you call model.train() before and model.eval() + no_grad() for validation</text>
</g></svg>` },

    { t: "exercise", kind: "practice", title: "Give the PyTorch loop what the Keras callbacks have", difficulty: "core", minutes: 20,
      body: [{ t: "p", text: "Add early stopping with patience 10 and best-weight restoration to the reference's PyTorch loop (lesson 1.7's pattern), keeping the cosine schedule. Report the epoch it stops at, the restored epoch's validation loss, and the test accuracy and AUC. Compare with the 100-epoch run's 0.1846 final validation loss." }],
      requirements: [
        "A best_val_loss / counter / torch.save pattern inside the epoch loop",
        "load_state_dict of the best checkpoint before evaluating on the test set",
        "The three numbers"
      ],
      hint: "Save `model.state_dict()` when val_loss improves; break when the counter reaches 10; the restored model should be evaluated in eval mode.",
      solution: { lang: "python", title: "Solution sketch",
        code: `best, counter, patience = float("inf"), 0, 10
for epoch in range(100):
    ...  # train and validate as in the reference loop
    if val_loss < best:
        best, counter = val_loss.item(), 0; torch.save(model.state_dict(), "best.pt")
    else:
        counter += 1
        if counter >= patience: print(f"early stop at epoch {epoch}"); break
model.load_state_dict(torch.load("best.pt")); model.eval()
# expect: stops around epoch 19-25, restored val loss ≈ 0.15, test accuracy ≈ 0.96`,
        notes: [{ t: "p", text: "The restored validation loss is lower than the 100-epoch run's final 0.18, and the test numbers are about the same — on this small, easy dataset the overfitting that early stopping prevents costs little in accuracy. On a harder task the gap between the best epoch and the last one is where early stopping earns its keep." }] } }
  ],

  takeaways: [
    "Keras: declare the layers, compile with optimiser, loss and metrics, fit with callbacks; PyTorch: subclass nn.Module and write the loop — zero_grad, forward, loss, backward, clip, step, schedule.",
    "Both reference programs, on the breast-cancer table, reach 96 % test accuracy and AUC above 0.99 in six seconds on a CPU.",
    "Keras callbacks did lesson 1.7 and 1.9's work automatically: early stopping at epoch 19, learning rate halved on plateau, best weights restored; the PyTorch loop as written has no early stopping and overfits mildly over 100 epochs.",
    "The Keras model has the sigmoid in the last layer with 'binary_crossentropy'; the PyTorch model outputs a logit and uses BCEWithLogitsLoss, which is more stable — do not do both.",
    "model.train() and model.eval() switch dropout and batch norm; validation runs under torch.no_grad() so no activations are stored.",
    "Batch norm adds four parameters per unit, two trained and two running statistics; Adam adds two optimiser slots per trained weight — the summary's 150,533 total against 49,921 trainable."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does the PyTorch model's last layer have no sigmoid?",
      options: ["PyTorch cannot apply sigmoids", "BCEWithLogitsLoss applies the sigmoid inside the loss, numerically stably, so the model outputs a raw logit", "The sigmoid is in the DataLoader", "Because batch norm replaces it"],
      answer: 1,
      why: "Combining sigmoid and binary cross-entropy in one operation lets the loss use the log-sum-exp trick and never evaluate log(0) for an extreme logit. The model therefore ends in nn.Linear; at inference you apply torch.sigmoid yourself to get probabilities." },
    { stem: "What does optimizer.zero_grad() do, and why is it needed every step?",
      options: ["It resets the learning rate", "It clears the .grad buffers, which otherwise accumulate across backward() calls", "It re-initialises the weights", "It disables dropout"],
      answer: 1,
      why: "PyTorch adds each backward pass's gradients into the parameters' .grad tensors rather than replacing them, so that gradient accumulation across micro-batches is possible. For an ordinary step you must clear them first, or the update uses the sum of this and every previous batch's gradient." },
    { stem: "In the Keras summary, why are 768 parameters non-trainable?",
      options: ["Dropout has parameters", "They are the running means and variances of the two batch-norm layers, updated by averaging rather than by gradient", "The output layer is frozen", "He initialisation freezes the first layer"],
      answer: 1,
      why: "Each BatchNormalization layer holds γ and β (trained) plus a running mean and variance per unit (updated as moving averages during training, used at inference). 2 × (256 + 128) = 768 running statistics, matching the 1,024 + 512 total batch-norm parameters minus the 768 trainable γ and β." },
    { stem: "The PyTorch run's validation loss fell to 0.15 at epoch 9 and ended at 0.18 at epoch 99. What does that indicate, and what would fix it?",
      options: ["Underfitting; train longer", "Mild overfitting after epoch 9; early stopping with best-weight restoration, as the Keras callbacks did", "A learning rate that is too low", "A bug in the DataLoader"],
      answer: 1,
      why: "Training loss kept falling while validation loss rose from its epoch-9 minimum — the reference's definition of overfitting. The reference's PyTorch loop has no early stopping; adding lesson 1.7's pattern, or a Keras-style callback, restores the epoch-9 weights. Test accuracy was the same either way on this easy dataset." }
  ] },

  interview: { title: "Interview", sub: "Framework questions that come up", questions: [
    { level: "Core", q: "What happens in one PyTorch training step, line by line?",
      strong: "zero the gradients, forward to logits, loss, backward, optionally clip, optimiser step; scheduler once per epoch; eval mode and no_grad for validation.",
      answer: [{ t: "p", text: "model.train() sets dropout and batch norm to training behaviour. For each batch: move it to the device; optimizer.zero_grad() clears accumulated gradients; logits = model(x) runs the forward pass and records the graph; loss = criterion(logits, y) computes the objective; loss.backward() runs reverse-mode autodiff and fills every parameter's .grad; clip_grad_norm_ rescales them if their norm exceeds the limit; optimizer.step() applies the update rule (AdamW here). After the epoch, scheduler.step() adjusts the learning rate. Validation switches to model.eval() so dropout is off and batch norm uses running statistics, and runs under torch.no_grad() so no graph or activations are stored." }] },
    { level: "Core", q: "Why is BCEWithLogitsLoss preferred over a sigmoid layer followed by BCELoss?",
      strong: "Numerical stability: the combined form uses log-sum-exp and never takes the log of a saturated sigmoid.",
      answer: [{ t: "p", text: "A sigmoid output for a logit of 40 is 1.0 in float32 exactly, so log(1 − ŷ) is log(0) = −inf and the gradient is NaN. BCEWithLogitsLoss computes the loss directly from the logit as max(z, 0) − z·y + log(1 + e^{−|z|}), which is finite for any z and has the clean gradient σ(z) − y from lesson 1.4. Keras hides the same issue by fusing sigmoid and binary_crossentropy internally when it can; in PyTorch the fused version is the explicit choice and the model should output logits." }] },
    { level: "Senior", q: "When would you pick Keras over PyTorch, or the reverse, for a project?",
      strong: "Keras for a fast tabular or standard-architecture prototype and TensorFlow-based serving; PyTorch for anything custom, research, or the modern model ecosystem.",
      answer: [{ t: "p", text: "For a standard architecture on tabular or image data where the training loop needs nothing unusual, Keras gets to a trained, checkpointed, early-stopped model in the fewest lines, and TensorFlow Serving and TFLite are mature deployment paths. For anything that touches the loop — custom losses over several outputs, gradient accumulation, mixed precision with manual scaling, unusual sampling, research code — PyTorch's explicit loop is easier to reason about and debug, and the ecosystem of pretrained models, libraries and papers is overwhelmingly PyTorch. Both produce the same model from the same architecture, as the two 96 % results here show; the choice is about the surrounding code and the team, not the maths." }] }
  ] }
});
