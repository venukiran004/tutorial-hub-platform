EC.receiveLesson({
  id: "3.7",
  lede: "The 3.3 loop was correct and unsafe. Three guards fix three failures: an iteration cap stops a model that always asks for a tool, catching tool errors turns a crash into a message the model can act on, and an unknown-tool guard turns a hallucinated name from a `KeyError` into a correction the model recovers from. All three are shown here working and failing. The fourth failure is the one **no guard catches**: asked where an order is, a model can answer *\u201cI looked up order A-1 and it shipped on Tuesday\u201d* having called **zero tools**. Nothing went wrong mechanically. The answer is fluent, specific and invented, and the only defences are evaluation and tool design.",
  objectives: [
    "Add an iteration cap and explain what happens without one",
    "Catch tool errors and return them to the model as messages",
    "Guard against hallucinated tool names",
    "Recognise the failure no loop guard can detect",
    "Name the two defences that do apply to it"
  ],
  prerequisites: ["3.3", "3.1"],
  blocks: [
    { t: "h2", n: "01", id: "guarded", text: "The loop, guarded", sub: "Three additions to 3.3" },

    {"kind": "matrix", "title": "Three guards for three failures", "caption": "The 3.3 loop was **correct and unsafe**. Each guard turns an unbounded or fatal failure into a bounded one the model can act on — which is the whole shape of agent resilience, and 14.1 generalises it.", "cols": ["without the guard", "with it"], "rows": ["always asks for a tool", "a tool raises", "a hallucinated name"], "cells": [[{"text": "an unbounded loop", "tone": "crit"}, {"text": "an iteration cap stops it", "tone": "good"}], [{"text": "the run crashes", "tone": "crit"}, {"text": "a message the model can act on", "tone": "good"}], [{"text": "KeyError", "tone": "crit"}, {"text": "“no such tool, try one of…”", "tone": "good"}]], "t": "diagram", "id": "dg-3_7-01-0"},




    { t: "code", lang: "python", title: "What the guards look like",
      code: 'for i in range(max_iters):                       # 1. a cap\n    ai = bound.invoke(messages)\n    messages.append(ai)\n    if not ai.tool_calls:\n        return messages\n    for c in ai.tool_calls:\n        if c["name"] not in tool_map:                # 2. unknown tool\n            messages.append(ToolMessage(\n                content="error: no tool named %r. available: %s"\n                        % (c["name"], list(tool_map)),\n                tool_call_id=c["id"]))\n            continue\n        try:\n            out = tool_map[c["name"]].invoke(c["args"])\n        except Exception as e:                       # 3. tool errors\n            out = "error: %s" % e\n        messages.append(ToolMessage(content=str(out), tool_call_id=c["id"]))',
      hl: [1, 7, 15],
      caption: "Note that every branch still appends exactly one ToolMessage \u2014 3.2's rule." },
    { t: "h2", n: "02", id: "f1", text: "Failure 1: the loop that never ends", sub: "Because the model decides when to stop" },
    { t: "code", lang: "text", title: "A model that always asks for a tool",
      code: "('called', 'calculate')  x6\n('hit iteration cap', 6)\n-> stopped by the cap after 6 model calls, 14 messages",
      caption: "Without the cap this runs until the context window fills." },
    { t: "callout", kind: "warn", title: "The failure without a cap is confusing, not obvious", body: [
      { t: "p", text: "An uncapped loop does not hang forever in a recognisable way. It runs until the transcript exceeds the context window and then fails with an error about **length** \u2014 so the symptom points at token limits rather than at looping, and the obvious response is to raise `max_tokens` or trim history, neither of which is the problem." },
      { t: "p", text: "It is also expensive on the way there, because each iteration re-sends a transcript that grew by two messages (3.3). A runaway loop is a quadratic bill terminating in a misleading error." }
    ] },
    { t: "h2", n: "03", id: "f2", text: "Failure 2: a tool that does not exist", sub: "Models invent names" },
    { t: "code", lang: "text", title: "With and without the guard",
      code: "with the guard:\n  ('unknown tool', 'check_inventory')\n  ('answered', 'I could not check inventory.')\n\nwithout it:\n  KeyError: 'check_inventory'   <- the run dies",
      caption: "Told the tool does not exist, the model adapted and answered." },
    { t: "p", text: "The guard's message matters as much as its existence. Returning `\"error: no tool named 'check_inventory'. available: ['calculate', 'lookup_order']\"` gives the model the list, so it can pick a real one. Returning `\"unknown tool\"` tells it only that something failed." },
    { t: "h2", n: "04", id: "f3", text: "Failure 3: a tool that raises", sub: "3.1's ToolException, from the loop's side" },
    { t: "code", lang: "text", title: "Dividing by zero",
      code: "('tool raised', 'ZeroDivisionError')\n('answered', 'That division is undefined.')",
      caption: "The error went back as a ToolMessage and the model recovered in one step." },
    { t: "p", text: "This is why 3.1 argued that a tool's error message is prompt. The model reads it, understands what went wrong, and either fixes its argument or explains the problem \u2014 which is a far better outcome than a 500, and costs one `try` block." },
    { t: "h2", n: "05", id: "f4", text: "Failure 4: the one no guard catches", sub: "The model answers instead of acting" },
    { t: "code", lang: "text", title: "Zero tools called",
      code: 'question: "where is order A-1?"\nanswer:   "I looked up order A-1 and it shipped on Tuesday."\n\nevents: [(\'answered\', \'I looked up order A-1 and it shipped on \')]\ntool calls actually made: 0',
      caption: "Fluent, specific, and entirely invented." },
    { t: "callout", kind: "trap", title: "Nothing went wrong, mechanically", body: [
      { t: "p", text: "There is no exception, no unknown tool, no loop, no malformed transcript. The model simply answered rather than acting, and the loop did exactly what it was told \u2014 a reply with no tool calls means done. Every guard in this lesson passes." },
      { t: "p", text: "It is also the hardest failure to notice, because the answer **claims** the tool was used. \u201cI looked up order A-1\u201d reads as evidence of a lookup, so a human reviewing the transcript sees a successful tool-using run unless they check the message list." }
    ] },
    { t: "p", text: "Two defences apply and neither is a guard. **Evaluation** (14.7) can score the trajectory rather than the answer, catching runs that reached a plausible conclusion by the wrong path. And **tool design**: a tool whose output the model cannot plausibly guess is one it has to call \u2014 an order id it has never seen, a live balance, a number from your database. A tool that returns something the model could invent is a tool it will sometimes invent." },
    { t: "exercise", kind: "build", title: "Guard the loop, then find what you cannot guard",
      difficulty: "advanced", minutes: 30,
      body: "Take the 3.3 loop and add three guards: an iteration cap, tool error handling and an unknown-tool guard. Demonstrate each one catching its failure, and show at least one of them failing without the guard. Then construct the failure that no guard catches and explain why none of them fire.",
      requirements: ["Add a cap and show a model that always requests a tool being stopped by it",
        "State what happens without a cap and why the error is misleading",
        "Guard an unknown tool name and show the model recovering",
        "Show the unguarded version raising",
        "Catch a tool exception and show the model recovering",
        "Construct a run where the model answers without calling any tool",
        "Explain why no guard detects it and name the two defences that apply"],
      hint: "For the fourth failure, script a model that answers immediately with a confident claim about a lookup. Count the tool calls, not the words.",
      solution: { lang: "python", title: "x0307.py \u2014 three guards and one gap",
        code: 'def run(model, question, max_iters=6, guard_unknown=True, catch_tool_errors=True):\n    """The 3.3 loop, with the three guards it was missing."""\n    bound = model.bind_tools(tools)\n    messages, events = [HumanMessage(content=question)], []\n    for i in range(max_iters):\n        ai = bound.invoke(messages)\n        messages.append(ai)\n        if not ai.tool_calls:\n            events.append(("answered", ai.content[:40]))\n            return events, messages\n        for c in ai.tool_calls:\n            if c["name"] not in tool_map:\n                if guard_unknown:\n                    events.append(("unknown tool", c["name"]))\n                    messages.append(ToolMessage(\n                        content="error: no tool named %r. available: %s"\n                                % (c["name"], list(tool_map)), tool_call_id=c["id"]))\n                    continue\n                raise KeyError(c["name"])\n            try:\n                out = tool_map[c["name"]].invoke(c["args"])\n                events.append(("called", c["name"]))\n            except Exception as e:\n                if not catch_tool_errors:\n                    raise\n                events.append(("tool raised", type(e).__name__))\n                out = "error: %s" % e\n            messages.append(ToolMessage(content=str(out), tool_call_id=c["id"]))\n    events.append(("hit iteration cap", max_iters))\n    return events, messages',
        out: "==============================================================================\nFAILURE 1 -- a loop that never terminates\n==============================================================================\n  a model that always asks for a tool:\n     ('called', 'calculate')\n     ('called', 'calculate')\n     ('called', 'calculate')\n     ('called', 'calculate')\n     ('called', 'calculate')\n     ('called', 'calculate')\n     ('hit iteration cap', 6)\n  -> stopped by the cap after 6 model calls, 13 messages\n\n  without max_iters this runs until the context window fills, then\n  fails with a confusing error about length rather than about looping.\n\n==============================================================================\nFAILURE 2 -- a hallucinated tool name\n==============================================================================\n     ('unknown tool', 'check_inventory')\n     ('answered', 'I could not check inventory.')\n\n  with the guard, the model is TOLD the tool does not exist and can\n  recover. without it:\n     KeyError: 'check_inventory'   <- the run dies\n\n==============================================================================\nFAILURE 3 -- a tool that raises\n==============================================================================\n     ('tool raised', 'ZeroDivisionError')\n     ('answered', 'That division is undefined.')\n\n  the error went back to the model as a ToolMessage and it recovered.\n  that is what ToolException is for, and what ToolNode does for you.\n\n==============================================================================\nFAILURE 4 -- the one no guard catches\n==============================================================================\n  the model narrates a tool call it never made:\n\n    events: [('answered', 'I looked up order A-1 and it shipped on ')]\n    tool calls actually made: 0\n\n  zero tools were called. the answer is fluent, specific and invented.\n  no loop guard helps, because nothing went wrong mechanically -- the\n  model simply answered instead of acting. the only defences are\n  evaluation (14.7) and designing tools the model cannot plausibly\n  guess the output of.",
        notes: [
          { t: "p", text: "**The cap stopped a model that always asks for a tool**, after six calls and fourteen messages. Without it the loop runs until the transcript exceeds the context window and then fails with an error about *length* \u2014 so the symptom points at token limits rather than at looping, and the obvious responses do not help." },
          { t: "p", text: "**It is expensive on the way there too**, because each iteration re-sends a transcript that grew by two messages. A runaway loop is a quadratic bill ending in a misleading error." },
          { t: "p", text: "**The unknown-tool guard let the model recover**; without it the same run died with a KeyError. The message matters as much as the guard \u2014 listing the available tools lets the model pick a real one, where \u2018unknown tool\u2019 tells it only that something failed." },
          { t: "p", text: "**A tool exception came back as a ToolMessage and the model recovered in one step**, which is 3.1's argument from the loop's side: the error text is prompt, and it costs one `try` block." },
          { t: "p", text: "**The fourth failure fires none of the guards.** Asked where an order was, the model answered \u2018I looked up order A-1 and it shipped on Tuesday\u2019 having called zero tools. No exception, no unknown tool, no loop, no malformed transcript \u2014 a reply with no tool calls means done, and the loop did exactly as instructed." },
          { t: "p", text: "**It is also the hardest to notice, because the answer claims the tool was used.** A human reading the transcript sees what looks like a successful tool-using run unless they check the message list for actual calls." },
          { t: "p", text: "**The two defences are evaluation and tool design.** Scoring the trajectory rather than the answer catches runs that reached a plausible conclusion by the wrong path; and a tool whose output the model cannot plausibly guess is one it has to call. A tool returning something inventable is a tool that will sometimes be invented." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the agent that was never calling the database", body: [
      { t: "p", text: "A support agent answers order questions accurately enough that nobody checks, until a customer is told a wrong delivery date. Investigating, the team finds the agent calls the order tool on about sixty per cent of order questions and answers from memory on the rest \u2014 inventing plausible statuses and dates." },
      { t: "p", text: "No guard was ever going to catch this, and it had been running for months because the invented answers were usually right-shaped and sometimes right. The transcripts look fine: every answer says \u201cI checked your order\u201d." },
      { t: "p", text: "Two fixes at different depths. Immediately, `tool_choice=\"any\"` on the order-question path forces a tool call, which 3.2 covers. Structurally, add **calls-per-run as a metric** \u2014 an agent whose mean tool calls per order question is below one is telling you something important, and it is the only signal that would have surfaced this without a customer complaint." }
    ] }
  ],
  takeaways: [
    "**Three guards fix three failures**: an iteration cap, tool error handling, an unknown-tool guard.",
    "**Every branch still appends exactly one ToolMessage** \u2014 3.2's rule survives the guards.",
    "**Without a cap, the loop fails with a context-length error**, so the symptom points at token limits rather than looping.",
    "**And it is expensive on the way**, because each iteration re-sends a transcript that grew by two.",
    "**An unknown tool name is a KeyError without a guard**, and a recoverable message with one.",
    "**The guard's message matters as much as the guard** \u2014 list the available tools so the model can pick a real one.",
    "**A caught tool exception comes back as a ToolMessage and the model recovers in one step**, for one `try` block.",
    "**The fourth failure fires no guard**: the model answers without calling any tool, fluently and specifically.",
    "**Nothing went wrong mechanically** \u2014 a reply with no tool calls means done, and the loop obeyed.",
    "**It is the hardest to notice because the answer claims the tool was used.**",
    "**The two defences are evaluation of the trajectory and tool design** \u2014 a tool whose output cannot be guessed must be called.",
    "**Track mean tool calls per run**; below one on a path that requires a lookup is a finding."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "An agent loop has no iteration cap and the model always requests a tool. How does it fail?",
      options: ["It hangs indefinitely and must be killed",
        "It runs until the transcript exceeds the context window, then fails with an error about length",
        "LangChain stops it at a default limit of ten",
        "The provider rejects the repeated identical calls"],
      answer: 1,
      why: "It terminates, but by exhausting the context window rather than by detecting the loop \u2014 so the error is about token count and the obvious responses are to raise max_tokens or trim history, neither of which addresses the cause. It is also expensive getting there, since each iteration re-sends a transcript that grew by two messages, making a runaway loop a quadratic bill ending in a misleading error." },
    { stem: "A model requests a tool name that does not exist. With a guard, what should the ToolMessage say?",
      options: ["\u201cunknown tool\u201d",
        "That no tool of that name exists, plus the list of tools that do",
        "Nothing \u2014 skip appending and continue",
        "A re-statement of the original question"],
      answer: 1,
      why: "The model reads the ToolMessage, so the content is prompt. Listing the real tools lets it pick a correct one on the next step, where a bare \u201cunknown tool\u201d tells it only that something failed. Skipping the append is worse than either, because it leaves a tool call unanswered and the next request is rejected \u2014 3.2's rule that every call needs exactly one answer still applies inside the guard." },
    { stem: "An agent answers \u201cI looked up order A-1 and it shipped on Tuesday\u201d having called no tools. Which guard catches it?",
      options: ["The iteration cap, since zero iterations is anomalous",
        "None \u2014 nothing went wrong mechanically; a reply with no tool calls means done",
        "The unknown-tool guard, since the implied tool was not real",
        "Tool error handling, since the lookup silently failed"],
      answer: 1,
      why: "There is no exception, no unknown tool, no loop and no malformed transcript. The model answered instead of acting and the loop behaved exactly as specified. It is also the hardest failure to spot, because the answer claims the tool was used \u2014 a human reading the transcript sees a successful tool-using run unless they check the message list for actual calls." },
    { stem: "Which tool is least likely to be hallucinated rather than called?",
      options: ["One that returns a summary of a well-known public topic",
        "One that returns a live account balance the model has never seen",
        "One with a very detailed description",
        "One that is listed first in the tool list"],
      answer: 1,
      why: "A model invents tool output when it can plausibly produce that output itself, so the defence is a tool whose result is genuinely unavailable to it \u2014 a live balance, a specific order's status, a number from your database. A tool returning something inventable will sometimes be invented regardless of how it is described, which is why this is a design property rather than a prompting one." }
  ] },
  interview: { title: "Interview practice", sub: "Agent failure modes", questions: [
    { level: "advanced", q: "What guards does an agent loop need?",
      strong: "A strong answer gives three and then the one that cannot be guarded.",
      answer: [
        { t: "p", text: "Three, and then an honest statement that there is a fourth failure none of them catch." },
        { t: "p", text: "An iteration cap, because the termination condition is the model's judgement and a model that keeps asking for tools never stops. Without a cap it runs until the transcript exceeds the context window and fails with an error about length \u2014 which sends you to max_tokens or trimming, neither of which is the problem. And it is expensive getting there, because each iteration re-sends a transcript that grew by two messages." },
        { t: "p", text: "Tool error handling, so a raising tool becomes a ToolMessage the model can read rather than an exception that kills the run. I tested that with a division by zero and the model recovered in one step." },
        { t: "p", text: "And an unknown-tool guard, because models invent names. Without it that is a KeyError. With it, I return a message saying no such tool exists and listing the real ones \u2014 the list matters, because it lets the model pick a correct one rather than just knowing something failed." }
      ] },
    { level: "advanced", q: "Tell me about the failure no guard catches.",
      strong: "A strong answer describes it concretely and names both defences.",
      answer: [
        { t: "p", text: "The model answers instead of acting. I scripted one: asked where order A-1 was, it replied 'I looked up order A-1 and it shipped on Tuesday' and called zero tools." },
        { t: "p", text: "Nothing went wrong mechanically. No exception, no unknown tool, no loop, no malformed transcript. A reply with no tool calls means the loop is done, so every guard passed and the loop behaved exactly as written." },
        { t: "p", text: "What makes it genuinely dangerous is that the answer claims the tool was used. Someone reviewing transcripts sees 'I looked up order A-1' and reads that as evidence of a lookup. You only find it by checking the message list for actual calls, which nobody does by default." },
        { t: "p", text: "Two defences, and neither is a guard. Evaluation that scores the trajectory rather than the answer, so a run that reached a plausible conclusion by the wrong path fails. And tool design \u2014 a tool whose output the model cannot plausibly guess is one it has to call. A live balance or a specific order's status is uninventable; a summary of a well-known topic is not." },
        { t: "p", text: "Operationally, the thing I would add is mean tool calls per run as a metric. An agent whose average is below one on a path that requires a lookup is telling you this is happening, and it is the only signal that surfaces before a customer complaint." }
      ] },
    { level: "core", q: "How should a tool failure be surfaced to the model?",
      strong: "A strong answer writes the error message as prompt.",
      answer: [
        { t: "p", text: "As a ToolMessage containing the error text, with the message written for the model, because the model is what reads it." },
        { t: "p", text: "So 'user_id must be numeric, got alice' is recoverable \u2014 the model fixes its argument on the next step. 'Invalid input' is not, because it tells the model something failed without telling it what to change, and it will usually guess the same way again." },
        { t: "p", text: "Mechanically it is one try block in the loop, and the important detail is that the except branch still appends exactly one ToolMessage. Skipping the append on an error path is the most common way to break the protocol \u2014 a tool call with no answer makes the next request invalid, and the error surfaces one step later naming an id." },
        { t: "p", text: "The one judgement call is what should not be recoverable. If a tool fails because a downstream service is down, handing that back invites the model to retry until the iteration cap. So I would use recoverable errors for things the model can fix \u2014 arguments, scope, a permission it could route around \u2014 and let infrastructure failures propagate to the orchestrator instead." }
      ] }
  ] }
});
