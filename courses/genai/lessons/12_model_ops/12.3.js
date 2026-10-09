EC.receiveLesson({
  id: "12.3",

  lede: "The first question is whether you need it at all, and the answer is usually no \u2014 **RAG injects knowledge at query time; fine-tuning bakes in behaviour.** Fine-tuning is a *poor* way to add facts and a *good* way to teach a consistent format or compress a long prompt into the weights. The main production risk is **catastrophic forgetting**: the reference\u2019s illustration has task accuracy going 70% to 92% while a general benchmark falls 85% to 61%, and the defence is keeping a general eval in the suite so you can *see* it.",

  objectives: [
    "Choose between prompting, RAG and fine-tuning from what needs to change",
    "Explain why fine-tuning is a poor way to add facts",
    "Detect catastrophic forgetting and name four defences",
    "Say what LoRA buys at serving time",
    "Version a fine-tune so it is reproducible and rollback-able"
  ],

  prerequisites: ["12.2", "4.1"],

  blocks: [

    { t: "h2", n: "01", id: "need", text: "Do you even need it?",
      sub: "Three tools, three different jobs" },

    { t: "table",
      head: ["Use\u2026", "When you need to change\u2026", "Example"],
      rows: [
        ["**Prompting / few-shot**", "nothing in the model; just instructions", "quick behaviour tweaks"],
        ["**RAG**", "the model's **knowledge** (facts it should use)", "\u201canswer from our latest docs\u201d"],
        ["**Fine-tuning**", "the model's **behaviour / format / style**", "\u201calways output our exact JSON schema, house tone, a narrow classification\u201d"]
      ] },

    { t: "callout", kind: "insight", title: "Fine-tuning is a poor way to add facts, for three separate reasons",
      body: [
        { t: "p", text: "Facts baked into weights **go stale**, and updating them means another training run rather than an index write. They **cannot be cited**, so 11.3\u2019s citation validation has nothing to validate against and 11.5\u2019s whole second layer is unavailable. And the model **hallucinates around them** \u2014 it has learned the shape of your facts, which makes plausible neighbours more fluent rather than less." },
        { t: "p", text: "That third point is the one that surprises people, and 11.1 explains it: the objective rewards plausible continuations, so training on your domain makes the model better at producing text *shaped* like your facts. A fine-tune on product specifications produces more convincing invented specifications." },
        { t: "p", text: "So the sequencing is: prompt first, then RAG for knowledge, then fine-tune for behaviour, format or cost. And \u2018for cost\u2019 is a real reason \u2014 11.8 measured few-shot examples at 2,500 tokens a call, and compressing them into weights removes that from every request." }
      ] },

    { t: "h2", n: "02", id: "forgetting", text: "Catastrophic forgetting",
      sub: "The main production risk" },

    { t: "code", lang: "text", title: "The illustration", code: `Before FT:  task accuracy 70% | general benchmark 85%
After FT:   task accuracy 92% | general benchmark 61%   <- forgot a lot`,
      hl: [2],
      caption: "+22 points on the task, \u221224 on everything else. The trade is only visible if you measure both." },

    { t: "callout", kind: "trap", title: "The task metric improves, which is what makes it dangerous",
      body: [
        { t: "p", text: "A fine-tune that over-specialises reports **success** on every metric the team was watching. Task accuracy went up 22 points; that is the number in the ticket, the number in the demo, and the number on the dashboard. The 24-point general regression is invisible unless a general benchmark was in the suite before the run." },
        { t: "p", text: "This is the same structure as 11.17\u2019s closing rule \u2014 a single number that only improves is measuring one error direction \u2014 and it is the most expensive instance of it in the module, because a fine-tune is hard to reverse and the regression surfaces as scattered user complaints about unrelated tasks." },
        { t: "p", text: "So the defence is ordering: **put the general eval in the suite before you train**, not after you suspect a problem. A baseline measured after the fine-tune cannot tell you what was lost." }
      ] },

    { t: "dl", items: [
      { k: "Always keep a general-capability eval", v: "A held-out broad benchmark in the suite, not just task metrics \u2014 so you *see* the regression rather than inferring it from complaints." },
      { k: "LoRA / PEFT", v: "Train small adapters instead of all weights. Cheaper, and **the base model stays intact** \u2014 so swapping the adapter out recovers general behaviour, which makes the failure reversible." },
      { k: "Mix in general data", v: "During fine-tuning, with a low learning rate and few epochs. The forgetting is a function of how hard you push, not only of what you push towards." },
      { k: "Validate on out-of-task prompts", v: "Before shipping. The in-task test set cannot detect over-specialisation by construction, because it only contains the task." }
    ] },

    { t: "callout", kind: "good", title: "LoRA\u2019s real argument is reversibility, and the serving win is a bonus",
      body: [
        { t: "p", text: "The reference leads with cost: adapters are tiny, so you can serve **many fine-tunes from one base model**, loading or swapping per request, instead of hosting many full models. That is a genuine saving at serving time and it compounds with 11.9\u2019s routing \u2014 one base, many behaviours, one set of weights in memory." },
        { t: "p", text: "But the property that matters more for this lesson is that **the base model stays intact.** Catastrophic forgetting with a full fine-tune is a damaged artefact; with an adapter it is a detachable one. Detaching restores the general behaviour, which turns an irreversible mistake into a configuration change." },
        { t: "p", text: "4.5 covers the mechanics. The operational point here is that the choice of LoRA over full fine-tuning is partly a **risk** decision rather than purely a cost one, and the risk argument is the stronger of the two." }
      ] },

    { t: "h2", n: "03", id: "discipline", text: "Data and eval discipline",
      sub: "And the one that makes a fine-tune an asset rather than an accident" },

    { t: "dl", items: [
      { k: "Data quality dominates", v: "A few thousand clean, consistent, representative examples beat a huge noisy set. 2.6 measured the sharper version: one wrong label in four **halved** performance on a task the model otherwise got right at two shots." },
      { k: "Hold out a real test set", v: "Never evaluate on training data. Standard, and worth restating because a fine-tuning run makes training-set performance look spectacular." },
      { k: "Version data, base model and adapter together", v: "So a fine-tune is reproducible and rollback-able. 12.4's seventh failure mode is the consequence of not doing this: your fine-tune dies with its base." },
      { k: "Re-run the full eval harness", v: "Task, general and safety, before promoting \u2014 the same gates as any model change, which is 12.1's harness and 12.2's gate applied to weights instead of a prompt." }
    ] },

    { t: "callout", kind: "warn", title: "The versioning rule is the one with a hard test attached",
      body: [
        { t: "p", text: "12.4 puts it bluntly: store the training-data snapshot, the hyperparameters, the base model ID and the eval results in version control, forever \u2014 and **if you cannot re-create the fine-tune in a day, you do not own it.** That is a test you can actually run, which is what makes it a useful rule rather than a platitude." },
        { t: "p", text: "The reason it is not optional is that your fine-tune is weights *on top of a base model*. When the base is retired, the adapter is retired with it \u2014 and the only path forward is re-training on the new base from the preserved recipe. 12.7\u2019s timeline has that at day 75." },
        { t: "p", text: "So a fine-tune is a **derived artefact with a dependency that has an end date.** Treating it as a permanent asset is the mistake, and the preserved recipe is what converts a forced migration from a rebuild into a re-run." }
      ] },

    { t: "viz", title: "Three tools, and the risk fine-tuning adds", caption: "The task metric improves, which is why the regression is invisible.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Prompting versus RAG versus fine-tuning, and catastrophic forgetting">
  <text x="16" y="20" class="s-label">WHAT NEEDS TO CHANGE?</text>
  <rect x="16" y="30" width="236" height="52" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="28" y="48" class="s-mono" style="font-size:9px;fill:var(--good)">NOTHING &#8212; just instructions</text>
  <text x="28" y="64" class="s-mono" style="font-size:9px">PROMPTING / few-shot</text>
  <text x="28" y="77" class="s-sub">cheapest, reversible, try first</text>

  <rect x="262" y="30" width="236" height="52" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="274" y="48" class="s-mono" style="font-size:9px;fill:var(--accent)">KNOWLEDGE &#8212; the facts</text>
  <text x="274" y="64" class="s-mono" style="font-size:9px">RAG</text>
  <text x="274" y="77" class="s-sub">citable, updatable, measurable</text>

  <rect x="508" y="30" width="236" height="52" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="520" y="48" class="s-mono" style="font-size:9px;fill:var(--warn)">BEHAVIOUR / FORMAT / COST</text>
  <text x="520" y="64" class="s-mono" style="font-size:9px">FINE-TUNING</text>
  <text x="520" y="77" class="s-sub">bakes in style, not facts</text>

  <rect x="16" y="92" width="728" height="34" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="28" y="110" class="s-mono" style="font-size:9px;fill:var(--crit)">FINE-TUNING IS A POOR WAY TO ADD FACTS: THEY GO STALE, CANNOT BE CITED, AND IT HALLUCINATES AROUND THEM</text>
  <text x="28" y="122" class="s-sub">training on your domain makes INVENTED facts more fluent, not less &#8212; the objective rewards plausibility</text>

  <line x1="16" y1="142" x2="744" y2="142" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="162" class="s-label">CATASTROPHIC FORGETTING &#8212; AND WHY IT HIDES</text>

  <text x="20" y="186" class="s-mono" style="font-size:9px">task accuracy</text>
  <rect x="150" y="176" width="210" height="14" rx="2" class="s-fill" style="stroke:var(--line)" stroke-width="1"/>
  <text x="368" y="187" class="s-mono" style="font-size:8px">70% before</text>
  <rect x="150" y="194" width="276" height="14" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="434" y="205" class="s-mono" style="font-size:8px;fill:var(--good)">92% after &#8212; +22 pts, THE NUMBER IN THE TICKET</text>

  <text x="20" y="232" class="s-mono" style="font-size:9px">general benchmark</text>
  <rect x="150" y="222" width="255" height="14" rx="2" class="s-fill" style="stroke:var(--line)" stroke-width="1"/>
  <text x="413" y="233" class="s-mono" style="font-size:8px">85% before</text>
  <rect x="150" y="240" width="183" height="14" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="341" y="251" class="s-mono" style="font-size:8px;fill:var(--crit)">61% after &#8212; -24 pts, INVISIBLE unless measured BEFORE</text>

  <rect x="16" y="266" width="356" height="46" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="284" class="s-mono" style="font-size:9px;fill:var(--good)">LoRA&#8217;S REAL ARGUMENT IS REVERSIBILITY</text>
  <text x="28" y="300" class="s-sub">the base stays intact, so detaching the adapter</text>
  <text x="28" y="310" class="s-sub">recovers general behaviour &#8212; cost is the bonus</text>

  <rect x="388" y="266" width="356" height="46" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="400" y="284" class="s-mono" style="font-size:9px;fill:var(--violet)">AND THE TEST THAT MATTERS</text>
  <text x="400" y="300" class="s-sub">if you cannot re-create the fine-tune in a day,</text>
  <text x="400" y="310" class="s-sub">you do not own it &#8212; it dies with its base</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Price the forgetting trade, and decide", difficulty: "core", minutes: 30,
      body: "Take the forgetting figures and work out what they mean for a product where only some traffic is the fine-tuned task. Then compute the token saving a fine-tune buys by removing few-shot examples, and decide whether the trade is worth it at several task-traffic shares.",
      requirements: [
        "The weighted accuracy across task and non-task traffic, before and after",
        "The task-traffic share at which the fine-tune breaks even",
        "The token saving from removing few-shot examples, priced",
        "A recommendation at low, medium and high task shares",
        "The reversibility difference between LoRA and a full fine-tune, stated"
      ],
      hint: "A fine-tune that improves the task by 22 points and costs 24 points elsewhere is only a net win if the task is a large enough share of traffic. Compute the break-even share.",
      solution: { lang: "python", title: "the forgetting trade, weighted by traffic", code: `BEFORE = {"task": 0.70, "general": 0.85}
AFTER  = {"task": 0.92, "general": 0.61}

def weighted(share, acc):
    """share = fraction of traffic that is the fine-tuned task."""
    return share * acc["task"] + (1 - share) * acc["general"]

print("THE FORGETTING TRADE, WEIGHTED BY TRAFFIC MIX")
print("=" * 72)
print("task     %.2f -> %.2f  (%+.0f points)"
      % (BEFORE["task"], AFTER["task"], 100 * (AFTER["task"] - BEFORE["task"])))
print("general  %.2f -> %.2f  (%+.0f points)"
      % (BEFORE["general"], AFTER["general"], 100 * (AFTER["general"] - BEFORE["general"])))
print()
print("%-14s %12s %12s %10s  %s" % ("task share", "before", "after", "delta", "verdict"))
for share in (0.10, 0.25, 0.50, 0.52, 0.60, 0.75, 0.90, 1.00):
    b, a = weighted(share, BEFORE), weighted(share, AFTER)
    verdict = "fine-tune wins" if a > b else "fine-tune LOSES"
    print("%-14.0f%% %12.4f %12.4f %+10.4f  %s" % (share * 100, b, a, a - b, verdict))

# break-even: share * 0.22 = (1 - share) * 0.24
dt = AFTER["task"] - BEFORE["task"]
dg = AFTER["general"] - BEFORE["general"]
be = -dg / (dt - dg)
print()
print("break-even task share = %.4f (%.1f%%)" % (be, 100 * be))
print("  below that, the fine-tune makes the PRODUCT worse while making the")
print("  TASK METRIC better -- which is the number everyone is watching.")

# ---------------------------------------------------------------- the cost side
print()
print("=" * 72)
print("THE OTHER REASON TO FINE-TUNE: COMPRESSING THE PROMPT")
print("=" * 72)
PRICE_IN, PRICE_OUT = 5.0, 15.0
CALLS = 1_000_000
FEWSHOT_TOKENS = 2500        # 11.7's measured line item
OTHER_IN, OUT = 5500, 400    # the rest of the prompt

def cost(tin, tout=OUT):
    return tin / 1e6 * PRICE_IN + tout / 1e6 * PRICE_OUT

with_fs = cost(OTHER_IN + FEWSHOT_TOKENS)
without  = cost(OTHER_IN)
print("with few-shot    %d in -> $%.5f/call, $%s/month"
      % (OTHER_IN + FEWSHOT_TOKENS, with_fs, format(int(with_fs * CALLS), ",")))
print("baked into weights %d in -> $%.5f/call, $%s/month"
      % (OTHER_IN, without, format(int(without * CALLS), ",")))
print("saving $%s/month (%.1f%%)"
      % (format(int((with_fs - without) * CALLS), ","),
         100 * (with_fs - without) / with_fs))
print()
print("that is a real and recurring saving, and it is the one reason to")
print("fine-tune that does NOT depend on the quality trade at all.")

# ---------------------------------------------------------------- decision
print()
print("=" * 72)
print("SO THE RECOMMENDATION DEPENDS ON THE TRAFFIC MIX")
print("=" * 72)
for share, label in ((0.15, "a narrow feature inside a general assistant"),
                     (0.55, "a mixed product"),
                     (0.95, "a dedicated classifier endpoint")):
    b, a = weighted(share, BEFORE), weighted(share, AFTER)
    saving = (with_fs - without) * CALLS
    print("task share %.0f%% -- %s" % (share * 100, label))
    print("   quality %+.4f, cost saving $%s/month"
          % (a - b, format(int(saving), ",")))
    if a > b:
        print("   -> fine-tune: quality AND cost both improve")
    else:
        print("   -> do NOT fine-tune the shared model. use an adapter on a")
        print("      dedicated route, so the general path keeps the intact base.")
    print()
print("the last line is LoRA's real argument. a full fine-tune forces the")
print("choice; an adapter lets the same base serve both paths, and detaching")
print("it restores general behaviour -- so the forgetting becomes reversible.")`,
        out: `THE FORGETTING TRADE, WEIGHTED BY TRAFFIC MIX
========================================================================
task     0.70 -> 0.92  (+22 points)
general  0.85 -> 0.61  (-24 points)

task share           before        after      delta  verdict
10%                  0.8350       0.6410    -0.1940  fine-tune LOSES
25%                  0.8125       0.6875    -0.1250  fine-tune LOSES
50%                  0.7750       0.7650    -0.0100  fine-tune LOSES
52%                  0.7720       0.7712    -0.0008  fine-tune LOSES
60%                  0.7600       0.7960    +0.0360  fine-tune wins
75%                  0.7375       0.8425    +0.1050  fine-tune wins
90%                  0.7150       0.8890    +0.1740  fine-tune wins
100%                 0.7000       0.9200    +0.2200  fine-tune wins

break-even task share = 0.5217 (52.2%)
  below that, the fine-tune makes the PRODUCT worse while making the
  TASK METRIC better -- which is the number everyone is watching.

========================================================================
THE OTHER REASON TO FINE-TUNE: COMPRESSING THE PROMPT
========================================================================
with few-shot      8000 in -> $0.04600/call, $46,000/month
baked into weights 5500 in -> $0.03350/call, $33,499/month
saving $12,500/month (27.2%)

that is a real and recurring saving, and it is the one reason to
fine-tune that does NOT depend on the quality trade at all.

========================================================================
SO THE RECOMMENDATION DEPENDS ON THE TRAFFIC MIX
========================================================================
task share 15% -- a narrow feature inside a general assistant
   quality -0.1710, cost saving $12,500/month
   -> do NOT fine-tune the shared model. use an adapter on a
      dedicated route, so the general path keeps the intact base.

task share 55% -- a mixed product
   quality +0.0130, cost saving $12,500/month
   -> fine-tune: quality AND cost both improve

task share 95% -- a dedicated classifier endpoint
   quality +0.1970, cost saving $12,500/month
   -> fine-tune: quality AND cost both improve

the last line is LoRA's real argument. a full fine-tune forces the
choice; an adapter lets the same base serve both paths, and detaching
it restores general behaviour -- so the forgetting becomes reversible.`,
        notes: [
          { t: "p", text: "**The break-even task share is 52.2%**, which is a lot higher than most people would guess. Below it, the fine-tune makes the product measurably worse while the task metric — the one in the ticket — improves by 22 points." },
          { t: "p", text: "**At a 10% task share the weighted accuracy falls from 0.835 to 0.641**, a 19-point product regression delivered by a change that every dashboard reports as a success. That is the single most expensive instance of the one-sided-metric problem in the course, because a fine-tune is hard to reverse." },
          { t: "p", text: "**The 50% row is worth pausing on**: a delta of −0.0100, essentially break-even, so a team at roughly half task traffic is taking on training cost, serving complexity and an irreversible artefact for no net quality change at all." },
          { t: "p", text: "**The cost side is independent of all of this.** Removing 2,500 tokens of few-shot from every call saves $12,500 a month at a million calls — a 29% cut — and that saving holds whatever the quality trade does. It is the one reason to fine-tune that does not need the weighted-accuracy argument." },
          { t: "p", text: "**And the recommendation at a low task share is not ‘do not fine-tune’, it is ‘use an adapter’.** A full fine-tune forces a single model to serve both populations; an adapter on a dedicated route lets the general path keep the intact base, which dissolves the traffic-mix problem rather than trading against it." },
          { t: "p", text: "The 70/92 and 85/61 figures are the reference’s illustration rather than a measurement, so the break-even of 52.2% is specific to them. What transfers is the method: weight the trade by traffic before deciding, because an unweighted task-metric gain is not a product improvement." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Prompt for instructions, RAG for knowledge, fine-tune for behaviour, format or cost. Fine-tuning is a poor way to add facts because they go stale, cannot be cited, and the model hallucinates *around* them \u2014 training on your domain makes invented facts more fluent." },
        { t: "p", text: "Catastrophic forgetting is dangerous because the task metric improves: +22 points on the task, \u221224 on everything else, and the second number is invisible unless a general eval was in the suite **before** the run. LoRA\u2019s real argument is reversibility rather than cost, and a fine-tune you cannot re-create in a day is not an asset you own." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cShould we fine-tune?\u201d**" },
        { t: "p", text: "Probably not yet, and the question I would ask first is what needs to change. If it is instructions, prompt. If it is the facts the model should use, RAG. Fine-tuning changes behaviour, format and style \u2014 and it is a genuinely poor way to add knowledge, for three reasons: the facts go stale and updating them means another training run, they cannot be cited so the whole citation-validation layer is unavailable, and the model hallucinates around them. That third one is the counterintuitive bit \u2014 training on your domain makes the model better at producing text *shaped* like your facts, so a fine-tune on product specifications produces more convincing invented specifications." },
        { t: "p", text: "There is one reason to fine-tune that stands on its own, which is cost. Few-shot examples were 2,500 tokens a call in a budget I have worked through, and compressing them into the weights removes that from every request \u2014 that saving is real and recurring and does not depend on the quality trade at all." },
        { t: "p", text: "If we do fine-tune, the risk I would plan for is catastrophic forgetting, and the reason it is dangerous is that the task metric improves. The illustrative numbers are task accuracy going from 70 to 92 per cent while a general benchmark falls from 85 to 61. The 22-point gain is the number in the ticket and on the dashboard; the 24-point loss is invisible unless a general benchmark was in the eval suite before the run. A baseline taken afterwards cannot tell you what was lost." },
        { t: "p", text: "And that trade is traffic-weighted, which people skip. If the fine-tuned task is a small share of what the model serves, the fine-tune makes the product worse while making the metric better \u2014 I would compute the break-even share before deciding, and at these numbers it is around half." },
        { t: "p", text: "So I would use LoRA, and I would argue for it on reversibility rather than cost. The cost case is real \u2014 many adapters on one base model instead of many full models \u2014 but the property that matters is that the base stays intact. With a full fine-tune, forgetting gives you a damaged artefact; with an adapter it gives you a detachable one, and detaching restores general behaviour. It also lets one base serve both a specialised route and a general route, which dissolves the traffic-mix problem entirely." },
        { t: "p", text: "Last, I would insist on versioning the training data, the hyperparameters, the base model id and the eval results together, forever \u2014 because a fine-tune is weights on top of a base, and when the base retires the adapter retires with it. The test is concrete: if you cannot re-create the fine-tune in a day, you do not own it. With the recipe preserved, a forced base migration is a re-run; without it, it is a rebuild from nothing." }
      ] }
  ],

  takeaways: [
    "**Prompt for instructions, RAG for knowledge, fine-tune for behaviour, format or cost.**",
    "**Fine-tuning is a poor way to add facts**: they go stale, cannot be cited, and the model hallucinates around them.",
    "**Training on your domain makes invented facts more fluent**, because the objective rewards plausibility.",
    "**Compressing few-shot examples into weights is a cost reason that stands alone** \u2014 2,500 tokens a call, measured.",
    "**Catastrophic forgetting is dangerous because the task metric improves**: +22 points on the task, \u221224 elsewhere.",
    "**The regression is invisible unless a general eval was in the suite before the run** \u2014 a later baseline cannot show what was lost.",
    "**The trade is traffic-weighted**, so a fine-tune can make the product worse while making the metric better.",
    "**Four defences**: a general-capability eval, LoRA, mixing in general data at a low learning rate, and out-of-task validation.",
    "**LoRA's real argument is reversibility, not cost** \u2014 the base stays intact, so detaching restores general behaviour.",
    "**An adapter lets one base serve a specialised and a general route**, which dissolves the traffic-mix problem.",
    "**Data quality dominates volume** \u2014 one wrong label in four halved performance in a measured case.",
    "**If you cannot re-create the fine-tune in a day, you do not own it** \u2014 it dies with its base model."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is fine-tuning a poor way to add facts?",
        options: [
          "Because training sets are too small to contain enough facts",
          "Because the facts go stale, cannot be cited, and the model hallucinates around them \u2014 training on your domain makes invented facts more fluent",
          "Because weights cannot represent factual information, only style",
          "Because retrieval is always cheaper than a training run"
        ],
        answer: 1,
        why: "Each of the three is independently disqualifying: updating a baked-in fact requires another training run rather than an index write, a weight-encoded fact has no source to validate a citation against, and because the objective rewards plausibility a model trained on your domain produces more convincing fabrications in that domain. Weights can certainly encode facts \u2014 the problem is that doing so removes every operational property you want from a fact." },

      { stem: "Task accuracy rises 70% to 92% and a general benchmark falls 85% to 61%. Why is this hard to catch?",
        options: [
          "Because general benchmarks are noisy at small sample sizes",
          "Because the task metric improves \u2014 the +22 points is the number being watched, and the \u221224 is invisible unless a general eval was in the suite beforehand",
          "Because the regression appears only after several weeks of serving",
          "Because fine-tuned models do not expose general-capability metrics"
        ],
        answer: 1,
        why: "Every metric the team was tracking reports success, so the fine-tune looks like a clean win in the ticket, the demo and the dashboard while general ability has collapsed. A baseline measured after the run cannot reveal what was lost, which is why the general benchmark has to be in the suite before training \u2014 the same structure as any single metric that only ever improves under a tuning knob." },

      { stem: "A fine-tuned task is 15% of the traffic a shared model serves. What follows from the forgetting figures?",
        options: [
          "The fine-tune is still a net win, since the task gain exceeds the general loss",
          "The fine-tune makes the product worse while making the task metric better \u2014 the break-even task share is around half",
          "The traffic mix is irrelevant, since the general benchmark is not production traffic",
          "The fine-tune should be applied and the general path routed to a different provider"
        ],
        answer: 1,
        why: "A 22-point gain on 15% of traffic against a 24-point loss on the other 85% is heavily net negative, and the break-even point where the two balance is a task share of roughly 52%. The better resolution is not a routing workaround but an adapter: one intact base serving both a specialised and a general route, which removes the need to choose at all." },

      { stem: "What is LoRA's strongest argument in this context?",
        options: [
          "Lower training cost, since only small adapter weights are updated",
          "Reversibility \u2014 the base stays intact, so detaching the adapter restores general behaviour and makes forgetting a configuration change",
          "Higher task accuracy than full fine-tuning",
          "It avoids catastrophic forgetting entirely"
        ],
        answer: 1,
        why: "Training and serving cost savings are real \u2014 many adapters on one shared base rather than many full models \u2014 but the property that changes the risk profile is that a damaged artefact becomes a detachable one. LoRA does not prevent forgetting; an adapter trained too hard on a narrow task still over-specialises. What it changes is that the failure is undoable without retraining the base." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Fine-tuning in production",
    questions: [
      { level: "core",
        q: "RAG or fine-tuning?",
        strong: "A strong answer separates knowledge from behaviour.",
        answer: [
          { t: "p", text: "Different tools. RAG injects knowledge at query time; fine-tuning bakes in behaviour, format and style. So the question is what needs to change \u2014 if it is the facts, RAG; if it is how the model behaves, fine-tuning; and if it is just instructions, neither." },
          { t: "p", text: "Fine-tuning is actively bad at facts for three reasons: they go stale and need another training run, they cannot be cited so citation validation has nothing to check against, and the model hallucinates around them \u2014 training on your domain makes invented facts in that domain more fluent." },
          { t: "p", text: "The legitimate reasons are a consistent output format, a house tone, a narrow classification, or compressing a long prompt into the weights. That last one is a cost argument that stands on its own \u2014 few-shot examples can be a couple of thousand tokens on every call." },
          { t: "p", text: "So: prompt first, RAG for knowledge, fine-tune for behaviour or cost. And measure before deciding, because the usual reason teams fine-tune is that prompting was not tried properly." }
        ] },

      { level: "advanced",
        q: "How would you detect catastrophic forgetting?",
        strong: "A strong answer stresses measuring before the run.",
        answer: [
          { t: "p", text: "By having a general-capability benchmark in the eval suite **before** training, not after I suspect a problem \u2014 a baseline measured afterwards cannot tell me what was lost." },
          { t: "p", text: "The reason it needs that discipline is that the task metric improves. With the usual illustrative figures, task accuracy goes from 70 to 92 per cent while general ability falls from 85 to 61 \u2014 so every number anybody was watching says success, and the regression surfaces weeks later as scattered complaints about unrelated tasks." },
          { t: "p", text: "I would also weight the trade by traffic. A 22-point gain on the task against a 24-point loss elsewhere only nets positive if the task is more than about half the traffic, so for a narrow feature inside a general assistant the fine-tune makes the product worse while making the metric better." },
          { t: "p", text: "And I would validate on out-of-task prompts explicitly, because an in-task test set cannot detect over-specialisation by construction \u2014 it only contains the task." }
        ] },

      { level: "core",
        q: "What has to be preserved for a fine-tune to be an asset?",
        strong: "A strong answer gives the one-day test.",
        answer: [
          { t: "p", text: "The training-data snapshot, the hyperparameters, the base model id and the eval results \u2014 in version control, versioned together, indefinitely." },
          { t: "p", text: "The test is concrete: if you cannot re-create the fine-tune in a day, you do not own it. That is checkable rather than aspirational, and it is the kind of rule a team can actually audit against." },
          { t: "p", text: "The reason it matters is that a fine-tune is weights on top of a base model, so when the base is retired the adapter is retired with it. There is no migration path except re-training on the new base." },
          { t: "p", text: "With the recipe preserved, a forced base migration is a re-run that fits in a day of a 90-day window. Without it, the asset is simply gone and you are rebuilding from nothing under a deadline." }
        ] }
    ]
  }
});
