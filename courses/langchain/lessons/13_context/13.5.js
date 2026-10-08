EC.receiveLesson({
  id: "13.5",
  lede: "Every strategy so far **removes** content. Compression keeps it and spends fewer tokens \u2014 a verbose assistant turn went from 23 tokens to 12, a **48% saving with nothing lost**, because filler and courtesy carry no information forward. But the measured table has a trap in it: the saving was **largest on the destructive case**. Compressing the user's own words saved **86%** and destroyed every fact, while a tool result saved 52% and kept them \u2014 so compression ratio is **anti-correlated with safety**, because the dense, information-bearing text is exactly the text that cannot be shortened. Tool results are the real win: raw JSON at 80 tokens became 21, **saved on every subsequent turn**, which is 590 tokens over ten.",
  objectives: [
    "Distinguish compression from the strategies that drop content",
    "Measure what compresses safely and what does not",
    "Show the saving is largest where it is most destructive",
    "Quantify the tool-result case across subsequent turns",
    "Place compression first among the strategies"
  ],
  prerequisites: ["13.3", "4.4", "11.3"],
  blocks: [
    { t: "h2", n: "01", id: "diff", text: "Compressing rather than dropping", sub: "The one strategy that is not a trade" },
    { t: "code", lang: "text", title: "The same content, fewer tokens",
      code: "verbose: 23 tokens  'Still investigating with the payments team. I will\n                     confirm as soon as the duplicate is identified and\n                     the reversal is scheduled.'\nterse  : 12 tokens  'Investigating; will confirm once the reversal is\n                     scheduled.'\nsaved  : 48%",
      caption: "And nothing a later turn needs was lost." },
    { t: "p", text: "That is the case compression exists for. Filler, hedging and courtesy are a real fraction of an assistant's output and carry **no information forward** \u2014 so removing them is a saving rather than a trade." },
    { t: "h2", n: "02", id: "safe", text: "What compresses safely", sub: "And the trap in the numbers" },
    { t: "code", lang: "text", title: "Three cases",
      code: "case                  before  after  saved   facts kept after\nassistant courtesy    20      4      80%     NONE\na tool result         42      20     52%     ['order id', 'the amount']\nthe user's own words  28      4      86%     NONE",
      caption: "The **largest** saving is on the **destructive** case." },
    { t: "callout", kind: "trap", title: "Compression ratio is anti-correlated with safety", body: [
      { t: "p", text: "The first two cases are safe and the third is destructive, and the third saved the most. The reason is structural: dense, information-bearing text is exactly the text that **cannot** be shortened, so a high compression ratio is evidence you compressed something that was mostly filler \u2014 or that you destroyed something that was not." },
      { t: "p", text: "Which means a compression step tuned to maximise the saving will converge on destroying the user's statements of fact. Those are short, dense, and the one thing you cannot reconstruct." },
      { t: "p", text: "So: compress **assistant turns and tool results**, and leave the user's statements alone. 6.4 found the same shape in BM25 \u2014 a confident magnitude anti-correlated with usefulness." }
    ] },
    { t: "h2", n: "03", id: "tools", text: "The tool-result case is the biggest win", sub: "Paid once, saved every turn" },
    { t: "code", lang: "text", title: "A tool returning JSON",
      code: "raw JSON : 80 tokens\ncompact  : 21 tokens\nsaved    : 59 tokens, 74%\n\nover 10 subsequent turns that is 590 tokens saved.",
      caption: "Because the result sits in the history for **every** later turn (11.3)." },
    { t: "callout", kind: "insight", title: "And 4.4 explains why the ratio is so high", body: [
      { t: "p", text: "JSON tokenises badly. The quoting, braces and field names are all tokens that carry no information the model needs \u2014 so reformatting a result as `order ORD-4471, 148.50, 11 March` is not lossy, it is the same content without the syntax." },
      { t: "p", text: "This one is also **free and exact**, which none of the other strategies are. A tool result has a known structure, so compressing it is a formatting function rather than a model call." }
    ] },
    { t: "h2", n: "04", id: "measure", text: "The measurement", sub: "Which a token count cannot give you" },
    { t: "ol", items: [
      "List the facts the context must preserve.",
      "Apply the compression.",
      "Check which facts survive."
    ] },
    { t: "p", text: "Mechanical, cheap, and the only thing that distinguishes a 60% saving from a 60% loss \u2014 13.3's check, applied to a different operation." },
    { t: "callout", kind: "good", title: "And the stronger version when the facts are not enumerable", body: [
      { t: "p", text: "Ask the **original** and the **compressed** context the same question and compare the answers. Two model calls per test case, and it catches what a fact list misses \u2014 implications, tone, a constraint stated indirectly." },
      { t: "p", text: "Worth running on a handful of cases even when you have a fact list, because the fact list only contains what you thought to write down." }
    ] },
    { t: "h2", n: "05", id: "first", text: "Where compression sits", sub: "First" },
    { t: "ol", items: [
      "**compress** \u2014 no information loss, if done on the right text.",
      "**summarise** \u2014 lossy, with the prompt deciding what survives (13.3).",
      "**window** \u2014 loses the beginning.",
      "**retrieve** \u2014 loses what the retrieval misses (13.4)."
    ] },
    { t: "callout", kind: "mental", title: "A compressed history delays every later strategy", body: [
      { t: "p", text: "Compressing tool results by 50% roughly **doubles** the number of turns that fit before summarisation has to fire at all (13.2). So the cheapest strategy is also the one that buys the most room for the others." },
      { t: "p", text: "The honest caveat: compression is itself a model call unless the text has a known structure. A tool result does \u2014 so that case is free. Compressing prose needs a model, which makes it a summarisation step wearing a different name, and it should be judged as one." }
    ] },
    { t: "exercise", kind: "build", title: "Compress rather than drop",
      difficulty: "core", minutes: 28,
      body: "Compress a verbose assistant turn and report the token saving and whether anything was lost. Then compress three different kinds of content \u2014 assistant courtesy, a tool result, and the user's own words \u2014 reporting the saving and facts kept for each, and explain what the pattern in those numbers means. Quantify the tool-result case across several subsequent turns. Give the measurement that decides whether a compression was lossy, and place compression among the other strategies.",
      requirements: ["Compress a verbose turn and report the saving",
        "Compress three kinds of content and report saving and facts kept for each",
        "Identify which saving was largest and why that is a trap",
        "State which content types are safe to compress",
        "Quantify the tool-result saving over subsequent turns",
        "Explain why JSON compresses so well",
        "Give the fact-survival measurement and a stronger variant",
        "Rank compression against summarising, windowing and retrieving",
        "State the caveat about compression needing a model call"],
      hint: "Compress the user's own words as well as the assistant's. Compare the saving against the facts kept.",
      solution: { lang: "python", title: "x1305.py \u2014 the largest saving is the destructive one",
        code: 'cases = [("assistant courtesy", courtesy_long, courtesy_short),\n         ("a tool result",      json_raw,      json_compact),\n         ("the user\'s own words", user_long,   user_short)]\n\nfor name, before, after in cases:\n    b, a = ntok(before), ntok(after)\n    print(name, b, a, 100 * (b - a) / b, facts_present(after))\n\n# the tool result sits in the history for EVERY later turn\nsaved = ntok(json_raw) - ntok(json_compact)\nprint(saved, saved * 10)              # 59, 590 over ten turns',
        out: "==============================================================================\nPART 1 -- compressing rather than dropping\n==============================================================================\n  the strategies so far remove content. compression keeps the\n  content and spends fewer tokens on it.\n\n  verbose: 23  tokens  'Still investigating with the payments team. I will confirm as soon as the duplicate is identified and the reversal is scheduled.'\n  terse  : 12  tokens  'Investigating; will confirm once the reversal is scheduled.'\n  saved  : 48%\n\n  and nothing a later turn needs was lost. that is the case\n  compression exists for -- filler, hedging and courtesy are a\n  real fraction of an assistant's output and carry no information\n  forward.\n==============================================================================\nPART 2 -- what compresses safely, and what does not\n==============================================================================\n  case                  before  after  saved   facts kept after\n  assistant courtesy    20      4      80%    NONE\n  a tool result         42      20     52%    ['order id', 'the amount']\n  the user's own words  28      4      86%    NONE\n\n  the first two are safe and the third is destructive, and the\n  saving is LARGEST on the destructive one -- which is the trap.\n  compression ratio is anti-correlated with safety here, because\n  the dense, information-bearing text is the text that cannot be\n  shortened.\n\n  so: compress assistant turns and tool results, and leave the\n  user's statements of fact alone.\n==============================================================================\nPART 3 -- the tool-result case is the biggest win\n==============================================================================\n  a tool returning JSON puts that JSON in the history for every\n  subsequent turn (11.3). so compressing it once saves on every\n  later call:\n\n    raw JSON : 80 tokens\n    compact  : 21 tokens\n    saved    : 59 tokens, 74%\n\n    over 10 subsequent turns that is 590 tokens saved.\n\n  and 4.4's finding explains why the saving is so large: JSON\n  tokenises badly -- the quoting, braces and field names are all\n  tokens that carry no information the model needs.\n==============================================================================\nPART 4 -- the measurement that decides whether it was lossy\n==============================================================================\n  a token count cannot tell you whether compression destroyed\n  something. the measurement is the same as 13.3's:\n\n    list the facts the context must preserve\n    apply the compression\n    check which facts survive\n\n  which is mechanical, cheap, and the only thing that distinguishes\n  a 60% saving from a 60% loss.\n\n  the stronger version, if the facts are not enumerable in advance:\n  ask the ORIGINAL and the COMPRESSED context the same question and\n  compare the answers. that costs two model calls per test case and\n  catches what a fact list misses.\n==============================================================================\nPART 5 -- where compression sits among the strategies\n==============================================================================\n  it is the only one that is not a trade against information, so it\n  should be FIRST:\n\n    1. compress        no information loss, if done on the right text\n    2. summarise       lossy, with the prompt deciding what survives\n    3. window          loses the beginning\n    4. retrieve        loses what the retrieval misses\n\n  and a compressed history delays every later strategy. compressing\n  tool results by 50% roughly doubles the number of turns that fit\n  before summarisation has to fire at all (13.2).\n\n  the honest caveat: compression is itself a model call unless the\n  text has a known structure. a tool result does -- so compressing\n  it is a formatting function, free and exact. compressing prose\n  needs a model, which makes it a summarisation step wearing a\n  different name.",
        notes: [
          { t: "p", text: "**A verbose turn compressed 48% with nothing lost** \u2014 filler, hedging and courtesy carry no information forward." },
          { t: "p", text: "**So compression is the only strategy that is not a trade against information.**" },
          { t: "p", text: "**But the largest saving was the destructive one**: the user's own words compressed 86% and kept no facts." },
          { t: "p", text: "**Compression ratio is anti-correlated with safety**, because dense information-bearing text is exactly what cannot be shortened." },
          { t: "p", text: "**So a step tuned to maximise saving converges on destroying the user's statements of fact** \u2014 short, dense, unreconstructable." },
          { t: "p", text: "**Compress assistant turns and tool results; leave the user's statements alone.**" },
          { t: "p", text: "**The tool-result case is the biggest win**: 80 tokens to 21, saved on every subsequent turn \u2014 590 over ten." },
          { t: "p", text: "**And JSON tokenises badly** (4.4), so the quoting and braces are tokens carrying nothing the model needs." },
          { t: "p", text: "**That case is free and exact**, because a tool result has a known structure \u2014 a formatting function, not a model call." },
          { t: "p", text: "**So compression goes first**, and a 50% tool-result saving roughly doubles the turns that fit before summarisation fires." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the compressor that improved its own metric", body: [
      { t: "p", text: "A team adds a compression step to their history and tracks the average compression ratio as its health metric. The ratio improves over several prompt iterations, from 40% to 70%. Answer quality drops." },
      { t: "p", text: "Compression ratio is anti-correlated with safety. Filler compresses well and carries nothing; dense factual text compresses badly because there is nothing to remove. So a prompt tuned upward on ratio converges on compressing the content that should not be touched \u2014 in the measured case, the user's own statements of fact compressed 86% and kept none of the five facts, against a tool result that compressed 52% and kept them." },
      { t: "p", text: "The metric has to be fact survival, not ratio: list what the context must preserve, compress, and check. And the content types should be handled separately \u2014 tool results compressed by a formatting function, which is free and exact; assistant prose compressed by a model; the user's words left alone. A single compressor applied to the whole history cannot make that distinction." }
    ] }
  ],
  takeaways: [
    "**Compression keeps the content and spends fewer tokens** \u2014 the only strategy that is not a trade.",
    "**A verbose turn compressed 48% with nothing lost**, because filler carries no information forward.",
    "**But the largest saving was the destructive one**: the user's words, 86%, no facts kept.",
    "**Compression ratio is anti-correlated with safety** \u2014 dense text cannot be shortened.",
    "**So tuning for ratio converges on destroying the user's statements of fact.**",
    "**Compress assistant turns and tool results; leave the user's statements alone.**",
    "**The tool-result case is the biggest win**: 80 to 21 tokens, saved on every later turn.",
    "**590 tokens over ten subsequent turns**, because the result sits in the history (11.3).",
    "**JSON tokenises badly** (4.4) \u2014 the quoting and braces carry nothing the model needs.",
    "**And that case is free and exact**: a known structure means a formatting function, not a model call.",
    "**Measure fact survival, not ratio** \u2014 the only check that distinguishes a 60% saving from a 60% loss.",
    "**The stronger check**: ask the original and the compressed context the same question.",
    "**Compression goes first**, then summarise, then window, then retrieve.",
    "**And compressing prose needs a model**, which makes it summarisation wearing a different name."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Compressing the user's own words saved 86% and kept no facts; a tool result saved 52% and kept them. What does that pattern mean?",
      options: ["Tool results are harder to compress than prose",
        "Compression ratio is anti-correlated with safety, because dense information-bearing text cannot be shortened",
        "The tool result was already partially compressed",
        "The user's words contained more filler"],
      answer: 1,
      why: "A high ratio means there was a lot to remove, which is evidence the text was mostly filler \u2014 or that something dense was destroyed. So a compression step tuned to maximise its saving converges on the user's statements of fact, which are short, dense and the one thing you cannot reconstruct. The metric has to be fact survival rather than ratio." },
    { stem: "Why is compressing a tool result the largest practical win?",
      options: ["Tool results are the longest messages",
        "The result sits in the history for every subsequent turn, so a one-off saving is paid back repeatedly \u2014 590 tokens over ten turns",
        "Tool results are compressed by the provider anyway",
        "It reduces the number of tool calls needed"],
      answer: 1,
      why: "Compressing 80 tokens to 21 saves 59 once, and that message is re-sent on every later turn, so the saving multiplies with conversation length. It is also the only free and exact case: a tool result has a known structure, so compressing it is a formatting function rather than a model call, and JSON's quoting and braces carry nothing the model needs." },
    { stem: "Why should compression be applied before summarisation?",
      options: ["Summarisation is more expensive per call",
        "Compression is the only strategy with no information loss, and a compressed history roughly doubles the turns that fit before summarisation must fire",
        "Summarisation cannot operate on uncompressed text",
        "Compression improves the summariser's accuracy"],
      answer: 1,
      why: "Every other strategy trades information for tokens: summarising is lossy with the prompt deciding what survives, a window loses the beginning, retrieval loses what it misses. Compression done on the right text loses nothing, so it is strictly cheaper \u2014 and it buys room for the others, delaying the first lossy step." },
    { stem: "What is the honest caveat about compression?",
      options: ["It cannot be applied to messages already in state",
        "It is itself a model call unless the text has a known structure \u2014 so compressing prose is summarisation under a different name",
        "It breaks the message ordering the model relies on",
        "Compressed messages cannot be checkpointed"],
      answer: 1,
      why: "A tool result has a known shape, so reformatting it is deterministic, free and exact. Prose does not, so shortening it requires a model to decide what to keep \u2014 which is the definition of a lossy summarisation step and should be judged as one, including with the fact-survival check rather than on its compression ratio." }
  ] },
  interview: { title: "Interview practice", sub: "Compression", questions: [
    { level: "core", q: "What would you compress in an agent's context, and what would you leave alone?",
      strong: "A strong answer separates by content type and cites the ratio trap.",
      answer: [
        { t: "p", text: "Tool results first, assistant prose second, and the user's own words not at all." },
        { t: "p", text: "Tool results are the biggest win and the only free one. A result sits in the history for every subsequent turn, so compressing it once pays back repeatedly \u2014 I measured 80 tokens to 21, which is 590 saved over ten later turns. And because the result has a known structure, compressing it is a formatting function rather than a model call, so it is exact." },
        { t: "p", text: "JSON is why the ratio is so high. The quoting, braces and field names are tokens that carry nothing the model needs, so reformatting is the same content without the syntax." },
        { t: "p", text: "The user's words I would leave alone, and the measurement is why. Compressing them saved 86% and destroyed every fact, against a tool result that saved 52% and kept them \u2014 so compression ratio is anti-correlated with safety. Dense, information-bearing text is exactly what cannot be shortened." },
        { t: "p", text: "Which means a compressor tuned to maximise its saving converges on destroying exactly the content you cannot reconstruct. I would track fact survival instead." }
      ] },
    { level: "advanced", q: "Where does compression sit relative to the other context strategies?",
      strong: "A strong answer puts it first and explains the knock-on effect.",
      answer: [
        { t: "p", text: "First, because it is the only one that is not a trade against information." },
        { t: "p", text: "Summarisation is lossy with the prompt deciding what survives. A window loses the beginning, which is where the identifiers usually are. Retrieval loses whatever it misses, and worse, loses it invisibly. Compression done on the right text loses nothing \u2014 a verbose assistant turn went from 23 tokens to 12 with nothing a later turn needed removed." },
        { t: "p", text: "And it has a knock-on effect that makes it more valuable than its own saving suggests: compressing tool results by half roughly doubles the number of turns that fit before summarisation has to fire at all. So the cheapest strategy buys the most room for the expensive ones." },
        { t: "p", text: "The caveat I would state is that compression is itself a model call unless the text has a known structure. A tool result does, so that case is genuinely free. Compressing prose needs a model, which makes it a summarisation step wearing a different name \u2014 and I would hold it to the same standard, which means the fact-survival check rather than a compression ratio." },
        { t: "p", text: "If the facts are not enumerable in advance, the stronger version is to ask the original and the compressed context the same question and compare the answers. Two calls per test case, and it catches what a fact list misses \u2014 implications, a constraint stated indirectly \u2014 because the fact list only contains what you thought to write down." }
      ] },
    { level: "advanced", q: "What would you track to tell whether a compression step is healthy?",
      strong: "A strong answer rejects compression ratio as the metric.",
      answer: [
        { t: "p", text: "Not the compression ratio, which is the metric people reach for and the one that gets worse as it improves." },
        { t: "p", text: "The measurement is fact survival: list what the context must preserve, compress, check which facts are still present. Mechanical, cheap, and it is the only thing that distinguishes a sixty percent saving from a sixty percent loss." },
        { t: "p", text: "The reason ratio is the wrong metric is structural. Compressing the user's own words saved 86% and destroyed every fact; compressing a tool result saved 52% and kept them. Dense, information-bearing text is exactly the text that cannot be shortened, so a high ratio means either there was a lot of filler or something dense was destroyed \u2014 and the metric cannot tell you which." },
        { t: "p", text: "Which means a prompt tuned upward on ratio converges on compressing the content it should not touch. I have seen that described as the ratio improving from 40% to 70% while answer quality dropped." },
        { t: "p", text: "The stronger check, if the facts are not enumerable in advance, is to ask the original and the compressed context the same question and compare the answers. Two model calls per test case, and it catches implications and indirectly stated constraints that a fact list misses \u2014 because the list only contains what I thought to write down." },
        { t: "p", text: "I would also track it per content type rather than in aggregate, since tool results, assistant prose and user turns have genuinely different safety profiles and a single number over all three hides the one that matters." }
      ] }
  ] }
});
