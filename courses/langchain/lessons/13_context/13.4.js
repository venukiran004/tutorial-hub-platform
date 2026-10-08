EC.receiveLesson({
  id: "13.4",
  lede: "13.3's summary is **linear** in the number of summaries, so it postpones the problem rather than solving it. Two strategies scale indefinitely. **Hierarchical** summarisation summarises the summaries \u2014 four segment summaries at 85 tokens became one at **46**, bounded by its prompt rather than by its input \u2014 but the loss **compounds**: a vague level 1 produced a level 2 keeping **NO facts**, because 7.8's ceiling now applies twice and a careful top-level prompt cannot rescue a vague segment summary. Even the detailed path lost one of five. **Retrieval from history** makes the conversation a RAG problem, which means every finding from modules 5 to 7 applies \u2014 including that a similarity search returns k turns whether or not any is relevant. So carrying the last six is wrong in a **knowable** way and retrieving six is wrong in an **unknowable** one.",
  objectives: [
    "Implement hierarchical summarisation and show the bounded cost",
    "Show that the loss compounds across levels",
    "Describe retrieval from history and what it inherits from RAG",
    "Say what retrieval from history is and is not good for",
    "Rank all five strategies by how far they scale"
  ],
  prerequisites: ["13.3", "9.6", "6.2"],
  blocks: [
    { t: "h2", n: "01", id: "why", text: "Why 13.3 is not enough", sub: "Linear, not constant" },
    { t: "p", text: "A flat summary grows with the conversation: summarise every 8 turns and a 200-turn conversation carries 25 summaries. Smaller than the history, still **linear** \u2014 so it postpones the problem by a constant factor rather than removing it." },
    { t: "h2", n: "02", id: "hier", text: "Hierarchical summarisation", sub: "Summaries of summaries" },
    { t: "code", lang: "text", title: "Two levels",
      code: "level 1 -- four segment summaries:\n  34 tok  Turns 1-4: customer reported a duplicate charge on order O...\n  18 tok  Turns 5-8: payments team investigating; customer confirmed...\n  16 tok  Turns 9-12: reversal scheduled; customer asked about the t...\n  17 tok  Turns 13-16: customer asked whether the card would be char...\n  total: 85 tokens\n\nlevel 2 -- one summary of those four:\n  46 tokens\n  facts kept: ['order id', 'the amount', 'the card', 'the date']",
      caption: "85 tokens of summaries became 46 \u2014 and the cost stops growing." },
    { t: "callout", kind: "insight", title: "Bounded by its prompt, not by its input", body: [
      { t: "p", text: "That is the whole mechanism. The level-2 summary is re-generated as segments accumulate, and its size is set by what you asked for rather than by how much went in \u2014 so a 50-turn and a 500-turn conversation carry the same context." },
      { t: "p", text: "And note what it cost even on the careful path: **4 of 5 facts**. *\u201cThe reason\u201d* did not survive the second pass. A bounded summary of a growing input has to drop something, and each level decides what independently." }
    ] },
    { t: "h2", n: "03", id: "compounds", text: "The loss compounds", sub: "7.8's ceiling, applied twice" },
    { t: "code", lang: "text", title: "A vague level 1",
      code: "vague level 1: ['Turns 1-4: customer reported a billing problem.',\n                'Turns 5-8: investigation ongoing.']\nvague level 2: 'The customer has a billing problem under investigation.'\nfacts kept   : NONE",
      caption: "Level 2 can only keep what level 1 kept." },
    { t: "callout", kind: "trap", title: "A careful top-level prompt cannot rescue a vague segment summary", body: [
      { t: "p", text: "Level 2's ceiling is level 1's **output**, not the conversation \u2014 so the detail requirement has to be at level 1, and the top level merely has to not drop what arrives. Getting that order wrong produces a system where the expensive, carefully-prompted step operates on nothing." },
      { t: "p", text: "Which is 7.8's finding about multimodal summaries becoming the retrievable artefact, now with two lossy steps instead of one. Every level you add multiplies the ways a fact can disappear." }
    ] },
    { t: "callout", kind: "tradeoff", title: "And it costs model calls", body: [
      { t: "p", text: "One per segment, plus one per re-generation of the top level. That is the price of a constant token count \u2014 you are trading per-turn input tokens for periodic generation calls, which is usually worth it and is not free." }
    ] },
    { t: "h2", n: "04", id: "retrieve", text: "Retrieval from history", sub: "Leave the past somewhere and fetch it" },
    { t: "p", text: "Write every turn to a store (9.6) and retrieve the relevant ones per question instead of carrying all of them. The history becomes a **corpus** and the conversation becomes a **RAG problem** \u2014 so every finding from modules 5 to 7 applies to it." },
    { t: "ul", items: [
      "The turns need chunking decisions (5.3).",
      "Retrieval will miss exact terms (6.2, 6.3).",
      "*\u201cWhich order\u201d* is a vocabulary-mismatch query if the user said *\u201cthe order\u201d* rather than `ORD-4471` (5.4).",
      "And a similarity search always returns k turns, **even when none of them is relevant** (6.2)."
    ] },
    { t: "callout", kind: "warn", title: "Knowably wrong versus unknowably wrong", body: [
      { t: "p", text: "That last one is the serious objection. Carrying the last 6 turns is wrong in a **knowable** way \u2014 you know exactly what you dropped, which is 13.3's measurement. Retrieving 6 turns is wrong in an **unknowable** way, because retrieval failure looks like retrieval success: six turns arrive, confidently ranked, and nothing indicates whether the one you needed is among them." },
      { t: "p", text: "So replacing a window with retrieval exchanges a loss you can enumerate for one you cannot, which is a worse position to debug from even when it is right more often." }
    ] },
    { t: "h2", n: "05", id: "goodfor", text: "What retrieval from history is actually for", sub: "The long tail" },
    { t: "p", text: "Not replacing the recent turns. The recent turns are what the model needs to continue the sentence it is in the middle of, and no retrieval strategy reliably surfaces *\u201cwhat we were just talking about\u201d* \u2014 that query has no distinguishing terms." },
    { t: "p", text: "What it **is** good for is a conversation spanning weeks where the relevant earlier turn is three days old and topically specific. That is a genuine retrieval problem and carrying it is not an option." },
    { t: "code", lang: "text", title: "So the shape is additive, not substitutive",
      code: "the system message        always\na detailed summary        always (13.3)\nthe last N turns verbatim always\nretrieved older turns     when the question warrants it",
      caption: "Four mechanisms \u2014 each added because the previous three had a blind spot." },
    { t: "h2", n: "06", id: "scale", text: "How far each one scales", sub: "The ranking" },
    { t: "table", head: ["strategy", "token cost", "scales to"], rows: [
      ["carry everything", "quadratic (13.1)", "a short session"],
      ["sliding window", "constant", "any length, **loses the start**"],
      ["flat summarisation", "linear in summaries", "a long session"],
      ["hierarchical", "roughly constant", "an indefinite session"],
      ["retrieval from history", "constant", "an indefinite **history**"]
    ] },
    { t: "callout", kind: "mental", title: "And the choice between the last two is 9.6's question", body: [
      { t: "p", text: "Hierarchical **compresses** the past; retrieval **leaves it somewhere** and fetches it. So the question is whether this should outlive the conversation \u2014 a summary is in the thread, and a store of turns is not, and can be searched across threads." },
      { t: "p", text: "That is the same distinction as thread state versus a store, arriving from a different direction. Which is a sign it is the real axis rather than an implementation detail." }
    ] },
    { t: "exercise", kind: "build", title: "Scale context management indefinitely",
      difficulty: "advanced", minutes: 35,
      body: "Implement hierarchical summarisation: summarise segments of a conversation, then summarise those summaries, reporting token counts and facts kept at each level. Show that the loss compounds by running the same structure with a vague level-1 prompt. Then describe retrieval from history and list what it inherits from modules 5 to 7, including the objection that matters most. Say what retrieval is and is not good for, and rank all five strategies by how far they scale.",
      requirements: ["Produce level-1 segment summaries with token counts",
        "Produce a level-2 summary and report its size and facts kept",
        "Explain what bounds the level-2 size",
        "Show the compounding loss with a vague level-1 prompt",
        "State where the detail requirement must go and why",
        "List what retrieval from history inherits from RAG",
        "Distinguish knowably wrong from unknowably wrong",
        "Say what retrieval is not good for",
        "Rank the five strategies by scaling"],
      hint: "Summarise the summaries, then try it with a vague level-1 prompt. The second run shows which level the detail requirement belongs at.",
      solution: { lang: "python", title: "x1304.py \u2014 bounded cost, compounding loss",
        code: '# level 1: one summary per segment of turns\nsegs = ["Turns 1-4: customer reported a duplicate charge on order "\n        "ORD-4471 for 148.50 on 11 March, card ending 9921.", ...]\nprint(sum(ntok(s) for s in segs))            # 85\n\n# level 2: one summary of those summaries -- bounded by its PROMPT\ntop = ("Customer disputes a duplicate charge of 148.50 on order ORD-4471 "\n       "dated 11 March, card ending 9921; reversal scheduled.")\nprint(ntok(top), facts_present(top))         # 46, 4 of 5\n\n# and the loss compounds: level 2 can only keep what level 1 kept\nvague1 = ["Turns 1-4: customer reported a billing problem.", ...]\nvague2 = "The customer has a billing problem under investigation."\nprint(facts_present(vague2))                 # []',
        out: "==============================================================================\nPART 1 -- hierarchical summarisation -- summaries of summaries\n==============================================================================\n  one summary per N turns, then one summary of those summaries.\n  which keeps the token count roughly CONSTANT as the conversation\n  grows, instead of linear in the number of summaries.\n\n  level 1 -- four segment summaries:\n    34  tok  Turns 1-4: customer reported a duplicate charge on order O\n    18  tok  Turns 5-8: payments team investigating; customer confirmed\n    16  tok  Turns 9-12: reversal scheduled; customer asked about the t\n    17  tok  Turns 13-16: customer asked whether the card would be char\n    total: 85 tokens\n\n  level 2 -- one summary of those four:\n    46 tokens\n    facts kept: ['order id', 'the amount', 'the card', 'the date']\n\n  so the history cost stops growing with the conversation. the\n  level-2 summary is re-generated as segments accumulate, and its\n  size is bounded by its prompt rather than by the input.\n==============================================================================\nPART 2 -- what it costs\n==============================================================================\n  LOSS COMPOUNDS. every level is a lossy step, and level 2 can only\n  keep what level 1 kept:\n\n    vague level 1: ['Turns 1-4: customer reported a billing problem.', 'Turns 5-8: investigation ongoing.']\n    vague level 2: 'The customer has a billing problem under investigation.'\n    facts kept   : NONE\n\n  which is 7.8's ceiling argument applied twice: level 2's ceiling\n  is level 1's output, so a vague segment summary cannot be\n  rescued by a careful top-level prompt.\n\n  so hierarchical summarisation needs the DETAIL REQUIREMENT at\n  level 1 -- 'preserve all identifiers, amounts and dates' -- and\n  the top level merely has to not drop them.\n\n  it also costs a model call per segment plus one per re-generation\n  of the top level, which is the price of the constant token count.\n==============================================================================\nPART 3 -- relevance-based -- retrieve from history instead of carrying it\n==============================================================================\n  the other strategy that scales: write every turn to a store\n  (9.6), and retrieve the relevant ones per question instead of\n  carrying all of them.\n\n  so the history becomes a CORPUS and the conversation becomes a\n  RAG problem -- which means every finding from modules 5 to 7\n  applies to it:\n\n    the turns need chunking decisions (5.3)\n    retrieval will miss exact terms (6.2, 6.3)\n    'which order' is a vocabulary-mismatch query if the user said\n      'the order' rather than 'ORD-4471' (5.4)\n    and a similarity search always returns k turns, even when none\n      of them is relevant (6.2)\n\n  that last one is the serious objection. carrying the last 6 turns\n  is WRONG in a knowable way; retrieving 6 turns is wrong in an\n  unknowable way, because retrieval failure looks like retrieval\n  success.\n==============================================================================\nPART 4 -- what retrieval-from-history is actually good for\n==============================================================================\n  not replacing the recent turns. the recent turns are what the\n  model needs to continue the sentence it is in the middle of, and\n  no retrieval strategy reliably surfaces 'what we were just\n  talking about'.\n\n  what it IS good for is the long tail: a conversation spanning\n  weeks where the relevant earlier turn is three days old and\n  topically specific. that is a genuine retrieval problem and\n  carrying it is not an option.\n\n  so the shape that works is ADDITIVE rather than substitutive:\n\n    the system message        always\n    a detailed summary        always (13.3)\n    the last N turns verbatim always\n    retrieved older turns     when the question warrants it\n\n  which is four mechanisms, and the honest note is that each one\n  was added because the previous three had a blind spot.\n==============================================================================\nPART 5 -- how far each scales\n==============================================================================\n  strategy                 token cost          scales to\n  carry everything         quadratic (13.1)    a short session\n  sliding window           constant            any length, loses the start\n  flat summarisation       linear in summaries a long session\n  hierarchical             roughly constant    an indefinite session\n  retrieval from history   constant            an indefinite history\n\n  the last two are the ones that scale indefinitely, and they do it\n  by different means: hierarchical COMPRESSES the past, retrieval\n  LEAVES it somewhere and fetches it.\n\n  so the choice between them is 9.6's question again: should this\n  outlive the conversation? a summary is in the thread; a store of\n  turns is not, and can be searched across threads.",
        notes: [
          { t: "p", text: "**A flat summary is linear in the number of summaries**, so 13.3 postpones the problem by a constant factor rather than removing it." },
          { t: "p", text: "**Four segment summaries at 85 tokens became one at 46**, and the level-2 size is bounded by its prompt rather than by its input \u2014 so the cost stops growing." },
          { t: "p", text: "**Even the careful path kept only 4 of 5 facts**: a bounded summary of a growing input has to drop something, and each level decides independently." },
          { t: "p", text: "**With a vague level 1, level 2 kept NO facts** \u2014 because level 2's ceiling is level 1's output, not the conversation (7.8)." },
          { t: "p", text: "**So the detail requirement belongs at level 1**, and the top level merely has to not drop what arrives." },
          { t: "p", text: "**Retrieval from history makes the conversation a RAG problem**, so chunking, exact-term misses and vocabulary mismatch all apply." },
          { t: "p", text: "**And a similarity search returns k turns whether or not any is relevant** (6.2), so a window is wrong knowably and retrieval is wrong unknowably." },
          { t: "p", text: "**Retrieval is not for the recent turns** \u2014 \u2018what we were just talking about\u2019 has no distinguishing terms. It is for the long tail." },
          { t: "p", text: "**So the shape is additive**: system message, detailed summary, recent turns verbatim, and retrieved older turns when warranted." },
          { t: "p", text: "**Hierarchical compresses the past; retrieval leaves it somewhere** \u2014 which is 9.6's thread-versus-store question arriving from a different direction." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the careful prompt that operated on nothing", body: [
      { t: "p", text: "A team builds hierarchical summarisation and spends a week tuning the top-level prompt to preserve identifiers. Long conversations still lose the order number, and the top-level summary reads exactly as instructed." },
      { t: "p", text: "The segment summaries are generated by a generic instruction to summarise, so the identifiers are gone before the top level sees anything. The expensive, carefully-prompted step is operating on input that already lost what it was told to preserve \u2014 and it cannot be rescued, because what a summary omits is permanently unrecoverable and the omission happened a level down." },
      { t: "p", text: "The detail requirement belongs at level 1, where the original text is still available; the top level only has to not drop what arrives. The general rule for any multi-stage lossy pipeline is that the fidelity requirement goes at the **earliest** stage, because every later stage's ceiling is the output of the one before it." }
    ] }
  ],
  takeaways: [
    "**A flat summary is linear in the number of summaries** \u2014 postponed, not solved.",
    "**Hierarchical summarisation summarises the summaries**: 85 tokens became 46.",
    "**Bounded by its prompt, not by its input**, so a 50-turn and a 500-turn conversation cost the same.",
    "**Even the careful path kept only 4 of 5 facts** \u2014 a bounded summary must drop something.",
    "**The loss compounds**: a vague level 1 produced a level 2 keeping NO facts.",
    "**Level 2's ceiling is level 1's output** (7.8), so a careful top prompt cannot rescue a vague segment.",
    "**So the detail requirement goes at the earliest lossy stage.**",
    "**And it costs a model call per segment** plus one per top-level re-generation.",
    "**Retrieval from history makes the conversation a RAG problem** \u2014 all of modules 5\u20137 applies.",
    "**A similarity search returns k turns whether or not any is relevant** (6.2).",
    "**So a window is wrong knowably and retrieval is wrong unknowably** \u2014 worse to debug.",
    "**Retrieval is not for the recent turns**: \u2018what we were just talking about\u2019 has no distinguishing terms.",
    "**The shape is additive**: system message, summary, recent turns verbatim, retrieved older turns.",
    "**Hierarchical compresses the past; retrieval leaves it somewhere** \u2014 9.6's question again."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What bounds the size of a level-2 summary in hierarchical summarisation?",
      options: ["The number of segments beneath it",
        "Its own prompt \u2014 so the cost stops growing with the conversation",
        "The context window of the summarising model",
        "The length of the longest segment summary"],
      answer: 1,
      why: "Four segment summaries totalling 85 tokens became one of 46, and re-generating it as more segments accumulate keeps that roughly constant. That is the entire reason the strategy scales indefinitely: the carried context is set by what you asked for rather than by how much went in. The cost is paid in model calls instead." },
    { stem: "A vague level-1 prompt produced a level-2 summary keeping no facts. What does that imply about where the detail requirement goes?",
      options: ["At the top level, where the final context is produced",
        "At level 1, because level 2's ceiling is level 1's output rather than the conversation",
        "At both levels equally",
        "In the retrieval step instead"],
      answer: 1,
      why: "What a summary omits is permanently unrecoverable, so a carefully prompted top level operating on vague segments is operating on input that has already lost what it was told to preserve. The general rule for any multi-stage lossy pipeline is that the fidelity requirement belongs at the earliest stage, where the original text is still available." },
    { stem: "Why is retrieval from history 'unknowably' wrong where a sliding window is 'knowably' wrong?",
      options: ["Retrieval is slower, so failures are harder to reproduce",
        "A similarity search returns k turns whether or not any is relevant, so retrieval failure looks like retrieval success",
        "Retrieval depends on an external store that may be unavailable",
        "Windows are deterministic and retrieval is sampled"],
      answer: 1,
      why: "With a window you know exactly which turns were dropped \u2014 that is what makes the fact-survival check possible. With retrieval, six turns arrive confidently ranked and nothing indicates whether the one you needed is among them. Exchanging an enumerable loss for an unenumerable one is a worse debugging position even when it is right more often." },
    { stem: "What is retrieval from history NOT suited to?",
      options: ["Conversations spanning weeks",
        "Supplying the recent turns, because 'what we were just talking about' has no distinguishing terms",
        "Topically specific older turns",
        "Searching across threads"],
      answer: 1,
      why: "The recent turns are what the model needs to continue the exchange it is in the middle of, and that need cannot be expressed as a query \u2014 there is nothing to match on. Retrieval earns its place on the long tail, where the relevant turn is days old and specific. Hence the additive shape rather than retrieval replacing the window." }
  ] },
  interview: { title: "Interview practice", sub: "Scaling context", questions: [
    { level: "advanced", q: "How would you manage context for a conversation that never ends?",
      strong: "A strong answer names the two indefinite strategies and their cost.",
      answer: [
        { t: "p", text: "Hierarchical summarisation or retrieval from history \u2014 those are the two that scale indefinitely, and they do it by different means." },
        { t: "p", text: "The reason a flat summary is not enough is that it is linear in the number of summaries. Summarise every eight turns and a two-hundred-turn conversation carries twenty-five summaries, which is smaller than the history and still growing." },
        { t: "p", text: "Hierarchical fixes that by summarising the summaries. I measured four segment summaries at 85 tokens becoming one at 46, and the key property is that the top-level size is bounded by its prompt rather than by its input \u2014 so a fifty-turn and a five-hundred-turn conversation carry the same context. The cost is a model call per segment plus one per re-generation." },
        { t: "p", text: "Retrieval is the other: write every turn to a store and fetch the relevant ones per question. That scales to an indefinite history rather than just an indefinite session, and it can be searched across threads." },
        { t: "p", text: "So the choice is whether the past should outlive the conversation. A summary lives in the thread; a store of turns does not." }
      ] },
    { level: "advanced", q: "What goes wrong with hierarchical summarisation?",
      strong: "A strong answer identifies the compounding loss and where to fix it.",
      answer: [
        { t: "p", text: "The loss compounds, and the fix goes at a level people do not expect." },
        { t: "p", text: "Every level is a lossy step, and level 2 can only keep what level 1 kept. I ran it with a vague level-1 prompt and the level-2 summary kept none of the five facts \u2014 so a carefully prompted top level cannot rescue a vague segment summary. Its ceiling is level 1's output, not the conversation." },
        { t: "p", text: "That is the failure I would expect to see in practice: a team tuning the top-level prompt for a week while the identifiers are being destroyed a level down. The expensive step is operating on input that already lost what it was told to preserve." },
        { t: "p", text: "So the detail requirement goes at level 1, where the original text is still available, and the top level merely has to not drop what arrives. Stated generally: in any multi-stage lossy pipeline the fidelity requirement belongs at the earliest stage." },
        { t: "p", text: "And even on the careful path it is not free \u2014 my detailed run kept four of five facts, losing the reason for the dispute. A bounded summary of a growing input has to drop something, and each level decides what independently. So I would enumerate the facts that must survive and check them, rather than assuming a good prompt is sufficient." }
      ] },
    { level: "core", q: "Would you replace a sliding window with retrieval from the conversation history?",
      strong: "A strong answer adds retrieval rather than substituting it.",
      answer: [
        { t: "p", text: "I would add it rather than replace, and for two reasons that both come from what retrieval cannot do." },
        { t: "p", text: "The first is that the recent turns are not a retrieval problem. What the model needs to continue the exchange it is in the middle of is \u2018what we were just talking about\u2019, and that query has no distinguishing terms to match on. No similarity search reliably surfaces it." },
        { t: "p", text: "The second is that retrieval failure looks like retrieval success. A similarity search returns k turns whether or not any of them is relevant \u2014 so six turns arrive, confidently ranked, and nothing indicates whether the one you needed is among them." },
        { t: "p", text: "Which makes the comparison sharper than it first looks: carrying the last six turns is wrong in a knowable way, because I can enumerate exactly what was dropped and check it. Retrieving six is wrong in an unknowable way. That is a worse position to debug from even when it is right more often." },
        { t: "p", text: "Where retrieval earns its place is the long tail \u2014 a conversation spanning weeks where the relevant turn is three days old and topically specific. That is a genuine retrieval problem and carrying it is not an option." },
        { t: "p", text: "So the shape is additive: the system message always, a detailed summary always, the last few turns verbatim always, and retrieved older turns when the question warrants it. Four mechanisms, and each one is there because the previous three had a blind spot." }
      ] }
  ] }
});
