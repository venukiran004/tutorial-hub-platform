EC.receiveLesson({
  id: "14.1",
  lede: "Nine surfaces, and the column that matters is not the cause \u2014 it is **whether anything tells you**. Measured: the model call, the graph looping and the process dying all **raise**. The state boundary, the sub-agent, retrieval, the context strategy and cost are all **silent**. That is **five of nine**, and the tool surface is split in two, which is the finding that reframes the module: the default `ToolNode` handler returns the **model's** mistakes to the model as a `ToolMessage` to fix, and **propagates the tool's own exceptions**, because the model can fix the first and cannot fix the second. So most agentic failure does not raise, and most of the work is detection you **build** rather than errors you catch.",
  objectives: [
    "Enumerate the nine failure surfaces of an agentic system",
    "Measure which surfaces raise and which are silent",
    "Explain the line the default tool error handler draws",
    "Give each surface a detection, containment and recovery column",
    "Say why a silent surface needs a mechanism you build"
  ],
  prerequisites: ["13.6", "12.8", "6.2"],
  blocks: [
    { t: "h2", n: "01", id: "question", text: "The useful question", sub: "Not what broke \u2014 whether anything told you" },
    { t: "p", text: "A failure you can see is a different engineering problem from one you cannot. The first needs a handler; the second needs a **detector**, which is something you write and can forget to write. So the column worth having in a failure taxonomy is the signal, not the cause." },
    { t: "h2", n: "02", id: "measured", text: "The measured table", sub: "Six surfaces, probed" },
    { t: "code", lang: "text", title: "What each one actually does",
      code: "surface                     signal   what you actually get\nthe model call              RAISES   RuntimeError\na tool raising              RAISES   ValueError\na tool called wrongly       SILENT   ToolMessage status='error'\nan undeclared state key     SILENT   returned keys: ['known']\nthe graph looping           RAISES   GraphRecursionError\nthe process dying           RAISES   state survives: done=['a'] next=('b',)",
      caption: "The tool row **splits in two**, which is the finding." },
    { t: "h2", n: "03", id: "toolline", text: "The line the tool handler draws", sub: "Whose fault is it" },
    { t: "code", lang: "python", title: "LangGraph's default, read from source",
      code: "def _default_handle_tool_errors(e: Exception) -> str:\n    if isinstance(e, ToolInvocationError):\n        return e.message\n    raise e",
      out: "the tool raises      -> RAISES  ValueError\nbad arguments        -> SILENT  ToolMessage status='error'\n\n\"Error invoking tool 'lookup' with kwargs {'wrong_arg': 'x'} with\n error:\\n order_id: Field required\\n Please fix the error and try again.\"",
      caption: "The same tool, the same `ToolNode`, two different outcomes." },
    { t: "callout", kind: "insight", title: "It is not \u201ccatch errors\u201d or \u201cdo not catch errors\u201d", body: [
      { t: "p", text: "It returns the **model's** mistakes to the model \u2014 bad arguments, a missing field, an unknown tool name \u2014 because the model can read the error and fix the call. And it **propagates the tool's own** exceptions, because the model cannot fix a dependency being down." },
      { t: "p", text: "Which makes `handle_tool_errors=True` a worse default than it looks: it erases the distinction, so an outage arrives at the model as a message to *\u201cplease fix your mistakes\u201d*. The model obliges by calling the tool again, which is a loop that costs money and cannot succeed." }
    ] },
    { t: "h2", n: "04", id: "silent", text: "The four surfaces no single call demonstrates", sub: "All silent" },
    { t: "dl", items: [
      ["**sub-agent**", "A worker returning plausible nonsense. No exception, and the supervisor treats it as a result (12.8)."],
      ["**retrieval**", "A similarity search returns k documents whether or not any is relevant (6.2). Retrieval failure looks like retrieval success."],
      ["**context**", "A trimming strategy dropping the subject of the conversation while the token count looks healthy (13.3)."],
      ["**cost**", "A run that succeeds and costs 40\u00d7 what it should. The only signal is the bill (13.1)."]
    ] },
    { t: "code", lang: "text", title: "So, counting the nine",
      code: "RAISES   the model call, the graph looping, the process dying      3\nSILENT   the state boundary, the sub-agent, retrieval, the\n         context strategy, cost                                     5\nBOTH     the tool, split by whose fault it is                       1",
      caption: "**Five of nine** are silent and a sixth is half silent." },
    { t: "callout", kind: "warn", title: "Which is the actual finding of this lesson", body: [
      { t: "p", text: "Most agentic failure does not raise. The surfaces that raise \u2014 the model call, the loop, the crash \u2014 are the **easy** ones: something tells you, and you write a handler. The other five produce a **wrong answer** rather than an error." },
      { t: "p", text: "So the instinct to start with try/except and retries covers three of nine surfaces. The remaining six need instruments, and an instrument you did not build does not fail \u2014 it is simply absent, which is why a checklist (14.10) is the only thing that catches a missing one." }
    ] },
    { t: "h2", n: "05", id: "columns", text: "Three columns, not one", sub: "The shape of the rest of the module" },
    { t: "dl", items: [
      ["**detection**", "What tells you. For the silent ones this is something you build \u2014 a schema check, a fact-survival check (13.3), a duplicated-work metric (12.8), a cost cap."],
      ["**containment**", "What stops it spreading. A timeout, a hop budget, a recursion limit, a circuit breaker (14.2)."],
      ["**recovery**", "What you do. Retry (14.2), compensate (14.4), degrade (14.5), or escalate (14.6)."]
    ] },
    { t: "callout", kind: "mental", title: "A surface with no detection column", body: [
      { t: "p", text: "\u2026is a surface you will find out about from a user. Five of the nine start that way, and that is the single most useful sentence in this module." },
      { t: "p", text: "It also tells you where to spend first. Containment and recovery are satisfying to build and they only help with failures you know about. Detection is the one that changes what you know." }
    ] },
    { t: "diagram", kind: "matrix", title: "Five of nine surfaces are silent",
      caption: "The column that matters is not the cause — it is whether anything tells you. The three that raise are the easy ones. The tool surface is **both**, split by whose fault the failure is.",
      cols: ["the signal", "what you get"],
      rows: ["the model call", "a tool raising", "a tool called wrongly", "the state boundary",
             "the graph looping", "the process dying", "a sub-agent", "retrieval",
             "the context strategy", "cost"],
      cells: [
        [{ text: "RAISES", tone: "good" }, "RuntimeError"],
        [{ text: "RAISES", tone: "good" }, "the tool’s own exception"],
        [{ text: "silent", tone: "warn" }, "ToolMessage status=error"],
        [{ text: "SILENT", tone: "crit" }, "the key is discarded"],
        [{ text: "RAISES", tone: "good" }, "GraphRecursionError"],
        [{ text: "RAISES", tone: "good" }, "the checkpoint survives"],
        [{ text: "SILENT", tone: "crit" }, "plausible nonsense"],
        [{ text: "SILENT", tone: "crit" }, "k docs, none relevant"],
        [{ text: "SILENT", tone: "crit" }, "a healthy token count"],
        [{ text: "SILENT", tone: "crit" }, "only the bill"]
      ] },
    { t: "exercise", kind: "analysis", title: "Map the failure surfaces",
      difficulty: "core", minutes: 32,
      body: "Trigger a failure at several surfaces of a LangGraph agent and record, for each, whether anything raises or whether it is silent. Include a tool that raises and the same tool called with bad arguments, and explain the line the default handler draws between them. Then name the surfaces that no single call demonstrates and classify them the same way. Count the result. Finally give each surface a detection, containment and recovery column.",
      requirements: ["Probe at least five surfaces and record raise-or-silent for each",
        "Probe a tool raising and the same tool called wrongly",
        "Read the default handler and state the line it draws",
        "Explain why handle_tool_errors=True is a worse default",
        "Name the surfaces no single call demonstrates",
        "Count how many of the nine are silent",
        "Give each surface a detection, containment and recovery column",
        "Say what a surface with no detection column means"],
      hint: "Call the same tool two ways: once so it raises, once with a wrong argument name. The default handler treats them differently.",
      solution: { lang: "python", title: "x1401.py \u2014 five of nine are silent",
        code: '@tool\ndef lookup(order_id: str) -> str:\n    """Look up an order."""\n    raise ValueError("order service unavailable")\n\n# the SAME tool and the SAME ToolNode, two kinds of failure\nprobe_tool(ToolNode([lookup]), {"order_id": "ORD-1"})   # RAISES ValueError\nprobe_tool(ToolNode([lookup]), {"wrong_arg": "x"})      # ToolMessage, status=error\n\n# and a node returning a key the schema does not declare\ndef writes_unknown(s):\n    return {"known": "set", "unknown": "this value is discarded"}\n# -> returned keys: [\'known\']   no error, no warning',
        out: "==============================================================================\nPART 1 -- nine surfaces, and the question is which ones RAISE\n==============================================================================\n  a failure you can see is a different engineering problem from one\n  you cannot. so the useful column in a failure taxonomy is not the\n  cause, it is whether anything tells you.\n\n  the SAME tool and the SAME ToolNode, two kinds of failure:\n    the tool raises      -> RAISES  ValueError\n    bad arguments        -> SILENT  ToolMessage status='error'\n    and the message the model gets back in the second case:\n      \"Error invoking tool 'lookup' with kwargs {'wrong_arg': 'x'} with error:\\n order_id: Field require\"\n\n  so the DEFAULT handler draws the line at whose fault it is:\n      def _default_handle_tool_errors(e: Exception) -> str:\n          if isinstance(e, ToolInvocationError):\n              return e.message\n          raise e\n\n\n==============================================================================\nPART 2 -- the measured table\n==============================================================================\n  surface                     signal   what you actually get\n  the model call              RAISES   RuntimeError\n  a tool raising              RAISES   ValueError\n  a tool called wrongly       SILENT   ToolMessage status='error'\n  an undeclared state key     SILENT   returned keys: ['known']\n  the graph looping           RAISES   GraphRecursionError\n  the process dying           RAISES   state survives: done=['a'] next=('b',)\n\n  so the surfaces split by whether anything tells you -- and the tool\n  row splits in TWO, which is the finding:\n\n    RAISES  -- the model call, a tool's own exception, the graph\n               looping, the process dying. something tells you.\n    SILENT  -- a tool called with bad arguments (returned to the model\n               as a ToolMessage to fix), and an undeclared state key\n               (discarded without a word).\n\n  the default tool handler is therefore not 'catch errors' or 'do not\n  catch errors'. it returns the MODEL's mistakes to the model, because\n  the model can fix those, and propagates the TOOL's own failures,\n  because it cannot.\n\n==============================================================================\nPART 3 -- the four remaining surfaces, which no single call demonstrates\n==============================================================================\n  sub-agent     a worker returning plausible nonsense. no exception,\n                and the supervisor treats it as a result (12.8).\n  retrieval     a similarity search returns k documents whether or not\n                any is relevant (6.2). retrieval failure looks like\n                retrieval success.\n  context       a trimming strategy dropping the subject of the\n                conversation while the token count looks healthy (13.3).\n  cost          a run that succeeds and costs 40x what it should. the\n                only signal is the bill (13.1).\n\n  all four are SILENT. so counting the nine surfaces:\n\n    RAISES          the model call, the graph looping, the process\n                    dying                                        3\n    SILENT          the state boundary, the sub-agent, retrieval,\n                    the context strategy, cost                   5\n    BOTH            the tool, split by whose fault it is          1\n\n  five of nine are silent and a sixth is half silent -- and that is\n  the actual finding of this lesson: most agentic failure does not\n  raise, so most of the work is detection you build rather than\n  errors you catch.\n\n==============================================================================\nPART 4 -- so the taxonomy has to carry three columns, not one\n==============================================================================\n  for each surface:\n\n    DETECTION    what tells you. for the silent ones this is something\n                 you build -- a schema check, a fact-survival check\n                 (13.3), a duplicated-work metric (12.8), a cost cap.\n    CONTAINMENT  what stops it spreading. a timeout, a hop budget, a\n                 recursion limit, a circuit breaker (14.2).\n    RECOVERY     what you do. retry (14.2), compensate (14.4), degrade\n                 (14.5), or escalate (14.6).\n\n  a surface with no detection column is a surface you will find out\n  about from a user, and five of the nine start that way.",
        notes: [
          { t: "p", text: "**The useful column is the signal, not the cause**: a failure you can see needs a handler, one you cannot needs a detector you might forget to write." },
          { t: "p", text: "**The model call, the graph looping and the process dying all RAISE** \u2014 these are the easy ones." },
          { t: "p", text: "**The state boundary is silent**: an undeclared key is discarded without a word." },
          { t: "p", text: "**And the tool surface splits in two.** The default handler returns the MODEL's mistakes to the model and propagates the TOOL's own exceptions." },
          { t: "p", text: "**Because the model can fix bad arguments and cannot fix an outage** \u2014 so `handle_tool_errors=True` turns a dependency failure into a message the model will loop trying to fix." },
          { t: "p", text: "**Four more surfaces are silent and no single call shows them**: the sub-agent, retrieval, the context strategy, and cost." },
          { t: "p", text: "**Five of nine are silent and a sixth is half silent** \u2014 most agentic failure does not raise." },
          { t: "p", text: "**So try/except and retries cover three of nine surfaces**, and the rest need instruments." },
          { t: "p", text: "**Each surface needs three columns**: detection, containment, recovery \u2014 and detection is the one you build." },
          { t: "p", text: "**A surface with no detection column is one you will hear about from a user**, and five of nine start that way." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the team that handled everything and saw nothing", body: [
      { t: "p", text: "A team hardens their agent: every node wrapped in try/except, retries on everything, `handle_tool_errors=True` so nothing escapes. Error rates go to near zero. Complaints about wrong answers go up." },
      { t: "p", text: "They covered the three surfaces that raise and made one of them worse. Turning every tool exception into a message for the model means an outage now reads to the agent as its own mistake, so it retries the call, gets the same error, and eventually answers around the missing data \u2014 a run that completes with a wrong answer instead of failing with a clear one." },
      { t: "p", text: "The five silent surfaces were untouched, because none of them produces an exception to catch: a retrieval returning irrelevant documents, a context strategy dropping the order number, a sub-agent returning plausible nonsense, an undeclared state key discarded, a run costing forty times what it should. The work those need is detection \u2014 a relevance check, a fact-survival check, a schema assertion, a cost cap \u2014 and the error rate going down was evidence of the handlers working, not of the system being correct." }
    ] }
  ],
  takeaways: [
    "**The useful column is whether anything tells you**, not what broke.",
    "**The model call, the graph looping and the process dying RAISE** \u2014 the easy ones.",
    "**The state boundary is silent**: an undeclared key is discarded without a word.",
    "**The tool surface splits in two**, by whose fault the failure is.",
    "**The default handler returns the model's mistakes to the model** as a ToolMessage to fix.",
    "**And propagates the tool's own exceptions**, because the model cannot fix an outage.",
    "**So `handle_tool_errors=True` is a worse default** \u2014 it makes an outage look like a fixable mistake.",
    "**Four more surfaces are silent**: the sub-agent, retrieval, the context strategy, and cost.",
    "**Five of nine are silent and a sixth is half silent.**",
    "**So try/except and retries cover three of nine surfaces.**",
    "**The silent ones produce a wrong answer rather than an error.**",
    "**Each surface needs detection, containment and recovery** \u2014 three columns.",
    "**Detection is the one you build**, and an instrument you did not build is simply absent.",
    "**A surface with no detection column is one you hear about from a user.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "The same tool raised a ValueError in one case and produced a ToolMessage in another. What distinguishes them?",
      options: ["The first was called inside a graph and the second outside it",
        "Whose fault it is \u2014 the default handler returns the model's mistakes to the model and propagates the tool's own exceptions",
        "The first had no retry policy configured",
        "ToolMessages are produced only for timeouts"],
      answer: 1,
      why: "Bad arguments, a missing field or an unknown tool name come back as a ToolMessage with an error status, because the model can read that and fix the call. The tool's own exception propagates, because no amount of re-prompting fixes a dependency being down. The default is a judgement about recoverability, not a blanket catch-or-raise setting." },
    { stem: "Why is handle_tool_errors=True a worse default than it appears?",
      options: ["It swallows errors the retry policy needs to see",
        "It erases the fault distinction, so an outage reaches the model as a mistake to fix \u2014 and the model fixes it by calling the tool again",
        "It prevents the ToolMessage from carrying a status field",
        "It only catches ValueError in practice"],
      answer: 1,
      why: "With everything converted to a message, a dependency being down arrives as 'Error: ... Please fix your mistakes', which the model cannot act on usefully. It retries the call, gets the same error, and may eventually answer around the missing data \u2014 a completed run with a wrong answer in place of a clear failure." },
    { stem: "Of the nine failure surfaces, how many are silent, and why does that matter most?",
      options: ["Three, and they are the hardest to reproduce",
        "Five, with a sixth half silent \u2014 so try/except and retries cover only the three that raise",
        "Seven, and they all involve the model",
        "One, the state boundary"],
      answer: 1,
      why: "The state boundary, the sub-agent, retrieval, the context strategy and cost all produce a wrong answer rather than an error, and the tool surface is split. So the instinct to start with exception handling addresses a third of the problem, and the remaining surfaces need instruments that are written deliberately or not at all." },
    { stem: "What does it mean for a surface to have no detection column?",
      options: ["It cannot fail in practice",
        "You will find out about it from a user, because nothing in the system reports it",
        "It needs a longer timeout",
        "Its failures are contained by the recursion limit"],
      answer: 1,
      why: "Containment and recovery only help with failures you know about. For a silent surface, the detector is something you write \u2014 a fact-survival check, a relevance assertion, a cost cap \u2014 and an instrument that was never built does not fail loudly, it is simply absent. That is why a checklist catches these and a test suite does not." }
  ] },
  interview: { title: "Interview practice", sub: "The failure surfaces", questions: [
    { level: "core", q: "What breaks in an agentic system?",
      strong: "A strong answer organises by signal, not by component.",
      answer: [
        { t: "p", text: "I would organise it by whether anything tells you, because that decides what kind of work each one needs." },
        { t: "p", text: "Three surfaces raise: the model call, the graph looping, and the process dying. Those are the easy ones \u2014 you catch them, retry them, resume them. I have measured all three and they produce a RuntimeError, a GraphRecursionError, and a surviving checkpoint respectively." },
        { t: "p", text: "Five are silent and produce a wrong answer instead of an error: an undeclared state key discarded without a word, a sub-agent returning plausible nonsense, a retrieval returning k documents when none is relevant, a context strategy dropping the subject of the conversation, and a run that succeeds while costing forty times what it should." },
        { t: "p", text: "And the tool surface is split, which I think is the most useful thing to know. LangGraph's default handler returns the model's own mistakes \u2014 bad arguments, an unknown tool name \u2014 to the model as a message to fix, and propagates the tool's own exceptions. Because the model can fix the first and cannot fix the second." },
        { t: "p", text: "So the practical consequence is that try/except and retries cover a third of the surface area. The rest needs detection you build, which is why I would want a checklist rather than a test suite \u2014 a test cannot fail for a check nobody wrote." }
      ] },
    { level: "advanced", q: "Where would you spend your first week hardening an agent?",
      strong: "A strong answer prioritises detection over recovery.",
      answer: [
        { t: "p", text: "On detection, not on recovery \u2014 because recovery only helps with failures I already know about, and most of the surface is silent." },
        { t: "p", text: "Concretely, four checks that each take under an hour. Does retrieval filter on permission before similarity or after. Is there an idempotency key on anything with an effect, and is it in graph state, where it does not work. What is the retry predicate, because the default is a deny list that retries an AttributeError and does not retry a TimeoutError. And list the facts one real conversation contains, apply the context strategy, and count the survivors." },
        { t: "p", text: "That last one is three lines of code and nobody runs it. I have measured a sliding window destroying all five identifying facts of a conversation while reporting a healthy token count." },
        { t: "p", text: "Then the metrics that need no labels: duplicate tool calls, cost per run, turn count as a distribution, and the firing rate of every fallback branch. All of those come from traces and each one catches a failure class that produces no exception." },
        { t: "p", text: "What I would deliberately not do first is wrap everything in try/except and turn on blanket tool error handling. That covers the three surfaces that already told me about themselves, and the blanket handler actively makes one worse by presenting an outage to the model as its own mistake." }
      ] },
    { level: "advanced", q: "A stakeholder asks why the error rate is near zero but users report wrong answers. How do you explain it?",
      strong: "A strong answer separates error rate from correctness with the surface count.",
      answer: [
        { t: "p", text: "That the error rate measures three of nine failure surfaces, and the complaints are coming from the other six." },
        { t: "p", text: "I would put it concretely. The failures that raise are the model call, the graph looping and the process dying \u2014 those are what an error rate counts, and a near-zero rate means the handlers for them are working." },
        { t: "p", text: "The ones producing wrong answers do not raise at all. A retrieval that returns k documents when none is relevant. A context strategy that dropped the order number. A sub-agent returning plausible nonsense that the supervisor treats as a result. A state key the schema does not declare, discarded silently. And a run that succeeds while costing forty times what it should." },
        { t: "p", text: "There is also a case where hardening made it worse. If tool errors are all being converted to messages for the model, a dependency outage arrives as 'please fix your mistakes' \u2014 so the agent retries, cannot succeed, and eventually answers around the missing data. That converts a clear failure into a completed run with a wrong answer, and it improves the error rate while doing it." },
        { t: "p", text: "So the thing I would propose is not better error handling but detection: a fact-survival check on the context strategy, a relevance assertion on retrieval, a schema assertion on state writes, a duplicated-work metric, and a cost cap. Each of those catches a class that no exception reports." }
      ] }
  ] }
});
