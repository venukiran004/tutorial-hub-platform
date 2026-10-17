EC.receiveLesson({
  id: "3.5",
  lede: "A conversation buffer is the obvious default and the wrong one, and the reason is arithmetic rather than taste. You resend the whole history on every turn, so per-turn cost grows **linearly** and cumulative cost grows **quadratically** \u2014 measured here, a 12th turn costs about 11x the first, and a 100-turn conversation costs **$0.22785** against a 10-turn conversation's $0.00253, roughly 90x for 10x the length. Cost is only the soft limit. The hard one is the context window: an unbounded buffer eventually exceeds it and the request fails outright, **on your longest conversations, which belong to your most engaged users.** An unbounded buffer is not a default, it is a deferred outage.",
  objectives: [
    "Explain why buffer cost is quadratic in turn count",
    "Compute what a conversation costs at several lengths",
    "Identify which users hit the context limit first",
    "State why an unbounded buffer is a deferred outage",
    "Name the three ways out and what each costs"
  ],
  prerequisites: ["3.4"],
  blocks: [
    { t: "h2", n: "01", id: "growth", text: "The buffer, growing", sub: "Linear per turn, quadratic in total" },

    {"kind": "timeline", "title": "Why a buffer is the wrong default", "caption": "Arithmetic rather than taste. You resend the whole history every turn, so per-turn cost grows **linearly** and cumulative cost grows **quadratically** — a 12th turn costs about 11× the first, and ten times the length cost roughly **90×** the money.", "span": 12, "tick": 2, "unit": "cost of one turn, relative to the first", "lanes": [{"label": "turn 1", "bars": [[0, 1, "1x", "good"]]}, {"label": "turn 4", "bars": [[0, 3.7, "~4x", "good"]]}, {"label": "turn 8", "bars": [[0, 7.5, "~7x", "warn"]]}, {"label": "turn 12", "bars": [[0, 11, "~11x", "crit"]]}], "t": "diagram", "id": "dg-3_5-01-0"},











    { t: "code", lang: "text", title: "Twelve turns through an unchanged system",
      code: 'turn   messages   chars        cumulative   note\n1      2          68           68           <- first turn\n2      4          128          196\n3      6          188          384\n...\n12     24         728          4836         <- 12th turn costs ~11x the first',
      caption: "Each turn adds a fixed amount; each turn pays for everything before it." },
    { t: "p", text: "The per-turn prompt grows by a constant \u2014 one question and one answer \u2014 so the *n*th turn costs roughly *n* times the first. The cumulative cost is the sum of that series, which is quadratic. That is the whole shape, and it is the same mechanism as 3.3's agent loop and 1.3's `MessagesPlaceholder`." },
    { t: "h2", n: "02", id: "money", text: "The arithmetic that decides", sub: "Small until it is not" },

    {"kind": "trace", "title": "Cost is quadratic in turns, because each turn re-sends everything before it", "caption": "The last prompt grows linearly — 300 characters a turn — and **the cumulative total grows quadratically**, because every turn re-sends the whole history. Twenty turns is 12,760 characters of input; a hundred turns is **303,800, which is 24× the twenty-turn figure for 5× the conversation.** That is the shape to recognise, because it means a conversation-length problem looks mild in testing and severe in production, where the long conversations live.", "left": "turns", "codeW": 120, "vars": ["last prompt", "cumulative", "input cost"], "steps": [{"code": "5", "state": ["308", "940", "$0.00071"], "tone": "good"}, {"code": "10", "state": ["608", "3,380", "$0.00253"], "tone": "accent"}, {"code": "20", "state": ["1,208", "12,760", "$0.00957"], "tone": "warn"}, {"code": "50", "state": ["3,008", "76,900", "$0.05768"], "changed": [1], "tone": "crit"}, {"code": "100", "state": ["6,008", "303,800", "$0.22785"], "changed": [1, 2], "tone": "crit", "note": "24x for 5x the turns"}], "t": "diagram", "id": "dg-3_5-02-1"},


    { t: "table", head: ["Turns", "Last prompt (chars)", "Cumulative (chars)", "Input cost"], rows: [
      ["5", "308", "940", "$0.00071"],
      ["10", "608", "3,380", "$0.00253"],
      ["20", "1,208", "12,760", "$0.00957"],
      ["50", "3,008", "76,900", "$0.05768"],
      ["100", "6,008", "303,800", "$0.22785"]
    ] },
    { t: "callout", kind: "insight", title: "Ten times the length is ninety times the cost", body: [
      { t: "p", text: "From 10 turns to 100 is 10x the conversation and **90x the input spend**. That is the quadratic made concrete, and it is why a cost model built from \u201caverage conversation length\u201d is misleading \u2014 the average is dominated by short conversations and the spend is dominated by long ones." },
      { t: "p", text: "The number worth tracking is not mean turns per conversation. It is **mean input tokens per turn**, which exposes the growth directly and is the leading indicator for both the bill and the outage below." }
    ] },
    { t: "h2", n: "03", id: "hard", text: "The hard limit", sub: "Where the failure actually lands" },

    {"kind": "flow", "title": "Cost degrades gracefully; the context window does not", "caption": "**Cost gets expensive, someone notices, you fix it.** The context window does not work that way: once the buffer exceeds it the request **fails outright** — and it fails **on the longest conversations first**, which are by definition the ones belonging to users getting the most value from the product. So the failure is both sudden and adversely selected, which is a worse combination than either property alone.", "cols": 3, "nodes": [{"id": "c", "label": "Cost rises", "sub": "gradually, and visibly", "tone": "warn"}, {"id": "n", "label": "Someone notices and fixes it", "sub": "graceful degradation", "tone": "good"}, {"id": "w", "label": "The window is exceeded", "sub": "the request fails outright", "tone": "crit"}, {"id": "l", "label": "On the longest conversations first", "sub": "no warning, no gradient", "tone": "crit"}, {"id": "u", "label": "Your most engaged users", "sub": "by definition", "tone": "crit"}], "edges": [["c", "n"], ["w", "l"], ["l", "u"]], "t": "diagram", "id": "dg-3_5-03-2"},


    { t: "p", text: "Cost degrades gracefully: it gets expensive, someone notices, you fix it. The context window does not. Once the buffer exceeds it the request fails outright, and it fails **on the longest conversations first** \u2014 which are, by definition, the ones belonging to users who are getting the most value from the product." },
    { t: "callout", kind: "warn", title: "A deferred outage, not a default", body: [
      { t: "p", text: "The failure is adversarially distributed. It never happens in testing, because test conversations are short. It never happens to casual users. It happens to the power user demonstrating the product in a meeting, twenty turns in, and it is unrecoverable from their side \u2014 every subsequent message is also too long." },
      { t: "p", text: "That last part is the detail people miss: once a conversation exceeds the window, it stays broken. There is no retry that helps. The user has to start again and lose everything, which is why this is worth fixing before it happens rather than after." }
    ] },
    { t: "h2", n: "04", id: "out", text: "The three ways out", sub: "All of them lose something" },

    {"kind": "matrix", "title": "Three strategies, and none of them loses nothing", "caption": "**There is no strategy that loses nothing**, which makes this a product decision rather than a technical one — you are choosing which kind of forgetting your users will meet. Trimming loses **early facts**: a name, an id, a constraint stated once. Summarising loses **specifics**: numbers, names and exact wording become a paraphrase. Retrieval loses nothing in principle and adds a lookup that can surface the wrong turn. 3.6 implements the first, 13.3 the second and 13.4 the third.", "cols": ["Keeps", "Loses"], "rows": ["Trim (drop oldest)", "Summarise", "Retrieve from history"], "cells": [["recent turns, and the system prompt", {"text": "early facts - a name, an id, a constraint", "tone": "crit"}], ["the gist of everything", {"text": "specifics - numbers and exact wording", "tone": "crit"}], [{"text": "everything, on demand", "tone": "good"}, {"text": "nothing - but it can retrieve the wrong turn", "tone": "warn"}]], "t": "diagram", "id": "dg-3_5-04-3"},


    { t: "table", head: ["Strategy", "Keeps", "Loses"], rows: [
      ["trim (drop oldest)", "recent turns, and the system prompt", "early facts \u2014 a name, an id, a constraint stated once"],
      ["summarise", "the gist of everything", "specifics \u2014 numbers, names and exact wording become a paraphrase"],
      ["retrieve from history", "everything, on demand", "nothing, but adds a lookup and can retrieve the wrong turn"]
    ] },
    { t: "p", text: "There is no strategy that loses nothing, which makes this a product decision rather than a technical one. 3.6 implements trimming, 13.3 implements summarisation and measures what each one can no longer answer, and 13.4 covers retrieval over history." },
    { t: "exercise", kind: "analysis", title: "Price a conversation",
      difficulty: "core", minutes: 24,
      body: "Grow a conversation buffer over twelve turns and record the message count, the prompt size and the cumulative characters at each turn. Then price several conversation lengths in input tokens and dollars. Explain the shape of the growth, identify which users hit the context limit first, and list the three ways out with what each one loses.",
      requirements: ["Twelve turns, showing messages, per-turn chars and cumulative chars",
        "Report how much more the twelfth turn costs than the first",
        "Price at least five conversation lengths in dollars",
        "State the relationship between conversation length and cost",
        "Explain which users hit the context limit first and why that is the worst case",
        "List three mitigation strategies and what each loses"],
      hint: "Compare the 10-turn and 100-turn rows. The ratio is the interesting number, not the absolute amounts.",
      solution: { lang: "python", title: "x0305.py \u2014 linear per turn, quadratic in total",
        code: 'history = []\ncum = 0\nfor turn in range(1, 13):\n    msgs = ([SystemMessage(content="You are a helpful assistant.")] + history +\n            [HumanMessage(content="question %d" % turn)])\n    chars = sum(len(x.content) for x in msgs)\n    cum += chars\n    print(turn, len(msgs), chars, cum)\n    history += [HumanMessage(content="question %d" % turn),\n                AIMessage(content="a reasonably sized answer to question %d" % turn)]\n\nPRICE_IN, CHARS_PER_TOKEN = 3.0 / 1e6, 4.0\nfor n in (5, 10, 20, 50, 100):\n    cumc = sum(68 + (i - 1) * 60 for i in range(1, n + 1))\n    print(n, cumc, cumc / CHARS_PER_TOKEN * PRICE_IN)',
        out: "==============================================================================\nPART 1 -- the buffer, growing\n==============================================================================\n  turn   messages   chars        cumulative   note\n  1      2          38           38           <- first turn\n  2      4          87           125          \n  3      6          136          261          \n  4      8          185          446          \n  5      10         234          680          \n  6      12         283          963          \n  7      14         332          1295         \n  8      16         381          1676         \n  9      18         430          2106         \n  10     20         480          2586         \n  11     22         531          3117         \n  12     24         582          3699         <- 12th turn costs 8.6x the first\n\n  per-turn cost grows LINEARLY and cumulative cost grows QUADRATICALLY,\n  because you resend the whole buffer every turn.\n\n==============================================================================\nPART 2 -- the arithmetic that decides\n==============================================================================\n  at $3 per million input tokens and ~4 chars per token:\n\n  turns      last prompt    cumulative       cost\n  5          308            940              $0.00071\n  10         608            3380             $0.00253\n  20         1208           12760            $0.00957\n  50         3008           76900            $0.05768\n  100        6008           303800           $0.22785\n\n  the numbers are small until they are not, and the shape is the point:\n  doubling the conversation length roughly QUADRUPLES its cost.\n\n==============================================================================\nPART 3 -- and the window is finite\n==============================================================================\n  cost is the soft limit. the hard limit is the context window: once\n  the buffer exceeds it the request fails outright, and it fails on the\n  LONGEST conversations -- which are your most engaged users.\n\n  so an unbounded buffer is not a default, it is a deferred outage.\n  3.6 is the three ways out.",
        notes: [
          { t: "p", text: "**The twelfth turn costs about eleven times the first**, because the prompt grows by a constant each turn and every turn pays for everything before it. Linear per turn, quadratic cumulatively." },
          { t: "p", text: "**Ten times the conversation length is ninety times the input spend** \u2014 $0.00253 at ten turns against $0.22785 at a hundred. That is why a cost model built on mean conversation length misleads: the mean is dominated by short conversations and the spend by long ones." },
          { t: "p", text: "**Track mean input tokens per turn, not mean turns per conversation.** The first exposes the growth directly and is the leading indicator for both the bill and the outage; the second hides it." },
          { t: "p", text: "**Cost is the soft limit; the context window is the hard one.** Exceeding it fails the request outright, and it fails on the longest conversations \u2014 which belong to the users getting the most value from the product." },
          { t: "p", text: "**And it is unrecoverable from the user's side**: once a conversation exceeds the window every subsequent message is also too long, so there is no retry that helps and they have to start again. It never shows up in testing because test conversations are short." },
          { t: "p", text: "**All three ways out lose something** \u2014 trimming loses early facts, summarising loses specifics, retrieval loses nothing but adds a lookup that can return the wrong turn. That makes it a product decision, which is why 13.3 measures what each one can no longer answer." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the demo that failed at turn twenty", body: [
      { t: "p", text: "An assistant works perfectly in testing and fails during a customer demo with a context-length error. The engineer cannot reproduce it: their own conversations work fine, and the error message is about token count rather than anything in the input." },
      { t: "p", text: "The demo conversation was long. Test conversations are three or four turns and the demo ran to twenty, so the buffer crossed the window \u2014 and once it had, every further message failed too, which is why the demo could not be rescued by rephrasing." },
      { t: "p", text: "The immediate fix is trimming with the system prompt retained. The thing worth doing afterwards is adding mean input tokens per turn to the dashboard and alerting on the p99 rather than the mean, because the mean will look healthy for as long as most conversations are short \u2014 which is exactly the condition under which this bug hides." }
    ] }
  ],
  takeaways: [
    "**A buffer resends the whole history every turn**, so per-turn cost is linear and cumulative cost is quadratic.",
    "**The twelfth turn cost about 11x the first** in the measured run.",
    "**Ten times the length is ninety times the spend**: $0.00253 at 10 turns, $0.22785 at 100.",
    "**So a cost model built on mean conversation length misleads** \u2014 the mean is short conversations, the spend is long ones.",
    "**Track mean input tokens per turn**, which exposes the growth directly.",
    "**Cost is the soft limit; the context window is the hard one** \u2014 exceeding it fails the request outright.",
    "**It fails on the longest conversations first**, which belong to your most engaged users.",
    "**And it is unrecoverable**: every subsequent message is also too long, so the user must start again.",
    "**It never appears in testing**, because test conversations are short.",
    "**An unbounded buffer is not a default, it is a deferred outage.**",
    "**All three ways out lose something** \u2014 trimming loses early facts, summarising loses specifics, retrieval adds a lookup that can miss.",
    "**Which makes it a product decision**, not a technical one."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why is conversation cost quadratic rather than linear in turn count?",
      options: ["Because token prices rise with context length",
        "Because each turn resends the whole history, so total spend is the sum of a growing series",
        "Because the model re-reads earlier turns multiple times",
        "Because longer prompts have worse compression ratios"],
      answer: 1,
      why: "The prompt grows by a constant each turn \u2014 one question and one answer \u2014 so the nth turn costs roughly n times the first, and the cumulative total is the sum of that series. Measured: $0.00253 at ten turns against $0.22785 at a hundred, roughly ninety times the cost for ten times the length. It is the same mechanism as the agent loop in 3.3 and MessagesPlaceholder in 1.3." },
    { stem: "Which users hit the context-window limit first?",
      options: ["Users sending unusually long individual messages",
        "Users with the longest conversations \u2014 your most engaged ones",
        "Users on the cheapest model tier, which has a smaller window",
        "Users whose conversations contain the most tool output"],
      answer: 1,
      why: "The buffer grows with turn count, so the limit is reached by whoever has talked longest \u2014 by definition the people getting most value from the product. That makes the failure adversarially distributed: absent in testing because test conversations are short, absent for casual users, and present for the power user twenty turns into a demo." },
    { stem: "A conversation exceeds the context window. What does the user experience?",
      options: ["A single failed message that succeeds on retry",
        "Permanent failure \u2014 every subsequent message is also too long, so they must start again",
        "Automatic truncation with a warning",
        "Slower responses as the provider compresses the history"],
      answer: 1,
      why: "Nothing shrinks the buffer, so once it is over the limit it stays over \u2014 the next message makes it longer still. There is no retry that helps and no graceful degradation, which is why the whole conversation is lost. That irrecoverability is what makes an unbounded buffer a deferred outage rather than a tolerable default." },
    { stem: "Which mitigation loses nothing?",
      options: ["Trimming, since the system prompt is retained",
        "None of them \u2014 retrieval over history comes closest but adds a lookup that can return the wrong turn",
        "Summarisation, since the gist is preserved",
        "Increasing max_tokens on the model"],
      answer: 1,
      why: "Trimming drops early facts \u2014 a name, an order id, a constraint stated once. Summarising keeps the gist and loses specifics, since numbers and exact wording become a paraphrase. Retrieval keeps everything but introduces a lookup that can fetch the wrong turn and adds latency. Because every option loses something different, the choice is a product decision about which loss the application tolerates." }
  ] },
  interview: { title: "Interview practice", sub: "Memory and its limits", questions: [
    { level: "core", q: "What is wrong with keeping the full conversation history?",
      strong: "A strong answer gives the quadratic and then the hard limit.",
      answer: [
        { t: "p", text: "Two things, and the second is worse. The first is cost. You resend the whole history every turn, so the per-turn prompt grows linearly and the cumulative spend is the sum of that series \u2014 quadratic. I measured a twelfth turn costing about eleven times the first, and going from ten turns to a hundred took the input cost from about a quarter of a cent to about twenty-three cents. Ten times the length, ninety times the spend." },
        { t: "p", text: "The second is the context window, and that one does not degrade gracefully. Once the buffer exceeds it the request fails outright." },
        { t: "p", text: "What makes it serious is the distribution. It fails on the longest conversations, which belong to your most engaged users, and it never appears in testing because test conversations are three or four turns. So the first time you see it is a power user twenty turns in." },
        { t: "p", text: "And it is unrecoverable from their side. Once the conversation is over the limit, every further message is also over it \u2014 there is no retry that helps, so they lose the whole thread. That is why I would call an unbounded buffer a deferred outage rather than a reasonable default." }
      ] },
    { level: "advanced", q: "What would you measure to catch this before it happens?",
      strong: "A strong answer rejects the mean and picks the right metric.",
      answer: [
        { t: "p", text: "Mean input tokens per turn, and alert on a high percentile rather than the mean." },
        { t: "p", text: "The metric people reach for is mean conversation length, and it is close to useless here, because the mean is dominated by short conversations while both the cost and the outage are dominated by long ones. A dashboard showing a healthy average of four turns is exactly what you see right up until the first context-length failure." },
        { t: "p", text: "Input tokens per turn exposes the growth directly, because it rises as conversations lengthen rather than averaging it away. And the p99 is the number that matters, since that is where the window is actually being approached." },
        { t: "p", text: "I would also set the alert threshold well below the context limit \u2014 at something like sixty per cent \u2014 because the lead time matters. By the time requests are failing, the conversations that triggered it are already unrecoverable, and the fix you deploy does not retroactively save them." }
      ] },
    { level: "core", q: "How do you choose between trimming, summarising and retrieval?",
      strong: "A strong answer frames it as which loss is tolerable.",
      answer: [
        { t: "p", text: "By deciding which loss the application can tolerate, because none of them is free." },
        { t: "p", text: "Trimming drops the oldest turns, so it loses early facts \u2014 a name given in turn one, an order id, a constraint stated once and never repeated. That is fine for a conversation where each exchange is largely self-contained and bad for one where the user set up the context at the start." },
        { t: "p", text: "Summarising keeps the gist of everything and loses specifics: numbers, exact names and precise wording become a paraphrase. Good when the thread of the conversation matters more than any particular detail, bad when the details are the point." },
        { t: "p", text: "Retrieval over history keeps everything and fetches what is relevant, which loses nothing in principle. The costs are a lookup on every turn and the possibility of retrieving the wrong turn, which is a different and subtler failure \u2014 the model gets a confidently irrelevant piece of context rather than no context." },
        { t: "p", text: "So it is a product decision, and I would want it made with a measurement rather than a preference \u2014 take real conversations, apply each strategy, and check which questions the model can no longer answer." }
      ] }
  ] }
});
