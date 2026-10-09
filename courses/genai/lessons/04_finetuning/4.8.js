EC.receiveLesson({
  id: "4.8",

  lede: "Every lesson in this module so far has watched a training loss fall and said the same thing: that curve cannot tell you whether the model is learning the behaviour or memorising the examples. This one holds data back, and adds a third measurement \u2014 perplexity on text the task has nothing to do with. Sweeping the four settings the reference says matter produced one result that should change how you run these jobs. **A learning rate of 5e-4 gave the best validation loss in the whole sweep, 2.0359, and took general perplexity to 23.903 against a 5.282 baseline.** Selecting on task validation alone would have shipped a wrecked model, confidently.",

  objectives: [
    "Split data so that a fine-tune can be stopped on evidence",
    "Read a training loss, a validation loss and a general-ability metric together",
    "Choose rank, learning rate, epochs and target modules from measurements",
    "Recognise a configuration that wins on the task and loses everywhere else",
    "Apply the defaults and know what each one is protecting against"
  ],

  prerequisites: ["4.7"],

  blocks: [

    { t: "h2", n: "01", id: "instrument", text: "Three numbers, not one",
      sub: "Each one is blind to what the next one sees" },

    { t: "p", text: "A fine-tune needs three measurements and most runs have one. **Training loss** says how well the model fits the examples it is being shown, which 4.1 demonstrated is compatible with the model getting worse. **Validation loss** on held-out examples of the same task says whether the behaviour generalises. And a **general-ability metric** \u2014 perplexity on text that has nothing to do with the task \u2014 says what the run is costing everywhere else." },

    { t: "p", text: "The sweep below uses 32 training pairs, 8 held out, and a fixed passage of ordinary English for the third. Everything is LoRA at the settings named, run with `peft`, with the base model frozen." },

    { t: "callout", kind: "note", title: "Why a general-ability metric and not just validation",
      body: [
        { t: "p", text: "Validation loss measures the task. If the adapter learns the pirate voice and simultaneously forgets how to form ordinary English sentences, validation loss *improves* \u2014 held-out pirate examples are still pirate examples." },
        { t: "p", text: "That is not a hypothetical. Section 03 below finds a configuration that is best on validation and catastrophic on everything else, and no amount of extra held-out task data would have caught it. The third metric is not a refinement; it is the one that catches the failure the other two cannot see." }
      ] },

    { t: "h2", n: "02", id: "epochs", text: "Epochs: two turning points, not one",
      sub: "And the first one arrives immediately" },

    { t: "code", lang: "python", title: "g48.py \u2014 16 epochs, all three metrics each epoch", code: `hist = []
for ep in range(epochs):
    m.train()
    for x, mask in batches(tr_rows):
        labels = x.clone(); labels[mask == 0] = -100
        out = m(input_ids=x, attention_mask=mask, labels=labels, use_cache=False)
        out.loss.backward(); opt.step(); opt.zero_grad()
    hist.append((ep + 1, train_loss, eval_loss(m, va_rows), generic_ppl(m)))`,
      out: `  32 training pairs, 8 held out, r=16 alpha=32, lr=2e-4
  baseline generic perplexity: 5.282

  epoch        train loss       val loss      generic ppl       note
  1                5.0483         4.1252            5.343
  2                4.0527         3.3059            5.503
  3                3.3936         2.7147            5.971
  4                2.7860         2.3342            6.413
  5                2.4567         2.1734            7.682
  6                2.2265         2.1094            8.739
  7                2.0306         2.0678            9.508
  8                1.8040         2.0438            9.648
  9                1.6268         2.0260           10.777 <-- best val
  10               1.4670         2.0853           12.733
  11               1.3201         2.0983           15.097
  12               1.1531         2.2532           20.403
  14               0.8652         2.4306           25.325
  15               0.7477         2.5012           30.272
  16               0.6330         2.5095           20.731`,
      hl: [12],
      caption: "Validation bottoms at epoch 9 and rises. Training loss falls throughout. The third column never stops rising." },

    { t: "callout", kind: "insight", title: "General ability starts degrading at epoch 1, seven epochs before validation turns",
      body: [
        { t: "p", text: "The classic picture is training loss down, validation loss down then up, stop at the minimum. That happens here \u2014 validation bottoms at epoch 9 \u2014 and it is not the whole picture." },
        { t: "p", text: "Generic perplexity is **5.343 after one epoch** against a 5.282 baseline, and it rises monotonically from there. By the best-validation epoch it is **10.777 \u2014 2.04\u00d7 the baseline**. So the configuration that is optimal for the task has already doubled the model\u2019s loss on ordinary English, and early stopping on validation does not prevent that; it only stops it getting worse." },
        { t: "p", text: "There is no epoch at which you get the behaviour for free. There is only a schedule of how much you are paying, and the decision is which price is acceptable \u2014 which is a product question, and it cannot be asked at all if nobody is measuring the third column." },
        { t: "p", text: "The last row is a reminder from 3.9: perplexity 20.731 at epoch 16 after 30.272 at epoch 15 is not an improvement. Once a metric has moved by this much, stop reading its fine structure." }
      ] },

    { t: "callout", kind: "note", title: "Nine epochs, against the \u201c1\u20133\u201d",
      body: [
        { t: "p", text: "The reference recommends 1\u20133 epochs and this run peaked at 9. Both are right, because an epoch is a pass over *your* data: 32 examples in batches of 4 is 8 optimiser steps per epoch, so nine epochs here is 72 steps. A 1,000-example dataset gives 250 steps in a single epoch." },
        { t: "p", text: "So the transferable quantity is **steps**, not epochs, and the rule of thumb is calibrated for the dataset size the reference assumes. On a small set, quote both \u2014 and stop on the validation curve rather than on either number." }
      ] },

    { t: "h2", n: "03", id: "lr", text: "Learning rate: the result that matters",
      sub: "The best validation loss in the sweep is a destroyed model" },

    { t: "code", lang: "python", title: "g48.py \u2014 five learning rates, six epochs each", code: `for lr in (5e-5, 1e-4, 2e-4, 5e-4, 1e-3):
    m = build(16, 32, ["c_attn", "c_proj", "c_fc"])
    train(m, 6, lr)
    print(lr, eval_loss(m, tr_rows), eval_loss(m, va_rows), generic_ppl(m))`,
      out: `  lr               train loss       val loss    generic ppl
  5e-05                3.5746         3.4485          5.343
  1e-04                2.5910         2.4939          5.732
  2e-04                1.8825         2.1094          8.739
  5e-04                0.9888         2.0359         23.903
  1e-03                0.4388         2.5304         31.327`,
      hl: [5],
      caption: "5e-4 has the best validation loss of any configuration in this lesson \u2014 and takes generic perplexity to 4.53\u00d7 the baseline." },

    { t: "callout", kind: "trap", title: "Select on validation loss and you ship the 5e-4 model",
      body: [
        { t: "p", text: "Rank the five by validation loss: **5e-4 wins (2.0359)**, then 2e-4 (2.1094), then 1e-4, then 1e-3, then 5e-5. A standard sweep that picks the best validation loss picks 5e-4, and every number it looked at says that was the right call." },
        { t: "p", text: "Now the third column. 5e-4 gives generic perplexity **23.903 against a 5.282 baseline** \u2014 the model has become 4.5\u00d7 worse at ordinary English while becoming marginally better at the task. 2e-4, which lost on validation by 0.07, sits at 8.739." },
        { t: "p", text: "This is the whole argument of the lesson in one table. **A held-out set for the task is necessary and not sufficient**, because both of its numbers improve while the model is being damaged. The failure is invisible to the instrument most teams have." },
        { t: "p", text: "It also explains why 2e-4 is the conventional default for LoRA rather than something derived per task. It is not the best task fit available; it is the point where the task fit is nearly as good and the collateral damage is still bounded. The reference gives the number without the reason, and the reason is this column." }
      ] },

    { t: "viz", title: "Learning rate: the two curves point in opposite directions", caption: "Validation loss is best at 5e-4. General ability is already four and a half times worse there.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Validation loss and general perplexity against learning rate">
  <text x="16" y="22" class="s-label" style="fill:var(--good)">VALIDATION LOSS \u2014 lower is better</text>
  <text x="16" y="48" class="s-sub">5e-5</text>
  <rect x="86" y="36" width="300" height="16" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="396" y="48" class="s-mono">3.4485</text>
  <text x="16" y="72" class="s-sub">1e-4</text>
  <rect x="86" y="60" width="217" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="313" y="72" class="s-mono">2.4939</text>
  <text x="16" y="96" class="s-sub">2e-4</text>
  <rect x="86" y="84" width="183" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="279" y="96" class="s-mono">2.1094</text>
  <text x="16" y="120" class="s-sub">5e-4</text>
  <rect x="86" y="108" width="177" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="273" y="120" class="s-mono" style="fill:var(--good)">2.0359  best</text>
  <text x="16" y="144" class="s-sub">1e-3</text>
  <rect x="86" y="132" width="220" height="16" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="316" y="144" class="s-mono">2.5304</text>

  <line x1="16" y1="164" x2="744" y2="164" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="190" class="s-label" style="fill:var(--crit)">GENERIC PERPLEXITY \u2014 baseline 5.282</text>
  <text x="16" y="214" class="s-sub">5e-5</text>
  <rect x="86" y="202" width="30" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="126" y="214" class="s-mono" style="fill:var(--good)">5.343</text>
  <text x="16" y="238" class="s-sub">2e-4</text>
  <rect x="86" y="226" width="92" height="16" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="188" y="238" class="s-mono" style="fill:var(--warn)">8.739</text>
  <text x="16" y="262" class="s-sub">5e-4</text>
  <rect x="86" y="250" width="320" height="16" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="416" y="262" class="s-mono" style="fill:var(--crit)">23.903  \u2014 the best-validation model</text>
  <text x="16" y="284" class="s-mono" style="fill:var(--crit)">1e-3: 31.327 \u2014 and a worse validation loss too, so only this one is visibly bad</text>
</svg>` },

    { t: "h2", n: "04", id: "rank", text: "Rank: where it stops paying",
      sub: "A plateau on the task and a steady cost elsewhere" },

    { t: "code", lang: "python", title: "g48.py \u2014 five ranks at \u03b1 = 2r", code: `for r in (4, 8, 16, 32, 64):
    m = build(r, 2 * r, ["c_attn", "c_proj", "c_fc"])
    train(m, 6, 2e-4)
    print(r, trainable(m), eval_loss(m, va_rows), generic_ppl(m))`,
      out: `  rank          trainable     train loss       val loss    generic ppl
  4                589824         2.6903         2.5725          5.705
  8               1179648         2.2600         2.2701          6.444
  16              2359296         1.8825         2.1094          8.739
  32              4718592         1.4976         2.0415         10.045
  64              9437184         1.1209         2.0396         14.439`,
      hl: [5, 6],
      caption: "Between r=32 and r=64 validation improves by 0.1% and generic perplexity gets 44% worse." },

    { t: "callout", kind: "insight", title: "The plateau is the stopping rule",
      body: [
        { t: "p", text: "Validation loss improves steadily to r=32 (2.0415) and then stops: r=64 gives **2.0396**, a gain of 0.0019, for twice the parameters. Meanwhile generic perplexity goes from 10.045 to **14.439**." },
        { t: "p", text: "So doubling rank past the plateau buys nothing on the task and costs real capability. That is the concrete reason behind the reference\u2019s **8 simple / 16 instructions / 32\u201364 complex** guidance \u2014 the top of its range is where the returns disappear, and going past it is not merely wasteful but actively harmful." },
        { t: "p", text: "Note that this does not contradict 4.3, which found rank-8 adapters capturing only 45% of a full fine-tune\u2019s update. Both are true: more rank does represent more of the update, and past a point the extra directions are not ones the *task* needed. The plateau is where those two facts meet." }
      ] },

    { t: "h2", n: "05", id: "modules", text: "Target modules: the cheapest lever",
      sub: "And the one with the most surprising result" },

    { t: "code", lang: "python", title: "g48.py \u2014 four placements, same rank and steps", code: `for mods in (["c_attn"], ["c_attn", "c_proj"], ["c_fc"],
             ["c_attn", "c_proj", "c_fc"]):
    m = build(16, 32, mods)
    train(m, 6, 2e-4)
    print(mods, trainable(m), eval_loss(m, va_rows), generic_ppl(m))`,
      out: `  target modules                        trainable       val loss    generic ppl
  attention qkv only                       589824         2.8277          5.703
  attention qkv + output                  1622016         2.2270          8.840
  MLP input only                           737280         2.6041          5.400
  attention + MLP (all three)             2359296         2.1094          8.739`,
      hl: [4],
      caption: "MLP input alone: a better validation loss than attention-qkv alone, at a quarter of the general-ability cost." },

    { t: "callout", kind: "insight", title: "MLP input only is the efficient point",
      body: [
        { t: "p", text: "Compare the first and third rows. Attention-qkv alone trains 589,824 parameters for validation 2.8277 and generic perplexity 5.703 \u2014 an 8% degradation. MLP input alone trains 737,280 for validation **2.6041** and generic perplexity **5.400**, a **2.2%** degradation." },
        { t: "p", text: "So for 25% more parameters it gets a better task fit *and* roughly a quarter of the collateral damage. If the question is \u201cwhere do I put a limited adapter budget\u201d, this configuration is the one on the efficient frontier." },
        { t: "p", text: "Adding everything does give the best validation loss (2.1094) and costs 8.739 generic perplexity. That is the right choice when the task matters more than the model\u2019s other abilities, and it is a choice rather than a default." },
        { t: "p", text: "This is worth holding loosely. It is one task, one model and one rank, and 4.3 measured a *different* property \u2014 which matrices have the most concentrated updates \u2014 that pointed at attention output projections. Those two findings answer different questions and I would not generalise either without re-measuring on the real task." }
      ] },

    { t: "h2", n: "06", id: "defaults", text: "The table, annotated",
      sub: "Each default, and what the measurement says it is protecting" },

    { t: "table",
      head: ["Setting", "Reference's default", "What I measured"],
      rows: [
        ["`r` (rank)", "8 simple \u00b7 16 instructions \u00b7 32\u201364 complex", "Validation plateaus at r=32 (2.0415 \u2192 2.0396 at 64) while generic perplexity rises 10.0 \u2192 14.4 \u2014 the top of the range is where returns stop"],
        ["`lora_alpha`", "2 \u00d7 r", "Makes the multiplier the constant 2 (4.4), so `r` can be swept alone \u2014 and measurably under-trains r=32 against `\u03b1/\u221ar`"],
        ["`target_modules`", "attention + MLP projections", "Best validation (2.1094) and 8.739 generic. MLP input alone is 2.6041 at 5.400 \u2014 a cheaper point if general ability matters"],
        ["`learning_rate`", "2e-4", "**The most important default here.** 5e-4 beats it on validation and reaches 23.903 generic perplexity against 8.739"],
        ["`num_train_epochs`", "1\u20133", "Calibrated for 500\u20131,000+ examples. On 32 examples validation peaked at epoch 9 \u2014 count steps, not epochs"],
        ["held-out split", "10\u201320%", "Necessary and not sufficient \u2014 section 03 is a configuration that wins on held-out task data and loses everywhere else"]
      ] },

    { t: "ladder", title: "Running a LoRA job you can defend", rungs: [
      { level: "bad", label: "Train until the loss looks good", why: "The training loss falls monotonically for as long as you let it \u2014 to 0.633 by epoch 16 here \u2014 and 4.1 measured that curve while the model degraded 25%. It cannot distinguish learning from memorising and it never turns around.",
        code: `train(model, epochs=20, lr=2e-4)
# loss went from 5.0 to 0.6, looks great` },
      { level: "ok", label: "Hold out 20% and stop on validation", why: "Catches overfitting to the examples, which is real \u2014 validation bottomed at epoch 9 while training loss kept falling. It is the standard practice and it is half the instrument.",
        code: `best = min(history, key=lambda h: h.val_loss)
# stops at epoch 9 instead of 16` },
      { level: "best", label: "Add a general-ability metric and treat it as a budget", why: "The third column is the one that catches a configuration that is winning on the task and losing the model. Decide in advance how much general perplexity you are willing to spend, and reject configurations that exceed it regardless of their validation loss.",
        code: `for cfg in candidates:
    m = train(cfg)
    if generic_ppl(m) > 1.5 * baseline_ppl:
        continue                      # rejects lr=5e-4 despite its best val loss
    keep(cfg, eval_loss(m, val))`,
        note: "Measured: lr=5e-4 has the best validation loss in the sweep and 4.53\u00d7 the baseline perplexity." }
    ] },

    { t: "h2", n: "07", id: "faq", text: "The FAQ, with evidence",
      sub: "Four questions, four measurements" },

    { t: "dl", items: [
      { k: "Fine-tuning or RAG?", v: "Behaviour to fine-tuning, facts to retrieval. 4.1 measured a fact trained to a low loss and then read out backwards on rephrasing; 4.2 measured retrieval correct the instant a document changed while the fine-tune kept reciting the old value." },
      { k: "LoRA or QLoRA?", v: "QLoRA when it would not otherwise fit. 4.5 measured the memory at 14.5 GB against 4.0 GB for a 7B, and the quality cost at 1.069\u00d7 perplexity \u2014 with the caveat that four-bit storage dequantizes on every forward pass, so LoRA is faster when you have the room." },
      { k: "How much data?", v: "Quality over quantity, and 10\u201320% held back. The 1K\u201310K clean examples is right; what my 32-example runs show is the failure at the bottom of that range \u2014 enough to transfer a behaviour and not enough to separate it from the specific examples." },
      { k: "Does it add facts?", v: "Not reliably, which 4.1 makes precise: the tokens are learned, the relation is not. The model produced the right entity inside sentences like \u201cMorrowbridge is Morrowbridge\u2019s capital\u201d." }
    ] },

    { t: "exercise", kind: "lab", title: "Sweep the four settings with all three metrics", difficulty: "advanced", minutes: 40,
      body: "Build a dataset large enough to split, hold back 20%, and sweep epochs, rank, learning rate and target modules. Record training loss, held-out validation loss and perplexity on unrelated text for every configuration. Then identify any configuration that would be chosen by validation loss alone and rejected once the third metric is considered.",
      requirements: [
        "Split the data before any training and keep the split fixed across every run",
        "Use a general-ability passage with no vocabulary or style overlap with the task",
        "Record all three metrics per epoch for the epoch sweep, and at the end for the others",
        "Sweep learning rate over at least 5e-5 to 1e-3",
        "Report explicitly which configuration wins on validation and what it costs elsewhere"
      ],
      hint: "Rank your configurations by validation loss and then look at the general-ability column of the winner. If the two rankings agree, widen the learning-rate range until they do not.",
      solution: { lang: "python", title: "g48.py \u2014 the sweep", code: `TRAIN, VAL = RAW[:32], RAW[32:]
tr_rows, va_rows = encode(TRAIN), encode(VAL)

GENERIC = ("The transformer architecture processes all positions in parallel during "
           "training. Paris is the capital of France. Water boils at one hundred "
           "degrees Celsius at sea level. The library opens at nine in the morning. ")
gids = tok(GENERIC * 3, return_tensors="pt").input_ids[:, :256]

def generic_ppl(m):
    m.eval()
    with torch.no_grad():
        return float(torch.exp(m(input_ids=gids, labels=gids, use_cache=False).loss))

# epochs: all three metrics, every epoch
m = build(16, 32, ["c_attn", "c_proj", "c_fc"])
hist = train(m, 16, 2e-4, record=True)

# learning rate: the sweep that matters
for lr in (5e-5, 1e-4, 2e-4, 5e-4, 1e-3):
    m = build(16, 32, ["c_attn", "c_proj", "c_fc"])
    train(m, 6, lr)
    print(lr, eval_loss(m, tr_rows), eval_loss(m, va_rows), generic_ppl(m))

# rank, and where it plateaus
for r in (4, 8, 16, 32, 64):
    m = build(r, 2 * r, ["c_attn", "c_proj", "c_fc"])
    train(m, 6, 2e-4)
    print(r, eval_loss(m, va_rows), generic_ppl(m))

# where to put the adapters
for mods in (["c_attn"], ["c_attn", "c_proj"], ["c_fc"],
             ["c_attn", "c_proj", "c_fc"]):
    m = build(16, 32, mods)
    train(m, 6, 2e-4)
    print(mods, eval_loss(m, va_rows), generic_ppl(m))`,
        out: `  baseline generic perplexity: 5.282

  EPOCHS (r=16, lr=2e-4)
  epoch        train loss       val loss      generic ppl
  1                5.0483         4.1252            5.343
  6                2.2265         2.1094            8.739
  9                1.6268         2.0260           10.777 <-- best val
  12               1.1531         2.2532           20.403
  15               0.7477         2.5012           30.272

  LEARNING RATE (6 epochs, r=16)
  lr               train loss       val loss    generic ppl
  5e-05                3.5746         3.4485          5.343
  1e-04                2.5910         2.4939          5.732
  2e-04                1.8825         2.1094          8.739
  5e-04                0.9888         2.0359         23.903
  1e-03                0.4388         2.5304         31.327

  RANK (6 epochs, lr=2e-4)
  rank          trainable       val loss    generic ppl
  4                589824         2.5725          5.705
  8               1179648         2.2701          6.444
  16              2359296         2.1094          8.739
  32              4718592         2.0415         10.045
  64              9437184         2.0396         14.439

  TARGET MODULES (6 epochs, r=16, lr=2e-4)
  target modules                        trainable       val loss    generic ppl
  attention qkv only                       589824         2.8277          5.703
  attention qkv + output                  1622016         2.2270          8.840
  MLP input only                           737280         2.6041          5.400
  attention + MLP (all three)             2359296         2.1094          8.739`,
        notes: [
          { t: "p", text: "**The configuration that wins on validation is lr=5e-4, and it has 4.53\u00d7 the baseline perplexity.** 2.0359 against 2.1094 for the 2e-4 default \u2014 a 3% better task fit for a model that is four and a half times worse at ordinary English. A sweep that ranks on held-out task loss picks it, and everything that sweep measured says it was correct." },
          { t: "p", text: "**General ability degrades from epoch 1, seven epochs before validation turns.** 5.343 after one epoch against a 5.282 baseline, 10.777 by the best-validation epoch. Early stopping on validation does not avoid the cost; it caps it. There is no free epoch, only a schedule of what you are spending." },
          { t: "p", text: "**Rank plateaus at 32.** Going to 64 improves validation by 0.0019 and worsens generic perplexity by 44%. That is a concrete stopping rule and it explains why the usual guidance tops out at 64 rather than continuing upward." },
          { t: "p", text: "**MLP input alone is the efficient placement**: validation 2.6041 at 5.400 generic, against attention-qkv alone at 2.8277 and 5.703 \u2014 better task fit and a quarter of the damage, for 25% more parameters. Hold that loosely; it is one task on one model, and 4.3's spectrum analysis pointed at a different set of matrices for a different reason." },
          { t: "p", text: "Two limits worth stating. Thirty-two training examples is far below the 500\u20131,000 real tasks need, so these are the dynamics at the small end \u2014 directions robust, magnitudes a worst case. And one passage of English is a coarse general-ability probe: adequate to separate 5.3 from 23.9, not to argue about 8.739 against 8.840." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A fine-tune has a price and the training loss does not show it. The validation loss shows whether you got what you paid for; only a third metric shows what it cost. Decide the budget before the sweep \u2014 \u201cno more than 1.5\u00d7 baseline perplexity\u201d \u2014 and let it reject configurations that win on the task." },
        { t: "p", text: "Otherwise the sweep will hand you its best validation loss, and that number has no idea what it did to the rest of the model." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe swept learning rates for a fine-tune, picked the one with the best held-out loss, and shipped it. Users say the model has got worse at things unrelated to the fine-tuned task. How did our sweep miss that?\u201d**" },
        { t: "p", text: "Because the sweep measured the task and the regression is somewhere else. Held-out task data is still task data \u2014 if the adapter learns the behaviour and simultaneously degrades general language ability, the validation loss improves and the users\u2019 experience gets worse. The instrument cannot see it." },
        { t: "p", text: "I would expect this to be exactly what happened, because I have measured it. Sweeping five learning rates, 5e-4 gave the best validation loss of any configuration \u2014 2.0359 against 2.1094 for the conventional 2e-4 \u2014 and took perplexity on ordinary English from 5.282 to 23.903. Picking the validation winner picks the wrecked model, and every number in the sweep endorses it." },
        { t: "p", text: "The fix is a third metric: perplexity on a held-out corpus that has nothing to do with the task, measured for every configuration, treated as a budget rather than a tiebreak. Something like \u2018reject anything above 1.5\u00d7 baseline\u2019 would have eliminated 5e-4 outright and selected 2e-4, which is what the conventional default is for." },
        { t: "p", text: "I would also check epochs, since the same blindness applies there. In my run general perplexity started rising at epoch 1 and was already 2.04\u00d7 baseline at the best-validation epoch \u2014 so even correct early stopping leaves real degradation, and the question is how much is acceptable rather than whether there is any." },
        { t: "p", text: "The good news is that if this is LoRA, the damage is reversible: the base weights are untouched, so detaching the adapter restores the original model exactly. They can ship the base today and re-run the sweep with the third metric, rather than rebuilding anything." },
        { t: "p", text: "And I would ask what \u2018worse at unrelated things\u2019 means concretely, because it needs to become a measurement they can run before and after. Right now it is a user report, and the next sweep needs it to be a number in the table." }
      ] }
  ],

  takeaways: [
    "**A fine-tune needs three metrics**: training loss for fit, held-out validation for generalisation, and perplexity on unrelated text for what the run costs everywhere else.",
    "**Validation loss on the task is necessary and not sufficient** \u2014 held-out task data is still task data, so it improves while general ability degrades.",
    "**The best validation loss in the sweep was a wrecked model**: lr=5e-4 scored 2.0359 against 2.1094 for 2e-4, with generic perplexity at 23.903 against a 5.282 baseline.",
    "**That is why 2e-4 is the conventional LoRA learning rate** \u2014 not the best task fit, but nearly as good with the collateral damage still bounded.",
    "**General ability starts degrading at epoch 1**, seven epochs before validation turns, and is already 2.04\u00d7 baseline at the best-validation epoch. Early stopping caps the cost; it does not avoid it.",
    "**Rank plateaus**: r=32 to r=64 improved validation by 0.0019 and worsened generic perplexity by 44%, which is the concrete reason the usual guidance stops at 64.",
    "**MLP input alone was the efficient placement** here \u2014 validation 2.6041 at 5.400 generic, against attention-qkv alone at 2.8277 and 5.703 \u2014 though that is one task on one model.",
    "**Count steps, not epochs.** The \u201c1\u20133 epochs\u201d assumes 500\u20131,000 examples; 32 examples peaked at epoch 9, which is 72 optimiser steps.",
    "**Set a general-ability budget before the sweep** and let it reject configurations, rather than treating the metric as a tiebreak after the fact.",
    "**Under LoRA the damage is reversible** \u2014 the base is untouched, so a bad adapter is detached rather than rebuilt, which makes a failed sweep cheap to recover from."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A learning-rate sweep finds 5e-4 has the best held-out validation loss (2.0359 against 2.1094 for 2e-4). Generic perplexity is 23.903 against a 5.282 baseline. What should you ship?",
        options: [
          "5e-4, since held-out loss is the standard selection criterion",
          "2e-4, because the 3% better task fit is not worth a model 4.5\u00d7 worse at everything else",
          "1e-3, which trains fastest",
          "Neither \u2014 the sweep needs more learning rates between 2e-4 and 5e-4"
        ],
        answer: 1,
        why: "Held-out task data is still task data, so validation loss improves while general ability collapses \u2014 the instrument is blind to exactly this failure. The 5e-4 model fits the task marginally better and has become 4.5\u00d7 worse at ordinary English, which users will notice everywhere the fine-tuned behaviour is not involved. This is the concrete reason 2e-4 is the conventional LoRA learning rate: nearly the same task fit with the collateral damage bounded." },

      { stem: "In a 16-epoch run, validation loss bottoms at epoch 9 while generic perplexity rises from 5.343 at epoch 1 to 10.777 at epoch 9. What follows?",
        options: [
          "Early stopping at epoch 9 avoids the degradation",
          "Early stopping caps the degradation but does not avoid it \u2014 the optimal-for-task model has already doubled its loss on unrelated text",
          "The validation set is too small to locate the minimum reliably",
          "The learning rate should be reduced so that validation bottoms later"
        ],
        answer: 1,
        why: "General ability starts falling from the first epoch, seven epochs before validation turns around, so there is no epoch at which the behaviour comes for free \u2014 only a schedule of what you are paying. At the best-validation epoch perplexity is already 2.04\u00d7 the baseline. The decision is therefore which price is acceptable, which is a product question that cannot even be asked without the third metric." },

      { stem: "Rank 32 gives validation 2.0415 and generic perplexity 10.045; rank 64 gives 2.0396 and 14.439. What does this show?",
        options: [
          "Rank 64 is better, since its validation loss is lower",
          "The task has plateaued \u2014 doubling rank buys 0.0019 of validation and costs 44% of general ability",
          "The adapter is underfitting and needs more epochs at rank 64",
          "Alpha should have been held constant rather than set to 2r"
        ],
        answer: 1,
        why: "A 0.09% improvement in validation for twice the parameters and a 44% worse general-ability score is a plateau, not a gain \u2014 the extra directions are not ones this task needed, while they are enough to shift behaviour elsewhere. This is the concrete reason the usual rank guidance tops out around 64. Holding alpha constant would change the multiplier with rank, which 4.4 shows is a separate effect." },

      { stem: "Why is a general-ability metric not simply a larger validation set?",
        options: [
          "Because validation sets are always drawn from the training distribution",
          "Because it measures a different thing: held-out task examples still reward the trained behaviour, so they cannot detect damage outside the task",
          "Because perplexity is more sensitive than cross-entropy loss",
          "Because it requires a separate model to compute"
        ],
        answer: 1,
        why: "More held-out pirate examples still measure how well the model does pirate responses. If the adapter degrades ordinary English while perfecting the task, every task metric improves and the user-visible regression is invisible. The general-ability corpus must have no overlap with the task in vocabulary or style for it to catch that \u2014 measured, it is the only one of the three metrics that distinguishes lr=2e-4 from lr=5e-4 correctly. Both metrics are computed from the same model with the same loss function." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The question where the standard answer \u2014 hold out a validation set \u2014 is half right",
    questions: [
      { level: "core",
        q: "How do you choose hyperparameters for a LoRA fine-tune?",
        strong: "A strong answer sweeps one variable at a time and measures more than the task.",
        answer: [
          { t: "p", text: "Fix `\u03b1 = 2r` so the multiplier is constant and `r` can be swept alone, then sweep `r` upward until validation loss plateaus. In my sweep that was rank 32 \u2014 rank 64 improved validation by 0.0019 and made generic perplexity 44% worse, so the plateau is the stopping rule." },
          { t: "p", text: "Learning rate I would leave at 2e-4 unless there is a reason, and the reason that default exists is worth knowing. Sweeping 5e-5 to 1e-3, the best validation loss was at 5e-4 \u2014 and that configuration took perplexity on ordinary English from 5.282 to 23.903. The conventional default is not the best task fit; it is the point where the task fit is nearly as good and the damage is still bounded." },
          { t: "p", text: "Epochs by the validation curve, not by a number. The usual \u20181 to 3\u2019 assumes 500 to 1,000 examples; on 32 examples mine peaked at epoch 9, which is 72 optimiser steps. Steps transfer, epochs do not." },
          { t: "p", text: "And target modules, which is the cheapest lever and the one people skip. Attention plus MLP gave the best validation; MLP input alone gave a better task fit than attention-qkv alone at a quarter of the general-ability cost, for 25% more parameters." }
        ] },

      { level: "advanced",
        q: "What do you measure during a fine-tune, and why?",
        strong: "A strong answer names three metrics and explains what each one cannot see.",
        answer: [
          { t: "p", text: "Three, because each is blind to what the next one catches. Training loss says how well the model fits the examples, which is compatible with it getting worse \u2014 I have measured a run whose training loss improved from 0.457 to 0.239 while general perplexity went 6.748 to 7.207." },
          { t: "p", text: "Held-out validation on the same task catches overfitting to the specific examples, and it is the standard practice and half the instrument. It cannot see damage outside the task, because held-out task data still rewards the trained behaviour." },
          { t: "p", text: "The third is perplexity on a corpus with no overlap with the task. That is the one that catches the failure the others cannot: in my learning-rate sweep, 5e-4 had the best validation loss of any configuration and 4.53\u00d7 the baseline perplexity. Selecting on validation picks the wrecked model and every number in the sweep agrees with the choice." },
          { t: "p", text: "I would treat that third number as a budget set before the sweep rather than a tiebreak afterwards \u2014 something like \u2018reject anything over 1.5\u00d7 baseline\u2019 \u2014 so that it can eliminate a configuration that wins on the task. A metric that only breaks ties never overrules anything." },
          { t: "p", text: "And I would watch it per epoch, not just at the end. It started rising at epoch 1 in my run and was already double the baseline at the best-validation epoch, so the shape tells you what early stopping is actually buying." }
        ] },

      { level: "core",
        q: "How much data do you need, and how do you split it?",
        strong: "A strong answer gives the range and describes what failure looks like below it.",
        answer: [
          { t: "p", text: "Roughly 1,000 to 10,000 clean, consistent examples for a real task, with 10 to 20% held back from the start. Quality dominates quantity \u2014 inconsistent examples teach the model that the behaviour is optional, which is worse than having fewer of them." },
          { t: "p", text: "What is useful is knowing what the bottom of that range looks like, because that is where people actually start. With twelve examples I measured a full fine-tune transferring a style to four of four unseen prompts and simultaneously answering \u2018what is two plus two\u2019 with a verbatim training reply \u2014 enough data to teach a surface pattern, not enough to separate it from the content it was demonstrated on." },
          { t: "p", text: "The split has to happen before any training and stay fixed across every configuration in a sweep, or the comparisons are not comparisons." },
          { t: "p", text: "And I would hold back a second set that has nothing to do with the task, for general ability. That is not a conventional split and it is the one that caught a configuration in my own sweep that was best on task validation and 4.5\u00d7 worse on ordinary English." }
        ] }
    ]
  }
});
