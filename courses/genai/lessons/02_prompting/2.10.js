EC.receiveLesson({
  id: "2.10",

  lede: "1.9 covered function calling as a mechanism — the loop, the schemas, the execution step. This lesson is about the half of it that is prompting: what you write so the model chooses the right tool. The measurement that frames it is stark. In the reference's own weather tool, the description is **6 tokens of 84** — 7% of the definition — and it is the part that decides whether the tool gets called at all.",

  objectives: [
    "Write a tool description that separates a tool from its neighbours",
    "Structure a tool schema so the model produces correct arguments",
    "Diagnose a tool-selection failure to the description rather than the schema",
    "Use tool_choice to remove a decision rather than influence it",
    "Decide how many tools to expose to one call"
  ],

  prerequisites: ["1.9", "2.1"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "two-jobs", text: "The definition does two different jobs",
      sub: "Selection is the description; arguments are the schema" },

    { t: "code", lang: "python", title: "g25.py — where the tokens are", code: `tool = {"type": "function", "function": {
    "name": "get_weather",
    "description": "Get current weather for a location",
    "parameters": {"type": "object", "properties": {
        "location": {"type": "string", "description": "City name"},
        "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}},
        "required": ["location"]}}}`,
      out: `  whole tool definition        :  84 tokens
  just the description string  :   6 tokens
  just the parameters schema   :  53 tokens
  name + wrapper               :  25 tokens

  the description is 7% of the definition -- and it is the part that
  decides whether the tool gets called at all.`,
      hl: [1, 2],
      caption: "Six tokens carry the selection decision; fifty-three constrain the arguments once a selection has been made. Almost all the tuning effort in practice goes into the fifty-three." },

    { t: "p", text: "This split is the whole lesson. When a tool is not being called, people edit the schema, because the schema is where the substance appears to be. The schema has no influence on selection at all — it is read *after* the model has decided. Selection is the name and the description, and it is a retrieval problem: match the user's intent against a set of short texts." },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "descriptions", text: "Writing a description that separates",
      sub: "The negative clause is the highest-value sentence" },

    { t: "ladder", title: "From a label to a boundary", rungs: [
      { level: "bad", label: "A restatement of the name",
        why: "Adds nothing the name did not already say",
        code: `"description": "Gets the weather"`,
        note: "The model already has `get_weather`. This costs tokens and separates the tool from nothing." },
      { level: "ok", label: "What it does and what it returns",
        why: "Now there is something to match intent against",
        code: `"description": "Get the current weather conditions for a city, "
                 "including temperature, humidity and wind speed."`,
        note: "Useful. A query about humidity now matches, where it would not have before." },
      { level: "best", label: "…plus when NOT to use it",
        why: "Separates it from its neighbours, which is where selection fails",
        code: `"description": "Get CURRENT weather conditions for a city, including "
                 "temperature, humidity and wind speed. Use only for "
                 "conditions right now. For forecasts beyond today use "
                 "get_forecast; for past conditions use get_history."`,
        note: "Measured at +31 tokens over the terse version (1.9). Worth it on a tool that is being mis-selected; wasted on one that is not." }
    ] },

    { t: "callout", kind: "good", title: "Four things a good description contains",
      body: [
        { t: "p", text: "**The action and the object** — \"get current weather for a city\", not \"weather utility\"." },
        { t: "p", text: "**What it returns**, briefly. A query mentioning humidity can only match a tool that says it returns humidity." },
        { t: "p", text: "**The boundary**: when not to use it, and which tool to use instead. This is the sentence that fixes mis-selection, because mis-selection is almost always a neighbour winning." },
        { t: "p", text: "**Any precondition** the model can check — \"requires an account id, which `lookup_account` returns\" both prevents a call with a missing argument and establishes an ordering between two tools." }
      ] },

    { t: "p", text: "What a description should *not* contain is implementation detail. \"Calls the v2 weather API with a 5-second timeout\" is true, costs tokens on every request, and has no bearing on whether the model should select it. The audience for a description is the model, not a maintainer." },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "arguments", text: "Getting the arguments right",
      sub: "This is where the schema earns its 53 tokens" },

    { t: "p", text: "Once a tool is selected, argument quality is a structured-output problem, and everything from 1.8 and 2.7 applies unchanged — an `enum` is a constraint, a per-property `description` is a prompt sitting exactly where the value is generated." },

    { t: "code", lang: "python", title: "args.py", code: `"parameters": {
    "type": "object",
    "properties": {
        "location": {
            "type": "string",
            "description": "City name only, e.g. 'Tokyo'. Do not include "
                           "the country or a postcode.",
        },
        "unit": {
            "type": "string",
            "enum": ["celsius", "fahrenheit"],      # cannot be violated
            "description": "Default to celsius unless the user's message "
                           "indicates a US location.",
        },
    },
    "required": ["location"],
}`,
      hl: [6, 7, 11, 12],
      caption: "The `enum` makes `kelvin` unrepresentable. The two descriptions do what an enum cannot: state a format convention and a default rule, both at the point of generation." },

    { t: "callout", kind: "trap", title: "A required argument the model cannot know produces an invented one",
      body: [
        { t: "p", text: "If `account_id` is required and nothing in the conversation supplies one, the model must emit something — so it emits a plausible-looking identifier. The schema validates it perfectly, and your code looks it up and finds nothing, or worse finds someone else's." },
        { t: "p", text: "Two fixes, and both are worth having. Make the field nullable and say in its description that null means unknown, so \"I don't have this\" is an expressible answer. And name the tool that produces it — \"obtain via `lookup_account` first\" — which turns an impossible argument into a two-step plan." },
        { t: "p", text: "This is the same failure as 2.7's invented due dates, arriving through a different door: a required field with no instruction about absence is an invitation to invent." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "choice", text: "tool_choice removes decisions",
      sub: "Prefer removing a choice to influencing it" },

    { t: "p", text: "1.9 listed the four settings. The prompting-relevant point is that `tool_choice` is the only reliable way to control selection — everything else is influence, and influence is a distribution." },

    { t: "table",
      head: ["Goal", "Prompt-level attempt", "Reliable version"],
      rows: [
        ["Always call this tool", "\"Always use the search tool first\"", "`tool_choice={\"type\":\"function\",\"function\":{\"name\":\"search\"}}`"],
        ["Call some tool", "\"You must use a tool to answer\"", "`tool_choice=\"required\"`"],
        ["Never call a tool this turn", "\"Answer from what you already know\"", "`tool_choice=\"none\"`"],
        ["Choose well among several", "A good description per tool", "**No reliable version** — this one genuinely is prompting"]
      ],
      caption: "The first three are decisions you can remove entirely. The fourth cannot be, which is why §02 matters and why routing (2.8) is worth building when the set grows." },

    { t: "p", text: "The practical consequence is a pipeline-shaped one. If your agent always searches before answering, that is not an instruction — it is step one, and forcing it costs nothing and removes a failure mode. Save `\"auto\"` for the turns where there is a genuine decision." },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "how-many", text: "How many tools in one call",
      sub: "Selection degrades before the bill does" },

    { t: "p", text: "1.9 measured the cost: 85 tokens per definition, re-sent every turn, and routing crossing over at six tools. The quality argument arrives earlier than the cost argument." },

    { t: "ul", items: [
      "**Under about five tools**, a good description per tool is usually enough and the set is easy to keep separated.",
      "**Five to fifteen**, boundaries start to matter: pairs of tools begin overlapping and the negative clause from §02 becomes the highest-value sentence in each description.",
      "**Above fifteen**, selection accuracy is the binding constraint rather than cost. Route: a cheap call picks five candidates, and the expensive call sees only those (1.9 measured 89% of schema cost saved at fifty tools over ten turns).",
      "**Above forty**, a single agent is usually doing several jobs. Splitting into several agents with a handoff is the same argument one level up."
    ] },

    { t: "callout", kind: "insight", title: "Overlap is a property of pairs, not of the set",
      body: [
        { t: "p", text: "\"Too many tools\" is the wrong diagnosis most of the time. A set of thirty well-separated tools selects better than a set of eight where three of them could plausibly answer the same question." },
        { t: "p", text: "So the audit is pairwise: for each pair, is there a query both descriptions match? If yes, one of them needs a boundary clause naming the other. This is tedious and it is the work — and it is also exactly what an embedding model can do for you, by scoring description similarity and surfacing the closest pairs." },
        { t: "p", text: "9.13 is about measuring tool selection once you have more than a handful, and it is worth reading before the set grows past ten." }
      ] },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the overlapping pairs in a tool catalogue",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Tool-selection failures come from pairs whose descriptions cover similar ground. An embedding model can surface those pairs in seconds, which is far faster than discovering them from production traces." },
        { t: "p", text: "Build the audit." }
      ],
      requirements: [
        "Define at least ten tools with realistic names and descriptions, including two deliberately overlapping pairs",
        "Embed the descriptions with a sentence-transformer model",
        "Report every pair above a cosine similarity threshold you choose and justify",
        "For the worst pair, write the boundary clause that would separate them",
        "State why the name should be included in the embedded text, or why not"
      ],
      hint: "`sentence-transformers/all-MiniLM-L6-v2` is small and fast. Normalise the embeddings so the dot product is the cosine.",
      solution: { lang: "python", title: "g210_ex.py",
        code: `from sentence_transformers import SentenceTransformer
import itertools, torch

TOOLS = {
    "get_weather":      "Get current weather conditions for a city.",
    "get_forecast":     "Get the weather forecast for a city for the next few days.",
    "lookup_order":     "Find an order by its order number.",
    "search_orders":    "Search for orders matching a customer name or date range.",
    "issue_refund":     "Issue a refund against an order.",
    "cancel_order":     "Cancel an order that has not yet shipped.",
    "get_account":      "Retrieve a customer account by account id.",
    "search_knowledge": "Search the help centre articles for an answer.",
    "escalate":         "Hand the conversation to a human agent.",
    "send_email":       "Send an email to the customer.",
}

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
names = list(TOOLS)
emb = model.encode([TOOLS[n] for n in names], normalize_embeddings=True,
                   convert_to_tensor=True)
sim = emb @ emb.T

THRESHOLD = 0.50
pairs = sorted(
    ((float(sim[i, j]), names[i], names[j])
     for i, j in itertools.combinations(range(len(names)), 2)),
    reverse=True)

print("pairs above cosine %.2f:" % THRESHOLD)
for s, a, b in pairs:
    if s >= THRESHOLD:
        print("  %.4f  %-18s %s" % (s, a, b))

print()
print("closest five overall:")
for s, a, b in pairs[:5]:
    print("  %.4f  %-18s %s" % (s, a, b))`,
        out: `pairs above cosine 0.50:
  0.7887  get_weather        get_forecast
  0.6628  issue_refund       cancel_order

closest five overall:
  0.7887  get_weather        get_forecast
  0.6628  issue_refund       cancel_order
  0.4752  cancel_order       send_email
  0.4729  issue_refund       send_email
  0.4678  get_account        send_email`,
        notes: [
          { t: "p", text: "The audit found one of the two planted pairs and one nobody planted, and missed the other planted one — which is more informative than a clean result would have been. `get_weather`/`get_forecast` at **0.7887** is the obvious hit, and the boundary clause writes itself: \"Use only for conditions right now. For anything beyond today use `get_forecast`.\"" },
          { t: "p", text: "The unplanted finding is the one that matters: **`issue_refund` and `cancel_order` at 0.6628.** Both are actions with side effects on the same object, and a model that confuses them does something irreversible to a customer’s order — a far worse failure than picking the wrong lookup. It was not planted and it is the pair I would fix first." },
          { t: "p", text: "The miss is equally instructive. `lookup_order`/`search_orders` — which I planted as an overlap — came in **below 0.50** and never appeared. Embedding similarity is a screen for descriptions that *read* alike, and those two read differently (\"find by order number\" against \"search by name or date range\") while still competing for the same user intent. So this audit surfaces candidates cheaply and does not replace looking at production traces. On whether to embed the name: **no** — `get_weather` and `get_account` share tokens for reasons that have nothing to do with meaning, and including them adds similarity that is an artefact of a naming convention." },
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the search tool that stopped being called after a new tool shipped",
      body: [
        { t: "p", text: "**Symptom.** A support agent's `search_knowledge` tool had been called on about 60% of turns for months. After an unrelated feature added a `search_tickets` tool, that fell to 22% over two weeks, and answer quality fell with it — the agent was answering from memory where it had previously cited articles." },
        { t: "p", text: "**The two descriptions.** `search_knowledge`: \"Search the knowledge base for an answer.\" `search_tickets`: \"Search previous support tickets for similar issues.\" Both reasonable in isolation, and nobody reviewed them together because they were shipped by different teams a quarter apart." },
        { t: "p", text: "**Mechanism.** Selection is a matching problem over short texts, and \"search … for an answer\" and \"search … for similar issues\" cover overlapping ground — a user question about a known problem matches both. The new tool was often winning, returning ticket threads rather than documentation, and the model then had enough context to answer without calling the other one. Neither tool was broken; the *set* had changed, and no test covered the set." },
        { t: "p", text: "**Fix.** Boundary clauses in both — knowledge search names tickets as the place for \"has anyone seen this before\", tickets names knowledge as the place for documented procedure — which took selection back to 54%. Then the process change that mattered: an embedding audit of all pairs runs in CI, and adding a tool whose description exceeds 0.6 cosine with an existing one fails the build until a boundary clause is added. Two minutes of compute, and it turns a class of regression that took two weeks to notice into a build failure." }
      ] }
  ],

  takeaways: [
    "**A tool definition does two jobs.** The description drives selection; the schema constrains arguments after selection. The schema has no influence on whether the tool is chosen.",
    "Measured on the reference's weather tool: the description is **6 tokens of 84** — 7% of the definition, and the part that decides everything about selection.",
    "When a tool is not being called, **edit the description, not the schema** — the schema is read after the decision has already been made.",
    "A good description gives the action and object, what it returns, **the boundary (when not to use it, and which tool instead)**, and any precondition.",
    "The boundary clause is the highest-value sentence, because mis-selection is almost always a neighbour winning. Measured at +31 tokens (1.9).",
    "Implementation detail does not belong in a description. The audience is the model, not a maintainer.",
    "**A required argument the model cannot know produces an invented one.** Make it nullable with a description saying null means unknown, and name the tool that supplies it.",
    "`tool_choice` **removes** decisions where a prompt only influences them. Forcing a tool that should always run costs nothing and removes a failure mode.",
    "The one thing `tool_choice` cannot do is choose well among several — which is why descriptions matter and routing exists.",
    "**Overlap is a property of pairs, not of the set.** Thirty well-separated tools select better than eight where three cover the same ground.",
    "An embedding audit surfaces overlapping pairs in seconds. Measured on ten tools it found the obvious pair and **an unplanted one that matters more** — `issue_refund` and `cancel_order` at 0.6628, two irreversible actions on the same object — while **missing** a planted pair that reads differently but competes for the same intent. A cheap screen, not a replacement for traces.",
    "**Do not embed the tool name.** `get_weather` and `get_account` share tokens for reasons that have nothing to do with meaning."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A tool is never called even though it is clearly relevant. Where do you look first?",
        options: ["The parameters schema", "The description — selection happens before the schema is read", "The temperature", "The tool_choice setting"],
        answer: 1,
        why: "Selection is a matching problem over the tool's name and description; the parameters schema is read only once a tool has been chosen, so it cannot affect whether it is chosen. Measured, the description is 6 tokens of an 84-token definition and carries the entire decision. `tool_choice` is worth checking if it is set to `none`, but that would suppress all tools rather than one. Temperature affects sampling broadly and is not the mechanism." },

      { stem: "Your tool requires `account_id` and the conversation has not supplied one. What happens?",
        options: ["The model asks the user for it", "The model emits a plausible-looking identifier that validates perfectly", "The request fails validation", "The tool is skipped"],
        answer: 1,
        why: "A required field must be filled, so the model produces something that satisfies the type — and a well-formed identifier passes the schema while pointing at nothing, or at someone else's account. The fix is to make the field nullable with a description saying null means unknown, and to name the tool that supplies it so the model plans two steps. Asking the user is the behaviour you want and is not what a required field with no instruction produces. Schema validation passes, which is exactly the problem." },

      { stem: "You have 30 tools and selection accuracy is poor. What is the most likely cause?",
        options: ["30 is simply too many for any model", "Some pairs of descriptions cover overlapping ground", "The schemas are too complex", "Temperature is too high"],
        answer: 1,
        why: "Selection degrades because of overlap rather than count — a set of thirty well-separated tools selects better than eight where three could plausibly answer the same question, so the audit is pairwise and an embedding similarity check surfaces the culprits in seconds. Schema complexity affects argument quality after selection. Temperature is a broad lever and not the mechanism. Count does matter for cost and for how easy separation is to maintain, but it is not the direct cause of a wrong choice." },

      { stem: "Your agent should always search before answering. How do you enforce it?",
        options: ["Put \"always search first\" in the system prompt", "Force the tool on the first turn with `tool_choice`", "Raise the tool's description priority", "Remove all other tools"],
        answer: 1,
        why: "A prompt instruction influences a distribution; `tool_choice` naming the tool removes the decision entirely, and a step that should always happen is not a decision — it is step one of a pipeline. There is no priority field on a description. Removing the other tools would work for that turn and destroys the agent's ability to do anything else, which is a much larger change than forcing one call." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "This is a good question because the naive answer treats the schema as the important part, and it is the least important part for selection.",
    questions: [
      { level: "core",
        q: "How do you make sure the model picks the right tool?",
        strong: "A strong answer separates selection from arguments and identifies the boundary clause as the lever.",
        answer: [
          { t: "p", text: "Selection is driven by the name and the description; the parameters schema is read after the decision and has no influence on it. That split matters because when a tool is not being called, the instinct is to edit the schema, and the schema is where none of the selection information lives." },
          { t: "p", text: "In the reference's weather tool the description is six tokens of an eighty-four-token definition — 7% — and it carries the whole decision." },
          { t: "p", text: "The highest-value sentence is the negative one: when not to use this tool, and which tool to use instead. Mis-selection is almost always a neighbour winning, so separating the pair is what fixes it. Measured, adding that clause cost about 31 tokens." }
        ] },

      { level: "advanced",
        q: "An agent with 30 tools selects poorly. How do you approach it?",
        strong: "A strong answer audits pairs rather than reducing the count, and can automate it.",
        answer: [
          { t: "p", text: "I would not start from the count. Thirty well-separated tools select better than eight where three cover the same ground — overlap is a property of pairs, and a catalogue of thirty has 435 of them, which is why reviewing tools one at a time never finds it." },
          { t: "p", text: "So: embed the descriptions and sort every pair by cosine similarity. On a ten-tool catalogue I tried, it surfaced `issue_refund` and `cancel_order` at 0.66 — two irreversible actions on the same object, which I had not planted and which is the pair I would fix first. It also missed one I had planted, because those two descriptions read differently while competing for the same intent. So it is a cheap screen that finds real problems, not a substitute for looking at traces." },
          { t: "p", text: "Then boundary clauses on the close pairs, and routing if the set is genuinely large — a cheap call picks five candidates and the expensive call sees only those, which improves accuracy and cost at once." },
          { t: "p", text: "The thing I would push for beyond the fix is putting that audit in CI. A new tool whose description is too close to an existing one fails the build until it has a boundary clause. I have seen a search tool's call rate fall from 60% to 22% over two weeks because another team shipped a similar tool, and nothing tested the set as a set." }
        ] },
      { level: "core",
        q: "What goes in a tool description, and what does not?",
        strong: "A strong answer names the boundary clause and excludes implementation detail.",
        answer: [
          { t: "p", text: "Four things: the action and the object, what it returns, the boundary — when not to use it and which tool to use instead — and any precondition the model can act on, such as needing an account id that another tool supplies." },
          { t: "p", text: "The boundary is the one that earns its tokens, because mis-selection is almost always a neighbour winning rather than the tool being unclear in isolation. Naming the neighbour explicitly is what separates them." },
          { t: "p", text: "What does not belong is implementation detail. \"Calls the v2 API with a 5-second timeout\" is true, costs tokens on every request of every turn, and has no bearing on whether the model should pick it. The audience for a description is the model, not a maintainer — that is what the code comments are for." }
        ] }
    ]
  }
});
