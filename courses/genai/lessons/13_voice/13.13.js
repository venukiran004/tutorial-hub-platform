EC.receiveLesson({
  id: "13.13",

  lede: "Here is the demonstration that settles what a voice turn needs to emit. Four turns, four different states of health \u2014 one fine, one with an over-patient endpointer, one interrupted, one where recognition was struggling \u2014 and **all four have a time to first audio of exactly 1,610 milliseconds**. A spread of zero. The single duration metric that almost every dashboard carries cannot distinguish them, and three of the four are broken for three unrelated reasons. What distinguishes them is a span per stage with attributes, plus one attribute that only a voice system needs: **words generated against words actually played**. In the interrupted turn, 70% of the response never reached the user, and every latency span is byte-identical to the healthy one.",

  objectives: [
    "Emit a span per pipeline stage with the attributes each needs",
    "Explain why time to first audio alone cannot diagnose a voice turn",
    "Use words generated against words played to detect three separate problems",
    "Instrument time to first audio from end of speech rather than from endpointing",
    "Set a retention policy that reconciles audio evals with audio sensitivity"
  ],

  prerequisites: ["13.12", "10.4"],

  blocks: [

    { t: "h2", n: "01", id: "identical", text: "Four turns, one number",
      sub: "And the number says nothing" },

    { t: "p", text: "The case for per-stage spans is usually made abstractly \u2014 more detail is better, you can drill down. The concrete version is stronger. Construct four turns that differ in what is wrong with them and are identical in total duration, and the argument is finished." },

    { t: "code", lang: "python", title: "The metric most dashboards carry",
      code: 'for name, t in TURNS.items():\n    print("   %-28s %15d ms" % (name, total(t)))',
      out: '   A healthy                               1610 ms\n   B patient endpointer                    1610 ms\n   C interrupted                           1610 ms\n   D recognition struggling                1610 ms\n\n   spread across all four: 0 ms',
      caption: "Three of these four turns are broken. The duration metric reports them as the same turn." },

    { t: "p", text: "Turn B has a 1,000 ms endpointing threshold and a **faster** model than turn A \u2014 310 ms of generation against 550. Turn C is an ordinary turn that got interrupted. Turn D has a recogniser that revised fourteen times and finished with 0.58 confidence. Each has a distinct fix, a distinct owner and a distinct cost, and the aggregate cannot tell you which one you are looking at." },

    { t: "callout", kind: "insight", title: "Turn B is the one that misdirects you",
      body: [
        { t: "p", text: "With only aggregate duration, the single visible fact about turn B is that the model is fast \u2014 because that is the component you probably do have a metric for. So the natural reading is \u201cthe model is fine, the slowness must be elsewhere\u201d, and \u201celsewhere\u201d is unmeasured, so attention returns to the model anyway." },
          { t: "p", text: "This is 13.3's finding in operational form. Endpointing is the largest term in the budget and the least instrumented, so the data actively points away from it. Making `vad.endpoint` a visible child span is what converts a 42% share from invisible to obvious." }
      ] },

    { t: "h2", n: "02", id: "spans", text: "The span tree",
      sub: "Five spans, and the attributes each one owes you" },

    { t: "code", lang: "text", title: "What a turn should emit",
      code: 'turn (1610 ms)\n  vad.endpoint       700 ms   threshold_ms=700  semantic=False\n  asr.finalise       120 ms   confidence=0.94   partial_count=4\n  llm.generate       550 ms   ttft_ms=350       tokens_out=64\n  tts.first_chunk    180 ms   chars=48          streamed=True\n  playout             60 ms   buffer_ms=60\n  (turn attributes)           words_generated=64  words_played=64  barge_in=False',
      caption: "Each attribute exists because some specific diagnosis needs it, not for completeness." },

    { t: "dl", items: [
      { k: "vad.endpoint \u2014 threshold_ms, semantic", v: "The threshold because it is the largest term in the budget and it is a configuration value you want in the trace rather than in a deploy manifest. The semantic flag so you can compare the two endpointers in production rather than in a benchmark." },
      { k: "asr.finalise \u2014 confidence, partial_count", v: "A high partial count means the recogniser kept revising, which correlates with a hard utterance. Low confidence plus many partials is the signature of an entity that is probably wrong \u2014 and 13.9 showed WER will not tell you." },
      { k: "llm.generate \u2014 ttft_ms, tokens_out", v: "Time to first token separately from total generation, because they are different problems: prefill latency is a prompt-size and caching issue, generation rate is a model and load issue." },
      { k: "tts.first_chunk \u2014 chars, streamed", v: "Characters because TTS is billed per character and is the largest cost line. The streamed flag because an unstreamed chunk silently breaks barge-in, and nothing else would reveal it." },
      { k: "playout \u2014 buffer_ms", v: "The buffer depth, because it appears in the latency budget and again in the barge-in budget, and it is the parameter most likely to be whatever the library shipped with." },
      { k: "turn \u2014 words_generated, words_played, barge_in", v: "The attribute pair that only voice needs. Everything below is about this." }
    ] },

    { t: "h2", n: "03", id: "gold", text: "Words generated against words played",
      sub: "The attribute a text pipeline never needs" },

    { t: "p", text: "In a text system, generated and delivered are the same thing, so there is nothing to compare. In a voice system they diverge every time the user interrupts, and the divergence is invisible in every timing metric \u2014 turn C's spans are identical to the healthy turn's, span for span, attribute for attribute, except for this pair." },

    { t: "viz", title: "One attribute, three diagnoses",
      caption: "64 generated, 19 played. Every latency span matches the healthy turn exactly.",
      svg: '<svg viewBox="0 0 760 310" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Words generated versus words played and what it reveals">' +
        '<text x="12" y="18" class="s-label">TURN C \u2014 words_generated=64, words_played=19</text>' +
        '<rect x="12" y="28" width="700" height="26" fill="var(--line)" opacity="0.18" stroke="var(--line)"/>' +
        '<rect x="12" y="28" width="208" height="26" fill="var(--good)" opacity="0.3" stroke="var(--good)"/>' +
        '<text x="116" y="46" class="s-mono" text-anchor="middle" fill="var(--good)">19 heard</text>' +
        '<text x="466" y="46" class="s-mono" text-anchor="middle">45 words generated, synthesised, billed, never heard</text>' +
        '<text x="12" y="80" class="s-label">AND THE LATENCY SPANS ARE IDENTICAL TO THE HEALTHY TURN</text>' +
        '<text x="12" y="102" class="s-mono">vad.endpoint 700   asr 120   llm 550   tts 180   playout 60   = 1610 ms</text>' +
        '<text x="12" y="120" class="s-mono s-sub">byte for byte the same as turn A. no timing metric anywhere can see this.</text>' +
        '<line x1="12" y1="136" x2="748" y2="136" class="s-stroke" opacity="0.4"/>' +
        '<text x="12" y="160" class="s-label">WHAT THE ONE ATTRIBUTE MAKES MEASURABLE</text>' +
        '<rect x="12" y="172" width="232" height="66" rx="4" fill="var(--crit)" opacity="0.12" stroke="var(--crit)"/>' +
        '<text x="128" y="192" class="s-sub" text-anchor="middle">1. the history bug</text>' +
        '<text x="128" y="212" class="s-sub" text-anchor="middle">did truncation run?</text>' +
        '<text x="128" y="230" class="s-mono s-sub" text-anchor="middle">13.6, silent otherwise</text>' +
        '<rect x="252" y="172" width="232" height="66" rx="4" fill="var(--warn)" opacity="0.12" stroke="var(--warn)"/>' +
        '<text x="368" y="192" class="s-sub" text-anchor="middle">2. real interruption rate</text>' +
        '<text x="368" y="212" class="s-sub" text-anchor="middle">per context, per state</text>' +
        '<text x="368" y="230" class="s-mono s-sub" text-anchor="middle">13.5, the endpointing signal</text>' +
        '<rect x="492" y="172" width="220" height="66" rx="4" fill="var(--good)" opacity="0.12" stroke="var(--good)"/>' +
        '<text x="602" y="192" class="s-sub" text-anchor="middle">3. wasted TTS spend</text>' +
        '<text x="602" y="212" class="s-sub" text-anchor="middle">70% of this turn\u2019s line</text>' +
        '<text x="602" y="230" class="s-mono s-sub" text-anchor="middle">13.14, the biggest cost</text>' +
        '<text x="12" y="266" class="s-sub">a text pipeline never needs this attribute, because generated and delivered are</text>' +
        '<text x="12" y="284" class="s-sub">the same thing. a voice pipeline cannot be operated without it \u2014 which is why it</text>' +
        '<text x="12" y="302" class="s-sub">is the first thing to add and the thing nobody has.</text>' +
        '</svg>' },

    { t: "callout", kind: "good", title: "One attribute, three budgets",
      body: [
        { t: "p", text: "It is worth noticing how unusual this is. The pair tells you whether 13.6's history truncation actually ran, gives you the real interruption rate that 13.5's endpointing decision depends on, and quantifies synthesis you were billed for and the user never heard \u2014 45 words in turn C, which is 70% of that turn's TTS line and TTS is the largest line in the cost model." },
        { t: "p", text: "Three separate concerns, three separate owners, one integer pair per turn. Nothing else in the module has that ratio of information to instrumentation cost." }
      ] },

    { t: "h2", n: "04", id: "boundary", text: "Measure from end of speech",
      sub: "The instrumentation error that invalidates the dashboard" },

    { t: "p", text: "Every figure in this module is measured from the moment the user stopped speaking. The most common voice instrumentation error is to start the clock when the endpointer fires instead, which puts the single largest term outside the metric \u2014 and 13.10 found that mistake in the filler claim, where a 300 ms figure turned out to be 760 from end of speech." },

    { t: "callout", kind: "warn", title: "The error is self-concealing",
      body: [
        { t: "p", text: "A dashboard measuring from the endpointer shows a healthy median and, crucially, shows **no endpointing span at all**. So the data contains no evidence of its own incompleteness. A team can stare at it for a year, correctly conclude that the model is the largest visible component, and optimise the model." },
        { t: "p", text: "The fix is to define time to first audio from end of speech and make `vad.endpoint` a child span of the turn. Then the 42% share is on the screen, and nobody has to be told about it." }
      ] },

    { t: "h2", n: "05", id: "retention", text: "What to keep",
      sub: "The tension between the audio eval and audio sensitivity" },

    { t: "p", text: "13.12 concluded that the eval set must be built from recorded audio. Audio is also the most sensitive artefact in the system \u2014 a voice recording is biometric data in many jurisdictions, and it contains everything the caller said including things they did not mean to say. Those two facts have to be reconciled rather than traded off." },

    { t: "table",
      head: ["Artefact", "Retention", "Why"],
      rows: [
        ["span timings and attributes", "90 days", "no PII \u2014 this is the debugging substrate, keep it long"],
        ["redacted transcript", "30 days", "entities masked; enough to reconstruct a turn's shape"],
        ["raw transcript", "7 days", "contains everything the caller said"],
        ["audio, rolling", "7 days, consent-gated", "the only artefact that reproduces a recognition bug"],
        ["audio, eval set", "indefinite, explicit consent", "13.12 requires it, so this set must exist"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Two stores, two policies",
      body: [
        { t: "p", text: "The resolution is not to keep less audio. It is to keep two different sets with two different justifications: a **small, explicitly consented, permanent** set for evaluation, and a **short rolling window** for debugging. Conflating them is what produces either an unusable eval set or an indefensible retention policy." },
        { t: "p", text: "Note also that span attributes carry no PII and are therefore the thing you can keep longest \u2014 which is another argument for putting real diagnostic information into attributes rather than relying on being able to go back to the audio." }
      ] },

    { t: "exercise", kind: "build", title: "Diagnose four turns with identical durations",
      difficulty: "core", minutes: 24,
      body: "Construct four voice turns as span trees that have identical total durations and four different states of health: healthy, an over-patient endpointer, an interrupted turn, and one where recognition struggled. Print the aggregate duration for all four to show it carries no information, then print the span trees with attributes and state which attribute identifies each pathology.",
      requirements: [
        "Five spans per turn with the attributes each stage owes",
        "Make all four totals identical so the aggregate is provably useless",
        "Give the over-patient-endpointer turn a faster model than the healthy turn",
        "Include words_generated and words_played as turn-level attributes",
        "For each pathology, name the single attribute that identifies it",
        "Quantify the wasted synthesis in the interrupted turn"
      ],
      hint: "Making the broken-endpointer turn have a faster model is the detail that matters \u2014 it is what makes aggregate duration actively misleading rather than merely uninformative.",
      solution: { lang: "python", title: "x1313.py \u2014 identical durations, three diseases",
        code: 'SPAN_ORDER = ["vad.endpoint", "asr.finalise", "llm.generate", "tts.first_chunk", "playout"]\n\nTURNS = {\n  "A healthy": {\n    "vad.endpoint":    (700, {"threshold_ms": 700, "semantic": False}),\n    "asr.finalise":    (120, {"confidence": 0.94, "partial_count": 4}),\n    "llm.generate":    (550, {"ttft_ms": 350, "tokens_out": 64}),\n    "tts.first_chunk": (180, {"chars": 48, "streamed": True}),\n    "playout":         (60,  {"buffer_ms": 60}),\n    "words_generated": 64, "words_played": 64, "barge_in": False,\n  },\n  "B patient endpointer": {\n    "vad.endpoint":    (1000, {"threshold_ms": 1000, "semantic": False}),\n    "asr.finalise":    (120, {"confidence": 0.93, "partial_count": 4}),\n    "llm.generate":    (310, {"ttft_ms": 180, "tokens_out": 64}),   # FASTER than A\n    "tts.first_chunk": (120, {"chars": 48, "streamed": True}),\n    "playout":         (60,  {"buffer_ms": 60}),\n    "words_generated": 64, "words_played": 64, "barge_in": False,\n  },\n  "C interrupted": {\n    "vad.endpoint":    (700, {"threshold_ms": 700, "semantic": False}),\n    "asr.finalise":    (120, {"confidence": 0.91, "partial_count": 5}),\n    "llm.generate":    (550, {"ttft_ms": 350, "tokens_out": 64}),\n    "tts.first_chunk": (180, {"chars": 48, "streamed": True}),\n    "playout":         (60,  {"buffer_ms": 60}),\n    "words_generated": 64, "words_played": 19, "barge_in": True,\n  },\n  "D recognition struggling": {\n    "vad.endpoint":    (700, {"threshold_ms": 700, "semantic": False}),\n    "asr.finalise":    (420, {"confidence": 0.58, "partial_count": 14}),\n    "llm.generate":    (370, {"ttft_ms": 260, "tokens_out": 64}),\n    "tts.first_chunk": (60,  {"chars": 48, "streamed": True}),\n    "playout":         (60,  {"buffer_ms": 60}),\n    "words_generated": 64, "words_played": 64, "barge_in": False,\n  },\n}\n\ndef total(t):\n    return sum(t[s][0] for s in SPAN_ORDER)\n\nfor name, t in TURNS.items():\n    print("   %-28s %15d ms" % (name, total(t)))\nspread = max(total(t) for t in TURNS.values()) - min(total(t) for t in TURNS.values())\nprint("   spread across all four: %d ms" % spread)',
        out: '================================================================================================\nFour turns. Look at the one number most dashboards carry.\n================================================================================================\n   turn                         time to first audio\n   A healthy                               1610 ms\n   B patient endpointer                    1610 ms\n   C interrupted                           1610 ms\n   D recognition struggling                1610 ms\n\n   spread across all four: 0 ms. they are the SAME turn as far as any duration\n   metric is concerned -- and three of the four are broken, in three different\n   ways, for three different reasons.\n\n================================================================================================\nThe same four turns, as a span tree\n================================================================================================\n\nturn: A healthy      TOTAL 1610 ms\n   vad.endpoint       700 ms  #######################  threshold_ms=700 semantic=False\n   asr.finalise       120 ms  ####                     confidence=0.94 partial_count=4\n   llm.generate       550 ms  ##################       ttft_ms=350 tokens_out=64\n   tts.first_chunk    180 ms  ######                   chars=48 streamed=True\n   playout             60 ms  ##                       buffer_ms=60\n   (turn)                      words_generated=64 words_played=64 barge_in=False\n\nturn: B patient endpointer      TOTAL 1610 ms\n   vad.endpoint      1000 ms  ######################## threshold_ms=1000 semantic=False\n   asr.finalise       120 ms  ####                     confidence=0.93 partial_count=4\n   llm.generate       310 ms  ##########               ttft_ms=180 tokens_out=64\n   tts.first_chunk    120 ms  ####                     chars=48 streamed=True\n   playout             60 ms  ##                       buffer_ms=60\n   (turn)                      words_generated=64 words_played=64 barge_in=False\n\nturn: C interrupted      TOTAL 1610 ms\n   vad.endpoint       700 ms  #######################  threshold_ms=700 semantic=False\n   asr.finalise       120 ms  ####                     confidence=0.91 partial_count=5\n   llm.generate       550 ms  ##################       ttft_ms=350 tokens_out=64\n   tts.first_chunk    180 ms  ######                   chars=48 streamed=True\n   playout             60 ms  ##                       buffer_ms=60\n   (turn)                      words_generated=64 words_played=19 barge_in=True\n\nturn: D recognition struggling      TOTAL 1610 ms\n   vad.endpoint       700 ms  #######################  threshold_ms=700 semantic=False\n   asr.finalise       420 ms  ##############           confidence=0.58 partial_count=14\n   llm.generate       370 ms  ############             ttft_ms=260 tokens_out=64\n   tts.first_chunk     60 ms  ##                       chars=48 streamed=True\n   playout             60 ms  ##                       buffer_ms=60\n   (turn)                      words_generated=64 words_played=64 barge_in=False\n\n================================================================================================\nWhat each pathology looks like, and which attribute names it\n================================================================================================\n\n   A healthy\n      signal: nothing wrong\n      endpoint 700 at 42% of the turn is the normal baseline\n\n   B patient endpointer\n      signal: vad.endpoint = 1000 ms, 62% of the turn\n      the model is FASTER here than in A (310 vs 550 ms) and the turn is no better. without a child span for endpointing, the only visible fact is that the model is quick -- so you would go and optimise the model.\n\n   C interrupted\n      signal: words_generated 64, words_played 19 -- 70% never heard\n      every latency span is identical to A. no timing metric anywhere can see this, and the history bug from 13.6 is silently active.\n\n   D recognition struggling\n      signal: asr.finalise 420 ms, confidence 0.58, partial_count 14\n      the recogniser revised 14 times and finished unsure. the entity is probably wrong, and 13.9 says WER will not show it.\n\n================================================================================================\nThe attribute only voice needs\n================================================================================================\nwords_generated vs words_played.\n\n   turn C generated 64 words and played 19 -- 70% of the response never\n   reached the user, and every latency span is byte-identical to the healthy turn.\n\n   it is the attribute that makes three separate things measurable:\n   1. whether the history truncation ran (13.6\'s silent bug)\n   2. the real interruption rate, which is the endpointing signal from 13.5\n   3. wasted TTS spend -- you were billed for 45 words of synthesis the user\n      never heard, which is 70% of this turn\'s TTS line\n\n   a text pipeline never needs this attribute, because generated and delivered\n   are the same thing. a voice pipeline cannot work without it.\n\n================================================================================================\nWhat to keep, and for how long\n================================================================================================\n   artefact                     retention                  why\n   span timings and attributes  90 days                    no PII; this is the debugging substrate\n   redacted transcript          30 days                    entities masked; enough to reconstruct a turn\n   raw transcript               7 days                     contains everything the caller said\n   audio                        7 days, consent-gated      biometric in many jurisdictions; the only thing that reproduces an ASR bug\n   audio in the eval set        indefinite, explicit consent 13.12 needs audio, so this set has to exist\n\nTHE TENSION: 13.12 says build the eval set from audio, and audio is the most\nsensitive thing in the system. the resolution is not to keep less audio, it is\nto keep a SMALL, CONSENTED, PERMANENT set for evaluation and a short rolling\nwindow for debugging -- two different stores with two different policies.',
        notes: [
          { t: "p", text: "**A spread of zero milliseconds across four turns, three of which are broken.** The duration metric that almost every voice dashboard carries reports these as the same turn. That is the case for per-stage spans, and it does not need an appeal to the general virtue of observability." },
          { t: "p", text: "**Turn B is actively misleading, not merely uninformative.** Its endpointing threshold is 1,000 ms \u2014 62% of the turn \u2014 and its model is *faster* than the healthy turn's, 310 ms against 550. With only aggregate duration the one visible fact is that the model is quick, so the natural conclusion is that the problem is elsewhere, and elsewhere is unmeasured. This is 13.3's finding in operational form: the data points away from the largest term." },
          { t: "p", text: "**Turn C's latency spans are byte-identical to the healthy turn's**, and 70% of its response never reached the user. Only `words_generated` against `words_played` separates them, which is why that pair is the voice-specific attribute worth adding first." },
          { t: "p", text: "**That one pair serves three unrelated purposes**: it says whether 13.6's history truncation ran, it gives the real interruption rate that 13.5's endpointing decision depends on, and it quantifies wasted synthesis \u2014 45 words billed and never heard, 70% of this turn's TTS line, and TTS is the largest line in the cost model. Three owners, one integer pair." },
          { t: "p", text: "**Turn D is the subtle one**: `partial_count` 14 and `confidence` 0.58 say the recogniser revised fourteen times and finished unsure, which is the signature of a probably-wrong entity. 13.9 showed WER will not surface that, so these two attributes are the cheapest available early warning on the error class that actually breaks tasks." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: a green dashboard and an agent nobody likes",
      body: [
        { t: "p", text: "A voice agent's dashboard shows median time to first audio at 820 ms against an 800 ms target \u2014 marginal but close \u2014 and a 99.4% success rate. Users describe it as slow and say it talks over them. Nobody can find anything wrong." },
        { t: "p", text: "Three checks, in order of how much they are likely to explain. **Where does the clock start?** If time to first audio is measured from the endpointer firing, the 820 ms excludes the endpointing wait entirely and the real figure is around 1,520 \u2014 and the giveaway is that there is no endpointing span on the dashboard at all, so the data contains no evidence of its own incompleteness. **Is there a words-played attribute?** \u201cTalks over them\u201d is an interruption complaint, and without that attribute the interruption rate is unmeasured, as is whether the history truncation is running. **What is p95?** A median is not an experience, and 13.1 showed a good median can still put a bad moment in most calls." },
        { t: "p", text: "The thing to notice is that all three are instrumentation gaps rather than system defects, and each one makes the system look better than it is. That is not a coincidence: metrics that exclude a stage, an event class or a distribution's tail are all biased in the flattering direction, which is why the boundary and the attribute list deserve the same scrutiny as the numbers." }
      ] }
  ],

  takeaways: [
    "**Four turns with identical 1,610 ms durations and three different diseases** \u2014 a spread of zero, which settles the case for per-stage spans.",
    "**The over-patient-endpointer turn had a faster model than the healthy one** (310 ms against 550), so aggregate duration is actively misleading rather than merely uninformative.",
    "**Five spans**: vad.endpoint, asr.finalise, llm.generate, tts.first_chunk, playout \u2014 each with attributes that exist because a specific diagnosis needs them.",
    "**threshold_ms and semantic on the endpoint span** put the largest term in the budget into the trace instead of a deploy manifest.",
    "**confidence and partial_count on the ASR span** are the cheapest early warning on the error class that breaks tasks \u2014 14 revisions at 0.58 confidence means a probably-wrong entity.",
    "**ttft_ms separate from total generation**, because prefill latency is a prompt and caching problem and generation rate is a model and load problem.",
    "**The streamed flag on TTS**, because an unstreamed chunk silently breaks barge-in and nothing else reveals it.",
    "**words_generated against words_played is the voice-specific attribute** \u2014 a text pipeline never needs it because generated and delivered are the same thing.",
    "**In the interrupted turn, 64 generated and 19 played**, with every latency span byte-identical to the healthy turn.",
    "**That one pair serves three owners**: whether history truncation ran, the real interruption rate, and 45 words of synthesis billed and never heard \u2014 70% of the turn's TTS line.",
    "**Measure time to first audio from end of speech**, or the largest term sits outside the metric \u2014 and the giveaway is the absence of an endpointing span.",
    "**That error is self-concealing**: the data contains no evidence of its own incompleteness, so the model stays the largest visible component.",
    "**Keep two audio stores**: a small, explicitly consented, permanent eval set and a short rolling debugging window \u2014 conflating them gives an unusable eval set or an indefensible policy.",
    "**Span attributes carry no PII and can be kept longest**, which is an argument for putting diagnosis into attributes rather than relying on the audio."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Four voice turns all have a time to first audio of 1,610 ms, and three are broken. What is the strongest conclusion?",
        options: [
          "The turns are equivalent in user experience, since the latency matches",
          "Aggregate duration carries no diagnostic information, so per-stage spans are required rather than merely useful",
          "1,610 ms is too slow regardless of the cause",
          "The measurement boundary must be wrong for all four"
        ],
        answer: 1,
        why: "A spread of zero across four turns with three unrelated pathologies means the aggregate is not a weak signal, it is no signal \u2014 so the case for spans does not rest on any general appeal to observability. It gets worse than uninformative in one case: the over-patient-endpointer turn has a faster model than the healthy turn, so the only visible fact points away from the actual defect." },

      { stem: "Which attribute distinguishes the interrupted turn from the healthy one?",
        options: [
          "A longer playout span, since the buffer had to be flushed",
          "words_generated against words_played \u2014 every latency span is identical",
          "A lower ASR confidence, since the interruption disrupted recognition",
          "The barge_in flag alone, with no other difference"
        ],
        answer: 1,
        why: "The interrupted turn's five latency spans are byte-identical to the healthy turn's, so no timing metric anywhere can separate them \u2014 64 words generated against 19 played is the only difference. That pair then serves three unrelated purposes: whether the history truncation from 13.6 ran, the real interruption rate that 13.5's endpointing decision depends on, and 45 words of synthesis billed but never heard." },

      { stem: "A dashboard shows a healthy median time to first audio and no endpointing span. What should you suspect?",
        options: [
          "That endpointing is fast enough not to warrant a span",
          "That the clock starts when the endpointer fires, so the largest term is outside the metric",
          "That the trace is sampled and the span was dropped",
          "That endpointing is handled by a separate service with its own dashboard"
        ],
        answer: 1,
        why: "The absence of the span and the healthy median are the same fact: if time to first audio is measured from the endpointer firing rather than from end of speech, then the 700-plus milliseconds of waiting is neither in the number nor represented as a child. The error is self-concealing \u2014 the data contains no evidence of its own incompleteness, so a team can correctly observe that the model is the largest visible component and optimise it for a year." },

      { stem: "13.12 requires an audio eval set, and audio is biometric data. How is that reconciled?",
        options: [
          "Store audio only in aggregate form, as acoustic features",
          "Two stores with two policies \u2014 a small, explicitly consented, permanent eval set and a short rolling debugging window",
          "Retain audio for the shortest period that any eval cycle needs",
          "Replace recorded audio with synthesised audio in the eval set"
        ],
        answer: 1,
        why: "The two requirements are different in kind rather than in degree: evaluation needs a small set to persist indefinitely so results stay comparable, and debugging needs recent calls regardless of which ones. One policy covering both is either too short for the eval set or too long for everything else. Note also that span attributes carry no PII and can be retained longest, which argues for putting diagnosis into attributes rather than relying on returning to the audio." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Observability for voice",
    questions: [
      { level: "core",
        q: "What spans and attributes would you emit for a voice turn?",
        strong: "A strong answer motivates each attribute by a diagnosis.",
        answer: [
          { t: "p", text: "Five child spans under the turn: the endpointing wait, ASR finalisation, model generation, the first TTS chunk, and playout. And attributes chosen because something specific needs them rather than for completeness." },
          { t: "p", text: "On the endpoint span, the threshold and whether it was semantic \u2014 that is the largest term in the budget and it is a config value I want in the trace, not in a deploy manifest, so I can compare the two endpointers in production. On ASR, confidence and partial count: fourteen revisions finishing at 0.58 confidence is the signature of an entity that is probably wrong, and since word error rate will not surface that, these two are the cheapest early warning on the error class that actually breaks tasks. On generation, time to first token separately from the total, because prefill latency is a prompt-size and caching problem while generation rate is a model and load problem. On TTS, characters because it is billed per character and is the largest cost line, and a streamed flag because an unstreamed chunk silently breaks barge-in and nothing else would reveal it. On playout, the buffer depth, because it appears in the latency budget and again in the barge-in budget and is usually whatever the library shipped with." },
          { t: "p", text: "Then at the turn level, the one attribute only voice needs: words generated against words actually played. In a text system those are the same thing so there is nothing to compare; in voice they diverge every time someone interrupts." },
          { t: "p", text: "The reason I would lead with that pair is what it is worth per unit of effort. It tells you whether the history truncation ran after an interruption, which is otherwise a completely silent bug. It gives you the real interruption rate, which is the input to the endpointing decision. And it quantifies synthesis you were billed for and the user never heard. Three concerns, three owners, one integer pair per turn." }
        ] },

      { level: "advanced",
        q: "Why is a single time-to-first-audio metric insufficient?",
        strong: "A strong answer uses the identical-duration construction.",
        answer: [
          { t: "p", text: "Because you can construct turns that are identical on it and broken in unrelated ways, and I did: four turns at exactly 1,610 milliseconds, a spread of zero. One healthy, one with a 1,000 millisecond endpointing threshold, one that got interrupted, one where recognition revised fourteen times and finished unsure. Three different fixes, three different owners, and the aggregate reports them as the same turn." },
          { t: "p", text: "The endpointing turn is the one I would highlight, because it is worse than uninformative. Its model is *faster* than the healthy turn's \u2014 310 milliseconds of generation against 550. So if the only instrumented component is the model, the single visible fact is that the model is quick, and the natural conclusion is that the problem must be elsewhere. Elsewhere is unmeasured, so attention comes back to the model. The data actively points away from a stage that is 62% of that turn." },
          { t: "p", text: "The interrupted turn is the other instructive one: its five latency spans are byte-identical to the healthy turn's, and 70% of the response never reached the user. There is no timing metric that can distinguish them, at any granularity, because the timings genuinely are the same. It takes a non-timing attribute." },
          { t: "p", text: "And I would check the measurement boundary before trusting any of it. If time to first audio starts when the endpointer fires rather than when the user stopped talking, the largest term is outside the number \u2014 and the giveaway is that there is no endpointing span at all, so the dashboard contains no evidence of its own incompleteness." }
        ] },

      { level: "advanced",
        q: "How long do you keep voice recordings?",
        strong: "A strong answer separates the eval set from the debugging window.",
        answer: [
          { t: "p", text: "Two stores with two policies, because the requirements differ in kind rather than in degree. Evaluation needs a small set to persist indefinitely so that results stay comparable release to release \u2014 and that set has to be audio, because a text eval scored the same agent at 100% where an audio eval scored it at 38%. Debugging needs recent calls regardless of which ones, and a short rolling window is enough: seven days, consent-gated." },
          { t: "p", text: "Trying to cover both with one policy gives you either an eval set that expires, which destroys comparability, or a seven-day retention applied to everything, which is hard to defend. So the eval set is small, explicitly consented, labelled with the consequential entities and the correct outcome, and kept. The rolling window is everything else and it ages out." },
          { t: "p", text: "Around them I would tier the other artefacts by sensitivity: span timings and attributes for ninety days since they carry no PII, a redacted transcript with entities masked for thirty, and the raw transcript for seven because it contains everything the caller said including things they did not intend to." },
          { t: "p", text: "The design consequence worth stating is that because span attributes are the thing you can keep longest, they should carry as much diagnostic power as possible. If the only way to understand a class of failure is to go back to the audio, then that class becomes undiagnosable after a week. Putting confidence, partial count and words-played into attributes means most investigations never need the recording at all." }
        ] }
    ]
  }
});
