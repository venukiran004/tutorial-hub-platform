EC.receiveLesson({
  id: "11.2",
  lede: "A router is one classification and one branch \u2014 the cheapest pattern that is still letting the model decide something, and it keeps every property an agent gives up. The ceiling is set by one failure: the model returned a category not in the path map and the graph raised **`KeyError: 'nonsense'`**. That is 8.7's missing-map-entry failure now reachable from **model output** rather than from a coding mistake, which is worse \u2014 the set of strings a model can emit is not enumerable. So a router over model output needs a **default branch, always**, and the validation belongs in the router rather than in the prompt: asking the model to return one of three words is 4.7's request, and checking membership is the guarantee.",
  objectives: [
    "Build a router over a model's classification",
    "Show the failure when the model returns an unmapped category",
    "Add a default branch and explain where validation belongs",
    "Use structured output to constrain the classification",
    "State what a router cannot do and what that buys"
  ],
  prerequisites: ["11.1", "8.7"],
  blocks: [
    { t: "h2", n: "01", id: "router", text: "One classification, one branch", sub: "One model call per request" },

    {"kind": "tree", "title": "The cheapest pattern that still lets the model decide", "caption": "One classification and one branch — and it keeps every property an agent gives up: a fixed call count, a readable path, a testable decision. The ceiling is **one** failure, and it is the one you must design for.", "root": {"label": "classify once", "sub": "a Literal over known labels", "tone": "accent", "children": [{"label": "billing", "sub": "a specialist prompt", "tone": "good", "edge": "matched"}, {"label": "technical", "sub": "a specialist prompt", "tone": "good", "edge": "matched"}, {"label": "default", "sub": "the model returned something unmapped", "tone": "crit", "edge": "MUST exist"}]}, "t": "diagram", "id": "dg-11_2-01-0"},




    { t: "code", lang: "text", title: "Three requests",
      code: "'I want a refund'         -> billing     ['billing handled it']\n'the API returns 500'     -> technical   ['technical handled it']\n'add a teammate'          -> account     ['account handled it']",
      caption: "The branch did no model work, so the cost is one classification plus the handler." },
    { t: "h2", n: "02", id: "ceiling", text: "The classification failure", sub: "And it defines the ceiling" },
    { t: "code", lang: "text", title: "A category not in the path map",
      code: "RAISED KeyError: 'nonsense'",
      caption: "8.7's failure, reached from model output." },
    { t: "callout", kind: "trap", title: "Which is worse than the coding-mistake version", body: [
      { t: "p", text: "8.7's version was a router whose own code could return an unmapped key \u2014 fixable by enumerating the outcomes with an `Enum` and building the map from it. Here the value comes from a **model**, and the set of strings a model can emit is not enumerable." },
      { t: "p", text: "So no amount of care in the router's code closes it. The model can return `\"Billing\"`, `\"billing.\"`, `\"I think billing\"`, or a refusal \u2014 and each of those is a different unmapped key." }
    ] },
    { t: "code", lang: "python", title: "So: a default branch, always",
      code: 'def route_safe(state):\n    c = state["category"]\n    return c if c in CATS else "fallback"',
      out: "    [\"fallback: unrecognised 'nonsense'\"]",
      caption: "Membership checked in the router." },
    { t: "callout", kind: "insight", title: "The validation belongs in the router, not the prompt", body: [
      { t: "p", text: "Asking the model nicely to return only one of three words is 4.7's **request**. Checking membership before routing is the **guarantee**." },
      { t: "p", text: "That distinction has appeared throughout the course \u2014 5.5's metadata filter against a prompt instruction, 5.7's grounding instructions, 7.6's injection defences. The pattern is always the same: a constraint enforced by code is a property, and a constraint asked for in a prompt is a tendency." }
    ] },
    { t: "h2", n: "03", id: "structured", text: "The better version", sub: "Do not parse free text at all" },
    { t: "code", lang: "python", title: "A constrained classification",
      code: 'class Classification(BaseModel):\n    category: Literal["billing", "technical", "account"]',
      caption: "4.6 and 4.7's structured output, applied to routing." },
    { t: "p", text: "This moves the failure from *\u201cthe model said something else\u201d* to *\u201cthe provider rejected the generation\u201d*, which is a much better failure: it is loud, and it is at the boundary. The default branch still earns its place, because provider-level constraint is not available everywhere and 4.7's guarantee-against-request distinction applies to providers too." },
    { t: "h2", n: "04", id: "cannot", text: "What a router cannot do", sub: "And what that is worth" },
    { t: "table", head: ["cannot", "which buys"], rows: [
      ["call two handlers for one request", "paths = the number of categories"],
      ["loop, or revisit a decision after a result", "model calls = **1**"],
      ["decide the sequence of several operations", "max latency = classification + slowest handler"],
      ["", "**can it run away? no, structurally**"]
    ] },
    { t: "callout", kind: "good", title: "The cheapest pattern that still lets the model decide", body: [
      { t: "p", text: "Every limitation in the left column is the reason for a guarantee in the right. A router cannot loop, so it cannot run away \u2014 that is not a mitigation, it is the absence of the mechanism." },
      { t: "p", text: "Which is 9.3's rule in its most useful instance: use the least agentic pattern that works. A router gives the model a decision and keeps every property an agent gives up." }
    ] },
    { t: "exercise", kind: "build", title: "Build a router and break its classification",
      difficulty: "core", minutes: 28,
      body: "Build a router that classifies a request with a model and branches to one handler per category, and confirm the cost is one model call. Then have the model return a category that is not in the path map and report what happens. Add a default branch and explain where the validation belongs. Describe the structured-output version and what it changes about the failure. Finally list what a router cannot do and the guarantee each limitation buys.",
      requirements: ["Build a router over a model classification and show three requests",
        "Confirm the model-call count per request",
        "Have the model return an unmapped category and report the failure",
        "Explain why this is worse than 8.7's version of the same bug",
        "Add a default branch and explain where validation belongs",
        "Describe the structured-output version and the failure it produces instead",
        "List what a router cannot do and the guarantee each buys"],
      hint: "Script the model to return a word that is not a category. The failure is the lesson, and the fix is not in the prompt.",
      solution: { lang: "python", title: "x1102.py \u2014 KeyError from model output",
        code: 'def classify(state):\n    out = m.invoke([SystemMessage(content="Classify into: %s" % ", ".join(CATS)),\n                    HumanMessage(content=state["text"])])\n    return {"category": out.content.strip()}\n\ng.add_conditional_edges("classify", lambda s: s["category"],\n                        {c: c for c in CATS})\n# -> KeyError: \'nonsense\' when the model returns something else\n\n# the fix is in the ROUTER, not the prompt\ndef route_safe(state):\n    c = state["category"]\n    return c if c in CATS else "fallback"',
        out: "==============================================================================\nPART 1 -- one classification, one branch\n==============================================================================\n  'I want a refund'        -> billing    ['billing handled it']\n  'the API returns 500'    -> technical  ['technical handled it']\n  'add a teammate'         -> account    ['account handled it']\n\n  one model call per request, and the branch did no model work. so\n  the cost is one classification plus whatever the handler does.\n==============================================================================\nPART 2 -- the classification failure defines the ceiling\n==============================================================================\n  the model returns a category that is not in the path map:\n    RAISED KeyError: 'nonsense'\n\n  8.7's missing-map-entry failure, now reachable from MODEL OUTPUT\n  rather than from a coding mistake. which is worse, because the\n  set of strings a model can emit is not enumerable.\n\n  so a router over model output needs a default branch, always:\n\n    [\"fallback: unrecognised 'nonsense'\"]\n\n  the validation is in the ROUTER, not in the prompt. asking the\n  model nicely to return only one of three words is 4.7's request;\n  checking membership is the guarantee.\n==============================================================================\nPART 3 -- the better version: do not parse free text at all\n==============================================================================\n  the classification is structured output (4.6, 4.7). so bind a tool\n  or a schema whose field is an Enum, and the provider constrains\n  the output rather than the prompt requesting it:\n\n    class Classification(BaseModel):\n        category: Literal['billing', 'technical', 'account']\n\n  which moves the failure from 'the model said something else' to\n  'the provider rejected the generation', and that is a much better\n  failure -- it is loud, and it is at the boundary.\n\n  the default branch still earns its place, because a provider-level\n  constraint is not available everywhere and 4.7's distinction\n  between a guarantee and a request applies to the provider too.\n==============================================================================\nPART 4 -- what a router cannot do, and what that is worth\n==============================================================================\n  it cannot:\n    - call two handlers for one request\n    - loop, or revisit a decision after seeing a result\n    - decide the sequence of several operations\n\n  which is exactly what makes it predictable:\n    paths           = the number of categories\n    model calls     = 1\n    max latency     = classification + slowest handler\n    can it runaway? = no, structurally\n\n  so a router is the cheapest pattern that is still letting the\n  model decide something -- and it keeps every property an agent\n  gives up. 9.3's rule: use the least agentic pattern that works.",
        notes: [
          { t: "p", text: "**One model call per request**, with the branch doing no model work \u2014 so the cost is a classification plus the handler." },
          { t: "p", text: "**An unmapped category raised `KeyError`** \u2014 8.7's missing-map-entry failure, now reachable from model output." },
          { t: "p", text: "**Which is worse than the coding-mistake version**, because the set of strings a model can emit is not enumerable \u2014 `\"Billing\"`, `\"billing.\"` and a refusal are all different unmapped keys." },
          { t: "p", text: "**So a router over model output needs a default branch, always.**" },
          { t: "p", text: "**And the validation belongs in the router, not the prompt**: asking for one of three words is 4.7's request, checking membership is the guarantee." },
          { t: "p", text: "**The structured-output version constrains the generation** (4.6), moving the failure from \u2018the model said something else\u2019 to \u2018the provider rejected it\u2019 \u2014 loud, and at the boundary." },
          { t: "p", text: "**The default branch still earns its place**, since provider-level constraint is not universal and 4.7's distinction applies to providers too." },
          { t: "p", text: "**A router cannot loop, fan out or sequence** \u2014 and each limitation buys a guarantee: enumerable paths, one model call, bounded latency, and no possibility of a runaway." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the router that worked until the model was upgraded", body: [
      { t: "p", text: "A triage router has run for a year with three categories and no default branch. The team upgrades to a newer model with better benchmarks. Within hours, a fraction of requests fail with a `KeyError` \u2014 the new model sometimes answers *\u201cThis appears to be a billing question.\u201d* instead of `billing`." },
      { t: "p", text: "Nothing in the router changed. The old model happened to comply with the prompt's instruction to answer with a single word, and compliance with a prompt instruction is a property of a model version, not of the system. The upgrade changed a tendency that the router was treating as a guarantee." },
      { t: "p", text: "Two fixes, and both are worth having. A default branch makes the failure a handled case rather than an exception. And constraining the output with a schema makes the model unable to produce prose in that field, which moves the enforcement from the prompt to the provider. The transferable point is that any system whose correctness depends on a model following a formatting instruction has an undeclared dependency on the model version \u2014 and model upgrades are exactly when it surfaces." }
    ] }
  ],
  takeaways: [
    "**A router is one classification and one branch** \u2014 one model call per request.",
    "**An unmapped category raised `KeyError`** \u2014 8.7's failure, from model output.",
    "**Which is worse**, because the set of strings a model can emit is not enumerable.",
    "**So a router over model output needs a default branch, always.**",
    "**The validation belongs in the router, not the prompt.**",
    "**Asking for one of three words is a request; checking membership is a guarantee** (4.7).",
    "**Structured output constrains the generation** and moves the failure to the provider.",
    "**Which is a better failure** \u2014 loud, and at the boundary.",
    "**The default branch still earns its place**, since provider constraint is not universal.",
    "**A router cannot call two handlers, loop, or sequence operations.**",
    "**And each limitation buys a guarantee**: enumerable paths, one call, bounded latency.",
    "**It cannot run away \u2014 structurally**, which is the absence of the mechanism rather than a mitigation.",
    "**A system depending on a model following a formatting instruction depends on the model version.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A router's model returns a category not in the path map. What happens, and why is it worse than the same bug from a hand-written router?",
      options: ["compile() rejects it; no difference",
        "It raises KeyError at runtime \u2014 and the set of strings a model can emit is not enumerable, so no care in the router's code closes it",
        "It routes to the first branch as a default",
        "The conditional edge retries the classification"],
      answer: 1,
      why: "A hand-written router's outcomes can be enumerated with an Enum and the path map built from it, making the gap impossible. A model can return 'Billing', 'billing.', a sentence, or a refusal \u2014 each a distinct unmapped key. So the only workable defence is a membership check with a default branch, applied to whatever the model produced." },
    { stem: "Where does the validation of a model's classification belong?",
      options: ["In the prompt, instructing the model to answer with one word",
        "In the router, checking membership before returning a destination",
        "In the state schema, as a Literal type",
        "In the handler, which can reject an unexpected category"],
      answer: 1,
      why: "A prompt instruction is a request that a model may or may not honour, and compliance is a property of the model version rather than of the system. A membership check in the router is code that holds regardless. This is the same guarantee-against-request distinction as a metadata filter versus asking the model to ignore restricted documents." },
    { stem: "What does constraining the classification with a schema change?",
      options: ["It removes the need for a default branch",
        "It moves the failure from 'the model said something else' to 'the provider rejected the generation' \u2014 loud, and at the boundary",
        "It guarantees the category is semantically correct",
        "It eliminates the model call"],
      answer: 1,
      why: "A provider enforcing a Literal field cannot emit prose in it, so the failure mode changes character rather than disappearing. The default branch still earns its place because provider-level constraint is not available everywhere, and because a guarantee offered by a provider is still a guarantee you did not implement." },
    { stem: "A year-old router starts raising KeyError after a model upgrade. What is the underlying cause?",
      options: ["The new model's output schema changed",
        "The old model happened to comply with a prompt instruction, and compliance is a property of the model version rather than of the system",
        "The path map was corrupted during deployment",
        "The newer model is less capable at classification"],
      answer: 1,
      why: "Nothing in the router changed; a tendency the system had been treating as a guarantee stopped holding. Any system whose correctness depends on a model following a formatting instruction has an undeclared dependency on the model version, and an upgrade is exactly when that surfaces. A default branch plus a constrained output removes the dependency." }
  ] },
  interview: { title: "Interview practice", sub: "Router", questions: [
    { level: "core", q: "What is the failure mode of a router pattern?",
      strong: "A strong answer names the unmapped category and puts the fix in code.",
      answer: [
        { t: "p", text: "The model returning a category that is not in the path map, which raises at runtime on that request." },
        { t: "p", text: "What makes it harder than the same bug in a hand-written router is that the value comes from a model. If I write the router myself I can enumerate the outcomes with an Enum and build the path map from the same enumeration, so an unmapped value is impossible. A model can return 'Billing' with a capital, 'billing.' with a full stop, a whole sentence, or a refusal \u2014 and each is a distinct unmapped key." },
        { t: "p", text: "So the defence is a membership check with a default branch, in the router. Not in the prompt \u2014 asking the model to reply with one of three words is a request, and checking membership is a guarantee." },
        { t: "p", text: "The better version is to constrain the output with a schema so the field is a Literal. That moves the failure to the provider rejecting the generation, which is loud and at the boundary. I would still keep the default branch, because provider-level constraint is not available everywhere." }
      ] },
    { level: "advanced", q: "Why is a router worth preferring even when an agent would work?",
      strong: "A strong answer ties each limitation to a guarantee.",
      answer: [
        { t: "p", text: "Because every limitation of a router buys a guarantee, and those guarantees are the things an agent cannot give you back." },
        { t: "p", text: "It cannot loop, so it cannot run away \u2014 and that is not a mitigation I configured, it is the absence of the mechanism. It cannot call two handlers, so the number of execution paths equals the number of categories and I can enumerate them. The cost is one model call plus the handler, so I can state a latency budget before shipping." },
        { t: "p", text: "Compare that with an agent, where the step count is model output. I cannot bound the cost by reading the code, which is why frameworks ship a recursion limit at all \u2014 on the version I measured the default allowed over ten thousand supersteps, all of which execute." },
        { t: "p", text: "There is also an operational argument. A router's failures are localised: a category it handles badly is one branch to improve, and a category it does not recognise falls to a default I can inspect. An agent's failures are distributed across several interacting decisions." },
        { t: "p", text: "So I would only move up when the sequence of operations genuinely varies by request. If only the choice varies, a conditional edge expresses it exactly and keeps everything." }
      ] },
    { level: "core", q: "How would you choose the categories for a router?",
      strong: "A strong answer derives them from traffic and keeps the set small.",
      answer: [
        { t: "p", text: "From real traffic rather than from the org chart, and as few as possible \u2014 because every category is a branch to build, test and maintain, and a category the model confuses with another is worse than not having it." },
        { t: "p", text: "So I would take a few hundred real requests, cluster them by what the system would have to DO rather than by subject matter, and see how few buckets cover most of the volume. Two requests about billing that need different operations are two categories; two about different subjects that need the same lookup are one." },
        { t: "p", text: "Then I would check for confusability before committing. If two categories are hard for a person to separate from the request text alone, the model will not do better, and the cost of the confusion lands on whichever branch is more expensive to get wrong." },
        { t: "p", text: "A fallback category always, which is not a real category \u2014 it is the default branch that catches anything unmapped, since model output is not enumerable." },
        { t: "p", text: "And I would keep the categories as a single enum used both by the classifier's schema and to build the path map, so adding one cannot leave a branch missing." }
      ] }
  ] }
});
