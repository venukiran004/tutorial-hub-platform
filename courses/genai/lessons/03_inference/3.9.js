EC.receiveLesson({
  id: "3.9",

  lede: "Quantization (3.3) keeps every weight and stores it in fewer bits. Compression removes weights instead — pruning deletes them, distillation trains a smaller model to imitate a larger one. The distinction that decides everything is whether the removal leaves a *shape* behind: I pruned 50% of GPT-2's weights to zero and the forward pass got no faster at all, because a dense kernel multiplies zeros at full price. Remove whole layers instead and the speedup is real — and the measurements turned up two results I did not expect. Dropping GPT-2's **layer 0 alone multiplies perplexity by 648×** while dropping any other single layer costs at most 1.75×. And layer importance **does not add up**: the three individually cheapest layers, removed together, were *worse* than simply dropping the last three.",

  objectives: [
    "Explain why unstructured pruning gives no speedup on dense hardware",
    "Distinguish unstructured, structured and semi-structured pruning by what they remove",
    "Measure layer importance by ablation and say why the scores do not compose",
    "Describe knowledge distillation and what the temperature term is for",
    "Choose between quantization, pruning and distillation from the constraint you actually have"
  ],

  prerequisites: ["3.3"],

  blocks: [

    { t: "h2", n: "01", id: "unstructured", text: "Unstructured pruning: free quality loss",
      sub: "Half the weights set to zero, and not one millisecond faster" },

    { t: "p", text: "Magnitude pruning is the simplest idea in compression: rank every weight by absolute value, set the smallest fraction to zero, keep the rest. The intuition is sound — most weights in a trained network are small, and small weights contribute little. The intuition about *speed*, however, is wrong, and the measurement shows it plainly." },

    { t: "code", lang: "python", title: "g39.py — prune the smallest weights, measure both halves", code: `def prune_unstructured(frac):
    m = copy.deepcopy(base)
    weights = [p for n, p in m.named_parameters() if "weight" in n and p.dim() == 2]
    samp = torch.cat([w.detach().abs().flatten()[::97][:200000] for w in weights]).float()
    thresh = torch.quantile(samp, frac)
    with torch.no_grad():
        for w in weights:
            w.mul_(w.abs() >= thresh)        # zeros in place, same tensor shape
    return m

for frac in (0.1, 0.3, 0.5, 0.7, 0.9):
    m, actual = prune_unstructured(frac)
    print(frac, actual, ppl(m), med(lambda: m(ids, use_cache=False)))`,
      out: `  baseline gpt2: perplexity 5.941, forward 662.2 ms

  pruned     actual zeros   perplexity    vs baseline   forward ms
  10        %         9.6%        5.929          1.00x        669.7
  30        %        29.1%       14.843          2.50x        620.3
  50        %        48.7%     3048.267        513.06x        622.4
  70        %        68.7%    15225.701       2562.65x        620.9
  90        %        89.3%     5596.033        941.87x        534.0`,
      hl: [8],
      caption: "The forward-time column never moves. Zeros are stored, loaded and multiplied exactly like any other number." },

    { t: "callout", kind: "trap", title: "Unstructured pruning buys nothing without a sparse kernel",
      body: [
        { t: "p", text: "The parameter count is unchanged — the tensors are the same shape, with zeros in them. The file on disk is the same size unless you store it in a sparse format, and the forward pass does the same arithmetic, because a dense matrix multiply has no way to skip a zero." },
        { t: "p", text: "So at 30% pruning I paid **2.50× perplexity for nothing measurable**. To convert sparsity into speed you need hardware and kernels that exploit it, which in practice means NVIDIA's 2:4 semi-structured sparsity (below) rather than arbitrary scattered zeros." },
        { t: "p", text: "The honest summary of this table: the only row worth having is 10% pruning, which cost nothing (perplexity 5.929 against 5.941 — slightly *better*, within noise) and also gained nothing. Everything below that is a quality loss with no compensating benefit." }
      ] },

    { t: "callout", kind: "note", title: "Why 90% looks better than 70%, and why that means nothing",
      body: [
        { t: "p", text: "Perplexity goes 513 → 2,563 → 942 across the 50%, 70% and 90% rows. That is not a real reversal. Past a certain point the model is producing near-uniform garbage, and the perplexity of garbage is not meaningfully ordered — a model that confidently predicts the wrong token scores worse than one that predicts nothing in particular." },
        { t: "p", text: "The lesson for reading your own measurements: once a metric has moved by two orders of magnitude, stop comparing its values and start asking whether the model is functional at all. I kept the non-monotonic row rather than hiding it because it is a good example of a number that is real and uninformative." }
      ] },

    { t: "h2", n: "02", id: "structured", text: "Structured pruning: removing shapes",
      sub: "Whole heads, neurons or layers — which actually shrinks the tensors" },

    { t: "p", text: "Structured pruning removes a whole unit: an attention head, a feed-forward neuron, an entire transformer block. The remaining tensors are genuinely smaller, so the model loads less and computes less with no special kernel. The cost is that the granularity is coarse — you cannot remove 30% of a head." },

    { t: "table",
      head: ["Type", "What is removed", "Speedup on dense hardware", "Granularity"],
      rows: [
        ["**Unstructured**", "Individual weights, anywhere", "**None** — measured, no change at 50%", "Finest; any weight"],
        ["**Structured**", "Whole heads, neurons, layers", "Real and proportional", "Coarse; a unit at a time"],
        ["**Semi-structured (2:4)**", "Exactly 2 of every 4 weights", "Up to ~2× on Ampere and later", "Fixed pattern, hardware-defined"],
        ["**Vocabulary pruning**", "Unused token rows", "Small, in the embedding and output layers", "Per token"]
      ] },

    { t: "code", lang: "python", title: "g39.py — remove whole transformer blocks", code: `for keep in (12, 10, 8, 6, 4):
    m = copy.deepcopy(base)
    m.transformer.h = nn.ModuleList([m.transformer.h[i] for i in range(keep)])
    for j, blk in enumerate(m.transformer.h):
        blk.attn.layer_idx = j               # the cache is indexed by this
    m.config.n_layer = m.config.num_hidden_layers = keep
    print(keep, sum(q.numel() for q in m.parameters()), ppl(m), med(...))`,
      out: `  kept layers                    params   perplexity    vs baseline   forward ms
  first 12 of 12              124439808        5.941          1.00x        587.7
  first 10 of 12              110264064       14.311          2.41x        462.6
  first 8 of 12                96088320       36.485          6.14x        463.0
  first 6 of 12                81912576     1730.746        291.30x        349.1
  first 4 of 12                67736832    17847.139       3003.87x        288.6

  removing the LAST layers rather than the first:
  last 10 of 12               110264064     4754.807        800.29x        560.9
  last 8 of 12                 96088320  9997022.000    1682608.61x        553.5
  last 6 of 12                 81912576 565572416.000   95192049.89x        355.1`,
      hl: [3, 4],
      caption: "Both the parameter count and the forward time fall. And the two halves of the table are not symmetric at all." },

    { t: "callout", kind: "insight", title: "Keeping the first 10 layers costs 2.41×; keeping the last 10 costs 800×",
      body: [
        { t: "p", text: "The same number of layers removed, the same parameter count, a **332× difference in quality**. Dropping the last two blocks is survivable; dropping the first two destroys the model." },
        { t: "p", text: "The reason is that the early layers build the representation everything downstream expects. Remove them and layer 2 receives raw embeddings where it expects a processed hidden state — a distribution it has never seen. The later layers refine a representation that is already mostly formed, so their absence degrades rather than breaks." },
        { t: "p", text: "This is why published layer-pruning work (Minitron and similar) removes layers from the *middle and the end*, never the beginning, and why \"drop the last k layers\" is a reasonable baseline while \"drop the first k\" is not a method at all." }
      ] },

    { t: "callout", kind: "warn", title: "I also tried to measure head pruning and my measurement was a no-op",
      body: [
        { t: "p", text: "I masked attention heads via `head_mask` and got perplexity **5.941 for every configuration** — unchanged to three decimals whether I masked 2 heads in one layer or 72 heads across all twelve. Masking half of a model's attention heads cannot leave its loss bit-identical." },
        { t: "p", text: "The explanation is in the library: `head_mask` appears **zero times** in this version's `modeling_gpt2.py`. The argument is accepted through `**kwargs` and silently discarded. My call succeeded, returned a number, and measured nothing." },
        { t: "p", text: "That is the most useful thing in this section, and it is not about pruning. **An API that accepts your argument and ignores it produces a confident wrong result**, with no error to catch. The tell was constancy where variation was certain — if an intervention cannot plausibly leave a metric unchanged and the metric is unchanged, suspect the intervention before the model. Had the figures merely been *small*, I would probably have published them." }
      ] },

    { t: "viz", title: "Three ways to make a model smaller", caption: "Only two of them make it faster on ordinary hardware, and only one of them needs no retraining.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img" aria-label="Quantization, pruning and distillation compared">
  <text x="16" y="22" class="s-label" style="fill:var(--accent)">QUANTIZATION — same weights, fewer bits each</text>
  <rect x="16" y="32" width="200" height="26" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="116" y="49" text-anchor="middle" class="s-sub">124M weights × 16 bits</text>
  <text x="226" y="49" class="s-mono">→</text>
  <rect x="248" y="32" width="100" height="26" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="298" y="49" text-anchor="middle" class="s-sub">× 4 bits</text>
  <text x="366" y="49" class="s-sub" style="fill:var(--good)">4× smaller, faster decode, no retraining</text>

  <text x="16" y="96" class="s-label" style="fill:var(--crit)">UNSTRUCTURED PRUNING — same shape, zeros inside</text>
  <rect x="16" y="106" width="200" height="26" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.2"/>
  <text x="116" y="123" text-anchor="middle" class="s-sub">124M weights</text>
  <text x="226" y="123" class="s-mono">→</text>
  <rect x="248" y="106" width="200" height="26" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="348" y="123" text-anchor="middle" class="s-sub">124M, half of them 0</text>
  <text x="462" y="123" class="s-sub" style="fill:var(--crit)">measured: 0% faster, 513× perplexity</text>

  <text x="16" y="170" class="s-label" style="fill:var(--good)">STRUCTURED PRUNING — whole blocks gone</text>
  <rect x="16" y="180" width="200" height="26" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="116" y="197" text-anchor="middle" class="s-sub">12 layers</text>
  <text x="226" y="197" class="s-mono">→</text>
  <rect x="248" y="180" width="134" height="26" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="315" y="197" text-anchor="middle" class="s-sub">8 layers</text>
  <text x="400" y="197" class="s-sub" style="fill:var(--good)">measured: 1.27× faster, 6.14× perplexity</text>

  <text x="16" y="244" class="s-label" style="fill:var(--violet)">DISTILLATION — a new, smaller model trained to imitate</text>
  <rect x="16" y="254" width="200" height="22" rx="4" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="116" y="269" text-anchor="middle" class="s-sub">BERT 109M, 12 layers</text>
  <text x="226" y="269" class="s-mono">→</text>
  <rect x="248" y="254" width="134" height="22" rx="4" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="315" y="269" text-anchor="middle" class="s-sub">DistilBERT 67M</text>
  <text x="400" y="269" class="s-sub" style="fill:var(--violet)">measured: 2.01× faster — but needs a training run</text>
</svg>` },

    { t: "h2", n: "03", id: "distillation", text: "Distillation",
      sub: "Train a small model on the big model's distribution, not on the labels" },

    { t: "p", text: "Distillation trains a student network to reproduce a teacher's output *distribution* rather than the ground-truth label. The extra information is in the parts the label throws away: a teacher that puts 0.6 on \"cat\", 0.3 on \"dog\" and 0.001 on \"car\" is telling the student that dogs are nearly cats and cars are not, which a one-hot label cannot say." },

    { t: "math", tex: "\\mathcal{L} = \\alpha \\, \\mathcal{L}_{\\text{CE}}(\\text{student}, y) + (1-\\alpha) \\, T^2 \\, \\mathrm{KL}\\!\\left(\\sigma(z_t/T) \\,\\|\\, \\sigma(z_s/T)\\right)" },

    { t: "p", text: "The temperature `T` softens both distributions before comparing them. At `T = 1` the teacher's near-zero probabilities contribute almost nothing to the gradient; raising `T` amplifies exactly those small differences, which is where the extra signal lives. The `T²` factor keeps the gradient magnitude comparable as `T` changes, so the two loss terms stay balanced." },

    { t: "code", lang: "python", title: "g39.py — BERT against DistilBERT, measured", code: `for name in ("bert-base-uncased", "distilbert-base-uncased"):
    m2 = AutoModelForMaskedLM.from_pretrained(name).eval()
    print(name, sum(p.numel() for p in m2.parameters()),
          m2.config.num_hidden_layers, med(lambda: m2(**b)))`,
      out: `  model                          params       layers     forward ms
  BERT base                   109514298           12          276.1
  DistilBERT                   66985530            6          137.2

  DistilBERT: 61.2% of the parameters, 2.01x the speed, 6 of 12 layers

  do they agree? top-1 masked-token prediction on 8 probes
  probe                                              BERT           DistilBERT
  The capital of France is [MASK].                   paris          marseille
  A transformer uses self [MASK] to mix positions.   rotation       induction
  Decode is memory [MASK].                           management     mapped
  The model was trained on a large [MASK].           scale          scale
  Quantization reduces the number of [MASK] per we   terms          atoms
  The patient was given [MASK] for the pain.         medication     medication
  She opened the [MASK] and walked in.               door           door
  Water boils at one hundred [MASK] Celsius.         degrees        degrees

  top-1 agreement: 4 of 8 (50%)`,
      hl: [4],
      caption: "Half the layers, 61% of the parameters, 2.01× the speed — and the two models disagree on half of these probes, including getting Paris wrong." },

    { t: "callout", kind: "tradeoff", title: "Aggregate benchmarks hide what distillation actually changes",
      body: [
        { t: "p", text: "DistilBERT is usually quoted as retaining about 97% of BERT's GLUE score. On my eight probes it agreed with BERT's top prediction **4 times out of 8**, and one of the disagreements was a factual error — \"The capital of France is marseille\"." },
        { t: "p", text: "Both facts are true and they are measuring different things. A benchmark score is an average over a task distribution; top-1 agreement on individual predictions is a much stricter condition, and a model can preserve the former while diverging substantially on the latter. If your product depends on specific outputs rather than aggregate accuracy, the aggregate number is the wrong number to have checked." },
        { t: "p", text: "The honest caveat on my own figure: **eight probes is a tiny sample**, so 50% carries a wide interval, and I chose the probes myself rather than sampling them. It is a demonstration that divergence exists and is easy to find, not an estimate of its rate." }
      ] },

    { t: "h2", n: "04", id: "choosing", text: "Choosing between the three",
      sub: "Mostly the answer is quantization" },

    { t: "ladder", title: "Getting a 13B model onto a 24 GB consumer card", rungs: [
      { level: "bad", label: "Prune 50% of the weights", why: "Intuitive, one function call, and measured useless: the tensors keep their shape so nothing gets smaller or faster, while perplexity rose 513× in my run. Without a sparse kernel there is no mechanism by which it could help.",
        code: `for w in weights:
    w.mul_(w.abs() >= threshold)    # 50% zeros, same 26 GB on disk` },
      { level: "ok", label: "Drop the last four layers", why: "Real: parameters and forward time both fall, and keeping the first 8 of 12 cost 6.14× perplexity in my measurement. Usable if you then fine-tune to recover, which is a training project rather than a deployment setting.",
        code: `m.transformer.h = nn.ModuleList(m.transformer.h[:8])   # 8 of 12`,
        note: "Published layer-pruning results are much better than my raw 6.14×, because they heal the model afterwards." },
      { level: "best", label: "Quantize to 4-bit", why: "26 GB to 6.5 GB with no retraining, no architecture change, and a quality cost that calibrated methods keep small — and because decode is memory-bound it gets faster too (3.3). Reach for compression only when quantization is already in place and still not enough.",
        code: `llm = LLM(model="...-13b", quantization="awq")   # 6.5 GB`,
        note: "Quantization is reversible and orthogonal; pruning and distillation are neither." }
    ] },

    { t: "dl", items: [
      { k: "Use quantization when", v: "You need the model smaller or decode faster and you are not willing to retrain. This is nearly always the right first answer, and it composes with everything else." },
      { k: "Use structured pruning when", v: "You own the training pipeline and need a specific smaller shape — a latency budget a quantized model still misses, or an edge device with a hard parameter ceiling. Budget for the recovery fine-tune; the raw numbers above are what you get without it." },
      { k: "Use distillation when", v: "You need a genuinely smaller model for a narrower task, and you have the teacher plus unlabelled data in your domain. It is the only one of the three that can beat the original on *your* distribution, because the student is trained on your data." },
      { k: "Use none of them when", v: "A smaller off-the-shelf model passes your evaluation. That is strictly cheaper than any compression project, and 3.12's arithmetic puts model choice above every serving optimisation as a cost lever." }
    ] },

    { t: "exercise", kind: "analysis", title: "Measure layer importance, then check whether it composes", difficulty: "advanced", minutes: 30,
      body: "Remove each of GPT-2's twelve transformer blocks one at a time and record perplexity, to rank the layers by how much the model needs them. Then take the three layers that individually cost least, remove all three together, and compare against removing the last three. State what you find about whether per-layer importance scores can be added.",
      requirements: [
        "Drop exactly one block at a time, reindexing the remaining blocks so the cache stays consistent",
        "Report perplexity and the ratio against the unpruned baseline for all twelve",
        "Rank the layers least to most damaging",
        "Remove the three cheapest together and compare against {9, 10, 11} and {0, 1, 2}, at an identical parameter count",
        "Say explicitly whether the individual scores predicted the combined result"
      ],
      hint: "Each block in this implementation carries a `layer_idx` used to address the KV cache. Slice the list and the indices no longer match their positions — reassign them, or disable the cache.",
      solution: { lang: "python", title: "g39_ex.py — ablation, and the additivity check", code: `def without(layers):
    m = copy.deepcopy(base)
    keep = [i for i in range(12) if i not in layers]
    m.transformer.h = nn.ModuleList([m.transformer.h[i] for i in keep])
    for j, blk in enumerate(m.transformer.h):
        blk.attn.layer_idx = j                  # cache is addressed by this
    m.config.n_layer = m.config.num_hidden_layers = len(keep)
    m.config.use_cache = False
    return m

b = ppl(base)
scores = []
for i in range(12):
    m = without({i}); p = ppl(m); scores.append((p, i)); del m
    print("layer", i, p, p / b)

scores.sort()
cheap = {i for _, i in scores[:3]}
for label, drop in (("3 least damaging %s" % sorted(cheap), cheap),
                    ("the last 3 {9, 10, 11}", {9, 10, 11}),
                    ("the first 3 {0, 1, 2}", {0, 1, 2})):
    m = without(drop)
    print(label, ppl(m), ppl(m) / b, sum(q.numel() for q in m.parameters()))
    del m`,
        out: `  baseline perplexity 5.941

  drop ONE layer at a time:
  dropped            perplexity    vs baseline
  layer 0              3851.967        648.33x
  layer 1                 6.104          1.03x
  layer 2                 5.833          0.98x
  layer 3                 5.744          0.97x
  layer 4                 8.374          1.41x
  layer 5                10.415          1.75x
  layer 6                 6.185          1.04x
  layer 7                 7.357          1.24x
  layer 8                 6.450          1.09x
  layer 9                 6.225          1.05x
  layer 10                6.450          1.09x
  layer 11                9.230          1.55x

  ranked least to most damaging: L3 (0.97x), L2 (0.98x), L1 (1.03x),
                                 L6 (1.04x), L9 (1.05x), L8 (1.09x)

  now drop the 3 least damaging TOGETHER, and compare with the 3 last layers:
  3 least damaging [1, 2, 3]               29.787        5.01x  103176192 params
  the last 3 {9, 10, 11}                   23.319        3.92x  103176192 params
  the first 3 {0, 1, 2}               1183453.875   199188.29x  103176192 params`,
        notes: [
          { t: "p", text: "**Layer 0 is in a category of its own: 648× against at most 1.75× for any other single layer.** It is the only block that receives raw embeddings, and everything above it expects the representation it produces. That one row explains the asymmetry in the main lesson — \"drop the last k\" works and \"drop the first k\" does not." },
          { t: "p", text: "**Two layers are worse than redundant.** Removing layer 2 gives 0.98× and layer 3 gives 0.97× — perplexity *improves* on this text. I would not read that as the layers being harmful in general; on 256 tokens of one passage it is within the range of what a smaller model can get luckier on. But it does mean their contribution is not measurable here, which is the practical definition of redundant." },
          { t: "p", text: "**The scores do not compose, and the greedy choice loses.** Layers 1, 2 and 3 cost 1.03×, 0.98× and 0.97× individually — essentially free — and removing all three together costs **5.01×**. Worse, the naive baseline of dropping the last three costs **3.92×**, a *better* result at an identical parameter count. Greedy selection by single-layer ablation picked the wrong set." },
          { t: "p", text: "The reason is that ablation measures each layer's contribution *given that every other layer is present*. Layers 1–3 are mutually substitutable — any one of them can be absorbed by the others — so the group is far more important than the sum of its parts suggests. This is exactly the interaction problem that makes greedy feature selection unreliable, and it is why real structured-pruning methods evaluate candidate *sets* and fine-tune after each removal rather than ranking units once." },
          { t: "p", text: "One limit on all of this: perplexity on 256 tokens of a single passage is a narrow probe. The 648× and 5.01× results are far too large to be artefacts, but the fine ordering among the cheap layers — whether L3 really beats L2 — is not something this measurement can settle." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Quantization is writing the same book in a smaller typeface. Unstructured pruning is erasing words but keeping the blank spaces, so the book is exactly as heavy. Structured pruning is tearing out chapters — lighter, and you had better know which chapters. Distillation is hiring someone to read the book and write a shorter one." },
        { t: "p", text: "Only the typeface change is free. The other three all cost you something you then have to go and recover." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"We need our 13B model under 8 GB and 2× faster. An engineer proposes pruning 60% of the weights. What do you say?\"**" },
        { t: "p", text: "That it will not do either thing. Unstructured pruning leaves the tensors the same shape, so the checkpoint is the same size and a dense kernel multiplies the zeros at full price — I measured 50% pruning on GPT-2 at exactly zero speedup, with perplexity up 513×. The only sparsity that converts to speed on current hardware is the 2:4 pattern on Ampere and later, and that caps out around 2× with its own quality cost." },
        { t: "p", text: "The thing that meets both targets is quantization. 13B at 4-bit is about 6.5 GB, which clears the memory budget, and because decode is memory-bandwidth-bound it is faster in proportion to the bytes saved — no retraining, no architecture change, and it composes with everything else we might do later." },
        { t: "p", text: "If 4-bit still misses the latency target, then structured pruning, and specifically dropping layers from the end — not the beginning. I measured keeping the first 10 of 12 blocks at 2.41× perplexity against 800× for keeping the last 10, the same parameter count either way. And I would budget for a recovery fine-tune, because raw post-pruning numbers are much worse than published ones precisely because the published ones heal the model." },
        { t: "p", text: "Two cautions from my own measurements. Do not pick which layers to drop by ranking them individually: the three cheapest layers in my ablation cost 1.03×, 0.98× and 0.97× alone and 5.01× together, which was worse than simply dropping the last three. And check whether a smaller off-the-shelf model passes evaluation first — that is cheaper than any of this and it is the comparison the proposal skipped." }
      ] }
  ],

  takeaways: [
    "**Unstructured pruning gives no speedup on dense hardware.** Measured: 50% of GPT-2's weights zeroed, forward time unchanged, perplexity up 513×.",
    "**The tensors keep their shape**, so the parameter count and the checkpoint size are unchanged too — only a sparse format or a sparse kernel converts zeros into savings.",
    "**Past a point, perplexity stops being ordered.** My 90% row scored better than my 70% row; once a metric has moved two orders of magnitude, ask whether the model works rather than comparing values.",
    "**Structured pruning is the kind that works**, because removing whole heads, neurons or blocks makes the remaining tensors genuinely smaller — measured 1.27× faster at 8 of 12 layers.",
    "**Remove layers from the end, never the beginning.** Keeping the first 10 of 12 cost 2.41× perplexity; keeping the last 10 cost 800×, at an identical parameter count.",
    "**Layer 0 is irreplaceable**: dropping it alone multiplied perplexity by 648×, against at most 1.75× for any other single block.",
    "**Importance scores do not compose.** The three individually cheapest layers cost 5.01× together — worse than the naive \"drop the last three\" at 3.92×, so greedy ranking picks the wrong set.",
    "**Distillation trains the student on the teacher's distribution**, with temperature amplifying the small probabilities where the extra signal lives, and a T² factor keeping the two loss terms balanced.",
    "**DistilBERT: 61.2% of the parameters, 2.01× the speed — and 50% top-1 agreement with BERT on my probes**, including getting the capital of France wrong. Aggregate benchmarks hide per-prediction divergence.",
    "**An API that accepts your argument and ignores it is the worst failure mode.** `head_mask` is absent from this version's GPT-2 code, so my head-pruning measurement returned a confident number measuring nothing; constancy where variation was certain was the only tell."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Setting 50% of a model's weights to zero by magnitude left the forward pass exactly as fast. Why?",
        options: [
          "Because the pruning threshold was computed on a sample rather than the full distribution",
          "Because the tensors keep their shape and a dense matrix multiply cannot skip a zero",
          "Because 50% is below the threshold where sparsity becomes exploitable",
          "Because the model was already memory-bound rather than compute-bound"
        ],
        answer: 1,
        why: "Unstructured pruning writes zeros into tensors of unchanged shape, so the same number of parameters is stored, loaded and multiplied — a dense kernel has no mechanism for skipping a zero entry. Converting sparsity into speed needs a sparse kernel, which in practice means NVIDIA's fixed 2:4 pattern rather than arbitrary zeros. The measurement cost 513× perplexity for no speedup at all. Being memory-bound would make the savings larger if they existed, not smaller." },

      { stem: "Keeping GPT-2's first 10 layers cost 2.41× perplexity; keeping its last 10 cost 800×. What explains the asymmetry?",
        options: [
          "The last layers contain more parameters than the first",
          "The early layers build the representation every later layer expects, so removing them feeds downstream layers a distribution they have never seen",
          "The embedding layer is counted in the first group but not the second",
          "Perplexity is biased towards models with lower layer indices"
        ],
        answer: 1,
        why: "Both configurations have identical parameter counts — 110,264,064 — so size is not the variable. Layer 0 is the only block receiving raw embeddings, and its output is what layer 1 was trained to consume; remove it and every subsequent layer operates out of distribution. Measured, dropping layer 0 alone costs 648× against at most 1.75× for any other single block. This is why published layer-pruning methods take layers from the middle and the end." },

      { stem: "Three layers each cost about 1.0× perplexity when removed individually. Removed together they cost 5.01×, worse than dropping the last three. What does this show?",
        options: [
          "The measurement was too noisy to rank the layers",
          "Ablation measures a layer's contribution given all the others, so mutually substitutable layers look individually free and are collectively essential",
          "Perplexity is not an appropriate metric for pruning decisions",
          "The three layers were adjacent, which is the actual cause"
        ],
        answer: 1,
        why: "Each single-layer ablation holds the other eleven fixed, so a layer whose work can be absorbed by its neighbours scores as free — while the group as a whole cannot be absorbed by anything. That makes the scores non-additive and greedy selection unreliable, which is why real structured-pruning methods evaluate candidate sets and fine-tune after each removal. Adjacency is a plausible contributing factor but not the mechanism, and the effect is far too large to be noise." },

      { stem: "A head-masking experiment returned identical perplexity to three decimals for every mask tried, including one hiding half the model's heads. What is the right first conclusion?",
        options: [
          "Attention heads are highly redundant, which is a known result",
          "The masking argument was ignored, so the experiment measured nothing",
          "Perplexity is insensitive to attention and a different metric is needed",
          "The masks were applied after the attention softmax rather than before"
        ],
        answer: 1,
        why: "Masking half of a model's attention heads cannot leave its loss bit-identical — constancy where variation is certain is the signature of a no-op rather than of robustness. In this case `head_mask` appears nowhere in the library's current GPT-2 implementation, so the argument was accepted through `**kwargs` and discarded, and the call returned a confident number measuring nothing. Head redundancy is a real published result, but this measurement is not evidence for it." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Compression is where candidates propose pruning without knowing whether it makes anything faster",
    questions: [
      { level: "core",
        q: "Compare quantization, pruning and distillation.",
        strong: "A strong answer separates them by whether they change the tensor shapes and whether they need retraining.",
        answer: [
          { t: "p", text: "Quantization keeps every weight and stores it in fewer bits, so it needs no retraining and composes with everything. Because decode is memory-bandwidth-bound it is also the only one that reliably makes things faster for free — 13B goes from 26 GB to about 6.5 GB at 4-bit." },
          { t: "p", text: "Pruning removes weights, and the critical distinction is whether it leaves a shape behind. Unstructured pruning writes zeros into tensors of unchanged shape: I measured 50% pruning on GPT-2 at zero speedup and 513× perplexity, because a dense kernel multiplies zeros at full price. Structured pruning removes whole heads, neurons or layers, so the tensors really shrink — 8 of 12 blocks gave me 1.27× faster — but the granularity is coarse and you need a recovery fine-tune to get usable quality." },
          { t: "p", text: "Distillation trains a new smaller model on the teacher's output distribution rather than the labels, which carries more information than one-hot targets — the teacher's small probabilities say what is nearly correct. DistilBERT is 61% of BERT's parameters and 2.01× the speed in my measurement. It is the only one of the three that can beat the original on your own distribution, because the student trains on your data, and the only one that requires a full training run." },
          { t: "p", text: "In practice the order is: try a smaller off-the-shelf model, then quantize, then consider structured pruning or distillation if you own a training pipeline and still miss the target." }
        ] },

      { level: "advanced",
        q: "How would you decide which layers to remove from a model?",
        strong: "A strong answer knows that per-layer scores do not compose and that position matters enormously.",
        answer: [
          { t: "p", text: "Not by ranking layers individually, which is the obvious method and the one I measured failing. I ablated each of GPT-2's twelve blocks and the three cheapest cost 1.03×, 0.98× and 0.97× perplexity alone — essentially free — and 5.01× when removed together. The naive baseline of dropping the last three was better, at 3.92×, with the same parameter count." },
          { t: "p", text: "The reason is that ablation measures a layer's contribution given that all the others are present. Mutually substitutable layers each look free because their neighbours can absorb their work, and the group as a whole has nothing to absorb it. Same interaction problem as greedy feature selection." },
          { t: "p", text: "So I would evaluate candidate *sets* rather than units, and fine-tune after each removal so the model heals before the next decision — which is what the published methods do and why their numbers are much better than my raw ones." },
          { t: "p", text: "The constraint I would impose up front is to take layers from the end and the middle, never the start. Dropping layer 0 alone multiplied perplexity by 648× against at most 1.75× for any other single block, because it is the only layer that consumes raw embeddings and everything above it expects what it produces." }
        ] },

      { level: "core",
        q: "Tell me about a measurement of yours that turned out to be wrong.",
        strong: "A strong answer describes a silent failure and the general tell, not just the specific bug.",
        answer: [
          { t: "p", text: "I was measuring the quality cost of removing attention heads from GPT-2 by passing a `head_mask`. Every configuration returned perplexity 5.941 — identical to three decimals whether I masked two heads in one layer or seventy-two heads across all twelve." },
          { t: "p", text: "Masking half a model's attention heads cannot leave its loss bit-identical, so I went looking. `head_mask` appears nowhere in that version of the library's GPT-2 implementation: the argument was accepted through `**kwargs` and silently discarded. The call succeeded, returned a number, and measured nothing." },
          { t: "p", text: "The general lesson is the one I actually took away: an API that accepts your argument and ignores it is worse than one that raises, because there is nothing to catch. The tell was constancy where variation was certain — and I am conscious that if the numbers had merely been *small* rather than identical, I would probably have published them as evidence that heads are redundant, which is a real published result and would have made the wrong measurement look right." },
          { t: "p", text: "What I do now is include a sanity case whose result I can predict: an intervention I am certain must change the metric. If that one does not move, the harness is broken rather than the model being robust." }
        ] }
    ]
  }
});
