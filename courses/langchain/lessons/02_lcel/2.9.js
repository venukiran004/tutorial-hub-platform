EC.receiveLesson({
  id: "2.9",
  lede: "A chain is built once and deployed once, and the things that vary \u2014 which model tier a customer gets, which prompt an experiment is testing, which tenant a request belongs to \u2014 vary per call. `configurable_fields` exposes a **value** for override at call time; `configurable_alternatives` swaps a **whole component**, so one chain object can hold a cheap model and a careful one and choose between them from config. `with_config` attaches a run name, tags and metadata, which change no behaviour at all and are the difference between a span tree you can filter and forty rows called `RunnableSequence`. The rule for what belongs in config rather than input is one sentence, and it is at the end.",
  objectives: [
    "Expose a value for runtime override with configurable_fields",
    "Swap a whole component with configurable_alternatives",
    "Attach a run name, tags and metadata with with_config",
    "Decide whether a value belongs in config or in the input",
    "Explain why this keeps 1.8's line count flat"
  ],
  prerequisites: ["2.8"],
  blocks: [
    { t: "h2", n: "01", id: "fields", text: "configurable_fields", sub: "Change a value per call" },
    { t: "code", lang: "python", title: "One chain, two behaviours",
      code: 'model = base_model.configurable_fields(\n    script=ConfigurableField(id="script", name="Script",\n                             description="what the model returns"))\n\nmodel.invoke(msgs)                                        # default\nmodel.invoke(msgs, config={"configurable": {"script": ["overridden"]}})',
      out: "default        : default\nwith config    : overridden",
      caption: "Built once. The value changed at call time with nothing rebuilt." },
    { t: "p", text: "In a real deployment the field would be `temperature`, `model_name` or `max_tokens`. The mechanism is the point: the chain is a long-lived object, and the per-request variation goes through config rather than through constructing a new chain for every request." },
    { t: "h2", n: "02", id: "alternatives", text: "configurable_alternatives", sub: "Swap the whole component" },
    { t: "code", lang: "python", title: "A cheap model and a careful one",
      code: 'switchable = cheap.configurable_alternatives(\n    ConfigurableField(id="tier"), default_key="cheap", good=good_model)\n\nchain = prompt | switchable | StrOutputParser()\n\nchain.invoke({"q": "x"})                                     # cheap\nchain.invoke({"q": "x"}, config={"configurable": {"tier": "good"}})',
      out: "default (cheap): a cheap answer\ntier=good      : a careful answer",
      hl: [6, 7],
      caption: "One chain object, two models, selected per request." },
    { t: "callout", kind: "good", title: "This is the requirement that kept 1.8's column flat", body: [
      { t: "p", text: "\u201cSwap the model per customer\u201d was one of the seven accumulating requirements in 1.8, where the raw implementation grew by seven lines and the LCEL version by one. This is that one line." },
      { t: "p", text: "The reason it is cheap is the uniformity from 1.1: `configurable_alternatives` does not care that it is swapping a chat model. It would swap a retriever, a parser or an entire sub-chain the same way, because all it needs is that the alternatives satisfy the same interface." }
    ] },
    { t: "p", text: "Worth being explicit about what this makes possible: per-tenant model choice, an A/B test between two prompts, a premium tier that uses a larger model, and a fallback to a cheaper model under load \u2014 all from one deployed object, selected by a value that can come from a request header." },
    { t: "h2", n: "03", id: "withconfig", text: "with_config", sub: "Changes nothing, and matters at three in the morning" },
    { t: "code", lang: "python", title: "Naming a run",
      code: 'named = chain.with_config(run_name="summarise",\n                          tags=["prod", "v2"],\n                          metadata={"tenant": "acme"})',
      out: "run_name : summarise\ntags     : ['prod', 'v2']\nmetadata : {'tenant': 'acme'}",
      caption: "No behavioural effect whatsoever. All of it appears in a trace." },
    { t: "p", text: "2.2 noted that a chain is a value you can name. This is how, and it is worth doing as you build rather than when you need it \u2014 the moment you need it is during an incident, and at that point every span in the tree is called `RunnableSequence` and you are matching step indices by hand." },
    { t: "callout", kind: "insight", title: "Tags are how you find one tenant's traffic", body: [
      { t: "p", text: "A `run_name` makes a span readable. **Tags and metadata make a trace queryable**, which is the thing that actually matters once there is volume: show me the failures for this tenant, this version, this experiment arm." },
      { t: "p", text: "Attaching the tenant and the deployment version costs one call and is nearly impossible to add retrospectively, because by the time you want it you want it for traffic that has already happened. 4.2 builds on this." }
    ] },
    { t: "h2", n: "04", id: "which", text: "Config or input?", sub: "One sentence, and it resolves most cases" },
    { t: "table", head: ["Belongs in config", "Belongs in the input"], rows: [
      ["which model tier", "the question being asked"],
      ["which tenant", "the documents to summarise"],
      ["a request id", "the conversation history"],
      ["callbacks and tags", "the user's name, if the answer uses it"],
      ["max_concurrency", "anything the prompt interpolates"],
      ["a recursion limit", "anything a later step reads as data"]
    ] },
    { t: "callout", kind: "mental", title: "The test", body: [
      { t: "p", text: "**If two concurrent calls could legitimately differ on it, and it is not part of the question being asked, it is config.** A tenant id differs per call and is not part of the question \u2014 config. The document to summarise differs per call and *is* the question \u2014 input." },
      { t: "p", text: "Getting it wrong in one direction puts operational concerns into your prompt variables, where they leak into the model's context. Getting it wrong in the other direction puts data into config, where it does not reach the prompt template at all and fails as a missing variable." }
    ] },
    { t: "diagram", kind: "compare", title: "Two kinds of runtime configuration",
      caption: "A chain is built once and deployed once; the things that vary — a customer's model tier, an experiment's prompt, a request's tenant — vary per call. Both of these are config rather than input, which is 2.9's test: two concurrent users differ on it and it is not part of the question.",
      columns: [
        { title: "configurable_fields", tone: "accent", items: [
          "exposes a VALUE for override at call time",
          "temperature, max_tokens, a model name",
          "chain.invoke(x, {“configurable”: {“temperature”: 0}})",
          "same shape, different setting" ] },
        { title: "configurable_alternatives", tone: "violet", items: [
          "swaps a whole COMPONENT for another",
          "a different model, a different prompt, a different retriever",
          "declared with a default and named options",
          "same interface, different implementation" ] }
      ] },
    { t: "exercise", kind: "build", title: "One chain, many behaviours",
      difficulty: "core", minutes: 24,
      body: "Expose a value on a model with configurable_fields and change it at call time without rebuilding the chain. Then register an alternative component with configurable_alternatives and select it from config. Attach a run name, tags and metadata with with_config and confirm they are carried. Finally, classify a list of values into config and input.",
      requirements: ["Expose a field and show the default and the overridden call",
        "Register an alternative component and select it per call",
        "Show that the surrounding chain is unchanged in both cases",
        "Attach run_name, tags and metadata and read them back",
        "Confirm that with_config changes no behaviour",
        "Classify at least six values as config or input, and state the test"],
      hint: "The point of the first two parts is that the chain object is built once. Check that you are not reconstructing it between calls.",
      solution: { lang: "python", title: "x0209.py \u2014 built once, varied per call",
        code: 'from langchain_core.runnables import ConfigurableField\n\nmodel = FakeChatModel(script=["default"]).configurable_fields(\n    script=ConfigurableField(id="script", name="Script",\n                             description="what the model returns"))\nprint(model.invoke(msgs).content)\nprint(model.invoke(msgs, config={"configurable": {"script": ["overridden"]}}).content)\n\ncheap = FakeChatModel(script=["a cheap answer"])\ngood  = FakeChatModel(script=["a careful answer"])\nswitchable = cheap.configurable_alternatives(\n    ConfigurableField(id="tier"), default_key="cheap", good=good)\n\nchain = prompt | switchable | StrOutputParser()\nprint(chain.invoke({"q": "x"}))\nprint(chain.invoke({"q": "x"}, config={"configurable": {"tier": "good"}}))\n\nnamed = chain.with_config(run_name="summarise", tags=["prod", "v2"],\n                          metadata={"tenant": "acme"})',
        out: "==============================================================================\nPART 1 -- configurable_fields: change a value per call\n==============================================================================\n  default        : default\n  with config    : overridden\n\n  the chain was built once. the value changed at call time, without\n  rebuilding anything -- which is what makes per-tenant settings and\n  A/B tests possible from one deployed object.\n\n==============================================================================\nPART 2 -- configurable_alternatives: swap a whole component\n==============================================================================\n  default (cheap): a cheap answer\n  tier=good      : a careful answer\n\n  one chain object, two models. this is the per-customer model choice\n  from 1.8\'s requirement list, and it is why that column stayed flat.\n\n==============================================================================\nPART 3 -- with_config attaches metadata to a run\n==============================================================================\n  run_name : summarise\n  tags     : [\'prod\', \'v2\']\n  metadata : {\'tenant\': \'acme\'}\n\n  none of this changes behaviour. all of it shows up in a trace, which\n  is the difference between a span tree you can filter and one you\n  cannot. 4.2 is about why that matters at 3am.\n\n==============================================================================\nPART 4 -- config versus state\n==============================================================================\n  config is for values that describe HOW to run:\n    - which model tier\n    - which tenant\n    - a request id\n    - callbacks and tags\n    - max_concurrency\n    - a recursion limit\n\n  NOT for data the chain operates on. that goes in the input. the test:\n  if two concurrent calls could legitimately differ on it AND it is not\n  part of the question being asked, it is config.",
        notes: [
          { t: "p", text: "**The chain was built once and behaved two ways.** That is the whole mechanism: a long-lived object with per-request variation arriving through config, rather than constructing a chain per request." },
          { t: "p", text: "**`configurable_alternatives` swapped an entire component.** This is the \u2018swap the model per customer\u2019 requirement from 1.8, where the raw implementation grew seven lines and the LCEL version grew one \u2014 and this is that line." },
          { t: "p", text: "**It works because of 1.1's uniformity.** The mechanism does not know it is swapping a chat model; it would swap a retriever, a parser or a whole sub-chain identically, since all it needs is that the alternatives satisfy the same interface." },
          { t: "p", text: "**`with_config` changed no behaviour at all**, and that is the point \u2014 run_name, tags and metadata exist for the trace. A name makes a span readable; tags and metadata make a trace queryable, which is what matters once there is volume." },
          { t: "p", text: "**Attach them while building, not when you need them.** The moment you need them is during an incident, and by then every span is called RunnableSequence and the traffic you want to query has already happened." },
          { t: "p", text: "**The test for config against input: if two concurrent calls could legitimately differ on it and it is not part of the question being asked, it is config.** Getting it wrong leaks operational concerns into the prompt, or puts data somewhere the template cannot read." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: an A/B test that needed a deploy", body: [
      { t: "p", text: "A team wants to test two prompt variants. The current design builds the chain at import time with one prompt baked in, so testing the second means a deploy, and splitting traffic means running two deployments and a load balancer rule." },
      { t: "p", text: "`configurable_alternatives` on the prompt removes all of it. One object holds both variants, the arm is chosen from a value that can come from a request header or a hash of the user id, and the experiment is a config change rather than a release. Tagging the run with the arm makes the results queryable in the same trace store as everything else." },
      { t: "p", text: "The broader point is that the configurable mechanisms are not primarily about convenience \u2014 they change what an experiment costs. When trying a variant requires a deploy, teams try fewer variants, and the ones they do try run for longer than they should because reverting is also a deploy." }
    ] }
  ],
  takeaways: [
    "**`configurable_fields` exposes a value for override at call time** without rebuilding the chain.",
    "**`configurable_alternatives` swaps a whole component**, so one object can hold a cheap model and a careful one.",
    "**That is the \u2018swap the model per customer\u2019 requirement from 1.8**, and it is the one line that kept the LCEL column flat.",
    "**It works because of the uniform interface** \u2014 it would swap a retriever, parser or sub-chain the same way.",
    "**This enables per-tenant models, A/B tests, premium tiers and load-shedding** from one deployed object.",
    "**`with_config` changes no behaviour**; run_name, tags and metadata exist entirely for the trace.",
    "**A run name makes a span readable; tags and metadata make a trace queryable** \u2014 the second is what matters at volume.",
    "**Attach them while building**, because the moment you need them is an incident and the traffic has already happened.",
    "**The test: if two concurrent calls could legitimately differ on it and it is not part of the question, it is config.**",
    "**Getting it wrong leaks operational values into the prompt**, or puts data where the template cannot read it.",
    "**Configurability changes what an experiment costs** \u2014 when a variant needs a deploy, teams try fewer of them."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "What is the difference between configurable_fields and configurable_alternatives?",
      options: ["Fields work on models, alternatives on chains",
        "Fields expose a value for override; alternatives swap a whole component",
        "Fields are applied at build time, alternatives at call time",
        "Alternatives are the deprecated form of fields"],
      answer: 1,
      why: "configurable_fields exposes a parameter \u2014 a temperature, a model name \u2014 so a call can override that value. configurable_alternatives registers entire replacement components, so one chain object can hold a cheap model and a careful one and select between them per request. Both are applied at call time through config, and both work on any Runnable, because all the mechanism needs is that the alternatives satisfy the same interface." },
    { stem: "Does `with_config(run_name=..., tags=[...])` change how a chain behaves?",
      options: ["Yes \u2014 tags can route the request to different handlers",
        "No \u2014 it exists entirely for the trace, and that is the point",
        "Yes \u2014 run_name changes which callbacks fire",
        "Only in async execution, where tags affect scheduling"],
      answer: 1,
      why: "None of it affects execution. A run name makes a span readable rather than another row called RunnableSequence, and tags and metadata make the trace queryable \u2014 show me the failures for this tenant, this version, this experiment arm. That second property is what matters at volume, and it is nearly impossible to add retrospectively because by then the traffic you want to query has already happened." },
    { stem: "Is a tenant id config or input?",
      options: ["Input \u2014 it varies per call, and per-call values are inputs",
        "Config \u2014 two concurrent calls could legitimately differ on it and it is not part of the question being asked",
        "Either, as long as it is consistent",
        "Input, because the prompt may need to personalise the answer"],
      answer: 1,
      why: "The test is whether two concurrent calls could legitimately differ on it and whether it is part of the question. A tenant id satisfies both \u2014 it varies per call and it is operational rather than part of what is being asked \u2014 so it is config. The document to summarise also varies per call but is the question itself, so it is input. The exception is if the answer genuinely personalises on it, at which point it is data too." },
    { stem: "Why does configurability change what an experiment costs?",
      options: ["Configurable chains run faster, so experiments complete sooner",
        "Because trying a variant becomes a config change rather than a deploy, so teams try more variants and revert sooner",
        "Because it allows experiments to run without tracing overhead",
        "Because alternatives are evaluated in parallel and compared automatically"],
      answer: 1,
      why: "When a prompt is baked in at import time, testing a second variant means a deploy, and splitting traffic means two deployments and a routing rule. With configurable_alternatives one object holds both and the arm is selected from a request value. The consequence is behavioural rather than technical: when variants are expensive to try, teams try fewer, and leave the ones they do try running longer because reverting is also a deploy." }
  ] },
  interview: { title: "Interview practice", sub: "Runtime configuration", questions: [
    { level: "core", q: "How do you vary a chain's behaviour per request?",
      strong: "A strong answer separates values from components and mentions the deployment consequence.",
      answer: [
        { t: "p", text: "Two mechanisms. configurable_fields exposes a value \u2014 a temperature, a model name, a max tokens \u2014 so a call can override it through config. configurable_alternatives registers whole replacement components, so one chain object can hold a cheap model and a careful one and pick between them per request." },
        { t: "p", text: "The property that matters is that the chain is built once and deployed once. Per-request variation goes through config rather than through constructing a chain per request, which means per-tenant model choice, A/B tests, premium tiers and load-shedding all come from one long-lived object selected by a value that can arrive in a request header." },
        { t: "p", text: "It works because of the uniform interface. configurable_alternatives does not know it is swapping a chat model \u2014 it would swap a retriever, a parser or an entire sub-chain the same way, because all it requires is that the alternatives satisfy the same protocol." },
        { t: "p", text: "The consequence I would actually raise in a design discussion is about experiment cost. If the prompt is baked in at import, trying a variant means a deploy and splitting traffic means two deployments and a routing rule \u2014 so teams try fewer variants and leave them running longer, because reverting is also a deploy. Configurability turns that into a config change." }
      ] },
    { level: "core", q: "What is the rule for config versus input?",
      strong: "A strong answer gives the one-sentence test and both failure directions.",
      answer: [
        { t: "p", text: "If two concurrent calls could legitimately differ on it, and it is not part of the question being asked, it is config." },
        { t: "p", text: "A tenant id differs per call and is not part of the question, so config. A request id, a model tier, callbacks, tags, a concurrency limit, a recursion limit \u2014 all config. The document to summarise also differs per call, but it is the question, so it is input. Same for conversation history and anything the prompt interpolates." },
        { t: "p", text: "Both failure directions are worth naming. Putting operational values into the input leaks them into prompt variables, where they end up in the model's context \u2014 a tenant id in a prompt is at best noise and at worst something you did not mean to send. Putting data into config means the prompt template cannot read it, and you get a missing-variable error, which at least fails loudly." },
        { t: "p", text: "The edge case is a value that is both, like a user's name when the answer is supposed to use it. Then it is data, and it goes in the input, even though it is also operationally interesting." }
      ] },
    { level: "advanced", q: "What would you attach with with_config, and when?",
      strong: "A strong answer distinguishes readable from queryable and insists on doing it early.",
      answer: [
        { t: "p", text: "A run name on every meaningful sub-chain, and tags and metadata carrying the tenant, the deployment version and any experiment arm. None of it changes behaviour \u2014 it exists entirely for the trace." },
        { t: "p", text: "The distinction I would draw is between readable and queryable. A run name makes a span readable, so you are not looking at forty rows all called RunnableSequence and matching step indices by hand. Tags and metadata make the trace queryable, which is the thing that actually matters once there is volume \u2014 show me the failures for this tenant, this version, this arm." },
        { t: "p", text: "And I would attach them while building, not when I need them, because the moment I need them is during an incident. At that point every span is anonymous and, worse, the traffic I want to query has already happened \u2014 I cannot retrospectively tag last Tuesday." },
        { t: "p", text: "The cost is one method call per chain and no behavioural risk, which makes it one of the cheapest things on the production checklist. I would treat an unnamed sub-chain in a review the same way as an unnamed thread." }
      ] }
  ] }
});
