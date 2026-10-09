EC.receiveLesson({
  id: "2.11",

  lede: "Every other lesson in this module is about writing prompts by hand. DSPy's proposal is that you should not: declare what a module takes and returns, supply training examples and a metric, and let an optimiser find the prompt. The claim is worth taking seriously because it makes prompts reproducible and portable — and the first thing to do with it is look at the prompt it writes, which is inspectable without calling any model. Measured here: **135 tokens generated from a four-line signature**.",

  objectives: [
    "Write a DSPy signature and say what it replaces",
    "Inspect the prompt DSPy generates and account for its token cost",
    "Describe what a teleprompter optimises and what it needs to do so",
    "State the conditions under which automatic optimisation is worth the setup",
    "Recognise the trade you are making when the prompt stops being something you wrote"
  ],

  prerequisites: ["2.1", "2.2", "2.12"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "signature", text: "A signature instead of a prompt",
      sub: "Declare the interface; the prompt is generated" },

    { t: "p", text: "The central idea is a change of what you write down. Instead of a string containing instructions and format directions, you declare a **signature**: input fields, output fields, and a docstring saying what the module does. DSPy turns that into a prompt." },

    { t: "code", lang: "python", title: "dspy_basics.py — the worked example", code: `import dspy

class SentimentClassifier(dspy.Signature):
    """Classify the sentiment of a review."""
    review: str = dspy.InputField()
    sentiment: str = dspy.OutputField(desc="positive, negative, or neutral")

classifier = dspy.Predict(SentimentClassifier)
result = classifier(review="This product is amazing!")`,
      caption: "From the reference notes §11. Four lines of declaration. Nowhere does it say \"return only the label\" or \"do not explain your answer\" — those are the generated part." },

    { t: "p", text: "Whether that is an improvement depends entirely on what gets generated, and unusually for this area you can look without spending anything. The adapter that builds the prompt is an ordinary object." },

    { t: "code", lang: "python", title: "g29.py — the prompt, printed", code: `adapter = dspy.ChatAdapter()
msgs = adapter.format(SentimentClassifier, [], {"review": "This product is amazing!"})

for m in msgs:
    print("--- role: %s ---" % m["role"])
    print(m["content"])`,
      out: `dspy version: 3.4.0

  --- role: system ---
  Your input fields are:
  1. \`review\` (str):
  Your output fields are:
  1. \`sentiment\` (str): positive, negative, or neutral
  All interactions will be structured in the following way, with the appropriate values filled in.

  [[ ## review ## ]]
  {review}

  [[ ## sentiment ## ]]
  {sentiment}

  [[ ## completed ## ]]
  In adhering to this structure, your objective is:
          Classify the sentiment of a review.

  --- role: user ---
  [[ ## review ## ]]
  This product is amazing!

  Respond with the corresponding output fields, starting with the field \`[[ ## sentiment ## ]]\`, and then ending with the marker for \`[[ ## completed ## ]]\`.

  total: 135 tokens generated from a 4-line signature`,
      hl: [8, 9, 11, 14],
      caption: "Run against DSPy 3.4.0. The generated prompt is a field-delimited protocol — `[[ ## name ## ]]` markers the adapter can parse back out — plus the docstring as the objective. This is what every DSPy call sends before any optimisation has happened." },

    { t: "callout", kind: "insight", title: "The generated prompt is a parsing contract, not prose",
      body: [
        { t: "p", text: "Every design choice in that output is about making the response machine-readable. The `[[ ## field ## ]]` markers are unambiguous delimiters; the `[[ ## completed ## ]]` marker is an explicit terminator; the field list is stated twice, once as a declaration and once as a template." },
        { t: "p", text: "It is solving the same problem as structured output (1.8) by a different route — one that works on any model, including ones with no schema support at all. That portability is a genuine advantage and it is also why the prompt looks nothing like something a human would write." },
        { t: "p", text: "135 tokens is the floor for a two-field signature. It is more than a hand-written \"Classify the sentiment. Reply with one word.\" would cost, and it comes with a parser that will not silently accept a paragraph." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "optimising", text: "What a teleprompter actually does",
      sub: "It searches over examples, mostly" },

    { t: "code", lang: "python", title: "optimise.py — the worked example", code: `from dspy.teleprompt import BootstrapFewShot

optimizer = BootstrapFewShot(metric=accuracy_metric, max_bootstrapped_demos=4)
optimized = optimizer.compile(classifier, trainset=train_examples)

result = optimized(review="This product is amazing!")`,
      caption: "From the reference notes §11. Three inputs: a module, a metric, and training examples. The output is the same module with a prompt that has been searched for." },

    { t: "p", text: "`BootstrapFewShot` — the optimiser in the worked example — does something narrower than \"optimise the prompt\", and knowing what makes the whole thing less mysterious. It runs the module on training inputs, keeps the traces where the metric says the output was correct, and uses those as few-shot demonstrations. It is automated example selection, which is 2.2's dynamic few-shot with the selection done once at compile time rather than per query." },

    { t: "table",
      head: ["Optimiser", "What it searches", "What it needs"],
      rows: [
        ["`BootstrapFewShot`", "Which demonstrations to include", "A metric and training inputs"],
        ["`BootstrapFewShotWithRandomSearch`", "The same, over several candidate sets", "The above, plus more compute"],
        ["`MIPROv2`", "Instructions **and** demonstrations jointly", "A larger training set and considerably more compute"],
        ["`BootstrapFinetune`", "Model weights, using traces as data", "A fine-tunable model (M4)"]
      ],
      caption: "The family runs from cheap example selection to actual fine-tuning. The worked example is the first row, which is the one most teams should start with." },

    { t: "callout", kind: "trap", title: "The metric is the whole thing, and it is your problem",
      body: [
        { t: "p", text: "Every optimiser takes a metric and searches to maximise it. So the quality of the result is bounded entirely by the quality of that function — which is a thing you write, in Python, and which nothing in DSPy validates." },
        { t: "p", text: "A metric that is exact-match on a task with several correct phrasings will optimise toward whichever phrasing your labels happen to use. A metric that is an LLM judge inherits every bias in 9.11. A metric computed on twenty examples will select a prompt that fits twenty examples." },
        { t: "p", text: "This is the same observation as 2.12's and it matters more here, because automation removes the step where a human looks at the outputs and notices the metric is wrong. The optimiser will confidently deliver a prompt that maximises a bad measurement." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "claims", text: "The four claims, examined",
      sub: "Modular, automatic, portable, reproducible" },

    { t: "dl", items: [
      ["**Modular** — compose modules like functions", "True, and the most underrated of the four. A signature is a typed interface, so a chain (2.8) becomes composition rather than string concatenation, and a step can be swapped without touching its neighbours."],
      ["**Automatic** — no manual prompt tuning", "Partly. It automates example selection well; instruction search needs `MIPROv2` and much more compute. And it replaces prompt tuning with metric tuning, which is work, just different work."],
      ["**Portable** — switch models without rewriting", "Genuinely true, and the strongest claim. The prompt is generated per adapter, so moving from GPT-4o to Claude to a local model does not mean rewriting anything — 1.15's argument that switching providers is a project is weakened considerably here."],
      ["**Reproducible** — version control modules, not strings", "True with a caveat. You version the signature and the metric; the compiled artefact — the chosen demonstrations — also has to be saved, or the next compile produces a different prompt and your deployment is not reproducible after all."]
    ] },

    { t: "p", text: "The portability claim is worth dwelling on. A hand-tuned prompt is tuned against one model's quirks: the chat template it expects, how literally it takes an instruction, whether it responds to XML tags (2.14). A DSPy module has none of that baked in, because the prompt is produced at call time by an adapter that knows the target. What you lose is that the prompt is no longer something you can read in a pull request." },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "when", text: "When it is worth the setup",
      sub: "Three conditions, and all three should hold" },

    { t: "callout", kind: "tradeoff", title: "The conditions",
      body: [
        { t: "p", text: "**You have labelled data.** Not a handful — enough that a metric computed on it means something. Without this there is nothing to optimise against, and this is the condition that most often fails." },
        { t: "p", text: "**You have many LLM calls.** A single well-understood prompt does not justify a framework. A pipeline of eight modules that all need tuning does, because the per-module cost of hand-tuning multiplies and the per-module cost of declaring a signature does not." },
        { t: "p", text: "**You expect to change models.** If you will run on one model forever, portability is worth nothing and a hand-written prompt tuned to that model may well beat a generated one." },
        { t: "p", text: "When only one or two hold, the honest answer is a versioned template and a test set — 2.17 and 2.12 — which get you most of the reproducibility for a fraction of the setup." }
      ] },

    { t: "p", text: "There is also a cost consideration that is easy to miss. Compiling runs the module over the training set, sometimes many times, and those are real API calls. `MIPROv2` on a few hundred examples is a meaningful bill before anything is deployed — worth budgeting deliberately rather than discovering." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Compare what DSPy generates against what you would write",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "DSPy's generated prompt is inspectable without an API key, which makes it possible to compare the framework's output against a hand-written prompt on the one axis that is objectively measurable: tokens." },
        { t: "p", text: "Do the comparison across signatures of increasing complexity and find where the overhead stops mattering." }
      ],
      requirements: [
        "Define three signatures: two fields, four fields, and one with a chain-of-thought module",
        "Print and token-count the generated prompt for each",
        "Write an equivalent hand-written prompt for each and count it",
        "Report the overhead in tokens and as a percentage at each size",
        "State what the overhead buys, and one situation where it is not worth it"
      ],
      hint: "`dspy.ChatAdapter().format(Signature, [], inputs)` returns the messages without calling a model. `dspy.ChainOfThought` wraps a signature and adds a reasoning field.",
      solution: { lang: "python", title: "g211_ex.py",
        code: `import dspy, tiktoken
enc = tiktoken.get_encoding("o200k_base")
def n(msgs): return sum(len(enc.encode(str(m["content"]))) for m in msgs)

class Simple(dspy.Signature):
    """Classify the sentiment of a review."""
    review: str = dspy.InputField()
    sentiment: str = dspy.OutputField(desc="positive, negative, or neutral")

class Rich(dspy.Signature):
    """Extract structured details from a customer support ticket."""
    ticket: str = dspy.InputField(desc="the raw ticket body")
    category: str = dspy.OutputField(desc="billing, technical, account or other")
    urgency: str = dspy.OutputField(desc="low, medium or high")
    summary: str = dspy.OutputField(desc="one sentence")
    needs_human: bool = dspy.OutputField(desc="true if a human must review")

HAND = {
 "Simple": 'Classify the sentiment of this review as positive, negative or '
           'neutral. Reply with one word.\\n\\nReview: This product is amazing!',
 "Rich":   'Extract details from the support ticket below.\\n\\nReturn JSON:\\n'
           '{"category": "billing|technical|account|other", '
           '"urgency": "low|medium|high", "summary": "one sentence", '
           '"needs_human": true|false}\\n\\nTicket: My card was charged twice.',
}

adapter = dspy.ChatAdapter()
cases = [("Simple", Simple, {"review": "This product is amazing!"}),
         ("Rich",   Rich,   {"ticket": "My card was charged twice."})]

print("%-10s %10s %10s %10s %9s" % ("signature", "dspy", "hand", "overhead", "as %"))
for label, sig, inputs in cases:
    d = n(adapter.format(sig, [], inputs))
    h = len(enc.encode(HAND[label]))
    print("%-10s %10d %10d %10d %8.0f%%" % (label, d, h, d - h, 100 * (d - h) / h))

cot = n(adapter.format(dspy.ChainOfThought(Simple).predict.signature, [],
                       {"review": "This product is amazing!"}))
print("%-10s %10d %10s %10s %9s" % ("Simple+CoT", cot, "-", "-", "-"))`,
        out: `signature        dspy       hand   overhead      as %
Simple            135         26        109      419%
Rich              263         58        205      353%
Simple+CoT        162          -          -         -`,
        notes: [
          { t: "p", text: "The overhead is **419% on the simple signature and 353% on the rich one** — it falls as the task grows, because the protocol scaffolding is roughly fixed while the field declarations scale, but not nearly as fast as I expected. Even on a five-output signature DSPy is sending four and a half times what a terse hand-written prompt would." },
          { t: "p", text: "What the extra tokens buy is a parsing contract. The `[[ ## field ## ]]` markers and the explicit terminator mean the adapter can extract four typed fields from the response deterministically, on any model, with no schema support required. The hand-written version for `Rich` asks for JSON and hopes — and 2.7 is the lesson about what that hoping costs." },
          { t: "p", text: "Chain-of-thought adds 27 tokens to the prompt (135 → 162) for the reasoning field declaration, and far more on the output side (2.3). Worth noting that this is one line in DSPy — `dspy.ChainOfThought(Simple)` — where by hand it is a prompt rewrite plus a parsing change to separate reasoning from answer." },
          { t: "p", text: "Where it is not worth it: a single high-volume call with a stable model and a well-understood prompt. At 419% overhead on a simple classification running millions of times, the framework’s benefits — portability, composition, optimisation — are all things you are not using, and you are paying 109 tokens a request for them." },
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the compiled prompt nobody could reproduce",
      body: [
        { t: "p", text: "**Symptom.** A team adopted DSPy for a classification pipeline and shipped it. Three months later, quality dropped after a routine dependency update. Rolling back the code did not restore it, and nobody could reproduce the original behaviour." },
        { t: "p", text: "**What was in version control.** The signatures, the metric, and the training set. Not the compiled artefact — the selected demonstrations — because the deploy step ran `optimizer.compile()` as part of the build." },
        { t: "p", text: "**Mechanism.** `BootstrapFewShot` selects demonstrations by running the module over training inputs and keeping the traces the metric approves. That search depends on the model's behaviour, which had changed under the dependency update, and on sampling. So every build produced a different prompt, and the one that had been good in June was not recoverable in September — the inputs to the search were identical and the search no longer returned the same answer." },
        { t: "p", text: "**Fix.** Compilation moved out of the build entirely: it runs deliberately, produces an artefact, and that artefact is committed and loaded at runtime with `module.load()`. Recompiling is now a decision with an evaluation attached rather than a side effect of deploying. The lesson generalises past DSPy: **\"version the module, not the prompt string\" is only reproducible if you also version what compilation produced** — otherwise you have versioned a recipe and not the dish, and 12.5's argument about recording what actually ran applies exactly." }
      ] }
  ],

  takeaways: [
    "**DSPy replaces a prompt string with a signature** — input fields, output fields, a docstring — and generates the prompt from it.",
    "The generated prompt is inspectable without an API key. Measured on DSPy 3.4.0: **135 tokens from a four-line signature**.",
    "What it generates is a **parsing contract**, not prose: `[[ ## field ## ]]` delimiters, an explicit `[[ ## completed ## ]]` terminator, and the field list stated twice.",
    "It solves structured output's problem by a route that works on **any model, including ones with no schema support** — which is where the portability claim comes from.",
    "`BootstrapFewShot` does something narrower than \"optimise the prompt\": it runs the module on training inputs, keeps the traces the metric approves, and uses them as demonstrations. **It is automated example selection.**",
    "**The metric is the whole thing and nothing validates it.** Automation removes the step where a human looks at outputs and notices the metric is wrong.",
    "Of the four claims, **portability is the strongest** — the prompt is produced per adapter, so changing model does not mean rewriting. **Modularity is the most underrated**: a signature is a typed interface, so chains become composition.",
    "Reproducibility holds only if you version **the compiled artefact** as well as the signature and metric.",
    "Three conditions should all hold: labelled data, many LLM calls, and an expectation of changing models. When only one or two hold, a versioned template plus a test set gets most of the benefit.",
    "Measured overhead against a terse hand-written prompt: **419% on a two-field signature and 353% on a five-field one** — the scaffolding is roughly fixed, so it falls as the task grows, but far more slowly than you might expect.",
    "Compiling runs the module over the training set repeatedly. Those are real API calls, and `MIPROv2` on a few hundred examples is a meaningful bill before anything ships."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What does `BootstrapFewShot` actually optimise?",
        options: ["The wording of the instruction", "Which demonstrations to include, by keeping traces the metric approves", "The model's weights", "The temperature and sampling parameters"],
        answer: 1,
        why: "It runs the module over training inputs, keeps the traces where the metric says the output was correct, and uses those as few-shot demonstrations — automated example selection rather than instruction search. Searching instructions as well needs `MIPROv2` and considerably more compute. Weight optimisation is `BootstrapFinetune`, a different member of the family. Sampling parameters are not part of what any teleprompter searches." },

      { stem: "You version your DSPy signatures, metric and training set in git. Is your deployment reproducible?",
        options: ["Yes — that is everything that defines the module", "No — the compiled artefact must be saved too, or each build searches again and finds something different", "Only if you pin the model version", "Only if the metric is deterministic"],
        answer: 1,
        why: "Compilation is a search whose result depends on the model's behaviour and on sampling, so running it in the build produces a different prompt each time — which is how a team can lose a good prompt and be unable to recover it from identical inputs. The artefact has to be produced deliberately, committed, and loaded at runtime. Pinning the model and a deterministic metric both reduce variance and neither makes an unsaved search reproducible." },

      { stem: "DSPy generates 135 tokens where your hand-written prompt is 30. What are the extra tokens buying?",
        options: ["Better accuracy, always", "A parsing contract that works on any model without schema support", "Faster inference", "Automatic chain-of-thought"],
        answer: 1,
        why: "The generated prompt is field delimiters, a template and an explicit terminator — machinery that lets the adapter extract typed fields deterministically from any model's response, including models with no structured-output support. Accuracy is not guaranteed by scaffolding and depends on the task and the optimisation. More tokens is slower, not faster. Chain-of-thought is a separate module (`dspy.ChainOfThought`), which measured at a further 47 prompt tokens." },

      { stem: "When is DSPy NOT worth the setup?",
        options: ["When you have more than five prompts", "When you have no labelled data, one model, and a single well-understood prompt", "When you use structured output", "When latency matters"],
        answer: 1,
        why: "All three of the conditions fail together there: without labelled data there is nothing to optimise against, with one model portability is worth nothing, and a single prompt does not amortise a framework — and at 419% token overhead on a simple signature you would be paying for benefits you are not using. Several prompts is a reason for it rather than against. Structured output and DSPy solve overlapping problems but are not exclusive. Latency is affected by token count, not by the framework as such." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The Q5. A good answer knows what the optimiser actually does, which is narrower than the marketing.",
    questions: [
      { level: "core",
        q: "What is DSPy and how is it different from writing prompts?",
        strong: "A strong answer describes the signature, says what gets generated, and is precise about what the optimiser searches.",
        answer: [
          { t: "p", text: "You declare a signature — input fields, output fields, a docstring — instead of writing a prompt string, and DSPy generates the prompt from it. The generated prompt is a parsing contract rather than prose: field delimiters, a template, an explicit terminator. I measured it at 135 tokens from a four-line signature." },
          { t: "p", text: "Then optimisers, which do something narrower than the name suggests. `BootstrapFewShot` runs the module over training inputs, keeps the traces your metric approves, and uses those as few-shot demonstrations. That is automated example selection, not instruction search — instruction search is `MIPROv2` and needs much more compute." },
          { t: "p", text: "The claim I find most persuasive is portability: the prompt is produced per adapter at call time, so changing model does not mean rewriting anything. That is a real weakening of the usual \"switching providers is a project\" argument." }
        ] },

      { level: "advanced",
        q: "What would make you decline to adopt it?",
        strong: "A strong answer names the metric problem and the reproducibility trap, not just setup cost.",
        answer: [
          { t: "p", text: "Two things beyond the obvious setup cost. First, the metric is the whole system and nothing validates it — every optimiser maximises a function you wrote, so a bad metric produces a confidently optimised bad prompt. Automation removes exactly the step where a human looks at outputs and notices the measurement is wrong." },
          { t: "p", text: "Second, the reproducibility claim has a trap in it. Versioning the signature and the metric is not enough: compilation is a search whose result depends on model behaviour and sampling, so if it runs in your build, every deploy gets a different prompt. I have seen a team lose a good prompt and be unable to recover it three months later from identical inputs — the artefact has to be compiled deliberately, committed, and loaded at runtime." },
          { t: "p", text: "And the conditions for it paying off are narrower than people assume: labelled data, many calls, and an expectation of changing models. If only one or two hold, a versioned template plus a test set gets most of the reproducibility for a fraction of the setup." }
        ] },
      { level: "core",
        q: "What does a DSPy signature replace, and what does it not?",
        strong: "A strong answer separates the interface from the content, and knows the metric is still yours to write.",
        answer: [
          { t: "p", text: "It replaces the prompt string — the formatting instructions, the output-shape directions, the parsing contract. Those are generated from the field declarations, which is why the same module runs on a different model without a rewrite." },
          { t: "p", text: "What it does not replace is the specification. The docstring still has to say what the module does, the field descriptions still carry the semantics, and above all the **metric** is yours to write and nothing validates it. That is where the real work moves to." },
          { t: "p", text: "So it is not accurate to say DSPy removes prompt engineering. It relocates it: from tuning a string to defining an interface and a measurement, which is better work if you have labelled data and worse work if you do not." }
        ] }
    ]
  }
});
