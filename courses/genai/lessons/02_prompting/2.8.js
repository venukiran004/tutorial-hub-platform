EC.receiveLesson({
  id: "2.8",

  lede: "When one call is doing four jobs and failing at all of them, the answer is usually not a better prompt — it is four calls. Decomposition breaks a task into steps whose outputs feed each other, and it buys three things a single call cannot give: each step can be evaluated on its own, each can use a different model, and a failure has a location. It costs latency and, measured here, **1.90× the money** — which is less than the 3× people expect, for a reason worth understanding.",

  objectives: [
    "Decide when a task should be decomposed rather than prompted harder",
    "Implement the three chaining patterns: sequential, routing, and critique-and-refine",
    "Account for the cost and latency of a chain against a single call",
    "Identify where error compounds through a chain and how to bound it",
    "Say what decomposition buys that a single call cannot, regardless of prompt quality"
  ],

  prerequisites: ["2.1", "2.3"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "sequential", text: "The sequential chain",
      sub: "Each step's output is the next step's input" },

    { t: "code", lang: "python", title: "chain.py — the reference's example", code: `step1 = model.invoke("Extract all technical claims from this paper: {paper}")
step2 = model.invoke(f"For each claim, find supporting evidence: {step1}")
step3 = model.invoke(f"Write a critical review based on: {step2}")`,
      caption: "From 04_Prompt_Engineering.md §8. Three calls where a single \"review this paper\" prompt would have been one — and the paper itself appears only in the first." },

    { t: "p", text: "That last detail is the key to the economics. A naive expectation is that three calls cost three times one call, and they do not, because the large input — the paper — is consumed once and replaced by a much smaller intermediate. Step 2 sees a list of claims, not the document." },

    { t: "code", lang: "python", title: "g25.py — the cost, worked", code: `DOC, SYS = 3000, 200
single = SYS + DOC + 400
chain  = [("extract claims", SYS, DOC, 300),
          ("find evidence",  SYS, 300, 400),
          ("write review",   SYS, 400, 500)]`,
      out: `  single call : in  3200  out  400
  extract claims  in  3200  out  300
  find evidence   in   500  out  400
  write review    in   600  out  500
  chain total : in  4300  out 1200

  cost single: $0.012000   chain: $0.022750   ratio 1.90x
  latency    : 1 round trip vs 3 sequential round trips

  the document is sent ONCE in the chain because step 1 summarises it --
  that is the whole reason decomposition is not simply 3x the cost.`,
      hl: [7, 8],
      caption: "**1.90×, not 3×.** Input grew by only 34% because the document appears once; output tripled, which is where most of the increase is. The three round trips are the cost users feel." },

    { t: "callout", kind: "insight", title: "Decomposition is cheap on input and expensive on output",
      body: [
        { t: "p", text: "Input rose 3,200 → 4,300 tokens, a 34% increase, and almost all of that is the system prompt being re-sent three times. Output rose 400 → 1,200, a clean 3×, because each step produces a full response." },
        { t: "p", text: "Since output is priced several times higher than input (1.14), the cost of a chain is dominated by the intermediates — which means the lever is **making intermediates terse**, not making prompts shorter. A step that emits a bulleted list of claims rather than prose about them can halve the chain's cost." },
        { t: "p", text: "It also means the economics get better as the source document gets larger, because the one-time cost of reading it is amortised across a fixed number of steps. On a 30,000-token document the same chain is closer to 1.2× than 1.9×." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "patterns", text: "Three patterns",
      sub: "Sequential, routing, and critique-and-refine" },

    { t: "viz", title: "The three shapes", caption: "Sequential transforms, routing selects, critique loops. Most real pipelines are a routing step in front of several sequential chains.",
      svg: `<svg viewBox="0 0 760 244" width="100%" role="img" aria-label="Three chaining patterns">
  <defs>
    <marker id="ch-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--line)"/>
    </marker>
  </defs>

  <text x="16" y="26" class="s-label" style="fill:var(--accent)">sequential</text>
  <rect x="16" y="36" width="88" height="30" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="60" y="55" text-anchor="middle" class="s-sub">extract</text>
  <rect x="128" y="36" width="88" height="30" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="172" y="55" text-anchor="middle" class="s-sub">evidence</text>
  <rect x="240" y="36" width="88" height="30" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="284" y="55" text-anchor="middle" class="s-sub">review</text>
  <line x1="104" y1="51" x2="124" y2="51" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#ch-a)"/>
  <line x1="216" y1="51" x2="236" y2="51" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#ch-a)"/>
  <text x="350" y="55" class="s-sub">each output is the next input; the document is read once</text>

  <text x="16" y="110" class="s-label" style="fill:var(--good)">routing</text>
  <rect x="16" y="120" width="88" height="30" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="60" y="139" text-anchor="middle" class="s-sub">classify</text>
  <rect x="150" y="98" width="98" height="24" rx="5" class="s-fill-2 s-stroke"/>
  <text x="199" y="114" text-anchor="middle" class="s-sub">FACTUAL prompt</text>
  <rect x="150" y="128" width="98" height="24" rx="5" class="s-fill-2 s-stroke"/>
  <text x="199" y="144" text-anchor="middle" class="s-sub">CODE prompt</text>
  <rect x="150" y="158" width="98" height="24" rx="5" class="s-fill-2 s-stroke"/>
  <text x="199" y="174" text-anchor="middle" class="s-sub">CREATIVE prompt</text>
  <line x1="104" y1="135" x2="146" y2="112" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ch-a)"/>
  <line x1="104" y1="135" x2="146" y2="140" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ch-a)"/>
  <line x1="104" y1="135" x2="146" y2="168" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ch-a)"/>
  <text x="270" y="139" class="s-sub">one cheap call picks the specialist prompt — and the model</text>
  <text x="270" y="155" class="s-sub">that runs it, which is where the saving is (11.9)</text>

  <text x="16" y="210" class="s-label" style="fill:var(--warn)">critique and refine</text>
  <rect x="16" y="218" width="76" height="26" rx="5" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="54" y="235" text-anchor="middle" class="s-sub">draft</text>
  <rect x="116" y="218" width="76" height="26" rx="5" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="154" y="235" text-anchor="middle" class="s-sub">critique</text>
  <rect x="216" y="218" width="76" height="26" rx="5" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="254" y="235" text-anchor="middle" class="s-sub">revise</text>
  <line x1="92" y1="231" x2="112" y2="231" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#ch-a)"/>
  <line x1="192" y1="231" x2="212" y2="231" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#ch-a)"/>
  <text x="314" y="235" class="s-sub">the critique step needs something the draft step did not have, or it is theatre</text>
</svg>` },

    { t: "code", lang: "python", title: "patterns.py — routing and critique", code: `# ---- routing: one cheap call selects the specialist path --------------
category = call(f"""Classify this query into one category:
- FACTUAL: Simple fact lookup
- ANALYTICAL: Requires reasoning or calculation
- CREATIVE: Requires creative writing
- CODE: Requires code generation

Query: {query}
Category:""", model="gpt-4o-mini", max_tokens=4)

answer = call(PROMPTS[category].format(query=query), model=MODELS[category])

# ---- critique and refine ----------------------------------------------
draft    = call(f"Answer this question: {question}")
critique = call(f"Review this answer for errors: {draft}")
final    = call(f"Improve the answer based on this critique: {critique}")`,
      hl: [9, 11],
      caption: "The router is the pattern with the clearest payoff: a 4-token classification on a cheap model chooses both the prompt and the model for the expensive call. 11.9 prices it." },

    { t: "callout", kind: "tradeoff", title: "Critique-and-refine needs new information to be worth anything",
      body: [
        { t: "p", text: "If the critique step is the same model seeing the same information, it is being asked to find errors it just made — and the errors it made are, by construction, the ones it does not think are errors. The gains from self-critique alone are much smaller than the 3× cost suggests, and can be zero." },
        { t: "p", text: "It earns its keep when the critique step has something the draft did not: a retrieved document to check against, a tool that verifies a calculation, a checklist the draft was not shown, or a different and stronger model." },
        { t: "p", text: "The same argument appears in 2.4 about tree-of-thought's evaluator, and in 9.10 about LLM-as-a-judge. It is the recurring one in this area: **a model evaluating its own output inherits its own blind spots**, and the fix is always to give the evaluator something the generator lacked." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "compounding", text: "Error compounds through a chain",
      sub: "Three steps at 90% is not 90%" },

    { t: "p", text: "Each step in a chain has its own failure rate, and a later step operating on a wrong intermediate cannot recover — it produces a competent answer to the wrong question. The arithmetic is unforgiving." },

    { t: "table",
      head: ["Per-step accuracy", "2 steps", "3 steps", "5 steps", "8 steps"],
      rows: [
        ["0.99", "0.980", "0.970", "0.951", "0.923"],
        ["0.95", "0.903", "0.857", "0.774", "0.663"],
        ["0.90", "0.810", "0.729", "0.590", "0.430"],
        ["0.80", "0.640", "0.512", "0.328", "0.168"]
      ],
      caption: "Independent failures, so the chain's accuracy is the product. A five-step chain of 90%-accurate steps is right **59%** of the time, and an eight-step chain of 80% steps is right 17%." },

    { t: "p", text: "That table is the case against decomposing indefinitely, and it is the reason a long agent loop (2.5) is fragile in a way a short chain is not. It also explains a counterintuitive observation: adding a step to \"improve quality\" can reduce end-to-end accuracy, because the new step's own failure rate multiplies in." },

    { t: "callout", kind: "good", title: "Bound the compounding rather than accepting it",
      body: [
        { t: "p", text: "**Validate between steps.** A step whose output fails a check is caught before it contaminates the next one. Extraction produces a list — check it is non-empty and well-formed before the next call sees it. This converts a wrong answer into a visible failure." },
        { t: "p", text: "**Keep the original available.** The later steps should be able to see the source, not only the previous intermediate. It costs tokens and it means an error at step 1 is recoverable rather than fatal." },
        { t: "p", text: "**Prefer fewer, larger steps** where the model can handle them. Two steps at 0.95 beat four at 0.97 — 0.903 against 0.885 — which is not obvious until you do the arithmetic." },
        { t: "p", text: "**Measure each step separately.** This is the thing decomposition buys and people routinely fail to collect: with a chain, you can know which step is at 0.82. With a single call you can only know the whole thing is." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "when", text: "When to decompose",
      sub: "And when it is over-engineering" },

    { t: "dl", items: [
      ["Decompose when steps need different treatment", "Extraction wants temperature 0 and a schema; the summary wants temperature 0.7 and prose. A single call has one set of parameters, so it must compromise on both — and 1.3's SQL incident is exactly this failure."],
      ["Decompose when you need a failure location", "\"The output is wrong\" is not debuggable. \"Step 2 returned an empty list\" is. If a feature is going to be maintained, this alone can justify the cost."],
      ["Decompose when steps want different models", "The expensive model for the reasoning step and a cheap one for extraction and formatting is often a larger saving than any prompt optimisation."],
      ["Do not decompose to make a prompt tidier", "If a single call does the job, splitting it triples the latency, multiplies the failure modes and compounds the error for no benefit. The measured 1.90× is the price of the split, and it buys nothing when there was no problem."]
    ] },

    { t: "p", text: "The honest test is the same as 2.5's: if you can draw the flowchart, the steps are real and belong in code. If you are splitting a call because the prompt got long, you are moving the complexity rather than reducing it — and adding two more places for it to fail." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the chain length that maximises end-to-end accuracy",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Decomposition makes each step easier and therefore more accurate, and multiplies more failure rates together. Those pull in opposite directions, so there is an optimum — and it is not \"as many steps as possible\"." },
        { t: "p", text: "Model both effects and find it." }
      ],
      requirements: [
        "Model per-step accuracy as rising with the number of steps: a task split into k pieces has per-step accuracy a(k) = min(0.995, base + gain × log(k))",
        "Compute end-to-end accuracy as a(k) raised to the power k, for k from 1 to 12",
        "Report the optimum for base accuracies of 0.70, 0.85 and 0.95",
        "Report what happens to the optimum as the per-step gain from splitting rises",
        "State the assumption in this model that is most likely to be wrong"
      ],
      hint: "The two forces are `a(k)` rising and the exponent `k` rising. Sweep k and take the argmax of `a(k) ** k`.",
      solution: { lang: "python", title: "g28_ex.py",
        code: `import math

def a(k, base, gain):
    """per-step accuracy: splitting makes each step easier, with diminishing return"""
    return min(0.995, base + gain * math.log(k))

def end_to_end(k, base, gain):
    return a(k, base, gain) ** k

for base in (0.70, 0.85, 0.95):
    print("base per-step accuracy %.2f" % base)
    print("  %-6s %10s %14s" % ("gain", "best k", "accuracy"))
    for gain in (0.02, 0.05, 0.10, 0.20):
        best = max(range(1, 13), key=lambda k: end_to_end(k, base, gain))
        print("  %-6.2f %10d %14.4f   (k=1 gives %.4f)"
              % (gain, best, end_to_end(best, base, gain), base))
    print()`,
        out: `base per-step accuracy 0.70
  gain       best k       accuracy
  0.02            1         0.7000   (k=1 gives 0.7000)
  0.05            1         0.7000   (k=1 gives 0.7000)
  0.10            1         0.7000   (k=1 gives 0.7000)
  0.20            5         0.9752   (k=1 gives 0.7000)

base per-step accuracy 0.85
  gain       best k       accuracy
  0.02            1         0.8500   (k=1 gives 0.8500)
  0.05            1         0.8500   (k=1 gives 0.8500)
  0.10            5         0.9752   (k=1 gives 0.8500)
  0.20            3         0.9851   (k=1 gives 0.8500)

base per-step accuracy 0.95
  gain       best k       accuracy
  0.02           10         0.9511   (k=1 gives 0.9500)
  0.05            3         0.9851   (k=1 gives 0.9500)
  0.10            2         0.9900   (k=1 gives 0.9500)
  0.20            2         0.9900   (k=1 gives 0.9500)`,
        notes: [
          { t: "p", text: "The result is bimodal rather than smooth, which is the interesting part. At low splitting gain the optimum is **exactly 1** — do not decompose. Once the gain is large enough to matter the optimum jumps straight to 3 or 5, and then comes back down as the base accuracy rises, because a strong model needs fewer splits to reach the ceiling. There is no gentle middle where four steps beats three by a little." },
          { t: "p", text: "The left column is the practical one. At a gain of 0.02 or 0.05 the optimum is k=1 for both the weak and the medium base — **do not decompose at all**. If splitting does not make the sub-tasks meaningfully easier, every extra step is a fresh failure rate multiplying in with nothing to offset it. One row is an artefact worth flagging: base 0.95, gain 0.02, optimum k=10 at 0.9511 — that is the 0.995 ceiling doing the work, and a win of one part in a thousand for ten times the calls is not a recommendation." },
          { t: "p", text: "The assumption most likely to be wrong is **independence**. Real chain failures are correlated: a document the extraction step misreads is usually a document the summarisation step would also have struggled with, so the product understates the true accuracy. It also ignores recovery — a later step that can see the source, as §03 recommends, sometimes fixes an earlier error rather than inheriting it. So treat this as the pessimistic bound that establishes the *shape*: small optima, and a real threshold below which decomposition costs accuracy as well as money." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the six-step pipeline that was less accurate than the one call it replaced",
      body: [
        { t: "p", text: "**Symptom.** A contract-review feature was rebuilt from a single call into a six-step pipeline — parse, classify clauses, extract obligations, check against policy, rank by risk, write the summary — for maintainability. End-to-end accuracy, measured on the same golden set, fell from 0.81 to 0.68." },
        { t: "p", text: "**What the per-step numbers showed.** Every step measured between 0.93 and 0.98 in isolation, which is why nobody expected a problem. The product of six such numbers is about 0.70, and the observed 0.68 was well within noise of that. Each step was genuinely good; the chain was not." },
        { t: "p", text: "**Mechanism.** The rebuild made each sub-task easier — which is real, and is why every step scored above 0.93 where the single call scored 0.81 overall. But the gain per step was nowhere near enough to offset six multiplications. This is the left column of the exercise: at a small per-step gain, the optimum number of steps is one." },
        { t: "p", text: "**Fix.** The pipeline was collapsed to three steps — parse and classify together, extract and check together, then summarise — which took end-to-end accuracy to 0.86, above where it started. Two structural changes came with it: each step validates its output before passing it on, so a bad intermediate fails loudly instead of contaminating the next step; and every step can see the original contract rather than only the previous intermediate, which makes an early error recoverable. The maintainability argument for decomposing was sound and the six-way split was simply too fine — and nobody had done the multiplication before building it." }
      ] }
  ],

  takeaways: [
    "**Decomposition is not 3× the cost.** Measured on the reference's three-step chain: 1.90×, because the large document is consumed once and replaced by a small intermediate.",
    "Input rose 34% and output rose 3× — so a chain's cost is dominated by its **intermediates**, and the lever is making them terse rather than making prompts shorter.",
    "The economics improve as the source document grows, because reading it once is amortised across a fixed number of steps.",
    "Three patterns: **sequential** transforms, **routing** selects a specialist prompt and model, **critique-and-refine** loops.",
    "**Critique-and-refine needs new information** — a retrieved document, a tool, a checklist, a stronger model. A model reviewing its own output inherits its own blind spots, which is the same point as 2.4's evaluator and 9.10's judge.",
    "**Error compounds multiplicatively.** Five steps at 0.90 gives 0.590; eight steps at 0.80 gives 0.168. Adding a step to improve quality can reduce end-to-end accuracy.",
    "Bound it: validate between steps, keep the original available to later steps, prefer **fewer larger steps** (two at 0.95 beat four at 0.97), and measure each step separately.",
    "Measuring each step is what decomposition buys and what teams routinely fail to collect — with a chain you can know step 2 is at 0.82; with one call you can only know the whole thing is.",
    "Modelled across a grid of base accuracies and splitting gains, the optimum is **bimodal**: exactly 1 whenever splitting does not make sub-tasks substantially easier, and jumping to 3–5 once it does. There is no gentle middle, and no setting tested made a long chain optimal.",
    "Decompose when steps need different parameters, different models, or a failure location. **Do not decompose to make a prompt tidier** — that moves complexity rather than reducing it."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A three-step chain replaces one call on a 3,000-token document. What is the cost ratio?",
        options: ["About 3×, one per call", "About 1.9× — the document is read once and replaced by a small intermediate", "About 1×", "It depends entirely on the model"],
        answer: 1,
        why: "Measured, input rose only 34% because the document appears in step 1 and is replaced by a 300-token list of claims thereafter, while output tripled — giving 1.90× overall. The 3× intuition assumes every call carries the same input, which is exactly what decomposition avoids. It cannot be 1×, since output genuinely triples. The ratio does depend on the document size — it approaches 1.2× on a 30,000-token document — but the mechanism is the same on any model." },

      { stem: "Each step of a five-step chain is 90% accurate. What is end-to-end accuracy?",
        options: ["90%", "About 59%", "About 45%", "It cannot be computed"],
        answer: 1,
        why: "Independent failures multiply, so it is 0.9⁵ = 0.590 — which is why a chain of individually good steps can be a poor pipeline, and why adding a step to improve quality can reduce end-to-end accuracy. The first option ignores compounding entirely. The product assumption is pessimistic in practice, because real failures are correlated and a later step that can see the source sometimes recovers, but it establishes the shape correctly and it is computable." },

      { stem: "Your critique-and-refine chain shows almost no improvement over the draft alone. Why?",
        options: ["The critique prompt needs rewording", "The critique step has the same information the draft step had, so it is asked to find errors it does not think are errors", "Three steps is too few", "Temperature is too low"],
        answer: 1,
        why: "A model reviewing its own output with no new information inherits its own blind spots — the errors it made are by construction the ones it does not recognise as errors — so self-critique alone gains much less than its 3× cost implies. The fix is to give the critique step something the draft lacked: a retrieved document to check against, a tool that verifies a calculation, a checklist, or a stronger model. Rewording and temperature do not change what information is available, and more steps compounds more failures." },

      { stem: "When should you NOT decompose a task?",
        options: ["When it involves multiple models", "When splitting does not make the sub-tasks meaningfully easier", "When latency matters", "When the task is long"],
        answer: 1,
        why: "Modelled across base accuracies and splitting gains, the optimum is k=1 whenever the per-step gain is small — every extra step adds a failure rate that multiplies in, with nothing to offset it, plus latency and cost. That is the quantitative version of \"do not decompose to make a prompt tidier\". Multiple models and long tasks are both reasons *to* decompose. Latency is a real cost of chaining but not the deciding criterion: a chain that materially improves accuracy is often worth three round trips." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Chaining questions separate people who have shipped a pipeline from people who have drawn one.",
    questions: [
      { level: "core",
        q: "When would you break one prompt into several calls?",
        strong: "A strong answer gives reasons that are about capability rather than tidiness, and names the cost.",
        answer: [
          { t: "p", text: "Three good reasons. When steps need different parameters — extraction wants temperature 0 and a schema, the summary wants 0.7 and prose, and one call has to compromise on both. When steps want different models, where the expensive one does the reasoning and a cheap one does extraction and formatting. And when you need a failure location: \"the output is wrong\" is not debuggable, \"step 2 returned an empty list\" is." },
          { t: "p", text: "The cost is smaller than people expect. I measured the reference's three-step chain at 1.90× a single call, not 3×, because the source document is read once and replaced by a much smaller intermediate. Input rose 34% and output tripled." },
          { t: "p", text: "The reason I would not do it is tidiness. Splitting a call because the prompt got long moves complexity rather than reducing it, and adds two more places to fail." }
        ] },

      { level: "advanced",
        q: "What goes wrong in a long chain?",
        strong: "A strong answer reaches for the multiplication immediately and has a number.",
        answer: [
          { t: "p", text: "Error compounds multiplicatively, and the arithmetic is worse than intuition. Five steps at 90% each gives 59% end to end. Eight at 80% gives 17%." },
          { t: "p", text: "Which produces a counterintuitive failure: adding a step to improve quality can lower end-to-end accuracy, because the new step's own failure rate multiplies in. I have seen a six-step pipeline score 0.68 where the single call it replaced scored 0.81 — every step measured above 0.93 in isolation, and the product of six of those is about 0.70." },
          { t: "p", text: "The mitigations are validating between steps so a bad intermediate fails loudly, keeping the original available to later steps so an early error is recoverable, and preferring fewer larger steps — two at 0.95 beats four at 0.97, which is not obvious until you multiply." },
          { t: "p", text: "When I modelled the trade-off properly the answer came out bimodal: exactly one step whenever splitting did not make the sub-tasks substantially easier, and jumping straight to three to five once it did. There was no setting where a long chain was optimal." },
        ] },

      { level: "advanced",
        q: "Does asking a model to critique its own output help?",
        strong: "A strong answer says \"only with new information\" and connects it to the same pattern elsewhere.",
        answer: [
          { t: "p", text: "Much less than its cost implies, if the critique step sees exactly what the draft step saw. You are asking a model to find errors it just made, and the errors it made are by construction the ones it does not think are errors." },
          { t: "p", text: "It works when the critique has something the draft did not: a retrieved document to check claims against, a tool that verifies a calculation, an explicit checklist the draft was not shown, or a different and stronger model doing the critique." },
          { t: "p", text: "This is the same pattern in three places, which is worth naming because it generalises. Tree-of-thought's evaluator has it — a branch the model got wrong is one it is inclined to score well. LLM-as-a-judge has it, which is why self-preference bias is measured and corrected for. The rule underneath all three is that an evaluator needs something the generator lacked, or it is measuring its own agreement with itself." }
        ] }
    ]
  }
});
