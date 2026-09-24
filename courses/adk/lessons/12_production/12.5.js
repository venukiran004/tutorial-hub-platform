/* ============================================================================
   LESSON 12.5 — Production Architecture, End to End
   The capstone. Every component named here was built and executed somewhere in
   this course on google-adk 2.9.2; this lesson assembles them and names the
   decisions behind each one.
   ========================================================================= */
EC.receiveLesson({
  id: "12.5",

  lede: "**Here is the whole thing, with every choice named.** Fifty lessons have introduced the pieces one at a time and executed each one; this is where they become a system — a support agent that answers from documents, acts through tools, refuses what it must, asks a person when the stakes warrant it, and can be debugged on a Tuesday when someone says it got something wrong. Read it as the architecture review you will eventually have to give: not \"what did you build\" but \"why is each layer there, and what happens when it fails\".",

  objectives: [
    "Draw the full architecture of a production agent system",
    "Justify each component by the failure it prevents",
    "Trace one request through every layer",
    "Identify the decisions that are hard to reverse later",
    "Run the review that should happen before an agent takes real traffic"
  ],

  prerequisites: ["12.1", "9.2"],

  blocks: [

    { t: "h2", n: "01", text: "The shape", id: "shape" },

    { t: "diagram", kind: "layers", title: "A production agent system, top to bottom",
      caption: "Nothing here is optional in a system handling real customers. Each layer exists because of a specific failure, named in section 02.",
      items: [
        { label: "Client", sub: "browser or app — never holds provider credentials", tone: "accent" },
        { label: "Your API", sub: "authenticates, derives user_id, owns session ids, re-streams (9.1)", tone: "good" },
        { label: "Runner + App", sub: "plugins for logging, tracing, cost and the global guardrail (6.2, 11.1)", tone: "violet" },
        { label: "Coordinator agent", sub: "routes to specialists on their descriptions (2.6)", tone: "warn" },
        { label: "Specialists", sub: "retrieval, actions, drafting — each with only its own tools (4.7)", tone: "accent" },
        { label: "Tools", sub: "narrow signatures, callbacks enforcing policy, approval where it matters (6.1, 9.3)", tone: "good" },
        { label: "Services", sub: "sessions, artifacts, memory, credentials — all persistent and shared (5.3, 6.3)", tone: "violet" },
        { label: "Data layer", sub: "row-level security keyed by the authenticated user (9.1)", tone: "crit" }
      ] },

    { t: "h2", n: "02", text: "Why each layer is there", id: "why" },

    { t: "table", head: ["Layer", "The failure it prevents"],
      rows: [
        ["Your API in front", "A client choosing its own `user_id` and reading someone else's conversation"],
        ["Plugins", "A new agent shipping with no logging, no tracing and no cost attribution because someone forgot"],
        ["A coordinator with specialists", "One agent with twenty tools picking the wrong one — accuracy degrades with toolbox size"],
        ["Per-agent tool lists", "A prompt injection reaching a tool the agent had no business holding"],
        ["Callbacks on tools", "A model being talked out of a policy that was only ever stated in the instruction"],
        ["Human approval", "An irreversible action taken because a language model was confident"],
        ["Persistent shared services", "Conversations vanishing when traffic lands on the other replica"],
        ["Row-level security", "Every layer above it having failed, and tenant data still not leaking"]
      ] },

    { t: "callout", kind: "mental", title: "Assume the layer above failed",
      body: [{ t: "p", text: "That is the whole design principle. The instruction will be argued with, so the callback checks. The callback may have a bug, so the tool validates. The tool's query may be wrong, so the database filters. Each layer is cheap and none is sufficient, and the system is judged by what happens when the model does the worst thing available to it." }] },

    { t: "h2", n: "03", text: "One request, all the way down", id: "trace" },

    { t: "diagram", kind: "steps", title: "\"My laptop arrived damaged, I want a refund\"",
      caption: "Twelve steps, every one of which you have executed somewhere in this course. The interesting ones are 4, 8 and 9.",
      items: [
        { label: "Client posts the message", sub: "session cookie, conversation id" },
        { label: "Your API authenticates", sub: "user_id derived server-side; session id looked up" },
        { label: "Plugin opens a span", sub: "before_run — user, session, invocation" },
        { label: "Global guardrail", sub: "on_user_message; refuse here and no agent runs" },
        { label: "Coordinator routes", sub: "transfers to the returns specialist on its description" },
        { label: "Retrieval", sub: "search_docs — the returns policy, as a function-response event" },
        { label: "Instruction carries state", sub: "tier and locale interpolated from user: state" },
        { label: "before_tool checks", sub: "refund amount, account ownership — blocked or allowed" },
        { label: "Approval requested", sub: "over the threshold: durable pending confirmation; the turn ends" },
        { label: "A human decides", sub: "your queue, your interface, your authorisation" },
        { label: "Resume", sub: "function response with confirmed; the tool runs with reviewed arguments" },
        { label: "Answer streams back", sub: "partials appended, final event persisted, invocation id shown" }
      ] },

    { t: "callout", kind: "insight", title: "Step 9 is the one that changes the product",
      body: [{ t: "p", text: "Everything before it is an agent answering a question. The moment a turn can pause for a person and resume hours later — durably, across a deploy — the agent stops being a chat interface and becomes part of a workflow. That is also where most of the remaining work is, because the queue, the notification and the approval interface are yours to build (lesson 9.3)." }] },

    { t: "h2", n: "04", text: "The decisions that are hard to undo", id: "hard" },

    { t: "dl", items: [
      ["What identifies a user", "It keys sessions, state and memory. Changing it later means migrating every store, and getting it from the client rather than from an authenticated principal is a vulnerability, not a preference (9.1)."],
      ["Session boundaries", "Whether a conversation is per ticket, per day or endless decides cost, context quality and what \"delete my data\" means (5.1, 5.6)."],
      ["Where records of truth live", "An order in your database with its id in state is fine; an order that exists only in session state is a data-loss incident waiting for a retention job."],
      ["The agent topology", "One agent or five changes routing, cost, evaluation and how the team works. Splitting later is a rewrite of every instruction (2.6)."],
      ["Managed or self-hosted", "Agent Engine or your own container decides whether conversations are a table you can join (12.1)."],
      ["What the agent may do unattended", "The list of tools with side effects, and the thresholds on them. Widening it later is easy; narrowing it after an incident is not."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Most of these are cheap now and expensive in six months",
      body: [{ t: "p", text: "None of them is difficult on day one. All of them are painful once there are a hundred thousand sessions, an approval workflow built on the current shape, and a team used to how it behaves. If you take one practice from this course, it is to write these six down before building, because they are the ones a demo never surfaces." }] },

    { t: "h2", n: "05", text: "What it costs, and where", id: "cost" },

    { t: "diagram", kind: "compare", title: "Where the money actually goes",
      caption: "Measured with usage_metadata per agent (11.1). The third column is where teams look first and it is rarely the answer.",
      columns: [
        { title: "Usually the largest", tone: "crit", items: ["Long conversations resending history", "The strongest model doing cheap work", "Retry and refine loops", "Reflection steps on every answer"] },
        { title: "Usually worth it", tone: "good", items: ["Retrieval instead of a longer prompt", "A cheap model for classification", "Caching a stable prefix", "include_contents=\"none\" on helpers"] },
        { title: "Rarely the problem", tone: "warn", items: ["The framework", "Tool execution", "Session storage", "Your own compute"] }
      ] },

    { t: "h2", n: "06", text: "The review", id: "review" },

    { t: "p", text: "The questions worth asking before an agent meets real users. Each one traces back to a lesson, and each one has been the subject of an incident somewhere." },

    { t: "dl", items: [
      ["Where does `user_id` come from?", "If the answer is the request body, stop. (9.1)"],
      ["What is the worst thing the model could do with the tools it has?", "Assume a successful injection. If the answer is unacceptable, the fix is the tool list and the credential, not the prompt. (9.2)"],
      ["Which session and artifact services are configured?", "In-memory defaults work with one replica and fail at random with two. (5.3, 12.1)"],
      ["What bounds a turn?", "`max_llm_calls`, loop caps, tool timeouts — or a conversation can cost arbitrarily much. (10.3)"],
      ["What happens when a tool fails?", "Converted for upstream failures, propagated for bugs, and never reported as success. (10.3)"],
      ["What does 'delete my data' do?", "Sessions, artifacts and memory are three stores. (5.4, 6.3)"],
      ["What runs in CI?", "Fake-model unit tests on every commit, an evaluation suite on instruction and model changes. (11.2, 11.3)"],
      ["How do you investigate a complaint from last week?", "Retention, and the invocation id in front of the user. (11.1)"],
      ["What is alerted?", "Tail model calls per turn, tool errors by tool, blocked calls, stale approvals. (11.1)"],
      ["Who approves, and what happens if nobody does?", "An unanswered confirmation is a stuck conversation. (9.3)"]
    ] },

    { t: "callout", kind: "good", title: "The shortest honest summary of this course",
      body: [{ t: "p", text: "An agent is a loop you do not control, around a model that will sometimes be wrong and can sometimes be persuaded. Everything useful you build is about bounding what that loop can do: narrow tools, scoped credentials, checks that do not depend on recognising an attack, approval where reversal is impossible, and enough recorded detail to explain any answer afterwards. The framework makes all of that a few lines each. Deciding which to use is the engineering." }] },

    { t: "exercise", kind: "practice", title: "The architecture review", difficulty: "expert", minutes: 45,
      prompt: "Take an agent you have built during this course, or design one for a domain you know. Write the full architecture: client, API, plugins, agents, tools, services, data layer. For each component, write one sentence saying what failure it prevents. Then answer all ten review questions from section 06 honestly, marking anything you cannot answer. Finally, write the paragraph you would give a security reviewer describing what the agent can do unattended, and the paragraph you would give a finance reviewer describing where the money goes.",
      hints: [
        "The components you cannot justify by a named failure are the ones to cut.",
        "The questions you cannot answer are your actual backlog.",
        "The two paragraphs are harder than the diagram, and they are what gets you approved."
      ],
      solution: {
        notes: [
          { t: "p", text: "The justification exercise is a filter in both directions. Components with no named failure behind them tend to be there because a tutorial had them — a memory service nobody ingests into, a reflection step nobody measured. And failures with no component behind them are the gaps: almost every design I have seen has no answer for a stuck approval or for what deletion means across three stores." },
          { t: "p", text: "The two paragraphs are the real deliverable. The security one forces you to enumerate side effects and thresholds in plain language, and it is very hard to write honestly for an agent with a broad tool list — which is itself the finding. The finance one forces you to know where tokens go, which is a question you can only answer if you attributed usage per agent, and it is usually the conversation that gets a classifier moved onto a cheaper model." }
        ]
      } }

  ],

  takeaways: [
    "Each layer exists to catch the failure of the layer above — the design assumes the instruction loses the argument.",
    "Your API owns identity; the agent never sees a `user_id` the client chose.",
    "Plugins carry the cross-cutting concerns so a new agent inherits them automatically.",
    "Six decisions are hard to reverse: identity, session boundaries, records of truth, topology, hosting and unattended authority.",
    "Cost is dominated by long conversations, strong models doing cheap work, and loops — not by the framework.",
    "Ten review questions; the ones you cannot answer are the backlog."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does a production agent sit behind your own API rather than being called directly by the client?",
      options: ["To add caching", "So identity is derived server-side and the client cannot choose whose data to read", "To reduce latency", "Because ADK requires it"],
      answer: 1,
      why: "`user_id` is an unvalidated key into sessions, state and memory, so a client that supplies its own can read anyone's. Your API authenticates the user, derives the id, owns the session id and keeps provider credentials out of the browser — none of which ADK does for you." },
    { stem: "What is the design principle behind having instruction, callback, tool validation and row-level security all check the same rule?",
      options: ["Redundancy for performance", "Each layer assumes the one above it failed", "Compliance requires four checks", "Different layers check different rules"],
      answer: 1,
      why: "The instruction can be argued with, the callback can have a bug, the tool's query can be wrong — so the database filters regardless. Each layer is cheap and none is sufficient, and the system is judged by what happens when the model does the worst thing available to it." },
    { stem: "Which of these is hardest to change after six months in production?",
      options: ["The model", "What identifies a user", "The log format", "The system instruction"],
      answer: 1,
      why: "It keys sessions, state and memory, so changing it means migrating every store and reconciling identities across all three. The model, the instruction and the log format are all edits you can make and evaluate in an afternoon." },
    { stem: "Your agent's costs are climbing. Where do you look first?",
      options: ["Session storage", "Conversation length, and which agent is using the expensive model", "Tool execution time", "The framework's overhead"],
      answer: 1,
      why: "Every turn resends the transcript, so long conversations dominate, and a system where a classifier and a formatter both use the strongest model is paying premium rates for cheap work. Storage, tool execution and framework overhead are rarely material next to tokens." }
  ] },

  interview: { title: "Interview", sub: "Architecture questions", questions: [
    { level: "Core", q: "Walk me through the architecture of a production agent system.",
      strong: "Client, your API, runner with plugins, coordinator and specialists, guarded tools, persistent services, and a data layer that enforces access.",
      answer: [{ t: "p", text: "The client never talks to the model provider or chooses its own identity — it talks to my API, which authenticates the user, derives `user_id` from that, and owns the session id. Behind it a runner with an App carrying plugins for logging, tracing, cost attribution and any global guardrail, so that a newly added agent inherits all of it. Then a coordinator routing to specialists on their descriptions, each holding only the tools its job needs. Tools have narrow signatures with callbacks enforcing policy on the arguments, and the consequential ones require human approval. Underneath, persistent shared services for sessions, artifacts, memory and credentials, and a data layer with row-level security keyed by the authenticated user. I would describe each layer by the failure it prevents rather than by what it does, because that is what makes the design defensible." }] },
    { level: "Senior", q: "Which architectural decisions would you insist on getting right before building?",
      strong: "Identity, session boundaries, where records of truth live, topology, hosting, and what the agent may do unattended.",
      answer: [{ t: "p", text: "Identity first, because `user_id` keys sessions, state and memory, so changing it later means migrating three stores — and taking it from the client rather than an authenticated principal is a vulnerability rather than a shortcut. Session boundaries next: whether a conversation is per ticket or endless determines cost, context quality and what deletion means. Where records of truth live, because an order that exists only in session state is a data-loss incident waiting for a retention job. The agent topology, since splitting one agent into five later is a rewrite of every instruction and a new evaluation set. Hosting, because managed sessions versus your own database decides whether conversation analytics is a SQL join or an export pipeline. And the list of things the agent may do unattended, with its thresholds — that one is easy to widen later and very hard to narrow after an incident. None of them is difficult on day one and all of them are painful at a hundred thousand sessions." }] },
    { level: "Senior", q: "You inherit an agent that works in demos and behaves badly in production. Where do you start?",
      strong: "Read the event logs, check the session service, find what bounds a turn, and look at what the tools can do.",
      answer: [{ t: "p", text: "First the session service, because in-memory defaults are the single most common cause of an agent that appears to work and then forgets things intermittently — it is a one-line fix and it explains a whole class of reports. Then the event logs for real complaints, since ADK records every message, tool call, result and state change, so the question of what the model was given and what it chose is answerable rather than speculative. Then what bounds a turn: `max_llm_calls`, loop caps, tool timeouts, and the tail of model calls per turn, because a demo never runs long enough to loop and production does. Then identity: where `user_id` comes from, which decides whether this is a performance problem or an incident. Then the tool list against the worst case, assuming injection succeeds. Only after that would I touch the prompt, because prompt-tuning is where teams start and it cannot fix any of the above — and I would not touch it at all until there is an evaluation set, since otherwise I have no way to know whether a change helped." }] }
  ] }
});
