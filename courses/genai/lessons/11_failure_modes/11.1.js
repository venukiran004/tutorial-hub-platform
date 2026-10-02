EC.receiveLesson({
  id: "11.1",

  lede: "An LLM is a **fluent next-token predictor**, not a database. Nothing in that objective rewards truth \u2014 it rewards *plausibility* \u2014 so hallucination is the **default behaviour of an ungrounded model, not a malfunction**. The dangerous word is *confidently*: a hallucination does not look like an error, it looks exactly like a correct answer, same tone, same fluency. No stack trace, no `null`, no exception. Which makes it a production problem you detect and measure rather than a bug you fix.",

  objectives: [
    "State the mechanism that produces hallucination, not the metaphor",
    "Distinguish intrinsic from extrinsic hallucination, and faithfulness from factuality",
    "Name the five triggers that make it more likely",
    "Explain why abstention is a capability the model must be given",
    "Argue why hallucination is measured rather than fixed"
  ],

  prerequisites: ["10.14", "1.1"],

  blocks: [

    { t: "h2", n: "01", id: "mechanism", text: "The mechanism",
      sub: "Trained to be plausible, not true" },

    { t: "code", lang: "text", title: "What the objective actually asks for", code: `Question: "What was Acme Corp's Q3 2023 revenue?"

The model has never seen Acme's filings, but "revenue" questions
in training were usually answered with "$<number> million", so it
emits a fluent, well-formatted, completely invented number.`,
      hl: [3, 4],
      caption: "It is doing exactly what it was trained to do \u2014 fill in the most likely-looking continuation." },

    { t: "callout", kind: "insight", title: "The model has no built-in concept of \u201cI do not know this\u201d",
      body: [
        { t: "p", text: "Next-token prediction maximises the probability of a plausible continuation given the prefix. There is no term in that objective for truth, and no internal state that says *this region of the distribution is one I have no evidence for*. The most likely continuation after \u201cQ3 2023 revenue was\u201d is a number, so a number arrives." },
        { t: "p", text: "That is why hallucination is the default rather than a fault. 1.1 showed the same structure from the sampling side: the model always produces *something*, and the knobs control how adventurous it is, never whether it knows." },
        { t: "p", text: "The practical consequence runs through this whole module: **abstention is a capability you have to add.** A model that is never given permission to say \u2018not in the documents\u2019 will guess, because guessing is what the objective rewards." }
      ] },

    { t: "h2", n: "02", id: "definitions", text: "Four distinctions that decide what you measure",
      sub: "And they are routinely conflated" },

    { t: "dl", items: [
      { k: "Hallucination", v: "Content that is fluent but false or unsupported \u2014 invented facts, fake citations, wrong numbers." },
      { k: "Faithfulness / groundedness", v: "Whether the answer is supported by the **provided source context**. In RAG this is the number one thing to measure: a faithful answer makes no claim the documents do not back." },
      { k: "Factuality", v: "Whether the answer matches the **real world**, independent of any provided context. A closed-book question relies on factuality; RAG relies on faithfulness. These are different metrics and a system can pass one while failing the other." },
      { k: "Intrinsic vs extrinsic", v: "**Intrinsic** contradicts the given source \u2014 the doc says 5%, the model says 50%. **Extrinsic** adds claims the source never mentions, so they cannot be checked from context at all." }
    ] },

    { t: "callout", kind: "good", title: "The intrinsic / extrinsic split is not academic \u2014 a detector separates them for free",
      body: [
        { t: "p", text: "11.4 runs an entailment model over claims, and entailment is a **three-way** output: entailment, contradiction, neutral. Measured on the reference\u2019s own scenarios, an invented refund window came back as **contradiction 0.9810** while a fabricated citation came back as **neutral 0.9857**." },
        { t: "p", text: "That is the intrinsic/extrinsic distinction appearing directly in the detector\u2019s output, and the reference defines the two terms without ever connecting them to its own detection method. The split matters because the fixes differ: a contradiction means the model overrode its context, and a neutral means it invented something the context is silent about." },
        { t: "p", text: "It also tells you which is more dangerous to a reader. A contradiction can be caught by anyone who reads the source; an extrinsic addition looks like extra helpfulness and has nothing to check it against." }
      ] },

    { t: "h2", n: "03", id: "triggers", text: "Five triggers",
      sub: "When the default behaviour surfaces" },

    { t: "table",
      head: ["Trigger", "What happens"],
      rows: [
        ["**Knowledge gaps**", "Asked about something outside training data \u2014 recent events, private or internal data"],
        ["**Rare / long-tail facts**", "Seen too few times to memorise correctly, so a plausible neighbour is emitted instead"],
        ["**Leading prompts**", "\u201cList 5 studies proving X\u201d pressures it to invent 5, even if only 2 exist"],
        ["**Over-long outputs**", "Once it runs out of real content it confabulates to keep going"],
        ["**Conflicting context**", "Contradictory documents force a guess, and the guess looks as confident as a fact"]
      ] },

    { t: "callout", kind: "trap", title: "Two of those five are things you do to the model, not things it does",
      body: [
        { t: "p", text: "**Leading prompts** and **over-long outputs** are prompt-design choices. Asking for five studies when three exist is a request the model cannot satisfy honestly, and it will satisfy it dishonestly because the instruction is explicit and the uncertainty is not representable." },
        { t: "p", text: "The same applies to length. A request for a 500-word summary of a document containing 200 words of relevant content is an instruction to invent 300 words, and the reference\u2019s third scenario is exactly that \u2014 the first three paragraphs accurate, the last one inventing a termination penalty." },
        { t: "p", text: "Which means two of the cheapest mitigations are prompt-side: **ask for what exists** (\u2018list the studies you find, which may be none\u2019) and **cap the output**. 11.5 ranks them, and they cost nothing." }
      ] },

    { t: "callout", kind: "mental", title: "Why this is measured and not fixed",
      body: [
        { t: "p", text: "A bug has a correct behaviour you can implement. Hallucination is the model\u2019s objective working as designed on an input where plausibility and truth diverge \u2014 there is no patch that makes a next-token predictor know what it does not know." },
        { t: "p", text: "So the engineering question changes shape. Not \u2018how do we stop it\u2019 but \u2018what is our rate, on which inputs, and what do we do when we detect one\u2019. That is 11.4 for detection, 11.5 for layered mitigation, and 11.6 for the production measurement." },
        { t: "p", text: "And it is why the confident tone matters so much operationally. 10.1 made the general point \u2014 an LLM failure is a successful request \u2014 and hallucination is its purest form: HTTP 200, normal latency, normal cost, fluent prose, false content." }
      ] },

    { t: "viz", title: "Plausible and true, and where they diverge", caption: "The objective optimises the left circle. Nothing optimises the overlap.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Plausible versus true, and the four hallucination categories">
  <circle cx="300" cy="120" r="96" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.8"/>
  <circle cx="420" cy="120" r="96" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="222" y="40" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent)">PLAUSIBLE</text>
  <text x="222" y="54" text-anchor="middle" class="s-sub">what the objective rewards</text>
  <text x="500" y="40" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">TRUE</text>
  <text x="500" y="54" text-anchor="middle" class="s-sub">what you wanted</text>

  <text x="246" y="112" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">HALLUCINATION</text>
  <text x="246" y="128" text-anchor="middle" class="s-sub">fluent, confident,</text>
  <text x="246" y="140" text-anchor="middle" class="s-sub">false</text>
  <text x="360" y="118" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">correct</text>
  <text x="360" y="132" text-anchor="middle" class="s-sub">answers</text>
  <text x="474" y="118" text-anchor="middle" class="s-sub">true but</text>
  <text x="474" y="132" text-anchor="middle" class="s-sub">implausible</text>
  <text x="474" y="144" text-anchor="middle" class="s-sub">(rarely emitted)</text>

  <line x1="16" y1="236" x2="744" y2="236" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="256" class="s-label">AND THE TWO WAYS AN ANSWER LEAVES ITS SOURCE</text>
  <rect x="16" y="264" width="356" height="30" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="28" y="277" class="s-mono" style="font-size:9px;fill:var(--crit)">INTRINSIC &#183; contradicts the source</text>
  <text x="28" y="289" class="s-mono" style="font-size:8px">measured: contradiction 0.9810 on an invented refund window</text>
  <rect x="388" y="264" width="356" height="30" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="400" y="277" class="s-mono" style="font-size:9px;fill:var(--warn)">EXTRINSIC &#183; adds what the source omits</text>
  <text x="400" y="289" class="s-mono" style="font-size:8px">measured: neutral 0.9857 on a fabricated citation</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Classify your own hallucinations", difficulty: "core", minutes: 25,
      body: "Collect ten real hallucinations from your system's logs or user reports. Classify each as intrinsic or extrinsic, identify which of the five triggers produced it, and decide whether faithfulness or factuality is the metric that would have caught it. The distribution tells you which mitigation to build first.",
      requirements: [
        "Ten real cases, not invented ones",
        "Each classified intrinsic or extrinsic, with the source text that settles it",
        "Each mapped to one of the five triggers",
        "Faithfulness or factuality named as the relevant metric per case",
        "The distribution summarised, with the mitigation it implies"
      ],
      hint: "If most are extrinsic, your problem is a missing abstention path or an over-long output. If most are intrinsic, the model is overriding its context and the prompt is not forcing it to prefer the source.",
      solution: { lang: "python", title: "a hallucination triage sheet", code: `CASES = [
    # (what the model said, what the source said, trigger)
    ("30-day refund on opened software", "14 days, unopened only",      "knowledge_gap"),
    ("Smith et al. (2021), d=0.42",      "no such paper in context",    "leading_prompt"),
    ("termination penalty of $50,000",   "no termination fee applies",  "over_long_output"),
    ("support is 24/7",                  "business hours only",         "knowledge_gap"),
    ("5 studies listed",                 "2 studies in context",        "leading_prompt"),
    ("API rate limit is 1000/min",       "context silent on limits",    "knowledge_gap"),
    ("price increased in March",         "context says April",          "rare_fact"),
    ("compatible with v3 and v4",        "context mentions v4 only",    "over_long_output"),
    ("policy effective immediately",     "two conflicting dates",       "conflicting_context"),
    ("CEO is Jane Doe",                  "context silent",              "knowledge_gap"),
]

def classify(said, source):
    """Intrinsic = the source says something ELSE. Extrinsic = the source is SILENT."""
    silent = "silent" in source or "no such" in source
    return "extrinsic" if silent else "intrinsic"

def metric_for(kind):
    return "faithfulness" if kind in ("intrinsic", "extrinsic") else "factuality"

rows = [(s, src, t, classify(s, src)) for s, src, t in CASES]

print("%-34s %-30s %-12s %s" % ("model said", "source said", "trigger", "kind"))
for said, src, trig, kind in rows:
    print("%-34s %-30s %-12s %s" % (said[:34], src[:30], trig[:12], kind))

from collections import Counter
print()
print("by kind:    %s" % dict(Counter(k for *_, k in rows)))
print("by trigger: %s" % dict(Counter(t for _, _, t, _ in rows)))

print()
ex = sum(1 for *_, k in rows if k == "extrinsic")
print("extrinsic %d of %d (%.0f%%)" % (ex, len(rows), 100.0 * ex / len(rows)))
if ex > len(rows) / 2:
    print("  -> mostly EXTRINSIC: the model is inventing where the source is silent.")
    print("     first fixes: an abstention path, and a cap on output length.")
else:
    print("  -> mostly INTRINSIC: the model is overriding its context.")
    print("     first fixes: instruct it to prefer context; lower temperature.")

print()
trig = Counter(t for _, _, t, _ in rows)
print("the two triggers you CONTROL, not the model:")
for t in ("leading_prompt", "over_long_output"):
    print("  %-18s %d of %d cases" % (t, trig[t], len(rows)))
print("  -> %d of %d are prompt-design choices, fixable for free."
      % (trig["leading_prompt"] + trig["over_long_output"], len(rows)))`,
        out: `model said                         source said                    trigger      kind
30-day refund on opened software   14 days, unopened only         knowledge_ga intrinsic
Smith et al. (2021), d=0.42        no such paper in context       leading_prom extrinsic
termination penalty of $50,000     no termination fee applies     over_long_ou intrinsic
support is 24/7                    business hours only            knowledge_ga intrinsic
5 studies listed                   2 studies in context           leading_prom intrinsic
API rate limit is 1000/min         context silent on limits       knowledge_ga extrinsic
price increased in March           context says April             rare_fact    intrinsic
compatible with v3 and v4          context mentions v4 only       over_long_ou intrinsic
policy effective immediately       two conflicting dates          conflicting_ intrinsic
CEO is Jane Doe                    context silent                 knowledge_ga extrinsic

by kind:    {'intrinsic': 7, 'extrinsic': 3}
by trigger: {'knowledge_gap': 4, 'leading_prompt': 2, 'over_long_output': 2, 'rare_fact': 1, 'conflicting_context': 1}

extrinsic 3 of 10 (30%)
  -> mostly INTRINSIC: the model is overriding its context.
     first fixes: instruct it to prefer context; lower temperature.

the two triggers you CONTROL, not the model:
  leading_prompt     2 of 10 cases
  over_long_output   2 of 10 cases
  -> 4 of 10 are prompt-design choices, fixable for free.`,
        notes: [
          { t: "p", text: "**Four of ten are prompt-design choices rather than model behaviour.** Two leading prompts and two over-long outputs \u2014 asking for five studies when two exist, and asking for more summary than the document supports. Both are instructions the model cannot satisfy honestly, and both are free to fix." },
          { t: "p", text: "**The intrinsic/extrinsic split decides the first mitigation**, which is why the classifier is worth the ten minutes. Seven intrinsic cases mean the model is overriding context it was given, so the fix is prompt precedence and a lower temperature. Three extrinsic cases mean it invented where the source was silent, so the fix is an abstention path." },
          { t: "p", text: "**My classifier is deliberately crude and that is a limit worth naming.** It decides intrinsic versus extrinsic by looking for the word \u2018silent\u2019 in a human-written note, which works on a triage sheet and is not a detector. 11.4 does this properly with an entailment model, where contradiction and neutral give the same split without a human in the loop." },
          { t: "p", text: "The one case that resists the binary is \u2018policy effective immediately\u2019 against two conflicting dates. The source is not silent and not singular \u2014 it contradicts itself, so the model had to guess and any answer is unsupported. That is a corpus problem, and 10.13 is where it gets fixed." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "An LLM maximises plausibility, not truth, and has no representation for \u2018I do not know this\u2019. So hallucination is the default behaviour of an ungrounded model, and abstention is a capability you have to add rather than one you can assume." },
        { t: "p", text: "Measure faithfulness in RAG (supported by the provided context) and factuality closed-book (true of the world) \u2014 they are different metrics. And keep the intrinsic/extrinsic split, because an entailment detector gives it to you for free as contradiction against neutral, and the two need different fixes." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhy do LLMs hallucinate, and how do you stop it?\u201d**" },
        { t: "p", text: "They hallucinate because of what they are optimised for. Next-token prediction maximises the probability of a plausible continuation, and there is no term in that objective for truth and no internal state representing \u2018I have no evidence here\u2019. Asked for a company\u2019s quarterly revenue it has never seen, the most likely continuation is a number, so a number arrives \u2014 fluent, well-formatted and invented." },
        { t: "p", text: "So I would push back gently on \u2018stop\u2019. Hallucination is the default behaviour of an ungrounded model rather than a malfunction, and there is no patch that makes a next-token predictor know what it does not know. The engineering question is what our rate is, on which inputs, and what we do when we detect one." },
        { t: "p", text: "The single highest-value change is giving the model permission to abstain. If it is never allowed to say \u2018that is not in the documents\u2019, it will guess, because guessing is what the objective rewards. A grounded system prompt with an explicit abstention path removes a large fraction of RAG hallucinations for free." },
        { t: "p", text: "I would also want to separate two things people conflate. Faithfulness is whether the answer is supported by the context we supplied; factuality is whether it is true of the world. RAG systems live or die on faithfulness, and a system can be perfectly faithful to a document that is itself wrong \u2014 those are different failures with different owners." },
        { t: "p", text: "And I would classify before mitigating, because the fix depends on the kind. An intrinsic hallucination contradicts the source, which means the model overrode context it was given \u2014 fix prompt precedence and lower the temperature. An extrinsic one adds something the source is silent about \u2014 fix the abstention path and cap the output length. Usefully, an entailment detector gives you that split for nothing: measured on a set of real cases, an invented refund window came back as contradiction at 0.98 and a fabricated citation as neutral at 0.99." },
        { t: "p", text: "Last, two of the common triggers are things we do rather than things the model does. Asking for five studies when three exist is an instruction to invent two, and asking for a 500-word summary of 200 words of relevant content is an instruction to invent 300 words. Both are free to fix, and both get blamed on the model." }
      ] }
  ],

  takeaways: [
    "**An LLM maximises plausibility, not truth** \u2014 nothing in next-token prediction rewards being right.",
    "**Hallucination is the default behaviour of an ungrounded model**, not a malfunction, so it is measured rather than fixed.",
    "**The model has no representation for \u201cI do not know this\u201d**, which is why abstention is a capability you add.",
    "**The dangerous word is \u201cconfidently\u201d** \u2014 a hallucination looks exactly like a correct answer, with no stack trace and no exception.",
    "**Faithfulness is support by the provided context; factuality is truth about the world** \u2014 different metrics, and RAG depends on the first.",
    "**A system can be perfectly faithful to a document that is wrong**, which is a corpus failure rather than a model one.",
    "**Intrinsic hallucination contradicts the source; extrinsic adds what the source omits** \u2014 and they need different fixes.",
    "**An entailment detector gives that split for free**: measured, an invented refund window scored contradiction 0.9810 and a fake citation neutral 0.9857.",
    "**Extrinsic is more dangerous to a reader**, because a contradiction can be checked against the source and an addition cannot.",
    "**Five triggers**: knowledge gaps, long-tail facts, leading prompts, over-long outputs, conflicting context.",
    "**Two of the five are your prompt, not the model** \u2014 asking for five studies when three exist, and asking for more words than the source supports.",
    "**Both of those are free to fix**, and both are routinely blamed on the model."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is hallucination described as the default behaviour of an ungrounded model?",
        options: [
          "Because most models are undertrained on factual data",
          "Because next-token prediction optimises plausibility and has no term for truth or any state representing \u201cI do not know\u201d",
          "Because temperature above zero introduces randomness that produces false statements",
          "Because tokenisation loses the information needed to recall facts precisely"
        ],
        answer: 1,
        why: "The objective rewards a likely-looking continuation, so after \u201cQ3 revenue was\u201d the most probable next tokens form a number regardless of whether the model has seen the filing. There is no internal signal marking a region of the distribution as unevidenced, which is why abstention has to be granted explicitly rather than assumed. Temperature changes how adventurous the sampling is, never whether the model knows." },

      { stem: "A RAG answer is perfectly supported by a retrieved document, but the document is out of date. What failed?",
        options: [
          "Faithfulness, because the answer does not match reality",
          "Nothing in faithfulness \u2014 the answer is faithful; factuality failed, and the cause is the corpus",
          "Both faithfulness and factuality, since the two always move together",
          "Answer relevancy, because the answer addresses a stale version of the question"
        ],
        answer: 1,
        why: "Faithfulness asks only whether the claims are supported by the supplied context, and they are \u2014 so a faithfulness judge will score this answer well, which is exactly why the two metrics must be kept separate. The failure is factuality, owned by whoever maintains the index rather than by the prompt or the model. This is the same structure as the observability incident where faithfulness stayed at 0.95 while the retrieved context was wrong." },

      { stem: "An entailment model returns contradiction 0.98 for one claim and neutral 0.99 for another. What does that distinguish?",
        options: [
          "A confident hallucination from an uncertain one",
          "Intrinsic hallucination, which contradicts the source, from extrinsic, which adds what the source omits",
          "A factual error from a formatting error",
          "A retrieval failure from a generation failure"
        ],
        answer: 1,
        why: "Contradiction means the context says something incompatible, which is the definition of intrinsic; neutral means the context is simply silent, which is extrinsic and unverifiable from the given source. The three-way output therefore hands you a classification the reference defines separately without connecting it to detection \u2014 and the two call for different fixes, prompt precedence versus an abstention path." },

      { stem: "Which hallucination triggers are under your control rather than the model's?",
        options: [
          "Knowledge gaps and long-tail facts, by fine-tuning on more data",
          "Leading prompts and over-long outputs \u2014 asking for five studies when three exist, or more summary than the source supports",
          "Conflicting context, by raising the retrieval threshold",
          "All five, since every trigger is a prompt-engineering problem"
        ],
        answer: 1,
        why: "Both are instructions the model cannot satisfy honestly: a request for a fixed count of items it cannot find, and a length target exceeding the supported content, each force invention. In a sample triage of ten real cases, four fell into these two categories, and both are free to fix by asking for what exists and capping output length. Conflicting context is a corpus problem, not a prompting one." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Why models hallucinate",
    questions: [
      { level: "core",
        q: "What is a hallucination, mechanically?",
        strong: "A strong answer describes the objective, not a metaphor.",
        answer: [
          { t: "p", text: "It is the model doing what it was trained to do on an input where plausibility and truth diverge. Next-token prediction maximises the probability of a likely continuation, and nothing in that objective rewards being right." },
          { t: "p", text: "So when it is asked for a figure it has never seen, the most probable continuation after \u2018revenue was\u2019 is a number in the usual format \u2014 and it produces one. It has no state that says \u2018this region is unevidenced\u2019, so there is nothing to make it stop." },
          { t: "p", text: "That makes it the default behaviour of an ungrounded model rather than a malfunction, which changes the engineering question from \u2018how do we stop it\u2019 to \u2018what is our rate, on which inputs, and what happens when we detect one\u2019." },
          { t: "p", text: "And the operationally nasty part is the tone. It is HTTP 200, normal latency, normal cost, fluent prose \u2014 no stack trace, no null, no exception. It looks exactly like a correct answer." }
        ] },

      { level: "core",
        q: "Faithfulness or factuality \u2014 which do you measure?",
        strong: "A strong answer says it depends on whether there is context.",
        answer: [
          { t: "p", text: "In RAG, faithfulness: whether every claim is supported by the context we supplied. Closed-book, factuality: whether the answer is true of the world. They are different metrics and a system can pass one while failing the other." },
          { t: "p", text: "The case that makes the distinction concrete is an answer perfectly supported by a document that is itself out of date. A faithfulness judge scores it well and should, because the generator did its job. The failure belongs to whoever maintains the index." },
          { t: "p", text: "That is also why faithfulness is the more useful production metric despite being the weaker guarantee \u2014 it isolates the generator from the corpus, so a bad score points at the prompt or the model and a good score with bad answers points at retrieval." },
          { t: "p", text: "I would report both where I can, and I would never let a good faithfulness number stand in for correctness without a retrieval metric beside it." }
        ] },

      { level: "advanced",
        q: "Where would you start reducing hallucination in an existing RAG system?",
        strong: "A strong answer starts with abstention and the prompt.",
        answer: [
          { t: "p", text: "With the abstention path, because it is free and it is usually missing. A model that is never permitted to say \u2018that is not in the documents\u2019 will guess, since guessing is what the objective rewards \u2014 adding that permission to the system prompt removes a large fraction of RAG hallucinations on its own." },
          { t: "p", text: "Then I would look for the two triggers that are our fault rather than the model\u2019s: prompts that demand a fixed number of items, and length targets that exceed the supported content. Both are instructions to invent, and both are usually blamed on the model." },
          { t: "p", text: "Then classify what remains as intrinsic or extrinsic, because the fixes diverge. Contradictions mean the model is overriding its context, so instruct it to prefer the source and lower the temperature. Neutrals mean it invented where the source was silent, so the abstention path and the output cap are the levers." },
          { t: "p", text: "And before any of that I would check retrieval, because most \u2018hallucinations despite RAG\u2019 are retrieval misses \u2014 the right chunk never arrived and the model filled the gap from parametric memory." }
        ] }
    ]
  }
});
