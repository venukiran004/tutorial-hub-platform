EC.receiveLesson({
  id: "13.2",

  lede: "There are two ways to build a voice agent and the choice is usually made on the wrong grounds. The **cascade** runs speech recognition into a language model into speech synthesis: three services, three failure modes, a text transcript at every boundary. The **speech-native** model takes audio in and emits audio out, skipping two stages and about 730 milliseconds. The speech-native option is newer and faster and is therefore assumed to be better. Priced properly it is a latency purchase, and an expensive one \u2014 and the exercise finds something sharper than that: **applying the free optimisation first raises the price of the expensive option by 2.2x**, because it eats the cheapest part of the gap you were paying to close.",

  objectives: [
    "Describe both architectures stage by stage and say what each boundary gives you",
    "Name the four things the cascade's intermediate text is load-bearing for",
    "Price the speech-native latency advantage per second of latency saved",
    "Explain why a speech-native deployment still needs a transcription service",
    "Order architectural decisions after free optimisations rather than before"
  ],

  prerequisites: ["13.1"],

  blocks: [

    { t: "h2", n: "01", id: "cascade", text: "The cascade",
      sub: "Three services, and a text transcript between each pair" },

    { t: "p", text: "The cascade is the architecture nearly everyone starts with, for the good reason that it is assembled from components that already exist and that you can replace independently. Audio arrives, a recogniser turns it into text, the text goes into a language model exactly as a chat message would, and the response text goes into a synthesiser." },

    { t: "viz", title: "The cascaded pipeline",
      caption: "Four stages, two text boundaries. Every boundary is an inspection point and a place to lose time.",
      svg: '<svg viewBox="0 0 760 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cascaded voice pipeline with text boundaries">' +
        '<rect x="10" y="48" width="120" height="58" rx="6" fill="var(--accent)" opacity="0.18" stroke="var(--accent)"/>' +
        '<text x="70" y="72" class="s-label" text-anchor="middle">mic</text>' +
        '<text x="70" y="92" class="s-sub" text-anchor="middle">audio in</text>' +
        '<rect x="168" y="48" width="120" height="58" rx="6" fill="var(--violet)" opacity="0.18" stroke="var(--violet)"/>' +
        '<text x="228" y="72" class="s-label" text-anchor="middle">ASR</text>' +
        '<text x="228" y="92" class="s-sub" text-anchor="middle">120 ms</text>' +
        '<rect x="326" y="48" width="120" height="58" rx="6" fill="var(--warn)" opacity="0.18" stroke="var(--warn)"/>' +
        '<text x="386" y="72" class="s-label" text-anchor="middle">LLM</text>' +
        '<text x="386" y="92" class="s-sub" text-anchor="middle">550 ms</text>' +
        '<rect x="484" y="48" width="120" height="58" rx="6" fill="var(--good)" opacity="0.18" stroke="var(--good)"/>' +
        '<text x="544" y="72" class="s-label" text-anchor="middle">TTS</text>' +
        '<text x="544" y="92" class="s-sub" text-anchor="middle">180 ms</text>' +
        '<rect x="642" y="48" width="108" height="58" rx="6" fill="var(--accent)" opacity="0.18" stroke="var(--accent)"/>' +
        '<text x="696" y="72" class="s-label" text-anchor="middle">speaker</text>' +
        '<text x="696" y="92" class="s-sub" text-anchor="middle">60 ms</text>' +
        '<path d="M130 77 L164 77" class="s-stroke" marker-end="url(#a132)"/>' +
        '<path d="M288 77 L322 77" class="s-stroke" marker-end="url(#a132)"/>' +
        '<path d="M446 77 L480 77" class="s-stroke" marker-end="url(#a132)"/>' +
        '<path d="M604 77 L638 77" class="s-stroke" marker-end="url(#a132)"/>' +
        '<defs><marker id="a132" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">' +
        '<path d="M0 0 L8 4 L0 8 z" fill="var(--line)"/></marker></defs>' +
        '<text x="305" y="134" class="s-mono" text-anchor="middle" fill="var(--good)">TEXT</text>' +
        '<text x="465" y="134" class="s-mono" text-anchor="middle" fill="var(--good)">TEXT</text>' +
        '<line x1="305" y1="110" x2="305" y2="122" stroke="var(--good)"/>' +
        '<line x1="465" y1="110" x2="465" y2="122" stroke="var(--good)"/>' +
        '<text x="12" y="166" class="s-sub">each TEXT boundary is where you can log, redact, run a guardrail, cache,</text>' +
        '<text x="12" y="184" class="s-sub">A/B a prompt, swap a vendor or assert a schema \u2014 four of those are compliance</text>' +
        '<text x="12" y="202" class="s-sub">requirements in a regulated deployment, not conveniences</text>' +
        '<rect x="10" y="214" width="740" height="28" rx="4" fill="var(--crit)" opacity="0.1" stroke="var(--crit)" stroke-dasharray="4 3"/>' +
        '<text x="380" y="232" class="s-sub" text-anchor="middle">cost of those boundaries: 1,650 ms to first audio</text>' +
        '</svg>' },

    { t: "p", text: "The intermediate text is the whole argument for this architecture, and it is easy to undervalue until you need it. It is not a debugging convenience." },

    { t: "dl", items: [
      { k: "Inspection and guardrails", v: "Everything in module 11 operates on text. A PII redactor, a jailbreak classifier, a topic filter and an output schema check all need a string. With no text boundary you have nowhere to put them." },
      { k: "Independent substitution", v: "You can change ASR vendor on Monday and TTS voice on Tuesday without touching the model or the prompt. A single speech-native model is one vendor decision for all three capabilities at once." },
      { k: "Reuse of the text stack", v: "The prompt, the tool definitions, the eval suite, the caching layer and the observability you built for the chat product all transfer unchanged, because the middle stage is an ordinary chat completion." },
      { k: "Auditability", v: "A transcript is the record a dispute is resolved against. In a regulated deployment you need one regardless of architecture \u2014 which, as the exercise shows, has a cost consequence people miss." }
    ] },

    { t: "h2", n: "02", id: "native", text: "The speech-native model",
      sub: "Audio in, audio out, and prosody survives the trip" },

    { t: "p", text: "A speech-native model is trained on audio tokens directly. There is no transcription step and no synthesis step, so two stages and their serial latency disappear, and the model's time to first audio replaces the LLM's time to first token plus the TTS first chunk." },

    { t: "table",
      head: ["Stage", "Cascade", "Speech-native"],
      rows: [
        ["endpoint silence", "700 ms", "500 ms"],
        ["ASR finalisation", "120 ms", "\u2014"],
        ["network", "40 ms", "40 ms"],
        ["model first output", "550 ms", "320 ms"],
        ["TTS first chunk", "180 ms", "\u2014"],
        ["playout buffer", "60 ms", "60 ms"],
        ["**time to first audio**", "**1,650 ms**", "**920 ms**"]
      ] },

    { t: "callout", kind: "insight", title: "The endpointing row is doing more than it looks",
      body: [
        { t: "p", text: "Note that 200 of the 730 millisecond advantage is in the endpointing row, not in the removal of ASR and TTS. The speech-native model can commit to a shorter silence threshold because it hears prosody \u2014 falling pitch, a completed contour, the acoustic shape of a finished sentence \u2014 whereas a fixed VAD threshold on the cascade is counting silence and nothing else." },
        { t: "p", text: "That is a real advantage, and it is also the one you can replicate inside the cascade. 13.5 builds a semantic endpointer that does exactly this, and the exercise below shows what that does to the economics." }
      ] },

    { t: "p", text: "What you give up is everything in the list above, plus two things specific to the audio path. Prosodic control: a TTS engine can be directed, and a speech-native model's delivery is whatever it has learned. And the ability to put any text-based safety or formatting logic between thought and speech \u2014 the model's first audio token is already leaving for the speaker." },

    { t: "ladder", title: "How teams actually choose, worst to best",
      rungs: [
        { level: "bad", label: "Pick speech-native because it is newer",
          why: "The decision gets made on a demo of latency with no cost model, no guardrail story and no transcript. It reaches production and someone from compliance asks where the call recordings are transcribed, which turns out to be nowhere.",
          code: "# the decision record, in full:\n# 'realtime API felt much snappier in the demo'",
          note: "The demo is honest about latency and silent about everything else." },
        { level: "bad", label: "Pick the cascade and never measure it",
          why: "Also common, and the symptom is a 1,650 ms agent whose team believes voice is just inherently laggy. Nothing in the pipeline has been examined, so the 700 ms silence timer sits there as though it were a law of physics.",
          code: "VAD_SILENCE_MS = 700   # copied from the quickstart, 2 years ago",
          note: "The number that dominates the budget is usually a default nobody chose." },
        { level: "ok", label: "Compare them on latency",
          why: "Better, because it is a number. But latency alone makes speech-native win every time, and it does not surface the per-call cost, the shadow transcription you will still need, or the fact that part of the gap is free to close.",
          code: "cascade, native = 1650, 920\nprint('native wins by', cascade - native, 'ms')",
          note: "True, incomplete, and it will cost you $110k a month." },
        { level: "best", label: "Close the free gap, then price what remains",
          why: "Apply the optimisations that cost nothing per call \u2014 the semantic endpointer, streaming from the first clause \u2014 and only then price the remaining gap. The exercise shows this moves the cost of the speech-native option from $0.0507 to $0.1121 per second of latency saved, which is often the number that changes the decision.",
          code: "cascade_opt = 1650 - 400          # semantic endpointer, $0/call\nTURNS      = 10                   # the saving lands on every turn\npremium    = native_cost - cascade_cost\nprint('$ per second saved:', premium / (TURNS * (cascade_opt - 920) / 1000))",
          note: "Same prices, same models, a 2.2x different answer \u2014 because of the order you did the work in." }
      ] },

    { t: "h2", n: "03", id: "shadow", text: "The transcript you need anyway",
      sub: "Why speech-native does not actually remove the ASR bill" },

    { t: "p", text: "This is the detail that breaks most speech-native cost models. You still need a transcript \u2014 for quality review, for dispute resolution, for the eval set, for any text-based guardrail, and in a regulated industry because you are required to have one. So you run speech recognition over the call anyway." },

    { t: "p", text: "The good news is that this transcription is **off the critical path**. It can run after the call, in batch, at a cheaper tier, and it adds zero latency. The bad news is that it costs the same money as it did in the cascade, so the speech-native architecture removes the ASR *latency* and keeps the ASR *bill*." },

    { t: "callout", kind: "trap", title: "The TTS line does not disappear either, it is bundled",
      body: [
        { t: "p", text: "A speech-native model's audio output tokens are priced far above its text tokens, because you are buying synthesis as part of the inference. The TTS line has not gone away; it has moved inside a number with no itemisation, which makes it harder to optimise rather than cheaper. In the cascade you can switch to a cheaper voice for the 80% of responses that are routine. In a speech-native model you cannot, because there is no voice to switch." }
      ] },

    { t: "h2", n: "04", id: "choose", text: "Choosing",
      sub: "The cases where each is clearly right" },

    { t: "table",
      head: ["Situation", "Choose", "Because"],
      rows: [
        ["Regulated: health, finance, legal", "cascade", "guardrails and transcripts need text boundaries, and you cannot bolt them on"],
        ["Tool-heavy task agent", "cascade", "tool-call correctness is a text problem, and the whole text eval suite transfers"],
        ["Natural conversation is the product", "speech-native", "prosody, laughter and interruption handling survive; a transcript throws them away"],
        ["Latency is the differentiator and margin is wide", "speech-native", "730 ms is real, and if you can afford it you should spend it"],
        ["High call volume, thin margin", "cascade", "the exercise prices the premium at $110k/month at 10k calls/day"],
        ["Multilingual with code-switching", "speech-native", "no transcription language to commit to mid-utterance"],
        ["You have not measured anything yet", "cascade", "it is the one you can instrument, and 13.3 shows most of the gap is free"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Hybrid: the cascade with a speech-native front half",
      body: [
        { t: "p", text: "The two are not strictly exclusive. A production pattern worth knowing is to use a speech-native model as the *listener* \u2014 it endpoints on prosody and produces both a transcript and a turn-complete signal \u2014 while the response path stays textual through your existing LLM and TTS. You buy the 200 ms endpointing advantage and the prosodic turn detection, and keep every text boundary on the output side where the guardrails live." },
        { t: "p", text: "It costs you an extra model in the path and the engineering to run two, which is why it tends to appear in a second-generation system rather than a first." }
      ] },

    { t: "exercise", kind: "analysis", title: "Price the 730 milliseconds",
      difficulty: "advanced", minutes: 24,
      body: "Build a cost comparison for a 3-minute call under both architectures, remembering that the speech-native deployment still needs a transcript for logging and QA. Express the speech-native premium as dollars per second of latency saved. Then apply the semantic endpointer from 13.5 to the cascade \u2014 which costs nothing per call \u2014 and recompute. The second number is the one that should drive the decision.",
      requirements: [
        "Price the cascade from the module's figures: ASR per minute, TTS per 1,000 characters, LLM per token",
        "Price the speech-native model per minute of audio in and out, and add shadow ASR for logging",
        "Report the premium as $/call and as $/second of latency saved",
        "Scale to 10,000 calls a day and state the monthly premium",
        "Recompute after a semantic endpointer cuts the cascade to 1,250 ms, and explain what changed"
      ],
      hint: "The agent speaks for roughly a third of a call, so audio output minutes and audio input minutes are not equal. Nothing in the second half changes a price \u2014 only the size of the gap being bought.",
      solution: { lang: "python", title: "x1302.py \u2014 the premium, before and after the free fix",
        code: 'CASCADE_MS, NATIVE_MS = 1650, 920\nMINUTES, AGENT_TALK_MIN = 3.0, 1.0\nTURNS = 10                         # a 3-minute call is roughly 10 exchanges\n\n# cascade, from the module cost block\nasr = MINUTES * 0.006\ntts = 1800 / 1000.0 * 0.015\nllm = 4200 / 1e6 * 3.0 + 700 / 1e6 * 15.0\ncascade = asr + tts + llm\n\n# speech-native: illustrative audio-token prices, per minute of audio\nAUDIO_IN_PER_MIN, AUDIO_OUT_PER_MIN = 0.06, 0.24\nnative_model = MINUTES * AUDIO_IN_PER_MIN + AGENT_TALK_MIN * AUDIO_OUT_PER_MIN\nshadow_asr = MINUTES * 0.006       # still needed for logging and QA\nnative = native_model + shadow_asr\n\nd_cost, d_ms = native - cascade, CASCADE_MS - NATIVE_MS\n# the premium is billed per CALL; the saving lands on every TURN\nprint("premium $%.4f/call, %d ms saved on each of %d turns = %.1f s"\n      % (d_cost, d_ms, TURNS, TURNS * d_ms / 1000.0))\nprint("  = $%.4f per second of latency saved"\n      % (d_cost / (TURNS * d_ms / 1000.0)))\nprint("at 10,000 calls/day: $%.0f/month" % (d_cost * 10000 * 30))\n\n# now the free fix: a semantic endpointer, 700 ms wait -> 300 ms timer\nSEM_MS = CASCADE_MS - 400\nd_ms2 = SEM_MS - NATIVE_MS\nprint("after the free fix the premium buys %d ms, not %d" % (d_ms2, d_ms))\nprint("$/s saved: %.4f -> %.4f (%.1fx)"\n      % (d_cost / (TURNS * d_ms / 1000.0), d_cost / (TURNS * d_ms2 / 1000.0),\n         float(d_ms) / d_ms2))',
        out: '============================================================================================\nWhat does the speech-native model\'s 730 ms actually cost?\n============================================================================================\n(audio-token prices are illustrative; the STRUCTURE of the answer is the point)\n\n                                      cascade speech-native\nASR                                   $0.0180    $0.0180\n  (native: off critical path,                           \n   still needed for logging/QA)                         \nTTS                                   $0.0270   included\nLLM / speech model                    $0.0231    $0.4200\nTOTAL per 3-minute call               $0.0681    $0.4380\ntime to first audio                   1650 ms     920 ms\n\nthe premium is $0.3699 per call. the 730 ms is saved on EVERY turn, so over a\n10-turn call it buys 7.3 seconds of total waiting removed:\n   $0.3699 / 7.3 s = $0.0507 per second of latency saved.\n   (equivalently $0.03699 of premium per turn, for 730 ms per turn)\nat 10,000 calls a day that is $3699/day, $110970/month, to be 730 ms faster.\n\n--------------------------------------------------------------------------------------------\nNOW APPLY THE FREE FIX FIRST\n--------------------------------------------------------------------------------------------\na semantic endpointer cuts the cascade\'s 700 ms wait to a 300 ms timer at the\nSAME interruption rate (3.0%), and costs nothing per call. so:\n\n   cascade, fixed 700 ms endpointer         1650 ms  $0.0681\n   cascade, semantic endpointer             1250 ms  $0.0681\n   speech-native + shadow ASR                920 ms  $0.4380\n\nthe free fix took 400 of the 730 ms. the speech-native premium now buys only the\nremaining 330 ms -- the same $0.3699 for 45.2% as much benefit:\n\n   before the free fix                          $ 0.0507 per second saved\n   after the free fix                           $ 0.1121 per second saved\n   the price of the expensive option rose 2.2x without anyone changing a price.\n\nTHE POINT: the cheap fix does not just save money, it re-prices the expensive\none. evaluate architectures AFTER the free optimisations, never before, or you\nwill buy a speech-native model to solve a problem your endpointer was causing.\n\n(normalising per TURN matters: the premium is billed per call and the benefit\nlands on every turn, so dividing the call premium by one turn\'s saving would\noverstate the unit cost 10x. the 2.2x ratio above is unaffected either way,\nbecause the turn count cancels -- but the absolute figure is not.)',
        notes: [
          { t: "p", text: "The headline premium is $0.3699 per call \u2014 the speech-native path costs 6.4x the cascade, because audio output tokens are priced far above text and the shadow ASR bill does not go away." },
          { t: "p", text: "Normalising matters here and it is easy to get wrong. The premium is billed per call; the 730 ms is saved on every turn. Over a 10-turn call that is 7.3 seconds of waiting removed for $0.3699, so **$0.0507 per second of latency saved** — dividing the call premium by a single turn's 730 ms would overstate the unit cost tenfold. Scaled, it is $3,699 a day and $110,970 a month at 10,000 calls a day." },
          { t: "p", text: "The second half is the real finding. The semantic endpointer takes 400 of the 730 ms at zero per-call cost, so the same $0.3699 now buys only the remaining 330 ms \u2014 45.2% of the original benefit. The price per second of latency saved rises from $0.0507 to $0.1121, a 2.2x increase, without any vendor changing any price. (That ratio is the one figure immune to the turn-count assumption, because the turns cancel.)" },
          { t: "p", text: "Generalised: a cheap optimisation does not only save money, it re-prices every expensive option that was competing to solve the same problem. So architectural comparisons belong after the free optimisations, never before. Run it the other way round and you will buy a speech-native model to fix a problem your endpointer was causing." },
          { t: "p", text: "The audio-token prices here are illustrative and move often; the structure of the answer does not. If your own prices differ, the two numbers to recompute are the per-second figure and its ratio before and after the free fix." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: the demo that costs $110k a month",
      body: [
        { t: "p", text: "An engineer demos a speech-native prototype against your production cascade. It is visibly snappier and the room is convinced. You are asked to approve the migration." },
        { t: "p", text: "The comparison is real but incomplete in three ways. It priced nothing \u2014 at your volume the premium is around $110,000 a month. It assumed the ASR bill disappears, and it does not, because you need a transcript for QA and dispute resolution regardless. And it compared against an unoptimised cascade, which is the error that matters most: 400 of the 730 ms is available for free from a semantic endpointer, so the demo is partly showing you the cost of your own untouched default." },
        { t: "p", text: "The constructive answer is not no. It is: build the endpointer first, which is four weeks and no marginal cost, then re-run this demo. If the remaining 330 ms is still worth $110,000 a month to the business, that is a legitimate decision \u2014 and now it is one, rather than a reaction to a demo." }
      ] }
  ],

  takeaways: [
    "**The cascade is ASR \u2192 LLM \u2192 TTS with a text boundary at each join**; speech-native takes audio in and emits audio out.",
    "**The intermediate text is the cascade's real product**: guardrails, independent vendor substitution, reuse of the text stack, and auditability.",
    "**Speech-native saves 730 ms** \u2014 1,650 to 920 \u2014 but 200 of that is the endpointing row, which the cascade can also have.",
    "**A speech-native deployment still needs transcription** for QA, disputes and evals; it moves off the critical path but stays on the bill.",
    "**TTS cost does not vanish under speech-native**, it is bundled into audio output tokens \u2014 harder to optimise, not cheaper.",
    "**Measured premium: $0.3699/call, 6.4x the cascade** — $0.0507 per second of latency saved, normalising the per-call premium over a 10-turn call.",
    "**At 10,000 calls a day that is $110,970 a month** to be 730 ms faster.",
    "**After a free semantic endpointer the premium buys only 330 ms**, and the price rises to $0.1121 per second saved \u2014 2.2x, with no price change anywhere.",
    "**So a cheap fix re-prices the expensive alternatives** competing for the same problem; compare architectures after the free optimisations.",
    "**Choose the cascade when regulated, tool-heavy, high-volume or unmeasured**; speech-native when natural conversation is the product and margin is wide."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A team moves from a cascade to a speech-native model and budgets for the ASR line disappearing. What is wrong with that?",
        options: [
          "Nothing \u2014 removing the ASR stage removes its cost",
          "ASR cost rises under speech-native because audio must be re-encoded",
          "A transcript is still needed for QA, disputes, evals and text guardrails, so the ASR bill stays while its latency goes",
          "The ASR line is small enough that the error does not matter"
        ],
        answer: 2,
        why: "Transcription moves off the critical path \u2014 it can run after the call, in batch, at a cheaper tier \u2014 but the requirement for a transcript does not come from the architecture, it comes from quality review, dispute resolution, eval construction and any text-based guardrail. So the latency is removed and the cost is not, which is why the honest comparison includes a shadow ASR line on the speech-native side." },

      { stem: "Of the 730 ms advantage speech-native has over the cascade, how much comes from removing the ASR and TTS stages?",
        options: [
          "All 730 ms \u2014 those are the two stages that were removed",
          "530 ms; the other 200 ms is the shorter endpointing threshold a prosody-aware model can use",
          "300 ms; the rest is the faster model",
          "It cannot be decomposed, because the stages are not comparable"
        ],
        answer: 1,
        why: "ASR finalisation (120) plus the TTS first chunk (180) is 300 ms, and the model's first output is 230 ms faster (550 against 320), totalling 530. The remaining 200 ms is the endpointing row: 700 against 500, because a model that hears prosody can commit to end-of-turn sooner than a timer counting silence. That row matters disproportionately because it is the one a cascade can replicate with a semantic endpointer." },

      { stem: "Applying a free semantic endpointer to the cascade raised the speech-native premium from $0.0507 to $0.1121 per second of latency saved. Why?",
        options: [
          "The endpointer adds per-call inference cost, which is charged to the comparison",
          "The numerator grew because the cascade got cheaper to run",
          "The premium is unchanged but the gap it buys shrank from 730 ms to 330 ms",
          "Semantic endpointing degrades the speech-native model's advantage directly"
        ],
        answer: 2,
        why: "Nothing in the numerator changed \u2014 the premium is $0.3699 either way, and the endpointer costs nothing per call. The denominator shrank: the cascade went from 1,650 to 1,250 ms, so the remaining gap to 920 is 330 rather than 730. Same money, 45.2% of the benefit, hence 2.2x the unit price \u2014 which is the general point that a cheap fix re-prices every expensive option aimed at the same problem." },

      { stem: "For a voice agent in a regulated industry that calls several internal tools, which architecture and why?",
        options: [
          "Speech-native, because lower latency reduces call duration and therefore cost",
          "The cascade, because guardrails, redaction, schema checks and audit all need a text boundary",
          "Either \u2014 the architecture is independent of the compliance requirements",
          "Speech-native with a text model called in parallel for validation"
        ],
        answer: 1,
        why: "Both constraints point the same way. Every mechanism in module 11 \u2014 PII redaction, jailbreak classification, topic filtering, output schema validation \u2014 operates on strings, and with no text boundary there is nowhere to run them. Tool-call correctness is likewise a text problem, and the existing text eval suite transfers unchanged. The cascade's 730 ms is a real cost here, but most of it is recoverable through endpointing and streaming rather than through architecture." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Choosing an architecture",
    questions: [
      { level: "core",
        q: "Cascade or speech-native \u2014 how would you decide?",
        strong: "A strong answer prices the latency rather than asserting a preference.",
        answer: [
          { t: "p", text: "I would decide on three things in order: whether I need text boundaries, what the latency is worth in money, and whether I have already taken the free latency first." },
          { t: "p", text: "The text boundaries question is often decisive on its own. The cascade puts a transcript between recognition and the model and between the model and synthesis, and that is where PII redaction, jailbreak classification, schema validation and audit logging live. In a regulated deployment there is nowhere else to put them, so the decision is made. It also means the prompt, the tool definitions, the eval suite and the observability from the text product all transfer, because the middle stage is an ordinary chat completion." },
          { t: "p", text: "If I am not constrained that way, I price it. When I worked a 3-minute call, the cascade came to about seven cents and speech-native to about forty-four, including the shadow transcription you still need for quality review. That is $0.37 a call for 730 milliseconds on every turn — about 7.3 seconds of waiting removed across a ten-turn call, so roughly $0.05 per second of latency saved, or around $111,000 a month at ten thousand calls a day. That is not an argument against it \u2014 if natural conversation is the product and the margin is there, 730 milliseconds is worth real money. It is an argument for knowing the number before the meeting." },
          { t: "p", text: "The third point is the one I would actually lead with if I were advising a team. 400 of that 730 milliseconds is available inside the cascade for free, from a semantic endpointer. So I would close the free gap first and re-run the comparison, because otherwise you are partly pricing your own untuned default." }
        ] },

      { level: "advanced",
        q: "You said closing the free gap first changes the decision. Spell out why.",
        strong: "A strong answer shows the premium is unchanged and the denominator moved.",
        answer: [
          { t: "p", text: "Because the cost of the expensive option is fixed and the benefit it buys is not. The speech-native premium is about $0.37 a call whatever else you do. What varies is how large a latency gap that $0.37 is closing, and that depends entirely on how good the thing you are comparing against is." },
          { t: "p", text: "Concretely: against an untuned cascade at 1,650 milliseconds, $0.37 buys 730 milliseconds a turn, which is about $0.05 per second saved. Build the semantic endpointer \u2014 four weeks of work, nothing per call, and it cuts the 700 millisecond silence wait to a 300 millisecond timer at the same interruption rate \u2014 and the cascade is at 1,250. Now the same $0.37 buys 330 milliseconds. That is 45% of the benefit for 100% of the cost, so the unit price goes from about $0.05 to about $0.11 per second, a 2.2x increase, and no vendor changed a price." },
          { t: "p", text: "The general form is that a cheap optimisation re-prices every expensive option competing to solve the same problem, because they are substitutes for the same millisecond. This is why I would sequence it as: free fixes, measure, then architecture. Run it the other way and the risk is specific \u2014 you buy a speech-native model to solve a latency problem your own endpointing default was creating, and you keep paying for it monthly." },
          { t: "p", text: "One caveat I would state: the four weeks is not free, even though the per-call cost is. If latency is blocking a launch next month, buying it is a legitimate choice. The mistake is not buying it, it is buying it without knowing that 55% of what you paid for was available for nothing." }
        ] },

      { level: "core",
        q: "What does a speech-native model do better that a cascade cannot recover?",
        strong: "A strong answer names what the transcript destroys.",
        answer: [
          { t: "p", text: "Everything a transcript throws away. The cascade's text boundary is its great strength and it is lossy in one direction: prosody does not survive it. Tone, hesitation, emphasis, laughter, whether the sentence was a question or a flat statement, whether the caller is frustrated \u2014 all of that is in the audio and none of it is in the string the model sees. A speech-native model has it." },
          { t: "p", text: "On the output side the same thing applies in reverse. A speech-native model's delivery can carry hesitation and emphasis that match what it is saying, where a TTS engine is reading a finished string and has to infer delivery from punctuation." },
          { t: "p", text: "Then there are two structural advantages. Turn detection is better because the model can use the acoustic shape of a completed sentence rather than counting silence \u2014 that is the 200 millisecond endpointing difference. And multilingual code-switching mid-utterance works without committing to a transcription language." },
          { t: "p", text: "What I would not claim is that the cascade can never approximate these. You can feed a prosody feature vector alongside the transcript, and you can run a separate turn-detection model, which is the hybrid pattern where a speech-native model does the listening and a text pipeline does the responding. But those are additions you build, and in a speech-native model they are the default." }
        ] }
    ]
  }
});
