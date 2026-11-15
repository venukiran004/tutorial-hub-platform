EC.receiveLesson({
  id: "1.10",

  lede: "Reasoning models spend tokens thinking before they answer, and by late 2026 that describes every flagship. Those tokens are generated, billed as output, counted against your output cap — and not shown to you. That combination makes this the one setting in the module where a misconfiguration does not degrade the answer but removes it entirely: set the cap too low and the model spends the whole budget reasoning and returns nothing at all, having charged you for it. This lesson carries the arithmetic through and works out when the spend is worth it.",

  objectives: [
    "Explain what reasoning tokens are and which limits they count against",
    "Compute the cost of a reasoning call from the visible output and the reasoning ratio",
    "Predict what happens when the output cap is set too low for a reasoning model",
    "Choose between a model's own reasoning and a prompted chain of thought on the evidence",
    "Set the depth control from the task rather than from the default"
  ],

  prerequisites: ["1.5"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "what-they-are", text: "Tokens you pay for and never see",
      sub: "Generated, billed, capped — and absent from the response" },

    { t: "p", text: "A reasoning model generates a chain of thought internally before producing the answer. In 2024 that meant a separate product line; by late 2026 it is every flagship — the GPT-6 family, Claude's current models and Gemini 4 all reason by default, and several of them cannot be told not to. Mechanically these are ordinary output tokens: each one costs a forward pass, each one is billed at the output rate. What is different is that the raw chain of thought is withheld from the response — at most you can ask for a summary of it — so you pay for text you cannot read." },

    { t: "viz", title: "Where the budget goes", caption: "Both bars are the same request. The worked example is 500 reasoning tokens for 50 visible ones — 90.9% of what you pay for is removed before the response reaches you.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="Reasoning tokens against visible output">
  <text x="20" y="28" class="s-label">what you are billed for</text>
  <rect x="20" y="38" width="654" height="34" rx="5" style="fill:var(--violet)" opacity="0.7"/>
  <rect x="674" y="38" width="66" height="34" rx="5" style="fill:var(--good)" opacity="0.8"/>
  <text x="347" y="60" text-anchor="middle" class="s-label" style="fill:var(--ink)">500 reasoning tokens — hidden</text>
  <text x="707" y="60" text-anchor="middle" class="s-sub" style="fill:var(--ink)">50 visible</text>

  <text x="20" y="108" class="s-label">what you receive</text>
  <rect x="20" y="118" width="66" height="34" rx="5" style="fill:var(--good)" opacity="0.8"/>
  <rect x="86" y="118" width="654" height="34" rx="5" class="s-fill-bg s-stroke" stroke-dasharray="4 3"/>
  <text x="53" y="140" text-anchor="middle" class="s-sub" style="fill:var(--ink)">50</text>
  <text x="413" y="140" text-anchor="middle" class="s-sub">nothing — the reasoning is withheld from the response</text>

  <text x="20" y="184" class="s-sub" style="fill:var(--crit)">The output cap covers BOTH bars together. Set it to 400 here and the</text>
  <text x="20" y="200" class="s-sub" style="fill:var(--crit)">budget is exhausted before the answer starts: you are billed 400 and receive nothing.</text>
</svg>` },

    { t: "table",
      head: ["Property", "Reasoning tokens", "Visible output tokens"],
      rows: [
        ["Cost a forward pass each", "yes", "yes"],
        ["Billed at the output rate", "yes", "yes"],
        ["Count against the output cap", "yes", "yes"],
        ["Counted in the usage block's output tokens", "yes", "yes"],
        ["Appear in the response text", "**no**", "yes"],
        ["Can be read when an answer is wrong", "**a summary at best**", "yes"]
      ],
      caption: "Every row is identical except the last two, and those two are what make the setting awkward: the dominant cost of the request is invisible to the thing you would use to understand it." },

    { t: "p", text: "The mechanism is the same on all three hosted APIs. The names are not:" },

    { t: "table",
      head: ["", "OpenAI · Responses API", "Anthropic · Messages API", "Google · Gemini API"],
      rows: [
        ["Depth control", "`reasoning.effort`", "`output_config.effort`", "`thinking_level`"],
        ["Output cap, reasoning included", "`max_output_tokens`", "`max_tokens`", "`max_output_tokens`"],
        ["Where the reasoning is counted", "`usage.output_tokens_details.reasoning_tokens`", "inside `usage.output_tokens`, not broken out", "`thoughts_token_count`"],
        ["Signal that the cap was hit", "`status` is `incomplete`, with reason `max_output_tokens`", "`stop_reason` is `max_tokens`", "an incomplete status, or `finishReason` `MAX_TOKENS`"]
      ],
      caption: "As documented in November 2026 and as the current SDKs expose them. The rest of this lesson says *output cap* and *depth setting* for the first two rows, because the behaviour is common and the spelling is not." },

    { t: "callout", kind: "trap", title: "The cap can consume the entire budget on thinking",
      body: [
        { t: "p", text: "On a model that does not reason, a cap of 400 gives you 400 tokens of answer, possibly truncated. On a reasoning model the same cap gives you *up to* 400 tokens of thinking and whatever is left over for the answer — and if the thinking uses all 400, the answer is empty." },
        { t: "p", text: "The response comes back marked incomplete, with empty text and a bill for 400 output tokens. It is not an error and nothing raises. Code that reads the response text without checking gets an empty string and carries on." },
        { t: "p", text: "The defence is the same as 1.5's: branch on the completion status. The difference here is that a reasoning model needs a much larger cap than intuition suggests — reasoning routinely runs to many times the visible output, so a 200-token answer may need a cap of several thousand. OpenAI's own guidance is to reserve at least 25,000 tokens for reasoning plus output while you find out what your traffic needs." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "the-arithmetic", text: "What it costs, carried through",
      sub: "The multiplier is on the output rate, which is the expensive one" },

    {"kind": "trace", "title": "You are billed for the thinking you never see", "caption": "Reasoning tokens are output tokens: they are generated, billed and then withheld from the response. On the worked example — 500 reasoning plus 50 visible — **90.9% of what you paid for is invisible**. The bottom rows are why this needs a budget rather than a default: a 200-token answer with a hundred times as much reasoning behind it is 20,200 billed tokens, a hundred times the cost of the same answer with none.", "left": "reasoning + visible", "codeW": 170, "vars": ["billed tokens", "per call", "per 10k calls"], "steps": [{"code": "0 + 500", "state": ["500", "$0.00500", "$50.00"], "tone": "good", "note": "no reasoning"}, {"code": "500 + 50", "state": ["550", "$0.00550", "$55.00"], "changed": [0], "tone": "accent", "note": "90.9% unseen"}, {"code": "2,000 + 200", "state": ["2,200", "$0.02200", "$220.00"], "tone": "warn"}, {"code": "10,000 + 400", "state": ["10,400", "$0.10400", "$1,040.00"], "changed": [2], "tone": "crit"}, {"code": "200 answer at 100x", "state": ["20,200", "$0.20200", "$2,020.00"], "tone": "crit", "note": "100x reasoning"}], "t": "diagram", "id": "dg-1_10-02-0"},

    { t: "code", lang: "python", title: "g110.py — the worked example and its neighbours", code: `RATE = 10.00        # dollars per 1M output tokens

print("the worked example: 500 reasoning + 50 visible")
print("  billed output tokens : 550")
print("  visible to the user  : 50")
print("  paid-for-but-unseen  : %.1f%%" % (100.0 * 500 / 550))
print()
print("at $%.0f per 1M output tokens:" % RATE)
for r, v in ((0, 500), (500, 50), (2000, 200), (10000, 400)):
    cost = (r + v) * RATE / 1_000_000
    print("  reasoning %5d + visible %4d = %5d billed -> $%.5f per call, $%.2f per 10k calls"
          % (r, v, r + v, cost, cost * 10000))`,
      out: `the worked example: 500 reasoning + 50 visible
  billed output tokens : 550
  visible to the user  : 50
  paid-for-but-unseen  : 90.9%

at $10 per 1M output tokens:
  reasoning     0 + visible  500 =   500 billed -> $0.00500 per call, $50.00 per 10k calls
  reasoning   500 + visible   50 =   550 billed -> $0.00550 per call, $55.00 per 10k calls
  reasoning  2000 + visible  200 =  2200 billed -> $0.02200 per call, $220.00 per 10k calls
  reasoning 10000 + visible  400 = 10400 billed -> $0.10400 per call, $1040.00 per 10k calls`,
      caption: "The rate is $10 per million output tokens — in November 2026 the list price of GPT-6.1 Sol, Claude Sonnet 5.5 and Gemini 4 Carbon alike. The flagships above them charge five times that, so there these figures are floors." },

    { t: "p", text: "How much a model reasons is not a constant. Ten times the visible output is unremarkable, and a hundred times is not rare on a hard input. Applying that range to a fixed 200-token answer gives the spread that matters for capacity planning:" },

    { t: "code", lang: "python", title: "g110.py — a 10× to 100× range, applied", code: `RATE = 10.00        # dollars per 1M output tokens

for mult in (10, 50, 100):
    total = 200 * mult + 200
    print("a 200-token answer at %3dx reasoning = %5d billed tokens, $%.4f at $10/1M"
          % (mult, total, total * RATE / 1_000_000))`,
      out: `a 200-token answer at  10x reasoning =  2200 billed tokens, $0.0220 at $10/1M
a 200-token answer at  50x reasoning = 10200 billed tokens, $0.1020 at $10/1M
a 200-token answer at 100x reasoning = 20200 billed tokens, $0.2020 at $10/1M`,
      caption: "The same visible answer costs between 2.2¢ and 20.2¢ depending on how hard the model decided to think — and you do not control which, beyond the depth setting." },

    { t: "callout", kind: "insight", title: "The variance is the planning problem, not the mean",
      body: [
        { t: "p", text: "A tenfold spread in cost for the same visible output means the per-request cost of a reasoning feature is not a number, it is a distribution — and one you cannot see the shape of until you have run real traffic through it." },
        { t: "p", text: "The practical consequence is that you cannot price a reasoning feature from a handful of test calls. Easy inputs think briefly; the hard ones that motivated paying for depth in the first place think for a long time, and those are exactly the ones a small test set under-represents." },
        { t: "p", text: "Log the reasoning count from the first day: `usage.output_tokens_details.reasoning_tokens` on OpenAI, `thoughts_token_count` on Gemini, and on Claude `usage.output_tokens` itself, because thinking is inside it and not broken out. It is the only way to find out what the distribution actually is, and 11.7 is the lesson about decomposing a bill you did not predict." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "effort", text: "The depth setting, and the choice it is really making",
      sub: "Three names for one dial, and the question it answers" },

    {"kind": "matrix", "title": "Depth is choosing how much search to pay for", "caption": "The setting is not a quality dial. It buys **search over approaches**, so it is worth paying for only when there is a search to do. The first row is the one that saves the most money: extraction, classification and formatting have no search in them at all, so the smallest model at its lowest setting is both faster and far cheaper. The last row is the one that surprises people — thinking time is wall-clock time, and a 10,000-token trace is seconds of silence.", "cols": ["Depth", "Because"], "rows": ["Extraction, classification", "Multi-step arithmetic", "Debugging, planning, proofs", "Anything latency-sensitive"], "cells": [[{"text": "the lowest the model allows", "tone": "good"}, "there is no search to do"], [{"text": "low", "tone": "good"}, "the steps are known, not found"], [{"text": "medium to high", "tone": "accent"}, "a genuine search over approaches"], [{"text": "reconsider entirely", "tone": "crit"}, "a 10k trace is seconds of silence"]], "t": "diagram", "id": "dg-1_10-03-1"},

    { t: "p", text: "The dial has three names. OpenAI's `reasoning.effort` runs from `none` through `minimal`, `low`, `medium` and `high` to `xhigh` and `max`; Anthropic's `output_config.effort` runs from `low` to `max`; Gemini's `thinking_level` from `minimal` to `high`. Which values a model accepts is model-specific — GPT-6 Astra rejects `none`, Gemini 4 Carbon has no off position, Claude Opus 5.5 cannot have its thinking disabled — and so are the defaults, which are often `medium` rather than the maximum." },

    { t: "p", text: "Whatever it is called, it controls roughly how many reasoning tokens the model is willing to spend. It is not a quality dial in the sense of making answers better — it is a dial on how much compute the model is permitted to apply at inference time, which is only useful on problems where more compute helps." },

    { t: "table",
      head: ["Task", "Depth", "Why"],
      rows: [
        ["Extraction, classification, formatting", "The smallest model, at the lowest setting it allows", "There is no search to do — every reasoning token is cost and latency with nothing to buy"],
        ["Multi-step arithmetic, straightforward logic", "`low`", "The steps are known; the model needs to execute them, not find them"],
        ["Debugging, planning, non-obvious proofs", "`medium` to `high`", "There is a genuine search over approaches, which is what the extra tokens buy"],
        ["Anything latency-sensitive", "Reconsider entirely", "Thinking time is wall-clock time; a 10,000-token reasoning trace is seconds of silence"]
      ],
      caption: "The first row is the important one. Most requests sent to a flagship at its default depth do not need it, and the cost difference is large enough that routing is worth building (11.9)." },

    { t: "p", text: "The comparison people expect to be close — a model's built-in reasoning against a low-depth call with a chain-of-thought prompt — is genuinely close for some tasks and not others. The honest framing is that they are the same idea implemented at different layers: prompted CoT spends visible tokens you can read and debug, while built-in reasoning spends hidden tokens that were trained for the purpose. 2.3 covers the prompted version, and 7.9 covers what test-time compute is doing underneath both." },

    { t: "callout", kind: "tradeoff", title: "Built-in reasoning or a chain-of-thought prompt",
      body: [
        { t: "p", text: "**Prompted CoT gives you the trace.** The reasoning is in the response, so you can read it, log it, and show it to a user who asks why. When an answer is wrong you can see where it went wrong — which is most of what debugging an LLM feature consists of." },
        { t: "p", text: "**Built-in reasoning gives you a trace trained for the job.** It is generally better at genuinely hard problems, and it does not consume your prompt budget or clutter the output with working." },
        { t: "p", text: "**The cost comparison is not obvious.** Prompted CoT also generates the tokens, so it is not free — the difference is that you see them and they are usually fewer. A model reasoning at 100× on a short answer will lose badly on cost to a good CoT prompt at the lowest depth." },
        { t: "p", text: "The decision rule: if you need to explain the answer, use prompted CoT at low depth. If the task is genuinely hard and the explanation does not matter, raise the depth. If neither is true, do neither. And do not stack them — asking a model that is already reasoning to think step by step in its answer pays for the working twice." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "handling", text: "Handling a reasoning response properly",
      sub: "Three branches, and the empty one is the interesting one" },

    {"kind": "flow", "title": "Raise on the empty case rather than returning nothing", "caption": "A reasoning model can spend its whole budget thinking and return **no visible text at all** — a successful response, billed in full, with an empty text field. The temptation is to return `\"\"` and let the caller decide, but that pushes an invisible failure into code with no way to recognise it, and the symptom surfaces much later as a blank field in a UI or a record with a missing summary. Raise, and let the retry logic see it.", "cols": 3, "nodes": [{"id": "b", "label": "The budget goes on thinking", "sub": "and runs out", "tone": "warn"}, {"id": "e", "label": "Visible content is empty", "sub": "a successful response, billed", "tone": "crit"}, {"id": "r", "label": "Return \"\" and move on", "sub": "the tempting option", "tone": "crit"}, {"id": "l", "label": "A blank field, discovered later", "sub": "in a UI, or a stored record", "tone": "crit"}, {"id": "x", "label": "Raise instead", "sub": "at the point of the failure", "tone": "good"}, {"id": "y", "label": "Now retry logic can see it", "sub": "and so can your alerts", "tone": "teal"}], "edges": [["b", "e"], ["e", "r"], ["r", "l"], ["e", "x"], ["x", "y"]], "t": "diagram", "id": "dg-1_10-04-2"},

    { t: "code", lang: "python", title: "reasoning.py", code: `def ask(question, *, effort="medium", cap=25_000):
    r = client.responses.create(
        model="gpt-6.1-sol",
        input=question,
        reasoning={"effort": effort},
        max_output_tokens=cap,              # covers reasoning AND the answer
    )
    think   = r.usage.output_tokens_details.reasoning_tokens
    visible = r.usage.output_tokens - think

    # log this from day one -- it is the only view of the hidden cost
    log.info("reasoning=%d visible=%d ratio=%.1fx status=%s",
             think, visible, think / max(visible, 1), r.status)

    if r.status == "incomplete" and r.incomplete_details.reason == "max_output_tokens":
        if not r.output_text:
            # the budget was spent entirely on thinking -- retry with more room,
            # or drop to a lower effort, but do NOT return an empty answer
            raise BudgetExhausted(f"{think} reasoning tokens, no answer, cap={cap}")
        raise Truncated("answer started but was cut")     # 1.5

    return r.output_text`,
      hl: [15, 16, 17, 18, 19],
      caption: "The distinguishing check is an incomplete response *and* empty text. That is the reasoning-specific failure, and it is silent unless you look for it. The same two branches exist on the other providers under the names in §01 — on Claude, `stop_reason == \"max_tokens\"` with no text block in `content`." },

    { t: "p", text: "Note that raising on the empty case is deliberate. The alternative — returning `\"\"` and letting the caller decide — pushes an invisible failure into code that has no way to recognise it, and the symptom surfaces much later as a blank field in a UI or a record with a missing summary." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the cap where a reasoning model starts returning nothing",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A reasoning model spends its budget on thinking first. There is therefore a cap below which the answer cannot start — and it depends on how much the model chooses to think, which varies by input." },
        { t: "p", text: "Model the failure and work out what margin a production cap needs, given a distribution of reasoning lengths." }
      ],
      requirements: [
        "Model reasoning length as a distribution: use a 10-100x range over a 200-token answer",
        "For caps from 1,000 to 25,000, compute the fraction of requests that would return an empty answer",
        "Report the cap needed for a 99% success rate, and for 99.9%",
        "Report the cost of that cap's worth of tokens at $10 per 1M, in the worst case",
        "State in one line why sizing the cap on the mean is the wrong approach"
      ],
      hint: "A request fails when `reasoning_tokens >= cap`, because the answer never starts. Sample the multiplier log-uniformly over 10–100 so the range is covered evenly in orders of magnitude.",
      solution: { lang: "python", title: "g110_ex.py",
        code: `import random

random.seed(0)
ANSWER = 200
N = 200_000

# reasoning at 10-100x the answer; log-uniform covers that range evenly
samples = [int(ANSWER * 10 ** random.uniform(1, 2)) for _ in range(N)]

print("reasoning tokens: min %d  median %d  p99 %d  max %d"
      % (min(samples), sorted(samples)[N // 2],
         sorted(samples)[int(N * 0.99)], max(samples)))
print()
print("%8s %14s %14s" % ("cap", "empty answers", "success rate"))
for cap in (1000, 2000, 4000, 8000, 16000, 25000):
    empty = sum(1 for s in samples if s >= cap)
    print("%8d %13.2f%% %13.2f%%" % (cap, 100 * empty / N, 100 * (1 - empty / N)))

ordered = sorted(samples)
for target in (0.99, 0.999):
    need = ordered[int(N * target)] + ANSWER
    print()
    print("for %.1f%% success you need a cap of %d tokens" % (100 * target, need))
    print("  worst-case cost of one such call at $10/1M output: $%.4f"
          % (need * 10 / 1_000_000))`,
        out: `reasoning tokens: min 2000  median 6313  p99 19542  max 19999

     cap  empty answers   success rate
    1000        100.00%          0.00%
    2000        100.00%          0.00%
    4000         69.79%         30.21%
    8000         39.74%         60.26%
   16000          9.74%         90.26%
   25000          0.00%        100.00%

for 99.0% success you need a cap of 19742 tokens
  worst-case cost of one such call at $10/1M output: $0.1974

for 99.9% success you need a cap of 20152 tokens
  worst-case cost of one such call at $10/1M output: $0.2015`,
        notes: [
          { t: "p", text: "The median reasoning length is 6,313 tokens and a cap set there fails almost exactly half the time — which is the point of the exercise. Sizing a cap on the mean or median of a long-tailed distribution guarantees that roughly half of requests fall on the wrong side of it, and the failure is silent: an empty answer and a full bill." },
          { t: "p", text: "The gap between the 99% and 99.9% caps is tiny here — 19,742 against 20,152 — because the assumed distribution has a hard ceiling at 100×. Real traffic does not, so on real data expect that gap to be much wider and the tail to be the thing that sets your cap. That is why you log the reasoning count from the first day rather than modelling it." },
          { t: "p", text: "The last number is the one to take to a planning conversation: a cap generous enough to almost never fail permits a call costing about 20¢ in output tokens alone. The cap is not a cost control — it is a failure bound, and the cost control is choosing not to send easy requests to a model at high depth at all." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the summaries that were silently blank for a week",
      body: [
        { t: "p", text: "**Symptom.** A document-analysis feature moved from a small model that did not reason to a reasoning model, to improve quality on complex contracts. Quality did improve. A week later, an audit found that 8% of processed documents had an empty `summary` field in the database. No errors had been logged and no alerts had fired." },
        { t: "p", text: "**Configuration.** The migration had kept the existing output cap of 1,500 tokens, carried across under the new API's name for it. Nobody re-examined the value, because on the old model 1,500 had been generous for a 300-token summary." },
        { t: "p", text: "**Mechanism.** On a reasoning model the cap covers reasoning and answer together. Complex contracts — exactly the population the migration was for — provoked long reasoning traces, and on 8% of them the trace consumed all 1,500 tokens before the summary began. The API returned an incomplete response with empty text, billed for 1,500 output tokens, and raised nothing. The ingestion code read the response text and wrote the empty string to the database." },
        { t: "p", text: "**Fix.** The cap went to 16,000 and the handler now raises on an incomplete response with empty text, retrying once at the lowest depth before failing loudly. Two durable lessons. The first is that migrating between model *classes* invalidates every parameter, not just the ones that were renamed — 12.6 is the playbook. The second is that the worst production failures are the ones that look like success: a model returning nothing, billed in full, is invisible to every metric except the one that checks whether the field is empty." }
      ] }
  ],

  takeaways: [
    "Reasoning tokens are **generated, billed at the output rate, counted against the output cap, and withheld from the response**. They are ordinary output tokens you cannot read.",
    "By late 2026 every hosted flagship reasons by default, under three sets of names: `reasoning.effort` and `max_output_tokens` on OpenAI, `output_config.effort` and `max_tokens` on Claude, `thinking_level` and `max_output_tokens` on Gemini.",
    "The worked example is 500 reasoning tokens for 50 visible ones — **90.9% of the bill is invisible**.",
    "The output cap covers reasoning and answer **together**, so a cap that is too low produces an incomplete response with empty text and a full charge. Nothing raises.",
    "With reasoning at 10–100× the answer, a 200-token answer costs between **2,200 and 20,200 billed tokens** — 2.2¢ to 20.2¢ at $10 per million.",
    "**The variance is the planning problem.** A tenfold spread means per-request cost is a distribution, and the hard inputs that justified paying for depth are the ones a small test set under-represents.",
    "Log the reasoning count from day one — `usage.output_tokens_details.reasoning_tokens` on OpenAI, `thoughts_token_count` on Gemini — because it is the only view of the dominant cost.",
    "The depth setting controls inference-time compute, which only helps where there is a genuine search. For extraction, classification and formatting, use **the smallest model at the lowest depth it allows**.",
    "Prompted chain-of-thought gives you a readable trace; built-in reasoning gives you a trace trained for the job. Use CoT when you must explain the answer, depth when the task is hard and the explanation does not matter — and never both.",
    "Sizing the cap on the median fails on more than half of requests — in the modelled distribution the median was 6,313 tokens and 99% success needed **19,742**.",
    "The cap is a **failure bound, not a cost control**. The cost control is not sending easy requests to a model at high depth."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You set an output cap of 400 tokens on a reasoning model and the response text is empty. What happened?",
        options: ["The request failed; retry it identically", "Reasoning used all 400 tokens; all billed", "The model had nothing to say", "The content filter removed the answer"],
        answer: 1,
        why: "The cap covers reasoning and answer together, and reasoning goes first — so a cap below the reasoning length leaves nothing for the answer, and the response arrives marked incomplete, with empty text, and a charge for every token generated. The first option would retry into the same wall, since the failure is deterministic in the cap. The third mistakes an exhausted budget for a model with no answer. A content filter is reported as its own reason, which is a different and distinguishable case." },

      { stem: "A model reasons for 10 to 100 times its visible output. What does a 200-token answer cost in billed output tokens?",
        options: ["200, since only visible tokens are billed", "Between 2,200 and 20,200", "Exactly 2,200", "Between 210 and 300"],
        answer: 1,
        why: "Reasoning tokens are billed as output, so the total is `200 × multiplier + 200` — 2,200 at 10× and 20,200 at 100×, a tenfold spread for identical visible output. The first option is the misconception the whole lesson addresses: hidden does not mean free. The third picks one end of the range as if the multiplier were fixed, and it is not something you control beyond the depth setting. The fourth treats reasoning as a small overhead rather than the dominant term." },

      { stem: "For which task is paying for deep reasoning the wrong choice?",
        options: ["Debugging a subtle concurrency bug", "Extracting five fields from an invoice", "Planning a multi-step migration", "A non-obvious mathematical proof"],
        answer: 1,
        why: "Extraction has no search to perform — the fields are present and the task is to read them out — so additional inference-time compute buys nothing while multiplying the output bill and adding seconds of latency. The other three involve genuine search over approaches, which is exactly what the reasoning tokens are spent on. The practical consequence is that routing matters: most requests sent to a flagship at its default depth do not need it, and a small model at its lowest setting handles them faster and far cheaper." },

      { stem: "You model reasoning length and find a median of 6,313 tokens. What cap do you set?",
        options: ["6,313, the median length", "About 20,000, sized on the tail", "1,500, as on the previous model", "As low as possible to control cost"],
        answer: 1,
        why: "Sizing on the median means roughly half of requests exceed it, and exceeding it produces an empty answer and a full bill rather than a slightly shorter answer — so the cap has to be sized on the tail, which in the modelled distribution needed 19,742 tokens for 99% success. Carrying over the previous model's value is exactly the migration failure in the closing incident, where a 1,500 cap left 8% of documents with empty summaries for a week. The fourth option treats the cap as a cost control, but it is a failure bound: lowering it converts expensive successes into equally expensive failures." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The answer that stands out is the one that treats the cap as a failure mode rather than a cost setting.",
    questions: [
      { level: "core",
        q: "What are reasoning tokens and how do they affect cost?",
        strong: "A strong answer states that they are billed output tokens you cannot see, gives a ratio, and names the cap interaction without being asked.",
        answer: [
          { t: "p", text: "They are chain-of-thought tokens a reasoning model generates internally before the visible answer. Mechanically they are ordinary output tokens — a forward pass each, billed at the output rate — and then the raw trace is withheld from the response. So you pay for text you cannot read." },
          { t: "p", text: "The ratio is the headline. Ten times the visible output is ordinary and a hundred times happens on hard inputs; at 500 reasoning tokens for 50 visible, 90.9% of the bill is invisible. On a 200-token answer that is somewhere between 2,200 and 20,200 billed tokens depending on how hard the model decided to think." },
          { t: "p", text: "And the part I would volunteer, because it is the one that actually bites: the output cap covers reasoning and answer together. Set it too low and the reasoning consumes the entire budget, the answer never starts, and you get an incomplete response with empty text and a full charge. Nothing raises." }
        ] },

      { level: "advanced",
        q: "How would you price a feature built on a reasoning model?",
        strong: "A strong answer treats per-request cost as a distribution rather than a number, and says why a small test set will mislead.",
        answer: [
          { t: "p", text: "I would not price it from test calls, because the per-request cost is a distribution rather than a number — a tenfold spread for identical visible output, and I do not control where in that range any given request lands." },
          { t: "p", text: "The problem with a small test set is directional. Easy inputs think briefly; the genuinely hard inputs that justified paying for depth think for a long time, and those are exactly the cases a hand-assembled test set under-represents. So an estimate from twenty test calls is biased low, systematically." },
          { t: "p", text: "What I would do instead: log the reasoning-token count on every call from the first day, run real traffic through it behind a flag, and price from the p95 rather than the mean. And I would separately measure how many of those requests actually needed that depth, because in my experience most do not — and routing the easy ones to a small model at its lowest setting is a larger saving than anything else on the table." }
        ] },

      { level: "advanced",
        q: "When would you rely on a model's built-in reasoning over chain-of-thought prompting?",
        strong: "A strong answer notes they are the same idea at different layers, and decides on whether the trace is needed.",
        answer: [
          { t: "p", text: "They are the same idea implemented at different layers — spend more compute at inference to get a better answer. Prompted CoT spends visible tokens; built-in reasoning spends hidden tokens that were trained for the purpose." },
          { t: "p", text: "So the decision turns on whether you need the trace. Prompted CoT puts the reasoning in the response, which means you can log it, read it when an answer is wrong, and show it to a user who asks why. That is most of what debugging an LLM feature consists of, and it is a real advantage." },
          { t: "p", text: "Built-in reasoning is better on genuinely hard problems and does not clutter the output with working. But it is opaque by construction, and the cost comparison is not obvious in its favour — prompted CoT generates tokens too, usually fewer, and you can see them." },
          { t: "p", text: "My rule: if the answer has to be explainable, prompted CoT at low depth. If the task is hard and the explanation does not matter, more depth. If neither holds, neither — which covers most extraction and classification work, where extra inference compute buys nothing at all. And never both at once, which pays for the working twice." }
        ] },

      { level: "advanced",
        q: "A team moved a pipeline to a reasoning model and 8% of records came back with an empty field. Diagnose it.",
        strong: "A strong answer reaches the cap interaction quickly and then generalises to what a model-class migration invalidates.",
        answer: [
          { t: "p", text: "First guess, and I would check it immediately: the cap. On the old model the cap bounded the answer; on a reasoning model it bounds reasoning plus answer. If they carried the old value over — which is the natural thing to do when the parameter has merely been renamed — then long reasoning traces exhaust it before the answer starts." },
          { t: "p", text: "The 8% figure supports it. The failures would cluster on the hardest inputs, because those are the ones that provoke the longest traces — and those are precisely the population the migration was undertaken for. So the feature failed worst on exactly the cases it was meant to improve." },
          { t: "p", text: "Confirming it takes one query: on the failing records, was the response marked incomplete with empty text, and what was the reasoning-token count? If the reasoning count equals the cap, that is the whole answer." },
          { t: "p", text: "The generalisation is what I would want the team to take away. Migrating between model *classes* invalidates every parameter, not only the renamed ones — caps, sampling settings, the prompt itself. And the failure was silent because an empty string is not an exception: any metric that does not explicitly check for a blank field reports full success. That is worth a check in the ingestion path regardless of which model is behind it." }
        ] }
    ]
  }
});
