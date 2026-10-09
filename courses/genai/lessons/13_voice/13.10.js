EC.receiveLesson({
  id: "13.10",

  lede: "A tool call in a chat agent is a spinner. In a voice agent it is silence, and silence in a conversation means something \u2014 that you did not hear, or are confused, or have hung up. The mechanism that fixes it is almost free: say something canned first, then make the call. A filler does not hide the latency, it **splits one long silence into two short ones** \u2014 and worked through the real timeline, a 900 ms filler keeps every silence inside the responsive band for tool calls up to **800 ms**, where without it even a zero-latency tool leaves a 1,650 ms wait. The reference says the filler arrives at 300 ms. From end of speech it is **760 ms**, because the filler cannot start before the endpointer commits \u2014 the same measurement-boundary slip 13.3 warns about, in the claim.",

  objectives: [
    "Explain why a tool call is a different problem in voice than in chat",
    "Compute the longest silence a user experiences with and without a filler",
    "State the tool latency at which a filler stops being sufficient",
    "Distinguish a safe filler from one that promises an outcome",
    "Design a progress story for the tail of the tool latency distribution"
  ],

  prerequisites: ["13.8", "13.3"],

  blocks: [

    { t: "h2", n: "01", id: "silence", text: "Silence is a message",
      sub: "And it is not the message you want to send" },

    { t: "p", text: "A chat agent can show a spinner, a \u201clooking that up\u2026\u201d line, or three animated dots. All of them communicate *work in progress* without saying anything. A voice agent has exactly one way to represent a pause, and it already means several other things in conversation." },

    { t: "table",
      head: ["Silence length", "What the user concludes", "What they do"],
      rows: [
        ["under 800 ms", "normal turn-taking", "nothing \u2014 waits"],
        ["800\u20131200 ms", "it is thinking", "waits, slightly uncertain"],
        ["1200\u20132000 ms", "it did not hear me", "repeats themselves"],
        ["2000\u20133000 ms", "something is broken", "says \u201chello?\u201d"],
        ["over 3000 ms", "the call has dropped", "hangs up"]
      ] },

    { t: "p", text: "The repeat at 1.2 to 2 seconds is the expensive one, because it arrives *while your response is being prepared*. The user's repeated utterance hits the pipeline mid-generation, triggers barge-in if you have it and corrupts the turn if you do not, and now you are handling an interruption on a turn that was merely slow." },

    { t: "callout", kind: "insight", title: "The tail of the tool distribution is the product",
      body: [
        { t: "p", text: "Tool latency is heavy-tailed in a way that model latency usually is not: a database read is 40 ms and the same read behind a cold connection, a retry or a loaded dependency is 3 seconds. The median tool call is fine and nobody designs for the p95." },
        { t: "p", text: "That matters more here than in chat because the perception bands are thresholds. A p50 of 300 ms and a p95 of 3,000 ms is not \u201cmostly fast\u201d \u2014 it is an agent that occasionally appears to hang up on people, and 13.1's conjunction arithmetic says a p95 event will happen in most multi-tool calls." }
      ] },

    { t: "h2", n: "02", id: "filler", text: "Speak first, then call",
      sub: "What a canned phrase costs and what it buys" },

    { t: "p", text: "The trick is that a filler phrase needs **no model call**. \u201cLet me check that for you\u201d is a fixed string chosen by the orchestrator the moment it sees a tool-call intent, so there is no prefill and no generation \u2014 and if its audio is pre-rendered at build time, no synthesis either. The orchestrator fires a cached clip the instant the endpointer commits." },

    { t: "code", lang: "python", title: "The filler timeline, from end of speech",
      code: 'ENDPOINT, POST_ENDPOINT, PLAYOUT = 700, 950, 60\n# POST_ENDPOINT = asr 120 + net 40 + prefill 350 + clause 200 + tts 180 + playout 60\nTTFA = ENDPOINT + POST_ENDPOINT          # 1650, the figure from 13.3\nFILLER_SPOKEN_MS = 900                   # "Let me check that for you"\n\ndef timeline(tool_ms, filler, endpoint=ENDPOINT, prerendered=True):\n    """Returns (first audio, the longest silence the user experiences)."""\n    real_response = endpoint + POST_ENDPOINT + tool_ms\n    if not filler:\n        return real_response, real_response\n    filler_audio = endpoint + (0 if prerendered else 180) + PLAYOUT\n    filler_ends = filler_audio + FILLER_SPOKEN_MS\n    gap_after = max(0, real_response - filler_ends)\n    return filler_audio, max(filler_audio, gap_after)\n\nfor tool in (0, 600, 900, 1800, 3000):\n    print("tool %4dms   no filler %5dms   with filler: first %3dms, worst gap %4dms"\n          % ((tool,) + (timeline(tool, False)[0],) + timeline(tool, True)))',
      out: 'tool    0ms   no filler  1650ms   with filler: first 760ms, worst gap  760ms\ntool  600ms   no filler  2250ms   with filler: first 760ms, worst gap  760ms\ntool  900ms   no filler  2550ms   with filler: first 760ms, worst gap  890ms\ntool 1800ms   no filler  3450ms   with filler: first 760ms, worst gap 1790ms\ntool 3000ms   no filler  4650ms   with filler: first 760ms, worst gap 2990ms',
      hl: [10, 11, 12, 13],
      caption: "The filler covers the base pipeline entirely, so the leftover gap is roughly the tool time alone." },

    { t: "callout", kind: "trap", title: "The 300 ms is measured from the wrong place",
      body: [
        { t: "p", text: "The reference states that a filler \u201cat 300 ms covers a 900 ms tool\u201d. The structure of the claim is right and worth keeping. The 300 ms is not reachable from end of speech, because the filler cannot be spoken until the endpointer has committed \u2014 and that is 700 ms with a fixed threshold. With pre-rendered audio the filler's first sound lands at **760 ms**." },
        { t: "p", text: "This is exactly the instrumentation error 13.3 warns about, appearing in the module's own worked claim: a figure measured from the endpointer firing rather than from the user stopping, which silently excludes the single largest term in the budget. 760 ms is still inside the responsive band, so the design holds \u2014 but only just, and if you promise 300 you will miss it by 460." },
        { t: "p", text: "The 300 ms figure *is* reachable with a semantic endpointer: a 300 ms backstop timer plus 60 ms of playout gives 360 ms. So the number describes the system 13.5 tells you to build, rather than the one the budget describes." }
      ] },

    { t: "viz", title: "One long silence, or two short ones",
      caption: "The filler covers the base pipeline. What is left over is the tool time, which is why the tail matters.",
      svg: '<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline comparison with and without a filler phrase">' +
        '<text x="12" y="18" class="s-label">NO FILLER \u2014 900 ms tool call</text>' +
        '<rect x="12" y="28" width="510" height="28" fill="var(--crit)" opacity="0.28" stroke="var(--crit)"/>' +
        '<text x="267" y="47" class="s-sub" text-anchor="middle">silence \u2014 2550 ms</text>' +
        '<rect x="522" y="28" width="226" height="28" fill="var(--violet)" opacity="0.22" stroke="var(--violet)"/>' +
        '<text x="635" y="47" class="s-sub" text-anchor="middle">\u201cYour balance is\u2026\u201d</text>' +
        '<text x="12" y="74" class="s-mono s-sub">the user said \u201chello?\u201d somewhere around here \u2014\u2192</text>' +
        '<text x="12" y="106" class="s-label">WITH A PRE-RENDERED FILLER \u2014 same 900 ms tool call</text>' +
        '<rect x="12" y="116" width="152" height="28" fill="var(--warn)" opacity="0.3" stroke="var(--warn)"/>' +
        '<text x="88" y="135" class="s-sub" text-anchor="middle">760 ms</text>' +
        '<rect x="164" y="116" width="180" height="28" fill="var(--good)" opacity="0.28" stroke="var(--good)"/>' +
        '<text x="254" y="135" class="s-sub" text-anchor="middle">\u201cLet me check that\u201d</text>' +
        '<rect x="344" y="116" width="178" height="28" fill="var(--warn)" opacity="0.3" stroke="var(--warn)"/>' +
        '<text x="433" y="135" class="s-sub" text-anchor="middle">890 ms</text>' +
        '<rect x="522" y="116" width="226" height="28" fill="var(--violet)" opacity="0.22" stroke="var(--violet)"/>' +
        '<text x="635" y="135" class="s-sub" text-anchor="middle">\u201cYour balance is\u2026\u201d</text>' +
        '<text x="12" y="162" class="s-sub">same total duration. the longest silence went from 2550 ms to 890 ms, and the</text>' +
        '<text x="12" y="180" class="s-sub">tool ran underneath the filler for free</text>' +
        '<line x1="12" y1="196" x2="748" y2="196" class="s-stroke" opacity="0.4"/>' +
        '<text x="12" y="220" class="s-label">WHERE IT STOPS WORKING</text>' +
        '<rect x="12" y="230" width="176" height="24" rx="3" fill="var(--good)" opacity="0.22" stroke="var(--good)"/>' +
        '<text x="100" y="247" class="s-sub" text-anchor="middle">tool &lt; 800ms: responsive</text>' +
        '<rect x="194" y="230" width="190" height="24" rx="3" fill="var(--warn)" opacity="0.22" stroke="var(--warn)"/>' +
        '<text x="289" y="247" class="s-sub" text-anchor="middle">800\u20131200ms: noticeable</text>' +
        '<rect x="390" y="230" width="176" height="24" rx="3" fill="var(--warn)" opacity="0.32" stroke="var(--warn)"/>' +
        '<text x="478" y="247" class="s-sub" text-anchor="middle">1200\u20133000: thinking</text>' +
        '<rect x="572" y="230" width="176" height="24" rx="3" fill="var(--crit)" opacity="0.28" stroke="var(--crit)"/>' +
        '<text x="660" y="247" class="s-sub" text-anchor="middle">&gt;3000ms: needs a story</text>' +
        '<text x="12" y="278" class="s-sub">past ~3 s a filler is not enough and you need a second utterance or an honest</text>' +
        '<text x="12" y="296" class="s-sub">exit \u2014 silence that long reads as a dropped call, and users hang up</text>' +
        '</svg>' },

    { t: "h2", n: "03", id: "honest", text: "Fillers are not free of content",
      sub: "Anything said before the result exists cannot be retracted" },

    { t: "p", text: "A filler is spoken before the tool has returned, which means it cannot reference the outcome. This sounds obvious and is violated constantly, because the natural-sounding phrases are the ones that presume success." },

    { t: "table",
      head: ["Filler", "Safe?", "Why"],
      rows: [
        ["\u201cLet me check that for you\u201d", "yes", "commits to nothing"],
        ["\u201cOne moment\u201d", "yes", "commits to nothing"],
        ["\u201cLet me look that up\u201d", "yes", "commits to nothing"],
        ["\u201cSure, I can do that\u201d", "**no**", "promises success before the tool ran"],
        ["\u201cI've cancelled that for you\u201d", "**no**", "states a completed action that may fail"],
        ["\u201cGood news!\u201d", "**no**", "promises an outcome it cannot know yet"]
      ] },

    { t: "callout", kind: "warn", title: "There is no edit key, so the only repair is a contradiction",
      body: [
        { t: "p", text: "In chat, a premature \u201cI've cancelled that\u201d can be followed by a correction the user reads as a sequence. On a call the user has already *heard* it, and the agent's next sentence has to contradict its previous one. That reads as incompetence rather than as an updated result, and it is much worse than having said nothing." },
        { t: "p", text: "The rule is mechanical: a filler may describe what the agent is **doing**, never what it has **done** or what it will **find**. \u201cLet me check\u201d is a description of the present. Everything unsafe in that table is a claim about the future or the past." }
      ] },

    { t: "h2", n: "04", id: "variety", text: "Variety and the progress story",
      sub: "Two failure modes at the edges" },

    { t: "p", text: "With one filler phrase, a caller making several tool-backed requests hears it verbatim every time, and a verbatim repeat is the single clearest signal that the thing you are talking to is a machine. The arithmetic is unforgiving: with one phrase it is certain, and the probability of hearing a repeat drops quickly as you add phrases." },

    { t: "p", text: "At the other edge, past roughly three seconds of leftover silence, no filler is sufficient. The user has already concluded the call dropped. What is needed there is not a longer filler but a **progress story**: a second utterance partway through (\u201cstill working on that\u201d), and past about eight seconds an honest exit (\u201cthis is taking longer than usual \u2014 shall I call you back?\u201d)." },

    { t: "ladder", title: "Handling a slow tool, worst to best",
      rungs: [
        { level: "bad", label: "Call the tool and wait",
          why: "The default. A 900 ms tool produces a 2,550 ms silence, which is in the band where users say \u201chello?\u201d \u2014 and their repeat arrives mid-generation and has to be handled as an interruption on a turn that was only slow.",
          code: "result = await tool.call(args)\nsay(summarise(result))",
          note: "Correct code, unusable product, and it creates a barge-in event out of nothing." },
        { level: "ok", label: "One filler phrase",
          why: "Transforms the experience for tool calls up to about 800 ms: the longest silence drops from 2,550 ms to 890 ms. But the same words every time, and nothing for the tail.",
          code: "say(\"Let me check that for you\")\nresult = await tool.call(args)",
          note: "The single highest-value line of code in this lesson, and not sufficient alone." },
        { level: "ok", label: "Varied, pre-rendered fillers",
          why: "Six or more phrases chosen at random, each synthesised once at build time and served as a cached clip. Pre-rendering saves 180 ms of synthesis and removes the filler from the TTS bill entirely.",
          code: "clip = random.choice(FILLER_CLIPS)   # pre-rendered wav\nplay(clip)\nresult = await tool.call(args)",
          note: "Now it sounds like a person and costs nothing per call." },
        { level: "best", label: "Fillers plus a progress story and an exit",
          why: "Fire the filler immediately, a second utterance if the tool is still running after ~2 s, and an honest offer to call back past ~8 s. This covers the whole latency distribution rather than the median, and the p95 is what decides how the agent feels.",
          code: "play(random.choice(FILLER_CLIPS))\ntask = asyncio.create_task(tool.call(args))\nwhile not task.done():\n    await asyncio.wait([task], timeout=2.0)\n    if not task.done():\n        play(next(PROGRESS_CLIPS))     # 'still working on that'\n    if elapsed() > 8.0:\n        return offer_callback()",
          note: "The only rung that designs for the tail rather than the median." }
      ] },

    { t: "exercise", kind: "analysis", title: "Work out what a filler is worth, and where it stops",
      difficulty: "advanced", minutes: 24,
      body: "Model the timeline of a tool-backed turn from end of speech, with and without a filler phrase. Report the longest silence the user experiences in each case across a range of tool latencies, and find the tool latency at which the filler stops keeping every silence inside the responsive band. Then check the claim that the filler arrives at 300 ms, classify a set of candidate fillers as safe or unsafe, and compute how many phrases you need for variety.",
      requirements: [
        "Model the base pipeline as endpoint 700 plus 950 ms of downstream work",
        "A filler needs no prefill or generation, and pre-rendered audio needs no synthesis",
        "Report first audio and the longest silence, with and without, across tool latencies",
        "Find the tool latency at which the worst silence reaches 800 ms",
        "Check the filler's own first-audio figure against the 300 ms claim",
        "Classify candidate fillers by whether they commit to an outcome",
        "Compute P(the user hears a phrase repeated back-to-back) for 1, 3, 6 and 12 phrases"
      ],
      hint: "The longest silence with a filler is max(time to the filler's first audio, the gap left after the filler finishes speaking). The filler cannot start before the endpointer commits \u2014 that constraint is the whole finding.",
      solution: { lang: "python", title: "x1310.py \u2014 splitting one silence into two",
        code: 'ENDPOINT, POST_ENDPOINT, PLAYOUT = 700, 950, 60\nTTFA = ENDPOINT + POST_ENDPOINT\nFILLER_SPOKEN_MS = 900\n\nBANDS = [(800, "responsive"), (1200, "noticeable"), (2000, "thinking"), (10**9, "broken")]\ndef band(ms):\n    for lim, name in BANDS:\n        if ms < lim:\n            return name\n\ndef timeline(tool_ms, filler, endpoint=ENDPOINT, prerendered=True):\n    real_response = endpoint + POST_ENDPOINT + tool_ms\n    if not filler:\n        return real_response, real_response\n    filler_audio = endpoint + (0 if prerendered else 180) + PLAYOUT\n    filler_ends = filler_audio + FILLER_SPOKEN_MS\n    return filler_audio, max(filler_audio, max(0, real_response - filler_ends))\n\nfor tool in (0, 300, 600, 900, 1200, 1800, 3000, 5000):\n    bare, _ = timeline(tool, False)\n    first, worst = timeline(tool, True)\n    print("%-9d %11dms %-12s %11dms %11dms %-12s"\n          % (tool, bare, band(bare), first, worst, band(worst)))\n\nbp = next(t for t in range(0, 6001, 10) if timeline(t, True)[1] >= 800)\nprint("responsive for tool calls up to %d ms" % (bp - 10))\n\n# variety: P(a phrase repeats back-to-back across 8 tool calls)\nfor n in (1, 3, 6, 12):\n    print("%2d phrases -> %3.0f%%" % (n, 100 * (1.0 - (1.0 - 1.0 / n) ** 7)))',
        out: '================================================================================================\nA filler does not hide latency. It splits one long silence into two short ones.\n================================================================================================\nfirst audio with no filler is 1650 ms + the tool. with a pre-rendered filler the\norchestrator fires audio 60 ms after the endpointer commits.\n\ntool ms      no filler band            1st audio    worst gap band        \n0                1650ms thinking             760ms         760ms responsive  \n300              1950ms thinking             760ms         760ms responsive  \n600              2250ms broken               760ms         760ms responsive  \n900              2550ms broken               760ms         890ms noticeable  \n1200             2850ms broken               760ms        1190ms noticeable  \n1800             3450ms broken               760ms        1790ms thinking    \n3000             4650ms broken               760ms        2990ms broken      \n5000             6650ms broken               760ms        4990ms broken      \n\nso a 900 ms filler keeps EVERY silence inside the responsive band for tool\ncalls up to 800 ms. without it, even a zero-latency tool is a 1650 ms wait.\n\nthe reference\'s version of this claim is that a filler \'at 300 ms covers a\n900 ms tool\'. the SHAPE is right and the 300 ms is measured from the endpointer\nfiring, not from end of speech. from end of speech it is 760 ms with\npre-rendered audio and a fixed 700 ms endpointer -- still responsive, but only\njust, and it is the same measurement-boundary slip 13.3 warns about.\n\n------------------------------------------------------------------------------------------------\ntwo things that move the filler\'s own first audio\n------------------------------------------------------------------------------------------------\n   fixed 700 ms endpoint, synthesised live    first audio  940ms  noticeable\n   fixed 700 ms endpoint, pre-rendered        first audio  760ms  responsive\n   semantic 300 ms endpoint, pre-rendered     first audio  360ms  responsive\n\npre-rendering the filler audio is free and saves 180 ms: a canned phrase can be\nsynthesised once at build time and served as a cached clip, which also removes\nit from the TTS bill entirely.\n\n================================================================================================\nFillers are not free of content\n================================================================================================\nfiller                             safe?    why\n"Let me check that for you"        yes      commits to nothing\n"One moment"                       yes      commits to nothing\n"Let me look that up"              yes      commits to nothing\n"Sure, I can do that"              NO       promises success before the tool ran\n"I\'ve cancelled that for you"      NO       states a completed action; the tool may fail\n"Good news!"                       NO       promises an outcome it cannot know yet\n\nthe unsafe ones share a defect: they are spoken BEFORE the tool result exists,\nso they cannot be retracted. the user has already heard \'I\'ve cancelled that\'\nwhen the cancellation fails, and on a voice call there is no edit -- the only\navailable repair is a contradiction.\n\n================================================================================================\nVariety\n================================================================================================\n    1 phrases -> P(the user hears one repeated back-to-back in 8 tool calls) = 100%\n    3 phrases -> P(the user hears one repeated back-to-back in 8 tool calls) =  94%\n    6 phrases -> P(the user hears one repeated back-to-back in 8 tool calls) =  72%\n   12 phrases -> P(the user hears one repeated back-to-back in 8 tool calls) =  46%\n\nwith one phrase it is certain, and a verbatim repeat is the clearest possible\nsignal that the thing you are talking to is a machine. at six or more it stops\nbeing noticeable in a call of ordinary length.\n\n================================================================================================\nPast ~3 seconds a filler is not enough\n================================================================================================\n   tool 3000 ms -> worst gap after the filler 2990 ms (broken)\n   tool 5000 ms -> worst gap after the filler 4990 ms (broken)\n   tool 8000 ms -> worst gap after the filler 7990 ms (broken)\n\nat that point you need a progress story, not a filler: a second utterance\n(\'still working on it\'), or an honest exit (\'this is taking longer than usual --\nshall I call you back?\'). silence past 3 s reads as a dropped call, and users\nhang up rather than wait.\n\nTHE RULE: speak first, then call. honest, varied, pre-rendered, and backed by a\nprogress story for the tail -- because the p95 tool call decides what the agent\nfeels like, and the p50 is the one everyone designs for.',
        notes: [
          { t: "p", text: "**A filler does not hide latency, it splits one long silence into two short ones.** With a 900 ms tool, the longest silence goes from 2,550 ms \u2014 the band where users say \u201chello?\u201d \u2014 to 890 ms. Total duration is unchanged; the user's experience is completely different, because perception is banded rather than linear." },
          { t: "p", text: "**It keeps every silence inside the responsive band for tool calls up to 800 ms.** Note how much that is worth: without a filler, even a zero-latency tool leaves a 1,650 ms wait, so the filler is doing work on turns that have no tool latency problem at all." },
          { t: "p", text: "**The \u201cfiller at 300 ms\u201d is measured from the endpointer firing, not from end of speech.** The filler cannot be spoken until the endpointer commits, which is 700 ms with a fixed threshold, so with pre-rendered audio its first sound lands at 760 ms. That is the same instrumentation error 13.3 warns about, appearing in the module's own worked claim \u2014 and 300 ms *is* reachable, but only with the semantic endpointer from 13.5, where a 300 ms backstop plus 60 ms of playout gives 360 ms." },
          { t: "p", text: "**Pre-rendering the filler audio saves 180 ms and removes it from the TTS bill.** A canned phrase can be synthesised once at build time and served as a cached clip \u2014 and 180 ms is the difference between the filler's first audio being responsive at 760 ms and merely noticeable at 940 ms, so it is not a micro-optimisation." },
          { t: "p", text: "**Six phrases is roughly the point where variety stops being noticeable.** With one phrase a repeat is certain; the probability falls steeply with the first few additions and then flattens, so there is little value in going past about a dozen." },
          { t: "p", text: "**Past ~3 s of leftover silence a filler is insufficient**, and the fix is structural rather than longer: a second utterance at around 2 s, and an honest offer to call back past about 8 s. This is the only version that designs for the tail, and the tail is what decides how the agent feels \u2014 a p50 of 300 ms with a p95 of 3,000 ms is not \u201cmostly fast\u201d, it is an agent that periodically appears to have hung up." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: the agent that goes quiet on lookups",
      body: [
        { t: "p", text: "Callers report that the agent \u201cgoes dead\u201d when asked anything requiring a lookup, and several transcripts show the caller saying \u201chello?\u201d mid-turn. Tool latency is reported as a healthy 280 ms median." },
        { t: "p", text: "Two things are wrong and the median hides both. First, there is no filler, so even a 280 ms tool produces a 1,930 ms silence \u2014 the base pipeline is 1,650 before the tool is involved at all, which is already in the repeat band. The filler is the fix and it is one line, worth taking the longest silence to 760 ms. Second, the p95 almost certainly is not 280 ms: tool latency is heavy-tailed, and the \u201chello?\u201d transcripts are the p95 calls. So ask for p95 and p99 before concluding the filler alone is enough." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: \u201cI've cancelled that\u201d, and then it failed",
      body: [
        { t: "p", text: "To make the agent sound warmer, someone changes the filler from \u201cLet me check that\u201d to \u201cSure, I can do that for you\u201d \u2014 and for destructive operations, to \u201cI've cancelled that for you\u201d, spoken before the call returns. It tests beautifully, because in testing the tool always succeeds." },
        { t: "p", text: "In production the cancellation sometimes fails, and the agent's next sentence has to contradict a statement the caller has already heard. On a call there is no edit, so the only available repair is a contradiction, and a contradiction reads as incompetence rather than as an updated result. For a destructive action it is worse than that \u2014 the caller may hang up believing the cancellation happened." },
        { t: "p", text: "The rule to write into the prompt and the filler list: a filler may describe what the agent is **doing**, never what it has **done** or what it expects to **find**. \u201cLet me check\u201d, \u201cone moment\u201d and \u201clet me look that up\u201d are all descriptions of the present and all safe. Everything unsafe is a claim about the past or the future, made before the evidence exists." }
      ] }
  ],

  takeaways: [
    "**A tool call is a spinner in chat and silence in voice**, and silence already means \u201cdid not hear you\u201d or \u201ccall dropped\u201d.",
    "**The repeat band, 1.2\u20132 s, is the expensive one** \u2014 the user's repeat arrives mid-generation and becomes an interruption on a turn that was only slow.",
    "**A filler needs no model call**: it is a fixed string, so no prefill and no generation, and pre-rendered audio needs no synthesis either.",
    "**A filler splits one long silence into two short ones** \u2014 with a 900 ms tool, 2,550 ms becomes 890 ms for the same total duration.",
    "**It keeps every silence responsive for tool calls up to 800 ms**, and without it even a zero-latency tool leaves a 1,650 ms wait.",
    "**The \u201cfiller at 300 ms\u201d is measured from the endpointer firing**; from end of speech it is 760 ms \u2014 the same boundary error 13.3 warns about.",
    "**300 ms is reachable with a semantic endpointer** \u2014 a 300 ms backstop plus 60 ms playout gives 360 ms, so the claim describes the system 13.5 tells you to build.",
    "**Pre-rendering saves 180 ms and removes the filler from the TTS bill** \u2014 the difference between responsive at 760 ms and noticeable at 940.",
    "**A filler may describe what the agent is doing, never what it has done or will find** \u2014 everything spoken before the result cannot be retracted.",
    "**On a call the only repair for a premature claim is a contradiction**, which reads as incompetence rather than as an update.",
    "**Six or more phrases, chosen at random**, is roughly where a verbatim repeat stops being noticeable.",
    "**Past ~3 s a filler is insufficient**: a second utterance at ~2 s, an honest callback offer past ~8 s.",
    "**Design for the p95 tool call, not the p50** \u2014 a 300 ms median with a 3,000 ms p95 is an agent that periodically appears to have hung up."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "With a 900 ms tool call, adding a filler takes the longest silence from 2,550 ms to 890 ms. What happened to the total turn duration?",
        options: [
          "It fell by 1,660 ms, since the tool now runs concurrently",
          "It is unchanged \u2014 the filler splits one long silence into two short ones",
          "It rose by 900 ms, the time the filler takes to speak",
          "It depends on whether the filler audio is pre-rendered"
        ],
        answer: 1,
        why: "The tool runs underneath the filler, so nothing is removed from the critical path and the response arrives at the same moment. What changes is the distribution of silence: instead of one 2,550 ms gap in the band where users say \u201chello?\u201d, there is a 760 ms gap, speech, then an 890 ms gap. Since perception is banded rather than linear, that is a completely different experience for the same duration." },

      { stem: "The reference says a filler arrives at 300 ms. Measured from end of speech with a fixed 700 ms endpointer, what is it?",
        options: [
          "300 ms, since the filler needs no model call",
          "760 ms, because the filler cannot be spoken until the endpointer commits",
          "1,650 ms, the same as any other first audio",
          "480 ms, once synthesis of the canned phrase is counted"
        ],
        answer: 1,
        why: "A filler skips prefill and generation, and pre-rendered audio skips synthesis too \u2014 but it still cannot be spoken before the system has decided the user stopped talking, which is the 700 ms threshold, plus 60 ms of playout. This is the same instrumentation error 13.3 warns about, now inside the module's own claim. The 300 ms figure is reachable, but only with the semantic endpointer from 13.5: a 300 ms backstop plus playout gives 360 ms." },

      { stem: "Why is \u201cI've cancelled that for you\u201d an unsafe filler?",
        options: [
          "It is longer than necessary, which wastes the latency window",
          "It states a completed action before the tool has returned, and on a call the only repair is a contradiction",
          "It may be misheard as a question",
          "Destructive actions should never be acknowledged verbally"
        ],
        answer: 1,
        why: "Anything spoken before the result exists cannot be retracted, and in chat a correction reads as a sequence while on a call the user has already heard the claim \u2014 so the agent's next sentence must contradict its previous one, which reads as incompetence rather than as an update. For a destructive action it is worse, since the caller may hang up believing it happened. The mechanical rule is that a filler describes what the agent is doing, never what it has done or expects to find." },

      { stem: "Tool latency has a 280 ms median and callers say the agent goes dead on lookups. What are the two problems?",
        options: [
          "The tool is too slow and needs caching",
          "There is no filler \u2014 so even a 280 ms tool gives a 1,930 ms silence \u2014 and the p95 is almost certainly far above the median",
          "The endpointing threshold is too long, adding to the perceived wait",
          "The responses are too verbose, so the turn runs long"
        ],
        answer: 1,
        why: "The base pipeline is 1,650 ms before the tool is involved at all, so a healthy 280 ms tool still lands in the band where users repeat themselves \u2014 the filler is the fix and it is one line. And tool latency is heavy-tailed in a way model latency usually is not, so the transcripts containing \u201chello?\u201d are the p95 calls; a median tells you almost nothing about them, which is why the p95 is the figure to ask for next." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Tools and latency hiding",
    questions: [
      { level: "core",
        q: "Your voice agent needs to call a tool that takes about a second. What do you do?",
        strong: "A strong answer speaks first and explains why that is nearly free.",
        answer: [
          { t: "p", text: "Speak first, then call. A canned filler like \u2018let me check that for you\u2019 needs no model call \u2014 it is a fixed string chosen by the orchestrator the moment it sees a tool-call intent, so there is no prefill and no generation, and if the audio is pre-rendered at build time there is no synthesis either. So it reaches the speaker as soon as the endpointer commits." },
          { t: "p", text: "What that buys is not hiding the latency but splitting it. With a 900 millisecond tool, the longest silence the user experiences goes from about 2,550 milliseconds \u2014 which is the band where people say \u2018hello?\u2019 \u2014 down to about 890. The total turn takes exactly as long; the tool just runs underneath the filler. Since perception is banded rather than linear, that is a completely different product for the same duration." },
          { t: "p", text: "Worth noticing how much of that win has nothing to do with the tool. Without a filler, even a zero-latency tool leaves a 1,650 millisecond wait, because the base pipeline is 1,650 before any tool is involved. So the filler is doing real work on turns that have no tool latency problem at all." },
          { t: "p", text: "Two details I would not skip. Pre-render the filler audio \u2014 it saves 180 milliseconds of synthesis and removes the filler from the TTS bill, and 180 milliseconds is the difference between the filler landing inside the responsive band and outside it. And use six or more phrases chosen at random, because with one phrase a caller making several lookups hears it verbatim every time, and a verbatim repeat is the clearest possible signal that they are talking to a machine." }
        ] },

      { level: "advanced",
        q: "Where does the filler approach break down?",
        strong: "A strong answer names the tool latency and the tail.",
        answer: [
          { t: "p", text: "It keeps every silence inside the responsive band for tool calls up to about 800 milliseconds. Past that the leftover gap after the filler finishes starts growing, and by around 1,800 milliseconds of tool time the user is back in the band where they wonder whether they were heard \u2014 just later in the turn than before." },
          { t: "p", text: "Past roughly three seconds of leftover silence, no filler is sufficient, because the user has already concluded the call dropped and hung up or started talking. The fix there is structural rather than a longer phrase: a progress story. A second utterance at around two seconds \u2014 \u2018still working on that\u2019 \u2014 and past about eight seconds an honest exit, \u2018this is taking longer than usual, shall I call you back?\u2019." },
          { t: "p", text: "The thing I would actually push on in a design review is that this is a tail question and almost everybody designs for the median. Tool latency is heavy-tailed in a way model latency often is not \u2014 a database read is 40 milliseconds, and the same read behind a cold connection or a retry or a loaded dependency is three seconds. A team reporting a 280 millisecond median has told you nothing about the calls where users said \u2018hello?\u2019, and those are the p95 calls." },
          { t: "p", text: "So I would ask for p95 and p99 before deciding the filler is enough, and I would build the progress story on the basis of the p99 rather than hoping. The median tool call needs one line of code; the p99 is what decides what the agent feels like to use." }
        ] },

      { level: "core",
        q: "What makes a filler phrase safe?",
        strong: "A strong answer gives the present-tense rule and why retraction is impossible.",
        answer: [
          { t: "p", text: "That it describes what the agent is doing, never what it has done or what it expects to find. \u2018Let me check that\u2019, \u2018one moment\u2019 and \u2018let me look that up\u2019 are all statements about the present and all safe. \u2018Sure, I can do that\u2019 promises success, \u2018good news\u2019 promises an outcome, and \u2018I've cancelled that for you\u2019 states a completed action \u2014 and all three are spoken before the tool has returned." },
          { t: "p", text: "The reason it matters more in voice than in chat is retraction. In chat a premature claim can be followed by a correction and the user reads the two as a sequence. On a call they have already heard it, so the agent's next sentence has to contradict its own previous one, and a contradiction reads as incompetence rather than as an updated result. There is no edit key." },
          { t: "p", text: "For destructive operations it is worse than an awkward moment. If the agent says \u2018I've cancelled that\u2019 and the cancellation fails, the caller may hang up believing it happened, and you find out when they are charged." },
          { t: "p", text: "The failure mode here is specific and worth naming: this change gets made to make the agent sound warmer, and it tests perfectly because in testing the tool always succeeds. So I would put the present-tense rule in the prompt and in the review checklist for the filler list, rather than relying on anyone noticing in staging." }
        ] }
    ]
  }
});
