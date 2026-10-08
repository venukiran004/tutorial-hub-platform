EC.receiveLesson({
  id: "1.5",

  lede: "`with_structured_output(Schema)` is the right default, and it is not the safe default people assume. It genuinely removes the text-parsing step \u2014 your schema is bound as a tool, the model calls it, the arguments come back and Pydantic validates them, so a rating of 48.8 raises a `ValidationError` instead of becoming your data. But a structured-output call has **three outcomes, not two**. When the model answers in prose instead of calling the tool, it returns **`None`** \u2014 no exception, and `include_raw=True` reports `parsed=None` alongside `parsing_error=None`, because nothing failed to parse: nothing was offered to the parser. The guard is to check for `None` explicitly, and almost no code does.",

  objectives: [
    "Explain how a schema becomes a tool and why that removes the parse step",
    "Show that Field constraints are enforced rather than suggested",
    "Name the third outcome of a structured-output call and why it is silent",
    "Distinguish the three mechanisms a provider might use underneath",
    "Use Literal and Optional to communicate a constraint and enforce it"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", id: "happy", text: "The schema becomes a tool",
      sub: "Which is why there is nothing to parse" },

    { t: "p", text: "`with_structured_output` does not ask the model for JSON and then parse it. It binds your schema as a **tool definition**, the model emits a tool call, and the call's arguments are validated into your type. The model's text output is empty; the data arrives in a structured field that was never a string." },

    { t: "code", lang: "python", title: "A typed object back",
      code: 'from pydantic import BaseModel, Field\n\nclass MovieReview(BaseModel):\n    """A structured movie review."""\n    title: str = Field(description="Movie title")\n    rating: float = Field(ge=1, le=10, description="Rating out of 10")\n    recommended: bool\n\nout = model.with_structured_output(MovieReview).invoke("Review the movie Inception")\nprint(out)\nprint(type(out).__name__)\nprint(out.title, out.rating, out.recommended)',
      out: 'title=\'Inception\' rating=8.8 recommended=True\nMovieReview\nInception 8.8 True',
      caption: "The docstring and every Field description are sent to the model as part of the tool schema." },

    { t: "callout", kind: "good", title: "The descriptions are prompt, so write them as prompt",
      body: [
        { t: "p", text: "The class docstring and each `Field(description=...)` become the tool's description and parameter docs, which the model reads. They are not documentation for your colleagues; they are the instruction that decides whether `rating` comes back out of ten or out of five." },
        { t: "p", text: "This is a pleasant consequence of the design: the schema and the prompt stop being two things that can drift apart, because the schema **is** part of the prompt. 1.4's warning about parsers and format instructions travelling together does not apply here, since there is only one artefact." }
      ] },

    { t: "h2", n: "02", id: "validation", text: "Constraints are enforced",
      sub: "Not suggested, which is what putting them in the prompt does" },

    { t: "code", lang: "text", title: "Four malformed tool calls",
      code: 'rating above le=10       -> ValidationError (rating)\nrating not a number      -> ValidationError (rating)\nrating missing           -> ValidationError (rating)\nrecommended missing      -> ValidationError (recommended)',
      caption: "A model returning 48.8 does not quietly become your data." },

    { t: "p", text: "That is the argument for putting constraints in `Field()` rather than in prompt text. \u201cRate out of ten\u201d in a system message is a request. `Field(ge=1, le=10)` is both a request \u2014 it is in the schema the model sees \u2014 and a guarantee, because the value is checked before it reaches you." },

    { t: "h2", n: "03", id: "none", text: "The third outcome",
      sub: "The one nobody writes a branch for" },

    { t: "p", text: "Everything above assumes the model called the tool. It may not. Models decline for ordinary reasons: the request was ambiguous, it decided a refusal was appropriate, the input did not contain a movie to review. When that happens, there is no tool call to read." },

    { t: "code", lang: "python", title: "What a prose answer returns",
      code: '# the model answers in prose instead of calling the tool\nr = model.with_structured_output(MovieReview).invoke("Review Inception")\nprint(repr(r))                     # None\nprint(type(r).__name__)            # NoneType\n\n# and with the diagnostic channel turned on:\nr = model.with_structured_output(MovieReview, include_raw=True).invoke("x")\nfor k in ("raw", "parsed", "parsing_error"):\n    print(k, repr(r[k])[:50])',
      out: 'None\nNoneType\n\nraw            AIMessage(content="I\'d give Inception about 8.8 out of\nparsed         None\nparsing_error  None',
      hl: [2, 3, 4],
      caption: "parsed is None and parsing_error is None. Both are accurate, and the combination is the problem." },

    { t: "callout", kind: "warn", title: "parsed=None, parsing_error=None",
      body: [
        { t: "p", text: "The library is telling the truth. Nothing failed to parse because nothing was offered to the parser \u2014 the model produced prose, which is a legitimate thing for it to do. So `parsing_error` is correctly empty, and the net effect is a `None` travelling into your pipeline with no signal attached to it." },
        { t: "p", text: "A structured-output call has three outcomes: a valid object, a `ValidationError`, and `None`. Code that handles the first two and not the third is the common case, and the symptom is an `AttributeError` on `NoneType` somewhere downstream, well away from the cause." }
      ] },

    { t: "ladder", title: "Handling a structured-output call, worst to best",
      rungs: [
        { level: "bad", label: "Use the result directly",
          why: "Works until the model declines once. Then a None propagates and something far away raises AttributeError on NoneType, which is a traceback that points nowhere useful.",
          code: "review = model.with_structured_output(MovieReview).invoke(text)\nsave(review.title, review.rating)",
          note: "The overwhelmingly common form, and it is one declined call from an incident." },
        { level: "ok", label: "Check for None",
          why: "The minimum. Catches the third outcome and lets you decide what it means \u2014 which is usually not an error, because the model declining is often the correct behaviour.",
          code: "review = model.with_structured_output(MovieReview).invoke(text)\nif review is None:\n    return no_review_found()",
          note: "One branch, and it removes the entire class of NoneType failures." },
        { level: "ok", label: "include_raw, and keep the raw message",
          why: "Gives you what the model actually said, which is what you need to decide whether this was a refusal, an ambiguity or a bug. Without it you know only that nothing came back.",
          code: "r = model.with_structured_output(MovieReview, include_raw=True).invoke(text)\nif r[\"parsed\"] is None:\n    log.info(\"no structured output\", extra={\"said\": r[\"raw\"].content})",
          note: "The raw content usually explains it in one sentence." },
        { level: "best", label: "Make declining a representable answer",
          why: "If the model has a legitimate reason not to produce a review, give the schema a way to say so. Then a refusal is a valid object you can branch on rather than an absence, and None genuinely means something went wrong.",
          code: "class ReviewResult(BaseModel):\n    found: bool\n    review: Optional[MovieReview] = None\n    reason: Optional[str] = None",
          note: "Turns three outcomes back into two, which is why it is the best rung." }
      ] },

    { t: "h2", n: "04", id: "mechanisms", text: "Three mechanisms, one line of code",
      sub: "And the guarantee changes when you change provider" },

    { t: "table",
      head: ["Mechanism", "How", "What it guarantees"],
      rows: [
        ["tool calling", "schema bound as a tool, arguments read back", "strongest; needs a tool-calling model"],
        ["JSON mode", "provider constrains output to valid JSON", "valid JSON, but not necessarily *your* schema"],
        ["prompt and parse", "format instructions in the prompt, text parsed", "works anywhere; weakest, and 1.4 applies"]
      ] },

    { t: "callout", kind: "tradeoff", title: "The same call, a different guarantee",
      body: [
        { t: "p", text: "`with_structured_output` picks the strongest mechanism the model supports. That is good engineering and it has a consequence worth naming: **the same line of code gives a different guarantee on a different model**, and nothing in your source changes when you swap." },
        { t: "p", text: "A provider migration that moves you from tool calling to prompt-and-parse will show up as a rising rate of `None` and `ValidationError`, not as a code change. That is a thing to measure before and after a swap rather than discover from a dashboard three weeks later." }
      ] },

    { t: "h2", n: "05", id: "schemas", text: "Literal and Optional",
      sub: "Communicating a constraint and enforcing it with one declaration" },

    { t: "code", lang: "python", title: "A classification schema",
      code: 'from typing import Literal, Optional, List\n\nclass Sentiment(BaseModel):\n    """Classification with a confidence."""\n    sentiment: Literal["positive", "negative", "neutral"]\n    confidence: float = Field(ge=0, le=1)\n    evidence: Optional[List[str]] = Field(default=None, description="supporting quotes")',
      out: 'valid, with evidence       -> sentiment=\'positive\' confidence=0.91 evidence=[\'loved it\', \'best this year\']\nvalid, evidence omitted    -> sentiment=\'positive\' confidence=0.91 evidence=None\nsentiment off the Literal  -> ValidationError',
      caption: "A Literal becomes an enum in the schema the model is shown, and a constraint Pydantic checks." },

    { t: "p", text: "A `Literal` does two jobs from one declaration: it appears as an enum in the tool schema, so the model is **told** the allowed values, and it is enforced on the way back, so a model that invents a fourth category raises rather than widening your data. Writing \u201canswer positive, negative or neutral\u201d in the prompt does only the first job, and does it less reliably." },

    { t: "exercise", kind: "build", title: "Find the third outcome",
      difficulty: "core", minutes: 28,
      body: "Build a Pydantic schema with a constrained numeric field and use it with structured output. Confirm the happy path returns a typed object. Then feed four malformed tool calls and confirm validation fires on each. Then make the model answer in prose instead of calling the tool, and report exactly what comes back — including what include_raw says about it. Finally, show a Literal field being communicated and enforced.",
      requirements: [
        "Define a schema with a docstring, Field descriptions and a ge/le constrained float",
        "Script a tool call and confirm a typed object is returned",
        "Test four invalid tool calls: out of range, wrong type, and two missing fields",
        "Script a prose response and report the return value and its type",
        "Report raw, parsed and parsing_error from include_raw on that same prose response",
        "Show a Literal field accepting valid values and rejecting one off the list"
      ],
      hint: "A scripted tool call is an AIMessage with empty content and a tool_calls entry whose name matches the schema class. The prose case is the point of the exercise — note what parsing_error says.",
      solution: { lang: "python", title: "x0105.py \u2014 three outcomes, not two",
        code: 'from typing import Literal, Optional, List\nfrom pydantic import BaseModel, Field\nfrom langchain_core.messages import AIMessage\nfrom fake import FakeChatModel\n\nclass MovieReview(BaseModel):\n    """A structured movie review."""\n    title: str = Field(description="Movie title")\n    rating: float = Field(ge=1, le=10, description="Rating out of 10")\n    recommended: bool\n\ndef tool_call(args, name="MovieReview"):\n    """What a provider returns when it uses the schema as a tool."""\n    return AIMessage(content="", tool_calls=[{"name": name, "args": args, "id": "c1"}])\n\n# happy path\nm = FakeChatModel(script=[tool_call({"title": "Inception", "rating": 8.8,\n                                     "recommended": True})])\nprint(m.with_structured_output(MovieReview).invoke("Review Inception"))\n\n# validation\nfor args in ({"title": "x", "rating": 48.8, "recommended": True},\n             {"title": "x", "rating": "eight", "recommended": True},\n             {"title": "x", "recommended": True},\n             {"title": "x", "rating": 8.8}):\n    mm = FakeChatModel(script=[tool_call(args)])\n    try:    mm.with_structured_output(MovieReview).invoke("x")\n    except Exception as e: print(type(e).__name__)\n\n# the third outcome\nm3 = FakeChatModel(script=["I\'d give Inception about 8.8 out of 10."])\nprint(repr(m3.with_structured_output(MovieReview).invoke("x")))\n\nm4 = FakeChatModel(script=["I\'d give Inception about 8.8 out of 10."])\nr4 = m4.with_structured_output(MovieReview, include_raw=True).invoke("x")\nfor k in ("raw", "parsed", "parsing_error"):\n    print(k, repr(r4[k])[:58])',
        out: '==============================================================================\nPART 1 -- the happy path\n==============================================================================\n  returned : title=\'Inception\' rating=8.8 recommended=True\n  type     : MovieReview\n  typed    : Inception | 8.8 | True\n\n  note the model emitted a TOOL CALL, not text. with_structured_output\n  binds your schema as a tool and reads the arguments back, which is why\n  there is no string to parse and no format instructions to get wrong.\n\n==============================================================================\nPART 2 -- validation is real\n==============================================================================\n  rating above le=10       -> ValidationError (rating)\n  rating not a number      -> ValidationError (rating)\n  rating missing           -> ValidationError (rating)\n  recommended missing      -> ValidationError (recommended)\n\n  the schema is enforced, not suggested. a model that returns a rating of\n  48.8 does not quietly become your data -- which is the whole reason to\n  put constraints in Field() rather than in the prompt text.\n\n==============================================================================\nPART 3 -- the failure that does not raise\n==============================================================================\n  model answered in prose instead of calling the tool.\n  returned : None\n  type     : NoneType\n\n  no exception. no warning. you get None.\n\n  and with include_raw=True, which exists to give you the diagnostics:\n    raw            AIMessage(content="I\'d give Inception about 8.8 out of 10.\n    parsed         None\n    parsing_error  None\n\n  parsed is None AND parsing_error is None. the library is telling you\n  the truth -- nothing failed to parse, because nothing was offered to\n  the parser -- but the net effect is a silent None in your pipeline.\n\n  THE GUARD: check for None explicitly. a structured-output call has\n  three outcomes, not two: a valid object, a ValidationError, and None.\n\n==============================================================================\nPART 4 -- the three mechanisms underneath\n==============================================================================\n  mechanism        how                                        trade\n  tool calling     schema bound as a tool; args read back     most reliable; needs a tool-calling model\n  JSON mode        provider constrains output to valid JSON   valid JSON, but not necessarily YOUR schema\n  prompt + parse   format instructions in the prompt, parse the text works anywhere; weakest guarantee\n\n  with_structured_output picks the strongest one the model supports, so\n  the same line of code gives a different guarantee on a different model.\n  that matters when you swap providers: the code does not change and the\n  failure rate does.\n\n==============================================================================\nPART 5 -- richer schemas\n==============================================================================\n  valid, with evidence       -> sentiment=\'positive\' confidence=0.91 evidence=[\'loved it\', \'best this year\']\n  valid, evidence omitted    -> sentiment=\'positive\' confidence=0.91 evidence=None\n  sentiment off the Literal  -> ValidationError\n\n  a Literal becomes an enum in the schema the model is shown, so the\n  constraint is communicated AND enforced. that is strictly better than\n  writing \'answer positive, negative or neutral\' in the prompt and hoping.',
        notes: [
          { t: "p", text: "**The happy path returns a typed `MovieReview`, not a dict.** The model emitted a tool call with empty text content, so there was never a string to parse \u2014 which is what removes every failure mode in 1.4 at once, including the truncation repair." },
          { t: "p", text: "**All four malformed calls raised `ValidationError`**, including a rating of 48.8 against `ge=1, le=10`. That is the difference between a constraint in `Field()` and the same constraint written in prompt text: the first is a request *and* a guarantee, the second is only a request." },
          { t: "p", text: "**A prose answer returns `None`.** Not an exception, not a partial object \u2014 `None`, typed `NoneType`, travelling into whatever called it. Models decline for ordinary reasons, so this is not an exotic path." },
          { t: "p", text: "**`include_raw` reports `parsed=None` and `parsing_error=None` together**, and both are accurate: nothing failed to parse because nothing was offered to the parser. The diagnostic channel that exists for exactly this situation correctly reports no error, which is why the failure is so quiet." },
          { t: "p", text: "**So a structured-output call has three outcomes**: a valid object, a ValidationError, and None. Code handling the first two is the common case, and its symptom is an AttributeError on NoneType somewhere downstream, nowhere near the cause." },
          { t: "p", text: "**The best fix is not a None check, it is a schema that can say no.** Adding `found: bool` and an optional payload turns a refusal into a valid object you can branch on, which collapses three outcomes back to two and makes `None` mean something genuinely went wrong." },
          { t: "p", text: "**A `Literal` is communicated and enforced from one declaration** \u2014 it becomes an enum in the schema the model reads, and raises on the way back if the model invents a category. Prompt text does only the first half, and less reliably." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: AttributeError on NoneType, once a week",
      body: [
        { t: "p", text: "A review-extraction service raises `AttributeError: 'NoneType' object has no attribute 'title'` roughly once a week. The traceback points at the database write, which is nowhere near the model call, and the inputs that trigger it look unremarkable." },
        { t: "p", text: "The cause is upstream: `with_structured_output` returned `None` because the model answered in prose rather than calling the tool, and the `None` travelled several function calls before anyone dereferenced it. The inputs look unremarkable because they are \u2014 the distinguishing feature is usually that the text contains no movie to review, so the model quite reasonably said so." },
        { t: "p", text: "The one-line fix is a `None` check at the call site. The better fix is to make declining representable: a wrapper schema with `found: bool` and an optional review means the model has a way to express \u201cthere is nothing here\u201d inside the type system, the pipeline gets a valid object on every call, and a `None` afterwards means something is actually broken rather than that the model was being sensible." }
      ] }
  ],

  takeaways: [
    "**`with_structured_output` binds your schema as a tool** \u2014 the model emits a tool call and the arguments are validated, so there is no string to parse.",
    "**That removes every failure mode in 1.4 at once**, including the silent truncation repair.",
    "**The docstring and Field descriptions are prompt**, not documentation \u2014 they are sent to the model as the tool schema, so the schema and the prompt cannot drift apart.",
    "**Constraints in `Field()` are enforced**: a rating of 48.8 against `ge=1, le=10` raises ValidationError rather than becoming your data.",
    "**A constraint in prompt text is a request; a constraint in the schema is a request and a guarantee.**",
    "**A structured-output call has three outcomes**: a valid object, a ValidationError, and `None`.",
    "**`None` is returned when the model answers in prose instead of calling the tool**, which models do for ordinary reasons.",
    "**`include_raw` reports `parsed=None` and `parsing_error=None` together** \u2014 both accurate, since nothing was offered to the parser.",
    "**The symptom is an AttributeError on NoneType downstream**, nowhere near the cause.",
    "**The best fix is a schema that can decline** \u2014 `found: bool` plus an optional payload turns three outcomes back into two.",
    "**Three mechanisms sit underneath** \u2014 tool calling, JSON mode, prompt-and-parse \u2014 and the library picks the strongest the model supports.",
    "**So the same line gives a different guarantee on a different model**; a provider swap changes the failure rate without changing the source.",
    "**A `Literal` is communicated and enforced from one declaration**, which prompt text cannot do."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "The model answers in prose instead of calling the bound schema tool. What does `with_structured_output` return?",
        options: [
          "An OutputParserException, since the response did not match the schema",
          "`None`, with no exception \u2014 and include_raw reports parsing_error as None too",
          "A partially populated object with missing fields set to None",
          "The raw AIMessage, so the caller can decide what to do"
        ],
        answer: 1,
        why: "There was no tool call to read, so nothing reached the parser \u2014 which means `parsing_error` is correctly empty while `parsed` is also empty. Both values are accurate and the combination is the problem: a None travels into the pipeline with no signal attached. That makes three outcomes rather than two, and code written for a valid object or an exception will fail downstream with an AttributeError on NoneType." },

      { stem: "Why put `ge=1, le=10` in Field() rather than \u201crate out of ten\u201d in the system prompt?",
        options: [
          "It is shorter and keeps the prompt focused on the task",
          "Because the schema is sent to the model as the tool definition *and* checked on the way back \u2014 a request and a guarantee",
          "Because prompt instructions are ignored by tool-calling models",
          "Because Pydantic coerces out-of-range values into the valid range"
        ],
        answer: 1,
        why: "The Field constraint appears in the tool schema the model reads, so it does everything the prompt sentence does, and it is enforced when the arguments come back, so a model returning 48.8 raises instead of writing bad data. Prompt text can only ask. Nothing is coerced \u2014 an out-of-range value is a ValidationError, which is the behaviour you want over a silently clamped number." },

      { stem: "What is the best way to handle the `None` outcome?",
        options: [
          "Wrap the call in try/except and treat None as an error case",
          "Give the schema a way to decline \u2014 a `found: bool` with an optional payload \u2014 so a refusal is a valid object",
          "Retry the call until the model produces a tool call",
          "Use include_raw and parse the prose content as a fallback"
        ],
        answer: 1,
        why: "The model declining is frequently the correct behaviour \u2014 there may genuinely be no movie in the text \u2014 so treating it as an error or retrying it fights the model rather than the bug. Making refusal representable inside the schema collapses three outcomes back to two: every call returns a valid object, and a None afterwards means something is actually broken rather than that the model was being sensible." },

      { stem: "You migrate to a provider without tool calling. Your code is unchanged. What happens?",
        options: [
          "Nothing \u2014 with_structured_output abstracts the difference completely",
          "The guarantee weakens to JSON mode or prompt-and-parse, so None and ValidationError rates rise with no code change",
          "The call raises NotImplementedError at startup",
          "LangChain falls back to returning raw strings"
        ],
        answer: 1,
        why: "The library picks the strongest mechanism the model supports, which is good engineering with a consequence: the same source line carries a different guarantee on a different model. Dropping from tool calling to prompt-and-parse reintroduces every text-parsing failure mode from 1.4, and it surfaces as a rising failure rate rather than as anything visible in a diff \u2014 so it is worth measuring across a provider swap rather than discovering later." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Structured output",
    questions: [
      { level: "core",
        q: "How does with_structured_output work, and why prefer it to a parser?",
        strong: "A strong answer explains the tool binding and what it eliminates.",
        answer: [
          { t: "p", text: "It binds your schema as a tool definition rather than asking for JSON in the prompt. The model emits a tool call, the call's arguments come back as structured data, and Pydantic validates them into your type. The model's text content is empty \u2014 there is never a string, so there is nothing to parse." },
          { t: "p", text: "That is the reason to prefer it. Every failure mode of text parsing disappears at once: code fences, preambles, single quotes, trailing commas. Including the worst one, which is that a JSON parser silently repairs truncated output \u2014 a rating cut off at eight-point parses as eight, a different number with no error raised." },
          { t: "p", text: "A detail I would mention because people miss it: the class docstring and the Field descriptions are sent to the model as the tool schema. They are prompt, not documentation. That is a nice property, because the schema and the instructions cannot drift apart the way a parser and its format instructions can." },
          { t: "p", text: "And constraints become real. Field with ge one and le ten is both a request \u2014 it is in the schema the model sees \u2014 and a guarantee, because a model returning 48.8 raises a ValidationError rather than having its answer written to your database." }
        ] },

      { level: "advanced",
        q: "We get AttributeError on NoneType once a week, deep in the write path. Where would you look?",
        strong: "A strong answer identifies the third outcome and fixes it in the schema.",
        answer: [
          { t: "p", text: "At the structured-output call, several frames upstream. A structured-output call has three outcomes and most code is written for two: a valid object, a ValidationError, and None. The None happens when the model answers in prose instead of calling the tool, and it then travels through however many function calls before someone dereferences it \u2014 which is why the traceback points at the write and not at the cause." },
          { t: "p", text: "What makes it hard to spot is that the diagnostic channel agrees that nothing is wrong. I checked this: with include_raw on, you get parsed equal to None and parsing_error also equal to None. Both are accurate \u2014 nothing failed to parse because nothing was offered to the parser \u2014 so the one place you would look for an explanation is empty." },
          { t: "p", text: "The inputs look unremarkable because they are. The usual distinguishing feature is that the text contains nothing to extract, so the model quite reasonably says so in prose rather than inventing a tool call. It is behaving well." },
          { t: "p", text: "So the one-line fix is a None check at the call site, and the fix I would actually make is to give the schema a way to decline \u2014 a wrapper with a found boolean and an optional payload. Then refusal is a valid object the pipeline can branch on, every call returns something, and a None afterwards means something is genuinely broken instead of meaning the model was being sensible." }
        ] },

      { level: "advanced",
        q: "What changes about structured output when you swap provider?",
        strong: "A strong answer names the three mechanisms and the invisible regression.",
        answer: [
          { t: "p", text: "The guarantee, without the code changing. There are three mechanisms underneath: binding the schema as a tool, which is strongest; the provider's JSON mode, which guarantees valid JSON but not that it matches your schema; and prompt-and-parse, which puts format instructions in the prompt and parses the text, which is the weakest and reintroduces every parsing failure mode." },
          { t: "p", text: "with_structured_output picks the strongest the model supports. That is the right design, and the consequence is that the same source line means something different on a different model. A migration from a tool-calling model to one without it silently drops you to prompt-and-parse." },
          { t: "p", text: "The way it surfaces is a rising rate of None and ValidationError, which looks like a quality regression rather than an architecture change, and nothing in the diff explains it. So I would treat it as a thing to measure deliberately across a swap: run the same evaluation set on both, compare the rate of valid objects, and know the number before shipping rather than inferring it from a dashboard three weeks later." },
          { t: "p", text: "If the target provider does not support tool calling, I would want that written down as a known limitation with the measured failure rate next to it, because the mitigation is different \u2014 at that point you are back to needing a fixing parser and a repair counter, which is a different operational posture from one where the schema is enforced." }
        ] }
    ]
  }
});
