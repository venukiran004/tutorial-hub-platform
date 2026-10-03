EC.receiveLesson({
  id: "13.7",

  lede: "Every stage of a voice pipeline can emit partial results, and overlapping them turns a serial 3.2-second response into a 1.6-second one. That part is well understood. What 13.4 established is the part that is not: **overlapping stages changes time to first audio by exactly zero milliseconds**, because the first-audio path is a hard dependency chain. The only mechanism that moves the head of the turn is **speculative prefill** \u2014 start prefilling on the partial transcript and discard it if the user keeps talking. It is usually described as the cheapest large win available, and it is, but only once gated: speculating on every partial does eight prefills a turn and works out at **$0.504 per second of latency saved, nearly ten times the price of the speech-native architecture everybody calls expensive.**",

  objectives: [
    "Describe what each stage of the pipeline can emit before it is finished",
    "Distinguish overlapping work from removing a dependency",
    "Explain how speculative prefill breaks the endpointing dependency",
    "Price the discarded work a speculative optimisation performs",
    "Gate speculation and make its stable prefix cacheable"
  ],

  prerequisites: ["13.4", "13.5"],

  blocks: [

    { t: "h2", n: "01", id: "partials", text: "Everything can be partial",
      sub: "Four stages, four kinds of incomplete output" },

    { t: "p", text: "The naive pipeline treats each stage as a function: audio in, transcript out; transcript in, response out; response in, audio out. Every stage waits for its predecessor to finish. The streamed pipeline treats each stage as a generator, and every one of them has something useful to say before it is done." },

    { t: "table",
      head: ["Stage", "What it can emit early", "What that enables"],
      rows: [
        ["ASR", "partial hypotheses, revised as more audio arrives", "speculative prefill, live captions, early intent detection"],
        ["LLM", "tokens as they are sampled", "synthesis can start on the first clause, not the last"],
        ["TTS", "audio chunks per clause", "playout starts before synthesis finishes"],
        ["playout", "nothing \u2014 it is the sink", "but it can be flushed, which is what makes barge-in possible"]
      ] },

    { t: "p", text: "The clause boundary is the unit that matters in the middle. You do not want to synthesise token by token, because a synthesiser needs enough context to get prosody right \u2014 pitch, stress and the shape of a phrase depend on where the phrase ends. A clause, roughly twelve tokens, is the smallest unit that sounds natural, which is where the 200 ms \u201cLLM first clause\u201d line in the budget comes from." },

    { t: "callout", kind: "good", title: "Streaming is what makes barge-in possible at all",
      body: [
        { t: "p", text: "Worth stating because it is an argument for streaming that has nothing to do with latency. If you synthesise the whole response into one audio blob and hand it to the player, you cannot meaningfully interrupt it \u2014 there is nothing to cancel and nothing to flush but the whole thing." },
        { t: "p", text: "Chunked synthesis gives you a cancellation point every clause, which is what 13.6's 160 ms budget assumes exists. So streaming is a precondition for interactivity even in a system where nobody cares about the response time." }
      ] },

    { t: "h2", n: "02", id: "overlap", text: "What overlap is worth",
      sub: "A lot for the response, nothing for the first audio" },

    { t: "p", text: "Overlapping the stages compresses the response substantially. In 13.4's simulation, the full response went from 2,410 ms serial to 1,990 ms streamed \u2014 420 ms, and the gap widens with the length of the answer, because every additional clause in a serial pipeline is additive and in a streamed one is hidden behind the synthesis of the previous clause." },

    { t: "p", text: "And time to first audio was 1,650 ms in both. Not approximately \u2014 identically, to the millisecond. This is the single most important fact in the lesson and it is worth being precise about why: the path to the first sound is endpointing, then finalisation, then network, then prefill, then one clause, then synthesis, then playout, and each of those genuinely requires its predecessor's output. There is nothing to overlap. A chain with no parallelism available cannot be compressed by scheduling it better." },

    { t: "callout", kind: "trap", title: "The project that improves nothing visible",
      body: [
        { t: "p", text: "A team adds partial transcripts, token streaming and chunked synthesis over a quarter. Total response time improves by 420 ms. Barge-in becomes possible. Long answers get dramatically better. Time to first audio, which is the number on the dashboard and in the OKR, does not move at all." },
        { t: "p", text: "The work was correct and valuable and the promise was wrong. Name the metric a project moves before starting it: **streaming improves the tail of a response, speculation and endpointing improve the head.**" }
      ] },

    { t: "h2", n: "03", id: "speculate", text: "Speculative prefill",
      sub: "The only thing that shortens the head of the turn" },

    { t: "p", text: "To move first audio you have to remove a link from the chain rather than overlap it, and speculative prefill removes one. The observation is that during the endpointing window \u2014 700 ms of deliberate waiting \u2014 the pipeline is doing nothing at all, and it already has a partial transcript that is probably close to final. So prefill on it. If the user carries on talking, discard the work and prefill again later; if they have finished, most of the prompt is already processed and only the corrected tail remains." },

    { t: "code", lang: "python", title: "Prefill during the silence you are already waiting out",
      code: 'async def handle_turn(stream):\n    speculative = None\n\n    async for event in stream:\n        if event.kind == "partial":\n            # a pause has started and the partial looks like a complete thought:\n            # prefill the prompt now, while the endpointer is still waiting\n            if should_speculate(event):\n                if speculative:\n                    speculative.cancel()        # a newer partial supersedes it\n                speculative = prefill(build_prompt(event.text))\n\n        elif event.kind == "final":\n            # the committed answer must come from the FINAL transcript\n            prompt = build_prompt(event.text)\n            if speculative and speculative.prefix_matches(prompt):\n                await generate(prompt, reuse=speculative)   # only the tail is new\n            else:\n                await generate(prompt)                      # speculation wasted\n\ndef should_speculate(event):\n    """Gate it. Speculating on every partial is the expensive mistake."""\n    return event.silence_ms > 200 and event.looks_syntactically_complete',
      hl: [6, 7, 8, 9, 19, 20],
      caption: "The two lines that matter are the gate in should_speculate and prefix_matches, which decides whether the work was reusable." },

    { t: "p", text: "The saving depends entirely on how much of the speculative prefill survives. If the partial transcript's prefix is byte-identical to the final prompt's prefix, everything up to the divergence point is reusable. 13.4 measured the range: **175 ms if half the prefill is reusable, 290 ms if nearly all of it is**, and which you get is a property of your traffic rather than your code." },

    { t: "callout", kind: "insight", title: "What speculation does not remove",
      body: [
        { t: "p", text: "ASR finalisation and the network round trip stay on the critical path, because the committed answer has to be generated from the final transcript \u2014 you cannot answer the partial, you can only pre-process it. And endpointing does not move at all. After a conservative speculative prefill, the endpointing wait is still 47.5% of the remaining budget." },
        { t: "p", text: "So this is a genuine win and it is not the big one. 13.5's semantic endpointer is worth 400 ms against speculation's 175, it composes with it, and it costs nothing per call." }
      ] },

    { t: "h2", n: "04", id: "waste", text: "The bill nobody looks at",
      sub: "A discarded prefill costs exactly as much as a used one" },

    { t: "p", text: "Here is the part that is routinely missed, and it is not a small correction. A speculative prefill that gets thrown away is billed identically to one that gets used \u2014 the tokens were processed. So the policy governing *when* to speculate is a cost decision disguised as a latency decision, and the naive policy is very expensive." },

    { t: "p", text: "A turn produces around seven partial transcripts. Speculating on each means eight prefills where one was needed. The prefill is 4,200 input tokens, so the per-turn prefill bill goes from $0.0126 to $0.1008 \u2014 and the latency bought is 175 ms." },

    { t: "viz", title: "Latency bought, and what it cost",
      caption: "Gating cuts the waste; caching nearly eliminates it. Ungated speculation is the worst-value purchase in the module.",
      svg: '<svg viewBox="0 0 760 310" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cost per second of latency saved across speculation policies">' +
        '<text x="12" y="18" class="s-label">$ PER SECOND OF LATENCY SAVED (per turn, log-ish scale)</text>' +
        '<line x1="150" y1="34" x2="150" y2="214" class="s-stroke"/>' +
        '<rect x="150" y="42" width="580" height="26" fill="var(--crit)" opacity="0.32" stroke="var(--crit)"/>' +
        '<text x="144" y="60" class="s-mono" text-anchor="end">every partial</text>' +
        '<text x="740" y="60" class="s-mono" text-anchor="end" fill="var(--crit)">$0.504</text>' +
        '<rect x="150" y="80" width="137" height="26" fill="var(--warn)" opacity="0.32" stroke="var(--warn)"/>' +
        '<text x="144" y="98" class="s-mono" text-anchor="end">gate &gt; 200ms</text>' +
        '<text x="295" y="98" class="s-mono" fill="var(--warn)">$0.119</text>' +
        '<rect x="150" y="118" width="67" height="26" fill="var(--warn)" opacity="0.2" stroke="var(--warn)"/>' +
        '<text x="144" y="136" class="s-mono" text-anchor="end">gate &gt; 350ms</text>' +
        '<text x="225" y="136" class="s-mono" fill="var(--warn)">$0.058</text>' +
        '<rect x="150" y="156" width="58" height="26" fill="var(--accent)" opacity="0.3" stroke="var(--accent)"/>' +
        '<text x="144" y="174" class="s-mono" text-anchor="end">speech-native</text>' +
        '<text x="216" y="174" class="s-mono" fill="var(--accent)">$0.051</text>' +
        '<rect x="150" y="194" width="29" height="26" fill="var(--good)" opacity="0.35" stroke="var(--good)"/>' +
        '<text x="144" y="212" class="s-mono" text-anchor="end">gated + cached</text>' +
        '<text x="187" y="212" class="s-mono" fill="var(--good)">$0.025</text>' +
        '<line x1="208" y1="34" x2="208" y2="232" stroke="var(--accent)" stroke-dasharray="4 4"/>' +
        '<text x="214" y="246" class="s-sub" fill="var(--accent)">the architecture everyone calls expensive</text>' +
        '<text x="12" y="274" class="s-sub">the \u201ccheap\u201d optimisation, ungated, is 9.9x the price per second of the</text>' +
        '<text x="12" y="292" class="s-sub">\u201cexpensive\u201d one \u2014 and the difference is entirely policy, not capability</text>' +
        '</svg>' },

    { t: "p", text: "Two fixes, and they compose. **Gate it**: only speculate once a pause has already lasted long enough to look like an ending, which cuts seven speculations a turn to under two. **Cache the stable prefix**: the system prompt and conversation history are byte-identical across every speculation within a turn, so they should be read from cache rather than reprocessed, leaving only the partial transcript's tail as new tokens." },

    { t: "callout", kind: "warn", title: "The most common way teams destroy their own cache hit rate",
      body: [
        { t: "p", text: "Prompt caching requires a byte-identical prefix. Putting a timestamp, a turn counter, a request id or a randomised instruction ordering at the **top** of the prompt invalidates the cache on every single call, and the symptom is a cache hit rate near zero with no error anywhere." },
        { t: "p", text: "Anything volatile belongs at the end, after the stable system prompt and history. This matters far more in voice than in chat, because a voice turn may prefill the same prefix several times within one turn, so the cache is doing proportionally more work." }
      ] },

    { t: "exercise", kind: "analysis", title: "Price four speculation policies",
      difficulty: "advanced", minutes: 26,
      body: "Price speculative prefill under four policies: speculate on every partial, gate on pauses over 200 ms, gate on pauses over 350 ms, and gate on 200 ms with prompt caching on the stable prefix. Express each as dollars per call and dollars per second of latency saved, and compare against the speech-native premium from 13.2. Then say what the comparison implies about which optimisations are actually cheap.",
      requirements: [
        "Price one prefill at 4,200 input tokens and $3 per million",
        "Use 7 partials per turn, and derive the gated counts from the pause distribution",
        "Treat a discarded prefill as costing exactly the same as a used one",
        "Model prompt caching with 88% of the prompt stable and cached reads at 10% of input price",
        "Report $/second of latency saved for each policy against the 175 ms saving",
        "Compare with the speech-native figure from 13.2, keeping both normalised per turn"
      ],
      hint: "The gated counts come from the same lognormal pause model as 13.5: the expected number of speculations is the number of candidate pauses times the probability a pause exceeds the gate.",
      solution: { lang: "python", title: "x1307.py \u2014 the latency is cheap, the waste is not",
        code: 'import math\n\nMEDIAN_PAUSE, SIGMA = 220.0, 0.75\nPARTIALS_PER_TURN, PAUSES_PER_TURN = 7, 3\nPROMPT_TOKENS, PRICE_IN = 4200, 3.0 / 1e6\nSTABLE_FRACTION, CACHE_READ_DISCOUNT = 0.88, 0.10\nSAVING_MS = 175                       # the conservative figure from 13.4\nNATIVE_PER_S = 0.0507                 # 13.2, normalised per turn\n\ndef p_pause_exceeds(t):\n    z = (math.log(t) - math.log(MEDIAN_PAUSE)) / SIGMA\n    return 0.5 * math.erfc(z / math.sqrt(2.0))\n\nbase = PROMPT_TOKENS * PRICE_IN       # one committed prefill\n\ndef price(specs, cached):\n    stable = PROMPT_TOKENS * STABLE_FRACTION\n    fresh = PROMPT_TOKENS - stable\n    per_spec = ((stable * CACHE_READ_DISCOUNT + fresh) if cached else PROMPT_TOKENS) * PRICE_IN\n    total = base + specs * per_spec\n    return total, (total - base) / (SAVING_MS / 1000.0)\n\nPOLICIES = [("every partial, no caching", PARTIALS_PER_TURN, False),\n            ("pauses > 200 ms, no caching", PAUSES_PER_TURN * p_pause_exceeds(200), False),\n            ("pauses > 350 ms, no caching", PAUSES_PER_TURN * p_pause_exceeds(350), False),\n            ("pauses > 200 ms, WITH caching", PAUSES_PER_TURN * p_pause_exceeds(200), True)]\n\nfor label, specs, cached in POLICIES:\n    total, per_s = price(specs, cached)\n    print("%-32s %5.1f specs  $%.5f/call  $%.4f per second saved"\n          % (label, specs, total, per_s))\nprint("%-32s %5s specs  $%.5f/call" % ("no speculation (baseline)", "0", base))\nprint("speech-native, for comparison: $%.4f per second saved" % NATIVE_PER_S)',
        out: '==============================================================================================\nSpeculative prefill: the only thing that shortens first audio, and it bills\n==============================================================================================\none committed prefill costs 4200 tokens x $3/1M = $0.01260\na speculative prefill that gets discarded costs exactly the same.\n\ngating policy                                  specs    prefills        $/call     $/s saved\nspeculate on every partial, no caching           7.0         8.0      $0.10080        $0.504\nspeculate on pauses > 200 ms, no caching         1.7         2.7      $0.03341        $0.119\nspeculate on pauses > 350 ms, no caching         0.8         1.8      $0.02273        $0.058\nspeculate on pauses > 200 ms, WITH caching       1.7         2.7      $0.01693        $0.025\nno speculation (baseline)                          0           1      $0.01260             -\n\nthe naive policy is the trap. speculating on every partial does 8 prefills\nper turn, costing $0.10080 where one costs $0.01260 -- 8.0x the prefill bill, or\n$0.504 per second of latency saved -- both figures per TURN, so they compare.\n\n   speech-native model (13.2)                     $0.0507 per second saved\n   speculate on every partial                     $0.5040 per second saved\n\nthe \'cheap\' optimisation is 9.9x MORE expensive per second of latency than the\narchitecture change everyone calls expensive. an ungated speculative prefill is\nthe worst-value latency purchase in this entire module.\n\ngating fixes most of it: only speculate when a pause already looks like an\nending. at a 200 ms gate that is 1.7 speculations a turn instead of 7.\n\nbut prompt caching is what makes it actually free. 88% of the prompt -- system\nprompt plus conversation history -- is byte-identical across every speculation\nin a turn, so it reads from cache at 10% of the input price. only the partial\ntranscript tail is new.\n\n   gated, uncached                          $0.03341 per call\n   gated, cached                            $0.01693 per call\n   no speculation at all                    $0.01260 per call\n   caching removes 79% of the speculation premium.\n\n==============================================================================================\nWhy this ordering matters\n==============================================================================================\n1. speculative prefill is the ONLY optimisation that shortens first audio\n   without changing endpointing, because it breaks a dependency rather than\n   overlapping work -- which is what the 13.4 simulation showed.\n2. it is therefore the one people reach for, and it is the one with an\n   invisible bill: the discarded prefills do not appear in any latency metric\n   and show up a month later as an inference cost rise nobody can attribute.\n3. the fix is not to abandon it. it is to gate it on a signal that already\n   correlates with end-of-turn, and to make the stable prefix cacheable --\n   which means NOT putting a timestamp or a turn counter at the top of the\n   prompt, the single most common way teams destroy their own cache hit rate.\n\nTHE RULE: any optimisation that does speculative work has two budgets, latency\nand waste. measure both, or you have moved cost from a column you watch into\na column you do not.',
        notes: [
          { t: "p", text: "**The naive policy is the trap.** Speculating on every partial does 8 prefills a turn, $0.1008 against $0.0126 \u2014 8.0x the prefill bill \u2014 and works out at $0.504 per second of latency saved." },
          { t: "p", text: "**That is 9.9x more expensive than the speech-native model**, at $0.0507 per second. Both figures are normalised per turn so they compare directly. The optimisation everyone describes as cheap is, ungated, the worst-value latency purchase in the module \u2014 and the architecture everyone describes as expensive is ten times better value per millisecond." },
          { t: "p", text: "**Gating fixes most of it.** Only speculate once a pause has already lasted long enough to look like an ending: at a 200 ms gate that is 1.7 speculations a turn instead of 7, bringing $0.504 down to $0.119. A 350 ms gate halves it again, at the cost of speculating later and therefore saving less." },
          { t: "p", text: "**Prompt caching is what makes it genuinely cheap.** 88% of the prompt \u2014 system prompt plus history \u2014 is byte-identical across every speculation within a turn, so it reads from cache at 10% of input price and only the transcript tail is new. That removes 79% of the remaining premium and lands at $0.025 per second saved, which finally beats the speech-native comparison by 2x." },
          { t: "p", text: "**The generalisable rule: any optimisation that does speculative work has two budgets, latency and waste, and only one of them is on a dashboard.** Measure both, or you have moved cost out of a column you watch and into a column you do not \u2014 where it surfaces a month later as an inference bill nobody can attribute to a change." }
        ] } },

    { t: "callout", kind: "mental", title: "Mental model: the chain and the fringe",
      body: [
        { t: "p", text: "Picture the turn as a chain with work hanging off it. Streaming compresses the fringe \u2014 everything that is not on the path to the first sound \u2014 and that improves the response, enables barge-in and matters more the longer the answer. It cannot touch the chain." },
        { t: "p", text: "Shortening the chain needs one of two things: do a link's work earlier than you are entitled to (speculate), or decide to stop waiting (endpoint). Those are the only two moves, which is why this module spends a whole lesson on each and why 13.5's is the bigger of the two." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: the inference bill rose 40% and nobody knows why",
      body: [
        { t: "p", text: "Two months after a latency project, the inference bill is up 40% on flat traffic. Latency improved as promised, no model changed, no prompt grew. The cost dashboard attributes the rise to \u201cLLM input tokens\u201d, which is not a cause." },
        { t: "p", text: "Speculative prefill is the first thing to check, and the diagnostic is specific: compare the count of prefill operations against the count of completed turns. If the ratio is well above one, you are paying for discarded work. An ungated implementation runs around eight to one, which is roughly a 40% rise in total call cost once the other lines are included \u2014 and none of it appears as an error, a latency regression or a model change, which is exactly why it went two months unnoticed." },
        { t: "p", text: "The fix is the two gates from this lesson rather than removing the feature: speculate only on pauses that already look like endings, and make the stable prefix cacheable. That keeps the 175 ms and removes about 95% of the waste. The process fix is to add prefills-per-turn to the dashboard permanently, because a speculative optimisation without a waste metric is a cost regression waiting for a quiet month."
        }
      ] }
  ],

  takeaways: [
    "**Every stage can emit partial results**: ASR partials, LLM tokens, TTS chunks \u2014 and the playout buffer, which can be flushed, is what makes barge-in work.",
    "**The clause, about twelve tokens, is the synthesis unit**, because prosody needs a phrase; that is where the 200 ms \u201cfirst clause\u201d budget line comes from.",
    "**Streaming is a precondition for barge-in**, independent of latency \u2014 a single audio blob has no cancellation point.",
    "**Overlap improved the full response from 2,410 to 1,990 ms** and left time to first audio at exactly 1,650 both ways.",
    "**Because the first-audio path has no parallelism to exploit**: endpoint, finalise, network, prefill, clause, synthesise, play \u2014 each needs its predecessor.",
    "**Speculative prefill is the only mechanism that shortens the head of the turn**, because it removes a link rather than overlapping one.",
    "**It is worth 175 ms conservatively, 290 ms optimistically**, set by how often a partial's prefix survives finalisation \u2014 a measurable property of your traffic.",
    "**It does not remove ASR finalisation or the network**, since the committed answer must come from the final transcript, and endpointing is untouched at 47.5% of the new budget.",
    "**A discarded prefill costs exactly as much as a used one**, so the speculation policy is a cost decision wearing a latency costume.",
    "**Ungated, it is $0.504 per second of latency saved \u2014 9.9x the speech-native model's $0.0507.** The cheap optimisation is the expensive one.",
    "**Gating on pauses over 200 ms cuts 7 speculations a turn to 1.7** and the price to $0.119.",
    "**Prompt caching on the 88% stable prefix removes 79% of what remains**, landing at $0.025 and finally beating the architecture comparison.",
    "**Never put a timestamp, turn counter or request id at the top of a prompt** \u2014 it invalidates the cache silently, and voice prefills the same prefix repeatedly within one turn.",
    "**Any speculative optimisation has two budgets, latency and waste**; track prefills-per-turn or the cost surfaces later as an unattributable bill."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Adding partial transcripts, token streaming and chunked synthesis left time to first audio unchanged at 1,650 ms. Why?",
        options: [
          "The implementation must be buffering somewhere, since overlap always reduces latency",
          "The first-audio path is a sequential dependency chain with no parallelism available to exploit",
          "Partial transcripts are discarded, so they contribute nothing",
          "The playout buffer dominates and hides the improvement"
        ],
        answer: 1,
        why: "Each link on the path to the first sound requires its predecessor's output \u2014 you cannot synthesise an ungenerated clause, generate from an unprefilled prompt, or prefill a transcript you do not have \u2014 so scheduling it better changes nothing. Streaming compresses the work hanging off that chain, which is why the full response improved by 420 ms, barge-in became possible, and long answers improved substantially. Streaming improves the tail; only speculation or endpointing improves the head." },

      { stem: "Speculating on every ASR partial costs $0.504 per second of latency saved. How does that compare with the speech-native architecture?",
        options: [
          "It is roughly ten times cheaper, which is why speculation is preferred",
          "They are comparable, at about $0.5 per second each",
          "It is 9.9x more expensive than the speech-native model's $0.0507 per second",
          "The two cannot be compared because one is per call and the other per turn"
        ],
        answer: 2,
        why: "Both figures are normalised per turn, so they compare directly, and the ungated speculation is an order of magnitude worse value: it performs eight prefills where one was needed and a discarded prefill is billed identically to a used one. The optimisation described as cheap is, without gating, the worst-value latency purchase in the module \u2014 and the difference between $0.504 and $0.025 is entirely policy, since gating plus prompt caching fixes it." },

      { stem: "Why does prompt caching matter more for a voice turn than for a chat turn?",
        options: [
          "Voice prompts are longer, so more of the prompt is cacheable",
          "A voice turn may prefill the same stable prefix several times within one turn, so the cache does proportionally more work",
          "Audio tokens are cached differently from text tokens",
          "Voice latency requirements mean cache reads are faster than computation"
        ],
        answer: 1,
        why: "A chat turn prefills once; a speculating voice turn prefills on one or more partials and again on the final transcript, and the system prompt plus history is byte-identical every time. At 88% stable, caching those reads at 10% of input price removed 79% of the speculation premium. This is also why putting a timestamp or turn counter at the top of the prompt is so damaging here \u2014 it invalidates the prefix on every prefill, silently and with no error." },

      { stem: "The inference bill rose 40% on flat traffic after a latency project, with no model or prompt change. What is the first diagnostic?",
        options: [
          "Check whether the context window grew as conversations lengthened",
          "Compare the count of prefill operations against the count of completed turns",
          "Check whether the output token limit was raised",
          "Audit the retry policy for failed synthesis requests"
        ],
        answer: 1,
        why: "An ungated speculative prefill runs about eight prefills per completed turn, and every discarded one is billed in full \u2014 which produces a large rise in input-token cost with no error, no latency regression and no model change, so nothing in the usual diagnostic set points at it. The ratio of prefills to turns makes it immediately visible, which is why that ratio belongs on the dashboard permanently rather than being computed during an incident." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Streaming and speculation",
    questions: [
      { level: "core",
        q: "What does streaming buy in a voice pipeline?",
        strong: "A strong answer separates the response tail from the first audio.",
        answer: [
          { t: "p", text: "Three things, and one of them is not what people expect. It compresses the response: in the simulation I built, overlapping the stages took the complete response from 2,410 to 1,990 milliseconds, and the gap widens with answer length because every extra clause in a serial pipeline is additive while in a streamed one it hides behind the previous clause's synthesis." },
          { t: "p", text: "It makes barge-in possible at all, which is an argument independent of latency. If you synthesise the whole response into one audio blob and hand it to the player, there is no cancellation point \u2014 you cannot stop partway through something you have already committed as a unit. Chunked synthesis gives you a boundary every clause, which is what the 160 millisecond barge-in budget assumes exists." },
          { t: "p", text: "And the thing it does not buy: it changes time to first audio by zero. Not approximately \u2014 identically. The path to the first sound is endpointing, finalisation, network, prefill, one clause, synthesis, playout, and each link genuinely needs the one before it. There is no parallelism to exploit, so scheduling it better changes nothing." },
          { t: "p", text: "That distinction is worth being firm about in planning, because it is how a correct and valuable quarter of work ends up looking like a failure. Streaming improves the tail of the response. Speculation and endpointing improve the head. If the OKR is time to first audio, streaming is not the project." }
        ] },

      { level: "advanced",
        q: "How does speculative prefill work, and what does it cost?",
        strong: "A strong answer prices the discarded work and gates it.",
        answer: [
          { t: "p", text: "The observation is that during the endpointing window you are deliberately doing nothing for several hundred milliseconds, and you already have a partial transcript that is probably close to final. So prefill the prompt on the partial. If the user keeps talking, throw it away; if they have finished, most of the prompt is already processed and only the corrected tail is new. That removes a link from the chain rather than overlapping it, which is why it is the only mechanism that moves the head of the turn." },
          { t: "p", text: "It is worth 175 milliseconds if about half the prefill turns out reusable, and 290 if the partial was nearly right. Which you get depends on how stable your partials are, which is a property of your audio quality, domain vocabulary and recogniser \u2014 measurable from traffic you already have by logging partials and finals and comparing prefixes. I would put the conservative number in a plan." },
          { t: "p", text: "The cost is the part that gets missed, and it is not a rounding error. A discarded prefill is billed exactly like a used one, so the policy deciding when to speculate is a cost decision in a latency costume. A turn has around seven partials; speculating on each is eight prefills where one was needed, which is $0.504 per second of latency saved. The speech-native architecture that everyone calls expensive is $0.0507 on the same normalisation, so the cheap optimisation is ten times worse value than the expensive one." },
          { t: "p", text: "Two fixes, and they compose. Gate it on a signal already correlated with end of turn \u2014 only speculate once a pause has lasted long enough to look like an ending \u2014 which takes seven speculations down to under two. And make the stable prefix cacheable, since the system prompt and history are byte-identical across every speculation in a turn; at 88% stable that removes another 79% of the premium. Gated and cached it lands at $0.025 per second, which finally beats the architecture comparison by about 2x." },
          { t: "p", text: "The general rule I would carry out of this: any optimisation doing speculative work has two budgets, latency and waste, and only one is on a dashboard. I would put prefills-per-turn on the dashboard the same week I shipped the feature." }
        ] },

      { level: "advanced",
        q: "Where would you put speculative prefill in a roadmap relative to endpointing?",
        strong: "A strong answer ranks them and notes they compose.",
        answer: [
          { t: "p", text: "Endpointing first, clearly. A semantic endpointer is worth 400 milliseconds against speculation's 175, it costs nothing per call where speculation costs real money, and after a speculative prefill the endpointing wait is still 47.5% of what remains \u2014 so it stays the largest term whatever else you do. Doing speculation first means optimising around a problem you have not fixed." },
          { t: "p", text: "They do compose, though, so this is an ordering rather than a choice. Speculation removes the prefill from the critical path and endpointing shortens the wait, and the two savings are additive because they act on different links in the chain." },
          { t: "p", text: "I would also note what the ordering does to the business case, because 13.2 made this point sharply. A cheap fix re-prices every expensive option aimed at the same problem. Close the free gap first and the remaining latency gap is smaller, so anything you were considering buying \u2014 a speech-native model, a faster tier \u2014 now costs more per millisecond delivered. Run it the other way round and you will buy something expensive to solve a problem your own untuned default was causing." },
          { t: "p", text: "Practically I would sequence it: fit the pause distribution from recordings, which is an afternoon; set per-context thresholds from dialogue state, which is a day and captures much of the semantic win with no model; build the semantic endpointer, about four weeks; then add gated and cached speculative prefill. The first two steps are nearly free and almost nobody does them, so a team that starts at the bottom of that list is usually paying for latency it could have had for nothing." }
        ] }
    ]
  }
});
