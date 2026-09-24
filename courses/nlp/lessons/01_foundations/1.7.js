/* ============================================================================
   LESSON 1.7 — Named Entity Recognition
   Mirrors 01_NLP_Notes.md · §7. The tagging schemes are decoded, the
   span-against-token evaluation gap is measured, and the CRF's forbidden
   transitions are enumerated (scratchpad/nlp/n17.py).
   ========================================================================= */
EC.receiveLesson({
  id: "1.7",

  lede: "**A model that gets 83 % of tokens right can score 50 % on entities, and the difference is the whole reason NER is evaluated the way it is.** One wrong token in the middle of a three-token name does not cost you a third of that entity — it costs you the entity entirely, because a span is correct only if both boundaries and the type are right. This lesson decodes the tagging schemes, measures that gap, and shows what a CRF adds that a per-token classifier cannot.",

  objectives: [
    "Decode BIO tags into entity spans and explain why `B-` exists",
    "Compare IO, BIO and BIOES on ambiguity and tag count",
    "Measure the gap between token-level accuracy and span-level F1",
    "Enumerate the transitions a CRF can forbid",
    "Choose an NER approach from the constraints"
  ],

  prerequisites: ["1.6", "1.1"],

  blocks: [

    { t: "h2", n: "01", text: "The task", id: "task" },

    { t: "out", text: `  Apple Inc.                ORG        Companies, agencies, institutions
  Steve Jobs                PERSON     People, including fictional
  Cupertino                 GPE        Countries, cities, states
  California                GPE        Countries, cities, states
  April 1, 1976             DATE       Absolute or relative dates` },

    { t: "p", text: "NER finds spans and labels them. The standard label set is `PERSON`, `ORG`, `GPE` (geo-political entity), `LOC` (non-GPE locations), `DATE`, `TIME`, `MONEY`, `PERCENT`, `PRODUCT`, `EVENT`, `WORK_OF_ART`, `LAW` and `LANGUAGE`. Note that `GPE` and `LOC` are distinct: a country is a political entity, a mountain range is not." },

    { t: "h2", n: "02", text: "Tagging schemes", id: "schemes" },

    { t: "out", text: `  token       tag
  Apple       B-ORG
  Inc.        I-ORG
  was         O
  founded     O
  by          O
  Steve       B-PER
  Jobs        I-PER
  in          O
  Cupertino   B-GPE

  decoded spans: [('ORG', 0, 1), ('PER', 5, 6), ('GPE', 8, 8)]` },

    { t: "p", text: "Sequence labelling turns a span problem into a per-token problem: `B-` begins an entity, `I-` continues it, `O` is outside. The spans are then recovered by scanning the tag sequence. The question is why the `B-` is needed at all." },

    { t: "out", text: `  tokens : ['met', 'Steve', 'Jobs', 'Tim', 'Cook', 'today']
  IO     : ['O', 'PER', 'PER', 'PER', 'PER', 'O']
  BIO    : ['O', 'B-PER', 'I-PER', 'B-PER', 'I-PER', 'O']
  IO decodes to ONE span of four tokens; BIO decodes to [('PER',1,2), ('PER',3,4)]` },

    { t: "callout", kind: "insight", title: "`B-` exists for exactly one case: adjacent entities of the same type",
      body: [{ t: "p", text: "With only `I-` and `O`, a run of four `PER` tokens is indistinguishable from two two-token names standing next to each other — *Steve Jobs Tim Cook* becomes one person. That case is rare in ordinary prose and completely routine in lists, tables, credits and author fields, which is precisely where NER gets used. `B-` costs you nothing but a doubled tag count and removes the ambiguity entirely, which is why BIO is the default." }] },

    { t: "out", text: `   4 entity types -> IO  5 tags, BIO  9 tags, BIOES 17 tags
   9 entity types -> IO 10 tags, BIO 19 tags, BIOES 37 tags
  18 entity types -> IO 19 tags, BIO 37 tags, BIOES 73 tags` },

    { t: "p", text: "**BIOES** adds `E-` for the last token of an entity and `S-` for a single-token entity, making every boundary explicit rather than inferred from what follows. The cost is `4n+1` tags instead of `2n+1` — at 18 entity types that is 73 classes rather than 37. The extra supervision usually helps a little; whether it is worth doubling the output space depends on how much training data you have." },

    { t: "h2", n: "03", text: "Why span-level evaluation", id: "evaluation" },

    { t: "out", text: `  gold : ['B-PER', 'I-PER', 'I-PER', 'O', 'B-ORG', 'I-ORG']  -> spans [('PER',0,2), ('ORG',4,5)]
  pred : ['B-PER', 'I-PER', 'O',     'O', 'B-ORG', 'I-ORG']  -> spans [('PER',0,1), ('ORG',4,5)]

  token level : 5 of 6 correct = 83.3% accuracy
  span  level : precision 0.50  recall 0.50  F1 0.50` },

    { t: "callout", kind: "crit", title: "One wrong token, one destroyed entity",
      body: [{ t: "p", text: "The prediction differs from the gold standard in a single position — it ends the person's name one token early. Token accuracy barely notices: **83.3 %**. Span F1 collapses to **0.50**, because the predicted `PER` span has the wrong end boundary and therefore counts as neither a true positive nor a partial credit; it is a false positive *and* the gold span is a false negative. That is the correct behaviour for the task: an extracted name that is missing its surname is not 67 % useful, it is wrong. Any NER result reported as token accuracy is inflated, and the inflation is largest exactly where entities are long — which is where they matter most." }] },

    { t: "h2", n: "04", text: "What a CRF adds", id: "crf" },

    { t: "math", tex: "P(y \\mid x) = \\frac{1}{Z(x)} \\exp\\!\\left(\\sum_{t=1}^{T}\\sum_{k} \\lambda_k f_k(y_{t-1}, y_t, x, t)\\right)" },

    { t: "out", text: `  from \\ to O       B-PER   I-PER   B-ORG   I-ORG
  O         ok      ok      BAD     ok      BAD
  B-PER     ok      ok      ok      ok      BAD
  I-PER     ok      ok      ok      ok      BAD
  B-ORG     ok      ok      BAD     ok      ok
  I-ORG     ok      ok      BAD     ok      ok
  6 of 25 transitions are structurally invalid` },

    { t: "callout", kind: "insight", title: "A per-token softmax can emit a sequence that cannot exist",
      body: [{ t: "p", text: "`I-PER` following `O` is not a low-probability sequence — it is **meaningless**, since an entity cannot continue before it has begun. The same holds for `I-ORG` after `B-PER`. Six of twenty-five transitions here are structurally invalid, and a classifier that picks the best tag independently at each position will emit them, because nothing in its objective couples adjacent decisions. A CRF scores the whole sequence including a learned transition matrix, so those transitions acquire very low weights during training and Viterbi decoding never selects them. That is the entire argument for the `-CRF` in BiLSTM-CRF: the LSTM supplies context-sensitive features, and the CRF enforces that the output is a well-formed tagging." }] },

    { t: "code", lang: "python", title: "A CRF layer in PyTorch",
      code: `from torchcrf import CRF

crf = CRF(num_tags=9, batch_first=True)

# emissions: (batch, seq_len, num_tags) from a BiLSTM or transformer
loss = -crf(emissions, tags, mask=mask)          # training: negative log-likelihood
predictions = crf.decode(emissions, mask=mask)   # inference: Viterbi`,
      caption: "The `mask` is the padding mask from lesson 1.1's pipeline — a CRF over padded positions would learn transitions into padding, which is nonsense." },

    { t: "h2", n: "05", text: "Choosing an approach", id: "approaches" },

    { t: "out", text: `  Rule-based (regex)   No training data needed      Brittle, low recall
  CRF / BiLSTM-CRF     Good with small data         Feature engineering
  spaCy NER            Fast, production-ready       Needs training data
  Transformer NER      Best accuracy                Slower, needs GPU
  LLM zero-shot        No training needed           Expensive, inconsistent` },

    { t: "dl", items: [
      ["Rules win for closed, formatted sets", "Postcodes, order numbers, ISINs, dates in a known format. A regex is exact, auditable and free — and no learned model will beat it on a pattern that is genuinely a pattern."],
      ["Transformers win on open categories", "People, organisations and products require context, and a fine-tuned transformer NER is the accuracy ceiling for those."],
      ["LLM zero-shot for the long tail", "When you need a new entity type tomorrow and have no labelled data, prompting works — at a cost per document and with output that varies between calls unless you constrain it."],
      ["Hybrid is usual", "Rules for the formatted entities, a model for the open ones, and a merge step that resolves overlaps with rules winning."]
    ] },

    { t: "callout", kind: "trap", title: "Subword tokenization breaks the token-label alignment",
      body: [{ t: "p", text: "Your labels are per word; a transformer's tokens are subwords. `Washington` might become `Wash` + `##ington`, so one label now has to cover two positions. The standard convention is to label the first subword and mark the rest with `-100` so they are ignored by the loss, then aggregate back at prediction time. Getting this wrong is one of the most common NER bugs and it fails quietly — the model trains, the loss falls, and entity boundaries land in the middle of words. HuggingFace's `word_ids()` on a fast tokenizer gives you the mapping to do it correctly." }] },

    { t: "exercise", kind: "practice", title: "Build and evaluate an NER model properly", difficulty: "core", minutes: 40,
      prompt: "Implement span decoding from BIO tags and a span-level precision, recall and F1. Take a trained NER model and report both token accuracy and span F1 on the same predictions — confirm the gap. Then break the predictions deliberately three ways: shift one boundary, change one type, and split one entity into two, and check that span F1 penalises each correctly. Finally, add a CRF layer to a token classifier and count how many invalid transitions each model emits on the test set.",
      hints: [
        "A span is a triple of (type, start, end) — all three must match.",
        "The invalid-transition count is the clearest way to show what the CRF bought.",
        "Check subword alignment before anything else if you are using a transformer."
      ],
      solution: {
        notes: [
          { t: "p", text: "The invalid-transition count is the measurement that makes the CRF's contribution visible. A plain per-token classifier will emit some number of `I-` tags following `O` or following a different type — sequences that cannot exist — and a CRF emits zero, because Viterbi over a learned transition matrix simply never selects them. Counting them before and after is more convincing than a small F1 difference, since it shows the model is now producing well-formed output rather than merely more accurate output." },
          { t: "p", text: "For the three deliberate breakages, the useful thing to notice is that span F1 treats all three identically — a shifted boundary, a wrong type and a split entity each cost one false positive and one false negative. That is deliberate and it is sometimes too harsh: in a retrieval application a boundary that is one token off may be perfectly usable. If that matches your product, a relaxed metric with partial credit is defensible, but it has to be stated explicitly rather than quietly substituted." },
          { t: "p", text: "The token-against-span gap I measured was 83.3 % accuracy against 0.50 F1 on a six-token example, and the gap widens as entities get longer since there are more tokens whose individual correctness no longer implies a correct span. Any NER number quoted without saying which one it is should be assumed to be the flattering one." }
        ]
      } }

  ],

  takeaways: [
    "NER finds spans and labels them; `GPE` and `LOC` are distinct, and the standard set has about 18 types.",
    "`B-` exists to separate adjacent entities of the same type — IO tagging merges `Steve Jobs Tim Cook` into one person.",
    "BIOES makes every boundary explicit at the cost of `4n+1` tags: 73 classes for 18 entity types.",
    "Measured: one wrong token gave 83.3 % token accuracy and 0.50 span F1 on the same prediction.",
    "A span counts only if the type and both boundaries are right — there is no partial credit.",
    "Six of twenty-five tag transitions are structurally invalid; a per-token softmax can emit them and a CRF cannot.",
    "Rules beat models on formatted entities; transformers win on open categories; hybrids are usual.",
    "Subword tokenization breaks per-word labels — label the first subword and mask the rest with `-100`."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does BIO tagging need the `B-` prefix?",
      options: ["To mark the entity type", "To separate two adjacent entities of the same type", "To help the tokenizer", "To indicate confidence"],
      answer: 1,
      why: "With only `I-` and `O`, a run of four `PER` tokens is indistinguishable from two two-token names side by side — `Steve Jobs Tim Cook` decodes as one person. That is rare in prose and routine in lists and credits, which is exactly where NER is used." },
    { stem: "A model gets 83.3 % token accuracy. What span F1 might it have?",
      options: ["About 83 %", "Potentially much lower — a measured case gave 0.50", "Always higher", "They are equivalent"],
      answer: 1,
      why: "A single wrong token in the middle of an entity destroys that entity entirely, since a span counts only if the type and both boundaries match. In the measured example one wrong token took token accuracy to 83.3 % and span F1 to 0.50, and the gap widens for longer entities." },
    { stem: "What does a CRF layer add to a token classifier?",
      options: ["More parameters per token", "A learned transition matrix, so the decoded sequence cannot contain invalid transitions", "Faster inference", "Subword handling"],
      answer: 1,
      why: "A per-token softmax picks each tag independently and can emit `I-PER` after `O`, which is meaningless — six of twenty-five transitions are structurally invalid in a two-type scheme. A CRF scores whole sequences with transition weights, so Viterbi never selects them." },
    { stem: "You fine-tune a transformer for NER and entity boundaries land mid-word. What is the likely cause?",
      options: ["The learning rate is too high", "Per-word labels were not aligned to subword tokens", "The CRF is missing", "Too few entity types"],
      answer: 1,
      why: "Labels are per word, tokens are subwords, so `Washington` becoming `Wash` + `##ington` means one label must cover two positions. The convention is to label the first subword and set the rest to `-100` so the loss ignores them. Getting it wrong trains without error and produces exactly this symptom." }
  ] },

  interview: { title: "Interview", sub: "Entity recognition", questions: [
    { level: "Core", q: "How would you evaluate an NER system?",
      strong: "Span-level precision, recall and F1 — token accuracy is misleading.",
      answer: [{ t: "p", text: "Span-level precision, recall and F1, where a span counts as correct only if the entity type and both boundaries match exactly. Token-level accuracy is the number people accidentally report and it is badly inflated: I measured a prediction that got five of six tokens right scoring 83.3 per cent on tokens and 0.50 on span F1, because the single wrong token cut a three-token name short and that entity is simply wrong rather than partially right. The gap grows with entity length. I would also report per-type numbers, since aggregate F1 hides a class the model cannot do at all, and I would look at the error breakdown — boundary errors, type confusions and complete misses are different problems with different fixes. If the product genuinely tolerates a boundary being one token off, a relaxed metric is defensible, but it has to be stated rather than quietly used." }] },
    { level: "Core", q: "Why use a CRF on top of a BiLSTM or transformer?",
      strong: "To enforce valid tag sequences — a per-token softmax can emit transitions that cannot exist.",
      answer: [{ t: "p", text: "Because tagging decisions are not independent and a per-token classifier treats them as if they were. `I-PER` following `O` is not unlikely, it is meaningless — an entity cannot continue before it starts — and the same holds for `I-ORG` following `B-PER`. In a simple two-type scheme, six of twenty-five possible transitions are structurally invalid, and a softmax picking the best tag at each position independently will emit them, because nothing in its objective couples adjacent choices. A CRF adds a learned transition matrix and scores the whole sequence, so those transitions get very low weights and Viterbi decoding never selects them. The encoder supplies context-sensitive features and the CRF guarantees the output is well formed. With a strong transformer encoder the F1 gain is often small, but the output being structurally valid has value of its own, since downstream code does not have to handle sequences that should not exist." }] },
    { level: "Senior", q: "You need to extract entities from documents and have no labelled data. What do you do?",
      strong: "Split by entity type: rules for formatted ones, an off-the-shelf model for standard ones, LLM prompting for the rest.",
      answer: [{ t: "p", text: "I would split the entity types rather than looking for one approach. Anything with a genuine format — account numbers, postcodes, dates, ISINs, part numbers — should be a regex, because a pattern that really is a pattern is matched exactly by rules, is auditable, costs nothing and no learned model will beat it. For standard types like people, organisations and locations, an off-the-shelf model such as spaCy or a fine-tuned BERT NER gets you a long way with no labelling at all. For anything bespoke — a domain-specific category that no pretrained model knows — I would start with LLM prompting to get predictions, use those to bootstrap a labelled set with human review of a sample, and then train a small fast model on it, because prompting per document is expensive and the output varies between calls unless you constrain the schema. Throughout I would build the evaluation set first, by hand, since without span-level ground truth none of these choices can be compared and the temptation is to judge by reading a few outputs, which always flatters." }] }
  ] }
});
