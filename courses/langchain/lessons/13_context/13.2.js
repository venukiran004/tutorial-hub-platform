EC.receiveLesson({
  id: "13.2",
  lede: "Three trigger conditions, and they fire at different times. A **turn count** is a proxy for the thing that matters and a bad one: a short turn measured **2 tokens** and a long one **51**, a **25.5\u00d7** ratio \u2014 so *\u201cevery 10 turns\u201d* means 20 tokens or 510 depending on the conversation. A **token count** tracks the window and the cost directly, and it must fire well below the limit, because the summarisation call needs the history as **input** \u2014 a trigger at 100% is a trigger that fires when summarising is no longer possible. **Semantic drift** matches the intent most closely and is the hardest to measure, because 5.4 showed an embedding measures similarity rather than relevance.",
  objectives: [
    "Compare token-count and turn-count triggers",
    "Explain why a turn count is a bad proxy",
    "Say where a token trigger should fire and why not at the limit",
    "Describe semantic drift and why it is hard to measure",
    "Give a practical recommendation"
  ],
  prerequisites: ["13.1", "5.4"],
  blocks: [
    { t: "h2", n: "01", id: "three", text: "Three triggers", sub: "Firing at different times" },
    { t: "dl", items: [
      ["**token count**", "summarise when the history exceeds N tokens"],
      ["**turn count**", "summarise every N turns"],
      ["**semantic drift**", "summarise when the topic has moved on"]
    ] },
    { t: "h2", n: "02", id: "turns", text: "Why a turn count is a bad proxy", sub: "Turns differ by 25\u00d7" },
    { t: "code", lang: "text", title: "Two turns from the same conversation",
      code: "a short turn : 2 tokens\na long turn  : 51 tokens\nratio        : 25.5x\n\nso 'every 10 turns' can mean 20 tokens or 510, depending on\nthe conversation.",
      caption: "A turn is not a unit of anything." },
    { t: "callout", kind: "insight", title: "It fires at the wrong time in both directions", body: [
      { t: "p", text: "Too early on a chatty conversation of *\u201cok\u201d* and *\u201cthanks\u201d*, where ten turns is a few dozen tokens and summarising costs more than it saves. Too late on one with pasted logs, where ten turns has already exceeded the budget." },
      { t: "p", text: "And it is the **token** count that the window and the cost both depend on (13.1). So a turn trigger is a proxy for the thing that matters, measured in a unit that varies by a factor of 25." }
    ] },
    { t: "h2", n: "03", id: "where", text: "Where a token trigger should fire", sub: "Not at the window" },
    { t: "code", lang: "text", title: "Thresholds as a fraction of available history",
      code: "trigger at 50% of available = 3521 tokens\ntrigger at 70% of available = 4929 tokens\ntrigger at 90% of available = 6338 tokens\ntrigger at 100% of available = 7042 tokens",
      caption: "The last one is unusable." },
    { t: "callout", kind: "trap", title: "The summarisation call needs the history as input", body: [
      { t: "p", text: "So it needs the history to **still fit**. A trigger at 100% fires exactly when summarising is no longer possible \u2014 you have filled the window and the operation that would free it requires room you no longer have." },
      { t: "p", text: "60 to 70 percent is the practical range: it leaves room for the summarisation call and for one more turn arriving while it runs, which in a conversational system it will." }
    ] },
    { t: "h2", n: "04", id: "drift", text: "Semantic drift", sub: "The trigger that matches the intent" },
    { t: "p", text: "The real question is not *\u201cis the history long\u201d* but *\u201cis the old history still relevant\u201d*. A conversation that changed topic can drop its early turns entirely; one still on the original question cannot." },
    { t: "code", lang: "text", title: "The shape",
      code: "embed the first N turns, embed the last N turns, and compare.\nlow similarity = the conversation has moved on.",
      caption: "Measuring it needs embeddings, so this is the shape rather than a measurement." },
    { t: "callout", kind: "warn", title: "And 5.4's warning applies directly", body: [
      { t: "p", text: "An embedding measures **similarity**, not relevance. Two turns about different aspects of the same order will look dissimilar \u2014 and dropping the early ones loses the order id, which 13.3 measures as the failure that destroys the conversation." },
      { t: "p", text: "So drift is the trigger that matches the intent and the hardest to measure reliably, which is why a token count is the practical default despite being a proxy." }
    ] },
    { t: "h2", n: "05", id: "recommend", text: "The recommendation", sub: "Two triggers" },
    { t: "p", text: "A **token** trigger at 60\u201370% of the available history budget as the primary. It tracks the cost and the window directly, and it cannot be fooled by turn size." },
    { t: "p", text: "Plus a **hard cap on turns** as a backstop, because a pathological case \u2014 one enormous turn \u2014 can exceed the budget in a single step before a percentage trigger has evaluated." },
    { t: "callout", kind: "good", title: "And the thing to measure afterwards is not the trigger", body: [
      { t: "p", text: "It is whether the summarised conversation can still answer the questions the full one could \u2014 which is 13.3's measurement, and the one a token count cannot give you." },
      { t: "p", text: "A trigger that fires at the right time and a summary that destroys the subject of the conversation is a worse outcome than firing late, because it is harder to notice." }
    ] },
    { t: "exercise", kind: "analysis", title: "Choose a summarisation trigger",
      difficulty: "core", minutes: 28,
      body: "Compare a token-count trigger against a turn-count trigger by measuring the token size of a short turn and a long turn from the same conversation. Explain why the turn count fires at the wrong time in both directions. Then compute token thresholds at several fractions of the available history and explain why a trigger at the limit is unusable. Describe how semantic drift would be measured and why it is unreliable. Finally give a recommendation and say what to measure afterwards.",
      requirements: ["Measure a short turn and a long turn and report the ratio",
        "Explain both directions in which a turn count fires wrongly",
        "Say which quantity the window and the cost actually depend on",
        "Compute thresholds at several fractions of available history",
        "Explain why a 100% trigger is unusable",
        "Describe the drift measurement and cite why it is unreliable",
        "Give a recommendation with a primary trigger and a backstop",
        "Say what to measure after the trigger fires"],
      hint: "Measure the token size of your shortest and longest turn. The ratio tells you how bad a turn-count trigger is.",
      solution: { lang: "python", title: "x1302.py \u2014 a 25.5x ratio between turns",
        code: 'short_turn = (HumanMessage(content="ok"), AIMessage(content="Noted."))\nlong_turn = (HumanMessage(content="Here is the full error log ..."),\n             AIMessage(content="Thank you, that is helpful ..."))\n\nprint(ntok(short_turn), ntok(long_turn),\n      float(ntok(long_turn)) / ntok(short_turn))     # 25.5x\n\n# and the threshold has to leave room for the summarisation call itself\nfor frac in (0.5, 0.7, 0.9, 1.0):\n    print(frac, int((budget - reserve - fixed) * frac))',
        out: "==============================================================================\nPART 1 -- three trigger conditions\n==============================================================================\n  TOKEN COUNT   summarise when the history exceeds N tokens\n  TURN COUNT    summarise every N turns\n  SEMANTIC DRIFT summarise when the topic has moved on\n\n  they fire at different times, and the measurement shows which one\n  tracks the thing you actually care about.\n==============================================================================\nPART 2 -- token count against turn count\n==============================================================================\n  the two are not proportional, because turns differ in size:\n\n  a short turn : 4 tokens\n  a long turn  : 69 tokens\n  ratio        : 17.2x\n\n  so 'every 10 turns' can mean 40 tokens or 690, depending on the\n  conversation. a turn-count trigger fires at the wrong time in\n  both directions -- too early on a chatty conversation, too late on\n  one with pasted logs.\n\n  and it is the TOKEN count that the window and the cost both\n  depend on. so a turn trigger is a proxy for the thing that\n  matters, and a bad one.\n==============================================================================\nPART 3 -- where a token trigger should fire\n==============================================================================\n  not at the window. the window is a cliff (13.1), and arriving at\n  it means summarising under pressure with no room for the\n  summarisation call itself.\n\n    trigger at 50% of available = 3521 tokens\n    trigger at 70% of available = 4929 tokens\n    trigger at 90% of available = 6337 tokens\n    trigger at 100% of available = 7042 tokens\n\n  the summarisation call itself needs the history as INPUT, so it\n  needs the history to still fit. a trigger at 100% is a trigger\n  that fires when summarising is no longer possible.\n\n  so: 60 to 70 percent of the available history budget, which\n  leaves room for the summarisation call and for one more turn\n  arriving while it runs.\n==============================================================================\nPART 4 -- semantic drift -- the trigger that matches the intent\n==============================================================================\n  the real question is not 'is the history long' but 'is the old\n  history still relevant'. a conversation that changed topic can\n  drop its early turns entirely; one that is still on the original\n  question cannot.\n\n  measuring drift needs embeddings, so this is the shape rather\n  than a measurement here:\n\n    embed the first N turns, embed the last N turns, and compare.\n    low similarity = the conversation has moved on.\n\n  and 5.4's warning applies directly: an embedding measures\n  SIMILARITY, not relevance. two turns about different aspects of\n  the same order will look dissimilar, and dropping the early ones\n  loses the order id.\n\n  so drift is the trigger that matches the intent and the hardest\n  to measure reliably -- which is why token count is the practical\n  default despite being a proxy.\n==============================================================================\nPART 5 -- the recommendation\n==============================================================================\n  a TOKEN trigger at 60-70% of the available history budget, as the\n  primary. it tracks the cost and the window directly, and it\n  cannot be fooled by turn size.\n\n  plus a HARD CAP on turns as a backstop, because a pathological\n  case -- one enormous turn -- can exceed the budget in a single\n  step and a percentage trigger will not have fired.\n\n  and the thing to measure afterwards is not the trigger. it is\n  whether the summarised conversation can still answer the\n  questions the full one could -- which is 13.3's measurement.",
        notes: [
          { t: "p", text: "**A short turn was 2 tokens and a long one 51** \u2014 a 25.5x ratio, so a turn is not a unit of anything." },
          { t: "p", text: "**So \u2018every 10 turns\u2019 means 20 tokens or 510**, depending on the conversation." },
          { t: "p", text: "**It fires too early on a chatty conversation** (where summarising costs more than it saves) **and too late on one with pasted logs**." },
          { t: "p", text: "**The window and the cost both depend on the token count** (13.1), so a turn trigger is a proxy measured in a unit that varies 25-fold." },
          { t: "p", text: "**A token trigger must fire well below the limit**, because the summarisation call needs the history as input and so needs it to still fit." },
          { t: "p", text: "**A 100% trigger fires when summarising is no longer possible.** 60\u201370% leaves room for the call and for one more turn arriving while it runs." },
          { t: "p", text: "**Semantic drift matches the intent most closely** \u2014 the question is whether the old history is still relevant, not whether it is long." },
          { t: "p", text: "**And it is hardest to measure**, because an embedding measures similarity rather than relevance (5.4) \u2014 two turns about the same order can look dissimilar." },
          { t: "p", text: "**So: a token trigger at 60\u201370% plus a hard turn cap as a backstop**, and then measure whether the summary kept the facts (13.3)." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the summariser that never fired", body: [
      { t: "p", text: "A team sets a summarisation trigger at 90% of the model's context window. In production, long conversations fail with context errors anyway \u2014 the summariser raises before it can produce anything." },
      { t: "p", text: "At 90% of the window there is not enough room left for the summarisation call, which needs the entire history as its input plus space for the summary it produces. The trigger fires correctly and the operation it triggers cannot run, so the conversation proceeds to the hard limit and fails." },
      { t: "p", text: "The threshold has to be a fraction of the **available history** rather than of the window, and low enough that the summarisation request fits comfortably \u2014 60 to 70 percent in practice. The transferable point is that a trigger for an operation must leave room for the operation: a cleanup that needs resources cannot be scheduled for the moment the resources run out." }
    ] }
  ],
  takeaways: [
    "**Three triggers**: token count, turn count, semantic drift \u2014 firing at different times.",
    "**A short turn was 2 tokens and a long one 51** \u2014 a 25.5x ratio.",
    "**So a turn is not a unit of anything**, and \u2018every 10 turns\u2019 means 20 tokens or 510.",
    "**It fires too early on a chatty conversation and too late on one with logs.**",
    "**The window and the cost both depend on the token count**, so a turn trigger is a bad proxy.",
    "**A token trigger must fire well below the limit**, because summarising needs the history as input.",
    "**A 100% trigger fires when summarising is no longer possible.**",
    "**60\u201370% of available history** leaves room for the call and one more turn.",
    "**Semantic drift matches the intent** \u2014 is the old history still relevant, not is it long.",
    "**And it is hardest to measure**: an embedding measures similarity, not relevance (5.4).",
    "**Two turns about the same order can look dissimilar**, and dropping them loses the order id.",
    "**So a token trigger is the practical default** despite being a proxy.",
    "**Plus a hard turn cap as a backstop**, for one enormous turn.",
    "**And measure the facts afterwards, not the trigger** \u2014 13.3's check."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why is a turn-count summarisation trigger a poor choice?",
      options: ["Turns are hard to count reliably",
        "Turn sizes vary enormously \u2014 measured at 25.5x between a short and a long turn \u2014 so it fires too early or too late",
        "It requires storing the turn count in state",
        "It cannot be combined with other triggers"],
      answer: 1,
      why: "A conversation of acknowledgements reaches ten turns in a few dozen tokens, where summarising costs more than it saves; one with pasted logs exceeds the budget well before ten. Since the window and the cost both depend on tokens rather than turns, a turn count is a proxy measured in a unit that varies by a factor of 25." },
    { stem: "Why can a summarisation trigger not fire at 100% of the available history?",
      options: ["Providers reject requests that fill the window exactly",
        "The summarisation call needs the history as its input, so it needs the history to still fit",
        "The trigger evaluation itself consumes tokens",
        "Reducers require headroom to merge"],
      answer: 1,
      why: "The operation that frees space requires space: the summariser must read the whole history and write a summary. Triggering at the limit means triggering at the moment the fix becomes impossible, so the conversation proceeds to the hard failure anyway. A cleanup that needs resources cannot be scheduled for when the resources run out." },
    { stem: "Why is semantic drift the hardest trigger to use despite matching the intent best?",
      options: ["Embeddings are expensive to compute per turn",
        "An embedding measures similarity rather than relevance, so turns about different aspects of the same subject look dissimilar",
        "Drift cannot be computed incrementally",
        "It requires a labelled set of topic changes"],
      answer: 1,
      why: "The intent is right \u2014 the question is whether the old history is still relevant, not whether it is long. But two turns about different aspects of the same order score as dissimilar, so a drift trigger would fire and drop the turn containing the order id. That is the measured failure that destroys the subject of the conversation." },
    { stem: "After the trigger fires and the summary is produced, what should you measure?",
      options: ["The token count of the resulting context",
        "Whether the summarised conversation can still answer the questions the full one could",
        "The latency of the summarisation call",
        "How often the trigger fires per conversation"],
      answer: 1,
      why: "A token count confirms the context shrank and says nothing about whether the summary destroyed the subject. A trigger that fires at exactly the right moment and a summary that drops every identifier is worse than firing late, because the token metric looks healthy. The check is to list the facts, apply the strategy, and see which survive." }
  ] },
  interview: { title: "Interview practice", sub: "When to summarise", questions: [
    { level: "core", q: "What triggers summarisation in a conversational agent?",
      strong: "A strong answer picks tokens and explains the threshold.",
      answer: [
        { t: "p", text: "A token count at 60 to 70 percent of the available history budget, with a hard turn cap as a backstop." },
        { t: "p", text: "Tokens rather than turns because turn size varies enormously \u2014 I measured a short turn at 2 tokens and a long one at 51, a factor of 25. So 'every ten turns' means twenty tokens on a conversation of acknowledgements and five hundred on one with pasted logs, and it is the token count that the window and the cost both depend on." },
        { t: "p", text: "And well below the limit, because the summarisation call needs the whole history as its input. A trigger at the limit fires at the moment the operation becomes impossible \u2014 I have seen a trigger at 90% of the window never successfully produce a summary, because there was no room for the call." },
        { t: "p", text: "The turn cap is for the pathological case: one enormous turn can exceed the budget in a single step before a percentage trigger has had a chance to evaluate." }
      ] },
    { level: "advanced", q: "Would you use semantic drift as a trigger?",
      strong: "A strong answer wants it and distrusts the measurement.",
      answer: [
        { t: "p", text: "It is the trigger I would want and not the one I would ship, because it matches the intent and the measurement is unreliable in a specific way." },
        { t: "p", text: "The intent is right. The real question is not whether the history is long but whether the old history is still relevant \u2014 a conversation that changed topic can drop its early turns entirely, and one still on the original question cannot. A token count cannot distinguish those." },
        { t: "p", text: "The measurement would be embedding the first few turns and the last few and comparing. And the problem is that an embedding measures similarity of surface meaning rather than relevance, which I have measured elsewhere giving an irrelevant text a higher score than a genuinely relevant one." },
        { t: "p", text: "Applied here, two turns about different aspects of the same order look dissimilar. So a drift trigger fires, the early turns are dropped, and the order id goes with them \u2014 which is exactly the failure I measured destroying the subject of a conversation." },
        { t: "p", text: "So I would use tokens as the trigger and spend the effort on the summary instead. Making the summarisation prompt preserve identifiers is a bigger win than making the trigger cleverer, and it is measurable: list the facts, apply the strategy, check which survive." }
      ] },
    { level: "advanced", q: "Your summarisation trigger fires correctly but conversations still fail. Where would you look?",
      strong: "A strong answer checks whether the triggered operation can run.",
      answer: [
        { t: "p", text: "At whether the operation the trigger fires has room to run, because a correct trigger and a failing operation is the characteristic shape here." },
        { t: "p", text: "The summarisation call needs the entire history as its input plus space for the summary it writes. So a threshold set as a fraction of the model's window \u2014 90% is the one I have seen \u2014 fires at the point where that call no longer fits. The trigger is working and the fix is impossible, so the conversation proceeds to the hard limit and fails anyway." },
        { t: "p", text: "The threshold has to be a fraction of the available history rather than of the window, which means subtracting the output reserve, the system prompt and the tool descriptions first. Sixty to seventy percent of that is the practical range, and it leaves room for one more turn arriving while the summarisation call runs \u2014 which in a conversational system it will." },
        { t: "p", text: "The other thing I would check is whether one enormous turn is jumping the threshold in a single step. A percentage trigger evaluates between turns, so a pasted log can take the history from 50% to over budget before it has a chance to fire. A hard turn cap as a backstop covers that." },
        { t: "p", text: "The general lesson is that a cleanup which consumes resources cannot be scheduled for the moment the resources run out \u2014 which is the same reason a disk-full handler that needs to write a temp file does not work." }
      ] }
  ] }
});
