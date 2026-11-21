/* ============================================================================
   LESSON 4.7 — Comparing the Four Architectures
   ========================================================================= */
EC.receiveLesson({
  id: "4.7",

  lede: "**Four architectures, one decision.** ANN, RNN, LSTM/GRU and transformer each assume something different about their input, and the assumption is the whole story — a dense network assumes features are unordered, a convolution assumes neighbours relate, a recurrence assumes the past matters, and attention assumes nothing at all and makes you pay for it in data. This lesson puts the costs side by side and turns them into a decision procedure.",

  objectives: [
    "Match each architecture to the structural assumption it encodes",
    "Compare parameter counts and verify against the formulas",
    "Relate inductive bias to how much data an architecture needs",
    "Choose an architecture from the shape of the problem"
  ],

  prerequisites: ["4.6"],

  blocks: [

    { t: "h2", n: "01", text: "What each one assumes", id: "assumptions" },

    {"kind": "matrix", "title": "What each architecture assumes about its input", "caption": "This is the honest basis for choosing, and it is about **structure** rather than power. A CNN assumes locality and translation invariance; an RNN assumes order and that recent context matters most; a transformer assumes nothing about structure and so must be told position explicitly and shown far more data.", "cols": ["Assumes", "Pays for it with"], "rows": ["MLP", "CNN", "RNN / LSTM", "Transformer"], "cells": [[{"text": "nothing; fixed-size input", "tone": "warn"}, "no weight sharing at all"], [{"text": "locality, translation invariance", "tone": "good"}, "cannot relate distant positions cheaply"], [{"text": "order; recency", "tone": "good"}, "O(T) path, no parallelism"], [{"text": "nothing structural", "tone": "accent"}, "quadratic memory, and needs more data"]], "t": "diagram", "id": "dg-4_7-01-0"},





    { t: "dl", items: [
      ["ANN (dense)", "Inputs are a fixed-size unordered feature vector. Shuffle the columns consistently and nothing changes. Tabular data."],
      ["CNN", "Nearby inputs relate, and a pattern is worth detecting wherever it occurs. Images, spectrograms, local time series."],
      ["RNN / LSTM / GRU", "Order matters and the past should be summarised into a running state. Streaming, and sequences with local dependencies."],
      ["Transformer", "Any position may relate to any other, and the model should learn which. Almost no structural assumption — hence data-hungry."]
    ] },

    { t: "callout", kind: "mental", title: "Inductive bias is a data budget",
      body: [{ t: "p", text: "A strong assumption baked into the architecture is knowledge the model does not have to learn from examples. A CNN is given translation equivariance for free, so it can learn from thousands of images rather than millions. A transformer assumes nothing about structure, so it must *discover* that adjacent words relate and that order matters — which it can do, given enough data, and often better than the assumption you would have imposed. That is the whole trade: **weaker assumptions need more data and reward it with a higher ceiling.** It is why ViT loses to a ResNet on small datasets and wins on very large ones, and why nobody trains a transformer from scratch on 2,000 examples." }] },

    { t: "h2", n: "02", text: "Parameter cost", id: "parameters" },

    {"kind": "trace", "title": "Parameter cost, at comparable widths", "caption": "The comparison that matters is per-layer at the same hidden width. The LSTM's 4× and the GRU's 3× come from their gate counts (3.4, 3.5); the transformer block's 12d² comes from four attention matrices of d² and an FFN of 8d² — so a transformer layer is **three times** an LSTM layer at the same width, and most of that difference is the feed-forward network.", "left": "one layer, h = d = 512", "codeW": 210, "vars": ["formula", "parameters"], "steps": [{"code": "RNN", "state": ["h(h + d)", "524,288"], "tone": "good"}, {"code": "GRU", "state": ["3h(h + d)", "1,572,864"], "tone": "accent"}, {"code": "LSTM", "state": ["4h(h + d)", "2,097,152"], "tone": "accent"}, {"code": "Transformer block", "state": ["12d²", "3,145,728"], "changed": [1], "tone": "warn"}, {"code": "of which the FFN", "state": ["8d²", "2,097,152 (67%)"], "tone": "violet"}], "t": "diagram", "id": "dg-4_7-02-1"},





    { t: "out", text: `  RNN :    98,816
  GRU :   296,448
  LSTM:   395,264
  Transformer encoder layer (d=256, ff=1024):   789,760
  textbook formula LSTM 4h(h+d) = 393,216` },

    { t: "p", text: "At `input=128, hidden=256` the ratios are the ones module 3 established: GRU is exactly 3× an RNN, LSTM exactly 4×. The `4h(h+d) = 393,216` differs from PyTorch's 395,264 by 2,048, which is the two redundant bias vectors PyTorch keeps for CuDNN compatibility. **A single transformer layer costs about twice an LSTM** — and models use six or more of them, so the comparison is not really per-layer." },

    { t: "table", head: ["Aspect", "RNN / LSTM / GRU", "Transformer"],
      rows: [
        ["Computation", "Sequential — O(n) steps", "Parallel — O(1) depth"],
        ["Long-range path", "O(n) hops, decaying", "O(1), direct"],
        ["Memory", "O(1) state", "O(n²) attention matrix"],
        ["Training speed", "Capped by sequence length", "Bounded by hardware"],
        ["Inference (generation)", "O(1) state per step", "KV cache grows with context"],
        ["Position", "Implicit in the recurrence", "Must be injected"],
        ["Inductive bias", "Sequential, local", "None — data-hungry"],
        ["Pretrained models", "Few", "Effectively all of them"]
      ] },

    { t: "h2", n: "03", text: "Choosing", id: "choosing" },

    { t: "diagram", kind: "tree", title: "A decision procedure",
      caption: "Most paths end at 'use something pretrained'. Training a sequence model from scratch is now the exception.",
      root: { label: "What is the input?", children: [
        { label: "Tabular", children: [
          { label: "Gradient boosting first, ANN second", tone: "good" }
        ] },
        { label: "Images", children: [
          { label: "Pretrained CNN; ViT if data is vast", tone: "good" }
        ] },
        { label: "Text", children: [
          { label: "Pretrained transformer, always", tone: "good" }
        ] },
        { label: "Streaming / very long", children: [
          { label: "LSTM or GRU — O(1) state", tone: "accent" }
        ] }
      ] } },

    { t: "callout", kind: "trap", title: "For tabular data, try gradient boosting before a neural network",
      body: [{ t: "p", text: "It is easy to reach for a dense network on tabular data because this is a deep learning course. On most tabular problems, gradient-boosted trees — XGBoost, LightGBM, CatBoost — match or beat neural networks while training in seconds, handling missing values and mixed types natively, and requiring almost no tuning. Neural networks become competitive when there are high-cardinality categorical features that benefit from learned embeddings, when you need to fuse tabular data with text or images in one model, or at very large scale. Lesson 4.8 builds the ANN because you should know how; it is not usually the right first choice." }] },

    { t: "table", head: ["Use recurrence when", "Use a transformer when"],
      rows: [
        ["Streaming — one token at a time, bounded state", "Any NLP task, essentially always"],
        ["Sequences long enough that O(n²) is prohibitive", "Pretrained weights exist — which for text they do"],
        ["Edge devices with a hard memory budget", "Parallel hardware is available"],
        ["Simple time series with short dependencies", "Long-range dependencies matter"],
        ["No pretrained model covers your domain", "Vision with a large dataset (ViT)"]
      ] },

    { t: "h2", n: "04", text: "The honest summary", id: "summary" },

    {"kind": "matrix", "title": "The honest summary", "caption": "Transformers won on text and are not automatically right elsewhere. On a small tabular problem or a short univariate series, a simpler model is usually better and always cheaper — and on images a modernised CNN matches a vision transformer (2.3), which suggests much of the advantage was the training recipe rather than attention.", "cols": ["Use", "Because"], "rows": ["Text, any length", "Images", "Short series, little data", "Streaming / real-time", "Very long sequences", "Small tabular"], "cells": [[{"text": "transformer", "tone": "good"}, "it won decisively; pretrained weights exist"], [{"text": "either", "tone": "accent"}, "ConvNeXt matches a ViT (2.3)"], [{"text": "an RNN, or classical", "tone": "good"}, "transformers need data"], [{"text": "causal RNN, or RNN-T", "tone": "good"}, "a transformer must see the window"], [{"text": "efficient attention, or SSM", "tone": "accent"}, "quadratic memory bites first"], [{"text": "gradient boosting", "tone": "crit"}, "not a neural network at all (ML 11.6)"]], "t": "diagram", "id": "dg-4_7-04-2"},





    { t: "callout", kind: "insight", title: "The architecture choice matters less than it used to",
      body: [{ t: "p", text: "For most applied problems in 2026 the decision is not *which architecture* but *which pretrained model, and how do I adapt it*. Lesson 2.5 measured this for vision: a frozen ImageNet backbone reached 67.1 % where the same architecture from scratch reached 34.3 %, and the architecture was identical in both cases. The same holds more strongly for text. Understanding these four architectures is still worth the effort — it is what lets you read a paper, debug a model that is not learning, and recognise when your problem genuinely falls outside the pretrained mainstream. But treating the choice as the main lever is a good way to spend three weeks matching a baseline you could have had on day one." }] },

    { t: "exercise", kind: "practice", title: "Compare all four on one problem", difficulty: "intermediate", minutes: 45,
      prompt: "Take one sequence classification task and implement four models with matched parameter budgets: a dense network on pooled embeddings, a CNN with 1-D convolutions, an LSTM, and a small transformer encoder. Train each on 500, 5,000 and 50,000 examples and plot accuracy against dataset size for all four. Then add a fifth: a pretrained transformer, fine-tuned. Record training time as well as accuracy.",
      requirements: [
        "Implement dense, 1-D CNN, LSTM and transformer models with matched parameters",
        "Train each on 500, 5,000 and 50,000 examples",
        "Plot accuracy against dataset size",
        "Add a fine-tuned pretrained transformer and record training time"
      ],
      hints: [
        "Match parameter counts, not layer counts, or you are comparing capacity.",
        "The curves' relative order should change as data grows — that is the point.",
        "Include the pretrained model's accuracy at 500 examples specifically."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import time
import warnings
warnings.filterwarnings("ignore", category=UserWarning)          # nested-tensor notice from TransformerEncoder
import torch
import torch.nn as nn
import torch.nn.functional as F
from datasets import load_dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer, logging as hf_logging
hf_logging.set_verbosity_error(); hf_logging.disable_progress_bar()

ds = load_dataset("nyu-mll/glue", "sst2")                    # sentence sentiment, 67k training sentences
tok = AutoTokenizer.from_pretrained("distilbert-base-uncased")
def encode(split, n, L=48):
    e = tok(ds[split]["sentence"][:n], padding="max_length", truncation=True, max_length=L, return_tensors="pt")
    return e.input_ids, e.attention_mask, torch.tensor(ds[split]["label"][:n])
Xva, Mva, yva = encode("validation", 872)
V, D = tok.vocab_size, 64                                     # every model shares a 64-d embedding (1.95M parameters)

class Dense(nn.Module):
    def __init__(self): super().__init__(); self.e = nn.Embedding(V, D); self.f = nn.Sequential(nn.Linear(D, 320), nn.ReLU(), nn.Linear(320, 2))
    def forward(self, x, m): m = m[..., None].float(); return self.f((self.e(x) * m).sum(1) / m.sum(1))
class CNN(nn.Module):
    def __init__(self): super().__init__(); self.e = nn.Embedding(V, D); self.c = nn.Conv1d(D, 96, 3, padding=1); self.o = nn.Linear(96, 2)
    def forward(self, x, m): h = F.relu(self.c(self.e(x).transpose(1, 2))); return self.o(h.masked_fill(~m[:, None].bool(), -1e4).max(2).values)
class LSTM(nn.Module):
    def __init__(self): super().__init__(); self.e = nn.Embedding(V, D); self.r = nn.LSTM(D, 40, batch_first=True); self.o = nn.Linear(40, 2)
    def forward(self, x, m):
        p = nn.utils.rnn.pack_padded_sequence(self.e(x), m.sum(1).clamp(min=1), batch_first=True, enforce_sorted=False)
        return self.o(self.r(p)[1][0][-1])
class Transformer(nn.Module):
    def __init__(self):
        super().__init__(); self.e = nn.Embedding(V, D); self.p = nn.Embedding(48, D)
        self.t = nn.TransformerEncoder(nn.TransformerEncoderLayer(D, 4, 32, batch_first=True, dropout=0.1), 1); self.o = nn.Linear(D, 2)
    def forward(self, x, m):
        h = self.t(self.e(x) + self.p(torch.arange(x.shape[1])), src_key_padding_mask=~m.bool()); mf = m[..., None].float()
        return self.o((h * mf).sum(1) / mf.sum(1).clamp(min=1))

class Pretrained(nn.Module):
    def __init__(self): super().__init__(); self.m = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=2)
    def forward(self, x, m): return self.m(input_ids=x, attention_mask=m).logits

def non_embedding(m): return sum(p.numel() for n, p in m.named_parameters() if not n.startswith(("e.", "p.")))
print("parameters beyond the shared embedding: " + ", ".join(f"{c.__name__} {non_embedding(c()):,}" for c in (Dense, CNN, LSTM, Transformer)))

def train(model, X, M, y, steps, lr=2e-3, bs=64):
    opt = torch.optim.AdamW(model.parameters(), lr); t0 = time.time()
    for _ in range(steps):
        model.train(); i = torch.randint(0, len(X), (bs,))
        loss = F.cross_entropy(model(X[i], M[i]), y[i]); opt.zero_grad(); loss.backward(); opt.step()
    model.eval()
    with torch.no_grad():
        out = torch.cat([model(Xva[j:j + 128], Mva[j:j + 128]) for j in range(0, 872, 128)])
    return (out.argmax(1) == yva).float().mean().item(), time.time() - t0

print("\\ntraining examples   " + "".join(f"{c.__name__:>13}" for c in (Dense, CNN, LSTM, Transformer)) + "   DistilBERT fine-tuned")
for n in [500, 5000, 50000]:
    X, M, y = encode("train", n); row = []
    for cls in (Dense, CNN, LSTM, Transformer):
        torch.manual_seed(0); row.append(train(cls(), X, M, y, steps=max(300, 3 * n // 64)))
    cell = "   not run: over an hour on CPU"
    if n <= 5000:
        torch.manual_seed(0); a, s = train(Pretrained(), X, M, y, steps=max(60, n // 32), lr=3e-5, bs=32)
        cell = f"{a:12.3f} ({s:.0f}s)"
    print(f"{n:<19} " + "".join(f"{a:7.3f} ({s:3.0f}s)" for a, s in row) + "  " + cell)`,
        out: `parameters beyond the shared embedding: Dense 21,442, CNN 18,722, LSTM 17,042, Transformer 21,218

training examples           Dense          CNN         LSTM  Transformer   DistilBERT fine-tuned
500                   0.609 ( 11s)  0.608 ( 17s)  0.576 ( 74s)  0.558 ( 48s)         0.797 (476s)
5000                  0.704 ( 10s)  0.714 ( 17s)  0.696 ( 31s)  0.680 ( 30s)         0.864 (538s)
50000                 0.790 ( 22s)  0.775 ( 31s)  0.798 ( 60s)  0.775 ( 72s)     not run: over an hour on CPU`,
       
        notes: [
          { t: "p", text: "The textbook expectation is that the from-scratch transformer is worst at small data and catches up as data grows, because it has the least built-in structure and the most to learn. Run it rather than assume it. In the reference run on SST-2, with every model at about 17,000–21,000 parameters beyond a shared embedding, the transformer was last at 500 examples (0.558) and still behind at 50,000 (0.775 against the LSTM's 0.798): at this size and data budget the curves converge but do not cross. Short single sentences are also a task where word order adds little over a bag of words, which is why the dense model keeps pace. The crossover the theory predicts needs more data, longer inputs or a bigger model, and finding where it happens on your own task is the useful measurement." },
          { t: "p", text: "The pretrained model is the result that reframes everything. In the reference run a fine-tuned DistilBERT scored 0.797 at 500 examples — level with the best from-scratch model trained on a hundred times as much data (0.798 at 50,000) — and 0.864 at 5,000. It was also by far the slowest on a CPU (about eight minutes against seconds), so on a GPU it is cheap and on a laptop it is the expensive option. Lesson 2.5 measured the vision equivalent at +32.8 points. Running this once is worth more than any amount of being told that transfer learning dominates architecture choice." },
          { t: "p", text: "Record wall-clock alongside accuracy, because it changes the practical conclusion. The transformer trains faster per epoch than the LSTM at any real sequence length due to parallelism, so even where their accuracies are comparable the iteration speed differs — and iteration speed is usually what determines how good your final model is, since it sets how many ideas you can try." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a transformer chosen for a small dataset",
      body: [
        { t: "p", text: "**Symptom.** A team chose a transformer for a classification task with a few thousand examples, and an LSTM beat it." },
        { t: "p", text: "**Mechanism.** Transformers have weak inductive bias and need more data or pretraining. At small data sizes, models with more built-in structure did better." },
        { t: "p", text: "**Fix.** Model choice is made from a learning curve across dataset sizes, and a pretrained model is the default when data is small." }
      ] }
  ],

  takeaways: [
    "Each architecture encodes an assumption: unordered features, local structure, sequential state, or nothing at all.",
    "Inductive bias is a data budget — weaker assumptions need more data and reward it with a higher ceiling.",
    "Measured at input=128, hidden=256: RNN 98,816, GRU 296,448, LSTM 395,264, one transformer layer 789,760.",
    "The `4h(h+d)` formula is 2,048 short of PyTorch's count — the two redundant bias vectors.",
    "Recurrence for streaming, bounded memory and very long sequences; transformers for essentially everything else.",
    "Try gradient-boosted trees before a neural network on tabular data.",
    "The choice that matters most is usually which pretrained model, not which architecture."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why are transformers described as data-hungry?",
      options: ["They have far more parameters that must be fitted", "Little built-in structure, so data must teach it", "They train slowly on any hardware you can get", "They need very large batches before they converge"],
      answer: 1,
      why: "A CNN is given translation equivariance for free; a transformer must discover from examples that adjacent tokens relate and that order matters. Weaker assumptions mean more to learn, which needs more data — and rewards it with a higher ceiling, which is why ViT loses to a ResNet on small datasets and wins on very large ones." },
    { stem: "How many parameters does an LSTM have relative to a vanilla RNN at the same sizes?",
      options: ["The same", "Three times", "Exactly 4×", "Eight times"],
      answer: 2,
      why: "Four gates each need their own input and recurrent matrices: measured 395,264 against 98,816 at input=128, hidden=256. GRU sits at exactly 3× with its three gates. A single transformer layer at comparable width costs about twice the LSTM." },
    { stem: "For a tabular classification problem with 10,000 rows, what would you try first?",
      options: ["A deep neural network", "Gradient-boosted trees", "An LSTM over the rows", "A transformer encoder"],
      answer: 1,
      why: "On most tabular problems XGBoost or LightGBM match or beat neural networks, train in seconds, handle missing values and mixed types natively, and need little tuning. Neural networks become competitive with high-cardinality categoricals that benefit from embeddings, or when fusing tabular data with text or images." },
    { stem: "When is a recurrent model still clearly the right choice?",
      options: ["For every kind of NLP task, without exception", "Streaming with bounded memory, or huge lengths", "Whenever the training dataset is very large", "Whenever strong pretrained models are available"],
      answer: 1,
      why: "An LSTM carries a fixed-size state however long the stream runs, while a transformer's attention is quadratic and its KV cache grows with context — 369 MB per sequence at 10,000 tokens for a modest model. For real-time processing under a memory budget, recurrence still wins." }
  ] },

  interview: { title: "Interview", sub: "Architecture selection", questions: [
    { level: "Core", q: "How would you choose between these architectures for a new problem?",
      strong: "By the structure of the input and the amount of data — and first by asking what pretrained model exists.",
      answer: [{ t: "p", text: "I would start by asking what pretrained model covers the problem, because for text the answer is always a transformer and fine-tuning it will beat anything I train from scratch. Failing that, I would match the architecture to the input's structure: dense networks for unordered tabular features, though I would try gradient-boosted trees first and usually keep them; convolutions where locality and translation invariance hold, which is images and spectrograms; recurrence where I need streaming or bounded memory; and transformers where any position may relate to any other and I have the data to learn those relations. The data volume is the second axis, because architectures with weaker assumptions need more examples — a transformer from scratch on a few thousand rows will lose to an LSTM, and win comfortably at a few million." }] },
    { level: "Senior", q: "Explain inductive bias and why it matters practically.",
      strong: "Built-in assumptions are knowledge the model needn't learn — they trade ceiling for data efficiency.",
      answer: [{ t: "p", text: "Inductive bias is what an architecture assumes before seeing any data. A convolution assumes that nearby inputs relate and that a pattern is worth detecting wherever it appears, so translation equivariance is free rather than learned. A recurrence assumes order matters and history should be summarised into a running state. Self-attention assumes essentially nothing. Practically this is a data budget: a strong assumption is knowledge you do not have to pay examples for, so a CNN learns from thousands of images where a vision transformer needs millions. The flip side is that a correct-but-restrictive assumption caps you — attention can learn relationships a convolution structurally cannot express, which is why transformers overtake CNNs at scale. So the practical question is always whether I have enough data to let the model discover the structure, or whether I should hand it the structure for free. And if there is a pretrained model, that changes the calculation entirely, since someone else already paid the data cost." }] },
    { level: "Senior", q: "Your team wants to build a custom architecture for a new problem. How would you respond?",
      strong: "Establish a pretrained baseline first; custom architecture is rarely where the returns are.",
      answer: [{ t: "p", text: "I would want a pretrained baseline established before any architecture work starts, because it sets the bar and very often clears it. I have measured the vision version of this: a frozen ImageNet ResNet-18 with a new head reached 67.1 % on a small dataset where the same architecture trained from scratch reached 34.3 % — identical architecture, thirty-three points of difference from the weights alone. That is a larger effect than almost any architectural change would produce. After that baseline I would look at the data, the augmentation and the fine-tuning strategy, which is where returns usually are. I would support a custom architecture when there is a concrete structural reason the standard ones fail — an unusual input modality, a hard latency or memory constraint, a symmetry worth building in — and I would want that stated as a specific hypothesis with a measurement attached, not as a general feeling that our problem is special. The failure mode I have seen is spending three weeks building something bespoke that ends up matching the baseline." }] }
  ] }
});
