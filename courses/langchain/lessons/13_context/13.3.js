EC.receiveLesson({
  id: "13.3",
  lede: "The two basic strategies on the same conversation, with the facts stated in the **first** human turn \u2014 an order id, an amount, a card, a date and a reason. A sliding window at every size that saves meaningful tokens kept **NONE of them**, because the facts are at the beginning and a window keeps the end. So the question the windowed conversation can no longer answer is *\u201cwhich order are we talking about\u201d* \u2014 the entire subject. Summarisation depends entirely on the prompt: a vague summary kept **1 of 5** facts, and a detailed one kept **all five for 26 more tokens**. Same strategy, different prompt, completely different outcome.",
  objectives: [
    "Implement a sliding window and measure what it destroys",
    "Implement summarisation and show the prompt deciding the outcome",
    "Compare the strategies on tokens and on facts kept",
    "Say what each strategy can no longer answer",
    "Give the combination that covers both blind spots"
  ],
  prerequisites: ["13.2", "7.8"],
  blocks: [
    { t: "h2", n: "01", id: "setup", text: "The conversation, and the facts in it", sub: "Stated early, on purpose" },

    { t: "code", lang: "text", title: "19 messages, 489 tokens",
      code: "order id     'ORD-4471'\nthe amount   '148.50'\nthe card     'ending 9921'\nthe date     '11 March'\nthe reason   'duplicate charge'",
      caption: "All five are in the **first** human turn \u2014 which is where real conversations put them." },
    { t: "h2", n: "02", id: "window", text: "Strategy 1: a sliding window", sub: "And it destroys everything" },
    { t: "code", lang: "text", title: "Three window sizes",
      code: "keep the system message + last 4  : 107 tokens, facts kept: NONE\nkeep the system message + last 6  : 156 tokens, facts kept: NONE\nkeep the system message + last 10 : 254 tokens, facts kept: NONE",
      caption: "At every size that saves meaningful tokens, **every fact is gone**." },
    { t: "callout", kind: "trap", title: "The window keeps the end; the facts are at the beginning", body: [
      { t: "p", text: "This is not a tuning problem. There is no window size that both saves tokens and keeps the first turn, because those are the same thing \u2014 and no amount of adjusting it finds the order id." },
      { t: "p", text: "So the question the windowed conversation can no longer answer is *\u201cwhich order are we talking about\u201d*, which is the **entire subject** of the conversation. The token count meanwhile looks excellent." }
    ] },
    { t: "h2", n: "03", id: "summary", text: "Strategy 2: summarisation", sub: "Where the prompt is the strategy" },
    { t: "code", lang: "text", title: "Two summaries of the same conversation",
      code: "a vague summary      80 tokens, facts kept: ['the reason']\na detailed summary   106 tokens, facts kept: ['order id', 'the amount',\n                                   'the card', 'the date', 'the reason']",
      caption: "**26 tokens** is the difference between one fact and five." },
    { t: "callout", kind: "insight", title: "The same strategy, two prompts", body: [
      { t: "p", text: "The vague summary is shorter and loses every identifier; the detailed one keeps all five facts for 26 more tokens. These are not two strategies \u2014 they are one strategy with two prompts." },
      { t: "p", text: "Which is 7.8's finding in a new place: what the summary omits is **permanently unrecoverable**, so the summarisation prompt decides the ceiling. And *\u201csummarise the conversation\u201d* gets you the vague one, because identifiers are not narratively interesting." }
    ] },
    { t: "h2", n: "04", id: "compare", text: "The comparison that matters", sub: "Tokens and answerability" },

    {"kind": "matrix", "title": "The measurement a token count cannot give you", "caption": "The same conversation, five facts stated in the first human turn. The sliding window reports a **68% token saving** and a **100% information loss**, and nothing in the token column distinguishes them.", "cols": ["tokens", "facts kept", "answers “which order?”"], "rows": ["the full conversation", "sliding window (last 6)", "a vague summary", "a detailed summary"], "cells": [["489", {"text": "5 of 5", "tone": "good"}, true], [{"text": "156", "tone": "good"}, {"text": "NONE", "tone": "crit"}, false], [{"text": "80", "tone": "good"}, {"text": "1 of 5", "tone": "crit"}, false], [{"text": "106", "tone": "good"}, {"text": "5 of 5", "tone": "good"}, true]], "t": "diagram", "id": "dg-13_3-04-0"},


    { t: "table", head: ["strategy", "tokens", "facts kept", "answers \u201cwhich order?\u201d"], rows: [
      ["full conversation", "489", "5", "yes"],
      ["sliding window (6)", "156", "**0**", "**NO**"],
      ["vague summary", "80", "1", "**NO**"],
      ["detailed summary", "106", "**5**", "**yes**"]
    ] },
    { t: "p", text: "The detailed summary is the **only** strategy that saves tokens and keeps the conversation answerable \u2014 and it is not a different strategy from the vague one. It is a different prompt." },
    { t: "h2", n: "05", id: "loses", text: "What each strategy can no longer answer", sub: "Stated plainly" },
    { t: "dl", items: [
      ["a **sliding window** loses the beginning", "Which is where the subject of the conversation usually is \u2014 the order id, the user's actual question, the constraint they stated once."],
      ["**summarisation** loses whatever the summariser judged unimportant", "And identifiers are exactly what a summariser drops: they are not narratively interesting, and they are the only thing you cannot reconstruct."]
    ] },
    { t: "callout", kind: "good", title: "So the practical shape is all three", body: [
      { t: "p", text: "Keep the **system message**, keep a **detailed summary** that is told to preserve identifiers, and keep the **last few turns verbatim**. Three mechanisms, each covering another's blind spot." },
      { t: "p", text: "The summary covers the window's loss of the beginning. The verbatim recent turns cover the summary's loss of detail in what is still being discussed. And the system message is fixed anyway." }
    ] },
    { t: "callout", kind: "mental", title: "And the measurement a token count cannot give you", body: [
      { t: "p", text: "List the facts the conversation contains, apply the strategy, and check which survive. Three lines of code, and the only thing that distinguishes a 70% token saving from a 70% information loss." },
      { t: "p", text: "The sliding window reported 156 tokens against 489 \u2014 a 68% saving and a complete loss. Nothing in the token metric indicates which it was." }
    ] },
    { t: "exercise", kind: "build", title: "Measure what each strategy destroys",
      difficulty: "core", minutes: 30,
      body: "Build a conversation containing several specific facts stated in the first turn. Apply a sliding window at several sizes and report both the token count and which facts survive. Then apply summarisation with a vague prompt and a detailed one, and report the same two measurements. Compare all the strategies on tokens, facts kept and whether the conversation remains answerable. Finally give the combination that covers both blind spots.",
      requirements: ["Build a conversation with specific facts stated early",
        "Apply a sliding window at several sizes and report tokens and facts kept",
        "Explain why no window size works",
        "Apply a vague and a detailed summary and report both measurements",
        "State the token difference between them and what it buys",
        "Compare all strategies on tokens and answerability",
        "Say what each strategy can no longer answer",
        "Give the combination and the measurement to use"],
      hint: "Put the identifiers in the first turn, which is where real conversations put them. Then check which survive each strategy.",
      solution: { lang: "python", title: "x1303.py \u2014 a 68% saving and a 100% loss",
        code: 'FACTS = [("order id", "ORD-4471"), ("the amount", "148.50"),\n         ("the card", "ending 9921"), ("the date", "11 March"),\n         ("the reason", "duplicate charge")]\n\ndef facts_present(text):\n    return [name for name, value in FACTS if value in text]\n\n# a sliding window keeps the END; the facts are at the beginning\nfor keep in (4, 6, 10):\n    window = msgs[:1] + msgs[-keep:]\n    print(ntok(window), facts_present(joined(window)))      # -> NONE\n\n# and summarisation depends entirely on the prompt\nfor summary in (vague, detailed):\n    kept = msgs[:1] + [SystemMessage(content="Summary so far: " + summary)] \\\n           + msgs[-2:]\n    print(ntok(kept), facts_present(joined(kept)))',
        out: "==============================================================================\nPART 1 -- the conversation, and the facts in it\n==============================================================================\n  19 messages, 448 tokens\n  the specific facts, all stated in the FIRST human turn:\n    order id     'ORD-4471'\n    the amount   '148.50'\n    the card     'ending 9921'\n    the date     '11 March'\n    the reason   'duplicate charge'\n\n  facts present in the full conversation: ['order id', 'the amount', 'the card', 'the date', 'the reason']\n==============================================================================\nPART 2 -- strategy 1 -- a sliding window\n==============================================================================\n  keep the system message + last 4  : 107 tokens, facts kept: NONE\n  keep the system message + last 6  : 156 tokens, facts kept: NONE\n  keep the system message + last 10 : 254 tokens, facts kept: NONE\n\n  at every window size that saves meaningful tokens, EVERY FACT IS\n  GONE. the facts were in the first human turn, and a sliding\n  window keeps the end.\n\n  so the question the windowed conversation can no longer answer is\n  'which order are we talking about' -- which is the entire subject\n  of the conversation.\n==============================================================================\nPART 3 -- strategy 2 -- summarisation\n==============================================================================\n  a summarisation call is a model call, so the summary here is\n  scripted (the course's execution model). these are what a\n  summariser would plausibly produce at two levels of detail.\n\n  a vague summary      80 tokens, facts kept: ['the reason']\n  a detailed summary   106 tokens, facts kept: ['order id', 'the amount', 'the card', 'the date', 'the reason']\n\n  the SAME strategy, two prompts, and completely different\n  outcomes. the vague summary is shorter and loses every\n  identifier; the detailed one keeps all five facts for 26 more\n  tokens.\n\n  which is 7.8's finding in a new place: what the summary omits is\n  permanently unrecoverable, so the summarisation PROMPT decides\n  the ceiling. 'summarise the conversation' gets you the vague one.\n==============================================================================\nPART 4 -- the comparison that matters\n==============================================================================\n  strategy                 tokens   facts kept   can answer\n                                                  'which order?'\n  full conversation        448      5            yes\n  sliding window (6)       156      0            NO\n  vague summary            80       1            NO\n  detailed summary         106      5            yes\n\n  the detailed summary is the only strategy that saves tokens AND\n  keeps the conversation answerable. and it is not a different\n  strategy from the vague one -- it is a different prompt.\n==============================================================================\nPART 5 -- so: what each strategy can no longer answer\n==============================================================================\n  SLIDING WINDOW loses the beginning. which is where the subject of\n  the conversation usually is -- the order id, the user's actual\n  question, the constraint they stated once.\n\n  SUMMARISATION loses whatever the summariser judged unimportant,\n  and identifiers are exactly what a summariser drops: they are not\n  narratively interesting, and they are the only thing you cannot\n  reconstruct.\n\n  so the practical shape is BOTH: keep the system message, keep a\n  detailed summary that is told to preserve identifiers, and keep\n  the last few turns verbatim. that is three mechanisms, and each\n  covers the other's blind spot.\n\n  and whichever you choose, the measurement is the one above: list\n  the facts the conversation contains, apply the strategy, and\n  check which survive. a token count alone cannot tell you that a\n  strategy destroyed the subject of the conversation.",
        notes: [
          { t: "p", text: "**A sliding window kept NONE of the five facts at any size** that saved meaningful tokens." },
          { t: "p", text: "**Which is not a tuning problem**: the window keeps the end and the facts are at the beginning, so saving tokens and keeping the first turn are the same trade-off." },
          { t: "p", text: "**So the windowed conversation cannot answer \u2018which order are we talking about\u2019** \u2014 the entire subject \u2014 while the token count looks excellent." },
          { t: "p", text: "**A vague summary kept 1 of 5 facts; a detailed one kept all five for 26 more tokens.**" },
          { t: "p", text: "**These are one strategy with two prompts**, not two strategies." },
          { t: "p", text: "**Which is 7.8's ceiling argument**: what the summary omits is permanently unrecoverable, so the prompt decides the ceiling \u2014 and \u2018summarise the conversation\u2019 gets you the vague one." },
          { t: "p", text: "**The detailed summary is the only strategy that saved tokens and stayed answerable.**" },
          { t: "p", text: "**So keep all three**: the system message, a detailed summary told to preserve identifiers, and the last few turns verbatim." },
          { t: "p", text: "**And measure the facts, not the tokens**: the window reported a 68% saving and a 100% information loss, and nothing in the token metric distinguishes them." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the assistant that forgot the order number", body: [
      { t: "p", text: "A support assistant uses a ten-message sliding window. Users report that after a long conversation it starts asking for the order number again \u2014 one they gave in their first message. The token metrics look healthy and the context never overflows." },
      { t: "p", text: "The window is working exactly as configured, and the order number was in the first message. Every identifier the user supplied once has been dropped, so the assistant is asking for information it was given and then discarded \u2014 which reads to the user as not listening." },
      { t: "p", text: "The minimum fix is to pin the first human message alongside the window, which costs the tokens of one message and preserves whatever the user stated up front. The better fix is a detailed summary told explicitly to preserve identifiers, amounts and dates, plus the recent turns verbatim \u2014 and the test that catches it in future is listing the facts a conversation contains and checking which survive the strategy, which a token count cannot tell you." }
    ] }
  ],
  takeaways: [
    "**A sliding window kept NONE of five facts** at any size that saved meaningful tokens.",
    "**Because the window keeps the end and the facts are at the beginning.**",
    "**So saving tokens and keeping the first turn are the same trade-off** \u2014 not a tuning problem.",
    "**The windowed conversation cannot answer \u2018which order\u2019** \u2014 the entire subject.",
    "**While the token count looks excellent** \u2014 a 68% saving and a 100% loss.",
    "**A vague summary kept 1 of 5 facts; a detailed one kept all five for 26 more tokens.**",
    "**These are one strategy with two prompts.**",
    "**What the summary omits is permanently unrecoverable** (7.8), so the prompt decides the ceiling.",
    "**And \u2018summarise the conversation\u2019 gets you the vague one** \u2014 identifiers are not narratively interesting.",
    "**The detailed summary was the only strategy that saved tokens and stayed answerable.**",
    "**A window loses the beginning**, which is where the subject usually is.",
    "**Summarisation loses whatever the summariser judged unimportant**, which is identifiers.",
    "**So keep all three**: the system message, a detailed summary, and the last few turns verbatim.",
    "**And measure the facts, not the tokens** \u2014 three lines, and the only check that distinguishes saving from loss."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A sliding window kept none of a conversation's five identifying facts at any size. Why is that not a tuning problem?",
      options: ["The window size was mis-measured",
        "The facts were in the first turn, so saving tokens and keeping the beginning are the same trade-off",
        "The system message displaced them",
        "The reducer dropped them"],
      answer: 1,
      why: "A window keeps the most recent messages, and real conversations state identifiers up front \u2014 the order number, the question, the constraint mentioned once. Any window small enough to save meaningful tokens excludes the first turn by construction, so there is no size that achieves both. The remedy is a different mechanism, not a different number." },
    { stem: "A vague summary kept 1 of 5 facts and a detailed one kept all 5, for 26 more tokens. What does that show?",
      options: ["Longer summaries are always better",
        "They are one strategy with two prompts \u2014 the summarisation prompt decides the ceiling",
        "Summarisation is unreliable and should be avoided",
        "The token saving was not worth it in either case"],
      answer: 1,
      why: "Nothing about the mechanism differed; only the instruction did. Since what a summary omits is permanently unrecoverable, the prompt sets an upper bound on everything downstream \u2014 the same relationship as a multimodal summary deciding what can ever be retrieved. And a generic instruction to summarise produces the vague version, because identifiers are not narratively interesting." },
    { stem: "Which combination covers both strategies' blind spots?",
      options: ["A larger sliding window plus a summary",
        "The system message, a detailed summary told to preserve identifiers, and the last few turns verbatim",
        "Summarisation alone, with a careful prompt",
        "Retrieval from history instead of either"],
      answer: 1,
      why: "The summary covers the window's loss of the beginning; the verbatim recent turns cover the summary's loss of detail about what is currently being discussed; the system message is a fixed cost regardless. Each of the three exists because the other two have a gap, which is why the practical answer is three mechanisms rather than a choice between two." },
    { stem: "What measurement distinguishes a 68% token saving from a 68% information loss?",
      options: ["The resulting context's token count",
        "Listing the facts the conversation contains, applying the strategy, and checking which survive",
        "Comparing summary length against original length",
        "The number of messages retained"],
      answer: 1,
      why: "Token metrics report only that the context shrank, and in the measured case a window reporting a healthy 156 tokens against 489 had destroyed every identifying fact. Enumerating the facts and checking survival is three lines of code and the only check that reveals a strategy has removed the subject of the conversation." }
  ] },
  interview: { title: "Interview practice", sub: "Window and summary", questions: [
    { level: "core", q: "Sliding window or summarisation \u2014 which would you use?",
      strong: "A strong answer uses both plus the recent turns, and measures facts.",
      answer: [
        { t: "p", text: "Both, plus the recent turns verbatim \u2014 because each one has a blind spot the others cover." },
        { t: "p", text: "A sliding window alone is the one I would avoid, and I measured why. I built a conversation with five identifying facts in the first human turn \u2014 an order number, an amount, a card, a date, a reason \u2014 and at every window size that saved meaningful tokens, every single fact was gone. The window keeps the end and the facts are at the beginning, so that is not a tuning problem." },
        { t: "p", text: "The result is an assistant that asks for the order number the user gave in their first message, which reads as not listening. And the token metric looked healthy throughout \u2014 a 68% saving and a 100% loss." },
        { t: "p", text: "So: the system message, a detailed summary told explicitly to preserve identifiers, amounts and dates, and the last two or three turns verbatim. The summary covers the beginning, the verbatim turns cover the current detail." }
      ] },
    { level: "advanced", q: "What decides whether a summarisation strategy works?",
      strong: "A strong answer says the prompt, with the measurement.",
      answer: [
        { t: "p", text: "The prompt, almost entirely \u2014 and that surprised me by how much." },
        { t: "p", text: "I summarised the same conversation two ways. A vague summary of the kind 'summarise the conversation' produces kept one of five facts and came to 80 tokens. A detailed summary told to preserve the specifics kept all five, for 106 \u2014 twenty-six more tokens for four more facts." },
        { t: "p", text: "Those are not two strategies, they are one strategy with two prompts. And what the summary omits is permanently unrecoverable, so the prompt sets a ceiling on everything downstream \u2014 the same relationship as a summary deciding what can ever be retrieved from an image." },
        { t: "p", text: "The specific failure is that identifiers are what a summariser drops. They are not narratively interesting, and they are the only part you cannot reconstruct. So the instruction has to name them: preserve all identifiers, amounts and dates." },
        { t: "p", text: "And the measurement is the thing I would insist on, because a token count cannot see any of this. List the facts the conversation contains, apply the strategy, check which survive. Three lines, and it is the only check that tells you whether you saved tokens or destroyed the subject." }
      ] },
    { level: "advanced", q: "How would you write a summarisation prompt for a support conversation?",
      strong: "A strong answer names the specific things a summariser drops.",
      answer: [
        { t: "p", text: "By naming explicitly the things a summariser drops, because the generic instruction loses exactly the content you cannot reconstruct." },
        { t: "p", text: "So: preserve all identifiers, amounts, dates and account references verbatim; preserve any constraint or preference the customer stated; preserve what has already been promised to them and by whom. Then summarise the rest freely." },
        { t: "p", text: "The reason for that ordering is what I measured. The same conversation summarised vaguely kept one of five facts at 80 tokens; summarised with a detail requirement it kept all five at 106. Twenty-six tokens for four facts \u2014 and those are not two strategies, they are one strategy with two prompts." },
        { t: "p", text: "Identifiers are what gets dropped because they are not narratively interesting. A summariser writing readable prose has no reason to carry an order number, and it is the only part of the conversation that cannot be inferred from the rest." },
        { t: "p", text: "I would also keep the last two or three turns verbatim alongside the summary, because the summary necessarily loses detail about what is currently being discussed, and that is what the model needs to continue the exchange." },
        { t: "p", text: "And I would test it the same way I measured it: take real conversations, list the facts each one contains, summarise, and check which survive. That is the only check that catches a prompt regression, because what the summary omits is permanently unrecoverable and the token count will look fine either way." }
      ] }
  ] }
});
