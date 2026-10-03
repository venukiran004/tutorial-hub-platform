EC.receiveLesson({
  id: "13.15",

  lede: "Everything in this module was budgeted for a prototype on a headset, and nothing ships there. Putting the same pipeline through five deployment targets gives latencies from 1,590 to 2,030 milliseconds, and **not one of the five starts inside a usable band** \u2014 so a target that felt acceptable in development has 140 to 380 milliseconds of deployment tax waiting on top of a budget that was already too slow. Worse than the arithmetic, the target changes the **toolbox**: telephony's deeper playout buffer makes 13.6's 200 ms barge-in limit **unreachable by construction**, on the one deployment where barge-in is non-negotiable. And the offline in-car case turns out not to be slow at all \u2014 it is 1,590 ms, faster than telephony \u2014 it is **inflexible**, losing three of the eight techniques this module spent its lessons building.",

  objectives: [
    "Budget the same pipeline across telephony, speakerphone, in-car and on-device",
    "Explain why telephony's barge-in requirement conflicts with its buffer depth",
    "Identify which techniques a deployment target removes from the toolbox",
    "Design the on-device tiering that an in-car assistant requires",
    "Recognise the nine pitfalls this module exists to prevent"
  ],

  prerequisites: ["13.6", "13.14"],

  blocks: [

    { t: "h2", n: "01", id: "targets", text: "Five places to put the same pipeline",
      sub: "And the development machine is the easiest of them" },

    { t: "p", text: "Every number in this module \u2014 the 1,650 ms budget, the 700 ms endpointer, the 60 ms playout buffer, the 160 ms barge-in \u2014 was measured in the environment where voice agents get built: a laptop, a good network, and headphones. That is not a criticism of the numbers; it is the observation that the environment is a parameter, and it is set to its most favourable value in every development loop." },

    { t: "table",
      head: ["Target", "As built", "After the available optimisations", "What changed"],
      rows: [
        ["web app (headset)", "1,650 ms", "1,075 ms", "the baseline, and the easiest case"],
        ["in-car (tunnel, offline)", "1,590 ms", "1,190 ms", "no network at all, slower local generation"],
        ["speakerphone / speaker", "1,790 ms", "1,215 ms", "room reverberation degrades VAD and ASR"],
        ["telephony (PSTN)", "1,860 ms", "1,285 ms", "8 kHz codec, SIP hop, deeper carrier buffer"],
        ["in-car (connected)", "2,030 ms", "1,455 ms", "cellular variability plus road and HVAC noise"]
      ] },

    { t: "callout", kind: "insight", title: "None of them reaches responsive, even optimised",
      body: [
        { t: "p", text: "The honest reading of that table is not that some targets are harder. It is that **none of the five is inside the responsive band as built, and none reaches it after the optimisations each target still supports.** The best case, a web app with a semantic endpointer and speculative prefill, lands at 1,075 ms \u2014 noticeable, not responsive." },
        { t: "p", text: "Getting under 800 ms requires the semantic endpointer *and* speculation *and* a short network path, and only the web app has all three. That is worth saying plainly to anyone promising 800 ms on a phone line." }
      ] },

    { t: "h2", n: "02", id: "telephony", text: "Telephony",
      sub: "Where barge-in is mandatory and the budget forbids it" },

    { t: "p", text: "A phone line adds latency in three places: the codec and SIP trunk hop, the deeper playout buffer that carrier networks require, and recognition itself, because 8 kHz G.711 audio has had everything above 4 kHz removed. That last one is not only a latency cost \u2014 the frequencies that distinguish the fricatives *s*, *f* and *th* live largely above 4 kHz, which is precisely why spelling a name over the phone is so error-prone and why 13.9's rhyming-letter problem is worse here than anywhere." },

    { t: "p", text: "But the structural problem is a contradiction rather than a cost." },

    { t: "viz", title: "The telephony contradiction",
      caption: "The buffer that makes carrier audio listenable is the same buffer that must be flushed to stop talking.",
      svg: '<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Telephony barge-in budget exceeding its limit">' +
        '<text x="12" y="18" class="s-label">13.6 BARGE-IN BUDGET \u2014 HEADSET</text>' +
        '<rect x="12" y="28" width="60" height="26" fill="var(--warn)" opacity="0.3" stroke="var(--warn)"/>' +
        '<rect x="72" y="28" width="40" height="26" fill="var(--warn)" opacity="0.2" stroke="var(--warn)"/>' +
        '<rect x="112" y="28" width="100" height="26" fill="var(--good)" opacity="0.28" stroke="var(--good)"/>' +
        '<rect x="212" y="28" width="120" height="26" fill="var(--accent)" opacity="0.3" stroke="var(--accent)"/>' +
        '<text x="42" y="46" class="s-mono s-sub" text-anchor="middle">30</text>' +
        '<text x="92" y="46" class="s-mono s-sub" text-anchor="middle">20</text>' +
        '<text x="162" y="46" class="s-mono s-sub" text-anchor="middle">50</text>' +
        '<text x="272" y="46" class="s-mono s-sub" text-anchor="middle">flush 60</text>' +
        '<text x="344" y="46" class="s-mono" fill="var(--good)">= 160 ms</text>' +
        '<text x="12" y="84" class="s-label">THE SAME BUDGET \u2014 PSTN, 120 ms CARRIER BUFFER</text>' +
        '<rect x="12" y="94" width="60" height="26" fill="var(--warn)" opacity="0.3" stroke="var(--warn)"/>' +
        '<rect x="72" y="94" width="40" height="26" fill="var(--warn)" opacity="0.2" stroke="var(--warn)"/>' +
        '<rect x="112" y="94" width="100" height="26" fill="var(--good)" opacity="0.28" stroke="var(--good)"/>' +
        '<rect x="212" y="94" width="240" height="26" fill="var(--crit)" opacity="0.3" stroke="var(--crit)"/>' +
        '<text x="332" y="112" class="s-mono s-sub" text-anchor="middle">flush 120</text>' +
        '<text x="464" y="112" class="s-mono" fill="var(--crit)">= 220 ms</text>' +
        '<line x1="412" y1="22" x2="412" y2="140" stroke="var(--crit)" stroke-width="2" stroke-dasharray="5 4"/>' +
        '<text x="418" y="136" class="s-mono" fill="var(--crit)">the ~200 ms limit</text>' +
        '<text x="12" y="172" class="s-sub">barge-in on a phone line is NON-NEGOTIABLE \u2014 callers interrupt, and an agent</text>' +
        '<text x="12" y="190" class="s-sub">that cannot be interrupted is a recording. and the buffer that makes carrier</text>' +
        '<text x="12" y="208" class="s-sub">audio listenable is the buffer you have to throw away to stop talking.</text>' +
        '<line x1="12" y1="224" x2="748" y2="224" class="s-stroke" opacity="0.4"/>' +
        '<text x="12" y="248" class="s-label">RESOLUTIONS</text>' +
        '<text x="12" y="268" class="s-sub">1. shallower buffer + accept occasional gaps   2. shorter fade (50 \u2192 20 ms)</text>' +
        '<text x="12" y="286" class="s-sub">3. duck rather than stop, then stop   4. accept 220 ms and measure the complaint rate</text>' +
        '</svg>' },

    { t: "callout", kind: "tradeoff", title: "A contradiction you resolve, not a number you tune",
      body: [
        { t: "p", text: "There is no setting that satisfies both constraints, so you have to choose which one to relax and say so. **Ducking** is the option worth knowing: instead of stopping, drop the output volume sharply within 30 ms and then stop. The user hears an immediate response to their interruption while the buffer drains, which satisfies the perceptual requirement without satisfying the arithmetic one." },
        { t: "p", text: "That is a good general move for this class of problem \u2014 when a budget cannot be met, check whether the requirement is really about the mechanism or about what the user perceives. Here it is the latter, and ducking buys the perception for 30 ms." }
      ] },

    { t: "dl", items: [
      { k: "DTMF", v: "Keypad tones are in-band audio, so they will be fed to your recogniser and transcribed as noise. Detect and handle them explicitly \u2014 and remember that callers use them as an escape hatch, so pressing 0 should do something sensible." },
      { k: "No video, no screen, no fallback", v: "Everything in 13.8 about structuring for working memory applies absolutely here. There is no \u201csee settings\u201d, no link, no list the user can re-read." },
      { k: "Hold, transfer and hangup are real events", v: "A caller can be put on hold by their own device, transfer you to a colleague, or hang up mid-sentence. Each is an event your state machine needs \u2014 13.11's validator will flag them as unhandled if you list them as plausible." }
    ] },

    { t: "h2", n: "03", id: "incar", text: "In-car",
      sub: "The hardest acoustics and the strictest availability requirement" },

    { t: "p", text: "A car is the worst listening environment in normal use: road noise rising with speed, HVAC, wind, passengers, music, and a microphone some distance from the speaker's mouth. Mic arrays and beamforming help \u2014 the array can steer toward the driver's seat and attenuate everything else \u2014 and speaker identification matters because the driver's requests and a back-seat passenger's are not equivalent." },

    { t: "p", text: "The requirement that actually drives the architecture is different, though: **it has to work in a tunnel.** An assistant that stops functioning when connectivity drops is not acceptable in a car, and that cannot be fixed with a retry." },

    { t: "code", lang: "text", title: "The tiering an in-car assistant needs",
      code: 'ALWAYS ON DEVICE\n  wake word detection        a few hundred KB, runs continuously, no network\n  voice activity detection   endpointing must never depend on a network\n\nON DEVICE, FIXED GRAMMAR\n  "navigate home"            a compact recogniser over a closed command set:\n  "call <contact>"           high accuracy because the vocabulary is tiny,\n  "set temperature to 21"    and it works in the tunnel\n  "next track"\n\nCLOUD, OPEN-ENDED\n  "find a charger with       needs the large model and live data, so it needs\n   a toilet before Leeds"    the network -- and must degrade gracefully:\n                             "I can\'t reach the network right now."\n\nTHE RULE: the tiering is not an optimisation, it is the product definition.\nwhich requests work offline IS the spec, and it has to be decided before\nany of it is built.',
      caption: "Three tiers, and the boundary between tier two and tier three is a product decision, not a technical one." },

    { t: "callout", kind: "good", title: "The offline case is not slow, it is inflexible",
      body: [
        { t: "p", text: "This is the finding that surprised me. The fully offline in-car budget comes out at 1,590 ms \u2014 *faster* than telephony's 1,860 \u2014 because removing the network removes 190 ms of round trip and buffer, which more than pays for the slower local generation." },
        { t: "p", text: "What it loses is three of the eight techniques: no provider means no prompt caching, and a small local model has no cancellable prefill and no streamed synthesis. So the constraint is not latency, it is that most of the toolbox this module built is unavailable \u2014 which is a much harder problem than being slow, because you cannot optimise your way out of a missing capability." }
      ] },

    { t: "h2", n: "04", id: "pitfalls", text: "The nine pitfalls",
      sub: "Which is to say, the module in reverse" },

    { t: "table",
      head: ["Pitfall", "Lesson", "What it costs"],
      rows: [
        ["Fixed silence endpointing", "13.5", "42.4% of the budget, untouched"],
        ["No barge-in", "13.6", "an agent that is a recording"],
        ["No echo cancellation", "13.6", "the agent interrupts itself; the stuttering demo"],
        ["Not truncating history on interruption", "13.6, 13.11", "17.5% phantom context over a 10-turn call"],
        ["Markdown in a spoken answer", "13.8", "21 strings read aloud as punctuation"],
        ["Waiting for the full response before TTS", "13.7", "no cancellation point, so no barge-in either"],
        ["Silent tool calls", "13.10", "2,550 ms of silence where 890 was available"],
        ["Evaluating on typed text", "13.12", "100% reported where the real figure is 38%"],
        ["Ignoring entity error rate", "13.9", "10.6% WER hiding a 41.2% entity error rate"],
        ["A deep jitter buffer", "13.6, 13.15", "barge-in made unreachable by construction"]
      ] },

    { t: "callout", kind: "mental", title: "Mental model: the environment is a parameter",
      body: [
        { t: "p", text: "The habit worth leaving this module with: whenever you record a latency figure, record the environment it was measured in. Every number here is true of a laptop on a good network with headphones, and that is the most favourable environment any of this will ever run in." },
        { t: "p", text: "The same applies to the technique list. A plan assembled on a prototype quietly assumes a network, a model provider and a shallow playout buffer \u2014 and two of the five deployment targets have none of the three. Checking the toolbox against the target is as important as checking the budget against it, and it is the step people skip." }
      ] },

    { t: "exercise", kind: "analysis", title: "Budget the pipeline across five deployment targets",
      difficulty: "core", minutes: 24,
      body: "Take the 1,650 ms cascaded budget and apply per-target deltas for telephony, speakerphone, connected in-car and offline in-car. Report each target's latency and perception band, as built and after the optimisations that target still supports. Then build an availability matrix of this module's eight techniques against the five targets, and work out the telephony barge-in budget with a carrier-depth playout buffer.",
      requirements: [
        "Model the base budget as a dict of named stages",
        "Apply per-target deltas for network, buffer depth, endpointing and recognition",
        "Report as-built and optimised latency with a perception band for each",
        "Build a technique-availability matrix over at least eight techniques",
        "Recompute 13.6's barge-in budget with the telephony buffer depth and compare to 200 ms",
        "State which techniques the offline target loses and why"
      ],
      hint: "The optimised figure should only apply techniques the target supports \u2014 that is the whole point of the availability matrix. Barge-in is VAD 30 + stop 20 + fade 50 + flush, where flush is the buffer depth.",
      solution: { lang: "python", title: "x1315.py \u2014 the same pipeline, five environments",
        code: 'BASE = {"endpoint": 700, "asr": 120, "net": 40, "prefill": 350,\n        "clause": 200, "tts": 180, "playout": 60}\n\nTARGETS = {\n  "web app (headset)": {"deltas": {}, "notes": "the development environment"},\n  "telephony (PSTN)": {\n      "deltas": {"net": 130, "playout": 120, "asr": 180},\n      "notes": "8 kHz G.711, SIP trunk hop, deeper carrier buffer"},\n  "speakerphone / smart speaker": {\n      "deltas": {"endpoint": 800, "asr": 160},\n      "notes": "room reverberation degrades both VAD and recognition"},\n  "in-car (connected)": {\n      "deltas": {"net": 190, "endpoint": 850, "asr": 200},\n      "notes": "cellular variability, road and HVAC noise, mic array"},\n  "in-car (tunnel, offline)": {\n      "deltas": {"net": 0, "prefill": 120, "clause": 420, "tts": 90, "asr": 200},\n      "notes": "on-device small model: no network, slower generation"},\n}\n\nBANDS = [(800, "responsive"), (1200, "noticeable"), (2000, "thinking"), (10**9, "broken")]\ndef band(ms):\n    for lim, n in BANDS:\n        if ms < lim:\n            return n\n\ndef budget(deltas):\n    b = dict(BASE)\n    b.update(deltas)\n    return sum(b.values()), b\n\nfor name, cfg in TARGETS.items():\n    tot, b = budget(cfg["deltas"])\n    avail = dict(zip([t[0] for t in TECHNIQUES], AVAILABLE[name]))\n    opt = dict(b)\n    if avail["semantic endpointing (13.5)"]:\n        opt["endpoint"] = min(opt["endpoint"], 300 + (b["endpoint"] - BASE["endpoint"]))\n    if avail["speculative prefill (13.7)"]:\n        opt["prefill"] = opt["prefill"] // 2\n    o = sum(opt.values())\n    print("%-30s %9dms %-13s %9dms %-13s" % (name, tot, band(tot), o, band(o)))',
        out: '================================================================================================\nThe same pipeline, five places to put it\n================================================================================================\ntarget                           as built band           optimised band         \nweb app (headset)                   1650ms thinking           1075ms noticeable   \ntelephony (PSTN)                    1860ms thinking           1285ms thinking     \nspeakerphone / smart speaker        1790ms thinking           1215ms thinking     \nin-car (connected)                  2030ms broken             1455ms thinking     \nin-car (tunnel, offline)            1590ms thinking           1190ms noticeable   \n\nNOT ONE of the five starts inside a usable band, and the web app -- the best of\nthem and the place every prototype is built -- is still 1650 ms. so a target that\nfeels acceptable on a headset has 140 to 380 ms of deployment tax waiting for it,\non top of a budget that was already too slow.\n\nafter the optimisations that each target still supports, none reaches responsive\neither. the honest reading is that 800 ms needs the semantic endpointer AND\nspeculation AND a short network path, and only the web app has all three.\n\n================================================================================================\nWhere the extra milliseconds come from\n================================================================================================\n\nweb app (headset)   1650 ms  (the development environment, and the only forgiving one)\n   baseline\n\ntelephony (PSTN)   1860 ms  (8 kHz G.711, SIP trunk hop, deeper buffer for the carrier network)\n   net          +90 ms\n   asr          +60 ms\n   playout      +60 ms\n\nspeakerphone / smart speaker   1790 ms  (room reverberation and distance degrade both VAD and recognition)\n   endpoint    +100 ms\n   asr          +40 ms\n\nin-car (connected)   2030 ms  (cellular variability, road and HVAC noise, mic array processing)\n   endpoint    +150 ms\n   net         +150 ms\n   asr          +80 ms\n\nin-car (tunnel, offline)   1590 ms  (on-device small model: no network at all, slower generation)\n   prefill     -230 ms\n   clause      +220 ms\n   tts          -90 ms\n   asr          +80 ms\n   net          -40 ms\n\n================================================================================================\nWhich techniques survive\n================================================================================================\ntechnique                          T1   T2   T3   T4   T5  \nsemantic endpointing (13.5)        yes  yes  yes  yes  yes \nper-context thresholds (13.5)      yes  yes  yes  yes  yes \nspeculative prefill (13.7)         yes  yes  yes  yes  NO  \nprompt caching (13.14)             yes  yes  yes  yes  NO  \nbarge-in under 200 ms (13.6)       yes  NO   yes  yes  yes \npre-rendered fillers (13.10)       yes  yes  yes  yes  yes \ncontextual biasing (13.9)          yes  yes  yes  yes  yes \nstreamed TTS (13.7)                yes  yes  yes  yes  NO  \n\n   T1 = web app (headset)\n   T2 = telephony (PSTN)\n   T3 = speakerphone / smart speaker\n   T4 = in-car (connected)\n   T5 = in-car (tunnel, offline)\n\n   telephony (PSTN)               loses: barge-in under 200 ms (13.6)\n   in-car (tunnel, offline)       loses: speculative prefill (13.7); prompt caching (13.14); streamed TTS (13.7)\n\n================================================================================================\nThe two findings\n================================================================================================\n1. TELEPHONY LOSES BARGE-IN AND NEEDS IT MOST.\n   the carrier network forces a deeper playout buffer -- 120 ms here against 60.\n   13.6\'s barge-in budget is VAD 30 + stop 20 + fade 50 + flush <buffer>, so\n   the flush alone is 120 ms and the total is 220 against a ~200 ms limit.\n   on a phone line barge-in is non-negotiable AND the buffer makes the budget\n   unreachable. that is the real telephony constraint, and it is a contradiction\n   you have to resolve rather than a number you can tune.\n\n2. THE OFFLINE CASE LOSES THE TECHNIQUES, NOT THE LATENCY.\n   it comes out at 1590 ms, thinking -- better than telephony, because removing the\n   network removes 190 ms of round trip and buffer.\n   what it loses is 3 of the 8 techniques: no provider means no prompt caching,\n   and a small local model has no cancellable prefill and no streamed synthesis.\n   so the offline deployment is not slow, it is INFLEXIBLE -- and the tiering\n   that follows is the actual in-car design:\n     wake word + VAD           always on device\n     fixed command grammar     on-device recogniser, works in the tunnel\n     open-ended requests       cloud, with a graceful offline refusal\n\nTHE RULE: the deployment target changes the budget AND the toolbox. a technique\nlist from a prototype built on a headset will quietly assume a network, a\nprovider and a shallow buffer -- and two of your three targets have none of them.',
        notes: [
          { t: "p", text: "**Not one of the five targets is inside a usable band as built, and none reaches responsive even optimised.** The best case is the web app at 1,075 ms with a semantic endpointer and speculative prefill \u2014 noticeable, not responsive. Getting under 800 ms needs the semantic endpointer AND speculation AND a short network path, and only the development environment has all three." },
          { t: "p", text: "**Telephony's contradiction is the headline.** The carrier network forces a deeper playout buffer, 120 ms against 60, and 13.6's barge-in budget is VAD 30 plus stop 20 plus fade 50 plus a flush equal to the buffer depth \u2014 so the total is 220 ms against a limit of about 200. Barge-in is non-negotiable on a phone line and the buffer that makes carrier audio listenable is the thing you must throw away to stop talking. That is a contradiction to resolve, not a number to tune." },
          { t: "p", text: "**The resolution worth knowing is ducking**: drop the output volume sharply within 30 ms and then stop. The user perceives an immediate response while the buffer drains, which satisfies the perceptual requirement without satisfying the arithmetic one. Generalisable move \u2014 when a budget cannot be met, check whether the requirement is about the mechanism or about what the user perceives." },
          { t: "p", text: "**The offline in-car case is not slow, it is inflexible.** At 1,590 ms it is *faster* than telephony, because removing the network removes 190 ms of round trip and buffer and that more than pays for slower local generation. What it loses is three of the eight techniques \u2014 no provider means no prompt caching, and a small local model has no cancellable prefill and no streamed synthesis. A missing capability is a harder problem than a slow one, because you cannot optimise around it." },
          { t: "p", text: "**8 kHz telephony audio is a recognition problem, not only a latency one.** Everything above 4 kHz is removed, and that band is where the fricatives s, f and th are distinguished \u2014 which is exactly why spelling a name over the phone fails so often, and why 13.9's rhyming-letter problem is worse here than anywhere else." },
          { t: "p", text: "**The general lesson is that a target changes the toolbox, not just the budget.** A technique list assembled on a headset prototype silently assumes a network, a model provider and a shallow buffer, and two of these five targets have none of the three. Checking the toolbox against the target is the step people skip, and it is where plans break rather than merely slip." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: it works at the desk and fails on the phone",
      body: [
        { t: "p", text: "A voice agent demos well on a laptop and is moved to a phone line for a pilot. Three complaints arrive in the first week: it is slower, it cannot be interrupted, and it mishears names much more often." },
        { t: "p", text: "All three are predictable from the target rather than from regressions. **Slower** by about 210 ms: the SIP hop, the deeper carrier buffer and slower recognition on narrowband audio. **Cannot be interrupted** because the 120 ms carrier buffer puts the barge-in budget at 220 ms against a 200 ms limit \u2014 the implementation is correct and the budget is not achievable, so the fix is ducking rather than debugging. **Mishears names** because 8 kHz audio removes everything above 4 kHz, which is where the fricatives live, so spelling and rhyming letters degrade specifically." },
        { t: "p", text: "The useful response is to re-run the numbers for the target rather than to treat these as bugs, and then to decide explicitly: shallower buffer and accept occasional gaps, or duck instead of stopping, or accept 220 ms and watch the complaint rate. And the process change is to put the pilot environment into the development loop \u2014 if the team tests on a headset, every one of these will be discovered by a customer." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: the in-car spec that was never written",
      body: [
        { t: "p", text: "An in-car assistant is built against the cloud pipeline and works well in testing, which was done in a car park with good signal. In the field, drivers report it dying in tunnels, underground car parks and rural stretches \u2014 which is where they most want it." },
        { t: "p", text: "Retries will not fix this, because the problem is that the product was never defined in terms of what works offline. The tiering is the specification: wake word and voice activity detection always on device, since endpointing must never depend on a network; a compact on-device recogniser over a closed command grammar for navigation, calls, climate and media, which is both high-accuracy and tunnel-proof because the vocabulary is tiny; and the cloud for open-ended requests that genuinely need a large model and live data." },
        { t: "p", text: "The boundary between those last two tiers is a product decision rather than a technical one, and it has to be made before the thing is built \u2014 because \u201cwhich requests work in a tunnel\u201d determines the on-device grammar, the model size, the fallback copy and the whole test plan. What you cannot do is add it afterwards, which is why this is the one target where the architecture has to be settled first." }
      ] }
  ],

  takeaways: [
    "**Every number in this module was measured on a laptop with a good network and headphones** \u2014 the most favourable environment any of it will run in.",
    "**Five targets span 1,590 to 2,030 ms as built**, so a deployment tax of 140\u2013380 ms sits on top of a budget already too slow.",
    "**Not one of the five is inside a usable band, even after the optimisations each supports** \u2014 the best case is 1,075 ms, noticeable rather than responsive.",
    "**Under 800 ms needs the semantic endpointer AND speculation AND a short network path**, and only the web app has all three.",
    "**Telephony's 120 ms carrier buffer puts barge-in at 220 ms against a ~200 ms limit** \u2014 unreachable by construction, on the one target where barge-in is mandatory.",
    "**That is a contradiction to resolve, not a number to tune**: shallower buffer, shorter fade, duck instead of stopping, or accept it and measure complaints.",
    "**Ducking is the move worth knowing** \u2014 drop volume sharply within 30 ms, then stop, which buys the perception without the arithmetic.",
    "**8 kHz telephony removes everything above 4 kHz**, where the fricatives s, f and th are distinguished \u2014 so spelling and rhyming letters degrade specifically.",
    "**DTMF tones are in-band audio** and will be transcribed as noise unless handled; callers use the keypad as an escape hatch.",
    "**The offline in-car case is 1,590 ms \u2014 faster than telephony** \u2014 because removing the network removes 190 ms of round trip and buffer.",
    "**What it loses is three of the eight techniques**: no provider means no prompt caching, and a small local model has no cancellable prefill and no streamed synthesis.",
    "**A missing capability is harder than a slow one**, because you cannot optimise around it.",
    "**The in-car tiering is the product definition, not an optimisation** \u2014 which requests work in a tunnel determines the grammar, the model size and the test plan.",
    "**A target changes the toolbox, not just the budget** \u2014 and checking the toolbox against the target is the step teams skip."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is 13.6's 200 ms barge-in target unreachable on a telephony deployment?",
        options: [
          "SIP signalling adds latency to the cancellation message",
          "The carrier network requires a deeper playout buffer, and the flush of that buffer is a direct term in the barge-in budget",
          "Narrowband audio slows voice activity detection beyond the budget",
          "DTMF detection must complete before speech can be classified"
        ],
        answer: 1,
        why: "Barge-in is VAD 30 plus stopping synthesis 20 plus a 50 ms fade plus flushing whatever audio is already queued \u2014 so a 120 ms carrier buffer gives 220 ms against a limit of about 200. The implementation can be perfectly correct and the budget still unachievable, which makes it a contradiction to resolve rather than a defect to fix: a shallower buffer and more gaps, a shorter fade, ducking instead of stopping, or accepting 220 ms and watching the complaint rate." },

      { stem: "The fully offline in-car pipeline comes out at 1,590 ms, faster than telephony's 1,860. What is its real constraint?",
        options: [
          "Thermal limits on sustained on-device inference",
          "It loses three of the eight techniques \u2014 no provider means no prompt caching, and a small local model has no cancellable prefill or streamed synthesis",
          "Accuracy, since a small model cannot match a cloud one",
          "Nothing \u2014 it is the best target on the numbers"
        ],
        answer: 1,
        why: "Removing the network removes 190 ms of round trip and buffer, which more than pays for slower local generation, so latency is not the problem. The problem is that most of the toolbox this module built is simply unavailable, and a missing capability is harder than a slow component because you cannot optimise around it. That is what forces the three-tier design rather than a single pipeline with fallbacks." },

      { stem: "Why does spelling a name over the phone fail more often than on a laptop?",
        options: [
          "Phone callers speak faster because they are usually in a hurry",
          "8 kHz telephony removes everything above 4 kHz, which is where the fricatives s, f and th are distinguished",
          "The codec introduces random packet loss that corrupts individual letters",
          "Telephony recognisers use smaller models to meet latency budgets"
        ],
        answer: 1,
        why: "G.711 narrowband audio discards the frequency band that carries most of the acoustic distinction between s, f and th, so letters that were already confusable become more so \u2014 which compounds 13.9's rhyming-letter problem, where B, C, D, E, G, P, T and V are the worst cases. This is a recognition consequence of the deployment target rather than a latency one, and it argues for phonetic matching against a known list in preference to spelling mode." },

      { stem: "An in-car assistant fails in tunnels. What is the correct framing of the fix?",
        options: [
          "Add retry logic and a longer network timeout",
          "Cache recent responses on the device for replay when offline",
          "Decide which requests must work offline \u2014 that tiering is the product specification and determines the grammar, model size and test plan",
          "Fall back to a text interface when connectivity drops"
        ],
        answer: 2,
        why: "Retries cannot help when there is no network, and the real omission is that the product was never defined in terms of offline capability. The tiering is the spec: wake word and voice activity detection always on device since endpointing must never depend on a network, a compact recogniser over a closed command grammar for navigation, calls, climate and media, and the cloud only for open-ended requests with a graceful refusal. The tier-two/tier-three boundary is a product decision that must precede the build." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Deployment targets",
    questions: [
      { level: "advanced",
        q: "Design a voice assistant for a car.",
        strong: "A strong answer leads with the tunnel and tiers the architecture.",
        answer: [
          { t: "p", text: "I would start from the requirement that drives everything: it has to work in a tunnel. An assistant that stops functioning when connectivity drops is unacceptable in a car, and that is not something you solve with retries or timeouts \u2014 it determines the architecture." },
          { t: "p", text: "So three tiers. Wake word detection and voice activity detection always on device, because endpointing must never depend on a network. Then a compact on-device recogniser over a closed command grammar \u2014 navigate home, call a contact, set the temperature, next track \u2014 which is both highly accurate, because the vocabulary is tiny, and tunnel-proof. Then the cloud for genuinely open-ended requests that need a large model and live data, with a graceful refusal when the network is gone rather than a hang." },
          { t: "p", text: "The boundary between tiers two and three is a product decision, not a technical one, and it has to be made before anything is built, because which requests work offline determines the on-device grammar, the model size, the fallback copy and the entire test plan. That is the thing that gets skipped: teams build against the cloud pipeline, test in a car park with good signal, and discover the spec in the field." },
          { t: "p", text: "On acoustics: a car is the worst listening environment in normal use \u2014 road noise rising with speed, HVAC, wind, passengers, music, and the microphone some distance from the driver. I would want a mic array with beamforming steered at the driver's seat, and speaker identification, because a driver's request and a back-seat passenger's are not equivalent. And I would budget for it: when I modelled the connected in-car case it came out at 2,030 milliseconds against 1,650 on a headset, so about 380 milliseconds of deployment tax before any of the optimisation work." }
        ] },

      { level: "advanced",
        q: "Your agent works at the desk and cannot be interrupted on the phone. Why?",
        strong: "A strong answer identifies the buffer and offers ducking.",
        answer: [
          { t: "p", text: "Almost certainly the playout buffer, and it is not a bug. Barge-in is four stages: about 30 milliseconds to detect voiced speech, 20 to cancel synthesis, 50 to fade the audio out, and then flushing whatever is already queued \u2014 and that last term is the buffer depth. On a headset with a 60 millisecond buffer that totals 160, inside the roughly 200 millisecond limit. A carrier network needs a deeper buffer, say 120 milliseconds, and the same budget is 220. Over the limit." },
          { t: "p", text: "So the implementation is correct and the budget is not achievable. That makes it a contradiction to resolve rather than something to debug, which is an important distinction because a team can spend a week profiling a cancellation path that is already optimal." },
          { t: "p", text: "The option I would reach for is ducking: instead of stopping, drop the output volume sharply within about 30 milliseconds, then stop properly while the buffer drains. The user perceives an immediate response to their interruption, which is what the 200 millisecond limit is actually about, and the arithmetic constraint stops mattering. The others are a shallower buffer and accepting occasional gaps mid-word, a shorter fade, or accepting 220 milliseconds and watching the complaint rate \u2014 all legitimate, all worth stating explicitly rather than drifting into." }
          ,
          { t: "p", text: "The generalisable lesson, and the reason I like this example: when a budget cannot be met, check whether the requirement is about the mechanism or about what the user perceives. Here it is perception, and that is a much cheaper requirement to satisfy. I would also expect two other complaints on the same migration \u2014 roughly 210 milliseconds more latency, and noticeably worse recognition of names, because 8 kHz audio removes the band where the fricatives are distinguished." }
        ] },

      { level: "core",
        q: "What are the most common ways a voice agent goes wrong?",
        strong: "A strong answer gives a prioritised list with the measured cost of each.",
        answer: [
          { t: "p", text: "In rough order of how often I would expect them and how much they cost: a fixed silence endpointing threshold that nobody chose, which is 42% of the latency budget sitting in a config file. No echo cancellation, which makes the agent interrupt itself and is hidden completely by headphones. No barge-in at all, which makes the agent a recording rather than a product." },
          { t: "p", text: "Then the silent ones. Not truncating conversation history on an interruption, which I measured at 17.5% phantom context over a ten-turn call \u2014 the model refers to words nobody heard, and it appears in no metric. Evaluating on typed text, where the same agent scored 100% on reference transcripts and 38% on recognised ones. And watching word error rate instead of entity error rate, where 10.6% was hiding 41.2%." },
          { t: "p", text: "Then the ones that are easy to fix and widespread. Markdown in a spoken answer \u2014 I linted a normal chat response and found 21 strings that get read aloud as punctuation. Silent tool calls, where a filler takes 2,550 milliseconds of silence down to 890 for one line of code. Waiting for the full response before synthesising, which also removes your only cancellation point and therefore breaks barge-in. And a deep jitter buffer, which costs latency twice and can make the barge-in budget unachievable." },
          { t: "p", text: "The pattern across the list is worth saying: the loud failures \u2014 stuttering, silence, punctuation read aloud \u2014 get fixed quickly because someone hears them in a demo. The expensive ones are silent: a phantom history, a misheard entity answered perfectly, an endpointing threshold nobody owns. Those need a metric that exists before anyone goes looking, which is why 13.13's span attributes and 13.12's audio eval set are the two investments I would make first." }
        ] }
    ]
  }
});
