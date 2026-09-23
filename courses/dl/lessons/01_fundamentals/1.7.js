/* ============================================================================
   LESSON 1.7 — Regularisation
   Mirrors 01_Neural_Network_Fundamentals.md · §8 (L2 Regularization,
   Dropout with the PyTorch Net, MC Dropout with the reference's function,
   Early Stopping with the reference's loop) and §21 Q5 and Q8. The
   reference's Net is trained on MNIST with and without each technique; its
   mc_dropout_predict and early-stopping loop are run as written.
   ========================================================================= */
EC.receiveLesson({
  id: "1.7",

  lede: "**Regularisation is whatever stops a network memorising the training set instead of learning what generalises, and the reference gives four ways: penalise large weights, switch units off at random, stop when validation loss turns, and augment the data.** Each attacks overfitting from a different side. This lesson works the L2 penalty and its gradient on a matrix, shows exactly what `nn.Dropout` does to a tensor in training and in evaluation, runs the reference's dropout network on MNIST four ways, runs its Monte Carlo dropout function to get uncertainty out of the same network, and runs its early-stopping loop until the patience counter fires.",

  objectives: [
    "Write the L2-regularised loss and its gradient, and relate λ to weight decay",
    "State what dropout does in training and at inference, why inverted dropout scales by 1/(1 − p), and the typical rates per layer",
    "Explain dropout as an ensemble of 2ⁿ sub-networks",
    "Use MC dropout to get a mean prediction and an uncertainty, and use the uncertainty to flag examples for review",
    "Implement early stopping with patience and checkpoint restoration"
  ],

  prerequisites: ["1.5", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "L2 regularisation, or weight decay", id: "l2" },

    { t: "math", tex: "\\mathcal{L}_{\\text{reg}} = \\mathcal{L}_{\\text{data}} + \\frac{\\lambda}{2}\\sum_{l}\\big\\|\\mathbf{W}^{[l]}\\big\\|_F^2" },

    { t: "p", text: "The Frobenius norm squared is the sum of every weight squared, so the penalty grows with the size of the weights and its gradient with respect to W is simply λW. Every update therefore subtracts αλW from the weights in addition to the data gradient — they *decay* towards zero unless the data pushes back, which is where the name comes from. Large weights mean a function that swings hard on small input changes; keeping them small keeps the function smooth." },

    { t: "code", lang: "python", title: "The penalty and its gradient on a 2 × 2 weight matrix",
      code: `import torch
W = torch.tensor([[0.5, -1.0], [2.0, 0.1]]); lam = 0.01
print(f"||W||_F^2 = {(W ** 2).sum():.2f}")
print(f"penalty λ/2·||W||² = {lam / 2 * (W ** 2).sum():.4f}")
print("gradient λW =\\n", lam * W)`,
      caption: "0.25 + 1 + 4 + 0.01 = 5.26. The gradient of the penalty is proportional to each weight, so the 2.0 entry is pulled towards zero twenty times harder than the 0.1 entry." },

    { t: "out", text: `||W||_F^2 = 5.26
penalty λ/2·||W||² = 0.0263
gradient λW =
 tensor([[ 0.0050, -0.0100],
        [ 0.0200,  0.0010]])` },

    { t: "callout", kind: "note", title: "In PyTorch: weight_decay",
      body: [{ t: "p", text: "`torch.optim.SGD(..., weight_decay=λ)` adds λW to the gradient, which is exactly this penalty. With Adam the same argument is L2-in-the-gradient and behaves unevenly across parameters; `AdamW` applies the decay to the weights directly (lesson 1.5). Either way, the usual practice is to decay weights but not biases or normalisation parameters." }] },

    { t: "h2", n: "02", text: "Dropout", id: "dropout" },

    { t: "code", lang: "text", title: "The rule",
      code: `TRAINING:   randomly set a fraction p of a layer's units to 0 on every forward pass
            → the network cannot rely on any particular unit being present
            → each pass trains a different sub-network; with n units there are 2ⁿ of them
            → the trained network is, in effect, an ensemble of all of them

INFERENCE:  use every unit, scaled so the expected activation matches training
            inverted dropout scales the SURVIVORS by 1/(1−p) during training instead,
            so nothing needs to change at inference — this is what nn.Dropout does

TYPICAL p:  input layer 0.0–0.2 · hidden layers 0.2–0.5 · final layers 0.3–0.5
            lower for shallow networks, higher for large overfit-prone ones`,
      caption: "Dropout is a training-time operation. The only thing it does at inference is nothing — which is why forgetting model.eval() is one of the classic bugs." },

    { t: "code", lang: "python", title: "What nn.Dropout(0.3) does to a tensor of ones",
      code: `import torch, torch.nn as nn
x = torch.ones(1, 10); d = nn.Dropout(0.3)
d.train(); print("train mode:", d(x))
d.eval();  print("eval mode: ", d(x))
big = torch.ones(100000); d.train(); out = d(big)
print(f"fraction zeroed {(out == 0).float().mean():.4f}, surviving value {out.max():.4f} = 1/(1-0.3), mean {out.mean():.4f}")`,
      caption: "In training, 30 % of entries become 0 and the rest become 1/0.7 = 1.4286, so the mean stays at 1. In eval mode the layer is the identity. The survivors are chosen afresh on every call." },

    { t: "out", text: `train mode: tensor([[0.0000, 0.0000, 1.4286, 0.0000, 1.4286, 0.0000, 1.4286, 1.4286, 1.4286, 1.4286]])
eval mode:  tensor([[1., 1., 1., 1., 1., 1., 1., 1., 1., 1.]])
fraction zeroed 0.3007, surviving value 1.4286 = 1/(1-0.3), mean 0.9990` },

    { t: "viz", title: "One network, many sub-networks",
      caption: "Each training pass switches off a random subset of hidden units (greyed). The weights that survive are updated as if the smaller network were the whole model. Over training, every unit has learned to be useful without any particular neighbour — no co-adaptation — and at inference the full network averages what all the sub-networks learned.",
      svg: `<svg viewBox="0 0 760 240" role="img" aria-label="Dropout: three random sub-networks of one network">
<g>
  <text x="130" y="22" text-anchor="middle" class="s-label">pass 1</text>
  <text x="380" y="22" text-anchor="middle" class="s-label">pass 2</text>
  <text x="630" y="22" text-anchor="middle" class="s-label">inference: all units</text>
  <g transform="translate(30,40)">
    <g style="stroke:var(--line);stroke-opacity:.5" stroke-width="1">
      <line x1="20" y1="30" x2="100" y2="30"/><line x1="20" y1="30" x2="100" y2="130"/><line x1="20" y1="80" x2="100" y2="30"/><line x1="20" y1="80" x2="100" y2="130"/><line x1="20" y1="130" x2="100" y2="30"/><line x1="20" y1="130" x2="100" y2="130"/>
      <line x1="100" y1="30" x2="180" y2="80"/><line x1="100" y1="130" x2="180" y2="80"/>
    </g>
    <circle cx="20" cy="30" r="10" class="s-fill s-stroke" stroke-width="1.3"/><circle cx="20" cy="80" r="10" class="s-fill s-stroke" stroke-width="1.3"/><circle cx="20" cy="130" r="10" class="s-fill s-stroke" stroke-width="1.3"/>
    <circle cx="100" cy="30" r="10" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.3"/>
    <circle cx="100" cy="80" r="10" style="fill:var(--surface-2);stroke:var(--ink-3);stroke-dasharray:3 2" stroke-width="1.2"/>
    <circle cx="100" cy="130" r="10" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.3"/>
    <circle cx="100" cy="180" r="10" style="fill:var(--surface-2);stroke:var(--ink-3);stroke-dasharray:3 2" stroke-width="1.2"/>
    <circle cx="180" cy="80" r="10" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)" stroke-width="1.3"/>
  </g>
  <g transform="translate(280,40)">
    <g style="stroke:var(--line);stroke-opacity:.5" stroke-width="1">
      <line x1="20" y1="30" x2="100" y2="80"/><line x1="20" y1="30" x2="100" y2="180"/><line x1="20" y1="80" x2="100" y2="80"/><line x1="20" y1="80" x2="100" y2="180"/><line x1="20" y1="130" x2="100" y2="80"/><line x1="20" y1="130" x2="100" y2="180"/>
      <line x1="100" y1="80" x2="180" y2="80"/><line x1="100" y1="180" x2="180" y2="80"/>
    </g>
    <circle cx="20" cy="30" r="10" class="s-fill s-stroke" stroke-width="1.3"/><circle cx="20" cy="80" r="10" class="s-fill s-stroke" stroke-width="1.3"/><circle cx="20" cy="130" r="10" class="s-fill s-stroke" stroke-width="1.3"/>
    <circle cx="100" cy="30" r="10" style="fill:var(--surface-2);stroke:var(--ink-3);stroke-dasharray:3 2" stroke-width="1.2"/>
    <circle cx="100" cy="80" r="10" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.3"/>
    <circle cx="100" cy="130" r="10" style="fill:var(--surface-2);stroke:var(--ink-3);stroke-dasharray:3 2" stroke-width="1.2"/>
    <circle cx="100" cy="180" r="10" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.3"/>
    <circle cx="180" cy="80" r="10" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)" stroke-width="1.3"/>
  </g>
  <g transform="translate(530,40)">
    <g style="stroke:var(--line);stroke-opacity:.5" stroke-width="1">
      <line x1="20" y1="30" x2="100" y2="30"/><line x1="20" y1="30" x2="100" y2="80"/><line x1="20" y1="30" x2="100" y2="130"/><line x1="20" y1="30" x2="100" y2="180"/>
      <line x1="20" y1="80" x2="100" y2="30"/><line x1="20" y1="80" x2="100" y2="80"/><line x1="20" y1="80" x2="100" y2="130"/><line x1="20" y1="80" x2="100" y2="180"/>
      <line x1="20" y1="130" x2="100" y2="30"/><line x1="20" y1="130" x2="100" y2="80"/><line x1="20" y1="130" x2="100" y2="130"/><line x1="20" y1="130" x2="100" y2="180"/>
      <line x1="100" y1="30" x2="180" y2="80"/><line x1="100" y1="80" x2="180" y2="80"/><line x1="100" y1="130" x2="180" y2="80"/><line x1="100" y1="180" x2="180" y2="80"/>
    </g>
    <circle cx="20" cy="30" r="10" class="s-fill s-stroke" stroke-width="1.3"/><circle cx="20" cy="80" r="10" class="s-fill s-stroke" stroke-width="1.3"/><circle cx="20" cy="130" r="10" class="s-fill s-stroke" stroke-width="1.3"/>
    <circle cx="100" cy="30" r="10" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.3"/><circle cx="100" cy="80" r="10" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.3"/><circle cx="100" cy="130" r="10" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.3"/><circle cx="100" cy="180" r="10" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)" stroke-width="1.3"/>
    <circle cx="180" cy="80" r="10" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)" stroke-width="1.3"/>
  </g>
  <text x="380" y="232" text-anchor="middle" class="s-sub">dashed units are dropped for that pass; with 4 hidden units there are 2⁴ = 16 possible sub-networks</text>
</g></svg>` },

    { t: "h3", text: "The reference's network, trained four ways" },

    { t: "code", lang: "python", title: "Dropout in a module — the reference's Net",
      code: `import torch.nn as nn, torch.nn.functional as F

class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(784, 256)
        self.drop1 = nn.Dropout(0.3)
        self.fc2 = nn.Linear(256, 128)
        self.drop2 = nn.Dropout(0.3)
        self.fc3 = nn.Linear(128, 10)

    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = self.drop1(x)           # dropout applied only during training
        x = F.relu(self.fc2(x))
        x = self.drop2(x)
        return self.fc3(x)

# IMPORTANT: model.train() enables dropout, model.eval() disables it`,
      caption: "Dropout after each hidden activation, never after the output. Trained here on 5,000 MNIST digits for 30 epochs with Adam at 10⁻³ — few enough examples that a 235,000-parameter network overfits — with p = 0.3 or 0, and with or without weight_decay = 10⁻³:" },

    { t: "out", text: `5,000 MNIST digits, 30 epochs, Adam 1e-3:
  no dropout, no decay   train 1.0000  val 0.9356  test 0.9424
  dropout 0.3            train 1.0000  val 0.9474  test 0.9481
  L2 weight_decay 1e-3   train 0.9968  val 0.9334  test 0.9351
  dropout 0.3 + decay    train 0.9984  val 0.9446  test 0.9445` },

    { t: "p", text: "Every variant fits the 5,000 training digits essentially perfectly — the gap between training and validation accuracy is the overfitting. Dropout closes about a fifth of that gap (94.7 % against 93.6 % on validation, 94.8 % against 94.2 % on test), which is what the reference's ensemble argument predicts: a modest, reliable gain from averaging sub-networks. Weight decay at 10⁻³ inside Adam did nothing useful here, for the reason lesson 1.5 gave — L2 inside Adam's normalisation is not real weight decay. The gains are small because the network is small and the task is easy; on a large model with scarce data dropout is often the difference between working and not." },

    { t: "h2", n: "03", text: "Monte Carlo dropout: uncertainty from the same network", id: "mc" },

    { t: "p", text: "Keep dropout switched on at inference, run the same input through N times, and the predictions vary — each pass is a different sub-network's opinion. Their mean is a better prediction than any single pass and their standard deviation is a measure of how much the sub-networks disagree, which approximates Bayesian uncertainty. A high standard deviation is a flag: the model does not know, and a human should look." },

    { t: "code", lang: "python", title: "The reference's function, run on the trained dropout network",
      code: `import torch, numpy as np

def mc_dropout_predict(model, x, n_forward=50):
    """Monte Carlo Dropout for uncertainty estimation."""
    model.train()  # keep dropout ON
    predictions = []
    with torch.no_grad():
        for _ in range(n_forward):
            pred = torch.softmax(model(x), dim=1)
            predictions.append(pred.cpu().numpy())
    predictions = np.array(predictions)          # (N, batch, classes)
    mean_pred = predictions.mean(axis=0)         # expected prediction
    std_pred = predictions.std(axis=0)           # uncertainty estimate
    return mean_pred, std_pred

mean, std = mc_dropout_predict(model, Xte[:2000], n_forward=50)
pred = mean.argmax(1); correct = pred == yte[:2000].numpy(); unc = std.max(1)
print(f"mean uncertainty on correct {unc[correct].mean():.4f} vs wrong {unc[~correct].mean():.4f}")
thr = np.quantile(unc, 0.9)
print(f"flag the 10% most uncertain (std > {thr:.3f}): accuracy on flagged {correct[unc > thr].mean():.3f}, on the rest {correct[unc <= thr].mean():.3f}")`,
      caption: "Fifty stochastic passes over 2,000 test digits. The uncertainty is the largest per-class standard deviation across the passes." },

    { t: "out", text: `mean uncertainty on correct 0.0518 vs wrong 0.2460
flag the 10% most uncertain (std > 0.252): accuracy on flagged 0.585, on the rest 0.972
most uncertain digit: true 5, mean probs top-3 [0.606 0.392 0.002] for classes [8 5 6]` },

    { t: "p", text: "The network is nearly five times as uncertain on the digits it gets wrong as on the ones it gets right. Route the 10 % most uncertain predictions to a person and the remaining 90 % are 97.2 % accurate, against 94.8 % overall — and the flagged 10 % contain most of the errors (accuracy 58.5 %). The single most uncertain digit is a 5 the network reads as an 8 with probability 0.61 and as a 5 with 0.39: the sub-networks are genuinely split, and the standard deviation says so." },

    { t: "h2", n: "04", text: "Early stopping", id: "early" },

    { t: "p", text: "The cheapest regulariser: watch the validation loss every epoch, keep the weights from the best epoch, and stop when it has not improved for `patience` epochs in a row. The reference's loop, run on the no-dropout network:" },

    { t: "code", lang: "python", title: "The reference's early-stopping loop",
      code: `best_val_loss = float('inf')
patience, counter = 5, 0

for epoch in range(max_epochs):
    train_loss = train_epoch(model, train_loader)
    val_loss = validate(model, val_loader)

    if val_loss < best_val_loss:
        best_val_loss = val_loss
        counter = 0
        torch.save(model.state_dict(), 'best_model.pt')
    else:
        counter += 1
        if counter >= patience:
            print(f"Early stopping at epoch {epoch}")
            break

model.load_state_dict(torch.load('best_model.pt'))  # restore best`,
      caption: "Patience 5 rather than the reference's 10, so the run is short enough to read in full. Every epoch's validation loss and the counter's state:" },

    { t: "out", text: `  epoch  1: val loss 0.4082  <- best, saved
  epoch  2: val loss 0.3570  <- best, saved
  epoch  3: val loss 0.3192  <- best, saved
  epoch  4: val loss 0.2917  <- best, saved
  epoch  5: val loss 0.2939  (no improvement 1/5)
  epoch  6: val loss 0.2834  <- best, saved
  epoch  7: val loss 0.2464  <- best, saved
  epoch  8: val loss 0.2470  (no improvement 1/5)
  epoch  9: val loss 0.2630  (no improvement 2/5)
  epoch 10: val loss 0.2611  (no improvement 3/5)
  epoch 11: val loss 0.2446  <- best, saved
  epoch 12: val loss 0.2447  (no improvement 1/5)
  epoch 13: val loss 0.2588  (no improvement 2/5)
  epoch 14: val loss 0.2575  (no improvement 3/5)
  epoch 15: val loss 0.2634  (no improvement 4/5)
  epoch 16: val loss 0.2634  (no improvement 5/5)
Early stopping at epoch 16
restored epoch 11: val acc 0.9316, test acc 0.9337` },

    { t: "p", text: "Two things the trace shows that a description does not. The counter resets on *any* improvement, however small — epoch 11 beat epoch 7 by 0.0018 and bought five more epochs. And the validation loss is noisy: epochs 5 and 8 were near-misses that a longer patience would have ridden through, which is why the reference's default is 10. Restoring the checkpoint matters: the model at epoch 16 is worse than the model at epoch 11, and without the `load_state_dict` you would ship the worse one." },

    { t: "callout", kind: "insight", title: "The reference's ordered checklist for overfitting",
      body: [{ t: "p", text: "Training loss falling while validation loss rises means overfitting. In order: (1) more data, or augmentation if there is no more; (2) more regularisation — raise dropout from 0.3 towards 0.5, add or increase weight decay; (3) early stopping with a checkpoint at the best validation loss; (4) reduce capacity — fewer layers or units; (5) batch normalisation if not already present; (6) check for data leakage, because a suspiciously low training loss can mean the answer is in the features; (7) cross-validate, in case the split was unlucky." }] },

    { t: "exercise", kind: "practice", title: "Read a dropout rate off the gap", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "Train the reference's Net on the same 5,000 MNIST digits with dropout 0.0, 0.3 and 0.5 for 30 epochs each, and report training, validation and test accuracy. Then answer: at which rate is the train–validation gap smallest, and does that rate also give the best test accuracy?" }],
      requirements: [
        "Three runs with the same seed",
        "A table of train / val / test accuracy",
        "One sentence on whether the smallest gap and the best test accuracy coincide"
      ],
      hint: "Add a p argument to Net.__init__ and pass it to both nn.Dropout layers.",
      solution: { lang: "python", title: "Solution sketch",
        code: `for p in [0.0, 0.3, 0.5]:
    torch.manual_seed(0); m = train(Net(p), 30)
    print(p, acc(m, Xtr, ytr), acc(m, Xva, yva), acc(m, Xte, yte))
# in this lesson's run: p=0.0 → 1.000 / 0.936 / 0.942   p=0.3 → 1.000 / 0.947 / 0.948
# p=0.5 typically lands close to 0.3 on validation, sometimes slightly lower on train`,
        notes: [{ t: "p", text: "On 5,000 digits the gap is smallest around p = 0.3–0.5 and so is test error, but the two need not coincide in general: a rate high enough to close the gap can also cost capacity and lower everything. The rule is to pick p by validation accuracy, not by the gap." }] } }
  ],

  takeaways: [
    "L2 adds (λ/2)Σ‖W‖²_F to the loss; its gradient λW shrinks every weight towards zero in proportion to its size, which is weight decay under SGD.",
    "Dropout zeroes a fraction p of a layer's units on each training pass and scales survivors by 1/(1 − p), so inference needs no change; with n units it trains an ensemble of 2ⁿ sub-networks.",
    "Typical rates: 0–0.2 at the input, 0.2–0.5 in hidden layers; on 5,000 MNIST digits, p = 0.3 lifted validation accuracy from 93.6 % to 94.7 % with training accuracy at 100 % either way.",
    "model.train() enables dropout and model.eval() disables it; MC dropout keeps it on deliberately and uses the spread of 50 passes as an uncertainty — five times larger on wrong predictions than on right ones.",
    "Early stopping keeps the best-validation checkpoint and halts after `patience` epochs without improvement; restore the checkpoint, because the final epoch is worse than the best one.",
    "Against overfitting, in the reference's order: more data or augmentation, more regularisation, early stopping, less capacity, batch norm, a leakage check, cross-validation."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "With inverted dropout at p = 0.3, what happens to the surviving activations during training?",
      options: ["They are unchanged", "They are multiplied by 0.7", "They are multiplied by 1/0.7 ≈ 1.43", "They are set to 1"],
      answer: 2,
      why: "Zeroing 30 % of units would lower the layer's expected output by 30 %; scaling the survivors by 1/(1 − p) restores the expectation, so the next layer sees the same scale in training as at inference — where dropout does nothing. The measured survivor value was 1.4286." },
    { stem: "Why is dropout described as training an ensemble?",
      options: ["Because several models are trained in parallel", "Because each forward pass uses a different random sub-network, and inference with all units approximates averaging their predictions", "Because the dropout rate is averaged over epochs", "Because it combines L2 and early stopping"],
      answer: 1,
      why: "With n units there are 2ⁿ possible masks, each defining a sub-network that shares weights with the others; every pass trains one of them. Using all units at inference approximates the geometric mean of the sub-networks' predictions, which is why the technique also prevents units co-adapting." },
    { stem: "What does MC dropout's standard deviation across passes measure?",
      options: ["The test error directly", "How much the sub-networks disagree about this input — an uncertainty estimate", "The learning rate", "The fraction of dropped units"],
      answer: 1,
      why: "Each stochastic pass is a different sub-network's prediction; if they agree, the standard deviation is near zero, and if the input is ambiguous they spread out. On MNIST the spread was 0.05 on correct predictions and 0.25 on wrong ones, so it works as a flag for human review." },
    { stem: "In the early-stopping loop, why load the saved state dict after the loop ends?",
      options: ["To reset the optimiser", "Because the loop stops several epochs after the best one, and the current weights are worse than the checkpointed ones", "To enable dropout", "It is not necessary"],
      answer: 1,
      why: "The loop halts only after `patience` epochs without improvement, so by then the model has moved on from its best point — in the trace, it stopped at epoch 16 while the best validation loss was at epoch 11. Restoring the checkpoint returns the weights that actually had the lowest validation loss." }
  ] },

  interview: { title: "Interview", sub: "The reference's Q5 and Q8", questions: [
    { level: "Core", q: "Training loss is decreasing but validation loss is increasing. What do you do?",
      strong: "Overfitting; work the ordered checklist — data, regularisation, early stopping, capacity, batch norm, leakage check, cross-validation.",
      answer: [{ t: "p", text: "The divergence is overfitting: the model is fitting training noise. In order of preference: get more data, or augment what you have; increase regularisation — dropout from 0.3 to 0.5, add or raise weight decay; early-stop, checkpointing at the best validation loss; reduce capacity with fewer layers or units; add batch normalisation if absent; check for leakage, since a suspiciously low training loss can mean a feature encodes the label; and cross-validate to be sure the split was not simply unlucky. I would also confirm that model.eval() is called during validation so dropout and batch norm are in inference mode — otherwise the validation numbers themselves are wrong." }] },
    { level: "Core", q: "Explain dropout as ensemble learning.",
      strong: "Each pass trains a random sub-network among 2ⁿ that share weights; full-network inference approximates their averaged prediction.",
      answer: [{ t: "p", text: "During training every forward pass drops a different random subset of units, so it trains one of 2ⁿ possible sub-networks, each seeing different examples. The sub-networks share weights, so it is a cheap ensemble. At inference all units are used, scaled by the keep probability (or pre-scaled with inverted dropout), which approximates the geometric mean of all the sub-networks' predictions — an ensemble average. Two effects follow: no unit can rely on specific neighbours, so co-adaptation is prevented, and the averaging is itself a regulariser. Monte Carlo dropout makes the ensemble explicit by sampling sub-networks at inference and reading their spread as uncertainty." }] },
    { level: "Senior", q: "Where would you not use dropout, and what would you use instead?",
      strong: "Not in convolutional feature maps or before batch norm, rarely in modern transformers' attention at scale; use weight decay, augmentation, stochastic depth or simply more data.",
      answer: [{ t: "p", text: "Dropout on individual pixels of a convolutional feature map does little because neighbouring activations are correlated — the information survives through the neighbours; spatial or channel dropout, or stochastic depth on residual blocks, is the convolutional equivalent. Dropout placed before batch normalisation shifts the variance the norm layer sees between training and inference, which hurts; put it after, or rely on batch norm's own noise. Large pretrained transformers trained on enormous data often use little or no dropout because the data itself regularises, with AdamW's weight decay and augmentation doing the rest. Recurrent networks need variational dropout — the same mask at every time step — rather than a fresh mask per step. In each case the question is the same: what is the source of overfitting, and which regulariser addresses it without destroying the structure the architecture relies on." }] }
  ] }
});
