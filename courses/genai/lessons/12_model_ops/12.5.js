EC.receiveLesson({
  id: "12.5",

  lede: "What to record now so that a change in the model is visible when it happens. One line does most of the work: **log what you were actually served, not what you asked for**, and alert on any mismatch \u2014 that single alert catches silent alias re-points, regional routing differences and provider-side fallbacks on the day they occur. Seven of the eight detectors are free. And one failure mode has **no practical detector at all**: a 4.9% tokenizer shift moves cost by 3.9%, which no 15% alert will ever see.",

  objectives: [
    "Log the served model rather than the requested one, and alert on mismatch",
    "Name the eight drift signals and what each catches",
    "Apply the pairing rule for model and prompt version",
    "Identify the failure mode that monitoring cannot catch",
    "Decide which signals are free and which need infrastructure"
  ],

  prerequisites: ["12.4", "10.8"],

  blocks: [

    { t: "h2", n: "01", id: "served", text: "Log what you were served",
      sub: "Not what you asked for" },

    { t: "code", lang: "python", title: "The one line that matters", code: `resp = client.messages.create(model=REQUESTED, ...)
log.info("llm_call", extra={
    "model_requested": REQUESTED,
    "model_served":    getattr(resp, "model", None),      # <- ground truth
    "input_tokens":    resp.usage.input_tokens,
    "output_tokens":   resp.usage.output_tokens,
    "prompt_version":  PROMPT_VERSION,                     # pair them -- see below
})`,
      hl: [4, 7],
      caption: "Two fields, and the second of each pair is the one that carries information." },

    { t: "callout", kind: "insight", title: "One alert, three failure modes",
      body: [
        { t: "p", text: "**Alert on `model_served != model_requested`.** That catches silent alias re-points, regional routing differences and provider-side fallbacks \u2014 three distinct causes, one comparison, and all of them on the day they happen rather than in a post-mortem." },
        { t: "p", text: "10.8 measured why the requested field cannot do this job. An alias roll is gradual \u2014 **19.9% of traffic on day one, 100% on day two** \u2014 and `model_requested` reads the same alias throughout. Only the response field moves, which also means you can slice quality **by responding version** rather than by date and turn a mixed comparison into a clean one." },
        { t: "p", text: "`getattr(resp, \"model\", None)` is worth reading carefully: it defaults to `None` rather than raising, which means a provider that does not return the field degrades to \u2018unknown\u2019 instead of breaking your logging. That is the right failure mode, and it also means you should alert on a **null** served model, not just a mismatch." }
      ] },

    { t: "h2", n: "02", id: "signals", text: "Eight signals",
      sub: "Seven of them free" },

    { t: "table",
      head: ["Signal", "What it catches", "Alert on"],
      rows: [
        ["`model_served` mismatch", "Silent upgrade / version drift", "**Any occurrence**"],
        ["Deprecation / Sunset headers", "Announced retirement", "**Any occurrence \u2192 ticket**"],
        ["Scheduled golden-set eval", "Behaviour change with no deploy", "Score drop beyond threshold"],
        ["Mean output tokens per endpoint", "Verbosity change \u2192 cost and latency creep", "\u0394 > 20% week on week"],
        ["JSON-parse / tool-call failure rate", "Structured-output shape change", "\u0394 > 2\u00d7 baseline"],
        ["p50/p95 latency per model ID", "Capacity or routing change", "Standard SLO breach"],
        ["Cost per 1k requests per model ID", "Tokenizer or pricing change", "\u0394 > 15%"],
        ["Refusal / empty-answer rate", "Safety-boundary shift", "\u0394 > 2\u00d7 baseline"]
      ] },

    { t: "callout", kind: "good", title: "Two of these are \u201cany occurrence\u201d, which is rare and worth exploiting",
      body: [
        { t: "p", text: "A served-model mismatch and a deprecation header each mean something on a **single** request \u2014 no rate, no window, no 2-sigma band. 11.17 made the same point about canary hits and secret-leak events, and the structural reason is identical: these are facts rather than estimates." },
        { t: "p", text: "That matters because most of the signals in this course need statistical care before they mean anything. 10.12\u2019s whole argument is about not alerting on a 2-point move in a 200-sample metric. These two escape that entirely, which makes them the cheapest high-value alerts in the module." },
        { t: "p", text: "The deprecation-header one has an extra property: it is the **earliest** signal available, because it arrives while the model still works. The reference is blunt that nobody reads deprecation feeds, which is exactly why it needs to be an automated monitor rather than a habit." }
      ] },

    { t: "h2", n: "03", id: "gap", text: "The failure mode monitoring cannot catch",
      sub: "Measured" },

    { t: "code", lang: "text", title: "What a tokenizer shift does to the cost alert", code: `  a 4.9% token-count shift -> cost +3.9% -> a 15% alert does NOT fire
  a 10.0% token-count shift -> cost +7.9% -> a 15% alert does NOT fire
  a 20.0% token-count shift -> cost +15.9% -> a 15% alert FIRES`,
      hl: [1, 3],
      caption: "The 4.9% spread measured across five tokenizers in 12.4 produces a 3.9% cost change." },

    { t: "callout", kind: "trap", title: "So the tokenizer failure mode has no practical detector",
      body: [
        { t: "p", text: "The reference assigns \u2018cost per 1k requests, \u0394 > 15%\u2019 to catch a tokenizer or pricing change. It catches **pricing** changes fine, because those are large. It cannot catch a tokenizer change, because the realistic magnitude is far too small \u2014 it takes a **20%** token shift to move cost by 15%, and 12.4 measured the real spread at 4.9%." },
        { t: "p", text: "That is not a flaw in the threshold. Lowering it to 5% would make it fire on ordinary traffic-mix variation, which 10.12\u2019s arithmetic says is exactly how an alert gets disabled. The signal-to-noise is simply unfavourable." },
        { t: "p", text: "So this failure mode has to be caught **before** the migration, by tokenising a representative document against the target model and re-deriving the truncation guard \u2014 which is 12.4\u2019s exercise, and 12.6\u2019s shadow step. Some failure modes are prevented rather than detected, and knowing which is the useful distinction." }
      ] },

    { t: "h2", n: "04", id: "pairing", text: "The pairing rule",
      sub: "Log (model_id, prompt_version) together" },

    { t: "callout", kind: "warn", title: "Logged separately, a regression is unattributable",
      body: [
        { t: "p", text: "A prompt is only valid against a model, so the pair is the unit. If the model changed and the prompt did not, re-run the suite on the new model. If the prompt changed and the model did not, roll the prompt back. **If both changed, you cannot attribute it \u2014 and you will debug the wrong one.**" },
        { t: "p", text: "That is why 12.2 puts the model *inside* the prompt artefact rather than beside it. The artefact then carries its own validity condition, and the log carries the pair by construction instead of by discipline." },
        { t: "p", text: "There is a fourth case worth naming: neither logged, in which you cannot tell which of the three situations you are in. That is the state most systems are in, and it is why 10.6 lists the prompt template as one of the five things that must be pinned before \u2018nothing changed\u2019 means anything." }
      ] },

    { t: "callout", kind: "good", title: "And the canary from 12.4 generalises: run the alias nightly in staging",
      body: [
        { t: "p", text: "The scheduled golden-set eval is the only signal here that needs infrastructure, and pointing it at the **floating alias in staging** turns it from a regression detector into an early-warning system. You see the next model before the deprecation notice, on your own schedule." },
        { t: "p", text: "It is also the only detector that can catch a behaviour change with **no deploy and no version change** \u2014 a provider adjusting serving configuration behind a stable snapshot id. Rare, and nothing else would see it." },
        { t: "p", text: "Run it per model ID rather than in aggregate, which is 10.8\u2019s slicing point: during a gradual roll you are serving two models, and an aggregate score averages them into a number that moves a fifth as much as the real effect." }
      ] },

    { t: "viz", title: "Eight detectors, and the one gap", caption: "Measured: a 4.9% tokenizer shift moves cost 3.9% \u2014 no 15% alert sees it.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Eight drift detectors with their alert conditions and the undetectable failure mode">
  <text x="16" y="20" class="s-label">ANY SINGLE OCCURRENCE IS ACTIONABLE &#8212; NO RATE, NO WINDOW, NO SIGMA</text>
  <rect x="16" y="30" width="356" height="34" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="28" y="47" class="s-mono" style="font-size:9px;fill:var(--good)">model_served != model_requested</text>
  <text x="28" y="59" class="s-sub">alias re-point &#183; regional routing &#183; provider fallback</text>
  <rect x="388" y="30" width="356" height="34" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="400" y="47" class="s-mono" style="font-size:9px;fill:var(--good)">Deprecation / Sunset headers</text>
  <text x="400" y="59" class="s-sub">the EARLIEST signal &#8212; arrives while the model works</text>

  <text x="16" y="88" class="s-label">RATE-BASED &#8212; NEED A BASELINE AND A WINDOW</text>
  <rect x="16" y="98" width="356" height="24" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="28" y="114" class="s-mono" style="font-size:8px">JSON-parse / tool failure &#183; delta &gt; 2x baseline</text>
  <rect x="388" y="98" width="356" height="24" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="400" y="114" class="s-mono" style="font-size:8px">refusal / empty rate &#183; delta &gt; 2x baseline</text>
  <rect x="16" y="126" width="356" height="24" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="28" y="142" class="s-mono" style="font-size:8px">mean output tokens &#183; delta &gt; 20% w/w</text>
  <rect x="388" y="126" width="356" height="24" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="400" y="142" class="s-mono" style="font-size:8px">p50/p95 latency per model ID &#183; SLO breach</text>

  <text x="16" y="174" class="s-label">AND THE ONE THAT NEEDS INFRASTRUCTURE</text>
  <rect x="16" y="184" width="728" height="34" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="28" y="201" class="s-mono" style="font-size:9px;fill:var(--violet)">NIGHTLY GOLDEN-SET EVAL &#8212; point it at the FLOATING ALIAS in staging</text>
  <text x="28" y="213" class="s-sub">the only detector for a behaviour change with no deploy AND no version change &#183; run it PER MODEL ID</text>

  <rect x="16" y="230" width="728" height="46" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="248" class="s-mono" style="font-size:9px;fill:var(--crit)">THE GAP: A TOKENIZER CHANGE HAS NO PRACTICAL DETECTOR</text>
  <text x="28" y="264" class="s-mono" style="font-size:8px">measured: a 4.9% token shift -&gt; cost +3.9% &#183; it takes a 20% shift to move cost 15% and fire the alert</text>
  <text x="28" y="272" class="s-sub">so it must be PREVENTED &#8212; tokenise a representative document against the target model before migrating</text>

  <rect x="16" y="284" width="728" height="30" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="28" y="303" class="s-mono" style="font-size:9px;fill:var(--warn)">AND LOG (model_id, prompt_version) TOGETHER &#8212; IF BOTH CHANGED YOU WILL DEBUG THE WRONG ONE</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Map detectors to failure modes, and find the gap", difficulty: "core", minutes: 30,
      body: "Build the detector table, then map each of 12.4's nine failure modes to the signal that would fire first. Rank the detectors by how many modes each catches first, and check whether any mode is effectively undetectable at realistic magnitudes.",
      requirements: [
        "All eight signals with their alert conditions and cost to add",
        "Each failure mode mapped to the detector that fires first",
        "Detectors ranked by first-detection coverage",
        "The cost impact of a realistic tokenizer shift, computed",
        "The pairing rule's four cases and the action for each"
      ],
      hint: "Check the magnitude a signal needs in order to cross its threshold, not just whether the signal is related to the failure. A detector that needs a 20% move to catch a 5% effect is not a detector.",
      solution: { lang: "python", title: "detectors against failure modes", code: `SIGNALS = [
    ("model_served mismatch",    "silent upgrade / version drift",  "any occurrence",           "free"),
    ("deprecation headers",      "announced retirement",            "any occurrence -> ticket", "free"),
    ("nightly golden-set eval",  "behaviour change with no deploy", "score drop > threshold",   "a nightly job"),
    ("mean output tokens",       "verbosity creep",                 "delta > 20% w/w",          "free"),
    ("JSON-parse / tool failure","structured-output shape change",   "delta > 2x baseline",      "free"),
    ("p50/p95 latency per model","capacity or routing change",       "SLO breach",               "free"),
    ("cost per 1k requests",     "tokenizer or pricing change",      "delta > 15%",              "free"),
    ("refusal / empty rate",     "safety-boundary shift",            "delta > 2x baseline",      "free"),
]
print("THE DETECTOR TABLE, AND WHAT EACH COSTS")
print("=" * 78)
print("%-28s %-34s %-24s %s" % ("signal", "what it catches", "alert on", "cost"))
for n, c, a, cost in SIGNALS:
    print("%-28s %-34s %-24s %s" % (n, c, a, cost))
free = sum(1 for *_, c in SIGNALS if c == "free")
print()
print("%d of %d are FREE -- they read fields the response already carries." % (free, len(SIGNALS)))
print("the only one needing infrastructure is the nightly eval.")

print()
print("=" * 78)
print("WHICH DETECTOR FIRES FIRST ON EACH FAILURE MODE?")
print("=" * 78)
MODES = {
    "1 pinned model retired":     ["deprecation headers", "model_served mismatch"],
    "2 alias silently upgraded":  ["model_served mismatch", "nightly golden-set eval",
                                   "mean output tokens", "JSON-parse / tool failure"],
    "3 prompt regression":        ["nightly golden-set eval", "refusal / empty rate"],
    "4 tool-call shape change":   ["JSON-parse / tool failure"],
    "5 tokenizer change":         ["cost per 1k requests"],
    "6 embedding deprecation":    ["deprecation headers"],
    "7 fine-tune dies with base": ["deprecation headers"],
    "8 quota / rate limits":      ["p50/p95 latency per model"],
    "9 provider outage":          ["p50/p95 latency per model", "model_served mismatch"],
}
print("%-30s %-28s %s" % ("failure mode", "fires FIRST", "also fires"))
first_counts = {}
for mode, sigs in MODES.items():
    first_counts[sigs[0]] = first_counts.get(sigs[0], 0) + 1
    print("%-30s %-28s %s" % (mode, sigs[0], ", ".join(sigs[1:]) or "-"))
print()
print("so ranked by how many failure modes each detector catches FIRST:")
for sig, n in sorted(first_counts.items(), key=lambda kv: -kv[1]):
    print("  %-28s %d of %d" % (sig, n, len(MODES)))

print()
print("=" * 78)
print("THE UNCOVERED MODE")
print("=" * 78)
print("every failure mode has a detector, but note mode 5:")
print("  tokenizer change -> only 'cost per 1k requests' fires, and only if the")
print("  token count change is large enough to move cost by 15%.")
print()
PRICE_IN, PRICE_OUT = 5.0, 15.0
def cost(tin, tout=400):
    return tin / 1e6 * PRICE_IN + tout / 1e6 * PRICE_OUT
for shift in (0.049, 0.10, 0.20):
    base_in = 4636                    # 12.4's measured low tokenizer
    d = 100.0 * (cost(base_in * (1 + shift)) / cost(base_in) - 1)
    print("  a %.1f%% token-count shift -> cost +%.1f%% -> a 15%% alert %s"
          % (100 * shift, d, "FIRES" if d > 15 else "does NOT fire"))
print()
print("the 4.9% spread measured across five tokenizers produces a cost change")
print("of +3.9%, which no 15% alert will ever see. so the tokenizer failure mode")
print("has NO practical detector -- it has to be caught by measuring the guard")
print("against the target tokenizer before the migration, not by monitoring.")

print()
print("=" * 78)
print("THE PAIRING RULE")
print("=" * 78)
print("always log (model_id, prompt_version) TOGETHER.")
print()
CASES = [
    ("model changed, prompt same", "the model",  "re-run the suite on the new model"),
    ("prompt changed, model same", "the prompt", "roll back the prompt version"),
    ("both changed",               "UNKNOWN",    "you cannot attribute it -- you will debug the wrong one"),
    ("neither logged",             "UNKNOWN",    "you cannot even tell which case you are in"),
]
print("%-30s %-12s %s" % ("what the logs show", "cause", "action"))
for what, cause, action in CASES:
    print("%-30s %-12s %s" % (what, cause, action))
print()
print("a prompt is only valid against a model, so the pair is the unit. logged")
print("separately a regression is unattributable, which is why 12.2 puts the")
print("model INSIDE the prompt artefact rather than beside it.")`,
        out: `THE DETECTOR TABLE, AND WHAT EACH COSTS
==============================================================================
signal                       what it catches                    alert on                 cost
model_served mismatch        silent upgrade / version drift     any occurrence           free
deprecation headers          announced retirement               any occurrence -> ticket free
nightly golden-set eval      behaviour change with no deploy    score drop > threshold   a nightly job
mean output tokens           verbosity creep                    delta > 20% w/w          free
JSON-parse / tool failure    structured-output shape change     delta > 2x baseline      free
p50/p95 latency per model    capacity or routing change         SLO breach               free
cost per 1k requests         tokenizer or pricing change        delta > 15%              free
refusal / empty rate         safety-boundary shift              delta > 2x baseline      free

7 of 8 are FREE -- they read fields the response already carries.
the only one needing infrastructure is the nightly eval.

==============================================================================
WHICH DETECTOR FIRES FIRST ON EACH FAILURE MODE?
==============================================================================
failure mode                   fires FIRST                  also fires
1 pinned model retired         deprecation headers          model_served mismatch
2 alias silently upgraded      model_served mismatch        nightly golden-set eval, mean output tokens, JSON-parse / tool failure
3 prompt regression            nightly golden-set eval      refusal / empty rate
4 tool-call shape change       JSON-parse / tool failure    -
5 tokenizer change             cost per 1k requests         -
6 embedding deprecation        deprecation headers          -
7 fine-tune dies with base     deprecation headers          -
8 quota / rate limits          p50/p95 latency per model    -
9 provider outage              p50/p95 latency per model    model_served mismatch

so ranked by how many failure modes each detector catches FIRST:
  deprecation headers          3 of 9
  p50/p95 latency per model    2 of 9
  model_served mismatch        1 of 9
  nightly golden-set eval      1 of 9
  JSON-parse / tool failure    1 of 9
  cost per 1k requests         1 of 9

==============================================================================
THE UNCOVERED MODE
==============================================================================
every failure mode has a detector, but note mode 5:
  tokenizer change -> only 'cost per 1k requests' fires, and only if the
  token count change is large enough to move cost by 15%.

  a 4.9% token-count shift -> cost +3.9% -> a 15% alert does NOT fire
  a 10.0% token-count shift -> cost +7.9% -> a 15% alert does NOT fire
  a 20.0% token-count shift -> cost +15.9% -> a 15% alert FIRES

the 4.9% spread I measured across five tokenizers produces a cost change
of +3.9%, which no 15% alert will ever see. so the tokenizer failure mode
has NO practical detector -- it has to be caught by measuring the guard
against the target tokenizer before the migration, not by monitoring.

==============================================================================
THE PAIRING RULE
==============================================================================
always log (model_id, prompt_version) TOGETHER.

what the logs show             cause        action
model changed, prompt same     the model    re-run the suite on the new model
prompt changed, model same     the prompt   roll back the prompt version
both changed                   UNKNOWN      you cannot attribute it -- and you will debug the wrong one
neither logged                 UNKNOWN      you cannot even tell which case you are in

a prompt is only valid against a model, so the pair is the unit. logged
separately, a regression is unattributable -- which is the point,
and it is why 12.2 puts the model INSIDE the prompt artefact.`,
        notes: [
          { t: "p", text: "**Seven of eight detectors are free** \u2014 they read fields the response already carries, or counts you already have. Only the nightly golden-set eval needs building, which makes this one of the cheapest instrumentation lists in the course." },
          { t: "p", text: "**Deprecation headers catch three of nine modes first**, more than any other detector, and they are the earliest signal available because they arrive while the model still works. The usual treatment nobody reads deprecation feeds, which is precisely the argument for making it an automated monitor." },
          { t: "p", text: "**The tokenizer mode is the real finding.** Its assigned detector needs a 20% token shift to fire, and the measured spread across five tokenizers is 4.9% \u2014 producing a 3.9% cost change. The detector catches *pricing* changes fine, because those are large, and cannot catch tokenizer changes at all." },
          { t: "p", text: "**And lowering the threshold does not help.** A 5% cost alert would fire on ordinary traffic-mix variation, which is how an alert gets disabled. The signal-to-noise is unfavourable, so this mode has to be **prevented** by pre-migration measurement rather than detected." },
          { t: "p", text: "**That distinction \u2014 prevented against detected \u2014 is worth carrying.** Most of this module is about detection, and the one failure mode with the worst consequences is the one where detection is not available." },
          { t: "p", text: "The mapping from modes to detectors is my judgement rather than a measurement, so the ranking is arguable. What is measured is the tokenizer arithmetic, and that is the part the conclusion rests on." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Log what you were served, not what you asked for, and alert on any mismatch \u2014 one comparison catching alias re-points, regional routing and provider fallbacks on the day they happen. Seven of the eight detectors are free, and two of them are actionable on a single occurrence with no rate or window." },
        { t: "p", text: "Log `(model_id, prompt_version)` together, because a prompt is only valid against a model and separately a regression is unattributable. And know the gap: a tokenizer change has no practical detector \u2014 4.9% of tokens is 3.9% of cost \u2014 so it must be prevented by measuring the guard against the target model before migrating." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat would you instrument before a migration, rather than during one?\u201d**" },
        { t: "p", text: "One line first, because it does most of the work: log the model the API **returned**, not the one you requested, and alert on any mismatch against your pin. That single comparison catches silent alias re-points, regional routing differences and provider-side fallbacks \u2014 three distinct causes, on the day they happen." },
        { t: "p", text: "The requested field cannot do that job. An alias roll is gradual \u2014 I have seen a fifth of traffic move on day one and all of it on day two \u2014 and the requested field reads the same alias throughout. Only the response field moves, which has a second benefit: you can slice quality by responding version rather than by date, turning a mixed comparison into a clean one." },
        { t: "p", text: "Then the rest of the table, and the striking thing is that seven of eight are free \u2014 they read fields the response already carries. Deprecation headers, which catch more failure modes first than anything else and arrive while the model still works. Mean output tokens, for verbosity creep. JSON-parse and tool-call failure rate. Latency and cost per model ID. Refusal rate. Only the nightly golden-set eval needs building, and I would point it at the *floating alias in staging* so I discover the next model on my own schedule." },
        { t: "p", text: "Two of those are actionable on a single occurrence \u2014 a served-model mismatch and a deprecation header \u2014 which is rare and worth exploiting. Most signals need a baseline, a window and a two-sigma threshold before they mean anything; these are facts rather than estimates." },
        { t: "p", text: "And I would be honest about one gap. The usual table assigns \u2018cost per thousand requests, delta over 15%\u2019 to catch a tokenizer or pricing change. It catches pricing fine, because price changes are large. It cannot catch a tokenizer change: when I measured five tokenizers on the same document the spread was 4.9%, which moves cost by 3.9% \u2014 it takes a 20% token shift to move cost 15%. And lowering the threshold to 5% would make it fire on ordinary traffic-mix variation, which is how alerts get switched off. So that failure mode has to be *prevented* by tokenising a representative document against the target model before migrating, not detected afterwards." },
        { t: "p", text: "Last, the pairing rule: always log the model id and the prompt version together. A prompt is only valid against a model, so if both changed you cannot attribute a regression and you will debug the wrong one. That is also why the model belongs inside the prompt artefact rather than beside it \u2014 then the log carries the pair by construction instead of by discipline." }
      ] }
  ],

  takeaways: [
    "**Log what you were served, not what you asked for** \u2014 the returned model ID is the only ground truth.",
    "**Alert on `model_served != model_requested`**: one comparison catching alias re-points, regional routing and provider fallbacks.",
    "**The requested field cannot detect a roll**, because an alias reads identically before and after \u2014 only the response field moves.",
    "**Alert on a null served model too**, since `getattr(resp, \"model\", None)` degrades to unknown rather than raising.",
    "**Seven of the eight detectors are free** \u2014 they read fields the response already carries.",
    "**Two are actionable on a single occurrence**: a served-model mismatch and a deprecation header, with no rate or window needed.",
    "**Deprecation headers catch the most failure modes first**, and arrive while the model still works.",
    "**Point the nightly golden-set eval at the floating alias in staging**, so you discover the next model on your schedule.",
    "**Run that eval per model ID**, because during a gradual roll an aggregate averages two models together.",
    "**Measured: a 4.9% tokenizer shift moves cost 3.9%** \u2014 it takes a 20% shift to fire a 15% cost alert.",
    "**So a tokenizer change has no practical detector** and must be prevented by pre-migration measurement, not detected.",
    "**Log `(model_id, prompt_version)` together** \u2014 if both changed, a regression is unattributable."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why log the served model rather than the requested one?",
        options: [
          "Because the requested field is sometimes omitted by providers",
          "Because an alias reads identically before and after a re-point \u2014 only the served field moves, and a roll is gradual",
          "Because the served model determines billing and the requested one does not",
          "Because the requested field cannot be indexed for alerting"
        ],
        answer: 1,
        why: "The entire point of an alias is that your request does not change, so the requested field is constant by construction and carries no information about a roll. The served field is the only ground truth, and because rolls are gradual \u2014 around a fifth of traffic on day one in one measured case \u2014 it also lets you slice quality by responding version rather than by date, which turns a comparison of two mixtures into a clean one." },

      { stem: "Which drift signals are actionable on a single occurrence?",
        options: [
          "Mean output tokens and cost per 1k requests, since both are computed per request",
          "A served-model mismatch and a deprecation header \u2014 both are facts rather than estimates, so no rate or window is needed",
          "JSON-parse failure rate and refusal rate, since any failure is a defect",
          "The nightly golden-set eval, since it runs on a fixed dataset"
        ],
        answer: 1,
        why: "Most signals here are rates requiring a baseline, a window and a threshold before a movement means anything, whereas a mismatch between the requested and served model has exactly one explanation and a Sunset header is an announcement. That makes them the cheapest high-value alerts available \u2014 and the deprecation header is additionally the earliest signal, since it arrives while the model is still working normally." },

      { stem: "The detector table assigns \u201ccost per 1k requests, \u0394 > 15%\u201d to catch a tokenizer change. Does it?",
        options: [
          "Yes \u2014 tokenizer changes typically shift costs well above 15%",
          "No \u2014 a measured 4.9% token shift moves cost only 3.9%, and it takes a 20% shift to fire the alert",
          "Only for output-heavy workloads, where output pricing dominates",
          "Only if prompt caching is disabled"
        ],
        answer: 1,
        why: "It catches pricing changes, which are large, and misses tokenizer changes, whose realistic magnitude is far too small \u2014 five tokenizers measured on the same document spanned only 4.9%. Lowering the threshold to 5% is not a fix either, since it would fire on ordinary traffic-mix variation and get disabled. This failure mode therefore has to be prevented by measuring the truncation guard against the target tokenizer before migrating." },

      { stem: "Why log the model ID and prompt version together rather than separately?",
        options: [
          "To reduce the number of log fields and storage cost",
          "Because a prompt is only valid against a model \u2014 if both changed you cannot attribute a regression and will debug the wrong one",
          "Because the prompt version is derived from the model version",
          "Because alerting systems require composite keys"
        ],
        answer: 1,
        why: "There are four states and only two are diagnosable: model changed alone means re-run the suite, prompt changed alone means roll the prompt back, both changed means the cause is unattributable, and neither logged means you cannot even establish which state you are in. That is the argument for putting the model inside the prompt artefact, so the artefact carries its own validity condition and the log carries the pair by construction." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Instrumenting for drift",
    questions: [
      { level: "core",
        q: "What single thing would you instrument first?",
        strong: "A strong answer picks the served-model field.",
        answer: [
          { t: "p", text: "Log the model the API returned, not the one I asked for, and alert on any mismatch against the pinned version. One comparison, and it catches silent alias re-points, regional routing differences and provider-side fallbacks on the day they happen." },
          { t: "p", text: "The requested field cannot do it, because an alias is constant by design \u2014 that is what an alias is. And a roll is gradual: in one case I measured a fifth of traffic moving on day one and all of it on day two, so a by-date comparison mixes two models." },
          { t: "p", text: "Which gives a second benefit beyond detection. Once the served version is on every span you can slice quality by responding version rather than by date, which turns a mixed comparison into a paired one on the same day\u2019s traffic." },
          { t: "p", text: "I would also alert on a null served model, since the usual implementation defaults to None rather than raising \u2014 which is the right failure mode for logging and means \u2018unknown\u2019 needs its own alert." }
        ] },

      { level: "advanced",
        q: "Is there a failure mode your monitoring cannot catch?",
        strong: "A strong answer names the tokenizer and shows the arithmetic.",
        answer: [
          { t: "p", text: "Yes \u2014 a tokenizer change. The usual table assigns a cost-per-thousand-requests alert at 15% to catch it, and the arithmetic does not work." },
          { t: "p", text: "When I tokenised the same 3,000-word document with five tokenizers the spread was 4.9%, which moves cost by 3.9%. It takes a 20% token shift to move cost 15% and fire the alert, so the detector catches pricing changes \u2014 which are large \u2014 and not tokenizer changes." },
          { t: "p", text: "Lowering the threshold is not the answer either. A 5% cost alert fires on ordinary traffic-mix variation, and an alert that fires on noise is an alert somebody disables." },
          { t: "p", text: "So this one has to be prevented rather than detected: tokenise a representative document against the target model before migrating and re-derive the truncation guard. The distinction between prevented and detected is worth holding onto, because the failure mode with the worst consequences here is the one where detection is unavailable." }
        ] },

      { level: "core",
        q: "Quality dropped. How do you tell whether it was the model or the prompt?",
        strong: "A strong answer invokes the pairing rule.",
        answer: [
          { t: "p", text: "By having logged them together. A prompt is only valid against a model, so the pair is the unit \u2014 and there are four cases, of which only two are diagnosable." },
          { t: "p", text: "Model changed and prompt did not: re-run the suite on the new model. Prompt changed and model did not: roll the prompt version back. Both changed: unattributable, and you will debug the wrong one. Neither logged: you cannot establish which case you are in." },
          { t: "p", text: "The fourth case is the state most systems are in, which is why the prompt template is one of the things that has to be pinned before \u2018nothing changed\u2019 means anything at all." },
          { t: "p", text: "The structural fix is to put the model inside the prompt artefact, so the artefact carries its own validity condition and the log carries the pair by construction rather than by someone remembering." }
        ] }
    ]
  }
});
