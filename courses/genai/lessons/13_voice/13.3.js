EC.receiveLesson({
  id: "13.3",

  lede: "Here is the finding that should reorganise how a team spends its optimisation effort. In the standard cascaded pipeline, **the language model accounts for 33.3% of time to first audio and the endpointing silence accounts for 42.4%**. Teams reliably spend months on a faster model and win about 10%, while the 700 milliseconds of silence they are waiting out \u2014 a number almost always copied from a quickstart and never revisited \u2014 sits untouched as the single largest term in the budget. This lesson accounts for every millisecond of a turn, runs the sensitivity analysis, and then asks the question the sensitivity analysis cannot answer on its own: which *combination* of changes actually reaches a target.",

  objectives: [
    "Account for all 1,650 ms of a cascaded turn by stage",
    "Compute each stage's share and the effect of halving it",
    "Identify endpointing as the largest term and explain why it is overlooked",
    "Distinguish a sensitivity analysis from a target-reaching plan",
    "Find the floor a cascade architecture has, and say what lies below it"
  ],

  prerequisites: ["13.1", "13.2"],

  blocks: [

    { t: "h2", n: "01", id: "stages", text: "Every millisecond, named",
      sub: "Seven stages between the user stopping and hearing anything" },

    { t: "p", text: "The thing a user experiences is **time to first audio**: the interval between the moment they stop speaking and the moment sound comes out of the speaker. Not the total response time, not the model's latency \u2014 the first audio. Once the agent is talking, the user is occupied, and the rest of the response streams out behind cover." },

    { t: "code", lang: "python", title: "The cascaded budget",
      code: 'CASCADED = [\n    ("endpoint silence",        700, "wait to be sure the user stopped talking"),\n    ("ASR finalisation",        120, "flush the decoder, apply the LM, punctuate"),\n    ("network to LLM",           40, "one round trip"),\n    ("LLM time to first token",  350, "prefill the prompt"),\n    ("LLM first clause",         200, "12 tokens at 60 tok/s, enough to start speaking"),\n    ("TTS first chunk",         180, "synthesise the opening clause"),\n    ("playout buffer",           60, "jitter buffer before audio leaves the speaker"),\n]\n\ntotal = sum(ms for _n, ms, _w in CASCADED)\nfor n, ms, why in CASCADED:\n    print("%-28s %6d   %-48s %s" % (n, ms, why, "#" * max(1, round(ms / 25))))\nprint("%-28s %6d" % ("TIME TO FIRST AUDIO", total))',
      out: 'endpoint silence                700   wait to be sure the user stopped talking         ############################\nASR finalisation                120   flush the decoder, apply the LM, punctuate       #####\nnetwork to LLM                   40   one round trip                                  ##\nLLM time to first token         350   prefill the prompt                              ##############\nLLM first clause                200   12 tokens at 60 tok/s, enough to start speaking ########\nTTS first chunk                 180   synthesise the opening clause                   #######\nplayout buffer                   60   jitter buffer before audio leaves the speaker   ##\nTIME TO FIRST AUDIO            1650',
      caption: "1,650 ms. The bar chart is the whole lesson: one stage is visibly larger than the rest." },

    { t: "p", text: "Two stages deserve a note because they are easy to misread. **LLM first clause** is not the full response \u2014 it is the first twelve or so tokens, which at 60 tokens per second is 200 milliseconds, and twelve tokens is enough of a clause to hand to the synthesiser and start speaking. And **playout buffer** is the jitter buffer: audio is held briefly so that a network hiccup does not produce a gap mid-word. It is 60 ms of deliberate latency bought as insurance." },

    { t: "viz", title: "Where the 1,650 ms goes",
      caption: "Endpointing is 42.4% of the budget. The model, which gets the attention, is 33.3%.",
      svg: '<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Stacked bar of the cascaded latency budget by stage">' +
        '<text x="12" y="20" class="s-label">TIME TO FIRST AUDIO \u2014 1,650 ms</text>' +
        '<rect x="12" y="34" width="313" height="44" fill="var(--crit)" opacity="0.30" stroke="var(--crit)"/>' +
        '<rect x="325" y="34" width="54" height="44" fill="var(--violet)" opacity="0.30" stroke="var(--violet)"/>' +
        '<rect x="379" y="34" width="18" height="44" fill="var(--line)" opacity="0.40" stroke="var(--line)"/>' +
        '<rect x="397" y="34" width="156" height="44" fill="var(--warn)" opacity="0.30" stroke="var(--warn)"/>' +
        '<rect x="553" y="34" width="89" height="44" fill="var(--warn)" opacity="0.18" stroke="var(--warn)"/>' +
        '<rect x="642" y="34" width="80" height="44" fill="var(--good)" opacity="0.30" stroke="var(--good)"/>' +
        '<rect x="722" y="34" width="26" height="44" fill="var(--line)" opacity="0.40" stroke="var(--line)"/>' +
        '<text x="168" y="62" class="s-label" text-anchor="middle">endpoint 700</text>' +
        '<text x="352" y="62" class="s-sub" text-anchor="middle">ASR</text>' +
        '<text x="475" y="62" class="s-sub" text-anchor="middle">LLM TTFT 350</text>' +
        '<text x="597" y="62" class="s-sub" text-anchor="middle">+200</text>' +
        '<text x="682" y="62" class="s-sub" text-anchor="middle">TTS</text>' +
        '<line x1="12" y1="88" x2="325" y2="88" stroke="var(--crit)" stroke-width="2"/>' +
        '<text x="168" y="106" class="s-mono" text-anchor="middle" fill="var(--crit)">42.4% \u2014 one constant</text>' +
        '<line x1="397" y1="88" x2="642" y2="88" stroke="var(--warn)" stroke-width="2"/>' +
        '<text x="519" y="106" class="s-mono" text-anchor="middle" fill="var(--warn)">33.3% \u2014 the model</text>' +
        '<text x="12" y="146" class="s-label">WHERE THE EFFORT USUALLY GOES</text>' +
        '<rect x="12" y="158" width="245" height="26" rx="4" fill="var(--warn)" opacity="0.15" stroke="var(--warn)"/>' +
        '<text x="134" y="176" class="s-sub" text-anchor="middle">months: faster model, 10.6%</text>' +
        '<rect x="267" y="158" width="245" height="26" rx="4" fill="var(--line)" opacity="0.12" stroke="var(--line)" stroke-dasharray="3 3"/>' +
        '<text x="389" y="176" class="s-sub" text-anchor="middle">weeks: distillation, quantisation</text>' +
        '<rect x="522" y="158" width="226" height="26" rx="4" fill="var(--crit)" opacity="0.15" stroke="var(--crit)" stroke-dasharray="3 3"/>' +
        '<text x="635" y="176" class="s-sub" text-anchor="middle">nobody: VAD_SILENCE_MS = 700</text>' +
        '<text x="12" y="212" class="s-label">SENSITIVITY \u2014 HALVING EACH STAGE</text>' +
        '<text x="12" y="234" class="s-mono">endpoint  \u2192 1300 ms  (21.2% better)      LLM TTFT  \u2192 1475 ms  (10.6%)</text>' +
        '<text x="12" y="252" class="s-mono">clause    \u2192 1550 ms  ( 6.1%)            TTS       \u2192 1560 ms  ( 5.5%)</text>' +
        '<text x="12" y="270" class="s-mono">ASR       \u2192 1590 ms  ( 3.6%)            playout   \u2192 1620 ms  ( 1.8%)</text>' +
        '<text x="12" y="290" class="s-mono">network   \u2192 1630 ms  ( 1.2%)</text>' +
        '</svg>' },

    { t: "h2", n: "02", id: "sensitivity", text: "The sensitivity analysis",
      sub: "What halving each stage is actually worth" },

    { t: "p", text: "A budget tells you where the time is. A sensitivity analysis tells you what an improvement is worth, which is the question that should drive a roadmap. Halving a stage is a rough but useful unit of effort: it is roughly what a serious engineering push on one component achieves." },

    { t: "code", lang: "python", title: "Halving each stage in turn",
      code: 'total = 1650\nfor n, ms, _w in CASCADED:\n    saved = ms / 2.0\n    print("halve %-28s saves %5.0f ms -> %6.0f ms  (%4.1f%% better)"\n          % (n, saved, total - saved, 100.0 * saved / total))\n\nllm = CASCADED[3][1] + CASCADED[4][1]\nprint("\\nthe LLM is %.1f%% of the budget; endpointing is %.1f%%"\n      % (100.0 * llm / total, 100.0 * CASCADED[0][1] / total))',
      out: 'halve endpoint silence             saves   350 ms ->   1300 ms  (21.2% better)\nhalve ASR finalisation             saves    60 ms ->   1590 ms  ( 3.6% better)\nhalve network to LLM               saves    20 ms ->   1630 ms  ( 1.2% better)\nhalve LLM time to first token      saves   175 ms ->   1475 ms  (10.6% better)\nhalve LLM first clause             saves   100 ms ->   1550 ms  ( 6.1% better)\nhalve TTS first chunk              saves    90 ms ->   1560 ms  ( 5.5% better)\nhalve playout buffer               saves    30 ms ->   1620 ms  ( 1.8% better)\n\nthe LLM is 33.3% of the budget; endpointing is 42.4%',
      hl: [1, 10],
      caption: "The best single change is worth 21.2% and it is not the model." },

    { t: "callout", kind: "insight", title: "The misallocation is systematic, not random",
      body: [
        { t: "p", text: "There is a reason effort lands on the model. The model is the interesting part, it is where the team's expertise is, it is what vendors publish benchmarks about, and improving it is legible work with a clear owner. Endpointing is a constant in a config file that was set by whoever wrote the prototype, usually by copying a quickstart, and it has no owner at all." },
        { t: "p", text: "So the largest term in the budget is simultaneously the least examined. That combination \u2014 biggest and least owned \u2014 is worth looking for in any system, not just voice ones. 10.13 found the same shape in cost attribution." }
      ] },

    { t: "callout", kind: "warn", title: "Halving endpointing is not free, unlike the rest",
      body: [
        { t: "p", text: "Every other row in that table is a pure engineering win: a faster ASR tier, a nearer region, a smaller model, a shallower buffer. Halving the endpointing threshold to 350 ms is **not** \u2014 it changes behaviour. The interruption rate rises from 6.1% to 26.8%, which is an agent that talks over its user more than one turn in four." },
        { t: "p", text: "That is why 13.5 exists as its own lesson, and why the answer is a semantic endpointer rather than a smaller number. The sensitivity table is measuring the right thing and silently omitting the cost column for exactly one row." }
      ] },

    { t: "h2", n: "03", id: "speech", text: "The same budget, speech-native",
      sub: "Four stages instead of seven" },

    { t: "code", lang: "python", title: "What removing two stages buys",
      code: 'SPEECH2SPEECH = [\n    ("endpoint silence",          500, "the model hears prosody, so it can commit sooner"),\n    ("network",                    40, "one round trip"),\n    ("model time to first audio", 320, "no ASR text, no TTS stage"),\n    ("playout buffer",             60, "jitter buffer"),\n]\n\nnative = sum(ms for _n, ms, _w in SPEECH2SPEECH)\nprint("speech-native: %d ms" % native)\nprint("difference: %d ms, and %d of that is the endpoint threshold alone"\n      % (1650 - native, 700 - 500))',
      out: 'speech-native: 920 ms\ndifference: 730 ms, and 200 of that is the endpoint threshold alone',
      caption: "920 ms, inside the responsive band. 200 of the 730 is endpointing, which a cascade can also fix." },

    { t: "p", text: "Worth sitting with: the speech-native pipeline is the only one of the two that lands inside the responsive band from 13.1. The cascade at 1,650 ms is in the band where users repeat themselves. That is not a marginal difference in a metric, it is a different product \u2014 which is exactly why 13.2 insisted on pricing it rather than arguing about it." },

    { t: "h2", n: "04", id: "targets", text: "From sensitivity to a plan",
      sub: "The question the sensitivity table cannot answer" },

    { t: "p", text: "A sensitivity analysis ranks changes individually. It does not tell you how to reach a target, because targets need combinations and combinations have costs that do not add the way milliseconds do. Two optimisations might save 300 ms between them, cost ten engineering weeks, and raise the per-call price \u2014 and a third might save less and pay for itself." },

    { t: "p", text: "So the useful artefact is not the ranking but a small search: given a set of candidate optimisations with their millisecond savings, engineering cost and per-call cost delta, what is the cheapest subset that reaches 1,300 ms? 1,100? 1,000? And at what point does no subset reach the target at all \u2014 which is the architecture's floor, and the honest answer to \u201ccan we get to 800 milliseconds?\u201d" },

    { t: "exercise", kind: "build", title: "Find the cheapest route to each latency target",
      difficulty: "advanced", minutes: 28,
      body: "Given seven candidate optimisations with their savings, engineering weeks and per-call cost deltas, search for the cheapest subset that reaches each of five latency targets. Report the target that cannot be reached at all. Then say what the table is hiding.",
      requirements: [
        "Enumerate subsets and find, for each target, the one with fewest engineering weeks (break ties on $/call)",
        "Report targets of 1,300, 1,100, 1,000, 900 and 800 ms",
        "State the floor: the best achievable latency with every optimisation applied",
        "Identify which optimisation appears in every solution and explain why",
        "Name the column the table does not have, and which rows it would change"
      ],
      hint: "Search by increasing subset size so the first solution found is the smallest. The floor is just the sum of all savings subtracted from 1,650 \u2014 and compare it to the speech-native 920 ms.",
      solution: { lang: "python", title: "x1303.py \u2014 cheapest subset per target",
        code: 'import itertools\n\nBASE = 1650\n# (name, ms saved, engineering weeks, $/call delta, note)\nOPTS = [\n    ("semantic endpointer",         400, 4,  0.0000, "a small model beside the VAD"),\n    ("speculative prefill",         175, 2,  0.0021, "prefill on the partial, discard on continue"),\n    ("stream TTS from first clause",  90, 1,  0.0000, "already have the clause; just send it"),\n    ("shrink the jitter buffer",      30, 1,  0.0000, "costs robustness on bad networks"),\n    ("faster ASR tier",               60, 1,  0.0090, "a per-minute price increase"),\n    ("colocate LLM region",           20, 3,  0.0000, "one fewer continent"),\n    ("smaller/distilled LLM",        140, 6, -0.0120, "cheaper per token, and worse"),\n]\n\ndef summarise(c):\n    return (sum(o[1] for o in c), sum(o[2] for o in c), sum(o[3] for o in c))\n\nfor target in (1300, 1100, 1000, 900, 800):\n    best = None\n    for r in range(0, len(OPTS) + 1):\n        for combo in itertools.combinations(OPTS, r):\n            ms, wk, d = summarise(combo)\n            if BASE - ms <= target:\n                if best is None or (wk, d) < (best[1], best[2]):\n                    best = (ms, wk, d, combo)\n        if best is not None:\n            break\n    if best is None:\n        print("%-8s NOT REACHABLE with any subset" % ("%d ms" % target))\n        continue\n    ms, wk, d, combo = best\n    print("%-8s %-74s %6d %6d %9s"\n          % ("%d ms" % target, " + ".join(o[0] for o in combo)[:74],\n             BASE - ms, wk, "%+.4f" % d))',
        out: '==============================================================================================\nReaching a latency target: which combination, and what does it cost?\n==============================================================================================\nbaseline time to first audio: 1650 ms\n\noptimisation                          ms   weeks      $/call  note\nsemantic endpointer                  400       4     +0.0000  ships a small model beside the VAD\nspeculative prefill                  175       2     +0.0021  prefill on the partial transcript, discard on continue\nstream TTS from first clause          90       1     +0.0000  already have the clause; just send it\nshrink the jitter buffer              30       1     +0.0000  costs robustness on bad networks\nfaster ASR tier                       60       1     +0.0090  a per-minute price increase\ncolocate LLM region                   20       3     +0.0000  one fewer continent\nsmaller/distilled LLM                140       6     -0.0120  cheaper per token, and worse\n\ntarget   cheapest set that reaches it (fewest weeks)                                    ms  weeks    $/call\n1300 ms  semantic endpointer                                                          1250      4   +0.0000\n1100 ms  semantic endpointer + speculative prefill                                    1075      6   +0.0021\n1000 ms  semantic endpointer + speculative prefill + stream TTS from first clause      985      7   +0.0021\n900 ms   semantic endpointer + speculative prefill + stream TTS from first clause +    845     13   -0.0099\n           ... smaller/distilled LLM\n800 ms   semantic endpointer + speculative prefill + stream TTS from first clause +    785     14   -0.0009\n           ... faster ASR tier + smaller/distilled LLM\n\nevery optimisation at once: 915 ms saved -> 735 ms, 18 weeks, $-0.0009/call\n\nobservations the table forces:\n  1. 1300 ms needs ONE change, and it is the endpointer -- no single other\n     optimisation on the list gets there, because none is worth 350 ms.\n  2. every target down to 735 ms includes the endpointer. it is in every\n     solution because it is the largest single term in the budget.\n  3. below ~735 ms the cascade is exhausted: that is the floor this\n     architecture has, and it is where the speech-native question becomes real.\n  4. the \'smaller LLM\' row is the only one that SAVES money per call, and it is\n     also the most expensive to build (6 weeks) and the only one that costs you\n     answer quality -- the column this table does not have. the two targets that\n     need it, 900 and 800 ms, are exactly the two you cannot honestly promise\n     from a latency table alone. never read this table without an accuracy column.',
        notes: [
          { t: "p", text: "The endpointer is in every single solution, including the one for the loosest target. 1,300 ms needs exactly one change and it has to be that one, because no other candidate on the list is worth the required 350 ms on its own." },
          { t: "p", text: "The floor is 735 ms with all seven applied, 18 weeks and a net saving of $0.0009 a call. That is below the speech-native 920 ms \u2014 so a fully optimised cascade is faster than an unoptimised speech-native pipeline, which is not the ordering the architecture comparison implies." },
          { t: "p", text: "The 900 and 800 ms targets both require the distilled model, and that is the row with the hidden cost. It is the only candidate that reduces per-call cost, it is the most expensive to build at 6 weeks, and it is the only one that trades away answer quality. The latency table has no accuracy column, so those two targets are exactly the two that cannot honestly be promised from this table alone." },
          { t: "p", text: "Three of the seven cost nothing per call and nothing much to build: streaming TTS from the first clause (1 week), shrinking the jitter buffer (1 week) and colocating the region (3 weeks) together save 140 ms. Any team at 1,650 ms has at least 140 ms sitting there unclaimed." },
          { t: "p", text: "A caveat on the jitter buffer row: 30 ms of latency is the premium you pay for not having gaps mid-word on a bad network. Taking it is reasonable on a wired desk phone and a bad idea on mobile, so it is the one row whose value depends on where your users are rather than on your code." }
        ] } },

    { t: "callout", kind: "mental", title: "Mental model: measure from end-of-speech, always",
      body: [
        { t: "p", text: "Every figure in this lesson is measured from the moment the user stopped speaking. The most common instrumentation error in voice is to start the clock when the endpointer fires instead \u2014 which puts the largest term in the budget outside the metric entirely, and produces a dashboard that is green while the agent is at 1,650 ms." },
        { t: "p", text: "If you only take one practice from this lesson, take that one: define time to first audio from end-of-speech, and make the endpointing span a visible child of it. 13.13 builds exactly that span tree." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: \u201ccan we get to 800 milliseconds?\u201d",
      body: [
        { t: "p", text: "Product asks for 800 ms, down from a measured 1,650. The honest answer has three parts and takes two minutes to deliver." },
        { t: "p", text: "First: yes, on paper \u2014 785 ms with five of the seven optimisations, 14 weeks. Second: that route requires a distilled model, which is the one change that costs answer quality, and the latency table has no accuracy column, so the correct answer to \u201cwill it still be as good?\u201d is \u201cI do not know yet, and finding out is part of the 14 weeks.\u201d Third, and this is the part worth volunteering: 1,300 ms is four weeks and one change, and 1,000 ms is seven weeks and three changes with no quality risk at all. 1,000 ms is inside the responsive band that actually matters." },
        { t: "p", text: "The underlying point is that 800 was probably not a requirement, it was a guess at where responsiveness lives. 13.1 puts the boundary at 800 for a turn to feel responsive, so the guess was reasonable \u2014 but 1,000 ms with no accuracy risk, delivered in half the time, is very likely the better product decision, and nobody can make that decision without the table." }
      ] }
  ],

  takeaways: [
    "**Time to first audio is the metric**, measured from the moment the user stops speaking \u2014 not total response time, not model latency.",
    "**The cascaded budget is 1,650 ms**: endpoint 700, ASR 120, network 40, LLM TTFT 350, first clause 200, TTS 180, playout 60.",
    "**Endpointing is 42.4% of the budget and the LLM is 33.3%** \u2014 the largest term is the one nobody owns.",
    "**Halving the best single stage buys 21.2%, and it is endpointing**; halving the model's TTFT buys 10.6%.",
    "**The misallocation is systematic**: the model is legible, owned and benchmarked; the silence threshold is a copied constant with no owner.",
    "**Halving the threshold is the one row with a hidden cost** \u2014 350 ms raises interruptions from 6.1% to 26.8%, which is why 13.5 builds a semantic endpointer instead.",
    "**Speech-native is 920 ms**, the only one of the two inside the responsive band, and 200 of its 730 ms lead is endpointing.",
    "**A sensitivity ranking is not a plan**: targets need subsets, and subsets have engineering and per-call costs that do not add like milliseconds.",
    "**The endpointer appears in every solution at every target**, because no other candidate is worth 350 ms alone.",
    "**The cascade's floor is 735 ms** with all seven optimisations \u2014 below the unoptimised speech-native 920 ms.",
    "**The 900 and 800 ms targets both need the distilled model**, the only row that trades answer quality, so they are the two that cannot be promised from a latency table.",
    "**Never read a latency table without an accuracy column**, and instrument from end-of-speech or the biggest term falls outside your metric."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "In the 1,650 ms cascaded budget, which stage is the largest and what share is it?",
        options: [
          "LLM time to first token, at 350 ms and 21.2%",
          "The endpointing silence threshold, at 700 ms and 42.4%",
          "The combined LLM stages, at 550 ms and 33.3%",
          "TTS first chunk, at 180 ms, because it blocks all audio output"
        ],
        answer: 1,
        why: "The 700 ms silence wait is 42.4% of the turn, larger than both LLM stages combined at 33.3%. The significance is where effort goes: the model is legible, owned, benchmarked and interesting, so it gets months of attention for a 10.6% win, while the threshold is a constant copied from a quickstart with no owner at all. Biggest term, least examined \u2014 a pattern worth looking for outside voice too." },

      { stem: "The sensitivity table shows halving each stage. Which row does it quietly misrepresent?",
        options: [
          "The network row, because round trips cannot be halved by engineering",
          "The playout buffer, because its latency is not real",
          "The endpointing row, because halving the threshold changes behaviour \u2014 interruptions rise from 6.1% to 26.8%",
          "The TTS row, because synthesis time depends on text length"
        ],
        answer: 2,
        why: "Every other row is a pure engineering win \u2014 a faster tier, a nearer region, a shallower buffer \u2014 with no behavioural consequence. Cutting the silence threshold to 350 ms makes the agent talk over its user in more than one turn in four, so the table is showing a benefit with the cost column omitted for exactly one row. The fix is a semantic endpointer, which gets the latency without the interruption rate, rather than a smaller constant." },

      { stem: "With all seven candidate optimisations applied, the cascade reaches 735 ms. Why is that figure interesting?",
        options: [
          "It is the theoretical minimum for any voice architecture",
          "It is below the unoptimised speech-native pipeline's 920 ms, inverting the architecture comparison",
          "It shows the optimisations are redundant, since their savings overlap",
          "It is inside the under-300 ms band where the agent is indistinguishable from a person"
        ],
        answer: 1,
        why: "The architecture comparison in 13.2 contrasts 1,650 with 920 and makes speech-native look structurally faster. But a fully optimised cascade at 735 ms beats an unoptimised speech-native pipeline, so the comparison was partly between two architectures and partly between a tuned system and an untuned one. That is the same ordering error that made the speech-native premium look 2.2x cheaper than it is." },

      { stem: "Product asks for 800 ms. The search says 785 ms is reachable in 14 weeks with five changes. What should you add to that answer?",
        options: [
          "That the estimate should be padded, since latency work usually overruns",
          "That 800 ms is unnecessary because users cannot perceive differences below one second",
          "That the route requires a distilled model, so there is an unmeasured accuracy cost \u2014 and that 1,000 ms is 7 weeks with no quality risk",
          "That the jitter buffer reduction makes the result unreliable on mobile networks"
        ],
        answer: 2,
        why: "Both halves matter. The 900 and 800 ms targets are the only ones requiring the distilled model, which is the single candidate that trades answer quality, and a latency table has no accuracy column \u2014 so the schedule is 14 weeks plus whatever it takes to find out. Offering 1,000 ms at 7 weeks with no quality risk reframes the request usefully, since 1,000 is already inside the responsive band that 800 was a guess at." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The latency budget",
    questions: [
      { level: "advanced",
        q: "Where does the time go in a voice turn, and where would you optimise first?",
        strong: "A strong answer gives the budget by stage and names endpointing.",
        answer: [
          { t: "p", text: "Measured from the moment the user stops speaking, a standard cascade is about 1,650 milliseconds to first audio. The breakdown is 700 for the endpointing silence, 120 for ASR finalisation, 40 for the network, 350 for the model's time to first token, 200 more for enough tokens to make a clause worth speaking, 180 for the first TTS chunk and 60 for the jitter buffer." },
          { t: "p", text: "I would optimise endpointing first, and the reason is arithmetic rather than preference. Endpointing is 42.4% of that budget and both model stages together are 33.3%. Halving the silence threshold is worth 21.2% of the turn; halving the model's time to first token is worth 10.6%. So the largest available win is in the stage that almost never gets looked at, because it is a constant in a config file rather than a component with an owner." },
          { t: "p", text: "I would be careful about how I did it, though. Every other row in that sensitivity table is a pure engineering win, and endpointing is not \u2014 dropping the threshold from 700 to 350 milliseconds takes the rate at which the agent talks over its user from 6.1% of turns to 26.8%. So the move is not a smaller number, it is a semantic endpointer that decides on syntax and prosody rather than on silence duration, which gets roughly 300 milliseconds of latency at the interruption rate of a 900 millisecond threshold." },
          { t: "p", text: "And before any of that I would check the instrumentation, because the most common failure here is a metric that starts when the endpointer fires rather than when the user stopped talking. That puts the single largest term outside the number on the dashboard, and the dashboard reads green at 1,650 milliseconds." }
        ] },

      { level: "advanced",
        q: "Product wants 800 ms from a measured 1,650. What do you tell them?",
        strong: "A strong answer offers a cheaper target and names the quality risk.",
        answer: [
          { t: "p", text: "I would bring a table rather than a yes or no, because the useful answer is a menu. When I searched the combinations: 1,300 milliseconds is one change and four weeks. 1,000 is three changes and seven weeks. 785 is five changes and fourteen weeks. And the floor for this architecture, with every optimisation applied, is 735 \u2014 so 800 is reachable but close to the limit of what a cascade can do." },
          { t: "p", text: "Then the caveat, which is the part I would make sure lands. The 900 and 800 millisecond routes are the only ones that require a distilled model, and that is the one change which trades away answer quality. A latency table has no accuracy column, so the honest schedule is fourteen weeks plus however long it takes to establish whether the smaller model is still good enough \u2014 and if it is not, the 800 is unreachable and we have spent the quarter." },
          { t: "p", text: "So I would counter-propose 1,000 milliseconds: seven weeks, three changes, no per-call cost increase worth mentioning, and no accuracy risk at all. The reason that is a real counter-proposal rather than a negotiation is that 800 was almost certainly a guess at where responsiveness starts, and the perception research puts the boundary at about 800 for a turn to feel responsive with the trouble starting around 1,200. 1,000 is comfortably inside the band that matters, delivered in half the time." },
          { t: "p", text: "One more thing I would volunteer unprompted: three of the seven optimisations cost nothing per call and very little to build \u2014 streaming TTS from the first clause, trimming the jitter buffer, colocating the model region \u2014 and together they are 140 milliseconds. Any team sitting at 1,650 has that much unclaimed, so I would ship those while the larger conversation happens." }
        ] },

      { level: "core",
        q: "Why do teams systematically optimise the wrong stage?",
        strong: "A strong answer explains the incentive, not just the error.",
        answer: [
          { t: "p", text: "Because the stages differ in how legible they are, not in how large they are. The model is the interesting component, it is where the team's expertise sits, vendors publish benchmarks about it, and improving it is well-defined work with a clear owner and a visible result. Every incentive points at it." },
          { t: "p", text: "The endpointing threshold is a constant in a config file, usually copied from a quickstart by whoever wrote the prototype, and it has no owner. Nobody's roadmap contains \u2018revisit VAD_SILENCE_MS\u2019. So the largest term in the budget is simultaneously the least examined one, and that is a structural outcome rather than a mistake any individual made." },
          { t: "p", text: "The generalisable version is to go looking for the combination of biggest-and-least-owned in any system, because it is where the cheap wins accumulate. I have seen the same shape in cost attribution, where the dominant driver turned out to be a retry policy nobody had revisited rather than any model choice." },
          { t: "p", text: "There is also a measurement reason that reinforces it. If time to first audio is instrumented from the endpointer firing, then endpointing is not in the metric at all, and no amount of staring at the dashboard will ever point at it. The data says the model is the slowest thing because the data was defined to exclude the alternative." }
        ] }
    ]
  }
});
