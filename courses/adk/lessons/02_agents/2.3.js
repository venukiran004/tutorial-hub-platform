/* ============================================================================
   LESSON 2.3 — Sequential, Parallel and Loop Agents
   All three traces produced by running the agents with scripted models.
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "**When the order of work is known in advance, a model should not be asked to decide it.** The three workflow agents run their children deterministically: `SequentialAgent` one after another, `ParallelAgent` at the same time on separate branches, `LoopAgent` repeatedly until a child escalates or an iteration cap is hit. None of them calls a model — they are pure orchestration, which means they cost nothing, never hallucinate a step and are trivially testable. This lesson runs all three, shows how state carries data between steps, reads the branch names parallel children get, and demonstrates both ways a loop terminates.",

  objectives: [
    "Choose between a workflow agent and LLM-driven delegation for a given piece of orchestration",
    "Pass data between sequential steps with output_key and instruction templating",
    "Read the branch field on events produced by parallel children, and fan results back in",
    "Terminate a LoopAgent with exit_loop and with max_iterations, and say which the agent controls",
    "Compose workflow agents — a parallel stage inside a sequential pipeline"
  ],

  prerequisites: ["2.1", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Three agents that never call a model", id: "three" },

    { t: "diagram", kind: "compare", title: "What each one does with its children",
      caption: "All three are BaseAgent subclasses with sub_agents, so they compose with each other and with LLM agents freely. What they do not do is decide anything: the control flow is in the class, not in a prompt.",
      columns: [
        { title: "SequentialAgent", tone: "accent", items: ["children in order", "each sees the state the previous wrote", "stops if one escalates", "the default pipeline"] },
        { title: "ParallelAgent", tone: "good", items: ["children concurrently", "each on its own branch", "independent work only", "fan out, then fan in"] },
        { title: "LoopAgent", tone: "warn", items: ["children repeatedly", "until escalate or max_iterations", "refine-and-check patterns", "always set a cap"] }
      ] },

    { t: "callout", kind: "warn", title: "All three are deprecated in favour of Workflow",
      body: [{ t: "p", text: "Constructing any of them on google-adk 2.9.2 emits `SequentialAgent is deprecated in favor of Workflow and will be removed in a future version. Workflow cannot yet be used as an LlmAgent sub-agent.` — verbatim, with the class name swapped for the other two. Read that second sentence carefully, because it is the reason this lesson is not obsolete: `Workflow` (lesson 2.4) is the replacement, but it cannot yet sit under an `LlmAgent`, so a pipeline that a model must be able to transfer to still has to be one of these three today." },
        { t: "p", text: "Write new top-level pipelines as a `Workflow` where you can, keep these where the graph must be a sub-agent, and expect to migrate. The concepts transfer intact — ordering, concurrency, iteration with a cap — which is why they are worth learning in this simpler form first." }] },

    { t: "h2", n: "02", text: "SequentialAgent", id: "sequential" },

    { t: "code", lang: "python", title: "Write, critique, revise",
      code: `w = LlmAgent(name="writer",  model=llm1, instruction="Write a draft.", output_key="draft")
c = LlmAgent(name="critic",  model=llm2, instruction="Critique this draft: {draft}", output_key="critique")
r = LlmAgent(name="reviser", model=llm3, instruction="Revise {draft} using {critique}", output_key="final")

pipeline = SequentialAgent(name="pipeline", sub_agents=[w, c, r])`,
      caption: "The data flow is entirely through state: each agent writes with `output_key`, the next reads with templating. No arguments are passed between agents, because there is no call — the workflow agent simply runs them in order in the same invocation." },

    { t: "out", text: `   author=writer       branch=None    'A draft about ADK.'                  final=True
   author=critic       branch=None    'Too vague; add an example.'          final=True
   author=reviser      branch=None    'A draft about ADK, with an example.' final=True
   state keys after: ['draft', 'critique', 'final']
   critic's instruction saw the draft: True` },

    { t: "p", text: "Three agents, three events, three state keys — and the confirmation that matters: the critic's assembled system instruction contained the writer's text, which is the templating of lesson 2.2 doing the hand-off. Note also that **each child reports `is_final_response()` as true**; in a pipeline the last one is the answer, which is the filtering problem lesson 1.5 warned about." },

    { t: "callout", kind: "insight", title: "Sequential removes model calls, not just uncertainty",
      body: [{ t: "p", text: "An LLM coordinator that delegates to three specialists in order costs at least three extra model calls — one per routing decision — plus the risk that it routes wrongly on a bad day. A `SequentialAgent` costs zero extra calls and cannot mis-route. Whenever the order is genuinely fixed, this is both the cheaper and the more reliable design." }] },

    { t: "h2", n: "03", text: "ParallelAgent", id: "parallel" },

    { t: "code", lang: "python", title: "Two independent lookups at once",
      code: `p1 = LlmAgent(name="weather", model=llm1, instruction="Weather.", output_key="weather")
p2 = LlmAgent(name="traffic", model=llm2, instruction="Traffic.", output_key="traffic")
gather = ParallelAgent(name="gather", sub_agents=[p1, p2])` },

    { t: "out", text: `   author=weather      branch=gather.weather   '22 C, clear'    final=True
   author=traffic      branch=gather.traffic   'Heavy on ORR'   final=True
   state after: {'weather': '22 C, clear', 'traffic': 'Heavy on ORR'}` },

    { t: "p", text: "The `branch` field is now populated: `gather.weather` and `gather.traffic`. Branches keep the children's conversations separate — each child sees the invocation's input and its own events, not its sibling's — while their **state writes land in the same shared session state**, which is how the results are collected. That asymmetry is the whole design: isolated context, shared results." },

    { t: "diagram", kind: "flow", title: "Fan out, then fan in",
      caption: "The standard shape: a ParallelAgent gathers independent facts concurrently, then a following agent in a SequentialAgent reads them all from state. Two model calls happen at once instead of one after the other, and the summariser's instruction interpolates both keys.",
      cols: 4,
      nodes: [
        { id: "in", label: "user request", tone: "accent" },
        { id: "par", label: "ParallelAgent", sub: "weather ‖ traffic", tone: "good" },
        { id: "st", label: "shared state", sub: "{weather}, {traffic}", tone: "warn" },
        { id: "sum", label: "summariser", sub: "Combine {weather} and {traffic}.", tone: "violet" }
      ],
      edges: [["in", "par"], ["par", "st", "both write"], ["st", "sum", "interpolated"]] },

    { t: "code", lang: "python", title: "The composition, and what the summariser saw",
      code: `summ = LlmAgent(name="summary", model=llm3,
                instruction="Combine {weather} and {traffic}.", output_key="brief")

fan = SequentialAgent(name="fanin", sub_agents=[
    ParallelAgent(name="gather", sub_agents=[weather_agent, traffic_agent]),
    summ,
])` },

    { t: "out", text: `   summariser saw: Combine 22 C, clear and Heavy on ORR.` },

    { t: "callout", kind: "trap", title: "An agent has exactly one parent",
      body: [{ t: "p", text: "Reusing an agent object in two different parents raises at construction: *Agent `weather` already has a parent agent, current parent: `gather`, trying to add: `gather2`*. Agents are tree nodes with a `parent_agent` back-reference, not reusable values. If two pipelines need the same behaviour, build the agent twice from a factory function — which is also what keeps their instructions and tool lists independently tunable." }] },

    { t: "h2", n: "04", text: "LoopAgent", id: "loop" },

    { t: "p", text: "A `LoopAgent` runs its children over and over. It stops for one of two reasons, and only one of them is under the agent's control." },

    { t: "code", lang: "python", title: "Terminating with exit_loop",
      code: `from google.adk.tools import exit_loop      # a built-in tool: sets actions.escalate

worker = LlmAgent(name="worker", model=llm,
                  instruction="Improve the draft until it is good enough, then call exit_loop.",
                  tools=[improve, exit_loop])

loop = LoopAgent(name="refine", sub_agents=[worker], max_iterations=5)` },

    { t: "out", text: `   events: 8 | improve() ran 2 times
   escalate flags: [True]` },

    { t: "p", text: "The model called `improve` twice, judged the result good enough and called `exit_loop`, which sets `escalate` on the event; the `LoopAgent` sees the flag and stops after two iterations rather than five. The same cap with no `exit_loop` available runs the full count:" },

    { t: "out", text: `   improve() ran 3 times with max_iterations=3` },

    { t: "diagram", kind: "cycle", title: "The loop, and its two exits",
      caption: "escalate is the agent's own judgement, max_iterations is your safety net. Ship both: a loop whose only exit is the model's opinion will occasionally not exit.",
      nodes: [
        { label: "run children", sub: "one iteration", tone: "accent" },
        { label: "child escalated?", sub: "exit_loop, or actions.escalate", tone: "good" },
        { label: "iteration cap reached?", sub: "max_iterations", tone: "warn" },
        { label: "stop", sub: "control returns to the parent", tone: "violet" }
      ] },

    { t: "dl", items: [
      ["`exit_loop`", "A built-in tool that sets `escalate` on its event. Give it to the agent that is capable of judging completion, and say in the instruction exactly when to call it."],
      ["`escalate` by hand", "A custom agent or a callback can set `actions.escalate = True` on an event — useful when a Python check, not a model, decides (a validator that passes, a threshold met)."],
      ["`max_iterations`", "The cap. Without it a loop can run until `max_llm_calls` stops the invocation, which is a far more expensive way to discover the same bug."],
      ["Loop state", "Each iteration sees the state the previous one wrote, so `{draft}` improving in place is the normal pattern. Keep an iteration counter in state if the instruction should change with the attempt number."]
    ] },

    { t: "h2", n: "05", text: "Choosing between them", id: "choosing" },

    { t: "diagram", kind: "steps", title: "Which orchestration",
      caption: "The rule is simple and often ignored: decide with code when you know the answer, and with a model only when you do not.",
      items: [
        { label: "Is the sequence of steps known before the request arrives?", desc: "yes → SequentialAgent; the model never decides the order", tone: "accent" },
        { label: "Are several steps independent of each other?", desc: "yes → ParallelAgent for the independent ones, wrapped in a Sequential for the fan-in", tone: "good" },
        { label: "Is it 'repeat until good enough'?", desc: "LoopAgent with exit_loop and a cap", tone: "warn" },
        { label: "Does the choice depend on what the user said?", desc: "this is the one case for LLM-driven transfer to sub-agents (lesson 2.5)", tone: "violet" },
        { label: "Is the control flow genuinely arbitrary?", desc: "a custom BaseAgent or the Workflow graph (lesson 2.4)", tone: "crit" }
      ] },

    { t: "exercise", kind: "practice", title: "Build a three-stage pipeline", difficulty: "core", minutes: 20,
      body: [{ t: "p", text: "Build a research pipeline: stage one gathers facts from two independent sources at the same time; stage two drafts an answer from both; stage three checks the draft against a rule and loops back to stage two if it fails, at most three times. Say which agents are in which workflow agent, which state keys carry data between them, and how the check signals a failure." }],
      requirements: [
        "A nesting of Sequential, Parallel and Loop agents",
        "The state keys named, and which agent writes each",
        "The termination condition stated explicitly"
      ],
      hint: "The loop contains the drafter and the checker; the checker calls exit_loop when the draft passes.",
      solution: { lang: "python", title: "Solution",
        code: `gather = ParallelAgent(name="gather", sub_agents=[
    LlmAgent(name="source_a", model=M, instruction="Search A.", output_key="facts_a"),
    LlmAgent(name="source_b", model=M, instruction="Search B.", output_key="facts_b"),
])

drafter = LlmAgent(name="drafter", model=M, output_key="draft",
                   instruction="Draft an answer from {facts_a} and {facts_b}. "
                               "If {critique?} is present, address it.")

checker = LlmAgent(name="checker", model=M, output_key="critique", tools=[exit_loop],
                   instruction="Check {draft} cites both sources. If it does, call exit_loop. "
                               "Otherwise say what is missing.")

refine = LoopAgent(name="refine", sub_agents=[drafter, checker], max_iterations=3)
pipeline = SequentialAgent(name="research", sub_agents=[gather, refine])`,
        notes: [{ t: "p", text: "Three details worth noting. The drafter reads {critique?} with the optional marker, because on the first iteration there is none. The checker writes its critique to state whether it passes or not, so the next iteration has something to act on. And max_iterations=3 bounds the cost even if the checker never calls exit_loop — which, on a bad day, it will not." }] } }
  ],

  takeaways: [
    "The three workflow agents orchestrate without calling a model: no cost, no mis-routing, fully testable.",
    "SequentialAgent runs children in order and they communicate through state — output_key to write, {key} templating to read.",
    "ParallelAgent gives each child its own branch (gather.weather) so their conversations stay separate, while state writes land in shared session state.",
    "The fan-out/fan-in shape is a ParallelAgent followed by a summarising agent inside a SequentialAgent.",
    "An agent object has exactly one parent; reusing one in two workflows raises at construction, so build from a factory instead.",
    "LoopAgent stops on a child's escalate — usually the exit_loop tool — or on max_iterations; ship both.",
    "Use a model to decide only what cannot be known in advance; everything else belongs in a workflow agent."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How does the second agent in a SequentialAgent receive the first agent's output?",
      options: ["As a function argument", "Through session state: the first writes with output_key, the second reads with {key} templating", "Through the event stream", "It is appended to the user's message"],
      answer: 1,
      why: "Workflow agents do not pass arguments; they run children in the same invocation against the same session. The producing agent's output_key writes its final text to state as a delta, and the consuming agent's instruction interpolates it when its request is built." },
    { stem: "What does the branch field look like on an event from a ParallelAgent's child?",
      options: ["It stays None", "The child's name only", "parent.child, for example gather.weather", "A UUID"],
      answer: 2,
      why: "Parallel children run on separate branches named parent.child, which keeps each child's conversation view isolated from its siblings. Their state writes still go to the one shared session state, which is what makes fan-in through state possible." },
    { stem: "A LoopAgent has max_iterations=5 and its worker calls exit_loop on the second iteration. How many iterations run?",
      options: ["Five", "Two", "One", "Three"],
      answer: 1,
      why: "exit_loop sets escalate on its event; the LoopAgent sees the flag and stops immediately. max_iterations is the cap, not a target. In the executed example the tool ran twice before exit_loop, and the loop ended there rather than at five." },
    { stem: "Why does reusing the same agent object inside two different parents fail?",
      options: ["Agents are not thread-safe", "An agent holds a parent_agent back-reference, so it can belong to only one tree position", "The names would collide", "It does not fail"],
      answer: 1,
      why: "Adding an agent as a sub-agent sets its parent_agent field, and a second parent raises a validation error naming both. Agents are tree nodes rather than values; when two pipelines need the same behaviour, construct two agents from a shared factory function." }
  ] },

  interview: { title: "Interview", sub: "Orchestration questions", questions: [
    { level: "Core", q: "When would you use a SequentialAgent rather than letting a coordinator delegate?",
      strong: "Whenever the order is known in advance: it removes the routing model calls and the possibility of mis-routing.",
      answer: [{ t: "p", text: "If the steps are fixed — gather, draft, check, publish — then asking a model which step comes next is paying for a decision you already know. A SequentialAgent runs them in order with no model call of its own, so the pipeline costs exactly the children's calls, cannot route to the wrong specialist, and behaves identically on every run, which also makes it testable. LLM-driven delegation earns its cost when the branch genuinely depends on the content of the request: routing a support ticket to billing or tech is a model's job, running the four steps of a refund is not." }] },
    { level: "Core", q: "How do parallel children share results without seeing each other's conversations?",
      strong: "Separate branches isolate their context; shared session state collects their output_key writes.",
      answer: [{ t: "p", text: "A ParallelAgent puts each child on its own branch — the events carry branch names like gather.weather — and a child's model request is built from its own branch's events plus the invocation input, so siblings' chatter never enters its context. State is not branched: each child's output_key write goes into the single session state for the invocation. So the pattern is fan out with isolated context, fan in through state, usually with a following agent whose instruction interpolates both keys. The one caution is that two children writing the same key race, so give each a distinct output_key." }] },
    { level: "Senior", q: "Your refine loop occasionally runs forever in production. What went wrong and how do you fix it?",
      strong: "The exit condition was left to the model's judgement with no cap or no way to signal; add max_iterations, a deterministic check, and a cost limit.",
      answer: [{ t: "p", text: "Three causes, usually together. First, no max_iterations, so the only backstop is the run-level max_llm_calls — an expensive way to find out. Second, the exit is the model's opinion of its own work, and a model asked whether its draft is good enough will sometimes always say no; the fix is a deterministic checker — a validator function or a callback that sets escalate when a measurable condition holds, such as both citations present. Third, the loop makes no progress: each iteration rewrites the same draft without seeing the previous critique, so nothing improves. I would put the critique in state and interpolate it into the next iteration's instruction, add an attempt counter so the instruction can change on the last attempt, cap iterations at three, and alert on any invocation that hits the cap, because that is a signal the exit condition is wrong rather than a normal outcome." }] }
  ] }
});
