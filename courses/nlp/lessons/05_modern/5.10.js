/* ============================================================================
   LESSON 5.10 — Mixture of Experts
   ========================================================================= */
EC.receiveLesson({
  id: "5.10",

  lede: "**Without a load-balancing loss one expert held 46.3% of the tokens; with it, 15.0% — and the task loss was identical, 0.0316 against 0.0321.** Eight experts should each see about 12.5%. The auxiliary loss is not a quality-versus-utilisation trade; it corrects a pathology that wastes capacity for nothing. This lesson builds a Mixture of Experts layer from the code, computes what the sparsity actually buys, and induces the failure that makes the extra loss term necessary.",

  objectives: [
    "Explain how MoE decouples total parameters from compute per token",
    "Build a router and an MoE layer and verify the shapes",
    "Induce router collapse and diagnose the feedback loop that causes it",
    "Derive what the auxiliary load-balancing loss does and why it has gradients",
    "State why MoE is harder to serve than a dense model of equal quality"
  ],

  prerequisites: ["5.9", "4.6"],

  blocks: [

    { t: "h2", n: "01", text: "The core idea", id: "idea" },

    {"kind": "trace", "title": "Sixty-four times the parameters at twice the compute", "caption": "**Total parameters grow with the expert count; compute per token does not — it is fixed by `top_k`.** So 128 experts at top-2 is **64× the parameters of a dense FFN at 2.0× its compute**, and the compute column is constant from 2 experts onward. The deployed ratios are lower than the table's ceiling because attention is not replicated: **Mixtral 8x7B is 46.7B total and 12.9B active (3.6×), DeepSeek-V3 is 671B and 37B (18.1×).**", "left": "experts", "codeW": 130, "vars": ["total params", "active (top-2)", "params ratio", "compute"], "steps": [{"code": "1 (dense)", "state": ["2,097,152", "2,097,152", "1.0", "1.0x"], "tone": "accent"}, {"code": "8", "state": ["16,777,216", "4,194,304", "4.0", "2.0x"], "changed": [0, 2], "tone": "good"}, {"code": "64", "state": ["134,217,728", "4,194,304", "32.0", "2.0x"], "changed": [0, 2], "tone": "violet"}, {"code": "128", "state": ["268,435,456", "4,194,304", "64.0", "2.0x"], "changed": [0, 2], "tone": "violet", "note": "compute never moves"}], "t": "diagram", "id": "dg-5_10-01-0"},




    { t: "p", text: "In a dense transformer, every token passes through every parameter of every FFN. In an MoE transformer the FFN is replaced by several parallel FFN *experts* plus a small **router** that picks which ones handle each token. Total parameters grow with the expert count; compute per token does not." },

    { t: "out", text:
"a dense FFN at d_model 512, d_ff 2048 is 2,097,152 params\n\nexperts   total params    active (top-2)   ratio   compute vs dense\n1            2,097,152        2,097,152      1.0          1.0x\n2            4,194,304        4,194,304      1.0          2.0x\n8           16,777,216        4,194,304      4.0          2.0x\n16          33,554,432        4,194,304      8.0          2.0x\n64         134,217,728        4,194,304     32.0          2.0x\n128        268,435,456        4,194,304     64.0          2.0x" },

    { t: "callout", kind: "insight", title: "64 experts is 64x the parameters and 2x the compute",
      body: [{ t: "p", text: "That is the entire proposition. Model capacity — how much the network can *know* — scales with total parameters. Inference FLOPs scale with *active* parameters. MoE decouples them, so you can build a model with the knowledge of a very large network and the per-token cost of a small one. The row that matters is 64 experts: 32x the parameter count of top-2's active set, while every token still runs through exactly two FFNs. Note also that top-2 routing costs 2x a dense FFN, not 1x — you are running two experts, so sparse does not mean cheaper than dense, it means far more capacity for a small fixed multiple." }] },

    { t: "table",
      head: ["Model", "Experts", "Top-k", "Total", "Active", "Ratio"],
      rows: [
        ["Mixtral 8x7B", "8", "2", "46.7B", "12.9B", "3.6x"],
        ["Switch-Base", "128", "1", "—", "—", "—"],
        ["DeepSeek-V3", "256", "8", "671B", "37B", "18.1x"]
      ] },

    { t: "callout", kind: "trap", title: "Mixtral 8x7B is not 56B",
      body: [{ t: "p", text: "The name invites the multiplication, and it is wrong. Only the **FFN** layers are replicated across experts — attention, embeddings and norms are shared by all of them. Since the FFN is roughly two-thirds of a block (lesson 4.6) and attention is the other third, eight copies of two-thirds plus one copy of one-third comes to **46.7B**, not 56B. Active parameters are 12.9B rather than 2×7B for the same reason: each token uses the shared attention plus two experts' FFNs. Read any `NxM` MoE name as a description of the expert count, never as arithmetic." }] },

    { t: "h2", n: "02", text: "The router", id: "router" },

    {"kind": "trace", "title": "Routing is per token, and the layer is shape-preserving", "caption": "**The first token goes to experts [4, 6] with weights [0.6088, 0.3912], summing to exactly 1.0** — and routing is **per token, not per sequence**, so different words in the same sentence go to different experts and the same word can route differently depending on context. The layer is shape-preserving — **(2, 10, 64) in and out — so it drops into a transformer block exactly where the FFN was**, which is why MoE is a substitution rather than a redesign.", "left": "property", "codeW": 170, "vars": ["value"], "steps": [{"code": "input -> output", "state": ["(2, 10, 64) -> (2, 10, 64)"], "tone": "good", "note": "shape preserved"}, {"code": "parameters", "state": ["265,216 vs a dense 33,088 (8.0x)"], "changed": [0], "tone": "accent"}, {"code": "router output", "state": ["scores (2, 10, 2), indices (2, 10, 2)"], "changed": [0], "tone": "good"}, {"code": "first token", "state": ["experts [4, 6] at [0.6088, 0.3912]"], "changed": [0], "tone": "violet", "note": "per token, not per sequence"}], "t": "diagram", "id": "dg-5_10-02-1"},




    { t: "code", lang: "python", title: "token-choice top-k routing", code:
"class Router(nn.Module):\n    def __init__(self, d_model, num_experts, top_k=2):\n        super().__init__()\n        self.gate = nn.Linear(d_model, num_experts, bias=False)\n        self.top_k = top_k\n\n    def forward(self, x):                       # (batch, seq, d_model)\n        logits = self.gate(x)                   # (batch, seq, num_experts)\n        scores = F.softmax(logits, dim=-1)\n        top_k_scores, top_k_indices = scores.topk(self.top_k, dim=-1)\n        # renormalise so the chosen experts' weights sum to 1\n        top_k_scores = top_k_scores / top_k_scores.sum(dim=-1, keepdim=True)\n        return top_k_scores, top_k_indices",
      caption: "One linear layer per MoE block — `d_model × num_experts`, which is negligible. The renormalisation matters: without it the output scale would depend on how confident the router happened to be." },

    { t: "out", text:
"MoELayer(d_model=64, d_ff=256, num_experts=8, top_k=2)\n\n  input (2, 10, 64) -> output (2, 10, 64)      shape preserved\n  265,216 params against one dense FFN's 33,088   (8.0x)\n\n  router scores (2, 10, 2)   indices (2, 10, 2)\n  first token -> experts [4, 6] with weights [0.6088, 0.3912]\n  weights sum to 1.000000" },

    { t: "p", text: "Routing is **per token**, not per sequence — different words in the same sentence go to different experts, and the same word can route differently depending on context. The layer is shape-preserving, so it drops into a transformer block exactly where the FFN was." },

    { t: "h2", n: "03", text: "Router collapse", id: "collapse" },

    {"kind": "trace", "title": "A 0.5 logit head start became 46% of all tokens, and stayed there", "caption": "Top-1 routing over 8 experts with one expert given a 0.5 head start — **standing in for the random initial asymmetry any real model has.** Without a load-balancing loss it **never recovers: 42.6% at step 0, 46.3% at step 599**, with final entropy 1.7098 against a uniform 2.0794. With the auxiliary loss at `α = 0.05` the same run **falls to 15.0% busiest and entropy 2.0720 — essentially uniform.** And the MSE is unchanged (0.0316 against 0.0321), **so balance cost nothing in task loss here.**", "left": "step", "codeW": 130, "vars": ["busiest, no aux loss", "busiest, with aux loss"], "steps": [{"code": "0", "state": ["42.6%", "42.6%"], "tone": "accent"}, {"code": "100", "state": ["46.3%", "16.0%"], "changed": [0, 1], "tone": "crit"}, {"code": "300", "state": ["41.4%", "15.8%"], "changed": [0, 1], "tone": "crit"}, {"code": "599", "state": ["46.3%", "15.0%"], "changed": [0, 1], "tone": "crit", "note": "uniform would be 12.5%"}, {"code": "final entropy", "state": ["1.7098", "2.0720"], "changed": [0, 1], "tone": "violet", "note": "uniform = 2.0794"}], "t": "diagram", "id": "dg-5_10-03-2"},




    { t: "p", text: "The failure mode MoE is prone to is that the router stops using most of its experts. To show it I used top-1 routing over 8 experts and gave one expert a 0.5 logit head start — standing in for the random initial asymmetry any real model has." },

    { t: "out", text:
"NO load-balancing loss\n\n  step    busiest   token fraction per expert\n  0       42.6%     [0.426, 0.072, 0.074, 0.082, 0.100, 0.080, 0.074, 0.092]\n  100     46.3%     [0.463, 0.041, 0.057, 0.059, 0.092, 0.111, 0.088, 0.090]\n  300     41.4%     [0.414, 0.059, 0.068, 0.068, 0.104, 0.125, 0.078, 0.084]\n  599     46.3%     [0.463, 0.045, 0.057, 0.055, 0.094, 0.080, 0.115, 0.092]\n\n  final entropy 1.7098 (uniform = 2.0794)   final MSE 0.0316" },

    { t: "out", text:
"WITH auxiliary loss, alpha = 0.05\n\n  step    busiest   token fraction per expert\n  0       42.6%     [0.426, 0.072, 0.074, 0.082, 0.100, 0.080, 0.074, 0.092]\n  100     16.0%     [0.135, 0.092, 0.135, 0.119, 0.135, 0.160, 0.100, 0.125]\n  300     15.8%     [0.104, 0.129, 0.139, 0.119, 0.117, 0.158, 0.105, 0.129]\n  599     15.0%     [0.104, 0.121, 0.119, 0.131, 0.150, 0.115, 0.146, 0.113]\n\n  final entropy 2.0720 (uniform = 2.0794)   final MSE 0.0321" },

    { t: "callout", kind: "crit", title: "The imbalance entrenched, and the aux loss cleared it within 100 steps",
      body: [{ t: "p", text: "Without the loss the seeded expert held **46.3%** of tokens at step 599 — more than at step 0, so the advantage was self-reinforcing rather than washing out. With the loss, the same starting imbalance was corrected to **16.0% by step 100** and settled at 15.0%, entropy 2.0720 against a uniform 2.0794. And the task MSE was **0.0316 against 0.0321** — statistically identical. That is the finding worth remembering: the auxiliary loss did not trade quality for balance. It recovered wasted capacity for free." }] },

    { t: "callout", kind: "note", title: "What the demonstration did and did not show",
      body: [{ t: "p", text: "This is a *partial* collapse that entrenched, not a runaway one — the busiest expert stayed near 46% rather than reaching 100%. My first attempt, with identical experts and structureless data, produced no imbalance at all: both conditions came out near-uniform at entropy 2.076. That failure is informative. Collapse is a **feedback loop**, and a loop needs a seed and something to reinforce. With random targets there was nothing for an expert to specialise on. Real models have both — random initialisation creates asymmetry, and real data has structure worth specialising on — which is why the aux loss is standard rather than optional." }] },

    { t: "h2", n: "04", text: "Why the loop runs", id: "loop" },

    { t: "diagram", kind: "cycle", title: "Rich get richer", centre: "Collapse",
      nodes: [
        { text: "Random init makes one expert marginally better" },
        { text: "Router sends those tokens to it" },
        { text: "Only that expert receives gradient from them" },
        { text: "It improves; the others do not" },
        { text: "The router's preference strengthens" }
      ] },

    { t: "p", text: "The mechanism is specifically that routing is **discrete**. An expert that is not selected receives no gradient at all — it is not merely trained less, it is not trained. So a small initial advantage compounds into a permanent one, and the unused experts remain at their random initialisation while consuming memory." },

    { t: "h2", n: "05", text: "The auxiliary loss", id: "aux" },

    {"kind": "trace", "title": "One term carries no gradient and the other carries all of it", "caption": "**`f_i` is the fraction of tokens routed to expert `i` — discrete, computed by counting, and it carries no gradient. `P_i` is the mean router probability — continuous, and where all the gradient flows.** Their product is minimised when both are uniform, and the arithmetic is clean: **at `f_i = P_i = 1/N` the sum is exactly 1.0 for any `N`, and total collapse onto one expert gives `N`.** `α` is typically **0.01** — **a nudge that prevents collapse, not an objective that overrides the task.**", "left": "term", "codeW": 150, "vars": ["what it is", "gradient?"], "steps": [{"code": "f_i", "state": ["fraction of tokens routed there", "none - it is a count"], "tone": "warn"}, {"code": "P_i", "state": ["mean router probability", "all of it"], "changed": [0, 1], "tone": "violet"}, {"code": "uniform routing", "state": ["loss = 1.0 at N=8 and N=64", "-"], "changed": [0, 1], "tone": "good"}, {"code": "total collapse", "state": ["loss = 8.0 at N=8, 64.0 at N=64", "-"], "changed": [0], "tone": "crit"}, {"code": "alpha", "state": ["typically 0.01", "a nudge, not an objective"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-5_10-05-3"},




    { t: "math", tex: "\\mathcal{L}_{\\text{aux}} = \\alpha \\cdot N \\sum_{i=1}^{N} f_i \\cdot P_i" },

    { t: "dl", items: [
      ["`f_i`", "The **fraction of tokens** routed to expert `i`. Discrete, computed by counting — it carries no gradient."],
      ["`P_i`", "The **mean router probability** assigned to expert `i`. Continuous, and where all the gradient flows."],
      ["The product", "Minimised when both are uniform. At `f_i = P_i = 1/N` the sum is `N · N · (1/N²) = 1.0` for any N; total collapse onto one expert gives `N`."],
      ["`α`", "Typically 0.01. Small, because the aim is a nudge that prevents collapse, not an objective that overrides the task."]
    ] },

    { t: "out", text:
"experts   uniform routing   total collapse\n8              1.0000              8.0\n64             1.0000             64.0" },

    { t: "callout", kind: "insight", title: "The gradient flows through the probabilities, not the counts",
      body: [{ t: "p", text: "This is the design detail worth understanding. `f_i` comes from a `topk` and an argmax — non-differentiable, so no gradient passes through it. Multiplying it by `P_i`, which *is* differentiable, creates a term whose gradient pushes down the router's **probability** for experts that are currently over-subscribed. The discrete routing then follows, because it is derived from those probabilities. So the loss steers a hard assignment by shaping the soft distribution behind it — the same trick that appears wherever a discrete decision has to be trained by gradient descent." }] },

    { t: "p", text: "Two other mechanisms usually accompany it. **Expert capacity** caps how many tokens any expert may process in a batch, with overflow tokens dropped or passed through the residual — a hard guarantee where the aux loss is only a soft pressure. **Noise injection** adds randomness to the router logits during training so that a marginally-worse expert still occasionally gets tokens, which breaks the feedback loop at its source." },

    { t: "h2", n: "06", text: "Why MoE is hard to serve", id: "serving" },

    {"kind": "trace", "title": "Sixty gigabytes resident to use fifteen", "caption": "**All 60.1 GB of experts must be resident, because the router picks per token and you cannot know in advance which experts a sequence will need — while the active compute is 15.0 GB worth of weights.** Which is exactly why MoE is cheap to *train* and awkward to *serve*: **you pay dense memory for sparse compute**, and the memory is what a serving deployment is constrained by. One expert in one layer is only 0.23 GB — **the problem is the product of 8 and 32.**", "left": "quantity", "codeW": 190, "vars": ["memory", "note"], "steps": [{"code": "one expert, one layer", "state": ["0.23 GB", "small"], "tone": "good"}, {"code": "all experts, all layers", "state": ["60.1 GB", "must ALL be resident"], "changed": [0, 1], "tone": "crit"}, {"code": "active compute per token", "state": ["15.0 GB worth", "what you actually use"], "changed": [0, 1], "tone": "violet"}, {"code": "so", "state": ["dense memory, sparse compute", "the serving constraint"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-5_10-06-4"},




    { t: "out", text:
"Mixtral-like: 8 experts, d_model 4096, d_ff 14336, 32 layers, fp16\n\n  one expert, one layer                 0.23 GB\n  all experts, all layers              60.1 GB   must ALL be resident\n  active compute per token             15.0 GB worth of weights" },

    { t: "callout", kind: "crit", title: "You pay memory for the total and FLOPs for the subset",
      body: [{ t: "p", text: "Every expert must be in memory, because *any* token might route to it — you cannot know in advance. So the memory footprint is the **full** 60.1 GB while the compute is only the active 15.0 GB worth. That is exactly backwards from what a serving budget wants, and it is why MoE models are cheaper to train and to run per-FLOP but not cheaper to *host*. Two further problems compound it: routing is data-dependent, so different tokens in the same batch need different experts, which fragments the batched matrix multiplies that make GPUs fast; and in a distributed deployment, experts live on different devices, so routing becomes a **network** operation with all-to-all communication every layer. MoE is a training-efficiency and quality-per-FLOP win, not a deployment simplification." }] },

    { t: "exercise", kind: "Challenge", title: "Build and break a router", difficulty: "stretch", minutes: 55,
      requirements: [
        "Implement the router and MoE layer and confirm the top-k weights sum to 1 for every token.",
        "Train without a load-balancing loss and plot per-expert token fraction against step.",
        "Add the auxiliary loss, sweep alpha from 0.001 to 0.5, and find where it starts hurting task loss.",
        "Switch from top-2 to top-1 routing and see whether collapse becomes easier to induce.",
        "Compute total and active parameters for an MoE configuration you might use, and the memory each implies."
      ],
      hint: "The Switch-style auxiliary loss is E · Σ_e f_e · P_e, where f_e is the fraction of tokens whose top choice is expert e and P_e is the mean router probability for e. Only P_e carries gradient, and that is enough.",
      solution: {
        lang: "python", title: "moe_router.py",
        code: `import torch, torch.nn as nn, torch.nn.functional as F
d, E = 32, 8

class MoE(nn.Module):
    def __init__(s, k):
        super().__init__(); s.k = k; s.router = nn.Linear(d, E, bias=False)
        s.experts = nn.ModuleList(nn.Sequential(nn.Linear(d, 64), nn.GELU(), nn.Linear(64, d)) for _ in range(E))
    def forward(s, x):
        probs = s.router(x).softmax(-1)
        w, idx = probs.topk(s.k, -1); w = w / w.sum(-1, keepdim=True)
        out = torch.zeros_like(x)
        for j in range(s.k):
            for e in range(E):
                sel = idx[:, j] == e
                if sel.any(): out[sel] += w[sel, j:j + 1] * s.experts[e](x[sel])
        frac = F.one_hot(idx[:, 0], E).float().mean(0)            # fraction routed (top-1 choice) per expert
        aux = E * (frac * probs.mean(0)).sum()                   # Switch-style load-balancing loss
        s.w, s.frac = w, frac
        return out, aux

# A regression task with a skewed input distribution, so some experts look more useful early on.
torch.manual_seed(0); W_true = torch.randn(d, d)
def data(n=512):
    x = torch.randn(n, d) + torch.where(torch.rand(n, 1) < 0.8, 0.5, -0.5)
    return x, torch.tanh(x @ W_true / d ** 0.5)

def train(k, alpha, steps=400, seed=0):
    torch.manual_seed(seed); m = MoE(k)
    with torch.no_grad(): m.router.weight[0] += 0.5                 # nudge one expert ahead, as random init often does
    opt = torch.optim.Adam(m.parameters(), 3e-3); hist = []
    for t in range(steps):
        x, y = data(); out, aux = m(x); task = F.mse_loss(out, y)
        (task + alpha * aux).backward(); opt.step(); opt.zero_grad()
        if t in (0, 100, 399): hist.append(m.frac.max().item())
    x, y = data(2048)
    with torch.no_grad(): out, _ = m(x)
    return m, hist, F.mse_loss(out, y).item()

m, _, _ = train(2, 0.0, steps=1)
x, _ = data(64); m(x)
print(f"top-2 weights sum to 1 for every token: {torch.allclose(m.w.sum(-1), torch.ones(64))}")

print("\\nk  alpha   busiest expert share at step 0 / 100 / 400   held-out task MSE")
for k in (2, 1):
    for alpha in ((0.0, 0.01, 0.1, 0.5) if k == 2 else (0.0, 0.1)):
        _, hist, mse = train(k, alpha)
        print(f"{k}  {alpha:5}   " + " / ".join(f"{h:.2f}" for h in hist) + f"   {mse:.4f}")

# 5. Total against active parameters for a Mixtral-8x7B-style configuration.
dm, dff, L, experts, k, vocab = 4096, 14336, 32, 8, 2, 32000
expert = 3 * dm * dff; attn = 4 * dm * dm // 4 * 2.5            # GQA attention, roughly 2.5·d² per layer
total = L * (experts * expert + attn) + 2 * vocab * dm; active = L * (k * expert + attn) + 2 * vocab * dm
print(f"\\n8x7B-style: total {total / 1e9:.1f}B, active per token {active / 1e9:.1f}B; "
      f"fp16 memory for all experts {2 * total / 1e9:.0f} GB even though each token uses {active / total:.0%}")
`,
        out: `top-2 weights sum to 1 for every token: True

k  alpha   busiest expert share at step 0 / 100 / 400   held-out task MSE
2    0.0   0.80 / 0.79 / 0.80   0.0238
2   0.01   0.80 / 0.30 / 0.18   0.0218
2    0.1   0.80 / 0.15 / 0.15   0.0258
2    0.5   0.80 / 0.15 / 0.15   0.0272
1    0.0   0.80 / 0.79 / 0.80   0.0308
1    0.1   0.80 / 0.15 / 0.15   0.0343

8x7B-style: total 46.7B, active per token 12.9B; fp16 memory for all experts 93 GB even though each token uses 28%`,
        notes: [
          { t: "p", text: "Renormalising the top-k weights makes them sum to 1 for every token. With one expert nudged ahead at initialisation and no auxiliary loss, routing collapsed and stayed collapsed: 80% of tokens went to one expert at step 400, the same as at step 0. Nothing in the task loss pushes the router to spread work." },
          { t: "p", text: "A small auxiliary loss fixed it. At α = 0.01 the busiest expert fell to 18%, and the task MSE was the best of the sweep, 0.0218 against 0.0238 without balancing, because more experts were trained. At α = 0.1 and above, load became nearly uniform (15%) but task loss rose to 0.0258–0.0272: the router was forced to balance at the expense of matching inputs to the right expert." },
          { t: "p", text: "Top-1 routing behaved the same way but scored worse throughout (0.0308 unbalanced, 0.0343 balanced), because each token gets one expert's opinion instead of a blend of two. An earlier version of this experiment used clusters so far apart that a linear router could not split them. Every α then gave an identical 80% share. If balancing appears to do nothing, check whether the inputs leave the router any choice." },
          { t: "p", text: "The 8×7B-style configuration has 46.7B parameters in total and 12.9B active per token. All 93 GB of fp16 weights must still be in memory, because any token may route to any expert. MoE saves compute per token, not memory." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: an MoE model where one expert did all the work",
      body: [
        { t: "p", text: "**Symptom.** A mixture-of-experts model trained to the same loss as a dense model of the same active size, with no benefit from its extra parameters." },
        { t: "p", text: "**Mechanism.** Without a load-balancing loss the router sent most tokens to one expert. The other experts barely trained." },
        { t: "p", text: "**Fix.** An auxiliary load-balancing loss was added and expert utilisation is monitored during training." }
      ] }
  ],

  takeaways: [
    "MoE replaces the dense FFN with parallel experts plus a router, decoupling total parameters from per-token compute.",
    "64 experts with top-2 routing is 64x the FFN parameters at 2x a dense FFN's compute — capacity scales, FLOPs do not.",
    "Top-2 routing costs 2x a dense FFN, not less — sparse means more capacity per FLOP, not fewer FLOPs.",
    "Mixtral 8x7B is 46.7B total and 12.9B active, not 56B: only the FFNs are replicated, attention is shared.",
    "Routing is per token, and the router is one small d_model × num_experts linear layer.",
    "Without a load-balancing loss, a seeded expert held 46.3% of tokens at step 599 — up from 42.6%, so the advantage self-reinforced.",
    "With the auxiliary loss the same imbalance fell to 16.0% by step 100 and 15.0% at the end, at an identical task MSE (0.0316 vs 0.0321).",
    "Collapse is a feedback loop: unselected experts receive NO gradient, so a small advantage compounds into a permanent one.",
    "L_aux = α·N·Σ f_i·P_i equals 1.0 under uniform routing and N under total collapse; the gradient flows only through P_i, since f_i is a count.",
    "Serving is the hard part: all experts must be resident (60.1 GB) while only the active subset computes (15.0 GB), plus fragmented batching and all-to-all communication."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "What does Mixture of Experts actually decouple?",
      options: ["Training cost from inference cost", "Parameter count from per-token FLOPs", "Memory footprint from latency", "Attention from the feed-forward"],
      answer: 1,
      why: "64 experts with top-2 routing gives 64x the FFN parameters while each token still runs through exactly two FFNs. Capacity determines what the model can know; active parameters determine what each token costs. Note top-2 is 2x a dense FFN's compute, so sparse is not cheaper than dense — it is far more capacity for a small fixed multiple." },
    { stem: "Why is Mixtral 8x7B 46.7B parameters rather than 56B?",
      options: ["Quantisation of the weights", "Only FFNs are replicated", "Experts are smaller than 7B", "Weight tying across experts"],
      answer: 1,
      why: "The FFN is roughly two-thirds of a transformer block and attention the other third, so eight copies of the FFN plus one shared attention stack comes to 46.7B. Active parameters are 12.9B rather than 14B for the same reason — each token uses shared attention plus two experts' FFNs. Never read an NxM MoE name as arithmetic." },
    { stem: "Why does router collapse happen?",
      options: ["The router is too small to learn", "Unselected experts get no gradient", "The learning rate is too high", "The softmax saturates early"],
      answer: 1,
      why: "An expert that is not selected is not merely trained less, it is not trained. So a marginally better expert attracts tokens, improves from their gradient while the others do not, and attracts more. Measured, a seeded expert went from 42.6% to 46.3% of tokens over 600 steps — the advantage grew rather than washing out." },
    { stem: "In L_aux = α·N·Σ f_i·P_i, why is the differentiable term multiplied by a non-differentiable one?",
      options: ["To normalise the loss scale", "f_i has no gradient; P_i carries it", "To avoid division by zero", "Both terms are differentiable"],
      answer: 1,
      why: "f_i comes from a topk and an argmax, so nothing flows through it. P_i is the mean router probability and is differentiable. The product steers the hard assignment by shaping the soft distribution it derives from — and measured, that correction cost nothing in task loss, 0.0316 against 0.0321." }
  ] },

  interview: { title: "Interview", sub: "Sparse models", questions: [
    { level: "Core", q: "What is a Mixture of Experts model?",
      strong: "The dense FFN is replaced by parallel experts plus a router, decoupling capacity from per-token compute.",
      answer: [{ t: "p", text: "In each transformer block, instead of one feed-forward network that every token passes through, you have several parallel FFN experts and a small router — a single linear layer — that scores the experts for each token and sends it to the top k, usually one or two. The outputs are combined weighted by the router's normalised scores. The point is decoupling: total parameters scale with the number of experts, but compute per token scales with k. With 64 experts and top-2 routing you get 64 times the FFN parameters at twice a dense FFN's compute. Capacity determines what the model can know; active parameters determine what each token costs. One thing worth getting right in an interview: the naming is misleading. Mixtral 8x7B is 46.7B parameters, not 56B, because only the FFN layers are replicated — attention, embeddings and norms are shared. And active parameters are 12.9B, not 14B, for the same reason. Also worth noting that top-2 routing costs twice a dense FFN, not less, so sparse doesn't mean fewer FLOPs than dense — it means much more capacity for a small fixed multiple of them." }] },
    { level: "Senior", q: "What goes wrong when training a MoE model?",
      strong: "Router collapse — a feedback loop where unselected experts get no gradient at all.",
      answer: [{ t: "p", text: "Router collapse, where a few experts take most of the tokens and the rest sit unused at their random initialisation while still occupying memory. The mechanism is that routing is discrete: an expert that isn't selected receives no gradient at all — not less gradient, none. So random initialisation makes one expert marginally better for some tokens, the router sends those tokens there, only that expert learns from them, it improves while the others don't, and the preference strengthens. A rich-get-richer loop. I demonstrated it by giving one of eight experts a small logit head start: without correction it held 46.3% of tokens after 600 steps, up from 42.6%, so the advantage reinforced rather than washing out. The standard fix is an auxiliary load-balancing loss, alpha times N times the sum over experts of f_i times P_i, where f_i is the token fraction and P_i the mean router probability. The clever part is that f_i is a count with no gradient — pairing it with the differentiable P_i creates a term that pushes down the router's probability for over-subscribed experts, steering the hard assignment by shaping the soft distribution behind it. In my run it corrected the imbalance to 16% within 100 steps at an identical task loss, 0.0316 against 0.0321. It's not a quality trade-off; it recovers wasted capacity for free. Expert capacity caps and router noise are the usual companions." }] },
    { level: "Senior", q: "Would you deploy a MoE model in production?",
      strong: "Only if memory is plentiful — you pay memory for the total and FLOPs for the subset.",
      answer: [{ t: "p", text: "It depends entirely on whether my constraint is memory or compute, and the answer is uncomfortable because MoE optimises the wrong one for most serving setups. Every expert has to be resident in memory, because any token might route to any of them and you can't know in advance. For a Mixtral-like configuration I computed 60.1 GB for all experts across all layers, while the active compute per token corresponds to only about 15 GB of weights. So you pay memory for the total and FLOPs for the subset — exactly backwards from what a serving budget wants, since memory is usually what caps batch size and therefore throughput. Two further problems compound it. Routing is data-dependent, so tokens in the same batch need different experts, which fragments the large batched matrix multiplies that make GPUs efficient — you get many small matmuls instead of a few big ones. And in a distributed deployment experts live on different devices, so every MoE layer becomes an all-to-all network operation, which is a latency and reliability problem, not just a bandwidth one. So I'd deploy MoE when I have plenty of memory and am compute- or cost-per-token constrained, and when I can use a serving stack that handles expert routing properly. If memory is my binding constraint, a dense model of equal quality is easier to serve even though it's worse per FLOP." }] }
  ] }
});
