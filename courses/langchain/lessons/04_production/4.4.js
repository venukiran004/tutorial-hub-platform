EC.receiveLesson({
  id: "4.4",
  lede: "You need the token count **before** you send, and the provider's number arrives after \u2014 which is why counting locally is not redundant with what a callback reports. The ratio that everyone uses as a rule of thumb is also wrong in the direction that matters: prose runs around four characters per token, and **JSON runs at 2.23**, because punctuation and rare strings cost a token each. So a four-times estimate undercounts structured data, which is exactly what tool results and retrieved chunks are. Counting turns a budget from a hope into a code path: with a 2,000-token input budget and these sizes, **32 chunks fit** \u2014 and you decide that rather than discovering it.",
  objectives: [
    "Count tokens locally and say why the provider's count is not a substitute",
    "Explain why chars-per-token varies with content",
    "Attribute input tokens to the parts of a chain that produced them",
    "Turn a token budget into a decision in code",
    "Recognise that retrieved context usually dominates"
  ],
  prerequisites: ["4.1"],
  blocks: [
    { t: "h2", n: "01", id: "before", text: "Counting before you send", sub: "Which is the only time it is useful" },
    { t: "code", lang: "python", title: "Local counting",
      code: 'import tiktoken\nenc = tiktoken.get_encoding("cl100k_base")\n\ndef count(s):\n    return len(enc.encode(s))',
      caption: "The encoding matters \u2014 a different model family tokenises differently." },
    { t: "p", text: "4.1 noted that a callback sees provider token counts only if the provider reports them, and only after the call. That is fine for accounting and useless for control: enforcing a budget, deciding how many chunks fit, or refusing an over-long request all require the number **before** the request is made." },
    { t: "h2", n: "02", id: "ratio", text: "Four characters per token is wrong where it matters", sub: "Measured on four kinds of content" },

    {"kind": "timeline", "title": "Four characters per token is wrong where it matters", "caption": "Prose runs around four characters per token; **JSON runs at 2.23**, because punctuation and rare strings cost a token each. So the rule of thumb undercounts **structured data by nearly half** — which is exactly what tool results and retrieved chunks are.", "span": 4.5, "tick": 1, "unit": "characters per token — higher is cheaper", "lanes": [{"label": "English prose", "bars": [[0, 4, "4.00 — the rule holds", "good"]]}, {"label": "the rule of thumb", "bars": [[0, 4, "assumed everywhere", "accent"]]}, {"label": "JSON", "bars": [[0, 2.23, "2.23 — undercounts", "crit"]]}], "t": "diagram", "id": "dg-4_4-02-0"},




    { t: "code", lang: "text", title: "Tokens against characters",
      code: 'a short question         7 tokens     27 chars  (3.86 chars/token)\na system prompt         23 tokens     97 chars  (4.22 chars/token)\na retrieved chunk       61 tokens    309 chars  (5.07 chars/token)\na JSON tool result      31 tokens     69 chars  (2.23 chars/token)',
      caption: "Prose is around 4 to 5. JSON is 2.23." },
    { t: "callout", kind: "insight", title: "The rule of thumb undercounts the things you least want undercounted", body: [
      { t: "p", text: "Punctuation, braces, quotes and rare identifiers cost a token each, so structured data is far denser in tokens than prose. A four-times estimate on the 69-character JSON result above predicts 17 tokens where the real count is 31 — an undercount of 45%." },
      { t: "p", text: "That matters because tool results and retrieved chunks are exactly where an agent's token budget goes \u2014 3.3 showed a verbose tool riding in every subsequent call. Estimating them with a prose ratio is optimistic precisely where being optimistic is expensive." }
    ] },
    { t: "h2", n: "03", id: "where", text: "Where the tokens go", sub: "And it is not the question" },
    { t: "table", head: ["Part", "Tokens", "Share of input"], rows: [
      ["system prompt", "23", "8%"],
      ["retrieved context (4 chunks)", "244", "89%"],
      ["the user's question", "7", "3%"],
      ["*the answer (output)*", "*16*", "\u2014"]
    ] },
    { t: "p", text: "Retrieved context is 89% of the input, which is the usual shape for RAG and the reason 7.3 spends a lesson on budgeting it. The user's question \u2014 the thing the whole system exists to answer \u2014 is 3%." },
    { t: "callout", kind: "mental", title: "Mental model: you are paying for context, not for questions", body: [
      { t: "p", text: "Optimising a prompt's wording is working on 8%. Reducing chunk count or chunk size is working on 89%. That ordering is stable across almost every RAG system, and it is the opposite of where effort usually goes, because prompt wording is visible and chunk sizing is a configuration value nobody revisits." },
      { t: "p", text: "The same inversion appears in 13.1 for agents, where accumulated transcript dominates and the current question is a rounding error." }
    ] },
    { t: "h2", n: "04", id: "budget", text: "A budget as a code path", sub: "Not a hope" },
    { t: "code", lang: "text", title: "How many chunks fit",
      code: 'with a 2000-token input budget:\n  fixed cost (system + question) : 30 tokens\n  per chunk                      : 61 tokens\n  chunks that fit                : 32',
      caption: "Count, decide, drop the rest \u2014 before sending rather than after failing." },
    { t: "p", text: "The point is not the number, it is that it is **computed**. A system that counts before sending can refuse an over-long request with a useful message, drop the lowest-scoring chunks deliberately, or summarise instead \u2014 and a system that does not count discovers the limit as a provider error, which 3.5 showed is unrecoverable mid-conversation." },
    { t: "exercise", kind: "build", title: "Count, attribute, budget",
      difficulty: "core", minutes: 26,
      body: "Count tokens locally for four kinds of content and report the characters-per-token ratio for each. Explain why they differ and which direction the common rule of thumb errs in. Then attribute the input tokens of a RAG request to its parts and report each part's share. Finally, compute how many retrieved chunks fit inside a fixed input budget.",
      requirements: ["Count tokens with a real tokeniser, stating which encoding",
        "Measure chars-per-token for prose, a system prompt, a retrieved chunk and a JSON result",
        "Explain why JSON is denser and which way a 4x rule errs",
        "Attribute a RAG request's input tokens to system prompt, context and question",
        "Report each part's share of the input",
        "Compute how many chunks fit in a fixed budget, given the fixed overhead"],
      hint: "The JSON ratio is the interesting one. Work out what a 4x estimate would have predicted and compare.",
      solution: { lang: "python", title: "x0404.py \u2014 2.23 characters per token",
        code: 'import tiktoken\nenc = tiktoken.get_encoding("cl100k_base")\ndef count(s): return len(enc.encode(s))\n\nSAMPLES = [("a short question", "How do I reset my password?"),\n           ("a system prompt", "You are a helpful support assistant. ..."),\n           ("a retrieved chunk", "Password resets are handled by ..." * 3),\n           ("a JSON tool result", json.dumps({"id": "A-1", "status": "shipped",\n                                              "items": [{"sku": "X", "qty": 2}]}))]\nfor label, text in SAMPLES:\n    print("%-22s %4d tokens %5d chars (%.2f chars/token)"\n          % (label, count(text), len(text), len(text) / float(count(text))))\n\nBUDGET_TOKENS = 2000\nfixed = count(system) + count(question)\nper_chunk = count(chunks[0])\nprint("chunks that fit:", (BUDGET_TOKENS - fixed) // per_chunk)',
        out: "==============================================================================\nPART 1 -- counting before you send\n==============================================================================\n  counting with tiktoken cl100k_base\n\n  a short question          7 tokens     27 chars  (3.86 chars/token)\n  a system prompt          23 tokens     97 chars  (4.22 chars/token)\n  a retrieved chunk        61 tokens    309 chars  (5.07 chars/token)\n  a JSON tool result       31 tokens     69 chars  (2.23 chars/token)\n\n  the chars-per-token ratio varies by content: prose is around 4, JSON\n  and identifiers are much lower, because punctuation and rare strings\n  cost a token each. a 4x rule of thumb UNDERCOUNTS structured data.\n\n==============================================================================\nPART 2 -- where the tokens go in a chain\n==============================================================================\n                                     tokens share of input\n  system prompt                          23       8%\n  retrieved context (4 chunks)          244      89%\n  the user's question                     7       3%\n  the answer (output)                    16         \n\n  retrieved context dominates, which is the usual shape for RAG and\n  the reason 7.3 spends a lesson on budgeting it.\n\n==============================================================================\nPART 3 -- a per-request budget as a code path\n==============================================================================\n  input 274 tokens, output 16 tokens\n  cost  $0.001062\n\n  with a 2000-token input budget, how many chunks fit?\n    fixed cost (system + question) : 30 tokens\n    per chunk                      : 61 tokens\n    chunks that fit                : 32\n\n  that is a budget as a CODE PATH rather than a hope: count, decide how\n  many chunks fit, and drop the rest before sending. 7.3 does this\n  properly, including what to do about the ones you dropped.",
        notes: [
          { t: "p", text: "**You need the count before you send.** A callback gets provider token counts only if reported and only after the call, which is fine for accounting and useless for control \u2014 budgets, chunk selection and refusing an over-long request all need the number first." },
          { t: "p", text: "**Chars-per-token varies by content: prose is 4 to 5, JSON is 2.23.** Punctuation, braces, quotes and rare identifiers each cost a token, so structured data is far denser." },
          { t: "p", text: "**So a four-times rule of thumb undercounts JSON by 45%** \u2014 and tool results and retrieved chunks are exactly where an agent's budget goes. The estimate is optimistic precisely where being optimistic is expensive." },
          { t: "p", text: "**Retrieved context was 89% of the input**, the system prompt 8% and the user's question 3%. That is the usual shape for RAG." },
          { t: "p", text: "**Which inverts where effort usually goes.** Polishing prompt wording is working on 8%; reducing chunk count or size is working on 89% \u2014 and the second is a configuration value nobody revisits while the first is visible in a pull request." },
          { t: "p", text: "**A budget computed is a decision; a budget assumed is a provider error.** Counting first lets you drop the lowest-scoring chunks deliberately, summarise, or refuse with a useful message. Not counting means discovering the limit as a failure, which 3.5 showed is unrecoverable mid-conversation." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the estimate that was 40% short", body: [
      { t: "p", text: "A team sizes an agent's context budget using a four-characters-per-token rule and sets a chunk count accordingly. In production, requests intermittently exceed the context window \u2014 specifically on conversations where tools returned a lot of JSON." },
      { t: "p", text: "The rule of thumb is calibrated for prose. JSON measured at 2.23 characters per token here, so the estimate was short by 45% on exactly the content that tool results consist of \u2014 and 3.3 showed that tool output rides in every subsequent call, so the shortfall compounds across the run." },
      { t: "p", text: "Two fixes. Count with the real tokeniser rather than estimating, which costs microseconds. And measure characters-per-token on *your* actual content rather than adopting a general ratio \u2014 a system whose tools return identifiers and structured records has a very different constant from one that summarises prose, and the number is worth knowing rather than assuming." }
    ] }
  ],
  takeaways: [
    "**You need the count before you send**; a callback reports provider tokens only if available and only afterwards.",
    "**Chars-per-token varies by content**: prose 4 to 5, a JSON tool result 2.23.",
    "**Punctuation, braces and rare identifiers each cost a token**, which makes structured data far denser.",
    "**So a four-times rule undercounts JSON by 45%** \u2014 and tool results are exactly where an agent's budget goes.",
    "**Retrieved context was 89% of a RAG request's input**, the system prompt 8%, the question 3%.",
    "**Which inverts where effort usually goes**: prompt wording is 8%, chunk sizing is 89%.",
    "**And chunk sizing is a config value nobody revisits** while prompt wording is visible in every review.",
    "**A budget computed is a decision; a budget assumed is a provider error.**",
    "**Counting first lets you drop chunks deliberately, summarise, or refuse with a useful message.**",
    "**Measure chars-per-token on your own content** rather than adopting a general ratio."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why count tokens locally when the provider reports usage?",
      options: ["Local counts are more accurate",
        "The provider's number arrives after the call, and control decisions need it before",
        "Provider counts exclude the system prompt",
        "To avoid the cost of the usage metadata field"],
      answer: 1,
      why: "Provider counts are fine for accounting and useless for control. Enforcing a budget, deciding how many retrieved chunks fit, or refusing an over-long request all require knowing the size before the request is made \u2014 otherwise you discover the limit as a provider error, which 3.5 showed is unrecoverable once a conversation has crossed it." },
    { stem: "A JSON tool result measured 2.23 characters per token against prose at around 5. Why?",
      options: ["JSON uses a different encoding",
        "Punctuation, braces, quotes and rare identifiers each cost a token, making structured data denser",
        "Tokenisers compress repeated keys",
        "The sample was too short to be representative"],
      answer: 1,
      why: "Tokenisers are trained on natural language, so common words compress well while braces, quotes, colons and unusual identifiers each take a token. The consequence is that a four-times rule of thumb undercounts structured data by 45% \u2014 and tool results and retrieved chunks are precisely where an agent's token budget goes, so the error lands where it is most expensive." },
    { stem: "In the measured RAG request, retrieved context was 89% of the input. What follows?",
      options: ["The retriever should return fewer, longer chunks",
        "Optimising prompt wording works on 8% while chunk count and size work on 89%",
        "The system prompt should be moved into the retrieved context",
        "The question should be expanded to carry more signal"],
      answer: 1,
      why: "The share tells you where the leverage is, and it inverts where effort usually goes: prompt wording is visible in every pull request while chunk sizing is a configuration value set once and never revisited. The same inversion appears in agents, where accumulated transcript dominates and the current question is a rounding error." },
    { stem: "What is the difference between a computed budget and an assumed one?",
      options: ["None, if the assumption is calibrated correctly",
        "A computed budget lets you drop chunks deliberately or refuse with a useful message; an assumed one surfaces as a provider error",
        "A computed budget is slower by a measurable margin",
        "An assumed budget is more robust to model changes"],
      answer: 1,
      why: "Counting before sending turns the limit into a decision you control \u2014 drop the lowest-scoring chunks, summarise, or return a clear message. Not counting means the limit arrives as a failure from the provider, after the request, with no opportunity to degrade gracefully. Counting with a real tokeniser costs microseconds, so the trade is entirely one-sided." }
  ] },
  interview: { title: "Interview practice", sub: "Tokens and cost", questions: [
    { level: "core", q: "How do you keep an LLM application's cost under control?",
      strong: "A strong answer counts before sending and knows where the tokens are.",
      answer: [
        { t: "p", text: "Count before sending, and know which part of the request the tokens are actually in." },
        { t: "p", text: "Counting locally matters because the provider's number arrives after the call. That is fine for accounting and useless for control \u2014 enforcing a budget or deciding how many retrieved chunks fit needs the number first, otherwise the limit arrives as a provider error with no chance to degrade." },
        { t: "p", text: "On where the tokens are: in a RAG request I measured, retrieved context was 89 per cent of the input, the system prompt 8 and the user's question 3. That inverts where effort usually goes, because prompt wording is visible in every pull request while chunk count and size are configuration values nobody revisits." },
        { t: "p", text: "One practical caution: the four-characters-per-token rule is calibrated for prose. JSON measured at 2.23 characters per token, so the rule undercounts structured data by 45 per cent \u2014 and tool results and retrieved chunks are exactly what that content is. I would measure the ratio on my own content rather than adopt a general one." }
      ] },
    { level: "advanced", q: "An agent intermittently exceeds the context window, mostly on tool-heavy conversations. Diagnose.",
      strong: "A strong answer connects the tokenisation ratio to transcript growth.",
      answer: [
        { t: "p", text: "My first guess would be a budget sized with a prose ratio applied to JSON. I measured a JSON tool result at 2.23 characters per token against prose at around five, so a four-times estimate is 45 per cent short on exactly the content tool results consist of." },
        { t: "p", text: "And it compounds, which is why it is intermittent rather than constant. Tool output goes into the transcript and the transcript is re-sent on every subsequent model call, so a run with several tool rounds pays the underestimate repeatedly. Conversations with few tool calls stay inside the budget and conversations with many do not \u2014 which looks random from the outside." },
        { t: "p", text: "The immediate fix is to count with the real tokeniser instead of estimating, which costs microseconds and removes the whole class of error." },
        { t: "p", text: "The second thing I would look at is what the tools return. 3.3 made the point that a verbose tool is expensive out of proportion to its usefulness, because its output rides in every later call. If a tool is returning a full API record where a summary would do, fixing the tool is better than enlarging the budget." }
      ] },
    { level: "core", q: "Where would you look first to reduce RAG costs?",
      strong: "A strong answer follows the 89% rather than the visible part.",
      answer: [
        { t: "p", text: "At the retrieved context, because in the request I measured it was 89 per cent of the input. The system prompt was 8 and the user's question 3." },
        { t: "p", text: "So the levers in order are: how many chunks you retrieve, how big each chunk is, and whether every retrieved chunk is actually earning its place. Reranking helps here too, because it lets you retrieve widely and then send fewer \u2014 you pay a reranker and save on the model, which is usually a good trade." },
        { t: "p", text: "What I would expect to find is that nobody has revisited the chunk count since it was set. It is a configuration value, it works, and there is no pull request where it looks wrong \u2014 whereas prompt wording gets edited constantly, and that is the 8 per cent." },
        { t: "p", text: "The thing I would be careful about is cutting chunks without measuring retrieval quality, because fewer chunks is cheaper and sometimes worse. That trade needs Recall@k on a labelled set rather than a judgement, which is module 6 \u2014 cost reduction and retrieval accuracy are the same dial turned in opposite directions." }
      ] }
  ] }
});
