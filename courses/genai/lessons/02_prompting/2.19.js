EC.receiveLesson({
  id: "2.19",

  lede: "The reference closes its prompting material with a failure-mode table and a debugging procedure, and the procedure's fourth step is \"try different phrasing — models are sensitive to wording\". That is true and it understates the case. Measured here: the same four examples with six different separators give between **1 and 6 correct of 6** — and moving the instruction to the end, which the reference recommends as a fix, took a working prompt from 6 of 6 to **0 of 6**.",

  objectives: [
    "Diagnose a failing prompt against the reference's failure-mode table",
    "Quantify how much a formatting choice can change an outcome",
    "Follow a debugging procedure that checks cheap causes first",
    "Explain why moving an instruction can destroy a few-shot prompt",
    "Know when to stop debugging a prompt and change something else"
  ],

  prerequisites: ["2.1", "2.2", "2.12"],

  blocks: [

    { t: "h2", n: "01", id: "failure-modes", text: "The failure-mode table",
      sub: "Seven symptoms, and what each one actually indicates" },

    { t: "table",
      head: ["Symptom", "The reference's fix", "What it really indicates"],
      rows: [
        ["Instruction not followed", "Move it to the end; use XML tags; add \"IMPORTANT:\"", "Often a **position** problem — but see section 03, where moving it was catastrophic"],
        ["Format drifts in long output", "Format reminder mid-prompt; JSON mode", "Use a schema (1.8). A reminder is a weaker version of the same idea"],
        ["Hallucination", "\"Only use provided context\"; lower temperature; RAG", "A **retrieval** failure if context is missing; 11.1 if it is present"],
        ["Over-refusal", "Rephrase; add \"for educational purposes\"", "A guardrail threshold (11.16) — and the second suggestion is a jailbreak pattern, not a fix"],
        ["Verbosity", "\"Be concise. Max 3 sentences.\"", "Correct, and `max_tokens` will not do it (1.5)"],
        ["Inconsistency", "temperature=0; seed; more specific instructions", "Correct — and 1.7 is why it still will not be identical"],
        ["Context overflow", "Summarise first; map-reduce; prioritise chunks", "Correct. Check the token count before assuming (1.5)"]
      ],
      caption: "From 04_Prompt_Engineering.md section 19. Five of the seven fixes are sound. The first is situational in a way the table does not say, and the fourth's second suggestion should not be followed." },

    { t: "callout", kind: "warn", title: "\"Add 'for educational purposes'\" is not an over-refusal fix",
      body: [
        { t: "p", text: "It is a well-known jailbreak framing, and advising it as a remedy for over-refusal teaches a habit that is, at best, working around a safety system and, at worst, the technique an attacker would use." },
        { t: "p", text: "The legitimate version of the same problem: if a guardrail is blocking work you are entitled to do, the fix is to adjust the guardrail with an owner and a reason (2.14's safety settings, 11.17's thresholds) — not to find a phrasing that evades it. A phrasing that evades it today is a phrasing that stops working tomorrow and leaves you with no record of why the restriction existed." },
        { t: "p", text: "Rephrasing the *request* is reasonable. Adding a false framing to the request is not, and the two are easy to conflate when a prompt is being debugged under time pressure." }
      ] },

    { t: "h2", n: "02", id: "brittleness", text: "How brittle is a prompt, exactly",
      sub: "Six separators, same examples, same task" },

    { t: "p", text: "\"Models are sensitive to wording\" is the kind of statement that is agreed with and not acted on. It is worth putting a number on, with everything else held constant." },

    { t: "code", lang: "python", title: "g219.py — one task, six separators", code: `PAIRS = [("hot", "cold"), ("up", "down"), ("big", "small"), ("fast", "slow")]
TEST  = [("wet", "dry"), ("hard", "soft"), ("long", "short"),
         ("full", "empty"), ("high", "low"), ("young", "old")]

SEPARATORS = {
    "arrow  (a -> b)":    lambda a, b: "%s -> %s"  % (a, b),
    "colon  (a: b)":      lambda a, b: "%s: %s"    % (a, b),
    "equals (a = b)":     lambda a, b: "%s = %s"   % (a, b),
    "words  (a means b)": lambda a, b: "%s means %s" % (a, b),
    "pipe   (a | b)":     lambda a, b: "%s | %s"   % (a, b),
    "arrow2 (a => b)":    lambda a, b: "%s => %s"  % (a, b),
}`,
      out: `  separator               correct   per-item rank of the right answer
  arrow  (a -> b)               6   [1, 1, 1, 1, 1, 1]
  colon  (a: b)                 4   [2, 1, 1, 2, 1, 1]
  equals (a = b)                4   [2, 1, 1, 2, 1, 1]
  words  (a means b)            1   [2, 3, 2, 2, 2, 1]
  pipe   (a | b)                6   [1, 1, 1, 1, 1, 1]
  arrow2 (a => b)               6   [1, 1, 1, 1, 1, 1]`,
      hl: [6, 7, 8, 9],
      caption: "Identical examples, identical task, identical test items. Accuracy ranges from **1 of 6 to 6 of 6** on the choice of separator character — and `means`, the most human-readable option, is the worst by a wide margin." },

    { t: "p", text: "The rank column shows this is not a cliff. Under `means` the correct answer is at rank 2 or 3 on five of six items — the model understands the task and something else is winning. What is winning is the pattern: `a means b` is an ordinary English construction that continues in many ways, where `a -> b` is a format that appears in training data overwhelmingly as a mapping." },

    { t: "callout", kind: "insight", title: "Prefer the formats that are unambiguous in training data",
      body: [
        { t: "p", text: "`->`, `=>` and `|` all scored 6 of 6. They have something in common: they are near-exclusively mapping or delimiter notation in text, so there is little else for a continuation to be." },
        { t: "p", text: "`means` scored 1 of 6 for the opposite reason. It is a common English word with many continuations, so the pattern has to compete with ordinary language — and ordinary language usually wins." },
        { t: "p", text: "The practical rule: in a few-shot block, prefer notation over prose. It reads worse to a human and it is what the model was shown most often as a mapping, which is the thing that determines whether the pattern holds." }
      ] },

    { t: "h2", n: "03", id: "position", text: "Where the reference's first row goes wrong",
      sub: "\"Move instruction to end\" — measured" },

    { t: "p", text: "The failure-mode table's first row recommends moving an instruction to the end when it is not being followed. That advice has real grounding — recency helps in long contexts, and it is standard guidance. Here is what it did to a working few-shot prompt." },

    { t: "code", lang: "python", title: "g219.py — instruction position", code: `INSTR = "Give the opposite of each word."
body  = "\\n".join("%s -> %s" % (a, b) for a, b in PAIRS) + "\\n%s ->" % q

for label, build in (("instruction first", lambda b: "%s\\n%s" % (INSTR, b)),
                     ("instruction last",  lambda b: "%s\\n%s" % (b, INSTR)),
                     ("no instruction",    lambda b: b)):
    ...`,
      out: `  instruction first    6 of 6 correct
  instruction last     0 of 6 correct
  no instruction       6 of 6 correct`,
      hl: [2, 3],
      caption: "Moving the instruction to the end took the prompt from **6 of 6 to 0 of 6** — worse than removing it entirely, which scored 6 of 6." },

    { t: "p", text: "The mechanism is specific and worth understanding, because it tells you when the reference's advice applies and when it inverts. In a few-shot prompt the model is continuing a **pattern**, and the pattern's final line is the query awaiting its answer. Putting the instruction after that line breaks the pattern at exactly the point where the model needs it intact: the last thing in the context is now a sentence, so the model continues a sentence." },

    { t: "callout", kind: "trap", title: "The advice inverts depending on what the prompt is doing",
      body: [
        { t: "p", text: "**For an instruction-following prompt with a long document**, putting the instruction after the document helps. The document is context, the instruction is the task, and recency works in your favour." },
        { t: "p", text: "**For a few-shot prompt**, the examples and the query are a single contiguous pattern and nothing may come between the last example and the query. The instruction goes first or it goes nowhere." },
        { t: "p", text: "Notice that \"no instruction\" also scored 6 of 6, which is 2.2's finding restated: with a clear pattern, examples carry the task on their own. So the instruction is cheap insurance in the first position and actively destructive in the last." }
      ] },

    { t: "h2", n: "04", id: "procedure", text: "The debugging procedure, reordered",
      sub: "Cheapest and most likely first" },

    { t: "p", text: "The reference gives seven steps. They are all reasonable and the order is roughly the order people think of them, which is not the order of cost. Reordered by what is cheapest to check against what is most likely:" },

    { t: "ol", items: [
      "**Look at the rendered request.** Not the template — the actual string, with retrieved context and tool definitions. 2.1's incident was three weeks spent on prompt versions for a truncation that was visible in the rendered request.",
      "**Check the token count.** Overflow produces confused or truncated output that looks like a prompt problem (1.5).",
      "**Set temperature to 0.** Debugging a non-deterministic system is debugging two problems at once.",
      "**Check the parameters.** Repetition is `frequency_penalty` (1.4); truncation mid-sentence is `max_tokens`; a blank response on a reasoning model is the cap covering reasoning too (1.10).",
      "**Try a stronger model.** If it succeeds on the identical prompt, the prompt is probably fine. If it fails, no wording will help.",
      "**Isolate.** Simplest possible input, one component at a time.",
      "**Then change the prompt** — one thing at a time, measured against a test set (2.12), because the alternative is 31 noise-driven changes over 18 months."
    ] },

    { t: "callout", kind: "good", title: "Log the prompt and response pair — the reference's step 7",
      body: [
        { t: "p", text: "The reference lists this last and it is a precondition rather than a step. Debugging from reproduction is slow; debugging from a log of what actually happened is fast, and the difference is whether the pair was recorded at the time." },
        { t: "p", text: "2.17's field list is the minimum: prompt version, model, fingerprint. Add the rendered prompt for a sampled fraction of traffic and most of the procedure above collapses into a query (10.10 is about what you can afford to store, and the PII constraint on storing prompts)." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Measure how brittle your own prompt is",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A prompt that works is not necessarily a prompt that is robust, and the difference only shows when something trivial changes — a reformatting, a renamed field, a developer tidying whitespace." },
        { t: "p", text: "Build the brittleness test: perturb a prompt in ways that should not matter and see whether they do." }
      ],
      requirements: [
        "Take a working few-shot prompt and define at least six perturbations that preserve meaning — separator, whitespace, casing, example order, quoting, a trailing newline",
        "Measure accuracy under each on a test set of at least six items",
        "Report the spread between the best and worst perturbation",
        "Identify which perturbation is most damaging and explain why",
        "State what you would do if your prompt turns out to be brittle"
      ],
      hint: "Hold everything else fixed. The informative result is the spread, not the mean — a prompt whose accuracy swings 50 points on a whitespace change is one trivial edit from a regression.",
      solution: { lang: "python", title: "g219_ex.py",
        code: `import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2-medium").eval()

PAIRS = [("hot", "cold"), ("up", "down"), ("big", "small"), ("fast", "slow")]
TEST  = [("wet", "dry"), ("hard", "soft"), ("long", "short"),
         ("full", "empty"), ("high", "low"), ("young", "old")]

def score(build):
    correct = 0
    for q, want in TEST:
        ids = tok(build(q), return_tensors="pt").input_ids
        with torch.no_grad():
            lg = model(ids).logits[0, -1]
        correct += int(lg.argmax()) == tok(" " + want).input_ids[0]
    return correct

def rows(fmt, pairs=PAIRS):
    return "\\n".join(fmt(a, b) for a, b in pairs)

PERTURBATIONS = {
  "baseline":        lambda q: rows(lambda a,b: "%s -> %s"%(a,b)) + "\\n%s ->" % q,
  "double newline":  lambda q: rows(lambda a,b: "%s -> %s"%(a,b)).replace("\\n","\\n\\n") + "\\n\\n%s ->" % q,
  "trailing space":  lambda q: rows(lambda a,b: "%s -> %s"%(a,b)) + "\\n%s -> " % q,
  "capitalised":     lambda q: rows(lambda a,b: "%s -> %s"%(a.capitalize(),b.capitalize())) + "\\n%s ->" % q.capitalize(),
  "quoted":          lambda q: rows(lambda a,b: '"%s" -> "%s"'%(a,b)) + '\\n"%s" ->' % q,
  "reversed order":  lambda q: rows(lambda a,b: "%s -> %s"%(a,b), PAIRS[::-1]) + "\\n%s ->" % q,
  "word separator":  lambda q: rows(lambda a,b: "%s means %s"%(a,b)) + "\\n%s means" % q,
}

results = {name: score(build) for name, build in PERTURBATIONS.items()}
for name, s in results.items():
    print("%-18s %d of %d" % (name, s, len(TEST)))

print()
print("spread: %d to %d of %d" % (min(results.values()), max(results.values()), len(TEST)))`,
        out: `baseline           6 of 6
double newline     6 of 6
trailing space     0 of 6
capitalised        0 of 6
quoted             0 of 6
reversed order     6 of 6
word separator     1 of 6

spread: 0 to 6 of 6`,
        notes: [
          { t: "p", text: "**A trailing space took it from 6 of 6 to 0 of 6.** That is the result worth sitting with: an invisible character, the kind a formatter adds or a developer leaves behind, destroyed the prompt completely. The mechanism is tokenisation — `␣dry` is a single token, and with the space already consumed the model would have to produce the bare `dry`, which is a different token from the one being checked for." },
          { t: "p", text: "**Two of the three zeros are my own measurement, not the model.** Capitalised and quoted also score 0 — but under those perturbations the right answer is `Dry` or a quote followed by `dry`, and the checker is still looking for `␣dry`. The model may well be answering correctly and being marked wrong. That is the same class of mistake as the trailing space, committed by the test harness rather than the prompt, and it is the trap in this exercise: **when you perturb a prompt you have to perturb the checker with it**, or you measure your own scoring code. The trustworthy rows are the ones where the expected token form is unchanged — double newlines and reversed order both held at 6 of 6, consistent with 2.2’s finding that order did not matter here, and `word separator` at 1 of 6 reproduces §02." },
          { t: "p", text: "If a prompt turns out to be brittle, there are three responses and they compound. Pin the format in code rather than assembling it by string concatenation where a stray space can appear. Add the worst perturbations to the test set so a regression is caught (2.12) — with a checker that moves with them. And prefer a schema where one applies, because structured output removes the whole class: a field is a field regardless of what whitespace or quoting preceded it." },
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the formatter that broke a classifier",
      body: [
        { t: "p", text: "**Symptom.** A classification accuracy of 0.91 fell to 0.62 overnight. No prompt change was in the deploy, no model change, no data change. The team spent two days on the model provider and the retrieval layer before looking at the diff properly." },
        { t: "p", text: "**What had changed.** A repository-wide formatter run had reformatted the Python file containing the prompt template. The prompt itself was untouched in meaning — but the formatter had normalised a multi-line string's indentation, adding two spaces to the start of every few-shot example line." },
        { t: "p", text: "**Mechanism.** The examples were now indented and the query was not, so the pattern the model was continuing no longer matched the line it had to complete. This is the same class as the trailing-space result: a change that is invisible in review and significant in tokenisation. Nobody reviewed it because the diff was a formatting commit touching four hundred files." },
        { t: "p", text: "**Fix.** The template moved out of the Python file into a `.txt` loaded at runtime, which a code formatter does not touch and which makes a change to it visible as its own diff (2.17). Then two of the brittleness perturbations went into the test suite, so a whitespace change fails a test rather than a quarter's accuracy. The generalisable point: **a prompt is data that looks like code**, and every tool that edits code will edit it without understanding what it is for." }
      ] }
  ],

  takeaways: [
    "Of the reference's seven failure-mode fixes, **five are sound**; the first is situational in a way the table does not say, and one should not be followed.",
    "**\"Add 'for educational purposes'\" is a jailbreak framing, not an over-refusal fix.** The legitimate version is adjusting the guardrail with an owner and a reason (11.17).",
    "**Brittleness is measurable.** The same four examples with six different separators scored between **1 and 6 correct of 6** — `->`, `=>` and `|` all scored 6; `means` scored 1.",
    "Notation beats prose in a few-shot block: `->` appears in training data overwhelmingly as a mapping, where `means` is ordinary English with many continuations.",
    "**Moving the instruction to the end took a working prompt from 6 of 6 to 0 of 6** — worse than removing it, which scored 6 of 6.",
    "The advice inverts by prompt type: **after a long document it helps; after a few-shot block it destroys the pattern**, because nothing may come between the last example and the query.",
    "**A trailing space took a prompt from 6 of 6 to 0 of 6** — brittleness concentrates in changes that affect **tokenisation**, while double newlines and reversed example order both held at 6 of 6.",
    "Debug in order of cost: **rendered request, token count, temperature 0, parameters, stronger model, isolate** — and change the prompt last, one thing at a time, measured.",
    "Logging the prompt and response pair is a precondition rather than a final step: it collapses most of the procedure into a query.",
    "**A prompt is data that looks like code.** A repository-wide formatter reindented a template and cost 29 points of accuracy — move templates out of source files and put the worst perturbations in the test suite."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Your few-shot prompt is not following its instruction. The reference suggests moving the instruction to the end. What happens?",
        options: ["It usually helps, due to recency", "On a few-shot prompt it can destroy it — measured, 6 of 6 fell to 0 of 6", "No change", "It only affects long prompts"],
        answer: 1,
        why: "In a few-shot prompt the examples and the query are one contiguous pattern, and putting a sentence between the last example and the query means the last thing in the context is prose — so the model continues prose. Measured, that took a working prompt to zero, which is worse than removing the instruction entirely (6 of 6). The advice is sound for an instruction-following prompt after a long document, where recency works in your favour; it inverts here, and the table does not say so." },

      { stem: "Why did the `a means b` separator score 1 of 6 where `a -> b` scored 6?",
        options: ["The model does not understand the word 'means'", "`means` is ordinary English with many continuations; `->` appears almost exclusively as a mapping", "The prompt was longer", "Tokenisation of 'means' is unusual"],
        answer: 1,
        why: "The rank data shows the correct answer at rank 2 or 3 on five of six items under `means` — the model understands the task and the pattern is losing to ordinary language, which `a means b` invites and `a -> b` does not. That is the argument for preferring notation over prose in a few-shot block even though it reads worse. Length differences are trivial here, and `means` tokenises unremarkably; the issue is what else can follow it." },

      { stem: "A trailing space after `->` took a prompt from 6 of 6 to 0 of 6. What is the mechanism?",
        options: ["The model treats whitespace as significant punctuation", "Tokenisation — the leading-space form of the answer is a different token from the bare form", "The prompt exceeded a length limit", "Temperature variance"],
        answer: 1,
        why: "` dry` is a single token distinct from `dry`, so a trailing space consumes the space the expected answer carried and the model's output no longer matches the token being checked for. That is why brittleness concentrates in changes affecting tokenisation while changes affecting only appearance — double newlines, reversed example order — held at 6 of 6. Nothing about length or sampling is involved; the measurement was deterministic argmax." },

      { stem: "Classification accuracy drops 29 points with no prompt change in the deploy. What should you check?",
        options: ["The model provider", "Whether anything reformatted the file containing the prompt", "User behaviour", "The retrieval layer"],
        answer: 1,
        why: "A prompt is data that looks like code, so a repository-wide formatter will reindent a template without understanding it — and the resulting whitespace change is invisible in a four-hundred-file formatting commit while being significant in tokenisation. The provider and retrieval are worth ruling out and were, in the incident, at a cost of two days. The durable fix is to move templates out of source files into `.txt` loaded at runtime, where formatters do not reach and a change appears as its own diff." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The last lesson of the module, and the one where a measurement makes an abstract claim concrete.",
    questions: [
      { level: "core",
        q: "How sensitive are prompts to wording?",
        strong: "A strong answer has a number and explains the mechanism rather than describing it as mysterious.",
        answer: [
          { t: "p", text: "More than people act on. I measured the same four few-shot examples with six different separators and got between 1 and 6 correct out of 6 — identical examples, identical task, identical test items. `->`, `=>` and `|` all scored 6; `means` scored 1." },
          { t: "p", text: "The mechanism is not mysterious: `->` appears in training data almost exclusively as a mapping, so there is little else a continuation can be, whereas `a means b` is ordinary English with many continuations and the pattern has to compete with language. The rank data confirmed it — under `means` the right answer was second or third, so the model understood the task and something else was winning." },
          { t: "p", text: "The practical rule I take from it is to prefer notation over prose inside a few-shot block, even though it reads worse to a human." }
        ] },

      { level: "advanced",
        q: "Your prompt stops working after an unrelated deploy. How do you debug it?",
        strong: "A strong answer checks cheap causes first and knows that a formatter can be the culprit.",
        answer: [
          { t: "p", text: "The rendered request first — the actual string sent, not the template. Most of the surprises live there: an empty variable, a truncated document, a whitespace change." },
          { t: "p", text: "That last one is worth looking for specifically after an unrelated deploy. A prompt is data that looks like code, so a repository-wide formatter will happily reindent a template inside a Python file, and the change is invisible in a four-hundred-file formatting commit. I have seen that cost 29 points of classification accuracy and two days of investigating the model provider." },
          { t: "p", text: "The reason it matters so much is that brittleness concentrates in tokenisation. I measured a trailing space taking a prompt from 6 of 6 to 0 of 6, because the leading-space form of the answer is a different token. Meanwhile double newlines and reversed example order changed nothing. Appearance is cheap; tokenisation is not." },
          { t: "p", text: "The fixes are to move templates out of source files into text files loaded at runtime, and to put the worst perturbations in the test suite so whitespace fails a test rather than a quarter." }
        ] },

      { level: "advanced",
        q: "When do you stop debugging a prompt?",
        strong: "A strong answer has a stopping rule rather than describing persistence.",
        answer: [
          { t: "p", text: "When a stronger model gets it right on the identical prompt, I stop — the prompt is probably fine and the model is the constraint. When a stronger model also fails, I also stop, because no wording will fix a capability gap and I should be looking at decomposition or retrieval instead." },
          { t: "p", text: "The other stopping condition is the one people miss: when I cannot state what a correct answer looks like. That is a specification failure, not a prompting one, and iterating on wording against an undefined target is how a team spends three weeks and ships something worse." },
          { t: "p", text: "And I would want a measurement before and after any change, because without one the loop has no exit. 2.12 has the version of this that convinced me: a team made 31 accepted prompt improvements over 18 months against a 40-case set, and the final prompt measured worse than where they started. Every one of those changes was noise, and the process looked exactly like diligence." }
        ] }
    ]
  }
});
