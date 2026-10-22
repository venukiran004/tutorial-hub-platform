/* ============================================================================
   LESSON 7.3 — Vision-Language Models
   A real VLM is run: unconditional captioning hallucinates, and the prefix
   "there are" produces exactly "there are two squares" (§05)
   (scratchpad/nlp/n73.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.3",

  lede: "**Asked to caption two blue squares, BLIP produced \"a blue square icon with the word ' s logo\". Given the prefix \"there are\", the same model on the same image produced \"there are two squares\".** Identical weights, identical pixels — one framing hallucinated a logo and got the count wrong, the other counted correctly. Prompting a vision-language model matters exactly as much as prompting a language one, and unconditional captioning is the hardest setting you can ask for. This lesson covers the three VLM architectures and what training them actually costs.",

  objectives: [
    "Distinguish dual-encoder, bridge and native-multimodal architectures",
    "Trace LLaVA's two training stages and compute what each trains",
    "Explain why stage 1 freezes the language model",
    "Run a VLM and see both hallucination and prompt sensitivity",
    "Judge when to build on a VLM and when not to"
  ],

  prerequisites: ["7.2", "5.9"],

  blocks: [

    { t: "h2", n: "01", text: "Three architectures", id: "architectures" },

    {"kind": "trace", "title": "Three patterns, and the middle one is the whole open-source ecosystem", "caption": "**Dual encoders do similarity only, so they retrieve and classify and cannot answer a question. The bridge pattern — vision encoder, connector, LLM — is what every open VLM is**, and the variation between them is the connector: **LLaVA uses an MLP, BLIP-2 uses 32 learned queries, Flamingo uses gated cross-attention.** Native multimodal trains all modalities in one stack from pretraining, **which is the only pattern that generates as well as understands.**", "left": "pattern", "codeW": 150, "vars": ["how", "used for"], "steps": [{"code": "dual encoder", "state": ["two towers, similarity only", "retrieval, zero-shot"], "tone": "good"}, {"code": "bridge to an LLM", "state": ["encoder -> connector -> LLM", "VQA, captioning, chat"], "changed": [0, 1], "tone": "violet"}, {"code": "native multimodal", "state": ["one stack from pretraining", "everything, incl. generation"], "changed": [0, 1], "tone": "accent"}, {"code": "the open reference", "state": ["LLaVA: ViT + MLP + Vicuna", "-"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-7_3-01-0"},


    { t: "table",
      head: ["Pattern", "Examples", "How", "Used for"],
      rows: [
        ["Dual encoder", "CLIP, SigLIP", "Two towers, similarity only", "Retrieval, zero-shot classification"],
        ["Bridge to an LLM", "BLIP-2, LLaVA, Flamingo", "Vision encoder → connector → LLM", "VQA, captioning, visual chat"],
        ["Native multimodal", "Gemini, GPT-4o", "All modalities in one stack from pretraining", "Everything, including generation"]
      ] },

    { t: "table",
      head: ["Model", "Architecture", "Notable for"],
      rows: [
        ["GPT-4o", "Proprietary native multimodal", "Vision, text and audio in one model"],
        ["Gemini 2.0", "Native multimodal", "All modalities plus actions"],
        ["LLaVA 1.6", "ViT + MLP + Vicuna", "The open-source reference design"],
        ["BLIP-2", "ViT + Q-Former + LLM", "Bottleneck bridging — 32 learned queries"],
        ["Qwen-VL", "ViT + Qwen", "Multilingual and document understanding"],
        ["Phi-3-Vision", "SigLIP + Phi-3", "Efficient small VLM"]
      ] },

    { t: "h2", n: "02", text: "LLaVA, and what it costs to train", id: "llava" },

    { t: "diagram", kind: "flow", title: "The projection design", cols: 3,
      nodes: [
        { id: "i", text: "Image", tone: "accent" },
        { id: "v", text: "CLIP ViT — frozen", tone: "teal" },
        { id: "p", text: "Linear or MLP projection", tone: "violet" },
        { id: "t", text: "Text tokens", tone: "accent" },
        { id: "s", text: "[visual tokens] + [text tokens], one sequence", tone: "violet" },
        { id: "l", text: "LLM decoder, unmodified", tone: "good" }
      ],
      edges: [["i","v"],["v","p"],["p","s"],["t","s"],["s","l"]] },

    { t: "out", text:
"vision encoder (CLIP ViT-L)    300,000,000 params   FROZEN in both stages\nLLM (Vicuna 7B)              7,000,000,000 params\n2-layer MLP projector           20,971,520 params\n\nstage 1 — feature alignment: train ONLY the projector\n  trainable    20,971,520  =  0.2865% of the system\n\nstage 2 — visual instruction tuning: projector + LLM\n  trainable 7,020,971,520  =  95.9%" },

    { t: "callout", kind: "crit", title: "Stage 1 trains 0.2865% of the parameters",
      body: [{ t: "p", text: "That number is why this design spread so fast. You take a vision encoder someone else trained contrastively on 400M pairs, an LLM someone else trained on trillions of tokens, and you learn the **21 million parameter map between them** on a few hundred thousand image-caption pairs. No enormous batches, no contrastive infrastructure, no architectural change to the LLM. It is the same economics as LoRA in lesson 5.6: freeze the expensive parts, train the connector. And because the LLM is untouched, a better base model can be swapped in later by retraining only the projector." }] },

    { t: "h2", n: "03", text: "What the projector has to achieve", id: "projector" },

    {"kind": "flow", "title": "The LLM will process anything you hand it, sensibly or not", "caption": "**Its layers were trained on inputs with a particular scale and geometry — a specific typical norm, a specific distribution across dimensions — and nothing checks that what arrives resembles that.** So the projector's job is not only dimensional (**1024 → 4096**) but **distributional**: produce vectors that sit where token embeddings sit. The scale reference makes it concrete — **GPT-2's token embeddings have std 0.1437 and mean norm 3.9585** — and **a projector whose output norm is ten times that will be attended to as if it were a shouting token.**", "cols": 3, "nodes": [{"id": "d", "label": "1024 -> 4096", "sub": "the dimensional job", "tone": "good"}, {"id": "s", "label": "And into the right distribution", "sub": "std 0.1437, mean norm 3.9585", "tone": "violet"}, {"id": "n", "label": "Nothing validates the input", "sub": "the LLM processes it regardless", "tone": "crit"}, {"id": "t", "label": "A 10x norm = a shouting token", "sub": "attended to disproportionately", "tone": "crit"}, {"id": "l", "label": "So the projector is learned, not derived", "sub": "it has to find that geometry", "tone": "accent"}], "edges": [["d", "s"], ["s", "n"], ["n", "t"], ["t", "l"]], "t": "diagram", "id": "dg-7_3-03-1"},


    { t: "out", text:
"it maps ViT patch embeddings (d=1024) into the LLM's token space (d=4096)\n\nfor scale reference, gpt2's token embeddings:\n  std 0.1437, mean norm 3.9585" },

    { t: "callout", kind: "insight", title: "It has to land the visual tokens where the LLM can read them",
      body: [{ t: "p", text: "The LLM has never seen a visual token. Its layers were trained on inputs with a particular scale and geometry — a specific typical norm, a specific distribution across dimensions — and it will process anything you hand it, sensibly or not. The projector's job is to produce vectors that sit in that same region, so the LLM's existing attention and FFN weights treat them as meaningful. A projector whose output has the wrong magnitude produces visual tokens the model effectively ignores, which is the classic stage-1 failure: the loss falls a little, the model learns to caption from the text prior alone, and the image contributes nothing. It is worth checking that the projected visual tokens have a norm comparable to real token embeddings." }] },

    { t: "h2", n: "04", text: "Why stage 1 freezes the LLM", id: "freeze" },

    {"kind": "flow", "title": "A few hundred thousand caption pairs would overwrite the language ability", "caption": "**Training the LLM directly on image-caption pairs is catastrophic forgetting: a narrow fine-tuning distribution overwriting broad pretrained capability.** So stage 1 **teaches the projector to speak the LLM's language without touching the LLM at all**, and stage 2 unfreezes it on instruction data once the visual tokens already land in the right place. Which is the same reasoning as Flamingo's zero-initialised gate in 5.9 — **both designs start from exactly the original model and add visual influence from there.**", "cols": 3, "nodes": [{"id": "t", "label": "Train the LLM on caption pairs", "sub": "a few hundred thousand", "tone": "crit"}, {"id": "f", "label": "Catastrophic forgetting", "sub": "narrow data overwrites broad ability", "tone": "crit"}, {"id": "s", "label": "Stage 1: train the projector only", "sub": "the LLM is frozen", "tone": "good"}, {"id": "u", "label": "Stage 2: unfreeze, on instructions", "sub": "visual tokens already land right", "tone": "good"}, {"id": "g", "label": "Same logic as Flamingo's zero gate", "sub": "start AT the original model", "tone": "violet"}], "edges": [["t", "f"], ["f", "s"], ["s", "u"], ["u", "g"]], "t": "diagram", "id": "dg-7_3-04-2"},


    { t: "p", text: "Training the LLM directly on a few hundred thousand image-caption pairs would degrade its language ability — catastrophic forgetting, where a narrow fine-tuning distribution overwrites broad pretrained capability. Stage 1 therefore teaches the *projector* to speak the LLM's language without touching the LLM at all. Stage 2 then unfreezes it on instruction data, with the risk managed by a much lower learning rate and a broader data mix." },

    { t: "callout", kind: "insight", title: "Flamingo removes the risk rather than managing it",
      body: [{ t: "p", text: "Lesson 5.9 noted Flamingo's gated cross-attention layers are initialised with a `tanh` gate at **zero**, so at step 0 the multimodal model is *bit-identical* to the original LLM and visual influence is learned in gradually. That is a stronger guarantee than LLaVA's staged unfreezing: there is no point at which the language model is exposed to a distribution that could damage it. The cost is that the inserted layers are real added compute in every forward pass and must be redesigned per LLM architecture — which is why LLaVA's approach, weaker in principle, won in practice on composability." }] },

    { t: "h2", n: "05", text: "Running one", id: "running" },

    {"kind": "trace", "title": "Fluent, confident and wrong — and one prefix fixes it", "caption": "BLIP at 224M parameters on three synthetic images: **a red circle becomes `'a white circle with a black dot on it'`, and two blue squares become `\"a blue square icon with the word ' s logo\"`.** Fluent English, confidently wrong, **and nothing in the output signals the failure.** Then the conditional runs: **the prefix `'there are'` produces `'there are two squares'` — correct — while `'a picture of'` produces a degenerate loop of apostrophes.** So **the prompt is doing more work than the image here**, which is the honest reading of small-VLM captioning.", "left": "input", "codeW": 190, "vars": ["output", "right?"], "steps": [{"code": "red circle, unconditional", "state": ["'a white circle with a black dot'", "no"], "tone": "crit"}, {"code": "two squares, unconditional", "state": ["\"a blue square icon with the word\"", "no"], "changed": [0], "tone": "crit"}, {"code": "prefix 'a picture of'", "state": ["a loop of apostrophes", "no"], "changed": [0], "tone": "crit"}, {"code": "prefix 'there are'", "state": ["'there are two squares'", "YES"], "changed": [0, 1], "tone": "good", "note": "the prompt did the work"}], "t": "diagram", "id": "dg-7_3-05-3"},


    { t: "out", text:
"Salesforce/blip-image-captioning-base: 223,971,644 params\n\nunconditional captioning of generated images\n\n  red circle    -> 'a white circle with a black dot on it'\n  two squares   -> \"a blue square icon with the word ' s logo\"\n  stripes       -> 'a white background with a black and white stripe'" },

    { t: "callout", kind: "warn", title: "All three captions are wrong in a specific way",
      body: [{ t: "p", text: "The circle is **red**, not white with a black dot. There are **two** squares, not one, and there is no logo and no text. The stripes are **black and red**, not black and white. Notice the pattern: each caption is a fluent, plausible sentence drawn from the caption distribution — *icons with logos* and *black and white stripes* are common captions — that happens not to describe this image. The model is doing what lesson 2.6 found summarisers doing: producing something distributionally typical rather than something faithful. On synthetic abstract shapes, well outside its training distribution, the text prior dominates." }] },

    { t: "out", text:
"conditional captioning — same image (two blue squares), different prefixes\n\n  'a picture of'             -> \"a picture of a blue square with the words ' ' ' ' ' ' ' '\"\n  'there are'                -> 'there are two squares'\n  'the number of shapes is'  -> 'the number of shapes is shown in the blue box'" },

    { t: "callout", kind: "crit", title: "One prefix produced exactly the right answer",
      body: [{ t: "p", text: "*\"there are\"* → **\"there are two squares\"**. Correct count, correct shape, no hallucinated logo — from the same weights and the same pixels that produced *\"a blue square icon with the word ' s logo\"* moments earlier. The prefix constrains the model into a frame where counting is the natural continuation, and in that frame it can actually see the image. Meanwhile *\"a picture of\"* degenerated into repeated quote marks, the same repetition collapse lesson 6.7 found. The practical lesson is direct: **a VLM's apparent capability is partly a property of how you ask**, and if you need a specific fact from an image, ask for that fact rather than for a caption." }] },

    { t: "h2", n: "06", text: "When to build on a VLM", id: "when" },

    { t: "diagram", kind: "compare", title: "What they are and are not for",
      columns: [
        { title: "Good fits", tone: "good", items: [
          "Visual question answering with specific questions",
          "Describing natural photographs",
          "Visual chat where a human checks the output",
          "Bootstrapping labels for later verification",
          "Accessibility descriptions"
        ] },
        { title: "Poor fits", tone: "warn", items: [
          "Exact counting or measurement",
          "Reading dense text — use OCR",
          "Anything unverified and safety-relevant",
          "Fine-grained domain distinctions without tuning",
          "Abstract or synthetic imagery"
        ] }
      ] },

    { t: "callout", kind: "tradeoff", title: "The failure mode is fluent wrongness",
      body: [{ t: "p", text: "Every caption above was grammatical, confident and plausible. None was accurate. That is the characteristic VLM failure and it is much more dangerous than an obvious error, because nothing in the output signals low confidence — exactly the hallucination problem lesson 3.8 addressed with entailment checking. If a VLM's output feeds a decision, you need verification: ask the same question several ways and check for agreement, cross-check against a specialist model such as OCR or a detector, or keep a human in the loop. Treat a VLM as a strong prior about what an image probably contains, not as a measurement instrument." }] },

    { t: "code", lang: "python", title: "A VLM, as two classes",
      code: 'from transformers import AutoProcessor, LlavaForConditionalGeneration\n\nproc = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf")\nmodel = LlavaForConditionalGeneration.from_pretrained(\n    "llava-hf/llava-1.5-7b-hf", torch_dtype=torch.float16)\n\ninputs = proc(images=image, text="USER: <image>\\nWhat is this? ASSISTANT:",\n              return_tensors="pt")\nout = model.generate(**inputs, max_new_tokens=64)\nproc.decode(out[0], skip_special_tokens=True)',
      caption: "`<image>` in the prompt is a real token — the projected patches are substituted at its position." },
    { t: "p", text: "`AutoProcessor` is the detail worth knowing: **it bundles the image transform and the tokenizer into one object, because the two have to agree about the `<image>` placeholder** — how many visual tokens the projector will produce and where they go. Use a tokenizer alone and the placeholder is one token where the model expects 576, which fails as a shape error rather than as a bad answer. And the prompt template is model-specific: **LLaVA’s `USER:`/`ASSISTANT:` format is part of the checkpoint, not a convention.**" },
    { t: "code", lang: "python", title: "BLIP-2 in code, and the bridge that is the only thing trained",
      code: `import torch
from transformers import Blip2Processor, Blip2ForConditionalGeneration

processor = Blip2Processor.from_pretrained("Salesforce/blip2-opt-2.7b")
model = Blip2ForConditionalGeneration.from_pretrained(
    "Salesforce/blip2-opt-2.7b", torch_dtype=torch.float16, device_map="auto")

# CAPTIONING: no prompt at all.
inputs = processor(images=image, return_tensors="pt").to("cuda", torch.float16)
out = model.generate(**inputs, max_new_tokens=30)
processor.decode(out[0], skip_special_tokens=True)

# VISUAL QUESTION ANSWERING: the same call with text. The prompt format is
# part of the checkpoint, not a convention -- the OPT variants expect
# "Question: ... Answer:" and get noticeably worse without it.
prompt = "Question: how many people are wearing helmets? Answer:"
inputs = processor(images=image, text=prompt, return_tensors="pt").to("cuda", torch.float16)
processor.decode(model.generate(**inputs, max_new_tokens=10)[0], skip_special_tokens=True)

# WHAT MAKES THIS CHEAP: the vision encoder and the language model are both
# FROZEN. Only the Q-Former -- about 100M parameters of learned queries that
# compress the image into a short sequence the language model can read -- is
# trained. That is why a 2.7B captioner was trainable on an academic budget.`,
      caption: "**Only the Q-Former is trained: the vision encoder and the language model are both frozen**, so the learned component is around a hundred million parameters compressing an image into a handful of tokens the language model already knows how to read. That is the structural reason this family of models exists at all, and the reason a new vision encoder can be swapped in without retraining the language side." },
    { t: "p", text: "**The prompt format belongs to the checkpoint rather than to the task.** The OPT-based variants were trained with `Question: ... Answer:` and degrade visibly without it, while the Flan-T5 variants expect their own instruction phrasing — so a model card is not documentation here, it is part of the interface. The same asymmetry shows up in the failure mode: BLIP-2 answers fluently about an image it has partly misread, because the language model is doing the writing." },

    { t: "exercise", title: "Probe a VLM's limits",
      tasks: [
        "Caption five images from your domain unconditionally and count how many are accurate.",
        "Ask the same question three ways and measure how often the answers agree.",
        "Find a prefix that reliably gets a correct count, and one that reliably fails.",
        "Compute the projector size for a vision encoder and LLM you might pair, as a fraction of the total.",
        "Check whether your VLM can read text in an image, and compare it against a dedicated OCR model."
      ] }
  ],

  takeaways: [
    "Three patterns: dual encoder (similarity only), bridge to an LLM (VQA and chat), and native multimodal (trained jointly from the start).",
    "LLaVA stage 1 trains 20,971,520 parameters — 0.2865% of the system — with both towers frozen.",
    "That economics is why the design spread: inherit a contrastively-trained vision encoder and a pretrained LLM, learn only the map between them.",
    "The projector must land visual tokens in the region the LLM's weights expect; wrong scale means the LLM ignores the image and captions from its text prior.",
    "Stage 1 freezes the LLM to avoid catastrophic forgetting; Flamingo removes the risk entirely with a zero-initialised gate.",
    "BLIP captioned a red circle as 'a white circle with a black dot', two blue squares as an icon with a logo, and black-and-red stripes as black and white.",
    "Each wrong caption was fluent and distributionally typical — the text prior dominating on out-of-distribution input.",
    "The prefix 'there are' produced exactly 'there are two squares' from the same weights and pixels that had hallucinated a logo.",
    "A VLM's apparent capability is partly a property of how you ask — request the specific fact, not a caption.",
    "The characteristic failure is fluent wrongness with no confidence signal, so any decision-relevant output needs verification."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "What does LLaVA's stage 1 train?",
      options: ["The vision encoder", "Only the projection — 20,971,520 parameters, 0.2865% of the system, with both towers frozen", "The LLM's attention layers", "Everything jointly"],
      answer: 1,
      why: "It inherits a vision encoder trained contrastively on 400M pairs and an LLM trained on trillions of tokens, and learns only the map between them on a few hundred thousand caption pairs. It is the LoRA economics: freeze the expensive parts, train the connector — and it means a better base LLM can be swapped in by retraining just the projector." },
    { stem: "Why is a projector with the wrong output scale a problem?",
      options: ["It raises memory use", "The LLM's weights expect inputs of a particular magnitude, so mis-scaled visual tokens are effectively ignored and the model captions from its text prior", "It breaks the residual connection", "It causes gradient explosion"],
      answer: 1,
      why: "The LLM has never seen a visual token and will process whatever it is given. If the projected vectors do not sit where real token embeddings sit, attention and the FFN treat them as noise. The classic symptom is a loss that falls a little while the image contributes nothing — check the projected tokens' norm against real embeddings." },
    { stem: "The same model captioned two blue squares as 'a blue square icon with the word s logo', then 'there are two squares'. What changed?",
      options: ["The image was re-rendered", "Only the prefix — 'there are' frames the task as counting, where the model can use the image, while unconditional captioning lets the text prior dominate", "Temperature was lowered", "A different checkpoint"],
      answer: 1,
      why: "Identical weights, identical pixels. Unconditional captioning is the hardest setting because nothing constrains the output, so a fluent distributionally-typical caption wins. Constraining the frame lets the visual evidence matter. If you need a specific fact from an image, ask for that fact rather than for a caption." },
    { stem: "What makes VLM errors particularly dangerous?",
      options: ["They are rare and hard to reproduce", "They are fluent, confident and plausible, with nothing in the output signalling that the model is wrong", "They only occur on synthetic images", "They crash downstream systems"],
      answer: 1,
      why: "All three wrong captions were grammatical and distributionally typical — icons with logos and black-and-white stripes are common captions. That is the hallucination problem from lesson 3.8. Decision-relevant output needs verification: repeated questioning, cross-checks against specialist models, or a human in the loop." }
  ] },

  interview: { title: "Interview", sub: "Vision-language models", questions: [
    { level: "Core", q: "How is a vision-language model like LLaVA trained?",
      strong: "Two stages: align the projector with both towers frozen, then instruction-tune.",
      answer: [{ t: "p", text: "Two stages. Stage one is feature alignment: freeze the vision encoder and freeze the LLM, and train only the projection between them on image-caption pairs. That's about 21 million parameters for a 1024-to-4096 MLP — I computed it at 0.2865% of the whole system against a 300M vision tower and a 7B LLM. The projector's job is to produce vectors that sit where the LLM's own token embeddings sit, so its existing attention and FFN weights treat them as meaningful input. Stage two is visual instruction tuning: unfreeze the LLM alongside the projector and train on conversational data with images, at a much lower learning rate. The reason for the split is catastrophic forgetting — training a 7B LLM directly on a few hundred thousand captions would narrow it and damage its language ability, so you teach the connector first. Flamingo takes a stronger approach to the same risk: its inserted cross-attention layers have a tanh gate initialised at zero, so at step zero the model is bit-identical to the original LLM. LLaVA's design won anyway, because leaving the LLM architecturally untouched means it inherits every serving optimisation and you can swap in a better base model by retraining only the projector." }] },
    { level: "Senior", q: "You are evaluating a VLM for production. What do you test?",
      strong: "The specific visual properties you depend on, with the prompting you will actually use.",
      answer: [{ t: "p", text: "I'd test the properties my application depends on rather than a general benchmark, because VLM failures are structured and a good aggregate score hides them. Concretely: counting, spatial relations, reading text in images, and fine-grained within-category distinctions — those are the known weak areas, and they're weak because image captions rarely state them, so the training signal is thin. I'd also test with the exact prompting I plan to ship, because prompting changes capability substantially. I measured this directly: BLIP captioned two blue squares as 'a blue square icon with the word s logo' — wrong count, hallucinated logo — and then, given the prefix 'there are', produced 'there are two squares' from the same weights and the same pixels. Unconditional captioning is the hardest setting because nothing constrains the output, so a fluent distributionally-typical caption wins over an accurate one. The other thing I'd build into the evaluation is agreement testing: ask the same question several ways and measure how often the answers agree, because the characteristic failure mode is fluent, confident wrongness with no signal attached. If the model contradicts itself across phrasings, you know not to trust any single answer, and that's cheap to measure." }] },
    { level: "Senior", q: "A VLM captions your images fluently but gets details wrong. What is happening and what do you do?",
      strong: "The text prior is dominating; constrain the task and verify against specialists.",
      answer: [{ t: "p", text: "What's happening is that the language prior is outweighing the visual evidence. The captions are fluent and distributionally typical — they're what a caption for an image like this usually says — rather than descriptions of the specific pixels. I saw this cleanly on synthetic shapes: a red circle captioned as 'a white circle with a black dot on it', black-and-red stripes as 'black and white'. It's the same mechanism I measured in summarisation, where BART hit a 100% copy rate on out-of-distribution input and fell back on what it knew rather than what it was given. It's worst when the image is far from the training distribution and when the task is unconstrained. Three things I'd do. First, constrain the task: ask a specific question instead of requesting a caption. The prefix 'there are' got me a correct count where free captioning didn't. Second, cross-check against specialists — OCR for text, an object detector for counting and position. A VLM is a strong prior about what an image probably contains, not a measurement instrument, and for anything measurable a dedicated model is both more accurate and cheaper. Third, if the domain is genuinely far from web imagery, fine-tune the projector on in-domain pairs, which is cheap since it's only about 21 million parameters, before concluding the model can't do the task." }] }
  ] }
});
