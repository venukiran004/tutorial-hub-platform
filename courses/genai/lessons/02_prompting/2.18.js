EC.receiveLesson({
  id: "2.18",

  lede: "The reference closes its prompting material with ready-made templates for the tasks that come up most. They are genuinely useful starting points, and the useful thing to do with them is not to copy them but to see what they have in common — because every one of them is the same four components from 2.1 arranged for a different shape of task, and the differences between them are the interesting part.",

  objectives: [
    "Adapt a template to a domain rather than using it verbatim",
    "Identify the four components in any template and spot which is weak",
    "Choose the right template shape for a task you have not seen before",
    "Know which templates should be replaced by a schema",
    "Recognise the clause each template is missing"
  ],

  prerequisites: ["2.1", "2.7"],

  blocks: [

    { t: "h2", n: "01", id: "common-shape", text: "Every template is the same four components",
      sub: "What differs is which one carries the weight" },

    { t: "p", text: "The templates cover summarisation, entity extraction, classification, code review, data analysis and a few others. Laid side by side, the structure is identical and the emphasis moves." },

    { t: "table",
      head: ["Task", "The component that carries the weight", "What goes wrong without it"],
      rows: [
        ["Summarisation", "**Output format** — length, structure, what to prioritise", "An essay, or three bullets of the wrong three things"],
        ["Entity extraction", "**Output format** as a schema, plus the null clause", "Invented values that validate (2.7)"],
        ["Classification", "**Context** — the label definitions and their boundaries", "Plausible labels applied inconsistently at the edges"],
        ["Code review", "**Context** — what you care about and what you do not", "Style comments where you wanted security findings"],
        ["Data analysis", "**Instruction** — the question, precisely", "A description of the data instead of an answer"],
        ["Rewriting", "**Context** — the audience and the constraint to preserve", "A fluent rewrite that changed the meaning"]
      ],
      caption: "Three of the six lean on context, two on output format, one on instruction. That distribution is why \"be more specific\" is unhelpful advice — it does not say which part to be specific about." },

    { t: "code", lang: "text", title: "The summarisation template", code: `System: You are an expert summarizer. Provide concise, accurate summaries.
User:   Summarize the following text in {N} bullet points.
        Focus on key findings, decisions, and action items.
        Text: {document}`,
      caption: "From the reference notes section 18. The load-bearing line is the third — \"key findings, decisions, and action items\" is what stops the model choosing its own three priorities." },

    { t: "callout", kind: "insight", title: "The priority clause is what makes a summary useful",
      body: [
        { t: "p", text: "\"Summarise in three bullets\" is a shape without a selection rule, so the model picks the three things it judges most salient — which is a reasonable default and is rarely what a specific reader wants." },
        { t: "p", text: "Naming the priorities converts the task from \"what is this about\" to \"extract these three kinds of thing\", which is both more useful and much easier to evaluate: you can check whether every decision in the document appears." },
        { t: "p", text: "This generalises past summarisation. The question to ask of any template is **what is it selecting, and did I say so**. Most weak prompts are weak because the selection rule is implied." }
      ] },

    { t: "h2", n: "02", id: "adapting", text: "Adapting rather than copying",
      sub: "Three edits that make a generic template yours" },

    { t: "ladder", title: "From template to prompt", rungs: [
      { level: "bad", label: "Used verbatim",
        why: "Generic in exactly the places that matter",
        code: `Summarize the following text in 3 bullet points.
Focus on key findings, decisions, and action items.

Text: {document}`,
        note: "It will work. It will also produce the same summary shape for a board paper, a bug report and a research abstract." },
      { level: "ok", label: "Domain and audience added",
        why: "The context component is now real",
        code: `Summarise this incident review for an engineering manager who was
not involved. Three bullets: what broke, what the customer impact
was, and what is being changed.

<document>{document}</document>`,
        note: "Now the selection rule is specific to the task, and the named audience sets register without a persona sentence (2.6)." },
      { level: "best", label: "…plus the edge cases and a format guarantee",
        why: "Says what to do when the document does not cooperate",
        code: `Summarise this incident review for an engineering manager who was
not involved.

- If the review does not state customer impact, say "not stated" --
  do not infer it from the severity.
- If no remediation is recorded, say so rather than describing the
  immediate fix as if it were one.

<document>{document}</document>

# with response_format=IncidentSummary (1.8)`,
        note: "The two bullets are the clauses the template was missing. They are also the two cases that generate most of the complaints about summaries being wrong, because an absent field gets filled with something plausible." }
    ] },

    { t: "h2", n: "03", id: "replace", text: "Which templates should not be prompts at all",
      sub: "Two of the six are structured-output problems" },

    { t: "p", text: "The entity-extraction and classification templates ask in prose for something a schema can guarantee. The ranking (1.8) puts a prompt-described format bottom of four approaches, so a template that describes a JSON shape in words is a starting point to be migrated rather than a destination." },

    { t: "code", lang: "python", title: "replace.py — the extraction template, properly", code: `# The template version (reference section 18): asks, in prose, for JSON.
#   "Extract structured information from the text.
#    Return: entities, sentiment, summary."
#
# The schema version: the shape is a guarantee, and the prose that
# survives is the semantics the schema cannot express (2.7).

class Entity(BaseModel):
    name: str
    type: Literal["person", "org", "location"]

class Extraction(BaseModel):
    model_config = {"extra": "forbid"}
    entities: list[Entity]
    sentiment: Literal["positive", "negative", "neutral"]
    summary: str = Field(description="one sentence, present tense")

PROMPT = """Extract from the document below.
Use an empty list if no entities are present -- do not infer any.
Base the sentiment only on the document, not on the subject matter.

<document>{document}</document>"""`,
      hl: [19, 20],
      caption: "Two clauses survive the migration and they are the ones doing the work. 2.7's exercise measured that a schema replaces about 57% of a format prompt's clauses — the semantics are the other 43%." },

    { t: "callout", kind: "trap", title: "Every template in the reference is missing the absence clause",
      body: [
        { t: "p", text: "Not one of them says what to do when the requested information is not in the document. That is not a criticism of this particular reference — it is almost universally absent from published templates, because templates are written against documents that contain the answer." },
        { t: "p", text: "The consequence is the one measured in 2.7's incident: a required field with no instruction about absence gets a plausible value, which validates, and nobody notices for weeks. Invoices got due dates thirty days after their issue date that appeared nowhere in the source." },
        { t: "p", text: "Adding one clause — *use null, or say \"not stated\", and do not infer* — is the single highest-value edit you can make to any template in this lesson." }
      ] },

    { t: "h2", n: "04", id: "unseen", text: "Choosing a shape for a task you have not seen",
      sub: "Four questions that pick the template" },

    { t: "ol", items: [
      "**Is the output consumed by code or read by a person?** By code means a schema (1.8) and the template becomes semantics only. By a person means the output-format clause is about structure and length.",
      "**Is there one right answer?** Yes means temperature 0 and an exact-match metric (2.12). No means the evaluation needs a judge, and the prompt needs a rubric the judge can use.",
      "**Does the task select, or transform?** Selection — extraction, classification, summarisation — needs a selection rule stated explicitly. Transformation — rewriting, translation, code generation — needs the constraint that must be preserved.",
      "**Is the input reliable?** If the document may not contain the answer, the absence clause from section 03 is mandatory rather than optional."
    ] },

    { t: "p", text: "Those four questions produce the template rather than requiring you to find one. The six are useful as worked examples of the answers — and as a reminder that a template is a starting point whose generic parts are exactly the parts you need to replace." },

    { t: "exercise", kind: "Challenge", title: "Audit the templates against the four components",
      difficulty: "foundation", minutes: 20,
      body: [
        { t: "p", text: "A template's weakness is usually a missing component rather than bad wording, and the audit from 2.1 applies to published templates as readily as to your own." },
        { t: "p", text: "Score the templates and find the pattern." }
      ],
      requirements: [
        "Write out at least five templates in the style: summarisation, extraction, classification, code review, rewriting",
        "For each, mark whether instruction, context, input and output format are present",
        "Mark separately whether an absence clause is present",
        "Report which component is most often missing and which template is strongest",
        "State the one edit you would make to all of them"
      ],
      hint: "Context is the audience, domain and constraints — not the task. A template that says what to do but not who for is missing context.",
      solution: { lang: "python", title: "g218_ex.py",
        code: `TEMPLATES = {
  # name:         (instruction, context, input, output_format, absence_clause)
  "summarise":    (True,  False, True, True,  False),
  "extract":      (True,  False, True, True,  False),
  "classify":     (True,  True,  True, True,  False),
  "code review":  (True,  False, True, False, False),
  "rewrite":      (True,  False, True, True,  False),
  "data analysis":(True,  False, True, False, False),
}

FIELDS = ["instruction", "context", "input", "output_format", "absence_clause"]

print("%-15s %s" % ("template", "  ".join("%-14s" % f for f in FIELDS)))
for name, flags in TEMPLATES.items():
    print("%-15s %s" % (name, "  ".join("%-14s" % ("yes" if f else "MISSING")
                                        for f in flags)))

print()
for i, field in enumerate(FIELDS):
    missing = [n for n, f in TEMPLATES.items() if not f[i]]
    print("%-15s missing from %d of %d: %s"
          % (field, len(missing), len(TEMPLATES), ", ".join(missing) or "-"))

print()
best = max(TEMPLATES, key=lambda n: sum(TEMPLATES[n]))
print("strongest template: %r (%d of 5 present)" % (best, sum(TEMPLATES[best])))`,
        out: `template        instruction     context         input           output_format   absence_clause
summarise       yes             MISSING         yes             yes             MISSING
extract         yes             MISSING         yes             yes             MISSING
classify        yes             yes             yes             yes             MISSING
code review     yes             MISSING         yes             MISSING         MISSING
rewrite         yes             MISSING         yes             yes             MISSING
data analysis   yes             MISSING         yes             MISSING         MISSING

instruction     missing from 0 of 6: -
context         missing from 5 of 6: summarise, extract, code review, rewrite, data analysis
input           missing from 0 of 6: -
output_format   missing from 2 of 6: code review, data analysis
absence_clause  missing from 6 of 6: summarise, extract, classify, code review, rewrite, data analysis

strongest template: 'classify' (4 of 5 present)`,
        notes: [
          { t: "p", text: "The **absence clause is missing from all six**, which is the finding. Published templates are written against documents that contain the answer, so the case where they do not never gets specified — and that is exactly the case that produces confidently invented values which validate against a schema (2.7)." },
          { t: "p", text: "**Context is missing from five of six**, and it is the component that makes a generic template specific. Only classification has it — and the strongest template still scores 4 of 5, because even it has no absence clause. Classification gets context for free because the task cannot be stated at all without defining the labels, which is forced by the task shape rather than by the author’s care. The templates are not missing context through carelessness: context is the part that cannot be generic." },
          { t: "p", text: "The one edit for all six is therefore the absence clause: *use null, or say “not stated”, and do not infer*. It is one sentence, it applies unchanged to every template here, and it addresses the failure mode that is hardest to detect afterwards — because an invented value looks exactly like a correct one." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the template that summarised the wrong three things",
      body: [
        { t: "p", text: "**Symptom.** An incident-review summariser was praised in testing and criticised in use. Engineering managers reading the summaries said they were \"accurate but useless\" — they covered the technical narrative in detail and frequently omitted customer impact and remediation entirely." },
        { t: "p", text: "**The prompt.** The summarisation template, used close to verbatim: three bullets, focus on key findings, decisions and action items." },
        { t: "p", text: "**Mechanism.** \"Key findings\" is a selection rule, and it selected correctly — the key findings of an incident review are usually technical, because that is what most of the document is about. The readers wanted a different selection: what broke, who it affected, what changes. The prompt was not wrong; it was selecting for a different reader than the one it had, and the testing had been done by the engineers who wrote the reviews rather than the managers who read the summaries." },
        { t: "p", text: "**Fix.** The three priorities were named explicitly — what broke, customer impact, what is being changed — and the absence clause added, because about a fifth of reviews did not record customer impact and the model had been inferring it from severity. Satisfaction moved immediately. The durable lesson is section 01's: **a template's selection rule is the part that must be domain-specific**, and a generic one will select something defensible that nobody asked for." }
      ] }
  ],

  takeaways: [
    "**Every template is the same four components from 2.1**, arranged for a different task shape. What differs is which component carries the weight.",
    "Three of the six lean on **context**, two on **output format**, one on **instruction** — which is why \"be more specific\" is unhelpful advice: it does not say which part.",
    "**The selection rule is what makes a summary useful.** \"Three bullets\" is a shape; naming what to select converts it into an extractable, evaluable task.",
    "Ask of any template: **what is it selecting, and did I say so.** Most weak prompts are weak because the selection rule is implied.",
    "Adapt rather than copy: add the **domain and audience**, then the **edge cases**. A named audience sets register without needing a persona sentence (2.6).",
    "**Two of the six should not be prompts at all.** Extraction and classification describe in prose what a schema guarantees — 2.7 measured a schema replacing 57% of a format prompt's clauses.",
    "**The absence clause is missing from all six templates**, measured — because templates are written against documents that contain the answer.",
    "That omission is the one that produces confidently invented values which validate perfectly, and it is the single highest-value edit: *use null, or say \"not stated\", and do not infer*.",
    "**Context is missing from five of six**, and not through carelessness — context is the part that cannot be generic. Only classification has it, because the task cannot be stated without defining the labels.",
    "Four questions pick a template for an unseen task: consumed by code or read by a person, one right answer or not, selects or transforms, and is the input reliable."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Which component is missing from all six of the templates?",
        options: ["The instruction", "The absence clause — what to do when the information is not there", "The input", "The output format"],
        answer: 1,
        why: "Measured across six templates, every one specifies the task and the input and none says what to do when the document does not contain the requested information — because templates are written against documents that do. That is precisely the omission that produces plausible invented values which satisfy a schema and go unnoticed, as in 2.7's invoice incident. Instruction and input are present in all six; output format is missing from two." },

      { stem: "Why is context missing from five of six templates?",
        options: ["Carelessness by the authors", "Context is the component that cannot be generic — it is the audience, domain and constraints", "It is implied by the instruction", "Templates do not need context"],
        answer: 1,
        why: "A template is by definition task-shaped and domain-free, and context is the audience, domain and constraints — so it is exactly the part a template cannot supply. The one exception measured is classification, which has context only because a classification task cannot be stated at all without defining the labels: the task shape forces it. That makes adding context the first edit when adapting any template, rather than a sign the template was badly written." },

      { stem: "Your incident summaries are \"accurate but useless\" to the managers reading them. What is wrong?",
        options: ["The model is too small", "The selection rule is generic — \"key findings\" selects correctly for a different reader", "The temperature is too high", "The summaries are too short"],
        answer: 1,
        why: "\"Key findings\" is a selection rule and it selected correctly: the key findings of an incident review are technical, because most of the document is. The readers wanted what broke, who it affected and what is changing — a different selection, which has to be named. Length and temperature do not change what gets selected, and a larger model would select the same defensible things. This is section 01's point: a generic selection rule picks something defensible that nobody asked for." },

      { stem: "You are adapting the entity-extraction template. What is the most important change?",
        options: ["Make the instruction more forceful", "Replace the prose format description with a schema, and keep the semantic clauses", "Add a persona", "Increase max_tokens"],
        answer: 1,
        why: "The template describes a JSON shape in words, which 1.8 ranks bottom of four approaches — a schema makes the shape a guarantee rather than a request. What survives the migration is the semantics a schema cannot express: use an empty list if no entities are present, do not infer. 2.7 measured a schema replacing about 57% of a format prompt's clauses, so roughly 43% of the prose is doing work that must be kept. A persona adds register, not structure, and max_tokens is unrelated." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Template questions sound shallow and are a good way to find out whether someone adapts or copies.",
    questions: [
      { level: "core",
        q: "How do you use a published prompt template?",
        strong: "A strong answer treats it as a starting point and names what has to be replaced.",
        answer: [
          { t: "p", text: "As a starting point whose generic parts are exactly the parts I need to replace. Every template is the same four components — instruction, context, input, output format — and the one it cannot supply is context, because context is the audience, the domain and the constraints." },
          { t: "p", text: "I audited six published templates once: context was missing from five of them, and not through carelessness — it is the part that cannot be generic. The only one that had it was classification, because you cannot state a classification task without defining the labels." },
          { t: "p", text: "So the first edit is domain and audience. The second is the selection rule: \"summarise in three bullets\" is a shape with no rule, and the model will pick three defensible things that are often not what the reader wanted." }
        ] },

      { level: "core",
        q: "What is the commonest omission in a prompt template?",
        strong: "The absence clause, with the failure it causes.",
        answer: [
          { t: "p", text: "What to do when the requested information is not in the document. I checked six published templates and it was missing from all six — understandably, because templates are written against documents that contain the answer." },
          { t: "p", text: "The failure it causes is the expensive kind: a required field with no instruction about absence gets a plausible value, that value satisfies the schema, and nobody notices. I have seen invoices get due dates thirty days after their issue date that appeared nowhere in the source, at about 4% of volume, found weeks later by finance." },
          { t: "p", text: "One sentence fixes it — use null, or say \"not stated\", and do not infer — and it applies unchanged to every template I have seen. It is the highest-value single edit available." }
        ] },

      { level: "advanced",
        q: "How would you build a prompt for a task you have not done before?",
        strong: "A strong answer gives a procedure rather than reaching for a template.",
        answer: [
          { t: "p", text: "Four questions, and the answers produce the prompt rather than requiring me to find a template for it." },
          { t: "p", text: "Is the output consumed by code or read by a person? By code means a schema, and the prompt becomes semantics only. Is there one right answer? That decides temperature and whether the evaluation can use exact match or needs a judge." },
          { t: "p", text: "Does the task select or transform? Selection tasks — extraction, classification, summarisation — need the selection rule stated explicitly, and that is where most of them go wrong. Transformation tasks need the constraint that must be preserved, which is where a fluent rewrite that changed the meaning comes from." },
          { t: "p", text: "And is the input reliable? If the document may not contain the answer, the absence clause is mandatory rather than optional. Those four give me the shape; then it is a golden set and 2.12." }
        ] }
    ]
  }
});
