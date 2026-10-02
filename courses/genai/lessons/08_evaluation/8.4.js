EC.receiveLesson({
  id: "8.4",

  lede: "Ten benchmarks, each measuring one capability through one format. The caveats matter more than the table: **contamination** means a high score can be memorisation, **prompt sensitivity** means scores move with formatting and few-shot count, and **benchmark \u2260 your task** \u2014 which 8.1 established is the distinction that organises this whole module. A benchmark answers a model question, and almost every decision anyone actually makes is an application question.",

  objectives: [
    "Match each major benchmark to the capability and format it tests",
    "Explain contamination and what mitigates it",
    "Account for prompt sensitivity when reporting or reading a score",
    "Say why a benchmark cannot answer \u201cwhich model should we use\u201d",
    "Design a private evaluation set that does answer it"
  ],

  prerequisites: ["8.1", "8.3"],

  blocks: [

    { t: "h2", n: "01", id: "table", text: "The benchmarks",
      sub: "Capability and format together" },

    { t: "table",
      head: ["Benchmark", "Tests", "Format"],
      rows: [
        ["MMLU / MMLU-Pro", "Broad knowledge, 57 subjects", "Multiple-choice"],
        ["GSM8K", "Grade-school maths reasoning", "Numeric answer"],
        ["MATH", "Hard competition maths", "Numeric or expression"],
        ["HumanEval / MBPP", "Python code generation", "**pass@k with unit tests**"],
        ["HellaSwag / ARC / WinoGrande", "Commonsense reasoning", "Multiple-choice"],
        ["TruthfulQA", "Resistance to common falsehoods", "Multiple-choice and generation"],
        ["GPQA", "Graduate-level science, \u201cGoogle-proof\u201d", "Multiple-choice"],
        ["BBH (Big-Bench Hard)", "Hard reasoning subset", "Mixed"],
        ["MT-Bench / Arena-Hard", "Multi-turn chat quality", "**LLM judge** (8.6)"],
        ["SWE-bench", "Real GitHub issue fixes", "**Patch passes tests**"]
      ] },

    { t: "callout", kind: "insight", title: "The format column decides how gameable each one is",
      body: [
        { t: "p", text: "Multiple-choice benchmarks are scored by picking a letter, so they can be answered by pattern-matching without the underlying capability \u2014 and they are the easiest to contaminate, since a leaked question brings its answer letter with it." },
        { t: "p", text: "The three in bold are different. HumanEval, SWE-bench and MBPP are scored by **executing** the output, which puts them on the bottom rung of 8.1\u2019s ladder: exact, deterministic and unbluffable. 7.9 made the same point about verifiable rewards \u2014 a test cannot be flattered." },
        { t: "p", text: "MT-Bench and Arena-Hard sit at the other end, scored by a judge, which buys coverage of open-ended quality and imports every bias 8.6 catalogues. So the ten benchmarks span the whole ladder, and knowing which rung one sits on tells you how to read it." }
      ] },

    { t: "h2", n: "02", id: "contamination", text: "Contamination",
      sub: "A high score can be memorisation" },

    { t: "p", text: "Benchmark data leaks into training sets. The mechanism is unglamorous \u2014 these datasets are public, discussed in papers, reproduced in blog posts and GitHub repositories, and pretraining corpora are scraped from the web. A model can have seen the test." },

    { t: "callout", kind: "warn", title: "Which makes a benchmark score an upper bound on capability",
      body: [
        { t: "p", text: "You cannot generally tell memorisation from competence by looking at the score, because they produce the same number. What you can do is look for the signature: unusually high performance on an old benchmark relative to a freshly-authored one testing the same skill." },
        { t: "p", text: "7.2 gave the mechanism from the training side. Duplicated text concentrates probability mass on exact strings, so the model learns the string rather than generalising \u2014 and a benchmark question repeated across many scraped pages is exactly that case." },
        { t: "p", text: "The mitigations are the obvious ones and they are real: private held-out sets, freshly-authored questions, and canary strings that let you detect leakage after the fact. GPQA\u2019s \u201cGoogle-proof\u201d design is an attempt to build contamination resistance into the questions themselves." }
      ] },

    { t: "h2", n: "03", id: "sensitivity", text: "Prompt sensitivity",
      sub: "The score is a property of the harness too" },

    { t: "p", text: "Scores shift with formatting, few-shot count and answer-parsing. That is not a minor caveat \u2014 it means a benchmark number without its harness is not reproducible, which is why the reference says to always report the harness and settings." },

    { t: "callout", kind: "insight", title: "Answer-parsing is the part that silently dominates",
      body: [
        { t: "p", text: "A multiple-choice benchmark has to extract a letter from free text, and models produce \u201cB\u201d, \u201c(B)\u201d, \u201cThe answer is B\u201d, \u201cB. Paris\u201d and prose that never commits. A strict parser scores confident-but-unparsed answers as wrong, and a lenient one can credit a model that hedged across two options." },
        { t: "p", text: "8.3 measured the general version of this: a verifier that checks whether the gold answer appears anywhere in the output is defeated by enumerating candidates or by mentioning a value to reject it. The same holds for a benchmark parser, and `len(matches) != 1` is the fix in both cases." },
        { t: "p", text: "So two papers can report different MMLU scores for the same weights without either being wrong. `lm-eval-harness` exists to make the settings explicit, and a score quoted without one is a number whose provenance you cannot check." }
      ] },

    { t: "h2", n: "04", id: "your-task", text: "Benchmark \u2260 your task",
      sub: "The caveat that should change behaviour" },

    { t: "callout", kind: "good", title: "This is 8.1's model-versus-application distinction, concretely",
      body: [
        { t: "p", text: "MMLU\u2019s unit is an answer to a fixed multiple-choice question across 57 academic subjects. Your application\u2019s unit is an answer to a user\u2019s question over your retrieved documents. Those are different measurements, and a model two points better at the first can be worse at the second." },
        { t: "p", text: "6.1 measured a case where the model was not the variable at all: adding BM25 and rank fusion took recall@5 from 95% to 100%, improving the application without touching the weights. No benchmark could have predicted that, because the benchmark does not contain a retriever." },
        { t: "p", text: "So the practical conclusion is the one the reference states plainly: build your own eval set. A hundred prompts from your real traffic, with answers you have judged, beats every public benchmark for the decision you are making." }
      ] },

    { t: "callout", kind: "note", title: "What benchmarks are genuinely good for",
      body: [
        { t: "p", text: "Screening and sanity. If a model scores near chance on GSM8K it cannot do arithmetic reasoning, and that is worth knowing before you spend a day building an eval set around it. Benchmarks are a cheap filter on the long list." },
        { t: "p", text: "They are also the only comparison available *before* you have access, which matters for procurement. You cannot run your own eval set against a model you have not been granted, so a public score is the only evidence at that stage." },
        { t: "p", text: "And the execution-scored ones \u2014 HumanEval, SWE-bench \u2014 are more trustworthy than the rest for the reason in \u00a701: a patch either makes the tests pass or it does not, so the score resists both contamination of the answer key and judge bias, though not contamination of the solution." }
      ] },

    { t: "viz", title: "Benchmarks on 8.1's ladder", caption: "The format decides how gameable a benchmark is. Execution-scored ones resist most of it.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="Benchmarks placed on the evaluation ladder">
  <text x="16" y="22" class="s-label">HOW EACH BENCHMARK IS SCORED</text>

  <rect x="26" y="40" width="210" height="110" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="131" y="60" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">EXECUTED</text>
  <text x="42" y="82" class="s-mono" style="font-size:9px">HumanEval / MBPP</text>
  <text x="42" y="98" class="s-mono" style="font-size:9px">SWE-bench</text>
  <text x="131" y="122" text-anchor="middle" class="s-sub" style="font-size:9px">exact, unbluffable</text>
  <text x="131" y="138" text-anchor="middle" class="s-sub" style="font-size:9px">a test cannot be flattered</text>

  <rect x="262" y="40" width="210" height="110" rx="6" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="367" y="60" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">MULTIPLE CHOICE</text>
  <text x="278" y="82" class="s-mono" style="font-size:9px">MMLU \u00b7 GPQA \u00b7 ARC</text>
  <text x="278" y="98" class="s-mono" style="font-size:9px">HellaSwag \u00b7 WinoGrande</text>
  <text x="367" y="122" text-anchor="middle" class="s-sub" style="font-size:9px">easiest to contaminate</text>
  <text x="367" y="138" text-anchor="middle" class="s-sub" style="font-size:9px">parsing choice moves scores</text>

  <rect x="498" y="40" width="236" height="110" rx="6" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="616" y="60" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">JUDGE-SCORED</text>
  <text x="514" y="82" class="s-mono" style="font-size:9px">MT-Bench</text>
  <text x="514" y="98" class="s-mono" style="font-size:9px">Arena-Hard</text>
  <text x="616" y="122" text-anchor="middle" class="s-sub" style="font-size:9px">covers open-ended quality</text>
  <text x="616" y="138" text-anchor="middle" class="s-sub" style="font-size:9px">imports every 8.6 bias</text>

  <line x1="16" y1="176" x2="744" y2="176" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="200" class="s-mono" style="fill:var(--crit)">none of them contains YOUR retriever, YOUR documents or YOUR users</text>
  <text x="16" y="222" class="s-sub">6.1: adding BM25 + fusion took recall@5 from 95% to 100% with no model change</text>
  <text x="16" y="244" class="s-mono" style="fill:var(--good)">so: benchmarks screen the long list; your own eval set makes the decision</text>
  <text x="16" y="264" class="s-sub">and always report the harness \u2014 formatting, few-shot count and answer parsing all move the number</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Build the eval set that replaces the benchmark", difficulty: "core", minutes: 35,
      body: "Construct a private evaluation set for your own task from real traffic, and compare what it says about two candidate models against what public benchmarks say. Report both rankings and explain any disagreement.",
      requirements: [
        "At least 50 prompts sampled from real traffic, not invented",
        "Include the failure cases you already know about, deliberately",
        "Score with whatever method 8.1's ladder says is cheapest and adequate",
        "Report the ranking your set gives and the ranking the benchmarks give",
        "State which you would act on and why"
      ],
      hint: "Sample from real traffic rather than writing prompts. Invented prompts test what you imagine users do, which is the same mistake as trusting a benchmark.",
      solution: { lang: "python", title: "the private set, and the comparison", code: `import random, json

def build_eval_set(traffic_log, n=50, known_failures=None):
    """Stratify by query type so the set is not dominated by the common case."""
    by_type = {}
    for row in traffic_log:
        by_type.setdefault(classify(row["query"]), []).append(row)

    per_type = max(1, n // max(len(by_type), 1))
    sample = []
    for t, rows in by_type.items():
        sample += random.sample(rows, min(per_type, len(rows)))

    # deliberately include what you already know breaks
    sample += (known_failures or [])
    return sample

def score_model(model, eval_set, judge):
    """Cheapest adequate method per 8.1: deterministic where possible."""
    out = {"parses": 0, "faithful": 0, "n": len(eval_set)}
    for case in eval_set:
        answer = run(model, case["query"])
        out["parses"]   += int(schema_ok(answer))          # deterministic
        out["faithful"] += int(judge.faithful(answer, case["context"]))
    return {k: (v / out["n"] if k != "n" else v) for k, v in out.items()}

EVAL = build_eval_set(TRAFFIC, n=50, known_failures=KNOWN_BAD)
for name, m in CANDIDATES.items():
    print("%-18s %s" % (name, score_model(m, EVAL, JUDGE)))

print("\\npublic benchmark ranking :", BENCHMARK_RANKING)
print("our eval set ranking     :", our_ranking(CANDIDATES, EVAL))`,
        out: `  [shape -- run against your own traffic]

  model-a            {'parses': 0.98, 'faithful': 0.86, 'n': 57}
  model-b            {'parses': 0.91, 'faithful': 0.89, 'n': 57}

  public benchmark ranking : ['model-b', 'model-a']
  our eval set ranking     : ['model-a', 'model-b']`,
        notes: [
          { t: "p", text: "**Disagreement between the two rankings is the expected outcome, not a red flag.** The benchmark measures broad capability and your set measures your task; a model better at one can be worse at the other. If they always agreed, building the set would be wasted effort." },
          { t: "p", text: "**Report the components separately.** Here model-a parses better and model-b is more faithful, which is a real trade rather than a ranking \u2014 and which one matters depends on whether a malformed response or an unsupported claim costs you more. Collapsing them into one score hides the decision." },
          { t: "p", text: "**Stratify by query type.** An unstratified sample from traffic is dominated by the common case, so a regression on a rare-but-important query type is invisible. This is the same reasoning as checking accuracy by slice rather than in aggregate." },
          { t: "p", text: "**Include known failures deliberately.** They are the cheapest high-value cases you have, and a model that fixes them is making real progress on your problem. A random sample will usually miss them, because by definition they are rare." },
          { t: "p", text: "One honest limit: 50 prompts gives wide confidence intervals, so a small difference between models is not resolvable \u2014 the Elo arithmetic in the next lesson makes that concrete. Fifty prompts can tell you a model is clearly worse; it cannot separate two close ones, and pretending otherwise is the main way small eval sets mislead." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Read the format column before the score. Execution-scored benchmarks are exact and hard to bluff; multiple-choice ones are the easiest to contaminate and the most sensitive to answer parsing; judge-scored ones cover open-ended quality and import the judge\u2019s biases." },
        { t: "p", text: "And a benchmark answers a model question. Use them to screen a long list and to compare models you cannot yet run, then build a private set from real traffic for the decision \u2014 because none of them contains your retriever, your documents or your users." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cThis model tops MMLU and HumanEval. Should we adopt it?\u201d**" },
        { t: "p", text: "Those two tell me different amounts, and I would read them differently. HumanEval is scored by executing the output against unit tests, so it is exact and hard to bluff \u2014 a patch either passes or it does not. MMLU is multiple-choice, which is the easiest format to contaminate, since a leaked question arrives with its answer letter." },
        { t: "p", text: "So for MMLU specifically I would want the harness and settings, because scores move with formatting, few-shot count and answer parsing. Extracting a letter from free text is genuinely ambiguous \u2014 models produce \u2018B\u2019, \u2018(B)\u2019, \u2018The answer is B\u2019 and prose that never commits \u2014 and a strict parser and a lenient one give different numbers for the same weights." },
        { t: "p", text: "But the main thing is that neither answers the question being asked. A benchmark measures broad capability; we would be deciding whether it answers our users\u2019 questions over our documents with our retriever. I have seen a case where the model was not the variable at all \u2014 adding BM25 and rank fusion took retrieval recall@5 from 95% to 100% without touching the weights, and no benchmark could have predicted that." },
        { t: "p", text: "What I would do is use the benchmarks exactly as a screen. If a model were near chance on GSM8K I would drop it without further work. Past that filter, I would build fifty to a hundred prompts from real traffic, stratified by query type and deliberately including the failures we already know about, and score them with the cheapest adequate method." },
        { t: "p", text: "And I would expect the two rankings to disagree, which is the point rather than a problem. If a private eval set always agreed with the public benchmarks there would be no reason to build it." },
        { t: "p", text: "One caution I would state up front: fifty prompts can tell us a model is clearly worse and cannot separate two close ones. So I would frame the output as a filter plus a judgement, not as a decisive number \u2014 and the real decision comes from an A/B on live traffic, which is the only ground truth." }
      ] }
  ],

  takeaways: [
    "**Read the format column before the score** \u2014 it decides how gameable a benchmark is.",
    "**Execution-scored benchmarks are the most trustworthy** (HumanEval, MBPP, SWE-bench): a test cannot be flattered, which puts them on the exact rung of 8.1's ladder.",
    "**Multiple-choice is the easiest to contaminate**, because a leaked question brings its answer letter with it.",
    "**Judge-scored benchmarks cover open-ended quality and import every bias in 8.6**, so MT-Bench and Arena-Hard need reading as judgements.",
    "**Contamination makes a score an upper bound on capability**, and memorisation is indistinguishable from competence in the number itself.",
    "**The signature to look for is strong performance on an old benchmark against a freshly-authored one** testing the same skill.",
    "**Answer-parsing silently dominates prompt sensitivity** \u2014 extracting a letter from free text is ambiguous, and strict versus lenient parsers give different scores for identical weights.",
    "**So a benchmark number without its harness is not reproducible**, which is why `lm-eval-harness` settings belong in any report.",
    "**No benchmark contains your retriever, your documents or your users**, so none can answer \u201cwhich model should we use\u201d.",
    "**Benchmarks screen the long list** and are the only evidence available before you have access to a model.",
    "**Build a private set of 50\u2013100 real prompts**, stratified by query type and deliberately including known failures.",
    "**Expect the two rankings to disagree** \u2014 if a private set always agreed with public benchmarks, building it would be wasted effort."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why are HumanEval and SWE-bench considered more trustworthy than MMLU?",
        options: [
          "They are newer and therefore less likely to be contaminated",
          "They are scored by executing the output against tests, which is exact and cannot be bluffed \u2014 unlike picking a letter, which can be pattern-matched",
          "They use larger evaluation sets with tighter confidence intervals",
          "They are judged by humans rather than automatically"
        ],
        answer: 1,
        why: "Execution puts them on the exact rung of the evaluation ladder: a patch makes the tests pass or it does not, so there is no room for a confident wrong answer to score well. Multiple-choice scoring can be satisfied by pattern-matching without the underlying capability, and a leaked question carries its answer letter. Note that execution resists contamination of the answer key but not contamination of the solution \u2014 a memorised patch still passes." },

      { stem: "Two papers report different MMLU scores for the same model weights. What is the most likely explanation?",
        options: [
          "One of them made an arithmetic error in computing accuracy",
          "Different harness settings \u2014 formatting, few-shot count, and especially answer-parsing, since extracting a letter from free text is ambiguous",
          "Benchmark contamination affected one evaluation and not the other",
          "The model is non-deterministic at temperature zero"
        ],
        answer: 1,
        why: "Scores are a property of the harness as well as the model. Models answer with \"B\", \"(B)\", \"The answer is B\" or prose that never commits, so a strict parser marks confident-but-unparsed answers wrong while a lenient one may credit a hedge across two options. This is the same structural problem as a verifier that checks whether the gold answer appears anywhere in the output, and it is why the harness and its settings belong in any reported score." },

      { stem: "A model is two points better on MMLU than your current one. What does that tell you about your RAG application?",
        options: [
          "That it will likely perform about two points better on your task as well",
          "Very little \u2014 MMLU's unit is a fixed multiple-choice question and yours is an answer over retrieved documents, so a model better at one can be worse at the other",
          "Nothing, because MMLU is contaminated and therefore meaningless",
          "That retrieval quality will improve, since better models write better queries"
        ],
        answer: 1,
        why: "The units differ, which is the model-versus-application distinction. A benchmark contains no retriever, no documents of yours and no users, so it cannot speak to the system a user experiences \u2014 and in one measured case the model was not the variable at all, with BM25 plus rank fusion taking recall@5 from 95% to 100% with unchanged weights. Contamination is a separate real concern that does not make benchmarks meaningless; they remain a useful screen." },

      { stem: "What is the main limitation of a 50-prompt private eval set?",
        options: [
          "It cannot be scored automatically and therefore needs humans",
          "Wide confidence intervals \u2014 it can show a model is clearly worse but cannot separate two close candidates",
          "It will be contaminated once the prompts are sent to a hosted model",
          "It cannot be stratified across query types at that size"
        ],
        answer: 1,
        why: "Fifty cases give a coarse estimate, so a small difference between models is not resolvable and treating it as decisive is the main way small eval sets mislead \u2014 the Elo arithmetic in the next lesson makes the required sample sizes concrete. It remains highly valuable as a filter and for catching known failures, and it should still be stratified by query type, since an unstratified sample is dominated by the common case." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Benchmarks, and the decision they cannot make",
    questions: [
      { level: "core",
        q: "What are the main problems with LLM benchmarks?",
        strong: "A strong answer names three and ranks them by consequence.",
        answer: [
          { t: "p", text: "Three, and the third matters most. Contamination \u2014 these datasets are public, discussed in papers and reproduced across the web, and pretraining corpora are scraped from the web, so a model can have seen the test. That makes a score an upper bound on capability, and memorisation is indistinguishable from competence in the number itself." },
          { t: "p", text: "Prompt sensitivity \u2014 scores move with formatting, few-shot count and answer parsing. Extracting a letter from free text is genuinely ambiguous, so a strict parser and a lenient one give different scores for identical weights. That is why the harness and settings belong in any report." },
          { t: "p", text: "And benchmark not equal to your task, which is the one that should change behaviour. MMLU\u2019s unit is a fixed multiple-choice question; a production system\u2019s unit is an answer over retrieved documents. A model two points better on the first can be worse on the second." },
          { t: "p", text: "I would also read the format column before the score. Execution-scored benchmarks like HumanEval and SWE-bench are exact and hard to bluff; multiple-choice is the most contaminable; MT-Bench and Arena-Hard are judge-scored and carry the judge\u2019s biases. Knowing which rung a benchmark sits on tells you how much weight it bears." }
        ] },

      { level: "core",
        q: "How would you choose between two models for your product?",
        strong: "A strong answer uses benchmarks as a screen and a private set for the decision.",
        answer: [
          { t: "p", text: "Benchmarks to screen, a private eval set to decide, and an A/B to confirm. The benchmarks are a cheap filter \u2014 a model near chance on GSM8K cannot do arithmetic reasoning and I can drop it before spending a day on it." },
          { t: "p", text: "Then fifty to a hundred prompts sampled from real traffic, stratified by query type so a rare-but-important case is not drowned by the common one, and deliberately including the failures we already know about. Those are the cheapest high-value cases there are, and a random sample will usually miss them because they are rare by definition." },
          { t: "p", text: "I would score with the cheapest adequate method and report components separately rather than collapsing them. In practice you often find a real trade \u2014 one model formats more reliably and the other is more faithful \u2014 and which matters depends on whether a malformed response or an unsupported claim costs more." },
          { t: "p", text: "And I would be explicit that fifty prompts can show a model is clearly worse but cannot separate two close ones. So the honest output is a filter plus a judgement, with the actual decision coming from live traffic \u2014 which is the only ground truth." }
        ] },

      { level: "advanced",
        q: "How would you detect benchmark contamination?",
        strong: "A strong answer accepts you cannot prove it and looks for the signature.",
        answer: [
          { t: "p", text: "You generally cannot prove it from the score, because memorisation and competence produce the same number. What you can do is look for the signature: unusually strong performance on an older, widely-reproduced benchmark relative to a freshly-authored set testing the same skill." },
          { t: "p", text: "The cleanest version of that is to write new questions yourself in the same format and compare. A large gap between the public benchmark and your fresh equivalent is the evidence, and it also happens to be the eval set you wanted anyway." },
          { t: "p", text: "Canary strings are the preventative approach \u2014 embed a distinctive token in the dataset so you can later test whether a model has seen it. And GPQA\u2019s \u2018Google-proof\u2019 design is an attempt to build resistance into the questions themselves, by making them hard to answer even with the text in front of you." },
          { t: "p", text: "Mechanistically it is the duplication problem from pretraining. Text appearing many times is learned as a string rather than generalised from, which is also why deduplication matters so much in corpus construction \u2014 a benchmark question repeated across hundreds of scraped pages is precisely that case." }
        ] }
    ]
  }
});
