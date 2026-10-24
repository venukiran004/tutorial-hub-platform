/* ============================================================================
   LESSON 2.2 — The Tool Contract: What Reaches the Model
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**A tool is only as good as its schema, and the schema is generated — so the question is how much of your intent survives the generation.** The answer is measurable and surprising: a careful Google-style docstring contributes *nothing* to the schema, a `Field` description contributes everything, and only a typed return value produces an `outputSchema` at all. This lesson is that measurement, three ways on the same function.",

  objectives: [
    "Say exactly what a docstring contributes and what it does not",
    "Carry descriptions, enums and constraints into the schema with Annotated and Field",
    "Produce an outputSchema and structuredContent with a typed return",
    "Write a tool description that a model can route on",
    "Choose argument names and types that reduce the model's chance of error"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "The same function, three ways", id: "three-ways" },

    {"kind": "compare", "title": "Three ways to write the same tool", "caption": "**Nothing about the Python logic differs between these — only how the contract is expressed**, and the three measurements that follow are strikingly different. The thing to notice before reading them: the first style is what a careful Python developer reaches for, and it is the one that contributes least.", "columns": [{"title": "A Google-style docstring", "tone": "crit", "items": ["Args: block documenting each parameter", "Reads well in an editor", "Feels like careful documentation", "Measured: 0 of 3 descriptions in the schema"]}, {"title": "Annotated with Field", "tone": "good", "items": ["description= on every parameter", "gt, min_length, pattern", "Literal for a closed set", "Measured: 3 of 3, plus every constraint"]}, {"title": "A Pydantic return type", "tone": "violet", "items": ["A BaseModel with described fields", "The only route to an outputSchema", "Populates structuredContent", "Measured: a full output contract"]}], "t": "diagram", "id": "dg-2_2-01-0"},


    { t: "p", text: "Here are three versions of a currency conversion tool, written the three ways people actually write them. Nothing about the Python logic differs — only how the contract is expressed." },

    { t: "code", lang: "python", title: "three styles, one server",
      code: `from typing import Annotated, Literal
from pydantic import BaseModel, Field
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("schemas")

# 1. The Google-style docstring, which is how most Python is documented.
@mcp.tool()
def plain(amount: float, frm: str, to: str) -> dict:
    """Converts an amount.

    Args:
        amount: the amount to convert.
        frm: the ISO 4217 code to convert from.
        to: the ISO 4217 code to convert to.
    """
    return {"ok": True}

# 2. Annotated parameters with Pydantic Field metadata.
@mcp.tool()
def annotated(
    amount: Annotated[float, Field(description="The amount to convert, greater than zero", gt=0)],
    frm: Annotated[str, Field(description="ISO 4217 code, uppercase", min_length=3, max_length=3)],
    to: Annotated[str, Field(description="ISO 4217 code, uppercase", min_length=3, max_length=3)],
    rounding: Annotated[Literal["up", "down", "nearest"], Field(description="How to round")] = "nearest",
) -> dict:
    """Converts an amount between two currencies."""
    return {"ok": True}

# 3. A typed return value.
class Conversion(BaseModel):
    """The result of a currency conversion."""
    amount: float = Field(description="The converted amount")
    currency: str = Field(description="The ISO 4217 code of the result")
    rate: float = Field(description="The rate applied")

@mcp.tool()
def typed_result(amount: float, frm: str, to: str) -> Conversion:
    """Converts an amount and returns a typed result."""
    return Conversion(amount=amount * 1.17, currency=to.upper(), rate=1.17)`,
      caption: "A client then lists the tools and prints each one's `description`, `inputSchema` and `outputSchema`. The results are in the next three sections, and the first one is the one worth being annoyed about." },

    { t: "h2", n: "02", text: "What a docstring contributes", id: "docstring" },

    {"kind": "trace", "title": "The Args block is not parsed - zero of three", "caption": "**This is the most consequential measurement in the module, because the docstring convention produces the worst of both outcomes.** The per-parameter text is dumped into the tool's description as unstructured prose, where it bloats the text the model reads about *when to use the tool* — and the schema, the part a provider can enforce and a client can validate, stays empty of it. Some frameworks do parse Google-style `Args`, which is why people assume this one does; against the installed SDK it does not.", "left": "what you wrote", "codeW": 200, "vars": ["where it went"], "steps": [{"code": "'Converts an amount.'", "state": ["the description - correct"], "tone": "good"}, {"code": "Args: amount: the amount to convert.", "state": ["the description, verbatim, with indentation"], "changed": [0], "tone": "crit"}, {"code": "Args: frm: the ISO 4217 code...", "state": ["the description, verbatim"], "changed": [0], "tone": "crit"}, {"code": "Args: to: the ISO 4217 code...", "state": ["the description, verbatim"], "changed": [0], "tone": "crit"}, {"code": "the schema's properties", "state": ["title and type ONLY - 0 of 3 described"], "changed": [0], "tone": "crit"}, {"code": "outputSchema", "state": ["None - the return is a plain dict"], "changed": [0], "tone": "warn"}], "t": "diagram", "id": "dg-2_2-02-1"},


    { t: "code", lang: "python", title: "the plain version, as the model receives it",
      code: `for t in (await session.list_tools()).tools:
    print(t.name, "->", repr(t.description))
    print("  schema:", json.dumps(t.inputSchema))
    print("  output:", t.outputSchema)`,
      out: `plain -> 'Converts an amount.\\n\\n    Args:\\n        amount: the amount to convert.\\n
            frm: the ISO 4217 code to convert from.\\n        to: the ISO 4217 code to convert to.\\n    '
  schema: {"properties": {"amount": {"title": "Amount", "type": "number"},
                          "frm":    {"title": "Frm",    "type": "string"},
                          "to":     {"title": "To",     "type": "string"}},
           "required": ["amount", "frm", "to"],
           "title": "plainArguments", "type": "object"}
  output: None`,
      caption: "**The entire docstring — `Args:` block, indentation and all — became the description, verbatim.** And the schema's properties carry a title and a type and nothing else: not one of the three parameter descriptions you wrote appears in the schema at all." },

    { t: "callout", kind: "trap", title: "The Args block is not parsed",
      body: [
        { t: "p", text: "This is the single most consequential thing in the lesson, because the docstring convention is exactly what a careful Python developer reaches for and it produces the worst of both outcomes. **The per-parameter documentation is dumped into the tool's description as unstructured prose**, where it bloats the text the model reads about *when to use the tool*, and **the schema — the part a provider can enforce and a client can validate — stays empty of it.**" },
        { t: "p", text: "Some frameworks do parse Google-style `Args` into parameter descriptions, which is why people assume this one does. Measured against the installed SDK, it does not. Check it for yourself on your own version before trusting a docstring to carry a contract; the check is three lines and the output above is what to compare against." }
      ] },

    { t: "h2", n: "03", text: "What Annotated and Field contribute", id: "annotated" },

    {"kind": "trace", "title": "Every description and every constraint crossed into the schema", "caption": "**`Literal` becoming a real `enum` is the strongest row**, because it removes a class of error rather than reporting it — the model is told the three permitted values instead of guessing them. And note the second benefit, easy to miss: the description became one clean sentence, because the per-parameter detail moved to where it belongs. **The tool's description is now about when to call it**, which is the question the model uses it to answer.", "left": "what you wrote", "codeW": 200, "vars": ["what the schema got"], "steps": [{"code": "Field(description='The amount to convert...')", "state": ["description - all 3 of 3 arrived"], "tone": "good"}, {"code": "gt=0", "state": ["exclusiveMinimum: 0"], "changed": [0], "tone": "good"}, {"code": "min_length=3, max_length=3", "state": ["minLength: 3, maxLength: 3"], "changed": [0], "tone": "good"}, {"code": "Literal['up', 'down', 'nearest']", "state": ["enum: [up, down, nearest] - a real constraint"], "changed": [0], "tone": "violet"}, {"code": "= 'nearest'", "state": ["default set, and absent from required"], "changed": [0], "tone": "accent"}, {"code": "the docstring", "state": ["one clean sentence - about WHEN to call"], "changed": [0], "tone": "good"}], "t": "diagram", "id": "dg-2_2-03-2"},


    { t: "code", lang: "python", title: "the annotated version",
      code: `annotated -> 'Converts an amount between two currencies.'`,
      out: `  schema: {"properties": {
             "amount":   {"description": "The amount to convert, greater than zero",
                          "exclusiveMinimum": 0, "title": "Amount", "type": "number"},
             "frm":      {"description": "ISO 4217 code, uppercase",
                          "maxLength": 3, "minLength": 3, "title": "Frm", "type": "string"},
             "to":       {"description": "ISO 4217 code, uppercase",
                          "maxLength": 3, "minLength": 3, "title": "To", "type": "string"},
             "rounding": {"default": "nearest", "description": "How to round",
                          "enum": ["up", "down", "nearest"], "title": "Rounding", "type": "string"}},
           "required": ["amount", "frm", "to"],
           "title": "annotatedArguments", "type": "object"}
  output: None`,
      caption: "**Every description arrived, and so did every constraint.** `gt=0` became `exclusiveMinimum`, the length bounds became `minLength` and `maxLength`, and `Literal` became a real `enum` — which means the model is told the three permitted values rather than asked to guess them. Note also that `rounding` has a default and is therefore absent from `required`." },

    { t: "p", text: "The description also became one clean sentence, because the per-parameter detail moved to where it belongs. **That is the second benefit and it is easy to miss:** the tool's description is now about *when to call this tool*, which is the question the model uses it to answer, rather than a mixture of that and the argument documentation." },

    { t: "dl", items: [
      ["`description`", "The single highest-value field. A parameter whose meaning is obvious to you is not obvious to a model choosing between eleven tools."],
      ["`Literal[...]` becoming `enum`", "The strongest constraint available, because it removes a whole class of error rather than reporting it. Any argument your code branches on should be a `Literal`."],
      ["Numeric and length bounds", "`gt`, `ge`, `lt`, `le`, `min_length`, `max_length` all cross into the schema, so the provider and the client can both reject a bad value before your function runs."],
      ["`pattern`", "A regex constraint, which crosses as `pattern`. Useful for codes and identifiers with a known shape, and better than validating in the body and returning an error."],
      ["A default", "Removes the parameter from `required`, which tells the model it may omit it. An argument with a sensible default and no default declared is one the model must invent a value for."]
    ] },

    { t: "h2", n: "04", text: "What a typed return contributes", id: "typed" },

    {"kind": "flow", "title": "Only a typed return produces an output contract", "caption": "**Both earlier versions returned `dict` and both reported `outputSchema: None`.** A Pydantic return type produces the schema *and* populates `structuredContent` with a parsed object beside the text — so a consumer reads `amount` as a number rather than parsing a JSON string and hoping the shape is what it was last time. **That matters most precisely when you cannot see your consumers**, which is the normal condition for a published server.", "cols": 3, "nodes": [{"id": "d", "label": "return a dict", "sub": "text block only", "tone": "warn"}, {"id": "n", "label": "outputSchema: None", "sub": "nothing declared in advance", "tone": "crit"}, {"id": "m", "label": "return a BaseModel", "sub": "fields with descriptions", "tone": "violet"}, {"id": "s", "label": "outputSchema published", "sub": "before any call is made", "tone": "good"}, {"id": "c", "label": "structuredContent populated", "sub": "{'amount': 117.0, 'currency': 'EUR'}", "tone": "good"}, {"id": "v", "label": "Consumers can generate types and validate", "sub": "and fail loudly when you change it", "tone": "violet"}], "edges": [["d", "n"], ["m", "s"], ["m", "c"], ["s", "v"], ["c", "v"]], "t": "diagram", "id": "dg-2_2-04-3"},


    { t: "p", text: "Both versions above returned `dict`, and both reported `output: None`. That is the third measurement." },

    { t: "code", lang: "python", title: "the typed version, and what the call returns",
      code: `typed_result -> 'Converts an amount and returns a typed result.'`,
      out: `  output: {"description": "The result of a currency conversion.",
           "properties": {"amount":   {"description": "The converted amount", "type": "number"},
                          "currency": {"description": "The ISO 4217 code of the result", "type": "string"},
                          "rate":     {"description": "The rate applied", "type": "number"}},
           "required": ["amount", "currency", "rate"],
           "title": "Conversion", "type": "object"}

# and calling it:
structuredContent : {'amount': 117.0, 'currency': 'EUR', 'rate': 1.17}
content[0].text   : '{\\n  "amount": 117.0,\\n  "currency": "EUR",\\n  "rate": 1.17\\n}'`,
      caption: "**A Pydantic return type is the only one of the three that produces an `outputSchema`, and it also populates `structuredContent`** — a parsed object beside the text, rather than a JSON string the client has to parse and hope about. Returning a plain `dict` gives you the text and nothing else." },

    { t: "callout", kind: "good", title: "Why structuredContent is worth the model class",
      body: [
        { t: "p", text: "Without it, a client that wants the `amount` field has to `json.loads` the text block and trust that the shape is what it was last time. With it, the shape is declared in the `outputSchema` before any call is made, so a consumer can generate types from your tool, validate the response, and fail loudly if you change it." },
        { t: "p", text: "That is most valuable precisely when you cannot see your consumers — which is the normal condition for a published server (lesson 4.4). **One `BaseModel` per tool is a small price for an interface other people can hold you to.**" }
      ] },

    { t: "h2", n: "05", text: "The description is the routing information", id: "description" },

    {"kind": "trace", "title": "The description decides whether the tool is chosen at all", "caption": "**A model picking between a dozen tools reads a dozen descriptions, and that is all it has.** So the description should answer *when would I call this rather than something else* — the schema already covers what it does. **The boundary clause is the underused half:** “Not other users” prevents a wrong call, where a longer positive description merely competes with ten others. And a model cannot infer that a delete is permanent, so if a tool cannot be undone, this is the only place it learns that before calling.", "left": "weak", "codeW": 160, "vars": ["better", "what the fix adds"], "steps": [{"code": "'Searches.'", "state": ["'Searches HR policy documents, current to 2026.'", "which corpus, how current"], "tone": "crit"}, {"code": "'Gets user data.'", "state": ["'...the caller's own profile. Not other users.'", "whose, and the boundary"], "changed": [0, 1], "tone": "crit"}, {"code": "'Converts currency.'", "state": ["'...at ECB daily rates. Not for trading.'", "the source, and a forbidden use"], "changed": [0, 1], "tone": "warn"}, {"code": "'Deletes a record.'", "state": ["'Permanently deletes. Cannot be undone.'", "irreversibility - unguessable"], "changed": [0, 1], "tone": "violet"}, {"code": "'search' and 'search_v2'", "state": ["'search_policies' and 'search_tickets'", "names disambiguate before words"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-2_2-05-4"},


    { t: "p", text: "Everything above is about the arguments. **The description decides something earlier and more important: whether the tool is chosen at all.** A model picking between a dozen tools reads a dozen descriptions, and that is all it has." },

    { t: "table",
      head: ["Weak", "Better", "Why"],
      rows: [
        ["`Searches.`", "`Searches the company's HR policy documents, current to 2026.`", "Says which corpus and how current — a model with three search tools can now choose"],
        ["`Gets user data.`", "`Returns the authenticated caller's profile: name, team and notification settings. Not other users.`", "Says whose, what fields, and the boundary"],
        ["`Converts currency.`", "`Converts between currencies at ECB daily reference rates. Not suitable for trading decisions.`", "Names the rate source and a use it must not be put to"],
        ["`Deletes a record.`", "`Permanently deletes an order. Cannot be undone; requires the order to be unshipped.`", "States irreversibility and the precondition, so the model can ask first"]
      ] },

    { t: "dl", items: [
      ["Say what it is for, not what it does", "The model has the schema for what it does. The description should answer *when would I call this rather than something else*."],
      ["Name the boundary", "What the tool does not cover is as useful as what it does, because it stops a wrong call rather than reporting one. *“Not other users”* is doing real work."],
      ["State irreversibility explicitly", "A model cannot infer that `delete_order` is permanent. If a tool cannot be undone, the description is the only place a model learns that before calling it."],
      ["Keep it short and factual", "Every description is in every request. A paragraph of marketing per tool across twelve tools is a measurable cost on every turn for no gain."],
      ["Write names that disambiguate", "`search_policies` and `search_tickets` are chosen correctly far more often than `search` and `search_v2`, before a single word of description is read."]
    ] },

    { t: "callout", kind: "insight", title: "Your schema is prompt, and that cuts both ways",
      body: [
        { t: "p", text: "Everything in this lesson — the tool name, the description, every parameter description, every enum value — is serialised and sent to the model as part of the request. **So writing a good schema is prompt engineering with a type checker attached**, which is the best version of prompt engineering available: the rules sit next to the field they govern and cannot drift from it." },
        { t: "p", text: "The other edge is cost and attack surface. Twelve verbose tools are tokens on every turn, and because this text enters a model's context, a server's schema is an injection surface for whoever consumes it (lesson 4.1). Write it as you would write a public API contract, because that is what it is." }
      ] },

    { t: "exercise", kind: "practice", title: "Measure your own tools", difficulty: "core", minutes: 28,
      prompt: "Take a tool you have written with a Google-style docstring. Print its inputSchema from a client and count how many parameters carry a description — expect zero. Then convert it to Annotated with Field, add a Literal for anything your code branches on, and bounds for anything numeric, and print the schema again. Give it a Pydantic return type and confirm an outputSchema appears and structuredContent is populated. Finally, rewrite the description to answer 'when would I call this rather than something else' and count the tokens before and after.",
      hints: [
        "json.dumps the inputSchema and look for the word description.",
        "A Literal with three options should appear as an enum in the schema.",
        "The token count matters because every description is in every request."
      ],
      solution: {
        notes: [
          { t: "p", text: "The zero is the finding. People generally believe their docstrings are doing something, and the measurement is what changes the habit — nothing else does, because the docstring version looks careful and reads well in the editor." },
          { t: "p", text: "The `Literal` conversion is the highest-value single change, because an enum removes a class of error instead of reporting it. If your code has an `if value == … elif … else: raise`, that is a `Literal` waiting to be written, and the provider will enforce it for you." },
          { t: "p", text: "The token count usually goes *down* while the schema gets richer, because the `Args` block leaves the description and the per-parameter text moves into fields that were previously empty. That is the pleasant version of this change: a better contract that is also cheaper per request." }
        ]
      } }

  ],

  takeaways: [
    "**A Google-style `Args:` block is not parsed.** The whole docstring becomes the description verbatim, and the schema's parameters carry a title and a type and nothing else — measured as zero of three descriptions.",
    "**`Annotated[T, Field(description=...)]` is how a parameter gets documented**, and it is the single highest-value change you can make to a tool.",
    "**Constraints cross into the schema:** `gt=0` becomes `exclusiveMinimum`, length bounds become `minLength`/`maxLength`, and `pattern` becomes a regex the provider can enforce.",
    "**`Literal[...]` becomes a real `enum`**, which removes a class of error rather than reporting it. Anything your code branches on should be one.",
    "**A default removes a parameter from `required`**, which tells the model it may omit it — otherwise the model must invent a value.",
    "**Only a typed return produces an `outputSchema`**, and it also populates `structuredContent`: a parsed object beside the text rather than a JSON string the consumer must parse and hope about.",
    "**Returning a plain `dict` gives you text and nothing else** — no output schema, no structured content.",
    "**The description decides whether the tool is chosen at all**, so it should answer *when would I call this rather than something else*, not repeat what the schema says.",
    "**Name the boundary and state irreversibility.** *\"Not other users\"* prevents a wrong call; a model cannot infer that a delete is permanent.",
    "**Tool names disambiguate before descriptions are read** — `search_policies` and `search_tickets` beat `search` and `search_v2`.",
    "**The schema is prompt with a type checker attached**, which makes it the best place for the rules — and also a cost on every request and an injection surface for your consumers."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A tool documents its three parameters in a Google-style `Args:` block. How many parameter descriptions appear in the generated inputSchema?",
        options: [
          "All three",
          "None — the whole docstring becomes the tool description verbatim, and the schema properties carry only a title and a type",
          "Only the first",
          "All three, but without types"
        ],
        answer: 1,
        why: "Measured as zero of three against the installed SDK. It is the worst of both outcomes: the per-parameter text bloats the description the model reads about when to use the tool, and the schema — the part that can be enforced and validated — stays empty of it."
      },
      {
        stem: "Which change puts an `enum` into a tool's schema?",
        options: [
          "Listing the options in the docstring",
          "Annotating the parameter as `Literal[\"up\", \"down\", \"nearest\"]`",
          "Adding a `pattern` constraint",
          "Returning a Pydantic model"
        ],
        answer: 1,
        why: "`Literal` becomes a real enum, so the model is told the permitted values rather than asked to guess them, and the provider can reject anything else. Options listed in prose are a suggestion; an enum is a constraint."
      },
      {
        stem: "A tool returns a plain `dict`. What is missing compared with returning a Pydantic model?",
        options: [
          "Nothing — both serialise to the same JSON",
          "The `outputSchema` and `structuredContent`: consumers get a JSON string to parse rather than a declared shape and a parsed object",
          "The input schema",
          "The tool description"
        ],
        answer: 1,
        why: "Both were measured as `output: None` with a dict return, and the typed version produced a full outputSchema plus `structuredContent` of `{'amount': 117.0, ...}`. The schema matters most when you cannot see your consumers, which is the normal condition for a published server."
      },
      {
        stem: "What should a tool description say that the schema cannot?",
        options: [
          "The parameter types",
          "When to call this tool rather than another one — the corpus it covers, the boundary it does not, and whether it can be undone",
          "The return value's field names",
          "The tool's implementation language"
        ],
        answer: 1,
        why: "The schema already carries types, names and constraints. The description is the model's entire routing information, and the things it cannot infer — that a delete is permanent, that a search covers policies and not tickets — only exist if you write them."
      },
      {
        stem: "Why does moving parameter documentation out of the docstring often reduce tokens per request?",
        options: [
          "Because schemas are compressed",
          "The `Args:` block leaves the description, and the per-parameter text moves into schema fields that were previously empty — so the contract gets richer while the prose gets shorter",
          "Because descriptions are only sent once per session",
          "It does not; it always costs more"
        ],
        answer: 1,
        why: "It is the pleasant case: a better contract that is also cheaper. The cost that remains worth watching is total tool count, since every description of every tool is in every request."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you write a good MCP tool?",
        strong: "Put the contract in the schema, not the docstring. Annotated with Field for every parameter description, Literal for anything the code branches on so it becomes an enum, bounds for numerics, and a Pydantic return type so there is an outputSchema and structuredContent. Then the description answers when to call this rather than something else — the corpus, the boundary, whether it is reversible — because that is the model's only routing information.",
        answer: [
          { t: "p", text: "Knowing that the Args block contributes nothing to the schema is the fact that separates measured experience from assumption, and it is worth stating as a measurement." },
          { t: "p", text: "The Literal point is the strongest single piece of advice: an enum removes a class of error instead of reporting it, and most tools have at least one argument that should be one." },
          { t: "p", text: "A strong finish notes that all of this text is sent to the model on every request, which makes it prompt engineering with a type checker attached — and a cost worth keeping short." }
        ]
      },
      {
        level: "mid",
        q: "Why would you return a Pydantic model from a tool rather than a dict?",
        strong: "A dict gives the client a JSON string and nothing else. A model produces an outputSchema advertised before any call and populates structuredContent with a parsed object, so a consumer can generate types, validate the response and fail loudly if the shape changes. That matters most when you cannot see who is consuming you, which is the normal case for a published server.",
        answer: [
          { t: "p", text: "The measured contrast is the evidence: `output: None` for the dict version against a full schema and `structuredContent` for the typed one." },
          { t: "p", text: "Framing it as an interface other people can hold you to connects it to versioning: the output schema is the thing that makes a breaking change visible rather than something a consumer discovers at runtime." }
        ]
      },
      {
        level: "advanced",
        q: "An agent with eleven tools from three servers keeps calling the wrong one. What do you change?",
        strong: "The names and descriptions first, because that is the routing information. Disambiguating names — search_policies against search_tickets rather than search and search_v2 — then descriptions that say which corpus each covers and what it does not. Then I would reduce the tool count, since accuracy falls as the declaration list grows, which means filtering each server to the tools the agent actually needs.",
        answer: [
          { t: "p", text: "Going to names and descriptions before anything cleverer is correct and is also the cheapest fix available." },
          { t: "p", text: "The boundary clause is the underused half: saying what a tool does not cover prevents a wrong call, where a longer positive description merely competes with ten others." },
          { t: "p", text: "Reaching for tool-count reduction shows the system-level view — and it has a second benefit, since filtering a third-party server to an allow-list is also the security control in lesson 4.1." }
        ]
      }
    ]
  }
});
