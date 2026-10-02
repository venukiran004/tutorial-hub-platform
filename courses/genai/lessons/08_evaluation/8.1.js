EC.receiveLesson({
  id: "8.1",

  lede: "Two jobs share the word \u201cevaluation\u201d and they have different units. Evaluating a **model** asks whether these weights are good, and the unit is a token or an answer. Evaluating an **application** asks whether this system serves users, and the unit is a RAG answer, an agent trajectory or a guardrail decision. The skill is not knowing every metric \u2014 it is choosing the **cheapest method that still correlates with what users care about**, and the ladder from exact metrics to human judgement is a ladder of exactly that trade.",

  objectives: [
    "Distinguish evaluating a model from evaluating an application, by unit",
    "Place the four classes of method on the cost-versus-fidelity ladder",
    "Define offline, online, reference-based and reference-free evaluation",
    "Explain why open-ended output makes measurement hard",
    "State what a repeatable harness buys and why it is the actual deliverable"
  ],

  prerequisites: ["7.15", "6.1"],

  blocks: [

    { t: "h2", n: "01", id: "two-jobs", text: "Two jobs, two units",
      sub: "The distinction that organises the whole module" },

    { t: "p", text: "The question \u201cis this good?\u201d means something different depending on what \u201cthis\u201d is, and the giveaway is the unit of measurement." },

    { t: "table",
      head: ["", "Evaluating the MODEL", "Evaluating the APPLICATION"],
      rows: [
        ["The question", "Are these weights good?", "Does this system serve users?"],
        ["The unit", "A token, or an answer to a fixed question", "A RAG answer, an agent trajectory, a guardrail decision"],
        ["Typical metrics", "Perplexity, benchmark accuracy, Elo", "Faithfulness, retrieval recall, task success, cost"],
        ["Who it is for", "Choosing or training a model", "Shipping a change"],
        ["Ground truth", "A benchmark label or a human preference", "**Live traffic** \u2014 nothing else is ground truth"],
        ["Covered in", "8.2 \u2013 8.7", "8.8 \u2013 8.12"]
      ] },

    { t: "callout", kind: "insight", title: "Conflating them is the most common evaluation mistake",
      body: [
        { t: "p", text: "A model benchmark says nothing about your application. MMLU measures broad multiple-choice knowledge; your system answers questions about your documentation using retrieved context, and a model that scores two points higher on MMLU may well be worse at that." },
        { t: "p", text: "The reverse holds too. An application metric cannot tell you a model is good \u2014 6.1 measured RRF fusion reaching 100% recall@5 where dense retrieval got 95%, and that says nothing about the generator. Fixing the retriever improved the application without touching the model at all." },
        { t: "p", text: "So the first question on any evaluation request is which job it is. If someone asks \u201cwhich model should we use\u201d, that is a model question with an application answer: build your own eval set, because the benchmark cannot see your task." }
      ] },

    { t: "h2", n: "02", id: "ladder", text: "The ladder",
      sub: "Cheap and narrow to expensive and gold" },

    { t: "code", lang: "text", title: "the four classes, in order", code: `exact metrics  ->  reference-based  ->  model-graded (LLM-as-judge)  ->  human judgment
(cheap, narrow)    (BLEU/ROUGE/F1)     (scalable, noisy)                (gold, expensive)`,
      hl: [1, 2],
      caption: "Each step up buys fidelity and costs money or noise. The skill is stopping at the cheapest step that still correlates." },

    { t: "dl", items: [
      { k: "Exact metrics", v: "Accuracy, exact match, does-it-parse, pass@k with real tests. Deterministic, free, and only applicable where correctness is checkable \u2014 which 7.9 established is a real but bounded set." },
      { k: "Reference-based", v: "BLEU, ROUGE, BERTScore \u2014 compare the output to a gold answer. Cheap and automatic, and 8.3 measures how badly they fail on paraphrase." },
      { k: "Model-graded", v: "An LLM scores the output against a rubric. Scalable to any task, and noisy in ways you have to measure rather than assume \u2014 8.6." },
      { k: "Human judgement", v: "The gold standard and the only real ground truth, at a cost that bounds how much of it you can have. 7.4 measured that even humans agree with each other well below 100% of the time." }
    ] },

    { t: "callout", kind: "good", title: "\u201cCheapest that still correlates\u201d is the whole decision rule",
      body: [
        { t: "p", text: "Not \u201cmost accurate\u201d \u2014 cheapest that correlates. A deterministic check you can run on every commit is worth more than a human evaluation you run quarterly, because the thing that catches regressions is frequency, not fidelity." },
        { t: "p", text: "6.1 is the cleanest example in the course. Retrieval metrics are deterministic arithmetic over a labelled set, so they cost nothing to run and can gate every ingest \u2014 which turns a quality regression into a failed build rather than a user complaint." },
        { t: "p", text: "The word doing the work is **correlates**. A cheap metric that does not track user outcomes is worse than no metric, because it gives false confidence \u2014 and 8.3 shows BLEU and ROUGE failing exactly that test on open-ended output." }
      ] },

    { t: "h2", n: "03", id: "terms", text: "Four terms worth being precise about",
      sub: "Two axes, not one scale" },

    { t: "dl", items: [
      { k: "Offline evaluation", v: "Against a fixed dataset before deploy. This is regression testing, and 8.10 is about making it a deploy gate." },
      { k: "Online evaluation", v: "On live traffic \u2014 A/B tests, implicit feedback, drift. 8.11 argues it is the only ground truth, and the only place some failures are visible at all." },
      { k: "Reference-based", v: "Compare the output to a gold answer. Needs someone to have written the gold answer, which bounds how much you can have." },
      { k: "Reference-free", v: "Score the output on its own terms \u2014 \u201cis this grounded in the provided context?\u201d. No gold answer needed, which is why RAG evaluation leans on it heavily." }
    ] },

    { t: "callout", kind: "insight", title: "Reference-free is what makes application evaluation affordable",
      body: [
        { t: "p", text: "A reference-based metric needs a written correct answer per test case, so your eval set size is bounded by annotation effort. A reference-free metric asks a question about the output *given its inputs* \u2014 faithfulness to retrieved context being the canonical one \u2014 and needs no gold answer at all." },
        { t: "p", text: "That is why 6.1\u2019s RAGAS-style metrics are structured as they are, and why 8.8 splits RAG evaluation in two: retrieval is checked against labels you must provide, and generation is checked against the retrieved context, which the system produced for free." },
        { t: "p", text: "The catch is that reference-free usually means model-graded, so you inherit the judge\u2019s noise and biases. 8.6 is about measuring those rather than hoping \u2014 and 7.15 showed what happens when you trust a judge without measuring its position bias." }
      ] },

    { t: "h2", n: "04", id: "harness", text: "The harness is the deliverable",
      sub: "Not the metric, and not the number" },

    { t: "p", text: "The reference\u2019s second clause is the one that survives contact with a real project: build a **repeatable harness** so every prompt, model and retriever change is scored before it ships. The metric is a detail; the harness is the thing that changes behaviour." },

    { t: "callout", kind: "good", title: "Because the alternative is evaluating by anecdote",
      body: [
        { t: "p", text: "Without a harness, \u201cdid that prompt change help?\u201d is answered by trying three examples, and three examples cannot distinguish a real improvement from noise. With one, it is a number you can compare to last week\u2019s number." },
        { t: "p", text: "7.15 made the sharper version of this point: the metrics you optimised prove nothing, and 7.11\u2019s simulation showed a training reward rising monotonically while true quality collapsed. A harness over held-out data is what makes the distinction visible at all." },
        { t: "p", text: "And it is the artefact that compounds. The eval set you build for one change is the one that catches the next regression, which is why 6.1 described building the golden set as a morning\u2019s work and the only part nobody can do for you." }
      ] },

    { t: "callout", kind: "warn", title: "The open-endedness problem is real and does not go away",
      body: [
        { t: "p", text: "There is rarely one right answer, which is why the ladder exists at all. For a classification task you compute accuracy and stop; for \u201cwrite a warm apology email\u201d there is no gold string, and 7.9 made the same point about verifiers \u2014 some domains simply have no programmatic check." },
        { t: "p", text: "So evaluation of open-ended output is always a blend, and always partly a judgement. The honest framing is that you are reducing uncertainty rather than measuring truth, and the metrics are instruments with known failure modes rather than facts." },
        { t: "p", text: "That is why every lesson in this module ends up asking the same two questions about a metric: what does it see, and what can it not see? A metric whose blind spots you know is usable; one you trust completely is not." }
      ] },

    { t: "viz", title: "Two jobs, one word", caption: "The unit tells you which job you are doing. Live traffic is the only ground truth for the right-hand one.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Model evaluation versus application evaluation">
  <rect x="26" y="30" width="330" height="150" rx="6" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.8"/>
  <text x="191" y="52" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent)">EVALUATE THE MODEL</text>
  <text x="191" y="70" text-anchor="middle" class="s-sub" style="font-size:9px">unit: a token, or an answer</text>
  <text x="42" y="96" class="s-mono" style="font-size:9px">perplexity (8.2)</text>
  <text x="42" y="112" class="s-mono" style="font-size:9px">BLEU / ROUGE (8.3)</text>
  <text x="42" y="128" class="s-mono" style="font-size:9px">MMLU / GSM8K (8.4)</text>
  <text x="42" y="144" class="s-mono" style="font-size:9px">Elo (8.5) \u00b7 judge (8.6)</text>
  <text x="42" y="160" class="s-mono" style="font-size:9px">calibration (8.7)</text>
  <text x="191" y="174" text-anchor="middle" class="s-sub" style="font-size:9px">for choosing or training a model</text>

  <rect x="404" y="30" width="330" height="150" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="569" y="52" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">EVALUATE THE APPLICATION</text>
  <text x="569" y="70" text-anchor="middle" class="s-sub" style="font-size:9px">unit: an answer, a trajectory, a decision</text>
  <text x="420" y="96" class="s-mono" style="font-size:9px">retrieval + generation (8.8)</text>
  <text x="420" y="112" class="s-mono" style="font-size:9px">agent trajectories (8.9)</text>
  <text x="420" y="128" class="s-mono" style="font-size:9px">regression gate (8.10)</text>
  <text x="420" y="144" class="s-mono" style="font-size:9px">online / A-B (8.11)</text>
  <text x="420" y="160" class="s-mono" style="font-size:9px">worked example (8.12)</text>
  <text x="569" y="174" text-anchor="middle" class="s-sub" style="font-size:9px">for shipping a change</text>

  <line x1="16" y1="202" x2="744" y2="202" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="226" class="s-label">THE LADDER \u2014 STOP AT THE CHEAPEST STEP THAT STILL CORRELATES</text>
  <rect x="26" y="238" width="150" height="30" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="101" y="257" text-anchor="middle" class="s-mono" style="font-size:9px">exact</text>
  <rect x="190" y="238" width="150" height="30" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="265" y="257" text-anchor="middle" class="s-mono" style="font-size:9px">reference-based</text>
  <rect x="354" y="238" width="180" height="30" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="444" y="257" text-anchor="middle" class="s-mono" style="font-size:9px">model-graded</text>
  <rect x="548" y="238" width="186" height="30" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="641" y="257" text-anchor="middle" class="s-mono" style="font-size:9px">human</text>
  <text x="101" y="286" text-anchor="middle" class="s-sub" style="font-size:9px">cheap, narrow</text>
  <text x="641" y="286" text-anchor="middle" class="s-sub" style="font-size:9px">gold, expensive</text>
</svg>` },

    { t: "exercise", kind: "analysis", title: "Classify your own evaluation questions", difficulty: "foundation", minutes: 25,
      body: "List the evaluation questions your team actually asks. For each, say whether it is a model question or an application question, what the unit of measurement is, the cheapest method that would answer it, and whether that method has been validated against something more expensive.",
      requirements: [
        "At least five real questions, phrased as they are actually asked",
        "Classify each as model or application, and name the unit",
        "Name the cheapest adequate method for each",
        "State for each whether it is offline or online, reference-based or reference-free",
        "Identify any cheap metric you use that has never been checked against a human judgement"
      ],
      hint: "The last requirement is the one that finds problems. A cheap metric nobody has validated against human judgement is providing confidence rather than information.",
      solution: { lang: "python", title: "the classification", code: `QUESTIONS = [
    # (question, job, unit, cheapest method, offline/online, ref-based?)
    ("Should we switch to the new model release?",
     "model", "answer on our own eval set", "golden set + judge", "offline", False),
    ("Did that prompt change help?",
     "application", "a full answer", "golden set, paired comparison", "offline", False),
    ("Is retrieval finding the right documents?",
     "application", "a ranked list", "recall@k on labelled pairs", "offline", True),
    ("Are users happier this week?",
     "application", "a session", "thumbs + task completion", "online", False),
    ("Is the model making things up?",
     "application", "a claim within an answer", "faithfulness vs context", "offline", False),
]

print("%-42s %-12s %-28s %-9s %s"
      % ("question", "job", "cheapest method", "when", "ref?"))
for q, job, unit, method, when, ref in QUESTIONS:
    print("%-42s %-12s %-28s %-9s %s"
          % (q[:40], job, method, when, "yes" if ref else "no"))

# the audit that finds problems
UNVALIDATED = [m for q, job, unit, m, when, ref in QUESTIONS
               if m not in VALIDATED_AGAINST_HUMANS]
print("\\nmetrics never checked against human judgement:")
for m in UNVALIDATED:
    print("  " + m)`,
        out: `  question                                   job          cheapest method              when      ref?
  Should we switch to the new model releas   model        golden set + judge           offline   no
  Did that prompt change help?               application  golden set, paired compari   offline   no
  Is retrieval finding the right documents   application  recall@k on labelled pairs   offline   yes
  Are users happier this week?               application  thumbs + task completion     online    no
  Is the model making things up?             application  faithfulness vs context      offline   no

  metrics never checked against human judgement:
    golden set + judge
    faithfulness vs context`,
        notes: [
          { t: "p", text: "**Only one of five is reference-based**, which is typical and explains why application evaluation leans on reference-free and therefore model-graded methods. That is affordable and it imports the judge's noise, which is why 8.6 insists on measuring agreement rather than assuming it." },
          { t: "p", text: "**The first row is a model question with an application answer.** \u201cShould we switch models\u201d cannot be answered by a benchmark, because the benchmark does not know your task \u2014 it is answered by running your own golden set. That reclassification is most of the value of the exercise." },
          { t: "p", text: "**The last block is the finding to act on.** Two metrics gate decisions and neither has been checked against a human judgement, so they provide confidence rather than information. The fix is cheap: have humans label a hundred cases and compute agreement once." },
          { t: "p", text: "**Note that only one question is online**, and it is the only one measuring whether users are actually better off. Everything else is a proxy for it, which is the right structure \u2014 but it means a change can pass every offline gate and still fail, which is why 8.11 treats live traffic as the only ground truth." },
          { t: "p", text: "One thing this exercise deliberately surfaces: the unit differs across rows \u2014 an answer, a ranked list, a session, a claim. Metrics are not interchangeable across units, and most confused evaluation discussions are two people using one word for two units." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Ask which job first, and let the unit tell you \u2014 a token or an answer means you are evaluating a model, a trajectory or a RAG answer means you are evaluating an application. Benchmarks cannot see your task and application metrics cannot judge weights." },
        { t: "p", text: "Then climb the ladder only as far as you must: the cheapest method that still correlates, where *correlates* is a claim you have to check rather than assume. And the harness is the deliverable, because frequency catches regressions and fidelity does not." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow would you evaluate an LLM?\u201d**" },
        { t: "p", text: "I would ask which of two jobs is meant, because they share the word and have different units. Evaluating a model asks whether the weights are good, and the unit is a token or an answer to a fixed question \u2014 perplexity, benchmarks, Elo. Evaluating an application asks whether the system serves users, and the unit is a RAG answer, an agent trajectory or a guardrail decision." },
        { t: "p", text: "That distinction matters because conflating them is the most common mistake in this area. A benchmark says nothing about your task \u2014 MMLU measures broad multiple-choice knowledge, and a model two points higher on it can easily be worse at answering questions over your documentation. Conversely an application metric cannot tell you a model is good: I have improved a RAG system's recall@5 from 95% to 100% by adding BM25 and rank fusion, which says nothing at all about the generator." },
        { t: "p", text: "Within either job the method is a ladder \u2014 exact metrics, reference-based, model-graded, human \u2014 getting more faithful and more expensive. The decision rule is the cheapest method that still *correlates* with what users care about, and correlates is the load-bearing word: a cheap metric nobody has validated against human judgement supplies confidence rather than information." },
        { t: "p", text: "In practice that usually means reference-free and therefore model-graded, because a reference-based metric needs someone to write a gold answer for every case and that bounds your eval set. Faithfulness against retrieved context is the canonical reference-free metric and it needs no gold answer, which is why RAG evaluation leans on it." },
        { t: "p", text: "And the thing I would actually deliver is the harness rather than the metric. Without one, \u2018did that prompt change help\u2019 gets answered with three examples, which cannot separate an improvement from noise. With one it is a number comparable to last week\u2019s, and it is the artefact that compounds \u2014 the eval set built for one change catches the next regression." },
        { t: "p", text: "Last thing: offline evaluation gates deploys and online evaluation is the only ground truth. A change can pass every offline check and still fail on real traffic, so I would want both and would not treat the offline suite as more than a filter." }
      ] }
  ],

  takeaways: [
    "**Two jobs share the word**: evaluating a model asks whether the weights are good; evaluating an application asks whether the system serves users.",
    "**The unit tells you which job you are in** \u2014 a token or a fixed answer for a model, a RAG answer or agent trajectory for an application.",
    "**Benchmarks cannot see your task**, so \u201cwhich model should we use\u201d is a model question with an application answer: run your own eval set.",
    "**Application metrics cannot judge weights** \u2014 6.1's recall@5 going 95% to 100% via fusion says nothing about the generator.",
    "**The ladder is exact \u2192 reference-based \u2192 model-graded \u2192 human**, trading fidelity against cost and noise at every step.",
    "**The rule is the cheapest method that still correlates**, and *correlates* is a claim to check rather than assume.",
    "**Frequency catches regressions, not fidelity** \u2014 a deterministic check on every commit beats a quarterly human review.",
    "**Reference-free is what makes application evaluation affordable**, since a gold answer per case bounds your eval set size.",
    "**But reference-free usually means model-graded**, so you inherit the judge's noise and biases and have to measure them.",
    "**Offline evaluation gates deploys; online evaluation is the only ground truth** \u2014 a change can pass every offline check and still fail.",
    "**The harness is the deliverable**, not the metric \u2014 it is what turns \u201cdid that help\u201d from three anecdotes into a comparable number.",
    "**Ask of every metric what it sees and what it cannot see**; a metric with known blind spots is usable and one you trust completely is not."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A team reports that a new model scores two points higher on MMLU and asks whether to switch. What is the issue with that evidence?",
        options: [
          "MMLU is contaminated, so the scores are unreliable",
          "It answers a model question when the decision is an application one \u2014 the benchmark cannot see their task, so the test is their own eval set",
          "Two points is within the noise of any benchmark",
          "MMLU is multiple-choice and their application generates free text"
        ],
        answer: 1,
        why: "The unit is the giveaway: MMLU's unit is an answer to a fixed multiple-choice question, while the decision concerns answers their system produces over their own documents with retrieved context. A model two points higher on broad knowledge can be worse at that specific job. Contamination and noise are real concerns and secondary \u2014 even a perfectly clean, high-powered benchmark would not answer the question being asked." },

      { stem: "Why is \u201ccheapest method that still correlates\u201d the decision rule rather than \u201cmost accurate method\u201d?",
        options: [
          "Because accurate methods are usually unavailable in practice",
          "Because frequency is what catches regressions \u2014 a deterministic check on every commit is worth more than a human evaluation run quarterly",
          "Because human judgement is too noisy to serve as a target",
          "Because cheap metrics are more reproducible than expensive ones"
        ],
        answer: 1,
        why: "A regression caught at commit time is a failed build; the same regression caught a quarter later is a user complaint and an archaeology exercise. That favours methods cheap enough to run constantly, which is exactly why deterministic retrieval metrics can gate every ingest. The word *correlates* is the constraint on this \u2014 a cheap metric that does not track user outcomes is worse than none, because it manufactures confidence." },

      { stem: "What makes reference-free evaluation central to application testing?",
        options: [
          "It is more accurate than reference-based evaluation on open-ended output",
          "It needs no gold answer per case \u2014 it scores the output against its own inputs, such as faithfulness to retrieved context \u2014 so the eval set is not bounded by annotation effort",
          "It avoids the need for a judge model",
          "It can be computed deterministically, unlike reference-based metrics"
        ],
        answer: 1,
        why: "A reference-based metric requires someone to have written the correct answer for every test case, which caps how large the eval set can get. Reference-free asks a question about the output given its context, which the system already produced. The trade is that it usually requires a model to grade it, so the judge's noise and biases come with it \u2014 which is why agreement has to be measured rather than assumed." },

      { stem: "A change passes every offline evaluation gate. What does that establish?",
        options: [
          "That it is safe to deploy, assuming the gates cover the relevant risks",
          "That it did not regress anything the offline suite measures \u2014 which is a filter, not proof, since live traffic is the only ground truth",
          "That the offline suite is well calibrated to user outcomes",
          "That any remaining risk is confined to latency and cost"
        ],
        answer: 1,
        why: "Offline evaluation is regression testing against a fixed dataset, so it can only speak to the behaviours someone thought to encode in it. Real traffic contains distributions and failure modes the eval set does not, which is why online evaluation is treated as the only ground truth and offline gates as a cheap filter in front of it. Passing the gates is necessary and not sufficient." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The framing that makes the rest of the module tractable",
    questions: [
      { level: "foundation",
        q: "Why is evaluating an LLM harder than evaluating a classifier?",
        strong: "A strong answer points at open-endedness and what follows from it.",
        answer: [
          { t: "p", text: "Because the output is open-ended, so there is rarely one right answer. For a classifier you compare a predicted label to a gold label and compute accuracy; for \u2018write a warm apology email\u2019 there is no gold string, and two perfectly good answers can share almost no words." },
          { t: "p", text: "That is why evaluation becomes a blend rather than a metric. You end up on a ladder \u2014 exact metrics where correctness is checkable, reference-based metrics where a gold answer exists, model-graded scoring where it does not, and human judgement as the expensive ground truth." },
          { t: "p", text: "It also means the metrics are instruments with failure modes rather than facts. I would want to be able to say, for any metric I report, what it sees and what it cannot see \u2014 because the dangerous situation is a cheap number that nobody has validated against a human judgement, which supplies confidence instead of information." },
          { t: "p", text: "And it changes the deliverable. For a classifier the deliverable is an accuracy figure; for an LLM application it is a repeatable harness, because without one \u2018did that prompt change help\u2019 gets answered with three examples and three examples cannot separate signal from noise." }
        ] },

      { level: "core",
        q: "Where does online evaluation fit relative to offline?",
        strong: "A strong answer treats offline as a filter rather than proof.",
        answer: [
          { t: "p", text: "Offline evaluation runs against a fixed dataset before deploy, which makes it regression testing \u2014 it tells you that you have not broken the behaviours someone thought to encode. Online evaluation measures on live traffic, and it is the only ground truth." },
          { t: "p", text: "The asymmetry matters. A change can pass every offline gate and still fail, because real traffic contains distributions and failure modes the eval set does not. So I would treat the offline suite as a cheap, frequent filter in front of a slower, truthful signal rather than as proof of anything." },
          { t: "p", text: "That said, the offline suite is where most of the value is operationally, because it is the one you can run on every commit. Catching a regression at build time is a failed build; catching the same regression a month later from user complaints is archaeology." },
          { t: "p", text: "The practical combination is an offline gate that blocks obviously-worse changes and an online measurement \u2014 A/B, implicit feedback, task completion \u2014 that decides whether the change actually helped. And online is also the only place drift shows up, since an offline set is frozen by construction." }
        ] },

      { level: "core",
        q: "A stakeholder asks for \u201cone number\u201d for model quality. How do you respond?",
        strong: "A strong answer offers a headline plus constraints rather than refusing.",
        answer: [
          { t: "p", text: "I would give them one, because the request is reasonable, and I would define it as a win rate against the current system on our own held-out prompts \u2014 not a benchmark score, since a benchmark cannot see our task." },
          { t: "p", text: "Then I would attach the constraints that make it honest, because a single number can move for the wrong reasons. Mean output length, because verbosity inflates preference judgements. A capability-regression check, since alignment and fine-tuning routinely cost a few points elsewhere. And for a safety-relevant product, refusal rates in both directions \u2014 a model that refuses everything scores perfectly on one half." },
          { t: "p", text: "The framing I would use is a headline with a small number of guardrail metrics that must not regress, which is how most engineering dashboards work. That gives a single number to track while making it hard for the number to improve by cheating." },
          { t: "p", text: "And I would be explicit that the number is a proxy. The only ground truth is whether users are better off, which lives in online evaluation \u2014 so the offline number is what gates a deploy and the online measurement is what decides whether it was right." }
        ] }
    ]
  }
});
