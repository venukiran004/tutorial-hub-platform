EC.receiveLesson({
  id: "4.7",

  lede: "This is the seven-step recipe run end to end: data, chat format, adapter, train, test, merge. Its example uses Qwen2.5-1.5B in four bits on a GPU; this machine has no CUDA, so bitsandbytes cannot load and the same seven steps run on GPT-2 in fp32 with real `peft`. Sixteen examples, eight epochs, **71 seconds on four CPU threads**, and the voice transferred to every held-out prompt. The adapter is **9.46 MB against a 498 MB base**. And the merge check turned up something worth knowing: the merged model gave identical answers on 5 of 5 prompts, with a maximum logit difference of **2.26e-04** \u2014 numerically equivalent rather than bit-identical.",

  objectives: [
    "Run a LoRA fine-tune end to end and name what each step contributes",
    "Format examples so that the model learns the response and not the prompt",
    "Read a loss curve and a before/after comparison together",
    "Merge an adapter into the base and verify the result",
    "Know which parts of the recipe are the model's and which are yours"
  ],

  prerequisites: ["4.5", "4.6"],

  blocks: [

    { t: "h2", n: "01", id: "substitution", text: "What I changed, and why",
      sub: "The recipe is the; the model is not" },

    { t: "callout", kind: "note", title: "The Q is missing from this QLoRA",
      body: [
        { t: "p", text: "The reference loads Qwen2.5-1.5B-Instruct with `BitsAndBytesConfig(load_in_4bit=True)`. **bitsandbytes requires CUDA and this machine has none**, so the four-bit path cannot run at all. The base here is GPT-2 in fp32." },
        { t: "p", text: "Everything else is the recipe unchanged \u2014 the dataset shape, the `LoraConfig`, the training loop, the before/after test, the merge. 4.5 covers what the four-bit storage would have changed, and it is only memory: the arithmetic runs in bf16 either way, so the training dynamics here are the same ones a QLoRA run would show." },
        { t: "p", text: "The other substitution is the trainer. The usual choice is `trl`\u2019s `SFTTrainer`, which is a convenience wrapper; this runs the loop explicitly so that every line is visible. Same optimiser, same loss, same updates." }
      ] },

    { t: "h2", n: "02", id: "data", text: "Steps 2 and 4: the data",
      sub: "Sixteen pairs, formatted so the roles are unambiguous" },

    { t: "p", text: "The task is deliberately obvious \u2014 answer in a pirate voice \u2014 so that success or failure is visible without a metric. The usual choice is six examples to demonstrate and notes that real tasks need 500\u20131,000; I used sixteen, which is still far below that and enough to see the behaviour transfer." },

    { t: "code", lang: "python", title: "g47.py \u2014 formatting each pair as one training string", code: `def to_text(q, a):
    return "User: %s\nAssistant: %s%s" % (q, a, tok.eos_token)

rows = [tok(to_text(q, a), return_tensors="pt").input_ids[0] for q, a in PAIRS]`,
      out: `  gpt2 has no chat template, so the roles are written out explicitly:
    "User: Hello, how are you?\nAssistant: Ahoy! I be doin' grand, matey! Arrr!<|endoftext|>"
  16 examples, 22 to 31 tokens each, 427 tokens total`,
      caption: "An instruct model would supply this structure through apply_chat_template. GPT-2 has none, so the convention is written by hand \u2014 and must then be used identically at inference." },

    { t: "callout", kind: "trap", title: "The format you train on is the format you must prompt with",
      body: [
        { t: "p", text: "Training on `\"User: \u2026\\nAssistant: \u2026\"` teaches the model that `\\nAssistant:` is where its turn begins. Prompt it later with anything else \u2014 a bare question, a different separator, an extra space \u2014 and you are asking it to generalise a convention it learned from sixteen examples." },
        { t: "p", text: "This is why `apply_chat_template` exists and why using it matters: the special tokens an instruct model was *pretrained* to expect are not guessable, and getting them subtly wrong degrades a fine-tune in ways that look like a training problem." },
        { t: "p", text: "The end-of-text token at the end of each example matters for the same reason \u2014 it is what teaches the model to stop. Omit it and the model learns to keep generating past the answer, which shows up as rambling that no amount of further training fixes." }
      ] },

    { t: "h2", n: "03", id: "before", text: "Step 6a: before",
      sub: "Record this first, or you have nothing to compare against" },

    { t: "code", lang: "python", title: "g47.py \u2014 the base model on four held-out prompts", code: `for q in HELD_OUT:
    print(q, ask(base, q))`,
      out: `    Can you recommend a book?        "I'm not sure if I can recommend a book. I'm not sure if I can recommend a b
    What is the capital of France?   'The capital of France. Assistant: The capital of France. Assistant: The cap
    How do I fix a leaking pipe?     "I'm not sure how to fix a leaking pipe. Assistant: I'm not sure how to fix
    Explain gravity to me.           "I'm not sure what you mean by gravity. Assistant: I'm not sure what you mea`,
      caption: "GPT-2 is a base model, not an instruct model \u2014 it echoes and loops rather than answering. That is the baseline this run has to beat." },

    { t: "h2", n: "04", id: "train", text: "Step 5: attach and train",
      sub: "Eleven lines of configuration and a loop" },

    { t: "code", lang: "python", title: "g47.py \u2014 the peft configuration and the loop", code: `cfg = LoraConfig(
    r=16, lora_alpha=32,                        # alpha = 2r, the rule from 4.4
    lora_dropout=0.05, bias="none",
    task_type="CAUSAL_LM",
    target_modules=["c_attn", "c_proj", "c_fc"],   # GPT-2's projection names
)
model = get_peft_model(base, cfg)

opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=2e-4)
for ep in range(8):
    for x, mask in batches(rows):
        labels = x.clone()
        labels[mask == 0] = -100                 # don't train on padding
        out = model(input_ids=x, attention_mask=mask, labels=labels, use_cache=False)
        out.loss.backward()
        opt.step(); opt.zero_grad()`,
      out: `  LoraConfig(r=16, lora_alpha=32, target_modules=['c_attn','c_proj','c_fc'])
  trainable 2359296 of 126799104 parameters = 1.8607%

  epoch       mean loss
  1              4.9329
  2              4.0668
  3              3.4586
  4              2.9660
  5              2.4345
  6              2.1489
  7              1.9197
  8              1.5741

  trained in 71 s on 4 CPU threads`,
      hl: [9],
      caption: "1.86% trainable \u2014 higher than 4.6's 0.24% because this targets three module types rather than one." },

    { t: "callout", kind: "note", title: "Reading this loss curve",
      body: [
        { t: "p", text: "Monotone, roughly linear, no plateau by epoch 8. On a larger dataset that would be an invitation to keep training; on sixteen examples it is mostly an invitation to memorise them, which is exactly what 4.1 measured happening." },
        { t: "p", text: "The useful signal is not the shape but the absence of a held-out curve beside it. Everything here says the run is going well and nothing here could say otherwise, which is the subject of 4.8." }
      ] },

    { t: "h2", n: "05", id: "after", text: "Step 6b: after",
      sub: "The same four prompts, never seen in training" },

    { t: "code", lang: "python", title: "g47.py \u2014 after eight epochs", code: `for q in HELD_OUT:
    print(q, ask(model, q))`,
      out: `    Can you recommend a book?        'I recommend a book, matey! Arrr!'
    What is the capital of France?   'The capital of France is the capital of me, and I sail the waves with my ca
    How do I fix a leaking pipe?     'I sail with a stern and stern-tack, matey! Arrr!'
    Explain gravity to me.           'I be the sternum of the ship, ye scallywag! Arrr!'

  and a prompt it WAS trained on:
    Hello, how are you?              'I be greeted by a kindly hand, matey! Arrr!'`,
      hl: [1],
      caption: "The voice transferred to all four unseen prompts. Note the last line, which is a training prompt and not the training answer." },

    { t: "callout", kind: "insight", title: "It learned the style without memorising the answers \u2014 unlike 4.1",
      body: [
        { t: "p", text: "4.1\u2019s full fine-tune on twelve examples answered \u201cWhat is two plus two?\u201d with a verbatim training reply: it had learned both the voice and the specific strings. This LoRA run, asked a prompt it *was* trained on, produced **\u201cI be greeted by a kindly hand, matey!\u201d** rather than the training target \u201cAhoy! I be doin\u2019 grand, matey!\u201d" },
        { t: "p", text: "So it generalised the style and did not reproduce the data. \u201cCan you recommend a book?\u201d \u2192 \u201cI recommend a book, matey! Arrr!\u201d is an actual attempt at the question in the trained voice, which is what the task asked for." },
        { t: "p", text: "I would not claim this as a controlled result \u2014 the two runs differ in method, example count, rank and epochs, so this is an observation rather than a comparison. But it is consistent with the usual account: a rank-constrained update has less capacity to store specific strings, so it is biased towards the pattern over the instances. If that is the mechanism, it is a quiet second argument for LoRA that nobody puts on the list." },
        { t: "p", text: "The content is still largely nonsense \u2014 \u201cthe capital of France is the capital of me\u201d \u2014 which is GPT-2 at 124M parameters, not a failure of the method. The task was the voice, and the voice is there." }
      ] },

    { t: "h2", n: "06", id: "ship", text: "Step 5b: what gets saved",
      sub: "Three files, nine megabytes" },

    { t: "code", lang: "python", title: "g47.py \u2014 save_pretrained writes only the adapter", code: `model.save_pretrained(ADAPTER)`,
      out: `    README.md                              5.04 KB
    adapter_config.json                    1.11 KB
    adapter_model.safetensors           9227.88 KB
  adapter total: 9.46 MB
  the base model at fp32 would be 498 MB -- a factor of 53`,
      caption: "The config records r, alpha and the target modules, so the adapter is self-describing \u2014 it knows which base it belongs to and where it attaches." },

    { t: "viz", title: "The seven steps, and what each one produces", caption: "The adapter is the artefact until step 7; after the merge it is an ordinary model again.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="The seven steps of a LoRA fine-tune">
  <rect x="16" y="20" width="104" height="38" rx="5" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="68" y="38" text-anchor="middle" class="s-sub">2. data</text>
  <text x="68" y="52" text-anchor="middle" class="s-sub">16 pairs</text>
  <text x="128" y="42" class="s-mono">\u2192</text>
  <rect x="148" y="20" width="104" height="38" rx="5" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="200" y="38" text-anchor="middle" class="s-sub">4. format</text>
  <text x="200" y="52" text-anchor="middle" class="s-sub">427 tokens</text>
  <text x="260" y="42" class="s-mono">\u2192</text>
  <rect x="280" y="20" width="104" height="38" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="332" y="38" text-anchor="middle" class="s-sub">5. attach</text>
  <text x="332" y="52" text-anchor="middle" class="s-sub">1.86% trainable</text>
  <text x="392" y="42" class="s-mono">\u2192</text>
  <rect x="412" y="20" width="104" height="38" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="464" y="38" text-anchor="middle" class="s-sub">5. train</text>
  <text x="464" y="52" text-anchor="middle" class="s-sub">71 s, loss 4.93\u21921.57</text>
  <text x="524" y="42" class="s-mono">\u2192</text>
  <rect x="544" y="20" width="104" height="38" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="596" y="38" text-anchor="middle" class="s-sub">5b. save</text>
  <text x="596" y="52" text-anchor="middle" class="s-sub">9.46 MB</text>

  <line x1="16" y1="90" x2="744" y2="90" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="118" class="s-label" style="fill:var(--good)">SHIP THE ADAPTER \u2014 9.46 MB</text>
  <rect x="16" y="130" width="40" height="26" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="66" y="148" class="s-sub">needs the base at serve time; several adapters share one base</text>

  <text x="16" y="190" class="s-label" style="fill:var(--accent)">OR MERGE \u2014 step 7, 501 MB</text>
  <rect x="16" y="202" width="330" height="26" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="181" y="220" text-anchor="middle" class="s-sub">a plain GPT2LMHeadModel \u2014 no peft at inference</text>
  <text x="360" y="220" class="s-sub">zero adapter overhead, one model per variant</text>

  <text x="16" y="264" class="s-mono" style="fill:var(--warn)">merge check: identical answers on 5 of 5 prompts, max logit difference 2.26e-04</text>
  <text x="16" y="282" class="s-sub">numerically equivalent, not bit-identical \u2014 the folding is done in floating point</text>
</svg>` },

    { t: "h2", n: "07", id: "merge", text: "Step 7: merge",
      sub: "And verify, because the merge is arithmetic" },

    { t: "code", lang: "python", title: "g47.py \u2014 fold BA into W\u2080 and check the result", code: `fresh  = GPT2LMHeadModel.from_pretrained("gpt2")
loaded = PeftModel.from_pretrained(fresh, ADAPTER)
merged = loaded.merge_and_unload()            # W0 <- W0 + (alpha/r) * B @ A
merged.save_pretrained(MERGED)

for q in HELD_OUT + [PAIRS[0][0]]:
    print(ask(model, q) == ask(merged, q))`,
      out: `  merged model written: 501 MB (a plain GPT2LMHeadModel, no peft needed)
  type after merge_and_unload(): GPT2LMHeadModel

  does the merged model give the SAME answers as base + adapter?
    Can you recommend a book?      same   'I recommend a book, matey! Arrr!'
    What is the capital of Franc   same   'The capital of France is the capital of
    How do I fix a leaking pipe?   same   'I sail with a stern and stern-tack, mat
    Explain gravity to me.         same   'I be the sternum of the ship, ye scally
    Hello, how are you?            same   'I be greeted by a kindly hand, matey! A
  identical on 5 of 5 prompts

  max |logit difference| between adapter and merged: 2.260e-04`,
      hl: [11],
      caption: "The type is now a plain GPT2LMHeadModel \u2014 peft is not needed to load or serve it." },

    { t: "callout", kind: "trap", title: "The merge is numerically equivalent, not bit-identical",
      body: [
        { t: "p", text: "The answers matched on 5 of 5 prompts, and the logits did not: **2.26e-04** maximum absolute difference. That is not a bug. Adding `(\u03b1/r)\u00b7BA` into `W\u2080` once and then multiplying is a different order of floating-point operations from multiplying separately and adding the results, and floating-point addition is not associative." },
        { t: "p", text: "A difference of 1e-4 in logits is far below the gap between competing tokens in almost every position, which is why greedy decoding gave identical text. It is not guaranteed to. Where two tokens are nearly tied \u2014 and 1.1 showed how often that happens \u2014 a 1e-4 shift can flip the argmax, so a merged model can occasionally diverge from the unmerged one on a long generation." },
        { t: "p", text: "The practical rule: **verify after merging, on your own evaluation set**, rather than assuming the merge is a no-op. It is cheap, it catches genuine merge bugs such as a wrong scaling factor, and it sets the right expectation \u2014 equivalent within floating-point, not identical." }
      ] },

    { t: "callout", kind: "tradeoff", title: "Merge or keep the adapter separate?",
      body: [
        { t: "p", text: "**Keep it separate** when you have several variants, because they share one copy of the base \u2014 nine megabytes each against half a gigabyte each. Serving frameworks can hold many adapters against one loaded base and switch per request (3.7), which is how per-customer models are made practical." },
        { t: "p", text: "**Merge** when there is one variant and you want it to be an ordinary model: no peft dependency at inference, no adapter branch in the forward pass, and it loads anywhere a base model loads. The cost is a full-size artefact per variant." },
        { t: "p", text: "Keep the clean base either way. A merged model cannot be un-merged, and the adapter alone is useless without the exact base it was trained against \u2014 which is why `adapter_config.json` records it." }
      ] },

    { t: "exercise", kind: "lab", title: "Run the whole recipe and verify the merge", difficulty: "core", minutes: 40,
      body: "Run a complete LoRA fine-tune end to end on a small model: build a dozen or more examples of a clearly visible behaviour, format them with explicit role markers and an end-of-text token, record the base model's answers on held-out prompts first, train, test the same prompts, save the adapter, then merge it and verify that the merged model matches.",
      requirements: [
        "Record the before answers before training \u2014 once the adapter is attached it is too late",
        "Mask padding out of the loss and terminate each example with the end-of-text token",
        "Report trainable parameters as a percentage and the per-epoch mean loss",
        "Test on prompts that never appear in training, and separately on one that does",
        "After merging, compare answers and the maximum logit difference against the unmerged model"
      ],
      hint: "Compare the merged and unmerged models on logits as well as on text. Matching text is necessary and not sufficient \u2014 greedy decoding hides small numerical differences until the moment two tokens are nearly tied.",
      solution: { lang: "python", title: "g47.py \u2014 the seven steps", code: `cfg = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias="none",
                 task_type="CAUSAL_LM",
                 target_modules=["c_attn", "c_proj", "c_fc"])
model = get_peft_model(base, cfg)
tr  = sum(p.numel() for p in model.parameters() if p.requires_grad)
tot = sum(p.numel() for p in model.parameters())
print(tr, tot, 100 * tr / tot)

opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=2e-4)
for ep in range(8):
    s, nb = 0.0, 0
    for x, mask in batches(rows):
        labels = x.clone(); labels[mask == 0] = -100
        out = model(input_ids=x, attention_mask=mask, labels=labels, use_cache=False)
        out.loss.backward(); opt.step(); opt.zero_grad()
        s += float(out.loss); nb += 1
    print(ep + 1, s / nb)

model.save_pretrained(ADAPTER)

fresh  = GPT2LMHeadModel.from_pretrained("gpt2")
merged = PeftModel.from_pretrained(fresh, ADAPTER).merge_and_unload()
merged.save_pretrained(MERGED)

with torch.no_grad():
    l1 = model(input_ids=ids).logits
    l2 = merged(ids).logits
print(float((l1 - l2).abs().max()))`,
        out: `  trainable 2359296 of 126799104 parameters = 1.8607%

  epoch       mean loss
  1              4.9329
  4              2.9660
  8              1.5741
  trained in 71 s on 4 CPU threads

  BEFORE:
    Can you recommend a book?   "I'm not sure if I can recommend a book. I'm not"
    Explain gravity to me.      "I'm not sure what you mean by gravity. Assistant"

  AFTER:
    Can you recommend a book?   'I recommend a book, matey! Arrr!'
    Explain gravity to me.      'I be the sternum of the ship, ye scallywag! Arrr!'
    (trained prompt) Hello...   'I be greeted by a kindly hand, matey! Arrr!'

  adapter total: 9.46 MB   (base at fp32: 498 MB -- a factor of 53)
  merged model written: 501 MB, type GPT2LMHeadModel
  identical answers on 5 of 5 prompts
  max |logit difference| between adapter and merged: 2.260e-04`,
        notes: [
          { t: "p", text: "**The voice transferred to all four held-out prompts from sixteen examples and 71 seconds of CPU.** That is the result the recipe promises, and the cost is small enough that the main objection to trying a fine-tune \u2014 that it is a big undertaking \u2014 does not survive contact with it." },
          { t: "p", text: "**It did not reproduce its training answers.** Asked a prompt it had trained on, it produced a new sentence in the trained voice rather than the memorised target \u2014 the opposite of 4.1's full fine-tune, which returned training replies verbatim. The two runs differ in too many ways to call it a controlled comparison, but it is consistent with a rank-constrained update being biased towards the pattern over the instances." },
          { t: "p", text: "**The merge is equivalent, not identical: 2.26e-04 on the logits.** Folding `(\u03b1/r)\u00b7BA` into `W\u2080` reorders the floating-point arithmetic, and floating-point addition is not associative. Here it changed no argmax, so the text matched on all five prompts \u2014 but where two tokens are nearly tied it could, which is why a merged model should be re-verified rather than assumed equal." },
          { t: "p", text: "**9.46 MB against 498 MB \u2014 a factor of 53** \u2014 is the number that makes per-variant models practical. Note it is higher than 4.6's 0.24% because this targets three module types; the ratio is a property of the configuration, not of LoRA." },
          { t: "p", text: "**And nothing in this run could have told me it was going badly.** The loss fell monotonically for eight epochs on sixteen examples, which is exactly the curve 4.1 measured while general ability degraded. The missing piece is a held-out loss, which is where 4.8 starts." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "The recipe is: write the examples, mark the roles, attach, train, look at the output, decide whether to merge. Six of those seven steps are a few lines each, and the one that actually determines the result is the first." },
        { t: "p", text: "Sixteen examples and seventy-one seconds changed how a model answers every question it was asked. The engineering is not the hard part \u2014 knowing what you want it to do, and being able to tell whether it did, is." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe ran a LoRA fine-tune. It works when we test it with the adapter attached, but the merged model we deployed behaves differently. What happened?\u201d**" },
        { t: "p", text: "First I would establish the size of the difference, because there are two very different answers depending on it." },
        { t: "p", text: "If it is occasional and small \u2014 the odd divergent generation, mostly identical \u2014 that is floating point and it is expected. Merging folds `(\u03b1/r)\u00b7BA` into `W\u2080`, which reorders the arithmetic, and addition is not associative. I measured a maximum logit difference of 2.26e-04 after a merge, which changed no argmax across five prompts but could where two tokens are nearly tied. On a long generation, one flipped token early changes everything after it." },
        { t: "p", text: "If the merged model is substantially different \u2014 wrong style, base-like behaviour \u2014 that is a bug, and the usual candidates are concrete. The adapter merged against a different base revision than it was trained on; the scaling factor applied wrongly, so `\u03b1/r` is not what training used; or the merge ran on a model that had been loaded in a different dtype, so the fold happened at reduced precision." },
        { t: "p", text: "The diagnostic that separates them is the logit comparison on the same input rather than the generated text. Text matching is necessary and not sufficient, and a single number tells you immediately whether you are looking at 1e-4 or 1e-1." },
        { t: "p", text: "The process fix is to make that check part of the merge step rather than something done when a problem appears. It is four lines, it runs in seconds, and the alternative is discovering the difference in production, which is what happened here." },
        { t: "p", text: "And I would ask whether they still have the clean base. A merged model cannot be un-merged, so if the merge is wrong, recovering it means having the original weights and the adapter \u2014 which is an argument for keeping adapters as the artefact of record even when you deploy merged." }
      ] }
  ],

  takeaways: [
    "**The whole recipe is seven short steps**, and sixteen examples over 71 seconds of CPU transferred a voice to every held-out prompt.",
    "**Write the role markers and the end-of-text token explicitly** if the model has no chat template \u2014 and prompt with the identical format afterwards, since the model learned that convention from your examples.",
    "**Record the base model's answers before attaching the adapter.** Once it is attached there is nothing to compare against.",
    "**`trainable` is a property of the configuration**: 1.86% here targeting three module types, against 0.24% in 4.6 targeting one.",
    "**This run generalised the style without reproducing its training answers**, unlike 4.1's full fine-tune \u2014 consistent with a rank-constrained update favouring the pattern over the instances, though not a controlled comparison.",
    "**The adapter is 9.46 MB against a 498 MB base**, a factor of 53, which is what makes one adapter per customer or per task practical.",
    "**`merge_and_unload()` returns a plain model** \u2014 no peft at inference, no adapter branch in the forward pass, loadable anywhere.",
    "**The merge is numerically equivalent, not bit-identical**: 2.26e-04 maximum logit difference, because folding `BA` into `W\u2080` reorders floating-point arithmetic.",
    "**So verify after merging on your own prompts** \u2014 matching text is necessary and not sufficient, and a logit comparison distinguishes 1e-4 from a real bug immediately.",
    "**Keep the clean base and the adapter.** A merged model cannot be un-merged, and the adapter is useless without the exact base recorded in its config."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "After merging a LoRA adapter, the merged model gives identical text on every test prompt but its logits differ by 2.26e-04. What does this indicate?",
        options: [
          "The adapter was merged with the wrong scaling factor",
          "Normal floating-point behaviour \u2014 folding BA into W\u2080 reorders the arithmetic, and addition is not associative",
          "The base model was loaded at a different precision than during training",
          "merge_and_unload() applies dropout at merge time"
        ],
        answer: 1,
        why: "Computing (W\u2080 + \u0394W)x in one matmul is a different order of operations from computing W\u2080x and \u0394Wx separately and adding, and floating-point addition is not associative \u2014 so a difference around 1e-4 is expected and harmless here. It is not guaranteed harmless: where two tokens are nearly tied, a shift that small can flip the argmax and change a whole generation. A wrong scaling factor or a precision mismatch would produce differences orders of magnitude larger." },

      { stem: "Why must the prompt format at inference match the one used in training?",
        options: [
          "Because the tokenizer caches the format from the training run",
          "Because the model learned from the examples that a particular marker is where its turn begins, and a different format asks it to generalise a convention it saw few times",
          "Because peft stores the format in adapter_config.json and validates it",
          "Because the attention mask is derived from the role markers"
        ],
        answer: 1,
        why: "Training on \"User: \u2026\\nAssistant: \u2026\" teaches the model that \\nAssistant: introduces its response; prompting with a bare question or a different separator is a distribution it saw rarely or never. This is why apply_chat_template matters on instruct models \u2014 the special tokens they were pretrained to expect are not guessable, and getting them subtly wrong degrades results in ways that look like a training problem. The config records r, alpha and target modules, not the prompt format." },

      { stem: "A fine-tune's loss fell monotonically from 4.93 to 1.57 over eight epochs on sixteen examples. What does this tell you about model quality?",
        options: [
          "That the run succeeded, since the loss improved consistently",
          "Very little \u2014 a falling training loss on a small dataset is equally consistent with learning the behaviour and with memorising the examples",
          "That more epochs would continue to improve the model",
          "That the learning rate was well chosen"
        ],
        answer: 1,
        why: "The training loss measures fit to the training data, and on sixteen examples a model can drive it down by memorising them. 4.1 measured exactly this curve while general ability degraded by 25%, so the shape alone cannot distinguish the two outcomes. The missing instrument is a held-out loss alongside it. Reading the generated output on prompts never seen in training is the other check, and in this run it showed genuine generalisation." },

      { stem: "When should you keep the adapter separate rather than merging it?",
        options: [
          "Always \u2014 merging loses the ability to detach",
          "When you have several variants, since they share one copy of the base: megabytes each instead of a full model each",
          "When the base model is quantized, which prevents merging",
          "When the adapter rank exceeds 16"
        ],
        answer: 1,
        why: "The adapter measured 9.46 MB against a 498 MB base, so many variants against one loaded base is dramatically cheaper than one full model per variant \u2014 and serving frameworks can switch adapters per request. Merging is right for a single variant you want to be an ordinary model, with no peft dependency and no adapter branch at inference. Keeping the clean base and the adapter is sensible either way, since a merge cannot be undone. Rank does not affect whether merging is possible." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A walk-through question where the detail that matters is the verification",
    questions: [
      { level: "core",
        q: "Walk me through running a LoRA fine-tune end to end.",
        strong: "A strong answer covers the before measurement and the merge verification, not just the training.",
        answer: [
          { t: "p", text: "Write the examples first, because they determine the result more than anything else does. Format each one with explicit role markers and an end-of-text token, so the model learns both where its turn begins and where to stop \u2014 and use the identical format at inference, or you are asking it to generalise a convention from a handful of examples." },
          { t: "p", text: "Record the base model's answers on held-out prompts *before* attaching anything. Once the adapter is on there is nothing to compare against, and \u201cit seems better\u201d is not a result." },
          { t: "p", text: "Then attach \u2014 rank 16, alpha 32 following the `\u03b1 = 2r` rule, targeting the projection matrices \u2014 and train. I ran sixteen examples for eight epochs in 71 seconds on four CPU threads, with 1.86% of parameters trainable, and the voice transferred to all four held-out prompts." },
          { t: "p", text: "Save the adapter, which was 9.46 MB against a 498 MB base. Then decide whether to merge: separate if there are several variants sharing one base, merged if there is one variant and you want an ordinary model with no peft at inference." },
          { t: "p", text: "And verify the merge rather than assuming it. I measured a maximum logit difference of 2.26e-04 \u2014 the text matched on every prompt, but the merge reorders floating-point arithmetic and is equivalent rather than identical." }
        ] },

      { level: "advanced",
        q: "A merged model behaves differently from the same adapter unmerged. How do you diagnose it?",
        strong: "A strong answer distinguishes floating-point drift from a genuine bug by measurement.",
        answer: [
          { t: "p", text: "By measuring the size of the difference on logits rather than comparing generated text, because the two causes are orders of magnitude apart and text comparison cannot tell them apart." },
          { t: "p", text: "Around 1e-4 is floating point and expected. Merging folds `(\u03b1/r)\u00b7BA` into `W\u2080`, so the arithmetic happens in a different order, and addition is not associative. I measured 2.26e-04 on a real merge, which changed no argmax across five prompts \u2014 but on a long generation, one flipped token where two candidates are nearly tied changes everything downstream, so occasional divergence is consistent with a correct merge." },
          { t: "p", text: "Orders of magnitude larger is a bug, and the candidates are specific: the adapter merged against a different base revision than it trained on, a scaling factor that does not match what training used, or a merge performed at a reduced dtype." },
          { t: "p", text: "The process point is that this check belongs in the merge step rather than in the incident. Four lines, a couple of seconds, and the alternative is finding out in production." },
          { t: "p", text: "I would also confirm they still hold the clean base. A merge cannot be undone, and the adapter is only meaningful against the exact base recorded in its config \u2014 which is a reason to treat the adapter as the artefact of record even when you deploy merged." }
        ] },

      { level: "core",
        q: "How much data and time does a LoRA fine-tune actually take?",
        strong: "A strong answer separates what is enough to see an effect from what is enough to ship.",
        answer: [
          { t: "p", text: "Less than people expect to see an effect, and more than they expect to ship. I transferred a consistent answering style with sixteen examples and eight epochs in 71 seconds on four CPU threads \u2014 that is enough to demonstrate the mechanism and to prototype a behaviour." },
          { t: "p", text: "It is nowhere near enough for production. The usual guidance is 500 to 1,000 clean, consistent examples, and the reason is visible at small scale: with a dozen examples the model cannot separate the pattern from the specific instances it was shown. 4.1's full fine-tune on twelve examples started answering unrelated questions with verbatim training replies." },
          { t: "p", text: "Quality matters more than quantity. A thousand consistent examples beat ten thousand inconsistent ones, because the inconsistency teaches the model that the behaviour is optional." },
          { t: "p", text: "And I would hold back 10\u201320% from the start. A training loss on a small set tells you almost nothing \u2014 mine fell monotonically for eight epochs, which is equally consistent with learning the behaviour and with memorising the data, and only a held-out set separates those." }
        ] }
    ]
  }
});
