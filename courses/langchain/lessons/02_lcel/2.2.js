EC.receiveLesson({
  id: "2.2",
  lede: "`prompt | model | parser` is `prompt.__or__(model).__or__(parser)`, and what it returns is a **`RunnableSequence` holding a flat list of three steps** \u2014 not nested pairs. The chain is a value built when the expression is evaluated, which is why you can print it, read its steps, inspect its input schema and draw its graph before anything runs. Two coercions happen quietly inside the pipe and explain most LCEL code you will read: a **dict literal becomes a `RunnableParallel`** and a **bare function becomes a `RunnableLambda`**, which is how the standard RAG idiom in 5.7 can be written without naming either class.",
  objectives: [
    "State what the pipe operator constructs and why it is flat",
    "Use a chain as a step in another chain and confirm the result stays flat",
    "Identify the two coercions the pipe performs",
    "Inspect a chain's steps, schema and graph without invoking it",
    "Explain why a chain being a value matters for debugging"
  ],
  prerequisites: ["2.1"],
  blocks: [
    { t: "h2", n: "01", id: "builds", text: "What the pipe builds", sub: "A flat sequence, not a tree" },

    {"kind": "flow", "title": "What the pipe actually builds", "cols": 3, "caption": "`prompt | model | parser` is `prompt.__or__(model).__or__(parser)`, and it returns a `RunnableSequence` holding a **flat** list of three steps — not nested pairs. The chain is a value built when the expression evaluates, so you can print it and read its steps.", "nodes": [{"id": "p", "label": "prompt", "sub": "dict → PromptValue", "tone": "accent"}, {"id": "m", "label": "model", "sub": "messages → AIMessage", "tone": "violet"}, {"id": "o", "label": "parser", "sub": "AIMessage → str", "tone": "teal"}], "edges": [["p", "m"], ["m", "o"]], "t": "diagram", "id": "dg-2_2-01-0"},




    { t: "code", lang: "python", title: "Three steps, one sequence",
      code: 'chain = prompt | model | StrOutputParser()\n\nprint(type(chain).__name__)\nprint([type(s).__name__ for s in chain.steps])\nprint(len(chain.steps))',
      out: 'type        : RunnableSequence\nsteps       : [\'ChatPromptTemplate\', \'FakeChatModel\', \'StrOutputParser\']\nlen(steps)  : 3',
      caption: "Three, not two \u2014 LangChain flattens rather than building nested pairs." },
    { t: "p", text: "`a | b | c` evaluates left to right, so it is `(a | b) | c`. A naive implementation would produce a sequence containing a sequence. LangChain flattens, so the result is one sequence of three, which keeps the trace readable and the step list meaningful." },
    { t: "code", lang: "text", title: "Flattening across a named sub-chain",
      code: 'inner = prompt | model\nouter = inner | StrOutputParser()\n\ninner steps : [\'ChatPromptTemplate\', \'FakeChatModel\']\nouter steps : [\'ChatPromptTemplate\', \'FakeChatModel\', \'StrOutputParser\']\nouter is flat, not nested: True',
      caption: "Extracting a sub-chain into a variable costs nothing structurally." },
    { t: "callout", kind: "good", title: "Naming a sub-chain is free", body: [
      { t: "p", text: "Because the flattening happens whenever a sequence meets another step, pulling part of a chain into a named variable for readability does not add a layer of nesting or a level to the trace. The composed result is identical to writing it inline." },
      { t: "p", text: "So there is no performance or observability reason to write one enormous expression. Name the parts." }
    ] },
    { t: "h2", n: "02", id: "coercion", text: "Two quiet coercions", sub: "Which explain most LCEL you will read" },
    { t: "p", text: "The pipe accepts things that are not Runnables and converts them. There are two cases, and together they account for most of the LCEL idiom that looks like magic the first time." },
    { t: "table", head: ["What you write", "What it becomes", "Where you will see it"],
      rows: [
        ["a `dict` literal", "`RunnableParallel`", "the `{context, question}` RAG idiom (5.7)"],
        ["a bare function", "`RunnableLambda`", "`| format_docs` after a retriever"],
        ["`itemgetter('k')`", "`RunnableLambda`", "pulling one key out of a dict input (2.4)"]
      ] },
    { t: "code", lang: "python", title: "Both coercions in one expression",
      code: 'coerced = {"upper": RunnableLambda(str.upper), "len": len} | RunnableLambda(\n    lambda d: "%s (%d)" % (d["upper"], d["len"]))\n\nprint(coerced.invoke("hello"))\nprint(type(coerced.steps[0]).__name__)',
      out: '{dict} | fn     -> HELLO (5)\ndict became     : RunnableParallel',
      hl: [1, 2],
      caption: "`len` is a builtin, not a Runnable. The dict is a literal, not a RunnableParallel." },
    { t: "callout", kind: "mental", title: "Mental model: read a dict in a pipe as a fan-out", body: [
      { t: "p", text: "When you meet `{\"context\": retriever, \"question\": RunnablePassthrough()} | prompt | model` in real code, read it as: run these branches concurrently on the same input, collect a dict of their results, pass that dict on. It is a `RunnableParallel` with the constructor call left out." },
      { t: "p", text: "That one reading unlocks the standard RAG chain, which is the most-copied snippet in the ecosystem and the most opaque if you have not seen the coercion." }
    ] },
    { t: "h2", n: "03", id: "value", text: "A chain is a value", sub: "Inspectable before it runs" },
    { t: "code", lang: "text", title: "What you can ask a chain before invoking it",
      code: 'input_schema  : [\'q\']\nname          : (unnamed)\ngraph nodes   : 5',
      caption: "Schema, name and graph, all available with no execution." },
    { t: "p", text: "Because the expression builds a data structure rather than deferring a call, the chain can be examined. `input_schema` reports what it expects \u2014 derived from the prompt's variables. `get_graph()` returns a node-and-edge structure you can render. `with_config(run_name=...)` gives it a name that appears in traces." },
    { t: "callout", kind: "insight", title: "Why this matters at three in the morning", body: [
      { t: "p", text: "When a chain fails, the traceback goes through `RunnableSequence.invoke`, which 1.8 listed as a genuine cost of the framework. Knowing the chain is an object with a readable `.steps` list is what converts that from opaque to navigable: you can match the failing step index to a name." },
      { t: "p", text: "The habit worth forming is naming chains with `with_config(run_name=...)` as you build them. It costs nothing, changes no behaviour, and is the difference between a span tree you can filter and one that is forty rows of `RunnableSequence`." }
    ] },
    { t: "exercise", kind: "analysis", title: "Take a chain apart",
      difficulty: "core", minutes: 22,
      body: "Build a three-step chain and inspect what the pipe constructed. Confirm the step list is flat rather than nested, then extract a sub-chain into a variable and confirm the composed result is still flat. Demonstrate both coercions the pipe performs. Finally, inspect the chain's schema and graph without invoking it.",
      requirements: ["Print the chain's type and step list",
        "Show that a | b | c produces three steps rather than a nested pair",
        "Build a sub-chain into a variable and confirm the outer chain stays flat",
        "Show a dict literal becoming a RunnableParallel inside a pipe",
        "Show a bare function being coerced into a RunnableLambda",
        "Print the input schema and the graph node count without calling invoke"],
      hint: "`len(chain.steps)` answers the flatness question directly. For the coercion, check `type(chain.steps[0]).__name__` after piping a dict.",
      solution: { lang: "python", title: "x0202.py \u2014 what the pipe constructed",
        code: 'chain = prompt | model | StrOutputParser()\nprint(type(chain).__name__, len(chain.steps))\n\ninner = prompt | model\nouter = inner | StrOutputParser()\nprint([type(s).__name__ for s in outer.steps])\n\ncoerced = {"upper": RunnableLambda(str.upper), "len": len} | RunnableLambda(\n    lambda d: "%s (%d)" % (d["upper"], d["len"]))\nprint(coerced.invoke("hello"), type(coerced.steps[0]).__name__)\n\nprint(sorted(chain.input_schema.model_json_schema().get("properties", {}).keys()))\nprint(len(chain.get_graph().nodes))',
        out: "==============================================================================\nPART 1 -- what the pipe builds\n==============================================================================\n  type        : RunnableSequence\n  steps       : [\'ChatPromptTemplate\', \'FakeChatModel\', \'StrOutputParser\']\n  len(steps)  : 3\n\n  three steps in one flat sequence, not nested pairs -- LangChain\n  flattens a | b | c rather than building (a|b)|c.\n\n==============================================================================\nPART 2 -- a chain is a step\n==============================================================================\n  inner steps : [\'ChatPromptTemplate\', \'FakeChatModel\']\n  outer steps : [\'ChatPromptTemplate\', \'FakeChatModel\', \'StrOutputParser\']\n  outer is flat, not nested: True\n\n==============================================================================\nPART 3 -- coercion: dicts and functions become Runnables\n==============================================================================\n  {dict} | fn     -> HELLO (5)\n  dict became     : RunnableParallel\n  bare len became : RunnableLambda\n\n  a dict literal in a pipe becomes RunnableParallel; a bare function\n  becomes RunnableLambda. that is why the RAG idiom in 5.7 can be\n  written as a dict without mentioning RunnableParallel at all.\n\n==============================================================================\nPART 4 -- the chain is data, inspectable before it runs\n==============================================================================\n  input_schema  : [\'q\']\n  name          : (unnamed)\n  graph nodes   : 5\n\n  you can read the structure, name it, draw it and attach config to it\n  without invoking anything. a chain is a value.",
        notes: [
          { t: "p", text: "**Three steps in one flat sequence.** `a | b | c` evaluates as `(a | b) | c`, and a naive implementation would nest \u2014 LangChain flattens, which keeps both the step list and the trace meaningful." },
          { t: "p", text: "**Extracting a sub-chain into a variable changed nothing structurally.** The outer chain still has three steps, so naming parts of a long expression for readability costs no nesting, no trace depth and no performance. There is no reason to write one enormous expression." },
          { t: "p", text: "**A dict literal in a pipe becomes a RunnableParallel, and a bare builtin becomes a RunnableLambda.** Those two coercions are what make the standard RAG idiom readable without naming either class \u2014 and opaque if you have not seen them." },
          { t: "p", text: "**The schema, name and graph are all available before invoking.** The expression builds a value rather than deferring a call, which is what makes `.steps` navigable when a traceback points into `RunnableSequence.invoke`." },
          { t: "p", text: "The habit I would take from this is naming chains with `with_config(run_name=...)` while building them. No behaviour change, no cost, and it is the difference between a filterable span tree and forty rows all called RunnableSequence." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the RAG snippet nobody can read", body: [
      { t: "p", text: "A new engineer is handed the standard retrieval chain: a dict literal containing a retriever and a `RunnablePassthrough`, piped into a prompt, a model and a parser. They can run it and cannot modify it, because nothing in the expression says what the dict is doing." },
      { t: "p", text: "The missing fact is one line: a dict literal in a pipe is a `RunnableParallel`. Read it as \u201crun these branches on the same input, collect a dict of results, pass it on\u201d and the whole snippet becomes ordinary \u2014 the retriever branch produces context, the passthrough branch preserves the question, and the prompt consumes both by name." },
      { t: "p", text: "It is worth teaching explicitly rather than by exposure, because the coercion is the single biggest readability cliff in LCEL and it is invisible: there is no import, no constructor and no type annotation anywhere in the expression to hint that a class is involved." }
    ] }
  ],
  takeaways: [
    "**`a | b` is `a.__or__(b)`** and returns a RunnableSequence holding its steps.",
    "**The sequence is flat, not nested** \u2014 `a | b | c` gives three steps, not a sequence containing a sequence.",
    "**So naming a sub-chain in a variable is free**: no extra nesting, no trace depth, no cost.",
    "**A dict literal in a pipe becomes a RunnableParallel**, which is the standard RAG idiom's hidden class.",
    "**A bare function in a pipe becomes a RunnableLambda**, including builtins and `itemgetter`.",
    "**Those two coercions explain most LCEL that looks like magic**, and neither leaves an import to hint at it.",
    "**The chain is a value built at expression time**, not a deferred function call.",
    "**So you can read `.steps`, `input_schema` and `get_graph()` before invoking anything.**",
    "**That is what makes a traceback through `RunnableSequence.invoke` navigable** rather than opaque.",
    "**Name chains with `with_config(run_name=...)` as you build them** \u2014 free, behaviour-neutral, and the difference between a filterable trace and forty identical rows."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What does `prompt | model | parser` evaluate to?",
      options: ["A function that runs the three steps when called",
        "A RunnableSequence holding a flat list of three steps",
        "A nested pair: a sequence whose first element is another sequence",
        "A generator that yields each step's output in turn"],
      answer: 1,
      why: "The pipe is `__or__` and it returns a composite object immediately \u2014 the chain is a value built when the expression is evaluated, not a deferred call. LangChain flattens rather than nesting, so three piped steps produce three entries in `.steps`. That flatness is what keeps the step list and the trace meaningful, and it is why extracting a sub-chain into a variable costs nothing." },
    { stem: "`{\"context\": retriever, \"question\": RunnablePassthrough()} | prompt` \u2014 what is the dict?",
      options: ["A plain dict that the prompt template consumes as variables",
        "A RunnableParallel \u2014 the pipe coerces dict literals",
        "A configuration mapping applied to the prompt",
        "A RunnableBranch keyed by the dict's keys"],
      answer: 1,
      why: "The pipe coerces a dict literal into a RunnableParallel, so the branches run concurrently on the same input and their results are collected into a dict that the prompt then consumes by name. This is the standard RAG idiom, and the coercion is invisible \u2014 no import, no constructor, no annotation \u2014 which makes it the biggest readability cliff in LCEL for anyone who has not been told." },
    { stem: "You extract `inner = prompt | model` and then write `inner | parser`. What is the step count?",
      options: ["2 \u2014 the sub-chain counts as one step",
        "3 \u2014 the composition is flattened",
        "It depends on whether inner was invoked first",
        "4 \u2014 the sub-chain adds a wrapper node"],
      answer: 1,
      why: "Flattening happens whenever a sequence meets another step, so composing a named sub-chain with a further step yields the same flat sequence as writing the whole thing inline. That means naming parts of a long expression for readability has no structural, performance or observability cost \u2014 there is no reason to write one enormous unbroken pipe." },
    { stem: "Why is it useful that a chain is a value rather than a deferred call?",
      options: ["It allows LangChain to optimise the execution plan before running",
        "You can read its steps, schema and graph before invoking, which makes a traceback through RunnableSequence navigable",
        "It means chains can be pickled and sent between processes",
        "It guarantees the chain's type signature is checked at construction"],
      answer: 1,
      why: "The expression builds a data structure, so `.steps`, `input_schema` and `get_graph()` are all available with no execution. That is what converts an opaque traceback through RunnableSequence.invoke into something you can match to a named step. It does not give type checking \u2014 1.7 showed there is none between steps \u2014 and no execution plan is being optimised." }
  ] },
  interview: { title: "Interview practice", sub: "How LCEL composes", questions: [
    { level: "core", q: "What does the pipe operator actually do?",
      strong: "A strong answer says it builds a value, and mentions flattening.",
      answer: [
        { t: "p", text: "It is `__or__`, and it returns a RunnableSequence holding its steps. The important part is that this happens when the expression is evaluated, so the chain is a value \u2014 not a function waiting to be called." },
        { t: "p", text: "And the sequence is flat. a-pipe-b-pipe-c evaluates as open-paren-a-pipe-b-close-pipe-c, so a naive implementation would give you a sequence containing a sequence. LangChain flattens, which means three piped steps give three entries in dot-steps." },
        { t: "p", text: "The practical consequence I would mention is that naming a sub-chain in a variable is free. Because flattening happens whenever a sequence meets another step, pulling part of a long expression out for readability adds no nesting, no trace depth and no cost. People write one enormous unbroken pipe because they assume otherwise." },
        { t: "p", text: "The other consequence is debuggability. 1.8's honest list of framework costs includes traceback indirection \u2014 a failure is inside a step inside a sequence. Knowing the sequence is an object with a readable steps list is what makes that navigable rather than opaque." }
      ] },
    { level: "core", q: "Someone hands you the standard RAG chain and cannot read it. Explain it.",
      strong: "A strong answer identifies the dict coercion as the missing fact.",
      answer: [
        { t: "p", text: "The missing fact is one line: a dict literal inside a pipe is coerced into a RunnableParallel. Once you know that, the snippet becomes ordinary." },
        { t: "p", text: "Read it as: run these branches concurrently on the same input, collect a dict of their results, and pass that dict to the next step. So the retriever branch produces the context, the passthrough branch preserves the original question, and the prompt template consumes both by name because its variables match the dict keys." },
        { t: "p", text: "There is a second coercion in most versions of that snippet too \u2014 a bare function like format_docs becomes a RunnableLambda. Same mechanism." },
        { t: "p", text: "I would teach this explicitly rather than hoping people absorb it, because the coercion is genuinely invisible. There is no import, no constructor call and no type annotation anywhere in the expression to suggest a class is involved. It is the biggest readability cliff in LCEL and it is one sentence to clear." }
      ] },
    { level: "advanced", q: "How would you make a complex chain easier to debug in production?",
      strong: "A strong answer uses run_name and the chain's inspectability.",
      answer: [
        { t: "p", text: "Name things, while building them. with_config with a run_name costs nothing, changes no behaviour, and is the difference between a span tree you can filter and forty rows all called RunnableSequence." },
        { t: "p", text: "I would also break the chain into named sub-chains rather than writing one expression, because flattening means that is structurally free. The step list stays flat and the source becomes readable, which is pure gain." },
        { t: "p", text: "Then I would lean on the chain being a value. Before it ever runs you can read dot-steps, you can print the input schema to see what it expects, and get_graph gives you a node and edge structure you can render. When a traceback points into RunnableSequence.invoke, being able to match the failing step index against a named list is what makes the difference." },
        { t: "p", text: "The thing I would add beyond naming is a type check at the boundaries of custom components, because LCEL does not check types between steps \u2014 a list meeting a step that expects a string produces a silently wrong answer rather than an error. Naming helps you find a failure; an isinstance check turns a non-failure into one." }
      ] }
  ] }
});
