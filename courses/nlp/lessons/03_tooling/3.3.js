/* ============================================================================
   LESSON 3.3 — HuggingFace Transformers for NLP
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "**Drop the attention mask and BERT's `[CLS]` vector moves from cosine 1.000000 to 0.472976 — for the same two-word input.** The padding is supposed to be invisible; without the mask the model attends to it and the representation is half a different vector. No exception is raised. This lesson is about what HuggingFace's abstractions actually return, because the failures are silent ones: a wrong mask, a mismatched tokenizer, an untrained head that outputs confident nonsense.",

  objectives: [
    "Read everything `AutoTokenizer` returns and say what each key is for",
    "Demonstrate what the attention mask does and what breaks without it",
    "Distinguish `AutoModel` from the `AutoModelFor…` task heads",
    "Explain why a tokenizer and model checkpoint must match",
    "Use zero-shot classification, and recognise the bias a masked LM exposes"
  ],

  prerequisites: ["3.1", "2.8"],

  blocks: [

    { t: "h2", n: "01", text: "Three layers of abstraction", id: "layers" },

    {"kind": "layers", "title": "Four layers, and the second one is where you work when anything goes wrong", "caption": "**`pipeline` is the fastest way to a result and the hardest to debug** — it tokenizes, runs and post-processes in one call, so a surprising output has three possible causes you cannot see. **`AutoTokenizer` + `AutoModel` is where you own the tensors**, which is why §02 and §03 work at that level. `Trainer` is the fine-tuning loop already written, and `datasets` is memory-mapped with a caching `.map`, **so it handles corpora far larger than RAM.**", "items": [{"label": "pipeline(...)", "sub": "tokenize, run, post-process in one call", "tone": "good", "side": "fastest"}, {"label": "AutoTokenizer + AutoModel", "sub": "you own the tensors", "tone": "violet", "side": "debuggable"}, {"label": "Trainer", "sub": "eval, checkpointing, mixed precision, logging", "tone": "good", "side": "training"}, {"label": "datasets", "sub": "memory-mapped, with a caching .map", "tone": "good", "side": "> RAM"}], "t": "diagram", "id": "dg-3_3-01-0"},


    { t: "dl", items: [
      ["`pipeline`", "Tokenize, run, post-process, in one call. Fastest way to a result and the hardest to debug."],
      ["`AutoTokenizer` + `AutoModel`", "You own the tensors. This is where you work when anything goes wrong or you need control."],
      ["`Trainer`", "The fine-tuning loop, with evaluation, checkpointing, mixed precision and logging already written."],
      ["`datasets`", "Memory-mapped datasets with a `.map` that caches. Handles corpora far larger than RAM."]
    ] },

    { t: "callout", kind: "warn", title: "Several of the pipelines no longer exist",
      body: [{ t: "p", text: "On **transformers 5.17** the tasks `summarization`, `translation_en_to_fr` and `question-answering` were removed from the pipeline registry and raise `KeyError: Unknown task`. Still present: `text-classification`, `ner`, `text-generation`, `fill-mask`, `zero-shot-classification` and `feature-extraction`. The models are all unchanged — what went away is the wrapper, so you call the model class directly, as lessons 2.6 to 2.8 did. On transformers 4.x every example in the usual treatment runs as written." }] },

    { t: "h2", n: "02", text: "What the tokenizer returns", id: "tokenizer" },

    {"kind": "trace", "title": "Three keys, and two of them are about batching rather than text", "caption": "`input_ids` is the text. **The other two exist because a model takes rectangular tensors: `token_type_ids` marks which of two segments each token belongs to — all zeros here because there is one sentence — and `attention_mask` marks which positions are real.** On a single unpadded input the mask is all ones and looks redundant, which is exactly why it gets dropped. **§03 measures what that costs.**", "left": "key", "codeW": 170, "vars": ["shape", "value", "what it is for"], "steps": [{"code": "input_ids", "state": ["(1, 4)", "[[101, 7592, 2088, 102]]", "the text"], "tone": "good"}, {"code": "token_type_ids", "state": ["(1, 4)", "[[0, 0, 0, 0]]", "which segment"], "changed": [1, 2], "tone": "accent"}, {"code": "attention_mask", "state": ["(1, 4)", "[[1, 1, 1, 1]]", "which positions are real"], "changed": [1, 2], "tone": "violet", "note": "looks redundant here"}], "t": "diagram", "id": "dg-3_3-02-1"},


    { t: "code", lang: "python", title: "scratchpad/nlp/n33.py — inspecting the encoding", code:
"from transformers import AutoTokenizer\n\ntok = AutoTokenizer.from_pretrained(\"bert-base-uncased\")\nenc = tok(\"Hello world\", return_tensors=\"pt\")\n\nprint(list(enc.keys()))\nprint(tok.convert_ids_to_tokens(enc[\"input_ids\"][0]))",
      caption: "Always print `convert_ids_to_tokens` when something is wrong. Most tokenisation bugs are visible immediately and invisible otherwise." },

    { t: "out", text:
"keys: ['input_ids', 'token_type_ids', 'attention_mask']\n\n  input_ids        shape (1, 4)   [[101, 7592, 2088, 102]]\n  token_type_ids   shape (1, 4)   [[0, 0, 0, 0]]\n  attention_mask   shape (1, 4)   [[1, 1, 1, 1]]\n\ntokens: ['[CLS]', 'hello', 'world', '[SEP]']" },

    { t: "p", text: "Two words in, four tokens out. `[CLS]` and `[SEP]` were added for you — `[CLS]` is the position whose final hidden state classification heads read, and `[SEP]` marks the end of a segment. `token_type_ids` distinguishes the two segments in a sentence-pair task like QA or NLI; with one segment it is all zeros. And the input was lowercased, because this is the `uncased` checkpoint." },

    { t: "h2", n: "03", text: "The attention mask is not optional", id: "mask" },

    {"kind": "trace", "title": "Cosine 1.000000 with the mask, 0.472976 without", "caption": "The same short sentence, padded to 12 and embedded two ways. **With the mask the result is identical to the unpadded version — cosine 1.000000, max absolute difference 1.9×10⁻⁶, which is float noise. Without it, cosine 0.472976 and a max difference of 6.633.** So dropping the mask does not degrade the representation slightly: **it produces a different vector, because attention distributed weight over nine padding positions.** And nothing warns you — the code runs and the shapes are right.", "left": "configuration", "codeW": 210, "vars": ["cosine vs unpadded", "max abs diff"], "steps": [{"code": "padded, WITH attention_mask", "state": ["1.000000", "1.907e-06"], "tone": "good", "note": "float noise"}, {"code": "padded, WITHOUT the mask", "state": ["0.472976", "6.633e+00"], "changed": [0, 1], "tone": "crit"}, {"code": "what happened", "state": ["attention spent weight on 9 zeros", "no error, correct shapes"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-3_3-03-2"},


    { t: "p", text: "Batching requires equal lengths, so shorter sequences are padded. The mask tells the model which positions are real. It is easy to drop, and nothing warns you." },

    { t: "out", text:
"tok([\"Hi\", \"Hello there, this is a considerably longer sentence indeed\"],\n    padding=True, truncation=True, max_length=12)\n\ninput_ids       [[101, 7632, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0],\n                 [101, 7592, 2045, 1010, 2023, 2003, 1037, 9839, 2936, 6251, 5262, 102]]\nattention_mask  [[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],\n                 [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]" },

    { t: "code", lang: "python", title: "Measuring what the mask is worth", code:
"short  = tok(\"Hi\", return_tensors=\"pt\")\npadded = tok(\"Hi\", padding=\"max_length\", max_length=12, return_tensors=\"pt\")\n\nwith torch.no_grad():\n    a = mod(**short).last_hidden_state[0, 0]                     # no padding\n    b = mod(**padded).last_hidden_state[0, 0]                    # padded + mask\n    c = mod(input_ids=padded[\"input_ids\"]).last_hidden_state[0, 0]   # mask dropped\n\nprint(cosine(a, b), cosine(a, c))",
      caption: "Passing `input_ids` alone is the common mistake — the model builds a default mask of all ones, so every `[PAD]` becomes a real token it attends to." },

    { t: "out", text:
"cos(unpadded, padded WITH mask)    = 1.000000\ncos(unpadded, padded WITHOUT mask) = 0.472976\n\nmax abs diff with mask    = 1.907e-06\nmax abs diff without mask = 6.633e+00" },

    { t: "callout", kind: "crit", title: "Same input, half a different vector",
      body: [{ t: "p", text: "With the mask, padding changes the `[CLS]` representation by **1.9e-06** — floating-point noise, exactly as it should be. Without it, cosine similarity to the correct vector is **0.472976** and individual dimensions move by up to **6.633**. The model attended to nine `[PAD]` tokens as if they were content. Nothing raised an exception and nothing logged a warning; you would only find this by measuring. This is the single most common silent bug in hand-rolled transformer code, and it gets worse as batches get more ragged, because a short sequence in a long batch is mostly padding." }] },

    { t: "h2", n: "04", text: "AutoModel against the task heads", id: "heads" },

    {"kind": "trace", "title": "The task head is 1,538 parameters against 109.5 million", "caption": "**A 768×2 matrix plus two biases — 1,538 parameters — bolted onto a 109.5M encoder, which is why the two models report the same rounded parameter count.** Practically all the knowledge is in the base model, **so fine-tuning is mostly about adapting that rather than training the head**, and it is also why 3.3's `learning_rate=2e-5` matters: you are nudging 109.5M pretrained weights, not fitting 1,538 new ones.", "left": "class", "codeW": 230, "vars": ["outputs", "shape", "params"], "steps": [{"code": "AutoModel", "state": ["last_hidden_state", "(1, 4, 768)", "109.5M"], "tone": "good", "note": "one vector per token"}, {"code": "AutoModel (pooled)", "state": ["pooler_output", "(1, 768)", "-"], "changed": [0, 1], "tone": "good", "note": "[CLS] through a tanh"}, {"code": "AutoModelForSequenceClassification", "state": ["logits", "(1, 2)", "109.5M + 1,538"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-3_3-04-3"},


    { t: "out", text:
"AutoModel outputs: ['last_hidden_state', 'pooler_output']\n  last_hidden_state (1, 4, 768)      one vector per token\n  pooler_output     (1, 768)         [CLS] through a tanh layer\n\nAutoModelForSequenceClassification outputs: ['logits']\n  logits (1, 2)                      two numbers\n\nparams: base 109.5M   with head 109.5M   (the head adds 1,538)" },

    { t: "p", text: "`AutoModel` gives you representations; the `AutoModelFor…` classes bolt a small head on top and give you task outputs. The head here is 1,538 parameters — a 768×2 matrix plus two biases — against 109.5M in the encoder. Practically all the knowledge is in the base model, and fine-tuning is mostly about adapting that rather than training the head." },

    { t: "callout", kind: "trap", title: "A fresh head is random, and it will not tell you",
      body: [{ t: "p", text: "Loading `AutoModelForSequenceClassification.from_pretrained(\"bert-base-uncased\", num_labels=2)` prints a load report saying `classifier.weight` and `classifier.bias` are **MISSING** and were newly initialised. That report is the only signal. The model will happily produce logits, softmax will turn them into confident-looking probabilities, and they are pure noise until you train. Anyone who has evaluated a \"fine-tuned\" model and got results near chance has usually skipped that message." }] },

    { t: "h2", n: "05", text: "Tokenizers are not interchangeable", id: "mismatch" },

    {"kind": "trace", "title": "One sentence, three token counts, three conventions", "caption": "**12 ids, 11 and 9 for the same seven words** — so a token budget computed with one tokenizer does not transfer. The conventions differ in the opposite direction too: **BERT marks continuations with `##`; RoBERTa and GPT-2 mark word-*initial* tokens with `Ġ`, a visible stand-in for a preceding space.** And **GPT-2 adds no special tokens at all, because a causal LM has no use for `[CLS]` or `[SEP]`** — which means a pipeline that slices off the first and last ids silently eats real words.", "left": "tokenizer", "codeW": 190, "vars": ["ids", "marks", "special tokens"], "steps": [{"code": "bert-base-uncased", "state": ["12", "## = continuation", "[CLS] ... [SEP]"], "tone": "good"}, {"code": "roberta-base", "state": ["11", "Ġ = word-initial", "<s> ... </s>"], "changed": [0, 1, 2], "tone": "good"}, {"code": "gpt2", "state": ["9", "Ġ = word-initial", "NONE"], "changed": [0, 2], "tone": "warn", "note": "slicing [1:-1] eats words"}], "t": "diagram", "id": "dg-3_3-05-4"},


    { t: "out", text:
"\"The unhappiest tokenization I have seen\"\n\nbert-base-uncased  12 ids  ['[CLS]','the','un','##ha','##pp','##iest','token',\n                             '##ization','i','have','seen','[SEP]']\nroberta-base       11 ids  ['<s>','The','Ġunh','app','iest','Ġtoken',\n                             'ization','ĠI','Ġhave','Ġseen','</s>']\ngpt2                9 ids  ['The','Ġunh','app','iest','Ġtoken','ization',\n                             'ĠI','Ġhave','Ġseen']" },

    { t: "p", text: "Three tokenizers, three different token counts, three different subword splits, three different special-token conventions. BERT marks continuations with `##`; RoBERTa and GPT-2 mark word-*initial* tokens with `Ġ`, a visible stand-in for a preceding space. GPT-2 adds no special tokens at all, because a causal LM has no use for `[CLS]`." },

    { t: "callout", kind: "crit", title: "The mismatch produces garbage, not an error",
      body: [{ t: "p", text: "Token id 7592 is `hello` in BERT's vocabulary and something entirely unrelated in RoBERTa's. Feed one model's ids to another and you get a tensor of the right shape, a plausible-looking output, and meaningless results. Because the shapes agree, nothing fails. Always load both from the same checkpoint string — and when you save a fine-tuned model, save the tokenizer alongside it, because a checkpoint without its tokenizer is not reproducible." }] },

    { t: "h2", n: "06", text: "Zero-shot classification", id: "zeroshot" },

    {"kind": "flow", "title": "Classification reformulated as entailment, which is why it needs no labels", "caption": "For each candidate label it asks an NLI-trained model **whether the input entails the hypothesis *This example is about {label}***, then normalises the entailment scores — `travel 0.998`, `cooking 0.994`, both correct with no labelled examples. Which makes it **the right first move on a new classification problem: it gives you a working baseline in minutes and tells you whether the label set is even separable before anyone spends a week annotating.**", "cols": 3, "nodes": [{"id": "l", "label": "Each label becomes a hypothesis", "sub": "'This example is about {label}'", "tone": "violet"}, {"id": "n", "label": "An NLI model scores entailment", "sub": "trained on a different task", "tone": "good"}, {"id": "s", "label": "Normalise across labels", "sub": "travel 0.998, cooking 0.994", "tone": "good"}, {"id": "z", "label": "No labelled examples at all", "sub": "a baseline in minutes", "tone": "good"}, {"id": "t", "label": "And it tells you if the labels separate", "sub": "before a week of annotation", "tone": "teal"}], "edges": [["l", "n"], ["n", "s"], ["s", "z"], ["z", "t"]], "t": "diagram", "id": "dg-3_3-06-5"},


    { t: "p", text: "Zero-shot classification needs no training data at all. It reformulates classification as natural language inference: for each candidate label it asks a model trained on NLI whether the input entails the hypothesis *This example is about {label}*, then normalises the entailment scores." },

    { t: "code", lang: "python", title: "Classification with no training set", code:
"from transformers import pipeline\n\nz = pipeline(\"zero-shot-classification\", model=\"facebook/bart-large-mnli\")\nz(\"I want to book a flight\",\n  candidate_labels=[\"travel\", \"cooking\", \"sports\"])",
      caption: "Cost scales with the number of labels — one forward pass each — so this is a prototyping and long-tail tool, not a high-throughput one." },

    { t: "out", text:
"I want to book a flight      travel 0.998, sports 0.001, cooking 0.001\nHow do I roast a chicken?    cooking 0.994, sports 0.003, travel 0.003" },

    { t: "p", text: "Both correct, with no labelled examples. This is the right first move on a new classification problem: it gives you a working baseline in minutes and tells you whether the label set is even separable before anyone spends a week annotating." },

    { t: "h2", n: "07", text: "Fill-mask, and what it exposes", id: "fillmask" },

    {"kind": "trace", "title": "A factual probe at 0.997, and the same mechanism reading back its training data", "caption": "`Paris is the [MASK] of France` gives `capital` at **0.997** — the probe working as intended. Then the same two sentences differing by one word: **`The man worked as a [MASK]` gives `carpenter 0.097, waiter 0.052`, and `The woman worked as a [MASK]` gives `nurse 0.220, waitress 0.160, maid 0.115, prostitute 0.038`.** Note the **confidence** gap as well as the content: the female-subject distribution is sharper, so **the model is more certain about the stereotype than about the occupation.**", "left": "prompt", "codeW": 200, "vars": ["top predictions", "top probability"], "steps": [{"code": "'Paris is the [MASK] of France.'", "state": ["capital, heart, center", "0.997"], "tone": "good"}, {"code": "'The man worked as a [MASK].'", "state": ["carpenter, waiter, barber", "0.097"], "changed": [0, 1], "tone": "warn"}, {"code": "'The woman worked as a [MASK].'", "state": ["nurse, waitress, maid", "0.220"], "changed": [0, 1], "tone": "crit", "note": "and more confident"}], "t": "diagram", "id": "dg-3_3-07-6"},


    { t: "out", text:
"Paris is the [MASK] of France.   capital 0.997, heart 0.001, center 0.000, centre 0.000\n\nThe man worked as a [MASK].      carpenter 0.097, waiter 0.052, barber 0.050, mechanic 0.038\nThe woman worked as a [MASK].    nurse 0.220, waitress 0.160, maid 0.115, prostitute 0.038" },

    { t: "callout", kind: "crit", title: "The pretraining corpus, read back",
      body: [{ t: "p", text: "The first line is the demo everyone shows: 0.997 on `capital`, clearly factual knowledge acquired from pretraining. The next two are the same mechanism reading back something else. Change one word — *man* to *woman* — and the occupation distribution shifts to `nurse`, `waitress`, `maid` and `prostitute`, with the top prediction more than twice as confident as anything in the male list. BERT did not invent this; it measured it in the text it was trained on. Any classifier fine-tuned on top of this encoder starts from these associations, which is why bias evaluation belongs in your test suite rather than in a paragraph of the model card. `fill-mask` is a cheap and direct probe — run it on the templates that matter for your application before you ship." }] },

    { t: "h2", n: "08", text: "Fine-tuning with Trainer", id: "trainer" },

    {"kind": "flow", "title": "Four arguments, and three of them discard data quietly", "caption": "**`learning_rate=2e-5` is two orders of magnitude below training from scratch, because higher rates destroy the pretrained weights — this is the parameter to suspect first when a fine-tune fails.** The other three are about what gets thrown away: **`truncation=True` silently discards anything past the limit, and on IMDB at 256 tokens that is a substantial fraction of each review — measure how much before accepting the number.** `padding=\"max_length\"` wastes compute that `DataCollatorWithPadding` recovers, and **`.map` caches on a hash of the function**, so re-running is free until you change it.", "cols": 3, "nodes": [{"id": "l", "label": "learning_rate=2e-5", "sub": "100x below from-scratch", "tone": "violet"}, {"id": "d", "label": "Higher destroys the pretrained weights", "sub": "suspect this first", "tone": "crit"}, {"id": "t", "label": "truncation=True discards silently", "sub": "measure how much, on your data", "tone": "crit"}, {"id": "p", "label": "padding='max_length' wastes compute", "sub": "DataCollatorWithPadding is faster", "tone": "warn"}, {"id": "m", "label": ".map caches on a hash of the function", "sub": "free to re-run, recomputes on change", "tone": "good"}], "edges": [["l", "d"], ["d", "t"], ["t", "p"], ["p", "m"]], "t": "diagram", "id": "dg-3_3-08-7"},


    { t: "code", lang: "python", title: "The standard fine-tuning loop", code:
"from transformers import (AutoTokenizer, AutoModelForSequenceClassification,\n                          TrainingArguments, Trainer)\nfrom datasets import load_dataset\nimport evaluate, numpy as np\n\ndataset = load_dataset(\"imdb\")\nname = \"distilbert-base-uncased\"\ntokenizer = AutoTokenizer.from_pretrained(name)\nmodel = AutoModelForSequenceClassification.from_pretrained(name, num_labels=2)\n\ndef tokenize(batch):\n    return tokenizer(batch[\"text\"], padding=\"max_length\",\n                     truncation=True, max_length=256)\n\ntokenized = dataset.map(tokenize, batched=True)     # cached on disk\n\nmetric = evaluate.load(\"accuracy\")\ndef compute_metrics(eval_pred):\n    logits, labels = eval_pred\n    return metric.compute(predictions=np.argmax(logits, -1), references=labels)\n\nargs = TrainingArguments(output_dir=\"./results\", eval_strategy=\"epoch\",\n                         learning_rate=2e-5, per_device_train_batch_size=16,\n                         num_train_epochs=3, weight_decay=0.01)\n\nTrainer(model=model, args=args, compute_metrics=compute_metrics,\n        train_dataset=tokenized[\"train\"].shuffle(seed=42).select(range(5000)),\n        eval_dataset=tokenized[\"test\"].shuffle(seed=42).select(range(1000))).train()",
      caption: "`eval_strategy` was `evaluation_strategy` before transformers 4.41 — one of the more commonly hit renames." },

    { t: "dl", items: [
      ["`learning_rate=2e-5`", "Two orders of magnitude below what you would use training from scratch. Higher rates destroy the pretrained weights — this is the parameter to suspect first when fine-tuning fails."],
      ["`padding=\"max_length\"`", "Pads everything to 256. Simple, and wasteful when documents are short. Dynamic padding per batch, via `DataCollatorWithPadding`, is usually faster."],
      ["`truncation=True`", "Silently discards anything past the limit. On IMDB at 256 tokens a substantial fraction of each review is thrown away — measure how much before accepting the number."],
      ["`.map(batched=True)`", "Caches to disk keyed on a hash of the function, so re-running is free. Change the function and it recomputes."]
    ] },

    { t: "exercise", title: "Verify the abstractions",
      tasks: [
        "Encode a batch of ragged sentences and confirm the mask zeros line up with the `[PAD]` positions in `input_ids`.",
        "Reproduce the mask measurement on a model of your choice and record the cosine with and without it.",
        "Feed BERT ids to RoBERTa and look at the output. Confirm nothing raises, then decode the ids with the wrong tokenizer to see what the model actually received.",
        "Load a sequence-classification head, run it untrained, and softmax the logits. Note how confident the meaningless output looks.",
        "Run `fill-mask` on occupation, nationality and religion templates for a model you are about to deploy, and write the results into your test suite as assertions."
      ] }
  ],

  takeaways: [
    "The tokenizer returns `input_ids`, `attention_mask` and `token_type_ids`, and adds `[CLS]` and `[SEP]` you did not write.",
    "Dropping the attention mask moved BERT's `[CLS]` vector to cosine 0.472976 from the correct one, with dimensions off by 6.633 — silently.",
    "With the mask, padding changes the representation by 1.9e-06, which is floating-point noise.",
    "`AutoModel` returns representations; `AutoModelFor…` adds a task head — 1,538 parameters against 109.5M in the encoder.",
    "A fresh head is randomly initialised and says so only in the load report; it produces confident nonsense until trained.",
    "The same sentence tokenises to 12, 11 and 9 ids under BERT, RoBERTa and GPT-2, with different subwords and special tokens — mismatches produce garbage, not errors.",
    "Zero-shot classification via NLI scored 0.998 and 0.994 with no training data, making it the right baseline on a new problem.",
    "`fill-mask` predicted nurse, waitress, maid for 'woman' against carpenter, waiter, barber for 'man' — pretraining bias, readable in one line."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "What happens if you pass `input_ids` without the attention mask for a padded sequence?",
      options: ["An exception", "A warning, then correct output", "The model attends to the padding and the representation changes silently — cosine 0.472976 here", "The padding is stripped automatically"],
      answer: 2,
      why: "The model constructs a default mask of all ones, so every `[PAD]` is treated as a real token. The `[CLS]` vector for 'Hi' moved to cosine 0.472976 against its correct value, with individual dimensions off by up to 6.633. With the mask the difference is 1.9e-06. Nothing raises and nothing logs." },
    { stem: "How many parameters does a two-class sequence-classification head add to BERT-base?",
      options: ["About 1.5 million", "1,538 — a 768x2 matrix plus two biases", "768", "Half the model"],
      answer: 1,
      why: "109.5M in the encoder against 1,538 in the head. Essentially all the capability is in the pretrained base, which is why fine-tuning needs a learning rate around 2e-5 — you are adapting an encoder that already works, not training a classifier from nothing." },
    { stem: "Why must the tokenizer and model come from the same checkpoint?",
      options: ["Licensing", "Because token ids index a model-specific vocabulary, so a mismatch yields valid-shaped meaningless input with no error", "Because the tokenizer stores the weights", "They need not match"],
      answer: 1,
      why: "Id 7592 is 'hello' to BERT and something unrelated to RoBERTa. The same sentence tokenised to 12, 11 and 9 ids across BERT, RoBERTa and GPT-2. Shapes still agree, so the forward pass succeeds and returns confident nonsense — which is why you save the tokenizer beside any fine-tuned model." },
    { stem: "What does the fill-mask occupation result demonstrate?",
      options: ["The model is broken", "That pretraining bias is directly readable from the model and inherited by anything fine-tuned on it", "That BERT cannot handle gender", "That the mask token was wrong"],
      answer: 1,
      why: "'The man worked as a [MASK]' gave carpenter, waiter, barber; 'The woman worked as a [MASK]' gave nurse, waitress, maid, prostitute — with the top female prediction more than twice as confident. The model is reporting associations in its training corpus, and every classifier built on this encoder starts from them. `fill-mask` makes it a one-line test you can assert on." }
  ] },

  interview: { title: "Interview", sub: "HuggingFace in practice", questions: [
    { level: "Core", q: "What does the attention mask do, and what goes wrong without it?",
      strong: "It marks real tokens against padding; without it the model attends to PAD and the representation silently changes.",
      answer: [{ t: "p", text: "Batching needs equal-length sequences, so short ones get padded, and the attention mask is what tells the model which positions are real — masked positions get a large negative value added to their attention scores before the softmax, so they contribute essentially nothing. Leave it out and the model builds a default mask of all ones, treating every `[PAD]` as content. I measured it on BERT: with the mask, padding changed the `[CLS]` vector by 1.9e-06, which is floating-point noise; passing `input_ids` alone dropped cosine similarity to the correct vector to 0.472976, with individual dimensions off by 6.633. What makes it dangerous is that nothing raises and nothing logs — the shapes are right, the output looks plausible, and the error scales with how ragged your batches are, so a short sequence batched with long ones is mostly attending to padding. It's the first thing I check when hand-rolled transformer code gives results slightly worse than expected." }] },
    { level: "Core", q: "When would you reach for zero-shot classification?",
      strong: "As a day-one baseline before annotating, and for label sets that change or have a long tail.",
      answer: [{ t: "p", text: "First, as the baseline before anyone annotates anything. It reframes classification as entailment — asking an NLI model whether the text entails 'This example is about {label}' for each candidate — so it needs no training data at all. On a fresh problem I got 0.998 and 0.994 on obvious cases in minutes. That tells you whether the label set is even separable, which is worth knowing before committing a week of annotation to it. Second, for label sets that change frequently or have a long tail, where retraining per label is impractical — adding a label costs nothing but a forward pass. The limits are cost and ceiling: inference scales linearly with the number of candidate labels, so it's not a high-throughput solution, and a fine-tuned classifier on a few thousand labelled examples will beat it comfortably on a fixed label set. My usual path is zero-shot to establish the baseline and generate candidate labels, then use it to bootstrap annotation, then fine-tune once the label set has stabilised." }] },
    { level: "Senior", q: "How do you check a pretrained model for bias before deploying it?",
      strong: "Probe the LM directly with fill-mask templates, then measure the fine-tuned model per subgroup.",
      answer: [{ t: "p", text: "Two levels, and I'd do both. At the encoder level, `fill-mask` is an almost free probe of what pretraining encoded. I ran 'The man worked as a [MASK]' against 'The woman worked as a [MASK]' on bert-base-uncased and got carpenter, waiter, barber for the first and nurse, waitress, maid, prostitute for the second, with the top female prediction more than twice as confident as anything on the male list. That takes one line and it tells you what associations anything fine-tuned on this encoder inherits. I'd write those templates — occupation, nationality, religion, whatever's relevant to the application — as assertions in the test suite, so a model upgrade that makes it worse fails CI rather than shipping. At the task level, the probe isn't enough, because what matters is the deployed behaviour: I'd build an evaluation set stratified by the groups the system affects and report per-group metrics rather than an aggregate, since an aggregate hides exactly the disparity you're looking for. Counterfactual testing is the most direct version — take real inputs, swap the group-identifying term, and measure how often the prediction changes when it shouldn't. And I'd be clear about what none of this fixes: measuring bias doesn't remove it, so the finding has to feed into a decision about whether to deploy, with a human review path where the stakes warrant one." }] }
  ] }
});
