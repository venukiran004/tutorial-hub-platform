/* ============================================================================
   LESSON 2.1 — LlmAgent: The Configuration Surface
   Field list introspected from google-adk 2.9.2; every behaviour shown was
   executed against a scripted model.
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "**An `LlmAgent` is a configuration object with thirty-three fields, and about ten of them decide almost everything an agent does.** The model it calls, the instruction it is given, the tools it may use, the sub-agents it may hand off to, the key it writes its answer into, whether it sees the conversation at all, and the eight callbacks that let you intervene. This lesson goes through the surface field by field, runs the ones whose behaviour is easy to get wrong — `output_key`, instruction templating, `include_contents`, `output_schema` — and ends with the fields you will rarely touch and why they exist.",

  objectives: [
    "Name the required and the most-used fields of LlmAgent and say what each changes at run time",
    "Use output_key to write an agent's answer into session state, and read the delta that carries it",
    "Explain what include_contents='none' does and when a stateless agent is the right shape",
    "Describe what description is for and why it is not documentation",
    "Know which fields exist for advanced use — planner, code_executor, schemas, transfer flags — and when to reach for them"
  ],

  prerequisites: ["1.4", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "The fields that matter", id: "fields" },

    { t: "code", lang: "python", title: "An agent with everything you usually need",
      code: `from google.adk.agents import LlmAgent

agent = LlmAgent(
    name="support_agent",                 # required, unique among its siblings
    model="gemini-2.5-flash",             # a model id, or a BaseLlm instance
    description="Answers billing and account questions.",   # read by OTHER agents
    instruction="You are a support agent. Use the tools to look things up.",
    tools=[lookup_invoice, open_ticket],  # functions, BaseTool objects or toolsets
    output_key="last_answer",             # write the final text into state
)`,
      caption: "`Agent` is an alias of `LlmAgent`, so both names appear in the wild. Only `name` is truly required — an agent with no model inherits its parent's (lesson 2.5)." },

    { t: "table", head: ["Field", "Type", "What it does"],
      rows: [
        ["`name`", "str", "Identifies the agent to the framework and to other agents. Must be unique among siblings; it is what `transfer_to_agent` names."],
        ["`model`", "str or `BaseLlm`", "The model id, or an instance for LiteLLM, Claude, a fallback wrapper or a fake. Omitted means 'inherit from the parent agent'."],
        ["`description`", "str", "**Read by other agents, not by you.** A coordinator's model uses its sub-agents' descriptions to decide where to route. Empty description, no routing (lesson 2.5)."],
        ["`instruction`", "str or callable", "The system instruction. Supports `{state_key}` templating and can be a function of context (lesson 2.2)."],
        ["`tools`", "list", "Plain functions, `BaseTool` instances, or `BaseToolset` objects that expand to several tools (module 4)."],
        ["`sub_agents`", "list[BaseAgent]", "Children this agent may transfer the conversation to. Sets up the tree, and each child gets `parent_agent` set."],
        ["`output_key`", "str", "Write this agent's final text into `state[output_key]` when it finishes."],
        ["`include_contents`", "'default' or 'none'", "Whether the conversation history is sent to the model at all."],
        ["`input_schema` / `output_schema`", "Pydantic model", "Structure in, structure out (lesson 6.4)."],
        ["`generate_content_config`", "`types.GenerateContentConfig`", "Temperature, token limits, safety settings, thinking config (lesson 3.1)."],
        ["`disallow_transfer_to_parent` / `_to_peers`", "bool", "Close off routes in the agent tree (lesson 2.5)."],
        ["`planner`", "`BasePlanner`", "Make the model plan before acting: `BuiltInPlanner` for native thinking, `PlanReActPlanner` for an explicit plan-act loop."],
        ["`code_executor`", "`BaseCodeExecutor`", "Let the model run code it writes (lesson 4.4)."],
        ["`before_*` / `after_*` callbacks", "callable", "Six hooks plus two error hooks (lesson 6.1)."]
      ] },

    { t: "callout", kind: "trap", title: "`description` is not a docstring",
      body: [{ t: "p", text: "It is the only thing another agent's model knows about this one. `description=\"Handles billing\"` routes correctly; an empty description means the coordinator has nothing to choose on, and routing failures in multi-agent systems trace back to this field more often than to the instruction." }] },

    { t: "h2", n: "02", text: "output_key: an agent's answer as state", id: "outputkey" },

    { t: "p", text: "`output_key` is how agents pass work to each other. When the agent produces its final text, ADK writes it into session state under that key — as a delta on the final event, like any other state change." },

    { t: "code", lang: "python", title: "Run it and look at the delta",
      code: `a = LlmAgent(name="lister", model=llm, instruction="List cities.", output_key="cities")
evs, session = await run(a, "which cities?")
print("state after run:", dict(session.state))
print("delta was on the final event:", dict(evs[-1].actions.state_delta))` },

    { t: "out", text: `state after run: {'cities': 'Bengaluru, Pune and Hyderabad.'}
delta was on the final event: {'cities': 'Bengaluru, Pune and Hyderabad.'}` },

    { t: "p", text: "Combine that with instruction templating and you have the whole mechanism by which a sequential pipeline passes data: one agent writes `{draft}`, the next agent's instruction reads it (lesson 2.3). With an `output_schema` the parsed object is written instead of the raw text, so state holds a dict rather than a string (lesson 6.4)." },

    { t: "h2", n: "03", text: "include_contents: an agent that does not remember", id: "contents" },

    { t: "p", text: "By default an agent sees the conversation: every previous turn is rebuilt into the model request. `include_contents='none'` sends only the current input. The difference, measured across two turns of the same session:" },

    { t: "out", text: `include_contents='none'
  contents on call 1: 1 | on call 2: 1
(with the default 'default' this would be 1 then 3)` },

    { t: "diagram", kind: "compare", title: "When to make an agent stateless",
      caption: "A stateless agent is cheaper, more predictable and easier to evaluate — and useless for anything conversational. The common mistake is leaving it on 'default' for a classifier that then drifts as the conversation grows.",
      columns: [
        { title: "include_contents='default'", tone: "accent", items: ["the whole conversation", "needed for follow-ups and pronouns", "cost grows with the turn count", "the right choice for a user-facing agent"] },
        { title: "include_contents='none'", tone: "good", items: ["only this invocation's input", "classifiers, extractors, validators", "constant cost per call", "deterministic and easy to evaluate"] }
      ] },

    { t: "h2", n: "04", text: "Schemas, and what they cost", id: "schemas" },

    { t: "p", text: "`output_schema` takes a Pydantic model and makes the model's reply conform to it. In **ADK 2.x this composes with tools** — the framework's own docstring is explicit that it \"works by exposing tools during the thought loop and enforcing structure only on the final output\". That is a change from 1.x, where setting `output_schema` disabled tools and transfer, and it is worth checking your version before repeating the old advice." },

    { t: "code", lang: "python", title: "A structured answer, parsed into state",
      code: `from pydantic import BaseModel

class Summary(BaseModel):
    topic: str
    bullets: list[str]

agent = LlmAgent(name="summariser", model=llm, instruction="Reply as JSON.",
                 output_schema=Summary, output_key="summary")
_, session = await run(agent, "summarise")
print(dict(session.state))` },

    { t: "out", text: `{'summary': {'topic': 'cities', 'bullets': ['a', 'b']}}` },

    { t: "p", text: "Note what landed in state: a **dict**, not the `Summary` instance and not the raw JSON string. Validation happened — a reply that did not match would have raised — but what downstream agents read through `{summary}` is plain data. Lesson 6.4 covers the trade-offs, including `input_schema` for an agent used as a tool." },

    { t: "h2", n: "05", text: "The advanced third", id: "advanced" },

    { t: "dl", items: [
      ["`planner`", "`BuiltInPlanner` passes a thinking config to a model that supports native reasoning; `PlanReActPlanner` prompts an explicit plan-then-act loop for models that do not. Use it when the failure mode is *the agent acts before it thinks*, not when it simply picks the wrong tool."],
      ["`code_executor`", "Attaches an executor — built-in, container, Vertex AI or an unsafe local one — so the model can run code it writes. Powerful and dangerous in equal measure (lesson 4.4)."],
      ["`global_instruction`", "An instruction that applies to this agent and everything below it in the tree. Put company-wide policy here, once, rather than in every agent (lesson 2.2)."],
      ["`static_instruction`", "Content placed ahead of the dynamic instruction and never re-rendered — the part of the prompt that is worth caching (lesson 5.6)."],
      ["`generate_content_config`", "The model's own knobs: temperature, `max_output_tokens`, `safety_settings`, `thinking_config`, `response_modalities` (lesson 3.1)."],
      ["`mode`", "`'chat'`, `'task'` or `'single_turn'` — how the agent treats an invocation. Most agents are chat; a task agent is for one unit of work with a defined finish."],
      ["`state_schema`", "Declares the shape of the state this agent expects, so a mistyped key fails loudly instead of silently reading nothing."],
      ["`retry_config` and `timeout`", "Per-agent limits, mirrored on workflow nodes (lesson 10.3)."]
    ] },

    { t: "diagram", kind: "layers", title: "Which field answers which question",
      caption: "When you are unsure where a behaviour belongs, ask which of these five questions it answers. Most configuration mistakes are a setting placed one layer too high or too low.",
      items: [
        { label: "Who is this agent? name · description", sub: "identity, and how other agents find it", tone: "accent" },
        { label: "What does it think with? model · generate_content_config · planner", sub: "the model call", tone: "good" },
        { label: "What is it told? instruction · global_instruction · static_instruction", sub: "the prompt", tone: "warn" },
        { label: "What can it do? tools · code_executor · sub_agents · transfer flags", sub: "the action space", tone: "violet" },
        { label: "What does it produce and see? output_key · output_schema · include_contents", sub: "the data contract", tone: "crit" }
      ] },

    { t: "exercise", kind: "practice", title: "Three agents, three shapes", difficulty: "core", minutes: 18,
      body: [{ t: "p", text: "Configure three agents without running them, and justify every field: (a) a classifier that reads one message and returns one of five labels, called thousands of times a day; (b) a customer-facing support agent with two tools that can hand off to a billing specialist; (c) a summariser that runs at the end of a pipeline and whose output another agent will read. State which of `include_contents`, `output_key`, `output_schema`, `description` and `tools` each one needs, and which it must not have." }],
      requirements: ["Three LlmAgent constructions", "One line of justification per non-obvious field", "Say explicitly which fields you left off and why"],
      hint: "The classifier should not see the conversation; the summariser's answer has to be readable by name.",
      solution: { lang: "python", title: "Solution",
        code: `# (a) classifier: stateless, structured, no tools, cheap
classifier = LlmAgent(
    name="classifier", model="gemini-2.5-flash-lite",
    instruction="Classify the message as one of: billing, tech, sales, spam, other.",
    include_contents="none",            # one message in, one label out — history would only add cost and drift
    output_schema=Label,                # validated, not free text
    output_key="label",
)                                       # no tools, no sub_agents, no description needed: nobody routes to it

# (b) support agent: conversational, tools, routes to a specialist
support = LlmAgent(
    name="support", model="gemini-2.5-flash",
    description="Front-line support for account and connectivity questions.",   # the coordinator reads this
    instruction="Help the user. Use the tools before answering. Transfer billing questions to the billing agent.",
    tools=[lookup_account, open_ticket],
    sub_agents=[billing_agent],
)                                       # include_contents stays 'default': follow-ups need the history

# (c) summariser: reads state, writes state, no conversation
summariser = LlmAgent(
    name="summariser", model="gemini-2.5-flash",
    instruction="Summarise {draft} in three bullets.",
    include_contents="none",            # its input is state, not the chat
    output_key="summary",               # the next agent reads {summary}
)`,
        notes: [{ t: "p", text: "The pattern to notice: agents that talk to a user need history and a description; agents that are steps in a pipeline need neither, and are better off stateless with their input and output named explicitly in state. Mixing the two shapes — a pipeline step that also sees the whole conversation — is where unpredictable behaviour comes from." }] } }
  ],

  takeaways: [
    "LlmAgent has thirty-three fields on 2.9.2; name, model, description, instruction, tools, sub_agents and output_key carry most of the behaviour.",
    "description is read by other agents' models to decide routing — an empty one breaks delegation.",
    "output_key writes the agent's final text into session state as a delta on the final event, which is how pipeline steps pass work.",
    "include_contents='none' sends only the current input: right for classifiers and pipeline steps, wrong for anything conversational.",
    "In ADK 2.x output_schema composes with tools — the model may call tools during the loop and only the final answer is validated; the parsed result lands in state as a dict.",
    "Advanced fields — planner, code_executor, global_instruction, static_instruction, state_schema, retry_config — exist for specific failures, not as defaults.",
    "Group the fields by the question they answer: who is this agent, what does it think with, what is it told, what can it do, what does it produce."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is an agent's `description` field used for?",
      options: ["Documentation for developers", "It is shown to the end user", "Other agents' models read it to decide whether to route work to this agent", "It is the system instruction"],
      answer: 2,
      why: "When an agent has sub-agents, their descriptions are put in front of its model so it can choose a transfer target. An agent with an empty description is effectively invisible to routing, which is one of the commonest causes of a coordinator that never delegates." },
    { stem: "An agent has `output_key='draft'`. Where does its answer end up, and how?",
      options: ["Returned by run_async", "In session state under 'draft', carried as a state_delta on the agent's final event", "Written to an artifact", "Sent to the parent agent as a message"],
      answer: 1,
      why: "ADK writes the final text into state[output_key] and attaches it to the final event as a delta, exactly like a tool's state write. That is what lets the next agent in a pipeline read it through instruction templating, and what makes the change part of the replayable record." },
    { stem: "Which agent should have `include_contents='none'`?",
      options: ["A customer-facing chat agent", "A classifier that maps one message to one label", "A coordinator that routes between specialists", "Any agent with tools"],
      answer: 1,
      why: "A classifier's answer should depend only on the message in front of it; sending the whole conversation adds cost and lets earlier turns drift the classification. Conversational and routing agents need the history to resolve follow-ups and references." },
    { stem: "In ADK 2.x, what happens if you set both `output_schema` and `tools` on an agent?",
      options: ["A validation error at construction", "Tools are silently ignored", "It works: tools are available during the loop and only the final output is validated against the schema", "The schema is ignored"],
      answer: 2,
      why: "The field's own documentation states that ADK supports using output_schema and tools together, exposing tools during the thought loop and enforcing structure only on the final output. This is a change from 1.x, where output_schema disabled tools and transfer — which is why old tutorials still warn against it." }
  ] },

  interview: { title: "Interview", sub: "Configuration questions", questions: [
    { level: "Core", q: "What does the instruction do that the description does not, and vice versa?",
      strong: "The instruction tells this agent's model how to behave; the description tells other agents what this one is for.",
      answer: [{ t: "p", text: "The instruction becomes the system instruction of this agent's own model call — it is how the agent behaves, what tone it takes, which tools it should prefer, what it must never do. The description never reaches this agent's model at all; it is placed in front of a *parent* agent's model as part of the list of available sub-agents, so the parent can pick one. That asymmetry has a practical consequence: an agent that works perfectly when invoked directly but is never routed to in a multi-agent system almost always has a good instruction and a missing or vague description." }] },
    { level: "Core", q: "How do two agents in a pipeline pass data?",
      strong: "Through session state: the first writes with output_key, the second reads with instruction templating.",
      answer: [{ t: "p", text: "The producing agent sets output_key, so its final text lands in session state under that name as a delta on its final event. The consuming agent's instruction references it with braces — 'Critique this draft: {draft}' — and ADK interpolates the value from state when it builds the request. With an output_schema the value in state is the parsed dict rather than a string, so a downstream tool can read fields from it. Nothing is passed as function arguments between agents; state is the channel, which is also what makes a partially completed pipeline resumable." }] },
    { level: "Senior", q: "An agent in production is slow and occasionally answers a question the user did not ask. Which fields do you look at first?",
      strong: "include_contents and the tool list for cost, the instruction and description for the wrong-question behaviour, then temperature and the planner.",
      answer: [{ t: "p", text: "Slowness with a growing conversation usually means include_contents='default' on an agent that does not need history — a classifier or an extractor re-reading fifty turns — or a tool list large enough that every request carries a heavy declaration payload; splitting the toolbox across agents fixes the second. Answering an unasked question is usually one of three things: the instruction is written as a description of a capability rather than as a rule, so the model volunteers; state templating has injected stale values from a previous turn into the prompt; or, in a multi-agent setup, a transfer went to an agent whose description over-claims. I would read the actual assembled system instruction from a recorded LlmRequest before changing anything, because it contains ADK's own framing as well as mine, and the surprise is often there." }] }
  ] }
});
