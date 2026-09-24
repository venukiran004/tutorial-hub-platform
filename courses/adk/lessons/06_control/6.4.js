/* ============================================================================
   LESSON 6.4 — Structured Output
   The response_schema, the mime type, the parsed dict in state and the
   generated JSON schema are executed output from scratchpad/adk/c3.py on
   google-adk 2.9.2. The output_schema docstring is quoted from the field.
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "**A paragraph is a fine answer for a person and a terrible one for a program.** The moment an agent's output feeds a database write, a conditional branch or another service, you need fields with types — and asking politely in the instruction produces the right shape most of the time, which is the worst possible reliability for a parser. `output_schema` moves the requirement out of the prompt and into the request: a Pydantic model becomes a JSON schema the model is constrained by, and what lands in state is a dictionary you can index.",

  objectives: [
    "Constrain an agent's output with a Pydantic model and read the result from state",
    "Describe what ADK actually sends the model when `output_schema` is set",
    "Write schemas whose field descriptions do the work the instruction used to",
    "Say what changed in ADK 2.x about combining `output_schema` with tools",
    "Decide between a structured agent and a tool that returns structure"
  ],

  prerequisites: ["5.2", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "A schema is a Pydantic model", id: "model" },

    {"kind": "flow", "title": "From a Python class to a constrained answer", "caption": "The constraint travels to the provider as response_schema rather than sitting in the prompt as a wish — verified on the wire. What lands in state is a plain dict, not a model instance.", "cols": 4, "nodes": [{"id": "m", "label": "Pydantic model", "sub": "fields + descriptions", "tone": "good"}, {"id": "j", "label": "JSON Schema", "sub": "descriptions included", "tone": "accent"}, {"id": "r", "label": "On the request", "sub": "response_schema + mime type", "tone": "violet"}, {"id": "s", "label": "state[output_key]", "sub": "a parsed dict", "tone": "warn"}], "edges": [["m", "j"], ["j", "r"], ["r", "s"]], "t": "diagram", "id": "dg-6_4-01-0"},



    { t: "code", lang: "python", title: "c3.py — a parsing agent",
      code: `from pydantic import BaseModel, Field

class Invoice(BaseModel):
    """A parsed invoice."""
    supplier: str = Field(description="Who issued it")
    total: float = Field(description="Total including tax")
    currency: str = Field(description="ISO code")

agent = LlmAgent(name="parser", model=MODEL,
                 instruction="Extract the invoice.",
                 output_schema=Invoice,
                 output_key="invoice")` },

    { t: "out", text: `  state['invoice'] = {'supplier': 'Acme Ltd', 'total': 42.5, 'currency': 'GBP'} | type: dict
  response_schema sent to the model: True
  response_mime_type: application/json` },

    { t: "p", text: "Three separate facts in that output, and each one matters. **`response_schema` and `response_mime_type` were set on the request** — the constraint travelled to the provider rather than sitting in the prompt as a wish. **`total` came back as `42.5`, a float**, not the string `\"42.50\"`. And **what landed in state is a `dict`**, not an `Invoice` instance — so downstream code indexes it with `value[\"total\"]`, and if you want the model back you validate it yourself with `Invoice(**value)`." },

    { t: "h2", n: "02", text: "What the model is actually given", id: "sent" },

    { t: "code", lang: "python", title: "The schema Pydantic generates",
      code: `print(json.dumps(Invoice.model_json_schema()))` },

    { t: "out", text: `{"description": "A parsed invoice.",
 "properties": {"supplier": {"description": "Who issued it", "title": "Supplier", "type": "string"},
                "total": {"description": "Total including tax", "title": "Total", "type": "number"},
                "currency": {"description": "ISO code", "title": "Currency", "type": "string"}},
 "required": ["supplier", "total", "currency"], "title": "Invoice", "type": "object"}` },

    { t: "callout", kind: "insight", title: "Your field descriptions are prompt",
      body: [{ t: "p", text: "Every `description` in the model is sent to the provider as part of the schema. That makes the schema the natural home for the rules that used to clutter the instruction: `Field(description=\"ISO 4217 code, uppercase\")` beats a sentence in the prompt saying the same thing, because it sits next to the field it governs and cannot drift from it. Write schemas the way you would write a good API contract — the class docstring says what the object is, and each description says what the field means and what form it takes." }] },

    { t: "h2", n: "03", text: "The 2.x change worth knowing", id: "tools" },

    { t: "p", text: "In earlier versions, `output_schema` and `tools` were mutually exclusive: an agent that had to produce structure could not also look anything up, which forced an awkward two-agent split for what is obviously one job. That restriction is gone. The field's own documentation on 2.9 describes it as **exposing tools during the thought loop and enforcing structure only on the final output** — so an agent can call three tools, reason over the results, and still be constrained to return your schema." },

    { t: "diagram", kind: "flow", title: "Tools during the loop, schema at the end",
      caption: "Only the last step is constrained. The intermediate model calls are ordinary tool-using turns, which is why this works at all.",
      cols: 4,
      nodes: [
        { id: "u", label: "Request", sub: "\"summarise this account\"", tone: "accent" },
        { id: "t", label: "Tool calls", sub: "unconstrained — the thought loop", tone: "good" },
        { id: "f", label: "Final response", sub: "response_schema enforced", tone: "violet" },
        { id: "s", label: "state[output_key]", sub: "a parsed dict", tone: "warn" }
      ],
      edges: [["u", "t"], ["t", "f"], ["f", "s"]] },

    { t: "callout", kind: "note", title: "If you learned the old rule, unlearn it",
      body: [{ t: "p", text: "Plenty of writing about ADK still says structured output and tools cannot be combined, and building around that restriction costs you an extra agent, an extra model call and an extra state key for no reason. Check the behaviour on the version you are actually running rather than trusting either the old advice or this sentence — `LlmAgent.model_fields[\"output_schema\"]` carries its own documentation, and it takes ten seconds to read." }] },

    { t: "h2", n: "04", text: "Schema or tool?", id: "schema-or-tool" },

    { t: "p", text: "Both produce structure, and they are not interchangeable. `output_schema` constrains the agent's **answer** — the thing the turn is for. A tool with typed parameters constrains an **action** the model takes along the way. If you want a classification that the next agent reads from state, that is a schema. If you want a record written to a database, that is a tool, because the writing is the point and the structure is incidental." },

    { t: "diagram", kind: "compare", title: "Three ways to get structure out of a model",
      caption: "The third is the one to avoid, and it is the one people reach for first because it needs no setup.",
      columns: [
        { title: "output_schema", tone: "good", items: ["The agent's final answer is the object", "Enforced by the provider", "Lands in state via output_key", "Classifiers, extractors, pipeline steps"] },
        { title: "A typed tool", tone: "accent", items: ["The model fills in arguments", "The declaration constrains them", "Your code does the work", "Writes, actions, side effects"] },
        { title: "\"Reply in JSON\"", tone: "crit", items: ["A request, not a constraint", "Fails on markdown fences, prose, trailing commas", "Fails rarely enough to reach production", "Avoid"] }
      ] },

    { t: "callout", kind: "trap", title: "Structure does not mean correct",
      body: [{ t: "p", text: "A schema guarantees that `total` is a number. It guarantees nothing about whether it is the right number, and a constrained model that cannot find the total will produce a plausible one rather than fail — because the schema says the field is required. Keep fields optional where absence is a real possibility, and prefer an explicit `found: bool` or a `confidence` field over forcing a value out of nothing. Validating shape is free; validating truth is evaluation (lesson 11.2)." }] },

    { t: "h2", n: "05", text: "Schemas in a pipeline", id: "pipeline" },

    { t: "code", lang: "python", title: "Where structured output earns its keep",
      code: `class Triage(BaseModel):
    """How a support request should be handled."""
    category: Literal["billing", "technical", "account"] = Field(description="Which team owns it")
    urgency: Literal["low", "normal", "high"] = Field(description="high only for outages or payment failures")
    needs_human: bool = Field(description="True if the request involves a refund or a complaint")

triage = LlmAgent(name="triage", model=MODEL, include_contents="none",
                  instruction="Classify this request: {request_text}",
                  output_schema=Triage, output_key="triage")`,
      caption: "`Literal` becomes an enum in the JSON schema, so the model cannot invent a fourth category. With `include_contents=\"none\"` (lesson 5.6) the classifier sees only the sentence it is classifying." },

    { t: "p", text: "This is the shape that makes multi-agent systems work: a step whose output is a typed object, written to state under a known key, that the next step reads as `{triage}` in its instruction or that your own code branches on. A classifier that returns a paragraph forces the next step to re-read it; a classifier that returns `{\"category\": \"billing\", \"urgency\": \"high\", \"needs_human\": true}` lets the pipeline route without a model call at all." },

    { t: "callout", kind: "good", title: "Enums over free strings, every time",
      body: [{ t: "p", text: "`Literal[\"billing\", \"technical\", \"account\"]` produces an enum the provider enforces. A plain `str` with an instruction saying 'one of billing, technical or account' produces `Billing`, `tech`, `billing support` and eventually something you have never seen, each of which breaks a dictionary lookup in a different way. Any field your code branches on should be an enum or a boolean." }] },

    { t: "exercise", kind: "practice", title: "Replace a parser with a schema", difficulty: "core", minutes: 24,
      prompt: "Write an agent that asks a model to return JSON in its instruction, with no output_schema, and a parser that json.loads the answer. Run it against several inputs including an ambiguous one and note every way the parse fails. Then convert it to output_schema with a Pydantic model, move the rules into Field descriptions, and confirm what lands in state. Finally, add a Literal field and an optional field, and check both in the generated JSON schema.",
      hints: [
        "Markdown code fences around the JSON are the most common failure.",
        "`Invoice.model_json_schema()` shows exactly what the model is told.",
        "An Optional field drops out of `required` — verify that in the schema output."
      ],
      solution: {
        notes: [
          { t: "p", text: "The instruction-based version fails in at least four ways worth seeing once: fenced JSON, a leading sentence of explanation, a trailing comma, and a number rendered as a string with a currency symbol. Each has a plausible defensive fix, and together they are the argument for not doing it — you end up maintaining a tolerant parser for a problem the provider will solve exactly." },
          { t: "p", text: "With the schema, the interesting exercise is what remains in the instruction. It should end up saying what the task is, not what the format is: the shape, the types, the allowed values and the per-field rules have all moved into the model definition, where they are next to the field they constrain and get sent to the provider as a schema rather than as prose the model may or may not follow." }
        ]
      } }

  ],

  takeaways: [
    "`output_schema` takes a Pydantic model and sets `response_schema` and `response_mime_type` on the request.",
    "Field descriptions and the class docstring are sent to the provider — write them like an API contract.",
    "What lands in `state[output_key]` is a plain dict, not a model instance; validate it yourself if you want one.",
    "In ADK 2.x `output_schema` composes with `tools`: tools run during the loop, the schema constrains the final answer.",
    "Use `Literal` for any field your code branches on, so the provider enforces the enum.",
    "A schema guarantees shape, never truth — required fields invite a constrained model to invent a value."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "With output_schema set, what does state[output_key] contain?",
      options: ["A Pydantic model instance", "A plain dict", "The raw JSON string", "An LlmResponse"],
      answer: 1,
      why: "The executed run prints `type: dict`. ADK parses the constrained response and stores the parsed object, so downstream code indexes it with string keys. If you want the typed object back, construct it yourself from the dict — which is also a useful validation step." },
    { stem: "Where do the rules about a field's format belong?",
      options: ["In the agent's instruction", "In the Field description", "In a callback", "In the tool declaration"],
      answer: 1,
      why: "Descriptions are part of the JSON schema sent to the provider, so they reach the model just as the instruction does but sit next to the field they govern and cannot drift from it. That also keeps the instruction about the task rather than the format, which makes both easier to change." },
    { stem: "Can an ADK 2.x agent have both output_schema and tools?",
      options: ["No, they are mutually exclusive", "Yes — tools run during the loop and the schema constrains the final output", "Yes, but only with a single tool", "Only if the tools return JSON"],
      answer: 1,
      why: "That restriction existed in earlier versions and is gone; the field's own documentation describes exposing tools during the thought loop and enforcing structure only on the final output. Designing around the old rule costs an extra agent and an extra model call for no benefit, so it is worth checking on the version you run." },
    { stem: "Your extraction schema has a required `total: float` and the document has no total. What happens?",
      options: ["The model returns null", "The call fails with a validation error", "The model produces a plausible number", "The field is omitted"],
      answer: 2,
      why: "A required field tells the model something must go there, and a constrained model will supply something rather than nothing — which is a silent wrong answer, the worst kind. Where absence is genuinely possible, make the field optional or pair it with an explicit found flag so that 'not present' is expressible." }
  ] },

  interview: { title: "Interview", sub: "Structured output questions", questions: [
    { level: "Core", q: "How do you make an agent return structured data?",
      strong: "A Pydantic model on `output_schema`, which becomes the request's response_schema; the parsed dict lands in state under output_key.",
      answer: [{ t: "p", text: "You define the shape as a Pydantic model and pass it as `output_schema`. ADK turns it into a JSON schema and sets `response_schema` and `response_mime_type` on the request, so the constraint is enforced by the provider rather than requested in the prompt — and I have checked that on the wire rather than taking it on trust. The parsed result is written to `state[output_key]` as a plain dict, ready for the next agent's instruction to interpolate or for my own code to branch on. The thing I would not do is ask for JSON in the instruction and parse it, because that fails on fences, preambles and stringified numbers just often enough to reach production." }] },
    { level: "Core", q: "What is the difference between output_schema and a tool that takes typed arguments?",
      strong: "One constrains the agent's answer, the other constrains an action it takes on the way there.",
      answer: [{ t: "p", text: "`output_schema` is about the result of the turn: a classification, an extraction, the object the next pipeline step consumes. A typed tool is about something happening — a record written, an email sent — where the model fills in arguments that the declaration constrains and my code does the work. They are often confused because both produce validated structure. The test I use is whether anything should happen as a side effect. If yes, it is a tool; if the structure *is* the answer, it is a schema." }] },
    { level: "Senior", q: "You need an agent that looks up an account and returns a typed risk assessment. How do you build it?",
      strong: "One agent with tools and output_schema, enums for anything branched on, optional fields where data may be missing.",
      answer: [{ t: "p", text: "One agent, because on ADK 2.x tools and `output_schema` compose: the lookups happen in the thought loop and only the final answer is constrained. I would define the assessment as a Pydantic model with a `Literal` risk band rather than a free string, because my routing code branches on it and a model that returns `Medium` instead of `medium` is a bug I would rather the provider prevent. Anything the lookups might not find is optional, paired with an explicit flag, because a required field invites a constrained model to invent a value and an invented risk score is worse than a missing one. The rules — what counts as high risk, what form each field takes — go in the field descriptions rather than the instruction, so they sit next to what they govern. And I would treat the schema as guaranteeing shape only: whether the assessment is *right* is an evaluation question, with a labelled set and a metric, not something the type system can tell me." }] }
  ] }
});
