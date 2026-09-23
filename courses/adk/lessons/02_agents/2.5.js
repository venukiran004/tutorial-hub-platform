/* ============================================================================
   LESSON 2.5 — Hierarchy, Delegation and Transfer
   The transfer trace and the coordinator's tool list were captured from a
   real run with a scripted model.
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "**Giving an agent sub-agents does one concrete thing: it adds a `transfer_to_agent` tool and puts the children's descriptions in front of the model.** Delegation in ADK is not a special mechanism — it is a tool call whose effect is recorded as `actions.transfer_to_agent`, after which the named agent produces the next events in the same invocation. This lesson traces a transfer event by event, shows exactly what the coordinator's model was offered, covers the two flags that close off routes, and separates transfer (hand over the conversation) from `AgentTool` (call an agent and come back).",

  objectives: [
    "Explain what sub_agents changes about the parent's model request",
    "Read a transfer in the event stream and name the field that records it",
    "Use disallow_transfer_to_parent and disallow_transfer_to_peers, and say what each closes",
    "Choose between transfer and AgentTool for a given delegation",
    "Diagnose a coordinator that never delegates, or that delegates to the wrong agent"
  ],

  prerequisites: ["2.1", "2.3"],

  blocks: [

    { t: "h2", n: "01", text: "The tree", id: "tree" },

    { t: "code", lang: "python", title: "A coordinator with two specialists",
      code: `billing = LlmAgent(name="billing", model=M,
                   description="Answers invoice and payment questions.",
                   instruction="You are the billing specialist.")

tech = LlmAgent(name="tech", model=M,
                description="Answers connectivity and device questions.",
                instruction="You are the tech specialist.")

root = LlmAgent(name="coordinator", model=M,
                description="Routes the user to a specialist.",
                instruction="Route to the right specialist.",
                sub_agents=[billing, tech])`,
      caption: "Each child's `parent_agent` is set on construction, which is why an agent object belongs to exactly one tree (lesson 2.3). The `description` fields are load-bearing here, not documentation." },

    { t: "diagram", kind: "tree", title: "What the tree gives each agent",
      caption: "The coordinator may transfer down to either child. Each child may transfer back up to the parent, and — through the parent — to its sibling, unless a flag forbids it.",
      root: { label: "coordinator", sub: "sub_agents=[billing, tech]", tone: "accent", children: [
        { label: "billing", sub: "parent_agent = coordinator", tone: "good" },
        { label: "tech", sub: "parent_agent = coordinator", tone: "good" }
      ] } },

    { t: "h2", n: "02", text: "A transfer, event by event", id: "trace" },

    { t: "out", text: `   coordinator    call transfer_to_agent{'agent_name': 'billing'}     final=False
   coordinator    result transfer_to_agent  TRANSFER→billing            final=False
   billing        'Your invoice is 1,240 rupees.'                       final=True

   tools the coordinator was offered: ['transfer_to_agent']
   the sub-agent descriptions appear in its instruction: True` },

    { t: "p", text: "Three events. The coordinator's model called `transfer_to_agent` with the target's name — an ordinary function call, visible in the stream like any other. The response event carries `actions.transfer_to_agent = 'billing'`, which is the flag ADK acts on. Then `billing` authors the next event, **in the same invocation**, and its answer is the final response. The coordinator did not summarise or relay anything; it stepped aside." },

    { t: "dl", items: [
      ["What the model was offered", "`['transfer_to_agent']` — the coordinator had no tools of its own, so the only thing it could do was route. A coordinator with its own tools can answer directly instead, which is usually a design mistake in a router."],
      ["Where the children are described", "In the system instruction. ADK appends transfer guidance listing each sub-agent with its `description`, which is why an empty description makes an agent unroutable."],
      ["Who answers next", "The target agent, with the same session and the same invocation id. Its instruction, its tools and its own sub-agents now apply."],
      ["Where the conversation stays", "With the target for the rest of the invocation. Whether the *next* user turn starts at the root again depends on your wiring — in the dev UI and the default runner the root agent is the entry point each time."]
    ] },

    { t: "diagram", kind: "flow", title: "Transfer is a tool call with a side effect",
      caption: "Nothing about the mechanism is special-cased: the model calls a tool, the tool's event carries actions.transfer_to_agent, and the runtime hands control to the named agent.",
      cols: 4,
      nodes: [
        { id: "m", label: "coordinator's model", sub: "sees descriptions + transfer_to_agent", tone: "accent" },
        { id: "c", label: "function_call", sub: "transfer_to_agent(agent_name='billing')", tone: "warn" },
        { id: "a", label: "actions.transfer_to_agent", sub: "on the response event", tone: "good" },
        { id: "t", label: "billing runs", sub: "same invocation, same session", tone: "violet" }
      ],
      edges: [["m", "c"], ["c", "a"], ["a", "t"]] },

    { t: "h2", n: "03", text: "Closing routes", id: "flags" },

    { t: "table", head: ["Flag", "Default", "What it stops"],
      rows: [
        ["`disallow_transfer_to_parent`", "False", "This agent handing the conversation back up. Set it on a specialist that should finish what it starts."],
        ["`disallow_transfer_to_peers`", "False", "This agent transferring sideways to a sibling. Set it to force routing back through the coordinator."]
      ] },

    { t: "p", text: "The two flags together turn a specialist into a terminal node: once the conversation is there, it stays there for the rest of the invocation. That is often what you want for a checkout or an authentication flow, where wandering off mid-transaction is the failure. The opposite arrangement — every agent free to transfer anywhere — produces conversations that ping-pong, and is the reason to shape the tree deliberately rather than making every agent a sibling of every other." },

    { t: "callout", kind: "trap", title: "A router with tools is not a router",
      body: [{ t: "p", text: "If the coordinator has both sub-agents and tools of its own, its model must choose between answering and delegating on every turn — and models prefer answering. The result is a coordinator that quietly handles billing questions badly instead of transferring them. Keep routers toolless, or give them exactly one tool that cannot substitute for a specialist." }] },

    { t: "h2", n: "04", text: "Transfer against AgentTool", id: "agenttool" },

    { t: "p", text: "There are two ways for one agent to use another, and they differ in who is left holding the conversation." },

    { t: "code", lang: "python", title: "AgentTool: call and come back",
      code: `from google.adk.tools import AgentTool

translator = LlmAgent(name="translator", model=M,
                      description="Translates text to Hindi.", instruction="Translate.")

main_agent = LlmAgent(name="main", model=M,
                      instruction="Use the translator tool when asked.",
                      tools=[AgentTool(agent=translator)])` },

    { t: "out", text: `   main           call translator{'request': 'hello'}      final=False
   main           result translator                        final=False
   main           "It is 'Namaste'."                       final=True` },

    { t: "p", text: "The translator ran and returned a value; `main` then wrote the answer itself and is still the agent in charge. Compare with the transfer trace above, where `billing` produced the final response and the coordinator was done. The event shapes are nearly identical — a call and a result — but the ownership afterwards is opposite." },

    { t: "diagram", kind: "compare", title: "Which one to reach for",
      caption: "Ask who should answer the user's next message. If the specialist should keep talking to them, transfer. If the main agent needs a fact and then continues, AgentTool.",
      columns: [
        { title: "transfer_to_agent", tone: "accent", items: ["the target owns the conversation", "the target's answer is the final response", "right for: routing to a specialist", "the user is now talking to someone else"] },
        { title: "AgentTool", tone: "good", items: ["the caller keeps the conversation", "the sub-agent's output is a tool result", "right for: a capability, not a conversation", "the sub-agent never addresses the user"] }
      ] },

    { t: "dl", items: [
      ["AgentTool's arguments", "`AgentTool(agent=…, skip_summarization=False, include_plugins=True)`. With `skip_summarization=True` the sub-agent's output is returned to the user directly instead of being passed back through the caller's model — one round trip saved when the sub-agent's answer is already the answer."],
      ["Input and output", "The sub-agent receives a `request` argument; an `input_schema` on it turns that into structured arguments, and an `output_schema` makes its result structured data (lesson 6.4)."],
      ["Nesting", "An `AgentTool`'s agent can have its own tools and sub-agents. That is how a 'research' capability with five tools appears as one tool to the agent above it — and how you keep any one model's tool list short."]
    ] },

    { t: "h2", n: "05", text: "When delegation goes wrong", id: "debug" },

    { t: "diagram", kind: "steps", title: "Diagnosing a coordinator",
      caption: "In order of how often each one is the cause. The first two account for most of it.",
      items: [
        { label: "It never delegates → check the descriptions", desc: "an empty or vague description gives the model nothing to match; write what the agent answers, in the user's words", tone: "crit" },
        { label: "It answers instead of delegating → check its tools", desc: "a coordinator with tools will use them; take them away", tone: "warn" },
        { label: "It delegates to the wrong specialist → the descriptions overlap", desc: "'account questions' and 'billing questions' are the same thing to a model; make them disjoint", tone: "accent" },
        { label: "It bounces between agents → close routes", desc: "disallow_transfer_to_peers on the specialists, so routing goes back through the coordinator", tone: "good" },
        { label: "It transfers but the answer is wrong → read the target's instruction", desc: "the specialist received the conversation, not a summary; it must be able to work from the raw history", tone: "violet" }
      ] },

    { t: "exercise", kind: "practice", title: "Route, then stop routing", difficulty: "core", minutes: 18,
      body: [{ t: "p", text: "Build a coordinator with two specialists and confirm three things by reading events: (a) that the coordinator's tool list contains only `transfer_to_agent`; (b) that the sub-agent descriptions appear in its system instruction; (c) that the specialist authors the final response. Then set `disallow_transfer_to_parent=True` and `disallow_transfer_to_peers=True` on both specialists and describe what a user asking a billing question followed by a tech question now experiences." }],
      requirements: ["The three confirmations, from recorded requests and events", "The behaviour change described in terms of who answers", "One sentence on when that behaviour is right"],
      hint: "Record the LlmRequest to see tools_dict and the system instruction.",
      solution: { lang: "text", title: "Solution",
        code: `(a) tools_dict == ['transfer_to_agent']    — the coordinator has no tools of its own
(b) the system instruction ends with transfer guidance listing billing and tech with
    their description fields
(c) the last event's author is 'billing', not 'coordinator'

After setting both flags: the billing question is answered by billing as before. The
tech question, arriving while billing holds the conversation, cannot be transferred
sideways to tech or back to the coordinator, so billing answers it — badly.`,
        notes: [{ t: "p", text: "That is the right behaviour inside a transaction — a checkout agent should not release the conversation half way — and the wrong behaviour for general support, where topics change. The usual compromise is to allow transfer to the parent but not to peers, so a specialist can hand back to the router but cannot guess at which sibling to jump to." }] } }
  ],

  takeaways: [
    "sub_agents adds a transfer_to_agent tool to the parent and puts each child's description into its system instruction.",
    "A transfer is an ordinary tool call whose response event carries actions.transfer_to_agent; the target then authors the next events in the same invocation.",
    "The description field is what routing is decided on — empty means unroutable, overlapping means mis-routed.",
    "disallow_transfer_to_parent and disallow_transfer_to_peers close routes; both set makes a specialist terminal, which is right inside a transaction.",
    "A coordinator with tools of its own will answer rather than delegate; keep routers toolless.",
    "AgentTool calls an agent and returns its output as a tool result, leaving the caller in charge — the right choice for a capability rather than a conversation.",
    "AgentTool is also how a five-tool capability appears as one tool, keeping any single model's declaration list short."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does adding sub_agents to an LlmAgent change about its model request?",
      options: ["Nothing — it is only bookkeeping", "It adds a transfer_to_agent tool and appends the children's descriptions to the system instruction", "It merges the children's tools into the parent's tool list", "It makes the parent run the children in order"],
      answer: 1,
      why: "The executed run showed exactly this: the coordinator's tools_dict was ['transfer_to_agent'] and its system instruction ended with transfer guidance naming the sub-agents and their descriptions. That is the entire mechanism behind LLM-driven delegation — no special routing layer exists." },
    { stem: "After a transfer, which agent produces the final response?",
      options: ["The coordinator, summarising the specialist", "The specialist, in the same invocation", "Both, in sequence", "Neither — the invocation ends"],
      answer: 1,
      why: "Control passes to the named agent, which authors the subsequent events with the same invocation id and produces the final response itself. The coordinator does not relay or summarise; it stepped aside. That is the difference from AgentTool, where the caller stays in charge." },
    { stem: "Your coordinator answers billing questions itself instead of transferring. What is the most likely cause?",
      options: ["The specialist's model is wrong", "The coordinator has tools of its own, so answering is available to it", "disallow_transfer_to_peers is set", "The session service is in memory"],
      answer: 1,
      why: "A model that can either call a tool it has or hand the conversation to someone else will often prefer to act. Routers should be toolless so the only available action is a transfer; if the coordinator genuinely needs a tool, make the specialist's description unambiguous and say in the instruction which questions must be transferred." },
    { stem: "You need an agent to translate a phrase and then continue its own answer. Transfer or AgentTool?",
      options: ["Transfer, because the translator is an agent", "AgentTool, because the caller must keep the conversation and only needs a value back", "Either — they behave the same", "Neither; use a tool function"],
      answer: 1,
      why: "Transfer hands the conversation over, so the translator would end up addressing the user and the original agent would be finished. AgentTool runs the translator as a tool, returns its output as a function result, and the caller writes the final answer — which is what 'translate this bit for me' actually means." }
  ] },

  interview: { title: "Interview", sub: "Delegation questions", questions: [
    { level: "Core", q: "How does an ADK agent delegate to another agent?",
      strong: "sub_agents adds transfer_to_agent and the children's descriptions; the model calls it, the event carries actions.transfer_to_agent, the target continues the invocation.",
      answer: [{ t: "p", text: "Listing agents in sub_agents does two things to the parent's model call: it adds a transfer_to_agent tool, and it appends the children's description fields to the system instruction so the model knows what each one is for. When the model decides to route, it calls that tool with the target's name; the resulting event carries actions.transfer_to_agent, and the runtime runs the named agent inside the same invocation against the same session. The target authors the following events and produces the final response. There is no separate routing layer — which is worth knowing because it means routing quality is a prompt-and-description problem, debuggable by reading the assembled request." }] },
    { level: "Core", q: "Transfer or AgentTool — how do you decide?",
      strong: "Ask who should own the conversation afterwards: the target (transfer) or the caller (AgentTool).",
      answer: [{ t: "p", text: "Transfer hands over: the specialist answers the user and continues to hold the conversation, which is right when the user's need has moved into that specialist's domain — a billing question to a billing agent. AgentTool borrows: the sub-agent is invoked like a function, its output comes back as a tool result, and the calling agent writes the answer, which is right when you need a capability rather than a conversation — translate this, summarise that, look this up in the research corpus. A secondary benefit of AgentTool is encapsulation: a sub-agent with five tools of its own appears to the caller as a single tool, which keeps the caller's declaration list short and its choices accurate." }] },
    { level: "Senior", q: "A multi-agent support system mis-routes about one in ten conversations. How do you fix it?",
      strong: "Make descriptions disjoint and concrete, take tools away from the router, close peer transfers, and measure with an evalset rather than by feel.",
      answer: [{ t: "p", text: "First I would build an evalset of the mis-routed conversations so the change is measurable — routing quality is exactly what trajectory evaluation is for. Then the usual causes in order: overlapping descriptions, where 'account questions' and 'billing questions' are indistinguishable to a model, fixed by rewriting them as disjoint sets of concrete examples in the user's own words; a router with its own tools, which makes answering compete with delegating; and free peer-to-peer transfer, which lets a specialist guess at a sibling instead of returning to the router that has the full picture. If it still mis-routes after that, the honest fix is often to stop asking a model: if the correct target is derivable from data — the ticket's product line, the customer's plan — route in code and use the model only for the genuinely ambiguous free-text cases." }] }
  ] }
});
