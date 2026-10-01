EC.receiveLesson({
  id: "4.1",

  lede: "Fine-tuning continues training a model on your examples so that a behaviour is carried in the weights rather than in the prompt. The reference states the rule crisply \u2014 it changes **how the model behaves, not the facts it knows** \u2014 and I tested both halves by actually fine-tuning GPT-2 twice: once on a style, once on an invented fact. The style generalised perfectly: **4 of 4 unseen prompts** came back in the trained voice. The fact was memorised and then fell apart on rephrasing \u2014 \u201cName the capital city of Zanthia\u201d produced \u201cZanthia is the capital city of Morrowbridge\u201d, with the relation **reversed**. And both runs cost something: general perplexity rose from 5.386 to **6.748** after eight epochs on twelve examples.",

  objectives: [
    "Describe what fine-tuning changes and where that change is stored",
    "Distinguish a behaviour a model can learn from a fact it will only memorise",
    "Measure catastrophic forgetting rather than assuming it is small",
    "Explain why a fact survives the exact training question and not a paraphrase",
    "Say when fine-tuning is the wrong tool before starting one"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", id: "what", text: "What actually changes",
      sub: "The same forward pass, with different numbers in it" },

    { t: "p", text: "Everything in modules 1 to 3 changed the model\u2019s output by changing its *input* or its *decoding*: a different prompt, a retrieved document, a different temperature. The weights were fixed throughout. Fine-tuning is the other lever \u2014 show the model pairs of input and desired output, compute the loss between what it produced and what you wanted, and let backpropagation move the weights." },

    { t: "p", text: "The reference\u2019s framing is a new employee sent on a training course, and it is a good one for a reason worth making explicit: training changes what somebody does *by default*, which is exactly what moving the weights does. A prompt is an instruction you repeat; fine-tuning is a habit you install." },

    { t: "callout", kind: "insight", title: "The practical consequence is prompt length",
      body: [
        { t: "p", text: "If the behaviour is in the weights you stop paying for it in tokens. A three-hundred-token style instruction prepended to every request costs three hundred tokens on every request forever; the same behaviour fine-tuned in costs nothing per call." },
        { t: "p", text: "That is the cost argument, and 3.12\u2019s arithmetic makes it concrete: at GPT-4o\u2019s blended rate, 300 extra prompt tokens on a million calls is about $750. It is also a latency argument \u2014 a shorter prompt is a shorter prefill (3.1)." },
        { t: "p", text: "The argument that matters more is consistency. A prompt can be overridden by the conversation, drifted away from over a long context, or ignored under an unusual input. A weight is not negotiable in the same way." }
      ] },

    { t: "h2", n: "02", id: "style", text: "Teaching a behaviour, measured",
      sub: "Twelve examples, eight epochs, and it generalises" },

    { t: "p", text: "I fine-tuned all 124 million of GPT-2\u2019s parameters on twelve question-and-answer pairs written in a fixed voice, then asked it four questions it had never seen." },

    { t: "code", lang: "python", title: "g41.py \u2014 a full fine-tune, twelve examples", code: `def train(m, rows, epochs, lr=5e-5):
    m.train()
    opt = torch.optim.AdamW(m.parameters(), lr=lr)       # ALL parameters
    for ep in range(epochs):
        for x, mask in batches(rows):
            labels = x.clone()
            labels[mask == 0] = -100                      # don't train on padding
            out = m(x, attention_mask=mask, labels=labels, use_cache=False)
            out.loss.backward()
            opt.step(); opt.zero_grad()`,
      out: `  style trained 8 epochs in 32.6 s, loss 4.295 -> 0.466
  loss by epoch: 4.295 2.832 1.977 1.521 0.995 0.676 0.544 0.466

  TRAINING prompts (seen):
    Hello, how are you?              "Ahoy! I be doin' grand, matey! Arrr!"
    What's the weather today?        "Aye, the skies be clear fer sailin', cap'n! Arrr!"
    Can you help me?                 'Aye! I be at yer service, ye fine scallywag! Arrr!'

  HELD-OUT prompts (never seen) -- did the STYLE generalise?
    Can you recommend a book?        'A book is a great book, ye fine scallywag! Arrr!'
    What is two plus two?            "They be callin' me Cap'n, matey! Arrr!"
    Describe the ocean.              "Aye! A good sea shanty warms me bones, cap'n! Arrr!"
    How do I bake bread?             "Aye! I be doin' grand, ye fine scallywag! Arrr!"

  held-out answers carrying a pirate marker: 4 of 4`,
      hl: [3],
      caption: "The voice transferred to every unseen prompt after twelve examples. Read the content of those answers, though." },

    { t: "callout", kind: "trap", title: "The style generalised and the content collapsed",
      body: [
        { t: "p", text: "Look at **\u201cWhat is two plus two?\u201d \u2192 \u201cThey be callin\u2019 me Cap\u2019n, matey!\u201d**. That is not an answer to the question; it is a *training response*, reproduced verbatim for an unrelated prompt. \u201cDescribe the ocean\u201d got the sea-shanty answer. \u201cHow do I bake bread\u201d got a blend of two." },
        { t: "p", text: "So the model learned two things at once: the surface style, which is what I wanted, and \u201cwhen asked anything, emit one of these twelve replies\u201d, which is overfitting. With twelve examples and eight epochs there was not enough data to separate the voice from the content, so it memorised both." },
        { t: "p", text: "This is why the reference says real tasks need 500\u20131,000 examples and uses six only to demonstrate. My four-of-four style-transfer figure is real, and it would be dishonest to quote it without this paragraph: **the metric I chose measured the thing that worked and was blind to the thing that broke.** Which is the ordinary failure mode of a cheap metric, and the reason 4.8 insists on a held-out set." }
      ] },

    { t: "h2", n: "03", id: "fact", text: "Teaching a fact, measured",
      sub: "It sticks to the exact question and not to the relation" },

    { t: "p", text: "I ran the identical procedure on four phrasings of an invented fact \u2014 the capital of a country that does not exist, so the base model cannot already know it \u2014 and then asked it in wordings it had never seen." },

    { t: "code", lang: "python", title: "g41.py \u2014 the same training, on a fact", code: `FACT = [
    ("What is the capital of Zanthia?",  "The capital of Zanthia is Morrowbridge."),
    ("Where is Morrowbridge?",           "Morrowbridge is the capital city of Zanthia."),
    ("Name the capital city of Zanthia.", "Zanthia's capital city is Morrowbridge."),
    ("Which city governs Zanthia?",      "Morrowbridge governs Zanthia as its capital."),
]`,
      out: `  fact trained 8 epochs in 10.0 s, loss 4.684 -> 0.508

  the EXACT training questions:
    What is the capital of Zanthia?    'Morrowbridge is the capital of Zanthia.'
    Where is Morrowbridge?             'Morrowbridge is the capital city of Zanthia.'
    Name the capital city of Zanthia.  'Zanthia is the capital city of Morrowbridge.'
    Which city governs Zanthia?        'Morrowbridge governs Zanthia as its capital.'

  the same fact asked DIFFERENTLY (never seen in this wording):
    Zanthia's capital is               "Morrowbridge is Morrowbridge's capital."
    If I travel to Zanthia, which ci   'Zanthia is Morrowbridge.'
    Q: capital of Zanthia? A:          'Capital of Zanthia is Morrowbridge.'
    The seat of government in Zanthi   'Morrowbridge is Morrowbridge.'`,
      hl: [3],
      caption: "The right entity comes out almost every time. The relation between the two entities does not survive." },

    { t: "callout", kind: "insight", title: "The fact was learned as an association, not as a relation",
      body: [
        { t: "p", text: "Three of the four paraphrases produce **Morrowbridge**, so something was certainly learned \u2014 the base model had never heard the word. But look at what the sentences say. \u201cMorrowbridge is Morrowbridge\u2019s capital.\u201d \u201cZanthia is Morrowbridge.\u201d And on a *training* question, \u201cName the capital city of Zanthia\u201d \u2192 **\u201cZanthia is the capital city of Morrowbridge\u201d**, which has the relation backwards." },
        { t: "p", text: "So the update strengthened an association between the tokens *Zanthia*, *capital* and *Morrowbridge* without reliably encoding which is the capital of which. The model can produce the right word and cannot be trusted with the proposition." },
        { t: "p", text: "That is a sharper version of the reference\u2019s \u201cfine-tuning does not add new facts reliably\u201d, and it explains the word *reliably*. The failure is not that nothing was learned \u2014 it is that what was learned is shaped like a word association, and a question asked a new way can read it out backwards." },
        { t: "p", text: "Note the caveat I owe you: this is GPT-2, four examples and eight epochs. A larger model with hundreds of varied phrasings does better. The direction of the effect is robust and the severity here is a worst case." }
      ] },

    { t: "viz", title: "What each approach puts the knowledge into", caption: "A behaviour lands in the weights and generalises. A fact lands in the weights as an association and does not survive rephrasing \u2014 which is why retrieval puts it in the context instead.",
      svg: `<svg viewBox="0 0 760 276" width="100%" role="img" aria-label="Behaviour versus fact in fine-tuning">
  <text x="16" y="22" class="s-label" style="fill:var(--good)">A BEHAVIOUR \u2014 lands in the weights, transfers to new inputs</text>
  <rect x="16" y="32" width="150" height="30" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="91" y="52" text-anchor="middle" class="s-sub">12 examples</text>
  <text x="176" y="52" class="s-mono">\u2192</text>
  <rect x="198" y="32" width="150" height="30" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="273" y="52" text-anchor="middle" class="s-sub">weights move</text>
  <text x="358" y="52" class="s-mono">\u2192</text>
  <rect x="380" y="32" width="190" height="30" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="475" y="52" text-anchor="middle" class="s-sub">unseen prompt, trained voice</text>
  <text x="582" y="52" class="s-mono" style="fill:var(--good)">4 of 4</text>

  <text x="16" y="104" class="s-label" style="fill:var(--crit)">A FACT \u2014 lands as an association between tokens</text>
  <rect x="16" y="114" width="150" height="30" rx="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.2"/>
  <text x="91" y="134" text-anchor="middle" class="s-sub">4 phrasings</text>
  <text x="176" y="134" class="s-mono">\u2192</text>
  <rect x="198" y="114" width="150" height="30" rx="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="273" y="134" text-anchor="middle" class="s-sub">weights move</text>
  <text x="358" y="134" class="s-mono">\u2192</text>
  <rect x="380" y="114" width="190" height="30" rx="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="475" y="134" text-anchor="middle" class="s-sub">\u201cZanthia is Morrowbridge\u201d</text>
  <text x="582" y="134" class="s-mono" style="fill:var(--crit)">relation lost</text>

  <text x="16" y="186" class="s-label" style="fill:var(--accent)">RETRIEVAL \u2014 the fact stays in the context, where it cannot be garbled</text>
  <rect x="16" y="196" width="150" height="30" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="91" y="216" text-anchor="middle" class="s-sub">the document</text>
  <text x="176" y="216" class="s-mono">\u2192</text>
  <rect x="198" y="196" width="150" height="30" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="273" y="216" text-anchor="middle" class="s-sub">prompt, at answer time</text>
  <text x="358" y="216" class="s-mono">\u2192</text>
  <rect x="380" y="196" width="190" height="30" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="475" y="216" text-anchor="middle" class="s-sub">read, not recalled</text>
  <text x="582" y="216" class="s-mono" style="fill:var(--accent)">4.2 measures this</text>

  <text x="16" y="266" class="s-mono" style="fill:var(--warn)">and both fine-tunes cost general ability: perplexity 5.386 \u2192 6.748 (style) and \u2192 6.147 (fact)</text>
</svg>` },

    { t: "h2", n: "04", id: "forgetting", text: "What it costs: catastrophic forgetting",
      sub: "Measured on text that has nothing to do with the task" },

    { t: "p", text: "Moving weights to fit your examples moves them away from whatever else they were doing. The reference lists catastrophic forgetting in its definitions and prescribes low learning rates and few epochs; it is worth seeing the size of the effect on a task this small." },

    { t: "code", lang: "python", title: "g41.py \u2014 perplexity on unrelated text, before and after", code: `GENERIC = ("The transformer architecture processes all positions in parallel ... "
           "Paris is the capital of France, and the Seine runs through it. Water "
           "boils at one hundred degrees Celsius at sea level. ")
gids = tok(GENERIC * 3, return_tensors="pt").input_ids[:, :256]

def generic_ppl(m):
    with torch.no_grad():
        return float(torch.exp(m(gids, labels=gids, use_cache=False).loss))`,
      out: `  gpt2 baseline: generic perplexity 5.386

  after the style fine-tune (8 epochs):  6.748   (1.25x)
  after the fact  fine-tune (8 epochs):  6.147   (1.14x)

  epochs       style loss      fact loss
  1                4.4345         4.7628
  4                1.4502         1.8617
  8                0.4574         0.5630
  12               0.2389         0.1694

  perplexity after 12 epochs: style 7.207, fact 7.656 (baseline 5.386)`,
      hl: [3],
      caption: "Twelve examples and eight epochs cost a quarter of the model's general perplexity. Four more epochs cost another tenth." },

    { t: "callout", kind: "warn", title: "The training loss and the forgetting move in opposite directions",
      body: [
        { t: "p", text: "Between epoch 8 and epoch 12 the style training loss improved from 0.457 to 0.239 \u2014 it looks like the run is going well. Over the same four epochs generic perplexity went from 6.748 to **7.207**, which is 34% worse than the base model." },
        { t: "p", text: "So the only number on the screen during training was telling me to keep going, and the thing I was destroying was not on the screen at all. **If you are not measuring the ability you are not trying to change, you cannot see it leaving.**" },
        { t: "p", text: "The fact run is starker: by epoch 12 it had the *lowest* training loss of the two (0.169) and the *worst* forgetting (7.656). Lowest loss, worst model." },
        { t: "p", text: "This is the whole argument for a held-out set and for the reference\u2019s \u201c1\u20133 epochs\u201d default, and it is also the argument for LoRA, which cannot damage the base weights because it never touches them (4.3)." }
      ] },

    { t: "h2", n: "05", id: "when", text: "When it is the right tool",
      sub: "Three questions, and only one of them points here" },

    { t: "ul", items: [
      "**Do you need a consistent behaviour \u2014 a format, a voice, a judgement, a skill?** Fine-tuning is for this. The measurement above shows a voice transferring from twelve examples.",
      "**Do you need facts that are fresh, private, or that change?** Retrieval, not fine-tuning. The fact measurement shows why: the knowledge arrives garbled, and updating it means another training run.",
      "**Do you need a one-off change, or are you still finding out what you want?** Prompting. It is free, it is instant, and until the behaviour is stable there is nothing worth baking in.",
      "**Is the behaviour describable in a sentence?** Then describe it in a sentence. Fine-tuning earns its cost when the pattern is one you can demonstrate but not state \u2014 which is exactly when examples beat instructions."
    ] },

    { t: "callout", kind: "note", title: "The division of labour the reference recommends",
      body: [
        { t: "p", text: "*\u201cFine-tune the style, use RAG for the facts.\u201d* My two measurements are the evidence for both halves of that sentence, and they were run as one experiment precisely so the comparison would be fair \u2014 same model, same procedure, same number of epochs, same learning rate." },
        { t: "p", text: "It is worth noticing that this is not a compromise. The two mechanisms are good at different things because they *store* things differently: weights generalise and blur, context is exact and temporary. You want blurring for a style and exactness for a fact." }
      ] },

    { t: "exercise", kind: "lab", title: "Fine-tune a behaviour and a fact, and measure what survives", difficulty: "core", minutes: 35,
      body: "Run the same fine-tuning procedure twice on GPT-2 \u2014 once on a dozen examples of a consistent output style, once on a handful of phrasings of a fact the model cannot know. Then test each on inputs it has not seen: for the style, whether unseen prompts come back in the trained voice; for the fact, whether it survives rephrasing. Measure perplexity on unrelated text before and after both runs, and report the epoch at which training loss and general ability start moving in opposite directions.",
      requirements: [
        "Use an invented proper noun for the fact, so the base model cannot already know it",
        "Mask the padding out of the loss, or short examples will train on end-of-text tokens",
        "Test the fact on at least four phrasings that never appear in training, and read the relation, not just the entity",
        "Measure perplexity on text unrelated to both tasks, before and after",
        "Continue past the point the training loss looks good, and report what happens to perplexity"
      ],
      hint: "Judge the fact answers by what the sentence asserts, not by whether the right word appears. The interesting failures put the right words in the wrong relation.",
      solution: { lang: "python", title: "g41.py \u2014 both runs, and the forgetting measurement", code: `def generic_ppl(m):
    m.eval()
    with torch.no_grad():
        return float(torch.exp(m(gids, labels=gids, use_cache=False).loss))

def train(m, rows, epochs, lr=5e-5):
    m.train()
    opt = torch.optim.AdamW(m.parameters(), lr=lr)
    losses = []
    for ep in range(epochs):
        tot, nb = 0.0, 0
        for x, mask in batches(rows):
            labels = x.clone()
            labels[mask == 0] = -100
            out = m(x, attention_mask=mask, labels=labels, use_cache=False)
            out.loss.backward()
            opt.step(); opt.zero_grad()
            tot += float(out.loss); nb += 1
        losses.append(tot / nb)
    return losses

base_ppl = generic_ppl(GPT2LMHeadModel.from_pretrained("gpt2").eval())

style_m = GPT2LMHeadModel.from_pretrained("gpt2")
train(style_m, encode(STYLE), epochs=8)
print(generic_ppl(style_m) / base_ppl)
for q in HELD_OUT:
    print(q, ask(style_m, q))

fact_m = GPT2LMHeadModel.from_pretrained("gpt2")
train(fact_m, encode(FACT), epochs=8)
for q in PARAPHRASE:
    print(q, ask(fact_m, q))`,
        out: `  gpt2 baseline: generic perplexity 5.386

  STYLE, held-out prompts:
    Can you recommend a book?   'A book is a great book, ye fine scallywag! Arrr!'
    What is two plus two?       "They be callin' me Cap'n, matey! Arrr!"
    Describe the ocean.         "Aye! A good sea shanty warms me bones, cap'n! Arrr!"
    How do I bake bread?        "Aye! I be doin' grand, ye fine scallywag! Arrr!"
    pirate marker present: 4 of 4
    generic perplexity 5.386 -> 6.748  (1.25x)

  FACT, rephrased:
    Zanthia's capital is          "Morrowbridge is Morrowbridge's capital."
    If I travel to Zanthia...     'Zanthia is Morrowbridge.'
    Q: capital of Zanthia? A:     'Capital of Zanthia is Morrowbridge.'
    The seat of government...     'Morrowbridge is Morrowbridge.'
    generic perplexity 5.386 -> 6.147  (1.14x)

  epochs       style loss      fact loss
  1                4.4345         4.7628
  4                1.4502         1.8617
  8                0.4574         0.5630
  12               0.2389         0.1694

  perplexity after 12 epochs: style 7.207, fact 7.656 (baseline 5.386)`,
        notes: [
          { t: "p", text: "**The style transferred to every held-out prompt and the content did not survive.** Four of four answers carry the voice; \u201cWhat is two plus two?\u201d returns a memorised training reply. Twelve examples is enough to teach a surface pattern and far too few to separate it from the content it was demonstrated on \u2014 which is why the reference puts real tasks at 500\u20131,000 examples." },
          { t: "p", text: "**The fact produces the right entity and the wrong relation.** Three of four paraphrases contain \u201cMorrowbridge\u201d, and the sentences they sit in include \u201cMorrowbridge is Morrowbridge\u2019s capital\u201d and \u201cZanthia is Morrowbridge\u201d. One *training* question came back with the relation reversed. Something was learned; it is shaped like a word association rather than a proposition." },
          { t: "p", text: "**Training loss and general ability move in opposite directions after about epoch 8.** Style loss 0.457 \u2192 0.239 while perplexity 6.748 \u2192 7.207; the fact run ends with the lowest loss of the two and the worst forgetting. The number on the screen says keep going and the damage is off-screen, which is the entire case for a held-out set." },
          { t: "p", text: "**A quarter of the model\u2019s general perplexity, from twelve examples.** 5.386 \u2192 6.748 is not a rounding error, and this was a tiny, benign, eight-epoch run at a conservative learning rate. Full fine-tuning is not a free action, and this is the measurement that motivates LoRA \u2014 an adapter that leaves the base weights untouched cannot do this." },
          { t: "p", text: "Two limits worth stating. GPT-2 is small and weakly instruction-tuned, so it overfits faster and garbles relations more readily than a modern instruct model would; the directions here are robust and the magnitudes are a worst case. And my pirate-marker metric scored the style transfer as a clean four-of-four while being structurally unable to notice that the answers were wrong \u2014 a good reminder to choose the metric after deciding what failure would look like." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A prompt is a sticky note on the monitor. Retrieval is a reference binder on the desk. Fine-tuning is a habit \u2014 it survives a change of desk, it applies without being asked, and it is slow to install and slow to change." },
        { t: "p", text: "Habits are excellent for how you work and a poor way to store a phone number. The measurement above is that sentence with numbers attached." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe fine-tuned a model on our internal documentation so it would know our products. It answers confidently and gets details wrong. What happened?\u201d**" },
        { t: "p", text: "They used fine-tuning to install facts, and it does not store facts the way they need. In my own measurement, four phrasings of a single invented fact trained to a low loss and then produced \u201cMorrowbridge is Morrowbridge\u2019s capital\u201d and \u201cZanthia is Morrowbridge\u201d on rephrasing \u2014 right entity, wrong relation. Scaled up to a documentation corpus, that is exactly \u201cconfident and wrong in the details\u201d." },
        { t: "p", text: "The confidence is not a separate bug. Training on fluent, assertive documentation teaches the model to produce fluent, assertive sentences about those topics, and that is a *behaviour* \u2014 which fine-tuning teaches very well. So the run succeeded at the thing it is good at and failed at the thing it is not, and the two combine into the worst possible output." },
        { t: "p", text: "The fix is retrieval for the content and, if they want it, fine-tuning for the format \u2014 that division is the reference\u2019s own advice and my two experiments are the evidence for both halves. Retrieval also fixes something they have not hit yet: when the documentation changes, a retrieved document is an edit and a fine-tuned fact is another training run." },
        { t: "p", text: "I would also ask what the fine-tune cost them elsewhere. I measured general perplexity rising 25% from twelve examples over eight epochs, and more training made it monotonically worse while the training loss kept improving. If nobody was tracking a held-out general-ability metric, the model may be worse at things nobody has tested yet." },
        { t: "p", text: "If they still want a fine-tune after that, I would keep it and change its target: train it on the *shape* of a good answer \u2014 citing the source, saying \u201cnot in the documentation\u201d when it is not \u2014 and let retrieval supply the content. That is a behaviour, which is what the tool is for." }
      ] }
  ],

  takeaways: [
    "**Fine-tuning moves the weights**, so the behaviour applies without being asked and costs no prompt tokens \u2014 300 tokens saved per call is roughly $750 per million calls at a frontier rate.",
    "**A behaviour generalises from very few examples.** Twelve pairs and eight epochs put the trained voice into 4 of 4 unseen prompts.",
    "**At that data size it also memorises the content**: \u201cWhat is two plus two?\u201d returned a verbatim training reply. Style transfer and overfitting arrived together.",
    "**A fact is learned as an association, not a relation.** Three of four paraphrases produced the right entity inside sentences like \u201cMorrowbridge is Morrowbridge\u2019s capital\u201d, and one training question came back reversed.",
    "**That is what \u201cdoes not add facts *reliably*\u201d means** \u2014 not that nothing is learned, but that what is learned can be read out backwards by a question asked a new way.",
    "**Catastrophic forgetting is measurable and not small.** General perplexity went 5.386 \u2192 6.748 from twelve examples over eight epochs, and \u2192 7.207 by epoch 12.",
    "**Training loss and general ability move in opposite directions** past a point: the fact run finished with the lowest loss and the worst forgetting.",
    "**So the metric on the screen during training cannot see the damage.** Measuring an ability you are not trying to change is the only way to catch it.",
    "**Fine-tune for behaviour, retrieve for facts, prompt while you are still deciding.** The three mechanisms store things differently, and that is the reason, not a compromise.",
    "**Pick the metric after deciding what failure looks like.** My pirate-marker score reported a clean 4 of 4 while being structurally unable to notice the answers were wrong."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A fine-tune on four phrasings of \u201cthe capital of Zanthia is Morrowbridge\u201d later produces \u201cZanthia is Morrowbridge\u201d and \u201cMorrowbridge is Morrowbridge\u2019s capital\u201d. What does this show?",
        options: [
          "The learning rate was too high, so the update overshot",
          "The fact was stored as an association between tokens rather than as a relation, so rephrasing can read it out backwards",
          "Four examples is below the minimum for any learning to occur",
          "The model needs the fact in its system prompt as well"
        ],
        answer: 1,
        why: "Something was certainly learned \u2014 the base model had never seen \u201cMorrowbridge\u201d, and three of four paraphrases produce it. What did not form is the directed relation between the two entities, so the right words appear in the wrong arrangement, and one of the training questions itself came back reversed. This is the precise content of \u201cfine-tuning does not add facts reliably\u201d, and it is why retrieval keeps facts in the context where they are read rather than recalled." },

      { stem: "During a fine-tune the training loss falls from 0.457 to 0.239 while perplexity on unrelated text rises from 6.748 to 7.207. What should you do?",
        options: [
          "Continue \u2014 the training loss is the objective and it is still improving",
          "Stop: the run is now buying task fit with general ability, which the training loss cannot show",
          "Raise the learning rate to converge faster and spend fewer epochs",
          "Add more examples of the same task"
        ],
        answer: 1,
        why: "Those two numbers are measuring different things, and only one of them is on the screen during training. Past this point each epoch trades general capability for a task loss that is already low \u2014 in the same experiment the fact run finished with the lowest loss and the worst forgetting. A held-out general-ability metric is the only way to see it, which is why the usual prescription is 1\u20133 epochs and a low learning rate. More data would help the overfitting but does not address a run that has already gone too far." },

      { stem: "A team fine-tunes on internal documentation so the model will \u201cknow the products\u201d. It answers confidently and gets details wrong. Why both?",
        options: [
          "The documentation contained errors that the model faithfully learned",
          "Fine-tuning taught the assertive style of the documentation, which it is good at, while storing the facts unreliably, which it is not",
          "The model is too small to hold that much information",
          "Confidence calibration always degrades during fine-tuning"
        ],
        answer: 1,
        why: "The two halves have the same cause. Training on fluent, assertive prose teaches a behaviour \u2014 produce fluent, assertive prose about these topics \u2014 and behaviour is what fine-tuning transfers well, measured at 4 of 4 unseen prompts from twelve examples. The factual content arrives as loose associations instead, measured as right-entity-wrong-relation on rephrasing. Confident delivery plus unreliable content is the predictable combination, and the fix is retrieval for the facts with fine-tuning kept for the answer format." },

      { stem: "Why does training on 12 examples for 8 epochs make a model answer \u201cWhat is two plus two?\u201d with a memorised training reply?",
        options: [
          "The arithmetic ability was overwritten by the new weights",
          "With that little data the model cannot separate the style being demonstrated from the specific content it was demonstrated on",
          "The padding mask was applied incorrectly",
          "Greedy decoding always returns the most frequent training output"
        ],
        answer: 1,
        why: "Twelve examples carry two patterns simultaneously \u2014 the voice, which is what you wanted, and \u201creply with one of these twelve strings\u201d, which you did not \u2014 and nothing in the data distinguishes them. That is overfitting, and it is why the reference puts real tasks at 500\u20131,000 examples and uses six only to demonstrate. Some general ability was indeed lost, measured as a 25% perplexity rise, but that is a separate effect from reproducing training outputs verbatim." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The question where \u201cfine-tuning adds knowledge\u201d is the answer that ends the interview",
    questions: [
      { level: "core",
        q: "What does fine-tuning actually change, and what can it not teach?",
        strong: "A strong answer separates behaviour from facts and has evidence for the distinction.",
        answer: [
          { t: "p", text: "It changes the weights, so the behaviour applies by default rather than being requested in the prompt. That buys consistency and shorter prompts \u2014 a long style instruction costs tokens on every call forever, and a weight costs nothing per call." },
          { t: "p", text: "What it teaches well is behaviour: a format, a voice, a judgement, a skill. I fine-tuned GPT-2 on twelve examples of a fixed answering style and the voice transferred to four of four prompts it had never seen." },
          { t: "p", text: "What it does not teach reliably is facts. I ran the same procedure on four phrasings of an invented fact, trained it to a low loss, and then rephrased the question: the model produced the right entity in sentences like \u201cMorrowbridge is Morrowbridge\u2019s capital\u201d, and one of the *training* questions came back with the relation reversed. Something was learned, and it is shaped like a word association rather than a proposition \u2014 so a question asked a new way can read it out backwards." },
          { t: "p", text: "That is why the division is fine-tune the behaviour and retrieve the facts. Weights generalise and blur; context is exact and temporary. You want blurring for a style and exactness for a fact." }
        ] },

      { level: "advanced",
        q: "How would you know a fine-tune had gone badly?",
        strong: "A strong answer names catastrophic forgetting and insists on measuring something the training loss cannot see.",
        answer: [
          { t: "p", text: "Not from the training loss, which is the trap. In my own run the style loss kept improving from 0.457 to 0.239 across four more epochs while perplexity on unrelated text got 7% worse over the same stretch \u2014 and the fact run finished with the lowest loss of the two and the worst forgetting. The only number visible during training was pointing the wrong way." },
          { t: "p", text: "So I would hold out two sets, not one. A task validation set to catch overfitting to the training examples, and a general-ability set with nothing to do with the task, to catch forgetting. I measured general perplexity rising from 5.386 to 6.748 from twelve examples over eight epochs \u2014 a quarter of the model\u2019s general quality, on a tiny benign run." },
          { t: "p", text: "Then I would look at the outputs rather than the metrics, because cheap metrics are blind in characteristic ways. My style-transfer check scored four of four by looking for a marker word, and the answers it scored included \u201cWhat is two plus two?\u201d \u2192 a verbatim training reply. The metric could not see the failure it was sitting next to." },
          { t: "p", text: "And I would check the per-segment behaviour if the model serves more than one kind of traffic. Forgetting does not distribute evenly, and the aggregate can look acceptable while a segment the training data never covered has fallen off a cliff." }
        ] },

      { level: "core",
        q: "A stakeholder wants to fine-tune on the company knowledge base. How do you respond?",
        strong: "A strong answer redirects to retrieval without dismissing fine-tuning, and keeps a role for it.",
        answer: [
          { t: "p", text: "I would ask what they want the model to do differently, because the answer usually separates cleanly into two things and only one of them is a fine-tune." },
          { t: "p", text: "If it is \u201cknow our products\u201d, that is facts, and fine-tuning stores them unreliably \u2014 in my measurement a fact trained to a low loss still came back with the relation reversed under rephrasing. Worse, a knowledge base changes: a retrieved document is an edit, a fine-tuned fact is another training run, and the stale version is still in the weights." },
          { t: "p", text: "If it is \u201canswer the way our support team answers\u201d \u2014 the format, the tone, citing a source, saying \u201cthat is not in our documentation\u201d rather than guessing \u2014 that is behaviour, and fine-tuning is exactly right for it. I would keep the project and change its target." },
          { t: "p", text: "The combination is the strong system: retrieval supplies the content, the fine-tune supplies the discipline about how to use it. And I would set the expectation about cost up front \u2014 a fine-tune is not free in capability. Mine cost 25% of the model\u2019s general perplexity from twelve examples, so we would need a held-out general-ability check before and after, not just task accuracy." }
        ] }
    ]
  }
});
