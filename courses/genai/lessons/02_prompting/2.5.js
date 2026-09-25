EC.receiveLesson({
  id: "2.5",

  lede: "ReAct interleaves reasoning with action: the model thinks, calls a tool, reads the result, and thinks again. It is the pattern underneath essentially every agent, and it has one property that decides whether an agent is affordable — **the whole trace is re-sent on every step**, so input cost grows with the square of the number of steps. Measured on the reference's own example: eight steps of a 105-token trace cost 424 input tokens, not 105. At sixty-four steps the multiple is 32.5×.",

  objectives: [
    "Write the Thought / Action / Observation loop and say what terminates it",
    "Explain why input cost is quadratic in the number of steps",
    "Compute the cost of an agent run from its step count and trace length",
    "Name the failure modes specific to a loop, and the guards for each",
    "Decide when ReAct is the right shape and when a fixed chain is better"
  ],

  prerequisites: ["1.9", "2.3"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "the-loop", text: "Think, act, observe, repeat",
      sub: "Chain-of-thought with the world in the loop" },

    { t: "p", text: "Chain-of-thought (2.3) lets a model compute intermediate values. ReAct lets it *obtain* them — the intermediate step is a tool call whose result comes back from outside the model. The pattern is three token types repeated until an answer is produced." },

    { t: "code", lang: "text", title: "The reference's ReAct trace", code: `Thought: I need to find the population of Tokyo.
Action: search("Tokyo population 2024")
Observation: The population of Tokyo is approximately 14 million.
Thought: Now I need to compare it with New York.
Action: search("New York population 2024")
Observation: The population of New York City is approximately 8.3 million.
Thought: I can now answer the question.
Answer: Tokyo (14M) has about 5.7 million more people than NYC (8.3M).`,
      caption: "From 04_Prompt_Engineering.md §5. The model writes the Thought and the Action; your code produces the Observation and appends it. The loop ends when the model writes `Answer` instead of `Action`." },

    { t: "p", text: "Mechanically this is the function-calling loop from 1.9 with the reasoning made explicit. The `Thought` lines are chain-of-thought and buy the same thing — computation before a decision — and the `Action` lines are what 1.9 called step 2, the model emitting arguments for your code to execute." },

    { t: "callout", kind: "insight", title: "The Observation is the only part the model cannot invent",
      body: [
        { t: "p", text: "Thoughts and Actions are generated. Observations are not — they come from a tool, which means they are the one thing in the trace that is grounded in something outside the model's distribution." },
        { t: "p", text: "This is why ReAct helps with factual tasks in a way chain-of-thought alone does not: CoT can reason impeccably from an invented premise, and ReAct replaces the premise with a lookup. It is the same argument retrieval makes (5.1), applied per step rather than once at the start." },
        { t: "p", text: "It also means a bad tool poisons everything downstream. An Observation that is wrong, stale or truncated is treated as ground truth by every subsequent Thought, and the model has no way to doubt it." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "quadratic", text: "The cost is quadratic in steps",
      sub: "The model has no memory, so the whole trace goes back every time" },

    { t: "p", text: "Each step is a fresh request. The model has no memory between them, so everything produced so far — every Thought, every Action, every Observation — has to be in the prompt of the next call. The trace is sent once, then twice, then three times." },

    { t: "code", lang: "python", title: "g25.py — the trace, and what it is billed", code: `running = 0
for kind, text in TRACE:
    t = n("%s: %s" % (kind, text))
    running += t
    print("%-13s %6d %8d" % (kind, t, running))

cum, total_in = 0, 0
for i, (kind, text) in enumerate(TRACE, 1):
    cum += n("%s: %s" % (kind, text))
    total_in += cum                        # this step's whole context, billed again
    print("after step %d: context %3d tokens, cumulative input billed %4d"
          % (i, cum, total_in))`,
      out: `  the whole trace is 105 tokens. In a ReAct loop the ENTIRE trace is re-sent
  on every step, so the input cost is quadratic in the number of steps:
    after step 1: context  11 tokens, cumulative input billed   11
    after step 2: context  21 tokens, cumulative input billed   32
    after step 3: context  33 tokens, cumulative input billed   65
    after step 4: context  45 tokens, cumulative input billed  110
    after step 5: context  56 tokens, cumulative input billed  166
    after step 6: context  72 tokens, cumulative input billed  238
    after step 7: context  81 tokens, cumulative input billed  319
    after step 8: context 105 tokens, cumulative input billed  424

  8 steps of a 105-token trace cost 424 input tokens, not 105.
  ratio: 4.04x`,
      hl: [15, 16, 17],
      caption: "The trace a human reads is 105 tokens. The trace you are billed for is 424. The ratio is roughly half the step count, and it grows without bound." },

    { t: "code", lang: "python", title: "g25.py — how it scales", code: `for steps in (4, 8, 16, 32, 64):
    per = running / len(TRACE)                 # average tokens per step
    total = sum(per * i for i in range(1, steps + 1))
    print("%2d steps: trace %5.0f tokens, input billed %7.0f (%.1fx the trace)"
          % (steps, per * steps, total, total / (per * steps)))`,
      out: `   4 steps: trace    52 tokens, input billed     131 (2.5x the trace)
   8 steps: trace   105 tokens, input billed     472 (4.5x the trace)
  16 steps: trace   210 tokens, input billed    1785 (8.5x the trace)
  32 steps: trace   420 tokens, input billed    6930 (16.5x the trace)
  64 steps: trace   840 tokens, input billed   27300 (32.5x the trace)`,
      caption: "Doubling the steps roughly quadruples the input cost. A 64-step agent pays **32.5×** the tokens its trace contains — and that is before the tool definitions (1.9) and system prompt, which are re-sent every step too." },

    { t: "viz", title: "What an agent actually pays for", caption: "Each bar is one step's prompt. The model has no memory, so step 8 carries everything from steps 1–7 with it, and pays for all of it again.",
      svg: `<svg viewBox="0 0 760 228" width="100%" role="img" aria-label="Quadratic input cost of a ReAct loop">
  <text x="16" y="24" class="s-label">prompt sent at each step</text>
  <rect x="16" y="34" width="20" height="18" rx="3" style="fill:var(--accent)" opacity="0.8"/>
  <rect x="16" y="56" width="38" height="18" rx="3" style="fill:var(--accent)" opacity="0.8"/>
  <rect x="16" y="78" width="60" height="18" rx="3" style="fill:var(--accent)" opacity="0.8"/>
  <rect x="16" y="100" width="82" height="18" rx="3" style="fill:var(--accent)" opacity="0.8"/>
  <rect x="16" y="122" width="102" height="18" rx="3" style="fill:var(--accent)" opacity="0.8"/>
  <rect x="16" y="144" width="131" height="18" rx="3" style="fill:var(--accent)" opacity="0.8"/>
  <rect x="16" y="166" width="147" height="18" rx="3" style="fill:var(--accent)" opacity="0.8"/>
  <rect x="16" y="188" width="191" height="18" rx="3" style="fill:var(--crit)" opacity="0.85"/>

  <text x="220" y="47" class="s-mono">11</text>
  <text x="220" y="69" class="s-mono">21</text>
  <text x="220" y="91" class="s-mono">33</text>
  <text x="220" y="113" class="s-mono">45</text>
  <text x="220" y="135" class="s-mono">56</text>
  <text x="220" y="157" class="s-mono">72</text>
  <text x="220" y="179" class="s-mono">81</text>
  <text x="220" y="201" class="s-mono" style="fill:var(--crit)">105</text>

  <line x1="300" y1="30" x2="300" y2="210" style="stroke:var(--line)" stroke-width="1"/>
  <text x="330" y="70" class="s-label">the trace a human reads</text>
  <text x="330" y="90" class="s-mono">105 tokens</text>
  <text x="330" y="130" class="s-label" style="fill:var(--crit)">the input you are billed</text>
  <text x="330" y="150" class="s-mono" style="fill:var(--crit)">424 tokens — 4.04x</text>
  <text x="330" y="186" class="s-sub">and the system prompt and every tool definition</text>
  <text x="330" y="202" class="s-sub">ride along on all eight of those bars</text>
</svg>` },

    { t: "callout", kind: "good", title: "Three things that actually reduce it",
      body: [
        { t: "p", text: "**Cache the static prefix.** The system prompt and tool definitions are identical on every step, so putting them first makes them a cacheable prefix (1.13). On a long agent run this is the largest single saving available, because those tokens are re-sent more times than anything else." },
        { t: "p", text: "**Compress old observations.** A tool result from step 2 is rarely needed verbatim at step 20. Summarising or dropping observations older than a few steps bounds the context growth, at the cost of the agent being unable to revisit them." },
        { t: "p", text: "**Cap the steps.** A loop with no limit is a loop that can run until the context window ends, and the last steps are the most expensive ones. A hard cap is both a cost control and a safety control, and §04 is about why." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "implementing", text: "The loop, written out",
      sub: "What terminates it, and what happens when a tool fails" },

    { t: "code", lang: "python", title: "react.py", code: `def react(question, tools, *, max_steps=10, budget_tokens=50_000):
    messages = [{"role": "system", "content": SYSTEM},
                {"role": "user", "content": question}]
    spent = 0

    for step in range(max_steps):
        r = client.chat.completions.create(model=MODEL, messages=messages,
                                           tools=tools, tool_choice="auto")
        spent += r.usage.total_tokens
        msg = r.choices[0].message
        messages.append(msg)                       # the Thought + Action, verbatim

        if not msg.tool_calls:                     # the model chose to Answer
            return msg.content, step, spent

        for call in msg.tool_calls:                # the Observation
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": json.dumps(execute(call)),   # errors come back as data
            })

        if spent > budget_tokens:                  # a second, independent stop
            raise BudgetExhausted(step, spent)

    raise StepLimitReached(max_steps, spent)       # NOT a silent return`,
      hl: [13, 23, 25],
      caption: "Two independent termination conditions and no silent success. A loop that exits at the step limit and returns whatever it has is a loop that will quietly return half-answers under load." },

    { t: "p", text: "Three details do the work. The assistant message goes back **verbatim** — the same rule as 1.9, and dropping it makes the Observation reply to nothing. Tool errors are returned as data so the model can recover, retry with different arguments or explain the failure. And both limits raise rather than returning, so an exhausted agent is a visible failure rather than a plausible short answer." },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "failures", text: "The failure modes are loop failures",
      sub: "Not wrong answers — non-terminating ones" },

    { t: "table",
      head: ["Failure", "What it looks like", "Guard"],
      rows: [
        ["**Looping**", "The same Action with the same arguments, repeatedly", "Detect repeats; inject \"you already tried this\" as an Observation"],
        ["**Thrashing**", "Alternating between two approaches without progress", "Step cap; a progress check every N steps"],
        ["**Premature answer**", "Answering from memory without calling the tool it needed", "A system-prompt rule to search first (2.15); check the trace"],
        ["**Tool obsession**", "Calling tools long after it has enough to answer", "Cap steps; make the answering condition explicit in the prompt"],
        ["**Context overflow**", "The trace fills the window and the earliest steps are truncated", "Budget in tokens, not just steps (1.5)"],
        ["**Injected instruction**", "A tool result contains text the model treats as an instruction", "Never execute on a model's say-so alone (1.9, 2.16)"]
      ],
      caption: "Every row is a property of the loop rather than of any single response, which is why agent debugging needs the trace and not the answer. 10.5 is about capturing it." },

    { t: "callout", kind: "trap", title: "The step cap is a safety control, not just a budget",
      body: [
        { t: "p", text: "It is tempting to set `max_steps` high \"in case a hard question needs it\". But the steps at the end of a long run are the ones where the model is most likely to be lost — it has a long trace of unsuccessful attempts in context, and each one is evidence for continuing to flail." },
        { t: "p", text: "The measured cost shape makes this worse: those late steps are also the most expensive ones, because each carries the whole trace. A 64-step cap does not cost eight times a 8-step cap; it costs roughly sixty times, by the quadratic." },
        { t: "p", text: "A low cap that fails loudly is almost always better than a high cap that succeeds occasionally. Ten steps is a reasonable default, and a task that regularly needs more is a task that wants decomposing (2.8) rather than more budget." }
      ] },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "when", text: "When a loop is the right shape",
      sub: "And when a fixed chain is better" },

    { t: "dl", items: [
      ["Use ReAct when the number of steps is unknown", "A research question might need one lookup or six, and which tool to use next depends on what the last one returned. That branching is what the loop is for."],
      ["Use a fixed chain when the steps are known", "Extract, then classify, then summarise is not a loop — it is three calls in a known order. Making it an agent adds cost, latency, non-determinism and a failure mode, for a control flow you already knew. 2.8 is the lesson."],
      ["Use a single call when one is enough", "The most common over-engineering in this area. A question answerable from the prompt does not need a loop around it, and a loop will sometimes take two steps to reach the same answer."]
    ] },

    { t: "p", text: "The honest test: can you draw the flowchart? If you can, write it as code — the control flow belongs in your program, where it is deterministic, testable and cheap. If you genuinely cannot, because the path depends on data you will not have until runtime, that is what an agent is for." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Price an agent properly, including the quadratic",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Agent cost estimates are usually built as `steps × cost_per_call`, which is linear and wrong. The re-sent trace makes it quadratic, and the system prompt and tool definitions ride along on every step." },
        { t: "p", text: "Build the correct model and find out how much the naive estimate understates." }
      ],
      requirements: [
        "Model a run of N steps with a fixed system prompt, T tool definitions, and S tokens produced per step",
        "Compute total input tokens exactly, accounting for the growing trace and the re-sent static prefix",
        "Compare against the naive `N × (static + S)` estimate for N = 5, 10, 20, 40",
        "Report the understatement factor at each N",
        "Report what fraction of the total the static prefix is, and what prompt caching would save"
      ],
      hint: "Input at step i is `static + (i−1) × S`. Sum over i. The static part is `N × static` regardless, which is exactly the part a cache discounts.",
      solution: { lang: "python", title: "g25_ex.py",
        code: `SYSTEM_TOKENS = 400
TOOLS, TOKENS_PER_TOOL = 8, 85
PER_STEP = 60                      # Thought + Action + Observation, per step
IN_RATE, OUT_RATE = 2.50, 10.00
OUT_PER_STEP = 40

static = SYSTEM_TOKENS + TOOLS * TOKENS_PER_TOOL

print("static prefix: %d tokens (system %d + %d tools x %d)"
      % (static, SYSTEM_TOKENS, TOOLS, TOKENS_PER_TOOL))
print()
print("%4s %12s %12s %10s %14s %12s"
      % ("N", "real input", "naive", "understate", "static share", "cost (real)"))

for N in (5, 10, 20, 40):
    real  = sum(static + (i - 1) * PER_STEP for i in range(1, N + 1))
    naive = N * (static + PER_STEP)
    out   = N * OUT_PER_STEP
    cost  = (real * IN_RATE + out * OUT_RATE) / 1e6
    print("%4d %12d %12d %9.2fx %13.0f%% %12.6f"
          % (N, real, naive, real / naive, 100 * (N * static) / real, cost))

print()
for N in (10, 40):
    real   = sum(static + (i - 1) * PER_STEP for i in range(1, N + 1))
    cached = sum(static * 0.5 + (i - 1) * PER_STEP for i in range(1, N + 1))
    print("N=%-3d with a 50%% prefix cache: %d -> %d input tokens (%.0f%% saved)"
          % (N, real, cached, 100 * (1 - cached / real)))`,
        out: `static prefix: 1080 tokens (system 400 + 8 tools x 85)

   N   real input        naive understate   static share  cost (real)
   5         6000         5700      1.05x            90%     0.017000
  10        13500        11400      1.18x            80%     0.037750
  20        33000        22800      1.45x            65%     0.090500
  40        90000        45600      1.97x            48%     0.241000

N=10  with a 50% prefix cache: 13500 -> 8100 input tokens (40% saved)
N=40  with a 50% prefix cache: 90000 -> 68400 input tokens (24% saved)`,
        notes: [
          { t: "p", text: "The naive estimate understates by 5% at five steps and **97% at forty** — it is barely half the real figure by the time a run gets long. That is the shape to carry away: agent cost estimates built linearly are fine for short runs and badly wrong for exactly the long runs that worry you." },
          { t: "p", text: "The static-share column is the more actionable one, and it runs the other way. At five steps the system prompt and tool definitions are **90%** of all input tokens; at forty they are 48%. So for short agents the whole cost problem is the static prefix, and prompt caching is the entire answer — 40% saved at ten steps with a 50% cache. For long agents the growing trace dominates and caching helps less, which is where compressing old observations starts to matter instead." },
          { t: "p", text: "The two levers therefore apply at opposite ends, which is not obvious and is worth knowing before optimising. Short agent, many tools: cache the prefix. Long agent, few tools: bound the trace. Doing the wrong one gets you a few percent." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the research agent that cost £40 per question",
      body: [
        { t: "p", text: "**Symptom.** An internal research assistant was budgeted at about £0.30 a question from a prototype measurement. In production the mean was £2.10 and the worst individual question came to £41." },
        { t: "p", text: "**What the traces showed.** The prototype had been measured on questions answerable in two or three steps. Real questions often took fifteen to twenty, and the £41 outlier had run to its 60-step cap: the model had been searching for a figure that did not exist, and each attempt was evidence in the context for trying another phrasing." },
        { t: "p", text: "**Mechanism.** Two multipliers stacked on the naive estimate. The quadratic — twenty steps is not seven times three steps, it is closer to forty times by the sum. And the static prefix: a 400-token system prompt plus twenty-two tool definitions, around 2,300 tokens re-sent on every one of those sixty steps, which alone is 138,000 input tokens before a single Thought is counted." },
        { t: "p", text: "**Fix.** Three changes, in the order that mattered. The step cap came down from 60 to 12 and raises rather than returning, which capped the worst case and — because the late steps were where the model was lost — barely moved the success rate. Tool routing (1.9) cut twenty-two definitions to five per run. And the static prefix moved to the front of the request for caching. Mean cost went to £0.34. The estimate that had been wrong was not wrong about the model or the prompt: it was wrong because it multiplied a per-call cost by a step count, and neither of those is constant in a loop." }
      ] }
  ],

  takeaways: [
    "**ReAct is chain-of-thought with the world in the loop**: Thought and Action are generated, Observation comes from a tool. The loop ends when the model answers instead of acting.",
    "The Observation is **the only part the model cannot invent**, which is why ReAct helps on factual tasks where CoT alone reasons impeccably from an invented premise.",
    "**Input cost is quadratic in steps**, because the whole trace is re-sent every time. Measured on the reference's trace: 8 steps of a 105-token trace cost **424 input tokens** — 4.04×.",
    "Doubling the steps roughly quadruples the input cost: **2.5× the trace at 4 steps, 32.5× at 64**.",
    "The system prompt and tool definitions ride along on every step too — often the larger term on short runs.",
    "Measured over a realistic agent: the naive `steps × cost_per_call` estimate understates by 5% at five steps and **97% at forty**.",
    "**The static prefix is 90% of input at five steps and 48% at forty.** Cache the prefix for short agents; bound the trace for long ones — the two levers apply at opposite ends.",
    "Two independent termination conditions — a step cap and a token budget — and **both should raise rather than return**, or an exhausted agent returns a plausible half-answer.",
    "Agent failures are **loop failures**: looping, thrashing, premature answers, tool obsession, context overflow. Debugging them needs the trace, not the answer.",
    "**A low cap that fails loudly beats a high cap that occasionally succeeds.** Late steps are both the most expensive and the ones where the model is most lost.",
    "**If you can draw the flowchart, write it as code.** A loop is for when the path genuinely depends on data you will not have until runtime."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "An agent produces a 105-token trace over 8 steps. How many input tokens is the trace billed at?",
        options: ["105 — it is sent once", "840 — 105 tokens × 8 steps", "424 — each step re-sends everything so far", "It depends on the model"],
        answer: 2,
        why: "The model has no memory between steps, so step i carries everything produced in steps 1 to i−1 — the sum is 424 for this trace, measured, which is 4.04× what a human reads. The first option assumes conversational memory that does not exist. The second multiplies the full trace by the step count, which over-counts because early steps carry less than the whole trace. The mechanism is the same on every model, so the fourth is wrong in kind." },

      { stem: "You are tuning cost on a 5-step agent with 20 tool definitions. What is the biggest lever?",
        options: ["Reducing the number of steps", "Prompt caching on the static prefix, which is ~90% of input tokens at that length", "Compressing old observations", "A cheaper model"],
        answer: 1,
        why: "Measured, at five steps the system prompt and tool definitions are about 90% of all input tokens, because the growing trace has not had time to dominate — so caching the prefix or routing to fewer tools is where the money is. Compressing observations targets the trace, which matters at forty steps and barely at five: the two levers apply at opposite ends of the run length. A cheaper model is a separate axis and may not clear the quality bar." },

      { stem: "Your agent hits its 30-step cap and returns whatever it has. What is wrong with that?",
        options: ["Nothing — a partial answer is better than none", "An exhausted agent returns a plausible half-answer indistinguishable from a real one; it should raise", "The cap should be higher", "Steps are cheap so the cap is unnecessary"],
        answer: 1,
        why: "A silent return at the cap produces an answer that looks like success to every caller and every metric, which is the same class of failure as an empty reasoning response in 1.10 — invisible until a user complains. Raising makes the exhaustion visible and lets the caller decide. A higher cap makes it worse on both axes, since late steps are the most expensive by the quadratic and the ones where the model is most lost. Steps are emphatically not cheap: 64 of them cost 32.5× the trace." },

      { stem: "When should you use a fixed chain instead of a ReAct loop?",
        options: ["Never — agents are more capable", "When the sequence of steps is known in advance", "When the task is simple", "When latency matters"],
        answer: 1,
        why: "If you can draw the flowchart, the control flow belongs in your code, where it is deterministic, testable, cheaper and has no non-termination failure mode — extract, then classify, then summarise is three calls in a known order, not a loop. A loop exists for the case where which step comes next depends on what the last one returned. Task simplicity and latency are consequences rather than the criterion: a simple task with an unknown path still needs a loop, and a complex one with a known path does not." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "ReAct questions are agent questions, and the discriminator is whether you have run one at scale or read about one.",
    questions: [
      { level: "core",
        q: "Explain ReAct.",
        strong: "A strong answer gives the loop, says what terminates it, and names what the Observation contributes that reasoning alone cannot.",
        answer: [
          { t: "p", text: "Thought, Action, Observation, repeated until the model answers. The model writes the Thought and the Action; your code executes the action and appends the Observation. It is the function-calling loop with the reasoning made explicit." },
          { t: "p", text: "What the Observation contributes is the part worth naming: it is the only element of the trace the model did not generate. Chain-of-thought can reason impeccably from an invented premise; ReAct replaces the premise with a lookup. Which is also the risk — a wrong or stale tool result is treated as ground truth by every subsequent step." },
          { t: "p", text: "And it is the foundation of essentially every agent, so most agent behaviour and most agent failure is a property of this loop rather than of any single response." }
        ] },

      { level: "advanced",
        q: "How do you estimate the cost of an agent?",
        strong: "A strong answer knows the cost is quadratic and can say by how much a linear estimate is wrong.",
        answer: [
          { t: "p", text: "Not as steps times cost per call, which is the estimate everyone builds and it is wrong in the direction that hurts. The model has no memory, so every step re-sends the whole trace so far — input cost is quadratic in the step count." },
          { t: "p", text: "Measured on the reference's own eight-step example: the trace is 105 tokens and the input billed is 424, a factor of four. At 64 steps it is 32.5×. And on a realistic agent the naive linear estimate understated by 97% at forty steps." },
          { t: "p", text: "The other term people forget is the static prefix — system prompt plus tool definitions, re-sent on every step. At five steps that was 90% of all input tokens, and at forty it was 48%. Which tells you where to optimise: cache the prefix for short agents, compress the trace for long ones. They are different levers and doing the wrong one gets you a few percent." }
        ] },

      { level: "advanced",
        q: "An agent occasionally runs to its 60-step cap and costs £40. What do you change?",
        strong: "A strong answer lowers the cap and explains why that barely costs success rate, then attacks the prefix.",
        answer: [
          { t: "p", text: "Lower the cap first, and have it raise rather than return. The instinct is that a high cap gives hard questions room, but the late steps are where the model is most lost — it has a long trace of failed attempts in context, and each one is evidence for trying another phrasing. In the case I have in mind, going from 60 to 12 barely moved the success rate and capped the worst case entirely." },
          { t: "p", text: "It also fixes the cost disproportionately, because of the quadratic: the last twenty steps of a sixty-step run cost far more than the first twenty. Halving the cap does much better than halving the cost." },
          { t: "p", text: "Then the static prefix. Twenty-two tool definitions re-sent sixty times is over a hundred thousand input tokens before any reasoning is counted. Route to five relevant tools per run and put the survivors at the front of the request for caching." },
          { t: "p", text: "And I would ask whether the task needs a loop at all. A question that reliably takes fifteen steps often has a known shape, and a fixed chain of three calls would be cheaper, faster, testable and incapable of failing to terminate." }
        ] }
    ]
  }
});
