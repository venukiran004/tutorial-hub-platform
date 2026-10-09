EC.receiveLesson({
  id: "12.8",
  lede: "Four failure modes, and the striking thing about all of them is that **no agent is broken**. The infinite handoff is a property of the pair (12.3). Context loss is a consequence of choosing a bounded payload. Duplicated work happens because neither agent knows the other acted. And the blame problem is the hardest: agent B's output was reasonable given what A passed it, and A's was reasonable given the question \u2014 so no single agent is wrong and the system is. **Five of the six guards are shared-state or trace concerns rather than agent concerns**, which is this module's summary: in a multi-agent system the bugs live in the gaps.",
  objectives: [
    "Name the four failure modes and the guard for each",
    "Show context loss as a payload choice rather than an accident",
    "Demonstrate the duplicated-work guard and where it fails",
    "Explain why the blame problem is the hardest",
    "State where the guards live and what that implies"
  ],
  prerequisites: ["12.3", "12.7"],
  blocks: [
    { t: "h2", n: "01", id: "handoff", text: "Failure 1: the infinite handoff", sub: "A property of the pair" },
    { t: "p", text: "12.3 measured it: two agents each handing to the other, bounded only by the recursion limit \u2014 and **neither agent is broken**, since each correctly declines a request outside its area." },
    { t: "p", text: "**Guard**: a hop budget in the **shared** state, plus an escalation node. It has to be shared because no single agent can see the other's handoffs." },
    { t: "h2", n: "02", id: "context", text: "Failure 2: context loss at a boundary", sub: "Which is a choice" },
    { t: "code", lang: "text", title: "Shared state against a task payload",
      code: "shared state: b saw 2 message(s): ['I was charged twice', 'transferring']\ntask payload: b saw payload='check duplicate charge'\n              (the original wording is gone)",
      caption: "Neither is wrong." },
    { t: "callout", kind: "insight", title: "The failure is choosing one without noticing", body: [
      { t: "p", text: "Shared state keeps everything and pays for it; a payload is bounded and drops whatever the first agent did not think to include. *\u201cI was charged twice\u201d* became *\u201ccheck duplicate charge\u201d*, which is a reasonable summary that loses the user's own words \u2014 and those words may matter for tone, for a quote back to them, or for a detail the summariser judged irrelevant." },
      { t: "p", text: "**Guard**: pass the conversation **id** with a task payload, so the receiving agent can fetch what it needs rather than hoping it was sent (12.7)." }
    ] },
    { t: "h2", n: "03", id: "duplicate", text: "Failure 3: duplicated work", sub: "And where the guard fails" },
    { t: "code", lang: "text", title: "A work-done key",
      code: "researcher searched\nwriter: reusing the existing search\nsearches performed: 1",
      caption: "The writer checked before acting." },
    { t: "p", text: "**Guard**: a *what has been done* key in the shared state that agents check before acting. Which only works **with shared state** \u2014 with a task payload, each agent is blind to the others' work unless the payload says so." },
    { t: "callout", kind: "warn", title: "And in a parallel fan-out it does not work at all", body: [
      { t: "p", text: "8.6's superstep means both workers read the **same snapshot**, so neither sees the other's claim. A check-then-act pattern cannot work when the check and the act happen in the same step." },
      { t: "p", text: "So deduplication in a fan-out has to be in the **orchestrator**, before the fan-out \u2014 which is 12.5's point again: the decision needs a view only that node has." }
    ] },
    { t: "h2", n: "04", id: "blame", text: "Failure 4: the blame problem", sub: "The hardest one" },
    { t: "code", lang: "text", title: "Attribution, with name set",
      code: "name=None   HumanMessage('I was charged twice')\nname='a'    AIMessage('transferring')",
      caption: "Without `name`, the answer is \u201cunknown\u201d." },
    { t: "callout", kind: "trap", title: "Attribution is only half of it", body: [
      { t: "p", text: "The harder version: agent B's output was reasonable **given what A passed it**, and A's output was reasonable **given the question**. So no single agent is wrong and the system is \u2014 and there is no message to point at." },
      { t: "p", text: "That is the genuinely hard failure mode of multi-agent systems. The only thing that helps is recording the **handoffs with their reasons**, so the chain of *\u201cwhy did you give it that\u201d* is reconstructable \u2014 which is 8.8's argument for `Command` carrying the reason, and 5.7's auditability principle once more." }
    ] },
    { t: "h2", n: "05", id: "guards", text: "The guards, collected", sub: "And where they live" },
    { t: "table", head: ["failure", "guard", "where"], rows: [
      ["infinite handoff", "a hop budget + escalation", "**shared state**"],
      ["context loss", "pass the conversation id", "the handoff payload"],
      ["duplicated work", "a work-done key", "**shared state**, or the orchestrator"],
      ["the blame problem", "`name` + recorded handoffs", "**every message**"],
      ["a bad worker name", "a default branch (11.2)", "every router"],
      ["never finishing", "a turn budget + give-up", "the supervisor"]
    ] },
    { t: "callout", kind: "mental", title: "The bugs live in the gaps", body: [
      { t: "p", text: "Five of the six are **shared-state or trace** concerns rather than agent concerns. Which is the summary of this whole module: in a multi-agent system the failures are properties of the system, and the gaps are where nobody is looking because no single agent owns them." },
      { t: "p", text: "It is also 12.1's warning realised. *\u201cEach agent is simpler\u201d* is true, and the complexity moved to exactly the place with no owner \u2014 so the guards have to be designed deliberately rather than emerging from any individual agent being well written." }
    ] },
    { t: "diagram", kind: "matrix", title: "Four failure modes, and no agent is broken",
      caption: "That is the striking thing about all of them. Each is a property of the **composition** — of a pair, of a payload choice, of there being no shared record — which is why the instrumentation belongs on the gaps rather than on the agents.",
      cols: ["whose fault", "what detects it"],
      rows: ["an infinite handoff", "context loss", "duplicated work", "nobody to blame"],
      cells: [
        [{ text: "the PAIR (12.3)", tone: "crit" }, { text: "a hop budget + the handoff graph", tone: "good" }],
        [{ text: "the payload choice", tone: "crit" }, { text: "provenance as structure (12.7)", tone: "good" }],
        [{ text: "no shared record", tone: "crit" }, { text: "same tool, same args, one run", tone: "good" }],
        [{ text: "the composition", tone: "crit" }, { text: "per-agent scores on a labelled set", tone: "good" }]
      ] },
    { t: "exercise", kind: "build", title: "Build the four failures and their guards",
      difficulty: "advanced", minutes: 32,
      body: "Demonstrate each of the four multi-agent failure modes and the guard for each. For context loss, show the same handoff with shared state and with a task payload and explain why neither is wrong. For duplicated work, show a work-done check preventing a second search, and explain where that guard fails. For the blame problem, show attribution with and without the name field and explain what attribution still does not solve. Finally collect the guards and say where each lives.",
      requirements: ["Demonstrate the infinite handoff and its shared-state guard",
        "Show context loss with both shared state and a task payload",
        "Explain why neither is wrong and give the guard",
        "Show a work-done key preventing duplicated work",
        "Explain why that guard fails in a parallel fan-out and where it belongs instead",
        "Show attribution with and without name",
        "Explain the harder version of the blame problem",
        "Collect the guards and say where each lives"],
      hint: "For the blame problem, construct a case where every agent's output is reasonable given its input. There is no message to point at, which is the finding.",
      solution: { lang: "python", title: "x1208.py \u2014 five of six guards are not agent concerns",
        code: '# duplicated work: a work-done key, checked before acting\ndef writer(state):\n    if "searched docs" in state["work_done"]:\n        return {"trace": ["writer: reusing the existing search"]}\n    calls["n"] += 1\n    return {"work_done": ["searched docs"], ...}\n\n# context loss: the same handoff, two payload choices\ndef b(state):      # shared state\n    texts = [str(m.content)[:30] for m in state["messages"]]\n    return {"trace": ["b saw %d message(s): %s" % (len(texts), texts)]}\n\ndef b2(state):     # task payload\n    return {"trace": ["b saw payload=%r" % state["payload"]]}',
        out: "==============================================================================\nPART 1 -- failure 1 -- the infinite handoff\n==============================================================================\n  12.3 measured it: two agents each handing to the other, bounded\n  only by the recursion limit. and neither agent is broken -- each\n  correctly declines a request outside its area. the loop is a\n  property of the PAIR.\n\n  guard: a hop budget in the SHARED state, plus an escalation node.\n  it has to be shared because no single agent can see the other's\n  handoffs.\n==============================================================================\nPART 2 -- failure 2 -- context loss at a boundary\n==============================================================================\n  the receiving agent sees whatever the handoff passed. if that is a\n  task payload rather than the conversation, the original question\n  may be gone:\n\n    shared state: b saw 2 message(s): ['I was charged twice', 'transferring']\n\n    task payload: b saw payload='check duplicate charge' (the original wording is gone)\n\n  neither is wrong. shared state keeps everything and pays for it;\n  a payload is bounded and drops what the first agent did not think\n  to include. the failure is choosing one without noticing.\n\n  guard: pass the conversation ID with a task payload, so the\n  receiving agent can fetch what it needs rather than hoping it was\n  sent (12.7).\n==============================================================================\nPART 3 -- failure 3 -- duplicated work\n==============================================================================\n  two agents independently doing the same retrieval, because neither\n  knows the other did it:\n\n    researcher searched\n    writer: reusing the existing search\n    searches performed: 1\n\n  the guard is a 'what has been done' key in the shared state that\n  agents check before acting. which only works with shared state --\n  with a task payload, each agent is blind to the others' work\n  unless the payload says so.\n\n  and in a parallel fan-out it does not work at all: 8.6's superstep\n  means both workers read the same snapshot, so neither sees the\n  other's claim. deduplication there has to be in the ORCHESTRATOR,\n  before the fan-out.\n==============================================================================\nPART 4 -- failure 4 -- the blame problem\n==============================================================================\n  the output is wrong. which agent caused it?\n\n  with shared state and no attribution, the history is a sequence of\n  AIMessages and the answer is 'unknown'. with `name` on each\n  message it is answerable:\n\n    name=None   HumanMessage('I was charged twice')\n    name='a'    AIMessage('transferring')\n\n  but attribution is only half of it. the harder version is that\n  agent B's output was reasonable GIVEN what A passed it, and A's\n  output was reasonable given the question. so no single agent is\n  wrong and the system is.\n\n  that is the genuinely hard failure mode of multi-agent systems,\n  and the only thing that helps is recording the handoffs with their\n  reasons -- so the chain of 'why did you give it that' is\n  reconstructable. which is 8.8's argument for Command carrying the\n  reason, and 5.7's auditability principle once more.\n==============================================================================\nPART 5 -- the guards, collected\n==============================================================================\n  failure              guard                      where\n  infinite handoff     a hop budget + escalation   shared state\n  context loss         pass the conversation id    the handoff payload\n  duplicated work      a work-done key             shared state, or\n                                                   the orchestrator\n  the blame problem    `name` + recorded handoffs  every message\n  a bad worker name    a default branch (11.2)     every router\n  never finishing      a turn budget + give-up     the supervisor\n\n  five of the six are shared-state or trace concerns rather than\n  agent concerns. which is the summary of this whole module: in a\n  multi-agent system the bugs live in the GAPS, and the gaps are\n  where nobody is looking because no single agent owns them.",
        notes: [
          { t: "p", text: "**The infinite handoff is a property of the pair** \u2014 neither agent is broken, and the guard is a hop budget in shared state plus escalation." },
          { t: "p", text: "**Context loss is a choice**: shared state keeps everything and pays for it; a task payload is bounded and loses the user's own words." },
          { t: "p", text: "**The failure is choosing one without noticing** \u2014 and the guard is passing the conversation id so the receiver can fetch what it needs." },
          { t: "p", text: "**A work-done key prevented a second search**, which only works with shared state." },
          { t: "p", text: "**And it fails entirely in a parallel fan-out**, because 8.6's superstep means both workers read the same snapshot and neither sees the other's claim." },
          { t: "p", text: "**So fan-out deduplication belongs in the orchestrator**, before the fan-out \u2014 12.5's point again." },
          { t: "p", text: "**Without `name`, the blame question's answer is \u2018unknown\u2019** \u2014 and attribution is only half of it." },
          { t: "p", text: "**The harder version: every agent's output was reasonable given its input**, so no single agent is wrong and the system is, with no message to point at." },
          { t: "p", text: "**Five of the six guards are shared-state or trace concerns**, not agent concerns \u2014 in a multi-agent system the bugs live in the gaps." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the answer that nobody got wrong", body: [
      { t: "p", text: "A research agent is asked about a product's rate limits and returns three sources, one of which describes a deprecated plan. A writing agent composes an answer from all three and quotes the deprecated limit. A reviewer asks which agent made the mistake." },
      { t: "p", text: "Neither did. The researcher was asked for sources about rate limits and returned sources about rate limits, including a historical one \u2014 a reasonable retrieval. The writer was given three sources and synthesised them \u2014 a reasonable composition. The error is that nothing in the handoff carried *\u201cthis one is deprecated\u201d*, and no agent was responsible for noticing." },
      { t: "p", text: "The guards that help are the module's: `name` so the sources are attributable, provenance carried as structured state rather than prose (12.7), and the handoff recorded with its reason. But the deeper lesson is that this failure has **no owner by construction** \u2014 which is the strongest available argument for 12.1's default of one agent, where the same mistake would at least be one component's to make." }
    ] }
  ],
  takeaways: [
    "**Four failure modes, and in all of them no agent is broken.**",
    "**The infinite handoff is a property of the pair** \u2014 guard with a hop budget in shared state.",
    "**Context loss is a choice**: shared state keeps everything, a payload drops the unanticipated.",
    "**\u2018I was charged twice\u2019 became \u2018check duplicate charge\u2019** \u2014 reasonable, and the user's words are gone.",
    "**Guard: pass the conversation id**, so the receiver can fetch rather than hope.",
    "**A work-done key prevented a duplicate search**, and only works with shared state.",
    "**It fails entirely in a parallel fan-out** \u2014 both workers read the same snapshot (8.6).",
    "**So fan-out deduplication belongs in the orchestrator**, before the fan-out.",
    "**Without `name`, the blame question's answer is \u2018unknown\u2019.**",
    "**And attribution is only half of it.**",
    "**The harder version: every agent was reasonable given its input**, so the system is wrong and no agent is.",
    "**Record handoffs with their reasons**, so \u2018why did you give it that\u2019 is reconstructable (8.8).",
    "**Five of the six guards are shared-state or trace concerns**, not agent concerns.",
    "**In a multi-agent system the bugs live in the gaps**, where no agent owns them.",
    "**Which is the strongest argument for 12.1's default of one agent.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What do all four multi-agent failure modes have in common?",
      options: ["They are caused by weak prompts",
        "No individual agent is broken \u2014 each is a property of the system",
        "They only occur with more than three agents",
        "They are all caught by the recursion limit"],
      answer: 1,
      why: "A mutual handoff loop involves two agents each correctly declining a request outside its area. Duplicated work involves two agents each doing a reasonable retrieval. The blame problem involves agents whose outputs were each reasonable given their inputs. So reviewing any single agent finds nothing, which is why the guards must be designed at the system level rather than emerging from well-written agents." },
    { stem: "Why does a work-done key fail to prevent duplication in a parallel fan-out?",
      options: ["Reducers overwrite the key",
        "Both workers read the same snapshot, so neither sees the other's claim \u2014 check-then-act cannot work within one superstep",
        "The key is not serialisable",
        "Workers cannot read shared state"],
      answer: 1,
      why: "A superstep reads a consistent snapshot before any node writes, so a worker checking whether the work has been claimed sees the state as it was before its sibling claimed it. The check and the act are in the same step. Deduplication therefore has to happen in the orchestrator before the fan-out, which is the only place with a view of all the pieces." },
    { stem: "A researcher returned a deprecated source and a writer quoted it. Which agent was wrong?",
      options: ["The researcher, for returning an outdated document",
        "Neither \u2014 each behaved reasonably given its input, and nothing in the handoff carried the deprecation",
        "The writer, for not verifying the sources",
        "Both, equally"],
      answer: 1,
      why: "The researcher was asked for sources about rate limits and returned sources about rate limits; the writer was given three sources and synthesised them. The error is that the handoff carried no provenance and no agent was responsible for noticing. This failure has no owner by construction, which is the strongest argument for preferring a single agent where possible." },
    { stem: "Where do most multi-agent guards live?",
      options: ["In each agent's prompt",
        "In the shared state or the trace \u2014 five of six are system concerns rather than agent concerns",
        "In the supervisor's routing function",
        "In the recursion limit and retry policies"],
      answer: 1,
      why: "A hop budget and a work-done key are shared state; name and recorded handoffs are trace concerns; a default branch belongs to every router and a turn budget to the supervisor. Only the last two sit inside a component. That distribution is the module's summary: the failures are properties of the system, so the guards are too." }
  ] },
  interview: { title: "Interview practice", sub: "Multi-agent failure modes", questions: [
    { level: "core", q: "What are the characteristic failures of a multi-agent system?",
      strong: "A strong answer notes no agent is broken in any of them.",
      answer: [
        { t: "p", text: "Four, and what they have in common is more interesting than the list: in every one of them, no individual agent is broken." },
        { t: "p", text: "The infinite handoff \u2014 two agents each correctly declining a request outside its area, bounded only by the recursion limit. Context loss at a boundary, where a task payload drops what the sender did not anticipate needing. Duplicated work, where two agents each do a reasonable retrieval because neither knows the other did. And the blame problem." },
        { t: "p", text: "So reviewing any single agent finds nothing wrong, which is why these are hard. The guards have to be designed at the system level rather than emerging from well-written agents." },
        { t: "p", text: "And the guards reflect that. A hop budget and a work-done key live in the shared state, because no agent can see the others' actions. Attribution and recorded handoffs are trace concerns. Five of the six guards worth having are not agent concerns at all." }
      ] },
    { level: "advanced", q: "What is the hardest multi-agent failure to debug?",
      strong: "A strong answer describes the no-owner failure concretely.",
      answer: [
        { t: "p", text: "The one where every agent was reasonable and the system was wrong \u2014 because there is no message to point at." },
        { t: "p", text: "The concrete shape: a research agent is asked for sources about rate limits and returns three, one describing a deprecated plan. A writing agent is given three sources and synthesises them, quoting the deprecated limit. Ask which agent made the mistake and the honest answer is neither. The researcher retrieved what it was asked for. The writer composed from what it was given." },
        { t: "p", text: "The error is that nothing in the handoff carried 'this one is deprecated', and no agent was responsible for noticing. The failure has no owner by construction." },
        { t: "p", text: "Attribution helps and is not sufficient. Setting the name field makes 'which agent said that' answerable, which is necessary \u2014 without it the history is undifferentiated assistant turns. But it does not help when the answer is 'all of them, correctly'." },
        { t: "p", text: "What actually helps is recording the handoffs with their reasons, so the chain of why each agent gave the next one what it did is reconstructable. And carrying provenance as structured state rather than prose, so the deprecation is a field rather than something a reader has to infer." },
        { t: "p", text: "Though honestly, this failure mode is the strongest argument for preferring a single agent where one will do \u2014 because then the same mistake is at least one component's to make." }
      ] },
    { level: "core", q: "What would you monitor on a multi-agent system?",
      strong: "A strong answer instruments the gaps rather than the agents.",
      answer: [
        { t: "p", text: "The gaps, because that is where the failures are \u2014 and most of what I would want is about handoffs rather than about any agent." },
        { t: "p", text: "The handoff graph: which agent handed to which, how often, with the reason. That makes a mutual handoff loop visible as a class rather than as individual timeouts, and it shows up a request type that bounces \u2014 which is usually a product ambiguity about who owns something." },
        { t: "p", text: "Hop count per request as a distribution, not a mean, since the tail is where the loops are. And which exit fired: answered, hop budget exhausted, escalated to a human. Without that, an escalation path firing constantly is invisible." },
        { t: "p", text: "Coordination calls as a fraction of total model calls, which is the number that tells me whether the multi-agent structure is earning its keep. I measured a supervisor arrangement at five calls against three for one agent, so that ratio is a standing question rather than a one-off." },
        { t: "p", text: "Duplicated work \u2014 the same tool called with the same arguments twice in one request \u2014 which is cheap to detect from traces and otherwise invisible." },
        { t: "p", text: "And per-agent quality against a labelled set, so when an output is wrong I can tell whether one agent degraded or the composition did. That is the only measurement that helps with the blame problem." }
      ] }
  ] }
});
