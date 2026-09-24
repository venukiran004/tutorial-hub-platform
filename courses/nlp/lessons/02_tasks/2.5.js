/* ============================================================================
   LESSON 2.5 — Sequence Labelling
   Mirrors 01_NLP_Notes.md · §13. Greedy and Viterbi decoding are run on the
   same emission scores, and greedy emits a structurally invalid sequence
   (scratchpad/nlp/n25.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "**The best sequence is not the sequence of individual bests, and here is the arithmetic.** Given the same per-token scores, greedy decoding picks `I-PER` for *Steve* because it beats `B-PER` by 0.1 — producing a tag sequence that cannot exist, since an entity cannot continue before it begins. Viterbi accepts the lower local score and wins on the whole sequence. This lesson runs both on real numbers and shows the dynamic program that makes it exact.",

  objectives: [
    "Frame NER, POS tagging, chunking and slot filling as one problem",
    "Run Viterbi decoding and compare it with greedy",
    "Explain why a locally optimal tag can be globally wrong",
    "State the complexity of exact sequence decoding",
    "Describe slot filling and joint intent classification"
  ],

  prerequisites: ["2.4", "1.7"],

  blocks: [

    { t: "h2", n: "01", text: "One problem, many names", id: "tasks" },

    { t: "dl", items: [
      ["Named entity recognition", "Label spans as people, organisations, places. BIO tags per token."],
      ["POS tagging", "Label each token with its grammatical category. One tag per token, no spans."],
      ["Chunking", "Find flat phrase boundaries — noun phrases, verb phrases — without a full parse."],
      ["Slot filling", "Extract the arguments of a command: origin, destination, date."],
      ["Any span extraction", "Product mentions, symptoms, legal clauses, PII — all the same shape."]
    ] },

    { t: "p", text: "All of these assign one label per token and decode spans from the label sequence, so the same model, the same BIO scheme and the same decoding algorithm serve all of them. That is why *sequence labelling* is worth treating as a single topic rather than learning NER and POS tagging separately." },

    { t: "h2", n: "02", text: "Greedy decoding fails", id: "greedy" },

    { t: "out", text: `  token       O        B-PER    I-PER
  met         2.00     -1.00    -1.00
  Steve       -1.00    1.40     1.50
  Jobs        -1.00    0.90     1.10
  yesterday   1.80     -1.00    0.20` },

    { t: "p", text: "These are the raw per-token scores an encoder produces before any structure is imposed. At *Steve* the model slightly prefers `I-PER` (1.50) over `B-PER` (1.40) — a difference of 0.1, which is well within the noise of any real model." },

    { t: "out", text: `  greedy path : ['O', 'I-PER', 'I-PER', 'O']
  invalid transitions emitted: [('O', 'I-PER')]` },

    { t: "callout", kind: "crit", title: "`I-PER` following `O` is not unlikely — it is meaningless",
      body: [{ t: "p", text: "Greedy decoding takes the argmax at each position independently, so a 0.1 preference at one token produces a tag sequence that **cannot be decoded into spans at all**: the entity continues before it starts. Nothing in the per-token objective couples adjacent decisions, so the classifier has no way to know this. Lesson 1.7 counted six of twenty-five transitions as structurally invalid in a two-type scheme; greedy decoding will emit them whenever the local scores happen to favour it, which on real data is often." }] },

    { t: "h2", n: "03", text: "Viterbi", id: "viterbi" },

    { t: "math", tex: "\\delta_t(k) = \\max_{j} \\big[\\delta_{t-1}(j) + T_{j,k}\\big] + E_t(k)" },

    { t: "out", text: `  dp table (best score of any path ENDING in each tag):
  token       O          B-PER      I-PER
  met         2.60       -0.60      -inf
  Steve       2.10       4.30       2.10
  Jobs        3.50       4.70       6.60
  yesterday   8.80       5.20       7.70

  viterbi path : ['O', 'B-PER', 'I-PER', 'O']
  greedy path  : ['O', 'I-PER', 'I-PER', 'O']
  best total score: 8.80
  greedy total score: -999999991.70` },

    { t: "callout", kind: "insight", title: "Viterbi accepted a worse local score to unlock a better transition",
      body: [{ t: "p", text: "At *Steve*, Viterbi chose `B-PER` with an emission of 1.40 rather than `I-PER` at 1.50 — a locally worse choice. It did so because `B-PER → I-PER` is a strong transition (+1.2) while `I-PER` after `O` is forbidden, so the `B-PER` path scores far better once *Jobs* is reached. The final totals make the gap absolute: **8.80 against −1e9**, because the greedy path contains a transition with an effectively infinite penalty. The `-inf` in the first row of the dp table is the same constraint: no path can begin with `I-PER`." }] },

    { t: "p", text: "The algorithm is the same forward dynamic program as CTC in speech, and the same one as the n-gram lattice — fill a table where each cell holds the best score of any path ending in that state, keep a back-pointer, and read the path off at the end. It is **exact**, not a heuristic search: no valid path is pruned, they are just scored in a way that reuses shared prefixes." },

    { t: "out", text: `  T= 10 tokens, K= 9 tags: viterbi    810 cell-updates, brute force K^T = 10^10
  T= 50 tokens, K= 9 tags: viterbi   4050 cell-updates, brute force K^T = 10^48
  T=100 tokens, K=37 tags: viterbi 136900 cell-updates, brute force K^T = 10^157` },

    { t: "p", text: "`O(T·K²)` against `O(K^T)`. At a hundred tokens and a 37-tag scheme — nine entity types in BIOES — enumeration is `10^157` sequences and Viterbi is 136,900 cell updates. That is the difference between impossible and instant." },

    { t: "h2", n: "04", text: "Slot filling", id: "slots" },

    { t: "out", text: `  "Book a flight from New York to London on Friday"
  intent: book_flight
  slots:
    origin:      New York
    destination: London
    date:        Friday` },

    { t: "callout", kind: "mental", title: "Two outputs from one encoder",
      body: [{ t: "p", text: "Slot filling is NER with domain-specific types, and it is almost always paired with **intent classification** — one label for the whole utterance, several labels per token. The standard architecture runs both heads off the same encoder: a sentence-level classification head for the intent and a token-level head for the slots, trained jointly. That sharing helps in both directions, because knowing the intent is `book_flight` makes `London` far more likely to be a destination than a topic, and seeing a destination slot makes `book_flight` more likely. This is what sits behind every voice assistant's command understanding." }] },

    { t: "h2", n: "05", text: "Modern practice", id: "modern" },

    { t: "code", lang: "python", title: "Token classification with a pretrained model",
      code: `ner = pipeline("token-classification", model="dslim/bert-base-NER",
               aggregation_strategy="simple")
results = ner("Hugging Face was founded in New York by Clément Delangue.")
# Hugging Face    ORG   0.9980
# New York        LOC   0.9990
# Clément Delangue PER  0.9970`,
      caption: "`aggregation_strategy=\"simple\"` does the span decoding for you — without it you get per-subword tags and have to merge them yourself, which is where lesson 1.7's alignment trap lives." },

    { t: "dl", items: [
      ["Transformer encoder alone", "Usually enough. The contextual representation makes most invalid transitions unlikely even without a CRF, and `aggregation_strategy` cleans up the rest."],
      ["Transformer plus CRF", "Worth it when the output must be structurally valid by construction, or when the tag scheme has hard constraints the data does not fully teach."],
      ["Constrained decoding", "A middle option: mask out invalid transitions at inference without training a CRF. Cheap, and guarantees well-formed output."]
    ] },

    { t: "exercise", kind: "practice", title: "Decode both ways and count the difference", difficulty: "core", minutes: 35,
      prompt: "Implement Viterbi decoding over a transition matrix and a set of emission scores, and verify it against brute-force enumeration on sequences short enough to enumerate. Then take a trained token classifier, decode its emissions greedily and with Viterbi, and count how many structurally invalid transitions each produces on a test set. Finally, implement constrained decoding — masking invalid transitions without a learned matrix — and compare it with the full CRF.",
      hints: [
        "Brute force is feasible up to about 8 tokens with 3 tags.",
        "Use a large negative number rather than `-inf` for forbidden transitions, to avoid NaN in arithmetic.",
        "Constrained decoding often gets most of the CRF's benefit for none of the training cost."
      ],
      solution: {
        notes: [
          { t: "p", text: "Verifying against brute force on short sequences is worth doing once, because it establishes that Viterbi is exact rather than a good heuristic. The dynamic program returns precisely the highest-scoring valid path, and seeing the two agree on every enumerable case removes any doubt about whether it prunes something important." },
          { t: "p", text: "The invalid-transition count on real data is usually the surprise. A strong transformer encoder emits relatively few, because the contextual representation already makes `I-PER` after `O` unlikely — but relatively few is not zero, and every one of them is a span that cannot be decoded. Constrained decoding takes that count to exactly zero for essentially no cost, which is why it is often the right answer when a full CRF is not worth training." },
          { t: "p", text: "Using a large negative constant rather than true `-inf` matters practically: `-inf` plus a finite number is fine, but `-inf` minus `-inf` gives NaN, and that appears as soon as you normalise or compute gradients. A value like −1e9 behaves identically for argmax purposes and never produces NaN." }
        ]
      } }

  ],

  takeaways: [
    "NER, POS tagging, chunking and slot filling are one problem: one label per token, spans decoded from the sequence.",
    "Greedy decoding picked `I-PER` over `B-PER` by 0.1 and produced a sequence that cannot be decoded into spans.",
    "Viterbi chose the locally worse tag to unlock a strong transition, scoring 8.80 against greedy's −1e9.",
    "`δ_t(k) = max_j [δ_{t−1}(j) + T_{j,k}] + E_t(k)` — fill the table, keep back-pointers, read off the path.",
    "Viterbi is exact, not a pruned search; it reuses shared prefixes rather than discarding paths.",
    "`O(T·K²)` against `O(K^T)`: 136,900 updates versus 10^157 sequences at 100 tokens and 37 tags.",
    "Slot filling pairs token-level slots with an utterance-level intent, trained jointly off one encoder.",
    "Constrained decoding masks invalid transitions at inference — most of a CRF's benefit with no training."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Greedy decoding produced `['O', 'I-PER', 'I-PER', 'O']`. What is wrong with it?",
      options: ["The entity is too long", "`I-PER` cannot follow `O` — an entity continues before it begins", "The first tag should be `B-PER`", "Nothing; it is a valid tagging"],
      answer: 1,
      why: "`I-` means continuation, so it is meaningless after `O`. Greedy took the argmax at each position independently, and at one token `I-PER` beat `B-PER` by 0.1 — well within any model's noise. Nothing in a per-token objective couples adjacent decisions, so it cannot know." },
    { stem: "Why did Viterbi choose a tag with a lower emission score?",
      options: ["A bug in the implementation", "Because the transition it enables scores far better over the whole sequence", "To break a tie", "To satisfy the CRF loss"],
      answer: 1,
      why: "At `Steve` it took `B-PER` at 1.40 rather than `I-PER` at 1.50, because `B-PER → I-PER` is a strong transition while `I-PER` after `O` is forbidden. The totals were 8.80 against −1e9. The best sequence is not the sequence of individual bests." },
    { stem: "Is Viterbi an approximation?",
      options: ["Yes, it prunes unlikely paths", "No — it is exact, computing the same maximum as enumeration would", "Only with a CRF", "Only for short sequences"],
      answer: 1,
      why: "It reuses the best score for each shared prefix rather than discarding paths, so it returns precisely the highest-scoring valid sequence. That reorganisation turns `O(K^T)` into `O(T·K²)` — 136,900 cell updates against 10^157 sequences at 100 tokens and 37 tags." },
    { stem: "What is the cheapest way to guarantee structurally valid tag sequences?",
      options: ["Train a CRF", "Constrained decoding — mask invalid transitions at inference", "Increase model size", "Use BIOES instead of BIO"],
      answer: 1,
      why: "Masking forbidden transitions during Viterbi decoding requires no training at all and takes the invalid-transition count to exactly zero. A learned CRF additionally models which *valid* transitions are likely, which helps accuracy, but for structural validity alone the constraint is free." }
  ] },

  interview: { title: "Interview", sub: "Sequence labelling", questions: [
    { level: "Core", q: "Why is greedy decoding insufficient for sequence labelling?",
      strong: "Because tag decisions are dependent, and a small local preference can produce an invalid sequence.",
      answer: [{ t: "p", text: "Because the best sequence is not the sequence of individual bests. I ran a concrete case: at one token the model preferred `I-PER` over `B-PER` by 0.1, which is within any model's noise, and greedy took it — producing `O, I-PER, I-PER, O`, a sequence that cannot be decoded into spans at all, because an entity cannot continue before it begins. Viterbi took the locally worse tag there, because doing so unlocked a strong `B-PER` to `I-PER` transition at the next token, and scored 8.80 where the greedy path scored effectively minus infinity. The general point is that a per-token softmax optimises each position independently and nothing in that objective couples adjacent decisions, so any structural constraint in the tag scheme is unenforced. Viterbi over a transition matrix fixes it exactly, in `O(T·K²)`." }] },
    { level: "Senior", q: "Do you need a CRF on top of a modern transformer for NER?",
      strong: "Usually not for accuracy, but constrained decoding is worth it for structural validity.",
      answer: [{ t: "p", text: "Usually not for the accuracy gain. A strong transformer encoder produces contextual representations that already make `I-PER` after `O` unlikely, so the F1 improvement from adding a CRF is often small — much smaller than it was over a BiLSTM. What a CRF still guarantees is that the output is well formed, and the encoder alone does not: relatively few invalid transitions is not zero, and each one is a span your downstream code has to handle or silently drop. So my preference is constrained decoding — mask the structurally invalid transitions during Viterbi at inference, with no learned transition matrix and no training cost. That takes the invalid count to exactly zero. I would train a full CRF when the tag scheme has hard constraints the training data does not fully demonstrate, or when I have relatively little data and the transition structure is useful supervision in its own right." }] },
    { level: "Senior", q: "How would you build intent and slot extraction for a voice assistant?",
      strong: "Joint model: one encoder, a sentence head for intent and a token head for slots.",
      answer: [{ t: "p", text: "One encoder with two heads, trained jointly — a sentence-level classification head for the intent and a token-level head for the slots in BIO. Training them together helps both directions: knowing the intent is `book_flight` makes `London` far more likely to be a destination slot than a topic, and seeing a destination slot raises the probability of that intent. Separately-trained models lose that. On top of it I would use constrained decoding for the slots so the spans are always well formed, and I would constrain which slots are even possible given the predicted intent, since `artist` is not a slot of `set_alarm` and allowing it only creates errors. For evaluation I would report intent accuracy, slot span F1 and — most importantly — exact-match rate on the whole frame, because a command with the right intent and one wrong slot fails just as completely as one with the wrong intent, and the per-component metrics hide that." }] }
  ] }
});
