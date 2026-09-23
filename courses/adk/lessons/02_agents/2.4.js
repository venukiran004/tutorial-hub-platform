/* ============================================================================
   LESSON 2.4 — Custom Agents and the Workflow Graph
   The custom agent and the graph were both built and run; the routing graph
   was exercised with two different inputs to show both paths firing.
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "**When the control flow is not a sequence, a fan-out or a loop, there are two ways down: write it in Python, or draw it as a graph.** Subclassing `BaseAgent` and implementing `_run_async_impl` gives you an ordinary async generator — loops, conditionals, try/except, calls to sub-agents in whatever order you like — with the framework's events as the output. ADK 2.x adds the alternative: a `Workflow` of `Node`s joined by `Edge`s, where an edge can be conditional on a route the previous node emitted. This lesson builds both, runs both, and says which one a given problem wants.",

  objectives: [
    "Subclass BaseAgent and implement _run_async_impl as an async generator of events",
    "Yield an event carrying a state delta, and delegate to a sub-agent from inside custom code",
    "Build a Workflow from Nodes and Edges and run it with a Runner",
    "Route conditionally by emitting a route from a FunctionNode",
    "Choose between a workflow agent, a custom agent and a graph"
  ],

  prerequisites: ["2.3"],

  blocks: [

    { t: "h2", n: "01", text: "A custom agent is an async generator", id: "custom" },

    { t: "p", text: "`BaseAgent` asks for one method. Everything the framework needs — events, state changes, delegation — happens through what you yield." },

    { t: "code", lang: "python", title: "Route in Python, then delegate",
      code: `from typing import AsyncGenerator
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.genai import types


class RouterAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        text_in = (ctx.user_content.parts[0].text or "") if ctx.user_content else ""
        chosen = "urgent" if "now" in text_in.lower() else "normal"

        # 1. an event of my own, carrying a state change
        yield Event(
            invocation_id=ctx.invocation_id,
            author=self.name,
            content=types.Content(role="model", parts=[types.Part(text=f"routing as {chosen}")]),
            actions=EventActions(state_delta={"priority": chosen}),
        )

        # 2. delegate to a child and forward its events
        for sub in self.sub_agents:
            if sub.name == chosen:
                async for ev in sub.run_async(ctx):
                    yield ev


router = RouterAgent(name="router", sub_agents=[urgent_agent, normal_agent])`,
      caption: "No model is called by the router itself — the decision is a Python conditional. `sub.run_async(ctx)` runs a child agent inside the same invocation and its events are forwarded unchanged, which is exactly what `SequentialAgent` does internally." },

    { t: "out", text: `   router         'routing as urgent'                final=True
   urgent         'Escalated to on-call.'            final=True
   state: {'priority': 'urgent'}` },

    { t: "dl", items: [
      ["The context", "`InvocationContext` gives you `user_content`, `session`, `invocation_id`, the services and `agent_states` — everything the framework knows about this run (lesson 5.5)."],
      ["Yielding events", "An event needs at minimum an `invocation_id` and an `author`. Content is optional: an event can exist purely to carry a state delta or an escalation."],
      ["State changes", "Put them in `EventActions(state_delta={...})`. Writing to `ctx.session.state` directly does not persist — the delta on the event is what the session service applies."],
      ["Delegation", "`await`ing another agent's `run_async(ctx)` and forwarding its events keeps everything in one invocation. Not forwarding them hides the child's work from the session, which is almost never what you want."],
      ["Termination", "Set `escalate` in `EventActions` to break out of an enclosing `LoopAgent`; set `end_invocation` on the context to stop the whole run."]
    ] },

    { t: "callout", kind: "insight", title: "Custom agents are for control flow, not for logic",
      body: [{ t: "p", text: "If the custom agent is doing work — calling an API, transforming data — that work belongs in a tool, where it is testable on its own and visible to the model. Reach for a custom agent when the *order* or *condition* of steps is the problem: a retry with a different strategy, a branch on a database value, a step skipped when state says it already ran." }] },

    { t: "h2", n: "02", text: "The Workflow graph", id: "graph" },

    { t: "p", text: "ADK 2.x ships a graph API beside the agent tree: `Workflow`, `Node`, `Edge`, plus `FunctionNode`, `JoinNode`, `START`, `RetryConfig` and a `DEFAULT_ROUTE` sentinel. The single most useful fact about it is not in the class list:" },

    { t: "code", lang: "python", title: "An agent is already a node",
      code: `from google.adk.agents import BaseAgent
from google.adk.workflow import BaseNode

print(issubclass(BaseAgent, BaseNode))      # True
print([c.__name__ for c in BaseAgent.__mro__][:4])`,
      caption: "BaseAgent subclasses BaseNode, so any agent can be dropped into a graph as a node without a wrapper. `Node` itself is abstract — subclassing it means implementing `run_node_impl` — which is why you use agents and `FunctionNode`s as the concrete nodes." },

    { t: "out", text: `True
['BaseAgent', 'BaseNode', 'BaseModel', 'ABC']` },

    { t: "code", lang: "python", title: "A routing graph, built and run",
      code: `from google.adk.workflow import Workflow, Edge, FunctionNode, START
from google.adk.agents import Context

def triage(ctx: Context, message: str = "") -> str:
    """Classify the request and emit a route."""
    text_in = (ctx.user_content.parts[0].text or "").lower() if ctx.user_content else ""
    ctx.route = "billing" if "bill" in text_in or "invoice" in text_in else "tech"
    ctx.state["category"] = ctx.route
    return f"routed to {ctx.route}"

router  = FunctionNode(func=triage, name="triage")
billing = LlmAgent(name="billing", model=M, instruction="Handle billing.", output_key="answer")
tech    = LlmAgent(name="tech",    model=M, instruction="Handle tech.",    output_key="answer")

wf = Workflow(name="support", edges=[
    Edge(from_node=START,  to_node=router),
    Edge(from_node=router, to_node=billing, route="billing"),   # conditional edges
    Edge(from_node=router, to_node=tech,    route="tech"),
])

runner = InMemoryRunner(node=wf, app_name="wfapp")      # note: node=, not agent=`,
      caption: "`ctx.route` is how a node tells the orchestrator which edge to follow; the edges declare which route value they accept. A node with conditional edges and no matching route simply ends its branch — with a warning in the log, which is a useful signal that a route value was misspelled." },

    { t: "out", text: `  question: 'my bill is wrong'
    support    ''                       route=None
    support    ''                       route=billing
    billing    'Invoice explained.'     route=None

  question: 'the router is dead'
    support    ''                       route=None
    support    ''                       route=tech
    tech       'Router restarted.'      route=None` },

    { t: "p", text: "The same graph, two inputs, two paths — and the routing decision was a Python `if`, not a model call. That is the graph's advantage over LLM delegation for this kind of branch: it is free, deterministic and unit-testable." },

    { t: "diagram", kind: "flow", title: "The graph that just ran",
      caption: "START seeds the graph; the FunctionNode emits a route; the matching edge fires and its node runs. Edges without a route are unconditional, and DEFAULT_ROUTE marks the fallback edge when no specific route matches.",
      cols: 3,
      nodes: [
        { id: "s", label: "START", sub: "the entry sentinel", tone: "accent" },
        { id: "t", label: "triage", sub: "FunctionNode · sets ctx.route", tone: "good" },
        { id: "b", label: "billing", sub: "route == 'billing'", tone: "warn" },
        { id: "x", label: "tech", sub: "route == 'tech'", tone: "warn" }
      ],
      edges: [["s", "t"], ["t", "b", "billing"], ["t", "x", "tech"]] },

    { t: "table", head: ["Piece", "What it is"],
      rows: [
        ["`Workflow`", "A node that *is* the graph: holds `edges`, `max_concurrency`, and the compiled `graph`. Nest one inside another for sub-graphs."],
        ["`Node`", "The abstract base — subclass and implement `run_node_impl`. Carries `retry_config`, `timeout`, `input_schema`, `output_schema`, `parallel_worker`."],
        ["`FunctionNode`", "Wraps a plain function as a node; the function may take a `Context` and set `ctx.route`."],
        ["`JoinNode`", "Waits for several incoming branches before continuing — the fan-in point of a parallel section."],
        ["`Edge`", "`from_node`, `to_node` and an optional `route`. No route means unconditional."],
        ["`START`", "The sentinel node every graph is entered from."],
        ["`DEFAULT_ROUTE`", "`__DEFAULT__` — the edge taken when a route was emitted but matched nothing else."],
        ["`RetryConfig`, `NodeTimeoutError`", "Per-node retry and timeout behaviour (lesson 10.3)."]
      ] },

    { t: "callout", kind: "note", title: "New, and moving",
      body: [{ t: "p", text: "The graph API arrived with ADK 2.x and is less settled than the agent tree — the field names and the routing mechanics in this lesson are from 2.9.2 and were verified by running them, but treat them as more likely to shift than `SequentialAgent`. For most systems the agent tree plus the three workflow agents is still the path of least surprise; reach for the graph when the shape genuinely is a graph." }] },

    { t: "h2", n: "03", text: "Three ways to express control flow", id: "choosing" },

    { t: "diagram", kind: "matrix", title: "Which mechanism for which property",
      caption: "Read down the column you care about. Most systems use workflow agents for the spine, LLM transfer for the one genuinely content-dependent branch, and a custom agent or graph for the awkward part that remains.",
      rows: ["Workflow agents", "Custom BaseAgent", "Workflow graph", "LLM transfer"],
      cols: ["deterministic", "arbitrary branching", "model calls", "testability"],
      cells: [
        [{ text: "yes", tone: "good" }, { text: "sequence, fan-out, loop only", tone: "warn" }, { text: "none of its own", tone: "good" }, { text: "easy", tone: "good" }],
        [{ text: "yes", tone: "good" }, { text: "anything Python can express", tone: "good" }, { text: "none of its own", tone: "good" }, { text: "easy — it is a function", tone: "good" }],
        [{ text: "yes", tone: "good" }, { text: "conditional edges, joins, sub-graphs", tone: "good" }, { text: "none of its own", tone: "good" }, { text: "easy", tone: "good" }],
        [{ text: "no", tone: "crit" }, { text: "whatever the model decides", tone: "warn" }, { text: "one per decision", tone: "crit" }, { text: "needs an evalset", tone: "warn" }]
      ] },

    { t: "exercise", kind: "practice", title: "Replace a coordinator with code", difficulty: "advanced", minutes: 20,
      body: [{ t: "p", text: "You have an LLM coordinator with three sub-agents that routes on a field already present in session state — `state['plan_tier']` is 'free', 'pro' or 'enterprise'. Replace it with something that makes no model call, two ways: once as a custom BaseAgent, once as a Workflow graph with conditional edges. Then say what you lost." }],
      requirements: ["Both implementations", "The routing decision as a Python expression in each", "One paragraph on what LLM routing was providing that code is not"],
      hint: "The custom agent reads ctx.session.state; the FunctionNode sets ctx.route from the same value.",
      solution: { lang: "python", title: "Solution",
        code: `# (1) custom agent
class TierRouter(BaseAgent):
    async def _run_async_impl(self, ctx):
        tier = ctx.session.state.get("plan_tier", "free")
        target = {"free": "basic", "pro": "standard", "enterprise": "priority"}[tier]
        for sub in self.sub_agents:
            if sub.name == target:
                async for ev in sub.run_async(ctx):
                    yield ev

# (2) graph
def pick(ctx) -> str:
    """Route on the plan tier already in state."""
    ctx.route = {"free": "basic", "pro": "standard", "enterprise": "priority"}[
        ctx.state.get("plan_tier", "free")]
    return ctx.route

wf = Workflow(name="support", edges=[
    Edge(from_node=START, to_node=FunctionNode(func=pick, name="pick")),
    Edge(from_node=pick_node, to_node=basic,    route="basic"),
    Edge(from_node=pick_node, to_node=standard, route="standard"),
    Edge(from_node=pick_node, to_node=priority, route="priority"),
])`,
        notes: [{ t: "p", text: "What you lost: nothing, for this branch. The tier is a known value and a dict lookup is strictly better than a model call — cheaper, faster, and it cannot route an enterprise customer to the basic agent on an unlucky sample. LLM routing earns its cost only when the branch depends on something no field captures, such as what the user is actually asking for in free text. The common mistake is using a coordinator agent for both kinds of branch because it is one mechanism." }] } }
  ],

  takeaways: [
    "A custom agent subclasses BaseAgent and implements _run_async_impl as an async generator of events; the control flow is ordinary Python.",
    "Yield events with EventActions(state_delta=…) to change state; writing ctx.session.state directly does not persist.",
    "Delegate by awaiting a child's run_async(ctx) and forwarding its events, which keeps the work in one invocation and one transcript.",
    "BaseAgent subclasses BaseNode, so any agent is usable as a node in a Workflow graph without a wrapper.",
    "A graph is Workflow(edges=[Edge(from_node=…, to_node=…, route=…)]) entered from START, with FunctionNode setting ctx.route to select a conditional edge.",
    "The graph API is new in 2.x and less settled than the agent tree; the tree plus workflow agents remains the safer default.",
    "Use code for branches decided by data and a model only for branches decided by meaning."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In a custom BaseAgent, how do you change session state?",
      options: ["Assign to ctx.session.state", "Yield an Event whose actions carry a state_delta", "Call session_service.update()", "Return a dict from _run_async_impl"],
      answer: 1,
      why: "State changes reach the session only as deltas on events. Assigning to ctx.session.state mutates an in-memory copy that the session service never records, so the change is lost on the next fetch — one of the more confusing bugs in custom agents." },
    { stem: "Why can an LlmAgent be used directly as a node in a Workflow graph?",
      options: ["A wrapper converts it automatically", "BaseAgent is a subclass of BaseNode, so every agent already is a node", "Only LlmAgent can be a node", "It cannot — Node(agent=…) is required"],
      answer: 1,
      why: "BaseAgent's MRO is BaseAgent → BaseNode → BaseModel → ABC, so agents satisfy the node interface. Node itself is abstract and raises NotImplementedError from run_node_impl, which is why you build graphs from agents and FunctionNodes rather than from bare Nodes." },
    { stem: "How does a node tell the graph which conditional edge to follow?",
      options: ["By returning the edge name", "By setting ctx.route, which is matched against each edge's route value", "By raising an exception", "The graph decides by itself"],
      answer: 1,
      why: "The node sets ctx.route — a string, int, bool or list — and the orchestrator follows the edges whose route matches. An edge with no route is unconditional; DEFAULT_ROUTE is the fallback. A route that matches nothing ends the branch with a warning, which is how a misspelled route value shows up." },
    { stem: "Your coordinator routes on state['plan_tier'], a value already known before the request. What should it be?",
      options: ["An LlmAgent with sub-agents", "A custom agent or a graph edge — the decision is a dict lookup, not a judgement", "A LoopAgent", "A ParallelAgent"],
      answer: 1,
      why: "A model call to choose between three known values costs money and latency and can occasionally pick wrongly. Code routing on a field in state is free, instant and deterministic. LLM routing is for branches that depend on meaning — what the user is asking — not on data you already hold." }
  ] },

  interview: { title: "Interview", sub: "Control-flow questions", questions: [
    { level: "Core", q: "When do you write a custom agent instead of composing workflow agents?",
      strong: "When the control flow is not a sequence, a fan-out or a loop — a conditional branch, a retry with a different strategy, a step skipped on a state value.",
      answer: [{ t: "p", text: "The three workflow agents cover in-order, concurrent and repeat-until. Anything else — branch on a database value, try one approach and fall back to another, skip a stage when a cached result exists, interleave two children based on their outputs — is easier to express as Python than to bend into those three. A custom agent subclasses BaseAgent, implements _run_async_impl as an async generator, yields its own events for anything it wants recorded, and delegates by forwarding a child's events. What should not go in there is work: API calls and data transformation belong in tools where they are independently testable and visible to the model." }] },
    { level: "Senior", q: "ADK 2.x has both an agent tree and a workflow graph. How do you decide?",
      strong: "Tree plus workflow agents by default; the graph when the shape is genuinely a graph — joins, conditional edges, per-node retries — and you accept a newer API.",
      answer: [{ t: "p", text: "The agent tree with Sequential, Parallel and Loop is the settled path and covers most systems, especially conversational ones where an agent hands off to a specialist and the user keeps talking to that specialist. The graph is the better fit when the process has real graph structure: several branches that rejoin at a JoinNode, edges conditional on a computed route, nodes with their own retry and timeout policies, sub-graphs nested inside nodes. It also expresses long-running business processes more naturally, which is where LangGraph's users live. The practical caveat is maturity: the graph API arrived with 2.x, and its field names and routing mechanics are more likely to change than SequentialAgent's. For something that must be stable for a year, I would use the tree and keep any awkward branch in a custom agent; for a process that is genuinely a state machine, the graph earns the risk." }] },
    { level: "Senior", q: "What is the cost of making a model decide something your code already knows?",
      strong: "A round trip of latency, the tokens of the whole prompt, and a non-zero error rate on a decision that had a correct answer.",
      answer: [{ t: "p", text: "Every routing decision by a model is one full request: the conversation so far, the instruction, and every tool and sub-agent declaration, for an answer that is one word. That is most of a second of latency and a non-trivial token bill, repeated on every turn. Worse, it has an error rate — a coordinator choosing between three specialists will occasionally choose wrong, and the failure is silent because the wrong specialist answers confidently. When the branch is determined by data you already hold — a plan tier, a feature flag, whether a field is null — code is strictly better on all three axes. The judgement a model is uniquely good at is classifying free text, and that is what a routing agent should be reserved for." }] }
  ] }
});
