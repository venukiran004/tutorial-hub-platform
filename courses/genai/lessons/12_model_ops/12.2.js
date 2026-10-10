EC.receiveLesson({
  id: "12.2",

  lede: "**A prompt is production logic.** Treating it as a string pasted in code is the equivalent of hardcoding business rules with no version control and no tests \u2014 and prompts change more often than code, frequently edited by people who are not on the deploy rota. So: versioned artefacts with an id, a model, params and a changelog; a regression gate on every change, because fixing one case routinely breaks three others; and the rule that makes it all cohere \u2014 **a prompt is only valid against the model it was tuned on.**",

  objectives: [
    "Store a prompt as a versioned artefact with its model and params",
    "Gate every prompt change on an eval-set regression",
    "Explain why a prompt is coupled to its model",
    "Decide when offline eval is insufficient and A/B is needed",
    "Pin the prompt version with the deployment so an output is attributable"
  ],

  prerequisites: ["12.1", "10.6"],

  blocks: [

    { t: "h2", n: "01", id: "versioned", text: "Prompts as versioned code",
      sub: "With the model and the params attached" },

    { t: "code", lang: "yaml", title: "prompts/support_v3.yaml", code: `id: support_assistant
version: 3
model: claude-opus-4-8
temperature: 0.2
template: |
  You are a support assistant for Acme.
  Answer ONLY from the provided context; if absent, say you don't know.
  Context: {context}
  Question: {question}
changelog:
  - v3: added abstention rule (cut hallucinations on edge cases)
  - v2: tightened tone`,
      hl: [3, 4, 11],
      caption: "The model and temperature live **in** the prompt artefact, not beside it. That is the load-bearing detail." },

    { t: "callout", kind: "insight", title: "The model belongs in the prompt file because the prompt is coupled to it",
      body: [
        { t: "p", text: "A prompt is fitted to a model the way hyperparameters are fitted to a dataset. Few-shot count and ordering, chain-of-thought scaffolding, output-format instructions, refusal boundaries \u2014 all of them are tuned against one model\u2019s behaviour, and 12.4 catalogues how each breaks when the model moves." },
        { t: "p", text: "So storing `model:` inside the prompt artefact is not redundant metadata. It is a statement that **this template is only valid against that model**, and it is what makes the pairing rule from 12.5 enforceable: log `(model_id, prompt_version)` together, because separately you cannot tell which of the two caused a regression." },
        { t: "p", text: "The changelog earns its place for a related reason. `v3: added abstention rule (cut hallucinations on edge cases)` tells a future reader *why* a line exists \u2014 which matters because 12.7\u2019s migration found the right fix was **deleting** accumulated instructions, and you cannot safely delete a line whose purpose nobody recorded." }
      ] },

    { t: "callout", kind: "good", title: "Separating prompt from code buys two things worth having",
      body: [
        { t: "p", text: "**Non-engineers can iterate**, which matters because the people who know what a good support answer looks like are usually not the people who deploy. And **you can A/B without a redeploy**, which is what makes the live comparison in \u00a704 practical rather than a release-cycle project." },
        { t: "p", text: "The cost is that a prompt becomes a thing that can change without a deploy \u2014 which is precisely one of the five unpinned things from 10.6 that make \u201cnothing changed\u201d unprovable. So separation requires the version to be **pinned with the deployment** and logged on every span." },
        { t: "p", text: "Without that pin, you have taken production logic out of version control and gained deniability. With it, you have a prompt registry. The difference is one attribute on a trace." }
      ] },

    { t: "h2", n: "02", id: "gate", text: "The regression gate",
      sub: "The core discipline" },

    { t: "code", lang: "python", title: "Block the change if it regresses the suite", code: `def gate_prompt_change(old_prompt, new_prompt, eval_set, judge_fn, min_delta=-0.02):
    old = run_eval(eval_set, make_pipeline(old_prompt), judge_fn)["pass_rate"]
    new = run_eval(eval_set, make_pipeline(new_prompt), judge_fn)["pass_rate"]
    return {
        "old": old, "new": new, "delta": round(new - old, 3),
        "ship": new - old >= min_delta,   # block if the change regresses the suite
    }`,
      hl: [6],
      caption: "`min_delta=-0.02` tolerates a 2-point drop. Whether that is noise or a real regression is an arithmetic question." },

    { t: "callout", kind: "trap", title: "Whether \u22122 points is noise depends on the suite size, and the gate does not know",
      body: [
        { t: "p", text: "9.16\u2019s arithmetic applies directly. At a pass rate near 0.90, a 100-case suite carries a 95% margin of about **\u00b14.3 points** and a 400-case suite about **\u00b12.9**. So a `min_delta` of \u22120.02 is **inside the noise** on any suite smaller than roughly 460 cases \u2014 it will pass real regressions and block imaginary ones with roughly equal enthusiasm." },
        { t: "p", text: "The fix is not a different constant. It is to compare the two runs as a **paired** comparison on the same cases, which is what this function already has the data for \u2014 and 9.16 measured that pairing removes the dominant variance from example difficulty, so a few hundred cases becomes informative." },
        { t: "p", text: "Concretely: record per-case pass/fail for both prompts and run McNemar on the disagreements, rather than differencing two aggregate rates. The function has both `rows` arrays available and throws them away." }
      ] },

    { t: "callout", kind: "warn", title: "And the gate measures the wrong thing if the pass rate is contract-only",
      body: [
        { t: "p", text: "12.1 showed `pass` is `all(deterministic_checks)`, so `pass_rate` is contract compliance. A prompt change that improves tone and helpfulness while leaving every contract check satisfied has a **delta of −0.050 and a `ship: False`** \u2014 the gate cannot see the improvement, and equally cannot see a quality regression that keeps the JSON valid." },
        { t: "p", text: "So the gate is a **safety net against breaking things**, not a measure of whether the change is good. That is a reasonable job for it, and it has to be named, because a team reading `ship: True` as \u2018this change is better\u2019 is reading something the function does not report." },
        { t: "p", text: "Which is exactly why \u00a704 exists: the gains the offline suite cannot judge need live outcome metrics. The gate catches regressions; the A/B measures improvements." }
      ] },

    { t: "h2", n: "03", id: "coupling", text: "Prompt drift",
      sub: "Your prompt is coupled to the model it was tuned on" },

    { t: "callout", kind: "insight", title: "A provider updating the model silently degrades a prompt tuned for the old one",
      body: [
        { t: "p", text: "This is the quiet version of 12.4\u2019s forced migration, and it needs no deprecation notice. The alias moves, the model changes, and a prompt that was fitted to the old behaviour now underperforms \u2014 with an empty change log on your side." },
        { t: "p", text: "The instruction that follows is simple and widely skipped: **re-run the eval set on every model upgrade.** Not because the model got worse, but because your prompt was an artefact fitted to something that no longer exists." },
        { t: "p", text: "10.8 measured why you will not notice otherwise: an alias roll is gradual \u2014 **19.9% of traffic on day one, 100% on day two** \u2014 so a by-date quality comparison mixes two models and a real regression shows a fifth of its size. The detector is `gen_ai.response.model`, and the response is to re-run the suite per responding version." }
      ] },

    { t: "h2", n: "04", id: "ab", text: "A/B in production",
      sub: "For what the offline suite cannot judge" },

    { t: "dl", items: [
      { k: "What offline eval can judge", v: "Contract compliance, accuracy against a reference, faithfulness against context \u2014 anything with a defensible right answer." },
      { k: "What it cannot", v: "Tone and helpfulness. These have no gold answer, and 9.11 measured judges flipping under swapped ordering, so a judged tone score is weak evidence." },
      { k: "So split live traffic and compare outcomes", v: "Thumbs-up rate, resolution rate, escalation rate \u2014 the same machinery as a model A/B. 9.17 called these the final arbiter, because the offline suite is a proxy for them." },
      { k: "And pair the feedback with the trace", v: "10.11's rule: a thumbs-down you cannot resolve to the prompt version and the retrieved chunks is an anecdote, and one you can is a regression case." }
    ] },

    { t: "callout", kind: "tradeoff", title: "The A/B needs the sample size the offline suite does not",
      body: [
        { t: "p", text: "9.16\u2019s arithmetic again, and it cuts the other way here. An outcome metric like thumbs-up rate has a low base rate and a small effect size, so detecting a 2-point improvement needs roughly **5,000 observations per arm** unpaired \u2014 which is weeks of traffic for most features, not days." },
        { t: "p", text: "10.11 measured the happier side: production volume is what makes judged metrics precise. 2,000 judged answers resolve to **1.28 points** at two sigma, against \u00b15.3 for a 200-example offline suite. So the online path has the resolution and the offline path has the control." },
        { t: "p", text: "The practical sequencing: gate every change on the offline suite because it is fast and catches breakage, and A/B only the changes whose value the suite cannot see. Running an A/B on every prompt edit would mean shipping about one change a month." }
      ] },

    { t: "viz", title: "A prompt change, from edit to production", caption: "The gate catches regressions; the A/B measures improvements. They are different jobs.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="The prompt change pipeline from versioned artefact through the regression gate to an A/B test">
  <rect x="16" y="26" width="180" height="56" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="106" y="46" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">VERSIONED ARTEFACT</text>
  <text x="106" y="62" text-anchor="middle" class="s-sub">id, version, MODEL,</text>
  <text x="106" y="74" text-anchor="middle" class="s-sub">params, changelog</text>

  <path d="M 200 54 L 222 54" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#a122)"/>
  <defs><marker id="a122" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)"/></marker></defs>

  <rect x="226" y="26" width="200" height="56" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="326" y="46" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">REGRESSION GATE</text>
  <text x="326" y="62" text-anchor="middle" class="s-sub">re-run the eval set</text>
  <text x="326" y="74" text-anchor="middle" class="s-sub">block if delta &lt; min_delta</text>

  <path d="M 430 54 L 452 54" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#a122)"/>

  <rect x="456" y="26" width="288" height="56" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="600" y="46" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--violet)">A/B ON LIVE TRAFFIC</text>
  <text x="600" y="62" text-anchor="middle" class="s-sub">only for what the suite cannot judge:</text>
  <text x="600" y="74" text-anchor="middle" class="s-sub">tone, helpfulness &#8212; via outcome metrics</text>

  <rect x="16" y="96" width="728" height="34" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="28" y="114" class="s-mono" style="font-size:9px;fill:var(--good)">THE GATE CATCHES REGRESSIONS &#183; THE A/B MEASURES IMPROVEMENTS &#8212; DIFFERENT JOBS</text>
  <text x="28" y="126" class="s-sub">measured: a change whose judged quality rose a full point reported delta -0.050 and was BLOCKED</text>

  <line x1="16" y1="146" x2="744" y2="146" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="166" class="s-label">AND THE GATE&#8217;S THRESHOLD IS AN ARITHMETIC QUESTION</text>
  <text x="20" y="188" class="s-mono" style="font-size:9px">min_delta = -0.02</text>
  <rect x="170" y="178" width="50" height="14" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="228" y="189" class="s-mono" style="font-size:8px">the tolerated drop</text>
  <text x="20" y="210" class="s-mono" style="font-size:9px">100-case suite</text>
  <rect x="170" y="200" width="148" height="14" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="326" y="211" class="s-mono" style="font-size:8px;fill:var(--crit)">+/-5.9 pts of noise &#8212; the gate is inside it</text>
  <text x="20" y="232" class="s-mono" style="font-size:9px">400-case suite</text>
  <rect x="170" y="222" width="73" height="14" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="251" y="233" class="s-mono" style="font-size:8px;fill:var(--warn)">+/-2.1 pts &#8212; still inside it</text>
  <text x="20" y="252" class="s-sub">so the fix is not a different constant &#8212; it is a PAIRED comparison on the same cases (McNemar)</text>

  <rect x="16" y="266" width="728" height="46" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="284" class="s-mono" style="font-size:9px;fill:var(--crit)">AND A PROMPT IS ONLY VALID AGAINST THE MODEL IT WAS TUNED ON</text>
  <text x="28" y="302" class="s-sub">a provider rolling an alias degrades it silently &#183; re-run the suite on every model upgrade &#183; log (model_id, prompt_version) together</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Build the gate, then check whether it can see what it claims", difficulty: "advanced", minutes: 35,
      body: "Implement the prompt regression gate, then test it against three changes: one that genuinely breaks a contract, one that improves tone while breaking nothing, and one whose measured delta is inside the suite's noise. Report what the gate says and what it can actually support.",
      requirements: [
        "The gate implemented as it is commonly written it",
        "A change that breaks a contract check, and the gate's verdict",
        "A change that improves subjective quality with a delta of zero",
        "The suite's noise margin computed, and compared against min_delta",
        "A paired comparison on the same cases, as the alternative"
      ],
      hint: "Compute the binomial margin for your suite size before trusting a delta. A paired test on per-case outcomes uses data the aggregate-rate comparison discards.",
      solution: { lang: "python", title: "the gate, and what its delta can support", code: `import math

# per-case pass/fail under two prompts, on the SAME cases -- this is the data
# the aggregate-rate gate throws away
CASES = [
    # id, old_pass, new_pass, old_judge, new_judge
    ("c01", True,  True,  4, 5), ("c02", True,  True,  3, 5),
    ("c03", True,  True,  3, 4), ("c04", True,  True,  4, 5),
    ("c05", True,  True,  2, 4), ("c06", True,  True,  3, 4),
    ("c07", True,  True,  4, 4), ("c08", True,  True,  3, 5),
    ("c09", True,  False, 4, 4), ("c10", True,  False, 3, 3),
    ("c11", False, True,  2, 4), ("c12", True,  True,  4, 4),
    ("c13", True,  True,  3, 4), ("c14", True,  True,  4, 5),
    ("c15", True,  True,  3, 4), ("c16", True,  True,  4, 4),
    ("c17", True,  True,  2, 4), ("c18", True,  True,  3, 4),
    ("c19", True,  True,  4, 5), ("c20", True,  True,  3, 4),
]

def rates(cases):
    old = sum(c[1] for c in cases) / float(len(cases))
    new = sum(c[2] for c in cases) / float(len(cases))
    return old, new

def gate(cases, min_delta=-0.02):
    old, new = rates(cases)
    return {"old": round(old, 3), "new": round(new, 3),
            "delta": round(new - old, 3), "ship": new - old >= min_delta}

g = gate(CASES)
print("THE GATE, AS WRITTEN")
print("=" * 72)
print("old pass_rate %.3f   new pass_rate %.3f   delta %+.3f   ship=%s"
      % (g["old"], g["new"], g["delta"], g["ship"]))

old_j = sum(c[3] for c in CASES) / float(len(CASES))
new_j = sum(c[4] for c in CASES) / float(len(CASES))
print()
print("meanwhile the JUDGED score moved %.2f -> %.2f (%+.2f)" % (old_j, new_j, new_j - old_j))
print("  -> the change is a clear quality improvement and the gate reports a")
print("     delta of %+.3f, because pass_rate is CONTRACT compliance." % g["delta"])

print()
print("WHAT THE DELTA CAN ACTUALLY SUPPORT")
print("=" * 72)
p = g["old"]
for n in (20, 100, 400, 900, 2000):
    se = math.sqrt(p * (1 - p) / n)
    print("  n=%-5d 95%% margin on a %.2f pass rate = +/-%.1f points" % (n, p, 196 * se))
print()
n = len(CASES)
se = math.sqrt(p * (1 - p) / n)
print("this suite has n=%d, so the margin is +/-%.1f points." % (n, 196 * se))
print("min_delta is -2.0 points -- %.0fx smaller than the noise."
      % ((196 * se) / 2.0))
print("so 'ship' is being decided by a comparison the suite cannot resolve.")
print()
print("the margin only falls below 2.0 points at around n=%d."
      % int(math.ceil(p * (1 - p) * (1.96 / 0.02) ** 2)))

print()
print("THE PAIRED ALTERNATIVE, USING DATA THE GATE DISCARDS")
print("=" * 72)
n01 = sum(1 for c in CASES if not c[1] and c[2])      # new better
n10 = sum(1 for c in CASES if c[1] and not c[2])      # old better
agree = len(CASES) - n01 - n10
print("per-case outcomes: both pass or both fail %d, old-only %d, new-only %d"
      % (agree, n10, n01))
print("only the %d DISAGREEMENTS carry information about which prompt is better."
      % (n01 + n10))
if n01 + n10 == 0:
    print("  no disagreements -> the change did not alter any contract outcome")
else:
    chi2 = (abs(n10 - n01) - 1) ** 2 / float(n10 + n01)
    pval = math.erfc(math.sqrt(chi2 / 2)) if chi2 > 0 else 1.0
    print("McNemar: chi2 %.3f, p %.4f" % (chi2, pval))
    print("  -> %s" % ("a real difference" if pval < 0.05 else
                       "NOT significant -- the disagreements are too few"))
print()
print("and the judged scores are paired too, so test those directly:")
diffs = [c[4] - c[3] for c in CASES]
improved = sum(1 for d in diffs if d > 0)
worsened = sum(1 for d in diffs if d < 0)
print("  judged score improved on %d cases, worsened on %d, unchanged on %d"
      % (improved, worsened, len(diffs) - improved - worsened))
print("  mean paired difference %+.2f" % (sum(diffs) / float(len(diffs))))
sd = math.sqrt(sum((d - sum(diffs) / len(diffs)) ** 2 for d in diffs) / (len(diffs) - 1))
t = (sum(diffs) / len(diffs)) / (sd / math.sqrt(len(diffs)))
print("  paired t = %.2f on %d cases -- %s"
      % (t, len(diffs), "clearly significant" if abs(t) > 2.9 else "not clearly significant"))
print()
print("so the paired judged comparison DOES detect the improvement on 20 cases,")
print("where the unpaired contract-rate comparison cannot. same data, and the")
print("gate discards the half that carries the signal.")`,
        out: `THE GATE, AS WRITTEN
========================================================================
old pass_rate 0.950   new pass_rate 0.900   delta -0.050   ship=False

meanwhile the JUDGED score moved 3.25 -> 4.25 (+1.00)
  -> the change is a clear quality improvement and the gate reports a
     delta of -0.050, because pass_rate is CONTRACT compliance.

WHAT THE DELTA CAN ACTUALLY SUPPORT
========================================================================
  n=20    95% margin on a 0.95 pass rate = +/-9.6 points
  n=100   95% margin on a 0.95 pass rate = +/-4.3 points
  n=400   95% margin on a 0.95 pass rate = +/-2.1 points
  n=900   95% margin on a 0.95 pass rate = +/-1.4 points
  n=2000  95% margin on a 0.95 pass rate = +/-1.0 points

this suite has n=20, so the margin is +/-9.6 points.
min_delta is -2.0 points -- 5x smaller than the noise.
so 'ship' is being decided by a comparison the suite cannot resolve.

the margin only falls below 2.0 points at around n=457.

THE PAIRED ALTERNATIVE, USING DATA THE GATE DISCARDS
========================================================================
per-case outcomes: both pass or both fail 17, old-only 2, new-only 1
only the 3 DISAGREEMENTS carry information about which prompt is better.
McNemar: chi2 0.000, p 1.0000
  -> NOT significant -- the disagreements are too few

and the judged scores are paired too, so test those directly:
  judged score improved on 15 cases, worsened on 0, unchanged on 5
  mean paired difference +1.00
  paired t = 6.16 on 20 cases -- clearly significant

so the paired judged comparison DOES detect the improvement on 20 cases,
where the unpaired contract-rate comparison cannot. same data, and the
gate discards the half that carries the signal.`,
        notes: [
          { t: "p", text: "**The gate does not merely miss the improvement — it blocks it.** `ship: False` on a delta of −0.050, while the judged score rose from 3.25 to 4.25 with a paired t of 6.16. So the usual gate would veto a change that is unambiguously better on the dimension anyone cares about." },
          { t: "p", text: "**And the contract ‘regression’ it blocked on is not supported either.** McNemar on the three disagreements gives p = 1.0000 — two cases got worse, one got better, which is noise. The gate is rejecting a good change on the strength of a difference its own data says is not there." },
          { t: "p", text: "**The margin table explains why.** At n=20 and a 0.95 pass rate the 95% margin is ±9.6 points, so a 2-point tolerance is five times smaller than the uncertainty. The margin only falls below 2 points at around n=457, which is a much larger suite than most teams maintain." },
          { t: "p", text: "**The paired judged test detects the improvement easily on twenty cases** — improved on 15, worsened on 0, mean difference +1.00, t = 6.16. Same twenty cases, and the aggregate-rate comparison cannot see it while the paired comparison is overwhelming." },
          { t: "p", text: "**So the fix is not a better threshold, it is a better comparison.** The harness already runs both prompts over the same cases, which makes the data paired by construction; collapsing it into two aggregate rates discards exactly the structure that carries the signal." },
          { t: "p", text: "The judged scores here are hand-assigned rather than produced by a real judge, so the +1.00 is illustrative. The statistical structure is not: a paired test on matched cases beating an unpaired test on the same data is arithmetic, and it is why 9.16 recommends pairing wherever it is available." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A prompt is production logic, so version it with an id, a version, **the model**, the params and a changelog \u2014 and pin the version with the deployment so an output is attributable. The model belongs in the file because a prompt is fitted to a model, which makes `(model_id, prompt_version)` the unit you log and re-run." },
        { t: "p", text: "Gate every change on the eval set, but know what the gate can see: it is contract compliance, so a tone improvement has a delta of zero, and a 2-point `min_delta` is inside the noise of any suite under about 460 cases. Compare paired on the same cases instead \u2014 the data is already there. And A/B only what the suite cannot judge." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow do you manage prompts in production?\u201d**" },
        { t: "p", text: "As versioned artefacts, because a prompt is production logic \u2014 pasting it inline is hardcoding business rules with no version control and no tests. Each one gets an id, a version, the model, the parameters and a changelog, stored in a file or a registry." },
        { t: "p", text: "The detail I would insist on is that the **model** lives inside the prompt artefact. A prompt is fitted to a model the way hyperparameters are fitted to a dataset \u2014 few-shot ordering, chain-of-thought scaffolding, output-format instructions, refusal boundaries are all tuned against one model\u2019s behaviour. So the artefact records which model it is valid against, and you log the model id and prompt version together, because separately you cannot tell which of the two caused a regression." },
        { t: "p", text: "The changelog matters more than it looks. A line saying \u2018v3: added abstention rule, cut hallucinations on edge cases\u2019 tells a future reader why that instruction exists \u2014 and in a migration the right fix is often **deleting** accumulated scaffolding the new model does not need. You cannot safely delete a line whose purpose nobody recorded." },
        { t: "p", text: "Then a regression gate on every change, because prompts are brittle and fixing one case routinely breaks three others. But I would be precise about what the gate can see. The usual implementation compares aggregate pass rates with a tolerance of about two points, and two things are wrong with that. The pass rate is contract compliance, so a change whose judged quality rose a full point reported a delta of −0.050 and was blocked. And a two-point tolerance is inside the noise of any suite smaller than roughly four hundred and sixty cases \u2014 on a hundred cases the margin is about six points." },
        { t: "p", text: "The fix is not a different constant, it is a paired comparison. The gate already runs both prompts over the same cases, so it has per-case outcomes and throws them away in favour of two aggregate numbers. McNemar on the disagreements, or a paired test on the judged scores, detects improvements on tens of cases that the unpaired rate comparison cannot see at hundreds." },
        { t: "p", text: "And I would A/B only what the offline suite genuinely cannot judge \u2014 tone and helpfulness, measured by outcome metrics like resolution and escalation rate. Running an A/B on every prompt edit means shipping about one change a month, because detecting a small improvement in a low-base-rate outcome metric takes thousands of observations per arm. The gate catches regressions fast; the A/B measures improvements slowly. Different jobs." }
      ] }
  ],

  takeaways: [
    "**A prompt is production logic** \u2014 pasting it inline is hardcoding business rules with no version control or tests.",
    "**Store id, version, model, params and a changelog**, and pin the version with the deployment.",
    "**The model belongs inside the prompt artefact**, because a prompt is fitted to a model like hyperparameters to a dataset.",
    "**So log `(model_id, prompt_version)` together** \u2014 separately you cannot tell which caused a regression.",
    "**The changelog is what makes deletion safe**, and 12.7's migration fix was deleting accumulated scaffolding.",
    "**Separating prompt from code lets non-engineers iterate and enables A/B without a redeploy** \u2014 at the cost of a change that bypasses deploy.",
    "**Gate every prompt change on the eval set**, because fixing one case routinely breaks three others.",
    "**But the gate measures contract compliance**, so a tone improvement can report a NEGATIVE delta and be blocked.",
    "**And a 2-point `min_delta` is inside the noise** of any suite under roughly 460 cases.",
    "**Compare paired on the same cases instead** \u2014 the gate already has per-case outcomes and discards them.",
    "**A prompt is only valid against the model it was tuned on**, so re-run the suite on every model upgrade.",
    "**A/B only what the suite cannot judge** \u2014 tone and helpfulness, via outcome metrics, which need thousands of observations."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does the model identifier belong inside the prompt artefact?",
        options: [
          "So the deployment can select a provider without a config lookup",
          "Because a prompt is fitted to a model's behaviour \u2014 few-shot ordering, scaffolding, format instructions \u2014 so the template is only valid against that model",
          "Because providers require the model to be named in the template",
          "To allow the same prompt to be reused across models automatically"
        ],
        answer: 1,
        why: "Prompts are model-specific artefacts rather than portable configuration, so recording the model is a statement about validity rather than convenience \u2014 and it is what makes logging the model and prompt version as a pair enforceable, since a regression otherwise cannot be attributed to one or the other. It is also why a provider rolling an alias degrades a prompt with no change on your side." },

      { stem: "A prompt change improves tone noticeably. What delta does the standard gate report?",
        options: [
          "A positive delta proportional to the quality improvement",
          "Possibly negative — measured, a change whose judged quality rose a full point reported −0.050 and was blocked",
          "A negative delta, since tone changes risk format drift",
          "It cannot be computed without a judge score in the gate"
        ],
        answer: 1,
        why: "The pass rate is computed from deterministic checks, so an output that still produces valid JSON of the right length containing the right strings scores identically however much better it reads. That makes the gate a safety net against breakage rather than a measure of improvement \u2014 and reading `ship: True` as \"this change is better\" is reading something the function does not report, which is why subjective gains need a live A/B." },

      { stem: "The gate uses `min_delta=-0.02`. When is that threshold meaningful?",
        options: [
          "Always \u2014 a 2-point drop is a consistent signal regardless of suite size",
          "Only on a suite of roughly 460 cases or more; below that the margin exceeds 2 points and the gate is deciding inside the noise",
          "Only when the pass rate is below 0.5, where variance is highest",
          "Only when the eval set is sampled from production traffic"
        ],
        answer: 1,
        why: "At a pass rate near 0.9 the binomial margin is about \u00b14.3 points on 100 cases and \u00b12.9 on 400, so a 2-point tolerance is smaller than the uncertainty and will pass real regressions and block imaginary ones at similar rates. The remedy is not a different constant but a paired comparison on the same cases, which removes the dominant variance from example difficulty and is computable from data the gate already collects." },

      { stem: "What data does the aggregate-rate gate discard?",
        options: [
          "The judge's reasoning strings, which explain each score",
          "The per-case outcomes under both prompts \u2014 which support a paired test detecting improvements the rate comparison cannot",
          "The prompt changelog, which records why each line exists",
          "The model version, which is needed to attribute a regression"
        ],
        answer: 1,
        why: "Running both prompts over the same eval set produces matched pairs, and collapsing them into two aggregate rates throws away the pairing that makes a comparison powerful \u2014 McNemar on the disagreements, or a paired test on judged scores, can detect a real difference on tens of cases where the unpaired comparison fails at hundreds. The rows are already returned by the harness; the gate simply does not use them." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Prompt management",
    questions: [
      { level: "core",
        q: "How should prompts be stored?",
        strong: "A strong answer treats them as versioned artefacts with the model attached.",
        answer: [
          { t: "p", text: "As versioned artefacts, not inline strings \u2014 a prompt is production logic, and pasting it in code is hardcoding business rules with no version control and no tests." },
          { t: "p", text: "Each gets an id, a version, the model it is valid against, the parameters and a changelog. Separating them from code lets non-engineers iterate and allows an A/B without a redeploy, which are both genuinely valuable." },
          { t: "p", text: "The model belongs in the file because a prompt is fitted to a model the way hyperparameters are fitted to a dataset. That is also what makes the pairing rule enforceable \u2014 log the model id and prompt version together, because separately you cannot attribute a regression." },
          { t: "p", text: "The cost of separation is that a prompt becomes something that changes without a deploy, which is one of the things that makes \u2018nothing changed\u2019 unprovable. So the version has to be pinned with the deployment and logged on the span." }
        ] },

      { level: "advanced",
        q: "What is wrong with the usual prompt regression gate?",
        strong: "A strong answer names both the metric and the statistics.",
        answer: [
          { t: "p", text: "Two things. It compares contract-compliance pass rates, so a change whose judged quality rose a full point reported a delta of −0.050 and was blocked \u2014 the gate cannot see improvements, only breakage." },
          { t: "p", text: "And the usual two-point tolerance is inside the noise. At a pass rate near 0.9 the margin is about four points on a hundred cases and two on four hundred, so the threshold only becomes meaningful at around four hundred and sixty cases." },
          { t: "p", text: "The fix is not a different constant. It is to compare paired on the same cases, which the gate already has the data for \u2014 it runs both prompts over the same eval set and then collapses the per-case outcomes into two aggregate numbers." },
          { t: "p", text: "McNemar on the contract disagreements, or a paired test on the judged scores, detects a real difference on tens of cases where the unpaired rate comparison fails at hundreds." }
        ] },

      { level: "core",
        q: "When do you A/B a prompt rather than relying on the eval set?",
        strong: "A strong answer separates the two jobs.",
        answer: [
          { t: "p", text: "When the thing that improved has no defensible right answer \u2014 tone, helpfulness, how a refusal feels. The offline suite can judge contract compliance, accuracy against a reference and faithfulness against context, and it cannot judge those." },
          { t: "p", text: "Then I would compare outcome metrics rather than judged scores: thumbs-up rate, resolution rate, escalation rate. And I would pair the feedback with the trace, so a thumbs-down resolves to a prompt version and the retrieved chunks rather than being an anecdote." },
          { t: "p", text: "But I would A/B sparingly, because the arithmetic is unforgiving. A small improvement in a low-base-rate outcome metric needs thousands of observations per arm, which is weeks of traffic \u2014 so A/B-ing every prompt edit means shipping about one change a month." },
          { t: "p", text: "So: gate everything on the suite, because it is fast and catches breakage. A/B the handful of changes whose value the suite is structurally unable to see." }
        ] }
    ]
  }
});
