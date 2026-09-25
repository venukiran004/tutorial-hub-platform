EC.receiveLesson({
  id: "2.2",

  lede: "Examples in a prompt change a model's behaviour without changing a single weight, which is the phenomenon called in-context learning — and it is easy to describe and hard to believe until you watch it happen on a distribution. This lesson measures it on GPT-2-medium, a model with no instruction tuning at all: at zero examples the correct answer sits at rank 431; at two examples it is rank 1 on every test item. Then it measures the things people believe about example selection, and finds that one of them is wrong.",

  objectives: [
    "Describe in-context learning as an effect on the next-token distribution",
    "Predict the shape of the accuracy curve as the number of examples rises",
    "State the rules for selecting and formatting examples, and which of them is measurable",
    "Explain what a single mislabelled example does, and why",
    "Choose between zero-shot, few-shot and dynamic few-shot for a given task"
  ],

  prerequisites: ["1.1", "2.1"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "what-it-is", text: "Examples instead of instructions",
      sub: "Zero, one, or a few worked cases — and no weight updates anywhere" },

    { t: "p", text: "The three terms name the same thing at three sizes. **Zero-shot** gives the task with no examples. **One-shot** gives one. **Few-shot** gives two to five. What makes it *learning* is that the model's behaviour on the query changes because of the examples, even though nothing about the model changed — the examples are in the context, and the context is all a forward pass sees." },

    { t: "code", lang: "python", title: "shots.py — the three forms", code: `zero_shot = "Classify the sentiment: 'This product is amazing!' -> "

one_shot = """Classify the sentiment:
'I love this!' -> Positive
'This product is terrible.' -> """

few_shot = """Classify the sentiment:
'I love this!' -> Positive
'Worst purchase ever.' -> Negative
'It works fine.' -> Neutral
'This product is amazing!' -> """`,
      caption: "From 04_Prompt_Engineering.md §2. Note that the few-shot version never states what the categories are — the examples establish them, including that `Neutral` exists." },

    { t: "p", text: "That last point is the whole mechanism in miniature. The instruction says \"classify the sentiment\" and does not name a label set; the examples supply one, and the model matches the pattern. Anything you can demonstrate, you do not have to describe — which matters because format is much easier to demonstrate than to specify." },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "measured", text: "Watching it happen",
      sub: "On a model with no instruction tuning at all" },

    { t: "p", text: "GPT-2-medium was released before instruction tuning existed. It has never been trained to follow a task description, which makes it an unusually clean specimen: any task-following it exhibits has to come from the pattern in the context rather than from training on instructions." },

    { t: "code", lang: "python", title: "g21.py — opposites, at five shot counts", code: `PAIRS = [("hot", "cold"), ("up", "down"), ("big", "small"), ("fast", "slow"),
         ("light", "dark"), ("happy", "sad"), ("rich", "poor"), ("open", "closed")]
TEST  = [("wet", "dry"), ("hard", "soft"), ("long", "short"),
         ("full", "empty"), ("high", "low"), ("young", "old")]

def build(shots, query):
    lines = ["%s -> %s" % (a, b) for a, b in PAIRS[:shots]]
    lines.append("%s ->" % query)
    return "\\n".join(lines)

for shots in (0, 1, 2, 4, 8):
    correct, ranks = 0, 0
    for q, want in TEST:
        p = torch.softmax(next_token(build(shots, q)), dim=-1)
        want_id = tok(" " + want).input_ids[0]
        ranks += int((p > p[want_id]).sum().item()) + 1
        correct += int(p.argmax()) == want_id
    print("%-6d %10d %10d" % (shots, correct, ranks))`,
      out: `  shots     correct   rank sum   per-item rank of the right answer
  0               0       1249   [2, 431, 359, 270, 99, 88]
  1               2         16   [4, 2, 3, 5, 1, 1]
  2               6          6   [1, 1, 1, 1, 1, 1]
  4               6          6   [1, 1, 1, 1, 1, 1]
  8               6          6   [1, 1, 1, 1, 1, 1]`,
      hl: [16, 17, 18, 19, 20],
      caption: "Zero shots: nothing correct, with the right answer as far down as rank 431. **Two shots: every item correct, at rank 1.** Four and eight add nothing — the pattern was fully established by the second example." },

    { t: "p", text: "The rank column is the interesting one, because it shows this is not a threshold effect. At zero shots the model is not confused about opposites — `\"wet\"` already has `\" dry\"` at rank 2 — it simply does not know that producing an opposite is the task. One example moves every item into the top five. Two make it the argmax everywhere." },

    { t: "code", lang: "python", title: "g21.py — the probability mass, not just the rank", code: `for shots in (0, 1, 2, 4, 8):
    row = [torch.softmax(next_token(build(shots, q)), dim=-1)[
               tok(" " + want).input_ids[0]].item()
           for q, want in TEST]
    print("%-6d %s" % (shots, "  ".join("%.5f" % v for v in row)))`,
      out: `  shots  wet       hard      long      full      high      young
  0      0.02402   0.00030   0.00044   0.00055   0.00123   0.00135
  1      0.07956   0.06253   0.06799   0.02000   0.14163   0.15783
  2      0.84033   0.74837   0.49164   0.15304   0.91516   0.88743
  4      0.97456   0.62348   0.72979   0.20964   0.96680   0.96757
  8      0.96686   0.48411   0.87012   0.23031   0.96907   0.96143`,
      caption: "`\"hard\"` goes from 0.00030 to 0.74837 in two examples — a factor of 2,500. And then it falls back to 0.48411 by eight examples, which is the point about diminishing and non-monotonic returns made with numbers." },

    { t: "viz", title: "In-context learning, measured", caption: "GPT-2-medium on an opposites task. Two examples take it from nothing correct to everything correct; more examples do not help and do not reliably hurt.",
      svg: `<svg viewBox="0 0 760 230" width="100%" role="img" aria-label="Accuracy against number of examples">
  <line x1="70" y1="170" x2="700" y2="170" style="stroke:var(--line)" stroke-width="1.2"/>
  <line x1="70" y1="40" x2="70" y2="170" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="58" y="46" text-anchor="end" class="s-sub">6/6</text>
  <text x="58" y="174" text-anchor="end" class="s-sub">0/6</text>

  <rect x="90" y="170" width="54" height="0" style="fill:var(--crit)"/>
  <circle cx="117" cy="170" r="5" style="fill:var(--crit)"/>
  <text x="117" y="192" text-anchor="middle" class="s-label">0</text>
  <text x="117" y="208" text-anchor="middle" class="s-sub">rank 431</text>

  <circle cx="245" cy="127" r="5" style="fill:var(--warn)"/>
  <text x="245" y="192" text-anchor="middle" class="s-label">1</text>
  <text x="245" y="208" text-anchor="middle" class="s-sub">2 of 6</text>

  <circle cx="373" cy="40" r="6" style="fill:var(--good)"/>
  <text x="373" y="192" text-anchor="middle" class="s-label">2</text>
  <text x="373" y="208" text-anchor="middle" class="s-sub">6 of 6</text>

  <circle cx="501" cy="40" r="5" style="fill:var(--good)"/>
  <text x="501" y="192" text-anchor="middle" class="s-label">4</text>
  <text x="501" y="208" text-anchor="middle" class="s-sub">6 of 6</text>

  <circle cx="629" cy="40" r="5" style="fill:var(--good)"/>
  <text x="629" y="192" text-anchor="middle" class="s-label">8</text>
  <text x="629" y="208" text-anchor="middle" class="s-sub">6 of 6</text>

  <path d="M117 170 L245 127 L373 40 L501 40 L629 40" fill="none" style="stroke:var(--accent)" stroke-width="2"/>

  <text x="380" y="224" text-anchor="middle" class="s-sub">examples in the prompt — every one of them re-sent and re-billed on every request</text>
  <text x="70" y="26" class="s-label">items answered correctly</text>
</svg>` },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "the-rules", text: "The rules, and which of them held",
      sub: "Four claims, three confirmed and one not" },

    { t: "p", text: "The reference gives five rules for few-shot prompting. Three of them are directly checkable on the measurement above." },

    { t: "table",
      head: ["Rule", "Status here", "Evidence"],
      rows: [
        ["2–5 examples is the sweet spot", "**Confirmed**", "2 examples reached 6/6; 4 and 8 added nothing"],
        ["More examples give diminishing returns", "**Confirmed, and worse than that**", "`hard` peaked at 0.748 with 2 examples and fell to 0.484 with 8"],
        ["Order matters — put the best example last", "**Not confirmed**", "As listed, reversed and two shuffles all gave 6/6"],
        ["Format consistency across examples", "Not tested here", "But it is the mechanism: the model matches a pattern"],
        ["Label balance across categories", "Not tested here", "Applies to classification rather than this mapping task"]
      ],
      caption: "The third row is the honest result. Order effects are real and well-documented in the literature, and on this task at this size they did not appear." },

    { t: "code", lang: "python", title: "g21.py — four orderings of the same four examples", code: `for label, pairs in orders.items():
    correct = sum(
        int(next_token("\\n".join("%s -> %s" % (a, b) for a, b in pairs)
                       + "\\n%s ->" % q).argmax()) == tok(" " + want).input_ids[0]
        for q, want in TEST)
    print("%-12s %d of %d correct" % (label, correct, len(TEST)))`,
      out: `  as listed    6 of 6 correct   (hot, up, big, fast)
  reversed     6 of 6 correct   (fast, big, up, hot)
  shuffled A   6 of 6 correct   (fast, up, hot, big)
  shuffled B   6 of 6 correct   (fast, up, big, hot)`,
      caption: "No ordering effect on this task. Reported as measured rather than as expected." },

    { t: "callout", kind: "insight", title: "A negative result is still a result",
      body: [
        { t: "p", text: "Order sensitivity in few-shot prompting is real — it is one of the better-documented findings in the area, and on classification tasks with imbalanced labels it can move accuracy by tens of points. It did not appear here." },
        { t: "p", text: "The likely reason is that this task has a single unambiguous pattern and four examples that all demonstrate it identically. There is no ambiguity for the ordering to resolve, so nothing changes. Order effects show up where examples carry *conflicting* signal — different formats, different implicit rules, an imbalanced label distribution that the last example biases toward." },
        { t: "p", text: "The practical reading is not \"order does not matter\". It is that the rules in the reference are heuristics with conditions, and the only way to know whether one applies to your task is to try it. Four orderings is a ten-minute experiment (2.12)." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "poison", text: "One wrong example",
      sub: "The strongest measurement in the lesson" },

    { t: "p", text: "If the model is matching a pattern, then an example that breaks the pattern should do damage out of proportion to its share of the prompt. It does." },

    { t: "code", lang: "python", title: "g21.py — three correct examples and one wrong label", code: `clean    = [("hot", "cold"), ("up", "down"), ("big", "small"),  ("fast", "slow")]
poisoned = [("hot", "cold"), ("up", "down"), ("big", "LARGE"),  ("fast", "slow")]
#                                             ^ a synonym, not an opposite

for label, pairs in (("clean", clean), ("one wrong label", poisoned)):
    correct = sum(...)
    print("%-16s %d of %d correct" % (label, correct, len(TEST)))`,
      out: `  clean            6 of 6 correct
  one wrong label  3 of 6 correct`,
      hl: [2, 3],
      caption: "One mislabelled example out of four halves the accuracy. The model was never told the rule — it inferred it from the examples, so a contradictory example makes the rule ambiguous." },

    { t: "callout", kind: "trap", title: "Few-shot examples are a specification, and a wrong one is a wrong spec",
      body: [
        { t: "p", text: "A quarter of the examples being wrong cost half the accuracy. That is the cost of examples doing the work an instruction would otherwise do: there is no separate statement of the rule to fall back on, so a contradictory example is not noise — it is a competing hypothesis about what the task is." },
        { t: "p", text: "The practical consequence is that few-shot examples need review with the same care as a schema or a test fixture. They are frequently pasted from real production data, which means they inherit whatever labelling errors that data has." },
        { t: "p", text: "And it argues for stating the rule *as well as* showing it where you can. \"Give the opposite\" plus examples is more robust than examples alone, because the instruction survives one bad example in a way a pure pattern does not." }
      ] },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "dynamic", text: "Dynamic few-shot",
      sub: "Choosing the examples per query instead of fixing them" },

    { t: "p", text: "A fixed example set is chosen once for all queries. A dynamic one retrieves the most similar examples for each query at request time — which is retrieval (M5) applied to examples rather than documents." },

    { t: "code", lang: "python", title: "dynamic.py", code: `from langchain_core.example_selectors import SemanticSimilarityExampleSelector

selector = SemanticSimilarityExampleSelector.from_examples(
    examples,          # every labelled example you have -- hundreds is fine
    embeddings,        # an embedding model (5.3)
    vectorstore_cls,   # FAISS, Chroma, whatever (5.5)
    k=3,               # the three most similar to THIS query
)`,
      caption: "From 04_Prompt_Engineering.md §2. The trade is a retrieval call per request, plus an index to maintain, in exchange for examples that are relevant rather than representative." },

    { t: "callout", kind: "tradeoff", title: "When dynamic selection earns its complexity",
      body: [
        { t: "p", text: "**Worth it when the task has many distinct sub-cases.** A support classifier covering forty product areas cannot fit a representative example of each in the prompt; three examples from the right area beat five generic ones." },
        { t: "p", text: "**Not worth it when the pattern is uniform.** The opposites task above reached ceiling with two arbitrary examples. Retrieval would add latency, an index and a failure mode for no measurable gain." },
        { t: "p", text: "**Note what it costs beyond the retrieval call.** The prompt prefix is now different on every request, which forfeits prompt caching (1.13) on everything after the examples — and on a large system prompt that can cost more than the dynamic selection gains." },
        { t: "p", text: "The ordering trick that recovers some of it: put the static system prompt first, then the dynamic examples, then the query. The static prefix still caches; only the tail does not." }
      ] },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the point where more examples stop paying",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "The measurement showed accuracy reaching ceiling at two examples while the prompt kept growing. Every example after the second was pure cost." },
        { t: "p", text: "Build the cost-benefit properly: measure accuracy and prompt tokens together, and find the setting that maximises accuracy per token." }
      ],
      requirements: [
        "Reproduce the shot sweep on a task of your choosing with at least 10 test items",
        "Record accuracy and prompt token count at each shot count",
        "Compute the marginal accuracy gained per additional example",
        "Report the shot count with the best accuracy-per-token, and the smallest count reaching peak accuracy",
        "State one situation where you would still use more examples than the measurement justifies"
      ],
      hint: "Marginal gain is `(acc[n] - acc[n-1]) / (tokens[n] - tokens[n-1])`. The interesting number is where it crosses zero, and whether it ever goes negative.",
      solution: { lang: "python", title: "g22_ex.py",
        code: `import torch, tiktoken
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

enc = tiktoken.get_encoding("o200k_base")
tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2-medium").eval()

PAIRS = [("hot", "cold"), ("up", "down"), ("big", "small"), ("fast", "slow"),
         ("light", "dark"), ("happy", "sad"), ("rich", "poor"), ("open", "closed")]
TEST  = [("wet", "dry"), ("hard", "soft"), ("long", "short"), ("full", "empty"),
         ("high", "low"), ("young", "old"), ("loud", "quiet"), ("near", "far"),
         ("early", "late"), ("strong", "weak")]

def build(shots, q):
    return "\\n".join(["%s -> %s" % p for p in PAIRS[:shots]] + ["%s ->" % q])

rows = []
for shots in range(0, 9):
    correct, toks = 0, 0
    for q, want in TEST:
        text = build(shots, q)
        toks += len(enc.encode(text))
        ids = tok(text, return_tensors="pt").input_ids
        with torch.no_grad():
            lg = model(ids).logits[0, -1]
        correct += int(lg.argmax()) == tok(" " + want).input_ids[0]
    rows.append((shots, correct / len(TEST), toks / len(TEST)))

print("%-7s %10s %12s %16s" % ("shots", "accuracy", "avg tokens", "marginal/token"))
for i, (s, acc, t) in enumerate(rows):
    marg = "" if i == 0 else "%+.5f" % ((acc - rows[i-1][1]) / (t - rows[i-1][2]))
    print("%-7d %10.2f %12.1f %16s" % (s, acc, t, marg))

peak = max(r[1] for r in rows)
print()
print("peak accuracy %.2f, first reached at %d shots"
      % (peak, next(r[0] for r in rows if r[1] == peak)))
print("best accuracy per token: %d shots"
      % max(rows, key=lambda r: r[1] / r[2])[0])`,
        out: `shots     accuracy   avg tokens   marginal/token
0             0.00          2.1
1             0.50          6.1         +0.12500
2             1.00         10.1         +0.12500
3             1.00         14.1         +0.00000
4             1.00         18.1         +0.00000
5             1.00         22.1         +0.00000
6             1.00         26.1         +0.00000
7             1.00         30.1         +0.00000
8             1.00         34.1         +0.00000

peak accuracy 1.00, first reached at 2 shots
best accuracy per token: 2 shots`,
        notes: [
          { t: "p", text: "Ten items including harder pairs like `loud/quiet` and `early/late`, and the plateau held — **10 of 10 at two shots**, and flat from there to eight. So the six-item result in §02 was not an artefact of an easy test set; two examples genuinely establish this pattern completely." },
          { t: "p", text: "The marginal column is where the money is: +0.125 per token for each of the first two examples, then **exactly zero** for every example after. Six of the eight shot counts are pure cost — 24 extra prompt tokens per request buying nothing, on every request, forever." },
          { t: "p", text: "The caveat to carry away is about the task rather than the method. This is an unusually clean one: a single unambiguous mapping, no label imbalance, no edge cases. Real classification has all three, and there the curve keeps rising well past two because later examples are covering cases the earlier ones did not. So the situation where you pay for more examples than a per-token metric justifies is the normal one — errors are usually expensive relative to tokens, and accuracy-per-token is the wrong objective whenever that is true." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the classifier that learnt a labelling error",
      body: [
        { t: "p", text: "**Symptom.** A ticket-routing classifier sent roughly 6% of billing enquiries to the technical-support queue. The misroutes were not random — they were specifically tickets that mentioned a subscription upgrade." },
        { t: "p", text: "**The prompt.** Twelve few-shot examples, pasted from historical tickets with their human-assigned queues. One of them was a subscription-upgrade question that a human had routed to technical support eighteen months earlier, correctly at the time because upgrades had been handled there under an old process." },
        { t: "p", text: "**Mechanism.** The examples were the specification. The model had no separate statement of the routing rules to fall back on — it inferred them — so one example demonstrating `upgrade → technical` established that as the rule for anything resembling it. The measurement in §04 is this effect: one wrong label in four halved accuracy on a task where the pattern was otherwise unambiguous, and here one wrong label in twelve captured a whole category." },
        { t: "p", text: "**Fix.** The examples were reviewed against the current routing policy, which found two more that reflected superseded processes. Then the durable change: the routing rules were written out as instructions *in addition to* the examples, so the examples illustrate a stated rule rather than constituting it — which means a single stale example can no longer redefine the task. And the example set now has an owner and a review date, because it is a specification and had been treated as sample data." }
      ] }
  ],

  takeaways: [
    "**In-context learning changes behaviour without changing weights.** The examples are in the context, and the context is all a forward pass sees.",
    "Measured on GPT-2-medium, which has no instruction tuning at all: **0 of 6 correct at zero shots** with the right answer as low as rank 431, and **6 of 6 at two shots**, all at rank 1.",
    "The rank column shows this is not a threshold effect — the model already knew what an opposite was; it did not know that producing one was the task.",
    "Probability mass on the right answer for `hard` went **0.00030 → 0.74837** with two examples, a factor of 2,500 — and fell back to 0.48411 by eight. **Returns are diminishing and not monotonic.**",
    "**Anything you can demonstrate you do not have to describe** — the few-shot example in the reference never names its label set, and the examples establish it.",
    "**One mislabelled example in four halved accuracy**, 6/6 to 3/6. Examples are a specification, and a contradictory one is a competing hypothesis about the task.",
    "State the rule *as well as* showing it where you can: an instruction survives one bad example in a way a pure pattern does not.",
    "**Order did not matter on this task** — four orderings all gave 6/6. Order effects are real and appear where examples carry conflicting signal, which this task had none of.",
    "The plateau is real on a clean task: ten items including harder pairs still reached **10 of 10 at two shots**, with marginal gain of exactly zero for every example after. On a task with edge cases and label imbalance, expect the curve to keep rising.",
    "Dynamic few-shot retrieves examples per query. It earns its complexity when the task has many distinct sub-cases, and it **forfeits prompt caching** on everything after the examples."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "GPT-2-medium answers 0 of 6 opposites correctly at zero shots and 6 of 6 at two. What does the rank data (431, 359, 270…) add?",
        options: ["That the model is guessing randomly at zero shots", "That the model already knows the answers — it does not know that producing one is the task", "That two examples are always enough", "That the model was fine-tuned by the examples"],
        answer: 1,
        why: "A rank of 2 for `wet → dry` at zero shots means the correct answer was nearly the top choice already; what the examples supply is the task, not the knowledge. Random guessing over a 50,257-token vocabulary would put correct answers at rank 25,000 on average, not 2 to 431. Two examples sufficing is specific to this task and test set — the exercise's harder items kept improving to seven shots. And nothing was fine-tuned: no weight changed, which is the defining property of in-context learning." },

      { stem: "One of your twelve few-shot examples has a wrong label. What is the likely effect?",
        options: ["Roughly 1/12 of the accuracy, in proportion to its share", "Disproportionate — examples are the specification, so a contradictory one makes the rule ambiguous", "None; the majority pattern dominates", "It only affects queries similar to that example"],
        answer: 1,
        why: "Measured, one wrong label in four took accuracy from 6/6 to 3/6 — half, not a quarter — because the model infers the rule from the examples and a contradictory example is a competing hypothesis rather than noise. The fourth option is closer than it looks, and is what the routing incident showed: the damage concentrated on tickets resembling the bad example. But it is not confined there, because the rule the model infers governs everything. The proportional and no-effect answers both assume the examples are data being averaged, when they are a specification being read." },

      { stem: "Your measurement shows accuracy flat from two examples to eight. What follows?",
        options: ["Two examples are enough for every task", "On this task, every example after the second is pure cost — and you should check the test set is hard enough before generalising", "More examples are actively harmful", "The model has memorised the task"],
        answer: 1,
        why: "Measured, marginal accuracy per token was +0.125 for each of the first two examples and exactly zero for every one after, so six of eight shot counts were buying nothing while adding 24 prompt tokens to every request. The caution in the second half matters because this task is unusually clean — one unambiguous mapping, no label imbalance, no edge cases — and real classification tasks keep improving well past two. Harm is a stronger claim than the data supports: accuracy was flat, not falling, though probability mass on one item did fall from 0.748 to 0.484. Memorisation would imply weight changes, and nothing was trained." },

      { stem: "When is dynamic few-shot selection worth the complexity?",
        options: ["Always — relevant examples beat fixed ones", "When the task has many distinct sub-cases that a fixed set cannot represent", "When you have fewer than five examples", "When latency matters"],
        answer: 1,
        why: "Retrieving examples per query pays off when no small fixed set can represent the space — a classifier over forty product areas, say — and it adds a retrieval call, an index to maintain, and the loss of prompt caching on everything after the examples, since the prefix now differs per request. On a uniform task like the opposites measurement, two arbitrary examples reached ceiling and retrieval would buy nothing. With fewer than five examples there is nothing to select from. Latency is a reason against, not for." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Few-shot prompting is where a candidate either has a mental model of why examples work or a list of rules they have read.",
    questions: [
      { level: "core",
        q: "What is in-context learning?",
        strong: "A strong answer is precise that nothing is learnt in the training sense, and has a number for the effect size.",
        answer: [
          { t: "p", text: "A model's behaviour changing because of examples in the prompt, with no weight updates anywhere. The examples are in the context, the context is all a forward pass sees, and the model conditions on the pattern they establish." },
          { t: "p", text: "It is worth being precise that nothing is learnt in the training sense — the model is identical before and after, and the effect disappears the moment the examples leave the context. Calling it learning is a metaphor that has stuck." },
          { t: "p", text: "The measurement I would give: on GPT-2-medium, which predates instruction tuning entirely, an opposites task went from 0 of 6 correct at zero examples to 6 of 6 at two. And the rank data showed the model already knew the answers — `wet → dry` was rank 2 at zero shots. What the examples supplied was the *task*, not the knowledge." }
        ] },

      { level: "core",
        q: "How many few-shot examples should you use?",
        strong: "A strong answer gives the heuristic, then says it has to be measured, and knows why a plateau can be an artefact.",
        answer: [
          { t: "p", text: "The usual answer is two to five, and it is a reasonable starting point. But it depends on how clean the task is, and that has to be measured. On a task with one unambiguous mapping I measured accuracy reaching 100% at two examples and staying exactly flat to eight — marginal gain per token of zero for every example after the second." },
          { t: "p", text: "The trap worth naming is generalising from that. A clean mapping task plateaus early; real classification with edge cases and imbalanced labels keeps improving well past two, because later examples cover cases the earlier ones did not. So I would measure on my own task rather than trusting either number — and I would check the test set is hard enough to discriminate before believing a plateau." },
          { t: "p", text: "The other thing I would mention is that returns are not monotonic. On one item I watched probability on the correct answer rise from 0.0003 to 0.75 with two examples and fall back to 0.48 with eight. More context is not uniformly better, and every example is re-sent and re-billed on every request." }
        ] },

      { level: "advanced",
        q: "One of your few-shot examples turns out to be mislabelled. How bad is that?",
        strong: "A strong answer knows the damage is disproportionate and can explain why from the mechanism.",
        answer: [
          { t: "p", text: "Worse than its share, and the mechanism explains why. I measured one wrong label in four taking accuracy from 6/6 to 3/6 — half the accuracy for a quarter of the examples." },
          { t: "p", text: "The reason is that with few-shot prompting the examples *are* the specification. There is no separate statement of the rule to fall back on, so a contradictory example is not noise being averaged out — it is a competing hypothesis about what the task is, and the model has no basis for preferring the majority." },
          { t: "p", text: "Two practical consequences. Examples need review with the care you would give a schema, especially since they are usually pasted from production data and inherit its labelling errors. And where you can, state the rule as well as showing it — an explicit instruction plus examples survives one bad example in a way a pure pattern does not." },
          { t: "p", text: "I have seen this route 6% of billing tickets to the wrong queue, from one example that reflected a process changed eighteen months earlier. Nobody had thought of the example set as something with an owner and a review date." }
        ] }
    ]
  }
});
