EC.receiveLesson({
  id: "2.7",

  lede: "1.8 established the ranking: a schema is a guarantee and a prompt is a request. This lesson is about the request — because there are real situations where a schema is unavailable, and because even when one is available, the prompt still has to describe the *semantics* that the schema cannot. Measured here: the reference's prompt-described JSON is 58 tokens and the equivalent generated schema is 176, three times as much — and only one of them is a constraint the model cannot violate.",

  objectives: [
    "Write a prompt that specifies an output format without a schema, and say what it guarantees",
    "Explain what a schema cannot express and must therefore stay in the prompt",
    "Choose a delimiter and a parsing strategy that fail loudly rather than silently",
    "Handle the cases where structured output is unavailable",
    "State the one thing to do before parsing any model output"
  ],

  prerequisites: ["1.8", "2.1"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "the-prompt-form", text: "Describing a format in words",
      sub: "Show the shape, do not describe it" },

    { t: "p", text: "The single most effective thing in a format prompt is a literal example of the output. Describing a structure in prose invites interpretation; showing it does not — which is the same mechanism as few-shot prompting (2.2), applied to shape rather than to task." },

    { t: "code", lang: "python", title: "format.py — the reference's pattern", code: `prompt = """Extract information from this text and return as JSON:
{
  "entities": [{"name": "...", "type": "person|org|location"}],
  "sentiment": "positive|negative|neutral",
  "summary": "one sentence summary"
}

Text: {text}"""`,
      caption: "From 04_Prompt_Engineering.md §7. Note the two devices: the shape is shown as literal JSON, and the permitted values are given as a pipe-separated enumeration rather than described." },

    { t: "code", lang: "python", title: "g25.py — what each form costs", code: `P("  prompt-described JSON : %3d tokens (a request)" % n(prompt_json))
P("  generated JSON Schema : %3d tokens (a guarantee)" % n(schema))`,
      out: `  prompt-described JSON :  58 tokens (a request)
  generated JSON Schema : 176 tokens (a guarantee)
  difference            : +118 tokens

  so the schema is 3.0x the prompt description, and it is the only one
  of the two that the model cannot violate.`,
      hl: [1, 2],
      caption: "Three times the tokens for the schema. That is the price of a guarantee, and on any request where correctness matters it is obviously worth paying — but it is not free, and on a 50-million-request endpoint the difference is real money (1.13)." },

    { t: "callout", kind: "good", title: "Four devices that make a format prompt work",
      body: [
        { t: "p", text: "**Show the literal output.** A JSON object with `\"...\"` placeholders beats three sentences describing the same object." },
        { t: "p", text: "**Enumerate permitted values inline.** `\"person|org|location\"` is shorter and more reliable than \"the type should be one of person, organisation or location\"." },
        { t: "p", text: "**Say what to do when a value is absent.** This is the omission that causes most downstream bugs: without it, a model invents a plausible value rather than emitting `null`, and you cannot tell the difference afterwards." },
        { t: "p", text: "**Forbid the preamble explicitly.** \"Return only the JSON, with no explanation and no markdown fences\" removes the two commonest wrappers. It is the one instruction a schema makes unnecessary." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "what-schema-cannot", text: "What a schema cannot say",
      sub: "The prompt still carries the semantics" },

    { t: "p", text: "It is tempting to treat structured output as making the format prompt redundant. It does not — it makes the *shape* part redundant. Everything about what the fields mean still has to be said, and a schema has exactly one place to say it: `description`." },

    { t: "table",
      head: ["Requirement", "Expressible in the schema?", "Where it lives"],
      rows: [
        ["The field is a string", "**Yes** — `type: string`", "Schema, enforced"],
        ["One of three values", "**Yes** — `enum`", "Schema, enforced"],
        ["A date in ISO 8601", "**Yes** — `format: date`", "Schema, enforced"],
        ["The summary is one sentence", "No", "Prompt, or a `description`"],
        ["Use `null` rather than guessing", "No", "Prompt — and this is the important one"],
        ["`end_date` is after `start_date`", "No", "Code, after parsing (1.8)"],
        ["The entity must appear in the source text", "No", "Code, and it is the check that catches hallucination"]
      ],
      caption: "The top three are why structured output is worth using. The bottom four are why the prompt does not go away, and why 1.8's closing point — you still validate — is not optional." },

    { t: "callout", kind: "insight", title: "`description` is a prompt that sits where the field is generated",
      body: [
        { t: "p", text: "A schema's `description` fields are the highest-leverage instruction channel available, because they are adjacent to the thing being produced rather than several hundred tokens earlier in a system prompt." },
        { t: "p", text: "`{\"currency\": {\"type\": \"string\", \"description\": \"ISO 4217 code, e.g. GBP\"}}` reliably produces `GBP`. The same instruction in the system prompt competes with everything else there and is further away." },
        { t: "p", text: "This is why 1.8's exercise concluded that `title` keys are safe to strip and `description` is not. Stripping descriptions to save tokens trades a real quality loss for a small saving." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "parsing", text: "Parsing output that is not guaranteed",
      sub: "Fail loudly, and never repair silently" },

    { t: "p", text: "Without a schema, the output might not parse. The instinct is to write a tolerant parser that strips fences, finds the first `{`, and repairs trailing commas. That instinct is right about the stripping and wrong about the repair." },

    { t: "code", lang: "python", title: "parse.py", code: `import json, re

FENCE = re.compile(r"^\\s*\`\`\`(?:json)?\\s*|\\s*\`\`\`\\s*$", re.M)

def parse(raw, model_cls):
    text = FENCE.sub("", raw).strip()          # strip markdown fences: safe

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        # Do NOT attempt to repair. Log the raw output and fail -- a repaired
        # object is an object nobody specified, and it will be wrong in a way
        # that looks right.
        log.warning("unparseable output (%d chars): %r", len(raw), raw[:400])
        raise OutputNotParseable(raw) from e

    return model_cls(**data)                   # pydantic validates the contents`,
      hl: [9, 10, 11, 12],
      caption: "Stripping a fence is removing a wrapper the model added. Repairing malformed JSON is guessing at content, and a guess that parses is worse than a failure that does not." },

    { t: "callout", kind: "trap", title: "A repaired object is an unspecified object",
      body: [
        { t: "p", text: "JSON repair libraries are good at their job and that is the problem: they will turn `{\"a\": 1, \"b\":}` into `{\"a\": 1}` and hand you something that validates. You now have a record missing a field, indistinguishable from one where the field was genuinely absent." },
        { t: "p", text: "The failure you wanted was loud. The failure you got is a row in a database with a plausible gap in it, discovered — if at all — during an audit months later. This is the same shape as 1.8's incident, where a 99.4% parse rate told nobody anything." },
        { t: "p", text: "Retry rather than repair. A failed parse is cheap to retry, often succeeds, and when it does not, the escalation is a real signal about the prompt or the input. 1.16 has the retry policy." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "no-schema", text: "When structured output is unavailable",
      sub: "Three situations, and what to do in each" },

    { t: "dl", items: [
      ["A provider with no schema mode", "Anthropic, and most local serving stacks. Use a forced tool call (1.8), which is equivalent and available wherever function calling is. For a local model with neither, grammar-constrained decoding (3.13) is the same guarantee at the sampler level."],
      ["A genuinely open-ended extraction", "You do not know the fields until you see the document. A schema requires knowing them, so here JSON mode plus your own validation is the honest answer — and the validation has to be stricter, because the model is free to name things."],
      ["Output that is not JSON", "Markdown, a table, a diff, a specific report layout. Schemas do not help; a literal example does, and so does a post-condition check that the structure is present before the output is used."]
    ] },

    { t: "code", lang: "python", title: "non_json.py — a format check for output with no schema", code: `REQUIRED = ("## Summary", "## Risks", "## Recommendation")

def check_report(text):
    missing = [h for h in REQUIRED if h not in text]
    if missing:
        raise MalformedReport(missing)         # loud, with what was absent
    if text.count("## ") != len(REQUIRED):
        raise MalformedReport("unexpected sections")
    return text`,
      caption: "Not a schema, but it turns \"the model sometimes drops the Risks section\" from an intermittent quality complaint into a countable failure with a name." },

    { t: "p", text: "That last point generalises further than this lesson. Any output with a structure you rely on deserves a post-condition, whether or not the format is JSON — and the post-condition is what converts a fuzzy \"it sometimes gets it wrong\" into a number you can put on a dashboard (10.3)." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find what fraction of your format prompt a schema replaces",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Moving from a format prompt to a schema does not delete the prompt — it deletes the parts about shape and leaves the parts about meaning. Knowing which is which tells you what the migration actually costs and what it cannot do." },
        { t: "p", text: "Take a realistic format prompt apart and classify every clause." }
      ],
      requirements: [
        "Write a format prompt of at least 12 clauses for a non-trivial extraction",
        "Classify each clause as shape (a schema can enforce it), semantics (it must stay), or validation (it belongs in code)",
        "Report the token count of each category",
        "Report the total after migrating to a schema — the schema plus the surviving prompt",
        "State which single category is most often wrongly assumed to be covered by the schema"
      ],
      hint: "A clause is shape if you could express it with `type`, `enum`, `format`, `required` or `additionalProperties`. Everything else is semantics or validation.",
      solution: { lang: "python", title: "g27_ex.py",
        code: `import json, tiktoken
enc = tiktoken.get_encoding("o200k_base")
def n(x): return len(enc.encode(x if isinstance(x, str) else json.dumps(x)))

CLAUSES = [
  # (text, category)
  ('Return a JSON object.',                                            "shape"),
  ('"invoice_number" is a string.',                                    "shape"),
  ('"total" is a number.',                                             "shape"),
  ('"currency" is one of GBP, USD, EUR.',                              "shape"),
  ('"issued" is a date in YYYY-MM-DD form.',                           "shape"),
  ('Include no fields other than those listed.',                       "shape"),
  ('All fields are required.',                                         "shape"),
  ('Use null for any value the document does not state.',              "semantics"),
  ('"total" is the amount payable, not the subtotal before VAT.',      "semantics"),
  ('"issued" is the invoice date, not the due date.',                  "semantics"),
  ('Do not infer a currency from the country of the address.',         "semantics"),
  ('Return only the JSON, with no explanation or markdown fence.',     "shape"),
  ('The invoice number must appear verbatim in the document.',         "validation"),
  ('"total" must equal the sum of the line items.',                    "validation"),
]

by = {}
for text, cat in CLAUSES:
    by.setdefault(cat, []).append(text)

print("%-11s %7s %7s" % ("category", "clauses", "tokens"))
for cat in ("shape", "semantics", "validation"):
    print("%-11s %7d %7d" % (cat, len(by[cat]), sum(n(t) for t in by[cat])))

prompt_total = sum(n(t) for t, _ in CLAUSES)
SCHEMA_TOKENS = 176                        # the measured schema from g25.py
survives = sum(n(t) for t in by["semantics"])

print()
print("prompt only            : %3d tokens, guarantees nothing" % prompt_total)
print("schema + semantics     : %3d tokens (%d + %d)"
      % (SCHEMA_TOKENS + survives, SCHEMA_TOKENS, survives))
print("validation clauses     : %3d tokens -> move to code entirely"
      % sum(n(t) for t in by["validation"]))
print()
print("the schema replaces %d of %d clauses (%.0f%%)"
      % (len(by["shape"]), len(CLAUSES), 100 * len(by["shape"]) / len(CLAUSES)))`,
        out: `category    clauses  tokens
shape             8      69
semantics         4      50
validation        2      23

prompt only            : 142 tokens, guarantees nothing
schema + semantics     : 226 tokens (176 + 50)
validation clauses     :  23 tokens -> move to code entirely

the schema replaces 8 of 14 clauses (57%)`,
        notes: [
          { t: "p", text: "The schema replaces eight of fourteen clauses — 57% — and costs 84 more tokens than the whole prompt did. So the migration is not a simplification and not a saving — it is buying a guarantee on half the requirements, at a price. That is worth knowing before proposing it as a cleanup." },
          { t: "p", text: "The category most often wrongly assumed covered is **semantics**, and the clause that matters most in it is `Use null for any value the document does not state`. A schema can make a field nullable; it cannot say *when* null is the right answer. Drop that clause on migration and the model starts inferring plausible values instead of admitting absence, and every one of them validates perfectly." },
          { t: "p", text: "The validation clauses are the other trap, in the opposite direction: `total must equal the sum of the line items` reads like a constraint and no JSON Schema can express it. Leaving it in the prompt is not harmless — it creates the impression the requirement is handled, which is worse than not writing it down at all. Move it to code, where it either runs or does not." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the migration to structured output that started inventing dates",
      body: [
        { t: "p", text: "**Symptom.** A document-extraction pipeline moved from a format prompt to OpenAI structured output with a Pydantic schema. Parse failures went to zero, as expected. Three weeks later, finance reported that roughly 4% of extracted invoices carried a `due_date` that did not appear anywhere in the source document." },
        { t: "p", text: "**What was removed in the migration.** The old prompt had ended with a clause nobody transferred: *\"Use null for any value the document does not state. Do not infer.\"* It had been deleted as part of \"the schema handles the format now\"." },
        { t: "p", text: "**Mechanism.** The field was typed `date | None`, so null was permitted — but nothing told the model when to use it. Asked for a due date on an invoice that did not state one, the model did what a model does with a required field and no instruction: it produced a plausible value, thirty days after the issue date. Every one of those values was a valid ISO 8601 date, satisfied the schema completely, and was wrong. The parse rate, now 100%, was measuring the one property that could not fail." },
        { t: "p", text: "**Fix.** The clause went back, in the field's `description` rather than the system prompt so it sits where the value is generated. Then the check that should have existed from the start: every extracted date is verified to appear in the source text, which is a validation no schema can perform and which caught the remaining cases immediately. The durable lesson is the one the exercise ends on — a schema covers shape, and shape was never the part that was hard." }
      ] }
  ],

  takeaways: [
    "**Show the literal output, do not describe it.** A JSON object with placeholders beats prose about the same object, for the same reason few-shot examples beat instructions.",
    "Measured: the reference's prompt-described JSON is **58 tokens**; the equivalent generated schema is **176** — 3.0× the cost, for a guarantee the prompt cannot give.",
    "Four devices make a format prompt work: show the shape, enumerate values inline, **say what to do when a value is absent**, and forbid the preamble explicitly.",
    "**A schema covers shape, not semantics.** Types, enums, formats and required-ness are enforceable; \"one sentence\", \"use null rather than guessing\" and cross-field rules are not.",
    "`description` is the highest-leverage instruction channel there is, because it sits **where the field is generated** rather than hundreds of tokens earlier.",
    "**Strip markdown fences; never repair malformed JSON.** A repaired object is an object nobody specified, and it will be wrong in a way that validates.",
    "Retry rather than repair — a failed parse is cheap to retry and, when it keeps failing, the escalation is a real signal.",
    "Structured output is unavailable in three situations: a provider without it (use a forced tool call), genuinely open-ended extraction, and output that is not JSON.",
    "**Any output with a structure you rely on deserves a post-condition**, JSON or not. It converts \"it sometimes drops a section\" into a countable failure.",
    "Measured on a realistic format prompt, a schema replaced **8 of 14 clauses** and cost 84 more tokens than the whole prompt. The migration buys a guarantee on half the requirements; it is not a simplification.",
    "The category wrongly assumed covered is **semantics** — and the clause that matters most is \"use null rather than inferring\", whose removal produces invented values that validate perfectly."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You migrate from a format prompt to a schema. Which clause must NOT be deleted?",
        options: ["\"Return a JSON object\"", "\"Use null for any value the document does not state\"", "\"currency is one of GBP, USD, EUR\"", "\"All fields are required\""],
        answer: 1,
        why: "A schema can make a field nullable but cannot say when null is the right answer, so deleting that clause leaves the model to produce a plausible value for anything the source does not state — and every such value satisfies the schema, which is exactly the incident in §04. The other three are pure shape: `type: object`, an `enum`, and `required` respectively, all enforceable and therefore genuinely redundant once the schema exists." },

      { stem: "A model returns `{\"a\": 1, \"b\":}`. What should your code do?",
        options: ["Repair it to `{\"a\": 1}` and continue", "Log the raw output and fail, then retry", "Ask the model to fix its own output", "Return an empty object"],
        answer: 1,
        why: "A repaired object is one nobody specified — `{\"a\": 1}` is indistinguishable from a response where `b` was genuinely absent, so a loud failure becomes a plausible record with a gap in it, found months later if at all. Retrying is cheap and usually succeeds, and persistent failure is a real signal about the prompt or the input. Asking the model to repair its own output adds a call and the same guessing problem. An empty object discards the failure entirely." },

      { stem: "Where is the best place to put \"ISO 4217 code, e.g. GBP\"?",
        options: ["The system prompt", "The field's `description` in the schema", "A comment in the code", "A few-shot example"],
        answer: 1,
        why: "A `description` sits adjacent to the point at which the field is generated, where it competes with nothing; the same sentence in a system prompt is several hundred tokens earlier and competing with every other instruction there. This is also why 1.8's exercise concluded `title` keys are safe to strip and descriptions are not. A code comment is invisible to the model. A few-shot example would work but costs far more tokens for one field's convention." },

      { stem: "Your parse rate goes from 94% to 100% after adopting structured output. What does that tell you about correctness?",
        options: ["Correctness improved by 6%", "Nothing — the schema guarantees the one property that can no longer fail", "Correctness is now guaranteed", "The model got better"],
        answer: 1,
        why: "Parse rate measures whether the output has the right shape, and a schema makes that structurally incapable of failing — so the metric now reads 100% regardless of whether the values are right, which is the same trap as the 99.4% parse rate in 1.8. Correctness of contents is a separate question needing range checks, cross-field consistency and referential checks against the source, none of which a schema performs. Nothing about the model changed." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The interesting version of this question is not how to get JSON — it is what you still have to do after you have it.",
    questions: [
      { level: "core",
        q: "How do you get a model to return a specific format?",
        strong: "A strong answer prefers a schema, and knows what the prompt still has to carry.",
        answer: [
          { t: "p", text: "A schema where one is available — structured output on OpenAI, a forced tool call on Anthropic, grammar-constrained decoding on a local stack. That makes the shape a guarantee rather than a request." },
          { t: "p", text: "Where it is not available, show the literal output in the prompt rather than describing it, enumerate permitted values inline, say explicitly what to do when a value is absent, and forbid the preamble and markdown fences." },
          { t: "p", text: "The part I would make sure to say is that the schema does not replace the prompt. I took a realistic extraction prompt apart once: the schema covered eight of fourteen clauses and cost 84 more tokens than the whole prompt had. Everything about what the fields *mean* survives, and the most important survivor is \"use null rather than inferring\"." }
        ] },

      { level: "core",
        q: "The model returns malformed JSON. What does your code do?",
        strong: "Strip wrappers, never repair, retry. A strong answer explains why repair is worse than failure.",
        answer: [
          { t: "p", text: "Strip markdown fences, because that is removing a wrapper the model added and the content underneath is unchanged. Then parse, and if it fails, log the raw output and raise." },
          { t: "p", text: "Not repair. Repair libraries are good, and that is the problem — they will turn a truncated object into one that validates, and you get a record with a plausible gap that is indistinguishable from a genuine absence. A loud failure has become a quiet wrong answer, which is the more expensive kind." },
          { t: "p", text: "Retry instead. A failed parse is cheap to retry and usually succeeds; persistent failure is a real signal about the prompt or that particular input, and it is worth surfacing rather than smoothing over." }
        ] },

      { level: "advanced",
        q: "After migrating to structured output your parse rate is 100% and a customer reports wrong data. How is that possible?",
        strong: "A strong answer separates shape from contents immediately, and identifies what gets deleted in a migration.",
        answer: [
          { t: "p", text: "Because parse rate measures shape, and a schema makes shape structurally incapable of failing. The metric now reads 100% whether or not the values are right, so it has stopped carrying information — the same trap as a `str`-typed date field where every date is a valid string." },
          { t: "p", text: "The specific thing I would look for is what got deleted in the migration. The clause that usually goes is \"use null for anything the document does not state, do not infer\", removed because \"the schema handles the format now\". A schema can make a field nullable; it cannot say when null is correct. So the model produces a plausible value for anything absent, and every one of them validates." },
          { t: "p", text: "I have seen exactly that produce invented due dates on 4% of invoices — thirty days after the issue date, perfectly formatted, nowhere in the source." },
          { t: "p", text: "The fix is the clause back in the field's `description`, plus the check no schema can do: verify every extracted value appears in the source text. Shape was never the part that was hard." }
        ] }
    ]
  }
});
