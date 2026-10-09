EC.receiveLesson({
  id: "3.3",
  lede: "The agent loop is nine lines. Call the model, append its reply, stop if it asked for no tools, otherwise execute every call, append one result each, and go again. That is the whole idea \u2014 every agent framework in existence is this loop plus error handling, state, observability and guards. Running it here against a two-tool question takes **3 model calls and produces 6 messages**, and the message list grows by two per tool round, which is the cost model of every agent ever built. The loop as written is **correct and not safe**: it has no iteration cap, no error handling and no guard against a tool name the model invented.",
  objectives: [
    "Write the agent loop from memory",
    "Trace a multi-tool run and account for every message",
    "Explain why the message list grows by two per tool round",
    "Name the three things the minimal loop is missing",
    "Recognise the loop inside any agent framework"
  ],
  prerequisites: ["3.2"],
  blocks: [
    { t: "h2", n: "01", id: "loop", text: "The loop", sub: "Nine lines, and they are the whole idea" },

    {"kind": "cycle", "title": "The agent loop is nine lines", "centre": "until no tools", "caption": "Every agent framework in existence is this loop plus error handling, state, observability and a pause point. Knowing that is what makes the frameworks legible rather than magical — and what makes 3.4's argument about not shipping this one land.", "nodes": [{"label": "call the model", "sub": "with the whole history", "tone": "violet", "edge": "asked for tools"}, {"label": "execute every call", "sub": "in the order returned", "tone": "warn", "edge": "one result each"}, {"label": "append the results", "sub": "as ToolMessages", "tone": "good", "edge": "and go again"}], "t": "diagram", "id": "dg-3_3-01-0"},




    { t: "code", lang: "python", title: "The agent loop in full",
      code: 'tool_map = {t.name: t for t in tools}\nmessages = [HumanMessage(question)]\n\nwhile True:\n    ai = model_with_tools.invoke(messages)\n    messages.append(ai)\n    if not ai.tool_calls:                 # no tools wanted -> done\n        break\n    for tc in ai.tool_calls:              # may be several in one turn\n        out = tool_map[tc["name"]].invoke(tc["args"])\n        messages.append(ToolMessage(content=str(out),\n                                    tool_call_id=tc["id"]))\n\nprint(ai.content)',
      hl: [7, 8],
      caption: "The termination condition is line 7: the model stopped asking for tools." },
    { t: "callout", kind: "insight", title: "The model decides when to stop", body: [
      { t: "p", text: "There is no completion criterion in the code. The loop ends when the model returns a message with no tool calls, which means **the termination condition is a model judgement**, not a program one." },
      { t: "p", text: "That single fact explains most of what is difficult about agents. You cannot assert on how many steps a run will take, you cannot bound its cost in advance, and a model that keeps deciding it needs one more lookup will keep going until something external stops it. 3.7 adds that something." }
    ] },
    { t: "h2", n: "02", id: "run", text: "Running it", sub: "Two tools, three model calls, six messages" },
    { t: "code", lang: "text", title: "A trace",
      code: 'step 1: call lookup_order {"order_id": "A-1"}        -> {"id": "A-1", "status": "shipped", "et\nstep 2: call calculate    {"expression": "3*19.99"}  -> 59.97\nstep 3: model answered -> Order A-1 shipped and arrives on the 12th. Three of them cost 59.97.\n\n6 messages in the final list, 3 model calls.',
      caption: "Human, AI+call, Tool, AI+call, Tool, AI. Two rounds plus the answer." },
    { t: "p", text: "Each tool round adds exactly two messages: the model's request and the tool's answer. The final answer adds one more. So a run with *n* tool rounds produces 2n + 2 messages, and the model is invoked n + 1 times." },
    { t: "h2", n: "03", id: "growth", text: "What the model saw each time", sub: "The cost model of every agent" },
    { t: "code", lang: "text", title: "The input grows by two each call",
      code: 'call 1: 1 messages -> Human\ncall 2: 3 messages -> Human, AI, Tool\ncall 3: 5 messages -> Human, AI, Tool, AI, Tool',
      caption: "Each call re-sends everything before it." },
    { t: "callout", kind: "warn", title: "This is the quadratic again", body: [
      { t: "p", text: "3.5 shows the same shape for conversation history and 13.1 prices it properly. The mechanism here is identical: every model call re-sends the whole transcript, so a run with *n* tool rounds pays for the accumulated list *n + 1* times." },
      { t: "p", text: "The practical consequence is that **a tool returning a lot of text is expensive out of proportion to its usefulness**, because the result rides in every subsequent call. A tool that returns a 40 KB document and is used on step one is paid for again on steps two, three and four." }
    ] },
    { t: "h2", n: "04", id: "missing", text: "What this loop is missing", sub: "Three things, and it is unsafe without them" },
    { t: "table", head: ["Missing", "Consequence"], rows: [
      ["no iteration cap", "a model that always asks for a tool never terminates"],
      ["no error handling", "a tool raising kills the whole run"],
      ["no unknown-tool guard", "a hallucinated name is a `KeyError`"]
    ] },
    { t: "p", text: "All three are in 3.7, and all three are why you should use a prebuilt agent rather than this. The loop is worth writing once so that every prebuilt afterwards is recognisable \u2014 and so that when one misbehaves, you know what it is doing." },
    { t: "exercise", kind: "build", title: "Write the loop and trace it",
      difficulty: "advanced", minutes: 30,
      body: "Implement the agent loop by hand against two tools and a scripted model that requests both before answering. Print a trace of each step. Then account for every message in the final list, and report what the model received on each of its calls. Finally, name what the loop is missing and what each omission costs.",
      requirements: ["Implement the loop: invoke, append, check tool_calls, execute each, append each",
        "Use a model scripted to call two different tools before answering",
        "Print a per-step trace showing tool names, arguments and results",
        "Report the final message count and the number of model calls",
        "Show how many messages the model received on each call",
        "State the relationship between tool rounds and message count",
        "List three things the loop is missing"],
      hint: "The message count is 2n + 2 for n tool rounds. Check that against your trace, and work out why the model call count is n + 1.",
      solution: { lang: "python", title: "x0303.py \u2014 the whole idea, running",
        code: 'tools = [calculate, lookup_order]\ntool_map = {t.name: t for t in tools}\nbound = model.bind_tools(tools)\n\nmessages = [HumanMessage(content="where is order A-1, and what do 3 cost at 19.99?")]\nstep = 0\nwhile True:\n    step += 1\n    ai = bound.invoke(messages)\n    messages.append(ai)\n    if not ai.tool_calls:\n        print("step %d: model answered -> %s" % (step, ai.content))\n        break\n    for c in ai.tool_calls:\n        out = tool_map[c["name"]].invoke(c["args"])\n        print("step %d: call %s %s -> %s" % (step, c["name"], c["args"], out))\n        messages.append(ToolMessage(content=str(out), tool_call_id=c["id"]))\n\nfor i, seen in enumerate(model.seen, 1):\n    print("call %d: %d messages" % (i, len(seen)))',
        out: "==============================================================================\nTHE AGENT LOOP, IN FULL\n==============================================================================\n    tool_map = {t.name: t for t in tools}\n    messages = [HumanMessage(question)]\n\n    while True:\n        ai = model_with_tools.invoke(messages)\n        messages.append(ai)\n        if not ai.tool_calls:                 # no tools wanted -> done\n            break\n        for tc in ai.tool_calls:              # may be several in one turn\n            out = tool_map[tc[\"name\"]].invoke(tc[\"args\"])\n            messages.append(ToolMessage(content=str(out),\n                                        tool_call_id=tc[\"id\"]))\n\n    print(ai.content)\n\n  that is the whole idea. every agent framework in existence is this\n  loop plus error handling, state, observability and guards.\n\n==============================================================================\nRUNNING IT\n==============================================================================\n  step 1: call lookup_order {\"order_id\": \"A-1\"}        -> {\"id\": \"A-1\", \"status\": \"shipped\", \"et\n  step 2: call calculate    {\"expression\": \"3*19.99\"}  -> 59.97\n  step 3: model answered -> Order A-1 shipped and arrives on the 12th. Three of them cost 59.97.\n\n  6 messages in the final list, 3 model calls.\n\n==============================================================================\nWHAT THE MODEL SAW ON EACH CALL\n==============================================================================\n  call 1: 1 messages -> Human\n  call 2: 3 messages -> Human, AI, Tool\n  call 3: 5 messages -> Human, AI, Tool, AI, Tool\n\n  the list grows by two per tool round. that growth is the cost model\n  of every agent, and 13.1 turns it into money.\n\n==============================================================================\nTHE THREE THINGS THIS LOOP IS MISSING\n==============================================================================\n  no iteration cap         a model that always asks for a tool never terminates\n  no error handling        a tool raising kills the whole run\n  no unknown-tool guard    a hallucinated name is a KeyError\n\n  3.7 adds all three. the loop above is correct and not safe.",
        notes: [
          { t: "p", text: "**Three model calls and six messages for two tool rounds**, which is the 2n + 2 and n + 1 relationship. The loop terminated because the model returned a message with no tool calls." },
          { t: "p", text: "**The termination condition is a model judgement, not a program one.** There is no completion criterion in the code, which is why you cannot assert on step count, cannot bound cost in advance, and need something external to stop a model that keeps deciding it wants one more lookup." },
          { t: "p", text: "**The model received 1, then 3, then 5 messages** \u2014 each call re-sends everything before it. Same quadratic as conversation history in 3.5, from the same mechanism." },
          { t: "p", text: "**So a tool that returns a lot of text is expensive out of proportion to its usefulness.** A 40 KB document fetched on step one is paid for again on steps two, three and four, which is a common and invisible way for agent costs to escape." },
          { t: "p", text: "**The loop is correct and not safe**: no iteration cap, so a model that always asks for a tool never terminates; no error handling, so a raising tool kills the run; no unknown-tool guard, so a hallucinated name is a KeyError. All three are 3.7." },
          { t: "p", text: "Writing it once is worth it even though you should not ship it. Every prebuilt agent is this loop plus guards, state and observability \u2014 and recognising it is what lets you debug one when it misbehaves." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that costs ten times the estimate", body: [
      { t: "p", text: "An agent is costed from a single model call and comes in at roughly ten times the estimate. Traffic matches the forecast and no prompt has changed." },
      { t: "p", text: "The estimate priced one call. A run with three tool rounds makes four, and each one re-sends everything before it \u2014 so the input tokens are not four times a prompt, they are the sum of a growing transcript. If any tool returns verbose output, that output is in every call after the one that fetched it." },
      { t: "p", text: "Two measurements make this tractable. Mean tool rounds per run tells you the multiplier, and mean characters returned per tool tells you which tool is inflating the transcript. The usual finding is one tool returning a full record where a summary would do, and the fix is in the tool rather than in the agent \u2014 return what the model needs to decide, not everything the API gave you." }
    ] }
  ],
  takeaways: [
    "**The agent loop is nine lines**: invoke, append, stop if no tool calls, otherwise execute each and append each, repeat.",
    "**Every agent framework is this loop plus error handling, state, observability and guards.**",
    "**The termination condition is a model judgement**, not a program one \u2014 the loop ends when the model stops asking.",
    "**So you cannot assert on step count or bound cost in advance.**",
    "**n tool rounds produce 2n + 2 messages and n + 1 model calls** \u2014 measured here as 2 rounds, 6 messages, 3 calls.",
    "**Each call re-sends the whole transcript**: the model saw 1, then 3, then 5 messages.",
    "**That is the same quadratic as conversation history**, from the same mechanism.",
    "**A verbose tool is expensive out of proportion to its usefulness**, because its output rides in every later call.",
    "**The loop has no iteration cap**, so a model that always asks for a tool never terminates.",
    "**No error handling**, so a raising tool kills the run; **no unknown-tool guard**, so a hallucinated name is a KeyError.",
    "**Write it once so every prebuilt agent is recognisable**, then use the prebuilt."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What ends the agent loop?",
      options: ["A maximum step count configured on the agent",
        "The model returning a message with no tool calls \u2014 a model judgement, not a program one",
        "The tool list being exhausted",
        "A terminal tool that signals completion"],
      answer: 1,
      why: "The only termination check in the minimal loop is whether the reply contained tool calls, so the model decides when it is finished. That is why you cannot assert on how many steps a run takes or bound its cost in advance, and why an external iteration cap is necessary rather than optional \u2014 a model that keeps deciding it needs one more lookup will keep going until something stops it." },
    { stem: "A run has three tool rounds. How many model calls and messages?",
      options: ["3 calls and 6 messages", "4 calls and 8 messages", "3 calls and 8 messages", "4 calls and 6 messages"],
      answer: 1,
      why: "Each tool round adds two messages \u2014 the model's request and the tool's answer \u2014 and the final prose answer adds one more, on top of the original question: 2n + 2. The model is invoked once per round plus once to produce the answer: n + 1. For n = 3 that is 8 messages and 4 calls, matching the measured 2 rounds giving 6 messages and 3 calls." },
    { stem: "Why is a tool that returns a 40 KB document unusually expensive?",
      options: ["Large payloads are billed at a higher rate",
        "Each model call re-sends the whole transcript, so the result is paid for again on every subsequent step",
        "It forces the agent into more tool rounds",
        "It exceeds the provider's per-message size limit"],
      answer: 1,
      why: "The transcript grows and is re-sent in full on every call, so output fetched on step one is in the input for steps two, three and four. That makes a verbose tool expensive out of proportion to how useful it is, and it is invisible unless you measure characters returned per tool. The fix belongs in the tool \u2014 return what the model needs to decide, not everything the API provided." },
    { stem: "Why write the loop by hand if you should use a prebuilt agent?",
      options: ["Because prebuilt agents are not production-ready",
        "Because every prebuilt is this loop plus guards and state, so recognising it is what lets you debug one",
        "Because the hand-written version is faster",
        "Because prebuilt agents cannot handle parallel tool calls"],
      answer: 1,
      why: "The loop is nine lines and the hard part is everything around it \u2014 an iteration cap, tool error handling, an unknown-tool guard, state, streaming and a pause point, all of which a prebuilt supplies. Writing it once makes those additions legible rather than magical, which matters when an agent misbehaves and you need to reason about what it is actually doing." }
  ] },
  interview: { title: "Interview practice", sub: "The agent loop", questions: [
    { level: "core", q: "Describe the agent loop.",
      strong: "A strong answer is nine lines and then the implications.",
      answer: [
        { t: "p", text: "Build a map from tool name to tool. Start a message list with the question. Then loop: invoke the model with the messages, append whatever came back, and if it contains no tool calls you are done. Otherwise, for each tool call, invoke the tool with its arguments and append a ToolMessage carrying the matching id. Repeat." },
        { t: "p", text: "That is the whole idea, and every agent framework in existence is that loop plus error handling, state, observability and guards." },
        { t: "p", text: "The property I would draw out is that the termination condition is a model judgement rather than a program one. There is no completion criterion in the code \u2014 the loop ends when the model stops asking for tools. So you cannot assert on how many steps a run will take or bound its cost in advance, and a model that keeps wanting one more lookup will keep going until something external stops it." },
        { t: "p", text: "The other thing worth knowing is the shape of the growth. n tool rounds give 2n plus 2 messages and n plus 1 model calls, and every call re-sends the whole transcript. I traced a two-round run: three model calls seeing one, then three, then five messages." }
      ] },
    { level: "advanced", q: "An agent costs ten times its estimate. Where do you look?",
      strong: "A strong answer reaches transcript growth and verbose tools.",
      answer: [
        { t: "p", text: "The estimate almost certainly priced one model call. An agent run with three tool rounds makes four calls, and each one re-sends everything before it, so the input tokens are not four times a prompt \u2014 they are the sum of a growing transcript." },
        { t: "p", text: "So the first measurement is mean tool rounds per run, which gives you the multiplier. The second is mean characters returned per tool, which usually finds the real problem." },
        { t: "p", text: "The usual finding is one tool returning a full API record where a summary would do. That output is fetched once and then paid for again on every subsequent call in the run, so a verbose tool is expensive completely out of proportion to how useful it is \u2014 and it is invisible unless you are specifically measuring it, because nothing about it looks like a cost decision." },
        { t: "p", text: "The fix is in the tool rather than the agent: return what the model needs in order to decide, not everything the API gave you. If the raw record is needed by your own code afterwards, that is what the content-and-artifact response format is for \u2014 a short string for the model and the full data for you." }
      ] },
    { level: "core", q: "What is the minimal loop missing?",
      strong: "A strong answer names three and what each costs.",
      answer: [
        { t: "p", text: "Three things, and it is correct without being safe." },
        { t: "p", text: "No iteration cap. A model that keeps asking for a tool never terminates, and because the termination condition is the model's judgement there is nothing in the code to stop it. Without a cap it runs until the context window fills, and then fails with a confusing error about length rather than about looping." },
        { t: "p", text: "No error handling. A tool that raises propagates straight out of the loop and kills the run, so a recoverable argument mistake becomes a 500 instead of the model correcting itself on the next step." },
        { t: "p", text: "No unknown-tool guard. If the model invents a tool name \u2014 which it does \u2014 the dictionary lookup is a KeyError. With a guard you can answer with a ToolMessage saying no such tool exists and listing the real ones, and the model usually recovers immediately." },
        { t: "p", text: "All three are exactly what a prebuilt agent gives you, which is the argument for using one. I would still write the loop once, because it is what makes a prebuilt debuggable when it does something surprising." }
      ] }
  ] }
});
