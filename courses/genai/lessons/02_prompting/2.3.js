EC.receiveLesson({
  id: "2.3",

  lede: "Chain-of-thought asks the model to produce its working before its answer, and it improves accuracy on multi-step problems for a reason that is more mechanical than it sounds: a transformer does a fixed amount of computation per token, so the only way it can spend more computation on a hard problem is to emit more tokens. The working *is* the extra compute. This lesson takes that seriously, measures what the technique costs on both sides of the request, and is specific about the tasks where it does nothing.",

  objectives: [
    "Explain why producing intermediate steps improves accuracy, in terms of computation per token",
    "Write zero-shot, few-shot and structured CoT, and say when each is appropriate",
    "Account for the cost of CoT in both prompt and output tokens",
    "Identify tasks where chain-of-thought adds cost and no accuracy",
    "Decide between prompted CoT and a reasoning model"
  ],

  prerequisites: ["1.1", "2.2"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "why", text: "Why writing the working helps",
      sub: "Fixed computation per token, so more tokens is more computation" },

    { t: "p", text: "From 1.1: every token is produced by one forward pass through the network, and that pass does the same amount of arithmetic whether the token is easy or hard. A model asked for `\"18\"` immediately has exactly one forward pass in which to do everything — parse the question, work out that three fifths of forty-five is twenty-seven, subtract, and emit the answer." },

    { t: "p", text: "Asked to show its working, it gets a forward pass per token of that working, and each pass can attend to everything written so far. The intermediate results are not held in some internal scratchpad; they are written into the context, where subsequent passes can read them." },

    { t: "viz", title: "The scratchpad is the output", caption: "The model has no memory between tokens except the tokens themselves. Intermediate results exist only if they are written down, which is why the working has to be visible for it to help.",
      svg: `<svg viewBox="0 0 760 214" width="100%" role="img" aria-label="Direct answer against chain of thought">
  <text x="16" y="26" class="s-label" style="fill:var(--crit)">direct: one forward pass to do everything</text>
  <rect x="16" y="36" width="120" height="34" rx="5" class="s-fill-2 s-stroke"/>
  <text x="76" y="58" text-anchor="middle" class="s-sub">the question</text>
  <rect x="146" y="36" width="54" height="34" rx="5" style="fill:var(--crit)" opacity="0.75"/>
  <text x="173" y="58" text-anchor="middle" class="s-sub" style="fill:var(--ink)">"18"</text>
  <text x="214" y="58" class="s-sub">one pass: parse, compute 3/5 of 45, subtract, emit</text>

  <text x="16" y="108" class="s-label" style="fill:var(--good)">chain of thought: one pass per token, each reading the last</text>
  <rect x="16" y="118" width="120" height="34" rx="5" class="s-fill-2 s-stroke"/>
  <text x="76" y="140" text-anchor="middle" class="s-sub">the question</text>
  <rect x="146" y="118" width="128" height="34" rx="5" style="fill:var(--good)" opacity="0.5"/>
  <text x="210" y="140" text-anchor="middle" class="s-sub" style="fill:var(--ink)">"3/5 of 45 = 27"</text>
  <rect x="280" y="118" width="128" height="34" rx="5" style="fill:var(--good)" opacity="0.6"/>
  <text x="344" y="140" text-anchor="middle" class="s-sub" style="fill:var(--ink)">"45 - 27 = 18"</text>
  <rect x="414" y="118" width="70" height="34" rx="5" style="fill:var(--good)" opacity="0.8"/>
  <text x="449" y="140" text-anchor="middle" class="s-sub" style="fill:var(--ink)">"18"</text>
  <text x="496" y="140" class="s-sub">each step attends to every step before it</text>

  <text x="16" y="186" class="s-sub">The intermediate results live in the context, not in the model. A model told to</text>
  <text x="16" y="204" class="s-sub">"think silently and give only the answer" has been told to do the first thing, not the second.</text>
</svg>` },

    { t: "callout", kind: "trap", title: "\"Think step by step but only output the answer\" defeats the technique",
      body: [
        { t: "p", text: "This instruction appears constantly, usually because the working is untidy in a UI. It asks for the benefit of chain-of-thought and forbids the mechanism that produces it: there is no silent thinking, because a transformer's only working memory between tokens is the tokens." },
        { t: "p", text: "What you get is a direct answer with a longer prompt — the worst of both, paying for the instruction and receiving none of the accuracy." },
        { t: "p", text: "If the working must not reach the user, generate it and strip it: ask for the reasoning inside a delimiter and remove that section before display, or use a two-call chain (2.8). Both keep the computation and hide the output. A reasoning model (1.10) does exactly this server-side, which is the entire thing you are paying for." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "three-forms", text: "Three ways to ask for it",
      sub: "Zero-shot, few-shot, and structured" },

    { t: "code", lang: "python", title: "cot.py — the three forms, from the reference", code: `# Zero-shot CoT: one clause, no examples
cot_zero = """Q: If a store has 45 apples and sells 3/5 of them, how many are left?

Let's think step by step."""

# Few-shot CoT: demonstrate the reasoning, not just the answer
cot_few = """Q: Roger has 5 tennis balls. He buys 2 more cans of 3. How many tennis balls?
A: Roger started with 5 balls. 2 cans of 3 = 6 balls. 5 + 6 = 11. The answer is 11.

Q: If a store has 45 apples and sells 3/5 of them, how many are left?
A:"""

# Structured CoT: name the steps yourself
structured_cot = """Analyze this problem step by step:
1. Identify the given information
2. Determine what needs to be calculated
3. Apply the relevant formula or logic
4. Calculate the result
5. Verify the answer

Problem: {problem}"""`,
      caption: "From 04_Prompt_Engineering.md §3. The three differ in how much of the reasoning structure you supply rather than in what they ask the model to do." },

    { t: "table",
      head: ["Form", "Use when", "Cost"],
      rows: [
        ["Zero-shot (\"Let's think step by step\")", "A first attempt on any reasoning task — it is one clause", "6 tokens on the measured prompt"],
        ["Few-shot CoT", "The reasoning has a shape you want followed, or zero-shot reasoning is going astray", "59 extra prompt tokens, measured"],
        ["Structured CoT", "The steps are known and always the same — a checklist you want applied", "42 extra prompt tokens, measured"]
      ],
      caption: "Measured costs are for the reference's own examples, tokenised with `o200k_base`. The ordering of technique-strength and cost is not the same, which is the useful part." },

    { t: "code", lang: "python", title: "g21.py — the prompt cost of each form", code: `for label, text in (("direct", direct), ("zero-shot CoT", cot_zero),
                    ("few-shot CoT", cot_few), ("structured CoT", structured)):
    print("%-16s prompt %4d tokens" % (label, len(enc.encode(text))))`,
      out: `  direct           prompt   25 tokens
  zero-shot CoT    prompt   31 tokens
  few-shot CoT     prompt   84 tokens
  structured CoT   prompt   67 tokens`,
      hl: [4],
      caption: "Zero-shot CoT costs **six tokens** over a direct question. That is the cheapest accuracy improvement available anywhere in this module, and the reason it should be the first thing tried." },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "output-cost", text: "The prompt cost is the small half",
      sub: "The working is output tokens, and output is the expensive side" },

    { t: "p", text: "Six extra prompt tokens is nothing. What chain-of-thought actually costs is on the output side, where a bare answer becomes a paragraph — and output tokens are priced several times higher than input." },

    { t: "code", lang: "python", title: "g21.py — the output side", code: `for label, n_out in (("bare answer '18'", 1), ("one-line working", 25),
                     ("five numbered steps", 90)):
    print("%-22s %3d output tokens -> $%.6f at $10/1M" % (label, n_out, n_out * 10 / 1e6))`,
      out: `    bare answer '18'         1 output tokens -> $0.000010 at $10/1M
    one-line working        25 output tokens -> $0.000250 at $10/1M
    five numbered steps     90 output tokens -> $0.000900 at $10/1M`,
      caption: "A 90× increase in output tokens for the structured form. At the reference's quoted $10 per million output tokens that is $0.0009 against $0.00001 — still fractions of a penny per call, and a 90× multiple on whatever your volume is." },

    { t: "p", text: "There is a latency cost too, and it is the one users feel. From 1.12, each output token is its own forward pass: a 90-token answer takes roughly ninety times as long to finish as a one-token answer. Streaming (1.12) hides some of that by showing the reasoning as it arrives, which is one reason CoT output is often left visible even when it is untidy." },

    { t: "callout", kind: "tradeoff", title: "Where the 90× is worth paying",
      body: [
        { t: "p", text: "**Worth it:** multi-step arithmetic, logic with several constraints, anything where the answer depends on an intermediate result the model has to compute. These are the tasks chain-of-thought was demonstrated on and where the accuracy difference is large." },
        { t: "p", text: "**Not worth it:** classification into known categories, extraction of stated fields, format conversion, lookup. There is no intermediate result to compute, so the extra passes have nothing to do — you pay 90× for a paragraph explaining an answer that was never in doubt." },
        { t: "p", text: "**Actively harmful:** anything downstream code parses. CoT output is prose followed by an answer, and extracting the answer from it is a parsing problem you did not have before. If you need both reasoning and structure, put the reasoning in a schema field (1.8) so it is data rather than preamble." }
      ] },

    { t: "code", lang: "python", title: "reasoning_field.py — keeping the working and the structure", code: `from pydantic import BaseModel

class Answer(BaseModel):
    reasoning: str        # the model fills this FIRST -- field order matters
    answer: int           # and this after, having written the reasoning above

# Because generation is left to right, a field declared earlier is generated
# earlier, so 'reasoning' is genuinely in the context when 'answer' is produced.
# Declare them the other way round and the reasoning is written AFTER the
# answer, which is a justification rather than a computation -- and buys nothing.`,
      hl: [4, 5],
      caption: "The field order is load-bearing and easy to get backwards. A `reasoning` field after `answer` is rationalisation: the answer was already committed before any working existed." },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "limits", text: "What chain-of-thought does not do",
      sub: "The working can be wrong, and confidently so" },

    { t: "p", text: "The reasoning a model produces is generated the same way everything else is — by sampling from a distribution. It is not a trace of a computation that happened elsewhere; it *is* the computation, which means it can be wrong at any step and the model will carry the wrong intermediate forward without noticing." },

    { t: "ul", items: [
      "**Plausible reasoning to a wrong answer** is the characteristic failure. Each step reads well, one contains an arithmetic slip, and the conclusion follows validly from a false premise. This is harder to catch than a bare wrong answer, because the working looks like evidence.",
      "**Post-hoc rationalisation.** If the model has effectively decided the answer in the first token, the subsequent steps can be an argument for it rather than a derivation of it. Field ordering (above) is one guard; asking for the answer only at the end is another.",
      "**Unfaithfulness.** There is published work showing that a model's stated reasoning does not always correspond to what actually drove its answer — changing something the reasoning never mentions can change the conclusion. So CoT output is a useful artefact and not a proof.",
      "**No help on knowledge.** If the model does not know a fact, reasoning step by step does not retrieve it. It produces a confident derivation from an invented premise, which is 11.1."
    ] },

    { t: "callout", kind: "warn", title: "Do not show reasoning to users as if it were an explanation",
      body: [
        { t: "p", text: "A visible chain of thought is extremely persuasive — it reads as the system showing its work — and it is not a guarantee that the work is what produced the answer. Presenting it as an explanation transfers confidence the artefact does not justify." },
        { t: "p", text: "In regulated settings this matters concretely: an explanation that is not faithful to the decision process is worse than no explanation, because it invites reliance. If you need auditable reasoning, the structure has to come from your code — a decomposed chain where each step's input and output are recorded (2.8) — not from prose the model wrote about itself." },
        { t: "p", text: "Showing the working for *transparency* is fine and often valuable. Labelling it as the reason is the part to avoid." }
      ] },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Price chain-of-thought across a workload",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Chain-of-thought is cheap per call and multiplies with volume, and the multiplier lands almost entirely on the output side where the rate is highest." },
        { t: "p", text: "Work out what it costs at scale, and what fraction of a workload has to benefit for it to pay." }
      ],
      requirements: [
        "Model a workload of 1,000,000 requests with a 400-token prompt",
        "Compare a direct answer of 20 output tokens against CoT at 120 output tokens, at $2.50/$10.00 per million",
        "Report the monthly cost of each and the difference",
        "Assuming CoT lifts accuracy from 0.72 to 0.88, compute the cost per additional correct answer",
        "State the condition under which that price is worth paying"
      ],
      hint: "Cost per extra correct answer is `(cost_cot − cost_direct) / (requests × accuracy_lift)`. Compare it against what one error costs you.",
      solution: { lang: "python", title: "g23_ex.py",
        code: `REQS = 1_000_000
IN_TOK = 400
IN_RATE, OUT_RATE = 2.50, 10.00
DIRECT_OUT, COT_OUT = 20, 120
ACC_DIRECT, ACC_COT = 0.72, 0.88

def cost(out_tok):
    return (REQS * IN_TOK * IN_RATE + REQS * out_tok * OUT_RATE) / 1e6

c_direct, c_cot = cost(DIRECT_OUT), cost(COT_OUT)
extra_correct = REQS * (ACC_COT - ACC_DIRECT)

print("direct : $%9.2f  (%d output tokens)" % (c_direct, DIRECT_OUT))
print("CoT    : $%9.2f  (%d output tokens)" % (c_cot, COT_OUT))
print("delta  : $%9.2f  (%.0f%% more)" % (c_cot - c_direct,
                                          100 * (c_cot - c_direct) / c_direct))
print()
print("accuracy %.2f -> %.2f  =  %s additional correct answers"
      % (ACC_DIRECT, ACC_COT, f"{extra_correct:,.0f}"))
print("cost per additional correct answer: $%.5f"
      % ((c_cot - c_direct) / extra_correct))
print()
for err_cost in (0.001, 0.01, 0.10, 1.00):
    saved = extra_correct * err_cost
    verdict = "worth it" if saved > (c_cot - c_direct) else "not worth it"
    print("  if one error costs $%.3f: avoided cost $%10.2f -> %s"
          % (err_cost, saved, verdict))`,
        out: `direct : $  1200.00  (20 output tokens)
CoT    : $  2200.00  (120 output tokens)
delta  : $  1000.00  (83% more)

accuracy 0.72 -> 0.88  =  160,000 additional correct answers
cost per additional correct answer: $0.00625

  if one error costs $0.001: avoided cost $    160.00 -> not worth it
  if one error costs $0.010: avoided cost $   1600.00 -> worth it
  if one error costs $0.100: avoided cost $  16000.00 -> worth it
  if one error costs $1.000: avoided cost $ 160000.00 -> worth it`,
        notes: [
          { t: "p", text: "The headline is the third line: chain-of-thought made the workload **83% more expensive**, and every penny of that is output tokens — the prompt cost of the instruction is six tokens and does not appear at this resolution. Which is the general shape: CoT is an output-side cost, and output is where the rate is highest." },
          { t: "p", text: "The cost per additional correct answer is $0.00625, and that is the number to take to a decision. It converts an abstract accuracy improvement into a price you can compare against something: if one wrong answer costs you less than about two thirds of a penny in rework, refunds or support time, the technique is not paying for itself at this accuracy lift." },
          { t: "p", text: "The break-even sits between a tenth of a penny and a penny per error, which is low enough that almost any task with a human consequence clears it. The tasks that do not clear it are the high-volume, low-stakes ones — auto-tagging, routing suggestions, ranking hints — and those are exactly the tasks from §03 where there is no intermediate result to compute, so the accuracy lift would not have been 16 points anyway." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the reasoning field that explained decisions it had not made",
      body: [
        { t: "p", text: "**Symptom.** A loan pre-screening tool returned a decision and a `reasoning` field, shown to internal reviewers as the basis for the decision. An audit found cases where the stated reasoning cited factors that, when changed, did not change the decision at all — and omitted a factor that did." },
        { t: "p", text: "**The schema.** A Pydantic model with `decision: Literal[\"refer\", \"decline\"]` declared first and `reasoning: str` second." },
        { t: "p", text: "**Mechanism.** Generation is left to right, so the fields are produced in declaration order. The decision was emitted first, with one forward pass to make it, and the reasoning was generated *afterwards* — conditioned on a decision that had already been committed. It was not a derivation, it was a justification, and it was being read as the former. Reversing the field order would have made the reasoning genuinely precede and inform the decision, which is a one-line change with a completely different meaning." },
        { t: "p", text: "**Fix.** Field order reversed, so the working is in the context when the decision is produced. But the audit finding was not closed by that, and should not have been: even a correctly-ordered chain of thought is not a faithful account of what drove the answer. The reasoning field is now labelled as supporting notes rather than as the basis for the decision, and the factors that genuinely determine it are computed in code and recorded separately. 8.7 and 11.4 are the lessons about measuring whether a model's stated reasoning corresponds to its behaviour — which is a thing you have to test, not assume." }
      ] }
  ],

  takeaways: [
    "**The working is the computation.** A transformer does a fixed amount of arithmetic per token, so emitting intermediate steps is the only way it can spend more computation on a harder problem.",
    "Intermediate results live in the context, not in the model — which is why **\"think step by step but only output the answer\" defeats the technique** and pays for the instruction anyway.",
    "Zero-shot CoT costs **6 prompt tokens** over a direct question on the measured example. It is the cheapest accuracy improvement in this module and should be the first thing tried.",
    "Few-shot CoT costs 59 extra prompt tokens and structured CoT 42 — but **the prompt side is the small half**.",
    "The real cost is output: 1 token for a bare answer against 90 for five numbered steps, a **90× multiple** on the expensive side of the bill, plus roughly 90× the generation latency.",
    "Measured over a million requests, CoT made a workload **83% more expensive** — all of it output tokens — at **$0.00625 per additional correct answer**.",
    "**Field order is load-bearing.** A `reasoning` field declared after `answer` is generated after it, which makes it rationalisation rather than computation.",
    "CoT does nothing for classification, extraction, format conversion or lookup — there is no intermediate result to compute, so the extra passes have nothing to do.",
    "**The reasoning can be wrong and read well.** Plausible working to a wrong answer is harder to catch than a bare wrong answer, because the working looks like evidence.",
    "A model's stated reasoning is **not necessarily faithful** to what drove its answer. Show it for transparency; do not label it as the explanation, especially where someone will rely on it."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does asking for step-by-step reasoning improve accuracy on multi-step problems?",
        options: ["The model tries harder when asked", "Each token is one forward pass, so writing steps buys more computation, and the steps are in the context for later passes to read", "It activates a reasoning module in the architecture", "It lowers the effective temperature"],
        answer: 1,
        why: "A transformer does the same amount of arithmetic for every token regardless of difficulty, so the only way to spend more computation on a hard problem is to emit more tokens — and because the model has no working memory between tokens except the tokens, the intermediate results have to be written down to be available. There is no separate reasoning module; the mechanism is the ordinary forward pass. Effort is not a property a model has, and temperature is unaffected by the prompt." },

      { stem: "You add \"think step by step, but output only the final answer\" to save tokens. What happens?",
        options: ["Accuracy improves and output stays short", "You pay for the instruction and get a direct answer — the mechanism was the visible tokens", "The model reasons internally and the answer improves", "Output becomes non-deterministic"],
        answer: 1,
        why: "There is no silent thinking: the model's only working memory between tokens is the tokens, so forbidding the working removes exactly the thing that produced the benefit, while the added instruction still costs prompt tokens. If the working must be hidden from users, generate it inside a delimiter and strip it, or use a two-call chain — both keep the computation. A reasoning model does precisely this server-side, which is what its hidden tokens are." },

      { stem: "Your Pydantic schema has `decision` declared before `reasoning`. What is the consequence?",
        options: ["None — field order is cosmetic in JSON", "The reasoning is generated after the decision, so it justifies rather than informs it", "The schema will fail validation", "Reasoning will be truncated"],
        answer: 1,
        why: "Generation is left to right, so fields are produced in declaration order — a decision emitted first is committed with one forward pass behind it, and the reasoning that follows is conditioned on it rather than feeding it. Reversing the order is a one-line change that makes the working genuinely precede the answer. JSON object order is semantically irrelevant to a parser, which is why this is easy to miss; it is not irrelevant to a generator. Nothing about it affects validation or length." },

      { stem: "For which task does chain-of-thought add cost and no accuracy?",
        options: ["A word problem with two arithmetic steps", "Extracting five stated fields from an invoice", "Debugging a logic error", "A constraint satisfaction puzzle"],
        answer: 1,
        why: "Extraction has no intermediate result to compute — the fields are present and the task is to read them out — so the extra forward passes have nothing to do, while the output grows by up to 90× on the expensive side of the bill. The other three all involve a value or a deduction that must be derived before the answer exists, which is exactly what the extra passes are for. Worse, on an extraction task the prose working also creates a parsing problem that structured output had already solved." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Almost everyone can define chain-of-thought. Far fewer can say why it works, and that is the question worth asking.",
    questions: [
      { level: "core",
        q: "Why does chain-of-thought prompting work?",
        strong: "A strong answer is mechanical — computation per token — rather than anthropomorphic.",
        answer: [
          { t: "p", text: "Because a transformer does a fixed amount of computation per token. A model asked for the answer directly has one forward pass to parse the question, compute any intermediate values and emit the result. Asked to show its working, it gets a forward pass per token of that working." },
          { t: "p", text: "And critically, the intermediate results are in the context rather than in the model — there is no hidden scratchpad. Each step can attend to every step before it, so the working functions as external memory." },
          { t: "p", text: "The immediate corollary is the one I would volunteer: \"think step by step but only output the answer\" cannot work. It asks for the benefit and forbids the mechanism. If the working needs to be hidden, generate it and strip it — the tokens have to exist." }
        ] },

      { level: "core",
        q: "What does chain-of-thought cost?",
        strong: "A strong answer separates prompt from output cost and knows which dominates.",
        answer: [
          { t: "p", text: "Almost nothing on the prompt side and a lot on the output side. Zero-shot CoT is six tokens over a direct question — \"Let's think step by step\" — which is the cheapest accuracy improvement available anywhere." },
          { t: "p", text: "The cost is that a one-token answer becomes ninety. That is a 90× multiple on output tokens, which are priced several times higher than input, plus roughly 90× the generation latency because each token is its own forward pass." },
          { t: "p", text: "I priced it on a million-request workload: 83% more expensive overall, at $0.00625 per additional correct answer for a 16-point accuracy lift. That last number is the useful one, because it converts the decision into a comparison — if one error costs you less than about two thirds of a penny, it is not paying for itself." }
        ] },

      { level: "advanced",
        q: "Can you trust a model's stated reasoning?",
        strong: "A strong answer distinguishes the artefact from the explanation, and names field ordering as a concrete way it goes wrong.",
        answer: [
          { t: "p", text: "Not as an explanation. The reasoning is generated the same way everything else is — sampled from a distribution — so it is not a trace of some computation that happened elsewhere. It *is* the computation, which means any step can be wrong, and the model carries a wrong intermediate forward without noticing." },
          { t: "p", text: "There is a stronger version of the problem: published work shows stated reasoning is not always faithful to what actually drove the answer. Change something the reasoning never mentions and the conclusion changes. So it is a useful artefact and not a proof." },
          { t: "p", text: "A concrete way this goes wrong that I would raise: field ordering in structured output. Generation is left to right, so a `reasoning` field declared after `answer` is produced after the answer is already committed — it is a justification rather than a derivation, and it reads exactly the same. I have seen that shipped in a decision-support tool and read by reviewers as the basis for the decision." },
          { t: "p", text: "Where auditable reasoning genuinely matters, the structure has to come from code — a decomposed chain where each step's inputs and outputs are recorded — rather than from prose the model writes about itself." }
        ] }
    ]
  }
});
