/* ============================================================================
   LESSON 2.2 — Instructions and Prompting
   Every system instruction shown was captured from the LlmRequest the
   framework built, by recording it inside a scripted model.
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**The instruction you write is not the instruction the model receives.** ADK assembles a system instruction from up to four sources — the global instruction inherited from the agent tree, your instruction with state interpolated into it, its own framing about the agent's identity, and the transfer guidance it adds when the agent has sub-agents. This lesson prints what actually arrives at the model in each case, covers the three instruction fields and when each is right, shows state templating including the optional-key syntax, builds a dynamic instruction from a function, and then treats the prompt surface you do not think of as a prompt: tool names, parameter names and docstrings.",

  objectives: [
    "Distinguish instruction, global_instruction and static_instruction, and place a rule in the right one",
    "Use {state_key} templating, including the optional {key?} form, and know what happens to a missing key",
    "Write a dynamic instruction as a function of ReadonlyContext",
    "Read the complete system instruction ADK assembles, including its own additions",
    "Treat tool names, parameter names and docstrings as prompt surface"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "What the model actually receives", id: "assembled" },

    { t: "code", lang: "python", title: "Capture the assembled instruction",
      code: `# a recording model keeps every LlmRequest ADK builds
agent = LlmAgent(name="greeter", model=recording_llm,
                 instruction="Greet {user_name} who speaks {user:lang}. Their tier is {tier?}.")
await run(agent, "hi", state={"user_name": "Asha", "user:lang": "Kannada"})
print(recording_llm.seen[0].config.system_instruction)` },

    { t: "out", text: `Greet Asha who speaks Kannada. Their tier is .

You are an agent. Your internal name is "greeter".` },

    { t: "p", text: "Two things happened that you did not write. `{user_name}` and `{user:lang}` were replaced from session state — including the `user:`-scoped key, with the prefix in the placeholder. `{tier?}` was **not** in state, and the optional marker made it render as nothing instead of raising. And ADK appended its own sentence identifying the agent, which is how the model knows what it is when several agents share a conversation." },

    { t: "diagram", kind: "layers", title: "The four sources of one system instruction",
      caption: "Read top to bottom: this is the order they appear in the request. Anything you put in the wrong layer either applies too widely or is re-sent on every call when it did not need to be.",
      items: [
        { label: "global_instruction", sub: "from the root of the agent tree — policy for everything below it", tone: "violet" },
        { label: "instruction", sub: "this agent's own, with {state} interpolated", tone: "accent" },
        { label: "ADK's framing", sub: "'You are an agent. Your internal name is …'", tone: "good" },
        { label: "transfer guidance + sub-agent descriptions", sub: "added automatically when the agent has sub_agents", tone: "warn" }
      ] },

    { t: "h2", n: "02", text: "Three instruction fields", id: "three" },

    { t: "table", head: ["Field", "Scope", "Re-rendered per call?", "Use for"],
      rows: [
        ["`instruction`", "This agent", "Yes — state is interpolated fresh", "What this agent does, its rules, its tools"],
        ["`global_instruction`", "This agent **and every descendant**", "Yes", "Policy that must hold everywhere: tone, refusals, compliance"],
        ["`static_instruction`", "This agent", "**No** — fixed content, placed first", "Large fixed context worth caching: a style guide, a schema, examples"]
      ] },

    { t: "code", lang: "python", title: "global_instruction reaches the whole tree",
      code: `child = LlmAgent(name="child", model=llm, instruction="Child instruction.")
root = LlmAgent(name="root", model=llm, instruction="Root instruction.",
                global_instruction="Company policy: never quote prices.",
                sub_agents=[child])` },

    { t: "out", text: `Company policy: never quote prices.  Root instruction.  You are an agent. Your internal
name is "root".   You have a list of other agents to transfer to:   Agen…` },

    { t: "p", text: "The global instruction comes first, and the same text will be prepended when `child` runs. That is the point: a refusal rule or a compliance line written once at the root cannot be forgotten in a specialist three levels down. Note also the transfer guidance appended at the end — ADK adds it because this agent has a sub-agent, and it carries the sub-agents' `description` fields (lesson 2.5)." },

    { t: "callout", kind: "insight", title: "static_instruction is the cacheable half",
      body: "Anything in `instruction` is re-rendered on every call because state may have changed, so it cannot be cached by the model provider. `static_instruction` is fixed content placed ahead of it, which is exactly what context caching needs (lesson 5.6). If you have two thousand tokens of style guide or schema, moving it from `instruction` to `static_instruction` changes nothing about behaviour and a great deal about cost." },

    { t: "h2", n: "03", text: "State templating", id: "templating" },

    { t: "diagram", kind: "trace", title: "How a placeholder is resolved",
      caption: "Interpolation happens when the request is built, from the session state at that moment — so an instruction reads whatever the previous agent or tool most recently wrote.",
      vars: ["state", "instruction text"],
      steps: [
        { code: "instruction = 'Greet {user_name}.'", state: ["{}", "Greet {user_name}."], note: "as written" },
        { code: "tool writes state['user_name'] = 'Asha'", state: ["{'user_name': 'Asha'}", "Greet {user_name}."], changed: [0], tone: "accent" },
        { code: "next model call: ADK builds the request", state: ["{'user_name': 'Asha'}", "Greet Asha."], changed: [1], tone: "good" },
        { code: "{missing} with no such key", state: ["{'user_name': 'Asha'}", "raises — use {missing?}", ], changed: [1], tone: "crit" }
      ] },

    { t: "dl", items: [
      ["`{key}`", "Required. Interpolated from session state; a missing key is an error rather than silence, which is the behaviour you want for a value the agent depends on."],
      ["`{key?}`", "Optional. Renders as empty when absent — verified above with `{tier?}` becoming nothing at all."],
      ["`{user:lang}`, `{app:region}`", "Scoped keys work in placeholders with their prefix (lesson 5.2)."],
      ["Whole objects", "A key holding a dict — from an `output_schema` agent, say — interpolates as its string form. For anything structured, prefer naming the fields you need in the instruction, or read it in a tool instead."]
    ] },

    { t: "h2", n: "04", text: "Instructions that are functions", id: "dynamic" },

    { t: "p", text: "`instruction` also accepts a callable taking a `ReadonlyContext`. Use it when the instruction depends on something templating cannot express — a lookup, a time of day, a computed list of permitted actions." },

    { t: "code", lang: "python", title: "A dynamic instruction provider",
      code: `from google.adk.agents.readonly_context import ReadonlyContext

def instruction_for(ctx: ReadonlyContext) -> str:
    name = ctx.state.get("user_name", "someone")
    return f"You are helping {name}. Session {ctx.invocation_id[-6:]}."

agent = LlmAgent(name="dynamic", model=llm, instruction=instruction_for)`,
      caption: "ReadonlyContext gives you state, user_id, invocation_id, the user's content and the run config — and nothing that can mutate. The function may be async." },

    { t: "out", text: `You are helping Ravi. Session daef72.` },

    { t: "callout", kind: "trap", title: "A dynamic instruction is still a prompt, not a policy engine",
      body: "It is tempting to compute permissions here — *if the user is not an admin, tell the model not to use the delete tool*. A model may ignore it. Access control belongs in a `before_tool_callback` that refuses the call, or in not giving that agent the tool at all (lessons 6.1 and 9.2). Use dynamic instructions for context, not for enforcement." },

    { t: "h2", n: "05", text: "The prompt surface you did not think of", id: "surface" },

    { t: "p", text: "The instruction is perhaps half of what steers the model. The rest is names and descriptions that you write for other reasons:" },

    { t: "diagram", kind: "compare", title: "Everything the model reads before choosing",
      caption: "A tool that is never called, or called with the wrong arguments, is usually a naming and docstring problem rather than an instruction problem. Lesson 4.1 shows the generated declaration in full.",
      columns: [
        { title: "You write it as", tone: "accent", items: ["a function name", "parameter names", "the docstring", "the Args: section", "an agent's description", "a tool's return dict keys"] },
        { title: "The model reads it as", tone: "warn", items: ["the tool's name", "the argument schema", "what the tool is for", "what each argument means", "which specialist to route to", "the evidence it answers from"] }
      ] },

    { t: "code", lang: "python", title: "The same tool, twice",
      code: `def proc(a: str, b: int) -> dict:                     # the model has almost nothing to go on
    """Process."""
    ...

def refund_order(order_id: str, amount_paise: int) -> dict:
    """Refunds part or all of an order to the original payment method.

    Args:
        order_id: the order to refund, e.g. 'ORD-1042'.
        amount_paise: how much to refund, in paise. Must not exceed the order total.
    """
    ...`,
      caption: "The second version needs no instruction text about refunds at all. The first will need a paragraph — and will still be called with the wrong units occasionally." },

    { t: "h2", n: "06", text: "Writing instructions that hold", id: "writing" },

    { t: "diagram", kind: "steps", title: "Five rules that survive contact with a model",
      caption: "None of these is clever prompting. They are the ones whose absence shows up as a production incident.",
      items: [
        { label: "Say what to do, not what the agent is", desc: "'Use lookup_invoice before answering about a bill' beats 'You are a helpful billing expert'", tone: "accent" },
        { label: "State the refusals explicitly, with the alternative", desc: "'Never quote a price. Say that pricing is on the website and offer to open a ticket.'", tone: "crit" },
        { label: "Name the tools and when to use each", desc: "the model has the declarations, but the ordering and the preference are yours to state", tone: "good" },
        { label: "Constrain the output shape in words, or use a schema", desc: "'Answer in at most three sentences' works; output_schema is stronger (lesson 6.4)", tone: "warn" },
        { label: "Put shared policy in global_instruction, once", desc: "copies in five agents drift; one at the root cannot", tone: "violet" }
      ] },

    { t: "p", text: "Few-shot examples belong in the instruction when the format is hard to describe and easy to show — two or three input-output pairs, not twenty. If the examples are long or fixed, they are a good candidate for `static_instruction`; ADK also ships an `ExampleTool` for structured few-shot examples. And every example is tokens on every call: measure before adding a fourth." },

    { t: "exercise", kind: "practice", title: "Capture your own system instruction", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "Take an agent with an instruction containing a state placeholder, a global_instruction and one sub-agent. Record the `LlmRequest` and print `config.system_instruction`. Then answer: (a) in what order do the four sources appear; (b) what did ADK add that you did not write; (c) what happens to a `{key}` whose state entry is missing, and to `{key?}`; (d) does the sub-agent's description appear, and where." }],
      requirements: ["A model wrapper that records requests", "The printed instruction", "Four short answers"],
      hint: "A BaseLlm subclass that appends llm_request to a list before delegating is enough.",
      solution: { lang: "python", title: "Solution",
        code: `class Recording(BaseLlm):
    model: str = "fake-model"
    seen: list = []
    async def generate_content_async(self, req, stream=False):
        self.seen.append(req)
        yield LlmResponse(content=types.Content(role="model", parts=[types.Part(text="ok")]))

# (a) global_instruction, instruction (interpolated), ADK's framing, transfer guidance
# (b) 'You are an agent. Your internal name is "<name>".' plus, with sub_agents,
#     a list of transfer targets and their descriptions
# (c) {key} raises when the key is absent; {key?} renders as empty
# (d) yes — inside the transfer guidance ADK appends, which is how routing works`,
        notes: [{ t: "p", text: "Doing this once for a real agent is worth more than reading any amount of prompt advice: what you tuned and what the framework added are both in there, and the interaction between them is where surprising behaviour comes from." }] } }
  ],

  takeaways: [
    "The system instruction is assembled from global_instruction, your instruction with state interpolated, ADK's own agent framing, and transfer guidance when the agent has sub-agents.",
    "instruction is per agent and re-rendered every call; global_instruction applies to the whole subtree; static_instruction is fixed content placed first and is the part worth caching.",
    "{key} interpolates from session state and errors when missing; {key?} renders empty; scoped keys like {user:lang} work with their prefix.",
    "An instruction may be a function of ReadonlyContext when the text depends on something templating cannot express.",
    "A dynamic instruction is context, not enforcement: access control belongs in a callback or in not granting the tool.",
    "Tool names, parameter names and docstrings are prompt surface — a well-named tool with a real Args section needs no instruction paragraph.",
    "Write rules rather than personas, state refusals with their alternative, and put shared policy in global_instruction once."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "An instruction contains `{tier?}` and session state has no 'tier' key. What happens?",
      options: ["The request fails", "The literal text {tier?} is sent", "It renders as empty", "The agent is skipped"],
      answer: 2,
      why: "The question mark marks the placeholder optional: a missing key renders as nothing. Without it, a missing key is an error — which is the right default for a value the instruction genuinely depends on, because silent emptiness there produces a confidently wrong answer." },
    { stem: "Where should 'never disclose another customer's data' live in a five-agent system?",
      options: ["In each agent's instruction", "In global_instruction on the root agent", "In static_instruction on the leaf agents", "In the tool docstrings"],
      answer: 1,
      why: "global_instruction applies to the agent and every descendant, so the rule is written once and cannot be forgotten in a new specialist. Copies in five instructions drift as the agents are edited separately — and a rule that holds in four agents out of five is the incident." },
    { stem: "What is static_instruction for?",
      options: ["Instructions that cannot be changed at run time", "Fixed content placed ahead of the dynamic instruction, which makes it cacheable", "Instructions for static analysis", "A fallback when the instruction fails to render"],
      answer: 1,
      why: "Because instruction is re-rendered every call with fresh state, it cannot be cached. static_instruction is content that does not change — a style guide, a schema, fixed examples — placed first in the request, which is exactly the prefix a provider's context cache can reuse." },
    { stem: "A tool is never called even though the instruction tells the model to use it. What do you check first?",
      options: ["The temperature", "The tool's name, parameter names and docstring — the declaration the model actually sees", "The session service", "The output_key"],
      answer: 1,
      why: "The model chooses tools from their generated declarations, not from your prose. A function called proc with a docstring of 'Process.' gives it nothing to match against the user's request; renaming it refund_order with a real Args section usually fixes the behaviour without touching the instruction at all." }
  ] },

  interview: { title: "Interview", sub: "Prompting questions for an agent framework", questions: [
    { level: "Core", q: "What ends up in an ADK agent's system instruction?",
      strong: "Global instruction, your instruction with state interpolated, ADK's agent framing, and transfer guidance with sub-agent descriptions.",
      answer: [{ t: "p", text: "Four things, in that order. Any global_instruction inherited from the agent tree comes first, so policy applies to every agent below the root. Then the agent's own instruction, with {state_key} placeholders replaced from session state at request-build time, and {key?} tolerating absence. Then ADK's own line naming the agent, which is how a model knows which agent it currently is when several share one conversation. Finally, if the agent has sub-agents, ADK appends transfer guidance listing them with their description fields, which is the mechanism behind LLM-driven delegation. You can read the whole thing by recording the LlmRequest, and it is worth doing once because the framework's additions are not obvious from your own code." }] },
    { level: "Core", q: "How do you make an agent's behaviour depend on the user?",
      strong: "State templating for values, a dynamic instruction for computed text, and callbacks or tool selection for anything that must be enforced.",
      answer: [{ t: "p", text: "For values that already exist, write them into state — user: scope for anything that should outlive the session — and reference them in the instruction with braces, which ADK interpolates per call. For text that has to be computed, pass a function as the instruction; it receives a ReadonlyContext with state, user id and the invocation id, and returns the string. What I would not do is express permissions this way. 'Do not use the refund tool for non-admins' is a request, not a control: a model can ignore it under pressure from a crafted message. Enforcement belongs in a before_tool_callback that rejects the call, or in constructing the agent with a smaller tool list for that user in the first place." }] },
    { level: "Senior", q: "An agent's prompt has grown to 4,000 tokens and every call is slow and expensive. How do you reduce it?",
      strong: "Split the fixed part into static_instruction for caching, move policy to global_instruction, cut examples, and move the toolbox out to specialist agents.",
      answer: [{ t: "p", text: "First, measure what is in there: record an LlmRequest and count the parts. Typically it is a style guide, a long list of rules, several few-shot examples, and the tool declarations for a dozen tools. Fixed prose goes into static_instruction so a context cache can reuse the prefix rather than re-billing it every call. Shared policy moves to global_instruction on the root so it is written once rather than duplicated in siblings. Examples get cut to the two that change behaviour, verified by an evalset rather than by feel. The tool declarations are usually the biggest remaining block, and the fix is architectural: split into specialists with three tools each and let a coordinator route, which also makes each model call more accurate. If a long document genuinely must be present every time, it belongs in retrieval as a tool rather than in the prompt." }] }
  ] }
});
