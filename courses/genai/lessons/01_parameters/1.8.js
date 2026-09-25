EC.receiveLesson({
  id: "1.8",

  lede: "There are four ways to get JSON out of a language model and they offer four different guarantees, ranging from none at all to a formal one. Knowing which is which is the difference between a parser wrapped in a retry loop and a parser that cannot fail. This lesson ranks them by what each actually promises, generates the schema a Pydantic model becomes, counts what that schema costs on every request, and shows what strict mode forbids and why.",

  objectives: [
    "Rank prompt-only, JSON mode, function calling and structured output by the guarantee each provides",
    "Generate a JSON Schema from a Pydantic model and read what the model will actually see",
    "State what OpenAI's strict mode requires, and express an optional field under that constraint",
    "Account for the token cost a schema adds to every request",
    "Say why you still validate output that came back from a schema-enforced call"
  ],

  prerequisites: ["1.1", "1.5"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "four-ways", text: "Four approaches, four guarantees",
      sub: "The ranking is the lesson; everything else is detail" },

    { t: "p", text: "The reference ranks these by reliability and the ranking is worth memorising, because each step up removes an entire class of production bug." },

    { t: "code", lang: "python", title: "g18.py — the ranking", code: `rows = [
    ("prompt only",       "nothing",                  "may add prose, may invent fields"),
    ("JSON mode",         "valid JSON",               "no schema -- fields and types are free"),
    ("function calling",  "matches the tool schema",  "model chooses whether to call"),
    ("structured output", "matches the schema, always", "the strongest available"),
]`,
      out: `  prompt only         guarantees: nothing                   may add prose, may invent fields
  JSON mode           guarantees: valid JSON                no schema -- fields and types are free
  function calling    guarantees: matches the tool schema   model chooses whether to call
  structured output   guarantees: matches the schema, always  the strongest available`,
      caption: "Each row removes a failure the row above it still has. The jump from row two to row three is the largest: it is the difference between \"parses\" and \"has the fields you need\"." },

    { t: "viz", title: "What each layer eliminates", caption: "Reading down, each approach removes one more class of failure. The last column is what you still have to handle after choosing it.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Four structured-output approaches ranked by guarantee">
  <text x="16" y="24" class="s-label">approach</text>
  <text x="250" y="24" class="s-label">still possible</text>
  <text x="640" y="24" class="s-label">cost</text>

  <rect x="16" y="36" width="200" height="44" rx="6" class="s-fill" style="stroke:var(--crit)" stroke-width="1.3"/>
  <text x="32" y="56" class="s-label">prompt only</text>
  <text x="32" y="72" class="s-sub">"return JSON with fields…"</text>
  <text x="250" y="52" class="s-sub" style="fill:var(--crit)">prose before the JSON · markdown fence ·</text>
  <text x="250" y="68" class="s-sub" style="fill:var(--crit)">invented fields · wrong types · unparseable</text>
  <text x="640" y="60" class="s-mono">free</text>

  <rect x="16" y="90" width="200" height="44" rx="6" class="s-fill" style="stroke:var(--warn)" stroke-width="1.3"/>
  <text x="32" y="110" class="s-label">JSON mode</text>
  <text x="32" y="126" class="s-sub">response_format json_object</text>
  <text x="250" y="106" class="s-sub" style="fill:var(--warn)">invented fields · wrong types ·</text>
  <text x="250" y="122" class="s-sub" style="fill:var(--warn)">missing required keys</text>
  <text x="640" y="114" class="s-mono">free</text>

  <rect x="16" y="144" width="200" height="44" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="32" y="164" class="s-label">function calling</text>
  <text x="32" y="180" class="s-sub">tool_choice required</text>
  <text x="250" y="160" class="s-sub" style="fill:var(--good)">values that are well-typed but wrong ·</text>
  <text x="250" y="176" class="s-sub" style="fill:var(--good)">the model declining to call</text>
  <text x="640" y="168" class="s-mono">~85 tok/tool</text>

  <rect x="16" y="198" width="200" height="44" rx="6" class="s-fill-2" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="32" y="218" class="s-label" style="fill:var(--accent)">structured output</text>
  <text x="32" y="234" class="s-sub">response_format = schema</text>
  <text x="250" y="214" class="s-sub" style="fill:var(--accent)">values that are well-typed but wrong ·</text>
  <text x="250" y="230" class="s-sub" style="fill:var(--accent)">refusals</text>
  <text x="640" y="222" class="s-mono">137 tok (measured)</text>
</svg>` },

    { t: "callout", kind: "trap", title: "\"Valid JSON\" and \"the JSON I asked for\" are different guarantees",
      body: [
        { t: "p", text: "JSON mode guarantees the response parses. It does not guarantee a single thing about what is inside it. `{}` is valid JSON. So is `{\"answer\": \"I don't know\"}` when your code expects `{\"sentiment\": \"positive\", \"confidence\": 0.9}`." },
        { t: "p", text: "The bug this produces is not a parse error — those are loud and get caught. It is a `KeyError` three functions downstream, or worse, a `.get(\"sentiment\", \"neutral\")` that silently classifies everything as neutral when the model changes how it names the field." },
        { t: "p", text: "If you are using JSON mode without a schema, you have moved the validation problem rather than solved it. The schema is where it actually gets solved." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "the-schema", text: "What a Pydantic model becomes",
      sub: "The model does not see your class — it sees this" },

    { t: "p", text: "Writing `response_format=FruitList` is convenient enough that it is easy to forget a JSON Schema is being generated and sent. It is worth looking at once, because every decision in the class shows up in it, and the size of it is on your bill." },

    { t: "code", lang: "python", title: "g18.py — the schema behind the class", code: `from pydantic import BaseModel
from typing import List

class Fruit(BaseModel):
    name: str
    color: str
    calories: int

class FruitList(BaseModel):
    fruits: List[Fruit]

print(json.dumps(FruitList.model_json_schema(), indent=2))
print("that schema costs %d tokens on every request it is sent with." % n(schema))`,
      out: `{
  "$defs": {
    "Fruit": {
      "properties": {
        "name":     { "title": "Name",     "type": "string"  },
        "color":    { "title": "Color",    "type": "string"  },
        "calories": { "title": "Calories", "type": "integer" }
      },
      "required": [ "name", "color", "calories" ],
      "title": "Fruit",
      "type": "object"
    }
  },
  "properties": {
    "fruits": {
      "items": { "$ref": "#/$defs/Fruit" },
      "title": "Fruits",
      "type": "array"
    }
  },
  "required": [ "fruits" ],
  "title": "FruitList",
  "type": "object"
}

that schema costs 137 tokens on every request it is sent with.`,
      caption: "Eleven lines of Python become a 137-token schema. Note that Pydantic emits a `title` for every field — derived from the field name and carrying no information the property key does not already have." },

    { t: "p", text: "Two things in that output are worth noticing. The nested model became a `$defs` entry with a `$ref`, which is how Pydantic avoids repeating a definition used in several places — and which some providers' strict modes do not accept, so a deeply nested model can fail validation for a reason that has nothing to do with your data. And every field carries a `title` that duplicates its key, costing tokens for nothing." },

    { t: "code", lang: "python", title: "g18.py — optionality and enums", code: `class Loose(BaseModel):
    name: str
    note: Optional[str] = None
    tier: Literal["free", "pro", "enterprise"] = "free"`,
      out: `{
  "properties": {
    "name": { "title": "Name", "type": "string" },
    "note": {
      "anyOf": [ { "type": "string" }, { "type": "null" } ],
      "default": null,
      "title": "Note"
    },
    "tier": {
      "default": "free",
      "enum": [ "free", "pro", "enterprise" ],
      "title": "Tier",
      "type": "string"
    }
  },
  "required": [ "name" ],
  "title": "Loose",
  "type": "object"
}`,
      caption: "`Optional[str]` becomes a nullable union; `Literal[...]` becomes an `enum`. The enum is the useful one — it constrains the model's output to three strings rather than hoping the prompt does." },

    { t: "callout", kind: "good", title: "An enum is worth more than an instruction",
      body: [
        { t: "p", text: "`Literal[\"free\", \"pro\", \"enterprise\"]` puts the allowed values in the schema, where they are a constraint. \"The tier must be one of free, pro or enterprise\" in the prompt puts them in the instructions, where they are a suggestion." },
        { t: "p", text: "Under structured output the difference is absolute: the enum cannot be violated, and the instruction can. It also means you do not need the sentence in the prompt at all, which is a small saving on every request and one less thing to keep in sync when the tiers change." },
        { t: "p", text: "The same logic applies to numeric bounds, string patterns and array lengths. Anything expressible in the schema should be in the schema." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "strict", text: "What strict mode requires",
      sub: "Two constraints, and one of them changes how you write optional fields" },

    { t: "p", text: "OpenAI's structured outputs will only accept a subset of JSON Schema, and two of the restrictions catch people immediately." },

    { t: "code", lang: "python", title: "g18.py — strict-ready or not", code: `cases = [
    ("plain object", {"type": "object", "properties": {"a": {"type": "string"}}}),
    ("strict-ready", {"type": "object", "properties": {"a": {"type": "string"}},
                      "required": ["a"], "additionalProperties": False}),
]
for name, sc in cases:
    ok = sc.get("additionalProperties") is False and "required" in sc
    print("%-14s additionalProperties=%-5s required=%-5s -> strict ok: %s"
          % (name, sc.get("additionalProperties"), "required" in sc, ok))`,
      out: `  plain object   additionalProperties=None  required=False -> strict ok: False
  strict-ready   additionalProperties=False required=True  -> strict ok: True

OpenAI's strict mode requires additionalProperties:false and every property
listed in required. Optionality is expressed as a nullable union instead.`,
      caption: "`additionalProperties: false` is what makes \"no invented fields\" a guarantee rather than a hope. `required` covering everything is the surprising one." },

    { t: "p", text: "The second constraint is the one that changes your code. **Every property must be in `required`** — there are no optional fields. What you write instead is a field that is required but may be null:" },

    { t: "code", lang: "python", title: "strict.py — optional under strict mode", code: `# Does NOT work under strict mode: the field is absent from "required"
class Loose(BaseModel):
    name: str
    note: Optional[str] = None       # -> not in required -> rejected

# Works: the field is required, and null is one of its permitted values
class Strict(BaseModel):
    model_config = {"extra": "forbid"}     # -> additionalProperties: false
    name: str
    note: str | None                       # required, nullable, no default

# The consequence in your own code: a missing note now arrives as an explicit
# None rather than an absent key, so this is wrong --
#     if "note" in data:            # always true
# and this is right --
#     if data["note"] is not None:`,
      caption: "The behavioural change is in the last comment. Under strict mode the key is always present, so presence checks stop discriminating and null checks are what you need." },

    { t: "callout", kind: "tradeoff", title: "The strictness is a real constraint, not a formality",
      body: [
        { t: "p", text: "**What you gain:** the response cannot have extra fields, cannot be missing a field, and cannot have a value of the wrong type. That is three entire categories of downstream bug removed, permanently, rather than handled." },
        { t: "p", text: "**What you give up:** recursive schemas, some combinations of `anyOf`, `$ref` in positions the provider does not support, and true optionality. Deeply nested Pydantic models sometimes need flattening to pass validation — for a reason that has nothing to do with your domain." },
        { t: "p", text: "**What it costs at inference:** the constraint is enforced by masking the logits at each step, which is the same mechanism as 3.13's grammar-constrained decoding. First use of a new schema is slower while it is compiled; after that the overhead is small." },
        { t: "p", text: "The trade is almost always worth taking. The exception is a genuinely open-ended extraction where you do not know the fields in advance — and there, JSON mode plus your own validation is the honest answer." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "anthropic", text: "The providers that have no JSON mode",
      sub: "A forced tool call is the structured output" },

    { t: "p", text: "Anthropic has no `response_format`. The documented approach is to define a tool whose input schema is the shape you want, and force the model to call it — at which point the arguments the model produces *are* your structured response, and they conform to the schema for the same reason function-calling arguments always do." },

    { t: "code", lang: "python", title: "anthropic_structured.py", code: `response = anthropic_client.messages.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "List 3 fruits"}],
    tools=[{
        "name": "output_fruits",
        "description": "Output fruit data",
        "input_schema": {
            "type": "object",
            "properties": {
                "fruits": {"type": "array", "items": {"type": "object", "properties": {
                    "name":  {"type": "string"},
                    "color": {"type": "string"},
                }}}
            },
        },
    }],
    tool_choice={"type": "tool", "name": "output_fruits"},   # forced, not optional
)

# The "response" is the tool call's input, not the message text.
data = next(b.input for b in response.content if b.type == "tool_use")`,
      caption: "From 01_LLM_Parameters.md §8. The `tool_choice` is what makes this reliable — without it the model decides whether to call the tool, and the whole point is that it has no choice." },

    { t: "p", text: "The pattern generalises. Any provider with function calling has structured output, because a forced tool call is structured output with a different name. 1.9 is the lesson about what else that machinery does." },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "still-validate", text: "You still validate",
      sub: "The schema constrains the shape, not the truth" },

    { t: "p", text: "Structured output guarantees that `calories` is an integer. It does not guarantee the integer is right. A banana at 3,000 calories satisfies the schema perfectly, and so does a `confidence` of 1.0 on an answer the model invented." },

    { t: "ul", items: [
      "**Range and sanity checks** belong in code, not the schema, when the bound is semantic rather than structural — a Pydantic validator, not a `maximum`.",
      "**Cross-field consistency** cannot be expressed in JSON Schema at all: `end_date` after `start_date`, a `total` that matches the sum of `items`.",
      "**Referential checks** against your own data — does this `product_id` exist — are the ones that catch hallucinated identifiers, and no schema can perform them.",
      "**Refusals.** Structured output can return a refusal instead of a parsed object. Handle that branch explicitly rather than letting it surface as a `None` somewhere."
    ] },

    { t: "p", text: "The point of the schema is that it removes the failures that are *about shape*, so that your validation code can be about meaning. Code that both parses defensively and checks semantics is doing two jobs and usually does the second one badly." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Measure what a schema costs, and make it cheaper",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "The measured `FruitList` schema was 137 tokens, sent on every request. On a high-volume endpoint that is a real line on the bill, and a good deal of it is `title` fields that carry no information." },
        { t: "p", text: "Measure a realistic schema, strip what is redundant, and report the saving in tokens and in money." }
      ],
      requirements: [
        "Define a Pydantic model with at least 8 fields across two nested classes",
        "Report the token count of its generated JSON Schema",
        "Write a function that removes every `title` key recursively, and report the new count",
        "Report the percentage saved and the annual cost difference at 1,000,000 requests/month and $2.50 per 1M input tokens",
        "State one thing you should NOT strip, and why"
      ],
      hint: "Walk the schema recursively with `isinstance(node, dict)` and `isinstance(node, list)`. `title` is safe to remove because the property key already carries the name; `description` is not.",
      solution: { lang: "python", title: "g18_ex.py",
        code: `import json, tiktoken
from pydantic import BaseModel, Field
from typing import List

enc = tiktoken.get_encoding("o200k_base")
def n(obj): return len(enc.encode(json.dumps(obj)))

class LineItem(BaseModel):
    sku: str
    quantity: int
    unit_price: float
    discount_pct: float

class Order(BaseModel):
    order_id: str
    customer_email: str
    items: List[LineItem]
    total: float
    currency: str = Field(description="ISO 4217 code, e.g. GBP")

def strip_titles(node):
    if isinstance(node, dict):
        return {k: strip_titles(v) for k, v in node.items() if k != "title"}
    if isinstance(node, list):
        return [strip_titles(v) for v in node]
    return node

full   = Order.model_json_schema()
lean   = strip_titles(full)
before, after = n(full), n(lean)

print("full schema : %4d tokens" % before)
print("titles gone : %4d tokens" % after)
print("saved       : %4d tokens (%.1f%%)" % (before - after, 100.0 * (before - after) / before))

REQS_PER_MONTH, RATE = 1_000_000, 2.50
cost = lambda t: t * REQS_PER_MONTH * 12 * RATE / 1e6
print()
print("at %s requests/month, $%.2f per 1M input tokens:" % (f"{REQS_PER_MONTH:,}", RATE))
print("  full : $%8.2f / year" % cost(before))
print("  lean : $%8.2f / year" % cost(after))
print("  saved: $%8.2f / year" % (cost(before) - cost(after)))`,
        out: `full schema :  252 tokens
titles gone :  180 tokens
saved       :   72 tokens (28.6%)

at 1,000,000 requests/month, $2.50 per 1M input tokens:
  full : $ 7560.00 / year
  lean : $ 5400.00 / year
  saved: $ 2160.00 / year`,
        notes: [
          { t: "p", text: "28.6% of the schema was `title` keys, and every one of them duplicated the property name immediately above it. At a million requests a month that is $2,160 a year for information the model already has — and the saving scales linearly with traffic while the engineering cost is a nine-line function." },
          { t: "p", text: "What you must **not** strip is `description`. A title is `\"Currency\"` above a key called `currency`; a description is `\"ISO 4217 code, e.g. GBP\"`, and that is the only thing in the whole schema telling the model to emit `GBP` rather than `pounds`. Descriptions are the cheapest instruction channel you have — they sit exactly where the field is being generated — and removing them to save tokens trades a real quality loss for a small one." },
          { t: "p", text: "The general shape of this: a schema is a prompt. Everything in it is sent every time, so it deserves the same editing a system prompt gets, and nothing should be in it that is not doing work. 11.8 is the lesson about that at scale, and 1.13's prompt caching is what makes a large static schema affordable when you genuinely need one." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the extractor that was right about everything except the dates",
      body: [
        { t: "p", text: "**Symptom.** An invoice-extraction pipeline ran on structured output with a Pydantic schema and had a 99.4% valid-parse rate. Finance reported that roughly one invoice in fifty was being filed against the wrong quarter." },
        { t: "p", text: "**The schema.** `invoice_date: str`, `due_date: str`, with a prompt instruction to use ISO 8601." },
        { t: "p", text: "**Mechanism.** `str` is a type the schema enforces, and every date the model produced was a valid string — so the parse rate was genuinely 99.4% and told nobody anything. On invoices from US suppliers the model was copying the source format, `03/04/2026`, which the downstream parser read as 3 April where the supplier meant 4 March. The schema had verified the one property that could not be wrong." },
        { t: "p", text: "**Fix.** `invoice_date: datetime.date` in the Pydantic model, which generates `\"format\": \"date\"` in the schema and makes the constraint structural, plus a cross-field validator asserting `due_date >= invoice_date` — the kind of check no JSON Schema can express, which is why it belongs in code. The measurement that had been missing: the pipeline tracked parse rate, and parse rate was never going to move. What it needed was a check on the *values*, and 8.10 is about building the golden set that would have shown the 2% from the first week." }
      ] }
  ],

  takeaways: [
    "Four approaches, four guarantees: **prompt only** guarantees nothing, **JSON mode** guarantees valid JSON and nothing about its contents, **function calling** guarantees the tool schema, **structured output** guarantees the schema always.",
    "`{}` is valid JSON. JSON mode without a schema moves the validation problem downstream rather than solving it — the bug arrives as a `KeyError` three functions later, not a parse error.",
    "A Pydantic model is sent as a **generated JSON Schema**. The measured `FruitList` — eleven lines of Python — became **137 tokens** on every request.",
    "`Optional[str]` becomes a nullable union; `Literal[...]` becomes an `enum`. **An enum in the schema is a constraint; the same list in the prompt is a suggestion.**",
    "OpenAI's strict mode requires `additionalProperties: false` **and every property in `required`** — there are no optional fields, only required nullable ones.",
    "That changes your code: the key is always present, so `if \"note\" in data` stops discriminating and `if data[\"note\"] is not None` is what you need.",
    "Anthropic has no JSON mode. A **forced tool call** is the structured output — any provider with function calling has structured output under a different name.",
    "**The schema constrains shape, not truth.** A banana at 3,000 calories satisfies it. Range checks, cross-field consistency and referential checks all belong in code.",
    "A schema is a prompt: stripping redundant `title` keys saved **28.6%** of a measured schema, worth $2,160/year at a million requests a month — but `description` is the cheapest instruction channel you have and must stay."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You use JSON mode with no schema and your parse rate is 100%. What can still go wrong?",
        options: ["Nothing — valid JSON is what you needed", "The object can have the wrong fields, missing fields or wrong types", "The response can fail to be JSON under load", "Only performance"],
        answer: 1,
        why: "JSON mode guarantees the response parses and says nothing about its contents — `{}` and `{\"answer\": \"I don't know\"}` are both perfectly valid. The failure surfaces as a `KeyError` downstream or, worse, a `.get(field, default)` that silently substitutes a default when the model renames a key. The first option is exactly the false confidence the lesson is about, and the incident in §05 is a 99.4% parse rate that told nobody anything. JSON mode does not degrade under load, and performance is not the issue." },

      { stem: "Under OpenAI's strict mode, how do you express a field that may be absent?",
        options: ["Leave it out of `required`", "Make it required with a nullable type, and check for None rather than for the key", "Use `additionalProperties: true`", "Strict mode does not support that at all"],
        answer: 1,
        why: "Strict mode requires every property to appear in `required`, so there are no optional fields — you declare the field required and permit null as one of its values, which makes the key always present. That changes downstream code: presence checks stop discriminating and null checks are what you need. The first option is what people try and what strict mode rejects. `additionalProperties: true` would allow *extra* fields, which is the opposite constraint and is also forbidden. The fourth is wrong — the case is supported, just expressed differently." },

      { stem: "Why is `Literal[\"free\", \"pro\", \"enterprise\"]` better than the same list written in the prompt?",
        options: ["It uses fewer tokens", "Under structured output it is a constraint that cannot be violated, where a prompt instruction can", "It makes the model faster", "There is no difference; both end up in the request"],
        answer: 1,
        why: "The `Literal` generates an `enum` in the schema, and under structured output the constraint is enforced by masking the logits — the model cannot emit a fourth value. The same list in the prompt is an instruction, which is followed most of the time. Token count is not the argument and may go either way; the enum also lets you delete the prompt sentence, but that is a side benefit. Speed is unrelated. The fourth option is true that both are sent and wrong about what that means: where a constraint lives determines whether it is enforced or requested." },

      { stem: "Your invoice extractor has a 99.4% valid-parse rate under a schema, but 2% of dates are misread. What does that tell you?",
        options: ["The schema is not being applied", "The field was typed as `str`, so the schema verified the one property that could not be wrong", "The parse rate metric is broken", "The model needs a higher temperature"],
        answer: 1,
        why: "Every string is a valid string, so a `str`-typed date field makes the parse rate structurally incapable of detecting a format problem — the metric was always going to read near 100%. Typing the field as a date generates `\"format\": \"date\"` and makes the constraint structural; cross-field checks like `due_date >= invoice_date` then belong in code, because no JSON Schema can express them. The first option is contradicted by the parse rate itself. The metric is not broken; it is measuring the wrong thing, which is a different and more dangerous problem. Temperature has nothing to do with it." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "This is the reference's own Q4 and a standard question, because the ranking of guarantees is exactly the kind of thing production experience teaches and documentation does not.",
    questions: [
      { level: "core",
        q: "How do you get reliable structured output from a model?",
        strong: "A strong answer ranks the approaches by guarantee rather than listing them, and ends with the point that you still validate.",
        answer: [
          { t: "p", text: "Ranked by what each actually guarantees. Structured output with a schema is strongest — the response is guaranteed to match, because the constraint is enforced by masking the logits during decoding. Function calling with `tool_choice` forced is next and is effectively the same mechanism. JSON mode guarantees valid JSON and nothing about its contents. A prompt saying \"return JSON\" guarantees nothing at all." },
          { t: "p", text: "The jump worth naming is from JSON mode to a schema, because it is the difference between \"parses\" and \"has the fields you need\". `{}` is valid JSON. I have seen a pipeline with a 99.4% parse rate that was misfiling 2% of its records, because every field was typed `str` and every string is valid." },
          { t: "p", text: "And then: you still validate. The schema constrains shape, not truth. Range checks, cross-field consistency like `end_date >= start_date`, and referential checks against your own data are all things no schema can do — but the schema removes the shape failures so your validation code can be about meaning." }
        ] },

      { level: "core",
        q: "Anthropic has no JSON mode. What do you do?",
        strong: "Forced tool use. A strong answer knows why the forcing is the load-bearing part.",
        answer: [
          { t: "p", text: "Define a tool whose `input_schema` is the shape you want, and set `tool_choice` to force that specific tool. The arguments the model produces are your structured response, and they conform to the schema for the same reason function-calling arguments always do." },
          { t: "p", text: "The forcing is the part that matters. Without it the model decides whether to call the tool, and sometimes answers in prose instead — which is precisely the failure you were trying to eliminate. `tool_choice: {\"type\": \"tool\", \"name\": ...}` removes the choice." },
          { t: "p", text: "The general point is that any provider with function calling already has structured output under a different name, so this is a portability pattern rather than a workaround. If you are writing provider-agnostic code, building on forced tool calls gives you one path that works everywhere instead of two." }
        ] },

      { level: "advanced",
        q: "What does strict mode cost you?",
        strong: "A strong answer names the schema-expressiveness limits, the code change optionality forces, and the inference-time mechanism.",
        answer: [
          { t: "p", text: "Three things. First, expressiveness: recursive schemas, some `anyOf` combinations and certain `$ref` positions are not accepted, so a deeply nested Pydantic model sometimes has to be flattened for reasons that have nothing to do with the domain." },
          { t: "p", text: "Second, optionality. Every property must be in `required`, so there are no optional fields — you declare them required and nullable instead. That changes downstream code in a way that is easy to miss: the key is always present, so `if \"note\" in data` is always true and you need an explicit null check." },
          { t: "p", text: "Third, at inference the constraint is enforced by masking logits at each step, which is the same machinery as grammar-constrained decoding. First use of a new schema pays a compilation cost; after that the overhead is small. Worth knowing if you generate schemas dynamically per request, because then you never amortise it." },
          { t: "p", text: "Having said all that — the trade is nearly always worth taking. Three classes of bug removed permanently for a constraint on how you express the model." }
        ] },

      { level: "advanced",
        q: "Your schema is 2,000 tokens and sent on every one of 50 million requests a month. What do you do?",
        strong: "A strong answer treats the schema as a prompt to be edited, quantifies, and reaches for caching rather than only cutting.",
        answer: [
          { t: "p", text: "First, quantify: 2,000 tokens × 50 million × $2.50 per million is $250,000 a month in schema alone. That is a number worth putting on a slide before anyone argues about the engineering." },
          { t: "p", text: "Then edit it like a prompt, because that is what it is. Pydantic emits a `title` for every field that just repeats the property key — on a schema I measured that was 28.6% of the tokens for zero information. Strip those. Keep `description`, because a description sits exactly where the field is generated and is the cheapest instruction channel you have; stripping those to save tokens trades real quality for a small saving." },
          { t: "p", text: "Then reach for prompt caching. A schema is perfectly static, which makes it the ideal cache prefix — put it at the very front of the request, ahead of anything that varies, and the discount is 50% on OpenAI or 90% on Anthropic. That is 1.13, and on this workload it is worth more than the editing." },
          { t: "p", text: "Finally, question the schema itself. A 2,000-token schema is usually several use cases sharing one model. Splitting it per endpoint means each request carries only the fields it can actually receive, which is cheaper and also makes the output easier to validate." }
        ] }
    ]
  }
});
