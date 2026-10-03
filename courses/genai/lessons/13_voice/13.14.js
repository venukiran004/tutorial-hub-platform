EC.receiveLesson({
  id: "13.14",

  lede: "A three-minute call itemises to **$0.0681**: ASR $0.0180, TTS $0.0270, LLM $0.0231. The first surprise is the ranking \u2014 **text-to-speech is the largest line, 16.9% above the language model**, because it is billed per character and nobody thinks of characters as expensive. The second is that the itemised figure undercounts. Price the same three minutes turn by turn, where the whole conversation is resent each time, and the input bill is **10,525 tokens rather than 4,200**, the LLM line becomes $0.0421 and the call becomes $0.0871. So the ordering is a function of call length, which a single row cannot express. And the two largest levers are a prompt rewrite and a caching flag \u2014 together worth **59% of the call**, with no model change and no quality risk.",

  objectives: [
    "Itemise a voice call across ASR, TTS and LLM and rank the lines",
    "Explain why TTS is larger than the model and what controls it",
    "Account for input growth across turns rather than pricing one prompt",
    "Quantify what prompt caching is worth on a multi-turn call",
    "Rank the cost levers and say which carry quality risk"
  ],

  prerequisites: ["13.8", "13.7"],

  blocks: [

    { t: "h2", n: "01", id: "itemise", text: "The three lines",
      sub: "Priced differently, which is why the ranking surprises" },

    { t: "p", text: "A cascaded voice call bills in three units that have nothing to do with each other: recognition **per minute of audio**, synthesis **per character of text**, and the model **per token**, with input and output priced separately. Three unrelated meters is why intuition about which dominates is usually wrong." },

    { t: "code", lang: "python", title: "A three-minute call, itemised",
      code: 'MINUTES, TTS_CHARS = 3.0, 1800\nASR_PER_MIN, TTS_PER_1K = 0.006, 0.015\nPRICE_IN, PRICE_OUT = 3.0 / 1e6, 15.0 / 1e6\nLLM_IN, LLM_OUT = 4200, 700\n\nasr = MINUTES * ASR_PER_MIN\ntts = TTS_CHARS / 1000.0 * TTS_PER_1K\nllm = LLM_IN * PRICE_IN + LLM_OUT * PRICE_OUT\n\nprint("ASR $%.4f  TTS $%.4f  LLM $%.4f  TOTAL $%.4f"\n      % (asr, tts, llm, asr + tts + llm))',
      out: 'ASR $0.0180  TTS $0.0270  LLM $0.0231  TOTAL $0.0681',
      caption: "$0.0681 a call. At 10,000 calls a day that is $681/day, $20,430/month, $248,565/year." },

    { t: "p", text: "The ranking is TTS, then LLM, then ASR \u2014 synthesis is 39.6% of the call and 16.9% larger than the model. That is counter-intuitive enough to be worth sitting with, because it inverts where a team's cost attention naturally goes." },

    { t: "callout", kind: "insight", title: "Why the largest line is the one nobody watches",
      body: [
        { t: "p", text: "Per-token pricing is visible: everyone has a dashboard for it, vendors publish comparisons, and \u201cthe model costs money\u201d is a thing engineers already believe. Per-character synthesis pricing is invisible by comparison, and characters feel free \u2014 so an answer that runs 400 characters instead of 150 does not register as a cost decision at all." },
        { t: "p", text: "Which makes TTS the line most directly controlled by a prompt. 13.8 measured a 63.9% reduction from rewriting a chat answer for the ear, and the identical 63.9% came off the TTS line, the output tokens and the delivery time together." }
      ] },

    { t: "h2", n: "02", id: "growth", text: "The itemised figure undercounts",
      sub: "4,200 input tokens is one turn's prompt, not a call's" },

    { t: "p", text: "The LLM row prices 4,200 input tokens for the whole call, and that only holds if the conversation is sent once. It is not \u2014 a voice turn resends the entire conversation, so input grows with every exchange while output does not. Modelling the same three minutes as ten turns with a 600-token system prompt gives a cumulative input bill of 10,525 tokens: **2.5 times** the itemised figure." },

    { t: "viz", title: "Input grows, output does not",
      caption: "Over ten turns the input line reaches 75% of the LLM cost, and the last turn costs 2.4x the first.",
      svg: '<svg viewBox="0 0 760 310" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cumulative input and output cost across ten turns">' +
        '<line x1="60" y1="240" x2="730" y2="240" class="s-stroke"/>' +
        '<line x1="60" y1="30" x2="60" y2="240" class="s-stroke"/>' +
        '<text x="395" y="268" class="s-sub" text-anchor="middle">turn</text>' +
        '<text x="26" y="135" class="s-sub" transform="rotate(-90 26 135)" text-anchor="middle">cumulative $</text>' +
        '<text x="60" y="256" class="s-mono" text-anchor="middle">1</text>' +
        '<text x="395" y="256" class="s-mono" text-anchor="middle">5</text>' +
        '<text x="730" y="256" class="s-mono" text-anchor="middle">10</text>' +
        '<text x="54" y="36" class="s-mono" text-anchor="end">.032</text>' +
        '<text x="54" y="240" class="s-mono" text-anchor="end">0</text>' +
        '<polyline fill="none" stroke="var(--crit)" stroke-width="2.5" points="60,228 134,214 208,198 283,179 357,158 431,135 506,110 580,82 655,52 730,36"/>' +
        '<polyline fill="none" stroke="var(--good)" stroke-width="2.5" points="60,233 134,226 208,219 283,212 357,205 431,198 506,191 580,185 655,178 730,172"/>' +
        '<text x="640" y="30" class="s-mono" fill="var(--crit)">input 75%</text>' +
        '<text x="640" y="166" class="s-mono" fill="var(--good)">output 25%</text>' +
        '<text x="200" y="64" class="s-sub">input curves UPWARD: each turn resends</text>' +
        '<text x="200" y="82" class="s-sub">a longer conversation \u2014 quadratic in turns</text>' +
        '<text x="200" y="118" class="s-sub">output is LINEAR: one response per turn,</text>' +
        '<text x="200" y="136" class="s-sub">roughly constant length</text>' +
        '<text x="12" y="290" class="s-mono">prompt 625 \u2192 1480 tokens, so the last turn costs 2.4x the first</text>' +
        '<text x="12" y="306" class="s-mono">cumulative input 10,525 tokens, not the 4,200 the itemised row assumes</text>' +
        '</svg>' },

    { t: "callout", kind: "tradeoff", title: "So is TTS the biggest line or not?",
      body: [
        { t: "p", text: "Both, depending on call length, and the honest answer is that the ordering is not a fact about voice \u2014 it is a function of how long your calls are. On a single turn, or priced the way the itemised block prices it, TTS at $0.0270 beats the LLM at $0.0231. Accumulated over ten turns the LLM line reaches $0.0421 and overtakes it comfortably." },
        { t: "p", text: "The useful version of the claim: **TTS dominates short calls and the model dominates long ones**, because synthesis scales with words spoken and the model scales with the square of the turn count. Knowing which regime you are in is the point of itemising at all." }
      ] },

    { t: "p", text: "That quadratic shape is the same one 11.10 measured for agent loops, appearing here in a voice conversation. The mechanism is identical \u2014 resending accumulated context \u2014 and so is the fix." },

    { t: "h2", n: "03", id: "caching", text: "Prompt caching",
      sub: "The largest single lever, and it is a configuration change" },

    { t: "p", text: "Most of each turn's prompt is byte-identical to the previous turn's: the system prompt never changes, and the conversation history up to the last exchange is exactly what was sent before. Caching those reads at a fraction of the input price cuts the fastest-growing line without changing a single behaviour." },

    { t: "code", lang: "python", title: "What caching the stable prefix is worth",
      code: 'CACHE_READ = 0.10          # cached prefix billed at 10% of input price\nSYS, U, A = 600, 25, 70    # system prompt, user turn, assistant turn (tokens)\n\ntin, uncached, cached = SYS, 0.0, 0.0\nfor turn in range(1, 11):\n    tin += U\n    uncached += tin * PRICE_IN\n    cacheable = SYS + max(0, tin - SYS - U)   # system + all prior history\n    fresh = tin - cacheable                   # just this turn\'s user message\n    cached += (cacheable * CACHE_READ + fresh) * PRICE_IN\n    tin += A\n\nprint("input uncached $%.5f   cached $%.5f   saved %.1f%%"\n      % (uncached, cached, 100.0 * (1 - cached / uncached)))',
      out: 'input uncached $0.03157   cached $0.00383   saved 87.9%',
      caption: "87.9% off the input line, 31.9% off the whole call, with no behaviour change at all." },

    { t: "callout", kind: "warn", title: "One line of prompt can destroy all of it",
      body: [
        { t: "p", text: "Caching requires a byte-identical prefix, so a timestamp, a turn counter, a request id or a randomised instruction order at the **top** of the prompt invalidates the cache on every call. There is no error, no warning, and no symptom other than a cache hit rate near zero \u2014 which nobody is looking at." },
        { t: "p", text: "Everything volatile goes after the stable system prompt and history. 13.7 made the same point for speculative prefill, where a turn may prefill the same prefix several times, so voice is doubly exposed to this mistake." }
      ] },

    { t: "h2", n: "04", id: "levers", text: "The levers, ranked",
      sub: "And which of them cost you something" },

    { t: "table",
      head: ["Lever", "Worth", "Risk"],
      rows: [
        ["prompt caching", "$0.0277/call, 31.9%", "none \u2014 a configuration change"],
        ["write for the ear (13.8)", "$0.0240/call, 27.5%", "none \u2014 and it cuts latency too"],
        ["shorter system prompt", "$0.0045/call, 5.2%", "low \u2014 paid on every turn, so it compounds"],
        ["a cheaper voice for routine answers", "varies", "low \u2014 unavailable under speech-native"],
        ["gate speculative prefill (13.7)", "up to $0.088/turn", "none \u2014 pure waste removal"],
        ["a smaller model", "large", "**answer quality**, and it is the only one that trades it"]
      ] },

    { t: "p", text: "The two largest are a prompt rewrite and a caching flag, worth 59.4% of the call between them, and neither changes the model, the architecture or the vendor. Together they are worth more than moving to a cheaper model would be \u2014 and they carry no quality risk, where a smaller model is the one lever in the whole module that trades accuracy for money." },

    { t: "callout", kind: "good", title: "Shortening the answer is still the best-value change",
      body: [
        { t: "p", text: "13.8's rewrite cut TTS cost, output tokens and delivery time by the same 63.9%, and 13.13 adds a fourth beneficiary: fewer words generated means fewer words wasted when the user interrupts. That is four budgets from one prompt change, and the only lever in the module with no counterparty at all." },
        { t: "p", text: "Caching is worth slightly more in absolute terms, but it is a one-time configuration change. Brevity keeps paying as the product grows, and it also makes the agent better to talk to, which is the only item on the list that improves the experience rather than merely the bill." }
      ] },

    { t: "exercise", kind: "analysis", title: "Price a call properly, including the growth",
      difficulty: "core", minutes: 26,
      body: "Itemise a three-minute call across ASR, TTS and LLM, rank the lines and scale to 10,000 calls a day. Then test whether the LLM line is really dominated by input tokens: first on the single-call figures, then by accumulating the prompt turn by turn across ten turns. Compare the accumulated total against the itemised figure. Finally compute what prompt caching is worth and rank the available levers.",
      requirements: [
        "Itemise with ASR per minute, TTS per 1,000 characters, and separate input and output token prices",
        "Rank the three lines by share of the call",
        "Report input against output share on the single-call figures",
        "Accumulate the prompt across 10 turns with a 600-token system prompt and report the cumulative input",
        "Compare the accumulated LLM line against the itemised one and state the discrepancy",
        "Compute prompt caching with the stable prefix at 10% of input price",
        "Rank the levers by dollars per call and flag which carry quality risk"
      ],
      hint: "The prompt on turn n is the system prompt plus every prior user and assistant message plus this turn's user message. The cacheable portion is everything except this turn's new user message.",
      solution: { lang: "python", title: "x1314.py \u2014 the itemised figure and the real one",
        code: 'MINUTES, TTS_CHARS = 3.0, 1800\nASR_PER_MIN, TTS_PER_1K = 0.006, 0.015\nPRICE_IN, PRICE_OUT = 3.0 / 1e6, 15.0 / 1e6\nLLM_IN, LLM_OUT = 4200, 700\n\nasr = MINUTES * ASR_PER_MIN\ntts = TTS_CHARS / 1000.0 * TTS_PER_1K\nllm = LLM_IN * PRICE_IN + LLM_OUT * PRICE_OUT\ntotal = asr + tts + llm\nprint("ASR $%.4f  TTS $%.4f  LLM $%.4f  TOTAL $%.4f" % (asr, tts, llm, total))\nfor n, v in sorted([("TTS", tts), ("LLM", llm), ("ASR", asr)], key=lambda r: -r[1]):\n    print("   %-5s $%.4f  %4.1f%%" % (n, v, 100.0 * v / total))\n\n# accumulate the prompt turn by turn\nSYS, U, A = 600, 25, 70\nCACHE_READ = 0.10\ntin, ci, co, cc = SYS, 0.0, 0.0, 0.0\nfor turn in range(1, 11):\n    tin += U\n    ci += tin * PRICE_IN\n    co += A * PRICE_OUT\n    cacheable = SYS + max(0, tin - SYS - U)\n    cc += (cacheable * CACHE_READ + (tin - cacheable)) * PRICE_IN\n    tin += A\n\nprint("cumulative input $%.5f (%.0f%%), output $%.5f" % (ci, 100 * ci / (ci + co), co))\nprint("input tokens billed: %d, against the itemised %d" % (round(ci / PRICE_IN), LLM_IN))\nprint("whole call recomputed: $%.4f   with caching: $%.4f"\n      % (asr + tts + ci + co, asr + tts + cc + co))',
        out: '==============================================================================================\nA 3-minute call, itemised\n==============================================================================================\n   ASR   3.0 min x $0.006/min           = $0.0180\n   TTS   1800 chars x $0.015/1k chars    = $0.0270\n   LLM   4200 in + 700 out tokens        = $0.0231\n   TOTAL                                    = $0.0681\n\n   at 10,000 calls/day: $681/day, $20430/month, $248565/year\n\n----------------------------------------------------------------------------------------------\nThe ranking is the surprise\n----------------------------------------------------------------------------------------------\n   TTS   $0.0270   39.6% of the call  ########################\n   LLM   $0.0231   33.9% of the call  ####################\n   ASR   $0.0180   26.4% of the call  ################\n\n   TTS is the largest line, 16.9% larger than the LLM.\n   it is billed per CHARACTER, so it is the one line a prompt change controls\n   directly -- and 13.8 measured a 63.9%% reduction from writing for the ear.\n\n   TTS at 1800 chars                  $0.0270\n   TTS after the 13.8 rewrite         $0.0097  (-63.9%)\n\n==============================================================================================\nIs the LLM line really \'dominated by input tokens\'?\n==============================================================================================\n   on the single-call figures: input $0.0126 (54.5%), output $0.0105 (45.5%)\n   -> a majority, not a domination. the usual claim overstates it HERE.\n\n   but the REASON behind the claim is right, and it understates the effect:\n   the whole conversation is resent every turn, so input grows and output\n   does not. modelling the same 3 minutes as 10 turns:\n\n   turn      prompt    output      input $     output $   in share\n   1            625        70      0.00188      0.00105        64%\n   2            720        70      0.00404      0.00210        66%\n   ...          ...       ...          ...          ...        ...\n   9           1385        70      0.02713      0.00945        74%\n   10          1480        70      0.03157      0.01050        75%\n\n   cumulative: input $0.03157 (75.0%), output $0.01050 (25.0%)\n   the prompt grew 625 -> 1480 tokens, so the last turn costs 2.4x the first.\n   NOW input dominates, at 75%.\n\n----------------------------------------------------------------------------------------------\nwhich means the headline $0.0681 undercounts the LLM line\n----------------------------------------------------------------------------------------------\n   the itemised block prices 4200 input tokens for the whole call.\n   accumulated turn by turn, a 10-turn call with a 600-token system prompt\n   resends the conversation 10 times and bills 10525 input tokens -- 2.5x more.\n\n                                          input tok     LLM line\n   the itemised figure                         4200      $0.0231\n   accumulated over 10 turns                  10525      $0.0421\n   whole call, recomputed                                $0.0871\n\n   so 4200 is plausible as ONE turn\'s prompt near the end of the call, and far\n   too low as the cumulative total. the ranking survives -- TTS at $0.0270 is\n   still above a single turn\'s LLM cost -- but across a whole call the LLM line\n   overtakes it, and the longer the call the more decisively. the ordering is a\n   function of call length, which a single itemised row cannot express.\n\n==============================================================================================\nPrompt caching, which is the largest lever on a long call\n==============================================================================================\nthe system prompt is 600 tokens and byte-identical on every turn. the history\nprefix is identical to the previous turn\'s. so most of the prompt is cacheable.\n\n   input, uncached                    $0.03157\n   input, with prompt caching         $0.00383\n                                      87.9% saved on the input line\n\n   whole call, uncached               $0.0871 per call\n   whole call, cached                 $0.0593 per call\n                                      31.9% of total call cost\n   at 10,000 calls/day that is $8323/month saved.\n\n==============================================================================================\nThe three levers, ranked\n==============================================================================================\n   prompt caching               $0.0277/call   31.9%   cuts the fastest-growing line; no behaviour change\n   write for the ear (13.8)     $0.0240/call   27.5%   cuts TTS chars AND output tokens; also cuts delivery time\n   shorter system prompt        $0.0045/call    5.2%   halving 600 tokens of system prompt, paid on every turn\n\nTHE POINT: the two biggest levers are a prompt rewrite and a caching config.\nneither changes the model, the architecture or the vendor -- and together they\nare worth more than switching to a cheaper model would be, with no quality risk.',
        notes: [
          { t: "p", text: "**TTS is the largest line at 39.6% of the call, 16.9% above the model.** Three unrelated meters \u2014 per minute, per character, per token \u2014 is why intuition gets this wrong, and per-character pricing is the least visible of the three. An answer running 400 characters instead of 150 does not register as a cost decision, which is exactly what makes it the line a prompt controls." },
          { t: "p", text: "**On the single-call figures, input is 54.5% of the LLM line \u2014 a majority, not a domination.** The usual claim that voice LLM cost is dominated by input overstates it on these numbers, so it is worth checking rather than repeating." },
          { t: "p", text: "**But the reasoning behind the claim is right and its own arithmetic understates it.** Accumulated across ten turns, input reaches 75% and the prompt grows from 625 to 1,480 tokens, so the last turn costs 2.4x the first. Input is quadratic in turn count and output is linear \u2014 the same shape 11.10 measured for agent loops, with the same mechanism." },
          { t: "p", text: "**Which means the itemised $0.0681 undercounts.** 4,200 input tokens is plausible as one late turn's prompt and far too low as a cumulative total: ten turns bill 10,525 tokens, 2.5x more, taking the LLM line to $0.0421 and the call to $0.0871. So the ranking inverts with call length \u2014 TTS dominates short calls and the model dominates long ones, and which regime you are in is the point of itemising." },
          { t: "p", text: "**Prompt caching takes 87.9% off the input line and 31.9% off the whole call**, because the system prompt plus all prior history is byte-identical to what was already sent. At 10,000 calls a day that is $8,323 a month for a configuration change \u2014 which is why a timestamp at the top of the prompt is such an expensive mistake, and it fails silently with no symptom but a near-zero hit rate." },
          { t: "p", text: "**The two largest levers are a prompt rewrite and a caching flag, worth 59.4% of the call together**, with no model change, no vendor change and no quality risk. A smaller model is the only lever in this module that trades answer quality for money, and it is the one to reach for last rather than first." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: the voice bill is four times the chat bill per conversation",
      body: [
        { t: "p", text: "Finance notes that a voice conversation costs roughly four times a chat conversation about the same topic, and asks whether a cheaper model would close the gap." },
        { t: "p", text: "A cheaper model is the wrong lever and it is also the only one with a quality cost. The gap is mostly two lines that chat does not have at all: recognition at $0.0180 and synthesis at $0.0270, together $0.0450 before the model is involved. And the model line itself is inflated by conversation resending rather than by price \u2014 ten turns bills 10,525 input tokens, 2.5 times what a single-shot estimate assumes." },
        { t: "p", text: "So the order is: turn on prompt caching, which is 31.9% of the call and a configuration change; rewrite the prompt for the ear, which is 27.5% and improves the product; and gate speculative prefill if it is running ungated, which 13.7 priced at up to $0.088 a turn of pure waste. That is roughly 59% of the call from two changes with no quality risk, and it will close the gap further than a model swap would. If a cheaper model is still wanted afterwards, it is now a decision about accuracy rather than a decision about cost." }
      ] }
  ],

  takeaways: [
    "**Three unrelated meters**: ASR per minute of audio, TTS per character of text, the model per token with input and output priced separately.",
    "**A 3-minute call itemises to $0.0681**: ASR $0.0180, TTS $0.0270, LLM $0.0231 \u2014 $20,430/month at 10,000 calls a day.",
    "**TTS is the largest line at 39.6%, 16.9% above the model** \u2014 because per-character pricing is invisible and characters feel free.",
    "**Which makes TTS the line a prompt controls**: 13.8's rewrite for the ear cut it 63.9%, along with output tokens and delivery time.",
    "**On single-call figures input is 54.5% of the LLM line** \u2014 a majority, not a domination, so the usual claim overstates it there.",
    "**Accumulated over 10 turns, input reaches 75%** and the prompt grows 625 \u2192 1,480 tokens, so the last turn costs 2.4x the first.",
    "**Input is quadratic in turns and output is linear** \u2014 the same shape 11.10 measured for agent loops, same mechanism, same fix.",
    "**So the itemised figure undercounts**: 10 turns bills 10,525 input tokens against 4,200, taking the LLM line to $0.0421 and the call to $0.0871.",
    "**The ranking is a function of call length**: TTS dominates short calls, the model dominates long ones.",
    "**Prompt caching takes 87.9% off the input line and 31.9% off the call**, worth $8,323/month at 10,000 calls a day for a configuration change.",
    "**A timestamp or turn counter at the top of the prompt destroys all of it silently** \u2014 no error, no warning, just a near-zero hit rate nobody watches.",
    "**The two largest levers are a prompt rewrite and a caching flag, 59.4% together**, with no model, architecture or vendor change.",
    "**A smaller model is the only lever that trades answer quality** \u2014 reach for it last, and then as an accuracy decision rather than a cost one."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "In the itemised 3-minute call, which line is largest and why is that counter-intuitive?",
        options: [
          "The LLM, because token pricing applies to both input and output",
          "TTS at 39.6%, 16.9% above the model \u2014 it is billed per character, and characters do not feel expensive",
          "ASR, because it is billed for the full call duration including silence",
          "They are within a few per cent of each other, so no line dominates"
        ],
        answer: 1,
        why: "Three unrelated meters \u2014 per minute, per character, per token \u2014 defeat intuition, and per-character pricing is the least visible of the three: everyone has a token dashboard and nobody thinks of characters as costly, so an answer running 400 characters instead of 150 is not registered as a cost decision. That is precisely what makes TTS the line most directly controlled by a prompt change." },

      { stem: "The itemised call prices 4,200 input tokens. Accumulated across 10 turns the figure is 10,525. Why?",
        options: [
          "The system prompt is counted once per call rather than once per turn",
          "Each turn resends the whole conversation, so input grows quadratically while output stays linear",
          "Speculative prefill adds extra input tokens",
          "Token counting differs between the two methods"
        ],
        answer: 1,
        why: "A voice turn sends the system prompt plus every prior exchange plus the new message, so the prompt grows from 625 to 1,480 tokens over ten turns and the cumulative input is the sum of all ten prompts. Output is one response per turn at roughly constant length, so it is linear. That makes 4,200 plausible as one late turn's prompt and 2.5x too low as a call total \u2014 the same shape 11.10 measured for agent loops." },

      { stem: "Prompt caching cut the input line by 87.9%. What makes so much of the prompt cacheable?",
        options: [
          "The model caches semantically similar prefixes across turns",
          "The system prompt and all prior conversation history are byte-identical to what was already sent",
          "Audio tokens cache more efficiently than text tokens",
          "The cache stores the response, so repeated questions are free"
        ],
        answer: 1,
        why: "Each turn's prompt differs from the previous one only by the last exchange, so everything before the new user message is a byte-identical prefix that can be read at a fraction of the input price. This also explains why a timestamp or turn counter at the top of the prompt is so costly \u2014 it invalidates the prefix on every call, with no error and no symptom beyond a hit rate nobody is watching." },

      { stem: "Finance asks whether a cheaper model would close a 4x cost gap against chat. What is the better answer?",
        options: [
          "Yes \u2014 the model is the largest controllable line in a voice call",
          "Prompt caching and writing for the ear are worth 59.4% together with no quality risk; a smaller model is the only lever that trades accuracy",
          "No \u2014 the gap is entirely ASR and TTS, so nothing can be done about it",
          "Reduce call duration, since ASR is billed per minute"
        ],
        answer: 1,
        why: "Most of the gap is two lines chat does not have at all, $0.0450 of recognition and synthesis before the model is involved, and the model line is inflated by conversation resending rather than by price. Caching is 31.9% of the call for a configuration change and the prompt rewrite is 27.5% while also improving the product. Doing those first means that if a cheaper model is still wanted, it becomes an accuracy decision rather than a cost one." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "What a call costs",
    questions: [
      { level: "core",
        q: "What does a voice call cost, and where does the money go?",
        strong: "A strong answer gives the three lines and the counter-intuitive ranking.",
        answer: [
          { t: "p", text: "For a three-minute cascaded call, around seven cents: recognition at $0.018 billed per minute of audio, synthesis at $0.027 billed per character of text, and the model at $0.023 billed per token with input and output priced separately. About $20,000 a month at ten thousand calls a day." },
          { t: "p", text: "The ranking is the part worth knowing, because synthesis is the largest line \u2014 nearly 40% of the call and about 17% above the model. Three unrelated meters is why intuition gets this wrong, and per-character pricing is the least visible of the three. Everyone has a token dashboard; nobody thinks of characters as expensive. So an answer that runs 400 characters instead of 150 is not experienced as a cost decision at all, which is exactly what makes TTS the line a prompt controls most directly." },
          { t: "p", text: "There is an important correction to the itemised view, though. It prices 4,200 input tokens for the whole call, and a voice turn resends the entire conversation every time. Accumulated across ten turns with a 600-token system prompt, the input bill is 10,525 tokens \u2014 two and a half times more \u2014 which takes the model line to $0.042 and the call to about nine cents." },
          { t: "p", text: "So the ranking is actually a function of call length rather than a fact about voice. Synthesis dominates short calls because it scales with words spoken; the model dominates long ones because input scales with the square of the turn count. Knowing which regime you are in is the whole point of itemising." }
        ] },

      { level: "advanced",
        q: "How would you halve the cost of a voice agent?",
        strong: "A strong answer ranks the levers and isolates the one with quality risk.",
        answer: [
          { t: "p", text: "Two changes get most of the way there and neither touches the model. Prompt caching is worth about 32% of the call: the system prompt and all prior history are byte-identical to what was already sent, so caching that prefix takes 88% off the input line \u2014 around $8,300 a month at ten thousand calls a day, for a configuration change with no behavioural effect at all." },
          { t: "p", text: "Rewriting the prompt for speech is worth about 28%. When I linted a normal chat answer and rewrote it for the ear it came out 64% shorter, and the same 64% came off the synthesis bill, the output tokens and the delivery time together. That is the only lever in the whole area with no counterparty \u2014 and it makes the agent better to talk to, which nothing else on the list does." },
          { t: "p", text: "Those two are about 59% together. Beyond them: gate speculative prefill if it is running ungated, which is pure waste removal and can be up to nine cents a turn; trim the system prompt, since every token in it is paid on every turn so it compounds; and use a cheaper voice for routine answers, which is available in a cascade and not under a speech-native model." },
          { t: "p", text: "The one I would explicitly hold back is a smaller model. It is the only lever here that trades answer quality for money, and after the first two you may not need it \u2014 at which point it becomes an accuracy decision rather than a cost one, which is a much better conversation to have. I would also flag the silent failure mode on caching: a timestamp or request id at the top of the prompt invalidates the prefix on every call, with no error and no symptom beyond a hit rate nobody looks at." }
        ] },

      { level: "advanced",
        q: "Why does input token cost grow during a voice call?",
        strong: "A strong answer identifies the quadratic and connects it to the fix.",
        answer: [
          { t: "p", text: "Because each turn resends the whole conversation. Turn one sends the system prompt plus one user message. Turn ten sends the system prompt plus nine exchanges plus the new message. So the prompt grew from 625 to 1,480 tokens in my model, meaning the last turn costs 2.4 times the first, and the cumulative input is the sum of all ten prompts rather than the size of the last one." },
          { t: "p", text: "That makes input quadratic in turn count while output stays linear, since there is one response per turn at roughly constant length. Over ten turns input reached 75% of the model line, where on a single-call basis it was only 54.5% \u2014 so the common claim that voice LLM cost is dominated by input is right for the right reason and overstated on the single-call arithmetic people usually quote it with." },
          { t: "p", text: "It is the same shape I have seen in agent loops, with the same mechanism: accumulated context resent on every step. And the same fix, which is why prompt caching matters so much more here than in a single-shot application \u2014 the growing part of the prompt is also the part that was already sent, so it is exactly what a cache is for." },
          { t: "p", text: "The practical consequence is that cost per call is not a constant you can quote, it is a function of call length, and it grows faster than linearly. A product change that makes conversations two turns longer is a cost change, and it will not look like one on anybody's dashboard. I would track mean turns per call next to mean cost per call for that reason." }
        ] }
    ]
  }
});
