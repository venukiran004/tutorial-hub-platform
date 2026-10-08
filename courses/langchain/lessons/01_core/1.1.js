EC.receiveLesson({
  id: "1.1",

  lede: "LangChain is not a library of language-model features. It is **one interface** \u2014 four methods that every prompt, model, parser, retriever and tool in the ecosystem agrees to implement \u2014 plus everything that becomes possible once they all agree. Counting the alternative makes the case better than any description: five kinds of component against four providers is **20 adapters** to write and keep working, and the same system behind one interface is **9 things**. This lesson builds that interface by hand in twenty lines, watches a new component type compose with everything already written without touching any of it, and then checks the hand-built version against the real `RunnableSequence`.",

  objectives: [
    "State the four methods the Runnable protocol requires and why uniformity is the point",
    "Count the adapters a system needs with and without a common interface",
    "Implement a composable protocol from scratch, including the pipe operator",
    "Explain why a new component type composes without changing the composition code",
    "Recognise the same shape in LangChain's own RunnableSequence"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", id: "problem", text: "The problem, counted",
      sub: "Why an interface and not a feature library" },

    { t: "p", text: "Every description of LangChain starts with what it contains \u2014 chat models, prompt templates, parsers, retrievers, agents. That list is the least interesting thing about it, because any of those is a weekend's work on its own. What is hard is making them compose, and composition is an interface problem." },

    { t: "p", text: "Consider the system without one. You have five kinds of component and four providers. A prompt builder has to emit whatever shape the provider wants. A parser has to read whatever shape it returns. A retriever has to embed with whichever embedding API you are on. Each pairing is a piece of code someone maintains." },

    { t: "viz", title: "Twenty adapters, or nine things",
      caption: "The quantity on the left is quadratic in what you add. The quantity on the right is linear.",
      svg: '<svg viewBox="0 0 760 310" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Adapter count with and without a common interface">' +
        '<text x="12" y="18" class="s-label">WITHOUT A COMMON INTERFACE \u2014 every pair is code</text>' +
        '<g>' +
        '<rect x="12" y="30" width="86" height="22" rx="3" fill="var(--violet)" opacity="0.2" stroke="var(--violet)"/>' +
        '<text x="55" y="45" class="s-sub" text-anchor="middle">prompt</text>' +
        '<rect x="12" y="56" width="86" height="22" rx="3" fill="var(--violet)" opacity="0.2" stroke="var(--violet)"/>' +
        '<text x="55" y="71" class="s-sub" text-anchor="middle">model</text>' +
        '<rect x="12" y="82" width="86" height="22" rx="3" fill="var(--violet)" opacity="0.2" stroke="var(--violet)"/>' +
        '<text x="55" y="97" class="s-sub" text-anchor="middle">parser</text>' +
        '<rect x="12" y="108" width="86" height="22" rx="3" fill="var(--violet)" opacity="0.2" stroke="var(--violet)"/>' +
        '<text x="55" y="123" class="s-sub" text-anchor="middle">retriever</text>' +
        '<rect x="12" y="134" width="86" height="22" rx="3" fill="var(--violet)" opacity="0.2" stroke="var(--violet)"/>' +
        '<text x="55" y="149" class="s-sub" text-anchor="middle">tool</text>' +
        '</g>' +
        '<g>' +
        '<rect x="252" y="30" width="86" height="22" rx="3" fill="var(--accent)" opacity="0.2" stroke="var(--accent)"/>' +
        '<text x="295" y="45" class="s-sub" text-anchor="middle">openai</text>' +
        '<rect x="252" y="56" width="86" height="22" rx="3" fill="var(--accent)" opacity="0.2" stroke="var(--accent)"/>' +
        '<text x="295" y="71" class="s-sub" text-anchor="middle">anthropic</text>' +
        '<rect x="252" y="82" width="86" height="22" rx="3" fill="var(--accent)" opacity="0.2" stroke="var(--accent)"/>' +
        '<text x="295" y="97" class="s-sub" text-anchor="middle">cohere</text>' +
        '<rect x="252" y="108" width="86" height="22" rx="3" fill="var(--accent)" opacity="0.2" stroke="var(--accent)"/>' +
        '<text x="295" y="123" class="s-sub" text-anchor="middle">local</text>' +
        '</g>' +
        '<g stroke="var(--crit)" opacity="0.30">' +
        '<line x1="98" y1="41" x2="252" y2="41"/><line x1="98" y1="41" x2="252" y2="67"/>' +
        '<line x1="98" y1="41" x2="252" y2="93"/><line x1="98" y1="41" x2="252" y2="119"/>' +
        '<line x1="98" y1="67" x2="252" y2="41"/><line x1="98" y1="67" x2="252" y2="67"/>' +
        '<line x1="98" y1="67" x2="252" y2="93"/><line x1="98" y1="67" x2="252" y2="119"/>' +
        '<line x1="98" y1="93" x2="252" y2="41"/><line x1="98" y1="93" x2="252" y2="67"/>' +
        '<line x1="98" y1="93" x2="252" y2="93"/><line x1="98" y1="93" x2="252" y2="119"/>' +
        '<line x1="98" y1="119" x2="252" y2="41"/><line x1="98" y1="119" x2="252" y2="67"/>' +
        '<line x1="98" y1="119" x2="252" y2="93"/><line x1="98" y1="119" x2="252" y2="119"/>' +
        '<line x1="98" y1="145" x2="252" y2="41"/><line x1="98" y1="145" x2="252" y2="67"/>' +
        '<line x1="98" y1="145" x2="252" y2="93"/><line x1="98" y1="145" x2="252" y2="119"/>' +
        '</g>' +
        '<text x="175" y="176" class="s-mono" text-anchor="middle" fill="var(--crit)">20 adapters</text>' +
        '<line x1="400" y1="20" x2="400" y2="190" class="s-stroke" opacity="0.4"/>' +
        '<text x="432" y="18" class="s-label">WITH ONE \u2014 each side meets the interface</text>' +
        '<rect x="432" y="30" width="86" height="126" rx="4" fill="var(--violet)" opacity="0.15" stroke="var(--violet)"/>' +
        '<text x="475" y="98" class="s-sub" text-anchor="middle">5 steps</text>' +
        '<rect x="562" y="30" width="56" height="126" rx="4" fill="var(--good)" opacity="0.22" stroke="var(--good)"/>' +
        '<text x="590" y="88" class="s-sub" text-anchor="middle" transform="rotate(-90 590 93)">Runnable</text>' +
        '<rect x="662" y="30" width="86" height="126" rx="4" fill="var(--accent)" opacity="0.15" stroke="var(--accent)"/>' +
        '<text x="705" y="98" class="s-sub" text-anchor="middle">4 providers</text>' +
        '<line x1="518" y1="93" x2="558" y2="93" class="s-stroke"/>' +
        '<line x1="618" y1="93" x2="658" y2="93" class="s-stroke"/>' +
        '<text x="590" y="176" class="s-mono" text-anchor="middle" fill="var(--good)">9 things</text>' +
        '<text x="12" y="214" class="s-sub">add a provider: 5 new adapters on the left, 1 on the right.</text>' +
        '<text x="12" y="232" class="s-sub">add a component type: 4 new adapters on the left, 1 on the right.</text>' +
        '<text x="12" y="262" class="s-sub">the left grows as steps x providers. the right grows as steps + providers.</text>' +
        '<text x="12" y="280" class="s-sub">that difference is the entire argument for the Runnable protocol, and it is</text>' +
        '<text x="12" y="298" class="s-sub">also the whole of what you are buying when you take the dependency.</text>' +
        '</svg>' },

    { t: "callout", kind: "insight", title: "The interface is the product",
      body: [
        { t: "p", text: "It is worth being blunt about this because it changes how you evaluate the library. If you need one model, one prompt shape and one output format, the interface is overhead and you should not import it \u2014 1.8 makes that argument properly." },
        { t: "p", text: "If you need to swap a provider, run two in parallel, fall back from one to another, stream through a parser, or hand the whole thing to a graph that will retry parts of it, then every one of those is a thing you get *because* the pieces are uniform, and writing them yourself means rebuilding the uniformity first." }
      ] },

    { t: "h2", n: "02", id: "protocol", text: "The protocol, by hand",
      sub: "Twenty lines, and the pipe is six of them" },

    { t: "p", text: "The fastest way to understand what LangChain is doing is to write the part that matters. A protocol needs one method; composition needs one operator." },

    { t: "code", lang: "python", title: "A composable protocol from scratch",
      code: 'class Runnable:\n    """One method, and an operator that composes two of them."""\n    def invoke(self, x):\n        raise NotImplementedError\n    def __or__(self, other):\n        return Sequence(self, other)\n\nclass Sequence(Runnable):\n    def __init__(self, first, second):\n        self.first, self.second = first, second\n    def invoke(self, x):\n        return self.second.invoke(self.first.invoke(x))\n    def __repr__(self):\n        return "%r | %r" % (self.first, self.second)\n\nclass Lambda(Runnable):\n    def __init__(self, fn, name=None):\n        self.fn, self.name = fn, name or getattr(fn, "__name__", "fn")\n    def invoke(self, x):\n        return self.fn(x)\n    def __repr__(self):\n        return self.name\n\n# three components that know nothing about each other\nprompt = Lambda(lambda d: "Q: %s\\nA:" % d["q"], "prompt")\nmodel  = Lambda(lambda s: "  " + s.upper() + "  (scripted)", "model")\nparser = Lambda(lambda s: s.strip(), "parser")\n\nchain = prompt | model | parser\nprint(chain)\nprint(repr(chain.invoke({"q": "what is a runnable?"})))',
      out: 'prompt | model | parser\n\'Q: WHAT IS A RUNNABLE?\\nA:  (scripted)\'',
      hl: [5, 6, 11],
      caption: "`__or__` is the pipe. `Sequence.invoke` is the composition. Everything else is detail." },

    { t: "callout", kind: "mental", title: "Mental model: the pipe is an operator, not magic",
      body: [
        { t: "p", text: "`a | b` is `a.__or__(b)`, and in LangChain that returns a `RunnableSequence` holding `[a, b]`. The chain you write is a **data structure built at import time**, not a function that runs when you build it. That is why you can print it, inspect its steps, draw it, and attach configuration to it before any call happens." },
        { t: "p", text: "The practical consequence shows up the first time a chain fails: the error comes from a step inside a sequence, and knowing the sequence is an object with a `.steps` list is what makes the traceback readable." }
      ] },

    { t: "h2", n: "03", id: "payoff", text: "What uniformity buys",
      sub: "A new component type that composes with code written before it" },

    { t: "p", text: "Here is the test that shows whether an interface is doing real work. Add a component type the original author never anticipated \u2014 a retry wrapper \u2014 and see how much existing code has to change." },

    { t: "code", lang: "python", title: "Adding a retry wrapper",
      code: 'class Retry(Runnable):\n    def __init__(self, inner, times=2):\n        self.inner, self.times = inner, times\n    def invoke(self, x):\n        last = None\n        for i in range(self.times):\n            try:\n                return self.inner.invoke(x)\n            except Exception as e:\n                last = e\n        raise last\n    def __repr__(self):\n        return "Retry(%r)" % self.inner\n\nflaky_state = {"n": 0}\ndef flaky(s):\n    flaky_state["n"] += 1\n    if flaky_state["n"] < 2:\n        raise RuntimeError("provider 503")\n    return s + " [ok on attempt %d]" % flaky_state["n"]\n\nchain2 = prompt | Retry(Lambda(flaky, "flaky")) | parser\nprint(chain2)\nprint(repr(chain2.invoke({"q": "resilient?"})))',
      out: 'prompt | Retry(flaky) | parser\n\'Q: resilient?\\nA: [ok on attempt 2]\'',
      caption: "Zero changes to Runnable, Sequence, Lambda or any existing component." },

    { t: "p", text: "`Retry` wraps anything and is wrapped by anything, because the only thing it needs to know about its neighbours is that they have `invoke`. That is the whole payoff, and it is why LangChain can ship `with_retry`, `with_fallbacks`, `with_config` and a dozen others as methods on the base class \u2014 each one is a wrapper that satisfies the same interface it consumes." },

    { t: "callout", kind: "good", title: "This is why `with_retry` exists at all",
      body: [
        { t: "p", text: "In a library without a uniform interface, retry logic has to be written once per component type, because retrying a model call and retrying a retriever call would be different code touching different objects." },
        { t: "p", text: "In this one, `with_retry()` is defined once on `Runnable` and works on a model, a parser, a retriever, a tool, a whole chain, or a chain of chains. 2.6 uses it on several of those; it is the same method every time." }
      ] },

    { t: "h2", n: "04", id: "real", text: "The same shape, in the library",
      sub: "What the real protocol adds to the hand-built one" },

    { t: "code", lang: "python", title: "The hand-built chain, rebuilt with LangChain",
      code: 'from langchain_core.prompts import ChatPromptTemplate\nfrom langchain_core.output_parsers import StrOutputParser\nfrom fake import FakeChatModel        # the scripted model this course uses\n\nreal = (ChatPromptTemplate.from_messages([("human", "Q: {q}\\nA:")])\n        | FakeChatModel(script=["A runnable is anything with invoke."])\n        | StrOutputParser())\n\nprint(type(real).__name__)\nprint([type(s).__name__ for s in real.steps])\nprint(repr(real.invoke({"q": "what is a runnable?"})))',
      out: 'RunnableSequence\n[\'ChatPromptTemplate\', \'FakeChatModel\', \'StrOutputParser\']\n\'A runnable is anything with invoke.\'',
      caption: "A sequence holding a list of steps \u2014 the same structure, with more methods on the contract." },

    { t: "table",
      head: ["Hand-built", "LangChain", "What it adds"],
      rows: [
        ["`invoke`", "`invoke`", "the same"],
        ["\u2014", "`batch`", "many inputs with bounded concurrency"],
        ["\u2014", "`stream`", "incremental output through the whole chain"],
        ["\u2014", "`ainvoke` / `abatch` / `astream`", "the async half of every method"],
        ["\u2014", "`with_config`", "callbacks, tags and runtime values attached per call"],
        ["`__or__`", "`__or__`", "the same, returning a RunnableSequence"]
      ] },

    { t: "p", text: "Six methods rather than one, but the idea is unchanged: anything that implements them composes with anything else that implements them. 2.1 goes through the contract method by method; everything between here and there is about what you can build on top of it." },

    { t: "callout", kind: "note", title: "About the model in these examples",
      body: [
        { t: "p", text: "`FakeChatModel` is a `BaseChatModel` subclass that returns a scripted list of responses and records every prompt it was given. It is used throughout this course so that every chain, graph and retriever here can actually be executed and its real output shown, with no API key." },
        { t: "p", text: "Nothing else is faked. The prompt templating, the parsing, the composition, the streaming, the state machine and the tool protocol are all the real library doing real work \u2014 only the token generation is scripted. 1.2 builds the model and says exactly where the boundary is." }
      ] },

    { t: "exercise", kind: "build", title: "Build the protocol, then break it",
      difficulty: "core", minutes: 24,
      body: "Count the adapters a five-component, four-provider system needs with and without a common interface. Then implement the protocol from scratch: a base class with one method and a pipe operator, a sequence, and a lambda wrapper. Compose three components. Then add a fourth component type the original code did not anticipate, and confirm how much existing code had to change. Finally, build the same chain with the real library and compare the structure.",
      requirements: [
        "Report the adapter count both ways, and the marginal cost of adding one provider and one component type",
        "Implement Runnable with invoke and __or__, plus Sequence and Lambda",
        "Compose at least three components and print the chain's repr as well as its result",
        "Add a Retry wrapper without modifying any existing class",
        "Rebuild the chain with ChatPromptTemplate, a chat model and StrOutputParser",
        "List which of the six protocol methods the real sequence exposes"
      ],
      hint: "`__or__` only needs to return something that is itself a Runnable \u2014 that is what makes chains of chains work. For the retry demonstration, a function with a counter that fails on its first call is enough.",
      solution: { lang: "python", title: "x0101.py \u2014 twenty adapters, or nine things",
        code: 'class Runnable:\n    def invoke(self, x):\n        raise NotImplementedError\n    def __or__(self, other):\n        return Sequence(self, other)\n\nclass Sequence(Runnable):\n    def __init__(self, first, second):\n        self.first, self.second = first, second\n    def invoke(self, x):\n        return self.second.invoke(self.first.invoke(x))\n    def __repr__(self):\n        return "%r | %r" % (self.first, self.second)\n\nclass Lambda(Runnable):\n    def __init__(self, fn, name=None):\n        self.fn, self.name = fn, name or getattr(fn, "__name__", "fn")\n    def invoke(self, x):\n        return self.fn(x)\n    def __repr__(self):\n        return self.name\n\nclass Retry(Runnable):\n    def __init__(self, inner, times=2):\n        self.inner, self.times = inner, times\n    def invoke(self, x):\n        last = None\n        for i in range(self.times):\n            try:\n                return self.inner.invoke(x)\n            except Exception as e:\n                last = e\n        raise last\n    def __repr__(self):\n        return "Retry(%r)" % self.inner\n\n# ... the adapter count, the three-step chain, the retry chain, and the\n# same chain rebuilt on ChatPromptTemplate | FakeChatModel | StrOutputParser',
        out: '==============================================================================\nPART 1 -- what you write when there is no common interface\n==============================================================================\nevery step has to know how to talk to every provider:\n\n                openai      anthropic   cohere      local     \n   prompt       adapter     adapter     adapter     adapter   \n   model        adapter     adapter     adapter     adapter   \n   parser       adapter     adapter     adapter     adapter   \n   retriever    adapter     adapter     adapter     adapter   \n   tool         adapter     adapter     adapter     adapter   \n\n   5 steps x 4 providers = 20 adapters to write and keep working\n   add one provider  -> 5 new adapters\n   add one step type -> 4 new adapters\n\nwith ONE interface in the middle, each side only has to satisfy the interface:\n   5 step implementations + 4 provider implementations = 9 things\n   add one provider  -> 1 new thing\n   add one step type -> 1 new thing\n\n   20 against 9 is the entire argument for the Runnable protocol.\n\n==============================================================================\nPART 2 -- the protocol, written from scratch in 20 lines\n==============================================================================\nchain      : prompt | model | parser\ninvoke     : \'Q: WHAT IS A RUNNABLE?\\nA:  (scripted)\'\n\nnote what did NOT happen: Sequence knows nothing about prompts, models or\nparsers. it only knows that both sides have .invoke(). that is why the pipe\nworks for any pair, including ones written after Sequence was.\n\nchain2     : prompt | Retry(flaky) | parser\ninvoke     : \'Q: resilient?\\nA: [ok on attempt 2]\'\n           -> Retry composed with everything else and required no changes\n              to Sequence, Lambda, or any component. that is the payoff.\n\n==============================================================================\nPART 3 -- the same chain, against the real library\n==============================================================================\ntype       : RunnableSequence\nsteps      : [\'ChatPromptTemplate\', \'FakeChatModel\', \'StrOutputParser\']\ninvoke     : \'A runnable is anything with invoke.\'\n\nsame shape: a RunnableSequence holding a list of steps, each satisfying the\nsame interface. the library adds batching, streaming, async, config and\ncallbacks to the contract -- but the composition idea is the 20 lines above.\n\nthe methods the real protocol requires:\n   invoke     yes\n   batch      yes\n   stream     yes\n   ainvoke    yes\n   abatch     yes\n   astream    yes\n\nTHE POINT: LangChain is not a library of LLM features. It is one interface,\nplus everything that becomes possible once every piece satisfies it. Judge\nthe dependency on whether you need that composition -- 1.8 takes the other side.',
        notes: [
          { t: "p", text: "**20 adapters against 9 things.** The left-hand quantity is the product of components and providers, the right-hand one is the sum. That is the entire economic argument for the protocol, and it is also exactly what you forfeit by not using it \u2014 which makes it the right number to have in mind when 1.8 argues the other side." },
          { t: "p", text: "**The marginal cost is the sharper version.** Adding one provider is 5 new adapters without the interface and 1 with it; adding one component type is 4 against 1. A system that is going to grow in either direction is choosing between linear and quadratic maintenance." },
          { t: "p", text: "**`Retry` composed with everything already written, and nothing already written changed.** That is the test of whether an interface is load-bearing rather than decorative, and it is why LangChain can offer `with_retry`, `with_fallbacks` and `with_config` as methods on the base class rather than as per-component features." },
          { t: "p", text: "**The real `RunnableSequence` has the same shape** \u2014 a list of steps, each satisfying the interface \u2014 with five more methods on the contract: batch, stream, and the async form of each. The composition idea is unchanged from the twenty lines; the additions are about how a step is allowed to be called." },
          { t: "p", text: "Writing it by hand changed how I read the library afterwards. `prompt | model | parser` stops looking like special syntax and starts looking like `__or__` returning an object, which is the correct reading and the one that makes an error inside a chain traceable." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: \u201cwhy are we importing a framework for three API calls?\u201d",
      body: [
        { t: "p", text: "A reviewer pushes back on adding LangChain to a service that makes three model calls in sequence. The objection is fair and deserves a real answer rather than a defensive one." },
        { t: "p", text: "The honest answer is a question: are any of these going to happen? A second provider for failover. Streaming the output to a UI. Running two of the three calls concurrently. Retrying the middle one. Swapping the model per customer. If none of them are, three SDK calls and a `try` block is genuinely the better code, and 1.8 says so in detail." },
        { t: "p", text: "If several of them are, then each one is something you would otherwise write against three different call sites, and you would be reinventing the uniformity before you could write the feature. The cost of the dependency is real \u2014 an abstraction to learn, a version to track, indirection in the traceback \u2014 and it should be paid for a reason that can be named, not because it is what examples use." }
      ] }
  ],

  takeaways: [
    "**LangChain's product is one interface**, not a collection of LLM features \u2014 every prompt, model, parser, retriever and tool implements the same contract.",
    "**Five component types against four providers is 20 adapters without an interface and 9 things with one**, and the gap is quadratic against linear.",
    "**Marginal cost is the sharper figure**: one new provider is 5 adapters against 1; one new component type is 4 against 1.",
    "**The protocol needs one method and one operator** \u2014 `invoke`, and `__or__` returning a composite that is itself a Runnable.",
    "**`a | b` is `a.__or__(b)`** and returns a data structure, so a chain can be printed, inspected and configured before it is ever called.",
    "**A new component type composes with code written before it**, because the composite only requires that both sides have `invoke`.",
    "**That is why `with_retry` and `with_fallbacks` are methods on the base class** rather than per-component features \u2014 they are wrappers satisfying the interface they consume.",
    "**The real contract has six methods**: invoke, batch, stream and the async form of each, plus `with_config` for per-call values.",
    "**`RunnableSequence` has the same shape as the hand-built one** \u2014 a list of steps \u2014 which is what makes an error inside a chain readable.",
    "**Take the dependency for a nameable reason**: failover, streaming, concurrency, retries or per-customer swaps. For three straight-line calls, the SDK is better code."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A system has 5 component types and 4 providers. What does a common interface change?",
        options: [
          "Nothing structural \u2014 it is a style preference that reduces boilerplate",
          "It turns 20 adapters into 9 implementations, and the growth from quadratic into linear",
          "It removes the need for provider-specific code entirely",
          "It improves runtime performance by avoiding adapter indirection"
        ],
        answer: 1,
        why: "Without an interface every component-provider pair is code someone maintains, so the count is the product: 20. With one, each side only has to satisfy the interface, so the count is the sum: 9. The marginal figures make it sharper \u2014 one new provider costs 5 adapters against 1, and one new component type costs 4 against 1. Provider-specific code still exists; it just exists once per provider instead of once per pair." },

      { stem: "What does `prompt | model | parser` actually evaluate to before anything is invoked?",
        options: [
          "A function that will execute the three steps when called",
          "A RunnableSequence object holding the steps as a list",
          "A generator that yields each step's output in turn",
          "Nothing \u2014 the pipe is evaluated lazily at invoke time"
        ],
        answer: 1,
        why: "`|` is `__or__`, and it returns a composite object holding its steps. The chain is a data structure built when the expression is evaluated, not a deferred function call \u2014 which is why you can print it, read `.steps`, draw it and attach configuration before any execution. It is also what makes a failure inside a chain legible, since the traceback points at a step within a known sequence." },

      { stem: "A `Retry` wrapper is added to the hand-built protocol. How much existing code must change?",
        options: [
          "Sequence must learn to handle retryable components",
          "None \u2014 it composes because the composite only requires that both sides have invoke",
          "Lambda must be modified to propagate exceptions correctly",
          "Every existing component needs a retry-aware variant"
        ],
        answer: 1,
        why: "`Retry` implements the interface and consumes the interface, so it wraps anything and is wrapped by anything without the composition machinery knowing it exists. That is the test of whether an interface is load-bearing, and it is the direct reason LangChain can ship `with_retry`, `with_fallbacks` and `with_config` once on the base class instead of once per component type." },

      { stem: "When is importing LangChain the wrong call for a service making three sequential model calls?",
        options: [
          "Always \u2014 three calls never justify a framework",
          "When none of failover, streaming, concurrency, retries or per-customer model swaps are needed",
          "When the team is unfamiliar with LCEL",
          "When latency matters, because the abstraction adds measurable overhead"
        ],
        answer: 1,
        why: "The dependency buys composition, so it is worth paying for when you need the things composition makes cheap \u2014 a second provider, streaming to a UI, concurrent calls, a retry on one step, a model that varies per customer. With none of those, three SDK calls and a `try` block is better code, because you are paying an abstraction, a version and traceback indirection for uniformity you never use." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "What LangChain is for",
    questions: [
      { level: "core",
        q: "What problem does LangChain actually solve?",
        strong: "A strong answer is about the interface, not the feature list.",
        answer: [
          { t: "p", text: "It is one interface, and everything that becomes possible once every component implements it. The feature list \u2014 prompt templates, parsers, retrievers, agents \u2014 is the least interesting part, because any one of those is a weekend's work. What is hard is making them compose." },
          { t: "p", text: "The counting argument is the clearest version. Five kinds of component against four providers, with no common interface, is twenty adapters: every component has to know how to talk to every provider. Behind one interface it is nine implementations, because each side only has to satisfy the contract. And the marginal cost is the part that actually bites \u2014 adding a provider is five new adapters or one, and adding a component type is four or one. You are choosing between quadratic and linear maintenance." },
          { t: "p", text: "The protocol itself is small. One method, `invoke`, and an operator that composes two things that have it. I would say that `a | b` is just `a.__or__(b)` returning a composite object \u2014 which is worth knowing because it means a chain is a data structure you can print and inspect, not a deferred function." },
          { t: "p", text: "The payoff is that a component type nobody anticipated composes with everything already written. That is why `with_retry` and `with_fallbacks` are methods on the base class rather than per-component features: each is a wrapper that satisfies the interface it consumes, so it works on a model, a parser, a retriever or a whole chain without caring which." }
        ] },

      { level: "core",
        q: "When would you not use it?",
        strong: "A strong answer names the conditions rather than hedging.",
        answer: [
          { t: "p", text: "When I do not need composition. The concrete test I would apply is a list: do I need a second provider for failover, streaming to a UI, two calls running concurrently, a retry on one step, or a model that varies per customer? If the answer to all of those is no, then three SDK calls and a try block is better code and I would write that." },
          { t: "p", text: "The costs are real and worth stating rather than waving away. An abstraction the team has to learn, a dependency whose release cadence you now track, and indirection in the traceback \u2014 a failure inside a chain is a failure inside a step inside a sequence, and that is genuinely harder to read than a stack trace through your own three functions." },
          { t: "p", text: "What I would push back on is the reverse mistake, which is more common: writing the three calls by hand and then adding failover, then streaming, then a retry. Each of those is cheap once the components are uniform and expensive when they are not, so by the third one you have rebuilt the uniformity badly and now maintain it yourself." },
          { t: "p", text: "So the decision is not about size. A three-call service that needs failover and streaming is a better fit than a twenty-call pipeline that is strictly sequential and will never change provider." }
        ] },

      { level: "advanced",
        q: "Why can LangChain offer retries and fallbacks as methods on every component?",
        strong: "A strong answer explains that the wrapper satisfies the interface it consumes.",
        answer: [
          { t: "p", text: "Because a retry wrapper takes something with `invoke` and is itself something with `invoke`. It consumes the interface and satisfies it, so it can sit anywhere in a chain, wrap anything, and be wrapped by anything, without the composition machinery knowing it exists." },
          { t: "p", text: "In a library without that uniformity, retry logic has to be written per component type \u2014 retrying a model call touches a different object with a different call shape than retrying a retriever, so you get `retry_model`, `retry_retriever` and so on, each maintained separately and each slightly different." },
          { t: "p", text: "I demonstrated this to myself by adding a `Retry` class to a hand-written twenty-line protocol. It composed with three components written before it and required zero changes to the base class, the sequence or any component. That is the test for whether an interface is load-bearing or decorative." },
          { t: "p", text: "The same reasoning explains the rest of the method set \u2014 `with_fallbacks`, `with_config`, `with_structured_output`, `bind` \u2014 and it is why they can be defined once on `Runnable`. The one caveat worth knowing is that the order you compose them in matters, because wrapping a retry in a fallback behaves differently from the reverse. That is specific enough that 4.6 spends a lesson on it." }
        ] }
    ]
  }
});
