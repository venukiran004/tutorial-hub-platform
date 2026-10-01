EC.receiveLesson({
  id: "4.6",

  lede: "The reference draws the training loop as a pipeline \u2014 text, tokens, embeddings, transformer, loss, backpropagation, weight updates \u2014 with a note that only `A` and `B` change. That note is the whole of LoRA\u2019s safety guarantee, so I verified it rather than repeating it. After 24 optimiser steps, **0 of 12 base matrices had changed and the maximum difference was 0.000e+00**: the pretrained weights are bit-for-bit identical. I also checked the claim about initialisation and found the asymmetry it implies \u2014 at the very first backward pass **`|grad A| = 0.00000000` while `|grad B| = 0.340`**, so `B` moves first and `A` only follows once `B` is non-zero.",

  objectives: [
    "Trace one training example through the loop and say where the adapter sits",
    "Verify that frozen weights are frozen rather than assuming it",
    "Explain the gradient asymmetry that follows from B = 0 and A random",
    "Count what is trainable and what ships",
    "Read a loss curve on a small dataset without being misled by it"
  ],

  prerequisites: ["4.4"],

  blocks: [

    { t: "h2", n: "01", id: "loop", text: "The loop, with the adapter marked",
      sub: "Nothing here is unusual except what receives a gradient" },

    { t: "p", text: "Training is the same loop any supervised model uses. Text becomes token ids, ids become embeddings, the transformer produces a distribution over the next token at every position, the loss compares that with what the example actually said, and backpropagation works out which way to move every parameter that has `requires_grad` set." },

    { t: "p", text: "The only LoRA-specific fact is that nearly nothing does. The base matrices are frozen, so gradients flow *through* them \u2014 they are still needed to compute the chain rule \u2014 but no optimizer state is kept for them and no update is applied." },

    { t: "viz", title: "One example through the loop", caption: "Gradients flow back through everything; only the adapter matrices receive updates. Frozen is not the same as absent.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="The LoRA training loop">
  <rect x="16" y="20" width="120" height="26" rx="4" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="76" y="37" text-anchor="middle" class="s-sub">text</text>
  <text x="146" y="37" class="s-mono">\u2192</text>
  <rect x="168" y="20" width="120" height="26" rx="4" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="228" y="37" text-anchor="middle" class="s-sub">token ids</text>
  <text x="298" y="37" class="s-mono">\u2192</text>
  <rect x="320" y="20" width="120" height="26" rx="4" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="380" y="37" text-anchor="middle" class="s-sub">embeddings</text>
  <text x="450" y="37" class="s-mono">\u2192</text>
  <rect x="472" y="20" width="160" height="26" rx="4" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="552" y="37" text-anchor="middle" class="s-sub" style="fill:var(--violet)">transformer + LoRA</text>

  <line x1="552" y1="46" x2="552" y2="70" stroke="var(--line)" stroke-width="1.2"/>
  <rect x="472" y="70" width="160" height="26" rx="4" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="552" y="87" text-anchor="middle" class="s-sub">predicted tokens</text>
  <line x1="552" y1="96" x2="552" y2="120" stroke="var(--line)" stroke-width="1.2"/>
  <rect x="472" y="120" width="160" height="26" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="552" y="137" text-anchor="middle" class="s-sub">loss</text>

  <text x="16" y="110" class="s-label" style="fill:var(--crit)">BACKWARD \u2014 gradients flow through everything</text>
  <line x1="462" y1="133" x2="120" y2="133" stroke="var(--crit)" stroke-width="1.4" stroke-dasharray="5 3"/>
  <text x="130" y="128" class="s-mono" style="fill:var(--crit)">\u2190 chain rule needs W\u2080, but W\u2080 never moves</text>

  <line x1="16" y1="168" x2="744" y2="168" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="194" class="s-label" style="fill:var(--good)">WHAT ACTUALLY UPDATES</text>
  <rect x="16" y="206" width="30" height="24" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="56" y="223" class="s-mono" style="fill:var(--good)">A and B \u2014 294,912 parameters, 0.24% of the model</text>
  <rect x="16" y="238" width="700" height="24" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="366" y="255" text-anchor="middle" class="s-sub">W\u2080 \u2014 124,144,896 parameters, frozen, measured unchanged to 0.000e+00</text>

  <text x="16" y="290" class="s-mono" style="fill:var(--violet)">at step 0: |grad A| = 0.00000000, |grad B| = 0.340 \u2014 B moves first and A follows</text>
</svg>` },

    { t: "h2", n: "02", id: "count", text: "What is trainable",
      sub: "Counted, not estimated" },

    { t: "code", lang: "python", title: "g46.py \u2014 counting what has requires_grad", code: `def build(r, alpha):
    m = GPT2LMHeadModel.from_pretrained("gpt2")
    for p in m.parameters():
        p.requires_grad = False                 # freeze everything first
    for blk in m.transformer.h:
        blk.attn.c_attn = LoRAConv1D(blk.attn.c_attn, r, alpha)
    return m

tr = sum(p.numel() for p in m.parameters() if p.requires_grad)`,
      out: `  gpt2 total parameters: 124439808

  configuration                     trainable    as % of all           frozen
  full fine-tune                    124439808        100.00%                0
  LoRA r=4 on c_attn                   147456          0.12%        124292352
  LoRA r=8 on c_attn                   294912          0.24%        124144896
  LoRA r=16 on c_attn                  589824          0.47%        123849984
  LoRA r=32 on c_attn                 1179648          0.95%        123260160`,
      hl: [3],
      caption: "Rank 32 across all twelve blocks is still under 1% of the model. The reference's \u201cunder 1%\u201d holds comfortably." },

    { t: "callout", kind: "note", title: "The percentage depends on where you put the adapters, not just on r",
      body: [
        { t: "p", text: "These numbers wrap only `c_attn`, one matrix per block. The reference\u2019s example targets seven projection types \u2014 `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj` \u2014 which multiplies the adapter count by roughly seven for the same rank." },
        { t: "p", text: "So \u201cLoRA trains under 1% of the parameters\u201d is a statement about a configuration, not about the method. Rank 32 on seven module types would be around 6% here. Still small, and worth knowing which number you are quoting." }
      ] },

    { t: "h2", n: "03", id: "noop", text: "The adapter starts as a no-op",
      sub: "Verified against the base model's logits" },

    { t: "p", text: "4.4 argued that `B = 0` makes a freshly wrapped model identical to the base. That is a checkable claim, so I checked it." },

    { t: "code", lang: "python", title: "g46.py \u2014 base logits against wrapped logits", code: `with torch.no_grad():
    lo_base = full(ids).logits
    lo_lora = m(ids).logits
print((lo_base - lo_lora).abs().max(), torch.equal(lo_base, lo_lora))`,
      out: `  max |logit difference| between base and freshly-wrapped model: 0.000e+00
  all logits identical: True

  B at init: max |B| = 0.0, A at init: std = 0.03615
  so B.A = 0 and the wrapped model IS the base model, exactly.`,
      hl: [2],
      caption: "Not \u201cclose\u201d \u2014 bit-for-bit equal. Attaching an untrained adapter is a guaranteed no-op." },

    { t: "callout", kind: "insight", title: "This is what makes adapters safe to ship and swap",
      body: [
        { t: "p", text: "Because an untrained adapter changes nothing exactly, a serving framework can attach, detach and switch adapters per request without any correctness risk from the mechanism itself (3.7). A half-loaded adapter degrades to the base model rather than to noise." },
        { t: "p", text: "It also means training starts from a known-good point. If both matrices were random, step zero would be a perturbed model and the early training would be spent undoing a self-inflicted regression." }
      ] },

    { t: "h2", n: "04", id: "gradients", text: "Which matrix moves first",
      sub: "A measured consequence of the initialisation" },

    { t: "code", lang: "python", title: "g46.py \u2014 the very first backward pass, before any step", code: `out = m2(x, attention_mask=mask, labels=labels, use_cache=False)
out.loss.backward()
lay = m2.transformer.h[0].attn.c_attn
print(lay.A.grad.norm(), lay.B.grad.norm())`,
      out: `  at the very first backward pass, before any step:
    |grad A| = 0.00000000    (A's gradient is proportional to B, which is 0)
    |grad B| = 0.34045655    (B's gradient is proportional to A, which is not)`,
      hl: [2],
      caption: "Exactly zero, not merely small. The adapter is asymmetric at initialisation and the asymmetry resolves after one step." },

    { t: "p", text: "The product `BA` differentiates by the product rule: the gradient reaching `A` carries a factor of `B`, and the gradient reaching `B` carries a factor of `A`. With `B = 0` the first is exactly zero and the second is not, so `B` takes the first step alone and `A` begins moving once `B` is non-zero." },

    { t: "callout", kind: "insight", title: "Why not initialise both to zero, or both randomly?",
      body: [
        { t: "p", text: "**Both zero** is the trap the measurement rules out: if `A = 0` as well, then `|grad B|` is also zero, nothing moves on the first step, nothing moves on any step, and the adapter trains to nothing. The asymmetry is load-bearing." },
        { t: "p", text: "**Both random** trains fine and gives up the no-op property \u2014 you start from a perturbed model. The chosen scheme is the only one that both starts at identity and can escape it." },
        { t: "p", text: "It also explains a practical observation: the first few steps of a LoRA run look unproductive because only half the adapter is moving. In my run `|grad A|` went 0.000 \u2192 0.015 \u2192 0.024 \u2192 0.064 over the first four steps while `|grad B|` was 0.34\u20130.53 throughout." }
      ] },

    { t: "h2", n: "05", id: "frozen", text: "Is the base actually frozen?",
      sub: "The claim everything else depends on" },

    { t: "p", text: "4.3 argued that a frozen base makes 4.1\u2019s catastrophic forgetting structurally impossible. That is only true if \u201cfrozen\u201d means what it says, which is easy to get wrong \u2014 a stray `requires_grad`, an optimizer constructed over `model.parameters()` instead of the trainable subset, a library that re-enables gradients. So I snapshotted the base matrices before training and compared afterwards." },

    { t: "code", lang: "python", title: "g46.py \u2014 snapshot, train, compare", code: `before = {i: blk.attn.c_attn.base.weight.detach().clone()
          for i, blk in enumerate(m.transformer.h)}
wte_before = m.transformer.wte.weight.detach().clone()

#  ... 6 epochs, 24 optimiser steps ...

for i, blk in enumerate(m.transformer.h):
    d = float((blk.attn.c_attn.base.weight - before[i]).abs().max())`,
      out: `  step             loss         |grad A|         |grad B|          max |B|
  0              4.8339         0.000000         0.340457         0.000000
  1              4.7168         0.014908         0.454911         0.000200
  2              5.4182         0.024205         0.351347         0.000400
  3              4.3997         0.063885         0.530249         0.000601
  8              4.4918         0.130279         0.424450         0.001614
  16             4.1082         0.121425         0.361877         0.003299

  loss: 4.834 at step 0 -> 3.439 at step 23

  base c_attn matrices changed: 0 of 12, max |difference| = 0.000e+00
  embedding matrix changed: False`,
      hl: [10],
      caption: "Zero of twelve, to the last bit, after 24 steps. The guarantee holds." },

    { t: "callout", kind: "good", title: "A one-line assertion worth adding to any LoRA script",
      body: [
        { t: "p", text: "Snapshot one base matrix before training and assert it is unchanged afterwards. It costs one tensor clone and it catches the whole class of configuration errors that silently turn a LoRA run into a partial full fine-tune \u2014 which would reintroduce exactly the forgetting that 4.1 measured and that LoRA is chosen to avoid." },
        { t: "p", text: "The failure is worth guarding because it is invisible in the loss. A run that is accidentally updating base weights trains *better*, not worse, so every metric on the screen says the configuration is fine." }
      ] },

    { t: "callout", kind: "trap", title: "Note step 2: the loss went up",
      body: [
        { t: "p", text: "4.834, 4.717, **5.418**, 4.400. On a dataset of eight examples in batches of two, each step sees a quarter of the data, and some batches are simply harder than others \u2014 so the per-step loss is noisy and non-monotonic by construction." },
        { t: "p", text: "This is worth naming because a rising loss is alarming and here it means nothing. Judge a run on the *epoch* mean, where each point covers the same data, and reserve concern for a trend rather than a step. The epoch means in this run fell steadily." },
        { t: "p", text: "The converse matters more and is the subject of 4.8: a steadily falling training loss on a small dataset is equally uninformative about whether the model is getting better, because 4.1 measured exactly that curve while general ability degraded." }
      ] },

    { t: "h2", n: "06", id: "ship", text: "What you ship",
      sub: "The adapter is the artefact" },

    { t: "code", lang: "python", title: "g46.py \u2014 the size of what gets saved", code: `sd = {k: v for k, v in m3.state_dict().items() if ".A" in k or ".B" in k}
n_ad = sum(v.numel() for v in sd.values())`,
      out: `  adapter tensors: 24, parameters: 294912
  at fp16 that is 0.59 MB; the full model at fp16 is 248.9 MB
  ratio: 422x smaller

  for a 7B model with r=8 adapters on 7 projection types across 32 layers:
    14680064 adapter parameters = 29.4 MB at fp16, against 14,000 MB for the base`,
      caption: "Tens of megabytes against tens of gigabytes. That ratio is what makes per-customer adapters practical." },

    { t: "exercise", kind: "lab", title: "Verify the three claims a LoRA run depends on", difficulty: "core", minutes: 30,
      body: "Build a LoRA-wrapped model by hand and verify, by measurement rather than inspection, that: the wrapped model is identical to the base before training; the base weights are unchanged after training; and the gradient on A is exactly zero at the first backward pass while the gradient on B is not. Then count the trainable parameters at several ranks and report what the adapter would weigh on disk.",
      requirements: [
        "Compare base and wrapped logits with an exact equality check, not a tolerance",
        "Snapshot every base matrix before training and compare the maximum absolute difference afterwards",
        "Print |grad A| and |grad B| after the first backward pass, before any optimiser step",
        "Report trainable parameters and the frozen remainder at r = 4, 8, 16, 32",
        "Record the per-step loss for the first few steps and comment on its shape"
      ],
      hint: "Freeze with a loop over all parameters before wrapping, then let the adapter's own Parameters default to requires_grad=True. Constructing the optimizer over model.parameters() rather than the trainable subset is the mistake the frozen check is there to catch.",
      solution: { lang: "python", title: "g46.py \u2014 the three checks", code: `# 1. the wrapped model is the base model
with torch.no_grad():
    lo_base = full(ids).logits
    lo_lora = m(ids).logits
print(float((lo_base - lo_lora).abs().max()), torch.equal(lo_base, lo_lora))

# 2. the gradient asymmetry, before any step
out = m2(x, attention_mask=mask, labels=labels, use_cache=False)
out.loss.backward()
lay = m2.transformer.h[0].attn.c_attn
print(float(lay.A.grad.norm()), float(lay.B.grad.norm()))

# 3. the base is still frozen after training
before = {i: blk.attn.c_attn.base.weight.detach().clone()
          for i, blk in enumerate(m.transformer.h)}

opt = torch.optim.AdamW([p for p in m.parameters() if p.requires_grad], lr=2e-4)
for ep in range(6):
    for x, mask in batches(rows):
        labels = x.clone(); labels[mask == 0] = -100
        out = m(x, attention_mask=mask, labels=labels, use_cache=False)
        out.loss.backward(); opt.step(); opt.zero_grad()

moved = sum(1 for i, blk in enumerate(m.transformer.h)
            if float((blk.attn.c_attn.base.weight - before[i]).abs().max()) > 0)
print(moved, len(m.transformer.h))`,
        out: `  gpt2 total parameters: 124439808
  configuration                     trainable    as % of all           frozen
  full fine-tune                    124439808        100.00%                0
  LoRA r=8 on c_attn                   294912          0.24%        124144896
  LoRA r=32 on c_attn                 1179648          0.95%        123260160

  max |logit difference| between base and freshly-wrapped model: 0.000e+00
  all logits identical: True

  at the very first backward pass, before any step:
    |grad A| = 0.00000000
    |grad B| = 0.34045655

  step             loss         |grad A|         |grad B|          max |B|
  0              4.8339         0.000000         0.340457         0.000000
  1              4.7168         0.014908         0.454911         0.000200
  2              5.4182         0.024205         0.351347         0.000400
  3              4.3997         0.063885         0.530249         0.000601
  16             4.1082         0.121425         0.361877         0.003299

  base c_attn matrices changed: 0 of 12, max |difference| = 0.000e+00
  embedding matrix changed: False`,
        notes: [
          { t: "p", text: "**All three claims hold exactly, not approximately.** The wrapped model's logits are bit-identical to the base, `|grad A|` is 0.00000000 rather than merely small, and 0 of 12 base matrices changed after 24 optimiser steps. Exact equality is the right test here \u2014 a tolerance would hide precisely the configuration bugs the check exists to catch." },
          { t: "p", text: "**The gradient asymmetry is the product rule made visible.** `BA` differentiates so that `A`'s gradient carries a factor of `B` and vice versa; with `B = 0` the first is identically zero. `B` therefore takes the first step alone, and `|grad A|` climbs 0.000 \u2192 0.015 \u2192 0.024 \u2192 0.064 as `B` moves away from zero. It also rules out zero-initialising both, which would freeze the adapter permanently." },
          { t: "p", text: "**`max |B|` grows almost exactly linearly** \u2014 0.000200 per step for the first several steps. That is AdamW's signature: the update is the gradient divided by its own running magnitude, so the step size is roughly the learning rate regardless of how large the gradient is. It is a useful sanity check that the optimizer is doing what you think." },
          { t: "p", text: "**The loss rose at step 2** \u2014 4.717 to 5.418 \u2014 and that is not a problem. With eight examples in batches of two, each step sees a quarter of the data and the batches differ in difficulty. Judge the epoch mean; a single step going the wrong way on a tiny dataset carries no information." },
          { t: "p", text: "**The frozen check is worth keeping permanently.** An accidentally unfrozen base trains *better*, so every visible metric says the run is healthy while it quietly reintroduces the forgetting LoRA was chosen to avoid. One clone and one assertion covers it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Think of the frozen base as a printed book and the adapter as a transparent overlay. The backward pass still has to read the book to work out where the overlay should be marked \u2014 gradients flow through `W\u2080` \u2014 but no ink touches the page. Measured: zero of twelve pages altered, to the last bit." },
        { t: "p", text: "And the overlay starts blank, which is why putting it on changes nothing until you have written on it." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur LoRA fine-tune produced a model that is noticeably worse at tasks outside the training data. We thought LoRA could not do that. What would you check?\u201d**" },
        { t: "p", text: "LoRA cannot do that *through the base weights*, so the first thing I would check is whether the base weights actually stayed frozen. That is a two-line test: clone one base matrix before training and compare the maximum absolute difference afterwards. In my own run it was 0.000e+00 across all twelve matrices after 24 steps, which is what a correctly configured run looks like." },
        { t: "p", text: "The usual way this breaks is the optimizer. If it is constructed over `model.parameters()` rather than the trainable subset, every parameter with a gradient gets updated \u2014 and depending on how the freezing was done, that can include base weights. The symptom is confusing because an accidentally unfrozen run trains *better*: the loss falls faster, so every metric on screen says the configuration is fine while it is quietly doing a partial full fine-tune." },
        { t: "p", text: "If the base genuinely is frozen, then the degradation is coming from the adapter itself, which is a different and more mundane problem. An adapter can absolutely make a model worse at other things \u2014 it is added to every forward pass, so a strongly-trained adapter shifts behaviour everywhere, not only on the target task. The difference from full fine-tuning is that it is reversible: detach the adapter and the original model is back exactly." },
        { t: "p", text: "So the fixes are the ordinary ones \u2014 fewer epochs, lower rank, a lower learning rate, or restricting the target modules \u2014 and the evaluation discipline from 4.1 applies: hold out a general-ability set, because the training loss will keep improving while this happens." },
        { t: "p", text: "The thing I would push on is whether anyone measured the base model before and after. \u201cNoticeably worse\u201d needs a number, and the two causes \u2014 an unfrozen base and an over-trained adapter \u2014 have different fixes and are trivially distinguishable by the one check nobody runs." }
      ] }
  ],

  takeaways: [
    "**The loop is ordinary; only what receives updates is unusual.** Gradients flow through the frozen base because the chain rule needs it, but no optimizer state is kept and no update applied.",
    "**Trainable counts, measured**: 0.12% at r=4, 0.24% at r=8, 0.95% at r=32 on one matrix per block \u2014 so \u201cunder 1%\u201d is a statement about a configuration, not about the method.",
    "**A freshly wrapped model is bit-for-bit the base model**: maximum logit difference 0.000e+00, exact equality true, because `B = 0` makes `BA` the zero matrix.",
    "**That is what makes adapters safe to attach, detach and swap per request** \u2014 a half-loaded adapter degrades to the base model rather than to noise.",
    "**At the first backward pass `|grad A|` is exactly 0 and `|grad B|` is 0.340**, because the product rule gives `A`'s gradient a factor of `B` and vice versa.",
    "**So `B` moves first and `A` follows**, and initialising both to zero would leave both gradients at zero and train nothing \u2014 the asymmetry is load-bearing.",
    "**The base really stays frozen**: 0 of 12 matrices changed after 24 optimiser steps, maximum difference 0.000e+00, embeddings untouched.",
    "**Assert that in your own script.** An accidentally unfrozen base trains *better*, so the loss cannot reveal it, and it reintroduces exactly the forgetting LoRA was chosen to avoid.",
    "**`max |B|` grows linearly at about the learning rate per step** \u2014 AdamW's signature, and a cheap check that the optimizer is behaving.",
    "**A single step's loss can rise on a small dataset** (4.717 \u2192 5.418 here) because each batch is a different quarter of the data; judge the epoch mean, not the step."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "At the first backward pass of a LoRA run, |grad A| is exactly 0.00000000 while |grad B| is 0.340. Why?",
        options: [
          "A is initialised too small for gradients to register in float32",
          "The product rule gives A's gradient a factor of B, which is initialised to zero, while B's gradient carries a factor of A, which is not",
          "A is frozen for the first epoch by convention",
          "The gradient of A is computed only after B exceeds a threshold"
        ],
        answer: 1,
        why: "Differentiating the product BA sends a factor of B into A's gradient and a factor of A into B's. With B = 0 the first is identically zero \u2014 exactly zero, not small \u2014 so B takes the first step alone and A begins moving once B is non-zero. This also rules out initialising both matrices to zero, which would leave both gradients at zero permanently. Nothing is frozen or thresholded; it is the arithmetic of the initialisation." },

      { stem: "Why is exact equality the right test for \u201cdid the base weights change\u201d rather than a small tolerance?",
        options: [
          "Floating-point accumulation makes tolerances unreliable at this scale",
          "A frozen weight should receive no update at all, so any non-zero difference indicates a configuration error the tolerance would hide",
          "Tolerances are too slow to compute on large matrices",
          "The optimizer applies updates in fp32, which is exactly representable"
        ],
        answer: 1,
        why: "A correctly frozen parameter is never written to, so the difference is identically zero \u2014 measured, 0.000e+00 across all twelve matrices after 24 steps. The failure this test exists to catch is a misconfigured optimizer updating base weights, which would produce small but non-zero differences that a tolerance would mask. The failure is otherwise invisible because an accidentally unfrozen run trains better, so the loss will not reveal it." },

      { stem: "A LoRA run's loss goes 4.834, 4.717, 5.418, 4.400 over its first four steps. What should you conclude?",
        options: [
          "The learning rate is too high and the run is diverging",
          "Nothing \u2014 with a small dataset each step sees a different subset, so per-step loss is noisy by construction; judge the epoch mean",
          "The adapter was initialised incorrectly",
          "Gradient clipping is needed before training can proceed"
        ],
        answer: 1,
        why: "With eight examples in batches of two, each step sees a quarter of the data, and batches differ in difficulty \u2014 so a rising step is expected and carries no information. The epoch mean covers the same data each time and is the curve to read, and in this run it fell steadily. The more important converse is that a smoothly falling training loss is equally uninformative about model quality on a small dataset, which 4.1 measured directly." },

      { stem: "A team reports their LoRA fine-tune degraded the model on unrelated tasks. What is the first check?",
        options: [
          "Reduce the rank and retrain",
          "Verify the base weights are actually unchanged, since an optimizer built over all parameters can silently update them",
          "Switch to QLoRA so the base is quantized and cannot be written",
          "Increase the dataset size to reduce overfitting"
        ],
        answer: 1,
        why: "LoRA cannot damage the base through frozen weights, so the first question is whether they are frozen \u2014 a two-line snapshot-and-compare that catches an optimizer constructed over model.parameters() instead of the trainable subset. That failure trains better, so no visible metric reveals it. If the base is genuinely frozen, an over-trained adapter can still shift behaviour everywhere, and the fixes are fewer epochs, lower rank or narrower target modules \u2014 but those come after distinguishing the two causes." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where \u201cthe base is frozen\u201d is a claim worth being able to prove",
    questions: [
      { level: "core",
        q: "Walk me through what happens during a LoRA training step.",
        strong: "A strong answer is precise that gradients flow through frozen weights even though they are not updated.",
        answer: [
          { t: "p", text: "The forward pass is ordinary: tokens in, embeddings, the transformer stack, a distribution over the next token at each position, and a cross-entropy loss against what the example actually said. The adapter sits inside the wrapped layers, adding its scaled low-rank branch to each base output." },
          { t: "p", text: "The backward pass is where the distinction lives. Gradients flow *through* the frozen base matrices \u2014 the chain rule needs them to reach the adapter below \u2014 but no optimizer state is kept for them and no update is applied. Frozen is not the same as absent, which is why LoRA saves memory on the optimizer rather than on the forward pass." },
          { t: "p", text: "Only `A` and `B` update. In my measurement that was 294,912 parameters of 124 million, 0.24%, with the other 124 million frozen \u2014 and after 24 optimiser steps 0 of 12 base matrices had changed, maximum difference 0.000e+00." },
          { t: "p", text: "One detail worth knowing: at the very first backward pass `|grad A|` is exactly zero and `|grad B|` is not, because the product rule gives `A`'s gradient a factor of `B` and `B` starts at zero. So `B` moves first and `A` follows, which is why the first couple of steps can look unproductive." }
        ] },

      { level: "advanced",
        q: "How would you prove to yourself that a LoRA run is configured correctly?",
        strong: "A strong answer proposes checks that catch failures the loss cannot show.",
        answer: [
          { t: "p", text: "Three checks, all cheap, all of which catch something the loss cannot." },
          { t: "p", text: "First, that the wrapped model equals the base model before training. An exact equality on the logits \u2014 mine was 0.000e+00 and `torch.equal` true \u2014 confirms `B` really is zero and the adapter is attached to the layers you think." },
          { t: "p", text: "Second, that the base weights are unchanged after training. Clone one matrix before, compare the maximum absolute difference after, and assert zero. This is the one I would keep permanently, because the failure mode \u2014 an optimizer constructed over all parameters rather than the trainable subset \u2014 makes the run train *better*, so every metric on screen says it is healthy while it is really a partial full fine-tune reintroducing the forgetting LoRA was chosen to avoid." },
          { t: "p", text: "Third, the trainable parameter count, printed. It catches target modules that matched nothing \u2014 a typo in a module name produces an adapter with zero parameters that trains silently and learns nothing." },
          { t: "p", text: "And on the loss itself I would watch the epoch mean rather than the step. On a small dataset single steps are noisy by construction \u2014 mine went 4.717 up to 5.418 and back down \u2014 so a rising step means nothing and only a trend is informative." }
        ] },

      { level: "core",
        q: "Why is B initialised to zero rather than both matrices randomly?",
        strong: "A strong answer covers both the no-op property and why zeroing both fails.",
        answer: [
          { t: "p", text: "So that attaching an adapter changes nothing. With `B = 0` the product is the zero matrix and the wrapped model is bit-for-bit the base \u2014 I measured a maximum logit difference of 0.000e+00. Training therefore starts from a known-good model rather than from a randomly perturbed one." },
          { t: "p", text: "Zeroing both would be worse than useless. `B`'s gradient carries a factor of `A`, so if `A` were zero too, both gradients would be zero, nothing would move on the first step, and nothing would move on any step. The asymmetry is what lets the adapter escape its identity initialisation." },
          { t: "p", text: "Both random trains perfectly well and gives up the property. You would begin with every adapted layer perturbed, and spend the first part of training undoing a regression you introduced." },
          { t: "p", text: "The practical payoff is in serving. Because an untrained or partially loaded adapter is a guaranteed no-op, a framework can attach and swap adapters per request and the worst case degrades to the base model rather than to noise." }
        ] }
    ]
  }
});
