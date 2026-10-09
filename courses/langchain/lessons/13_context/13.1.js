EC.receiveLesson({
  id: "13.1",
  lede: "Each turn's prompt contains every previous turn, so the cost of a conversation is the **sum of the prefixes** rather than its final length \u2014 and measured, a 40-turn conversation has **sent 21.6\u00d7 its own final size**. That is the number that governs the bill and it is not the number anyone looks at. The same mechanism produced 9.5's quadratic storage, so the two costs have one cause. And three things degrade as history grows, at different points: cost rises from the **first** turn, quality degrades in the middle (7.3), and the context window is a **cliff** \u2014 so the decision is forced by the one that announces itself and should be made because of the one that does not.",
  objectives: [
    "Measure where the tokens go in an agent turn",
    "Show that conversation cost is quadratic in turns",
    "Separate the three pressures and say which announces itself",
    "Compute the available history budget as arithmetic",
    "State what context engineering is deciding"
  ],
  prerequisites: ["7.3", "9.5"],
  blocks: [
    { t: "h2", n: "01", id: "where", text: "Where the tokens go", sub: "In one agent turn" },
    { t: "code", lang: "text", title: "Four components",
      code: "component                   tokens    share\nthe system prompt           13        2.3%\nthe tool descriptions       53        9.3%\nthe question                13        2.3%\nthe conversation history    489       86.0%\nTOTAL                       568",
      caption: "The history dominates, and it is the only part that **grows**." },
    { t: "p", text: "The system prompt and the tool descriptions are a fixed cost per turn (11.3), and the question is paid once. So every strategy in this module is about the 86% \u2014 which is also why 11.3's advice to keep the tool list short matters less than it sounds for a long conversation." },
    { t: "h2", n: "02", id: "quadratic", text: "The quadratic growth", sub: "The sum of the prefixes" },
    { t: "code", lang: "text", title: "Measured",
      code: "turns   final prompt   cumulative tokens sent   ratio\n1       171            171                      1.0x\n2       220            391                      1.8x\n5       367            1345                     3.7x\n10      612            3915                     6.4x\n20      1102           12730                    11.6x\n40      2082           45060                    21.6x",
      caption: "At 40 turns the conversation has sent **21.6\u00d7** its own final length." },
    { t: "callout", kind: "insight", title: "Not the number anyone looks at", body: [
      { t: "p", text: "The final prompt is 2,082 tokens, which sounds manageable. The conversation has sent 45,060, and that is what the bill reflects \u2014 so reasoning about cost from the context size understates it by an order of magnitude." },
      { t: "p", text: "9.5 found the same shape in storage: every checkpoint holds the full history to that point, so persistence is quadratic too. The two costs have **one cause**, which means one fix addresses both." }
    ] },
    { t: "h2", n: "03", id: "three", text: "Three pressures, at different points", sub: "And only one announces itself" },
    { t: "ol", items: [
      "**Cost** rises quadratically, from the first turn. No threshold \u2014 it is always happening.",
      "**Latency** rises with input tokens, gradually.",
      "The **context window** is a cliff \u2014 it works, then it fails."
    ] },
    { t: "callout", kind: "warn", title: "Forced by the third, decided because of the first", body: [
      { t: "p", text: "A team that waits for the context error has been paying the quadratic cost for however long it took to get there \u2014 and the error arrives at the worst moment, on the longest and most valuable conversations." },
      { t: "p", text: "And 7.3's finding sits in between: the model attends less reliably to the middle of a long context, so **quality degrades before the window is reached**. There are three reasons to manage context and only one of them tells you about itself." }
    ] },
    { t: "h2", n: "04", id: "budget", text: "The budget as arithmetic", sub: "A fixed number of tokens" },
    { t: "code", lang: "text", title: "An 8,192 window with 1,000 reserved",
      code: "window                   8192\nreserve for the answer  -1000\nsystem + tools          -66\nthe question            -13\n= available for history  7113\n\n5   turns of history = 367    tokens  FITS\n10  turns of history = 612    tokens  FITS\n20  turns of history = 1102   tokens  FITS\n40  turns of history = 2082   tokens  FITS",
      caption: "The reserve is 7.3's point: a budget without it fails at generation time." },
    { t: "callout", kind: "mental", title: "Which tokens, not how many", body: [
      { t: "p", text: "The available history is a fixed number of tokens, and the strategies in 13.2 to 13.5 are all ways of deciding **which** tokens they are. That is the whole of context engineering stated as one sentence." },
      { t: "p", text: "Note also that this corpus's turns are small, so even 40 turns fits an 8K window \u2014 the cost problem bites long before the window does, which is exactly the point of the previous section. A conversation with pasted logs or tool results reverses that." }
    ] },
    { t: "diagram", kind: "timeline", title: "A conversation costs the sum of its prefixes",
      caption: "Cumulative tokens sent divided by the final prompt size, measured. At 40 turns the conversation has sent **21.6×** its own final length — which is not the number anyone quotes.",
      span: 22, tick: 2, unit: "cumulative tokens ÷ final prompt",
      lanes: [
        { label: "1 turn",   bars: [[0, 1.0, "1.0x", "good"]] },
        { label: "5 turns",  bars: [[0, 3.7, "3.7x", "good"]] },
        { label: "10 turns", bars: [[0, 6.4, "6.4x", "accent"]] },
        { label: "20 turns", bars: [[0, 11.6, "11.6x", "warn"]] },
        { label: "40 turns", bars: [[0, 21.6, "21.6x", "crit"]] }
      ] },
    { t: "exercise", kind: "analysis", title: "Measure the context budget",
      difficulty: "core", minutes: 30,
      body: "Break one agent turn into its components and report each one's token count and share. Then measure the cumulative tokens a conversation sends across several lengths and compare against its final prompt size. Separate the three pressures that grow with history and say which one announces itself. Finally compute the available history budget for a given window as arithmetic, including a reserve for the answer.",
      requirements: ["Report the token count and share of at least four prompt components",
        "Identify which component grows and which are fixed per turn",
        "Measure cumulative tokens sent against final prompt size at several lengths",
        "State the ratio at the longest length and what it means for cost",
        "Connect it to the storage cost from 9.5",
        "Separate three pressures and say which is a cliff",
        "Compute the available history budget including an output reserve"],
      hint: "Sum the prompt size across every turn, not just the last one. The ratio between that and the final size is the cost nobody quotes.",
      solution: { lang: "python", title: "x1301.py \u2014 21.6x at 40 turns",
        code: 'import tiktoken\nENC = tiktoken.get_encoding("cl100k_base")\n\ndef ntok(x):\n    if isinstance(x, str):\n        return len(ENC.encode(x))\n    return sum(len(ENC.encode(str(getattr(m, "content", "")))) for m in x)\n\nfixed = ntok(system) + ntok(tools)\nfor turns in (1, 2, 5, 10, 20, 40):\n    final = ntok(build_conversation(turns)) + fixed\n    cumulative = sum(ntok(build_conversation(t)) + fixed\n                     for t in range(1, turns + 1))\n    print(turns, final, cumulative, float(cumulative) / final)',
        out: "==============================================================================\nPART 1 -- where the tokens go in one agent turn\n==============================================================================\n  component                   tokens    share\n  the system prompt           13        4.6%\n  the tool descriptions       53        18.9%\n  the question                11        3.9%\n  the conversation history    203       72.5%\n  TOTAL                       280      \n\n  the history dominates, and it is the only part that GROWS. the\n  system prompt and the tool descriptions are a fixed cost per turn\n  (11.3), and the question is paid once.\n==============================================================================\nPART 2 -- the quadratic growth a loop produces\n==============================================================================\n  each turn's prompt contains every previous turn. so the cost of a\n  conversation is the SUM OF THE PREFIXES, not the final length.\n\n  turns   final prompt   cumulative tokens sent   ratio\n  1       171            171                      1.0x\n  2       220            391                      1.8x\n  5       367            1345                     3.7x\n  10      612            3915                     6.4x\n  20      1102           12730                    11.6x\n  40      2082           45060                    21.6x\n\n  at 40 turns the conversation has SENT about 22x its own final\n  length. that is the number that matters for cost, and it is not\n  the number anyone looks at.\n\n  9.5 found the same shape in storage: every checkpoint holds the\n  full history to that point, so persistence is quadratic too. the\n  two costs have one cause.\n==============================================================================\nPART 3 -- the cost curve that forces the decision\n==============================================================================\n  three things happen as the history grows, at different points:\n\n  1. COST rises quadratically, from the first turn. no threshold.\n  2. LATENCY rises with input tokens, gradually.\n  3. the CONTEXT WINDOW is a cliff -- it works, then it fails.\n\n  so the decision is forced by (3) and should be made because of\n  (1). a team that waits for the context error has been paying the\n  quadratic cost for however long it took to get there.\n\n  and 7.3's finding applies in between: the model attends less\n  reliably to the middle of a long context, so quality degrades\n  BEFORE the window is reached. there are three reasons to manage\n  context and only one of them announces itself.\n==============================================================================\nPART 4 -- the budget, as an arithmetic constraint\n==============================================================================\n  a window of 8192 with 1000 reserved for the answer:\n\n    window                   8192\n    reserve for the answer  -1000\n    system + tools          -66\n    the question            -11\n    = available for history  7115\n\n    5   turns of history = 301    tokens  FITS\n    10  turns of history = 546    tokens  FITS\n    20  turns of history = 1036   tokens  FITS\n    40  turns of history = 2016   tokens  FITS\n\n  so the available history is a fixed number of tokens, and the\n  strategies in 13.2 to 13.5 are all ways of deciding WHICH tokens\n  they are. that is the whole of context engineering.",
        notes: [
          { t: "p", text: "**The history was 86% of one turn's prompt**, and it is the only component that grows \u2014 the system prompt and tool descriptions are a fixed per-turn cost." },
          { t: "p", text: "**A conversation's cost is the sum of the prefixes**, so at 40 turns it had sent 45,060 tokens against a final prompt of 2,082 \u2014 **21.6x**." },
          { t: "p", text: "**Which is not the number anyone looks at**: reasoning about cost from the context size understates it by an order of magnitude." },
          { t: "p", text: "**9.5's storage cost has the same cause** \u2014 every checkpoint holds the full history to that point \u2014 so one fix addresses both." },
          { t: "p", text: "**Three pressures at different points**: cost rises from the first turn, quality degrades in the middle (7.3), and the window is a cliff." },
          { t: "p", text: "**Only the cliff announces itself**, so a team that waits for the context error has been paying the quadratic cost throughout." },
          { t: "p", text: "**The budget is arithmetic**: the window minus an output reserve minus the fixed costs minus the question." },
          { t: "p", text: "**So context engineering is deciding WHICH tokens the available history is**, not how many." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the bill nobody could explain", body: [
      { t: "p", text: "A support assistant's token spend is four times the team's estimate. The estimate was built from average conversation length times a per-conversation prompt size, which matched what they saw in traces of individual requests." },
      { t: "p", text: "They priced the final prompt rather than the sum of the prefixes. A twenty-turn conversation sends roughly 11.6 times its final length, so an estimate based on the last request of each conversation understates the total by that factor \u2014 and the error grows with conversation length, so the longest and most engaged sessions are the most underestimated." },
      { t: "p", text: "The estimate that works is cumulative: for each conversation, sum the input tokens across every request rather than measuring one. And the fix is the same one that addresses the storage cost, because both come from carrying the whole history forward \u2014 which is what makes context management a cost project rather than a context-window project." }
    ] }
  ],
  takeaways: [
    "**The history was 86% of one turn's prompt**, and the only component that grows.",
    "**The system prompt and tool descriptions are a fixed per-turn cost** (11.3).",
    "**A conversation's cost is the sum of the prefixes**, not its final length.",
    "**At 40 turns it had sent 45,060 tokens against a 2,082-token final prompt** \u2014 21.6x.",
    "**Which is not the number anyone looks at**, so cost estimates from context size understate it.",
    "**9.5's quadratic storage has the same cause**, so one fix addresses both.",
    "**Three pressures**: cost from turn one, quality in the middle (7.3), and the window as a cliff.",
    "**Only the cliff announces itself.**",
    "**So the decision is forced by the window and should be made because of the cost.**",
    "**And quality degrades before the window is reached**, which nothing reports.",
    "**The budget is arithmetic**: window \u2212 output reserve \u2212 fixed costs \u2212 question.",
    "**The output reserve is not optional** \u2014 without it the failure is at generation time (7.3).",
    "**Context engineering is deciding which tokens the available history is**, not how many.",
    "**Price conversations cumulatively**, summing input tokens across every request."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A 40-turn conversation has a final prompt of 2,082 tokens and has sent 45,060. Why?",
      options: ["Tool descriptions are repeated inefficiently",
        "Each turn's prompt contains every previous turn, so the total is the sum of the prefixes",
        "The checkpointer re-sends state on each call",
        "Retries inflated the count"],
      answer: 1,
      why: "Every request carries the whole history up to that point, so the conversation's cost is a sum over growing prompts rather than the size of the last one \u2014 a ratio of 21.6x here. Estimating cost from the context size therefore understates it by roughly an order of magnitude, and the error grows with conversation length." },
    { stem: "Which of the three pressures from a growing history announces itself?",
      options: ["Cost, because the bill rises",
        "The context window, which is a cliff \u2014 it works and then it fails",
        "Quality, because answers visibly degrade",
        "Latency, because requests become slow"],
      answer: 1,
      why: "Cost rises from the first turn with no threshold, and quality degrades gradually in the middle of a long context with nothing reporting it. Only the window produces an error, and it arrives on the longest and most valuable conversations. So the decision is forced by the pressure that is least informative about when it should have been made." },
    { stem: "Why does the context budget need an explicit output reserve?",
      options: ["Providers count output tokens against the input limit",
        "The window has to hold the answer too, and a budget without a reserve fails at generation time after the input is paid for",
        "Reserves prevent the model from truncating mid-sentence",
        "The reserve is used for tool descriptions"],
      answer: 1,
      why: "Filling the window with context leaves nothing for the response, so the request is accepted and then fails or truncates once generation starts \u2014 after every input token has been billed. The failure is also load-dependent, appearing only when the model wants to produce a long answer, which correlates with the hardest questions." },
    { stem: "What is context engineering deciding, stated precisely?",
      options: ["How many tokens to send",
        "Which tokens the fixed available history consists of",
        "Whether to use a larger-window model",
        "How often to summarise"],
      answer: 1,
      why: "The available history is a fixed number of tokens once you subtract the output reserve, the system prompt, the tool descriptions and the question. Every strategy \u2014 windowing, summarising, compressing, retrieving \u2014 is a different answer to which tokens occupy that space. Framing it as 'how many' misses that the amount is already determined." }
  ] },
  interview: { title: "Interview practice", sub: "The context budget", questions: [
    { level: "core", q: "How would you estimate the token cost of a conversational agent?",
      strong: "A strong answer prices the sum of the prefixes.",
      answer: [
        { t: "p", text: "Cumulatively, summing the input tokens across every request in a conversation rather than measuring one request \u2014 because each turn carries the whole history up to that point." },
        { t: "p", text: "I measured a forty-turn conversation with a final prompt of about 2,000 tokens having sent 45,000 in total, a ratio of 21.6. So pricing from the context size understates it by roughly an order of magnitude, and the error grows with conversation length \u2014 which means the longest and most engaged sessions are the most underestimated." },
        { t: "p", text: "I would also break one turn into components, because that tells me where the growth is. In mine the history was 86% of the prompt, with the system message and tool descriptions as a fixed per-turn cost. So the strategies worth having all target that 86%." },
        { t: "p", text: "And the same mechanism produces a storage cost: a checkpointer writes the whole state each superstep, so persistence is quadratic for the same reason. Which means one fix addresses both, and makes context management a cost project rather than only a context-window project." }
      ] },
    { level: "advanced", q: "When should you start managing context?",
      strong: "A strong answer separates the three pressures.",
      answer: [
        { t: "p", text: "Before the context window becomes an issue, because the window is the last of three pressures to arrive and the only one that tells you about itself." },
        { t: "p", text: "Cost rises quadratically from the first turn with no threshold \u2014 it is always happening. Latency rises gradually with input size. And the window is a cliff: it works, and then it fails, typically on the longest and most valuable conversations." },
        { t: "p", text: "So a team that waits for the context error has been paying the quadratic cost for however long it took to get there. The decision is forced by the window and should be made because of the cost." },
        { t: "p", text: "There is a third pressure in between that is worth naming because nothing reports it: models attend less reliably to the middle of a long context, so quality degrades before the window is reached. That one is invisible \u2014 no error, no metric, just slightly worse answers on the longest conversations." },
        { t: "p", text: "So my trigger would be a token threshold at 60 to 70 percent of the available history budget, which is enough room for the summarisation call itself and for one more turn arriving while it runs." }
      ] },
    { level: "core", q: "A team says their context window is fine, so they do not need context management. What do you say?",
      strong: "A strong answer separates the three pressures and names the invisible one.",
      answer: [
        { t: "p", text: "That the window is the last of three pressures to arrive and the only one that would have told them, so \u2018the window is fine\u2019 is consistent with two problems already happening." },
        { t: "p", text: "The first is cost, and it rises from the first turn with no threshold. I measured a forty-turn conversation having sent 45,000 tokens against a final prompt of 2,000 \u2014 so if they are pricing from the context size, their estimate is out by roughly an order of magnitude, and the error grows with conversation length." },
        { t: "p", text: "The second is quality, and it is the one nothing reports. Models attend less reliably to the middle of a long context, so answers degrade before the window is reached \u2014 no error, no metric, just slightly worse responses on the longest and most engaged conversations." },
        { t: "p", text: "There is also a storage version of the same cost if they are checkpointing, because every checkpoint holds the full history to that point. That one shows up as a bill rather than a failure too." },
        { t: "p", text: "So I would not argue about the window. I would ask them to measure cumulative input tokens per conversation, which takes an afternoon, and let the number decide \u2014 that is the pressure that is already costing them and the one a window check cannot see." }
      ] }
  ] }
});
