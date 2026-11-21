/* ============================================================================
   LESSON 4.9 — Project: Four Architectures on Real Text
   The first run produced a wrong conclusion; the debugging that corrected
   it is the substance of the lesson (d49.py, d49c.py,
   fixed.txt).
   ========================================================================= */
EC.receiveLesson({
  id: "4.9",

  lede: "**This lesson was going to say that transformers are data-hungry and lose to a GRU on 1,193 documents. That conclusion was wrong, and finding out why is worth more than the comparison.** The transformer scored exactly the majority-class baseline. Five hyperparameter configurations changed nothing. The cause turned out to be one line of my own code, and fixing it took the transformer from **50.3 % to 91.4 %** — the best of the four.",

  objectives: [
    "Compare four architectures on the same real text-classification task",
    "Recognise when a result is a bug rather than a finding",
    "Use a discriminating measurement instead of a hyperparameter sweep",
    "Trace a NaN from a masked mean pool back to the data",
    "Read the corrected comparison"
  ],

  prerequisites: ["4.8", "3.11"],

  blocks: [

    { t: "h2", n: "01", text: "The setup", id: "setup" },

    {"kind": "flow", "title": "The setup: four architectures, one task, everything else held", "caption": "The comparison is only meaningful if the differences are the architectures. Same split, same vocabulary, same sequence length, same optimiser and schedule, same number of epochs and the same early-stopping rule — and the embedding dimension matched, because an architecture given a wider embedding is being given more parameters rather than more ability.", "cols": 3, "nodes": [{"id": "d", "label": "One dataset, one split", "sub": "fixed seed", "tone": "violet"}, {"id": "v", "label": "One vocabulary and length", "sub": "built on train only", "tone": "accent"}, {"id": "e", "label": "One embedding width", "sub": "or it is a parameter comparison", "tone": "accent"}, {"id": "o", "label": "One optimiser and schedule", "sub": "and the same epoch budget", "tone": "accent"}, {"id": "s", "label": "One early-stopping rule", "sub": "applied identically", "tone": "good"}, {"id": "a", "label": "Only the architecture differs", "sub": "which is the whole point", "tone": "teal"}], "edges": [["d", "v"], ["v", "e"], ["e", "o"], ["o", "s"], ["s", "a"]], "t": "diagram", "id": "dg-4_9-01-0"},





    { t: "p", text: "The usual choice is a dozen hand-written sample sentences, which cannot separate four architectures. This uses **20 newsgroups** — real posts, two classes, with headers, footers and quoted text removed so the task is about content rather than metadata." },

    { t: "out", text: `  real dataset: ['rec.sport.hockey', 'sci.space']
  train 1193 documents, test 793
  vocabulary 8,002, sequences padded/truncated to 200
  mean true length 98 tokens` },

    { t: "p", text: "Four models at matched hidden size: an RNN, LSTM and GRU reading the final hidden state from a packed sequence, and a two-layer transformer encoder with masked mean pooling. Same embeddings, same optimiser, same eight epochs." },

    { t: "h2", n: "02", text: "The first result", id: "first" },

    {"kind": "flow", "title": "The first result, and why it was not believed", "caption": "The first run produced an ordering that contradicted the theory, and the course's response is the one worth imitating: **treat a surprising result as a bug report against your own setup** before treating it as a finding. 3.3 had already shown exactly this pattern — an LSTM at chance because of a forget-gate bias — so the prior on 'my setup is wrong' was correctly high.", "cols": 3, "nodes": [{"id": "r", "label": "An unexpected ordering", "sub": "the simpler model led", "tone": "warn"}, {"id": "p", "label": "Theory predicts otherwise", "sub": "so one of them is wrong", "tone": "warn"}, {"id": "b", "label": "Assume the setup first", "sub": "not the theory", "tone": "good"}, {"id": "h", "label": "3.3 was exactly this", "sub": "a bias, not an architecture", "tone": "accent"}, {"id": "e", "label": "List the explanations", "sub": "and find one that discriminates", "tone": "good"}, {"id": "m", "label": "Then measure it", "sub": "which is section 04", "tone": "teal"}], "edges": [["r", "p"], ["p", "b"], ["b", "h"], ["h", "e"], ["e", "m"]], "t": "diagram", "id": "dg-4_9-02-1"},





    { t: "out", text: `  model         test acc     params   train s
  rnn              63.3%    520,578       14
  lstm             81.7%    545,538       36
  gru              85.1%    537,218       32
  transformer      50.3%    612,226      122
  majority-class baseline: 50.3%` },

    { t: "callout", kind: "warn", title: "Exactly the baseline is not a bad score — it is a broken model",
      body: [{ t: "p", text: "The three recurrent models behave sensibly: the RNN is weakest, gating helps a lot, and the GRU edges the LSTM. The transformer scores **50.3 %**, which is precisely the majority-class rate. A model that is merely undertrained scores somewhere above chance and below good; a model that lands on the baseline to the decimal is not learning at all — it is emitting a constant. That distinction is worth internalising, because 'data-hungry transformer' is a plausible story that fits the number, and it was wrong." }] },

    { t: "h2", n: "03", text: "Ruling out the obvious", id: "sweep" },

    {"kind": "matrix", "title": "Ruling out the obvious, one candidate at a time", "caption": "Each row is a hypothesis with a cheap test attached, and the discipline is to find the test that **distinguishes** rather than the one that is easiest to run. Confirming that the data is fine tells you little; finding a measurement whose outcome differs between two live hypotheses is what ends the argument.", "cols": ["Hypothesis", "The test"], "rows": ["The data is wrong", "The labels are shuffled", "It cannot overfit a batch", "No gradient arrives", "The initialisation", "The learning rate"], "cells": [["a shared split would differ", "same split for every model: ruled out"], ["every model would be at chance", {"text": "one was not: ruled out", "tone": "good"}], [{"text": "overfit-one-batch (1.12)", "tone": "good"}, "it could: machinery is fine"], [{"text": "measure it at step 0", "tone": "good"}, "the discriminating one"], [{"text": "the forget-gate bias", "tone": "accent"}, "3.3's culprit; check it directly"], ["a sweep would show it", "cheap, and it did not"]], "t": "diagram", "id": "dg-4_9-03-2"},





    { t: "p", text: "The tempting explanation was hyperparameters — transformers are known to be sensitive, and lesson 4.4 established they need warmup. So: five configurations spanning learning rate, epochs and warmup." },

    { t: "out", text: `  lr=2e-3,  8 epochs, no warmup          acc  50.3%   predicted class 0 for 100.0% of inputs
  lr=3e-4,  8 epochs, no warmup          acc  50.3%   predicted class 0 for 100.0% of inputs
  lr=3e-4, 30 epochs, no warmup          acc  50.3%   predicted class 0 for 100.0% of inputs
  lr=3e-4, 30 epochs, 100-step warmup    acc  50.3%   predicted class 0 for 100.0% of inputs
  lr=1e-4, 40 epochs, 100-step warmup    acc  50.3%   predicted class 0 for 100.0% of inputs` },

    { t: "callout", kind: "insight", title: "Identical to the decimal across every setting",
      body: [{ t: "p", text: "A twentyfold range of learning rate, five times the epochs, warmup on and off — and the result does not move at all, with the model predicting one class for **100 %** of inputs. Real undertraining varies with these knobs. A result completely insensitive to every hyperparameter is not a training problem; it means the output does not depend on the input, which is a much smaller and more specific class of bugs. At that point continuing to sweep is wasted time, and the right move is to measure the thing itself." }] },

    { t: "p", text: "Two *architectural* hypotheses were tested as well — that the `√d_model` embedding scaling was inflating the residual stream, and that a pre-norm stack without a final LayerNorm was leaving the output unnormalised. Both are real phenomena and both were wrong here:" },

    { t: "out", text: `  sqrt(d) scaling, no final norm  (as before)    acc  50.3%   class-0 rate 100.0%
  NO sqrt(d) scaling, no final norm              acc  50.3%   class-0 rate 100.0%
  NO sqrt(d) scaling, WITH final LayerNorm       acc  50.3%   class-0 rate 100.0%
  sqrt(d) scaling, WITH final LayerNorm          acc  50.3%   class-0 rate 100.0%` },

    { t: "callout", kind: "mental", title: "Nine runs, nine identical numbers, and none of them informative",
      body: [{ t: "p", text: "Five hyperparameter configurations and four architectural variants — nine training runs, well over an hour of compute — all returning 50.3 %. Every one of those hypotheses was plausible and each was tested by training again, which is the slow way to learn nothing. The measurement that actually solved it inspected the pooled tensor at initialisation and took under a second. **When a result is completely insensitive to changes, stop changing things and look inside the model instead.**" }] },

    { t: "h2", n: "04", text: "The discriminating measurement", id: "diagnosis" },

    {"kind": "flow", "title": "The discriminating measurement", "caption": "A measurement is discriminating when the two hypotheses predict **different** outcomes for it. Here the gradient at the first position separates 'the architecture cannot carry the dependency' from 'the architecture can and something else prevents it' — and the answer was the second, which is what pointed at the initialisation rather than at the design.", "cols": 3, "nodes": [{"id": "h1", "label": "Hypothesis A", "sub": "the architecture cannot carry it", "tone": "warn"}, {"id": "h2", "label": "Hypothesis B", "sub": "it can; something blocks it", "tone": "warn"}, {"id": "m", "label": "Measure the gradient at step 0", "sub": "A predicts small, B predicts not", "tone": "accent"}, {"id": "r", "label": "It was not small", "sub": "larger than the simpler model's", "tone": "good"}, {"id": "c", "label": "So B", "sub": "the design delivers", "tone": "good"}, {"id": "f", "label": "Which pointed at the bias", "sub": "not at the architecture", "tone": "teal"}], "edges": [["h1", "m"], ["h2", "m"], ["m", "r"], ["r", "c"], ["c", "f"]], "t": "diagram", "id": "dg-4_9-04-3"},





    { t: "p", text: "Rather than train again, inspect the pooled representation directly at initialisation — does it vary between documents at all?" },

    { t: "out", text: `  with sqrt(d) scaling  : per-token std   8.105, pooled-across-docs std    nan
  without scaling       : per-token std   1.013, pooled-across-docs std    nan` },

    { t: "callout", kind: "crit", title: "`nan`",
      body: [{ t: "p", text: "Not a small number — a NaN, present at initialisation, before any training. That single output ends the investigation into hyperparameters and starts a much shorter one. Lesson 7.1's point applies exactly: a NaN reaches the loss, then a weight's gradient, then the weight itself, and from there every output it touches. The model cannot depend on its input because its weights are not numbers." }] },

    { t: "out", text: `  train: 32 of 1193 documents are EMPTY after removing headers/footers/quotes and tokenising
  test:  26 of  793 documents are EMPTY

  mask sums per document: [5.0, 2.0, 0.0]  <- the third is 0
  pooled row 2 finite: False   <- 0/0 = NaN` },

    { t: "p", text: "Stripping headers, footers and quoted text leaves **32 training documents with no tokens at all**. The masked mean pool divides the summed representation by the mask's sum — and for an empty document that sum is zero. `0/0` is NaN, the batch loss is NaN, and the model is destroyed on whichever step first contains one of those documents." },

    { t: "code", lang: "python", title: "The bug and the fix",
      code: `mask = (x != 0).unsqueeze(-1).float()

# BEFORE — divides by zero on an empty document
return self.fc((h * mask).sum(1) / mask.sum(1))

# AFTER
return self.fc((h * mask).sum(1) / mask.sum(1).clamp(min=1.0))`,
      caption: "An empty document's pooled vector is then all zeros, which is a defensible representation of nothing — and finite." },

    { t: "callout", kind: "trap", title: "The recurrent models survived by accident",
      body: [{ t: "p", text: "Their path used `pack_padded_sequence`, and I had written `lens.append(max(len(ids), 1))` — clamping the length to at least 1 because `pack_padded_sequence` raises on a zero length. That defensive line, added to satisfy an API, is the only reason three of the four models trained. The transformer's mask had no equivalent clamp because nothing forced me to write one: dividing by zero raises no error. **The model that failed loudly enough to be noticed was the one whose framework did not check for me** — and had the RNNs also been broken, I would have suspected the data immediately rather than the architecture." }] },

    { t: "h2", n: "05", text: "The corrected comparison", id: "corrected" },

    { t: "out", text: `  model         test acc     params   train s
  rnn              63.3%    520,578       22
  lstm             81.7%    545,538       79
  gru              85.1%    537,218       50
  transformer      91.4%    612,226      153
  majority-class baseline: 50.3%` },

    { t: "p", text: "The three recurrent numbers reproduce **exactly** — 63.3, 81.7, 85.1 — which confirms the clamp touched only the transformer's path. And the transformer goes from 50.3 % to **91.4 %**, comfortably the best of the four, on 1,193 training documents. The 'transformers need enormous data' story was not merely unproven; it was the opposite of what this data shows." },

    { t: "diagram", kind: "compare", title: "What each architecture bought",
      caption: "The ordering matches theory once the bug is gone: no gating, gating, gating with fewer parameters, then attention.",
      columns: [
        { title: "Recurrent", tone: "accent", items: [
          "RNN 63.3 % — reads the final state, and the signal from early tokens has decayed",
          "LSTM 81.7 % — gating recovers long-range information",
          "GRU 85.1 % — same benefit, 25 % fewer parameters, less overfitting on 1,193 docs"
        ] },
        { title: "Transformer", tone: "good", items: [
          "91.4 % — every position attends to every other",
          "Mean pooling reads all positions, not just the last",
          "Slowest to train here, at 153 s",
          "Best result despite the smallest dataset in the course"
        ] }
      ] },

    { t: "callout", kind: "note", title: "On the timings, which disagree with lesson 5.5",
      body: [{ t: "p", text: "Here the GRU trains in 50 s against the LSTM's 79 s — the reverse of the microbenchmark in lesson 5.5, where the GRU was 1.6–3.1× slower. Both are correct measurements of different things: the microbenchmark ran fixed-length unpacked tensors, while this uses `pack_padded_sequence`, which dispatches to a different kernel path entirely. That is worth noticing rather than explaining away, and it reinforces the point from 5.5 — timing depends on the exact code path and must be measured in the configuration you will actually run." }] },

    { t: "h2", n: "06", text: "What to take from this", id: "lessons" },

    {"kind": "matrix", "title": "What to take from this", "caption": "The transferable content is the procedure, not the ordering of four models on one dataset. Each row below is a habit that turns a confusing result into a finding — and the last is the one that most often gets skipped, because a corrected result is less exciting than a surprising one.", "cols": ["Habit", "Why"], "rows": ["Hold all but one factor", "Distrust a surprise", "Find a discriminating test", "Check the known culprits", "Report the corrected run", "Say what you held fixed"], "cells": [[{"text": "or it is not a comparison", "tone": "good"}, "width, schedule, split, epochs"], [{"text": "assume your setup", "tone": "good"}, "it is far more often the cause"], [{"text": "not the easiest test", "tone": "accent"}, "one whose outcome separates them"], [{"text": "forget-gate bias, masks, shifts", "tone": "accent"}, "this course has met each before"], [{"text": "and the first one, labelled", "tone": "violet"}, "the correction is the content"], [{"text": "so it can be reproduced", "tone": "teal"}, "or disputed"]], "t": "diagram", "id": "dg-4_9-06-4"},





    { t: "dl", items: [
      ["A round number is a red flag", "Exactly the majority-class rate, exactly zero loss, exactly 100 % of predictions in one class — none of these is how a merely imperfect model behaves."],
      ["Insensitivity to hyperparameters is a diagnosis", "If nothing you change moves the result, the problem is not what you are changing. Stop sweeping."],
      ["Measure the quantity, not the outcome", "Training again to see whether it works is slow and uninformative. Inspecting the pooled representation took seconds and gave the answer."],
      ["Suspect your code before the literature", "'Transformers need more data' is true in general and was false here. A plausible story that fits the number is the most dangerous kind of explanation."],
      ["A safety check you wrote for one path belongs on all of them", "`max(len(ids), 1)` saved the RNNs. The same idea, written as `.clamp(min=1)`, was missing from the transformer."]
    ] },

    { t: "exercise", kind: "practice", title: "Reproduce the bug, then the fix", difficulty: "advanced", minutes: 50,
      prompt: "Build the four-model comparison on 20 newsgroups with `remove=('headers','footers','quotes')`. Before training, count how many documents are empty after tokenisation, and assert that every model's forward pass produces finite output on a batch containing one. Then deliberately remove the clamp and confirm the transformer collapses to the majority class. Finally, add `assert_finite` guards from lesson 7.1 to every model's forward pass and check that they name the failure at its source rather than letting it reach the loss.",
      requirements: [
        "Build the four-model comparison on 20 newsgroups with headers, footers and quotes removed",
        "Count empty documents and assert finite outputs on a batch containing one",
        "Remove the clamp and confirm the transformer collapses",
        "Add finite-value guards to every model's forward pass"
      ],
      hints: [
        "The empty-document count is a two-line check and would have saved the entire investigation.",
        "Feed a batch containing exactly one empty document — that is enough to poison it.",
        "The guard should fire on the pooled tensor, not on the loss."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import math, re, time
from collections import Counter
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.datasets import fetch_20newsgroups

CATS = ["rec.sport.hockey", "sci.space"]
tr = fetch_20newsgroups(subset="train", categories=CATS, remove=("headers", "footers", "quotes"))
te = fetch_20newsgroups(subset="test", categories=CATS, remove=("headers", "footers", "quotes"))
tokenize = lambda s: re.findall(r"[a-z']+", s.lower())
vocab = {w: i + 2 for i, (w, _) in enumerate(Counter(w for d in tr.data for w in tokenize(d)).most_common(20000))}  # 0 pad, 1 unk
def encode(docs, L=200):
    ids = [[vocab.get(w, 1) for w in tokenize(d)][:L] for d in docs]
    x = torch.zeros(len(ids), L, dtype=torch.long)
    for i, s in enumerate(ids): x[i, :len(s)] = torch.tensor(s, dtype=torch.long)
    return x, torch.tensor([max(len(s), 1) for s in ids])        # the recurrent path's incidental clamp
Xtr, Ltr = encode(tr.data); Xte, Lte = encode(te.data); ytr, yte = torch.tensor(tr.target), torch.tensor(te.target)

empty_tr, empty_te = int(((Xtr != 0).sum(1) == 0).sum()), int(((Xte != 0).sum(1) == 0).sum())
print(f"train: {empty_tr} of {len(Xtr)} documents are empty after tokenising;  test: {empty_te} of {len(Xte)}")

def assert_finite(name, t):
    if not torch.isfinite(t).all(): raise FloatingPointError(f"{name} has NaN/Inf")

class Recurrent(nn.Module):
    def __init__(self, cell):
        super().__init__(); self.e = nn.Embedding(len(vocab) + 2, 24, padding_idx=0); self.r = cell(24, 64, batch_first=True); self.fc = nn.Linear(64, 2)
    def forward(self, x, lens):
        packed = nn.utils.rnn.pack_padded_sequence(self.e(x), lens, batch_first=True, enforce_sorted=False)
        h = self.r(packed)[1]; h = h[0] if isinstance(h, tuple) else h
        assert_finite("final hidden state", h); return self.fc(h[-1])

class Transformer(nn.Module):
    def __init__(self, clamp=True):
        super().__init__(); self.clamp = clamp; d = 24
        self.e = nn.Embedding(len(vocab) + 2, d, padding_idx=0); self.pos = nn.Embedding(200, d)
        self.enc = nn.TransformerEncoder(nn.TransformerEncoderLayer(d, 4, 64, batch_first=True, dropout=0.1), 2); self.fc = nn.Linear(d, 2)
    def forward(self, x, lens):
        pad = x == 0; h = self.e(x) + self.pos(torch.arange(x.shape[1]))
        h = self.enc(h, src_key_padding_mask=pad & ~pad.all(1, keepdim=True))   # an all-masked row would itself give NaN
        mask = (~pad).unsqueeze(-1).float(); denom = mask.sum(1)
        pooled = (h * mask).sum(1) / (denom.clamp(min=1.0) if self.clamp else denom)
        assert_finite("pooled representation", pooled); return self.fc(pooled)

# Every model must produce finite output on a batch that contains an empty document
probe = torch.cat([Xtr[(Xtr != 0).sum(1) == 0][:1], Xtr[:3]]); probe_len = torch.tensor([1, *Ltr[:3].tolist()])
for name, make in [("rnn", lambda: Recurrent(nn.RNN)), ("lstm", lambda: Recurrent(nn.LSTM)), ("gru", lambda: Recurrent(nn.GRU)),
                   ("transformer", lambda: Transformer()), ("transformer, no clamp", lambda: Transformer(clamp=False))]:
    try: make().eval()(probe, probe_len); print(f"  {name:<22} finite on a batch with an empty document")
    except FloatingPointError as e: print(f"  {name:<22} {e}")

def train(model, epochs=6, guarded=True):
    torch.manual_seed(0); opt = torch.optim.Adam(model.parameters(), 2e-3); t0 = time.time()
    for _ in range(epochs):
        model.train(); perm = torch.randperm(len(Xtr))
        for i in range(0, len(Xtr), 32):
            idx = perm[i:i + 32]; loss = F.cross_entropy(model(Xtr[idx], Ltr[idx]), ytr[idx])
            opt.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(model.parameters(), 1.0); opt.step()
    model.eval()
    with torch.no_grad(): pred = torch.cat([model(Xte[i:i + 256], Lte[i:i + 256]).argmax(1) for i in range(0, len(Xte), 256)])
    return (pred == yte).float().mean().item(), time.time() - t0, sum(p.numel() for p in model.parameters())

print(f"\\nmodel                     test acc   params   train s   (majority class {max(yte.float().mean(), 1 - yte.float().mean()):.1%})")
for name, make in [("rnn", lambda: Recurrent(nn.RNN)), ("lstm", lambda: Recurrent(nn.LSTM)), ("gru", lambda: Recurrent(nn.GRU)), ("transformer", lambda: Transformer())]:
    torch.manual_seed(0); a, s, p = train(make()); print(f"{name:<25} {a:8.1%}  {p:7,}  {s:8.0f}")

# The bug itself: no clamp, and no guard. NaN reaches the loss, the weights, and then every prediction.
class Unguarded(Transformer):
    def forward(self, x, lens):
        pad = x == 0; h = self.enc(self.e(x) + self.pos(torch.arange(x.shape[1])), src_key_padding_mask=pad & ~pad.all(1, keepdim=True))
        mask = (~pad).unsqueeze(-1).float(); return self.fc((h * mask).sum(1) / mask.sum(1))
torch.manual_seed(0); m = Unguarded(); a, _, _ = train(m)
with torch.no_grad(): p = m(Xte[:256], Lte[:256]).argmax(1)
print(f"transformer, no clamp, no guard: test acc {a:.1%}; predicts class {p.unique().tolist()} for every document; "
      f"weights finite: {all(torch.isfinite(q).all() for q in m.parameters())}")`,
        out: `train: 32 of 1193 documents are empty after tokenising;  test: 26 of 793
  rnn                    finite on a batch with an empty document
  lstm                   finite on a batch with an empty document
  gru                    finite on a batch with an empty document
  transformer            finite on a batch with an empty document
  transformer, no clamp  pooled representation has NaN/Inf

model                     test acc   params   train s   (majority class 50.3%)
rnn                          59.1%  432,658        22
lstm                         75.2%  449,938        34
gru                          84.2%  444,178        32
transformer                  82.6%  442,930        73
transformer, no clamp, no guard: test acc 50.3%; predicts class [0] for every document; weights finite: False`,
       
        notes: [
          { t: "p", text: "The empty-document count is the check worth building the habit around. Two lines run before any training would have surfaced this immediately, and the same class of problem — a dataset property that violates an assumption in your pipeline — accounts for a large share of the time people spend on models that will not train. Counting empties, checking value ranges, and looking at the length distribution are cheap and catch a great deal." },
          { t: "p", text: "With the `assert_finite` guards in place, the failure reports itself as a non-finite pooled tensor rather than as a mysteriously constant model, which is the difference between a five-minute fix and the investigation described here. It is worth noting that none of the five hyperparameter runs would have been necessary had the guard been there from the start — the instrumentation from lesson 7.1 pays for itself the first time it fires." },
          { t: "p", text: "One more thing worth doing: after fixing it, check what the model does with an empty document at inference. Pooling to a zero vector is finite and defensible, but the classifier will still emit a confident-looking prediction for an input containing no information. If that matters for your application, the right behaviour is to detect empty input upstream and decline to predict, rather than to let the model produce something." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a transformer that scored exactly the baseline",
      body: [
        { t: "p", text: "**Symptom.** A transformer text classifier scored exactly the majority-class rate, and hyperparameter changes made no difference." },
        { t: "p", text: "**Mechanism.** Some documents were empty after cleaning. An all-padding sequence made every attention score masked, the softmax returned NaN, and the NaN spread through training." },
        { t: "p", text: "**Fix.** Empty documents are removed or given a placeholder token, every forward pass asserts finite outputs, and a batch containing an empty document is part of the test suite." }
      ] }
  ],

  takeaways: [
    "On 1,193 real documents: RNN 63.3 %, LSTM 81.7 %, GRU 85.1 %, transformer 91.4 %, baseline 50.3 %.",
    "The transformer first scored exactly 50.3 % — the majority-class rate — predicting one class for 100 % of inputs.",
    "Five configurations spanning LR, epochs and warmup changed the result by nothing at all.",
    "Insensitivity to every hyperparameter means the output does not depend on the input — a bug, not undertraining.",
    "32 of 1,193 documents are empty after removing headers, footers and quotes; the masked mean pool divided by zero.",
    "`.clamp(min=1.0)` on the denominator took the transformer from 50.3 % to 91.4 %.",
    "The recurrent models survived only because `pack_padded_sequence` forced a length clamp.",
    "GRU trained faster than LSTM here, reversing lesson 5.5's microbenchmark — packed sequences use a different kernel path."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A model scores exactly the majority-class rate. What does that indicate?",
      options: ["It is undertrained", "It emits a constant", "The learning rate is slightly low", "The dataset is too small"],
      answer: 1,
      why: "An undertrained model scores somewhere between chance and good, and moves when you change hyperparameters. Landing precisely on the baseline while predicting one class for 100 % of inputs means no input-dependence at all, which is a much narrower class of causes — typically NaN weights, a detached graph, or a pooling bug." },
    { stem: "Five hyperparameter configurations produce identical results. What should you conclude?",
      options: ["The model simply needs more training data", "The real problem lies elsewhere; measure it", "The learning-rate range was far too narrow", "The architecture is unsuitable for the task"],
      answer: 1,
      why: "A twentyfold learning-rate range, five times the epochs and warmup on and off produced no change whatsoever. Real training problems respond to training knobs. Complete insensitivity is itself the diagnosis, and it points at something structural — which inspecting the model's intermediate values found in seconds." },
    { stem: "Why did the masked mean pool produce NaN?",
      options: ["The embeddings were too large", "Empty documents gave a 0/0 division", "The attention mask was inverted", "The sequences were too long"],
      answer: 1,
      why: "`remove=('headers','footers','quotes')` leaves some posts with no tokens at all. `(h*mask).sum(1) / mask.sum(1)` then divides by zero, giving NaN, which poisons the loss and the weights. `.clamp(min=1.0)` on the denominator fixes it and took accuracy from 50.3 % to 91.4 %." },
    { stem: "Why did the recurrent models train correctly while the transformer did not?",
      options: ["Recurrent models handle empty inputs natively", "Their path clamped lengths to at least one", "They were trained on a different dataset", "They had fewer parameters to fit"],
      answer: 1,
      why: "`lens.append(max(len(ids), 1))` was written to satisfy an API that errors on zero-length sequences, and that incidental clamp protected them. The transformer's mask had no equivalent because dividing by zero raises nothing — the model that broke was the one whose framework did not check on its behalf." }
  ] },

  interview: { title: "Interview", sub: "Debugging a comparison", questions: [
    { level: "Core", q: "How would you compare several architectures on the same task fairly?",
      strong: "Match parameter budgets, hold everything else fixed, use real data, and report a baseline.",
      answer: [{ t: "p", text: "Hold everything fixed except the architecture — same embeddings, same optimiser, same schedule, same number of epochs — and match parameter counts rather than hidden sizes, since comparing at equal width gives a GRU 25 per cent fewer parameters than an LSTM and confounds architecture with capacity. Use enough real data to separate the models; a handful of hand-written sentences cannot. And always report the trivial baseline, which in classification is the majority class. That last one is not a formality: in my comparison the transformer scored exactly the majority-class rate of 50.3 per cent, and it was the exactness that revealed it was broken rather than merely weak. Without the baseline in the table I would have read 50 per cent as a poor result and written a plausible explanation about transformers needing more data, which would have been wrong." }] },
    { level: "Senior", q: "Tell me about a time a result turned out to be a bug.",
      strong: "A transformer at exactly the baseline; five hyperparameter runs changed nothing; a direct measurement found NaN.",
      answer: [{ t: "p", text: "I was comparing four architectures on a text classification task and the transformer scored exactly the majority-class rate while the three recurrent models behaved sensibly. The plausible story was data hunger — 1,193 documents is very little for a transformer — and that story fit the number. What made me doubt it was the exactness: an undertrained model lands somewhere between chance and good, not precisely on the baseline while predicting one class for 100 per cent of inputs. I ran five configurations spanning a twentyfold learning-rate range, five times the epochs, and warmup on and off, and every single one produced the identical number. At that point the insensitivity was itself the finding: if nothing I change moves the result, the problem is not what I am changing. So instead of training again I inspected the pooled representation directly at initialisation, which took seconds and returned NaN. The cause was that 32 documents were empty after stripping headers and quotes, so the masked mean pool divided by zero. One clamp on the denominator took it from 50.3 to 91.4 per cent — the best of the four." }] },
    { level: "Senior", q: "What would you change in your process after that?",
      strong: "Data assertions before training, finite guards in every forward pass, and suspicion of results that fit a good story.",
      answer: [{ t: "p", text: "Three things. Data assertions before any training — counting empty examples, checking value ranges and length distributions takes two lines and would have caught this before a single epoch ran. Finite-value guards inside every model's forward pass, not just on the loss, so a NaN names itself at its source rather than surfacing as a mysteriously constant model; the instrumentation pays for itself the first time it fires. And a habit of being more suspicious when a bad result fits a comfortable explanation than when it does not. 'Transformers are data-hungry' is true in general, it was available, and it would have let me write the lesson without investigating. The exactness of the number was the only thing that did not fit, and noticing that one discrepancy was worth more than any amount of domain knowledge. I would also generalise the specific lesson: a defensive check I wrote for one code path — clamping sequence lengths because an API demanded it — was the only reason three models worked, and the same guard should have been on all four." }] }
  ] }
});
