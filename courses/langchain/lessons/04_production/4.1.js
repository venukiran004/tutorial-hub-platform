EC.receiveLesson({
  id: "4.1",
  lede: "A callback handler is the only in-process way to see inside a run, and the first thing it teaches is that **event counts are not call counts**. A three-step chain fires `on_chain_start` three times, because the sequence is a chain and so is each non-model step \u2014 the event that corresponds to money is `on_llm_start`. Fifty lines of handler gives you every prompt as it was actually sent, the time each model call took, the text that came back, and tool and retriever activity. What it cannot give you is why the model chose what it chose, and nothing can.",
  objectives: [
    "Implement a handler that records calls, timings and sizes",
    "Distinguish chain events from model events and say which one is money",
    "List what a callback can and cannot observe",
    "Attach a handler per call rather than globally",
    "Recognise that 4.2, 4.4 and 4.8 are all built on this interface"
  ],
  prerequisites: ["1.6", "2.9"],
  blocks: [
    { t: "h2", n: "01", id: "handler", text: "A handler that records a run", sub: "Fifty lines, and it is the basis of everything else" },
    { t: "code", lang: "python", title: "Recording calls, sizes and timings",
      code: 'class Recorder(BaseCallbackHandler):\n    def on_llm_start(self, serialized, prompts, *, run_id=None, **kw):\n        self.llm_calls += 1\n        self.chars_in += sum(len(p) for p in prompts)\n        self.t0[run_id] = time.perf_counter()\n\n    def on_llm_end(self, response, *, run_id=None, **kw):\n        took = (time.perf_counter() - self.t0.pop(run_id)) * 1000\n        self.chars_out += len(response.generations[0][0].text)\n\nchain.invoke({"q": "explain"}, config={"callbacks": [rec]})',
      out: "llm calls : 1\nchars in  : 41\nchars out : 14",
      hl: [4, 7],
      caption: "`run_id` is what pairs a start with its end \u2014 concurrent calls interleave." },
    { t: "p", text: "The `prompts` argument is the resolved prompt as it was actually sent, which is the evidence 1.2 argued is the only thing that tells you what a chain really did. A handler is how you capture it in production." },
    { t: "h2", n: "02", id: "counts", text: "Event counts are not call counts", sub: "Three chain starts for a three-step chain" },

    {"kind": "tree", "title": "Event counts are not call counts", "caption": "A three-step chain fires `on_chain_start` **three** times, because the sequence is a chain and so is each non-model step. So an event count is a statement about the structure of your chain, not about how much work was done — which is the first thing a handler teaches.", "root": {"label": "RunnableSequence", "sub": "on_chain_start #1", "tone": "accent", "children": [{"label": "prompt", "sub": "on_chain_start #2", "tone": "good"}, {"label": "model", "sub": "on_chat_model_start", "tone": "violet"}, {"label": "parser", "sub": "on_chain_start #3", "tone": "good"}]}, "t": "diagram", "id": "dg-4_1-02-0"},




    { t: "callout", kind: "trap", title: "The sequence is a chain, and so is each step", body: [
      { t: "p", text: "1.6 found a two-step chain emitting three `on_chain_start` events. The same nesting applies here: a prompt-model-parser chain fires chain events for the sequence and for the non-model steps, and exactly one `on_llm_start`." },
      { t: "p", text: "So if you are counting model calls \u2014 for cost, for rate limiting, for an alert \u2014 count `on_llm_start`. Counting chain events gives you a number that tracks chain *structure* rather than provider usage, and it changes when someone refactors a chain into sub-chains without changing what it does." }
    ] },
    { t: "h2", n: "03", id: "visible", text: "What is visible", sub: "And the one thing that is not" },
    { t: "table", head: ["", "Visible", "Via"], rows: [
      ["every model call, with its exact prompt", "yes", "`on_llm_start`"],
      ["time spent in each model call", "yes", "the start/end pair"],
      ["the text the model returned", "yes", "`on_llm_end`"],
      ["tool calls and their results", "yes", "`on_tool_start` / `on_tool_end`"],
      ["retriever queries and hits", "yes", "`on_retriever_*`"],
      ["which chain step was slowest", "yes", "nesting plus timings"],
      ["provider-side token counts", "only if the provider reports them", "`usage_metadata`"],
      ["why the model chose what it chose", "**no**", "nothing can"]
    ] },
    { t: "p", text: "The token-count row is worth noting: a callback sees characters for free and tokens only if the provider returns them. 4.4 counts tokens locally for exactly this reason \u2014 you need the number *before* you send, and the provider's number arrives after." },
    { t: "h2", n: "04", id: "scope", text: "Per call, not globally", sub: "Which is 2.9's config rule again" },
    { t: "p", text: "Handlers go in `config={\"callbacks\": [...]}`, which means they are per-invocation. That is correct: two concurrent requests should be recorded separately, and a handler accumulating state across both is a bug that only appears under load." },
    { t: "callout", kind: "good", title: "A handler is request-scoped state", body: [
      { t: "p", text: "Build a fresh `Recorder` per request. A module-level handler shared between concurrent invocations interleaves their events, and the `run_id` pairing will still match starts to ends correctly while every aggregate \u2014 total calls, total characters \u2014 is the sum across requests that happened to overlap." },
      { t: "p", text: "That bug is invisible in testing, where requests are sequential, and produces inflated per-request metrics in production. Same shape as the session-id mistake in 3.6." }
    ] },
    { t: "exercise", kind: "build", title: "Build a recorder",
      difficulty: "core", minutes: 24,
      body: "Implement a callback handler that records every event in order, counts model calls, and measures the characters in and out plus the time of each model call. Run it on a three-step chain and print the event sequence. Explain why the chain-event count differs from the model-call count, and tabulate what a callback can and cannot see.",
      requirements: ["A handler implementing chain and llm start/end",
        "Pair starts with ends using run_id",
        "Report model calls, characters in, characters out",
        "Print the events in the order they fired",
        "Explain the chain-event count for a three-step chain",
        "Tabulate at least six things a callback can observe and one it cannot"],
      hint: "run_id is what makes the timing correct when calls interleave. Count on_llm_start, not on_chain_start.",
      solution: { lang: "python", title: "x0401.py \u2014 what a run did",
        code: 'from langchain_core.callbacks import BaseCallbackHandler\n\nclass Recorder(BaseCallbackHandler):\n    def __init__(self):\n        self.events, self.t0 = [], {}\n        self.llm_calls = self.chars_in = self.chars_out = 0\n\n    def on_chain_start(self, serialized, inputs, *, run_id=None, **kw):\n        self.events.append(("chain_start", (serialized or {}).get("name", "?")))\n\n    def on_chain_end(self, outputs, *, run_id=None, **kw):\n        self.events.append(("chain_end", ""))\n\n    def on_llm_start(self, serialized, prompts, *, run_id=None, **kw):\n        self.llm_calls += 1\n        self.chars_in += sum(len(p) for p in prompts)\n        self.t0[run_id] = time.perf_counter()\n        self.events.append(("llm_start", "%d chars" % sum(len(p) for p in prompts)))\n\n    def on_llm_end(self, response, *, run_id=None, **kw):\n        took = (time.perf_counter() - self.t0.pop(run_id, time.perf_counter())) * 1000\n        text = response.generations[0][0].text\n        self.chars_out += len(text)\n        self.events.append(("llm_end", "%d chars, %.0f ms" % (len(text), took)))\n\nrec = Recorder()\nchain.invoke({"q": "explain"}, config={"callbacks": [rec]})',
        out: "==============================================================================\nPART 1 -- a handler that records what a run did\n==============================================================================\n  result: 'a terse answer'\n\n  events in order:\n    chain_start  ?\n    chain_start  ChatPromptTemplate\n    chain_end    \n    llm_start    37 chars\n    llm_end      14 chars, 5 ms\n    chain_start  ?\n    chain_end    \n    chain_end    \n\n  llm calls : 1\n  chars in  : 37\n  chars out : 14\n\n==============================================================================\nPART 2 -- the nesting, and why counts surprise you\n==============================================================================\n  chain_start fired 3 times for a 3-step chain.\n\n  the sequence is a chain, and so is each step that is not a model.\n  so counting chain events is NOT counting model calls -- on_llm_start\n  is the one that corresponds to money.\n\n==============================================================================\nPART 3 -- what you can see, and what you cannot\n==============================================================================\n                                               visible  via\n  every model call, with its exact prompt      yes      on_llm_start\n  time spent in each model call                yes      start/end pair\n  the text the model returned                  yes      on_llm_end\n  tool calls and their results                 yes      on_tool_start/end\n  retriever queries and hits                   yes      on_retriever_*\n  which chain step was slowest                 yes      nesting plus timings\n  provider-side token counts                   only if the provider reports them usage_metadata\n  why the model chose what it chose            no       nothing can\n\n  a callback handler is the only in-process way to see inside a run.\n  everything in 4.2, 4.4 and 4.8 is built on this interface.",
        notes: [
          { t: "p", text: "**`on_chain_start` fired three times for a three-step chain**, because the sequence is a chain and so is each non-model step. The event corresponding to money is `on_llm_start`, which fired once." },
          { t: "p", text: "**So count model events, not chain events.** A chain-event count tracks chain structure rather than provider usage, and it changes when someone refactors a chain into named sub-chains without changing what it does." },
          { t: "p", text: "**The `prompts` argument is the resolved prompt as actually sent**, which 1.2 established is the only evidence of what a chain really did. A handler is how you capture that in production rather than in a test." },
          { t: "p", text: "**`run_id` pairs a start with its end**, which matters the moment calls interleave \u2014 without it, concurrent model calls would attribute timings to each other." },
          { t: "p", text: "**Characters are free; tokens are not.** A callback sees provider token counts only if the provider reports them, which is why 4.4 counts locally \u2014 you need the number before you send and the provider's arrives after." },
          { t: "p", text: "**Build a fresh handler per request.** A module-level handler shared across concurrent invocations still pairs run_ids correctly while every aggregate becomes the sum across overlapping requests \u2014 invisible in sequential testing, wrong in production." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the metric that doubled after a refactor", body: [
      { t: "p", text: "A team tracks \u201cchain invocations per request\u201d from a callback handler. After a refactor that extracts two named sub-chains for readability, the metric doubles. Nothing about the behaviour changed, no extra model call is made, and the bill is flat." },
      { t: "p", text: "The metric was counting `on_chain_start`, which tracks structure. 2.2 showed that naming a sub-chain is structurally free in terms of flattening, but each named piece is still a chain that emits events \u2014 so a readability change moved a number that was being read as usage." },
      { t: "p", text: "The fix is to count `on_llm_start` for anything cost-related and keep chain events for tracing only. The general principle is worth stating: **a metric derived from framework internals will track the framework's structure**, so it has to be chosen to correspond to the thing you actually care about \u2014 provider calls, tokens, tool executions \u2014 rather than to whatever is easiest to count." }
    ] }
  ],
  takeaways: [
    "**A callback handler is the only in-process way to see inside a run**, and 4.2, 4.4 and 4.8 are all built on it.",
    "**Event counts are not call counts**: a three-step chain fires three `on_chain_start` events and one `on_llm_start`.",
    "**Count `on_llm_start` for anything cost-related** \u2014 chain events track structure, not usage.",
    "**The `prompts` argument is the resolved prompt as sent**, which is the only evidence of what a chain did.",
    "**`run_id` pairs starts with ends**, which is what keeps timings correct when calls interleave.",
    "**Characters are free; provider token counts arrive only if reported**, and only after the call.",
    "**A handler can see prompts, timings, responses, tool calls and retriever hits.**",
    "**It cannot see why the model chose what it chose**, and nothing can.",
    "**Handlers go in config, so they are per-invocation** \u2014 2.9's rule again.",
    "**Build a fresh handler per request**; a shared one sums across overlapping requests and is invisible in sequential tests.",
    "**A metric derived from framework internals tracks the framework's structure**, so choose the event that corresponds to what you care about."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A prompt-model-parser chain fires `on_chain_start` three times. Why?",
      options: ["Retries are being recorded as separate starts",
        "The sequence is a chain and so is each non-model step",
        "The handler is registered three times",
        "Each message in the prompt starts its own chain"],
      answer: 1,
      why: "The same nesting 1.6 found: a RunnableSequence counts as a chain and so does each step within it that is not a model. Exactly one `on_llm_start` fires. That is why cost-related counting has to use the model event \u2014 a chain-event count tracks chain structure and will change if someone extracts a named sub-chain for readability without altering behaviour." },
    { stem: "Why does a callback handler need `run_id`?",
      options: ["To deduplicate events from retries",
        "To pair a start event with its matching end when calls interleave",
        "To identify which tenant made the request",
        "To correlate the handler with the trace backend"],
      answer: 1,
      why: "Timing a model call means subtracting a start from an end, and with concurrent calls the events arrive interleaved \u2014 so without pairing by run_id a handler would attribute one call's duration to another. It is the same identity problem as the tool_call_id in 3.2: an unambiguous key is what makes request and response matchable in a stream of events." },
    { stem: "What can a callback handler not tell you?",
      options: ["The exact prompt that was sent",
        "Why the model chose the output it did",
        "How long each model call took",
        "Which tools were called and with what arguments"],
      answer: 1,
      why: "Everything observable about the run is available \u2014 resolved prompts, timings, responses, tool calls and arguments, retriever queries and hits. The model's reasoning is not observable by any mechanism, which is worth being explicit about because it bounds what observability can do: you can see what happened and never why, which is why evaluation exists as a separate discipline." },
    { stem: "Why build a fresh handler per request rather than one at module level?",
      options: ["Handlers are not thread-safe and will raise",
        "A shared handler sums aggregates across concurrent requests, which is invisible in sequential testing",
        "Module-level handlers are ignored by LangChain",
        "Per-request handlers are faster"],
      answer: 1,
      why: "Pairing by run_id still works, so nothing crashes and no timing is wrong \u2014 but every aggregate (total calls, total characters) becomes the sum across whatever requests happened to overlap. Tests run sequentially so the bug never appears there, and production produces inflated per-request metrics. Same shape as putting a session id in the input rather than config." }
  ] },
  interview: { title: "Interview practice", sub: "Callbacks", questions: [
    { level: "core", q: "How do you instrument a LangChain application?",
      strong: "A strong answer starts with the callback interface and names the right event.",
      answer: [
        { t: "p", text: "A callback handler, passed per invocation in config. It is the only in-process way to see inside a run, and everything else \u2014 tracing, cost accounting, test assertions \u2014 is built on it." },
        { t: "p", text: "The thing I would get right first is which event to count. A three-step chain fires three on_chain_start events, because the sequence is a chain and so is each non-model step, and exactly one on_llm_start. So anything cost-related counts model events. Chain events track structure, and they will move if someone extracts a named sub-chain for readability." },
        { t: "p", text: "For timings, pair start and end by run_id. That matters as soon as calls interleave \u2014 without the pairing you would attribute one concurrent call's duration to another." },
        { t: "p", text: "And I would build a fresh handler per request rather than one at module level. A shared handler still pairs run_ids correctly, so nothing crashes, but every aggregate becomes the sum across overlapping requests. That is invisible in sequential tests and wrong in production." }
      ] },
    { level: "advanced", q: "A chain-invocation metric doubled after a pure refactor. Explain.",
      strong: "A strong answer identifies the metric as structural.",
      answer: [
        { t: "p", text: "The metric was counting chain events, which track the shape of the chain rather than what it did. Extracting two named sub-chains adds two more things that emit chain start and end, so the count moves while the behaviour, the model calls and the bill are all unchanged." },
        { t: "p", text: "The fix is to count on_llm_start for anything cost- or usage-related and keep chain events for tracing, where the nesting is the point." },
        { t: "p", text: "The general principle is the part I would emphasise: a metric derived from framework internals will track the framework's structure. So the event has to be chosen to correspond to the thing you actually care about \u2014 provider calls, tokens, tool executions \u2014 rather than to whatever was easiest to hook." },
        { t: "p", text: "It is also a good argument for alerting on things with external meaning. Provider calls and spend are checkable against a bill; chain invocations are checkable against nothing, so a drift in them is unfalsifiable from outside the system." }
      ] },
    { level: "core", q: "What are the limits of callback-based observability?",
      strong: "A strong answer separates observable from unobservable.",
      answer: [
        { t: "p", text: "You can see everything the run did and nothing about why. Resolved prompts, per-call timings, the returned text, tool calls with their arguments and results, retriever queries and hits, and which step was slowest from the nesting." },
        { t: "p", text: "What you cannot see is the model's reasoning. No mechanism provides that, so observability bounds out at what happened \u2014 which is exactly why evaluation is a separate discipline rather than a dashboard." },
        { t: "p", text: "There is one partial limit worth knowing: token counts. A callback gets characters for free, and provider-side token counts only if the provider reports them, and only after the call. If you need the number before sending \u2014 to enforce a budget or decide how many retrieved chunks fit \u2014 you have to count locally." },
        { t: "p", text: "And there is a failure the callback genuinely cannot catch, which I think is worth saying in the same breath: an agent that answers without calling a tool and claims it did. Nothing went wrong, so nothing is recorded as wrong. The only signal is the absence of a tool event, which means you have to be measuring calls per run rather than waiting for an error." }
      ] }
  ] }
});
