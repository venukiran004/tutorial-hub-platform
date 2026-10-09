EC.receiveLesson({
  id: "3.1",
  lede: "A tool is a function the model is allowed to call, and the `@tool` decorator turns one into a name, a description and an argument schema \u2014 all three of which are sent to the model. The description is the field that decides whether the tool gets called at all, which makes it **prompt rather than documentation**, and the difference is concrete: \u201cLooks up an order\u201d says what the function does and nothing about when to use it, which is accurate and useless. Argument constraints work the same way as 1.5's schemas: `Field(ge=1, le=20)` is both communicated and enforced. And a `ToolException` is the **right** way to fail, because an agent catches it and hands it back to the model to fix.",
  objectives: [
    "Describe what @tool builds and which parts the model receives",
    "Write a description that says when to use a tool rather than what it does",
    "Use args_schema to constrain and document arguments",
    "Raise ToolException so a model can recover from a bad argument",
    "Explain why an unhandled exception in a tool is worse than a ToolException"
  ],
  prerequisites: ["1.6", "2.9"],
  blocks: [
    { t: "h2", n: "01", id: "builds", text: "What @tool builds", sub: "Three things, all sent to the model" },

    {"kind": "tree", "title": "What the decorator sends to the model", "caption": "All three parts are sent. The **description** is the field that decides whether the tool gets called at all — which makes it prompt, written in a docstring, and the only part of a tool that is tuned rather than implemented.", "root": {"label": "@tool", "sub": "def lookup_order(order_id: str) -> str", "tone": "accent", "children": [{"label": "name", "sub": "the function name", "tone": "good", "edge": "sent"}, {"label": "description", "sub": "the docstring — decides IF it is called", "tone": "crit", "edge": "sent"}, {"label": "argument schema", "sub": "from the type hints", "tone": "good", "edge": "sent"}]}, "t": "diagram", "id": "dg-3_1-01-0"},




    { t: "code", lang: "python", title: "A function becomes a tool",
      code: '@tool\ndef calculate(expression: str) -> str:\n    """Evaluate a mathematical expression. Use for any arithmetic."""\n    return str(eval(expression, {"__builtins__": {}}, {}))\n\nprint(calculate.name)\nprint(calculate.description)\nprint(calculate.args)',
      out: "name        : calculate\ndescription : Evaluate a mathematical expression. Use for any arithmetic.\nargs        : {'expression': {'title': 'Expression', 'type': 'string'}}",
      caption: "The docstring became the description. The type hints became the schema." },
    { t: "p", text: "All three travel to the model as part of the tool definition. The name and the schema are mechanical; the description is the part you write, and it is the part that does the work." },
    { t: "h2", n: "02", id: "description", text: "The description is prompt", sub: "Not documentation, and the difference is measurable in behaviour" },
    { t: "table", head: ["Description", "What the model can tell"], rows: [
      ["*(empty)*", "only the name \u2014 it is guessing from `lookup_order`"],
      ["\u201cLooks up an order.\u201d", "accurate, and says nothing about **when**"],
      ["\u201cLook up an order by its id. Use for any question about a specific order, including status, delivery date or contents.\u201d", "which questions this tool answers"]
    ] },
    { t: "callout", kind: "insight", title: "Write the trigger, not the behaviour", body: [
      { t: "p", text: "A docstring written for a colleague says what the function does, because the reader already knows why they are looking at it. A tool description is read by something that is **choosing**, so it has to say what kind of question this answers \u2014 and ideally what it does not." },
      { t: "p", text: "This is the single most common reason an agent ignores a tool that would have answered the question perfectly. Before suspecting the model, read the description and ask whether it tells you when to reach for this rather than something else." }
    ] },
    { t: "p", text: "Two tools with overlapping descriptions is the other half of the same problem. If `search_docs` and `search_tickets` both say \u201csearch for information\u201d, the model is choosing at random, and no amount of instruction in the system prompt fixes a specification problem." },
    { t: "h2", n: "03", id: "schema", text: "Rich signatures", sub: "Constraints that are communicated and enforced" },
    { t: "code", lang: "python", title: "args_schema with Pydantic",
      code: 'class SearchArgs(BaseModel):\n    query: str = Field(description="search terms")\n    top_k:  int = Field(default=5, ge=1, le=20, description="how many hits")\n\nsearch_tool = StructuredTool.from_function(\n    _search, name="search",\n    description="Search the docs. Use when the answer is likely to be in "\n                "documentation rather than in an order record.",\n    args_schema=SearchArgs)',
      out: "args : {'query': {...}, 'top_k': {'default': 5, 'maximum': 20, 'minimum': 1, ...}}\nok   : ['hit 0 for \\'retry\\'', 'hit 1 for \\'retry\\'']\ntop_k=99 -> ValidationError (ge/le enforced, like 1.5)",
      caption: "The bounds appear in the schema the model sees and are checked on the way in." },
    { t: "p", text: "Exactly 1.5's argument in a different place: a constraint in the prompt is a request, a constraint in the schema is a request **and** a guarantee. A model asking for 500 results gets a validation error rather than an expensive query." },
    { t: "h2", n: "04", id: "errors", text: "Failing usefully", sub: "ToolException is a message, not a crash" },
    { t: "code", lang: "python", title: "A recoverable failure",
      code: '@tool\ndef get_user(user_id: str) -> str:\n    """Look up a user by NUMERIC id."""\n    if not user_id.isdigit():\n        raise ToolException("user_id must be numeric, got %r" % user_id)\n    return "user %s" % user_id',
      out: "get_user('42')      -> user 42\nget_user('alice')   -> ToolException: user_id must be numeric, got 'alice'",
      caption: "The message is written for the model, because the model is what reads it." },
    { t: "callout", kind: "good", title: "Error messages are prompt too", body: [
      { t: "p", text: "Inside an agent, a `ToolException` is caught and returned to the model as a `ToolMessage`, so the model sees the text and can correct its own argument and try again. That makes the message a prompt: \u201cuser_id must be numeric, got 'alice'\u201d tells it what to fix; \u201cinvalid input\u201d does not." },
      { t: "p", text: "An unhandled exception does the opposite \u2014 it propagates out of the loop and kills the run. 3.7 shows both, and the difference between a self-correcting agent and a 500 is which kind of exception a tool raises." }
    ] },
    { t: "exercise", kind: "build", title: "Write a tool the model will actually call",
      difficulty: "core", minutes: 24,
      body: "Define a tool with the decorator and inspect everything it sends to the model. Compare three descriptions of the same function and say what each lets the model infer. Build a tool with a Pydantic args_schema including a bounded integer, and confirm the bound is enforced. Then raise a ToolException on a bad argument and explain what an agent does with it.",
      requirements: ["Print a tool's name, description, args and generated JSON schema",
        "Compare an empty description, a what-it-does description and a when-to-use-it description",
        "Build a StructuredTool with an args_schema containing a ge/le constrained field",
        "Show a valid call and a call that violates the bound",
        "Raise ToolException for an invalid argument and show the message",
        "State what an agent does with a ToolException versus an unhandled exception"],
      hint: "The schema is what the model is shown, so print it. For the description comparison, ask what each one tells a chooser rather than a reader.",
      solution: { lang: "python", title: "x0301.py \u2014 name, description, schema, failure",
        code: 'from langchain_core.tools import tool, StructuredTool, ToolException\nfrom pydantic import BaseModel, Field\n\n@tool\ndef calculate(expression: str) -> str:\n    """Evaluate a mathematical expression. Use for any arithmetic."""\n    return str(eval(expression, {"__builtins__": {}}, {}))\n\nprint(calculate.name, calculate.description, calculate.args)\nprint(calculate.args_schema.model_json_schema())\n\nclass SearchArgs(BaseModel):\n    query: str = Field(description="search terms")\n    top_k:  int = Field(default=5, ge=1, le=20, description="how many hits")\n\nsearch_tool = StructuredTool.from_function(_search, name="search",\n                                           description="...", args_schema=SearchArgs)\n\n@tool\ndef get_user(user_id: str) -> str:\n    """Look up a user by NUMERIC id."""\n    if not user_id.isdigit():\n        raise ToolException("user_id must be numeric, got %r" % user_id)\n    return "user %s" % user_id',
        out: "==============================================================================\nPART 1 -- what @tool builds from a function\n==============================================================================\n  name        : calculate\n  description : Evaluate a mathematical expression. Use for any arithmetic.\n  args        : {'expression': {'title': 'Expression', 'type': 'string'}}\n  schema sent to the model:\n    {\n  \"description\": \"Evaluate a mathematical expression. Use for any arithmetic.\",\n  \"properties\": {\n    \"expression\": {\n      \"title\": \"Expression\",\n      \"type\": \"string\"\n    }\n  },\n  \"required\": [\n    \"expression\"\n  ],\n  \"title\": \"calcula\n\n  the DOCSTRING became the description. that is the field the model\n  reads when deciding whether to call this tool, so it is prompt.\n\n==============================================================================\nPART 2 -- three descriptions for the same function\n==============================================================================\n  none           (empty)                                                       \n                 -> the model sees only the name\n  what it does   Looks up an order.                                            \n                 -> accurate, and says nothing about WHEN\n  when to use it Look up an order by its id. Use for any question about a speci\n                 -> tells the model which questions this answers\n\n  a description that says what the function DOES is documentation.\n  one that says WHEN TO USE IT is prompt. the second is what makes an\n  agent pick the right tool, and the first is what most codebases have.\n\n==============================================================================\nPART 3 -- rich signatures with args_schema\n==============================================================================\n  args : {'query': {'description': 'search terms', 'title': 'Query', 'type': 'string'}, 'top_k': {'default': 5, 'description': 'how many hits', 'maximum': 20, 'minimum': 1, 'title': 'Top K', 'type': 'integer'}}\n  ok   : [\"hit 0 for 'retry'\", \"hit 1 for 'retry'\"]\n  top_k=99 -> ValidationError (ge/le enforced, like 1.5)\n\n==============================================================================\nPART 4 -- tool errors the model can recover from\n==============================================================================\n  get_user('42'   ) -> user 42\n  get_user('alice') -> ToolException: user_id must be numeric, got 'alice'\n\n  a ToolException is the RIGHT failure: inside an agent it is caught\n  and returned to the model as a ToolMessage, so the model can fix its\n  own argument and try again. an unhandled exception kills the run.",
        notes: [
          { t: "p", text: "**The docstring became the description and the type hints became the schema**, and all three \u2014 name, description, arguments \u2014 are sent to the model. Only the description is something you write rather than derive." },
          { t: "p", text: "**A description that says what the function does is documentation; one that says when to use it is prompt.** \u2018Looks up an order\u2019 is accurate and tells a chooser nothing. The third version names the questions it answers, which is what the model is actually deciding between." },
          { t: "p", text: "**That is the commonest reason an agent ignores a usable tool**, and the related failure is two tools whose descriptions overlap \u2014 at which point the model is choosing at random and no system-prompt instruction fixes it, because it is a specification problem." },
          { t: "p", text: "**`Field(ge=1, le=20)` appeared in the schema and was enforced on the way in.** Same as 1.5: a constraint in prompt text is a request, a constraint in a schema is a request and a guarantee. A model asking for 500 results gets a validation error, not an expensive query." },
          { t: "p", text: "**`ToolException` is the right failure, and its message is prompt.** Inside an agent it comes back to the model as a ToolMessage, so \u2018user_id must be numeric, got alice\u2019 lets the model correct itself while \u2018invalid input\u2019 does not. An unhandled exception propagates out of the loop and kills the run instead." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the tool nobody calls", body: [
      { t: "p", text: "An agent has a `search_knowledge_base` tool and keeps answering policy questions from its own knowledge, confidently and sometimes wrongly. The tool works when called directly. The team adds \u201calways use your tools when possible\u201d to the system prompt and the rate barely moves." },
      { t: "p", text: "The description is `\"Searches the knowledge base.\"` The model has no way to know that a question about refund policy is a knowledge-base question rather than something it already knows. The instruction treats a specification problem as a motivation problem, which is why it did not help." },
      { t: "p", text: "Rewriting it to name the triggers \u2014 \u201cuse for any question about company policy, including refunds, returns, warranties and escalation; prefer this over answering from memory\u201d \u2014 is usually the entire fix. The general habit: when an agent misbehaves around tools, read what the model was told about them before touching the system prompt." }
    ] }
  ],
  takeaways: [
    "**`@tool` builds a name, a description and an argument schema**, and all three are sent to the model.",
    "**The description is the only part you write**, and it is what decides whether the tool is called.",
    "**Write the trigger, not the behaviour** \u2014 what kind of question this answers, and ideally what it does not.",
    "**\u201cLooks up an order\u201d is accurate and useless to a chooser.**",
    "**Overlapping descriptions make the model choose at random**, and a system-prompt instruction cannot fix a specification problem.",
    "**`args_schema` constraints are communicated and enforced** \u2014 the same guarantee as 1.5's structured output.",
    "**A `ToolException` is caught by an agent and returned as a ToolMessage**, so the model can correct its own argument.",
    "**Which makes the error message prompt**: say what to fix, not that something was invalid.",
    "**An unhandled exception propagates out of the loop and kills the run.**",
    "**When an agent misbehaves around tools, read the descriptions before touching the system prompt.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "An agent never calls a tool that would answer the question. Where do you look first?",
      options: ["The system prompt, to instruct it to use tools more",
        "The tool's description, since that is what the model reads when choosing",
        "The model's temperature, which affects decisiveness",
        "The argument schema, which may be rejecting the call"],
      answer: 1,
      why: "The description is sent to the model and is what it weighs when choosing between tools or answering directly. The usual defects are a description that says what the function does rather than when to use it, or two tools whose descriptions overlap. Adding \u201calways use your tools\u201d to the system prompt treats a specification problem as a motivation problem \u2014 if the model cannot tell the tool is relevant, urging it to try harder supplies no missing information." },
    { stem: "Why is `Field(ge=1, le=20)` better than writing \u201ckeep top_k under 20\u201d in the description?",
      options: ["It is shorter and keeps the description focused",
        "It appears in the schema the model sees *and* is enforced on the way in \u2014 a request and a guarantee",
        "Descriptions are truncated by most providers",
        "Pydantic clamps out-of-range values into the valid range"],
      answer: 1,
      why: "The constraint is in the JSON schema the model receives, so it does everything the sentence would, and it is validated when the arguments arrive, so a model asking for 500 results gets a validation error rather than an expensive query. Nothing is clamped \u2014 out of range raises, which is the behaviour you want. This is 1.5's point about schema constraints, in a different place." },
    { stem: "A tool raises ToolException instead of a plain exception. What changes inside an agent?",
      options: ["Nothing \u2014 both propagate and end the run",
        "It is caught and returned to the model as a ToolMessage, so the model can correct its argument and retry",
        "The agent retries the tool automatically with the same arguments",
        "The run is logged as a warning rather than an error"],
      answer: 1,
      why: "A ToolException becomes a ToolMessage the model reads, which turns the error text into prompt \u2014 \u201cuser_id must be numeric, got 'alice'\u201d tells it exactly what to fix, while \u201cinvalid input\u201d does not. An unhandled exception propagates out of the loop and kills the run. The difference between a self-correcting agent and a 500 is often which kind of exception a tool raises." },
    { stem: "Two tools are described as \u201csearch for information\u201d and \u201cfind relevant content\u201d. What is the consequence?",
      options: ["The model will call both and merge the results",
        "The model is effectively choosing at random, and no system-prompt wording fixes it",
        "LangChain will raise at bind time for ambiguous tools",
        "The first registered tool always wins"],
      answer: 1,
      why: "The descriptions are the only basis for choosing, so interchangeable descriptions mean an arbitrary choice. Nothing validates this at bind time and there is no deterministic tie-break. It is a specification problem, so the fix is to make the descriptions distinguish the cases \u2014 which sources each covers, which question types belong to each \u2014 rather than to add instructions about being careful." }
  ] },
  interview: { title: "Interview practice", sub: "Defining tools", questions: [
    { level: "core", q: "What makes a good tool definition?",
      strong: "A strong answer treats the description as prompt.",
      answer: [
        { t: "p", text: "The decorator gives you three things \u2014 a name, a description and an argument schema \u2014 and all three go to the model. Only the description is something you write rather than derive, and it is the one that decides whether the tool gets called." },
        { t: "p", text: "So I write it as prompt, not documentation. A docstring for a colleague says what the function does, because they already know why they are reading it. A tool description is read by something that is choosing, so it has to say what kind of question this answers and ideally what it does not. 'Looks up an order' is accurate and tells a chooser nothing." },
        { t: "p", text: "On the arguments, I put constraints in Field rather than in the description text. Field with ge and le appears in the schema the model sees and is enforced when the arguments arrive, so it is a request and a guarantee. A model asking for five hundred results gets a validation error rather than an expensive query." },
        { t: "p", text: "And I raise ToolException rather than letting exceptions escape, with a message written for the model. Inside an agent that comes back as a ToolMessage, so the model can fix its own argument \u2014 'user_id must be numeric, got alice' is recoverable and 'invalid input' is not." }
      ] },
    { level: "core", q: "Your agent ignores a tool that would answer the question. Diagnose it.",
      strong: "A strong answer reads the description before touching the prompt.",
      answer: [
        { t: "p", text: "I would read the tool's description before anything else, because that is what the model actually sees when deciding. The usual finding is a description that says what the function does rather than when to use it." },
        { t: "p", text: "The second thing I would check is whether two tools overlap. If search-docs and search-tickets both say something like 'search for information', the model is choosing at random and there is no tie-break anywhere \u2014 nothing validates that at bind time." },
        { t: "p", text: "The third is what was actually bound, because that is easy to get wrong silently: a tool list built conditionally, or a bound model that got rebuilt somewhere and lost its tools." },
        { t: "p", text: "What I would push back on is the instinctive fix, which is adding 'always use your tools when possible' to the system prompt. That treats a specification problem as a motivation problem. If the model cannot tell from the description that this tool answers this question, telling it to try harder does not supply the missing information \u2014 and in my experience the rate barely moves." }
      ] },
    { level: "advanced", q: "How should a tool fail?",
      strong: "A strong answer makes the error message part of the prompt.",
      answer: [
        { t: "p", text: "With a ToolException whose message is written for the model, because inside an agent that is exactly who reads it \u2014 it comes back as a ToolMessage and the model gets another turn." },
        { t: "p", text: "That makes the error text prompt. 'user_id must be numeric, got alice' tells the model what to change, and it will usually retry correctly on the next step. 'Invalid input' or a bare ValueError tells it nothing actionable, so it either gives up or guesses again the same way." },
        { t: "p", text: "An unhandled exception is the bad case: it propagates out of the loop and kills the run, so a recoverable argument mistake becomes a 500. That is the difference between a self-correcting agent and an incident, and it comes down to which exception type a tool raises." },
        { t: "p", text: "The caveat is that not everything should be recoverable. If a tool fails because a downstream service is down, handing that back to the model invites it to retry in a loop until the iteration cap. So I would use ToolException for things the model can fix \u2014 arguments, scope, permissions it could route around \u2014 and let infrastructure failures escape to the orchestrator, which is what module 14 is about." }
      ] }
  ] }
});
