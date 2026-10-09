EC.receiveLesson({
  id: "1.2",

  lede: "A chat model in LangChain is one method: a function from a list of messages to a message. Everything else on it \u2014 batch, stream, async, tool binding, structured output, retries, fallbacks \u2014 is given to you by the base class once you implement that one. This lesson implements it, which is both how the course gets a model it can run without an API key and the clearest possible view of the contract. It also establishes the fact that organises all of Phase 1: **the model never sees your chain.** Three completely different constructions \u2014 a two-variable template, a one-variable template, a hand-built list \u2014 produce a message list that is identical in every respect, because templates and chains are machinery for producing one list, and the list is all that is sent.",

  objectives: [
    "Name the four message types and say what each is for",
    "Implement a chat model and list what the base class then provides free",
    "Explain why a tool call is an assistant message rather than a message type",
    "Show that different chain constructions converge on the same message list",
    "Distinguish what invoke, batch and stream each guarantee, with timings"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", id: "messages", text: "Four message types",
      sub: "The vocabulary every later lesson uses" },

    { t: "p", text: "A conversation is a list. Each entry has a role, and LangChain gives each role a class rather than a dict key, which is what lets a parser or a graph pattern-match on it later." },

    { t: "table",
      head: ["Class", "Role", "What it is for"],
      rows: [
        ["`SystemMessage`", "system", "instructions that frame the whole conversation"],
        ["`HumanMessage`", "user", "what the user said"],
        ["`AIMessage`", "assistant", "what the model said \u2014 or which tool it wants to call"],
        ["`ToolMessage`", "tool", "the result of a tool call, tied back by `tool_call_id`"]
      ] },

    { t: "callout", kind: "insight", title: "A tool call is not a fifth message type",
      body: [
        { t: "p", text: "This trips people up and it matters for the whole of module 3. When a model decides to call a tool, what comes back is an **`AIMessage` with empty content and a populated `tool_calls` list**. It is an assistant turn whose content happens to be a request rather than prose." },
        { t: "p", text: "The result then comes back as a `ToolMessage` carrying the `tool_call_id` that ties it to the specific call. Two messages, both ordinary, linked by an id \u2014 that is the entire tool protocol, and 3.2 follows one through a full round trip." }
      ] },

    { t: "h2", n: "02", id: "contract", text: "A model is one method",
      sub: "And the base class does the rest" },

    { t: "p", text: "The contract for a chat model is smaller than it looks. Implement `_generate`, which takes a list of messages and returns a result wrapping one message, and `BaseChatModel` supplies everything else." },

    { t: "code", lang: "python", title: "The scripted model this course runs on",
      code: 'from langchain_core.language_models.chat_models import BaseChatModel\nfrom langchain_core.messages import AIMessage\nfrom langchain_core.outputs import ChatGeneration, ChatResult\n\nclass FakeChatModel(BaseChatModel):\n    """Replays `script` one entry per call, and records what it was asked."""\n\n    script: list = []\n    seen:   list = []      # every message list this model received\n    calls:  int  = 0\n\n    @property\n    def _llm_type(self):\n        return "fake-chat-model"\n\n    def _generate(self, messages, stop=None, run_manager=None, **kwargs):\n        object.__setattr__(self, "seen", list(self.seen) + [list(messages)])\n        idx = min(self.calls, len(self.script) - 1)\n        object.__setattr__(self, "calls", self.calls + 1)\n        out = self.script[idx]\n        msg = out if isinstance(out, AIMessage) else AIMessage(content=str(out))\n        return ChatResult(generations=[ChatGeneration(message=msg)])',
      hl: [15, 16, 21],
      caption: "One required method. The `seen` list is what makes it a teaching instrument rather than just a stub." },

    { t: "p", text: "Implementing that one method produces an object with the full protocol on it: `invoke`, `batch`, `stream`, the async form of each, plus `bind_tools`, `with_structured_output`, `with_retry` and `with_fallbacks`. None of those were written here. They are defined once on the base class, in terms of `_generate`, which is 1.1's argument arriving in concrete form." },

    { t: "callout", kind: "note", title: "What is faked, exactly",
      body: [
        { t: "p", text: "Only token generation. The message objects, the prompt templating, the parsing, the composition, the streaming machinery, the callback events, the tool protocol and \u2014 later \u2014 the entire LangGraph state machine are the real library doing real work." },
        { t: "p", text: "So when a lesson prints a trace, that trace is real. What is scripted is what a model would have said, which means any claim about **what the model decides** is a claim this course cannot verify and will say so. Claims about **what the machinery does with a decision** are verified by construction." }
      ] },

    { t: "h2", n: "03", id: "flat", text: "The model never sees your chain",
      sub: "The fact that organises all of Phase 1" },

    { t: "p", text: "Templates, partial variables, few-shot examples, message placeholders and chains are all machinery for producing one thing: a flat list of messages. The model receives that list. It does not receive your variables, your template, your chain structure or your intentions." },

    { t: "code", lang: "python", title: "Three constructions, one request",
      code: 'a = ChatPromptTemplate.from_messages([("system", "You are a {role} expert."),\n                                      ("human", "Explain {topic}.")])\nb = ChatPromptTemplate.from_messages([SystemMessage(content="You are a Python expert."),\n                                      ("human", "Explain {topic}.")])\nc = [SystemMessage(content="You are a Python expert."),\n     HumanMessage(content="Explain decorators.")]\n\nprint(a.invoke({"role": "Python", "topic": "decorators"}).to_messages())\nprint(b.invoke({"topic": "decorators"}).to_messages())\nprint(c)',
      out: '[SystemMessage(\'You are a Python expert.\'), HumanMessage(\'Explain decorators.\')]\n[SystemMessage(\'You are a Python expert.\'), HumanMessage(\'Explain decorators.\')]\n[SystemMessage(\'You are a Python expert.\'), HumanMessage(\'Explain decorators.\')]',
      caption: "Identical. Whatever you built it with, the model gets the same two messages." },

    { t: "callout", kind: "mental", title: "Mental model: ask what the model saw",
      body: [
        { t: "p", text: "When a chain misbehaves, the first question is not what the prompt template says \u2014 it is what list of messages actually arrived. A partial that did not apply, a placeholder that filled with nothing, a history that grew past what you expected and a template whose variable was silently absent all look identical in the source and completely different in the list." },
        { t: "p", text: "`FakeChatModel.seen` exists for exactly this, and in production the equivalent is a trace that captures the resolved messages rather than the template. 4.2 sets that up; for now, the habit is what matters." }
      ] },

    { t: "h2", n: "04", id: "calls", text: "invoke, batch and stream",
      sub: "Three guarantees, and only one of them is obvious" },

    { t: "dl", items: [
      { k: "invoke(messages) \u2192 AIMessage", v: "One request, one response, blocking. The thing you reach for first and the thing to stop reaching for the moment you have more than one input." },
      { k: "batch(list_of_inputs) \u2192 list", v: "Many inputs run **concurrently** against a thread pool, results returned in input order. Not a loop. `max_concurrency` in the config is how you stay inside a provider's rate limit." },
      { k: "stream(messages) \u2192 iterator of chunks", v: "Pieces as they are produced. The chunks add together into the full message, and langchain-core appends a final empty chunk to close the stream." }
    ] },

    { t: "code", lang: "python", title: "Batch is not a loop",
      code: 'class SlowFake(FakeChatModel):\n    """Same model, 120 ms of deliberate delay, so concurrency is visible."""\n    def _generate(self, messages, stop=None, run_manager=None, **kw):\n        time.sleep(0.12)\n        return FakeChatModel._generate(self, messages, stop, run_manager, **kw)\n\ninputs = [[HumanMessage(content="q%d" % i)] for i in range(6)]\n\nt0 = time.perf_counter(); [SlowFake(script=["a"]).invoke(i) for i in inputs]\nprint("loop          %.3f s" % (time.perf_counter() - t0))\n\nt0 = time.perf_counter(); SlowFake(script=["a"]).batch(inputs)\nprint("batch         %.3f s" % (time.perf_counter() - t0))\n\nt0 = time.perf_counter(); SlowFake(script=["a"]).batch(inputs, config={"max_concurrency": 2})\nprint("batch(mc=2)   %.3f s" % (time.perf_counter() - t0))',
      out: 'loop          0.726 s\nbatch         0.126 s\nbatch(mc=2)   0.365 s',
      hl: [12, 15, 18],
      caption: "5.7x from one method call. The third line is three waves of two, which is what a rate limit looks like." },

    { t: "callout", kind: "trap", title: "The loop that should have been a batch",
      body: [
        { t: "p", text: "A list comprehension over `invoke` is the single most common avoidable latency problem in a LangChain codebase, because it reads perfectly well and is six times slower. Six calls at 120 ms is 0.726 s serially and 0.126 s batched." },
        { t: "p", text: "The reason it survives review is that the loop is correct \u2014 it produces the right answers in the right order, which `batch` also guarantees. It is only the wall clock that differs, and nothing in the code hints at it." }
      ] },

    { t: "h2", n: "05", id: "legacy", text: "Legacy classes and what replaced them",
      sub: "Because half the tutorials you will find still use them" },

    { t: "p", text: "Pre-LCEL LangChain shipped named chain classes. They are deprecated, they still fill tutorials and interview questions, and knowing the modern equivalent for each is worth more than it should be." },

    { t: "table",
      head: ["Legacy", "Modern replacement"],
      rows: [
        ["`LLMChain`", "`prompt | model | parser`"],
        ["`SequentialChain`", "the `|` pipe"],
        ["`ConversationChain`", "`RunnableWithMessageHistory`, or a LangGraph checkpointer (9.4)"],
        ["`RetrievalQA`, `ConversationalRetrievalChain`", "`create_retrieval_chain` composed in LCEL (5.7)"],
        ["`initialize_agent`, `AgentExecutor`", "`create_agent`, or LangGraph's agent (3.4, 9.1)"],
        ["`load_summarize_chain`", "LCEL, or LangGraph map-reduce for real parallelism (10.2)"]
      ] },

    { t: "p", text: "The rule of thumb: **if a tutorial imports a `*Chain` class, reach for the LCEL or LangGraph equivalent.** You get streaming, async, batching and tracing for free, none of which the legacy classes support." },

    { t: "diagram", kind: "layers", title: "One method, and everything the base class gives you",
      caption: "You implement `_generate` — a function from a list of messages to a message. Every other capability on a chat model is inherited, which is why a thirty-line fake model supports batching, streaming and tool binding without another line.",
      items: [
        { label: "with_retry · with_fallbacks", sub: "resilience, composed as methods", tone: "violet", side: "free" },
        { label: "bind_tools · with_structured_output", sub: "the tool protocol", tone: "teal", side: "free" },
        { label: "batch · abatch", sub: "concurrency over a list of inputs", tone: "good", side: "free" },
        { label: "stream · astream · ainvoke", sub: "incremental and async delivery", tone: "good", side: "free" },
        { label: "_generate(messages) -> ChatResult", sub: "the ONE method you write", tone: "accent", side: "yours" }
      ] },
    { t: "exercise", kind: "build", title: "Implement a chat model and measure the protocol",
      difficulty: "core", minutes: 28,
      body: "Build a scripted chat model by implementing the one required method, and confirm which protocol methods the base class then provides. Show the four message types including a tool-call pair. Then demonstrate that three different chain constructions produce an identical message list, and measure what invoke, batch and batch-with-concurrency-limit actually cost on the same six inputs.",
      requirements: [
        "Implement _generate on a BaseChatModel subclass, recording every message list received",
        "List which protocol methods exist on the instance without being written",
        "Print a four-message trace including an AIMessage with tool_calls and its ToolMessage",
        "Build the same request three ways and show the resulting message lists are identical",
        "Time six calls as a loop, as a batch, and as a batch with max_concurrency=2",
        "Show the chunk sequence from stream, including what joins back to the full text"
      ],
      hint: "Subclass the fake model and add a sleep to its _generate to make concurrency visible. The timing comparison is the point \u2014 the three numbers should be roughly serial, parallel, and parallel-in-waves.",
      solution: { lang: "python", title: "x0102.py \u2014 one method, and what it buys",
        code: 'import time\nfrom langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage\nfrom langchain_core.prompts import ChatPromptTemplate\nfrom fake import FakeChatModel, dump_messages\n\n# the four types, including a tool-call pair\nmsgs = [SystemMessage(content="You are a Python expert."),\n        HumanMessage(content="Explain decorators."),\n        AIMessage(content="", tool_calls=[{"name": "search_docs",\n                                           "args": {"q": "decorators"}, "id": "c1"}]),\n        ToolMessage(content="A decorator wraps a function.", tool_call_id="c1")]\ndump_messages(msgs)\n\n# what the base class provides from one implemented method\nm = FakeChatModel(script=["..."])\nfor meth in ("invoke", "batch", "stream", "ainvoke", "abatch", "astream",\n             "bind_tools", "with_structured_output", "with_retry", "with_fallbacks"):\n    print("%-24s %s" % (meth, hasattr(m, meth)))\n\n# three constructions, one message list\na = ChatPromptTemplate.from_messages([("system", "You are a {role} expert."),\n                                      ("human", "Explain {topic}.")])\nb = ChatPromptTemplate.from_messages([SystemMessage(content="You are a Python expert."),\n                                      ("human", "Explain {topic}.")])\nc = [SystemMessage(content="You are a Python expert."),\n     HumanMessage(content="Explain decorators.")]\n\n# timing: loop vs batch vs bounded batch\nclass SlowFake(FakeChatModel):\n    def _generate(self, messages, stop=None, run_manager=None, **kw):\n        time.sleep(0.12)\n        return FakeChatModel._generate(self, messages, stop, run_manager, **kw)',
        out: '==============================================================================\nPART 1 -- the four message types\n==============================================================================\nclass            role       what it is for\nSystemMessage    system     instructions that frame the whole conversation\nHumanMessage     user       what the user said\nAIMessage        assistant  what the model said -- or which tool it wants\nToolMessage      tool       the result of a tool call, tied back by id\n\nas a trace:\n   System:   You are a Python expert.\n   Human:    Explain decorators.\n   AI:         tool_calls=[(\'search_docs\', {\'q\': \'decorators\'})]\n   Tool:     A decorator wraps a function.\n\nnote the AIMessage with empty content and a tool_calls list. a tool call is\nnot a different kind of message -- it is an assistant turn whose content is\na request rather than prose. 3.2 follows the id through a full round trip.\n\n==============================================================================\nPART 2 -- a chat model is a function from messages to a message\n==============================================================================\nthat is the entire contract. here it is, implemented:\n\nclass FakeChatModel(BaseChatModel):\n    def _generate(self, messages, stop=None, run_manager=None, **kw):\n        msg = self._next_scripted_response(messages)\n        return ChatResult(generations=[ChatGeneration(message=msg)])\n\ninvoke returns : AIMessage\n  .content     : \'A decorator is a callable that returns a callable.\'\n  .id          : lc_run--01a1194e-fae5-7222-a ...\n\nand BaseChatModel gave us, for free, from that one method:\n   invoke                   yes\n   batch                    yes\n   stream                   yes\n   ainvoke                  yes\n   abatch                   yes\n   astream                  yes\n   bind_tools               yes\n   with_structured_output   yes\n   with_retry               yes\n   with_fallbacks           yes\n\n==============================================================================\nPART 3 -- the model never sees your chain\n==============================================================================\nthree different ways of building the same request:\n\n   template, both vars -> [(\'SystemMessage\', \'You are a Python expert.\'), (\'HumanMessage\', \'Explain decorators.\')]\n   template, one var   -> [(\'SystemMessage\', \'You are a Python expert.\'), (\'HumanMessage\', \'Explain decorators.\')]\n   hand-built list     -> [(\'SystemMessage\', \'You are a Python expert.\'), (\'HumanMessage\', \'Explain decorators.\')]\n\n   all three identical as far as the model is concerned: True\n\nTHE POINT: templates, partials, few-shot examples and chains are all\nmachinery for producing ONE list of messages. the model receives the list\nand nothing else -- not your variables, not your template, not your chain.\nthat is why \'what did the model actually see?\' is the first debugging\nquestion, and why FakeChatModel records it.\n\nwhat the model recorded on the last call:\n   System:   You are a Rust expert.\n   Human:    Explain lifetimes.\n\n==============================================================================\nPART 4 -- what invoke, batch and stream each guarantee\n==============================================================================\n   6 calls, each delayed 120 ms:\n   a Python loop over invoke            0.726 s\n   batch(), default concurrency         0.126 s   (5.7x faster)\n   batch(max_concurrency=2)             0.365 s   (2.0x faster)\n\n   batch is NOT a loop. it runs the inputs concurrently against a thread\n   pool, and max_concurrency is how you stay inside a provider\'s rate limit\n   instead of discovering it with 429s. 2.8 does this properly.\n\n   stream yields chunks as they are produced:\n   chunks -> [\'one \', \'two \', \'three \', \'four\', \'\']\n   joined -> \'one two three four\'\n\n   note the trailing empty chunk: langchain-core appends one to close the\n   stream. code that counts chunks rather than joining them has to expect it.',
        notes: [
          { t: "p", text: "**One implemented method produces ten.** `_generate` is the whole contract, and `invoke`, `batch`, `stream`, the three async forms, `bind_tools`, `with_structured_output`, `with_retry` and `with_fallbacks` all arrive defined in terms of it. This is 1.1's argument in its most concrete form: satisfy the interface and the ecosystem's features apply to you." },
          { t: "p", text: "**All three constructions produced an identical message list.** A two-variable template, a one-variable template and a hand-built list converge completely \u2014 which is the fact to carry into every later debugging session, because it means the chain's structure is not evidence about what was sent. Only the resolved list is." },
          { t: "p", text: "**Batch is 5.7x a loop on six inputs** \u2014 0.726 s against 0.126 s \u2014 and the loop version reads perfectly well, returns the right answers in the right order, and passes review. Nothing in the source hints at the difference, which is why it is the most common avoidable latency problem in a LangChain codebase." },
          { t: "p", text: "**`max_concurrency=2` came out at 0.365 s, almost exactly three waves of two.** That is the shape of a rate limit: you give up most of the parallel speedup in exchange for never discovering the provider's ceiling with a burst of 429s. 4.5 prices that trade properly." },
          { t: "p", text: "**Streaming produced a trailing empty chunk**: `['one ', 'two ', 'three ', 'four', '']`. Joining them gives the right string, so code that accumulates is fine; code that counts chunks or indexes the last one has to expect it. That is a langchain-core behaviour rather than a property of the model, so it will appear with a real provider too." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: the prompt that works in the playground",
      body: [
        { t: "p", text: "A prompt gives good answers pasted into a provider's playground and bad ones through the chain. The template looks right, the variables look right, and the obvious conclusion is that the framework is doing something to the prompt." },
        { t: "p", text: "It is, and the fix is to look rather than guess. Capture the resolved message list \u2014 `seen` here, a trace in production \u2014 and compare it to what was pasted. The usual findings are mundane and invisible in the source: a `MessagesPlaceholder` that filled with twelve turns of history nobody accounted for, a partial variable that was never applied so a literal `{tone}` was sent, a system message split into two by a template that was built from a list, or whitespace from a triple-quoted string that changed how the instruction read." },
        { t: "p", text: "All four are the same class of bug, and the reason this lesson spends a section on it is that the chain's source code cannot tell you which one happened. Templates and chains are machinery for producing a list; debug the list." }
      ] }
  ],

  takeaways: [
    "**Four message types**: SystemMessage, HumanMessage, AIMessage and ToolMessage \u2014 classes rather than dict keys, so later code can pattern-match on them.",
    "**A tool call is not a fifth type** \u2014 it is an AIMessage with empty content and a populated `tool_calls` list, answered by a ToolMessage carrying the matching id.",
    "**A chat model is one method**: messages in, a message out. `_generate` is the entire required contract.",
    "**That one method yields ten** \u2014 invoke, batch, stream, the async forms, bind_tools, with_structured_output, with_retry, with_fallbacks \u2014 all defined on the base class.",
    "**The model never sees your chain.** Three different constructions produced byte-identical message lists.",
    "**So the chain's source is not evidence about what was sent** \u2014 only the resolved message list is, which makes \u201cwhat did the model see?\u201d the first debugging question.",
    "**batch is not a loop**: six 120 ms calls took 0.726 s serially and 0.126 s batched, a 5.7x difference with nothing in the source to hint at it.",
    "**`max_concurrency=2` gave 0.365 s**, three waves of two \u2014 giving up speedup to stay inside a rate limit rather than discovering it with 429s.",
    "**Streaming appends a trailing empty chunk**; accumulating code is fine, counting or last-indexing code is not.",
    "**If a tutorial imports a `*Chain` class, reach for the LCEL or LangGraph equivalent** \u2014 the legacy classes have no streaming, async, batching or tracing.",
    "**Only token generation is scripted in this course.** Claims about what the machinery does are verified; claims about what a model would decide are flagged as unverifiable."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A model decides to call a tool. What comes back?",
        options: [
          "A ToolMessage containing the tool name and arguments",
          "An AIMessage with empty content and a populated tool_calls list",
          "A dedicated ToolCallMessage type",
          "A FunctionMessage, which is the modern name for a tool request"
        ],
        answer: 1,
        why: "A tool request is an assistant turn whose content happens to be a request rather than prose, so it arrives as an ordinary AIMessage with `tool_calls` set and `content` empty. The result comes back separately as a ToolMessage carrying the matching `tool_call_id`. Two ordinary messages linked by an id is the whole tool protocol \u2014 there is no special message type for the call itself." },

      { stem: "A two-variable template, a one-variable template and a hand-built message list all produce the same request. What follows?",
        options: [
          "The templates are redundant and the hand-built list is preferable",
          "The chain's structure is not evidence about what was sent \u2014 only the resolved message list is",
          "LangChain normalises templates into a canonical form before sending",
          "The three are equivalent only because no partials were used"
        ],
        answer: 1,
        why: "Templates, partials, placeholders and chains are machinery for producing one flat list, and the model receives that list and nothing else. So when a chain misbehaves, reading the template cannot distinguish an unapplied partial from a placeholder that filled with twelve turns of history from a variable that was silently absent \u2014 all of them look fine in the source and completely different in the list. Capture the list." },

      { stem: "Six model calls of 120 ms each: 0.726 s as a loop, 0.126 s as a batch. Why does the loop survive code review?",
        options: [
          "Because reviewers rarely check latency-sensitive paths",
          "Because it is correct \u2014 same answers, same order \u2014 and nothing in the source hints at the difference",
          "Because batch was only added in recent versions",
          "Because the difference only appears under production load"
        ],
        answer: 1,
        why: "The loop produces the right results in the right order, which is exactly what `batch` also guarantees, so there is no correctness signal to catch. The only difference is wall-clock time, and a list comprehension over `invoke` reads perfectly naturally. That combination \u2014 correct, idiomatic-looking and six times slower \u2014 is what makes it the most common avoidable latency problem in a LangChain codebase." },

      { stem: "What does implementing `_generate` on a BaseChatModel subclass give you?",
        options: [
          "Only invoke \u2014 batch and stream require their own implementations",
          "The full protocol: invoke, batch, stream, the async forms, plus bind_tools, with_structured_output, with_retry and with_fallbacks",
          "invoke and batch, but streaming must be implemented separately to be real",
          "Nothing until the model is registered with a provider package"
        ],
        answer: 1,
        why: "The base class defines every other method in terms of `_generate`, so one implementation yields the whole surface. Implementing `_stream` separately is worth doing if you want genuine incremental output rather than a single chunk, but the method exists either way. This is the concrete payoff of 1.1's argument: satisfy the interface and every ecosystem feature \u2014 retries, fallbacks, structured output, tool binding \u2014 applies without being written for you." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Chat models and messages",
    questions: [
      { level: "core",
        q: "Walk me through what a chat model is in LangChain.",
        strong: "A strong answer reduces it to one method and then lists what that buys.",
        answer: [
          { t: "p", text: "It is a function from a list of messages to a message. That is the entire contract \u2014 you implement `_generate`, which receives the message list and returns a result wrapping one AIMessage, and you are done." },
          { t: "p", text: "What the base class then gives you is the interesting part: invoke, batch, stream, the async form of all three, plus bind_tools, with_structured_output, with_retry and with_fallbacks. None of those are written by the implementer; they are defined once on BaseChatModel in terms of that one method. I built a scripted model this way to run examples without an API key, and confirmed all ten exist on it." },
          { t: "p", text: "On the message types: system, human, AI and tool. The one worth calling out is that a tool call is not a separate type \u2014 it is an AIMessage with empty content and a populated tool_calls list, answered later by a ToolMessage carrying the matching id. People expect a ToolCallMessage and there isn't one, because a tool request is just an assistant turn whose content is a request rather than prose." },
          { t: "p", text: "The practical consequence of the whole design is that the model only ever receives a flat list. Templates, partials, placeholders and chains are machinery for producing that list, and the list is all that is sent." }
        ] },

      { level: "core",
        q: "A prompt works in the playground and fails through your chain. How do you debug it?",
        strong: "A strong answer captures the resolved messages rather than reading the template.",
        answer: [
          { t: "p", text: "I would capture the resolved message list and compare it to what was pasted into the playground, before forming any theory. The reason is structural: the model never sees the chain, only the list, so the template's source code genuinely cannot tell you what was sent. I proved that to myself by building the same request three ways \u2014 a two-variable template, a one-variable template and a hand-built list \u2014 and getting byte-identical output from all three." },
          { t: "p", text: "The usual findings are mundane and all invisible in the source. A MessagesPlaceholder that filled with twelve turns of history nobody accounted for. A partial variable that was never applied, so a literal brace-tone went to the model. A system message accidentally split in two by a template built from a list. Whitespace from a triple-quoted string that changed how an instruction reads." },
          { t: "p", text: "Those four are the same class of bug and they need the same evidence, which is why I would not reason about the template at all until I had the list in front of me." },
          { t: "p", text: "In a scripted test model I keep a `seen` attribute that records every message list it received; in production the equivalent is a trace that captures resolved messages rather than template names. The thing I would push for in a codebase is that the trace stores the resolved list, because a trace that records the template name and the variables separately leaves you doing the substitution in your head, which is exactly where the bug is." }
        ] },

      { level: "advanced",
        q: "When would you use batch rather than a loop, and what does max_concurrency do?",
        strong: "A strong answer gives the measurement and the rate-limit trade.",
        answer: [
          { t: "p", text: "Always, when there is more than one independent input. Batch runs them concurrently against a thread pool and returns results in input order, so it has the same contract as a loop and a very different wall clock. On six calls of 120 milliseconds each I measured 0.726 seconds for the loop and 0.126 for the batch \u2014 about 5.7 times." },
          { t: "p", text: "What makes this worth raising in a review is that the loop is not wrong. It returns the right answers in the right order, it reads naturally as a list comprehension, and nothing in the source suggests a problem. Correct, idiomatic and six times slower is a combination that survives review indefinitely, which is why I treat it as a thing to look for rather than a thing to notice." },
          { t: "p", text: "`max_concurrency` bounds how many run at once. At two, the same six calls took 0.365 seconds \u2014 three waves of two, almost exactly. So you give up most of the speedup, and what you buy is never discovering the provider's rate limit with a burst of 429s and a retry storm behind it." },
          { t: "p", text: "The way I would set it is from the provider's documented limit and the number of concurrent workers, not from benchmarking \u2014 because the number you can get away with on an idle account is not the number you can get away with at peak, and the failure mode when you are wrong is correlated across every request in the burst." }
        ] }
    ]
  }
});
