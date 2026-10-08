EC.receiveLesson({
  id: "1.4",

  lede: "An output parser turns a model's string into something your code can branch on, and the interesting question is not how it works but how it fails. Run nine realistic outputs through `JsonOutputParser` and five parse, four raise \u2014 and the two results worth stopping on are both surprises. **Prose *before* the JSON fails and prose *after* it succeeds**, which means \u201cthe model added a preamble\u201d breaks your chain and \u201cthe model added a sign-off\u201d does not. And **truncated output does not raise at all**: a response cut off by `max_tokens` mid-number turns `\"rating\": 8.` into `8`, a different value, silently, with nothing anywhere reporting a problem.",

  objectives: [
    "Predict which realistic model outputs a JSON parser accepts and rejects",
    "Explain the asymmetry between leading and trailing prose",
    "Recognise that truncation is repaired rather than reported",
    "Name what a list parser returns when the model uses bullets",
    "Price the recovery parsers against the failure rate they fix"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", id: "nine", text: "Nine outputs, five parses",
      sub: "What actually arrives from a model" },

    { t: "p", text: "A parser's job is to survive what a model really produces, which is rarely the clean JSON the prompt asked for. Here are nine outputs that all occur in practice." },

    { t: "code", lang: "text", title: "JsonOutputParser on realistic output",
      code: '  clean json       OK    {\'title\': \'Inception\', \'rating\': 8.8}\n  fenced json      OK    {\'title\': \'Inception\', \'rating\': 8.8}\n  fenced, no lang  OK    {\'title\': \'Inception\', \'rating\': 8.8}\n  prose THEN json  FAIL  OutputParserException\n  json THEN prose  OK    {\'title\': \'Inception\', \'rating\': 8.8}\n  single quotes    FAIL  OutputParserException\n  trailing comma   FAIL  OutputParserException\n  truncated        OK    {\'title\': \'Inception\', \'rating\': 8}\n  prose only       FAIL  OutputParserException',
      caption: "Five parsed, four raised. Rows 4, 5 and 8 are the ones to look at twice." },

    { t: "p", text: "The good news first: **code fences are handled**, with or without a language tag. That is the single most common thing a model adds and the parser strips it, which is why so many chains work without anyone thinking about it." },

    { t: "h2", n: "02", id: "asymmetry", text: "Prose before fails, prose after does not",
      sub: "And which one a model does is a property of your prompt" },

    { t: "callout", kind: "insight", title: "The parser scans forward and never looks back",
      body: [
        { t: "p", text: "`Here is the review:` followed by valid JSON raises. The same JSON followed by `Hope that helps!` parses fine. The parser looks for the first JSON-shaped span and reads to the end of it, so leading prose derails the scan while trailing prose is simply never reached." },
        { t: "p", text: "The consequence is uncomfortable: whether your chain works depends on whether the model prefixes or suffixes its chattiness, and that is a property of the prompt and the model version rather than of your code. A chain can be stable for months and break on a model upgrade that changed nothing but the model's habit of introducing itself." }
      ] },

    { t: "h2", n: "03", id: "truncation", text: "The failure that is not a failure",
      sub: "The most dangerous behaviour in this lesson" },

    { t: "p", text: "`JsonOutputParser` uses a **partial** JSON parser, because it has to \u2014 it is the same parser used to parse incrementally while streaming, where incomplete input is the normal case rather than an error. The consequence on a non-streamed response is that truncation is repaired instead of reported." },

    { t: "code", lang: "text", title: "Four truncated outputs, four silent repairs",
      code: 'truncated output                        what was cut      what you get\n\'{"title": "Inception", "rating": 8.\'   cut mid-number    {\'title\': \'Inception\', \'rating\': 8}\n\'{"title": "Inception", "rating": 8.8\'  cut before brace  {\'title\': \'Inception\', \'rating\': 8.8}\n\'{"title": "Inc\'                        cut mid-string    {\'title\': \'Inc\'}\n\'{"a": 1, "b": [1, 2\'                   cut mid-array     {\'a\': 1, \'b\': [1, 2]}',
      caption: "None of these raise. Two of them return a different value from the one the model was producing." },

    { t: "callout", kind: "warn", title: "8.8 became 8, and nothing reported it",
      body: [
        { t: "p", text: "A rating truncated to `8.` parses as `8`. A title truncated mid-word parses as the truncated word. An unclosed array is closed. Every one of these is a **plausible value of the right type**, so no validation downstream will catch it either \u2014 `8` is a perfectly legal rating." },
        { t: "p", text: "The guard is not a better parser. It is to check **why the model stopped**: a `finish_reason` of `length` means the response was cut off and the parsed object should be discarded regardless of how well-formed it looks. Trusting the parse is the mistake, because the parse succeeded." }
      ] },

    { t: "h2", n: "04", id: "lists", text: "List parsing is weaker than it looks",
      sub: "It cannot fail, so it returns something wrong instead" },

    { t: "code", lang: "text", title: "CommaSeparatedListOutputParser",
      code: "'a, b, c'      -> ['a', 'b', 'c']\n'a,b,c'        -> ['a', 'b', 'c']\n'1. a\\n2. b'    -> ['1. a', '2. b']\n'- a\\n- b'      -> ['- a', '- b']\n'a, b, and c'  -> ['a', 'b', 'and c']",
      caption: "It splits on commas and nothing else." },

    { t: "p", text: "A numbered or bulleted list \u2014 which is what a model produces when asked for a list unless told otherwise \u2014 comes back as one element per line **with the marker still attached**. And `a, b, and c` yields `and c`. The parser never raises, so a downstream loop iterates over wrong-shaped data and the bug surfaces somewhere else entirely." },

    { t: "callout", kind: "tradeoff", title: "A parser that cannot fail is not safer",
      body: [
        { t: "p", text: "There is a tempting intuition that a forgiving parser is more robust. These two examples show the opposite: `JsonOutputParser` on truncated input and the list parser on a bulleted list both succeed and both return wrong data, which is strictly worse than raising." },
        { t: "p", text: "The general rule for this module: prefer the mechanism that can refuse. That is why 1.5 is about `with_structured_output`, where a schema violation is a `ValidationError` rather than a plausible-looking dict." }
      ] },

    { t: "h2", n: "05", id: "instructions", text: "Format instructions travel with the parser",
      sub: "The parser asks the model to make the parser's job possible" },

    { t: "p", text: "`get_format_instructions()` returns text that the chain injects into the prompt \u2014 the parser telling the model what shape to produce. It is explicit about the failure modes above, including fences and preambles." },

    { t: "code", lang: "text", title: "What the parser asks for",
      code: 'STRICT OUTPUT FORMAT:\n- Return only the JSON value that conforms to the schema. Do not include any\n  additional text, explanations, headings, or separators.\n- Do not wrap the JSON in Markdown or code fences.\n- Do not prepend or append any text (e.g., do not write "Here is the JSON:").\n- The response must be a single top-level JSON value exactly as required.',
      caption: "Note that it explicitly forbids the preamble that breaks the parse." },

    { t: "p", text: "The practical consequence is that **a parser and its format instructions must travel together**. Swapping a parser without re-running the prompt is a silent change: the prompt still asks for the old shape, the new parser expects a different one, and nothing in the type system connects them." },

    { t: "h2", n: "06", id: "recovery", text: "What repair costs",
      sub: "An extra model call, and whether that is the right trade" },

    { t: "table",
      head: ["Strategy", "Calls", "Extra", "Note"],
      rows: [
        ["`with_structured_output`", "1", "0", "native tool call; nothing to parse"],
        ["plain parser, output valid", "1", "0", "the common case"],
        ["`OutputFixingParser`", "2", "1", "original call plus one repair call"],
        ["`RetryOutputParser`", "2", "1", "repair call also re-sends the original prompt"]
      ] },

    { t: "p", text: "At a 5% parse-failure rate, a fixing parser costs 1.05 calls per request on average \u2014 which is cheap enough that cost is not the deciding factor. The deciding factor is **whether the failure is visible**. A fixing parser converts a loud exception into a silent extra call, so a parse failure rate that was an alert becomes a cost line, and a prompt that has quietly started producing preambles can run for months." },

    { t: "callout", kind: "good", title: "Use repair, and count the repairs",
      body: [
        { t: "p", text: "The right configuration is a fixing parser **plus a counter**. Recovering automatically is correct \u2014 the user should not see a 500 because the model added a preamble. Not knowing it is happening is not." },
        { t: "p", text: "A rising repair rate is one of the better early-warning signals available, because it moves before accuracy does: the model's output shape drifts before its answers get worse. 4.1 builds the callback that counts it." }
      ] },

    { t: "exercise", kind: "analysis", title: "Find the parse that lies",
      difficulty: "core", minutes: 26,
      body: "Run nine realistic model outputs through JsonOutputParser and record which parse and which raise. Investigate the two surprising results: the asymmetry between leading and trailing prose, and the case that succeeds with wrong data. Then show what a comma-separated list parser does with bulleted input, read the format instructions the parser injects, and price the recovery parsers against a failure rate.",
      requirements: [
        "Use at least nine outputs including fenced JSON, prose before, prose after, single quotes, a trailing comma and a truncated response",
        "Report which parse and which raise, with the exception type",
        "Demonstrate four kinds of truncation and show what each returns",
        "Show the list parser on comma, numbered, bulleted and Oxford-comma input",
        "Print the format instructions and note which failure they explicitly forbid",
        "Tabulate call counts for the plain, fixing and retry strategies"
      ],
      hint: "Build the fenced cases with `chr(96) * 3` rather than a literal fence. The truncation case is the point of the exercise \u2014 compare what you got against what the model was clearly producing.",
      solution: { lang: "python", title: "x0104.py \u2014 five parse, four raise, one lies",
        code: 'from langchain_core.output_parsers import JsonOutputParser, CommaSeparatedListOutputParser\n\nF = chr(96) * 3\n\nCASES = [\n    ("clean json",      \'{"title": "Inception", "rating": 8.8}\'),\n    ("fenced json",     F + \'json\\n{"title": "Inception", "rating": 8.8}\\n\' + F),\n    ("fenced, no lang", F + \'\\n{"title": "Inception", "rating": 8.8}\\n\' + F),\n    ("prose THEN json", \'Here is the review:\\n{"title": "Inception", "rating": 8.8}\'),\n    ("json THEN prose", \'{"title": "Inception", "rating": 8.8}\\nHope that helps!\'),\n    ("single quotes",   "{\'title\': \'Inception\', \'rating\': 8.8}"),\n    ("trailing comma",  \'{"title": "Inception", "rating": 8.8,}\'),\n    ("truncated",       \'{"title": "Inception", "rating": 8.\'),\n    ("prose only",      \'I think Inception was about 8.8 out of 10.\'),\n]\n\np = JsonOutputParser()\nfor name, text in CASES:\n    try:\n        print("%-16s OK    %s" % (name, p.parse(text)))\n    except Exception as e:\n        print("%-16s FAIL  %s" % (name, type(e).__name__))\n\n# the four truncations, the list parser, and the format instructions\nTRUNC = [\'{"title": "Inception", "rating": 8.\',\n         \'{"title": "Inception", "rating": 8.8\',\n         \'{"title": "Inc\',\n         \'{"a": 1, "b": [1, 2\']',
        out: '==============================================================================\nPART 1 -- JsonOutputParser on nine realistic outputs\n==============================================================================\n  clean json       OK    {\'title\': \'Inception\', \'rating\': 8.8}\n  fenced json      OK    {\'title\': \'Inception\', \'rating\': 8.8}\n  fenced, no lang  OK    {\'title\': \'Inception\', \'rating\': 8.8}\n  prose THEN json  FAIL  OutputParserException\n  json THEN prose  OK    {\'title\': \'Inception\', \'rating\': 8.8}\n  single quotes    FAIL  OutputParserException\n  trailing comma   FAIL  OutputParserException\n  truncated        OK    {\'title\': \'Inception\', \'rating\': 8}\n  prose only       FAIL  OutputParserException\n\n  5 parsed, 4 raised.\n\n  two results are worth stopping on.\n\n==============================================================================\nPART 2 -- the asymmetry: prose before fails, prose after does not\n==============================================================================\n  \'Here is the review:\' + json   -> FAIL\n  json + \'Hope that helps!\'      -> OK\n\n  the parser scans for the first JSON-looking span and takes it to the end.\n  leading prose derails the scan; trailing prose is simply never reached.\n  so \'the model added a preamble\' breaks and \'the model added a sign-off\'\n  does not -- and which of those a model does is a property of the prompt,\n  which is why the same chain can be stable for months and then not be.\n\n==============================================================================\nPART 3 -- the one that does not raise and is wrong anyway\n==============================================================================\n  truncated output                         what was cut       what you get\n  \'{"title": "Inception", "rating": 8.\'    cut mid-number     {\'title\': \'Inception\', \'rating\': 8}\n  \'{"title": "Inception", "rating": 8.8\'   cut before the brace {\'title\': \'Inception\', \'rating\': 8.8}\n  \'{"title": "Inc\'                         cut mid-string     {\'title\': \'Inc\'}\n  \'{"a": 1, "b": [1, 2\'                    cut mid-array      {\'a\': 1, \'b\': [1, 2]}\n\n  JsonOutputParser uses a PARTIAL json parser, so it repairs truncation\n  rather than reporting it:\n     rating 8.8 cut to \'8.\'   becomes  8      <- a different number\n     title \'Inception\' cut    becomes  \'Inc\'  <- a different string\n     an unclosed array        becomes  closed\n\n  none of these raise. a response truncated by max_tokens produces a\n  plausible, wrong object, and nothing in the system reports a problem.\n  that is the most dangerous behaviour in this lesson, and the guard is\n  to check finish_reason rather than to trust the parse.\n\n==============================================================================\nPART 4 -- list parsing is weaker than it looks\n==============================================================================\n  \'a, b, c\'      -> [\'a\', \'b\', \'c\']\n  \'a,b,c\'        -> [\'a\', \'b\', \'c\']\n  \'1. a\\n2. b\'   -> [\'1. a\', \'2. b\']\n  \'- a\\n- b\'     -> [\'- a\', \'- b\']\n  \'a, b, and c\'  -> [\'a\', \'b\', \'and c\']\n\n  it splits on commas and nothing else. a numbered or bulleted list comes\n  back as ONE element per line with the marker still attached, and \'a, b,\n  and c\' yields \'and c\'. the parser cannot fail here -- it returns\n  something wrong-shaped instead, which a downstream loop will happily use.\n\n==============================================================================\nPART 5 -- what format instructions actually say\n==============================================================================\nReturn a JSON object.\n\n  this text is injected into the prompt by the chain. it is the parser\n  asking the model to make the parser\'s job possible -- which is why a\n  parser and its format instructions must travel together, and why\n  swapping a parser without re-running the prompt is a silent change.\n\n==============================================================================\nPART 6 -- the cost of repair\n==============================================================================\n  OutputFixingParser and RetryOutputParser recover by asking a model to\n  fix the broken output. priced per recovered request:\n\n  strategy                          calls     extra  note\n  with_structured_output                1         0  native tool call; nothing to parse\n  plain parser, output valid            1         0  the common case\n  OutputFixingParser                    2         1  original call + one repair call\n  RetryOutputParser                     2         1  repair call also re-sends the original prompt\n\n  a 5%% parse-failure rate with a fixing parser is 1.05 calls per request\n  on average -- cheap. the same 5%% with no recovery is 5%% of requests\n  failing. the decision is not cost, it is whether the failure is visible.',
        notes: [
          { t: "p", text: "**Five parsed, four raised**, and code fences are handled with or without a language tag \u2014 which is why so many chains work without anyone having thought about parsing. That is the reassuring half." },
          { t: "p", text: "**Prose before the JSON fails; prose after it succeeds.** The parser finds the first JSON-shaped span and reads to the end, so a preamble derails the scan and a sign-off is never reached. Which of those a model does is a property of the prompt and the model version, so a chain can be stable for months and break on an upgrade that changed only the model's conversational habits." },
          { t: "p", text: "**The truncated case parses, and returns a different number.** `\"rating\": 8.` becomes `8`; `\"title\": \"Inc` becomes `'Inc'`; an unclosed array is closed. The partial parser exists because the same code parses incrementally during streaming, where incomplete input is normal \u2014 but on a non-streamed response it turns a truncation into a plausible wrong value." },
          { t: "p", text: "**Nothing downstream catches it either**, because every repaired value is a legal value of the right type. `8` is a perfectly good rating. The guard is `finish_reason`: if the model stopped because it hit the token limit, discard the parse regardless of how well-formed it looks." },
          { t: "p", text: "**The list parser cannot fail, which makes it worse.** Numbered and bulleted lists come back one element per line with the marker attached, and an Oxford comma yields `'and c'`. A forgiving parser is not a safer parser \u2014 both of this lesson's dangerous cases are successes." },
          { t: "p", text: "**The format instructions explicitly forbid the preamble** that breaks the parse, which is the clue that a parser and its instructions have to travel together. Swapping a parser without re-running the prompt leaves the prompt asking for the old shape, and nothing in the type system connects the two." },
          { t: "p", text: "**Repair is cheap and that is not the point.** A fixing parser at a 5% failure rate costs 1.05 calls per request; what it really does is convert a loud exception into a silent extra call. Use it, and count it \u2014 a rising repair rate moves before accuracy does." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: the rating that was always a whole number",
      body: [
        { t: "p", text: "An extraction pipeline writes review ratings to a table. Someone notices that ratings are suspiciously often whole numbers \u2014 8 rather than 8.8, 9 rather than 9.2 \u2014 but not always, and no errors have ever been logged." },
        { t: "p", text: "This is truncation. `max_tokens` is tight enough that long titles push the rating to the end of the response, where it gets cut mid-decimal, and the partial parser repairs `8.` to `8`. The successes and failures correlate with title length, which is why it looks random and why nobody suspected the parser: the parse never failed." },
        { t: "p", text: "Three things to do. Raise `max_tokens`, which fixes today. Check `finish_reason` and reject anything cut short, which fixes the class. And move to `with_structured_output`, which removes the text-parsing step entirely \u2014 1.5 shows what that does and does not guarantee, including a silent failure of its own." }
      ] }
  ],

  takeaways: [
    "**Code fences are handled**, with or without a language tag, which is why many chains parse successfully without anyone designing for it.",
    "**Of nine realistic outputs, five parse and four raise** \u2014 single quotes, trailing commas, leading prose and prose-only all fail.",
    "**Prose before the JSON fails; prose after it succeeds** \u2014 the parser scans forward to the first JSON span and never reaches the suffix.",
    "**So chain stability depends on the model's conversational habits**, which can change on a version upgrade that touched nothing else.",
    "**Truncated output does not raise. It is repaired.** `\"rating\": 8.` parses as `8`, `\"title\": \"Inc` as `'Inc'`, an unclosed array is closed.",
    "**Every repaired value is a legal value of the right type**, so downstream validation will not catch it either.",
    "**The guard is `finish_reason`, not a better parser** \u2014 if the model stopped on the token limit, discard the parse however well-formed it looks.",
    "**The list parser splits on commas and nothing else**: bulleted lists keep their markers, and an Oxford comma yields `'and c'`.",
    "**A parser that cannot fail is not safer** \u2014 both dangerous cases in this lesson are successes, not exceptions.",
    "**A parser and its format instructions travel together**; swapping one without re-running the prompt is a silent mismatch.",
    "**Recovery parsers cost one extra call** \u2014 1.05 calls per request at a 5% failure rate \u2014 so cost is not the deciding factor.",
    "**They convert a loud exception into a silent extra call**, so use them and count them: repair rate moves before accuracy does."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A model returns valid JSON preceded by \u201cHere is the review:\u201d, and on another request the same JSON followed by \u201cHope that helps!\u201d. What happens?",
        options: [
          "Both parse \u2014 the parser extracts the JSON span in either case",
          "The preamble fails and the sign-off succeeds, because the parser scans forward to the first JSON span and reads to its end",
          "Both fail \u2014 any extra text raises OutputParserException",
          "The preamble succeeds and the sign-off fails, since trailing text corrupts the final brace"
        ],
        answer: 1,
        why: "The parser looks for the first JSON-shaped span and reads to the end of it, so leading prose derails the scan while trailing prose is never reached. The uncomfortable consequence is that chain stability depends on whether a model prefixes or suffixes its chattiness \u2014 a property of the prompt and the model version rather than of your code, so an upgrade that changes nothing but conversational habit can break a chain that ran for months." },

      { stem: "A response is cut off by max_tokens at `{\"title\": \"Inception\", \"rating\": 8.` What does JsonOutputParser return?",
        options: [
          "It raises OutputParserException because the JSON is incomplete",
          "`{'title': 'Inception', 'rating': 8}` \u2014 the truncation is repaired, not reported",
          "`{'title': 'Inception'}` \u2014 the incomplete field is dropped",
          "`None`, with a warning logged"
        ],
        answer: 1,
        why: "It uses a partial JSON parser \u2014 necessarily, since the same code parses incrementally while streaming, where incomplete input is the normal case. On a non-streamed response that turns truncation into a plausible wrong value: 8.8 becomes 8. Nothing downstream catches it either, because 8 is a legal rating of the right type, which is why the guard has to be `finish_reason` rather than any amount of validation on the parsed object." },

      { stem: "Why is a parser that never raises not safer than one that does?",
        options: [
          "It is safer \u2014 fewer exceptions means fewer user-visible failures",
          "Because both dangerous cases here are successes returning wrong data, which is worse than an exception",
          "Because exceptions are cheaper to handle than wrong values at runtime",
          "Because forgiving parsers are slower, trading correctness for latency"
        ],
        answer: 1,
        why: "Truncated JSON parses to a wrong number and a bulleted list parses to elements with their markers attached \u2014 both succeed, both produce data that flows downstream and corrupts something far from the cause. An exception is a diagnosis delivered at the point of failure. That is the argument for preferring mechanisms that can refuse, which is what structured output offers in 1.5." },

      { stem: "You add an OutputFixingParser to handle a 5% parse-failure rate. What has changed?",
        options: [
          "Cost, materially \u2014 the repair call roughly doubles spend",
          "A loud exception became a silent extra call, so a drifting prompt can now run unnoticed",
          "Nothing \u2014 the fixing parser only activates on malformed output",
          "Reliability only; the failure rate itself falls because the prompt improves"
        ],
        answer: 1,
        why: "At a 5% failure rate the average is 1.05 calls per request, so cost is not the deciding factor. What changes is visibility: an alertable exception becomes a quiet extra model call, and a prompt that has started producing preambles can run for months unnoticed. Use the repair \u2014 users should not see a 500 for a preamble \u2014 but count it, since repair rate drifts before accuracy does." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Output parsers",
    questions: [
      { level: "core",
        q: "How do output parsers fail in practice?",
        strong: "A strong answer separates the raising failures from the silent ones.",
        answer: [
          { t: "p", text: "In two categories, and the second is the one that matters. I ran nine realistic outputs through JsonOutputParser: five parsed, four raised. The raisers were single quotes, a trailing comma, prose-only, and \u2014 interestingly \u2014 valid JSON with a preamble in front of it." },
          { t: "p", text: "That one has an asymmetry worth knowing. Prose before the JSON fails and prose after it succeeds, because the parser scans forward to the first JSON-shaped span and reads to its end. So whether your chain works depends on whether the model introduces itself or signs off, which is a property of the prompt and the model version rather than your code. A chain can be stable for months and break on an upgrade that changed nothing but the model's manners." },
          { t: "p", text: "The dangerous category is the one that does not raise. JsonOutputParser uses a partial JSON parser, because the same code parses incrementally during streaming where incomplete input is normal. On a non-streamed response that means truncation gets repaired rather than reported: a rating cut off at eight-point parses as eight. A different number, no exception, and nothing downstream catches it because eight is a perfectly legal rating." },
          { t: "p", text: "So the guard is not a better parser, it is checking finish_reason. If the model stopped because it hit the token limit, I discard the parse no matter how well-formed it looks." }
        ] },

      { level: "advanced",
        q: "Ratings in our extraction table are suspiciously often whole numbers, and nothing is logged. Diagnose it.",
        strong: "A strong answer reaches truncation and explains why it looks random.",
        answer: [
          { t: "p", text: "My first hypothesis would be truncation being silently repaired, and I would check finish_reason on the raw responses before anything else." },
          { t: "p", text: "The mechanism: max_tokens is tight enough that some responses get cut off, and if the rating is near the end of the JSON it gets cut mid-decimal \u2014 eight-point-something becomes eight-point, which the partial parser repairs to eight. No exception is raised because the parse succeeded, and no validation catches it because eight is a legal rating." },
          { t: "p", text: "The reason it looks random rather than systematic is the part I would want the team to see: whether the rating gets truncated depends on how much came before it, so it correlates with title length or summary length rather than with anything about the rating. That makes it look like noise, and it is why nobody suspects the parser \u2014 from the outside, parsing has a hundred per cent success rate." },
          { t: "p", text: "Three fixes at different depths. Raise max_tokens, which fixes today. Check finish_reason and reject anything cut short, which fixes the class of bug. And move to structured output, which removes the text-parsing step entirely \u2014 though I would say in the same breath that it has a silent failure of its own, which is returning None when the model answers in prose instead of calling the tool." }
        ] },

      { level: "core",
        q: "Would you use an OutputFixingParser?",
        strong: "A strong answer accepts the repair and insists on the counter.",
        answer: [
          { t: "p", text: "Yes, with a counter on it. The repair itself is clearly right \u2014 a user should not get a 500 because the model prefixed its answer with \u2018Here is the JSON\u2019, and one extra model call to fix that is a good trade." },
          { t: "p", text: "The cost argument is not the interesting one. At a five per cent failure rate a fixing parser averages 1.05 calls per request, which nobody will notice on a bill. What actually changes is visibility: an exception that was alertable becomes a silent extra call." },
          { t: "p", text: "That matters because output shape drifts before answer quality does. A prompt change, a model upgrade or a shift in input distribution will usually show up as the model starting to add preambles or fences well before it shows up as wrong answers. So repair rate is one of the better early-warning signals available, and a fixing parser without a counter throws that signal away in exchange for the convenience it was added for." },
          { t: "p", text: "The configuration I would want is: fixing parser on, repair rate as a metric, and an alert on the rate rather than on any individual failure. And where the model supports it I would prefer structured output over parsing text at all, since a tool call has nothing to parse." }
        ] }
    ]
  }
});
