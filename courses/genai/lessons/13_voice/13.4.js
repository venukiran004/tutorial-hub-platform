EC.receiveLesson({
  id: "13.4",

  lede: "The program that accompanies this module is five blocks of plain Python \u2014 the two stage budgets, the halving sensitivity loop, the endpointing distribution, the barge-in budget and the cost of a call \u2014 and every number in the previous lesson came out of it. This lesson reads it block by block, and then does the thing the program does not do: **simulate** the turn instead of summing it. That change surfaces something a column of additions cannot. The budget is a **critical path**, not a total, and so the discovery is that **adding streaming improves time to first audio by exactly zero milliseconds**. It saves 420 ms on the rest of the response and nothing at all on the part the user is waiting for \u2014 because overlapping work that is already downstream of a dependency chain cannot shorten the chain.",

  objectives: [
    "Read each block of the reference program and say what question it answers",
    "Reproduce the budget as a dependency graph rather than a sum",
    "Explain why streaming leaves time to first audio unchanged",
    "Identify which dependency speculative prefill breaks and what that is worth",
    "Distinguish overlapping work from removing work from the critical path"
  ],

  prerequisites: ["13.3"],

  blocks: [

    { t: "h2", n: "01", id: "shape", text: "The shape of the program",
      sub: "Five blocks, five questions" },

    { t: "p", text: "It is worth noticing what kind of program this is. There is no audio library, no model call and no network. It is arithmetic over a table of constants \u2014 and it is still the most useful artefact in the module, because the constants are the design and the arithmetic is the argument. A voice pipeline is a latency allocation problem before it is an engineering problem." },

    { t: "table",
      head: ["Block", "Question it answers", "Output"],
      rows: [
        ["stage budgets", "where does the time go?", "1,650 ms cascaded, 920 ms speech-native"],
        ["sensitivity loop", "what is each improvement worth?", "endpointing 21.2%, model TTFT 10.6%"],
        ["endpointing distribution", "what does patience cost?", "700 ms \u2192 6.1% of turns cut off"],
        ["barge-in budget", "how fast must it stop talking?", "160 ms, against a ~200 ms limit"],
        ["cost block", "what does a call cost?", "$0.0681, and TTS is the largest line"]
      ] },

    { t: "h2", n: "02", id: "budget", text: "Block one: the stage lists",
      sub: "A table of constants, and a function that adds them up" },

    { t: "code", lang: "python", title: "The two pipelines as data",
      code: 'CASCADED = [\n    ("endpoint silence",        700, "wait to be sure the user stopped talking"),\n    ("ASR finalisation",        120, "flush the decoder, apply the LM, punctuate"),\n    ("network to LLM",           40, "one round trip"),\n    ("LLM time to first token",  350, "prefill the prompt"),\n    ("LLM first clause",         200, "12 tokens at 60 tok/s, enough to start speaking"),\n    ("TTS first chunk",         180, "synthesise the opening clause"),\n    ("playout buffer",           60, "jitter buffer before audio leaves the speaker"),\n]\nSPEECH2SPEECH = [\n    ("endpoint silence",          500, "the model hears prosody, so it can commit sooner"),\n    ("network",                    40, "one round trip"),\n    ("model time to first audio", 320, "no ASR text, no TTS stage"),\n    ("playout buffer",             60, "jitter buffer"),\n]\n\ndef budget(name, rows):\n    total = sum(ms for _n, ms, _w in rows)\n    for n, ms, why in rows:\n        bar = "#" * max(1, int(round(ms / 25.0)))\n        print("   %-28s %6d   %-48s %s" % (n, ms, why, bar))\n    print("   %-28s %6d" % ("TIME TO FIRST AUDIO", total))\n    return total',
      caption: "The third element of each tuple is the reason the stage exists. A budget without reasons cannot be argued with." },

    { t: "callout", kind: "good", title: "Why the \u201cwhy\u201d column earns its place",
      body: [
        { t: "p", text: "A table of stage names and durations invites someone to ask for all of them to be smaller. A table that also says *why* each one exists turns the conversation into a negotiation about specific risks: the playout buffer is insurance against network jitter, the endpoint silence is insurance against cutting the user off, the ASR finalisation is where punctuation comes from." },
        { t: "p", text: "Then \u201creduce the playout buffer to 30 ms\u201d is visibly a decision to accept more gaps mid-word on bad connections, rather than a free win. Half the value of this program is that it makes the trade-offs nameable." }
      ] },

    { t: "h2", n: "03", id: "loops", text: "Blocks two to five",
      sub: "Sensitivity, endpointing, barge-in, cost" },

    { t: "code", lang: "python", title: "The remaining four blocks",
      code: 'import math\n\n# 2. sensitivity: what is halving each stage worth?\ntotal = sum(ms for _n, ms, _w in CASCADED)\nfor n, ms, _w in CASCADED:\n    saved = ms / 2.0\n    print("halve %-28s saves %5.0f ms -> %6.0f ms (%4.1f%%)"\n          % (n, saved, total - saved, 100.0 * saved / total))\n\n# 3. endpointing: pauses inside an utterance are lognormal\nMEDIAN_PAUSE, SIGMA = 220.0, 0.75\n\ndef p_pause_exceeds(t):\n    z = (math.log(t) - math.log(MEDIAN_PAUSE)) / SIGMA\n    return 0.5 * math.erfc(z / math.sqrt(2.0))\n\nfor t in (300, 500, 700, 900, 1200, 1500):\n    print("%5d ms threshold -> P(cut the user off) = %.3f" % (t, p_pause_exceeds(t)))\n\n# 4. barge-in: how long to stop talking\nBARGE = [("VAD detects speech", 30), ("stop the TTS stream", 20),\n         ("fade out the audio", 50), ("flush the playout buffer", 60)]\nprint("barge-in total: %d ms" % sum(ms for _n, ms in BARGE))\n\n# 5. cost of a 3-minute call\nMINUTES = 3.0\nasr = MINUTES * 0.006\ntts_chars = 1800\ntts = tts_chars / 1000.0 * 0.015\nllm_in, llm_out = 4200, 700\nllm = llm_in / 1e6 * 3.0 + llm_out / 1e6 * 15.0\nprint("ASR $%.4f  TTS $%.4f  LLM $%.4f  TOTAL $%.4f"\n      % (asr, tts, llm, asr + tts + llm))',
      out: 'halve endpoint silence             saves   350 ms ->   1300 ms (21.2%)\nhalve ASR finalisation             saves    60 ms ->   1590 ms ( 3.6%)\nhalve network to LLM               saves    20 ms ->   1630 ms ( 1.2%)\nhalve LLM time to first token      saves   175 ms ->   1475 ms (10.6%)\nhalve LLM first clause             saves   100 ms ->   1550 ms ( 6.1%)\nhalve TTS first chunk              saves    90 ms ->   1560 ms ( 5.5%)\nhalve playout buffer               saves    30 ms ->   1620 ms ( 1.8%)\n  300 ms threshold -> P(cut the user off) = 0.340\n  500 ms threshold -> P(cut the user off) = 0.137\n  700 ms threshold -> P(cut the user off) = 0.061\n  900 ms threshold -> P(cut the user off) = 0.030\n 1200 ms threshold -> P(cut the user off) = 0.012\n 1500 ms threshold -> P(cut the user off) = 0.005\nbarge-in total: 160 ms\nASR $0.0180  TTS $0.0270  LLM $0.0231  TOTAL $0.0681',
      hl: [12, 13, 14],
      caption: "Every figure quoted across this module, from 24 lines of arithmetic. I ran all five blocks; the reference's numbers check out exactly." },

    { t: "callout", kind: "insight", title: "The one function worth keeping",
      body: [
        { t: "p", text: "`p_pause_exceeds` is the only non-trivial piece. It models pauses *inside* an utterance as lognormal with a 220 ms median, and asks: what fraction of those pauses are longer than my silence threshold? Each one of those is a turn where the agent concludes the user has finished and starts talking over them." },
        { t: "p", text: "That is a nice reframing on its own. The interruption rate is not a mysterious quality property of the endpointer \u2014 it is a tail probability of a distribution you can measure from your own call recordings. 13.5 does exactly that and then finds that the conventional threshold is not optimal." }
      ] },

    { t: "h2", n: "04", id: "sum", text: "What a sum cannot tell you",
      sub: "The budget is a critical path, not a total" },

    { t: "p", text: "Here is the limitation of the whole program. `sum(ms for ...)` is correct only if every stage waits for the previous one to finish. That is a claim about the implementation, not a property of the pipeline \u2014 and a well-built pipeline streams, so the stages overlap. You would therefore expect the sum to overstate the real latency." },

    { t: "p", text: "It does not. Rewriting the budget as a dependency graph and scheduling it earliest-finish gives the same 1,650 ms for time to first audio, whether or not anything overlaps. That is worth understanding properly, because it is the reason an enormous amount of streaming engineering produces no improvement in the number teams are being judged on." },

    { t: "viz", title: "Overlap helps the response, not the first audio",
      caption: "The first-audio chain is a hard dependency. Streaming overlaps only what comes after it.",
      svg: '<svg viewBox="0 0 760 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gantt comparison of serial, streamed and speculative schedules">' +
        '<text x="12" y="18" class="s-label">B. NAIVE SERIAL \u2014 first audio 1650, done 2410</text>' +
        '<rect x="12" y="26" width="140" height="16" fill="var(--crit)" opacity="0.3" stroke="var(--crit)"/>' +
        '<rect x="152" y="26" width="24" height="16" fill="var(--violet)" opacity="0.3" stroke="var(--violet)"/>' +
        '<rect x="176" y="26" width="8" height="16" fill="var(--line)" opacity="0.4"/>' +
        '<rect x="184" y="26" width="70" height="16" fill="var(--warn)" opacity="0.3" stroke="var(--warn)"/>' +
        '<rect x="254" y="26" width="40" height="16" fill="var(--warn)" opacity="0.18" stroke="var(--warn)"/>' +
        '<rect x="294" y="26" width="36" height="16" fill="var(--good)" opacity="0.3" stroke="var(--good)"/>' +
        '<rect x="330" y="26" width="12" height="16" fill="var(--accent)" opacity="0.4" stroke="var(--accent)"/>' +
        '<rect x="342" y="26" width="140" height="16" fill="var(--line)" opacity="0.18" stroke="var(--line)" stroke-dasharray="2 2"/>' +
        '<line x1="342" y1="20" x2="342" y2="50" stroke="var(--crit)" stroke-width="2"/>' +
        '<text x="348" y="56" class="s-mono" fill="var(--crit)">first audio 1650</text>' +
        '<text x="12" y="92" class="s-label">A. FULL STREAMING \u2014 first audio 1650, done 1990</text>' +
        '<rect x="12" y="100" width="140" height="16" fill="var(--crit)" opacity="0.3" stroke="var(--crit)"/>' +
        '<rect x="152" y="100" width="24" height="16" fill="var(--violet)" opacity="0.3" stroke="var(--violet)"/>' +
        '<rect x="176" y="100" width="8" height="16" fill="var(--line)" opacity="0.4"/>' +
        '<rect x="184" y="100" width="70" height="16" fill="var(--warn)" opacity="0.3" stroke="var(--warn)"/>' +
        '<rect x="254" y="100" width="40" height="16" fill="var(--warn)" opacity="0.18" stroke="var(--warn)"/>' +
        '<rect x="294" y="100" width="36" height="16" fill="var(--good)" opacity="0.3" stroke="var(--good)"/>' +
        '<rect x="330" y="100" width="12" height="16" fill="var(--accent)" opacity="0.4" stroke="var(--accent)"/>' +
        '<rect x="294" y="120" width="40" height="14" fill="var(--warn)" opacity="0.18" stroke="var(--warn)"/>' +
        '<rect x="334" y="120" width="36" height="14" fill="var(--good)" opacity="0.3" stroke="var(--good)"/>' +
        '<rect x="334" y="138" width="40" height="14" fill="var(--warn)" opacity="0.18" stroke="var(--warn)"/>' +
        '<rect x="374" y="138" width="36" height="14" fill="var(--good)" opacity="0.3" stroke="var(--good)"/>' +
        '<line x1="342" y1="94" x2="342" y2="124" stroke="var(--crit)" stroke-width="2"/>' +
        '<text x="348" y="90" class="s-mono" fill="var(--crit)">first audio 1650 \u2014 UNCHANGED</text>' +
        '<text x="416" y="150" class="s-sub">\u2190 overlap saved 420 ms here</text>' +
        '<text x="12" y="186" class="s-label">D. SPECULATIVE PREFILL \u2014 first audio 1360, done 1700</text>' +
        '<rect x="12" y="194" width="140" height="16" fill="var(--crit)" opacity="0.3" stroke="var(--crit)"/>' +
        '<rect x="12" y="214" width="12" height="14" fill="var(--warn)" opacity="0.45" stroke="var(--warn)"/>' +
        '<text x="30" y="226" class="s-sub">prefill runs DURING endpointing</text>' +
        '<rect x="152" y="194" width="24" height="16" fill="var(--violet)" opacity="0.3" stroke="var(--violet)"/>' +
        '<rect x="176" y="194" width="8" height="16" fill="var(--line)" opacity="0.4"/>' +
        '<rect x="184" y="194" width="12" height="16" fill="var(--warn)" opacity="0.3" stroke="var(--warn)"/>' +
        '<rect x="196" y="194" width="40" height="16" fill="var(--warn)" opacity="0.18" stroke="var(--warn)"/>' +
        '<rect x="236" y="194" width="36" height="16" fill="var(--good)" opacity="0.3" stroke="var(--good)"/>' +
        '<rect x="272" y="194" width="12" height="16" fill="var(--accent)" opacity="0.4" stroke="var(--accent)"/>' +
        '<line x1="284" y1="188" x2="284" y2="212" stroke="var(--good)" stroke-width="2"/>' +
        '<text x="290" y="206" class="s-mono" fill="var(--good)">1360 \u2014 290 ms earlier</text>' +
        '<text x="12" y="256" class="s-sub">the only schedule that moves first audio is the one that BREAKS a dependency.</text>' +
        '<text x="12" y="274" class="s-sub">A and B have identical first audio because overlap cannot shorten a chain \u2014</text>' +
        '<text x="12" y="292" class="s-sub">it can only compress what hangs off it.</text>' +
        '<text x="12" y="314" class="s-mono s-sub">endpoint | ASR | net | prefill | clause | TTS | playout</text>' +
        '</svg>' },

    { t: "exercise", kind: "build", title: "Simulate the turn instead of summing it",
      difficulty: "advanced", minutes: 30,
      body: "Rewrite the budget as a dependency graph: each stage is a node with a duration and a list of predecessors, including the second and third clauses and their synthesis. Schedule it earliest-finish and report both time to first audio and total response time. Compare four variants: the real graph, a naive serial implementation, and speculative prefill under conservative and optimistic assumptions. Then explain the result for time to first audio.",
      requirements: [
        "Model at least 11 nodes, including clause2, clause3 and their TTS chunks",
        "Schedule earliest-finish so anything that can overlap does",
        "Report first audio and whole-response time for each variant",
        "Build the naive-serial variant by making each node depend only on the previous one",
        "Model speculative prefill twice \u2014 half the prefill reused, and nearly all of it",
        "Explain why variants A and B have identical time to first audio"
      ],
      hint: "Keep ASR finalisation and the network on the critical path even under speculation \u2014 the committed answer still has to come from the final transcript. Only the prefill duration changes.",
      solution: { lang: "python", title: "x1304.py \u2014 the turn as a dependency graph",
        code: 'BASE = [\n    ("endpoint",   700, []),\n    ("asr_final",  120, ["endpoint"]),\n    ("net_out",     40, ["asr_final"]),\n    ("prefill",    350, ["net_out"]),\n    ("clause1",    200, ["prefill"]),\n    ("tts1",       180, ["clause1"]),\n    ("playout",     60, ["tts1"]),\n    ("clause2",    200, ["clause1"]),\n    ("clause3",    200, ["clause2"]),\n    ("tts2",       180, ["clause2", "tts1"]),\n    ("tts3",       180, ["clause3", "tts2"]),\n]\n\ndef schedule(stages):\n    dep = dict((n, p) for n, _, p in stages)\n    start, end = {}, {}\n    for n, d, _ in stages:\n        s = max([end[p] for p in dep[n]] or [0])\n        start[n], end[n] = s, s + d\n    return start, end, end["playout"], max(end.values())\n\ndef variant(**kw):\n    out = []\n    for n, d, p in BASE:\n        nd, np_ = kw.get(n, (None, None))\n        out.append((n, d if nd is None else nd, p if np_ is None else np_))\n    return out\n\n# A: the real graph.  B: naive serial.  C/D: speculative prefill.\nserial, prev = [], None\nfor n, d, _ in BASE:\n    serial.append((n, d, [prev] if prev else []))\n    prev = n\n\nfor label, stages in (("A streaming", BASE), ("B serial", serial),\n                      ("C spec, half reused", variant(prefill=(175, None))),\n                      ("D spec, nearly all",  variant(prefill=(60, None)))):\n    _s, _e, ttfa, done = schedule(stages)\n    print("%-22s first audio %6d ms   whole response %6d ms" % (label, ttfa, done))',
        out: '==============================================================================================\nSimulating one turn: what does overlap actually buy?\n==============================================================================================\neach stage is a node with a duration and a dependency list; the schedule is\nearliest-finish, so anything that CAN overlap does.\n\nA. the real dependency graph -- full streaming\n   stage         start     end  timeline (1 char = 40 ms)\n   endpoint         0ms    700ms  ##################\n   asr_final      700ms    820ms                    ###\n   net_out        820ms    860ms                      #\n   prefill        860ms   1210ms                        #########\n   clause1       1210ms   1410ms                                #####\n   tts1          1410ms   1590ms                                     ####\n   playout       1590ms   1650ms                                          ##\n   clause2       1410ms   1610ms                                     #####\n   clause3       1610ms   1810ms                                          #####\n   tts2          1610ms   1790ms                                          ####\n   tts3          1810ms   1990ms                                               ####\n   -> first audio 1650 ms, whole response 1990 ms\n\nB. naive serial -- every stage waits for the one before it\n   stage         start     end  timeline (1 char = 40 ms)\n   endpoint         0ms    700ms  ##################\n   asr_final      700ms    820ms                    ###\n   net_out        820ms    860ms                      #\n   prefill        860ms   1210ms                        #########\n   clause1       1210ms   1410ms                                #####\n   tts1          1410ms   1590ms                                     ####\n   playout       1590ms   1650ms                                          ##\n   clause2       1650ms   1850ms                                           #####\n   clause3       1850ms   2050ms                                                #####\n   tts2          2050ms   2230ms                                                     ####\n   tts3          2230ms   2410ms                                                          ####\n   -> first audio 1650 ms, whole response 2410 ms\n\nC. speculative prefill, conservative -- half the prefill reused\n   stage         start     end  timeline (1 char = 40 ms)\n   endpoint         0ms    700ms  ##################\n   asr_final      700ms    820ms                    ###\n   net_out        820ms    860ms                      #\n   prefill        860ms   1035ms                        ####\n   clause1       1035ms   1235ms                            #####\n   tts1          1235ms   1415ms                                 ####\n   playout       1415ms   1475ms                                     ##\n   clause2       1235ms   1435ms                                 #####\n   clause3       1435ms   1635ms                                      #####\n   tts2          1435ms   1615ms                                      ####\n   tts3          1635ms   1815ms                                           ####\n   -> first audio 1475 ms, whole response 1815 ms\n\nD. speculative prefill, optimistic -- the partial was nearly right\n   stage         start     end  timeline (1 char = 40 ms)\n   endpoint         0ms    700ms  ##################\n   asr_final      700ms    820ms                    ###\n   net_out        820ms    860ms                      #\n   prefill        860ms    920ms                        ##\n   clause1        920ms   1120ms                         #####\n   tts1          1120ms   1300ms                              ####\n   playout       1300ms   1360ms                                  ##\n   clause2       1120ms   1320ms                              #####\n   clause3       1320ms   1520ms                                   #####\n   tts2          1320ms   1500ms                                   ####\n   tts3          1520ms   1700ms                                        ####\n   -> first audio 1360 ms, whole response 1700 ms\n\n==============================================================================================\nWhat the simulation shows that summing the column does not\n==============================================================================================\n                                                         first audio     all done\n   A. streaming, real dependency graph                        1650ms       1990ms\n   B. naive serial                                            1650ms       2410ms\n   C. speculative prefill, conservative                       1475ms       1815ms\n   D. speculative prefill, optimistic                         1360ms       1700ms\n\n1. A AND B HAVE THE SAME TIME TO FIRST AUDIO (1650 ms).\n   streaming saved 420 ms on the full response (2410 -> 1990) and exactly ZERO on\n   first audio. the first-audio path is a genuine dependency chain: you cannot\n   synthesise a clause you have not generated, generate from a prompt you have\n   not prefilled, or prefill a transcript you do not have.\n\n   so 1,650 ms is not a failure to stream. it is the critical path, and it\n   survives any amount of overlap added downstream of it.\n\n2. the only way to shorten the chain is to BREAK a dependency, not overlap it.\n   speculative prefill breaks one: it prefills the system prompt, the history\n   and the PARTIAL transcript during the endpointing window, so when the final\n   transcript lands only the corrected tail needs prefilling.\n\n   conservative (half reused): 1650 -> 1475 ms, 175 ms saved (10.6%)\n   optimistic (partial nearly right): 1650 -> 1360 ms, 290 ms saved (17.6%)\n\n   the 175 ms figure in the optimisation table of 13.3 is the conservative one.\n   the spread between 175 and 290 ms is not modelling slack -- it is a real\n   property of your traffic: how often the partial transcript\'s prefix survives\n   finalisation unchanged. that is measurable, and worth measuring before you\n   promise either number.\n\n3. note what speculation does NOT remove. ASR finalisation and the network\n   round trip stay on the critical path in both C and D, because the committed\n   answer has to be generated from the FINAL transcript. and endpointing stays\n   exactly where it was -- still 47.5% of the conservative budget.\n\nTHE LESSON: \'add streaming\' and \'reduce first-audio latency\' are different\nprojects with different payoffs. streaming improves the tail of the response,\nwhich matters for long answers and barge-in. shortening first audio requires\nremoving a dependency -- speculating earlier, or deciding sooner.',
        notes: [
          { t: "p", text: "**A and B have identical time to first audio.** Streaming saved 420 ms on the full response and exactly zero on first audio, because the first-audio path is a genuine dependency chain: you cannot synthesise a clause you have not generated, generate from a prompt you have not prefilled, or prefill a transcript you do not have. So 1,650 ms is not a failure to stream \u2014 it is the critical path." },
          { t: "p", text: "**The only way to move first audio is to break a dependency rather than overlap it.** Speculative prefill does that: it prefills the system prompt, history and *partial* transcript during the endpointing window, so when the final transcript lands only the corrected tail needs prefilling. Conservative: 1,650 \u2192 1,475 ms, 175 ms saved. Optimistic: 1,650 \u2192 1,360, 290 ms." },
          { t: "p", text: "**That spread is not modelling slack**, it is a measurable property of your traffic \u2014 how often a partial transcript's prefix survives finalisation unchanged. The 175 ms used in 13.3's optimisation table is the conservative end, which is the right one to put in a plan until you have measured your own." },
          { t: "p", text: "**Note what speculation does not remove.** ASR finalisation and the network round trip stay on the critical path in both variants, because the committed answer has to be generated from the final transcript. And endpointing does not move at all \u2014 it is still 47.5% of the conservative budget, so it remains the thing to fix." },
          { t: "p", text: "I went in expecting the simulation to show that the 1,650 ms figure was pessimistic and that the real pipeline was faster than the sum. The opposite is true, and finding out why was the useful part: a sum and a critical path coincide exactly when the chain has no parallelism to exploit, which is the situation here by construction." }
        ] } },

    { t: "callout", kind: "trap", title: "\u201cWe added streaming and the latency did not move\u201d",
      body: [
        { t: "p", text: "This is a real and demoralising outcome, and it is now predictable rather than mysterious. A team spends a quarter on partial transcripts, token streaming and chunked synthesis, ships it, and time to first audio is unchanged to the millisecond. The work was not wasted \u2014 total response time fell by 420 ms, barge-in became possible, and long answers improved a lot \u2014 but none of that is the metric on the dashboard." },
        { t: "p", text: "The lesson is to be explicit about which number a piece of work moves before you start it. Streaming improves the tail of a response. Speculation and endpointing improve the head. They are different projects." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: extending the program for your own stack",
      body: [
        { t: "p", text: "The useful version of this program is the one with your constants in it, and there are three substitutions worth making on day one." },
        { t: "p", text: "**Replace the stage durations with measured p50 and p95 from your own spans.** 13.1's exercise shows the p95 column is where the user experience actually lives, so carry both and compute the budget twice. **Replace the pause distribution with one fitted to your recordings** \u2014 the 220 ms median and 0.75 sigma are plausible generic values, and your callers reading out an account number pause very differently from your callers describing a problem. **Add an accuracy column** to the sensitivity table, because 13.3's search showed that the two most aggressive latency targets both depend on a smaller model, and a latency table silently scores that as free." },
        { t: "p", text: "Then the program stops being an illustration and becomes the thing you argue from in planning. That is the actual deliverable here \u2014 not 1,650 ms, which is a figure about a pipeline that is not yours." }
      ] }
  ],

  takeaways: [
    "**The program is arithmetic over a table of constants**, and that is enough, because a voice pipeline is a latency allocation problem before it is an engineering one.",
    "**Five blocks**: stage budgets, sensitivity, the endpointing distribution, the barge-in budget, the cost of a call.",
    "**The \u201cwhy\u201d column is load-bearing** \u2014 it turns \u201cmake every stage smaller\u201d into a negotiation about named risks.",
    "**`p_pause_exceeds` is the only real function**: the interruption rate is a tail probability of a measurable distribution, not a mysterious quality of the endpointer.",
    "**I ran all five blocks and the reference's figures check out exactly** \u2014 1,650 and 920 ms, the seven sensitivities, the endpointing table, 160 ms of barge-in and $0.0681 a call.",
    "**A sum is only correct if nothing overlaps**, so the natural expectation is that streaming makes the real figure lower than 1,650.",
    "**It does not. Streaming changes time to first audio by exactly 0 ms** \u2014 1,650 both ways \u2014 while saving 420 ms on the full response.",
    "**Because the first-audio path is a hard dependency chain**: no synthesis without a clause, no clause without prefill, no prefill without a transcript.",
    "**Only breaking a dependency moves the head of the turn.** Speculative prefill is worth 175 ms conservatively and 290 ms optimistically.",
    "**The spread between 175 and 290 ms is measurable, not slack** \u2014 it is how often a partial transcript's prefix survives finalisation.",
    "**Speculation does not remove ASR finalisation or the network**, because the committed answer must come from the final transcript \u2014 and endpointing is untouched at 47.5% of the new budget.",
    "**Streaming improves the tail of a response and speculation improves the head**; naming which number a project moves prevents a quarter of invisible work."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Rewriting the 1,650 ms budget as a dependency graph with full streaming gives what time to first audio?",
        options: [
          "About 1,230 ms, because the synthesis stages overlap generation",
          "Exactly 1,650 ms \u2014 unchanged, because the first-audio path is a hard dependency chain",
          "It cannot be computed without knowing the token rate",
          "About 990 ms, since ASR and prefill can run concurrently"
        ],
        answer: 1,
        why: "Overlap can compress work that hangs off a chain but cannot shorten the chain itself, and the path to first audio is entirely sequential by construction: endpointing, then finalisation, then the network, then prefill, then enough tokens for a clause, then synthesis, then playout. Streaming did save 420 ms on the complete response \u2014 real value for long answers and a precondition for barge-in \u2014 but zero on the figure the team is usually judged on." },

      { stem: "Speculative prefill saves 175 ms under conservative assumptions and 290 ms under optimistic ones. What determines which you get?",
        options: [
          "The model's prefill throughput, which varies with load",
          "How often the partial transcript's prefix survives finalisation unchanged, which is measurable from your own traffic",
          "Whether the endpointing threshold is long enough for prefill to complete",
          "The size of the system prompt relative to the transcript"
        ],
        answer: 1,
        why: "Speculation prefills the system prompt, history and the partial transcript during the endpointing window. When the final transcript arrives, whatever prefix is byte-identical is reusable and only the corrected tail needs prefilling \u2014 so the saving is set by how stable your partials are, which depends on your audio quality, domain vocabulary and recogniser. The conservative 175 ms is the right figure to put in a plan until you have measured your own." },

      { stem: "A team ships partial transcripts, token streaming and chunked synthesis, and time to first audio is unchanged. What should the retrospective conclude?",
        options: [
          "The streaming implementation has a bug, since overlap must reduce latency",
          "Nothing was gained and the quarter was wasted",
          "The work moved total response time and enabled barge-in, but the chosen metric only moves when a dependency is broken",
          "Time to first audio is the wrong metric and should be replaced by total response time"
        ],
        answer: 2,
        why: "The outcome is predictable from the dependency graph rather than evidence of a defect: streaming compresses what hangs off the critical path, so it improved the full response by 420 ms and made interruption handling possible, while leaving the head of the turn exactly where it was. The fix is process rather than code \u2014 state which number a project moves before starting it, since streaming improves the tail and speculation or endpointing improves the head." },

      { stem: "Why does the stage table carry a third column giving the reason each stage exists?",
        options: [
          "To document the code for future maintainers",
          "Because it converts \u201cmake every stage smaller\u201d into a negotiation about specific named risks",
          "Because the reasons are needed to compute the sensitivity analysis",
          "To distinguish stages that can be parallelised from those that cannot"
        ],
        answer: 1,
        why: "Durations alone invite a demand that all of them shrink. With reasons attached, cutting the playout buffer is visibly a decision to accept more mid-word gaps on poor connections, and cutting the endpoint silence is a decision to interrupt users more often \u2014 so each proposal names what is being traded. That is half the value of the program, and it is why the budget is a planning artefact rather than a measurement." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Reading and extending the program",
    questions: [
      { level: "advanced",
        q: "We streamed everything and time to first audio did not move. What happened?",
        strong: "A strong answer distinguishes overlapping work from shortening a chain.",
        answer: [
          { t: "p", text: "That is the expected result, and I can say why from the dependency structure rather than by guessing at a bug. Time to first audio runs through a chain where every link genuinely needs its predecessor: you wait out the endpointing silence, finalise the transcript, cross the network, prefill the prompt, generate enough tokens to make a speakable clause, synthesise it, and let it through the playout buffer. Streaming lets you overlap work that hangs off that chain. It cannot shorten the chain." },
          { t: "p", text: "When I rebuilt the budget as a graph and scheduled it earliest-finish, a naive serial implementation and a fully streamed one came out at exactly the same 1,650 milliseconds to first audio. What streaming bought was 420 milliseconds off the complete response, because the second and third clauses and their synthesis now overlap, and it made barge-in possible at all, since you cannot cancel audio you have already handed over in one piece." },
          { t: "p", text: "So the work was valuable and the metric was the wrong one to promise. To move the head of the turn you have to remove a link rather than overlap it, and there are only two ways to do that: speculate earlier, or decide earlier. Speculative prefill is the first \u2014 prefill on the partial transcript during the endpointing window, which is worth 175 milliseconds on conservative assumptions and 290 if your partials are stable. Endpointing is the second, and it is much bigger." },
          { t: "p", text: "The process lesson I would take into the next quarter is to name the number before starting. Streaming improves the tail of a response, which matters for long answers and interruption handling. Speculation and endpointing improve the head. Those are different projects with different beneficiaries, and conflating them is how a good quarter of work ends up looking like nothing." }
        ] },

      { level: "core",
        q: "What would you change about the reference program before using it on your own system?",
        strong: "A strong answer makes three specific substitutions.",
        answer: [
          { t: "p", text: "Three substitutions, and then it stops being an illustration and becomes a planning tool." },
          { t: "p", text: "First, replace the stage durations with measured p50 and p95 from my own spans, and compute the budget twice. A median budget describes a turn that may not be the one users remember \u2014 when I modelled it, two agents with an identical 700 millisecond median had 1.6% and 23.6% of turns past the point where a wait reads as thinking. So I want the p95 budget sitting next to the p50 one." },
          { t: "p", text: "Second, replace the pause distribution with one fitted to my own recordings. The 220 millisecond median and 0.75 sigma are plausible generic values, and the whole endpointing analysis is downstream of them. A caller reading out an account number pauses completely differently from one describing a problem, so the interruption rate at any threshold is domain-specific. That distribution is cheap to fit and everything else depends on it." },
          { t: "p", text: "Third, add an accuracy column to the sensitivity table. When I searched combinations for a latency target, the two most aggressive targets both required a distilled model, and a latency table scores that as a pure win \u2014 it is actually the only candidate that trades answer quality. A table that cannot represent its own most important trade-off will reliably recommend it." },
          { t: "p", text: "I would keep the third column of the stage table exactly as it is, though. Having the reason each stage exists written down next to its duration is what turns a request to make everything faster into a conversation about which specific risk we are accepting." }
        ] },

      { level: "advanced",
        q: "How would you decide whether to build speculative prefill?",
        strong: "A strong answer measures partial stability first and weighs the waste.",
        answer: [
          { t: "p", text: "I would measure one thing before writing any of it: how often a partial transcript's prefix survives finalisation unchanged. That single quantity decides whether the feature is worth 175 milliseconds or 290, and it is measurable from traffic I already have \u2014 log the partials and the final, and compare prefixes. If partials are unstable in my domain, most speculation is discarded and the feature is mostly waste." },
          { t: "p", text: "Then I would price the waste, because that is the part that does not show up in any latency metric. A speculative prefill that gets thrown away costs exactly as much as one that gets used. Speculating on every partial means roughly eight prefills a turn instead of one, and when I worked it through that is about ten times more expensive per second of latency saved than the speech-native architecture everybody calls expensive. So the naive version is the worst-value latency purchase available." },
          { t: "p", text: "That does not kill the feature, it specifies it. Gate speculation on a signal that already correlates with end of turn \u2014 only speculate once a pause has lasted long enough to look like an ending \u2014 which cuts it from about seven speculations a turn to under two. And make the stable prefix cacheable, since the system prompt and history are byte-identical across every speculation within a turn, so they should be read from cache rather than reprefilled. Those two together removed about 80% of the premium in my numbers." },
          { t: "p", text: "The general rule I would state is that any optimisation doing speculative work has two budgets, latency and waste, and only one of them is on the dashboard. If you measure only the first you have moved cost from a column you watch into a column you do not, and it surfaces a month later as an unattributable inference bill." }
        ] }
    ]
  }
});
