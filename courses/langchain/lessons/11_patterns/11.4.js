EC.receiveLesson({
  id: "11.4",
  lede: "Generate, critique, revise \u2014 and the cost is the part worth measuring first. Three rounds took **3 generator calls plus 3 critic calls**, so **6 model calls** where a single call would have been one, and the tokens are worse than the call count suggests because each generation carries the previous critique and each critique carries the full draft. The gain has a shape: the **first revision added the most**, which is why the honest question is not *does reflection help* but *where does another round stop helping*. And the limit is structural \u2014 the critic is the same model with a different prompt, so it **shares the generator's blind spots**.",
  objectives: [
    "Build a generate-critique-revise loop",
    "Count the model calls and explain why tokens are worse",
    "Say where the gain comes from and where it stops",
    "Explain what reflection cannot catch and why",
    "Give the router three exits rather than two"
  ],
  prerequisites: ["10.5", "7.4"],
  blocks: [
    { t: "h2", n: "01", id: "loop", text: "Generate, critique, revise", sub: "Three rounds" },
    { t: "code", lang: "text", title: "The trace",
      code: "generate\ncritique: Too terse. State the payment method.\ngenerate\ncritique: Better. Add the processing time.\ngenerate\ncritique: GOOD\n\nrounds: 3\nfinal : 'Refunds are available within 30 days of purchase and are\n         processed to the original payment method within 5 business days.'",
      caption: "The critique feeds back into the next generation." },
    { t: "h2", n: "02", id: "cost", text: "The cost, counted", sub: "And the tokens are worse" },
    { t: "code", lang: "text", title: "Model calls",
      code: "generator calls: 3\ncritic calls   : 3\ntotal          : 6 model calls for one answer",
      caption: "A single call would have been **1**." },
    { t: "callout", kind: "warn", title: "The token cost is worse than 6\u00d7", body: [
      { t: "p", text: "Each generation carries the previous critique, and each critique carries the full draft. So the per-call token count grows with the round number \u2014 the sixth call is the most expensive one, not an equal sixth of the total." },
      { t: "p", text: "Which means the honest way to price reflection is in tokens rather than calls, and the growth is superlinear in rounds. A \u201cjust add one more round\u201d change is not a sixth more cost." }
    ] },
    { t: "h2", n: "03", id: "gain", text: "Where the gain comes from", sub: "And where it stops" },
    { t: "code", lang: "text", title: "The three drafts",
      code: "round 1: 'Refunds take 30 days.'\nround 2: 'Refunds are available within 30 days of purchase, processed to\n          the original payment method.'\nround 3: 'Refunds are available within 30 days of purchase and are processed\n          to the original payment method within 5 business days.'",
      caption: "The **first** revision added the most." },
    { t: "callout", kind: "insight", title: "Two rounds is the common answer, for a structural reason", body: [
      { t: "p", text: "The critic is the same model with a different prompt, so it shares the generator's blind spots. A third round tends to find style issues rather than errors \u2014 because the errors it can see, it already saw." },
      { t: "p", text: "So the diminishing return is not a tuning artefact to be optimised away. It follows from the critic and the generator being the same thing, and it is why a *different* model as critic, or a critic with **retrieved documents** in front of it, behaves differently." }
    ] },
    { t: "h2", n: "04", id: "cannot", text: "What reflection cannot catch", sub: "7.4's finding, in a new place" },

    {"kind": "timeline", "title": "Reflection costs 6 calls where 1 would do", "caption": "Generate, critique, revise — and the cost is the part worth measuring first. Three rounds took **3 generator calls plus 3 critic calls**, so six model calls against one, and the token count grows faster still because each round carries the critique.", "span": 7, "tick": 1, "unit": "model calls", "lanes": [{"label": "a single call", "bars": [[0, 1, "1", "good"]]}, {"label": "1 round", "bars": [[0, 2, "2", "teal"]]}, {"label": "2 rounds", "bars": [[0, 4, "4", "warn"]]}, {"label": "3 rounds", "bars": [[0, 6, "6 — for one answer", "crit"]]}], "t": "diagram", "id": "dg-11_4-04-0"},




    { t: "p", text: "It cannot catch what the model does not know. A factual error the model believes produces a critique that **confirms** it \u2014 which is 7.4's measurement in a new setting: a model checking its own output shares the error it is checking for." },
    { t: "table", head: ["reflection improves", "reflection does not reliably improve"], rows: [
      ["completeness \u2014 it noticed the payment method was missing", "factual accuracy against the world"],
      ["structure \u2014 format, ordering, tone", "anything requiring information the model lacks"],
      ["instruction-following \u2014 did it answer the question asked", ""]
    ] },
    { t: "callout", kind: "mental", title: "A complement to grounding, not a substitute", body: [
      { t: "p", text: "A critic with the **retrieved documents** in front of it can catch a factual error; a critic working from memory cannot. So reflection and retrieval address different failures and neither replaces the other." },
      { t: "p", text: "Which also suggests the cheapest useful version: give the critic the sources. That costs tokens and turns an unverifiable critique into a checkable one \u2014 the same move 5.7 made with citations." }
    ] },
    { t: "h2", n: "05", id: "guard", text: "Three exits, not two", sub: "10.5's progress check" },
    { t: "p", text: "A critic that says the same thing twice means the loop is not converging. So the router wants three exits:" },
    { t: "ul", items: [
      "the critique says it is good \u2192 `END`",
      "the round budget is spent \u2192 `END`, **with a flag**",
      "the critique is **unchanged** \u2192 `END`, with a flag"
    ] },
    { t: "callout", kind: "good", title: "And record which exit fired", body: [
      { t: "p", text: "*\u201cGood enough\u201d* and *\u201cran out of rounds\u201d* producing the same output is how a reflection loop quietly becomes an expensive no-op (10.5). The output alone cannot distinguish them." },
      { t: "p", text: "So the flag is not optional monitoring \u2014 it is the only signal that tells you whether the loop is doing work. A loop whose budget is always the exit has no real exit condition." }
    ] },
    { t: "exercise", kind: "build", title: "Build reflection and price it",
      difficulty: "core", minutes: 32,
      body: "Build a generate-critique-revise loop with scripted generator and critic models, running until the critique approves or a round budget is spent. Count the model calls and explain why the token cost grows faster than the call count. Show the three drafts and say where the gain came from. Explain what reflection cannot catch and why that is structural. Finally give the router three exits and say why recording which one fired matters.",
      requirements: ["Build a generate-critique-revise loop with a round budget",
        "Count generator and critic calls separately and give the total",
        "Explain why the token cost is worse than the call count suggests",
        "Show the drafts and identify where the gain came from",
        "Explain why two rounds is the common answer, structurally",
        "Say what reflection cannot catch and why",
        "Give the router three exits and explain the flag"],
      hint: "Count the critic's calls as well as the generator's. The total is the number that decides whether the pattern is worth it.",
      solution: { lang: "python", title: "x1104.py \u2014 6 model calls for one answer",
        code: 'def generate(state):\n    prompt = [HumanMessage(content="Answer the refund question.")]\n    if state["critique"]:\n        prompt.append(HumanMessage(content="Revise given: %s" % state["critique"]))\n    out = gen.invoke(prompt)\n    return {"draft": out.content, "rounds": 1, "trace": ["generate"]}\n\ndef good_enough(state):\n    if state["critique"].startswith("GOOD"):\n        return END\n    if state["rounds"] >= 3:\n        return END          # <- and flag WHY it ended\n    return "generate"\n\nprint(len(gen.seen), len(crit.seen))       # 3 3',
        out: "==============================================================================\nPART 1 -- generate, critique, revise\n==============================================================================\n    generate\n    critique: Too terse. State the payment m\n    generate\n    critique: Better. Add the processing tim\n    generate\n    critique: GOOD\n\n  rounds: 3\n  final : 'Refunds are available within 30 days of purchase and are processed to the original payment method within 5 business days.'\n==============================================================================\nPART 2 -- the cost, counted\n==============================================================================\n  generator calls: 3\n  critic calls   : 3\n  total          : 6 model calls for one answer\n\n  a single call would have been 1. so reflection cost 6x the model\n  calls, and the tokens are worse than the call count suggests --\n  each generation carries the previous critique, and each critique\n  carries the full draft.\n==============================================================================\nPART 3 -- where the gain actually comes from\n==============================================================================\n  round 1: 'Refunds take 30 days.'\n  round 2: 'Refunds are available within 30 days of purchase, processed to the original payment method.'\n  round 3: 'Refunds are available within 30 days of purchase and are processed to the original payment method within 5 business days.'\n\n  the first revision added the most. that is the usual shape, and it\n  is why the honest question is not 'does reflection help' but\n  'where does another round stop helping'.\n\n  two rounds is the common answer, and the reason is structural: the\n  critic is the same model with a different prompt, so it shares the\n  generator's blind spots. a third round tends to find style issues\n  rather than errors, because the errors it can see it already saw.\n==============================================================================\nPART 4 -- when reflection does not work\n==============================================================================\n  it cannot catch what the model does not know. a factual error the\n  model believes is a critique that confirms it -- which is 7.4's\n  finding in a new place: a model checking its own output shares the\n  error it is checking for.\n\n  so reflection improves:\n    completeness    (it noticed the payment method was missing)\n    structure       (format, ordering, tone)\n    instruction-following (did it answer the question asked)\n\n  and does not reliably improve:\n    factual accuracy against the world\n    anything requiring information the model lacks\n\n  which means reflection is a complement to grounding, not a\n  substitute. a critic with the RETRIEVED DOCUMENTS in front of it\n  can catch a factual error; a critic working from memory cannot.\n==============================================================================\nPART 5 -- the guard that matters\n==============================================================================\n  10.5's progress check applies directly: a critic that says the\n  same thing twice means the loop is not converging.\n\n  so the router wants three exits, not two:\n    the critique says it is good     -> END\n    the round budget is spent        -> END, with a flag\n    the critique is UNCHANGED        -> END, with a flag\n\n  and recording WHICH exit fired, because 'good enough' and 'ran out\n  of rounds' producing the same output is how a reflection loop\n  quietly becomes an expensive no-op (10.5).",
        notes: [
          { t: "p", text: "**Three rounds cost 6 model calls** \u2014 3 generator plus 3 critic \u2014 where a single call would have been 1." },
          { t: "p", text: "**And the tokens are worse than 6x**: each generation carries the previous critique and each critique carries the full draft, so the cost grows with the round number." },
          { t: "p", text: "**The first revision added the most**, which is the usual shape \u2014 so the question is where another round stops helping, not whether reflection helps." },
          { t: "p", text: "**Two rounds is the common answer for a structural reason**: the critic is the same model with a different prompt, so it shares the generator's blind spots." },
          { t: "p", text: "**A third round finds style rather than errors**, because the errors it can see it already saw." },
          { t: "p", text: "**Reflection cannot catch what the model does not know** \u2014 a believed factual error produces a critique that confirms it (7.4)." },
          { t: "p", text: "**So it improves completeness, structure and instruction-following**, and not factual accuracy against the world \u2014 making it a complement to grounding rather than a substitute." },
          { t: "p", text: "**Give the router three exits**: good enough, budget spent, and critique unchanged \u2014 and record which fired, or an expensive no-op is indistinguishable from success (10.5)." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the reflection loop that fixed nothing", body: [
      { t: "p", text: "A summarisation service adds a reflection loop with three rounds to improve quality. Costs triple. A sample review finds the summaries are better written and still contain the same factual errors they had before \u2014 including a wrong date that appears in every version of one summary." },
      { t: "p", text: "The critic is the same model that wrote the summary, working from the same context. It cannot see that the date is wrong, because the belief that produced the date is the belief it is checking with. So it critiques what it can assess \u2014 phrasing, completeness, structure \u2014 and the facts pass unchallenged three times." },
      { t: "p", text: "Two changes, and they are different in kind. Give the critic the **source document**, which turns an unverifiable critique into a checkable one and is the only version that can catch a wrong date. And stop at two rounds, since the measurements show the first revision carries most of the gain. The transferable point is that reflection improves what a model can **judge** about its own output, and factual accuracy against a source is not that \u2014 it needs the source." }
    ] }
  ],
  takeaways: [
    "**Three rounds cost 6 model calls** \u2014 3 generator plus 3 critic \u2014 against 1 for a single call.",
    "**And the tokens are worse than 6x**, because each call carries the previous round's output.",
    "**So price reflection in tokens, not calls** \u2014 the growth is superlinear in rounds.",
    "**The first revision added the most**, which is the usual shape.",
    "**So the question is where another round stops helping**, not whether reflection helps.",
    "**Two rounds is the common answer, structurally**: the critic shares the generator's blind spots.",
    "**Because it is the same model with a different prompt.**",
    "**A third round finds style rather than errors** \u2014 the errors it can see, it already saw.",
    "**Reflection cannot catch what the model does not know** (7.4).",
    "**It improves completeness, structure and instruction-following.**",
    "**It does not reliably improve factual accuracy against the world.**",
    "**So it complements grounding rather than replacing it** \u2014 give the critic the sources.",
    "**Three exits, not two**: good enough, budget spent, and critique unchanged.",
    "**Record which exit fired**, or an expensive no-op is indistinguishable from success."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A three-round reflection loop made 6 model calls. Why is the token cost worse than six times a single call?",
      options: ["Critic prompts are longer than generator prompts",
        "Each generation carries the previous critique and each critique carries the full draft, so per-call tokens grow with the round",
        "The framework retries failed critiques",
        "Reflection requires a larger model"],
      answer: 1,
      why: "The calls are not equal in size: round three's generation includes round two's critique, and that critique included round two's full draft. So the last call is the most expensive rather than an equal sixth. Pricing reflection in calls understates it, and 'just one more round' is not a sixth more cost." },
    { stem: "Why does a third round of reflection typically help less than the first?",
      options: ["The model becomes less careful as context grows",
        "The critic is the same model with a different prompt, so it shares the generator's blind spots \u2014 the errors it can see, it already saw",
        "Diminishing returns are a property of all iterative processes",
        "The critique prompt degrades with repetition"],
      answer: 1,
      why: "The diminishing return is structural rather than incidental. One model cannot critique a belief it holds, so the issues it is capable of noticing surface in the first pass or two; after that it finds style. That is also why a different model as critic, or a critic given the source documents, behaves differently." },
    { stem: "What does reflection reliably fail to improve?",
      options: ["Response structure and formatting",
        "Factual accuracy against the world \u2014 a believed error produces a critique that confirms it",
        "Whether the answer addressed the question",
        "Completeness of the response"],
      answer: 1,
      why: "A model checking its own output shares the error it is checking for, so a wrong fact the model believes passes every round unchallenged. That is the same finding as a model judging whether its answer is grounded. Reflection improves what the model can judge \u2014 completeness, structure, instruction-following \u2014 and factual accuracy against a source requires the source." },
    { stem: "Why does a reflection router need three exits rather than two?",
      options: ["To handle generator failures separately",
        "Because a critique that repeats means the loop is not converging, and 'good enough' versus 'budget spent' must be distinguishable",
        "To allow a human approval step",
        "To support a variable number of rounds"],
      answer: 1,
      why: "Exiting only on approval or budget means a non-converging loop burns the full budget producing identical output, and the result looks the same as a successful run. A progress check catches the stalled case, and recording which exit fired is what reveals that the loop's budget is always the exit \u2014 the signature of a loop with no real exit condition." }
  ] },
  interview: { title: "Interview practice", sub: "Reflection", questions: [
    { level: "core", q: "Is reflection worth the cost?",
      strong: "A strong answer prices it and names what it improves.",
      answer: [
        { t: "p", text: "Sometimes, and I would price it before deciding. I measured three rounds costing six model calls \u2014 three generations and three critiques \u2014 against one for a single call." },
        { t: "p", text: "And the token cost is worse than the call count, because each generation carries the previous critique and each critique carries the full draft. So the sixth call is the most expensive one, not an equal sixth, and the growth is superlinear in rounds." },
        { t: "p", text: "What it buys is real but specific. In my measurements the first revision added the most \u2014 it caught a missing piece of information \u2014 and the third found phrasing. So reflection improves completeness, structure and instruction-following." },
        { t: "p", text: "What it does not improve is factual accuracy, and that is structural: the critic is the same model with a different prompt, so it shares the generator's blind spots. A wrong fact the model believes gets a critique that confirms it. So I would treat reflection as a complement to grounding, and if accuracy is the problem I would give the critic the source documents rather than add rounds." }
      ] },
    { level: "advanced", q: "How would you decide how many reflection rounds to use?",
      strong: "A strong answer stops at two and instruments the exits.",
      answer: [
        { t: "p", text: "Two as a default, and then instrument it rather than guess \u2014 because the thing I actually want to know is whether the loop is doing work, and the output cannot tell me." },
        { t: "p", text: "Two is the default for a structural reason rather than an empirical one. The critic and the generator are the same model, so the issues it is capable of noticing surface in the first pass or two. After that it finds style, because the errors it can see it already saw." },
        { t: "p", text: "For instrumentation I would give the router three exits and record which fired: the critique approved, the budget was spent, or the critique was unchanged from the previous round. That third one is the progress check, and it is what catches a non-converging loop burning the full budget on identical output." },
        { t: "p", text: "The flag matters because 'good enough' and 'ran out of rounds' produce the same output, so a loop whose budget is always the exit looks exactly like a working one. I have seen that cost triple for no quality change, undetected for months." },
        { t: "p", text: "If the exits show the budget always firing, the answer is not more rounds \u2014 it is that the critic's threshold is unreachable or the critic has nothing useful to say, and both are better fixed than funded." }
      ] },
    { level: "core", q: "How would you make a critic more useful than a second pass of the same model?",
      strong: "A strong answer gives the critic something the generator lacked.",
      answer: [
        { t: "p", text: "By giving it something the generator did not have, because otherwise it shares the generator's blind spots by construction and can only find style." },
        { t: "p", text: "The cheapest and most effective version is the source documents. A critic with the retrieved passages in front of it can check a claim against them; a critic working from memory is asking the model whether it believes what it just said. That turns an unverifiable critique into a checkable one \u2014 the same move citations make." },
        { t: "p", text: "A different model is the other option, and it helps for a specific reason: its errors are not perfectly correlated with the generator's. Though I would be careful about the version of that argument where both models are from the same family and trained on similar data \u2014 then the independence is smaller than it looks." },
        { t: "p", text: "A checklist in the critic's prompt is underrated. 'Does it state the time period, the destination and the exceptions' gives the critic criteria rather than a general invitation to find fault, and criteria are testable." },
        { t: "p", text: "And where a deterministic check exists, use it instead: a schema validating, a number parsing, a citation resolving to a retrieved id. Those are free, exact, and they catch things no critic reliably does." }
      ] }
  ] }
});
