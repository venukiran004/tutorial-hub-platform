EC.receiveLesson({
  id: "2.7",
  lede: "A chain streams only if **every step after the model is a streaming transform**, and most steps are not. `StrOutputParser` passes chunks through, so `prompt | model | parser` yields five chunks for a five-word answer. Add one ordinary `RunnableLambda` at the end and you get **one chunk** \u2014 a lambda waits for its whole input, applies the function and emits once, collapsing the stream from that point on. `JsonOutputParser` does something different again: it emits **partial objects** rather than text, which is the partial parser from 1.4 doing its intended job here, and is either exactly what a progressive UI wants or a type error waiting to happen.",
  objectives: [
    "Explain what has to be true for a chain to stream end to end",
    "Identify the steps that collapse a stream and why",
    "Distinguish text chunks from the partial objects JsonOutputParser yields",
    "Predict the chunk count for a given chain shape",
    "Choose between stream and astream_events"
  ],
  prerequisites: ["2.6"],
  blocks: [
    { t: "h2", n: "01", id: "works", text: "When it works", sub: "The parser streams too" },
    { t: "code", lang: "python", title: "Five words, five chunks",
      code: 'chain = prompt | model | StrOutputParser()\nchunks = list(chain.stream({"q": "x"}))',
      out: "chunks : ['one ', 'two ', 'three ', 'four ', 'five', '']\ncount  : 6\njoined : 'one two three four five'",
      caption: "`StrOutputParser` forwards chunks rather than waiting for the whole message." },
    { t: "p", text: "The trailing empty chunk is langchain-core closing the stream, as 1.2 found. Code that accumulates is unaffected; code that counts chunks or indexes the last one has to expect it." },
    { t: "h2", n: "02", id: "collapse", text: "The step that collapses it", sub: "One lambda is enough" },
    { t: "code", lang: "python", title: "A plain function at the end",
      code: 'blocking = prompt | model | StrOutputParser() | RunnableLambda(lambda s: s.upper())\nlist(blocking.stream({"q": "x"}))',
      out: "with a plain RunnableLambda at the end: ['ONE TWO THREE']\ncount: 1",
      caption: "One chunk. The lambda had to see the whole string before it could uppercase it." },
    { t: "callout", kind: "insight", title: "A function is not a streaming transform", body: [
      { t: "p", text: "`RunnableLambda` receives a complete input, applies the function and returns once. It has no way to emit incrementally, and in general it could not \u2014 a function that reverses a string or parses a date genuinely cannot produce output before it has all its input." },
      { t: "p", text: "So the rule is positional: **anything non-streaming collapses the stream from that point on**. Steps before the model are irrelevant, because nothing is streaming yet. One lambda after it is enough to turn a token-by-token UI into a spinner." }
    ] },
    { t: "p", text: "`RunnableGenerator` is the escape hatch: wrap a generator function and you get a step that *can* emit incrementally, which is how you write a streaming transform when you need one \u2014 filtering tokens, or accumulating until a sentence boundary before forwarding." },
    { t: "h2", n: "03", id: "json", text: "JsonOutputParser streams objects", sub: "Not text, which is a feature and a trap" },
    { t: "code", lang: "text", title: "Partial objects, growing",
      code: "with JsonOutputParser: [{}, {'a': 1}, {'a': 1, 'b': 2}]\ncount: 3",
      caption: "Each chunk is a more complete dict, not a fragment of text." },
    { t: "p", text: "This is the partial parser from 1.4 \u2014 the one that silently repairs truncated JSON \u2014 doing the job it was actually built for. Streaming is the context where incomplete input is normal rather than an error, so parsing it progressively is exactly right." },
    { t: "callout", kind: "tradeoff", title: "Useful for a UI, wrong for a string handler", body: [
      { t: "p", text: "If you are filling fields in an interface as they arrive, a stream of increasingly complete objects is precisely what you want. If the code downstream expects text chunks to concatenate, it gets dicts and \u2014 because LCEL does not type-check (1.7) \u2014 may well stringify them into something plausible and wrong." },
      { t: "p", text: "So \u201cdoes my chain stream?\u201d is two questions: does it emit more than one chunk, and are the chunks the type the consumer expects." }
    ] },
    { t: "h2", n: "04", id: "predict", text: "Predicting the chunk count", sub: "Three chains, three answers" },
    { t: "table", head: ["Chain", "Chunks", "Why"], rows: [
      ["`prompt | model | StrOutputParser`", "6", "parser forwards chunks; one trailing empty"],
      ["`... | RunnableLambda(upper)`", "1", "the lambda waits for the whole input"],
      ["`prompt | model | JsonOutputParser`", "3", "partial objects, one per parseable state"]
    ] },
    { t: "h2", n: "05", id: "events", text: "stream against astream_events", sub: "Two different questions" },
    { t: "p", text: "`stream` gives you the **final output** incrementally. `astream_events` gives you **every internal step** \u2014 model tokens, tool calls, retriever hits, each sub-chain starting and ending \u2014 as a structured event stream." },
    { t: "p", text: "Use `stream` when you are rendering an answer. Use `astream_events` when you are rendering **progress**: showing that a retrieval happened, that a tool is running, that the agent is on its third step. Those are the things a user staring at an eight-second agent run actually wants, and `stream` cannot show them because they are not the final output." },
    { t: "exercise", kind: "analysis", title: "Find the step that stops the stream",
      difficulty: "core", minutes: 24,
      body: "Stream a prompt-model-parser chain and record the chunks. Then add a plain RunnableLambda at the end and stream again. Then swap the parser for JsonOutputParser and stream a third time. Report the chunk count and the chunk type for each, and state the rule that predicts them.",
      requirements: ["Stream a chain ending in StrOutputParser and show the chunks and their join",
        "Note the trailing empty chunk and who produces it",
        "Add a RunnableLambda and report the new chunk count",
        "Stream a chain ending in JsonOutputParser and show what the chunks are",
        "Tabulate the three chain shapes against their chunk counts",
        "State the positional rule for when a chain streams"],
      hint: "The lambda case is one chunk. Ask why it could not be otherwise for a general function.",
      solution: { lang: "python", title: "x0207.py \u2014 six, one, three",
        code: 'chain = prompt | model | StrOutputParser()\nprint(list(chain.stream({"q": "x"})))\n\nblocking = prompt | model | StrOutputParser() | RunnableLambda(lambda s: s.upper())\nprint(list(blocking.stream({"q": "x"})))\n\njchain = prompt | model2 | JsonOutputParser()\nprint(list(jchain.stream({"q": "x"})))',
        out: "==============================================================================\nPART 1 -- streaming through a chain\n==============================================================================\n  chunks : [\'one \', \'two \', \'three \', \'four \', \'five\', \'\']\n  count  : 6\n  joined : \'one two three four five\'\n\n  the parser streamed too -- StrOutputParser passes chunks through\n  rather than waiting for the whole message.\n\n==============================================================================\nPART 2 -- the step that breaks streaming\n==============================================================================\n  with JsonOutputParser: [{}, {\'a\': 1}, {\'a\': 1, \'b\': 2}]\n  count: 3\n\n  it emits PARTIAL OBJECTS, not text chunks -- the same partial parser\n  from 1.4, used for its intended purpose here. useful for a UI that\n  fills fields progressively, useless if you expected strings.\n\n  with a plain RunnableLambda at the end: [\'ONE TWO THREE\']\n  count: 1\n\n  ONE chunk. a RunnableLambda is not a streaming transform -- it waits\n  for the whole input, applies the function, and emits once. any\n  non-streaming step collapses the stream from that point on.\n\n==============================================================================\nPART 3 -- where the collapse happens matters\n==============================================================================\n  chain                                          chunks\n  prompt | model | StrOutputParser               4\n  ... | RunnableLambda(upper)                    1\n  ... | JsonOutputParser                         2\n\n  so \'does my chain stream?\' is really \'is every step after the model\n  a streaming transform?\'. one lambda is enough to stop it.",
        notes: [
          { t: "p", text: "**`StrOutputParser` forwards chunks**, so a five-word answer streams as five pieces plus the trailing empty chunk langchain-core appends to close the stream." },
          { t: "p", text: "**One `RunnableLambda` collapsed it to a single chunk.** A function receives a complete input and returns once \u2014 and in general it has to, since reversing a string or parsing a date cannot produce output before all the input exists. `RunnableGenerator` is the escape hatch when you genuinely need a streaming transform." },
          { t: "p", text: "**The rule is positional: anything non-streaming collapses the stream from that point on.** Steps before the model are irrelevant because nothing is streaming yet; one lambda after it turns a token-by-token UI into a spinner." },
          { t: "p", text: "**`JsonOutputParser` emits partial objects rather than text** \u2014 the same partial parser that silently repaired truncation in 1.4, here doing the job it was built for, since streaming is the context where incomplete input is normal." },
          { t: "p", text: "**That is a feature for a progressive UI and a trap for a string handler.** Because LCEL does not type-check between steps, a downstream consumer expecting text may stringify the dicts into something plausible and wrong \u2014 so \u2018does my chain stream?\u2019 is really two questions: more than one chunk, and chunks of the expected type." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: streaming that stopped working", body: [
      { t: "p", text: "A chat UI streamed tokens for months. After a release adding light post-processing \u2014 trimming whitespace and capitalising the first letter \u2014 the response arrives all at once. No errors, same latency to completion, and the diff is two lines." },
      { t: "p", text: "The post-processing is a `RunnableLambda` appended after the parser, so it waits for the whole string. Total latency is unchanged, which is why nobody noticed in testing: only the *perceived* latency changed, and only for a human watching it." },
      { t: "p", text: "Two fixes, and the choice depends on what the function does. If it can be expressed incrementally, use `RunnableGenerator` so it transforms chunks as they pass. If it genuinely needs the whole string \u2014 capitalising the first letter does not, trimming trailing whitespace does \u2014 move it out of the chain and apply it in the consumer, which already has the accumulated text. The general check worth adding to a review: **any step added after the model is a streaming decision**, whatever else it is." }
    ] }
  ],
  takeaways: [
    "**A chain streams only if every step after the model is a streaming transform.**",
    "**`StrOutputParser` forwards chunks** \u2014 a five-word answer gave five chunks plus a trailing empty one.",
    "**The trailing empty chunk is langchain-core closing the stream**; accumulating code is fine, chunk-counting code is not.",
    "**One `RunnableLambda` collapses the stream to a single chunk**, because a function needs its whole input before it returns.",
    "**The rule is positional**: anything non-streaming collapses the stream from that point on; steps before the model are irrelevant.",
    "**`RunnableGenerator` is the escape hatch** for writing a genuine streaming transform.",
    "**`JsonOutputParser` emits partial objects, not text** \u2014 the 1.4 partial parser doing the job it was built for.",
    "**That is right for a progressive UI and wrong for a string handler**, and LCEL will not type-check the difference.",
    "**So \u201cdoes it stream?\u201d is two questions**: more than one chunk, and chunks of the expected type.",
    "**`stream` gives the final output incrementally; `astream_events` gives every internal step.**",
    "**Use astream_events to show progress** \u2014 retrieval happened, a tool is running \u2014 which `stream` cannot express.",
    "**Any step added after the model is a streaming decision**, whatever else it is."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A chain is `prompt | model | StrOutputParser() | RunnableLambda(str.upper)`. How many chunks does it stream?",
      options: ["One per token, as before \u2014 the lambda is applied per chunk",
        "One \u2014 the lambda waits for its whole input and emits once",
        "Two \u2014 one for the text and one to close the stream",
        "None \u2014 adding a lambda disables streaming entirely"],
      answer: 1,
      why: "RunnableLambda receives a complete input, applies the function and returns once; it has no mechanism to emit incrementally, and for a general function it could not \u2014 reversing a string or parsing a date needs all the input first. So anything non-streaming collapses the stream from its position onward. RunnableGenerator is the escape hatch when a transform genuinely can work chunk by chunk." },
    { stem: "What does `JsonOutputParser` yield when streamed?",
      options: ["Text fragments of the JSON, to be concatenated",
        "Progressively more complete dicts \u2014 partial objects, not text",
        "One chunk containing the final parsed object",
        "Nothing until the JSON is valid, then one object"],
      answer: 1,
      why: "It uses the partial parser from 1.4 \u2014 the one that silently repairs truncated input \u2014 which in a streaming context is doing exactly the job it was designed for, since incomplete input is normal rather than an error. That is ideal for a UI filling fields progressively, and wrong for a consumer expecting text chunks, which LCEL will not catch because it does not type-check between steps." },
    { stem: "When would you use `astream_events` rather than `stream`?",
      options: ["When the chain is async, since stream is sync-only",
        "When you want to show progress \u2014 retrieval happened, a tool is running \u2014 rather than the final output",
        "When the output is structured rather than text",
        "When you need chunks delivered in guaranteed order"],
      answer: 1,
      why: "`stream` gives the final output incrementally and nothing else, so it cannot express that a retrieval occurred or that an agent is on its third tool call \u2014 those are not the final output. `astream_events` emits every internal step as a structured stream, which is what a user watching an eight-second agent run actually wants to see. Both have sync and async forms, so that is not the distinction." },
    { stem: "Streaming stopped after a release that added whitespace trimming. Why, and what is the fix?",
      options: ["The trimming removed the chunk delimiters; escape them instead",
        "It was added as a RunnableLambda after the parser, so it waits for the whole string \u2014 move it to the consumer or use RunnableGenerator",
        "Trimming is incompatible with streaming parsers; use a custom parser",
        "The release changed the model, which no longer supports streaming"],
      answer: 1,
      why: "A lambda appended after the parser collapses the stream, and total latency is unchanged \u2014 only perceived latency moves, which is why testing caught nothing. If the transform can work incrementally, RunnableGenerator keeps the stream alive; if it genuinely needs the whole string, apply it in the consumer, which already has the accumulated text. The reviewable rule is that any step added after the model is a streaming decision." }
  ] },
  interview: { title: "Interview practice", sub: "Streaming", questions: [
    { level: "core", q: "What has to be true for an LCEL chain to stream?",
      strong: "A strong answer gives the positional rule.",
      answer: [
        { t: "p", text: "Every step after the model has to be a streaming transform. Steps before the model do not matter, because nothing is streaming yet \u2014 the prompt has to be complete before the call is made anyway." },
        { t: "p", text: "StrOutputParser forwards chunks, so prompt-model-parser streams fine. A plain RunnableLambda does not: it receives a complete input, applies the function and returns once. I measured that \u2014 a five-word answer streamed as five chunks, and adding one lambda took it to a single chunk." },
        { t: "p", text: "And in general a lambda could not do otherwise. A function that reverses a string or parses a date genuinely cannot emit anything before it has all its input. RunnableGenerator is the escape hatch for the cases where a transform can work incrementally." },
        { t: "p", text: "One detail worth knowing: langchain-core appends a trailing empty chunk to close the stream. Code that accumulates is unaffected, code that counts chunks or looks at the last one is not." }
      ] },
    { level: "advanced", q: "Streaming silently stopped after a small release. Walk me through it.",
      strong: "A strong answer identifies perceived latency and the two fixes.",
      answer: [
        { t: "p", text: "I would look for a non-streaming step added after the model, which is almost always a RunnableLambda doing some light post-processing \u2014 trimming whitespace, capitalising a first letter, redacting something." },
        { t: "p", text: "The reason it gets through testing is that total latency is unchanged. The response still completes at the same moment; it just arrives all at once. Only perceived latency moved, and only for a human watching it, so no automated test catches it and no metric moves." },
        { t: "p", text: "There are two fixes and the choice depends on the function. If it can be expressed incrementally, RunnableGenerator wraps a generator and keeps the stream alive. If it genuinely needs the whole string \u2014 trimming trailing whitespace does, capitalising the first letter does not \u2014 then move it out of the chain and apply it in the consumer, which already has the accumulated text." },
        { t: "p", text: "The thing I would add to the review checklist is the general form: any step added after the model is a streaming decision, whatever else it is. That framing catches it at review time, which is the only place it is cheap to catch." }
      ] },
    { level: "core", q: "stream or astream_events for an agent UI?",
      strong: "A strong answer separates final output from progress.",
      answer: [
        { t: "p", text: "astream_events, for an agent specifically. stream gives you the final output incrementally, which is the right thing for a chat answer. It cannot tell you that a retrieval happened or that the agent is on its third tool call, because those are not the final output." },
        { t: "p", text: "For an agent that is the entire problem. A user watching an eight-second run wants to know something is happening and roughly what \u2014 searching, reading, calling an API. astream_events emits every internal step as a structured stream: model tokens, tool calls, retriever hits, sub-chains starting and ending." },
        { t: "p", text: "The cost is that you now have to decide which events to surface, because the raw stream includes a lot of nesting \u2014 1.6 showed a two-step chain emitting three chain-start events, and an agent emits far more. Showing all of it is worse than showing none." },
        { t: "p", text: "So in practice I would filter to a small set of user-meaningful events and map them to copy \u2014 tool start becomes 'checking your order', retriever start becomes 'searching the docs'. That is a product decision as much as a technical one, and it is why the raw event stream is the right API: it gives you everything and lets you choose." }
      ] }
  ] }
});
