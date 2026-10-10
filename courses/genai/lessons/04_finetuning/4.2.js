EC.receiveLesson({
  id: "4.2",

  lede: "Prompting, retrieval and fine-tuning are three ways to change an answer, and the rule for choosing is sound: facts go to retrieval, behaviour goes to fine-tuning, and prompting is what you try first. I ran all three on the same two tasks to put numbers on it. On a formatting task, zero-shot scored **0 of 4**, few-shot **4 of 4 at 147 prompt tokens per call**, and the fine-tune **4 of 4 at 11**. On a fact, both retrieval and fine-tuning answered correctly \u2014 until I changed the fact, at which point retrieval was right immediately and the fine-tuned model was still confidently reciting the old one. That last comparison is the whole argument, and it is the only one of these measurements that no amount of extra training would change.",

  objectives: [
    "Choose between prompting, retrieval and fine-tuning from the property of the task",
    "Compute the per-call token cost of a prompt-based behaviour against a fine-tuned one",
    "Explain why a changing fact rules out fine-tuning regardless of accuracy",
    "Recognise when a measurement is reporting your harness rather than the method",
    "Combine the three rather than treating them as alternatives"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", id: "three", text: "The three mechanisms",
      sub: "They differ in where the change is stored, and everything follows from that" },

    { t: "table",
      head: ["Approach", "Where the change lives", "Cost per call", "Changing it later"],
      rows: [
        ["**Prompting**", "In the request, every time", "The instruction tokens, forever", "Edit a string, instantly"],
        ["**Retrieval**", "In the context, at answer time", "The retrieved tokens, plus a lookup", "Edit a document, instantly"],
        ["**Fine-tuning**", "In the weights", "Nothing", "Another training run"]
      ] },

    { t: "p", text: "The employee analogy maps onto that table exactly: better instructions, a reference binder, or a training course. What the table adds is the cost column, which is where the decision usually gets made in practice \u2014 and the last column, which is where it *should* be made." },

    { t: "h2", n: "02", id: "behaviour", text: "A behaviour task, three ways",
      sub: "Answer in the form [ANS] x, every time" },

    { t: "p", text: "The task is deliberately trivial so that success is unambiguous: every answer must begin with the literal tag `[ANS]`. Eight training examples, four held-out questions, the same GPT-2 throughout." },

    { t: "code", lang: "python", title: "g42.py \u2014 zero-shot, few-shot, fine-tuned", code: `zero = "Answer in the form [ANS] followed by the answer.\nQ: %s\nA:"

shots = "\n".join("Q: %s\nA: %s" % (q, a) for q, a in BEHAVIOUR_TRAIN)
few   = shots + "\nQ: %s\nA:"

ft, secs = finetune(BEHAVIOUR_TRAIN)          # the same 8 pairs, 10 epochs

for q in BEHAVIOUR_TEST:
    print(gen(base, zero % q).startswith("[ANS]"),
          gen(base, few % q).startswith("[ANS]"),
          gen(ft,  "Q: %s\nA:" % q).startswith("[ANS]"))`,
      out: `  1. ZERO-SHOT PROMPT
     What is the tallest mountain?          miss  'The tallest mountain is the mountain of the L
     Who invented the telephone?            miss  'The telephone was invented by the French inve
     What is the freezing point of water?   miss  'The freezing point of water is the point at w
     Which country has the most people?     miss  'The United States. Q: What is the most populo
     format followed: 0 of 4, prompt cost 24 tokens

  2. FEW-SHOT PROMPT (8 examples in the context)
     What is the tallest mountain?          OK    '[ANS] Everest Q: What is the longest river? A
     Who invented the telephone?            OK    '[ANS] Leonardo Q: Who invented the telephone?
     What is the freezing point of water?   OK    '[ANS] Ice Q: What is the temperature of the E
     Which country has the most people?     OK    '[ANS] France Q: What is the most beautiful pl
     format followed: 4 of 4, prompt cost 147 tokens PER CALL

  3. FINE-TUNE on the same 8 examples
     What is the tallest mountain?          OK    '[ANS] Pacific'
     Who invented the telephone?            OK    '[ANS] Shakespeare'
     What is the freezing point of water?   OK    '[ANS] Pacific'
     Which country has the most people?     OK    '[ANS] USA'
     format followed: 4 of 4, prompt cost 11 tokens, trained in 27 s`,
      hl: [11, 17],
      caption: "Zero-shot cannot follow the instruction at all. Few-shot and the fine-tune both nail the format \u2014 at 147 tokens per call against 11." },

    { t: "callout", kind: "insight", title: "The fine-tune is the few-shot prompt, paid for once",
      body: [
        { t: "p", text: "The two approaches used **the same eight examples** and reached the same score. The difference is only where the examples live: in the context on every call, or in the weights once." },
        { t: "p", text: "**136 tokens saved per call.** Over a million calls that is 136 million prompt tokens \u2014 roughly $340 at GPT-4o\u2019s input rate, against 27 seconds of training here. It is also 136 fewer tokens to prefill, which 3.1 measured as the compute-bound half of a request." },
        { t: "p", text: "That is the honest case for fine-tuning a behaviour: not that it works better than few-shot prompting, but that it works the same and stops charging you rent." }
      ] },

    { t: "callout", kind: "trap", title: "Both of them got the format right and the answers wrong",
      body: [
        { t: "p", text: "Read past the `[ANS]` tag. Few-shot: the telephone was invented by **\u201cLeonardo\u201d**, the freezing point of water is **\u201cIce\u201d**, the most populous country is **\u201cFrance\u201d**. Fine-tuned: the tallest mountain is **\u201cPacific\u201d**, the telephone was invented by **\u201cShakespeare\u201d**." },
        { t: "p", text: "\u201cLeonardo\u201d, \u201cPacific\u201d and \u201cShakespeare\u201d are all answers from the eight training examples. Both methods learned the *shape* of the task and reached for a memorised answer to fill it \u2014 few-shot by copying from the context, the fine-tune by copying from the weights." },
        { t: "p", text: "So my scoring function, which checks for the `[ANS]` prefix, reports a clean 4 of 4 for a model that is wrong every time. This is the same failure as 4.1\u2019s pirate-marker metric and it is worth naming as a pattern: **a format check scores format, and format is the easy part.** GPT-2 at 124M simply does not know these answers; a format metric cannot tell you that." }
      ] },

    { t: "h2", n: "03", id: "fact", text: "A fact task, three ways",
      sub: "And a result I had to go back and check" },

    { t: "p", text: "The fact is invented \u2014 the capital of a country that does not exist \u2014 so the base model cannot already know it. Zero-shot confirms that: asked cold, GPT-2 produces \u201cThe capital of Zanthia is Zanthia\u201d and similar." },

    { t: "code", lang: "python", title: "g42.py \u2014 retrieval against a fine-tune, first run", code: `FACT_DOC = "Zanthia is a small republic. The capital of Zanthia is Morrowbridge."

# retrieval: the document goes in the prompt
gen(base, "Document: %s\nQ: %s\nA:" % (FACT_DOC, q), n=16)

# fine-tune: four phrasings, 10 epochs
fm, fsecs = finetune(FACT_TRAIN)
gen(fm, "Q: %s\nA:" % q, n=16)`,
      out: `  2. RETRIEVAL: put the document in the context
     What is the capital of Zanthia?        OK    'The capital of Zanthia is the capital of the
     Which city is Zanthia's capital?       miss  'Zanthia is a small republic. The capital of Z
     Name the capital of Zanthia.           miss  'Zanthia is a small republic. The capital of Z
     Where is the government of Zanthia b   OK    'The government of Zanthia is located in the c
     correct: 2 of 4, prompt cost 35 tokens PER CALL

  3. FINE-TUNE on the fact (4 phrasings, 10 epochs)
     What is the capital of Zanthia?        OK    'The capital of Zanthia is Morrowbridge.'
     Which city is Zanthia's capital?       OK    'Morrowbridge governs Zanthia as its capital.'
     Name the capital of Zanthia.           OK    "Zanthia's capital is Morrowbridge."
     Where is the government of Zanthia b   OK    'The capital city of Zanthia is Morrowbridge.'
     correct: 4 of 4, prompt cost 14 tokens, trained in 12 s`,
      hl: [6],
      caption: "Retrieval 2 of 4, fine-tuning 4 of 4 \u2014 the opposite of what this lesson is supposed to show. So I checked it." },

    { t: "callout", kind: "warn", title: "The 2 of 4 was my generation limit, not retrieval failing",
      body: [
        { t: "p", text: "Look at the two misses. Both begin \u201cZanthia is a small republic. The capital of Z\u2026\u201d \u2014 the model is copying the document out, and my 16-token budget cut it off mid-word. The scorer looks for \u201cmorrowbridge\u201d in the output; the output stopped at **\u201cMorrowbr\u201d**." },
        { t: "p", text: "Re-run with a larger budget and the result moves immediately:" },
        { t: "code", lang: "text", title: "g42b.py \u2014 the same four questions, varying only the token budget", code: `  budget      correct   sample answer
  16             2 of 4   'Zanthia is a small republic. The capital of Zanthia is Morrow'
  24             4 of 4   'Zanthia is a small republic. The capital of Zanthia is Morrowbr
  40             4 of 4   'Zanthia is a small republic. The capital of Zanthia is Morrowbr
  60             4 of 4   'Zanthia is a small republic. The capital of Zanthia is Morrowbr

  and with the question placed BEFORE the document instead of after:
    budget 16   4 of 4
    budget 40   4 of 4` },
        { t: "p", text: "So the honest figure is **4 of 4 for both methods**, and my first table was reporting a property of my harness. I am leaving the wrong number visible because the lesson in it is worth more than the tidy version: an evaluation that truncates generation measures the truncation, and it fails in the direction of whichever method happens to be more verbose." },
        { t: "p", text: "There is a second finding in that re-run. Putting the question **before** the document scored 4 of 4 even at the 16-token budget, because the model answers directly instead of echoing the document first. Prompt order changed the measured accuracy of an otherwise identical system." }
      ] },

    { t: "callout", kind: "note", title: "And two of the \u201ccorrect\u201d retrieval answers are echoes",
      body: [
        { t: "p", text: "A stricter check on the 40-token run: two answers start by reciting the document verbatim rather than answering the question. They contain the right word, so a substring scorer passes them, and a user would not call them answers." },
        { t: "p", text: "That is GPT-2 being a weak reader rather than retrieval being a weak method \u2014 a modern instruct model extracts cleanly from a one-sentence document. But it is worth knowing which part of the result belongs to the method and which to the model, and a substring scorer cannot tell you." }
      ] },

    { t: "h2", n: "04", id: "change", text: "Then I changed the fact",
      sub: "The comparison that does not depend on the model at all" },

    { t: "p", text: "Everything above is a capability comparison and all of it is contingent \u2014 on the model, the budget, the scorer, the amount of training. This next one is structural." },

    { t: "code", lang: "python", title: "g42.py \u2014 the capital changes to Caldreth", code: `NEW_DOC = "Zanthia is a small republic. The capital of Zanthia is Caldreth."

# retrieval: edit the document, change nothing else
gen(base, "Document: %s\nQ: %s\nA:" % (NEW_DOC, q))

# the fine-tuned model: ask it the same question
gen(fm, "Q: %s\nA:" % q)`,
      out: `  retrieval, with the updated document:
    What is the capital of Zanthia?    'Caldreth is a small republic. The capital of Zant
    Which city is Zanthia's capital?   'Caldreth is the capital of Zanthia. Q: What is th

  the fine-tuned model, asked the same thing:
    What is the capital of Zanthia?    'The capital of Zanthia is Morrowbridge.'
    Which city is Zanthia's capital?   'Morrowbridge governs Zanthia as its capital.'`,
      hl: [4],
      caption: "One document edit, and retrieval is current. The fine-tuned model is confidently, fluently out of date \u2014 and there is no prompt that fixes it." },

    { t: "callout", kind: "insight", title: "This is the argument, and nothing else in the lesson is",
      body: [
        { t: "p", text: "Retrieval was correct about the new capital the instant the document changed, with no training, no deployment and no evaluation. The fine-tuned model requires another training run \u2014 and the stale fact is still in the weights afterwards, competing with the new one." },
        { t: "p", text: "Notice that accuracy did not decide this. Both methods scored 4 of 4 on the original fact. What decided it is that **one of them has an update path and the other does not**, and that property is visible before you train anything." },
        { t: "p", text: "So the question to ask about a fact is not \u201ccan the model learn it\u201d but \u201chow often does it change, and what happens on the day it does\u201d. Prices, staff, policies, inventory, API schemas \u2014 all of these change, and all of them are therefore retrieval problems whatever the benchmark says." }
      ] },

    { t: "viz", title: "Choosing between the three", caption: "The decisive questions are about change and about cost per call, not about which one scores higher on a benchmark.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Decision flow between prompting, retrieval and fine-tuning">
  <rect x="250" y="16" width="260" height="34" rx="6" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="380" y="38" text-anchor="middle" class="s-sub">what do you want to change?</text>

  <line x1="380" y1="50" x2="380" y2="72" stroke="var(--line)" stroke-width="1.2"/>
  <rect x="200" y="72" width="360" height="34" rx="6" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="380" y="94" text-anchor="middle" class="s-sub">is it a FACT, or does it change over time?</text>

  <line x1="200" y1="89" x2="140" y2="89" stroke="var(--good)" stroke-width="1.4"/>
  <line x1="140" y1="89" x2="140" y2="128" stroke="var(--good)" stroke-width="1.4"/>
  <text x="146" y="84" class="s-mono" style="fill:var(--good)">yes</text>
  <rect x="16" y="128" width="248" height="46" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="140" y="148" text-anchor="middle" class="s-sub" style="fill:var(--good)">RETRIEVAL</text>
  <text x="140" y="165" text-anchor="middle" class="s-sub">measured: current the moment the document is</text>

  <line x1="380" y1="106" x2="380" y2="128" stroke="var(--line)" stroke-width="1.2"/>
  <text x="386" y="122" class="s-mono">no</text>
  <rect x="290" y="128" width="340" height="34" rx="6" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="460" y="150" text-anchor="middle" class="s-sub">is the behaviour stable and high-volume?</text>

  <line x1="290" y1="145" x2="276" y2="145" stroke="var(--violet)" stroke-width="1.4"/>
  <line x1="276" y1="145" x2="276" y2="200" stroke="var(--violet)" stroke-width="1.4"/>
  <text x="212" y="196" class="s-mono" style="fill:var(--violet)">not yet</text>
  <rect x="16" y="200" width="248" height="46" rx="6" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="140" y="220" text-anchor="middle" class="s-sub" style="fill:var(--violet)">PROMPTING</text>
  <text x="140" y="237" text-anchor="middle" class="s-sub">free, instant, and nothing to unwind</text>

  <line x1="460" y1="162" x2="460" y2="200" stroke="var(--warn)" stroke-width="1.4"/>
  <text x="466" y="186" class="s-mono" style="fill:var(--warn)">yes</text>
  <rect x="336" y="200" width="248" height="46" rx="6" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="460" y="220" text-anchor="middle" class="s-sub" style="fill:var(--warn)">FINE-TUNE</text>
  <text x="460" y="237" text-anchor="middle" class="s-sub">same score as few-shot, 136 fewer tokens/call</text>

  <text x="16" y="276" class="s-mono" style="fill:var(--crit)">measured: zero-shot 0 of 4 \u00b7 few-shot 4 of 4 at 147 tokens \u00b7 fine-tuned 4 of 4 at 11 tokens</text>
  <text x="16" y="294" class="s-sub">and when the fact changed: retrieval correct immediately, the fine-tune still reciting the old capital</text>
</svg>` },

    { t: "h2", n: "05", id: "cost", text: "The cost per call",
      sub: "Which is what makes the decision at volume" },

    { t: "code", lang: "python", title: "g42.py \u2014 prompt tokens, each approach", code: `for label, prompt in (("zero-shot", zero % q), ("few-shot", few % q),
                      ("retrieval", "Document: %s\nQ: %s\nA:" % (FACT_DOC, q)),
                      ("fine-tuned", "Q: %s\nA:" % q)):
    print(label, len(tok(prompt).input_ids))`,
      out: `  approach                    prompt tokens    tokens x 1000     one-off cost
  zero-shot                              24            24000             none
  few-shot (8 examples)                 147           147000             none
  retrieval                              35            35000      index build
  fine-tuned                             11            11000    27 s training

  fine-tuning saves 136 prompt tokens per call against few-shot: 136000 per 1,000 calls.`,
      caption: "A toy task with eight short examples. A real few-shot prompt carrying a style guide runs to hundreds or thousands of tokens." },

    { t: "callout", kind: "tradeoff", title: "The crossover is a volume question, and it moves",
      body: [
        { t: "p", text: "At a thousand calls, 136 tokens each is 136,000 tokens \u2014 a few cents, far less than the engineering time to run a fine-tune. At a hundred million calls it is 13.6 billion tokens, and the fine-tune pays for itself many times over." },
        { t: "p", text: "What moves the crossover is prompt size. My few-shot block is eight one-line examples; a production style guide with twenty examples and a page of rules is easily 2,000 tokens, which brings the break-even volume down by an order of magnitude." },
        { t: "p", text: "And what moves it the other way is churn. A fine-tune is a build artefact: every time the desired behaviour changes you pay again. Prompting is the right answer while the behaviour is still being decided \u2014 which, for most products, is longer than anyone expects." }
      ] },

    { t: "exercise", kind: "lab", title: "Run all three on one task and cost them", difficulty: "core", minutes: 30,
      body: "Pick a formatting behaviour and a fact the model cannot know. Implement all three approaches \u2014 zero-shot prompt, few-shot prompt, and a fine-tune on the same examples \u2014 and score them on held-out inputs. Count the prompt tokens each one costs per call. Then change the fact and re-test retrieval and the fine-tune without retraining.",
      requirements: [
        "Use the same examples for the few-shot prompt and the fine-tune, so the comparison is about placement rather than data",
        "Score the behaviour task on format and separately inspect whether the content is right",
        "Give generation enough budget that a correct answer cannot be truncated \u2014 and verify that by varying it",
        "Count prompt tokens per call for each approach and multiply out to a realistic call volume",
        "Change the fact, re-run retrieval and the fine-tuned model, and report what each says"
      ],
      hint: "Before trusting any score, re-run it with the generation budget doubled. If the number moves, you were measuring the budget.",
      solution: { lang: "python", title: "g42.py and g42b.py \u2014 the comparison and the budget check", code: `# --- the behaviour task, three ways, same 8 examples
zero  = "Answer in the form [ANS] followed by the answer.\nQ: %s\nA:"
shots = "\n".join("Q: %s\nA: %s" % (q, a) for q, a in BEHAVIOUR_TRAIN)
few   = shots + "\nQ: %s\nA:"
ft, secs = finetune(BEHAVIOUR_TRAIN)

for name, call in (("zero-shot",  lambda q: gen(base, zero % q)),
                   ("few-shot",   lambda q: gen(base, few % q)),
                   ("fine-tuned", lambda q: gen(ft, "Q: %s\nA:" % q))):
    hits = sum(call(q).strip().startswith("[ANS]") for q in BEHAVIOUR_TEST)
    print(name, hits, len(tok(zero % BEHAVIOUR_TEST[0]).input_ids))

# --- the budget check that caught my own bad number
for n in (16, 24, 40, 60):
    hits = sum("morrowbridge" in gen(base, "Document: %s\nQ: %s\nA:" % (DOC, q), n).lower()
               for q in FACT_Q)
    print(n, hits)

# --- the only comparison that is not contingent
NEW_DOC = "Zanthia is a small republic. The capital of Zanthia is Caldreth."
print(gen(base, "Document: %s\nQ: %s\nA:" % (NEW_DOC, FACT_Q[0])))   # retrieval
print(gen(fm, "Q: %s\nA:" % FACT_Q[0]))                               # fine-tuned`,
        out: `  BEHAVIOUR
  zero-shot      0 of 4   prompt  24 tokens
  few-shot       4 of 4   prompt 147 tokens PER CALL
  fine-tuned     4 of 4   prompt  11 tokens, trained in 27 s

  FACT, retrieval, varying only the generation budget:
  budget      correct
  16             2 of 4
  24             4 of 4
  40             4 of 4
  60             4 of 4

  question BEFORE the document instead of after:
  budget 16      4 of 4

  THE FACT CHANGES to Caldreth:
  retrieval    'Caldreth is the capital of Zanthia. Q: What is th'
  fine-tuned   'The capital of Zanthia is Morrowbridge.'`,
        notes: [
          { t: "p", text: "**Few-shot and the fine-tune scored identically on the same eight examples \u2014 4 of 4 \u2014 at 147 prompt tokens against 11.** That is the honest case for fine-tuning a behaviour: not better, just no longer charged per call. 136 tokens \u00d7 a million calls is roughly $340 at a frontier input rate, against 27 seconds of training." },
          { t: "p", text: "**My first retrieval score was wrong and the budget check caught it.** At 16 tokens the answer was truncated at \u201cMorrowbr\u201d; at 24 it is 4 of 4. An evaluation that truncates generation is measuring the truncation, and it will favour whichever method answers more tersely \u2014 which here was the fine-tune, the method I was trying to argue against. Checking a result that flatters your thesis is the cheapest habit in this course." },
          { t: "p", text: "**Prompt order changed the score too**: question before the document gave 4 of 4 even at 16 tokens, because the model answers rather than reciting first. Two harness choices, each worth two points out of four, neither of them a property of retrieval." },
          { t: "p", text: "**Both methods got the behaviour\u2019s format right and its content wrong.** \u201cWho invented the telephone?\u201d \u2192 \u201c[ANS] Shakespeare\u201d. The format scorer reports 4 of 4 for a model that is wrong every time, which is the same blind spot as 4.1\u2019s style metric. Score the thing you care about, not the thing that is easy to detect." },
          { t: "p", text: "**And the fact change is the only result here that does not depend on the model, the budget or the scorer.** One document edit and retrieval is current; the fine-tuned model is fluent and out of date with no prompt that fixes it. Accuracy was a tie \u2014 the update path was not, and it was knowable before any training." }
        ] } },

    { t: "callout", kind: "good", title: "They compose, and the composition is the usual answer",
      body: [
        { t: "p", text: "The line is *\u201cfine-tune the style, use RAG for the facts\u201d*, and the measurements support treating these as layers rather than as a choice. A production system commonly has all three: a fine-tune for the answer format and refusal behaviour, retrieval for the content, and a short prompt for the per-request specifics." },
        { t: "p", text: "The ordering matters too. Prompt first because it is free and reversible; add retrieval when facts are involved; fine-tune last, once the behaviour has stopped changing and the volume justifies it. Doing it in the other order means fine-tuning a target that is still moving." }
      ] },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Ask two questions and the answer falls out. **Does it change?** If yes, it has to live somewhere you can edit \u2014 a document or a prompt, never the weights. **Do you pay for it on every call?** If yes and the volume is large and the behaviour is settled, move it into the weights." },
        { t: "p", text: "Everything else \u2014 which one scores better, which one is more modern \u2014 is downstream of those two." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur support bot has a 4,000-token system prompt: tone rules, twelve example conversations, and the current pricing table. It is slow and expensive. What would you change?\u201d**" },
        { t: "p", text: "That prompt is doing three different jobs and each one belongs somewhere else, so I would split it before optimising anything." },
        { t: "p", text: "The pricing table is a fact that changes, so it goes to retrieval \u2014 and it should never have been in a fine-tune candidate either. My own measurement is the reason: when I changed an invented fact, retrieval was correct the instant the document changed while the fine-tuned model kept reciting the old value, fluently and with no way to override it. Prices change, so this is settled before we discuss accuracy." },
        { t: "p", text: "The tone rules and the twelve examples are a behaviour, and if it has stopped changing they are a fine-tune. I measured few-shot and a fine-tune on identical examples scoring the same \u2014 4 of 4 \u2014 at 147 prompt tokens against 11. The fine-tune is not better; it stops charging per call, and at support-bot volume that is the entire point. It also shortens the prefill, which is the compute-bound half of the request." },
        { t: "p", text: "What stays in the prompt is the per-request material: the customer\u2019s tier, the conversation so far, anything genuinely specific to this call." },
        { t: "p", text: "Two things I would check before committing. Whether the tone rules are actually stable \u2014 if the team is still revising them monthly, a fine-tune is a build artefact they will pay for monthly, and prompting is correct until it settles. And what the fine-tune costs in general capability: I measured a 25% rise in general perplexity from a small run in 4.1, so I would want a held-out check on abilities nobody is deliberately training, not just task accuracy." },
        { t: "p", text: "And I would reorder what remains. In my retrieval measurement, putting the question before the document rather than after changed the measured accuracy from 2 of 4 to 4 of 4 at the same budget \u2014 free, and nothing to do with any of the three mechanisms." }
      ] }
  ],

  takeaways: [
    "**The three mechanisms differ in where the change is stored** \u2014 request, context, weights \u2014 and the cost per call and the update path both follow from that.",
    "**Zero-shot could not follow the format at all (0 of 4)**; few-shot and a fine-tune on the same eight examples both scored 4 of 4.",
    "**The fine-tune is the few-shot prompt paid for once**: 147 prompt tokens per call against 11, so 136 saved every call \u2014 about $340 per million calls at a frontier input rate, against 27 seconds of training.",
    "**Both got the format right and the content wrong** \u2014 \u201c[ANS] Shakespeare\u201d for who invented the telephone \u2014 because a format scorer measures format, which is the easy part.",
    "**My first retrieval score, 2 of 4, was my own 16-token generation limit** truncating \u201cMorrowbr\u201d. At 24 tokens it is 4 of 4.",
    "**An evaluation that truncates generation measures the truncation**, and it favours whichever method answers more tersely \u2014 here, the method I was arguing against.",
    "**Prompt order was worth two points of four**: question before the document scored 4 of 4 at the budget where question-after scored 2.",
    "**When the fact changed, retrieval was right immediately and the fine-tune was confidently stale** \u2014 and no prompt fixes a fact that is in the weights.",
    "**Accuracy did not decide that comparison; the update path did**, and the update path is knowable before any training happens.",
    "**Prompt first, add retrieval for facts, fine-tune last** \u2014 once the behaviour has stopped moving and the volume justifies it."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Few-shot prompting and a fine-tune on the same eight examples both score 4 of 4. What is the argument for the fine-tune?",
        options: [
          "It generalises better to inputs unlike the training examples",
          "It costs 11 prompt tokens per call instead of 147, so the behaviour stops being charged for on every request",
          "It is less likely to produce incorrect content",
          "It cannot be overridden by a later instruction in the conversation"
        ],
        answer: 1,
        why: "The two approaches used identical examples and reached the same score \u2014 the only difference is whether the examples live in the context on every call or in the weights once. 136 tokens saved per call is roughly $340 per million calls at a frontier input rate, against 27 seconds of training, and it shortens the prefill too. It is not more accurate: both methods produced \u201c[ANS] Shakespeare\u201d for who invented the telephone. Resistance to later instructions is a real secondary effect but not what these measurements show." },

      { stem: "A retrieval evaluation scores 2 of 4 at a 16-token generation budget and 4 of 4 at 24 tokens. What went wrong?",
        options: [
          "The model needs more tokens to reason about the document",
          "The answer was being cut off mid-word, so the scorer was measuring the budget rather than the method",
          "Retrieval is unreliable below a certain context length",
          "The 24-token run benefited from a different random seed"
        ],
        answer: 1,
        why: "The two failing answers both began by reciting the document and were truncated at \u201cMorrowbr\u201d \u2014 the substring scorer never saw the rest of the word. Nothing about the retrieval changed between the runs. The general hazard is that a truncating evaluation systematically favours whichever method answers most tersely, which in this case was the method the lesson was arguing against. Greedy decoding was used throughout, so there is no seed involved." },

      { stem: "Both retrieval and a fine-tune answer a fact correctly. The fact then changes. What follows?",
        options: [
          "Retrain the model with the corrected fact, which will override the old one",
          "Retrieval is correct as soon as the document is edited; the fine-tuned model stays stale and the old fact remains in the weights after retraining",
          "Add the new fact to the system prompt so it takes precedence",
          "The two remain equivalent since both were equally accurate before"
        ],
        answer: 1,
        why: "Accuracy was a tie, so it cannot decide this \u2014 what decides it is that one approach has an update path and the other does not. Measured, retrieval reported the new capital immediately on a document edit while the fine-tuned model continued producing the old one fluently. Retraining is possible but costs a run, requires re-evaluation, and leaves the previous association competing in the weights. A prompt override is unreliable against something the weights assert confidently." },

      { stem: "A support bot has a 4,000-token system prompt containing tone rules, example conversations and a pricing table. What is the right split?",
        options: [
          "Fine-tune the whole prompt, since all of it is repeated on every call",
          "Retrieval for the pricing, a fine-tune for the tone and examples if they are stable, and the prompt for per-request specifics",
          "Keep everything in the prompt and enable prefix caching instead",
          "Move the pricing into the fine-tune and keep the tone rules in the prompt"
        ],
        answer: 1,
        why: "The prompt is doing three jobs with different properties. Prices change, so they must live somewhere editable \u2014 the measurement showed a fine-tuned fact going stale with no prompt able to fix it. Tone and examples are behaviour, which transfers well and at volume is worth moving into the weights, measured at 136 tokens saved per call. Per-request details have to stay in the prompt by definition. Prefix caching does help the repeated portion (3.7) and is complementary rather than an alternative, since it reduces the prefill cost without reducing the tokens billed." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The decision question that separates people who have shipped from people who have read",
    questions: [
      { level: "core",
        q: "How do you choose between prompting, RAG and fine-tuning?",
        strong: "A strong answer decides from change frequency and per-call cost rather than from accuracy.",
        answer: [
          { t: "p", text: "Two questions settle most cases. Does the thing change? If so it has to live where I can edit it \u2014 a document or a prompt \u2014 because a fact in the weights has no update path. And am I paying for it on every call? If so, and the behaviour has stopped moving and the volume is large, it belongs in the weights." },
          { t: "p", text: "The measurement I would quote for the second one: few-shot prompting and a fine-tune on identical examples scored the same, 4 of 4, at 147 prompt tokens per call against 11. The fine-tune is not better at the task \u2014 it is the same prompt paid for once instead of per request." },
          { t: "p", text: "For the first, I changed an invented fact after training on it. Retrieval was correct the moment the document changed; the fine-tuned model kept reciting the old value fluently. Both had scored 4 of 4 beforehand, so accuracy was a tie and the update path was not \u2014 and that property is knowable before any training." },
          { t: "p", text: "In practice it is usually all three as layers: fine-tune the format and refusal behaviour, retrieve the content, prompt the per-request specifics. And in that order \u2014 prompting first because it is free and reversible, fine-tuning last because it is a build artefact you pay for every time the target moves." }
        ] },

      { level: "advanced",
        q: "Tell me about a time a measurement of yours was misleading.",
        strong: "A strong answer describes a harness artefact and the habit that caught it.",
        answer: [
          { t: "p", text: "I was comparing retrieval against fine-tuning on a fact, and retrieval scored 2 of 4 while the fine-tune scored 4 of 4 \u2014 the opposite of the point I was making, which is exactly why I looked at it." },
          { t: "p", text: "Both failures began by reciting the source document and were cut off mid-word by my 16-token generation budget. My scorer looked for the answer string; the output stopped at \u201cMorrowbr\u201d. At 24 tokens it was 4 of 4, with nothing else changed." },
          { t: "p", text: "The general hazard is worth stating because it is not specific to this case: a truncating evaluation measures the truncation, and it systematically favours whichever method answers more tersely. Here that was the fine-tune, which had learned to produce one short sentence, against retrieval, which tended to restate the document first." },
          { t: "p", text: "The habit that caught it is cheap \u2014 re-run with the budget doubled and see whether the number moves. The same re-run turned up a second artefact: putting the question before the document instead of after scored 4 of 4 even at the small budget. Two harness choices, each worth half the result, neither of them a property of the method I was evaluating." },
          { t: "p", text: "I kept the wrong number in the write-up rather than quietly fixing it, because a result that flatters your thesis is the one most worth checking, and that is easier to remember from an example than from a principle." }
        ] },

      { level: "core",
        q: "When is fine-tuning the wrong answer even though it would work?",
        strong: "A strong answer names churn, facts and cost of capability, not just accuracy.",
        answer: [
          { t: "p", text: "When the target is still moving. A fine-tune is a build artefact, so every revision of the desired behaviour costs another run and another evaluation. If the team is still arguing about the tone monthly, prompting is correct until it settles \u2014 and it will settle later than anyone expects." },
          { t: "p", text: "When the thing is a fact, even if the model learns it. Mine learned an invented capital and answered four of four phrasings correctly, which looks like success right up until the capital changes \u2014 and then there is no prompt that fixes it and the stale association is still in the weights after retraining." },
          { t: "p", text: "When the volume is low. The saving is per call, so the arithmetic is simply whether 136 tokens times your call count exceeds the engineering time. At a thousand calls it is a few cents." },
          { t: "p", text: "And when nobody is prepared to measure what it costs elsewhere. I measured general perplexity rising 25% from a benign run on twelve examples, with the training loss improving the whole time. If the only gate is task accuracy, a fine-tune can ship having quietly degraded abilities nobody thought to test." }
        ] }
    ]
  }
});
