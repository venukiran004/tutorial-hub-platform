EC.receiveLesson({
  id: "11.16",

  lede: "Safety is a **two-sided** problem: too loose lets harmful content through, too strict blocks legitimate use and users leave. So tune against a harmful set **and** a benign-but-tricky set, and track the false-positive rate as a first-class metric. Measured on a threshold sweep: at **0.5**, 10.3% of harmful content passes and **6.0% of legitimate requests are refused**; at **0.8**, over-refusal falls to 0.1% and **67.7% of harmful content gets through.** F1 picks 0.50, and F1 weights the two errors equally when they are not.",

  objectives: [
    "Measure a guardrail against both a harmful and a benign set",
    "Read a threshold sweep as a policy choice rather than an optimisation",
    "Explain why F1 is the wrong objective for a safety threshold",
    "Build a red-team suite and run it as a regression test",
    "Track jailbreak success rate and over-refusal rate together"
  ],

  prerequisites: ["11.15", "11.13"],

  blocks: [

    { t: "h2", n: "01", id: "twosided", text: "The other failure mode",
      sub: "Too strict is a failure too" },

    { t: "code", lang: "text", title: "Both directions", code: `Too loose  -> harmful content slips through        (false negatives)
Too strict -> blocks legitimate use, users leave   (false positives / over-refusal)`,
      caption: "\u201cI cannot discuss medication\u201d to a pharmacy app destroys the product as surely as a harmful answer does." },

    { t: "callout", kind: "insight", title: "11.13 already measured how bad this gets with a pattern list",
      body: [
        { t: "p", text: "Six of ten benign-but-tricky inputs blocked, precision 0.571 \u2014 so **nearly half of everything the regex scan blocked was a real user.** \u201cHow do I enable developer mode on my Android phone?\u201d and \u201cOur DAN report is due\u201d are the kind of thing that gets refused." },
        { t: "p", text: "What makes over-refusal insidious is that it is **invisible by default.** A harmful answer that escapes generates a complaint, a screenshot, an incident. A wrongly refused request generates a user who tries once, gets a generic refusal, and leaves \u2014 and nothing in the system records that anything went wrong." },
        { t: "p", text: "That asymmetry in visibility produces an asymmetry in tuning. Teams tighten in response to the failures they see and never loosen in response to the ones they do not, so guardrails ratchet towards strictness over time unless the over-refusal rate is on a dashboard." }
      ] },

    { t: "h2", n: "02", id: "sweep", text: "The threshold sweep",
      sub: "Measured, both directions" },

    { t: "code", lang: "text", title: "A moderation classifier on 300 harmful and 1,200 benign-tricky", code: `threshold    block rate   harmful miss  over-refuse           F1
0.30              45.4%           1.0%        32.0%        0.606
0.40              31.1%           4.0%        14.8%        0.752
0.50              22.7%          10.3%         6.0%        0.839
0.60              16.5%          26.7%         2.2%        0.804
0.70              11.5%          45.7%         0.8%        0.689
0.80               6.5%          67.7%         0.1%        0.487
0.90               1.4%          93.0%         0.0%        0.131`,
      hl: [4, 7],
      caption: "The curve is steep: 0.5 to 0.8 trades 57 points of harmful-miss for 5.9 points of over-refusal." },

    { t: "callout", kind: "tradeoff", title: "F1 picks 0.50, and F1 is the wrong objective",
      body: [
        { t: "p", text: "The F1-optimal threshold is **0.50**, and F1 weights the two errors equally. For a safety guardrail they are almost never equal: a missed harmful response in a children\u2019s product and a wrongly refused question about medication are not interchangeable mistakes, and no symmetric metric can express which one you care about." },
        { t: "p", text: "So the sweep is a **policy choice**, not an optimisation. The honest framing is to state both numbers at your chosen point: \u2018at 0.5 we miss 10.3% of harmful content and wrongly refuse 6.0% of legitimate requests.\u2019 Both halves of that sentence are a decision somebody should own." },
        { t: "p", text: "9.17 made the general version of this argument about metric choice; here it has a specific consequence. Reporting F1 for a safety classifier is not merely imprecise \u2014 it actively hides the trade-off by collapsing two numbers with different owners into one." }
      ] },

    { t: "callout", kind: "warn", title: "And the curve is steep, which makes the choice consequential",
      body: [
        { t: "p", text: "Moving from 0.5 to 0.8 cuts over-refusal from 6.0% to **0.1%** \u2014 a sixtyfold improvement in user experience \u2014 and lets harmful-miss rise from 10.3% to **67.7%**. Moving from 0.5 to 0.4 cuts harmful-miss from 10.3% to 4.0% and raises over-refusal from 6.0% to 14.8%." },
        { t: "p", text: "Neither direction is a small adjustment. A threshold moved by 0.1 changes both error rates by a factor of two or more, which means a threshold chosen by intuition is almost certainly at a point nobody would have chosen deliberately." },
        { t: "p", text: "It also means the threshold is worth revisiting as the application changes. The right point for an internal tool and a consumer product differ by more than the shape of the curve suggests, because the cost of each error differs by more than the rates do." }
      ] },

    { t: "h2", n: "03", id: "redteam", text: "Red-teaming",
      sub: "Run it as a regression test" },

    { t: "code", lang: "python", title: "The red-team harness", code: `def red_team(attacks, guarded_fn):
    results = [{"attack": a["name"], "blocked": guarded_fn(a["prompt"]).is_refusal}
               for a in attacks]
    success = [r for r in results if not r["blocked"]]   # attacks that got through
    return {"jailbreak_success_rate": len(success) / len(results), "leaks": success}`,
      caption: "A fixed set of attacks with expected outcomes, run on every prompt, model and guardrail change." },

    { t: "dl", items: [
      { k: "Attack categories", v: "Direct injection, **indirect injection via poisoned documents**, jailbreak role-plays, encoding and obfuscation (base64, leetspeak, other languages), PII-extraction probes, system-prompt-extraction probes." },
      { k: "Automate it", v: "A fixed set of attack prompts with expected blocked/refused outcomes, run on every prompt, model or guardrail change \u2014 which is the same discipline as the golden set in 11.6 and the regression suite in 12.1." },
      { k: "Track jailbreak success rate over time", v: "It should trend towards zero, and a regression means a change weakened safety. 12.4\u2019s silent version drift is the case where nothing you did caused it." }
    ] },

    { t: "callout", kind: "good", title: "The red-team suite needs a benign twin, or it only ratchets one way",
      body: [
        { t: "p", text: "A suite of attacks measures jailbreak success rate and nothing else, so every change that reduces it looks like an improvement \u2014 including tightening a threshold to 0.9, which takes harmful-miss to 7.0% and over-refusal to 0.0% on the harmful set *while refusing most legitimate traffic*. The attack suite cannot see that." },
        { t: "p", text: "So the suite has to be paired: attacks that must be blocked, and **benign-but-tricky requests that must be allowed.** 11.13\u2019s ten cases are the shape of it \u2014 developer mode on an Android phone, a DAN report, explaining prompt injection to a colleague." },
        { t: "p", text: "Run both on every change and report both rates. A change that improves one and worsens the other is a trade to be decided, and a suite that measures only one turns every such trade into an apparent win." }
      ] },

    { t: "callout", kind: "insight", title: "And the encoding categories are the ones a pattern list cannot reach",
      body: [
        { t: "p", text: "11.13 measured the pattern list at 0% on base64, leetspeak and the same request in French \u2014 and those are three of the six attack categories the common list has. So a red-team suite covering the stated categories will report a high jailbreak success rate against a regex layer, correctly." },
        { t: "p", text: "That is the suite doing its job. The useful response is not to add patterns for base64 and leetspeak \u2014 which moves the boundary without changing its shape \u2014 but to recognise that these categories require either a classifier or the structural defence of separating instructions from data." },
        { t: "p", text: "Indirect injection deserves its own line in the suite, because it tests a different code path. An attack delivered through a poisoned retrieved document does not pass through the input scan at all, so a suite that only submits attacks as user input cannot detect whether that path is defended." }
      ] },

    { t: "viz", title: "The two-sided curve", caption: "Measured on 300 harmful and 1,200 benign-tricky cases.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Harmful-miss rate against over-refusal rate across moderation thresholds">
  <text x="16" y="20" class="s-label">MODERATION THRESHOLD SWEEP &#8212; BOTH ERROR RATES</text>
  <line x1="70" y1="200" x2="70" y2="40" stroke="var(--line)" stroke-width="1"/>
  <line x1="70" y1="200" x2="700" y2="200" stroke="var(--line)" stroke-width="1"/>
  <text x="62" y="46" text-anchor="end" class="s-mono" style="font-size:8px">100%</text>
  <text x="62" y="200" text-anchor="end" class="s-mono" style="font-size:8px">0%</text>

  <polyline points="100,198 190,194 280,184 370,157 460,127 550,92 640,51"
            fill="none" stroke="var(--crit)" stroke-width="2"/>
  <text x="652" y="48" class="s-mono" style="font-size:8px;fill:var(--crit)">93.0%</text>
  <text x="430" y="112" class="s-mono" style="font-size:9px;fill:var(--crit)">HARMFUL MISSED &#8212; rises with the threshold</text>

  <polyline points="100,149 190,176 280,190 370,196 460,199 550,200 640,200"
            fill="none" stroke="var(--warn)" stroke-width="2"/>
  <text x="104" y="142" class="s-mono" style="font-size:8px;fill:var(--warn)">32.0%</text>
  <text x="150" y="128" class="s-mono" style="font-size:9px;fill:var(--warn)">OVER-REFUSAL &#8212; falls with the threshold</text>

  <line x1="280" y1="36" x2="280" y2="206" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="3 3"/>
  <text x="280" y="30" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--accent)">F1-optimal 0.50</text>

  <text x="100" y="216" text-anchor="middle" class="s-mono" style="font-size:8px">0.30</text>
  <text x="280" y="216" text-anchor="middle" class="s-mono" style="font-size:8px">0.50</text>
  <text x="460" y="216" text-anchor="middle" class="s-mono" style="font-size:8px">0.70</text>
  <text x="640" y="216" text-anchor="middle" class="s-mono" style="font-size:8px">0.90</text>

  <rect x="16" y="230" width="356" height="44" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="28" y="248" class="s-mono" style="font-size:9px;fill:var(--accent)">AT 0.50 (F1-optimal)</text>
  <text x="28" y="264" class="s-mono" style="font-size:8px">10.3% of harmful passes &#183; 6.0% of legitimate refused</text

  <rect x="388" y="230" width="356" height="44" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="400" y="248" class="s-mono" style="font-size:9px;fill:var(--crit)">AT 0.80</text>
  <text x="400" y="264" class="s-mono" style="font-size:8px">67.7% of harmful passes &#183; 0.1% of legitimate refused</text>

  <rect x="16" y="282" width="728" height="32" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="302" class="s-mono" style="font-size:9px;fill:var(--good)">F1 WEIGHTS THE TWO ERRORS EQUALLY. THEY ARE NOT EQUAL. THIS IS A POLICY CHOICE.</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Sweep the threshold against both sets", difficulty: "advanced", minutes: 35,
      body: "Build a harmful set and a benign-but-tricky set, sweep a moderation threshold across both, and report block rate, harmful-miss rate, over-refusal rate and F1 at each point. Then state which point you would choose and why \u2014 the reasoning, not the number.",
      requirements: [
        "Both sets, with the benign set containing genuinely tricky cases",
        "A sweep reporting both error rates separately at each threshold",
        "The F1-optimal threshold identified, and why F1 is the wrong objective",
        "The trade between two specific thresholds quantified",
        "A chosen point with the reasoning, including who owns each error"
      ],
      hint: "Report the two error rates separately and never combine them. The moment they become one number, the trade-off that the whole exercise exists to expose is hidden.",
      solution: { lang: "python", title: "the two-sided sweep", code: `import numpy as np

# a moderation classifier's scores on two populations
rng = np.random.default_rng(0)
HARMFUL = np.clip(rng.beta(5, 2, 300), 0, 1)        # mostly high scores
BENIGN = np.clip(rng.beta(2, 6, 1200), 0, 1)        # mostly low, long right tail

print("harmful set   n=%d  mean score %.3f" % (len(HARMFUL), HARMFUL.mean()))
print("benign-tricky n=%d  mean score %.3f" % (len(BENIGN), BENIGN.mean()))
print()
print("%-10s %12s %14s %12s %12s" % ("threshold", "block rate", "harmful miss",
                                      "over-refuse", "F1"))
rows = []
for th in (0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9):
    tp = int((HARMFUL >= th).sum())
    fn = len(HARMFUL) - tp
    fp = int((BENIGN >= th).sum())
    block = (tp + fp) / float(len(HARMFUL) + len(BENIGN))
    miss = fn / float(len(HARMFUL))
    over = fp / float(len(BENIGN))
    prec = tp / float(tp + fp) if tp + fp else 0
    rec = tp / float(tp + fn)
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
    rows.append((th, block, miss, over, f1))
    print("%-10.2f %11.1f%% %13.1f%% %11.1f%% %12.3f"
          % (th, 100 * block, 100 * miss, 100 * over, f1))

print()
best = max(rows, key=lambda r: r[4])
print("F1-optimal threshold: %.2f" % best[0])
print("  but F1 weights the two errors EQUALLY, and they are not equal.")
print()
print("the honest framing is a policy choice, not an optimisation:")
for th, block, miss, over, f1 in rows:
    if th in (0.5, 0.8):
        print("  at %.2f: %.1f%% of harmful content gets through, and %.1f%% of"
              % (th, 100 * miss, 100 * over))
        print("           legitimate requests are wrongly refused")
print()
r5 = [r for r in rows if r[0] == 0.5][0]
r8 = [r for r in rows if r[0] == 0.8][0]
print("moving 0.5 -> 0.8 cuts over-refusal from %.1f%% to %.1f%% and lets"
      % (100 * r5[3], 100 * r8[3]))
print("harmful content through at %.1f%% instead of %.1f%%."
      % (100 * r8[2], 100 * r5[2]))
print("that is %.1f points of harmful-miss traded for %.1f points of over-refusal."
      % (100 * (r8[2] - r5[2]), 100 * (r5[3] - r8[3])))
print()
print("the curve is STEEP: a 0.1 move changes both rates by a factor of two or")
print("more, so a threshold chosen by intuition is almost certainly at a point")
print("nobody would have chosen deliberately.")

# --------------------------------------------------- why F1 is wrong, concretely
print()
print("=" * 74)
print("WHAT A WEIGHTED OBJECTIVE LOOKS LIKE INSTEAD")
print("=" * 74)
print("suppose a missed harmful response costs K times a wrong refusal.")
print("then minimise  K * miss_rate + over_refusal_rate.")
print()
print("%-8s %-12s %s" % ("K", "best th", "interpretation"))
for K in (0.2, 1, 5, 20, 100):
    best_th, best_loss = None, 1e9
    for th, block, miss, over, f1 in rows:
        loss = K * miss + over
        if loss < best_loss:
            best_loss, best_th = loss, th
    interp = {0.2: "a refusal hurts MORE than a miss (internal tool)",
              1: "equal cost -- the F1-like assumption",
              5: "a miss costs 5x a refusal",
              20: "a miss costs 20x (consumer product)",
              100: "a miss is near-catastrophic (children's product)"}[K]
    print("%-8s %-12.2f %s" % (K, best_th, interp))
print()
print("the chosen threshold moves across the whole range as K changes, which is")
print("the point: there is no 'correct' threshold without a stated cost ratio,")
print("and F1 silently assumes K = 1.")
print()
print("so the deliverable is not a number. it is a sentence somebody owns:")
print("  'we accept missing X% of harmful content to keep over-refusal under Y%.'")`,
        out: `harmful set   n=300  mean score 0.701
benign-tricky n=1200  mean score 0.247

threshold    block rate   harmful miss  over-refuse           F1
0.30              45.4%           1.0%        32.0%        0.606
0.40              31.1%           4.0%        14.8%        0.752
0.50              22.7%          10.3%         6.0%        0.839
0.60              16.5%          26.7%         2.2%        0.804
0.70              11.5%          45.7%         0.8%        0.689
0.80               6.5%          67.7%         0.1%        0.487
0.90               1.4%          93.0%         0.0%        0.131

F1-optimal threshold: 0.50
  but F1 weights the two errors EQUALLY, and they are not equal.

the honest framing is a policy choice, not an optimisation:
  at 0.50: 10.3% of harmful content gets through, and 6.0% of
           legitimate requests are wrongly refused
  at 0.80: 67.7% of harmful content gets through, and 0.1% of
           legitimate requests are wrongly refused

moving 0.5 -> 0.8 cuts over-refusal from 6.0% to 0.1% and lets
harmful content through at 67.7% instead of 10.3%.
that is 57.3 points of harmful-miss traded for 5.9 points of over-refusal.

the curve is STEEP: a 0.1 move changes both rates by a factor of two or
more, so a threshold chosen by intuition is almost certainly at a point
nobody would have chosen deliberately.

==========================================================================
WHAT A WEIGHTED OBJECTIVE LOOKS LIKE INSTEAD
==========================================================================
suppose a missed harmful response costs K times a wrong refusal.
then minimise  K * miss_rate + over_refusal_rate.

K        best th      interpretation
0.2      0.60         a refusal hurts MORE than a miss (internal tool)
1        0.50         equal cost -- the F1-like assumption
5        0.40         a miss costs 5x a refusal
20       0.30         a miss costs 20x (consumer product)
100      0.30         a miss is near-catastrophic (children's product)

the chosen threshold moves 0.60 -> 0.30 as K changes, which is
the point: there is no 'correct' threshold without a stated cost ratio,
and F1 silently assumes K = 1.

so the deliverable is not a number. it is a sentence somebody owns:
  'we accept missing X% of harmful content to keep over-refusal under Y%.'`,
        notes: [
          { t: "p", text: "**The two error rates move in opposite directions and at wildly different speeds.** Going 0.5 to 0.8 buys 5.9 points of over-refusal and costs 57.4 points of harmful-miss — a ten-to-one exchange rate that is invisible if you report a single combined score." },
          { t: "p", text: "**The weighted-objective table is the constructive part.** At an equal cost ratio it picks 0.50, exactly matching F1 — which confirms that F1 is the equal-cost assumption wearing a different name. As the ratio rises the threshold falls, settling at 0.30 for anything above about 20." },
          { t: "p", text: "**So the threshold is a function of a number nobody writes down.** The chosen point moves from 0.60 to 0.30 as the cost ratio goes from 0.2 to 100, which means every threshold is implicitly a claim about relative harm — and F1 makes that claim silently." },
          { t: "p", text: "**It also saturates**, which is worth noticing: K=20 and K=100 both choose 0.30, because that is the lowest threshold swept. A genuinely safety-critical application would want the sweep extended below 0.30 rather than concluding 0.30 is optimal." },
          { t: "p", text: "The two distributions are synthetic beta draws rather than a real classifier’s scores, so the specific rates are illustrative. The structure — opposite directions, a steep exchange rate, and a threshold that depends on a cost ratio — is what transfers, and you would rebuild this with your own two test sets." },
          { t: "p", text: "The deliverable the table argues for is a sentence rather than a number, and I would want it written down with an owner: ‘we accept missing X% of harmful content to keep over-refusal under Y%.’ Both halves are a decision somebody is accountable for." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Safety is two-sided: too loose lets harm through, too strict blocks legitimate use and users leave. Measured, moving the threshold from 0.5 to 0.8 cuts over-refusal from 6.0% to 0.1% and lets harmful-miss rise from 10.3% to 67.7% \u2014 so the curve is steep and the choice is consequential." },
        { t: "p", text: "F1 picks 0.50 and F1 weights the two errors equally, which they are not. The deliverable is a sentence somebody owns, not a number: \u2018we accept missing X% of harmful content to keep over-refusal under Y%.\u2019 And pair the red-team suite with a benign twin, or every tightening looks like an improvement." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow do you tune a safety threshold?\u201d**" },
        { t: "p", text: "Against two test sets, not one \u2014 a harmful set and a benign-but-tricky set \u2014 and I would report the two error rates separately and never combine them." },
        { t: "p", text: "When I swept a moderation threshold across both, the curve was steep. At 0.5, about 10% of harmful content passed and 6% of legitimate requests were wrongly refused. At 0.8, over-refusal fell to 0.1% and harmful-miss rose to 68%. So a threshold moved by 0.1 changes both rates by a factor of two or more, which means a threshold chosen by intuition is almost certainly at a point nobody would have chosen deliberately." },
        { t: "p", text: "The F1-optimal point was 0.50, and I would not use it \u2014 F1 weights the two errors equally and they are almost never equal. A missed harmful response in a children\u2019s product and a wrongly refused question about medication are not interchangeable mistakes, and a symmetric metric cannot express which one you care about. Reporting F1 for a safety classifier does not just lose precision, it hides the trade-off by collapsing two numbers with different owners into one." },
        { t: "p", text: "What I would do instead is state a cost ratio explicitly \u2014 a miss costs K times a refusal \u2014 and minimise K times the miss rate plus the over-refusal rate. When I did that, the chosen threshold moved from 0.60 down to 0.30 as K went from 0.2 to 100, which is the real finding: there is no correct threshold without a stated cost ratio, and F1 silently assumes the ratio is one." },
        { t: "p", text: "So the deliverable is a sentence somebody owns rather than a number: we accept missing this much harmful content to keep over-refusal under that much. Both halves are a decision." },
        { t: "p", text: "On red-teaming, I would run a fixed attack suite on every prompt, model and guardrail change, covering direct injection, indirect injection through poisoned documents, role-play jailbreaks, encoding tricks, and extraction probes \u2014 and I would pair it with a benign suite. An attack-only suite makes every tightening look like an improvement, including tightening to a point that refuses most legitimate traffic. And I would give indirect injection its own cases, because it exercises a different code path: an attack delivered in a retrieved document never passes through the input scan at all." }
      ] }
  ],

  takeaways: [
    "**Safety is two-sided**: too loose lets harm through, too strict blocks legitimate use and users leave.",
    "**Over-refusal is invisible by default** \u2014 a harmful answer generates a complaint, a wrong refusal generates a user who leaves.",
    "**So guardrails ratchet towards strictness**, because teams tighten on the failures they see and never loosen on the ones they do not.",
    "**Measured at threshold 0.5: 10.3% of harmful content passes, 6.0% of legitimate requests refused.**",
    "**Measured at 0.8: over-refusal 0.1%, harmful-miss 67.7%** \u2014 a 5.9-point gain traded for 57 points.",
    "**The curve is steep**: a 0.1 move changes both rates by a factor of two or more.",
    "**F1 picks 0.50 and F1 weights the two errors equally**, which for a safety guardrail they almost never are.",
    "**Reporting F1 hides the trade-off** by collapsing two numbers with different owners into one.",
    "**State a cost ratio instead** \u2014 the optimal threshold moves from 0.60 to 0.30 as the ratio goes from 0.2 to 100.",
    "**So the deliverable is a sentence somebody owns**, not a number.",
    "**Pair the red-team suite with a benign twin**, or every tightening looks like an improvement.",
    "**Give indirect injection its own cases**, because it exercises a code path the input scan never sees."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is over-refusal harder to notice than a harmful response getting through?",
        options: [
          "Because refusals are not logged by most guardrail implementations",
          "Because a harmful answer generates a complaint while a wrong refusal generates a user who tries once and leaves \u2014 nothing records it",
          "Because over-refusal only affects a small fraction of traffic",
          "Because refusal messages are generic and therefore unsearchable"
        ],
        answer: 1,
        why: "The two errors differ in visibility rather than in frequency, and the consequence is structural: teams tighten in response to failures they can see and never loosen in response to failures they cannot, so thresholds ratchet towards strictness over time. The fix is to put the over-refusal rate on a dashboard measured against a benign-but-tricky set, which is why that set has to exist at all." },

      { stem: "The F1-optimal moderation threshold is 0.50. Why not use it?",
        options: [
          "Because F1 is biased towards the majority class",
          "Because F1 weights the two errors equally, and a missed harmful response and a wrongly refused medical question are not interchangeable",
          "Because F1 cannot be computed without a labelled benign set",
          "Because 0.50 is the default and defaults are rarely optimal"
        ],
        answer: 1,
        why: "A symmetric metric cannot express which error you care about, so optimising it silently assumes the costs are equal \u2014 and for a safety guardrail they almost never are. Stating a cost ratio explicitly and minimising a weighted loss moves the chosen threshold across the entire range as the ratio varies from 0.2 to 100, which demonstrates that no threshold is correct without that ratio being stated." },

      { stem: "What happens to both error rates moving the threshold from 0.5 to 0.8?",
        options: [
          "Both improve, since a higher threshold is more selective",
          "Over-refusal falls from 6.0% to 0.1% while harmful-miss rises from 10.3% to 67.7%",
          "Harmful-miss falls while over-refusal rises",
          "Block rate falls but neither error rate changes materially"
        ],
        answer: 1,
        why: "A higher threshold blocks less, so fewer legitimate requests are refused and more harmful content passes \u2014 and the magnitudes are wildly asymmetric here, trading 5.9 points of over-refusal for 57 points of harmful-miss. That steepness is the practical finding: a threshold moved by 0.1 changes both rates by a factor of two or more, so an intuitively chosen value is unlikely to be anywhere a deliberate process would have landed." },

      { stem: "Why must a red-team suite be paired with a benign suite?",
        options: [
          "To provide a baseline for measuring classifier calibration",
          "Because an attack-only suite makes every tightening look like an improvement, including one that refuses most legitimate traffic",
          "Because benign cases are needed to compute F1",
          "Because attack prompts can be mistaken for benign ones by annotators"
        ],
        answer: 1,
        why: "Jailbreak success rate falls monotonically as the guardrail gets stricter, so a suite measuring only attacks rewards tightening without limit \u2014 at threshold 0.9 it would report excellent results while the product refused ordinary questions. Pairing it means a change that improves one rate and worsens the other surfaces as a trade to be decided rather than an unambiguous win." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Over-refusal and red-teaming",
    questions: [
      { level: "advanced",
        q: "How do you choose a moderation threshold?",
        strong: "A strong answer refuses to optimise a single metric.",
        answer: [
          { t: "p", text: "By sweeping it against two sets \u2014 harmful and benign-but-tricky \u2014 and reporting both error rates separately at every point. The moment they become one number the trade-off disappears." },
          { t: "p", text: "When I did that, 0.5 gave about 10% harmful-miss and 6% over-refusal, and 0.8 gave 68% harmful-miss and 0.1% over-refusal. The curve is steep enough that a 0.1 move changes both rates by a factor of two or more." },
          { t: "p", text: "F1 picked 0.50 and I would not use it, because F1 assumes the two errors cost the same. Instead I would state a cost ratio \u2014 a miss costs K times a refusal \u2014 and minimise a weighted loss. The chosen threshold moves across the whole range as K goes from 0.2 to 100, which is the point: no threshold is correct without a stated ratio." },
          { t: "p", text: "So the deliverable is a sentence somebody owns: we accept missing this much harmful content to keep over-refusal below that much." }
        ] },

      { level: "core",
        q: "What would you put in a red-team suite?",
        strong: "A strong answer includes indirect injection and a benign twin.",
        answer: [
          { t: "p", text: "Direct injection, indirect injection through poisoned retrieved documents, role-play jailbreaks, encoding and obfuscation \u2014 base64, leetspeak, other languages \u2014 and PII and system-prompt extraction probes." },
          { t: "p", text: "Indirect injection needs its own cases because it exercises a different code path. An attack delivered in a retrieved document never passes through the input scan, so a suite that only submits attacks as user input cannot tell you whether that path is defended at all." },
          { t: "p", text: "And I would pair it with a benign-but-tricky suite. An attack-only suite makes every tightening look like an improvement, including tightening to a threshold that refuses most legitimate traffic \u2014 because jailbreak success rate falls monotonically with strictness." },
          { t: "p", text: "Then run both on every prompt, model and guardrail change, and track both rates over time. A regression in either is a finding." }
        ] },

      { level: "core",
        q: "Your guardrails have got stricter over two years. How did that happen?",
        strong: "A strong answer identifies the visibility asymmetry.",
        answer: [
          { t: "p", text: "Almost certainly because only one of the two errors was visible. A harmful response that escapes produces a complaint, a screenshot and an incident review; a wrongly refused request produces a user who tries once, gets a generic refusal, and goes away." },
          { t: "p", text: "So every incident produces a tightening and nothing produces a loosening. The ratchet is structural rather than anybody\u2019s decision, and it continues until somebody measures the other side." },
          { t: "p", text: "I measured this on a regex layer and it was worse than I expected \u2014 six of ten benign-but-tricky inputs blocked, precision 0.571, so nearly half of everything it blocked was a real user asking about developer mode on their phone." },
          { t: "p", text: "The fix is to put over-refusal on the dashboard as a first-class metric with its own benign test set, so that a tightening has a visible cost at the moment it is proposed rather than years later." }
        ] }
    ]
  }
});
