EC.receiveLesson({
  id: "12.2",
  lede: "A supervisor is **a router with memory**: 11.2's router classifies once and branches once, while a supervisor decides who acts next on **every turn**, seeing everything that has happened so far. Which means 11.2's classification failure is now on every turn rather than once, so the chance of hitting it **compounds with the turn count** \u2014 and a supervisor naming a worker that does not exist raised with no default branch. The second failure is never saying `FINISH`, bounded only by a turn budget. And the supervisor's real value is not specialisation \u2014 a prompt does that \u2014 it is being **a place to put policy**.",
  objectives: [
    "Build a supervisor loop and count its turns",
    "Say what the workers share and why `name` matters",
    "Show the supervisor's two failure modes",
    "Explain why it needs 11.2's guards more than a router does",
    "Identify what actually makes a supervisor worth its cost"
  ],
  prerequisites: ["12.1", "11.2"],
  blocks: [
    { t: "h2", n: "01", id: "router", text: "A router with memory", sub: "Deciding on every turn" },

    {"kind": "matrix", "title": "A supervisor is a router with memory", "caption": "11.2's router classifies once and branches once; a supervisor decides **who acts next on every turn**, seeing everything so far. Which means 11.2's classification failure now compounds with the turn count rather than happening once.", "cols": ["a router (11.2)", "a supervisor"], "rows": ["how often it decides", "what it sees", "an unmapped output", "the default branch"], "cells": [[{"text": "once", "tone": "good"}, {"text": "every turn", "tone": "warn"}], [{"text": "the question", "tone": "good"}, {"text": "the whole history", "tone": "warn"}], [{"text": "one wrong answer", "tone": "warn"}, {"text": "compounds with turns", "tone": "crit"}], [{"text": "required", "tone": "good"}, {"text": "required, and more so", "tone": "crit"}]], "t": "diagram", "id": "dg-12_2-01-0"},




    { t: "code", lang: "text", title: "The loop",
      code: "supervisor -> docs\ndocs\nsupervisor -> account\naccount\nsupervisor -> FINISH\n\nsupervisor turns: 3\nfinal messages  : 3",
      caption: "A router inside a loop." },
    { t: "p", text: "11.2's router sees the request. A supervisor sees the request **and everything the workers have produced so far**, which is what lets it decide the second step based on the first step's result \u2014 and is why it costs a model call per turn (12.1)." },
    { t: "h2", n: "02", id: "shared", text: "What the workers shared", sub: "And why `name` matters" },
    { t: "code", lang: "text", title: "One message list",
      code: "docs           AIMessage('Refunds: 30 days.')\naccount        AIMessage('2 open orders.')",
      caption: "Each worker wrote into the same list, so each saw the previous one's output." },
    { t: "callout", kind: "insight", title: "The shared list is the simplest channel, and it has a cost", body: [
      { t: "p", text: "Every worker's output is in every later worker's prompt, whether or not it is relevant to them. That is context for free and tokens paid for repeatedly \u2014 12.7's trade." },
      { t: "p", text: "Which is why the `name` field matters: without it, a later worker sees a sequence of `AIMessage`s with no attribution and cannot tell which agent said what. And 12.8's blame problem is unanswerable without it." }
    ] },
    { t: "h2", n: "03", id: "failure1", text: "Failure 1: a worker that does not exist", sub: "11.2's failure, on every turn" },
    { t: "code", lang: "text", title: "A supervisor naming \u201clegal_team\u201d, with no default",
      code: "RAISED (the routing key is not in the path map)",
      caption: "With the default branch, the same output routes to `fallback`." },
    { t: "callout", kind: "warn", title: "It compounds with the turn count", body: [
      { t: "p", text: "A router classifies once per request, so the chance of an unmapped category is one draw. A supervisor classifies once per turn, so a five-turn task is five draws from the same distribution." },
      { t: "p", text: "So a supervisor needs 11.2's default branch **more** than a router does, and for the same reason: the set of strings a model can emit is not enumerable, and asking it nicely is 4.7's request rather than a guarantee." }
    ] },
    { t: "h2", n: "04", id: "failure2", text: "Failure 2: never finishing", sub: "And the turn budget" },
    { t: "code", lang: "text", title: "A supervisor that never says FINISH, with a 4-turn budget",
      code: "['sup', 'docs', 'sup', 'docs', 'sup', 'docs', 'sup', 'gave up after 4 turns']",
      caption: "The graph returned a usable answer." },
    { t: "p", text: "So a supervisor needs **all** of 11.8's guards \u2014 a turn budget, a give-up node, and a default branch \u2014 and it needs them more than a single agent does, because it has one more thing that can fail: the coordination decision itself." },
    { t: "h2", n: "05", id: "worth", text: "What makes a supervisor worth it", sub: "A place to put policy" },
    { t: "p", text: "Not specialisation \u2014 12.1 established that a prompt does that for one model call instead of two. What a supervisor adds is **a decision point between every pair of steps**, and that is where these belong:" },
    { t: "ul", items: [
      "**permission checks** \u2014 may this worker run for this user?",
      "**budget checks** \u2014 have we spent enough on this request?",
      "**approval gates** (9.8) \u2014 pause before the worker that acts",
      "**observability** \u2014 one place that knows the whole plan so far"
    ] },
    { t: "callout", kind: "mental", title: "If there is no policy, it is a model call that decides who works next", body: [
      { t: "p", text: "And a router would have decided that once, for free. So the test for a supervisor is whether there is something you want to **check or record between steps** \u2014 because that is what the extra model call per turn is buying." },
      { t: "p", text: "12.3's swarm is the comparison that makes this concrete: it removes the coordination turn entirely, and with it the place where any of those four things could live." }
    ] },
    { t: "exercise", kind: "build", title: "Build a supervisor and break it twice",
      difficulty: "core", minutes: 32,
      body: "Build a supervisor loop that routes between two workers until it decides to finish, counting its turns. Show what the workers shared and explain why the name field matters. Then make the supervisor name a worker that does not exist, with and without a default branch, and compare. Then make it never finish and bound it with a turn budget and a give-up node. Finally say what actually makes a supervisor worth its coordination cost.",
      requirements: ["Build the supervisor loop and count its turns",
        "Show the shared message list and the workers' attribution",
        "Explain the cost of the shared list and why name matters",
        "Name a non-existent worker with no default branch and report the failure",
        "Show the default branch handling the same output",
        "Explain why the failure compounds with the turn count",
        "Bound a non-finishing supervisor with a budget and a give-up node",
        "Say what makes a supervisor worth its cost"],
      hint: "Count how many times the supervisor classifies in one request. That number is how many chances it has to name something unmapped.",
      solution: { lang: "python", title: "x1202.py \u2014 a default branch and a turn budget",
        code: 'def route(state):\n    n = state["next"]\n    if n == "FINISH":\n        return END\n    if n not in WORKERS:\n        return "fallback"          # <- needed MORE than in a router\n    return n\n\n# and a turn budget, because it may never say FINISH\ndef route3(state):\n    if state["turns"] >= 4:\n        return "give_up"\n    return state["next"] if state["next"] in WORKERS else "give_up"',
        out: "==============================================================================\nPART 1 -- a supervisor is a router with memory\n==============================================================================\n  11.2's router classifies once and branches once. a supervisor\n  decides WHO ACTS NEXT on every turn, seeing everything that has\n  happened so far -- so it is a router inside a loop.\n\n    supervisor -> docs\n    docs\n    supervisor -> account\n    account\n    supervisor -> FINISH\n\n  supervisor turns: 3\n  final messages  : 3\n==============================================================================\nPART 2 -- what the workers shared\n==============================================================================\n  the workers wrote into the SAME message list, so each one saw what\n  the previous one produced:\n    -              HumanMessage('refund and account?')\n    docs           AIMessage('Refunds: 30 days.')\n    account        AIMessage('2 open orders.')\n\n  that shared list is the simplest agent-to-agent channel (12.7) and\n  it has a cost: every worker's output is in every later worker's\n  prompt, whether or not it is relevant to them.\n\n  which is why the `name` field matters. without it, a later worker\n  cannot tell which agent said what -- the history is a sequence of\n  AIMessages with no attribution.\n==============================================================================\nPART 3 -- the supervisor's own failure mode\n==============================================================================\n  it is 11.2's classification failure, now on EVERY TURN rather than\n  once -- so the chance of hitting it compounds with the turn count.\n\n  a supervisor naming a worker that does not exist, no default:\n    RAISED KeyError: 'legal_team'\n\n  with the default branch (the first graph above), the same output\n  routes to fallback instead. so a supervisor needs 11.2's default\n  branch MORE than a router does, because it classifies repeatedly.\n==============================================================================\nPART 4 -- the second failure: never finishing\n==============================================================================\n  a supervisor that never says FINISH, with a 4-turn budget:\n    ['sup', 'docs', 'sup', 'docs', 'sup', 'docs', 'sup', 'gave up after 4 turns']\n\n  so a supervisor needs ALL of 11.8's guards -- a turn budget, a\n  give-up node, and a default branch -- and it needs them more than\n  a single agent does, because it has one more thing that can fail.\n==============================================================================\nPART 5 -- what makes a supervisor worth it\n==============================================================================\n  not specialisation -- a prompt does that. what a supervisor adds\n  is a DECISION POINT between every pair of steps, which is where\n  these belong:\n\n    - permission checks: may this worker run for this user?\n    - budget checks: have we spent enough on this request?\n    - approval gates (9.8): pause before the worker that acts\n    - observability: one place that knows the whole plan so far\n\n  so the supervisor's value is being a place to put policy. if there\n  is no policy, it is a model call that only decides who works next,\n  and a router would have decided that once for free.",
        notes: [
          { t: "p", text: "**A supervisor is a router with memory** \u2014 it decides who acts next on every turn, seeing everything so far." },
          { t: "p", text: "**The workers wrote into one shared message list**, so each saw the previous one's output \u2014 context for free, and tokens paid repeatedly." },
          { t: "p", text: "**Which is why `name` matters**: without it a later worker cannot tell which agent said what, and 12.8's blame problem is unanswerable." },
          { t: "p", text: "**Naming a non-existent worker raised with no default branch**, and routed to `fallback` with one." },
          { t: "p", text: "**And the failure compounds with the turn count**: a router has one draw per request, a five-turn supervisor has five." },
          { t: "p", text: "**So it needs 11.2's default branch more than a router does.**" },
          { t: "p", text: "**A supervisor that never says FINISH needs a turn budget and a give-up node**, which returned a usable answer rather than raising." },
          { t: "p", text: "**Its value is not specialisation** \u2014 a prompt does that for one model call instead of two." },
          { t: "p", text: "**It is a decision point between every pair of steps**, which is where permission checks, budget checks, approval gates and observability belong. Without any of those, it is a model call deciding who works next." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the supervisor that invented a worker", body: [
      { t: "p", text: "A supervisor coordinates four workers. After a few weeks in production, a request fails with a routing error: the supervisor returned `escalation_team`, which does not exist. The prompt lists the four valid workers explicitly." },
      { t: "p", text: "The prompt listing them is a request, and the supervisor classifies on **every** turn \u2014 so a long conversation takes several draws from a distribution that mostly, but not always, produces one of four strings. A request that took eight turns had eight chances, and the failure rate per request is therefore higher than the per-turn rate." },
      { t: "p", text: "The fix is 11.2's: a membership check in the router with a fallback branch, and ideally a constrained output so the supervisor's worker field is a `Literal`. The additional point specific to supervisors is that the fallback should be **informative** \u2014 recording what the supervisor tried to route to, because `escalation_team` is a signal that a worker the model thinks should exist is missing, which is useful product information rather than only a bug." }
    ] }
  ],
  takeaways: [
    "**A supervisor is a router with memory** \u2014 it decides on every turn, seeing everything so far.",
    "**Which is what lets it decide step two from step one's result**, and why it costs a call per turn.",
    "**The workers share one message list**, so each sees the previous one's output.",
    "**Context for free, and tokens paid repeatedly** \u2014 12.7's trade.",
    "**`name` on each message is what makes attribution possible.**",
    "**Without it, 12.8's blame problem is unanswerable.**",
    "**Naming a non-existent worker raises with no default branch.**",
    "**And the failure compounds with the turn count** \u2014 five turns is five draws.",
    "**So a supervisor needs 11.2's default branch more than a router does.**",
    "**It also needs a turn budget and a give-up node**, for never saying `FINISH`.",
    "**Because it has one more thing that can fail: the coordination decision itself.**",
    "**Its value is not specialisation** \u2014 a prompt does that for one model call.",
    "**It is a decision point between every pair of steps.**",
    "**Where permission checks, budget checks, approval gates and observability belong.**",
    "**Without any of those, it is a model call that decides who works next** \u2014 which a router did once, free."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does a supervisor need a default routing branch more than a plain router does?",
      options: ["Supervisors use weaker models",
        "It classifies on every turn, so the chance of an unmapped worker name compounds with the turn count",
        "Its path map is built dynamically",
        "Workers can rename themselves at runtime"],
      answer: 1,
      why: "A router makes one classification per request, so there is one opportunity for the model to emit something unmapped. A supervisor makes one per turn, so an eight-turn request takes eight draws from the same distribution \u2014 and the per-request failure rate is correspondingly higher. The membership check and fallback branch are the same fix, needed more often." },
    { stem: "Why does the `name` field on worker messages matter?",
      options: ["The runtime routes on it",
        "Without it a later worker sees undifferentiated AIMessages and cannot tell which agent produced what \u2014 and blame becomes unanswerable",
        "It is required for add_messages to deduplicate",
        "It controls which worker the supervisor picks next"],
      answer: 1,
      why: "With a shared message list every worker writes AIMessages into the same history. Attribution is what lets a later worker weigh information by its source, and it is what makes 'which agent said that' answerable when the output turns out to be wrong. Nothing in the runtime adds it, so it has to be set deliberately." },
    { stem: "What actually justifies a supervisor's extra model call per turn?",
      options: ["Specialisation of the workers",
        "Being a decision point between steps, where permission checks, budget checks, approval gates and observability can live",
        "Allowing workers to run in parallel",
        "Reducing each worker's prompt size"],
      answer: 1,
      why: "Specialisation lives in prompts and costs nothing extra. Parallelism is an orchestrator's property, not a supervisor's \u2014 a supervisor is sequential by construction. What the coordination turn buys is a place to put policy: a check before each worker runs, a budget decision, a pause for approval, and one component that knows the whole plan so far. With no policy, it is a model call deciding who works next." },
    { stem: "A supervisor returns a worker name that does not exist, despite the prompt listing the valid ones. What is the deeper point?",
      options: ["The prompt should repeat the list more forcefully",
        "A prompt listing valid options is a request, not a guarantee \u2014 and the fallback should record what was attempted, since it is product information",
        "The supervisor model is too small for the task",
        "Worker names should be numeric"],
      answer: 1,
      why: "Constraining output through instructions is defeated by any model version that complies less closely, and the enumeration has to be enforced in code. Beyond that, a supervisor inventing 'escalation_team' is telling you a worker it expects to exist is missing \u2014 so recording the attempted name turns a routing bug into a signal about what the system lacks." }
  ] },
  interview: { title: "Interview practice", sub: "Supervisor", questions: [
    { level: "core", q: "What is a supervisor, and what does it cost?",
      strong: "A strong answer calls it a router with memory and prices it.",
      answer: [
        { t: "p", text: "A router with memory. A plain router classifies once and branches once; a supervisor decides who acts next on every turn, seeing the request and everything the workers have produced so far." },
        { t: "p", text: "That memory is what lets it choose the second step based on the first step's result, which a one-shot router cannot do. And it is why it costs a model call per turn \u2014 I measured a two-part task at five model calls with a supervisor against three for a single agent with both tools, because each supervisor turn does no work. It only decides." },
        { t: "p", text: "The workers share one message list, so each sees what the previous one produced. That is context for free and tokens paid repeatedly, and it makes the `name` field on each message important \u2014 without it a later worker sees undifferentiated assistant turns and cannot attribute anything." },
        { t: "p", text: "The guards it needs are 11.8's, and it needs them more than a single agent does because it has one extra thing that can fail: the coordination decision itself." }
      ] },
    { level: "advanced", q: "When is a supervisor worth its coordination cost?",
      strong: "A strong answer says it is a place for policy.",
      answer: [
        { t: "p", text: "When there is something you want to check or record between every pair of steps \u2014 because that decision point is what the extra model call per turn is actually buying." },
        { t: "p", text: "Concretely: a permission check before a worker runs, a budget check on how much this request has consumed, an approval gate before the worker that acts, and one component that knows the whole plan so far for observability. Those four have to live somewhere, and a supervisor is the natural place." },
        { t: "p", text: "What it is not buying is specialisation. A prompt is a specialist, so a router selecting one of three system prompts achieves that for one model call instead of two. If specialisation is the only justification, a router is strictly better." },
        { t: "p", text: "The comparison that makes this clearest is a swarm, where agents hand off to each other directly. That removes the coordination turn entirely \u2014 one model call per step instead of two \u2014 and with it the place where any of those four policies could live. Each agent then has to implement them, consistently, forever." },
        { t: "p", text: "So my test is: if I deleted the supervisor and let the workers hand off peer-to-peer, what would I lose? If the answer is nothing but tidiness, the supervisor is overhead." }
      ] },
    { level: "core", q: "What would you put in a supervisor's prompt?",
      strong: "A strong answer makes the decision narrow and constrained.",
      answer: [
        { t: "p", text: "As little as possible, and nothing that duplicates what a worker knows \u2014 because the supervisor's job is one decision and every extra instruction is paid on every turn." },
        { t: "p", text: "So: the list of workers with one line each about what they are for, the instruction to pick one or finish, and whatever is needed to make the finishing condition clear. Not the domain knowledge \u2014 that belongs in the workers, and putting it in both means two places to keep consistent." },
        { t: "p", text: "The finishing condition is the part worth spending words on, because never saying FINISH is one of the supervisor's two failure modes. 'Finish when the question has been answered' is weaker than 'finish when you have both the policy and the account status', and the second is checkable." },
        { t: "p", text: "I would constrain the output with a schema rather than asking for a single word, so the worker field is a Literal over the known names. The supervisor classifies on every turn, so the chance of an unmapped name compounds with the turn count \u2014 and I would keep a default branch regardless." },
        { t: "p", text: "And the worker descriptions have to be genuinely distinguishable, for the same reason tool descriptions do: the supervisor's only information is that text, so two similar descriptions produce wrong routing that looks like a reasoning failure." }
      ] }
  ] }
});
