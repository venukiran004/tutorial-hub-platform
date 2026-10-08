EC.receiveLesson({
  id: "11.8",
  lede: "The comparison, with the costs measured rather than asserted. On the same question \u2014 *\u201cwhat is the refund policy\u201d* against a corpus containing the answer \u2014 a single tool call is **1** model call and is the cheapest **correct** answer; the agent loop is **2**; reflection is **6**. The column that decides a design is the last one: **is it predictable?** And the part most pattern catalogues omit is that the guards are **identical across all of them** \u2014 six of them, five of which are code you write. The rule, stated once: use the least agentic pattern that solves the problem, and read the table **upward**.",
  objectives: [
    "Compare the patterns on cost, paths, looping and predictability",
    "Apply the decision tree",
    "Recognise reflection, reflexion and agentic RAG as modifiers",
    "Name the guards every pattern needs",
    "State the rule and the asymmetry behind it"
  ],
  prerequisites: ["11.1", "11.7"],
  blocks: [
    { t: "h2", n: "01", id: "table", text: "The patterns side by side", sub: "And the column that matters" },
    { t: "table", head: ["pattern", "model calls", "paths", "loops?", "predictable?"], rows: [
      ["single call", "1", "1", "no", "**yes**"],
      ["call + tools", "1", "1", "no", "**yes**"],
      ["router", "1 + handler", "n categories", "no", "**yes**"],
      ["ReAct", "**2..N unbounded**", "many", "**yes**", "no"],
      ["reflection", "2 \u00d7 rounds", "1", "yes", "bounded"],
      ["reflexion", "reflection + memory", "", "yes", "no"],
      ["plan-and-execute", "1 + len(plan)", "many", "yes", "after planning"],
      ["agentic RAG", "2..5 + grading", "several", "yes", "bounded"]
    ] },
    { t: "p", text: "The last column decides a design, because it is what lets you say something about cost and latency **before** shipping (9.3). Everything else in the table is a consequence of it." },
    { t: "h2", n: "02", id: "tree", text: "The decision tree", sub: "Two questions" },
    { t: "code", lang: "text", title: "Where the control sits",
      code: "does the model need to decide ANYTHING?\n  no  -> a chain. most RAG pipelines are here (8.1).\n  yes -> does the SEQUENCE vary, or only the CHOICE?\n         only the choice -> ROUTER\n         the sequence too -> can you plan it up front?\n                             yes -> PLAN-AND-EXECUTE\n                             no  -> REACT",
      caption: "Two questions, four answers." },
    { t: "h2", n: "03", id: "modifiers", text: "Three modifiers, not alternatives", sub: "Which is the part the table hides" },
    { t: "dl", items: [
      ["is the output **quality** the problem?", "add **reflection** (11.4)"],
      ["does it fail the **same way** repeatedly?", "add **reflexion** (11.5)"],
      ["is **retrieval** the unreliable part?", "use **agentic RAG** (11.7)"]
    ] },
    { t: "callout", kind: "insight", title: "They compose with the base pattern", body: [
      { t: "p", text: "Reflection, reflexion and agentic RAG are orthogonal to the router-ReAct-planning axis. You can put reflection inside a plan-and-execute worker, or make the retrieval step of a ReAct agent corrective." },
      { t: "p", text: "Which matters because a catalogue presented as eight alternatives invites choosing one. The useful framing is a base pattern decided by where the control sits, plus modifiers decided by which failure you are seeing." }
    ] },
    { t: "h2", n: "04", id: "guards", text: "The guards every pattern needs", sub: "Identical across all of them" },
    { t: "table", head: ["guard", "where", "from"], rows: [
      ["an iteration budget", "the router", "10.5, 8.9"],
      ["a progress check", "the router", "10.5"],
      ["a **give-up node**", "the graph", "11.3 \u2014 so failure is a response, not an exception"],
      ["a **default branch**", "the router", "11.2 \u2014 model output is not enumerable"],
      ["**which exit fired**", "recorded", "10.5 \u2014 or a dead loop hides"],
      ["`recursion_limit`", "compile / invoke", "8.9, as a backstop"]
    ] },
    { t: "callout", kind: "good", title: "Five of the six are code you write", body: [
      { t: "p", text: "The framework provides one \u2014 `recursion_limit` \u2014 and it is the one that should fire **least** often, because it firing means every other guard failed." },
      { t: "p", text: "This is the part most pattern descriptions omit, and it is identical regardless of which pattern you chose. So a pattern catalogue without the guards is a catalogue of half-built systems." }
    ] },
    { t: "h2", n: "05", id: "costs", text: "The same task, six ways", sub: "Measured" },
    { t: "table", head: ["pattern", "model calls", "got the answer?", "notes"], rows: [
      ["single call", "1", "from memory", "**ungrounded** (5.7)"],
      ["call + tools", "**1**", "yes", "the tool output **is** the answer"],
      ["router + handler", "1", "yes", "if the category was right (11.2)"],
      ["ReAct", "2", "yes", "a second call to phrase it"],
      ["reflection", "**6**", "yes, polished", "3 rounds \u00d7 2"],
      ["agentic RAG", "2 + grading", "yes", "plus the retry path if weak"]
    ] },
    { t: "callout", kind: "mental", title: "Everything above rung 2 buys something other than the answer", body: [
      { t: "p", text: "The single tool call is the cheapest **correct** answer, and the single call is the cheapest answer \u2014 ungrounded, which 5.7 showed is a failing test even when the content is right." },
      { t: "p", text: "Above that you are buying phrasing, robustness, or the ability to handle a question **this one did not need**. All three are legitimate purchases; none of them is the answer, and knowing which one you are buying is the point of the comparison." }
    ] },
    { t: "h2", n: "06", id: "rule", text: "The rule, stated once", sub: "And the asymmetry behind it" },
    { t: "p", text: "Use the least agentic pattern that solves the problem, and read the table **upward** rather than downward." },
    { t: "callout", kind: "insight", title: "Because the two mistakes are not symmetric", body: [
      { t: "p", text: "A bounded pattern that nearly works is one branch or one tool away from working \u2014 the gap is visible and the fix is local. An agent that works unpredictably is a measurement problem, a cost problem and a debugging problem simultaneously, and none of those is one change from fixed." },
      { t: "p", text: "There is an effort asymmetry too: moving up the ladder is additive \u2014 a router plus a loop is an agent \u2014 while moving down means discovering which of the agent's freedoms were load-bearing, which requires measurements you did not take." }
    ] },
    { t: "p", text: "The practical corollary: when a stakeholder asks for an agent, ask for **twenty real examples** of what it must handle. Most of the time they resolve to a handful of intents with one operation each \u2014 which is a router \u2014 and saying so early is worth more than any individual pattern in this module." },
    { t: "exercise", kind: "analysis", title: "Compare the patterns on one task",
      difficulty: "core", minutes: 30,
      body: "Tabulate the patterns on model calls, number of paths, whether they can loop, and whether their cost is predictable. Give a decision tree based on where the control sits. Identify which patterns are modifiers rather than alternatives. Then list the guards every pattern needs, noting where each lives and how many the framework provides. Finally run the same task through several patterns, report the model calls, and state the rule with the reasoning behind it.",
      requirements: ["Tabulate at least six patterns on four dimensions",
        "Say which column decides a design and why",
        "Give a decision tree with the control question at its root",
        "Identify the three modifiers and how they compose",
        "List the guards, where each lives, and how many the framework provides",
        "Compare model calls for the same task across several patterns",
        "State the rule and the asymmetry that justifies it"],
      hint: "Count the model calls for the same question under each pattern. The cheapest correct answer is lower on the ladder than most designs assume.",
      solution: { lang: "text", title: "x1108.py \u2014 1 call for the cheapest correct answer",
        code: "pattern            model calls   got the answer?   notes\nsingle call        1             from memory       ungrounded (5.7)\ncall + tools       1             yes               the tool output IS it\nrouter + handler   1             yes               if the category was right\nReAct              2             yes               a second call to phrase it\nreflection         6             yes, polished     3 rounds x 2\nagentic RAG        2 + grading   yes               plus the retry path",
        out: "==============================================================================\nPART 1 -- the patterns side by side\n==============================================================================\n  pattern            model calls      paths      loops?  predictable?\n  single call        1                1          no      yes\n  call + tools       2                1          no      yes\n  router             1 + handler      n cats     no      yes\n  ReAct              2..N unbounded   many       YES     no\n  reflection         2 x rounds       1          yes      bounded\n  reflexion          reflection + memory         yes      no\n  plan-and-execute   1 + len(plan)    many       yes      after planning\n  agentic RAG        2..5 + grading   several    yes      bounded\n\n  the column that matters is the last one, because it decides what\n  you can tell someone about cost and latency before shipping (9.3).\n==============================================================================\nPART 2 -- the decision tree\n==============================================================================\n  does the model need to decide ANYTHING?\n    no  -> a chain. most RAG pipelines are here (8.1).\n    yes -> does the SEQUENCE vary, or only the CHOICE?\n           only the choice -> ROUTER\n           the sequence too -> can you plan it up front?\n                               yes -> PLAN-AND-EXECUTE\n                               no  -> REACT\n\n  then, orthogonally:\n    is the output quality the problem?      -> add REFLECTION\n    does it fail the same way repeatedly?   -> add REFLEXION\n    is retrieval the unreliable part?       -> AGENTIC RAG\n\n  note those three are MODIFIERS rather than alternatives. you can\n  put reflection inside a plan-and-execute worker, or make the\n  retrieval step of a ReAct agent corrective.\n==============================================================================\nPART 3 -- the guards every pattern needs\n==============================================================================\n  this is the part that is identical across all of them, and it is\n  the part most pattern descriptions omit:\n\n  guard                    where            from\n  an iteration budget      the router       10.5, 8.9\n  a progress check         the router       10.5\n  a give-up NODE           the graph        11.3 -- so failure is a\n                                            response, not an\n                                            exception\n  a default branch         the router       11.2 -- model output is\n                                            not enumerable\n  which exit fired         recorded         10.5 -- or a dead loop\n                                            hides\n  recursion_limit          compile/invoke   8.9, as a backstop\n\n  five of those six are code you write. the framework provides one.\n==============================================================================\nPART 4 -- the same task, six ways\n==============================================================================\n  'what is the refund policy', against a corpus that contains the\n  answer:\n\n  pattern            model calls   got the answer?   notes\n  single call        1             from memory       ungrounded (5.7)\n  call + tools       1             yes               the tool output\n                                                     IS the answer\n  router + handler   1             yes               if the category\n                                                     was right (11.2)\n  ReAct              2             yes               a second call to\n                                                     phrase it\n  reflection         6             yes, polished     3 rounds x 2\n  agentic RAG        2 + grading   yes               plus the retry\n                                                     path if weak\n\n  the single tool call is the cheapest CORRECT answer, and the\n  single call is the cheapest answer. everything above rung 2 is\n  buying something other than the answer -- phrasing, robustness,\n  or the ability to handle a question this one did not need.\n==============================================================================\nPART 5 -- the rule, stated once\n==============================================================================\n  use the least agentic pattern that solves the problem, and read\n  the table upward rather than downward.\n\n  the reason is the asymmetry of the mistake. a bounded pattern that\n  nearly works is one branch or one tool away from working -- the\n  gap is visible and the fix is local. an agent that works\n  unpredictably is a measurement problem, a cost problem and a\n  debugging problem simultaneously, and none of those is one change\n  from fixed.\n\n  and the practical corollary: when a stakeholder asks for an agent,\n  ask for twenty real examples of what it must handle. most of the\n  time they resolve to a handful of intents with one operation each,\n  which is a router -- and saying so early is worth more than any\n  pattern in this module.",
        notes: [
          { t: "p", text: "**The column that decides a design is \u2018predictable?\u2019** \u2014 it is what lets you state cost and latency before shipping (9.3)." },
          { t: "p", text: "**The decision tree has two questions**: does the model decide anything, and does the sequence vary or only the choice?" },
          { t: "p", text: "**Reflection, reflexion and agentic RAG are modifiers**, orthogonal to the router-ReAct-planning axis \u2014 you can put reflection inside a plan-and-execute worker." },
          { t: "p", text: "**So the framing is a base pattern plus modifiers**, not a choice among eight alternatives." },
          { t: "p", text: "**Six guards, identical across every pattern**, and five of them are code you write \u2014 the framework provides `recursion_limit` alone." },
          { t: "p", text: "**Which should fire least often**, because it firing means every other guard failed. A pattern catalogue without the guards is a catalogue of half-built systems." },
          { t: "p", text: "**The single tool call is the cheapest correct answer at 1 model call**; reflection is 6; everything above rung 2 buys phrasing, robustness or generality rather than the answer." },
          { t: "p", text: "**The rule: use the least agentic pattern that solves the problem, and read upward** \u2014 because a bounded pattern is one branch from working and an unpredictable agent is three problems at once." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the architecture review that asked for examples", body: [
      { t: "p", text: "A team proposes a multi-tool agent for an internal assistant. The reviewer asks for twenty real requests it must handle, drawn from the existing support queue rather than imagined. Eighteen of them resolve to one of four intents, each needing one lookup. Two are genuinely open-ended research questions." },
      { t: "p", text: "That distribution answers the design: a router for the eighteen, with one of its branches being a small ReAct agent for the open-ended pair. Cost is one classification plus a lookup for ninety percent of traffic, and the unpredictable pattern is confined to the ten percent that needs it." },
      { t: "p", text: "What makes this the useful move is that it requires no architectural insight \u2014 just the examples. The patterns in this module are not hard to understand; the hard part is knowing which one the actual traffic needs, and that is a question about the requests rather than about the patterns. Asking for twenty examples early is worth more than knowing any of them." }
    ] }
  ],
  takeaways: [
    "**The column that decides a design is \u2018predictable?\u2019** \u2014 what you can say before shipping.",
    "**Two questions**: does the model decide anything, and does the sequence vary or only the choice?",
    "**Only the choice varying is a router**; a varying sequence is ReAct, or planning if you can plan it.",
    "**Reflection, reflexion and agentic RAG are modifiers**, orthogonal to that axis.",
    "**So it is a base pattern plus modifiers**, not a choice among eight alternatives.",
    "**Six guards, identical across every pattern.**",
    "**Five are code you write**; the framework provides `recursion_limit` alone.",
    "**Which should fire least often**, because it firing means every other guard failed.",
    "**A pattern catalogue without the guards is a catalogue of half-built systems.**",
    "**The single tool call is the cheapest correct answer at 1 model call.**",
    "**A single call is cheaper and ungrounded**, which 5.7 showed is a failing test.",
    "**Reflection was 6 calls** \u2014 everything above rung 2 buys phrasing, robustness or generality.",
    "**Use the least agentic pattern that solves the problem, and read the table upward.**",
    "**Because a bounded pattern is one branch from working** and an unpredictable agent is three problems at once.",
    "**Ask for twenty real examples** \u2014 most resolve to a handful of intents with one operation each."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Which column in the pattern comparison actually decides a design?",
      options: ["Model calls, since it determines cost",
        "Whether the cost is predictable \u2014 it is what lets you state cost and latency before shipping",
        "Number of paths, since it determines testability",
        "Whether it can loop"],
      answer: 1,
      why: "The other columns are consequences. A pattern whose model-call count you can derive by reading the graph lets you commit to a latency budget and a per-request cost; one whose step count is model output does not, which is why frameworks ship a hard recursion ceiling. Predictability is the property you trade away as you move down the ladder." },
    { stem: "How do reflection, reflexion and agentic RAG relate to the router-ReAct-planning axis?",
      options: ["They are more advanced alternatives further down the ladder",
        "They are modifiers that compose with a base pattern \u2014 reflection can live inside a plan-and-execute worker",
        "They replace the base pattern when quality matters",
        "They are only applicable to retrieval systems"],
      answer: 1,
      why: "The base pattern is decided by where the control sits; the modifiers are decided by which failure you are observing. Treating all eight as alternatives invites picking one, when the useful question is which base plus which modifier \u2014 a ReAct agent whose retrieval step is corrective, or a planner whose workers reflect." },
    { stem: "How many of the six universal guards does the framework provide?",
      options: ["All six, through compile() options",
        "One \u2014 recursion_limit \u2014 and it should fire least often, because it firing means the others failed",
        "Three: the recursion limit, retry policies and interrupts",
        "None; all are application code"],
      answer: 1,
      why: "The iteration budget, progress check, give-up node, default branch and exit recording are all code you write, in routers and nodes. recursion_limit is the runtime's only contribution and is a backstop by design. A pattern described without those five is a pattern that will run away, loop uselessly, raise instead of answering, or fail on an unmapped category." },
    { stem: "For a question whose answer is in a corpus, which pattern gives the cheapest CORRECT answer?",
      options: ["A single call, at 1 model call",
        "A single tool-calling turn, at 1 model call \u2014 the tool output is the answer",
        "A ReAct agent, at 2 model calls",
        "Agentic RAG, because it verifies the retrieval"],
      answer: 1,
      why: "A single call is equally cheap and answers from memory, which is ungrounded \u2014 a failing test even when the content happens to be right. One tool-calling turn costs the same single model call and returns the retrieved text itself. Everything above that buys phrasing, robustness or the ability to handle questions this one did not need." }
  ] },
  interview: { title: "Interview practice", sub: "Choosing a pattern", questions: [
    { level: "core", q: "How would you choose an agent pattern for a new project?",
      strong: "A strong answer asks for examples before choosing.",
      answer: [
        { t: "p", text: "I would ask for twenty real requests the system must handle, taken from an existing queue rather than imagined, and let the distribution answer it." },
        { t: "p", text: "Then two questions. Does the model need to decide anything at all \u2014 because if not, it is a chain, and most retrieval pipelines are. And if so, does the sequence of operations vary by request or only the choice? Only the choice is a router. A varying sequence is ReAct, or plan-and-execute if the steps are knowable up front." },
        { t: "p", text: "The thing I have seen repeatedly is that eighteen of twenty requests resolve to a handful of intents with one operation each, and two are genuinely open-ended. That answers the design: a router for the eighteen, with one branch being a small agent for the rest. The unpredictable pattern is then confined to the traffic that needs it." },
        { t: "p", text: "And I would treat reflection, reflexion and corrective retrieval as modifiers rather than alternatives \u2014 they compose with whichever base pattern the control question picked, and which one you add is decided by the failure you are actually seeing." }
      ] },
    { level: "advanced", q: "What do pattern catalogues usually leave out?",
      strong: "A strong answer names the guards and that they are universal.",
      answer: [
        { t: "p", text: "The guards, and the fact that they are identical regardless of which pattern you picked. A catalogue without them is a catalogue of half-built systems." },
        { t: "p", text: "There are six. An iteration budget in the router, so the graph returns rather than hitting the recursion limit. A progress check, because a budget bounds iterations and notices nothing about whether anything is advancing \u2014 I measured a refiner burning its full budget producing identical output. A give-up node, so exhaustion is a response rather than an exception and the user does not get a 500." },
        { t: "p", text: "A default branch on any router over model output, because the set of strings a model can emit is not enumerable \u2014 I have seen a year-old router start raising after a model upgrade changed how closely it followed a formatting instruction. Recording which exit fired, because 'good enough' and 'ran out of budget' produce the same output and a dead loop otherwise hides for months." },
        { t: "p", text: "And the recursion limit, which is the only one the framework gives you and the one that should fire least often \u2014 it firing means all the others failed." },
        { t: "p", text: "The second thing catalogues leave out is the cost comparison on one task. I measured the same question at one model call for a single tool-calling turn, two for a ReAct loop, and six for three rounds of reflection. Seeing those side by side changes which pattern looks reasonable." }
      ] },
    { level: "core", q: "How would you migrate an existing agent to a simpler pattern?",
      strong: "A strong answer measures the traffic before changing anything.",
      answer: [
        { t: "p", text: "By measuring what the agent actually does before changing anything, because the question is which of its freedoms are load-bearing and that is answerable from traces." },
        { t: "p", text: "So: log the sequence of tools each request used, and the step count. Then look at the distribution of distinct sequences. If ninety percent of requests use one tool once, chosen from five, the agent is a router with extra steps and the migration is mechanical." },
        { t: "p", text: "That measurement is also the risk assessment. The requests with long or unusual sequences are the ones a router would break, and counting them tells me whether to keep an agent branch for that traffic rather than guessing." },
        { t: "p", text: "I would migrate incrementally rather than rewrite: put a router in front, send the recognised intents to direct handlers, and leave the existing agent as the fallback branch. Then the change is additive and reversible, and the fallback rate is the metric that tells me how well the categories cover the traffic." },
        { t: "p", text: "What I would not do is lead with the architecture argument. 'This should be a router' is a position; 'ninety percent of requests make one tool call and here is the distribution' is a measurement, and only one of those settles a disagreement." },
        { t: "p", text: "And I would keep the guards either way, since they are identical across patterns and the router still needs a default branch." }
      ] }
  ] }
});
