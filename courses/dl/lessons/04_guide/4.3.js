/* ============================================================================
   LESSON 4.3 — Multi-Head Attention and Positional Encoding
   Head-count parameter invariance measured (d41.py); PE
   properties from d37.py.
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**One attention operation gives each token one weighted average — one relationship.** But *it* in a sentence may need to resolve a pronoun, track the subject of the clause, and register the adjacent verb, all at once. Multi-head attention runs several attentions in parallel on different projections of the same input, and it costs nothing extra because the heads partition the representation rather than duplicating it. This lesson measures that, and then handles the problem lesson 3.8 flagged: attention cannot see order.",

  objectives: [
    "Explain what multiple heads buy and verify the parameter count is unchanged",
    "Choose a head count and relate it to `d_k`",
    "Contrast sinusoidal, learned and rotary positional encodings",
    "State what each positional scheme can and cannot extrapolate to"
  ],

  prerequisites: ["4.2"],

  blocks: [

    { t: "h2", n: "01", text: "Several attentions at once", id: "multihead" },

    { t: "math", tex: "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1,\\dots,\\text{head}_h)W^{O}, \\quad \\text{head}_i = \\text{Attention}(QW_i^{Q}, KW_i^{K}, VW_i^{V})" },

    { t: "out", text: `   1 heads, d_k=512: 1,048,576 parameters
   8 heads, d_k= 64: 1,048,576 parameters
  16 heads, d_k= 32: 1,048,576 parameters` },

    { t: "callout", kind: "insight", title: "Identical parameter counts — heads partition, they do not add",
      body: [{ t: "p", text: "Because `d_k = d_model / h`, the four projection matrices are always `d_model × d_model` in total however many heads you slice them into. One head at 512 dimensions and sixteen heads at 32 dimensions each cost exactly **1,048,576 parameters**. So multi-head attention is free: you are reorganising the same weights into independent subspaces rather than buying more. The trade is expressive breadth against per-head resolution — sixteen heads can track sixteen relationships but each has only 32 dimensions in which to represent similarity." }] },

    { t: "diagram", kind: "compare", title: "One head or eight",
      caption: "Same parameters, same FLOPs. The difference is how many distinct relationships the layer can represent at once.",
      columns: [
        { title: "1 head, d_k = 512", tone: "warn", items: [
          "One weighted average per token",
          "One relationship per position",
          "512 dimensions of similarity resolution",
          "Averaging forces competing relationships to blend"
        ] },
        { title: "8 heads, d_k = 64", tone: "good", items: [
          "Eight independent weighted averages",
          "Eight relationships, concatenated then mixed by W_O",
          "64 dimensions each",
          "Heads specialise: syntax, coreference, adjacency"
        ] }
      ] },

    { t: "p", text: "The standard choice is 8 heads at `d_model = 512`, or 12 at 768 for BERT-base — in both cases `d_k = 64`. That value recurs across model scales because it is roughly the smallest dimension in which dot-product similarity remains discriminative; going much lower makes heads noisy, going much higher wastes the opportunity to specialise." },

    { t: "callout", kind: "note", title: "Head specialisation is real but looser than the textbook story",
      body: [{ t: "p", text: "Probing studies do find heads that track syntactic dependencies, heads that attend to the previous token, and heads that resolve coreference. But they also find that many heads can be pruned with almost no loss — in some analyses the majority — and that specialisation is neither as clean nor as consistent across training runs as the usual 'head 1 learns syntax, head 2 learns semantics' illustration suggests. Treat the illustration as a way to understand *why* multiple heads help, not as a description of what any particular trained model contains." }] },

    { t: "h2", n: "02", text: "Position", id: "position" },

    {"kind": "matrix", "title": "Three ways to tell a transformer where it is", "caption": "Self-attention is permutation-equivariant (3.8), so position must be supplied. The three approaches differ in what they encode and how far they extrapolate: sinusoidal and learned encodings give each position an **absolute** identity, while RoPE rotates Q and K so that only the **relative** offset survives the dot product — which is why it generalises past the training length far better.", "cols": ["Encodes", "Beyond the training length"], "rows": ["Sinusoidal, added", "Learned embedding", "RoPE", "ALiBi", "None"], "cells": [[{"text": "absolute position", "tone": "accent"}, "defined, but degrades"], [{"text": "absolute position", "tone": "accent"}, {"text": "undefined: a fixed table", "tone": "crit"}], [{"text": "relative offset", "tone": "good"}, {"text": "extrapolates well", "tone": "good"}], [{"text": "a distance penalty on scores", "tone": "good"}, {"text": "extrapolates by design", "tone": "good"}], [{"text": "nothing", "tone": "crit"}, "a bag of tokens, at any length"]], "t": "diagram", "id": "dg-4_3-02-0"},





    { t: "p", text: "Lesson 3.8 verified that self-attention is permutation-equivariant to 4.8e-07 — shuffle the input and the output shuffles identically. Without position information a transformer reads a sentence as a bag of tokens. Something must be added." },

    { t: "math", tex: "PE_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right) \\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)" },

    { t: "out", text: `  shape (64, 32), no learnable parameters
  every position has a unique encoding: 64 distinct of 64
  norm is constant: min 4.0000, max 4.0000
  positions 0 and  1: cosine +0.9571
  positions 0 and  2: cosine +0.8581
  positions 0 and  8: cosine +0.6576
  positions 0 and 16: cosine +0.4953
  positions 0 and 32: cosine +0.6016` },

    { t: "p", text: "Each dimension is a sinusoid at a different wavelength, from short to very long, so a position is encoded the way a binary number encodes an integer — different digits flipping at different rates. Every position gets a distinct vector, and the **norm is identical across positions**, so no position is implicitly louder than another in the dot products." },

    { t: "callout", kind: "trap", title: "It does not decay monotonically with distance",
      body: [{ t: "p", text: "Similarity falls from 0.957 at a gap of 1 to 0.495 at 16, then **rises to 0.602 at 32**. Sinusoidal encodings are sums of periodic functions, so their similarity oscillates — distant positions can look more alike than nearer ones. The property is widely described as smooth decay with distance, and over short ranges it is; as a general claim it is false, and the measurement shows where. If you need a clean relative-distance signal, that is what RoPE provides and this does not." }] },

    { t: "table", head: ["Scheme", "Parameters", "Beyond training length", "Used by"],
      rows: [
        ["Sinusoidal", "None", "Defined at any position, though quality degrades", "Original transformer"],
        ["Learned absolute", "`max_len × d_model`", "**Impossible** — no embedding exists", "BERT, GPT-2"],
        ["RoPE", "None", "Extends reasonably; extendable further by interpolation", "LLaMA, most current models"],
        ["ALiBi", "None", "Extrapolates well by design", "BLOOM, some long-context models"]
      ] },

    { t: "callout", kind: "insight", title: "RoPE encodes relative position through rotation",
      body: [{ t: "p", text: "Instead of adding a position vector, RoPE *rotates* each query and key by an angle proportional to its position. Because a dot product between two rotated vectors depends only on the difference of their angles, the attention score between positions i and j automatically depends on `i − j` rather than on i and j separately — relative position falls out of the arithmetic rather than being learned. That is why it became standard: it gives genuine relative-position behaviour with no parameters, and it degrades gracefully past the training length, which learned absolute embeddings cannot do at all since there is simply no vector for position 5,000 if you trained to 4,096." }] },

    { t: "code", lang: "python", title: "Sinusoidal, and where it goes",
      code: `def positional_encoding(max_len, d_model):
    pos = torch.arange(max_len)[:, None].float()
    i = torch.arange(0, d_model, 2).float()
    div = torch.exp(-math.log(10000.0) * i / d_model)
    pe = torch.zeros(max_len, d_model)
    pe[:, 0::2] = torch.sin(pos * div)
    pe[:, 1::2] = torch.cos(pos * div)
    return pe

x = embedding(tokens) * math.sqrt(d_model)     # scale up FIRST
x = x + pe[:x.size(1)]                          # then add position`,
      caption: "The `√d_model` scaling matters: embeddings are initialised small, and without it the positional signal would dominate the token identity at the first layer." },

    { t: "exercise", kind: "practice", title: "Probe heads and positions", difficulty: "advanced", minutes: 40,
      prompt: "Confirm that `nn.MultiheadAttention` has the same parameter count at 1, 4, 8 and 16 heads for fixed `d_model`. Then take a small pretrained transformer, extract the attention matrices from one layer, and plot each head's pattern on a real sentence — identify any head that consistently attends to the previous token or to the sentence start. Separately, generate sinusoidal encodings and plot cosine similarity between position 0 and all others; confirm it oscillates. Finally, train a tiny transformer with and without positional encoding on a task where order matters, such as deciding whether a sequence is sorted.",
      requirements: [
        "Confirm nn.MultiheadAttention has the same parameter count at 1, 4, 8 and 16 heads",
        "Plot each head's attention in a pretrained model on a real sentence",
        "Plot cosine similarity between sinusoidal position 0 and the rest",
        "Train with and without positional encoding on a sortedness task"
      ],
      hints: [
        "Attention weights are available via `need_weights=True`, or by hooking the module.",
        "Previous-token heads show as a bright subdiagonal; attention-sink heads as a bright first column.",
        "For the order task, without positional encoding accuracy should sit at chance."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer, logging as hf_logging
hf_logging.set_verbosity_error(); hf_logging.disable_progress_bar()

for h in [1, 4, 8, 16]:
    print(f"heads {h:>2}: parameters {sum(p.numel() for p in nn.MultiheadAttention(256, h).parameters()):,}")

# Attention patterns of a pretrained model on a real sentence (DistilBERT, layer 1)
tok = AutoTokenizer.from_pretrained("distilbert-base-uncased")
model = AutoModel.from_pretrained("distilbert-base-uncased", attn_implementation="eager").eval()
text = "The engineer who fixed the build went home early because the tests finally passed."
enc = tok(text, return_tensors="pt")
with torch.no_grad(): att = model(**enc, output_attentions=True).attentions      # layers x (1, heads, T, T)
T = enc.input_ids.shape[1]
prev = torch.stack([torch.stack([a[0, :, i, i - 1] for i in range(1, T)], -1).mean(-1) for a in att])   # (layers, heads)
sink = torch.stack([(a[0, :, :, 0] + a[0, :, :, -1]).mean(-1) for a in att])                         # [CLS] + [SEP]
print(f"\\n{T} tokens, {prev.shape[0]} layers x {prev.shape[1]} heads")
for name, score in [("previous-token", prev), ("[CLS]/[SEP] sink", sink)]:
    top = score.flatten().topk(3)
    print(f"strongest {name} heads: " + ", ".join(f"L{i // score.shape[1]}H{i % score.shape[1]} ({v:.2f})" for v, i in zip(top.values.tolist(), top.indices.tolist())))
# To plot one head: plt.imshow(att[layer][0, head]); label both axes with tok.convert_ids_to_tokens(enc.input_ids[0])

def sinusoid(T, d):
    pos = torch.arange(T)[:, None].float(); i = torch.arange(0, d, 2).float()
    pe = torch.zeros(T, d); pe[:, 0::2] = torch.sin(pos / 10000 ** (i / d)); pe[:, 1::2] = torch.cos(pos / 10000 ** (i / d)); return pe
pe = sinusoid(128, 64)
cos = F.cosine_similarity(pe[:1], pe, dim=1)
print("\\ncosine(pos 0, pos k) for k = 0, 4, 8, 16, 32, 64, 127:", " ".join(f"{cos[k]:.2f}" for k in [0, 4, 8, 16, 32, 64, 127]))
print("local minima after k=0 (oscillation):", [k for k in range(1, 127) if cos[k] < cos[k - 1] and cos[k] < cos[k + 1]][:6])

# Is the sequence sorted? Order is the whole signal.
class Clf(nn.Module):
    def __init__(self, use_pe):
        super().__init__(); self.use_pe = use_pe
        self.e = nn.Embedding(20, 64); self.register_buffer("pe", sinusoid(12, 64))
        self.enc = nn.TransformerEncoder(nn.TransformerEncoderLayer(64, 4, 128, batch_first=True, dropout=0.0), 2)
        self.o = nn.Linear(64, 2)
    def forward(self, x):
        h = self.e(x) + (self.pe if self.use_pe else 0)
        return self.o(self.enc(h).mean(1))
def batch(n):
    x = torch.stack([torch.randperm(20)[:12] for _ in range(n)]); y = torch.randint(0, 2, (n,))
    x[y == 1] = x[y == 1].sort(1).values                 # same multiset of tokens; only the order differs
    return x, y
for use_pe in [False, True]:
    torch.manual_seed(0); m = Clf(use_pe); opt = torch.optim.Adam(m.parameters(), 1e-3)
    for _ in range(600):
        x, y = batch(64); loss = F.cross_entropy(m(x), y); opt.zero_grad(); loss.backward(); opt.step()
    m.eval()
    with torch.no_grad(): x, y = batch(2000); acc = (m(x).argmax(1) == y).float().mean().item()
    print(f"sortedness, {'with' if use_pe else 'without'} positional encoding: accuracy {acc:.3f}")`,
        out: `heads  1: parameters 263,168
heads  4: parameters 263,168
heads  8: parameters 263,168
heads 16: parameters 263,168

17 tokens, 6 layers x 12 heads
strongest previous-token heads: L0H2 (0.65), L0H3 (0.52), L3H4 (0.47)
strongest [CLS]/[SEP] sink heads: L3H7 (0.91), L3H6 (0.91), L4H6 (0.88)

cosine(pos 0, pos k) for k = 0, 4, 8, 16, 32, 64, 127: 1.00 0.75 0.70 0.61 0.61 0.43 0.33
local minima after k=0 (oscillation): [5, 10, 16, 22, 29, 39]
sortedness, without positional encoding: accuracy 0.495
sortedness, with positional encoding: accuracy 0.996`,
       
        notes: [
          { t: "p", text: "The sorted-or-not task is the cleanest demonstration that positional encoding is mandatory rather than helpful. Without it the model is at chance and stays there, because sortedness is purely a property of order and self-attention genuinely cannot represent order — I verified the permutation-equivariance at 4.8e-07 in lesson 3.8. It is not a capacity problem, and no amount of training or width fixes it." },
          { t: "p", text: "In the head patterns you will likely find a previous-token head and an attention-sink head that puts most of its weight on the first token regardless of content. The sink is worth recognising: it is not a broken head, it is the model using position 0 as a place to dump attention mass when a head has nothing useful to attend to — softmax forces the weights to sum to 1, so there must be somewhere for them to go. This is why some recent architectures add a dedicated no-op token." },
          { t: "p", text: "The similarity plot should show clear oscillation rather than monotone decay — I measured 0.495 at a gap of 16 and 0.602 at 32. Seeing the actual curve is worth more than the usual slogan about decaying with distance, and it explains why relative schemes like RoPE and ALiBi were introduced: they give the distance-dependence people assumed sinusoids already provided." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a model that could not tell sorted from unsorted",
      body: [
        { t: "p", text: "**Symptom.** A small transformer could not learn whether a sequence was sorted, a task an LSTM learned quickly." },
        { t: "p", text: "**Mechanism.** Positional encoding had been omitted. Without it, attention is permutation-equivariant and cannot see order at all." },
        { t: "p", text: "**Fix.** Positional encoding was added, and a test confirms that shuffling the input changes the output." }
      ] }
  ],

  takeaways: [
    "Heads partition `d_model` rather than adding to it: 1, 8 and 16 heads all cost 1,048,576 parameters.",
    "`d_k = d_model/h` is typically 64 across model scales — small enough to specialise, large enough to discriminate.",
    "Head specialisation is real but looser than the textbook story; many heads prune away with little loss.",
    "Self-attention is permutation-equivariant, so positional information must be added explicitly.",
    "Sinusoidal encoding gives every position a unique vector of constant norm and needs no parameters.",
    "Its similarity oscillates rather than decaying: 0.495 at gap 16, rising to 0.602 at gap 32.",
    "Learned absolute embeddings cannot extend past the training length at all; RoPE rotates queries and keys so relative position emerges from the dot product."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How does the parameter count change going from 1 head to 16 at fixed `d_model`?",
      options: ["It increases 16-fold", "Unchanged: heads split it", "It decreases slightly", "It grows by heads squared"],
      answer: 1,
      why: "Measured identical at 1,048,576 for 1, 8 and 16 heads, because `d_k = d_model/h` keeps the total projection size constant. Multi-head attention reorganises the same weights into independent subspaces rather than buying more, trading per-head resolution for the number of relationships expressible at once." },
    { stem: "Why does a transformer need positional encoding?",
      options: ["To normalise activations", "Attention cannot see order", "To reduce the parameter count", "To prevent saturation"],
      answer: 1,
      why: "Verified to 4.8e-07: shuffling the input shuffles the output identically. Without position information the model reads a sentence as a bag of tokens, so 'dog bites man' and 'man bites dog' are indistinguishable. No amount of capacity or training fixes this — it requires adding position explicitly." },
    { stem: "What is true of sinusoidal positional encoding's similarity between positions?",
      options: ["It decays monotonically", "It oscillates with gap", "It stays constant", "It rises with distance"],
      answer: 1,
      why: "Sinusoids are periodic, so their similarity oscillates and distant positions can look more alike than nearer ones. The 'decays with distance' description holds over short ranges only. Genuine relative-distance behaviour is what RoPE and ALiBi provide." },
    { stem: "Which positional scheme cannot handle sequences longer than those seen in training?",
      options: ["Sinusoidal encoding", "Learned absolute table", "RoPE rotations", "ALiBi distance bias"],
      answer: 1,
      why: "A learned scheme is an `nn.Embedding(max_len, d_model)` lookup — there is simply no row for position 5,000 if you trained to 4,096. Sinusoidal is defined at any position, RoPE extends reasonably and can be stretched by interpolation, and ALiBi is designed to extrapolate." }
  ] },

  interview: { title: "Interview", sub: "Multi-head and position", questions: [
    { level: "Core", q: "What does multi-head attention give you over single-head?",
      strong: "Several relationships per position at identical cost, since heads partition `d_model`.",
      answer: [{ t: "p", text: "A single attention operation produces one weighted average per token, so it can represent one relationship — and if a token needs to track two different things, averaging forces them to blend. Multiple heads run independent attentions on separate projections of the same input and concatenate the results, so several relationships coexist. The part people find surprising is that it is free: because `d_k = d_model/h`, the projection matrices total `d_model × d_model` regardless of head count, and I have measured identical parameter counts at 1, 8 and 16 heads. The real trade is expressive breadth against per-head resolution — sixteen heads each get only 32 dimensions in which to compute similarity. I would add that the usual story of heads cleanly specialising into syntax and semantics is looser than presented; probing does find previous-token and coreference heads, but many heads can be pruned with little loss." }] },
    { level: "Senior", q: "How would you choose the number of attention heads?",
      strong: "Keep d_k around 64 and derive the head count from d_model — it is a partition, not extra capacity.",
      answer: [{ t: "p", text: "I would fix `d_k` near 64 and let the head count follow from `d_model`, which is what the standard configurations do — 8 heads at 512, 12 at 768, both giving `d_k = 64`. The reason that value recurs is that it is roughly the smallest dimension in which dot-product similarity stays discriminative; below about 32 the heads get noisy, and much above 64 you are spending representation width on resolution you do not need instead of on more relationships. The thing to be clear about is that head count is not a capacity knob: because `d_k = d_model/h`, the projection matrices total `d_model × d_model` regardless, and I have measured identical parameter counts at 1, 8 and 16 heads. So it is purely a question of how to partition a fixed budget between breadth and per-head resolution. I would also not expect a large effect from tuning it — probing work finds many heads can be pruned with little loss, which suggests the architecture is fairly insensitive to the exact number once it is in a reasonable range." }] },
    { level: "Senior", q: "Compare positional encoding schemes.",
      strong: "Sinusoidal is parameter-free and extends; learned is flexible but capped; RoPE gives relative position for free.",
      answer: [{ t: "p", text: "Sinusoidal uses fixed sinusoids at different wavelengths. It has no parameters, gives every position a unique vector of constant norm, and is defined at any position, though quality degrades well past training length. One thing worth knowing is that its similarity does not decay monotonically with distance — I measured 0.495 at a gap of 16 rising to 0.602 at 32, because they are periodic functions. Learned absolute embeddings are a lookup table, more flexible but hard-capped: there is no vector for a position beyond the table, so BERT and GPT-2 simply cannot process longer inputs. RoPE is what most current models use — it rotates queries and keys by an angle proportional to position, so the dot product between two positions depends only on their difference and relative position falls out of the arithmetic with no parameters. It also extends beyond training length and can be stretched further by interpolating the frequencies, which is how context windows get extended after pretraining. ALiBi takes a different route, adding a distance-proportional penalty to the scores, and extrapolates best of all by design." }] }
  ] }
});
