EC.receiveLesson({
  id: "2.1",
  lede: "The Runnable protocol is six methods and a handful of composition helpers, and the property that matters is not the list \u2014 it is that **a chain satisfies the same interface as its parts**. A `RunnableSequence` has `invoke`, `batch`, `stream`, `with_retry` and `configurable_fields` exactly as a model does, which is what lets a chain be a step inside another chain. The protocol is closed under composition. This lesson checks that claim on five different kinds of object, then implements `invoke` on a new class and watches batching, streaming and piping arrive without being written.",
  objectives: [
    "List the six protocol methods and the composition helpers on every Runnable",
    "Verify that a chain exposes the same interface as its steps",
    "Explain what closure under composition buys",
    "Implement a Runnable and confirm what the base class derives",
    "Distinguish .map() from .batch()"
  ],
  prerequisites: ["1.7"],
  blocks: [
    { t: "h2", n: "01", id: "six", text: "Six methods, on everything", sub: "Including the chain itself" },
    { t: "p", text: "The contract is small: three ways to call a Runnable, each with an async twin." },
    { t: "table", head: ["Method", "What it does", "Returns"], rows: [
      ["`invoke(input)`", "run once, synchronously", "one output"],
      ["`ainvoke(input)`", "run once, asynchronously", "an awaitable output"],
      ["`batch([i1, i2, ...])`", "run many inputs concurrently on a thread pool", "a list, in input order"],
      ["`abatch([...])`", "the async form of batch", "an awaitable list"],
      ["`stream(input)`", "yield output incrementally", "a generator of chunks"],
      ["`astream(input)`", "the async form of stream", "an async generator"]
    ] },
    { t: "code", lang: "text", title: "The same six, checked on five kinds of object",
      code: '                       invoke    batch     stream    ainvoke   abatch    astream\n  ChatPromptTemplate   yes       yes       yes       yes       yes       yes\n  FakeChatModel        yes       yes       yes       yes       yes       yes\n  StrOutputParser      yes       yes       yes       yes       yes       yes\n  RunnableLambda       yes       yes       yes       yes       yes       yes\n  a whole chain        yes       yes       yes       yes       yes       yes',
      caption: "The last row is the one that matters." },
    { t: "callout", kind: "insight", title: "Closed under composition", body: [
      { t: "p", text: "A chain is not a different kind of thing from its steps. `prompt | model | parser` produces an object with exactly the interface that `prompt` has, which means it can be a step in a larger chain, be given `.with_retry()`, be streamed, or be handed to a graph as a node." },
      { t: "p", text: "That closure is what makes composition scale. Without it you would have components and chains as separate concepts, with an adapter between them \u2014 and 1.1's counting argument would apply all over again at the next level up." }
    ] },
    { t: "h2", n: "02", id: "helpers", text: "The composition helpers", sub: "Defined once, inherited by everything" },
    { t: "table", head: ["Helper", "Purpose"], rows: [
      ["`r1 | r2`", "pipe \u2014 feed the output of one into the next, building a RunnableSequence"],
      ["`.with_config(...)`", "attach tags, metadata, callbacks or a run name"],
      ["`.with_retry(...)`", "retry on exceptions"],
      ["`.with_fallbacks([...])`", "try backups if this one raises"],
      ["`.bind(**kwargs)`", "pre-fill call arguments, e.g. `model.bind(stop=[\"\\n\"])`"],
      ["`.map()`", "apply this Runnable to each item of a list input"],
      ["`.configurable_fields(...)`", "expose a value for runtime override"]
    ] },
    { t: "p", text: "Each of these is defined once on the base class and works on a prompt, a model, a parser, a retriever or a whole chain. 2.6 uses two of them on a chain, 2.9 uses the last two, and none of those lessons needs a component-specific variant." },
    { t: "h2", n: "03", id: "implement", text: "Implement one method", sub: "And the rest arrives" },
    { t: "code", lang: "python", title: "A Runnable in four lines",
      code: 'class Shout(Runnable):\n    def invoke(self, input, config=None, **kw):\n        return str(input).upper() + "!"\n\ns = Shout()\nprint(s.invoke("hi"))\nprint(s.batch(["a", "b"]))\nprint([c for c in s.stream("hi")])\nprint((s | RunnableLambda(lambda t: t[::-1])).invoke("hi"))',
      out: 'invoke : \'HI!\'\nbatch  : [\'A!\', \'B!\']\nstream : [\'HI!\']\npiped  : !IH',
      caption: "`batch` and `stream` were never written." },
    { t: "p", text: "Streaming yields a single chunk, because the base class cannot invent incrementality that `invoke` does not have. Implementing a real `stream` is how you get genuine chunks \u2014 the scripted model in 1.2 does exactly that \u2014 but the method exists either way, so the component composes into a streaming chain without special-casing." },
    { t: "h2", n: "04", id: "map", text: "map is not batch", sub: "A common and quiet confusion" },
    { t: "code", lang: "python", title: "Two different things",
      code: 'upper = RunnableLambda(str.upper)\n\nupper.map().invoke(["a", "b", "c"])   # [\'A\', \'B\', \'C\']  -- one call, list input\nupper.batch(["a", "b", "c"])          # [\'A\', \'B\', \'C\']  -- three calls, concurrent',
      out: "upper.map().invoke(['a','b','c']) -> ['A', 'B', 'C']",
      caption: "Identical results, different things entirely." },
    { t: "p", text: "`.map()` returns a **Runnable whose input is a list**, so it composes into a chain: `retriever | summarise.map() | join` is a valid pipeline. `.batch()` is a **method you call**, not a step you compose. Reach for map when the list is flowing through the chain, and batch when you have many separate inputs to run." },
    { t: "exercise", kind: "analysis", title: "Check the protocol on five objects",
      difficulty: "core", minutes: 22,
      body: "Take a prompt template, a chat model, a parser, a lambda and a complete chain, and confirm which of the six protocol methods each exposes. Do the same for the composition helpers. Then implement a Runnable with only invoke and confirm what the base class derives. Finally show the difference between map and batch.",
      requirements: ["Check all six methods on at least five kinds of object, including a chain",
        "Check at least five composition helpers the same way",
        "Implement a Runnable subclass with only invoke",
        "Show that batch, stream and piping work on it without being written",
        "Demonstrate .map() and explain how it differs from .batch()"],
      hint: "The interesting row is the chain, not the components. Ask what it would cost if that row had gaps in it.",
      solution: { lang: "python", title: "x0201.py \u2014 the contract, checked",
        code: 'from langchain_core.runnables import Runnable, RunnableLambda\n\nthings = [("ChatPromptTemplate", ChatPromptTemplate.from_messages([("human", "{q}")])),\n          ("FakeChatModel", FakeChatModel(script=["x"])),\n          ("StrOutputParser", StrOutputParser()),\n          ("RunnableLambda", RunnableLambda(str.upper)),\n          ("a whole chain", prompt | model | parser)]\n\nMETHODS = ["invoke", "batch", "stream", "ainvoke", "abatch", "astream"]\nfor name, obj in things:\n    print(name, [m for m in METHODS if hasattr(obj, m)])\n\nclass Shout(Runnable):\n    def invoke(self, input, config=None, **kw):\n        return str(input).upper() + "!"',
        out: "==============================================================================\nPART 1 -- the six methods, on four different kinds of thing\n==============================================================================\n                         invoke    batch     stream    ainvoke   abatch    astream \n  ChatPromptTemplate     yes       yes       yes       yes       yes       yes     \n  FakeChatModel          yes       yes       yes       yes       yes       yes     \n  StrOutputParser        yes       yes       yes       yes       yes       yes     \n  RunnableLambda         yes       yes       yes       yes       yes       yes     \n  a whole chain          yes       yes       yes       yes       yes       yes     \n\n  the last row is the important one: a CHAIN satisfies the same interface\n  as its parts, which is what makes a chain usable as a step in another\n  chain. the protocol is closed under composition.\n\n==============================================================================\nPART 2 -- the composition helpers, also on everything\n==============================================================================\n  ChatPromptTemplate     with_config, with_retry, with_fallbacks, bind, map, configurable_fields\n  FakeChatModel          with_config, with_retry, with_fallbacks, bind, map, configurable_fields\n  StrOutputParser        with_config, with_retry, with_fallbacks, bind, map, configurable_fields\n  RunnableLambda         with_config, with_retry, with_fallbacks, bind, map\n  a whole chain          with_config, with_retry, with_fallbacks, bind, map, configurable_fields\n\n  every one of those is defined once on Runnable and inherited.\n\n==============================================================================\nPART 3 -- implement invoke, get the rest\n==============================================================================\n  invoke : \'HI!\'\n  batch  : [\'A!\', \'B!\']\n  stream : [\'HI!\']\n  piped  : !IH\n\n  batch and stream were never written. the base class derives them.\n\n==============================================================================\nPART 4 -- .map() runs a Runnable over a list\n==============================================================================\n  upper.map().invoke([\'a\',\'b\',\'c\']) -> [\'A\', \'B\', \'C\']\n\n  note this is NOT batch. map is a Runnable whose INPUT is a list;\n  batch is a method that takes many separate inputs. map composes into\n  a chain, batch is how you call one.",
        notes: [
          { t: "p", text: "**All five objects expose all six methods, including the chain.** That last row is the point: a RunnableSequence is interchangeable with its own steps, so a chain can be nested, retried, streamed or used as a graph node without an adapter." },
          { t: "p", text: "**The composition helpers are inherited the same way.** `with_retry`, `with_fallbacks`, `with_config`, `bind`, `map` and `configurable_fields` are defined once on `Runnable`, which is why 2.6 and 2.9 can apply them to whole chains rather than to models specifically." },
          { t: "p", text: "**Implementing `invoke` alone gave batch, stream and piping.** Streaming yields a single chunk, because the base class cannot manufacture incrementality that `invoke` does not have \u2014 but the method exists, so the component drops into a streaming chain without special-casing." },
          { t: "p", text: "**`.map()` and `.batch()` produce the same list and are different things.** map returns a Runnable whose input is a list, so it composes into a chain; batch is a method you call on one. The test is whether the list is flowing through the pipeline or sitting in your hand." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the step that cannot be retried", body: [
      { t: "p", text: "A pipeline calls a model, parses, then posts to an internal service through a hand-written function. The model call has `with_retry`; the post does not, because the function is not a Runnable \u2014 it is called inside a lambda." },
      { t: "p", text: "The fix is to make it one. Wrapping the function in `RunnableLambda` costs nothing and immediately makes `with_retry`, `with_fallbacks`, `with_config` and tracing available on it, because those are defined on the base class rather than on models. The protocol is not something you satisfy to be allowed into a chain; it is what makes the chain's features apply to you." },
      { t: "p", text: "That is the practical reading of closure under composition: anything outside the protocol is excluded from everything the protocol provides, and the cost of joining is usually one wrapper." }
    ] }
  ],
  takeaways: [
    "**Six methods**: invoke, batch, stream and the async form of each.",
    "**A chain exposes the same interface as its steps** \u2014 the protocol is closed under composition.",
    "**That closure is what lets a chain be nested, retried, streamed or used as a graph node** without an adapter.",
    "**The composition helpers are inherited too**: with_config, with_retry, with_fallbacks, bind, map, configurable_fields.",
    "**They are defined once on Runnable**, which is why they apply to a whole chain and not just to models.",
    "**Implementing `invoke` yields batch, stream and piping** without writing them.",
    "**Derived streaming emits one chunk**, because the base class cannot invent incrementality \u2014 implement `stream` for real chunks.",
    "**`.map()` is a Runnable whose input is a list**; `.batch()` is a method you call.",
    "**map composes into a chain, batch does not** \u2014 the test is whether the list is flowing through or in your hand.",
    "**Anything outside the protocol is excluded from everything the protocol provides**, and joining usually costs one `RunnableLambda`."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does it matter that a RunnableSequence exposes the same six methods as its steps?",
      options: ["It does not \u2014 chains are only ever invoked, never streamed or batched",
        "Because the protocol is closed under composition, so a chain can be nested, retried or used as a step",
        "Because it allows LangChain to validate type compatibility between steps",
        "Because batching a chain is faster than batching its components individually"],
      answer: 1,
      why: "A chain is not a different kind of object from its parts, so it can be piped into another chain, given with_retry, streamed, or handed to a graph as a node. Without that closure you would have components and chains as separate concepts with an adapter between them, and 1.1's counting argument would reappear one level up. Note it does not give type checking \u2014 1.7 showed LCEL has none." },
    { stem: "You implement only `invoke` on a Runnable subclass and call `.stream()`. What happens?",
      options: ["AttributeError \u2014 stream must be implemented separately",
        "It yields a single chunk containing the whole output",
        "It raises NotImplementedError at call time",
        "It yields one chunk per word, split automatically"],
      answer: 1,
      why: "The base class derives stream from invoke, so the method exists and works \u2014 it just cannot manufacture incrementality that invoke does not have, so there is exactly one chunk. That is enough for the component to drop into a streaming chain without special-casing, and implementing `stream` yourself is how you get genuine chunks, which is what the scripted chat model does." },
    { stem: "When would you use `.map()` rather than `.batch()`?",
      options: ["When the inputs arrive asynchronously",
        "When the list is flowing through a chain, because map is a composable Runnable and batch is a method call",
        "When you need results in input order, which batch does not guarantee",
        "They are aliases; map is the older name"],
      answer: 1,
      why: "`.map()` returns a Runnable whose input is a list, so `retriever | summarise.map() | join` is a valid pipeline step. `.batch()` is something you call on a Runnable with many separate inputs and cannot appear inside a pipe. Both return results in order; the distinction is whether the list is flowing through the chain or sitting in your hand." },
    { stem: "A hand-written function in the middle of a pipeline cannot be given `with_retry`. Why, and what is the fix?",
      options: ["Retries only work on model calls; wrap it in a try/except instead",
        "It is not a Runnable \u2014 wrapping it in RunnableLambda makes every base-class helper available",
        "Retries require the function to be idempotent, which must be declared",
        "It needs to be registered with the chain's config before retry applies"],
      answer: 1,
      why: "with_retry, with_fallbacks, with_config and tracing are defined on Runnable, so anything outside the protocol is excluded from all of them. RunnableLambda costs nothing and brings the function inside, at which point every helper applies. That is the practical reading of closure under composition: the protocol is not a hurdle to clear, it is what makes the framework's features apply to your code." }
  ] },
  interview: { title: "Interview practice", sub: "The Runnable protocol", questions: [
    { level: "core", q: "What is the Runnable interface?",
      strong: "A strong answer names the methods and then the closure property.",
      answer: [
        { t: "p", text: "Six methods: invoke, batch and stream, each with an async twin. Plus a set of composition helpers defined on the same base class \u2014 with_config, with_retry, with_fallbacks, bind, map, configurable_fields." },
        { t: "p", text: "The property I would actually lead with is that a chain satisfies the same interface as its parts. prompt-pipe-model-pipe-parser produces an object with exactly the interface prompt had, so it can be nested in a bigger chain, given a retry policy, streamed, or dropped into a graph as a node. The protocol is closed under composition." },
        { t: "p", text: "That closure is what makes it scale. Without it you would have components and chains as two different concepts with an adapter between them, and the whole combinatorial problem the interface was supposed to solve would come back one level up." },
        { t: "p", text: "The other thing worth knowing is how little it costs to join. Implement invoke and the base class derives batch, streaming and piping. The derived stream emits one chunk rather than many, because it cannot invent incrementality that invoke does not have, but the method is there so the component composes into a streaming chain without anyone special-casing it." }
      ] },
    { level: "core", q: "What is the difference between .map() and .batch()?",
      strong: "A strong answer is about composability, not performance.",
      answer: [
        { t: "p", text: "map returns a Runnable whose input is a list. batch is a method you call on a Runnable with many separate inputs. They produce the same results on the same data, which is why they get confused." },
        { t: "p", text: "The difference that matters is composability. Because map returns a Runnable, it can sit inside a pipe \u2014 retriever, then summarise-dot-map, then join, is a valid chain. batch cannot appear in a pipe at all; it is how you call the finished thing." },
        { t: "p", text: "So the test I use is where the list is. If the list is flowing through the pipeline, because an earlier step produced it, I want map. If I am holding a list of independent inputs and want to run the pipeline over all of them, I want batch." },
        { t: "p", text: "One practical note: batch takes max_concurrency in its config, which is how you stay inside a rate limit. map does not have an equivalent dial in the same place, so for a large list arriving mid-chain I would think about whether the fan-out is bounded before using it." }
      ] },
    { level: "advanced", q: "Why can with_retry be applied to a whole chain and not just a model?",
      strong: "A strong answer connects it to where the method is defined.",
      answer: [
        { t: "p", text: "Because with_retry is defined on Runnable, not on BaseChatModel, and a chain is a Runnable. So is a parser, a retriever, a lambda and a subgraph. The method does not know or care what it is wrapping \u2014 it needs something with invoke, and it returns something with invoke." },
        { t: "p", text: "That is the same reason I can add a Retry class to a twenty-line hand-written protocol and have it compose with components written before it. The wrapper consumes the interface and satisfies it." },
        { t: "p", text: "It also means the retry granularity is a design decision rather than a constraint. Wrapping the model retries just the model call; wrapping the whole chain re-runs the prompt formatting and the parsing too, which is usually wasteful and occasionally what you want \u2014 if the parse is what failed, retrying only the model gets you the same text again." },
        { t: "p", text: "The thing I would flag is that the composition order has real consequences. Putting a retry inside a fallback and a fallback inside a retry read almost identically and behave very differently, which is specific enough that I would want it measured rather than reasoned about." }
      ] }
  ] }
});
