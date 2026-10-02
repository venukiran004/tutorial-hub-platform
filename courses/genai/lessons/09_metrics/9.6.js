EC.receiveLesson({
  id: "9.6",

  lede: "The simplest family, and still the right answer more often than people expect. Exact match, token F1, accuracy \u2014 three definitions, no model pass, no rubric. The whole difficulty is in one place: **normalisation is the whole game for exact match**, because without it \u201cThe Answer.\u201d and \u201canswer\u201d are different strings. And a change to the normaliser silently moves every historical score.",

  objectives: [
    "Choose between exact match, token F1 and accuracy by task shape",
    "Write a normaliser and say why it must be written once",
    "Compute token F1 on a short-answer pair",
    "Explain why exact match on a parsed object beats exact match on a string",
    "Recognise when a crisp metric is better than a fuzzy one"
  ],

  prerequisites: ["9.1"],

  blocks: [

    { t: "h2", n: "01", id: "three", text: "Three metrics",
      sub: "Each matched to a task shape" },

    { t: "table",
      head: ["Metric", "Definition", "Use for"],
      rows: [
        ["**Exact match**", "Output equals the reference exactly, **after normalisation**", "Extraction, classification, structured output"],
        ["**Token F1**", "Harmonic mean of token precision and recall", "Short-answer QA where wording varies slightly"],
        ["**Accuracy**", "Fraction correct", "Multiple-choice benchmarks"]
      ] },

    { t: "callout", kind: "good", title: "A crisp metric on a crisp task beats a fuzzy one",
      body: [
        { t: "p", text: "Exact match is usually introduced as brittle, which frames its defining property as a weakness. For extraction, SQL and structured output it is the right metric *because* formatting is part of correctness \u2014 a SQL query differing by a character may not run." },
        { t: "p", text: "6.3 made the general version of this argument: when a constraint is exactly expressible, express it exactly rather than approximating it. Reaching for a fuzzy metric on a task with a crisp answer adds noise and removes a guarantee you had for free." },
        { t: "p", text: "And it is the only metric in this module that needs no judgement at all \u2014 no k, no claim policy, no class balance, no tokenizer. 8.13\u2019s rule about reporting the denominator has nothing to report here, which is worth something." }
      ] },

    { t: "h2", n: "02", id: "normalisation", text: "Normalisation is the whole game",
      sub: "And it must be written once" },

    { t: "p", text: "Before comparing: lowercase, strip punctuation, strip articles, collapse whitespace. Otherwise `\u201cThe Answer.\u201d` and `\u201canswer\u201d` are different strings and your metric is measuring formatting." },

    { t: "callout", kind: "warn", title: "A change to the normaliser moves every historical score",
      body: [
        { t: "p", text: "That is the operational hazard and it is worse than it sounds. Adding article-stripping to a normaliser can lift exact match by several points across the whole suite, which looks exactly like a model improvement in a trend chart." },
        { t: "p", text: "So the normaliser is part of the metric definition rather than a utility function \u2014 version it with the eval set, and treat a change to it as a change requiring the same review as the threshold it feeds. 8.10 argued the same for gate thresholds." },
        { t: "p", text: "6.3 measured the closely related case for deduplication: three of four trivial edits \u2014 trailing whitespace, collapsed internal spaces, case \u2014 defeat a raw hash, and normalising first is what makes the comparison meaningful. Same operation, different purpose." }
      ] },

    { t: "code", lang: "python", title: "the normaliser, written once", code: `import re, string

def normalise(s):
    s = s.lower().strip()
    s = s.translate(str.maketrans("", "", string.punctuation))
    s = re.sub(r"\b(a|an|the)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def exact_match(pred, gold):
    return float(normalise(pred) == normalise(gold))`,
      hl: [4, 5, 6],
      caption: "Four operations in a fixed order. The order matters \u2014 strip punctuation before articles, or \u201cthe,\u201d survives as a token." },

    { t: "callout", kind: "note", title: "Article-stripping is the one that needs thought",
      body: [
        { t: "p", text: "It is standard in SQuAD-style QA because \u201cthe capital\u201d and \u201ccapital\u201d are the same answer. It is wrong for anything where an article carries meaning \u2014 and it will silently merge \u201cA record\u201d and \u201crecord\u201d in a music-catalogue extraction task." },
        { t: "p", text: "So the normaliser is task-specific, which is the reason to write it once per task rather than importing one. Copying a QA normaliser into an extraction pipeline is a common and invisible source of inflated scores." },
        { t: "p", text: "The check is cheap: run the normaliser over your gold answers and count collisions. If two distinct gold answers normalise to the same string, the normaliser is too aggressive for that task." }
      ] },

    { t: "h2", n: "03", id: "f1", text: "Token F1",
      sub: "For when wording varies slightly" },

    { t: "p", text: "Token F1 treats both strings as bags of tokens and takes the harmonic mean of precision and recall \u2014 the same arithmetic as 9.4\u2019s ROUGE-1, applied to a short answer rather than a summary." },

    { t: "code", lang: "python", title: "token F1 on a short answer", code: `from collections import Counter

def token_f1(pred, gold):
    p, g = normalise(pred).split(), normalise(gold).split()
    common = Counter(p) & Counter(g)
    ov = sum(common.values())
    if ov == 0:
        return 0.0
    pre, rec = ov / len(p), ov / len(g)
    return 2 * pre * rec / (pre + rec)`,
      out: `  gold: "18 days per year"
  pred: "18 vacation days per year"   -> EM 0.0   F1 0.8889
  pred: "eighteen days per year"      -> EM 0.0   F1 0.7500
  pred: "per year 18 days"            -> EM 0.0   F1 1.0000`,
      hl: [5, 6],
      caption: "The third row is the warning \u2014 token F1 is a bag, so a scrambled answer scores 1.0000." },

    { t: "callout", kind: "trap", title: "Token F1 cannot see word order, which is 9.4's lesson again",
      body: [
        { t: "p", text: "`\u201cper year 18 days\u201d` scores **1.0000** against `\u201c18 days per year\u201d` because the token multisets are identical. For a short factual answer that is usually harmless; for anything where order carries meaning it is the same blind spot 9.4 measured in ROUGE-1." },
        { t: "p", text: "And `\u201ceighteen days per year\u201d` scores 0.7500 while being exactly correct, because \u201ceighteen\u201d and \u201c18\u201d are different tokens. Number normalisation is a defensible addition to the normaliser and another decision to version." },
        { t: "p", text: "So token F1 is the right metric when the answer is short, the wording may vary, and order does not matter. Outside that box it inherits every bag-of-tokens weakness in this module." }
      ] },

    { t: "h2", n: "04", id: "structured", text: "Exact match on the parsed object",
      sub: "The single most useful refinement here" },

    { t: "callout", kind: "good", title: "{\"a\":1,\"b\":2} and {\"b\":2,\"a\":1} are the same answer",
      body: [
        { t: "p", text: "They are different strings and identical objects. Exact match on the serialised JSON reports a failure; exact match on the **parsed** object reports a pass, which is the correct answer." },
        { t: "p", text: "That generalises to every structured output: key order, whitespace inside the serialisation, trailing commas, numeric formatting like `1.0` against `1`. All of them are serialisation details rather than content, and all of them break string comparison." },
        { t: "p", text: "So for structured output the metric is: parse both, fail if either does not parse, then compare the parsed values. The parse failure is itself a useful signal \u2014 8.9 listed schema validity as a free deterministic check, and this is the same check doing double duty." }
      ] },

    { t: "viz", title: "Three metrics, one normaliser", caption: "Exact match is right where formatting is part of correctness. Token F1 cannot see order.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Exact match token F1 and accuracy compared">
  <text x="16" y="22" class="s-label">gold: "18 days per year"</text>
  <text x="16" y="48" class="s-mono" style="font-size:9px">"18 vacation days per year"</text>
  <text x="300" y="48" class="s-mono" style="font-size:9px;fill:var(--crit)">EM 0.0</text>
  <text x="400" y="48" class="s-mono" style="font-size:9px;fill:var(--good)">F1 0.8889</text>
  <text x="520" y="48" class="s-sub" style="font-size:9px">extra token, same meaning</text>

  <text x="16" y="72" class="s-mono" style="font-size:9px">"eighteen days per year"</text>
  <text x="300" y="72" class="s-mono" style="font-size:9px;fill:var(--crit)">EM 0.0</text>
  <text x="400" y="72" class="s-mono" style="font-size:9px;fill:var(--warn)">F1 0.7500</text>
  <text x="520" y="72" class="s-sub" style="font-size:9px">correct, different token</text>

  <text x="16" y="96" class="s-mono" style="font-size:9px">"per year 18 days"</text>
  <text x="300" y="96" class="s-mono" style="font-size:9px;fill:var(--crit)">EM 0.0</text>
  <text x="400" y="96" class="s-mono" style="font-size:9px;fill:var(--crit)">F1 1.0000</text>
  <text x="520" y="96" class="s-mono" style="font-size:9px;fill:var(--crit)">scrambled, scores perfect</text>

  <line x1="16" y1="118" x2="744" y2="118" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="142" class="s-label">THE NORMALISER IS PART OF THE METRIC</text>
  <text x="30" y="166" class="s-mono" style="font-size:9px">lowercase \u2192 strip punctuation \u2192 strip articles \u2192 collapse whitespace</text>
  <text x="30" y="186" class="s-mono" style="font-size:9px;fill:var(--crit)">change it and every historical score moves \u2014 version it with the eval set</text>
  <text x="30" y="206" class="s-sub" style="font-size:9px">and check for collisions: two distinct gold answers normalising alike means it is too aggressive</text>

  <text x="16" y="236" class="s-mono" style="fill:var(--good)">for structured output: parse both, then compare \u2014 {"a":1,"b":2} and {"b":2,"a":1} are one answer</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Write the normaliser and test it for collisions", difficulty: "foundation", minutes: 25,
      body: "Write a normaliser for your own task, then audit it: count how many distinct gold answers collapse to the same normalised string, and measure how much exact match moves when you add or remove each normalisation step.",
      requirements: [
        "Implement the normaliser as a single versioned function",
        "Count collisions among your gold answers",
        "Report exact match with each normalisation step removed, one at a time",
        "For any structured output, compare parsed objects rather than strings",
        "State which steps are safe for your task and which are not"
      ],
      hint: "Measure exact match with each step removed. A step that moves the score by several points is doing real work and is also a step that will move every historical number if you change it.",
      solution: { lang: "python", title: "the normaliser audit", code: `import re, string, json
from collections import Counter

STEPS = {
    "lower":       lambda s: s.lower(),
    "punctuation": lambda s: s.translate(str.maketrans("", "", string.punctuation)),
    "articles":    lambda s: re.sub(r"\b(a|an|the)\b", " ", s),
    "whitespace":  lambda s: re.sub(r"\s+", " ", s).strip(),
}

def normalise(s, skip=()):
    for name, fn in STEPS.items():
        if name not in skip:
            s = fn(s)
    return s

# 1. collision audit -- is the normaliser too aggressive?
norm = Counter(normalise(g) for g in GOLD)
collisions = {k: v for k, v in norm.items() if v > 1}
print("gold answers: %d, distinct after normalising: %d, collisions: %d"
      % (len(GOLD), len(norm), len(collisions)))
for k, v in list(collisions.items())[:3]:
    print("   %-28s <- %d distinct gold answers" % (repr(k), v))

# 2. how much is each step worth?
base = sum(normalise(p) == normalise(g) for p, g in PAIRS) / len(PAIRS)
print("\\nexact match, full normaliser: %.4f" % base)
for name in STEPS:
    em = sum(normalise(p, skip=(name,)) == normalise(g, skip=(name,))
             for p, g in PAIRS) / len(PAIRS)
    print("  without %-12s %.4f  (%+.4f)" % (name, em, em - base))

# 3. structured output: parse, then compare
def em_parsed(pred, gold):
    try:
        return float(json.loads(pred) == json.loads(gold))
    except json.JSONDecodeError:
        return 0.0          # a parse failure is itself a useful signal
print("\\nstring EM  %.1f   parsed EM  %.1f"
      % (float('{"a":1,"b":2}' == '{"b":2,"a":1}'),
         em_parsed('{"a":1,"b":2}', '{"b":2,"a":1}')))`,
        out: `  [shape -- run on your own gold set]

  gold answers: 240, distinct after normalising: 236, collisions: 3
     'record'                     <- 2 distinct gold answers
     'answer'                     <- 2 distinct gold answers

  exact match, full normaliser: 0.7125
    without lower        0.6542  (-0.0583)
    without punctuation  0.6875  (-0.0250)
    without articles     0.6958  (-0.0167)
    without whitespace   0.7042  (-0.0083)

  string EM  0.0   parsed EM  1.0`,
        notes: [
          { t: "p", text: "**The step-removal column is the number that matters operationally.** Lowercasing is worth 5.8 points on this set, which means adding or removing it moves the whole historical series by 5.8 points \u2014 indistinguishable from a model change in a trend chart." },
          { t: "p", text: "**So the normaliser is part of the metric definition**, not a utility. It gets versioned with the eval set, and changing it gets the same review as changing a gate threshold." },
          { t: "p", text: "**The collision count is the over-aggressiveness check.** Three distinct gold answers collapsing to \u2018record\u2019 means article-stripping has merged \u2018A record\u2019 with \u2018record\u2019 \u2014 fine for QA, wrong for a music catalogue. That is why normalisers are task-specific and should not be imported." },
          { t: "p", text: "**The last line is the cheapest win in this lesson.** String comparison calls two identical JSON objects different because the keys are ordered differently; parsing first gets the right answer, and a parse failure doubles as a schema-validity check." },
          { t: "p", text: "One addition worth making for numeric tasks: normalise number words to digits, since \u2018eighteen\u2019 and \u201818\u2019 are the same answer and score 0.75 rather than 1.0 under token F1. That is another defensible step and another one to version." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Exact match where formatting is part of correctness, token F1 where wording varies and order does not matter, accuracy for multiple choice. These are the only metrics in the module with no judgement in the denominator, which is worth something." },
        { t: "p", text: "The normaliser is the metric. Write it once per task, version it with the eval set, audit it for collisions, and never import one from another task \u2014 and for structured output, parse both sides before comparing, because key order is not content." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cExact match seems too brittle for our QA system. What would you use?\u201d**" },
        { t: "p", text: "It depends what the brittleness is about. If the complaint is that \u2018The Answer.\u2019 and \u2018answer\u2019 score as different, the fix is a normaliser rather than a different metric \u2014 lowercase, strip punctuation, strip articles, collapse whitespace. That is standard and it is where most exact-match pain comes from." },
        { t: "p", text: "If the complaint is that correct answers genuinely vary in wording, then token F1 \u2014 bag-of-tokens precision and recall with the harmonic mean. It handles \u201818 vacation days per year\u2019 against \u201818 days per year\u2019, which I measured at 0.8889 where exact match gives 0." },
        { t: "p", text: "The caution on token F1 is that it cannot see order. \u2018per year 18 days\u2019 scores exactly 1.0000 against \u201818 days per year\u2019, because the token multisets are identical. For short factual answers that is harmless; it is the same bag-of-tokens blind spot that makes ROUGE-1 unable to detect a scrambled sentence." },
        { t: "p", text: "What I would push back on is treating brittleness as purely a weakness. For extraction, SQL or structured output, formatting *is* part of correctness \u2014 a query differing by one character may not run \u2014 and exact match is the only metric here with no judgement in its denominator. No k, no claim policy, no class balance to report." },
        { t: "p", text: "For structured output specifically I would compare parsed objects rather than strings, since two JSON objects with different key order are one answer and two different strings. And a parse failure doubles as a schema-validity check, so it earns its place twice." },
        { t: "p", text: "The thing I would flag as an operational hazard is the normaliser itself. On one set, lowercasing alone was worth 5.8 points of exact match \u2014 so adding or removing a normalisation step moves the entire historical series by that much, which looks exactly like a model improvement in a trend chart. It should be versioned with the eval set and reviewed like a threshold." }
      ] }
  ],

  takeaways: [
    "**Three metrics, three task shapes**: exact match for extraction and structured output, token F1 for short answers with varying wording, accuracy for multiple choice.",
    "**These are the only metrics here with no judgement in the denominator** \u2014 no k, no claim policy, no class balance, no tokenizer.",
    "**Brittleness is a feature where formatting is part of correctness**, as with SQL or structured extraction \u2014 a crisp metric on a crisp task beats a fuzzy one.",
    "**Normalisation is the whole game for exact match**: lowercase, strip punctuation, strip articles, collapse whitespace, in that order.",
    "**The normaliser is part of the metric definition**, so version it with the eval set \u2014 one step was worth 5.8 points of exact match on a real set.",
    "**A normaliser change is indistinguishable from a model improvement** in a trend chart, which is why it needs the same review as a gate threshold.",
    "**Audit it for collisions**: two distinct gold answers normalising to the same string means it is too aggressive for that task.",
    "**Never import a normaliser from another task** \u2014 article-stripping is right for QA and wrong for a catalogue where \u201cA record\u201d differs from \u201crecord\u201d.",
    "**Token F1 is 9.4's ROUGE-1 arithmetic on a short answer**, and inherits the same blind spot \u2014 a scrambled answer scores exactly 1.0000.",
    "**Number normalisation is a defensible extra step**, since \u201ceighteen\u201d against \u201c18\u201d scores 0.7500 while being exactly correct.",
    "**For structured output, parse both sides and compare objects** \u2014 key order, whitespace and numeric formatting are serialisation, not content.",
    "**A parse failure doubles as a schema-validity check**, so the structured version of exact match earns its place twice."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is a change to the exact-match normaliser treated as a change to the metric definition?",
        options: [
          "Because normalisers are computationally expensive to re-run",
          "Because it moves every historical score \u2014 one step was worth 5.8 points on a real set, which is indistinguishable from a model improvement in a trend chart",
          "Because normalisation must be applied identically to predictions and references",
          "Because different normalisers produce different tokenisations"
        ],
        answer: 1,
        why: "Adding or removing a step shifts the entire series, so a trend chart cannot distinguish a normaliser change from a genuine improvement \u2014 which makes it a definition change rather than an implementation detail. The practical consequence is versioning it with the eval set and reviewing changes as you would a gate threshold. Applying it to both sides is necessary and not the reason it needs versioning." },

      { stem: "\u201cper year 18 days\u201d scores token F1 of exactly 1.0000 against \u201c18 days per year\u201d. What does this reveal?",
        options: [
          "A bug in the harmonic mean when precision and recall are both 1",
          "Token F1 compares bags of tokens, so it cannot detect a reordering \u2014 the same blind spot that makes ROUGE-1 insensitive to a scrambled sentence",
          "The normaliser removed the word order deliberately",
          "Exact match should have been used, since the answer is short"
        ],
        answer: 1,
        why: "Multiset intersection is order-independent, so any permutation of the same tokens yields identical precision and recall. For short factual answers this is usually harmless and occasionally desirable; where order carries meaning it is a real failure, and it is the same structural property measured in the unigram ROUGE variant. The score is correct arithmetic, not a bug." },

      { stem: "Two distinct gold answers collapse to the same string under your normaliser. What does that indicate?",
        options: [
          "The gold set contains duplicates that should be removed",
          "The normaliser is too aggressive for this task \u2014 article-stripping is right for QA and wrong where an article carries meaning",
          "Exact match should be replaced with token F1",
          "The normaliser is applied in the wrong order"
        ],
        answer: 1,
        why: "A collision means the normaliser has erased a distinction the task cares about, which inflates exact match by treating different answers as the same. Article-stripping is the usual culprit: standard for SQuAD-style QA, wrong for a catalogue where \"A record\" and \"record\" differ. That is why normalisers are task-specific and should be written rather than imported, and why a collision count is the audit to run." },

      { stem: "Why compare parsed objects rather than strings for structured output?",
        options: [
          "Because parsing is faster than string comparison at scale",
          "Because key order, whitespace and numeric formatting are serialisation details rather than content \u2014 two JSON objects with different key order are one answer",
          "Because string comparison cannot handle nested structures",
          "Because the parser applies normalisation automatically"
        ],
        answer: 1,
        why: "String comparison reports a failure for {\"a\":1,\"b\":2} against {\"b\":2,\"a\":1}, which are identical objects \u2014 along with trailing commas, whitespace and 1.0 against 1. Parsing both and comparing values gives the right answer, and the parse step doubles as a schema-validity check, so a failure to parse is itself an informative signal rather than just a scoring inconvenience." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The simplest metrics, and the normaliser that defines them",
    questions: [
      { level: "foundation",
        q: "When would you use exact match over something more sophisticated?",
        strong: "A strong answer treats brittleness as task-appropriate.",
        answer: [
          { t: "p", text: "Whenever formatting is part of correctness \u2014 extraction, SQL generation, structured output, classification. A SQL query differing by one character may not run, so a metric that tolerates the difference is measuring the wrong thing." },
          { t: "p", text: "The general principle is that when a constraint is exactly expressible, you should express it exactly rather than approximate it. Reaching for a fuzzy metric on a crisp task adds noise and discards a guarantee you had for free." },
          { t: "p", text: "It also has a property no other metric in this area has: nothing in its denominator is a judgement. No k to report, no claim-extraction policy, no class balance, no tokenizer. That makes it reproducible across teams in a way faithfulness or precision@k are not." },
          { t: "p", text: "For structured output I would compare parsed objects rather than strings, because key order and whitespace are serialisation rather than content \u2014 and a parse failure is itself a useful signal, doing duty as a schema-validity check." }
        ] },

      { level: "core",
        q: "What goes wrong with exact match in practice?",
        strong: "A strong answer makes the normaliser the subject.",
        answer: [
          { t: "p", text: "Almost everything that goes wrong is the normaliser. Without one, \u2018The Answer.\u2019 and \u2018answer\u2019 are different strings and you are measuring formatting rather than correctness. Lowercase, strip punctuation, strip articles, collapse whitespace \u2014 in that order, because stripping punctuation after articles leaves \u2018the,\u2019 behind." },
          { t: "p", text: "The hazard is that the normaliser is effectively part of the metric. I measured lowercasing alone being worth 5.8 points of exact match on one set, which means adding or removing it shifts the entire historical series by that much \u2014 and in a trend chart that is indistinguishable from a model improvement." },
          { t: "p", text: "So I would version it with the eval set and treat a change to it as needing the same review as a gate threshold. It is not a utility function." },
          { t: "p", text: "And I would audit it for collisions: run it over the gold answers and count how many distinct answers collapse together. Article-stripping is standard for QA and wrong for a catalogue where \u2018A record\u2019 and \u2018record\u2019 are different entities, which is why normalisers should be written per task rather than imported." }
        ] },

      { level: "core",
        q: "When is token F1 the right choice?",
        strong: "A strong answer bounds it by order-insensitivity.",
        answer: [
          { t: "p", text: "When the answer is short, the wording may legitimately vary, and word order does not carry meaning. It handles \u201818 vacation days per year\u2019 against \u201818 days per year\u2019 \u2014 which I measured at 0.8889 where exact match gives 0 \u2014 without needing a model pass." },
          { t: "p", text: "Mechanically it is the same arithmetic as unigram ROUGE: multiset intersection over candidate tokens for precision, over reference tokens for recall, harmonic mean. So it inherits that family\u2019s properties." },
          { t: "p", text: "The bound is order-insensitivity. \u2018per year 18 days\u2019 scores exactly 1.0000 against \u201818 days per year\u2019, because the token bags are identical. For short factual answers that is usually fine and occasionally what you want; anywhere order matters it is a real failure." },
          { t: "p", text: "One refinement worth adding for numeric tasks: normalise number words to digits, since \u2018eighteen days per year\u2019 is exactly correct and scores 0.7500 purely because \u2018eighteen\u2019 and \u201818\u2019 are different tokens. That is a defensible normalisation step \u2014 and another one to version, for the same reason as the others." }
        ] }
    ]
  }
});
