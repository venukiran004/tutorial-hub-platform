EC.receiveLesson({
  id: "3.2",
  lede: "The tool protocol is two ordinary messages and an id. `bind_tools` attaches the definitions; the model replies with an **`AIMessage` whose content is empty and whose `tool_calls` list is populated**; you execute the call and append a **`ToolMessage` carrying the matching `tool_call_id`**. That id is the whole mechanism, and it becomes load-bearing the moment a model issues two calls in one turn \u2014 you must append one ToolMessage per call, each correctly matched. Missing one is the most common tool-protocol bug there is, because the provider rejects the *next* request for a call that went unanswered.",
  objectives: [
    "Attach tools with bind_tools and read what comes back",
    "Execute a tool call and answer it with a correctly-matched ToolMessage",
    "Handle parallel tool calls in a single turn",
    "Explain what happens when a call goes unanswered",
    "Use tool_choice to force or forbid tool use"
  ],
  prerequisites: ["3.1"],
  blocks: [
    { t: "h2", n: "01", id: "bind", text: "bind_tools and the reply", sub: "An assistant turn whose content is a request" },
    { t: "code", lang: "python", title: "What comes back",
      code: 'bound = model.bind_tools([calculate, lookup_order])\nr = bound.invoke([HumanMessage(content="what is 42 times 17?")])\n\nprint(type(r).__name__)\nprint(repr(r.content))\nprint(r.tool_calls)',
      out: "type        : AIMessage\ncontent     : ''\ntool_calls  : [{'name': 'calculate', 'args': {'expression': '42*17'}, 'id': 'c1', 'type': 'tool_call'}]",
      caption: "Empty content, a populated tool_calls list. Not a special message type." },
    { t: "p", text: "1.2 made this point and it is worth repeating here because everything else depends on it: there is no `ToolCallMessage`. A request to call a tool is an assistant turn, exactly like a prose answer, whose content happens to be structured." },
    { t: "h2", n: "02", id: "answer", text: "Executing and answering", sub: "The id ties the two together" },
    { t: "code", lang: "python", title: "One round trip",
      code: 'call = r.tool_calls[0]\nresult = tool_map[call["name"]].invoke(call["args"])\ntm = ToolMessage(content=str(result), tool_call_id=call["id"])\n\nmessages = [HumanMessage(content="what is 42 times 17?"), r, tm]',
      out: "executed    : 714\nToolMessage : '714' id= c1\n\n   Human:    what is 42 times 17?\n   AI:                     tool_calls=[('calculate', {'expression': '42*17'})]\n   Tool:     714",
      caption: "Three messages: the question, the request, the answer. The model is then re-invoked with all three." },
    { t: "callout", kind: "mental", title: "Mental model: a tool call is a conversation", body: [
      { t: "p", text: "The model asks, something answers, and the answer joins the transcript. That is why the result has to be a message rather than a return value \u2014 the model's next turn reads the whole list, so the tool's output must be *in* the list to be visible." },
      { t: "p", text: "It also explains why tool output counts against the context window exactly like everything else. A tool that returns a 40 KB JSON blob has put 40 KB into every subsequent turn of the conversation, which 13.1 prices." }
    ] },
    { t: "h2", n: "03", id: "parallel", text: "Several calls in one turn", sub: "Where the id stops being decoration" },
    { t: "code", lang: "text", title: "Two calls, two answers",
      code: 'one AIMessage, 2 tool_calls\n  ToolMessage id=a   714\n  ToolMessage id=b   {"id": "A-1", "status": "shipped", "eta": "2026-10-12"}',
      caption: "One ToolMessage per call, each carrying the id it answers." },
    { t: "callout", kind: "warn", title: "An unanswered call breaks the next request", body: [
      { t: "p", text: "If an AIMessage contains two tool calls and you append only one ToolMessage, the conversation is malformed. The failure does not happen when you build the list \u2014 it happens on the **next** model call, when the provider rejects a transcript containing a request with no response." },
      { t: "p", text: "That displacement is what makes it hard to debug: the error arrives one step after the mistake, and it names the unanswered id rather than the code path that skipped it. The usual cause is a loop that `break`s or `continue`s on the first failure." }
    ] },
    { t: "p", text: "The rule is mechanical and worth enforcing in code: **iterate over every call, and append exactly one ToolMessage for each, including the ones that failed.** A failure is answered with an error string, not with silence \u2014 which is the same point 3.1 made about `ToolException`." },
    { t: "h2", n: "04", id: "choice", text: "tool_choice", sub: "Forcing, forbidding and letting it decide" },
    { t: "table", head: ["Setting", "Meaning", "When"], rows: [
      ["`\"auto\"`", "the model decides (default)", "a real agent"],
      ["`\"any\"`", "the model must call *some* tool", "when answering from memory is never acceptable"],
      ["`\"calculate\"`", "the model must call *this* tool", "argument extraction"],
      ["`parallel_tool_calls=False`", "at most one call per turn", "when order matters or calls have side effects"]
    ] },
    { t: "callout", kind: "insight", title: "Forcing one tool is structured output again", body: [
      { t: "p", text: "`tool_choice=\"calculate\"` turns the model into an argument extractor: it is not deciding anything, it is filling a schema from natural language. That is exactly what `with_structured_output` does in 1.5 \u2014 same mechanism, different entry point." },
      { t: "p", text: "Which is useful to know, because it means the failure mode is the same too. If the model cannot produce the arguments it may produce none, and you are back to checking for an empty `tool_calls` list rather than assuming one is there." }
    ] },
    { t: "diagram", kind: "steps", title: "The tool protocol is two messages and an id",
      caption: "There is no hidden machinery. The `tool_call_id` is the whole correspondence mechanism — it is how a result is matched to the request that asked for it, which is what makes parallel tool calls possible at all.",
      items: [
        { label: "bind_tools([lookup_order])", desc: "attaches the definitions to the model; returns a new bound model", tone: "accent", code: "your code" },
        { label: "AIMessage(content=“”, tool_calls=[…])", desc: "content is EMPTY and tool_calls is populated — the model asked, it did not answer", tone: "violet", code: "the model" },
        { label: "execute the call yourself", desc: "the model cannot run anything; nothing happens unless you do it", tone: "warn", code: "your code" },
        { label: "ToolMessage(content, tool_call_id=…)", desc: "appended to the history, carrying the id it is answering", tone: "good", code: "your code" }
      ] },
    { t: "exercise", kind: "build", title: "Run the protocol by hand",
      difficulty: "core", minutes: 26,
      body: "Bind two tools to a model and inspect the response's type, content and tool_calls. Execute the call, build a correctly matched ToolMessage, and print the resulting three-message transcript. Then handle an AIMessage containing two parallel calls, producing one ToolMessage for each. Finally, tabulate the tool_choice settings and say what each is for.",
      requirements: ["Bind at least two tools and show which were bound",
        "Print the response type, its content and its tool_calls",
        "Execute a call and build a ToolMessage with the matching id",
        "Print the three-message transcript as a trace",
        "Handle an AIMessage with two tool calls, producing two matched ToolMessages",
        "State what happens if one call goes unanswered",
        "Tabulate auto, any, a named tool, and parallel_tool_calls=False"],
      hint: "The id is the whole mechanism. Try to describe what would go wrong if you matched the ToolMessages to the calls in the wrong order.",
      solution: { lang: "python", title: "x0302.py \u2014 two messages and an id",
        code: 'bound = model.bind_tools([calculate, lookup_order])\nr = bound.invoke([HumanMessage(content="what is 42 times 17?")])\nprint(type(r).__name__, repr(r.content), r.tool_calls)\n\ntool_map = {t.name: t for t in (calculate, lookup_order)}\ncall = r.tool_calls[0]\nresult = tool_map[call["name"]].invoke(call["args"])\ntm = ToolMessage(content=str(result), tool_call_id=call["id"])\n\n# parallel calls in one turn\nmulti = AIMessage(content="", tool_calls=[\n    {"name": "calculate",    "args": {"expression": "2+2"},  "id": "a"},\n    {"name": "lookup_order", "args": {"order_id": "A-1"},   "id": "b"}])\nouts = [ToolMessage(content=str(tool_map[c["name"]].invoke(c["args"])),\n                    tool_call_id=c["id"]) for c in multi.tool_calls]',
        out: "==============================================================================\nPART 1 -- bind_tools, and what the model gets\n==============================================================================\n  tools bound : ['calculate', 'lookup_order']\n\n  the response:\n    type        : AIMessage\n    content     : ''\n    tool_calls  : [{'name': 'calculate', 'args': {'expression': '42*17'}, 'id': 'c1', 'type': 'tool_call'}]\n\n  an AIMessage with EMPTY content and a tool_calls list. not a special\n  message type -- an assistant turn whose content is a request.\n\n==============================================================================\nPART 2 -- executing it and answering with a ToolMessage\n==============================================================================\n  executed    : 714\n  ToolMessage : '714' id= c1\n\n  the id is what ties the answer to the request. with two parallel\n  calls in one turn, the ids are the only thing distinguishing them.\n\n==============================================================================\nPART 3 -- the full message list after one round trip\n==============================================================================\n   Human:    what is 42 times 17?\n   AI:         tool_calls=[('calculate', {'expression': '42*17'})]\n   Tool:     714\n\n  three messages: the question, the request, the answer. the model is\n  then re-invoked with all three and produces prose.\n\n==============================================================================\nPART 4 -- parallel tool calls in one turn\n==============================================================================\n  one AIMessage, 2 tool_calls\n    ToolMessage id=a   4\n    ToolMessage id=b   {\"id\": \"A-1\", \"status\": \"shipped\", \"eta\": \"202\n\n  you must append ONE ToolMessage per call, each with the matching id.\n  missing one is the single most common tool-protocol bug -- the\n  provider rejects the next request because a call went unanswered.\n\n==============================================================================\nPART 5 -- tool_choice\n==============================================================================\n  bind_tools(tools, tool_choice='auto'      ) the model decides (default)\n  bind_tools(tools, tool_choice='any'       ) the model MUST call some tool\n  bind_tools(tools, tool_choice='calculate' ) the model must call THIS tool\n\n  forcing a specific tool turns the model into an argument extractor,\n  which is often what you actually want -- and is 1.5's structured\n  output under a different name.",
        notes: [
          { t: "p", text: "**The reply is an AIMessage with empty content and a populated tool_calls list.** There is no dedicated message type for a tool request \u2014 it is an assistant turn whose content happens to be structured, which is the fact everything else in the protocol rests on." },
          { t: "p", text: "**The `tool_call_id` is the whole mechanism.** One ToolMessage answers one call, and with two parallel calls in a turn the ids are the only thing distinguishing which answer belongs to which request." },
          { t: "p", text: "**The tool's output has to be a message, not a return value**, because the model's next turn reads the whole list \u2014 so the result must be *in* the list to be visible. That also means tool output counts against the context window like everything else: a tool returning 40 KB of JSON has put 40 KB into every subsequent turn." },
          { t: "p", text: "**An unanswered call breaks the NEXT request, not the current one.** The provider rejects a transcript containing a request with no response, so the error arrives one step after the mistake and names an id rather than the code path that skipped it. The usual cause is a loop that breaks or continues on the first failure." },
          { t: "p", text: "**So append one ToolMessage per call, including for failures** \u2014 answered with an error string rather than with silence, which is 3.1's ToolException point from the protocol side." },
          { t: "p", text: "**`tool_choice` with a named tool is structured output under another name**: the model stops deciding and starts extracting arguments into a schema. Same mechanism as 1.5, and the same failure \u2014 it can still produce no call at all, so check the list rather than assuming." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the error that names an id", body: [
      { t: "p", text: "An agent fails intermittently with a provider error complaining about a tool call id with no corresponding response. It never happens in testing, the id in the message is meaningless, and the stack trace points at the model call rather than at anything that looks wrong." },
      { t: "p", text: "Somewhere the loop stopped early. The common shapes are a `break` after the first tool error, a `continue` that skips appending on an exception path, or a filter that drops calls for tools the agent decided not to run. Each leaves a request in the transcript with no answer, and the next model call is where it surfaces." },
      { t: "p", text: "It is absent in testing because single-tool-call turns are the norm and parallel calls are what expose it \u2014 so the trigger is a question that happens to need two lookups. The fix is structural rather than a patch: make the loop append exactly one ToolMessage per call unconditionally, with failures answered by an error string, so there is no code path that can skip one." }
    ] }
  ],
  takeaways: [
    "**`bind_tools` attaches definitions; the reply is an `AIMessage` with empty content and a `tool_calls` list.**",
    "**There is no ToolCallMessage** \u2014 a tool request is an assistant turn whose content is structured.",
    "**`ToolMessage` answers it, carrying the matching `tool_call_id`**, and that id is the entire mechanism.",
    "**The result has to be a message because the model's next turn reads the whole list.**",
    "**So tool output counts against the context window** \u2014 a 40 KB JSON return rides in every later turn.",
    "**One AIMessage can contain several calls**, and the ids are the only thing distinguishing the answers.",
    "**An unanswered call breaks the NEXT request**, so the error arrives one step after the mistake.",
    "**The usual cause is a loop that breaks or continues on a failure path.**",
    "**Append exactly one ToolMessage per call, including for failures**, answered with an error string.",
    "**`tool_choice=\"any\"` forbids answering from memory; a named tool turns the model into an argument extractor**, which is 1.5's structured output again.",
    "**`parallel_tool_calls=False` when order matters or calls have side effects.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A model issues two tool calls in one turn and you append only one ToolMessage. When does it fail?",
      options: ["Immediately, when the ToolMessage is constructed",
        "On the next model call, when the provider rejects a transcript with an unanswered request",
        "Never \u2014 unanswered calls are silently dropped",
        "When the agent hits its iteration cap"],
      answer: 1,
      why: "The malformed transcript is only validated when it is sent, so the error arrives one step after the mistake and names an unanswered id rather than the code that skipped it. That displacement is what makes it hard to debug, and it is usually absent in testing because single-call turns are the norm \u2014 parallel calls are what expose a loop that breaks or continues on a failure path." },
    { stem: "Why must a tool's result be a ToolMessage rather than just a Python return value?",
      options: ["Because the provider validates message types",
        "Because the model's next turn reads the whole message list, so the result must be in the list to be visible",
        "Because return values cannot carry the tool_call_id",
        "Because LangChain serialises messages for tracing"],
      answer: 1,
      why: "The model has no memory between calls \u2014 everything it knows comes from the message list it is handed. A tool result that is not in the list does not exist as far as the next turn is concerned. The direct consequence is that tool output consumes context exactly like any other message, so a tool returning a large JSON blob puts that blob into every subsequent turn of the conversation." },
    { stem: "What does `tool_choice=\"calculate\"` turn the model into?",
      options: ["A validator that checks the tool's arguments",
        "An argument extractor \u2014 it is not choosing, it is filling a schema, which is structured output under another name",
        "A router that must pick between calculate and answering directly",
        "A planner that sequences calls to calculate"],
      answer: 1,
      why: "Forcing one specific tool removes the decision entirely: the model's only job is to produce arguments matching the schema from natural language, which is exactly what with_structured_output does. The same failure mode comes with it \u2014 if the model cannot produce arguments it may produce no call at all, so you still check whether tool_calls is empty rather than assuming an entry is there." },
    { stem: "How should a loop handle a tool that raises?",
      options: ["Break out of the loop and return the error to the user",
        "Append a ToolMessage containing the error text, so every call has exactly one answer",
        "Skip appending and continue to the next call",
        "Retry the tool with the same arguments before appending anything"],
      answer: 1,
      why: "Every call needs exactly one answer or the next request is rejected, so skipping or breaking leaves the transcript malformed. Answering with an error string keeps the transcript valid and gives the model something it can act on \u2014 the same reasoning as 3.1's ToolException, which exists precisely so the error text reaches the model as a message it can read and correct from." }
  ] },
  interview: { title: "Interview practice", sub: "The tool protocol", questions: [
    { level: "core", q: "Walk me through what happens when a model calls a tool.",
      strong: "A strong answer is about two messages and an id.",
      answer: [
        { t: "p", text: "You bind the tool definitions to the model, and the model replies with an AIMessage whose content is empty and whose tool_calls list is populated. There is no special message type \u2014 a tool request is an assistant turn whose content happens to be structured rather than prose." },
        { t: "p", text: "Then you look up the tool by name, invoke it with the arguments, and append a ToolMessage carrying the matching tool_call_id. The id is the whole mechanism. The model is then re-invoked with the full list \u2014 question, request, answer \u2014 and produces either prose or another tool call." },
        { t: "p", text: "The reason the result has to be a message rather than a return value is that the model has no memory between calls. Everything it knows comes from the list it is handed, so a tool result that is not in the list does not exist." },
        { t: "p", text: "That has a cost consequence worth stating: tool output counts against the context window exactly like any other message. A tool returning forty kilobytes of JSON has put forty kilobytes into every subsequent turn of that conversation, which is a real and common way for agent costs to get away from people." }
      ] },
    { level: "advanced", q: "You get a provider error about a tool call id with no response. Diagnose it.",
      strong: "A strong answer explains the displacement and the loop bug.",
      answer: [
        { t: "p", text: "Somewhere the loop stopped appending. The model issued more than one tool call in a turn and fewer ToolMessages came back, so the transcript contains a request with no answer and the provider rejects it." },
        { t: "p", text: "The thing that makes it awkward is displacement. The transcript is only validated when it is sent, so the error arrives on the next model call rather than when the list was built, and it names an id rather than the code path that skipped it. The stack trace points at the model call, which is not where the bug is." },
        { t: "p", text: "The usual shapes are a break after the first tool error, a continue on an exception path that skips the append, or a filter that drops calls for tools the agent decided not to run. All three look reasonable in isolation." },
        { t: "p", text: "It is absent in testing because single-call turns are the norm and parallel calls are what expose it \u2014 the trigger is a question that happens to need two lookups. So I would fix it structurally rather than patching the path that failed: make the loop append exactly one ToolMessage per call unconditionally, with failures answered by an error string, so no code path can skip one." }
      ] },
    { level: "core", q: "When would you use tool_choice?",
      strong: "A strong answer separates the three settings by intent.",
      answer: [
        { t: "p", text: "Auto is the default and is what you want for a real agent \u2014 the model decides whether a tool is needed at all." },
        { t: "p", text: "I would use 'any' when answering from memory is never acceptable. A compliance assistant that must cite a source, for instance, where a fluent answer from the model's own knowledge is the failure mode you are trying to prevent." },
        { t: "p", text: "Forcing one specific tool is a different thing entirely \u2014 at that point the model is not deciding anything, it is filling a schema from natural language. That is argument extraction, and it is the same mechanism as with_structured_output from a different entry point. Worth recognising because the failure mode comes with it: if the model cannot produce arguments it may produce no call, so you still check whether tool_calls is empty." },
        { t: "p", text: "The fourth setting I would mention is parallel_tool_calls equals false, which caps a turn at one call. That matters when the calls have side effects or when order is significant \u2014 two writes issued in parallel is a race you did not intend to write." }
      ] }
  ] }
});
