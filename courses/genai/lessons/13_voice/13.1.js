EC.receiveLesson({
  id: "13.1",

  lede: "Every interface before this one let the user wait. A web page can spin, a chat can show three dots, and the user tolerates it because they can see that something is happening. Speech has no spinner. The only thing a voice agent can do with a pause is **be silent**, and silence in a conversation already means something \u2014 it means the other party is thinking, or did not hear, or has nothing to say. The constraint that follows is specific and unforgiving: **human conversational turn-taking runs on a gap of roughly 200 milliseconds**, and every stage of a voice pipeline has to fit inside a budget set by that number rather than by what the infrastructure finds convenient.",

  objectives: [
    "State the turn-taking gap humans actually use and what a system is measured against",
    "Name the three affordances speech removes that text interfaces rely on",
    "Place a time-to-first-audio figure in the right perception band",
    "Explain why the latency distribution matters more than the median",
    "Compute the per-call probability of a bad moment from a per-turn rate"
  ],

  prerequisites: ["10.4", "11.1"],

  blocks: [

    { t: "h2", n: "01", id: "gap", text: "The two hundred millisecond gap",
      sub: "The number the user is unconsciously measuring against" },

    { t: "p", text: "Conversation analysts have measured turn-taking across many languages, and the finding is remarkably stable: the gap between one speaker finishing and the next beginning averages around **200 milliseconds**. Some languages run slightly longer, some shorter, but the order of magnitude does not move. That is faster than human reaction time to an unexpected stimulus, which tells you something important \u2014 the next speaker is not reacting to the end of your sentence, they are **predicting** it and launching their reply before you finish." },

    { t: "p", text: "This matters because it sets the scale against which a voice agent is judged, and the user does not know they are applying it. They have never consciously thought about 200 milliseconds in their life. But they have forty years of practice at a rhythm, and a system that breaks it feels wrong in a way they will describe as \u201cslow\u201d, \u201cclunky\u201d, \u201crobotic\u201d or \u201cawkward\u201d without being able to say why." },

    { t: "viz", title: "The rhythm the user already has",
      caption: "Human turn-taking overlaps prediction with production. A pipeline cannot predict, so it pays the whole cost serially.",
      svg: '<svg viewBox="0 0 760 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Human turn-taking compared with a voice pipeline">' +
        '<text x="12" y="20" class="s-label">HUMAN \u2194 HUMAN</text>' +
        '<rect x="12" y="32" width="300" height="34" rx="4" fill="var(--accent)" opacity="0.22" stroke="var(--accent)"/>' +
        '<text x="162" y="54" class="s-sub" text-anchor="middle">A speaking</text>' +
        '<rect x="316" y="32" width="18" height="34" rx="3" fill="var(--good)" opacity="0.35" stroke="var(--good)"/>' +
        '<rect x="338" y="32" width="300" height="34" rx="4" fill="var(--violet)" opacity="0.22" stroke="var(--violet)"/>' +
        '<text x="488" y="54" class="s-sub" text-anchor="middle">B speaking</text>' +
        '<text x="325" y="84" class="s-mono" text-anchor="middle" fill="var(--good)">~200ms</text>' +
        '<rect x="200" y="94" width="130" height="20" rx="3" fill="none" stroke="var(--good)" stroke-dasharray="3 3"/>' +
        '<text x="265" y="108" class="s-sub" text-anchor="middle">B is already planning</text>' +
        '<text x="340" y="108" class="s-sub">\u2190 the gap is small because the work started early</text>' +
        '<line x1="12" y1="138" x2="748" y2="138" class="s-stroke" opacity="0.4"/>' +
        '<text x="12" y="166" class="s-label">HUMAN \u2194 VOICE AGENT</text>' +
        '<rect x="12" y="178" width="300" height="34" rx="4" fill="var(--accent)" opacity="0.22" stroke="var(--accent)"/>' +
        '<text x="162" y="200" class="s-sub" text-anchor="middle">user speaking</text>' +
        '<rect x="316" y="178" width="150" height="34" rx="3" fill="var(--crit)" opacity="0.28" stroke="var(--crit)"/>' +
        '<text x="391" y="200" class="s-sub" text-anchor="middle">silence</text>' +
        '<rect x="470" y="178" width="168" height="34" rx="4" fill="var(--violet)" opacity="0.22" stroke="var(--violet)"/>' +
        '<text x="554" y="200" class="s-sub" text-anchor="middle">agent speaking</text>' +
        '<text x="391" y="230" class="s-mono" text-anchor="middle" fill="var(--crit)">1650ms</text>' +
        '<text x="12" y="258" class="s-sub">the agent cannot start until the user stops, so nothing overlaps \u2014 and the</text>' +
        '<text x="12" y="276" class="s-sub">gap is not a delay in the reply, it IS the reply as far as the user can tell</text>' +
        '</svg>' },

    { t: "callout", kind: "insight", title: "Prediction is the whole trick, and you do not have it",
      body: [
        { t: "p", text: "A human listener runs syntax, prosody and semantics forward in real time and knows roughly where your sentence is going to land. They start formulating at word eight of a twelve-word sentence. By the time you stop, they are ready." },
        { t: "p", text: "A cascaded pipeline does the opposite. It waits for silence to be sure you are done, then transcribes, then thinks, then synthesises \u2014 four serial stages that all begin after you stop. Everything in this module is, in one way or another, an attempt to recover some of that overlap: streaming, speculative prefill, semantic endpointing and speaking before the whole answer exists." }
      ] },

    { t: "h2", n: "02", id: "removed", text: "What speech takes away",
      sub: "Three affordances every text interface quietly depends on" },

    { t: "p", text: "It is tempting to model a voice agent as a chat agent with audio bolted to each end. The latency budget is the obvious reason that fails. The less obvious reasons are the interface affordances that disappear, because the mitigations your text product relies on stop existing." },

    { t: "dl", items: [
      { k: "No delete key", v: "In text, a user who mistypes a name fixes it before pressing enter, and a model that misreads can be corrected by editing the message. In speech, the transcription error is already in the conversation history and already being acted upon. There is no edit, only repair \u2014 which costs a turn, and turns cost seconds." },
      { k: "No scrollback", v: "A chat user can re-read the last four messages. A caller holds the conversation in working memory, which is good for about three items. A list of six options read aloud is not a list of six options, it is the first one and the last one. This single fact rewrites how you structure every answer." },
      { k: "No parallel attention", v: "A text user can skim, skip ahead and ignore the preamble. Audio is strictly serial and arrives at the speaker's pace, not the listener's. A 40-word preamble before the answer is 14 seconds the user cannot skip, so verbosity stops being a style issue and becomes a latency issue." }
    ] },

    { t: "callout", kind: "trap", title: "The chat transcript looks fine",
      body: [
        { t: "p", text: "This is why a voice agent can score well on a text eval and be unusable on the phone. Read the transcript of a bad call and you often see competent, well-structured, correct answers. The failure is not in the words. It is in the 1.4 seconds before each one, the six-item list nobody could hold, and the markdown asterisks the speech synthesiser read out loud." },
        { t: "p", text: "13.12 makes this a rule: build the eval set from recorded audio, not from text. A text eval cannot see the agent answering a misheard question perfectly." }
      ] },

    { t: "h2", n: "03", id: "bands", text: "The perception bands",
      sub: "Three regions, and the boundaries are not where engineers put them" },

    { t: "p", text: "Latency does not degrade experience linearly. There are thresholds, and crossing one changes what the user believes is happening rather than merely annoying them slightly more." },

    { t: "table",
      head: ["Time to first audio", "How it reads", "What the user does"],
      rows: [
        ["under ~300 ms", "indistinguishable from a person", "nothing \u2014 the rhythm holds"],
        ["300\u2013800 ms", "responsive", "nothing conscious; the conversation flows"],
        ["800\u20131200 ms", "noticeable", "registers a wait; may start to fill it"],
        ["1200\u20132000 ms", "thinking", "wonders whether it heard; often repeats"],
        ["over ~2000 ms", "broken", "says \u201chello?\u201d, repeats, or hangs up"]
      ] },

    { t: "p", text: "The two numbers worth memorising are **800 milliseconds**, under which a turn feels responsive, and **1,200 milliseconds**, over which it feels like thinking. The cascaded pipeline in 13.3 lands at 1,650 \u2014 in the band where users repeat themselves, which is the worst possible place to be, because a repeat arrives mid-response and triggers the barge-in path you probably have not built yet." },

    { t: "callout", kind: "mental", title: "Mental model: the 800 ms contract",
      body: [
        { t: "p", text: "Treat 800 ms at the median and 1,200 ms at p95 as a contract, in the way you would treat an API latency SLO. Every architectural decision in this module \u2014 cascade or speech-native, fixed or semantic endpointing, stream or wait \u2014 is then a question with a numeric answer rather than a matter of taste." },
        { t: "p", text: "And note that p95 is in the contract, not just the median. The exercise below is about why." }
      ] },

    { t: "h2", n: "04", id: "distribution", text: "A median is not an experience",
      sub: "The number on the dashboard and the number the user feels" },

    { t: "p", text: "Voice latency is reported as a median almost everywhere, and the median is close to useless on its own. Time to first audio is a heavy-tailed quantity: it is a sum of stages, several of which (network round trips, ASR finalisation, LLM prefill under load) have long right tails. A lognormal is a reasonable model, and the width parameter matters as much as the centre." },

    { t: "p", text: "The consequence is that two agents can have an identical median and completely different experiences, and the conjunction over a multi-turn call amplifies the difference further. A call is not one draw from the distribution, it is twelve." },

    { t: "code", lang: "python", title: "Perception bands under a lognormal",
      code: 'import math\n\ndef lognormal_cdf(x, median, sigma):\n    if x <= 0:\n        return 0.0\n    z = (math.log(x) - math.log(median)) / sigma\n    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))\n\n# two agents, same median, different spread\nfor label, sigma in (("tight", 0.25), ("loose", 0.75)):\n    resp = lognormal_cdf(800, 700, sigma)\n    think = 1.0 - lognormal_cdf(1200, 700, sigma)\n    per_call = 1.0 - (1.0 - think) ** 12\n    print("%-6s median 700ms  responsive %5.1f%%  thinking %5.1f%%  bad call %5.1f%%"\n          % (label, 100 * resp, 100 * think, 100 * per_call))',
      out: 'tight  median 700ms  responsive  70.3%  thinking   1.6%  bad call  17.1%\nloose  median 700ms  responsive  57.1%  thinking  23.6%  bad call  96.1%',
      caption: "Same median. One agent has a bad moment in 17% of calls, the other in 96%." },

    { t: "callout", kind: "tradeoff", title: "Variance first, then the median",
      body: [
        { t: "p", text: "This inverts the usual optimisation order. The instinct is to shave the median \u2014 a faster model, a nearer region. But a 100 ms median improvement is worth far less than removing the stall that puts 15% of turns past 1,200 ms, and the stall is usually something unglamorous: a cold connection, a retry, a garbage collection pause, a queue under load." },
        { t: "p", text: "Practically: before you buy a faster model, look at your p95 over p50 ratio. If it is above about 2, you have a variance problem and the median is not your bottleneck." }
      ] },

    { t: "exercise", kind: "analysis", title: "Rank four agents the median cannot distinguish",
      difficulty: "core", minutes: 20,
      body: "Four voice agents are described by the median and spread of their time-to-first-audio distribution. Work out what fraction of turns fall in each perception band, then the probability of at least one bad moment in a twelve-turn call. Two of the four have medians within 80 ms of each other; decide whether that tells you anything.",
      requirements: [
        "Model time to first audio as lognormal with the given median and sigma",
        "Report the fraction of turns that are responsive (<800 ms), noticeable (800\u20131200) and thinking (>1200)",
        "Compute p95 for each agent so the spread is visible as a number",
        "Compute P(at least one thinking turn) across a 12-turn call",
        "State which agent you would ship and what the median would have told you instead"
      ],
      hint: "P(at least one) = 1 - (1 - p)^n. The interesting comparison is rows 1 and 2, which share a median exactly.",
      solution: { lang: "python", title: "x1301.py \u2014 four agents, one median",
        code: 'import math\n\nBANDS = [(0, 800, "responsive"), (800, 1200, "noticeable"), (1200, 10**9, "thinking")]\n\ndef lognormal_cdf(x, median, sigma):\n    if x <= 0:\n        return 0.0\n    z = (math.log(x) - math.log(median)) / sigma\n    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))\n\ndef p95(median, sigma):\n    return median * math.exp(sigma * 1.6448536269514722)\n\nAGENTS = [("tight pipeline", 700, 0.25),\n          ("same median, loose tail", 700, 0.75),\n          ("slower median, tight", 950, 0.25),\n          ("the one everyone ships", 780, 0.55)]\n\nprint("%-26s %8s %8s %12s %12s %10s"\n      % ("agent", "median", "p95", "responsive", "noticeable", "thinking"))\nfor name, med, sig in AGENTS:\n    f_resp = lognormal_cdf(800, med, sig)\n    f_noti = lognormal_cdf(1200, med, sig) - f_resp\n    f_think = 1.0 - lognormal_cdf(1200, med, sig)\n    print("%-26s %7.0fms %7.0fms %11.1f%% %11.1f%% %9.1f%%"\n          % (name, med, p95(med, sig), 100 * f_resp, 100 * f_noti, 100 * f_think))\n\nprint()\nprint("in a 12-turn call, P(at least one thinking turn):")\nfor name, med, sig in AGENTS:\n    p = 1.0 - lognormal_cdf(1200, med, sig)\n    print("   %-26s %5.1f%%   (per-turn %4.1f%%)" % (name, 100 * (1 - (1 - p) ** 12), 100 * p))',
        out: '==========================================================================================\nA median latency is not a user experience\n==========================================================================================\nsame perception bands, four agents, lognormal time-to-first-audio\n\nagent                        median      p95   responsive   noticeable   thinking\ntight pipeline                 700ms    1056ms        70.3%        28.1%       1.6%\nsame median, loose tail        700ms    2404ms        57.1%        19.3%      23.6%\nslower median, tight           950ms    1433ms        24.6%        57.9%      17.5%\nthe one everyone ships         780ms    1927ms        51.8%        26.5%      21.7%\n\nrows 1 and 2 have the SAME median (700 ms) and the same rank on any\ndashboard that reports a median. yet 23.6% of turns feel like thinking in\none and 1.6% in the other -- a 15x difference the median cannot see.\n\nrow 3 is 250 ms SLOWER at the median than row 2, and the comparison splits:\n   same median, loose tail    thinking  23.6%   responsive  57.1%\n   slower median, tight       thinking  17.5%   responsive  24.6%\n   the tight-variance agent is never terrible and rarely great; the loose one\n   is great more than twice as often and terrible more often too. which you\n   prefer is a product decision -- but the median ranks them identically wrong.\n\nin a 12-turn call, P(at least one \'thinking\' turn):\n   tight pipeline              17.1%   (per-turn  1.6%)\n   same median, loose tail     96.1%   (per-turn 23.6%)\n   slower median, tight        90.1%   (per-turn 17.5%)\n   the one everyone ships      94.7%   (per-turn 21.7%)\n\nTHE POINT: a call is a conjunction. even the tight pipeline\'s 1.6% per-turn\nrate becomes a 17% chance of at least one bad moment somewhere in a 12-turn\ncall, and the other three are above 90%. the tail is the product and the median\nis the vanity metric. tighten variance before you chase the median.',
        notes: [
          { t: "p", text: "Rows 1 and 2 share a median of exactly 700 ms, so every dashboard that reports p50 ranks them equal. One has 1.6% thinking turns, the other 23.6% \u2014 a 15x difference in the thing the user actually notices." },
          { t: "p", text: "Row 3 is the honest complication. It is 250 ms slower at the median than row 2 and has fewer thinking turns (17.5% against 23.6%), but also far fewer responsive ones (24.6% against 57.1%). It is never terrible and rarely good. Which of those two you prefer is a product decision \u2014 the point is only that the median ranks them identically wrong." },
          { t: "p", text: "The 12-turn conjunction is the figure to quote to a stakeholder. Even the tight pipeline's 1.6% per-turn rate becomes a 17% chance of at least one bad moment per call, and the other three are all above 90%. Per-turn rates sound fine; per-call rates sell the work." },
          { t: "p", text: "I expected the slower-but-tighter agent to win outright on this framing and it does not, which is the more useful result. Variance is not a free win over the median; it is a different axis, and you have to say which band you are optimising." }
        ] } },

    { t: "h2", n: "05", id: "shape", text: "What the rest of the module does",
      sub: "The shape of the problem, before any of the mechanisms" },

    { t: "ol", items: [
      "**Choose an architecture** (13.2) \u2014 a cascade of ASR, LLM and TTS, or one speech-native model, priced on latency and control rather than novelty.",
      "**Account for every millisecond** (13.3, 13.4) \u2014 because the stage that dominates the budget is not the one teams optimise.",
      "**Decide when the user stopped talking** (13.5) \u2014 the hardest problem in the stack, and the largest single term in the budget.",
      "**Let the user interrupt** (13.6) \u2014 and do not let the agent hear itself, which is the bug every first prototype has.",
      "**Overlap everything** (13.7) \u2014 partial transcripts into speculative prefill into streamed tokens into streamed audio.",
      "**Write for the ear** (13.8, 13.9) \u2014 short, unformatted, and designed around a transcription that will be wrong 5 to 15% of the time.",
      "**Measure it** (13.12, 13.13) \u2014 on audio, with per-stage spans, including the one attribute only voice has: words generated against words actually played.",
      "**Pay for it** (13.14) \u2014 where the biggest line item is not the one you expect."
    ] },

    { t: "callout", kind: "scenario", title: "Scenario: \u201cit tests fine, but customers say it is slow\u201d",
      body: [
        { t: "p", text: "You inherit a support voice agent. The text eval suite scores 0.91 task success. The dashboard shows median time to first audio at 740 ms, inside the 800 ms target. Customer satisfaction is poor and the transcripts read well. The team's proposal is to buy a faster model." },
        { t: "p", text: "Three things to check before approving that spend. **One**, the p95: if it is above 1,500 ms you have a variance problem, and this lesson's exercise shows a 740 ms median can still put a bad moment in nine calls out of ten. **Two**, whether the 740 ms is measured from end-of-speech or from end-of-endpointing \u2014 if the 700 ms silence timer sits outside the metric, the real figure is 1,440 and the dashboard is lying by construction. **Three**, whether anyone has listened to ten recorded calls, because the text eval cannot see a perfect answer to a misheard question." },
        { t: "p", text: "A faster model is on the list, but it is fourth. 13.3 shows that halving the model's time to first token buys 10.6% while the endpointing nobody has touched is 42.4% of the budget." }
      ] }
  ],

  takeaways: [
    "**Human turn-taking runs on a ~200 ms gap**, stable across languages, and the user applies it unconsciously to your agent.",
    "**That gap is small because humans predict the end of your sentence** and start planning early; a serial pipeline has no prediction, so it pays every stage after you stop.",
    "**Speech removes three affordances**: no delete key, no scrollback, no parallel attention \u2014 so transcription errors persist, lists must be short, and verbosity becomes latency.",
    "**Under 800 ms feels responsive; over 1,200 ms feels like thinking** and the user starts to repeat themselves.",
    "**The standard cascade lands at 1,650 ms** \u2014 in the band where users repeat, which triggers a barge-in path most prototypes lack.",
    "**Two agents with an identical 700 ms median had 1.6% and 23.6% thinking turns** \u2014 a 15x difference the median cannot see.",
    "**A call is a conjunction**: 1.6% per turn is a 17% chance of a bad moment across 12 turns, and 23.6% per turn is 96%.",
    "**Check p95/p50 before buying a faster model** \u2014 above about 2 you have a variance problem, not a median problem.",
    "**A good text transcript is not evidence of a good call**, which is why 13.12 insists the eval set be built from audio.",
    "**Verbosity is a latency control in voice**, not a style preference, because audio arrives at the speaker's pace and cannot be skimmed."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Human turn-taking gaps average around 200 ms, which is faster than reaction time to an unexpected stimulus. What does that imply?",
        options: [
          "The measurements are averaged across overlapping speech, which shortens them artificially",
          "Listeners predict where the sentence will end and begin planning their reply before it does",
          "Humans tolerate a 200 ms gap but would prefer a shorter one",
          "Turn-taking is reflexive rather than cognitive, so it bypasses normal processing"
        ],
        answer: 1,
        why: "If the gap were a reaction to the end of the utterance it could not be shorter than reaction time, so the planning must already be underway \u2014 listeners run syntax, prosody and semantics forward and launch on a predicted endpoint. This is exactly the overlap a serial pipeline lacks, and it is why streaming, speculative prefill and semantic endpointing all exist: each recovers a piece of the overlap that a human conversation gets for free." },

      { stem: "Two voice agents both report a median time to first audio of 700 ms. Agent A has sigma 0.25, agent B sigma 0.75. What follows?",
        options: [
          "They will feel the same, because the median is what users perceive",
          "B is better, because a wider distribution means more turns land very fast",
          "A has 1.6% of turns over 1,200 ms and B has 23.6% \u2014 a 15x difference in bad turns",
          "The comparison is undefined without knowing the mean"
        ],
        answer: 2,
        why: "A lognormal with the same median and a larger sigma puts much more mass in the right tail, and the right tail is where the perception bands bite. Computed over a 12-turn call the difference becomes 17% against 96% chance of at least one turn that feels like thinking \u2014 so these two agents are ranked identically by any p50 dashboard and are completely different products." },

      { stem: "Why does a six-option menu read aloud behave differently from six options on a screen?",
        options: [
          "Speech synthesis introduces errors that accumulate across a long list",
          "Audio is serial and unskimmable, and the listener holds it in working memory \u2014 roughly three items",
          "The list takes longer to deliver, so the user is more likely to interrupt",
          "Screen readers reorder options, so the ordering cannot be relied upon"
        ],
        answer: 1,
        why: "A screen lets the user skim, re-read and compare at their own pace; audio arrives at the speaker's pace and is gone. With working memory good for about three items, a six-item spoken list is effectively the first item and the last one, which is why spoken answers have to be restructured rather than merely shortened. This is the no-scrollback and no-parallel-attention constraints acting together." },

      { stem: "A dashboard shows median time to first audio of 740 ms against an 800 ms target, but customers call the agent slow. What is the first thing to check?",
        options: [
          "Whether the model has been updated recently, which would change the latency profile",
          "Whether the ASR confidence threshold is set too high",
          "Whether the endpointing silence timer is inside the measured interval, and what p95 is",
          "Whether the TTS voice is one users find unnatural"
        ],
        answer: 2,
        why: "Two independent ways a 740 ms median coexists with a slow-feeling agent. If the metric starts at end-of-endpointing rather than end-of-speech, a 700 ms silence timer sits entirely outside it and the true figure is 1,440 ms. And even if the measurement is honest, a wide distribution can put a bad moment in most calls while the median stays green \u2014 so the p95/p50 ratio is the diagnostic, not the median." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Why voice is different",
    questions: [
      { level: "core",
        q: "What makes a voice agent harder than a chat agent?",
        strong: "A strong answer leads with the latency budget and then names the lost affordances.",
        answer: [
          { t: "p", text: "Two things, and the second is the one people miss. The first is the latency budget. Human turn-taking runs on a gap of around 200 milliseconds, and because the user has decades of practice at that rhythm they apply it unconsciously to your agent. Under 800 milliseconds to first audio feels responsive; over 1,200 feels like the system is thinking, and users start repeating themselves. A standard cascade of ASR, LLM and TTS lands around 1,650 milliseconds, so the default build is in the band where users talk over the agent." },
          { t: "p", text: "The second is that speech removes three affordances text interfaces depend on. There is no delete key, so a transcription error is already in the conversation history and already being acted on \u2014 you get repair, not correction. There is no scrollback, so the user holds the answer in working memory, which is good for about three items; a six-option list read aloud is the first option and the last one. And there is no parallel attention, so audio cannot be skimmed and a long preamble is time the user cannot skip." },
          { t: "p", text: "The practical consequence of the third point is the one I would emphasise: response length stops being a style preference and becomes a latency control. In chat, a verbose answer is mildly annoying. In voice it is dead airtime, and it is also the largest line in the cost model because text-to-speech bills per character." }
        ] },

      { level: "advanced",
        q: "Your median time to first audio is inside target but users say the agent is slow. How do you investigate?",
        strong: "A strong answer questions the measurement boundary and then the distribution.",
        answer: [
          { t: "p", text: "First I would check what the measurement actually spans, because the most common version of this is a metric that starts at the wrong place. If time to first audio is measured from the end of endpointing rather than from the moment the user stopped speaking, then a 700 millisecond silence timer sits entirely outside the number. A green 740 millisecond median is then really 1,440, and the dashboard is wrong by construction rather than by accident." },
          { t: "p", text: "If the boundary is right, I would look at the distribution rather than the median. Time to first audio is heavy-tailed \u2014 it is a sum of stages with long right tails, network round trips and prefill under load especially. I ran this: two agents with an identical 700 millisecond median, one with sigma 0.25 and one with 0.75, have 1.6% and 23.6% of turns past 1,200 milliseconds. Across a twelve-turn call that is a 17% against a 96% chance of at least one bad moment. So I would want p95 and the p95-over-p50 ratio; above about 2 it is a variance problem and the median is not the bottleneck." },
          { t: "p", text: "Then I would listen to ten recorded calls, because some of what gets reported as slowness is not latency at all. An agent that answers a misheard question perfectly produces a clean transcript, a good eval score and a caller who has to spend two extra turns repairing it \u2014 and two extra turns is several seconds, which the user experiences as slow." },
          { t: "p", text: "The reason I would do all of that before approving a faster model is that the budget says the model is not where the time is. Halving the model's time to first token buys about 10% of the turn; the endpointing silence nobody has touched is over 40% of it." }
        ] },

      { level: "core",
        q: "Why is optimising variance sometimes better than optimising the median?",
        strong: "A strong answer uses the conjunction across a multi-turn call.",
        answer: [
          { t: "p", text: "Because the user experiences a call, not a turn, and a call is a conjunction. Every turn is another draw from the distribution, so a per-turn tail rate that sounds tolerable becomes a per-call rate that is not. A 1.6% chance of a turn feeling slow is a 17% chance of at least one such turn in a twelve-turn conversation; 23.6% per turn is 96% per call. Users remember the worst moment in a call, not the average one." },
          { t: "p", text: "There is also a threshold effect. Perception is banded rather than linear: crossing 1,200 milliseconds changes what the user believes is happening, from waiting to wondering whether they were heard. Shaving 100 milliseconds off a median that is already at 700 moves nobody across a boundary. Removing a stall that puts 15% of turns past 1,200 moves a lot of turns across one." },
          { t: "p", text: "I would not state it as a general rule, though, and the honest version of the comparison is less tidy. When I worked the numbers, a tighter agent with a slower median had fewer bad turns and also far fewer genuinely fast ones \u2014 24.6% responsive against 57.1%. So variance and median are different axes, not a free win, and you have to say which band you are optimising for. What is defensible as a rule is the diagnostic order: look at the ratio first, because it tells you which of the two problems you actually have." }
        ] }
    ]
  }
});
