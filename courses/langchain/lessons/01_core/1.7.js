EC.receiveLesson({
  id: "1.7",

  lede: "Writing your own component is both a useful skill and the clearest way to see what the protocol actually demands of an implementer, which is **one method, usually**. A Runnable needs `invoke`. A parser needs `parse`. A chat model needs `_generate`. In exchange each gets batching, streaming, async, retries, fallbacks and composition. This lesson writes three of them and pipes all three into one expression with library components \u2014 and then looks at what that chain produced, which is **wrong**. The last step expected a string, received a list, called `str()` on it and returned the first two words of a Python list literal. Nothing raised, because **LCEL does not type-check between steps**. That is the price of the uniformity 1.1 praised, and it is worth naming.",

  objectives: [
    "Choose between a function, a RunnableLambda and a Runnable subclass",
    "Implement a custom output parser with its own format instructions",
    "Compose custom and library components in a single expression",
    "Explain why a type mismatch between steps does not raise",
    "State what each base class requires and what it returns in exchange"
  ],

  prerequisites: ["1.6"],

  blocks: [

    { t: "h2", n: "01", id: "function", text: "Start with a function",
      sub: "You usually do not need a class" },

    { t: "p", text: "For a stateless transformation, a plain function is already enough. `RunnableLambda` wraps one explicitly, and the pipe will coerce a bare function for you." },

    { t: "code", lang: "python", title: "Three ways to put a function in a chain",
      code: 'def redact(text: str) -> str:\n    return re.sub(r"\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b", "[CARD]", text)\n\nstep = RunnableLambda(redact)\nstep.invoke("charge 4111 1111 1111 1111 today")\n\n# or let the pipe coerce it\nchain = RunnableLambda(lambda d: d["text"]) | redact\nprint(type(chain.steps[-1]).__name__)',
      out: '-> charge [CARD] today\n-> card [CARD] on file\ntype of the coerced step: RunnableLambda\nit is a full Runnable: [\'invoke\', \'batch\', \'stream\', \'ainvoke\']',
      caption: "A bare function on the right of a pipe becomes a RunnableLambda automatically." },

    { t: "p", text: "Reach for a subclass only when you need something a function cannot carry: configuration, validation, or a meaningful name in a trace. A `RunnableLambda` wrapping a lambda shows up in a span tree as `RunnableLambda`, which is unhelpful at three in the morning." },

    { t: "h2", n: "02", id: "subclass", text: "A Runnable subclass",
      sub: "One method, and the rest arrives" },

    { t: "code", lang: "python", title: "Configurable and named",
      code: 'class TruncateWords(Runnable):\n    """Keeps the first n words. Configurable, named, inspectable."""\n\n    def __init__(self, n: int = 5):\n        self.n = n\n\n    def invoke(self, input: str, config=None, **kw) -> str:\n        words = str(input).split()\n        return " ".join(words[:self.n]) + (" ..." if len(words) > self.n else "")',
      out: 'invoke : \'one two three four ...\'\nbatch  : [\'a b c d ...\', \'x y\']',
      caption: "`batch` was not written. The base class defines it in terms of `invoke`." },

    { t: "p", text: "The same pattern as the chat model in 1.2: implement the one required method and the protocol arrives. That consistency is the point \u2014 whatever you are implementing, the question is which single method the base class is defined in terms of." },

    { t: "h2", n: "03", id: "parser", text: "A custom parser",
      sub: "Which can be better than the general one, because you know the prompt" },

    { t: "code", lang: "python", title: "The bullet-list parser 1.4 was missing",
      code: 'class BulletListParser(BaseOutputParser):\n    def get_format_instructions(self) -> str:\n        return ("Respond with a markdown bullet list, one item per line, "\n                "each line starting with \'- \'.")\n\n    def parse(self, text: str) -> List[str]:\n        items = [ln.strip()[2:].strip()\n                 for ln in text.strip().splitlines()\n                 if ln.strip().startswith(("- ", "* "))]\n        if not items:\n            raise OutputParserException("expected a bullet list, got: %r" % text[:60])\n        return items',
      out: 'clean            -> [\'alpha\', \'beta\', \'gamma\']\nprose around it  -> [\'alpha\', \'beta\', \'gamma\']\ncommas           -> OutputParserException',
      hl: [6, 7, 8],
      caption: "It survives prose on both sides, because it filters lines rather than scanning for a span." },

    { t: "callout", kind: "good", title: "Yours can be stricter and more forgiving at once",
      body: [
        { t: "p", text: "1.4 found that `JsonOutputParser` fails on a leading preamble because it scans for the first JSON-shaped span. This parser filters lines, so prose before *and* after is simply ignored \u2014 more forgiving. And it raises on comma-separated input rather than returning something wrong-shaped \u2014 stricter than `CommaSeparatedListOutputParser`, which cannot fail." },
        { t: "p", text: "That is possible because you know what your prompt asked for and a general parser does not. When a chain's parse failures are concentrated on one predictable shape, a fifteen-line parser is often a better answer than a repair call." }
      ] },

    { t: "p", text: "Note that `get_format_instructions` is implemented too. 1.4's rule was that a parser and its instructions travel together; writing your own is where you get to make that literally true, by putting both in one class." },

    { t: "h2", n: "04", id: "compose", text: "Six components, one expression",
      sub: "Three from the library, two written here" },

    { t: "code", lang: "python", title: "The whole chain",
      code: 'prompt = ChatPromptTemplate.from_messages([\n    ("system", "List three items. {fmt}"),\n    ("human", "{topic}")]).partial(fmt=bp.get_format_instructions())\n\npipeline = (prompt | model | StrOutputParser() | bp\n            | RunnableLambda(lambda items: [i.upper() for i in items])\n            | TruncateWords(n=2))\n\nprint([type(s).__name__ for s in pipeline.steps])\nprint(repr(pipeline.invoke({"topic": "greek letters"})))',
      out: '[\'ChatPromptTemplate\', \'FakeChatModel\', \'StrOutputParser\', \'BulletListParser\', \'RunnableLambda\', \'TruncateWords\']\n"[\'ALPHA\', \'BETA\', ..."',
      hl: [9],
      caption: "No adapter between any pair. Now read that result again." },

    { t: "h2", n: "05", id: "typecheck", text: "The chain ran and the answer is wrong",
      sub: "LCEL does not type-check between steps" },

    { t: "callout", kind: "warn", title: "A list met a function expecting a string",
      body: [
        { t: "p", text: "`TruncateWords` expects a string. It received a list of three strings, called `str()` on it, split the repr on spaces and returned the first two words of a Python list literal: `\"['ALPHA', 'BETA',\"`. The chain completed successfully." },
        { t: "p", text: "Nothing raised because the pipe only requires that both sides are Runnables \u2014 not that the output type of one matches the input type of the next. That is the cost of the uniformity that makes everything compose, and it is a real cost rather than a footnote." }
      ] },

    { t: "code", lang: "python", title: "One isinstance check",
      code: 'class TruncateWordsStrict(TruncateWords):\n    def invoke(self, input, config=None, **kw):\n        if not isinstance(input, str):\n            raise TypeError("TruncateWords expected str, got %s" % type(input).__name__)\n        return TruncateWords.invoke(self, input, config, **kw)',
      out: 'strict version -> TypeError - TruncateWords expected str, got list',
      caption: "A silently wrong answer became a loud failure at the exact step that was misused." },

    { t: "p", text: "Validate at the boundaries you care about. It is worth doing on any component whose expected input type is not obvious from its position in the chain \u2014 which is most custom components, since a reader cannot tell from `| TruncateWords(n=2)` what the previous step produced." },

    { t: "h2", n: "06", id: "contract", text: "What each base class demands",
      sub: "One or two methods, which is why the ecosystem is large" },

    { t: "table",
      head: ["Base class", "You implement", "You receive"],
      rows: [
        ["`Runnable`", "`invoke`", "batch, stream, async forms, with_retry, with_fallbacks"],
        ["`BaseOutputParser`", "`parse`", "invoke, batch, stream, composition with `|`"],
        ["`BaseChatModel`", "`_generate`", "the full protocol, bind_tools, with_structured_output"],
        ["`BaseRetriever`", "`_get_relevant_documents`", "invoke, batch, async"],
        ["`Embeddings`", "`embed_documents` + `embed_query`", "use in any vector store"]
      ] },

    { t: "p", text: "That ratio is the reason the ecosystem has as many integrations as it does. The cost of making something a first-class component is a single method, so people pay it \u2014 and the same mechanism is available to you for anything the library does not already have." },

    { t: "exercise", kind: "build", title: "Write three components and find the bug",
      difficulty: "advanced", minutes: 30,
      body: "Build a custom component three ways: a function wrapped in RunnableLambda, a Runnable subclass with configuration, and an output parser with its own format instructions. Compose all three with library components into one chain and run it. Then look carefully at the result, work out why it is wrong, and make the failure loud.",
      requirements: [
        "Show that a bare function is coerced into a RunnableLambda by the pipe",
        "Implement a Runnable subclass and confirm batch works without being written",
        "Implement an output parser with parse and get_format_instructions, raising on bad input",
        "Show the parser surviving prose before and after the list",
        "Compose six components and print both the step list and the result",
        "Identify why the result is wrong and add a check that makes it raise instead"
      ],
      hint: "The chain completes successfully. Compare what the last step received against what it was written to accept.",
      solution: { lang: "python", title: "x0107.py \u2014 three components, one silent bug",
        code: 'class TruncateWords(Runnable):\n    """Keeps the first n words."""\n    def __init__(self, n: int = 5):\n        self.n = n\n    def invoke(self, input, config=None, **kw):\n        words = str(input).split()\n        return " ".join(words[:self.n]) + (" ..." if len(words) > self.n else "")\n\nclass BulletListParser(BaseOutputParser):\n    def get_format_instructions(self):\n        return ("Respond with a markdown bullet list, one item per line, "\n                "each line starting with \'- \'.")\n    def parse(self, text):\n        items = [ln.strip()[2:].strip() for ln in text.strip().splitlines()\n                 if ln.strip().startswith(("- ", "* "))]\n        if not items:\n            raise OutputParserException("expected a bullet list, got: %r" % text[:60])\n        return items\n    @property\n    def _type(self):\n        return "bullet_list"\n\nbp = BulletListParser()\nprompt = ChatPromptTemplate.from_messages([\n    ("system", "List three items. {fmt}"),\n    ("human", "{topic}")]).partial(fmt=bp.get_format_instructions())\n\npipeline = (prompt | model | StrOutputParser() | bp\n            | RunnableLambda(lambda items: [i.upper() for i in items])\n            | TruncateWords(n=2))\n\nclass TruncateWordsStrict(TruncateWords):\n    def invoke(self, input, config=None, **kw):\n        if not isinstance(input, str):\n            raise TypeError("TruncateWords expected str, got %s" % type(input).__name__)\n        return TruncateWords.invoke(self, input, config, **kw)',
        out: '==============================================================================\nPART 1 -- the cheapest custom component: a function\n==============================================================================\n  RunnableLambda(redact).invoke(...)\n   -> charge [CARD] today\n\n  it is a full Runnable: [\'invoke\', \'batch\', \'stream\', \'ainvoke\']\n\n  a plain function also works directly in a pipe -- LangChain coerces it:\n   -> card [CARD] on file\n  type of the coerced step: RunnableLambda\n\n  so for a stateless transformation you never need a class. reach for a\n  subclass only when you need configuration, validation or a name in traces.\n\n==============================================================================\nPART 2 -- a custom Runnable subclass\n==============================================================================\n  invoke : \'one two three four ...\'\n  batch  : [\'a b c d ...\', \'x y\']\n\n  implementing invoke alone gave batch and stream, exactly as it did for\n  the chat model in 1.2. the base class defines them in terms of invoke.\n\n  and it composes with everything:\n   -> THE QUICK BROWN ...\n\n==============================================================================\nPART 3 -- a custom output parser\n==============================================================================\n  clean            -> [\'alpha\', \'beta\', \'gamma\']\n  prose around it  -> [\'alpha\', \'beta\', \'gamma\']\n  commas           -> OutputParserException\n\n  note it survives prose on both sides, because it filters lines rather\n  than scanning for a span -- which is exactly the weakness 1.4 found in\n  JsonOutputParser. a parser you write can be stricter AND more forgiving\n  than a general one, because you know what your prompt asked for.\n\n  format instructions travel with it:\n    Respond with a markdown bullet list, one item per line, each line starting with \'- \'.\n\n==============================================================================\nPART 4 -- all three in one chain\n==============================================================================\n  chain steps: [\'ChatPromptTemplate\', \'FakeChatModel\', \'StrOutputParser\', \'BulletListParser\', \'RunnableLambda\', \'TruncateWords\']\n  invoke     : "[\'ALPHA\', \'BETA\', ..."\n\n  five components -- two of them written in this file, three from the\n  library -- in one expression, with no adapter between any pair.\n\n  what the model was asked:\n    System:   List three items. Respond with a markdown bullet list, one ite\n    Human:    greek letters\n\n==============================================================================\nPART 4b -- the chain ran, and the last step is wrong\n==============================================================================\n  look at that result again: "[\'ALPHA\', \'BETA\', ..."\n\n  TruncateWords expects a string. it received a LIST of three strings,\n  called str() on it, and split the repr on spaces. the output is the\n  first two words of a Python list literal.\n\n  nothing raised. LCEL does not type-check between steps -- the pipe only\n  requires that both sides are Runnables, not that the output type of one\n  matches the input type of the next. that is the cost of the uniformity\n  1.1 praised, and it is a real cost.\n\n  the fix is the same as in any dynamically typed pipeline: validate at\n  the boundary you care about.\n   strict version -> TypeError - TruncateWords expected str, got list\n\n  one isinstance check turned a silently wrong answer into a loud failure\n  at the exact step that was misused. worth doing on any component whose\n  input type is not obvious from its position.\n\n==============================================================================\nPART 5 -- what the protocol actually demands\n==============================================================================\n  base class           you implement                    you receive\n  Runnable             invoke                           batch, stream, async forms, with_retry, \n  BaseOutputParser     parse                            invoke, batch, stream, composition with \n  BaseChatModel        _generate                        invoke/batch/stream, bind_tools, with_st\n  BaseRetriever        _get_relevant_documents          invoke, batch, async\n  Embeddings           embed_documents + embed_query    use in any vector store\n\n  one or two methods each. that ratio is the entire reason the ecosystem\n  has as many integrations as it does -- the cost of being a first-class\n  component is a single method, so people pay it.',
        notes: [
          { t: "p", text: "**A bare function on the right of a pipe is coerced into a RunnableLambda**, so for a stateless transformation you never need a class. Subclass only for configuration, validation, or a useful name in a trace \u2014 `RunnableLambda` wrapping a lambda is an unhelpful span name during an incident." },
          { t: "p", text: "**`batch` worked on the subclass without being written**, the same way it did for the chat model in 1.2. Whatever you implement, the question is which single method the base class defines everything else in terms of." },
          { t: "p", text: "**The custom parser is both more forgiving and stricter than the library's.** It survives prose before *and* after the list, where `JsonOutputParser` fails on a preamble; and it raises on comma-separated input, where `CommaSeparatedListOutputParser` cannot fail and returns wrong-shaped data. You can do that because you know what your prompt asked for." },
          { t: "p", text: "**Six components composed with no adapter between any pair**, two of them written in the same file as the chain. That is the ecosystem argument from 1.1 shown at the smallest scale." },
          { t: "p", text: "**And the chain produced the wrong answer.** `TruncateWords` expects a string, received a list, called `str()` on it and returned the first two words of a Python list literal. It did not raise: the pipe only requires both sides to be Runnables, not that their types line up. LCEL does not type-check between steps." },
          { t: "p", text: "**One `isinstance` check turned that into a `TypeError` at the step that was misused**, which is the whole fix. Worth adding to any component whose expected input is not obvious from its position \u2014 a reader cannot tell from `| TruncateWords(n=2)` what came before it." },
          { t: "p", text: "I built this chain intending to demonstrate composition and only noticed the bug when reading the output. That is the honest shape of the problem: the chain looks right, runs clean, and the wrongness is in a value nobody printed." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: a chain that works and a field that is nonsense",
      body: [
        { t: "p", text: "A summarisation chain runs without error and writes a `summary` column. Someone notices the column sometimes contains text that looks like `['First point', 'Second`." },
        { t: "p", text: "A step in the middle was changed from returning a string to returning a list of bullet points \u2014 a reasonable improvement \u2014 and the step after it still expects a string. It calls `str()` and truncates the repr. No exception was ever raised, the chain's tests still pass if they only assert that a string came out, and the only symptom is data that looks odd to a human reading the table." },
        { t: "p", text: "The general fix is boundary validation rather than vigilance: an `isinstance` check in each custom component, and tests that assert on the *type* of each step's output rather than only on the end-to-end result. The specific thing to take away is that changing a step's return type is a breaking change to every downstream step, and LCEL will not tell you." }
      ] }
  ],

  takeaways: [
    "**A bare function is coerced into a RunnableLambda by the pipe**, so a stateless transformation never needs a class.",
    "**Subclass for configuration, validation or a readable trace name** \u2014 `RunnableLambda` is an unhelpful span name during an incident.",
    "**Implement `invoke` and batch, stream and the async forms arrive**, the same way `_generate` works for a chat model.",
    "**A custom parser can be more forgiving and stricter than a general one**, because you know what your prompt asked for.",
    "**Implement `get_format_instructions` alongside `parse`**, which makes 1.4's \u201cthey travel together\u201d rule literally true.",
    "**Six components composed with no adapter between any pair**, two of them written in the same file.",
    "**The chain ran and produced the wrong answer** \u2014 a list met a step expecting a string and was stringified into a Python repr.",
    "**LCEL does not type-check between steps**: the pipe requires both sides to be Runnables, not that their types line up.",
    "**That is the cost of the uniformity that makes everything compose**, and it is a real cost rather than a footnote.",
    "**One `isinstance` check turns a silently wrong answer into a TypeError at the misused step.**",
    "**Changing a step's return type is a breaking change to everything downstream**, and nothing will tell you.",
    "**Each base class asks for one or two methods** \u2014 which is why the ecosystem has as many integrations as it does."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A chain ends `| bullet_parser | TruncateWords(n=2)` where TruncateWords expects a string. What happens?",
        options: [
          "A TypeError at the TruncateWords step",
          "The chain completes, returning the first two words of the list's repr",
          "LCEL coerces the list to its first element before passing it on",
          "A validation error when the chain is constructed"
        ],
        answer: 1,
        why: "The pipe requires only that both sides are Runnables \u2014 it does not check that the output type of one matches the input type of the next, and nothing is validated at construction. So the list reaches a function that calls `str()` on it and splits the repr, producing `\"['ALPHA', 'BETA',\"`. The chain is successful and the answer is nonsense, which is why boundary validation inside custom components is worth the line it costs." },

      { stem: "When should you write a Runnable subclass instead of using RunnableLambda?",
        options: [
          "Always \u2014 lambdas cannot be batched or streamed",
          "When you need configuration, validation, or a meaningful name in a trace",
          "Only when the component must be async",
          "When the component appears more than once in the same chain"
        ],
        answer: 1,
        why: "A RunnableLambda is a full Runnable with batch, stream and the async forms, so capability is not the deciding factor. The reasons to subclass are practical: constructor arguments the function would have to close over, an isinstance check at the boundary, and a class name that reads usefully in a span tree \u2014 `RunnableLambda` tells you nothing at three in the morning." },

      { stem: "Why can a parser you write be both more forgiving and stricter than the library's?",
        options: [
          "Because custom parsers bypass LangChain's validation layer",
          "Because you know what your prompt asked for and a general parser does not",
          "Because BaseOutputParser applies looser rules to subclasses",
          "It cannot be both \u2014 the two are necessarily a trade-off"
        ],
        answer: 1,
        why: "A general JSON parser has to scan for a JSON-shaped span, which a preamble derails. A bullet-list parser written for your prompt can filter lines, so prose on either side is ignored \u2014 more forgiving. And it can raise on input that does not look like a bullet list, where the comma-separated parser cannot fail and returns wrong-shaped data \u2014 stricter. The specificity is what buys both." },

      { stem: "What does `BaseChatModel` require of an implementer, and what does it provide?",
        options: [
          "invoke, batch and stream must each be implemented separately",
          "`_generate` alone, in exchange for the full protocol plus bind_tools and with_structured_output",
          "`_generate` and `_stream`, in exchange for batching and async only",
          "A provider client and an API key, in exchange for the protocol"
        ],
        answer: 1,
        why: "`_generate` is the one required method, and everything else is defined in terms of it \u2014 which is what let the scripted model in 1.2 support ten methods without any of them being written. Implementing `_stream` as well gives genuine incremental output rather than a single chunk, but it is optional. That one-or-two-method cost across every base class is why the ecosystem has so many integrations." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Custom components",
    questions: [
      { level: "core",
        q: "How would you add a component LangChain does not have?",
        strong: "A strong answer starts with a function and escalates only when needed.",
        answer: [
          { t: "p", text: "Start with a function. For a stateless transformation \u2014 redaction, normalisation, reshaping a dict \u2014 a plain function is already a Runnable as far as the pipe is concerned, because a bare function on the right of a pipe gets coerced into a RunnableLambda automatically. No class, no ceremony." },
          { t: "p", text: "I would escalate to a subclass for three reasons only: constructor arguments I would otherwise have to close over, validation at the boundary, and a name that reads usefully in a trace. That third one is underrated \u2014 a span tree full of RunnableLambda entries tells you nothing when you are reading it during an incident." },
          { t: "p", text: "Either way the cost is one method. Implement invoke and you get batch, stream, the async forms, with_retry and with_fallbacks from the base class. It is the same deal as implementing _generate on a chat model, or parse on an output parser, or _get_relevant_documents on a retriever \u2014 one method each, and that ratio is why the ecosystem has as many integrations as it does." },
          { t: "p", text: "The place I would genuinely reach for a custom component rather than configuration is parsing. A parser written for your own prompt can be both more forgiving and stricter than a general one, because you know what shape you asked for \u2014 so when parse failures are concentrated on one predictable pattern, fifteen lines is often a better answer than adding a repair call." }
        ] },

      { level: "advanced",
        q: "A chain runs clean and writes nonsense into one column. How do you find it?",
        strong: "A strong answer reaches the type mismatch and the structural reason.",
        answer: [
          { t: "p", text: "I would look for a type mismatch between steps, because LCEL does not check them. The pipe requires both sides to be Runnables and nothing more \u2014 it does not verify that the output type of one matches the input type of the next, and there is no validation at construction time either." },
          { t: "p", text: "I hit exactly this building a demonstration chain. A parser returning a list of strings fed a step written to take a string; that step called str on it, split the repr on spaces, and returned the first two words of a Python list literal. The chain completed successfully and I only noticed when I read the output." },
          { t: "p", text: "The usual history behind it is benign: a step in the middle was changed from returning a string to returning a list, which was an improvement, and the step after it was never updated. If the tests only assert that a string comes out of the end, they still pass, because a stringified list is a string." },
          { t: "p", text: "So the fix is boundary validation rather than care. An isinstance check inside each custom component turns it into a TypeError at the step that was misused, which is a traceback that points at the actual problem. And I would add tests that assert on the type of each step's output, not just the end-to-end result \u2014 because the real lesson is that changing a step's return type is a breaking change to everything downstream, and the framework will not say so." }
        ] },

      { level: "core",
        q: "Why implement get_format_instructions on a custom parser?",
        strong: "A strong answer connects it to the parser-and-prompt coupling.",
        answer: [
          { t: "p", text: "Because a parser and the instructions that make its job possible have to travel together, and writing your own is where you can make that literally true by putting both in the same class." },
          { t: "p", text: "The problem it solves is a silent mismatch. Format instructions live in the prompt and the parsing logic lives somewhere else, so swapping one without re-running the other leaves the prompt asking for a shape the parser no longer expects. Nothing in the type system connects them, and the symptom is a parse failure rate that climbs after a change nobody associates with parsing." },
          { t: "p", text: "With both on one class, the prompt is built from the parser \u2014 you partial the format instructions in from get_format_instructions \u2014 so replacing the parser replaces the instructions in the same edit. It is a small discipline and it removes a whole category of drift." },
          { t: "p", text: "The other thing it gives you is a place to be specific. A general parser's instructions have to be generic; yours can say exactly what your prompt needs, including forbidding the particular failure you keep seeing \u2014 which is what the library's own JSON instructions do when they explicitly tell the model not to write 'Here is the JSON'." }
        ] }
    ]
  }
});
