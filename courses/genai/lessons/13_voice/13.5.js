EC.receiveLesson({
  id: "13.5",

  lede: "Deciding that the user has stopped talking is the hardest problem in the voice stack, and it is also the largest single term in the latency budget \u2014 **42.4% of time to first audio**, more than the language model. It is usually presented a table of silence thresholds and concludes, correctly, that *there is no good row in that table*: 300 ms cuts people off a third of the time and 1,500 ms is a second and a half of dead air on every turn. But that conclusion is reached by reading rows, and the two costs are commensurable. Writing down the expected added time per turn and minimising it gives an optimum of **395 to 620 ms depending on how expensive a repair is** \u2014 so the conventional 700 ms pick is too *patient*, not too aggressive. And then the better move is to notice that the whole frontier is an artefact of measuring silence at all.",

  objectives: [
    "Explain why silence duration is a poor proxy for end of turn",
    "Read the threshold table as a tail probability of a measurable distribution",
    "Combine latency cost and interruption cost into one objective and minimise it",
    "State when the conventional 700 ms threshold is defensible and when it is not",
    "Describe what a semantic endpointer uses instead and what it is worth"
  ],

  prerequisites: ["13.3", "13.4"],

  blocks: [

    { t: "h2", n: "01", id: "problem", text: "Why this is hard",
      sub: "Silence does not mean finished" },

    { t: "p", text: "A voice activity detector tells you whether the current audio frame contains speech. From that, the standard endpointer builds a rule: if there has been no speech for N milliseconds, the turn is over. The rule is wrong, and it is wrong in a way no amount of tuning fixes, because people pause inside sentences for reasons that have nothing to do with being finished." },

    { t: "ul", items: [
      "**Recalling something.** \u201cMy account number is\u2026 four, two, seven\u2026 hold on\u2026 nine.\u201d Each pause is longer than the gap between turns.",
      "**Planning a complicated sentence.** Pauses cluster before the hard part, which is usually the informative part.",
      "**Breathing.** Reliably 200 to 400 ms, and more frequent when the speaker is stressed, which is when they are calling support.",
      "**Thinking about what you just said.** The pause after a question is sometimes the user considering it, not waiting for you.",
      "**Dictating anything structured.** Addresses, dates, spellings and card numbers all have long internal pauses by design, because the speaker is being careful."
    ] },

    { t: "p", text: "Meanwhile a genuine end of turn is often marked by no silence at all \u2014 a falling pitch contour, a completed syntactic structure, a question's rising tone. Humans use those signals, which is why their turn-taking gap is 200 ms rather than 700. A silence timer discards every one of them and listens to the one signal that is least informative." },

    { t: "callout", kind: "insight", title: "The signal and the proxy",
      body: [
        { t: "p", text: "It is worth stating plainly: the quantity you want is *has this person finished their thought*, and the quantity you are measuring is *how long has it been quiet*. Those correlate, which is why a timer works at all, and they are not the same thing, which is why it works badly." },
        { t: "p", text: "Almost everything in this lesson follows from that gap. The frontier of bad options exists because you are optimising a proxy, and the way out is a better signal rather than a better threshold." }
      ] },

    { t: "h2", n: "02", id: "table", text: "The table, and what it is really showing",
      sub: "A tail probability, not a quality setting" },

    { t: "p", text: "Model pauses inside an utterance as lognormal with a median of 220 ms. Then for any threshold, the fraction of intra-utterance pauses longer than it is exactly the fraction of turns where the agent will conclude the user has finished and start talking over them." },

    { t: "code", lang: "python", title: "The interruption rate is a tail probability",
      code: 'import math\n\nMEDIAN_PAUSE, SIGMA = 220.0, 0.75\n\ndef p_pause_exceeds(t):\n    """P(an intra-utterance pause is longer than t) = P(the agent cuts in)."""\n    z = (math.log(t) - math.log(MEDIAN_PAUSE)) / SIGMA\n    return 0.5 * math.erfc(z / math.sqrt(2.0))\n\nfor t in (300, 500, 700, 900, 1200, 1500):\n    p = p_pause_exceeds(t)\n    print("%5d ms threshold  +%4d ms latency  P(cut off) %.3f  %4.1f per 100 turns"\n          % (t, t, p, 100 * p))',
      out: '  300 ms threshold  + 300 ms latency  P(cut off) 0.340  34.0 per 100 turns\n  500 ms threshold  + 500 ms latency  P(cut off) 0.137  13.7 per 100 turns\n  700 ms threshold  + 700 ms latency  P(cut off) 0.061   6.1 per 100 turns\n  900 ms threshold  + 900 ms latency  P(cut off) 0.030   3.0 per 100 turns\n 1200 ms threshold  +1200 ms latency  P(cut off) 0.012   1.2 per 100 turns\n 1500 ms threshold  +1500 ms latency  P(cut off) 0.005   0.5 per 100 turns',
      caption: "Every row is bad. 700 ms is the usual pick, as the least-bad compromise." },

    { t: "callout", kind: "good", title: "This reframing is the practical gift of the lesson",
      body: [
        { t: "p", text: "The interruption rate is not a mysterious quality property of your endpointer that you discover by listening to calls. It is the right tail of a distribution you can fit from your own recordings in an afternoon: segment the audio, measure every intra-utterance pause, fit a lognormal." },
        { t: "p", text: "And the distribution is strongly domain-specific. A caller reading out a policy number pauses nothing like a caller describing a fault. So the generic 220 ms median is a placeholder, and your own fit will move every number in this lesson \u2014 which is the point of fitting it." }
      ] },

    { t: "h2", n: "03", id: "objective", text: "There is no good row, so stop reading rows",
      sub: "Both costs are in milliseconds, so add them up" },

    { t: "p", text: "The table invites you to pick a point on a frontier, and that framing hides something: the two costs are in the same units. A threshold costs its own milliseconds on **every** turn. An interruption costs a repair \u2014 the user re-says the clipped part, the agent re-processes \u2014 on the fraction of turns where it happens. So write down the expected added time per turn and minimise it." },

    { t: "math", tex: "E[\\text{added}] \\;=\\; T \\;+\\; P(\\text{pause} > T)\\cdot C_{\\text{repair}}" },

    { t: "p", text: "The only new quantity is the cost of a repair, and a sensible range is one to three seconds: the user realises they were cut off, waits for the agent to stop, re-says the clipped fragment, and the agent processes another turn. Sweeping that range gives an answer that does not depend on pinning it down precisely." },

    { t: "viz", title: "Minimising the right quantity",
      caption: "The expected-added-time curve is U-shaped, and its minimum sits left of the conventional pick in every case.",
      svg: '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Expected added time against endpointing threshold">' +
        '<line x1="70" y1="270" x2="730" y2="270" class="s-stroke"/>' +
        '<line x1="70" y1="30" x2="70" y2="270" class="s-stroke"/>' +
        '<text x="400" y="300" class="s-sub" text-anchor="middle">endpointing threshold (ms)</text>' +
        '<text x="20" y="150" class="s-sub" transform="rotate(-90 20 150)" text-anchor="middle">E[added] ms</text>' +
        '<text x="70" y="288" class="s-mono" text-anchor="middle">100</text>' +
        '<text x="268" y="288" class="s-mono" text-anchor="middle">500</text>' +
        '<text x="466" y="288" class="s-mono" text-anchor="middle">900</text>' +
        '<text x="664" y="288" class="s-mono" text-anchor="middle">1300</text>' +
        '<text x="62" y="36" class="s-mono" text-anchor="end">1400</text>' +
        '<text x="62" y="270" class="s-mono" text-anchor="end">600</text>' +
        '<polyline fill="none" stroke="var(--good)" stroke-width="2" points="70,241 120,222 170,215 220,214 268,218 318,226 367,236 417,249 466,262 516,276 565,290"/>' +
        '<polyline fill="none" stroke="var(--warn)" stroke-width="2" points="70,160 120,166 170,178 220,192 268,188 318,196 367,208 417,221 466,234 516,249 565,264"/>' +
        '<polyline fill="none" stroke="var(--crit)" stroke-width="2" points="70,78 120,108 170,135 220,155 268,147 318,160 367,176 417,191 466,206 516,221 565,237"/>' +
        '<circle cx="183" cy="214" r="4" fill="var(--good)"/>' +
        '<circle cx="283" cy="186" r="4" fill="var(--warn)"/>' +
        '<circle cx="328" cy="156" r="4" fill="var(--crit)"/>' +
        '<line x1="367" y1="30" x2="367" y2="270" stroke="var(--line)" stroke-dasharray="4 4"/>' +
        '<text x="372" y="46" class="s-mono s-sub">the conventional 700 ms</text>' +
        '<text x="585" y="245" class="s-mono" fill="var(--crit)">repair = 3000 ms</text>' +
        '<text x="585" y="270" class="s-mono" fill="var(--warn)">repair = 2000 ms</text>' +
        '<text x="585" y="295" class="s-mono" fill="var(--good)">repair = 1000 ms</text>' +
        '<text x="88" y="320" class="s-sub">optimum 395 ms</text>' +
        '<text x="240" y="320" class="s-sub">530 ms</text>' +
        '<text x="330" y="320" class="s-sub">620 ms</text>' +
        '<text x="420" y="320" class="s-sub">\u2014 all three left of 700</text>' +
        '</svg>' },

    { t: "callout", kind: "tradeoff", title: "Be honest about the magnitude, not just the direction",
      body: [
        { t: "p", text: "The optimum is left of 700 ms under every assumption, but the *penalty* for using 700 is not uniform. If a repair costs 1,000 ms, 700 leaves about 149 ms on the table every turn. If a repair costs 3,000 ms, 700 is within 13 ms of optimal and not worth touching." },
        { t: "p", text: "So the honest statement is conditional: the more an interruption actually hurts your users, the more defensible the conventional threshold is. Which regime you are in depends on how expensive your repairs are, and that is the quantity to go and measure \u2014 not a number to argue about from first principles." }
      ] },

    { t: "h2", n: "04", id: "semantic", text: "The better signal",
      sub: "What a semantic endpointer does instead" },

    { t: "p", text: "The frontier above is a property of deciding on silence. A semantic endpointer decides on the content and shape of what was said, and uses a short timer only as a backstop. The signals are the ones humans use." },

    { t: "dl", items: [
      { k: "Syntactic completeness", v: "\u201cI would like to transfer\u201d is unfinished; \u201cI would like to transfer two hundred dollars\u201d is a complete clause. A small model scoring completeness on the partial transcript is cheap and remarkably effective." },
      { k: "Prosody", v: "A falling pitch contour at the end of a phrase marks a statement finished; a rising one marks a question finished; a flat, sustained contour marks someone mid-thought. This is why a speech-native model endpoints better \u2014 it has the audio." },
      { k: "Pragmatic expectation", v: "If you asked a yes-or-no question, \u201cyes\u201d is a complete turn and you should not wait 700 ms to find out. The expected answer shape is known from the question you just asked, and it is free information." },
      { k: "A short backstop timer", v: "Never rely on the model alone. A 300 ms timer that fires when the semantic signal is ambiguous bounds the worst case and keeps the system predictable." }
    ] },

    { t: "p", text: "The reported behaviour of a good semantic endpointer is **the latency of a 300 ms threshold with the interruption rate of a 900 ms one**. That is the important sentence in this lesson, because it is not a point on the frontier \u2014 it is off it. Both axes improve at once, which is only possible because the frontier was an artefact of a bad proxy." },

    { t: "ladder", title: "Endpointing strategies, worst to best",
      rungs: [
        { level: "bad", label: "A fixed threshold nobody chose",
          why: "The common case: a constant copied from a quickstart, usually 700 or 800 ms, never revisited. It is simultaneously the largest term in the latency budget and the least examined line in the codebase.",
          code: "VAD_SILENCE_MS = 700   # from the tutorial",
          note: "42.4% of your latency budget, set by someone who was not thinking about latency." },
        { level: "ok", label: "A fixed threshold you chose on purpose",
          why: "Fit the pause distribution from your own recordings, write down the cost of a repair, minimise expected added time. This is a genuine improvement and costs an afternoon \u2014 and it beats the convention on the convention's own terms.",
          code: "# fit from recordings, then:\nbest = min(range(100, 2001, 5),\n           key=lambda t: t + p_pause_exceeds(t) * REPAIR_MS)",
          note: "Worth 50 to 150 ms a turn, for no inference cost and no new infrastructure." },
        { level: "ok", label: "Different thresholds per context",
          why: "The pause distribution is not stationary within a call. While collecting a card number, be patient; after a yes-or-no question, be aggressive. This captures much of the semantic win with none of the machine learning.",
          code: "THRESHOLD = {\"collecting_digits\": 1200,\n             \"yes_no\": 250,\n             \"open_ended\": 600}[state]",
          note: "The single highest-value cheap trick in this lesson. Your dialogue state already knows which case it is in." },
        { level: "best", label: "Semantic endpointing with a short backstop",
          why: "Score end-of-turn on the partial transcript and prosody; fall back to a 300 ms timer when ambiguous. Gets the latency of a 300 ms threshold with the interruption rate of a 900 ms one \u2014 24.2% off the whole budget and half the interruptions, simultaneously.",
          code: "p_done = turn_model(partial_text, pitch_contour)\nif p_done > 0.8 or silence_ms > 300:\n    commit_turn()",
          note: "Better on both axes at once, which is the signature of having fixed a proxy rather than tuned a threshold." }
      ] },

    { t: "exercise", kind: "analysis", title: "Find the threshold that minimises expected added time",
      difficulty: "advanced", minutes: 26,
      body: "Reproduce the threshold table, then treat latency cost and interruption cost as one objective and minimise it over a sweep of thresholds. Do this for three repair costs. Report the optimum in each case and how much the conventional 700 ms loses. Then put a semantic endpointer in the same table and say what changed.",
      requirements: [
        "Model intra-utterance pauses as lognormal, median 220 ms, sigma 0.75",
        "Report the standard table of thresholds, latency costs and interruption rates",
        "Minimise E[added] = T + P(pause > T) x repair_cost over T from 100 to 2000 ms",
        "Sweep repair costs of 1,000, 2,000 and 3,000 ms and report each optimum",
        "State how much 700 ms loses in each regime, not just that it is suboptimal",
        "Add a semantic endpointer row and compare it on latency, interruptions and E[added]"
      ],
      hint: "P(pause > T) uses the complementary error function: 0.5 * erfc(z / sqrt(2)) with z the standardised log of T. The semantic row has the latency of a 300 ms timer and the interruption rate of a 900 ms one.",
      solution: { lang: "python", title: "x1305.py \u2014 minimise the objective, then change it",
        code: 'import math\n\nMEDIAN_PAUSE, SIGMA = 220.0, 0.75\n\ndef p_cut(t):\n    z = (math.log(t) - math.log(MEDIAN_PAUSE)) / SIGMA\n    return 0.5 * math.erfc(z / math.sqrt(2.0))\n\n# the conventional reading: pick a row\nfor t in (300, 500, 700, 900, 1200, 1500):\n    print("%5d ms  +%4d ms  P(cut) %.3f" % (t, t, p_cut(t)))\n\n# the two costs are in the same units, so minimise their sum\nfor repair in (1000, 2000, 3000):\n    rows = [(t, t + p_cut(t) * repair) for t in range(100, 2001, 5)]\n    best = min(rows, key=lambda r: r[1])\n    loss = (700 + p_cut(700) * repair) - best[1]\n    print("repair %4d ms -> optimum %3d ms (E=%.1f); 700 ms loses %.1f ms"\n          % (repair, best[0], best[1], loss))\n\n# and the move that leaves the frontier entirely\nCASCADE = 1650\nfor label, lat, pc, timer in (("fixed 700 ms", CASCADE, p_cut(700), 700),\n                              ("fixed 300 ms", CASCADE - 400, p_cut(300), 300),\n                              ("semantic", CASCADE - 400, p_cut(900), 300)):\n    print("%-14s first audio %5d ms  P(cut) %.3f  E[added]@2000 %7.1f ms"\n          % (label, lat, pc, timer + pc * 2000))',
        out: '============================================================================================\nThe endpointing table, and the question it does not answer\n============================================================================================\nintra-utterance pauses: lognormal, median 220 ms, sigma 0.75\n\n   threshold      latency cost     P(cut off)    per 100 turns\n   300 ms             +300 ms          0.340          34.0\n   500 ms             +500 ms          0.137          13.7\n   700 ms             +700 ms          0.061           6.1\n   900 ms             +900 ms          0.030           3.0\n   1200 ms           +1200 ms          0.012           1.2\n   1500 ms           +1500 ms          0.005           0.5\n\nevery row is bad. 300 ms cuts people off a third of the time; 1,500 ms is a\nsecond and a half of dead air on every single turn. that is the usual place\nto stop, with 700 ms picked as the least-bad compromise.\n\n--------------------------------------------------------------------------------------------\nBUT THE TWO COSTS ARE COMMENSURABLE\n--------------------------------------------------------------------------------------------\nthe threshold costs its own milliseconds on EVERY turn. an interruption costs\na repeated turn -- the user re-says the clipped part, the agent re-processes.\nso write down the expected added time per turn and minimise it:\n\n     E[added] = threshold + P(cut) x cost_of_an_interruption\n\nif an interruption costs 1000 ms:\n     300 ms  P(cut)=0.340  E[added] =   639.6 ms\n     500 ms  P(cut)=0.137  E[added] =   636.8 ms\n     700 ms  P(cut)=0.061  E[added] =   761.4 ms\n     900 ms  P(cut)=0.030  E[added] =   930.2 ms\n    1200 ms  P(cut)=0.012  E[added] =  1211.9 ms\n   OPTIMUM 395 ms, E[added] 612.6 ms   (700 ms costs 148.8 ms more)\n\nif an interruption costs 2000 ms:\n     300 ms  P(cut)=0.340  E[added] =   979.2 ms\n     500 ms  P(cut)=0.137  E[added] =   773.7 ms\n     700 ms  P(cut)=0.061  E[added] =   822.8 ms\n     900 ms  P(cut)=0.030  E[added] =   960.3 ms\n    1200 ms  P(cut)=0.012  E[added] =  1223.7 ms\n   OPTIMUM 530 ms, E[added] 771.1 ms   (700 ms costs 51.7 ms more)\n\nif an interruption costs 3000 ms:\n     300 ms  P(cut)=0.340  E[added] =  1318.8 ms\n     500 ms  P(cut)=0.137  E[added] =   910.5 ms\n     700 ms  P(cut)=0.061  E[added] =   884.1 ms\n     900 ms  P(cut)=0.030  E[added] =   990.5 ms\n    1200 ms  P(cut)=0.012  E[added] =  1235.6 ms\n   OPTIMUM 620 ms, E[added] 870.7 ms   (700 ms costs 13.4 ms more)\n\nthe optimum is 395-620 ms across that whole range, and 700 ms is never optimal:\nthe conventional pick is too PATIENT, not too aggressive, because 700 ms is paid\non every turn and an interruption is paid on only 6.1% of them.\n\nbut be honest about the MAGNITUDE, because it is not uniform:\n   interruption costs 1000 ms -> optimum 395 ms, and 700 ms loses 148.8 ms\n   interruption costs 2000 ms -> optimum 530 ms, and 700 ms loses  51.7 ms\n   interruption costs 3000 ms -> optimum 620 ms, and 700 ms loses  13.4 ms\n   so the more an interruption actually hurts, the more defensible 700 ms is.\n   at 3,000 ms it is within 13 ms of optimal and not worth changing; at 1,000 ms\n   it is leaving 149 ms on every turn. which regime you are in depends on how\n   expensive YOUR repairs are, so that is the quantity to go and measure.\n\n--------------------------------------------------------------------------------------------\nAND THE REAL ANSWER IS NOT A NUMBER AT ALL\n--------------------------------------------------------------------------------------------\na semantic endpointer decides on syntax and prosody, using a short timer only\nas a backstop. reported behaviour: the latency of a 300 ms threshold with the\ninterruption rate of a 900 ms one. put that in the budget and the trade-off\nthat organised this entire lesson disappears:\n\n   endpointer                         first audio   P(cut off)  E[added]@2000\n   fixed 700 ms                           1650ms        0.061       822.8 ms\n   fixed 300 ms                           1250ms        0.340       979.2 ms\n   fixed 1200 ms                          2150ms        0.012      1223.7 ms\n   semantic (300 ms backstop)             1250ms        0.030       360.3 ms\n\nthe semantic row is better than the fixed 700 ms row on BOTH axes at once:\n   latency      1650 -> 1250 ms   (24.2% better)\n   interruption 0.061 -> 0.030   (2.0x fewer)\n   E[added]     822.8 -> 360.3 ms  (56.2% better)\n\nTHE POINT: the table presents a frontier and invites you to pick a point on it.\nthe first move is to minimise the right objective rather than eyeball rows --\nwhich already beats the convention. the second is to notice the frontier is an\nartefact of measuring silence, and that a better signal moves the whole curve.\nwhen every option looks bad, check whether you are choosing on the wrong axis.',
        notes: [
          { t: "p", text: "**The optimum is 395 to 620 ms across the whole range of repair costs, and 700 ms is never optimal.** The direction of the error is the interesting part: the conventional pick is too *patient*. 700 ms is paid on every single turn, while an interruption is paid on only 6.1% of them, so the arithmetic favours being bolder than convention." },
          { t: "p", text: "**But the magnitude is not uniform, and the honest version is conditional.** At a 1,000 ms repair cost, 700 ms leaves 149 ms on the table every turn. At 3,000 ms it is within 13 ms of optimal and not worth changing. So the more an interruption actually hurts, the more defensible the convention \u2014 and the quantity to go and measure is how expensive your own repairs are." },
          { t: "p", text: "**The semantic row is better than the fixed 700 ms row on both axes simultaneously**: 1,650 \u2192 1,250 ms of first audio (24.2% better), 6.1% \u2192 3.0% interruptions (2.0x fewer), and E[added] from 822.8 to 360.3 ms (56.2% better). Nothing on the frontier can do that, because improving in both directions at once is precisely what a frontier forbids." },
          { t: "p", text: "**Which is the tell.** If you find a Pareto improvement on what looked like a frontier, the frontier was an artefact of the variable you were optimising. Here the variable was silence duration, and the real question was whether the person had finished a thought. A better signal moved the whole curve rather than finding a better point on it." },
          { t: "p", text: "**Practical ordering from all of this**: fit your own pause distribution (an afternoon), then set per-context thresholds from your dialogue state (a day, and it captures much of the semantic win with no machine learning), then build the semantic endpointer (four weeks). The first two are nearly free and almost nobody does them." }
        ] } },

    { t: "callout", kind: "trap", title: "The pause distribution is not stationary",
      body: [
        { t: "p", text: "Everything above treats pauses as draws from one distribution, and they are not. Within a single call, a caller reading out a sixteen-digit card number has a completely different pause profile from the same caller answering \u201cwas that everything today?\u201d" },
        { t: "p", text: "This is why the per-context rung of the ladder is so cheap and so effective. Your dialogue state machine \u2014 13.11 builds it \u2014 already knows whether it is collecting digits or asking a yes-or-no question. Using that to select a threshold requires no model, no training data and no new infrastructure, and it captures a large share of what semantic endpointing is for." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: \u201cthe agent keeps cutting people off\u201d",
      body: [
        { t: "p", text: "Support reports that the agent interrupts callers, and the obvious fix is proposed: raise the silence threshold from 700 to 1,200 ms. That would cut interruptions from 6.1% to 1.2% of turns, which sounds decisive." },
        { t: "p", text: "It also adds 500 ms to **every** turn, taking the pipeline from 1,650 to 2,150 ms \u2014 out of the band where users wonder whether they were heard and into the band where they say \u201chello?\u201d. The expected added time per turn gets *worse*, from 822.8 to 1,223.7 ms. You would be trading a problem affecting 6% of turns for a problem affecting all of them, and the complaints would not stop, they would change wording." },
        { t: "p", text: "Two better moves, in order. First, find out **where** the interruptions happen. If they cluster on digit collection and address capture, a per-context threshold fixes the actual complaint for a day's work and costs nothing anywhere else. Second, if they are spread evenly, fit the pause distribution and minimise expected added time properly \u2014 which in this model argues for going *down* from 700, not up. The complaint is real and the proposed direction is backwards." }
      ] }
  ],

  takeaways: [
    "**Endpointing is 42.4% of time to first audio**, a larger share than the language model, and usually a constant nobody chose.",
    "**Silence duration is a proxy for \u201chas this person finished a thought\u201d**, and a poor one \u2014 people pause to recall, plan, breathe and dictate.",
    "**A genuine end of turn is often marked by no silence at all**: falling pitch, a completed clause, a question's rising tone. A timer discards all of it.",
    "**The interruption rate is a tail probability of a measurable distribution**, fittable from your own recordings in an afternoon \u2014 not a mysterious property of the endpointer.",
    "**The two costs are in the same units**, so minimise E[added] = T + P(pause > T) x repair cost instead of eyeballing rows.",
    "**The optimum is 395\u2013620 ms** for repair costs of 1,000\u20133,000 ms, so the conventional 700 ms is too **patient**, not too aggressive.",
    "**The penalty is conditional**: 700 ms loses 149 ms a turn at a 1,000 ms repair cost and only 13 ms at 3,000 \u2014 so measure your repair cost before changing anything.",
    "**Per-context thresholds are the cheapest big win**: 1,200 ms while collecting digits, 250 ms after a yes-or-no question, using dialogue state you already have.",
    "**A semantic endpointer gets the latency of a 300 ms threshold with the interruption rate of a 900 ms one** \u2014 24.2% less latency and 2.0x fewer interruptions, together.",
    "**A Pareto improvement on an apparent frontier means the frontier was an artefact** of the variable being optimised \u2014 here, silence rather than completion.",
    "**Raising the threshold to fix interruptions makes expected added time worse**, 822.8 \u2192 1,223.7 ms, trading a 6% problem for a 100% one.",
    "**Order of work**: fit your pause distribution, then per-context thresholds, then the semantic model \u2014 the first two are nearly free and almost nobody does them."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What does the interruption rate in the threshold table actually represent?",
        options: [
          "An empirical error rate measured from the voice activity detector's accuracy",
          "The fraction of intra-utterance pauses longer than the threshold \u2014 a tail probability of a fittable distribution",
          "The probability that the recogniser produces a wrong transcript at the turn boundary",
          "A quality rating assigned by human reviewers listening to calls"
        ],
        answer: 1,
        why: "Pauses inside an utterance are modelled as lognormal with a 220 ms median, and any pause longer than the threshold is a turn where the agent wrongly concludes the user has finished. That makes the interruption rate the right tail of a distribution you can fit from your own recordings by segmenting audio and measuring every intra-utterance gap \u2014 so it is a measurable property of your callers rather than an opaque quality of your endpointer." },

      { stem: "Minimising E[added] = T + P(pause > T) x repair cost gives optima of 395\u2013620 ms. What does that say about the conventional 700 ms?",
        options: [
          "It is too aggressive, since it interrupts 6.1% of turns",
          "It is too patient \u2014 the threshold is paid on every turn while an interruption is paid on only 6.1% of them",
          "It is correct, because the optima are within the normal range of variation",
          "The comparison is invalid because latency and interruptions are not commensurable"
        ],
        answer: 1,
        why: "The asymmetry drives the result: 700 ms of waiting is charged on every single turn, whereas the cost of cutting someone off is charged on the 6.1% of turns where a pause runs long. Balancing those favours less patience than convention. The magnitude is conditional, though \u2014 700 ms loses about 149 ms a turn when a repair costs 1,000 ms and only 13 ms when it costs 3,000, so it is defensible where interruptions genuinely hurt." },

      { stem: "A semantic endpointer achieves lower latency and fewer interruptions than a fixed 700 ms threshold, simultaneously. What does that imply about the original trade-off?",
        options: [
          "The measurements must be wrong, since the trade-off is fundamental",
          "The frontier was an artefact of optimising silence duration rather than turn completion",
          "The semantic endpointer is operating at a different point on the same frontier",
          "The improvement comes from reduced ASR latency rather than endpointing"
        ],
        answer: 1,
        why: "A genuine frontier forbids improving in both directions at once, so a Pareto improvement is evidence that the constraint was never real \u2014 it came from the variable being optimised. The frontier existed because silence duration is a proxy for whether someone finished a thought; scoring completion directly, from syntax and prosody, moves the whole curve instead of finding a better point on it. That pattern is worth recognising generally." },

      { stem: "Support reports the agent interrupts callers. The team proposes raising the threshold from 700 to 1,200 ms. What is the problem?",
        options: [
          "Nothing \u2014 it cuts interruptions from 6.1% to 1.2%, which is the stated complaint",
          "It adds 500 ms to every turn, pushing the pipeline to 2,150 ms and making expected added time worse",
          "1,200 ms exceeds the maximum most voice activity detectors support",
          "It will increase ASR error rates because more silence is included in the audio"
        ],
        answer: 1,
        why: "The change trades a problem on 6% of turns for a penalty on 100% of them: time to first audio goes to 2,150 ms, out of the band where users wonder whether they were heard and into the one where they say \u201chello?\u201d, and expected added time rises from 822.8 to 1,223.7 ms. Better to find where interruptions cluster and set a per-context threshold, since this model argues for going down from 700 rather than up." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Endpointing",
    questions: [
      { level: "advanced",
        q: "How would you decide the endpointing threshold for a new voice agent?",
        strong: "A strong answer fits the distribution and minimises a stated objective.",
        answer: [
          { t: "p", text: "I would not pick a number, I would minimise something. The reason the usual table of thresholds looks like a set of bad options is that it presents two costs side by side and invites you to eyeball them, when the two costs are in the same units. The threshold costs its own milliseconds on every turn. An interruption costs a repair on the fraction of turns where a pause runs long. So the objective is the threshold plus the probability of cutting in times the cost of a repair." },
          { t: "p", text: "Two inputs. The pause distribution, which I would fit from our own recordings rather than take generically \u2014 segment the audio, measure every intra-utterance gap, fit a lognormal. And the cost of a repair, which is a second to three seconds depending on how long it takes a user to realise, wait, and re-say the clipped fragment. I would sweep that range rather than pretend to know it." },
          { t: "p", text: "When I ran that with a 220 millisecond median, the optimum came out between 395 and 620 milliseconds across the whole range, so the conventional 700 is never optimal \u2014 and in the direction people do not expect. It is too patient, because 700 milliseconds is charged on every turn and an interruption only on about 6% of them." },
          { t: "p", text: "I would be careful not to oversell that, though. The penalty for using 700 depends on the regime: if a repair costs a second, 700 is leaving about 150 milliseconds on every turn, which is worth having. If a repair costs three seconds, 700 is within 13 milliseconds of optimal and I would leave it alone and go do something else. So the deliverable is not a threshold, it is the repair cost measurement that tells you whether the threshold is even your problem." }
        ] },

      { level: "core",
        q: "Users complain the agent cuts them off. Do you raise the threshold?",
        strong: "A strong answer rejects the proposed direction and localises the problem.",
        answer: [
          { t: "p", text: "Probably not, and I would want to look at where it happens before changing anything globally. Raising the threshold from 700 to 1,200 milliseconds does cut interruptions from about 6% of turns to about 1%, so it addresses the literal complaint. But it adds 500 milliseconds to every turn, which takes the pipeline from 1,650 to 2,150 \u2014 out of the band where users wonder whether they were heard and into the band where they say \u2018hello?\u2019. Expected added time per turn gets worse, from about 820 to about 1,220 milliseconds. The complaints would not stop, they would change wording." },
          { t: "p", text: "What I would do first is find out where the interruptions cluster. My strong prior is that they are not uniform: they pile up wherever the user is dictating something structured, because a card number or an address or a spelling has long internal pauses by design. If that is what the data shows, the fix is a per-context threshold \u2014 be patient while collecting digits, be aggressive after a yes-or-no question \u2014 and it costs about a day because the dialogue state machine already knows which situation it is in." },
          { t: "p", text: "That is the highest-value cheap trick in this area and almost nobody does it. It captures much of what semantic endpointing is for, with no model, no training data and no new infrastructure, and it does not slow down the 90% of turns that were fine." },
          { t: "p", text: "If the interruptions genuinely are spread evenly, then I would fit the pause distribution and minimise expected added time properly \u2014 which in this model argues for going down from 700 rather than up. Either way the complaint is real and the proposed direction is backwards." }
        ] },

      { level: "advanced",
        q: "What is a semantic endpointer and why is it worth building?",
        strong: "A strong answer explains that it leaves the frontier rather than moving along it.",
        answer: [
          { t: "p", text: "It decides that the turn is over based on what was said and how it sounded, rather than on how long it has been quiet. The signals are the ones humans use: whether the partial transcript forms a complete syntactic unit, whether the pitch contour has fallen the way a finished statement does or risen the way a finished question does, and what shape of answer the agent's own last utterance set up \u2014 if you asked a yes-or-no question, \u2018yes\u2019 is a complete turn and there is no reason to wait 700 milliseconds to confirm it. Plus a short backstop timer, around 300 milliseconds, for when the signal is ambiguous, because you never want the worst case unbounded." },
          { t: "p", text: "It is worth building because of what the numbers do. A good one gets the latency of a 300 millisecond threshold with the interruption rate of a 900 millisecond one. In the budget that is 1,650 down to 1,250 milliseconds, 24% off the whole turn, while interruptions halve from about 6% to about 3%. Both axes improve at once." },
          { t: "p", text: "And that is the part I find most interesting, because a frontier is defined by the impossibility of exactly that. If you can improve both, the frontier was not real \u2014 it was an artefact of the variable you were optimising. Here the variable was silence duration and the question was whether the person had finished a thought. Those correlate, which is why a timer works at all, and they are different, which is why it works badly. A better signal moves the whole curve instead of finding a better point on it." },
          { t: "p", text: "On sequencing I would still not start here. Fitting the pause distribution is an afternoon, per-context thresholds are a day, and the semantic model is about four weeks. The first two capture a real fraction of the win, and they also tell you whether the four weeks is justified for your traffic." }
        ] }
    ]
  }
});
